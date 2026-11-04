/* React 화면 (Next.js 전환 4-4 ~ 6단계) — 스위치(proxy.js · shared/screens.js) · 예전 화면과 똑같은 모양 · 오가기 · 버튼
 *  · Next.js 서버(E2E_SERVER=next · 운영 · 미리보기)에서만 — 예전 개발 서버(dev-server.js)에는 React 화면이 없어요
 *  · 옮긴 화면마다: 같은 창 · 같은 회원으로 예전 화면(쿠키 dc_next=off)과 React 화면(dc_next=all)의 #root 구조가 똑같은지 (PC · 휴대폰) */
"use strict";
const F = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 화면 주소 (shared/screens.js 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
const SHAPES = ["/vod/my", "/vod/my/classes", "/vod/my/classes?st=done", "/vod/my/free", "/vod/my/vod", "/vod/my/addons", "/vod/my/ebooks", "/vod/my/live", "/vod/my/alarm", "/vod/my/likes", "/vod/my/likes?t=topics",
  "/vod/my/pending", "/vod/my/orders", "/vod/my/orders?t=refund", "/vod/my/ship", "/vod/my/ship?st=claim", "/vod/my/coupons", "/vod/my/coupons?st=used", "/vod/my/points", "/vod/my/reviews", "/vod/my/posts", "/vod/my/badges", "/vod/my/account", "/vod/my/devices", "/vod/my/help", "/vod/my/help?t=list"];
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
    // 주문 만들기 (API — 결제 화면은 4-4 다음 차례): 무통장 주문 2건 · 하나는 회원이 React 화면에서 취소, 하나는 마스터가 입금 확인
    const mkOrder = (i) => page.evaluate((k) => { const X = window.VOD, mm = X.me(), ps = X.listed().filter((x) => (X.typeOf(x) === "vod" || X.typeOf(x) === "ebook") && x.status === "on" && X.priceOf(x) > 0 && !X.owns(mm.id, x.id)), p = ps[k]; if (!p) return { none: true };
      const pl = X.defPlan ? X.defPlan(p) : null;
      return fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", pid: p.id, kind: "course", plan: pl && pl.d, method: "bank", depositor: "체험회원" }) }).then((r) => r.json()).then((j) => ({ ok: !!j.ok, no: j.no, msg: j.message })); }, i);
    // (시험 DB 에서 체험 회원이 아직 안 산 유료 클래스가 하나라서, 먼저 주문 → 취소한 뒤 같은 클래스를 다시 주문해 입금 확인해요)
    const o1 = await mkOrder(0);
    // 결제 대기: React 화면에서 주문 취소 (예전 처리 함수 ordCancelDo → api/vod-pay cancelPending)
    await L.open(page, base, "/vod/my/pending");
    const pend0 = await page.$("[data-v='ord-cancel'][data-no='" + o1.no + "']");
    if (pend0) await pend0.click();
    await page.waitForTimeout(1200);
    const pend = { had: !!pend0, toast: await L.toasts(page), still: !!(await page.$("[data-v='ord-cancel'][data-no='" + o1.no + "']")), react: await isReact(page) };
    await run.check(o1.ok && pend.had && !pend.still && /주문을 취소했어요/.test(pend.toast) && pend.react, "무통장 주문 → 결제 대기 → 주문 취소: 서버에서 취소되고 목록에서 빠져요 (React 화면 그대로)", Object.assign({ o1 }, pend), page);
    const o2 = await mkOrder(0);
    const adm = await L.newPage(browser);
    await F.master(adm, base, info);
    const ok2 = await adm.evaluate((no) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bankOk", no }) }).then((r) => r.json()).then((j) => !!j.ok), o2.no);
    await adm.context().close();
    await run.check(o2.ok && ok2, "다시 무통장 주문 → 마스터가 입금 확인 (결제 완료)", { o2, ok2 }, page);
    await L.open(page, base, "/vod/my");
    // 주문 · 결제 내역: 영수증 · 환불 규정 팝업 · 환불 요청 보내기 → 요청 취소 (예전 처리 함수 doRfReq · rfUndoDo)
    await page.click(".vd-my-nav a[href='#/vod/my/orders']"); await page.waitForTimeout(300);
    const rc = await page.$("[data-v='receipt']");
    let rcOk = null;
    if (rc) { await rc.click(); await page.waitForTimeout(300); rcOk = await page.evaluate(() => !!document.querySelector("#modal-root .vd-modal-rcpt #rc-doc")); await page.click("#modal-root .vd-modal-h button"); await page.waitForTimeout(200); }
    await page.click("[data-v='refund']"); await page.waitForTimeout(300);
    const rules = await page.evaluate(() => !!document.querySelector("#modal-root .vd-modal .vd-rf-all"));
    await page.click("#modal-root .vd-modal-h button"); await page.waitForTimeout(200);
    await run.check(!!rc && rcOk && rules && !(await page.$("#modal-root .vd-modal-bg")), "주문 · 결제 내역: 영수증 · 환불 규정 팝업이 열리고 X 로 닫혀요", { rc: !!rc, rcOk, rules }, page);
    const rq = await page.$("[data-v='rf-req'][data-no='" + o2.no + "']");
    if (rq) {
      const no = o2.no;
      await rq.click(); await page.waitForSelector("#modal-root form[data-vd-rfreq]", { timeout: 3000 }).catch(() => {});
      await page.fill("#modal-root form[data-vd-rfreq] textarea[name=text]", "React 화면 시험 환불 요청");
      // 무통장 결제는 돌려받을 계좌가 있어야 해요 (빠뜨리면 팝업 안에 안내가 떠요)
      const errNoAcct = await page.evaluate(() => { const f = document.querySelector("#modal-root form[data-vd-rfreq]"); f.requestSubmit(); return new Promise((r) => setTimeout(() => r((f.querySelector("[data-rfq-err]") || {}).textContent || ""), 200)); });
      await page.selectOption("#modal-root form[data-vd-rfreq] select[name=raBank]", { index: 1 });
      await page.fill("#modal-root form[data-vd-rfreq] input[name=raNo]", "12345678901");
      await page.fill("#modal-root form[data-vd-rfreq] input[name=raHolder]", "체험회원");
      await page.click("#modal-root form[data-vd-rfreq] button[type=submit]"); await page.waitForTimeout(500); await L.flushed(page);
      const sent = { modal: !!(await page.$("#modal-root .vd-modal-bg")), toast: await L.toasts(page), undo: !!(await page.$("[data-v='rf-undo'][data-no='" + no + "']")) };
      await page.click("[data-v='rf-undo'][data-no='" + no + "']").catch(() => {}); await page.waitForTimeout(400); await L.flushed(page);
      const back = !!(await page.$("[data-v='rf-req'][data-no='" + no + "']"));
      await run.check(!!errNoAcct && !sent.modal && /환불 요청을 보냈어요/.test(sent.toast) && sent.undo && back, "환불 요청(무통장): 계좌를 안 적으면 안내 · 적어 보내면 팝업이 닫히고 ‘요청 취소’ 가 생겨요 · 요청 취소하면 다시 ‘환불 요청’", Object.assign(sent, { back, errNoAcct }), page);
    } else await run.check(false, "입금 확인한 주문에 ‘환불 요청’ 버튼이 있어요", { no: o2.no }, page);
    // 주문 확인 화면(#/vod/order/<번호>): 예전 화면 = React 화면 (입금 확인한 주문 · 취소한 주문 · 없는 주문)
    {
      const bad = [];
      for (const u of ["/vod/order/" + o2.no, "/vod/order/" + o1.no, "/vod/order/DC000000000000"]) {
        const sh = {};
        for (const mode of ["off", "all"]) { await L.reactCookie(page, base, mode); await L.open(page, base, u); sh[mode] = { shape: await L.domShape(page), react: await isReact(page) }; }
        const d = L.shapeDiff(sh.off.shape, sh.all.shape);
        if (sh.off.react || !sh.all.react || d) bad.push({ u, off: sh.off.react, all: sh.all.react, d });
      }
      await L.reactCookie(page, base, "all");
      await run.check(!bad.length, "주문 확인 화면 3가지(결제 완료 · 취소 · 없는 주문): 예전 화면 = React 화면", bad.slice(0, 2), page);
      await L.open(page, base, "/vod/my");
    }
    // React 화면 → 예전 화면 (전체 클래스는 아직 예전 화면): 새로 불러 예전 화면으로
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".vd-nav a[href='#/vod/c/all']")]);
    await L.ready(page);
    await run.check(!(await isReact(page)) && new URL(page.url()).pathname === "/vod/c/all", "React → 예전 화면(전체 클래스): 새로 불러 예전 화면으로", { url: page.url() }, page);
    // 예전 화면 → React 화면 (머리띠 ‘내 강의실’)
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".vd-top a.vd-tl")]);
    await L.ready(page);
    await run.check((await isReact(page)) && new URL(page.url()).pathname === "/vod/my/classes", "예전 화면 → React 화면(내 강의실): 새로 불러 React 화면으로", { url: page.url() }, page);
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
    // 3) 로그인 · 회원가입 (로그인 전 · 같은 창에서 쿠키만 바꿔 예전 화면 = React 화면)
    {
      const pg = await L.newPage(browser);
      run.watch(pg, "React 로그인");
      await L.fresh(pg, base);
      const AUTH = ["/vod/login", "/vod/signup", "/vod/login?tab=dg", "/vod/signup?tab=dg", "/vod/login?next=%23%2Fvod%2Fdg"];
      const bad = []; let lines = 0;
      for (const u of AUTH) {
        const sh = {};
        for (const mode of ["off", "all"]) { await L.reactCookie(pg, base, mode); await L.open(pg, base, u); sh[mode] = { shape: await L.domShape(pg), react: await isReact(pg) }; }
        const d = L.shapeDiff(sh.off.shape, sh.all.shape); lines += sh.all.shape.split("\n").length;
        if (sh.off.react || !sh.all.react || d) bad.push({ u, off: sh.off.react, all: sh.all.react, d });
      }
      await run.check(!bad.length, "로그인 · 회원가입 " + AUTH.length + "개 화면: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2), pg);
      // 탭 바꾸기: 새로 불러오지 않고 그 자리에서 · 주소는 ?tab=dg
      await L.reactCookie(pg, base, "all");
      await L.open(pg, base, "/vod/login");
      await pg.evaluate(() => { window.__e2eStay = 1; });
      await pg.click(".lg-svc a[data-k='dg']"); await pg.waitForTimeout(300);
      const tab = await pg.evaluate(() => ({ stay: window.__e2eStay === 1, q: location.search, dg: !document.querySelector(".vd-svc-pane[data-pane='dg']").hidden, list: document.querySelectorAll(".vd-dgl-ins").length }));
      await pg.click(".lg-svc a[data-k='vod']"); await pg.waitForTimeout(200);
      await run.check(tab.stay && /tab=dg/.test(tab.q) && tab.dg && tab.list > 0 && !(await pg.evaluate(() => /tab=dg/.test(location.search))), "로그인 탭 [두잉고 | 두고클래스]: 새로 불러오지 않고 바꿔요 · 주소에 ?tab=dg · 두잉고 탭은 강사 목록", tab, pg);
      // 칸을 채워야 버튼이 켜져요 · 비밀번호가 틀리면 안내
      const dis0 = await pg.$eval("[data-vd-auth] button[type=submit]", (b) => b.disabled);
      await pg.fill("[data-vd-auth] input[name=email]", em); await pg.fill("[data-vd-auth] input[name=pw]", "wrong-pw-1");
      const dis1 = await pg.$eval("[data-vd-auth] button[type=submit]", (b) => b.disabled);
      await pg.click("[data-vd-auth] button[type=submit]"); await pg.waitForTimeout(1200);
      const err = await L.text(pg, "#vd-auth-err");
      await run.check(dis0 && !dis1 && !!err, "로그인: 칸을 채우기 전엔 버튼이 꺼져 있고 · 비밀번호가 틀리면 안내가 떠요", { dis0, dis1, err }, pg);
      // 로그인 (?next=마이페이지) → 마이페이지(React)로 · 서버 로그인
      await L.open(pg, base, "/vod/login?next=" + encodeURIComponent("#/vod/my"));
      await pg.fill("[data-vd-auth] input[name=email]", em); await pg.fill("[data-vd-auth] input[name=pw]", pw);
      await pg.click("[data-vd-auth] button[type=submit]");
      await pg.waitForFunction(() => location.pathname === "/vod/my", null, { timeout: 10000 }).catch(() => {});
      await L.ready(pg); await pg.waitForTimeout(400);
      const li = { path: new URL(pg.url()).pathname, react: await isReact(pg), me: !!(((await F.serverMe(pg)) || {}).vod), side: !!(await pg.$(".vd-my-side")) };
      await run.check(li.path === "/vod/my" && li.react && li.me && li.side, "로그인(React 화면): 서버 로그인 → ?next 의 마이페이지(React)로", li, pg);
      // 회원가입 (React 화면) → 가입 · 로그인 · 가입 쿠폰
      await L.fresh(pg, base); await L.reactCookie(pg, base, "all");
      await L.open(pg, base, "/vod/signup");
      const mail = "react" + Date.now().toString(36) + "@example.com";
      await pg.fill("[data-vd-auth] input[name=name]", "리액트");
      await pg.fill("[data-vd-auth] input[name=email]", mail);
      await pg.fill("[data-vd-auth] input[name=phone]", "010-0000-7777");
      await pg.fill("[data-vd-auth] input[name=pw]", "test1234a"); await pg.fill("[data-vd-auth] input[name=pw2]", "test1234a");
      await pg.check("[data-vd-auth] [data-v='agree-all']");
      const agreed = await pg.evaluate(() => { const f = document.querySelector("[data-vd-auth]"); return f.agree.checked && f.mkt.checked && !f.querySelector("button[type=submit]").disabled; });
      await pg.click("[data-vd-auth] button[type=submit]");
      await pg.waitForFunction(() => !!(window.DB && DB.remote && DB.remote.me && DB.remote.me.vod), null, { timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(800);
      const su = { agreed, me: !!(((await F.serverMe(pg)) || {}).vod), toast: await L.toasts(pg) };
      await run.check(su.agreed && su.me, "회원가입(React 화면): 전체 동의로 필수 · 선택이 같이 켜지고 · 가입하면 서버 로그인", su, pg);
      await pg.context().close();
    }
  }
};
