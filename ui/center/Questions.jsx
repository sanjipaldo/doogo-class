"use client";
/* 강사센터 1:1 요청 답변 #/center/questions — 답변 대기 · 완료 탭 · 요청 글 · 사진 · 답변 쓰기
 * 예전 admin.js pageQuestions 를 React 로 (Next.js 전환 6단계) · 탭 · 답변 등록(폼 .a-q-form)은 예전 admin.js 이벤트가 받아요 */
import { ADM, DBX, Head, Empty, Pill, Isl, fmtStamp } from "./bits.jsx";

// 수강 방식 표시 (2026-11-23): 수강생 메모의 ‘오프라인’ · ‘온라인’ (DB.studyMode) — 예전 admin.js studyTag 와 같은 모양
function studyTag(s) {
  const DB = DBX(), k = DB.studyMode(s);
  return k ? <> · <span className={"a-mode a-mode-" + k}>{DB.STUDY_MODE_LABEL[k]}</span></> : null;
}

export default function Questions({ n }) {
  const A = ADM(), DB = DBX(), ui = A.ui, iid = A.IID(), list = DB.requests(iid).filter((x) => !DB.isVodStudent(x.s));
  const shown = list.filter((x) => ui.qFilter === "all" || (ui.qFilter === "open" ? !x.q.answer : !!x.q.answer));
  const tabs = [["open", "답변 대기", list.filter((x) => !x.q.answer).length], ["done", "답변 완료", list.filter((x) => x.q.answer).length], ["all", "전체", list.length]];
  return <>
    <Head title="1:1 요청 답변" sub="수강생이 ‘질문 · 요청 → 1:1 요청’에 남긴 화면 오류·불편 신고예요. 모두 비공개로, 작성자와 강사님만 봐요. 답변하면 수강생 화면에 바로 보여요." />
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (ui.qFilter === t[0] ? " on" : "")} data-action="q-tab" data-k={t[0]}>{t[1]} <span className="num">{t[2]}</span></button>)}</div></div>
      {shown.length ? <div className="a-stack">{shown.map((x) => (
        <article key={x.q.id} className="a-q"><div className="a-q-head"><span className="a-avatar">{x.s.name.slice(0, 1)}</span><div><b>#{x.no} {x.q.title}</b><small>{x.s.name} · {A.cohortName(x.s.cohortId)}{studyTag(x.s)} · {fmtStamp(x.q.at)}</small></div><Pill cls="mute">{x.q.category || "기타"}</Pill>{x.q.answer ? <Pill cls="ok">답변 완료</Pill> : <Pill cls="warn">답변 대기</Pill>}</div>
          <p className="a-q-body">{x.q.body}</p>
          {(x.q.images || []).length ? <div className="a-shots a-q-shots">{x.q.images.map((im, i) => <a key={i} className="a-shot" href={im.data} target="_blank" rel="noopener"><img src={im.data} alt={im.name} /></a>)}</div> : null}
          {/* 답변 스레드 · 답글 칸 (2026-11-24) — 예전 admin.js qThreadHtml 그대로 · 다시 그릴 때(n)마다 빈 답글 칸으로 */}<Isl key={x.q.id + ":" + n} html={A.qThreadHtml(x, 3, A.Q_PH)} />
        </article>
      ))}</div> : <Empty ic="bug">{ui.qFilter === "open" ? "답변을 기다리는 1:1 요청이 없어요." : "1:1 요청이 없어요."}</Empty>}
    </section>
  </>;
}
