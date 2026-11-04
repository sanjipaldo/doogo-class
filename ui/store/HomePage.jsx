"use client";
/* 스토어 홈 (/vod) — 예전 vod.js pageHome 을 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  배너(끝에서 처음으로 같은 방향으로 이어져요 · 5초마다 · 멈춤 · 휴대폰 밀기) → 카테고리 아이콘(없으면 분야 알약)
 *  → 홈 화면 섹션 (마스터 › 홈 꾸미기 순서 · 켜기): BEST · 학습 시스템 · 전자책 · 분야별 탭 · NEW · 무료 LIVE · 얼리버드 · 프리미엄 · 무료 · 오픈 예정 · 다루는 부업 · 강사진
 *  · 어떤 배너 · 섹션 · 클래스를 어떤 순서로 보여 줄지는 예전 계산 그대로 (VOD.liveBanners · homeRails · railItems · catTabs · teachHome)
 *  · 배너 몇 번째 · 멈춤 · 고른 분야 탭은 예전처럼 다른 화면에 다녀와도 남아요 (VOD.homeUi)
 *  · 검색 · 공유 미리보기는 서버가 예전처럼 넣어요 (app/(react)/layout.js → pagemeta) */
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import Card, { AnyCard } from "./Card.jsx";
import { TcCard } from "./TeachersPage.jsx";
import { Pager } from "./ListPage.jsx";
import SysMock from "./Mocks.jsx";
import Icon from "../lib/Icon.jsx";
import { Eg, useMotion } from "../lib/motion.jsx";
import { VOD, toast } from "../lib/legacy.js";
import { usePageLike } from "./pageActs.js";

const TITLE = "배움이 기회가 되는 곳, 두고클래스 | 온라인 클래스";
const TAGC = { red: "red", blue: "blue", pink: "pink", yellow: "yellow", orange: "orange", green: "green" };
const PAUSE = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
const lines = (t) => String(t || "").split("\n").map((x, i) => <Fragment key={i}>{i ? <br /> : null}{x}</Fragment>);
/** 그림 주소 → props (이 기기에 넣어 둔 그림 idb: 은 빈 그림 + data-idb → VOD.hydrate 가 채워요) */
function imgP(u, at) {
  const r = VOD().imgSrcOf(u), o = { [at]: r.v };
  if (r.idb) o["data-idb"] = r.idb;
  return o;
}

/* ---------- 배너 (예전 slide · wireSwipe) ---------- */
function Hero({ bs }) {
  const X = VOD(), n = bs.length, off = n > 1 ? 1 : 0;
  const first = useRef(null);
  if (first.current === null) { const s0 = Math.min(X.homeUi().slide, Math.max(0, n - 1)); X.homeUi({ slide: s0 }); first.current = s0; }
  const cur = useRef(first.current), jump = useRef(0);
  const [st, setSt] = useState(() => ({ i: first.current, pos: first.current + off, anim: false }));
  const [paused, setPaused] = useState(() => X.homeUi().paused);
  const [restart, setRestart] = useState(0);
  // 끝에서 처음으로 넘어갈 때도 같은 방향으로: 양 끝 복제 배너까지 움직인 뒤, 진짜 배너 자리로 순간 이동
  const slide = useCallback((d, to) => {
    if (!n) return;
    const raw = to != null ? to : cur.current + d, i = ((raw % n) + n) % n;
    cur.current = i; X.homeUi({ slide: i });
    clearTimeout(jump.current);
    setSt({ i, pos: raw + off, anim: true });
    jump.current = setTimeout(() => setSt({ i, pos: i + off, anim: false }), 640);
  }, [X, n, off]);
  useEffect(() => () => clearTimeout(jump.current), []);
  useEffect(() => {
    if (paused || n < 2) return undefined;
    const t = setInterval(() => slide(1), 5000);
    return () => clearInterval(t);
  }, [paused, n, slide, restart]);
  // 휴대폰: 옆으로 밀면 넘기고 (자동 넘김은 처음부터 다시), 민 뒤의 누름은 막아요
  const sw = useRef({ x0: null, y0: 0, moved: false });
  const onTs = (e) => { sw.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, moved: false }; };
  const onTe = (e) => {
    const s = sw.current; if (s.x0 == null) return;
    const dx = e.changedTouches[0].clientX - s.x0, dy = e.changedTouches[0].clientY - s.y0; s.x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { s.moved = true; slide(dx < 0 ? 1 : -1); if (!paused) setRestart((k) => k + 1); }
  };
  const onCl = (e) => { if (sw.current.moved) { e.preventDefault(); sw.current.moved = false; } };
  if (!n) return null;
  const loop = n > 1 ? [bs[n - 1]].concat(bs, [bs[0]]) : bs;
  return (
    <section className="vd-hero"><div className="vd-hero-vp"><div className={"vd-hero-track" + (st.anim ? " anim" : "")} id="vd-hero" style={{ "--i": st.pos }} onTouchStart={onTs} onTouchEnd={onTe} onClickCapture={onCl}>
      {loop.map((b, j) => {
        const i = j - off, clone = i < 0 || i >= n, on = i === st.i, p = b.pid ? X.product(b.pid) : null, ph = b.img || (p ? X.phOf(p) : ""), href = b.href || (p ? "#/vod/p/" + p.id : "#/vod/c/all");
        const hi = !clone && i === first.current ? "high" : undefined;
        if (b.kind === "img") {
          const pc = b.pc || b.m, m = b.m || "";
          return <a key={j} className={"vd-slide img" + (b.fit === "contain" ? " fit" : "") + (on ? " on" : "")} href={href} target={b.newTab ? "_blank" : undefined} rel={b.newTab ? "noopener" : undefined} style={{ "--a": b.bg || (b.color || [])[0] || "#111" }} data-i={clone ? "" : i} tabIndex={on ? 0 : -1} aria-hidden={clone ? "true" : undefined}>
            <picture>{m && m !== pc ? <source media="(max-width: 639px)" {...imgP(m, "srcSet")} /> : null}<img {...imgP(pc, "src")} fetchPriority={hi} alt={clone ? "" : b.alt || String(b.title || "").replace(/\n/g, " ")} draggable="false" /></picture></a>;
        }
        const sk = String(b.sticker || "").split("\n");
        return (
          <a key={j} className={"vd-slide" + (b.dark ? " dark" : "") + (on ? " on" : "")} href={href} style={{ "--a": (b.color || [])[0] || "#111", "--b": (b.color || [])[1] || (b.color || [])[0] || "#333" }} data-i={clone ? "" : i} tabIndex={on ? 0 : -1} aria-hidden={clone ? "true" : undefined}>
            <div className="vd-slide-t">{b.eyebrow ? <small>{b.eyebrow}</small> : null}<b>{lines(b.title)}</b>{b.sub ? <p>{b.sub} <Icon n="arrowRight" c="xs" /></p> : null}</div>
            {b.sticker ? <span className="vd-burst"><b>{sk.map((l, k) => <span key={k} style={{ "--k": k }}>{l}</span>)}</b></span> : ph ? <img className="vd-slide-ph" src={ph} fetchPriority={hi} alt="" /> : null}
          </a>
        );
      })}
    </div></div>
      <div className="vd-wrap vd-hero-ctl"><div className="vd-dots">{bs.map((b, i) => <button key={i} type="button" className={i === st.i ? "on" : ""} data-v="slide-to" data-i={i} aria-label={i + 1 + "번째 배너"} onClick={() => slide(0, i)} />)}</div>
        <button type="button" className="vd-ctl" data-v="pause" aria-label={paused ? "자동 넘김 켜기" : "자동 넘김 멈추기"} onClick={() => setPaused((v) => X.homeUi({ paused: !v }).paused)}>{paused ? <Icon n="play" c="xs" /> : <svg className="icon xs" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PAUSE }} />}</button>
        <span className="vd-hero-cnt"><b>{st.i + 1}</b> / {n}</span>
        <button type="button" className="vd-ctl" data-v="slide" data-d="-1" aria-label="이전 배너" onClick={() => slide(-1)}><Icon n="chevLeft" c="sm" /></button>
        <button type="button" className="vd-ctl" data-v="slide" data-d="1" aria-label="다음 배너" onClick={() => slide(1)}><Icon n="chevRight" c="sm" /></button></div>
    </section>
  );
}

/* ---------- 카테고리 아이콘 (없으면 분야 알약) ---------- */
function Tiles() {
  const X = VOD(), tl = (X.V().tiles || []).filter((t) => t.on !== false && t.label && X.tileBiz(t));
  if (!tl.length) return <nav className="vd-pills" aria-label="분야" data-rv-kids=""><a className="vd-pill on" href="#/vod/c/all">전체</a>{X.cats().map((c) => <a key={c.key} className="vd-pill" href={"#/vod/c/" + c.key}>{c.label}</a>)}{X.bizOn("ebook") ? <a className="vd-pill" href="#/vod/c/all?tab=ebook">전자책</a> : null}{X.bizOn("live") ? <a className="vd-pill" href="#/vod/c/all?tab=premium">LIVE · 오프라인 강의</a> : null}</nav>;
  return (
    <nav className="vd-tiles" aria-label="카테고리 바로가기" style={{ "--n": Math.min(12, Math.max(6, tl.length)), "--c": Math.max(4, Math.ceil(tl.length / 2)) }}>{tl.map((t, i) => (
      <a key={i} className="vd-tile" href={t.href || "#/vod/c/all"} style={{ "--d": (i * 0.035).toFixed(3) + "s" }}><span className="vd-tile-ic">{t.img ? <img {...imgP(t.img, "src")} alt="" width="56" height="56" draggable="false" /> : <Icon n="grid" />}{t.badge ? <em>{t.badge}</em> : null}</span><b>{t.label}</b></a>
    ))}</nav>
  );
}

/* ---------- 섹션들 ---------- */
const Tag = ({ r }) => (r.tag ? <span className={"vd-tag vd-tag-" + TAGC[r.color]} data-rv="fade">{r.tag}</span> : null);
function Rail({ r, items, onLike }) {
  if (!items.length) return null;
  const id = "vd-r-" + (r.k === "best" ? "now" : r.k);
  return (
    <section className="vd-sec"><div className="vd-sec-h"><div className="vd-sec-t"><Tag r={r} /><Eg as="h2" t={r.t} /></div>
      <div className="vd-sec-r">{r.more ? <a className="vd-more" href={r.more}>전체보기<Icon n="chevRight" c="xs" /></a> : null}<Pager id={id} /></div></div>
      <div className="vd-row" id={id} data-rv-kids="">{items.map((it, i) => <AnyCard key={i} it={it} o={r.rank && i < 3 ? { rank: i + 1 } : null} onLike={onLike} />)}</div></section>
  );
}
function Why({ r }) {
  const X = VOD();
  return (
    <section className="vd-sec vd-why"><div className="vd-why-in"><div className="vd-why-h">{r.tag ? <span className="vd-why-k" data-rv="fade">{r.tag}</span> : null}<Eg as="h2" t={r.t} /><p data-rv="fade">강의만 팔지 않아요. 결제한 날부터 실제로 해 보는 날까지, 강의실 · 자료 · AI 조교 · 강사님 코칭이 함께 움직여요.</p><a className="vd-why-more" href={r.more || "#/vod/about"}>DOOGO CLASS가 다른 이유 <Icon n="arrowRight" c="xs" /></a></div>
      <div className="vd-why-g" data-rv-kids="">{X.SYS.map((x, i) => <div key={x[0]} className="vd-why-c"><div className={"vd-mk vd-mk-" + x[0]} aria-hidden="true"><SysMock k={x[0]} /></div><small>0{i + 1}</small><b>{x[1]}</b><p>{x[2]}</p></div>)}</div></div></section>
  );
}
// 분야별: 탭을 누르면 그 분야의 판매 중인 클래스만 (줄은 새로 — 넘기던 자리는 처음으로)
function CatSec({ r, onLike }) {
  const X = VOD(), cs = X.catTabs(r).filter((t) => t.on && t.items.length).map((t) => [t.c, t.items]);
  const [k, setK] = useState(() => X.homeUi().hcat);
  if (!cs.length) return null;
  const cur = cs.find((x) => x[0].key === k) || cs[0];
  const pick = (key) => { X.homeUi({ hcat: key }); setK(key); };
  return (
    <section className="vd-sec vd-hcat"><div className="vd-sec-h"><div className="vd-sec-t"><Tag r={r} /><Eg as="h2" t={r.t} /></div><div className="vd-sec-r"><a className="vd-more" href={r.more || "#/vod/c/all"}>전체 클래스<Icon n="chevRight" c="xs" /></a></div></div>
      <div id="vd-hcat"><div className="vd-hcat-tabs" role="tablist" aria-label="분야">{cs.map((x) => <button key={x[0].key} type="button" role="tab" aria-selected={String(x === cur)} className={x === cur ? "on" : ""} data-v="hcat" data-k={x[0].key} onClick={() => pick(x[0].key)}>{x[0].label}<small>{x[1].length}</small></button>)}</div>
        <div key={cur[0].key} className="vd-row" id="vd-r-cat">{cur[1].slice(0, 6).map((p) => <Card key={p.id} p={p} onLike={onLike} />)}</div>
        <div className="vd-hcat-f"><a className="vd-hcat-all" href={"#/vod/c/" + cur[0].key}>{cur[0].label} 클래스 전체보기 <b>{cur[1].length}</b><Icon n="chevRight" c="xs" /></a><Pager key={cur[0].key} id="vd-r-cat" /></div></div></section>
  );
}
// 다루는 부업: 세 줄로 흘러가는 칩 (같은 칩을 한 번 더 이어 붙여 끊김 없이) · ♡ 로 찜
function Topics({ r, onTopic }) {
  const X = VOD(), tp = X.V().topics || [], mine = X.myTopics(), rows = [0, 1, 2].map((i) => tp.filter((_, j) => j % 3 === i));
  if (!tp.length) return null;
  const chip = (t, dup, key) => { const on = mine.indexOf(t) >= 0; return <button key={key} type="button" className={"vd-tchip" + (on ? " on" : "")} data-v="topic" data-t={t} aria-pressed={String(on)} tabIndex={dup ? -1 : undefined} aria-hidden={dup ? "true" : undefined} onClick={() => onTopic(t)}>{t}<Icon n="heart" c="xs" /></button>; };
  return (
    <section className="vd-sec vd-topics"><div className="vd-topics-h"><Eg as="h2" t={r.t} /><p data-rv="">다음에 열 부업은 찜으로 골라요. <b>찜이 많은 부업부터 클래스를 열어요.</b><small>마우스를 올리면 멈춰요 · <a href="#/vod/my/likes?t=topics">내가 찜한 부업 보기 ›</a></small></p></div>
      {rows.map((x, ri) => <div key={ri} className={"vd-chiprow" + (ri % 2 ? " rev" : "")} data-rv="fade" style={{ "--d": ri * 0.12 + "s" }}><div className="vd-chipmq" style={{ "--dur": 48 + ri * 8 + "s" }}>{x.map((t, k) => chip(t, false, "a" + k))}{x.map((t, k) => chip(t, true, "b" + k))}</div></div>)}</section>
  );
}
/** 가로 줄 진행 막대 (예전 wireRails 의 data-prog) */
function Prog({ id }) {
  const [st, setSt] = useState({ w: "100.00%", l: "0.00%", one: true });
  useEffect(() => {
    const el = document.getElementById(id); if (!el) return undefined;
    const upd = () => { const sw = el.scrollWidth, cw = el.clientWidth, w = sw > cw + 2 ? cw / sw : 1, nx = { w: (w * 100).toFixed(2) + "%", l: (sw > cw ? (el.scrollLeft / sw) * 100 : 0).toFixed(2) + "%", one: w >= 1 }; setSt((s) => (s.w === nx.w && s.l === nx.l && s.one === nx.one ? s : nx)); };
    el.addEventListener("scroll", upd, { passive: true }); upd();
    const ro = "ResizeObserver" in window ? new ResizeObserver(upd) : null; if (ro) ro.observe(el);
    return () => { el.removeEventListener("scroll", upd); if (ro) ro.disconnect(); };
  }, [id]);
  return <div className={"vd-teach-prog" + (st.one ? " one" : "")} data-prog={id} aria-hidden="true"><i style={{ width: st.w, left: st.l }} /></div>;
}
function Teach({ r }) {
  const list = VOD().teachHome(r).slice(0, 8);
  if (!list.length) return null;
  return (
    <section className="vd-sec vd-teach"><div className="vd-teach-h"><a className="vd-teach-link" href="#/vod/teachers"><Eg as="h2">강사진</Eg><span data-rv="fade">Teachers</span><Icon n="chevRight" c="sm" /></a><p data-rv="fade">직접 해서 번 사람만 가르쳐요.</p><a className="vd-more vd-teach-more" href="#/vod/teachers">강사진 전체보기<Icon n="chevRight" c="xs" /></a></div>
      <div className="vd-teach-g vd-teach-rail" id="vd-r-teach" data-rv-kids="">{list.map((t, i) => <TcCard key={t.iid} t={t} i={i} />)}</div><Prog id="vd-r-teach" /></section>
  );
}

export default function HomePage({ n, moved }) {
  const X = VOD(), onLike = usePageLike();
  const onTopic = useCallback((k) => { const on = VOD().topicFlip(k); window.ReactApp.redraw(); toast(!on ? "‘" + k + "’ 찜을 풀었어요." : "‘" + k + "’ 클래스가 열리면 알려 드릴게요."); }, []);
  useMotion(n, moved);
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", window.ROUTE.hash); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
    const root = document.getElementById("root"); if (root && X.hydrate) X.hydrate(root);
  }, [n, moved, X]);
  const bs = X.liveBanners();
  return (
    <Shell nav="home" tab="home" n={n}>
      <Hero bs={bs} />
      <div className="vd-wrap"><Tiles />
        {X.homeRails().filter((r) => r.on && (!r.biz || X.bizOn(r.biz))).map((r) => (r.k === "why" ? <Why key={r.k} r={r} /> : r.k === "cat" ? <CatSec key={r.k} r={r} onLike={onLike} /> : r.k === "topics" ? <Topics key={r.k} r={r} onTopic={onTopic} /> : r.k === "teach" ? <Teach key={r.k} r={r} /> : <Rail key={r.k} r={r} items={X.railItems(r)} onLike={onLike} />))}
      </div>
    </Shell>
  );
}
