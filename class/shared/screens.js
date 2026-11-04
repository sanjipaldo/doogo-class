/* React 로 옮긴 화면 목록 (Next.js 전환 4-4 ~ 6단계 · 2026-11)
 * 화면을 하나씩 React(Next.js)로 새로 만들고, 다 만든 화면만 켜요. 꺼져 있으면 예전 화면(index.html) 그대로예요.
 *  · 서버(proxy.js): 켜진 화면 주소를 React 화면(/n/…)으로 넘겨요 (주소창은 그대로)
 *  · 화면(main.js): 다른 화면으로 옮겨 갈 때 React 화면 ↔ 예전 화면이 바뀌면 페이지를 새로 불러요
 * 켜고 끄기 (둘 다 같은 규칙):
 *  · 모두: Vercel 환경 변수 DC_NEXT = all · 몇 개만: DC_NEXT = vod-my,vod-login (쉼표) · 하나만 끄기: DC_NEXT_OFF = vod-my
 *  · 이 브라우저만: 아무 주소 뒤에 ?dc_next=all (켜기) · ?dc_next=off (모두 끄기) · ?dc_next=vod-my — 쿠키 dc_next 로 기억해요
 * 화면 주소는 깨끗한 주소(/vod/my) 기준이에요. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DC_SCREENS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // [키, 주소 규칙, 설명, { pub: 검색 · 공유용 공개 화면 — 서버가 미리보기 정보(제목 · 설명 · 사진 · 검색용 안내 글)를 넣어요 }]
  const LIST = [
    // 마이페이지: 메뉴 전부 (홈 · 강의장 · 구매 · 활동 · 계정)
    ["vod-my", /^\/vod\/my(\/(classes|free|vod|addons|ebooks|live|alarm|likes|pending|orders|ship|coupons|points|reviews|posts|badges|account|devices|help))?\/?$/, "두고클래스 마이페이지 (메뉴 전부)"],
    // 두고클래스 로그인 · 회원가입 · 두잉고 VOD 강의실 고르기
    ["vod-auth", /^\/vod\/(login|signup|dg)\/?$/, "두고클래스 로그인 · 회원가입 · 두잉고 VOD 강의실 고르기"],
    // 주문 확인 (결제 · 신청 · 입금 대기 완료)
    ["vod-order", /^\/vod\/order\/[^/]+\/?$/, "두고클래스 주문 확인"],
    // 주문 · 결제 (수강권 · 1:1 코칭권 · TEA TIME · 종이책 · 무료 신청)
    ["vod-checkout", /^\/vod\/checkout\/[^/]+\/?$/, "두고클래스 주문 · 결제"],
    // VOD 강의실 · 전자책 · LIVE · 오프라인 입장 안내
    ["vod-learn", /^\/vod\/learn\/[^/]+(\/[^/]+)?\/?$/, "두고클래스 VOD 강의실 · 전자책 · 입장 안내"],
    // 약관 · 정책 (공개 화면)
    ["vod-legal", /^\/((terms|privacy|refund)|vod\/legal\/(terms|privacy|refund))\/?$/, "약관 및 정책 (이용약관 · 개인정보처리방침 · 환불정책)", { pub: true }],
    // 강사진 · 강사 페이지 (공개 화면)
    ["vod-teachers", /^\/vod\/teachers(\/[^/]+)?\/?$/, "강사진 · 강사 페이지", { pub: true }],
    // 클래스 목록: 전체 클래스 · 분야 · 오픈 예정 · BEST · 새로 열린 · 무료 특강 · 검색 (공개 화면)
    ["vod-list", /^\/vod\/(c(\/[^/]+)?|search)\/?$/, "클래스 목록 · 분야 · 오픈 예정 · 검색", { pub: true }],
    // DOOGO CLASS 소개 · 두고 파트너스 (강사 모집) · 지원서 (공개 화면)
    ["vod-about", /^\/vod\/about\/?$/, "DOOGO CLASS 소개", { pub: true }],
    ["vod-partners", /^\/vod\/partners(\/apply)?\/?$/, "두고 파트너스 · 지원서", { pub: true }],
    // 스토어 홈 (대표 주소 / · /vod — 공개 화면)
    ["vod-home", /^\/(vod\/?)?$/, "스토어 홈", { pub: true }],
    // 클래스 상세 (공개 화면 — 클래스마다 제목 · 설명 · 사진 미리보기)
    ["vod-product", /^\/vod\/p\/[^/]+\/?$/, "클래스 상세", { pub: true }],
    // 두잉고 강의실 (5단계 · 로그인한 수강생 · 검색 제외) — 홈
    ["dg-home", /^\/home\/?$/, "두잉고 강의실 홈 (기수 · VOD 버전)"],
    // 강의(커리큘럼 · 강의 한 편) · 과제(전체 · 종류별 · 주차 · 과제 하나 제출)
    ["dg-learn", /^\/(curriculum(\/[^/]+)?|missions(\/\d+(\/[^/]+)?)?)\/?$/, "두잉고 강의실 강의 · 과제"],
    // 일정 · 공지 · Q&A(FAQ · 1:1 요청 · 코칭 질문)
    ["dg-board", /^\/(schedule|notices(\/[^/]+)?|qna(\/requests(\/[^/]+)?)?)\/?$/, "두잉고 강의실 일정 · 공지 · Q&A"]
  ];
  const KEYS = LIST.map((x) => x[0]);
  const parse = (s) => String(s || "").split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
  /** 켜진 화면 키 목록 — env: DC_NEXT · off: DC_NEXT_OFF · cookie: dc_next */
  function enabled(o) {
    const env = parse(o && o.env), off = parse(o && o.off), ck = parse(o && o.cookie);
    if (ck.indexOf("off") >= 0 || off.indexOf("all") >= 0) return [];
    const all = env.indexOf("all") >= 0 || ck.indexOf("all") >= 0;
    return KEYS.filter((k) => off.indexOf(k) < 0 && (all || env.indexOf(k) >= 0 || ck.indexOf(k) >= 0));
  }
  /** 주소(경로) → 화면 키 (React 로 옮긴 화면이 아니면 null) */
  function match(pathname) {
    const p = String(pathname || "/").split("?")[0].split("#")[0] || "/";
    const x = LIST.find((s) => s[1].test(p));
    return x ? x[0] : null;
  }
  /** 검색 · 공유용 공개 화면인지 (React 화면 틀이 noindex 대신 서버 미리보기 정보를 넣어요) */
  const isPublic = (key) => { const x = LIST.find((s) => s[0] === key); return !!(x && x[3] && x[3].pub); };
  /** ?dc_next= 값이 맞는지 (all · off · 화면 키들) */
  const validPick = (v) => { const l = parse(v); return l.length > 0 && l.every((k) => k === "all" || k === "off" || KEYS.indexOf(k) >= 0); };
  /* 화면(브라우저)에서: <html data-next · data-next-off>(빌드 때 환경 변수) + 쿠키 dc_next */
  function cookie(name) {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    try { return m ? decodeURIComponent(m[1]) : ""; } catch (e) { return ""; }
  }
  function here() {
    if (typeof document === "undefined") return [];
    const h = document.documentElement;
    return enabled({ env: h.getAttribute("data-next"), off: h.getAttribute("data-next-off"), cookie: cookie("dc_next") });
  }
  /** 이 브라우저에서 이 경로가 React 화면인지 → 키 또는 null */
  function onHere(pathname) { const k = match(pathname); return k && here().indexOf(k) >= 0 ? k : null; }
  return { LIST, KEYS, parse, enabled, match, isPublic, validPick, here, onHere };
});
