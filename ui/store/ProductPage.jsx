"use client";
/* 클래스 상세 (/vod/p/<클래스>) — 예전 vod.js pageProduct 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  대표 영상이 있으면(2026-11-08 · 탈잉 배치) [PC] 왼쪽 위 16:9 영상(소리 끈 채로 저절로 재생) → 베스트 후기 → 탭 · 본문 | 오른쪽 따라오는 카드  [휴대폰] 영상 → 카드 → 베스트 후기 → 탭 → 본문
 *  영상이 없으면 [PC] 맨 위 넓은 썸네일(예전 v7 그대로) → 아래 왼쪽 베스트 후기 → 탭 · 본문 | 오른쪽 따라오는 카드  [휴대폰] 썸네일 → 카드 → 베스트 후기 → 탭 → 본문
 *  카드: 뱃지 · 제목 · 별점 → 가격(제목 바로 아래) → 한눈에 보는 정보 → 수강권 · 쿠폰 · 수강신청 · 찜 · 공유
 *  탭(클래스 소개 · 커리큘럼 · 다짐 · 후기(후기 + 다짐 한 숫자) · 강사 소개 · 이용 안내) → 소개 · 커리큘럼(미리보기) · 후기 · 다짐 · 강사(코멘트) · 강의 정보 · 수강권 · FAQ · 환불 · 함께 보는 클래스
 *  아래: 휴대폰 결제 막대(위 가격 카드가 지나가면 올라와요 · 수강 옵션 창)
 *  · 무엇을 보여 줄지(가격 · 수강권 · 쿠폰 · 버튼 · 탭 · 함께 보는 클래스 …)는 예전 계산 그대로 (VOD.productView · buyView · planView · fbarView · ctaOf …)
 *  · 쿠폰 받기 · 후기 · 다짐 · 공감은 예전 함수 그대로 (VOD.cpGet · doReview · doPledge · plUp · plDel)
 *  · 배너 그림 · 썸네일 · 상세 이미지 · 환불 표처럼 예전 HTML 로 만드는 조각은 그대로 넣어요 (ui/lib/Raw.jsx) */
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import Card, { Av } from "./Card.jsx";
import { EmptyBox } from "./TeachersPage.jsx";
import Icon from "../lib/Icon.jsx";
import Modal from "../lib/Modal.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import { Eg, useMotion } from "../lib/motion.jsx";
import { VOD, DB, won, hash, toast, storeRoute } from "../lib/legacy.js";
import { usePageLike } from "./pageActs.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const lines = (t) => String(t || "").split("\n").map((x, i) => <Fragment key={i}>{i ? <br /> : null}{x}</Fragment>);
const jump = (id) => { const s = document.getElementById(id); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" }); };
const fmtDay = (at) => DB().date.fmtFull(DB().date.toStr(new Date(at)));
const Icx = ({ n, c }) => <RawOne html={VOD().icx(n, c)} />;

/** 별점 (예전 stars) */
function Stars({ v }) {
  return [1, 2, 3, 4, 5].map((i) => <i key={i} className={v >= i - 0.25 ? "on" : v >= i - 0.75 ? "half" : ""}><Icon n="star" c="xs" /></i>);
}
/** 남은 시간 (1초마다) */
function Cd({ end }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  return <b data-cd={end}>{VOD().cdTxt(end)}</b>;
}
/** 수강신청 · 알림 · 마감 버튼 (예전 ctaHtml) */
function Cta({ p, c, cls, onLike }) {
  if (c.off) return <button type="button" className={"vd-btn vd-btn-off " + cls} disabled>{c.txt}</button>;
  if (c.v) return <button type="button" className={"vd-btn vd-btn-p " + cls + (c.on ? " is-on" : "")} data-v="like" data-id={p.id} onClick={() => onLike(p.id)}>{c.ic ? <Icon n={c.ic} c="sm" /> : null}{c.txt}</button>;
  return <a className={"vd-btn " + (c.dark ? "vd-btn-dark" : "vd-btn-p") + " " + cls} href={c.href} data-co-link={c.co ? p.id : undefined}>{c.ic ? <Icon n={c.ic} c="sm" /> : null}{c.txt}</a>;
}

/* ---------- 수강권 한 줄 · 수강권 상자 (예전 planRow · planBox) ---------- */
function PlanRow({ y, name, on, onPick }) {
  const off = y.rb ? y.rb : y.list > y.sale ? Math.round((1 - y.sale / y.list) * 100) : 0, was = y.rb ? y.was : y.list > y.sale ? y.list : 0;
  return (
    <label className={"vd-plan" + (on ? " on" : "")}><input type="radio" name={name} value={y.d} data-plan="" defaultChecked={on} onChange={() => onPick(y.d)} /><span className="vd-plan-t"><b>{y.label} 수강권</b>{y.d === 365 ? <em>추천</em> : null}<small>총 {won(y.sale)} · {y.d + "일 수강"}</small></span>
      <span className="vd-plan-p">{was ? <s>{won(was)}</s> : null}<span className="vd-plan-mo">{off ? <em>{off}%</em> : null}<strong>{won(y.month)}<small>/월</small></strong></span></span></label>
  );
}
function PlanBox({ p, sfx, onPlan }) {
  const X = VOD(), { ps, sel, c, on, rb } = X.planView(p);
  return (
    <div className="vd-plans" data-plans={p.id}><p className="vd-plans-h"><b><Icx n="ticket" c="xs" />수강권 선택{X.ebOf(p) ? <em className="vd-eb-tag">얼리버드</em> : null}{rb ? <em className="vd-rb-tag">재수강 {rb}%</em> : null}</b><small>{rb ? "수강 기간이 끝난 강의라 할인가로 다시 들어요" : "12개월이 한 달 가격이 가장 낮아요"}</small></p>
      {ps.map((y) => <PlanRow key={y.d} y={y} name={"vd-plan-" + sfx} on={y.d === sel.d} onPick={(d) => onPlan({ d })} />)}
      {c ? <label className={"vd-addon" + (on ? " on" : "")}><input type="checkbox" value="1" data-plan-coach="" defaultChecked={on} onChange={(e) => onPlan({ coach: e.currentTarget.checked })} /><span className="vd-addon-t"><b>1:1 코칭권 {c.n}회 함께 사기</b><small>{c.days}일 동안 강사에게 직접 질문 · 1회 {won(c.per)}</small></span><strong>+{won(c.price)}</strong></label> : null}
      <div className="vd-plans-tot"><span>총 결제 예정 금액</span><strong data-plan-tot="">{won(sel.sale + (on ? c.price : 0))}</strong></div></div>
  );
}

/* ---------- 가격 카드 (예전 buyCard · ownBox · addonBtns · cpDlBtn) ---------- */
function OwnBox({ p, m }) {
  const X = VOD(), { e, dl, c, cl, tz } = X.ownView(p, m);
  return <>
    <div className="vd-pc-own"><span className="vd-tag vd-tag-blue">수강 중</span><b>{e === Infinity ? "기간 제한 없음" : fmtDay(e) + "까지"}</b>{e !== Infinity ? <small>D-{Math.max(0, dl)}</small> : null}</div>
    <dl className="vd-pc-rows"><div><dt>진도율</dt><dd><b>{X.pctDone(m.id, p.id)}%</b></dd></div>{c ? <div><dt>1:1 코칭권</dt><dd>{cl ? <>남은 <b>{cl}회</b></> : "없음"}</dd></div> : null}{tz.length ? <div><dt>TEA TIME</dt><dd>{X.TEA_ST[(tz[0].tea || {}).st || "req"][0]}</dd></div> : null}</dl>
  </>;
}
function AddonBtns({ p, m }) {
  const X = VOD(), c = X.coachOf(p), t = X.teaOf(p), ext = X.canExtend(m.id, p.id) ? X.extendOf(p) : null;
  return <>
    {ext ? <a className="vd-btn vd-btn-o vd-btn-xl" href={"#/vod/checkout/" + p.id + "?item=extend"}><Icon n="refresh" c="sm" />1년 연장권 {won(ext.sale)}</a> : null}
    {c || t ? <div className="vd-pc-add">{c ? <a href={"#/vod/checkout/" + p.id + "?item=coach"}><Icon n="message" c="sm" /><span><b>1:1 코칭권</b><small>{c.n}회 · {won(c.price)}</small></span></a> : null}{t ? <a href={"#/vod/checkout/" + p.id + "?item=tea"}><Icx n="coffee" c="sm" /><span><b>TEA TIME 신청</b><small>{t.min}분 · {won(t.price)}</small></span></a> : null}</div> : null}
  </>;
}
function CpBtn({ p, m, onOpen }) {
  const X = VOD();
  if (!(X.priceOf(p) > 0) || p.status !== "on" || X.isBook(p) || (m && X.owns(m.id, p.id))) return null;
  const cs = X.dlCoupons(p), left = m ? cs.filter((c) => !X.hasCp(m.id, c)).length : cs.length;
  if (!cs.length) return null;
  return <button type="button" className={"vd-cpdl" + (left ? "" : " got")} data-v="cp-open" data-p={p.id} onClick={onOpen}><Icon n={left ? "download" : "check"} c="xs" />{left ? "사용 가능한 쿠폰이 있어요!" : "받은 쿠폰 " + cs.length + "장 · 결제할 때 적용돼요"}</button>;
}
/* ---------- 카드 위쪽: 뱃지 · 제목 · 별점 → 가격 → 한눈에 보는 정보 (예전 pcHead · headView) ---------- */
/** 카드 맨 위 줄: 뱃지 + 오른쪽 ‘미리보기 N개’ 버튼 (예전 pcTag · 2026-11-08 — 썸네일 · 영상 위에서 이 자리로) */
function PcTag({ p, bs, act }) {
  const pvs = VOD().previewsOf(p);
  if (!bs.length && !pvs.length) return null;
  return <div className="vd-pc-tag">{bs.length ? <div className="vd-badges">{bs.map((b, i) => <span key={i} className={"vd-badge vd-b-" + b[1]}>{b[0]}</span>)}</div> : null}
    {pvs.length ? <button type="button" className="vd-pc-pv" data-v="pv-open" data-p={p.id} data-l={pvs[0].id} onClick={() => act.pv(pvs[0].id)}><i><Icon n="play" /></i><span>미리보기 <b>{pvs.length}개</b></span></button> : null}</div>;
}
function PcHead({ p, act }) {
  const X = VOD(), { hp, end, eb, cdOn, bs, rows } = X.headView(p), fb = X.freshBand(p), nt = X.rvPlN(p), lc = X.likeCount(p);
  return <>
    <PcTag p={p} bs={bs} act={act} />
    <h1 className="vd-pdt-h1">{p.title}</h1>
    {/* 제목 아래 줄 (예전 pcHead · 2026-11-08): ♥ 찜 수 | 다짐 · 후기 N — 수강생 · 판매 수 · 찜한 사람 얼굴은 보여 주지 않아요 · 0 인 숫자도 빼요 (둘 다 0 이면 줄 없음) */}
    {lc || nt ? <div className="vd-pdt-rate">{lc ? <span><Icon n="heart" c="xs" />{lc}</span> : null}{nt ? <>{lc ? <i /> : null}<button type="button" data-v="jump" data-to="vd-s-reviews" onClick={() => jump("vd-s-reviews")}><Icon n="message" c="xs" />{(X.isBook(p) ? "다짐 · 독자 후기" : "다짐 · 후기") + " "}<b>{nt}</b></button></> : null}</div> : null}
    {hp ? <div className="vd-hp">{hp.was ? <s className="vd-hp-was">{hp.was}</s> : null}<div className="vd-hp-row">{hp.pct ? <em>{hp.pct}%</em> : null}{hp.lab ? <span className="vd-hp-lab">{hp.lab}</span> : null}<strong className={hp.free ? "free" : undefined}>{hp.main}</strong></div>{hp.note ? <small className="vd-hp-note">{hp.note}</small> : null}</div> : null}
    {cdOn ? <div className={"vd-cd" + (eb ? " vd-cd-eb" : "")}><Icon n="clock" c="xs" /><span>{eb ? "얼리버드 마감까지" : "할인 마감까지"}</span><Cd end={end} /><span>남음</span></div> : null}
    <ul className="vd-hi">{rows.map((r, i) => <li key={i} className={r[2] ? "dg" : undefined}><Icon n={r[0]} c="sm" /><span>{r[1]}</span></li>)}</ul>
    {fb ? <RawOne html={fb} onClick={() => jump("vd-s-curri")} /> : null}
    {p.fromFree ? <a className="vd-pdt-free" href={"#/free/" + p.fromFree}><Icon n="sparkles" c="sm" /><span><b>신청자 전용 선물 자료 · 사전 질문</b>은 무료강의 안내 페이지에서 받아요</span><Icon n="chevRight" c="xs" /></a> : null}
  </>;
}
function BuyCard({ p, act }) {
  const X = VOD(), { m, own, pr, left, isLiked, pvs, best, ps, rb } = X.buyView(p);
  const signup = !m && !X.isBook(p) ? <p className="vd-buy-cp"><span className="vd-tag vd-tag-red">쿠폰</span>가입하면 바로 쓰는 5,000원 할인 쿠폰을 드려요</p> : null;
  let price = null;
  if (p.status === "soon" || pr === 0) price = null;
  else if (own && ps.length) price = <OwnBox p={p} m={m} />;
  else if (rb) price = <><p className="vd-pc-exp vd-rb-note"><Icon n="refresh" c="xs" /><span>{fmtDay(X.accessEnd(m.id, p.id))}에 수강 기간이 끝났어요. <b>재수강 {rb}% 할인</b>이 자동으로 적용돼요 · 진도 · 노트는 그대로 이어져요.</span></p><PlanBox p={p} sfx="a" onPlan={act.plan} /><p className="vd-buy-cp vd-rb-cp">재수강 할인은 쿠폰과 함께 쓸 수 없어요 (포인트는 쓸 수 있어요)</p></>;
  else if (ps.length && p.status === "on") price = <><PlanBox p={p} sfx="a" onPlan={act.plan} />{best ? <p className="vd-buy-cp"><span className="vd-tag vd-tag-red">쿠폰</span>‘{best.c.name}’ 쿠폰은 결제 화면에서 수강권에 적용돼요</p> : signup}</>;
  else price = own ? null : best ? <dl className="vd-pc-rows"><div><dt>쿠폰 적용가</dt><dd><b>{won(pr - best.off)}</b></dd></div></dl> : signup;
  const fl = X.flNote(p), rk = X.refundKey(p);
  return (
    <div className={"vd-pc vd-pc8" + (ps.length ? " vd-pc-plans" : "")} id="vd-pdt-info"><PcHead p={p} act={act} />{fl ? <RawOne html={fl} /> : null}{price}
      {X.isEvent(p) && left != null ? <div className="vd-seat"><div><span>신청 현황</span><b>{p.seats - left} / {p.seats}명</b></div><i><u style={{ width: Math.round((p.seats - left) / p.seats * 100) + "%" }} /></i>{left && left <= 5 ? <small>마감까지 {left}자리 남았어요</small> : null}</div> : null}
      <CpBtn p={p} m={m} onOpen={act.cpOpen} />
      {X.plgView(p).give ? <button type="button" className="vd-plnudge" data-v="jump" data-to="vd-s-pledge" onClick={() => jump("vd-s-pledge")}><Icon n="pen" c="sm" /><span><b>다짐 한마디 쓰고 {won(window.DCS.price.PLEDGE.value)} 쿠폰 받기</b><small>{window.DCS.price.PLEDGE.min}자 이상 · 이 강의 전용 쿠폰</small></span><Icon n="chevRight" c="xs" /></button> : null}
      <div className="vd-pc-btns"><Cta p={p} c={X.ctaOf(p, m)} cls="vd-btn-xl" onLike={act.like} />{own ? <AddonBtns p={p} m={m} /> : null}{pvs.length && !own ? <button type="button" className="vd-btn vd-btn-o vd-btn-xl" data-v="pv-open" data-p={p.id} data-l={pvs[0].id} onClick={() => act.pv(pvs[0].id)}><Icon n="play" c="sm" />무료 미리보기 {pvs.length}개</button> : null}</div>
      <div className="vd-pc-sub"><button type="button" className={"vd-pc-like" + (isLiked ? " on" : "")} data-v="like" data-id={p.id} onClick={() => act.like(p.id)}><Icon n="heart" c="sm" />{"찜" + (X.likeNum(X.likeCount(p)) ? " " + X.likeNum(X.likeCount(p)) : "")}</button><button type="button" className="vd-pc-like" data-v="share" onClick={act.share}><Icon n="link" c="sm" />공유하기</button></div>
      <p className="vd-buy-note"><Icon n="shieldCheck" c="xs" />{rk === "vod" ? "결제 후 " + X.rfSet().days + "일 이내 · 강의를 듣기 전이면 100% 환불" : rk === "ebook" ? "내려받기 전 7일 이내 전액 환불" : rk === "book" ? "보내기 전이면 바로 취소 · 받은 날부터 7일 안 반품" : rk === "event" ? "강의 3일 전까지 전액 환불" : "무료 강의 · 신청 즉시 수강"} <button type="button" className="vd-link" data-v="jump" data-to="vd-s-refund" onClick={() => jump("vd-s-refund")}>환불 규정</button></p></div>
  );
}

/* ---------- 맨 위: 넓은 썸네일(영상이 없을 때 · 예전 heroHtml) · 대표 영상(예전 heroVid — 붙이기 heroWire · 소리 heroSnd · 멈춤 heroPause 는 예전 함수 그대로) ---------- */
function Hero({ p }) {
  const X = VOD();
  return <div className={"vd-pdt-banner vd-th-" + X.typeOf(p)}><RawOne html={X.bannerArt(p)} /></div>;
}
function HeroVid({ h }) {
  const X = VOD();
  return (
    // 영상을 누르면 멈추기 · 다시 재생 (안쪽 버튼은 제 일만 — 예전 heroToggle 그대로)
    <div className="vd-pd8-media"><div className="vd-pdv" data-v="pdv-tog" data-hero={h.k} data-src={h.src} data-st={h.st ? String(h.st) : undefined} onClick={(e) => { if (!e.target.closest("button")) X.heroToggle(e.currentTarget); }}>{h.id ? <RawOne html={X.heroPh(h)} /> : null}<div className="vd-pdv-slot" /><i className="vd-pdv-big" aria-hidden="true"><Icon n="play" /></i>
      <div className="vd-pdv-ctl"><button type="button" className="vd-pdv-pp" data-v="pdv-tog" aria-label="영상 멈추기 · 다시 재생" onClick={(e) => X.heroToggle(e.currentTarget.closest(".vd-pdv"))}><span className="off"><Icon n="pause" c="sm" /></span><span className="on"><Icon n="play" c="sm" /></span></button>
        <button type="button" className="vd-pdv-snd" data-v="pdv-snd" aria-label="소리 켜기 · 끄기" onClick={(e) => X.heroSnd(e.currentTarget)}><span className="off"><Icon n="volumeX" c="sm" />소리 켜기</span><span className="on"><Icon n="volume2" c="sm" />소리 끄기</span></button></div></div></div>
  );
}
/* ---------- 베스트 후기 (예전 bestHtml · 2026-11-08 탈잉 ‘베스트 리뷰’처럼) — 마스터가 고른 후기 · 다짐 · 고른 게 없으면 안 보여요 ---------- */
/** 좌우 화살표 (예전 railArr + wireRails 의 data-arr) — 처음 · 끝에서는 그쪽 화살표가 꺼져요 · 마우스로 끌어 넘기기도 같이 */
function RailArrows({ id, what }) {
  const [st, setSt] = useState({ start: true, end: true });
  useLayoutEffect(() => {
    const el = document.getElementById(id); if (!el) return undefined;
    const upd = () => { const e = VOD().railEnds(el); setSt((s) => (s.start === e.start && s.end === e.end ? s : { start: e.start, end: e.end })); };
    let t = 0; const onSc = () => { clearTimeout(t); t = setTimeout(upd, 60); };
    el.addEventListener("scroll", onSc, { passive: true }); upd();
    const ro = "ResizeObserver" in window ? new ResizeObserver(upd) : null; if (ro) ro.observe(el);
    VOD().dragWire(el);
    return () => { el.removeEventListener("scroll", onSc); clearTimeout(t); if (ro) ro.disconnect(); };
  }, [id]);
  const move = (d) => { const el = document.getElementById(id); if (el) { const r = VOD().railStep(el); el.scrollBy({ left: d * r.step * r.per, behavior: "smooth" }); } };
  return <span className="vd-best-arr">
    <button type="button" className="vd-best-ab prev" data-v="rail" data-r={id} data-d="-1" data-arr={id} aria-label={"이전 " + what} disabled={st.start} onClick={() => move(-1)}><Icon n="chevLeft" c="sm" /></button>
    <button type="button" className="vd-best-ab next" data-v="rail" data-r={id} data-d="1" data-arr={id} aria-label={"다음 " + what} disabled={st.end} onClick={() => move(1)}><Icon n="chevRight" c="sm" /></button></span>;
}
function Best({ p }) {
  const bs = VOD().bestOf(p);
  if (!bs.length) return null;
  return (
    <section className="vd-best" aria-label="베스트 후기"><div className="vd-best-h"><h2>베스트 후기</h2><RailArrows id="vd-r-best" what="후기" /></div>
      <div className="vd-best-rail" id="vd-r-best" data-drag="">{bs.map((x) => { const to = "vd-s-" + (x.k === "pl" ? "pledge" : "reviews"); return (
        <button key={x.k + x.id} type="button" className={"vd-best-c" + (x.k === "pl" ? " is-pl" : "")} data-v="jump" data-to={to} onClick={() => jump(to)}><span className="vd-best-ch">{x.k === "pl" ? <em className="vd-best-tag">다짐 한마디</em> : <span className="vd-stars sm"><Stars v={x.rating} /></span>}<b>{x.name}</b></span><span className="vd-best-t">{x.text}</span></button>); })}</div></section>
  );
}
/** 강사 코멘트 (강사 소개 칸 아래 — 예전 cmtHtml) */
function Cmt({ p }) {
  const X = VOD(), cm = X.cmtOf(p);
  const [open, setOpen] = useState(false);
  if (!cm) return null;
  return <div className={"vd-cmt" + (open ? " open" : "")}><b><Icon n="message" c="sm" />{p.creator || "강사"} 코멘트</b><p>{cm}</p>{cm.length > 90 ? <button type="button" className="vd-cmt-more" data-v="cmt-more" onClick={() => setOpen((v) => !v)}>{open ? "접기" : "더보기"}</button> : null}</div>;
}

/* ---------- 본문 섹션들 ---------- */
const Sec = ({ k, ttl, cls, children }) => <section className={"vd-pd-sec" + (cls ? " " + cls : "")} id={"vd-s-" + k}><Eg as="h2">{ttl}</Eg>{children}</section>;
function Intro({ p, v }) {
  const X = VOD(), t = v.t, dm = v.dm, dimg = v.dimg ? <RawOne html={v.dimg} /> : null, hl = v.hl;
  const ins = v.ins;
  return (
    <section className="vd-pd-sec vd-pd-intro" id="vd-s-intro">{dm === "img-text" || dm === "img" ? dimg : null}
      {dm === "img" ? null : <>
        <div className="vd-hl" style={{ "--acc": X.accOf(p) }} data-rv=""><small>{v.cat.label} · {X.TYPE[t][0]}</small><h2>{hl[0]}{hl[1] ? <><br /><em>{hl[1]}</em></> : null}</h2>{p.sub ? <p>{p.sub}</p> : null}</div>
        <div className="vd-pain"><p className="vd-k" data-rv="fade">이런 고민, 있으셨죠?</p><ul data-rv-kids="">{v.pains.map((x, i) => <li key={i} className={i % 2 ? "r" : ""}><i><Icon n="message" c="sm" /></i><span>{x}</span></li>)}</ul>
          {p.pitch ? <div className="vd-pain-a vd-pain-pitch" data-rv=""><small>그런 여러분을 위해</small><p>{p.pitch}</p></div> : <div className="vd-pain-a" data-rv=""><b>그래서 {p.creator || "크리에이터"}님이 직접 해 본 방법을<br /><em>처음부터 순서대로</em> 정리했어요.</b></div>}</div>
        {(p.learn || []).length ? <div className="vd-points" data-rv-kids="">{p.learn.slice(0, 4).map((x, i) => <div key={i} className="vd-point"><small>POINT {String(i + 1).padStart(2, "0")}</small><b>{x}</b></div>)}</div> : null}
        {v.before.length && v.after.length ? <div className="vd-ba"><Eg as="h3">강의 전과 후, <span data-accent="">이렇게 달라져요</span></Eg><div className="vd-ba-g" data-rv-kids=""><div className="vd-ba-b"><small>BEFORE</small><ul>{v.before.map((x, i) => <li key={i}><Icon n="x" c="xs" />{x}</li>)}</ul></div><i className="vd-ba-ar" aria-hidden="true"><Icon n="arrowRight" /></i><div className="vd-ba-a"><small>AFTER</small><ul>{v.after.map((x, i) => <li key={i}><Icon n="check" c="xs" />{x}</li>)}</ul></div></div></div> : null}
        {(p.who || []).length ? <div className="vd-who"><Eg as="h3">이런 분들께 <span data-accent="">추천해요</span></Eg><ul data-rv-kids="">{p.who.map((x, i) => <li key={i}><Icon n="check" c="xs" /><span>{x}</span></li>)}</ul></div> : null}
        {v.ev ? <div className="vd-evbox" data-rv=""><h3><Icon n="calendar" c="sm" />{t === "live" ? "LIVE 강의 안내" : "오프라인 강의 안내"}</h3><dl>{X.infoRows(p).map((r, i) => <div key={i}><dt>{r[0]}</dt><dd>{r[1]}</dd></div>)}<div><dt>{t === "live" ? "입장" : "준비물"}</dt><dd>{t === "live" ? (p.via === "zoom" ? "신청하면 마이페이지에 Zoom 입장 링크가 열려요. 시작 10분 전부터 들어올 수 있어요." : "신청하면 마이페이지 › LIVE · 오프라인에 카카오톡 오픈채팅방 입장 버튼이 열려요. 강의 날 오픈채팅방에 유튜브 라이브 링크를 올려 드려요.") : "노트북 · 충전기 · 신분증 (자세한 주소는 신청 후 문자로 보내 드려요)"}</dd></div></dl></div> : null}
        {p.intro ? <div className="vd-pd-body" data-rv="">{String(p.intro).split(/\n\n+/).map((x, i) => <p key={i}>{lines(x)}</p>)}</div> : null}
      </>}{dm === "text-img" ? dimg : null}
      {(p.gifts || []).length ? <div className="vd-gift" data-rv=""><Icon n="download" c="sm" /><div><b>수강 선물</b><span>{p.gifts.map((g) => g.title + (g.pages ? " (" + g.pages + "쪽)" : "")).join(" · ")}</span></div></div> : null}
      {ins && p.iid && !X.storeAs(p.iid) ? <a className="vd-cross" href={"#/p/" + p.iid} data-rv=""><span><small>프리미엄강의 · 한정인원 모집 중</small><b>{p.creator}님과 함께하는 두잉고 기수 강의</b><em>매주 과제 · 피드백 · 라이브 Q&A로 끝까지 함께해요</em></span><Icon n="arrowRight" c="sm" /></a> : null}
    </section>
  );
}
function Plans({ p }) {
  const X = VOD(), m = X.me(), ps = X.plansFor(p, m && m.id);
  if (!ps.length) return null;
  const c = X.coachOf(p), t = X.teaOf(p), rs = X.rebuySet(), dp = ps.find((y) => y.d === 365) || ps[0];
  const feats = [c ? ["message", "1:1 코칭권 " + c.n + "회", won(c.price), c.days + "일 동안 " + p.creator + " 강사에게 직접 질문하고 답을 받아요. 두잉고 강의실 ‘1:1 코칭 질문’에서 쓰면 1회씩 차감돼요. (1회 " + won(c.per) + ")"] : null,
    t ? ["coffee", "강사님과 TEA TIME " + t.min + "분", won(t.price), "수강생만 신청하는 1:1 만남이에요 (" + X.TEA_MODE[t.mode] + "). 희망 날짜 · 주제를 남기면 강사님이 일정을 확정해요."] : null,
    rs.on ? ["refresh", "재수강 " + rs.pct + "% 할인", "기간이 끝나면", "수강 기간이 끝난 뒤 다시 들을 때는 6개월 · 12개월 수강권을 " + rs.pct + "% 할인된 가격으로 결제해요. 진도 · 노트는 그대로 이어져요."] : null].filter(Boolean);
  return (
    <Sec k="plans" cls="vd-pd-plans" ttl={<>수강권 · <span data-accent="">1:1 코칭</span></>}><p className="vd-curri-sum">평생 소장 대신 필요한 기간만 골라서 더 합리적으로 들어요. 오래 볼수록 한 달 가격이 내려가요.</p>
      <div className="vd-plg">{ps.map((y) => <div key={y.d} className={"vd-plg-c" + (y.d === dp.d ? " rec" : "")}>{y.d === dp.d ? <em>추천</em> : null}<small>{y.label} 수강권{y.rb ? " · 재수강 " + y.rb + "%" : ""}</small><b>월 {won(y.month)}</b><span>총 <strong>{won(y.sale)}</strong>{y.rb ? <> <s>{won(y.was)}</s></> : y.list > y.sale ? <> <s>{won(y.list)}</s></> : null}</span></div>)}</div>
      {feats.length ? <ul className="vd-plf">{feats.map((f, i) => <li key={i}><span className="vd-plf-ic">{f[0] === "coffee" ? <Icx n="coffee" c="sm" /> : <Icon n={f[0]} c="sm" />}</span><div><b>{f[1]} <em>{f[2]}</em></b><p>{f[3]}</p></div></li>)}</ul> : null}
      <p className="vd-muted vd-plf-n"><Icon n="alert" c="xs" />1:1 코칭권 · TEA TIME은 수강권이 있는 동안 상세 페이지 · 마이페이지에서 따로 살 수 있어요. 쿠폰은 수강권에만 적용돼요.</p></Sec>
  );
}
function Curri({ p, v, act }) {
  const X = VOD(), t = v.t, bk = v.bk, own = v.own, ev = v.ev, lz = v.lz;
  const unit = (l) => (t === "ebook" || bk ? (Number(l.min) || 0) + "쪽" : X.lLen(l));
  return (
    <Sec k="curri" ttl={v.curName}>{v.pvs.length ? <><div className="vd-pvs-h"><b><Icon n="play" c="xs" />무료 미리보기 {v.pvs.length}개</b><small>강의 {lz.length}개 중 {v.pvs.length}개를 결제 전에 먼저 볼 수 있어요</small></div>
      <div className="vd-pvs" data-rv-kids="">{v.pvs.map((l) => <button key={l.id} type="button" className="vd-pv-card" data-v="pv-open" data-p={p.id} data-l={l.id} onClick={() => act.pv(l.id)}><RawOne html={X.pvThumb(p, l)} /><b>{l.title}</b><span>{l.desc || (X.chapOf(p, l).ch || {}).title || ""}</span></button>)}</div></> : null}<p className="vd-curri-sum">{t === "ebook" || bk ? (p.curriculum || []).length + "장 · 총 " + (Number(p.pages) || 0) + "쪽" : ev ? "총 " + X.durTxt(Number(p.eventMin) || X.totalMin(p)) + " 진행" : "파트 " + (p.curriculum || []).length + "개 · 클립 " + lz.length + "개 · 총 " + X.durTxt(X.totalMin(p))}</p>
      {(p.curriculum || []).map((ch, ci) => {
        const fc = X.freshCnt(ch.lessons || []);
        return (
          <details key={ci} className={"vd-ch" + (fc.n || fc.u ? " has-fresh" : "")} open={ci === 0 || !!fc.n || !!fc.u}><summary><b className="vd-ch-no">{t === "ebook" ? "" : "Part " + (ci + 1) + "."}</b><span>{ch.title}{fc.n || fc.u ? <i className="vd-ch-fresh">{(fc.n ? "NEW " + fc.n : "") + (fc.n && fc.u ? " · " : "") + (fc.u ? "UPDATE " + fc.u : "")}</i> : null}</span>
            <small>{t === "ebook" ? (ch.lessons || []).reduce((a, l) => a + (Number(l.min) || 0), 0) + "쪽" : (ch.lessons || []).length + "개 · " + X.durTxt(Math.round((ch.lessons || []).reduce((a, l) => a + X.lSec(l), 0) / 60))}</small><Icon n="chevDown" c="sm" /></summary>
            <ul>{(ch.lessons || []).map((l, li) => { const ft = X.freshTag(l); return (
              <li key={li} className={X.freshOf(l) ? "is-fresh" : undefined}><Icon n={own || l.preview ? (t === "ebook" ? "file" : "play") : "lock"} c="xs" /><span>{ci + 1}-{li + 1}. {l.title}{ft ? <RawOne html={ft} /> : null}</span>
                {l.preview && !own && !ev ? <button type="button" className="vd-pv" data-v="pv-open" data-p={p.id} data-l={l.id} onClick={() => act.pv(l.id)}>미리보기</button> : null}<Raw as="small" html={unit(l)} /></li>); })}</ul></details>
        );
      })}</Sec>
  );
}
function Reviews({ p, v }) {
  const X = VOD(), rs = v.rs, rt = v.rt, bk = v.bk;
  const send = (e) => { e.preventDefault(); X.doReview(e.currentTarget); };
  return (
    <Sec k="reviews" ttl={bk ? "독자 후기" : "수강 후기"}>
      {rs.length ? <div className="vd-rv-sum"><div className="vd-rv-big"><b>{rt.avg.toFixed(1)}</b><span className="vd-stars"><Stars v={rt.avg} /></span><small>후기 {rs.length}개</small></div><ul>{v.dist.map((n, i) => <li key={i}><span>{5 - i}점</span><i><u style={{ width: Math.round(n / rs.length * 100) + "%" }} /></i><small>{n}</small></li>)}</ul></div> : null}
      {v.canReview ? <form className="vd-rv-form" data-vd-review={p.id} onSubmit={send}><b>후기를 남겨 주세요 <small>후기를 쓰면 {(Number(X.V().settings.reviewPoint) || 0).toLocaleString()}P를 드려요</small></b>
        <div className="vd-rate" role="radiogroup" aria-label="별점">{[5, 4, 3, 2, 1].map((s) => <label key={s}><input type="radio" name="rating" value={s} defaultChecked={s === 5} /><Icon n="star" c="sm" /></label>)}</div>
        <textarea name="text" rows="3" maxLength="500" placeholder="강의를 듣고 좋았던 점을 적어 주세요 (10자 이상)" /><button className="vd-btn vd-btn-p" type="submit">후기 등록</button></form> : null}
      {rs.length ? <ul className="vd-rv-list">{rs.map((r, i) => <li key={r.id || i}><div className="vd-rv-h"><Av nick={r.name} /><b>{r.name}</b><span className="vd-stars sm"><Stars v={r.rating} /></span><time>{fmtDay(r.at)}</time></div><p>{r.text}</p></li>)}</ul> : <p className="vd-muted">아직 후기가 없어요. {bk ? "구매한" : "수강한"} 분만 남길 수 있어요.</p>}
    </Sec>
  );
}
/** 나의 다짐 한마디 + 다짐 쿠폰 (예전 plSecBody · plPaint · doPledge — 쿠폰은 서버가 줘요) */
function Pledges({ p, v, act }) {
  const X = VOD(), m = v.m, pls = v.pls, g = X.plgView(p), P = window.DCS.price;
  const ref = useRef(null);
  const [len, setLen] = useState(() => P.pledgeLen(g.draft));
  const ok = len >= g.min;
  const paint = (el) => { setLen(P.pledgeLen(el.value)); X.plKeep(p.id, el.value); };
  const send = (e) => { e.preventDefault(); X.doPledge(e.currentTarget).then((r) => { if (r && r.ok) { if (ref.current) ref.current.value = ""; setLen(0); } act.redraw(); }); };
  const ex = (t) => { const ta = ref.current; if (!ta) return; ta.value = t; paint(ta); ta.focus(); };
  return (
    <Sec k="pledge" ttl="나의 다짐 한마디">
      {g.give ? <div className="vd-plcp"><span className="vd-plcp-tk"><b>{Number(g.amt).toLocaleString()}<small>원</small></b><em>할인 쿠폰</em></span><div className="vd-plcp-t"><b>다짐 한마디 남기면 <em>{won(g.amt)} 할인 쿠폰</em>을 바로 드려요</b><small>{g.min}자 이상 · 이 강의 결제에 바로 사용 · 받은 날부터 {g.days}일</small></div></div>
        : g.mc && !g.mc.usedAt ? <div className="vd-plcp got"><Icon n="check" c="sm" /><div className="vd-plcp-t"><b>다짐 쿠폰 {won(Number(g.mc.value) || g.amt)}을 받았어요</b><small>{(g.mc.exp ? DB().date.fmtFull(g.mc.exp) + "까지 · " : "") + "결제할 때 바로 쓸 수 있어요"}</small></div></div> : null}
      <form className="vd-plform" data-vd-pledge={p.id} onSubmit={send}><label><span>{v.myNick} · 나의 다짐 한마디</span><textarea ref={ref} name="text" rows="3" maxLength="500" placeholder="예) 매일 30분씩 강의를 듣고 4주 안에 첫 결과를 만들어 볼게요!" defaultValue={g.draft} onInput={(e) => paint(e.currentTarget)} /></label>
        <div className="vd-plex"><small>예시를 누르면 바로 채워져요</small>{g.ex.map((x) => <button key={x} type="button" data-v="pl-ex" data-t={x} onClick={() => ex(x)}>{x}</button>)}</div>
        <i className="vd-pl-bar"><u style={{ width: X.plPct(len, g) + "%" }} /></i>
        <div className="vd-plform-f"><small className={"vd-pl-cnt" + (ok ? " ok" : "")}><b data-pl-n="">{len}</b>자<span data-pl-hint="">{X.plHint(len, g)}</span></small><button type="submit" className="vd-btn vd-btn-p vd-btn-sm" data-pl-go="" disabled={!ok}>{g.give ? "다짐 남기고 쿠폰 받기" : "다짐 남기기"}</button></div></form>
      {pls.length ? <ul className="vd-pls">{pls.map((x) => <li key={x.id}><Av nick={x.nick} cls="lg" /><div><b>{x.nick}</b><small>한마디 · {DB().date.toStr(new Date(x.at))}</small><p>{x.text}</p><div className="vd-pl-a"><button type="button" data-v="pl-up" data-id={x.id} className={m && (x.upBy || []).indexOf(m.id) >= 0 ? "on" : ""} onClick={() => act.plUp(x.id)}><Icon n="heart" c="xs" />공감 {x.up || 0}</button>{m && x.mid === m.id ? <button type="button" data-v="pl-del" data-id={x.id} onClick={() => act.plDel(x.id)}>삭제</button> : null}</div></div></li>)}</ul> : <p className="vd-muted">아직 다짐이 없어요. 첫 다짐을 남겨 주세요.</p>}
    </Sec>
  );
}
function Refund({ p, v }) {
  const X = VOD(), t = v.t, bk = v.bk, T = X.refundTbl(), ps = X.plansOf(p);
  return (
    <Sec k="refund" ttl={bk ? "교환 · 반품 규정" : "환불 규정"}>
      {t === "vod" && X.priceOf(p) > 0 ? <p className="vd-rf-base"><Icon n="calendar" c="xs" /><span>이 강의의 정상 수강기간: <b>{ps.length ? ps.map((x) => x.label).join(" · ") + " 중 고른 수강권 기간" : X.normalDays(p) + "일"}</b>{X.isLifetime(p) ? " (평생 소장 · 31일차부터 무료 수강기간)" : ""}</span></p> : null}
      <RawOne html={X.refundTable(p)} />
      {X.coachOf(p) ? <><h4 className="vd-rf-h4">1:1 코칭권</h4><table className="vd-rf"><tbody>{T.coach.map((r, i) => <tr key={i}><Raw as="td" html={r[0]} /><Raw as="td" html={r[1]} /></tr>)}</tbody></table></> : null}
      {X.teaOf(p) ? <><h4 className="vd-rf-h4">강사님과 TEA TIME</h4><table className="vd-rf"><tbody>{T.tea.map((r, i) => <tr key={i}><Raw as="td" html={r[0]} /><Raw as="td" html={r[1]} /></tr>)}</tbody></table></> : null}
      <ul className="vd-notes"><li>환불 금액은 정가가 아닌 실제 결제 금액 기준이에요. 결제에 쓴 쿠폰은 다시 돌려드리지 않고, 쓴 포인트는 다시 넣어 드려요.</li><li>환불 신청은 마이페이지 › 주문 · 결제 내역 또는 고객센터 1:1 문의로 해 주세요. 영업일 기준 3일 안에 처리해요.</li><li>강의 내용 · 일정은 강사 사정에 따라 바뀔 수 있고, 바뀌면 미리 알려 드려요.</li></ul>
      <h3 className="vd-use-h">{bk ? "배송 · 이용 안내" : "수강 기간 · 콘텐츠 이용 안내"}</h3><ul className="vd-notes vd-use">{X.useNotes(p).map((x, i) => <Raw key={i} as="li" html={x} />)}</ul>
    </Sec>
  );
}

/* ---------- 휴대폰 결제 막대 (예전 fbarHtml · wireFbar) ---------- */
function Fbar({ p, st, setSt, act }) {
  const X = VOD(), { m, c, pr, pct, pvs, own, end, best, toCheckout, fy } = X.fbarView(p), many = X.plansOf(p).length;
  const tog = () => setSt((s) => ({ on: true, open: !s.open }));
  return (
    <div className={"vd-fbar" + (st.on ? " on" : "") + (st.open ? " open" : "")} id="vd-fbar">
      {toCheckout ? <div className="vd-fbar-panel" id="vd-fbar-panel"><div className="vd-wrap vd-fbp"><div className="vd-fbp-h"><b>수강 옵션 선택</b><button type="button" data-v="fbar" aria-label="옵션 창 닫기" onClick={tog}><Icon n="x" c="sm" /></button></div>
        {many ? <PlanBox p={p} sfx="b" onPlan={act.plan} /> : <label className="vd-fbp-opt"><input type="radio" defaultChecked /><span><b>{X.TYPE[X.typeOf(p)][0]} · {X.accessTxt(p)}</b><small>{X.metaOf(p).join(" · ")}</small></span><strong>{won(pr)}</strong></label>}
        {best ? <p className="vd-fbp-cp"><span className="vd-tag vd-tag-red">쿠폰</span>‘{best.c.name}{many ? "’ 쿠폰은 수강권 금액에 적용돼요" : <>’ 쓰면 <b>{won(pr - best.off)}</b></>} <small>결제 화면에서 쿠폰 · 포인트를 고를 수 있어요</small></p> : null}
        {many ? null : <div className="vd-fbp-tot"><span>총 상품 금액</span>{pct ? <em>{pct}%</em> : null}<strong>{won(pr)}</strong></div>}
        <div className="vd-fbp-btns"><button type="button" className="vd-btn vd-btn-o vd-btn-xl" data-v="fbar" onClick={tog}>닫기</button><a className="vd-btn vd-btn-p vd-btn-xl" href={c.href} data-co-link={c.co ? p.id : undefined}>{pr === 0 ? (X.isEvent(p) ? "무료 LIVE 신청하기" : "무료로 수강 시작") : "결제하기"}</a></div></div></div> : null}
      <div className="vd-wrap vd-fbar-in"><span className="vd-fbar-th"><RawOne html={X.thumbArt(p)} /></span><div className="vd-fbar-t"><b>{p.title}</b><small>{X.TYPE[X.typeOf(p)][0] + " · " + X.accessTxt(p)}</small></div>
        <div className="vd-fbar-p">{p.status === "soon" ? <strong>오픈 예정</strong> : pr === 0 ? <strong className="free">무료</strong> : fy ? <><small className="vd-fbar-from">{(fy.rb ? "재수강 " + fy.rb + "% · " : "") + fy.label + " · 총 " + won(fy.sale)}</small><strong>월 {won(fy.month)}</strong></> : <>{pct ? <em>{pct}%</em> : null}<strong>{won(pr)}</strong></>}{end ? <small><Icon n="clock" c="xs" /><Cd end={end} /> 남음</small> : null}</div>
        <button type="button" className={"vd-likebtn" + (X.liked(m && m.id, p.id) ? " on" : "")} data-v="like" data-id={p.id} aria-label="찜하기" onClick={() => act.like(p.id)}><Icon n="heart" c="sm" /><small>{X.likeNum(X.likeCount(p))}</small></button>
        {pvs.length && !own ? <button type="button" className="vd-btn vd-btn-o vd-fbar-pv" data-v="pv-open" data-p={p.id} data-l={pvs[0].id} onClick={() => act.pv(pvs[0].id)}><Icon n="play" c="sm" /><span>미리보기</span></button> : null}
        {toCheckout ? <button type="button" className="vd-btn vd-btn-p vd-fbar-cta" data-v="fbar" onClick={tog}>{c.txt}<Icon n="chevDown" c="xs" /></button> : <Cta p={p} c={c} cls="vd-fbar-cta" onLike={act.like} />}</div>
    </div>
  );
}

/* ---------- 팝업: 미리보기 · 쿠폰 (예전 previewModal · cpModalBody) ---------- */
function PvModal({ p, lid, onClose }) {
  const X = VOD(), pvs = X.previewsOf(p), lz = X.lessons(p), ebook = X.typeOf(p) === "ebook";
  const [cur, setCur] = useState(() => pvs.find((l) => l.id === lid) || pvs[0] || lz.find((l) => l.id === lid));
  // 창이 열려 있는 동안 맨 위 영상은 멈춰요 (예전 화면과 같은 heroPause — 닫으면 우리가 멈춘 것만 다시)
  useEffect(() => { X.heroPause(true); return () => X.heroPause(false); }, [X]);
  if (!cur) return null;
  const vid = (l) => (ebook ? '<div class="vd-pl-ph">' + window.icon("book") + "<b>" + DB().esc(l.title) + "</b><small>전자책 미리보기 페이지는 정식 오픈 때 PDF로 연결해요</small></div>" : X.videoHtml(l, true, "미리보기 영상을 준비하고 있어요"));
  const ch = X.chapOf(p, cur), c = X.ctaOf(p, X.me());
  return (
    <Modal title={"미리보기 · " + p.title} cls="vd-modal-pv" onClose={onClose}>
      <div className="vd-pvm"><div className="vd-pvm-v"><Raw as="div" className="vd-modal-video" id="vd-pvm-v" html={vid(cur)} /><div className="vd-pvm-now"><small>Part {ch.ci + 1} · {(ch.ch || {}).title || ""}</small><b>{cur.title}</b>{cur.desc ? <p>{cur.desc}</p> : null}</div></div>
        <aside className="vd-pvm-l"><b>미리보기 <em>{pvs.length}</em> / 전체 {lz.length}개</b>{pvs.map((l) => <button key={l.id} type="button" className={l.id === cur.id ? "on" : ""} data-v="pv-pick" data-p={p.id} data-l={l.id} onClick={() => setCur(l)}><i><Icon n="play" c="xs" /></i><span>{l.title}</span><Raw as="small" html={ebook ? (Number(l.min) || 0) + "쪽" : X.lLen(l)} /></button>)}
          <p className="vd-pvm-lock"><Icon n="lock" c="xs" />나머지 {Math.max(0, lz.length - pvs.length)}개 강의는 수강신청 후 볼 수 있어요</p></aside></div>
      <div className="vd-pvm-f"><div><small>{X.TYPE[X.typeOf(p)][0] + " · " + X.accessTxt(p) + " · 강의 " + lz.length + "개"}</small><Raw as="span" className="vd-price" html={X.priceHtml(p)} /></div>{p.status === "on" ? <a className="vd-btn vd-btn-p" href={c.href || "#/vod/p/" + p.id} data-v="close">{c.txt || "수강신청 하기"}</a> : <button type="button" className="vd-btn vd-btn-o" data-v="close">닫기</button>}</div>
    </Modal>
  );
}
function CpModal({ p, onClose, onGet }) {
  const X = VOD(), { m, cs, amt, left } = X.cpView(p);
  const big = (c) => (c.kind === "pct" ? <>{c.value}<small>%</small></> : Number(c.value) >= 10000 && Number(c.value) % 10000 === 0 ? <>{Number(c.value) / 10000}<small>만 원</small></> : <>{Number(c.value).toLocaleString()}<small>원</small></>);
  return (
    <Modal title="사용 가능한 쿠폰" cls="vd-modal-cp" onClose={onClose}>
      <div className="vd-modal-b vd-cpm"><p className="vd-cpm-lead">{p.title}<br /><small>{X.plansOf(p).length ? "12개월 수강권 " : ""}{won(amt)} 기준 할인 금액이에요</small></p>
        <ul>{cs.map((c) => { const got = m && X.hasCp(m.id, c), off = X.couponOff(c, p, amt); return (
          <li key={c.id} className={"vd-cpm-it" + (got ? " got" : "")}><div className="vd-cpm-l"><b>{big(c)}</b></div><div className="vd-cpm-r"><strong>{c.name}</strong><span>{X.couponCond(c)}</span><small>{(c.auto === "signup" ? "가입하면 자동으로 드려요 · " : "") + (c.days ? "받은 날부터 " + c.days + "일 동안 사용" : c.endAt ? DB().date.fmtFull(c.endAt) + "까지" : "기한 없음")}</small><em>이 클래스에 쓰면 -{won(off)}</em></div>
            {m ? (got ? <span className="vd-cpm-b done"><Icon n="check" c="xs" />받음</span> : <button type="button" className="vd-cpm-b" data-v="cp-get" data-c={c.id} data-p={p.id} onClick={() => onGet(c.id)}><Icon n="download" c="xs" />받기</button>) : null}</li>); })}</ul>
        {m ? (left.length > 1 ? <button type="button" className="vd-btn vd-btn-p vd-btn-xl vd-cpm-all" data-v="cp-get" data-c="all" data-p={p.id} onClick={() => onGet("all")}>쿠폰 {left.length}장 모두 받기</button> : left.length ? null : <p className="vd-cpm-done"><Icon n="check" c="sm" />모든 쿠폰을 받았어요. 결제 화면에서 가장 많이 깎이는 쿠폰을 골라 쓸 수 있어요.</p>)
          : <><a className="vd-btn vd-btn-p vd-btn-xl vd-cpm-all" href={"#/vod/login?next=" + encodeURIComponent("#/vod/p/" + p.id)}>로그인하고 쿠폰 받기</a><p className="vd-cpm-note">아직 회원이 아니라면 가입만 해도 <b>5,000원 할인 쿠폰</b>을 바로 드려요 (30일 동안 사용).</p></>}
        <p className="vd-cpm-note">쿠폰은 결제 1건에 1장만 쓸 수 있어요. 받은 쿠폰은 마이페이지 › 쿠폰에서 볼 수 있어요.</p></div>
    </Modal>
  );
}

/* ---------- 화면 ---------- */
function Product({ p, n }) {
  const X = VOD(), v = X.productView(p), onLike = usePageLike();
  const [pop, setPop] = useState(null); // { k: "pv", l } · { k: "cp" }
  const [fb, setFb] = useState({ on: false, open: false });
  const [, bump] = useState(0);
  const [tab, setTab] = useState(0);
  const redraw = useCallback(() => window.ReactApp.redraw(), []);
  // 수강권 고르기: 가격 카드 · 아래 옵션 창이 같은 선택 (예전 PSEL · planSync — 결제 버튼 주소도 같이)
  const plan = (o) => {
    const cur = X.planView(p), d = o.d != null ? o.d : cur.sel.d, coach = o.coach != null ? o.coach : !!(cur.s && cur.s.coach);
    X.pselSet(p.id, { d, coach });
    document.querySelectorAll('[data-plans="' + p.id + '"]').forEach((b) => { b.querySelectorAll("[data-plan]").forEach((x) => { x.checked = Number(x.value) === d; }); const k = b.querySelector("[data-plan-coach]"); if (k) k.checked = coach; });
    bump((x) => x + 1);
  };
  const act = {
    like: onLike, plan, redraw,
    pv: (l) => setPop({ k: "pv", l }),
    cpOpen: () => setPop({ k: "cp" }),
    share: () => { const u = location.href; if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast("주소를 복사했어요."), () => toast("주소: " + u)); else toast("주소: " + u); },
    plUp: (id) => { if (!X.me()) { toast("로그인하면 공감할 수 있어요.", "warn"); return; } if (X.plUp(id)) redraw(); },
    plDel: (id) => { if (X.plDel(id)) { redraw(); toast("다짐을 지웠어요."); } }
  };
  const cpGet = (cid) => X.cpGet(p, cid).then((k) => { bump((x) => x + 1); toast(k ? "쿠폰 " + k + "장을 받았어요." : "이미 받은 쿠폰이에요."); });
  // 위 가격 카드가 화면 위로 지나가면 아래 결제 막대가 올라와요
  useEffect(() => {
    const info = document.getElementById("vd-pdt-info");
    if (!info || !("IntersectionObserver" in window)) { setFb((s) => ({ on: true, open: s.open })); return undefined; }
    const io = new IntersectionObserver((ens) => { const en = ens[0], on = !en.isIntersecting && en.boundingClientRect.top < 0; setFb((s) => ({ on, open: on ? s.open : false })); }, { threshold: 0 });
    io.observe(info);
    return () => io.disconnect();
  }, [p.id]);
  // 탭: 지나간 섹션의 탭이 켜져요
  useEffect(() => {
    const onSc = () => { let on = 0; v.tabs.forEach((x, i) => { const s = document.getElementById("vd-s-" + x[0]); if (s && s.getBoundingClientRect().top < 200) on = i; }); setTab(on); };
    window.addEventListener("scroll", onSc, { passive: true });
    return () => window.removeEventListener("scroll", onSc);
  }, [v.tabs]);
  // LIVE 이어지는 혜택 안내(예전 HTML) 안의 남은 시간
  useEffect(() => { const i = setInterval(() => document.querySelectorAll("#root .vd-fln [data-cd]").forEach((x) => { x.textContent = X.cdTxt(x.dataset.cd); }), 1000); return () => clearInterval(i); }, [X]);
  useEffect(() => { const root = document.getElementById("root"); if (root && X.hydrate) X.hydrate(root); }, [n, X]);
  const hv = X.heroOf(p), hvSrc = hv ? hv.src : "";
  // 맨 위 대표 영상: 그린 뒤 붙이기 (예전 화면과 같은 heroWire — 재생이 시작되면 대표 그림을 걷어요)
  useEffect(() => { const root = document.getElementById("root"); if (root && hvSrc) X.heroWire(root); }, [p.id, n, X, hvSrc]);
  const t = v.t, bk = v.bk, info = v.info, faq = v.faq;
  return (
    <>
      <div className="vd-pd5 vd-pd8"><div className="vd-wrap"><nav className="vd-crumbs"><a href="#/vod">홈</a><Icon n="chevRight" c="xs" /><a href={"#/vod/c/" + p.cat}>{v.cat.label}</a><Icon n="chevRight" c="xs" /><a href={"#/vod/c/all?tab=" + (v.ev ? "premium" : bk ? "ebook" : t)}>{X.TYPE[t][0]}</a></nav>
        {hv ? null : <Hero p={p} />}<div className={"vd-pd8-g" + (hv ? " has-vid" : "")}>{hv ? <HeroVid h={hv} /> : null}<aside className="vd-pd8-side"><BuyCard p={p} act={act} /></aside>
          <div className="vd-pd8-body"><Best p={p} /><nav className="vd-pd-tabs"><div className="vd-pd-tabs-in">{v.tabs.map((x, i) => <button key={x[0]} type="button" data-v="jump" data-to={"vd-s-" + x[0]} className={i === tab ? "on" : ""} onClick={() => jump("vd-s-" + x[0])}>{x[1]}{x[2] ? <>{" "}<em>{x[2]}</em></> : null}</button>)}</div></nav>
            <Intro p={p} v={v} />
            {v.noCur ? null : <Curri p={p} v={v} act={act} />}
            <Reviews p={p} v={v} />
            <Pledges p={p} v={v} act={act} />
            <Sec k="creator" ttl={bk ? "저자 소개" : "강사 소개"}><div className="vd-crd vd-crd2" data-rv=""><div className={"vd-crd-ph" + (X.phOf(p) ? "" : " no")}>{X.phOf(p) ? <img src={X.phOf(p)} alt={p.creator + " 강사"} /> : <i>{(p.creator || "?").slice(0, 1)}</i>}<span className="vd-crd-cap"><small>CREATOR</small><b>{p.creator}</b></span></div>
              <div className="vd-crd-body"><small>{p.tagline || v.insB.field || "크리에이터"}</small><div className="vd-crd-nm"><b>{p.creator} <em>강사</em></b>{X.crdStats(p) ? <RawOne html={X.crdStats(p)} /> : null}</div><p>{p.creatorBio || p.creator + "님은 두잉고에서 기수를 운영하며 수강생과 함께 결과를 만들고 있어요. 이 클래스는 기수 강의의 핵심만 골라 언제든 볼 수 있게 만든 " + X.TYPE[t][0] + "예요."}</p>
                {v.career.length ? <ul className="vd-crd-car">{v.career.map((x, i) => <li key={i}>{x}</li>)}</ul> : null}<a className="vd-tl-btn" href={p.iid ? X.tHref(p.iid) : "#/vod/search?q=" + encodeURIComponent(p.creator || "")}>{p.creator} 강사 페이지 · 다른 클래스<Icon n="chevRight" c="xs" /></a></div></div><Cmt p={p} /></Sec>
            <Sec k="info" ttl={bk ? "도서 정보" : "강의 정보"}><table className="vd-info-t"><tbody>{info.map((r, i) => <tr key={i}><th>{r[0]}</th><td>{r[1]}</td></tr>)}</tbody></table></Sec>
            <Plans p={p} />
            <Sec k="faq" ttl="자주 묻는 질문">{faq.map((f, i) => <details key={i} className="vd-faq"><summary><b>Q</b><span>{f[0]}</span><Icon n="chevDown" c="sm" /></summary><p>{f[1]}</p></details>)}</Sec>
            <Refund p={p} v={v} />
          </div></div>
        {v.related.length ? <section className="vd-pd-sec vd-pd-rel"><Eg as="h2">함께 많이 보는 <span data-accent="">클래스</span></Eg><div className="vd-grid vd-grid-3" data-rv-kids="">{v.related.map((x) => <Card key={x.id} p={x} onLike={onLike} />)}</div></section> : null}
      </div></div>
      <Fbar p={p} st={fb} setSt={setFb} act={act} />
      {pop && pop.k === "pv" ? <PvModal p={p} lid={pop.l} onClose={() => setPop(null)} /> : null}
      {pop && pop.k === "cp" ? <CpModal p={p} onClose={() => setPop(null)} onGet={cpGet} /> : null}
    </>
  );
}

export default function ProductPage({ n, moved }) {
  const X = VOD(), id = decodeURIComponent(storeRoute().path[1] || ""), p = X.product(id), ok = !!(p && p.status !== "hidden" && X.insShown(p));
  useMotion(n, moved);
  useEffect(() => {
    document.title = (ok ? p.title + " | " : "") + TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved, ok, p]);
  if (!ok) return <Shell nav="" tab="" n={n}><div className="vd-wrap"><EmptyBox ic="alert" t="판매 중인 클래스가 아니에요"><a className="vd-btn vd-btn-o" href="#/vod">홈으로</a></EmptyBox></div></Shell>;
  return <Shell nav="" tab="" cls="vd-has-mbuy" n={n}><Product key={p.id} p={p} n={n} /></Shell>;
}
