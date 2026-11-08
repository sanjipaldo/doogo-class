/* React 화면 (Next.js 전환 4-4 ~ 6단계) — 스위치(proxy.js · shared/screens.js) · 예전 화면과 똑같은 모양 · 오가기 · 버튼
 *  · Next.js 서버(E2E_SERVER=next · 운영 · 미리보기)에서만 — 예전 개발 서버(dev-server.js)에는 React 화면이 없어요
 *  · 옮긴 화면마다: 같은 창 · 같은 회원으로 예전 화면(쿠키 dc_next=off)과 React 화면(dc_next=all)의 #root 구조가 똑같은지 (PC · 휴대폰) */
"use strict";
const F = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 화면 주소 (shared/screens.js 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
const SHAPES = ["/vod/my", "/vod/my/classes", "/vod/my/classes?st=done", "/vod/my/free", "/vod/my/vod", "/vod/my/addons", "/vod/my/ebooks", "/vod/my/live", "/vod/my/alarm", "/vod/my/likes", "/vod/my/likes?t=topics",
  "/vod/my/pending", "/vod/my/orders", "/vod/my/orders?t=refund", "/vod/my/ship", "/vod/my/ship?st=claim", "/vod/my/coupons", "/vod/my/coupons?st=used", "/vod/my/points", "/vod/my/reviews", "/vod/my/posts", "/vod/my/badges", "/vod/my/account", "/vod/my/devices", "/vod/my/help", "/vod/my/help?t=list",
  // 주문 · 결제 (수강권 · 수강권 + 코칭권 · 종이책 · 무료 신청 · 1:1 코칭권 · TEA TIME)
  "/vod/checkout/v8", "/vod/checkout/v8?plan=180&coach=1", "/vod/checkout/b1", "/vod/checkout/fl-choi", "/vod/checkout/v5?item=coach", "/vod/checkout/v5?item=tea",
  // VOD 강의실 (두잉고 강의실이 없는 VOD 플레이어) · 전자책
  "/vod/learn/v14", "/vod/learn/v11"];
// 스토어 공개 화면 (로그인 전 · 후 둘 다 비교) — 약관 · 강사진 · 강사 페이지(없는 강사 포함)
const PUB = ["/terms", "/privacy", "/refund", "/vod/legal/privacy", "/vod/teachers", "/vod/teachers/moon", "/vod/teachers/yuna", "/vod/teachers/nobody",
  // 클래스 목록: 전체 · 종류 탭 · 정렬 · 분야 · 분야 + 종류 · 꺼진 종류 · 오픈 예정 · BEST · 새로 열린 · 무료 특강 · 없는 분야 · 검색(빈 · 있음 · 없음)
  "/vod/c/all", "/vod/c", "/vod/c/all?tab=vod", "/vod/c/all?tab=ebook&sort=low", "/vod/c/all?tab=premium", "/vod/c/all?tab=free", "/vod/c/commerce", "/vod/c/ai?tab=vod&sort=new", "/vod/c/money",
  "/vod/c/soon", "/vod/c/best", "/vod/c/new?sort=like", "/vod/c/free", "/vod/c/nothing", "/vod/search", "/vod/search?q=%EC%87%BC%ED%95%91", "/vod/search?q=zzqq",
  // 소개 · 두고 파트너스 · 지원서 · 스토어 홈 (대표 주소 · /vod)
  "/vod/about", "/vod/partners", "/vod/partners/apply", "/", "/vod",
  // 클래스 상세: VOD(수강권 · 코칭) · 오픈 예정 · 전자책 · LIVE · 무료 LIVE · 강사 없는 VOD · 종이책 · 숨긴 클래스 · 없는 클래스
  "/vod/p/v2", "/vod/p/v3", "/vod/p/v4", "/vod/p/v5", "/vod/p/v8", "/vod/p/v9", "/vod/p/v11", "/vod/p/v12", "/vod/p/fl-choi", "/vod/p/fl-farmer-0", "/vod/p/v14", "/vod/p/b1", "/vod/p/v1", "/vod/p/nope"];
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
      for (const u of SHAPES.concat(PUB)) {
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
      await run.check(!bad.length, "회원 화면 " + SHAPES.length + "개 · 공개 화면 " + PUB.length + "개 " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2), page);
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
    // VOD 강의실(React): ‘완료하고 다음 강의’ → 새로 불러오지 않고 다음 강의 · 진도가 올라가요
    await L.open(page, base, "/vod/learn/v14");
    await page.evaluate(() => { window.__e2eStay = 1; });
    const pl0 = { react: await isReact(page), h1: await L.text(page, ".vd-pl-info h1"), pc: await L.text(page, ".vd-pl-prog") };
    await page.click(".vd-pl-btns [data-v='done']").catch(() => {}); await page.waitForTimeout(500);
    const pl1 = await page.evaluate(() => ({ stay: window.__e2eStay === 1, path: location.pathname, h1: (document.querySelector(".vd-pl-info h1") || {}).textContent, pc: (document.querySelector(".vd-pl-prog") || {}).textContent }));
    await run.check(pl0.react && pl1.stay && /^\/vod\/learn\/v14\/./.test(pl1.path) && pl1.h1 && pl1.h1 !== pl0.h1 && pl1.pc !== pl0.pc, "VOD 강의실(React): 완료하고 다음 강의 → 새로 불러오지 않고 다음 강의 · 진도율이 올라가요", { pl0, pl1 }, page);
    await L.open(page, base, "/vod/my");
    // 주문 만들기 (API — 결제 화면은 4-4 다음 차례): 무통장 주문 2건 · 하나는 회원이 React 화면에서 취소, 하나는 마스터가 입금 확인
    const mkOrder = (i) => page.evaluate((k) => { const X = window.VOD, mm = X.me(), ps = X.listed().filter((x) => (X.typeOf(x) === "vod" || X.typeOf(x) === "ebook") && x.status === "on" && X.priceOf(x) > 0 && !X.owns(mm.id, x.id)), p = ps[k]; if (!p) return { none: true };
      const pl = X.defPlan ? X.defPlan(p) : null;
      return fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", pid: p.id, kind: "course", plan: pl && pl.d, method: "bank", depositor: "체험회원" }) }).then((r) => r.json()).then((j) => ({ ok: !!j.ok, no: j.no, msg: j.message })); }, i);
    // (시험 DB 에서 체험 회원이 아직 안 산 유료 클래스가 하나라서, 먼저 결제 화면(React)으로 주문 → 취소한 뒤 같은 클래스를 다시 주문해 입금 확인해요)
    // 결제 화면(React): 수강권 바꾸면 금액이 다시 계산되고 · 전체 동의 · 무통장 → 주문 확인(React)으로
    await L.open(page, base, "/vod/checkout/v8");
    const co0 = { react: await isReact(page), tot: await L.text(page, "[data-co-tot]") };
    await page.check(".vd-co-plans input[name=plan][value='180']", { force: true }).catch(() => {}); await page.waitForTimeout(250);
    const tot1 = await L.text(page, "[data-co-tot]"), btn1 = await L.text(page, "button[data-co-btn]");
    await page.check("input[name=method][value=bank]");
    await page.fill("input[name=depositor]", "체험회원");
    await page.check("input[data-agree-all]");
    const agreed = await page.evaluate(() => Array.from(document.querySelectorAll("[data-agree-req]")).every((x) => x.checked));
    await page.click("button[data-co-btn]");
    await page.waitForFunction(() => /^\/vod\/order\//.test(location.pathname), null, { timeout: 15000 }).catch(() => {});
    await L.ready(page); await page.waitForTimeout(300);
    const coNo = await page.evaluate(() => (location.pathname.match(/^\/vod\/order\/([^/?]+)/) || [])[1] || "");
    const coDone = { react: await isReact(page), h1: await L.text(page, ".vd-done h1"), bank: !!(await page.$(".vd-done-bank")) };
    await run.check(co0.react && co0.tot && tot1 && tot1 !== co0.tot && btn1.indexOf(tot1) === 0 && agreed && /^DC\d{12}$/.test(coNo) && coDone.react && /접수/.test(coDone.h1 || "") && coDone.bank,
      "결제 화면(React): 6개월 수강권으로 바꾸면 금액 · 버튼이 다시 계산 · 전체 동의 · 무통장 주문 → 주문 확인(React · 입금 계좌)", { co0, tot1, btn1, agreed, coNo, coDone }, page);
    const o1 = { ok: !!coNo, no: coNo };
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
    // 내 강의실(React): 결제 후 7일 · 재생 전이면 ‘환불하기’ — 무통장은 환불 받을 계좌를 적어야 하고 · 바로 취소(서버 환불 + 계좌 송금 대기) · 버튼이 사라져요
    await L.open(page, base, "/vod/my/classes");
    const rfBtn = await page.$(".vd-sroom-rf[data-no='" + o2.no + "']");
    const rf0 = { btn: !!rfBtn, note: await L.text(page, ".vd-sroom-rfn"), react: await isReact(page) };
    let rf1 = {};
    if (rfBtn) {
      await rfBtn.click(); await page.waitForSelector("#modal-root form[data-vd-rfnow]", { timeout: 3000 }).catch(() => {});
      await page.click("#modal-root [data-v='rf-now-ok']"); await page.waitForTimeout(300);
      const errNoAcct = await L.text(page, "#modal-root [data-rfnow-err]");
      await page.selectOption("#modal-root form[data-vd-rfnow] select[name=raBank]", { index: 1 });
      await page.fill("#modal-root form[data-vd-rfnow] input[name=raNo]", "12345678901");
      await page.fill("#modal-root form[data-vd-rfnow] input[name=raHolder]", "체험회원");
      await page.click("#modal-root [data-v='rf-now-ok']"); await page.waitForTimeout(1800);
      const srv = await page.evaluate((no) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "orders" }) }).then((r) => r.json()).then((j) => { const o = (j.orders || []).find((x) => x.no === no) || {}; return { st: o.status, kind: o.refundKind }; }), o2.no);
      rf1 = { errNoAcct, toast: await L.toasts(page), modal: !!(await page.$("#modal-root .vd-modal-bg")), srv, still: !!(await page.$(".vd-sroom-rf[data-no='" + o2.no + "']")) };
    }
    await run.check(rf0.btn && /100% 환불/.test(rf0.note || "") && rf0.react && /은행|계좌/.test(rf1.errNoAcct || "") && !rf1.modal && /환불을 접수했어요/.test(rf1.toast || "") && rf1.srv && rf1.srv.st === "refunded" && rf1.srv.kind === "instant" && !rf1.still,
      "내 강의실(React): 결제 후 7일 · 재생 전이면 ‘환불하기’ → 무통장은 환불 계좌를 적어야 하고 · 바로 취소(서버 환불 · 계좌 송금 대기) · 버튼이 사라져요", Object.assign({ rf0 }, rf1), page);
    // 다시 주문 → 입금 확인 → 강의를 재생(시작)하면 ‘환불하기’가 사라지고 주문 · 결제 내역은 ‘환불 요청’으로
    const o3 = await mkOrder(0);
    const adm3 = await L.newPage(browser);
    await F.master(adm3, base, info);
    const ok3 = await adm3.evaluate((no) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bankOk", no }) }).then((r) => r.json()).then((j) => !!j.ok), o3.no);
    await adm3.context().close();
    await L.open(page, base, "/vod/my/classes");
    const btn3 = !!(await page.$(".vd-sroom-rf[data-no='" + o3.no + "']"));
    const played = await page.evaluate((no) => { const X = window.VOD, mm = X.me(), o = X.V().orders.find((x) => x.no === no); if (!o || !mm) return null; const lz = X.lessons(X.product(o.pid)); X.markLast(mm.id, o.pid, (lz[0] || {}).id || "l1"); return !X.instantOf(o).ok; }, o3.no);
    await L.flushed(page);
    await L.open(page, base, "/vod/my/classes");
    const gone3 = !(await page.$(".vd-sroom-rf[data-no='" + o3.no + "']"));
    // 서버도 같은 판단: 재생 기록이 서버에 남아 바로 취소를 거절해요 (화면 버튼을 우회해 API 로 보내도)
    const srv3 = await page.evaluate((no) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", no, refundAccount: { bank: "KAKAO", number: "12345678901", holder: "체험회원" } }) }).then((r) => r.json().then((j) => ({ st: r.status, msg: j.message || "" }))), o3.no);
    await run.check(o3.ok && ok3 && btn3 && played && gone3 && srv3.st === 409 && /1개/.test(srv3.msg), "다시 산 강의도 처음엔 ‘환불하기’ · 강의를 재생하면 버튼이 사라지고 서버도 바로 취소를 거절해요", { o3, ok3, btn3, played, gone3, srv3 }, page);
    await page.click(".vd-my-nav a[href='#/vod/my/orders']"); await page.waitForTimeout(300);
    const rq = await page.$("[data-v='rf-req'][data-no='" + o3.no + "']");
    if (rq) {
      const no = o3.no;
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
    } else await run.check(false, "재생한 무통장 주문에 ‘환불 요청’ 버튼이 있어요", { no: o3.no }, page);
    // 주문 확인 화면(#/vod/order/<번호>): 예전 화면 = React 화면 (입금 확인한 주문 · 취소한 주문 · 없는 주문)
    {
      const bad = [];
      for (const u of ["/vod/order/" + o3.no, "/vod/order/" + o2.no, "/vod/order/" + o1.no, "/vod/order/DC000000000000"]) {
        const sh = {};
        for (const mode of ["off", "all"]) { await L.reactCookie(page, base, mode); await L.open(page, base, u); sh[mode] = { shape: await L.domShape(page), react: await isReact(page) }; }
        const d = L.shapeDiff(sh.off.shape, sh.all.shape);
        if (sh.off.react || !sh.all.react || d) bad.push({ u, off: sh.off.react, all: sh.all.react, d });
      }
      await L.reactCookie(page, base, "all");
      await run.check(!bad.length, "주문 확인 화면 4가지(결제 완료 · 바로 취소한 무통장 · 취소 · 없는 주문): 예전 화면 = React 화면", bad.slice(0, 2), page);
      await L.open(page, base, "/vod/my");
    }
    // React 화면 → 예전 화면 (두잉고 소개는 아직 예전 화면 — 옮기면 아직 안 옮긴 다른 화면으로 바꿔요): 새로 불러 예전 화면으로
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.evaluate(() => { window.ROUTE.hash = "#/doinggo"; })]);
    await L.ready(page);
    await run.check(!(await isReact(page)) && new URL(page.url()).pathname === "/doinggo", "React → 예전 화면(두잉고 소개): 새로 불러 예전 화면으로", { url: page.url() }, page);
    // 예전 화면 → React 화면 (내 강의실)
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.evaluate(() => { window.ROUTE.hash = "#/vod/my/classes"; })]);
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
      const AUTH = ["/vod/login", "/vod/signup", "/vod/login?tab=dg", "/vod/signup?tab=dg", "/vod/login?next=%23%2Fvod%2Fdg"].concat(PUB);
      const bad = []; let lines = 0;
      for (const u of AUTH) {
        const sh = {};
        for (const mode of ["off", "all"]) { await L.reactCookie(pg, base, mode); await L.open(pg, base, u); sh[mode] = { shape: await L.domShape(pg), react: await isReact(pg) }; }
        const d = L.shapeDiff(sh.off.shape, sh.all.shape); lines += sh.all.shape.split("\n").length;
        if (sh.off.react || !sh.all.react || d) bad.push({ u, off: sh.off.react, all: sh.all.react, d });
      }
      await run.check(!bad.length, "로그인 전: 로그인 · 회원가입 · 공개 화면 " + AUTH.length + "개 화면: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요", bad.slice(0, 2), pg);
      // 공개 화면(약관)의 검색 · 공유 미리보기: React 화면도 서버가 같은 제목 · 설명 · 대표 주소 · 검색 허용 · 검색용 안내 글을 넣어요
      const ent = (x) => String(x || "").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
      // 머리 정보 전부: 모든 meta(이름 · 속성 → 내용) · 구조화 데이터(JSON-LD) 전부 · 검색용 안내 글 — 예전 화면과 하나라도 다르면 실패
      const meta = (h) => {
        const metas = [], ld = [];
        h.replace(/<meta\s+(name|property)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g, (m0, k, n, v) => { if (n !== "viewport" && n !== "theme-color") metas.push(k + ":" + n + "=" + ent(v)); return m0; });
        h.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (m0, j) => { ld.push(j.trim()); return m0; });
        const sm = /<div class="seo-static">([\s\S]*?)<\/div>/.exec(h);
        return { title: ent((h.match(/<title>([^<]*)<\/title>/) || [])[1]), canon: (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1], robots: (h.match(/<meta name="robots" content="([^"]+)"/) || [])[1], desc: ent((h.match(/<meta name="description" content="([^"]+)"/) || [])[1]), ogt: ent((h.match(/<meta property="og:title" content="([^"]+)"/) || [])[1]),
          metas: metas.sort().join("\n"), ld: ld.join("\n"), seoText: sm ? sm[1].replace(/\s+/g, " ").trim() : "", seo: /class="seo-static"/.test(h), react: /DC_REACT_PAGE/.test(h) };
      };
      const seoBad = [];
      for (const u of PUB) {
        const a = meta(await (await fetch(base + u, { headers: { cookie: "dc_next=off" } })).text()), b = meta(await (await fetch(base + u, { headers: { cookie: "dc_next=all" } })).text());
        const diff = ["title", "canon", "robots", "metas", "ld", "seoText"].filter((k) => a[k] !== b[k]);
        if (a.react || !b.react || diff.length || !b.seo || !/index/.test(b.robots || "") || /noindex/.test(b.robots || "")) seoBad.push({ u, diff, a: diff.map((k) => [k, String(a[k]).slice(0, 300)]), b: diff.map((k) => [k, String(b[k]).slice(0, 300)]) });
      }
      const priv = meta(await (await fetch(base + "/vod/my", { headers: { cookie: "dc_next=all" } })).text());
      await run.check(!seoBad.length && priv.react && /noindex/.test(priv.robots || ""), "공개 화면 " + PUB.length + "개: React 화면도 서버가 같은 제목 · 모든 meta(설명 · 공유 정보 · 검색 허용) · 대표 주소 · 구조화 데이터(JSON-LD) 전부 · 검색용 안내 글 / 마이페이지(React)는 검색 제외(noindex)", seoBad.slice(0, 1).concat([{ priv }]), pg);
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
    // 4) 스토어 공개 화면: 같은 순서로 눌렀을 때 예전 화면(off) = React 화면(all) — 누를 때마다 #root 구조 비교 · React 는 새로 불러오지 않아요
    {
      const pg = await L.newPage(browser);
      run.watch(pg, "React 공개 화면");
      await F.member(pg, base, em, pw);
      const step = async (out, fn, wait) => { await fn(); await pg.waitForTimeout(wait || 250); out.push(await L.domShape(pg)); };
      const stayOn = () => pg.evaluate(() => { window.__e2eStay = 1; });
      const stayed = () => pg.evaluate(() => window.__e2eStay === 1);
      // 강사진: 검색(이름 · 없는 이름) → 지우기 X → 분야 → 없는 이름 + ‘전체 보기’ → 분야 고른 채로 강사 페이지 → 뒤로 (검색 · 분야가 남아요)
      const tpg = async (mode) => {
        await L.reactCookie(pg, base, mode); await L.open(pg, base, "/vod/teachers"); await stayOn();
        const t0 = await pg.evaluate(() => { const v = window.VOD.teachersView(); return { name: v.list[0].name, cat: v.cats[v.cats.length - 1], n: v.list.length }; });
        const out = [];
        await step(out, () => pg.fill("[data-tpg-q]", t0.name));
        await step(out, () => pg.fill("[data-tpg-q]", "zzqq"));
        await step(out, () => pg.click(".vd-tpg-x"));
        const focus = await pg.evaluate(() => document.activeElement && document.activeElement.matches("[data-tpg-q]"));
        await step(out, () => pg.click(".vd-tpg-cats [data-tpg-cat='" + t0.cat.replace(/'/g, "\\'") + "']"));
        await step(out, () => pg.fill("[data-tpg-q]", "zzqq"));
        await step(out, () => pg.click("[data-v='tpg-reset']"));
        await step(out, () => pg.click(".vd-tpg-cats [data-tpg-cat='" + t0.cat.replace(/'/g, "\\'") + "']"));
        const href = await pg.evaluate(() => { const a = Array.from(document.querySelectorAll(".vd-tpg-g .vd-tc")).find((x) => !x.hidden); return a ? a.querySelector(".vd-tc-main").getAttribute("href") : ""; });
        await step(out, () => pg.click(".vd-tpg-g .vd-tc:not([hidden]) .vd-tc-main"), 500);
        const tp = await pg.evaluate(() => ({ path: location.pathname, h1: (document.querySelector(".vd-tp-info h1 .vd-sr") || document.querySelector(".vd-tp-info h1") || {}).textContent }));
        await step(out, () => pg.goBack(), 600);
        const back = await pg.evaluate(() => ({ path: location.pathname, on: (document.querySelector(".vd-tpg-cats .vd-pill.on") || {}).textContent, vis: Array.from(document.querySelectorAll(".vd-tpg-g .vd-tc")).filter((x) => !x.hidden).length }));
        return { out, focus, href, tp, back, stay: await stayed(), t0 };
      };
      const a1 = await tpg("off"), b1 = await tpg("all");
      const d1 = a1.out.map((x, i) => L.shapeDiff(x, b1.out[i])).map((d, i) => d && { i, d }).filter(Boolean);
      await run.check(!d1.length && b1.out.length === 9, "강사진(React): 검색 · 지우기 · 분야 · 전체 보기 · 강사 페이지 · 뒤로 — 누를 때마다 예전 화면과 같은 모양 (" + b1.out.length + "번)", d1.slice(0, 1), pg);
      await run.check(b1.focus && b1.stay && !!b1.tp.h1 && /^\/vod\/teachers\/.+/.test(b1.tp.path) && b1.back.path === "/vod/teachers" && b1.back.on === b1.t0.cat && b1.back.vis > 0,
        "강사진(React): 지우면 검색 칸에 커서 · 강사 페이지는 새로 불러오지 않고 · 뒤로 오면 고른 분야가 그대로", { focus: b1.focus, stay: b1.stay, tp: b1.tp, back: b1.back }, pg);
      // 클래스 목록: 전체 → 종류 탭 → 정렬 → 분야 → 넘기기(다음) · 머리 검색 → 큰 검색 칸
      const lst = async (mode) => {
        await L.reactCookie(pg, base, mode); await L.open(pg, base, "/vod/c/all"); await stayOn();
        const out = [];
        const pager = await pg.$(".vd-pager:not(.one) button[data-d='1']");
        if (pager) await step(out, () => pager.click(), 900);
        await step(out, () => pg.click(".vd-gtabs a[href='#/vod/c/all?tab=vod']"), 400);
        await step(out, () => pg.click(".vd-sorts a[href$='sort=low']"), 400);
        await step(out, () => pg.click(".vd-pills a[href='#/vod/c/commerce?tab=vod']"), 400);
        await step(out, () => pg.click(".vd-tp-bc a"), 400);
        await step(out, async () => { await pg.fill(".vd-top form.vd-search input[name=q]", "쇼핑"); await pg.press(".vd-top form.vd-search input[name=q]", "Enter"); }, 500);
        await step(out, async () => { await pg.fill(".vd-list form.vd-search-lg input[name=q]", "zzqq"); await pg.press(".vd-list form.vd-search-lg input[name=q]", "Enter"); }, 500);
        return { out, pager: !!pager, path: await pg.evaluate(() => location.pathname + location.search), stay: await stayed() };
      };
      const a2 = await lst("off"), b2 = await lst("all");
      const d2 = a2.out.map((x, i) => L.shapeDiff(x, b2.out[i])).map((d, i) => d && { i, d }).filter(Boolean);
      await run.check(!d2.length && a2.out.length === b2.out.length && b2.out.length >= 6, "클래스 목록(React): " + (b2.pager ? "넘기기 · " : "") + "종류 탭 · 정렬 · 분야 · 위치 · 머리 검색 · 큰 검색 칸 — 누를 때마다 예전 화면과 같은 모양 (" + b2.out.length + "번)", d2.slice(0, 1), pg);
      await run.check(b2.stay && /^\/vod\/search\?q=zzqq$/.test(b2.path), "클래스 목록(React): 탭 · 정렬 · 분야 · 검색을 옮겨도 새로 불러오지 않아요 · 주소는 /vod/search?q=zzqq", { stay: b2.stay, path: b2.path }, pg);
      // 찜 (React · 카드 하트): 담으면 하트 켜짐 · 찜 수 +1 · 알림 → 다시 누르면 풀려요
      await L.open(pg, base, "/vod/c/all?tab=vod");
      const lk = await pg.evaluate(() => { const b = document.querySelector(".vd-grid .vd-card .vd-like:not(.on)"); if (!b) return null; const id = b.dataset.id; return { id, n: Number((document.querySelector('[data-hc="' + id + '"]') || {}).textContent) || 0 }; });
      let lk1 = null, lk2 = null;
      if (lk) {
        await pg.click('.vd-grid .vd-like[data-id="' + lk.id + '"]'); await pg.waitForTimeout(400);
        lk1 = await pg.evaluate((id) => ({ on: document.querySelector('.vd-like[data-id="' + id + '"]').classList.contains("on"), n: Number(document.querySelector('[data-hc="' + id + '"]').textContent) || 0, liked: window.VOD.liked(window.VOD.me().id, id) }), lk.id);
        const t1 = await L.toasts(pg);
        await pg.click('.vd-grid .vd-like[data-id="' + lk.id + '"]'); await pg.waitForTimeout(400);
        lk2 = await pg.evaluate((id) => ({ on: document.querySelector('.vd-like[data-id="' + id + '"]').classList.contains("on"), liked: window.VOD.liked(window.VOD.me().id, id) }), lk.id);
        lk1.toast = t1;
      }
      // 소개: 슬라이드 다음 · 다음 · 이전 · 흐르는 줄 멈춤 / 두고 파트너스: 자주 묻는 질문(하나만 열림) / 지원서: 빈 채로 다음 → 빨간 안내 · 채우고 다음 · 이전 · 다 채워 보내기 → 완료 카드
      const more = async (mode) => {
        await L.reactCookie(pg, base, mode); await L.open(pg, base, "/vod/about"); await stayOn();
        const out = [];
        await step(out, () => pg.click(".ab-car-ctl button[data-d='1']"));
        await step(out, () => pg.click(".ab-car-ctl button[data-d='1']"));
        await step(out, () => pg.click(".ab-car-ctl button[data-d='-1']"));
        await step(out, () => pg.click(".ab-mq button[data-v='ab-mq']"));
        await step(out, () => pg.click(".ab-mq button[data-v='ab-mq']"));
        await step(out, () => pg.click(".ab-mq button[data-v='ab-mq']"));
        await step(out, () => pg.click(".vd-nav-r a[href='#/vod/about']"), 400);
        await step(out, () => pg.click(".vd-top a.vd-ptl"), 500);
        // 자주 묻는 질문은 스크롤 없이 눌러요 (눌러서 스크롤되면 브라우저의 스크롤 고정이 위치를 조금씩 다르게 잡아요 — 화면 모양과 상관없이)
        await step(out, () => pg.$eval(".pt-faq-it:nth-child(3) summary", (el) => el.click()));
        await step(out, () => pg.$eval(".pt-faq-it:nth-child(5) summary", (el) => el.click()));
        await step(out, () => pg.click(".pt-hero a[href='#/vod/partners/apply']"), 500);
        await pg.evaluate(() => { try { sessionStorage.removeItem("dc:pt-draft"); sessionStorage.removeItem("dc:pt-sec"); } catch (e) { /* 없어도 돼요 */ } });
        await L.open(pg, base, "/vod/partners/apply"); await stayOn();
        await step(out, async () => { await pg.fill("#pt-name", ""); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); }, 600);
        await step(out, async () => { await pg.fill("#pt-name", "지원자"); await pg.fill("#pt-phone", "12"); await pg.fill("#pt-email", "x"); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); }, 600);
        await step(out, async () => { await pg.fill("#pt-phone", "010-1234-5678"); await pg.fill("#pt-email", "apply@example.com"); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); }, 600);
        await step(out, () => pg.click(".pt-gf-sec:not([hidden]) .pt-gf-prev"), 600);
        await step(out, async () => { await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); await pg.waitForTimeout(400); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); }, 600);
        // 섹션 3: 분야 · 주제 · 노하우 → 4 → 5 → 동의 없이 보내기 → 동의하고 보내기
        await step(out, async () => { await pg.check(".pt-gf-sec[data-sec='3'] input[name=cat] >> nth=0", { force: true }); await pg.fill("#pt-topic", "시험 주제"); await pg.fill("#pt-course", "시험 노하우"); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); await pg.waitForTimeout(400); await pg.click(".pt-gf-sec:not([hidden]) .pt-gf-next"); }, 600);
        // 다시 불러도 쓰던 내용 · 보던 섹션이 그대로
        await pg.reload({ waitUntil: "load" }); await L.ready(pg); await pg.waitForTimeout(300); out.push(await L.domShape(pg));
        await step(out, () => pg.click(".pt-gf-sec:not([hidden]) button[type=submit]"), 600);
        await step(out, async () => { await pg.check(".pt-gf-sec[data-sec='5'] input[name=agree]", { force: true }); await pg.click(".pt-gf-sec:not([hidden]) button[type=submit]"); await pg.waitForSelector(".pt-done", { timeout: 8000 }).catch(() => {}); }, 400);
        const draft = await pg.evaluate(() => { try { return sessionStorage.getItem("dc:pt-draft"); } catch (e) { return "x"; } });
        return { out, done: !!(await pg.$(".pt-done")), draft };
      };
      // 스토어 홈: 자동 넘김 멈춤 → 다음 · 다음 · 이전 · 점 → 다시 켬 · 끔 → 분야 탭 · 다루는 부업 찜 · 줄 넘기기
      const home = async (mode) => {
        await L.reactCookie(pg, base, mode); await L.open(pg, base, "/vod"); await stayOn();
        const out = [];
        const hero = !!(await pg.$(".vd-hero"));
        if (hero) {
          await step(out, () => pg.click(".vd-hero-ctl [data-v='pause']"));
          await step(out, () => pg.click(".vd-hero-ctl [data-v='slide'][data-d='1']"), 900);
          await step(out, () => pg.click(".vd-hero-ctl [data-v='slide'][data-d='1']"), 900);
          await step(out, () => pg.click(".vd-hero-ctl [data-v='slide'][data-d='-1']"), 900);
          await step(out, () => pg.click(".vd-dots button:last-child"), 900);
          await step(out, () => pg.click(".vd-hero-ctl [data-v='slide'][data-d='1']"), 900);
        }
        const tabs = await pg.$$eval(".vd-hcat-tabs button", (b) => b.length);
        if (tabs > 1) await step(out, () => pg.click(".vd-hcat-tabs button:nth-child(2)"), 400);
        const chip = await pg.$(".vd-topics .vd-tchip:not([aria-hidden])");
        // 흐르는 줄이라 멈춰 있지 않아요 — 움직이는 채로 눌러요
        if (chip) { await step(out, () => chip.click({ force: true }), 400); await step(out, () => pg.click(".vd-topics .vd-tchip:not([aria-hidden])", { force: true }), 400); }
        const pager = await pg.$(".vd-sec .vd-pager:not(.one) button[data-d='1']");
        if (pager) await step(out, () => pager.click(), 900);
        // 강사진 한 줄 슬라이드: 가만히 두면 그대로 (자동으로 안 넘어가요) → ‘다음’ → ‘이전’ 을 누를 때만 넘어가요
        const t0 = await teachSt(); await pg.waitForTimeout(1500); const t1 = await teachSt(); let t2 = null, t3 = null;
        if (t0 && t0.over && !t0.next) { await step(out, () => pg.click(".vd-teach-arr.next"), 900); t2 = await teachSt(); await step(out, () => pg.click(".vd-teach-arr.prev"), 900); t3 = await teachSt(); }
        // 전체 메뉴(휴대폰 아래 ‘메뉴’ — 넓은 화면에선 숨은 버튼을 눌러요): 맨 위 두고클래스 로고 + 검색 제목 문구 · 메뉴 줄 (#modal-root 모양도 비교)
        await pg.evaluate(() => document.querySelector('[data-v="drawer"]').click()); await pg.waitForTimeout(350);
        out.push(await L.domShape(pg, "modal-root"));
        const dr = await pg.evaluate(() => { const a = document.querySelector("#modal-root .vd-modal-drawer .vd-dr-logo"); return a ? { href: a.getAttribute("href"), logo: !!a.querySelector("img.vd-logo-img"), tag: (a.querySelector("small") || {}).textContent || "", label: (document.querySelector("#modal-root .vd-modal") || { getAttribute: () => "" }).getAttribute("aria-label") } : null; });
        await pg.evaluate(() => { const x = document.querySelector("#modal-root .vd-modal-h button[data-v='close']"); if (x) x.click(); }); await pg.waitForTimeout(250);
        return { out, hero, tabs, chip: !!chip, pager: !!pager, teach: { t0, t1, t2, t3 }, dr, drClosed: !(await pg.$("#modal-root .vd-modal-drawer")), stay: await stayed() };
      };
      // 강사진 줄 상태: 카드 수 · 몇 줄인지 · 넘칠 게 있는지 · 스크롤 위치 · 좌우 화살표가 꺼졌는지
      const teachSt = () => pg.evaluate(() => {
        const el = document.getElementById("vd-r-teach"); if (!el) return null;
        const dis = (d) => { const b = document.querySelector(".vd-teach-arr[data-d='" + d + "']"); return b ? b.disabled : null; };
        return { n: el.children.length, rows: new Set(Array.from(el.children).map((c) => Math.round(c.getBoundingClientRect().top))).size, over: el.scrollWidth > el.clientWidth + 2, sl: Math.round(el.scrollLeft), prev: dis(-1), next: dis(1) };
      });
      const teachOk = (t) => !!(t && t.t0 && t.t1) && t.t0.rows === 1 && t.t0.prev === true && t.t1.sl === t.t0.sl && (!t.t0.over || (!!t.t2 && !!t.t3 && t.t2.sl > t.t0.sl && t.t2.prev === false && t.t3.sl === 0 && t.t3.prev === true && t.t3.next === false));
      const a4 = await home("off"), b4 = await home("all");
      await run.check(teachOk(a4.teach) && teachOk(b4.teach) && !!b4.teach.t0.over, "스토어 홈 강사진: 한 줄 슬라이드 (" + ((b4.teach.t0 || {}).n || 0) + "명) · 가만히 두면 안 넘어가요 · ‘다음’ · ‘이전’ 을 누를 때만 넘어가고 처음에서는 ‘이전’ 이 꺼져요 (예전 화면 · React 화면 같이)", { off: a4.teach, all: b4.teach }, pg);
      const d4 = a4.out.map((x, i) => L.shapeDiff(x, b4.out[i])).map((d, i) => d && { i, d }).filter(Boolean);
      await run.check(!!a4.dr && !!b4.dr && b4.dr.href === "#/vod" && b4.dr.logo && b4.dr.tag === "배움이 기회가 되는 곳, 두고클래스" && b4.dr.label === "전체 메뉴" && JSON.stringify(a4.dr) === JSON.stringify(b4.dr) && a4.drClosed && b4.drClosed, "전체 메뉴 맨 위: 두고클래스 로고(누르면 첫 화면) + 검색 제목 문구 ‘배움이 기회가 되는 곳, 두고클래스’ · 창 이름은 ‘전체 메뉴’ · X 로 닫혀요 (예전 화면 = React)", { a: a4.dr, b: b4.dr }, pg);
      await run.check(!d4.length && a4.out.length === b4.out.length && b4.out.length >= 3 && b4.stay, "스토어 홈(React): " + (b4.hero ? "배너 멈춤 · 넘기기 · 점 · " : "") + (b4.tabs > 1 ? "분야 탭 · " : "") + (b4.chip ? "부업 찜 · " : "") + (b4.pager ? "줄 넘기기 " : "") + "— 누를 때마다 예전 화면과 같은 모양 (" + b4.out.length + "번) · 새로 불러오지 않아요", d4.slice(0, 1).concat([{ hero: b4.hero, tabs: b4.tabs, chip: b4.chip, pager: b4.pager, stay: b4.stay }]), pg);
      // 클래스 상세: 수강권 고르기 · 코칭권 · 미리보기 창(다른 강의 고르기 · 닫기) · 쿠폰 창(열기 · 닫기) · 소개 더보기 · 코멘트 더보기 · 탭 · 아래 막대 옵션 창
      const pdp = async (mode) => {
        await L.reactCookie(pg, base, mode); await L.open(pg, base, "/vod/p/v8"); await stayOn();
        const out = [], has = async (sel) => !!(await pg.$(sel));
        if (await has("#vd-pdt-info [data-plan][value='180']")) await step(out, () => pg.check("#vd-pdt-info [data-plan][value='180']", { force: true }));
        if (await has("#vd-pdt-info [data-plan-coach]")) await step(out, () => pg.check("#vd-pdt-info [data-plan-coach]", { force: true }));
        if (await has(".vd-pdt-play")) {
          await step(out, () => pg.click(".vd-pdt-play"), 500);
          if (await has(".vd-pvm-l button:nth-of-type(2)")) await step(out, () => pg.click(".vd-pvm-l button:nth-of-type(2)"), 500);
          await step(out, () => pg.click("#modal-root .vd-modal-h button"), 300);
        }
        if (await has(".vd-cpdl")) { await step(out, () => pg.click(".vd-cpdl"), 400); await step(out, () => pg.click("#modal-root .vd-modal-h button"), 300); }
        if (await has(".vd-pitch-more")) await step(out, () => pg.click(".vd-pitch-more"));
        if (await has(".vd-cmt-more")) await step(out, () => pg.click(".vd-cmt-more"));
        await step(out, () => pg.$eval(".vd-faq summary", (el) => el.click()));
        await step(out, () => pg.click(".vd-pd-tabs button:last-child"), 1500);
        await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(400);
        const shot = async () => pg.evaluate(() => { const r = document.getElementById("root").cloneNode(true); return r.querySelectorAll(".vd-pd-tabs .on").length; });
        return { out, stay: await stayed(), tabsOn: await shot(), co: await pg.evaluate(() => (document.querySelector("#vd-pdt-info a[data-co-link]") || {}).getAttribute ? document.querySelector("#vd-pdt-info a[data-co-link]").getAttribute("href") : "") };
      };
      const a5 = await pdp("off"), b5 = await pdp("all");
      const d5 = a5.out.map((x, i) => L.shapeDiff(x, b5.out[i])).map((d, i) => d && { i, d }).filter(Boolean);
      await run.check(!d5.length && a5.out.length === b5.out.length && b5.out.length >= 3 && b5.stay && a5.co === b5.co, "클래스 상세(React): 수강권 · 코칭권 · 미리보기 · 쿠폰 창 · 더보기 · 자주 묻는 질문 · 탭 — 누를 때마다 예전 화면과 같은 모양 (" + b5.out.length + "번) · 결제 버튼 주소도 같아요 (" + b5.co + ")", d5.slice(0, 1).concat([{ co: [a5.co, b5.co] }]), pg);
      // 클래스 상세(React)에서만: 쿠폰 받기 · 다짐 남기기 · 공감 · 지우기 · 찜
      await L.open(pg, base, "/vod/p/v8");
      let cp = null;
      if (await pg.$(".vd-cpdl:not(.got)")) {
        await pg.click(".vd-cpdl"); await pg.waitForTimeout(300);
        const btn = await pg.$("#modal-root [data-v='cp-get']");
        if (btn) { await btn.click(); await pg.waitForTimeout(1500); }
        cp = { toast: await L.toasts(pg), got: await pg.$$eval("#modal-root .vd-cpm-b.done", (x) => x.length), srv: await pg.evaluate(() => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { const d = (j.docs || []).find((x) => /^vm:/.test(x[0])); return d ? (d[1].coupons || []).length : -1; })) };
        await pg.click("#modal-root .vd-modal-h button").catch(() => {});
      }
      // 다짐 쿠폰 (2026-11-08): 20자보다 짧으면 버튼이 꺼져 있고 · 20자 이상 남기면 그 강의 5,000원 쿠폰이 서버에 들어오고 · ‘받았어요’ 띠로 바뀌어요
      const PLT = "리액트 상세에서 다짐해요. 매일 30분씩 끝까지 따라 해 볼게요!";
      const plGive = !!(await pg.$(".vd-plcp:not(.got)"));
      await pg.fill("[data-vd-pledge] textarea[name=text]", "짧은 다짐");
      const plShortOff = await pg.$eval("[data-pl-go]", (b) => b.disabled);
      await pg.fill("[data-vd-pledge] textarea[name=text]", PLT);
      const plN = await L.text(pg, "[data-pl-n]"), plOn = await pg.$eval("[data-pl-go]", (b) => !b.disabled);
      await pg.click("[data-vd-pledge] button[type=submit]"); await pg.waitForTimeout(1800);
      const plToast = await L.toasts(pg), plGot = !!(await pg.$(".vd-plcp.got"));
      const plCp = await pg.evaluate(() => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { const d = (j.docs || []).find((x) => /^vm:/.test(x[0])); return d ? (d[1].coupons || []).filter((c) => c.cid === "cp-pledge" && c.pid === "v8").length : -1; }));
      const pl1 = await pg.evaluate(() => { const li = Array.from(document.querySelectorAll(".vd-pls li")).find((x) => /리액트 상세에서 다짐해요/.test(x.textContent)); return li ? { up: li.querySelector("[data-v='pl-up']").textContent.trim(), del: !!li.querySelector("[data-v='pl-del']") } : null; });
      if (pl1) { await pg.evaluate(() => { const li = Array.from(document.querySelectorAll(".vd-pls li")).find((x) => /리액트 상세에서 다짐해요/.test(x.textContent)); li.querySelector("[data-v='pl-up']").click(); }); await pg.waitForTimeout(400); }
      const pl2 = await pg.evaluate(() => { const li = Array.from(document.querySelectorAll(".vd-pls li")).find((x) => /리액트 상세에서 다짐해요/.test(x.textContent)); return li ? li.querySelector("[data-v='pl-up']").className + "|" + li.querySelector("[data-v='pl-up']").textContent.trim() : null; });
      if (pl1) { await pg.evaluate(() => { const li = Array.from(document.querySelectorAll(".vd-pls li")).find((x) => /리액트 상세에서 다짐해요/.test(x.textContent)); li.querySelector("[data-v='pl-del']").click(); }); await pg.waitForTimeout(400); }
      const pl3 = await pg.evaluate(() => !Array.from(document.querySelectorAll(".vd-pls li")).some((x) => /리액트 상세에서 다짐해요/.test(x.textContent)));
      await run.check(plN === String(PLT.length) && plShortOff && plOn && pl1 && pl1.del && pl2 === "on|공감 1" && pl3 && (!cp || (cp.got >= 1 && /쿠폰 \d장을 받았어요/.test(cp.toast) && cp.srv > 0)), "클래스 상세(React): " + (cp ? "쿠폰 받기(서버에 저장) · " : "") + "다짐 남기기(20자 · 글자 수) · 공감 · 지우기", { cp, plN, plShortOff, plOn, pl1, pl2, pl3 }, pg);
      await run.check(!plGive || (plCp === 1 && plGot && /쿠폰이 들어왔어요/.test(plToast)), "클래스 상세(React): 20자 이상 다짐 → 그 강의 5,000원 다짐 쿠폰이 서버에 들어오고 ‘받았어요’ 띠 · 알림" + (plGive ? "" : " (이 회원은 받을 수 없는 강의라 건너뜀)"), { plGive, plCp, plGot, plToast }, pg);
      const a3 = await more("off"), b3 = await more("all");
      const d3 = a3.out.map((x, i) => L.shapeDiff(x, b3.out[i])).map((d, i) => d && { i, d }).filter(Boolean);
      await run.check(!d3.length && a3.out.length === b3.out.length, "소개 · 두고 파트너스 · 지원서(React): 슬라이드 · 흐르는 줄 · 자주 묻는 질문 · 섹션 확인 · 다시 불러도 그대로 · 보내기 — 누를 때마다 예전 화면과 같은 모양 (" + b3.out.length + "번)", d3.slice(0, 1), pg);
      await run.check(b3.done && !b3.draft && a3.done, "지원서(React): 다 채워 보내면(서버가 받으면) 완료 카드 · 쓰던 내용은 지워요", { done: b3.done, draft: b3.draft }, pg);
      await run.check(lk && lk1.on && lk1.liked && lk1.n === lk.n + 1 && /찜한 강의에 담았어요|오픈하면/.test(String(lk1.toast)) && !lk2.on && !lk2.liked, "목록 찜(React): 하트 켜짐 · 찜 수 +1 · 알림 → 다시 누르면 풀려요", { lk, lk1, lk2 }, pg);
      await pg.context().close();
    }
  }
};
