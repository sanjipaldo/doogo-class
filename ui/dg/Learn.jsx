"use client";
/* 두잉고 강의실: 강의(커리큘럼) #/curriculum · 강의 한 편 #/curriculum/<강의> · 과제 #/missions · 종류별 #/missions?kind= · 주차 #/missions/<주차>
 * 예전 app.js pageCurriculum · curWeekCard · pageLesson · pageMissions · pageMissionKind · weekCard · missionCard · pageWeek · lockedPage · notFound 를 React 로 (Next.js 전환 5단계) */
import { Fragment, useEffect, useRef, useState } from "react";
import Icon from "../lib/Icon.jsx";
import Raw, { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, fmtMD, todayStr, Video, Progress, PctText, StateBadge, Empty, PageHead, Crumb, Pager, Thumb } from "./bits.jsx";
import { MainLecCard } from "./HomePage.jsx";

/* ---------- 공통 ---------- */
export function NotFound() {
  return <div className="page"><section className="card empty"><Icon n="alert" /><p style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>페이지를 찾을 수 없어요</p><a className="btn btn-primary" href="#/home">홈으로</a></section></div>;
}
export function Locked({ w, from }) {
  const X = DGA(), cur = from === "curriculum";
  return (
    <div className="page"><PageHead title={w.no + "주차 · " + w.title} crumbs={<Crumb items={[[cur ? X.ML("curriculum") : X.ML("missions"), cur ? "#/curriculum" : "#/missions"], [w.no + "주차"]]} />} />
      <section className="card empty"><Icon n="lock" /><p style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)", margin: "0 0 6px" }}>{fmtMD(X.openOf(w))}에 공개됩니다</p><p style={{ margin: "0 0 20px" }}>{w.summary}</p>
        <a className="btn btn-primary" href={cur ? "#/curriculum" : "#/missions"}>{cur ? X.ML("curriculum") + "으로" : "주차 목록으로"}</a></section></div>
  );
}
/** 첨부 자료 (내려받기 · 링크) */
export function Attachments({ list }) {
  if (!list || !list.length) return null;
  const X = DGA();
  return (
    <div className="att-box"><p className="side-label">첨부 자료 {list.length}개</p><ul className="att-list">{list.map((f, i) => {
      const ext = (f.name.split(".").pop() || "").toUpperCase().slice(0, 4), href = f.data || f.url || "#";
      return (
        <li key={i}><span className="att-ext">{ext || "파일"}</span><span className="att-name">{f.name}{f.size ? <small>{X.fileSize(f.size)}</small> : f.url ? <small>링크</small> : null}</span>
          <a className="btn btn-tertiary btn-sm" href={href} download={f.data ? f.name : undefined} target={f.data ? undefined : "_blank"} rel={f.data ? undefined : "noopener"}><Icon n={f.data ? "download" : "arrowUpRight"} c="sm" />{f.data ? "다운로드" : "열기"}</a></li>
      );
    })}</ul></div>
  );
}
export function MainBtn({ url, cls, text }) {
  const m = DGA().mainLec(); if (!m) return null;
  const u = url || m.url;
  return u ? <a className={"btn " + (cls || "btn-primary") + " ml-btn"} href={u} target="_blank" rel="noopener"><Icon n="arrowUpRight" c="sm" />{text || m.label || "메인 강의 들으러 가기"}</a> : <span className={"btn " + (cls || "btn-primary") + " ml-btn is-off"} aria-disabled="true"><Icon n="clock" c="sm" />링크 준비 중</span>;
}

/* ---------- 강의(커리큘럼) ---------- */
function CurWeek({ w, now }) {
  const X = DGA(), S = st(), DB = DBX(), open = X.isOpen(w), s2 = X.weekStats(w), ml = X.mainLec(), mOn = X.on("missions");
  const head = (
    <div className="cw-head"><div className="cw-head-main"><p className="cw-date"><Icon n="calendar" c="xs" />강의일 · {fmtMD(DB.classDate(S.CO, w.no))}{now ? <span className="cw-now">이번 주</span> : null}</p>
      <h2>{w.no}주차 · {w.title}</h2>{w.subtitle || w.summary ? <p className="cw-sub">{w.subtitle || w.summary}</p> : null}</div>
      {(open && mOn && w.missions.length) || (open && ml) ? <div className="cw-acts">{open && ml ? <MainBtn url={w.mainUrl} cls="btn-secondary" text="메인 강의" /> : null}{open && mOn && w.missions.length ? <a className="btn btn-primary cw-go" href={"#/missions/" + w.no}>과제 보러 가기 <Icon n="arrowRight" c="sm" /></a> : null}</div> : null}</div>
  );
  if (!open) return <section className="card cw cw-locked">{head}<div className="cw-lock"><Icon n="lock" /><div><b>아직 열리지 않은 주차입니다</b><span>{fmtMD(X.openOf(w))}부터 강의 내용이 공개됩니다</span></div></div></section>;
  const mrow = (m) => {
    const s = X.missionState(m.id), inner = <><span className={"cw-mk " + (s === "done" ? "done" : s === "fix" ? "fix" : "")}>{s === "done" ? <Icon n="check" c="xs" /> : s === "fix" ? "!" : null}</span><span>{m.title}</span></>;
    return <li key={m.id}>{mOn ? <a href={"#/missions/" + w.no + "/" + m.id}>{inner}</a> : <a>{inner}</a>}</li>;
  };
  const watched = w.lessons.filter((l) => S.P.watched[l.id]).length;
  return (
    <section className="card cw">{head}
      {w.goal ? <div className="cw-goal"><span className="cw-goal-label"><Icon n="target" c="sm" />핵심 목표</span><p dangerouslySetInnerHTML={{ __html: window.DB.linkify(w.goal) }} /></div> : null}
      {w.howto ? <RawOne html={'<div class="cw-sec cw-howto"><h3>' + window.icon("checks", "sm") + "이번 주 진행 방법</h3>" + DB.rich(w.howto) + "</div>"} /> : null}
      {w.lessons.length ? <details className="cw-lessons" open><summary><Icon n="play" c="sm" />{X.lessonWord()} {w.lessons.length}개 <span className="tiny">{watched}개 시청 완료</span><Icon n="chevDown" c="sm" /></summary>
        {w.lessons.map((l) => <a key={l.id} className="lesson" href={"#/curriculum/" + l.id}><Thumb item={l} /><div><div className="lesson-title">{l.title}</div><div className="lesson-desc">{l.desc}</div></div>
          {S.P.watched[l.id] ? <span className="badge badge-positive"><Icon n="check" c="xs" />시청 완료</span> : <Raw as="span" className="tiny" html={DB.vdur.label(l.youtubeId, l.durSec, l.minutes ? l.minutes + "분" : "")} />}</a>)}</details> : null}
      {(w.topics || []).length ? <div className="cw-sec"><h3>{ml ? "메인 강의에서 다루는 내용" : "강의 내용"}</h3><ul className="cw-topics">{w.topics.map((t, i) => <li key={i}>{t}</li>)}</ul></div> : null}
      {w.missions.length ? <div className="cw-sec"><div className="cw-sec-head"><h3>과제</h3><span className="cw-period"><Icon n="clock" c="xs" />과제 제출 기간 · {fmtMD(X.openOf(w))} ~ {fmtMD(X.deadlineOf(w))}</span><span className="cw-progress">{s2.done}/{s2.total} 완료</span></div>
        <div className="cw-mgrid">{DB.MISSION_KINDS.map((k) => { const list = w.missions.filter((m) => DB.missionKind(m) === k.key); return list.length ? <div key={k.key} className={"cw-mgroup " + k.key}><h4>{k.label} <span>{list.length}개</span></h4><ul>{list.map(mrow)}</ul></div> : null; })}</div></div> : null}
    </section>
  );
}
function Curriculum() {
  const X = DGA(), S = st(), D = S.D, ml = X.mainLec();
  const cur = D.weeks.find((w) => X.isOpen(w) && todayStr() <= X.deadlineOf(w)) || D.weeks.filter(X.isOpen).slice(-1)[0];
  return (
    <div className="page"><PageHead title={X.ML("curriculum")} sub={ml ? "메인 강의는 " + (ml.platform || "외부 강의실") + "에서 듣고, 여기서는 주차마다 " + X.lessonWord() + "을 보며 과제를 바로 따라 해요." : "주차마다 무엇을 배우고 어떤 과제를 하는지 순서대로 정리했어요."} />
      <MainLecCard compact />
      {D.weeks.length ? <div className="cw-list">{D.weeks.map((w) => <CurWeek key={w.no} w={w} now={cur === w} />)}</div> : <section className="card"><Empty ic="book">커리큘럼을 준비하고 있어요.</Empty></section>}</div>
  );
}
function Lesson({ id }) {
  const X = DGA(), S = st(), D = S.D, DB = DBX();
  const w = D.weeks.find((x) => x.lessons.some((l) => l.id === id));
  const [state, setState] = useState(null);
  // 메모 칸의 처음 글은 들어올 때 한 번 (적는 동안 저장돼도 React 가 칸을 다시 채우지 않게 — 예전처럼)
  const [note0] = useState(() => (st().P.notes || {})[id] || "");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!w) return <NotFound />;
  if (!X.isOpen(w)) return <Locked w={w} from="curriculum" />;
  const all = D.weeks.flatMap((x) => x.lessons.map((l) => Object.assign({ w: x }, l))), i = all.findIndex((l) => l.id === id);
  const l = all[i], prev = all[i - 1], next = all[i + 1], done = !!S.P.watched[id];
  const flip = () => { const on = X.watchFlip(id); window.ReactApp.redraw(); if (on) X.toast("시청 완료로 표시했어요."); };
  // 메모: 적으면 0.5초 뒤 자동 저장 (예전 lesson-note)
  const note = (e) => { const v = e.currentTarget.value; clearTimeout(timer.current); setState("저장 중…"); timer.current = setTimeout(() => { X.noteSave(id, v); setState("저장됨"); }, 500); };
  return (
    <div className="page"><PageHead title={l.title} sub={w.no + "주차 · " + w.title + X.lenTxt(l, " · ")} crumbs={<Crumb items={[[X.ML("curriculum"), "#/curriculum"], [w.no + "주차", "#/curriculum"], [l.title]]} />} />
      <section className="card"><Video item={l} />{l.desc ? <Raw as="div" className="lesson-body" html={DB.rich(l.desc)} /> : null}<Attachments list={l.attachments} />
        <div className="guide-actions" style={{ marginTop: "20px" }}><button className={"btn " + (done ? "btn-secondary" : "btn-primary")} data-action="toggle-watched" data-id={id} onClick={flip}><Icon n="check" c="sm" />{done ? "시청 완료됨 · 취소" : "시청 완료로 표시"}</button>
          {X.on("missions") ? <a className="btn btn-tertiary" href={"#/missions/" + w.no}>{w.no}주차 과제 보기</a> : null}</div></section>
      <section className="card" style={{ marginTop: "14px" }}><div className="home-video-head"><h2><Icon n="pen" />내 메모</h2><span className="tiny" id="note-state">{state || ((S.P.notes || {})[id] ? "저장됨" : "적으면 자동으로 저장돼요")}</span></div>
        <textarea key={id} className="textarea" id="lesson-note" data-id={id} rows="5" placeholder="강의를 보며 기억할 내용, 궁금한 점을 적어 두세요. 나만 볼 수 있어요." defaultValue={note0} onInput={note} /></section>
      <Pager p={prev && X.isOpen(prev.w) ? { href: "#/curriculum/" + prev.id, label: "이전 강의", title: prev.title } : null} n={next && X.isOpen(next.w) ? { href: "#/curriculum/" + next.id, label: "다음 강의", title: next.title } : null} />
    </div>
  );
}
export function CurriculumPage({ r }) { return r.parts[1] ? <Lesson key={r.parts[1]} id={r.parts[1]} /> : <Curriculum />; }

/* ---------- 과제 ---------- */
const typeText = (m) => ({ image: "사진 · PDF 업로드", link: "링크 제출", text: "글 작성" }[m.type] || "") + (m.check && m.check.minLength ? " · 최소 " + m.check.minLength + "자" : "");
const tplLink = (f, cls, kids, key) => <a key={key} className={cls} href={f.data || f.url || "#"} download={f.data ? f.name : undefined} target={f.data ? undefined : "_blank"} rel={f.data ? undefined : "noopener"}>{kids}</a>;
function MissionCard({ w, m }) {
  const X = DGA(), s = X.missionState(m.id), k = X.kindOf(m), left = X.daysUntil(X.deadlineOf(w)), late = left < 0 && s !== "done";
  const stLabel = { done: "체크 완료", fix: "보완 필요", todo: "미제출" }[s], href = "#/missions/" + w.no + "/" + m.id;
  return (
    <article className={"mcard st-" + s}><span className="mcard-ic"><Icon n={m.type === "image" ? "image" : m.type === "link" ? "link" : "pen"} c="sm" /></span>
      <div className="mcard-main"><div className="mcard-tags"><span className={"kbadge " + k.key}>{k.short}</span>{s !== "done" && left >= 0 ? <span className="mcard-d"><Icon n="clock" c="xs" />{left === 0 ? "오늘 마감" : "D-" + left}</span> : null}<span className={"mcard-due" + (late ? " late" : "")}>마감 {fmtMD(X.deadlineOf(w))}{late ? " (지남)" : ""}</span></div>
        <h3><a href={href}>{m.title}</a></h3>{m.desc ? <p className="mcard-desc" dangerouslySetInnerHTML={{ __html: window.DB.linkify(m.desc) }} /> : null}
        <p className="mcard-type">제출 방식: {typeText(m)}</p>{(m.templates || []).length ? <div className="mcard-tpl">{m.templates.map((f, i) => tplLink(f, "tpl-btn", <><Icon n="download" c="xs" />과제 양식 다운로드</>, i))}</div> : null}</div>
      <span className={"mcard-state " + s}>{s === "done" ? <Icon n="check" c="xs" /> : null}{stLabel}</span>
      <a className={"btn " + (s === "done" ? "btn-secondary" : "btn-primary") + " btn-sm mcard-go"} href={href}>{s === "done" ? "제출 내용 보기" : s === "fix" ? "다시 제출" : "과제 제출"}</a></article>
  );
}
function WeekCard({ w }) {
  const X = DGA(), s2 = X.weekStats(w), open = X.isOpen(w), nm = open ? X.nextMission(w) : null;
  const top = <div className="wk-top"><span className="wk-icon"><Icon n="book" /></span><div><div className="wk-title">{w.no}주차</div><div className="wk-meta">{X.kindCount(s2)} · {s2.done}/{s2.total} 완료</div></div><PctText pct={s2.pct} /></div>;
  if (!open) return <div className="week-card locked">{top}<Progress pct={0} thin /><div className="wk-foot"><span className="lock-msg"><Icon n="lock" c="sm" />{fmtMD(X.openOf(w))}부터 과제 제출이 공개됩니다.</span></div></div>;
  return <a className="week-card" href={"#/missions/" + w.no}>{top}<Progress pct={s2.pct} thin /><div className="wk-foot"><span>{nm ? <><b>다음:</b> {nm.title}</> : <b>모든 과제 완료!</b>}</span><span className="link-btn">열기 <Icon n="arrowRight" c="sm" /></span></div></a>;
}
function Missions() {
  const X = DGA(), S = st(), o = X.overallStats();
  return (
    <div className="page"><PageHead title={X.ML("missions")} sub="주차를 고르고 과제를 내면 자동 검수 결과가 바로 나와요." />
      <section className="card overall"><div className="overall-top"><span>전체 진행률</span><PctText pct={o.pct} /></div><Progress pct={o.pct} /><span className="tiny" style={{ color: "var(--body)" }}>전체 {o.total}개 중 {o.done}개 완료</span></section>
      <div className="section-head"><h2>주차 선택</h2><span className="hint">주차를 눌러 과제를 확인하세요</span></div>
      <div className="grid-2">{S.D.weeks.map((w) => <WeekCard key={w.no} w={w} />)}</div></div>
  );
}
function MissionKind({ k }) {
  const X = DGA(), S = st(), DB = DBX(), s2 = X.overallStats().kinds[k.key], pct = s2.total ? Math.round(s2.done / s2.total * 100) : 0;
  const groups = S.D.weeks.map((w) => {
    const list = w.missions.filter((m) => DB.missionKind(m) === k.key);
    if (!list.length) return null;
    if (!X.isOpen(w)) return <div key={w.no} className="section-head"><h2>{w.no}주차 · {w.title}</h2><span className="hint"><Icon n="lock" c="xs" /> {fmtMD(X.openOf(w))} 공개 · {list.length}개</span></div>;
    return <Fragment key={w.no}><div className="section-head"><h2>{w.no}주차 · {w.title}</h2><span className="hint">마감 {fmtMD(X.deadlineOf(w))}</span></div>{list.map((m) => <MissionCard key={m.id} w={w} m={m} />)}</Fragment>;
  }).filter(Boolean);
  return (
    <div className="page"><PageHead title={k.label} sub={k.hint + " · " + s2.done + " / " + s2.total + " 완료"} crumbs={<Crumb items={[[X.ML("missions"), "#/missions"], [k.label]]} />} />
      <div className="utabs" role="tablist">{DB.MISSION_KINDS.map((x) => <a key={x.key} role="tab" href={"#/missions?kind=" + x.key} className={x === k ? "on" : ""} aria-selected={String(x === k)}>{x.label}</a>)}</div>
      <section className="card overall" style={{ marginTop: "14px" }}><div className="overall-top"><span>{k.label} 진행률</span><PctText pct={pct} /></div><Progress pct={pct} /></section>
      {groups.length ? groups : <section className="card" style={{ marginTop: "14px" }}><Empty ic="checks">이 종류의 과제가 아직 없어요.</Empty></section>}</div>
  );
}
const STATE_TABS = [["all", "전체"], ["todo", "미제출"], ["fix", "보완 필요"], ["done", "체크 완료"]];
function Week({ no }) {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), w = X.findWeek(no);
  const [f, setF] = useState(() => X.wkF());
  if (!w) return <NotFound />;
  if (!X.isOpen(w)) return <Locked w={w} />;
  const s2 = X.weekStats(w), late = todayStr() > X.deadlineOf(w);
  const byKind = w.missions.filter((m) => f.kind === "all" || DB.missionKind(m) === f.kind), shown = byKind.filter((m) => f.state === "all" || X.missionState(m.id) === f.state);
  const pick = (grp, key) => { const y = window.scrollY; setF(X.wkF({ [grp]: key })); requestAnimationFrame(() => window.scrollTo(0, y)); };
  const chip = (grp, key, label, n) => <button key={grp + key} type="button" className={"fchip" + (f[grp] === key ? " on" : "")} data-action="wk-filter" data-grp={grp} data-k={key} aria-pressed={String(f[grp] === key)} onClick={() => pick(grp, key)}>{label} <span className="fnum">{n}</span></button>;
  const tpls = w.missions.filter((m) => (m.templates || []).length);
  return (
    <div className="page"><PageHead title={w.no + "주차 · " + w.title} sub={w.summary} crumbs={<Crumb items={[[X.ML("missions"), "#/missions"], [w.no + "주차"]]} />} />
      <section className="card overall"><div className="overall-top"><span>{w.no}주차 진행률</span><PctText pct={s2.pct} /></div><Progress pct={s2.pct} />
        <span className="tiny" style={{ color: "var(--body)" }}>{X.kindCount(s2)} · {s2.total}개 중 {s2.done}개 완료 · {fmtMD(X.openOf(w))} 공개 · <b style={late ? { color: "var(--negative)" } : undefined}>{fmtMD(X.deadlineOf(w))} 마감{late ? " (지남)" : ""}</b></span></section>
      {w.no === 1 && X.on("docs") ? <a className="card help-banner plain-link" href="#/docs"><span className="hb-ic"><Icon n="clipboard" /></span><span><b>서류 발급이 어렵다면?</b><span className="tiny">{X.ML("docs")}에서 단계별로 화면과 함께 안내해 드려요.</span></span><Icon n="chevRight" /></a> : null}
      {X.on("showcase") && (D.showcase || []).some((x) => Number(x.week) === w.no) ? <a className="card help-banner sc-banner plain-link" href={"#/showcase?w=" + w.no}><span className="hb-ic"><Icon n="trophy" /></span><span><b>{w.no}주차 모범 과제 보기</b><span className="tiny">{D.brand.instructor}님이 고른 잘한 예시를 먼저 보고 시작해 보세요.</span></span><Icon n="chevRight" /></a> : null}
      {tpls.length ? <section className="card tpl-box"><div className="home-video-head"><h2><Icon n="fileSheet" />이 주차 과제 양식 <span className="tiny">{tpls.length}개</span></h2></div><p className="tiny" style={{ margin: "-6px 0 10px" }}>양식을 내려받아 엑셀에서 채운 뒤, 해당 과제에서 올려 주세요.</p>
        {tpls.map((m) => m.templates.map((t, i) => tplLink(t, "tpl-row", <><span className="tpl-ic"><Icon n="download" c="sm" /></span><span className="tpl-txt"><b>{m.title}</b><small>{t.name}</small></span></>, m.id + i)))}</section> : null}
      <div className="ffilters"><p className="ff-label">과제 유형</p><div className="fchips">{chip("kind", "all", "전체", w.missions.length)}{DB.MISSION_KINDS.map((k) => chip("kind", k.key, k.label, w.missions.filter((m) => DB.missionKind(m) === k.key).length))}</div>
        <p className="ff-label">진행 상태</p><div className="fchips">{STATE_TABS.map((t) => chip("state", t[0], t[1], t[0] === "all" ? byKind.length : byKind.filter((m) => X.missionState(m.id) === t[0]).length))}</div></div>
      {DB.MISSION_KINDS.map((k) => { const list = shown.filter((m) => DB.missionKind(m) === k.key); return list.length ? <Fragment key={k.key}><div className="section-head"><h2>{k.label} <span className="tiny">{list.length}개</span></h2><span className="hint">{k.hint}</span></div>{list.map((m) => <MissionCard key={m.id} w={w} m={m} />)}</Fragment> : null; })}
      {!w.missions.length ? <section className="card" style={{ marginTop: "14px" }}><Empty ic="checks">이번 주차 과제를 준비하고 있어요.</Empty></section> : !shown.length ? <section className="card" style={{ marginTop: "14px" }}><Empty ic="checks">조건에 맞는 과제가 없어요.</Empty></section> : null}
    </div>
  );
}
/* ---------- 과제 하나: 제출 · 자동검수 (예전 pageMissionDetail · resultBox · draftThumbs · submitMission) ---------- */
function ResultBox({ s }) {
  const fs = DBX().date.fmtStamp;
  return <>
    {s.review ? (s.review.status === "approved" ? <div className="result pass"><h4><Icon n="check" />강사님이 승인했어요</h4><p dangerouslySetInnerHTML={{ __html: window.DB.esc(fs(s.review.at)) + (s.review.comment ? " · " + window.DB.linkify(s.review.comment) : "") }} /></div>
      : <div className="result fix"><h4><Icon n="alert" />강사님이 보완을 요청했어요</h4><p dangerouslySetInnerHTML={{ __html: window.DB.linkify(s.review.comment || "내용을 보완해서 다시 제출해 주세요.") }} /></div>) : null}
    {s.result.pass ? <div className="result pass" style={s.review ? { opacity: ".7" } : undefined}><h4><Icon n="check" />자동검수 통과</h4><p>{fs(s.at)} 제출 · 진행률에 반영되었습니다.{s.review ? "" : " 강사님이 한 번 더 확인할 수 있어요."}</p>{s.result.ok.length ? <ul>{s.result.ok.map((t, i) => <li key={i}>{t}</li>)}</ul> : null}</div>
      : <div className="result fix"><h4><Icon n="alert" />자동검수 · 보완이 필요해요</h4><p>아래 항목을 채워서 다시 제출해 주세요.</p><ul>{s.result.reasons.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
  </>;
}
function Mission({ no, id }) {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), w = X.findWeek(no), m = w && w.missions.find((x) => x.id === id);
  const [drag, setDrag] = useState(false);
  const [cnt, setCnt] = useState(null);
  // 강사님 보완 요청을 봤어요 (왼쪽 메뉴 숫자가 줄어요 — 예전처럼 그린 뒤에)
  useEffect(() => { if (m && X.isOpen(w) && X.revSeen(id)) window.ReactApp.redraw(); });
  if (!m) return <NotFound />;
  if (!X.isOpen(w)) return <Locked w={w} />;
  const draft = X.draftFor(id), subs = S.P.submissions[id] || [], last = subs[subs.length - 1];
  const typeLabel = { image: "사진 · PDF 인증", link: "링크 제출", text: "글 작성" }[m.type] || "", c = m.check || {}, late = todayStr() > X.deadlineOf(w);
  // 제출하면 예전처럼 화면을 새로 그려요 — 글자 수 표시도 처음으로
  const submit = (e) => { e.preventDefault(); setCnt(null); X.submitMission(e.currentTarget); };
  const files = (e) => { X.addFiles(e.currentTarget.files); e.currentTarget.value = ""; };
  const dz = { onDragOver: (e) => { e.preventDefault(); setDrag(true); }, onDragEnter: (e) => { e.preventDefault(); setDrag(true); }, onDragLeave: (e) => { e.preventDefault(); setDrag(false); }, onDrop: (e) => { e.preventDefault(); setDrag(false); X.addFiles(e.dataTransfer.files); } };
  const count = (e) => { const t = e.currentTarget, min = Number(t.dataset.min); if (min) setCnt(t.value.replace(/\s+/g, "").length + " / 최소 " + min + "자"); };
  const crit = X.checkCriteria(m), sc = X.on("showcase") ? X.showcaseOf(m.id) : [];
  return (
    <div className="page"><PageHead title={m.title} crumbs={<Crumb items={[[X.ML("missions"), "#/missions"], [w.no + "주차", "#/missions/" + w.no], [m.title]]} />} />
      <div className="detail-grid">
        <section className="card">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>{m.required ? <span className="badge badge-ink">필수</span> : <span className="badge badge-neutral">{X.kindOf(m).short}</span>}<span className="badge badge-neutral">{typeLabel}</span>
            <span className={"badge " + (late ? "badge-negative" : "badge-neutral")}>{fmtMD(X.deadlineOf(w))} 마감{late ? " 지남" : ""}</span><StateBadge id={id} /></div>
          <p style={{ margin: "0 0 20px", fontSize: "16px", lineHeight: "1.75" }} dangerouslySetInnerHTML={{ __html: window.DB.linkify(m.desc) }} />
          {(m.steps || []).length ? <><p className="side-label">이렇게 하세요</p><ol className="steps">{m.steps.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: window.DB.linkify(x) }} />)}</ol></> : null}
          {(m.templates || []).length ? <div className="mcard-tpl" style={{ marginTop: "14px" }}>{m.templates.map((f, i) => tplLink(f, "tpl-btn", <><Icon n="download" c="xs" />과제 양식 다운로드</>, i))}</div> : null}
          <hr style={{ border: "0", borderTop: "1px solid var(--line-soft)", margin: "24px 0" }} />
          <form id="submit-form" data-id={id} className="stack" noValidate onSubmit={submit}>
            {m.type === "image" ? <>
              <label className={"dropzone" + (drag ? " drag" : "")} id="dropzone" {...dz}><input type="file" id="file-input" accept="image/*,.pdf" multiple className="sr-only" onChange={files} /><Icon n="image" /><strong>사진 또는 PDF를 끌어다 놓거나 눌러서 선택</strong><span className="tiny">최대 3개 · 개인정보(주민번호·계좌번호)는 가리고 올려 주세요</span></label>
              <div className="thumbs" id="thumbs">{draft.files.map((f, i) => <div key={i} className="thumb">{f.type === "pdf" ? <div className="thumb-pdf"><Icon n="file" />{f.name}</div> : <img src={f.data} alt={f.name} />}<button type="button" data-action="remove-file" data-i={i} aria-label="삭제" onClick={() => X.removeFile(i)}><Icon n="x" c="xs" /></button></div>)}</div>
              <div className="field"><label htmlFor="sub-text">메모 <span className="tiny">(선택)</span></label><textarea className="textarea" id="sub-text" name="text" rows="3" style={{ minHeight: "96px" }} placeholder="강사님께 남길 말이 있으면 적어 주세요" /></div>
            </> : m.type === "link" ? <>
              <div className="field"><label htmlFor="sub-link">링크</label><input className="input" id="sub-link" name="link" type="url" inputMode="url" placeholder={"https://" + (c.linkHint || "") + (c.linkHint ? "/…" : "")} defaultValue={last ? last.link : ""} /></div>
              <div className="field"><label htmlFor="sub-text">메모 <span className="tiny">(선택)</span></label><textarea className="textarea" id="sub-text" name="text" rows="3" style={{ minHeight: "96px" }} defaultValue={last ? last.text : ""} /></div>
            </> : <div className="field"><label htmlFor="sub-text">내용 <span className="tiny" id="char-count">{cnt || (c.minLength ? "최소 " + c.minLength + "자" : "")}</span></label>
              <textarea className="textarea" id="sub-text" name="text" rows="8" data-min={c.minLength || 0} placeholder={(m.steps || []).join(" / ")} defaultValue={last ? last.text : ""} onInput={count} /></div>}
            <button className="btn btn-primary" type="submit"><Icon n="send" c="sm" />{last ? "다시 제출하고 검수받기" : "제출하고 자동검수 받기"}</button></form>
          <div id="result">{last ? <ResultBox s={last} /> : null}</div>
        </section>
        <aside className="stack">
          <div className="card"><p className="side-label">자동검수 기준</p><ul className="history">{crit.length ? crit.map((t, i) => <li key={i}><span>{t}</span></li>) : <li><span>제출하면 바로 통과</span></li>}</ul></div>
          <div className="card"><p className="side-label">제출 이력</p>{subs.length ? <ul className="history">{subs.slice().reverse().map((x, i) => <li key={i}><span>{subs.length - i}차 제출 · {DB.date.fmtStamp(x.at)}</span>{x.review ? (x.review.status === "approved" ? <span className="badge badge-positive">강사 승인</span> : <span className="badge badge-warning">보완 요청</span>) : x.result.pass ? <span className="badge badge-positive">통과</span> : <span className="badge badge-warning">보완</span>}</li>)}</ul> : <p className="tiny" style={{ margin: "0" }}>아직 제출 기록이 없어요.</p>}</div>
          {last && last.files && last.files.length ? <div className="card"><p className="side-label">마지막으로 낸 파일</p><div className="thumbs">{last.files.map((f, i) => f.type === "pdf"
            ? <a key={i} className="thumb" href={f.data || undefined} download={f.data ? f.name : undefined}><div className="thumb-pdf"><Icon n="file" />{f.name}</div></a>
            : <a key={i} className="thumb" href={f.data} target="_blank" rel="noopener"><img src={f.data} alt={f.name} /></a>)}</div></div> : null}
          {sc.length ? <a className="card sc-hint plain-link" href={"#/showcase?w=" + w.no}><span className="sc-hint-ic"><Icon n="trophy" c="sm" /></span><span><b>모범 과제 {sc.length}개 보기</b><small>{D.brand.instructor}님이 고른 잘한 예시</small></span><Icon n="chevRight" c="sm" /></a> : null}
          {X.on("bot") ? <div className="card ask-card"><p className="ask-t"><Icon n="bot" c="sm" />어디서 막혔나요?</p><p className="tiny">{D.brand.botName}가 이 과제 진행 방법을 단계별로 알려 드려요.</p>
            <button className="btn btn-primary btn-sm btn-block" data-action="ask-bot" data-q={m.title + " 어떻게 해요?"} onClick={() => X.askBot(m.title + " 어떻게 해요?")}><Icon n="bot" c="sm" />이 과제 물어보기</button></div> : null}
        </aside>
      </div></div>
  );
}

/** #/missions · #/missions?kind= · #/missions/<주차> · #/missions/<주차>/<과제> */
export function MissionsPage({ r }) {
  const DB = DBX(), [, weekNo, missionId] = r.parts, kind = DB.MISSION_KINDS.find((k) => k.key === r.params.get("kind"));
  if (missionId) return <Mission key={weekNo + "/" + missionId} no={weekNo} id={missionId} />;
  if (weekNo) return <Week key={weekNo} no={weekNo} />;
  if (kind) return <MissionKind k={kind} />;
  return <Missions />;
}
