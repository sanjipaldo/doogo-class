"use client";
/* 파트너센터 (영업 파트너 RS) — #/center/partner/…
 * 예전 admin.js pagePartnerHome · Inquiries · Instructors · Earnings · Payouts · Settings · Refer · Kit · Notices · Guide 를 React 로 (Next.js 전환 6단계)
 *  · 복사 · 탭 · 정산서 · 추천 보내기 · 비밀번호 · 계좌 저장은 예전 admin.js 이벤트가 그대로 받아요
 *  · 입점 문의 · 공지를 열면 예전처럼 잠시 뒤 읽음으로 — 왼쪽 메뉴 숫자는 React 가 다시 그려서 빼요 (‘N’ 표시는 이 화면을 연 동안 그대로)
 *  · 진행 칸(inqTrack) · 1:1 대화(inqThread) · 강사 칸(affInsCell)은 마스터 화면과 같이 쓰는 예전 조각 */
import { useEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

const ff = (s) => DBX().date.fmtFull(s);
const ffAt = (t) => ff(DBX().date.toStr(new Date(t)));
const myRsOf = (p) => (p.rs !== null && p.rs !== undefined && p.rs !== "" ? Number(p.rs) : ADM().affDefRs());
const Steps = ({ list, v }) => <ol className={"p-steps" + (v ? " p-steps-v" : "")}>{list.map((x, i) => <li key={i}><span className="p-step-ic"><Icon n={x[0]} c="sm" /></span><em>STEP {i + 1}</em><b>{x[1]}</b><small>{x[2]}</small></li>)}</ol>;
const Copy = ({ v, label, cls, msg, ic }) => <Btn action="aff-copy" cls={cls} data-v={v} data-msg={msg}><Icon n={ic || "link"} c="sm" />{label}</Btn>;

/** 예전 affTable — 수익 한 건마다 한 줄 */
function AffTable({ rows }) {
  const A = ADM(), won = A.won;
  if (!rows.length) return <Empty ic="coins">아직 수익 내역이 없어요. 소개한 강사님이 기수 이용료를 입금하면 여기에 쌓여요.</Empty>;
  return <div className="a-table-wrap"><table className="a-table p-table"><thead><tr><th>입금 확인일</th><th>강사</th><th>기수</th><th className="num">이용료 (공급가액)</th><th className="num">RS</th><th className="num">내 수익</th><th>지급 예정일</th><th>상태</th></tr></thead><tbody>{rows.map((x, i) => (
    <tr key={i}><td>{x.b.paidAt ? ff(x.b.paidAt) : <span className="a-muted">입금 전</span>}</td><td><Isl html={A.affInsCell(x.b.instructorId)} /></td><td>{x.b.cohortName || ""}</td><td className="num">{won(x.m.supply)}</td><td className="num">{x.rate}%</td><td className="num"><b className="p-amt">{won(x.amt)}</b></td>
      <td>{x.payDate ? <>{ff(x.payDate)}{x.status === "scheduled" ? <> <small className="a-muted">{A.dLeft(x.payDate)}</small></> : null}</> : <span className="a-muted">입금 확인 후 확정</span>}</td>
      <td><Pill cls={A.AFF_ST[x.status][1]}>{x.status === "done" && x.po ? "지급 완료 " + fmtMD(x.po.paidAt) : A.AFF_ST[x.status][0]}</Pill></td></tr>))}</tbody></table></div>;
}
/** 예전 affInqStrip — 내 추천으로 들어온 입점 문의 요약 */
function InqStrip({ p }) {
  const A = ADM(), qs = A.affInqs(p), c = (st) => qs.filter((q) => (q.status || "new") === st).length;
  return <section className="a-card p-inq-strip"><div className="a-card-head"><h2>내 추천으로 들어온 입점 문의</h2><a className="a-link" href="#/center/partner/inquiries">전체 보기 <Icon n="arrowRight" c="xs" /></a></div>
    <div className="p-funnel">{[["들어온 문의", qs.length, ""], ["상담 중", c("new") + c("seen") + c("contact"), "info"], ["계약 완료", c("done"), "ok"], ["계약 안 됨", c("fail"), "bad"], ["보류", c("hold"), "mute"]].map((x) => <a key={x[0]} href="#/center/partner/inquiries" className={x[2]}><small>{x[0]}</small><b>{x[1]}<em>건</em></b></a>)}</div>
    {qs.length ? <ul className="p-inq-mini">{qs.slice(0, 3).map((q) => { const st = A.inqStatus(q); return <li key={q.id}><span className="a-avatar">{(q.name || "?").slice(0, 1)}</span><b>{q.name}{A.inqUpdated(q) > (q.pSeen || 0) ? <i className="p-new">N</i> : null}</b><small>{String(q.course || "").slice(0, 34)}</small><Pill cls={st[2]}>{st[1]}</Pill></li>; })}</ul>
      : <Empty ic="link">아직 추천 링크로 들어온 입점 문의가 없어요. 위의 추천 링크를 강사님께 보내 보세요.</Empty>}</section>;
}

export function PartnerHome() {
  const A = ADM(), DB = DBX(), won = A.won, p = A.affMe(), s = A.affSum(p), myRs = myRsOf(p), today = DB.date.todayStr();
  const months = []; { const t = DB.date.parseDate(today); for (let i = 5; i >= 0; i--) { const d = new Date(t.getFullYear(), t.getMonth() - i, 1); months.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); } }
  const byM = {}; s.rows.forEach((x) => { if (x.month) byM[x.month] = (byM[x.month] || 0) + x.amt; });
  const max = Math.max(1, ...months.map((m) => byM[m] || 0)), payDay = A.AFF().affSettings.payDay;
  const steps = [["handshake", "강사님 소개", "추천 링크 · 코드로 연결"], ["store", "두잉고 입점", "상담 후 플랫폼 세팅"], ["coins", "기수 이용료 입금", "강사님이 다음 기수를 열면"], ["check", "내 수익 확정", "공급가액 × RS%"], ["calendar", "다음 달 " + payDay + "일 지급", "등록한 계좌로 입금"]];
  const nt = A.affNoticeList()[0], ntNew = nt && nt.at > (p.noticeSeen || 0), ref = A.refUrl(p);
  const perIns = (p.instructors || []).some((l) => l.rs !== null && l.rs !== undefined && l.rs !== "");
  return <>
    <Head title="파트너센터" sub={p.name + " 파트너님, 소개해 주신 강사님의 기수가 열릴 때마다 수익이 쌓여요."} />
    {nt ? <a className={"p-notice-bar" + (ntNew ? " new" : "")} href="#/center/partner/notices"><span className="p-notice-ic"><Icon n="megaphone" c="sm" /></span>{ntNew ? <i className="p-new">N</i> : null}<b>{nt.title}</b><time>{ffAt(nt.at)}</time><Icon n="chevRight" c="sm" /></a> : null}
    <section className="p-hero"><span className="p-3d" aria-hidden="true"><i className="c1">%</i><i className="c2">₩</i><i className="c3" /><i className="ring" /></span><div className="p-hero-l"><span className="p-hero-k"><Icon n="handshake" c="sm" />DOINGGO PARTNERS</span>
        <h2>내 RS <b>{myRs}%</b></h2><p>소개한 강사님이 두잉고에 기수 이용료를 입금하면, <b>공급가액(부가세 제외)의 {myRs}%</b>가 파트너님 수익이에요.{perIns ? " (강사님별로 다른 RS가 정해진 경우 그 비율로 계산돼요)" : ""}</p></div>
      <div className="p-hero-r"><small>내 추천 링크</small><div className="p-ref"><code>{ref}</code><Copy v={ref} label="복사" cls="a-btn-light a-btn-sm" /></div><span>추천 코드 <b>{p.code || p.loginId}</b> · 이 링크로 들어온 입점 문의는 파트너님 소개로 기록돼요.</span></div></section>
    <div className="a-kpis">
      <Kpi label="다음 지급 예정" value={won(s.nextAmt)} sub={s.nextDate ? ff(s.nextDate) + " 지급 · " + A.dLeft(s.nextDate) : "예정된 지급이 없어요"} href="#/center/partner/payouts" tone={s.nextAmt ? "ok" : ""} />
      <Kpi label="이번 달 확정 수익" value={won(s.thisMonth)} sub={today.slice(5, 7).replace(/^0/, "") + "월 입금 확인분"} href="#/center/partner/earnings" />
      <Kpi label="입금 대기 · 예상 수익" value={won(s.expected)} sub="강사님 이용료 입금 전" href="#/center/partner/earnings" tone={s.expected ? "warn" : ""} />
      <Kpi label="누적 지급액" value={won(s.paidOut)} sub="지금까지 받은 금액" href="#/center/partner/payouts" />
    </div>
    <div className="p-grid">
      <section className="a-card"><div className="a-card-head"><h2>월별 수익</h2><span className="a-muted">입금 확인 월 기준 · 최근 6개월</span></div><div className="p-bars">{months.map((m) => <div key={m} className={"p-bar" + (m === today.slice(0, 7) ? " now" : "")}><span className="p-bar-v">{byM[m] || 0 ? won(byM[m]) : ""}</span><i style={{ height: Math.max(3, Math.round((byM[m] || 0) / max * 100)) + "%" }} /><b>{A.monthKo(m)}</b></div>)}</div></section>
      <section className="a-card"><div className="a-card-head"><h2>내 강사</h2><a className="a-link" href="#/center/partner/instructors">전체 보기 <Icon n="arrowRight" c="xs" /></a></div>
        {(p.instructors || []).length ? <ul className="p-mini">{p.instructors.map((l) => { const rows = s.rows.filter((x) => x.b.instructorId === l.iid); return <li key={l.iid}><Isl html={A.affInsCell(l.iid)} /><span className="p-mini-r"><em>RS {A.affRate(p, l.iid)}%</em><b>{won(rows.filter((x) => x.month).reduce((a, x) => a + x.amt, 0))}</b></span></li>; })}</ul>
          : <Empty ic="users">아직 연결된 강사님이 없어요. 추천 링크로 강사님을 소개해 보세요.</Empty>}</section>
    </div>
    <InqStrip p={p} />
    <section className="a-card"><div className="a-card-head"><h2>최근 수익</h2><a className="a-link" href="#/center/partner/earnings">전체 보기 <Icon n="arrowRight" c="xs" /></a></div><AffTable rows={s.rows.slice(0, 5)} /></section>
    <section className="a-card p-how"><div className="a-card-head"><h2>RS 수익은 이렇게 만들어져요</h2></div><Steps list={steps} /></section>
  </>;
}

/* 입점 문의: 열면 1.5초 뒤 ‘새 소식’을 읽음으로 — ‘N’ 표시는 연 동안 그대로(처음 본 때 기준) */
export function PartnerInquiries() {
  const A = ADM(), DB = DBX(), ui = A.ui, p = A.affMe(), qs = A.affInqs(p), c = (st) => qs.filter((q) => (q.status || "new") === st).length;
  const [seen0] = useState(() => { const o = {}; qs.forEach((q) => { o[q.id] = q.pSeen || 0; }); return o; });
  useEffect(() => {
    const t = setTimeout(() => { let ch = false; A.affInqs(A.affMe() || p).forEach((q0) => { const q = A.findInq(q0.id); if (q && A.inqUpdated(q) > (q.pSeen || 0)) { q.pSeen = Date.now(); DB.saveInquiry(q); ch = true; } }); if (ch && window.ReactApp) window.ReactApp.redraw(); }, 1500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const f = ui.pInqTab || "all", shown = qs.filter((q) => f === "all" || (f === "ing" ? ["new", "seen", "contact"].includes(q.status || "new") : (q.status || "new") === f));
  const tabs = [["all", "전체", qs.length], ["ing", "상담 중", c("new") + c("seen") + c("contact")], ["done", "계약 완료", c("done")], ["fail", "계약 안 됨", c("fail")], ["hold", "보류", c("hold")]];
  const H = "#/center/partner/inquiries", ref = A.refUrl(p);
  const Card = ({ q }) => {
    const st = A.inqStatus(q), fresh = A.inqUpdated(q) > (seen0[q.id] != null ? seen0[q.id] : q.pSeen || 0), done = (q.status || "new") === "done";
    return <article className={"a-inq p-inq" + (done ? " is-done" : "")}><div className="a-inq-head"><span className="a-avatar">{(q.name || "?").slice(0, 1)}</span><div><b>{q.name}{fresh ? <i className="p-new">N</i> : null}</b><small>{DB.date.fmtStamp(q.at) + " 접수 · 추천 코드 " + (q.ref || p.code || "")}</small></div><Pill cls={st[2]}>{st[1]}</Pill></div>
      {done ? <div className="p-inq-done"><Icon n="check" c="sm" /><div><b>계약이 성사됐어요!</b><span>{q.iid ? "‘내 강사’에 연결됐어요. 강사님이 기수 이용료를 입금하면 RS 수익이 생겨요." : "두잉고가 플랫폼을 준비하고 있어요. 열리면 ‘내 강사’에 연결돼요."}</span></div></div> : null}
      {q.status === "fail" ? <div className="p-inq-fail"><Icon n="x" c="sm" /><div><b>이번에는 계약이 성사되지 않았어요</b><span>{(q.failAt ? ffAt(q.failAt) + " · " : "") + "자세한 사유는 아래 1:1 대화로 물어봐 주세요. 다시 진행되면 상태가 바뀌어요."}</span></div></div> : null}
      {q.status === "hold" ? <div className="p-inq-hold"><Icon n="alert" c="sm" /><span>지금은 보류된 문의예요. 자세한 내용은 아래 1:1 대화로 물어봐 주세요.</span></div> : null}
      <Isl html={A.inqTrack(q)} />
      <dl className="a-inq-info"><div><dt>연락처</dt><dd>{A.maskPhone(q.phone)}</dd></div><div><dt>이메일</dt><dd>{A.maskMail(q.email)}</dd></div><div><dt>강의 중인 곳</dt><dd>{q.where || "-"}</dd></div><div><dt>강의 링크</dt><dd>{q.link || "-"}</dd></div></dl>
      <div className="a-inq-block"><b>어떤 강의인가요</b><p>{q.course || ""}</p></div>{q.message ? <div className="a-inq-block"><b>남긴 말</b><p>{q.message}</p></div> : null}
      <Isl html={A.inqThread(q, "partner")} /></article>;
  };
  return <>
    <Head title="입점 문의" sub="내 추천 링크 · 코드로 들어온 강사님 입점 문의예요. 상담과 계약은 두잉고가 진행하고, 진행 상황과 계약 성사 여부가 여기에 그대로 보여요." />
    <div className="a-kpis"><Kpi label="들어온 문의" value={qs.length + "건"} sub="내 추천 링크 · 코드" href={H} /><Kpi label="상담 중" value={c("new") + c("seen") + c("contact") + "건"} sub="두잉고가 연락 · 미팅 중" href={H} tone="" />
      <Kpi label="계약 성사" value={c("done") + "건"} sub={qs.length ? "성사율 " + Math.round(c("done") / qs.length * 100) + "%" : "아직 없어요"} href={H} tone={c("done") ? "ok" : ""} /><Kpi label="미성사 · 보류" value={c("fail") + c("hold") + "건"} sub={"계약 미성사 " + c("fail") + "건 · 보류 " + c("hold") + "건"} href={H} /></div>
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (f === t[0] ? " on" : "")} data-action="p-inq-tab" data-k={t[0]}>{t[1]} <span className="num">{t[2]}</span></button>)}</div></div>
      {shown.length ? <div className="a-stack">{shown.map((q) => <Card key={q.id} q={q} />)}</div> : <Empty ic="handshake" extra={qs.length ? null : <Copy v={ref} label="내 추천 링크 복사" cls="a-btn-primary a-btn-sm" />}>{qs.length ? "이 상태의 문의가 없어요." : "아직 추천 링크로 들어온 입점 문의가 없어요."}</Empty>}</section>
    <p className="a-muted p-small p-privacy"><Icon n="lock" c="xs" /> 문의하신 강사님의 연락처 · 이메일은 개인정보 보호를 위해 일부만 보여요. 상담 · 계약은 두잉고 담당자가 진행해요.</p>
  </>;
}

export function PartnerInstructors() {
  const A = ADM(), DB = DBX(), won = A.won, p = A.affMe(), rows = A.affRows(p);
  const St = ({ iid }) => { const bs = DB.bills(iid).filter((b) => !b.canceledAt); return bs.some((b) => b.cohortId) ? <Pill cls="ok">기수 운영 중</Pill> : bs.length ? <Pill cls="info">기수 신청 중</Pill> : <Pill cls="mute">입점 준비</Pill>; };
  return <>
    <Head title="내 강사" sub="파트너님이 소개해서 두잉고에 입점한 강사님이에요. 강사님이 기수를 열 때마다 RS 수익이 생겨요." />
    <section className="a-card">{(p.instructors || []).length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th>연결일</th><th className="num">RS</th><th className="num">입금된 기수</th><th className="num">누적 이용료 (공급가액)</th><th className="num">내 누적 수익</th><th className="num">입금 대기 예상</th><th>상태</th></tr></thead><tbody>{p.instructors.map((l) => {
      const r = rows.filter((x) => x.b.instructorId === l.iid), paid = r.filter((x) => x.month);
      return <tr key={l.iid}><td><Isl html={A.affInsCell(l.iid)} /></td><td>{l.since ? ff(l.since) : "-"}</td><td className="num">{A.affRate(p, l.iid)}%</td><td className="num">{paid.length}개</td><td className="num">{won(paid.reduce((a, x) => a + x.m.supply, 0))}</td><td className="num"><b className="p-amt">{won(paid.reduce((a, x) => a + x.amt, 0))}</b></td><td className="num">{won(r.filter((x) => !x.month).reduce((a, x) => a + x.amt, 0))}</td><td><St iid={l.iid} /></td></tr>; })}</tbody></table></div>
      : <Empty ic="users">아직 연결된 강사님이 없어요. 강사님 연결은 두잉고 담당자가 확인 후 등록해 드려요.</Empty>}</section>
  </>;
}

export function PartnerEarnings() {
  const A = ADM(), won = A.won, p = A.affMe(), rows = A.affRows(p), tab = A.ui.affTab || "all";
  const isSch = (x) => x.status === "scheduled" || x.status === "due", pick = tab === "all" ? rows : tab === "scheduled" ? rows.filter(isSch) : rows.filter((x) => x.status === tab);
  const cnt = (k) => (k === "all" ? rows.length : k === "scheduled" ? rows.filter(isSch).length : rows.filter((x) => x.status === k).length);
  return <>
    <Head title="수익 내역" sub={"강사님 기수 이용료 한 건마다 한 줄이에요. 공급가액(부가세 제외) × RS% = 내 수익. 매월 말 마감 후 다음 달 " + A.AFF().affSettings.payDay + "일에 지급돼요."} />
    <div className="a-tabs p-tabs">{[["all", "전체"], ["scheduled", "지급 예정"], ["done", "지급 완료"], ["expected", "입금 대기"]].map((t) => <button key={t[0]} type="button" className={"a-tab" + (tab === t[0] ? " on" : "")} data-action="aff-tab" data-k={t[0]}>{t[1]} <span className="num">{cnt(t[0])}</span></button>)}</div>
    <section className="a-card"><AffTable rows={pick} /><p className="a-muted p-foot">합계 <b>{won(pick.reduce((a, x) => a + x.amt, 0))}</b> · 세금 처리(사업소득 3.3% 원천징수 등)는 지급 때 별도로 안내해 드려요.</p></section>
  </>;
}

export function PartnerPayouts() {
  const A = ADM(), DB = DBX(), won = A.won, p = A.affMe(), ms = A.affMonths(p), payDay = A.AFF().affSettings.payDay, today = DB.date.todayStr();
  return <>
    <Head title="정산 · 지급" sub={"한 달 동안 확정된 수익을 모아 다음 달 " + payDay + "일에 등록한 계좌로 보내 드려요."} />
    <div className="p-grid p-grid-r">
      <section className="a-card"><div className="a-card-head"><h2>월별 정산</h2></div>{ms.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>정산 월</th><th className="num">건수</th><th className="num">RS 수익</th><th className="num">실지급액</th><th>지급일</th><th>상태</th><th></th></tr></thead><tbody>{ms.map((g) => {
        const st = g.po ? "done" : today < g.payDate ? "scheduled" : "due";
        return <tr key={g.month}><td><b>{g.month.slice(0, 4)}년 {A.monthKo(g.month)}</b> 확정분</td><td className="num">{g.rows.length}건</td><td className="num">{won(g.total)}</td><td className="num"><b className="p-amt">{won(A.affNet(p, g.total).net)}</b>{A.affTaxKey(p) === "personal" ? <small className="a-memo">3.3% 원천징수 후</small> : null}</td>
          <td>{ff(g.payDate)}{st === "scheduled" ? <> <small className="a-muted">{A.dLeft(g.payDate)}</small></> : null}</td><td><Pill cls={A.AFF_ST[st][1]}>{st === "done" ? "지급 완료 " + fmtMD(g.po.paidAt) : A.AFF_ST[st][0]}</Pill></td><td className="a-right"><Btn action="aff-stmt" cls="a-btn-ghost a-btn-sm" data-m={g.month}><Icon n="file" c="sm" />정산서</Btn></td></tr>; })}</tbody></table></div>
        : <Empty ic="calendar">아직 정산할 수익이 없어요.</Empty>}</section>
      <section className="a-card p-bank"><div className="a-card-head"><h2>지급 받을 계좌</h2><Btn action="aff-go-settings" cls="a-btn-ghost a-btn-sm"><Icon n="pen" c="sm" />수정</Btn></div>
        {p.account ? <div className="p-bank-box"><small>{p.bank || ""}</small><b>{p.account}</b><span>예금주 {p.holder || p.name}</span></div> : <Empty ic="coins">지급 받을 계좌를 등록해 주세요.</Empty>}
        <div className="p-taxline"><Icon n="file" c="xs" />정산 유형 <b>{A.TAX[A.affTaxKey(p)].label}</b></div>
        <ul className="p-rules"><li><Icon n="check" c="xs" />매월 1일~말일 입금 확인분을 모아 정산해요</li><li><Icon n="check" c="xs" />지급일: 다음 달 {payDay}일 (주말·공휴일이면 다음 영업일)</li><li><Icon n="check" c="xs" />강사님 이용료가 환불되면 그 RS도 함께 조정돼요</li></ul></section>
    </div>
  </>;
}

export function PartnerSettings({ n }) {
  const A = ADM(), p = A.affMe();
  return <>
    <Head title="내 정보 · 비밀번호" sub="로그인 아이디와 비밀번호를 확인하고, 비밀번호를 바꿀 수 있어요." />
    <div className="p-grid">
      <section className="a-card"><div className="a-card-head"><h2>비밀번호 바꾸기</h2></div><form key={n} id="aff-pw-form" className="a-form" noValidate>
        <div className="a-field"><label>아이디</label><input className="a-input" defaultValue={p.loginId} disabled /></div>
        <div className="a-field"><label htmlFor="ap-cur">지금 비밀번호</label><input className="a-input" id="ap-cur" name="cur" type="password" maxLength={40} autoComplete="current-password" /></div>
        <div className="a-form-row"><div className="a-field"><label htmlFor="ap-new">새 비밀번호 <small>(4자 이상)</small></label><input className="a-input" id="ap-new" name="nw" type="password" maxLength={40} autoComplete="new-password" /></div>
          <div className="a-field"><label htmlFor="ap-new2">새 비밀번호 확인</label><input className="a-input" id="ap-new2" name="nw2" type="password" maxLength={40} autoComplete="new-password" /></div></div>
        <p className="a-error" id="ap-error"></p><button className="a-btn a-btn-primary" type="submit">비밀번호 바꾸기</button></form></section>
      <section className="a-card"><div className="a-card-head"><h2>지급 계좌 · 연락처</h2></div><form key={n} id="aff-bank-form" className="a-form" noValidate>
        <div className="a-field"><label>이름</label><input className="a-input" defaultValue={p.name} disabled /></div>
        <div className="a-field"><label htmlFor="ab-phone">연락처</label><input className="a-input" id="ab-phone" name="phone" defaultValue={p.phone || ""} inputMode="tel" maxLength={20} /></div>
        <div className="a-form-row"><div className="a-field"><label htmlFor="ab-bank">은행</label><input className="a-input" id="ab-bank" name="bank" defaultValue={p.bank || ""} maxLength={20} placeholder="예: 국민은행" /></div>
          <div className="a-field"><label htmlFor="ab-holder">예금주</label><input className="a-input" id="ab-holder" name="holder" defaultValue={p.holder || ""} maxLength={20} /></div></div>
        <div className="a-field"><label htmlFor="ab-acc">계좌번호</label><input className="a-input" id="ab-acc" name="account" defaultValue={p.account || ""} inputMode="numeric" maxLength={30} /></div>
        <button className="a-btn a-btn-primary" type="submit">저장</button></form></section>
    </div>
  </>;
}

export function PartnerRefer({ n }) {
  const A = ADM(), DB = DBX(), p = A.affMe(), mine = A.affInqs(p).filter((q) => q.byPartner);
  const F = ({ id, label, req, ...rest }) => <div className="a-field"><label htmlFor={"pl-" + id}>{label}{req ? <> <b className="p-req">*</b></> : null}</label><input className="a-input" id={"pl-" + id} name={id} {...rest} /></div>;
  return <>
    <Head title="강사 추천하기" sub="추천 링크를 보내기 어려운 강사님은 여기에 직접 남겨 주세요. 파트너님 소개로 바로 기록되고, 두잉고 담당자가 연락드려요." />
    <div className="p-grid p-grid-r">
      <section className="a-card"><div className="a-card-head"><h2>강사님 정보</h2></div><form key={n} id="aff-lead-form" className="a-form" noValidate>
        <div className="a-form-row"><F id="name" label="강사님 성함" maxLength={30} placeholder="예: 김민지" req /><F id="phone" label="연락처" inputMode="tel" maxLength={20} placeholder="010-0000-0000" req /></div>
        <div className="a-form-row"><F id="email" label="이메일" type="email" maxLength={80} placeholder="(선택)" /><F id="where" label="지금 강의하는 곳" maxLength={80} placeholder="예: 유튜브 · 클래스101 · 오프라인" /></div>
        <div className="a-field"><label htmlFor="pl-course">어떤 강의인가요 <b className="p-req">*</b></label><textarea className="a-input" id="pl-course" name="course" rows={3} maxLength={800} placeholder="강의 주제 · 대상 · 기간 · 예상 수강생 수 등" /></div>
        <F id="link" label="강의 페이지 · 채널 주소" maxLength={200} placeholder="https://" />
        <div className="a-field"><label htmlFor="pl-message">두잉고에 전할 말</label><textarea className="a-input" id="pl-message" name="message" rows={2} maxLength={500} placeholder="예: 다음 주 화요일 오후에 통화 가능하세요. 제가 직접 만나 본 강사님이에요." /></div>
        <label className="a-check p-consent"><input type="checkbox" name="agree" /><span>강사님께 두잉고에 연락처를 전달하는 것에 대해 <b>동의를 받았어요</b> (필수)</span></label>
        <p className="a-error" id="pl-error"></p><button className="a-btn a-btn-primary" type="submit"><Icon n="send" c="sm" />추천 보내기</button></form></section>
      <div className="a-stack">
        <section className="a-card"><div className="a-card-head"><h2>추천하면 이렇게 진행돼요</h2></div><Steps v list={[["send", "추천 접수", "파트너님 소개로 바로 기록"], ["headset", "두잉고 상담", "담당자가 강사님께 연락"], ["check", "계약 완료", "‘입점 문의’에 진행 상황 표시"], ["coins", "RS 수익", "기수 이용료 입금 시 확정"]]} /></section>
        <section className="a-card"><div className="a-card-head"><h2>내가 직접 추천한 강사님</h2><a className="a-link" href="#/center/partner/inquiries">입점 문의 <Icon n="arrowRight" c="xs" /></a></div>
          {mine.length ? <ul className="p-inq-mini">{mine.slice(0, 5).map((q) => { const st = A.inqStatus(q); return <li key={q.id}><span className="a-avatar">{(q.name || "?").slice(0, 1)}</span><b>{q.name}</b><small>{DB.date.fmtStamp(q.at)}</small><Pill cls={st[2]}>{st[1]}</Pill></li>; })}</ul> : <Empty ic="userPlus">아직 직접 추천한 강사님이 없어요.</Empty>}</section>
      </div>
    </div>
  </>;
}

/* 홍보 자료: QR 은 예전 drawAffQr 가 #p-qr 안을 채워요 (그 칸은 예전 조각이라 React 가 지우지 않아요) */
export function PartnerKit() {
  const A = ADM(), p = A.affMe(), url = A.refUrl(p), T = A.affKitT(p, url);
  useEffect(() => { A.drawAffQr(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Head title="홍보 자료" sub="강사님께 두잉고를 소개할 때 쓰는 자료예요. 아래 링크 · QR · 문구로 들어온 입점 문의는 모두 파트너님 소개로 기록돼요." />
    <div className="p-grid p-grid-r">
      <section className="a-card p-kit-link"><div className="a-card-head"><h2>내 추천 링크 · QR</h2></div>
        <div className="p-kit-qr"><Isl html={'<div id="p-qr" class="p-qr" aria-label="추천 링크 QR 코드"></div>'} /><div className="p-kit-qr-r"><small>추천 코드</small><b>{p.code || p.loginId}</b><div className="p-ref p-ref-light"><code>{url}</code><Copy v={url} label="복사" cls="a-btn-dark a-btn-sm" /></div>
          <Btn action="aff-qr-dl" cls="a-btn-outline a-btn-sm"><Icon n="download" c="sm" />QR 이미지 저장</Btn><p className="a-muted p-small">명함 · 인쇄물 · 오프라인 모임에서 QR을 보여 주세요.</p></div></div></section>
      <section className="a-card"><div className="a-card-head"><h2>두잉고, 이렇게 소개해 주세요</h2></div><ul className="p-points">
        {[["store", "강사님 이름으로 된 강의 플랫폼", "강사님 이름 · 색 · 커리큘럼으로 수강생 화면을 만들어요"], ["file", "강의 소개 · 무료 강의 페이지", "모집용 랜딩과 무료 강의 페이지를 함께 만들어요"], ["checks", "수강생 케어를 한 곳에서", "과제 검수 · 공지 · 1:1 요청 · 수료증까지"], ["coins", "이용료는 기수마다 1인 수강료 1명분", "수강생이 몇 명이든 같아요. 수강생은 무료"]].map((x) => <li key={x[0]}><span className="p-step-ic"><Icon n={x[0]} c="sm" /></span><div><b>{x[1]}</b><small>{x[2]}</small></div></li>)}</ul></section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>바로 쓰는 홍보 문구</h2><span className="a-muted">내 추천 링크가 들어가 있어요 · 복사해서 그대로 보내세요</span></div><div className="p-tpls">
      {T.map((t) => <div key={t[1]} className="p-tpl"><div className="p-tpl-h"><span className="p-step-ic"><Icon n={t[0]} c="sm" /></span><b>{t[1]}</b><Copy v={t[2]} label="복사" cls="a-btn-outline a-btn-sm" msg="문구를 복사했어요." ic="clipboard" /></div><textarea className="a-input" rows={9} readOnly aria-label={t[1] + " 문구"} defaultValue={t[2]} /></div>)}</div></section>
    <div className="p-grid">
      <section className="a-card"><div className="a-card-head"><h2>이미지 자료</h2></div><div className="p-assets">
        <a className="p-asset" href="assets/home/og-doinggo.jpg" download="doinggo-banner.jpg"><img src="assets/home/og-doinggo.jpg" alt="두잉고 소개 배너" /><span><Icon n="download" c="xs" />소개 배너 (1200×630)</span></a>
        <a className="p-asset p-asset-logo" href="assets/brand/doinggo-en.svg" download="doinggo-logo.svg"><img src="assets/brand/doinggo-en.svg" alt="doinggo 로고" /><span><Icon n="download" c="xs" />doinggo 로고 (SVG)</span></a></div></section>
      <section className="a-card"><div className="a-card-head"><h2>홍보할 때 지켜 주세요</h2></div><ul className="p-rules">
        {["‘무조건 수익 보장’ · ‘누구나 월 1,000만 원’ 같은 과장된 표현은 쓰지 않아요", "두잉고 직원 · 공식 대리점처럼 소개하지 않아요 (‘두잉고 파트너’로 소개해 주세요)", "강사님 연락처는 본인 동의를 받은 뒤에만 남겨 주세요", "이용료 · 계약 조건은 두잉고 담당자가 직접 안내해요"].map((x, i) => <li key={i}><Icon n="check" c="xs" />{x}</li>)}</ul></section>
    </div>
  </>;
}

/* 공지사항: 열면 1.2초 뒤 읽음으로 — 펼침 · ‘N’ 은 연 동안 그대로(처음 본 때 기준) */
export function PartnerNotices() {
  const A = ADM(), DB = DBX(), p = A.affMe(), list = A.affNoticeList();
  const [seen] = useState(() => p.noticeSeen || 0);
  useEffect(() => {
    const t = setTimeout(() => { const me = A.affMe(); if (me && A.affNoticeNew(me)) { me.noticeSeen = Date.now(); DB.save(); if (window.ReactApp) window.ReactApp.redraw(); } }, 1200);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Head title="공지사항" sub="두잉고가 파트너님께 알려 드리는 소식이에요. 지급 일정 · 정책 변경 · 새 기능을 여기서 알려 드려요." />
    <section className="a-card">{list.length ? <ul className="p-notices">{list.map((x) => <li key={x.id} className={x.pinned ? "pin" : ""}><details open={x.at > seen || x.pinned || undefined}><summary>{x.pinned ? <span className="a-pill dark">고정</span> : null}{x.at > seen ? <i className="p-new">N</i> : null}<b>{x.title}</b><time>{ffAt(x.at)}</time><Icon n="chevDown" c="sm" /></summary><p>{x.body}</p></details></li>)}</ul>
      : <Empty ic="megaphone">아직 공지가 없어요.</Empty>}</section>
  </>;
}

export function PartnerGuide() {
  const A = ADM(), won = A.won, p = A.affMe(), set = A.AFF().affSettings, rs = myRsOf(p);
  const fee = 990000, supply = Math.round(fee / 1.1), amt = Math.round(supply * rs / 100), nn = A.affNet(p, amt);
  return <>
    <Head title="파트너 가이드" sub="RS가 어떻게 계산되고 언제 지급되는지, 자주 묻는 질문을 모았어요." />
    <div className="p-grid">
      <section className="a-card"><div className="a-card-head"><h2>RS 계산 예시</h2><span className="a-muted">내 RS {rs}% 기준</span></div>
        <div className="p-calc"><div><small>강사님 1인 수강료 (= 기수 이용료)</small><b>{won(fee)}</b></div><span>→</span><div><small>공급가액 (부가세 제외)</small><b>{won(supply)}</b></div><span>× {rs}%</span><div className="hl"><small>내 RS 수익</small><b>{won(amt)}</b></div></div>
        {A.affTaxKey(p) === "personal" ? <p className="a-muted p-small">개인 파트너는 3.3% ({won(nn.tax)})를 떼고 <b>{won(nn.net)}</b>이 지급돼요.</p> : <p className="a-muted p-small">사업자 파트너는 세금계산서 발행 후 {won(amt)}이 지급돼요.</p>}</section>
      <section className="a-card"><div className="a-card-head"><h2>지급 일정</h2></div><Steps v list={[["calendar", "매월 1일 ~ 말일", "강사님 이용료 입금 확인분을 모아요"], ["file", "다음 달 초", "정산서가 ‘정산 · 지급’에 올라와요"], ["coins", "다음 달 " + set.payDay + "일", "등록한 계좌로 지급 (주말 · 공휴일이면 다음 영업일)"]]} /></section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>자주 묻는 질문</h2></div><div className="p-faq">{A.AFF_FAQ.map((x, i) => <details key={i}><summary><b>{x[0]}</b><Icon n="chevDown" c="sm" /></summary><p>{x[1]}</p></details>)}</div></section>
  </>;
}

export const PPAGES = { "": PartnerHome, inquiries: PartnerInquiries, refer: PartnerRefer, kit: PartnerKit, notices: PartnerNotices, guide: PartnerGuide, instructors: PartnerInstructors, earnings: PartnerEarnings, payouts: PartnerPayouts, settings: PartnerSettings };
