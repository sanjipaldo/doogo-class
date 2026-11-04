"use client";
/* 두고클래스 로그인 · 회원가입 · 두잉고 VOD 강의실 고르기 — 예전 vod.js pageAuth(signup) · pageDg() 를 React 로 (Next.js 전환 4-4)
 *  · 위 탭 [두잉고 | 두고클래스]: 페이지를 옮기지 않고 그 자리에서 바꿔요 (주소는 ?tab=dg 로 기억)
 *  · 로그인 · 가입 · 두잉고 로그인 · 카카오 · 봇 막기(Turnstile)는 예전 처리 함수(VOD.doAuth · doDgLogin · kakaoStart · tsMount)를 그대로 불러요 */
import { useEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import Modal from "../lib/Modal.jsx";
import { VOD, hash, storeRoute, toast } from "../lib/legacy.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const LOGO = <img className="vd-logo-img" src="assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" />;
const KAKAO = '<path fill="currentColor" d="M12 3.6c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.7 4.8 4.3 6.1l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.4 0 .9.1 1.3.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3.6 12 3.6z"/>';
const DgLogo = () => (typeof window !== "undefined" && window.doinggoB ? <RawOne html={window.doinggoB("black", "vd-dg-logo")} /> : "두잉고");

function PwField({ name, ac, ph, label }) {
  const [show, setShow] = useState(false);
  return <span className="vd-pw"><input name={name} type={show ? "text" : "password"} autoComplete={ac} maxLength={40} placeholder={ph} /><button type="button" data-v="pw-eye" aria-label={show ? (label || "비밀번호") + " 숨기기" : (label || "비밀번호") + " 보기"} onClick={() => setShow(!show)}><Icon n={show ? "eyeOff" : "eye"} c="sm" /></button></span>;
}
function Pin() {
  const [show, setShow] = useState(false);
  return <span className="vd-pw"><input name="phone4" type={show ? "text" : "password"} inputMode="numeric" maxLength={4} autoComplete="off" placeholder="숫자 4자리" /><button type="button" data-v="pw-eye" aria-label={show ? "번호 숨기기" : "번호 보기"} onClick={() => setShow(!show)}><Icon n={show ? "eyeOff" : "eye"} c="sm" /></button></span>;
}

/* ---------- ‘두잉고’ 탭: 강사 고르기 → 이름 · 뒷자리 (두잉고 화면과 같은 app.js DG_LOGIN) ---------- */
function DgPane() {
  const L = typeof window !== "undefined" ? window.DG_LOGIN : null, [, bump] = useState(0), nameRef = useRef(null), focus = useRef(false);
  useEffect(() => { if (focus.current && nameRef.current) { nameRef.current.focus({ preventScroll: true }); focus.current = false; } });
  if (!L) return <p className="vd-dgl-lead">두잉고 로그인을 불러오지 못했어요. <a href="#/login">두잉고 로그인 화면</a>에서 로그인해 주세요.</p>;
  const list = L.list(), ins = list.find((x) => x.id === L.pick());
  const av = (x) => <span className={"vd-dgl-av" + (x.photo ? " ph" : "")}>{x.photo ? <img src={x.photo} alt="" decoding="async" /> : String(x.name || "?").slice(0, 1)}</span>;
  const pick = (id) => { L.setPick(id); focus.current = !!id; bump((v) => v + 1); };
  const submit = (e) => { e.preventDefault(); VOD().doDgLogin(e.currentTarget); };
  return (
    <>
      <div className="vd-dgl-logo">{typeof window !== "undefined" && window.doinggoB ? <RawOne html={window.doinggoB("black", "vd-dg-logo")} /> : <b>두잉고</b>}</div>
      <h1>두잉고 강의실<br />로그인</h1>
      <p className="vd-dgl-lead">기수 수강생은 수강 신청할 때 적은 <b>이름 · 전화번호 뒷자리</b>로 들어가요.</p>
      {ins
        ? <><div className="vd-dgl-picked">{av(ins)}<span className="vd-dgl-t"><small>수강 중인 강의</small><b>{ins.name}</b>{ins.title ? <em>{ins.title}</em> : null}</span><button type="button" className="vd-tl-btn" data-v="dgl-change" onClick={() => pick("")}>변경</button></div>
            <form className="vd-form" data-vd-dgl={ins.id} noValidate onSubmit={submit}>
              <label>이름<input ref={nameRef} name="name" autoComplete="name" maxLength={20} placeholder="예: 홍길동" /></label>
              <label>전화번호 뒷자리<Pin /></label>
              <p className="vd-err" id="vd-dgl-err" role="alert" /><button className="vd-btn vd-btn-p vd-btn-xl" type="submit">두잉고 강의실 로그인</button></form></>
        : <><p className="vd-dgl-q">어떤 강사님의 강의를 듣고 계신가요?</p><div className="vd-dgl-list">{list.map((x) => <button key={x.id} type="button" className="vd-dgl-ins" data-v="dgl-pick" data-id={x.id} onClick={() => pick(x.id)}>{av(x)}<span className="vd-dgl-t"><b>{x.name}</b>{x.field ? <small>{x.field}</small> : null}</span><Icon n="chevRight" c="sm" /></button>)}</div></>}
      <p className="vd-dgl-foot"><Icon n="alert" c="xs" /><span>두고클래스(VOD) 회원 계정과는 따로예요. DOOGO CLASS에서 VOD를 샀다면 위 <b>‘두고클래스’</b> 탭에서 로그인해 주세요.</span></p>
    </>
  );
}

/* ---------- 팝업: 비밀번호 찾기 · 자주 묻는 질문 ---------- */
const FAQ = [["두잉고 계정으로 로그인할 수 있나요?", "아니요. DOOGO CLASS는 VOD 수강생 계정을 따로 써요. 두잉고 기수 수강생은 두잉고 로그인을 이용해 주세요."], ["카카오로 가입했는데 이메일 로그인이 안 돼요.", "카카오로 가입한 계정은 ‘카카오로 1초 만에 시작하기’로 로그인해 주세요."], ["비밀번호를 잊었어요.", "로그인 화면의 ‘비밀번호 찾기’에서 가입한 이메일로 재설정 링크를 받을 수 있어요."]];
function PwFind({ onClose }) {
  return <Modal title="비밀번호 찾기" onClose={onClose}><div className="vd-modal-b vd-form"><p className="vd-muted">가입한 이메일을 적으면 비밀번호를 다시 정하는 링크를 보내 드려요.</p><label>이메일<input id="vd-find-mail" type="email" placeholder="example@doogoclass.com" /></label><button type="button" className="vd-btn vd-btn-p vd-btn-xl" data-v="pw-send" onClick={() => { onClose(); toast("시안이라 메일은 가지 않아요. 체험 계정 비밀번호는 vod예요."); }}>링크 보내기</button></div></Modal>;
}
const AuthFaq = ({ onClose }) => <Modal title="로그인 · 가입 자주 묻는 질문" onClose={onClose}><div className="vd-modal-b">{FAQ.map((f) => <details key={f[0]} className="vd-faq"><summary><b>Q</b><span>{f[0]}</span><Icon n="chevDown" c="sm" /></summary><p>{f[1]}</p></details>)}</div></Modal>;

/* ---------- 로그인 · 회원가입 ---------- */
function Auth({ signup, n }) {
  const X = VOD(), q = storeRoute().qs, ret = q.get("next") || "", nx = ret ? "?next=" + encodeURIComponent(ret) : "", toDg = ret === "#/vod/dg";
  const [dg, setDg] = useState(q.get("tab") === "dg"), [pop, setPop] = useState(null), formRef = useRef(null), cardRef = useRef(null);
  const page = signup ? "signup" : "login";
  // 주소의 ?tab= 이 바뀌면(뒤로 가기 · 링크) 따라가요
  useEffect(() => { setDg(storeRoute().qs.get("tab") === "dg"); }, [n]);
  // 봇 막기(Turnstile) — 두고클래스 탭이 보일 때 (예전 tsMount)
  useEffect(() => { if (!dg && cardRef.current) X.tsMount(cardRef.current); }, [dg, X]);
  // 칸을 다 채워야 버튼이 켜져요 (예전 authReady)
  useEffect(() => { if (formRef.current) X.authReady(formRef.current); });
  const sw = (k) => (e) => {
    e.preventDefault();
    const on = k === "dg", qs = new URLSearchParams(storeRoute().qs.toString()); if (on) qs.set("tab", "dg"); else qs.delete("tab");
    window.ROUTE.replace("#/vod/" + page + (qs.toString() ? "?" + qs.toString() : ""));
    setDg(on);
  };
  const ready = (e) => { const f = e.currentTarget; X.authReady(f); };
  const agreeAll = (e) => { const f = e.currentTarget.closest("form"); if (!f) return; f.agree.checked = e.currentTarget.checked; f.mkt.checked = e.currentTarget.checked; X.authReady(f); };
  return (
    <div className="vd-auth"><div className="vd-auth-card" ref={cardRef} data-svc={dg ? "dg" : "vod"}>
      <div className="lg-svc" role="tablist" aria-label="로그인할 곳 고르기"><a role="tab" className={"lg-svc-dg" + (dg ? " on" : "")} href={"#/vod/" + page + "?tab=dg"} data-v="svc" data-k="dg" aria-selected={String(dg)} onClick={sw("dg")}><b>두잉고</b><small>기수 수강생 · 강사 강의실</small></a><a role="tab" className={"lg-svc-vod" + (dg ? "" : " on")} href={"#/vod/" + page} data-v="svc" data-k="vod" aria-selected={String(!dg)} onClick={sw("vod")}><b>두고클래스</b><small>VOD 구매 회원 · 이메일 로그인</small></a></div>
      <div className="vd-svc-pane" data-pane="dg" hidden={!dg}>{dg ? <DgPane /> : null}</div>
      <div className="vd-svc-pane" data-pane="vod" hidden={dg}>{LOGO}
        {toDg ? <div className="vd-auth-dg"><span className="vd-dg-ic"><DgLogo /></span><div><b>로그인하면 두잉고 VOD 강의실로 바로 들어가요</b><small>DOOGO CLASS에서 VOD를 살 때 가입한 이메일 · 비밀번호(또는 카카오)로 로그인해 주세요. 두잉고 기수 수강생은 왼쪽 ‘두잉고’ 탭이에요.</small></div></div> : null}
        <h1>{signup ? <>돈 되는 배움의 시작,<br />DOOGO CLASS 회원가입</> : <>돈 되는 배움,<br />DOOGO CLASS.</>}</h1>
        <button type="button" className="vd-kakao" data-v="kakao" onClick={() => X.kakaoStart()}><svg viewBox="0 0 24 24" aria-hidden="true" className="vd-kk-ic" dangerouslySetInnerHTML={{ __html: KAKAO }} />카카오로 1초 만에 {signup ? "가입하기" : "시작하기"}</button>
        <div className="vd-or"><span>또는 이메일로 {signup ? "가입" : "로그인"}</span></div>
        <form ref={formRef} className="vd-form" data-vd-auth={page} data-next={ret} noValidate onSubmit={(e) => { e.preventDefault(); X.doAuth(e.currentTarget); }} onInput={ready} onChange={ready}>
          {signup ? <label>이름<input name="name" autoComplete="name" maxLength={20} placeholder="이름을 입력해 주세요" /></label> : null}
          <label>이메일<input name="email" type="email" autoComplete="email" maxLength={80} placeholder="example@doogoclass.com" /></label>
          {signup ? <label>휴대폰 번호<input name="phone" type="tel" inputMode="tel" maxLength={20} placeholder="010-0000-0000" /></label> : null}
          <label>비밀번호<PwField name="pw" ac={signup ? "new-password" : "current-password"} ph={signup ? "영문 · 숫자 섞어 8자 이상" : "비밀번호를 입력해 주세요"} /></label>
          {signup ? <><label>비밀번호 확인<PwField name="pw2" ac="new-password" ph="비밀번호를 한 번 더 입력해 주세요" /></label><div className="vd-agrees"><label className="vd-agree vd-agree-all"><input type="checkbox" data-v="agree-all" onChange={agreeAll} /><span>전체 동의</span></label><label className="vd-agree"><input type="checkbox" name="agree" /><span>(필수) 만 14세 이상이며, 이용약관 · 개인정보 수집 · 이용에 동의해요</span></label><label className="vd-agree"><input type="checkbox" name="mkt" /><span>(선택) 할인 · 새 클래스 소식 받기 (문자 · 이메일 · 카카오톡)</span></label></div></>
            : <div className="vd-find"><button type="button" className="vd-tl-btn" data-v="pw-find" onClick={() => setPop("find")}>비밀번호 찾기</button></div>}
          <div className="vd-ts" data-ts="" /><p className="vd-err" id="vd-auth-err" role="alert" /><button className="vd-btn vd-btn-p vd-btn-xl" type="submit" disabled>{signup ? "가입하기" : "로그인"}</button></form>
        {signup ? <p className="vd-auth-alt">이미 회원이신가요? <a href={"#/vod/login" + nx}>로그인</a></p> : <><a className="vd-btn vd-btn-line vd-btn-xl" href={"#/vod/signup" + nx}>이메일로 회원가입</a>{X.V().settings.demoLogin === false ? null : <p className="vd-auth-demo">체험 계정 · vod@gmail.com / vod</p>}</>}
        {signup ? <p className="vd-auth-gift"><span className="vd-ag-ic"><Icon n="gift" c="sm" /></span><span className="vd-ag-t"><b>가입하면 5,000원 할인 쿠폰을 바로 드려요</b><small>가입일부터 30일 동안 쓸 수 있어요</small></span></p> : null}
      </div></div>
      <p className="vd-auth-faq">로그인 · 가입에 문제가 있나요? <button type="button" data-v="auth-faq" onClick={() => setPop("faq")}>자주 묻는 질문</button></p>
      <p className="vd-auth-note"><Icon n="alert" c="xs" />두잉고 기수 수강생 계정과는 따로예요. 기수 수강생은 위 <a href={"#/vod/" + page + "?tab=dg"} data-v="svc" data-k="dg" onClick={sw("dg")}>‘두잉고’ 탭</a>에서 로그인해 주세요.</p>
      {pop === "find" ? <PwFind onClose={() => setPop(null)} /> : pop === "faq" ? <AuthFaq onClose={() => setPop(null)} /> : null}
    </div>
  );
}

/* ---------- 두잉고 VOD 강의실 고르기 (#/vod/dg) ---------- */
function DgPick({ m }) {
  const X = VOD(), list = X.dgList(m);
  useEffect(() => { if (list.length === 1) { const t = setTimeout(() => X.enterDg(list[0].id), 0); return () => clearTimeout(t); } return undefined; }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (list.length === 1) return <div className="vd-wrap vd-dgp"><p className="vd-dgp-wait">{list[0].title} 강의실로 들어가는 중…</p></div>;
  return (
    <div className="vd-wrap vd-dgp"><div className="vd-dgp-h"><span className="vd-dg-ic"><DgLogo /></span><h1>{m.name}님, 어느 강의실로 들어갈까요?</h1><p>VOD마다 두잉고 강의실이 따로 있어요. 강의 영상 · 자료 · 업데이트 소식 · FAQ가 강의별로 정리돼 있어요.</p></div>
      {list.length ? <div className="vd-dgp-g">{list.map((p) => { const pc = X.pctDone(m.id, p.id); return <button key={p.id} type="button" className="vd-dgp-c" data-v="dg" data-p={p.id} onClick={() => X.enterDg(p.id, "")}><span className="vd-dgp-th vd-thumb vd-th-vod"><RawOne html={X.thumbArt(p)} /></span><span className="vd-dgp-t"><small>{p.creator} 강사 두잉고</small><b>{p.title}</b><span className="vd-dgp-bar"><i style={{ width: pc + "%" }} /></span><em>진도 {pc}% · {pc ? "이어 보기" : "1강부터 시작"}</em></span><Icon n="arrowRight" c="sm" /></button>; })}</div>
        : <div className="vd-empty"><Icon n="monitorPlay" /><b>두잉고 강의실이 열린 VOD가 아직 없어요</b><p>VOD를 사면 그 강사님의 두잉고 강의실이 열려요. 전자책은 마이페이지에서 바로 내려받아요.</p><a className="vd-btn vd-btn-p" href="#/vod/c/all?tab=vod">VOD 둘러보기</a><a className="vd-btn vd-btn-o" href="#/vod/my/classes">내 강의실</a></div>}
    </div>
  );
}

export default function AuthPage({ n, moved }) {
  const X = VOD(), r = storeRoute(), a = r.path[0], m = X.me(), q = r.qs;
  // #/vod/login?next=#/vod/dg 에 로그인한 채로 오면 강의실 고르기 · #/vod/dg 에 로그인 없이 오면 로그인으로 (예전과 같음)
  const dgView = a === "dg" || (a === "login" && q.get("next") === "#/vod/dg" && m && q.get("tab") !== "dg");
  const away = dgView && !m ? "#/vod/login?next=" + encodeURIComponent("#/vod/dg") : "";
  useEffect(() => { if (away) window.ROUTE.redirect(away); }, [away]);
  useEffect(() => {
    if (away) return;
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, away, moved]);
  if (away) return null;
  return <Shell nav="" tab={dgView ? "cls" : ""} n={n}>{dgView ? <DgPick m={m} /> : <Auth key={a} signup={a === "signup"} n={n} />}</Shell>;
}
