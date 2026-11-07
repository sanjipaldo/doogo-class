"use client";
/* 두고클래스 스토어 틀 — 머리띠(로고 · 서비스 바꾸기 · 검색 · 내 강의실 · 찜 · 내 계정) · 전체 카테고리 펼침 메뉴 · 바닥 · 휴대폰 아래 메뉴
 * 예전 vod.js 의 header() · megaHtml() · footer() · tabbar() · shell() · drawer() · acctBody() 를 React 로 옮긴 것 (모양 · 글자 · 주소 그대로 — Next.js 전환 4-4) */
import { useEffect, useRef, useState, useCallback } from "react";
import Icon from "../lib/Icon.jsx";
import Raw from "../lib/Raw.jsx";
import Modal from "../lib/Modal.jsx";
import { VOD, DB, storeRoute, go, toast } from "../lib/legacy.js";

const LOGO_SRC = "assets/brand/doogo-class-word.svg";
const BOOK = '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>';
const KAKAO = '<path fill="currentColor" d="M12 3.6c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.7 4.8 4.3 6.1l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.4 0 .9.1 1.3.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3.6 12 3.6z"/>';
const SW_DG = '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.2c2.4.2 4.2 1.8 4.7 4.8"/>';
const SW_VOD = '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor" stroke="none"/>';

export function KakaoBtn({ cls, label }) {
  return <a className={cls} href={VOD().opsKk().chat} target="_blank" rel="noopener" data-kk-ops=""><svg viewBox="0 0 24 24" aria-hidden="true" className="vd-kk-ic" dangerouslySetInnerHTML={{ __html: KAKAO }} /><span>{label || "문의하기"}</span></a>;
}

/* 두잉고 | DOOGO CLASS 바꾸기 — 지난번에 있던 쪽에서 지금 쪽으로 손잡이가 미끄러져요 (예전 siteSw · swWire) */
function SiteSwitch({ on }) {
  const ref = useRef(null);
  const [prev] = useState(() => { const X = VOD(), v = X.ss.get(X.SW_KEY); const p = v === "vod" ? "vod" : v === "dg" ? "dg" : on; X.ss.set(X.SW_KEY, on); return p; });
  useEffect(() => {
    const n = ref.current; if (!n) return undefined;
    const place = (w) => { const a = n.querySelectorAll("a")[w === "vod" ? 1 : 0]; if (!a) return; n.style.setProperty("--kx", a.offsetLeft + "px"); n.style.setProperty("--kw", a.offsetWidth + "px"); };
    let raf = 0;
    const t = setTimeout(() => {
      if (n.__sw || !n.offsetWidth) return; n.__sw = 1;
      n.classList.add("no-anim"); place(n.dataset.from); n.classList.add("ready"); void n.offsetWidth; n.classList.remove("no-anim");
      raf = requestAnimationFrame(() => { raf = requestAnimationFrame(() => { place(n.dataset.to); n.classList.remove("at-dg", "at-vod"); n.classList.add("at-" + n.dataset.to); }); });
    }, 30);
    const onRs = () => { if (!n.classList.contains("ready")) return; n.classList.add("no-anim"); place(n.dataset.to); void n.offsetWidth; n.classList.remove("no-anim"); };
    window.addEventListener("resize", onRs);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (n.classList.contains("ready")) place(n.dataset.to); });
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener("resize", onRs); };
  }, []);
  return (
    <nav ref={ref} className={"site-sw at-" + prev} data-from={prev} data-to={on} aria-label="서비스 바꾸기"><i className="site-sw-k" aria-hidden="true" />
      <a href="#/doinggo" className={on === "dg" ? "on" : ""} aria-current={on === "dg" ? "page" : undefined}><span className="site-sw-ic"><svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SW_DG }} /></span>두잉고</a>
      <a href="#/vod" className={on === "vod" ? "on" : ""} aria-current={on === "vod" ? "page" : undefined}><span className="site-sw-ic"><svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SW_VOD }} /></span>두고클래스</a></nav>
  );
}

function SearchForm({ cls, value, onDone }) {
  const submit = (e) => { e.preventDefault(); const q = e.currentTarget.q.value.trim(); if (onDone) onDone(); go("#/vod/search?q=" + encodeURIComponent(q)); };
  return (
    <form className={cls} data-vd-search="" role="search" onSubmit={submit}>
      <input name="q" type="search" placeholder="어떤 부업을 배워 볼까요?" defaultValue={value} aria-label="클래스 검색" autoComplete="off" />
      <button type="submit" aria-label="검색"><Icon n="search" c="sm" /></button>
    </form>
  );
}

/* ---------- PC 전체 카테고리 펼침 메뉴 ---------- */
function MegaMain({ k }) {
  const X = VOD(), all = !k || k === "all", c = all ? null : X.catOf(k), ls = X.listed().filter((p) => all || p.cat === k), base = "#/vod/c/" + (all ? "all" : encodeURIComponent(k));
  const soon = X.V().products.filter((p) => p.status === "soon" && X.bizShow(p) && (all || p.cat === k)).length;
  const kinds = X.MG_KINDS.map((x) => [x, ls.filter((p) => X.mgKind(p) === x[0]).length]).filter((x) => x[1]);
  const top = X.sortList(ls, "pop").slice(0, 6);
  return (
    <div className="vd-mg-main" aria-live="polite">
      <div className="vd-mg-h"><div><small>{all ? "DOOGO CLASS" : "분야별 클래스"}</small><b>{all ? "전체 클래스" : c.label}</b>{ls.length ? <em>{ls.length}개 클래스</em> : null}</div>
        <a className="vd-mg-more" href={base}>{all ? "전체 클래스" : c.label} 전체보기<Icon n="arrowRight" c="xs" /></a></div>
      {kinds.length || soon ? <div className="vd-mg-kinds">{kinds.map((x) => <a key={x[0][0]} href={base + "?tab=" + x[0][0]}><Icon n={x[0][2]} c="xs" />{x[0][1]}<i>{x[1]}</i></a>)}{soon ? <a href="#/vod/c/soon"><Icon n="bell" c="xs" />오픈 예정<i>{soon}</i></a> : null}</div> : null}
      {top.length ? <><p className="vd-mg-sub">{all ? "지금 많이 듣는 클래스" : "이 분야 인기 클래스"}</p><div className="vd-mg-list">{top.map((p) => <a key={p.id} className="vd-mg-it" href={"#/vod/p/" + p.id}><Raw className="vd-mg-th" html={X.thumbArt(p)} /><span className="vd-mg-tx"><b>{p.title}</b><small>{(p.creator || "") + (p.creator ? " · " : "") + X.TYPE[X.typeOf(p)][0]}</small></span></a>)}</div></>
        : <div className="vd-mg-empty"><Icon n="sparkles" c="sm" /><div><b>{all ? "클래스를 준비하고 있어요" : c.label + " 클래스를 준비하고 있어요"}</b><p>곧 열릴 클래스는 ‘오픈 예정’에서 알림을 받아 볼 수 있어요.</p></div></div>}
    </div>
  );
}
function Mega({ cat, onPick }) {
  const X = VOD(), cs = X.cats(), k = cat && (cat === "all" || cs.some((c) => c.key === cat)) ? cat : "all", ls = X.listed();
  const timer = useRef(0);
  const hover = (key) => { clearTimeout(timer.current); timer.current = setTimeout(() => onPick(key), 80); };
  const row = (key, label, ic, n) => (
    <a key={key} className={"vd-mg-cat" + (key === k ? " on" : "")} href={"#/vod/c/" + (key === "all" ? "all" : encodeURIComponent(key))} data-mg-cat={key}
      onMouseOver={() => hover(key)} onMouseOut={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) clearTimeout(timer.current); }} onFocus={() => onPick(key)}>
      <span className="vd-mg-ci">{X.MG_IMG[key] ? <img src={X.tileImg(key)} alt="" loading="lazy" /> : <Icon n={ic || "layers"} c="sm" />}</span><span>{label}</span>{n ? <em>{n}</em> : null}<Icon n="chevRight" c="xs" /></a>
  );
  const goLink = (h, ic, t, d) => <a key={h} className="vd-mg-go" href={h}><Icon n={ic} c="sm" /><span><b>{t}</b>{d ? <small>{d}</small> : null}</span></a>;
  return (
    <div className="vd-mega" id="vd-mega" role="region" aria-label="전체 카테고리"><div className="vd-wrap vd-mg-in">
      <nav className="vd-mg-cats" aria-label="분야"><p className="vd-mg-cap">분야</p>{row("all", "전체 클래스", "layers", ls.length)}{cs.map((c) => row(c.key, c.label, c.icon, ls.filter((p) => p.cat === c.key).length))}</nav>
      <MegaMain k={k} />
      <aside className="vd-mg-side"><p className="vd-mg-cap">바로가기</p>{goLink("#/vod/c/soon", "bell", "오픈 예정", "알림 신청하면 오픈 할인")}{goLink("#/vod/teachers", "users", "강사진", "직접 해서 번 강사님들")}{X.bizOn("flive") ? goLink("#/vod/c/all?tab=flive", "video", "무료 LIVE", "") : null}{goLink("#/vod/my/classes", "monitorPlay", "내 강의실", "")}{goLink("#/vod/about", "store", "DOOGO CLASS 소개", "")}
        <a className="vd-mg-pt" href="#/vod/partners"><small>DOOGO PARTNERS</small><b>내 노하우로<br />클래스를 열어 보세요</b><span>파트너 강사로 지원하기<Icon n="arrowRight" c="xs" /></span></a></aside>
    </div></div>
  );
}

/* ---------- 내 계정 메뉴 · 전체 메뉴 (팝업) ---------- */
function useLogout(close) {
  return useCallback(() => {
    close();
    VOD().logoutAll().then(() => { toast("로그아웃했어요."); go("#/vod"); });
  }, [close]);
}
function AcctMenu({ m, onClose }) {
  const { d, cps } = VOD().acctCounts(m), logout = useLogout(onClose);
  const link = (h, ic, t, n) => <a key={h} href={h} data-v="close"><Icon n={ic} c="sm" /><span>{t}</span>{n ? <em>{n}</em> : null}<Icon n="chevRight" c="xs" /></a>;
  return (
    <Modal title="내 계정" cls="vd-modal-acct" onClose={onClose}>
      <div className="vd-acct-in">
        <div className="vd-acct-hd"><span className="vd-me-av lg">{m.name.slice(0, 1)}</span><div><b>{m.name}님, 안녕하세요</b><small>{m.email || ""}</small></div></div>
        <div className="vd-acct-st">
          <a href="#/vod/my/classes" data-v="close"><b>{d.mine.length}</b><small>내 강의</small></a>
          <a href="#/vod/my/coupons" data-v="close"><b>{cps}</b><small>쿠폰</small></a>
          <a href="#/vod/my/points" data-v="close"><b>{(Number(m.points) || 0).toLocaleString()}P</b><small>포인트</small></a></div>
        <nav className="vd-acct-ls" aria-label="내 계정">{link("#/vod/my/classes", "monitorPlay", "내 강의실")}{link("#/vod/my/likes", "heart", "찜한 클래스", d.likes.length || "")}{link("#/vod/my/orders", "file", "주문 · 결제 내역", d.pending.length ? "입금 대기 " + d.pending.length : "")}{link("#/vod/my/account", "user", "회원 정보 수정")}{link("#/vod/my/help", "headset", "고객센터 · 1:1 문의")}{link("#/vod/my", "grid", "마이페이지 전체")}</nav>
        <button type="button" className="vd-acct-out" data-v="logout" onClick={logout}><Icon n="logout" c="sm" />로그아웃</button></div>
    </Modal>
  );
}
/** 메뉴 한 줄 아이콘: 3D 카테고리 그림(img) 또는 색 칩(tone) — 예전 drIc */
function DrIc({ x }) {
  return <i className={"vd-dr-ic " + (x.img ? "is-3d" : "t-" + x.tone)} aria-hidden="true">{x.img ? <img src={VOD().tileImg(x.img)} alt="" loading="lazy" /> : <Icon n={x.ic} c="sm" />}</i>;
}
/** 전체 메뉴 (휴대폰은 화면 전체) — 무엇을 보여 줄지는 예전 화면과 같은 VOD.drawerSecs */
function Drawer({ m, onClose }) {
  const X = VOD(), logout = useLogout(onClose);
  const it = (x) => (x.out ? <button key="out" type="button" className="vd-dr-it" data-v="logout" onClick={logout}><DrIc x={x} /><span>{x.t}</span></button>
    : x.kk ? <a key={x.h} className="vd-dr-it" href={x.h} target="_blank" rel="noopener" data-kk-ops=""><DrIc x={x} /><span>{x.t}</span></a>
    : <a key={x.h} className="vd-dr-it" href={x.h} data-v="close"><DrIc x={x} /><span>{x.t}</span></a>);
  return (
    <Modal title="전체 메뉴" cls="vd-modal-drawer" onClose={onClose}>
      <div className="vd-drawer">
        <SearchForm cls="vd-search vd-dr-search" value={undefined} onDone={onClose} />
        {m ? <a className="vd-dr-me" href="#/vod/my" data-v="close"><span className="vd-me-av lg">{m.name.slice(0, 1)}</span><div><b>{m.name} 님</b><small>{m.email} · {(Number(m.points) || 0).toLocaleString()}P</small></div><Icon n="chevRight" c="sm" /></a> : <a className="vd-btn vd-btn-p vd-btn-xl" href="#/vod/login" data-v="close">로그인 · 회원가입</a>}
        {X.drawerSecs(m).map((s) => <div key={s[0]} className="vd-dr-sec"><p>{s[0]}</p>{s[1].map(it)}</div>)}
      </div>
    </Modal>
  );
}
function LegalModal({ k, onClose }) {
  const lg = VOD().legalDoc(k);
  return <Modal title={lg.title} onClose={onClose}><Raw as="div" className="vd-modal-b vd-legal" html={lg.html} /></Modal>;
}

/* ---------- 머리띠 ---------- */
function Header({ nav, open }) {
  const X = VOD(), m = X.me(), r = storeRoute();
  const [mega, setMega] = useState(null); // 펼친 분야 키 (닫히면 null)
  const topRef = useRef(null);
  // 펼침 메뉴: 안의 링크를 누르면 닫고 이동 · 머리띠의 다른 곳은 닫고 그대로 · 어둡게 가린 아래 화면을 누르면 닫기만 (밑의 카드가 눌리지 않게) — 예전과 같음
  useEffect(() => {
    if (mega === null) return undefined;
    const onDoc = (e) => {
      if (e.target.closest(".vd-allcat")) return;
      if (e.target.closest("#vd-mega")) { if (e.target.closest("a")) setMega(null); return; }
      const inTop = e.target.closest(".vd-top"); setMega(null);
      if (!inTop && !e.target.closest("#modal-root")) { e.preventDefault(); e.stopPropagation(); }
    };
    const onKey = (e) => { if (e.key === "Escape") setMega(null); };
    document.addEventListener("click", onDoc, true); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc, true); document.removeEventListener("keydown", onKey); };
  }, [mega]);
  const megaBtn = (e) => {
    if (window.innerWidth < 1024) { open("drawer"); return; }
    if (mega !== null) { setMega(null); return; }
    const rp = r.path; setMega(rp[0] === "c" && X.cats().some((x) => x.key === rp[1]) ? rp[1] : "all");
    if (e.detail === 0) setTimeout(() => { const f = document.querySelector("#vd-mega .vd-mg-cat.on"); if (f) f.focus(); }, 0);
  };
  return (
    <header ref={topRef} className={"vd-top" + (mega !== null ? " mg-on" : "")}><div className="vd-wrap vd-top-in">
      <a className="vd-logo" href="#/vod" aria-label="DOOGO CLASS 홈"><img fetchPriority="high" className="vd-logo-img" src={LOGO_SRC} alt="DOOGO CLASS" /></a><SiteSwitch on="vod" />
      <SearchForm cls="vd-search" value={r.path[0] === "search" ? r.qs.get("q") || "" : ""} />
      <div className="vd-top-r">
        <a className={"vd-ptl vd-ic-pc" + (nav === "partners" ? " on" : "")} href="#/vod/partners">두고 파트너스{nav === "partners" ? null : <span className="vd-ptl-tip" aria-hidden="true">파트너 강사로 지원하기</span>}</a>
        <a className="vd-tl vd-ic-pc" href="#/vod/my/classes" aria-label="내 강의실" title="내 강의실"><svg className="icon sm" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BOOK }} /><span>내 강의실</span></a>
        <a className="vd-ic vd-ic-pc" href="#/vod/my/likes" aria-label="찜한 강의" title="찜한 강의"><Icon n="heart" c="sm" /></a>
        {m ? <button type="button" className="vd-acct" data-v="acct" aria-haspopup="dialog" aria-label={m.name + "님 내 계정 메뉴"} onClick={() => open("acct")}><span className="vd-me-av">{m.name.slice(0, 1)}</span><span className="vd-acct-n"><small>안녕하세요</small><b>{m.name}님</b></span><Icon n="chevDown" c="xs" /></button>
          : <a className="vd-login" href="#/vod/login"><span className="vd-ic-pc">로그인 · 회원가입</span><span className="vd-m-only">로그인</span></a>}
      </div></div>
      <nav className="vd-nav" aria-label="메뉴"><div className="vd-wrap vd-nav-in"><div className="vd-nav-l"><button type="button" className="vd-allcat" data-v="mega" aria-haspopup="true" aria-expanded={mega !== null ? "true" : "false"} aria-controls="vd-mega" onClick={megaBtn}><Icon n="menu" c="sm" /><span>전체 카테고리</span></button>
        {X.NAV.filter((x) => !x[3] || X.bizOn(x[3])).map((x) => <a key={x[0]} href={x[1]} className={nav === x[0] ? "on" : ""}>{x[2]}</a>)}
      </div><div className="vd-nav-r"><a href="#/vod/about" className={nav === "about" ? "on" : ""}>DOOGO CLASS 소개</a><a href="#/doinggo">두잉고</a><a href="#/center" className="vd-nav-ct">강사센터</a><KakaoBtn cls="vd-nav-kk" label="문의하기" /></div></div></nav>
      {mega !== null ? <Mega cat={mega} onPick={setMega} /> : null}
    </header>
  );
}

/* ---------- 바닥 ---------- */
function Footer({ open }) {
  const X = VOD(), S = DB().siteInfo ? DB().siteInfo() : { company: "(주)두고홀딩스" };
  const bizDigits = String(S.bizNo || "").replace(/[^0-9]/g, "");
  const tel = (v) => <a href={"tel:" + String(v).replace(/[^0-9+]/g, "")}>{v}</a>;
  const biz = [S.ceo && ["대표", S.ceo], S.bizNo && ["사업자등록번호", S.bizNo], S.mailOrderNo && ["통신판매업신고", S.mailOrderNo], S.address && ["주소", S.address], S.phone && ["고객센터", tel(S.phone)], S.email && ["이메일", <a href={"mailto:" + S.email}>{S.email}</a>], S.privacyOfficer && ["개인정보 보호책임자", S.privacyOfficer], ["호스팅 제공자", S.hosting || "Vercel Inc."]].filter(Boolean);
  const col = (t, items) => <div className="vd-gf-col" key={t}><b>{t}</b>{items.map((x) => <a key={x[0]} href={x[0]}>{x[1]}</a>)}</div>;
  const mq = (i) => [<span key={i + "a"}>YOUR SUCCESS</span>, <i key={i + "b"}>✳</i>, <span key={i + "c"} className="o">DOOGO CLASS</span>, <i key={i + "d"}>✳</i>];
  const kinds = ["VOD", X.bizOn("ebook") && "전자책", (X.bizOn("live") || X.bizOn("flive")) && "LIVE"].filter(Boolean).join(" · ");
  const LN = typeof window !== "undefined" ? window.CLASS_LEGAL_NOTICE : null;
  return (
    <footer className="vd-gf"><div className="vd-gf-mq" aria-hidden="true"><div className="vd-gf-mq-t">{[0, 1, 2, 3, 4, 5].map(mq)}</div></div>
      <div className="vd-wrap"><div className="vd-gf-top"><div className="vd-gf-brand"><img className="vd-logo-img" src={LOGO_SRC} alt="DOOGO CLASS" /><p>돈 되는 노하우를 {kinds}{/책$/.test(kinds) ? "으로" : "로"}.<br />직접 해서 번 사람에게 배워요.</p>
        <div className="vd-gf-login" aria-label="로그인 바로가기"><small>로그인 바로가기</small>{[["#/center/login", "monitorPlay", "강사센터 로그인", "강사 · 코치 · 파트너"], ["#/login", "users", "수강생 로그인", "두잉고 기수 강의실"]].map((x) => <a key={x[0]} className="vd-gf-lg" href={x[0]}><span className="vd-gf-lg-ic"><Icon n={x[1]} c="sm" /></span><span><b>{x[2]}</b><em>{x[3]}</em></span><Icon n="arrowUpRight" c="xs" /></a>)}</div></div>
        <nav className="vd-gf-grid" aria-label="바로가기">
          {col("클래스", [["#/vod", "돈되는 클래스"], ["#/vod/c/all?tab=vod", "VOD 강의"], X.bizOn("ebook") && ["#/vod/c/all?tab=ebook", "전자책"], X.bizOn("flive") && ["#/vod/c/all?tab=flive", "무료 LIVE"], X.bizOn("live") && ["#/vod/c/all?tab=premium", "LIVE · 오프라인 강의"], X.bizOn("free") && ["#/vod/c/all?tab=free", "무료강의"], ["#/vod/teachers", "강사진"], ["#/vod/c/soon", "오픈 예정"]].filter(Boolean))}
          {col("마이페이지", [["#/vod/my/classes", "내 강의실"], ["#/vod/my/coupons", "쿠폰"], ["#/vod/my/orders", "주문 · 결제 내역"], ["#/vod/my/account", "회원 정보 수정"]])}
          {col("DOOGO CLASS", [["#/vod/about", "DOOGO CLASS 소개"], ["#/vod/partners", "두고 파트너스 (강사 지원)"], ["#/doinggo", "두잉고 (강의 운영 시스템)"], ["#/center", "강사센터"]])}
        </nav>
        <div className="vd-gf-help"><b>도움이 필요하신가요?</b><p>수강 · 결제 · 환불 문의를 남겨 주시면<br />영업일 기준 하루 안에 답해 드려요.</p><div className="vd-gf-hbtn"><a className="vd-btn vd-btn-p" href="#/vod/my/help">1:1 문의하기 <Icon n="arrowRight" c="xs" /></a><KakaoBtn cls="vd-btn vd-btn-kakao" label="카카오톡 상담" /></div>
          {S.phone || S.hours ? <p className="vd-gf-cs">{S.phone ? <b>{tel(S.phone)}</b> : null}{S.hours ? <small>{S.hours}</small> : null}</p> : null}</div></div>
      <div className="vd-gf-bot"><div className="vd-gf-biz"><strong>{S.company || "(주)두고홀딩스"}</strong><dl>{biz.map((x) => <div key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></div>)}</dl>{S.notice ? <p>{S.notice}</p> : null}
        {LN ? <p className="vd-gf-lnote">{LN.date}부터 <a href="#/terms">이용약관</a> · <a href="#/privacy">개인정보처리방침</a>이 일부 바뀌어요. 바뀌는 내용은 각 페이지 맨 위 개정 안내에서 볼 수 있어요.</p> : null}
        <p className="vd-gf-copy">© 2026 {S.company || "(주)두고홀딩스"}. All rights reserved.</p></div>
        <nav className="vd-gf-links" aria-label="약관"><a href="#/terms">이용약관</a><a href="#/privacy"><strong>개인정보처리방침</strong></a><a href="#/refund">환불정책</a><button type="button" data-v="legal" data-k="oss" onClick={() => open("legal:oss")}>오픈소스 라이선스</button>{bizDigits.length === 10 ? <a href={"https://www.ftc.go.kr/bizCommPop.do?wrkr_no=" + bizDigits} target="_blank" rel="noopener">사업자정보확인</a> : null}<a href="#/vod/partners">두고 파트너스 · 입점 문의</a></nav></div></div></footer>
  );
}

/* ---------- 휴대폰 아래 메뉴 ---------- */
function Tabbar({ on, open }) {
  const T = [["menu", "", "menu", "메뉴"], ["likes", "#/vod/my/likes", "heart", "찜"], ["home", "#/vod", "home", "홈"], ["cls", "#/vod/my/classes", "monitorPlay", "내 강의실"], ["my", "#/vod/my", "user", "마이"]];
  return (
    <nav className="vd-tabbar" aria-label="아래 메뉴">{T.map((t) => t[0] === "menu"
      ? <button key="menu" type="button" data-v="drawer" aria-label="전체 메뉴 · 검색" onClick={() => open("drawer")}><Icon n={t[2]} c="sm" /><span>{t[3]}</span></button>
      : <a key={t[0]} href={t[1]} className={(t[0] === "home" ? "vd-tab-home " : "") + (on === t[0] ? "on" : "")} aria-current={on === t[0] ? "page" : undefined}>{t[0] === "home" ? <i className="vd-tab-hc"><Icon n={t[2]} c="sm" /></i> : <Icon n={t[2]} c="sm" />}<span>{t[3]}</span></a>)}</nav>
  );
}

/** 스토어 화면 틀 (예전 shell(nav, body, tab, cls)) — 머리띠 · 본문 · 바닥 · 아래 메뉴 + 팝업(내 계정 · 전체 메뉴 · 약관) */
export default function Shell({ nav, tab, cls, n, children }) {
  const [pop, setPop] = useState(null);
  const close = useCallback(() => setPop(null), []);
  // 주소를 옮기거나 다시 그릴 때 팝업은 닫아요 (예전 main.js 가 modal-root 를 비우던 것)
  useEffect(() => { setPop(null); }, [n]);
  // 내려가면 머리띠 그림자 · 마이페이지 메뉴 줄이 머리띠 아래에 붙으면 아래쪽 그림자 (예전 vod.js scroll)
  useEffect(() => {
    const onSc = () => {
      const t = document.querySelector(".vd-top"); if (t) t.classList.toggle("is-sc", window.scrollY > 8);
      const nv = document.querySelector(".vd-my-nav"); if (nv && t) nv.classList.toggle("stuck", nv.scrollWidth > nv.clientWidth + 1 && Math.abs(nv.getBoundingClientRect().top - t.getBoundingClientRect().bottom) < 2 && window.scrollY > 8);
    };
    onSc(); window.addEventListener("scroll", onSc, { passive: true });
    return () => window.removeEventListener("scroll", onSc);
  }, []);
  const m = VOD().me();
  return (
    <div className={"vd" + (cls ? " " + cls : "")}>
      <Header nav={nav} open={setPop} />
      <main className="vd-main">{children}</main>
      <Footer open={setPop} />
      <Tabbar on={tab || ""} open={setPop} />
      {pop === "acct" && m ? <AcctMenu m={m} onClose={close} /> : null}
      {pop === "drawer" ? <Drawer m={m} onClose={close} /> : null}
      {pop && pop.indexOf("legal:") === 0 ? <LegalModal k={pop.slice(6)} onClose={close} /> : null}
    </div>
  );
}
