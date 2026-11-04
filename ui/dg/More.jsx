"use client";
/* 두잉고 강의실: 동기부여 #/motivation · 1:1 소통채널 #/channels · 제휴채널 #/partners · 수료증 #/certificate · 라이브 다시보기 #/replays(/<영상>)
 *  · 모범 과제 #/showcase · 학습 노트 #/notes · 용어 사전 #/glossary · 추가 메뉴 #/page/<메뉴>
 * 예전 app.js pageMotivation · pageChannels · pagePartners · pageCertificate · pageReplays · pageReplay · pageShowcase · showcaseZoom · pageNotes · pageGlossary · glossaryList · pageCustom 을 React 로 (Next.js 전환 5단계)
 *  · 다 봤어요 · 노트 저장 · 노트 내려받기 · 수료증 PDF 는 예전 함수 그대로 (DGA.replayFlip · journalSave · exportNotes · certPrint) */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, fmtMD, fmtFull, todayStr, Progress, PctText, Empty, PageHead, Crumb, Pager, Video, StateBadge, playDelegate } from "./bits.jsx";
import { NotFound, Attachments } from "./Learn.jsx";
import { MainLecCard } from "./HomePage.jsx";

const redraw = () => window.ReactApp.redraw();
const Mark = ({ k, c }) => <RawOne html={window.brandMark(k, c)} />;

/** 강의실 팝업 — 예전 openModal(제목, 내용, 버튼, wide) 과 같은 모양 (#modal-root 안 · X · 닫기 버튼으로만 닫혀요) */
export function DgModal({ title, wide, actions, onClose, bodyHtml, children }) {
  useEffect(() => { const c = () => onClose(); window.addEventListener("dc:modal-close", c); return () => window.removeEventListener("dc:modal-close", c); }, [onClose]);
  useEffect(() => { const f = document.querySelector("#modal-root input, #modal-root select, #modal-root [data-action=modal-close]"); if (f) f.focus(); }, []);
  const box = document.getElementById("modal-root"); if (!box) return null;
  return createPortal(
    <div className="modal-backdrop"><div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head"><h3 id="modal-title">{title}</h3><button className="icon-btn" data-action="modal-close" aria-label="닫기" onClick={onClose}><Icon n="x" /></button></div>
      {bodyHtml != null ? <div className="modal-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : <div className="modal-body">{children}</div>}{actions ? <div className="modal-actions">{actions}</div> : null}</div></div>, box);
}

/* ---------- 동기부여 ---------- */
export function MotivationPage() {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), quote = D.quotes.length ? D.quotes[DB.date.parseDate(todayStr()).getDate() % D.quotes.length] : "";
  const list = D.motivation, mv = X.mv(), cur = list.find((x) => x.id === mv.sel) || list[0], yid = cur ? DB.youtubeId(cur.youtubeId) : "";
  const pick = (it) => { X.mv(it.id); redraw(); setTimeout(() => { const s = document.getElementById("mv-stage"); if (s && s.getBoundingClientRect().top < 60) s.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0); };
  return (
    <div className="page mv-page"><PageHead title={X.ML("motivation")} sub={"지칠 때 다시 힘을 내도록 " + D.brand.instructor + "님이 고른 영상이에요."} />
      {cur ? <>
        <section className="mv-stage" id="mv-stage">{yid && mv.auto
          ? <div key={cur.id} className="video mv-player" data-yid={yid}><iframe src={"https://www.youtube-nocookie.com/embed/" + yid + "?autoplay=1&rel=0&playsinline=1"} title={cur.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
          : <div key={cur.id} className="mv-player-wrap"><Video item={cur} /></div>}
          <div className="mv-now"><b>{cur.title}</b>{cur.minutes || cur.durSec || cur.date ? <span className="tiny">{[X.lenTxt(cur), cur.date ? fmtMD(cur.date) : ""].filter(Boolean).join(" · ")}</span> : null}</div></section>
        <div className="section-head"><h2>오늘의 응원 영상</h2>{D.brand.youtubeChannel ? <a className="link-btn" href={D.brand.youtubeChannel} target="_blank" rel="noopener">유튜브 채널 <Icon n="arrowUpRight" c="sm" /></a> : null}</div>
        <div className="mv-tiles">{list.map((it, i) => { const y = DB.youtubeId(it.youtubeId), on = it === cur; return (
          <button key={it.id} type="button" className={"mv-tile" + (on ? " on" : "")} data-action="mv-pick" data-id={it.id} aria-pressed={String(on)} title={it.title} onClick={() => pick(it)}>
            <span className="mv-tile-img">{y ? <img src={"https://i.ytimg.com/vi/" + y + "/hqdefault.jpg"} alt="" loading="lazy" /> : <span className="vod-ph">{it.title}</span>}<span className="mv-tile-play"><Icon n="play" /></span></span>
            <span className="mv-tile-label">영상 {i + 1}{on ? <em>재생 중</em> : null}</span></button>); })}</div>
      </> : <section className="card" style={{ marginTop: "14px" }}><Empty ic="flame">응원 영상을 준비하고 있어요.</Empty></section>}
      {quote ? <div className="quote" style={{ marginTop: "20px" }}>“{quote}”<small>— {D.brand.instructor}</small></div> : null}
    </div>
  );
}

/* ---------- 1:1 소통채널 · 제휴채널 ---------- */
const chStyle = (color, ink) => (color ? { "--ch": color, "--chi": ink } : undefined);
function ChCard({ ch }) {
  const DB = DBX(), t = DB.channelType(ch.type), ok = !!(ch.url || "").trim(), info = !ok && !!(ch.note || "").trim(), look = DB.channelLook(ch), style = chStyle(look.color, look.ink);
  const kakao = ch.type === "kakao" || ch.type === "openchat" || /kakao\.com/i.test(ch.url || "");
  const inner = <>
    <span className="ch-bar" aria-hidden="true" />{ch.tag ? <span className="ch-tag">{ch.tag}</span> : null}
    <div className="res-top"><span className="ch-icon" style={style}><Icon n={look.icon} />{kakao ? <span className="ch-badge"><Mark k="kakao" /></span> : null}</span><div><div className="res-title">{ch.title || t.label}</div>
      <div className="tiny ch-via">{kakao ? <><Mark k="kakao" c="xs" /><span><b>{t.label}</b>{ok ? "로 바로 연결돼요" : ""}</span></> : t.label}{ch.hours ? " · " + ch.hours : ""}</div></div></div>
    {ch.desc ? <div className="res-desc">{ch.desc}</div> : null}
    <div className="res-foot">{ok ? (kakao ? <span className="ch-go kakao"><Mark k="kakao" c="sm" />{ch.label || "카카오톡으로 상담하기"}<Icon n="arrowUpRight" c="sm" /></span> : <span className="ch-go" style={style}>{ch.label || "상담하기"}<Icon n="arrowUpRight" c="sm" /></span>)
      : info ? <span className="ch-info"><Icon n="lock" c="sm" /><span>{ch.note}</span></span> : <span className="tiny">링크를 준비하고 있어요</span>}</div>
  </>;
  return ok ? <a className="res-card ch-card" href={ch.url} target="_blank" rel="noopener" style={style}>{inner}</a> : <div className={"res-card ch-card " + (info ? "info" : "off")} aria-disabled={info ? undefined : "true"} style={style}>{inner}</div>;
}
export function ChannelsPage() {
  const X = DGA(), S = st(), list = DBX().channelsOf(S.D);
  return (
    <div className="page"><PageHead title={X.ML("channels")} sub="상담이 필요할 때 편한 채널을 골라 바로 연결하세요." />
      {list.length ? <div className="grid-2 ch-grid">{list.map((ch, i) => <ChCard key={ch.id || i} ch={ch} />)}</div> : <section className="card"><Empty ic="headset">상담 채널을 준비하고 있어요.</Empty></section>}
      <p className="ch-note"><Icon n="clock" c="xs" /> 운영 시간 밖에는 답변이 늦을 수 있어요.{X.on("qna") ? <> 화면 오류는 <a href="#/qna/requests/new">1:1 요청</a>으로 남겨 주시면 더 빨라요.</> : null}</p></div>
  );
}
const isCafe = (u) => /cafe\.naver\.com/i.test(u || "");
function PtCard({ x }) {
  const DB = DBX(), G = DB.PARTNER_GROUPS, t = DB.channelLook(Object.assign({ type: "other" }, x)), col = t.color || "var(--ink)", ink = t.color ? DB.inkOn(t.color) : "#fff";
  const style = { "--ch": col, "--chi": ink }, ok = !!(x.url || "").trim(), cafe = isCafe(x.url);
  const go = ok ? (cafe && x.featured ? <span className="ch-go naver"><Mark k="naver" c="sm" />{x.label || "카페 바로가기"}<Icon n="arrowUpRight" c="sm" /></span> : <span className="ch-go" style={style}>{x.label || "바로가기"}<Icon n="arrowUpRight" c="sm" /></span>) : <span className="tiny">링크를 준비하고 있어요</span>;
  const inner = <>
    <span className="ch-bar" aria-hidden="true" />{x.tag ? <span className="ch-tag">{x.tag}</span> : null}
    <div className="res-top"><span className="ch-icon" style={style}><Icon n={t.icon} />{cafe ? <span className="ch-badge"><Mark k="naver" /></span> : null}</span><div><div className="res-title">{x.title}</div>
      <div className="tiny ch-via">{cafe ? <><Mark k="naver" c="xs" /><span><b>네이버 카페</b>{x.featured ? "" : " 글에서 혜택 확인"}</span></> : (G.find((g) => g.key === x.group) || G[0]).label}</div></div></div>
    {x.desc ? <div className="res-desc">{x.desc}</div> : null}
    {x.featured && (x.points || []).length ? <ul className="pt-points">{x.points.map((p, i) => <li key={i}><Icon n="check" c="xs" />{p}</li>)}</ul> : null}
    <div className="res-foot">{go}</div>
  </>;
  const cls = "res-card ch-card pt-card" + (x.featured ? " pt-feature" : "");
  return ok ? <a className={cls} href={x.url} target="_blank" rel="noopener" style={style}>{inner}</a> : <div className={cls + " off"} style={style}>{inner}</div>;
}
export function PartnersPage({ r }) {
  const X = DGA(), S = st(), DB = DBX(), all = DB.partnersOf(S.D), G = DB.PARTNER_GROUPS;
  const tab = G.some((g) => g.key === r.params.get("tab")) ? r.params.get("tab") : "all", feat = all.find((x) => x.featured && x.url);
  const count = (k) => all.filter((x) => k === "all" || x.group === k).length;
  const secs = G.filter((g) => tab === "all" || tab === g.key).map((g) => { const list = all.filter((x) => x.group === g.key).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); return list.length ? { g, list } : null; }).filter(Boolean);
  return (
    <div className="page"><PageHead title={X.ML("partners")} sub="수강생만 받을 수 있는 제휴 혜택과 두고그룹 서비스를 모았어요." />
      {feat ? <a className="pt-notice" href={feat.url} target="_blank" rel="noopener"><Mark k={isCafe(feat.url) ? "naver" : "kakao"} c="md" /><span><b>제휴 혜택 · 할인 코드는 모두 {feat.title}에서 안내해 드려요</b><small>{(feat.tag || "") + (feat.tag ? " · " : "")}카페에 가입하면 제휴사 할인 코드와 이용 방법을 바로 볼 수 있어요.</small></span><Icon n="arrowUpRight" c="sm" /></a> : null}
      <div className="utabs pt-tabs" role="tablist">{[["all", "전체보기"]].concat(G.map((g) => [g.key, g.label])).map((t) => <a key={t[0]} role="tab" href={"#/partners" + (t[0] === "all" ? "" : "?tab=" + t[0])} className={tab === t[0] ? "on" : ""} aria-selected={String(tab === t[0])}>{t[1]} <span className="fnum">{count(t[0])}</span></a>)}</div>
      {all.length ? (secs.length ? secs.map(({ g, list }) => (
        <section key={g.key} className="pt-sec"><div className="section-head"><h2>{g.label} <span className="tiny">{list.length}곳</span></h2><span className="hint">{g.desc}</span></div>
          <div className="grid-2 ch-grid">{list.map((x, i) => <PtCard key={x.id || i} x={x} />)}</div></section>
      )) : <section className="card" style={{ marginTop: "14px" }}><Empty ic="handshake">이 분류에는 아직 등록된 곳이 없어요.</Empty></section>)
        : <section className="card" style={{ marginTop: "14px" }}><Empty ic="handshake">제휴 혜택을 준비하고 있어요.</Empty></section>}
    </div>
  );
}

/* ---------- 수료증 ---------- */
export function CertificatePage() {
  const X = DGA(), S = st(), D = S.D, me = S.me, CO = S.CO, DB = DBX(), o = X.overallStats();
  const earned = o.reqTotal > 0 && o.reqDone === o.reqTotal, demoOpen = !earned && !S.preview && !!me.demo, canPreview = !earned && S.preview;
  const isPv = demoOpen || (canPreview && X.certPv()), showOpen = earned || isPv;
  const remaining = X.allMissions().filter((m) => m.required && !X.isDone(m.id));
  let doneDate = todayStr();
  if (earned) { const ts = Math.max.apply(null, X.allMissions().filter((m) => m.required).map((m) => { const s = X.lastSub(m.id); return s ? s.at : 0; })); if (ts) doneDate = DB.date.toStr(new Date(ts)); }
  const pct = o.reqTotal ? Math.round((o.reqDone / o.reqTotal) * 100) : 0, canPrint = window.self === window.top;
  const d = DB.date.parseDate(doneDate), ko = d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
  const flip = () => { const on = X.certPv(true); redraw(); if (on) setTimeout(() => { const c = document.querySelector(".cert-wrap"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0); };
  return (
    <div className="page"><PageHead title={X.ML("certificate")} sub={"필수 과제 " + o.reqTotal + "개를 모두 통과하면 수료증이 발급됩니다."} />
      <section className="card overall no-print"><div className="overall-top"><span>필수 과제 통과</span><PctText pct={pct} /></div><Progress pct={pct} /><span className="tiny" style={{ color: "var(--body)" }}>{o.reqTotal}개 중 {o.reqDone}개 통과{earned ? " · 수료 조건을 모두 채웠어요!" : " · " + remaining.length + "개 남음"}</span></section>
      <div className="cert-wrap"><article className={"cert" + (showOpen ? "" : " locked") + (isPv ? " is-preview" : "")} aria-label="수료증">
        <div className="cert-inner">
          <span className="cert-corner tl" /><span className="cert-corner tr" /><span className="cert-corner bl" /><span className="cert-corner br" />
          <RawOne html={X.certRosette()} />
          <header className="cert-head"><RawOne html={window.logoMark("cert-mark")} /><span className="cert-brand">{D.brand.name}</span></header>
          <p className="cert-eyebrow">CERTIFICATE OF COMPLETION</p><h2 className="cert-title">수 료 증</h2>
          <p className="cert-no">제 {X.certNo()} 호</p>
          <div className="cert-name"><small>성 명</small><span>{me.name}</span></div>
          <p className="cert-body">위 사람은 <b>{D.brand.courseTitle}</b> {CO.name} 과정을 성실히 이수하고,<br />필수 과제 {o.reqTotal}개를 모두 통과하였기에 이 증서를 수여합니다.</p>
          <dl className="cert-meta"><div><dt>과정명</dt><dd>{D.brand.courseTitle}</dd></div><div><dt>교육 기간</dt><dd>{fmtFull(CO.startDate) + " ~ " + fmtFull(DB.cohortEnd(CO))}</dd></div><div><dt>수료일</dt><dd>{fmtFull(doneDate)}</dd></div></dl>
          <footer className="cert-foot"><p className="cert-date">{ko}</p><div className="cert-sign"><span className="cert-org">{D.brand.name}</span><span className="cert-who">대표 강사 <b>{D.brand.instructor}</b></span><RawOne html={X.certSeal(D.brand.instructor)} /></div></footer>
          <RawOne html={'<p class="cert-powered">' + window.poweredBy("color") + "</p>"} />
        </div>
        {isPv ? <div className="cert-ribbon">{demoOpen ? "체험 계정" : "미리보기"}</div> : null}
        {showOpen ? null : <div className="cert-lock"><Icon n="lock" /><strong>필수 과제 {remaining.length}개가 남았어요</strong><span className="muted">모두 통과하면 이름이 새겨진 수료증이 열립니다.</span>
          {canPreview ? <button className="btn btn-primary" data-action="cert-preview" onClick={flip}><Icon n="eye" c="sm" />강사 미리보기: 수료증 열어 보기</button> : null}</div>}
      </article></div>
      {showOpen ? <>
        <div className="guide-actions no-print" style={{ justifyContent: "center", marginTop: "16px" }}>{canPrint ? <button className="btn btn-primary" data-action="print" onClick={(e) => X.certPrint(e.currentTarget)}><Icon n="download" c="sm" />PDF로 내려받기</button> : null}
          {isPv && !demoOpen ? <button className="btn btn-secondary" data-action="cert-preview" onClick={flip}><Icon n="lock" c="sm" />미리보기 닫기</button> : null}</div>
        {isPv ? <p className="tiny no-print" style={{ textAlign: "center", margin: "10px 0 0" }}>{demoOpen ? "체험 계정이라 수료증을 열어 두었어요." : "체험용 미리보기예요."} 실제 수강생은 필수 과제를 모두 통과해야 이 수료증이 열려요.</p> : null}
      </> : null}
      {!earned ? <><div className="section-head no-print"><h2>남은 필수 과제</h2></div><section className="card no-print">{remaining.map((m) => {
        const w = X.findWeek(m.weekNo);
        return X.isOpen(w) ? <a key={m.id} className="list-row" href={"#/missions/" + m.weekNo + "/" + m.id}><span className="badge badge-neutral">{m.weekNo}주차</span><span className="lr-title">{m.title}</span><StateBadge id={m.id} /></a>
          : <div key={m.id} className="list-row" style={{ opacity: ".6" }}><span className="badge badge-neutral">{m.weekNo}주차</span><span className="lr-title">{m.title}</span><span className="lr-date"><Icon n="lock" c="xs" /> {fmtMD(X.openOf(w))}</span></div>;
      })}</section></> : null}
    </div>
  );
}

/* ---------- 라이브 다시보기 · 모범 과제 ---------- */
function WeekChips({ nums, cur, action, all, onPick }) {
  return <div className="fchips wk-chips">{[["all", "전체", all]].concat(nums.map((n) => [String(n), n + "주차", null])).map((x) => (
    <button key={x[0]} type="button" className={"fchip" + (String(cur) === x[0] ? " on" : "")} data-action={action} data-k={x[0]} aria-pressed={String(String(cur) === x[0])} onClick={() => onPick(x[0])}>{x[1]}{x[2] != null ? <> <span className="fnum">{x[2]}</span></> : null}</button>
  ))}</div>;
}
function Replay({ id }) {
  const X = DGA(), S = st(), DB = DBX(), all = X.replaysSorted(), i = all.findIndex((x) => x.id === id), x = all[i];
  if (!x) return <NotFound />;
  const seen = !!(S.P.replays || {})[id], newer = all[i - 1], older = all[i + 1], ml = !!X.mainLec(), w = x.week ? X.findWeek(x.week) : null;
  const flip = () => { if (X.replayFlip(id)) { redraw(); X.toast("다 본 영상으로 표시했어요."); } else redraw(); };
  return (
    <div className="page"><PageHead title={x.title} sub={[x.week ? Number(x.week) + "주차" : "", x.date ? fmtFull(x.date) + (ml ? " 업로드" : " 라이브") : "", X.lenTxt(x)].filter(Boolean).join(" · ")} crumbs={<Crumb items={[[X.ML("replays"), "#/replays"], [x.title]]} />} />
      <section className="card"><Video item={x} />
        {x.summary ? <RawOne html={'<div class="rp-notes"><p class="side-label">' + window.icon("pin", "xs") + " 이번 라이브 핵심 정리</p>" + DB.rich(x.summary) + "</div>"} /> : null}<Attachments list={x.attachments} />
        <div className="guide-actions" style={{ marginTop: "20px" }}><button className={"btn " + (seen ? "btn-secondary" : "btn-primary")} data-action="toggle-replay" data-id={id} onClick={flip}><Icon n="check" c="sm" />{seen ? "다 봤어요 · 취소" : "다 봤어요"}</button>
          {x.week && X.on("missions") && w && X.isOpen(w) ? <a className="btn btn-tertiary" href={"#/missions/" + Number(x.week)}>{Number(x.week)}주차 과제 보기</a> : null}
          {X.on("notes") ? <a className="btn btn-tertiary" href="#/notes"><Icon n="notebookPen" c="sm" />{X.ML("notes")}에 정리하기</a> : null}</div></section>
      <Pager p={older ? { href: "#/replays/" + older.id, label: "이전 라이브", title: older.title } : null} n={newer ? { href: "#/replays/" + newer.id, label: "다음 라이브", title: newer.title } : null} back="#/replays" />
    </div>
  );
}
export function ReplaysPage({ r }) {
  const X = DGA(), S = st(), DB = DBX();
  if (r.parts[1]) return <Replay key={r.parts[1]} id={r.parts[1]} />;
  const all = X.replaysSorted(), seen = S.P.replays || {}, weeks = all.map((x) => Number(x.week) || 0).filter((n, i, a) => n && a.indexOf(n) === i).sort((a, b) => a - b);
  if (X.rpWeek() !== "all" && weeks.indexOf(Number(X.rpWeek())) === -1) X.rpWeek("all");
  const wk = X.rpWeek(), list = all.filter((x) => wk === "all" || Number(x.week) === Number(wk)), done = all.filter((x) => seen[x.id]).length, pct = all.length ? Math.round(done / all.length * 100) : 0, ml = X.mainLec(), sub = !!ml;
  return (
    <div className="page"><PageHead title={X.ML("replays")} sub={sub ? "메인 강의 외에, 수강생이 가장 헷갈려 하는 부분만 짧게 찍어 올린 보충 강의예요. 메인 강의 녹화본은 " + (ml.platform || "외부 강의실") + "에서 봐요." : "라이브를 놓쳤거나 한 번 더 듣고 싶을 때, 주차별로 골라 보세요."} />
      {sub ? <MainLecCard compact /> : null}
      {all.length ? <>
        <section className="card overall"><div className="overall-top"><span>{sub ? "보충 강의 시청" : "다시보기 시청"}</span><PctText pct={pct} /></div><Progress pct={pct} /><span className="tiny" style={{ color: "var(--body)" }}>{all.length}개 중 {done}개 시청 · 최근 영상이 맨 앞에 있어요</span></section>
        {weeks.length > 1 ? <WeekChips nums={weeks} cur={wk} action="rp-week" all={all.length} onPick={(k) => { X.rpWeek(k); redraw(); }} /> : null}
        <div className="rp-grid">{list.map((x) => { const yid = DB.youtubeId(x.youtubeId); return (
          <a key={x.id} className="card rp-card plain-link" href={"#/replays/" + x.id}><span className="rp-thumb">{yid ? <img src={"https://i.ytimg.com/vi/" + yid + "/mqdefault.jpg"} alt="" loading="lazy" /> : null}<span className="rp-play"><Icon n="play" /></span><RawOne html={DB.vdur.label(x.youtubeId, x.durSec, x.minutes || "", "rp-len")} /></span>
            <span className="rp-body"><span className="rp-meta">{x.week ? <span className="badge badge-neutral">{Number(x.week)}주차</span> : null}{x.date ? <span>{fmtMD(x.date) + (ml ? " 업로드" : " 라이브")}</span> : null}{seen[x.id] ? <span className="badge badge-positive"><Icon n="check" c="xs" />다 봤어요</span> : null}</span>
              <b>{x.title}</b>{x.summary ? <span className="rp-sum">{String(x.summary).replace(/\s+/g, " ").slice(0, 90)}</span> : null}</span></a>); })}</div>
      </> : <section className="card"><Empty ic="monitorPlay">{ml ? "아직 올라온 보충 강의가 없어요." : "아직 올라온 다시보기 영상이 없어요."}</Empty></section>}
    </div>
  );
}
function ScCard({ x, zoom }) {
  const X = DGA(), S = st(), DB = DBX(), imgs = x.images || [], w = x.week ? X.findWeek(x.week) : null, m = x.missionId && w ? w.missions.find((mm) => mm.id === x.missionId) : null;
  return (
    <article className="card sc-card">{imgs.length ? <div className={"sc-shots n" + Math.min(imgs.length, 3)}>{imgs.slice(0, 3).map((im, i) => <button key={i} type="button" className="sc-shot" data-action="sc-zoom" data-id={x.id} data-i={i} aria-label="사진 크게 보기" onClick={() => zoom(x, i)}><img src={im.data || im.url} alt="" loading="lazy" />{i === 2 && imgs.length > 3 ? <span className="sc-more">+{imgs.length - 3}</span> : null}</button>)}</div> : null}
      <div className="sc-body"><div className="sc-tags"><span className="sc-medal"><Icon n="trophy" c="xs" />모범 과제</span>{x.week ? <span className="badge badge-neutral">{Number(x.week)}주차</span> : null}{x.author ? <span className="sc-author">{x.author}</span> : null}</div>
        <h3>{x.title}</h3>
        {x.desc ? <RawOne html={'<div class="sc-comment"><span class="sc-c-label">' + window.icon("message", "xs") + DB.esc(S.D.brand.instructor) + " 코멘트</span>" + DB.rich(x.desc) + "</div>"} /> : null}
        {m && X.on("missions") && X.isOpen(w) ? <a className="link-btn sc-go" href={"#/missions/" + w.no + "/" + m.id}>‘{m.title}’ 과제 하러 가기 <Icon n="arrowRight" c="sm" /></a> : null}</div></article>
  );
}
export function ShowcasePage({ r }) {
  const X = DGA(), S = st();
  if (r.params.get("w")) { X.scWeek(r.params.get("w")); window.ROUTE.replace("#/showcase"); }
  const [z, setZ] = useState(null);
  const all = (S.D.showcase || []).slice().sort((a, b) => (Number(a.week) || 99) - (Number(b.week) || 99)), weeks = all.map((x) => Number(x.week) || 0).filter((n, i, a) => n && a.indexOf(n) === i).sort((a, b) => a - b);
  if (X.scWeek() !== "all" && weeks.indexOf(Number(X.scWeek())) === -1) X.scWeek("all");
  const wk = X.scWeek(), list = all.filter((x) => wk === "all" || Number(x.week) === Number(wk));
  useEffect(() => { if (z) { const at = document.getElementById("sc-zoom-at"); if (at) at.scrollIntoView({ block: "start" }); } }, [z]);
  return (
    <div className="page"><PageHead title={X.ML("showcase")} sub={S.D.brand.instructor + "님이 고른 잘한 과제예요. 어떻게 하면 좋은지 감을 잡고 내 과제에 적용해 보세요."} />
      {all.length ? <>{weeks.length > 1 ? <WeekChips nums={weeks} cur={wk} action="sc-week" all={all.length} onPick={(k) => { X.scWeek(k); redraw(); }} /> : null}
        <div className="sc-grid">{list.map((x) => <ScCard key={x.id} x={x} zoom={(it, i) => setZ({ x: it, i })} />)}</div></>
        : <section className="card"><Empty ic="trophy">아직 등록된 모범 과제가 없어요.</Empty></section>}
      {z ? <DgModal title={z.x.title} wide onClose={() => setZ(null)} actions={<button className="btn btn-primary" data-action="modal-close" onClick={() => setZ(null)}>닫기</button>}>
        <div className="sc-zoom">{(z.x.images || []).map((im, k) => <img key={k} src={im.data || im.url} alt={z.x.title + " 사진 " + (k + 1)} id={k === Number(z.i) ? "sc-zoom-at" : undefined} />)}</div></DgModal> : null}
    </div>
  );
}

/* ---------- 학습 노트 ---------- */
// 예전처럼 화면을 다시 그릴 때(n)의 기록으로 그리고, 적는 동안은 저장 표시만 바뀌어요
function NotesBody() {
  const X = DGA(), S = st(), D = S.D, DB = DBX();
  const [snap] = useState(() => JSON.parse(JSON.stringify({ J: S.P.journal || {}, N: S.P.notes || {} }))), J = snap.J, N = snap.N;
  const [state, setState] = useState({}), timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = D.weeks.filter(X.isOpen), today = todayStr(), cur = D.weeks.find((w) => X.isOpen(w) && today <= X.deadlineOf(w)) || open[open.length - 1];
  const answered = open.filter((w) => Object.keys((J[w.no] || {}).a || {}).some((k) => (J[w.no].a[k] || "").trim())).length, memoCount = Object.keys(N).filter((k) => (N[k] || "").trim()).length;
  const type = (wk) => { setState((o) => Object.assign({}, o, { [wk]: "저장 중…" })); clearTimeout(timer.current); timer.current = setTimeout(() => { X.journalSave(wk); setState((o) => Object.assign({}, o, { [wk]: "방금 저장됨" })); }, 600); };
  return (
    <div className="page"><PageHead title={X.ML("notes")} sub="주차마다 배운 것을 짧게 돌아보고, 강의 메모까지 한곳에 모아 두는 나만의 노트예요." />
      <section className="card nt-sum"><div className="nt-stat"><b>{answered}<small> / {open.length}주</small></b><span>회고 작성</span></div><div className="nt-stat"><b>{memoCount}<small>개</small></b><span>강의 메모</span></div>
        <button type="button" className="btn btn-secondary btn-sm nt-export" data-action="notes-export" onClick={() => X.exportNotes()}><Icon n="download" c="sm" />노트 내려받기</button></section>
      {D.weeks.length ? D.weeks.map((w) => {
        if (!X.isOpen(w)) return <section key={w.no} className="card nt-week locked"><div className="nt-head"><span className="nt-no">{w.no}</span><div><b>{w.no}주차 · {w.title}</b><small><Icon n="lock" c="xs" /> {fmtMD(X.openOf(w))}에 열려요</small></div></div></section>;
        const ans = (J[w.no] || {}).a || {}, memos = w.lessons.filter((l) => (N[l.id] || "").trim()), ps = X.promptsOf(w.no), filled = ps.filter((p) => (ans[p.id] || "").trim()).length;
        return (
          <details key={w.no} className="card nt-week" open={w === cur || undefined}><summary className="nt-head"><span className="nt-no">{w.no}</span><div><b>{w.no}주차 · {w.title}</b><small>{(filled ? "회고 " + filled + "개 작성" : "아직 비어 있어요") + (memos.length ? " · 강의 메모 " + memos.length + "개" : "") + (w === cur ? " · 이번 주" : "")}</small></div><Icon n="chevDown" c="sm chev" /></summary>
            <div className="nt-qs">{ps.map((p, i) => <label key={p.id} className="nt-q"><span className="nt-q-t"><i>Q{i + 1}</i>{p.q}</span><textarea className="textarea" rows="3" data-journal={w.no} data-q={p.id} placeholder="생각나는 대로 짧게 적어도 좋아요" defaultValue={ans[p.id] || ""} onInput={() => type(w.no)} /></label>)}
              <p className="tiny nt-state" id={"nt-state-" + w.no}>{state[w.no] || ((J[w.no] || {}).at ? DB.date.fmtStamp((J[w.no] || {}).at) + " 저장됨" : "적으면 자동으로 저장돼요")}</p></div>
            {memos.length ? <div className="nt-memos"><p className="side-label"><Icon n="pen" c="xs" /> 강의 메모</p>{memos.map((l) => <a key={l.id} className="nt-memo" href={"#/curriculum/" + l.id}><b>{l.title}</b><span>{N[l.id]}</span></a>)}</div>
              : <p className="tiny nt-hint"><Icon n="pen" c="xs" /> 강의 화면의 ‘내 메모’에 적은 내용도 여기에 모여요.</p>}
          </details>
        );
      }) : <section className="card"><Empty ic="notebookPen">주차가 열리면 노트를 쓸 수 있어요.</Empty></section>}
    </div>
  );
}
export function NotesPage({ n }) { return <NotesBody key={n} />; }

/* ---------- 용어 사전 ---------- */
function GlList({ q, cat }) {
  const X = DGA(), S = st(), G = S.D.glossary || [], t = String(q || "").trim().toLowerCase().replace(/\s/g, "");
  const list = G.filter((g) => (cat === "전체" || (g.category || "기타") === cat) && (!t || (g.term + g.desc + (g.category || "")).toLowerCase().replace(/\s/g, "").indexOf(t) !== -1)).sort((a, b) => String(a.term).localeCompare(String(b.term), "ko"));
  if (!list.length) return <Empty ic="search">찾는 용어가 없어요. {S.D.brand.botName}에게 물어보세요.</Empty>;
  const groups = []; list.forEach((g) => { const k = X.initialOf(g.term); let grp = groups.find((x) => x.k === k); if (!grp) groups.push(grp = { k, items: [] }); grp.items.push(g); });
  const jump = (e, k) => { e.preventDefault(); const g = document.getElementById("gl-" + encodeURIComponent(k)); if (g) g.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return <>
    {t ? null : <nav className="gl-index" aria-label="초성 색인">{groups.map((g) => <a key={g.k} href={"#gl-" + encodeURIComponent(g.k)} data-action="gl-jump" data-k={g.k} onClick={(e) => jump(e, g.k)}>{g.k}</a>)}</nav>}
    {groups.map((g) => <div key={g.k} className="gl-group" id={"gl-" + encodeURIComponent(g.k)}><h3 className="gl-k">{g.k}</h3>{g.items.map((x, i) => <article key={i} className="gl-item"><div className="gl-term"><b>{x.term}</b>{x.category ? <span className="badge badge-neutral">{x.category}</span> : null}</div><p>{x.desc}</p></article>)}</div>)}
  </>;
}
export function GlossaryPage({ r }) {
  const X = DGA(), S = st(), G = S.D.glossary || [], q0 = r.params.get("q") || "";
  const cats = ["전체"].concat(G.map((g) => g.category || "기타").filter((c, i, a) => a.indexOf(c) === i));
  if (cats.indexOf(X.glCat()) === -1) X.glCat("전체");
  const [q, setQ] = useState(q0), [cat, setCat] = useState(X.glCat());
  return (
    <div className="page"><PageHead title={X.ML("glossary")} sub="강의에 나오는 낯선 용어를 쉬운 말로 풀어 두었어요. 모르는 말이 나오면 여기서 찾아보세요." />
      <section className="card gl-card"><div className="search"><Icon n="search" /><input className="input" id="gl-search" type="search" defaultValue={q0} placeholder={"용어를 검색해 보세요 (예: " + ((G[0] || {}).term || "마진율") + ")"} aria-label="용어 검색" onInput={(e) => setQ(e.currentTarget.value)} /></div>
        {cats.length > 2 ? <div className="faq-cats" role="tablist">{cats.map((c) => <button key={c} type="button" className={"chip" + (c === cat ? " on" : "")} data-action="gl-cat" data-cat={c} onClick={() => { X.glCat(c); setCat(c); }}>{c} <span>{c === "전체" ? G.length : G.filter((g) => (g.category || "기타") === c).length}</span></button>)}</div> : null}
        <div id="gl-list"><GlList q={q} cat={cat} /></div></section>
      {X.on("bot") ? <p className="tiny" style={{ marginTop: "12px" }}><Icon n="bot" c="xs" /> {S.D.brand.botName}에게 ‘○○가 뭐예요?’라고 물어봐도 이 풀이로 답해 드려요.</p> : null}
    </div>
  );
}

/* ---------- 추가 메뉴 (마스터가 만든 자유 페이지) ---------- */
export function CustomPage({ r }) {
  const X = DGA(), DB = DBX(), c = X.customOf(r.parts[1]);
  if (!c) return <NotFound />;
  const { item, pg } = c, yid = DB.youtubeId(pg.youtubeId), has = pg.body || yid || (pg.attachments || []).length;
  return (
    <div className="page"><PageHead title={pg.title || item.label || "추가 메뉴"} sub={pg.summary || ""} />
      <section className="card custom-page">{has ? <>{yid ? <Video item={{ title: pg.title || item.label, youtubeId: pg.youtubeId }} /> : null}{pg.body ? <RawOne html={'<div class="body">' + DB.rich(pg.body) + "</div>"} onClick={playDelegate} /> : null}<Attachments list={pg.attachments} /></>
        : <Empty ic={item.icon || "file"}>내용을 준비하고 있어요.</Empty>}</section></div>
  );
}
