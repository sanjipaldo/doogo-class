"use client";
/* 마이페이지 메뉴 (입력 · 버튼이 있는 것) — 예전 vod.js pageMy 의 coupons · ebooks · live · devices · reviews · help · account 를 React 로 (Next.js 전환 4-4)
 * 모양 · 글자 · 칸 이름은 예전과 같아요. 저장 · 서버 요청은 예전 처리 함수(window.VOD.doCoupon · doInquiry · doAcct · kakaoLink …)를 그대로 불러요 —
 * 그 함수들이 끝에 부르는 ‘다시 그리기’는 React 가 받아서 다시 그려요 (vod.js render · closeModal). */
import { useState, useRef } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import Modal from "../lib/Modal.jsx";
import { KakaoBtn } from "./Shell.jsx";
import { Empty, RcCard, RcSt } from "./MyTabs.jsx";
import { VOD, DB, today, storeRoute, toast } from "../lib/legacy.js";

const fmtFull = (t) => DB().date.fmtFull(DB().date.toStr(new Date(t)));
const KAKAO = '<path fill="currentColor" d="M12 3.6c-5.1 0-9.2 3.2-9.2 7.2 0 2.6 1.7 4.8 4.3 6.1l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.4 0 .9.1 1.3.1 5.1 0 9.2-3.2 9.2-7.2S17.1 3.6 12 3.6z"/>';
const KkIc = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="vd-kk-ic" dangerouslySetInnerHTML={{ __html: KAKAO }} />;
const nl = (s) => String(s || "").split("\n").map((x, i, a) => (i < a.length - 1 ? [x, <br key={i} />] : x));
const submitWith = (fn) => (e) => { e.preventDefault(); fn(e.currentTarget); };
/** 두 번 눌러야 하는 버튼 (예전 data-arm: 처음 누르면 글자를 바꾸고, 한 번 더 누르면 실행) */
function ArmBtn({ cls, v, id, label, armed, onGo, ms }) {
  const [arm, setArm] = useState(false), t = useRef(0);
  const click = (e) => {
    if (!arm) { setArm(true); clearTimeout(t.current); if (ms) t.current = setTimeout(() => setArm(false), ms); return; }
    onGo(e.currentTarget);
  };
  return <button type="button" className={cls} data-v={v} data-id={id} data-arm={arm ? "1" : undefined} onClick={click}>{arm ? armed : label}</button>;
}

/* ---------- 쿠폰 ---------- */
function CpTicket({ y }) {
  const X = VOD(), c = y.c, v = Number(c.value);
  return (
    <div className={"vd-cp vd-cp-" + y.st}><div className="vd-cp-l"><b>{c.kind === "pct" ? <>{c.value}<small>%</small></> : v / 10000 >= 1 ? <>{v / 10000}<small>만 원</small></> : <>{v.toLocaleString()}<small>원</small></>}</b></div>
      <div className="vd-cp-r"><strong>{c.name}</strong><span>{X.couponTxt(c) + " · " + X.couponCond(c)}</span><small>{y.st === "used" ? "사용 완료" + (y.x.orderNo ? " · " + y.x.orderNo : "") : y.st === "exp" ? "기간 만료" : y.st === "off" ? "사용 중지된 쿠폰" : y.x.exp ? DB().date.fmtFull(y.x.exp) + "까지 · D-" + Math.max(0, DB().date.diffDays(y.x.exp, today())) : "기한 없음"}</small></div></div>
  );
}
export function Coupons({ d }) {
  const X = VOD(), st = storeRoute().qs.get("st") === "used" ? "used" : "ok", list = st === "ok" ? d.cpOk : d.cps.filter((y) => y.st !== "ok");
  return (
    <>
      <form className="vd-cp-reg" data-vd-coupon="" onSubmit={submitWith(X.doCoupon)}><input name="code" maxLength={30} placeholder="쿠폰 코드를 입력해 주세요" aria-label="쿠폰 코드" autoComplete="off" /><button type="submit" className="vd-btn vd-btn-dark">쿠폰 등록</button></form><p className="vd-muted vd-cp-hint">시안 체험 코드: <b>EBOOK20</b> (전자책 20% 할인)</p>
      <div className="vd-subtabs"><a href="#/vod/my/coupons" className={st === "ok" ? "on" : ""}>사용 가능 <small>{d.cpOk.length}</small></a><a href="#/vod/my/coupons?st=used" className={st === "used" ? "on" : ""}>사용 완료 · 만료 <small>{d.cps.length - d.cpOk.length}</small></a></div>
      {list.length ? <div className="vd-cps">{list.map((y, i) => <CpTicket key={y.x.id || i} y={y} />)}</div> : <Empty text={st === "ok" ? "쓸 수 있는 쿠폰이 없어요. 쿠폰 코드가 있다면 위에서 등록해 주세요." : "사용했거나 만료된 쿠폰이 없어요."} />}
    </>
  );
}

/* ---------- 전자책 · 선물 자료 ---------- */
function dl(m, pid, gi) {
  const X = VOD(), p = X.product(pid);
  if (!(p && m && X.owns(m.id, p.id))) return;
  const o = X.ownOrder(m.id, p.id);
  if (o && !o.dlAt && X.typeOf(p) === "ebook") { o.dlAt = Date.now(); X.save(); }
  X.download(p, gi != null ? Number(gi) : null);
}
export function Ebooks({ m, d }) {
  const X = VOD(), gifts = d.mine.filter((x) => (x.p.gifts || []).length);
  return (
    <>
      {d.ebooks.length ? <div className="vd-rcs">{d.ebooks.map(({ o, p }) => <RcCard key={p.id} cls="eb" th={<RawOne html={X.thumbArt(p)} />} href={"#/vod/learn/" + p.id} chips={<><span className="vd-kchip vd-kchip-ebook">전자책</span><RcSt t="평생 소장" k="ok" /></>} title={p.title}
        sub={p.creator + " · " + (p.format || "PDF") + " " + (Number(p.pages) || 0) + "쪽 · " + fmtFull(o.paidAt) + " 구매"}
        act={<><button type="button" className="vd-btn vd-btn-p" data-v="dl" data-p={p.id} onClick={() => dl(m, p.id)}><Icon n="download" c="xs" />PDF 내려받기</button><a className="vd-btn vd-btn-o" href={"#/vod/learn/" + p.id}>목차 보기</a></>} />)}</div>
        : <Empty text="구매한 전자책이 없어요. 바로 내려받아 따라 하는 전자책을 둘러보세요." label="전자책 보기" href="#/vod/c/all?tab=ebook" />}
      {gifts.length ? <><h3 className="vd-my-sub">강의 선물 자료</h3><div className="vd-rcs">{gifts.map(({ p }) => p.gifts.map((g, gi) => <RcCard key={p.id + ":" + gi} cls="gift" th={<span className="vd-rc-file"><Icon n="file" /><b>PDF</b></span>} href={"#/vod/p/" + p.id} chips={<span className="vd-kchip vd-kchip-free">수강 선물</span>} title={g.title}
        sub={p.title + " 수강 선물 · PDF" + (g.pages ? " " + g.pages + "쪽" : "")} act={<button type="button" className="vd-btn vd-btn-o" data-v="dl" data-p={p.id} data-g={gi} onClick={() => dl(m, p.id, gi)}><Icon n="download" c="xs" />내려받기</button>} />))}</div></> : null}
    </>
  );
}

/* ---------- LIVE · 오프라인 ---------- */
function EbAct({ p, xl }) {
  const X = VOD(), fn = X.bizOn("flive") && X.eventPast(p) && X.funnelOf(p), nx = fn && X.product(fn.next);
  if (!nx || nx.status !== "on") return null;
  const e = X.ebOf(nx);
  return <a className={"vd-btn " + (e ? "vd-btn-p" : "vd-btn-o") + (xl ? " vd-btn-xl" : "")} href={"#/vod/p/" + nx.id}><Icon n={e ? "sparkles" : "arrowRight"} c={xl ? "sm" : "xs"} />{e ? "얼리버드 " + X.pctOf(nx) + "% · " + X.ebDayTxt(e.ebDay) + "까지" : "이어지는 강의 보기"}</a>;
}
export function Live({ d }) {
  const X = VOD();
  return (
    <>
      <div className="vd-ch-note"><Icon n="message" c="sm" /><div><b>LIVE · 오프라인은 카카오톡 오픈채팅방에서 진행 안내를 드려요</b><span>신청하면 오픈채팅방 입장 버튼이 열려요. 강의 날 오픈채팅방에 유튜브 라이브 링크를 올려 드리고, 오프라인은 자세한 장소를 알려 드려요.</span></div></div>
      {d.live.length ? <div className="vd-rcs">{d.live.map(({ o, p }) => {
        const t = new Date(p.eventAt), past = X.eventPast(p), dd = DB().date.diffDays(DB().date.toStr(t), today()), tl = X.typeOf(p) === "live", free = X.priceOf(p) === 0;
        return <RcCard key={p.id} cls={past ? "exp" : ""} th={<RawOne html={X.thumbArt(p)} />} href={"#/vod/learn/" + p.id}
          chips={<><span className={"vd-kchip vd-kchip-" + (free ? "free" : tl ? "live" : "offline")}>{free ? "무료 LIVE" : tl ? "LIVE" : "오프라인"}</span>{past ? <RcSt t="종료" k="end" /> : <RcSt t={dd > 0 ? "D-" + dd : "오늘"} k={dd <= 3 ? "warn" : ""} />}</>}
          title={p.title} sub={X.fmtEvent(p.eventAt, true) + " · " + (tl ? X.viaOf(p) : X.placeShort(p.place) || "현장")} extra={<span className="vd-rc-s2">{p.creator + " · 주문 " + o.no}</span>}
          act={<><EbAct p={p} />{p.kakao && !past ? <a className="vd-btn vd-btn-kakao" href={p.kakao} target="_blank" rel="noopener"><Icon n="message" c="xs" />오픈채팅 입장</a> : null}{tl && p.via !== "zoom" && p.ytLive && (past || dd <= 0) ? <a className="vd-btn vd-btn-yt" href={p.ytLive} target="_blank" rel="noopener"><Icon n="play" c="xs" />{past ? "다시보기" : "라이브 보기"}</a> : null}{p.via === "zoom" && X.replayOk(p) ? <a className="vd-btn vd-btn-yt" href={p.replayUrl} target="_blank" rel="noopener"><Icon n="play" c="xs" />다시보기</a> : null}<a className="vd-btn vd-btn-o" href={"#/vod/learn/" + p.id}>{tl ? "입장 안내" : "참석 안내"}</a></>} />;
      })}</div> : <Empty text="신청한 LIVE · 오프라인 강의가 없어요." label="프리미엄 강의 보기" href="#/vod/c/all?tab=premium" />}
    </>
  );
}

/* ---------- 기기 관리 ---------- */
export function Devices({ m, act }) {
  const X = VOD(), dv = X.myDevices(m), cur = X.devId();
  const del = (id) => { const mm = X.me(); if (!mm || !Array.isArray(mm.devices)) return; mm.devices = mm.devices.filter((x) => x.id !== id); X.save(); act.redraw(); toast("기기를 해제했어요."); };
  return (
    <>
      <p className="vd-my-lead">한 계정으로 <b>최대 {X.DEV_MAX}대</b>의 기기에서 강의를 볼 수 있어요. 쓰지 않는 기기는 해제하면 다른 기기를 등록할 수 있어요. 동시에 두 기기에서 재생하면 먼저 보던 기기는 멈춰요.</p>
      <div className="vd-dev-cnt"><b>{dv.length}</b> / {X.DEV_MAX}대 등록됨</div>
      <ul className="vd-devs">{dv.map((x) => <li key={x.id} className={x.id === cur ? "me" : ""}><span className="vd-dev-ic"><Icon n={x.kind === "모바일" ? "message" : "monitorPlay"} c="sm" /></span><div><b>{x.name}{x.id === cur ? <> <em>지금 이 기기</em></> : null}</b><small>{x.kind + " · 처음 등록 " + fmtFull(x.first) + " · 마지막 접속 " + fmtFull(x.last)}</small></div>
        {x.id === cur ? <span className="vd-st vd-st-ok">사용 중</span> : <ArmBtn cls="vd-btn vd-btn-o vd-btn-sm" v="dev-del" id={x.id} label="기기 해제" armed="한 번 더 누르면 해제" onGo={() => del(x.id)} />}</li>)}</ul>
      <p className="vd-muted vd-my-note"><Icon n="alert" c="xs" /> 기기 해제는 한 달에 3번까지 할 수 있어요. 모르는 기기가 있다면 비밀번호를 바꾸고 고객센터에 알려 주세요.</p>
    </>
  );
}

/* ---------- 내 수강 후기 ---------- */
function RvEdit({ rv, onClose, onSaved }) {
  const save = (e) => {
    e.preventDefault();
    const f = e.currentTarget, X = VOD(), tx = f.text.value.trim();
    if (tx.length < 10) { toast("후기는 10자 이상 적어 주세요.", "warn"); return; }
    rv.text = tx; rv.rating = Number((f.querySelector("input[name=rating]:checked") || {}).value) || rv.rating; rv.editedAt = Date.now(); X.save(); onClose(); onSaved(); toast("후기를 고쳤어요.");
  };
  return (
    <Modal title="후기 고치기" onClose={onClose}>
      <form className="vd-modal-b vd-rv-edit" data-vd-rvedit={rv.id} onSubmit={save}><div className="vd-rv-stars" role="radiogroup" aria-label="별점">{[5, 4, 3, 2, 1].map((n) => <label key={n}><input type="radio" name="rating" value={n} defaultChecked={rv.rating === n} /><span>{n}점</span></label>)}</div><textarea name="text" rows={5} maxLength={1000} aria-label="후기" defaultValue={rv.text} /><button type="submit" className="vd-btn vd-btn-p">저장</button></form>
    </Modal>
  );
}
export function Reviews({ m, d, act }) {
  const X = VOD(), v = X.V(), can = d.vods.filter((x) => !d.rv.some((r) => r.pid === x.p.id)), [edit, setEdit] = useState(null);
  const del = (id) => { const rv = v.reviews.find((x) => x.id === id && x.mid === m.id); if (!rv) return; v.reviews.splice(v.reviews.indexOf(rv), 1); X.save(); act.redraw(); toast("후기를 지웠어요. 받은 포인트는 그대로예요 (다시 써도 추가 적립은 없어요)."); };
  const pt = (Number(v.settings.reviewPoint) || 0).toLocaleString();
  return (
    <>
      {can.length ? <div className="vd-callout"><Icon n="star" c="sm" /><span>후기를 기다리는 강의가 {can.length}개 있어요. 후기를 쓰면 {pt}P를 드려요.</span>{can.slice(0, 3).map((x) => <a key={x.p.id} href={"#/vod/p/" + x.p.id}>{x.p.title}</a>)}</div> : null}
      {d.rv.length ? <ul className="vd-rv-list">{d.rv.map((r) => <li key={r.id} className={r.hidden ? "is-hidden" : undefined}><div className="vd-rv-h"><b>{(X.product(r.pid) || {}).title || ""}{r.hidden ? <> <em className="vd-rv-hid">운영 정책으로 숨김 처리됨</em></> : null}</b><span className="vd-stars sm" dangerouslySetInnerHTML={{ __html: X.stars(r.rating) }} /><time>{fmtFull(r.at)}</time></div><p>{r.text}</p>
        <div className="vd-rv-act"><button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="rv-edit" data-id={r.id} onClick={() => setEdit(r)}>고치기</button><ArmBtn cls="vd-btn vd-btn-line vd-btn-sm" v="rv-del" id={r.id} label="지우기" armed="한 번 더 누르면 지워요" ms={3000} onGo={() => del(r.id)} /></div></li>)}</ul> : <Empty text="아직 남긴 후기가 없어요." />}
      {edit ? <RvEdit rv={edit} onClose={() => setEdit(null)} onSaved={act.redraw} /> : null}
    </>
  );
}

/* ---------- 고객센터 · 1:1 문의 ---------- */
const CAT = [["수강 · 강의", "play", "강의 재생 · 진도 · 수강 기간"], ["결제 · 환불", "coins", "결제 · 영수증 · 환불 · 세금계산서"], ["쿠폰 · 포인트", "award", "쿠폰 받기 · 등록 · 포인트"], ["LIVE · 오프라인", "calendar", "오픈채팅 · 라이브 · 장소"], ["계정 · 로그인", "user", "가입 · 로그인 · 기기 관리"], ["오류 · 기술 문의", "alert", "화면 오류 · 자료 내려받기"], ["강사 입점 · 제휴", "handshake", "강의 열기 · 제휴 제안"], ["기타", "message", "그 밖의 궁금한 점"]];
export function Help({ m, d }) {
  const X = VOD(), v = X.V(), iq = (v.inquiries || []).filter((x) => x.mid === m.id).sort((a, b) => b.at - a.at), ht = storeRoute().qs.get("t") === "list" ? "list" : "new", unseen = iq.filter((x) => x.answer && !x.seenAt).length;
  const FAQ = X.helpFaq(), NT = (v.notices || []).filter((x) => x.on !== false).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.at - a.at), myOrders = d.orders.filter((o) => o.status !== "canceled").slice(0, 20);
  const [cnt, setCnt] = useState(0);
  const seen = (e, x) => { if (e.currentTarget.open && x.answer && !x.seenAt) { x.seenAt = Date.now(); X.save(); } };
  return (
    <>
      <div className="vd-hc-kk"><span className="vd-hc-kk-ic"><KkIc /></span><div><b>카카오톡으로 바로 상담하기</b><small>강의 재생 · 결제 · 환불 · 오류처럼 급한 문제는 두잉고 · 두고클래스 운영 상담 채널로 바로 물어보세요.</small></div><KakaoBtn cls="vd-btn vd-btn-kakao" label="카카오톡 상담" /></div>
      {NT.length ? <div className="vd-hc-nt"><div className="vd-hc-h"><h3>공지사항</h3><span>DOOGO CLASS 운영 소식</span></div>{NT.map((x, i) => <details key={x.id || i} className="vd-faq" open={!!x.pin}><summary><em>{x.pin ? "필독" : "공지"}</em><span>{x.title}</span><Icon n="chevDown" c="sm" /></summary><p>{nl(x.body)}<small>{fmtFull(x.at)}</small></p></details>)}</div> : null}
      <div className="vd-hc-faq"><div className="vd-hc-h"><h3>자주 묻는 질문</h3><span>문의 전에 먼저 확인해 보세요</span></div>{FAQ.map((f, i) => <details key={i} className="vd-faq"><summary><em>{f[0]}</em><span>{f[1]}</span><Icon n="chevDown" c="sm" /></summary><p>{nl(f[2])}</p></details>)}</div>
      <div className="vd-hc-tabs"><a href="#/vod/my/help" className={ht === "new" ? "on" : ""}><Icon n="pen" c="xs" />1:1 문의하기</a><a href="#/vod/my/help?t=list" className={ht === "list" ? "on" : ""}><Icon n="message" c="xs" />내 문의 내역 <small>{iq.length}</small>{unseen ? <i className="vd-hc-new">새 답변 {unseen}</i> : null}</a></div>
      {ht === "new"
        ? <form className="vd-iq2" data-vd-iq="" noValidate onSubmit={submitWith(X.doInquiry)}>
            <fieldset className="vd-iq-f"><legend>문의 분류 <em>*</em></legend><div className="vd-iq-cats">{CAT.map((c, i) => <label key={c[0]} className="vd-iq-cat"><input type="radio" name="cat" value={c[0]} defaultChecked={i === 0} /><span><i><Icon n={c[1]} c="sm" /></i><b>{c[0]}</b><small>{c[2]}</small></span></label>)}</div></fieldset>
            <div className="vd-iq-row"><label className="vd-iq-f"><span>관련 주문 <small>(선택)</small></span><select name="order"><option value="">주문과 관계없는 문의예요</option>{myOrders.map((o) => <option key={o.no} value={o.no}>{(o.no + " · " + o.title).slice(0, 60)}</option>)}</select></label>
              <label className="vd-iq-f"><span>답변 알림 이메일</span><input defaultValue={m.email || ""} readOnly aria-readonly="true" /></label></div>
            <label className="vd-iq-f"><span>제목 <em>*</em></span><input name="title" maxLength={60} placeholder="어떤 점이 궁금하세요?" /></label>
            <label className="vd-iq-f"><span>내용 <em>*</em><small className="vd-iq-cnt" data-iq-cnt="">{cnt} / 1000</small></span><textarea name="text" rows={6} maxLength={1000} placeholder="상황을 자세히 적어 주시면 더 빨리 도와드릴 수 있어요. (예: 어떤 강의 · 어떤 화면에서 · 무엇이 안 되는지)" onInput={(e) => setCnt(e.currentTarget.value.length)} /></label>
            <p className="vd-err" id="vd-iq-err" role="alert" /><div className="vd-iq-foot"><span><Icon n="clock" c="xs" />평일 오전 10시 ~ 오후 6시 · 영업일 기준 하루 안에 답해 드려요</span><button type="submit" className="vd-btn vd-btn-p vd-btn-xl">문의 남기기</button></div></form>
        : iq.length ? <div className="vd-iq-list">{iq.map((x) => <details key={x.id} className={"vd-iq-it" + (x.answer ? " ans" : "")} data-iq={x.id} open={!!(x.answer && !x.seenAt)} onToggle={(e) => seen(e, x)}><summary><span className={"vd-sroom-st " + (x.answer ? "ok" : "warn")}>{x.answer ? "답변 완료" : "답변 대기"}</span><span className="vd-iq-cat-t">{x.cat}</span><b>{x.title}</b>{x.answer && !x.seenAt ? <i className="vd-hc-new">NEW</i> : null}<small>{fmtFull(x.at)}</small><Icon n="chevDown" c="sm" /></summary>
            <div className="vd-iq-body"><div className="vd-iq-q"><span className="vd-iq-who">Q</span><div><p>{nl(x.text)}</p>{x.order ? <small>관련 주문 {x.order}</small> : null}</div></div>
              {x.answer ? <div className="vd-iq-a2"><span className="vd-iq-who a">A</span><div><b>DOOGO CLASS 고객센터</b><small>{x.answeredAt ? fmtFull(x.answeredAt) + " 답변" : ""}</small><p>{nl(x.answer)}</p></div></div> : <p className="vd-iq-wait"><Icon n="clock" c="xs" /> 담당자가 확인하고 있어요. 답변이 달리면 여기와 이메일로 알려 드려요.</p>}</div></details>)}</div>
          : <Empty text="아직 남긴 문의가 없어요. 궁금한 점이 있으면 편하게 물어보세요." label="1:1 문의하기" href="#/vod/my/help" />}
    </>
  );
}

/* ---------- 회원 정보 수정 ---------- */
function KkCard({ m }) {
  const X = VOD();
  if (m.via === "kakao") return <div className="vd-kkc on"><span className="vd-kkc-ic"><KkIc /></span><div><b>카카오 계정으로 가입했어요</b><small>로그인은 ‘카카오로 1초 만에 시작하기’로 해요.</small></div><span className="vd-st vd-st-ok">연결됨</span></div>;
  if (m.kakaoId) return <div className="vd-kkc on"><span className="vd-kkc-ic"><KkIc /></span><div><b>카카오 연결됨</b><small>{"이메일 · 비밀번호와 카카오, 둘 다로 로그인할 수 있어요." + (m.kakaoLinkedAt ? " · " + fmtFull(m.kakaoLinkedAt) + " 연결" : "")}</small></div><ArmBtn cls="vd-btn vd-btn-line vd-btn-sm" v="kk-off" label="연결 끊기" armed="한 번 더 누르면 연결을 끊어요" onGo={(el) => { el.dataset.arm = "1"; X.kakaoUnlink(el); }} /></div>;
  return <div className="vd-kkc"><span className="vd-kkc-ic"><KkIc /></span><div><b>카카오 계정 연결</b><small>연결하면 다음부터 비밀번호 없이 카카오로 1초 만에 로그인해요. 강의 · 주문 · 쿠폰은 그대로예요.</small></div><button type="button" className="vd-btn vd-btn-kakao vd-btn-sm" data-v="kk-link" onClick={() => X.kakaoLink()}>카카오 연결하기</button></div>;
}
function PwField({ name, ac, ph }) {
  const [show, setShow] = useState(false);
  return <span className="vd-pw"><input name={name} type={show ? "text" : "password"} autoComplete={ac} maxLength={40} placeholder={ph} /><button type="button" data-v="pw-eye" aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"} onClick={() => setShow(!show)}><Icon n={show ? "eyeOff" : "eye"} c="sm" /></button></span>;
}
export function Account({ m, act }) {
  const X = VOD();
  return (
    <>
      <KkCard m={m} />
      <form className="vd-acctf vd-form" data-vd-acct="" noValidate onSubmit={submitWith(X.doAcct)}><label>이메일 (아이디)<input defaultValue={m.email} readOnly /></label><label>이름<input name="name" defaultValue={m.name} maxLength={20} /></label><label>휴대폰<input name="phone" defaultValue={m.phone || ""} maxLength={20} /></label><label className="vd-agree"><input type="checkbox" name="mkt" defaultChecked={!!m.marketing} /><span>할인 · 새 클래스 소식 받기 (선택)</span></label>
        <div className="vd-acct-ch"><span>받을 곳</span>{X.CH3.map((c) => <label key={c[0]}><input type="checkbox" name={"ch_" + c[0]} defaultChecked={!!X.chOn(m, c[0])} /><span>{c[1]}</span></label>)}<label><input type="checkbox" name="night" defaultChecked={!!(m.consent && m.consent.night)} /><span>밤 9시 ~ 아침 8시에도 받기</span></label></div>
        {m.consent && m.consent.mkt ? <p className="vd-muted vd-acct-cs">{fmtFull(m.consent.at)}에 소식 받기에 동의했어요. 2년마다 한 번 동의 여부를 다시 알려 드려요.</p> : null}
        <details className="vd-pwbox" hidden={m.via === "kakao" && !m.pw}><summary>비밀번호 바꾸기</summary><label>지금 비밀번호<PwField name="pw0" ac="current-password" ph="지금 비밀번호" /></label><label>새 비밀번호<PwField name="pw1" ac="new-password" ph="영문 · 숫자 8자 이상" /></label></details>
        <p className="vd-err" id="vd-acct-err" role="alert" /><div className="vd-acct-f"><button type="submit" className="vd-btn vd-btn-p">저장</button><button type="button" className="vd-btn vd-btn-o" data-v="logout" onClick={act.logout}>로그아웃</button></div><p className="vd-muted">가입일 {fmtFull(m.createdAt)}</p></form>
    </>
  );
}

/* ---------- 1:1 코칭 · TEA TIME ---------- */
export function Addons({ m, d, act }) {
  const X = VOD();
  return (
    <>
      <p className="vd-my-lead">강사에게 직접 묻는 <b>1:1 코칭권</b>과 강사님과 만나는 <b>TEA TIME</b>을 한 곳에서 봐요. 수강 중인 강의 상세 페이지에서 살 수 있어요.</p>
      <h3 className="vd-my-sub">1:1 코칭권</h3>
      {d.coaches.length ? <div className="vd-rcs">{d.coaches.map((o) => {
        const p = X.product(o.pid) || {}, end = o.paidAt + (Number(o.coach.days) || 180) * 864e5, live = end > Date.now(), n = Number(o.coach.n) || 0, used = Number(o.coach.used) || 0, lf = Math.max(0, n - used);
        return <RcCard key={o.no} cls={live && lf ? "" : "exp"} th={p.id ? <RawOne html={X.thumbArt(p)} /> : null} href={"#/vod/p/" + o.pid}
          chips={<><span className="vd-kchip vd-kchip-vod">1:1 코칭권</span>{live ? (lf ? <RcSt t={"남은 " + lf + "회"} k="ok" /> : <RcSt t="모두 사용" k="end" />) : <RcSt t="기간 끝" k="end" />}</>}
          title={p.title || o.title} sub={(p.creator || "") + " 강사 · " + n + "회 중 " + used + "회 사용"}
          extra={<><div className="vd-rc-dots">{Array.from({ length: n }, (_, i) => <i key={i} className={i < used ? "on" : ""} />)}</div><span className="vd-rc-s2">{live ? fmtFull(end) + "까지 사용" : "사용 기간이 끝났어요"}</span></>}
          act={live && lf && X.owns(m.id, o.pid) && X.dgOpen(p)
            ? <><button type="button" className="vd-btn vd-btn-p" data-v="dg" data-p={o.pid} data-to="#/qna/requests/new" onClick={() => X.enterDg(o.pid, "", "#/qna/requests/new")}><Icon n="message" c="xs" />질문하기</button><button type="button" className="vd-btn vd-btn-o" data-v="dg" data-p={o.pid} data-to="#/qna/requests" onClick={() => X.enterDg(o.pid, "", "#/qna/requests")}>내 코칭 질문</button></>
            : <a className="vd-btn vd-btn-o" href={"#/vod/p/" + o.pid}>강의 상세</a>} />;
      })}</div> : <Empty text="가진 1:1 코칭권이 없어요. 수강 중인 강의 상세 페이지 › 1:1 코칭권에서 살 수 있어요." />}
      <h3 className="vd-my-sub">강사님과 TEA TIME</h3>
      {d.teas.length ? <div className="vd-rcs">{d.teas.map((o) => {
        const p = X.product(o.pid) || {}, tt = o.tea || {}, st = X.TEA_ST[tt.st] || X.TEA_ST.req, pend = o.status === "pending";
        return <RcCard key={o.no} cls={tt.st === "done" || tt.st === "cancel" ? "exp" : ""} th={p.id ? <RawOne html={X.thumbArt(p)} /> : null} href={"#/vod/p/" + o.pid}
          chips={<><span className="vd-kchip vd-kchip-live">TEA TIME {tt.min || 60}분</span><RcSt t={pend ? "입금 대기" : st[0]} k={pend ? "warn" : st[1] === "ok" ? "ok" : st[1] === "mute" ? "end" : ""} /></>}
          title={X.teaStTxt(o)} sub={(p.creator || "") + " 강사 · " + (X.TEA_MODE[tt.mode] || "")} extra={tt.topic ? <p className="vd-rc-q">“{tt.topic}”</p> : null}
          act={<a className="vd-btn vd-btn-o" href={"#/vod/p/" + o.pid}>강의 상세</a>} />;
      })}</div> : <Empty text="신청한 TEA TIME이 없어요. 수강 중인 강의 상세 페이지에서 신청할 수 있어요." />}
    </>
  );
}
