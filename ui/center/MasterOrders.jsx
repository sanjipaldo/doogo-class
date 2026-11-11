"use client";
/* 마스터 DOOGO CLASS (4) — 주문: 환불 · 취소 관리
 * 예전 admin.js pageVodRefund 를 React 로 (Next.js 전환 6단계)
 *  · 규정 스위치 · 저장 · 환불 처리 · 송금 완료는 예전 admin.js 이벤트가 그대로 받아요
 *  · 규정 폼은 예전처럼 다시 그릴 때마다 저장된 값으로 (key=n) — 스위치는 예전 이벤트가 폼 안에서만 켜고 꺼요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";

const Store = ({ href, label }) => <Isl html={ADM().vdStoreBtn(href, label)} />;
const day = (t) => DBX().date.toStr(new Date(t));

export function MasterVodRefund({ n }) {
  const A = ADM(), DB = DBX(), X = A.VX(), won = A.won, v = A.VD(), r = X.rfSet(), ym = DB.date.todayStr().slice(0, 7), reqs = A.vdRefReqs().sort((a, b) => (b.refundReq.at || 0) - (a.refundReq.at || 0));
  const refd = v.orders.filter((o) => o.status === "refunded").sort((a, b) => (b.refundedAt || 0) - (a.refundedAt || 0)), mon = refd.filter((o) => o.refundedAt && A.vdYM(o.refundedAt) === ym);
  const paidMon = v.orders.filter((o) => (o.paidAt || 0) && A.vdYM(o.paidAt) === ym && o.amount > 0 && o.status !== "canceled"), elig = v.orders.filter((o) => X.instantOf(o).ok);
  const sumR = (l) => l.reduce((a, o) => a + (o.refundAmount != null ? o.refundAmount : o.amount), 0), nm = (o) => (A.vdMember(o.mid) || {}).name || "탈퇴 회원";
  const pgOn = !!(X.payServer && X.payServer()), wait = A.vdRefWait().sort((a, b) => (a.refundedAt || 0) - (b.refundedAt || 0)), inst = refd.filter((o) => A.rfKindOf(o) === "instant");
  const Num = ({ k, label, unit, min, max, help }) => <label className="rf-f"><span>{label}</span><span className="crm-unit"><input className="a-input a-sm" type="number" name={k} min={min} max={max} defaultValue={r[k]} /><em>{unit}</em></span>{help ? <small>{help}</small> : null}</label>;
  const Chk = ({ k, label, help }) => <label className="a-check rf-c"><input type="checkbox" name={k} defaultChecked={!!r[k]} /><span><b>{label}</b>{help ? <small>{help}</small> : null}</span></label>;
  const sentence = r.instant ? <>결제 후 <b>{r.days}일 이내</b> · {r.maxUsed ? <>강의를 <b>{r.maxUsed}개 이하</b>로 들었으면</> : <>강의를 <b>하나도 듣지 않았으면</b></>} 회원이 마이페이지에서 <b>바로 100% 취소</b>해요.</> : "회원 바로 취소를 꺼 두었어요. 모든 환불은 회원 ‘환불 요청’ → 마스터 처리로 해요.";
  const Who = ({ o }) => <td className="vda-nw"><a className="a-link" href={"#/center/master/vod-crm/" + o.mid}>{nm(o)}</a></td>;
  const Title = ({ o }) => <td>{o.title}<small className="a-memo num">{o.no}</small></td>;
  const H = "#/center/master/vod-refund";
  return <>
    <Head title="환불 · 취소 관리" sub="결제한 뒤 강의를 듣지 않았으면 회원이 직접 바로 취소(100% 환불)하고, 그 밖의 환불은 요청을 받아 처리해요. 규정 숫자를 바꾸면 스토어 상세 · 결제 · 자주 묻는 질문 문구가 함께 바뀌어요." right={<Store href="#/vod/my/orders" label="회원 화면 보기" />} />
    <div className="a-kpis crm-kpis crm-kpis-4">
      <Kpi label="환불 요청 대기" value={reqs.length + "건"} sub={reqs.length ? "아래에서 처리해 주세요" : "모두 처리했어요"} href={H} tone={reqs.length ? "warn" : ""} />
      <Kpi label="이번 달 환불" value={won(sumR(mon))} sub={mon.length + "건 · 결제 " + paidMon.length + "건 중 " + (paidMon.length ? Math.round(mon.length / paidMon.length * 100) : 0) + "%"} href={H} />
      <Kpi label="회원 바로 취소" value={inst.length + "건"} sub={"누적 " + won(sumR(inst))} href={H} tone="ok" />
      <Kpi label="지금 바로 취소 가능" value={elig.length + "건"} sub={r.instant ? "규정에 맞는 결제 · 회원이 언제든 취소 가능" : "바로 취소 꺼짐"} href={H} />
    </div>
    <section className="a-card crm-card"><div className="a-card-head"><h2>환불 규정</h2><span className="rf-now"><Icon n="shieldCheck" c="sm" /><span>{sentence}</span></span></div>
      <form key={n} id="vda-rf-form" className="rf-form" noValidate>
        <div className="rf-main"><button type="button" className={"a-switch" + (r.instant ? " on" : "")} data-action="vda-rf-inst" role="switch" aria-checked={String(!!r.instant)} aria-label="회원 바로 취소 켜기"><i /></button><input type="hidden" name="instant" defaultValue={r.instant ? "1" : ""} /><div><b>회원 바로 취소 (100% 환불)</b><small>켜 두면 규정에 맞는 결제는 마이페이지 › 내 강의실 · 주문 · 결제 내역에 환불 버튼이 보이고, 누르면 바로 환불돼요. 무통장 입금 결제는 회원이 적은 계좌로 송금해 주세요.</small></div></div>
        <div className="rf-grid"><div className="rf-col"><h3>VOD 강의</h3><Num k="days" label="결제 후" unit="일 이내" min={1} max={30} help="기본 7일 (전자상거래법 청약철회 기간)" /><Num k="maxUsed" label="들은 강의" unit="개 이하" min={0} max={10} help="0 = 하나도 안 들었을 때만" /><Chk k="matCounts" label="자료를 내려받으면 1강 들은 것으로" help="강의 자료 · 실습 파일을 받으면 쓴 것으로 봐요" /></div>
          <div className="rf-col"><h3>전자책 · LIVE · 오프라인</h3><Num k="ebookDays" label="전자책: 결제 후" unit="일 이내 · 내려받기 전" min={1} max={30} /><Num k="eventDays" label="LIVE · 오프라인: 강의" unit="일 전까지" min={0} max={14} /></div>
          <div className="rf-col"><h3>함께 처리</h3><Chk k="addons" label="함께 결제한 코칭권(안 쓴 것)도 같이 취소" /><Chk k="restore" label="결제에 쓴 쿠폰 · 포인트 돌려주기" /></div></div>
        <div className="rf-foot"><p className="a-muted p-small">규정 밖의 환불(강의를 들었거나 기간이 지난 경우)은 회원이 ‘환불 요청’을 남기면 아래 목록에서 들은 강의 수만큼 빼고 계산한 금액을 추천해 드려요.</p><Btn action="vda-rf-save" cls="a-btn-primary"><Icon n="check" c="sm" />규정 저장</Btn></div>
      </form></section>
    <section className="a-card crm-card"><div className="a-card-head"><h2>환불 요청 {reqs.length}건</h2><p className="a-muted">회원이 사유를 남긴 요청이에요. ‘환불 처리’에서 금액을 확인하고 완료해요.</p></div>
      {reqs.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>요청일</th><th>회원</th><th>클래스</th><th className="right">결제</th><th>사유</th><th>수강 현황</th><th className="right">처리</th></tr></thead><tbody>{reqs.map((o) => {
        const q = o.refundReq || {}, used = X.usedOf(o.mid, o.pid), dd = Math.max(1, Math.ceil((Date.now() - (o.paidAt || o.at)) / 864e5));
        return <tr key={o.id}><td className="vda-nw">{day(q.at || o.at)}</td><Who o={o} /><Title o={o} /><td className="right num">{won(o.amount)}</td><td>{typeof q === "object" ? q.why + (q.text ? " · " + q.text : "") : "강사 취소 · 환불 필요"}</td><td className="vda-nw">결제 {dd}일째<small className="a-memo">들은 강의 {used}개</small></td><td className="right"><Btn action="vda-refund" cls="a-btn-primary a-btn-sm" data-id={o.id}>환불 처리</Btn></td></tr>; })}</tbody></table></div>
        : <Empty ic="check">기다리는 환불 요청이 없어요.</Empty>}</section>
    {wait.length ? <section className="a-card crm-card rf-wait"><div className="a-card-head"><h2>계좌 송금 대기 {wait.length}건</h2><p className="a-muted">무통장 입금 주문의 환불은 아래 계좌로 직접 송금하고 ‘송금 완료’를 눌러 주세요.</p></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>환불 처리일</th><th>회원</th><th>클래스</th><th className="right">송금할 금액</th><th>환불 계좌</th><th className="right"></th></tr></thead><tbody>
      {wait.map((o) => <tr key={o.id}><td className="vda-nw">{day(o.refundedAt)}</td><td className="vda-nw">{nm(o)}</td><Title o={o} /><td className="right num"><b>{won(o.refundPay.amount || A.vdRefAmt(o))}</b></td><td>{A.vdAcctTxt(o.refundPay)}</td><td className="right"><Btn action="vda-rfsent" cls="a-btn-primary a-btn-sm" data-id={o.id}>송금 완료</Btn></td></tr>)}</tbody></table></div></section> : null}
    <section className="a-card crm-card"><div className="a-card-head"><h2>환불 · 취소 내역</h2><p className="a-muted">최근 50건 · 회원 바로 취소와 마스터 환불을 모두 보여요</p></div>
      {refd.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>환불일</th><th>회원</th><th>클래스</th><th className="right">결제 · 환불</th><th>방식</th><th>결제 취소 · 송금</th><th>강사 정산 반영</th><th>사유 · 처리</th></tr></thead><tbody>{refd.slice(0, 50).map((o) => { const k = A.RF_KIND[A.rfKindOf(o)], st0 = A.vdRfSettle(o); return (
        <tr key={o.id}><td className="vda-nw">{o.refundedAt ? day(o.refundedAt) : "-"}</td><Who o={o} /><Title o={o} /><td className="right num">{won(o.amount)}<small className="a-memo"><b>{won(o.refundAmount != null ? o.refundAmount : o.amount)} 환불</b></small></td><td><Pill cls={k[1]}>{k[0]}</Pill></td><td><Isl html={A.rfPg(o)} /></td><td><small>{st0.t}</small><small className="a-memo">{A.vdKeyName(A.vdKey(o)) + " 정산 - " + A.won(st0.ins)}</small></td><td>{o.refundWhy || "-"}<small className="a-memo">{o.refundBy || ""}</small></td></tr>); })}</tbody></table></div>
        : <Empty ic="refresh">아직 환불 내역이 없어요.</Empty>}</section>
    <section className="a-card crm-card rf-pg"><div className="a-card-head"><h2>결제(PG) 연결</h2>{pgOn ? <Pill cls="ok">토스페이먼츠 연결됨</Pill> : <Pill cls="warn">시안 · 연결 전</Pill>}</div>
      <p>{pgOn ? "회원 바로 취소 · 마스터 환불을 누르면 토스페이먼츠로 결제가 자동 취소돼요 (가상계좌는 적은 환불 계좌로 · 영업일 2일). 부분 환불은 그 금액만큼만 취소해요." : "지금은 시안이라 환불 · 취소 기록만 남고 실제 결제는 취소되지 않아요. 정식 서버에 토스페이먼츠 키를 넣으면 같은 버튼이 결제를 자동으로 취소해요."}</p>
      {pgOn && X.payOpts ? <p className="a-muted p-small">결제 화면에 열린 결제수단: <b>{X.payOpts().filter((z) => !z[3]).map((z) => z[2]).join(" · ")}</b><br />토스 결제수단은 Vercel 환경 변수 TOSS_METHODS 로 바꿔요 (예: card,transfer,vbank,naver,kakao — 네이버페이 · 카카오페이는 토스페이먼츠에서 승인된 뒤에 넣어요).</p> : null}</section>
  </>;
}

/* ---------------- 종이책 주문 · 배송 #/center/master/vod-ship (예전 pageVodShip · boCard · boClaimBox · boSend) ----------------
 *  · 탭 · 고르기 · 입금 확인 · 발송 · 송장 · 취소 · 반품 · 교환 · 엑셀은 예전 admin.js 이벤트가 그대로 받아요
 *  · 고르기 칸은 고른 상태가 바뀌면 새로 그려요 (key) — ‘모두 선택’도 예전처럼 바로 보여요 */
const CarSel = ({ o, cur, attr }) => {
  const X = ADM().VX(), c0 = cur || (o.ship && o.ship.carrier) || X.shipSet().carrier, at = attr || { "data-ship-car": o.id };
  return <select key={c0} className="a-input a-sm" {...at} aria-label="택배사" defaultValue={c0}>{X.CARRIERS.map((c) => <option key={c[0]}>{c[0]}</option>)}</select>;
};
function BoSend({ o, label, act }) {
  const A = ADM(), v0 = A.ui.vsEdit === o.id ? o.ship.inv || "" : "";
  return <div className="bo-send"><CarSel o={o} /><input key={v0} className="a-input a-sm num" data-ship-inv={o.id} defaultValue={v0} placeholder="송장 번호" inputMode="numeric" maxLength={24} aria-label="송장 번호" /><Btn action={act || "vda-ship-send"} cls="a-btn-primary a-btn-sm" data-id={o.id}><Icon n="truck" c="sm" />{label}</Btn></div>;
}
function BoClaim({ o, c }) {
  const A = ADM(), X = A.VX(), won = A.won, fee = X.claimFee(o, c), st = c.st, k = c.k, tone = st === "req" ? "req" : st === "pick" ? "pick" : st === "no" ? "no" : "end";
  const acct = c.acct ? A.vdAcctTxt(c.acct) : "", ra = X.shipSet().returnAddr, id = { "data-id": o.id };
  const acts = st === "req" ? <>{k === "cancel" ? <Btn action="bo-cl-refund" cls="a-btn-primary a-btn-sm" {...id}><Icon n="coins" c="sm" />취소 승인 · 환불</Btn> : <><Btn action="bo-cl-ok" cls="a-btn-primary a-btn-sm" {...id}><Icon n="check" c="sm" />{k === "exchange" ? "교환 승인 · 수거 요청" : "반품 승인 · 수거 요청"}</Btn>{k === "return" ? <Btn action="bo-cl-refund" cls="a-btn-ghost a-btn-sm" {...id}>수거 없이 바로 환불</Btn> : null}</>}<Btn action="bo-cl-no" cls="a-btn-ghost a-btn-sm" {...id}>반려</Btn></>
    : st === "pick" ? (k === "exchange" ? <BoSend o={o} label="교환 상품 보내기" act="bo-cl-xsend" /> : <Btn action="bo-cl-refund" cls="a-btn-primary a-btn-sm" {...id}><Icon n="coins" c="sm" />책이 도착했어요 · 환불</Btn>) : null;
  return <div className={"bo-claim bo-claim-" + tone}><p className="bo-claim-h"><Icon n={st === "req" ? "alert" : st === "pick" ? "truck" : st === "no" ? "x" : "check"} c="xs" /><b>{X.claimTxt(c)}</b><small>{A.boWhen(c.at)}</small></p>
    <p className="bo-claim-t">사유 · {(c.why || "기타") + (c.text ? " — " + c.text : "")}</p>
    {k !== "exchange" && (st === "req" || st === "pick") ? <p className="bo-claim-t">환불 예정 <b>{won(Math.max(0, o.amount - fee))}</b>{(fee ? " (결제 " + won(o.amount) + " − 단순 변심 왕복 배송비 " + won(fee) + ")" : " (전액)") + (acct ? " · 환불 계좌 " + acct : "")}</p> : null}
    {st === "pick" ? <><p className="bo-claim-t">{c.rinv ? <>회수 송장 {c.rcar || ""} <b className="num">{c.rinv}</b> · </> : null}택배사에 반품(회수) 접수를 하면 기사님이 회원 주소에서 책을 가져와요{ra ? " → " + ra : ""}.</p>
      <div className="bo-send bo-rinv"><CarSel o={o} cur={c.rcar} attr={{ "data-cl-car": o.id }} /><input key={c.rinv || ""} className="a-input a-sm num" data-cl-inv={o.id} defaultValue={c.rinv || ""} placeholder="회수 송장 번호 (선택)" maxLength={24} aria-label="회수 송장 번호" /><Btn action="bo-cl-rinv" cls="a-btn-ghost a-btn-sm" {...id}>회수 송장 저장</Btn></div></> : null}
    {st === "no" ? <p className="bo-claim-t">반려 사유 · {c.note || ""}</p> : null}
    {st === "done" && k === "exchange" ? <p className="bo-claim-t">{A.boWhen(c.xAt) + " 교환 상품을 보냈어요 (아래 송장)" + (c.oinv ? " · 처음 송장 " + c.oinv : "")}</p> : null}
    {st === "refunded" ? <p className="bo-claim-t">{won(o.refundAmount != null ? o.refundAmount : o.amount) + " 환불 · " + A.boWhen(o.refundedAt)}</p> : null}
    {acts ? <div className="bo-claim-a">{acts}</div> : null}</div>;
}
function Trk({ o, tu }) {
  const s = o.ship;
  return <>{" · " + (s.carrier || "") + " "}<b className="num">{s.inv}</b>{tu ? <> <a className="a-link" href={tu} target="_blank" rel="noopener">배송 조회</a></> : null}</>;
}
function BoCard({ o, tab, pick }) {
  const A = ADM(), X = A.VX(), won = A.won, s = o.ship, st = X.shipStOf(o), lab = st === "cancel" && o.status === "refunded" ? ["환불", "mute"] : A.BO_ST[st] || A.BO_ST.ready, c = X.claimOf(o), tu = X.trackUrl(o), edit = A.ui.vsEdit === o.id, sh = X.shipSet();
  const nm = (A.vdMember(o.mid) || {}).name || (o.buyer && o.buyer.name) || "회원", hold = !!c && c.st === "req", late = st === "wait" && Date.now() > A.vdDue(o), id = { "data-id": o.id }, on = pick.has(o.id);
  const sel = A.boPickable(tab) && st === tab ? <label className="a-check bo-pick"><input key={on ? "1" : "0"} type="checkbox" data-action="vda-ship-pick" data-id={o.id} defaultChecked={on} /><span className="sr-only">선택</span></label> : null;
  const act = st === "wait" ? <>{o.method === "vbank" ? <Pill cls="info">가상계좌 · 입금하면 자동 확인</Pill> : <Btn action="vda-paid" cls="a-btn-primary a-btn-sm" {...id}><Icon n="check" c="sm" />입금 확인</Btn>}<Btn action="vda-cancel" cls="a-btn-ghost a-btn-sm" {...id}>주문 취소</Btn></>
    : st === "ready" ? (hold ? null : <><Btn action="vda-ship-prep" cls="a-btn-ghost a-btn-sm" {...id}><Icon n="package" c="sm" />배송 준비로</Btn><BoSend o={o} label="발송 처리" /></>)
    : st === "prep" ? (hold ? null : <BoSend o={o} label="발송 처리" />)
    : st === "ship" ? (edit ? <><BoSend o={o} label="송장 저장" /><Btn action="vda-ship-edit" cls="a-btn-ghost a-btn-sm">닫기</Btn></>
      : <><span className="bo-trk"><Icon n="truck" c="sm" />{(s.carrier || "") + " "}<b className="num">{s.inv || ""}</b>{tu ? <> <a className="a-link" href={tu} target="_blank" rel="noopener">배송 조회</a></> : null}<small>{day(s.shipAt) + " 보냄 · " + day(s.shipAt + (Number(sh.autoDays) || 3) * 864e5) + " 자동 완료"}</small></span><Btn action="vda-ship-edit" cls="a-btn-ghost a-btn-sm" {...id}>송장 수정</Btn><Btn action="vda-ship-done" cls="a-btn-ghost a-btn-sm" {...id}><Icon n="check" c="sm" />배송 완료</Btn></>)
    : st === "done" ? <span className="bo-trk"><Icon n="check" c="sm" />{day(X.shipDoneAt(o)) + " 배송 완료" + (s.doneAt ? "" : " (자동)")}{s.inv ? <Trk o={o} tu={tu} /> : null}</span>
    : c ? (o.refundPay && o.refundPay.st === "wait" ? <span className="bo-trk"><Icon n="coins" c="sm" />계좌 송금 대기 · <a className="a-link" href="#/center/master/vod-refund">환불 · 취소 관리에서 송금 완료</a></span> : null)
    : <span className="bo-trk"><Icon n="x" c="sm" />{o.status === "refunded" ? won(o.refundAmount != null ? o.refundAmount : o.amount) + " 환불 · " + day(o.refundedAt || o.at) + (o.refundPay && o.refundPay.st === "wait" ? " · 계좌 송금 대기" : "") : (o.canceledBy === "기한 지남" ? "입금 기한이 지나 취소" : "취소된 주문") + " · " + day(o.canceledAt || o.at)}</span>;
  const cash = A.boCash(o);
  return <article className={"bo-card bo-" + st + (on ? " on" : "")}>{sel}
    <div className="bo-b"><div className="bo-meta"><Pill cls={lab[1]}>{lab[0]}</Pill>{c ? <Pill cls={c.st === "req" ? "bad" : c.st === "pick" ? "warn" : "mute"}>{X.claimTxt(c)}</Pill> : null}{late ? <Pill cls="warn">입금 기한 지남</Pill> : null}<small>{A.boWhen(st === "wait" ? o.at : o.paidAt || o.at)} · <a className="a-link num" href="#" data-action="vda-od" data-id={o.id}>{o.no}</a></small></div>
      <p className="bo-t"><b>{o.title}</b><em>{Number(o.qty) || 1}권</em></p>
      <p className="bo-sum">{won(o.amount) + (o.shipFee ? " · 배송비 " + won(o.shipFee) + " 포함" : " · 무료배송") + " · " + A.boPayTxt(o) + " · 주문 " + nm}</p>
      {st === "wait" && o.method !== "vbank" ? <p className="bo-dep"><Icon n="coins" c="xs" /><span>입금자명 <b>{A.vdDep(o)}</b> · <b>{won(A.vdGrpAmt(o))}</b> · {A.boWhen(A.vdDue(o))}까지</span></p> : null}
      <dl className="bo-addr"><div><dt>받는 분</dt><dd><b>{s.name || ""}</b> · {s.phone || ""}</dd></div><div><dt>주소</dt><dd>{(s.zip ? "(" + s.zip + ") " : "") + (s.addr1 || "") + " " + (s.addr2 || "")} <button type="button" className="a-link bo-copy" data-action="vda-ship-copy" data-id={o.id}>복사</button></dd></div>{s.memo ? <div><dt>요청</dt><dd>{s.memo}</dd></div> : null}{cash ? <div><dt>현금영수증</dt><dd>{cash}{o.cashRcpt.done ? null : <> <button type="button" className="a-link" data-action="bo-cash-done" data-id={o.id}>발급 완료로 표시</button></>}</dd></div> : null}</dl>
      {c ? <BoClaim o={o} c={c} /> : null}
      {act ? <div className="bo-act">{act}</div> : null}</div></article>;
}
export function MasterVodShip({ n: rn }) {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won, sh = X.shipSet(), all = A.vdShipAll(), tab = A.boTab(), pick = ui.vsPick || (ui.vsPick = new Set()), today = DB.date.todayStr(), ym = today.slice(0, 7);
  const by = (k) => all.filter((o) => A.boIn(k, o)), cntOf = (k) => (k === "claim" ? all.filter(A.boClaimOn).length : by(k).length);
  const asc = ["wait", "ready", "prep"].indexOf(tab) >= 0, list = by(tab).sort((a, b) => (tab === "claim" ? (A.boClaimOn(b) ? 1 : 0) - (A.boClaimOn(a) ? 1 : 0) : 0) || (asc ? 1 : -1) * ((a.paidAt || a.at || 0) - (b.paidAt || b.at || 0)));
  const wait = by("wait"), late = wait.filter((o) => Date.now() > A.vdDue(o)), sendN = by("ready").length + by("prep").length, sentToday = all.filter((o) => o.ship.shipAt && day(o.ship.shipAt) === today).length, doneMon = all.filter((o) => X.shipStOf(o) === "done" && X.shipDoneAt(o) && A.vdYM(X.shipDoneAt(o)) === ym).length;
  const picked = list.filter((o) => pick.has(o.id)), none = picked.length ? undefined : true, cl = cntOf("claim"), auto = Number(sh.autoDays) || 3;
  const selAll = A.boPickable(tab) && list.length ? <Btn action="vda-ship-all" cls="a-btn-ghost a-btn-sm">{picked.length && picked.length === list.length ? "선택 풀기" : "모두 선택"}</Btn> : null;
  const bulk = tab === "wait" ? <><Btn action="bo-bpaid" cls="a-btn-ghost a-btn-sm" disabled={none}><Icon n="check" c="sm" />선택 입금 확인</Btn>{late.length ? <Btn action="vda-cancel-exp" cls="a-btn-ghost a-btn-sm"><Icon n="x" c="sm" />기한 지난 {late.length}건 취소</Btn> : null}</>
    : tab === "ready" ? <Btn action="vda-ship-bprep" cls="a-btn-ghost a-btn-sm" disabled={none}><Icon n="package" c="sm" />선택 배송 준비로</Btn>
    : tab === "ship" ? <Btn action="bo-bdone" cls="a-btn-ghost a-btn-sm" disabled={none}><Icon n="check" c="sm" />선택 배송 완료</Btn> : null;
  const nTxt = picked.length ? " (" + picked.length + "건)" : "", H = "#/center/master/vod-ship";
  return <>
    <Head title="종이책 주문 · 배송" sub={"입금 대기 → 신규 주문 → 배송 준비 → 배송 중 → 배송 완료 순서로 처리해요. 송장을 넣으면 회원 마이페이지에 배송 조회가 열리고, 보낸 날부터 " + auto + "일이 지나면 자동으로 배송 완료가 돼요."} right={<Store href="#/vod/my/ship" label="회원 화면 보기" />} />
    <div className="a-kpis crm-kpis crm-kpis-4">
      <Kpi label="입금 대기" value={wait.length + "건"} sub={wait.length ? won(wait.reduce((a, o) => a + A.vdGrpAmt(o), 0)) + (late.length ? " · 기한 지남 " + late.length + "건" : " · 통장 입금을 확인해 주세요") : "기다리는 입금이 없어요"} href={H} tone={wait.length ? "warn" : ""} />
      <Kpi label="보낼 주문" value={sendN + "건"} sub={sendN ? "결제 후 " + (Number(sh.outDays) || 2) + "일 안에 보내요 · 오늘 보냄 " + sentToday + "건" : "모두 보냈어요 · 오늘 보냄 " + sentToday + "건"} href={H} tone={sendN ? "warn" : "ok"} />
      <Kpi label="배송 중" value={by("ship").length + "건"} sub={auto + "일 뒤 자동 완료 · 이번 달 완료 " + doneMon + "건"} href={H} />
      <Kpi label="취소 · 반품 · 교환" value={cl + "건"} sub={cl ? "처리할 요청이 있어요" : "처리할 요청 없음"} href={H} tone={cl ? "warn" : ""} />
    </div>
    <section className="a-card crm-card bo-box"><div className="bo-tabs" role="tablist">{A.BO_TABS.flatMap((x, i) => [i === 5 ? <span key="gap" className="bo-tab-gap" aria-hidden="true"></span> : null,
        <button key={x[0]} type="button" role="tab" aria-selected={String(x[0] === tab)} className={(x[0] === tab ? "on" : "") + (x[0] === "claim" && cl ? " hot" : "")} data-action="vda-ship-tab" data-k={x[0]}>{i < 5 ? <i>{i + 1}</i> : null}<span>{x[1]}</span><small>{cntOf(x[0])}</small></button>])}</div>
      <div className="bo-tools"><div className="bo-tools-l">{selAll}{bulk}</div>
        <div className="bo-tools-r"><Btn action="bo-xl-orders" cls="a-btn-ghost a-btn-sm" disabled={list.length ? undefined : true}><Icon n="download" c="sm" />주문 엑셀{nTxt}</Btn>
          {tab === "ready" || tab === "prep" ? <Btn action="vda-ship-csv" cls="a-btn-ghost a-btn-sm" disabled={list.length ? undefined : true}><Icon n="download" c="sm" />택배 접수용 엑셀{nTxt}</Btn> : null}
          <Btn action="vda-ship-bulk" cls="a-btn-outline a-btn-sm" disabled={sendN ? undefined : true}><Icon n="upload" c="sm" />송장 엑셀 올리기</Btn></div></div>
      {tab === "wait" ? <p className="bo-hint"><Icon n="alert" c="xs" /><span>통장에 들어온 <b>입금자명 · 금액</b>을 확인하고 <b>입금 확인</b>을 눌러요. 확인하면 ‘신규 주문’으로 넘어가요.{X.bankAuto && X.bankAuto() ? " 자동 입금 확인(페이액션)이 켜져 있어서 이름 · 금액이 맞으면 저절로 넘어가요." : " 자동 입금 확인(페이액션)을 연결하면 24시간 저절로 넘어가요."}</span></p>
        : tab === "ready" ? <p className="bo-hint"><Icon n="alert" c="xs" /><span><b>택배 접수용 엑셀</b>을 내려받아 택배사에 올리고, 받은 송장 파일을 <b>송장 엑셀 올리기</b>로 넣으면 한 번에 ‘배송 중’이 돼요. 한 건씩 보낼 때는 카드에 송장을 적어요.</span></p> : null}
      {list.length ? <div className="bo-list">{list.map((o) => <BoCard key={o.id} o={o} tab={tab} pick={pick} />)}</div>
        : <div className="bo-empty"><Empty ic="truck">{tab === "wait" ? "입금을 기다리는 주문이 없어요." : tab === "ready" ? "새로 들어온 주문이 없어요." : tab === "claim" ? "취소 · 반품 · 교환 요청이 없어요." : "이 상태의 주문이 없어요."}</Empty></div>}</section>
    <section className="a-card crm-card"><div className="a-card-head"><h2>배송 · 반품 설정</h2><p className="a-muted">상세 페이지 · 결제 화면 · 교환 · 반품 규정 문구에 함께 쓰여요.</p></div>
      <form key={rn} id="vda-ship-form" className="a-form vs-set" noValidate><div className="a-form-row">
          <div className="a-field"><label htmlFor="vs-auto">자동 배송 완료</label><span className="crm-unit"><input className="a-input" id="vs-auto" name="autoDays" type="number" min="1" max="14" defaultValue={sh.autoDays} /><em>일 뒤 (송장 넣은 날부터)</em></span></div>
          <div className="a-field"><label htmlFor="vs-out">출고 기간</label><span className="crm-unit"><input className="a-input" id="vs-out" name="outDays" type="number" min="1" max="14" defaultValue={sh.outDays} /><em>일 안 (주말 · 공휴일 빼고)</em></span></div></div>
        <div className="a-form-row"><div className="a-field"><label htmlFor="vs-car">기본 택배사</label><select className="a-input" id="vs-car" name="carrier" defaultValue={sh.carrier}>{X.CARRIERS.map((c) => <option key={c[0]}>{c[0]}</option>)}</select></div>
          <div className="a-field"><label htmlFor="vs-rf">반품 왕복 배송비</label><span className="crm-unit"><input className="a-input" id="vs-rf" name="returnFee" type="number" min="0" step="500" defaultValue={sh.returnFee} /><em>원 (단순 변심 반품 · 환불금에서 빼요)</em></span></div></div>
        <div className="a-field"><label htmlFor="vs-ra">반품 받을 주소</label><input className="a-input" id="vs-ra" name="returnAddr" maxLength={120} defaultValue={sh.returnAddr || ""} placeholder="예) 세종특별자치시 갈매로 353 5층 두고홀딩스 (비우면 안내 문구에서 빠져요)" /></div>
        <div className="vs-set-foot"><Btn action="vda-ship-save" cls="a-btn-primary"><Icon n="check" c="sm" />설정 저장</Btn></div></form></section>
  </>;
}

/* ---------------- 주문 · 결제 #/center/master/vod (예전 pageMasterVod · vdBankCard · vdCarePage · vdOrders) ----------------
 *  · ?tab= · ?of= 주소와 옮긴 탭(매출 리포트 · 정산 · 비율)은 예전처럼 주소를 바꾸고 그 화면을 그려요 */
function BankCard() {
  const A = ADM(), X = A.VX(), won = A.won, v = A.VD(), ui = A.ui, pend = v.orders.filter((o) => o.status === "pending" && !o.grp && o.method !== "vbank").sort((a, b) => a.at - b.at), auto = !!(X.bankAuto && X.bankAuto()), srv = A.vdSrv();
  A.vdBankLoad();
  const log = ui.vdBankLog || [], miss = log.filter((e) => e.st === "none" || e.st === "many" || e.st === "fail"), okN = log.filter((e) => e.st === "ok").length;
  const WHY = { none: "같은 이름 · 금액 주문 없음", many: "같은 이름 · 금액 주문이 여럿", fail: "확인 실패" };
  return <section className="a-card vda-bank"><div className="a-card-head"><h2>무통장 입금 확인</h2>{srv ? (auto ? <Pill cls="ok">자동 입금 확인 켜짐 · 24시간</Pill> : <Pill cls="mute">자동 입금 확인 연결 전 · 직접 확인</Pill>) : null}
      <span className="a-muted">입금자명 · 금액을 통장과 맞춰 보고 ‘입금 확인’을 눌러 주세요. 누르는 순간 회원이 바로 수강해요.{auto && okN ? " 최근 자동 확인 " + okN + "건" : ""}</span></div>
    {pend.length ? <div className="a-table-wrap"><table className="a-table vda-bank-t"><thead><tr><th>주문</th><th>입금자명</th><th className="right">입금할 금액</th><th>클래스</th><th>입금 기한</th><th className="right">관리</th></tr></thead><tbody>{pend.map((o) => {
      const late = Date.now() > A.vdDue(o), mn = (A.vdMember(o.mid) || {}).name, opt = X.optTxt(o);
      return <tr key={o.id}><td className="vda-nw">{A.vdWhen(o.at)}<small className="a-memo num">{o.no}</small></td><td className="vda-nw"><b>{A.vdDep(o)}</b>{mn && mn !== A.vdDep(o) ? <small className="a-memo">회원 {mn}</small> : null}</td><td className="right num"><b>{won(A.vdGrpAmt(o))}</b></td><td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}</td><td className="vda-nw">{late ? <Pill cls="warn">기한 지남</Pill> : A.vdWhen(A.vdDue(o)) + "까지"}</td>
        <td className="right vda-nw"><Btn action="vda-paid" cls="a-btn-primary a-btn-sm" data-id={o.id}><Icon n="check" c="sm" />입금 확인</Btn><Btn action="vda-cancel" cls="a-btn-ghost a-btn-sm" data-id={o.id}>취소</Btn></td></tr>; })}</tbody></table></div>
      : <p className="a-muted vda-bank-empty"><Icon n="check" c="sm" /> 입금을 기다리는 주문이 없어요.</p>}
    {miss.length ? <><h3 className="vda-bank-h">자동으로 못 맞춘 입금 <small>입금자명이 다르거나 금액이 다를 때 여기 남아요 · 맞는 주문을 골라 연결하면 바로 수강이 열려요</small></h3><div className="a-table-wrap"><table className="a-table"><thead><tr><th>입금 시각</th><th>입금자명</th><th className="right">금액</th><th>사유</th><th>주문 연결</th></tr></thead><tbody>
      {miss.map((e) => <tr key={e.id}><td className="vda-nw">{A.vdWhen(e.at)}</td><td><b>{e.name}</b>{e.bank ? <small className="a-memo">{e.bank}</small> : null}</td><td className="right num">{won(e.amount)}</td><td><Pill cls="warn">{WHY[e.st] || e.st}</Pill></td>
        <td className="vda-nw"><select className="a-input a-sm" data-blink={e.id} defaultValue=""><option value="">주문 고르기</option>{pend.map((o) => <option key={o.no} value={o.no}>{A.vdDep(o) + " · " + won(A.vdGrpAmt(o)) + " · " + o.no}</option>)}</select> <Btn action="vda-blink" cls="a-btn-ghost a-btn-sm" data-id={e.id}>연결 · 입금 확인</Btn></td></tr>)}</tbody></table></div></> : null}
  </section>;
}
function CarePage() {
  const A = ADM(), X = A.VX(), c = A.vdCare(), hrs = (at) => Math.floor((Date.now() - at) / 36e5);
  return <><section className="a-card"><div className="a-card-head"><h2>답변 대기 1:1 코칭 질문</h2><span className="a-muted">48시간이 넘으면 강사님께 알려 주세요 · 답변은 강사센터에서</span></div>
      {c.co.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>남긴 때</th><th>강사</th><th>수강생</th><th>질문</th><th>기다린 시간</th></tr></thead><tbody>{c.co.map((r, i) => <tr key={i}><td>{day(r.x.q.at)}</td><td>{r.ins.displayName}</td><td>{A.vdMask(r.x.s.name)}</td><td>{r.x.q.title}</td><td><Pill cls={hrs(r.x.q.at) >= 48 ? "warn" : "mute"}>{hrs(r.x.q.at) + "시간"}</Pill></td></tr>)}</tbody></table></div> : <Empty ic="message">답변을 기다리는 코칭 질문이 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>TEA TIME 일정 확정 대기</h2><span className="a-muted">강사님이 희망 날짜를 보고 확정해요</span></div>
      {c.tea.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>신청일</th><th>클래스</th><th>회원</th><th>희망 날짜</th><th>방식</th></tr></thead><tbody>{c.tea.map((o) => <tr key={o.id}><td>{day(o.at)}</td><td>{o.title}</td><td>{(A.vdMember(o.mid) || {}).name || "-"}</td><td>{[o.tea.d1, o.tea.d2].filter(Boolean).join(" · ") + " " + (o.tea.slot || "")}</td><td>{X.TEA_MODE[o.tea.mode] || o.tea.mode || ""}</td></tr>)}</tbody></table></div> : <Empty ic="calendar">확정을 기다리는 TEA TIME이 없어요.</Empty>}</section></>;
}
function Orders() {
  const A = ADM(), DB = DBX(), X = A.VX(), won = A.won, ui = A.ui, v = A.VD(), f = ui.vdOf || "all", q = (ui.vdOq || "").trim().toLowerCase(), om = ui.vdOm || "";
  const isF = (o, k) => k === "all" || (k === "refreq" ? o.status === "paid" && !!o.refundReq : k === "cash" ? !!(A.vdCash(o) && A.vdCash(o).todo) : o.status === k), cnt = (k) => v.orders.filter((o) => isF(o, k)).length, ex = A.vdExpired();
  const pms = A.VD_PAY_KEYS.filter((x) => v.orders.some((o) => A.vdPayKey(o) === x[0])), M = (o) => A.vdMember(o.mid) || {};
  const tabs = [["all", "전체"], ["pending", "입금 대기"], ["paid", "결제 완료"], ["refreq", "환불 요청"]].concat(v.orders.some((o) => A.vdCash(o)) ? [["cash", "현금영수증"]] : []).concat([["refunded", "환불"], ["canceled", "취소"]]);
  const list = v.orders.filter((o) => isF(o, f) && (!om || A.vdPayKey(o) === om) && (!q || (o.no + " " + o.title + " " + (M(o).name || "") + " " + (M(o).email || "")).toLowerCase().indexOf(q) >= 0)).sort((a, b) => b.at - a.at);
  const id = (o) => ({ "data-id": o.id });
  const Manage = ({ o }) => <>{o.status === "pending" && Date.now() > A.vdDue(o) ? <><Pill cls="warn">입금 기한 지남</Pill> </> : null}
    {o.status === "pending" && o.method === "vbank" ? <><Pill cls="info">가상계좌 입금 대기</Pill><Btn action="vda-cancel" cls="a-btn-ghost a-btn-sm" {...id(o)}>주문 취소</Btn></>
      : o.status === "pending" ? <><Btn action="vda-paid" cls="a-btn-primary a-btn-sm" {...id(o)}>입금 확인</Btn><Btn action="vda-cancel" cls="a-btn-ghost a-btn-sm" {...id(o)}>주문 취소</Btn></>
      : o.status === "paid" && o.amount > 0 ? <Btn action="vda-refund" cls={o.refundReq ? "a-btn-primary a-btn-sm" : "a-btn-ghost a-btn-sm"} {...id(o)}>{o.refundReq ? "환불 처리" : "환불"}</Btn>
      : o.status === "paid" ? <Btn action="vda-cancel0" cls="a-btn-ghost a-btn-sm" {...id(o)}>신청 취소</Btn> : null}</>;
  return <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (f === t[0] ? " on" : "") + ((t[0] === "refreq" || t[0] === "cash") && cnt(t[0]) ? " a-tab-warn" : "")} data-action="vda-of" data-k={t[0]}>{t[1]} <span className="num">{cnt(t[0])}</span></button>)}</div>
      {ex.length ? <Btn action="vda-cancel-exp" cls="a-btn-ghost a-btn-sm"><Icon n="x" c="sm" />입금 기한 지난 주문 {ex.length}건 한 번에 취소</Btn> : null}
      <div className="a-filters"><select key={om} className="a-input a-sm" id="vda-om" aria-label="결제수단" defaultValue={om}><option value="">모든 결제수단</option>{pms.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
        <div className="a-search"><Icon n="search" c="sm" /><input className="a-input a-sm" id="vda-oq" type="search" placeholder="주문번호 · 회원 · 클래스" defaultValue={ui.vdOq || ""} /></div></div></div>
    {list.length ? <div className="a-table-wrap"><table className="a-table vda-table"><thead><tr><th>주문일</th><th>주문번호</th><th>회원</th><th>클래스</th><th>결제</th><th className="right">금액</th><th>상태</th><th className="right">관리</th></tr></thead><tbody>{list.map((o) => {
      const m = M(o), st = A.VD_OST[o.status] || A.VD_OST.paid, opt = X.optTxt(o);
      return <tr key={o.id}><td className="vda-nw">{DB.date.fmtStamp ? DB.date.fmtStamp(o.at) : new Date(o.at).toLocaleString("ko-KR")}</td><td className="vda-nw"><button type="button" className="vda-ono num" data-action="vda-od" data-id={o.id} title="결제 상세">{o.no}</button></td><td className="vda-nw"><b>{m.name || "탈퇴 회원"}</b><small className="a-memo">{m.email || ""}</small></td>
        <td>{o.title}{opt ? <small className="a-memo">{opt + (o.grp ? " · " + o.grp + " 함께 결제" : "")}</small> : null}<Isl html={A.vdRsTag(o)} /><Isl html={A.vdRbTag(o)} />{o.refundReq && o.status === "paid" ? <small className="a-memo a-memo-red">{A.vdRqTxt(o)}</small> : null}{o.canceledBy === "member" && o.status === "canceled" ? <small className="a-memo">회원이 직접 취소</small> : null}</td>
        <td className="vda-nw">{A.VD_PAY[o.method] || o.method}{o.refundPay && o.refundPay.st === "wait" ? <small className="a-memo a-memo-red">환불 송금 대기</small> : null}{A.vdCash(o) ? <small className={"a-memo" + (A.vdCash(o).todo ? " a-memo-red" : "")}>{"현금영수증 " + A.vdCash(o).txt}</small> : null}</td>
        <td className="right num"><b>{won(o.amount)}</b>{o.couponOff || o.pointOff ? <small className="a-memo">{(o.couponOff ? "쿠폰 -" + won(o.couponOff) : "") + (o.couponOff && o.pointOff ? " · " : "") + (o.pointOff ? "포인트 -" + won(o.pointOff) : "")}</small> : null}</td>
        <td><Pill cls={st[1]}>{st[0]}</Pill></td><td className="right"><Manage o={o} /></td></tr>; })}</tbody></table></div>
      : <Empty ic="inbox">조건에 맞는 주문이 없어요.</Empty>}</section>;
}
export function MasterVod({ n, moved: MV }) {
  const A = ADM(), DB = DBX(), won = A.won, ui = A.ui, R = window.ROUTE;
  const qs = R.hash.split("?")[1] || "", qt = qs.match(/(?:^|&)tab=(\w+)/), qo = qs.match(/(?:^|&)of=(\w+)/); if (qt || qo) { if (qt) ui.vdTab = qt[1]; if (qo) { ui.vdTab = "orders"; ui.vdOf = qo[1]; } R.replace("#/center/master/vod"); }
  const moved = { months: "vod-sales", settle: "vod-settle", rates: "vod-rates" }[ui.vdTab];
  if (moved && MV && MV[moved]) { ui.vdTab = "orders"; R.replace("#/center/master/" + moved); const P = MV[moved]; return <P n={n} />; }
  const v = A.VD(), tab = ui.vdTab || "orders", ym = DB.date.todayStr().slice(0, 7);
  const mon = A.vdPaidIn(ym), all = v.orders.filter(A.vdLive), pend = A.vdPending(), newM = v.members.filter((m) => A.vdYM(m.createdAt) === ym).length;
  const care = A.vdCare(), careN = care.co.length + care.tea.length;
  const tabs = [["orders", "주문", v.orders.length], ["care", "코칭 · TEA TIME", careN || null]];
  return <>
    <Head title="주문 · 결제" sub="DOOGO CLASS 주문의 결제 수단 · 결제 상태 · 무통장 입금 확인 · 환불을 관리해요. 주문번호를 누르면 결제 상세(영수증 · PG 거래 번호)가 보여요." right={<><Store /><Btn action="vda-csv" cls="a-btn-ghost"><Icon n="download" c="sm" />주문 CSV</Btn></>} />
    <div className="a-kpis">
      <Kpi label="이번 달 매출" value={won(A.vdSum(mon))} sub={mon.length + "건 결제 · 매출 리포트 보기"} href="#/center/master/vod-sales" tone="ok" />
      <Kpi label="누적 매출" value={won(A.vdSum(all))} sub={"결제 완료 " + all.length + "건"} href="#/center/master/vod" />
      <Kpi label="입금 대기" value={pend + "건"} sub={pend ? "무통장 입금을 확인해 주세요" : "모두 처리했어요"} href="#/center/master/vod" tone={pend ? "warn" : ""} />
      <Kpi label="VOD 회원" value={v.members.length + "명"} sub={"이번 달 가입 " + newM + "명"} href="#/center/master/vod-crm" />
    </div>
    <div className="a-tabs a-btabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (tab === t[0] ? " on" : "")} data-action="vda-tab" data-k={t[0]}>{t[1]}{t[2] != null ? <> <span className="num">{t[2]}</span></> : null}</button>)}</div>
    {tab === "care" ? <CarePage /> : <><BankCard /><Orders /></>}
  </>;
}
