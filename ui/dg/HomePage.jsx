"use client";
/* 두잉고 강의실 홈 (#/home) — 예전 app.js pageHome(기수 · LIVE 버전) · pageVodHome(VOD 버전) 을 React 로 (Next.js 전환 5단계)
 *  · 무엇을 보여 줄지(시작 가이드 · 이번 주 · 진행률 · 일정 · 이어서 할 과제 · 공지 · 빠른 이동 · VOD 진도 · 코칭 …)는 예전 계산 그대로 (window.DGA) */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, fmtMD, todayStr, Video, Progress, StateBadge, LiveBtn, NewBadge, Empty } from "./bits.jsx";

const won = (n) => (Math.round(n) || 0).toLocaleString("ko-KR") + "원";

/* ---------- 공통 카드 ---------- */
function Greet({ lv, text }) {
  const S = st();
  return <header className="page-head greet"><span className={"greet-icon lv-" + lv.cur.key} title={"성장 단계 · " + lv.cur.name}><Icon n={lv.cur.icon} c="lg" /></span><div><h1>{S.me.name}님, {DGA().greetWord()}</h1><p>{text}</p></div></header>;
}
// 시작 가이드: 다 체크하면 ‘완료’ · 바로가기를 누르면 자동으로 체크
function Guide() {
  const X = DGA(), S = st(), grp = X.guideGroup();
  if (!grp) return null;
  const G = S.P.guide || {}, done = grp.items.filter((g) => G[g.id]).length, title = grp.wk === 1 ? "처음 오셨나요? 시작 가이드" : grp.wk + "주차 시작 가이드";
  const tog = (id) => { const before = X.guideToggle(id); window.ReactApp.redraw(); X.guideDoneCheck(before); };
  const auto = (id) => { if (G[id]) return; const before = X.guideGroup(); S.P.guide = S.P.guide || {}; S.P.guide[id] = Date.now(); X.saveProgress(); setTimeout(() => X.guideDoneCheck(before), 300); };
  const close = (wk) => { X.guideClose(wk); window.ReactApp.redraw(); X.toast(Number(wk) === 1 ? "시작 가이드를 완료했어요! 이제 1주차 과제를 시작해 보세요." : wk + "주차 시작 가이드를 완료했어요!"); };
  return (
    <section className={"card start-guide" + (grp.allDone ? " all-done" : "")}><div className="home-video-head"><h2><Icon n="sparkles" />{title}</h2><span className="tiny">{done} / {grp.items.length} 완료</span></div><Progress pct={Math.round(done / grp.items.length * 100)} thin />
      <ul className="guide-list">{grp.items.map((g) => {
        const ok = !!G[g.id], ext = /^https?:/i.test(g.url || "");
        return (
          <li key={g.id} className={ok ? "done" : ""}><button type="button" className="g-check" data-action="toggle-guide" data-id={g.id} aria-pressed={String(ok)} aria-label={g.title + (ok ? " 완료 취소" : " 완료")} onClick={() => tog(g.id)}>{ok ? <Icon n="check" c="sm" /> : null}</button>
            <div className="g-txt"><b>{g.title}</b>{g.desc ? <span>{g.desc}</span> : null}</div>
            {g.url ? <a className="link-btn" data-guide={g.id} href={g.url} target={ext ? "_blank" : undefined} rel={ext ? "noopener" : undefined} onClick={() => auto(g.id)}>바로가기 <Icon n={ext ? "arrowUpRight" : "arrowRight"} c="sm" /></a> : null}</li>
        );
      })}</ul>
      {grp.allDone ? <div className="guide-finish"><span><Icon n="check" c="sm" />모두 마쳤어요! ‘완료’를 누르면 이 안내는 다시 나오지 않아요.</span><button type="button" className="btn btn-primary" data-action="guide-close" data-wk={grp.wk} onClick={() => close(grp.wk)}>완료</button></div>
        : <p className="tiny guide-tip">하나씩 체크하거나 ‘바로가기’를 눌러 보세요. 모두 마치면 ‘완료’ 버튼이 나와요.</p>}</section>
  );
}
// 자주 찾는 페이지 (강사센터에서 정함)
function QuickLinks() {
  const list = DGA().quickList();
  if (!list.length) return null;
  const card = (l, i) => {
    const ext = /^https?:/i.test(l.url), col = /^#[0-9a-f]{6}$/i.test(l.color || "") ? l.color : "";
    return <a key={i} className={"card ql-card" + (col ? " ql-color" : "")} href={l.url} target={ext ? "_blank" : undefined} rel={ext ? "noopener" : undefined} style={col ? { "--ql": col } : undefined}><span className="ql-ic"><Icon n={l.icon || "link"} /></span>{ext ? <span className="ql-ext"><Icon n="arrowUpRight" c="sm" /></span> : null}<b>{l.title}</b>{l.desc ? <span>{l.desc}</span> : null}</a>;
  };
  const inner = list.filter((l) => !/^https?:/i.test(l.url)), outer = list.filter((l) => /^https?:/i.test(l.url));
  return <>
    <div className="section-head"><h2>빠른 이동</h2><span className="hint">자주 여는 화면</span></div>
    {inner.length ? <div className="ql-grid">{inner.map(card)}</div> : null}
    {outer.length ? <div className="ql-grid ql-outer">{outer.map(card)}</div> : null}
  </>;
}
function Notices({ empty }) {
  const X = DGA(), S = st();
  if (!X.on("notices")) return null;
  const notices = (S.D.notices || []).slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date)).slice(0, 4);
  return (
    <section className="card" style={{ marginTop: "14px" }}><div className="home-video-head"><h2>{X.NT()}</h2><a className="link-btn" href="#/notices">더보기 <Icon n="arrowRight" c="sm" /></a></div>
      {notices.length ? notices.map((n) => <a key={n.id} className="list-row" href={"#/notices/" + n.id}>{n.pinned ? <span className="badge badge-ink">필독</span> : null}<span className="lr-title">{n.title}</span><NewBadge n={n} /><span className="lr-date">{fmtMD(n.date)}</span></a>) : <p className="muted" style={{ margin: "0" }}>{empty}</p>}</section>
  );
}

/* ---------- 기수 · LIVE 버전 ---------- */
function MainLecBtn({ url, cls, text }) {
  const m = DGA().mainLec(); if (!m) return null;
  const u = url || m.url;
  return u ? <a className={"btn " + (cls || "btn-primary") + " ml-btn"} href={u} target="_blank" rel="noopener"><Icon n="arrowUpRight" c="sm" />{text || m.label || "메인 강의 들으러 가기"}</a> : <span className={"btn " + (cls || "btn-primary") + " ml-btn is-off"} aria-disabled="true"><Icon n="clock" c="sm" />링크 준비 중</span>;
}
export function MainLecCard({ compact }) {
  const m = DGA().mainLec(); if (!m) return null;
  return <section className={"card ml-card" + (compact ? " sm" : "")}><span className="ml-ic"><Icon n="monitorPlay" /></span><div className="ml-t"><small>메인 강의{m.platform ? " · " + m.platform : ""}</small><b>{m.platform ? m.platform + "에서 메인 강의를 들어요" : "메인 강의는 외부 강의실에서 들어요"}</b>{m.note && !compact ? <p>{m.note}</p> : null}</div><MainLecBtn /></section>;
}
function LevelCard({ lv }) {
  const S = st();
  return (
    <section className="card lv-card" aria-label="성장 레벨"><div className="lv-head"><span className="tiny">{S.me.name}님의 성장 단계</span><b>{lv.cur.name} <small>{lv.idx + 1} / {lv.steps.length}단계</small></b></div>
      <ol className="lv-path">{lv.steps.map((s2, i) => <li key={i} className={i < lv.idx ? "past" : i === lv.idx ? "now" : ""}><span className={"lv-ic lv-" + s2.key}><Icon n={s2.icon} c="sm" /></span><small>{s2.name}</small></li>)}</ol>
      <p className="lv-foot">{lv.next ? <>다음 단계 ‘{lv.next.name}’까지 <b>{lv.needText}</b> 남았어요 · 과제를 해낼수록 한 단계씩 자라요</> : "필수 과제를 모두 통과해 ‘" + lv.cur.name + "’이 되었어요. 정말 멋져요!"}</p></section>
  );
}
// 이번 주(열린 주차) · 다음 주(잠긴 주차)
function WeekFocus() {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), t = todayStr();
  if (!D.weeks.length) return null;
  const cur = D.weeks.find((w) => X.isOpen(w) && t <= X.deadlineOf(w)), next = D.weeks.find((w) => !X.isOpen(w));
  const card = (w, kind) => {
    const s2 = X.weekStats(w), open = kind === "now", go = open && X.on("missions"), dd = X.daysUntil(X.openOf(w));
    return (
      <section key={kind} className={"card wf-card" + (open ? " now" : "")}><div className="wf-top"><span className="wf-tag">{open ? "이번 주" : "다음 주"}</span>{open ? <span className="wf-state"><Icon n="clock" c="xs" />마감 {fmtMD(X.deadlineOf(w))}</span> : <span className="wf-state"><Icon n="lock" c="xs" />잠김</span>}</div>
        <h3>{w.no}주차 · {w.title}</h3>
        <p className="wf-date">강의일 · {fmtMD(DB.classDate(S.CO, w.no))}{w.subtitle ? " · " + w.subtitle : ""}</p>
        {open ? <div className="wf-prog"><Progress pct={s2.pct} thin /><span className="tiny">{X.kindCount(s2)} · {s2.done}/{s2.total} 완료</span></div>
          : <div className="wf-lock">{fmtMD(X.openOf(w))}부터 과제 제출이 공개됩니다.{dd > 0 ? <> <b>D-{dd}</b></> : null}</div>}
        <a className={"btn " + (open ? "btn-primary" : "btn-secondary") + " wf-btn"} href={go ? "#/missions/" + w.no : "#/curriculum"}>{go ? w.no + "주차 과제 하러 가기" : X.ML("curriculum") + " 미리 보기"} <Icon n="arrowRight" c="sm" /></a></section>
    );
  };
  if (!cur && !next) return null;
  return <div className={"wf-wrap" + (cur && next ? " two" : "")}>{cur ? card(cur, "now") : null}{next ? card(next, "next") : null}</div>;
}
function ProgressCard() {
  const X = DGA(), DB = DBX(), s2 = X.overallStats(), ic = { required: "target", challenge: "sparkles", mind: "heart" };
  return (
    <section className="card prog-card"><div className="home-video-head"><h2>과제 전체 진행률</h2><span className="tiny">{s2.done} / {s2.total}</span></div>
      <p className="tiny" style={{ margin: "-6px 0 10px" }}>필수 · 도전 · 마인드를 눌러 바로 확인하세요</p>
      {DB.MISSION_KINDS.filter((k) => s2.kinds[k.key].total).map((k) => { const x = s2.kinds[k.key], pct = Math.round(x.done / x.total * 100); return (
        <a key={k.key} className={"prog-row " + k.key} href={"#/missions?kind=" + k.key}><span className="prog-ic"><Icon n={ic[k.key] || "checks"} c="sm" /></span><span className="prog-name">{k.label}</span><span className="prog-num"><b>{x.done}</b> / {x.total}</span><Icon n="chevRight" c="sm" /><Progress pct={pct} thin /></a>); })}
      {s2.reqTotal ? <p className="tiny prog-foot">{s2.reqDone === s2.reqTotal ? "필수 과제를 모두 통과했어요! 수료증을 받아 보세요." : "필수 과제 " + (s2.reqTotal - s2.reqDone) + "개를 더 통과하면 수료증이 나와요."}</p> : null}</section>
  );
}
function Upcoming({ upcoming, today }) {
  const DB = DBX(), DOW = DB.date.DOW;
  return (
    <section className="card"><div className="home-video-head"><h2><Icon n="calendar" />다가오는 일정</h2><a className="link-btn" href="#/schedule">전체 일정 <Icon n="arrowRight" c="sm" /></a></div>
      {upcoming.length ? upcoming.map((e, i) => { const d = DB.date.parseDate(e.date); return (
        <div key={i} className="list-row"><span className={"date-pill" + (e.date === today ? " today" : "")}><small>{d.getMonth() + 1}월</small><b>{d.getDate()}</b></span><span className="lr-title"><i className={"ev-dot " + e.type} /> {e.title}{e.place ? <small className="lr-place"><Icon n="mapPin" c="xs" />{e.place}</small> : null}</span><span className="lr-date">{DOW[d.getDay()]}{DB.evTime(e) ? " " + DB.evTime(e) : ""}</span></div>); })
        : <p className="muted" style={{ margin: "0" }}>예정된 일정이 없습니다.</p>}</section>
  );
}
function LiveHome() {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), today = todayStr();
  const nm = X.nextMissionOverall(), evs = X.myEvents().filter((e) => e.date >= today), upcoming = evs.slice(0, 4);
  const quote = D.quotes.length ? D.quotes[DB.date.parseDate(today).getDate() % D.quotes.length] : "";
  const mv = X.on("motivation") ? D.motivation[0] : null, wk = DB.currentWeek(S.CO), lv = X.LV();
  const todayLive = evs.find((e) => e.date === today && e.url);
  return (
    <div className="page">
      <Greet lv={lv} text={quote || S.CO.name + " · " + (wk ? wk + "주차 진행 중" : fmtMD(S.CO.startDate) + " 시작")} />
      <MainLecCard />
      <Guide />
      {todayLive ? <section className="card live-today"><Icon n="video" /><div><b>오늘 {todayLive.time ? todayLive.time + " " : ""}{todayLive.title}</b><span className="tiny">시간이 되면 아래 버튼으로 바로 들어오세요.</span></div><LiveBtn e={todayLive} /></section> : null}
      {mv ? <section className="card home-mv"><div className="home-video-head"><h2><Icon n="flame" />오늘의 응원 영상</h2><a className="link-btn" href="#/motivation">{X.ML("motivation")} 더 보기 <Icon n="arrowRight" c="sm" /></a></div><Video item={mv} /><p className="tiny" style={{ margin: "12px 0 0" }}>{mv.title}</p></section> : null}
      {X.on("missions") ? <LevelCard lv={lv} /> : null}
      <WeekFocus />
      {X.on("missions") || X.on("schedule") ? <div className="home-duo">{X.on("missions") ? <ProgressCard /> : null}{X.on("schedule") ? <Upcoming upcoming={upcoming} today={today} /> : null}</div> : null}
      {X.on("missions") ? <>
        <div className="section-head"><h2>이어서 할 과제</h2><a className="link-btn" href="#/missions">전체 과제 <Icon n="arrowRight" c="sm" /></a></div>
        {nm ? <a className="card next-card plain-link" href={"#/missions/" + nm.weekNo + "/" + nm.id}><span className="wk-icon"><Icon n="checks" /></span>
          <div style={{ flex: "1", minWidth: "0" }}><div className="tiny">{nm.weekNo}주차 · {X.kindOf(nm).short} · 마감 {fmtMD(DB.weekDeadline(S.CO, nm.weekNo))}</div><div className="m-title">{nm.title} <StateBadge id={nm.id} /></div><div className="m-desc">{nm.desc}</div></div>
          <span className="btn btn-primary btn-sm">열기 <Icon n="arrowRight" c="sm" /></span></a>
          : <div className="card callout-ok callout"><Icon n="check" /><div>{D.weeks.length && !X.isOpen(D.weeks[0]) ? fmtMD(S.CO.startDate) + "에 1주차가 열려요. 조금만 기다려 주세요!" : "열린 주차의 과제를 모두 마쳤어요! 다음 주차가 열리면 바로 시작해 보세요."}</div></div>}</> : null}
      <Notices empty="아직 공지가 없어요." />
      <QuickLinks />
    </div>
  );
}

/* ---------- VOD 버전 ---------- */
export function CoachCard({ compact }) {
  const X = DGA(), S = st(), V = window.VOD, pid = X.addPid("coachOf"); if (!V || !pid) return null;
  const c = V.coachOf(V.product(pid)), n = X.coachN();
  return (
    <section className={"card vh-add vh-coach" + (compact ? " sm" : "")}><span className="vh-add-ic"><Icon n="message" /></span><div className="vh-add-t"><small>1:1 코칭권</small><b>{n ? <>남은 코칭 <em>{n}회</em></> : S.INS.displayName + " 강사에게 직접 질문하기"}</b><p>{n ? X.coachEnd() + "까지 · 강의 내용 · 내 사업 적용 무엇이든 물어보세요" : c.n + "회 · " + c.days + "일 · " + won(c.price) + " (1회 " + won(c.per) + ") · 강사님이 직접 답해요"}</p></div>
      <div className="vh-add-b">{n ? <><a className="btn btn-primary btn-sm" href="#/qna/requests/new"><Icon n="pen" c="sm" />질문 남기기</a><a className="btn btn-secondary btn-sm" href="#/qna/requests">내 코칭 질문</a></>
        : <><a className="btn btn-primary btn-sm" href={"#/vod/checkout/" + pid + "?item=coach"}><Icon n="message" c="sm" />코칭권 사기</a>{X.myCoachQs().length ? <a className="btn btn-secondary btn-sm" href="#/qna/requests">지난 코칭 질문</a> : null}</>}</div></section>
  );
}
function TeaCard() {
  const X = DGA(), S = st(), V = window.VOD, pid = X.addPid("teaOf"); if (!V || !pid) return null;
  const t = V.teaOf(V.product(pid)), list = S.me && S.me.vodMid ? V.teasOf(S.me.vodMid, S.INS.id) : [], cur = list.find((o) => ["req", "ok"].indexOf((o.tea || {}).st) >= 0);
  return (
    <section className="card vh-add vh-tea"><RawOne html={'<span class="vh-add-ic tea">' + V.icx("coffee") + "</span>"} /><div className="vh-add-t"><small>강사님과 TEA TIME</small><b>{cur ? V.TEA_ST[cur.tea.st][0] : t.min + "분 1:1 만남"}</b><p>{cur ? V.teaStTxt(cur) : V.TEA_MODE[t.mode] + " · " + won(t.price) + " · 희망 날짜를 남기면 강사님이 확정해요"}</p></div>
      <div className="vh-add-b">{cur ? <a className="btn btn-secondary btn-sm" href="#/vod/my/addons">신청 내역</a> : <a className="btn btn-secondary btn-sm" href={"#/vod/checkout/" + pid + "?item=tea"}><RawOne html={V.icx("coffee", "sm")} />TEA TIME 신청</a>}</div></section>
  );
}
function ExtendNote() {
  const X = DGA(), S = st(), V = window.VOD; if (!V || !S.me || !S.me.vodMid) return null;
  const x = X.vodList().find((v) => { if (!v.o) return false; const d = V.daysLeft(S.me.vodMid, v.p.id); return d !== Infinity && d <= 30; }); if (!x) return null;
  const rs = V.rebuySet ? V.rebuySet() : { on: false };
  return <div className="callout callout-warn vh-ext"><Icon n="clock" /><div><b>‘{x.p.title}’ 수강 기간이 {Math.max(0, V.daysLeft(S.me.vodMid, x.p.id))}일 남았어요</b><span>{rs.on ? "기간이 끝나면 재수강 " + rs.pct + "% 할인가로 진도 그대로 다시 들을 수 있어요." : "기간 안에 꼭 끝까지 들어 보세요."}</span></div></div>;
}
const Sh = ({ t, sub }) => <div className="vh-sh"><h2>{t}</h2>{sub ? <span>{sub}</span> : null}</div>;
function VodHome() {
  const X = DGA(), S = st(), D = S.D, V = window.VOD, DB = DBX(), list = X.vodList(), pc = X.vodPct(), lv = X.LV(), today = todayStr();
  const quote = D.quotes && D.quotes.length ? D.quotes[DB.date.parseDate(today).getDate() % D.quotes.length] : "";
  const main = list.find((x) => X.vodPctOf(x) < 100) || list[0], nx = main ? X.vodNext(main) : null;
  const mp = main ? X.vodPctOf(main) : 0, mLeft = main ? Math.round(nx.lz.filter((l) => !nx.pr.done[l.id]).reduce((a, l) => a + V.lSec(l), 0) / 60) : 0;
  const href = main ? X.learnHref(main.p.id, nx.cur ? nx.cur.id : "") : "";
  const hasAdd = !!(V && (X.addPid("coachOf") || X.addPid("teaOf")));
  return (
    <div className="page vh-page">
      <Greet lv={lv} text={quote || "VOD 수강생 전용 공간이에요. 필요할 때마다 들어와 보세요."} />
      {S.preview ? <div className="callout vh-pv"><Icon n="eye" /><div><b>VOD 버전 미리보기</b><span>DOOGO CLASS에서 {S.INS.displayName} 강사님 VOD를 산 수강생에게 이렇게 보여요. 미리보기라 진도는 0%로 보여요.</span></div></div> : null}
      <Guide /><Sh t="이어서 학습하기" sub="멈춘 곳부터 바로 이어 봐요" />
      {main ? <section className="vh2"><a className="vh2-th" href={href}><RawOne html={V.thumbArt(main.p)} /><i className="vh2-play"><Icon n="play" /></i></a>
        <div className="vh2-b"><span className="vh2-tag">{(mp >= 100 ? "수강 완료" : nx.doneN ? "이어서 학습 중" : "학습 시작 전") + (list.length > 1 ? " · 강의 " + list.length + "개" : "")}</span><h2>{main.p.title}</h2><small className="vh2-cr">{main.p.creator} 강사님</small>
          <div className="vh2-pg"><div className="vh2-pg-t"><b>{mp}<em>%</em></b><span>{nx.doneN + " / " + nx.lz.length + "강 완료" + (mLeft ? " · 남은 시간 약 " + (mLeft >= 60 ? Math.floor(mLeft / 60) + "시간 " + (mLeft % 60 ? (mLeft % 60) + "분" : "") : mLeft + "분") : "")}</span></div><div className="vh2-bar"><i style={{ width: mp + "%" }} /></div></div>
          <p className="vh2-next">{nx.cur ? <><small>{nx.doneN ? "이어서 볼 강의" : "첫 강의"}</small><b>{nx.cur.title}</b><RawOne html={"<span>" + V.lLen(nx.cur) + "</span>"} /></> : <><small>완강</small><b>모든 강의를 다 봤어요! 필요할 때마다 다시 보세요.</b></>}</p>
          <div className="vh2-btns"><a className="btn vh2-go" href={href}><Icon n="play" c="sm" />{nx.cur ? (nx.doneN ? "이어 보기" : "1강부터 보기") : "다시 보기"}</a><a className="btn vh2-sub" href="#/vodclass">{X.ML("vodclass")}</a></div>{pc !== mp && list.length > 1 ? <span className="vh2-all">전체 강의 평균 진도 {pc}%</span> : null}</div></section>
        : <section className="card"><Empty ic="circlePlay">DOOGO CLASS에 올라간 VOD가 아직 없어요.</Empty></section>}
      {list.length > 1 ? <><Sh t={"다른 강의 " + (list.length - 1) + "개"} /><div className="vh-more">{list.filter((x) => x !== main).map((x) => { const q = X.vodPctOf(x); return <a key={x.p.id} className="card vh-mini" href={"#/vodclass#vc-" + x.p.id}><RawOne html={'<span class="vh-mini-th">' + V.thumbArt(x.p) + "</span>"} /><span className="vh-mini-t"><b>{x.p.title}</b><Progress pct={q} thin /><small className="tiny">진도 {q}%</small></span></a>; })}</div></> : null}
      <ExtendNote />
      {hasAdd ? <><Sh t="강사님과 직접" sub="1:1 코칭 · TEA TIME" /><div className="vh-adds"><CoachCard /><TeaCard /></div></> : null}
      <div className="callout vh-note"><Icon n="checks" /><div><b>VOD는 숙제 · 마감이 없어요</b><span>내 속도대로 보고, {X.on("docs") ? <><a href="#/docs">{X.ML("docs")}</a>로 실제로 해 봤는지 스스로 점검해 보세요.</> : "필요한 부분은 언제든 다시 보세요."}</span></div></div>
      <Notices empty="아직 소식이 없어요." />
      <QuickLinks />
    </div>
  );
}

export default function DgHome() {
  return st().TRACK === "vod" ? <VodHome /> : <LiveHome />;
}
