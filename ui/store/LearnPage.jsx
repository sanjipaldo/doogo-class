"use client";
/* VOD 강의실 (#/vod/learn/<클래스>/<강의>) — 예전 vod.js pageLearn · pageEbook · pageTicket 을 React 로 (Next.js 전환 4-4)
 *  · 두잉고 강의실이 열린 VOD 는 두잉고 강의실로 보내요 (예전과 같음)
 *  · 전자책: 표지 · 목차 · PDF 내려받기 / LIVE · 오프라인: 입장 안내(시작까지 남은 시간이 1초마다 줄어요) / VOD: 영상 · 강의 노트 · 첨부 · 커리큘럼 · 완료하기
 *  · 영상 칸 · 첨부 목록 · 새 강의 표시 · 강의 길이(lLen) · 두잉고 카드는 아직 예전 HTML (Raw) */
import { useEffect, useState } from "react";
import { RfNowModal } from "./MyOrders.jsx";
import Shell, { KakaoBtn } from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import { VOD, DB, today, hash, storeRoute, toast, go } from "../lib/legacy.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const fmtFull = (t) => DB().date.fmtFull(DB().date.toStr(new Date(t)));
const DgLogo = () => (typeof window !== "undefined" && window.doinggoB ? <RawOne html={window.doinggoB("black", "vd-dg-logo")} /> : "두잉고");

/** 예전 HTML 칸 안 버튼: 두잉고 입장 · 첨부 자료(이 브라우저에 저장한 파일 · 아직 없는 파일) */
function rawClick(e, pid, m) {
  const X = VOD(), t = e.target.closest && e.target.closest("[data-v]"); if (!t) return;
  const v = t.dataset.v;
  if (v === "dg") { e.preventDefault(); X.enterDg(t.dataset.p, "", t.dataset.to); return; }
  if (v === "mat") { e.preventDefault(); if (m) X.markMat(m.id, pid); X.matOpen({ url: t.dataset.u, name: t.dataset.n }, "dl").then((ok) => { if (!ok) toast("파일을 찾을 수 없어요. 강사님께 알려 주세요.", "warn"); }); return; }
  if (v === "dl-none") { e.preventDefault(); toast("시안이라 첨부는 오픈 때 연결돼요."); }
}
function EbAct({ p, xl }) {
  const X = VOD(), fn = X.bizOn("flive") && X.eventPast(p) && X.funnelOf(p), nx = fn && X.product(fn.next);
  if (!nx || nx.status !== "on") return null;
  const e = X.ebOf(nx);
  return <a className={"vd-btn " + (e ? "vd-btn-p" : "vd-btn-o") + (xl ? " vd-btn-xl" : "")} href={"#/vod/p/" + nx.id}><Icon n={e ? "sparkles" : "arrowRight"} c={xl ? "sm" : "xs"} />{e ? "얼리버드 " + X.pctOf(nx) + "% · " + X.ebDayTxt(e.ebDay) + "까지" : "이어지는 강의 보기"}</a>;
}

/* ---------- 전자책 ---------- */
function Ebook({ p, m }) {
  const X = VOD(), o = X.ownOrder(m.id, p.id);
  const dl = () => { const oo = X.ownOrder(m.id, p.id); if (oo && !oo.dlAt) { oo.dlAt = Date.now(); X.save(); } X.download(p, null); };
  return (
    <div className="vd-wrap vd-reader"><a className="vd-tl-btn" href="#/vod/my/ebooks"><Icon n="arrowLeft" c="xs" />전자책 목록</a><div className="vd-reader-g"><div className="vd-reader-cv"><RawOne html={X.thumbArt(p, "lg")} /></div><div><small>{p.creator + " · " + (p.format || "PDF") + " " + (Number(p.pages) || 0) + "쪽"}</small><h1>{p.title}</h1><p>{p.sub || ""}</p>
      <div className="vd-reader-a"><button type="button" className="vd-btn vd-btn-p vd-btn-xl" data-v="dl" data-p={p.id} onClick={dl}><Icon n="download" c="sm" />PDF 내려받기</button></div><p className="vd-muted">{(o ? fmtFull(o.paidAt) + " 구매 · " : "") + "평생 소장 · 내려받은 파일은 개인 학습용으로만 써 주세요."}</p></div></div>
      <section className="vd-pd-sec"><h2>목차</h2>{(p.curriculum || []).map((ch, i) => <div key={i} className="vd-toc"><b>{ch.title}</b><ul>{(ch.lessons || []).map((l, j) => <li key={j}><span>{l.title}</span><small>{(Number(l.min) || 0) + "쪽"}</small></li>)}</ul></div>)}</section></div>
  );
}

/* ---------- LIVE · 오프라인 입장 안내 ---------- */
function Ticket({ p, m }) {
  const X = VOD(), o = X.ownOrder(m.id, p.id), t = X.typeOf(p), start = X.eventTime(p), past = X.eventPast(p), open = !past && start - Date.now() < 10 * 6e4;
  // 시작까지 남은 시간 (1초마다 · 예전 render 의 ui.cd)
  useEffect(() => { const iv = setInterval(() => document.querySelectorAll("[data-cd]").forEach((x) => { x.textContent = X.cdTxt(x.dataset.cd); }), 1000); return () => clearInterval(iv); }, [X]);
  const cd = <b data-cd={p.eventAt}>{X.cdTxt(p.eventAt)}</b>;
  return (
    <div className="vd-wrap vd-ticket-w"><a className="vd-tl-btn" href="#/vod/my/live"><Icon n="arrowLeft" c="xs" />LIVE · 오프라인 목록</a>
      <div className="vd-ticket"><div className="vd-ticket-h"><span className={"vd-tag vd-tag-" + (t === "live" ? "pink" : "blue")}>{X.TYPE[t][1]}</span><h1>{p.title}</h1><p>{p.creator}</p></div>
        <dl className="vd-ticket-dl"><div><dt>일시</dt><dd>{X.fmtEvent(p.eventAt, true) + " · " + X.durTxt(Number(p.eventMin) || X.totalMin(p))}</dd></div>
          {t === "live" ? <div><dt>진행</dt><dd>{p.via === "zoom" ? "Zoom · 시작 10분 전부터 들어올 수 있어요" : "유튜브 라이브 · 링크는 카카오톡 오픈채팅방과 이 화면에 올라와요"}</dd></div> : null}
          {p.kakao ? <div><dt>오픈채팅</dt><dd>신청자 전용 카카오톡 오픈채팅방 · 공지와 라이브 링크를 여기서 먼저 알려 드려요</dd></div> : null}
          {t === "live" ? null : <><div><dt>장소</dt><dd>{p.place || "신청 후 안내"} <a className="vd-link" href={"https://map.naver.com/p/search/" + encodeURIComponent(X.placeShort(p.place) || "")} target="_blank" rel="noopener">지도 보기</a></dd></div><div><dt>준비물</dt><dd>노트북 · 충전기 · 신분증</dd></div></>}
          <div><dt>주문 번호</dt><dd>{o ? o.no : "-"}</dd></div><div><dt>신청자</dt><dd>{m.name + " · " + (m.phone || m.email)}</dd></div></dl>
        <div className="vd-ticket-ch"><EbAct p={p} xl />{p.kakao ? <a className="vd-btn vd-btn-kakao vd-btn-xl" href={p.kakao} target="_blank" rel="noopener"><Icon n="message" c="sm" />카카오톡 오픈채팅방 입장하기</a> : null}
          {t === "live" && p.via !== "zoom" ? (p.ytLive && (past || DB().date.diffDays(DB().date.toStr(new Date(p.eventAt)), today()) <= 0) ? <a className="vd-btn vd-btn-yt vd-btn-xl" href={p.ytLive} target="_blank" rel="noopener"><Icon n="play" c="sm" />{past ? "유튜브 다시보기" : "유튜브 라이브 보기"}</a> : <button type="button" className="vd-btn vd-btn-off vd-btn-xl" disabled><Icon n="clock" c="sm" />라이브 링크는 강의 날 열려요</button>) : null}</div>
        {t === "live" && p.via !== "zoom" ? null : <div className="vd-ticket-f">{past ? (X.replayOk(p) ? <><a className="vd-btn vd-btn-yt vd-btn-xl" href={p.replayUrl} target="_blank" rel="noopener"><Icon n="play" c="sm" />다시보기 영상 보기</a>{Number(p.replayDays) ? <p className="vd-muted">{fmtFull(X.evEnd(p) + Number(p.replayDays) * 864e5)}까지 볼 수 있어요.</p> : null}</> : <p className="vd-muted">끝난 강의예요.{p.replayDays ? " 다시보기 영상은 준비되면 끝난 뒤 " + p.replayDays + "일 동안 이 화면에 올라와요." : ""}</p>)
          : t === "live" ? <>{open && p.link ? <a className="vd-btn vd-btn-p vd-btn-xl" href={p.link} target="_blank" rel="noopener"><Icon n="video" c="sm" />Zoom 입장하기</a> : <button type="button" className="vd-btn vd-btn-off vd-btn-xl" disabled><Icon n="clock" c="sm" />입장 링크는 시작 10분 전에 열려요</button>}<p className="vd-muted">시작까지 {cd}</p></>
          : <p className="vd-muted">강의 하루 전에 자세한 주소 · 주차 안내를 문자로 보내 드려요. 시작까지 {cd}</p>}</div>}
      </div>
      <section className="vd-pd-sec"><h2>진행 순서</h2>{(p.curriculum || []).map((ch, i) => <div key={i} className="vd-toc"><b>{ch.title}</b><ul>{(ch.lessons || []).map((l, j) => <li key={j}><span>{l.title}</span><small>{(Number(l.min) || 0) + "분"}</small></li>)}</ul></div>)}</section></div>
  );
}

/* ---------- VOD 플레이어 ---------- */
function Player({ p, m, cur, redraw }) {
  const X = VOD(), pid = p.id, lz = X.lessons(p), pr = X.prog(m.id, pid), idx = lz.indexOf(cur), next = lz[idx + 1], pc = X.pctDone(m.id, pid);
  // 결제 후 N일 이내 · 재생 전이면 강의를 열기 전에 ‘시작하면 100% 환불이 끝나요’ 안내 (예전 gateHtml 그대로 · 공용 규칙 shared/refund.js)
  const gate = X.startGate(m.id, pid, cur.id), [rf, setRf] = useState(null);
  // 이 강의를 연 기록 — 마지막으로 본 강의 · 처음 본 때(처음이면 서버에도 · 바로 취소 판단) · 오늘 공부한 날 (안내 중에는 남기지 않아요)
  useEffect(() => { if (gate) return; X.markLast(m.id, pid, cur.id); X.logStudy(m.id); X.save(); }, [X, m.id, pid, cur.id, !!gate]); // eslint-disable-line react-hooks/exhaustive-deps
  const gateClick = (e) => {
    const t = e.target.closest && e.target.closest("[data-v]"); if (!t) return;
    if (t.dataset.v === "pl-start") { X.markLast(m.id, pid, cur.id); X.logStudy(m.id); X.save(); redraw(); }
    else if (t.dataset.v === "rf-now" && gate) setRf(gate.o);
  };
  const done = () => {
    X.markDone(m.id, pid, cur.id);
    if (next) go("#/vod/learn/" + pid + "/" + next.id); else { redraw(); toast(X.pctDone(m.id, pid) === 100 ? "모든 강의를 완료했어요! 후기도 남겨 주세요." : "완료했어요."); }
  };
  const chap = ((p.curriculum || []).find((c) => (c.lessons || []).indexOf(cur) >= 0) || {}).title || "";
  return (
    <div className="vd-player"><header className="vd-pl-top"><a href="#/vod/my/classes" className="vd-pl-back" aria-label="내 강의실로"><Icon n="arrowLeft" c="sm" /></a><div><small>{p.creator}</small><b>{p.title}</b></div><span className="vd-pl-prog"><i style={{ "--p": pc + "%" }} />{pc}%</span><KakaoBtn cls="vd-pl-kk" label="문의하기" /></header>
      <div className="vd-pl-grid"><div className="vd-pl-main">{gate ? <Raw as="div" className="vd-pl-video" html={X.gateHtml(gate, pid, cur.id)} onClick={gateClick} /> : <Raw as="div" className="vd-pl-video" html={X.videoHtml(cur)} />}
        <div className="vd-pl-info"><small>{chap}</small><h1>{cur.title}</h1><Raw as="span" html={X.lLen(cur) + (X.vimeoSrc(cur.video) ? " · Vimeo" : "")} />
          <div className="vd-pl-btns">{gate ? null : pr.done[cur.id] ? <span className="vd-pl-done"><Icon n="check" c="sm" />완료한 강의</span> : <button type="button" className="vd-btn vd-btn-p" data-v="done" data-p={pid} data-l={cur.id} onClick={done}><Icon n="check" c="sm" />{next ? "완료하고 다음 강의" : "완료하기"}</button>}{next ? <a className="vd-btn vd-btn-o" href={"#/vod/learn/" + pid + "/" + next.id}>다음 강의<Icon n="chevRight" c="xs" /></a> : null}</div>
          {cur.desc || (cur.files || []).length ? <div className="vd-pl-note">{cur.desc ? <><b>강의 노트</b><p>{String(cur.desc).split("\n").map((x, i, a) => (i < a.length - 1 ? [x, <br key={i} />] : x))}</p></> : null}{(cur.files || []).length ? <><b>첨부 자료</b><RawOne html={X.fileList(cur.files)} onClick={(e) => rawClick(e, pid, m)} /></> : null}</div> : null}</div></div>
        <aside className="vd-pl-side">{X.dgOpen(p) ? <RawOne html={X.dgCard(p, "vd-dg-pl")} onClick={(e) => rawClick(e, pid, m)} /> : null}<b className="vd-pl-side-h">커리큘럼 <small>{lz.filter((l) => pr.done[l.id]).length} / {lz.length}</small></b>
          {(p.curriculum || []).map((c, i) => <div key={i} className="vd-pl-ch"><small>{c.title}</small>{(c.lessons || []).map((l) => <a key={l.id} href={"#/vod/learn/" + pid + "/" + l.id} className={(l.id === cur.id ? "on" : "") + (pr.done[l.id] ? " done" : "")}><i>{pr.done[l.id] ? <Icon n="check" c="xs" /> : null}</i><Raw as="span" html={DB().esc(l.title) + X.freshTag(l) + ((l.files || []).length ? " " + window.icon("paperclip", "xs") : "")} /><Raw as="small" html={X.lLen(l)} /></a>)}</div>)}</aside></div>
      {rf ? <RfNowModal o={rf} onClose={() => setRf(null)} onDone={() => go("#/vod/my/classes")} /> : null}</div>
  );
}

export default function LearnPage({ n, moved }) {
  const X = VOD(), r = storeRoute(), pid = r.path[1], lid = r.path[2], p = X.product(pid), m = X.me();
  const away = !p ? "#/vod/p/" + pid : !m ? "#/vod/login?next=" + encodeURIComponent("#/vod/learn/" + pid) : !X.owns(m.id, pid) ? "#/vod/p/" + pid : X.isBook(p) ? "#/vod/my/ship" : "";
  const toDg = !away && X.typeOf(p) === "vod" && X.dgOpen(p);
  const bump = () => { if (window.ReactApp) window.ReactApp.redraw(); };
  useEffect(() => { if (away) window.ROUTE.redirect(away); }, [away]);
  useEffect(() => { if (toDg) { const t = setTimeout(() => X.enterDg(pid, lid), 30); return () => clearTimeout(t); } return undefined; }, [toDg, pid, lid, X]);
  useEffect(() => {
    if (away) return;
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, away, moved]);
  if (away) return null;
  if (toDg) return <Shell nav="" tab="" n={n}><div className="vd-wrap vd-go-dg"><span className="vd-dg-ic"><DgLogo /></span><b>{p.creator} 강사 두잉고 강의실로 이동하고 있어요</b><p>강의 영상 · 교재 · 업데이트 소식을 두잉고 강의실에서 한 번에 볼 수 있어요.</p></div></Shell>;
  if (X.typeOf(p) === "ebook") return <Shell nav="" tab="my" n={n}><Ebook p={p} m={m} /></Shell>;
  if (X.isEvent(p)) return <Shell nav="" tab="my" n={n}><Ticket p={p} m={m} /></Shell>;
  const lz = X.lessons(p), pr = X.prog(m.id, pid), cur = lz.find((l) => l.id === lid) || lz.find((l) => l.id === pr.last) || lz.find((l) => !pr.done[l.id]) || lz[0];
  if (!cur) return <Shell nav="" tab="" n={n}><div className="vd-wrap"><div className="vd-empty"><Icon n="monitorPlay" /><b>아직 올라온 강의가 없어요</b></div></div></Shell>;
  // VOD 플레이어는 예전처럼 스토어 머리띠 · 바닥 없이 (body[data-mode="vod"]:has(.vd-player) 검은 바탕)
  return <Player p={p} m={m} cur={cur} redraw={bump} />;
}
