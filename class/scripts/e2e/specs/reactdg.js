/* 두잉고 강의실 React 화면 (Next.js 전환 5단계) — 같은 창 · 같은 수강생으로 예전 화면(쿠키 dc_next=off)과 React 화면(all)의 #root 구조가 똑같은지 (PC · 휴대폰)
 *  · 기수(LIVE) 수강생: 이름 + 뒷자리 로그인 · VOD 수강생: DOOGO CLASS 회원 → 산 VOD 의 두잉고 강의실
 *  · Next.js 서버(E2E_SERVER=next)에서만 */
"use strict";
const FL = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 강의실 화면 주소 (shared/screens.js 의 dg-* 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
const DG = ["/home", "/curriculum", "/missions", "/missions?kind=required", "/missions?kind=challenge", "/missions?kind=mind", "/missions/1", "/missions/2", "/missions/9", "/curriculum/nope"];
// 강의 한 편은 데이터에서 골라요 (열린 주차 첫 강의 · 잠긴 주차 강의)
async function shapes(page, base, L, list) {
  const bad = []; let lines = 0;
  for (const u of list) {
    const sh = {};
    for (const mode of ["off", "all"]) { await L.reactCookie(page, base, mode); await L.open(page, base, u); await page.waitForTimeout(300); sh[mode] = { shape: await L.domShape(page), react: await isReact(page), path: new URL(page.url()).pathname }; }
    const d = L.shapeDiff(sh.off.shape, sh.all.shape); lines += sh.all.shape.split("\n").length;
    if (sh.off.react || !sh.all.react || d || sh.off.path !== sh.all.path) bad.push({ u, off: sh.off.react, all: sh.all.react, path: [sh.off.path, sh.all.path], d });
  }
  return { bad, lines };
}
module.exports = {
  title: "두잉고 강의실 React 화면 · 예전 화면과 같은 모양",
  async run({ base, info, browser, run, L }) {
    if (process.env.E2E_SERVER !== "next" && !process.env.E2E_BASE) { console.log("  (Next.js 서버에서만 — E2E_SERVER=next)"); return; }
    // 1) 기수(LIVE) 수강생
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await L.newPage(browser, { viewport: vp });
      run.watch(page, "강의실 모양 " + vp.width);
      await FL.student(page, base, info);
      const extra = await page.evaluate(() => { const X = window.DGA, S = X && X.st(); if (!S || !S.D) return []; const ws = S.D.weeks, o = ws.find((w) => X.isOpen(w) && w.lessons.length), c = ws.find((w) => !X.isOpen(w) && w.lessons.length); return [o && "/curriculum/" + o.lessons[0].id, o && o.lessons[1] && "/curriculum/" + o.lessons[1].id, c && "/curriculum/" + c.lessons[0].id].filter(Boolean); });
      const list = DG.concat(extra);
      const { bad, lines } = await shapes(page, base, L, list);
      await run.check(!bad.length, "기수 수강생 강의실 " + list.length + "개 화면 " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2), page);
      await page.context().close();
    }
    // 1-2) 누를 때마다 같은 모양 (기수 수강생 · PC): 시작 가이드 체크 · 다시 체크 · AI 조교 열기 · 질문 칩 · 닫기 · 휴대폰 메뉴는 아래(390px)
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 누르기");
      await FL.student(page, base, info);
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 300); out.push(await L.domShape(page)); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home"); await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [];
        if (await page.$(".start-guide .g-check")) { await step(out, () => page.click(".start-guide .g-check")); await step(out, () => page.click(".start-guide .g-check")); }
        if (await page.$(".bot-launch")) {
          await step(out, () => page.click(".bot-launch"), 400);
          if (await page.$(".bot-panel .chip")) await step(out, () => page.click(".bot-panel .chip"), 2500);
          await step(out, () => page.click(".bot-panel [data-action='clear-chat']"), 400);
          await step(out, () => page.click(".bot-panel [data-action='bot-close']"), 400);
        }
        // 주차 과제: 유형 · 진행 상태 탭 (다시 전체로)
        await page.evaluate(() => { window.ROUTE.hash = "#/missions/1"; }); await page.waitForTimeout(500);
        for (const sel of ["[data-grp='kind'][data-k='required']", "[data-grp='state'][data-k='todo']", "[data-grp='state'][data-k='done']", "[data-grp='kind'][data-k='all']", "[data-grp='state'][data-k='all']"]) if (await page.$(sel)) await step(out, () => page.click(sel));
        // 강의 한 편: 시청 완료 표시 → 취소 · 메모 적기 → 지우기 (끝나면 처음 그대로)
        const lid = await page.evaluate(() => { const X = window.DGA, w = X.st().D.weeks.find((x) => X.isOpen(x) && x.lessons.length); return w ? w.lessons[0].id : ""; });
        if (lid) {
          await page.evaluate((id) => { window.ROUTE.hash = "#/curriculum/" + id; }, lid); await page.waitForTimeout(500);
          await step(out, () => page.click("[data-action='toggle-watched']"), 400);
          await step(out, () => page.click("[data-action='toggle-watched']"), 400);
          await step(out, () => page.fill("#lesson-note", "E2E 메모"), 900);
          await step(out, () => page.fill("#lesson-note", ""), 900);
        }
        return { out, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
      await run.check(!d.length && a.out.length === b.out.length && b.out.length >= 3 && b.stay, "강의실(React): 시작 가이드 · AI 조교 열기 · 질문 · 대화 지우기 · 닫기 · 주차 과제 탭 · 시청 완료 · 메모 — 누를 때마다 예전 화면과 같은 모양 (" + b.out.length + "번)", d.slice(0, 1), page);
      await page.context().close();
    }
    {
      const page = await L.newPage(browser, { viewport: { width: 390, height: 844 } });
      run.watch(page, "강의실 휴대폰 메뉴");
      await FL.student(page, base, info);
      const r = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
        await page.click(".bw-tabbar [data-action='toggle-nav']"); await page.waitForTimeout(300);
        const open = await page.evaluate(() => document.getElementById("app").classList.contains("nav-open"));
        await page.$eval(".scrim", (el) => el.click()); await page.waitForTimeout(300);
        r[mode] = { open, closed: await page.evaluate(() => !document.getElementById("app").classList.contains("nav-open")) };
      }
      await run.check(r.off.open && r.off.closed && r.all.open && r.all.closed, "강의실 휴대폰 메뉴: 아래 ‘전체’로 열고 · 어두운 바깥을 누르면 닫혀요 (예전 · React 같음)", r, page);
      await page.context().close();
    }
    // 2) VOD 수강생 (DOOGO CLASS 회원 → 산 VOD 의 두잉고 강의실)
    {
      const page = await L.newPage(browser);
      run.watch(page, "VOD 강의실 모양");
      await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
      await L.reactCookie(page, base, "off"); await L.open(page, base, "/vod/my");
      const pid = await page.evaluate(() => { const X = window.VOD, m = X.me(); const p = m && X.products().find((x) => X.dgOpen(x) && X.owns(m.id, x.id)); return p ? p.id : ""; });
      if (pid) {
        await page.evaluate((id) => window.VOD.enterDg(id, "", "#/home"), pid);
        await page.waitForFunction(() => location.pathname === "/home", null, { timeout: 10000 }).catch(() => {});
        await L.ready(page); await page.waitForTimeout(500);
        const { bad, lines } = await shapes(page, base, L, DG);
        await run.check(!bad.length, "VOD 수강생 강의실 " + DG.length + "개 화면: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2).concat([{ pid }]), page);
        // 블랙 / 화이트 화면 바꾸기 (두 번 눌러 원래대로)
        const vm = {};
        for (const mode of ["off", "all"]) {
          await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
          await page.click(".vmode"); await page.waitForTimeout(300);
          const one = { dark: await page.evaluate(() => (localStorage.getItem("doinggo:vod-mode") || "")), txt: await L.text(page, ".vmode .vmode-t"), toast: await L.toasts(page) };
          await page.click(".vmode"); await page.waitForTimeout(300);
          vm[mode] = { one, back: await L.text(page, ".vmode .vmode-t") };
        }
        await run.check(vm.off.one.dark === "dark" && vm.all.one.dark === "dark" && vm.off.one.txt === vm.all.one.txt && vm.off.back === vm.all.back && /블랙 화면으로/.test(vm.all.one.toast), "VOD 강의실: 블랙 / 화이트 바꾸기 (예전 · React 같음 · 이 브라우저에 기억)", vm, page);
      } else await run.check(false, "VOD 수강생: 두잉고 강의실이 열린 VOD 를 산 회원이 있어야 해요", { pid }, page);
      await page.context().close();
    }
    // 3) 로그인 전 · 로그아웃: React 강의실 주소로 오면 (예전처럼) 로그인 화면으로
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 로그인 전");
      await L.fresh(page, base); await L.reactCookie(page, base, "all");
      await L.open(page, base, "/home");
      await page.waitForFunction(() => location.pathname === "/login", null, { timeout: 10000 }).catch(() => {});
      await L.ready(page);
      const s = { path: new URL(page.url()).pathname, react: await isReact(page), form: !!(await page.$("#lg-name, [data-action='svc-tab'], .dc-ins")) };
      await run.check(s.path === "/login" && s.form, "로그인 전에 /home(React) → 로그인 화면으로", s, page);
      await page.context().close();
    }
  }
};
