/* 로딩 화면 쪽(두잉고 · 두고클래스) · 서비스 이동 안내 (2026-11-22)
 *  · 두잉고 쪽(소개 · 강의실 · 강의실 로그인 · 강사 소개 · 무료강의 · LIVE 강사센터)은 두잉고 로고 · 두고클래스 쪽(스토어 · 회원 · 약관)은 DOOGO CLASS 그대로
 *  · 다른 서비스로 옮기면 옮겨 갈 쪽 로고 + ‘두잉고로 이동중입니다’ / ‘두고클래스로 이동중입니다’ — 새로 부른 페이지 첫 로딩 화면까지 (쿠키 dc_boot)
 *  · 새로 부르지 않고 바로 바뀌는 이동은 0.65초 덮개(누르기는 막지 않아요) · 같은 서비스 안에서는 덮개 없음
 *  · 로딩 화면이 금방 사라지지 않게 첫 데이터(/api/bootstrap)를 잠깐 늦춰서 봐요 (React 화면 · 예전 화면 둘 다) — 규칙은 class/areas.js · class/shared/screens.js */
"use strict";
const FL = require("./_flows");
const bootOf = (p) => p.evaluate(() => {
  const b = document.querySelector("#dc-move") || document.querySelector("#root .boot-wait");
  if (!b) return null;
  const i = b.querySelector(".boot-logo"), t = b.querySelector(".boot-txt");
  return { cover: b.id === "dc-move", logo: i ? i.getAttribute("src") : "", txt: t ? t.textContent.replace(/\.+$/, "").trim() : "" };
}).catch(() => null);
async function waitBoot(p, re, ms) { const end = Date.now() + (ms || 6000); let b = null; while (Date.now() < end) { b = await bootOf(p); if (b && re.test(b.txt + " " + b.logo)) return b; await p.waitForTimeout(40); } return b; }
const slow = (p, ms) => p.route("**/api/bootstrap**", async (r) => { await new Promise((ok) => setTimeout(ok, ms)); await r.continue().catch(() => {}); });
const DG = /doinggo-word\.svg/, DC = /doogo-class-word\.svg/;

module.exports = {
  title: "로딩 화면 쪽 · 두고클래스 ↔ 두잉고 이동 안내",
  async run({ base, info, browser, run, L }) {
    const p = await L.newPage(browser);
    run.watch(p, "로딩 화면");
    await L.reactCookie(p, base, "all");
    // 1) 스토어(React) → 두잉고 소개(예전 화면 · 새로 부름)
    await L.open(p, base, "/");
    await slow(p, 2000);
    await p.locator('a[href="#/doinggo"]').first().evaluate((a) => a.click());
    const a1 = await waitBoot(p, /두잉고로 이동중입니다/, 3000);
    await run.check(!!a1 && DG.test(a1.logo) && a1.txt === "두잉고로 이동중입니다", "스토어 → 두잉고: 떠나기 전 두잉고 로고 + ‘두잉고로 이동중입니다’", a1, p);
    await p.waitForURL(/\/doinggo$/, { timeout: 10000 }).catch(() => {});
    const a2 = await waitBoot(p, /두잉고로 이동중입니다/, 4000);
    await run.check(!!a2 && DG.test(a2.logo) && a2.txt === "두잉고로 이동중입니다", "새로 부른 /doinggo 첫 로딩도 같은 안내 (쿠키 dc_boot)", a2, p);
    await L.ready(p, 15000);
    await run.check(!(await p.context().cookies(base)).some((c) => c.name === "dc_boot"), "화면이 뜨면 쿠키 dc_boot 는 지워져요", null, p);
    // 2) 두잉고 소개 → 두고클래스(서비스 바꾸기) — React 서버 화면도 이어서
    await p.locator('.site-sw a[href="#/vod"]').first().evaluate((a) => a.click());
    const b1 = await waitBoot(p, /두고클래스로 이동중입니다/, 3000);
    await run.check(!!b1 && DC.test(b1.logo) && b1.txt === "두고클래스로 이동중입니다", "두잉고 → 두고클래스: DOOGO CLASS 로고 + ‘두고클래스로 이동중입니다’", b1, p);
    await p.waitForURL(/\/vod$/, { timeout: 10000 }).catch(() => {});
    const b2 = await waitBoot(p, /두고클래스로 이동중입니다/, 4000);
    await run.check(!!b2 && DC.test(b2.logo) && b2.txt === "두고클래스로 이동중입니다", "새로 부른 스토어(React 서버 화면) 첫 로딩도 같은 안내", b2, p);
    await L.ready(p, 15000);
    // 3) 바로 연 페이지: 스토어 = DOOGO CLASS ‘로딩중입니다’(그대로) · 두잉고 강의실 로그인 = 두잉고 ‘로딩중입니다’
    await p.goto(base + "/vod/c/all", { waitUntil: "commit" });
    const c1 = await waitBoot(p, /로딩중입니다/, 4000);
    await run.check(!!c1 && DC.test(c1.logo) && c1.txt === "로딩중입니다", "스토어를 바로 열면 DOOGO CLASS ‘로딩중입니다’ (지금 그대로)", c1, p);
    await L.ready(p, 15000);
    await p.goto(base + "/login", { waitUntil: "commit" });
    const c2 = await waitBoot(p, /로딩중입니다/, 4000);
    await run.check(!!c2 && DG.test(c2.logo) && c2.txt === "로딩중입니다", "두잉고 강의실 로그인을 바로 열면 두잉고 ‘로딩중입니다’", c2, p);
    await L.ready(p, 15000);
    // 4) 바로 바뀌는 이동(React 강의실 로그인 ↔ 스토어): 덮개 0.65초 · 누르기 그대로 · 같은 서비스 안에서는 없음
    await p.unroute("**/api/bootstrap**");
    await p.evaluate(() => { window.ROUTE.hash = "#/vod/c/all"; });
    const d1 = await waitBoot(p, /두고클래스로 이동중입니다/, 1500);
    const pe = await p.evaluate(() => { const el = document.getElementById("dc-move"); return el ? getComputedStyle(el).pointerEvents : null; });
    await run.check(!!d1 && d1.cover && DC.test(d1.logo) && pe === "none", "바로 바뀌는 이동(두잉고 → 두고클래스)도 덮개 ‘두고클래스로 이동중입니다’ · 누르기는 그대로", { d1, pe }, p);
    await p.waitForTimeout(1200);
    await run.check(!(await p.$("#dc-move")), "덮개는 1초 안에 사라져요", null, p);
    await p.evaluate(() => { window.ROUTE.hash = "#/vod/teachers"; });
    await p.waitForTimeout(150);
    await run.check(!(await p.$("#dc-move")), "같은 서비스 안(전체 클래스 → 강사진)에서는 덮개 없음", null, p);
    await p.context().close();
    // 5) 강사센터: LIVE 강사(머리 로고 두잉고) → 쿠키 dc_ct=dg → 다시 열면 두잉고 ‘로딩중입니다’
    const q = await L.newPage(browser);
    run.watch(q, "강사센터 로딩");
    await L.reactCookie(q, base, "all");
    await FL.instructor(q, base, info);
    await L.open(q, base, "/center");
    const ct = (await q.context().cookies(base)).find((c) => c.name === "dc_ct");
    await run.check(!!ct && ct.value === "dg", "LIVE 강사 강사센터 → 머리 로고 쪽(두잉고) 기억 dc_ct=dg", ct && ct.value, q);
    await slow(q, 2000);
    await q.goto(base + "/center/reviews", { waitUntil: "commit" });
    const e2 = await waitBoot(q, /로딩중입니다/, 4000);
    await run.check(!!e2 && DG.test(e2.logo) && e2.txt === "로딩중입니다", "강사센터를 다시 열면 두잉고 ‘로딩중입니다’", e2, q);
    await L.ready(q, 15000);
    await q.context().close();
  }
};
