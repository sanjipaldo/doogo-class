/* 날짜 계산 공용 모듈 (Next.js 전환 2단계 · 2026-11) — 화면(db.js)과 서버(api/_lib)가 같은 계산을 써요.
 * 날짜는 "2026-11-21" 같은 글자로 다뤄요 (그 날의 0시 · 이 기기 시간대 기준 — db.js 가 예전부터 쓰던 방법 그대로).
 *  · 브라우저: <script src="shared/dates.js"> → window.DCS.dates
 *  · Node: require("./shared/dates") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else (root.DCS = root.DCS || {}).dates = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const pad = (n) => String(n).padStart(2, "0");
  /** Date → "YYYY-MM-DD" (이 기기 시간대) */
  const toStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  /** "YYYY-MM-DD" → 그 날 0시 Date (이 기기 시간대) */
  function parseDate(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); }
  const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return toStr(d); };
  /** a − b (날짜 수) */
  const diffDays = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 86400000);
  const ISO_D = /^\d{4}-\d{2}-\d{2}$/;
  /** n 개월 뒤 같은 날 (그 달에 그 날이 없으면 그 달 마지막 날 — 1/31 + 1개월 = 2/28 · 2/29) */
  function addMonths(s, n) {
    const [y, m, d] = String(s).split("-").map(Number), t = new Date(Date.UTC(y, (m || 1) - 1 + Number(n || 0), 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(Math.min(d || 1, last));
  }
  /** 오늘 (한국 시간 · 서버가 수강 기간을 볼 때 기준) */
  const kstToday = (now) => new Date((now == null ? Date.now() : now) + 9 * 3600e3).toISOString().slice(0, 10);
  /** 수강 기간 (2026-11-18): 수강생 accessUntil(이 날까지 들어올 수 있어요 · 없으면 평생) — 끝났는지 */
  const accessUntil = (s) => (s && ISO_D.test(String(s.accessUntil || "")) ? s.accessUntil : "");
  const accessExpired = (s, today) => { const u = accessUntil(s); return !!u && String(today || kstToday()) > u; };
  /** 볼 수 있는 마지막 날(이 날까지 · 2026-11-23 정규교육 다시보기 until) — 한국 날짜로 지났는지. 비었거나 날짜가 아니면 false (기한 없음) */
  const untilPassed = (u, today) => !!u && ISO_D.test(String(u)) && String(today || kstToday()) > String(u);
  return { pad, toStr, parseDate, addDays, diffDays, ISO_D, addMonths, kstToday, accessUntil, accessExpired, untilPassed };
});
