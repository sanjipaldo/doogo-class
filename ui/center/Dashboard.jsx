"use client";
/* 강사센터 첫 화면 #/center — 강사(두잉고 LIVE) · 코치 · VOD 두잉고(DOOGO CLASS) 대시보드
 * 예전 admin.js pageDashboard · coachDashboard · pageVodDash 를 React 로 (Next.js 전환 6단계)
 *  · 승인 · 거절 · 과제 열기 · 미리보기 같은 버튼은 예전 admin.js 이벤트가 받아요 (data-action)
 *  · 아직 옮기지 않은 작은 조각(기수 신청 띠 · 성장 단계 · 진행 표 · 정산 띠 …)은 예전 HTML 그대로 (Isl) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl, fmtMD, fmtStamp } from "./bits.jsx";

const Ava = ({ name }) => <span className="a-avatar">{String(name).slice(0, 1)}</span>;
const Rp = ({ x }) => <Isl html={ADM().reviewPill(x)} />;
function PendList({ pend }) {
  const A = ADM();
  return <ul className="a-list">{pend.map((s) => <li key={s.id}><div className="a-who"><Ava name={s.name} /><div><b>{s.name}</b><small>{A.cohortName(s.cohortId)} · 뒷자리 {s.phone4} · {fmtMD(s.appliedAt)} 신청</small></div></div>
    <div className="a-row-actions"><Btn action="stu-reject" cls="a-btn-ghost a-btn-sm" data-id={s.id}>거절</Btn><Btn action="stu-approve" cls="a-btn-primary a-btn-sm" data-id={s.id}>승인</Btn></div></li>)}</ul>;
}
const More = ({ href, children }) => <a className="a-link" href={href}>{children} <Icon n="arrowRight" c="xs" /></a>;

/* ---------- 강사 (두잉고 LIVE) ---------- */
function InsDash() {
  const A = ADM(), DB = DBX(), iid = A.IID(), ins = A.INS(), c = A.C(), co = DB.currentCohort(iid), n = A.counts(iid);
  const rows = co ? A.studentProgressRows(iid, (s) => s.cohortId === co.id && s.status === "approved") : [];
  const subs = A.allSubmissions(iid, "all").slice(0, 6), pend = DB.studentsOf(iid).filter((s) => s.status === "pending").slice(0, 5), wk = co ? DB.currentWeek(co) : 0;
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.st.pct, 0) / rows.length) : 0, anns = A.annFor(iid).slice(0, 2), cs = co ? DB.cohortStatus(co) : "";
  return <>
    <Head title={ins.name + " 강사님, 안녕하세요"} sub={c.brand.courseTitle} right={<><Btn action="student-add" cls="a-btn-outline"><Icon n="userPlus" c="sm" />수강생 추가</Btn><Isl html={A.newCohortBtn()} /></>} />
    <Isl html={A.billBanner(iid)} />
    {anns.length ? <section className="a-ann"><Icon n="megaphone" c="sm" /><div className="a-ann-list">{anns.map((a, i) => <Isl key={i} html={"<details><summary><b>" + DB.esc(a.title) + "</b><small>두잉고 운영팀 · " + fmtMD(a.date) + "</small></summary>" + DB.rich(a.body) + "</details>"} />)}</div></section> : null}
    <div className="a-kpis">
      <Kpi label="승인 대기" value={n.pending + "명"} sub="새 수강 신청" href="#/center/students?status=pending" tone={n.pending ? "warn" : ""} />
      <Kpi label="진행 중 기수" value={co ? co.name : "-"} sub={co ? (cs === "running" ? wk + "주차 진행 중" : fmtMD(co.startDate) + " 시작") : "다음 기수를 신청해 주세요"} href={co ? "#/center/cohorts" : "#/center/billing"} />
      <Kpi label="수강생 평균 진행률" value={avg + "%"} sub={(co ? co.name + " · " : "") + rows.length + "명 기준"} href="#/center/students?status=approved" />
      <Kpi label="검수 대기 · 미답변" value={n.review + " · " + n.questions} sub="과제 검수 / 1:1 요청" href="#/center/reviews" tone={n.review + n.questions ? "info" : ""} />
    </div>
    {co ? <section className="a-card"><div className="a-card-head"><h2>{co.name} 주차 일정</h2><Pill cls={A.COHORT_CLS[cs]}>{DB.STATUS_LABEL[cs]}</Pill><More href="#/center/cohorts">기수 관리</More></div><Isl html={A.weekStrip(co)} /></section> : null}
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>승인 대기</h2><More href="#/center/students?status=pending">전체</More></div>{pend.length ? <PendList pend={pend} /> : <Empty ic="check">대기 중인 신청이 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>최근 과제 제출</h2><More href="#/center/reviews">과제 검수</More></div>
        {subs.length ? <ul className="a-list">{subs.map((x) => <li key={x.s.id + x.m.id} className="clickable" data-action="review-open" data-sid={x.s.id} data-mid={x.m.id}><div className="a-who"><Ava name={x.s.name} /><div><b>{x.s.name} · {x.m.title}</b><small>{x.w.no}주차 · {fmtStamp(x.sub.at)}</small></div></div><Rp x={x} /></li>)}</ul> : <Empty ic="inbox">아직 제출된 과제가 없어요.</Empty>}</section>
    </div>
    {co ? <section className="a-card"><div className="a-card-head"><h2>{co.name} 성장 단계 현황</h2><span className="a-muted">과제를 해낼수록 단계가 올라가요 · 필수 과제를 모두 통과하면 숲</span></div><Isl html={A.levelBoard(rows)} /></section> : null}
    {co ? <section className="a-card"><div className="a-card-head"><h2>{co.name} 수강생 진행 현황</h2><span className="a-muted">{rows.length}명</span></div><Isl html={A.progressTable(rows, { weeks: DB.weeksOf(co) })} /></section> : null}
  </>;
}

/* ---------- 코치 ---------- */
function CoachDash() {
  const A = ADM(), DB = DBX(), iid = A.IID(), ins = A.INS(), c = A.C(), me = A.ME_COACH() || {}, co = DB.currentCohort(iid), n = A.counts(iid), wk = co ? DB.currentWeek(co) : 0;
  const subs = A.can("reviews") ? A.allSubmissions(iid, "all").filter((x) => x.review === "pending").slice(0, 6) : [];
  const reqs = A.can("questions") ? DB.requests(iid).filter((x) => !x.q.answer && (A.TRK() === "vod") === DB.isVodStudent(x.s)).slice(0, 5) : [];
  const pend = A.can("students") ? DB.studentsOf(iid).filter((s) => s.status === "pending").slice(0, 5) : [], many = A.myCoachCourses();
  return <>
    <Head title={(me.name || "") + " 코치님, 안녕하세요"} sub={ins.displayName + " · " + c.brand.courseTitle + " 코치" + (me.memo ? " · " + me.memo : "")} right={many.length > 1 ? <Btn action="coach-switch" cls="a-btn-outline"><Icon n="swap" c="sm" />다른 강의 코치센터 ({many.length}개)</Btn> : null} />
    <div className="a-kpis">
      {A.can("reviews") ? <Kpi label="검수 대기 과제" value={n.review + "개"} sub="피드백 · 승인 · 보완 요청" href="#/center/reviews" tone={n.review ? "info" : ""} /> : null}
      {A.can("questions") ? <Kpi label="답변 대기 문의" value={n.questions + "건"} sub="1:1 요청 · 오류 신고" href="#/center/questions" tone={n.questions ? "warn" : ""} /> : null}
      {A.can("students") ? <Kpi label="승인 대기 수강생" value={n.pending + "명"} sub="새 수강 신청" href="#/center/students?status=pending" tone={n.pending ? "warn" : ""} /> : null}
      <Kpi label="진행 중 기수" value={co ? co.name : "-"} sub={co ? (DB.cohortStatus(co) === "running" ? wk + "주차 진행 중" : fmtMD(co.startDate) + " 시작") : "기수 없음"} href={A.can("cohorts") ? "#/center/cohorts" : "#/center"} />
    </div>
    <Isl html={A.coachMenusCard()} />
    {A.can("reviews") ? <section className="a-card"><div className="a-card-head"><h2>검수를 기다리는 과제</h2><More href="#/center/reviews">과제 검수</More></div>
      {subs.length ? <ul className="a-list">{subs.map((x) => <li key={x.s.id + x.m.id} className="clickable" data-action="review-open" data-sid={x.s.id} data-mid={x.m.id}><div className="a-who"><Ava name={x.s.name} /><div><b>{x.s.name} · {x.m.title}</b><small>{A.cohortName(x.s.cohortId)} · {x.w.no}주차 · {fmtStamp(x.sub.at)}</small></div></div><Rp x={x} /></li>)}</ul> : <Empty ic="check">검수를 기다리는 과제가 없어요.</Empty>}</section> : null}
    {A.can("questions") ? <section className="a-card"><div className="a-card-head"><h2>답변을 기다리는 문의</h2><More href="#/center/questions">1:1 요청 답변</More></div>
      {reqs.length ? <ul className="a-list">{reqs.map((x) => <li key={x.q.id}><div className="a-who"><Ava name={x.s.name} /><div><b>#{x.no} {x.q.title}</b><small>{x.s.name} · {A.cohortName(x.s.cohortId)} · {fmtStamp(x.q.at)}</small></div></div><Pill cls="mute">{x.q.category || "기타"}</Pill></li>)}</ul> : <Empty ic="check">답변을 기다리는 문의가 없어요.</Empty>}</section> : null}
    {A.can("students") && pend.length ? <section className="a-card"><div className="a-card-head"><h2>승인 대기</h2><More href="#/center/students?status=pending">전체</More></div><PendList pend={pend} /></section> : null}
  </>;
}

/* ---------- VOD 두잉고 (DOOGO CLASS) ---------- */
function VodDash() {
  const A = ADM(), DB = DBX(), iid = A.IID(), ins = A.INS(), c = A.C(), X = A.VX(), v = A.VD(), won = A.won;
  const buyers = X.buyersOf(iid), act = buyers.filter((b) => b.active), joined = act.filter((b) => b.st), ym = DB.date.todayStr().slice(0, 7);
  const prods = v.products.filter((p) => p.iid === iid && X.typeOf(p) === "vod"), ids = prods.map((p) => p.id), mon = A.vdPaidIn(ym, (o) => ids.indexOf(o.pid) >= 0);
  const avg = act.length ? Math.round(act.reduce((a, b) => a + b.pct, 0) / act.length) : 0, res = c.resources || {}, nRes = ["ebook", "file", "vod", "senior"].reduce((a, k) => a + (res[k] || []).length, 0);
  const steps = [
    ["menus", "메뉴 구성", "VOD 수강생에게 보일 메뉴만 켜 두기", DB.menuConfig(A.MID()).items.filter((x) => x.on).length > 1],
    ["vodlink", "VOD 강의 연결", "어떤 VOD 구매자에게 두잉고를 열지 정하기", prods.some((p) => p.dg !== false)],
    ["vodlessons", "VOD 강의 · 수업 자료", "강의마다 비메오 링크 · 강의 노트 · 수업 자료(PDF) 올리기", prods.length > 0 && prods.every((p) => X.lessons(p).every((l) => !!l.video))],
    ["notices", "업데이트 소식", "첫 인사 · 강의 업데이트 소식 올리기", (c.notices || []).length > 0],
    ["faq", "FAQ · 자주 묻는 질문", "FAQ로 먼저 안내 · 직접 질문은 1:1 코칭권으로", (c.faqs || []).length > 0],
    ["library", "강의 자료함", "전자책 · 교재 · 보충 영상 올리기", nRes > 0],
    ["docs", "실습 체크리스트", "숙제 대신 따라 할 실습 단계 정리", (c.docsGuide || []).length > 0]
  ];
  const coach = A.isCoach(), me = A.ME_COACH() || {}, stepsV = coach ? steps.filter((x) => A.can(x[0])) : steps, many = A.myCoachCourses();
  const sub = coach ? "DOOGO CLASS에서 " + ins.displayName + " 강사님 VOD를 산 수강생의 강의실이에요. 강사님 대신 맡은 메뉴(1:1 코칭 · TEA TIME · 매출 · 강의실 꾸미기)만 보여요." + (me.memo ? " · " + me.memo : "")
    : "DOOGO CLASS에서 " + ins.displayName + " 강사님 VOD를 산 수강생의 강의실이에요. 주차 · 과제 없이 자료 · 업데이트 소식 · FAQ로 운영하고, 1:1 코칭권 · TEA TIME을 산 수강생은 직접 챙겨요.";
  return <>
    <Head title={coach ? (me.name || "") + " 코치님 · VOD 두잉고" : ins.name + " 강사님 · VOD 두잉고"} sub={sub} right={<>{coach && many.length > 1 ? <Btn action="coach-switch" cls="a-btn-outline"><Icon n="swap" c="sm" />다른 강의 코치센터 ({many.length}개)</Btn> : null}<Btn action="preview" cls="a-btn-outline"><Icon n="eye" c="sm" />VOD 수강생 화면</Btn></>} />
    <div className="a-kpis">
      <Kpi label="VOD 수강생" value={act.length + "명"} sub={"두잉고 입장 " + joined.length + "명 · 아직 " + (act.length - joined.length) + "명"} href="#/center/vod-students" />
      <Kpi label="평균 진도율" value={avg + "%"} sub={"수강 중인 " + act.length + "명 기준"} href="#/center/vod-students" />
      {coach && !A.can("vod") ? <Kpi label="연결된 VOD" value={prods.filter((p) => p.dg !== false).length + "개"} sub="DOOGO CLASS VOD 클래스" href="#/center" />
        : <Kpi label="이번 달 VOD 판매" value={mon.filter(X.isAccess).length + "건"} sub={won(A.vdSum(mon)) + " (부가 " + won(A.vdSum(mon.filter((o) => !X.isAccess(o)))) + ") · 정산 " + won(A.vdSum(mon, A.vdInsAmt))} href="#/center/vod" tone={mon.length ? "ok" : ""} />}
      <Kpi label="완강한 수강생" value={act.filter((b) => b.pct >= 100).length + "명"} sub="진도 100% · 후기 요청 대상" href="#/center/vod-students" />
    </div>
    {coach ? <Isl html={A.coachMenusCard()} /> : null}
    {!coach || A.can("vod-settle") ? <Isl html={A.vdShareStrip(iid)} /> : null}
    {coach && !stepsV.length ? null : <section className="a-card a-vsteps"><div className="a-card-head"><h2><Icon n="sparkles" c="sm" /> VOD 버전 세팅 순서</h2><span className="a-muted">{stepsV.filter((x) => x[3]).length} / {stepsV.length} 완료 · 원하는 대로 바꿀 수 있어요</span></div><ol className="a-vstep-list">
      {stepsV.map((x, i) => <li key={x[0]} className={x[3] ? "ok" : ""}><span className="a-vstep-n">{x[3] ? <Icon n="check" c="xs" /> : i + 1}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><a className="a-link" href={"#/center/" + x[0]}>{x[3] ? "고치기" : "하러 가기"} <Icon n="arrowRight" c="xs" /></a></li>)}
      <li><span className="a-vstep-n">{stepsV.length + 1}</span><div><b>수강생 화면</b><small>VOD 수강생 눈으로 한 번 둘러보기</small></div><Btn action="preview" cls="a-btn-ghost a-btn-sm">미리보기 <Icon n="arrowRight" c="xs" /></Btn></li></ol></section>}
    <Isl html={A.vodAddonTodo(iid, ids)} />
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>연결된 VOD 클래스</h2>{A.can("vodlink") ? <More href="#/center/vodlink">VOD 강의 연결</More> : null}</div>
        {prods.length ? <ul className="a-list">{prods.map((p) => { const bs = buyers.filter((b) => b.active && b.paid.some((x) => x.p.id === p.id)); return <li key={p.id}><div className="vda-cl"><Isl html={A.vdThumb(p)} /><div><b>{p.title}</b><small className="a-memo">수강생 {bs.length}명 · 강의 {X.lessons(p).length}개 · {X.accessTxt(p)}</small></div></div>{p.dg !== false ? <Pill cls="ok">두잉고 열림</Pill> : <Pill cls="mute">닫힘</Pill>}</li>; })}</ul>
          : <Empty ic="monitorPlay" extra={<Isl html={A.vdStoreBtn("#/vod", "DOOGO CLASS 둘러보기")} />}>아직 DOOGO CLASS에 올라간 내 VOD가 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>최근 VOD 수강생</h2>{A.can("vod-students") ? <More href="#/center/vod-students">전체</More> : null}</div>
        {buyers.length ? <ul className="a-list">{buyers.slice(0, 6).map((b, i) => <li key={i}><div className="a-who"><Ava name={b.m.name} /><div><b>{A.vbName(b)}</b><small>{(b.paid.map((x) => x.p.title).join(", ") || "환불") + " · " + DB.date.toStr(new Date(b.paidAt))}</small></div></div>
          <div className="a-vs-pc"><div className="a-bar"><span style={{ width: b.pct + "%" }} /></div><small className="num">{b.pct}%</small></div>{b.st ? <Pill cls="ok">입장</Pill> : b.active ? <Pill cls="mute">아직</Pill> : <Pill cls="mute">종료</Pill>}</li>)}</ul>
          : <Empty ic="users">아직 VOD를 산 수강생이 없어요.</Empty>}</section>
    </div>
  </>;
}

export default function Dashboard() {
  const A = ADM();
  if (A.TRK() === "vod") return <VodDash />;
  if (A.isCoach()) return <CoachDash />;
  return <InsDash />;
}
