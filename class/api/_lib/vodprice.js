/* 두고클래스 가격 계산 (서버) — 화면(vod.js)과 같은 규칙(공용 모듈 shared/price.js)으로 서버가 금액을 다시 계산해요.
 * 결제 금액은 언제나 서버가 정해요: 화면이 보낸 금액(expect)은 ‘화면과 서버가 같은지’ 확인하는 데만 써요.
 * 카탈로그(vcat)는 마스터가 클래스 · 쿠폰 · 설정을 저장할 때 서버로 올려요 (가격에 필요한 칸만). */
"use strict";

// 가격 계산 규칙은 화면과 같은 공용 모듈(class/shared/price.js — Next.js 전환 2단계). 여기는 서버 쪽 ‘지금 값’(가격표 · 한국 시간)만 넘겨요
const PR = require("../../shared/price");
// 수강권: 6개월(180일) · 12개월(365일) 두 가지 (2026-11 — 예전 3년 수강권은 팔지 않아요. 이미 산 주문은 그대로)
const { PLAN_DAYS, PLAN_OLD, r1k, rbPrice } = PR;
const planLabel = (d) => { const x = PLAN_DAYS.find((y) => y[0] === Number(d)); return x ? x[1] : PLAN_OLD[Number(d)] || Number(d) + "일"; };

/** 종이책: 한 주문에 몇 권까지 · 배송비(주문마다 한 번) */
const BOOK_MAX = 10;
// 한국 시간 날짜 · 시각 — 화면(vod.js)과 같은 공용 도우미(shared/price.js KST)
const kstDay = PR.KST.day, addDays = PR.KST.addDays, kst = PR.KST.time;

function pricer(cat, nowMs) {
  const now = nowMs || Date.now(), P = (cat && cat.products) || [], S = (cat && cat.settings) || {}, B = (cat && cat.biz) || {};
  const today = kstDay(now);
  const product = (id) => P.find((p) => p.id === id) || null;
  const { typeOf, isEvent, isFreeEv } = PR;
  // 계산 규칙은 화면과 같은 공용 모듈 — 서버는 결제 가격표(vcat) · 한국 시간 · 가격표의 dg 칸을 넘겨요
  const X = PR.make({
    products: () => P, settings: () => S, biz: () => B, now: () => now, today: () => today,
    time: kst, dayOf: kstDay, addDays, endOfDay: (d) => kst(d + "T23:59:59"), dgOpen: (p) => !!p.dg
  });
  const { basePrice, priceOf, plansOf, planOf, coachOf, teaOf, extendOf, couponOff, shipOf, evEnd, rebuyPct } = X;
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
  return { now, today, product, typeOf, isEvent, isFreeEv, basePrice, priceOf, plansOf, planOf, coachOf, teaOf, extendOf, couponOff, shipOf, evEnd, kst, rebuyPct, accessEnd, rebuyFor };
}

module.exports = { pricer, PLAN_DAYS, PLAN_OLD, planLabel, rbPrice, BOOK_MAX, r1k, kst, kstDay, addDays };
