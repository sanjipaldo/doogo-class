/* 토스페이먼츠 — 서버에서만 쓰는 부분 (시크릿 키는 절대 화면으로 보내지 않아요 · 2026-11 포트원에서 바꿈)
 *
 *  TOSS_CLIENT_KEY   클라이언트 키 (공개 값 · 결제창을 열 때 화면에 보내요). 키 종류에 따라 결제 화면이 저절로 바뀌어요:
 *                      test_ck_ · live_ck_   ‘API 개별 연동 키’ → 결제창(구버전): 우리 결제 화면에서 고른 결제수단(카드 · 계좌이체 · 가상계좌) 창을 바로 열어요
 *                      test_gck_ · live_gck_ ‘주문서형 · 결제창형 연동 키’ → 결제창형: 토스 창이 떠서 그 안에서 결제수단을 골라요 (토스 상점관리자 › 결제 UI 설정)
 *  TOSS_SECRET_KEY   시크릿 키 (비밀 · 승인 · 조회 · 취소) — 클라이언트 키와 한 세트 (ck ↔ sk · gck ↔ gsk · test ↔ live)
 *  TOSS_METHODS      결제창(구버전)에서 열 결제수단 (기본 card,transfer,vbank — 계약한 것만 남겨요)
 *                      card(카드 · 간편결제 통합결제창) · transfer(퀵계좌이체) · vbank(가상계좌)
 *                      naver(네이버페이) · kakao(카카오페이) — 간편결제 자체창: 우리 결제 화면의 버튼에서 그 간편결제 창을 바로 열어요 (2026-11 · 탈잉처럼)
 *                        토스페이먼츠 계약에 네이버페이 · 카카오페이를 함께 신청해 승인되면 넣어요 (카카오페이는 계약한 상점의 테스트 키로만 시험돼요)
 *                      예) TOSS_METHODS=card,transfer,vbank,naver,kakao — 화면 순서는 늘 같아요 (계좌이체 · 네이버페이 · 카카오페이 · 카드 · 가상계좌 · 무통장)
 *  TOSS_VBANK_HOURS  가상계좌 입금 기한 시간 (기본 72 · 최대 2160) — 결제창(구버전)만 (결제창형은 토스 상점관리자 설정)
 *  TOSS_VARIANT      결제창형 결제 UI variantKey (기본 DEFAULT)
 *
 * API (공식 문서 2026-11 확인 · docs.tosspayments.com/reference)
 *  승인  POST /v1/payments/confirm { paymentKey, orderId, amount }  — 인증 뒤 10분 안 · 금액은 서버가 계산해 둔 값으로
 *  조회  GET  /v1/payments/{paymentKey}  (orderId 조회는 결제창형 키로 못 해서 승인 때 받은 paymentKey 로 조회해요)
 *  취소  POST /v1/payments/{paymentKey}/cancel { cancelReason, cancelAmount(부분), refundReceiveAccount(가상계좌 입금 뒤) }
 *  인증  Authorization: Basic base64(시크릿 키 + ":") · 멱등키 Idempotency-Key (POST · 15일) · 오류 { code, message } + HTTP 상태
 *  orderId = 우리 결제 id(paymentId · pay_…) · paymentKey = 토스가 준 결제 키 (형식을 검사하지 않아요) */
"use strict";
const crypto = require("crypto");
const RF = require("../../shared/refund");

const API = "https://api.tosspayments.com";
const ck = () => String(process.env.TOSS_CLIENT_KEY || "").trim();
const sk = () => String(process.env.TOSS_SECRET_KEY || "").trim();
const on = () => !!(ck() && sk());
/** window = 결제창(구버전 · ck) · widget = 결제창형(gck) */
const mode = () => (/_gck_/.test(ck()) ? "widget" : "window");
const testKey = () => /^test_/.test(sk());
/** 운영 사이트(Vercel production)에 시험 키를 넣었으면 결제를 승인하지 않아요 — 토스 심사 때는 결제창만 열리면 되고, 시험 승인(실제 돈 안 나감)으로 강의가 열리면 안 되니까 */
const testOnLive = () => testKey() && process.env.VERCEL_ENV === "production";
const ALL = ["transfer", "naver", "kakao", "card", "vbank"], DEF = ["card", "transfer", "vbank"];
/** 간편결제 자체창 — 결제수단 키 → 토스 간편결제 코드 (requestPayment card.easyPay · flowMode DIRECT) */
const EASY = { naver: "NAVERPAY", kakao: "KAKAOPAY" };
/** 화면 결제수단 — 결제창(구버전): TOSS_METHODS(계약한 것 · 화면 순서로) · 결제창형: tp 하나(토스 창에서 골라요) */
function methods() {
  if (!on()) return [];
  if (mode() === "widget") return ["tp"];
  const s = String(process.env.TOSS_METHODS || "").split(/[\s,]+/).map((m) => m.trim().toLowerCase());
  const pick = ALL.filter((m) => s.indexOf(m) >= 0);
  return pick.length ? pick : ALL.filter((m) => DEF.indexOf(m) >= 0);
}
const vbankHours = () => Math.min(2160, Math.max(1, Math.round(Number(process.env.TOSS_VBANK_HOURS) || 72)));
const variant = () => String(process.env.TOSS_VARIANT || "DEFAULT").trim().slice(0, 60) || "DEFAULT";
/** PG 로 결제한 주문의 결제수단 — 토스(card · transfer · vbank · naver · kakao · easy · phone · tp · 카드/간편결제 창에서 토스페이로 내면 toss) + 예전 포트원 시절 기록 */
const PG_METHOD_KEYS = ["card", "transfer", "vbank", "easy", "phone", "tp", "kakao", "toss", "naver"];

const timeout = (ms) => (typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);
const hdr = (idem) => Object.assign({ Authorization: "Basic " + Buffer.from(sk() + ":").toString("base64"), "Content-Type": "application/json" }, idem ? { "Idempotency-Key": idem } : {});
/** 멱등키 — 같은 요청을 다시 보내도 토스가 첫 응답을 그대로 돌려줘요 (UUID v4 모양 · 씨앗이 같으면 같은 키) */
function idemOf(seed) {
  const h = crypto.createHash("sha256").update(String(seed)).digest();
  h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString("hex");
  return x.slice(0, 8) + "-" + x.slice(8, 12) + "-" + x.slice(12, 16) + "-" + x.slice(16, 20) + "-" + x.slice(20, 32);
}
async function call(method, path, body, idem) {
  const r = await fetch(API + path, { method, headers: hdr(idem), body: body ? JSON.stringify(body) : undefined, signal: timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && j.message) || "toss " + r.status); e.status = r.status; e.code = String((j && j.code) || ""); e.body = j; throw e; }
  return j;
}
/** 결제 승인 → Payment (DONE · 가상계좌는 WAITING_FOR_DEPOSIT) */
const confirm = (paymentKey, orderId, amount) => call("POST", "/v1/payments/confirm", { paymentKey: String(paymentKey), orderId: String(orderId), amount: Math.round(amount) }, idemOf("confirm:" + paymentKey + ":" + orderId + ":" + Math.round(amount)));
/** 결제 조회 */
const get = (paymentKey) => call("GET", "/v1/payments/" + encodeURIComponent(paymentKey));
/** orderId 로 조회 (API 개별 연동 시크릿 키만 · 승인 응답을 못 받았을 때 웹훅이 쓰는 마지막 방법) */
const getByOrder = (orderId) => call("GET", "/v1/payments/orders/" + encodeURIComponent(orderId));
/** 결제 취소 — x = { reason, amount(빼면 남은 금액 전부), refundAccount: { bank, number, holder }(가상계좌 입금 뒤), idem(같은 취소를 다시 보내도 한 번만) } */
function cancel(paymentKey, x) {
  x = x || {};
  const body = { cancelReason: String(x.reason || "회원 요청 취소").slice(0, 200) };
  if (x.amount != null) body.cancelAmount = Math.round(x.amount);
  if (x.refundAccount) body.refundReceiveAccount = { bank: RF.bankCode(x.refundAccount.bank) || String(x.refundAccount.bank || ""), accountNumber: String(x.refundAccount.number || "").replace(/[^0-9]/g, ""), holderName: String(x.refundAccount.holder || "").slice(0, 60) };
  return call("POST", "/v1/payments/" + encodeURIComponent(paymentKey) + "/cancel", body, x.idem ? idemOf("cancel:" + x.idem) : undefined);
}
/** 마지막 취소 거래 (cancels[] 끝) */
const lastCancel = (pay) => { const c = (pay && pay.cancels) || []; return c.length ? c[c.length - 1] : null; };

/* ---------- Payment → 우리 기록 ---------- */
const METHOD = { "카드": "card", "계좌이체": "transfer", "가상계좌": "vbank", "간편결제": "easy", "휴대폰": "phone" };
// 간편결제사 (응답 easyPay.provider 는 한국어 이름 · 토스페이는 예전 응답에서 ‘토스결제’)
const EASY_OF = { "네이버페이": "naver", "카카오페이": "kakao", "토스페이": "toss", "토스결제": "toss" };
/** 결제수단 키 (토스 method 는 한국어 · 모르면 "") — 간편결제는 네이버페이 · 카카오페이 · 토스페이면 그 키(naver · kakao · toss), 다른 간편결제는 easy */
const methodKey = (pay) => { const k = METHOD[(pay && pay.method) || ""] || ""; return k === "easy" ? EASY_OF[String((pay.easyPay && pay.easyPay.provider) || "").replace(/\s+/g, "")] || "easy" : k; };
// 카드사 코드 (docs.tosspayments.com/codes/org-codes · 응답은 늘 두 자리)
const CARDS = { "3K": "기업BC", 46: "광주", 71: "롯데", 30: "산업", 31: "BC", 51: "삼성", 38: "새마을", 41: "신한", 62: "신협", 36: "씨티", 33: "우리BC", W1: "우리", 37: "우체국", 39: "저축", 35: "전북", 42: "제주", 15: "카카오뱅크", "3A": "케이뱅크", 24: "토스뱅크", 21: "하나", 61: "현대", 11: "KB국민", 91: "NH농협", 34: "수협" };
const cardName = (code) => CARDS[String(code || "")] || String(code || "");
/** 가상계좌 입금 기한 "yyyy-MM-ddTHH:mm:ss"(한국 시각 · 오프셋 없음) → ms */
const kstMs = (s) => { const t = String(s || ""); if (!t) return 0; const v = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : t + "+09:00"); return isFinite(v) ? v : 0; };
/** 주문에 남길 결제 정보 (카드 번호는 토스가 가린 값 그대로 · 시크릿 · 계좌 전체 정보는 안 남겨요) */
function pgOf(pay) {
  const c = pay.card || null, e = pay.easyPay || null, t = pay.transfer || null;
  const out = { pv: "toss", paymentKey: String(pay.paymentKey || ""), payMethod: String(pay.method || ""), txId: String(pay.lastTransactionKey || ""), receiptUrl: (pay.receipt && pay.receipt.url) || "" };
  if (c) out.card = [cardName(c.issuerCode), c.number || "", Number(c.installmentPlanMonths) > 1 ? c.installmentPlanMonths + "개월" : "일시불"].filter(Boolean).join(" · ");
  if (c && c.approveNo) out.approveNo = String(c.approveNo);
  if (e && e.provider) out.easy = String(e.provider);
  if (t && t.bankCode) out.bank = RF.bankName(t.bankCode);
  return out;
}
/** 마스터 ‘토스 결제 조회’ 화면용 */
function view(pay) {
  const c = pay.card || {}, v = pay.virtualAccount || {}, t = pay.transfer || {}, k = methodKey(pay);
  const method = k === "card" ? { type: "card", name: cardName(c.issuerCode), number: c.number || "", approval: c.approveNo || "", months: Number(c.installmentPlanMonths) || 0 }
    : pay.method === "간편결제" ? { type: "easy", provider: (pay.easyPay && pay.easyPay.provider) || "", sub: pay.card && pay.card.number ? cardName(pay.card.issuerCode) + " " + pay.card.number : "" }
    : k === "transfer" ? { type: "transfer", bank: t.bankCode || "" }
    : k === "vbank" ? { type: "vbank", bank: v.bankCode || "", account: v.accountNumber || "", holder: v.customerName || "", expiredAt: v.dueDate || "", refund: v.refundStatus || "" }
    : { type: String(pay.method || "") };
  const total = Number(pay.totalAmount) || 0, bal = Number(pay.balanceAmount), deposit = pay.status === "WAITING_FOR_DEPOSIT";
  return { status: String(pay.status || ""), method, amount: { total, paid: deposit ? 0 : total, cancelled: isFinite(bal) && !deposit ? Math.max(0, total - bal) : 0 }, receiptUrl: (pay.receipt && pay.receipt.url) || "", paidAt: pay.approvedAt || "",
    cancellations: (pay.cancels || []).map((x) => ({ amount: Number(x.cancelAmount) || 0, reason: String(x.cancelReason || "").slice(0, 100), at: x.canceledAt || "", status: x.cancelStatus || "" })) };
}

/** 연결 확인 (배포 빌드 기록에만 — scripts/db-build.js): 없는 결제를 한 번 조회해 봐요. 아무것도 바꾸지 않아요.
 *  404(결제 없음) → 시크릿 키가 맞아요 / 401 · 403 → 틀렸거나 만료 / 키가 없으면 off
 *  → { ok, why: "" | "off" | "unauthorized" | "http <코드>" | "network", mode, test, pair: "" | "mismatch", methods } — 키 값은 돌려주지 않아요 */
async function check() {
  const out = { ok: false, why: "off", mode: on() ? mode() : "", test: testKey(), pair: "", methods: methods() };
  if (!on()) return out;
  const c = ck(), s = sk();
  if (/_gck_/.test(c) !== /_gsk_/.test(s) || /^test_/.test(c) !== /^test_/.test(s)) out.pair = "mismatch";
  try {
    const r = await fetch(API + "/v1/payments/dc-connection-check", { headers: hdr(), signal: timeout(8000) });
    if (r.status === 404) Object.assign(out, { ok: true, why: "" });
    else out.why = r.status === 401 || r.status === 403 ? "unauthorized" : "http " + r.status;
  } catch (e) { out.why = "network"; }
  return out;
}

module.exports = { on, ck, mode, testKey, testOnLive, methods, EASY, vbankHours, variant, PG_METHOD_KEYS, idemOf, confirm, get, getByOrder, cancel, lastCancel, methodKey, cardName, kstMs, pgOf, view, check };
