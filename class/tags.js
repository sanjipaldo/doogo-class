/* 분석 · 마케팅 도구 연결 — 마스터 › 첫 화면 · 사업자 정보 › ‘분석 · 마케팅 도구’에 값을 넣은 도구만 불러와요 (빈 칸은 안 불러요)
 *   네이버 애널리틱스(wcslog.js) · Google 애널리틱스 4(gtag.js) · 메타 픽셀(fbevents.js) · Cloudflare 웹 분석(beacon.min.js)
 *   · Vercel 웹 분석(/_vercel/insights/script.js — Vercel 대시보드에서 먼저 켠 뒤) · 카카오 JavaScript SDK(공식 CDN · 무결성 확인)
 * - 정식 주소(doogoclass.com)에서만 불러요. 미리보기 · 내 컴퓨터는 localStorage "dc:tags" 가 "1" 일 때만 (확인용)
 * - 강사센터 · 마스터 · 파트너 · 온드미디어 화면(#/center…)으로 처음 들어오면 불러오지 않고, 그 화면들은 페이지뷰도 보내지 않아요
 * - 값은 정해진 모양만 받아요 (스크립트 주소에 넣기 전에 다시 검사) — meta.site 는 마스터만 고칠 수 있어요
 * - 개인정보처리방침 ‘쿠키 등 자동 수집 장치’ 항목은 여기서 켜진 도구 목록으로 바뀌어요 (legal.js [[분석도구]] → lines()) */
(function () {
  "use strict";
  const RX = {
    tagNaver: /^[a-z0-9]{6,24}$/i,
    tagGa4: /^G-[A-Z0-9]{4,16}$/,
    tagPixel: /^\d{8,20}$/,
    tagCf: /^[a-f0-9]{32}$/i,
    tagKakao: /^[a-f0-9]{32}$/i
  };
  // 카카오 공식 CDN 2.8.3 (2026-09) — integrity 로 파일 내용을 고정해요 (버전을 바꾸면 해시도 함께)
  const KAKAO_SDK = { src: "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js", sri: "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy" };
  const S = { on: false, cfg: {}, last: "", naver: false };

  const hostOk = () => {
    if (/(^|\.)doogoclass\.com$/i.test(location.hostname)) return true;
    try { return localStorage.getItem("dc:tags") === "1"; } catch (e) { return false; }
  };
  const cur = () => (window.ROUTE && window.ROUTE.hash) || location.hash || "#/";
  const adminRoute = (h) => /^#\/center(\/|$)/.test(h || "");
  const site = () => (window.DB && window.DB.siteInfo ? window.DB.siteInfo() : {});
  /** 칸 값 → 정해진 모양이면 그대로, 아니면 "" */
  function pick(cfg, k) { const v = String(cfg[k] == null ? "" : cfg[k]).trim(); return RX[k] && RX[k].test(v) ? v : ""; }
  const vercelOn = (cfg) => cfg.tagVercel === true || cfg.tagVercel === "true" || cfg.tagVercel === "1";
  /** 지금 켜진 도구 (마스터 화면 · 개인정보처리방침이 같이 써요) */
  function active(cfg) {
    cfg = cfg || site();
    return { naver: pick(cfg, "tagNaver"), ga4: pick(cfg, "tagGa4"), pixel: pick(cfg, "tagPixel"), cf: pick(cfg, "tagCf"), kakao: pick(cfg, "tagKakao"), vercel: vercelOn(cfg) };
  }
  function script(src, attrs) {
    const s = document.createElement("script");
    s.async = true; s.src = src;
    Object.keys(attrs || {}).forEach((k) => s.setAttribute(k, attrs[k]));
    (document.head || document.documentElement).appendChild(s);
    return s;
  }
  const path = () => location.pathname + location.search + (window.__dcClean ? "" : location.hash);

  function boot() {
    if (S.on || !hostOk() || adminRoute(cur())) return;
    S.cfg = site(); S.on = true;
    const a = active(S.cfg);
    if (a.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", a.ga4, { send_page_view: false });
      script("https://www.googletagmanager.com/gtag/js?id=" + a.ga4);
    }
    if (a.pixel && !window.fbq) {
      // 메타 픽셀 공식 코드와 같은 대기열 — fbevents.js 가 오면 쌓인 호출을 처리해요
      const q = function () { q.callMethod ? q.callMethod.apply(q, arguments) : q.queue.push(arguments); };
      q.push = q; q.loaded = true; q.version = "2.0"; q.queue = [];
      window.fbq = q; if (!window._fbq) window._fbq = q;
      script("https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", a.pixel);
    }
    if (a.naver) {
      window.wcs_add = window.wcs_add || {}; window.wcs_add.wa = a.naver;
      script("https://wcs.naver.net/wcslog.js").onload = () => {
        try { window.wcs_add = window.wcs_add || {}; window.wcs_add.wa = a.naver; if (window.wcs) { window.wcs.inflow("doogoclass.com"); window.wcs_do(); S.naver = true; } } catch (e) {}
      };
    }
    if (a.cf) script("https://static.cloudflareinsights.com/beacon.min.js", { defer: "", "data-cf-beacon": JSON.stringify({ token: a.cf, spa: true }) });
    if (a.vercel) {
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      script("/_vercel/insights/script.js", { defer: "" });
    }
    if (a.kakao) {
      script(KAKAO_SDK.src, { integrity: KAKAO_SDK.sri, crossorigin: "anonymous" }).onload = () => {
        try { if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(a.kakao); } catch (e) {}
      };
    }
    page();
  }

  /** 화면이 바뀔 때마다 (main.js) — Cloudflare(spa) · Vercel 은 스스로 세요 */
  function page() {
    if (!S.on) { boot(); return; }
    if (adminRoute(cur())) return;
    const p = path();
    if (p === S.last) return;
    S.last = p;
    const a = active(S.cfg);
    try { if (a.ga4 && window.gtag) window.gtag("event", "page_view", { page_location: location.href, page_path: p, page_title: document.title }); } catch (e) {}
    try { if (a.pixel && window.fbq) window.fbq("track", "PageView"); } catch (e) {}
    try { if (a.naver && S.naver && window.wcs_do) { window.wcs_add.wa = a.naver; window.wcs_do(); } } catch (e) {}
  }

  // 카카오 SDK 를 켰으면 ‘카카오톡 상담’ 링크(data-kk-ops)는 카카오톡 채널 채팅으로 바로 열어요 (휴대폰은 카카오톡 앱으로) — 안 되면 원래 링크 그대로
  document.addEventListener("click", (e) => {
    const el = e.target && e.target.closest && e.target.closest("a[data-kk-ops]");
    if (!el || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const K = window.Kakao, m = /^https:\/\/pf\.kakao\.com\/(_[A-Za-z0-9]+)/.exec(el.href || "");
    if (!m || !K || !K.isInitialized || !K.isInitialized() || !K.Channel || !K.Channel.chat) return;
    try { K.Channel.chat({ channelPublicId: m[1] }); e.preventDefault(); } catch (x) {}
  });

  /** 개인정보처리방침 ‘쿠키 등 자동 수집 장치’에 넣을 줄 (켜진 도구만) */
  function lines() {
    const a = active(), L = [];
    const tools = [
      a.naver && "네이버 애널리틱스(네이버) — 방문 · 유입 경로 통계",
      a.ga4 && "Google 애널리틱스(Google) — 방문 · 이용 통계 (거부: https://tools.google.com/dlpage/gaoptout)",
      a.pixel && "메타 픽셀(Meta Platforms) — 광고 성과 측정 · 맞춤형 광고 (설정: https://www.facebook.com/adpreferences)",
      a.cf && "Cloudflare 웹 분석(Cloudflare) — 쿠키 없이 방문 통계 · 페이지 속도",
      a.vercel && "Vercel 웹 분석(Vercel) — 쿠키 없이 방문 통계",
      a.kakao && "카카오 JavaScript SDK(카카오) — 카카오톡 채널 상담 연결"
    ].filter(Boolean);
    if (!a.naver && !a.ga4 && !a.pixel) L.push("- 광고나 행태 분석 목적의 제3자 쿠키는 사용하지 않습니다.");
    if (tools.length) {
      L.push("- 회사는 서비스 이용 통계 분석" + (a.pixel ? "과 광고 성과 측정" : "") + "을 위해 다음 도구를 사용합니다.");
      tools.forEach((t) => L.push("- " + t));
      if (a.naver || a.ga4 || a.pixel) {
        L.push("- 이 도구들은 방문한 페이지 · 클릭 · 결제 등 이용 기록과 기기 · 브라우저 정보, 쿠키 식별자를 자동으로 수집하며, 이름 · 연락처처럼 직접 알아볼 수 있는 정보는 보내지 않습니다. 수집된 정보는 각 제공자의 서버(해외 포함)에서 처리 · 보관되며 보관 기간은 각 제공자의 정책에 따릅니다.");
        L.push("- 이용자는 브라우저의 쿠키 차단 설정이나 위의 거부 방법으로 수집을 막을 수 있으며, 막아도 강의 구매 · 수강에는 영향이 없습니다.");
      }
    }
    return L;
  }

  window.SiteTags = { RX, KAKAO_SDK, active, boot, page, lines };
})();
