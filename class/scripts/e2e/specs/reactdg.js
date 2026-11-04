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
          const T = (x) => x.replace(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/g, "M/D hh:mm").replace(/"nt[a-z0-9]{6,}"/g, '"NTID"');
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
