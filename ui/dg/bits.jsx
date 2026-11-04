"use client";
/* 두잉고 강의실 공통 조각 (예전 app.js video · progressBar · stateBadge · liveBtn · empty · pageHead · crumb · pager · thumb · botFace 를 React 로) */
import { Fragment, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";

export const DGA = () => window.DGA;
export const DBX = () => window.DB;
export const st = () => window.DGA.st();
export const fmtMD = (s) => window.DB.date.fmtMD(s);
export const fmtFull = (s) => window.DB.date.fmtFull(s);
export const todayStr = () => window.DB.date.todayStr();

/** 유튜브 카드 → 누르면 그 자리에서 재생 (유튜브에서 보기 링크는 늘 · 영상이 없으면 채널로) */
export function Video({ item, headline }) {
  const S = st(), DB = DBX(), yid = DB.youtubeId(item.youtubeId);
  const [play, setPlay] = useState(false);
  const minutes = DB.vdur.label(item.youtubeId, item.durSec, item.minutes ? (typeof item.minutes === "number" || /^\d+$/.test(item.minutes) ? item.minutes + "분" : item.minutes) : "", "vp-time");
  const title = headline || item.title;
  if (yid) {
    if (play) return <div className="video" data-yid={yid}><iframe src={"https://www.youtube-nocookie.com/embed/" + yid + "?autoplay=1&rel=0"} title="영상" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /><a className="video-out" href={"https://www.youtube.com/watch?v=" + yid} target="_blank" rel="noopener">재생이 안 되면 유튜브에서 보기 <Icon n="arrowUpRight" c="xs" /></a></div>;
    const go = (e) => { if (e.target.closest(".vp-ext")) return; setPlay(true); };
    return (
      <div className="video" data-yid={yid}><div className="video-ph" role="button" tabIndex={0} data-action="video-play" aria-label={item.title + " 재생"} onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlay(true); } }}>
        <img className="vp-img" src={"https://i.ytimg.com/vi/" + yid + "/hqdefault.jpg"} alt="" loading="lazy" />
        <span className="vp-title">{title}</span><span className="vp-play"><Icon n="play" /></span>
        <span className="vp-foot"><a href={"https://www.youtube.com/watch?v=" + yid} target="_blank" rel="noopener" className="vp-ext">유튜브에서 보기 <Icon n="arrowUpRight" c="xs" /></a>{minutes ? <RawOne html={minutes} /> : null}</span></div></div>
    );
  }
  const ch = S.D.brand.youtubeChannel, Tag = ch ? "a" : "div";
  return (
    <div className="video"><Tag className="video-ph" {...(ch ? { href: ch, target: "_blank", rel: "noopener" } : {})}>
      <span className="vp-title">{title}</span><span className="vp-play"><Icon n="play" /></span>
      <span className="vp-foot"><span>영상 준비 중{ch ? " · " + S.D.brand.name + " 채널에서 보기" : ""}</span>{minutes ? <RawOne html={minutes} /> : null}</span></Tag></div>
  );
}
// 영상 길이 칸(DB.vdur.label 이 만든 <span class="vp-time" data-vdur …>) 은 예전 HTML 그대로 — 실제 길이를 받으면 DB.vdur.paint 가 글자만 바꿔요

/** 진행 막대 */
export const Progress = ({ pct, thin }) => <div className={"progress" + (thin ? " thin" : "")} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}><span style={{ width: pct + "%" }} /></div>;
export const PctText = ({ pct }) => <span className="big-pct">{pct}<small>%</small></span>;

/** 과제 상태 (통과 · 강사 승인 · 보완 · 미제출) */
export function StateBadge({ id }) {
  const X = DGA(), s = X.missionState(id), l = X.lastSub(id);
  if (s === "done") return <span className="badge badge-positive"><Icon n="check" c="xs" />{l && l.review ? "강사 승인" : "통과"}</span>;
  if (s === "fix") return <span className="badge badge-warning">{l && l.review ? "강사 보완 요청" : "보완 필요"}</span>;
  return <span className="badge badge-neutral">미제출</span>;
}
/** 입장하기 (줌 · 유튜브 라이브는 새 창) */
export const LiveBtn = ({ e, small }) => (e.url ? <a className={"btn btn-primary" + (small ? " btn-sm" : "")} href={e.url} target={/^https?:/i.test(e.url) ? "_blank" : undefined} rel={/^https?:/i.test(e.url) ? "noopener" : undefined}><Icon n="video" c="sm" />입장하기</a> : null);
export const NewBadge = ({ n }) => (DGA().isUnread(n) ? <span className="badge badge-new">NEW</span> : null);
export const Empty = ({ ic, children }) => <div className="empty"><Icon n={ic} /><div>{children}</div></div>;
export const PageHead = ({ title, sub, crumbs }) => <header className="page-head">{crumbs ? <nav className="crumbs">{crumbs}</nav> : null}<h1>{title}</h1>{sub ? <p>{sub}</p> : null}</header>;
/** 경로 [[이름, 주소], …, [지금 화면]] */
export const Crumb = ({ items }) => items.map((c, i) => (i < items.length - 1 ? <Fragment key={i}><a href={c[1]}>{c[0]}</a><Icon n="chevRight" c="xs" /></Fragment> : <span key={i}>{c[0]}</span>));
/** 이전 · 다음 카드 (+ 목록으로) */
export function Pager({ p, n, back }) {
  return <>
    <nav className="pager" aria-label="이전 · 다음">
      {p ? <a className="pager-a prev" href={p.href}><span className="pager-ic"><Icon n="chevLeft" c="sm" /></span><span className="pager-t"><small>{p.label}</small><b>{p.title}</b></span></a> : <span className="pager-empty" />}
      {n ? <a className="pager-a next" href={n.href}><span className="pager-t"><small>{n.label}</small><b>{n.title}</b></span><span className="pager-ic"><Icon n="chevRight" c="sm" /></span></a> : <span className="pager-empty" />}
    </nav>{back ? <div className="pager-back"><a className="btn btn-secondary" href={back}><Icon n="menu" c="sm" />목록으로</a></div> : null}</>;
}
export function Thumb({ item }) {
  const yid = DBX().youtubeId(item.youtubeId);
  return <span className="lesson-thumb">{yid ? <img src={"https://i.ytimg.com/vi/" + yid + "/mqdefault.jpg"} alt="" loading="lazy" /> : null}<Icon n="play" /></span>;
}
/** AI 조교 얼굴 (강사 사진 · 없으면 로봇) */
export function BotFace({ size }) {
  const b = st().D.brand;
  return <span className={"bot-face" + (size ? " " + size : "")}>{b.photo ? <img src={b.photo} alt="" /> : <Icon n="bot" c="sm" />}</span>;
}
