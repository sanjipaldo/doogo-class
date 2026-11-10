/* 두잉고 강의실 React 화면 (Next.js 전환 5단계) — 같은 창 · 같은 수강생으로 예전 화면(쿠키 dc_next=off)과 React 화면(all)의 #root 구조가 똑같은지 (PC · 휴대폰)
 *  · 기수(LIVE) 수강생: 이름 + 뒷자리 로그인 · VOD 수강생: DOOGO CLASS 회원 → 산 VOD 의 두잉고 강의실
 *  · Next.js 서버(E2E_SERVER=next)에서만 */
"use strict";
const FL = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
// 옮긴 강의실 화면 주소 (shared/screens.js 의 dg-* 와 같게 — 화면을 옮길 때마다 여기에도 더해요)
const DG = ["/home", "/curriculum", "/missions", "/missions?kind=required", "/missions?kind=challenge", "/missions?kind=mind", "/missions/1", "/missions/2", "/missions/9", "/curriculum/nope",
  "/schedule", "/notices", "/notices/nope", "/qna", "/qna?tab=request", "/qna/requests", "/qna/requests/new", "/qna/requests/nope",
  "/docs", "/library", "/library/ebook", "/library/file", "/library/file?tool=calculator", "/library/vod", "/library/vod/nope", "/library/senior", "/library/lesson", "/library/nope", "/bot",
  "/motivation", "/channels", "/partners", "/partners?tab=nope", "/certificate", "/replays", "/replays/nope", "/showcase", "/showcase?w=1", "/notes", "/glossary", "/glossary?q=%EB%A7%88", "/page/nope"];
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
      const extra = await page.evaluate(() => {
        const X = window.DGA, S = X && X.st(); if (!S || !S.D) return [];
        const ws = S.D.weeks, o = ws.find((w) => X.isOpen(w) && w.lessons.length), c = ws.find((w) => !X.isOpen(w) && w.lessons.length);
        // 과제 하나: 열린 주차의 글 · 사진 · 링크 과제 하나씩 + 잠긴 주차 과제 + 없는 과제
        const om = ws.filter((w) => X.isOpen(w)).flatMap((w) => w.missions.map((m) => ({ w, m }))), cm = ws.filter((w) => !X.isOpen(w)).flatMap((w) => w.missions.map((m) => ({ w, m })));
        const one = (t) => { const x = om.find((y) => y.m.type === t); return x && "/missions/" + x.w.no + "/" + x.m.id; };
        return [o && "/curriculum/" + o.lessons[0].id, o && o.lessons[1] && "/curriculum/" + o.lessons[1].id, c && "/curriculum/" + c.lessons[0].id,
          one("text"), one("image"), one("link"), cm[0] && "/missions/" + cm[0].w.no + "/" + cm[0].m.id, "/missions/1/nope"]
          // 공지 하나씩 (사진 · 영상이 있는 공지 먼저) · 내 1:1 요청 (답변 있는 것 · 없는 것) · 남의 요청 (비공개)
          .concat(S.D.notices.slice().sort((a, b) => X.noticeVideos(b).length + (b.images || []).length - X.noticeVideos(a).length - (a.images || []).length).slice(0, 3).map((n) => "/notices/" + n.id))
          .concat(X.myRequests().filter((x) => x.s.id === S.me.id).slice(0, 2).map((x) => "/qna/requests/" + x.q.id))
          .concat(X.myRequests().filter((x) => x.s.id !== S.me.id).slice(0, 1).map((x) => "/qna/requests/" + x.q.id))
          // 자료 하나씩 (VOD · 시니어 가이드 — 처음 · 마지막)
          .concat(["vod", "senior"].flatMap((k) => { const l = S.D.resources[k] || []; return l.length ? ["/library/" + k + "/" + l[0].id, "/library/" + k + "/" + l[l.length - 1].id] : []; }))
          // 제휴채널 탭 · 다시보기 하나씩 (최근 · 처음) · 추가 메뉴
          .concat(window.DB.PARTNER_GROUPS.map((g) => "/partners?tab=" + g.key))
          .concat(((r) => (r.length ? ["/replays/" + r[0].id, "/replays/" + r[r.length - 1].id] : []))(X.replaysSorted()))
          .concat(X.NAV().filter((x) => x.id === "page" && x.sub).map((x) => "/page/" + x.sub)).filter(Boolean);
      });
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
    // 1-3) 과제 제출 (글 과제): 짧게 → 글자 수 · 보완 결과 → 길게 → 통과 (모드마다 제출 기록을 비우고 같은 처음에서)
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 과제 제출");
      await FL.student(page, base, info);
      const MID = "m1-7", T = (x) => x.replace(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/g, "M/D hh:mm");
      const reset = async () => { await page.evaluate((id) => { const S = window.DGA.st(); delete S.P.submissions[id]; window.DGA.saveProgress(); }, MID); await L.flushed(page); };
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 400); out.push(T(await L.domShape(page))); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home"); await reset();
        await L.open(page, base, "/missions/1/" + MID); await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [];
        await step(out, () => page.fill("#sub-text", "짧은 답"));
        await step(out, () => page.click('#submit-form button[type="submit"]'), 700);
        const t1 = await L.toasts(page);
        await step(out, () => page.fill("#sub-text", "E2E 과제 답변이에요 — 첫 상품 후보 세 가지를 골라 봤어요. 마진도 계산해 봤어요."));
        await step(out, () => page.click('#submit-form button[type="submit"]'), 700);
        const t2 = await L.toasts(page);
        return { out, t1, t2, stay: await page.evaluate(() => window.__e2eStay === 1), pass: !!(await page.$("#result .result.pass")) };
      };
      const a = await flow("off"), b = await flow("all");
      await reset();
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
      await run.check(!d.length && b.stay && b.pass && a.t2 === b.t2 && /자동검수 통과|다시 제출/.test(b.t2), "과제 제출(React): 글자 수 · 짧으면 보완 · 길게 쓰면 통과 · 제출 이력 — 누를 때마다 예전 화면과 같은 모양 · 같은 알림", d.slice(0, 1).concat([{ t: [a.t1, b.t1, a.t2, b.t2] }]), page);
      await page.context().close();
    }
    // 1-4) 일정 · 공지 · Q&A 누르기: 달력 앞뒤 달 · 날짜 고르기 · 오늘 · 공지 모두 읽음 · FAQ 분류 · 검색 · 1:1 요청 사진 올리기 · 지우기 · 빈칸 제출 · 등록 → 취소 두 번
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 일정 · 공지 · Q&A");
      await FL.student(page, base, info);
      const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64");
      let qid = "";
      const T = (x) => { x = x.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g, "YYYY-MM-DD hh:mm"); return qid ? x.split(qid).join("QID") : x; };
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 350); out.push(T(await L.domShape(page))); };
      const go = async (h) => { await page.evaluate((x) => { window.ROUTE.hash = x; }, h); await page.waitForTimeout(500); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
        const keep = await page.evaluate(() => JSON.stringify(window.DGA.st().P.readNotices || {}));
        await go("#/schedule"); await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [];
        await step(out, () => page.click("[data-action='cal-move'][data-d='-1']"));
        await step(out, () => page.click("[data-action='cal-move'][data-d='1']"));
        await step(out, () => page.click("[data-action='cal-move'][data-d='1']"));
        if (await page.$(".cal-day:not(.other) .cal-evs")) await step(out, () => page.$eval(".cal-day:not(.other) .cal-evs", (el) => el.click()));
        if (await page.$(".cal-day.other")) await step(out, () => page.$eval(".cal-day.other", (el) => el.click()));
        await step(out, () => page.click("[data-action='cal-today']"));
        // 공지: 모두 읽음 (끝나면 처음 읽음 상태로)
        await go("#/notices");
        if (await page.$("[data-action='read-all']")) await step(out, () => page.click("[data-action='read-all']"));
        await page.evaluate((k) => { const S = window.DGA.st(); S.P.readNotices = JSON.parse(k); window.DGA.saveProgress(); }, keep);
        // FAQ: 분류 · 검색 · 없는 검색어 · 전체 · 하나 펼치기
        await go("#/qna");
        if ((await page.$$("[data-action='faq-cat']")).length > 1) await step(out, () => page.$$eval("[data-action='faq-cat']", (els) => els[1].click()));
        await step(out, () => page.fill("#faq-search", "로그인"), 400);
        await step(out, () => page.fill("#faq-search", "없는검색어zz"), 400);
        await step(out, () => page.click("[data-action='faq-cat'][data-cat='전체']"));
        if (await page.$("details.faq summary")) await step(out, () => page.click("details.faq summary"));
        // 1:1 요청: 남의 글(비공개) · 새 글 · 사진 올리고 지우기 · 빈칸 제출 · 등록 · 취소 두 번
        await go("#/qna/requests");
        let t0 = "";
        if (await page.$("tr[data-action='req-open'][data-mine='0']")) { await page.click("tr[data-action='req-open'][data-mine='0']"); await page.waitForTimeout(300); t0 = await L.toasts(page); }
        await go("#/qna/requests/new");
        await step(out, () => page.setInputFiles("#req-file", { name: "shot.png", mimeType: "image/png", buffer: PNG }), 900);
        await step(out, () => page.click("[data-action='req-remove']"));
        await step(out, () => page.click("#request-form button[type='submit']"));
        const t1 = await L.toasts(page);
        await page.fill("#q-title", "E2E 요청 제목"); await page.fill("#q-body", "E2E 요청 내용이에요.");
        await page.click(".req-cats label.chip-radio:nth-child(2)");
        await page.click("#request-form button[type='submit']"); await page.waitForTimeout(700);
        const t2 = await L.toasts(page);
        qid = decodeURIComponent(new URL(page.url()).pathname.split("/")[3] || "");
        out.push(T(await L.domShape(page)));
        await step(out, () => page.click("[data-action='req-cancel']"));
        await step(out, () => page.click("[data-action='req-cancel']"), 700);
        const t3 = await L.toasts(page), path = new URL(page.url()).pathname;
        qid = "";
        return { out, t: [t0, t1, t2, t3], path, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
      await run.check(!d.length && a.out.length === b.out.length && b.out.length >= 12 && b.stay && JSON.stringify(a.t) === JSON.stringify(b.t) && /요청을 취소/.test(b.t[3]) && b.path === "/qna/requests",
        "일정 · 공지 · Q&A(React): 달력 앞뒤 · 날짜 · 오늘 · 모두 읽음 · FAQ 분류 · 검색 · 사진 올리기 · 지우기 · 빈칸 · 등록 · 취소 — 누를 때마다 예전 화면과 같은 모양 · 같은 알림 (" + b.out.length + "번)", d.slice(0, 1).concat([{ t: [a.t, b.t], n: [a.out.length, b.out.length], path: [a.path, b.path] }]), page);
      await page.context().close();
    }
    // 1-5) 서류 · 자료실 · 계산기 · AI 조교 전체 화면: 이용 안내 팝업(모양 · 확인) · 서류 체크 · 계산기 숫자 · 내 제품 저장 · 불러오기 · 새 제품 · 지우기 · 질문 · 대화 지우기
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 서류 · 자료실 · 조교");
      page.on("dialog", (d) => d.accept());
      await FL.student(page, base, info);
      const T = (x) => x.replace(/\d{1,2}\/\d{1,2} 저장/g, "M/D 저장").replace(/"cp[a-z0-9]{6,}"/g, '"CPID"');
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 350); out.push(T(await L.domShape(page))); };
      const go = async (h) => { await page.evaluate((x) => { window.ROUTE.hash = x; }, h); await page.waitForTimeout(500); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
        const keep = await page.evaluate(() => { const P = window.DGA.st().P; return JSON.stringify({ c: P.calcItems || [], d: P.docs || {}, ch: P.chat || [] }); });
        await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [], gate = {};
        // 자료실: 들어올 때 이용 안내 팝업 → 확인
        await go("#/library");
        gate.open = { shape: await L.domShape(page, "modal-root"), cls: await page.evaluate(() => document.body.classList.contains("lib-gated")) };
        if (await page.$("#modal-root .lib-gate-ok")) await page.click("#modal-root .lib-gate-ok");
        await page.waitForTimeout(300);
        gate.closed = { html: await page.evaluate(() => document.getElementById("modal-root").innerHTML.trim()), cls: await page.evaluate(() => document.body.classList.contains("lib-gated")) };
        out.push(await L.domShape(page));
        // 서류 준비: 체크 → 다시 (처음 그대로)
        await go("#/docs");
        if (await page.$("[data-action='toggle-doc']")) { await step(out, () => page.click("[data-action='toggle-doc']")); await step(out, () => page.click("[data-action='toggle-doc']")); }
        // 마진 계산기
        await go("#/library/file?tool=calculator");
        if (await page.$("#modal-root .lib-gate-ok")) await page.click("#modal-root .lib-gate-ok");
        await step(out, () => page.fill("#c-price", "50000"));
        await step(out, () => page.fill("#c-ad", "60"));
        await step(out, () => page.fill("#c-ad", "0"));
        let t = [];
        if (await page.$("#calc-save")) {
          await step(out, () => page.click("#calc-save button[type='submit']")); t.push(await L.toasts(page));
          await page.fill("#c-name", "E2E 제품");
          await step(out, () => page.click("#calc-save button[type='submit']"), 500); t.push(await L.toasts(page));
          await step(out, () => page.fill("#c-price", "90000"));
          await step(out, () => page.click("#calc-save button[type='submit']"), 500);
          await step(out, () => page.click("[data-action='calc-new']"));
          await step(out, () => page.click("[data-action='calc-load']"), 500);
          await step(out, () => page.click("[data-action='calc-del']"), 500); t.push(await L.toasts(page));
        }
        // AI 조교 전체 화면: 질문 칩 → 대화 지우기
        await go("#/bot");
        if (await page.$(".bot-full .chip")) await step(out, () => page.$eval(".bot-full .chip", (el) => el.click()), 2500);
        await step(out, () => page.click(".bot-full ~ p [data-action='clear-chat']"), 400);
        await page.evaluate((k) => { const S = window.DGA.st(), o = JSON.parse(k); S.P.calcItems = o.c; S.P.docs = o.d; S.P.chat = o.ch; window.DGA.saveProgress(); }, keep);
        await L.flushed(page);
        return { out, gate, t, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean), gd = L.shapeDiff(a.gate.open.shape, b.gate.open.shape);
      await run.check(!d.length && !gd && a.out.length === b.out.length && b.out.length >= 6 && b.stay && b.gate.open.cls && !b.gate.closed.cls && !b.gate.closed.html && JSON.stringify(a.t) === JSON.stringify(b.t),
        "서류 · 자료실 · 계산기 · AI 조교(React): 이용 안내 팝업 · 서류 체크 · 계산 · 내 제품 저장 · 불러오기 · 지우기 · 질문 · 대화 지우기 — 누를 때마다 예전 화면과 같은 모양 · 같은 알림 (" + b.out.length + "번)", d.slice(0, 1).concat([{ gd, gate: [a.gate.closed, b.gate.closed, a.gate.open.cls, b.gate.open.cls], t: [a.t, b.t], n: [a.out.length, b.out.length] }]), page);
      await page.context().close();
    }
    // 1-6) 동기부여 · 다시보기 · 모범 과제 · 학습 노트 · 용어 사전 누르기: 영상 고르기 · 주차 칩 · 다 봤어요 · 사진 크게 보기 · 회고 적기 · 용어 분류 · 검색
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 동기부여 · 다시보기 · 노트 · 용어");
      await FL.student(page, base, info);
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 350); out.push(await L.domShape(page)); };
      const go = async (h) => { await page.evaluate((x) => { window.ROUTE.hash = x; }, h); await page.waitForTimeout(500); };
      const flow = async (mode) => {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
        const keep = await page.evaluate(() => { const P = window.DGA.st().P; return JSON.stringify({ r: P.replays || {}, j: P.journal || {} }); });
        await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [], t = [], modal = [];
        await go("#/motivation");
        if ((await page.$$("[data-action='mv-pick']")).length > 1) await step(out, () => page.$$eval("[data-action='mv-pick']", (els) => els[1].click()));
        await go("#/replays");
        const rk = await page.$$("[data-action='rp-week']"); if (rk.length > 1) { await step(out, () => page.$$eval("[data-action='rp-week']", (els) => els[1].click())); await step(out, () => page.click("[data-action='rp-week'][data-k='all']")); }
        if (await page.$(".rp-card")) {
          await page.click(".rp-card"); await page.waitForTimeout(500); out.push(await L.domShape(page));
          await step(out, () => page.click("[data-action='toggle-replay']")); t.push(await L.toasts(page));
          await step(out, () => page.click("[data-action='toggle-replay']"));
        }
        await go("#/showcase");
        if ((await page.$$("[data-action='sc-week']")).length > 1) { await step(out, () => page.$$eval("[data-action='sc-week']", (els) => els[1].click())); await step(out, () => page.click("[data-action='sc-week'][data-k='all']")); }
        if (await page.$("[data-action='sc-zoom']")) {
          await page.click("[data-action='sc-zoom']"); await page.waitForTimeout(400); modal.push(await L.domShape(page, "modal-root"));
          await page.click("#modal-root .modal-actions [data-action='modal-close']"); await page.waitForTimeout(300); modal.push(await page.evaluate(() => document.getElementById("modal-root").innerHTML.trim()));
        }
        await go("#/notes");
        if (await page.$("[data-journal]")) {
          await step(out, () => page.fill("[data-journal]", "E2E 회고 한 줄"), 1000);
          await step(out, () => page.fill("[data-journal]", ""), 1000);
        }
        await go("#/glossary");
        if ((await page.$$("[data-action='gl-cat']")).length > 1) await step(out, () => page.$$eval("[data-action='gl-cat']", (els) => els[1].click()));
        await step(out, () => page.fill("#gl-search", "마"), 400);
        await step(out, () => page.fill("#gl-search", ""), 400);
        if (await page.$("[data-action='gl-cat'][data-cat='전체']")) await step(out, () => page.click("[data-action='gl-cat'][data-cat='전체']"));
        await page.evaluate((k) => { const S = window.DGA.st(), o = JSON.parse(k); S.P.replays = o.r; S.P.journal = o.j; window.DGA.saveProgress(); }, keep);
        await L.flushed(page);
        return { out, t, modal, stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean), md = a.modal[0] && b.modal[0] ? L.shapeDiff(a.modal[0], b.modal[0]) : null;
      await run.check(!d.length && !md && a.out.length === b.out.length && b.out.length >= 6 && b.stay && JSON.stringify(a.t) === JSON.stringify(b.t) && a.modal.length === b.modal.length && (b.modal[1] || "") === "",
        "동기부여 · 다시보기 · 모범 과제 · 노트 · 용어(React): 영상 고르기 · 주차 칩 · 다 봤어요 · 사진 크게 보기 · 회고 적기 · 분류 · 검색 — 누를 때마다 예전 화면과 같은 모양 (" + b.out.length + "번)", d.slice(0, 1).concat([{ md, t: [a.t, b.t], n: [a.out.length, b.out.length], m: [a.modal.length, b.modal.length, b.modal[1]] }]), page);
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
    // 1-8) 비메오 강의 영상 (2026-11-09): 강사센터 ‘강의 수정’ 영상 칸에 비메오 주소 → 저장 · 다시 열면 그 주소 · 목록 ‘영상 연결됨’ · 잘못된 주소는 안내
    //      → 수강생 강의 화면: 비메오 카드(예전 화면 = React · PC · 휴대폰) · 누르면 그 자리에서 비메오 재생기 → 끝나면 원래 값으로 되돌려요 (비메오는 시험 환경에서 막혀 있어 가짜 재생기)
    {
      const VM = "https://vimeo.com/1244973319";
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "비메오 · 강사센터");
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, "all");
      // 강사센터 커리큘럼 (2026-11-09): 처음엔 지금 기수가 쓰는 커리큘럼 · 다른 커리큘럼을 고르면 ‘지금 N기 수강생 화면에는 …’ 안내 → ‘… 고치기’로 바로 돌아가요
      await L.open(ap, base, "/center/curriculum"); await ap.waitForTimeout(600);
      const curNow = await ap.evaluate(() => { const now = window.DB.currentCohort(window.ADM.IID()); return { want: (now && now.curriculumId) || "main", sel: document.querySelector("#cur-pick").value, warn: !!document.querySelector(".a-cur-warn"), opts: Array.from(document.querySelectorAll("#cur-pick option")).map((o) => o.value) }; });
      const alt = curNow.opts.find((x) => x !== curNow.want); let other = null;
      if (alt) {
        await ap.selectOption("#cur-pick", alt); await ap.waitForTimeout(600);
        other = await ap.evaluate(() => ({ warn: (document.querySelector(".a-cur-warn") || {}).textContent || "", go: !!document.querySelector('.a-cur-warn [data-action="cur-go"]') }));
        // ‘N기가 이 커리큘럼 쓰기’: 그 기수 설계 창이 이 커리큘럼으로 골라진 채 열려요 (저장하지 않고 닫아요)
        if (await ap.$('.a-cur-warn [data-action="cur-use"]')) { await ap.click('.a-cur-warn [data-action="cur-use"]'); await ap.waitForTimeout(600); other.use = await ap.evaluate(() => { const f = document.getElementById("plan-form"); return f ? f.querySelector('[name="pl-cur"]').value : null; }); await ap.click('[data-action="modal-close"]').catch(() => {}); await ap.waitForTimeout(400); }
        if (other.go) { await ap.click('.a-cur-warn [data-action="cur-go"]'); await ap.waitForTimeout(600); }
        other.back = await ap.evaluate(() => ({ sel: document.querySelector("#cur-pick").value, warn: !!document.querySelector(".a-cur-warn") }));
      }
      await run.check(curNow.sel === curNow.want && !curNow.warn && (!alt || (/수강생 화면에는/.test(other.warn) && other.go && other.use === alt && other.back.sel === curNow.want && !other.back.warn)),
        "강사센터 커리큘럼: 처음엔 지금 기수가 쓰는 커리큘럼 · 다른 커리큘럼을 고르면 ‘지금 N기 수강생 화면에는 …’ 안내 · ‘N기가 이 커리큘럼 쓰기’(설계 창) · 바로 돌아가기", { curNow, other }, ap);
      const field = 'form#coll-form input[name="youtubeId"]';
      // 강사센터 ‘편집할 커리큘럼’을 이 수강생 기수가 쓰는 커리큘럼으로 (기수마다 커리큘럼이 다를 수 있어요 — 강의 번호는 같아도 다른 강의)
      const pickCur = async () => {
        const cur = await ap.evaluate((sid) => { const d = window.DB.data, s = (d.students || []).find((x) => x.id === sid), co = s && (d.cohorts || []).find((c) => c.id === s.cohortId); return (co && co.curriculumId) || "main"; }, info.student.sid);
        const has = await ap.$$eval("#cur-pick option", (os) => os.map((o) => o.value)).catch(() => []);
        if (has.indexOf(cur) >= 0 && (await ap.$eval("#cur-pick", (x) => x.value)) !== cur) { await ap.selectOption("#cur-pick", cur); await ap.waitForTimeout(600); }
        return cur;
      };
      const edit = async (val) => {
        await L.open(ap, base, "/center/curriculum"); await ap.waitForTimeout(600); await pickCur();
        const b = await ap.$('[data-action="item-edit"][data-coll="lesson"]'); if (!b) return null;
        const lid = await b.getAttribute("data-id"); await b.click(); await ap.waitForSelector(field, { timeout: 5000 });
        const was = await ap.$eval(field, (x) => x.value), label = await ap.$eval(field, (x) => (x.closest(".a-field").querySelector("label") || {}).textContent || "");
        await ap.fill(field, val); await ap.click('button[type="submit"][form="coll-form"]'); await ap.waitForTimeout(700);
        const err = await ap.$eval("#coll-error", (x) => x.textContent).catch(() => "");
        if (err) await ap.click('[data-action="modal-close"]').catch(() => {});
        else await L.flushed(ap);
        return { lid, was, label, err };
      };
      const reopen = async () => {
        await L.open(ap, base, "/center/curriculum"); await ap.waitForTimeout(600); await pickCur();
        const pill = await ap.evaluate(() => { const b = document.querySelector('[data-action="item-edit"][data-coll="lesson"]'), li = b && b.closest("li"); return li ? Array.from(li.querySelectorAll(".a-pill")).map((x) => x.textContent).join(",") : null; });
        await ap.click('[data-action="item-edit"][data-coll="lesson"]'); await ap.waitForSelector(field, { timeout: 5000 });
        const v = await ap.$eval(field, (x) => x.value); await ap.click('[data-action="modal-close"]').catch(() => {}); await ap.waitForTimeout(300);
        return { v, pill };
      };
      const bad = await edit("vimeo.com/abc"), ok = await edit(VM), again = await reopen();
      await run.check(!!bad && /영상 주소를 확인해 주세요/.test(bad.err) && /비메오/.test(bad.err) && /유튜브 · 비메오/.test(bad.label) && !!ok && !ok.err && again.v === VM && /영상 연결됨/.test(String(again.pill)),
        "강사센터 강의 수정: 영상 칸(유튜브 · 비메오)에 비메오 주소 저장 → 다시 열면 그 주소 · 목록 ‘영상 연결됨’ · 잘못된 주소는 안내", { bad, ok, again }, ap);
      // 수강생 강의 화면 (예전 화면 · React · PC · 휴대폰)
      const look = async (vp) => {
        const sp = await L.newPage(browser, { viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
        run.watch(sp, "비메오 · 강의실 " + vp.width);
        await sp.route(/player\.vimeo\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><body style='margin:0;background:#000'></body>" }));
        await FL.student(sp, base, info);
        const out = {};
        for (const mode of ["off", "all"]) {
          await L.reactCookie(sp, base, mode); await L.open(sp, base, "/curriculum/" + ok.lid); await sp.waitForTimeout(500);
          const shape = await L.domShape(sp);
          const card = await sp.evaluate(() => { const v = document.querySelector(".video[data-vm]"), x = v && v.querySelector(".vp-ext"), ph = v && v.querySelector(".video-ph"), r = ph && ph.getBoundingClientRect(), vr = v && v.getBoundingClientRect(); return v ? { vm: v.dataset.vm, ext: x && x.getAttribute("href"), txt: x && x.textContent.trim(), fill: !!(r && vr && Math.abs(r.height - vr.height) < 2) } : null; });
          if (vp.width < 600) await sp.tap(".video[data-vm] .vp-play"); else await sp.click(".video[data-vm] .vp-play");
          await sp.waitForTimeout(600);
          const play = await sp.evaluate(() => { const f = document.querySelector(".video iframe"), o = document.querySelector(".video .video-out"); return { src: f ? f.getAttribute("src") : "", allow: f ? f.getAttribute("allow") : "", out: o ? o.textContent.trim() : "", href: o ? o.getAttribute("href") : "" }; });
          out[mode] = { shape, card, play };
        }
        await sp.context().close();
        return out;
      };
      const pc = await look({ width: 1280, height: 900 }), mb = await look({ width: 390, height: 844 });
      const good = (o) => !!o.card && /^https:\/\/player\.vimeo\.com\/video\/1244973319\?/.test(o.card.vm) && o.card.ext === VM && o.card.txt === "비메오에서 보기" && o.card.fill &&
        /^https:\/\/player\.vimeo\.com\/video\/1244973319\?.*autoplay=1/.test(o.play.src) && /fullscreen/.test(o.play.allow) && /비메오에서 보기/.test(o.play.out) && o.play.href === VM;
      const dPc = L.shapeDiff(pc.off.shape, pc.all.shape), dMb = L.shapeDiff(mb.off.shape, mb.all.shape);
      await run.check([pc.off, pc.all, mb.off, mb.all].every(good) && !dPc && !dMb, "수강생 강의 화면: 비메오 카드(영상 칸을 꽉 채움 · 비메오에서 보기 · 예전 화면 = React · PC · 휴대폰) → 누르면 그 자리에서 비메오 재생기",
        { pc: { off: [pc.off.card, pc.off.play], all: [pc.all.card, pc.all.play] }, mb: { off: [mb.off.card, mb.off.play], all: [mb.all.card, mb.all.play] }, d: [dPc, dMb] });
      // 되돌리기
      const back = await edit(ok.was || "");
      await run.check(!!back && !back.err, "되돌리기: 강의 영상 칸을 원래 값으로", back, ap);
      await ap.context().close();
    }
    // 1-9) 주차가 강의일 5일 전부터 열려요 (2026-11-09): 강사 ‘수강생 화면’(체험 계정과 달리 실제 일정 그대로)으로 — 3기 1주차 강의 11/21(토)
    //      → 11/15 엔 잠김(‘11/16부터 공개’) · 11/16 엔 열림 (예전 화면 = React · 브라우저 시계만 그 날로)
    {
      const at = async (iso) => {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Seoul" });
        await ctx.addInitScript(() => { try { localStorage.setItem("dc:clean", "1"); } catch (e) { /* #주소로 */ } }); // L.newPage 와 같게 (깨끗한 주소)
        await ctx.clock.install({ time: new Date(iso) });
        const pg = await ctx.newPage(); run.watch(pg, "주차 열림 " + iso.slice(0, 10));
        await FL.instructor(pg, base, info);
        const out = {};
        for (const mode of ["off", "all"]) {
          await L.reactCookie(pg, base, mode); await L.open(pg, base, "/center"); await pg.waitForTimeout(600);
          await pg.click('[data-action="preview"]'); await pg.waitForTimeout(900);
          await pg.evaluate(() => { window.ROUTE.hash = "#/curriculum"; }); await pg.waitForTimeout(900);
          out[mode] = await pg.evaluate(() => { const c = document.querySelector(".cw"), co = window.DB.currentCohort((window.DB.session.student() || {}).instructorId); return { co: co && co.name, cls: window.DB.classDate(co, 1), unlock: window.DB.weekUnlock(co, 1), locked: !!(c && c.classList.contains("cw-locked")), msg: c ? (c.querySelector(".cw-lock") || {}).textContent || "" : null, lessons: c ? c.querySelectorAll("a[href*='curriculum/']").length : 0 }; });
          await pg.evaluate(() => { window.ROUTE.hash = "#/center"; }).catch(() => {});
        }
        await ctx.close();
        return out;
      };
      const d15 = await at("2026-11-15T12:00:00+09:00"), d16 = await at("2026-11-16T09:00:00+09:00");
      const lockedOk = (o) => o.co === "3기" && o.cls === "2026-11-21" && o.unlock === "2026-11-16" && o.locked && /11\/16|11월 16일/.test(o.msg);
      const openOk = (o) => o.co === "3기" && !o.locked && o.lessons >= 1;
      await run.check(lockedOk(d15.off) && lockedOk(d15.all) && openOk(d16.off) && openOk(d16.all),
        "주차 열림: 3기 1주차 강의 11/21 → 11/15 엔 잠김(‘11/16부터 공개’) · 11/16 엔 열림 (강의일 5일 전 · 강사 ‘수강생 화면’ · 예전 화면 = React)", { d15, d16 });
    }
    // 1-10) 수강생마다 커리큘럼 (2026-11-09): 강사센터 › 수강생 관리 › 상세 ‘커리큘럼’ → 이 수강생만 다른 커리큘럼 → 수강생 주차별 강의(예전 화면 = React)가 그 커리큘럼
    //       → ‘기수 커리큘럼 그대로’로 되돌리면 다시 기수 커리큘럼
    {
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "수강생 커리큘럼 · 강사센터");
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, "all");
      const setCur = async (pick) => {
        await L.open(ap, base, "/center/students"); await ap.waitForTimeout(600);
        await ap.evaluate(() => { const t = Array.from(document.querySelectorAll('[data-action="stu-tab"]')).find((b) => /^수강 중/.test(b.textContent.trim())); if (t) t.click(); }); await ap.waitForTimeout(500); // ‘수강 중’ 탭
        await ap.click('[data-action="student-open"][data-id="' + info.student.sid + '"]'); await ap.waitForSelector("#student-form", { timeout: 5000 });
        const o = await ap.evaluate(() => { const sel = document.querySelector("#sf-cur"), co = window.DB.cohort(window.DB.student(document.querySelector("#student-form").dataset.id).cohortId); return sel ? { has: true, cohortCur: (co && co.curriculumId) || "main", opts: Array.from(sel.options).map((x) => x.value), label: sel.closest(".a-field").querySelector("label").textContent } : { has: false }; });
        if (!o.has) { await ap.click('[data-action="modal-close"]').catch(() => {}); return o; }
        const v = pick(o); await ap.selectOption("#sf-cur", v); await ap.click('button[type="submit"][form="student-form"]'); await ap.waitForTimeout(700); await L.flushed(ap);
        o.saved = await ap.evaluate((sid) => window.DB.student(sid).curriculumId || "", info.student.sid); o.picked = v;
        // 그 수강생이 봐야 할 주차 (기수 그대로면 진행 주차까지) — 주차 수 · 제목 · 강의 수로 비교 (커리큘럼끼리 1주차 제목이 같을 수 있어요)
        o.want = await ap.evaluate((sid) => window.DB.weeksOf(window.DB.studentCohort(window.DB.student(sid))).map((w) => w.title + "/" + w.lessons.length).join(" | "), info.student.sid);
        return o;
      };
      const weekTitle = async (sp) => sp.evaluate(() => { const X = window.DGA, S = X && X.st(); return S ? S.D.weeks.map((w) => w.title + "/" + w.lessons.length).join(" | ") : null; });
      const look = async () => {
        const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } }); run.watch(sp, "수강생 커리큘럼 · 강의실");
        await FL.student(sp, base, info); const out = {};
        for (const mode of ["off", "all"]) { await L.reactCookie(sp, base, mode); await L.open(sp, base, "/curriculum"); await sp.waitForTimeout(600); out[mode] = { title: await weekTitle(sp), shape: await L.domShape(sp) }; }
        await sp.context().close(); return out;
      };
      const a1 = await setCur((o) => o.opts.find((x) => x && x !== o.cohortCur)), l1 = await look();
      const a2 = await setCur(() => ""), l2 = await look();
      await run.check(a1.has && /커리큘럼/.test(a1.label) && a1.saved === a1.picked && l1.off.title === a1.want && l1.all.title === a1.want && !L.shapeDiff(l1.off.shape, l1.all.shape) &&
        a2.saved === "" && l2.off.title === a2.want && l2.all.title === a2.want && a1.want !== a2.want,
        "수강생 커리큘럼: 상세에서 이 수강생만 다른 커리큘럼 → 주차별 강의가 그 커리큘럼(예전 화면 = React) → ‘기수 커리큘럼 그대로’로 되돌리면 기수 커리큘럼", { a1: Object.assign({}, a1, { want: a1.want }), t1: [l1.off.title, l1.all.title], a2: { saved: a2.saved, want: a2.want }, t2: [l2.off.title, l2.all.title] }, ap);
      await ap.context().close();
    }
    // 1-11) 글 속 주소는 파란 링크 · 새 창 (2026-11-09): 강사센터 › 과제 › 과제 설명에 주소 → 수강생 과제 상세(예전 화면 = React)에서 a.auto-link(새 창) → 되돌리기
    {
      const URL1 = "https://www.doogoclass.com/curriculum/l1-1";
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "주소 링크 · 강사센터");
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, "all");
      const fld = 'form#coll-form textarea[name="desc"]';
      const edit = async (val) => {
        await L.open(ap, base, "/center/missions"); await ap.waitForTimeout(600);
        const cur = await ap.evaluate((sid) => { const d = window.DB.data, s = (d.students || []).find((x) => x.id === sid), co = s && (d.cohorts || []).find((c) => c.id === s.cohortId); return (s && s.curriculumId) || (co && co.curriculumId) || "main"; }, info.student.sid);
        const has = await ap.$$eval("#cur-pick option", (os) => os.map((o) => o.value)).catch(() => []);
        if (has.indexOf(cur) >= 0 && (await ap.$eval("#cur-pick", (x) => x.value)) !== cur) { await ap.selectOption("#cur-pick", cur); await ap.waitForTimeout(600); }
        const b = await ap.$('[data-action="item-edit"][data-coll="mission"]'); if (!b) return null;
        const mid = await b.getAttribute("data-id"); await b.click(); await ap.waitForSelector(fld, { timeout: 5000 });
        const was = await ap.$eval(fld, (x) => x.value);
        await ap.fill(fld, typeof val === "function" ? val(was) : val); await ap.click('button[type="submit"][form="coll-form"]'); await ap.waitForTimeout(700);
        const err = await ap.$eval("#coll-error", (x) => x.textContent).catch(() => "");
        if (err) await ap.click('[data-action="modal-close"]').catch(() => {}); else await L.flushed(ap);
        return { mid, was, err };
      };
      const ok = await edit((was) => (was ? was + "\n" : "") + "어려우시다면 여기를 보세요! " + URL1 + ".");
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(sp, "주소 링크 · 과제 상세");
      await FL.student(sp, base, info); await L.reactCookie(sp, base, "all"); await L.open(sp, base, "/home"); await sp.waitForTimeout(500);
      const href = ok && await sp.evaluate((mid) => { const X = window.DGA, S = X && X.st(), w = S && S.D && S.D.weeks.find((x) => x.missions.some((m) => m.id === mid)); return w ? "/missions/" + w.no + "/" + mid : null; }, ok.mid);
      const out = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(sp, base, mode); await L.open(sp, base, href || "/missions/1"); await sp.waitForTimeout(500);
        out[mode] = await sp.evaluate((u) => { const a = Array.from(document.querySelectorAll("a.auto-link")).find((x) => x.getAttribute("href") === u); if (!a) return { miss: location.pathname, body: document.body.innerText.slice(0, 300) }; const p = a.parentElement, c = getComputedStyle(a); return { txt: a.textContent, target: a.target, rel: a.rel, after: (p.textContent.split(u)[1] || "").slice(0, 1), color: c.color, line: c.textDecorationLine }; }, URL1);
        out[mode].shape = await L.domShape(sp);
        // 과제 목록 카드 (2026-11-09): 설명 · 제출 방식 아무 곳이나 누르면 과제 상세 · 설명 속 주소(새 창) · ‘과제 제출’ 버튼은 따로 눌려요
        await L.open(sp, base, (href || "/missions/1").split("/").slice(0, 3).join("/")); await sp.waitForTimeout(500);
        const card = await sp.evaluate(({ mid, u }) => {
          const a = document.querySelector('.mcard h3 a[href$="/' + mid + '"]'), c = a && a.closest(".mcard"); if (!c) return null;
          c.scrollIntoView({ block: "center", behavior: "instant" });
          const d = c.querySelector(".mcard-desc"), ty = c.querySelector(".mcard-type"), g = c.querySelector(".mcard-go"), l = d && Array.from(d.querySelectorAll("a.auto-link")).find((x) => x.getAttribute("href") === u);
          const at = (el, dx, dy) => { const r = el.getClientRects()[0] || el.getBoundingClientRect(); return document.elementFromPoint(r.left + (dx == null ? r.width / 2 : dx), r.top + (dy == null ? r.height / 2 : dy)); };
          const hit = (el) => !el ? null : el.closest("a.auto-link") ? "link" : el.closest(".mcard-go") ? "go" : el.closest(".mcard h3 a") ? "card" : String(el.className || el.tagName);
          const r = d.getBoundingClientRect();
          return { desc: hit(at(d, 8, 8)), type: hit(at(ty, 8)), link: l ? hit(at(l)) : null, target: l ? l.target : null, go: hit(at(g)), x: r.left + 8, y: r.top + 8 };
        }, { mid: ok && ok.mid, u: URL1 });
        if (card) { await sp.mouse.click(card.x, card.y); await sp.waitForTimeout(700); const lu = new URL(sp.url()); card.after = lu.pathname + lu.hash; }
        out[mode].card = card;
      }
      await sp.context().close();
      const cardOk = (c) => !!c && c.desc === "card" && c.type === "card" && c.link === "link" && c.target === "_blank" && c.go === "go" && !!ok && c.after.indexOf(ok.mid) >= 0;
      const good = (o) => !!o && o.txt === URL1 && o.target === "_blank" && /noopener/.test(o.rel) && o.after === "." && o.color === "rgb(26, 111, 224)" && /underline/.test(o.line) && cardOk(o.card);
      const d = out.off && out.all ? L.shapeDiff(out.off.shape, out.all.shape) : "없음";
      await run.check(!!ok && !ok.err && !!href && good(out.off) && good(out.all) && !d, "과제 설명 속 주소 → 파란 밑줄 링크 · 새 창 (끝 마침표는 링크 밖 · 예전 화면 = React) · 과제 목록 카드는 어디를 눌러도 과제 상세(주소 · 제출 버튼은 따로)",
        { ok, href, off: out.off && Object.assign({}, out.off, { shape: undefined }), all: out.all && Object.assign({}, out.all, { shape: undefined }), d });
      const back = ok && await edit(ok.was || "");
      await run.check(!!back && !back.err, "되돌리기: 과제 설명을 원래 글로", back, ap);
      await ap.context().close();
    }
    // 1-12) 수정 창 ‘복사’ (2026-11-09): 지금 창 내용(저장 안 한 고침 포함) → 복사본 창 → 저장하면 원본 바로 아래 · 원본은 그대로 · 새 번호
    //       강의(같은 주차) · 과제(다른 주차 → 그 주차 끝 · 자동검수 같은 숨은 값까지) · 실무 체크리스트 · 주차(맨 끝 · 강의 · 과제도 새 번호) → 수강생 화면(예전 = React) → 지우기
    {
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "복사 · 강사센터");
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, "all");
      const go = async (p) => {
        await L.open(ap, base, p); await ap.waitForTimeout(600);
        const cur = await ap.evaluate((sid) => { const d = window.DB.data, s = (d.students || []).find((x) => x.id === sid), co = s && (d.cohorts || []).find((c) => c.id === s.cohortId); return (s && s.curriculumId) || (co && co.curriculumId) || "main"; }, info.student.sid);
        const has = await ap.$$eval("#cur-pick option", (os) => os.map((o) => o.value)).catch(() => []);
        if (has.indexOf(cur) >= 0 && (await ap.$eval("#cur-pick", (x) => x.value)) !== cur) { await ap.selectOption("#cur-pick", cur); await ap.waitForTimeout(600); }
      };
      const weeks = () => ap.evaluate(() => JSON.parse(JSON.stringify(window.DB.curriculum(window.ADM.IID(), window.ADM.ui.curId).weeks)));
      const docs = () => ap.evaluate(() => JSON.parse(JSON.stringify(window.ADM.C().docsGuide || [])));
      const modal = () => ap.evaluate(() => { const r = document.getElementById("modal-root"), f = r.querySelector("#coll-form"); return { title: (r.querySelector("#a-modal-title") || {}).textContent, note: (r.querySelector(".a-copy-note") || {}).textContent || "", copyBtn: !!r.querySelector('[data-action="item-copy"]'), del: !!r.querySelector('[data-action="item-delete"]'), week: f && f.cpWeek ? f.cpWeek.value : null, t: f && f.title ? f.title.value : null, save: (r.querySelector('button[type="submit"][form="coll-form"]') || {}).textContent }; });
      const open = async (coll, id) => { await ap.click('[data-action="item-edit"][data-coll="' + coll + '"][data-id="' + id + '"]'); await ap.waitForSelector("form#coll-form", { timeout: 5000 }); };
      const copy = async () => { await ap.click('#modal-root [data-action="item-copy"]'); await ap.waitForSelector('form#coll-form[data-copy="1"]', { timeout: 5000 }); };
      const save = async () => { await ap.click('button[type="submit"][form="coll-form"]'); await ap.waitForTimeout(700); await L.flushed(ap); };
      const del = async (coll, id) => { await open(coll, id); await ap.click('#modal-root [data-action="item-delete"]'); await ap.waitForSelector('#modal-root [data-action="confirm-ok"]'); await ap.click('#modal-root [data-action="confirm-ok"]'); await ap.waitForTimeout(500); await L.flushed(ap); };
      // (가) 강의: 제목을 고친 채(저장 안 함) ‘복사’ → 복사본 창 → 저장 → 같은 주차 원본 바로 아래 · 원본 제목 그대로
      await go("/center/curriculum");
      const w0 = await weeks(), d0 = await docs(), wk = w0[0], l0 = wk.lessons[0];
      await open("lesson", l0.id); await ap.fill('form#coll-form input[name="title"]', l0.title + " 새판"); await copy();
      const m1 = await modal(); await save();
      const w1 = await weeks(), la = w1[0].lessons, lc = la[1] || {};
      const lessonOk = m1.title === "강의 복사" && /내용을 복사했어요/.test(m1.note) && !m1.copyBtn && !m1.del && m1.week === String(wk.no) && m1.t === l0.title + " 새판 (복사)" && /복사본 저장/.test(m1.save) &&
        la.length === wk.lessons.length + 1 && la[0].title === l0.title && lc.title === l0.title + " 새판 (복사)" && !!lc.id && lc.id !== l0.id && lc.youtubeId === l0.youtubeId && (lc.desc || "") === (l0.desc || "");
      // (나) 과제: 다른 주차(2주차)로 → 그 주차 맨 끝 · 자동검수 · 종류 그대로 · 1주차는 그대로
      await go("/center/missions");
      const mo = w1[0].missions[0]; await open("mission", mo.id); await copy();
      const m2 = await modal(); await ap.selectOption("#cp-week", String(w1[1].no)); await save();
      const w2 = await weeks(), mc = w2[1].missions[w2[1].missions.length - 1] || {};
      const missionOk = m2.title === "과제 복사" && m2.week === String(w1[0].no) && w2[0].missions.length === w1[0].missions.length && w2[1].missions.length === w1[1].missions.length + 1 &&
        mc.title === mo.title + " (복사)" && mc.id && mc.id !== mo.id && JSON.stringify(mc.check || {}) === JSON.stringify(mo.check || {}) && mc.kind === mo.kind && mc.type === mo.type && JSON.stringify(mc.steps || []) === JSON.stringify(mo.steps || []);
      // (다) 실무 체크리스트 (서류 단계) → 원본 바로 아래
      await go("/center/docs");
      const dOk0 = d0.length > 0; let docOk = false, dc = {};
      if (dOk0) { await open("doc", d0[0].id); await copy(); await save(); const d1 = await docs(); dc = d1[1] || {}; docOk = d1.length === d0.length + 1 && d1[0].id === d0[0].id && dc.title === d0[0].title + " (복사)" && dc.id !== d0[0].id; }
      // (라) 주차 → 맨 끝 주차 · 그 주차의 강의 · 과제도 새 번호 (진도 · 제출이 섞이지 않게)
      await go("/center/curriculum");
      await open("week", String(w2[0].no)); await copy(); const m4 = await modal(); await save();
      const w4 = await weeks(), wc = w4[w4.length - 1] || {}, oldIds = new Set(w2.flatMap((w) => w.lessons.map((x) => x.id).concat(w.missions.map((x) => x.id))));
      const weekOk = /맨 끝 주차로/.test(m4.note) && m4.week === null && w4.length === w2.length + 1 && wc.no === w4.length && wc.title === w2[0].title + " (복사)" && wc.lessons.length === w2[0].lessons.length && wc.missions.length === w2[0].missions.length &&
        wc.lessons.concat(wc.missions).every((x) => !oldIds.has(x.id));
      await run.check(lessonOk && missionOk && dOk0 && docOk && weekOk, "수정 창 ‘복사’: 강의(원본 바로 아래 · 저장 안 한 고침까지 · 원본 그대로) · 과제(다른 주차 끝 · 자동검수 그대로) · 실무 체크리스트 · 주차(맨 끝 · 새 번호)",
        { lessonOk, m1, lc: { t: lc.title, id: lc.id }, missionOk, m2, mc: { t: mc.title, check: mc.check, kind: mc.kind }, docOk, dc: dc.title, weekOk, m4, wc: { no: wc.no, t: wc.title } }, ap);
      // (마) 수강생 주차별 강의에 복사본 (예전 화면 = React)
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(sp, "복사 · 수강생");
      await FL.student(sp, base, info); const seen = {};
      for (const mode of ["off", "all"]) { await L.reactCookie(sp, base, mode); await L.open(sp, base, "/curriculum"); await sp.waitForTimeout(600); seen[mode] = await sp.evaluate((t) => document.body.innerText.indexOf(t) >= 0, l0.title + " 새판 (복사)"); seen[mode + "S"] = await L.domShape(sp); }
      await sp.context().close();
      const dS = L.shapeDiff(seen.offS, seen.allS);
      await run.check(seen.off && seen.all && !dS, "수강생 주차별 강의: 복사한 강의가 보여요 (예전 화면 = React)", { off: seen.off, all: seen.all, d: dS });
      // (바) 복사본 지우기 → 처음 그대로
      await del("week", String(wc.no)); await del("lesson", lc.id);
      await go("/center/missions"); await del("mission", mc.id);
      if (docOk) { await go("/center/docs"); await del("doc", dc.id); }
      await go("/center/curriculum");
      const wz = await weeks(), dz = await docs(), sh = (ws) => JSON.stringify(ws.map((w) => [w.no, w.title, w.lessons.map((x) => x.id), w.missions.map((x) => x.id)]));
      await run.check(sh(wz) === sh(w0) && JSON.stringify(dz.map((x) => x.id)) === JSON.stringify(d0.map((x) => x.id)), "복사본 지우기: 커리큘럼 · 과제 · 실무 체크리스트가 처음 그대로", { wz: sh(wz).slice(0, 300), w0: sh(w0).slice(0, 300) }, ap);
      await ap.context().close();
    }
    // 1-13) 메뉴 순서 (2026-11-09): 수강생 왼쪽 메뉴 주차별 강의 → 과제 · 미션 → 실무 체크리스트 (예전 화면 = React) · 강사센터 주차별 강의 (커리큘럼) → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기
    {
      const seq = (labels, want) => { const i = labels.indexOf(want[0]); return i >= 0 && want.every((w, j) => labels[i + j] === w); };
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(sp, "메뉴 순서 · 수강생");
      await FL.student(sp, base, info); const stu = {};
      for (const mode of ["off", "all"]) { await L.reactCookie(sp, base, mode); await L.open(sp, base, "/home"); await sp.waitForTimeout(500); stu[mode] = await sp.$$eval("a.nav-item > span", (xs) => xs.map((x) => x.textContent.trim())); }
      await sp.context().close();
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "메뉴 순서 · 강사센터");
      await FL.instructor(ap, base, info); const ctr = {};
      for (const mode of ["off", "all"]) { await L.reactCookie(ap, base, mode); await L.open(ap, base, "/center/curriculum"); await ap.waitForTimeout(500); ctr[mode] = await ap.$$eval("a.a-nav > span", (xs) => xs.map((x) => x.textContent.trim())); }
      await ap.context().close();
      const SW = ["주차별 강의", "과제 · 미션", "실무 체크리스트"], CW = ["주차별 강의 (커리큘럼)", "과제 · 미션", "실무 체크리스트"];
      const cOk = (l) => seq(l, CW) && (l.indexOf("라이브 다시보기") < 0 || l.indexOf("라이브 다시보기") === l.indexOf("실무 체크리스트") + 1);
      await run.check(seq(stu.off, SW) && seq(stu.all, SW) && JSON.stringify(stu.off) === JSON.stringify(stu.all) && cOk(ctr.off) && cOk(ctr.all) && JSON.stringify(ctr.off) === JSON.stringify(ctr.all),
        "메뉴 순서: 수강생 주차별 강의 → 과제 · 미션 → 실무 체크리스트 · 강사센터 주차별 강의 (커리큘럼) → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기 (예전 화면 = React)", { stu, ctr });
    }
    // 1-14) 수강생 메뉴 = 강사센터 메뉴 구성 그대로 (2026-11-09): 라이브 다시보기 · 모범 과제 · 용어 사전도 내용이 아직 없어도 메뉴에 보이고, 들어가면 ‘아직 … 없어요’ (예전 화면 = React)
    //       서버에서 받은 강의실 내용에서 셋을 비운 채로 열어 봐요 (api/bootstrap 응답만 바꿔요 · DB 는 그대로)
    {
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(sp, "메뉴 구성 그대로 · 수강생");
      await sp.route(/\/api\/bootstrap(\?|$)/, async (rt) => {
        const res = await rt.fetch(), j = await res.json().catch(() => null);
        if (j && Array.isArray(j.docs)) j.docs.forEach((x) => { if (x && /^content:/.test(x[0]) && x[1] && typeof x[1] === "object") { x[1].replays = []; x[1].showcase = []; x[1].glossary = []; } });
        await rt.fulfill({ response: res, body: JSON.stringify(j) });
      });
      await FL.student(sp, base, info); const out = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(sp, base, mode); await L.open(sp, base, "/home"); await sp.waitForTimeout(600);
        const o = await sp.evaluate(() => {
          const X = window.DGA, D = window.DB, iid = (X && X.st && X.st().INS && X.st().INS.id) || "moon";
          const cfg = D.menuConfig(iid).items.filter((x) => x.on && !/^cp_/.test(x.key)).map((x) => x.key);
          return { cfg, nav: Array.from(document.querySelectorAll("a.nav-item")).map((a) => (a.getAttribute("href") || "").replace(/^\/?#?\//, "").split(/[/?]/)[0]).filter(Boolean), empty: { rp: 0, sc: 0, gl: 0 } };
        });
        for (const [k, path, re] of [["rp", "/replays", /아직 올라온 (보충 강의|다시보기 영상)가 없어요/], ["sc", "/showcase", /아직 등록된 모범 과제가 없어요/], ["gl", "/glossary", /아직 등록된 용어가 없어요/]]) {
          await L.open(sp, base, path); await sp.waitForTimeout(500);
          o.empty[k] = { path: new URL(sp.url()).pathname, ok: re.test(await sp.evaluate(() => document.body.innerText)) };
        }
        o.shape = await L.domShape(sp); out[mode] = o;
      }
      await sp.context().close();
      const good = (o) => !!o && ["replays", "showcase", "glossary"].every((k) => o.cfg.indexOf(k) < 0 || o.nav.indexOf(k) >= 0) && o.cfg.filter((k) => k !== "home").every((k, i, a) => o.nav.indexOf(k) >= 0 && (i === 0 || o.nav.indexOf(a[i - 1]) < o.nav.indexOf(k))) &&
        ["rp", "sc", "gl"].every((k) => o.empty[k].ok && o.empty[k].path !== "/home");
      const d = out.off && out.all ? L.shapeDiff(out.off.shape, out.all.shape) : "없음";
      await run.check(good(out.off) && good(out.all) && !d, "수강생 메뉴 = 강사센터 메뉴 구성(켠 메뉴 · 순서 그대로): 라이브 다시보기 · 모범 과제 · 용어 사전도 내용이 없어도 보이고 ‘아직 … 없어요’ (예전 화면 = React)",
        { off: out.off && { cfg: out.off.cfg, nav: out.off.nav, empty: out.off.empty }, all: out.all && { cfg: out.all.cfg, nav: out.all.nav, empty: out.all.empty }, d });
    }
    // 1-15) 메뉴 구성 ‘저장’ (2026-11-09): 바꿔도 저장 전엔 수강생 화면 그대로 · 안내 줄 · 되돌리기 · 저장하면 수강생 화면에 (강사센터 예전 화면 = React)
    for (const mode of ["off", "all"]) {
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "메뉴 저장 · 강사센터 " + mode);
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, mode);
      await L.open(ap, base, "/center/menus"); await ap.waitForTimeout(700);
      const key = "glossary", sel = 'input.a-menu-label[data-key="' + key + '"]', NEW = "용어 사전 (저장 시험 " + mode + ")";
      const st = () => ap.evaluate((k) => { const A = window.ADM, mid = A.ui.mMenuIns, saved = (window.DB.menuConfig(mid).items.find((x) => x.key === k) || {}).label || "", b = document.querySelector('[data-action="menu-save"]');
        return { saved, draft: (A.menuCfg(mid).items.find((x) => x.key === k) || {}).label || "", note: !!document.querySelector(".a-menu-dirty"), saveOn: !!b && !b.disabled, reset: !!document.querySelector('[data-action="menu-reset"]'), dirty: !!(window.__dirty && window.__dirty()), prev: Array.from(document.querySelectorAll(".a-sidebar-preview li span")).map((x) => x.textContent) }; }, key);
      const s0 = await st(), was = s0.saved;
      await ap.fill(sel, NEW); await ap.press(sel, "Tab"); await ap.waitForTimeout(400);
      const s1 = await st();
      await ap.click('[data-action="menu-reset"]'); await ap.waitForTimeout(400);
      const s2 = await st();
      await ap.fill(sel, NEW); await ap.press(sel, "Tab"); await ap.waitForTimeout(300);
      // 저장 전: 수강생 화면은 그대로
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } }); run.watch(sp, "메뉴 저장 · 수강생 " + mode);
      await FL.student(sp, base, info);
      const navTxt = async () => { await L.open(sp, base, "/home"); await sp.waitForTimeout(500); return sp.$$eval("a.nav-item > span", (xs) => xs.map((x) => x.textContent.trim())); };
      const n1 = await navTxt();
      await ap.click('[data-action="menu-save"]'); await ap.waitForTimeout(500); await L.flushed(ap);
      const s3 = await st(), n2 = await navTxt();
      // 되돌려 두기 (원래 이름)
      await ap.fill(sel, was); await ap.press(sel, "Tab"); await ap.waitForTimeout(300); await ap.click('[data-action="menu-save"]'); await ap.waitForTimeout(500); await L.flushed(ap);
      const s4 = await st();
      await sp.context().close(); await ap.context().close();
      await run.check(!s0.note && !s0.saveOn && !s0.dirty && s1.draft === NEW && s1.saved === was && s1.note && s1.saveOn && s1.reset && s1.dirty && s1.prev.indexOf(NEW) >= 0 &&
        s2.draft === was && !s2.note && !s2.saveOn && !s2.dirty && n1.indexOf(NEW) < 0 && s3.saved === NEW && !s3.note && !s3.dirty && n2.indexOf(NEW) >= 0 && s4.saved === was && !s4.dirty,
        "메뉴 구성 ‘저장’ (" + (mode === "all" ? "React" : "예전 화면") + "): 바꿔도 저장 전엔 수강생 화면 그대로 · 안내 줄 · 저장 버튼 켜짐 · 되돌리기 · 저장하면 수강생 메뉴에 바로", { s0, s1, s2, n1, s3, n2, s4 });
    }
    // 1-16) 체험(테스트) 수강생 계정 (2026-11-09): 로그아웃하면 진도 기록이 처음으로 · 다시 들어와도 처음 · 일정과 상관없이 모든 주차가 열려요 (예전 화면 = React)
    {
      const sid = info.student.sid;
      const sp = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(sp, "체험 계정 · 수강생");
      await FL.student(sp, base, info);
      const prog = (pg) => pg.evaluate((id) => { const p = window.DB.progress(id); return { w: Object.keys(p.watched || {}).length, s: Object.keys(p.submissions || {}).length, g: Object.keys(p.guide || {}).length }; }, sid);
      const p0 = await prog(sp);
      // 강의 하나 시청 · 과제 하나 ‘체크 완료’(강사 승인)인 상태를 만들어요
      await sp.evaluate((id) => { const D = window.DB, p = D.progress(id); p.watched.e2eLesson = Date.now(); p.submissions.e2eMission = [{ at: Date.now(), text: "시험", result: { pass: true, reasons: [], ok: [] }, review: { status: "approved", at: Date.now() } }]; p.guide.e2e = Date.now(); D.saveProgress(id, p); }, sid);
      await L.flushed(sp);
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "체험 계정 · 강사센터");
      await FL.instructor(ap, base, info); await L.open(ap, base, "/center/students"); await ap.waitForTimeout(600);
      const seen = await prog(ap);
      // 수강생 화면의 ‘로그아웃’ 버튼
      await Promise.all([sp.waitForNavigation({ timeout: 15000 }).catch(() => null), sp.click('[data-action="logout"]')]); await sp.waitForTimeout(1200);
      await ap.reload(); await ap.waitForTimeout(1500);
      const afterOut = await prog(ap);
      // 다시 들어와도 처음 · 모든 주차 열림 (예전 화면 = React)
      const open = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(sp, base, mode); await FL.student(sp, base, info); await L.open(sp, base, "/missions"); await sp.waitForTimeout(600);
        open[mode] = await sp.evaluate(() => ({ locked: document.querySelectorAll(".week-card.locked").length, cards: document.querySelectorAll(".week-card").length, done: document.querySelectorAll(".mcard.st-done").length }));
      }
      const back = await prog(sp);
      await sp.context().close(); await ap.context().close();
      await run.check(seen.w === p0.w + 1 && seen.s === p0.s + 1 && afterOut.w === 0 && afterOut.s === 0 && afterOut.g === 0 && back.w === 0 && back.s === 0 &&
        ["off", "all"].every((m) => open[m].cards >= 4 && open[m].locked === 0),
        "체험(테스트) 계정: 로그아웃하면 시청 · 과제 · 체크 완료 · 가이드가 처음으로 (강사센터에서도) · 다시 들어와도 처음 · 일정과 상관없이 모든 주차 열림 (예전 화면 = React)", { p0, seen, afterOut, back, open });
    }
    // 1-17) 강사센터 › 수강생 관리 › 상세 ‘체험(테스트) 계정’ (2026-11-10): 목록 ‘체험’ 표시 · 체크 칸 끄기 → 저장 → 표시 사라짐 · 다시 켜기 → 저장 (예전 화면 = React)
    for (const mode of ["off", "all"]) {
      const sid = info.student.sid, ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "체험 계정 체크 칸 " + mode);
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, mode);
      const list = async () => { await L.open(ap, base, "/center/students"); await ap.waitForTimeout(500);
        await ap.evaluate(() => { const t = Array.from(document.querySelectorAll('[data-action="stu-tab"]')).find((b) => /^수강 중/.test(b.textContent.trim())); if (t) t.click(); }); await ap.waitForTimeout(500);
        return ap.evaluate((id) => { const b = document.querySelector('[data-action="student-open"][data-id="' + id + '"]'), td = b && b.closest("td"); return { row: !!b, tag: !!(td && td.querySelector(".a-demo-tag")) }; }, sid); };
      const setDemo = async (on) => { await ap.click('[data-action="student-open"][data-id="' + sid + '"]'); await ap.waitForSelector('#student-form input[name="demo"]', { timeout: 5000 });
        const was = await ap.$eval('#student-form input[name="demo"]', (x) => x.checked); await ap.setChecked('#student-form input[name="demo"]', on);
        await ap.click('button[type="submit"][form="student-form"]'); await ap.waitForTimeout(600); await L.flushed(ap);
        return { was, now: await ap.evaluate((id) => window.DB.student(id).demo === true, sid) }; };
      const l0 = await list(), off = await setDemo(false), l1 = await list(), on = await setDemo(true), l2 = await list();
      await ap.context().close();
      await run.check(l0.row && l0.tag && off.was === true && off.now === false && !l1.tag && on.was === false && on.now === true && l2.tag,
        "수강생 상세 ‘체험(테스트) 계정’ 체크 칸 (" + (mode === "all" ? "React" : "예전 화면") + "): 목록 ‘체험’ 표시 · 끄면 저장되고 표시 사라짐 · 다시 켜면 그대로", { l0, off, l1, on, l2 });
    }
    // 1-18) 기수 설계 › 주차별 ‘녹화본 업로드 · 과제 마감’ 칸 (2026-11-10 · 3기 5주차처럼 평일로 옮긴 주차): 저장 → 캘린더 · 과제 마감에 반영 · 강의일 전 마감은 막기 · 비우면 기본 (예전 화면 = React)
    for (const mode of ["off", "all"]) {
      const ap = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(ap, "주차별 녹화본 · 마감일 " + mode);
      await FL.instructor(ap, base, info); await L.reactCookie(ap, base, mode); await L.open(ap, base, "/center/cohorts"); await ap.waitForTimeout(600);
      const coId = await ap.evaluate(() => (window.DB.data.cohorts.find((x) => x.instructorId === "moon" && x.name === "3기") || {}).id || "");
      const open = async () => { await ap.click('[data-action="cohort-edit"][data-id="' + coId + '"]'); await ap.waitForSelector("#plan-form .pl-lec[data-no='4'] [name='pl-ld-4']", { timeout: 5000 }); };
      const put = (r, d) => ap.evaluate((v) => { const f = document.getElementById("plan-form"); f.querySelector("[name=pl-lr-4]").value = v[0]; f.querySelector("[name=pl-ld-4]").value = v[1]; f.requestSubmit(); }, [r, d]);
      const state = () => ap.evaluate((id) => { const D = window.DB, co = D.cohort(id), ev = D.events("moon", co).filter((e) => e.auto && e.week === 4);
        return { rp: (ev.find((e) => e.type === "replay") || {}).date, dl: (ev.find((e) => e.type === "deadline") || {}).date, wd: D.weekDeadline(co, 4), o4: JSON.stringify(co.classOver && co.classOver[4]), form: !!document.getElementById("plan-form"), err: (document.getElementById("pl-error") || {}).textContent || "" }; }, coId);
      const r = {};
      if (coId) {
        await open(); r.base = await state();
        await put("2026-12-13", "2026-12-01"); await ap.waitForTimeout(400); r.bad = await state();
        await put("2026-12-13", "2026-12-17"); await ap.waitForTimeout(800); await L.flushed(ap); r.set = await state();
        await open(); r.keep = await ap.evaluate(() => [document.querySelector("[name=pl-lr-4]").value, document.querySelector("[name=pl-ld-4]").value]);
        await put("", ""); await ap.waitForTimeout(800); await L.flushed(ap); r.back = await state();
      }
      await ap.context().close();
      await run.check(!!coId && r.base.rp === "2026-12-14" && r.base.dl === "2026-12-18" && r.bad.form && /강의일/.test(r.bad.err) && r.set.rp === "2026-12-13" && r.set.dl === "2026-12-17" && r.set.wd === "2026-12-17" && !r.set.form &&
        r.keep[0] === "2026-12-13" && r.keep[1] === "2026-12-17" && r.back.rp === "2026-12-14" && r.back.dl === "2026-12-18" && !/replay|due/.test(r.back.o4 || ""),
        "기수 설계 주차별 녹화본 업로드 · 과제 마감 (" + (mode === "all" ? "React" : "예전 화면") + "): 저장하면 캘린더 · 과제 마감이 그 날로 · 강의일 전 마감은 막기 · 다시 열면 그대로 · 비우면 기본(강의 2일 뒤 · 주차 마감)", r);
    }
    // 1-19) 강의 목록 설명은 요약만(서식 기호 없이 · 길면 ‘자세히 보기’) · 자료 파일은 바로 쓸 수 있는 것 먼저 (2026-11-10 · 예전 화면 = React)
    {
      const r = {};
      for (const mode of ["off", "all"]) {
        const pg = await L.newPage(browser, { viewport: { width: 390, height: 844 } });
        run.watch(pg, "강의 요약 · 자료 순서 " + mode);
        await L.reactCookie(pg, base, mode); await FL.student(pg, base, info);
        await L.open(pg, base, "/curriculum"); await pg.waitForTimeout(700);
        const cur = await pg.evaluate(() => { const X = window.DGA, D = X.st().D, ls = []; (D.weeks || []).forEach((w) => (w.lessons || []).forEach((l) => ls.push(l)));
          const cards = Array.from(document.querySelectorAll("a.lesson"));
          return { n: cards.length, ok: cards.every((a) => { const l = ls.find((x) => a.getAttribute("href") === "#/curriculum/" + x.id), d = a.querySelector(".lesson-desc"); return l && d && d.textContent === window.DB.brief(l.desc) && !/^#|\s##\s/.test(d.textContent) && !!a.querySelector(".lesson-more") === X.lessonLong(l); }),
            clamp: cards.length ? getComputedStyle(cards[0].querySelector(".lesson-desc")).webkitLineClamp : "" }; });
        await L.open(pg, base, "/library/file"); await pg.waitForTimeout(700);
        const lib = await pg.evaluate(() => { const rows = Array.from(document.querySelectorAll(".res-item")).map((x) => !x.querySelector('[data-action="not-ready"]')); return { rows, sorted: rows.every((v, i) => i === 0 || rows[i - 1] || !v), anyReady: rows.some(Boolean), anyWait: rows.some((v) => !v) }; });
        r[mode] = { cur, lib }; await pg.context().close();
      }
      await run.check(["off", "all"].every((m) => r[m].cur.n > 0 && r[m].cur.ok && r[m].cur.clamp === "3" && r[m].lib.sorted && r[m].lib.anyReady && r[m].lib.anyWait) && JSON.stringify(r.off) === JSON.stringify(r.all),
        "강의 목록 설명은 요약(서식 기호 없이 · 휴대폰 세 줄 · 길면 ‘자세히 보기’) · 자료 파일은 다운로드 · 계산기 먼저, ‘준비 중’은 아래 (예전 화면 = React)", r);
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
        // VOD 강의실(극장형) · 내 노트: 화면 모양 + 탭 · 노트 쓰기(종류 · 시간) · 거르기 · 고치기 · 할 일 · 지우기 · 내 노트 검색 (모드마다 노트를 처음으로 돌려요)
        const vl = await page.evaluate((id) => { const X = window.DGA, x = X.vodList().find((v) => v.p.id === id); if (!x) return []; const lz = window.VOD.lessons(x.p), e = encodeURIComponent;
          return ["/vodclass", "/vodclass/notes", "/vodclass/" + e(id), "/vodclass/nope"].concat(lz.length ? ["/vodclass/" + e(id) + "/" + e(lz[0].id), "/vodclass/" + e(id) + "/" + e(lz[lz.length - 1].id), "/vodclass/" + e(id) + "/" + e(lz[0].id) + "?t=30"] : []); }, pid);
        const vs = await shapes(page, base, L, vl);
        await run.check(!vs.bad.length && vl.length >= 4, "VOD 강의실 " + vl.length + "개 화면(목록 · 극장형 · 내 노트): 예전 화면(off) = React 화면(all) — #root 구조 " + vs.lines + "줄이 똑같아요", vs.bad.slice(0, 2), page);
        if (vl.length > 4) {
          const T = (x) => x.replace(/\d{1,2}\/\d{1,2}( \([^)]+\))? \d{2}:\d{2}/g, "M/D hh:mm").replace(/"nt[a-z0-9]{6,}"/g, '"NTID"');
          const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 350); out.push(T(await L.domShape(page))); };
          const flow = async (mode) => {
            await L.reactCookie(page, base, mode); await L.open(page, base, "/home");
            const keep = await page.evaluate(() => JSON.stringify(window.VOD.V().notes || {}));
            await L.open(page, base, vl[4]); await page.evaluate(() => { window.__e2eStay = 1; });
            const out = [], t = [];
            await step(out, () => page.click(".vt-tabs [data-k='note']"));
            await page.fill("#vt-note-text", "E2E 궁금한 노트"); await page.fill("#vt-note-t", "1:05"); await page.click(".vt-tagr.t-ask");
            await step(out, () => page.click("[data-action='vt-note-save']"), 500); t.push(await L.toasts(page));
            await page.fill("#vt-note-text", "E2E 할 일"); await page.click(".vt-tagr.t-todo");
            await step(out, () => page.click("[data-action='vt-note-save']"), 500);
            await step(out, () => page.click("[data-action='vt-filter'][data-k='todo']"));
            await step(out, () => page.click("[data-action='vt-note-todo']"));
            await step(out, () => page.click("[data-action='vt-filter'][data-k='all']"));
            await step(out, () => page.click("[data-action='vt-note-edit']"));
            await step(out, () => page.click("[data-action='vt-note-ecancel']"));
            await page.click("[data-action='vt-note-edit']"); await page.fill(".vt-edit textarea", "E2E 고친 노트");
            await step(out, () => page.click("[data-action='vt-note-esave']"), 500); t.push(await L.toasts(page));
            await step(out, () => page.click("[data-action='vt-note-del']"));
            await step(out, () => page.click("[data-action='vt-note-del']"), 500);
            await step(out, () => page.click(".vt-tabs [data-k='files']"));
            await step(out, () => page.click(".vt-tabs [data-k='toc']"));
            await page.evaluate(() => { window.ROUTE.hash = "#/vodclass/notes"; }); await page.waitForTimeout(600); out.push(T(await L.domShape(page)));
            await step(out, () => page.fill("#vn-q", "E2E"), 400);
            await step(out, () => page.click("[data-action='vt-filter'][data-k='ask']"));
            await step(out, () => page.fill("#vn-q", ""), 400);
            await step(out, () => page.click("[data-action='vt-filter'][data-k='all']"));
            await page.evaluate((k) => { window.VOD.V().notes = JSON.parse(k); window.VOD.save(); window.DGA.vtTab("toc"); window.DGA.vtFilter("all"); window.DGA.vtQ(""); }, keep);
            await L.flushed(page);
            return { out, t, stay: await page.evaluate(() => window.__e2eStay === 1) };
          };
          const a = await flow("off"), b = await flow("all");
          const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
          await run.check(!d.length && a.out.length === b.out.length && b.out.length >= 16 && b.stay && JSON.stringify(a.t) === JSON.stringify(b.t) && /노트를 저장/.test(b.t[0]),
            "VOD 강의실(React): 내 노트 탭 · 노트 저장(종류 · 시간) · 거르기 · 할 일 · 고치기 · 지우기 · 자료 · 목차 · 내 노트 검색 — 누를 때마다 예전 화면과 같은 모양 · 같은 알림 (" + b.out.length + "번)", d.slice(0, 1).concat([{ t: [a.t, b.t], n: [a.out.length, b.out.length] }]), page);
        }
      } else await run.check(false, "VOD 수강생: 두잉고 강의실이 열린 VOD 를 산 회원이 있어야 해요", { pid }, page);
      await page.context().close();
    }
    // 4) 강의실 로그인(React): 강사 고르기 · 검색(초성 · 없음 · 지우기) · 탭 · 번호 보기 · 안내 · 약관 · 수강 신청 팝업 · 틀린 번호 · 강사 바꾸기 · 로그인 → 홈
    {
      const page = await L.newPage(browser);
      run.watch(page, "강의실 로그인");
      const step = async (out, fn, wait) => { await fn(); await page.waitForTimeout(wait || 300); out.push(await L.domShape(page)); };
      const modal = async (out, sel) => { await page.click(sel); await page.waitForTimeout(300); out.push("M " + (await L.domShape(page, "modal-root"))); await page.click("#modal-root [data-action='modal-close']"); await page.waitForTimeout(200); out.push("X " + (await page.evaluate(() => document.getElementById("modal-root").innerHTML.trim()))); };
      const flow = async (mode) => {
        await L.fresh(page, base); await L.reactCookie(page, base, mode);
        await L.open(page, base, "/login"); await page.evaluate(() => { window.__e2eStay = 1; });
        const out = [await L.domShape(page)], react = await isReact(page);
        await step(out, () => page.fill("#dc-q", "ㅁ"));
        await step(out, () => page.fill("#dc-q", "없는강사zz"));
        await step(out, () => page.click("[data-dc-clear]"));
        await step(out, () => page.click(".lg-svc [data-k='vod']"));
        await step(out, () => page.click("#vod-login-form [data-action='toggle-pw']"));
        await step(out, () => page.click(".lg-svc [data-k='dg']"));
        await modal(out, "[data-action='legal'][data-doc='terms']");
        await step(out, () => page.click("[data-action='pick-instructor'][data-id='" + info.student.iid + "']"), 500);
        await step(out, () => page.click("#login-form [data-action='toggle-pw']"));
        await modal(out, "[data-action='forgot']");
        // 수강 신청: 빈칸으로 신청 → 안내 (모집 기수가 없으면 안내 팝업)
        await page.click("[data-action='signup']"); await page.waitForTimeout(300);
        if (await page.$("#signup-form")) { out.push("M " + (await L.domShape(page, "modal-root"))); await page.click("#signup-form button[type='submit']"); await page.waitForTimeout(300); out.push("M " + (await L.domShape(page, "modal-root"))); await page.click("#modal-root .modal-head [data-action='modal-close']"); }
        else { out.push("M " + (await L.domShape(page, "modal-root"))); await page.click("#modal-root [data-action='modal-close']"); }
        await page.waitForTimeout(200);
        await page.fill("#lg-name", info.student.name); await page.fill("#lg-phone", "0000");
        await step(out, () => page.press("#lg-phone", "Enter"), 900);
        await step(out, () => page.fill("#lg-name", info.student.name + " "));
        await step(out, () => page.click("[data-action='change-instructor']"), 400);
        await page.click("[data-action='pick-instructor'][data-id='" + info.student.iid + "']"); await page.waitForTimeout(400);
        await page.fill("#lg-name", info.student.name); await page.fill("#lg-phone", info.student.pin); await page.press("#lg-phone", "Enter");
        await page.waitForFunction(() => location.pathname === "/home", null, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(500);
        return { out, react, path: new URL(page.url()).pathname, toast: await L.toasts(page), stay: await page.evaluate(() => window.__e2eStay === 1) };
      };
      const a = await flow("off"), b = await flow("all");
      const d = a.out.map((x, i) => L.shapeDiff(x, b.out[i])).map((x, i) => x && { i, d: x }).filter(Boolean);
      await run.check(!d.length && a.out.length === b.out.length && b.out.length >= 16 && !a.react && b.react && b.path === "/home" && a.path === "/home" && b.stay && /환영합니다/.test(b.toast),
        "강의실 로그인(React): 강사 고르기 · 검색 · 탭 · 번호 보기 · 약관 · 안내 · 수강 신청 · 틀린 번호 · 강사 바꾸기 — 누를 때마다 예전 화면과 같은 모양 · 로그인하면 홈으로 (" + b.out.length + "번)", d.slice(0, 1).concat([{ n: [a.out.length, b.out.length], react: [a.react, b.react], path: [a.path, b.path], stay: b.stay, toast: b.toast }]), page);
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
