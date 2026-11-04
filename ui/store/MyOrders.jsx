"use client";
/* 마이페이지 › 결제 대기 · 주문 · 결제 내역 · 종이책 · 배송 조회 — 예전 vod.js pageMy 의 pending · orders · ship 을 React 로 (Next.js 전환 4-4)
 * 돈이 걸린 버튼(주문 취소 · 바로 취소 · 환불 요청 · 요청 취소 · 영수증)은 예전과 같은 처리 함수(window.VOD.ordCancelDo · rfCancel · doRfReq …)를 불러요.
 * 영수증 · 환불 규정 · 배송지 칸 · 환불 계좌 칸 · 반품 안내 상자는 아직 예전 HTML 그대로 (Raw). */
import { useState } from "react";
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import Modal from "../lib/Modal.jsx";
import { Empty } from "./MyTabs.jsx";
import { VOD, DB, won, storeRoute, toast } from "../lib/legacy.js";

const fmtFull = (t) => DB().date.fmtFull(DB().date.toStr(new Date(t)));
const ST = { paid: ["결제 완료", "ok"], pending: ["입금 대기", "warn"], refunded: ["환불 완료", "mute"], canceled: ["주문 취소", "mute"], ready: ["결제 안 끝남", "mute"], failed: ["결제 안 됨", "mute"] };
const copy = (tx) => { (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => toast("계좌번호를 복사했어요. " + tx), () => toast("계좌번호: " + tx)); };

/** 두 번 눌러야 하는 버튼 (예전 data-arm) */
function ArmBtn({ cls, v, no, label, armed, onGo }) {
  const [arm, setArm] = useState(false);
  return <button type="button" className={cls} data-v={v} data-no={no} data-arm={arm ? "1" : undefined} onClick={() => { if (!arm) { setArm(true); return; } onGo(); }}>{arm ? armed : label}</button>;
}

/** 주문 · 배송 현황 줄 (예전 shipStrip) — 마이페이지 홈도 써요 */
export function ShipStrip({ list, on }) {
  const X = VOD(), ks = ["wait", "ready", "prep", "ship", "done"], n = (k) => list.filter((o) => X.shipStOf(o) === k && !(X.claimOf(o) && ["req", "pick"].indexOf(X.claimOf(o).st) >= 0)).length, cl = list.filter((o) => X.claimOf(o) || X.shipStOf(o) === "cancel").length;
  const items = [];
  ks.forEach((k, i) => { if (i) items.push(<i key={"s" + i} aria-hidden="true"><Icon n="chevRight" c="xs" /></i>); items.push(<a key={k} href={"#/vod/my/ship?st=" + k} className={(n(k) ? "has" : "") + (on === k ? " on" : "")}><b>{n(k)}</b><span>{X.SHIP_ST[k][0]}</span></a>); });
  return <><div className="vd-shs">{items}</div><p className="vd-shs-c"><a href="#/vod/my/ship?st=claim" className={on === "claim" ? "on" : ""}>취소 · 반품 · 교환 <b>{cl}</b></a>{on ? <a href="#/vod/my/ship">전체 보기</a> : null}</p></>;
}

/* ---------- 팝업 ---------- */
function ReceiptModal({ o, onClose }) {
  const X = VOD();
  const pdf = (e) => { const el = document.getElementById("rc-doc"); if (window.DGFILE) window.DGFILE.pdfBtn(e.currentTarget, el, "DOOGO-CLASS-영수증-" + o.no + ".pdf", { width: 760, margin: 12, title: "DOOGO CLASS 영수증 " + o.no }, (msg) => toast(msg)); };
  return (
    <Modal title="결제 영수증" cls="vd-modal-rcpt" onClose={onClose}>
      <div className="vd-modal-b vd-rcpt2"><RawOne html={X.rcptHtml(o)} /><div className="rc-acts" data-pdf-hide=""><button type="button" className="vd-btn vd-btn-p vd-btn-xl" data-v="rcpt-pdf" data-no={o.no} onClick={pdf}><Icon n="download" c="sm" />PDF로 내려받기</button></div></div>
    </Modal>
  );
}
const RefundRules = ({ onClose }) => <Modal title="환불 규정" onClose={onClose}><Raw as="div" className="vd-modal-b" html={VOD().refundHtml()} /></Modal>;

function RfNowModal({ o, onClose, onDone }) {
  const X = VOD(), nw = X.rfNowInfo(o), q = nw.q, [busy, setBusy] = useState(false);
  const ok = () => {
    const mm = X.me();
    if (!mm || o.mid !== mm.id || !X.instantOf(o).ok) { onClose(); return; }
    setBusy(true);
    X.rfCancel(o).then((amt) => { onClose(); onDone(); toast(won(amt) + "을 환불했어요. 카드사에 따라 3~5영업일 안에 돌아와요." + (o.pg && o.pg.st === "mock" ? " (시안 · 실제 카드 취소 없음)" : "")); },
      (er) => { setBusy(false); toast(String((er && er.message) || "취소하지 못했어요. 고객센터로 문의해 주세요."), "warn"); });
  };
  return (
    <Modal title="결제 취소 · 100% 환불" onClose={onClose}>
      <div className="vd-modal-b vd-rfnow"><p className="vd-rfq-t"><b>{o.title}</b>{X.optTxt(o) ? <small>{X.optTxt(o)}</small> : null}<span>결제 {won(o.amount)} · {fmtFull(o.paidAt || o.at)}</span></p>
        <div className="vd-rfnow-box"><b>{won(nw.tot)}</b><span>전액 돌려드려요</span></div><ul className="vd-rfnow-l"><li><Icon n="check" c="xs" />{q.why}</li>{nw.adds.length ? <li><Icon n="check" c="xs" />함께 결제한 {nw.adds.map((x) => X.optTxt(x) || x.title).join(", ")}도 같이 취소돼요.</li> : null}{nw.r.restore && (o.mcid || o.pointOff) ? <li><Icon n="check" c="xs" />결제에 쓴 쿠폰 · 포인트도 돌려드려요.</li> : null}<li><Icon n="check" c="xs" />취소하면 수강 권한이 바로 사라져요.</li><li><Icon n="clock" c="xs" />카드 승인 취소는 카드사에 따라 3~5영업일 걸려요.</li></ul>
        <div className="vd-rfnow-a"><button type="button" className="vd-btn vd-btn-o" data-v="close">그만두기</button><button type="button" className="vd-btn vd-btn-p" data-v="rf-now-ok" data-no={o.no} disabled={busy} onClick={ok}>{busy ? "취소하는 중…" : "결제 취소하고 환불받기"}</button></div></div>
    </Modal>
  );
}
function RfReqModal({ o, onClose }) {
  const X = VOD(), bk = !!o.ship, sst = bk ? X.shipStOf(o) : "", pre = sst === "prep" || sst === "ready", fee = Number(X.shipSet().returnFee) || 0;
  const whys = bk ? (pre ? ["단순 변심", "다른 책으로 다시 주문", "배송지를 잘못 적었어요", "기타"] : ["단순 변심", "파손 · 파본", "잘못 보낸 책", "배송이 오지 않았어요", "기타"]) : ["단순 변심", "생각한 내용과 달라요", "중복 결제", "강의 재생 · 오류", "기타"];
  return (
    <Modal title={bk ? (pre ? "주문 취소 요청" : "반품 · 교환 신청") : "환불 요청"} cls="vd-modal-sm" onClose={onClose}>
      <form className="vd-modal-b vd-rfq" data-vd-rfreq="" data-no={o.no} onSubmit={(e) => { e.preventDefault(); X.doRfReq(e.currentTarget); }}><p className="vd-rfq-t"><b>{o.title}</b>{X.optTxt(o) ? <small>{X.optTxt(o)}</small> : null}<span>결제 {won(o.amount)} · {fmtFull(o.paidAt || o.at)}</span></p>
        {bk ? <p className="vd-rfq-bk"><Icon n="truck" c="xs" /><span>{pre ? "책을 준비하고 있어요. 보내기 전이면 전액 환불해 드려요." : "단순 변심은 받은 날부터 7일 안에 반품할 수 있고 왕복 배송비(" + won(fee) + ")를 빼고 환불해요. 파손 · 파본 · 잘못 보낸 책은 30일 안에 전액 환불하거나 같은 책으로 바꿔 드려요. 책이 돌아와 확인되면 환불해 드려요."}</span></p> : null}
        {bk && !pre ? <div className="vd-rfq-kind"><label><input type="radio" name="kind" value="return" defaultChecked /><span><b>반품 · 환불</b><small>책을 돌려보내고 환불받아요</small></span></label><label><input type="radio" name="kind" value="exchange" /><span><b>교환</b><small>같은 책으로 바꿔 받아요</small></span></label></div> : null}
        <div className="vd-rfq-why">{whys.map((x, i) => <label key={x}><input type="radio" name="why" value={x} defaultChecked={i === 0} /><span>{x}</span></label>)}</div>
        <textarea name="text" rows={3} maxLength={300} placeholder={bk && !pre ? "책 상태를 적어 주시면 더 빨리 처리돼요 (선택)" : "자세한 사유를 적어 주시면 더 빨리 처리돼요 (선택)"} />
        {o.method === "bank" || o.method === "vbank" ? <div className="vd-rfq-acct"><b>환불 받을 계좌</b><small>{(o.method === "vbank" ? "가상계좌" : "무통장 입금") + " 결제는 이 계좌로 돌려드려요. 본인 명의 계좌를 적어 주세요." + (bk && !pre ? " (교환은 적지 않아도 돼요)" : "")}</small><RawOne html={X.acctFields((o.refundReq && o.refundReq.acct) || null)} /></div> : null}
        <p className="vd-err" data-rfq-err="" /><p className="vd-muted"><Icon n="alert" c="xs" />{bk ? " 영업일 1~2일 안에 확인하고 마이페이지 › 종이책 · 배송 조회에서 진행 상황을 알려 드려요." : " 환불 금액은 환불 규정(결제일 · 들은 강의 수)에 따라 정해져요. 영업일 1~3일 안에 처리하고 결과를 알려 드려요."}</p>
        <button type="submit" className="vd-btn vd-btn-p vd-btn-xl">{bk ? (pre ? "취소 요청 보내기" : "신청하기") : "환불 요청 보내기"}</button></form>
    </Modal>
  );
}
function ShipEditModal({ o, onClose }) {
  const X = VOD();
  // 배송지 칸은 예전 HTML(주소 찾기 버튼 · 요청사항 고르기 포함) — 그 안의 버튼 · 바꾸기는 예전 처리 함수로
  const click = (e) => { const b = e.target.closest && e.target.closest("[data-v='addr-find']"); if (b) { e.preventDefault(); X.addrFind(b); } };
  return (
    <Modal title="배송지 바꾸기" cls="vd-modal-sm" onClose={onClose}>
      <form className="vd-modal-b vd-shipedit" data-vd-shipedit={o.no} onSubmit={(e) => { e.preventDefault(); X.doShipEdit(e.currentTarget); }} onClick={click} onChange={(e) => X.formChange(e.nativeEvent)}><p className="vd-muted">책을 보내기 전까지 바꿀 수 있어요.</p><RawOne html={X.shipFields(o.ship, "e")} /><label className="vd-co-keep"><input type="checkbox" name="esave" defaultChecked /><span>다음 주문에도 이 배송지 쓰기</span></label><p className="vd-err" data-se-err="" role="alert" /><button type="submit" className="vd-btn vd-btn-p vd-btn-xl">배송지 저장</button></form>
    </Modal>
  );
}

/* ---------- 버튼들 ---------- */
function useOrderActs(act) {
  const X = VOD(), [pop, setPop] = useState(null), close = () => setPop(null);
  const mine = (o) => { const m = X.me(); return !!(m && o && o.mid === m.id); };
  const a = {
    receipt: (o) => setPop({ k: "rcpt", o }),
    rules: () => setPop({ k: "rules" }),
    rfNow: (o) => { if (!mine(o)) return; const q = X.instantOf(o); if (!q.ok) { toast(q.why || "바로 취소할 수 없는 주문이에요. 환불 요청을 남겨 주세요.", "warn"); return; } setPop({ k: "now", o }); },
    rfReq: (o) => { if (!mine(o) || o.status !== "paid") return; setPop({ k: "req", o }); },
    rfUndo: (o) => { if (!mine(o) || !o.refundReq || typeof o.refundReq !== "object") return; const msg = X.rfUndoDo(o); act.redraw(); toast(msg); },
    cancel: (o, btn) => { if (!mine(o) || o.status !== "pending") return; if (btn) btn.disabled = true; X.ordCancelDo(o).then((msg) => { act.redraw(); toast(msg); }, (er) => { if (btn) btn.disabled = false; toast(String((er && er.message) || "취소하지 못했어요."), "warn"); }); },
    cancel0: (o) => { const p = X.product(o.pid); if (!mine(o) || o.status !== "paid" || o.amount > 0 || (p && X.eventPast(p))) return; const msg = X.ordCancel0Do(o); act.redraw(); toast(msg); },
    shipEdit: (o) => { if (!mine(o) || !o.ship) return; if (["ready", "wait"].indexOf(X.shipStOf(o)) < 0) { toast("이미 책을 준비하고 있어 배송지를 바꿀 수 없어요. 고객센터로 알려 주세요.", "warn"); return; } setPop({ k: "ship", o }); }
  };
  const modal = !pop ? null : pop.k === "rcpt" ? <ReceiptModal o={pop.o} onClose={close} /> : pop.k === "rules" ? <RefundRules onClose={close} /> : pop.k === "now" ? <RfNowModal o={pop.o} onClose={close} onDone={act.redraw} /> : pop.k === "req" ? <RfReqModal o={pop.o} onClose={close} /> : pop.k === "ship" ? <ShipEditModal o={pop.o} onClose={close} /> : null;
  return { a, modal };
}
/** 환불 · 취소 버튼 (예전 rfBtns) */
function RfBtns({ o, a }) {
  const X = VOD();
  if (o.refundReq && typeof o.refundReq === "object") return <><span className="vd-st vd-st-wait vd-o-rq">{o.ship ? X.CLAIM_K[(X.claimOf(o) || {}).k || "return"] + " 요청 처리 중" : "환불 요청 중"}</span><button type="button" className="vd-btn vd-btn-line vd-btn-sm" data-v="rf-undo" data-no={o.no} onClick={() => a.rfUndo(o)}>요청 취소</button></>;
  if (o.refundReq) return <span className="vd-st vd-st-wait vd-o-rq">환불 처리 중</span>;
  const { q, bk, st, c } = X.rfBtnsInfo(o);
  if (q.ok) return <><button type="button" className="vd-btn vd-btn-p vd-btn-sm vd-rf-now" data-v="rf-now" data-no={o.no} onClick={() => a.rfNow(o)}>{bk ? "주문 취소 · 전액 환불" : "결제 취소 · 100% 환불"}</button><small className="vd-rf-left">{bk ? "보내기 전이라 바로 취소돼요" : q.left + "일 남음 · 바로 환불"}</small></>;
  if (bk && c && c.st === "pick") return null;
  if (bk && st === "done" && X.shipDoneAt(o) && Date.now() - X.shipDoneAt(o) > 30 * 864e5) return null;
  return <button type="button" className="vd-btn vd-btn-line vd-btn-sm" data-v="rf-req" data-no={o.no} onClick={() => a.rfReq(o)}>{bk ? (st === "ready" || st === "prep" ? "취소 요청" : "반품 · 교환 신청") : "환불 요청"}</button>;
}

/* ---------- 결제 대기 · 주문 · 결제 내역 ---------- */
export function Orders({ m, d, act, sub }) {
  const X = VOD(), ot = sub === "orders" && storeRoute().qs.get("t") === "refund" ? "refund" : "pay", isRf = (o) => o.status === "refunded" || o.status === "canceled";
  const list = sub === "pending" ? d.pending : d.orders.filter((o) => (ot === "refund") === isRf(o)), { a, modal } = useOrderActs(act);
  const row = (o) => {
    const st = o.ship && X.SHIP_ST[X.shipStOf(o)] && o.status === "paid" ? X.SHIP_ST[X.shipStOf(o)] : ST[o.status] || ST.paid, ob = X.bankOf(o), p = X.product(o.pid), opt = X.optTxt(o);
    return (
      <li key={o.no} className="has-th"><a className="vd-o-th" href={"#/vod/p/" + o.pid}>{p ? <RawOne html={X.thumbArt(p)} /> : null}</a>
        <div><small>{fmtFull(o.at) + " · " + o.no}</small><b>{o.title}</b>{opt && !o.ship ? <span className="vd-o-opt">{opt}</span> : null}
          {o.ship ? <a className="vd-o-ship" href="#/vod/my/ship"><Icon n="truck" c="xs" />{"종이책 " + (Number(o.qty) || 1) + "권" + (o.shipFee ? " · 배송비 " + won(o.shipFee) : " · 무료배송") + (o.ship.inv ? " · " + (o.ship.carrier || "") + " " + o.ship.inv : "")}</a> : null}
          {o.couponOff || o.pointOff ? <span className="vd-muted">{(o.couponOff ? "쿠폰 -" + won(o.couponOff) : "") + (o.couponOff && o.pointOff ? " · " : "") + (o.pointOff ? "포인트 -" + won(o.pointOff) : "")}</span> : null}
          {o.status === "pending" ? <span className="vd-muted">{ob.vbank ? <>가상계좌 {ob.bank} <span className="vd-accno">{ob.account}</span></> : <>{ob.bank} <span className="vd-accno">{ob.account}</span> ({ob.holder}) · 입금자명 {o.depositor || (o.buyer && o.buyer.name) || m.name || ""}</>} · {X.fmtDue(X.dueOf(o))}까지 입금</span> : null}</div>
        <strong>{won(o.amount)}</strong><span className={"vd-st vd-st-" + st[1]}>{st[0]}</span>
        {o.status === "pending" ? <button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="ord-cancel" data-no={o.no} onClick={(e) => a.cancel(o, e.currentTarget)}>주문 취소</button> : (o.status === "paid" || o.status === "refunded") && o.amount > 0 ? <button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="receipt" data-no={o.no} onClick={() => a.receipt(o)}>영수증</button> : null}
        {o.status === "paid" && o.amount > 0 ? (o.refundReq && typeof o.refundReq === "object" ? <><span className="vd-st vd-st-wait vd-o-rq">환불 요청 중</span><button type="button" className="vd-btn vd-btn-line vd-btn-sm" data-v="rf-undo" data-no={o.no} onClick={() => a.rfUndo(o)}>요청 취소</button></> : o.refundReq ? <span className="vd-st vd-st-wait vd-o-rq">환불 처리 중</span> : <RfBtns o={o} a={a} />) : null}
        {o.status === "refunded" && o.refundKind === "instant" ? <small className="vd-rf-left">{"바로 취소 · " + won(o.refundAmount || o.amount) + " 환불" + (o.pg && o.pg.st === "mock" ? " (시안)" : "")}</small> : null}
        {o.status === "paid" && o.amount === 0 && p && X.isEvent(p) && !X.eventPast(p) ? <ArmBtn cls="vd-btn vd-btn-line vd-btn-sm" v="ord-cancel0" no={o.no} label="신청 취소" armed="한 번 더 누르면 취소" onGo={() => a.cancel0(o)} /> : null}
        {o.status === "canceled" && o.canceledBy === "member" ? <span className="vd-muted vd-o-by">내가 취소</span> : null}</li>
    );
  };
  return (
    <>
      {sub === "orders" ? <div className="vd-wtabs"><a href="#/vod/my/orders" className={ot === "pay" ? "on" : ""}>결제 내역 <small>{d.orders.filter((o) => !isRf(o)).length}</small></a><a href="#/vod/my/orders?t=refund" className={ot === "refund" ? "on" : ""}>환불 · 취소 내역 <small>{d.orders.filter(isRf).length}</small></a></div> : null}
      {list.length ? <><ul className="vd-orders">{list.map(row)}</ul><p className="vd-muted vd-my-note"><Icon n="alert" c="xs" /> 환불은 상품 종류마다 기준이 달라요. <button type="button" className="vd-link" data-v="refund" onClick={a.rules}>환불 규정</button></p></>
        : <Empty text={sub === "pending" ? "입금을 기다리는 주문이 없어요." : ot === "refund" ? "환불 · 취소한 주문이 없어요." : "아직 주문 내역이 없어요."} label="강의 둘러보기" href="#/vod/c/all" />}
      {modal}
    </>
  );
}
export const Pending = (pp) => <Orders {...pp} sub="pending" />;
export const OrderList = (pp) => <Orders {...pp} sub="orders" />;

/* ---------- 종이책 · 배송 조회 ---------- */
function ShipCard({ o, a }) {
  const X = VOD(), p = X.product(o.pid) || {}, s = o.ship || {}, st = X.shipStOf(o), bank = o.method === "bank" || o.method === "vbank", steps = (bank ? ["wait"] : []).concat(["ready", "prep", "ship", "done"]), idx = steps.indexOf(st), auto = st === "done" && !s.doneAt;
  const when = { wait: o.at, ready: o.paidAt, prep: s.prepAt, ship: s.shipAt, done: X.shipDoneAt(o) }, tu = X.trackUrl(o), chip = X.SHIP_ST[st] || X.SHIP_ST.ready, c = X.claimOf(o), b = st === "wait" ? X.bankOf(o) : null;
  const ic = (k, i) => (i < idx || (i === idx && k === "done") ? "check" : k === "ship" ? "truck" : k === "prep" ? "package" : k === "done" ? "home" : k === "wait" ? "coins" : "check");
  return (
    <article className={"vd-shc vd-shc-" + st} data-no={o.no}><div className="vd-shc-h"><a className="vd-shc-th" href={"#/vod/p/" + o.pid}>{p.id ? <RawOne html={X.thumbArt(p)} /> : null}</a><div><span className="vd-shc-chips"><span className={"vd-st vd-st-" + chip[1]}>{chip[0]}</span>{c ? <span className={"vd-st vd-st-" + (c.st === "req" || c.st === "pick" ? "wait" : "off")}>{X.claimTxt(c)}</span> : null}</span><small>{fmtFull(o.at) + " · " + o.no}</small><b>{o.title}</b><span>{(Number(o.qty) || 1) + "권 · " + won(o.amount) + (o.shipFee ? " (배송비 " + won(o.shipFee) + " 포함)" : " · 무료배송")}</span></div></div>
      {st === "cancel" ? (c ? null : <p className="vd-shc-note"><Icon n="alert" c="xs" /><span>{o.status === "refunded" ? "주문을 취소하고 " + won(o.refundAmount != null ? o.refundAmount : o.amount) + "을 돌려드렸어요." : o.canceledBy === "기한 지남" ? "입금 기한이 지나 주문이 취소됐어요." : "취소된 주문이에요."}</span></p>)
        : <ol className={"vd-shc-steps" + (steps.length === 5 ? " s5" : "")} aria-label="배송 단계">{steps.map((k, i) => <li key={k} className={i < idx ? "done" : i === idx ? "on" : ""}><i><Icon n={ic(k, i)} c="xs" /></i><b>{X.SHIP_ST[k][0]}</b><small>{when[k] && i <= idx ? X.fmtDT(when[k]) + (k === "done" && auto ? " (자동)" : "") : ""}</small></li>)}</ol>}
      {b ? <div className="vd-shc-bank"><p><small>{b.vbank ? "가상계좌" : "입금 계좌"}</small><b>{b.bank} <span className="vd-accno">{b.account}</span></b><button type="button" className="vd-copy" data-v="copy" data-t={String(b.account).replace(/[^0-9-]/g, "")} onClick={() => copy(String(b.account).replace(/[^0-9-]/g, ""))}>계좌 복사</button></p>{b.vbank ? null : <><p><small>예금주</small>{b.holder}</p><p><small>입금자명</small><b>{o.depositor || (o.buyer && o.buyer.name) || ""}</b></p></>}<p><small>입금할 금액</small><b>{won(o.amount)}</b></p><p><small>입금 기한</small>{X.fmtDue(X.dueOf(o))}까지</p><em>{b.vbank ? "입금하면 자동으로 확인돼요." : "입금자명 · 금액이 같으면 확인되는 대로 책을 준비해 보내 드려요."}</em></div> : null}
      {s.inv && st !== "wait" && st !== "cancel" ? <div className="vd-shc-inv"><Icon n="truck" c="sm" /><span><small>{(s.carrier || "택배") + (c && c.k === "exchange" && c.st === "done" ? " · 교환 상품" : "")}</small><b>{s.inv}</b></span><button type="button" className="vd-copy" data-v="copy" data-t={s.inv} onClick={() => copy(s.inv)}>복사</button>{tu ? <a className="vd-btn vd-btn-dark vd-btn-sm" href={tu} target="_blank" rel="noopener">배송 조회</a> : null}</div> : null}
      {c ? <RawOne html={X.shipClaimBox(o, c)} /> : null}
      <dl className="vd-shc-addr"><div><dt>받는 분</dt><dd>{(s.name || "") + " · " + (s.phone || "")}</dd></div><div><dt>주소</dt><dd>{(s.zip ? "(" + s.zip + ") " : "") + (s.addr1 || "") + " " + (s.addr2 || "")}</dd></div>{s.memo ? <div><dt>요청사항</dt><dd>{s.memo}</dd></div> : null}{o.cashRcpt && o.cashRcpt.no ? <div><dt>현금영수증</dt><dd>{(o.cashRcpt.type === "b" ? "지출증빙 " : "소득공제 ") + o.cashRcpt.no + (o.cashRcpt.done ? " · 발급 완료" : " · 입금 확인 후 발급")}</dd></div> : null}</dl>
      <div className="vd-shc-a">{st === "ready" || st === "wait" ? <button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="ship-edit" data-no={o.no} onClick={() => a.shipEdit(o)}><Icon n="mapPin" c="xs" />배송지 바꾸기</button> : null}
        {o.status === "pending" ? <button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="ord-cancel" data-no={o.no} onClick={(e) => a.cancel(o, e.currentTarget)}>주문 취소</button> : o.status === "paid" && o.amount > 0 ? <RfBtns o={o} a={a} /> : null}
        {st === "done" && p.id && !(X.V().reviews || []).some((r) => r.pid === p.id && r.mid === o.mid) ? <a className="vd-btn vd-btn-line vd-btn-sm" href={"#/vod/p/" + p.id + "#vd-s-reviews"}><Icon n="star" c="xs" />후기 남기기</a> : null}</div></article>
  );
}
export function Ship({ d, act }) {
  const X = VOD(), bo = d.orders.filter((o) => o.ship && o.status !== "failed"), f = storeRoute().qs.get("st") || "", { a, modal } = useOrderActs(act);
  const ok = (o) => !f || (f === "claim" ? !!X.claimOf(o) || X.shipStOf(o) === "cancel" : X.shipStOf(o) === f && !(X.claimOf(o) && ["req", "pick"].indexOf(X.claimOf(o).st) >= 0)), list = bo.filter(ok);
  return (
    <>
      <p className="vd-my-lead">주문한 <b>종이책</b>의 배송 상태를 봐요. 결제 후 {Number(X.shipSet().outDays) || 2}일 안에(주말 · 공휴일 빼고) 보내 드리고, 보내면 송장 번호가 여기에 올라와요. 받은 날부터 7일 안에 반품(단순 변심), 파손 · 파본 · 잘못 보낸 책은 30일 안에 반품 · 교환할 수 있어요.</p>
      {bo.length ? <><ShipStrip list={bo} on={f} />{list.length ? <div className="vd-shcs">{list.map((o) => <ShipCard key={o.no} o={o} a={a} />)}</div> : <Empty text="이 단계의 주문이 없어요." label="전체 보기" href="#/vod/my/ship" />}</> : <Empty text="주문한 종이책이 없어요." label="책 둘러보기" href="#/vod/c/all?tab=ebook" />}
      {modal}
    </>
  );
}
