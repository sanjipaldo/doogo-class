"use client";
/* 강사센터 수강생 화면 콘텐츠 (1) — 커리큘럼 · 과제 · 수업 캘린더 · 클래스 소식 · FAQ · 시작 가이드 · 빠른 이동 · 실무 체크리스트 · 1:1 상담 채널
 * 예전 admin.js pageCurriculum · pageMissions · pageSchedule · pageNotices · pageFaq · pageGuide · pageDocs · pageChannels · rowTools · addBtn · simpleList 를 React 로 (Next.js 전환 6단계)
 *  · 추가 · 수정(팝업 편집기) · 위아래 옮기기 · 붙여넣기는 예전 admin.js 이벤트가 그대로 받아요 (item-add · item-edit · item-move · faq-bulk …) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl, fmtMD } from "./bits.jsx";

/** 위로 · 아래로 · 수정 (예전 rowTools) */
export function RowTools({ coll, id, ctx, i, n }) {
  const c = ctx == null ? "" : String(ctx);
  return <div className="a-row-actions">
    <button className="a-icon-btn sm" data-action="item-move" data-coll={coll} data-id={id} data-ctx={c} data-dir="-1" aria-label="위로" disabled={i === 0 || undefined}><Icon n="arrowUp" c="sm" /></button>
    <button className="a-icon-btn sm" data-action="item-move" data-coll={coll} data-id={id} data-ctx={c} data-dir="1" aria-label="아래로" disabled={i === n - 1 || undefined}><Icon n="arrowDown" c="sm" /></button>
    <Btn action="item-edit" cls="a-btn-ghost a-btn-sm" data-coll={coll} data-id={id} data-ctx={c}><Icon n="pen" c="sm" />수정</Btn></div>;
}
/** 추가 버튼 (예전 addBtn) */
export const AddBtn = ({ coll, label, ctx, cls }) => <Btn action="item-add" cls={cls || "a-btn-primary"} data-coll={coll} data-ctx={ctx == null ? "" : String(ctx)}><Icon n="plus" c="sm" />{label}</Btn>;
/** 목록 (예전 simpleList) */
export function SimpleList({ coll, items, one, empty }) {
  if (!items.length) return <Empty ic="inbox">{empty}</Empty>;
  return <ul className="a-items">{items.map((it, i) => <li key={it.id || String(it.no) || i}>{one(it)}<RowTools coll={coll} id={it.id || String(it.no)} ctx="" i={i} n={items.length} /></li>)}</ul>;
}
const Main = ({ b, s }) => <div className="a-item-main"><b>{b}</b><small>{s}</small></div>;
const Hint = ({ ic, children }) => <p className="a-hint"><Icon n={ic} c="xs" /> {children}</p>;
const vodTag = () => (ADM().TRK() === "vod" ? " · VOD 버전" : "");

export function Curriculum() {
  const A = ADM(), DB = DBX(), cu = A.CUR(), weeks = cu.weeks, used = A.usedBy(cu.id), co = used.find((x) => DB.cohortStatus(x) !== "ended") || used.slice(-1)[0];
  return <>
    <Head title="커리큘럼" sub={"커리큘럼을 여러 개 만들어 두고 기수마다 골라 쓸 수 있어요 (예: 1·2기 5주 과정, 3기부터 4주 과정). 주차를 더하거나 지우면 그 커리큘럼을 쓰는 기수의 기간·일정이 자동으로 바뀌어요" + (co ? " (" + co.name + " 기준 날짜 표시)" : "") + "."} right={<AddBtn coll="week" label="주차 추가" />} />
    <Isl html={A.curBar()} /><Isl html={A.mlStrip()} />
    {weeks.length ? <div className="a-stack">{weeks.map((w, wi) => (
      <section key={w.no} className="a-card"><div className="a-card-head"><span className="a-weekno">{w.no}주차</span><div className="a-grow"><h2>{w.title}</h2><p className="a-muted">{(w.subtitle || w.summary || "") + (co ? " · 강의일 " + fmtMD(DB.classDate(co, w.no)) : "")}</p></div><RowTools coll="week" id={String(w.no)} ctx="" i={wi} n={weeks.length} /></div>
        {w.goal || (w.topics || []).length ? <div className="a-cw-info">{w.goal ? <p><b>핵심 목표</b>{w.goal}</p> : null}{(w.topics || []).length ? <p><b>강의 내용 {w.topics.length}</b>{w.topics.join(" · ")}</p> : null}</div>
          : <p className="a-cw-empty"><Icon n="alert" c="xs" /> 핵심 목표와 강의 내용을 적으면 수강생 커리큘럼에 보여요. ‘수정’을 눌러 채워 주세요.</p>}
        {w.lessons.length ? <ul className="a-items">{w.lessons.map((l, i) => <li key={l.id}><div className="a-item-main"><b>{l.title}</b><Isl html={"<small>" + (l.minutes || l.durSec ? DB.vdur.label(l.youtubeId, l.durSec, l.minutes ? l.minutes + "분" : "") + " · " : "") + DB.esc(l.desc || "") + "</small>"} /></div><Isl html={A.ytBadge(l)} /><RowTools coll="lesson" id={l.id} ctx={w.no} i={i} n={w.lessons.length} /></li>)}</ul> : <p className="a-muted a-pad">아직 강의가 없어요.</p>}
        <div className="a-card-foot"><AddBtn coll="lesson" label="강의 추가" ctx={w.no} cls="a-btn-ghost a-btn-sm" /><a className="a-link" href="#/center/missions">이 주차 과제 {w.missions.length}개 <Icon n="arrowRight" c="xs" /></a></div></section>
    ))}</div> : <section className="a-card"><Empty ic="book" extra={<AddBtn coll="week" label="주차 추가" />}>주차를 추가해서 커리큘럼을 만들어 주세요.</Empty></section>}
  </>;
}

export function Missions() {
  const A = ADM(), weeks = A.CUR().weeks, total = weeks.reduce((a, w) => a + w.missions.length, 0), req = weeks.reduce((a, w) => a + w.missions.filter((m) => m.required).length, 0), typeL = { image: "사진", link: "링크", text: "글" };
  return <>
    <Head title="과제" sub={"주차별 과제와 자동검수 기준을 정해요. 필수 과제 " + req + "개를 모두 통과하면 수료증이 발급돼요. (전체 " + total + "개)"} />
    <Isl html={A.curBar()} />
    {weeks.length ? <div className="a-stack">{weeks.map((w) => (
      <section key={w.no} className="a-card"><div className="a-card-head"><span className="a-weekno">{w.no}주차</span><h2 className="a-grow">{w.title}</h2><AddBtn coll="mission" label="과제 추가" ctx={w.no} cls="a-btn-ghost a-btn-sm" /></div>
        {w.missions.length ? <ul className="a-items">{w.missions.map((m, i) => <li key={m.id}><Main b={m.title} s={m.desc || ""} /><Isl html={A.kindPill(m)} /><Pill cls="mute">{typeL[m.type] || m.type}</Pill>{(m.templates || []).length ? <Pill cls="info">{"양식 " + m.templates.length}</Pill> : null}<RowTools coll="mission" id={m.id} ctx={w.no} i={i} n={w.missions.length} /></li>)}</ul> : <p className="a-muted a-pad">아직 과제가 없어요.</p>}
      </section>
    ))}</div> : <section className="a-card"><Empty ic="clipboard" extra={<a className="a-btn a-btn-primary" href="#/center/curriculum">커리큘럼으로</a>}>커리큘럼에서 주차를 먼저 만들어 주세요.</Empty></section>}
  </>;
}

const EV_CLS = { qna: "warn", notice: "mute", challenge: "ok", event: "dark", open: "info", deadline: "bad", replay: "info", bonus: "warn", free: "warn", offline: "dark" };
export function Schedule() {
  const A = ADM(), DB = DBX(), ui = A.ui, iid = A.IID(), c = A.C(), cos = DB.cohortsOf(iid);
  if (!ui.schedCohort || !cos.some((x) => x.id === ui.schedCohort)) ui.schedCohort = (DB.currentCohort(iid) || {}).id;
  const co = DB.cohort(ui.schedCohort), L = (t) => DB.evLabel(iid, t);
  const auto = ["open", "deadline"].concat(DB.calTypes(iid).indexOf("replay") >= 0 && DB.calManual(iid).indexOf("replay") < 0 ? ["replay"] : []).map((k) => "‘" + L(k) + "’").join(" · ");
  return <>
    <Head title="수업 캘린더" sub={auto + "은 기수 시작일로 자동 계산돼요. " + DB.calManual(iid).filter((k) => k !== "open").map(L).join(" · ") + " 같은 일정만 추가하세요. 기수 하나의 무료 강의 · 오프라인 강의 · 챌린지 날짜는 ‘기수 관리 › 일정 설계’에서 한 번에 정할 수도 있어요."} right={<AddBtn coll="event" label="일정 추가" />} />
    <section className="a-card"><div className="a-card-head"><h2>추가한 일정</h2><span className="a-muted">{c.schedule.length}개</span></div>
      <SimpleList coll="event" items={c.schedule} one={(e) => <><Main b={e.title} s={DB.ruleText(e) + (e.time ? " · " + e.time : "") + (e.place ? " · " + e.place : "")} /><Pill cls={EV_CLS[e.type]}>{L(e.type)}</Pill></>} empty="추가한 일정이 없어요." /></section>
    <section className="a-card"><div className="a-card-head"><h2>기수별 전체 일정 미리보기</h2><select key={"s" + ui.schedCohort} className="a-input a-sm" id="sched-cohort" aria-label="기수" defaultValue={ui.schedCohort}>{cos.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      {co ? <Btn action="plan-pv" cls="a-btn-ghost a-btn-sm" data-iid={iid} data-id={co.id} data-pg="schedule"><Icon n="eye" c="sm" />수강생 화면 미리보기</Btn> : null}</div>
      {co ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>날짜</th><th>종류</th><th>일정</th></tr></thead><tbody>{DB.events(iid, co).map((e, i) => (
        <tr key={i}><td className="num">{fmtMD(e.date) + (e.time ? " " + e.time : "")}</td><td><Pill cls={EV_CLS[e.type]}>{L(e.type)}</Pill></td><td>{e.title}{e.place ? <> <small className="a-muted">· {e.place}</small></> : null}{e.auto ? <> <small className="a-muted">자동</small></> : null}</td></tr>
      ))}</tbody></table></div> : <Empty ic="calendar">기수를 먼저 만들어 주세요.</Empty>}
    </section>
  </>;
}

export function Notices() {
  const A = ADM(), DB = DBX(), list = A.C().notices.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
  return <>
    <Head title={A.TRK() === "vod" ? "업데이트 소식 · VOD 버전" : "클래스 소식 (공지사항)"} sub="수강생 홈과 ‘클래스 소식 · 공지사항’ 메뉴에 보여요. 글 · 사진 여러 장 · 유튜브/비메오 영상을 함께 올릴 수 있어요. ‘필독’으로 고정하면 맨 위에 떠요." right={<AddBtn coll="notice" label="공지 쓰기" />} />
    <section className="a-card">{list.length ? <ul className="a-items">{list.map((n) => (
      <li key={n.id}><Main b={n.title} s={DB.date.fmtFull(n.date) + " · " + (n.body || "").slice(0, 60)} />{(n.images || []).length ? <Pill cls="info">{"사진 " + n.images.length}</Pill> : null}{(n.videos || []).length || DB.youtubeId(n.youtubeId) ? <Pill cls="info">{"영상 " + ((n.videos || []).length || 1)}</Pill> : null}{n.pinned ? <Pill cls="dark">필독</Pill> : null}
        <div className="a-row-actions"><Btn action="item-edit" cls="a-btn-ghost a-btn-sm" data-coll="notice" data-id={n.id}><Icon n="pen" c="sm" />수정</Btn></div></li>
    ))}</ul> : <Empty ic="megaphone">아직 공지가 없어요.</Empty>}</section>
  </>;
}

export function Faq() {
  const A = ADM(), c = A.C(), cats = A.faqCats(), bulk = (cls) => <Btn action="faq-bulk" cls={cls}><Icon n="clipboard" c="sm" />한꺼번에 붙여넣기</Btn>;
  return <>
    <Head title={"FAQ · 자주 묻는 질문" + vodTag()} sub="수강생 ‘질문 · 요청’ 메뉴의 FAQ 검색에 분류별로 보이고, AI 조교도 이 답변을 바탕으로 대답해요." right={<>{bulk("a-btn-outline")}<AddBtn coll="faq" label="질문 추가" /></>} />
    {c.faqs.length ? cats.map((cat) => { const items = c.faqs.filter((f) => (f.category || "기타") === cat); return (
      <section key={cat} className="a-card"><div className="a-card-head"><h2>{cat}</h2><span className="a-muted">{items.length}개</span></div>
        <ul className="a-items">{items.map((f) => { const i = c.faqs.indexOf(f); return <li key={f.id}><Main b={"Q. " + f.q} s={f.a} /><RowTools coll="faq" id={f.id} ctx="" i={i} n={c.faqs.length} /></li>; })}</ul></section>); })
      : <section className="a-card"><Empty ic="help" extra={bulk("a-btn-primary")}>자주 묻는 질문이 없어요.</Empty></section>}
    <Hint ic="bug">수강생의 오류·불편 신고는 ‘1:1 요청 답변’ 메뉴에서 답해 주세요.</Hint>
  </>;
}

export function Guide() {
  const A = ADM(), DB = DBX(), c = A.C(), qls = DB.quickLinksOf(c);
  return <>
    <Head title={"시작 가이드 · 빠른 이동" + vodTag()} sub="수강생 홈 맨 위에 체크리스트로 보여요. 수강생이 모두 체크하면 자동으로 사라져요. 1주차 항목은 처음 한 번, ‘보이는 주차’를 정한 항목은 그 주차가 열릴 때 다시 떠요." right={<AddBtn coll="guide" label="단계 추가" />} />
    <section className="a-card"><SimpleList coll="guide" items={c.guide} one={(g) => <><Main b={g.title} s={[g.desc, g.url].filter(Boolean).join(" · ")} />{(Number(g.week) || 1) <= 1 ? <Pill cls="mute">처음 한 번</Pill> : <Pill cls="info">{g.week + "주차"}</Pill>}</>} empty="단계가 없어요. 단계가 없으면 홈에 시작 가이드가 보이지 않아요." /></section>
    <Hint ic="alert">예: 오픈채팅방 입장 → 공지 읽기 → 1주차 첫 강의 보기 → AI 조교에게 질문해 보기 · 2주차: 2주차 라이브 다시보기 → 마진 계산기 써 보기</Hint>
    <div className="a-card-head" style={{ marginTop: "28px" }}><h2 className="a-grow">빠른 이동 (홈 바로 가기)</h2><Btn action="ql-reset" cls="a-btn-ghost a-btn-sm">기본 목록으로</Btn><AddBtn coll="ql" label="페이지 추가" /></div>
    <p className="a-muted" style={{ margin: "0 0 12px" }}>수강생 홈 공지사항 밑에 카드로 보여요. 플랫폼 안 메뉴는 윗줄(기본 색), https:// 외부 링크는 아랫줄(아이콘 색)로 나뉘어요. 꺼진 메뉴나 주소가 빈 카드는 보이지 않아요.</p>
    <section className="a-card"><SimpleList coll="ql" items={qls} one={(l) => <><div className="a-item-main"><b><Icon n={l.icon || "link"} c="xs" /> {l.title}</b><small>{[l.desc, l.url || "주소 없음 (숨김)"].filter(Boolean).join(" · ")}</small></div>{l.color ? <span className="a-ql-swatch" style={{ background: l.color }} /> : null}{/^https?:/i.test(l.url || "") ? <Pill cls="info">외부 링크 · 아랫줄</Pill> : !l.url ? <Pill cls="mute">숨김</Pill> : <Pill cls="mute">플랫폼 · 윗줄</Pill>}</>} empty="자주 찾는 페이지가 없어요." /></section>
  </>;
}

export function Docs() {
  const A = ADM();
  return <>
    <Head title={A.TRK() === "vod" ? "실습 체크리스트 · VOD 버전" : "실무 체크리스트"} sub="판매 시작 전에 필요한 서류 · 준비 단계를 안내하고, 수강생이 하나씩 체크해요. 순서는 화살표로 바꿀 수 있어요." right={<AddBtn coll="doc" label="단계 추가" />} />
    <section className="a-card"><SimpleList coll="doc" items={A.C().docsGuide} one={(g) => <Main b={g.title} s={[g.where, g.time, g.cost].filter(Boolean).join(" · ")} />} empty="서류 단계가 없어요." /></section>
  </>;
}

export function Channels() {
  const A = ADM(), DB = DBX(), list = DB.channelsOf(A.C());
  return <>
    <Head title={"1:1 상담 채널" + vodTag()} sub="수강생 메뉴 ‘1:1 상담’에 카드로 보여요. 카카오톡 채널 · 채널톡 · 네이버 톡톡 · 이메일 · 전화 등 강사님이 실제로 쓰는 상담 창구를 넣어 두면, 수강생이 누르는 순간 그 채널로 연결돼요." right={<AddBtn coll="channel" label="채널 추가" />} />
    <section className="a-card"><SimpleList coll="channel" items={list} one={(ch) => { const t = DB.channelType(ch.type), lk = DB.channelLook(ch); return <>
      <span className="a-ch-ic" style={{ background: lk.color || "var(--m-primary)", color: lk.ink || "#fff" }}><Icon n={lk.icon} c="sm" /></span>
      <Main b={ch.title || t.label} s={[ch.tag, t.label, ch.hours, ch.url || ((ch.note || "").trim() ? "링크 없이 안내 문구만 보여요" : "주소 없음 (수강생에게 ‘준비 중’으로 보여요)")].filter(Boolean).join(" · ")} />
      {ch.url ? <Pill cls="ok">연결됨</Pill> : (ch.note || "").trim() ? <Pill cls="info">안내만 (링크 없음)</Pill> : <Pill cls="mute">준비 중</Pill>}</>; }} empty="채널이 없어요. ‘채널 추가’로 상담 창구를 만들어 주세요." /></section>
    <Hint ic="alert">순서는 화살표로 바꿀 수 있어요. 메뉴를 숨기려면 ‘메뉴 구성’에서 1:1 상담을 꺼 주세요.</Hint>
  </>;
}
