"use client";
/* 클래스 목록 — 예전 vod.js pageAll · listPage 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  · 전체 클래스 /vod/c/all · 분야 /vod/c/<분야> (?tab= 종류 · ?sort= 순서)
 *  · 오픈 예정 /vod/c/soon · BEST /vod/c/best · 새로 열린 /vod/c/new · 무료 특강 /vod/c/free · 없는 분야 · 검색 /vod/search?q=
 *  · 어떤 클래스를 어떤 순서로 보여 줄지는 예전 계산 그대로 (VOD.allView · listView) */
import { useEffect, useLayoutEffect, useState } from "react";
import Shell from "./Shell.jsx";
import Card, { AnyCard } from "./Card.jsx";
import { EmptyBox } from "./TeachersPage.jsx";
import Icon from "../lib/Icon.jsx";
import { useMotion } from "../lib/motion.jsx";
import { VOD, go, storeRoute } from "../lib/legacy.js";
import { usePageLike } from "./pageActs.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";

/** 가로 줄 넘기기 (예전 pager + wireRails 의 쪽수 표시) — 줄(id)을 넘기면 지금 쪽 / 전체 쪽 · 끝이면 버튼이 꺼져요 */
export function Pager({ id }) {
  const [st, setSt] = useState({ cur: 1, total: 1 });
  // 그리자마자(화면에 보이기 전에) 쪽수를 재요 — 예전 화면처럼 첫 화면부터 ‘1 / 2’ (useEffect 면 잠깐 ‘1 / 1’ · 다음 버튼 꺼짐이 보였어요)
  useLayoutEffect(() => {
    const el = document.getElementById(id); if (!el) return undefined;
    const upd = () => { const i = VOD().railInfo(el); setSt((s) => (s.cur === i.cur && s.total === i.total ? s : i)); };
    let t = 0; const onSc = () => { clearTimeout(t); t = setTimeout(upd, 60); };
    el.addEventListener("scroll", onSc, { passive: true }); upd();
    return () => { el.removeEventListener("scroll", onSc); clearTimeout(t); };
  });
  const move = (d) => { const el = document.getElementById(id); if (el) { const r = VOD().railStep(el); el.scrollBy({ left: d * r.step * r.per, behavior: "smooth" }); } };
  return (
    <div className={"vd-pager" + (st.total <= 1 ? " one" : "")} data-pager={id}><span className="vd-pager-n"><b>{st.cur}</b> / {st.total}</span>
      <button type="button" data-v="rail" data-r={id} data-d="-1" aria-label="이전" disabled={st.cur <= 1} onClick={() => move(-1)}><Icon n="chevLeft" c="sm" /></button>
      <button type="button" data-v="rail" data-r={id} data-d="1" aria-label="다음" disabled={st.cur >= st.total} onClick={() => move(1)}><Icon n="chevRight" c="sm" /></button></div>
  );
}

/** 정렬 줄 */
function Sorts({ s, href }) {
  return <div className="vd-sorts">{VOD().SORTS.map((x) => <a key={x[0]} className={s === x[0] ? "on" : ""} href={href(x[0])}>{x[1]}</a>)}</div>;
}

/* ---------- 전체 클래스 · 분야 ---------- */
function All({ ck, onLike }) {
  const X = VOD(), { cat, want, avail, tab, s, off, secs, total } = X.allView(ck), url = X.allUrl, G = X.GSEC, TABN = X.ALL_TABN, cl = cat ? X.catOf(cat).label : "";
  return (
    <div className="vd-wrap vd-all">
      {cat ? <nav className="vd-tp-bc vd-all-bc" aria-label="위치"><a href={url(tab, "")}>전체 클래스</a><Icon n="chevRight" c="xs" /><span>{cl}</span></nav> : null}
      <h1 className="vd-h1">{cat ? <>{cl} <small>{total}개</small></> : tab === "all" ? "전체 클래스" : G[tab][0]}</h1>
      {off ? <div className="vd-biz-off"><Icon n="bell" c="sm" /><div><b>{G[want][0]}는 지금 준비 중이에요</b><p>지금 DOOGO CLASS는 VOD{X.bizOn("ebook") ? " · 전자책" : ""} 클래스로 만나요. 열리면 가장 먼저 알려 드릴게요.</p></div></div> : null}
      <nav className="vd-gtabs" aria-label="강의 종류"><a href={url("all", cat)} className={tab === "all" ? "on" : ""}>전체</a>{avail.map((k) => <a key={k} href={url(k, cat)} className={tab === k ? "on" : ""}>{TABN[k]}</a>)}</nav>
      <nav className="vd-pills" aria-label="분야"><a className={"vd-pill" + (cat ? "" : " on")} href={url(tab, "")}>전체</a>{X.cats().map((c) => <a key={c.key} className={"vd-pill" + (c.key === cat ? " on" : "")} href={url(tab, c.key)}>{c.label}</a>)}</nav>
      {tab !== "all" ? <Sorts s={s} href={(x) => url(tab, cat, x)} /> : null}
      {secs.map(([k, it]) => {
        const sid = "vd-g-" + k;
        if (!it.length) return tab === "all" ? null : <EmptyBox key={k} ic={G[k][2]} t={cat ? cl + " 분야에는 아직 " + G[k][0] + "가 없어요" : "지금 열린 강의가 없어요"} p="다른 분야를 보거나 오픈 예정 클래스에서 알림을 받아 보세요."><a className="vd-btn vd-btn-o" href={url(tab, "")}>전체 분야 보기</a><a className="vd-btn vd-btn-o" href="#/vod/c/soon">오픈 예정 보기</a></EmptyBox>;
        return (
          <section key={k} className="vd-gsec"><div className="vd-gsec-h"><span className={"vd-tag vd-tag-" + G[k][3]}>{G[k][1]}</span><h2>{cat ? cl + " · " : ""}{G[k][0]}</h2><span className="vd-gsec-n">{it.length}개</span>{tab === "all" ? <a className="vd-more" href={url(k, cat)}>전체보기<Icon n="chevRight" c="xs" /></a> : null}</div>
            <div className={tab === "all" ? "vd-row" : "vd-grid"} id={sid}>{it.map((x, i) => <AnyCard key={i} it={x} onLike={onLike} />)}</div>{tab === "all" && it.length > 3 ? <Pager id={sid} /> : null}</section>
        );
      })}
      {!total && tab === "all" ? <EmptyBox ic="sparkles" t={cat ? cl + " 클래스를 준비하고 있어요" : "지금 열린 강의가 없어요"} p="곧 열릴 클래스는 ‘오픈 예정’에서 알림을 받아 볼 수 있어요."><a className="vd-btn vd-btn-p" href="#/vod/c/soon">오픈 예정 보기</a><a className="vd-btn vd-btn-o" href="#/vod/c/all">전체 클래스 보기</a></EmptyBox> : null}
    </div>
  );
}

/* ---------- 오픈 예정 · BEST · 새로 열린 · 무료 특강 · 검색 ---------- */
function List({ k, q, onLike }) {
  const X = VOD(), { list, title, sub, known, s, base } = X.listView(k, q);
  const search = (e) => { e.preventDefault(); go("#/vod/search?q=" + encodeURIComponent(e.currentTarget.q.value.trim())); };
  return (
    <div className="vd-wrap vd-list">
      {q != null ? <form key={q} className="vd-search vd-search-lg" data-vd-search="" onSubmit={search}><input name="q" type="search" defaultValue={q} placeholder="클래스 · 크리에이터 · 부업으로 찾기" aria-label="클래스 검색" /><button type="submit" aria-label="검색"><Icon n="search" c="sm" /></button></form> : null}
      <div className="vd-list-h"><div><h1 className="vd-h1">{title} <small>{list.length}개</small></h1>{sub ? <p>{sub}</p> : null}</div></div>
      {q == null && k !== "soon" ? <nav className="vd-pills" aria-label="분야"><a className="vd-pill" href="#/vod/c/all">전체</a>{X.cats().map((c) => <a key={c.key} className={"vd-pill" + (c.key === k ? " on" : "")} href={"#/vod/c/" + c.key}>{c.label}</a>)}</nav> : null}
      {k !== "soon" ? <Sorts s={s} href={(x) => base + "sort=" + x} /> : null}
      {list.length ? <div className="vd-grid">{list.map((p) => <Card key={p.id} p={p} onLike={onLike} />)}</div>
        : known ? <EmptyBox ic="sparkles" t={title + " 클래스를 준비하고 있어요"} p="곧 열릴 클래스는 ‘오픈 예정’에서 알림을 받아 볼 수 있어요."><a className="vd-btn vd-btn-p" href="#/vod/c/soon">오픈 예정 보기</a><a className="vd-btn vd-btn-o" href="#/vod/c/all">전체 클래스 보기</a></EmptyBox>
          : <EmptyBox ic="search" t={q != null && q.trim() ? "‘" + q.trim() + "’에 대한 결과가 없어요." : "찾는 클래스가 없어요"} p="다른 단어로 찾아보거나 분야부터 골라 보세요."><a className="vd-btn vd-btn-o" href="#/vod/c/all">전체 클래스 보기</a></EmptyBox>}
    </div>
  );
}

export default function ListPage({ n, moved }) {
  const X = VOD(), r = storeRoute(), [a, b] = r.path, onLike = usePageLike();
  // 예전 render() 와 같은 갈래: /vod/c · /vod/c/all · 분야 → 전체 클래스 · 나머지 /vod/c/<키> → 목록 · /vod/search → 검색
  const all = a === "c" && (!b || b === "all" || X.cats().some((x) => x.key === b));
  const q = a === "search" ? r.qs.get("q") || "" : null;
  let nav, tab, body;
  if (all) {
    const v = X.allView(b === "all" ? "" : b);
    nav = v.tab === "all" || v.cat ? "all" : v.tab; tab = "all";
    body = <All ck={b === "all" ? "" : b} onLike={onLike} />;
  } else {
    const v = X.listView(q != null ? null : b, q);
    nav = v.nav; tab = v.nav === "all" ? "all" : "";
    body = <List k={q != null ? null : b} q={q} onLike={onLike} />;
  }
  useMotion(n, moved);
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", window.ROUTE.hash); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved]);
  return <Shell nav={nav} tab={tab} n={n}>{body}</Shell>;
}
