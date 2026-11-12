"use client";
/* 마스터 두잉고 — 운영: 수료 관리
 * 예전 admin.js pageMasterCerts 를 React 로 (Next.js 전환 6단계)
 *  · 명단 보기 · 기수 고르기 · 수료번호 조회는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Pager } from "./bits.jsx";

function CertResult({ q }) {
  const A = ADM(), DB = DBX(), s = DB.data.students.find((x) => A.certNoOf(x) === q) || DB.data.students.find((x) => A.certNoLegacy(x) === q);
  if (!s) return <div className="cert-res bad"><Icon n="alert" c="sm" /><div><b>등록되지 않은 수료번호예요</b><span>{q} · 번호를 다시 확인해 주세요.</span></div></div>;
  const co = DB.studentCohort(s), ins = DB.instructor(s.instructorId || co.instructorId), stt = DB.stats(DB.progress(s.id), ins.id, co), ok = stt.reqTotal && stt.reqDone === stt.reqTotal;
  return <div className={"cert-res " + (ok ? "ok" : "warn")}><Icon n={ok ? "award" : "alert"} c="sm" /><div><b>{ok ? "유효한 수료증이에요" : "수료 조건을 아직 채우지 않았어요"}</b><span>{q + " · " + s.name + " · " + ins.displayName + " " + co.name + " · 필수 과제 " + stt.reqDone + "/" + stt.reqTotal}</span></div></div>;
}
export function MasterCerts() {
  const A = ADM(), DB = DBX(), ui = A.ui, data = A.certData(), ended = data.filter((x) => x.st === "ended" && x.rows.length);
  const rate = (x) => (x.rows.length ? Math.round(x.earned.length / x.rows.length * 100) : 0);
  const f = ui.certCo || "all", pick = data.filter((x) => f === "all" || x.co.id === f);
  const grads = pick.flatMap((x) => x.earned.map((r) => ({ x, r }))).slice(0, 60);
  const nearList = data.filter((x) => x.st === "running").flatMap((x) => x.near.map((r) => ({ x, r }))).slice(0, 8);
  const H = "#/center/master/certs", Dot = ({ id }) => <span className="mc-dot" style={{ "--c": A.insTheme(id) }} />;
  return <>
    <Head title="수료 관리" sub="기수별 수료율과 수료생 명단을 봐요. 필수 과제를 모두 통과하면 수료증이 자동으로 발급되고, 수료번호로 진위를 확인할 수 있어요. 수료가 얼마 안 남은 수강생은 강사님께 알려 챙기게 해 주세요." />
    <div className="a-kpis">
      <Kpi label="누적 수료생" value={data.reduce((a, x) => a + x.earned.length, 0) + "명"} sub="필수 과제 모두 통과" href={H} tone="ok" />
      <Kpi label="종료 기수 평균 수료율" value={(ended.length ? Math.round(ended.reduce((a, x) => a + rate(x), 0) / ended.length) : 0) + "%"} sub={"종료된 기수 " + ended.length + "개"} href={H} />
      <Kpi label="수료 임박" value={nearList.length + "명"} sub="필수 과제 1~2개 남음 · 진행 중 기수" href={H} tone={nearList.length ? "warn" : ""} />
      <Kpi label="발급 기준" value="필수 과제 100%" sub="수강생 화면 ‘수료증 발급’ 메뉴" href="#/center/master/menus" />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>기수별 수료율</h2></div>{data.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사 · 기수</th><th>상태</th><th className="num">수강생</th><th className="num">수료</th><th>수료율</th><th className="num">수료 임박</th><th className="right"></th></tr></thead><tbody>
      {data.map((x) => <tr key={x.co.id}><td><Dot id={x.ins.id} /><b>{x.ins.displayName}</b> {x.co.name}</td><td><Pill cls={x.st === "running" ? "ok" : "mute"}>{DB.STATUS_LABEL[x.st]}</Pill></td><td className="num">{x.rows.length}명</td><td className="num"><b>{x.earned.length}명</b></td><td><div className="a-bar"><span style={{ width: rate(x) + "%" }} /></div><small className="num">{rate(x)}%</small></td><td className="num">{x.near.length}명</td><td className="right"><Btn action="cert-co" cls="a-btn-ghost a-btn-sm" data-k={x.co.id}>명단 보기</Btn></td></tr>)}</tbody></table></div>
      : <Empty ic="award">아직 시작한 기수가 없어요.</Empty>}</section>
    <div className="p-grid p-grid-r">
      <section className="a-card"><div className="a-card-head"><h2>수료생 명단</h2><select key={f} className="a-input a-sm cert-sel" data-cert-co="1" defaultValue={f}><option value="all">전체 기수</option>{data.map((x) => <option key={x.co.id} value={x.co.id}>{x.ins.displayName + " " + x.co.name}</option>)}</select></div>
        {grads.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>수료번호</th><th>이름</th><th>강사 · 기수</th><th className="num">필수 과제</th></tr></thead><tbody>{grads.map(({ x, r }) => <tr key={r.s.id}><td><code>{A.certNoOf(r.s)}</code></td><td><b>{r.s.name}</b></td><td>{x.ins.displayName + " " + x.co.name}</td><td className="num">{r.st.reqDone}/{r.st.reqTotal}</td></tr>)}</tbody></table></div> : <Empty ic="award">이 기수에는 아직 수료생이 없어요.</Empty>}</section>
      <div className="a-stack">
        <section className="a-card"><div className="a-card-head"><h2>수료증 진위 확인</h2></div><div className="cert-q"><input key={ui.certQ || ""} className="a-input" id="cert-q" placeholder="예: DG-MOON-3-0001" defaultValue={ui.certQ || ""} maxLength={30} aria-label="수료번호" /><Btn action="cert-check" cls="a-btn-primary"><Icon n="search" c="sm" />조회</Btn></div>{ui.certQ ? <CertResult q={ui.certQ.trim().toUpperCase()} /> : null}<p className="a-muted p-small">기업 · 기관에서 수료 여부를 물어 오면 수료증의 ‘제 ○○ 호’ 번호로 확인해 주세요.</p></section>
        <section className="a-card"><div className="a-card-head"><h2>수료 임박 수강생</h2></div>{nearList.length ? <ul className="sla-list">{nearList.map(({ x, r }) => <li key={r.s.id}><Dot id={x.ins.id} /><div><b>{r.s.name}</b><small>{x.ins.displayName + " " + x.co.name}</small></div><em className="sla-age ok">{r.st.reqTotal - r.st.reqDone}개 남음</em></li>)}</ul> : <Empty ic="check">지금 수료 임박한 수강생이 없어요.</Empty>}</section>
      </div>
    </div>
  </>;
}

/* ---------------- 강사 계약 · 서류 #/center/master/contracts (예전 pageMasterContracts) ----------------
 *  · 계약 등록 · 수정 창(서류 올리기 · 채워서 인쇄)은 아직 예전 창이에요 */
export function MasterContracts() {
  const A = ADM(), DB = DBX(), cs = A.CONTRACTS(), DOCS = A.DOCS, ff = DB.date.fmtFull;
  const list = DB.data.instructors.map((ins) => ({ ins, c: cs[ins.id], s: A.contractState(cs[ins.id]) })).sort((a, b) => a.s[2] - b.s[2]);
  const H = "#/center/master/contracts", miss = list.filter((x) => x.c && A.docMissing(x.c)).length, soon = list.filter((x) => x.s[2] === 1).length;
  const DocChips = ({ c }) => <span className="ct-docs">{DOCS.map((x) => { const f = c && c.docs && c.docs[x[0]]; return <span key={x[0]} className={"ct-doc " + (f ? "on" : "")} title={x[1] + (f ? " · " + (f.at || "") + " 받음" : " · 미제출")}>{f ? <Icon n="check" c="xs" /> : null}{x[1]}</span>; })}</span>;
  return <>
    <Head title="강사 계약 · 서류" sub="강사님별 이용 계약 기간과 받아야 할 서류를 관리해요. 만료가 다가오거나 서류가 빠진 강사님을 먼저 보여 드려요." />
    <div className="a-kpis">
      <Kpi label="계약 중" value={list.filter((x) => x.s[2] === 3 || x.s[2] === 1).length + "명"} sub={"전체 강사 " + list.length + "명"} href={H} tone="ok" />
      <Kpi label="30일 안 만료" value={soon + "명"} sub="갱신 연락이 필요해요" href={H} tone={soon ? "warn" : ""} />
      <Kpi label="서류 미비" value={miss + "명"} sub="4종 중 빠진 서류가 있어요" href={H} tone={miss ? "warn" : ""} />
      <Kpi label="계약 미등록" value={list.filter((x) => x.s[2] === 9).length + "명"} sub="계약 정보를 넣어 주세요" href={H} />
    </div>
    <section className="a-card ct-tpl-card"><div className="a-card-head"><h2>두잉고 계약서 양식</h2><span className="a-muted">한 번 계약하면 계약 기간 동안 여는 모든 기수에 적용돼요 · 기수마다 다시 쓰지 않아요</span></div><div className="ct-tpl-grid">
      {[["service", "두잉고 서비스 이용 계약서", "계약 기간 · 이용료 · 환불 · 두고클래스 판매 정산 · 해지"], ["privacy", "개인정보 처리업무 위탁 계약서", "수강생 개인정보 처리 위탁 (개인정보 보호법 제26조) · 재위탁 · 안전 조치"]].map((x) => <div key={x[0]} className="ct-tpl-item"><span className="ct-tpl-ic"><Icon n="file" c="sm" /></span><div><b>{x[1]}</b><small>{x[2]}</small></div><a className="a-btn a-btn-sm" href={window.DG_FORMS_FILES[x[0]]} download=""><Icon n="download" c="sm" />Word 양식</a></div>)}
      </div><p className="a-muted p-small">강사님 정보로 채운 계약서는 강사별 ‘계약 등록 · 수정’ 창의 ‘채워서 인쇄 · PDF’ 로 만들어요. 서명한 파일을 받으면 같은 창에서 올려 주세요.</p></section>
    <section className="a-card"><div className="a-card-head"><h2>강사별 계약</h2><span className="a-muted">서류 4종: {DOCS.map((x) => x[1]).join(" · ")}</span></div><div className="a-table-wrap"><table className="a-table ct-table"><thead><tr><th>강사</th><th>계약 기간</th><th>상태</th><th>이용료 기준</th><th>서류</th><th>담당자</th><th className="right"></th></tr></thead><tbody>
      {list.map(({ ins, c, s }) => <tr key={ins.id}><td><span className="mc-dot" style={{ "--c": A.insTheme(ins.id) }} /><b>{ins.displayName}</b><small className="a-memo">{ins.name}</small></td><td>{c && c.start ? ff(c.start) + " ~ " + ff(c.end) : <span className="a-muted">-</span>}</td><td><Pill cls={s[1]}>{s[0]}</Pill></td><td><small>{(c && c.feeNote) || "-"}</small></td><td><DocChips c={c} /></td>
        <td>{(c && c.contact) || "-"}{c && c.phone ? <small className="a-memo">{c.phone}</small> : null}</td><td className="right"><Btn action="ct-edit" cls={c ? "a-btn-ghost a-btn-sm" : "a-btn-primary a-btn-sm"} data-id={ins.id}>{c ? "수정" : "계약 등록"}</Btn></td></tr>)}</tbody></table></div></section>
    <p className="a-muted p-small p-privacy"><Icon n="lock" c="xs" /> 서류 파일은 지금 이 브라우저에만 저장돼요(시안). 정식 반영 때 암호화된 서버 저장소로 옮겨요.</p>
  </>;
}

/* ---------------- 운영자 계정 · 활동 기록 #/center/master/staff (예전 pageMasterStaff) ---------------- */
export function MasterStaff() {
  const A = ADM(), DB = DBX(), ui = A.ui, list = A.STAFF(), logs = DB.data.adminLog || [], f = ui.logWho || "all", fs = DB.date.fmtStamp;
  const shown = logs.filter((l) => f === "all" || l.staffId === f), lp = A.pageSlice("log", shown, 10);
  const menuName = {}; A.masterNavRaw().concat(A.masterDcNavRaw()).forEach((g) => g[1].forEach((it) => { menuName[it[0]] = it[1]; }));
  return <>
    <Head title="운영자 계정 · 활동 기록" sub="두잉고 운영을 함께하는 직원 계정을 만들고, 맡은 일에 맞게 메뉴 권한을 나눠요. 누가 언제 무엇을 바꿨는지 활동 기록이 자동으로 남아요." right={<Btn action="st-new" cls="a-btn-primary"><Icon n="userPlus" c="sm" />운영자 추가</Btn>} />
    <section className="a-card"><div className="a-card-head"><h2>운영자</h2><span className="a-muted">{list.length + 1}명 · ‘마스터 · 패밀리’ 탭에서 로그인해요</span></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>이름</th><th>아이디</th><th>역할</th><th>열린 메뉴</th><th>최근 로그인</th><th>상태</th><th className="right"></th></tr></thead><tbody>
      <tr className="st-owner"><td><span className="st-av ms"><Icon n="shieldCheck" c="xs" /></span><b>최고 관리자</b></td><td><code>ADMIN</code></td><td><Pill cls="info">최고 관리자</Pill></td><td><small className="a-muted">모든 메뉴 · 운영자 관리</small></td><td>-</td><td><Pill cls="ok">사용 중</Pill></td><td className="right"></td></tr>
      {list.map((st) => { const ps = st.perms || []; return <tr key={st.id}><td><span className="st-av">{st.name.slice(0, 1)}</span><b>{st.name}</b></td><td><code>{st.loginId}</code></td><td>{A.staffRoleName(st)}</td><td><span className="ct-docs">{ps.slice(0, 4).map((k) => <span key={k} className="ct-doc on">{menuName[k] || k}</span>)}{ps.length > 4 ? <span className="ct-doc">+{ps.length - 4}</span> : null}</span></td>
        <td>{st.lastLoginAt ? fs(st.lastLoginAt) : "-"}</td><td><Pill cls={st.status === "active" ? "ok" : "mute"}>{st.status === "active" ? "사용 중" : "중지"}</Pill></td><td className="right"><Btn action="st-edit" cls="a-btn-ghost a-btn-sm" data-id={st.id}>수정</Btn><Btn action="st-toggle" cls="a-btn-text a-btn-sm" data-id={st.id}>{st.status === "active" ? "중지" : "재개"}</Btn></td></tr>; })}
    </tbody></table></div></section>
    <section className="a-card" data-pg-card="log"><div className="a-card-head"><h2>활동 기록</h2><select key={f} className="a-input a-sm cert-sel" data-log-who="1" defaultValue={f}><option value="all">모든 사람</option><option value="admin">ADMIN</option>{list.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}</select></div>
      {shown.length ? <><ol className="st-log">{lp.items.map((l, i) => <li key={i}><time>{fs(l.at)}</time><b>{l.who}</b><span>{l.msg}</span></li>)}</ol><Pager k="log" pg={lp} /></> : <Empty ic="activity">아직 활동 기록이 없어요.</Empty>}</section>
  </>;
}

/* ---------------- 영업 패밀리 관리 #/center/master/rs (예전 pageMasterRS) ----------------
 *  · 패밀리 추가 · 수정 · 중지 · 지급 완료 · 공지 쓰기는 예전 admin.js 이벤트 · 창이 그대로 받아요 · RS 기본 설정 폼은 다시 그릴 때마다 저장된 값으로 (key=n) */
export function MasterRs({ n }) {
  const A = ADM(), DB = DBX(), won = A.won, ff = DB.date.fmtFull, list = A.affList(), set = A.AFF().affSettings, today = DB.date.todayStr();
  const all = list.map((p) => ({ p, s: A.affSum(p) })), queue = [];
  list.forEach((p) => A.affMonths(p).forEach((g) => { if (!g.po) queue.push({ p, g }); }));
  queue.sort((a, b) => a.g.payDate.localeCompare(b.g.payDate));
  const refs = DB.inquiries().filter((q) => A.inqAff(q)), H = "#/center/master/rs", notes = A.AFFN();
  return <>
    <Head title="영업 패밀리 관리" sub="영업 패밀리 계정을 만들고, 소개한 강사님과 RS 비율을 정해요. 강사님 이용료 입금이 확인되면 공급가액 × RS%가 패밀리 수익으로 자동 계산돼요." right={<Btn action="aff-new" cls="a-btn-primary"><Icon n="plus" c="sm" />패밀리 추가</Btn>} />
    <div className="a-kpis">
      <Kpi label="활동 중인 패밀리" value={list.filter((p) => p.status === "active").length + "명"} sub={"연결된 강사 " + list.reduce((a, p) => a + (p.instructors || []).length, 0) + "명"} href={H} />
      <Kpi label="지급할 금액 (세후)" value={won(queue.reduce((a, x) => a + A.affNet(x.p, x.g.total).net, 0))} sub={queue.length ? "가장 빠른 지급일 " + ff(queue[0].g.payDate) : "지급할 정산이 없어요"} href={H} tone={queue.some((x) => today >= x.g.payDate) ? "warn" : ""} />
      <Kpi label="입금 대기 예상 RS" value={won(all.reduce((a, x) => a + x.s.expected, 0))} sub="강사 이용료 입금 전" href={H} />
      <Kpi label="누적 지급액" value={won(all.reduce((a, x) => a + x.s.paidOut, 0))} sub="지급 완료 처리한 금액" href={H} />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>패밀리</h2><span className="a-muted">{list.length}명</span></div>{list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>패밀리</th><th>아이디</th><th className="num">기본 RS</th><th>담당 강사 (RS)</th><th className="num">누적 수익</th><th className="num">미지급</th><th>상태</th><th></th></tr></thead><tbody>{all.map(({ p, s }) => (
      <tr key={p.id}><td><b>{p.name}</b><br /><small className="a-muted">{p.phone || ""}</small></td><td><code>{p.loginId}</code></td><td className="num">{p.rs !== null && p.rs !== undefined && p.rs !== "" ? p.rs + "%" : <>{A.affDefRs()}% <small className="a-muted">기본</small></>}</td>
        <td>{(p.instructors || []).length ? p.instructors.map((l) => <span key={l.iid} className="p-chip">{A.insName(l.iid) + " " + A.affRate(p, l.iid) + "%"}</span>) : <span className="a-muted">없음</span>}</td><td className="num">{won(s.total)}</td><td className="num"><b>{won(s.pending)}</b></td><td><Pill cls={p.status === "active" ? "ok" : "mute"}>{p.status === "active" ? "활동 중" : "중지"}</Pill></td>
        <td className="a-right"><Btn action="aff-edit" cls="a-btn-ghost a-btn-sm" data-id={p.id}>수정</Btn><Btn action="aff-toggle" cls="a-btn-text a-btn-sm" data-id={p.id}>{p.status === "active" ? "중지" : "재개"}</Btn></td></tr>))}</tbody></table></div>
      : <Empty ic="handshake">아직 패밀리가 없어요. ‘패밀리 추가’로 첫 패밀리를 만들어 보세요.</Empty>}</section>
    <div className="p-grid p-grid-r">
      <section className="a-card"><div className="a-card-head"><h2>지급 처리</h2><span className="a-muted">패밀리에게 보낸 뒤 ‘지급 완료’를 눌러 주세요</span></div>{queue.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>패밀리</th><th>정산 월</th><th className="num">건수</th><th className="num">RS 수익</th><th className="num">보낼 금액</th><th>지급일</th><th>지급 계좌</th><th></th></tr></thead><tbody>{queue.map(({ p, g }) => (
        <tr key={p.id + g.month}><td><b>{p.name}</b></td><td>{g.month.slice(0, 4)}년 {A.monthKo(g.month)}</td><td className="num">{g.rows.length}건</td><td className="num">{won(g.total)}</td><td className="num"><b className="p-amt">{won(A.affNet(p, g.total).net)}</b><small className="a-memo">{A.TAX[A.affTaxKey(p)].short}</small></td>
          <td>{ff(g.payDate)} <small className="a-muted">{A.dLeft(g.payDate)}</small></td><td>{p.account ? (p.bank || "") + " " + p.account + " (" + (p.holder || p.name) + ")" : <span className="a-muted">계좌 미등록</span>}</td><td className="a-right"><Btn action="aff-pay" cls="a-btn-primary a-btn-sm" data-id={p.id} data-m={g.month}><Icon n="check" c="sm" />지급 완료</Btn></td></tr>))}</tbody></table></div>
        : <Empty ic="check">지급할 정산이 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>RS 기본 설정</h2></div><form key={n} id="aff-set-form" className="a-form" noValidate>
        <div className="a-field"><label htmlFor="as-rs">기본 RS (%)</label><input className="a-input" id="as-rs" name="rs" type="number" min="0" max="100" step="0.5" defaultValue={set.rs} /><small className="a-muted">패밀리 · 강사님별로 따로 정하지 않으면 이 비율로 계산돼요.</small></div>
        <div className="a-field"><label htmlFor="as-day">지급일 (매월)</label><input className="a-input" id="as-day" name="payDay" type="number" min="1" max="28" defaultValue={set.payDay} /><small className="a-muted">한 달 동안 입금 확인된 이용료의 RS를 다음 달 이 날짜에 지급해요.</small></div>
        <p className="a-muted p-small">계산 기준: 강사님 기수 이용료의 <b>공급가액(부가세 제외)</b> × RS%</p><button className="a-btn a-btn-primary" type="submit">저장</button></form></section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>패밀리 공지</h2><Btn action="an-new" cls="a-btn-outline a-btn-sm"><Icon n="plus" c="sm" />공지 쓰기</Btn></div>{notes.length ? <ul className="a-items">{A.affNoticeList().map((x) => <li key={x.id}><div className="a-item-main"><b>{x.title}</b><small>{ff(DB.date.toStr(new Date(x.at))) + " · " + x.body.slice(0, 70)}</small></div>{x.pinned ? <Pill cls="dark">고정</Pill> : null}<div className="a-row-actions"><Btn action="an-edit" cls="a-btn-ghost a-btn-sm" data-id={x.id}>수정</Btn><Btn action="an-del" cls="a-btn-text a-btn-sm danger" data-id={x.id}>삭제</Btn></div></li>)}</ul> : <Empty ic="megaphone">아직 패밀리 공지가 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>추천 링크로 들어온 입점 문의</h2><span className="a-muted">{refs.length}건</span></div>{refs.length ? <ul className="p-refs">{refs.map((q) => { const owner = A.inqAff(q), st = A.inqStatus(q); return <li key={q.id}><b>{q.name || "문의"}</b><span>{String(q.course || "").slice(0, 40)}</span><em>{owner ? owner.name + " 패밀리 소개" : "코드 " + q.ref}</em><Pill cls={st[2]}>{st[1]}</Pill><small>{DB.date.fmtStamp(q.at)}</small><a className="a-link" href="#/center/master/partners">보기</a></li>; })}</ul> : <Empty ic="link">아직 추천 링크로 들어온 문의가 없어요.</Empty>}</section>
  </>;
}
