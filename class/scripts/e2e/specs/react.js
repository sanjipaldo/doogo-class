/* React 화면 (Next.js 전환 4-4 ~ 6단계) — 스위치(proxy.js · shared/screens.js) · 예전 화면과 똑같은 모양 · 오가기 · 버튼
 *  · Next.js 서버(E2E_SERVER=next · 운영 · 미리보기)에서만 — 예전 개발 서버(dev-server.js)에는 React 화면이 없어요
 *  · 옮긴 화면마다: 같은 창 · 같은 회원으로 예전 화면(쿠키 dc_next=off)과 React 화면(dc_next=all)의 #root 구조가 똑같은지 (PC · 휴대폰) */
"use strict";
const F = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 화면 주소 (shared/screens.js 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
const SHAPES = ["/vod/my", "/vod/my/classes", "/vod/my/classes?st=done", "/vod/my/free", "/vod/my/vod", "/vod/my/addons", "/vod/my/ebooks", "/vod/my/live", "/vod/my/alarm", "/vod/my/likes", "/vod/my/likes?t=topics",
  "/vod/my/coupons", "/vod/my/coupons?st=used", "/vod/my/points", "/vod/my/reviews", "/vod/my/posts", "/vod/my/badges", "/vod/my/account", "/vod/my/devices", "/vod/my/help", "/vod/my/help?t=list"];
module.exports = {
  title: "React 화면 · 스위치 · 예전 화면과 같은 모양 · 오가기",
  async run({ base, info, browser, run, L }) {
    if (process.env.E2E_SERVER !== "next" && !process.env.E2E_BASE) { console.log("  (Next.js 서버에서만 — E2E_SERVER=next)"); return; }
    const em = info.vodDemo.email, pw = info.vodDemo.pw;
    // 1) 예전 화면 ↔ React 화면: 같은 창에서 쿠키만 바꿔 같은 주소를 열고 #root 구조 비교 (PC · 휴대폰)
    for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await L.newPage(browser, { viewport: vp });
      run.watch(page, "React 모양 " + vp.width);
      await F.member(page, base, em, pw);
      const bad = [];
      let lines = 0;
      for (const u of SHAPES) {
        const sh = {};
        for (const mode of ["off", "all"]) {
          await L.reactCookie(page, base, mode);
          await L.open(page, base, u);
          sh[mode] = { shape: await L.domShape(page), react: await isReact(page) };
        }
        const d = L.shapeDiff(sh.off.shape, sh.all.shape);
        lines += sh.all.shape.split("\n").length;
        if (sh.off.react || !sh.all.react || d) bad.push({ u, off: sh.off.react, all: sh.all.react, d });
      }
      await run.check(!bad.length, "마이페이지 " + SHAPES.length + "개 화면 " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2), page);
      await page.context().close();
    }
    // 2) 오가기 · 버튼 (React 화면 켬)
    const page = await L.newPage(browser);
    run.watch(page, "React 오가기");
    await F.member(page, base, em, pw);
    await L.reactCookie(page, base, "all");
    await L.open(page, base, "/vod/my");
    await run.check((await isReact(page)) && !!(await page.$(".vd-my-side")) && /체험/.test(await L.text(page, ".vd-my-hi")), "켜면 /vod/my 는 React 화면 (주소 그대로 · 회원 이름 · 왼쪽 메뉴)", { url: page.url() }, page);
    // 내 계정 메뉴 (팝업) → 닫기
    await page.click(".vd-acct");
    await page.waitForSelector("#modal-root .vd-modal-acct", { timeout: 3000 }).catch(() => {});
    const acct = await page.evaluate(() => { const m = document.querySelector("#modal-root .vd-modal-acct"); return m ? { links: m.querySelectorAll(".vd-acct-ls a").length, out: !!m.querySelector("[data-v='logout']") } : null; });
    await page.click("#modal-root .vd-modal-h button").catch(() => {});
    await page.waitForTimeout(200);
    await run.check(acct && acct.links === 6 && acct.out && !(await page.$("#modal-root .vd-modal-bg")), "내 계정 메뉴: 바로가기 6개 · 로그아웃 · X 로 닫혀요", acct, page);
    // 전체 카테고리 펼침 메뉴 (PC)
    await page.click(".vd-allcat");
    await page.waitForTimeout(200);
    const mega = await page.evaluate(() => ({ on: !!document.querySelector("#vd-mega"), cats: document.querySelectorAll("#vd-mega .vd-mg-cat").length, top: document.querySelector(".vd-top").classList.contains("mg-on") }));
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    await run.check(mega.on && mega.cats > 1 && mega.top && !(await page.$("#vd-mega")), "전체 카테고리: 펼치면 분야 목록 · Esc 로 닫혀요", mega, page);
    // React 안에서 메뉴 옮기기: 새로 불러오지 않아요 (내 강의실 → 쿠폰)
    await page.evaluate(() => { window.__e2eStay = 1; });
    await page.click(".vd-my-nav a[href='#/vod/my/classes']"); await page.waitForTimeout(400);
    const stay1 = await page.evaluate(() => ({ stay: window.__e2eStay === 1, path: location.pathname, on: !!document.querySelector(".vd-my-nav a.on[href='#/vod/my/classes']"), h2: (document.querySelector(".vd-my-h2") || {}).textContent }));
    await run.check(stay1.stay && stay1.path === "/vod/my/classes" && stay1.on && stay1.h2 === "내 강의실", "React 안에서 메뉴 옮기기(홈 → 내 강의실): 새로 불러오지 않고 바로", stay1, page);
    // 쿠폰 등록 (예전 처리 함수 그대로) → 쿠폰 목록
    await page.click(".vd-my-nav a[href='#/vod/my/coupons']"); await page.waitForTimeout(300);
    await page.fill("[data-vd-coupon] input[name=code]", "ebook20");
    await page.click("[data-vd-coupon] button[type=submit]");
    await page.waitForTimeout(1500);
    const srvCp = await page.evaluate(() => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { const d = (j.docs || []).find((x) => /^vm:/.test(x[0])); return d ? (d[1].coupons || []).length : -1; }));
    const cp = { toast: await L.toasts(page), react: await isReact(page), n: await page.$$eval(".vd-cp", (x) => x.length), srv: srvCp };
    await run.check(cp.react && /쿠폰을 받았어요|이미 받은 쿠폰/.test(cp.toast) && cp.n >= 1 && cp.srv >= 1, "쿠폰 등록(EBOOK20): 서버(api/vod-pay claim)가 회원에게 주고 목록에 보여요 (React 화면 그대로 · 결제 설정을 받은 뒤 그려요)", cp, page);
    // 회원 정보 저장 → 서버에 남고 다시 열어도 그대로 (이름을 바꿨다가 되돌려요)
    await page.click(".vd-my-nav a[href='#/vod/my/account']"); await page.waitForTimeout(300);
    const name0 = await page.inputValue("[data-vd-acct] input[name=name]");
    await page.fill("[data-vd-acct] input[name=name]", name0 + "R");
    await page.click("[data-vd-acct] button[type=submit]");
    await L.flushed(page); await page.waitForTimeout(500);
    await L.open(page, base, "/vod/my/account");
    const name1 = await page.inputValue("[data-vd-acct] input[name=name]");
    await page.fill("[data-vd-acct] input[name=name]", name0);
    await page.click("[data-vd-acct] button[type=submit]");
    await L.flushed(page);
    await run.check(name1 === name0 + "R" && (await isReact(page)), "회원 정보 수정: 저장하면 서버에 남고 다시 열어도 그대로 (예전 처리 함수 doAcct)", { name0, name1 }, page);
    // 1:1 문의 남기기 → 내 문의 내역
    await page.click(".vd-my-nav a[href='#/vod/my/help']"); await page.waitForTimeout(300);
    await page.fill("[data-vd-iq] input[name=title]", "React 화면 시험 문의");
    const iqText = "React 화면에서 남긴 시험 문의예요.";
    await page.fill("[data-vd-iq] textarea[name=text]", iqText);
    const cnt = await L.text(page, "[data-iq-cnt]");
    await page.click("[data-vd-iq] button[type=submit]");
    await page.waitForTimeout(600); await L.flushed(page);
    const iq = await page.evaluate(() => ({ path: location.pathname + location.search, items: Array.from(document.querySelectorAll(".vd-iq-it b")).map((x) => x.textContent) }));
    await run.check(/t=list/.test(iq.path) && iq.items.indexOf("React 화면 시험 문의") >= 0 && cnt === iqText.length + " / 1000", "1:1 문의: 글자 수가 세지고 · 남기면 내 문의 내역에 보여요", { iq, cnt }, page);
    // React 화면 → 예전 화면 (주문 · 결제 내역은 아직 예전 화면): 새로 불러 예전 화면으로
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".vd-my-nav a[href='#/vod/my/orders']")]);
    await L.ready(page);
    await run.check(!(await isReact(page)) && new URL(page.url()).pathname === "/vod/my/orders" && !!(await page.$(".vd-my-nav a.on[href='#/vod/my/orders']")), "React → 예전 화면(주문 · 결제 내역): 새로 불러 예전 화면으로", { url: page.url() }, page);
    // 예전 화면 → React 화면 (홈)
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".vd-my-nav a.vd-my-home")]);
    await L.ready(page);
    await run.check((await isReact(page)) && new URL(page.url()).pathname === "/vod/my", "예전 화면 → React 화면(마이페이지 홈): 새로 불러 React 화면으로", { url: page.url() }, page);
    // /n/… 를 직접 열면 원래 주소로
    await page.goto(base + "/n/vod/my", { waitUntil: "load" });
    await page.waitForFunction(() => location.pathname === "/vod/my", null, { timeout: 8000 }).catch(() => {});
    await L.ready(page);
    await run.check(new URL(page.url()).pathname === "/vod/my" && (await isReact(page)), "/n/vod/my 를 직접 열면 /vod/my 로", { url: page.url() }, page);
    // 로그아웃 (왼쪽 메뉴) → 스토어 홈 · 서버도 로그아웃
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }).catch(() => {}), page.click(".vd-my-out")]);
    await L.ready(page);
    await page.waitForTimeout(500);
    const me = await F.serverMe(page);
    await run.check(!(me && me.vod) && !/\/vod\/my/.test(page.url()), "로그아웃: 서버 로그인도 풀리고 스토어로", { url: page.url(), me }, page);
    // 끄면(off) 다시 예전 화면
    await F.member(page, base, em, pw);
    await L.reactCookie(page, base, "off");
    await L.open(page, base, "/vod/my");
    await run.check(!(await isReact(page)) && !!(await page.$(".vd-my-side")), "끄면(dc_next=off) /vod/my 는 예전 화면", { url: page.url() }, page);
    await page.context().close();
  }
};
