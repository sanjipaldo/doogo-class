/* 화면 나눠 받기 (Next.js 전환 4단계 4-3 · 2026-11)
 * 예전에는 어느 주소로 들어와도 모든 화면 파일(강사센터 admin.js 1.2MB 포함)을 받았어요. 이제 영역마다 필요한 파일만 받아요.
 *  · 늘 받는 것(index.html 에 그대로): 주소 · 데이터 · 공용 규칙 · 아이콘 · 약관 글 · main.js + styles.css · home.css(로고 · 로그인 화면) · vod.css
 *  · 영역별로 더 받는 것(아래 NEED — 이 파일과 main.js 가 넣어요):
 *      스토어(vod) · 두잉고 강의실(student)  vod.js · app.js
 *      강사센터 · 마스터(admin)             vod.js · admin.js + admin.css
 *      강사 소개 · 무료강의(landing)        landing.js + landing.css · doogo-free.css
 *      두잉고 소개(home)                    vod.js · guide-data.js · guide.js · home.js + guide.css
 *  · 순서는 예전 index.html 그대로예요 (스크립트는 예전 순서대로 실행 · CSS 도 예전 자리에 끼워 넣어요)
 *  · 처음 들어올 때: <head> 에서 이 영역 CSS 를 넣고 스크립트를 미리 받기 시작 → main.js 가 다 받은 뒤 화면을 그려요
 *  · 다른 영역으로 옮겨 가면 main.js 가 페이지를 새로 불러요 (오래 열어 둔 창에서도 화면 파일이 섞이지 않게) — 스토어 ↔ 두잉고 강의실은 같은 파일이라 그대로
 *  · 끄기: Vercel 환경 변수 DC_SPLIT_OFF=1 로 다시 배포하면 예전처럼 모든 파일을 받아요 (<html data-split="off">) · 이 브라우저만: localStorage dc:split = off */
(function () {
  "use strict";
  const JS_ORDER = ["vod.js", "app.js", "admin.js", "landing.js", "guide-data.js", "guide.js", "home.js"];
  const CSS_ORDER = ["styles.css", "admin.css", "landing.css", "doogo-free.css", "home.css", "vod.css", "guide.css"];
  const NEED = {
    vod: { js: ["vod.js", "app.js"], css: [] },
    student: { js: ["vod.js", "app.js"], css: [] },
    admin: { js: ["vod.js", "admin.js"], css: ["admin.css"] },
    landing: { js: ["landing.js"], css: ["landing.css", "doogo-free.css"] },
    home: { js: ["vod.js", "guide-data.js", "guide.js", "home.js"], css: ["guide.css"] }
  };
  const me = document.currentScript, base = (me && me.src) || location.href, query = (base.split("#")[0].split("?")[1] || "");
  const url = (f) => { const u = new URL(f, base); u.search = query ? "?" + query : ""; return u.href; };
  const fileOf = (u) => String(u || "").split("#")[0].split("?")[0].split("/").pop();
  const off = () => { if (document.documentElement.getAttribute("data-split") === "off") return true; try { return localStorage.getItem("dc:split") === "off"; } catch (e) { return false; } };
  const needOf = (area) => (off() ? { js: JS_ORDER, css: CSS_ORDER } : NEED[area] || NEED.student);

  /* 주소(#/… 모양) → 영역 — main.js 가 화면을 고를 때도 이 규칙을 써요 (한 곳에서만) */
  const isRoot = (h) => h === "" || h === "#" || h === "#/";
  function of(h) {
    h = String(h || "");
    if (/^#\/center/.test(h)) return "admin";
    if (isRoot(h) || /^#\/(vod|terms|privacy|refund)(\/|\?|$)/.test(h)) return "vod";
    if (/^#\/(p|free)(\/|\?|$)/.test(h)) return "landing";
    if (/^#\/(doinggo|partner)(\/|\?|$)/.test(h)) return "home";
    return "student";
  }
  /* 지금 주소 → 영역 (route.js 가 아직 없을 때 · <head> 에서 미리 받기용) — main.js 의 주소 고치기와 같은 규칙 */
  function guess() {
    let h = location.hash;
    if (window.__dcClean && h.indexOf("#/") !== 0) { const p = location.pathname; h = p === "/" || p === "/index.html" ? "" : "#" + p + location.search; }
    if (isRoot(h) && /^\/doinggo(\/|$)/.test(location.pathname)) h = "#/doinggo";
    if (/^#\/about(\?|$)/.test(h)) h = "#/doinggo";
    return of(h);
  }

  /* ---------- 파일 받기 ---------- */
  const js = {}, css = {}; // 파일 이름 → { done, p }
  // index.html 에 이미 있는 CSS 는 받아 둔 것으로 (렌더링을 막는 기본 CSS)
  Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"][href]'), (n) => { const f = fileOf(n.getAttribute("href")); if (CSS_ORDER.indexOf(f) >= 0) css[f] = { done: true, p: Promise.resolve(), el: n }; });
  Array.prototype.forEach.call(document.querySelectorAll("script[src]"), (n) => { const f = fileOf(n.getAttribute("src")); if (JS_ORDER.indexOf(f) >= 0) js[f] = { done: true, p: Promise.resolve() }; });
  const settle = (rec, el, what) => new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error("시간 초과: " + what)), 30000);
    el.addEventListener("load", () => { clearTimeout(t); rec.done = true; ok(); });
    el.addEventListener("error", () => { clearTimeout(t); no(new Error("받지 못했어요: " + what)); });
  });
  function addCss(f) {
    if (css[f]) return css[f].p;
    const el = document.createElement("link");
    el.rel = "stylesheet"; el.href = url(f);
    const rec = { done: false, el };
    rec.p = settle(rec, el, f);
    // 예전 자리에 끼워 넣기: 순서상 뒤에 오는 CSS 중 이미 있는 첫 번째 것 앞 (없으면 마지막 CSS 뒤)
    const i = CSS_ORDER.indexOf(f);
    const after = CSS_ORDER.slice(i + 1).map((x) => css[x] && css[x].el).find(Boolean);
    const before = CSS_ORDER.slice(0, i).reverse().map((x) => css[x] && css[x].el).find(Boolean);
    if (after) after.parentNode.insertBefore(el, after);
    else if (before) before.parentNode.insertBefore(el, before.nextSibling);
    else document.head.appendChild(el);
    css[f] = rec;
    return rec.p;
  }
  function addJs(f) {
    if (js[f]) return js[f].p;
    const el = document.createElement("script");
    el.src = url(f); el.async = false; // 예전처럼 넣은 순서대로 실행
    const rec = { done: false };
    rec.p = settle(rec, el, f);
    (document.body || document.head).appendChild(el);
    js[f] = rec;
    return rec.p;
  }
  /** 이 영역 파일이 다 들어와 있는지 (바로 그려도 되는지) */
  function ready(area) { const n = needOf(area); return n.js.every((f) => js[f] && js[f].done) && n.css.every((f) => css[f] && css[f].done); }
  /** 이 영역 파일을 받아요 → Promise (스크립트는 예전 순서대로) */
  function ensure(area) {
    const n = needOf(area);
    const cs = n.css.map(addCss);
    const ss = JS_ORDER.filter((f) => n.js.indexOf(f) >= 0).map(addJs);
    return Promise.all(cs.concat(ss)).then(() => area);
  }
  /** <head> 에서: 이 영역 CSS 넣고 스크립트는 미리 받기만 (실행은 main.js 가 ensure 로) */
  function preload(area) {
    const n = needOf(area);
    n.css.forEach(addCss);
    n.js.forEach((f) => {
      if (js[f]) return;
      const l = document.createElement("link");
      l.rel = "preload"; l.as = "script"; l.href = url(f);
      document.head.appendChild(l);
    });
  }
  window.DC_AREA = { of, guess, ready, ensure, NEED, JS_ORDER, CSS_ORDER, off };
  try { preload(guess()); } catch (e) { /* 미리 받기는 덤이에요 — main.js 가 다시 받아요 */ }
})();
