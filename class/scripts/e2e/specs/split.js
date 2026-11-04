/* 화면 나눠 받기 (Next.js 전환 4단계 4-3) — 주소마다 그 영역 화면 파일만 받는지 · 다른 영역으로 옮기면 새로 불러 그 영역 파일을 받는지
 *  · 영역 규칙은 areas.js (스토어 · 두잉고 강의실 / 강사센터 / 강사 소개 · 무료강의 / 두잉고 소개)
 *  · 스토어 ↔ 두잉고 강의실은 같은 파일이라 새로 부르지 않아요 */
"use strict";
const AREA_FILES = ["vod.js", "app.js", "admin.js", "landing.js", "guide-data.js", "guide.js", "home.js", "admin.css", "landing.css", "doogo-free.css", "guide.css"];
const APPS = ["VodApp", "StudentApp", "AdminApp", "LandingApp", "HomeApp"];
module.exports = {
  title: "화면 나눠 받기 · 영역별 파일 · 영역 옮기기",
  readOnly: true, // 데이터를 쓰지 않아요
  async run({ base, info, browser, run, L }) {
    const iid = info.instructor.iid;
    // 1) 주소 → 받은 영역 파일 · 들어온 화면 (창마다 새로 — 캐시 없이)
    const want = [
      ["/", ["vod.js", "app.js"], ["VodApp", "StudentApp"], "vod"],
      ["/vod/login", ["vod.js", "app.js"], ["VodApp", "StudentApp"], "vod"],
      ["/terms", ["vod.js", "app.js"], ["VodApp", "StudentApp"], "vod"],
      ["/login", ["vod.js", "app.js"], ["VodApp", "StudentApp"], "student"],
      ["/center/login", ["vod.js", "admin.js", "admin.css"], ["VodApp", "AdminApp"], "admin"],
      ["/p/" + iid, ["landing.js", "landing.css", "doogo-free.css"], ["LandingApp"], "landing"],
      ["/free/" + iid, ["landing.js", "landing.css", "doogo-free.css"], ["LandingApp"], "landing"],
      ["/doinggo", ["vod.js", "guide-data.js", "guide.js", "home.js", "guide.css"], ["VodApp", "HomeApp"], "home"]
    ];
    for (const [u, files, apps, mode] of want) {
      const page = await L.newPage(browser);
      run.watch(page, "나눠 받기 " + u);
      const got = new Set();
      page.on("request", (r) => { const f = r.url().split("#")[0].split("?")[0].split("/").pop(); if (AREA_FILES.indexOf(f) >= 0) got.add(f); });
      await L.open(page, base, u);
      const st = await page.evaluate((A) => ({ mode: document.body.dataset.mode, apps: A.filter((a) => !!window[a]) }), APPS);
      const g = Array.from(got).sort(), w = files.slice().sort();
      await run.check(st.mode === mode && g.join() === w.join() && st.apps.slice().sort().join() === apps.slice().sort().join(), "주소 " + u + " → " + mode + " 영역 파일만 (" + w.join(" · ") + ")", { mode: st.mode, got: g, apps: st.apps }, page);
      await page.context().close();
    }
    // 2) 영역 옮기기
    const page = await L.newPage(browser);
    run.watch(page, "영역 옮기기");
    const mark = () => page.evaluate(() => { window.__e2eMark = 1; });
    const marked = () => page.evaluate(() => window.__e2eMark === 1);
    const st = () => page.evaluate((A) => ({ mode: document.body.dataset.mode, path: location.pathname, apps: A.filter((a) => !!window[a]) }), APPS);
    const moveTo = async (h, reload) => {
      if (reload) await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.evaluate((x) => { window.ROUTE.hash = x; }, h)]);
      else { await page.evaluate((x) => { window.ROUTE.hash = x; }, h); await page.waitForTimeout(300); }
      await L.ready(page);
    };
    await L.open(page, base, "/");
    // React 화면을 켠 채로(E2E_REACT=1)면 스토어는 React 화면 · 두잉고 로그인은 아직 예전 화면이라 새로 불러요 (React 화면 ↔ 예전 화면)
    const reactStore = await page.evaluate(() => !!window.DC_REACT_PAGE);
    await mark();
    await moveTo("#/login", reactStore);
    let s = await st();
    await run.check((reactStore ? !(await marked()) : await marked()) && s.mode === "student" && s.path === "/login" && !!(await page.$("#lg-name, [data-action='svc-tab']")), reactStore ? "스토어(React 화면) → 두잉고 로그인(예전 화면): 새로 불러 예전 화면으로" : "스토어 → 두잉고 로그인: 같은 파일이라 새로 부르지 않고 바로 (화면 그대로)", s, page);
    await moveTo("#/center/login", true);
    s = await st();
    await run.check(!(await marked()) && s.mode === "admin" && s.path === "/center/login" && s.apps.indexOf("AdminApp") >= 0 && !!(await page.$("#al-id")), "두잉고 로그인 → 강사센터: 새로 불러 강사센터 파일을 받아요", s, page);
    await moveTo("#/vod", true);
    s = await st();
    await run.check(s.mode === "vod" && s.apps.indexOf("AdminApp") < 0 && s.apps.indexOf("StudentApp") >= 0, "강사센터 → 스토어: 새로 불러 스토어 파일만 (강사센터 파일 없이)", s, page);
    await moveTo("#/p/" + iid, true);
    s = await st();
    await run.check(s.mode === "landing" && s.apps.join() === "LandingApp", "스토어 → 강사 소개: 강사 소개 파일만", s, page);
    await moveTo("#/doinggo", true);
    s = await st();
    await run.check(s.mode === "home" && s.apps.indexOf("HomeApp") >= 0 && !!(await page.$(".hm")), "강사 소개 → 두잉고 소개: 두잉고 소개 파일", s, page);
    // 뒤로 가기도 그 영역 파일로
    await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.goBack()]);
    await L.ready(page);
    s = await st();
    await run.check(s.mode === "landing" && s.path === "/p/" + iid, "뒤로 가기 → 강사 소개로 (그 영역 파일을 다시 받아요)", s, page);
    // 3) 끄기 스위치(이 브라우저만 · localStorage dc:split=off) → 예전처럼 모든 파일
    await page.evaluate(() => { try { localStorage.setItem("dc:split", "off"); } catch (e) { /* 저장소 없음 */ } });
    await L.open(page, base, "/");
    s = await st();
    await page.evaluate(() => { try { localStorage.removeItem("dc:split"); } catch (e) { /* 저장소 없음 */ } });
    await run.check(s.mode === "vod" && s.apps.length === APPS.length, "끄기(dc:split=off) → 예전처럼 모든 화면 파일", s, page);
    await page.context().close();
  }
};
