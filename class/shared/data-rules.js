/* 처음 데이터 · 데이터 정리 규칙 공용 모듈 (Next.js 전환 2단계 · 2026-11) — 화면(db.js)과 서버(api/_lib/seed.js)가 같은 규칙을 써요.
 * 예전에는 서버가 화면 파일 db.js 를 통째로 돌려서 처음 데이터를 만들고 빠진 기본값을 채웠어요. 이제 그 규칙만 여기 두고
 * 화면도 서버도 이 파일을 불러요 (규칙 코드는 db.js 에 있던 그대로 옮겼어요).
 *   · 강사별 화면 색 · 수강생 메뉴(LIVE · VOD) · 새 강사 기본 콘텐츠 · 자주 찾는 페이지 기본 목록 · 과제 종류
 *   · 강사 소개 페이지 · 무료강의 페이지 기본값(landingOf · freeOf — 3단계: 서버 공유 미리보기도 같은 규칙)
 *   · 처음 데이터(fromSeed) · 예전 데이터 고치기(migrate2to3) · 빠진 기본값 채우기(loadFixups — 한 번만 하는 정리들 포함)
 * make(ctx) — 지금 값은 쓰는 쪽이 넘겨줘요:
 *   db() · setDb(v)      지금 데이터 (db.js: 브라우저 · 서버에서 받은 데이터 / 서버: 정리할 문서들을 합친 것)
 *   seed()               처음 데이터 (data.js 의 CLASS_SEED)
 *   save()               바꾼 뒤 저장 (db.js: 저장 · 서버로 보내기 / 서버: 아무것도 안 함 — 나중에 한꺼번에 비교해요)
 *   remote()             서버 데이터로 쓰는 중인지 (db.js R.on — 서버 데이터에는 이 브라우저 전용 정리를 하지 않아요)
 *   storeGet(k, fb) · storeSet(k, v)   진행 기록 저장소 (db.js: localStorage / 서버: 메모리)
 *  · 브라우저: <script src="shared/data-rules.js"> (shared/dates.js 다음) → window.DCS.data · Node: require("./shared/data-rules") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make(require("./dates"));
  else (root.DCS = root.DCS || {}).data = make(root.DCS.dates);
})(typeof self !== "undefined" ? self : this, function (D) {
  "use strict";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => (p || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const todayStr = () => D.toStr(new Date());
  const addDays = D.addDays;
  const KEY_PROGRESS = "moonclass:progress:";
  function emptyProgress() { return { submissions: {}, watched: {}, docs: {}, questions: [], chat: [], notes: {}, journal: {}, readNotices: {}, guide: {} }; }

  function make(ctx) {
    const SEED = () => ctx.seed();
    const save = () => ctx.save();
    const R = { get on() { return ctx.remote(); } };
    const store = { get: (k, fb) => ctx.storeGet(k, fb), set: (k, v) => ctx.storeSet(k, v) };
    const instructor = (id) => ctx.db().instructors.find((x) => x.id === id) || null;
    const content = (id) => ctx.db().content[id] || null;

    /* ---------------- 수강생 화면 색상 (강사별) ---------------- */
    // 대표색 + 그 위에 올라가는 글자색. 로그인 왼쪽 패널 배경(bg)도 같은 계열로 맞춘다.
    const THEMES = {
      lime:   { label: "라임",   primary: "#9fe870", active: "#cdffad", pale: "#e2f6d5", deep: "#163300", rgb: "159,232,112", bg: ["#18290f", "#0e150b", "#0a170e"], sub: "#b8c2b0" },
      orange: { label: "오렌지", primary: "#ffb45e", active: "#ffd3a3", pale: "#fff0de", deep: "#4a2300", rgb: "255,180,94",  bg: ["#2e1b0a", "#150d05", "#201208"], sub: "#d6c3ad" },
      yellow: { label: "옐로",   primary: "#ffd84d", active: "#ffeaa0", pale: "#fff7d6", deep: "#3d2e00", rgb: "255,216,77",  bg: ["#2b240a", "#141005", "#1f1a08"], sub: "#d4caa8" },
      coral:  { label: "코랄",   primary: "#ff8f7d", active: "#ffc4ba", pale: "#ffe8e3", deep: "#4a1008", rgb: "255,143,125", bg: ["#2d130f", "#150807", "#200d0a"], sub: "#d9bcb6" },
      pink:   { label: "핑크",   primary: "#ff9ec8", active: "#ffcfe4", pale: "#ffeaf3", deep: "#4d0b2b", rgb: "255,158,200", bg: ["#2b1021", "#14080f", "#1f0c18"], sub: "#d9b9c8" },
      violet: { label: "바이올렛", primary: "#c3a6ff", active: "#e0d2ff", pale: "#f1eaff", deep: "#2a1060", rgb: "195,166,255", bg: ["#1f1439", "#0f0a1c", "#170e2b"], sub: "#c6bcdc" },
      sky:    { label: "스카이", primary: "#7cc6ff", active: "#b9e1ff", pale: "#e2f2ff", deep: "#062a4a", rgb: "124,198,255", bg: ["#0d2134", "#081018", "#0a1a2a"], sub: "#b3c4d4" },
      mint:   { label: "민트",   primary: "#6fe3c8", active: "#b1f2e3", pale: "#dcf8f1", deep: "#003d31", rgb: "111,227,200", bg: ["#0c2621", "#06130f", "#0a1d18"], sub: "#acc9c1" },
      // 브랜드 디자인 세트 — 대표색 위 글자색(onPrimary), 어두운 바탕 위 강조색(accent)과 바탕 잉크·본문·구분선까지 바꾼다
      binance: { label: "바이낸스", primary: "#fcd535", active: "#f0b90b", pale: "#fdf3c4", deep: "#181a20", onPrimary: "#181a20", accent: "#fcd535", accentActive: "#fcd535",
        rgb: "252,213,53", bg: ["#1e2329", "#0b0e11", "#0b0e11"], sub: "#929aa5",
        vars: { "--ink": "#181a20", "--body": "#474d57", "--mute": "#707a8a", "--line": "#eaecef", "--line-soft": "#f5f5f5", "--canvas-soft": "#eaecef", "--canvas-softer": "#fafafa" } },
      // 여기어때 레드 — 흰 바탕(무채색 회색) 위에 빨강은 버튼 · 선택 표시 같은 포인트에만 (두고 클래스 첫 화면과 같은 색)
      red: { label: "레드", primary: "#f94239", active: "#ea2013", pale: "#ffedea", deep: "#ea2013", onPrimary: "#ffffff", accent: "#ff6158", accentActive: "#fb7f79", swRing: "#f94239",
        rgb: "249,66,57", bg: ["#2a1311", "#140908", "#1d0d0b"], sub: "#d9bcb6",
        vars: { "--ink": "#222222", "--body": "#474747", "--mute": "#707070", "--line": "#e6e6e6", "--line-soft": "#f0f0f0", "--canvas-soft": "#f5f5f5", "--canvas-softer": "#fafafa", "--primary-neutral": "#fedfde" } },
      // 두잉고 레드 — 두잉고 첫 화면과 같은 색: 흰 바탕 + 빨강(#FF0037) 포인트, 로그인 왼쪽 패널은 검정
      doinggo: { label: "두잉고 레드", cls: "th-doinggo", primary: "#ff5c70", active: "#f0435a", pale: "#fff1f3", deep: "#e8445a", onPrimary: "#ffffff", accent: "#ff5c70", accentActive: "#ff8293", swRing: "#ff5c70",
        rgb: "255,92,112", bg: ["#ffffff", "#fffbfc", "#fff5f7"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#ffe3e8" } },
      airtable: { label: "에어테이블", primary: "#181d26", active: "#0d1218", pale: "#f5e9d4", deep: "#181d26", onPrimary: "#ffffff", accent: "#fcab79", accentActive: "#f4d35e", swRing: "#fcab79",
        rgb: "170,45,0", bg: ["#2a1d17", "#181d26", "#0d1218"], sub: "#c9c4bc",
        vars: { "--ink": "#181d26", "--body": "#333840", "--line": "#dddddd", "--line-soft": "#ececec", "--canvas-soft": "#f2f0eb", "--canvas-softer": "#f8f7f4", "--positive-deep": "#0a2e0e", "--warning": "#f4d35e" } }
  ,
      // ↓ 추가 색상 (밝은 세트: 흰 바탕 + 색 포인트 · 어두운 세트: 로그인 왼쪽이 짙은 색)
      blue: { label: "블루", cls: "th-light", primary: "#3b82f6", active: "#2563eb", pale: "#eaf2ff", deep: "#1d4ed8", onPrimary: "#ffffff", accent: "#3b82f6", accentActive: "#2563eb", swRing: "#3b82f6",
        rgb: "59,130,246", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#dbe8ff" } },
      indigo: { label: "인디고", cls: "th-light", primary: "#6366f1", active: "#4f46e5", pale: "#eef0ff", deep: "#4338ca", onPrimary: "#ffffff", accent: "#6366f1", accentActive: "#4f46e5", swRing: "#6366f1",
        rgb: "99,102,241", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#e0e2ff" } },
      green: { label: "그린", cls: "th-light", primary: "#16a34a", active: "#15803d", pale: "#e9f9ef", deep: "#15803d", onPrimary: "#ffffff", accent: "#16a34a", accentActive: "#15803d", swRing: "#16a34a",
        rgb: "22,163,74", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#d3f3df" } },
      teal: { label: "틸", cls: "th-light", primary: "#0d9488", active: "#0f766e", pale: "#e6f7f5", deep: "#0f766e", onPrimary: "#ffffff", accent: "#0d9488", accentActive: "#0f766e", swRing: "#0d9488",
        rgb: "13,148,136", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#cfeeea" } },
      purple: { label: "퍼플", cls: "th-light", primary: "#9333ea", active: "#7e22ce", pale: "#f5ecff", deep: "#7e22ce", onPrimary: "#ffffff", accent: "#9333ea", accentActive: "#7e22ce", swRing: "#9333ea",
        rgb: "147,51,234", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#ead9ff" } },
      rose: { label: "로즈", cls: "th-light", primary: "#ec4899", active: "#db2777", pale: "#fdecf5", deep: "#be185d", onPrimary: "#ffffff", accent: "#ec4899", accentActive: "#db2777", swRing: "#ec4899",
        rgb: "236,72,153", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#fbd5e9" } },
      tangerine: { label: "탠저린", cls: "th-light", primary: "#f97316", active: "#ea580c", pale: "#fff1e6", deep: "#c2410c", onPrimary: "#ffffff", accent: "#f97316", accentActive: "#ea580c", swRing: "#f97316",
        rgb: "249,115,22", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#ffe0c7" } },
      mono: { label: "모노 블랙", cls: "th-light", primary: "#222222", active: "#000000", pale: "#f2f2f2", deep: "#111111", onPrimary: "#ffffff", accent: "#222222", accentActive: "#000000", swRing: "#222222",
        rgb: "34,34,34", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#474747", "--mute": "#707070", "--line": "#ececee", "--line-soft": "#f3f3f4", "--canvas-soft": "#f6f6f7", "--canvas-softer": "#fafafa", "--primary-neutral": "#e6e6e6" } },
      gold: { label: "블랙 골드", primary: "#d4af37", active: "#e8c860", pale: "#f8f0d6", deep: "#2a2108", rgb: "212,175,55", bg: ["#1c1a14", "#0d0c09", "#141209"], sub: "#c9c0a8" },
      navy: { label: "네이비", primary: "#5b8cff", active: "#a3bfff", pale: "#e8efff", deep: "#0b1d4d", onPrimary: "#ffffff", rgb: "91,140,255", bg: ["#0f1d3d", "#081127", "#0b1733"], sub: "#aebbd6" },
      wine: { label: "와인", primary: "#e0577f", active: "#f29bb4", pale: "#fde8ee", deep: "#4a0d20", onPrimary: "#ffffff", rgb: "224,87,127", bg: ["#2a0f19", "#14070c", "#1f0b13"], sub: "#d6b6c0" },
      olive: { label: "올리브", primary: "#b5c74a", active: "#d4e283", pale: "#f2f6d9", deep: "#253000", rgb: "181,199,74", bg: ["#1e2410", "#0e1108", "#161b0b"], sub: "#c3c8aa" },
      // 클린 화이트 — 흰 바탕 + 검정 포인트. VOD 두잉고는 강사 색과 상관없이 이 색 (강사도 고를 수 있어요)
      white: { label: "클린 화이트", cls: "th-light", primary: "#111111", active: "#000000", pale: "#f1f1f3", deep: "#111111", onPrimary: "#ffffff", accent: "#111111", accentActive: "#333333", swRing: "#111111",
        rgb: "17,17,17", bg: ["#ffffff", "#fcfcfd", "#f8f8fa"], sub: "#5c5c66",
        vars: { "--ink": "#111111", "--body": "#4a4a50", "--mute": "#76767d", "--line": "#e8e8eb", "--line-soft": "#f1f1f3", "--canvas-soft": "#f5f5f7", "--canvas-softer": "#fafafb", "--primary-neutral": "#e6e6e9" } },
      // 뉴질랜드 — 문대표 전용. 국기 네이비 · 레드(남십자성) · 실버 펀(고사리) 마크. 흰 바탕 학습 화면 + 네이비 로그인 패널
      nz: { label: "뉴질랜드", only: ["moon"], cls: "th-nz", primary: "#0b2a5b", active: "#071d42", pale: "#e9eef7", deep: "#0b2a5b", onPrimary: "#ffffff", accent: "#2f74c0", accentActive: "#1f5fa8", swRing: "#0b2a5b",
        rgb: "11,42,91", bg: ["#0b2a5b", "#061833", "#0a2550"], sub: "#bcc7da",
        vars: { "--ink": "#0d1428", "--body": "#3d4559", "--mute": "#6b7489", "--line": "#e2e7ef", "--line-soft": "#eef1f6", "--canvas-soft": "#f3f5f9", "--canvas-softer": "#f8f9fc", "--primary-neutral": "#dde5f2" } },
      // 블랙 — VOD 두잉고 다크 모드 (수강생이 오른쪽 위 버튼으로 바꿔요 · 강사 색 목록에는 안 보여요)
      night: { label: "블랙", hidden: true, cls: "th-night", primary: "#f4f4f5", active: "#ffffff", pale: "#26272c", deep: "#f4f4f5", onPrimary: "#111111", accent: "#f4f4f5", accentActive: "#ffffff", swRing: "#f4f4f5",
        rgb: "244,244,245", bg: ["#0f1012", "#0b0c0e", "#141518"], sub: "#a1a1aa",
        vars: { "--canvas": "#17181c", "--canvas-soft": "#0d0e10", "--canvas-softer": "#1d1e23", "--ink": "#f4f4f5", "--body": "#c6c7cc", "--mute": "#8e9098", "--line": "#2c2e34", "--line-soft": "#222328", "--primary-neutral": "#2a2b31", "--warning-bg": "#2a2414", "--negative-pale": "#3a1c20", "--shadow-pop": "0 24px 60px -20px rgba(0, 0, 0, .7), 0 2px 8px rgba(0, 0, 0, .4)" } }
    };
    const themeOf = (key) => THEMES[key] || THEMES.lime;

    /* ---------------- 수강생 메뉴 구성 (마스터가 강사별로 켜고 끄고 이름을 바꾼다) ---------------- */
    // 이름은 두고 클래스 표현으로 (강사·마스터가 메뉴 구성에서 바꿀 수 있다). replays · showcase · glossary 는 내용이 있을 때만 수강생에게 보인다
    const STUDENT_MENUS = [
      { key: "home", label: "내 강의실", icon: "home", locked: true },
      { key: "curriculum", label: "주차별 강의", icon: "book" },
      { key: "replays", label: "라이브 다시보기", icon: "monitorPlay", needs: "replays", desc: "지난 라이브를 주차별로 다시 봐요" },
      { key: "missions", label: "과제 · 미션", icon: "checks" },
      { key: "showcase", label: "모범 과제", icon: "trophy", needs: "showcase", desc: "강사가 고른 잘한 과제 예시" },
      { key: "notes", label: "학습 노트", icon: "notebookPen", desc: "주차별 회고 질문 + 강의 메모 모음" },
      { key: "schedule", label: "수업 캘린더", icon: "calendar" },
      { key: "notices", label: "클래스 소식", icon: "megaphone" },
      { key: "qna", label: "질문 · 요청", icon: "help" },
      { key: "docs", label: "실무 체크리스트", icon: "clipboard" },
      { key: "glossary", label: "용어 사전", icon: "bookA", needs: "glossary", desc: "강의에 나오는 용어를 쉽게 풀어 둔 사전" },
      { key: "bot", label: "AI 조교", icon: "bot" },
      { key: "library", label: "강의 자료함", icon: "library" },
      { key: "motivation", label: "응원 영상", icon: "flame" },
      { key: "channels", label: "1:1 상담", icon: "headset" },
      { key: "partners", label: "제휴 혜택", icon: "handshake" },
      { key: "certificate", label: "수료증 발급", icon: "award" }
    ];
    // 예전 기본 이름 — 강사가 직접 바꾼 이름이 아니라 예전 기본 이름이 그대로 저장돼 있으면 새 기본 이름을 쓴다
    const OLD_MENU_LABELS = { home: "홈", curriculum: "커리큘럼", missions: "과제 제출하기", schedule: "강의 일정", notices: "공지사항", qna: "Q&A", docs: "서류 준비 가이드", bot: "AI봇", library: "유료강의 자료실", motivation: "동기부여", channels: "1:1 소통채널", partners: "제휴채널", certificate: "수료증" };
    const botNameOf = (inst) => (inst || "강사") + " AI 조교";
    const OLD_BOT_NAME = (inst) => "24시 " + (inst || "강사") + " AI봇";
    // 학습 노트: 강사가 주차별 질문을 정하지 않은 주차에 쓰는 기본 회고 질문
    // 예전 메뉴 이름이 들어간 기본 문구 → 새 이름 (기본 문구가 그대로 남아 있을 때만 바뀐다 · 서버는 api/_lib/oneoff.js 의 같은 목록)
    const RENAME_PHRASES = [
      [/다시보기는 커리큘럼 메뉴에 올라갑니다/g, "다시보기는 ‘라이브 다시보기’ 메뉴에 올라갑니다"],
      [/‘과제 제출하기’에서 주차별로/g, "‘과제 · 미션’에서 주차별로"],
      [/Q&A 메뉴나 24시 (\S+) AI봇에 먼저/g, "‘질문 · 요청’ 메뉴나 $1 AI 조교에게 먼저"],
      [/^유료강의 자료실 이용 시 주의사항$/, "강의 자료함 이용 시 주의사항"],
      [/다시보기가 커리큘럼 1주차에 올라갔습니다/g, "다시보기가 ‘주차별 강의’ 1주차에 올라갔습니다"],
      [/‘서류 준비 가이드’ 메뉴/g, "‘실무 체크리스트’ 메뉴"],
      [/라이브 다음 날까지 커리큘럼 메뉴에 다시보기가 올라갑니다\. 강의 일정 메뉴에서/g, "라이브 다음 날까지 ‘라이브 다시보기’ 메뉴에 영상이 올라갑니다. ‘수업 캘린더’ 메뉴에서"],
      [/강의 일정 메뉴의 파란 점/g, "‘수업 캘린더’ 메뉴의 파란 점"],
      [/Q&A의 ‘요청사항’ 탭에서 ‘문의하기’를 눌러/g, "‘질문 · 요청’ 메뉴의 ‘1:1 요청’ 탭에서 ‘요청 남기기’를 눌러"],
      [/^다시보기가 커리큘럼 메뉴에 올라갑니다\.$/, "다시보기가 ‘라이브 다시보기’ 메뉴에 올라갑니다."],
      [/AI봇에 밤에 물어봐도/g, "AI 조교한테 밤에 물어봐도"],
      [/^서류 준비 가이드 · 마진 계산기$/, "실무 체크리스트 · 마진 계산기"],
      [/^24시 (\S+) AI봇$/, "$1 AI 조교 (24시간 답변)"],
      [/일정, 자료실, 24시 AI봇까지 한 곳에서/g, "일정, 자료함, AI 조교까지 한 곳에서"],
      [/^AI봇에게 궁금한 점 물어보기$/, "AI 조교에게 궁금한 점 물어보기"],
      [/^강의 일정 확인하기$/, "수업 캘린더 확인하기"]
    ];
    const QL_RENAME = { ql1: ["공지사항", "클래스 소식"], ql2: ["자주 묻는 질문", "FAQ 검색"], ql3: ["서류 준비 가이드", "실무 체크리스트"], ql4: ["요청사항", "1:1 요청"] };
    /** 콘텐츠 안의 글자를 통째로 바꾼다 (사진 · 파일 데이터 칸은 건너뜀) */
    function renameWord(o, re, to) {
      if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === "string") o[i] = v.replace(re, to); else if (v && typeof v === "object") renameWord(v, re, to); }); return o; }
      Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === "string") { if (k !== "data" && k !== "photo") o[k] = v.replace(re, to); } else if (v && typeof v === "object") renameWord(v, re, to); });
      return o;
    }
    /** 콘텐츠 한 개의 예전 기본 문구를 새 메뉴 이름으로. 바뀐 칸 수를 돌려준다 */
    function renameContentPhrases(c) {
      let n = 0;
      const walk = (o) => {
        if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === "string") { const r = RENAME_PHRASES.reduce((t, p) => t.replace(p[0], p[1]), v); if (r !== v) { o[i] = r; n++; } } else if (v && typeof v === "object") walk(v); }); return; }
        Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === "string") { if (k === "data" || k === "photo") return; const r = RENAME_PHRASES.reduce((t, p) => t.replace(p[0], p[1]), v); if (r !== v) { o[k] = r; n++; } } else if (v && typeof v === "object") walk(v); });
      };
      ["notices", "faqs", "guide", "landing"].forEach((k) => { if (c[k] && typeof c[k] === "object") walk(c[k]); });
      if (c.brand && c.brand.botName === OLD_BOT_NAME(c.brand.instructor)) { c.brand.botName = botNameOf(c.brand.instructor); n++; }
      (Array.isArray(c.quickLinks) ? c.quickLinks : []).forEach((l) => { const r = QL_RENAME[l.id]; if (r && l.title === r[0]) { l.title = r[1]; n++; } });
      return n;
    }
    const NOTE_PROMPTS = ["이번 주 강의에서 가장 기억에 남는 한 가지는?", "다음 주까지 바로 실행해 볼 행동 한 가지는?", "아직 헷갈리거나 강사님께 물어보고 싶은 점은?"];
    const LIB_MENUS = [
      { key: "ebook", label: "전자책 · 가이드북" }, { key: "file", label: "자료 파일" },
      { key: "vod", label: "이커머스 실전 VOD" }, { key: "senior", label: "시니어 기초 가이드" }
    ];
    const CUSTOM_ICONS = ["file", "video", "link", "book", "star", "image", "coins", "store", "users", "calendar", "sparkles", "award"];
    /* ---------------- 두잉고 VOD 버전 ----------------
     * 강사 한 명의 두잉고는 두 가지 버전: LIVE · 오프라인(기수 · 주차 · 과제) / VOD(DOOGO CLASS에서 내 VOD를 산 수강생용, 주차 · 과제 없이 바로 공부)
     * 메뉴 구성은 ins.menuVod, 콘텐츠는 content.vod 에 따로 둔다 (기본 정보 · 색상 · AI 조교 이름은 LIVE와 함께 쓴다)
     * 메뉴 함수에는 "강사ID@vod" 를 넘기면 VOD 버전 메뉴를 다룬다
     * v15: VOD 상품마다 두잉고 강의실이 따로 — "강사ID@vod:상품ID" · content.vodBy[상품ID] · ins.menuVodBy[상품ID]
     *      (강사센터에서 그 VOD를 처음 고를 때 공통 VOD 버전을 복사해 만들어요. 만들기 전에는 공통 VOD 버전을 보여 줘요) */
    const VOD_MENUS = [
      { key: "home", label: "내 강의실", icon: "home", locked: true },
      { key: "vodclass", label: "VOD 강의", icon: "circlePlay", desc: "구매한 VOD 강의 · 이어 보기 · 진도" },
      { key: "notices", label: "업데이트 소식", icon: "megaphone", desc: "강의 업데이트 · 새 자료 소식" },
      { key: "library", label: "강의 자료함", icon: "library", desc: "전자책 · 교재 · 보충 영상" },
      { key: "docs", label: "실습 체크리스트", icon: "clipboard", desc: "숙제 대신 스스로 점검하는 실습 단계" },
      { key: "qna", label: "FAQ · 1:1 코칭", icon: "help", desc: "FAQ로 먼저 찾고, 1:1 코칭권이 있으면 강사에게 직접 질문해요" },
      { key: "bot", label: "AI 조교", icon: "bot" },
      { key: "glossary", label: "용어 사전", icon: "bookA", needs: "glossary" },
      { key: "partners", label: "제휴 혜택", icon: "handshake" },
      { key: "motivation", label: "응원 영상", icon: "flame", off: true },
      { key: "notes", label: "학습 노트", icon: "notebookPen", off: true, desc: "강의를 보며 남기는 내 메모" }
    ];
    const VOD_LIVE_ONLY = ["curriculum", "replays", "missions", "showcase", "schedule", "certificate"];
    // VOD 강의는 실시간 케어(1:1 대화 · 1:1 상담)가 없어요 — 가격이 기수 강의의 몇 분의 1이라 FAQ · AI 조교로 안내
    const VOD_LABEL = { notices: "업데이트 소식", docs: "실습 체크리스트", qna: "FAQ · 1:1 코칭" };
    const splitMid = (id) => { const t = String(id == null ? "" : id).split("@"), v = t[1] || ""; return { iid: t[0], vod: v === "vod" || v.indexOf("vod:") === 0, pid: v.indexOf("vod:") === 0 ? v.slice(4) : "" }; };
    function menuConfig(insId) {
      const mid = splitMid(insId);
      if (mid.vod) return vodMenuConfig(mid.iid, mid.pid);
      const ins = instructor(insId);
      if (!ins) return { items: [], library: {} };
      const m = ins.menu = ins.menu || {};
      m.items = Array.isArray(m.items) ? m.items : [];
      // 새로 생긴 메뉴는 기본 순서상 바로 앞 메뉴 뒤에 끼워 넣는다 (예: 1:1 소통채널은 동기부여 아래)
      STUDENT_MENUS.forEach((d, i) => {
        if (m.items.some((x) => x.key === d.key)) return;
        let at = m.items.length;
        for (let j = i - 1; j >= 0; j--) { const k = m.items.findIndex((x) => x.key === STUDENT_MENUS[j].key); if (k !== -1) { at = k + 1; break; } }
        m.items.splice(at, 0, { key: d.key, on: true });
      });
      m.items.forEach((x) => { if (x.key === "home") x.on = true; if (x.label && OLD_MENU_LABELS[x.key] === x.label) delete x.label; });
      m.library = Object.assign({ ebook: true, file: true, vod: true, senior: true }, m.library || {});
      return m;
    }
    function vodMenuConfig(iid, pid) {
      const ins = instructor(iid);
      if (!ins) return { items: [], library: {} };
      const by = pid && ins.menuVodBy && ins.menuVodBy[pid];
      const m = by || (ins.menuVod = ins.menuVod || {});
      m.items = (Array.isArray(m.items) ? m.items : []).filter((x) => isCustom(x.key) || VOD_MENUS.some((d) => d.key === x.key));
      VOD_MENUS.forEach((d, i) => {
        if (m.items.some((x) => x.key === d.key)) return;
        let at = m.items.length;
        for (let j = i - 1; j >= 0; j--) { const k = m.items.findIndex((x) => x.key === VOD_MENUS[j].key); if (k !== -1) { at = k + 1; break; } }
        m.items.splice(at, 0, Object.assign({ key: d.key, on: !d.off }, VOD_LABEL[d.key] ? { label: VOD_LABEL[d.key] } : {}));
      });
      m.items.forEach((x) => { if (x.key === "home") x.on = true; if (x.key === "qna" && (!x.label || x.label === "질문 · 요청" || x.label === "자주 묻는 질문")) x.label = VOD_LABEL.qna; });
      m.library = Object.assign({ ebook: true, file: true, vod: true, senior: true }, m.library || {});
      return m;
    }
    const isCustom = (key) => /^cp_/.test(key);
    const menuOn = (insId, key) => { const it = menuConfig(insId).items.find((x) => x.key === key); return !!(it && it.on); };
    const libOn = (insId, key) => menuOn(insId, "library") && menuConfig(insId).library[key] !== false;

    /* ---------------- 새 강사용 기본 콘텐츠 ---------------- */
    function template(brand) {
      const name = brand.name || "새 강의";
      const inst = brand.instructor || "강사";
      const lesson = (w, i, t) => ({ id: "l" + w + "-" + i, title: t, minutes: 30, youtubeId: "", desc: "강의 소개를 적어 주세요." });
      const mission = (w, i, t, type, req, check) => ({ id: "m" + w + "-" + i, title: t, required: req, type, desc: "과제 설명을 적어 주세요.", steps: ["진행 방법 1", "진행 방법 2"], check });
      return {
        brand: {
          name, instructor: inst,
          courseTitle: brand.courseTitle || name + " 실전 클래스",
          shortTitle: brand.shortTitle || "실전 클래스",
          tagline: "함께 성장하는 실전 클래스",
          botName: botNameOf(inst),
          youtubeChannel: "", freeCourseUrl: "", kakaoChannel: "",
          loginEyebrow: "DOINGGO",
          loginHeadline: name + "\n함께 시작해요",
          loginSub: "매주 과제를 하나씩 해내다 보면, 어느새 내 이름의 비즈니스가 움직이고 있을 거예요.",
          liveTime: "20:00", liveUrl: "",
          theme: brand.theme || "lime"
        },
        weeks: [1, 2, 3, 4].map((w) => ({
          no: w, title: w + "주차 주제를 적어 주세요", summary: "이번 주에 배우는 내용을 한 줄로 적어 주세요.",
          lessons: [lesson(w, 1, w + "주차 1강"), lesson(w, 2, w + "주차 2강")],
          missions: [
            mission(w, 1, w + "주차 실습 인증", "image", true, { image: true }),
            mission(w, 2, w + "주차 수강 후기", "text", false, { minLength: 30 })
          ]
        })),
        schedule: [
          { id: "e1", type: "qna", title: "주간 Q&A 라이브", time: "21:00", scope: "all", week: 1, dow: 2 }
        ],
        notices: [
          { id: "n1", pinned: true, date: todayStr(), title: "[필독] 수강 안내", body: "환영합니다! 매주 과제를 제출하고 자동검수 결과를 확인하세요.\n필수 과제를 모두 통과하면 수료증이 발급됩니다." }
        ],
        faqs: [
          { id: "q1", category: "수강 · 로그인", q: "로그인이 안 돼요.", a: "수강 신청 때 적은 이름과 휴대폰 번호 뒷자리 4자리로 로그인합니다. 승인 전이라면 강사님 승인을 기다려 주세요.", tags: ["로그인", "비밀번호", "승인"] },
          { id: "q2", category: "과제 · 수료", q: "과제는 언제까지 내야 하나요?", a: "주차가 열리고 6일 뒤가 과제 마감일입니다. 마감이 지나도 제출은 가능하지만 수료 전까지 필수 과제를 모두 통과해야 합니다.", tags: ["과제", "마감", "기한"] },
          { id: "q3", category: "라이브 · 강의", q: "라이브를 놓쳤어요.", a: "다시보기가 ‘라이브 다시보기’ 메뉴에 올라갑니다.", tags: ["라이브", "다시보기"] }
        ],
        guide: [
          { id: "g-1", title: "수업 캘린더 확인하기", desc: "라이브와 과제 마감일을 먼저 확인해 두세요.", url: "#/schedule" },
          { id: "g-2", title: "[필독] 공지 읽기", desc: "수강 방법이 정리돼 있어요.", url: "#/notices" },
          { id: "g-3", title: "1주차 첫 강의 보기", desc: "다 본 강의는 ‘시청 완료’로 표시해 주세요.", url: "#/curriculum" }
        ],
        docsGuide: [],
        resources: { ebook: [], file: [], vod: [], senior: [] },
        motivation: [],
        replays: [], showcase: [], glossary: [], notePrompts: [],
        quotes: ["오늘의 작은 실천이 더 큰 기회를 만듭니다"]
      };
    }

    // 홈 ‘자주 찾는 페이지’ — 강사가 따로 정하지 않았으면 기본 목록 (외부 링크는 주소가 있을 때만)
    const QL_ICONS = ["megaphone", "help", "clipboard", "bug", "sparkles", "play", "message", "book", "calendar", "library", "flame", "award", "link", "store", "users", "video", "layers"];
    // 윗줄 = 강의 플랫폼 안 메뉴(기본 색), 아랫줄 = 외부 링크(브랜드 색). color 를 주면 그 색 카드로 보인다
    function defaultQuickLinks(c) {
      const b = c.brand || {};
      return [
        { id: "ql1", title: "클래스 소식", desc: "최신 공지와 일정 안내", url: "#/notices", icon: "megaphone" },
        { id: "ql2", title: "FAQ 검색", desc: "수강 · 과제 · 수료 궁금증 모음", url: "#/qna", icon: "help" },
        { id: "ql3", title: "실무 체크리스트", desc: "1주차 서류 발급 단계별 안내", url: "#/docs", icon: "clipboard" },
        { id: "ql4", title: "1:1 요청", desc: "오류 · 불편을 강사님께 바로 알리기", url: "#/qna/requests", icon: "bug" },
        { id: "ql6", title: (b.instructor || "강사") + " 유튜브", desc: "실전 노하우 영상 모음", url: b.youtubeChannel || "", icon: "play", color: "#ff0000" },
        { id: "ql8", title: "네이버 카페", desc: "두고마켓 회원 게시판 · 정보 나눔", url: "https://cafe.naver.com/doogomarket", icon: "users", color: "#03c75a" },
        { id: "ql9", title: "두고커넥트", desc: "건강식품 제조 · OEM 파트너", url: "https://www.doogoconnect.com/", icon: "layers", color: "#0a5de2" },
        { id: "ql10", title: "두고푸드", desc: "전문 식품 도매몰 · 사업자 전용가", url: "https://www.doogofood.com/", icon: "store", color: "#f97316" }
      ];
    }
    // 과제 종류: 필수(수료 조건) · 도전 · 마인드. required 는 kind 와 항상 같게 맞춘다
    const MISSION_KINDS = [
      { key: "required", label: "필수 과제", short: "필수", hint: "수료 조건" },
      { key: "challenge", label: "도전 과제", short: "도전", hint: "하면 실력이 늘어요" },
      { key: "mind", label: "마인드 과제", short: "마인드", hint: "생각과 다짐을 정리해요" }
    ];
    const missionKind = (m) => (MISSION_KINDS.some((k) => k.key === m.kind) ? m.kind : m.required ? "required" : "challenge");
    function normalizeWeeks(weeks) {
      weeks.forEach((w, i) => {
        w.no = i + 1; w.lessons = w.lessons || []; w.missions = w.missions || []; w.topics = w.topics || [];
        w.missions.forEach((m) => { m.kind = missionKind(m); m.required = m.kind === "required"; m.templates = m.templates || []; });
      });
    }
    function normalizeContent(c) {
      c.weeks = c.weeks || [];
      normalizeWeeks(c.weeks);
      c.curricula = Array.isArray(c.curricula) ? c.curricula : [];
      c.curricula.forEach((cu) => { cu.weeks = cu.weeks || []; normalizeWeeks(cu.weeks); });
      ["schedule", "notices", "faqs", "docsGuide", "motivation", "quotes", "guide", "replays", "showcase", "glossary", "notePrompts"].forEach((k) => { c[k] = Array.isArray(c[k]) ? c[k] : []; });
      c.resources = Object.assign({ ebook: [], file: [], vod: [], senior: [] }, c.resources || {});
      c.pages = c.pages || {};
      if (!c.brand.theme) c.brand.theme = "lime";
      if (c.brand.botName === OLD_BOT_NAME(c.brand.instructor)) c.brand.botName = botNameOf(c.brand.instructor);
      [c.schedule, c.notices, c.faqs, c.docsGuide, c.motivation, c.guide, c.replays, c.showcase, c.glossary, c.notePrompts].forEach((list) => list.forEach((it) => { if (!it.id) it.id = uid("x"); }));
      c.showcase.forEach((x) => { x.images = x.images || []; });
      c.notices.forEach((n) => { n.images = n.images || []; });
      ["vod", "senior"].forEach((k) => c.resources[k].forEach((it) => { it.images = it.images || []; }));
      return c;
    }

    /** 체험 계정(1기 · 2기): 모든 강의 시청 · 모든 과제 강사 승인 · 서류 준비 완료 → 수료증까지 열린 기록
     *  (서버는 api/_lib/oneoff.js 의 fullProgress 가 같은 기록을 만든다) */
    function fullDemoProgress(data, st, c) {
      const co = data.cohorts.find((x) => x.id === st.cohortId);
      const cu = co && co.curriculumId && co.curriculumId !== "main" && (c.curricula || []).find((x) => x.id === co.curriculumId);
      const ins = data.instructors.find((x) => x.id === st.instructorId);
      const reviewer = { by: ((ins && ins.name) || "") + " 강사", byId: st.instructorId, role: "instructor" };
      const p = Object.assign(emptyProgress(), { guideV: 2 });
      const DAY = 86400000, start = Date.parse(((co && co.startDate) || "2026-08-01") + "T10:00:00+09:00");
      ((cu ? cu.weeks : c.weeks) || []).forEach((w, wi) => {
        const base = start + wi * 7 * DAY + DAY;
        (w.lessons || []).forEach((l, i) => { p.watched[l.id] = base + i * 600000; });
        (w.missions || []).forEach((m, i) => {
          const at = base + DAY + i * 3600000;
          p.submissions[m.id] = [{
            at,
            text: m.type === "text" ? m.title + " 과제를 마쳤습니다. 강의 내용대로 정리했어요." : "",
            link: m.type === "link" ? "https://" + ((m.check && m.check.linkHint) || "example.com") + "/sample-store" : "",
            files: m.type === "image" ? [{ type: "pdf", name: m.title + ".pdf" }] : [],
            result: { pass: true, reasons: [], ok: ["체험 계정"] },
            review: Object.assign({ status: "approved", comment: "", at: at + 7200000 }, reviewer)
          }];
        });
      });
      (c.docsGuide || []).forEach((g, i) => { p.docs[g.id] = start + i * 3600000; });
      (c.notices || []).forEach((n) => { p.readNotices[n.id] = start; });
      (c.guide || []).forEach((g) => { p.guide[g.id] = start; });
      return p;
    }
    function fromSeed() {
      const seed = clone(SEED());
      const data = { version: 3, instructors: seed.instructors, content: seed.content || {}, cohorts: seed.cohorts, students: seed.students, announcements: seed.announcements || [] };
      data.instructors.forEach((ins) => {
        if (!data.content[ins.id]) data.content[ins.id] = template(Object.assign({ instructor: ins.displayName }, ins.brand || {}));
        if (ins.brand && ins.brand.theme) data.content[ins.id].brand.theme = ins.brand.theme;
        if (ins.brand && ins.brand.photo) data.content[ins.id].brand.photo = ins.brand.photo;
        if (ins.brand && ins.brand.field) data.content[ins.id].brand.field = ins.brand.field;
        delete ins.brand;
        normalizeContent(data.content[ins.id]);
      });
      // 예시 제출 기록 (해당 학생 기록이 비어 있을 때만)
      const sample = seed.sampleProgress || {};
      Object.keys(sample).forEach((sid) => {
        if (store.get(KEY_PROGRESS + sid, null)) return;
        const s = sample[sid];
        const st = data.students.find((x) => x.id === sid);
        const c = st && data.content[st.instructorId];
        if (!c) return;
        const p = emptyProgress();
        if (s.all) { store.set(KEY_PROGRESS + sid, fullDemoProgress(data, st, c)); return; }
        const all = c.weeks.flatMap((w) => w.missions);
        const base = Date.now() - 86400000 * 2;
        (s.done || []).forEach((mid, i) => {
          const m = all.find((x) => x.id === mid);
          if (!m) return;
          p.submissions[mid] = [{
            at: base + i * 3600000,
            text: m.type === "text" ? "예시 제출: " + m.title + " 과제를 수행했습니다. 자세한 내용은 라이브에서 함께 확인하고 싶어요. 꼼꼼하게 정리해서 올립니다." : "",
            link: m.type === "link" ? "https://" + ((m.check && m.check.linkHint) || "example.com") + "/sample-store" : "",
            files: m.type === "image" ? [{ type: "pdf", name: m.title + ".pdf" }] : [],
            result: { pass: true, reasons: [], ok: ["예시 데이터"] }
          }];
        });
        (s.fix || []).forEach((mid) => {
          p.submissions[mid] = [{ at: base, text: "", link: "smartstore", files: [], result: { pass: false, reasons: ["http:// 또는 https:// 로 시작하는 올바른 링크를 입력해 주세요."], ok: [] } }];
        });
        if (s.question) {
          const q = s.question, at = Date.now() - 86400000 * (q.daysAgo || 0) - 3600000 * 3;
          p.questions.push({ id: uid("q"), category: q.category || "기타", title: q.title, body: q.body, images: [], at, answer: q.answer || "", answeredAt: q.answer ? at + 7200000 : 0 });
        }
        store.set(KEY_PROGRESS + sid, p);
      });
      return data;
    }

    // v2 → v3: 로그인 화면 문구(헤드라인·설명)와 FAQ 분류 추가
    function migrate2to3() {
      const db = ctx.db(); // db.js 의 지금 데이터 (공용 모듈로 옮기며 넘겨받아요)
      const seed = SEED();
      Object.keys(db.content).forEach((id) => {
        const c = db.content[id], b = c.brand;
        const sb = seed.content[id] && seed.content[id].brand;
        const tb = template({ name: b.name, instructor: b.instructor }).brand;
        ["loginEyebrow", "loginHeadline", "loginSub"].forEach((k) => { if (!b[k]) b[k] = (sb && sb[k]) || tb[k]; });
        delete b.loginPhrases; delete b.loginHeadlineSuffix;
        if (seed.content[id] && !(c.faqs || []).some((f) => f.category)) c.faqs = clone(seed.content[id].faqs);
        (c.faqs || []).forEach((f) => { if (!f.category) f.category = "기타"; });
      });
      db.version = 3;
      save();
    }

    function loadFixups() {
      const db = ctx.db(); // db.js 의 지금 데이터 (공용 모듈로 옮기며 넘겨받아요)
      Object.keys(db.content).forEach((id) => normalizeContent(db.content[id]));
      // 강사 공지(마스터 → 강사), 강사별 화면 색상 기본값
      if (!Array.isArray(db.announcements)) { db.announcements = clone(SEED().announcements || []); save(); }
      const seedIns = SEED().instructors;
      db.instructors.forEach((ins) => {
        const c = db.content[ins.id], si = seedIns.find((x) => x.id === ins.id);
        if (c && c.brand.theme === "lime" && !c.brand.themeSet && si && si.brand && si.brand.theme) { c.brand.theme = si.brand.theme; c.brand.themeSet = true; save(); }
        if (!ins.menu && si && si.menu) { ins.menu = clone(si.menu); save(); }
      });
      // '로직메이커 황금농부'로 붙어 있던 강사를 로직메이커 / 황금농부 두 강사로 나눈다
      const logic = db.instructors.find((x) => x.id === "logic");
      if (logic && logic.displayName === "로직메이커 황금농부") {
        const lb = db.content.logic && db.content.logic.brand;
        Object.assign(logic, { name: "로직메이커", displayName: "로직메이커" });
        if (lb) {
          ["name", "courseTitle", "loginHeadline", "botName"].forEach((k) => { if (lb[k]) lb[k] = lb[k].replace(/로직메이커 황금농부/g, "로직메이커"); });
          if (lb.instructor === "로직메이커 황금농부") lb.instructor = "로직메이커";
          lb.theme = "airtable"; lb.themeSet = true;
        }
        if (!db.instructors.some((x) => x.id === "farmer")) {
          const sf = seedIns.find((x) => x.id === "farmer");
          db.instructors.splice(db.instructors.indexOf(logic) + 1, 0, { id: "farmer", name: sf.name, phone4: sf.phone4, displayName: sf.displayName, status: "active", createdAt: sf.createdAt });
          db.content.farmer = normalizeContent(template(Object.assign({ instructor: sf.displayName }, sf.brand)));
          db.content.farmer.brand.theme = "binance"; db.content.farmer.brand.themeSet = true;
          SEED().cohorts.filter((c) => c.instructorId === "farmer" && !db.cohorts.some((x) => x.id === c.id)).forEach((c) => db.cohorts.push(clone(c)));
          SEED().students.filter((st) => st.instructorId === "farmer" && !db.students.some((x) => x.id === st.id)).forEach((st) => db.students.push(clone(st)));
        }
        save();
      }
      // 시작 가이드가 생기기 전 데이터면 기본 단계를 넣는다 (한 번만)
      db.flags = db.flags || {};
      if (!db.flags.guideSeeded) {
        Object.keys(db.content).forEach((id) => { const c = db.content[id], sc = SEED().content[id]; if (!c.guide.length) c.guide = clone(sc && sc.guide ? sc.guide : template({}).guide); if (c.brand.liveUrl === undefined) c.brand.liveUrl = ""; });
        db.flags.guideSeeded = true; save();
      }
      // 문대표 4기 홍보 페이지 문구를 4주 과정에 맞추기 (한 번만 · 강사가 고친 문구는 그대로)
      if (!db.flags.lp4w) {
        const L = db.content.moon && db.content.moon.landing, rep = (o, k, x, y) => { if (o && typeof o[k] === "string" && o[k].indexOf(x) >= 0) o[k] = o[k].replace(x, y); };
        if (L) { rep(L.hero, "sub", "첫 판매까지. 5주 동안", "첫 판매까지. 4주 동안"); rep(L.points, "title", "5주 동안 이렇게 바뀌어요", "4주 동안 이렇게 바뀌어요"); ((L.points || {}).items || []).forEach((it) => rep(it, "title", "4~5주차 · 판매 시작", "4주차 · 판매 시작")); rep(L.pricing, "period", "5주 과정 + 다시보기", "4주 과정 + 다시보기"); }
        db.flags.lp4w = true; save();
      }
      // 기수별 커리큘럼·강의 요일 예시 (한 번만): 문대표 4기 = 4주 압축 과정 · 매주 토 12:00
      if (!db.flags.curriculaSeeded) {
        const mc = db.content.moon, sm = SEED().content.moon;
        if (mc && !(mc.curricula || []).length && sm && sm.curricula) { mc.curricula = clone(sm.curricula); if (!mc.curriculumName) mc.curriculumName = sm.curriculumName; }
        SEED().cohorts.forEach((sc) => {
          const co = db.cohorts.find((x) => x.id === sc.id);
          if (!co) return;
          ["classDow", "classTime", "curriculumId"].forEach((k) => { if (co[k] === undefined && sc[k] !== undefined) co[k] = sc[k]; });
        });
        db.flags.curriculaSeeded = true; save();
      }
      // 커리큘럼 상세(부제·핵심 목표·강의 내용)와 과제 종류(필수·도전·마인드), 카카오톡 응대 가이드 본문 (한 번만)
      if (!db.flags.weekDetailSeeded) {
        Object.keys(db.content).forEach((id) => {
          const c = db.content[id], sc = SEED().content[id];
          if (!sc) return;
          const fill = (weeks, seedWeeks) => {
            const have = {};
            weeks.forEach((w) => w.missions.forEach((m) => { have[m.id] = true; }));
            weeks.forEach((w, i) => {
              const sw = seedWeeks[i];
              if (!sw || sw.title !== w.title) return;
              ["subtitle", "goal"].forEach((k) => { if (!w[k] && sw[k]) w[k] = sw[k]; });
              if (!(w.topics || []).length && sw.topics) w.topics = clone(sw.topics);
              sw.missions.forEach((sm) => {
                const m = w.missions.find((x) => x.id === sm.id);
                if (m) { m.kind = sm.kind; m.required = sm.kind === "required"; }
                else if (!have[sm.id]) w.missions.push(clone(sm));
              });
            });
          };
          fill(c.weeks, sc.weeks);
          (c.curricula || []).forEach((cu) => { const scu = (sc.curricula || []).find((x) => x.id === cu.id); if (scu) fill(cu.weeks, scu.weeks); });
          const g = (c.resources.senior || []).find((x) => x.id === "g4"), sg = (sc.resources.senior || []).find((x) => x.id === "g4");
          if (g && sg && /^스마트스토어 톡톡과 카카오톡 채널로 고객 문의에 답하는 기본 방법이에요/.test(g.body || "") && (g.body || "").length < 120) { g.body = sg.body; g.desc = sg.desc; }
        });
        db.flags.weekDetailSeeded = true; save();
      }
      // 과제 양식(엑셀) 예시 (한 번만): 시드에 양식이 있는 과제 id 에 비어 있으면 채운다
      if (!db.flags.templatesSeeded) {
        Object.keys(db.content).forEach((id) => {
          const c = db.content[id], sc = SEED().content[id];
          if (!sc) return;
          const seedT = {};
          sc.weeks.concat(...(sc.curricula || []).map((cu) => cu.weeks)).forEach((w) => w.missions.forEach((m) => { if ((m.templates || []).length) seedT[m.id] = m.templates; }));
          c.weeks.concat(...(c.curricula || []).map((cu) => cu.weeks)).forEach((w) => w.missions.forEach((m) => { if (!(m.templates || []).length && seedT[m.id]) m.templates = clone(seedT[m.id]); }));
        });
        db.flags.templatesSeeded = true; save();
      }
      // 자주 찾는 페이지 v2 (한 번만): AI봇 빼고 유튜브 · 네이버 카페 · 두고커넥트 · 두고푸드를 브랜드 색으로
      if (!db.flags.quickLinksV2) {
        Object.keys(db.content).forEach((id) => {
          const c = db.content[id];
          if (!Array.isArray(c.quickLinks)) return;
          const defs = defaultQuickLinks(c);
          c.quickLinks = c.quickLinks.filter((l) => !(l.id === "ql5" && l.url === "#/bot") && !(l.id === "ql7" && !l.url));
          c.quickLinks.forEach((l) => { const d = defs.find((x) => x.id === l.id); if (d && d.color && !l.color) l.color = d.color; });
          defs.filter((d) => d.color && !c.quickLinks.some((l) => l.id === d.id || (l.url && l.url === d.url))).forEach((d) => c.quickLinks.push(d));
        });
        db.flags.quickLinksV2 = true; save();
      }
      // 문대표는 뉴질랜드 건기식 강의라 한국 · 뉴질랜드 시간을 기본으로 켠다 (한 번만)
      if (!db.flags.worldClockSeeded) {
        const mb = db.content.moon && db.content.moon.brand;
        if (mb && mb.worldClock === undefined) mb.worldClock = true;
        db.flags.worldClockSeeded = true; save();
      }
      // 1:1 소통채널 예시 (한 번만): 시드에 채널이 있는 강사(문대표)만 채운다
      if (!db.flags.channelsSeeded) {
        Object.keys(db.content).forEach((id) => { const sc = SEED().content[id]; if (sc && sc.channels && !Array.isArray(db.content[id].channels)) db.content[id].channels = clone(sc.channels); });
        db.flags.channelsSeeded = true; save();
      }
      // 로그인 화면에 안내된 체험 계정(문대표 · 이수진 2186)은 잠긴 화면도 미리보기로 열어 볼 수 있게 표시 (한 번만)
      if (!db.flags.demoSeeded) {
        const s1 = db.students.find((x) => x.instructorId === "moon" && x.name === "이수진" && x.phone4 === "2186");
        if (s1) s1.demo = true;
        db.flags.demoSeeded = true; save();
      }
      // 문대표 1:1 소통채널을 두고바이오(제조 상담) · 제조 입금 후 개별 카톡방으로 교체 (한 번만, 예전 예시를 그대로 둔 경우만)
      if (!db.flags.channelsV2) {
        const mc = db.content.moon, sc = SEED().content.moon;
        const OLD = ["문대표 오픈채팅방", "카카오톡 1:1 상담", "이메일 문의"];
        if (mc && sc && Array.isArray(mc.channels) && mc.channels.every((ch) => OLD.indexOf(ch.title) !== -1)) mc.channels = clone(sc.channels);
        db.flags.channelsV2 = true; save();
      }
      // 문대표 1:1 소통채널: 두고푸드(도매몰) 추가 + 카드마다 다른 아이콘 · 색 (한 번만)
      if (!db.flags.channelsV3) {
        const mc = db.content.moon, sc = SEED().content.moon;
        if (mc && sc && Array.isArray(mc.channels)) {
          sc.channels.forEach((sch) => {
            const cur = mc.channels.find((x) => x.id === sch.id);
            if (cur) { if (!cur.icon) cur.icon = sch.icon; if (!cur.color) cur.color = sch.color; }
            else if (sch.id === "ch-food" && mc.channels.some((x) => x.id === "ch-bio")) mc.channels.push(clone(sch));
          });
        }
        db.flags.channelsV3 = true; save();
      }
      // 문대표: 메인 강의는 아이비클래스 · 두잉고는 따라하기 영상 + 보충 강의 (시드 그대로인 것만 바꿈)
      if (!db.flags.mainLecV1) {
        const mc = db.content.moon, sc = SEED().content.moon;
        if (mc && mc.brand && sc) {
          if (!mc.brand.mainLec && sc.brand.mainLec) mc.brand.mainLec = clone(sc.brand.mainLec);
          if (!mc.brand.lessonLabel && sc.brand.lessonLabel) mc.brand.lessonLabel = sc.brand.lessonLabel;
          const sw = (sc.weeks || [])[0];
          if (sw && sw.howto) [mc.weeks].concat((mc.curricula || []).map((x) => x.weeks)).forEach((ws) => { const w = (ws || []).find((x) => x.no === 1); if (w && !w.howto && w.title === sw.title) w.howto = sw.howto; });
          const RP = { "rp-1": "1주차 라이브 Q&A · 사업자등록부터 영업등록까지", "rp-2": "2주차 라이브 Q&A · 주력 상품 고르기와 마진 계산" };
          (mc.replays || []).forEach((x) => { const s0 = (sc.replays || []).find((y) => y.id === x.id); if (s0 && RP[x.id] === x.title) { x.title = s0.title; x.minutes = s0.minutes; } });
          const g1 = (mc.guide || []).find((x) => x.id === "g-1" && x.desc === "라이브 Q&A와 과제 마감일을 먼저 확인해 두세요.");
          if (g1) g1.desc = "오프라인 강의일과 과제 마감일을 먼저 확인해 두세요.";
          if (db.instructors.some((x) => x.id === "moon")) { const it = menuConfig("moon").items.find((x) => x.key === "replays"); if (it && !it.label) it.label = "보충 강의"; }
        }
        db.flags.mainLecV1 = true; save();
      }
      if (!db.flags.calMoonV1) {
        const mc = db.content.moon, sc = SEED().content.moon;
        if (mc && mc.brand && sc) {
          if (!mc.brand.cal && sc.brand.cal) mc.brand.cal = clone(sc.brand.cal);
          const OLD = { e1: "1주차 Q&A 라이브", e2: "2주차 Q&A 라이브", e3: "3주차 Q&A · 상세페이지 첨삭", e4: "4주차 Q&A 라이브", e6: "수료식 · 성과 발표", e7: "수입식품 위생교육 신청 안내" };
          mc.schedule = (mc.schedule || []).filter((e) => !(OLD[e.id] && OLD[e.id] === e.title));
          const e5 = mc.schedule.find((e) => e.id === "e5" && e.title === "첫 상품 등록 7일 챌린지 시작");
          if (e5) e5.title = "첫 상품 등록 7일 챌린지 강의";
          (sc.schedule || []).forEach((x) => { if (/^b\d$/.test(x.id) && !mc.schedule.some((e) => e.id === x.id)) mc.schedule.push(clone(x)); });
        }
        db.flags.calMoonV1 = true; save();
      }
      if (!db.flags.nzTheme) {
        const mb = db.content.moon && db.content.moon.brand;
        if (mb) mb.theme = "nz";
        db.flags.nzTheme = true; save();
      }
      // 코치 예시 (한 번만): 시드에 코치가 있는 강사(문대표)에 코치가 없으면 넣는다
      if (!db.flags.coachesSeeded) {
        SEED().instructors.forEach((si) => { const ins = db.instructors.find((x) => x.id === si.id); if (ins && si.coaches && !(ins.coaches || []).length) ins.coaches = clone(si.coaches); });
        db.flags.coachesSeeded = true; save();
      }
      // 무료강의 페이지 기본 문구 (한 번만, doogo.site 내용)
      if (!db.flags.freeSeeded2) {
        // doogo.site 와 같은 화면으로 바꾸면서 기본 내용을 새로 넣는다 (한 번만)
        Object.keys(db.content).forEach((id) => { const sc = SEED().content[id]; if (sc && sc.freeClass) db.content[id].freeClass = clone(sc.freeClass); });
        db.flags.freeSeeded = db.flags.freeSeeded2 = true; save();
      }
      // 무료강의 첫 화면 배지 문구: '…전용 선물' → '…전용 선물 제공' (한 번만, 고쳐 쓴 문구는 그대로)
      if (!db.flags.freeBadgeV2) {
        Object.keys(db.content).forEach((id) => { const h = db.content[id].freeClass && db.content[id].freeClass.hero; if (h && h.badge === "무료강의 신청자 전용 선물") h.badge = "무료강의 신청자 전용 선물 제공"; });
        db.flags.freeBadgeV2 = true; save();
      }
      // 홍보 랜딩페이지 기본 문구 (한 번만)
      if (!db.flags.landingSeeded) {
        Object.keys(db.content).forEach((id) => { const sc = SEED().content[id]; if (!db.content[id].landing && sc && sc.landing) db.content[id].landing = clone(sc.landing); });
        db.flags.landingSeeded = true; save();
      }
      // 없어진 색(잠깐 적용됐던 클릭하우스 등)이 저장돼 있으면 라임으로 되돌린다
      Object.keys(db.content).forEach((id) => { const b = db.content[id].brand; if (b.theme && !THEMES[b.theme]) { b.theme = "lime"; save(); } });
      // 자료실 영상에 본문·첨부파일 필드가 생기기 전 데이터면 기본값을 채운다
      let filled = false;
      Object.keys(db.content).forEach((id) => {
        const sc = SEED().content[id];
        ["vod", "senior"].forEach((k) => (db.content[id].resources[k] || []).forEach((it) => {
          if (it.body === undefined) {
            const seedIt = sc && (sc.resources[k] || []).find((x) => x.id === it.id);
            it.body = (seedIt && seedIt.body) || "";
            it.attachments = (seedIt && clone(seedIt.attachments || [])) || [];
            filled = true;
          }
          if (!Array.isArray(it.attachments)) it.attachments = [];
        }));
      });
      if (filled) save();
      // 잠깐 적용됐던 '두고캠퍼스' 문구가 저장된 브라우저는 원래 문구로 되돌린다
      let renamed = false;
      Object.keys(db.content).forEach((id) => {
        const b = db.content[id].brand;
        if (b.loginEyebrow && /^DOOGO CAMPUS/.test(b.loginEyebrow)) { b.loginEyebrow = b.loginEyebrow.replace(/^DOOGO CAMPUS/, "DOINGGO"); renamed = true; }
      });
      if (renamed) save();
      // 강사 프로필 사진 · 강의 분야(첫 화면 강사 카드)가 생기기 전에 저장된 브라우저는 기본값을 채운다 (한 번만 · 서버는 일회성 작업이 맡음)
      if (!R.on && !db.flags.profileSeeded) {
        Object.keys(db.content).forEach((id) => {
          const b = db.content[id].brand, sb = (SEED().content[id] || {}).brand || {};
          if (!b.photo && sb.photo) b.photo = sb.photo;
          if (!b.field && sb.field) b.field = sb.field;
        });
        db.flags.profileSeeded = true; save();
      }
      // 로직메이커 · 황금농부 프로필 사진 (사진이 비어 있을 때만 · 한 번만)
      // 메뉴 이름을 두고 클래스 표현으로 바꾸면서, 예전 이름이 들어간 기본 문구도 함께 (한 번만 · 이 브라우저 데이터)
      if (!R.on && !db.flags.menuNamesV15) {
        Object.keys(db.content).forEach((id) => renameContentPhrases(db.content[id]));
        // 새 메뉴 예시: 비어 있을 때만 시드 내용으로. 용어 사전은 어디서나, 라이브 다시보기 · 모범 과제 예시는 브라우저 체험(로컬)에서만
        // (서버 배포 때 ‘기본값 채우기’도 이 코드를 돌리므로, 운영 데이터에는 체험용 영상 · 사진이 들어가지 않게 한다)
        const demo = typeof document !== "undefined" ? ["glossary", "replays", "showcase"] : ["glossary"];
        Object.keys(db.content).forEach((id) => { const sc = SEED().content[id], c = db.content[id]; if (sc) demo.forEach((k) => { if (Array.isArray(sc[k]) && sc[k].length && !(c[k] || []).length) c[k] = clone(sc[k]); }); });
        db.instructors.forEach((ins) => menuConfig(ins.id));
        db.flags.menuNamesV15 = true; save();
      }
      // 로직메이커 → 부알남 (대표님 요청 · 이 브라우저 데이터 · 한 번만). 로그인 이름(name)은 그대로. 서버는 api/_lib/oneoff.js 가 같은 일을 한다
      if (!R.on && typeof document !== "undefined" && !db.flags.bualnamV1) {
        const li = db.instructors.find((x) => x.id === "logic"), lc = db.content.logic;
        if (li && li.displayName === "로직메이커") li.displayName = "부알남";
        if (li && li.brand) renameWord(li.brand, /로직메이커/g, "부알남");
        if (lc) renameWord(lc, /로직메이커/g, "부알남");
        db.flags.bualnamV1 = true; save();
      }
      // 황금농부 → 갓농부 + 강의 분야 ‘귤 단 하나 팔아 월매출 10억’ (대표님 요청 · 이 브라우저 데이터 · 한 번만). 로그인 이름(name)은 그대로. 서버는 api/_lib/oneoff.js
      if (!R.on && typeof document !== "undefined" && !db.flags.godFarmerV1) {
        const fi = db.instructors.find((x) => x.id === "farmer"), fc = db.content.farmer;
        if (fi && fi.displayName === "황금농부") fi.displayName = "갓농부";
        if (fc) { renameWord(fc, /황금농부/g, "갓농부"); if (fc.brand && !fc.brand.field) fc.brand.field = "귤 단 하나 팔아 월매출 10억"; }
        db.flags.godFarmerV1 = true; save();
      }
      // 빠른 이동 ‘두고푸드’ 설명 (대표님 요청 · 이 브라우저 데이터 · 한 번만, 예전 기본 문구일 때만)
      if (!R.on && typeof document !== "undefined" && !db.flags.foodDescV2) {
        Object.keys(db.content).forEach((id) => (Array.isArray(db.content[id].quickLinks) ? db.content[id].quickLinks : []).forEach((l) => { if (l.id === "ql10" && l.desc === "식품 도매몰 · 사업자 전용가") l.desc = "전문 식품 도매몰 · 사업자 전용가"; }));
        db.flags.foodDescV2 = true; save();
      }
      if (!R.on && !db.flags.profileSeeded2) {
        (SEED().instructors || []).forEach((si) => {
          const c = db.content[si.id];
          if (c && c.brand && si.brand && si.brand.photo && !c.brand.photo) c.brand.photo = si.brand.photo;
        });
        db.flags.profileSeeded2 = true; save();
      }
      // 초이 프로필 사진 추가 (이미 위 단계를 지난 브라우저에도 한 번만 · 비어 있을 때만)
      if (!R.on && !db.flags.profileSeeded3) {
        (SEED().instructors || []).forEach((si) => {
          const c = db.content[si.id];
          if (c && c.brand && si.brand && si.brand.photo && !c.brand.photo) c.brand.photo = si.brand.photo;
        });
        db.flags.profileSeeded3 = true; save();
      }
      return db;
    }

    /* ---------------- 강사 소개 페이지 (#/p/<강사>) ----------------
     * 어떤 강사가 어떤 강의를 하는지 궁금하게 만드는 페이지. ‘신청하기’는 모두 applyUrl(오픈채팅 · 신청 폼) 하나로 새 창.
     * 예전 커리큘럼 · 수강 안내(가격 카드 + 수업 캘린더) 칸은 없앴고, 저장돼 있어도 보이지 않아요 */
    const LANDING_SECTIONS = [
      { key: "hero", label: "첫 화면 (헤드라인)" }, { key: "video", label: "강사 영상 (유튜브)" }, { key: "about", label: "강사 소개" }, { key: "stats", label: "숫자로 보는 강사" },
      { key: "points", label: "배우는 것 · 추천 대상" }, { key: "platform", label: "수강생 전용 플랫폼" },
      { key: "reviews", label: "수강 후기" }, { key: "faq", label: "자주 묻는 질문" }, { key: "cta", label: "마지막 신청 안내" }
    ];
    /** 저장된 랜딩 내용 + 비어 있는 칸은 강의 정보로 채운 기본값 */
    function landingOf(insId) {
      const c = content(insId), ins = instructor(insId);
      if (!c || !ins) return null;
      const b = c.brand, L = clone(c.landing || {});
      const def = {
        published: true, applyUrl: "",
        order: LANDING_SECTIONS.map((x) => x.key), off: {},
        hero: { eyebrow: b.loginEyebrow || "DOINGGO", title: b.loginHeadline || b.courseTitle, sub: b.loginSub || b.tagline || "", ctaLabel: "수강 신청하기", ctaUrl: "", image: "" },
        stats: [],
        about: { title: "강사 소개", name: b.instructor || ins.displayName, role: b.courseTitle, body: "", photo: "", career: [], video: "", videoTitle: "" },
        points: { title: "이 강의에서 얻어 가는 것", items: [
          { title: "매주 하나씩, 실습 과제", desc: "강의를 듣고 끝나는 게 아니라 매주 과제를 직접 해내며 결과를 만들어요." },
          { title: "제출 즉시 자동 검수", desc: "과제를 올리면 바로 확인 결과가 나오고, 강사가 한 번 더 봐 드려요." },
          { title: "라이브 Q&A", desc: "막히는 부분은 정해진 시간에 강사에게 직접 물어볼 수 있어요." },
          { title: "수료증 발급", desc: "필수 과제를 모두 마치면 이름이 새겨진 수료증을 드려요." }
        ], forWho: [] },
        curriculum: { title: "커리큘럼", sub: "주차별로 강의를 듣고 과제를 해내면 끝까지 갈 수 있어요." },
        platform: { title: "결제하면 바로 열리는 수강생 전용 학습 공간", sub: "강의 영상, 과제 제출, 일정, 자료함, AI 조교까지 한 곳에서 이어서 공부해요." },
        reviews: { title: "먼저 들은 수강생 이야기", items: [] },
        pricing: { title: "수강 안내", price: "", original: "", period: "", includes: [], ctaLabel: "수강 신청하기", ctaUrl: "", note: "" },
        faq: { title: "자주 묻는 질문", items: [] },
        cta: { title: "지금 시작하면, 몇 주 뒤의 내가 달라져 있어요", sub: b.courseTitle, label: "수강 신청하기", url: "" },
        contact: { kakao: b.kakaoChannel || "", youtube: b.youtubeChannel || "", instagram: "", email: "", phone: "", company: "" }
      };
      const out = Object.assign({}, def, L);
      ["hero", "about", "points", "curriculum", "platform", "reviews", "pricing", "faq", "cta", "contact"].forEach((k) => { out[k] = Object.assign({}, def[k], L[k] || {}); });
      out.off = Object.assign({}, L.off || {});
      out.order = (L.order || []).filter((k) => LANDING_SECTIONS.some((x) => x.key === k));
      // 새로 생긴 ‘강사 영상’은 저장된 순서가 있어도 첫 화면 바로 아래로
      if (out.order.length && out.order.indexOf("video") === -1) { const h = out.order.indexOf("hero"); out.order.splice(h < 0 ? 0 : h + 1, 0, "video"); }
      LANDING_SECTIONS.forEach((x) => { if (out.order.indexOf(x.key) === -1) out.order.push(x.key); });
      return out;
    }

    /* ---------------- 무료강의 페이지 (doogo.site 형식: 카운트다운 · 사전 질문 · 선물 전자책 · 오픈채팅 · 강의 안내) ---------------- */
    const FREE_SECTIONS = [
      { key: "countdown", label: "강의 일정 · 카운트다운" }, { key: "intro", label: "대표 영상 (첫 화면 바로 아래 크게)" }, { key: "videos", label: "YouTube 영상 (좌 · 가운데 · 우)" }, { key: "question", label: "사전 미션 · 질문 남기기 버튼" },
      { key: "gifts", label: "선물 전자책 (공개일에 자동으로 열림)" }, { key: "bonus", label: "참여자 전원 증정 혜택 (01~08)" }, { key: "kakao", label: "카카오톡 오픈채팅" },
      { key: "live", label: "진행 예정 강의 (썸네일 · 신청 링크)" }, { key: "faq", label: "자주 묻는 질문" }
    ];
    /** 아직 무료강의 페이지를 만들지 않은 강사: 문대표 페이지와 같은 구성(선물 전자책 3권 · 질문 · 진행 예정 강의)으로 시작.
     *  날짜는 오늘 기준으로 잡히고, 강사센터 ‘무료강의 페이지’에서 한 번 저장하면 그때부터 강사 것으로 고정된다 */
    function freeStarter(c, ins) {
      const inst = c.brand.instructor || ins.displayName;
      const seed = (((SEED().content || {}).moon || {}).freeClass || {}).gifts || {};
      const color = (i, d) => ((seed.items || [])[i] || {}).color || d;
      return {
        published: true,
        hero: { badge: "무료강의 신청자 전용 선물 제공", instructor: inst, sub: "강의 시작 전, 신청자에게만 실전 자료 3권을 순서대로 열어드립니다.", note: "본 강의는 교육 목적이며 결과는 실행 환경과 노력에 따라 달라질 수 있습니다." },
        gifts: { kicker: "BEFORE THE CLASS", title: "강의 전, 선물 전자책 3권", desc: "공개일이 되면 잠금이 자동으로 풀리고, 표지를 누르면 전자책이 열려요.", items: [
          { title: inst + "의 시작 가이드", desc: "강의 전에 알아 두면 좋은 기본 개념과 준비할 것을 정리했습니다.", openAt: todayStr() + "T09:00", forceOpen: true, url: "", color: color(0, "blue") },
          { title: "[전자책] 실전 체크리스트", desc: "처음 시작할 때 놓치기 쉬운 단계를 순서대로 확인할 수 있게 정리했습니다.", openAt: addDays(todayStr(), 7) + "T19:30", url: "", color: color(1, "cyan") },
          { title: "[전자책 & VOD] 핵심 요약편", desc: "무료강의에서 다룰 핵심 내용을 한 권으로 미리 만나 보세요.", openAt: addDays(todayStr(), 13) + "T19:30", url: "", color: color(2, "ice") }
        ] },
        live: { desc: "무료강의 신청을 완료하고, " + inst + "의 실전 노하우를 라이브로 확인하세요.", summary: "처음 시작하는 분도 따라올 수 있도록 실제 사례와 함께 순서대로 알려드립니다.",
          points: ["처음 시작하는 분도 이해할 수 있는 전체 흐름", "실제 사례로 보는 실전 노하우", "강의가 끝나고 바로 실행할 수 있는 체크리스트"] }
      };
    }
    function freeOf(insId) {
      const c = content(insId), ins = instructor(insId);
      if (!c || !ins) return null;
      const b = c.brand, F = clone(c.freeClass || (insId !== "moon" ? freeStarter(c, ins) : {}));
      const live = addDays(todayStr(), 14) + "T19:30";
      const def = {
        published: false,
        order: FREE_SECTIONS.map((x) => x.key), off: {},
        hero: { badge: "무료강의 신청자 전용 선물 제공", instructor: b.instructor || ins.displayName, title: (b.loginHeadline || b.courseTitle || "").replace(/\n/g, "\n"), sub: "강의 시작 전, 신청자에게만 실전 자료를 순서대로 열어드립니다.", note: "본 강의는 교육 목적이며 결과는 실행 환경과 노력에 따라 달라질 수 있습니다." },
        liveAt: live,
        question: { badge: "강의 전 필수 · 1분 소요", title: (b.instructor || "강사") + "에게 직접 묻고 싶은 게 있으신가요?", desc: "강의 전에 궁금한 내용을 미리 정리해 보세요. 지금 남겨두시면 내 상황에 맞는 질문을 놓치지 않을 수 있어요.", promise: "지금 남겨 주시면 무료강의 때 그 질문을 토대로 최대한 답변해 드릴 수 있도록 하겠습니다.", label: "내 질문 남기러 가기", url: "", note: "질문을 남긴 뒤 무료강의 신청 페이지로 이동할 수 있어요" },
        gifts: { kicker: "BEFORE THE CLASS", title: "강의 전, 선물 전자책", desc: "공개일이 되면 잠금이 자동으로 풀리고, 표지를 누르면 전자책이 열려요.", items: [] },
        videos: { kicker: "WATCH BEFORE THE CLASS", title: "강의 전에, " + (b.instructor || "강사") + "의 실전 이야기를 먼저 만나보세요", desc: "좌우 영상을 넘기면 다양한 인터뷰와 실제 운영 이야기를 볼 수 있어요.", items: [] },
        intro: { kicker: "WATCH FIRST", title: "영상으로 먼저 만나보세요", desc: "", youtube: "", caption: "눌러서 바로 재생 · 소리를 켜고 들어 보세요" },
        bonus: { kicker: "FOR EVERYONE", title: "무료강의 참여자 *전원 증정* 혜택", desc: "강의에 참여하시면 아래 자료를 전부 받아 가실 수 있어요.", badge: "🎁 톡방 참여자 전원 공개 예정 🎁", items: [], note: "위 자료는 무료강의 당일, 톡방 참여자 전원에게 공개됩니다." },
        about: { title: "강사 소개", name: b.instructor || ins.displayName, role: b.courseTitle, body: "", photo: "", career: [] },
        faq: { kicker: "FAQ", title: "자주 묻는 질문", items: [
          { q: "무료강의는 어디서 듣나요?", a: "‘진행 예정 강의’의 신청 버튼으로 신청하면, 강의 날짜에 맞춰 라이브 입장 안내를 보내 드려요." },
          { q: "선물 전자책은 어떻게 받나요?", a: "이 페이지에서 공개일이 되면 잠금이 자동으로 풀려요. 표지를 누르면 전자책이 열려요." },
          { q: "처음인데 들어도 될까요?", a: "네. 처음 시작하는 분도 따라올 수 있게 순서대로 설명해 드려요." },
          { q: "궁금한 점은 어디에 물어보나요?", a: "‘질문 남기기’로 미리 남기시거나 카카오톡 오픈채팅방에서 편하게 물어보세요." }
        ] },
        apply: { badge: "지금 신청하면 선물이 열려요", title: "무료강의, 지금 신청하세요", desc: "신청한 분께만 강의 링크와 선물 전자책을 보내 드려요.", price: "", original: "", includes: [], label: "무료강의 신청하기", url: "", note: "비우면 ‘진행 예정 강의’의 신청 링크로 연결돼요." },
        kakao: { badge: "💬 궁금한 점이 있으신가요?", title: "궁금한 점은 카카오톡 오픈채팅방에서 편하게 물어보세요", desc: "강의 전 궁금한 내용이나 미리 확인하고 싶은 부분이 있다면 자유롭게 남겨주세요.\n확인 후 하나씩 답변드리겠습니다.", label: "카카오톡 오픈채팅방 입장하기", url: b.kakaoChannel || "", note: "간단한 질문도 괜찮습니다 │ 편하게 참여해주세요" },
        live: { kicker: "UPCOMING LIVE CLASS", title: "진행 예정인 강의", desc: "무료강의 신청을 완료하고, 실제 노하우를 라이브로 확인하세요.", tag: "무료 LIVE 강의", platform: "", platformLogo: "", image: "", liveTitle: "", summary: "", points: [], label: "무료강의 신청하기", url: "", note: "신청 페이지는 새 창에서 열립니다." },
        company: ""
      };
      const out = Object.assign({}, def, F);
      ["hero", "question", "gifts", "videos", "intro", "bonus", "kakao", "about", "live", "faq", "apply"].forEach((k) => { out[k] = Object.assign({}, def[k], F[k] || {}); });
      out.off = Object.assign({}, F.off || def.off);
      // 강사 소개는 ‘강의 소개 페이지’에 적어 둔 내용을 기본으로 가져온다
      if (!F.about && c.landing && c.landing.about) out.about = Object.assign({}, def.about, c.landing.about);
      out.order = (F.order || []).filter((k) => FREE_SECTIONS.some((x) => x.key === k));
      // 예전에 순서를 저장해 둔 페이지: 새 ‘대표 영상’ 칸은 맨 위(카운트다운 바로 다음)에 넣어요
      if (out.order.length && out.order.indexOf("intro") === -1) { const c0 = out.order.indexOf("countdown"); out.order.splice(c0 < 0 ? 0 : c0 + 1, 0, "intro"); }
      // 새 ‘참여자 전원 증정 혜택’ 칸은 카카오톡 오픈채팅 바로 앞에 (톡방 참여자에게 공개되는 자료라서)
      if (out.order.length && out.order.indexOf("bonus") === -1) { const k0 = out.order.indexOf("kakao"); out.order.splice(k0 < 0 ? out.order.length : k0, 0, "bonus"); }
      FREE_SECTIONS.forEach((x) => { if (out.order.indexOf(x.key) === -1) out.order.push(x.key); });
      return out;
    }

    /** 이 기기에 저장된 데이터로 시작하기 (db.js load() 의 순서 그대로): 저장된 데이터 → v2 면 v3 로 → 없거나 모양이 다르면 처음 데이터(저장) → 빠진 기본값 채우기
     *  서버(처음 데이터 · 정리)도 같은 순서로 불러요 — ctx.setDb 로 지금 데이터를 바꿔요 */
    function loadLocal(saved) {
      ctx.setDb(saved);
      const d = ctx.db();
      if (d && d.version === 2 && Array.isArray(d.instructors)) migrate2to3();
      const d2 = ctx.db();
      if (!d2 || d2.version !== 3 || !Array.isArray(d2.instructors)) { ctx.setDb(fromSeed()); save(); }
      return loadFixups();
    }

    return { LANDING_SECTIONS, landingOf, FREE_SECTIONS, freeStarter, freeOf, THEMES, themeOf, STUDENT_MENUS, OLD_MENU_LABELS, botNameOf, OLD_BOT_NAME, RENAME_PHRASES, QL_RENAME, renameWord, renameContentPhrases, NOTE_PROMPTS, LIB_MENUS, CUSTOM_ICONS, VOD_MENUS, VOD_LIVE_ONLY, VOD_LABEL, splitMid, menuConfig, vodMenuConfig, isCustom, menuOn, libOn, template, QL_ICONS, defaultQuickLinks, MISSION_KINDS, missionKind, normalizeWeeks, normalizeContent, fullDemoProgress, fromSeed, migrate2to3, loadFixups, loadLocal, emptyProgress };
  }
  return { make, emptyProgress, KEY_PROGRESS };
});
