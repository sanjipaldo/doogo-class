/* 자동 로그아웃 — 브라우저 시계를 앞으로 돌려서 확인해요 (화면 안의 저장 칸은 건드리지 않아요)
 *  강사센터: 60분 동안 아무 동작이 없으면 로그아웃(2026-11-09: 30분 → 60분) · 59분이면 그대로 · 강사센터 밖 탭은 새로 고치지 않고 강사센터를 열 때 로그아웃
 *   · 편집 창에 적던 내용이 있으면 2시간이 지나도 로그아웃하지 않고 그대로 (창을 닫으면 그때부터 60분)
 *  수강생 · DOOGO CLASS 회원: 화면을 보고 있으면 그대로 · 창을 닫고 60분이 지나면 다음에 열 때 로그아웃
 *   · 강의 영상을 틀어 둔 채 창을 내려 두면(소리로 듣기) 2시간이 지나도 그대로 — 영상 없이 내려 두면 로그아웃 */
"use strict";
const FL = require("./_flows");
const MIN = 60e3;

module.exports = {
  title: "자동 로그아웃 (강사센터 60분 · 수강생 · 회원 60분 · 편집 중 · 영상 시청 중은 그대로)",
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
    // 1) 강사센터 60분 무동작 → 켜 둔 화면에서도 로그아웃
    let { ctx, page } = await fresh();
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master");
    await run.check(roleOf(await FL.serverMe(page)) === "master", "마스터 로그인", null, page);
    await ctx.clock.fastForward(61 * MIN);
    await page.waitForTimeout(2500); await L.ready(page);
    await run.check(!roleOf(await FL.serverMe(page)) && (await page.$("#al-id")) && (await idleToast(page)), "강사센터 61분 무동작 → 로그아웃 + 안내 (서버 쿠키도)", await L.toasts(page), page);
    await ctx.close();
    // 2) 59분이면 그대로 (예전 30분이 지나도)
    ({ ctx, page } = await fresh());
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master");
    await ctx.clock.fastForward(59 * MIN);
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "load" }); await L.ready(page);
    await run.check(roleOf(await FL.serverMe(page)) === "master" && !(await page.$("#al-id")), "강사센터 59분 → 그대로", null, page);
    // 3) 강사센터 밖(스토어) 탭은 새로 고치지 않아요 → 강사센터를 열면 로그아웃
    await L.open(page, base, "/");
    await page.evaluate(() => { window.__e2eMark = 1; });
    await ctx.clock.fastForward(70 * MIN);
    await page.waitForTimeout(1500);
    await run.check(await page.evaluate(() => window.__e2eMark === 1 && location.pathname === "/"), "강사센터 밖 탭(스토어)은 그대로 — 영상 시청이 끊기지 않게", null, page);
    await L.open(page, base, "/center/master");
    await page.waitForTimeout(1500); await L.ready(page);
    await run.check(!roleOf(await FL.serverMe(page)) && !!(await page.$("#al-id")), "그 뒤 강사센터를 열면 로그아웃", null, page);
    await ctx.close();
    // 3-2) 강사센터 편집 창에 적던 내용이 있으면 2시간이 지나도 로그아웃하지 않고 그대로 → 창을 닫으면 그때부터 60분 뒤 로그아웃 (2026-11-09)
    ({ ctx, page } = await fresh());
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/curriculum"); await page.waitForTimeout(600);
    await page.click('[data-action="item-edit"][data-coll="lesson"]'); await page.waitForSelector('#coll-form textarea[name="desc"]', { timeout: 5000 });
    const TYPED = "자동 로그아웃 시험 — 적던 내용이 그대로 남아 있어야 해요";
    await page.fill('#coll-form textarea[name="desc"]', TYPED);
    await ctx.clock.fastForward(120 * MIN);
    await page.waitForTimeout(2000);
    const kept = await page.evaluate(() => { const t = document.querySelector('#coll-form textarea[name="desc"]'); return t ? t.value : null; });
    await run.check(!!roleOf(await FL.serverMe(page)) && kept === TYPED && !(await page.$("#al-id")), "강사센터: 편집 창에 적던 내용이 있으면 2시간이 지나도 로그아웃하지 않고 내용 그대로", { kept: kept && kept.slice(0, 20) }, page);
    await page.click('[data-action="modal-close"]'); await page.waitForTimeout(400);
    await ctx.clock.fastForward(61 * MIN);
    await page.waitForTimeout(2500); await L.ready(page);
    await run.check(!roleOf(await FL.serverMe(page)) && !!(await page.$("#al-id")), "강사센터: 편집 창을 닫고 60분 넘게 동작이 없으면 그때 로그아웃", null, page);
    await ctx.close();
    // 3-3) 수강생: 강의 영상을 틀어 둔 채 창을 내려 두면(소리로 듣기) 2시간이 지나도 그대로 · 영상 없이 내려 두면 61분 뒤 로그아웃 (2026-11-09)
    //      (창 내리기는 화면의 visibilityState 만 ‘hidden’ 으로 — 유튜브는 시험 환경에서 막혀 있어 빈 재생기)
    const setVis = (pg, v) => pg.evaluate((v) => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v }); Object.defineProperty(document, "hidden", { configurable: true, get: () => v === "hidden" }); document.dispatchEvent(new Event("visibilitychange")); }, v);
    const away = async (play) => {
      const o = await fresh();
      await o.page.route(/youtube-nocookie\.com\/embed\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><body style='margin:0;background:#000'></body>" }));
      await FL.student(o.page, base, info);
      await L.open(o.page, base, "/motivation"); await o.page.waitForTimeout(500);
      if (play) { await o.page.click(".mv-stage .video-ph"); await o.page.waitForTimeout(500); }
      const frame = !!(await o.page.$(".mv-stage .video iframe"));
      await setVis(o.page, "hidden");
      await o.ctx.clock.fastForward((play ? 120 : 61) * MIN);
      await o.page.waitForTimeout(800);
      await setVis(o.page, "visible");
      await o.page.waitForTimeout(2500); await L.ready(o.page);
      const r = { frame, student: !!((await FL.serverMe(o.page)) || {}).student, login: !!(await o.page.$("#login-form")) };
      await o.ctx.close();
      return r;
    };
    const w1 = await away(true), w0 = await away(false);
    await run.check(w1.frame && w1.student && !w1.login, "수강생: 강의 영상을 틀어 둔 채 창을 내려 두면 2시간이 지나도 그대로", w1);
    await run.check(!w0.frame && !w0.student && w0.login, "수강생: 영상 없이 창을 내려 두면 61분 뒤 로그아웃 (위 확인이 의미 있게)", w0);
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
