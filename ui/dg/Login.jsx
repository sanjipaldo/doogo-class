"use client";
/* 두잉고 강의실 로그인 #/login(?tab=vod) — 강사 고르기(검색 · 초성) → 이름 + 전화번호 뒷자리 로그인 · 두고클래스(VOD 회원) 이메일 · 카카오 로그인 · 수강 신청
 * 예전 app.js renderPicker · bindInsSearch · renderLogin · svcTabs · vodPane · openSignup · forgot · legal 을 React 로 (Next.js 전환 5단계)
 *  · 로그인 · VOD 로그인 · 카카오 · 수강 신청 · 사람 확인(Turnstile)은 예전 함수 그대로 (DGA.doLogin · doVodLogin · vodKakao · signupSubmit · vodPaneReady)
 *  · 강의실 틀 없이 #root 에 바로 그려요 (예전과 같음) */
import { useEffect, useRef, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX } from "./bits.jsx";
import { DgModal } from "./More.jsx";

const redraw = () => window.ReactApp.redraw();
const ok = (close) => <button className="btn btn-primary" data-action="modal-close" onClick={close}>확인</button>;

/** 번호 보기 · 숨기기 칸 */
function PwInput({ id, icon, ...rest }) {
  const [show, setShow] = useState(false);
  return <div className="input-icon input-wrap"><Icon n={icon} c="sm" /><input className="input" id={id} type={show ? "text" : "password"} {...rest} />
    <button type="button" className="input-addon" data-action="toggle-pw" data-for={id} aria-label={show ? "번호 숨기기" : "번호 보기"} onClick={() => setShow((v) => !v)}><Icon n={show ? "eyeOff" : "eye"} c="sm" /></button></div>;
}
function SvcTabs({ vod, pick }) {
  return <div className="lg-svc" role="tablist" aria-label="로그인할 곳 고르기">
    <a role="tab" className={"lg-svc-dg" + (vod ? "" : " on")} href="#/login" data-action="svc-tab" data-k="dg" aria-selected={String(!vod)} onClick={(e) => { e.preventDefault(); pick(false); }}><b>두잉고</b><small>기수 수강생 · 강사 강의실</small></a>
    <a role="tab" className={"lg-svc-vod" + (vod ? " on" : "")} href="#/login?tab=vod" data-action="svc-tab" data-k="vod" aria-selected={String(vod)} onClick={(e) => { e.preventDefault(); pick(true); }}><b>두고클래스</b><small>VOD 구매 회원 · 이메일 로그인</small></a></div>;
}
/** ‘두고클래스’ 탭: DOOGO CLASS VOD 회원 이메일 · 카카오 로그인 → 두잉고 VOD 강의실로 */
function VodPane({ vod }) {
  const X = DGA(), V = window.VOD || {}, demo = V.V && V.V().settings && V.V().settings.demoLogin !== false;
  return (
    <div className="lg-pane lg-vod" data-pane="vod" hidden={!vod || undefined}>
      <p className="lg-vod-logo"><img src="assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" /></p><h1>VOD 회원 로그인</h1>
      <p className="lead">DOOGO CLASS에서 VOD를 살 때 가입한 <b>이메일 · 비밀번호</b>(또는 카카오)로 로그인하면 두잉고 VOD 강의실로 바로 들어가요.</p>
      <button type="button" className="lg-kakao" data-action="vod-kakao" onClick={() => X.vodKakao()}>{V.KAKAO_ICON ? <RawOne html={V.KAKAO_ICON} /> : <Icon n="message" c="sm" />}카카오로 1초 만에 시작하기</button>
      <div className="lg-or"><span>또는 이메일로 로그인</span></div>
      <form className="login-form" id="vod-login-form" noValidate onSubmit={(e) => { e.preventDefault(); X.doVodLogin(e.currentTarget); }}>
        <div className="field"><label htmlFor="lg-vemail">이메일</label><div className="input-icon"><Icon n="mail" c="sm" /><input className="input" id="lg-vemail" name="email" type="email" autoComplete="email" maxLength="80" placeholder="example@doogoclass.com" /></div></div>
        <div className="field"><label htmlFor="lg-vpw">비밀번호</label><PwInput id="lg-vpw" icon="lock" name="pw" autoComplete="current-password" maxLength="40" placeholder="비밀번호를 입력해 주세요" /></div>
        <div className="lg-ts" data-ts="" />
        <p className="field-error" id="lg-vod-error" role="alert" />
        <button className="btn btn-primary btn-block" type="submit">로그인하고 VOD 강의실로</button>
      </form>
      <p className="lg-vod-links"><a href="#/vod/signup?next=%23%2Fvod%2Fdg">이메일로 회원가입</a><span aria-hidden="true">·</span><a href="#/vod/login?next=%23%2Fvod%2Fdg">비밀번호 찾기</a></p>
      {demo ? <p className="lg-vod-demo">체험 계정 · vod@gmail.com / vod</p> : null}
      <p className="login-help">두잉고 기수 수강생 계정과는 따로예요. 기수 수강생은 왼쪽 ‘두잉고’ 탭이에요.</p>
    </div>
  );
}
function Legal({ open }) {
  return <nav className="login-legal" aria-label="약관">{[["terms", "이용약관"], ["privacy", "개인정보처리방침"], ["oss", "오픈소스 라이선스"]].map((d) => <button key={d[0]} type="button" data-action="legal" data-doc={d[0]} onClick={() => open({ k: "legal", doc: d[0] })}>{d[1]}</button>)}</nav>;
}
const Lock = ({ cls }) => <RawOne html={window.doogoClassLock ? window.doogoClassLock(cls) : window.doogoLogo("color")} />;
const insAv = (x, DB) => { const ph = ((DB.content(x.id) || {}).brand || {}).photo; return <span className={"ins-avatar" + (ph ? " has-photo" : "")}>{ph ? <img src={ph} alt="" decoding="async" /> : x.displayName.slice(0, 1)}</span>; };

/* ---------- 강사 고르기 (처음 화면) ---------- */
function Picker({ list, vod, pickSvc, cardRef, setModal }) {
  const X = DGA(), DB = DBX(), [q, setQ] = useState(""), qRef = useRef(null);
  const v = X.insNorm(q), rows = list.map((x) => { const b = (DB.content(x.id) || {}).brand || {}, hay = [x.displayName, b.name, b.field, b.shortTitle, b.courseTitle].filter(Boolean).join(" "), h = X.insNorm(hay); return { x, b, hay, hit: !v || h.includes(v) || X.insCho(h).includes(v) }; });
  const n = rows.filter((r) => r.hit).length;
  const pick = (id) => { X.pickIns(id); redraw(); setTimeout(() => { const el = document.getElementById("lg-name"); if (el) el.focus(); }, 0); };
  const name = (raw) => { const at = v ? raw.replace(/\s+/g, "").toLowerCase().indexOf(v) : -1; return at >= 0 && !/\s/.test(raw) ? <>{raw.slice(0, at)}<mark>{raw.slice(at, at + v.length)}</mark>{raw.slice(at + v.length)}</> : raw; };
  const key = (e) => { if (e.key === "Enter") { e.preventDefault(); const hit = rows.filter((r) => r.hit); if (hit.length === 1) pick(hit[0].x.id); } if (e.key === "Escape") { e.currentTarget.value = ""; setQ(""); } };
  const pts = [["book", "주차별 튜토리얼 · 과제 피드백"], ["award", "진행률 · 수료증"], ["heart", "수료 후에도 평생 이용"]];
  return (
    <main className="login login-dc">
      <section className="dc-brand">
        <a className="dc-logo" href="#/doinggo" aria-label="두잉고 홈으로 — Doing + GO"><Lock /><span className="dc-tag" aria-hidden="true">DOING <b>+</b> GO</span></a>
        <div className="dc-hero"><p className="dc-eyebrow"><i />DOINGGO · 수강생 로그인</p><h2 className="dc-headline">따라만 하면 완성되는<br /><span>튜토리얼 강의 플랫폼</span></h2>
          <p className="dc-sub">내 강사님이 준비해 둔 1주차부터 수료까지의 튜토리얼이 기다리고 있어요. 회원가입 없이, 수강 신청할 때 적은 정보로 들어와요.</p>
          <ul className="dc-pts">{pts.map((x) => <li key={x[0]}><Icon n={x[0]} c="sm" />{x[1]}</li>)}</ul></div>
        <div className="dc-foot"><span>© 2026 DOOGO HOLDINGS</span><a href="#/doinggo">두잉고 소개 <Icon n="arrowRight" c="xs" /></a></div>
      </section>
      <section className="login-panel dc-panel">
        <div className="login-topright"><a className="login-home-big" href="#/doinggo"><Icon n="arrowLeft" c="sm" /><span>두잉고 홈페이지 이동하기</span></a><span>강사님이신가요?</span><a className="dc-center" href="#/center">강사센터</a></div>
        <div className={"login-stack" + (vod ? " svc-vod" : "")}>
          <div className="login-card dc-card" ref={cardRef}><SvcTabs vod={vod} pick={pickSvc} /><div className="lg-pane" data-pane="dg" hidden={vod || undefined}>
            <div className="dc-card-logo"><Lock /></div><h1>두잉고 시작하기</h1><p className="lead">수강 신청할 때 등록한 정보로 로그인하세요.</p>
            <div className="field"><span className="field-label">어떤 강사님의 강의를 듣고 계신가요?</span>
              <label className={"dc-search" + (v ? " has-q" : "")}><Icon n="search" c="sm" /><input ref={qRef} id="dc-q" type="search" placeholder="강사님 이름이나 강의 분야로 찾기" autoComplete="off" enterKeyHint="search" aria-label="강사님 검색" aria-controls="dc-ins-list" onInput={(e) => setQ(e.currentTarget.value)} onKeyDown={key} />
                <button type="button" className="dc-q-clear" data-dc-clear="" aria-label="검색어 지우기" onClick={(e) => { e.preventDefault(); if (qRef.current) { qRef.current.value = ""; qRef.current.focus(); } setQ(""); }}><Icon n="x" c="xs" /></button></label>
              <p className="dc-search-meta" id="dc-count" aria-live="polite">{v ? <>검색 결과 <b>{n}</b>명</> : <>함께하는 강사님 <b>{list.length}</b>명</>}</p>
              <div className="dc-ins-list" id="dc-ins-list" role="radiogroup">{rows.map(({ x, b, hay, hit }) => (
                <button key={x.id} type="button" className="dc-ins" role="radio" aria-checked="false" data-action="pick-instructor" data-id={x.id} data-q={hay} hidden={!hit || undefined} onClick={() => pick(x.id)}>
                  <span className={"dc-ins-av" + (b.photo ? " has-photo" : "")}>{b.photo ? <img src={b.photo} alt="" decoding="async" /> : x.displayName.slice(0, 1)}</span><span className="dc-ins-t"><b data-name={x.displayName}>{name(x.displayName)}</b><small>{b.field || b.shortTitle || b.courseTitle || ""}</small></span><Icon n="chevRight" c="sm" /></button>
              ))}</div>
              <div className="dc-empty" id="dc-empty" hidden={n > 0 || undefined}><Icon n="search" /><b>찾는 강사님이 없어요</b><span>이름을 다시 확인하거나, 강사님께 받은 수강 안내 링크로 들어와 주세요.</span></div>
              <span className="tiny">한 번 고르면 다음부터는 바로 로그인 화면이 열려요.</span></div>
          </div><VodPane vod={vod} /></div>
          <a className="dc-partner" href="#/partner"><Icon n="handshake" c="sm" /><span><b>강사님이신가요?</b> 두잉고 입점을 문의해 보세요</span><Icon n="arrowRight" c="xs" /></a>
          <Legal open={setModal} />
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  const X = DGA(), DB = DBX(), L = X.login(), ins = L.ins, B = L.B, [vod, setVod] = useState(() => X.svcIsVod()), [modal, setModal] = useState(null), cardRef = useRef(null);
  const close = () => setModal(null);
  const pickSvc = (v) => { X.svcSet(v); setVod(v); };
  useEffect(() => { if (vod) X.vodPaneReady(cardRef.current || document); }, [vod]); // eslint-disable-line react-hooks/exhaustive-deps
  // 예전 renderLogin 처음: 창 제목 · 강사 색 (강사를 고르기 전에는 두잉고 흰 바탕)
  useEffect(() => {
    if (!ins && L.list.length) { document.title = "두잉고 · 수강생 로그인"; window.applyStudentTheme(null); const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", "#ffffff"); }
    else { document.title = (ins ? B.name : "두잉고") + " · 로그인"; window.applyStudentTheme(DB.themeOf(B.theme)); }
  });
  const modals = modal ? (
    modal.k === "legal" ? <DgModal title={X.LEGAL[modal.doc][0]} wide bodyHtml={X.legalHtml(modal.doc)} onClose={close} actions={ok(close)} />
      : modal.k === "forgot" ? <DgModal title="로그인 정보를 잊으셨나요?" onClose={close} actions={ok(close)}>{X.FORGOT_TXT}</DgModal>
        : modal.k === "msg" ? <DgModal title={modal.title} onClose={close} actions={ok(close)}>{modal.text}</DgModal>
          : <SignupModal ins={ins} onClose={close} done={(name) => setModal({ k: "msg", title: "신청이 접수됐어요", text: X.signupDoneMsg(name) })} />
  ) : null;
  if (!ins && L.list.length) return <><Picker list={L.list} vod={vod} pickSvc={pickSvc} cardRef={cardRef} setModal={setModal} />{modals}</>;
  const lines = String(B.loginHeadline || B.courseTitle || "").split("\n");
  const V = window.VOD, hasVod = ins && V && V.products && V.products().some((p) => p.iid === ins.id && V.dgOpen(p));
  const signup = () => { if (!X.signupCos().length) setModal({ k: "msg", title: "수강 신청", text: ins.displayName + " 강사님의 지금 모집 중인 기수가 없어요.\n다음 기수 모집이 열리면 다시 신청해 주세요." }); else setModal({ k: "signup" }); };
  const clearErr = () => { const er = document.getElementById("lg-error"); if (er) er.textContent = ""; };
  return (
    <main className="login">
      <section className="login-brand"><RawOne html={window.loginArt("wise", ["message", "play", "book", "award"])} />
        <span className="login-logo"><a className="login-dg-home" href="#/doinggo" title="두잉고 홈으로" aria-label="두잉고 홈으로"><RawOne html={window.doinggoB("white", "login-dg")} /></a><span className="login-logo-div" aria-hidden="true" /><strong>{B.name}</strong><em>수강생</em></span>
        <div className="login-hero"><p className="login-eyebrow">{B.loginEyebrow || "DOINGGO"}</p>
          <h2 className="login-headline">{lines.map((l, i) => [i ? <br key={"b" + i} /> : null, i === lines.length - 1 && lines.length > 1 ? <span key={i} className="accent">{l}</span> : l])}</h2>
          {B.loginSub ? <p className="login-sub">{B.loginSub}</p> : null}</div>
        <div className="login-foot"><span className="login-copy">© 2026 {B.name}</span><RawOne html={window.poweredBy("white", "login-powered")} /></div>
      </section>
      <section className="login-panel">
        <div className="login-topright"><a className="login-home-big" href="#/doinggo"><Icon n="arrowLeft" c="sm" /><span>두잉고 홈페이지 이동하기</span></a><span>강사님이신가요?</span><a className="btn btn-dark btn-sm" href="#/center">강사센터</a></div>
        <div className={"login-stack" + (vod ? " svc-vod" : "")}>
          <div className="login-card" ref={cardRef}><SvcTabs vod={vod} pick={pickSvc} /><div className="lg-pane" data-pane="dg" hidden={vod || undefined}>
            <p className="login-label"><a href="#/doinggo" title="두잉고 홈으로" aria-label="두잉고 홈으로"><Lock /></a></p>
            <h1>{(ins ? B.name : "두잉고") + " 시작하기"}</h1><p className="lead">수강 신청할 때 등록한 정보로 로그인하세요.</p>
            <form className="login-form" id="login-form" noValidate onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; if (f.elements.namedItem("name")) X.doLogin(f); }}>
              {ins ? <div className="ins-picked">{insAv(ins, DB)}<span className="ins-txt"><small>수강 중인 강의</small><b>{ins.displayName}</b><span>{DB.content(ins.id).brand.shortTitle}</span></span><button type="button" className="link-btn" data-action="change-instructor" onClick={() => { X.unpickIns(); redraw(); }}>변경</button></div>
                : <div className="field"><span className="field-label">어떤 강사님의 강의를 듣고 계신가요?</span><div className="ins-list" role="radiogroup">{L.list.map((x) => <button key={x.id} type="button" className="ins-option" role="radio" aria-checked="false" data-action="pick-instructor" data-id={x.id} onClick={() => { X.pickIns(x.id); redraw(); }}>{insAv(x, DB)}<b>{x.displayName}</b><Icon n="chevRight" c="sm" /></button>)}</div><span className="tiny">한 번 고르면 다음부터는 바로 로그인 화면이 열려요.</span></div>}
              {ins ? <>
                <div className="field"><label htmlFor="lg-name">이름</label><div className="input-icon"><Icon n="user" c="sm" /><input className="input" id="lg-name" name="name" autoComplete="name" placeholder="예: 홍길동" required onInput={clearErr} /></div></div>
                <div className="field"><label htmlFor="lg-phone">전화번호 뒷자리</label><PwInput id="lg-phone" icon="lock" name="phone4" inputMode="numeric" maxLength="4" autoComplete="off" placeholder="숫자 4자리" required onInput={clearErr} /></div>
                <div className="row-end"><button type="button" data-action="forgot" onClick={() => setModal({ k: "forgot" })}>로그인 정보를 잊으셨나요?</button></div>
                <p className="field-error" id="lg-error" role="alert" />
                <button className="btn btn-primary btn-block" type="submit">로그인</button>
                <p className="login-help">휴대폰 번호 뒷자리 4자리가 비밀번호 대신 사용됩니다.</p>
                {hasVod ? <a className="login-help login-vod" href="#/login?tab=vod" data-action="svc-tab" data-k="vod" onClick={(e) => { e.preventDefault(); pickSvc(true); }}><Icon n="circlePlay" c="xs" /><span>DOOGO CLASS에서 {ins.displayName} 강사님 VOD를 사셨나요? 위 <b>‘두고클래스’ 탭</b>에서 가입한 <b>이메일 · 비밀번호</b>(또는 카카오)로 로그인하면 VOD 강의실로 바로 들어가요.</span><Icon n="chevRight" c="xs" /></a> : null}
                {L.vodClosed ? <p className="field-error">VOD 수강 기간이 끝나 두잉고 VOD 버전이 닫혔어요.</p> : null}
              </> : null}
            </form>
          </div><VodPane vod={vod} /></div>
        {ins ? <><button type="button" className="login-alt" data-action="signup" onClick={signup}><Icon n="userPlus" c="sm" />아직 수강 신청 전이신가요? 수강 신청하기</button>
          {(DB.landingOf(ins.id) || {}).published ? <a className="login-intro" href={"#/p/" + ins.id}><Icon n="book" c="sm" />강사 소개 보기 <Icon n="arrowRight" c="xs" /></a> : null}</> : null}
        <Legal open={setModal} />
        </div>
      </section>
      {modals}
    </main>
  );
}

function SignupModal({ ins, onClose, done }) {
  const X = DGA(), DB = DBX(), cos = X.signupCos(), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const submit = (e) => { e.preventDefault(); const f = e.currentTarget; if (DB.remote.on) setBusy(true); X.signupSubmit(f).then((r) => { setBusy(false); if (!r.ok) { setErr(r.msg); return; } done(r.name); }); };
  return (
    <DgModal title={ins.displayName + " · 수강 신청"} onClose={onClose}>
      <form id="signup-form" className="stack" noValidate style={{ whiteSpace: "normal" }} onSubmit={submit}>
        <p className="tiny" style={{ margin: "0" }}>신청 후 강사님이 승인하면 이름과 전화번호 뒷자리로 로그인할 수 있어요.</p>
        <div className="field"><label htmlFor="su-cohort">기수</label><select className="input" id="su-cohort" name="cohort">{cos.map((c) => <option key={c.id} value={c.id}>{c.name} · {DB.date.fmtMD(c.startDate)} 시작</option>)}</select></div>
        <div className="field"><label htmlFor="su-name">이름</label><input className="input" id="su-name" name="name" autoComplete="name" placeholder="입금자명과 같게 적어 주세요" /></div>
        <div className="field"><label htmlFor="su-phone">전화번호 뒷자리</label><input className="input" id="su-phone" name="phone4" inputMode="numeric" maxLength="4" placeholder="숫자 4자리" /></div>
        <p className="field-error" id="su-error" role="alert">{err}</p>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || undefined}>신청하기</button></form>
    </DgModal>
  );
}
