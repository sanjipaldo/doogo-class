"use client";
/* 강사센터 수강생 관리 #/center/students(?status=&cohort=) — 승인 · 거절 · 탈퇴 · 복구 · 삭제 · 일괄 승인 · 검색 · 기수 고르기
 * 예전 admin.js pageStudents · stuActions 를 React 로 (Next.js 전환 6단계)
 *  · 탭 · 기수 · 검색 · 체크 · 버튼은 예전 admin.js 이벤트가 그대로 받아요 (stu-tab · #stu-cohort · #stu-q · .stu-pick · #stu-all · data-action) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

function Acts({ s }) {
  if (s.status === "pending") return <><Btn action="stu-reject" cls="a-btn-ghost a-btn-sm" data-id={s.id}>거절</Btn><Btn action="stu-approve" cls="a-btn-primary a-btn-sm" data-id={s.id}>승인</Btn></>;
  if (s.status === "approved") return <><Btn action="student-open" cls="a-btn-ghost a-btn-sm" data-id={s.id}>상세</Btn><Btn action="stu-withdraw" cls="a-btn-ghost a-btn-sm danger" data-id={s.id}>탈퇴</Btn></>;
  if (s.status === "rejected") return <><Btn action="stu-approve" cls="a-btn-ghost a-btn-sm" data-id={s.id}>승인으로 변경</Btn><Btn action="stu-delete" cls="a-btn-ghost a-btn-sm danger" data-id={s.id}>삭제</Btn></>;
  return <><Btn action="stu-approve" cls="a-btn-ghost a-btn-sm" data-id={s.id}>복구</Btn><Btn action="stu-delete" cls="a-btn-ghost a-btn-sm danger" data-id={s.id}>삭제</Btn></>;
}

export default function Students({ r }) {
  const A = ADM(), DB = DBX(), ui = A.ui, iid = A.IID(), STU = A.STU;
  if (r.params.get("status")) ui.stuStatus = r.params.get("status");
  if (r.params.get("cohort")) ui.stuCohort = r.params.get("cohort");
  const cos = DB.cohortsOf(iid);
  if (ui.stuCohort !== "all" && !cos.some((x) => x.id === ui.stuCohort)) ui.stuCohort = "all";
  const all = DB.studentsOf(iid).filter((s) => ui.stuCohort === "all" || s.cohortId === ui.stuCohort), q = ui.stuQuery.trim();
  const list = all.filter((s) => (ui.stuStatus === "all" || s.status === ui.stuStatus) && (!q || (s.name + s.phone4).indexOf(q) !== -1)).sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
  const cnt = (k) => all.filter((s) => k === "all" || s.status === k).length, pend = ui.stuStatus === "pending", pendingVisible = list.filter((s) => s.status === "pending");
  return <>
    <Head title="수강생 관리" sub="수강 신청을 승인·거절하고, 기수를 옮기거나 탈퇴 처리할 수 있어요." right={<Btn action="student-add" cls="a-btn-primary"><Icon n="userPlus" c="sm" />수강생 추가</Btn>} />
    <section className="a-card">
      <div className="a-toolbar"><div className="a-tabs">{["pending", "approved", "rejected", "withdrawn", "all"].map((k) => <button key={k} type="button" className={"a-tab" + (ui.stuStatus === k ? " on" : "")} data-action="stu-tab" data-k={k}>{k === "all" ? "전체" : STU[k].label} <span className="num">{cnt(k)}</span></button>)}</div>
        <div className="a-filters"><select className="a-input a-sm" id="stu-cohort" aria-label="기수" defaultValue={ui.stuCohort} key={"c" + ui.stuCohort}><option value="all">전체 기수</option>{cos.map((co) => <option key={co.id} value={co.id}>{co.name} ({DB.STATUS_LABEL[DB.cohortStatus(co)]})</option>)}</select>
          <div className="a-search"><Icon n="search" c="sm" /><input className="a-input a-sm" id="stu-q" type="search" placeholder="이름 · 뒷자리 검색" defaultValue={ui.stuQuery} /></div></div></div>
      {pend && pendingVisible.length ? <div className="a-bulk"><label className="a-check"><input type="checkbox" id="stu-all" defaultChecked={pendingVisible.every((s) => ui.picked.has(s.id))} /><span>모두 선택</span></label><span className="a-muted">{ui.picked.size}명 선택</span>
        <Btn action="bulk-reject" cls="a-btn-ghost a-btn-sm">선택 거절</Btn><Btn action="bulk-approve" cls="a-btn-primary a-btn-sm">선택 승인</Btn></div> : null}
      {list.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr>{pend ? <th className="w-check" /> : null}<th>이름</th><th>뒷자리</th><th>기수</th><th>신청일</th><th>상태</th><th>성장 단계</th><th>진행률</th><th className="right">관리</th></tr></thead><tbody>
        {list.map((s) => {
          const st = s.status === "approved" ? DB.stats(DB.progress(s.id), iid, DB.studentCohort(s)) : null;
          return (
            <tr key={s.id}>{pend ? <td className="w-check"><input type="checkbox" className="stu-pick" data-id={s.id} defaultChecked={ui.picked.has(s.id)} aria-label={s.name + " 선택"} /></td> : null}
              <td><button className="a-name" data-action="student-open" data-id={s.id}>{s.name}</button>{s.demo === true ? <span className="a-demo-tag" title="체험(테스트) 계정 · 로그인 · 로그아웃마다 처음으로">체험</span> : null}{s.memo ? <small className="a-memo">{s.memo}</small> : null}</td>
              <td className="num">{s.phone4}</td><td>{A.cohortName(s.cohortId)}</td><td className="num">{s.appliedAt ? fmtMD(s.appliedAt) : "-"}</td><td><Pill cls={STU[s.status].cls}>{STU[s.status].label}</Pill></td>
              <td>{st ? <Isl html={A.lvBadge(A.levelOfStudent(s))} /> : <span className="a-muted">-</span>}</td>
              <td>{st ? <><div className="a-bar"><span style={{ width: st.pct + "%" }} /></div><small className="num">{st.pct}% · 필수 {st.reqDone}/{st.reqTotal}</small></> : <span className="a-muted">-</span>}</td>
              <td className="right"><div className="a-row-actions"><Acts s={s} /></div></td></tr>
          );
        })}</tbody></table></div>
        : <Empty ic="users">{pend ? "승인 대기 중인 신청이 없어요." : "조건에 맞는 수강생이 없어요."}</Empty>}
    </section>
    <p className="a-hint"><Icon n="alert" c="xs" /> 수강생은 로그인 화면의 ‘수강 신청하기’로 신청하면 여기에 ‘승인 대기’로 들어와요. 승인한 수강생만 로그인할 수 있어요.</p>
  </>;
}
