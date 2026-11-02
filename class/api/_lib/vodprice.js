/* 두고클래스 가격 계산 (서버) — 화면(vod.js)과 같은 규칙으로 서버가 금액을 다시 계산해요.
 * 결제 금액은 언제나 서버가 정해요: 화면이 보낸 금액(expect)은 ‘화면과 서버가 같은지’ 확인하는 데만 써요.
 * 카탈로그(vcat)는 마스터가 클래스 · 쿠폰 · 설정을 저장할 때 서버로 올려요 (가격에 필요한 칸만). */
"use strict";

// 수강권: 6개월(180일) · 12개월(365일) 두 가지 (2026-11 — 예전 3년 수강권은 팔지 않아요. 이미 산 주문은 그대로)
const PLAN_DAYS = [[180, "6개월", 1, 6], [365, "12개월", 1.1, 12]];
const PLAN_OLD = { 1095: "3년" };
const planLabel = (d) => { const x = PLAN_DAYS.find((y) => y[0] === Number(d)); return x ? x[1] : PLAN_OLD[Number(d)] || Number(d) + "일"; };
/** 재수강 할인가: 판매가 × (100 − %) — 100원 아래는 버려요 (화면 vod.js rbPrice 와 같은 계산) */
const rbPrice = (sale, pct) => Math.floor(sale * (100 - pct) / 100 / 100) * 100;
const BIZ_DEF = { ebook: true, live: false, free: false, flive: false };
const TYPES = { vod: 1, ebook: 1, live: 1, offline: 1, book: 1 };
/** 종이책: 한 주문에 몇 권까지 · 배송비(주문마다 한 번) */
const BOOK_MAX = 10;
const r1k = (n) => Math.round(n / 1000) * 1000;
const KST = 9 * 3600e3;
const kstDay = (ms) => new Date(ms + KST).toISOString().slice(0, 10);
const addDays = (d, n) => kstDay(Date.parse(d + "T00:00:00+09:00") + n * 864e5);
/** "2026-11-17T19:30" 처럼 시간대 없이 적은 시각은 한국 시간으로 읽어요 (화면은 한국 브라우저 기준) */
const kst = (s) => { if (!s) return 0; const str = String(s); const t = Date.parse(/([zZ]|[+-]\d\d:?\d\d)$/.test(str) ? str : str + (str.length <= 16 ? ":00" : "") + "+09:00"); return isNaN(t) ? 0 : t; };

function pricer(cat, nowMs) {
  const now = nowMs || Date.now(), P = (cat && cat.products) || [], S = (cat && cat.settings) || {}, B = (cat && cat.biz) || {};
  const today = kstDay(now);
  const product = (id) => P.find((p) => p.id === id) || null;
  const typeOf = (p) => (p && TYPES[p.type] ? p.type : "vod");
  const isEvent = (p) => /^(live|offline)$/.test(typeOf(p));
  const bizOn = (k) => (B[k] != null ? B[k] !== false : BIZ_DEF[k] !== false);
  const basePrice = (p) => (p.sale != null && p.sale !== "" && (!p.saleEnd || today <= p.saleEnd) ? Number(p.sale) : Number(p.price) || 0);
  const isFreeEv = (p) => !!p && isEvent(p) && !(Number(p.price) > 0);
  const evEnd = (p) => kst(p.eventAt) + (Number(p.eventMin) || 60) * 6e4;
  function funnelOf(f) {
    if (!isFreeEv(f) || !f.next || !kst(f.eventAt)) return null;
    const end = evEnd(f), ebDay = addDays(kstDay(end), Math.max(1, Math.min(60, Number(f.ebDays) || 3))), ebEnd = kst(ebDay + "T23:59:59");
    return { end, ebEnd, ebPrice: Number(f.ebPrice) || 0, phase: now < end ? "before" : now <= ebEnd ? "eb" : "done" };
  }
  function funnelTo(p) {
    if (!p || isFreeEv(p) || !bizOn("flive")) return null;
    const fs = P.filter((f) => f.status === "on" && f.next === p.id).map(funnelOf).filter(Boolean);
    return fs.filter((x) => x.phase === "eb").sort((a, b) => b.end - a.end)[0] || fs.filter((x) => x.phase === "before").sort((a, b) => a.end - b.end)[0] || null;
  }
  function ebOf(p) { const fn = funnelTo(p); return fn && fn.phase === "eb" && fn.ebPrice > 0 && fn.ebPrice < basePrice(p) ? { price: fn.ebPrice } : null; }
  const priceOf = (p) => { const e = ebOf(p); return e ? e.price : basePrice(p); };
  function plansOf(p) {
    if (!p || typeOf(p) !== "vod" || priceOf(p) === 0) return [];
    const cfg = p.plans || {}, base = priceOf(p), list0 = Number(p.price) || base, eb = ebOf(p), er = eb ? eb.price / basePrice(p) : 1;
    return PLAN_DAYS.map((x) => { const c = cfg[x[0]] || {}; if (c.on === false) return null; const sale = c.price != null && c.price !== "" ? (eb ? r1k(Number(c.price) * er) : Number(c.price)) : r1k(base * x[2]); return { d: x[0], label: x[1], sale, list: Math.max(sale, r1k(list0 * x[2])) }; }).filter(Boolean);
  }
  const defPlan = (p) => { const ps = plansOf(p); return ps.find((x) => x.d === 365) || ps[0] || null; };
  const planOf = (p, d) => plansOf(p).find((x) => x.d === Number(d)) || defPlan(p);
  function coachOf(p) {
    if (!p || typeOf(p) !== "vod" || priceOf(p) === 0 || !p.dg) return null;
    const c = p.coach || {}, d = S.coach || {};
    if (c.on === false) return null;
    return { n: Number(c.n) || Number(d.n) || 5, days: Number(c.days) || Number(d.days) || 180, price: c.price != null && c.price !== "" ? Number(c.price) : Number(d.price) || 150000 };
  }
  function teaOf(p) {
    if (!p || typeOf(p) !== "vod" || priceOf(p) === 0 || !p.dg) return null;
    const t = p.tea || {}, d = S.tea || {};
    if (t.on === false) return null;
    return { min: Number(t.min) || Number(d.min) || 60, price: t.price != null && t.price !== "" ? Number(t.price) : Number(d.price) || 99000 };
  }
  const extendPct = () => { const n = Number(S.extendPct); return n > 0 && n <= 100 ? n : 50; };
  /** 재수강 할인 % (꺼져 있으면 0) — 마스터 설정 settings.rebuy { on, pct }, 비우면 켜짐 · 40% */
  const rebuyPct = () => { const r = S.rebuy || {}, n = Number(r.pct); return r.on === false ? 0 : n > 0 && n < 100 ? n : 40; };
  /** 이 회원이 이 강의를 볼 수 있는 마지막 시각 (화면 accessEnd 와 같은 계산): 결제 완료 수강권 · 예전 연장권을 이어 붙여요 · 기간 없는 강의 Infinity · 산 적 없으면 0 */
  function accessEnd(p, orders) {
    const os = (orders || []).filter((o) => o && o.pid === p.id && o.status === "paid" && ((o.kind || "course") === "course" || o.kind === "extend")).sort((a, b) => (a.paidAt || 0) - (b.paidAt || 0));
    if (!os.length) return 0;
    if (typeOf(p) !== "vod") return Infinity;
    let end = 0;
    for (const o of os) { const d = Number(o.days) || (o.kind === "extend" ? 365 : Number(p.accessDays) || 0); if (!d) return Infinity; end = Math.max(end, o.paidAt || 0) + d * 864e5; }
    return end;
  }
  /** 재수강 할인 %: 예전에 이 강의를 수강했고(결제 완료) 지금은 수강 기간이 끝났을 때만 (아니면 0) */
  function rebuyFor(p, orders) {
    const pct = rebuyPct(); if (!pct || !p || typeOf(p) !== "vod" || !plansOf(p).length) return 0;
    const e = accessEnd(p, orders); return e && e !== Infinity && e <= now ? pct : 0;
  }
  function extendOf(p) { const y = plansOf(p).find((x) => x.d === 365) || defPlan(p); return y ? { d: 365, sale: r1k(y.sale * extendPct() / 100), list: y.sale } : null; }
  // 종이책은 도서정가제(정가의 10% 안 할인)라 쿠폰을 쓰지 않아요 — 할인가는 마스터가 정가의 90% 이상으로 정해요
  const shipOf = (p) => (typeOf(p) === "book" ? Math.max(0, Math.round(Number(p.shipFee) || 0)) : 0);
  function couponOff(c, p, amount) {
    if (!c || amount <= 0 || typeOf(p) === "book") return 0;
    if ((c.types || []).length && c.types.indexOf(typeOf(p)) < 0) return 0;
    if (c.min && amount < c.min) return 0;
    const off = c.kind === "pct" ? Math.floor(amount * c.value / 100 / 10) * 10 : Number(c.value) || 0;
    return Math.min(amount, c.kind === "pct" && c.max ? Math.min(off, c.max) : off);
  }
  return { now, today, product, typeOf, isEvent, isFreeEv, basePrice, priceOf, plansOf, planOf, coachOf, teaOf, extendOf, couponOff, shipOf, evEnd, kst, rebuyPct, accessEnd, rebuyFor };
}

module.exports = { pricer, PLAN_DAYS, PLAN_OLD, planLabel, rbPrice, BOOK_MAX, r1k, kst, kstDay, addDays };
