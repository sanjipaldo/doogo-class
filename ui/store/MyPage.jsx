"use client";
/* 두고클래스 마이페이지 — 예전 vod.js pageMy(sub) 를 React 로 (Next.js 전환 4-4 · 첫 화면)
 *  · 왼쪽: 프로필 · 포인트 · 진행중 강의 · 쿠폰 · 결제대기 · 묶음 메뉴 · 로그아웃
 *  · 오른쪽: 지금은 ‘홈’만 React — 다른 메뉴(내 강의실 · 주문 · 쿠폰 …)는 하나씩 옮겨요 (그 전까지는 예전 화면이 열려요: class/shared/screens.js)
 *  · 계산(내 강의 · 진도 · 배지 · 쿠폰 · 연속 수강일)은 예전 것과 같은 코드(window.VOD)를 써요 */
import { useEffect, useState, useCallback } from "react";
import Shell from "./Shell.jsx";
import Card from "./Card.jsx";
import Icon from "../lib/Icon.jsx";
import Raw from "../lib/Raw.jsx";
import { VOD, DB, today, hash, storeRoute, toast, go } from "../lib/legacy.js";
import { Classes, Free, Vods, Badges, Points, Posts, Alarm, Likes } from "./MyTabs.jsx";
import { Coupons, Ebooks, Live, Devices, Reviews, Help, Account, Addons } from "./MyTabs2.jsx";

/* React 로 옮긴 마이페이지 메뉴 — 여기 없는 메뉴는 예전 화면이 열려요 (class/shared/screens.js 의 vod-my 주소 규칙과 같게) */
const TABS = { "": null, classes: Classes, free: Free, vod: Vods, addons: Addons, ebooks: Ebooks, live: Live, alarm: Alarm, likes: Likes, coupons: Coupons, points: Points, reviews: Reviews, posts: Posts, badges: Badges, account: Account, devices: Devices, help: Help };

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const fmt = (at) => DB().date.toStr(new Date(at));

function Blk({ title, more, cls, children }) {
  return <section className={"vd-my-blk" + (cls ? " " + cls : "")}><div className="vd-my-blk-h"><h3>{title}</h3>{more ? <a href={more}>전체보기<Icon n="chevRight" c="xs" /></a> : null}</div>{children}</section>;
}
function Empty({ text, label, href }) {
  return <div className="vd-my-empty"><p>{text}</p>{label ? <a className="vd-btn vd-btn-line vd-btn-sm" href={href}>{label}</a> : null}</div>;
}
/** 이번 달 공부한 날 (예전 calHtml) */
function Cal({ m }) {
  const X = VOD(), s = (X.V().studyLog || {})[m.id] || {}, t = today(), x = DB().date.parseDate(t), y = x.getFullYear(), mo = x.getMonth(), first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const ymd = (d) => y + "-" + String(mo + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), cnt = Object.keys(s).filter((k) => k.slice(0, 7) === t.slice(0, 7)).length;
  return (
    <div className="vd-cal"><div className="vd-cal-h"><b>{y}년 {mo + 1}월</b><small>이번 달 {cnt}일 공부했어요</small></div><div className="vd-cal-g">{X.DOWK.map((w) => <i key={w}>{w}</i>)}{Array.from({ length: first }, (_, i) => <span key={"b" + i} />)}
      {Array.from({ length: days }, (_, i) => { const k = ymd(i + 1); return <span key={k} className={(s[k] ? "on" : "") + (k === t ? " today" : "") + (k > t ? " fut" : "")} title={s[k] ? s[k] + "번 공부" : undefined}>{i + 1}</span>; })}</div></div>
  );
}
/** 주문 · 배송 현황 줄 (예전 shipStrip) */
function ShipStrip({ list, on }) {
  const X = VOD(), ks = ["wait", "ready", "prep", "ship", "done"], n = (k) => list.filter((o) => X.shipStOf(o) === k && !(X.claimOf(o) && ["req", "pick"].indexOf(X.claimOf(o).st) >= 0)).length, cl = list.filter((o) => X.claimOf(o) || X.shipStOf(o) === "cancel").length;
  const items = [];
  ks.forEach((k, i) => { if (i) items.push(<i key={"s" + i} aria-hidden="true"><Icon n="chevRight" c="xs" /></i>); items.push(<a key={k} href={"#/vod/my/ship?st=" + k} className={(n(k) ? "has" : "") + (on === k ? " on" : "")}><b>{n(k)}</b><span>{X.SHIP_ST[k][0]}</span></a>); });
  return <><div className="vd-shs">{items}</div><p className="vd-shs-c"><a href="#/vod/my/ship?st=claim" className={on === "claim" ? "on" : ""}>취소 · 반품 · 교환 <b>{cl}</b></a>{on ? <a href="#/vod/my/ship">전체 보기</a> : null}</p></>;
}
function TopicChip({ t, onTopic }) {
  const on = VOD().myTopics().indexOf(t) >= 0;
  return <button type="button" className={"vd-tchip" + (on ? " on" : "")} data-v="topic" data-t={t} aria-pressed={String(on)} onClick={() => onTopic(t)}>{t}<Icon n="heart" c="xs" /></button>;
}

/* ---------- 홈 ---------- */
function Home({ m, d, onLike, onTopic }) {
  const X = VOD();
  const last = d.ing.find((x) => X.prog(m.id, x.p.id).last) || d.ing[0], mins = Math.round(d.doneL.reduce((a, l) => a + X.lSec(l), 0) / 60), allL = d.vods.reduce((a, x) => a + X.lessons(x.p).length, 0);
  const posts = d.pl.map((x) => ({ k: "다짐", t: x.text, p: x.pid, at: x.at })).concat(d.rv.map((r) => ({ k: "후기", t: r.text, p: r.pid, at: r.at }))).sort((a, b) => b.at - a.at).slice(0, 3), earned = d.badges.filter((x) => x.on);
  const ship = d.orders.filter((o) => o.ship && o.status !== "failed"), tps = X.myTopics();
  return (
    <>
      <p className="vd-my-hi"><b>{m.name}님,</b> {d.streak ? d.streak + "일째 꾸준히 공부하고 있어요. 오늘도 한 걸음 더 가 볼까요?" : "오늘 강의 하나로 연속 수강을 시작해 볼까요?"}</p>
      {ship.length ? <Blk title={<>주문 · 배송 조회 <small>종이책</small></>} more="#/vod/my/ship"><ShipStrip list={ship} /></Blk> : null}
      <div className="vd-my-row">
        <section className="vd-my-blk vd-streak"><div className="vd-my-blk-h"><h3>연속 수강일</h3></div><p className="vd-streak-n"><b>{d.streak}일</b> 연속 수강 중</p><Cal m={m} /></section>
        <section className="vd-my-blk vd-recent"><div className="vd-my-blk-h"><h3>최근 수강 강의</h3><a href="#/vod/my/classes">전체보기<Icon n="chevRight" c="xs" /></a></div>
          {last ? <><a className="vd-resume" href={"#/vod/learn/" + last.p.id}><Raw className="vd-resume-th" html={X.thumbArt(last.p)} /><div><small>{last.p.creator}</small><b>{last.p.title}</b><div className="vd-prog"><i style={{ width: X.pctDone(m.id, last.p.id) + "%" }} /></div><span>진도율 {X.pctDone(m.id, last.p.id)}%</span></div></a><a className="vd-btn vd-btn-p vd-btn-xl" href={"#/vod/learn/" + last.p.id}><Icon n="play" c="sm" />이어서 학습하기</a></>
            : <Empty text="아직 수강 중인 강의가 없어요. 관심 분야의 강의를 둘러보세요." label="강의 둘러보기" href="#/vod/c/all" />}</section></div>
      <Blk title="학습 통계"><div className="vd-stats"><div><small>완강률</small><b>{d.vods.length ? Math.round(d.done.length / d.vods.length * 100) : 0}<i>%</i></b><span>완강 {d.done.length} / 수강 {d.vods.length}</span></div><div><small>학습 시간</small><b>{Math.floor(mins / 60)}<i>시간</i> {mins % 60}<i>분</i></b><span>끝까지 본 강의 기준</span></div><div><small>완료한 클립</small><b>{d.doneL.length}<i>개</i></b><span>전체 {allL}개 중</span></div></div></Blk>
      <Blk title={<>내 배지 <small>{earned.length} / {X.BADGES.length}</small></>} more="#/vod/my/badges">{earned.length ? <div className="vd-bdg-row">{earned.map((x) => <span key={x.b[0]} className="vd-bdg on"><Icon n={x.b[3]} c="sm" /><b>{x.b[1]}</b></span>)}</div> : <Empty text="아직 받은 배지가 없어요. 강의를 시작하면 첫 배지를 드려요." label="강의 시작하기" href="#/vod/c/all" />}</Blk>
      {tps.length ? <Blk title="내가 찜한 부업" more="#/vod/my/likes?t=topics"><div className="vd-mytp-chips">{tps.map((k) => <TopicChip key={k} t={k} onTopic={onTopic} />)}</div></Blk> : null}
      <Blk title="내 게시글" more="#/vod/my/posts">{posts.length ? <ul className="vd-my-posts">{posts.map((x, i) => <li key={i}><span className={"vd-tag vd-tag-" + (x.k === "후기" ? "blue" : "red")}>{x.k}</span><a href={"#/vod/p/" + x.p}>{x.t}</a><time>{fmt(x.at)}</time></li>)}</ul> : <Empty text="아직 쓴 글이 없어요. 강의 상세에서 다짐 한마디를 남겨 보세요." label="클래스 둘러보기" href="#/vod/c/all" />}</Blk>
      <Blk title="찜한 강의" more="#/vod/my/likes">{d.likes.length ? <div className="vd-grid vd-grid-3">{d.likes.slice(0, 3).map((p) => <Card key={p.id} p={p} onLike={onLike} />)}</div> : <Empty text="찜한 강의가 아직 없어요. 마음에 드는 강의를 담아두세요." label="강의 둘러보기" href="#/vod/c/all" />}</Blk>
    </>
  );
}

/* ---------- 왼쪽 메뉴 ---------- */
function Side({ m, d, sub, cnt, onLogout }) {
  const X = VOD();
  return (
    <aside className="vd-my-side"><div className="vd-my-prof"><div className="vd-my-me"><span className="vd-me-av lg">{m.name.slice(0, 1)}</span><div><b>{m.name}</b><small>{m.email}</small></div></div><a className="vd-my-pt" href="#/vod/my/points"><span>포인트</span><b>{(Number(m.points) || 0).toLocaleString()}P</b><Icon n="chevRight" c="xs" /></a>
      <div className="vd-my-stat"><a href="#/vod/my/classes"><b>{d.ing.length}</b>진행중 강의</a><a href="#/vod/my/coupons"><b>{d.cpOk.length}</b>쿠폰</a><a href="#/vod/my/pending"><b>{d.pending.length}</b>결제대기</a>{d.orders.some((o) => o.ship) ? <a href="#/vod/my/ship"><b>{d.orders.filter((o) => ["ready", "prep", "ship"].indexOf(X.shipStOf(o)) >= 0).length}</b>배송중</a> : null}</div><a className="vd-btn vd-btn-line vd-btn-sm vd-my-pf" href="#/vod/my/account">내 프로필</a></div>
      <nav className="vd-my-nav"><a href="#/vod/my" className={"vd-my-home" + (sub === "" ? " on" : "")}><Icon n="home" c="sm" /><span>홈</span></a>
        {X.MYNAV.map((g) => [<p key={"g" + g[0]}>{g[0]}</p>].concat(g[1].filter((x) => !((x[0] === "free" && !X.bizOn("free")) || (x[0] === "live" && !X.bizOn("live"))) || cnt[x[0]]).map((x) => <a key={x[0]} href={"#/vod/my/" + x[0]} className={sub === x[0] ? "on" : ""}><Icon n={x[2]} c="sm" /><span>{x[1]}</span>{cnt[x[0]] ? <small>{cnt[x[0]]}</small> : null}</a>)))}
        <button type="button" className="vd-my-out" data-v="logout" onClick={onLogout}><Icon n="logout" c="sm" /><span>로그아웃</span></button></nav></aside>
  );
}

/** 마이페이지 안에서 메뉴만 바꿨을 때: 보던 자리 · 메뉴 줄 위치 그대로, 새 내용이 위로 지나가 있으면 메뉴 바로 아래부터 (예전 vod.js myRestore) */
function myRestore(k) {
  const nav = document.querySelector(".vd-my-nav"), main = document.querySelector(".vd-my-main"); if (!nav || !main) { window.scrollTo(0, 0); return; }
  window.scrollTo(0, k.y); nav.scrollLeft = k.left;
  const strip = nav.scrollWidth > nav.clientWidth + 1, on = nav.querySelector("a.on");
  if (strip && on) { const nr = nav.getBoundingClientRect(), or = on.getBoundingClientRect(); if (or.left < nr.left + 16) nav.scrollLeft -= nr.left + 16 - or.left; else if (or.right > nr.right - 16) nav.scrollLeft += or.right - nr.right + 16; }
  const top = document.querySelector(".vd-top"), hb = top ? Math.max(0, top.getBoundingClientRect().bottom) : 0;
  const want = (strip ? Math.max(hb, nav.getBoundingClientRect().bottom) : hb) + 12, at = main.getBoundingClientRect().top;
  if (at < want) window.scrollTo(0, Math.max(0, window.scrollY + at - want));
}

export default function MyPage({ n, moved, keep }) {
  const X = VOD();
  const [, bump] = useState(0);
  const redraw = useCallback(() => { const y = window.scrollY; bump((v) => v + 1); requestAnimationFrame(() => window.scrollTo(0, y)); }, []);
  const m = X.me(), r = storeRoute();
  let sub = r.path[1] || "";
  const legacy = r.qs.get("tab"); if (legacy) sub = { classes: "classes", likes: "likes", orders: "orders", account: "account" }[legacy] || "";
  sub = X.MYT[sub] != null ? sub : "";
  // 로그인 전이면 로그인으로 · 아직 React 로 옮기지 않은 메뉴면 그 메뉴 주소로 (예전 화면이 열려요)
  const away = !m ? "#/vod/login?next=" + encodeURIComponent(hash()) : !(sub in TABS) ? "#/vod/my/" + sub : "";
  useEffect(() => { if (away) window.ROUTE.redirect(away); }, [away]);
  // 그린 뒤: 탭 제목 · 강사 색 지우기 · 주소를 옮겨 왔으면 맨 위로 · 고른 메뉴가 휴대폰 메뉴 줄 가운데 (예전 render · VodApp.render)
  useEffect(() => {
    if (away) return;
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (!moved) return;
    if (keep) { myRestore(keep); return; }
    window.scrollTo(0, 0);
    // 다른 화면에서 마이페이지로 들어오면 고른 메뉴가 휴대폰 메뉴 줄 가운데 (예전 myNavFocus)
    const nv = document.querySelector(".vd-my-nav"), on = nv && nv.querySelector("a.on");
    if (on && nv.scrollWidth > nv.clientWidth + 1) nv.scrollLeft = Math.max(0, on.offsetLeft - (nv.clientWidth - on.offsetWidth) / 2);
  }, [n, away, moved, keep]);
  const onLike = useCallback((id) => {
    const mm = X.me();
    if (!mm) { toast("로그인하면 찜할 수 있어요.", "warn"); go("#/vod/login?next=" + encodeURIComponent(hash())); return; }
    const lf = X.likeFlip(mm, id);
    redraw();
    toast(!lf.added ? (lf.soon ? "오픈 알림을 껐어요." : "찜을 풀었어요.") : lf.soon ? "오픈하면 가장 먼저 알려 드릴게요." : "찜한 강의에 담았어요.");
  }, [X, redraw]);
  const onTopic = useCallback((k) => { const on = X.topicFlip(k); redraw(); toast(!on ? "‘" + k + "’ 찜을 풀었어요." : "‘" + k + "’ 클래스가 열리면 알려 드릴게요."); }, [X, redraw]);
  const onLogout = useCallback(() => { X.logoutAll().then(() => { toast("로그아웃했어요."); go("#/vod"); }); }, [X]);
  // 메뉴 안 버튼들 (예전 vod.js 클릭 처리와 같은 일)
  const act = {
    like: onLike, topic: onTopic, redraw, logout: onLogout,
    dg: (pid) => X.enterDg(pid, ""),
    plDel: (id) => { const mm = X.me(), v = X.V(), x = v.pledges.find((y) => y.id === id); if (!x || !mm || x.mid !== mm.id) return; v.pledges.splice(v.pledges.indexOf(x), 1); X.save(); redraw(); toast("다짐을 지웠어요."); }
  };
  if (away) return null;
  const v = X.V(), d = X.myData(m), Tab = TABS[sub];
  const shipN = d.orders.filter((o) => o.ship && ["wait", "ready", "prep", "ship"].indexOf(X.shipStOf(o)) >= 0).length;
  const cnt = { ship: shipN, addons: d.addN, classes: d.ing.length, free: d.free.length, vod: d.paidV.length, ebooks: d.ebooks.length, live: d.live.length, alarm: d.alarm.length, likes: d.likes.length, pending: d.pending.length, coupons: d.cpOk.length, reviews: d.rv.length, posts: d.pl.length, help: (v.inquiries || []).filter((x) => x.mid === m.id && x.answer && !x.seenAt).length };
  return (
    <Shell nav="" tab={sub === "likes" ? "likes" : sub === "classes" ? "cls" : "my"} n={n}>
      <div className="vd-wrap vd-my"><div className="vd-my-grid"><Side m={m} d={d} sub={sub} cnt={cnt} onLogout={onLogout} /><section className="vd-my-main"><h2 className="vd-my-h2">{X.MYT[sub]}</h2>{Tab ? <Tab m={m} d={d} act={act} /> : <Home m={m} d={d} onLike={onLike} onTopic={onTopic} />}</section></div></div>
    </Shell>
  );
}
