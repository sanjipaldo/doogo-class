"use client";
/* 강사진 (/vod/teachers) · 강사 페이지 (/vod/teachers/<강사>) — 예전 vod.js pageTeachers · pageTeacher 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  · 어떤 강사를 보여 줄지 · 순서 · 분야 · 수강생 수 · 후기는 예전 계산 그대로 (VOD.teachersView · teacherView · tcView)
 *  · 강사진 검색어 · 분야는 예전처럼 다른 화면에 다녀와도 남아요 (VOD.tpg)
 *  · 검색 · 공유 미리보기는 서버가 예전처럼 넣어요 (app/(react)/layout.js → pagemeta) */
import { useEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import Card from "./Card.jsx";
import Icon from "../lib/Icon.jsx";
import { Eg, useMotion } from "../lib/motion.jsx";
import { VOD, storeRoute } from "../lib/legacy.js";
import { usePageLike } from "./pageActs.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";

/** 빈 상자 (예전 emptyBox) */
export function EmptyBox({ ic, t, p, children }) {
  return <div className="vd-empty"><Icon n={ic} />{<b>{t}</b>}{p ? <p>{p}</p> : null}{children}</div>;
}

/** 강사 카드 (예전 tcCard) — hit: 강사진 검색에 맞는지 (다른 곳에서는 늘 보임) */
export function TcCard({ t, i, hit }) {
  const v = VOD().tcView(t, i);
  return (
    <div className="vd-tc" style={{ "--c": v.c }} data-tq={v.hay} data-tc={t.cats.join("|")} hidden={hit === false}>
      <a className="vd-tc-main" href={v.href}><span className={"vd-tc-ph vd-tc-s" + (i % 4)}><i className="vd-tc-bg" aria-hidden="true" />{v.ph ? <img src={v.ph} alt="" loading="lazy" /> : <em>{(t.name || "D").slice(0, 1)}</em>}<span className="vd-tc-n">클래스 {t.ps.length}</span></span>
        <b>{t.name || ""}</b><small>{t.tag || t.cats.join(" · ")}</small><span className="vd-tc-cat">{t.cats.slice(0, 2).join(" · ")}</span></a>
      <span className="vd-tc-sns">{v.sns.map((x) => <a key={x[2]} href={x[0]} target="_blank" rel="noopener" aria-label={t.name + " " + x[2]}><Icon n={x[1]} c="xs" /></a>)}<a href={v.href} aria-label={t.name + " 강사 페이지"}><Icon n="arrowUpRight" c="xs" /></a></span>
    </div>
  );
}

/* ---------- 강사진 ---------- */
function Teachers() {
  const X = VOD(), { list, n: total, cats } = X.teachersView();
  const [f0, setF] = useState(() => X.tpg());
  const set = (q, c) => setF(X.tpg(q, c));
  // 고른 분야가 지금 없는 분야면 풀어요 (teachersView 가 예전 값도 풀어 둬요)
  const f = f0.c && cats.indexOf(f0.c) < 0 ? { q: f0.q, c: "" } : f0;
  const nq = X.tqNorm(f.q), hitOf = (t, i) => (!f.c || t.cats.indexOf(f.c) >= 0) && (!nq || X.tcView(t, i).hay.indexOf(nq) >= 0);
  const hits = list.filter(hitOf).length, filtered = !!(f.c || nq);
  // 검색 칸은 예전처럼 쓰는 대로 두고(React 가 값을 다시 넣지 않아요) 바뀐 글만 받아요 — 처음 값은 들어올 때 한 번
  const [q0] = useState(() => X.tpg().q), qRef = useRef(null);
  const clear = (reset) => { set("", reset ? "" : undefined); const q = qRef.current; if (q) { q.value = ""; if (!reset) q.focus(); } };
  return (
    <div className="vd-wrap vd-tpg">
      <div className="vd-tpg-h"><p className="vd-tpg-k" data-rv="fade">DOOGO CLASS TEACHERS</p><h1 className="vd-h1">강사진 <small>{list.length}명 · 클래스 {total}개</small></h1><p data-rv="fade">직접 해서 번 사람만 가르쳐요. 강사님을 누르면 그 강사님이 DOOGO CLASS에서 여는 강의만 모아 볼 수 있어요.</p></div>
      {list.length ? <>
        <div className="vd-tpg-bar"><label className="vd-search vd-tpg-q"><Icon n="search" c="sm" /><input ref={qRef} type="search" data-tpg-q="" defaultValue={q0} onChange={(e) => set(e.target.value)} placeholder="강사 이름 · 분야로 찾기 (초성도 돼요)" aria-label="강사 검색" autoComplete="off" enterKeyHint="search" /><button type="button" className="vd-tpg-x" data-v="tpg-clear" aria-label="검색어 지우기" hidden={!f.q} onClick={() => clear(false)}><Icon n="x" c="xs" /></button></label>
          {cats.length > 1 ? <nav className="vd-pills vd-tpg-cats" aria-label="분야">{[["", "전체"]].concat(cats.map((c) => [c, c])).map((c) => <button key={c[0] || "-"} type="button" className={"vd-pill" + (c[0] === f.c ? " on" : "")} data-v="tpg-cat" data-tpg-cat={c[0]} aria-pressed={String(c[0] === f.c)} onClick={() => set(undefined, c[0])}>{c[1]}</button>)}</nav> : null}</div>
        <p className="vd-tpg-cnt" data-tpg-cnt="" aria-live="polite" hidden={!filtered}>{f.c ? <><em>{f.c}</em> </> : null}{f.q ? "‘" + f.q.trim() + "’ " : null}강사님 <b>{hits}명</b></p>
        <div className="vd-teach-g vd-tpg-g" data-tpg-g="" data-rv-kids="">{list.map((t, i) => <TcCard key={t.iid} t={t} i={i} hit={hitOf(t, i)} />)}</div>
        <div data-tpg-none="" hidden={hits > 0}><EmptyBox ic="search" t="찾는 강사님이 없어요" p="이름이나 분야를 다시 확인해 보세요."><button type="button" className="vd-btn vd-btn-line" data-v="tpg-reset" onClick={() => clear(true)}>강사진 전체 보기</button></EmptyBox></div>
      </> : <EmptyBox ic="users" t="강사진을 준비하고 있어요" p="곧 새로운 강사님이 찾아와요." />}
    </div>
  );
}

/* ---------- 강사 페이지 ---------- */
const TAGC = { ebook: "blue", soon: "orange", event: "pink" };
function Teacher({ slug, onLike }) {
  const X = VOD(), tv = X.teacherView(slug);
  if (!tv) return <div className="vd-wrap vd-tpg"><EmptyBox ic="users" t="찾는 강사님이 없어요" p="지금 DOOGO CLASS에서 강의하는 강사님을 확인해 보세요."><a className="vd-btn vd-btn-p" href="#/vod/teachers">강사진 보기</a></EmptyBox></div>;
  const { t, b, ph, sns, career, rv, bio, groups, others } = tv;
  return (
    <div className="vd-tp">
      <section className="vd-tp-hero" style={{ "--c": tv.c }}><div className="vd-wrap vd-tp-in"><nav className="vd-tp-bc" aria-label="위치"><a href="#/vod/teachers">강사진</a><Icon n="chevRight" c="xs" /><span>{t.name}</span></nav>
        <div className="vd-tp-ph" data-rv=""><i className="vd-tp-bg" aria-hidden="true" />{ph ? <img src={ph} alt={t.name + " 강사"} /> : <em>{(t.name || "D").slice(0, 1)}</em>}</div>
        <div className="vd-tp-info"><small className="vd-tp-k" data-rv="fade">DOOGO CLASS 강사</small><Eg as="h1" t={t.name} />{t.tag || b.field ? <p className="vd-tp-tag" data-rv="">{t.tag || b.field}</p> : null}
          <ul className="vd-tp-cats" data-rv="">{t.cats.map((c) => <li key={c}>{c}</li>)}</ul>
          <dl className="vd-tp-st" data-rv-kids=""><div><dt>클래스</dt><dd><i data-count={t.ps.length}>{t.ps.length}</i>개</dd></div><div><dt>누적 수강생</dt><dd><i data-count={t.sold}>{t.sold.toLocaleString()}</i>명+</dd></div>{rv.n ? <div><dt>수강 후기</dt><dd>★ {(rv.s / rv.n).toFixed(1)}<small> ({rv.n})</small></dd></div> : null}</dl>
          <p className="vd-tp-bio" data-rv="">{bio}</p>
          {career.length ? <ul className="vd-tp-car" data-rv="">{career.map((x, k) => <li key={k}>{x}</li>)}</ul> : null}
          {sns.length ? <div className="vd-tp-sns">{sns.map((x) => <a key={x[2]} href={x[0]} target="_blank" rel="noopener"><Icon n={x[1]} c="xs" />{x[2]}</a>)}</div> : null}</div></div></section>
      <div className="vd-wrap vd-tp-body">
        {groups.map(([g, ps]) => <section key={g[0]} className="vd-gsec"><div className="vd-gsec-h"><span className={"vd-tag vd-tag-" + (TAGC[g[0]] || "red")}>{g[1]}</span><h2>{t.name} 강사의 {g[1]}</h2><span className="vd-gsec-n">{ps.length}개</span></div><div className="vd-grid">{ps.map((p) => <Card key={p.id} p={p} onLike={onLike} />)}</div></section>)}
        {others.length ? <section className="vd-gsec vd-tp-more"><div className="vd-gsec-h"><h2>다른 강사님도 만나 보세요</h2><a className="vd-more" href="#/vod/teachers">강사진 전체보기<Icon n="chevRight" c="xs" /></a></div><div className="vd-teach-g" data-rv-kids="">{others.slice(0, 4).map((x, k) => <TcCard key={x.iid} t={x} i={k} />)}</div></section> : null}
      </div>
    </div>
  );
}

export default function TeachersPage({ n, moved }) {
  const r = storeRoute(), slug = r.path[1] ? decodeURIComponent(r.path[1]) : "";
  const onLike = usePageLike();
  useMotion(n, moved);
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", window.ROUTE.hash); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved]);
  return <Shell nav="teachers" tab="" n={n}>{slug ? <Teacher key={slug} slug={slug} onLike={onLike} /> : <Teachers />}</Shell>;
}
