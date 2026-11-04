"use client";
/* 강사센터 과제 검수 #/center/reviews — 상태 탭 · 기수 · 주차 · 일괄 승인 / 보완 요청 · 제출물 열기(팝업)
 * 예전 admin.js pageReviews · bulkBar 를 React 로 (Next.js 전환 6단계) · 탭 · 고르기 · 체크 · 버튼은 예전 admin.js 이벤트가 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Isl, fmtStamp } from "./bits.jsx";

export default function Reviews() {
  const A = ADM(), DB = DBX(), ui = A.ui, iid = A.IID(), cos = DB.cohortsOf(iid);
  if (!ui.revCohort || (ui.revCohort !== "all" && !cos.some((x) => x.id === ui.revCohort))) { const cur = (DB.currentCohort(iid) || {}).id, pn = (k) => A.allSubmissions(iid, k).filter((x) => x.review === "pending").length; ui.revCohort = cur && (pn(cur) || !pn("all")) ? cur : "all"; }
  let list = A.allSubmissions(iid, ui.revCohort);
  if (ui.revWeek !== "all") list = list.filter((x) => String(x.w.no) === ui.revWeek);
  const cnt = (k) => list.filter((x) => k === "all" || x.review === k).length, shown = list.filter((x) => ui.revFilter === "all" || x.review === ui.revFilter);
  const keys = shown.map((x) => x.s.id + "|" + x.m.id), picked = keys.filter((k) => ui.revPicked.has(k)).length, weeks = Math.max(0, ...DB.curricula(iid).map((x) => x.weeks.length));
  return <>
    <Head title="과제 검수" sub="수강생 제출물은 자동검수 결과가 먼저 반영되고, 강사님이 승인하거나 보완을 요청하면 그 결과가 최종이 돼요." />
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{[["pending", "검수 대기"], ["fix", "보완 요청"], ["approved", "승인"], ["all", "전체"]].map((t) => <button key={t[0]} type="button" className={"a-tab" + (ui.revFilter === t[0] ? " on" : "")} data-action="rev-tab" data-k={t[0]}>{t[1]} <span className="num">{cnt(t[0])}</span></button>)}</div>
      <div className="a-filters"><select key={"c" + ui.revCohort} className="a-input a-sm" id="rev-cohort" aria-label="기수" defaultValue={ui.revCohort}><option value="all">전체 기수</option>{cos.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}</select>
        <select key={"w" + ui.revWeek} className="a-input a-sm" id="rev-week" aria-label="주차" defaultValue={ui.revWeek}><option value="all">전체 주차</option>{Array.from({ length: weeks }, (_, i) => i + 1).map((no) => <option key={no} value={String(no)}>{no}주차</option>)}</select></div></div>
      {shown.length ? <>
        <div className="a-bulk a-rev-bulk"><label className="a-check"><input type="checkbox" id="rev-all-2" defaultChecked={!!picked && picked === keys.length} /><span>전체 선택 ({keys.length})</span></label><span className="a-muted">{picked}개 선택</span>
          <Btn action="rev-bulk-fix" cls="a-btn-ghost a-btn-sm danger"><Icon n="alert" c="sm" />선택 보완 요청</Btn><Btn action="rev-bulk-approve" cls="a-btn-primary a-btn-sm"><Icon n="check" c="sm" />선택 승인</Btn></div>
        <div className="a-table-wrap"><table className="a-table a-rev-table"><thead><tr><th className="w-check"><input type="checkbox" id="rev-all" aria-label="모두 선택" defaultChecked={shown.every((x) => ui.revPicked.has(x.s.id + "|" + x.m.id))} /></th><th>제출 시각</th><th>수강생</th><th>과제</th><th>제출</th><th>상태</th><th className="right" /></tr></thead><tbody>
          {shown.map((x) => { const key = x.s.id + "|" + x.m.id; return (
            <tr key={key} className="clickable" data-action="review-open" data-sid={x.s.id} data-mid={x.m.id}><td className="w-check"><input type="checkbox" className="rev-pick" data-key={key} defaultChecked={ui.revPicked.has(key)} aria-label={x.s.name + " " + x.m.title + " 선택"} /></td>
              <td className="num">{fmtStamp(x.sub.at)}</td><td><b>{x.s.name}</b><small className="a-memo">{A.cohortName(x.s.cohortId)}</small></td>
              <td>{x.w.no}주차 · {x.m.title}{x.m.required ? null : <> <small className="a-muted">{DB.MISSION_KINDS.find((k) => k.key === DB.missionKind(x.m)).short}</small></>}</td>
              <td className="num">{x.count}회</td><td><Isl html={A.reviewPill(x)} /></td><td className="right"><Btn action="review-open" cls="a-btn-ghost a-btn-sm" data-sid={x.s.id} data-mid={x.m.id}>열기</Btn></td></tr>); })}
        </tbody></table></div></> : <Empty ic="inbox">{ui.revFilter === "pending" ? "검수할 제출물이 없어요." : "해당하는 제출물이 없어요."}</Empty>}
    </section>
  </>;
}
