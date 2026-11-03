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
  return { pad, toStr, parseDate, addDays, diffDays, ISO_D };
});
