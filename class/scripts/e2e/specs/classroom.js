/* 두잉고 강의실 — 수강생 과제 제출 → 자동검수 → 강사 과제 검수에서 승인 → 수강생 화면에 ‘강사 승인’
 *  (글 과제: 1주차 m1-7 · 6자 이상) · 수강생과 강사는 다른 브라우저 창(쿠키가 따로)으로 */
"use strict";
const FL = require("./_flows");
const MID = "m1-7";

module.exports = {
  title: "과제 제출 → 강사 검수 승인 → 수강생 화면 반영",
  async run({ base, info, browser, run, L }) {
    const stu = await L.newPage(browser), ins = await L.newPage(browser);
    run.watch(stu, "수강생"); run.watch(ins, "강사");
    const answer = "E2E 과제 답변이에요 " + Date.now().toString(36) + " — 첫 상품 후보 세 가지를 골라 봤어요.";
    // 1) 수강생: 주차 → 과제 → 제출
    await FL.student(stu, base, info);
    await L.open(stu, base, "/missions");
    await run.check(!!(await stu.$('a.week-card[href$="/missions/1"], a.week-card')), "수강생: 과제 · 미션 주차 목록", null, stu);
    await L.open(stu, base, "/missions/1/" + MID);
    await stu.waitForSelector("form#submit-form textarea#sub-text", { timeout: 10000 });
    await stu.fill("#sub-text", answer);
    await stu.click('#submit-form button[type="submit"]');
    await stu.waitForSelector("#result .result", { timeout: 10000 }).catch(() => {});
    await run.check(!!(await stu.$("#result .result.pass")), "수강생: 제출 → 자동검수 통과", await L.text(stu, "#result"), stu);
    await L.flushed(stu);
    // 2) 강사: 과제 검수 → 그 제출 열기 → 승인
    await FL.instructor(ins, base, info);
    await L.open(ins, base, "/center/reviews");
    const row = 'tr[data-action="review-open"][data-sid="' + info.student.sid + '"][data-mid="' + MID + '"]';
    const found = await ins.waitForSelector(row, { timeout: 10000 }).catch(() => null);
    await run.check(!!found, "강사: 과제 검수 목록에 방금 제출이 보여요", null, ins);
    if (found) {
      await ins.click(row);
      await ins.waitForSelector('button[data-action="review-save"][data-status="approved"]', { timeout: 10000 });
      await ins.fill("#rv-comment", "잘했어요! (E2E)").catch(() => {});
      await ins.click('button[data-action="review-save"][data-status="approved"]');
      await ins.waitForTimeout(600);
      await run.check(/승인했어요/.test(await L.toasts(ins)), "강사: 승인 저장", await L.toasts(ins), ins);
      await L.flushed(ins);
    }
    // 3) 수강생: 다시 열면 ‘강사님이 승인했어요’
    await L.open(stu, base, "/missions/1/" + MID);
    const res = (await L.text(stu, "#result")) || (await L.bodyText(stu));
    await run.check(/강사님이 승인했어요|강사 승인/.test(res), "수강생: 과제 화면에 강사 승인이 보여요", res.slice(0, 300), stu);
    // 4) 강사 (운영처럼 React 화면): 승인 탭엔 ‘선택 승인’ 대신 ‘선택 승인 취소’ · 전체 선택하면 줄마다 체크 (2026-11-22)
    await L.reactCookie(ins, base, "all");
    await L.open(ins, base, "/center/reviews");
    await ins.click('button[data-action="rev-tab"][data-k="approved"]').catch(() => {});
    await ins.waitForTimeout(500);
    const acts = await ins.$$eval(".a-rev-bulk [data-action]", (bs) => bs.map((b) => b.getAttribute("data-action"))).catch(() => []);
    await run.check(acts.indexOf("rev-bulk-undo") >= 0 && acts.indexOf("rev-bulk-approve") < 0, "강사: 승인 탭 일괄 버튼 = 보완 요청 · 승인 취소 (다시 승인 없음)", acts.join(","), ins);
    await ins.check("#rev-all-2").catch(() => {});
    await ins.waitForTimeout(400);
    const picks = await ins.$$eval(".rev-pick", (xs) => xs.map((x) => x.checked)).catch(() => []), cntTxt = await L.text(ins, ".a-rev-bulk .a-muted");
    await run.check(picks.length > 0 && picks.every(Boolean) && cntTxt.indexOf(picks.length + "개 선택") >= 0, "강사: 전체 선택 → 줄마다 체크 표시 · 개수와 같아요", picks.join(",") + " · " + cntTxt, ins);
    await ins.uncheck("#rev-all-2").catch(() => {});
    await ins.waitForTimeout(400);
    const picks2 = await ins.$$eval(".rev-pick", (xs) => xs.map((x) => x.checked)).catch(() => []);
    await run.check(picks2.length > 0 && picks2.every((x) => !x), "강사: 전체 선택 해제 → 줄 체크도 모두 풀려요", picks2.join(","), ins);
    // 5) 실수로 승인했다면: 그 과제 열기 → ‘승인 취소’ → 확인 → 검수 대기로
    const row2 = await ins.waitForSelector(row, { timeout: 10000 }).catch(() => null);
    if (row2) {
      await ins.click(row);
      await ins.waitForSelector('button[data-action="review-undo"]', { timeout: 10000 }).catch(() => {});
      const noApprove = !(await ins.$('button[data-action="review-save"][data-status="approved"]'));
      await run.check(!!(await ins.$('button[data-action="review-undo"]')) && noApprove, "강사: 승인된 과제 창 = ‘승인 취소’ 있고 ‘승인’ 버튼 없음", null, ins);
      await ins.click('button[data-action="review-undo"]').catch(() => {});
      await ins.waitForSelector('button[data-action="confirm-ok"]', { timeout: 10000 }).catch(() => {});
      await ins.click('button[data-action="confirm-ok"]').catch(() => {});
      await ins.waitForTimeout(700);
      await run.check(/검수 대기로 되돌렸어요/.test(await L.toasts(ins)), "강사: 승인 취소 → 검수 대기로 되돌렸어요", await L.toasts(ins), ins);
      await L.flushed(ins);
      await ins.click('button[data-action="rev-tab"][data-k="pending"]').catch(() => {});
      await ins.waitForTimeout(500);
      await run.check(!!(await ins.$(row)), "강사: 그 과제가 검수 대기 탭으로 돌아왔어요", null, ins);
    }
    // 6) 수강생: ‘강사 승인’ 표시가 사라지고 자동검수 결과만
    await L.open(stu, base, "/missions/1/" + MID);
    const res2 = (await L.text(stu, "#result")) || (await L.bodyText(stu));
    await run.check(!/강사님이 승인했어요/.test(res2) && /자동|통과/.test(res2), "수강생: 승인 취소 뒤엔 ‘강사 승인’ 대신 자동검수 결과", res2.slice(0, 300), stu);
    await stu.context().close(); await ins.context().close();
  }
};
