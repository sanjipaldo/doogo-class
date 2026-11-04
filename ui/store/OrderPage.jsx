"use client";
/* 주문 확인 (결제 · 신청 · 입금 대기 완료 화면 #/vod/order/<번호>) — 예전 vod.js pageOrder(no) 를 React 로 (Next.js 전환 4-4)
 * 휴대폰 결제창에서 돌아올 때(?pay= · ?code=) 결제 확인은 처음 할 일(VOD.reactBoot → pgReturn)이 예전처럼 해요 */
import { useEffect } from "react";
import Shell from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { VOD, DB, won, hash, storeRoute, toast } from "../lib/legacy.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const fmtFull = (t) => DB().date.fmtFull(DB().date.toStr(new Date(t)));
const copy = (tx) => { (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => toast("계좌번호를 복사했어요. " + tx), () => toast("계좌번호: " + tx)); };

function Done({ o, m }) {
  const X = VOD(), b = X.bankOf(o), pend = o.status === "pending", p = X.product(o.pid), t = X.typeOf(p), k = X.kindOf(o), sibs = X.V().orders.filter((x) => x.grp === o.no), total = o.amount + sibs.reduce((a, x) => a + (Number(x.amount) || 0), 0), ptAll = (o.pointOff || 0) + sibs.reduce((a, x) => a + (Number(x.pointOff) || 0), 0);
  const go = !p ? "" : k === "coach" ? ["dg", "message", "1:1 코칭 질문하러 가기"] : k === "tea" ? ["#/vod/my/addons", "calendar", "신청 내역 보기"] : k === "extend" ? ["#/vod/learn/" + p.id, "play", "다시 이어서 듣기"] : t === "book" ? ["#/vod/my/ship", "truck", "배송 조회하기"] : t === "ebook" ? ["#/vod/my/ebooks", "book", "전자책 내려받기"] : X.isEvent(p) ? ["#/vod/learn/" + p.id, "calendar", "입장 안내 보기"] : ["#/vod/learn/" + p.id, "play", "강의 시작하기"];
  const h = pend ? "주문이 접수됐어요" : k === "extend" ? "연장이 완료됐어요" : k === "coach" ? "1:1 코칭권이 준비됐어요" : k === "tea" ? "TEA TIME 신청이 접수됐어요" : o.amount === 0 && !o.couponOff && !o.pointOff ? (p && X.isFreeEv(p) ? "무료 LIVE 신청이 완료됐어요" : "수강신청이 완료됐어요") : "결제가 완료됐어요";
  const sub = pend && o.ship ? "입금이 확인되면 책을 준비해서 보내 드려요. 아래 " + (o.method === "vbank" ? "가상계좌" : "계좌") + "로 입금해 주세요." : !pend && o.ship ? "결제 후 " + (Number(X.shipSet().outDays) || 2) + "일 안에(주말 · 공휴일 빼고) 책을 보내 드려요. 보내면 송장 번호를 마이페이지 › 종이책 · 배송 조회에 올려 드려요."
    : pend ? (o.method === "vbank" ? "아래 가상계좌로 입금하면 자동으로 확인돼 바로 이용할 수 있어요." : X.bankAuto() ? "아래 계좌로 입금하면 24시간 자동으로 확인돼 바로 이용할 수 있어요." : "아래 계좌로 입금하면 확인되는 대로 바로 이용할 수 있어요.")
    : k === "extend" ? fmtFull(X.accessEnd(o.mid, o.pid)) + "까지 다시 들을 수 있어요. 진도 · 노트는 그대로예요." : k === "coach" ? "두잉고 강의실 › 1:1 코칭 질문에서 바로 질문할 수 있어요." : k === "tea" ? "강사님이 희망 날짜를 보고 일정을 확정하면 마이페이지와 문자로 알려 드려요." : t === "ebook" ? "마이페이지 › 전자책에서 바로 내려받을 수 있어요." : X.isEvent(p) ? "마이페이지 › LIVE · 오프라인에서 입장 안내를 확인할 수 있어요." : "내 강의실에서 바로 시작할 수 있어요." + (sibs.some((x) => X.kindOf(x) === "coach") ? " 1:1 코칭권도 함께 준비됐어요." : "");
  const dgClick = (e) => { const bt = e.target.closest && e.target.closest("[data-v='dg']"); if (bt) { e.preventDefault(); X.enterDg(bt.dataset.p, "", bt.dataset.to); } };
  const acc = String(b.account || "").replace(/[^0-9-]/g, "");
  return (
    <div className="vd-wrap vd-done"><span className={"vd-done-ic" + (pend ? " pend" : "")}><Icon n={pend ? "clock" : "check"} /></span><h1>{h}</h1><p>{sub}</p>
      <dl className="vd-done-dl"><div><dt>주문 번호</dt><dd>{o.no}</dd></div><div><dt>상품</dt><dd>{o.title}{X.optTxt(o) ? <><br /><small>{X.optTxt(o)}</small></> : null}</dd></div>
        {sibs.map((x) => <div key={x.no}><dt>함께 산 상품</dt><dd>{X.optTxt(x)} <small>{won(x.amount)}</small></dd></div>)}
        {o.couponOff ? <div><dt>쿠폰 할인</dt><dd>-{won(o.couponOff)} <small>{o.couponName || ""}</small></dd></div> : null}
        {o.ship ? <div><dt>배송지</dt><dd>{(o.ship.name || "") + " · " + (o.ship.phone || "")}<br /><small>{(o.ship.zip ? "(" + o.ship.zip + ") " : "") + ((o.ship.addr1 || "") + " " + (o.ship.addr2 || ""))}</small></dd></div> : null}
        {ptAll ? <div><dt>포인트</dt><dd>-{won(ptAll)}</dd></div> : null}
        <div><dt>결제 금액</dt><dd><b>{won(total)}</b></dd></div>
        {pend ? <><div className="vd-done-bank"><dt>입금 계좌</dt><dd><b>{b.bank} <span className="vd-accno">{b.account}</span></b> <button type="button" className="vd-copy" data-v="copy" data-t={acc} onClick={() => copy(acc)}>계좌 복사</button><br /><small>{b.vbank ? "가상계좌 · 이 주문 전용 계좌예요" : "예금주 " + b.holder}</small></dd></div>
          {b.vbank ? null : <div><dt>입금자명</dt><dd><b>{o.depositor || (o.buyer && o.buyer.name) || m.name}</b><br /><small>이 이름 · 이 금액으로 입금해 주세요</small></dd></div>}
          <div><dt>입금 기한</dt><dd>{X.fmtDue(X.dueOf(o))}까지</dd></div></> : null}</dl>
      {!pend && p && X.dgOpen(p) ? <RawOne html={X.dgCard(p, "vd-dg-done")} onClick={dgClick} /> : null}
      <div className="vd-done-btns">{!pend && p && X.isEvent(p) && p.kakao ? <a className="vd-btn vd-btn-kakao" href={p.kakao} target="_blank" rel="noopener"><Icon n="message" c="sm" />카카오톡 오픈채팅방 입장하기</a> : null}
        {pend ? <a className="vd-btn vd-btn-o" href="#/vod/my/pending">결제 대기 보기</a> : go && go[0] === "dg" ? <button type="button" className="vd-btn vd-btn-p" data-v="dg" data-p={p.id} data-to="#/qna/requests/new" onClick={() => X.enterDg(p.id, "", "#/qna/requests/new")}><Icon n={go[1]} c="sm" />{go[2]}</button> : go ? <a className="vd-btn vd-btn-p" href={go[0]}><Icon n={go[1]} c="sm" />{go[2]}</a> : null}
        <a className="vd-btn vd-btn-o" href="#/vod">다른 클래스 둘러보기</a></div></div>
  );
}

export default function OrderPage({ n, moved }) {
  const X = VOD(), no = storeRoute().path[1], o = X.V().orders.find((x) => x.no === no), m = X.me();
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved]);
  return (
    <Shell nav="" tab="" n={n}>
      {!o || !m || o.mid !== m.id ? <div className="vd-wrap"><div className="vd-empty"><Icon n="alert" /><b>주문을 찾을 수 없어요</b><a className="vd-btn vd-btn-o" href="#/vod/my/orders">주문 · 결제 내역</a></div></div> : <Done o={o} m={m} />}
    </Shell>
  );
}
