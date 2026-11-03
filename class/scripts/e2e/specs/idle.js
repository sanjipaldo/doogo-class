/* 자동 로그아웃 — 브라우저 시계를 앞으로 돌려서 확인해요 (화면 안의 저장 칸은 건드리지 않아요)
 *  강사센터: 30분 동안 아무 동작이 없으면 로그아웃 · 29분이면 그대로 · 강사센터 밖 탭은 새로 고치지 않고 강사센터를 열 때 로그아웃
 *  수강생 · DOOGO CLASS 회원: 화면을 보고 있으면 그대로 · 창을 닫고 60분이 지나면 다음에 열 때 로그아웃 */
"use strict";
const FL = require("./_flows");
const MIN = 60e3;

module.exports = {
  title: "자동 로그아웃 (강사센터 30분 · 수강생 · 회원 60분)",
  async run({ base, info, browser, run, L }) {
    const fresh = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript(() => { try { localStorage.setItem("dc:clean", "1"); } catch (e) { /* #주소로 */ } });
      await ctx.clock.install({ time: new Date() });
      const page = await ctx.newPage();
      run.watch(page, "자동 로그아웃");
      return { ctx, page };
    };
    const roleOf = (m) => (m && m.admin && m.admin.role) || "";
    const idleToast = async (page) => /오래 사용하지 않아/.test(await L.toasts(page));
    // 1) 강사센터 30분 무동작 → 켜 둔 화면에서도 로그아웃
    let { ctx, page } = await fresh();
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master");
    await run.check(roleOf(await FL.serverMe(page)) === "master", "마스터 로그인", null, page);
    await ctx.clock.fastForward(31 * MIN);
    await page.waitForTimeout(2500); await L.ready(page);
    await run.check(!roleOf(await FL.serverMe(page)) && (await page.$("#al-id")) && (await idleToast(page)), "강사센터 31분 무동작 → 로그아웃 + 안내 (서버 쿠키도)", await L.toasts(page), page);
    await ctx.close();
    // 2) 29분이면 그대로
    ({ ctx, page } = await fresh());
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master");
    await ctx.clock.fastForward(29 * MIN);
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "load" }); await L.ready(page);
    await run.check(roleOf(await FL.serverMe(page)) === "master" && !(await page.$("#al-id")), "강사센터 29분 → 그대로", null, page);
    // 3) 강사센터 밖(스토어) 탭은 새로 고치지 않아요 → 강사센터를 열면 로그아웃
    await L.open(page, base, "/");
    await page.evaluate(() => { window.__e2eMark = 1; });
    await ctx.clock.fastForward(40 * MIN);
    await page.waitForTimeout(1500);
    await run.check(await page.evaluate(() => window.__e2eMark === 1 && location.pathname === "/"), "강사센터 밖 탭(스토어)은 그대로 — 영상 시청이 끊기지 않게", null, page);
    await L.open(page, base, "/center/master");
    await page.waitForTimeout(1500); await L.ready(page);
    await run.check(!roleOf(await FL.serverMe(page)) && !!(await page.$("#al-id")), "그 뒤 강사센터를 열면 로그아웃", null, page);
    await ctx.close();
    // 4) 두잉고 수강생: 화면을 켜 두면(영상 시청) 2시간 지나도 그대로 · 창을 닫고 61분 뒤 다시 열면 로그아웃
    ({ ctx, page } = await fresh());
    await FL.student(page, base, info);
    await run.check(!!((await FL.serverMe(page)) || {}).student, "수강생 로그인", null, page);
    await ctx.clock.fastForward(120 * MIN);
    await page.waitForTimeout(1500);
    await run.check(!!((await FL.serverMe(page)) || {}).student && !(await page.$("#login-form")), "수강생: 화면을 보고 있으면 2시간 지나도 그대로", null, page);
    await page.goto("about:blank"); // 창 닫기
    await ctx.clock.fastForward(61 * MIN);
    await L.open(page, base, "/home");
    await page.waitForTimeout(1200);
    await run.check(!((await FL.serverMe(page)) || {}).student && !!(await page.$("#login-form")) && (await idleToast(page)), "수강생: 창을 닫고 61분 뒤 → 로그아웃 + 안내", await L.toasts(page), page);
    await ctx.close();
    // 5) 59분 뒤면 그대로
    ({ ctx, page } = await fresh());
    await FL.student(page, base, info);
    await page.goto("about:blank");
    await ctx.clock.fastForward(59 * MIN);
    await L.open(page, base, "/home");
    await run.check(!!((await FL.serverMe(page)) || {}).student && !(await page.$("#login-form")), "수강생: 59분 뒤면 그대로", null, page);
    await ctx.close();
    // 6) DOOGO CLASS 회원: 창을 닫고 61분 뒤 → 로그아웃
    ({ ctx, page } = await fresh());
    await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
    await run.check(!!((await FL.serverMe(page)) || {}).vod, "회원 로그인", null, page);
    await page.goto("about:blank");
    await ctx.clock.fastForward(61 * MIN);
    await L.open(page, base, "/vod/my");
    await page.waitForTimeout(1200);
    await run.check(!((await FL.serverMe(page)) || {}).vod && (await idleToast(page)), "회원: 창을 닫고 61분 뒤 → 로그아웃 + 안내", await L.toasts(page), page);
    await ctx.close();
    // 7) 방문자(로그인 없음)는 아무 일 없음
    ({ ctx, page } = await fresh());
    await L.open(page, base, "/");
    await page.goto("about:blank");
    await ctx.clock.fastForward(300 * MIN);
    await L.open(page, base, "/");
    await run.check(!(await idleToast(page)), "방문자는 안내 없음", await L.toasts(page), page);
    await ctx.close();
  }
};
