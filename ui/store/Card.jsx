"use client";
/* 클래스 카드 — 예전 card(p, o) 를 React 로 (둥근 썸네일 · 찜 수 ♡ 알약 · 종류 칩 · 제목 · 강사 | 분야 · 할인율 + 가격 · 혜택 칩 · ‘OO님이 찜했어요’)
 * 2026-11-08: 찜 수는 패스트캠퍼스처럼 썸네일 위 알약으로 · 별점 · 후기 수는 카드에서 뺐어요
 * 썸네일 그림(thumbArt)은 아직 예전 코드 그대로 (Raw) */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { VOD, DB, today } from "../lib/legacy.js";

export function Av({ nick, cls }) {
  const a = VOD().avOf(nick);
  return <i className={"vd-av " + (cls || "")} style={{ "--c": a.c }}>{a.t}</i>;
}
export function CrName({ p }) {
  const ph = VOD().crPhoto(p);
  return <span className="vd-crn">{ph ? <img src={ph} alt="" loading="lazy" /> : <i>{(p.creator || "D").slice(0, 1)}</i>}<b>{p.creator || ""}</b></span>;
}
/* 카드 썸네일 아래 정보 (2026-11-19 · 탈잉 · Class101 처럼) — 예전 화면 cardInfo · ctagsHtml · cpriceHtml · perksHtml 과 같은 모양 */
export function CTags({ x }) {
  return <span className="vd-ctags"><span className={"vd-ctag vd-ctag-k vd-ctag-" + x.kind.k}>{x.kind.ic ? <Icon n={x.kind.ic} c="xs" /> : null}{x.kind.t}</span>
    {x.badge ? <span className={"vd-ctag vd-ctag-b vd-ctag-b-" + x.badge.k}>{x.badge.t}</span> : null}{x.subs.map((s, i) => <span key={i} className="vd-ctag">{s}</span>)}</span>;
}
export function CPrice({ pc }) {
  return <div className={"vd-cprice" + (pc.k ? " vd-cprice-" + pc.k : "")}><span className="vd-cpr">{pc.pct ? <em>{pc.pct}%</em> : null}<strong>{pc.main}</strong>{pc.was ? <s>{pc.was}</s> : null}</span>{pc.note ? <small>{pc.note}</small> : null}</div>;
}
export function Perks({ ps }) {
  return ps.length ? <span className="vd-perks">{ps.map((x, i) => <span key={i} className={"vd-perk vd-perk-" + x.k}><Icon n={x.ic} c="xs" />{x.t}</span>)}</span> : null;
}
export function LikeBtn({ p, m, onLike }) {
  const X = VOD();
  return <button type="button" className={"vd-like" + (X.liked(m && m.id, p.id) ? " on" : "")} data-v="like" data-id={p.id} aria-label={p.status === "soon" ? "오픈 알림 받기" : "찜하기"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike(p.id, e.currentTarget); }}><small>{X.likeNum(X.likeCount(p))}</small><Icon n="heart" c="sm" /></button>;
}

export default function Card({ p, o, onLike }) {
  o = o || {};
  const X = VOD(), m = X.me(), lk = X.likersOf(p), left = X.seatsLeft(p), x = X.cardInfo(p);
  const se = X.saleEndOf(p), eb = X.ebOf(p), dleft = se ? DB().date.diffDays(se.slice(0, 10), today()) : null;
  const ov = o.rank ? <span className="vd-rank">BEST {o.rank}</span> : left === 0 ? <span className="vd-ov">마감</span> : X.stockLeft(p) === 0 ? <span className="vd-ov">품절</span> : eb ? <span className="vd-ov vd-ov-eb">얼리버드 {dleft ? "D-" + dleft : "오늘 마감"}</span> : dleft != null && dleft >= 0 && dleft <= 7 ? <span className="vd-ov vd-ov-dd">할인 {dleft ? "D-" + dleft : "오늘 마감"}</span> : null;
  const sold = X.soldOf(p), cnt = o.rank && sold >= 100 ? <span className="vd-cnt"><Icon n="users" c="xs" /><b><i data-count={sold} data-cid={p.id}>{sold.toLocaleString()}</i>+</b></span> : null;
  return (
    <a className="vd-card" href={"#/vod/p/" + p.id}>
      <div className={"vd-thumb vd-th-" + X.typeOf(p) + (ov ? " has-ov" : "")}><RawOne html={X.thumbArt(p)} />{ov || cnt ? <span className="vd-ovs">{ov}{cnt}</span> : null}<LikeBtn p={p} m={m} onLike={onLike} /></div>
      <div className="vd-card-b"><CTags x={x} /><b className="vd-title">{p.title}</b>
        <span className="vd-cr"><CrName p={p} />{x.cat ? <><i /><span className="vd-xcat">{x.cat}</span></> : null}</span>
        <CPrice pc={x.price} /><Perks ps={x.perks} />
        {lk.length ? <span className="vd-social"><span className="vd-avs">{lk.map((nk, i) => <Av key={i} nick={nk} />)}</span><span><b>{lk[0]}</b>님이 {p.status === "soon" ? "알림 신청했어요" : "찜했어요"}</span></span> : null}
      </div></a>
  );
}

/** 두잉고 기수 강의 · 무료 LIVE 카드 (예전 xcard — 다른 사이트 주소로 가는 카드) */
export function XCard({ it }) {
  const X = VOD(), p = it.p;
  return (
    <a className="vd-card" href={it.href}><div className={"vd-thumb vd-th-" + X.typeOf(p)}><RawOne html={X.thumbArt(p)} /></div>
      <div className="vd-card-b"><CTags x={X.xcardInfo(it)} /><b className="vd-title">{p.title}</b><span className="vd-cr"><CrName p={p} /></span>
        {p.priceTxt ? <CPrice pc={{ k: "", pct: 0, main: p.priceTxt, was: "", note: "" }} /> : null}</div></a>
  );
}
/** 예전 anyCard — 두잉고 카드면 XCard, 아니면 클래스 카드 */
export function AnyCard({ it, o, onLike }) {
  return it.ext ? <XCard it={it} /> : <Card p={it.p || it} o={o} onLike={onLike} />;
}

