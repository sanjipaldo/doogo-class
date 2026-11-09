/* 두고 클래스 플랫폼 — 공용 데이터 계층
 *
 * 수강생 센터(app.js)와 강사센터·마스터(admin.js)가 함께 쓴다.
 * 지금은 브라우저 localStorage 에 저장하고, 서버가 붙으면 이 파일의 load/save/progress 만
 * API 호출로 바꾸면 된다.
 *
 *  moonclass:db:v2            플랫폼 전체 (강사, 콘텐츠, 기수, 수강생)
 *  moonclass:progress:<학생ID> 수강생별 제출·시청·문의·채팅 기록 (사진이 들어가 크기가 커서 따로 둔다)
 */
(function () {
  "use strict";

  const KEY_DB = "moonclass:db:v2";
  const KEY_PROGRESS = "moonclass:progress:";

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* 무시 */ } },
    keys() { try { return Object.keys(localStorage); } catch (e) { return []; } }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- 날짜 ---------------- */
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  // 날짜 · 일정 계산은 화면과 서버가 같이 쓰는 공용 모듈(shared/dates.js · shared/schedule.js)에 있어요 (Next.js 전환 2단계)
  const DCS = window.DCS || {}, SCH = DCS.schedule;
  const { pad, toStr, parseDate, addDays, diffDays } = DCS.dates;
  const todayStr = () => toStr(new Date());
  const fmtMD = (s) => { const d = parseDate(s); return (d.getMonth() + 1) + "/" + d.getDate() + " (" + DOW[d.getDay()] + ")"; };
  const fmtFull = (s) => { const d = parseDate(s); return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()); };
  const fmtKo = (s) => { const d = parseDate(s); return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[d.getDay()] + ")"; };
  const fmtStamp = (ts) => { const d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /** 본문 서식: 줄바꿈 그대로 + 간단한 표시만 지원 (강사가 외울 것 없이 쓰는 정도)
   *   ## 소제목 · - 목록 (· • 도 됨) · 1. 번호 목록 · > 강조 상자 · --- 구분선 · **굵게** · 주소는 자동 링크
   *   opts.token(n) 을 주면 [사진1] 같은 자리에 그 결과를 넣는다 (공지 사진) */
  function rich(text, opts) {
    opts = opts || {};
    const inline = (t) => esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,)!?’”])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let para = [], list = null;
    const flushP = () => { if (para.length) { out.push("<p>" + para.join("<br>") + "</p>"); para = []; } };
    const flushL = () => { if (list) { out.push("<" + list.tag + ">" + list.items.map((x) => "<li>" + x + "</li>").join("") + "</" + list.tag + ">"); list = null; } };
    const flush = () => { flushP(); flushL(); };
    String(text || "").replace(/\r/g, "").split("\n").forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) { flush(); return; }
      if (opts.token && (m = line.match(/^\[사진\s*(\d+)\]$/))) { flush(); out.push(opts.token(Number(m[1]))); return; }
      if ((m = line.match(/^#{1,3}\s+(.+)$/))) { flush(); out.push("<h3>" + inline(m[1]) + "</h3>"); return; }
      if (/^(-{3,}|—{2,}|_{3,})$/.test(line)) { flush(); out.push("<hr>"); return; }
      if ((m = line.match(/^>\s?(.*)$/))) { flush(); out.push('<div class="rich-note">' + inline(m[1]) + "</div>"); return; }
      if ((m = line.match(/^[-·•*]\s+(.+)$/))) { flushP(); if (!list || list.tag !== "ul") { flushL(); list = { tag: "ul", items: [] }; } list.items.push(inline(m[1])); return; }
      if ((m = line.match(/^(\d{1,2})[.)]\s+(.+)$/))) { flushP(); if (!list || list.tag !== "ol") { flushL(); list = { tag: "ol", items: [] }; } list.items.push(inline(m[2])); return; }
      flushL(); para.push(inline(line));
    });
    flush();
    return '<div class="rich">' + out.join("") + "</div>";
  }
  const uid = (p) => (p || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /** 유튜브 주소/ID → 11자리 ID (아니면 빈 문자열) */
  function youtubeId(v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/^[\w-]{11}$/.test(v)) return v;
    const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : "";
  }
  /* 비메오 (2026-11-09 · 두잉고 강의 · 라이브 다시보기 · 응원 영상 · 자료실 · 추가 메뉴 영상도 유튜브처럼):
   * 영상 칸(이름은 예전 그대로 youtubeId)에 유튜브는 11자리 ID, 비메오는 주소(https://vimeo.com/숫자[/해시])를 그대로 둬요.
   * 일부 공개(링크가 있는 사람만) 비메오 주소의 해시도 지켜서 재생기 주소에 h= 로 넣어요 */
  const VM_RE = /vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|manage\/videos\/)?(\d{5,12})(?:\/([0-9a-f]{6,}))?/i;
  function vimeoParts(v) {
    const s = String(v || "").trim(), m = s.match(VM_RE);
    return m ? { id: m[1], h: m[2] || (s.match(/[?&]h=([0-9a-f]{6,})/i) || [])[1] || "" } : null;
  }
  /** 비메오 주소 → 저장할 주소 https://vimeo.com/숫자[/해시] (아니면 빈 문자열) */
  function vimeoUrl(v) { const p = vimeoParts(v); return p ? "https://vimeo.com/" + p.id + (p.h ? "/" + p.h : "") : ""; }
  /** 비메오 주소 → 재생기 주소 player.vimeo.com/video/숫자?h=… (아니면 빈 문자열) */
  function vimeoSrc(v) { const p = vimeoParts(v); return p ? "https://player.vimeo.com/video/" + p.id + "?" + (p.h ? "h=" + p.h + "&" : "") + "title=0&byline=0&portrait=0&dnt=1" : ""; }
  /** 영상 칸에 넣은 주소 → 저장할 값: 비메오 주소 · 유튜브 11자리 ID (둘 다 아니면 빈 문자열) */
  const vidVal = (v) => (/vimeo\.com/i.test(String(v || "")) ? vimeoUrl(v) : youtubeId(v));
  /** 영상이 연결돼 있는지 (유튜브 · 비메오) */
  const vidOk = (v) => !!(youtubeId(v) || vimeoSrc(v));
  /** 고치는 칸에 보여 줄 주소: 유튜브 ID → https://youtu.be/ID · 비메오는 저장한 주소 그대로 */
  const vidShow = (v) => (!v ? "" : vimeoSrc(v) ? String(v) : youtubeId(v) ? "https://youtu.be/" + youtubeId(v) : String(v));

  /* ---------------- 영상 길이 (비메오 · 유튜브 실제 재생 시간) ----------------
   * 영상 링크로 실제 길이를 서버(/api/public · vdur)에서 받아 24:30 처럼 보여 줘요. 받은 길이는 이 브라우저에 기억하고,
   * 강의를 고칠 수 있는 사람의 화면에서는 강의 데이터(durSec)에도 남겨 모두에게 바로 보여요. 길이를 모르면 적어 둔 값 그대로 */
  const VD_LS = "dc:vdur", VD_TTL = 30 * 864e5, VD_RETRY = 864e5;
  function vidKey(u) {
    const s = String(u || "").trim();
    const vm = s.match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|manage\/videos\/)?(\d{5,12})(?:\/([0-9a-f]{6,}))?/i);
    if (vm) { const h = vm[2] || (s.match(/[?&]h=([0-9a-f]{6,})/i) || [])[1] || ""; return "vm:" + vm[1] + (h ? ":" + h : ""); }
    const yt = youtubeId(s);
    return yt ? "yt:" + yt : "";
  }
  let vdMem = null, vdT = 0, vdBusy = false;
  const vdQ = new Set(), vdPend = new Set(), vdSubs = [];
  const vdAll = () => { if (!vdMem) { try { vdMem = JSON.parse(localStorage.getItem(VD_LS) || "{}") || {}; } catch (e) { vdMem = {}; } } return vdMem; };
  /** 초 → 24:30 · 1:02:03 */
  const vdFmt = (sec) => { const t = Math.round(Number(sec) || 0), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = String(t % 60).padStart(2, "0"); return h ? h + ":" + String(m).padStart(2, "0") + ":" + x : m + ":" + x; };
  /** 기억해 둔 실제 길이(초) — 모르면 0 */
  function vdKnown(u) { const k = vidKey(u), x = k && vdAll()[k]; return x && x[0] > 0 ? x[0] : 0; }
  /** 서버에 물어볼 영상 (잠깐 모았다가 한 번에) — 물어보는 중이면 true */
  function vdAsk(u) {
    const k = vidKey(u);
    if (!k || !R.on) return false;
    if (vdQ.has(u) || vdPend.has(u)) return true;
    const x = vdAll()[k];
    if (x && Date.now() - x[1] < (x[0] > 0 ? VD_TTL : VD_RETRY)) return false;
    vdQ.add(u); clearTimeout(vdT); vdT = setTimeout(vdFlush, 300);
    return true;
  }
  async function vdFlush() {
    if (vdBusy) { vdT = setTimeout(vdFlush, 500); return; }
    const urls = Array.from(vdQ).slice(0, 40);
    urls.forEach((u) => { vdQ.delete(u); vdPend.add(u); });
    if (!urls.length) return;
    vdBusy = true;
    let d = null;
    try { const j = await call("public", { action: "vdur", urls }); d = j && j.ok ? j.d || {} : null; } catch (e) {}
    vdBusy = false;
    // 못 받으면(서버 연결 문제) 5분 뒤 다시 · 영상을 못 찾으면 하루 뒤 다시
    const m = vdAll(), now = Date.now(), got = {};
    urls.forEach((u) => { vdPend.delete(u); const k = vidKey(u), sec = d ? Number(d[u]) || 0 : 0; if (d) m[k] = [sec, now]; else if (!m[k]) m[k] = [0, now - VD_RETRY + 3e5]; if (sec > 0) got[k] = sec; });
    try { localStorage.setItem(VD_LS, JSON.stringify(m)); } catch (e) {}
    vdPaint();
    if (Object.keys(got).length) vdSubs.slice().forEach((fn) => { try { fn(got); } catch (e) { console.error(e); } });
    if (vdQ.size) vdT = setTimeout(vdFlush, 300);
  }
  /** 화면에 그려 둔 길이 칸(data-vdur)을 실제 길이로 — 화면을 다시 그리지 않고 글자만 바꿔요 */
  function vdPaint(root) {
    if (typeof document === "undefined") return;
    (root || document).querySelectorAll("[data-vdur]").forEach((el) => { const x = vdAll()[el.dataset.vdur]; if (x && x[0] > 0) { el.textContent = vdFmt(x[0]); el.removeAttribute("data-vdur"); el.classList.add("is-real"); } });
  }
  /** 강의 길이 글자: 실제 길이(durSec · 기억한 값)면 24:30, 모르면 적어 둔 값(fb)을 보여 주고 받아 오는 대로 바꿔요 */
  function vdLabel(url, durSec, fb, cls) {
    const c = "vdur" + (cls ? " " + cls : ""), sec = Number(durSec) > 0 ? Number(durSec) : vdKnown(url);
    if (sec > 0) return '<span class="' + c + ' is-real">' + vdFmt(sec) + "</span>";
    const k = vidKey(url);
    if (k) vdAsk(url);
    return fb || k ? '<span class="' + c + '"' + (k ? ' data-vdur="' + k + '"' : "") + ">" + esc(fb || "") + "</span>" : "";
  }
  /** 강의 길이(초): 실제 길이 → 없으면 적어 둔 분 × 60 (총 시간 · 남은 시간 계산) */
  function vdSec(url, durSec, min) { const sec = Number(durSec) > 0 ? Number(durSec) : vdKnown(url); return sec > 0 ? sec : Math.max(0, Number(min) || 0) * 60; }
  /** 고칠 수 있는 사람 화면에서: 영상은 있는데 길이(durSec)가 없거나 영상이 바뀐 강의에 실제 길이를 넣어요.
   * 넣은 게 있으면 done(개수) — 저장은 부르는 쪽에서. setMin(it, 초)로 적어 둔 분 칸도 같이 맞춰요 */
  function vdFill(items, urlOf, done, setMin) {
    const todo = (items || []).filter((it) => { const k = it && vidKey(urlOf(it)); return k && (!(Number(it.durSec) > 0) || it.durKey !== k); });
    if (!todo.length) return 0;
    const apply = () => {
      let n = 0;
      todo.forEach((it) => { const u = urlOf(it), k = vidKey(u), sec = vdKnown(u); if (k && sec > 0 && (it.durSec !== sec || it.durKey !== k)) { it.durSec = sec; it.durKey = k; if (setMin) setMin(it, sec); n++; } });
      return n;
    };
    const n = apply();
    if (n) done(n);
    // 물어보는 중인 영상이 있을 때만 답을 기다려요 (못 찾은 영상은 하루 뒤에 다시)
    const rest = todo.filter((it) => it.durKey !== vidKey(urlOf(it))).filter((it) => vdAsk(urlOf(it)));
    if (!rest.length) return n;
    const fn = () => { const m = apply(); if (m) done(m); if (rest.every((it) => it.durKey === vidKey(urlOf(it)) || !vdAsk(urlOf(it)))) off(); };
    const off = () => { const i = vdSubs.indexOf(fn); if (i >= 0) vdSubs.splice(i, 1); };
    vdSubs.push(fn); setTimeout(off, 60000);
    return n;
  }
  const vdur = { key: vidKey, fmt: vdFmt, known: vdKnown, ask: vdAsk, paint: vdPaint, label: vdLabel, sec: vdSec, fill: vdFill };

  /* ---------------- 처음 데이터 · 데이터 정리 규칙 (공용 모듈 shared/data-rules.js — Next.js 전환 2단계) ----------------
   * 강사별 화면 색 · 수강생 메뉴 · 새 강사 기본 콘텐츠 · 처음 데이터 · 빠진 기본값 채우기는 서버도 같은 규칙을 써서 공용 모듈에 있어요.
   * 여기서는 이 화면의 지금 데이터 · 저장 · 저장소를 넘겨요 (이름은 예전 그대로 DB.THEMES · DB.template · DB.menuConfig …) */
  const DR = window.DCS.data.make({
    db: () => db, setDb: (v) => { db = v; }, seed: () => window.CLASS_SEED, save: () => save(), remote: () => R.on,
    storeGet: (k, fb) => store.get(k, fb), storeSet: (k, v) => store.set(k, v)
  });
  const { LANDING_SECTIONS, landingOf, FREE_SECTIONS, freeStarter, freeOf, THEMES, themeOf, STUDENT_MENUS, OLD_MENU_LABELS, botNameOf, OLD_BOT_NAME, RENAME_PHRASES, QL_RENAME, renameWord, renameContentPhrases, NOTE_PROMPTS, LIB_MENUS, CUSTOM_ICONS, VOD_MENUS, VOD_LIVE_ONLY, VOD_LABEL, splitMid, menuConfig, vodMenuConfig, isCustom, menuOn, libOn, template, QL_ICONS, defaultQuickLinks, MISSION_KINDS, missionKind, normalizeWeeks, normalizeContent, fullDemoProgress, fromSeed, migrate2to3, loadFixups } = DR;


  /**
   * 새 강사 플랫폼을 문대표 플랫폼 구성 그대로 시작한다 (메뉴·주차·과제·FAQ·서류 가이드·자료실 틀).
   * 문대표 이름은 새 강사 이름으로 바꾸고, 문대표 개인 영상·첨부 파일은 비워 둔다.
   */
  function templateFromMoon(brand) {
    const src = (db && db.content.moon) || (window.CLASS_SEED.content || {}).moon;
    if (!src) return template(brand);
    const inst = brand.instructor || "강사", name = brand.name || inst;
    const c = JSON.parse(JSON.stringify(src).replace(/두고보는 문대표/g, name).replace(/문대표/g, inst));
    const t = template(brand).brand;
    Object.assign(c.brand, { name, instructor: inst, courseTitle: t.courseTitle, shortTitle: t.shortTitle, botName: t.botName,
      loginEyebrow: "DOINGGO", loginHeadline: t.loginHeadline, loginSub: t.loginSub, theme: t.theme, themeSet: true,
      youtubeChannel: "", freeCourseUrl: "", kakaoChannel: "", liveUrl: "", worldClock: false, photo: "", field: "", instagram: "" });
    c.channels = defaultChannels();
    c.weeks.forEach((w) => w.lessons.forEach((l) => { l.youtubeId = ""; l.attachments = []; }));
    c.motivation = [];
    c.replays = []; c.showcase = [];
    ["ebook", "file", "vod", "senior"].forEach((k) => (c.resources[k] || []).forEach((it) => { it.youtubeId = ""; it.attachments = []; if (!it.tool) it.url = ""; }));
    c.notices.forEach((n) => { n.date = todayStr(); });
    c.pages = {};
    c.curricula = []; delete c.curriculumName;
    delete c.landing; delete c.freeClass; delete c.freeQuestions;
    return normalizeContent(c);
  }
  /** 문대표 메뉴 구성(켜고 끈 메뉴·이름·순서)을 복사 — 추가 메뉴는 빼고 */
  function moonMenu() {
    const m = menuConfig("moon");
    return { items: m.items.filter((x) => !isCustom(x.key)).map((x) => Object.assign({}, x)), library: Object.assign({}, m.library) };
  }

  // 유료강의 자료실 이용 안내 팝업 (자료실에 들어올 때마다 뜬다). 비워 둔 칸은 기본 문구
  function libNoticeOf(c) {
    const n = c.libNotice || {};
    const course = c.brand.courseTitle || c.brand.name || "";
    return {
      title: n.title || "유료강의 자료실 이용 안내",
      intro: n.intro || "본 자료는 **" + course + " 유료 수강생** 전용 혜택입니다.",
      items: n.items && n.items.length ? n.items : ["무단 **복사·캡처·다운로드·외부 공유**를 금지합니다.", "모든 페이지에는 **열람자 정보**(이름·기수·시각)가 표시되어, 유출 경로를 확인할 수 있습니다.", "무단 유출이 확인될 경우, 관련 법령에 따라 책임이 따를 수 있습니다."],
      foot: n.foot !== undefined && n.foot !== "" ? n.foot : (c.brand.instructor || "강사") + "님의 소중한 노하우가 담긴 자료입니다. 본인 학습 용도로만 이용해 주세요.",
      button: n.button || "확인했습니다"
    };
  }

  const quickLinksOf = (c) => (Array.isArray(c.quickLinks) ? c.quickLinks : defaultQuickLinks(c));
  const VOD_KEYS = ["notices", "faqs", "guide", "docsGuide", "resources", "motivation", "glossary", "quotes", "channels", "partners", "pages", "libNotice", "quickLinks", "notePrompts"];
  const vodQuickLinks = (c) => [
    { id: "vq1", title: "VOD 강의 이어 보기", desc: "멈춘 강의부터 바로 다시 보기", url: "#/vodclass", icon: "play" },
    { id: "vq2", title: "강의 자료함", desc: "전자책 · 교재 · 보충 영상", url: "#/library", icon: "library" },
    { id: "vq3", title: "업데이트 소식", desc: "강의 업데이트 · 새 자료 안내", url: "#/notices", icon: "megaphone" },
    { id: "vq4", title: "FAQ · 1:1 코칭", desc: "FAQ로 찾고, 코칭권으로 직접 질문", url: "#/qna", icon: "help" },
    { id: "vq5", title: "DOOGO CLASS 내 강의실", desc: "구매 내역 · 다른 강의 둘러보기", url: "#/vod/my/classes", icon: "store" }
  ].concat(defaultQuickLinks(c).filter((l) => /^https?:/.test(l.url || "")));
  /** VOD 버전 콘텐츠 처음 만들기: 자료 · 체크리스트 · 용어 · 상담 · 제휴는 LIVE에서 복사해 시작하고, 소식 · FAQ · 시작 가이드는 VOD용으로 */
  function vodInit(c) {
    const cp = (k) => (c[k] == null ? undefined : clone(c[k]));
    const ins = (c.brand && c.brand.instructor) || "강사";
    const td = todayStr();
    const liveWord = /주차|과제|기수|라이브|수료|출석|미션/;
    return {
      notices: [
        { id: "vn1", title: "VOD 수강생 전용 두잉고에 오신 걸 환영해요", date: td, pinned: true, body: "VOD 강의를 1강부터 차례대로 보면서, 필요할 때마다 이곳에 들어와 주세요.\n- 강의 자료함: 전자책 · 교재 · 보충 영상\n- 업데이트 소식: 강의가 새로 업데이트되면 여기서 먼저 알려 드려요\n- 자주 묻는 질문 · AI 조교: 막히는 부분은 먼저 여기서 찾아보세요", images: [] },
        { id: "vn2", title: "VOD에는 숙제가 없어요 · 대신 실습 체크리스트로 점검해요", date: td, body: "VOD는 정해진 주차나 과제 마감이 없어요. 내 속도대로 공부하고, ‘실습 체크리스트’로 실제로 해 봤는지 스스로 점검해 보세요.", images: [] }
      ],
      faqs: [
        { id: "vf1", category: "수강", q: "VOD는 언제까지 볼 수 있나요?", a: "결제할 때 고른 수강권 기간(180일 · 365일 · 3년) 동안 볼 수 있어요. 남은 기간은 DOOGO CLASS 마이페이지 › 내 강의실에서 확인하고, 기간이 끝나면 1년 연장권으로 진도 그대로 이어서 들을 수 있어요.", tags: [] },
        { id: "vf2", category: "수강", q: "강의는 어디서 보나요?", a: "이 두잉고 강의실 왼쪽 ‘VOD 강의’ 메뉴에서 바로 재생돼요. 멈춘 강의부터 이어 볼 수 있고, 진도는 DOOGO CLASS 마이페이지에도 똑같이 반영돼요.", tags: [] },
        { id: "vf3", category: "자료", q: "교재 · 자료는 어디서 받나요?", a: "‘강의 자료함’에 전자책 · 교재 · 보충 영상을 모아 두었어요. 강사님이 새 자료를 올리면 ‘업데이트 소식’에서 알려 드려요.", tags: [] },
        { id: "vf4", category: "질문", q: "모르는 부분은 어떻게 물어보나요?", a: "먼저 이 자주 묻는 질문과 AI 조교에서 찾아보세요. 강사에게 직접 묻고 싶다면 DOOGO CLASS에서 1:1 코칭권을 사서 ‘1:1 코칭 질문’에 남기면 " + ins + "님이 직접 답해 드려요. 많이 나오는 질문은 " + ins + "님이 업데이트 소식과 FAQ에 계속 더해 드려요. 결제 · 환불 문의는 DOOGO CLASS 고객센터로 남겨 주세요.", tags: [] },
        { id: "vf5", category: "수강", q: "숙제나 마감이 있나요?", a: "VOD에는 숙제와 마감이 없어요. 내 속도대로 공부하고, ‘실습 체크리스트’로 스스로 점검해 보세요.", tags: [] }
      ].concat((c.faqs || []).filter((f) => !liveWord.test((f.q || "") + (f.a || ""))).map((f) => clone(f))),
      guide: [
        { id: "vg1", title: "VOD 강의 1강부터 보기", desc: "왼쪽 ‘VOD 강의’에서 첫 강의를 열어요", url: "#/vodclass" },
        { id: "vg2", title: "강의 자료함에서 교재 받기", desc: "전자책 · 교재를 먼저 받아 두면 따라 하기 쉬워요", url: "#/library" },
        { id: "vg3", title: "실습 체크리스트 확인", desc: "강의를 보며 실제로 해 볼 단계를 체크해요", url: "#/docs" },
        { id: "vg4", title: "막히면 자주 묻는 질문 보기", desc: "많이 나오는 질문과 답을 모아 두었어요", url: "#/qna" }
      ],
      docsGuide: cp("docsGuide"), resources: cp("resources"), motivation: cp("motivation"), glossary: cp("glossary"), quotes: cp("quotes"),
      channels: cp("channels"), partners: cp("partners"), pages: {}, libNotice: cp("libNotice"), quickLinks: vodQuickLinks(c), notePrompts: [], createdAt: td
    };
  }
  // 예전(1:1 요청이 있던) VOD 시작 문구를 FAQ 안내로 한 번만 바꾼다 (강사가 고친 문구는 그대로)
  function vodFix(v) {
    if (v.fixQna) return vodFix8(v);
    (v.guide || []).forEach((g) => { if (g.id === "vg4" && g.url === "#/qna/requests/new") Object.assign(g, { title: "막히면 자주 묻는 질문 보기", desc: "많이 나오는 질문과 답을 모아 두었어요", url: "#/qna" }); });
    (v.quickLinks || []).forEach((l) => { if (l.id === "vq4" && l.url === "#/qna/requests/new") Object.assign(l, { title: "자주 묻는 질문", desc: "막히는 부분은 여기서 먼저", url: "#/qna" }); });
    if (Array.isArray(v.quickLinks) && !v.quickLinks.some((l) => l.id === "vq5")) v.quickLinks.splice(4, 0, { id: "vq5", title: "DOOGO CLASS 내 강의실", desc: "구매 내역 · 다른 강의 둘러보기", url: "#/vod/my/classes", icon: "store" });
    (v.faqs || []).forEach((f) => { if (f.id === "vf4" && /1:1 요청/.test(f.a || "")) f.a = "VOD 강의는 1:1 답변 대신 이 자주 묻는 질문과 AI 조교로 도와드려요. 많이 나오는 질문은 강사님이 업데이트 소식과 FAQ에 계속 더해 드려요. 결제 · 환불 문의는 DOOGO CLASS 고객센터로 남겨 주세요."; if (f.id === "vf2" && /DOOGO CLASS 강의장/.test(f.a || "")) f.a = "이 두잉고 강의실 왼쪽 ‘VOD 강의’ 메뉴에서 바로 재생돼요. 멈춘 강의부터 이어 볼 수 있고, 진도는 DOOGO CLASS 마이페이지에도 똑같이 반영돼요."; });
    (v.notices || []).forEach((n) => { if (n.id === "vn1" && /질문 · 요청/.test(n.body || "")) n.body = n.body.replace(/- 질문 · 요청:[^\n]*/, "- 자주 묻는 질문 · AI 조교: 막히는 부분은 먼저 여기서 찾아보세요"); });
    v.fixQna = true;
    return vodFix8(v);
  }
  // v8: VOD도 1:1 코칭권이 있으면 강사에게 직접 질문 (강사가 고친 문구는 그대로)
  function vodFix8(v) {
    if (v.fixCoach) return v;
    (v.quickLinks || []).forEach((l) => { if (l.id === "vq4" && l.title === "자주 묻는 질문") Object.assign(l, { title: "FAQ · 1:1 코칭", desc: "FAQ로 찾고, 코칭권으로 직접 질문" }); });
    (v.faqs || []).forEach((f) => { if (f.id === "vf1" && /평생 소장 강의는 기간 없이/.test(f.a || "")) f.a = "결제할 때 고른 수강권 기간(180일 · 365일 · 3년) 동안 볼 수 있어요. 남은 기간은 DOOGO CLASS 마이페이지 › 내 강의실에서 확인하고, 기간이 끝나면 1년 연장권으로 진도 그대로 이어서 들을 수 있어요."; });
    (v.faqs || []).forEach((f) => { if (f.id === "vf4" && /1:1 답변 대신/.test(f.a || "")) f.a = f.a.replace(/VOD 강의는 1:1 답변 대신 이 자주 묻는 질문과 AI 조교로 도와드려요\./, "먼저 이 자주 묻는 질문과 AI 조교에서 찾아보세요. 강사에게 직접 묻고 싶다면 DOOGO CLASS에서 1:1 코칭권을 사서 ‘1:1 코칭 질문’에 남기면 강사님이 직접 답해 드려요."); });
    v.fixCoach = true;
    return v;
  }
  const vodPart = (c, pid) => { if (!c.vod || typeof c.vod !== "object") c.vod = vodInit(c); vodFix(c.vod); return pid && c.vodBy && c.vodBy[pid] ? vodFix(c.vodBy[pid]) : c.vod; };
  /** 이 VOD 상품만의 두잉고 강의실이 있는지 */
  const vodOwn = (iid, pid) => { const c = content(iid), ins = instructor(iid); return !!(pid && c && c.vodBy && c.vodBy[pid] && ins && ins.menuVodBy && ins.menuVodBy[pid]); };
  /** VOD 강의실 만들기: 없으면 공통 VOD 버전(또는 from 강의실)을 복사해 이 VOD 전용으로 (콘텐츠 + 메뉴) */
  function vodEnsure(iid, pid, from) {
    const c = content(iid), ins = instructor(iid); if (!pid || !c || !ins) return false;
    const src = from && c.vodBy && c.vodBy[from] ? c.vodBy[from] : vodPart(c);
    let made = false;
    c.vodBy = c.vodBy || {}; ins.menuVodBy = ins.menuVodBy || {};
    if (!c.vodBy[pid]) { c.vodBy[pid] = clone(src); made = true; }
    if (!ins.menuVodBy[pid]) { vodMenuConfig(iid); ins.menuVodBy[pid] = clone(from && ins.menuVodBy[from] ? ins.menuVodBy[from] : ins.menuVod || {}); made = true; }
    if (made) { delete VOD_PX[iid + ":" + pid]; save(); }
    return made;
  }
  /** 다른 VOD 강의실의 콘텐츠 · 메뉴를 그대로 가져오기 (지금 강의실 내용은 바뀌어요) */
  function vodCopy(iid, pid, from) {
    const c = content(iid), ins = instructor(iid); if (!pid || !c || !ins || pid === from) return false;
    vodEnsure(iid, from); vodEnsure(iid, pid);
    c.vodBy[pid] = clone(from ? c.vodBy[from] : vodPart(c)); ins.menuVodBy[pid] = clone(from ? ins.menuVodBy[from] : ins.menuVod || {});
    delete VOD_PX[iid + ":" + pid]; save(); return true;
  }
  const VOD_PX = {};
  /** 강사센터: VOD 버전을 고칠 때 쓰는 콘텐츠 (VOD 칸은 content.vod 로, 나머지는 LIVE와 같은 content 로 읽고 쓴다) */
  function vodContent(iid, pid) {
    const c = content(iid); if (!c) return null;
    if (pid) vodEnsure(iid, pid);
    vodPart(c, pid);
    const key = iid + ":" + (pid || ""), px = VOD_PX[key];
    if (px && px.c === c) return px.p;
    const isV = (k) => VOD_KEYS.indexOf(k) >= 0;
    const p = new Proxy(c, {
      get: (t, k) => (isV(k) ? vodPart(t, pid)[k] : k === "weeks" ? [] : t[k]),
      set: (t, k, v) => { if (isV(k)) vodPart(t, pid)[k] = v; else t[k] = v; return true; },
      deleteProperty: (t, k) => { if (isV(k)) delete vodPart(t, pid)[k]; else delete t[k]; return true; },
      has: (t, k) => (isV(k) ? k in vodPart(t, pid) : k in t)
    });
    VOD_PX[key] = { c, p };
    return p;
  }
  /** 수강생 화면(VOD 버전)에서 읽는 콘텐츠 */
  function vodView(iid, pid) {
    const c = content(iid); if (!c) return null;
    const v = vodPart(c, pid), out = Object.assign({}, c, { weeks: [], curricula: [], schedule: [], replays: [], showcase: [] });
    VOD_KEYS.forEach((k) => { if (v[k] !== undefined) out[k] = v[k]; else delete out[k]; });
    return out;
  }
  /** 엑셀에서 바로 열리는 CSV 양식 (data: 주소) */
  const csvData = (rows) => "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + rows.map((r) => r.map((v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(",")).join("\n"));

  // 1:1 소통채널: 강사마다 쓰는 상담 채널이 달라서 강사센터에서 직접 만든다
  const CHANNEL_TYPES = [
    { key: "kakao", label: "카카오톡 채널", icon: "message", color: "#fee500", ink: "#191600" },
    { key: "openchat", label: "카카오톡 오픈채팅", icon: "users", color: "#fee500", ink: "#191600" },
    { key: "channeltalk", label: "채널톡", icon: "headset", color: "#5e4bff", ink: "#ffffff" },
    { key: "naver", label: "네이버 톡톡", icon: "message", color: "#03c75a", ink: "#ffffff" },
    { key: "instagram", label: "인스타그램 DM", icon: "camera", color: "#e1306c", ink: "#ffffff" },
    { key: "email", label: "이메일", icon: "mail", color: "#0e0f0c", ink: "#ffffff" },
    { key: "phone", label: "전화 상담", icon: "phone", color: "#2ead4b", ink: "#ffffff" },
    { key: "other", label: "기타 링크", icon: "link", color: "", ink: "" }
  ];
  // 카드마다 아이콘 · 색을 따로 고를 수 있다 (같은 카카오톡 채널이어도 구분되게)
  const CHANNEL_ICONS = [["factory", "공장 (제조)"], ["chatLock", "잠긴 말풍선 (개별 방)"], ["globe", "지구 (해외 · 유통)"], ["store", "가게 (도매몰)"], ["message", "말풍선"], ["users", "사람들 (단체방)"], ["headset", "헤드셋 (상담)"], ["mail", "메일"], ["phone", "전화"], ["camera", "카메라"], ["link", "링크"]];
  const CHANNEL_COLORS = [["#0a5de2", "파랑"], ["#7c3aed", "보라"], ["#ea580c", "주황"], ["#03c75a", "초록"], ["#e1306c", "분홍"], ["#0e0f0c", "검정"], ["#fee500", "카카오 노랑"], ["#5e4bff", "채널톡 보라"]];
  function inkOn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "#ffffff";
    const n = parseInt(m[1], 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.62 ? "#191600" : "#ffffff";
  }
  /** 카드에 쓸 아이콘 · 색: 카드에 정한 값 → 없으면 채널 종류 기본값 */
  function channelLook(ch) {
    const t = channelType(ch.type), color = /^#[0-9a-f]{6}$/i.test(ch.color || "") ? ch.color : t.color;
    return { icon: ch.icon || t.icon, color, ink: color ? (color === t.color && t.ink ? t.ink : inkOn(color)) : "" };
  }
  const channelType = (k) => CHANNEL_TYPES.find((x) => x.key === k) || CHANNEL_TYPES[CHANNEL_TYPES.length - 1];
  const defaultChannels = () => [
    { id: "ch1", type: "kakao", title: "카카오톡 1:1 상담", desc: "수강 · 결제 · 개인 상황처럼 다른 사람에게 보이고 싶지 않은 내용은 1:1로 편하게 남겨 주세요.", url: "", hours: "평일 10:00 ~ 18:00", label: "카카오톡으로 상담하기" }
  ];
  // 제휴채널: 두고그룹 회사 · 외부 제휴사 바로가기. 강사가 따로 정하지 않았으면 문대표 구성을 그 강사 이름으로 쓴다
  const PARTNER_GROUPS = [{ key: "doogo", label: "두고그룹", desc: "두고그룹이 직접 운영하는 서비스예요." }, { key: "partner", label: "제휴사", desc: "수강생 전용 혜택을 주는 외부 제휴사예요. 할인 코드는 카페 글에서 확인하세요." }];
  const PARTNER_ICONS = CHANNEL_ICONS.concat([["building", "건물 (사무실)"], ["send", "보내기 (송금)"], ["coins", "동전 (결제 · 금융)"], ["handshake", "악수 (제휴)"]]);
  function defaultPartners(c) {
    const src = (window.CLASS_SEED.content.moon || {}).partners || [];
    const inst = (c && c.brand && c.brand.instructor) || "문대표";
    return JSON.parse(JSON.stringify(src).replace(/문대표/g, inst));
  }
  const partnersOf = (c) => (Array.isArray(c.partners) ? c.partners : defaultPartners(c));
  const channelsOf = (c) => (Array.isArray(c.channels) ? c.channels : defaultChannels());

  // 코치: 강사 밑에서 과제 검수 · 문의 답변 등을 맡는 계정 (강사센터에서 강사가 만든다)
  const coachesOf = (insId) => { const ins = instructor(insId); return ins ? (ins.coaches = Array.isArray(ins.coaches) ? ins.coaches : []) : []; };
  const coach = (insId, coachId) => coachesOf(insId).find((x) => x.id === coachId) || null;
  /** 이름 + 뒷자리로 코치 찾기 (운영 중인 강사의 코치 · 중지 여부는 부르는 쪽에서 확인) */
  /** 같은 이름 + 뒷자리로 등록된 코치 자리 모두 (운영 중인 강사만) — 한 사람이 여러 강사님 강의의 코치일 수 있어요 */
  function findCoachLogins(name, phone4) {
    const nm = String(name || "").replace(/\s+/g, ""), out = [];
    for (const ins of db.instructors) {
      if (ins.status !== "active") continue;
      const c = (ins.coaches || []).find((x) => x.name.replace(/\s+/g, "") === nm && x.phone4 === phone4);
      if (c) out.push({ ins, coach: c });
    }
    return out;
  }
  function findCoachLogin(name, phone4) {
    const nm = String(name || "").replace(/\s+/g, "");
    for (const ins of db.instructors) {
      if (ins.status !== "active") continue;
      const c = (ins.coaches || []).find((x) => x.name.replace(/\s+/g, "") === nm && x.phone4 === phone4);
      if (c) return { ins, coach: c };
    }
    return null;
  }

  /* ---------------- 불러오기 · 저장 ---------------- */
  let db = null;



  // 이 기기 데이터: 저장된 데이터 → v2 면 v3 로 → 없으면 처음 데이터 → 빠진 기본값 채우기 (순서는 공용 모듈 loadLocal — 서버도 같은 순서)
  function load() {
    if (R.on) return loadRemote();
    return DR.loadLocal(store.get(KEY_DB, null));
  }
  // 서버 모드: 받아 온 문서로 시작하고, 아래 정리(기본값 채우기)는 화면용으로만 적용한다 (저장은 하지 않음)
  function loadRemote() {
    if (R.fresh) { db = R.fresh; R.fresh = null; }
    R.loading = true;
    try { if (db && Array.isArray(db.instructors) && db.content) loadFixups(); }
    finally { R.loading = false; }
    resnapAll();
    return db;
  }
  const saveHooks = [];
  const onSave = (fn) => { saveHooks.push(fn); };
  function save() {
    saveHooks.forEach((fn) => { try { fn(); } catch (e) { console.warn(e); } });
    if (R.on) { if (!R.loading) schedule(); return true; }
    if (!store.set(KEY_DB, db)) { console.warn("저장 공간이 부족합니다"); return false; }
    return true;
  }
  function reset() {
    if (R.on) return call("admin", { action: "reset" }).then((j) => { if (j.error) throw new Error(j.error); return refresh(); });
    store.keys().filter((k) => k.indexOf("moonclass:") === 0).forEach((k) => store.remove(k));
    load();
  }

  /* ---------------- 조회 ---------------- */
  const instructor = (id) => db.instructors.find((x) => x.id === id) || null;
  const activeInstructors = () => db.instructors.filter((x) => x.status === "active");
  /** 강사가 쓸 수 있는 두잉고 (2026-11): live = LIVE 두잉고(기수 · 주차 · 과제) · vod = DOOGO CLASS(VOD 판매 · VOD 강의실)
   *  ins.tracks 가 없으면(예전 강사) 둘 다 열림. 잠긴 쪽은 강사센터에서 자물쇠 → 입점 신청 → 마스터가 열어 줘요 (서버 access.js 가 강사는 못 바꾸게 지켜요) */
  const tracksOf = (x) => { const ins = x && typeof x === "object" ? x : x && db ? instructor(x) : null, t = ins && ins.tracks; return { live: !t || t.live !== false, vod: !t || t.vod !== false }; };
  /** LIVE 두잉고가 열린 강사만 — 수강생 로그인 강사 고르기 · 두잉고 첫 화면 강사진 · 강의 소개 · 무료강의 목록 (VOD 강사는 DOOGO CLASS 로만) */
  const liveInstructors = () => activeInstructors().filter((x) => tracksOf(x).live);
  const content = (id) => db.content[id] || null;
  const VOD_CO = {};
  const vodCohortId = (iid) => "vod:" + iid;
  /** VOD 수강생의 ‘기수’: 날짜 · 주차가 없는 가상 기수 (기수 목록 · 정산에는 안 잡힌다) */
  const cohort = (id) => { if (/^vod:/.test(String(id))) { const iid = String(id).slice(4); return instructor(iid) ? (VOD_CO[id] = VOD_CO[id] || { id, instructorId: iid, name: "VOD 수강생", kind: "vod", startDate: "2026-01-01", curriculumId: "vod" }) : null; } return db.cohorts.find((x) => x.id === id) || null; };
  const cohortsOf = (instId) => db.cohorts.filter((x) => x.instructorId === instId).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const isVodStudent = (s) => !!s && (s.track === "vod" || /^vod:/.test(String(s.cohortId)));
  /** 강사의 수강생 — 기본은 LIVE · 오프라인(기수) 수강생만, all=true 면 VOD 수강생까지 */
  const studentsOf = (instId, all) => db.students.filter((x) => x.instructorId === instId && (all || !isVodStudent(x)));
  const vodStudentsOf = (instId) => db.students.filter((x) => x.instructorId === instId && isVodStudent(x));
  const student = (id) => db.students.find((x) => x.id === id) || null;

  /* ---------------- 기수 · 일정 계산 ---------------- */
  /* ---------------- 커리큘럼 (강사마다 여러 개, 기수마다 하나를 골라 쓴다) ---------------- */
  // 기본 커리큘럼은 content.weeks, 추가로 만든 커리큘럼은 content.curricula = [{ id, name, weeks }]
  function curricula(instId) {
    const c = content(instId);
    if (!c) return [];
    return [{ id: "main", name: c.curriculumName || "기본 커리큘럼", weeks: c.weeks, main: true }].concat(c.curricula || []);
  }
  const curriculum = (instId, curId) => { const list = curricula(instId); return list.find((x) => x.id === (curId || "main")) || list[0] || null; };
  const curriculumOf = (co) => curriculum(co.instructorId, co.curriculumId);
  // 기수마다 진행 주차 수를 정할 수 있어요 (co.weeks · 비우면 커리큘럼 전체) — 예: 같은 커리큘럼으로 1기 5주 · 2기 4주
  const weeksOf = (co) => { if (co && co.kind === "vod") return []; const cu = co && curriculumOf(co); if (!cu) return []; const n = Number(co.weeks) || 0; return n > 0 && n < cu.weeks.length ? cu.weeks.slice(0, n) : cu.weeks; };
  const weekCount = (instId) => { const c = content(instId); return c ? c.weeks.length : 0; };
  const cohortWeeks = (co) => weeksOf(co).length;
  /* 주차별 강의일 바꾸기 (2026-11): co.classDates = { "5": "2026-09-23" } — 그 주차만 다른 날(예: 5주차는 수요일)에 강의해요.
   * 바꾼 날이 원래 주차 시작보다 빠르면 그 날 주차가 열리고, 과제 마감은 원래 마감과 바꾼 날 중 늦은 날이에요 */
  // 계산은 shared/schedule.js (화면 · 서버 공용) — 주차 수만 여기서 커리큘럼으로 정해 넘겨요
  const { baseClassDate, weekOpen, weekUnlock, weekDeadline, classDate } = SCH;
  const cohortEnd = (co) => SCH.cohortEnd(co, cohortWeeks(co));
  const cohortStatus = (co) => SCH.cohortStatus(co, cohortWeeks(co), todayStr());
  const STATUS_LABEL = { upcoming: "모집 중", running: "진행 중", ended: "종료" };
  const currentWeek = (co) => SCH.currentWeek(co, cohortWeeks(co), todayStr());
  /* 주차 강의를 하나씩 정하기 (2026-11-05): co.classOver = { "1": { time, end, place, url, mode, topic } }
   *  메인 강사 강의는 주마다 날짜 · 시간 · 장소 · 방식(오프라인 · 줌)이 다를 때가 많아요 — 날짜는 그대로 classDates, 나머지는 여기
   *  비운 칸은 기수 기본값(강의 시간 classTime ~ 끝나는 시간 classEnd · 기본 장소 classPlace · 입장 링크 classUrl) → 강사 기본 정보(liveTime · liveUrl) */
  const classOverOf = (co, no) => { const m = co && co.classOver, v = m && typeof m === "object" ? m[String(no)] : null; return v && typeof v === "object" ? v : {}; };
  /** 주차 강의 하나 → { date, time, end, place, url, mode("online" | ""), topic(비면 커리큘럼 주차 제목) }
   *  · 그 주차만 시작 시간을 바꾸고 끝나는 시간을 비우면 끝나는 시간은 비워요 (기본 끝나는 시간이 시작보다 빠를 수 있어서) · 온라인 주차는 기본 장소를 안 붙여요 */
  function lectureOf(instId, co, w) {
    const c = content(instId), b = (c && c.brand) || {}, o = classOverOf(co, w.no), on = o.mode === "online";
    return { date: classDate(co, w.no), time: o.time || co.classTime || b.liveTime || "", end: o.end || (o.time ? "" : co.classEnd || ""), place: o.place || (on ? "" : co.classPlace || ""), url: o.url || co.classUrl || b.liveUrl || "", mode: on ? "online" : "", topic: o.topic || w.title || "" };
  }
  /** 일정 시간 글씨 — 19:00~22:00 (끝나는 시간이 있으면) · 19:00 · 없으면 "" */
  const evTime = (e) => (e && e.time ? e.time + (e.end ? "~" + e.end : "") : "");
  /** 기수에서 생기는 주차 강의인지 (오프라인 · 온라인 주차 둘 다) */
  const isWeekLec = (e) => !!(e && e.auto && (e.type === "open" || e.type === "online"));
  /* ---------------- 성장 레벨 (주차가 지날 때마다 한 단계씩) ---------------- */
  const LEVEL_SET = [
    { key: "seed", name: "씨앗", icon: "lvSeed" }, { key: "leaf", name: "풀잎", icon: "lvLeaf" }, { key: "branch", name: "가지", icon: "lvBranch" },
    { key: "tree", name: "나무", icon: "lvTree" }, { key: "forest", name: "숲", icon: "lvForest" }
  ];
  // 단계 수 = 주차 수 (최대 5). 마지막은 늘 ‘숲’ — 4주 강의면 나무를 건너뛰고 씨앗·풀잎·가지·숲
  const levelSteps = (weeks) => { const n = Math.max(1, Math.min(5, weeks || 5)); return LEVEL_SET.slice(0, n - 1).concat([LEVEL_SET[4]]); };
  /** 과제 성취에 따른 수강생 레벨. 전체 과제 완료율로 한 단계씩 오르고, 필수 과제를 모두 통과(수료 조건)하면 마지막 ‘숲’
   *  5단계: 씨앗 0% · 풀잎 25% · 가지 50% · 나무 75% · 숲 = 필수 전부 통과 */
  function level(p, instId, co) {
    const weeks = co ? cohortWeeks(co) : 5, steps = levelSteps(weeks), n = steps.length;
    const s = stats(p, instId, co);
    const reqAll = s.reqTotal > 0 && s.reqDone === s.reqTotal;
    const ratio = s.total ? s.done / s.total : 0;
    const idx = n === 1 || reqAll ? n - 1 : Math.min(n - 2, Math.floor(ratio * (n - 1) + 1e-9));
    let need = 0, needText = "";
    if (idx < n - 1) {
      if (idx + 1 === n - 1) { need = s.reqTotal - s.reqDone; needText = "필수 과제 " + need + "개"; }
      else { need = Math.max(1, Math.ceil((idx + 1) / (n - 1) * s.total - 1e-9) - s.done); needText = "과제 " + need + "개"; }
    }
    return { steps, idx, cur: steps[idx], next: steps[idx + 1] || null, need, needText, pct: s.pct, stats: s, weeks };
  }
  /** 강사센터 기본 기수: 진행 중 → 가장 가까운 모집 중 → 가장 최근 */
  function currentCohort(instId) {
    const list = cohortsOf(instId);
    return list.filter((c) => cohortStatus(c) === "running").pop() || list.find((c) => cohortStatus(c) === "upcoming") || list[list.length - 1] || null;
  }
  function nextCohortName(instId) {
    const nums = cohortsOf(instId).map((c) => parseInt(c.name, 10)).filter((n) => !isNaN(n));
    return (nums.length ? Math.max.apply(null, nums) + 1 : 1) + "기";
  }

  // 온라인 강의: 강사 본인의 주차 강의를 온라인으로 하는 날 (달력 색 · 강의 날 표시는 주차 강의와 같아요) · 초청강사: 다른 강사님을 모신 특강
  const EVENT_TYPES = {
    open: { label: "강의 오픈", cls: "open" },
    free: { label: "무료 강의", cls: "free" },
    offline: { label: "오프라인 강의", cls: "offline" },
    online: { label: "온라인 강의", cls: "online" },
    deadline: { label: "과제 마감", cls: "deadline" },
    qna: { label: "라이브 Q&A", cls: "qna" },
    notice: { label: "공지", cls: "notice" },
    challenge: { label: "챌린지", cls: "challenge" },
    guest: { label: "초청강사", cls: "guest" },
    event: { label: "행사", cls: "event" },
    replay: { label: "강의 녹화본 업로드", cls: "replay" },
    bonus: { label: "보너스 강의", cls: "bonus" }
  };
  /* 강사마다 쓰는 일정 종류 · 이름 (brand.cal). 없으면 기본(강의 오픈 · 과제 마감 · 라이브 Q&A · 공지 · 챌린지) */
  const CAL_DEF = ["open", "deadline", "qna", "notice", "challenge"];
  function calCfg(instId) { const c = content(instId); return (c && c.brand && c.brand.cal) || null; }
  function evLabel(instId, type) { const g = calCfg(instId), l = g && g.labels && g.labels[type]; return l || (EVENT_TYPES[type] || {}).label || type; }
  function calTypes(instId) { const g = calCfg(instId); return (g && g.types && g.types.length ? g.types : CAL_DEF).filter((k) => EVENT_TYPES[k]); }
  /* 강사가 직접 넣는 종류 (과제 마감 · 자동 녹화본은 빼고) */
  function calManual(instId) { const g = calCfg(instId); return g && g.types ? g.types.filter((k) => k !== "deadline" && !(k === "replay" && g.replayAfter != null)) : ["qna", "notice", "challenge", "event"]; }
  function calShort(instId) { const g = calCfg(instId); return (g && g.short) || "강의"; }
  /* 수강생 수업 캘린더 칸 글씨 (예전 화면 · React 같이) — PC 는 길게(l) · 휴대폰은 짧게(s)
   *  · 기수에서 자동으로 생기는 주차 강의 · 녹화본 · 과제 마감: ‘N주차 + 종류’ (3주차 오프라인 강의 · 3주차 강의 녹화본 업로드 · 3주차 과제 마감)
   *  · 강사가 추가한 일정: 시간 + 일정 이름 (19:00 챌린지 2회차 · 19:00 OO 특별강의) — 이름이 없으면 종류 이름
   *    휴대폰은 종류를 짧게 + 이름의 ‘N회차 · N주차’ 숫자 (챌린지 2) · 주차 강의 종류는 ‘N주차’ */
  const CAL_SHORT = { offline: "오프라인", online: "온라인", free: "무료", replay: "녹화본", qna: "Q&A", challenge: "챌린지", bonus: "보너스", guest: "초청", event: "행사", notice: "공지" };
  /** 하루 칸 안의 순서 (주차 강의가 맨 위) */
  const CAL_ORDER = ["open", "online", "offline", "free", "replay", "deadline", "qna", "challenge", "bonus", "guest", "event", "notice"];
  /** 강의 날(칸을 옅게 칠해요): 주차 강의 · 온라인 강의 */
  const calMain = (e) => e.type === "open" || e.type === "online";
  function calChip(instId, e) {
    const L = evLabel(instId, e.type), wk = e.week ? e.week + "주차 " : "";
    if (isWeekLec(e)) return { s: e.week ? e.week + "주차" : calShort(instId), l: wk + L };
    if (e.auto && e.type === "deadline") return { s: e.week ? e.week + "주 마감" : "마감", l: wk + L };
    if (e.auto && e.type === "replay") return { s: e.week ? e.week + "주 녹화" : CAL_SHORT.replay, l: wk + L };
    const t = String(e.title || "").trim(), n = /(\d+)\s*(주차|회차|회)/.exec(t), base = e.type === "open" ? calShort(instId) : CAL_SHORT[e.type] || L;
    const lec = e.type === "open" || e.type === "online" || e.type === "offline";
    return { s: n ? (lec && n[2] === "주차" ? n[1] + "주차" : base + " " + n[1]) : base, l: (e.time ? e.time + " " : "") + (t || L) };
  }
  /** 기수 하나의 전체 일정 (자동 일정 + 강사가 추가한 일정), 날짜순 */
  function events(instId, co) {
    const c = content(instId);
    if (!c || !co) return [];
    const out = [];
    // 주차 강의: 날짜(주차별로 바꾼 날 → 매주 강의 요일 → 주차 시작일) · 시간 · 끝나는 시간 · 장소 · 방식 · 주제는 주차마다 정할 수 있어요 (lectureOf)
    //  시간은 제목에 붙이지 않고 따로(time · end) — 화면이 ‘13:30~18:30’ 으로 보여 줘요 (evTime)
    const g = calCfg(instId), openWord = (g && g.labels && g.labels.open) || "강의", rpAfter = g && g.types && g.types.indexOf("replay") >= 0 && g.replayAfter != null ? Number(g.replayAfter) : null;
    weeksOf(co).forEach((w) => {
      const lc = lectureOf(instId, co, w), date = lc.date, type = lc.mode === "online" ? "online" : "open";
      out.push({ date, time: lc.time, end: lc.end, type, week: w.no, title: w.no + "주차 " + (type === "online" ? evLabel(instId, "online") : openWord) + " — " + lc.topic, url: lc.url, place: lc.place, auto: true });
      if (rpAfter != null) out.push({ date: addDays(date, rpAfter), time: "", type: "replay", week: w.no, title: w.no + "주차 강의 녹화본 업로드", auto: true });
      out.push({ date: weekDeadline(co, w.no), time: "", type: "deadline", week: w.no, title: w.no + "주차 과제 마감", auto: true });
    });
    c.schedule.forEach((e) => {
      let date = null;
      if (e.scope === "cohort") { if (e.cohortId === co.id) date = e.date; }
      else if ((Number(e.week) || 1) <= cohortWeeks(co)) date = SCH.weekDow(co, e.week, e.dow);
      if (date) out.push({ date, time: e.time || "", end: e.time ? e.end || "" : "", type: e.type, week: e.scope === "cohort" ? null : Number(e.week), title: e.title, url: e.url || "", place: e.place || "", id: e.id });
    });
    return out.sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
  }
  function ruleText(e, instId) {
    if (e.scope === "cohort") { const co = cohort(e.cohortId); return (co ? co.name : "삭제된 기수") + " · " + (e.date ? fmtMD(e.date) : "-"); }
    return "모든 기수 · " + e.week + "주차 " + DOW[Number(e.dow)] + "요일";
  }

  /* ---------------- 진행 기록 ---------------- */
  const emptyProgress = DR.emptyProgress;
  // 서버 모드에서도 미리보기(preview-…) 기록은 이 브라우저에만 둔다
  const localSid = (sid) => /^preview-/.test(String(sid));
  const progress = (sid) => Object.assign(emptyProgress(), R.on && !localSid(sid) ? clone(R.prog[sid] || {}) : store.get(KEY_PROGRESS + sid, {}));
  const saveProgress = (sid, p) => {
    if (R.on && !localSid(sid)) { R.prog[sid] = clone(p); schedule(); return true; }
    return store.set(KEY_PROGRESS + sid, p);
  };
  /** 진행 기록 전체 { 학생ID: 기록 } (백업용) */
  function allProgress() {
    const out = {};
    if (R.on) Object.keys(R.prog).forEach((sid) => { out[sid] = clone(R.prog[sid]); });
    else store.keys().filter((k) => k.indexOf(KEY_PROGRESS) === 0).forEach((k) => { out[k.slice(KEY_PROGRESS.length)] = store.get(k, {}); });
    return out;
  }
  const lastSub = (p, mid) => { const l = p.submissions[mid]; return l && l.length ? l[l.length - 1] : null; };
  /** todo | done | fix — 강사 검수가 있으면 그 결과가 자동검수보다 우선 */
  function subState(p, mid) {
    const s = lastSub(p, mid);
    if (!s) return "todo";
    if (s.review) return s.review.status === "approved" ? "done" : "fix";
    return s.result.pass ? "done" : "fix";
  }
  /** 진행률 — co(기수)를 주면 그 기수의 커리큘럼 기준 */
  function stats(p, instId, co) {
    const c = content(instId);
    const weeks = co ? weeksOf(co) : c ? c.weeks : [];
    const all = weeks.flatMap((w) => w.missions);
    const req = all.filter((m) => m.required);
    const done = all.filter((m) => subState(p, m.id) === "done").length;
    const reqDone = req.filter((m) => subState(p, m.id) === "done").length;
    const kinds = {};
    MISSION_KINDS.forEach((k) => { const l = all.filter((m) => missionKind(m) === k.key); kinds[k.key] = { total: l.length, done: l.filter((m) => subState(p, m.id) === "done").length }; });
    return { total: all.length, done, reqTotal: req.length, reqDone, kinds, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
  }

  /* ---------------- 강사 입점 문의 ----------------
   * 방문자가 첫 화면에서 남기고 마스터가 관리한다. 서버 모드는 문서 inq:<id> (마스터만 보임), 아니면 이 브라우저에 */
  /* ---------- 첫 화면 바닥 · 사업자 정보 (마스터 → 첫 화면 · 사업자 정보에서 고침, 누구나 읽음) ---------- */
  const SITE_DEFAULT = {
    company: "(주)두고홀딩스", ceo: "문원오", bizNo: "726-87-03167", mailOrderNo: "제 2024-세종아름-0878 호",
    address: "세종특별자치시 갈매로 353 에비뉴힐 5층 5023호", zip: "30121", phone: "", email: "doogobiz@gmail.com",
    hours: "평일 오전 10시 ~ 오후 6시 · 점심시간 1시 ~ 2시 제외 · 주말 · 공휴일 제외", privacyOfficer: "", hosting: "",
    kakaoCh: "https://pf.kakao.com/_xgxkiWX",
    notice: "(주)두고홀딩스는 통신판매중개자로서 통신판매의 당사자가 아니며, 입점 강사가 등록한 강의 정보 및 거래에 대하여 책임을 지지 않습니다.",
    terms: "", privacy: "",
    group: [
      { name: "두고푸드", url: "https://www.doogofood.com/", desc: "" },
      { name: "두고커넥트", url: "https://www.doogoconnect.com/", desc: "" }
    ]
  };
  // 저장된 칸이 비어 있으면 기본 사업자 정보로 (예전에 빈칸으로 저장해 둔 사이트도 바닥에 정보가 보이게)
  function siteInfo() {
    const s = (db && db.site) || {};
    const out = Object.assign({}, SITE_DEFAULT);
    Object.keys(s).forEach((k) => { if (k !== "group" && s[k] != null && String(s[k]).trim() !== "") out[k] = s[k]; });
    out.group = Array.isArray(s.group) ? s.group : clone(SITE_DEFAULT.group);
    return out;
  }
  function saveSite(next) { db.site = next; return save(); }
  /** 두잉고 · 두고클래스 운영 상담 카카오톡 채널 — home: 채널 홈, chat: 바로 1:1 채팅 (http 주소도 https 로) */
  function opsKakao() {
    let u = String(siteInfo().kakaoCh || SITE_DEFAULT.kakaoCh).trim().replace(/^http:\/\//i, "https://").replace(/\/+$/, "");
    if (!/^https:\/\/pf\.kakao\.com\/_[A-Za-z0-9]+(\/chat)?$/.test(u)) u = SITE_DEFAULT.kakaoCh;
    const home = u.replace(/\/chat$/, "");
    return { home, chat: home + "/chat" };
  }

  const KEY_INQ = "moonclass:inquiries";
  const inqMap = () => (R.on ? R.inq : store.get(KEY_INQ, {}));
  const inquiries = () => { const m = inqMap(); return Object.keys(m).map((k) => m[k]).sort((a, b) => (b.at || 0) - (a.at || 0)); };
  function saveInquiry(x) {
    if (R.on) { R.inq[x.id] = x; schedule(); return true; }
    const m = store.get(KEY_INQ, {}); m[x.id] = x; return store.set(KEY_INQ, m);
  }
  function removeInquiry(id) {
    if (R.on) { delete R.inq[id]; schedule(); return true; }
    const m = store.get(KEY_INQ, {}); delete m[id]; return store.set(KEY_INQ, m);
  }
  // 파트너 추천 코드: 주소에 ?ref=코드 가 있으면 기억 (입점 문의에 함께 남김)
  const catchRef = () => { try { const m = (ROUTE.hash + location.search).match(/[?&]ref=([A-Za-z0-9_.-]{2,30})/); if (m) localStorage.setItem("doinggo:ref", m[1]); } catch (e) {} };
  // 서버(정식 API)도 이 파일을 읽어서 시드를 만들어요 — 브라우저에서만 주소 변화를 들어요
  catchRef(); if (typeof window.addEventListener === "function") window.addEventListener("hashchange", catchRef);
  /** 강사센터 잠긴 영역 입점 신청 (강사 본인) — 서버: /api/public track-apply (입점 문의로 저장 · 강사 계정에 ‘신청 중’ 표시) */
  async function applyTrack(want, a) {
    if (R.on) return call("public", Object.assign({ action: "track-apply", want }, a));
    const ins = instructor(a.iid); if (!ins) return { error: "notfound" };
    const x = Object.assign({ id: uid("inq"), at: Date.now(), status: "new", memo: "", addTo: ins.id, want }, a, want === "vod" ? { source: "partners" } : {});
    delete x.agree; delete x.iid;
    if (!saveInquiry(x)) return { error: "storage" };
    ins.trackReq = Object.assign({}, ins.trackReq || {}, { [want]: { at: Date.now(), inq: x.id } }); save();
    return { ok: true };
  }
  async function applyPartner(a) {
    try { const ref = localStorage.getItem("doinggo:ref"); if (ref && !a.ref) a = Object.assign({}, a, { ref }); } catch (e) {}
    if (R.on) return call("public", Object.assign({ action: "partner-apply" }, a));
    const x = Object.assign({ id: uid("inq"), at: Date.now(), status: "new", memo: "" }, a);
    delete x.agree;
    return saveInquiry(x) ? { ok: true } : { error: "storage" };
  }

  /* ---------------- 기수 이용료 신청 · 매출 ----------------
   * 이용료 = 강사님의 수강생 1명 수강료(1인 수강료) × 1 기수마다. 수강생 수와 상관없이 같다.
   * 강사: 강사센터에서 '다음 기수 열어 주세요' 신청 (기수 · 1인 수강료 · 연락처 · 이메일)
   * 마스터: 전화 → 무통장 입금 확인 → 세금계산서 발행 → 기수 열기 (PG 결제 없음)
   * 서버 모드는 문서 bill:<강사>:<id> (마스터 + 그 강사만 보임), 아니면 이 브라우저에.
   * 입금 계좌 · 부가세 방식은 마스터 설정(db.billing, 강사센터에만 보임) */
  const BILLING_DEFAULT = { bank: "", account: "", holder: "", vat: "included", note: "" };
  const BILL_VAT = [["included", "부가세 포함 (이용료 안에 10%)"], ["separate", "부가세 별도 (이용료 + 10%)"], ["none", "부가세 없음"]];
  const BILL_STATE = { requested: { label: "신청 접수", cls: "warn" }, paid: { label: "입금 확인", cls: "info" }, opened: { label: "기수 오픈", cls: "ok" }, canceled: { label: "취소", cls: "mute" } };
  function billingInfo() { return Object.assign({}, BILLING_DEFAULT, (db && db.billing) || {}); }
  function saveBilling(next) { db.billing = next; return save(); }
  const KEY_BILL = "moonclass:bills";
  const billMap = () => (R.on ? R.bill : store.get(KEY_BILL, {}));
  /** 이용료 신청 · 정산 기록 (강사 하나 또는 전체), 최근 신청이 위로 */
  const bills = (iid) => { const m = billMap(); return Object.keys(m).map((k) => m[k]).filter((b) => b && (!iid || b.instructorId === iid)).sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)); };
  function saveBill(x) {
    if (R.on) { R.bill[x.id] = x; schedule(); return true; }
    const m = store.get(KEY_BILL, {}); m[x.id] = x; return store.set(KEY_BILL, m);
  }
  function removeBill(id) {
    if (R.on) { delete R.bill[id]; schedule(); return true; }
    const m = store.get(KEY_BILL, {}); delete m[id]; return store.set(KEY_BILL, m);
  }
  /** 공급가액 · 부가세 · 합계 (금액을 마스터가 정하지 않았으면 1인 수강료 그대로) */
  function billMoney(b) {
    const raw = b.amount != null && b.amount !== "" ? b.amount : b.fee;
    const base = Math.max(0, Math.round(Number(raw) || 0));
    const mode = b.vat || billingInfo().vat || "included";
    if (mode === "included") { const supply = Math.round(base / 1.1); return { supply, tax: base - supply, total: base, mode }; }
    if (mode === "none") return { supply: base, tax: 0, total: base, mode };
    const tax = Math.round(base * 0.1);
    return { supply: base, tax, total: base + tax, mode };
  }
  const billState = (b) => (b.canceledAt ? "canceled" : b.cohortId ? "opened" : b.paidAt ? "paid" : "requested");
  const won = (n) => Math.round(Number(n) || 0).toLocaleString("ko-KR") + "원";

  /* ---------------- 요청사항 (오류·불편 신고) ---------------- */
  const REQUEST_CATEGORIES = ["로그인 · 접속", "과제 제출", "영상 재생", "화면 깨짐", "기타"];
  const maskName = (n) => { n = String(n || ""); return n ? n.slice(0, 1) + "OO" : "익명"; };
  /** 강사 한 명의 전체 요청사항, 오래된 순으로 번호를 매기고 최신순으로 돌려준다 */
  // 수료증 번호: 강사 · 기수 · 학생 ID로 만든 고정 번호 (다른 학생이 빠지거나 순서가 바뀌어도 그대로 · 강사끼리 겹치지 않아요)
  function certNo(s) {
    const co = s && cohort(s.cohortId); if (!co) return "";
    const al = (v, n) => String(v || "").replace(/[^a-z0-9]/gi, "").slice(-n).toUpperCase();
    return "DG-" + al(s.instructorId || co.instructorId, 4) + "-" + (parseInt(co.name, 10) || 0) + "-" + al(s.id, 5);
  }
  function requests(instId, extra) {
    const list = [];
    const add = (s) => progress(s.id).questions.forEach((q) => list.push({ s, q }));
    studentsOf(instId, true).forEach(add);
    if (extra) add(extra);
    list.sort((a, b) => a.q.at - b.q.at).forEach((x, i) => { x.no = i + 1; });
    return list.reverse();
  }

  /* ---------------- 서버 연결 (Vercel 함수 + Turso 데이터베이스) ----------------
   * /api 가 있으면 서버 모드: 데이터를 서버에서 받아 오고, 바뀐 부분만 서버에 저장한다.
   * /api 가 없으면(로컬 정적 서버 · 미리보기) 예전처럼 이 브라우저(localStorage)에 저장한다.
   * 서버에서는 문서 단위(강사 · 콘텐츠 · 기수 · 수강생 · 진행 기록)로 나눠 보관하고,
   * 로그인한 사람이 볼 수 있는 문서만 내려온다. */
  const R = { on: false, fresh: null, loading: false, me: { student: null, admin: null }, epoch: null, now: 0, ver: {}, snap: {}, last: {}, nope: {}, rej: {}, prog: {}, inq: {}, bill: {}, timer: null, busy: false, again: false, fails: 0, polling: false, lastPoll: 0, listeners: [] };
  const COLLS = ["instructors", "content", "cohorts", "students"];
  const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const emit = (type, info) => R.listeners.forEach((fn) => { try { fn(type, info); } catch (e) { console.error(e); } });

  async function call(name, payload, method) {
    const opt = { method: method || "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" } };
    if (payload !== undefined) opt.body = JSON.stringify(payload);
    const r = await fetch("api/" + name, opt);
    const j = await r.json().catch(() => ({ error: "server" }));
    if (r.status >= 500) {
      const e = new Error(j.message || j.error || "server " + r.status);
      // 서버 점검(쓰기 멈춤 · DB 옮기는 동안): 바뀐 내용은 그대로 들고 있다가 다시 보내요 — 안내만 ‘점검 중’으로
      if (j.error === "readonly") e.readonly = true;
      throw e;
    }
    return j;
  }
  /** 서버가 있는지 확인하고 처음 데이터를 받는다. 서버가 없으면 false (이 브라우저 저장 모드) */
  async function connect() {
    let r;
    // 서버가 없는 곳(정적 서버 · 미리보기)은 바로 404 나 오류가 난다. 응답이 너무 늦으면 연결 실패 화면을 보여 준다
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl && setTimeout(() => ctl.abort(), 15000);
    try { r = await fetch("api/bootstrap", { credentials: "same-origin", cache: "no-store", signal: ctl ? ctl.signal : undefined }); }
    catch (e) { if (e && e.name === "AbortError") throw new Error("timeout"); return false; }
    finally { if (timer) clearTimeout(timer); }
    if (r.status >= 500) throw new Error("server " + r.status);
    let j = null;
    try { j = await r.json(); } catch (e) { return false; }
    if (!j || j.app !== "doogo-class" || j.mode !== "server") return false;
    R.on = true;
    take(j);
    startPolling();
    return true;
  }
  function take(j) {
    R.me = j.me || { student: null, admin: null };
    R.epoch = j.epoch || R.epoch;
    R.now = j.now;
    R.ver = {}; R.last = {}; R.prog = {}; R.inq = {}; R.bill = {};
    const d = { instructors: [], content: {}, cohorts: [], students: [] };
    (j.docs || []).forEach((x) => { R.ver[x[0]] = x[2]; R.last[x[0]] = JSON.stringify(x[1]); placeIn(d, x[0], x[1]); });
    R.fresh = d;
  }
  /** 로그인 · 로그아웃 뒤에 볼 수 있는 데이터가 바뀌므로 처음부터 다시 받는다 */
  async function refresh() {
    await flush();
    const j = await call("bootstrap", undefined, "GET");
    if (j.error) throw new Error(j.error);
    take(j);
    return load();
  }

  /* 데이터 한 덩어리 ↔ 문서
   * 두고클래스(d.vod): 공개 정보는 meta 에, 회원 · 주문 · 후기 · 다짐 · 문의 · 정산은 각각 서버 문서로 (서버 access · vodaccess 가 누가 보고 고칠지 정해요) */
  const VOD_PRIV = ["members", "orders", "memberCoupons", "likes", "progress", "studyLog", "reviews", "pledges", "inquiries", "payouts", "stat"];
  function metaOf(d) {
    const m = {};
    Object.keys(d).forEach((k) => { if (COLLS.indexOf(k) === -1) m[k] = d[k]; });
    if (m.vod && typeof m.vod === "object") { const v = {}; Object.keys(m.vod).forEach((k) => { if (VOD_PRIV.indexOf(k) === -1) v[k] = m.vod[k]; }); m.vod = v; }
    // 서버에 아직 스토어(vod)가 없으면 빈 칸도 넣지 않아요 — 서버 문서와 똑같아야 ‘서버가 안 받은 변경’을 알아채요
    if (m.vod && typeof m.vod === "object" && !Object.keys(m.vod).length) delete m.vod;
    return m;
  }
  const vmDoc = (v, m) => Object.assign({}, m, { coupons: (v.memberCoupons || {})[m.id] || [], likes: (v.likes || {})[m.id] || [], prog: (v.progress || {})[m.id] || {}, study: (v.studyLog || {})[m.id] || {} });
  const vpoKey = (key) => "vpo:" + encodeURIComponent(key);
  function splitVod(v, out) {
    if (!v || typeof v !== "object") return;
    (v.members || []).forEach((m) => { if (m && m.id) out["vm:" + m.id] = vmDoc(v, m); });
    (v.orders || []).forEach((o) => { if (o && o.no) out["vo:" + o.no] = o; });
    (v.reviews || []).forEach((r) => { if (r && r.id) out["vr:" + r.id] = r; });
    (v.pledges || []).forEach((x) => { if (x && x.id) out["vpl:" + x.id] = x; });
    (v.inquiries || []).forEach((q) => { if (q && q.id && q.mid) out["vq:" + q.mid + ":" + q.id] = q; });
    const po = {};
    (v.payouts || []).forEach((x) => { if (x && x.key) (po[x.key] = po[x.key] || []).push(x); });
    Object.keys(po).forEach((key) => { out[vpoKey(key)] = po[key]; });
    if (v.stat) out.vstat = v.stat;
  }
  function vodDocOf(v, k, p) {
    if (!v || typeof v !== "object") return undefined;
    const find = (list, key, id) => (list || []).find((x) => x && x[key] === id);
    if (p[0] === "vm") { const m = find(v.members, "id", p[1]); return m ? vmDoc(v, m) : undefined; }
    if (p[0] === "vo") return find(v.orders, "no", p[1]);
    if (p[0] === "vr") return find(v.reviews, "id", p[1]);
    if (p[0] === "vpl") return find(v.pledges, "id", p[1]);
    if (p[0] === "vq") { const q = find(v.inquiries, "id", p[2]); return q && q.mid === p[1] ? q : undefined; }
    if (p[0] === "vpo") { const key = decodeURIComponent(p[1] || ""), l = (v.payouts || []).filter((x) => x && x.key === key); return l.length ? l : undefined; }
    if (p[0] === "vstat") return v.stat || undefined;
    return undefined;
  }
  function vodOf(d) {
    if (!d.vod || typeof d.vod !== "object") d.vod = {};
    const v = d.vod;
    ["members", "orders", "reviews", "pledges", "inquiries", "payouts"].forEach((x) => { if (!Array.isArray(v[x])) v[x] = []; });
    ["memberCoupons", "likes", "progress", "studyLog"].forEach((x) => { if (!v[x] || typeof v[x] !== "object") v[x] = {}; });
    return v;
  }
  function upsertBy(list, key, id, val) {
    const i = list.findIndex((x) => x && x[key] === id);
    if (val == null) { if (i >= 0) list.splice(i, 1); return; }
    if (i >= 0) replaceIn(list[i], val); else list.push(val);
  }
  function placeVod(d, p, val) {
    const v = vodOf(d);
    if (p[0] === "vm") {
      const id = p[1];
      if (val == null) { upsertBy(v.members, "id", id, null); ["memberCoupons", "likes", "progress", "studyLog"].forEach((x) => { delete v[x][id]; }); return; }
      const m = Object.assign({}, val);
      v.memberCoupons[id] = m.coupons || []; v.likes[id] = m.likes || []; v.progress[id] = m.prog || {}; v.studyLog[id] = m.study || {};
      delete m.coupons; delete m.likes; delete m.prog; delete m.study;
      upsertBy(v.members, "id", id, m);
    } else if (p[0] === "vo") upsertBy(v.orders, "no", p[1], val);
    else if (p[0] === "vr") upsertBy(v.reviews, "id", p[1], val);
    else if (p[0] === "vpl") upsertBy(v.pledges, "id", p[1], val);
    else if (p[0] === "vq") upsertBy(v.inquiries, "id", p[2], val);
    else if (p[0] === "vpo") { const key = decodeURIComponent(p[1] || ""); v.payouts = v.payouts.filter((x) => !x || x.key !== key).concat(val || []); }
    else if (p[0] === "vstat") v.stat = val || null;
  }
  const VOD_KEY = /^(vm|vo|vr|vpl|vq|vpo|vstat)$/;
  function splitDb(d) {
    const out = { meta: metaOf(d) };
    d.instructors.forEach((i) => { out["ins:" + i.id] = i; });
    Object.keys(d.content).forEach((iid) => { out["content:" + iid] = d.content[iid]; });
    const byIns = {};
    d.cohorts.forEach((c) => { (byIns[c.instructorId] = byIns[c.instructorId] || []).push(c); });
    Object.keys(byIns).forEach((iid) => { out["cohorts:" + iid] = byIns[iid]; });
    const sIns = {};
    d.students.forEach((s) => { sIns[s.id] = s.instructorId; out["stu:" + s.instructorId + ":" + s.id] = s; });
    Object.keys(R.prog).forEach((sid) => { if (sIns[sid]) out["prog:" + sIns[sid] + ":" + sid] = R.prog[sid]; });
    Object.keys(R.inq).forEach((id) => { out["inq:" + id] = R.inq[id]; });
    Object.keys(R.bill).forEach((id) => { const b = R.bill[id]; if (b && b.instructorId) out["bill:" + b.instructorId + ":" + id] = b; });
    splitVod(d.vod, out);
    return out;
  }
  function docOf(k) {
    const p = k.split(":");
    if (k === "meta") return metaOf(db);
    if (p[0] === "ins") return db.instructors.find((x) => x.id === p[1]);
    if (p[0] === "content") return db.content[p[1]];
    if (p[0] === "cohorts") { const l = db.cohorts.filter((c) => c.instructorId === p[1]); return l.length ? l : undefined; }
    if (p[0] === "stu") return db.students.find((x) => x.id === p[2] && x.instructorId === p[1]);
    if (p[0] === "prog") return R.prog[p[2]];
    if (p[0] === "inq") return R.inq[p[1]];
    if (p[0] === "bill") return R.bill[p[2]];
    if (VOD_KEY.test(p[0])) return vodDocOf(db.vod, k, p);
    return undefined;
  }
  const replaceIn = (t, src) => { Object.keys(t).forEach((k) => { delete t[k]; }); Object.assign(t, src); };
  function placeIn(d, k, v) {
    const p = k.split(":");
    if (k === "meta") {
      // 회원 · 주문 등 두고클래스 문서는 meta 와 따로 오니까 meta 를 바꿀 때도 그대로 둔다
      const keep = d.vod && typeof d.vod === "object" ? d.vod : null;
      Object.keys(d).forEach((x) => { if (COLLS.indexOf(x) === -1) delete d[x]; });
      if (v) Object.keys(v).forEach((x) => { if (COLLS.indexOf(x) === -1) d[x] = v[x]; });
      if (keep) { const nv = d.vod && typeof d.vod === "object" ? d.vod : (d.vod = {}); VOD_PRIV.forEach((x) => { if (keep[x] !== undefined) nv[x] = keep[x]; }); }
    } else if (VOD_KEY.test(p[0])) {
      placeVod(d, p, v);
    } else if (p[0] === "ins" || p[0] === "stu") {
      const list = p[0] === "ins" ? d.instructors : d.students, id = p[0] === "ins" ? p[1] : p[2];
      const i = list.findIndex((x) => x.id === id);
      if (v == null) { if (i >= 0) list.splice(i, 1); } else if (i >= 0) replaceIn(list[i], v); else list.push(v);
    } else if (p[0] === "content") {
      if (v == null) delete d.content[p[1]];
      else { if (d.content[p[1]]) replaceIn(d.content[p[1]], v); else d.content[p[1]] = v; if (d.content[p[1]].brand) normalizeContent(d.content[p[1]]); }
    } else if (p[0] === "cohorts") {
      const at = d.cohorts.findIndex((c) => c.instructorId === p[1]);
      const rest = d.cohorts.filter((c) => c.instructorId !== p[1]);
      const add = v || [];
      rest.splice(at < 0 ? rest.length : Math.min(at, rest.length), 0, ...add);
      d.cohorts.length = 0; rest.forEach((c) => d.cohorts.push(c));
    } else if (p[0] === "prog") {
      if (v == null) delete R.prog[p[2]]; else R.prog[p[2]] = v;
    } else if (p[0] === "inq") {
      if (v == null) delete R.inq[p[1]]; else R.inq[p[1]] = v;
    } else if (p[0] === "bill") {
      if (v == null) delete R.bill[p[2]]; else R.bill[p[2]] = v;
    }
  }
  const snapOf = (k) => { const v = docOf(k); return v === undefined ? undefined : JSON.stringify(v); };
  function resnapAll() { R.snap = {}; if (!db) return; const all = splitDb(db); Object.keys(all).forEach((k) => { R.snap[k] = JSON.stringify(all[k]); }); }

  /* 바뀐 부분 찾기: 객체는 키별로, 배열은 끝에 추가만 했으면 '추가', 길이가 같으면 칸별로, 아니면 통째로 */
  function diff(a, b, path, ops) {
    if (a === b) return;
    if (isObj(a) && isObj(b)) {
      Object.keys(a).forEach((k) => { if (!(k in b)) ops.push({ p: path.concat(k), d: 1 }); });
      Object.keys(b).forEach((k) => { if (!(k in a)) ops.push({ p: path.concat(k), v: b[k] }); else diff(a[k], b[k], path.concat(k), ops); });
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (b.length > a.length && a.every((x, i) => JSON.stringify(x) === JSON.stringify(b[i]))) { for (let i = a.length; i < b.length; i++) ops.push({ p: path.concat(i), v: b[i], a: 1 }); return; }
      if (a.length === b.length) { for (let i = 0; i < a.length; i++) diff(a[i], b[i], path.concat(i), ops); return; }
      ops.push({ p: path, v: b });
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) ops.push({ p: path, v: b });
  }
  function applyOps(doc, ops) {
    ops.forEach((op) => {
      if (!op.p.length) { doc = op.d ? null : op.v; return; }
      if (doc === null || typeof doc !== "object") doc = typeof op.p[0] === "number" ? [] : {};
      let cur = doc;
      for (let i = 0; i < op.p.length - 1; i++) { const k = op.p[i]; if (cur[k] === null || typeof cur[k] !== "object") cur[k] = typeof op.p[i + 1] === "number" ? [] : {}; cur = cur[k]; }
      const last = op.p[op.p.length - 1];
      if (op.d) { if (Array.isArray(cur)) cur.splice(last, 1); else delete cur[last]; } else if (op.a && Array.isArray(cur)) cur.push(op.v); else cur[last] = op.v;
    });
    return doc;
  }

  /** 로그인한 코치가 이 종류의 문서를 보낼 수 있는지 — 담당 두잉고(LIVE · VOD)에 맞는 메뉴만 (coach-perms.js · 서버와 같은 표) */
  function coachCan(type) {
    const a = R.me.admin; if (!a || a.role !== "coach" || !window.COACH) return false;
    const ins = db.instructors.find((x) => x.id === a.iid), co = ins && (ins.coaches || []).find((x) => x.id === a.cid);
    return window.COACH.canWrite(type, window.COACH.permsOf(co));
  }
  /** 이 사람이 서버에 저장할 수 있는 문서인지 (서버도 똑같이 다시 확인한다) */
  function canWrite(k) {
    const a = R.me.admin, st = R.me.student, p = k.split(":");
    if (p[0] === "vstat") return false;
    if (VOD_KEY.test(p[0]) && !(a && a.role === "master")) {
      const me = R.me.vod && R.me.vod.mid;
      if (p[0] === "vm") return !!me && me === p[1];
      // 주문: 산 회원 본인 · 그 클래스 강사와 TEA TIME 코치(TEA TIME 일정 칸만 — 서버 vodaccess fixStaffTea)
      if (p[0] === "vo") { const o = docOf(k); if (o && o.tea && a && a.iid && o.iid === a.iid && (a.role === "instructor" || (a.role === "coach" && coachCan("vo")))) return true; return !!me && !!o && o.mid === me; }
      if (p[0] === "vr" || p[0] === "vpl") return !!me;
      if (p[0] === "vq") return !!me && me === p[1];
      if (p[0] === "vpo") return !!(a && a.role === "instructor" && "vpo:" + encodeURIComponent(a.iid) === k);
      return false;
    }
    if (a && a.role === "master") return true;
    // 강사는 meta 를 보내도 서버가 자기 VOD 커리큘럼 · 자기 제출 서류만 받아요 (나머지는 되돌림)
    // 파트너 · 온드미디어도 meta 를 보내면 서버가 자기 계정 칸(연락처 · 계좌 · 비밀번호)만 받아요
    if (k === "meta") return !!(a && (a.role === "instructor" || a.role === "partner" || a.role === "media" || (a.role === "coach" && coachCan("meta"))));
    if (p[0] === "inq") return !!(a && a.role === "partner");
    // 이용료 신청은 강사 본인만 (코치 · 수강생은 못 봄)
    if (p[0] === "bill") return !!(a && a.role === "instructor" && a.iid === p[1]);
    if (a && a.iid === p[1]) {
      if (a.role === "instructor") return true;
      if (a.role === "coach" && ["ins", "content", "cohorts", "stu", "prog"].indexOf(p[0]) >= 0) return coachCan(p[0]);
    }
    return !!(st && p[0] === "prog" && p[1] === st.iid && p[2] === st.sid);
  }

  function schedule() { if (!R.on) return; clearTimeout(R.timer); R.timer = setTimeout(flush, 250); }
  /** 바뀐 문서를 서버에 보낸다 */
  async function flush() {
    if (!R.on || !db) return;
    clearTimeout(R.timer); R.timer = null;
    if (R.busy) { R.again = true; return; }
    const cur = splitDb(db), changes = [], sent = {};
    const prev = {};
    Object.keys(cur).concat(Object.keys(R.snap).filter((k) => !(k in cur))).forEach((k) => {
      const js = cur[k] === undefined ? undefined : JSON.stringify(cur[k]);
      if (js === R.snap[k]) return;
      // 서버가 지난번에 통째로 받지 않은 변경(예: 강사 화면이 채운 스토어 기본값)과 똑같으면 다시 보내지 않아요
      // — 보내고 · 되돌려 받고 · 다시 그리고 · 또 보내는 고리가 돌면 휴대폰 메뉴가 저절로 닫히고 스크롤이 맨 위로 튀었어요
      if (js !== undefined && R.nope[k] === js) return;
      // 고칠 권한이 없는 문서(예: 화면용 기본값 채우기)는 서버에 보내지 않고 그대로 둔다
      if (!canWrite(k)) { if (js === undefined) delete R.snap[k]; else R.snap[k] = js; return; }
      sent[k] = js; prev[k] = R.snap[k];
      const base = R.ver[k] || 0;
      if (js === undefined) changes.push({ k, base, del: true });
      // 파트너 · 온드미디어는 meta 를 통째로 보내요 — 이 사람 화면의 계정 목록은 자기 계정 하나뿐이라 칸 번호(목록 순서)가 서버와 달라서,
      // 바뀐 칸만 보내면 서버에서 다른 계정 자리에 얹혀요. 서버는 자기 계정의 허락된 칸만 골라 받아요 (access.js fixPartnerMeta · media.js fixSelf)
      else if (R.snap[k] === undefined || (k === "meta" && R.me.admin && (R.me.admin.role === "partner" || R.me.admin.role === "media"))) changes.push({ k, base, put: cur[k] });
      else { const ops = []; diff(JSON.parse(R.snap[k]), cur[k], [], ops); changes.push({ k, base, ops }); }
    });
    if (!changes.length) return;
    R.busy = true;
    emit("saving", true);
    try {
      const j = await call("sync", { changes });
      if (j.error) throw new Error(j.error);
      if (j.me) R.me = j.me;
      j.results.forEach((x) => {
        if (x.error) {
          if (x.error === "busy") { R.again = true; return; }
          R.snap[x.k] = sent[x.k];
          emit("error", x.error === "too-large" ? "사진이나 첨부가 너무 커서 저장하지 못했어요. 크기를 줄여 다시 올려 주세요." : "저장할 권한이 없는 내용이 있어 저장하지 못했어요.");
          return;
        }
        R.ver[x.k] = x.ver;
        const got = x.doc != null ? JSON.stringify(x.doc) : undefined;
        // 서버가 내 변경을 하나도 받지 않았으면(권한 밖 칸만 고쳤을 때) 그 내용은 기억해 두고 화면은 다시 그리지 않아요
        // (보내기 전 모습 그대로이거나, 서버가 지난번에 준 문서와 글자 하나 다르지 않을 때)
        if (got !== undefined && prev[x.k] !== undefined && sent[x.k] !== undefined && (got === prev[x.k] || got === R.last[x.k])) { R.nope[x.k] = sent[x.k]; delete R.rej[x.k]; return; }
        if (got !== undefined) R.last[x.k] = got; else if (x.doc === null) delete R.last[x.k];
        delete R.nope[x.k];
        // 똑같은 내용을 또 보냈는데 서버가 또 다르게 돌려주면(일부만 받거나 순서만 바꿔서) 그 내용은 더 보내지 않아요 — 보내기 · 되돌려 받기 고리를 끊음
        if (got !== undefined && sent[x.k] !== undefined && got !== sent[x.k]) {
          const r = R.rej[x.k];
          if (r && r.js === sent[x.k]) { if (++r.n >= 2) R.nope[x.k] = sent[x.k]; } else R.rej[x.k] = { js: sent[x.k], n: 1 };
        } else delete R.rej[x.k];
        if (x.doc === undefined) { if (sent[x.k] === undefined) { delete R.snap[x.k]; delete R.last[x.k]; } else R.snap[x.k] = R.last[x.k] = sent[x.k]; return; }
        // 서버에서 합쳐진 결과(다른 사람 변경 · 사진 주소)를 받는다. 그 사이 또 고친 내용은 그 위에 다시 얹는다
        const now = snapOf(x.k);
        if (x.doc != null && now !== undefined && sent[x.k] !== undefined && now !== sent[x.k]) {
          const ops = []; diff(JSON.parse(sent[x.k]), JSON.parse(now), [], ops);
          placeIn(db, x.k, applyOps(clone(x.doc), ops));
          R.snap[x.k] = JSON.stringify(x.doc);
          R.again = true;
        } else { placeIn(db, x.k, x.doc); R.snap[x.k] = snapOf(x.k); }
        emit("change", [x.k]);
      });
      R.fails = 0;
      emit("saving", false);
    } catch (e) {
      R.fails++;
      emit("offline", e.readonly ? { readonly: true, message: e.message } : e.message);
      setTimeout(flush, Math.min(30000, 1500 * R.fails));
    } finally {
      R.busy = false;
      if (R.again) { R.again = false; schedule(); }
    }
  }
  /** 다른 기기 · 다른 사람이 바꾼 내용 받기 (30초마다, 그리고 이 창으로 돌아올 때) */
  async function poll(force) {
    if (!R.on || !db || R.polling || R.busy) return;
    if (!force && Date.now() - R.lastPoll < 5000) return;
    // 보낼 변경이 기다리는 중이면 먼저 보내고 받는다 (그냥 건너뛰면 다른 사람 변경이 30초 더 늦게 보였어요)
    if (R.timer) { await flush(); if (R.busy || R.timer) return; }
    R.polling = true;
    try {
      const j = await call("bootstrap?since=" + Math.max(0, R.now - 15000), undefined, "GET");
      if (j.error) return;
      if (j.epoch && R.epoch && j.epoch !== R.epoch) { emit("reset"); return; }
      const meChanged = JSON.stringify(j.me) !== JSON.stringify(R.me);
      R.me = j.me; R.now = j.now;
      const changed = [];
      (j.docs || []).forEach(([k, v, ver]) => {
        if (ver <= (R.ver[k] || 0)) return;
        // 판 번호만 올라가고 내용은 그대로면 다시 그리지 않아요
        if (R.last[k] !== undefined && JSON.stringify(v) === R.last[k]) { R.ver[k] = ver; return; }
        // 내가 고치는 중인 문서는 건너뛴다 (저장할 때 서버에서 합쳐져 돌아온다)
        if (canWrite(k) && snapOf(k) !== R.snap[k] && snapOf(k) !== R.nope[k]) return;
        placeIn(db, k, v);
        R.ver[k] = ver; R.last[k] = JSON.stringify(v);
        R.snap[k] = snapOf(k);
        changed.push(k);
      });
      if (changed.length || meChanged) emit("change", changed);
    } catch (e) { /* 다음에 다시 */ } finally { R.polling = false; R.lastPoll = Date.now(); }
  }
  function startPolling() {
    setInterval(() => poll(), 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
    window.addEventListener("focus", () => poll());
    window.addEventListener("beforeunload", (e) => { if (R.timer || R.busy) { flush(); e.preventDefault(); e.returnValue = ""; } });
  }
  const remote = {
    get on() { return R.on; },
    get me() { return R.me; },
    connect, refresh, flush, poll, call,
    login: (payload) => call("auth", payload),
    logout: (which) => flush().catch(() => {}).then(() => call("auth", { action: "logout", which })),
    pending: () => !!(R.timer || R.busy),
    listen: (fn) => { R.listeners.push(fn); }
  };

  /* ---------------- 세션 ---------------- */
  const session = {
    student: () => store.get("moonclass:session", null),
    setStudent: (v) => (v ? store.set("moonclass:session", v) : store.remove("moonclass:session")),
    admin: () => store.get("moonclass:admin-session", null),
    setAdmin: (v) => (v ? store.set("moonclass:admin-session", v) : store.remove("moonclass:admin-session")),
    instructorPick: () => store.get("moonclass:instructor", null),
    setInstructorPick: (id) => store.set("moonclass:instructor", id)
  };

  window.DB = {
    load, save, reset, store, clone, uid, esc, youtubeId, vimeoUrl, vimeoSrc, vidVal, vidOk, vidShow, vdur, rich, libNoticeOf, CHANNEL_TYPES, CHANNEL_ICONS, CHANNEL_COLORS, channelType, channelLook, defaultChannels, channelsOf, PARTNER_GROUPS, PARTNER_ICONS, defaultPartners, partnersOf, inkOn, coachesOf, coach, findCoachLogin, findCoachLogins, QL_ICONS, defaultQuickLinks, quickLinksOf, csvData, MISSION_KINDS, missionKind, classDate, template, templateFromMoon, moonMenu, normalizeContent, LANDING_SECTIONS, landingOf, FREE_SECTIONS, freeOf,
    get data() { return db; },
    instructor, activeInstructors, liveInstructors, tracksOf, content, cohort, cohortsOf, studentsOf, student, certNo,
    VOD_MENUS, VOD_LIVE_ONLY, VOD_KEYS, vodContent, vodView, vodOwn, vodEnsure, vodCopy, vodCohortId, vodStudentsOf, isVodStudent, splitMid,
    curricula, curriculum, curriculumOf, weeksOf, cohortWeeks,
    weekOpen, weekUnlock, weekDeadline, baseClassDate, cohortEnd, cohortStatus, STATUS_LABEL, currentWeek, LEVEL_SET, levelSteps, level, currentCohort, nextCohortName,
    EVENT_TYPES, events, ruleText, evLabel, calTypes, calManual, calShort, calChip, calMain, CAL_ORDER, classOverOf, lectureOf, evTime, isWeekLec,
    REQUEST_CATEGORIES, maskName, requests, inquiries, saveInquiry, removeInquiry, applyPartner, applyTrack, siteInfo, saveSite, SITE_DEFAULT, opsKakao,
    BILLING_DEFAULT, BILL_VAT, BILL_STATE, billingInfo, saveBilling, bills, saveBill, removeBill, billMoney, billState, won,
    THEMES, themeOf, STUDENT_MENUS, LIB_MENUS, CUSTOM_ICONS, menuConfig, menuOn, libOn, isCustom, NOTE_PROMPTS, botNameOf,
    emptyProgress, progress, saveProgress, allProgress, lastSub, subState, stats,
    session, remote, onSave,
    date: { DOW, todayStr, parseDate, addDays, diffDays, fmtMD, fmtFull, fmtKo, fmtStamp, toStr }
  };
})();
