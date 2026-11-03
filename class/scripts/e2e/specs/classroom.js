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
    await stu.context().close(); await ins.context().close();
  }
};
