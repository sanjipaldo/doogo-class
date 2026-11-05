"use client";
/* 강사센터 VOD(DOOGO CLASS) 화면 (1) — VOD 수강생 · VOD 강의 연결 · VOD 판매 내역
 * 예전 admin.js pageVodStudents · pageVodLink · pageInsVod · ordRow 를 React 로 (Next.js 전환 6단계)
 *  · 탭 · 이용 멈춤 · 두잉고 열기/닫기 · 강의실 꾸미기 · 내용 가져오기(폼 vp-copy-form)는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

const Store = (p) => <Isl html={ADM().vdStoreBtn(p && p.href, p && p.label)} />;

export function VodStudents() {
  const A = ADM(), DB = DBX(), iid = A.IID(), X = A.VX(), all = X.buyersOf(iid), f = A.ui.vsF || "all";
  const left = (b) => { const ds = b.live.map((x) => X.daysLeft(b.m.id, x.p.id)); return ds.length ? Math.max.apply(null, ds) : -1; }, soon = (b) => b.active && left(b) !== Infinity && left(b) <= 30;
  const F = [["all", "전체", all.length], ["joined", "두잉고 입장", all.filter((b) => b.active && b.st).length], ["notyet", "아직 안 들어옴", all.filter((b) => b.active && !b.st).length], ["soon", "30일 안에 끝남", all.filter(soon).length], ["ended", "기간 끝 · 환불", all.filter((b) => !b.active).length]];
  const list = all.filter((b) => (f === "joined" ? b.active && b.st : f === "notyet" ? b.active && !b.st : f === "soon" ? soon(b) : f === "ended" ? !b.active : true));
  const leftTxt = (b) => { if (!b.active) return <span className="a-muted">-</span>; const d = left(b); return d === Infinity ? "평생" : d <= 30 ? <Pill cls="warn">{d + "일 남음"}</Pill> : d + "일 남음"; };
  return <>
    <Head title="VOD 수강생" sub="DOOGO CLASS에서 내 VOD를 산 수강생이에요. 진도는 강의장 기록을 그대로 읽어 와요. 아직 안 들어온 수강생은 DOOGO CLASS 마이페이지에서 ‘이어 보기’를 누르거나, 두잉고 로그인(이름 + 휴대폰 뒷자리)으로 강의실에 들어올 수 있어요." right={<Store />} />
    <div className="a-tabs">{F.map((x) => <button key={x[0]} type="button" className={"a-tab" + (f === x[0] ? " on" : "")} data-action="vs-f" data-k={x[0]}>{x[1]} <b>{x[2]}</b></button>)}</div>
    <section className="a-card">{list.length ? <div className="a-table-wrap"><table className="a-table a-vs-table"><thead><tr><th>수강생</th><th>구매한 VOD</th><th>결제일</th><th>수강 기간</th><th>진도율</th><th>최근 공부</th><th>두잉고</th><th className="right" /></tr></thead><tbody>
      {list.map((b, i) => { const paused = b.st && b.st.status === "withdrawn"; return (
        <tr key={i} className={b.active ? "" : "a-dim"}><td><b>{A.vbName(b)}</b>{b.st ? <small className="a-memo">뒷자리 {b.st.phone4}</small> : null}</td>
          <td>{b.paid.length ? b.paid.map((x, k) => <span key={k} className="a-vs-cl">{x.p.title}</span>) : <span className="a-muted">환불</span>}</td>
          <td className="num" data-label="결제일">{DB.date.toStr(new Date(b.paidAt))}</td><td data-label="수강 기간">{leftTxt(b)}</td><td data-label="진도율"><div className="a-bar"><span style={{ width: b.pct + "%" }} /></div><small className="num">{b.pct}%</small></td>
          <td className="num">{b.lastStudy ? fmtMD(b.lastStudy) : "-"}</td>
          <td>{!b.active ? <Pill cls="mute">{b.refunded ? "환불" : "기간 끝"}</Pill> : paused ? <Pill cls="warn">이용 멈춤</Pill> : b.st ? <Pill cls="ok">{fmtMD(DB.date.toStr(new Date(b.st.joinedAt || Date.now()))) + " 입장"}</Pill> : <Pill cls="mute">아직</Pill>}</td>
          <td className="right">{b.st && b.active ? <Btn action="vs-pause" cls="a-btn-ghost a-btn-sm" data-id={b.st.id}>{paused ? "이용 다시 열기" : "이용 멈춤"}</Btn> : null}</td></tr>); })}
    </tbody></table></div> : <Empty ic="users">{f === "all" ? "아직 VOD를 산 수강생이 없어요." : "이 조건의 수강생이 없어요."}</Empty>}</section>
    <p className="a-hint"><Icon n="shieldCheck" c="xs" /> 두잉고에 들어오기 전 수강생 이름은 가려서 보여요. VOD 수강 기간이 끝나거나 환불하면 VOD 버전도 자동으로 닫혀요.</p>
  </>;
}

export function VodLink({ n }) {
  const A = ADM(), iid = A.IID(), X = A.VX(), v = A.VD(), ins = A.INS(), vp = A.VPID();
  const prods = v.products.filter((p) => p.iid === iid && X.typeOf(p) === "vod"), others = v.products.filter((p) => p.iid === iid && X.typeOf(p) !== "vod"), buyers = X.buyersOf(iid);
  const flow = [["coins", "DOOGO CLASS에서 VOD 결제", "이메일 · 카카오로 가입한 회원"], ["circlePlay", "‘강의실 입장’ → 그 VOD의 두잉고 강의실", "두잉고 로그인 › 두고클래스 탭(이메일)으로도 들어와요"], ["play", "두잉고 강의실에서 강의 시청", "진도는 DOOGO CLASS에도 같이 쌓여요"], ["library", "VOD마다 따로 꾸민 자료 · 소식 · FAQ", "아래 ‘강의실 꾸미기’에서 강의별로 정해요"]];
  const from0 = (prods.find((q) => q.id !== vp) || {}).id;
  return <>
    <Head title="VOD 강의 연결" sub={"DOOGO CLASS에 올라간 " + ins.displayName + " 강사님 VOD를 사면, 이 두잉고(VOD 버전)가 자동으로 열려요. 클래스마다 켜고 끌 수 있어요."} right={<Store />} />
    <section className="a-card"><ol className="a-vflow">{flow.map((x, i) => <li key={i}><span className="a-vflow-ic"><Icon n={x[0]} c="sm" /></span><b>{i + 1}. {x[1]}</b>{x[2] ? <small>{x[2]}</small> : null}</li>)}</ol></section>
    <section className="a-card"><div className="a-card-head"><h2>내 VOD 클래스</h2><span className="a-muted">{prods.length}개</span></div>
      {prods.length ? <ul className="a-list a-vlink">{prods.map((p) => { const on = p.dg !== false, cnt = buyers.filter((b) => b.active && b.paid.some((x) => x.p.id === p.id)).length, st = A.VD_ST[p.status] || A.VD_ST.hidden; return (
        <li key={p.id}><div className="vda-cl"><Isl html={A.vdThumb(p)} /><div><b>{p.title}</b><small className="a-memo">{st[0]} · 강의 {X.lessons(p).length}개 · {X.accessTxt(p)} · 수강생 {cnt}명</small></div></div>
          <span className="a-vlink-act"><Btn action="vp-go" cls={"a-btn-ghost a-btn-sm" + (p.id === vp ? " is-cur" : "")} data-id={p.id}><Icon n="pen" c="sm" />강의실 꾸미기</Btn>
            <button type="button" className={"a-vsw" + (on ? " on" : "")} role="switch" aria-checked={String(on)} data-action="vlink-toggle" data-id={p.id}><i /><span>{on ? "두잉고 열림" : "닫힘"}</span></button></span></li>); })}</ul>
        : <Empty ic="monitorPlay">아직 DOOGO CLASS에 올라간 내 VOD가 없어요. VOD로 만들고 싶다면 마스터에게 문의해 주세요.</Empty>}</section>
    {prods.length > 1 ? <section className="a-card"><div className="a-card-head"><h2>VOD마다 두잉고 강의실이 따로예요</h2><span className="a-muted">강의 커리큘럼이 다르니 자료함 · 실습 체크리스트 · FAQ · 업데이트 소식 · 메뉴도 강의별로 꾸며요. 비슷하게 시작하려면 다른 강의실 내용을 그대로 가져와요.</span></div>
      <form key={n} id="vp-copy-form" className="a-form vp-copy" noValidate><div className="a-field"><label htmlFor="vp-from">가져올 강의실</label><select className="a-input" id="vp-from" name="from" defaultValue={from0}>{prods.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
        <span className="vp-copy-ar"><Icon n="arrowRight" c="sm" /></span>
        <div className="a-field"><label htmlFor="vp-to">이 강의실에 덮어쓰기</label><select className="a-input" id="vp-to" name="to" defaultValue={vp}>{A.vodProds().map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
        <button className="a-btn a-btn-primary" type="submit"><Icon n="download" c="sm" />내용 가져오기</button></form></section> : null}
    {others.length ? <p className="a-hint"><Icon n="alert" c="xs" /> 전자책 · LIVE · 오프라인 강의({others.map((p) => p.title).join(", ")})는 VOD 버전에 연결되지 않아요. LIVE · 오프라인 수강생은 LIVE 버전의 기수로 운영해요.</p> : null}
  </>;
}

/** 주문 한 줄 (예전 ordRow) */
export function OrdRow({ o, extra }) {
  const A = ADM(), DB = DBX(), X = A.VX(), mb = A.vdMember(o.mid) || {}, st = A.VD_OST[o.status] || A.VD_OST.paid, won = A.won, opt = X.optTxt(o);
  return <tr className={o.status === "refunded" ? "a-dim" : undefined}><td className="num">{DB.date.toStr(new Date(o.paidAt || o.at))}</td><td className="num"><small>{o.no}</small></td><td><b>{A.vdMask(mb.name)}</b></td>
    <td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}<Isl html={A.vdRsTag(o)} /><Isl html={A.vdRbTag(o)} /></td><td>{A.VD_PAY[o.method] || o.method || "-"}</td>
    <td className="right num">{won(o.amount)}</td><td className="right num"><b>{o.status === "paid" ? won(A.vdInsAmt(o)) : "-"}</b></td><td><Pill cls={st[1]}>{st[0]}</Pill></td>{extra || null}</tr>;
}

export function InsVod() {
  const A = ADM(), DB = DBX(), iid = A.IID(), v = A.VD(), X = A.VX(), won = A.won, mine = v.products.filter((p) => p.iid === iid && A.vdOnline(p)), ids = mine.map((p) => p.id);
  const sub = "DOOGO CLASS에서 판매 중인 내 VOD · 전자책의 판매 내역이에요. " + A.SALES_SUB;
  if (!mine.length) return <><Head title="VOD 판매 내역" sub={sub} right={<Store />} /><section className="a-card"><Empty ic="monitorPlay" extra={<Store href="#/vod" label="DOOGO CLASS 둘러보기" />}>아직 DOOGO CLASS에 올라간 내 VOD가 없어요.<br />기수 강의를 VOD로 만들어 팔고 싶다면 마스터에게 문의해 주세요.</Empty></section></>;
  const os = v.orders.filter((o) => ids.indexOf(o.pid) >= 0).sort((a, b) => (b.paidAt || b.at) - (a.paidAt || a.at)), paid = os.filter(A.vdLive), ym = DB.date.todayStr().slice(0, 7), mon = paid.filter((o) => A.vdYM(o.paidAt) === ym), rfm = A.vdRfSum(ym, iid);
  const rs = v.reviews.filter((r) => ids.indexOf(r.pid) >= 0 && !r.hidden).sort((a, b) => b.at - a.at), avg = rs.length ? (rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1) : "-";
  const sts = DB.vodStudentsOf(iid), tf = A.ui.vsT || "all", P = (id) => A.vdP(id);
  const list = os.filter((o) => tf === "all" || (tf === "addon" ? !X.isAccess(o) : tf === "vod" ? X.typeOf(P(o.pid)) === "vod" && X.isAccess(o) : X.typeOf(P(o.pid)) === "ebook"));
  return <>
    <Head title="VOD 판매 내역" sub={sub} right={<Store />} />
    <div className="a-kpis a-kpis-5">
      <Kpi label="이번 달 판매" value={mon.length + "건"} sub={A.vdYMtxt(ym)} href="#/center/vod" tone="ok" />
      <Kpi label="이번 달 매출" value={won(A.vdSum(mon))} sub="결제 완료 기준 · 환불 빼고" href="#/center/vod" />
      <Kpi label="이번 달 환불" value={rfm.n + "건"} sub={rfm.n ? "- " + won(rfm.amt) + " · 정산 - " + won(rfm.ins) : "환불 없음"} href="#/center/vod-refunds" tone={rfm.n ? "warn" : ""} />
      <Kpi label="이번 달 정산 예정" value={won(A.vdSum(mon, A.vdInsAmt))} sub={DB.date.fmtFull(A.vdPayDate(ym)) + " 지급 예정"} href="#/center/vod-settle" />
      <Kpi label="평균 별점" value={avg} sub={"후기 " + rs.length + "개"} href="#/center/vod" />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>내 VOD · 전자책 클래스</h2></div><div className="a-table-wrap"><table className="a-table vda-table"><thead><tr><th>클래스</th><th>상태</th><th>판매가</th><th>정산 비율</th><th>판매</th><th className="right">누적 매출</th><th className="right">누적 정산</th></tr></thead><tbody>
      {mine.map((p) => { const po = paid.filter((o) => o.pid === p.id), st = A.VD_ST[p.status] || A.VD_ST.hidden, pr = X.priceOf(p), vod = X.typeOf(p) === "vod", plans = X.plansOf(p); return (
        <tr key={p.id}><td><div className="vda-cl"><Isl html={A.vdThumb(p)} /><div><b>{p.title}</b><small className="a-memo">{X.TYPE[X.typeOf(p)][0] + " · " + (vod ? "강의 " + X.lessons(p).length + "개 · " : "") + X.accessTxt(p)}</small>{vod && X.lessons(p).length ? <Isl html={A.vuChip(p)} /> : null}</div></div></td>
          <td><Pill cls={st[1]}>{st[0]}</Pill></td><td className="num">{pr === 0 ? "무료" : plans.length ? plans.map((y, i) => [i ? <br key={"b" + i} /> : null, <small key={"s" + i}>{y.label}</small>, " " + won(y.sale)]) : won(pr)}</td>
          <td className="num">{X.shareOf(p)}%</td><td className="num">{po.length}건</td><td className="right num">{won(A.vdSum(po))}</td><td className="right num"><b>{won(A.vdSum(po, A.vdInsAmt))}</b></td></tr>); })}
    </tbody></table></div></section>
    <section className="a-card"><div className="a-card-head"><h2>주문 내역</h2><div className="a-seg">{[["all", "전체"], ["vod", "VOD 수강권"], ["addon", "코칭 · TEA TIME"], ["ebook", "전자책"]].map((x) => <button key={x[0]} type="button" className={tf === x[0] ? "on" : ""} data-action="vs-t" data-k={x[0]}>{x[1]}</button>)}</div></div>
      {list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>결제일</th><th>주문 번호</th><th>구매자</th><th>클래스</th><th>결제 수단</th><th className="right">결제 금액</th><th className="right">정산액</th><th>상태</th><th>두잉고</th></tr></thead><tbody>
        {list.slice(0, 40).map((o) => <OrdRow key={o.no} o={o} extra={<td>{X.typeOf(P(o.pid)) !== "vod" ? <span className="a-muted">-</span> : sts.some((s) => s.vodMid === o.mid) ? <Pill cls="ok">입장</Pill> : o.status === "paid" ? <Pill cls="mute">아직</Pill> : <span className="a-muted">-</span>}</td>} />)}
      </tbody></table></div> : <Empty ic="inbox">주문이 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>수강생 후기</h2><span className="a-muted">{rs.length}개</span></div>{rs.length ? <ul className="vda-reviews">{rs.slice(0, 10).map((r, i) => (
      <li key={i}><div><b>{r.name}</b><span className="vda-stars">{"★".repeat(r.rating)}<i>{"★".repeat(5 - r.rating)}</i></span><small>{((P(r.pid) || {}).title || "") + " · " + DB.date.toStr(new Date(r.at))}</small></div><p>{r.text}</p></li>
    ))}</ul> : <Empty ic="star">아직 후기가 없어요.</Empty>}</section>
  </>;
}

/** 환불 · 취소 내역 #/center/vod-refunds (예전 pageInsVodRefunds) — 내 클래스의 환불된 주문 · 정산에서 빠진 금액 */
export function InsVodRefunds() {
  const A = ADM(), DB = DBX(), iid = A.IID(), v = A.VD(), X = A.VX(), won = A.won, mine = v.products.filter((p) => p.iid === iid), ym = DB.date.todayStr().slice(0, 7), r = X.rfSet(); // VOD · 전자책 · LIVE · 오프라인 · 종이책 · 부가 상품 모두
  const sub = "DOOGO CLASS에서 판매된 내 클래스 중 환불 · 취소된 주문이에요. 환불한 금액은 정산에서 빠져요 — 정산을 확정하기 전에 환불되면 그 달 정산에서 빠지고, 이미 확정한 달의 주문이 환불되면 환불한 달 정산에서 차감해요. " + A.SALES_SUB;
  if (!mine.length) return <><Head title="환불 · 취소 내역" sub={sub} right={<Store />} /><section className="a-card"><Empty ic="refresh">아직 DOOGO CLASS에 올라간 내 클래스가 없어요.</Empty></section></>;
  const rf = A.vdRefundsOf(iid), sm = A.vdRfSum(ym, iid), all = rf.filter((o) => o.refundKind === "instant").length;
  return <>
    <Head title="환불 · 취소 내역" sub={sub} right={<Store />} />
    <div className="a-kpis">
      <Kpi label="이번 달 환불" value={sm.n + "건"} sub={won(sm.amt) + " 돌려줌"} href="#/center/vod-refunds" tone={sm.n ? "warn" : ""} />
      <Kpi label="이번 달 순매출" value={won(sm.gross - sm.amt)} sub={"결제 " + won(sm.gross) + " − 환불 " + won(sm.amt)} href="#/center/vod" />
      <Kpi label="정산에서 빠진 금액" value={won(sm.ins)} sub="이번 달 환불의 내 정산 몫" href="#/center/vod-settle" />
      <Kpi label="회원 바로 취소" value={all + "건"} sub={"결제 후 " + r.days + "일 이내 · 재생 전 (누적)"} href="#/center/vod-refunds" />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>환불 · 취소된 주문</h2><span className="a-muted">{rf.length + "건 · 최근 60건"}</span></div>
      {rf.length ? <div className="a-table-wrap"><table className="a-table vd-rf-tbl"><thead><tr><th>환불일</th><th>주문 번호</th><th>구매자</th><th>클래스</th><th className="right">결제 금액</th><th className="right">환불 금액</th><th>구분</th><th>정산 반영</th></tr></thead><tbody>
        {rf.slice(0, 60).map((o) => { const s0 = A.vdRfSettle(o), k = A.vdRfKind(o), opt = X.optTxt(o); return (
          <tr key={o.no}><td className="num">{DB.date.toStr(new Date(o.refundedAt || o.at))}</td><td className="num"><small>{o.no}</small></td><td><b>{A.vdMask((A.vdMember(o.mid) || {}).name)}</b></td><td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}</td>
            <td className="right num">{won(o.amount)}</td><td className="right num"><b>{"- " + won(A.vdRfAmt(o))}</b></td><td><Pill cls={k[1]}>{k[0]}</Pill></td><td><small>{s0.t}</small><small className="a-memo">{"내 정산 - " + won(s0.ins)}</small></td></tr>); })}
      </tbody></table></div> : <Empty ic="refresh">환불 · 취소된 주문이 없어요.</Empty>}</section>
    <p className="a-hint"><Icon n="shieldCheck" c="xs" />{" 환불 규정: 결제 후 " + r.days + "일 이내 · 강의를 한 번도 재생하지 않았으면 회원이 내 강의실에서 직접 100% 취소해요. 그 밖의 환불은 마스터가 들은 강의 수 · 기간에 맞춰 처리해요."}</p>
  </>;
}

/** 무료 LIVE · 온/오프라인 판매 #/center/vod-live (예전 pageInsVodLive) */
export function InsVodLive() {
  const A = ADM(), DB = DBX(), iid = A.IID(), v = A.VD(), X = A.VX(), won = A.won;
  const evs = v.products.filter((p) => p.iid === iid && X.isEvent(p)).sort((a, b) => String(a.eventAt).localeCompare(String(b.eventAt)));
  const sub = "DOOGO CLASS에 올라간 내 LIVE 무료강의 · 온/오프라인 강의의 신청자 · 좌석 · 매출이에요. " + A.SALES_SUB;
  if (!evs.length) return <><Head title="무료 LIVE · 온/오프라인 판매" sub={sub} right={<Store />} /><section className="a-card"><Empty ic="calendar">아직 DOOGO CLASS에 올라간 내 LIVE 무료강의 · 온/오프라인 강의가 없어요.<br />VOD 반응이 좋으면 마스터와 LIVE · 오프라인 강의를 열 수 있어요.</Empty></section></>;
  const ids = evs.map((p) => p.id), os = v.orders.filter((o) => ids.indexOf(o.pid) >= 0), paid = os.filter(A.vdLive), ym = DB.date.todayStr().slice(0, 7), mon = paid.filter((o) => A.vdYM(o.paidAt) === ym);
  const end = (p) => new Date(p.eventAt).getTime() + (Number(p.eventMin) || 60) * 6e4 < Date.now(), up = evs.filter((p) => !end(p));
  return <>
    <Head title="무료 LIVE · 온/오프라인 판매" sub={sub} right={<Store />} />
    <div className="a-kpis">
      <Kpi label="진행 예정" value={up.length + "개"} sub={"전체 " + evs.length + "개"} href="#/center/vod-live" />
      <Kpi label="신청 · 결제 완료" value={paid.length + "명"} sub={"입금 대기 " + os.filter((o) => o.status === "pending").length + "명"} href="#/center/vod-live" />
      <Kpi label="이번 달 매출" value={won(A.vdSum(mon))} sub={"정산 " + won(A.vdSum(mon, A.vdInsAmt))} href="#/center/vod-settle" tone={mon.length ? "ok" : ""} />
      <Kpi label="누적 매출" value={won(A.vdSum(paid))} sub={"정산 " + won(A.vdSum(paid, A.vdInsAmt))} href="#/center/vod-settle" />
    </div>
    {evs.map((p) => {
      const po = os.filter((o) => o.pid === p.id).sort((a, b) => (b.paidAt || b.at) - (a.paidAt || a.at)), pd = po.filter((o) => o.status === "paid"), seats = Number(p.seats) || 0, past = end(p), off = X.typeOf(p) === "offline";
      return (
        <section key={p.id} className="a-card a-ev"><div className="a-ev-head"><Isl html={A.vdThumb(p)} /><div className="a-ev-t"><small>{A.adTypeName(p) + " · " + X.fmtEvent(p.eventAt, true)}</small><h2>{p.title}</h2><p><Icon n={off ? "mapPin" : "video"} c="xs" /> {off ? p.place || "장소 미정" : "온라인 LIVE · 입장 링크는 시작 10분 전에 열려요"}</p></div>{past ? <Pill cls="mute">종료</Pill> : <Pill cls="info">진행 예정</Pill>}</div>
          <div className="a-ev-stat"><div><small>좌석</small><b className="num">{pd.length + (seats ? " / " + seats : "")}</b>{seats ? <div className="a-bar"><span style={{ width: Math.min(100, Math.round(pd.length / seats * 100)) + "%" }} /></div> : null}</div><div><small>매출</small><b className="num">{won(A.vdSum(pd))}</b></div><div><small>정산 예정</small><b className="num">{won(A.vdSum(pd, A.vdInsAmt))}</b></div></div>
          {po.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>신청일</th><th>주문 번호</th><th>신청자</th><th>클래스</th><th>결제 수단</th><th className="right">결제 금액</th><th className="right">정산액</th><th>상태</th><th>연락처</th></tr></thead><tbody>
            {po.map((o) => <OrdRow key={o.no} o={o} extra={<td className="num">{o.status === "paid" ? "뒷자리 " + (X.last4((A.vdMember(o.mid) || {}).phone) || "-") : "-"}</td>} />)}</tbody></table></div> : <p className="a-muted a-pad">아직 신청자가 없어요.</p>}
        </section>
      );
    })}
    <p className="a-hint"><Icon n="users" c="xs" /> LIVE · 오프라인 수강생을 두잉고로 함께 관리하려면, LIVE · 오프라인 버전의 ‘수강생 관리’에서 기수에 추가하세요. 연락처는 진행 안내에 필요한 뒷자리만 보여요.</p>
  </>;
}
