"use client";
/* 강사센터 VOD(DOOGO CLASS) 화면 (2) — 정산 달력 · 판매 정산 · 1:1 코칭 답변
 * 예전 admin.js pageInsVodCal · pageInsVodSettle · pageCoaching 을 React 로 (Next.js 전환 6단계)
 *  · 달 옮기기 · 날짜 고르기 · 명세서 · 세금계산서 · 링크 복사 · 정산 정보 저장(폼 vs-prof-form) · 코칭 답변(폼 .a-q-form)은 예전 admin.js 이벤트가 그대로 받아요
 *  · 정산 명세 카드 · 비율 카드 · 지급 일정 같은 큰 조각은 예전 HTML 그대로 (Isl) */
import { useEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtMD, fmtStamp } from "./bits.jsx";

const Store = () => <Isl html={ADM().vdStoreBtn()} />;
const VC_KIND = [["vod", "VOD", "monitorPlay"], ["ebook", "전자책", "book"], ["book", "종이책", "truck"], ["live", "LIVE", "video"], ["coach", "코칭권", "message"], ["tea", "TEA TIME", "coffee"]];

export function InsVodCal() {
  const A = ADM(), DB = DBX(), ui = A.ui, won = A.won, iid = A.IID(), X = A.VX(), ym = ui.vcYM || DB.date.todayStr().slice(0, 7), t0 = DB.date.todayStr(), ff = DB.date.fmtFull;
  const os = A.VD().orders.filter((o) => A.vdKey(o) === iid && A.vdLive(o) && A.vdYM(o.paidAt) === ym).sort((a, b) => a.paidAt - b.paidAt);
  const day = {}, tot = { n: 0, base: 0, ins: 0 }, byK = {};
  VC_KIND.forEach((k) => { byK[k[0]] = { n: 0, base: 0, ins: 0 }; });
  os.forEach((o) => {
    const d = DB.date.toStr(new Date(o.paidAt)), k = X.rateKeyOf(o), ins = A.vdInsAmt(o), base = Math.round(X.baseOf(o) * A.vdKeep(o)), x = (day[d] = day[d] || { n: 0, ins: 0, base: 0, k: {}, os: [] });
    x.n++; x.ins += ins; x.base += base; x.k[k] = (x.k[k] || 0) + 1; x.os.push(o); tot.n++; tot.base += base; tot.ins += ins; if (byK[k]) { byK[k].n++; byK[k].base += base; byK[k].ins += ins; }
  });
  const y = Number(ym.slice(0, 4)), mo = Number(ym.slice(5, 7)) - 1, first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const sel = ui.vcDay && ui.vcDay.slice(0, 7) === ym ? ui.vcDay : day[t0] ? t0 : Object.keys(day).sort().pop() || "";
  const st = A.vdStmt(iid, ym), ss = A.vdStState(st), r = X.rateOf(iid), pym = A.vdYMadd(ym, -1), pst = A.vdStmt(iid, pym), pss = A.vdStState(pst), payD = A.vdPayDate(pym), hasPay = !!(pst.n || pst.rec || pst.adDed || pst.carry);
  const man = A.vcMan, paidK = pss.k === "paid", sx = sel && day[sel];
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={"p" + i} className="vc-d vc-pad" aria-hidden="true" />);
  for (let dd = 1; dd <= days; dd++) {
    const d = ym + "-" + String(dd).padStart(2, "0"), x = day[d], dow = (first + dd - 1) % 7, pay = hasPay && d === payD;
    cells.push(
      <button key={d} type="button" className={"vc-d" + (x ? " has" : "") + (pay ? " payday" + (paidK ? " paid" : "") : "") + (d === t0 ? " today" : "") + (d === sel ? " on" : "") + (dow === 0 ? " sun" : dow === 6 ? " sat" : "")} data-action="vc-day" data-d={d}
        aria-label={x || pay ? dd + "일" + (pay ? " " + (paidK ? "지급 완료" : "지급 예정") + " " + won(pst.pay) : "") + (x ? " 판매 " + x.n + "건 · 정산 " + won(x.ins) : "") : undefined}>
        <span className="vc-dn">{dd}</span>{pay ? <span className="vc-pay"><em>{paidK ? "받음" : "받을 돈"}</em><b className="vc-full">{won(pst.pay)}</b><b className="vc-short">{man(pst.pay)}</b></span> : null}
        {x ? <><b className="vc-amt"><span className="vc-full">{won(x.ins)}</span><span className="vc-short">{man(x.ins)}</span></b><span className="vc-ks">{VC_KIND.filter((k) => x.k[k[0]]).map((k) => <i key={k[0]} className={"vc-k vc-k-" + k[0]}>{k[1] + " " + x.k[k[0]]}</i>)}</span></> : null}</button>
    );
  }
  return <>
    <Head title="정산 달력" sub="날짜마다 무엇이 몇 개 팔렸고, 정산으로 얼마를 받는지 한눈에 봐요. 정산은 매달 1일~말일 판매분을 다음 달 10일에 지급해요." right={<Store />} />
    <section className="a-card vc-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="vc-ym" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{A.vdYMtxt(ym)}</h2><button type="button" className="a-icon-btn" data-action="vc-ym" data-dir="1" aria-label="다음 달"><Icon n="chevRight" /></button>
      <span className="a-cal-sum">판매 <b>{tot.n}건</b> · 판매가 <b>{won(tot.base)}</b> · 정산 예정 <b>{won(tot.ins)}</b></span><Pill cls={ss.c}>{ss.t}</Pill></div>
      {hasPay ? <p className="vc-paynote"><Icon n="coins" c="xs" /> <b>{Number(payD.slice(5, 7))}월 {Number(payD.slice(8))}일</b>에 {A.vdYMtxt(pym)} 판매분 <b>{won(pst.pay)}</b>{(paidK ? "을 받았어요." : "을 받아요 (" + pss.t + ").") + (pst.adDed ? " 광고비 분담 " + won(pst.adDed) + " 차감 뒤예요." : "")}</p> : null}
      <div className="vc-sum">{VC_KIND.map((k) => <div key={k[0]} className={"vc-sum-i vc-k-" + k[0]}><span>{k[2] === "coffee" ? <Isl html={X.icx("coffee", "xs")} /> : <Icon n={k[2]} c="xs" />}{k[1]}</span><b>{byK[k[0]].n}건</b><small>{won(byK[k[0]].ins)}</small><small className="vc-my">내 몫 {r[k[0]]}%</small></div>)}</div>
      <div className="vc-grid" role="grid" aria-label={A.vdYMtxt(ym) + " 정산 달력"}>{["일", "월", "화", "수", "목", "금", "토"].map((w, i) => <div key={w} className={"vc-w" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{w}</div>)}{cells}</div>
      <p className="a-muted p-small"><Icon n="coins" c="xs" /> 날짜 칸의 금액은 그날 판매의 정산 예정 금액((판매가 − 온드 RS − PG 결제 수수료) × 내 비율 · 부가세 포함)이에요. 초록 칸은 지난달 판매분을 받는 날이에요. 광고비 분담 · 확정 뒤 환불 차감은 월 명세서에서 빠져요 ({A.vdYMtxt(ym)} 판매분 지급 예정 {won(st.pay)} · {ff(A.vdPayDate(ym))}).</p></section>
    {sel ? <section className="a-card vc-detail">{hasPay && sel === payD ? <div className="vc-paybox"><Icon n="coins" c="sm" /><div><b>{ff(payD) + " · " + A.vdYMtxt(pym) + " 판매분 정산 " + (paidK ? "지급 완료" : "지급 예정") + " " + won(pst.pay)}</b><small>{A.vsPayLine(pst)}</small></div></div> : null}
      <div className="a-card-head"><h2>{ff(sel)} 판매</h2>{sx ? <span className="a-muted">{sx.n}건 · 판매가 {won(sx.base)} · 정산 <b>{won(sx.ins)}</b></span> : null}</div>
      {sx ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>시각</th><th>상품</th><th>종류</th><th className="right">판매가</th><th className="right">비율</th><th className="right">정산액</th></tr></thead><tbody>{sx.os.map((o) => {
        const k = X.rateKeyOf(o), kk = VC_KIND.find((z) => z[0] === k) || VC_KIND[0], dt = new Date(o.paidAt), sh = X.shareVal ? X.shareVal(o) : null, opt = X.optTxt(o);
        return <tr key={o.no}><td className="num">{String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0")}</td><td>{o.title}{opt ? <small className="a-memo">{opt}</small> : null}{o.status === "refunded" ? <small className="a-memo">부분 환불</small> : null}<Isl html={A.vdRsTag(o)} /><Isl html={A.vdRbTag(o)} /></td>
          <td><span className={"vc-k vc-k-" + k}>{kk[1]}</span></td><td className="right num">{won(Math.round(X.baseOf(o) * A.vdKeep(o)))}</td><td className="right num">{sh == null ? "-" : sh + "%"}</td><td className="right num"><b>{won(A.vdInsAmt(o))}</b></td></tr>;
      })}</tbody></table></div> : <Empty ic="calendar">이날은 판매가 없어요.</Empty>}</section> : null}
    <Isl html={A.vsPaySchedule(iid)} />
  </>;
}

export function InsVodSettle({ n }) {
  const A = ADM(), DB = DBX(), won = A.won, iid = A.IID(), v = A.VD(), X = A.VX(), mine = v.products.filter((p) => p.iid === iid), ym = DB.date.todayStr().slice(0, 7), last = A.vdYMadd(ym, -1), ff = DB.date.fmtFull;
  const months = Array.from({ length: 6 }, (_, i) => A.vdYMadd(ym, -i)).map((m) => { const st = A.vdStmt(iid, m); st.s = A.vdStState(st); return st; });
  const paidOut = v.payouts.filter((x) => x.key === iid && (x.st === "paid" || (!x.st && x.at))).reduce((a, x) => a + (Number(x.amount) || (x.snap ? x.snap.pay : 0)), 0);
  const pf = A.vdProf(iid), lm = months[1], links = mine.filter((p) => p.status !== "hidden"), coach = A.isCoach(), tm = X.taxMode(), R = X.rsRules();
  if (lm.rec && lm.rec.snap) A.vsMarkSeen(iid, last);
  const has = (x) => x.n || x.rec || x.adDed || x.carry, w = Math.floor(2500000 / 1.1), wh = Math.floor(w * 0.033 / 10) * 10;
  const types = [["person", "개인 (프리랜서)", tm === "std" ? "정산액 ÷ 1.1(부가세 전 금액)에서 사업소득 3.3%를 떼고 지급해요" : "사업소득 3.3%를 떼고 지급해요"], ["biz", "사업자", tm === "std" ? "정산액(부가세 포함)으로 두고홀딩스에 세금계산서를 발행해 주세요" : tm === "gross" ? "판매가 합계로 세금계산서를 발행해 주세요 · 수수료분은 두고홀딩스가 발행" : tm === "net" ? "정산 금액(부가세 포함)으로 세금계산서를 발행해 주세요" : "정산 금액 + 부가세 10% · 세금계산서를 발행해 주세요"]];
  const lock = pf.typeBy === "master", FI = ({ id, name, label, v0, ...rest }) => <div className="a-field"><label htmlFor={id}>{label}</label><input className="a-input" id={id} name={name} defaultValue={v0 || ""} {...rest} /></div>;
  return <>
    <Head title="판매 정산" sub={"DOOGO CLASS에서 판매한 VOD · 전자책 · LIVE · 오프라인 강의의 정산이에요. 매달 1일~말일 판매분을 다음 달 10일에 지급해요." + (coach ? " 코치는 보기만 할 수 있어요 (정산 계좌 · 세금계산서는 강사님만)." : "")} right={<Store />} />
    <Isl html={A.vsThisMonth(lm)} />
    <div className="a-kpis">
      <Kpi label="이번 달 받을 금액" value={won(lm.pay)} sub={A.vdYMtxt(last) + " 판매분 · " + fmtMD(A.vdPayDate(last)) + " · " + (lm.n || lm.rec ? lm.s.t : "판매 없음")} href="#/center/vod-settle" tone={lm.n && lm.s.k !== "paid" ? "info" : ""} />
      <Kpi label="이번 달 판매 (집계 중)" value={won(Math.max(0, months[0].net))} sub={A.vdYMtxt(ym) + " 판매 " + months[0].n + "건 · " + fmtMD(A.vdPayDate(ym)) + " 지급 예정"} href="#/center/vod-settle" tone="ok" />
      <Kpi label="누적 지급 완료" value={won(paidOut)} sub="지금까지 받은 정산" href="#/center/vod-settle" />
      {coach ? <Kpi label="정산 유형" value={pf.type === "biz" ? "사업자" : "개인"} sub="정산 계좌 · 세금계산서는 강사님만 다뤄요" href="#/center/vod-settle" />
        : <Kpi label="정산 받을 정보" value={pf.account ? (pf.type === "biz" ? "사업자" : "개인") : "미등록"} sub={pf.account ? (pf.bank || "") + " · " + (pf.type === "biz" ? "세금계산서 발행" : "3.3% 원천징수") : "계좌를 등록해야 지급돼요"} href="#/center/vod-settle" tone={pf.account ? "" : "warn"} />}
    </div>
    <div className="fin-grid vs-pays"><Isl html={A.vsPayCard(months[1], true)} /><Isl html={A.vsPayCard(months[0], false)} /></div>
    <Isl html={A.vsRateCard(iid, mine)} />
    {links.length ? <section className="a-card"><div className="a-card-head"><h2>내 강의 전용 링크</h2><span className="a-muted">SNS · 블로그 · 카톡에 이 링크를 쓰면 ‘강사 링크’ 판매로 따로 집계돼요 (정산 비율은 같아요)</span></div>
      <div className="vs-links">{links.map((p) => { const u = window.ROUTE.abs("#/vod/p/" + p.id + "?by=" + iid); return <div key={p.id} className="vs-link"><span className="vs-link-t"><Isl html={A.vdThumb(p, "sm")} /><b>{p.title}</b></span><input className="a-input a-sm" defaultValue={u} readOnly aria-label={p.title + " 전용 링크"} /><Btn action="vda-copy" cls="a-btn-ghost a-btn-sm" data-u={u}><Icon n="link" c="sm" />복사</Btn></div>; })}</div></section> : null}
    <section className="a-card"><div className="a-card-head"><h2>월별 정산 명세</h2><span className="a-muted">마스터가 확정하면 명세서가 고정돼요</span></div><div className="a-table-wrap"><table className="a-table vs-table"><thead><tr><th>판매 월</th><th>판매</th><th className="right">판매가 합계</th><th className="right">정산액</th><th className="right">차감</th><th className="right">광고비 분담</th><th className="right">세금</th><th className="right">지급액</th><th>상태</th><th className="right" /></tr></thead><tbody>
      {months.map((x) => (
        <tr key={x.ym} className={has(x) ? undefined : "a-dim"}><td><b>{A.vdYMtxt(x.ym)}</b><Isl html={'<div class="vs-chs">' + A.vdChTags(x) + "</div>"} /></td><td className="num">{x.n}건</td><td className="right num">{won(x.base)}{x.rs ? <small className="vc-rs">온드 RS − {won(x.rs)}</small> : null}</td><td className="right num">{won(x.ins)}</td>
          <td className="right num">{x.ded ? "- " + won(x.ded) : "0원"}</td><Isl html={'<td class="right num">' + A.vdAdCell(x) + "</td>"} /><td className="right num">{x.biz ? "+ " + won(x.vat) : x.wh ? "- " + won(x.wh) : "0원"}</td>
          <Isl html={'<td class="right num"><b>' + won(x.pay) + "</b>" + A.vdNextTxt(x) + "</td>"} /><td>{has(x) ? <Pill cls={x.s.c}>{x.s.t}</Pill> : <span className="a-muted">-</span>}</td>
          <td className="right vs-acts">{has(x) ? <Btn action="vda-stm" cls="a-btn-ghost a-btn-sm" data-k={iid} data-m={x.ym}>명세서</Btn> : null}{x.s.k === "confirmed" && x.biz ? <Btn action="vda-inv" cls="a-btn-primary a-btn-sm" data-m={x.ym}>세금계산서 발행 완료</Btn> : null}</td></tr>
      ))}</tbody></table></div></section>
    {coach ? null : <section className="a-card"><div className="a-card-head"><h2>정산 받을 정보</h2><span className="a-muted">마스터에게만 보여요</span></div><form key={n} id="vs-prof-form" className="a-form" noValidate>
      <div className={"vs-type" + (lock ? " locked" : "")}>{types.map((t) => <label key={t[0]} className="vb-kind-o"><input type="radio" name="type" value={t[0]} defaultChecked={(pf.type || "person") === t[0]} disabled={lock || undefined} /><span><b>{t[1]}</b><small>{t[2]}</small></span></label>)}</div>
      {lock ? <p className="a-hint"><Icon n="lock" c="xs" /> 정산 유형({pf.type === "biz" ? "사업자" : "개인"})은 운영팀이 정했어요. 바꾸려면 운영팀에 문의해 주세요.</p> : null}
      <div className="a-form-row"><FI id="vs-name" name="name" label="이름 · 상호" v0={pf.name} maxLength="40" /><div className="a-field"><label htmlFor="vs-biz">사업자등록번호 <small>(사업자만)</small></label><input className="a-input" id="vs-biz" name="bizNo" defaultValue={pf.bizNo || ""} maxLength="12" inputMode="numeric" placeholder="000-00-00000" /></div></div>
      <div className="a-form-row"><FI id="vs-bank" name="bank" label="은행" v0={pf.bank} maxLength="20" placeholder="국민은행" /><FI id="vs-acc" name="account" label="계좌번호" v0={pf.account} maxLength="30" inputMode="numeric" /><FI id="vs-hold" name="holder" label="예금주" v0={pf.holder} maxLength="30" /></div>
      <FI id="vs-mail" name="email" label="정산 · 세금계산서 이메일" v0={pf.email} type="email" maxLength="80" />
      <p className="a-muted p-small"><Icon n="shieldCheck" c="xs" /> 주민등록번호 같은 원천징수 신고 정보는 화면에 저장하지 않고, 첫 지급 전에 마스터가 따로 안전하게 받아요.</p>
      <p className="a-error" id="vs-error" /><div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">정산 정보 저장</button></div></form></section>}
    <section className="a-card a-settle-note"><h2><Icon n="shieldCheck" c="sm" /> 정산 기준</h2><ul>
      <li>정산액 = (할인 전 판매가 − 온드미디어 RS − PG 결제 수수료) × 정산 비율(기본 50%)이고, 부가세가 들어 있는 금액이에요. 예: 1,000만 원이 팔리고 RS · PG 수수료를 빼서 500만 원이면 강사님 250만 원 · 플랫폼 250만 원이에요. 플랫폼이 발행한 쿠폰 · 포인트 할인은 플랫폼이 부담해요.</li>
      <li><b>온드미디어 RS</b>: 두고미디어 등 YouTube 채널(온드미디어)의 홍보 링크로 팔린 주문은 RS(판매가 × (1 − PG {R.pg}%) × RS율 · 구독자 {R.subs / 10000}만 이상 {R.hi}% · 미만 {R.lo}%)를 먼저 빼고 남은 금액을 내 비율로 나눠요. 어떤 채널 링크로 팔렸는지는 주문 · 정산 달력 · 명세서에 그대로 보여요. 링크 없이 팔린 주문은 RS가 없어요.</li>
      <li>정산 비율은 마스터가 강사님과 조율해 확정한 비율이에요(기본 강사 5 : 플랫폼 5). VOD 강의 · 전자책 · LIVE · 1:1 코칭권 · TEA TIME마다 따로 정할 수 있고, 적용 시작일 전에 결제한 주문은 그때 비율 그대로예요.</li>
      <li>광고비는 마스터가 달마다 실제 집행액을 적고, 강사 분담분(기본 50%)을 그 달 정산에서 빼요. 내역은 위 ‘광고비 내역’에서 볼 수 있어요.</li>
      <li>매달 1일 ~ 말일 판매분을 다음 달 초에 마스터가 확정하고, 다음 달 10일에 등록한 계좌로 지급해요. 10일이 주말 · 공휴일이면 다음 영업일이에요.</li>
      <li>확정 전에 환불된 주문은 빠지고, 확정한 뒤 환불되면 다음 정산에서 차감해요.</li>
      <li>{(tm === "std" ? "사업자 강사는 정산액(부가세 포함) 그대로 받아요 — 그 금액으로 (주)두고홀딩스에 세금계산서를 발행해 주시면 지급해요. 개인(프리랜서) 강사는 정산액 ÷ 1.1(부가세 전 금액)에서 사업소득 3.3%(소득세 3% + 지방소득세 0.3%)를 떼고 받아요. 예: 250만 원 → 부가세 전 " + won(w) + " − 3.3% " + won(wh) + " = " + won(w - wh) + "." : "개인 강사는 사업소득 3.3%(소득세 3% + 지방소득세 0.3%)를 떼고 지급해요. ") + (tm === "std" ? "" : tm === "gross" ? "사업자 강사는 그 달 판매가 합계로 (주)두고홀딩스에 세금계산서를 발행하고, 두고홀딩스가 수수료 · 광고비 분담분 세금계산서를 발행한 뒤 차액(정산 금액)을 지급해요." : tm === "net" ? "사업자 강사는 정산 금액(부가세 포함)으로 (주)두고홀딩스에 세금계산서를 발행해 주시면 지급해요." : "사업자 강사는 정산 금액에 부가세 10%를 더해 세금계산서를 발행해 주시면 지급해요.") + " 월별 명세서에 발행할 금액이 나와요."}</li></ul></section>
  </>;
}

export function Coaching({ n }) {
  const A = ADM(), DB = DBX(), won = A.won, iid = A.IID(), X = A.VX(), v = A.VD(), all = DB.requests(iid).filter((x) => DB.isVodStudent(x.s)), f = A.ui.coF || "open";
  const list = all.filter((x) => f === "all" || (f === "open" ? !x.q.answer : !!x.q.answer)), passes = v.orders.filter((o) => X.kindOf(o) === "coach" && o.coach && o.status === "paid" && (A.vdP(o.pid) || {}).iid === iid);
  const live = passes.filter((o) => o.paidAt + (Number(o.coach.days) || 180) * 864e5 > Date.now()), leftN = live.reduce((a, o) => a + Math.max(0, (Number(o.coach.n) || 0) - (Number(o.coach.used) || 0)), 0);
  const ym = DB.date.todayStr().slice(0, 7), mon = passes.filter((o) => A.vdYM(o.paidAt) === ym), cp = v.products.find((p) => p.iid === iid && X.coachOf(p)), c = cp ? X.coachOf(cp) : null, open = all.filter((x) => !x.q.answer).length;
  return <>
    <Head title="1:1 코칭 답변" sub="DOOGO CLASS에서 1:1 코칭권을 산 VOD 수강생이 두잉고 ‘1:1 코칭 질문’에 남긴 질문이에요. 질문 1개에 코칭권 1회가 차감되고, 답변하면 수강생 화면에 바로 보여요." right={<Store />} />
    <div className="a-kpis"><Kpi label="답변 대기" value={open + "건"} sub="48시간 안에 답하기" href="#/center/coaching" tone={open ? "warn" : ""} /><Kpi label="사용 중인 코칭권" value={live.length + "장"} sub={"남은 질문 " + leftN + "회"} href="#/center/coaching" />
      {A.can("vod") ? <Kpi label="이번 달 코칭권 판매" value={mon.length + "건"} sub={won(A.vdSum(mon)) + " · 정산 " + won(A.vdSum(mon, A.vdInsAmt))} href={A.can("vod-settle") ? "#/center/vod-settle" : "#/center/vod"} tone={mon.length ? "ok" : ""} /> : null}
      <Kpi label="코칭권 구성" value={c ? c.n + "회 · " + won(c.price) : "판매 안 함"} sub={c ? c.days + "일 · 1회 " + won(c.per) + " · 가격은 마스터와 정해요" : "판매하려면 마스터에게 요청해 주세요"} href="#/center/coaching" /></div>
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{[["open", "답변 대기", open], ["done", "답변 완료", all.length - open], ["all", "전체", all.length]].map((t) => <button key={t[0]} type="button" className={"a-tab" + (f === t[0] ? " on" : "")} data-action="co-tab" data-k={t[0]}>{t[1]} <span className="num">{t[2]}</span></button>)}</div></div>
      {list.length ? <div className="a-stack">{list.map((x) => { const o = passes.find((y) => (y.coach.qs || []).indexOf(x.q.id) >= 0), no = o ? (o.coach.qs || []).indexOf(x.q.id) + 1 : 0; return (
        <article key={x.q.id} className="a-q"><div className="a-q-head"><span className="a-avatar">{String(x.s.name).slice(0, 1)}</span><div><b>{x.q.title}</b><small>{x.s.name + " · VOD 수강생" + (o ? " · 코칭권 " + o.coach.n + "회 중 " + no + "번째" : "") + " · " + fmtStamp(x.q.at)}</small></div><Pill cls="mute">{x.q.category || "기타"}</Pill>{x.q.answer ? <Pill cls="ok">답변 완료</Pill> : <Pill cls="warn">답변 대기</Pill>}</div>
          {x.q.answer && (x.q.answeredBy || x.q.answeredAt) ? <p className="a-q-by"><span className="a-by"><Icon n="user" c="xs" />{x.q.answeredBy || "강사"}</span>{x.q.answeredAt ? " · " + fmtStamp(x.q.answeredAt) + " 답변" : " 답변"}</p> : null}
          <p className="a-q-body">{x.q.body}</p>
          {(x.q.images || []).length ? <div className="a-shots a-q-shots">{x.q.images.map((im, i) => <a key={i} className="a-shot" href={im.data} target="_blank" rel="noopener"><img src={im.data} alt={im.name} /></a>)}</div> : null}
          <form key={x.q.id + ":" + n} className="a-q-form" data-sid={x.s.id} data-qid={x.q.id}><textarea className="a-input" name="answer" rows="4" placeholder="예: 샘플 요청 메일에 단가를 같이 물어봐도 괜찮아요. ‘검토용’이라고 밝혀 두면 답장이 더 빨라요." aria-label="답변" defaultValue={x.q.answer || ""} /><button className="a-btn a-btn-primary a-btn-sm" type="submit">{x.q.answer ? "답변 수정" : "답변 등록"}</button></form></article>); })}</div>
        : <Empty ic="message">{f === "open" ? "답변을 기다리는 코칭 질문이 없어요." : "코칭 질문이 없어요."}</Empty>}</section>
    <p className="a-hint"><Icon n="coins" c="xs" />{(A.can("vod") ? " 코칭권 매출은 " + (A.isCoach() ? "강사님" : "내") + " 코칭권 정산 비율(" + X.addonShare(iid) + "%)로 정산돼요." : "") + " 사용 기간이 끝난 코칭권의 남은 횟수는 사라져요."}</p>
  </>;
}

/** TEA TIME 신청 #/center/teatime (예전 pageTeaTime · 신청 카드 teaItem 은 예전 HTML — 일정 확정 폼 · 취소 · 진행 완료는 예전 이벤트가 받아요) */
export function TeaTime() {
  const A = ADM(), DB = DBX(), won = A.won, iid = A.IID(), X = A.VX(), all = X.teasOf(null, iid), f = A.ui.teaF || "req", st = (o) => (o.status === "pending" ? "pend" : (o.tea || {}).st || "req");
  const F = [["req", "확정 대기"], ["ok", "일정 확정"], ["done", "진행 완료"], ["all", "전체"]], cnt = (k) => all.filter((o) => k === "all" || st(o) === k).length;
  const list = all.filter((o) => f === "all" || st(o) === f).sort((a, b) => (f === "ok" ? String(a.tea.when).localeCompare(String(b.tea.when)) : b.at - a.at));
  const ym = DB.date.todayStr().slice(0, 7), mon = all.filter((o) => o.status === "paid" && o.paidAt && A.vdYM(o.paidAt) === ym), next = all.filter((o) => st(o) === "ok" && o.tea.when).sort((a, b) => String(a.tea.when).localeCompare(String(b.tea.when)))[0];
  const cp = A.VD().products.find((p) => p.iid === iid && X.teaOf(p)), t = cp ? X.teaOf(cp) : null;
  return <>
    <Head title="TEA TIME 신청" sub="VOD 수강생이 DOOGO CLASS에서 결제하고 신청한 1:1 만남이에요. 희망 날짜를 보고 일정을 확정하면 수강생 마이페이지와 두잉고 화면에 바로 보여요." right={<Store />} />
    <div className="a-kpis"><Kpi label="확정 대기" value={cnt("req") + "건"} sub="희망 날짜를 보고 확정해 주세요" href="#/center/teatime" tone={cnt("req") ? "warn" : ""} />
      <Kpi label="다가오는 TEA TIME" value={next ? X.teaWhen(next.tea) : "없음"} sub={next ? ((A.vdMember(next.mid) || {}).name || "") + (next.tea.where ? " · " + next.tea.where : "") : "확정된 일정이 없어요"} href="#/center/teatime" />
      {A.can("vod") ? <Kpi label="이번 달 TEA TIME 매출" value={won(A.vdSum(mon))} sub={mon.length + "건 · 정산 " + won(A.vdSum(mon, A.vdInsAmt))} href={A.can("vod-settle") ? "#/center/vod-settle" : "#/center/vod"} tone={mon.length ? "ok" : ""} /> : null}
      <Kpi label="TEA TIME 구성" value={t ? t.min + "분 · " + won(t.price) : "판매 안 함"} sub={t ? X.TEA_MODE[t.mode] : "판매하려면 마스터에게 요청해 주세요"} href="#/center/teatime" /></div>
    <div className="a-tabs">{F.map((x) => <button key={x[0]} type="button" className={"a-tab" + (f === x[0] ? " on" : "")} data-action="tea-f" data-k={x[0]}>{x[1]} <b>{cnt(x[0])}</b></button>)}</div>
    <section className="a-card">{list.length ? <div className="a-stack">{list.map((o) => <Isl key={o.id} html={A.teaItem(o)} />)}</div> : <Empty ic="calendar">{f === "req" ? "확정을 기다리는 TEA TIME이 없어요." : "이 조건의 TEA TIME이 없어요."}</Empty>}</section>
    <p className="a-hint"><Icon n="shieldCheck" c="xs" /> 확정 전 · 확정 3일 전까지 취소하면 전액 환불돼요. 강사님 사정으로 취소하면 마스터가 전액 환불해 드려요. 연락처는 진행 안내에 필요한 뒷자리만 보여요.</p>
  </>;
}

/** 운영팀 공지 #/center/ops-notices (예전 pageOpsNotices) — 열면 읽음으로 (왼쪽 메뉴 숫자는 React 가 다시 그려서 빼요) */
export function OpsNotices() {
  const A = ADM(), DB = DBX(), iid = A.IID(), ins = A.INS(), list = A.annFor(iid), [seen] = useState(() => (ins && ins[A.annSeenKey()]) || "");
  useEffect(() => { if (ins && list.length && list.some((a) => a.date > seen)) { ins[A.annSeenKey()] = DB.date.todayStr(); DB.save(); window.ReactApp.redraw(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <Head title="운영팀 공지" sub="두잉고 운영팀이 보내는 기능 업데이트 · 점검 · 운영 정책 소식이에요. 강사님에게만 보낸 공지도 여기에 모여요." />
    <section className="a-card">{list.length ? <div className="a-ann-all">{list.map((a, i) => (
      <details key={i} open={a.date > seen || a.pinned || undefined}><summary>{a.pinned ? <><Pill cls="dark">고정</Pill> </> : null}{a.to ? <><Pill cls="info">나에게만</Pill> </> : null}<b>{a.title}</b><small>{DB.date.fmtFull(a.date)}</small>{a.date > seen ? <> <em className="a-new">NEW</em></> : null}</summary><Isl html={'<div class="a-ann-b">' + DB.rich(a.body) + "</div>"} /></details>
    ))}</div> : <Empty ic="megaphone">아직 받은 공지가 없어요.</Empty>}</section>
  </>;
}
