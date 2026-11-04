"use client";
/* 온드미디어 센터 (YouTube 채널 팀 RS) — #/center/media/…
 * 예전 admin.js pageMediaHome · Links · Cal · Orders · Payouts · Guide · Settings · mdHello · mdOrderTable 을 React 로 (Next.js 전환 6단계)
 *  · 링크 복사 · 찾기 · 달 넘기기 · 날짜 고르기 · CSV · 명세서 · 비밀번호 · 정산 정보 저장은 예전 admin.js 이벤트가 그대로 받아요
 *  · 홍보 링크 한 줄(mdLinkRow)은 마스터 화면과 같이 쓰는 예전 조각 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";
import { MdStmtCells } from "./MasterMedia.jsx";

const ff = (s) => DBX().date.fmtFull(s);

/** 예전 mdOrderTable — 링크로 팔린 주문 표 (master: 주문번호 · 채널 칸까지) */
export function MdOrderTable({ list, master, empty }) {
  const A = ADM(), X = A.VX(), won = A.won;
  if (!list.length) return <Empty ic="monitorPlay">{empty || "아직 판매가 없어요."}</Empty>;
  return <div className="a-table-wrap"><table className="a-table md-otable"><thead><tr><th>결제일</th><th>VOD</th>{master ? <th>채널</th> : null}<th>강사</th><th className="right">판매가</th><th className="right">RS율</th><th className="right">RS</th><th>상태</th></tr></thead><tbody>{list.map((o) => {
    const s = A.mdOst(o), a = A.mdOf(o.rs.mid), opt = X.optTxt(o);
    return <tr key={o.id}><td className="vda-nw">{A.vdWhen(o.paidAt || o.at)}{master ? <small className="a-memo num">{o.no}</small> : null}</td><td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}</td>{master ? <td>{a ? A.mdName(a) : o.rs.ch || "-"}</td> : null}<td>{A.mdCreator(A.vdP(o.pid))}</td>
      <td className="right num">{won(X.baseOf(o))}{o.status === "refunded" ? <small className="a-memo">환불 {won(o.refundAmount != null ? o.refundAmount : o.amount)}</small> : null}</td><td className="right num">{Number(o.rs.rate) || 0}%</td><td className="right num"><b>{won(o.status === "pending" ? X.rsOf(o) : A.mdRs(o))}</b></td><td><Pill cls={s[1]}>{s[0]}</Pill></td></tr>; })}</tbody></table></div>;
}
function Hello({ a }) {
  const A = ADM();
  return <section className="a-card md-hello"><div className="md-hello-l"><span className="md-av"><Icon n="monitorPlay" /></span><div><small>DOOGO CLASS 온드미디어 · RS 파트너스</small><h2>{A.mdName(a)} 님, 안녕하세요</h2><p className="a-muted">내 홍보 링크로 VOD가 팔리면 판매가의 RS가 쌓여요. 매달 1일~말일 판매분을 다음 달 10일에 지급해요.</p></div></div>
    <div className="md-hello-r"><span className="md-rate"><b>RS {A.mdRate(a)}%</b><small>{A.mdRateWhy(a)}</small></span>{a.url ? <a className="a-btn a-btn-ghost a-btn-sm" href={a.url} target="_blank" rel="noopener"><Icon n="play" c="sm" />내 채널</a> : null}</div></section>;
}

export function MediaHome() {
  const A = ADM(), DB = DBX(), X = A.VX(), won = A.won, a = A.mdMe(), id = a.id, ym = DB.date.todayStr().slice(0, 7), last = A.vdYMadd(ym, -1), R = A.mdR();
  const cur = A.mdStmt(id, ym), prev = A.mdStmt(id, last), ps = A.mdStState(prev), os = A.mdOrders(id).slice().sort((x, y) => (y.paidAt || y.at) - (x.paidAt || x.at));
  const months = Array.from({ length: 6 }, (_, i) => A.vdYMadd(ym, i - 5)).map((m) => ({ m, st: A.mdStmt(id, m) })), max = Math.max(1, ...months.map((x) => x.st.rs));
  const noBank = !(a.bank && a.account && a.holder), hasPrev = prev.n || prev.rec || prev.ded || prev.carry;
  return <>
    <Hello a={a} />
    {noBank ? <a className="a-inq-alert md-alert" href="#/center/media/settings"><Icon n="alert" c="sm" /><span><b>정산 받을 계좌를 등록해 주세요.</b> 계좌가 있어야 RS를 지급할 수 있어요.</span><Icon n="arrowRight" c="xs" /></a> : null}
    <div className="a-kpis">
      <Kpi label="이번 달 판매" value={cur.n + "건"} sub={A.vdYMtxt(ym) + " · 내 링크로 결제"} href="#/center/media/orders" tone="ok" />
      <Kpi label="이번 달 RS (잠정)" value={won(Math.max(0, cur.net))} sub={"판매가 " + won(cur.base) + " 기준"} href="#/center/media/calendar" />
      <Kpi label="다음 지급" value={hasPrev ? won(prev.pay) : "0원"} sub={ff(A.vdPayDate(last)) + " · " + (prev.n || prev.rec ? ps.t : "지난달 판매 없음")} href="#/center/media/payouts" tone={prev.n && ps.k !== "paid" ? "info" : ""} />
      <Kpi label="누적 지급 완료" value={won(A.mdPaidOut(id))} sub="지금까지 받은 RS" href="#/center/media/payouts" />
    </div>
    <div className="a-grid-2 md-home-grid">
      <section className="a-card"><div className="a-card-head"><h2>최근 6개월 RS</h2><span className="a-muted">판매월 기준 · 이번 달은 잠정</span></div><div className="md-bars">{months.map((x) => <div key={x.m} className={"md-bar" + (x.m === ym ? " cur" : "")}><b className="num">{x.st.rs ? A.manTxt(x.st.rs) : "0"}</b><span style={{ height: Math.max(3, Math.round(x.st.rs / max * 100)) + "%" }} /><small>{Number(x.m.slice(5, 7))}월</small></div>)}</div></section>
      <section className="a-card"><div className="a-card-head"><h2>최근 판매</h2><a className="a-link" href="#/center/media/orders">전체 보기 <Icon n="arrowRight" c="xs" /></a></div>
        {os.length ? <ul className="md-recent">{os.slice(0, 6).map((o) => { const s = A.mdOst(o), p = A.vdP(o.pid); return <li key={o.id}><span className="md-rc-t">{p ? <Isl html={A.vdThumb(p, "sm")} /> : null}<span><b>{o.title}</b><small className="a-memo">{(o.paidAt ? A.vdWhen(o.paidAt) : A.vdWhen(o.at)) + " · 판매가 " + won(X.baseOf(o))}</small></span></span><span className="md-rc-r"><b className="num">{o.status === "pending" ? won(X.rsOf(o)) : won(A.mdRs(o))}</b><Pill cls={s[1]}>{s[0]}</Pill></span></li>; })}</ul>
          : <Empty ic="link" extra={<a className="a-btn a-btn-primary a-btn-sm" href="#/center/media/links"><Icon n="link" c="sm" />내 홍보 링크 보기</a>}>아직 내 링크로 팔린 VOD가 없어요.<br />‘내 홍보 링크’에서 링크를 복사해 유튜브 영상 설명란에 붙여 보세요.</Empty>}</section>
    </div>
    <section className="a-card a-settle-note"><h2><Icon n="shieldCheck" c="sm" /> 내 RS는 이렇게 계산돼요</h2><ul>
      <li>RS = (판매가 − 환불) × (1 − PG 수수료 {R.pg}%) × 내 RS {A.mdRate(a)}%. 예: 99만 원 VOD 1건이면 {won(Math.floor(990000 * (100 - R.pg) * A.mdRate(a) / 100000) * 10)}이에요.</li>
      <li>내 링크로 들어온 뒤 {R.days}일 안에 그 VOD를 결제하면 내 판매로 잡혀요 (같은 VOD는 마지막으로 누른 링크 기준).</li>
      <li>이번 달 금액은 잠정이에요. 다음 달 초에 두고클래스가 확정하고, 다음 달 10일(주말 · 공휴일이면 다음 영업일)에 등록한 계좌로 보내 드려요.</li></ul></section>
  </>;
}

export function MediaLinks() {
  const A = ADM(), X = A.VX(), ui = A.ui, a = A.mdMe(), q = String(ui.mdQ || "").trim().toLowerCase(), ps = A.mdLinkProducts(), R = A.mdR();
  const by = {}; A.mdOrders(a.id).forEach((o) => { const x = (by[o.pid] = by[o.pid] || { n: 0, rs: 0 }); if (A.vdKeep(o) > 0 && o.paidAt) { x.n++; x.rs += A.mdRs(o); } });
  const list = ps.filter((p) => !q || (p.title + " " + A.mdCreator(p)).toLowerCase().indexOf(q) >= 0).sort((x, y) => ((by[y.id] || {}).n || 0) - ((by[x.id] || {}).n || 0)), code = X.rsCode(a.code);
  return <>
    <Head title="내 홍보 링크" sub={<>VOD마다 <b>{A.mdName(a)}</b> 전용 링크가 있어요. 유튜브 영상 설명란 · 고정 댓글 · 커뮤니티 글에 붙여 넣으세요. 이 링크로 들어와 {R.days}일 안에 결제하면 RS {A.mdRate(a)}%가 쌓여요.</>} right={<Btn action="md-copy-all" cls="a-btn-ghost"><Icon n="download" c="sm" />링크 전체 복사</Btn>} />
    <section className="a-card"><div className="a-toolbar md-link-tools"><div className="a-input-icon"><Icon n="search" c="sm" /><input className="a-input" id="md-q" placeholder="강의 이름 · 강사로 찾기" defaultValue={ui.mdQ || ""} aria-label="강의 찾기" /></div><span className="a-muted">링크 {list.length}개 · 내 링크 코드 <b>{code}</b></span></div>
      {list.length ? <div className="vs-links md-links">{list.map((p) => <Isl key={p.id} html={A.mdLinkRow(p, a, by[p.id])} />)}</div> : <Empty ic="search">{q ? "찾는 강의가 없어요." : "아직 홍보할 수 있는 VOD가 없어요."}</Empty>}</section>
    <section className="a-card a-settle-note"><h2><Icon n="help" c="sm" /> 링크 쓰는 법</h2><ul>
      <li>링크는 강의마다 달라요. 영상에서 소개하는 강의의 링크를 써야 그 강의 판매로 잡혀요.</li>
      <li>링크 끝의 <b>?rs={code}</b>가 내 표시예요. 지우거나 바꾸면 내 판매로 잡히지 않아요.</li>
      <li>유튜브 앱 안에서 열었다가 ‘다른 브라우저로 열기’를 해도 링크 그대로라 이어져요. 회원가입 · 로그인을 하고 결제해도 그대로예요.</li>
      <li>종이책 · 1:1 코칭권 · TEA TIME · 연장권은 RS 대상이 아니에요.</li></ul></section>
  </>;
}

export function MediaCal() {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won, a = A.mdMe(), id = a.id, ym = ui.mdYM || DB.date.todayStr().slice(0, 7), t0 = DB.date.todayStr(), R = A.mdR();
  const os = A.mdOrders(id).filter((o) => o.paidAt && A.vdKeep(o) > 0 && A.vdYM(o.paidAt) === ym).sort((x, y) => x.paidAt - y.paidAt);
  const day = {}, tot = { n: 0, base: 0, rs: 0 };
  os.forEach((o) => { const d = DB.date.toStr(new Date(o.paidAt)), x = (day[d] = day[d] || { n: 0, rs: 0, base: 0, os: [] }), r = A.mdRs(o), b = A.mdBase(o); x.n++; x.rs += r; x.base += b; x.os.push(o); tot.n++; tot.rs += r; tot.base += b; });
  const y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7)) - 1, first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const sel = ui.mdDay && ui.mdDay.slice(0, 7) === ym ? ui.mdDay : day[t0] ? t0 : (Object.keys(day).sort().pop() || "");
  const st = A.mdStmt(id, ym), ss = A.mdStState(st), pym = A.vdYMadd(ym, -1), pst = A.mdStmt(id, pym), pss = A.mdStState(pst), payD = A.vdPayDate(pym), hasPay = !!(pst.n || pst.rec || pst.ded || pst.carry), paid = pss.k === "paid";
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={"p" + i} className="vc-d vc-pad" aria-hidden="true"></div>);
  for (let dd = 1; dd <= days; dd++) {
    const d = ym + "-" + String(dd).padStart(2, "0"), x = day[d], dow = (first + dd - 1) % 7, pay = hasPay && d === payD;
    cells.push(<button key={d} type="button" className={"vc-d" + (x ? " has" : "") + (pay ? " payday" + (paid ? " paid" : "") : "") + (d === t0 ? " today" : "") + (d === sel ? " on" : "") + (dow === 0 ? " sun" : dow === 6 ? " sat" : "")} data-action="md-day" data-d={d} aria-label={x || pay ? dd + "일" + (pay ? " " + (paid ? "지급 완료" : "지급 예정") + " " + won(pst.pay) : "") + (x ? " 판매 " + x.n + "건 · RS " + won(x.rs) : "") : undefined}>
      <span className="vc-dn">{dd}</span>{pay ? <span className="vc-pay"><em>{paid ? "받음" : "받을 RS"}</em><b className="vc-full">{won(pst.pay)}</b><b className="vc-short">{A.vcMan(pst.pay)}</b></span> : null}
      {x ? <><b className="vc-amt"><span className="vc-full">{won(x.rs)}</span><span className="vc-short">{A.vcMan(x.rs)}</span></b><span className="vc-ks"><i className="vc-k vc-k-vod">판매 {x.n}</i></span></> : null}</button>);
  }
  const sx = sel && day[sel];
  return <>
    <Head title="판매 달력" sub="날짜마다 내 링크로 몇 건이 팔렸고 RS가 얼마인지 실시간으로 봐요. 초록 칸은 지난달 판매분 RS를 받는 날이에요." />
    <section className="a-card vc-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="md-ym" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{A.vdYMtxt(ym)}</h2><button type="button" className="a-icon-btn" data-action="md-ym" data-dir="1" aria-label="다음 달"><Icon n="chevRight" /></button>
        <span className="a-cal-sum">판매 <b>{tot.n}건</b> · 판매가 <b>{won(tot.base)}</b> · RS <b>{won(tot.rs)}</b></span><Pill cls={ss.c}>{ss.t}</Pill></div>
      {hasPay ? <p className="vc-paynote"><Icon n="coins" c="xs" /> <b>{Number(payD.slice(5, 7))}월 {Number(payD.slice(8))}일</b>에 {A.vdYMtxt(pym)} 판매분 RS <b>{won(pst.pay)}</b>{paid ? "을 받았어요." : "을 받아요 (" + pss.t + ")."}</p> : null}
      <div className="vc-grid" role="grid" aria-label={A.vdYMtxt(ym) + " 판매 달력"}>{["일", "월", "화", "수", "목", "금", "토"].map((w, i) => <div key={w} className={"vc-w" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{w}</div>)}{cells}</div>
      <p className="a-muted p-small"><Icon n="coins" c="xs" /> 날짜 칸의 금액은 그날 판매의 RS예요 (판매가 × (1 − PG {R.pg}%) × RS율). 확정 뒤 환불은 다음 달 RS에서 빠져요 ({A.vdYMtxt(ym)} 판매분 지급 예정 {won(st.pay)} · {ff(A.vdPayDate(ym))}).</p></section>
    {sel ? <section className="a-card vc-detail"><div className="a-card-head"><h2>{ff(sel)} 판매</h2>{sx ? <span className="a-muted">{sx.n}건 · 판매가 {won(sx.base)} · RS <b>{won(sx.rs)}</b></span> : null}</div>
      {sx ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>시각</th><th>VOD</th><th>강사</th><th className="right">판매가</th><th className="right">RS율</th><th className="right">RS</th><th>상태</th></tr></thead><tbody>{sx.os.map((o) => { const dt = new Date(o.paidAt), s = A.mdOst(o), opt = X.optTxt(o); return (
        <tr key={o.id}><td className="num">{String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0")}</td><td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}</td><td>{A.mdCreator(A.vdP(o.pid))}</td><td className="right num">{won(A.mdBase(o))}</td><td className="right num">{Number(o.rs.rate) || 0}%</td><td className="right num"><b>{won(A.mdRs(o))}</b></td><td><Pill cls={s[1]}>{s[0]}</Pill></td></tr>); })}</tbody></table></div>
        : <Empty ic="calendar">이날은 내 링크로 팔린 VOD가 없어요.</Empty>}</section> : null}
  </>;
}

export function MediaOrders() {
  const A = ADM(), won = A.won, a = A.mdMe(), pk = A.ui.mdOP || "all", pr = A.mdPeriod(pk), all = A.mdOrders(a.id).slice().sort((x, y) => (y.paidAt || y.at) - (x.paidAt || x.at));
  const list = all.filter((o) => (o.status === "pending" ? pk === "all" || pk === "month" : A.mdInPeriod(o, pr))), live = list.filter((o) => A.vdKeep(o) > 0 && o.paidAt);
  return <>
    <Head title="판매 내역" sub="내 홍보 링크로 들어와 결제된 VOD 주문이에요. 회원 이름 · 연락처는 보이지 않아요." right={<Btn action="md-csv" cls="a-btn-ghost"><Icon n="download" c="sm" />CSV 내려받기</Btn>} />
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{A.MD_PERIODS.map((x) => <button key={x[0]} type="button" className={"a-tab" + (pk === x[0] ? " on" : "")} data-action="md-op" data-k={x[0]}>{x[1]}</button>)}</div><span className="a-muted">{live.length}건 · 판매가 {won(A.mdSum(live, A.mdBase))} · RS <b>{won(A.mdSum(live, A.mdRs))}</b></span></div>
      <MdOrderTable list={list} empty="이 기간에 내 링크로 팔린 VOD가 없어요." /></section>
  </>;
}

export function MediaPayouts() {
  const A = ADM(), X = A.VX(), won = A.won, a = A.mdMe(), R = A.mdR(), months = A.mdMonths(a.id).slice(0, 12).map((m) => { const st = A.mdStmt(a.id, m); st.s = A.mdStState(st); return st; });
  const due = months.filter((x) => x.s.k === "confirmed" || x.s.k === "ready").reduce((s, x) => s + x.pay, 0), H = "#/center/media/payouts";
  return <>
    <Head title="RS 정산 · 지급" sub="달마다 내 링크로 팔린 VOD의 RS 명세예요. 두고클래스가 확정하면 명세서가 고정되고, 다음 달 10일에 지급해요." />
    <div className="a-kpis"><Kpi label="지급 예정" value={won(due)} sub="확정 · 확정 대기 합계" href={H} tone={due ? "info" : ""} /><Kpi label="누적 지급 완료" value={won(A.mdPaidOut(a.id))} sub="받은 RS 합계" href={H} tone="ok" /><Kpi label="내 RS율" value={A.mdRate(a) + "%"} sub={A.mdRateWhy(a)} href="#/center/media/guide" />
      <Kpi label="정산 계좌" value={a.account ? X.bankName(a.bank) || a.bank || "등록됨" : "미등록"} sub={a.account ? (a.type === "biz" ? "사업자 · 세금계산서" : "개인 · 3.3% 원천징수") : "계좌를 등록해야 지급돼요"} href="#/center/media/settings" tone={a.account ? "" : "warn"} /></div>
    <section className="a-card"><div className="a-card-head"><h2>월별 RS 명세</h2><span className="a-muted">이번 달은 잠정 · 확정하면 고정</span></div><div className="a-table-wrap"><table className="a-table vs-table"><thead><tr><th>판매 월</th><th>판매</th><th className="right">판매가 합계</th><th className="right">RS</th><th className="right">차감</th><th className="right">세금</th><th className="right">지급액</th><th>상태</th><th className="right"></th></tr></thead><tbody>
      {months.map((x) => <tr key={x.ym} className={x.n || x.rec || x.ded || x.carry ? undefined : "a-dim"}><MdStmtCells x={x} s={x.s} /></tr>)}</tbody></table></div></section>
    <section className="a-card a-settle-note"><h2><Icon n="shieldCheck" c="sm" /> 정산 기준</h2><ul>
      <li>RS = (판매가 − 환불) × (1 − PG 수수료 {R.pg}%) × RS율. RS율은 결제한 때의 비율이 주문에 남아요.</li>
      <li>매달 1일 ~ 말일 판매분을 다음 달 초에 두고클래스가 확정하고, 다음 달 10일(주말 · 공휴일이면 다음 영업일)에 등록한 계좌로 보내 드려요.</li>
      <li>확정 전에 환불된 주문은 빠지고, 확정한 뒤 환불되면 다음 달 RS에서 차감해요.</li>
      <li>개인은 사업소득 3.3%를 떼고 보내 드려요. 사업자는 RS 금액(부가세 포함)으로 (주)두고홀딩스에 세금계산서를 발행해 주세요.</li></ul></section>
  </>;
}

export function MediaGuide() {
  const A = ADM(), R = A.mdR(), a = A.mdMe();
  return <>
    <Head title="RS 안내" sub="두고클래스 회사소개서의 정산 구조 그대로예요. 궁금한 점은 운영팀 상담(카카오톡)으로 물어보세요." />
    <div className="fin-grid md-guide">
      <section className="a-card md-g"><b className="md-g-n">{R.hi}%</b><h3>YouTube 구독자 {A.manTxt(R.subs)} 이상</h3><p>이 채널의 홍보 링크로 구매한 주문</p></section>
      <section className="a-card md-g"><b className="md-g-n">{R.lo}%</b><h3>YouTube 구독자 {A.manTxt(R.subs)} 미만</h3><p>이 채널의 홍보 링크로 구매한 주문</p></section>
      <section className="a-card md-g"><b className="md-g-n">0%</b><h3>자연 유입 · 그 외</h3><p>검색 · 직접 방문 · 광고 등 링크 없이 산 주문</p></section>
    </div>
    <section className="a-card a-settle-note"><h2><Icon n="help" c="sm" /> 자세히</h2><ul>
      <li>내 RS율: <b>{A.mdRate(a)}%</b> ({A.mdRateWhy(a)}, 구독자 {A.mdSubsTxt(a)}). 구독자 수가 바뀌면 운영팀에 알려 주세요 — 바뀐 날부터 결제한 주문에 새 비율이 적용돼요.</li>
      <li>RS = (링크로 산 VOD 판매가 − 환불) × (1 − PG 수수료 {R.pg}%) × RS율. 정산할 때 강사님 · 두고클래스가 나누기 전에 먼저 빼서 드려요.</li>
      <li>링크를 누른 뒤 {R.days}일 안에 그 강의를 결제하면 내 판매예요. 같은 강의 링크를 여러 채널에서 눌렀다면 마지막으로 누른 링크가 이겨요.</li>
      <li>결제 직후는 잠정 RS, 월 마감 뒤 확정 RS로 정산서에 반영해요. 매달 10일 지급, 개인 3.3% 원천징수 · 사업자 세금계산서.</li>
      <li>종이책 · 1:1 코칭권 · TEA TIME · 1년 연장권은 RS 대상이 아니에요. 무료 강의도 RS가 없어요.</li></ul></section>
  </>;
}

export function MediaSettings({ n }) {
  const A = ADM(), X = A.VX(), a = A.mdMe(), extra = a.bank && !X.BANKS.some((b) => b[0] === a.bank);
  return <>
    <Head title="내 정보 · 정산 계좌" sub="RS를 받을 계좌와 연락처를 적어 주세요. 채널 이름 · RS율 · 링크 코드는 두고클래스 운영팀이 정해요." />
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>내 계정</h2></div><dl className="md-dl2">
        <dt>아이디</dt><dd>{a.loginId || "-"}</dd><dt>YouTube 채널</dt><dd>{A.mdName(a)}{a.url ? <> · <a className="a-link" href={a.url} target="_blank" rel="noopener">채널 열기</a></> : null}</dd><dt>팀 · 담당</dt><dd>{a.name || "-"}</dd><dt>구독자</dt><dd>{A.mdSubsTxt(a)}</dd><dt>RS율</dt><dd><b>{A.mdRate(a)}%</b> · {A.mdRateWhy(a)}</dd><dt>링크 코드</dt><dd><code>{X.rsCode(a.code)}</code></dd></dl></section>
      <section className="a-card"><div className="a-card-head"><h2>비밀번호 바꾸기</h2></div><form key={n} id="md-mypw-form" className="a-form" noValidate>
        <div className="a-field"><label htmlFor="mdp-new">새 비밀번호</label><input className="a-input" id="mdp-new" name="pw" type="password" autoComplete="new-password" maxLength={40} placeholder="4자 이상 · 띄어쓰기 없이" /></div>
        <div className="a-field"><label htmlFor="mdp-new2">새 비밀번호 확인</label><input className="a-input" id="mdp-new2" name="pw2" type="password" autoComplete="new-password" maxLength={40} /></div>
        <p className="a-error" id="mdp-error"></p><div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">비밀번호 바꾸기</button></div></form></section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>정산 받을 정보</h2><span className="a-muted">두고클래스 운영팀만 볼 수 있어요</span></div><form key={n} id="md-me-form" className="a-form" noValidate>
      <div className="vs-type">{[["person", "개인", "사업소득 3.3%를 떼고 지급해요"], ["biz", "사업자", "RS 금액으로 세금계산서를 발행해 주세요"]].map((t) => <label key={t[0]} className="vb-kind-o"><input type="radio" name="type" value={t[0]} defaultChecked={(a.type || "person") === t[0]} /><span><b>{t[1]}</b><small>{t[2]}</small></span></label>)}</div>
      <div className="a-form-row"><div className="a-field"><label htmlFor="mdm-bizname">상호 <small>(사업자)</small></label><input className="a-input" id="mdm-bizname" name="bizName" defaultValue={a.bizName || ""} maxLength={60} /></div><div className="a-field"><label htmlFor="mdm-bizno">사업자등록번호 <small>(사업자)</small></label><input className="a-input" id="mdm-bizno" name="bizNo" defaultValue={a.bizNo || ""} maxLength={20} inputMode="numeric" placeholder="000-00-00000" /></div></div>
      <div className="a-form-row"><div className="a-field"><label htmlFor="mdm-bank">은행</label><select className="a-input" id="mdm-bank" name="bank" defaultValue={a.bank || ""}><option value="">은행 고르기</option>{X.BANKS.map((b) => <option key={b[0]} value={b[0]}>{b[1]}</option>)}{extra ? <option value={a.bank}>{a.bank}</option> : null}</select></div>
        <div className="a-field"><label htmlFor="mdm-acc">계좌번호</label><input className="a-input" id="mdm-acc" name="account" defaultValue={a.account || ""} maxLength={30} inputMode="numeric" placeholder="- 없이" /></div><div className="a-field"><label htmlFor="mdm-hold">예금주</label><input className="a-input" id="mdm-hold" name="holder" defaultValue={a.holder || ""} maxLength={30} /></div></div>
      <div className="a-form-row"><div className="a-field"><label htmlFor="mdm-phone">연락처</label><input className="a-input" id="mdm-phone" name="phone" defaultValue={a.phone || ""} maxLength={20} inputMode="tel" /></div><div className="a-field"><label htmlFor="mdm-mail">정산 · 세금계산서 이메일</label><input className="a-input" id="mdm-mail" name="email" type="email" defaultValue={a.email || ""} maxLength={80} /></div></div>
      {a.bankAt ? <p className="a-muted p-small"><Icon n="clock" c="xs" /> 계좌를 마지막으로 바꾼 때: {A.vdWhen(a.bankAt)}</p> : null}
      <p className="a-muted p-small"><Icon n="shieldCheck" c="xs" /> 주민등록번호 같은 원천징수 신고 정보는 화면에 저장하지 않고, 첫 지급 전에 운영팀이 따로 안전하게 받아요.</p>
      <p className="a-error" id="mdm-error"></p><div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">정산 정보 저장</button></div></form></section>
  </>;
}

export const MDPAGES = { "": MediaHome, links: MediaLinks, calendar: MediaCal, orders: MediaOrders, payouts: MediaPayouts, guide: MediaGuide, settings: MediaSettings };
