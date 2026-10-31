/* 두잉고 사용법 영상 (/doinggo/guide · #/doinggo/guide/<ins|stu>/<영상 id>)
 * 강사 버전 / 수강생 버전 탭 → 큰 묶음별 영상 목록 → 소리 없이 자막으로 따라 하는 영상.
 * ‘영상’은 실제 화면 사진(scripts/guide-capture.js 가 찍은 assets/guide/*.webp) 위에서
 * 화면이 누를 곳으로 확대해 따라가고, 마우스가 움직여 누르고, 아래 자막이 바뀌는 재생기예요 (시간 막대 · 일시정지 · 전체 화면).
 * 화면이 바뀌면 사진만 다시 찍으면 돼요. 자료는 guide-data.js (window.GUIDE_DATA). */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // icons.js 에 없는 재생기 아이콘은 여기서 (같은 선 굵기)
  const SVG = (d, s) => '<svg class="icon ' + (s || "sm") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const LOCAL = { pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>', maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>', rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>' };
  const ALIAS = { listChecks: "checks", logIn: "user" };
  const ic = (n, s) => (LOCAL[n] ? SVG(LOCAL[n], s) : window.icon ? window.icon(ALIAS[n] || n, s || "sm") : "");
  const D = () => window.GUIDE_DATA || { tabs: [] };
  const BASE = "assets/guide/";
  const hl = (s) => esc(s).replace(/\[([^\]]+)\]/g, "<em>$1</em>"); // [강조] → 빨간 글자
  // 영상마다 ‘이 메뉴 바로 열기’
  const LINK = {
    "i-brand": "#/center/brand", "i-menus": "#/center/menus", "i-cohort": "#/center/cohorts", "i-students": "#/center/students", "i-billing": "#/center/billing",
    "i-lesson": "#/center/curriculum", "i-mission": "#/center/missions", "i-review": "#/center/reviews", "i-guide": "#/center/guide", "i-free": "#/center/free",
    "i-landing": "#/center/landing", "i-qna": "#/center/questions", "i-coach": "#/center/coaches",
    "s-login": "#/login", "s-home": "#/home", "s-lesson": "#/curriculum", "s-mission": "#/missions", "s-ask": "#/qna", "s-bot": "#/home", "s-cal": "#/schedule"
  };
  const TAB_META = { ins: { icon: "monitor", sub: "강사센터 세팅 · 운영" }, stu: { icon: "phone", sub: "수강생 강의실 사용법" } };

  /* ---------- 시간 ---------- */
  const INTRO = 2.6, OUTRO = 2.6;
  const stepDur = (s) => Math.min(6.2, Math.max(4.2, 3.0 + String(s.cap || "").replace(/[\[\]]/g, "").length * 0.055));
  function timeline(v) {
    let t = INTRO; const at = [];
    v.steps.forEach((s) => { const d = stepDur(s); at.push({ t0: t, d }); t += d; });
    return { at, total: t + OUTRO };
  }
  const fmt = (t) => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- 상태 ---------- */
  const st = { tab: "ins", vid: "", t: 0, playing: false, raf: 0, last: 0, v: null, tl: null, root: null, endTimer: 0, ctrlTimer: 0, nextAt: 0 };
  const tabs = () => D().tabs || [];
  const tabOf = (k) => tabs().find((t) => t.key === k) || tabs()[0];
  const vids = (t) => (t ? t.groups.flatMap((g) => g.items) : []);
  const findVid = (id) => { for (const t of tabs()) { const v = vids(t).find((x) => x.id === id); if (v) return { t, v }; } return null; };
  const count = () => tabs().reduce((a, t) => a + vids(t).length, 0);

  function parse() {
    const m = /^#\/doinggo\/guide(?:\/([a-z]+))?(?:\/([\w-]+))?/.exec((window.ROUTE ? ROUTE.hash : location.hash) || "");
    const t = tabOf(m && m[1]); st.tab = t ? t.key : "ins";
    const f = m && m[2] ? findVid(m[2]) : null;
    st.vid = f && f.t.key === st.tab ? f.v.id : (vids(t)[0] || {}).id || "";
  }
  const setUrl = () => { const h = "#/doinggo/guide/" + st.tab + (st.vid ? "/" + st.vid : ""); if (window.ROUTE) ROUTE.replace(h); };

  /* ---------- 화면 ---------- */
  function html() {
    parse();
    const t = tabOf(st.tab);
    return '<section class="gd" aria-labelledby="gd-h"><div class="hm-wrap gd-in">' +
      '<div class="gd-head"><p class="gd-k">DOINGGO GUIDE</p><h1 id="gd-h">사용법 영상</h1><p class="gd-meta"><b>' + count() + "편</b> · 소리 없음 · 자막으로 따라 해요</p></div>" +
      '<div class="gd-tabs" role="tablist" aria-label="사용법 영상 종류">' + tabs().map((x) => '<button type="button" role="tab" class="gd-tab' + (x.key === st.tab ? " on" : "") + '" aria-selected="' + (x.key === st.tab) + '" data-gd-tab="' + x.key + '">' +
        '<span class="gd-tab-ic">' + ic((TAB_META[x.key] || {}).icon || "play", "sm") + "</span><span><b>" + esc(x.label) + "</b><small>" + esc((TAB_META[x.key] || {}).sub || "") + " · " + vids(x).length + "편</small></span></button>").join("") + "</div>" +
      '<div class="gd-body" id="gd-body">' + body(t) + "</div></div></section>";
  }
  function body(t) {
    const v = (findVid(st.vid) || {}).v || vids(t)[0];
    if (!v) return '<p class="gd-empty">영상을 준비하고 있어요.</p>';
    return '<div class="gd-grid"><div class="gd-col">' + player(v) + now(v) + "</div>" +
      '<nav class="gd-list" aria-label="' + esc(t.label) + ' 영상 목록">' + t.groups.map((g) => '<div class="gd-grp"><h3>' + esc(g.title) + "</h3><ul>" + g.items.map((x) => {
        const on = x.id === v.id;
        return '<li><button type="button" class="gd-it' + (on ? " on" : "") + '" data-gd-vid="' + x.id + '"' + (on ? ' aria-current="true"' : "") + '><span class="gd-it-pl">' + ic(on ? "pause" : "play", "xs") + '</span><span class="gd-it-t"><b>' + esc(x.title) + "</b><small>" + esc(x.sub.split("›").pop().trim()) + '</small></span><span class="gd-it-d">' + fmt(timeline(x).total) + "</span></button></li>";
      }).join("") + "</ul></div>").join("") + "</nav></div>";
  }
  function now(v) {
    const link = LINK[v.id], ins = st.tab === "ins";
    return '<div class="gd-now"><div><h2>' + esc(v.title) + "</h2><p>" + esc(v.sub) + "</p></div>" +
      (link ? '<a class="gd-go" href="' + link + '">' + ic(ins ? "monitor" : "phone", "xs") + (ins ? "강사센터에서 열기" : "수강생 화면 열기") + ic("arrowUpRight", "xs") + "</a>" : "") + "</div>";
  }
  function player(v) {
    const m = st.tab === "stu";
    return '<div class="gp' + (m ? " gp-m" : "") + '" id="gp" tabindex="0" role="region" aria-label="' + esc(v.title) + ' 사용법 영상">' +
      '<div class="gp-stage" data-gp="stage">' +
        '<div class="gp-scr">' +
          '<div class="gp-top"><span class="gp-brand">' + (window.doinggoB ? window.doinggoB("black", "gp-logo") : "두잉고") + '</span><span class="gp-pill">' + esc(v.title) + '</span><span class="gp-segs">' + v.steps.map(() => "<i><u></u></i>").join("") + "</span></div>" +
          '<div class="gp-view"><div class="gp-cam">' + (m ? '<span class="gp-phone" aria-hidden="true"></span>' : "") + '<img class="gp-img" alt="" decoding="async"><img class="gp-img" alt="" decoding="async"></div>' +
            '<span class="gp-ring" aria-hidden="true"></span><span class="gp-rip" aria-hidden="true"></span>' +
            '<span class="gp-cur" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4.5 2.8l14.6 8.9-6.4 1.4 3.6 6.9-2.9 1.5-3.6-6.9-4.7 4.6z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></span></div>' +
          '<div class="gp-cap" aria-live="polite"><b class="gp-no">1</b><span class="gp-cap-t"></span></div>' +
        "</div>" +
        '<div class="gp-intro"><span class="gp-intro-ic">' + ic(v.icon || "play", "md") + '</span><span class="gp-intro-pill">' + (window.doinggoB ? window.doinggoB("black", "gp-intro-logo") : "") + "사용법</span><h3>" + esc(v.title) + "</h3><p>" + hl(v.lead || v.sub) + "</p></div>" +
        '<div class="gp-end"><span class="gp-end-ic">' + ic("check", "md") + "</span><h3>" + esc(v.title) + " 끝!</h3><p>강사님 화면에서 그대로 따라 해 보세요.</p>" +
          '<div class="gp-end-b"><button type="button" class="gp-btn gp-btn-l" data-gp="replay">' + ic("rotateCcw", "xs") + "다시 보기</button>" + nextBtn(v) + "</div></div>" +
        '<button type="button" class="gp-big" data-gp="toggle" aria-label="재생">' + ic("play", "md") + "</button>" +
      "</div>" +
      '<div class="gp-ctrl"><button type="button" class="gp-cb" data-gp="toggle" aria-label="재생">' + ic("play", "sm") + '</button><span class="gp-time"><b>0:00</b> / ' + fmt(timeline(v).total) + "</span>" +
        '<div class="gp-bar" data-gp="bar" role="slider" tabindex="0" aria-label="재생 위치" aria-valuemin="0" aria-valuemax="' + Math.round(timeline(v).total) + '" aria-valuenow="0"><i class="gp-bar-f"></i><i class="gp-bar-k"></i></div>' +
        '<button type="button" class="gp-cb" data-gp="full" aria-label="전체 화면">' + ic("maximize", "sm") + "</button></div>" +
      '<i class="gp-line" aria-hidden="true"><u></u></i>' +
    "</div>";
  }
  function nextBtn(v) {
    const list = vids(tabOf(st.tab)), i = list.findIndex((x) => x.id === v.id), n = list[i + 1];
    return n ? '<button type="button" class="gp-btn gp-btn-p" data-gp="next" data-id="' + n.id + '"><span>다음 영상</span><b>' + esc(n.title) + "</b>" + ic("chevRight", "xs") + '<i class="gp-cd" aria-hidden="true"></i></button>' : "";
  }

  /* ---------- 재생기 ---------- */
  const $ = (s) => (st.root ? st.root.querySelector(s) : null);
  function load(v) {
    st.v = v; st.tl = timeline(v); st.t = 0; st.shown = [-1, -1]; st.front = 0;
    const g = $("#gp"); if (!g) return;
    st.el = { g, stage: g.querySelector(".gp-stage"), view: g.querySelector(".gp-view"), cam: g.querySelector(".gp-cam"), imgs: g.querySelectorAll(".gp-img"), ring: g.querySelector(".gp-ring"), rip: g.querySelector(".gp-rip"), cur: g.querySelector(".gp-cur"), cap: g.querySelector(".gp-cap-t"), no: g.querySelector(".gp-no"), segs: g.querySelectorAll(".gp-segs u"), intro: g.querySelector(".gp-intro"), end: g.querySelector(".gp-end"), time: g.querySelector(".gp-time b"), fill: g.querySelector(".gp-bar-f"), knob: g.querySelector(".gp-bar-k"), bar: g.querySelector(".gp-bar"), line: g.querySelector(".gp-line u"), cd: g.querySelector(".gp-cd") };
    // 사진 미리 받기 (처음 두 장 먼저)
    v.steps.forEach((s, i) => { const im = new Image(); im.decoding = "async"; if (i > 1) im.loading = "lazy"; im.src = BASE + s.img; });
    st.el.cam.style.width = v.w + "px"; st.el.cam.style.height = v.h + "px";
    draw();
  }
  // 단계 i 의 카메라: 누를 곳이 있으면 그곳으로 확대, 없으면 화면 전체
  function camOf(i) {
    const v = st.v, s = v.steps[i];
    if (!s || !s.box) return { z: 1, x: 0.5, y: 0.5 };
    const [bx, by, bw, bh] = s.box, m = st.tab === "stu";
    let z = s.z || (m ? Math.min(2.3, Math.max(1.5, 0.42 / Math.max(bw, bh * 0.6))) : Math.min(2.1, Math.max(1.35, Math.min(0.42 / bw, 0.34 / bh))));
    // 좁은 화면(휴대폰)에서는 더 크게 확대해 글자가 읽히게
    const G = st.el && st.el.view ? geo() : { W: 800, H: 460, s0: 0.6 };
    if (G.W < 560) z = Math.min(m ? 3.2 : 3.4, z * (m ? 1.45 : 1.6));
    // 넓은 칸은 칸 전체가 화면에 들어올 만큼만 확대 (테두리가 잘리지 않게)
    const fit = Math.min((0.9 * G.W) / (bw * v.w * G.s0), (0.78 * G.H) / (bh * v.h * G.s0));
    z = Math.max(1, Math.min(z, fit));
    return { z, x: bx + bw / 2, y: by + bh / 2 };
  }
  function geo() {
    const r = st.el.view.getBoundingClientRect(), v = st.v;
    const s0 = Math.min(r.width / v.w, r.height / v.h) * (st.tab === "stu" ? 0.96 : 1);
    return { W: r.width, H: r.height, s0 };
  }
  function place(c, G) {
    const v = st.v, S = G.s0 * c.z, cw = v.w * S, ch = v.h * S;
    let tx = G.W / 2 - c.x * cw, ty = G.H / 2 - c.y * ch;
    tx = cw >= G.W ? Math.min(0, Math.max(G.W - cw, tx)) : (G.W - cw) / 2;
    ty = ch >= G.H ? Math.min(0, Math.max(G.H - ch, ty)) : (G.H - ch) / 2;
    return { S, tx, ty };
  }
  function draw() {
    if (!st.el || !st.v) return;
    const E = st.el, v = st.v, tl = st.tl, t = st.t, n = v.steps.length;
    let i = tl.at.findIndex((a, k) => t < a.t0 + a.d || k === n - 1); if (t < INTRO) i = 0;
    const a = tl.at[i], lt = Math.max(0, t - a.t0);
    // 사진: 바뀌는 순간 0.35초 겹쳐 바꾸기
    const want = i, prev = Math.max(0, i - 1), fade = t < INTRO ? 1 : Math.min(1, lt / 0.35);
    setImg(want, prev, fade);
    // 카메라
    const G = geo(), c1 = camOf(i), c0 = i === 0 ? { z: 1, x: 0.5, y: 0.5 } : camOf(i - 1);
    const k = t < INTRO ? 0 : ease(Math.min(1, lt / 0.95));
    const c = { z: lerp(c0.z, c1.z, k), x: lerp(c0.x, c1.x, k), y: lerp(c0.y, c1.y, k) };
    const P = place(c, G);
    E.cam.style.transform = "translate(" + P.tx.toFixed(1) + "px," + P.ty.toFixed(1) + "px) scale(" + P.S.toFixed(4) + ")";
    // 마우스 · 누를 곳 테두리
    const s = v.steps[i], box = s.box;
    const toScr = (x, y) => [P.tx + x * v.w * P.S, P.ty + y * v.h * P.S];
    const prevPt = (() => { for (let j = i - 1; j >= 0; j--) if (v.steps[j].box) { const b = v.steps[j].box; return [b[0] + b[2] / 2, b[1] + b[3] / 2]; } return [0.62, 0.72]; })();
    if (box && t >= INTRO) {
      const tgt = [box[0] + Math.min(box[2] / 2, 0.5 * box[2]), box[1] + box[3] / 2];
      const mk = ease(Math.min(1, Math.max(0, (lt - 0.45) / 0.9)));
      const pt = toScr(lerp(prevPt[0], tgt[0], mk), lerp(prevPt[1], tgt[1], mk));
      const tap = s.tap !== false, tapAt = 1.65;
      const press = tap && lt > tapAt && lt < tapAt + 0.18;
      E.cur.style.opacity = "1";
      E.cur.style.transform = "translate(" + (pt[0] - 5).toFixed(1) + "px," + (pt[1] - 3).toFixed(1) + "px) scale(" + (press ? 0.82 : 1) + ")";
      const r0 = toScr(box[0], box[1]), r1 = toScr(box[0] + box[2], box[1] + box[3]);
      const ro = Math.min(1, Math.max(0, (lt - 0.9) / 0.35));
      E.ring.style.opacity = String(ro * (k >= 1 ? 1 : 0.6));
      E.ring.style.left = (r0[0] - 5).toFixed(1) + "px"; E.ring.style.top = (r0[1] - 5).toFixed(1) + "px";
      E.ring.style.width = (r1[0] - r0[0] + 10).toFixed(1) + "px"; E.ring.style.height = (r1[1] - r0[1] + 10).toFixed(1) + "px";
      const rp = tap ? (lt - tapAt) / 0.6 : -1;
      if (rp > 0 && rp < 1) { E.rip.style.opacity = String(1 - rp); E.rip.style.transform = "translate(" + pt[0].toFixed(1) + "px," + pt[1].toFixed(1) + "px) scale(" + (0.3 + rp * 1.6).toFixed(3) + ")"; }
      else E.rip.style.opacity = "0";
      E.g.classList.toggle("gp-typing", !!s.type && lt > 1.1);
    } else {
      E.cur.style.opacity = t < INTRO ? "0" : "0"; E.ring.style.opacity = "0"; E.rip.style.opacity = "0"; E.g.classList.remove("gp-typing");
    }
    // 자막 · 단계 막대
    if (E.cap.dataset.i !== String(i)) { E.cap.dataset.i = String(i); E.cap.innerHTML = hl(s.cap); E.no.textContent = String(i + 1); E.cap.parentNode.classList.remove("in"); void E.cap.offsetWidth; E.cap.parentNode.classList.add("in"); }
    E.segs.forEach((u, j) => { const p = t < INTRO ? 0 : j < i ? 1 : j > i ? 0 : Math.min(1, lt / a.d); u.style.transform = "scaleX(" + p.toFixed(3) + ")"; });
    // 처음 · 끝 카드
    const io = t < INTRO - 0.45 ? 1 : t < INTRO ? (INTRO - t) / 0.45 : 0;
    E.intro.style.opacity = io.toFixed(3); E.intro.style.visibility = io > 0 ? "visible" : "hidden";
    const endT = tl.total - OUTRO, eo = t <= endT ? 0 : Math.min(1, (t - endT) / 0.45);
    E.end.style.opacity = eo.toFixed(3); E.end.style.visibility = eo > 0 ? "visible" : "hidden"; E.end.classList.toggle("on", eo > 0.6);
    // 시간 막대
    const pr = Math.min(1, t / tl.total);
    E.time.textContent = fmt(t); E.fill.style.transform = "scaleX(" + pr.toFixed(4) + ")"; E.knob.style.left = (pr * 100).toFixed(2) + "%"; E.line.style.transform = "scaleX(" + pr.toFixed(4) + ")";
    E.bar.setAttribute("aria-valuenow", String(Math.round(t)));
  }
  function setImg(i, prev, fade) {
    const E = st.el, v = st.v, src = (j) => BASE + v.steps[j].img;
    // 앞 장(front)에 지금 사진, 뒷장에 이전 사진
    if (st.shown[st.front] !== i) {
      if (st.shown[1 - st.front] === i) st.front = 1 - st.front;
      else { const back = 1 - st.front; st.front = back; E.imgs[back].src = src(i); st.shown[back] = i; }
    }
    const other = 1 - st.front;
    if (fade < 1 && i !== prev) { if (st.shown[other] !== prev) { E.imgs[other].src = src(prev); st.shown[other] = prev; } E.imgs[other].style.opacity = "1"; }
    else E.imgs[other].style.opacity = "0";
    E.imgs[st.front].style.opacity = String(fade < 1 && i !== prev ? fade : 1);
    E.imgs[st.front].style.zIndex = "2"; E.imgs[other].style.zIndex = "1";
  }

  function loop(ts) {
    if (!st.playing) return;
    if (!active()) { pause(); return; } // 다른 화면으로 가면 멈춰요
    const dt = st.last ? Math.min(0.1, (ts - st.last) / 1000) : 0; st.last = ts;
    st.t = Math.min(st.tl.total, st.t + dt);
    draw();
    if (st.t >= st.tl.total) { pause(); armNext(); return; }
    st.raf = requestAnimationFrame(loop);
  }
  function play() {
    if (!st.el) return;
    clearNext();
    if (st.t >= st.tl.total - 0.05) st.t = 0;
    st.playing = true; st.last = 0; st.el.g.classList.add("playing"); syncBtns(); showCtrl();
    cancelAnimationFrame(st.raf); st.raf = requestAnimationFrame(loop);
  }
  function pause() { st.playing = false; cancelAnimationFrame(st.raf); if (st.el) { st.el.g.classList.remove("playing"); syncBtns(); st.el.g.classList.add("show-ctrl"); } }
  const toggle = () => (st.playing ? pause() : play());
  function syncBtns() {
    if (!st.el) return;
    const li = st.root && st.root.querySelector(".gd-it.on .gd-it-pl"); if (li) li.innerHTML = ic(st.playing ? "pause" : "play", "xs");
    st.el.g.querySelectorAll('[data-gp="toggle"]').forEach((b) => { b.setAttribute("aria-label", st.playing ? "일시정지" : "재생"); b.innerHTML = ic(st.playing ? "pause" : "play", b.classList.contains("gp-big") ? "md" : "sm"); });
  }
  function seek(t) { st.t = Math.max(0, Math.min(st.tl.total, t)); clearNext(); draw(); }
  function showCtrl() {
    if (!st.el) return; const g = st.el.g; g.classList.add("show-ctrl"); clearTimeout(st.ctrlTimer);
    st.ctrlTimer = setTimeout(() => { if (st.playing && !g.matches(":hover")) g.classList.remove("show-ctrl"); }, 2200);
  }
  // 끝나면 4초 뒤 다음 영상 (버튼에 남은 시간 표시 · 다른 걸 누르면 취소)
  function armNext() {
    const b = st.el && st.el.g.querySelector('[data-gp="next"]'); if (!b) return;
    b.classList.add("cd"); st.endTimer = setTimeout(() => select(b.dataset.id, true), 4000);
  }
  function clearNext() { clearTimeout(st.endTimer); const b = st.el && st.el.g.querySelector('[data-gp="next"]'); if (b) b.classList.remove("cd"); }

  function select(id, auto) {
    const f = findVid(id); if (!f) return;
    clearNext(); pause();
    st.tab = f.t.key; st.vid = f.v.id; setUrl();
    const b = $("#gd-body"); if (!b) return;
    b.innerHTML = body(f.t);
    load(f.v);
    const g = $("#gp");
    if (g && !auto) { const r = g.getBoundingClientRect(); if (r.top < 70 || r.top > innerHeight * 0.5) window.scrollTo({ top: window.scrollY + r.top - 84, behavior: "smooth" }); }
    play();
  }
  function selectTab(k) {
    const t = tabOf(k); if (!t || t.key === st.tab) return;
    st.root.querySelectorAll("[data-gd-tab]").forEach((x) => { const on = x.dataset.gdTab === t.key; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
    select(vids(t)[0].id, true);
  }
  function full() {
    const g = st.el && st.el.g; if (!g) return;
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    if (g.classList.contains("gp-fake")) { g.classList.remove("gp-fake"); document.documentElement.classList.remove("gp-lock"); setTimeout(draw, 50); return; }
    const req = g.requestFullscreen || g.webkitRequestFullscreen;
    if (req) { const p = req.call(g); if (p && p.catch) p.catch(() => fake(g)); } else fake(g);
  }
  function fake(g) { g.classList.add("gp-fake"); document.documentElement.classList.add("gp-lock"); setTimeout(draw, 50); }

  function mount(root) {
    st.root = root;
    parse();
    const f = findVid(st.vid); if (!f) return;
    load(f.v);
    // 화면에 보이면 저절로 재생 (처음 한 번)
    const g = $("#gp");
    if (g && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); if (!st.started) { st.started = true; play(); } } }, { threshold: 0.5 });
      io.observe(g);
    }
  }
  function stop() { pause(); clearNext(); st.el = null; st.root = null; st.started = false; }

  /* ---------- 누르기 · 끌기 · 키보드 ---------- */
  const active = () => !!(st.root && document.body.contains(st.root));
  document.addEventListener("click", (e) => {
    if (!active()) return;
    const tb = e.target.closest("[data-gd-tab]"); if (tb) { selectTab(tb.dataset.gdTab); return; }
    const it = e.target.closest("[data-gd-vid]"); if (it) { if (it.dataset.gdVid === st.vid) toggle(); else select(it.dataset.gdVid); return; }
    const b = e.target.closest("[data-gp]"); if (!b || !st.el || !st.el.g.contains(b)) return;
    const a = b.dataset.gp;
    if (a === "toggle") toggle();
    else if (a === "full") full();
    else if (a === "replay") { seek(0); play(); }
    else if (a === "next") select(b.dataset.id);
    else if (a === "stage") { if (e.target.closest(".gp-end-b")) return; if (matchMedia("(hover: none)").matches && st.playing && !st.el.g.classList.contains("show-ctrl")) { showCtrl(); return; } toggle(); }
  });
  let drag = false;
  const barSeek = (e) => { const r = st.el.bar.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * st.tl.total); };
  document.addEventListener("pointerdown", (e) => { if (!active() || !st.el || !e.target.closest('[data-gp="bar"]')) return; drag = true; st.wasPlaying = st.playing; pause(); barSeek(e); e.preventDefault(); });
  document.addEventListener("pointermove", (e) => { if (drag) barSeek(e); else if (active() && st.el && st.el.g.contains(e.target)) showCtrl(); });
  // 끝까지 끌어 놓으면 끝 카드 + 다음 영상 준비 (처음부터 다시 틀지 않아요)
  document.addEventListener("pointerup", () => { if (!drag) return; drag = false; if (st.t >= st.tl.total - 0.05) { st.t = st.tl.total; draw(); armNext(); } else if (st.wasPlaying) play(); });
  document.addEventListener("keydown", (e) => {
    if (!active() || !st.el) return;
    if (e.key === "Escape" && st.el.g.classList.contains("gp-fake")) { full(); return; }
    if (!st.el.g.contains(document.activeElement)) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); seek(st.t + 5); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); seek(st.t - 5); }
    else if (e.key === "f") full();
  });
  window.addEventListener("resize", () => { if (active()) draw(); });
  document.addEventListener("fullscreenchange", () => { if (active()) setTimeout(draw, 60); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && st.playing) pause(); });

  window.GuideApp = { html, mount, stop, count, timeline };
})();
