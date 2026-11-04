"use client";
/* 두잉고 강의실 틀 (예전 app.js renderShell · renderSidebar · vpSwitch · helpCard · 세계 시계 · 아래 빠른 메뉴)
 *  · 메뉴 구성(켜기 · 이름 · 순서 · 추가 메뉴)은 예전 계산 그대로 (DGA.NAV · on · navLabel)
 *  · 오른쪽 아래 AI 조교는 AI 조교 화면이 아니고 메뉴가 켜져 있을 때만 */
import { useEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st } from "./bits.jsx";
import { BotFab } from "./Bot.jsx";

/** 한국 · 뉴질랜드 시계 (15초마다) */
function Clock({ cls }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 15000); return () => clearInterval(i); }, []);
  return <Raw as="div" className={"wclock " + cls} aria-label="한국 · 뉴질랜드 현재 시간" html={DGA().worldClockHtml()} />;
}

function Sidebar({ r }) {
  const X = DGA(), S = st(), top = r.parts[0], sub = r.parts[1], D = S.D;
  const un = X.unreadNotices(), na = X.newAnswers(), nf = X.newFixes();
  const items = X.NAV().map((n, i) => {
    if (n.external) return <li key={i}><a className="nav-item" href={n.href} target="_blank" rel="noopener"><Icon n={n.icon} /><span>{n.label}</span><Icon n="arrowUpRight" c="sm chev" /></a></li>;
    if (n.id === "page") { const act = top === "page" && sub === n.sub; return <li key={i}><a className={"nav-item" + (act ? " active" : "")} href={n.href}><Icon n={n.icon} /><span>{n.label}</span></a></li>; }
    const active = top === n.id, kids = n.children ? n.children() : null, exact = active && (!kids || !sub), lb = X.navLabel(n);
    return (
      <li key={i}><a className={"nav-item" + (exact ? " active" : active ? " parent-active open" : "")} href={n.href} aria-current={exact ? "page" : undefined}><Icon n={n.icon} /><span>{lb}{n.id === "notices" && !/공지/.test(lb) ? <small className="nav-sub">공지사항</small> : null}</span>
        {n.id === "notices" && un ? <span className="nav-count">{un}</span> : n.id === "qna" && na ? <span className="nav-count" title="새 답변">{na}</span> : n.id === "missions" && nf ? <span className="nav-count" title="보완 요청">{nf}</span> : null}{kids ? <Icon n="chevDown" c="sm chev" /> : null}</a>
        {kids && active ? <ul className="subnav">{kids.map((k) => <li key={k.id}><a href={k.href} className={sub === k.id ? "active" : ""}>{k.label}{k.locked ? <span className="lock"><Icon n="lock" c="xs" /></span> : null}</a></li>)}</ul> : null}</li>
    );
  });
  return <>
    {S.TRACK === "vod" ? <a className="dc-side" href="#/vod/my/classes"><img src="assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" /><span><b>DOOGO CLASS 내 강의실</b><small>구매 내역 · 다른 강의 둘러보기</small></span><Icon n="arrowUpRight" c="sm" /></a> : null}
    {D.brand.worldClock ? <Clock cls="side" /> : null}
    <VpSwitch />
    <ul className="nav">{items}</ul>
    <HelpCard />
  </>;
}
// VOD 강의실 바꾸기: 지금 강의실 이름 + (2개 이상이면) 고르기
function VpSwitch() {
  const S = st(), X = DGA(), V = window.VOD;
  if (S.TRACK !== "vod" || !S.VP || !V) return null;
  const list = X.vodList(), cur = V.product(S.VP); if (!cur) return null;
  // 예전과 같게: 강의실을 바꾸고 홈으로 (홈이면 그 자리에서 다시 그려요)
  const pick = (e) => { X.setVp(e.currentTarget.value); if (window.ROUTE.hash === "#/home") window.ReactApp.redraw(); else window.ROUTE.hash = "#/home"; X.toast("‘" + (V.product(st().VP) || {}).title + "’ 강의실로 바꿨어요."); };
  return (
    <div className="vp-sw"><small><Icon n="circlePlay" c="xs" /> 지금 강의실</small>{list.length > 1
      ? <><label className="vp-sel"><span className="sr-only">강의실 바꾸기</span><select id="vp-pick" defaultValue={S.VP} onChange={pick}>{list.map((x) => <option key={x.p.id} value={x.p.id}>{x.p.title}</option>)}</select><Icon n="chevDown" c="sm" /></label><span className="vp-n">VOD {list.length}개 · 강의마다 강의실이 따로예요</span></>
      : <b>{cur.title}</b>}</div>
  );
}
// 왼쪽 메뉴 아래 ‘막힐 때’ 카드: AI 조교 → FAQ 검색 → 1:1 요청 (켜진 메뉴만)
function HelpCard() {
  const X = DGA(), S = st(), b = S.D.brand, steps = [];
  const botOpen = () => { X.botSet(true); window.ReactApp.redraw(); };
  if (X.on("bot")) steps.push(<button key="bot" type="button" className="hc-step" data-action="bot-open" onClick={botOpen}><span className="hc-ic"><Icon n="bot" c="sm" /></span><span className="hc-t"><b>{b.botName}에게 묻기</b><small>밤에도 바로 답해요</small></span></button>);
  if (X.on("qna")) {
    steps.push(<a key="faq" className="hc-step" href="#/qna"><span className="hc-ic"><Icon n="search" c="sm" /></span><span className="hc-t"><b>FAQ에서 찾기</b><small>자주 나오는 답을 모았어요</small></span></a>);
    if (S.TRACK === "vod" && X.addPid("coachOf")) steps.push(<a key="coach" className="hc-step" href={X.coachN() ? "#/qna/requests/new" : "#/qna"}><span className="hc-ic"><Icon n="message" c="sm" /></span><span className="hc-t"><b>1:1 코칭 질문</b><small>{X.coachN() ? "남은 " + X.coachN() + "회 · 강사님이 직접 답해요" : "코칭권으로 강사에게 직접 질문"}</small></span></a>);
    if (S.TRACK !== "vod") steps.push(<a key="req" className="hc-step" href="#/qna/requests/new"><span className="hc-ic"><Icon n="message" c="sm" /></span><span className="hc-t"><b>1:1 요청 남기기</b><small>{b.instructor}님이 직접 확인해요</small></span></a>);
  }
  return (
    <div className="help-card hc2"><div className="hc-top"><span className="hc-tag"><Icon n="sparkles" c="xs" />막힐 땐</span><strong>혼자 고민하지 마세요</strong><p>위에서부터 차례로 해 보면 대부분 금방 풀려요.</p></div>
      {steps.length ? <div className="hc-steps">{steps}</div> : null}
      {b.kakaoChannel ? <a className="btn btn-primary btn-sm btn-block hc-kakao" href={b.kakaoChannel} target="_blank" rel="noopener"><Icon n="message" c="sm" />카카오톡으로 문의</a> : null}
      <a className="hc-ops" href={DBX().opsKakao().chat} target="_blank" rel="noopener" data-kk-ops=""><Icon n="headset" c="sm" /><span><b>운영팀 상담 (카카오톡)</b><small>강의 재생 · 로그인 · 결제 오류는 여기로</small></span></a>
      <Raw as="div" className="side-powered" html={window.poweredBy("color")} /></div>
  );
}

const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
const MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';

/** 강의실 틀 — r: 지금 주소 (DGA.route) · hkey: 지금 주소(#/…) · n: 다시 그린 횟수 */
export default function Shell({ r, hkey, n, children }) {
  const X = DGA(), S = st(), D = S.D, lv = X.LV(), top = r.parts[0];
  const [nav, setNav] = useState(false);
  const [, bump] = useState(0);
  // 예전처럼 화면을 그릴 때마다 휴대폰 메뉴는 닫혀요
  useEffect(() => { setNav(false); }, [n, hkey]);
  const vt = S.TRACK === "vod" && top === "vodclass" && !!r.parts[1] && r.parts[1] !== "notes";
  const botShow = top !== "bot" && X.on("bot");
  const tabs = S.TRACK === "vod" ? [["#/home", "home", "홈"], ["#/vodclass", "circlePlay", "VOD 강의"], ["#/library", "library", "자료함"], ["#/vod/my/classes", "store", "DOOGO"]]
    : [["#/home", "home", "홈"], ["#/curriculum", "book", "강의"], ["#/missions", "checks", "과제"], ["#/qna", "message", "질문"]].filter((x) => x[0] === "#/home" || X.on(x[0].slice(2)));
  const mode = () => { const m = X.vodModeFlip(); bump((x) => x + 1); X.toast(m === "dark" ? "블랙 화면으로 바꿨어요." : "화이트 화면으로 바꿨어요."); };
  const tog = () => setNav((v) => !v);
  const exitPv = () => { X.exitPreview(); window.ROUTE.hash = "#/login"; };
  return (
    <div className={"app" + (S.preview ? " has-preview" : "") + (nav ? " nav-open" : "") + (vt ? " vt-focus" : "")} id="app">
      {S.preview ? <div className="preview-bar"><span><Icon n="eye" c="sm" /><b>{S.previewBy === "coach" ? "코치" : "강사"} 미리보기</b> · {S.CO.name} 기준 수강생 화면이에요. 여기서 제출한 내용은 실제 수강생 기록에 섞이지 않아요.</span>
        <span className="preview-actions"><button type="button" className="link-btn preview-exit" data-action="exit-preview" onClick={exitPv}>로그인 화면 보기</button><a className="btn btn-primary btn-sm" href="#/center"><Icon n="arrowLeft" c="sm" />{S.previewBy === "coach" ? "코치센터로" : "강사센터로"} 돌아가기</a></span></div> : null}
      <header className="topbar">
        <button className="menu-toggle" type="button" data-action="toggle-nav" aria-label="메뉴 열기" onClick={tog}><Icon n="menu" /></button>
        <a className="brand" href="#/home"><RawOne html={window.doinggoB("black", "brand-dg")} /><span className="brand-div" aria-hidden="true" /><span className="sr-only">홈</span><span className="brand-text"><small>{D.brand.name}</small><strong>{D.brand.courseTitle}</strong></span></a>
        {D.brand.worldClock ? <Clock cls="top" /> : null}
        <div className="topbar-right">
          {S.TRACK === "vod" ? <a className="dc-back" href="#/vod" title="DOOGO CLASS 스토어로 이동"><span className="dc-back-t"><b>DOOGO CLASS</b> 바로가기</span><Icon n="arrowUpRight" c="xs" /></a> : null}
          {S.TRACK === "vod" ? <button type="button" className="vmode" data-action="vod-mode" aria-label="블랙 / 화이트 화면 바꾸기" title="블랙 / 화이트 화면 바꾸기" onClick={mode}><svg className="icon sm" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: X.vodMode() === "dark" ? SUN : MOON }} /><span className="vmode-t">{X.vodMode() === "dark" ? "화이트" : "블랙"}</span></button> : null}
          <span className="hello"><span className={"sprout lv-" + lv.cur.key} title={"성장 레벨 · " + lv.cur.name}><Icon n={lv.cur.icon} c="sm" /></span><b>{S.me.name}</b><span className="txt">{S.preview ? "님 (미리보기)" : "님 환영합니다"}</span></span>
          <span className="cohort-chip">{S.CO.name}</span>
          {S.preview ? null : <button className="logout" type="button" data-action="logout" aria-label="로그아웃" onClick={() => X.logout()}><Icon n="logout" c="sm" /><span>로그아웃</span></button>}
        </div>
      </header>
      {D.brand.worldClock ? <Clock cls="strip" /> : null}
      <div className="shell">
        <aside className="sidebar" id="sidebar" aria-label="주 메뉴" onClick={(e) => { if (e.target.closest && e.target.closest("a")) setNav(false); }}><Sidebar r={r} /></aside>
        <div className="scrim" data-action="toggle-nav" onClick={tog} />
        <main className="main" id="main" tabIndex={-1} data-key={hkey}>{children}</main>
      </div>
      <div className={"bot-fab" + (botShow && S.botOpen ? " open" : "")} id="bot-fab"><BotFab show={botShow} /></div>
      <nav className="bw-tabbar" aria-label="빠른 메뉴">{tabs.map((x) => <a key={x[0]} className="bw-tab" href={x[0]}><Icon n={x[1]} /><span>{x[2]}</span></a>)}<button type="button" className="bw-tab" data-action="toggle-nav" onClick={tog}><Icon n="menu" /><span>전체</span></button></nav>
    </div>
  );
}
