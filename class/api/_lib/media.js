/* 온드미디어(YouTube 채널 팀) RS 파트너 — 계정 · 로그인 · 보여 줄 모양 · 주문 RS 기록 (서버)
 *
 *  meta.media       계정 목록 — 마스터만 고쳐요. 온드미디어 본인은 자기 계정만 보고, 연락처 · 정산 계좌 · 비밀번호만 바꿔요
 *                   { id, loginId, pwHash, code(홍보 링크 코드), name(팀 이름), channel(YouTube 채널 이름), url, subs(구독자 수),
 *                     rate(직접 정한 RS % · 비우면 구독자 수로 10 · 20%), email, phone, type(person 개인 3.3% | biz 사업자 세금계산서),
 *                     bizName, bizNo, bank, account, holder, bankAt, memo(마스터만), status(active | paused), createdAt, lastLoginAt, pwAt }
 *                   비밀번호는 scrypt 해시(pwHash)로만 저장하고 누구에게도(마스터 포함) 보내지 않아요.
 *                   마스터 화면이 새 비밀번호를 pw 칸에 담아 보내면 저장할 때 해시로 바꿔요(hasPw 로 ‘설정됨’만 보여요).
 *  meta.mdPayouts   RS 지급 기록 { "<계정id>:<YYYY-MM>": { st: confirmed | paid, snap, at, by, paidAt, memo } } — 마스터만 · 본인은 자기 것만
 *  meta.vod.settings.rs   RS 규칙 { lo: 10, hi: 20, subs: 100000, days: 30, pg: 7.5 } — 공개(스토어가 링크 기간을 알아야 해요) · PG 공제 기본 7.5% (2026-11-15 확정)
 *  vo:<주문>.rs     홍보 링크로 산 주문 { mid(계정id), code, ch(채널 이름), rate(그때 RS %), pg(그때 PG 공제 %), at(링크를 누른 때) }
 *                   결제 대기 주문을 만들 때(/api/vod-pay prepare) 서버가 링크 코드 · 기간 · 상품을 확인해서 남겨요.
 *                   RS = (판매가 − 환불) × (1 − PG%) × RS% — 정산 때 강사 · 두고클래스가 나누기 전에 먼저 빼요 (vod.js rsOf). */
"use strict";

const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
// RS 규칙 · 비율 · 링크 코드는 화면과 같은 공용 정산 모듈(class/shared/settle.js — Next.js 전환 2단계)
const ST = require("../../shared/settle");
const RS_DEF = ST.RS_DEF;
const num = ST.num;
/** RS 규칙 (meta.vod.settings.rs 에서 빈 칸은 기본값) */
const rules = (meta) => ST.rsRules((((meta || {}).vod || {}).settings || {}).rs);
/** 이 계정의 RS %: 마스터가 직접 정했으면 그 값, 아니면 구독자 수가 기준 이상이면 높은 %, 미만이면 낮은 % */
const rateOf = ST.rsRateOf;
const codeOf = ST.rsCode;
/** RS 대상 상품: 종이책은 빼요 (택배 · 도서정가제) */
const rsProduct = ST.rsProduct;

/** 결제 대기 주문을 만들 때: 회원 브라우저가 보낸 링크 기록 { c: 코드, p: 상품, at: 누른 때 } 를 확인 → 주문에 남길 rs | null
 *  수강권(course) 주문 · 판매가가 있는 상품 · 링크 기간(기본 30일) 안 · 사용 중인 계정 · 그 링크의 상품일 때만 */
function attach(meta, p, item, raw, now) {
  if (!raw || typeof raw !== "object" || !item || (item.kind || "course") !== "course" || !(Number(item.sale) > 0) || !rsProduct(p)) return null;
  const code = codeOf(raw.c), at = Number(raw.at) || 0, R = rules(meta), t = now || Date.now();
  if (!code || (raw.p && String(raw.p) !== String(p.id))) return null;
  if (!(at > 0 && at <= t + 6e4 && t - at <= R.days * 864e5)) return null;
  // 체험 온드미디어(demo · _lib/familydemo.js)의 링크로 산 주문에는 RS 를 붙이지 않아요
  const acc = ((meta && meta.media) || []).find((x) => x && x.status === "active" && x.demo !== true && codeOf(x.code) === code);
  if (!acc) return null;
  return { mid: acc.id, code: codeOf(acc.code), ch: String(acc.channel || acc.name || "").slice(0, 60), rate: rateOf(acc, R), pg: R.pg, at: Math.min(at, t) };
}

/* ---------------- 보여 줄 모양 ---------------- */
/** 계정 하나 — 비밀번호(해시)는 빼고 ‘설정됨’만 */
function pubAcc(a) { const o = Object.assign({}, a); o.hasPw = !!(a && (a.pwHash || a.pw)); delete o.pwHash; delete o.pw; return o; }
/** 마스터에게 보낼 meta: 온드미디어 계정의 비밀번호 해시만 빼요 (나머지는 그대로 — 얕은 복사) */
function masterMeta(v) {
  if (!v || !Array.isArray(v.media) || !v.media.some((x) => x && (x.pwHash || x.pw))) return v;
  return Object.assign({}, v, { media: v.media.map((x) => (x && typeof x === "object" ? pubAcc(x) : x)) });
}
/** 온드미디어 본인에게 보낼 meta 칸: 자기 계정(운영 메모 빼고) · 자기 지급 기록만 */
function selfMeta(v, o, id) {
  const me = ((v && v.media) || []).find((x) => x && x.id === id);
  if (me) { const a = pubAcc(me); delete a.memo; o.media = [a]; } else o.media = [];
  const po = {};
  Object.keys((v && v.mdPayouts) || {}).forEach((k) => { if (k.indexOf(id + ":") === 0) po[k] = clone(v.mdPayouts[k]); });
  o.mdPayouts = po;
  return o;
}
/** 온드미디어에게 보낼 주문: 판매 · 정산에 필요한 칸만 (회원 · 연락처 · 결제 수단 · 쿠폰 · 강사 비율은 빼요) */
const ORDER_KEEP = ["id", "no", "pid", "iid", "kind", "title", "status", "at", "paidAt", "sale", "list", "days", "qty", "refundedAt", "refundAmount", "amount", "rs"];
function orderView(o) {
  const x = {};
  ORDER_KEEP.forEach((k) => { if (o[k] !== undefined) x[k] = clone(o[k]); });
  return x;
}

/* ---------------- 저장할 때 ---------------- */
const pwOk = (pw) => typeof pw === "string" && pw.trim().length >= 4 && pw.trim().length <= 40 && !/\s/.test(pw.trim());
function hashOf(pw) { const A = require("./auth"), V = require("./vod"); return V.hashPw(A.koToKeys(String(pw).trim())); }
function checkLogin(acc, pw) { if (!acc || !acc.pwHash) return false; const A = require("./auth"), V = require("./vod"); return V.checkPw(A.koToKeys(String(pw || "").trim()), acc.pwHash); }
/** 마스터가 meta 를 저장할 때: 새 비밀번호(pw)는 해시로 바꾸고, 화면이 모르는 해시 · 마지막 로그인은 서버 값을 지켜요 */
function fixMaster(o, n) {
  if (!n || typeof n !== "object" || !Array.isArray(n.media)) return n;
  const old = new Map((((o && o.media) || []).filter((x) => x && x.id)).map((x) => [x.id, x]));
  n.media = n.media.filter((x) => x && typeof x === "object" && x.id).map((x) => {
    const y = Object.assign({}, x), prev = old.get(y.id);
    delete y.hasPw;
    if (pwOk(y.pw)) { y.pwHash = hashOf(y.pw); y.pwAt = Date.now(); }
    else if (prev && prev.pwHash) y.pwHash = prev.pwHash;
    else delete y.pwHash;
    delete y.pw;
    if (prev && prev.lastLoginAt && !(Number(y.lastLoginAt) >= prev.lastLoginAt)) y.lastLoginAt = prev.lastLoginAt;
    return y;
  });
  return n;
}
/* 온드미디어가 바꿀 수 있는 자기 계정 칸 (RS % · 링크 코드 · 채널 · 상태 · 메모는 마스터만) */
const SELF = { phone: 20, email: 80, bank: 30, account: 30, holder: 30, bizName: 60, bizNo: 20, noticeSeen: 0 };
function fixSelf(o, n, id) {
  const out = clone(o) || {}, mine = (out.media || []).find((x) => x && x.id === id), sent = n && Array.isArray(n.media) ? n.media.find((x) => x && x.id === id) : null;
  if (!mine || !sent) return out;
  const bank0 = [mine.bank, mine.account, mine.holder].join("|");
  Object.keys(SELF).forEach((k) => {
    if (sent[k] === undefined) return;
    mine[k] = SELF[k] ? String(sent[k] == null ? "" : sent[k]).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, SELF[k]) : Number(sent[k]) || 0;
  });
  if (sent.type === "person" || sent.type === "biz") mine.type = sent.type;
  if ([mine.bank, mine.account, mine.holder].join("|") !== bank0) mine.bankAt = Date.now();
  // 체험 온드미디어(_lib/familydemo.js)는 비밀번호를 바꿀 수 없어요
  if (mine.demo !== true && pwOk(sent.pw)) { mine.pwHash = hashOf(sent.pw); mine.pwAt = Date.now(); }
  return out;
}

module.exports = { RS_DEF, rules, rateOf, codeOf, rsProduct, attach, pubAcc, masterMeta, selfMeta, orderView, fixMaster, fixSelf, checkLogin, hashOf, pwOk };
