/* /api/vod-pay — 두고클래스 결제 · 취소 · 환불 (토스페이먼츠 · 2026-11 포트원에서 바꿈)
 *
 *  회원 (dc_v 로그인)
 *   { action: "prepare", pid, kind, plan, coach, mcid, points, method, buyer, tea, expect, qty, ship, rs }
 *        rs { c: 홍보 링크 코드, p: 링크의 상품, at: 링크를 누른 때 } → 맞으면 수강권 주문에 온드미디어 RS 를 남겨요 (_lib/media.js)
 *        종이책: qty(1~10권) · ship { name, phone, zip, addr1, addr2, memo } → 주문에 배송지 · 배송 상태(ship.st ready → prep → ship → done)를 남겨요
 *        → 서버가 금액을 계산해 ‘결제 대기’ 주문을 만들고 { paymentId(= 토스 orderId), amount, orderName, no, customerKey } 를 돌려줘요 (0원이면 바로 완료)
 *        method: card(카드 · 간편결제) · transfer(실시간 계좌이체) · vbank(가상계좌) · naver(네이버페이) · kakao(카카오페이) — 토스 결제창(구버전 · ck 키 · TOSS_METHODS 로 연 것만)
 *                / tp — 토스 결제창형(gck 키 · 토스 창에서 수단을 골라요)
 *                | bank (무통장 입금 · depositor 입금자명 → 자동 입금 확인 또는 마스터 확인) — 0원은 바로 완료
 *   { action: "complete", paymentId, paymentKey, amount }  결제창에서 돌아오면(successUrl) — 서버가 정해 둔 금액과 같을 때만 토스에 승인 요청
 *        가상계좌: 승인하면 ‘입금 대기’(계좌 · 기한) → 회원이 입금하면 토스 웹훅(DEPOSIT_CALLBACK)으로 결제 완료. 쿠폰 · 포인트는 발급 때 써 두고 취소하면 돌려줘요
 *   { action: "abort", paymentId, code }  결제창을 닫았거나 실패(failUrl) → 결제 대기 주문을 실패로
 *   { action: "cancel", no, refundAccount }  환불 규정(결제 후 7일 · 재생 전)에 맞으면 바로 100% 취소 — 카드 · 계좌이체는 토스 결제 취소,
 *        가상계좌는 refundAccount { bank(토스 은행 코드), number, holder } 로 토스가 계좌 환불(영업일 2일), 무통장은 바로 취소 + refundPay(계좌 송금 대기 · 마스터가 송금)
 *   { action: "cancelPending", no }     입금 전 주문 취소 (무통장 · 가상계좌 — 가상계좌는 토스에서 결제 취소로 계좌를 닫아요 · 쓴 쿠폰 · 포인트 돌려받기)
 *   { action: "dg", iid }               산 VOD 의 두잉고 강의실 들어가기 — 서버가 두잉고 수강생 계정을 만들고 로그인시켜요
 *   { action: "claim", code | cid }       쿠폰 코드 등록 · 쿠폰 받기 (회원 쿠폰은 서버에 저장)
 *   { action: "track", pid, lid, ev }   강의 열기(seen) · 완료(done) · 자료 내려받기(mat) 기록 — 바로 취소 판단에 써요
 *   { action: "orders" }                내 주문
 *  마스터 (dc_a 마스터 로그인)
 *   { action: "refund", no, amount, reason, refundAccount }   부분 · 전액 환불 (토스 결제 취소 · 가상계좌는 refundAccount 로 계좌 환불)
 *   { action: "pgInfo", no }                   토스에 결제 상태를 다시 물어봐요 (결제수단 · 승인 번호 · 영수증 · 취소 내역). 웹훅을 놓쳐 어긋났으면 맞춰요
 *   { action: "catalog", catalog }             클래스 가격 · 쿠폰 · 설정 · 환불 규정 올리기
 *   { action: "bankOk", no }                   무통장 입금 확인 → 바로 수강 (같은 결제로 산 코칭권도 같이)
 *   { action: "bankCancel", no }               입금 전 주문 취소 (쿠폰 · 포인트 돌려주기)
 *   { action: "bankLog" }                      최근 입금 알림(자동 입금 확인) · 못 맞춘 입금
 *   { action: "bankLink", id, no }             못 맞춘 입금을 주문에 직접 연결 → 입금 확인
 *  마스터 · 그 클래스 강사 (dc_a 로그인)
 *   { action: "updNotify", pid, uid }          VOD 최신성 업데이트를 산 회원에게 알림톡 (수강 중 · 수강 끝남 나눠서) — _lib/vodupd.js
 *  토스 웹훅  POST /api/vod-pay?hook=toss  (토스 개발자센터 › 웹훅에 이 주소 · PAYMENT_STATUS_CHANGED · DEPOSIT_CALLBACK 등록)
 *        본문은 믿지 않고 토스에 결제를 다시 조회해 그대로 맞춰요 · 가상계좌 입금(DEPOSIT_CALLBACK)은 승인 때 받은 secret 이 같아야 해요 */
"use strict";
const { send, body, handler } = require("./_lib/http");
const auth = require("./_lib/auth");
const edge = require("./_lib/edge");
const toss = require("./_lib/toss");
const V = require("./_lib/vod");
const VA = require("./_lib/vodaccess");
const store = require("./_lib/store");
const { kstDay, addDays } = require("./_lib/vodprice");
const BM = require("./_lib/bank");
const PA = require("./_lib/payaction");
const MD = require("./_lib/media");
const RF = require("../shared/refund");

const fail = (res, status, message) => send(res, status, { ok: false, message });
const ordersOf = async (idx) => (await Promise.all(idx.nos.map((no) => V.get(V.K.order(no))))).filter(Boolean);
/** 결제를 끝내지 못한 주문(결제 대기)을 실패로 */
async function failOrders(idx, code) { for (const no of idx.nos) await V.update(V.K.order(no), (o) => (o && o.status === "ready" ? Object.assign(o, { status: "failed", failedAt: Date.now(), failCode: String(code || "").slice(0, 40) }) : undefined)); }

/** 토스 결제 → 주문 (승인 응답 · 결제 조회 · 웹훅이 모두 이 함수 하나로 맞춰요 · 두 번 와도 한 번만)
 *  DONE → 결제 완료(가상계좌는 입금 완료) · WAITING_FOR_DEPOSIT → 가상계좌 입금 대기 · CANCELED → 환불 · 입금 전 취소로 맞추기 · ABORTED · EXPIRED → 결제 실패 */
async function applyPay(paymentId, pay) {
  const idx = await V.get(V.K.pay(paymentId));
  if (!idx) return { ok: false, message: "주문을 찾지 못했어요." };
  if (!pay || String(pay.orderId) !== paymentId) return { ok: false, message: "다른 주문의 결제예요." };
  const st = String(pay.status || "");
  if ((st === "DONE" || st === "WAITING_FOR_DEPOSIT") && Number(pay.totalAmount) !== idx.total) { console.error("[vod-pay] amount mismatch", paymentId, pay.totalAmount, idx.total); return { ok: false, message: "결제 금액이 주문과 달라요. 고객센터로 알려 주세요." }; }
  if (pay.currency && pay.currency !== "KRW") return { ok: false, message: "결제 통화가 달라요." };
  // 결제 키 · 가상계좌 웹훅 검증 값(secret)은 결제 묶음(vpay:)에만 남겨요 — 회원 화면으로 가는 주문에는 secret 을 두지 않아요
  if (pay.paymentKey && (idx.paymentKey !== String(pay.paymentKey) || (pay.secret && idx.secret !== String(pay.secret)))) await V.update(V.K.pay(paymentId), (x) => (x ? Object.assign(x, { paymentKey: String(pay.paymentKey) }, pay.secret ? { secret: String(pay.secret) } : {}) : undefined));
  const orders = await ordersOf(idx);
  if (st === "DONE") return markPaid(paymentId, idx, orders, pay);
  if (st === "WAITING_FOR_DEPOSIT") {
    // 입금 오류(토스: 송금 한도 · 네트워크)로 DONE → 입금 대기로 돌아온 경우: 이미 연 수강은 그대로 두고 마스터가 볼 수 있게 표시만
    const paid = orders.filter((o) => o.status === "paid");
    if (paid.length) { console.error("[vod-pay] vbank deposit error after paid", paymentId); for (const o of paid) await V.update(V.K.order(o.no), (x) => (x && x.status === "paid" ? Object.assign(x, { pg: Object.assign({}, x.pg || {}, { depErr: Date.now() }) }) : undefined)); return { ok: true, depErr: true, no: idx.nos[0] }; }
    return vbankIssued(paymentId, idx, orders, pay);
  }
  if (st === "CANCELED" || st === "PARTIAL_CANCELED") return syncCancel(paymentId, idx, orders, pay);
  if (st === "ABORTED" || st === "EXPIRED") { await failOrders(idx, st); return { ok: false, message: st === "EXPIRED" ? "결제 시간이 지나 결제되지 않았어요. 다시 시도해 주세요." : "결제 승인에 실패했어요. 다른 결제수단으로 다시 시도해 주세요." }; }
  return { ok: false, message: "결제가 끝나지 않았어요. (" + st + ")" };
}
/** 결제 완료 (카드 · 계좌이체 승인 · 가상계좌 입금) — 주문 paid · 결제수단(결제창형 · 카드/간편결제 창은 토스 창에서 고른 수단) · 쿠폰 · 포인트
 *  네이버페이 · 카카오페이 버튼(간편결제 자체창)으로 낸 주문은 고른 수단 그대로 (토스는 ‘간편결제’로 알려 줘요) */
const KEEP_METHOD = ["naver", "kakao"];
async function markPaid(paymentId, idx, orders, pay) {
  if (orders.length && orders.every((o) => o.status === "paid")) return { ok: true, no: idx.nos[0], orders };
  const at = Date.now(), done = [], mk = toss.methodKey(pay), pg = Object.assign(toss.pgOf(pay), { st: "paid" });
  for (const o0 of orders) {
    const o = await V.update(V.K.order(o0.no), (o) => (o && ["ready", "pending", "failed"].indexOf(o.status) >= 0 ? Object.assign(o, { status: "paid", paidAt: at, pg: Object.assign({}, pg, o.pg && o.pg.issuedAt ? { issuedAt: o.pg.issuedAt } : {}) }, mk && mk !== o.method && KEEP_METHOD.indexOf(o.method) < 0 ? { method: mk } : {}) : undefined));
    if (o && o.status === "paid" && o0.status !== "paid") await VA.afterOrder(o0, o);
    done.push(o || o0);
  }
  // 쿠폰 · 포인트는 결제가 확인된 뒤에만 써요 (가상계좌는 발급 때 이미 썼어요 — 같은 결제로 두 번 쓰지 않아요)
  await useCouponPoints(orders[0] && orders[0].mid, orders, paymentId, idx.nos[0]);
  return { ok: true, no: idx.nos[0], orders: done };
}
/** 가상계좌 발급: 주문을 ‘입금 대기’로 (계좌 · 은행 · 입금 기한) — 두 번 와도 한 번만. 입금되면 토스 웹훅(DEPOSIT_CALLBACK)이 결제 완료로 바꿔요 */
async function vbankIssued(paymentId, idx, orders, pay) {
  const v = pay.virtualAccount || {};
  if (!v.accountNumber) return { ok: false, message: "가상계좌 정보를 받지 못했어요. 고객센터로 알려 주세요." };
  const due = toss.kstMs(v.dueDate) || Date.now() + toss.vbankHours() * 36e5;
  const vb = { bank: String(v.bankCode || ""), account: String(v.accountNumber), holder: "", dueAt: due }, pg = Object.assign(toss.pgOf(pay), { st: "issued", issuedAt: Date.now() });
  const out = [];
  for (const o0 of orders) {
    const o = await V.update(V.K.order(o0.no), (o) => (o && (o.status === "ready" || o.status === "failed") ? Object.assign(o, { status: "pending", method: "vbank", vbank: vb, dueAt: due, pg }) : undefined));
    out.push(o || (await V.get(V.K.order(o0.no))) || o0);
  }
  // 쿠폰 · 포인트는 무통장처럼 발급 때 써 두고, 입금 전에 취소하면 돌려줘요 (같은 결제로 두 번 쓰지 않아요)
  await useCouponPoints(orders[0] && orders[0].mid, orders, paymentId, idx.nos[0]);
  return { ok: true, vbank: true, no: idx.nos[0], orders: out };
}
/** 토스에서 취소된 결제를 주문에 맞춰요 (웹훅 · 마스터 ‘토스 결제 조회’)
 *  입금 전에 취소된 가상계좌 → 주문 취소(쿠폰 · 포인트 돌려주기) · 전액 취소 → 결제 완료 주문을 환불로 · 부분 취소는 어느 주문인지 몰라 기록만 (결제 대조 · 마스터 확인) */
async function syncCancel(paymentId, idx, orders, pay) {
  const pend = orders.find((o) => o.status === "pending");
  if (pay.status === "CANCELED" && pend) { await BM.drop(pend, "토스페이먼츠", { pgDone: true }); return { ok: true, canceled: true, no: idx.nos[0] }; }
  if (pay.status === "CANCELED" && orders.some((o) => o.status === "paid")) { await syncCancelled(idx.nos, "토스페이먼츠에서 취소"); return { ok: true, refunded: true, no: idx.nos[0] }; }
  if (pay.status === "PARTIAL_CANCELED") console.error("[vod-pay] partial cancel on toss side", paymentId);
  return { ok: true, no: idx.nos[0] };
}
/** 토스에서 전액 취소된 결제를 주문에 맞춰요 (웹훅 · 마스터 ‘토스 결제 조회’)
 *  회원 바로 취소가 진행 중(rfLock 2분 안 · 마스터 잠금 빼고)이면 웹훅이 먼저 와도 그 취소로 기록하고 쿠폰 · 포인트도 돌려줘요 — 회원 취소 쪽 기록은 이미 환불이라 건너뛰어요 */
async function syncCancelled(nos, why) {
  const t = Date.now(), xs = [];
  for (const no of nos) { const x = await V.get(V.K.order(no)); if (x) xs.push(x); }
  const inst = xs.some((x) => x.status === "paid" && x.rfLock && t - x.rfLock < 120e3 && x.rfBy !== "master"), rf = inst ? V.rfSet(await V.catalog()) : null;
  for (const x of xs) {
    if (x.status !== "paid") continue;
    await markRefunded(x, x.amount, inst ? { kind: "instant", why: x.grp && x.grp !== x.no ? "함께 결제한 상품 같이 취소" : "회원 바로 취소", by: "회원", cancel: { id: "", at: t } } : { kind: "master", why, by: "토스페이먼츠", cancel: { id: "", at: t } }, inst ? rf.restore : false);
  }
}
/** 환불 반영: 주문 refunded + 쿠폰 · 포인트 돌려주기(전액 환불이고 규정이 켜져 있을 때)
 *  이번 호출이 ‘결제 완료 → 환불’로 바꿨을 때만 뒤처리(판매 수 · 쿠폰 · 포인트)해요 — 토스 웹훅과 회원 취소가 겹쳐도 한 번만 */
async function markRefunded(o, amount, info, restore) {
  const at = Date.now();
  let did = false;
  const next = await V.update(V.K.order(o.no), (x) => { did = false; if (!x || x.status !== "paid") return undefined; did = true; delete x.rfLock; delete x.rfBy; if (x.tea) x.tea.st = "cancel"; return Object.assign(x, { status: "refunded", refundedAt: at, refundAmount: amount, refundKind: info.kind, refundWhy: info.why, refundBy: info.by, pg: Object.assign({}, x.pg || {}, { cancel: info.cancel || null }) }, info.pay ? { refundPay: info.pay } : {}); });
  if (!did) return next;
  if (next && next.status === "refunded") await VA.afterOrder(o, next);
  if (restore && amount === o.amount && (o.pointOff || o.mcid)) await V.update(V.K.member(o.mid), (m) => { if (!m) return undefined; if (o.pointOff) { m.points = (Number(m.points) || 0) + o.pointOff; (m.pointLog = m.pointLog || []).push({ at, amt: o.pointOff, why: "환불 · 포인트 돌려받음 (" + o.no + ")" }); } if (o.mcid) { const c = (m.coupons || []).find((x) => x.id === o.mcid); if (c) { c.usedAt = null; c.orderNo = ""; } } return m; });
  return next;
}
/** 0원 주문(무료 · 쿠폰 · 포인트로 0원)은 결제창 없이 바로 완료 */
async function finalizeFree(paymentId) {
  const idx = await V.get(V.K.pay(paymentId));
  if (!idx) return { ok: false, message: "주문을 찾지 못했어요." };
  if (idx.total > 0) return { ok: false, message: "결제가 끝나지 않았어요." };
  const orders = await ordersOf(idx), at = Date.now(), done = [];
  for (const o0 of orders) {
    const o = await V.update(V.K.order(o0.no), (o) => (o && o.status !== "paid" ? Object.assign(o, { status: "paid", paidAt: at, pg: { st: "free" } }) : undefined));
    if (o && o.status === "paid" && o0.status !== "paid") await VA.afterOrder(o0, o);
    done.push(o || o0);
  }
  await useCouponPoints(orders[0] && orders[0].mid, orders, paymentId, idx.nos[0]);
  return { ok: true, no: idx.nos[0], orders: done };
}

/** 이번에 토스 결제창으로 받을 수 있는 결제수단 (새 주문) */
const isPgMethod = (m) => ["card", "transfer", "vbank", "naver", "kakao", "tp"].indexOf(m) >= 0;
/** 쿠폰 사용 · 포인트 차감 (결제가 확인됐거나 무통장 주문을 받았을 때 한 번만) */
async function useCouponPoints(mid, orders, key, no) {
  const pts = orders.reduce((a, o) => a + (o.pointOff || 0), 0), mcid = (orders.find((o) => o.mcid) || {}).mcid, at = Date.now();
  if (!mid || !(pts || mcid)) return;
  await V.update(V.K.member(mid), (m) => { if (!m || (m.paidPays || []).indexOf(key) >= 0) return undefined; if (pts) { m.points = Math.max(0, (Number(m.points) || 0) - pts); (m.pointLog = m.pointLog || []).push({ at, amt: -pts, why: "결제에 사용 (" + no + ")" }); } if (mcid) { const c = (m.coupons || []).find((x) => x.id === mcid); if (c) { c.usedAt = at; c.orderNo = no; } } m.paidPays = (m.paidPays || []).concat(key).slice(-50); return m; });
}
/** 토스 결제창의 구매자 키 (회원마다 무작위 한 개 · 회원 id · 이메일처럼 짐작되는 값은 쓰지 말래요 — 토스 문서) */
async function customerKey(m) {
  if (m.tossCk) return m.tossCk;
  const x = await V.update(V.K.member(m.id), (y) => { if (!y || y.tossCk) return undefined; y.tossCk = "dc_" + require("crypto").randomUUID(); return y; });
  return (x && x.tossCk) || "";
}
/** 결제창에서 돌아오면(successUrl · paymentKey · orderId · amount) — 서버가 계산해 둔 금액과 같을 때만 토스에 승인을 요청해요 (토스 문서: 화면 금액은 바뀔 수 있어요) */
async function confirmPay(res, m, b) {
  const paymentId = String(b.paymentId || b.orderId || ""), paymentKey = String(b.paymentKey || "");
  const idx = await V.get(V.K.pay(paymentId));
  if (!idx || idx.mid !== m.id) return fail(res, 404, "주문을 찾지 못했어요.");
  const orders = await ordersOf(idx);
  if (orders.length && orders.every((o) => o.status === "paid")) return send(res, 200, { ok: true, no: idx.nos[0], orders });
  if (orders.length && orders.every((o) => o.status === "pending" && o.method === "vbank")) return send(res, 200, { ok: true, vbank: true, no: idx.nos[0], orders });
  if (!(idx.total > 0)) { const r = await finalizeFree(paymentId); return send(res, r.ok ? 200 : 409, r); }
  if (!toss.on()) return fail(res, 409, "결제 연결이 아직 준비되지 않았어요. 고객센터로 알려 주세요.");
  if (!paymentKey || paymentKey.length > 200 || /\s/.test(paymentKey)) return fail(res, 400, "결제 정보를 받지 못했어요. 다시 시도해 주세요.");
  if (Math.round(Number(b.amount)) !== idx.total) { console.error("[vod-pay] amount tampered", paymentId, b.amount, idx.total); await failOrders(idx, "AMOUNT"); return fail(res, 409, "결제 금액이 주문과 달라 결제하지 않았어요. 다시 주문해 주세요."); }
  if (toss.testOnLive()) { await failOrders(idx, "TEST_KEY"); return fail(res, 409, "지금은 토스페이먼츠 심사용 시험 결제라 실제로 결제되지 않았어요. 무통장 입금으로 주문하거나 문의하기로 알려 주세요."); }
  let pay = null, err = null;
  try { pay = await toss.confirm(paymentKey, paymentId, idx.total); }
  catch (e) {
    err = e; console.error("[vod-pay] toss confirm", paymentId, e.status || "", e.code || "", e.message);
    // 승인 응답을 못 받았거나(네트워크) 이미 처리된 결제: 토스에 결제를 다시 물어 그대로 맞춰요 (토스 문서: 승인 실패를 바로 결제 실패로 보지 말 것)
    pay = await toss.get(paymentKey).catch(() => null);
    if (pay && String(pay.orderId) !== paymentId) pay = null;
  }
  if (pay && (pay.status === "DONE" || pay.status === "WAITING_FOR_DEPOSIT")) { const r = await applyPay(paymentId, pay); return send(res, r.ok ? 200 : 409, r); }
  if (pay && (pay.status === "ABORTED" || pay.status === "EXPIRED")) await applyPay(paymentId, pay);
  else if (err && err.status >= 400 && err.status < 500) await failOrders(idx, err.code || "CONFIRM");
  const soft = err && err.status >= 400 && err.status < 500;
  return fail(res, soft ? 409 : 502, soft && err.message ? String(err.message).slice(0, 200) : "결제를 확인하지 못했어요. 잠시 뒤 주문 · 결제 내역을 확인하거나 문의하기로 알려 주세요.");
}
async function prepare(res, m, b) {
  const orders = await V.ordersOf(m.id), q = await V.quote(m, b, orders);
  if (!q.ok) return fail(res, 409, q.message);
  const method = String(b.method || "card");
  if (q.total > 0) {
    if (isPgMethod(method) && !(toss.on() && toss.methods().indexOf(method) >= 0)) return fail(res, 409, toss.on() ? "이 결제수단은 아직 열리지 않았어요. 다른 결제 방법을 골라 주세요." : "카드 · 계좌이체 · 가상계좌는 PG 심사가 끝나면 열려요. 지금은 무통장 입금으로 결제해 주세요.");
    if (!isPgMethod(method) && method !== "bank") return fail(res, 400, "결제 방법을 골라 주세요.");
  }
  const bank = q.total > 0 && method === "bank", bk = bank ? await BM.info() : null;
  if (bank && !bk) return fail(res, 409, "무통장 입금 계좌가 아직 준비되지 않았어요. 고객센터로 문의해 주세요.");
  // 입금자명: 자동 입금 확인이 이 이름 + 금액으로 주문을 찾아요 (비우면 주문자 이름)
  const depositor = bank ? String(b.depositor || (b.buyer && b.buyer.name) || m.name || "").replace(/\s+/g, "").slice(0, 20) : "";
  if (bank && !depositor) return fail(res, 400, "입금자명을 적어 주세요.");
  // 현금영수증 (무통장만): 소득공제용 휴대폰 번호 · 지출증빙용 사업자등록번호 — 입금 확인 뒤 마스터가 발급해요
  const cr = bank && b.cashRcpt && typeof b.cashRcpt === "object" ? b.cashRcpt : null, crNo = cr ? String(cr.no || "").replace(/[^0-9]/g, "") : "";
  if (cr && !((cr.type === "p" && /^01[016789]\d{7,8}$/.test(crNo)) || (cr.type === "b" && /^\d{10}$/.test(crNo)))) return fail(res, 400, cr.type === "b" ? "사업자등록번호 10자리를 확인해 주세요." : "현금영수증 휴대폰 번호를 확인해 주세요.");
  const paymentId = "pay_" + Date.now().toString(36) + V.uid("_").slice(1), at = Date.now(), nos = [];
  // 온드미디어 홍보 링크로 들어왔으면(회원 브라우저가 기억한 { c, p, at }) 코드 · 기간 · 상품을 확인해 수강권 주문에 RS 를 남겨요
  let rs = null;
  if (b.rs && typeof b.rs === "object") {
    const meta = ((await store.getDoc("meta")) || {}).v || {}, cat = (await V.catalog()) || {};
    rs = MD.attach(meta, (cat.products || []).find((x) => x && x.id === q.items[0].pid), q.items[0], b.rs, at);
  }
  const buyer = b.buyer && typeof b.buyer === "object" ? { name: String(b.buyer.name || m.name || "").slice(0, 20), phone: String(b.buyer.phone || m.phone || "").replace(/\s/g, "").slice(0, 14) } : null;
  for (let i = 0; i < q.items.length; i++) {
    let no = V.newNo(); const it = q.items[i];
    const ch = ["web", "ins", "ad"].indexOf(b.ch) >= 0 ? b.ch : "web";
    const o = Object.assign({ id: "", no, mid: m.id, method: q.total > 0 ? method.slice(0, 12) : q.points ? "point" : "free", status: bank ? "pending" : "ready", createdAt: at, at, paymentId, ch }, it, i ? { grp: nos[0] } : {}, buyer ? { buyer } : {}, bank ? { pg: { st: "bank" }, depositor, dueAt: at + bk.days * 864e5, bankTo: { bank: bk.bank, account: bk.account, holder: bk.holder } } : {});
    if (i === 0 && cr) o.cashRcpt = { type: cr.type, no: crNo };
    if (i === 0 && rs) o.rs = rs;
    if (i === 0 && it.kind === "tea" && b.tea && typeof b.tea === "object") o.tea = { d1: String(b.tea.d1 || "").slice(0, 10), d2: String(b.tea.d2 || "").slice(0, 10), slot: String(b.tea.slot || "").slice(0, 30), mode: "online", topic: String(b.tea.topic || "").slice(0, 500), st: "req" };
    // id: 마스터 화면이 주문을 찾는 칸 (주문 번호와 같게)
    for (let t = 0; t < 4 && !(await V.create(V.K.order(no), Object.assign(o, { id: "vo-" + no, no }))); t++) no = V.newNo();
    nos.push(no);
  }
  await V.create(V.K.pay(paymentId), { nos, mid: m.id, total: q.total, at, bank });
  await V.addOrderNos(m.id, nos);
  if (q.total === 0) { const r = await finalizeFree(paymentId); return send(res, 200, Object.assign({ free: true }, r)); }
  if (bank) {
    let made = (await Promise.all(nos.map((n) => V.get(V.K.order(n))))).filter(Boolean);
    await useCouponPoints(m.id, made, paymentId, nos[0]);
    // 자동 입금 확인(페이액션): 입금보다 먼저 주문을 등록해 둬요 (실패해도 주문은 그대로 · 마스터가 직접 확인)
    if (PA.on()) {
      const r = await PA.register(made[0], q.total, depositor, buyer, m.email).then(() => "ok", (e) => { console.error("[vod-pay] payaction register", nos[0], e.message); return "fail"; });
      await V.update(V.K.order(nos[0]), (x) => (x ? Object.assign(x, { pg: Object.assign({}, x.pg || {}, { pa: r }) }) : undefined));
      made = (await Promise.all(nos.map((n) => V.get(V.K.order(n))))).filter(Boolean);
    }
    return send(res, 200, { ok: true, bank: true, no: nos[0], orders: made, amount: q.total, to: bk, depositor });
  }
  send(res, 200, { ok: true, paymentId, amount: q.total, orderName: String(q.orderName || "").slice(0, 100), no: nos[0], customerKey: await customerKey(m) });
}
/** 토스 취소 실패를 회원 · 마스터에게 보여 줄 말 */
const ACCT_ERR = ["INVALID_REFUND_ACCOUNT_INFO", "INVALID_REFUND_ACCOUNT_NUMBER", "INVALID_BANK", "NOT_ALLOWED_REFUND_BANK", "REFUND_REJECTED"];
const cancelErr = (e, vbank) => (e && ACCT_ERR.indexOf(e.code) >= 0 ? "환불 계좌로 돌려드리지 못했어요. 은행 · 계좌번호 · 예금주(본인 명의)를 확인하고 다시 시도해 주세요." : vbank && e && /ACCOUNT|BANK|REFUND/.test(e.code || "") ? "환불 계좌를 확인해 주세요. (" + String(e.message || "").slice(0, 80) + ")" : "결제 취소에 실패했어요. 잠시 뒤 다시 시도하거나 고객센터로 알려 주세요.");
/** 토스 결제 취소 — 같은 결제(paymentId)의 다른 주문이 남아 있으면 그 금액만(부분 취소) · 결제 전체면 전액 취소
 *  → { ok, cancelId, st: "done" | "requested"(가상계좌 계좌 환불 진행 중), err } — 실패하면 주문은 그대로 */
async function tossCancel(o, amount, reason, acct, idem) {
  const idx = o.paymentId ? await V.get(V.K.pay(o.paymentId)) : null;
  let r = null, err = null;
  try { r = await toss.cancel(o.pg.paymentKey, { reason, amount: idx && amount === idx.total ? null : amount, refundAccount: acct || null, idem }); }
  catch (e) { err = e; console.error("[vod-pay] toss cancel", o.no, e.status || "", e.code || "", e.message); }
  // 토스에서 이미 취소된 결제(상점관리자에서 직접 취소 등)면 취소된 것으로 맞춰요
  if (err && err.code === "ALREADY_CANCELED_PAYMENT") return { ok: true, cancelId: "", st: "done" };
  const c = r && toss.lastCancel(r);
  if (!r || (c && c.cancelStatus && c.cancelStatus !== "DONE" && c.cancelStatus !== "IN_PROGRESS")) return { ok: false, err: err || { code: (c && c.cancelStatus) || "", message: "" } };
  const pending = (c && c.cancelStatus === "IN_PROGRESS") || (r.virtualAccount && r.virtualAccount.refundStatus === "PENDING");
  return { ok: true, cancelId: (c && c.transactionKey) || "", st: pending ? "requested" : "done" };
}
async function cancel(res, m, b) {
  const o = await V.get(V.K.order(String(b.no || "")));
  if (!o || o.mid !== m.id) return fail(res, 404, "주문을 찾지 못했어요.");
  // 규칙(결제 후 N일 · 재생 전)은 화면과 같은 공용 모듈 · ‘재생’은 서버 기록(vp:)으로 다시 확인해요
  const q = await V.instantOf(o);
  if (!q.ok) return fail(res, 409, q.why || "바로 취소할 수 없는 주문이에요. 환불 요청을 남겨 주세요.");
  // 가상계좌 · 무통장 입금은 환불 받을 계좌가 있어야 돌려드릴 수 있어요
  const acct = q.acct ? refundAcct(b.refundAccount) : null;
  if (q.acct && !acct) return fail(res, 400, "환불 받을 계좌(은행 · 계좌번호 · 예금주)를 정확히 적어 주세요.");
  // 같은 주문을 두 번 취소하지 않게 잠가요 (끝나면 환불 완료로 바뀌고 · 실패하면 풀어요 · 2분 지나면 저절로 풀려요)
  const t = Date.now();
  let got = false;
  await V.update(V.K.order(o.no), (x) => { got = false; if (!x || x.status !== "paid" || (x.rfLock && t - x.rfLock < 120e3)) return undefined; got = true; x.rfLock = t; delete x.rfBy; return x; }); // 다시 쓰기(버전 충돌)마다 새로 판단
  if (!got) return fail(res, 409, "환불을 처리하고 있어요. 잠시 뒤 주문 · 결제 내역을 확인해 주세요.");
  const rf = V.rfSet(await V.catalog()), orders = await V.ordersOf(m.id);
  const adds = rf.addons ? orders.filter((x) => x.grp === o.no && x.status === "paid" && !(x.coach && Number(x.coach.used) > 0)) : [];
  const amount = o.amount + adds.reduce((a, x) => a + x.amount, 0), why = "회원 바로 취소 (결제 후 " + rf.days + "일 이내 · 재생 전)";
  let cancelId = "", cst = "done";
  if ((q.way === "pg" || q.way === "vbank") && amount > 0) {
    const r = await tossCancel(o, amount, why, q.way === "vbank" ? acct : null, "member:" + o.no + ":" + t);
    if (!r.ok) {
      // 토스가 취소하지 못했어요 → 주문은 결제 완료 그대로 · 잠금을 풀어 다시 시도할 수 있게
      await V.update(V.K.order(o.no), (x) => { if (!x || x.rfLock !== t) return undefined; delete x.rfLock; return x; });
      return fail(res, 502, cancelErr(r.err, q.way === "vbank"));
    }
    cancelId = r.cancelId; cst = r.st;
  }
  // 무통장: 주문은 바로 취소 · 돈은 마스터가 환불 계좌로 송금 (환불 · 취소 관리 ‘계좌 송금 대기’)
  const pay = q.way === "bank" && amount > 0 ? Object.assign({}, acct, { amount, st: "wait", at: Date.now() }) : null;
  for (const x of [o].concat(adds)) await markRefunded(x, x.amount, { kind: "instant", why: x === o ? "회원 바로 취소" : "함께 결제한 상품 같이 취소", by: "회원", cancel: Object.assign({ id: cancelId, at: Date.now() }, cst === "requested" ? { st: "requested" } : {}), pay: x === o ? pay : null }, rf.restore);
  send(res, 200, { ok: true, cancelId, amount, way: q.way });
}
async function cancelPending(res, m, b) {
  const o = await V.get(V.K.order(String(b.no || "")));
  if (!o || o.mid !== m.id) return fail(res, 404, "주문을 찾지 못했어요.");
  if (o.status !== "pending") return fail(res, 409, "입금 전 주문만 취소할 수 있어요.");
  const r = await BM.drop(o, "회원");
  if (r && r.paid) { if (r.pay) await applyPay(o.paymentId, r.pay).catch((e) => console.error("[vod-pay] vbank paid on cancel", o.no, e.message)); return fail(res, 409, r.message); }
  if (r && r.ok === false) return fail(res, 502, r.message);
  send(res, 200, { ok: true });
}


/** 산 VOD 의 두잉고 강의실: 이 회원의 두잉고 수강생 계정(없으면 만들기) → 수강생 로그인 쿠키 */
async function enterDg(req, res, m, b) {
  const iid = String(b.iid || ""), cat = (await V.catalog()) || {};
  const ids = await auth.identify(req), owns = new Set((ids.vod && ids.vod.owns) || []);
  const p = (cat.products || []).find((x) => x.iid === iid && x.dg && owns.has(x.id));
  if (!p) return fail(res, 403, "이 강사님의 VOD를 구매한 회원만 들어갈 수 있어요.");
  const ins = await V.get("ins:" + iid);
  if (!ins || ins.status !== "active") return fail(res, 409, "강사님 강의실이 잠시 닫혀 있어요.");
  const rows = await store.listDocs({ prefixes: ["stu:" + iid + ":%"] });
  let s = rows.map((r) => r.v).find((x) => x && x.vodMid === m.id);
  const last4 = String(m.phone || "").replace(/\D/g, "").slice(-4);
  if (!s) {
    s = { id: V.uid("vs"), instructorId: iid, cohortId: "vod:" + iid, track: "vod", name: m.name || "회원", phone4: last4, status: "approved", appliedAt: new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10), vodMid: m.id, source: "doogoclass", joinedAt: Date.now() };
    if (!(await V.create("stu:" + iid + ":" + s.id, s))) return fail(res, 409, "잠시 후 다시 시도해 주세요.");
  } else if (s.status === "withdrawn") return fail(res, 403, "강사님이 두잉고 이용을 멈춘 계정이에요. 고객센터로 문의해 주세요.");
  else if (s.name !== m.name || (last4 && s.phone4 !== last4)) await V.update("stu:" + iid + ":" + s.id, (x) => x && Object.assign(x, { name: m.name || x.name, phone4: last4 || x.phone4 }));
  auth.setCookie(req, res, "student", auth.sign({ r: "student", iid, sid: s.id }));
  send(res, 200, { ok: true, sid: s.id, iid });
}
/* 환불 계좌 (토스 은행 코드 두 자리 · 예전 영문 코드도 받아요 — shared/refund.js BANKS) — 가상계좌 환불에 꼭 필요해요 */
function refundAcct(a) {
  if (!a || typeof a !== "object") return null;
  const bank = RF.bankCode(a.bank), number = String(a.number || "").replace(/[^0-9]/g, ""), holder = String(a.holder || a.holderName || "").trim().slice(0, 20);
  return bank && number.length >= 8 && number.length <= 20 && holder ? { bank, number, holder } : null;
}
async function refund(res, b) {
  const o = await V.get(V.K.order(String(b.no || "")));
  if (!o || o.status !== "paid") return fail(res, 404, "환불할 수 있는 주문이 아니에요.");
  const amount = Math.round(Number(b.amount));
  if (!(amount >= 0 && amount <= o.amount)) return fail(res, 400, "환불 금액은 0원 ~ 결제 금액 사이로 적어 주세요.");
  const acct = refundAcct(b.refundAccount), viaToss = RF.tossPaid(o);
  if (viaToss && o.method === "vbank" && amount > 0 && !acct) return fail(res, 400, "가상계좌 환불은 환불 받을 계좌(은행 · 계좌번호 · 예금주)가 필요해요.");
  // 두 번 눌러도 한 번만 (회원 바로 취소와 같은 잠금 · 2분)
  const t = Date.now();
  let got = false;
  await V.update(V.K.order(o.no), (x) => { got = false; if (!x || x.status !== "paid" || (x.rfLock && t - x.rfLock < 120e3)) return undefined; got = true; x.rfLock = t; x.rfBy = "master"; return x; });
  if (!got) return fail(res, 409, "환불을 처리하고 있어요. 잠시 뒤 다시 확인해 주세요.");
  let cancelId = "", cst = "done";
  // 토스로 결제한 주문만 토스 취소 — 무통장 입금은 마스터가 계좌로 돌려줘요 (기록만) · 예전 포트원 시절 시험 결제도 기록만
  if (viaToss && amount > 0) {
    const r = await tossCancel(o, amount, String(b.reason || "운영자 환불").slice(0, 100), o.method === "vbank" ? acct : null, "master:" + o.no + ":" + t);
    if (!r.ok) {
      await V.update(V.K.order(o.no), (x) => { if (!x || x.rfLock !== t) return undefined; delete x.rfLock; delete x.rfBy; return x; });
      return fail(res, 502, "토스페이먼츠 응답: " + (r.err && r.err.message ? String(r.err.message).slice(0, 160) : "취소 실패") + " — 토스페이먼츠 상점관리자에서 결제 상태를 확인해 주세요.");
    }
    cancelId = r.cancelId; cst = r.st;
  }
  const rf = V.rfSet(await V.catalog());
  const next = await markRefunded(o, amount, { kind: amount < o.amount ? "partial" : "master", why: String(b.reason || "운영자 환불").slice(0, 100), by: "마스터", cancel: Object.assign({ id: cancelId, at: Date.now() }, cst === "requested" ? { st: "requested" } : {}) }, rf.restore);
  send(res, 200, { ok: true, cancelId, order: next });
}
/** 토스 결제 조회 (마스터): 결제수단 · 금액 · 영수증 · 취소 내역. 토스는 결제 완료(입금)인데 주문이 대기면 결제 완료로, 토스는 전액 취소인데 주문이 결제 완료면 환불로 맞춰요
 *  가상계좌 환불이 끝났으면(refundStatus COMPLETED) ‘환불 진행 중’을 ‘완료’로 */
async function pgInfo(res, b) {
  const o = await V.get(V.K.order(String(b.no || "")));
  const idx = o && o.paymentId ? await V.get(V.K.pay(o.paymentId)) : null, key = (o && o.pg && o.pg.paymentKey) || (idx && idx.paymentKey) || "";
  if (!o || !key || !(o.pg && o.pg.pv === "toss")) return fail(res, 404, "토스페이먼츠로 결제한 주문이 아니에요.");
  const pay = await toss.get(key);
  let synced = "";
  if (pay.status === "DONE" && ["pending", "ready", "failed"].indexOf(o.status) >= 0) { const r = await applyPay(o.paymentId, pay); if (r.ok) synced = "토스페이먼츠에서 결제(입금)가 확인돼 결제 완료로 바꿨어요."; }
  else if (pay.status === "CANCELED" && o.status === "paid") { await syncCancelled((idx && idx.nos) || [o.no], "토스페이먼츠에서 취소됨"); synced = "토스페이먼츠에서 이미 취소된 결제라 환불로 맞췄어요."; }
  else if (pay.status === "CANCELED" && o.status === "pending") { await BM.drop(o, "토스페이먼츠", { pgDone: true }); synced = "토스페이먼츠에서 입금 전에 취소된 가상계좌라 주문을 취소로 맞췄어요."; }
  const rs = pay.virtualAccount && pay.virtualAccount.refundStatus;
  if (o.status === "refunded" && o.pg && o.pg.cancel && o.pg.cancel.st === "requested" && (rs === "COMPLETED" || rs === "FAILED" || rs === "PARTIAL_FAILED")) {
    await V.update(V.K.order(o.no), (x) => (x && x.pg && x.pg.cancel ? Object.assign(x, { pg: Object.assign({}, x.pg, { cancel: Object.assign({}, x.pg.cancel, { st: rs === "COMPLETED" ? "done" : "failed" }) }) }) : undefined));
    synced = rs === "COMPLETED" ? "가상계좌 환불이 끝났어요." : "가상계좌 환불이 실패했어요 — 토스페이먼츠 상점관리자에서 환불 계좌를 다시 받아 처리해 주세요.";
  }
  send(res, 200, { ok: true, pay: toss.view(pay), synced });
}
/** 쿠폰 받기: 쿠폰 코드 등록(code) · 상세 페이지 "쿠폰 받기"(cid, 내려받기 쿠폰만) */
async function claim(res, m, b) {
  const list = (await V.catalog()).coupons || [], today = kstDay(Date.now()), code = String(b.code || "").trim().toUpperCase();
  const c = code ? list.find((x) => String(x.code || "").toUpperCase() === code) : list.find((x) => x.id === String(b.cid || "") && (x.dl || x.auto === "signup"));
  if (!c || c.on === false) return fail(res, 404, code ? "쿠폰 코드를 다시 확인해 주세요." : "받을 수 없는 쿠폰이에요.");
  if (c.endAt && c.endAt < today) return fail(res, 409, "기간이 끝난 쿠폰이에요.");
  let dup = false;
  const next = await V.update(V.K.member(m.id), (x) => {
    if (!x) return undefined;
    x.coupons = x.coupons || [];
    if (x.coupons.some((y) => y.cid === c.id)) { dup = true; return undefined; }
    const exp = c.days ? addDays(today, c.days) : c.endAt || "";
    x.coupons.push({ id: V.uid("mc"), cid: c.id, at: Date.now(), exp: c.endAt && exp > c.endAt ? c.endAt : exp, usedAt: null, orderNo: "" });
    return x;
  });
  if (dup) return fail(res, 409, "이미 받은 쿠폰이에요.");
  send(res, 200, { ok: true, name: c.name, member: V.pub(next || m) });
}
async function track(res, m, b) {
  const pid = String(b.pid || ""), lid = String(b.lid || "").slice(0, 80), ev = String(b.ev || "");
  if (!pid || ["seen", "done", "mat"].indexOf(ev) < 0 || (ev !== "mat" && !lid)) return fail(res, 400, "input");
  const owns = (await V.ordersOf(m.id)).some((o) => o.pid === pid && o.status === "paid");
  if (!owns) return fail(res, 403, "구매한 강의가 아니에요.");
  await V.update(V.K.prog(m.id), (p) => { p = p || {}; const x = (p[pid] = p[pid] || { seen: {}, done: {}, mat: 0 }); if (ev === "seen" && !x.seen[lid]) x.seen[lid] = Date.now(); else if (ev === "done") { x.done[lid] = true; if (!x.seen[lid]) x.seen[lid] = Date.now(); } else if (ev === "mat") x.mat = (Number(x.mat) || 0) + 1; else return undefined; return p; });
  send(res, 200, { ok: true });
}
/** 카탈로그: 가격 계산에 필요한 칸만 받아요 */
const P_KEYS = ["id", "title", "type", "status", "price", "sale", "saleEnd", "plans", "accessDays", "eventAt", "eventMin", "seats", "next", "ebPrice", "ebDays", "coach", "tea", "dg", "iid", "share", "shipFee", "stock"];
const C_KEYS = ["id", "code", "name", "kind", "value", "max", "min", "days", "endAt", "types", "auto", "dl", "on"];
const pick = (o, ks) => { const r = {}; ks.forEach((k) => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
async function saveCatalog(res, b) {
  const c = b.catalog || {};
  if (!Array.isArray(c.products)) return fail(res, 400, "products");
  const v = { at: Date.now(), products: c.products.slice(0, 500).map((p) => pick(p, P_KEYS)), coupons: (c.coupons || []).slice(0, 200).map((x) => pick(x, C_KEYS)), settings: pick(c.settings || {}, ["coach", "tea", "extendPct", "refund"]), biz: c.biz || {} };
  await V.update(V.K.cat, () => v);
  send(res, 200, { ok: true, at: v.at, n: v.products.length });
}
/** 토스 웹훅 (POST /api/vod-pay?hook=toss) — 본문은 믿지 않고 토스에 결제를 다시 조회해서 그대로 맞춰요 (토스 문서 권장)
 *  PAYMENT_STATUS_CHANGED { eventType, data: Payment } · DEPOSIT_CALLBACK { secret, status, orderId, transactionKey } (가상계좌 입금 · 입금 전 취소)
 *  10초 안에 200 을 보내야 해요 · 일시 오류는 500 → 토스가 다시 보내요 (최대 7번) */
async function tossHook(req, res) {
  const b = (await body(req)) || {};
  if (!toss.on()) return send(res, 200, { ok: true, off: true });
  try {
    if (b.eventType === "PAYMENT_STATUS_CHANGED" && b.data && b.data.paymentKey && b.data.orderId) {
      const oid = String(b.data.orderId), idx = await V.get(V.K.pay(oid));
      if (idx) {
        // 모르는 결제 키(토스 조회 404)면 할 일이 없어요 — 200 으로 받아 토스가 다시 보내지 않게
        const pay = await toss.get(String(b.data.paymentKey)).catch((e) => { if (e && e.status === 404) return null; throw e; });
        if (!pay) return send(res, 200, { ok: true, unknown: true });
        if (String(pay.orderId) === oid) { const r = await applyPay(oid, pay); if (!r.ok) console.error("[vod-pay toss webhook]", oid, pay.status, r.message); }
      }
    } else if ((b.eventType === "DEPOSIT_CALLBACK" || !b.eventType) && b.secret && b.orderId) {
      const oid = String(b.orderId), idx = await V.get(V.K.pay(oid));
      if (idx) {
        if (idx.secret && String(b.secret) !== idx.secret) return send(res, 401, { ok: false });
        // 승인 응답을 못 받아 결제 키가 없으면 orderId 로 조회 (API 개별 연동 키만 돼요 — 안 되면 토스가 다시 보낼 때 맞춰요)
        const pay = idx.paymentKey ? await toss.get(idx.paymentKey) : await toss.getByOrder(oid);
        if (String(pay.orderId) === oid && (!idx.secret || !pay.secret || String(pay.secret) === String(b.secret))) { const r = await applyPay(oid, pay); if (!r.ok) console.error("[vod-pay toss deposit]", oid, pay.status, r.message); }
      }
    }
  } catch (e) { console.error("[vod-pay toss webhook]", e.status || "", e.code || "", e.message); return send(res, 500, { ok: false }); }
  send(res, 200, { ok: true });
}

module.exports = handler(["POST"], async (req, res) => {
  if (req.query && req.query.hook === "toss") return tossHook(req, res);
  if (!edge.originOk(req)) return fail(res, 403, "forbidden");
  if (process.env.VOD_SERVER_AUTH !== "1") return fail(res, 404, "서버 결제가 아직 꺼져 있어요.");
  const b = await body(req), a = String(b.action || "");
  if (a === "refund" || a === "pgInfo" || a === "catalog" || a === "bankOk" || a === "bankCancel" || a === "bankLog" || a === "bankLink") {
    const ids = await auth.identify(req);
    if (!(ids.admin && ids.admin.role === "master")) return fail(res, 403, "마스터만 할 수 있어요.");
    const by = String((ids.admin && (ids.admin.name || ids.admin.id)) || "마스터").slice(0, 20);
    try {
      if (a === "bankOk") { const r = await BM.confirm(b.no, by, { okHow: "manual" }); return send(res, r.ok ? 200 : 409, r); }
      if (a === "bankCancel") { const o = await V.get(V.K.order(String(b.no || ""))); if (!o || o.status !== "pending") return fail(res, 409, "입금 대기 주문만 취소할 수 있어요."); const r = await BM.drop(o, by); if (r && r.paid) { if (r.pay) await applyPay(o.paymentId, r.pay).catch((e) => console.error("[vod-pay] vbank paid on cancel", o.no, e.message)); return fail(res, 409, r.message); } if (r && r.ok === false) return fail(res, 502, r.message); return send(res, 200, { ok: true }); }
      if (a === "bankLog") return send(res, 200, Object.assign({ ok: true }, await BM.log()));
      if (a === "bankLink") return send(res, 200, await BM.link(String(b.id || ""), String(b.no || ""), by));
      if (a === "pgInfo") return await pgInfo(res, b);
      return a === "refund" ? await refund(res, b) : await saveCatalog(res, b);
    } catch (e) {
      console.error("[vod-pay] master", a, e.status || "", e.code || "", e.message);
      return fail(res, 502, e.status ? "토스페이먼츠 응답: " + String(e.message || "").slice(0, 160) + " — 토스페이먼츠 상점관리자에서 결제 상태를 확인해 주세요." : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }
  if (a === "updNotify") {
    const ids = await auth.identify(req);
    if (!ids.admin) return fail(res, 403, "관리자 로그인이 필요해요.");
    try { const r = await require("./_lib/vodupd").notify(ids, b); return send(res, r.status, r.json); }
    catch (e) { console.error("[vod-pay] updNotify", e.message); return fail(res, 502, "알림을 보내지 못했어요. 잠시 후 다시 시도해 주세요."); }
  }
  const m = await V.current(req);
  if (!m) return fail(res, 401, "로그인이 필요해요.");
  try {
    if (a === "prepare") return await prepare(res, m, b);
    if (a === "complete") return await confirmPay(res, m, b);
    if (a === "abort") { const idx = await V.get(V.K.pay(String(b.paymentId || ""))); if (!idx || idx.mid !== m.id) return send(res, 200, { ok: true }); await failOrders(idx, b.code); return send(res, 200, { ok: true }); }
    if (a === "cancel") return await cancel(res, m, b);
    if (a === "cancelPending") return await cancelPending(res, m, b);
    if (a === "dg") return await enterDg(req, res, m, b);
    if (a === "track") return await track(res, m, b);
    if (a === "claim") return await claim(res, m, b);
    if (a === "orders") return send(res, 200, { ok: true, orders: await V.ordersOf(m.id) });
  } catch (e) {
    console.error("[vod-pay]", a, e.status || "", e.code || "", e.message);
    return fail(res, 502, e.status ? "결제 회사(PG) 응답에 문제가 있어요. 잠시 후 다시 시도해 주세요." : "처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  fail(res, 400, "action");
});
