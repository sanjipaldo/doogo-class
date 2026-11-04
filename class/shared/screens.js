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
  // [키, 주소 규칙, 설명]
  const LIST = [
    // 마이페이지: 메뉴 전부 (홈 · 강의장 · 구매 · 활동 · 계정)
    ["vod-my", /^\/vod\/my(\/(classes|free|vod|addons|ebooks|live|alarm|likes|pending|orders|ship|coupons|points|reviews|posts|badges|account|devices|help))?\/?$/, "두고클래스 마이페이지 (메뉴 전부)"],
    // 두고클래스 로그인 · 회원가입 · 두잉고 VOD 강의실 고르기
    ["vod-auth", /^\/vod\/(login|signup|dg)\/?$/, "두고클래스 로그인 · 회원가입 · 두잉고 VOD 강의실 고르기"],
    // 주문 확인 (결제 · 신청 · 입금 대기 완료)
    ["vod-order", /^\/vod\/order\/[^/]+\/?$/, "두고클래스 주문 확인"]
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
  return { LIST, KEYS, parse, enabled, match, validPick, here, onHere };
});
