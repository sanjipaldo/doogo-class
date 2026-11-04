/* 파트너센터 · 온드미디어 센터 React 화면 (Next.js 전환 6단계) — 마스터가 화면에서 파트너 · 온드미디어 계정을 만들고,
 * 그 계정으로 로그인해 예전 화면(쿠키 dc_next=off)과 React 화면(all)의 #root 구조가 똑같은지 (PC · 휴대폰) + 탭 · 고르기 · 찾기
 *  · 파트너는 ‘강사 추천하기’로 입점 문의를 하나 남겨 문의 카드 · 진행 칸 · 1:1 대화까지 비교
 *  · Next.js 서버(E2E_SERVER=next)에서만 */
"use strict";
const FL = require("./_flows.js");
const isReact = (page) => page.evaluate(() => !!window.DC_REACT_PAGE);
async function shapes(page, base, L, list) {
  const bad = []; let lines = 0;
  for (const u of list) {
    const sh = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(page, base, mode);
      await L.open(page, base, u); await page.waitForTimeout(400); sh[mode] = { shape: await L.domShape(page), react: await isReact(page), path: new URL(page.url()).pathname };
    }
    const d = L.shapeDiff(sh.off.shape, sh.all.shape); lines += sh.all.shape.split("\n").length;
    // 로그인이 안 됐거나 다른 화면으로 넘어가면 같은 모양이어도 실패 (주소가 그대로여야 해요)
    const want = u.split("?")[0];
    if (sh.off.react || !sh.all.react || d || sh.off.path !== want || sh.all.path !== want) bad.push({ u, off: sh.off.react, all: sh.all.react, path: [sh.off.path, sh.all.path], d });
  }
  return { bad, lines };
}
module.exports = {
  title: "파트너센터 · 온드미디어 센터 React 화면 · 예전 화면과 같은 모양",
  async run({ base, info, browser, run, L }) {
    if (process.env.E2E_SERVER !== "next" && !process.env.E2E_BASE) { console.log("  (Next.js 서버에서만 — E2E_SERVER=next)"); return; }
    {
      const page = await L.newPage(browser, { viewport: { width: 1280, height: 900 } });
      run.watch(page, "파트너 · 온드미디어 계정 만들기");
      await FL.master(page, base, info); await L.reactCookie(page, base, "off");
      await L.open(page, base, "/center/master/rs");
      await page.click('[data-action="aff-new"]'); await page.waitForTimeout(300);
      await page.fill("#af-name", "시험파트너"); await page.fill("#af-phone", "010-1234-5678"); await page.fill("#af-loginId", "e2epartner"); await page.fill("#af-pw", "e2epw1234"); await page.fill("#af-code", "E2EPT");
      { const c = await page.$('#aff-form input[name="ins"]'); if (c) await c.check(); }
      await page.click('#modal-root button[type="submit"][form="aff-form"]'); await page.waitForTimeout(700);
      await L.open(page, base, "/center/master/vod-media");
      await page.click('[data-action="md-add"]'); await page.waitForTimeout(300);
      await page.fill("#mdf-loginId", "e2emedia"); await page.fill("#mdf-pw", "e2epw1234"); await page.fill("#mdf-channel", "시험 채널"); await page.fill("#mdf-subs", "120000");
      await page.click('#modal-root button[type="submit"][form="md-form"]'); await page.waitForTimeout(700);
      await L.flushed(page);
      const made = await page.evaluate(() => ({ p: (window.DB.data.affiliates || []).some((x) => x.loginId === "e2epartner"), m: (window.DB.data.media || []).some((x) => x.loginId === "e2emedia") }));
      await page.context().close();
      const PT = ["/center/partner", "/center/partner/inquiries", "/center/partner/refer", "/center/partner/kit", "/center/partner/guide", "/center/partner/instructors", "/center/partner/earnings", "/center/partner/payouts", "/center/partner/settings", "/center/partner/notices"];
      const MD = ["/center/media", "/center/media/links", "/center/media/calendar", "/center/media/orders", "/center/media/payouts", "/center/media/guide", "/center/media/settings"];
      let refDone = false;
      for (const who of [["e2epartner", PT, "파트너센터"], ["e2emedia", MD, "온드미디어 센터"]]) {
        for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
          const pg = await L.newPage(browser, { viewport: vp });
          run.watch(pg, who[2] + " 모양 " + vp.width);
          await FL.adminLogin(pg, base, "master", who[0], "e2epw1234");
          // 파트너: 한 번만 강사 추천하기로 입점 문의 하나 남겨서 문의 카드 · 진행 칸 · 1:1 대화까지 비교
          if (who[0] === "e2epartner" && !refDone) {
            await L.reactCookie(pg, base, "off"); await L.open(pg, base, "/center/partner/refer");
            await pg.fill("#pl-name", "시험강사"); await pg.fill("#pl-phone", "010-9876-5432"); await pg.fill("#pl-course", "부업 시작 4주 과정 · 직장인 대상");
            await pg.fill("#pl-message", "다음 주 화요일 오후 통화 가능해요."); await pg.check('#aff-lead-form input[name="agree"]');
            await pg.click('#aff-lead-form button[type="submit"]'); await pg.waitForTimeout(900); await L.flushed(pg); refDone = true;
          }
          const { bad, lines } = await shapes(pg, base, L, who[1]);
          let d = [], m = null;
          if (vp.width === 1280) {
            const out = {};
            for (const mode of ["off", "all"]) {
              await L.reactCookie(pg, base, mode); const o = [];
              if (who[0] === "e2epartner") {
                await L.open(pg, base, "/center/partner/earnings");
                for (const k of ["scheduled", "done", "expected", "all"]) { await pg.click('[data-action="aff-tab"][data-k="' + k + '"]'); await pg.waitForTimeout(300); o.push(await L.domShape(pg)); }
                await L.open(pg, base, "/center/partner/inquiries");
                for (const k of ["ing", "done", "all"]) { await pg.click('[data-action="p-inq-tab"][data-k="' + k + '"]'); await pg.waitForTimeout(300); o.push(await L.domShape(pg)); }
              } else {
                await L.open(pg, base, "/center/media/orders");
                for (const k of ["month", "last", "all"]) { await pg.click('[data-action="md-op"][data-k="' + k + '"]'); await pg.waitForTimeout(300); o.push(await L.domShape(pg)); }
                await L.open(pg, base, "/center/media/calendar");
                await pg.click('[data-action="md-ym"][data-dir="-1"]'); await pg.waitForTimeout(300); o.push(await L.domShape(pg));
                await pg.click('[data-action="md-ym"][data-dir="1"]'); await pg.waitForTimeout(300); o.push(await L.domShape(pg));
                await L.open(pg, base, "/center/media/links");
                await pg.fill("#md-q", "zz없는강의"); await pg.waitForTimeout(500); o.push(await L.domShape(pg));
                await pg.fill("#md-q", ""); await pg.waitForTimeout(500);
              }
              out[mode] = o;
            }
            d = out.off.map((x, i) => L.shapeDiff(x, out.all[i])).filter(Boolean); m = [out.off.length, out.all.length];
          }
          await run.check(made.p && made.m && !bad.length && !d.length, who[2] + " " + who[1].length + "개 화면 " + vp.width + "px: 예전 화면(off) = React 화면(all) — #root 구조 " + lines + "줄이 똑같아요" + (m ? " · 탭 · 고르기 · 찾기도" : ""), bad.slice(0, 2).concat(d.slice(0, 1), [{ made, m }]), pg);
          await pg.context().close();
        }
      }
    }
  }
};
