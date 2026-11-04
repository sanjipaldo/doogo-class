"use client";
/* 강사센터 다음 기수 신청 #/center/billing — 안내 · 신청 · 이용 내역 (예전 admin.js pageBilling 을 React 로 — Next.js 전환 6단계)
 *  · 신청 카드(입금 · 세금계산서 · 기수 열기 단계)는 예전 HTML 그대로 (Isl) · 버튼은 예전 admin.js 이벤트가 받아요 */
import { ADM, DBX, Head, Empty, Isl } from "./bits.jsx";

export default function Billing() {
  const A = ADM(), DB = DBX(), iid = A.IID(), list = DB.bills(iid), right = <Isl html={A.newCohortBtn()} />;
  return <>
    <Head title="다음 기수 신청" sub="새 기수는 이용료 입금이 확인되면 두잉고가 열어 드려요. 열린 기수의 일정 · 커리큘럼 · 수강생은 강사님이 자유롭게 관리해요." right={right} />
    <Isl html={A.billGuide()} />
    <section className="a-card"><div className="a-card-head"><h2>신청 · 이용 내역</h2><span className="a-muted">{list.length}건</span></div>
      {list.length ? <div className="a-stack">{list.map((b) => <Isl key={b.id} html={A.billCard(b, A.S().role === "master")} />)}</div> : <Empty ic="coins" extra={right}>아직 신청한 기수가 없어요.</Empty>}</section>
  </>;
}
