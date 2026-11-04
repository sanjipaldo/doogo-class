"use client";
/* React 화면 뿌리 (Next.js 전환 4-4 ~ 6단계)
 *  · main.js 가 서버 연결 · 데이터 받기를 끝내면 window.ReactApp.go(화면 키, 주소) 로 그리라고 알려요 (주소를 옮길 때 · 다른 사람이 바꾼 내용이 들어올 때도)
 *  · 화면은 키로 고르고(class/shared/screens.js 목록), 그릴 때마다 지금 데이터로 다시 계산해요 (예전 화면 render() 와 같음)
 *  · 첫 로딩 화면 · 연결 실패 화면은 예전과 같은 모양 */
import { useEffect, useRef, useState } from "react";
import MyPage from "./store/MyPage.jsx";
import AuthPage from "./store/AuthPage.jsx";
import OrderPage from "./store/OrderPage.jsx";
import CheckoutPage from "./store/CheckoutPage.jsx";
import LearnPage from "./store/LearnPage.jsx";
import LegalPage from "./store/LegalPage.jsx";
import TeachersPage from "./store/TeachersPage.jsx";
import ListPage from "./store/ListPage.jsx";
import AboutPage from "./store/AboutPage.jsx";
import PartnersPage from "./store/PartnersPage.jsx";
import HomePage from "./store/HomePage.jsx";
import ProductPage from "./store/ProductPage.jsx";
import Classroom from "./dg/Classroom.jsx";
import DgLogin from "./dg/Login.jsx";
import Center from "./center/Center.jsx";

// 화면 키 → 화면 (키 · 주소 규칙은 class/shared/screens.js)
const SCREENS = { "vod-my": MyPage, "vod-auth": AuthPage, "vod-order": OrderPage, "vod-checkout": CheckoutPage, "vod-learn": LearnPage, "vod-legal": LegalPage, "vod-teachers": TeachersPage, "vod-list": ListPage, "vod-about": AboutPage, "vod-partners": PartnersPage, "vod-home": HomePage, "vod-product": ProductPage, "dg-home": Classroom, "dg-learn": Classroom, "dg-board": Classroom, "dg-lib": Classroom, "dg-more": Classroom, "dg-vod": Classroom, "dg-login": DgLogin, "ct-login": Center, "ct-dash": Center, "ct-ops": Center, "ct-content": Center, "ct-vod": Center, "ct-master": Center, "ct-partner": Center, "ct-media": Center };

const LOGO = <img className="boot-logo boot-logo-dc" src="/assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" width="156" height="20" fetchPriority="high" />;
function Boot() {
  return <div className="boot-wait" role="status" aria-live="polite">{LOGO}<span className="boot-bar" aria-hidden="true"><i /></span><p className="boot-txt">로딩중입니다<span className="boot-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p></div>;
}
function BootFail() {
  return <div className="boot-wait boot-err" role="alert">{LOGO}<b>서버에 연결하지 못했어요</b><span>잠시 후 다시 시도해 주세요.</span><button type="button" onClick={() => location.reload()}>다시 시도</button></div>;
}

export default function App() {
  const [st, setSt] = useState({ k: null, h: "", n: 0, moved: false, keep: null, fail: false });
  // 화면 영역의 처음 할 일(스토어: 결제 · 로그인 설정 받기)을 마친 뒤에 그려요 — 설정 없이 그리면 버튼이 서버를 거치지 않아요
  const [ready, setReady] = useState(false);
  const booted = useRef(false);
  useEffect(() => {
    // /n/… 를 직접 열었으면 원래 주소로 (proxy.js 가 넘겨 준 게 아니라서 주소창이 /n/… 이에요)
    if (/^\/n(\/|$)/.test(location.pathname)) { location.replace((location.pathname.slice(2) || "/") + location.search); return; }
    // 스토어 화면을 그리기 전에 예전 render() 처음에 하던 일 (무료 LIVE 일정 맞추기 — 바뀐 게 있을 때만 저장)
    //  · 두잉고 강의실(dg-*): 예전 render() 처음에 하던 로그인 확인 · 꺼진 메뉴 · 강의실 고르기 · 테마 (DGA.prep) — 옮길 주소가 나오면 그리지 않고 그리로 (예전 화면 ↔ React 화면은 main.js 가 골라요)
    const pre = (k) => {
      const X = window.VOD;
      if (/^vod-/.test(k || "") && X && X.syncFreeLive) { try { X.syncFreeLive(); } catch (e) { console.error("[react] 무료 LIVE 맞추기", e); } }
      if (/^dg-/.test(k || "") && window.DGA) { const to = window.DGA.prep(); if (to) { window.ROUTE.redirect(to); return false; } }
      //  · 강사센터 · 마스터(ct-*): 예전 render() 처음의 세션 · 로그인 · 역할별 주소 (ADM.prep) — 결과는 화면이 쓰게 ADM.last 에
      if (/^ct-/.test(k || "") && window.ADM) { const p = window.ADM.prep(); window.ADM.last = p; if (p.to) { if (p.warn) window.ADM.toast(p.warn, "warn"); window.ROUTE.redirect(p.to); return false; } }
      return true;
    };
    let curK = null;
    window.ReactApp = {
      go(k, h, changed) {
        curK = k;
        // 강사센터 · 마스터: 화면을 옮기면 열려 있던 예전 팝업은 닫아요 (예전 render 처음)
        if (/^ct-/.test(k || "") && window.ADM) window.ADM.closeModal();
        if (pre(k) === false) return;
        if (!booted.current) {
          booted.current = true;
          const X = window.VOD, b = X && X.reactBoot ? X.reactBoot() : null;
          Promise.resolve(b).catch((e) => console.error("[react] 처음 할 일", e)).then(() => setReady(true));
        }
        setSt((s) => {
          const moved = changed || s.h.split("?")[0] !== String(h || "").split("?")[0];
          // 마이페이지 안에서 메뉴만 바꿀 때는 보던 자리 · 메뉴 줄 가로 위치를 기억해 둬요 (예전 vod.js myKeep)
          const my = (x) => /^#\/vod\/my(\/|$)/.test(x || ""), nav = document.querySelector(".vd-my-nav");
          const keep = moved && my(s.h) && my(h) && nav ? { y: window.scrollY, left: nav.scrollLeft } : null;
          return { k, h, n: s.n + 1, moved, keep, fail: false };
        });
      },
      // 예전 처리 함수가 부르는 ‘팝업 닫기’ (vod.js closeModal) — 열려 있는 React 팝업을 닫아요 (ui/lib/Modal.jsx)
      closeModal() { window.dispatchEvent(new Event("dc:modal-close")); },
      // 예전 처리 함수가 끝에 부르는 ‘다시 그리기’ (vod.js render) — 보던 자리 그대로
      redraw() { if (pre(curK) === false) return; setSt((s) => Object.assign({}, s, { n: s.n + 1, moved: false, keep: null })); },
      fail() { setSt((s) => Object.assign({}, s, { fail: true })); },
      // 다른 영역 · 예전 화면으로 옮기려고 페이지를 새로 부를 때: ‘로딩중입니다’ (예전 화면과 같게 — main.js moveArea)
      leave() { setSt((s) => Object.assign({}, s, { k: null })); }
    };
    if (window.__dcReactReady) window.__dcReactReady();
  }, []);
  const Screen = st.k ? SCREENS[st.k] : null;
  return <div id="root">{st.fail ? <BootFail /> : Screen && ready ? <Screen n={st.n} h={st.h} moved={st.moved} keep={st.keep} /> : <Boot />}</div>;
}
