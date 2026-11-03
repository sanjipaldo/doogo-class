/* 강사센터 · 마스터 — 저장이 서버에 남는지 (새로 고친 뒤 · 다른 사람 화면에서도) · 마스터 강사 정산 화면 */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "강사센터 저장 · 마스터 강사 정산",
  async run({ base, info, browser, run, L }) {
    const page = await L.newPage(browser);
    run.watch(page, "강사센터");
    // 1) 강사: 클래스 소식(공지) 올리기 → 새로 고쳐도 있음 → 수강생 화면에도 보임
    const title = "E2E 공지 " + Date.now().toString(36);
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/notices");
    await page.click('button[data-action="item-add"][data-coll="notice"]');
    await page.waitForSelector("form#coll-form #cf-title");
    await page.fill("#cf-title", title);
    await page.fill("#cf-body", "E2E 테스트 공지 본문이에요.");
    await page.click('#modal-root button[type="submit"][form="coll-form"]');
    await page.waitForTimeout(600);
    await run.check(/공지를 저장했어요/.test(await L.toasts(page)), "강사: 공지 저장 안내", await L.toasts(page), page);
    await L.flushed(page);
    await L.open(page, base, "/center/notices");
    await run.check((await L.bodyText(page)).indexOf(title) >= 0, "강사: 공지를 올리면 새로 고쳐도 남아요 (서버 저장)", null, page);
    await FL.student(page, base, info);
    await L.open(page, base, "/notices");
    await run.check((await L.bodyText(page)).indexOf(title) >= 0, "수강생 화면 ‘클래스 소식’에 그 공지가 보여요", null, page);
    // 2) 마스터 강사 정산: 상품 종류 탭 · 정산 규칙 카드
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master/vod-settle");
    await run.check(!!(await page.$('[data-action="vda-ym"][data-dir="1"]')) && /판매분 정산/.test(await L.bodyText(page)), "마스터 강사 정산 화면이 열려요 (달 넘기기)", null, page);
    await L.open(page, base, "/center/master/vod-rates");
    const rule = (await L.text(page, ".vs-rule")) || "";
    await run.check(/RS/.test(rule) && /PG/.test(rule) && /3\.3%/.test(rule) && /2,197,737/.test(rule), "정산 기준 카드: (판매가 − RS − PG) × 비율 · 사업자 그대로 · 개인 ÷1.1 뒤 3.3% (예시 숫자)", rule.slice(0, 300), page);
    await page.context().close();
  }
};
