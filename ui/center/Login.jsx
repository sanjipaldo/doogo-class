"use client";
/* 강사센터 로그인 #/center/login — 탭: 강사 · 코치 · 마스터 · 패밀리 (예전 admin.js renderLogin 을 React 로 — Next.js 전환 6단계)
 *  · 탭 바꾸기 · 로그인(폼 a-login-form) · 수강생 화면 가기는 예전 admin.js 이벤트가 받아요 · 번호 보기만 여기서 */
import { useEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { ADM } from "./bits.jsx";

const H = (s) => <RawOne html={"<h2>" + s + "</h2>"} />;

export default function CenterLogin() {
  const A = ADM(), tab = A.loginTab(), coachTab = tab === "coach", ins = tab === "instructor" || coachTab, partnerTab = tab === "partner";
  useEffect(() => { document.title = (coachTab ? "코치센터" : ins ? "강사센터" : partnerTab ? "패밀리센터" : "마스터 관리자") + " · 로그인"; });
  const L = partnerTab
    ? { theme: "red", tag: "패밀리센터", eyebrow: "DOINGGO FAMILY", h: "소개한 강사님의 기수가<br><em>내 수익</em>이 되는 곳", sub: "강사님을 두잉고에 소개하면, 강사님이 기수를 열 때마다 이용료의 RS가 패밀리님 수익으로 쌓여요. 수익 · 지급일을 한눈에 확인하세요.", icons: ["handshake", "coins", "users", "award"], label: "FAMILY", title: "패밀리 로그인", lead: "두잉고에서 받은 아이디와 비밀번호로 로그인하세요." }
    : coachTab
      ? { theme: "green", tag: "코치", eyebrow: "DOINGGO COACH WORKSPACE", h: "과제 피드백과<br><em>1:1 문의</em>를 한 곳에서", sub: "강사님이 맡긴 메뉴에서 수강생 과제를 검수하고, 문의에 답하고, 진행 상황을 챙길 수 있습니다.", icons: ["checks", "message", "users", "award"], label: "COACH", title: "코치 로그인", lead: "강사님이 등록해 준 이름과 전화번호 뒷자리로 로그인하세요." }
      : ins
        ? { theme: "red", tag: "강사센터", eyebrow: "DOINGGO INSTRUCTOR CENTER", h: "수강생 관리부터<br><em>커리큘럼까지</em> 한 곳에서", sub: "기수별 수강생 승인, 과제 검수, 강의 영상과 일정 업로드를 간편하게 운영할 수 있습니다.", icons: ["users", "play", "calendar", "settings"], label: "INSTRUCTOR", title: "강사 로그인", lead: "강사 이름과 전화번호 뒷자리로 로그인하세요." }
        : { theme: "dark", tag: "마스터", eyebrow: "DOINGGO MASTER CONSOLE", h: "강사 플랫폼을<br><em>분양하고 관리</em>하세요", sub: "새 강사 플랫폼 개설, 운영 중지, 강사센터 대신 접속과 전체 수강생 현황을 한 곳에서 봅니다.", icons: ["store", "layers", "users", "shieldCheck"], label: "MASTER", title: "마스터 · 패밀리 로그인", lead: "관리자 · 두잉고 패밀리 · 온드미디어 계정으로 로그인하세요." };
  const seg = [["instructor", "user", "강사", ins && !coachTab], ["coach", "checks", "코치", coachTab], ["master", "shieldCheck", "마스터 · 패밀리", !ins]];
  return (
    <main className={"adm a-login a-login-" + L.theme}>
      <section className="a-login-brand"><RawOne html={window.loginArt(L.theme, L.icons)} />
        <a className="a-logo a-logo-doogo" href="#/doinggo" title="두잉고 홈으로" aria-label="두잉고 홈으로"><RawOne html={window.doogoClassLock()} /><em>{L.tag}</em></a>
        <div className="a-login-hero"><p className="a-eyebrow">{L.eyebrow}</p>{H(L.h)}<p>{L.sub}</p></div>
        <div className="a-login-foot"><a className="a-login-home" href="#/doinggo"><Icon n="home" c="sm" />두잉고 페이지 바로가기<Icon n="arrowRight" c="xs" /></a><span>© 2026 (주)두고홀딩스</span></div>
      </section>
      <section className="a-login-panel">
        <div className="a-login-topright"><span>수강생이신가요?</span><a className="a-btn a-btn-primary a-btn-sm" href="#/login" data-action="to-student">바로가기</a></div>
        <div className="a-login-stack"><div className="a-login-card">
          <p className="a-login-label"><a className="a-login-home-logo" href="#/doinggo" title="두잉고 홈으로" aria-label="두잉고 홈으로"><RawOne html={window.doogoClassLock()} /></a><em className="a-login-role">{L.label}</em></p>
          <h1>{L.title}</h1><p className="a-muted a-center">{L.lead}</p>
          <div className="a-seg" role="tablist">{seg.map((x) => <button key={x[0]} type="button" role="tab" aria-selected={String(x[3])} className={x[3] ? "on" : ""} data-action="login-tab" data-tab={x[0]}><Icon n={x[1]} c="sm" />{x[2]}</button>)}</div>
          <LoginForm key={tab} tab={tab} />
        </div>
          <a className="a-login-alt" href="#/login" data-action="to-student"><Icon n="home" c="sm" />수강생 센터 보기 <Icon n="arrowUpRight" c="xs" /></a>
        </div>
      </section>
    </main>
  );
}

/** 로그인 칸 — 탭마다 새로 그려요 (예전처럼 적던 칸 · 번호 보기가 처음으로) */
function LoginForm({ tab }) {
  const coachTab = tab === "coach", ins = tab === "instructor" || coachTab, partnerTab = tab === "partner", [show, setShow] = useState(false);
  const pwAttr = ins ? { inputMode: "numeric", maxLength: "4", placeholder: "숫자 4자리" } : partnerTab ? { inputMode: "numeric", maxLength: "8", autoComplete: "current-password", placeholder: "숫자 비밀번호" } : { autoComplete: "current-password", placeholder: "비밀번호" };
  return (
    <form id="a-login-form" className="a-form" noValidate>
            <div className="a-field"><label htmlFor="al-id">{coachTab ? "코치 이름" : ins ? "강사 이름" : "아이디"}</label><div className="a-input-icon"><Icon n="user" c="sm" /><input className="a-input" id="al-id" name="uid" autoComplete={ins ? "name" : "username"} placeholder={coachTab ? "예: 김하나" : ins ? "예: 문원오" : partnerTab ? "예: partner" : "관리자 · 패밀리 · 온드미디어 아이디"} /></div></div>
            <div className="a-field"><label htmlFor="al-pw">{ins ? "전화번호 뒷자리" : "비밀번호"}</label><div className="a-input-icon"><Icon n="lock" c="sm" /><input className="a-input" id="al-pw" name="pw" type={show ? "text" : "password"} {...pwAttr} />
              <button type="button" className="a-eye" data-action="toggle-pw" aria-label="보기" onClick={() => setShow((v) => !v)}><Icon n={show ? "eyeOff" : "eye"} c="sm" /></button></div>
              <small className="a-field-note">{ins ? "휴대폰 번호 뒷자리 4자리" : ""}</small></div>
            <p className="a-error" id="al-error" role="alert" />
            <button className="a-btn a-btn-primary a-btn-lg a-btn-block" type="submit">로그인</button>
            <p className="a-login-help">{coachTab ? "강사센터 ‘코치 관리’에 등록된 정보로 로그인해 주세요" : ins ? "마스터에서 등록한 강사 정보로 로그인해 주세요" : ""}</p>
          </form>
  );
}
