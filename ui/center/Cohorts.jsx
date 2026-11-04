"use client";
/* 강사센터 기수 관리 #/center/cohorts — 기수 카드(상태 · 기간 · 커리큘럼 · 수업 요일 · 특별 일정 · 수강생 수 · 주차 일정)
 * 예전 admin.js pageCohorts 를 React 로 (Next.js 전환 6단계) · 미리보기 · 일정 설계(팝업)는 예전 admin.js 이벤트가 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl } from "./bits.jsx";

export default function Cohorts() {
  const A = ADM(), DB = DBX(), iid = A.IID(), S = A.S(), cos = DB.cohortsOf(iid).slice().reverse(), ff = DB.date.fmtFull;
  return <>
    <Head title="기수 관리" sub={"기수마다 1주차 강의일 · 진행 주차 · 무료 강의 · 오프라인 강의 · 챌린지 날짜를 정하면 주차별 공개일과 과제 마감일이 자동으로 계산되고, 수강생 대시보드에 바로 보여요." + (S.role === "master" ? "" : " 새 기수는 ‘다음 기수 신청’ 후 이용료 입금이 확인되면 두잉고가 열어 드려요.")} right={<Isl html={A.newCohortBtn()} />} />
    {cos.length ? <div className="a-stack">{cos.map((co) => {
      const st = DB.cohortStatus(co), ss = DB.studentsOf(iid).filter((s) => s.cohortId === co.id), ap = ss.filter((s) => s.status === "approved").length, pe = ss.filter((s) => s.status === "pending").length;
      return (
        <section key={co.id} className="a-card a-cohort"><div className="a-card-head"><h2>{co.name}</h2><Pill cls={A.COHORT_CLS[st]}>{DB.STATUS_LABEL[st]}</Pill>{co.recruiting && st !== "ended" ? <Pill cls="info">신청 받는 중</Pill> : null}
          <span className="a-muted">{ff(co.startDate) + " ~ " + ff(DB.cohortEnd(co)) + (st === "running" ? " · " + DB.currentWeek(co) + "주차" : "")}</span>
          <span className="a-cur-chip"><Icon n="book" c="xs" />{DB.curriculumOf(co).name} · {DB.cohortWeeks(co)}주</span><span className="a-cur-chip"><Icon n="calendar" c="xs" />{A.classText(co)}</span>
          <div className="a-row-actions"><Btn action="plan-pv" cls="a-btn-ghost a-btn-sm" data-iid={iid} data-id={co.id}><Icon n="eye" c="sm" />미리보기</Btn><Btn action="cohort-edit" cls="a-btn-primary a-btn-sm" data-id={co.id}><Icon n="pen" c="sm" />일정 설계 · 수정</Btn></div></div>
          <Isl html={A.planChips(iid, co)} />
          <div className="a-cohort-stats"><a href={"#/center/students?cohort=" + co.id + "&status=approved"}><b className="num">{ap}</b><span>수강 중</span></a><a href={"#/center/students?cohort=" + co.id + "&status=pending"}><b className="num">{pe}</b><span>승인 대기</span></a><div><b className="num">{ss.length}</b><span>전체 신청</span></div></div>
          <Isl html={A.weekStrip(co)} /></section>
      );
    })}</div> : <section className="a-card"><Empty ic="layers" extra={<Isl html={A.newCohortBtn()} />}>{S.role === "master" ? "아직 기수가 없어요. 첫 기수를 열어 주세요." : "아직 기수가 없어요. ‘다음 기수 신청’을 남겨 주시면 연락드릴게요."}</Empty></section>}
  </>;
}
