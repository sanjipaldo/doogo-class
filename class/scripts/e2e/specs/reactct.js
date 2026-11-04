/* 강사센터 · 마스터 React 화면 (Next.js 전환 6단계) — 같은 창 · 같은 계정으로 예전 화면(쿠키 dc_next=off)과 React 화면(all)의 #root 구조가 똑같은지 (PC · 휴대폰)
 *  · 강사 · 코치 · (VOD 영역이 열린 강사면) VOD 대시보드 · 로그인 화면 탭
 *  · 버튼은 예전 admin.js 이벤트가 그대로 받는지: 팝업(수강생 추가 · 과제 열기) · 휴대폰 메뉴 · 로그아웃
 *  · Next.js 서버(E2E_SERVER=next)에서만 */
"use strict";
const FL = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 강사센터 화면 주소 (shared/screens.js 의 ct-* 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
// 마스터 화면 주소
const CTM = ["/center/master", "/center/master/instructors", "/center/master/students", "/center/master/health", "/center/master/notices", "/center/master/site", "/center/master/data"];
const CT = ["/center", "/center/students", "/center/students?status=approved", "/center/students?status=all", "/center/cohorts", "/center/reviews", "/center/questions", "/center/billing",
  "/center/curriculum", "/center/missions", "/center/schedule", "/center/notices", "/center/faq", "/center/guide", "/center/docs", "/center/channels",
  "/center/coaches", "/center/partners", "/center/library", "/center/motivation", "/center/replays", "/center/showcase", "/center/glossary", "/center/notes", "/center/brand",
  "/center/vod-students", "/center/vodlink", "/center/vod", "/center/vod-live", "/center/vod-cal", "/center/vod-settle", "/center/coaching", "/center/teatime", "/center/ops-notices"];
async function shapes(page, base, L, list) {
  const bad = []; let lines = 0;
  for (const u of list) {
    const sh = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(page, base, mode);
      // 운영팀 공지는 열면 읽음이 돼요 — 두 번 다 같은 처음(안 읽음)에서
      if (u === "/center/ops-notices") { await L.open(page, base, "/center"); await page.evaluate(() => { const A = window.ADM, i = A.INS(); if (i) { delete i[A.annSeenKey()]; window.DB.save(); } }); await L.flushed(page); }
      await L.open(page, base, u); await page.waitForTimeout(400); sh[mode] = { shape: await L.domShape(page), react: await isReact(page), path: new URL(page.url()).pathname };
    }
    // 데이터 관리의 백업 글에는 지금 시각이 들어가요
    const N = (x) => x.replace(/&quot;exportedAt&quot;:&quot;[^&]+&quot;|\\"exportedAt\\":\\"[^\\]+\\"|"exportedAt":"[^"]+"/g, "exportedAt");
    const d = L.shapeDiff(N(sh.off.shape), N(sh.all.shape)); lines += sh.all.shape.split("\n").length;
    if (sh.off.react || !sh.all.react || d || sh.off.path !== sh.all.path) bad.push({ u, off: sh.off.react, all: sh.all.react, path: [sh.off.path, sh.all.path], d });
  }
  return { bad, lines };
}
module.exports = {
  title: "강사센터 · 마스터 React 화면 · 예전 화면과 같은 모양",
  async run({ base, info, browser, run, L }) {
    if (process.env.E2E_SERVER !== "next" && !process.env.E2E_BASE) { console.log("  (Next.js 서버에서만 — E2E_SERVER=next)"); return; }
    // 1) 로그인 화면: 탭(강사 · 코치 · 마스터) · 번호 보기 · 틀린 정보
    {
      const page = await L.newPage(browser);
      run.watch(page, "강사센터 로그인");
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 300); out.push(await L.domShape(page)); };
      const flow = async (mode) => {
        await L.fresh(page, base); await L.reactCookie(page, base, mode); await L.open(page, base, "/center/login");
        await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [await L.domShape(page)], react = await isReact(page);
        await step(out, () => page.click('[data-action="login-tab"][data-tab="coach"]'));
        await step(out, () => page.click('[data-action="login-tab"][data-tab="master"]'));
        await step(out, () => page.click('[data-action="toggle-pw"]'));
        await step(out, () => page.click('[data-action="login-tab"][data-tab="instructor"]'));
        await page.fill("#al-id", "없는강사"); await page.fill("#al-pw", "0000");
        await step(out, () => page.press("#al-pw", "Enter"), 900);
        return { out, react, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
      await run.check(!d.length && a.out.length === b.out.length && !a.react && b.react && b.stay, "강사센터 로그인(React): 탭 · 번호 보기 · 틀린 정보 — 누를 때마다 예전 화면과 같은 모양 (" + b.out.length + "번)", d.slice(0, 1).concat([{ react: [a.react, b.react], stay: b.stay }]), page);
      await page.context().close();
    }
    // 2) 강사 · 코치: 대시보드 모양 (PC · 휴대폰) + VOD 영역
    for (const who of ["instructor", "coach"]) {
      for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const page = await L.newPage(browser, { viewport: vp });
        run.watch(page, "강사센터 모양 " + who + " " + vp.width);
        await FL[who](page, base, info);
        const list = CT.slice();
        const { bad, lines } = await shapes(page, base, L, list);
        // VOD 영역(DOOGO CLASS 탭)이 열려 있으면 그 탭으로 바꿔서 한 번 더
        let vod = null;
        await L.reactCookie(page, base, "off"); await L.open(page, base, "/center");
        if (await page.$('[data-action="trk"][data-k="vod"]')) {
          await page.$eval('[data-action="trk"][data-k="vod"]', (el) => el.click()); await page.waitForTimeout(600);
          vod = await shapes(page, base, L, list);
          await L.reactCookie(page, base, "off"); await L.open(page, base, "/center");
          if (await page.$('[data-action="trk"][data-k="live"]')) { await page.$eval('[data-action="trk"][data-k="live"]', (el) => el.click()); await page.waitForTimeout(400); }
        }
        const allBad = bad.concat(vod ? vod.bad : []);
        await run.check(!allBad.length, (who === "coach" ? "코치" : "강사") + "센터 " + list.length + "개 화면" + (vod ? " + VOD 탭" : "") + " " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + (lines + (vod ? vod.lines : 0)) + "줄이 똑같아요", allBad.slice(0, 2), page);
        await page.context().close();
      }
    }
    // 2-2) 강사 운영 화면 누르기: 수강생 탭 · 기수 · 검색 · 체크 · 모두 선택 · 과제 검수 탭 · 주차 · 체크 · 1:1 요청 탭 · 기수 일정 팝업 (데이터는 바꾸지 않아요)
    {
      const page = await L.newPage(browser);
      run.watch(page, "강사센터 운영 화면 누르기");
      await FL.instructor(page, base, info);
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 350); out.push(await L.domShape(page)); };
      const go = async (h) => { await page.evaluate((x) => { window.ROUTE.hash = x; }, h); await page.waitForTimeout(500); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/center/students");
        await page.evaluate(() => { window.__e2eStay = 1; const u = window.ADM.ui; u.stuStatus = "pending"; u.stuCohort = "all"; u.stuQuery = ""; u.picked.clear(); u.revFilter = "pending"; u.revWeek = "all"; u.revPicked.clear(); u.qFilter = "open"; window.AdminApp.render(); });
        await page.waitForTimeout(400);
        const out = [await L.domShape(page)], modal = [];
        for (const k of ["approved", "rejected", "withdrawn", "all", "pending"]) await step(out, () => page.click('[data-action="stu-tab"][data-k="' + k + '"]'));
        const co = await page.$$eval("#stu-cohort option", (os) => os.map((o) => o.value)); if (co[1]) { await step(out, () => page.selectOption("#stu-cohort", co[1])); await step(out, () => page.selectOption("#stu-cohort", "all")); }
        await step(out, () => page.fill("#stu-q", "zz없음"), 700);
        await step(out, () => page.fill("#stu-q", ""), 700);
        if (await page.$(".stu-pick")) { await step(out, () => page.click(".stu-pick")); await step(out, () => page.click("#stu-all")); await step(out, () => page.click("#stu-all")); }
        if (await page.$('[data-action="student-open"]')) { await page.click('[data-action="student-open"]'); await page.waitForTimeout(300); modal.push(await L.domShape(page, "modal-root")); await page.click('#modal-root [data-action="modal-close"]'); await page.waitForTimeout(200); }
        await go("#/center/reviews"); out.push(await L.domShape(page));
        for (const k of ["fix", "approved", "all", "pending"]) await step(out, () => page.click('[data-action="rev-tab"][data-k="' + k + '"]'));
        const wk = await page.$$eval("#rev-week option", (os) => os.map((o) => o.value)); if (wk[1]) { await step(out, () => page.selectOption("#rev-week", wk[1])); await step(out, () => page.selectOption("#rev-week", "all")); }
        if (await page.$(".rev-pick")) { await step(out, () => page.click(".rev-pick")); await step(out, () => page.click("#rev-all")); await step(out, () => page.click("#rev-all")); }
        await go("#/center/questions"); out.push(await L.domShape(page));
        for (const k of ["done", "all", "open"]) await step(out, () => page.click('[data-action="q-tab"][data-k="' + k + '"]'));
        await go("#/center/cohorts"); out.push(await L.domShape(page));
        if (await page.$('[data-action="cohort-edit"]')) { await page.click('[data-action="cohort-edit"]'); await page.waitForTimeout(400); modal.push(await L.domShape(page, "modal-root")); await page.click('#modal-root .a-modal-head [data-action="modal-close"]'); await page.waitForTimeout(200); }
        return { out, modal, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean), md = a.modal.map((x, i) => L.shapeDiff(x, b.modal[i])).filter(Boolean);
      await run.check(!d.length && !md.length && a.out.length === b.out.length && b.out.length >= 15 && b.stay, "강사센터 운영 화면(React): 수강생 탭 · 기수 · 검색 · 체크 · 과제 검수 탭 · 주차 · 1:1 요청 탭 · 팝업 — 누를 때마다 예전 화면과 같은 모양 (" + b.out.length + "번)", d.slice(0, 1).concat(md.slice(0, 1), [{ n: [a.out.length, b.out.length], m: [a.modal.length, b.modal.length] }]), page);
      await page.context().close();
    }
    // 2-3) 마스터: 화면 모양 (PC · 휴대폰) + 강사 · 상태 고르기 · 강사 수정 팝업
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await L.newPage(browser, { viewport: vp });
      run.watch(page, "마스터 모양 " + vp.width);
      await FL.master(page, base, info);
      const { bad, lines } = await shapes(page, base, L, CTM);
      let d = [], m = null;
      if (vp.width === 1280) {
        const out = {};
        for (const mode of ["off", "all"]) {
          await L.reactCookie(page, base, mode); await L.open(page, base, "/center/master/students");
          const o = [];
          const iv = await page.$$eval("#m-ins option", (os) => os.map((x) => x.value));
          if (iv[1]) { await page.selectOption("#m-ins", iv[1]); await page.waitForTimeout(350); o.push(await L.domShape(page)); }
          await page.selectOption("#m-status", "pending"); await page.waitForTimeout(350); o.push(await L.domShape(page));
          await page.selectOption("#m-ins", "all"); await page.selectOption("#m-status", "all"); await page.waitForTimeout(350); o.push(await L.domShape(page));
          await L.open(page, base, "/center/master/instructors");
          await page.click('[data-action="ins-edit"]'); await page.waitForTimeout(350); o.push("M " + (await L.domShape(page, "modal-root")));
          await page.click('#modal-root .a-modal-head [data-action="modal-close"]'); await page.waitForTimeout(200);
          out[mode] = o;
        }
        d = out.off.map((x, i) => L.shapeDiff(x, out.all[i])).filter(Boolean); m = [out.off.length, out.all.length];
      }
      await run.check(!bad.length && !d.length, "마스터 " + CTM.length + "개 화면 " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요" + (m ? " · 강사 · 상태 고르기 · 수정 팝업도" : ""), bad.slice(0, 2).concat(d.slice(0, 1), [{ m }]), page);
      await page.context().close();
    }
    // 3) 버튼은 예전 이벤트가 그대로: 수강생 추가 팝업 · 과제 열기 팝업 · 휴대폰 메뉴 · 로그아웃
    {
      const page = await L.newPage(browser, { viewport: { width: 390, height: 844 } });
      run.watch(page, "강사센터 누르기");
      await FL.instructor(page, base, info);
      const r = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/center");
        const o = { react: await isReact(page) };
        await page.click('[data-action="student-add"]'); await page.waitForTimeout(300);
        o.add = await L.domShape(page, "modal-root");
        await page.click('#modal-root [data-action="modal-close"]'); await page.waitForTimeout(200);
        o.closed = await page.evaluate(() => document.getElementById("modal-root").innerHTML.trim());
        if (await page.$('[data-action="review-open"]')) { await page.click('[data-action="review-open"]'); await page.waitForTimeout(400); o.review = await L.domShape(page, "modal-root"); await page.click('#modal-root [data-action="modal-close"]'); await page.waitForTimeout(200); }
        await page.click('.bw-tabbar [data-action="toggle-nav"]'); await page.waitForTimeout(250);
        o.navOpen = await page.evaluate(() => document.getElementById("a-app").classList.contains("nav-open"));
        await page.$eval(".a-scrim", (el) => el.click()); await page.waitForTimeout(250);
        o.navClosed = await page.evaluate(() => !document.getElementById("a-app").classList.contains("nav-open"));
        r[mode] = o;
      }
      const d1 = L.shapeDiff(r.off.add, r.all.add), d2 = r.off.review && r.all.review ? L.shapeDiff(r.off.review, r.all.review) : null;
      await run.check(!d1 && !d2 && r.all.react && !r.all.closed && r.all.navOpen && r.all.navClosed && r.off.navOpen && r.off.navClosed, "강사센터(React): 수강생 추가 · 과제 열기 팝업 · 휴대폰 메뉴 — 예전 처리가 그대로 (예전 화면과 같은 팝업 모양)", [d1, d2, { off: r.off, all: Object.assign({}, r.all, { add: undefined, review: undefined }) }], page);
      // 로그아웃 → 로그인 화면(React)
      await L.reactCookie(page, base, "all"); await L.open(page, base, "/center");
      await page.click('[data-action="logout"]');
      await page.waitForFunction(() => location.pathname === "/center/login", null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(400);
      const out = { path: new URL(page.url()).pathname, react: await isReact(page), form: !!(await page.$("#a-login-form")) };
      await run.check(out.path === "/center/login" && out.react && out.form, "강사센터(React) 로그아웃 → 로그인 화면(React)", out, page);
      await page.context().close();
    }
  }
};
