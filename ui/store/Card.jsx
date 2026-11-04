"use client";
/* 클래스 카드 — 예전 vod.js card(p, o) 를 React 로 (둥근 썸네일 · 찜 · 제목 · 강사 · 찜 수 · 후기 · 가격 · 종류 줄 · ‘OO님이 찜했어요’)
 * 썸네일 그림(thumbArt)은 아직 예전 코드 그대로 (Raw) */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { VOD, DB, won, today } from "../lib/legacy.js";

export function Av({ nick, cls }) {
  const a = VOD().avOf(nick);
  return <i className={"vd-av " + (cls || "")} style={{ "--c": a.c }}>{a.t}</i>;
}
export function CrName({ p }) {
  const ph = VOD().crPhoto(p);
  return <span className="vd-crn">{ph ? <img src={ph} alt="" loading="lazy" /> : <i>{(p.creator || "D").slice(0, 1)}</i>}<b>{p.creator || ""}</b></span>;
}
export function CardMeta({ p }) {
  const x = VOD().cardMetaParts(p);
  return <span className="vd-cmeta"><span className={"vd-kchip vd-kchip-" + x.chip[1]}>{x.chip[0]}</span><span className="vd-cm">{x.parts.filter(Boolean).map((y, i) => <span key={i}>{y}</span>)}</span></span>;
}
export function LikeBtn({ p, m, onLike }) {
  const X = VOD();
  return <button type="button" className={"vd-like" + (X.liked(m && m.id, p.id) ? " on" : "")} data-v="like" data-id={p.id} aria-label={p.status === "soon" ? "오픈 알림 받기" : "찜하기"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike(p.id, e.currentTarget); }}><Icon n="heart" c="sm" /></button>;
}

export default function Card({ p, o, onLike }) {
  o = o || {};
  const X = VOD(), m = X.me(), rt = X.ratingOf(p.id), pr = X.priceOf(p), pct = X.pctOf(p), lk = X.likersOf(p), left = X.seatsLeft(p);
  const se = X.saleEndOf(p), eb = X.ebOf(p), dleft = se ? DB().date.diffDays(se.slice(0, 10), today()) : null, y = X.y365(p);
  const ov = o.rank ? <span className="vd-rank">BEST {o.rank}</span> : left === 0 ? <span className="vd-ov">마감</span> : X.stockLeft(p) === 0 ? <span className="vd-ov">품절</span> : eb ? <span className="vd-ov vd-ov-eb">얼리버드 {dleft ? "D-" + dleft : "오늘 마감"}</span> : dleft != null && dleft >= 0 && dleft <= 7 ? <span className="vd-ov vd-ov-dd">할인 {dleft ? "D-" + dleft : "오늘 마감"}</span> : null;
  const sold = X.soldOf(p), cnt = o.rank && sold >= 100 ? <span className="vd-cnt"><Icon n="users" c="xs" /><b><i data-count={sold} data-cid={p.id}>{sold.toLocaleString()}</i>+</b></span> : null;
  return (
    <a className="vd-card" href={"#/vod/p/" + p.id}>
      <div className={"vd-thumb vd-th-" + X.typeOf(p) + (ov ? " has-ov" : "")}><RawOne html={X.thumbArt(p)} />{ov || cnt ? <span className="vd-ovs">{ov}{cnt}</span> : null}<LikeBtn p={p} m={m} onLike={onLike} /></div>
      <div className="vd-card-b"><b className="vd-title">{p.title}</b>
        <span className="vd-cr"><CrName p={p} /><i /><span className="vd-hc" data-hc={p.id}><Icon n="heart" c="xs" />{X.likeCount(p)}</span>{rt.n ? <><i /><span className="vd-rvc" title={"수강후기 " + rt.n + "개 · 평균 " + rt.avg.toFixed(1) + "점"}><Icon n="star" c="xs" />{rt.avg.toFixed(1)}<small>후기 {rt.n}</small></span></> : null}</span>
        <div className="vd-price">{p.status === "soon" ? <><strong>오픈 예정</strong>{pr ? <s>{won(pr)}</s> : null}</> : pr === 0 ? <strong>무료</strong> : <><strong>{won(y ? y.sale : pr)}</strong>{pct ? <em>{pct}%</em> : null}</>}</div>
        <CardMeta p={p} />
        {lk.length ? <span className="vd-social"><span className="vd-avs">{lk.map((nk, i) => <Av key={i} nick={nk} />)}</span><span><b>{lk[0]}</b>님이 {p.status === "soon" ? "알림 신청했어요" : "찜했어요"}</span></span> : null}
      </div></a>
  );
}

/** 두잉고 기수 강의 · 무료 LIVE 카드 (예전 xcard — 다른 사이트 주소로 가는 카드) */
export function XCard({ it }) {
  const X = VOD(), p = it.p;
  return (
    <a className="vd-card" href={it.href}><div className={"vd-thumb vd-th-" + X.typeOf(p)}><RawOne html={X.thumbArt(p)} /></div>
      <div className="vd-card-b"><b className="vd-title">{p.title}</b><span className="vd-cr"><CrName p={p} /><i /><span className="vd-xcat">{p.catLabel || ""}</span></span>
        <div className="vd-price">{p.priceTxt ? <strong>{p.priceTxt}</strong> : null}</div><span className="vd-cmeta"><span className="vd-kchip vd-kchip-cohort">{p.catLabel || "두잉고"}</span><span className="vd-cm">{(p.meta || []).map((x, i) => <span key={i}>{x}</span>)}</span></span></div></a>
  );
}
/** 예전 anyCard — 두잉고 카드면 XCard, 아니면 클래스 카드 */
export function AnyCard({ it, o, onLike }) {
  return it.ext ? <XCard it={it} /> : <Card p={it.p || it} o={o} onLike={onLike} />;
}

