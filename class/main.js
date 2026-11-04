/* 화면 전환: 대표 주소(/)는 두고클래스 VOD 스토어(vod.js · #/vod… 와 같음), 두잉고 소개는 /doinggo · #/doinggo (home.js · 예전 #/about · #/partner 도 여기로),
 * #/center… 는 강사센터·마스터(admin.js), #/p/… · #/free/… 는 강사 홍보 · 무료강의 페이지(landing.js), 나머지는 두잉고 수강생 센터(app.js)
 * 서버(/api)가 있으면 데이터를 서버에서 받아 오고(여러 기기·여러 사람이 같은 데이터), 없으면 이 브라우저에 저장한다. */
(function () {
  "use strict";
  let mode = null;
  /* React 화면 (Next.js 전환 4-4 ~ 6단계 · shared/screens.js): 이 페이지가 React 화면 틀(app/(react)/layout.js)이면 REACT_PAGE.
   * 주소를 옮겼는데 React 화면 ↔ 예전 화면이 바뀌면 페이지를 새로 불러요 — 서버(proxy.js)가 맞는 쪽을 보내요.
   * React 화면 틀에서도 서버 연결 · 로그인 맞추기 · 자동 로그아웃 · 다시 그리기는 이 파일이 그대로 해요 (그리기만 window.ReactApp) */
  const REACT_PAGE = !!window.DC_REACT_PAGE;
  let reactSkip = false;
  const reactKey = (h) => { if (reactSkip || !window.DC_SCREENS) return null; const p = h && h.indexOf("#/") === 0 ? h.slice(1) : "/"; return window.DC_SCREENS.onHere(p); };
  const isRoot = (h) => h === "" || h === "#" || h === "#/";
  // 저장하지 않은 편집이 있으면 화면을 옮기기 전에 한 번 묻기 (강사센터 페이지 편집기가 정해 둠) — 영역을 옮기려고 새로 불러올 때는 이미 물어봤어요
  let leaving = false;
  window.addEventListener("beforeunload", (e) => { if (!leaving && window.__dirty && window.__dirty()) { e.preventDefault(); e.returnValue = ""; } });
  /** 지금 주소 → { h: 화면이 읽을 #주소, fix: 주소창을 바꿀 값(없으면 null), next: 영역 } — 처음 파일 받기와 go() 가 같이 써요 */
  function pick() {
    let h = ROUTE.hash, fix = null;
    // 정식 서버가 /doinggo 주소를 이 화면으로 넘겨 주면(rewrite) 두잉고 소개로
    if (isRoot(h) && /^\/doinggo(\/|$)/.test(location.pathname)) h = "#/doinggo";
    // 예전 두잉고 소개 주소(#/about)는 #/doinggo 로
    if (/^#\/about(\?|$)/.test(h)) { fix = "#/doinggo"; h = "#/doinggo"; }
    // 빈 해시(# · #/)는 대표 주소(/)로 깨끗하게
    if (h === "#" || h === "#/") { fix = ""; h = ""; }
    // 서버가 /vod 주소를 이 화면으로 넘겨 주면 두고클래스 스토어로
    if (isRoot(h) && /^\/vod\/?$/.test(location.pathname)) h = "#/vod";
    // 대표 주소는 두고클래스 스토어가 먼저 (두고클래스가 메인 · 두잉고는 /doinggo) — 영역 규칙은 areas.js 한 곳에
    return { h, fix, next: window.DC_AREA.of(h) };
  }
  /* 화면 나눠 받기 (4단계): 옮겨 갈 영역의 화면 파일이 아직 없으면 페이지를 새로 불러요 — 새 페이지가 그 영역 파일만 받아요.
   * 저장 중인 내용은 먼저 보내고, 같은 주소로 15초 안에 또 새로 부르게 되면(혹시 모를 되풀이) 그 자리에서 파일을 받아 그려요 */
  function moveArea(next, react) {
    const key = "dc:area-reload", here = location.pathname + location.search + location.hash, now = Date.now();
    let last = null;
    try { last = JSON.parse(sessionStorage.getItem(key) || "null"); } catch (e) { last = null; }
    if (last && last.u === here && now - last.t < 15000) {
      // React 화면 ↔ 예전 화면을 바꾸려고 새로 불렀는데 또 같은 쪽이 왔으면(서버 스위치와 이 브라우저 판단이 다름): 예전 화면 틀이면 예전 화면으로 그리고, React 화면 틀이면 안내만
      if (react) { if (REACT_PAGE) { if (window.ReactApp) window.ReactApp.fail(); return; } reactSkip = true; }
      window.DC_AREA.ensure(next).then(() => go(true), bootFail);
      return;
    }
    try { sessionStorage.setItem(key, JSON.stringify({ u: here, t: now })); } catch (e) { /* 되풀이 막기만 못 해요 */ }
    leaving = true;
    // 떠 있는 알림(로그아웃했어요 · 오래 사용하지 않아 로그아웃 …)은 새로 부른 페이지에서 이어서 보여요 (React 화면 ↔ 예전 화면 · 영역 옮기기)
    try { const ts = Array.from(document.querySelectorAll("#toast-root .toast")).map((t) => ({ c: t.className, h: t.innerHTML })); if (ts.length) sessionStorage.setItem("dc:toasts", JSON.stringify(ts.slice(-2))); } catch (e) { /* 알림만 못 이어요 */ }
    if (!REACT_PAGE) root.innerHTML = bootHtml();
    Promise.resolve(DB.remote.on ? DB.remote.flush() : null).catch(() => {}).then(() => new Promise((ok) => setTimeout(ok, 150))).then(() => location.reload());
  }
  function go(resumed) {
    if (!resumed && window.__leaveGuard && !window.__leaveGuard(ROUTE.hash)) return;
    const p = pick(), h = p.h, next = p.next;
    if (p.fix !== null) ROUTE.replace(p.fix);
    const rk = reactKey(h);
    if (!!rk !== REACT_PAGE) { moveArea(next, true); return; }
    if (!window.DC_AREA.ready(next)) { moveArea(next); return; }
    const changed = next !== mode;
    mode = next;
    document.body.dataset.mode = next;
    if (next === "admin") window.applyStudentTheme(null); else document.body.dataset.master = "";
    // 소개 화면에서 내려가며 검정으로 바뀐 휴대폰 주소창 색을 다른 화면에서는 원래대로
    if (next !== "home") { const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", "#ffffff"); }
    if (REACT_PAGE) { window.ReactApp.go(rk, h, changed); return; } // 팝업 닫기 · 화면 그리기는 React 가
    document.getElementById("modal-root").innerHTML = "";
    const app = next === "admin" ? window.AdminApp : next === "vod" ? window.VodApp : next === "landing" ? window.LandingApp : next === "home" ? window.HomeApp : window.StudentApp;
    if (changed) app.mount(); else app.render();
  }

  // 서버 로그인 상태와 이 브라우저에 남은 화면 세션을 맞춘다 (다른 기기에서 로그아웃 · 계정 중지 등)
  function reconcile() {
    const me = DB.remote.me;
    const st = DB.session.student();
    if (st && st.preview && !me.admin) DB.session.setStudent(null);
    else if (st && !st.preview && !(me.student && me.student.sid === st.id)) DB.session.setStudent(null);
    const ad = DB.session.admin();
    if (ad) {
      const a = me.admin;
      const ok = a && a.role === ad.role && (a.role === "master" ? (a.staffId || null) === (ad.staffId || null) : a.role === "partner" ? a.pid === ad.partnerId : a.role === "media" ? a.mdid === ad.mediaId : a.iid === ad.instructorId && (a.role !== "coach" || a.cid === ad.coachId));
      if (!ok) DB.session.setAdmin(null);
    }
  }

  // 다른 사람이 바꾼 내용이 들어오면 다시 그린다. 입력 중이거나 팝업이 열려 있으면 다음 화면 이동 때까지 미룬다
  // 휴대폰 메뉴가 열려 있으면 닫힐 때까지 미루고(다시 그리면 메뉴가 닫힘), 다시 그려도 보던 스크롤 자리는 그대로
  let typing = false, waiting = false, retry = 0;
  document.addEventListener("input", () => { typing = true; }, true);
  document.addEventListener("submit", () => { setTimeout(() => { typing = false; }, 0); }, true);
  const busy = () => typing || !!document.querySelector("#modal-root > *") || (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  const navOpen = () => !!document.querySelector(".nav-open");
  function later() {
    clearTimeout(retry);
    retry = setTimeout(() => { if (!waiting) return; if (busy() || navOpen()) return later(); waiting = false; redraw(); }, 2000);
  }
  function redraw() {
    const h = ROUTE.hash, y = window.scrollY;
    go();
    if (ROUTE.hash === h && y) window.scrollTo(0, y);
  }
  function onRemote(type, info) {
    if (type === "reset") { location.reload(); return; }
    if (type === "error") { notify(info, "warn"); return; }
    if (type === "offline") { notify("인터넷 연결이 불안정해 저장을 다시 시도하고 있어요.", "warn", "offline"); return; }
    if (type === "saving" && info === false) { const t = document.querySelector('.toast[data-key="offline"]'); if (t) t.remove(); return; }
    if (type !== "change") return;
    reconcile();
    if (busy()) { waiting = true; return; }
    if (navOpen()) { waiting = true; later(); return; }
    redraw();
  }
  function notify(msg, kind, key) {
    const box = document.getElementById("toast-root");
    if (!box || (key && box.querySelector('[data-key="' + key + '"]'))) return;
    const t = document.createElement("div");
    t.className = "toast";
    if (key) t.dataset.key = key;
    t.innerHTML = (window.icon ? window.icon(kind === "warn" ? "alert" : "check", "sm") : "") + "<span>" + DB.esc(msg) + "</span>";
    box.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  /* ---------- 자동 로그아웃 (2026-11) ----------
   * 로그인한 채로 창을 닫거나 내려 두면 다음에 열 때도 로그인이 남아 있었어요. 이제는
   *  · 강사센터 · 코치 · 마스터 · 파트너 · 온드미디어: 30분 동안 아무 동작(누르기 · 키보드 · 스크롤)이 없으면
   *  · 수강생(두잉고 강의실) · DOOGO CLASS 회원: 화면을 보고 있는 동안은 그대로(영상 시청 중에도), 창을 닫거나 내린 뒤 60분이 지나면
   * 로그아웃해요. 마지막 동작 시각은 이 브라우저에 남겨 탭끼리 같이 써요 (input = 진짜 동작 · seen = 화면을 보고 있던 때) */
  const IDLE = { admin: 30 * 60e3, student: 60 * 60e3 }, K_IN = "doinggo:last-input", K_SEEN = "doinggo:last-seen";
  const lsNum = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* 저장 못 하면 자동 로그아웃만 쉬어요 */ } };
  let wrote = 0;
  function touch() { const t = Date.now(); if (t - wrote < 10e3) return; wrote = t; lsSet(K_IN, t); lsSet(K_SEEN, t); }
  ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach((ev) => window.addEventListener(ev, touch, { passive: true, capture: true }));
  // 화면을 보고 있는 동안은 1분마다 ‘보고 있음’ (수강생 영상 시청은 끊지 않아요)
  setInterval(() => { if (document.visibilityState === "visible") lsSet(K_SEEN, Date.now()); }, 60e3);
  const studentIn = () => { const s = DB.session.student(); return !!(s && !s.preview); };
  // 서버 쿠키(수강생 · DOOGO CLASS 회원)로 로그인했는지 이 브라우저에 기억 — 다음에 열 때(서버에 묻기 전) 확인용
  const K_WHO = "doinggo:signed";
  const signedSt = () => lsNum(K_WHO) > 0;
  let started = false;
  function markSigned() { if (!started) return; const me = (DB.remote.on && DB.remote.me) || {}; lsSet(K_WHO, me.student || me.vod || studentIn() ? 1 : 0); }
  // 로그인 · 로그아웃은 화면 갱신 없이 지나가기도 해서, 1분마다 · 창을 내리거나 닫을 때도 남겨요
  setInterval(markSigned, 60e3);
  window.addEventListener("pagehide", markSigned);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") markSigned(); });
  /** 지금 로그아웃해야 하는 쪽 { admin, student } — 기록이 처음이면 지금부터 셈 */
  function idleOver() {
    const now = Date.now(), lin = lsNum(K_IN), lseen = lsNum(K_SEEN);
    const ad = !!DB.session.admin(), stu = studentIn() || signedSt();
    // 처음이거나 로그인한 곳이 없으면(방문자) 지금부터 셈
    if (!lin || !lseen || (!ad && !stu)) { lsSet(K_IN, now); lsSet(K_SEEN, now); return { admin: false, student: false }; }
    return { admin: ad && now - lin > IDLE.admin, student: stu && now - lseen > IDLE.student };
  }
  /** 서버 쿠키까지 지워요 (강사센터 · 수강생 · DOOGO CLASS 회원) — 실패해도 이 화면 세션은 지워요 */
  function idleLogout(o, server) {
    const jobs = [];
    if (o.admin) DB.session.setAdmin(null);
    if (o.student && studentIn()) DB.session.setStudent(null);
    if (server) {
      const post = (name, b) => fetch("api/" + name, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).catch(() => {});
      if (o.admin) jobs.push(post("auth", { action: "logout", which: "admin" }));
      if (o.student) { jobs.push(post("auth", { action: "logout", which: "student" })); jobs.push(post("vod-auth", { action: "logout" })); }
    }
    lsSet(K_IN, Date.now()); lsSet(K_SEEN, Date.now()); if (o.student) lsSet(K_WHO, 0);
    try { sessionStorage.setItem("doinggo:idle-out", "1"); } catch (e) { /* 안내만 못 보여요 */ }
    return Promise.all(jobs);
  }
  const idleMsg = () => { try { if (sessionStorage.getItem("doinggo:idle-out")) { sessionStorage.removeItem("doinggo:idle-out"); notify("오래 사용하지 않아 안전을 위해 로그아웃했어요. 다시 로그인해 주세요.", "warn"); } } catch (e) { /* 안내 생략 */ } };
  let idleBusy = false;
  function idleCheck() {
    if (idleBusy || (window.__dirty && window.__dirty())) return; // 저장하지 않은 편집이 있으면 기다려요
    const o = idleOver();
    // 강사센터 밖(수강생 강의실 · VOD 영상)을 보는 탭은 강사센터 로그아웃 때문에 새로 고치지 않아요 — 강사센터 탭을 다시 볼 때 · 다음에 열 때 확인
    // (운영의 깨끗한 주소 /center/… 에서는 location.hash 가 비어 있어서 ROUTE.hash 로 봐요)
    if (o.admin && !/^#\/center/.test(ROUTE.hash)) o.admin = false;
    if (!o.admin && !o.student) return;
    idleBusy = true;
    idleLogout(o, DB.remote.on).then(() => { if (DB.remote.on) location.reload(); else { idleBusy = false; idleMsg(); go(); } });
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") idleCheck(); });
  window.addEventListener("pageshow", idleCheck);
  window.addEventListener("focus", idleCheck);
  // 강사센터 등은 화면을 켜 둔 채 30분 동안 동작이 없어도 로그아웃 (1분마다 확인)
  setInterval(() => { if (document.visibilityState === "visible") idleCheck(); }, 60e3);

  /** 새로 부르기 전에 떠 있던 알림 다시 보여 주기 (moveArea 가 남겨요 · 이 탭에서 이 사이트가 만든 알림만) */
  function carryToasts() {
    let ts = null;
    try { ts = JSON.parse(sessionStorage.getItem("dc:toasts") || "null"); sessionStorage.removeItem("dc:toasts"); } catch (e) { ts = null; }
    const box = document.getElementById("toast-root");
    if (!box || !Array.isArray(ts)) return;
    ts.forEach((x) => { if (!x || typeof x.h !== "string") return; const t = document.createElement("div"); t.className = String(x.c || "toast"); t.innerHTML = x.h; box.appendChild(t); setTimeout(() => t.remove(), 4000); });
  }
  function start(server) {
    DB.load();
    carryToasts();
    idleMsg();
    started = true;
    if (server) { reconcile(); markSigned(); setTimeout(idleCheck, 0); DB.remote.listen((type, info) => { if (type === "change") markSigned(); onRemote(type, info); }); }
    else {
      // 다른 탭(예: 강사센터 탭)에서 바뀐 내용을 이 탭에도 반영
      window.addEventListener("storage", (e) => {
        if (e.key && e.key.indexOf("moonclass:db") === 0) { DB.load(); go(); }
      });
    }
    window.addEventListener("hashchange", () => { typing = false; if (waiting) waiting = false; go(); if (window.SiteTags) window.SiteTags.page(); });
    go();
    // 분석 · 마케팅 도구 (마스터 › 첫 화면 · 사업자 정보 › 분석 · 마케팅 도구에 넣은 것만 — tags.js)
    if (window.SiteTags) window.SiteTags.boot();
  }
  // 네이버 카페 링크: 휴대폰에서는 모바일 카페(m.cafe.naver.com), PC 에서는 PC 카페로 연다
  // (PC 주소 그대로 휴대폰에서 열면 글이 PC 화면 틀 안에 작게 보인다)
  const MOBILE = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  function cafeLink(href, mobile) {
    let u;
    try { u = new URL(href); } catch (e) { return href; }
    const host = u.hostname.toLowerCase();
    if (host !== "cafe.naver.com" && host !== "m.cafe.naver.com") return href;
    if ((host === "m.cafe.naver.com") === mobile) return href;
    let club = "", cid = "", aid = "";
    const fromPath = (p) => {
      let m = /\/cafes\/(\d+)\/articles\/(\d+)/.exec(p);
      if (m) { cid = m[1]; aid = m[2]; return; }
      m = /ArticleRead\.nhn\?(.*)$/i.exec(p);
      if (m) { const q = new URLSearchParams(m[1]); cid = q.get("clubid") || ""; aid = q.get("articleid") || ""; }
    };
    const inner = u.searchParams.get("iframe_url_utf8") || u.searchParams.get("iframe_url");
    if (inner) { try { fromPath(decodeURIComponent(inner)); } catch (e) { fromPath(inner); } }
    fromPath(u.pathname + u.search);
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg[0] === "ca-fe" && seg[1] && !/^(web|cafes)$/.test(seg[1])) seg.shift();
    if (seg[0] && !/^(f-e|ca-fe|ArticleRead\.nhn|ArticleList\.nhn|MyCafeIntro\.nhn)$/i.test(seg[0])) {
      club = seg[0];
      if (!aid && /^\d+$/.test(seg[1] || "")) aid = seg[1];
    }
    if (mobile) {
      if (club && aid) return "https://m.cafe.naver.com/" + club + "/" + aid;
      if (cid && aid) return "https://m.cafe.naver.com/ca-fe/web/cafes/" + cid + "/articles/" + aid;
      if (club) return "https://m.cafe.naver.com/" + club;
    } else {
      if (club && aid) return "https://cafe.naver.com/" + club + "/" + aid;
      if (cid && aid) return "https://cafe.naver.com/ca-fe/cafes/" + cid + "/articles/" + aid;
      if (club) return "https://cafe.naver.com/" + club;
    }
    return href;
  }
  window.cafeLink = cafeLink;
  const fixCafe = (e) => {
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a || !/cafe\.naver\.com/i.test(a.href)) return;
    const next = cafeLink(a.href, MOBILE);
    if (next !== a.href) a.href = next;
  };
  document.addEventListener("click", fixCafe, true);
  document.addEventListener("auxclick", fixCafe, true);
  document.addEventListener("contextmenu", fixCafe, true);

  const root = document.getElementById("root");
  // 첫 로딩 화면: 흰 바탕 + DOOGO CLASS 글자 로고 + 진행 막대 + ‘로딩중입니다’ (index.html 에 이미 있으면 그대로 — 다시 그리면 깜박인다)
  const LOGO = '<img class="boot-logo boot-logo-dc" src="assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" width="156" height="20" fetchpriority="high">';
  function bootHtml() { return '<div class="boot-wait" role="status" aria-live="polite">' + LOGO + '<span class="boot-bar" aria-hidden="true"><i></i></span><p class="boot-txt">로딩중입니다<span class="boot-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>'; }
  function bootFail(err) {
    console.error(err);
    if (REACT_PAGE) { if (window.ReactApp) window.ReactApp.fail(); return; }
    root.innerHTML = '<div class="boot-wait boot-err" role="alert">' + LOGO + '<b>서버에 연결하지 못했어요</b><span>잠시 후 다시 시도해 주세요.</span><button type="button" onclick="location.reload()">다시 시도</button></div>';
  }
  if (!REACT_PAGE && !root.querySelector(".boot-wait")) root.innerHTML = bootHtml();
  // 이 주소 영역의 화면 파일(areas.js)은 서버 연결과 같이 받기 시작해요 — 둘 다 끝나면 그려요
  const files0 = window.DC_AREA.ensure(pick().next);
  files0.catch(() => {}); // 실패는 아래에서 한 번만 알려요
  const boot0 = idleOver();
  (boot0.admin || boot0.student ? idleLogout(boot0, true) : Promise.resolve()).then(() => DB.remote.connect()).then((server) => files0.then(() => window.DC_REACT_WAIT).then(() => server)).then(start, bootFail);
})();

/* 두잉고 시안: 아래 탭 막대 — 지금 화면에 맞는 탭 표시 (수강생 강의실 · 강사센터 둘 다)
 * 예전에는 app.js 맨 끝에 있었는데, 화면 나눠 받기(4단계)로 강사센터에는 app.js 가 없어서 늘 받는 이 파일로 옮겼어요 */
(function () {
  function mark() { var h = ROUTE.hash || "#/home", best = null, bl = -1; document.querySelectorAll(".bw-tab[href]").forEach(function (a) { var k = a.getAttribute("href"); a.classList.remove("on"); if ((h === k || (!/^#\/center(\/master)?$/.test(k) && (h.indexOf(k + "/") === 0 || h.indexOf(k + "?") === 0))) && k.length > bl) { best = a; bl = k.length; } }); if (best) best.classList.add("on"); }
  window.addEventListener("hashchange", function () { setTimeout(mark, 0); });
  new MutationObserver(function () { if (document.querySelector(".bw-tabbar")) mark(); }).observe(document.getElementById("root") || document.body, { childList: true });
  mark();
})();
