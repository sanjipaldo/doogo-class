"use client";
/* 주문 · 결제 (#/vod/checkout/<클래스>?item=coach|tea · ?plan= · ?coach=1 · ?qty=) — 예전 vod.js pageCheckout(id) 를 React 로 (Next.js 전환 4-4)
 * 돈이 걸린 화면이라 계산 · 결제는 하나도 새로 만들지 않았어요:
 *  · 결제 금액 다시 계산 · 표시(coPaint) · 수강권 고르기(planSync) · 폼 안 바꾸기(formChange) · 결제(doPay → 포트원 결제창 · 무통장 · 0원 · 서버가 금액 다시 계산)는 예전 함수 그대로
 *  · 수강권 줄 · 배송지 · 무통장 안내 상자는 아직 예전 HTML (Raw) */
import { useEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import Modal from "../lib/Modal.jsx";
import { VOD, DB, won, today, hash, storeRoute, toast } from "../lib/legacy.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const CO_KINDS = ["extend", "coach", "tea"];
const fmtFull = (d) => DB().date.fmtFull(d);

/** 이 주소로 결제 화면을 그려도 되는지 — 안 되면 옮겨 갈 곳 { to, msg } (예전 pageCheckout 맨 위와 같은 순서) */
function gate(p, m, k, id, X) {
  const back = (msg) => ({ to: "#/vod/p/" + id, msg });
  if (!p) return { to: "#/vod/p/" + id };
  if (!m) return { to: "#/vod/login?next=" + encodeURIComponent(hash()) };
  if (!X.insShown(p)) return { to: "#/vod", msg: "지금은 판매하지 않는 클래스예요." };
  if (k === "course") {
    if (p.status !== "on" || X.eventPast(p)) return back();
    if (X.isBook(p) && X.stockLeft(p) === 0) return back("품절됐어요. 재입고되면 다시 열려요.");
    if (X.owns(m.id, p.id) && !X.isBook(p)) return { to: "#/vod/learn/" + p.id };
    if (X.seatsLeft(p) === 0) return back("자리가 모두 찼어요.");
  } else if (k === "extend") return { to: "#/vod/checkout/" + p.id }; // 1년 연장권은 재수강 할인으로 바뀌었어요
  else if (k === "coach" && !(X.coachOf(p) && X.owns(m.id, p.id))) return back("이 강의를 수강 중인 회원만 1:1 코칭권을 살 수 있어요.");
  else if (k === "tea" && !(X.teaOf(p) && X.owns(m.id, p.id))) return back("이 강의를 수강 중인 회원만 TEA TIME을 신청할 수 있어요.");
  return null;
}

function Form({ p, m, k, qs, onRules }) {
  const X = VOD(), ref = useRef(null);
  const ps = k === "course" ? X.plansFor(p, m.id) : [], s = X.psel(p.id), sel = ps.length ? ps.find((y) => y.d === Number(qs.get("plan") || s.d)) || ps.find((y) => y.d === 365) || ps[0] : null, c = X.coachOf(p), t = X.teaOf(p), x = X.extendOf(p), rbC = sel ? sel.rb || 0 : 0;
  const coachOn = k === "course" && !!c && !!sel && (qs.get("coach") === "1" || (!qs.get("plan") && !!s.coach));
  const pr = k === "course" ? (sel ? sel.sale : X.priceOf(p)) : k === "extend" ? x.sale : k === "coach" ? c.price : t.price;
  const list = k === "course" ? (sel ? sel.list : Number(p.price) || 0) : pr, b = X.bankInfo(), cps = k === "course" && pr > 0 && !rbC ? X.couponsFor(m.id, p, pr) : [], pts = Number(m.points) || 0, all = X.myCoupons(m.id).filter((y) => y.st === "ok").length;
  const bk = X.isBook(p), sf = X.shipFeeOf(p), qmax = Math.max(1, Math.min(X.BOOK_MAX, X.stockLeft(p) == null ? X.BOOK_MAX : X.stockLeft(p)));
  const e0 = X.accessEnd(m.id, p.id), newEnd = DB().date.toStr(new Date(Math.max(Date.now(), e0 === Infinity ? Date.now() : e0) + 365 * 864e5)), left = c ? X.coachLeft(m.id, p.iid) : 0;
  const h1 = k === "extend" ? "1년 연장권 결제" : k === "coach" ? "1:1 코칭권 결제" : k === "tea" ? "TEA TIME 신청 · 결제" : bk ? "종이책 주문 · 결제" : pr === 0 ? "무료 수강신청" : rbC ? "재수강 · 주문 · 결제" : "주문 · 결제";
  const kindNote = k === "extend" ? <><Icon n="refresh" c="xs" /><span><b>1년 연장권 · 365일</b> 결제하면 <b>{fmtFull(newEnd)}</b>까지 다시 들을 수 있어요. 진도 · 노트는 그대로 이어져요.</span></>
    : k === "coach" ? <><Icon n="message" c="xs" /><span><b>1:1 코칭권 {c.n}회 · {c.days}일</b> ({fmtFull(DB().date.addDays(today(), c.days))}까지) · 두잉고 강의실 ‘1:1 코칭 질문’에서 써요.{left ? " 지금 남은 코칭 " + left + "회" : ""}</span></>
    : k === "tea" ? <><RawOne html={X.icx("coffee", "xs")} /><span><b>강사님과 TEA TIME {t.min}분</b> · {X.TEA_MODE[t.mode]} · 강사님이 일정을 확정하면 알려 드려요.</span></>
    : rbC ? <><Icon n="refresh" c="xs" /><span><b>재수강 {rbC}% 할인</b> 수강 기간이 끝난 강의라 할인가로 다시 들어요. 진도 · 노트는 그대로 이어져요.</span></> : null;
  const agree1 = bk ? "수량 · 배송지" : k === "course" ? (X.isEvent(p) ? "일정 · 장소" : <>수강 기간 ({sel ? <><span data-co-plan="">{sel.label}</span> 수강권</> : X.accessTxt(p)})</>) : k === "extend" ? "연장 기간 (365일 · " + fmtFull(newEnd) + "까지)" : k === "coach" ? "코칭권 횟수 (" + c.n + "회) · 사용 기간 (" + c.days + "일)" : "TEA TIME은 강사님 확정 후 일정이 정해지는 것";
  const rf = X.rfSet();
  const agree2 = bk ? "보내기 전에는 바로 취소되고, 받은 날부터 7일 안에 반품할 수 있어요 (단순 변심은 왕복 배송비 구매자 부담)." : k === "coach" ? "질문을 남기기 전 7일 이내는 전액, 쓴 뒤에는 남은 횟수만큼 환불돼요." : k === "tea" ? "확정 전 · 확정 3일 전까지 전액, 1~2일 전 50% 환불되고 당일 · 불참은 환불되지 않아요." : X.typeOf(p) === "ebook" ? "전자책을 내려받으면 청약철회가 제한돼요." : X.isEvent(p) ? "강의 " + rf.eventDays + "일 전까지는 전액, 1~2일 전은 50% 환불되고 당일 · 불참은 환불되지 않아요." : "결제 후 " + rf.days + "일 이내 · 강의를 듣기 전이면 마이페이지에서 바로 100% 취소돼요. 강의를 재생하거나 자료를 내려받으면 그 부분은 청약철회가 제한될 수 있어요.";
  const opts = pr > 0 ? X.payOpts() : [], first = (opts.find((y) => !y[3]) || [])[0], tot0 = pr + (coachOn ? c.price : 0) + (bk ? sf : 0);
  // 그린 뒤: 결제 금액 다시 계산 · 표시 (예전 render 의 coPaint) — 다시 그릴 때마다
  useEffect(() => { if (ref.current) X.coPaint(ref.current); });
  // 안쪽 예전 버튼들: 수량 · 포인트 전액 · 주소 찾기 · 계좌 복사 · 환불 규정
  const click = (e) => {
    const tg = e.target.closest && e.target.closest("[data-v]"); if (!tg || !ref.current.contains(tg)) return;
    const v = tg.dataset.v, f = ref.current;
    if (v === "qty") { const q = f.qty; if (q) { q.value = String(Math.max(1, Math.min(Number(q.max) || X.BOOK_MAX, (Number(q.value) || 1) + Number(tg.dataset.d || 0)))); X.coPaint(f); } return; }
    if (v === "pt-all") { const r = X.coCalc(f); if (r) { f.points.value = Math.floor(r.maxPt / 1) || 0; X.coPaint(f); } return; }
    if (v === "addr-find") { e.preventDefault(); X.addrFind(tg); return; }
    if (v === "copy") { const tx = tg.dataset.t || ""; (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => toast("계좌번호를 복사했어요. " + tx), () => toast("계좌번호: " + tx)); return; }
    if (v === "refund") { e.preventDefault(); onRules(); }
  };
  // 폼 안 바꾸기(수강권 · 코칭권 · 쿠폰 · 포인트 · 결제수단 · 현금영수증 · 동의) — 브라우저 change 를 직접 들어요.
  //  React 의 onChange 는 React 가 그린 칸에만 와서, 예전 HTML 로 넣은 수강권 줄 · 무통장 상자 안의 칸은 놓쳐요 (4-4 시험에서 찾음)
  useEffect(() => { const f = ref.current; if (!f) return undefined; const fn = (e) => X.formChange(e); f.addEventListener("change", fn); return () => f.removeEventListener("change", fn); }, [X]);
  return (
    <div className="vd-wrap vd-co"><h1 className="vd-h1">{h1}</h1>
      <form ref={ref} className="vd-co-grid" data-vd-pay={p.id} data-kind={k} noValidate onSubmit={(e) => { e.preventDefault(); X.doPay(e.currentTarget); }} onClick={click}><div className="vd-co-main">
        <section className="vd-co-box"><h2>주문 상품</h2><div className="vd-co-item"><Raw className="vd-co-th" html={X.thumbArt(p)} /><div><small>{X.TYPE[X.typeOf(p)][0] + " · " + p.creator}</small><b>{p.title}</b><span>{X.metaOf(p).join(" · ")}</span></div></div>
          {kindNote ? <p className="vd-co-kind">{kindNote}</p> : null}
          {X.isEvent(p) ? <p className="vd-co-ev"><Icon n="calendar" c="xs" />{X.fmtEvent(p.eventAt, true) + (X.typeOf(p) === "offline" ? " · " + (p.place || "") : " · Zoom LIVE")}</p> : null}
          {bk ? <div className="vd-co-qty"><span>수량 <small>{"한 번에 " + qmax + "권까지" + (X.stockLeft(p) != null ? " · 남은 재고 " + X.stockLeft(p) + "권" : "")}</small></span><div className="vd-qty"><button type="button" data-v="qty" data-d="-1" aria-label="한 권 빼기"><Icon n="minus" c="xs" /></button><input name="qty" type="number" min="1" max={qmax} defaultValue={Math.min(qmax, Math.max(1, Number(qs.get("qty")) || 1))} inputMode="numeric" aria-label="수량" /><button type="button" data-v="qty" data-d="1" aria-label="한 권 더하기"><Icon n="plus" c="xs" /></button></div></div> : null}</section>
        {bk ? <RawOne html={X.shipBox(m)} /> : null}
        {sel ? <section className="vd-co-box"><h2>수강권 선택</h2><Raw as="div" className="vd-plans vd-co-plans" html={ps.map((y) => X.planRow(y, "plan", y.d === sel.d, "", fmtFull(DB().date.addDays(today(), y.d)) + "까지")).join("")} />
          {c ? <label className={"vd-addon" + (coachOn ? " on" : "")}><input type="checkbox" name="coach" value="1" defaultChecked={coachOn} /><span className="vd-addon-t"><b>1:1 코칭권 {c.n}회 함께 사기</b><small>{c.days}일 동안 강사에게 직접 질문 · 1회 {won(c.per)} · 쿠폰 적용 제외</small></span><strong>+{won(c.price)}</strong></label> : null}</section> : null}
        {k === "tea" ? <section className="vd-co-box"><h2>TEA TIME 신청 정보</h2><div className="vd-co-f"><label>희망 날짜 1<input type="date" name="d1" min={DB().date.addDays(today(), 2)} /></label><label>희망 날짜 2 <small>(선택)</small><input type="date" name="d2" min={DB().date.addDays(today(), 2)} /></label>
            <label>희망 시간대<select name="slot" defaultValue="오후 (14~17시)"><option>오전 (10~12시)</option><option>오후 (14~17시)</option><option>저녁 (19~21시)</option></select></label><label>진행 방식<span className="vd-fixed"><Icon n="video" c="xs" /> Zoom 온라인 화상 · 링크는 강사님이 일정 확정 때 보내 드려요</span><input type="hidden" name="mode" value="online" /></label>
            <label className="w">이야기하고 싶은 주제<textarea name="topic" rows={4} maxLength={500} placeholder="예: 지금 스마트스토어 월 매출이 300만 원인데, 해외 소싱 상품을 추가해도 될지 상담받고 싶어요." /></label></div><p className="vd-muted vd-co-hint">강사님이 희망 날짜를 보고 일정을 확정하면 마이페이지 › 1:1 코칭 · TEA TIME과 문자로 알려 드려요. 확정 전에는 언제든 전액 환불돼요.</p></section> : null}
        <section className="vd-co-box"><h2>주문자 정보</h2><div className="vd-co-f"><label>이름<input name="name" defaultValue={m.name} maxLength={20} /></label><label>휴대폰<input name="phone" defaultValue={m.phone || ""} maxLength={20} /></label><label className="w">이메일<input name="email" defaultValue={m.email} readOnly /></label></div></section>
        {pr > 0 ? <><section className="vd-co-box"><h2>{bk ? "포인트" : "할인 · 쿠폰"}</h2><div className="vd-co-f">{k === "course" && !bk && !rbC ? <label className="w">쿠폰 <small>사용 가능 {cps.length}장 · 보유 {all}장</small><select name="coupon" key={cps.map((y) => y.x.id).join(",") || "none"} defaultValue={cps.length ? cps[0].x.id : undefined}><option value="">쿠폰 쓰지 않기</option>{cps.map((y) => <option key={y.x.id} value={y.x.id}>{y.c.name + " (-" + won(y.off) + ")"}</option>)}</select></label> : null}
            <label className="w">포인트 <small>보유 {pts.toLocaleString()}P · 1P = 1원</small><span className="vd-co-pt"><input name="points" type="number" min="0" max={pts} step="100" inputMode="numeric" defaultValue="0" disabled={!pts} /><button type="button" className="vd-btn vd-btn-o vd-btn-sm" data-v="pt-all" disabled={!pts}>전액 사용</button></span></label></div>
            {bk ? <p className="vd-muted vd-co-hint">도서정가제에 따라 종이책에는 쿠폰을 쓸 수 없어요. 포인트는 쓸 수 있어요.</p> : k !== "course" ? <p className="vd-muted vd-co-hint">1:1 코칭권 · TEA TIME에는 쿠폰을 쓸 수 없어요. 포인트는 쓸 수 있어요.</p> : rbC ? <p className="vd-muted vd-co-hint">재수강 할인은 쿠폰과 함께 쓸 수 없어요. 포인트는 쓸 수 있어요.</p> : !cps.length ? <p className="vd-muted vd-co-hint">이 상품에 쓸 수 있는 쿠폰이 없어요. <a className="vd-link" href="#/vod/my/coupons">쿠폰 등록하기</a></p> : coachOn || c ? <p className="vd-muted vd-co-hint">쿠폰은 수강권 금액에만 적용돼요.</p> : null}</section>
          <section className="vd-co-box" data-co-pay=""><h2>결제 수단</h2><div className="vd-pay-opts">{opts.map((z) => <label key={z[0]} className={"vd-pay-opt" + (z[3] ? " off" : "")}><input type="radio" name="method" value={z[0]} disabled={!!z[3]} defaultChecked={z[0] === first} /><span><Icon n={z[1]} c="sm" />{z[2]}{z[3] ? <em>{z[3]}</em> : null}</span></label>)}</div>
            {opts.every((z) => z[3]) ? <p className="vd-co-bank vd-co-wait"><Icon n="alert" c="xs" /><span>결제 준비 중이에요. 곧 카드 · 간편결제 · 무통장 입금으로 결제할 수 있어요.</span></p> : null}<RawOne html={X.bankBox(b, m, bk ? "book" : k)} /></section></> : null}
        <div className="vd-co-agrees"><label className="vd-agree vd-agree-all"><input type="checkbox" data-agree-all="" /><span><b>아래 내용을 모두 확인했고 동의해요</b></span></label>
          <label className="vd-agree"><input type="checkbox" name="agree" data-agree-req="" /><span>(필수) 주문 상품 · {agree1} · 결제 금액을 확인했어요</span></label>
          <label className="vd-agree"><input type="checkbox" name="agree2" data-agree-req="" /><span>(필수) <button type="button" className="vd-link" data-v="refund">환불 규정</button>을 확인했어요. {agree2}<small>{bk ? "전자상거래법 제17조 · 받은 날부터 7일 이내 청약철회 (책을 훼손하면 제한돼요)" : "전자상거래법 제17조 제2항 제5호 · 디지털 콘텐츠 제공이 시작되면 청약철회가 제한될 수 있어요"}</small></span></label>
          <label className="vd-agree"><input type="checkbox" name="agree3" data-agree-req="" /><span>{bk ? <>(필수) 배송을 위해 받는 분 이름 · 연락처 · 주소를 택배사에 제공하는 데 동의해요<small>배송이 끝나면 택배사는 법령에 따른 기간 뒤 파기해요</small></> : <>(필수) 콘텐츠 이용 안내에 동의해요<small>{X.isEvent(p) ? "강의 녹화 · 촬영 · 녹음 금지 · 일정 안내 문자 받기" : k === "tea" || k === "coach" ? "코칭 · TEA TIME 내용 녹음 · 녹화 · 무단 공개 금지 · 안내 문자 받기" : "계정 공유 금지 · 기기 4대까지 · 녹화 · 캡처 · 배포 · 판매 금지 (저작권법)"}</small></>}</span></label></div>
      </div><aside className="vd-co-side"><div className="vd-co-sum"><h2>결제 금액</h2><dl><div><dt>{bk ? <>상품 금액 (<span data-co-qty="">1</span>권)</> : k === "course" ? (sel ? <>수강권 (<span data-co-plan="">{sel.label}</span>)</> : "상품 금액") : X.KIND[k]}</dt><dd data-co-list="">{won(list)}</dd></div>
        <div data-co-disc-row="" hidden={!(list > pr)}><dt>할인</dt><dd className="minus" data-co-disc="">-{won(list - pr)}</dd></div>
        {k === "course" && c && sel ? <div data-co-coach-row="" hidden={!coachOn}><dt>1:1 코칭권 {c.n}회</dt><dd data-co-coach="">+{won(c.price)}</dd></div> : null}
        {bk ? <div><dt>배송비</dt><dd data-co-ship="">{sf ? "+" + won(sf) : "무료"}</dd></div> : null}
        {pr > 0 ? <>{k === "course" && !bk ? <div><dt>쿠폰 할인</dt><dd className="minus" data-co-cp="">-0원</dd></div> : null}<div><dt>포인트 사용</dt><dd className="minus" data-co-pt="">-0원</dd></div></> : null}
        <div className="tot"><dt>최종 결제 금액</dt><dd data-co-tot="">{won(tot0)}</dd></div></dl>
        <p className="vd-err" id="vd-pay-err" role="alert" /><button className="vd-btn vd-btn-p vd-btn-xl" type="submit" data-co-btn="">{pr === 0 ? (X.isEvent(p) ? "무료 LIVE 신청하기" : "무료로 수강 시작") : won(tot0) + " 결제하기"}</button></div></aside></form></div>
  );
}

export default function CheckoutPage({ n, moved }) {
  const X = VOD(), r = storeRoute(), id = r.path[1], qs = r.qs, p = X.product(id), m = X.me(), k = CO_KINDS.indexOf(qs.get("item")) >= 0 ? qs.get("item") : "course";
  const g = gate(p, m, k, id, X), [rules, setRules] = useState(false);
  useEffect(() => { if (g) { if (g.msg) toast(g.msg, "warn"); window.ROUTE.redirect(g.to); } }, [g && g.to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (g) return;
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved, !!g]); // eslint-disable-line react-hooks/exhaustive-deps
  if (g) return null;
  return (
    <Shell nav="" tab="" n={n}>
      <Form key={id + ":" + k} p={p} m={m} k={k} qs={qs} onRules={() => setRules(true)} />
      {rules ? <Modal title="환불 규정" onClose={() => setRules(false)}><Raw as="div" className="vd-modal-b" html={X.refundHtml()} /></Modal> : null}
    </Shell>
  );
}
