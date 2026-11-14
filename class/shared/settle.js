/* 정산 계산 공용 모듈 (Next.js 전환 2단계 · 2026-11) — 화면(vod.js · admin.js)과 서버(api/_lib/media.js)가 같은 규칙을 써요.
 *  · 주문 한 건: 정산 기준 판매가 · PG 결제 수수료 · 온드미디어 RS · 강사 정산액
 *  · 온드미디어 RS 규칙: 비율(구독자 수 기준 10 · 20% 또는 직접 정한 %) · 링크 코드 · 대상 상품
 *  · 정산 명세서 마지막 계산: 사업자(세금계산서) · 개인(÷1.1 뒤 3.3% 원천징수) 지급액
 * 기준 (2026-11 std): 정산액 = (할인 전 판매가 − 온드미디어 RS − 결제 수수료) × 강사 비율(기본 50%) — 부가세가 들어 있는 금액
 *  · 결제 수수료(정산 공제)는 2026-11-15 결제분부터 고정 7.5% (그 전 결제분은 실제 PG 수수료) · 온드미디어 RS도 (판매가 × (1 − 7.5%)) × RS율
 *  · 브라우저: <script src="shared/settle.js"> → window.DCS.settle · Node: require("./shared/settle") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else (root.DCS = root.DCS || {}).settle = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  /** 주문 종류: course(수강권) · extend(예전 1년 연장권) · coach(1:1 코칭권) · tea(TEA TIME) — 예전 주문은 kind 없이 course */
  const KINDS = { course: 1, extend: 1, coach: 1, tea: 1 };
  const kindOf = (o) => (o && KINDS[o.kind] ? o.kind : "course");
  /** 숫자 칸 읽기: lo~hi 안의 숫자면 그 값, 아니면 d */
  const num = (v, lo, hi, d) => { const n = Number(v); return v !== null && v !== undefined && v !== "" && isFinite(n) && n >= lo && n <= hi ? n : d; };

  /* ---------- 주문 한 건 ---------- */
  /** 정산 기준 판매가 (할인 전 판매가 · 쿠폰 · 포인트는 플랫폼 부담이라 빼지 않아요) */
  const baseOf = (o) => Math.max(0, Number(o.sale != null ? o.sale : o.amount) || 0);
  /** 공급가액 (부가세 뺀 금액) */
  const supplyOf = (o) => Math.round(baseOf(o) / 1.1);
  /** PG 결제 수수료 — 결제수단별 [%, 건당 원] 기본값 (마스터 › 매출 리포트 › 수수료율에서 PG 계약대로 바꿔요) */
  const PG_FEE_DEF = { card: [3.3, 0], kakao: [3.3, 0], naver: [3.3, 0], toss: [3.3, 0], transfer: [2, 0], vbank: [0, 300], bank: [0, 0], free: [0, 0] };
  const PG_KEYS = ["card", "kakao", "naver", "toss", "transfer", "vbank", "bank"];
  const payKeyOf = (o) => (!(Number(o && o.amount) > 0) || o.method === "free" || o.method === "point" ? "free" : PG_KEYS.indexOf(o.method) >= 0 ? o.method : "card");
  /** 결제수단 k 의 [%, 건당 원] — pgFee = 마스터 설정 settings.pgFee (빈 칸은 기본값) */
  const pgRate = (pgFee, k) => { const s = (pgFee || {})[k] || {}, d = PG_FEE_DEF[k] || [0, 0], n = (x, dv) => (x != null && x !== "" && isFinite(Number(x)) ? Number(x) : dv); return [n(s.pct, d[0]), n(s.won, d[1])]; };
  /** 이 주문의 PG 결제 수수료 (고객 결제액 × 수수료율 + 건당) — 무료 · 쿠폰 · 포인트 결제는 0원 */
  const pgFeeOf = (pgFee, o) => { const a = Number(o && o.amount) || 0; if (!(a > 0)) return 0; const f = pgRate(pgFee, payKeyOf(o)); return Math.max(0, Math.round(a * f[0] / 100) + f[1]); };
  /** 이 주문의 온드미디어 RS (환불 전 전체 · 부가세 포함 · 10원 아래 버림) = 판매가 × (1 − PG 공제 %) × RS % — 수강권 주문만 */
  const rsOf = (o) => { if (!o || !o.rs || kindOf(o) !== "course") return 0; const pg = Number(o.rs.pg) || 0, r = Number(o.rs.rate) || 0; return Math.max(0, Math.floor(baseOf(o) * (100 - pg) * r / 100000 + 1e-6) * 10); };
  /** 정산 공제 결제 수수료 (2026-11-15 확정 · 회사소개서 기준) — 강사 정산에서 빼는 고정 비율 7.5% (결제수단과 상관없이 고객 결제액 기준).
   *  마스터 설정 settings.settleFee(%)로 바꿀 수 있고 빈 칸이면 기본값. 2026-11-15(한국 시간) 전에 결제한 주문은 예전처럼 실제 PG 수수료(pgFeeOf)를 빼요.
   *  실제 PG 수수료(pgFeeOf · settings.pgFee)는 매출 리포트의 플랫폼 이익 계산에 그대로 써요 */
  const SETTLE_FEE_DEF = 7.5;
  const SETTLE_FEE_FROM = Date.parse("2026-11-15T00:00:00+09:00");
  const settleFeePct = (s) => num(s && s.settleFee, 0, 30, SETTLE_FEE_DEF);
  /** 이 주문의 정산 공제 결제 수수료 — s = 마스터 설정(settings: settleFee · pgFee) · 무료 · 쿠폰 · 포인트 결제는 0원 */
  const settleFeeOf = (s, o) => {
    const a = Number(o && o.amount) || 0;
    if (!(a > 0) || payKeyOf(o) === "free") return 0;
    const t = Number(o.paidAt || o.at) || 0;
    if (t && t < SETTLE_FEE_FROM) return pgFeeOf((s || {}).pgFee, o);
    return Math.max(0, Math.round(a * settleFeePct(s) / 100));
  };
  /** 강사 정산 기준액 = 할인 전 판매가 − 온드미디어 RS − 정산 공제 결제 수수료 (s = 마스터 설정) */
  const insBase = (s, o) => Math.max(0, baseOf(o) - rsOf(o) - settleFeeOf(s, o));
  /** 강사 정산액 = 기준액 × 강사 비율(share %) · 10원 아래 버림 (부가세가 들어 있는 금액) */
  const insAmt = (s, o, share) => Math.floor(insBase(s, o) * share / 100 / 10) * 10;
  /** 환불된 주문에서 정산에 남는 비율 (부분 환불이면 남은 만큼 · 전액 환불 0) */
  const keepOf = (o) => (o.status === "refunded" ? Math.max(0, 1 - (o.amount > 0 && o.refundAmount != null ? o.refundAmount / o.amount : 1)) : 1);
  /** 확정 뒤 환불된 비율 (다음 명세서에서 차감) */
  const refundRatio = (o) => (o.amount > 0 && o.refundAmount != null ? Math.min(1, o.refundAmount / o.amount) : 1);

  /* ---------- 온드미디어 RS 규칙 ---------- */
  const RS_DEF = { lo: 10, hi: 20, subs: 100000, days: 30, pg: 7.5 };
  /** RS 규칙 (settings.rs 에서 빈 칸은 기본값): 낮은 % · 높은 % · 구독자 기준 · 링크 기간(일) · PG 공제 % */
  const rsRules = (r) => { r = r || {}; return { lo: num(r.lo, 0, 100, RS_DEF.lo), hi: num(r.hi, 0, 100, RS_DEF.hi), subs: num(r.subs, 0, 1e10, RS_DEF.subs), days: num(r.days, 1, 365, RS_DEF.days), pg: num(r.pg, 0, 30, RS_DEF.pg) }; };
  /** 계정의 RS %: 마스터가 직접 정했으면 그 값, 아니면 구독자 수가 기준 이상이면 높은 %, 미만이면 낮은 % */
  const rsRateOf = (acc, R) => { const own = num(acc && acc.rate, 0, 100, null); return own != null ? own : (Number(acc && acc.subs) || 0) >= R.subs ? R.hi : R.lo; };
  /** 홍보 링크 코드 (영문 소문자 · 숫자 16자) */
  const rsCode = (v) => String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  /** RS 대상 상품: 종이책은 빼요 (택배 · 도서정가제) */
  const rsProduct = (p) => !!p && (p.type || "vod") !== "book";

  /* ---------- 정산 명세서 지급액 ---------- */
  /** 정산 금액(net · 부가세 포함) → 세금 · 지급액. mode: std(2026-11 기준) · 예전 확정분 gross · net · supply. base0 = 판매가 합계(gross 세금계산서용)
   *  std: 사업자 → 정산 금액 그대로 지급(강사님이 세금계산서) / 개인 → ÷ 1.1(부가세 전 금액 sup)에서 3.3% 원천징수(10원 아래 버림) */
  function payout(net, biz, mode, base0) {
    const sup = !biz && net > 0 ? Math.floor(net / 1.1) : 0, vatOut = !biz && net > 0 ? net - sup : 0;
    const wh = mode === "std" ? (sup > 0 ? Math.floor(sup * 0.033 / 10) * 10 : 0) : !biz && net > 0 ? Math.floor(net * 0.033 / 10) * 10 : 0;
    const vat = mode === "supply" && biz && net > 0 ? Math.round(net * 0.1) : 0;
    const pay = mode === "std" ? (net > 0 ? (biz ? net : sup - wh) : 0) : Math.max(0, net - wh + vat);
    const invIns = !biz || net <= 0 ? 0 : mode === "gross" ? base0 : mode === "supply" ? net + vat : pay, invPf = biz && net > 0 && mode === "gross" ? Math.max(0, base0 - pay) : 0;
    return { sup, vatOut, wh, vat, pay, invIns, invPf };
  }
  return { KINDS, kindOf, num, baseOf, supplyOf, PG_FEE_DEF, PG_KEYS, payKeyOf, pgRate, pgFeeOf, SETTLE_FEE_DEF, SETTLE_FEE_FROM, settleFeePct, settleFeeOf, rsOf, insBase, insAmt, keepOf, refundRatio, RS_DEF, rsRules, rsRateOf, rsCode, rsProduct, payout };
});
