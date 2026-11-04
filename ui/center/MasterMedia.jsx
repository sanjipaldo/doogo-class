"use client";
/* 마스터 DOOGO CLASS (6) — 온드미디어: 계정
 * 예전 admin.js pageMasterMedia 를 React 로 (Next.js 전환 6단계)
 *  · 달 넘기기 · RS 기준 · 계정 만들기 · 수정 · 홍보 링크 · 중지는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";

export function MasterMedia() {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won;
  A.mdSeed();
  const cym = DB.date.todayStr().slice(0, 7), ym = ui.mdAM && ui.mdAM < cym ? ui.mdAM : cym, live = ym === cym, R = A.mdR(), list = A.mdList(), ymT = A.vdYMtxt(ym);
  const mKpi = live ? "이번 달" : ymT, mCol = live ? "이번 달" : Number(ym.slice(5)) + "월";
  const rows = list.map((a) => ({ a, cur: A.mdStmt(a.id, ym), all: A.mdOrders(a.id).filter((o) => A.vdKeep(o) > 0 && o.paidAt) }));
  const AddBtn = () => <Btn action="md-add" cls="a-btn-primary"><Icon n="userPlus" c="sm" />새 온드미디어 계정</Btn>;
  return <>
    <Head title="온드미디어 계정" sub="YouTube 채널 팀(온드미디어)의 로그인 계정을 만들고 관리해요. 계정마다 VOD별 홍보 링크가 따로 생기고, 그 링크로 팔린 VOD의 RS가 강사 정산 전에 먼저 빠져요." right={<><Btn action="md-set" cls="a-btn-ghost"><Icon n="sliders" c="sm" />RS 기준</Btn><AddBtn /></>} />
    <div className="a-kpis">
      <Kpi label="사용 중인 계정" value={list.filter((a) => a.status === "active").length + "개"} sub={"전체 " + list.length + "개"} href="#/center/master/vod-media" />
      <Kpi label={mKpi + " 링크 판매"} value={rows.reduce((s, x) => s + x.cur.n, 0) + "건"} sub={"판매가 " + won(rows.reduce((s, x) => s + x.cur.base, 0))} href="#/center/master/vod-media-rs" tone="ok" />
      <Kpi label={mKpi + " RS" + (live ? " (잠정)" : "")} value={won(rows.reduce((s, x) => s + Math.max(0, x.cur.net), 0))} sub={ymT + (live ? " 집계 중" : " 판매분")} href="#/center/master/vod-media-pay" />
      <Kpi label="RS 기준" value={R.hi + "% · " + R.lo + "%"} sub={"구독자 " + A.manTxt(R.subs) + " 기준 · 링크 " + R.days + "일 · PG " + R.pg + "%"} href="#/center/master/vod-media" />
    </div>
    <section className="a-card">{list.length ? <>
      <div className="a-card-head a-cal-head md-am-head"><button type="button" className="a-icon-btn" data-action="md-am" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{ymT}</h2><button type="button" className="a-icon-btn" data-action="md-am" data-dir="1" aria-label="다음 달" disabled={live || undefined}><Icon n="chevRight" /></button><span className="a-cal-sum">{live ? "이번 달 집계 중 (잠정) · ‹ 로 지난달을 볼 수 있어요" : "위 숫자 · ‘" + mCol + "’ 칸이 " + ymT + " 기준이에요"}</span></div>
      <div className="a-table-wrap"><table className="a-table md-acc"><thead><tr><th>채널 · 팀</th><th>아이디 · 링크 코드</th><th>구독자 · RS율</th><th className="right">{mCol}</th><th className="right">누적</th><th>정산 계좌</th><th>상태</th><th className="right"></th></tr></thead><tbody>{rows.map((x) => { const a = x.a, yt = A.mdYtLink(a), id = { "data-id": a.id }; return (
        <tr key={a.id}><td><b>{A.mdName(a)}</b><small className="a-memo">{(a.name || "") + (a.demo ? " · 예시" : "")}</small>{yt ? <Isl html={yt} /> : <small className="a-memo md-yt-none">채널 주소 미입력 · ‘수정’에서 넣어 주세요</small>}</td>
          <td>{a.loginId || "-"}<small className="a-memo">{"?rs=" + X.rsCode(a.code) + (a.hasPw === false || (!DB.remote.on && !a.pw) ? " · 비밀번호 없음" : "")}</small></td>
          <td>{A.mdSubsTxt(a)}<small className="a-memo"><b>RS {A.mdRate(a)}%</b> · {A.mdRateWhy(a)}</small></td>
          <td className="right num">{x.cur.n}건<small className="a-memo">{won(Math.max(0, x.cur.net))}</small></td><td className="right num">{x.all.length}건<small className="a-memo">{won(A.mdSum(x.all, A.mdRs))}</small></td>
          <td>{a.account ? <>{X.bankName(a.bank) || a.bank || ""}<small className="a-memo">{(a.holder || "") + (a.bankAt ? " · " + A.vdWhen(a.bankAt) + " 변경" : "")}</small></> : <Pill cls="warn">미등록</Pill>}</td>
          <td>{a.status === "active" ? <Pill cls="ok">사용 중</Pill> : <Pill cls="mute">중지</Pill>}{a.lastLoginAt ? <small className="a-memo">{A.vdWhen(a.lastLoginAt)} 접속</small> : null}</td>
          <td className="right vs-acts"><Btn action="md-links" cls="a-btn-ghost a-btn-sm" {...id}>홍보 링크</Btn><Btn action="md-edit" cls="a-btn-ghost a-btn-sm" {...id}>수정</Btn><Btn action="md-toggle" cls="a-btn-ghost a-btn-sm" {...id}>{a.status === "active" ? "중지" : "다시 사용"}</Btn></td></tr>); })}</tbody></table></div></>
      : <Empty ic="monitorPlay" extra={<AddBtn />}>아직 온드미디어 계정이 없어요.<br />‘새 온드미디어 계정’으로 YouTube 채널 팀 계정을 만들어 주세요.</Empty>}</section>
    <section className="a-card a-settle-note"><h2><Icon n="shieldCheck" c="sm" /> 운영 규칙</h2><ul>
      <li>계정마다 링크 코드가 달라 VOD마다 고유한 홍보 링크가 생겨요. 채널이 10개면 계정도 10개 · 링크도 VOD × 10개예요.</li>
      <li>RS율: 구독자 {A.manTxt(R.subs)} 이상 {R.hi}% · 미만 {R.lo}% (계정에서 직접 정할 수도 있어요). 결제한 때 비율이 주문에 남아서, 나중에 바꿔도 지난 주문은 그대로예요.</li>
      <li>RS = (판매가 − 환불) × (1 − PG {R.pg}%) × RS율 — 강사 정산은 판매가에서 RS를 먼저 뺀 금액 × 강사 비율이에요. 강사센터 › 판매 정산 · 정산 달력에 채널 · RS가 그대로 보여요.</li>
      <li>링크를 누른 뒤 {R.days}일 안에 그 강의를 사면 RS 대상 (같은 강의는 마지막 링크 기준). 종이책 · 코칭권 · TEA TIME · 연장권은 RS가 없어요.</li>
      <li>비밀번호는 서버에 암호화(해시)해서만 저장돼 마스터도 볼 수 없어요. 잊었다면 ‘수정’에서 새 비밀번호를 정해 알려 주세요.</li></ul></section>
  </>;
}

/* ---------------- 채널 성과 · 홍보 링크 #/center/master/vod-media-rs (예전 pageMasterMediaRs) ----------------
 *  · 홍보 링크 한 줄(mdLinkRow)은 온드미디어 센터와 같이 쓰는 예전 조각이에요 */
export function MasterMediaRs() {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won;
  A.mdSeed();
  const pk = ui.mdRP || "month", pr = A.mdPeriod(pk), list = A.mdList(), all = A.mdOrders().filter((o) => A.vdKeep(o) > 0 && A.mdInPeriod(o, pr));
  const ch = list.map((a) => { const os = all.filter((o) => o.rs.mid === a.id), c = {}; os.forEach((o) => { c[o.pid] = (c[o.pid] || 0) + 1; }); return { a, n: os.length, base: A.mdSum(os, A.mdBase), rs: A.mdSum(os, A.mdRs), top: Object.keys(c).sort((x, y) => c[y] - c[x]).slice(0, 2).map((pid) => ((A.vdP(pid) || {}).title || "삭제된 상품") + " " + c[pid] + "건") }; }).sort((x, y) => y.base - x.base || y.n - x.n);
  const vp = {}; all.forEach((o) => { const x = (vp[o.pid] = vp[o.pid] || { n: 0, base: 0, rs: 0, by: {} }); x.n++; x.base += A.mdBase(o); x.rs += A.mdRs(o); x.by[o.rs.mid] = (x.by[o.rs.mid] || 0) + 1; });
  const vps = Object.keys(vp).map((pid) => Object.assign({ pid }, vp[pid])).sort((x, y) => y.base - x.base), maxB = Math.max(1, ...ch.map((x) => x.base));
  const lkA = ui.mdLkA && A.mdOf(ui.mdLkA) ? A.mdOf(ui.mdLkA) : list[0] || null, lkP = ui.mdLkP || "", lps = A.mdLinkProducts();
  const span = A.vdYMtxt(pr[0] === "0000-00" ? DB.date.todayStr().slice(0, 7) : pr[0]) + (pr[0] !== pr[1] && pr[0] !== "0000-00" ? " ~ " + A.vdYMtxt(pr[1]) : pk === "all" ? " · 전체 기간" : "");
  return <>
    <Head title="채널 성과 · 홍보 링크" sub="어떤 YouTube 채널이 어떤 VOD를 얼마나 팔았는지, 그리고 채널별 · VOD별 홍보 링크를 한곳에서 봐요." right={<Btn action="md-csv-all" cls="a-btn-ghost"><Icon n="download" c="sm" />링크 판매 CSV</Btn>} />
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{A.MD_PERIODS.map((x) => <button key={x[0]} type="button" className={"a-tab" + (pk === x[0] ? " on" : "")} data-action="md-rp" data-k={x[0]}>{x[1]}</button>)}</div><span className="a-muted">링크 판매 {all.length}건 · 판매가 {won(A.mdSum(all, A.mdBase))} · RS <b>{won(A.mdSum(all, A.mdRs))}</b></span></div>
      {ch.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>순위</th><th>채널</th><th>RS율</th><th className="right">판매</th><th className="right">판매가 합계</th><th className="right">RS</th><th>많이 판 VOD</th></tr></thead><tbody>{ch.map((x, i) => (
        <tr key={x.a.id}><td className="num"><b>{x.n ? i + 1 : "-"}</b></td><td><b>{A.mdName(x.a)}</b><div className="md-bar-h"><span style={{ width: Math.round(x.base / maxB * 100) + "%" }} /></div></td><td className="num">{A.mdRate(x.a)}%</td><td className="right num">{x.n}건</td><td className="right num">{won(x.base)}</td><td className="right num"><b>{won(x.rs)}</b></td><td>{x.top.length ? x.top.join(" · ") : <span className="a-muted">-</span>}</td></tr>))}</tbody></table></div>
        : <Empty ic="monitorPlay" extra={<a className="a-btn a-btn-primary a-btn-sm" href="#/center/master/vod-media">계정 만들기</a>}>아직 온드미디어 계정이 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>VOD별 링크 판매</h2><span className="a-muted">{span}</span></div>
      {vps.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>VOD</th><th>강사</th><th className="right">판매</th><th className="right">판매가 합계</th><th className="right">RS</th><th>채널별</th></tr></thead><tbody>{vps.map((x) => { const p = A.vdP(x.pid); return (
        <tr key={x.pid}><td>{(p || {}).title || "삭제된 상품"}</td><td>{A.mdCreator(p)}</td><td className="right num">{x.n}건</td><td className="right num">{won(x.base)}</td><td className="right num">{won(x.rs)}</td><td>{Object.keys(x.by).map((mid) => A.mdName(A.mdOf(mid)) + " " + x.by[mid]).join(" · ")}</td></tr>); })}</tbody></table></div>
        : <Empty ic="monitorPlay">이 기간에 링크로 팔린 VOD가 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>홍보 링크 찾기</h2><span className="a-muted">채널을 고르면 그 채널의 VOD별 링크, VOD를 고르면 채널별 링크</span></div>
      {list.length ? <><div className="a-toolbar md-lk-tools"><label className="a-field-inline"><span>채널</span><select key={(lkA ? lkA.id : "") + ":" + lkP} className="a-input a-sm" id="md-lk-a" defaultValue={lkA && !lkP ? lkA.id : list[0].id}>{list.map((a) => <option key={a.id} value={a.id}>{A.mdName(a)}</option>)}</select></label>
          <label className="a-field-inline"><span>또는 VOD</span><select key={lkP} className="a-input a-sm" id="md-lk-p" defaultValue={lkP}><option value="">VOD 고르기</option>{lps.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label></div>
        {lkP && A.vdP(lkP) ? <div className="vs-links md-links">{list.filter((a) => a.status === "active").map((a) => { const u = X.rsUrl(lkP, a.code); return <div key={a.id} className="vs-link md-link"><span className="vs-link-t"><span><b>{A.mdName(a)}</b><small className="a-memo">{"RS " + A.mdRate(a) + "% · ?rs=" + X.rsCode(a.code)}</small></span></span><input className="a-input a-sm" value={u} readOnly data-md-sel="" aria-label={A.mdName(a) + " 링크"} /><span className="md-link-btns"><Btn action="md-copy" cls="a-btn-primary a-btn-sm" data-u={u}><Icon n="link" c="sm" />복사</Btn></span></div>; })}</div>
          : lkA ? <div className="vs-links md-links">{lps.map((p) => <Isl key={p.id} html={A.mdLinkRow(p, lkA)} />)}</div> : null}</>
        : <Empty ic="link">계정을 만들면 VOD마다 링크가 생겨요.</Empty>}</section>
  </>;
}

/* ---------------- RS 정산 #/center/master/vod-media-pay (예전 pageMasterMediaPay · mdStmtCells · mdRangeCard) ---------------- */
export function MdStmtCells({ x, s, act }) {
  const A = ADM(), DB = DBX(), won = A.won, has = x.n || x.rec || x.ded || x.carry;
  return <><td><b>{A.vdYMtxt(x.ym)}</b><small className="a-memo">{DB.date.fmtFull(A.vdPayDate(x.ym))} 지급</small></td><td className="num">{x.n}건</td><td className="right num">{won(x.base)}</td><td className="right num">{won(x.rs)}</td><td className="right num">{x.ded || x.carry ? "- " + won(x.ded + x.carry) : "0원"}</td>
    <td className="right num">{x.wh ? "- " + won(x.wh) : x.biz ? <small className="a-memo">세금계산서</small> : "0원"}</td><td className="right num"><b>{won(x.pay)}</b>{x.next ? <small className="a-memo vs-next">다음 달 이월 {won(x.next)}</small> : null}</td>
    <td>{has ? <Pill cls={s.c}>{s.t}</Pill> : <span className="a-muted">-</span>}</td><td className="right vs-acts">{has ? <Btn action="md-stm" cls="a-btn-ghost a-btn-sm" data-id={x.id} data-m={x.ym}>명세서</Btn> : null}{act || null}</td></>;
}
function RangeCard({ n }) {
  const A = ADM(), DB = DBX(), won = A.won, t0 = DB.date.todayStr(), r = A.mdRange(), f = r[0], t = r[1], os = A.mdRangeOrders(f, t), live = os.filter((o) => A.vdKeep(o) > 0), refN = os.filter((o) => o.status === "refunded").length, ff = DB.date.fmtFull;
  const by = {};
  os.forEach((o) => { const x = (by[o.rs.mid] = by[o.rs.mid] || { id: o.rs.mid, ch: o.rs.ch, n: 0, base: 0, rs: 0, ref: 0 }); if (o.status === "refunded") x.ref++; if (A.vdKeep(o) > 0) { x.n++; x.base += A.mdBase(o); x.rs += A.mdRs(o); } });
  const rows = Object.keys(by).map((k) => by[k]).sort((a, b) => b.rs - a.rs || b.n - a.n), pre = A.MD_RANGES.find((x) => { const q = A.mdRangeOf(x[0]); return q[0] === f && q[1] === t; });
  return <section className="a-card md-range-card"><div className="a-card-head"><h2><Icon n="calendar" c="sm" /> 기간 조회</h2><span className="a-muted">결제일 기준 · 날짜를 골라 채널별 링크 판매 · RS 를 봐요 (월별 확정 · 지급과는 따로, 보기 전용)</span></div>
    <form key={n} id="mdr-form" className="md-range" noValidate>
      <label className="md-range-d"><span>시작일</span><input className="a-input" type="date" name="from" defaultValue={f} max={t0} /></label><span className="md-range-sep" aria-hidden="true">~</span>
      <label className="md-range-d"><span>종료일</span><input className="a-input" type="date" name="to" defaultValue={t} max={t0} /></label>
      <button type="submit" className="a-btn a-btn-primary md-range-go"><Icon n="search" c="sm" />조회</button>
      <div className="a-tabs md-range-pre">{A.MD_RANGES.map((x) => <button key={x[0]} type="button" className={"a-tab" + (pre && pre[0] === x[0] ? " on" : "")} data-action="mdr-pre" data-k={x[0]}>{x[1]}</button>)}</div></form>
    <div className="md-range-sum"><span><b>{ff(f) + " ~ " + ff(t)}</b> · 판매 <b>{live.length}건</b> · 판매가 <b>{won(A.mdSum(live, A.mdBase))}</b> · RS <b>{won(A.mdSum(live, A.mdRs))}</b>{refN ? " · 환불 " + refN + "건" : ""}</span>{os.length ? <Btn action="mdr-csv" cls="a-btn-ghost a-btn-sm"><Icon n="download" c="sm" />CSV</Btn> : null}</div>
    {rows.length ? <><div className="a-table-wrap"><table className="a-table vs-table md-range-t"><thead><tr><th>채널</th><th className="right">판매</th><th className="right">판매가 합계</th><th className="right">환불</th><th className="right">RS</th></tr></thead><tbody>
        {rows.map((x) => { const a = A.mdOf(x.id); return <tr key={x.id}><td><b>{a ? A.mdName(a) : x.ch || "삭제된 채널"}</b>{a ? <Isl html={A.mdYtLink(a)} /> : null}</td><td className="right num">{x.n}건</td><td className="right num">{won(x.base)}</td><td className="right num">{x.ref ? x.ref + "건" : "-"}</td><td className="right num"><b>{won(x.rs)}</b></td></tr>; })}
      </tbody><tfoot><tr><td><b>합계</b></td><td className="right num"><b>{live.length}건</b></td><td className="right num"><b>{won(A.mdSum(live, A.mdBase))}</b></td><td className="right num">{refN ? refN + "건" : "-"}</td><td className="right num"><b>{won(A.mdSum(live, A.mdRs))}</b></td></tr></tfoot></table></div>
      <details className="md-range-os"><summary>주문 {os.length}건 보기</summary><Isl html={A.mdOrderTable(os, { master: true })} /></details></>
      : <Empty ic="calendar">{ff(f) + " ~ " + ff(t)} 사이에 링크 판매가 없어요.</Empty>}</section>;
}
export function MasterMediaPay({ n }) {
  const A = ADM(), DB = DBX(), X = A.VX(), won = A.won;
  A.mdSeed();
  const ym = A.ui.mdPM || A.vdYMadd(DB.date.todayStr().slice(0, 7), -1), list = A.mdList(), sts = list.map((a) => { const st = A.mdStmt(a.id, ym); st.s = A.mdStState(st); st.a = a; return st; });
  const shown = sts.filter((x) => x.n || x.rec || x.ded || x.carry), tot = (k) => shown.reduce((s, x) => s + (x[k] || 0), 0);
  return <>
    <Head title="RS 정산" sub="달마다 온드미디어 채널별 RS를 확정하고 지급을 기록해요. 매달 1일~말일 판매분을 다음 달 10일에 지급해요. 확정하면 온드미디어 센터에 명세서가 고정돼요." right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-settle"><Icon n="calculator" c="sm" />강사 정산</a>} />
    <section className="a-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="md-pm" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{A.vdYMtxt(ym)} 판매분</h2><button type="button" className="a-icon-btn" data-action="md-pm" data-dir="1" aria-label="다음 달"><Icon n="chevRight" /></button><span className="a-cal-sum">{DB.date.fmtFull(A.vdPayDate(ym))} 지급 · 판매 <b>{tot("n")}건</b> · RS <b>{won(tot("rs"))}</b> · 지급 <b>{won(tot("pay"))}</b></span></div>
      {shown.length ? <div className="a-table-wrap"><table className="a-table vs-table"><thead><tr><th>채널</th><th>판매 월</th><th>판매</th><th className="right">판매가 합계</th><th className="right">RS</th><th className="right">차감</th><th className="right">세금</th><th className="right">지급액</th><th>상태</th><th className="right"></th></tr></thead><tbody>{shown.map((x) => {
        const k = x.s.k, at = { "data-id": x.id, "data-m": ym };
        const act = k === "ready" ? <Btn action="mdp-ok" cls="a-btn-primary a-btn-sm" {...at}>확정</Btn> : k === "confirmed" ? <><Btn action="mdp-pay" cls="a-btn-primary a-btn-sm" {...at}>지급 완료</Btn><Btn action="mdp-undo" cls="a-btn-ghost a-btn-sm" {...at}>확정 취소</Btn></> : k === "paid" ? <Btn action="mdp-unpay" cls="a-btn-ghost a-btn-sm" {...at}>지급 취소</Btn> : null;
        return <tr key={x.id}><td><b>{A.mdName(x.a)}</b><small className="a-memo">{(x.a.account ? (X.bankName(x.a.bank) || x.a.bank || "") + " " + x.a.account + " · " + (x.a.holder || "") : "계좌 미등록") + " · " + (x.biz ? "사업자" : "개인")}</small></td><MdStmtCells x={x} s={x.s} act={act} /></tr>; })}</tbody></table></div>
        : <Empty ic="calculator">{A.vdYMtxt(ym)}에는 링크 판매가 없어요.</Empty>}</section>
    <RangeCard n={n} />
    <section className="a-card a-settle-note"><h2><Icon n="shieldCheck" c="sm" /> 확정 · 지급</h2><ul><li>달이 끝나면 ‘마감 · 확정 대기’가 돼요. 금액을 확인하고 ‘확정’하면 명세서가 고정되고, 그 뒤 환불은 다음 달 RS에서 빠져요.</li><li>지급(이체)한 뒤 ‘지급 완료’를 누르면 온드미디어 센터에 ‘지급 완료’로 보여요. 개인은 3.3%를 뗀 금액, 사업자는 세금계산서를 받은 뒤 RS 금액을 보내 주세요.</li><li>강사 정산은 RS를 먼저 뺀 금액으로 계산돼요 (강사 정산 · 강사센터에 채널 · RS 표시).</li></ul></section>
  </>;
}
