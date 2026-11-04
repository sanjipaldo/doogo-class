"use client";
/* 마스터 두잉고 — 기수 신청 · 매출 #/center/master/billing
 * 예전 admin.js pageMasterBilling · billTodoList · billCalendar · billSales · billAll · billSettings 를 React 로 (Next.js 전환 6단계)
 *  · 신청 카드(billCard)는 강사센터 ‘다음 기수 신청’과 같이 쓰는 예전 조각이에요 · 탭 · 달력 · 고르기 · 저장은 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

function TodoList({ all }) {
  const A = ADM(), list = all.filter(A.billTodo);
  return <section className="a-card"><div className="a-card-head"><h2>처리할 신청</h2><span className="a-muted">입금 · 세금계산서 · 기수 열기가 남은 신청 {list.length}건</span></div>
    {list.length ? <div className="a-stack">{list.map((b) => <Isl key={b.id} html={A.billCard(b, true)} />)}</div> : <Empty ic="check">처리할 신청이 없어요. 새 신청이 들어오면 왼쪽 메뉴에 숫자로 보여요.</Empty>}</section>;
}
function Calendar({ all }) {
  const A = ADM(), DB = DBX(), ui = A.ui, won = A.won, ym = ui.calYM || DB.date.todayStr().slice(0, 7), y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  const startDow = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate(), today = DB.date.todayStr(), CT = A.CAL_TYPES, order = CT.map((t) => t[0]);
  const ev = A.billEvents(all).filter((e) => e.date && e.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date) || order.indexOf(a.type) - order.indexOf(b.type));
  const byDay = {}; ev.forEach((e) => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(<div key={"o" + i} className="a-cal-d out"></div>);
  for (let d = 1; d <= days; d++) {
    const ds = ym + "-" + String(d).padStart(2, "0"), list = byDay[ds] || [], dow = (startDow + d - 1) % 7;
    cells.push(<button key={ds} type="button" className={"a-cal-d" + (ds === today ? " today" : "") + (ds === ui.calDay ? " on" : "") + (dow === 0 ? " sun" : dow === 6 ? " sat" : "") + (list.length ? " has" : "")} data-action="cal-day" data-d={ds} aria-label={m + "월 " + d + "일 일정 " + list.length + "개"}><span className="a-cal-n">{d}</span>
      {list.slice(0, 3).map((e, i) => <span key={i} className={"a-cal-ev t-" + e.type}>{e.label}</span>)}{list.length > 3 ? <span className="a-cal-more">+{list.length - 3}</span> : null}
      {list.length ? <span className="a-cal-dots">{list.slice(0, 4).map((e, i) => <i key={i} className={"t-" + e.type} />)}</span> : null}</button>);
  }
  let k = 0; while (cells.length % 7) cells.push(<div key={"e" + k++} className="a-cal-d out"></div>);
  const mb = all.filter((b) => A.paidIn(b, ym)), sel = ui.calDay && ui.calDay.slice(0, 7) === ym ? ui.calDay : null, listEv = sel ? byDay[sel] || [] : ev;
  const typeLabel = (t) => (CT.find((x) => x[0] === t) || ["", ""])[1];
  return <><section className="a-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="cal-move" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{y}년 {m}월</h2><button type="button" className="a-icon-btn" data-action="cal-move" data-dir="1" aria-label="다음 달"><Icon n="chevRight" /></button><Btn action="cal-today" cls="a-btn-ghost a-btn-sm">오늘</Btn>
      <span className="a-cal-sum">이 달 입금 {mb.length}건 · <b>{won(A.sumMoney(mb, "supply"))}</b></span></div>
    <div className="a-cal-legend">{CT.map((t) => <span key={t[0]}><i className={"t-" + t[0]} />{t[1]}</span>)}</div>
    <div className="a-cal"><div className="a-cal-w">{DB.date.DOW.map((d) => <span key={d}>{d}</span>)}</div><div className="a-cal-g">{cells}</div></div></section>
    <section className="a-card"><div className="a-card-head"><h2>{sel ? fmtMD(sel) + " 일정" : m + "월 일정"}</h2>{sel ? <Btn action="cal-day" cls="a-btn-ghost a-btn-sm" data-d="">이 달 전체 보기</Btn> : <span className="a-muted">{ev.length}개</span>}</div>
      {listEv.length ? <ul className="a-list a-cal-list">{listEv.map((e, i) => <li key={i} className={e.id ? "clickable" : undefined} data-action={e.id ? "bill-edit" : undefined} data-id={e.id || undefined}><span className="a-cal-date num">{fmtMD(e.date)}</span><span className={"a-cal-tag t-" + e.type}>{typeLabel(e.type)}</span><b>{e.label}</b></li>)}</ul>
        : <Empty ic="calendar">{sel ? "이 날짜에는 일정이 없어요." : "이 달에는 일정이 없어요."}</Empty>}</section></>;
}
function Sales({ all }) {
  const A = ADM(), DB = DBX(), won = A.won, y = A.ui.revYear || Number(DB.date.todayStr().slice(0, 4));
  const paid = all.filter((b) => !b.canceledAt && b.paidAt), yr = paid.filter((b) => b.paidAt.slice(0, 4) === String(y));
  const add = (a, b) => { const m = DB.billMoney(b); a.n++; a.supply += m.supply; a.tax += m.tax; a.total += m.total; if (b.invoiceAt) a.inv++; return a; };
  const zero = () => ({ n: 0, supply: 0, tax: 0, total: 0, inv: 0 });
  const months = Array.from({ length: 12 }, (_, i) => { const pre = y + "-" + String(i + 1).padStart(2, "0"); return Object.assign({ i, pre }, yr.filter((b) => b.paidAt.slice(0, 7) === pre).reduce(add, zero())); });
  const tot = yr.reduce(add, zero()), max = Math.max(1, ...months.map((x) => x.supply)), thisM = DB.date.todayStr().slice(0, 7), byIns = {}, years = {};
  yr.forEach((b) => add(byIns[b.instructorId] = byIns[b.instructorId] || zero(), b));
  paid.forEach((b) => add(years[b.paidAt.slice(0, 4)] = years[b.paidAt.slice(0, 4)] || zero(), b));
  const short = (n) => (n >= 10000 ? Math.round(n / 10000).toLocaleString("ko-KR") + "만" : n.toLocaleString("ko-KR"));
  const Inv = ({ x }) => (!x.n ? <span className="a-muted">-</span> : x.inv === x.n ? <Pill cls="ok">모두 발행</Pill> : <Pill cls="warn">{"미발행 " + (x.n - x.inv) + "건"}</Pill>);
  return <><section className="a-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="rev-year" data-dir="-1" aria-label="이전 해"><Icon n="chevLeft" /></button><h2>{y}년 매출</h2><button type="button" className="a-icon-btn" data-action="rev-year" data-dir="1" aria-label="다음 해"><Icon n="chevRight" /></button>
      <span className="a-cal-sum">입금 {tot.n}건 · 공급가 <b>{won(tot.supply)}</b> · 부가세 포함 {won(tot.total)}</span></div>
    <div className="a-rev-chart" aria-hidden="true">{months.map((x) => <div key={x.pre} className={"a-rev-col" + (x.pre === thisM ? " now" : "")}><small className="num">{x.supply ? short(x.supply) : ""}</small><span className="a-rev-bar"><i style={{ height: (x.supply ? Math.max(3, Math.round(x.supply / max * 100)) : 0) + "%" }} /></span><b>{x.i + 1}월</b></div>)}</div>
    <div className="a-table-wrap"><table className="a-table a-rev-table"><thead><tr><th>월</th><th>입금</th><th>공급가액 (매출)</th><th>부가세</th><th>합계</th><th>세금계산서</th></tr></thead><tbody>
      {months.map((x) => <tr key={x.pre} className={x.n ? undefined : "a-dim"}><td><b>{y}년 {x.i + 1}월</b></td><td className="num">{x.n}건</td><td className="num">{won(x.supply)}</td><td className="num">{won(x.tax)}</td><td className="num">{won(x.total)}</td><td><Inv x={x} /></td></tr>)}
      <tr className="a-rev-total"><td><b>{y}년 합계</b></td><td className="num"><b>{tot.n}건</b></td><td className="num"><b>{won(tot.supply)}</b></td><td className="num">{won(tot.tax)}</td><td className="num"><b>{won(tot.total)}</b></td><td><Inv x={tot} /></td></tr></tbody></table></div></section>
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>강사별 {y}년 매출</h2></div>{Object.keys(byIns).length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th>기수</th><th>공급가액</th><th>합계</th></tr></thead><tbody>
        {Object.keys(byIns).sort((a, b) => byIns[b].supply - byIns[a].supply).map((k) => <tr key={k}><td><b>{A.insName(k)}</b></td><td className="num">{byIns[k].n}건</td><td className="num">{won(byIns[k].supply)}</td><td className="num">{won(byIns[k].total)}</td></tr>)}</tbody></table></div> : <Empty ic="coins">이 해에 입금된 이용료가 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>연도별 매출</h2></div>{Object.keys(years).length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>연도</th><th>입금</th><th>공급가액</th><th>합계</th></tr></thead><tbody>
        {Object.keys(years).sort().reverse().map((k) => <tr key={k} className="clickable" data-action="rev-year-set" data-y={k}><td><b>{k}년</b></td><td className="num">{years[k].n}건</td><td className="num">{won(years[k].supply)}</td><td className="num">{won(years[k].total)}</td></tr>)}</tbody></table></div> : <Empty ic="coins">아직 입금된 이용료가 없어요.</Empty>}</section>
    </div></>;
}
function All({ all }) {
  const A = ADM(), DB = DBX(), ui = A.ui, won = A.won, fi = ui.billIns || "all", fs = ui.billState || "all";
  const list = all.filter((b) => (fi === "all" || b.instructorId === fi) && (fs === "all" || (fs === "noinv" ? !b.canceledAt && b.paidAt && !b.invoiceAt : DB.billState(b) === fs)));
  const insIds = DB.data.instructors.map((x) => x.id).concat(all.map((b) => b.instructorId)).filter((v, i, a) => a.indexOf(v) === i);
  return <section className="a-card"><div className="a-toolbar"><div className="a-filters">
      <select key={fi} className="a-input a-sm" id="bill-ins" aria-label="강사" defaultValue={fi}><option value="all">전체 강사</option>{insIds.map((k) => <option key={k} value={k}>{A.insName(k)}</option>)}</select>
      <select key={fs} className="a-input a-sm" id="bill-state" aria-label="상태" defaultValue={fs}><option value="all">전체 상태</option>{Object.keys(DB.BILL_STATE).map((k) => <option key={k} value={k}>{DB.BILL_STATE[k].label}</option>)}<option value="noinv">계산서 미발행</option></select>
    </div><span className="a-muted">{list.length}건 · 공급가 {won(A.sumMoney(list.filter((b) => !b.canceledAt && b.paidAt), "supply"))} 입금</span></div>
    {list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사 · 기수</th><th>신청일</th><th>1인 수강료</th><th>이용료 (합계)</th><th>입금</th><th>세금계산서</th><th>기수</th><th>상태</th><th className="right">관리</th></tr></thead><tbody>{list.map((b) => {
      const m = DB.billMoney(b), st = DB.BILL_STATE[DB.billState(b)], co = b.cohortId ? DB.cohort(b.cohortId) : null;
      return <tr key={b.id}><td><b>{A.insName(b.instructorId) + " · " + (b.cohortName || "-")}</b><small className="a-memo">{A.BILL_KIND[b.kind] || A.BILL_KIND.next}</small></td><td className="num">{b.requestedAt ? fmtMD(A.dayOf(b.requestedAt)) : "-"}</td><td className="num">{b.fee ? won(b.fee) : "-"}</td><td className="num">{won(m.total)}{m.tax ? <small className="a-memo">공급가 {won(m.supply)}</small> : null}</td>
        <td>{b.paidAt ? fmtMD(b.paidAt) : <span className="a-muted">미입금</span>}</td><td>{b.invoiceAt ? fmtMD(b.invoiceAt) : <span className="a-muted">미발행</span>}</td><td>{co ? <>{co.name} <small className="a-memo">{fmtMD(co.startDate)} 시작</small></> : <span className="a-muted">-</span>}</td><td><Pill cls={st.cls}>{st.label}</Pill></td>
        <td className="right"><Btn action="bill-edit" cls="a-btn-ghost a-btn-sm" data-id={b.id}>수정</Btn></td></tr>; })}</tbody></table></div>
      : <Empty ic="coins">{all.length ? "조건에 맞는 기록이 없어요." : "아직 이용료 기록이 없어요."}</Empty>}</section>;
}
function Settings({ n }) {
  const DB = DBX(), bi = DB.billingInfo();
  const Fld = ({ k, label, ph }) => <div className="a-field"><label htmlFor={"bl-" + k}>{label}</label><input className="a-input" id={"bl-" + k} name={k} defaultValue={bi[k] || ""} placeholder={ph} maxLength={60} /></div>;
  return <form key={n} id="billing-form" className="a-site-form" noValidate><section className="a-card"><div className="a-card-head"><h2>입금 계좌 · 부가세</h2><span className="a-muted">강사센터 ‘다음 기수 신청’ 화면에 보여요 (수강생 · 방문자에게는 안 보여요)</span></div>
    <div className="a-site-grid"><Fld k="bank" label="은행" ph="예: 국민은행" /><Fld k="account" label="계좌번호" ph="예: 000000-00-000000" /><Fld k="holder" label="예금주" ph="예: (주)두고홀딩스" />
      <div className="a-field"><label htmlFor="bl-vat">부가세</label><select className="a-input" id="bl-vat" name="vat" defaultValue={bi.vat}>{DB.BILL_VAT.map((v) => <option key={v[0]} value={v[0]}>{v[1]}</option>)}</select></div>
      <div className="a-field a-span2"><label htmlFor="bl-note">강사님께 보일 안내 <small>(선택)</small></label><textarea className="a-input" id="bl-note" name="note" rows={2} maxLength={300} placeholder="예: 입금자명은 강사님 성함으로 해 주세요." defaultValue={bi.note || ""} /></div>
    </div><p className="a-muted" style={{ margin: "12px 0 0" }}>부가세 방식은 앞으로 확인하는 입금부터 적용돼요. 이미 입금 확인한 기록은 그때 방식 그대로 남아요.</p></section>
    <div className="a-site-save"><button type="submit" className="a-btn a-btn-primary"><Icon n="check" c="sm" />저장</button></div></form>;
}
export function MasterBilling({ r, n }) {
  const A = ADM(), DB = DBX(), ui = A.ui, tq = r && r.params && r.params.get("tab");
  if (tq && A.BILL_TABS.some((t) => t[0] === tq)) { ui.billTab = tq; window.ROUTE.replace("#/center/master/billing"); }
  const all = DB.bills(), tab = ui.billTab || "todo";
  DB.store.set("moonclass:bill-seen", all.map((b) => b.id).slice(-300));
  const cnt = { todo: all.filter(A.billTodo).length, all: all.length };
  return <>
    <Head title="기수 신청 · 매출" sub="강사님이 강사센터에서 ‘다음 기수 신청’을 하면 여기로 들어와요. 전화 → 무통장 입금 확인 → 세금계산서 발행 → 기수 열기 순서로 처리해요. 이용료 = 강사님 1인 수강료 × 1명분." right={<><Btn action="bill-csv" cls="a-btn-ghost"><Icon n="download" c="sm" />CSV 내려받기</Btn><Btn action="bill-add" cls="a-btn-primary"><Icon n="plus" c="sm" />직접 기록</Btn></>} />
    <Isl html={A.billKpis()} />
    <div className="a-tabs a-btabs">{A.BILL_TABS.map((t) => <button key={t[0]} type="button" className={"a-tab" + (tab === t[0] ? " on" : "")} data-action="bill-tab" data-k={t[0]}>{t[1]}{cnt[t[0]] != null ? <> <span className="num">{cnt[t[0]]}</span></> : null}</button>)}</div>
    {tab === "cal" ? <Calendar all={all} /> : tab === "sales" ? <Sales all={all} /> : tab === "all" ? <All all={all} /> : tab === "set" ? <Settings n={n} /> : <TodoList all={all} />}
  </>;
}

/* ---------------- 기수 · 일정 설계 #/center/master/plan (예전 pageMasterPlan · planCard) ----------------
 *  · 설계 · 수정 창은 아직 예전 창이에요 · 주차 줄(weekStrip) · 일정 칩(planChips)은 강사센터와 같이 쓰는 예전 조각 */
function PlanCard({ iid, co }) {
  const A = ADM(), DB = DBX(), st = DB.cohortStatus(co), wk = DB.weeksOf(co), sp = A.planEvs(iid, co.id);
  const ss = DB.studentsOf(iid).filter((s) => s.cohortId === co.id), ap = ss.filter((s) => s.status === "approved").length, at = { "data-iid": iid, "data-id": co.id };
  return <section className="a-card pl-card"><div className="a-card-head"><h2>{co.name}</h2><Pill cls={A.COHORT_CLS[st]}>{DB.STATUS_LABEL[st]}</Pill>{co.recruiting && st !== "ended" ? <Pill cls="info">신청 받는 중</Pill> : null}
      <span className="a-muted">수강생 {ap}명{ss.length > ap ? " · 대기 " + (ss.length - ap) + "명" : ""}</span>
      <div className="a-row-actions"><Btn action="plan-pv" cls="a-btn-ghost a-btn-sm" {...at}><Icon n="eye" c="sm" />미리보기</Btn><Btn action="plan-edit" cls="a-btn-primary a-btn-sm" {...at}><Icon n="pen" c="sm" />설계 · 수정</Btn></div></div>
    <p className="pl-when"><Icon n="calendar" c="xs" /> 1주차 <b>{A.mdDow(DB.classDate(co, 1))}</b> → {wk.length}주차 <b>{A.mdDow(DB.classDate(co, wk.length))}</b> · {wk.length}주 · {A.classText(co)} <span className="a-cur-chip"><Icon n="book" c="xs" />{DB.curriculumOf(co).name}</span></p>
    {sp.length ? <Isl html={A.planChips(iid, co)} /> : <p className="a-muted p-small">특별 일정 없음 · ‘설계 · 수정’에서 무료 강의 · 오프라인 강의 · 챌린지 날짜를 넣을 수 있어요.</p>}
    <Isl html={A.weekStrip(co)} /></section>;
}
export function MasterPlan({ r }) {
  const A = ADM(), DB = DBX(), ui = A.ui, list = DB.data.instructors.filter((i) => i.status === "active" && DB.content(i.id));
  const want = (r && r.params && r.params.get("ins")) || ui.planIns, ins = list.find((i) => i.id === want) || list[0];
  if (!ins) return <><Head title="기수 · 일정 설계" sub="" /><section className="a-card"><Empty ic="layers">아직 운영 중인 강사 플랫폼이 없어요.</Empty></section></>;
  ui.planIns = ins.id;
  const iid = ins.id, cos = DB.cohortsOf(iid), rules = ((DB.content(iid) || {}).schedule || []).filter((e) => e.scope !== "cohort");
  const NewBtn = ({ cls }) => <Btn action="plan-new" cls={cls} data-iid={iid}><Icon n="plus" c="sm" />새 기수 설계</Btn>;
  return <>
    <Head title="기수 · 일정 설계" sub="강사님마다 기수를 열고 1주차 강의일 · 진행 주차 · 무료 강의 · 오프라인 강의 · 챌린지 날짜를 정해요. 저장하면 그 기수 수강생 대시보드 · 수업 캘린더에 바로 보여요." right={<NewBtn cls="a-btn-primary" />} />
    <div className="pl-ins" role="tablist" aria-label="강사">{list.map((i) => <button key={i.id} type="button" role="tab" className={"pl-ins-b" + (i.id === iid ? " on" : "")} aria-selected={String(i.id === iid)} data-action="plan-ins" data-id={i.id}><b>{i.displayName}</b><small>{DB.cohortsOf(i.id).length}개 기수</small></button>)}</div>
    {cos.length ? <div className="a-stack">{cos.map((co) => <PlanCard key={co.id} iid={iid} co={co} />)}</div> : <section className="a-card"><Empty ic="layers" extra={<NewBtn cls="a-btn-primary a-btn-sm" />}>{ins.displayName} 강사님은 아직 기수가 없어요. ‘새 기수 설계’로 첫 기수를 열어 주세요.</Empty></section>}
    <section className="a-card"><div className="a-card-head"><h2>모든 기수에 반복되는 일정</h2><span className="a-muted">주차 · 요일로 정해 기수마다 같은 날 보여요</span><Btn action="ins-enter" cls="a-btn-ghost a-btn-sm" data-id={iid} data-to="#/center/schedule">강사센터 수업 캘린더에서 고치기</Btn></div>
      {rules.length ? <ul className="a-items">{rules.map((e) => <li key={e.id}><div className="a-item-main"><b>{e.title}</b><small>{DB.ruleText(e) + (e.time ? " · " + e.time : "")}</small></div><Pill cls="mute">{DB.evLabel(iid, e.type)}</Pill></li>)}</ul> : <p className="a-muted">반복 일정이 없어요.</p>}</section>
  </>;
}
