"use client";
/* 마스터 (2) — 플랫폼 현황 · 강사 공지 · 첫 화면 · 사업자 정보 · 데이터 관리
 * 예전 admin.js pageMasterHealth · pageMasterNotices · pageMasterSite · pageMasterData 를 React 로 (Next.js 전환 6단계)
 *  · 강사센터 접속 · 공지 쓰기/수정 · 저장(폼 site-form) · 백업 복사 · 복원 · 초기화는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtStamp } from "./bits.jsx";
import { AddBtn } from "./Content.jsx";

export function MasterHealth() {
  const A = ADM(), DB = DBX();
  const rows = DB.data.instructors.map((ins) => {
    const co = DB.currentCohort(ins.id), st = co ? A.studentProgressRows(ins.id, (s) => s.cohortId === co.id && s.status === "approved") : [];
    const avg = st.length ? Math.round(st.reduce((a, r) => a + r.st.pct, 0) / st.length) : 0, done = st.filter((r) => r.st.reqTotal && r.st.reqDone === r.st.reqTotal).length;
    const subs = A.allSubmissions(ins.id, "all"), pend = subs.filter((x) => x.review === "pending").length, reqs = DB.requests(ins.id).filter((x) => !x.q.answer && !DB.isVodStudent(x.s)).length, waiting = DB.studentsOf(ins.id).filter((s) => s.status === "pending").length;
    const flags = [];
    if (reqs) flags.push(["오류 신고 " + reqs, "bad"]); if (pend >= 10) flags.push(["검수 밀림 " + pend, "warn"]); if (waiting) flags.push(["승인 대기 " + waiting, "warn"]); if (!co) flags.push(["기수 없음", "mute"]);
    return { ins, co, st, avg, done, pend, reqs, last: subs[0] ? subs[0].sub.at : 0, flags };
  });
  const totalReq = rows.reduce((a, r) => a + r.reqs, 0);
  return <>
    <Head title="플랫폼 현황" sub="강사별로 수강생 진행률, 검수 밀림, 답변 안 된 오류 신고를 한눈에 보고 도움이 필요한 강사를 먼저 챙겨요." />
    <div className="a-kpis">
      <Kpi label="운영 중 플랫폼" value={rows.filter((r) => r.ins.status === "active").length + "개"} sub={"전체 " + rows.length + "개"} href="#/center/master/instructors" />
      <Kpi label="진행 중 수강생" value={rows.reduce((a, r) => a + r.st.length, 0) + "명"} sub="현재 기수 기준" href="#/center/master/students" />
      <Kpi label="수료 조건 달성" value={rows.reduce((a, r) => a + r.done, 0) + "명"} sub="필수 과제 모두 통과" href="#/center/master/health" />
      <Kpi label="답변 안 된 오류 신고" value={totalReq + "건"} sub="모든 플랫폼 합계" href="#/center/master/reports" tone={totalReq ? "warn" : ""} />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>강사별 현황</h2></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th>현재 기수</th><th>수강생</th><th>평균 진행률</th><th>수료 가능</th><th>검수 대기</th><th>최근 제출</th><th>살펴볼 점</th><th className="right" /></tr></thead><tbody>
      {rows.map((r) => (
        <tr key={r.ins.id}><td><b>{r.ins.displayName}</b><small className="a-memo">{r.ins.name}</small></td><td>{r.co ? <>{r.co.name} <small className="a-memo">{DB.STATUS_LABEL[DB.cohortStatus(r.co)]}</small></> : "-"}</td><td className="num">{r.st.length}명</td>
          <td><div className="a-bar"><span style={{ width: r.avg + "%" }} /></div><small className="num">{r.avg}%</small></td><td className="num">{r.done}명</td><td className="num">{r.pend}건</td><td className="num">{r.last ? fmtStamp(r.last) : "-"}</td>
          <td>{r.flags.length ? <div className="a-flags">{r.flags.map((f, i) => <Pill key={i} cls={f[1]}>{f[0]}</Pill>)}</div> : <Pill cls="ok">좋아요</Pill>}</td>
          <td className="right"><div className="a-row-actions"><Btn action="ins-enter" cls="a-btn-primary a-btn-sm" data-id={r.ins.id}>강사센터 접속</Btn></div></td></tr>
      ))}</tbody></table></div></section>
  </>;
}

export function MasterNotices() {
  const A = ADM(), DB = DBX(), list = DB.data.announcements.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
  return <>
    <Head title="강사 공지" sub="강사센터 · 코치 센터 ‘운영팀 공지’ 메뉴와 강사 대시보드 맨 위에 보여요. ‘받는 강사’를 고르면 그 강사님에게만 보내요." right={<AddBtn coll="ann" label="공지 쓰기" />} />
    <section className="a-card">{list.length ? <ul className="a-items">{list.map((n) => (
      <li key={n.id}><div className="a-item-main"><b>{n.title}</b><small>{DB.date.fmtFull(n.date) + " · " + (n.to ? A.insName(n.to) + " 강사님에게만 · " : "전체 · ") + (n.body || "").slice(0, 70)}</small></div>{n.pinned ? <Pill cls="dark">고정</Pill> : null}
        <div className="a-row-actions"><Btn action="item-edit" cls="a-btn-ghost a-btn-sm" data-coll="ann" data-id={n.id}><Icon n="pen" c="sm" />수정</Btn></div></li>
    ))}</ul> : <Empty ic="megaphone">강사에게 보낸 공지가 없어요.</Empty>}</section>
  </>;
}

export function MasterSite({ n }) {
  const A = ADM(), DB = DBX(), s = DB.siteInfo();
  return <>
    <Head title="첫 화면 · 사업자 정보" sub="두잉고 첫 화면 맨 아래(바닥)에 보이는 사업자 정보 · 사업제휴 문의예요. 채운 칸만 보이고, 기본 사업자 정보(두고홀딩스)가 들어 있는 칸은 비워 두면 기본값이 보여요." right={<Isl html={A.dgSplitBtn("home", "첫 화면 미리보기")} />} />
    <form key={n} id="site-form" className="a-site-form" noValidate>
      <section className="a-card"><div className="a-card-head"><h2>사업자 정보</h2><span className="a-muted">전자상거래법에 따라 사이트 바닥에 표시하는 정보예요</span></div>
        <div className="a-site-grid">{A.SITE_FIELDS.map((x) => <div key={x[0]} className={"a-field" + (x[3] ? " a-span2" : "")}><label htmlFor={"site-" + x[0]}>{x[1]}</label><input className="a-input" id={"site-" + x[0]} name={x[0]} defaultValue={s[x[0]] || ""} placeholder={x[2]} maxLength={x[0] === "notice" ? "300" : "200"} /></div>)}</div></section>
      <Isl html={A.tagCard(s)} />
      <div className="a-site-save"><button type="submit" className="a-btn a-btn-primary"><Icon n="check" c="sm" />저장</button></div>
    </form>
  </>;
}

export function MasterData() {
  const A = ADM(), DB = DBX(), json = JSON.stringify(A.snapshot()), kb = Math.round(new Blob([json]).size / 1024), on = DB.remote.on;
  return <>
    <Head title="데이터 관리" sub={on ? "데이터는 서버(Turso 데이터베이스)에 저장돼요. 어느 기기에서 로그인해도 같은 내용이 보여요. 혹시 모를 상황에 대비해 가끔 백업해 두세요." : "지금은 서버 없이 이 브라우저에 저장돼요. 다른 컴퓨터로 옮기거나 혹시 모를 상황에 대비해 백업해 두세요."} />
    <div className="a-kpis"><Kpi label="저장된 데이터" value={kb + "KB"} sub={on ? "서버 데이터베이스 (사진은 따로 보관)" : "브라우저 저장 공간 약 5MB 중"} href="#/center/master/data" tone={!on && kb > 3500 ? "warn" : ""} />
      <Kpi label="강사 플랫폼" value={DB.data.instructors.length + "개"} sub="콘텐츠 포함" href="#/center/master/instructors" /><Kpi label="수강생" value={DB.data.students.length + "명"} sub="제출 기록 포함" href="#/center/master/students" /><Kpi label="강사 공지" value={DB.data.announcements.length + "건"} sub="" href="#/center/master/notices" /></div>
    <section className="a-card"><div className="a-card-head"><h2>백업</h2><span className="a-muted">아래 내용을 복사해서 메모장 등에 보관하세요</span></div><textarea key={json.length} className="a-input a-mono" id="backup-out" rows="5" readOnly defaultValue={json} /><div className="a-card-foot"><Btn action="backup-copy" cls="a-btn-primary a-btn-sm"><Icon n="clipboard" c="sm" />백업 내용 복사</Btn></div></section>
    <section className="a-card"><div className="a-card-head"><h2>복원</h2><span className="a-muted">백업해 둔 내용을 붙여 넣으면 그 시점으로 돌아가요</span></div><textarea className="a-input a-mono" id="backup-in" rows="4" placeholder={'{"exportedAt": … }'} /><div className="a-card-foot"><Btn action="backup-restore" cls="a-btn-outline a-btn-sm"><Icon n="refresh" c="sm" />이 내용으로 복원</Btn></div></section>
    {on ? <Isl html={A.serverBackups()} /> : null}
    <section className="a-card"><div className="a-card-head"><h2>체험 데이터 처음으로</h2></div><p className="a-muted" style={{ margin: "0 0 12px" }}>모든 강사·수강생·제출 기록을 지우고 처음 체험 상태로 되돌려요. {on ? "지금 상태는 서버 자동 백업에 먼저 남겨요." : "되돌릴 수 없으니 먼저 백업하세요."}</p><Btn action="data-reset" cls="a-btn-ghost a-btn-sm danger"><Icon n="trash" c="sm" />처음 상태로 초기화</Btn></section>
  </>;
}

/** 전체 기수 일정 #/center/master/calendar (예전 pageMasterCalendar) — 달 옮기기는 예전 이벤트(cal-m) */
export function MasterCalendar() {
  const A = ADM(), DB = DBX(), ui = A.ui, today = DB.date.todayStr(), ym = ui.calMonth || today.slice(0, 7), ff = DB.date.fmtFull;
  const cos = DB.data.cohorts.filter((c) => A.insOk(c.instructorId) && c.startDate).map((co) => ({ co, ins: DB.instructor(co.instructorId), start: co.startDate, end: DB.cohortEnd(co), st: DB.cohortStatus(co), color: A.insTheme(co.instructorId), n: A.cohortStudents(co).length, weeks: DB.weeksOf(co).length }));
  const inM = (d) => d && d.slice(0, 7) === ym, y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), days = new Date(y, m, 0).getDate(), lead = new Date(y, m - 1, 1).getDay(), ds = (d) => ym + "-" + String(d).padStart(2, "0");
  const Chip = ({ x, kind }) => <span className={"mc-chip " + kind} style={{ "--c": x.color }} title={x.ins.displayName + " " + x.co.name + (kind === "s" ? " 시작" : " 종료 · 수료")}><i />{x.ins.displayName + " " + x.co.name}<em>{kind === "s" ? "시작" : "수료"}</em></span>;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<div key={"o" + i} className="mc-day off" />);
  for (let d = 1; d <= days; d++) {
    const k = ds(d), run = cos.filter((x) => x.start <= k && k <= x.end).length, dow = (lead + d - 1) % 7;
    cells.push(<div key={k} className={"mc-day" + (k === today ? " today" : "") + (dow === 0 ? " sun" : dow === 6 ? " sat" : "")}><b>{d}</b>{run ? <small className="mc-run">진행 {run}</small> : null}{cos.filter((x) => x.start === k).map((x) => <Chip key={"s" + x.co.id} x={x} kind="s" />)}{cos.filter((x) => x.end === k).map((x) => <Chip key={"e" + x.co.id} x={x} kind="e" />)}</div>);
  }
  const startM = cos.filter((x) => inM(x.start)), endM = cos.filter((x) => inM(x.end)), list = cos.slice().sort((a, b) => b.start.localeCompare(a.start));
  const stPill = (s) => <Pill cls={s === "running" ? "ok" : s === "upcoming" ? "info" : "mute"}>{DB.STATUS_LABEL[s]}</Pill>;
  return <>
    <Head title="전체 기수 일정" sub="모든 강사 플랫폼의 기수 시작 · 종료(수료) 날짜를 한 달력에서 봐요. 대학의 학사 일정처럼, 겹치는 기수와 다가오는 개강을 미리 챙길 수 있어요." right={<a className="a-btn a-btn-primary" href="#/center/master/plan"><Icon n="layers" c="sm" />기수 · 일정 설계</a>} />
    <div className="a-kpis">
      <Kpi label="모집 중 기수" value={cos.filter((x) => x.st === "upcoming").length + "개"} sub="개강 전" href="#/center/master/calendar" />
      <Kpi label="진행 중 기수" value={cos.filter((x) => x.st === "running").length + "개"} sub={"수강생 " + cos.filter((x) => x.st === "running").reduce((a, x) => a + x.n, 0) + "명 학습 중"} href="#/center/master/calendar" tone="ok" />
      <Kpi label={m + "월 개강"} value={startM.length + "개"} sub={startM.map((x) => x.ins.displayName).slice(0, 3).join(" · ") || "없어요"} href="#/center/master/calendar" />
      <Kpi label={m + "월 종료 · 수료"} value={endM.length + "개"} sub={endM.map((x) => x.ins.displayName).slice(0, 3).join(" · ") || "없어요"} href="#/center/master/certs" />
    </div>
    <section className="a-card mc"><div className="mc-head"><Btn action="cal-m" cls="a-btn-ghost a-btn-sm" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" c="sm" /></Btn><h2>{y}년 {m}월</h2><Btn action="cal-m" cls="a-btn-ghost a-btn-sm" data-dir="1" aria-label="다음 달"><Icon n="chevRight" c="sm" /></Btn>{ym !== today.slice(0, 7) ? <Btn action="cal-m" cls="a-btn-outline a-btn-sm" data-dir="0">이번 달</Btn> : null}
      <span className="mc-legend"><span className="mc-chip s"><i />개강</span><span className="mc-chip e"><i />종료 · 수료</span></span></div>
      <div className="mc-grid">{["일", "월", "화", "수", "목", "금", "토"].map((w, i) => <div key={w} className={"mc-w" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{w}</div>)}{cells}</div></section>
    <section className="a-card"><div className="a-card-head"><h2>기수 목록</h2><span className="a-muted">{list.length}개 · 최근 개강 순</span></div>{list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th>기수</th><th>기간</th><th className="num">주차</th><th className="num">수강생</th><th>상태</th><th className="right" /></tr></thead><tbody>
      {list.map((x) => <tr key={x.co.id}><td><span className="mc-dot" style={{ "--c": x.color }} /><b>{x.ins.displayName}</b></td><td>{x.co.name}</td><td>{ff(x.start) + " ~ " + ff(x.end)}{x.st === "upcoming" ? <> <small className="a-muted">개강 {A.dLeft(x.start)}</small></> : null}</td><td className="num">{x.weeks}주</td><td className="num">{x.n}명</td><td>{stPill(x.st)}</td>
        <td className="right"><div className="a-row-actions"><Btn action="plan-edit" cls="a-btn-ghost a-btn-sm" data-id={x.co.id}>설계 · 수정</Btn><Btn action="ins-enter" cls="a-btn-ghost a-btn-sm" data-id={x.ins.id}>강사센터 접속</Btn></div></td></tr>)}
    </tbody></table></div> : <Empty ic="calendar">아직 열린 기수가 없어요.</Empty>}</section>
  </>;
}

/** 과제 검수 · 응답 관리 #/center/master/sla (예전 pageMasterSla) — 기준 시간 저장(폼 sla-form)은 예전 이벤트 */
export function MasterSla({ n }) {
  const A = ADM(), set = A.SLA(), rows = A.slaRows(), H = A.hoursTxt, fs = (t) => DBX().date.fmtStamp(t);
  const late = rows.flatMap((r) => r.late.map((x) => Object.assign({ ins: r.ins }, x))).sort((a, b) => a.sub.at - b.sub.at).slice(0, 10), allDone = rows.filter((r) => r.avgRev != null), avg = allDone.length ? allDone.reduce((a, r) => a + r.avgRev, 0) / allDone.length : null;
  return <>
    <Head title="과제 검수 · 응답 관리" sub="강사님이 수강생 과제를 제때 검수하고, 1:1 요청에 제때 답하는지 봐요. 기준 시간을 넘긴 과제는 먼저 보여 드려요. 늦어지는 강사님께는 강사센터에 접속해 도와드리거나 공지로 알려 주세요." />
    <div className="a-kpis">
      <Kpi label="검수 대기 과제" value={rows.reduce((a, r) => a + r.pend.length, 0) + "건"} sub="모든 플랫폼 합계" href="#/center/master/sla" />
      <Kpi label={set.review + "시간 넘은 과제"} value={rows.reduce((a, r) => a + r.late.length, 0) + "건"} sub={"기준 " + set.review + "시간 안 검수"} href="#/center/master/sla" tone={rows.some((r) => r.late.length) ? "warn" : ""} />
      <Kpi label="평균 검수 시간" value={H(avg)} sub="제출 → 검수까지" href="#/center/master/sla" />
      <Kpi label="답변 대기 1:1 요청" value={rows.reduce((a, r) => a + r.open.length, 0) + "건"} sub={set.request + "시간 넘음 " + rows.reduce((a, r) => a + r.lateReq.length, 0) + "건"} href="#/center/master/reports" tone={rows.some((r) => r.lateReq.length) ? "warn" : ""} />
    </div>
    <section className="a-card"><div className="a-card-head"><h2>강사별 응답 현황</h2><span className="a-muted">기준: 과제 검수 {set.review}시간 · 1:1 요청 {set.request}시간</span></div><div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th className="num">검수 대기</th><th className="num">기준 초과</th><th className="num">평균 검수</th><th className="num">1:1 답변 대기</th><th className="num">평균 답변</th><th>상태</th><th className="right" /></tr></thead><tbody>
      {rows.map((r) => <tr key={r.ins.id}><td><span className="mc-dot" style={{ "--c": A.insTheme(r.ins.id) }} /><b>{r.ins.displayName}</b></td><td className="num">{r.pend.length}건</td><td className="num">{r.late.length ? <b className="sla-bad">{r.late.length}건</b> : "0건"}</td><td className="num">{H(r.avgRev)}</td>
        <td className="num">{r.lateReq.length ? <b className="sla-bad">{r.open.length}건</b> : r.open.length + "건"}</td><td className="num">{H(r.avgReq)}</td><td><Pill cls={r.grade[1]}>{r.grade[0]}</Pill></td><td className="right"><Btn action="ins-enter" cls="a-btn-ghost a-btn-sm" data-id={r.ins.id}>강사센터 접속</Btn></td></tr>)}
    </tbody></table></div></section>
    <div className="p-grid p-grid-r">
      <section className="a-card"><div className="a-card-head"><h2>오래 기다린 과제</h2><span className="a-muted">기준 시간을 넘긴 순</span></div>{late.length ? <ul className="sla-list">{late.map((x, i) => (
        <li key={i}><span className="mc-dot" style={{ "--c": A.insTheme(x.ins.id) }} /><div><b>{x.s.name + " · " + x.w.no + "주차 " + (x.m.title || "과제")}</b><small>{x.ins.displayName} · {fs(x.sub.at)} 제출</small></div><em className="sla-age">{H(A.ageH(x.sub.at))} 대기</em><Btn action="ins-enter" cls="a-btn-outline a-btn-sm" data-id={x.ins.id}>검수하러 가기</Btn></li>
      ))}</ul> : <Empty ic="check">기준 시간을 넘긴 과제가 없어요. 모두 제때 검수하고 있어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>응답 기준 시간</h2></div><form key={n} id="sla-form" className="a-form" noValidate>
        <div className="a-field"><label htmlFor="sla-review">과제 검수 (시간)</label><input className="a-input" id="sla-review" name="review" type="number" min="1" max="336" defaultValue={set.review} /><small className="a-muted">수강생이 과제를 내고 이 시간 안에 검수하면 ‘좋아요’예요.</small></div>
        <div className="a-field"><label htmlFor="sla-request">1:1 요청 답변 (시간)</label><input className="a-input" id="sla-request" name="request" type="number" min="1" max="336" defaultValue={set.request} /></div>
        <button className="a-btn a-btn-primary" type="submit">저장</button></form></section>
    </div>
  </>;
}
