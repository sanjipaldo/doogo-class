/* 두고클래스 가격 계산 공용 모듈 (Next.js 전환 2단계 · 2026-11) — 화면(vod.js)과 서버(api/_lib/vodprice.js)가 같은 규칙을 써요.
 * 예전에는 화면과 서버에 같은 계산이 두 벌 있었어요. 이제 규칙은 여기 하나, 쓰는 쪽은 ‘지금 값’만 넘겨줘요.
 *   make(ctx) → 계산 함수들. ctx 는 부를 때마다 읽는 함수예요 (값이 바뀌면 다음 계산부터 바로 반영):
 *     products() · settings() · biz()   상품 목록 · 판매 설정 · 판매 영역 (화면: 스토어 데이터 · 서버: 결제 가격표 vcat)
 *     now() · today()                   지금 시각(ms) · 오늘 "YYYY-MM-DD"
 *     time(s) · dayOf(ms) · addDays(d, n) · endOfDay(d)   시각 읽기 · 날짜 계산 (화면: 이 기기 시간대 · 서버: 한국 시간)
 *     dgOpen(p)                         두잉고 VOD 강의실이 열린 강의인지 (화면: 강사 확인 · 서버: 가격표의 dg 칸)
 *  · 브라우저: <script src="shared/price.js"> → window.DCS.price · Node: require("./shared/price") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else (root.DCS = root.DCS || {}).price = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const TYPES = { vod: 1, ebook: 1, book: 1, live: 1, offline: 1 };
  /** 판매 영역 기본값: 지금은 VOD · 전자책 중심 */
  const BIZ_DEF = { ebook: true, live: false, free: false, flive: false };
  /** 수강권: 6개월(180일) · 12개월(365일 · 판매가 × 1.1) — [일, 이름, 배수, 개월] (예전 3년 수강권은 팔지 않아요) */
  const PLAN_DAYS = [[180, "6개월", 1, 6], [365, "12개월", 1.1, 12]];
  const PLAN_OLD = { 1095: "3년" };
  /** 천 원 단위 반올림 */
  const r1k = (n) => Math.round(n / 1000) * 1000;
  /** 월 가격 (100원 올림) */
  const perMonth = (sale, mo) => Math.ceil(sale / mo / 100) * 100;
  /** 재수강 할인가: 판매가 × (100 − %) — 100원 아래는 버려요 */
  const rbPrice = (sale, pct) => Math.floor(sale * (100 - pct) / 100 / 100) * 100;
  const typeOf = (p) => (p && TYPES[p.type] ? p.type : "vod");
  const isEvent = (p) => typeOf(p) === "live" || typeOf(p) === "offline";
  const isBook = (p) => typeOf(p) === "book";
  /** 무료 LIVE(0원 LIVE · 설명회) */
  const isFreeEv = (p) => !!p && isEvent(p) && !(Number(p.price) > 0);

  function make(ctx) {
    const S = () => ctx.settings() || {};
    const bizOn = (k) => { const b = ctx.biz() || {}; return b[k] != null ? b[k] !== false : BIZ_DEF[k] !== false; };
    const eventTime = (p) => ctx.time(p && p.eventAt) || 0;
    const evEnd = (p) => eventTime(p) + (Number(p.eventMin) || 60) * 6e4;
    /** 무료 LIVE → 이어지는 유료 강의 얼리버드: LIVE 끝 시각 · 얼리버드 마지막 날 · 가격 · 단계(before · eb · done) */
    function funnelOf(f) {
      if (!isFreeEv(f) || !f.next || !eventTime(f)) return null;
      const end = evEnd(f), ebDay = ctx.addDays(ctx.dayOf(end), Math.max(1, Math.min(60, Number(f.ebDays) || 3))), ebEnd = ctx.endOfDay(ebDay), now = ctx.now();
      return { f, next: f.next, end, ebDay, ebEnd, ebPrice: Number(f.ebPrice) || 0, phase: now < end ? "before" : now <= ebEnd ? "eb" : "done" };
    }
    /** 이 유료 강의로 이어지는 무료 LIVE: 얼리버드 중인 회차 → 다가오는 회차 순 */
    function funnelTo(p) {
      if (!p || isFreeEv(p) || !bizOn("flive")) return null;
      const fs = (ctx.products() || []).filter((f) => f.status === "on" && f.next === p.id).map(funnelOf).filter(Boolean);
      return fs.filter((x) => x.phase === "eb").sort((a, b) => b.end - a.end)[0] || fs.filter((x) => x.phase === "before").sort((a, b) => a.end - b.end)[0] || null;
    }
    /** 할인가(마감일 전까지) → 정가 */
    const basePrice = (p) => (p.sale != null && p.sale !== "" && (!p.saleEnd || ctx.today() <= p.saleEnd) ? Number(p.sale) : Number(p.price) || 0);
    function ebOf(p) { const fn = funnelTo(p); return fn && fn.phase === "eb" && fn.ebPrice > 0 && fn.ebPrice < basePrice(p) ? Object.assign({ price: fn.ebPrice }, fn) : null; }
    /** 지금 파는 가격 (얼리버드 중이면 얼리버드 가격) */
    const priceOf = (p) => { const e = ebOf(p); return e ? e.price : basePrice(p); };
    /** VOD 유료 강의의 수강권 목록 — 클래스마다 정한 가격, 비우면 6개월 = 판매가 · 12개월 = × 1.1 (천 원 단위) */
    function plansOf(p) {
      if (!p || typeOf(p) !== "vod" || priceOf(p) === 0) return [];
      const cfg = p.plans || {}, base = priceOf(p), list0 = Number(p.price) || base, eb = ebOf(p), er = eb ? eb.price / basePrice(p) : 1;
      return PLAN_DAYS.map((x) => { const c = cfg[x[0]] || {}; if (c.on === false) return null; const sale = c.price != null && c.price !== "" ? (eb ? r1k(Number(c.price) * er) : Number(c.price)) : r1k(base * x[2]); return { d: x[0], label: x[1], mo: x[3], sale, list: Math.max(sale, r1k(list0 * x[2])), day: Math.round(sale / x[0]), month: perMonth(sale, x[3]) }; }).filter(Boolean);
    }
    const defPlan = (p) => { const ps = plansOf(p); return ps.find((x) => x.d === 365) || ps[0] || null; };
    const planOf = (p, d) => plansOf(p).find((x) => x.d === Number(d)) || defPlan(p);
    const y365 = (p) => plansOf(p).find((x) => x.d === 365) || null;
    /** 1:1 코칭권 (횟수 · 사용 기간 · 가격) — 두잉고 VOD 강의실이 열린 유료 VOD 강의만 */
    function coachOf(p) {
      if (!p || typeOf(p) !== "vod" || priceOf(p) === 0 || !ctx.dgOpen(p)) return null;
      const c = p.coach || {}, d = S().coach || {};
      if (c.on === false) return null;
      const n = Number(c.n) || Number(d.n) || 5, days = Number(c.days) || Number(d.days) || 180, price = c.price != null && c.price !== "" ? Number(c.price) : Number(d.price) || 150000;
      return { n, days, price, per: Math.round(price / n / 100) * 100 };
    }
    /** 강사님과 TEA TIME (시간 · 가격) — Zoom(온라인 화상)으로만 */
    function teaOf(p) {
      if (!p || typeOf(p) !== "vod" || priceOf(p) === 0 || !ctx.dgOpen(p)) return null;
      const t = p.tea || {}, d = S().tea || {};
      if (t.on === false) return null;
      return { min: Number(t.min) || Number(d.min) || 60, price: t.price != null && t.price !== "" ? Number(t.price) : Number(d.price) || 99000, mode: "online" };
    }
    const extendPct = () => { const n = Number(S().extendPct); return n > 0 && n <= 100 ? n : 50; };
    /** 예전 1년 연장권 가격 (이제 팔지 않아요 — 예전 주문 계산용) */
    function extendOf(p) { const y = y365(p) || defPlan(p); return y ? { d: 365, sale: r1k(y.sale * extendPct() / 100), list: y.sale } : null; }
    /** 재수강 할인 설정 { on, pct } — 마스터 설정 settings.rebuy, 비우면 켜짐 · 40% */
    const rebuySet = () => { const r = S().rebuy || {}, n = Number(r.pct); return { on: r.on !== false, pct: n > 0 && n < 100 ? n : 40 }; };
    /** 재수강 할인 % (꺼져 있으면 0) */
    const rebuyPct = () => { const r = rebuySet(); return r.on ? r.pct : 0; };
    /** 종이책 배송비 (주문마다 한 번) */
    const shipOf = (p) => (isBook(p) ? Math.max(0, Math.round(Number(p.shipFee) || 0)) : 0);
    /** 쿠폰 할인 금액 — 종이책은 도서정가제로 쿠폰을 쓰지 않아요 */
    function couponOff(c, p, amount) {
      if (!c || amount <= 0 || isBook(p)) return 0;
      if ((c.types || []).length && c.types.indexOf(typeOf(p)) < 0) return 0;
      if (c.min && amount < c.min) return 0;
      const off = c.kind === "pct" ? Math.floor(amount * c.value / 100 / 10) * 10 : Number(c.value) || 0;
      return Math.min(amount, c.kind === "pct" && c.max ? Math.min(off, c.max) : off);
    }
    return { bizOn, evEnd, funnelOf, funnelTo, basePrice, ebOf, priceOf, plansOf, defPlan, planOf, y365, coachOf, teaOf, extendPct, extendOf, rebuySet, rebuyPct, shipOf, couponOff };
  }
  return { make, TYPES, BIZ_DEF, PLAN_DAYS, PLAN_OLD, r1k, perMonth, rbPrice, typeOf, isEvent, isBook, isFreeEv };
});
