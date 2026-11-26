/* 진도 저장 보관함 (2026-11-26 · 3기 수강생 ‘어제 과제 8개 → 오늘 4개’)
 *  인터넷이 끊긴 채(서버 저장이 막힘) 과제를 내면 화면엔 ‘자동검수 통과’로 보이지만 서버엔 없어요 — 예전엔 창을 닫으면 그대로 사라졌어요.
 *  이제 수강생 본인 진행 기록은 보내기 전에 이 브라우저(localStorage)에도 남기고, 다음에 강의실을 열면 서버 기록 위에 합쳐 다시 저장해요 */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "진도 저장 보관함 (못 보낸 과제 제출이 창을 닫아도 다음에 열 때 저장)",
  // 시험 수강생(s1)은 체험 계정이라 보관함을 쓰지 않아요(로그인 · 로그아웃마다 처음으로) — 이 시험 DB 에서만 체험 표시를 풀어요
  prep: (db, L) => L.runNode(`(async () => { const st = require("./api/_lib/store.js"); const r = await st.getDoc("stu:moon:s1"); if (r && r.v) { const v = Object.assign({}, r.v); delete v.demo; await st.writeDoc("stu:moon:s1", v, r.ver); } if (st.close) await st.close(); })().catch((e) => { console.error(e); process.exit(1); });`, db),
  async run({ base, info, browser, run, L }) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Seoul" });
    await ctx.addInitScript(() => { try { localStorage.setItem("dc:clean", "1"); localStorage.setItem("dc_pop_until", "9999-12-31"); } catch (e) { /* #주소로 */ } });
    const p1 = await ctx.newPage();
    run.watch(p1, "보관함 1");
    await FL.student(p1, base, info);
    const subs = (p) => p.evaluate(() => fetch("/api/bootstrap", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json())).then((j) => { const d = (j.docs || []).find((x) => /^prog:/.test(x[0])); return d ? Object.keys(d[1].submissions || {}) : []; });
    // 1) 서버 저장이 막힌 채 과제 제출 → 화면엔 통과 · 보관함에 남음 · 서버엔 없음
    await p1.route("**/api/sync", (r) => r.abort());
    await L.open(p1, base, "/missions/1/m1-7");
    await p1.waitForSelector("#sub-text", { timeout: 10000 });
    await p1.fill("#sub-text", "인터넷이 끊긴 채 낸 과제 답변이에요 (E2E 보관함)");
    await p1.click('#submit-form button[type="submit"]');
    await p1.waitForTimeout(1500);
    const ob1 = await p1.evaluate(() => Object.keys(DB.remote.outbox()));
    const srv1 = await subs(p1);
    await run.check(!!(await p1.$("#result .result.pass")) && ob1.some((k) => /^prog:/.test(k)) && srv1.indexOf("m1-7") < 0,
      "저장이 막힌 채 제출: 화면엔 통과 · 이 브라우저 보관함에 남음 · 서버엔 아직 없음", { ob1, srv1 }, p1);
    // 2) 창을 닫고 다시 열면 → 보관함이 서버 기록 위에 합쳐 저장 · 보관함 비움
    await p1.close();
    const p2 = await ctx.newPage();
    run.watch(p2, "보관함 2");
    await L.open(p2, base, "/missions");
    await p2.waitForTimeout(2000);
    await L.flushed(p2);
    const srv2 = await subs(p2), ob2 = await p2.evaluate(() => Object.keys(DB.remote.outbox()));
    await run.check(srv2.indexOf("m1-7") >= 0 && !ob2.length, "창을 닫았다 다시 열면: 못 보낸 제출이 서버에 저장되고 보관함은 비어요", { srv2, ob2 }, p2);
    await ctx.close();
  }
};
