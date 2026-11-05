"use client";
/* 마이페이지 메뉴 (보기 위주) — 예전 vod.js pageMy 의 classes · free · vod · badges · points · posts · alarm · likes 를 React 로 (Next.js 전환 4-4)
 * 모양 · 글자 · 주소는 예전과 같아요. 계산은 예전 코드(window.VOD)를 그대로 써요. */
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import Card, { Av } from "./Card.jsx";
import { VOD, DB, storeRoute } from "../lib/legacy.js";

const fmtFull = (t) => DB().date.fmtFull(DB().date.toStr(new Date(t)));
const fmt = (t) => DB().date.toStr(new Date(t));

export function Empty({ text, label, href }) {
  return <div className="vd-my-empty"><p>{text}</p>{label ? <a className="vd-btn vd-btn-line vd-btn-sm" href={href}>{label}</a> : null}</div>;
}
export function TopicChip({ t, onTopic }) {
  const on = VOD().myTopics().indexOf(t) >= 0;
  return <button type="button" className={"vd-tchip" + (on ? " on" : "")} data-v="topic" data-t={t} aria-pressed={String(on)} onClick={() => onTopic(t)}>{t}<Icon n="heart" c="xs" /></button>;
}

/** 내 강의실 카드 목록 (예전 myCls) */
export function MyCls({ m, list, act }) {
  const X = VOD();
  return (
    <div className="vd-sroom">{list.map(({ o, p }) => {
      const t = X.typeOf(p), ev = X.isEvent(p), lz = X.lessons(p), pr = X.prog(m.id, p.id), dn = lz.filter((l) => pr.done[l.id]).length, pc = X.pctDone(m.id, p.id), end = X.accessEnd(m.id, p.id), live = ev ? !X.eventPast(p) || X.owns(m.id, p.id) : end > Date.now(), lim = t === "vod" && end && end !== Infinity;
      const dl = lim && live ? Math.max(0, X.daysLeft(m.id, p.id)) : null, rb = !live && t === "vod" && X.canRebuy(m.id, p.id) ? X.rebuyOf(m.id, p) : 0, cl = live && X.coachOf(p) ? X.coachLeft(m.id, p.iid) : 0;
      const last = lz.find((l) => l.id === pr.last), go = ev ? (t === "live" ? "입장 안내 보기" : "참석 안내 보기") : pc >= 100 ? "다시 보기" : pc ? "이어서 학습하기" : "학습 시작하기";
      const chip = X.priceOf(p) === 0 ? (t === "live" ? "무료 LIVE" : "무료 특강") : X.CHIP[t] || "클래스";
      const state = ev ? (X.eventPast(p) ? <span className="vd-sroom-st end">종료</span> : <span className="vd-sroom-st">{X.fmtLive(p.eventAt)}</span>) : !live ? <span className="vd-sroom-st end">수강 기간 끝</span> : pc >= 100 ? <span className="vd-sroom-st ok">수강 완료</span> : dl != null ? <span className={"vd-sroom-st" + (dl <= 30 ? " warn" : "")}>D-{dl}</span> : <span className="vd-sroom-st">평생 소장</span>;
      const cta = live ? (X.dgOpen(p) && !ev ? <button type="button" className="vd-btn vd-btn-p vd-sroom-go" data-v="dg" data-p={p.id} onClick={(e) => { e.preventDefault(); act.dg(p.id); }}><Icon n="play" c="xs" />{go}</button> : <a className="vd-btn vd-btn-p vd-sroom-go" href={"#/vod/learn/" + p.id}><Icon n={ev ? "calendar" : "play"} c="xs" />{go}</a>)
        : rb ? <a className="vd-btn vd-btn-p vd-sroom-go" href={"#/vod/p/" + p.id}><Icon n="refresh" c="xs" />재수강 {rb}% 할인으로 다시 듣기</a> : null;
      const sub = (lim ? (live ? fmtFull(end) + "까지 수강" : fmtFull(end) + "에 수강 기간이 끝났어요") : ev ? "주문 " + o.no : "평생 소장") + (cl ? " · 1:1 코칭 " + cl + "회 남음" : "") + (live && X.dgOpen(p) && !ev ? " · 두잉고 강의실에서 열려요" : "");
      // 결제 후 N일 이내 · 재생 전이면 환불 안내 + 환불하기 (지나거나 재생하면 없어져요 · 예전 rfCard)
      const rq = X.rfCard(o);
      return (
        <article key={p.id} className={"vd-sroom-it" + (live ? "" : " exp")}><a className="vd-sroom-th" href={"#/vod/" + (live ? "learn/" : "p/") + p.id}><RawOne html={X.thumbArt(p)} />{live && !ev ? <i className="vd-sroom-play" aria-hidden="true"><Icon n="play" /></i> : null}</a>
          <div className="vd-sroom-b"><div className="vd-sroom-top"><span className={"vd-kchip vd-kchip-" + (X.priceOf(p) === 0 ? "free" : t)}>{chip}</span>{state}</div>
            <a className="vd-sroom-t" href={"#/vod/p/" + p.id}>{p.title}</a><span className="vd-sroom-cr">{(p.creator || "") + " · " + X.catOf(p.cat).label}</span>
            {ev ? <span className="vd-sroom-info"><Icon n="calendar" c="xs" />{X.fmtEvent(p.eventAt, true) + " · " + (t === "live" ? X.viaOf(p) : X.placeShort(p.place) || "현장")}</span>
              : <><div className="vd-sroom-pg"><div className="vd-sroom-bar"><i style={{ width: pc + "%" }} /></div><span><b>{pc}%</b><small>{dn} / {lz.length}강</small></span></div>
                <span className="vd-sroom-info">{last ? <><Icon n="clock" c="xs" />최근 학습 · {last.title}</> : <><Icon n="sparkles" c="xs" />아직 시작 전이에요. 1강부터 가볍게 시작해 보세요</>}</span></>}
            <span className="vd-sroom-sub">{sub}</span>{rq ? <span className="vd-sroom-rfn"><Icon n="shieldCheck" c="xs" />{rq.note}</span> : null}</div>
          <div className="vd-sroom-act">{cta}<a className="vd-btn vd-btn-o vd-sroom-sec" href={"#/vod/p/" + p.id}>강의 상세</a>{rq ? <button type="button" className="vd-btn vd-btn-line vd-sroom-rf" data-v="rf-now" data-no={o.no} onClick={() => act && act.rfNow && act.rfNow(o)}><Icon n="refresh" c="xs" />환불하기</button> : null}</div></article>
      );
    })}</div>
  );
}

export function Classes({ m, d, act }) {
  const X = VOD(), st = storeRoute().qs.get("st") === "done" ? "done" : "ing", list = st === "done" ? d.done : d.ing;
  const avg = d.ing.length ? Math.round(d.ing.reduce((a, x) => a + X.pctDone(m.id, x.p.id), 0) / d.ing.length) : 0;
  return (
    <>
      <div className="vd-sroom-sum"><div><small>수강 중</small><b>{d.ing.length}<em>개</em></b></div><div><small>수강 완료</small><b>{d.done.length}<em>개</em></b></div><div><small>평균 진도율</small><b>{avg}<em>%</em></b></div><div><small>연속 학습</small><b>{X.streakOf(m.id)}<em>일</em></b></div></div>
      <div className="vd-subtabs"><a href="#/vod/my/classes" className={st === "ing" ? "on" : ""}>수강 중 <small>{d.ing.length}</small></a><a href="#/vod/my/classes?st=done" className={st === "done" ? "on" : ""}>수강 완료 <small>{d.done.length}</small></a></div>
      {list.length ? <MyCls m={m} list={list} act={act} /> : <Empty text={st === "done" ? "아직 끝까지 들은 강의가 없어요." : "아직 수강 중인 강의가 없어요. 관심 분야의 강의를 둘러보세요."} label="강의 둘러보기" href="#/vod/c/all" />}
    </>
  );
}
export const Free = ({ m, d, act }) => (d.free.length ? <MyCls m={m} list={d.free} act={act} /> : <Empty text="신청한 무료강의가 없어요. 부담 없이 먼저 들어 보세요." label="무료강의 보기" href="#/vod/c/all?tab=free" />);
export const Vods = ({ m, d, act }) => (d.paidV.length ? <MyCls m={m} list={d.paidV} act={act} /> : <Empty text="구매한 VOD 강의가 없어요." label="VOD 강의 보기" href="#/vod/c/all?tab=vod" />);

export const Badges = ({ d }) => <div className="vd-bdgs">{d.badges.map((x) => <div key={x.b[0]} className={"vd-bdg" + (x.on ? " on" : "")}><span><Icon n={x.b[3]} c="sm" /></span><b>{x.b[1]}</b><small>{x.on ? x.b[2] : x.b[4]}</small></div>)}</div>;

export function Points({ m }) {
  const v = VOD().V(), log = (m.pointLog || []).slice().sort((a, b) => b.at - a.at);
  return (
    <>
      <div className="vd-pt-top"><div><small>사용 가능 포인트</small><b>{(Number(m.points) || 0).toLocaleString()}<i>P</i></b></div><ul><li>결제할 때 1P = 1원으로 써요.</li><li>후기를 쓰면 {(Number(v.settings.reviewPoint) || 0).toLocaleString()}P를 드려요.</li><li>주문을 취소하면 쓴 포인트를 돌려드려요.</li></ul></div>
      {log.length ? <ul className="vd-pt-log">{log.map((x, i) => <li key={i}><div><b>{x.why}</b><small>{fmt(x.at)}</small></div><strong className={x.amt < 0 ? "minus" : "plus"}>{(x.amt > 0 ? "+" : "") + x.amt.toLocaleString()}P</strong></li>)}</ul> : <Empty text="포인트 내역이 없어요." />}
    </>
  );
}

export function Posts({ d, act }) {
  const X = VOD();
  return d.pl.length ? <ul className="vd-pls">{d.pl.map((x) => <li key={x.id}><Av nick={x.nick} cls="lg" /><div><b><a href={"#/vod/p/" + x.pid}>{(X.product(x.pid) || {}).title || ""}</a></b><small>{fmt(x.at) + " · 공감 " + (x.up || 0)}</small><p>{x.text}</p><div className="vd-pl-a"><button type="button" data-v="pl-del" data-id={x.id} onClick={() => act.plDel(x.id)}>삭제</button></div></div></li>)}</ul>
    : <Empty text="남긴 다짐이 없어요. 강의 상세에서 다짐 한마디를 남겨 보세요." label="클래스 둘러보기" href="#/vod/c/all" />;
}

/** 카드 하나 (예전 rcCard) — 오픈 알림 · 전자책 · LIVE · 코칭권 · TEA TIME 이 같이 써요 */
export function RcCard({ cls, th, over, href, chips, title, sub, extra, act }) {
  return (
    <article className={"vd-rc" + (cls ? " " + cls : "")}>{th ? <a className="vd-rc-th" href={href || "#"}>{th}{over}</a> : null}
      <div className="vd-rc-b">{chips ? <div className="vd-rc-top">{chips}</div> : null}<b className="vd-rc-t">{title}</b>{sub ? <span className="vd-rc-s">{sub}</span> : null}{extra}</div>
      {act ? <div className="vd-rc-act">{act}</div> : null}</article>
  );
}
export const RcSt = ({ t, k }) => <span className={"vd-sroom-st" + (k ? " " + k : "")}>{t}</span>;

export function Alarm({ d, act }) {
  const X = VOD();
  return d.alarm.length ? <div className="vd-rcs">{d.alarm.map((p) => <RcCard key={p.id} th={<RawOne html={X.thumbArt(p)} />} href={"#/vod/p/" + p.id} chips={<><span className="vd-kchip vd-kchip-soon">오픈 예정</span><RcSt t={p.openAt ? X.fmtOpen(p.openAt) : "날짜 미정"} k="warn" /></>} title={p.title} sub={(p.creator || "") + " · " + X.catOf(p.cat).label}
    extra={<span className="vd-rc-s2"><Icon n="bell" c="xs" /> 오픈하면 할인가로 가장 먼저 알려 드려요</span>}
    act={<><a className="vd-btn vd-btn-o" href={"#/vod/p/" + p.id}>미리 보기</a><button type="button" className="vd-btn vd-btn-o" data-v="like" data-id={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); act.like(p.id); }}><Icon n="bell" c="xs" />알림 끄기</button></>} />)}</div>
    : <Empty text="오픈 알림을 신청한 강의가 없어요. 곧 열리는 강의에서 알림을 받아 보세요." label="오픈 예정 보기" href="#/vod/c/soon" />;
}

function TopicsBody({ tps, act }) {
  const X = VOD();
  if (!tps.length) return <div className="vd-wempty"><Icon n="heart" /><b>찜한 부업이 아직 없어요</b><p>홈 › ‘DOOGO CLASS에서 다루는 부업’에서 ♡를 누르면 여기에 모여요.<br />찜이 많은 부업부터 클래스를 열어요.</p><a className="vd-btn vd-btn-o" href="#/vod">부업 고르러 가기</a></div>;
  const words = tps.join(" ").split(/[\s·,]+/).filter((w) => w.length >= 2), hit = X.listed().filter((p) => { const t = (p.title + " " + (p.sub || "") + " " + (p.hook || "") + " " + (p.tags || []).join(" ")).toLowerCase(); return words.some((w) => t.indexOf(w.toLowerCase()) >= 0); });
  return (
    <div className="vd-mytp"><p className="vd-mytp-lead"><Icon n="heart" c="xs" /> 찜한 부업 <b>{tps.length}개</b> · 칩을 다시 누르면 찜이 풀려요. 찜이 많은 부업부터 클래스를 열고, 열리면 알려 드려요.</p>
      <div className="vd-mytp-chips">{tps.map((k) => <TopicChip key={k} t={k} onTopic={act.topic} />)}</div>
      {hit.length ? <><h3 className="vd-my-sub">관심 부업과 이어지는 클래스</h3><div className="vd-grid vd-grid-3">{hit.slice(0, 6).map((p) => <Card key={p.id} p={p} onLike={act.like} />)}</div></> : <p className="vd-muted vd-my-note">아직 찜한 부업과 딱 맞는 클래스는 없어요. 찜이 모이면 그 부업부터 클래스를 열어요.</p>}</div>
  );
}
export function Likes({ d, act }) {
  const X = VOD(), T = X.typeOf, P = X.priceOf;
  const LT = [["all", "전체", () => true], ["paid", "유료 강의", (p) => T(p) === "vod" && P(p) > 0], ["free", "무료 강의", (p) => P(p) === 0, "free"], ["ebook", "전자책 · 종이책", (p) => T(p) === "ebook" || X.isBook(p), "ebook"], ["event", "LIVE · 오프라인", (p) => X.isEvent(p) && P(p) > 0, "live"]].filter((x) => !x[3] || X.bizOn(x[3]) || d.likes.some(x[2]));
  const tps = X.myTopics(), qt = storeRoute().qs.get("t"), lt = LT.find((x) => x[0] === qt) || LT[0], ls = d.likes.filter(lt[2]);
  return (
    <>
      <div className="vd-wtabs">{LT.map((x) => <a key={x[0]} href={"#/vod/my/likes" + (x[0] === "all" ? "" : "?t=" + x[0])} className={x === lt && qt !== "topics" ? "on" : ""}>{x[1]} <small>{d.likes.filter(x[2]).length}</small></a>)}<a href="#/vod/my/likes?t=topics" className={qt === "topics" ? "on" : ""}>관심 부업 <small>{tps.length}</small></a></div>
      {qt === "topics" ? <TopicsBody tps={tps} act={act} /> : ls.length ? <div className="vd-grid vd-grid-3">{ls.map((p) => <Card key={p.id} p={p} onLike={act.like} />)}</div>
        : <div className="vd-wempty"><Icon n="heart" /><b>{lt[0] === "all" ? "찜한 강의가 아직 없어요" : lt[1] + " 중 찜한 강의가 없어요"}</b><p>마음에 드는 강의의 ♡를 누르면 여기에 모여요.</p><a className="vd-btn vd-btn-o" href="#/vod/c/all">강의 둘러보기</a></div>}
    </>
  );
}
export { Raw };
