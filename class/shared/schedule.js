/* 기수 · 주차 일정 계산 공용 모듈 (Next.js 전환 2단계 · 2026-11) — 화면(db.js)과 서버가 같은 계산을 써요.
 *  기수(co): { startDate: "YYYY-MM-DD", classDow?: 0~6(매주 강의 요일), classDates?: { "5": "2026-09-23" }(주차별로 바꾼 강의일) }
 *  주차 수(weeks)는 커리큘럼에서 정해져서 db.js 가 넘겨 줘요 (cohortWeeks).
 *  · 브라우저: <script src="shared/dates.js"> 다음 <script src="shared/schedule.js"> → window.DCS.schedule
 *  · Node: require("./shared/schedule") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make(require("./dates"));
  else (root.DCS = root.DCS || {}).schedule = make(root.DCS.dates);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";
  const { addDays, parseDate, diffDays, ISO_D } = D;
  /** 주차별로 바꾼 강의일 (없으면 null) */
  const dateOver = (co, no) => { const m = co && co.classDates, v = m && typeof m === "object" ? m[String(no)] : null; return typeof v === "string" && ISO_D.test(v) ? v : null; };
  /** 주차 시작일 (기수 시작일 + 7일씩) */
  const baseOpen = (co, no) => addDays(co.startDate, (no - 1) * 7);
  /** 매주 강의 요일만으로 정한 강의일 (주차별로 바꾼 날은 빼고) — 요일을 안 정했으면 주차 시작일 */
  function baseClassDate(co, no) {
    const open = baseOpen(co, no);
    const hasDow = co.classDow !== undefined && co.classDow !== null && co.classDow !== "";
    return hasDow ? addDays(open, ((Number(co.classDow) - parseDate(open).getDay()) + 7) % 7) : open;
  }
  /** 주차가 열리는 날: 바꾼 강의일이 원래 주차 시작보다 빠르면 그 날 */
  const weekOpen = (co, no) => { const o = baseOpen(co, no), v = dateOver(co, no); return v && v < o ? v : o; };
  /** 과제 마감일: 원래 마감(주차 시작 + 6일)과 바꾼 강의일 중 늦은 날 */
  const weekDeadline = (co, no) => { const d = addDays(co.startDate, (no - 1) * 7 + 6), v = dateOver(co, no); return v && v > d ? v : d; };
  /** 주차 강의 날짜: 주차별로 바꾼 날 → 매주 강의 요일 → 주차 시작일 */
  const classDate = (co, no) => dateOver(co, no) || baseClassDate(co, no);
  /** 주차가 수강생에게 열리는 날 (2026-11-09): 그 주 강의일 5일 전부터 — 예: 11/21(토) 강의면 11/16부터 (강의일 포함 6일 전)
   *  원래 열리던 날(주차 시작 · 앞당긴 강의일)이 더 빠르면 그 날 그대로 — 지금 보이는 주차가 늦게 열리는 일은 없어요.
   *  과제 마감 · 이번 주차 · ‘N주차 무슨 요일’ 일정은 예전 그대로 weekOpen 으로 */
  const OPEN_BEFORE = 5;
  const weekUnlock = (co, no) => { const o = weekOpen(co, no), e = addDays(classDate(co, no), -OPEN_BEFORE); return e < o ? e : o; };
  /** 기수가 끝나는 날 (마지막 주차 마감까지) */
  const cohortEnd = (co, weeks) => { const n = Math.max(1, weeks), e = addDays(co.startDate, n * 7 - 1), d = weekDeadline(co, n); return d > e ? d : e; };
  /** 오늘(today) 기준 기수 상태: upcoming(모집 중) · running(진행 중) · ended(종료) */
  function cohortStatus(co, weeks, today) {
    if (today < co.startDate) return "upcoming";
    if (today > cohortEnd(co, weeks)) return "ended";
    return "running";
  }
  /** 오늘(today) 기준 이번 주차 (시작 전 0) — 강의일을 앞당긴 주차는 그 날부터 ‘이번 주차’ */
  function currentWeek(co, weeks, today) {
    const d = diffDays(today, co.startDate);
    if (d < 0) return 0;
    const n = Math.min(weeks, Math.floor(d / 7) + 1);
    return n < weeks && weekOpen(co, n + 1) <= today ? n + 1 : n;
  }
  /** 모든 기수에 들어가는 일정(‘N주차 무슨 요일’)의 날짜 */
  const weekDow = (co, week, dow) => { const open = weekOpen(co, Number(week) || 1); return addDays(open, ((Number(dow) - parseDate(open).getDay()) + 7) % 7); };
  return { dateOver, baseOpen, baseClassDate, weekOpen, weekUnlock, OPEN_BEFORE, weekDeadline, classDate, cohortEnd, cohortStatus, currentWeek, weekDow };
});
