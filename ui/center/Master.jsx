"use client";
/* 마스터 (1) — 대시보드 · 강사 플랫폼 관리 · 전체 수강생
 * 예전 admin.js pageMasterHome · pageMasterInstructors · insTable · pageMasterStudents 를 React 로 (Next.js 전환 6단계)
 *  · 새 강사 플랫폼 · VOD 강사 등록 · 강사센터 접속 · 수정 · 번호 보기 · 강사/상태 고르기는 예전 admin.js 이벤트가 그대로 받아요
 *  · 이용료 · 매출 숫자 · 성장 단계 · 미리보기 버튼은 예전 HTML 그대로 (Isl) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

function InsTable() {
  const A = ADM(), DB = DBX(), list = DB.data.instructors, won = A.won, today = DB.date.todayStr(), canIns = A.staffCan("master/instructors"), canBill = A.staffCan("master/billing");
  return (
    <section className="a-card"><div className="a-card-head"><h2>강사 플랫폼</h2><span className="a-muted">{list.length}개</span></div>
      {list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>수강생에게 보이는 이름</th><th>강사 로그인</th><th>강의</th><th>열린 영역</th><th>기수</th><th>수강생</th><th>이용료 입금</th><th>상태</th><th className="right">관리</th></tr></thead><tbody>
        {list.map((x) => {
          const c = DB.content(x.id), cos = DB.cohortsOf(x.id), cur = DB.currentCohort(x.id), ss = DB.studentsOf(x.id), paid = DB.bills(x.id).filter((b) => !b.canceledAt && b.paidAt), o = DB.tracksOf(x), rq = x.trackReq || {}, pend = ss.filter((s) => s.status === "pending").length;
          return (
            <tr key={x.id}><td><b>{x.displayName}</b><small className="a-memo">{fmtMD(x.createdAt || today)} 개설</small></td>
              <td>{x.name} <span className="a-muted num">/ {canIns ? <button type="button" className="a-pw-peek" data-action="pw-peek" data-pw={x.phone4} title="눌러서 보기">••••</button> : "••••"}</span></td>
              <td>{c ? c.brand.courseTitle : "-"}</td>
              <td><span className="a-ins-trk">{o.live ? <Pill cls="trk-dg">두잉고 LIVE</Pill> : <span className="a-pill mute"><Icon n="lock" c="xs" />두잉고{rq.live ? " · 신청 중" : ""}</span>}{o.vod ? <Pill cls="trk-dc">DOOGO CLASS</Pill> : <span className="a-pill mute"><Icon n="lock" c="xs" />DOOGO CLASS{rq.vod ? " · 신청 중" : ""}</span>}</span></td>
              <td>{cos.length}개{cur ? <> <small className="a-memo">{cur.name + " " + DB.STATUS_LABEL[DB.cohortStatus(cur)]}</small></> : null}</td>
              <td className="num">{ss.filter((s) => s.status === "approved").length}명{pend ? <> <small className="a-memo">대기 {pend}</small></> : null}</td>
              <td className="num">{!canBill ? <span className="a-muted">-</span> : paid.length ? <>{won(A.sumMoney(paid, "supply"))} <small className="a-memo">{paid.length}개 기수</small></> : <span className="a-muted">-</span>}</td>
              <td>{x.status === "active" ? <Pill cls="ok">운영 중</Pill> : x.status === "removed" ? <Pill cls="mute">삭제됨</Pill> : <Pill cls="mute">중지</Pill>}</td>
              <td className="right"><div className="a-row-actions"><Btn action="ins-enter" cls="a-btn-primary a-btn-sm" data-id={x.id}>강사센터 접속</Btn>
                <a className="a-btn a-btn-ghost a-btn-sm" href={"#/center/master/plan?ins=" + x.id}><Icon n="layers" c="sm" />기수 · 일정</a><a className="a-btn a-btn-ghost a-btn-sm" href={"#/center/master/menus?ins=" + x.id}><Icon n="sliders" c="sm" />메뉴·색상</a>
                <a className="a-btn a-btn-ghost a-btn-sm" href={"#/free/" + x.id}><Icon n="video" c="sm" />무료강의</a><a className="a-btn a-btn-ghost a-btn-sm" href={"#/p/" + x.id}><Icon n="store" c="sm" />소개</a>
                <Btn action="ins-edit" cls="a-btn-ghost a-btn-sm" data-id={x.id}>수정</Btn></div></td></tr>
          );
        })}</tbody></table></div> : <Empty ic="store">강사 플랫폼이 없어요.</Empty>}
    </section>
  );
}

export function MasterHome() {
  const A = ADM(), DB = DBX(), ins = DB.data.instructors, st = DB.data.students, running = DB.data.cohorts.filter((c) => DB.cohortStatus(c) === "running").length;
  const newInq = DB.inquiries().filter((x) => (x.status || "new") === "new").length, newBills = DB.bills().filter((b) => DB.billState(b) === "requested");
  return <>
    <Head title="마스터 대시보드" sub="강사 플랫폼을 만들어 분양하고, 전체 운영 현황을 봐요." right={<><Isl html={A.dgSplitBtn("home")} /><Btn action="ins-add" cls="a-btn-primary"><Icon n="plus" c="sm" />새 강사 플랫폼</Btn></>} />
    {newBills.length ? <a className="a-inq-alert a-bill-alert" href="#/center/master/billing?tab=todo"><Icon n="coins" c="sm" /><b>다음 기수 신청 {newBills.length}건</b><span>{newBills.slice(0, 2).map((b) => A.insName(b.instructorId) + " " + b.cohortName).join(", ")} · 전화 후 입금을 확인해 주세요</span><Icon n="arrowRight" c="sm" /></a> : null}
    {newInq ? <a className="a-inq-alert" href="#/center/master/partners"><Icon n="handshake" c="sm" /><b>새 강사 입점 문의 {newInq}건</b><span>확인하고 연락해 주세요</span><Icon n="arrowRight" c="sm" /></a> : null}
    <div className="a-kpis">
      <Kpi label="강사 플랫폼" value={ins.length + "개"} sub={"운영 중 " + ins.filter((x) => x.status === "active").length + "개"} href="#/center/master/instructors" />
      <Kpi label="전체 수강생" value={st.filter((s) => s.status === "approved").length + "명"} sub="수강 중 기준" href="#/center/master/students" />
      <Kpi label="진행 중 기수" value={running + "개"} sub="모든 강사 합계" href="#/center/master/instructors" />
      <Kpi label="승인 대기" value={st.filter((s) => s.status === "pending").length + "명"} sub="강사 승인 전" href="#/center/master/students" tone="warn" />
    </div>
    <h2 className="a-sub-h">기수 이용료 · 매출 <a className="a-link" href="#/center/master/billing">자세히 <Icon n="arrowRight" c="xs" /></a></h2>
    {A.staffCan("master/billing") ? <Isl html={A.billKpis()} /> : <p className="a-muted p-small"><Icon n="lock" c="xs" /> 매출은 정산 권한이 있는 운영자만 볼 수 있어요.</p>}
    <Isl html={A.masterLevels()} />
    <InsTable />
  </>;
}

export function MasterInstructors() {
  const A = ADM(), DB = DBX(), act = DB.data.instructors.find((i) => i.status === "active");
  return <>
    <Head title="강사 플랫폼 관리" sub="LIVE 두잉고 강사는 ‘새 강사 플랫폼’(문대표 플랫폼 구성 · 기수 · 이용료), DOOGO CLASS VOD 강사는 ‘VOD 강사 등록’(계정만 · VOD 판매 정산)으로 만들어요. 강사는 이름 + 전화번호 뒷자리로 강사센터에 로그인하고, 잠긴 영역은 자물쇠를 눌러 신청해요(‘수정’에서 바로 열 수도 있어요)."
      right={<><Isl html={A.dgSplitBtn(act && act.id ? "room:" + act.id : "home", "강의실 미리보기")} /><Btn action="vins-add" cls="a-btn-outline"><Icon n="monitorPlay" c="sm" />VOD 강사 등록</Btn><Btn action="ins-add" cls="a-btn-primary"><Icon n="plus" c="sm" />새 강사 플랫폼 (LIVE)</Btn></>} />
    <InsTable />
  </>;
}

export function MasterStudents() {
  const A = ADM(), DB = DBX(), ui = A.ui, STU = A.STU, ins = DB.data.instructors;
  const list = DB.data.students.filter((s) => (ui.mIns === "all" || s.instructorId === ui.mIns) && (ui.mStatus === "all" || s.status === ui.mStatus));
  return <>
    <Head title="전체 수강생" sub="모든 강사 플랫폼의 수강생이에요. 승인·탈퇴는 각 강사센터에서 해요." />
    <section className="a-card"><div className="a-toolbar"><div className="a-filters">
      <select key={"i" + ui.mIns} className="a-input a-sm" id="m-ins" aria-label="강사" defaultValue={ui.mIns}><option value="all">전체 강사</option>{ins.map((x) => <option key={x.id} value={x.id}>{x.displayName}</option>)}</select>
      <select key={"s" + ui.mStatus} className="a-input a-sm" id="m-status" aria-label="상태" defaultValue={ui.mStatus}><option value="all">전체 상태</option>{Object.keys(STU).map((k) => <option key={k} value={k}>{STU[k].label}</option>)}</select>
    </div><span className="a-muted">{list.length}명</span></div>
      {list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>이름</th><th>강사</th><th>기수</th><th>신청일</th><th>상태</th><th>성장 단계</th><th>진행률</th></tr></thead><tbody>
        {list.map((s) => { const x = DB.instructor(s.instructorId), on = s.status === "approved" && DB.cohort(s.cohortId), lv = on ? A.levelOfStudent(s) : null; return (
          <tr key={s.id}><td><b>{s.name}</b> <span className="a-muted num">{s.phone4}</span></td><td>{x ? x.displayName : "-"}</td><td>{A.cohortName(s.cohortId)}</td><td className="num">{s.appliedAt ? fmtMD(s.appliedAt) : "-"}</td><td><Pill cls={STU[s.status].cls}>{STU[s.status].label}</Pill></td>
            {lv ? <><td><Isl html={A.lvBadge(lv)} /></td><td><div className="a-bar"><span style={{ width: lv.pct + "%" }} /></div><small className="num">{lv.pct}% · 필수 {lv.stats.reqDone}/{lv.stats.reqTotal}</small></td></> : <><td><span className="a-muted">-</span></td><td><span className="a-muted">-</span></td></>}</tr>); })}
      </tbody></table></div> : <Empty ic="users">조건에 맞는 수강생이 없어요.</Empty>}</section>
  </>;
}
