"use client";
/* 두잉고 강의실: 일정 #/schedule · 공지 #/notices(/<공지>) · Q&A #/qna · 1:1 요청 · 코칭 질문 #/qna/requests(/new · /<요청>)
 * 예전 app.js pageSchedule · pageNotices · noticeBody · pageQna · faqList · pageRequests · pageRequestNew · pageRequestDetail 을 React 로 (Next.js 전환 5단계)
 *  · 등록 · 취소 · 읽음 · 달력 고르기는 예전 함수 그대로 (DGA.submitRequest · reqCancel · noticeRead · cal …) */
import { useEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, fmtFull, todayStr, LiveBtn, NewBadge, Empty, PageHead, Crumb, playDelegate } from "./bits.jsx";
import { NotFound, MainBtn } from "./Learn.jsx";
import { CoachCard } from "./HomePage.jsx";

const redraw = () => window.ReactApp.redraw();

/* ---------- 일정 ---------- */
export function SchedulePage() {
  const X = DGA(), S = st(), DB = DBX(), today = todayStr(), evs = X.myEvents(), cal = X.cal(), { y, m } = cal, DOW = DB.date.DOW, parse = DB.date.parseDate, fmtKo = DB.date.fmtKo;
  const startOffset = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), cells = [];
  for (let i = 0; i < Math.ceil((startOffset + days) / 7) * 7; i++) cells.push(DB.date.toStr(new Date(y, m, 1 - startOffset + i)));
  const byDate = {}; evs.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const sel = byDate[cal.sel] || [], T = DB.EVENT_TYPES, iid = S.INS.id, CT = DB.calTypes(iid), used = CT.concat(Object.keys(T).filter((k) => CT.indexOf(k) < 0 && evs.some((e) => e.type === k))), L = (t) => DB.evLabel(iid, t);
  const ORDER = ["open", "offline", "free", "replay", "deadline", "qna", "challenge", "bonus", "event", "notice"], rank = (e) => { const i = ORDER.indexOf(e.type); return i < 0 ? 99 : i; };
  const SHORT = { offline: "오프라인", free: "무료", replay: "녹화본", qna: "Q&A", challenge: "챌린지", bonus: "보너스", event: "행사", notice: "공지" };
  const chipS = (e) => (e.type === "open" ? (e.week ? e.week + "주차" : DB.calShort(iid)) : e.type === "deadline" ? (e.week ? e.week + "주 마감" : "마감") : SHORT[e.type] || L(e.type));
  const chipL = (e) => (e.type === "open" || e.type === "deadline" ? (e.week ? e.week + "주차 " : "") + L(e.type) : (e.time ? e.time + " " : "") + L(e.type));
  Object.keys(byDate).forEach((k) => byDate[k].sort((a, b) => rank(a) - rank(b)));
  const ym = DB.date.toStr(new Date(y, m, 1)).slice(0, 7), mon = Object.keys(byDate).filter((k) => k.slice(0, 7) === ym).sort();
  const act = (fn) => () => { fn(); redraw(); };
  const ml = X.mainLec();
  return (
    <div className="page"><PageHead title={X.ML("schedule")} sub="강의가 열리는 날, 과제 마감, 라이브 시간을 달력 한 장으로 챙겨요." />
      <section className="card cal-card cal2"><div className="cal-head"><h2>{y}년 {m + 1}월</h2>
        <div className="cal-nav"><button className="icon-btn ghost" data-action="cal-move" data-d="-1" aria-label="이전 달" onClick={act(() => X.calMove(-1))}><Icon n="chevLeft" /></button><button className="btn btn-tertiary btn-sm" data-action="cal-today" onClick={act(X.calToday)}>오늘</button><button className="icon-btn ghost" data-action="cal-move" data-d="1" aria-label="다음 달" onClick={act(() => X.calMove(1))}><Icon n="chevRight" /></button></div></div>
        <div className="cal">{DOW.map((d, i) => <div key={"w" + i} className={"cal-dow" + (i === 0 ? " sun" : i === 6 ? " sat" : "")}>{d}</div>)}
          {cells.map((k) => {
            const d = parse(k), list = byDate[k] || [], main = list.some((e) => e.type === "open");
            return (
              <button key={k} type="button" className={"cal-day" + (main ? " main" : "") + (d.getMonth() !== m ? " other" : "") + (k === today ? " today" : "") + (k === cal.sel ? " sel" : "") + (d.getDay() === 0 ? " sun" : d.getDay() === 6 ? " sat" : "")} data-action="cal-pick" data-date={k} aria-label={fmtKo(k) + (list.length ? " · " + list.map(chipL).join(", ") : "")} onClick={act(() => X.calPick(k))}><span className="d">{d.getDate()}</span>
                {list.length ? <span className="cal-evs">{list.slice(0, 3).map((e, i) => <span key={i} className={"cal-chip t-" + e.type}><b className="s">{chipS(e)}</b><b className="l">{chipL(e)}</b></span>)}{list.length > 3 ? <span className="cal-more">+{list.length - 3}</span> : null}</span> : null}</button>
            );
          })}</div>
        <div className="legend cal-legend">{used.map((k) => <span key={k}><i className={"cal-sw t-" + k} />{L(k)}</span>)}</div></section>
      <section className="card cal-selday"><div className="home-video-head"><h2>{fmtKo(cal.sel)}</h2><span className="tiny">{sel.length}건</span></div>
        {sel.length ? <div className="stack">{sel.map((e, i) => (
          <div key={i} className="ev-card"><i className={"ev-dot " + e.type} /><div style={{ flex: "1", minWidth: "0" }}><div className="tiny">{L(e.type) + (e.week ? " · " + e.week + "주차" : "") + (e.time && e.type !== "open" ? " · " + e.time : "")}</div><div className="ev-title">{e.title}</div>{e.place ? <div className="tiny ev-place"><Icon n="mapPin" c="xs" />{e.place}</div> : null}</div>
            {e.url && e.date >= today ? <LiveBtn e={e} small /> : null}
            {e.type === "replay" && e.date <= today ? (ml ? <span className="ev-acts"><MainBtn cls="btn-secondary btn-sm" text={(ml.platform || "메인 강의실") + "에서 녹화본 보기"} /></span> : X.on("replays") ? <span className="ev-acts"><a className="btn btn-secondary btn-sm" href="#/replays"><Icon n="play" c="sm" />{X.ML("replays")}</a></span> : null) : null}
            {(e.type === "open" || e.type === "deadline") && e.week && X.findWeek(e.week) ? <span className="ev-acts">{X.on("curriculum") ? <a className="btn btn-secondary btn-sm" href="#/curriculum"><Icon n="book" c="sm" />{X.ML("curriculum")} 보기</a> : null}{X.on("missions") ? <a className="btn btn-primary btn-sm" href={"#/missions/" + e.week}><Icon n="checks" c="sm" />{e.type === "open" ? "과제 보기" : "과제 제출하기"}</a> : null}</span> : null}</div>
        ))}</div> : <p className="muted" style={{ margin: "0" }}>이 날은 일정이 없어요.</p>}</section>
      {mon.length ? <section className="card cal-agenda"><div className="home-video-head"><h2>{m + 1}월 일정 한눈에</h2><span className="tiny">{mon.reduce((a, k) => a + byDate[k].length, 0)}건</span></div>
        <ol className="ag-list">{mon.map((k) => { const d = parse(k); return <li key={k} className={"ag-day" + (k < today ? " past" : "") + (k === today ? " today" : "")}><span className={"ag-date" + (d.getDay() === 0 ? " sun" : d.getDay() === 6 ? " sat" : "")}><b>{d.getDate()}</b><small>{DOW[d.getDay()] + (k === today ? " · 오늘" : "")}</small></span><span className="ag-evs">{byDate[k].map((e, i) => <span key={i} className="ag-ev"><span className={"cal-chip t-" + e.type}><b>{L(e.type)}</b></span><span className="ag-t">{e.title}</span></span>)}</span></li>; })}</ol></section> : null}
    </div>
  );
}

/* ---------- 공지 ---------- */
function Notice({ id }) {
  const X = DGA(), S = st(), D = S.D, n = D.notices.find((x) => x.id === id);
  // 읽음 표시 (왼쪽 메뉴 숫자가 줄어요 — 예전처럼 그린 뒤에)
  useEffect(() => { if (n && X.noticeRead(n)) redraw(); });
  if (!n) return <NotFound />;
  return (
    <div className="page"><PageHead title={X.NT()} crumbs={<Crumb items={[[X.NT(), "#/notices"], ["상세"]]} />} />
      <article className="card article">{n.pinned ? <span className="badge badge-ink" style={{ marginBottom: "10px" }}>필독</span> : null}<h2>{n.title}</h2><div className="meta">{D.brand.instructor} · {fmtFull(n.date)}</div><RawOne html={X.noticeBody(n)} onClick={playDelegate} /></article>
      <div style={{ marginTop: "14px" }}><a className="btn btn-secondary" href="#/notices"><Icon n="chevLeft" c="sm" />목록으로</a></div></div>
  );
}
export function NoticesPage({ r }) {
  const X = DGA(), S = st(), D = S.D;
  if (r.parts[1]) return <Notice key={r.parts[1]} id={r.parts[1]} />;
  const list = D.notices.slice().sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));
  return (
    <div className="page"><PageHead title={X.NT()} sub={"공지사항은 여기서 봐요. " + D.brand.instructor + "님이 전하는 수업 안내 · 새 소식 · 영상이 올라와요."} />
      <section className="card">{list.length ? list.map((n) => <a key={n.id} className="notice-row" href={"#/notices/" + n.id}>{n.pinned ? <span className="badge badge-ink"><Icon n="pin" c="xs" />필독</span> : <span className="badge badge-neutral">공지</span>}<span className="lr-title">{n.title}</span>
        {(n.images || []).length ? <span className="n-ic" title={"사진 " + n.images.length + "장"}><Icon n="image" c="xs" /></span> : null}{X.noticeVideos(n).length ? <span className="n-ic" title="영상"><Icon n="play" c="xs" /></span> : null}<NewBadge n={n} /><span className="lr-date">{fmtFull(n.date)}</span></a>)
        : <Empty ic="megaphone">아직 공지가 없어요.</Empty>}</section>
      {X.unreadNotices() ? <div style={{ marginTop: "12px", textAlign: "right" }}><button className="link-btn" data-action="read-all" onClick={() => { X.readAll(); redraw(); }}>모두 읽음으로 표시</button></div> : null}</div>
  );
}

/* ---------- Q&A ---------- */
function QnaTabs({ on }) {
  const S = st();
  return <div className="utabs" role="tablist"><a role="tab" href="#/qna" className={on === "faq" ? "on" : ""} aria-selected={String(on === "faq")}><Icon n="search" c="xs" />FAQ 검색</a><a role="tab" href="#/qna/requests" className={on === "req" ? "on" : ""} aria-selected={String(on === "req")}><Icon n="message" c="xs" />{S.TRACK === "vod" ? "1:1 코칭 질문" : "1:1 요청"}</a></div>;
}
function Faq() {
  const X = DGA(), S = st(), D = S.D, vod = S.TRACK === "vod";
  const cats = ["전체"].concat(D.faqs.map((f) => f.category || "기타").filter((c, i, a) => a.indexOf(c) === i));
  if (cats.indexOf(X.faqCat()) === -1) X.faqCat("전체");
  const cat = X.faqCat(), [q, setQ] = useState("");
  const t = q.trim().toLowerCase(), list = D.faqs.filter((f) => (cat === "전체" || (f.category || "기타") === cat) && (!t || (f.q + f.a + (f.tags || []).join(" ")).toLowerCase().indexOf(t) !== -1));
  return (
    <div className="page">{vod ? <><PageHead title={X.ML("qna")} sub="많이 나오는 질문과 답을 먼저 찾아보세요. 강사에게 직접 묻고 싶다면 1:1 코칭권으로 질문할 수 있어요." />{X.coachN() || X.myCoachQs().length ? <QnaTabs on="faq" /> : null}<CoachCard compact /></>
      : <><PageHead title={X.ML("qna")} sub="검색 한 번으로 답을 찾고, 화면 오류나 불편한 점은 1:1 요청으로 바로 알려 주세요." /><QnaTabs on="faq" /></>}
      <section className="card"><div className="search"><Icon n="search" /><input key={cat} className="input" id="faq-search" type="search" placeholder="궁금한 내용을 검색해 보세요 (예: 통관, 마진, 로그인)" aria-label="자주 묻는 질문 검색" onInput={(e) => setQ(e.currentTarget.value)} /></div>
        <div className="faq-cats" role="tablist">{cats.map((c) => <button key={c} type="button" className={"chip" + (c === cat ? " on" : "")} data-action="faq-cat" data-cat={c} onClick={() => { X.faqCat(c); setQ(""); redraw(); }}>{c} <span>{c === "전체" ? D.faqs.length : D.faqs.filter((f) => (f.category || "기타") === c).length}</span></button>)}</div>
        <div id="faq-list">{list.length ? list.map((f, i) => <details key={i} className="faq"><summary><span className="q">Q</span><span><small className="faq-cat">{f.category || "기타"}</small>{f.q}</span><Icon n="chevDown" c="sm chev" /></summary><div className="a">{f.a}</div></details>) : <div className="empty"><Icon n="search" /><div>검색 결과가 없어요.</div></div>}</div></section>
      <p className="tiny" style={{ marginTop: "12px" }}>{vod ? <>원하는 답이 없다면 {D.brand.botName}에게 물어보거나 1:1 코칭 질문을 남겨 주세요. 결제 · 환불 · 계정 문의는 <a href="#/vod/my/help">DOOGO CLASS 고객센터</a>로 남겨 주세요.</> : "원하는 답이 없다면 " + D.brand.botName + "에게 물어보거나 라이브 시간에 질문해 주세요."}</p></div>
  );
}
function Requests() {
  const X = DGA(), S = st(), DB = DBX(), vod = S.TRACK === "vod", list = vod ? X.myCoachQs() : X.myRequests(), n = vod ? X.coachN() : 0, cp = vod ? X.addPid("coachOf") : "";
  const open = (x, mine) => { if (mine) window.ROUTE.hash = "#/qna/requests/" + x.q.id; else X.toast("비공개 글은 작성자와 강사님만 볼 수 있어요.", "warn"); };
  return (
    <div className="page"><PageHead title={X.ML("qna")} sub={vod ? "강사님께 남긴 1:1 코칭 질문이에요. 질문 1개에 코칭권 1회가 차감돼요." : "화면 오류나 불편한 점을 남기면 강사님이 직접 확인하고 답해 드려요."} /><QnaTabs on="req" />
      <div className="req-bar"><span className="muted">총 <b>{list.length}</b>건의 {vod ? <>코칭 질문{n ? <> · 남은 코칭 <b>{n}회</b></> : null}</> : "1:1 요청"}</span>{vod && !n ? (cp ? <a className="btn btn-primary" href={"#/vod/checkout/" + cp + "?item=coach"}><Icon n="message" c="sm" />코칭권 사기</a> : null) : <a className="btn btn-primary" href="#/qna/requests/new"><Icon n="pen" c="sm" />{vod ? "질문 남기기" : "요청 남기기"}</a>}</div>
      <div className="callout callout-ok req-note"><Icon n="lock" c="sm" /><div>{vod ? <>코칭 질문은 <b>비공개</b>예요. 나와 강사님만 볼 수 있어요.{n ? " 코칭권은 " + X.coachEnd() + "까지 쓸 수 있어요." : ""}</> : <>모든 1:1 요청은 <b>비공개</b>예요. 작성자와 강사님만 볼 수 있어요. 수업 내용 질문은 라이브 시간이나 {S.D.brand.botName}에게 물어보면 더 빨라요.</>}</div></div>
      <section className="card req-card">{list.length ? <table className="req-table"><thead><tr><th className="c-no">번호</th><th className="c-st">상태</th><th>제목</th><th className="c-au">작성자</th><th className="c-dt">작성일</th><th className="c-an">답변</th></tr></thead><tbody>
        {list.map((x) => { const mine = x.s.id === S.me.id; return (
          <tr key={x.q.id} className={mine ? "mine" : ""} data-action="req-open" data-id={x.q.id} data-mine={mine ? 1 : 0} tabIndex={0} onClick={() => open(x, mine)} onKeyDown={(e) => { if (e.key === "Enter") open(x, mine); }}>
            <td className="c-no num">{x.no}</td><td className="c-st">{x.q.answer ? <span className="badge badge-positive">답변완료</span> : <span className="badge badge-neutral">답변대기</span>}</td>
            <td className="c-title">{mine ? <><b>{x.q.title}</b>{(x.q.images || []).length ? <Icon n="paperclip" c="xs" /> : null}<span className="badge badge-ink mine-tag">내 글</span></> : <span className="locked"><Icon n="lock" c="xs" />(비공개)</span>}{x.q.answer ? <span className="re">RE</span> : null}</td>
            <td className="c-au">{mine ? S.me.name : DB.maskName(x.s.name)}</td><td className="c-dt num">{DB.date.toStr(new Date(x.q.at))}</td><td className="c-an num">{x.q.answer ? "1" : "—"}</td></tr>); })}</tbody></table>
        : <Empty ic="message">{vod ? "아직 남긴 코칭 질문이 없어요." : "아직 남긴 1:1 요청이 없어요."}</Empty>}</section></div>
  );
}
function RequestNew() {
  const X = DGA(), S = st(), DB = DBX(), vod = S.TRACK === "vod", n = vod ? X.coachN() : 0, cats = vod ? X.COACH_CATS : DB.REQUEST_CATEGORIES, [ask] = useState(() => (vod ? X.vtAskGet() : null));
  const [drag, setDrag] = useState(false);
  const files = (fl) => X.addReqFiles(fl);
  const dz = { onDragOver: (e) => { e.preventDefault(); setDrag(true); }, onDragEnter: (e) => { e.preventDefault(); setDrag(true); }, onDragLeave: (e) => { e.preventDefault(); setDrag(false); }, onDrop: (e) => { e.preventDefault(); setDrag(false); files(e.dataTransfer.files); } };
  const submit = (e) => { e.preventDefault(); X.submitRequest(e.currentTarget); };
  return (
    <div className="page"><PageHead title={X.ML("qna")} sub={vod ? "강의를 보다 막힌 부분, 내 사업에 적용하는 방법을 강사님께 직접 물어보세요." : "화면 오류나 불편한 점을 남기면 강사님이 직접 확인하고 답해 드려요."} /><QnaTabs on="req" />
      <a className="back-link" href="#/qna/requests"><Icon n="arrowLeft" c="sm" />{vod ? "코칭 질문 목록" : "1:1 요청 목록"}</a>
      <section className="card"><h2 className="card-title">{vod ? <>1:1 코칭 질문 남기기{n ? <> <span className="badge badge-ink">남은 {n}회</span></> : null}</> : "1:1 요청 남기기"}</h2><p className="tiny" style={{ margin: "0 0 18px" }}>{vod ? "어떤 강의를 보다가, 지금 내 상황이 어떤지, 무엇이 궁금한지 적어 주시면 더 정확하게 답해 드려요." : "어떤 화면에서 무엇을 눌렀을 때 어떤 문제가 생겼는지 적고, 스크린샷을 함께 올려 주시면 더 빨리 고칠 수 있어요."}</p>
        <form id="request-form" className="stack" noValidate onSubmit={submit}>
          <div className="field"><span className="field-label">분류</span><div className="req-cats">{cats.map((c, i) => <label key={c} className="chip-radio"><input type="radio" name="category" value={c} defaultChecked={i === 0} /><span>{c}</span></label>)}</div></div>
          <div className="field"><label htmlFor="q-title">제목</label><input className="input" id="q-title" name="title" maxLength="80" placeholder={vod ? "예: 공급처에 샘플을 요청할 때 단가도 같이 물어봐도 될까요?" : "예: 과제 사진을 올려도 제출 버튼이 안 눌려요"} defaultValue={ask ? ask.title : ""} /></div>
          <div className="field"><label htmlFor="q-body">내용</label><textarea className="textarea" id="q-body" name="body" rows="7" placeholder={vod ? "1. 어떤 강의를 보다가 (예: 3강 공급처 연락하기)\n2. 지금 내 상황 (예: 스마트스토어 월 매출 300만 원, 건기식 판매 중)\n3. 궁금한 점 (구체적일수록 답이 정확해져요)" : "1. 어느 화면에서 (예: 과제 제출하기 > 1주차 > 사업자등록증 발급)\n2. 무엇을 했을 때 (예: 사진을 고르고 제출 버튼을 눌렀을 때)\n3. 어떤 문제가 (예: 아무 반응이 없어요)\n4. 사용 기기 (예: 아이폰 사파리)"} defaultValue={ask ? ask.body : ""} /></div>
          <div className="field"><span className="field-label">{vod ? "사진 · 캡처 첨부" : "스크린샷 첨부"} <span className="tiny">(최대 3장)</span></span>
            <label className={"dropzone small" + (drag ? " drag" : "")} id="req-drop" {...dz}><input type="file" id="req-file" accept="image/*" multiple className="sr-only" onChange={(e) => { files(e.currentTarget.files); e.currentTarget.value = ""; }} /><Icon n="image" /><strong>{vod ? "사진을 끌어다 놓거나 눌러서 선택" : "스크린샷을 끌어다 놓거나 눌러서 선택"}</strong><span className="tiny">휴대폰은 화면을 캡처한 뒤 사진 앨범에서 고르면 돼요</span></label>
            <div className="thumbs" id="req-thumbs">{X.reqDraft().map((f, i) => <div key={i} className="thumb"><img src={f.data} alt={f.name} /><button type="button" data-action="req-remove" data-i={i} aria-label="삭제" onClick={() => { X.reqRemove(i); redraw(); }}><Icon n="x" c="xs" /></button></div>)}</div></div>
          <div className="callout callout-ok"><Icon n="lock" c="sm" /><div>{vod ? <>비공개로 등록돼요. 등록하면 <b>코칭권 1회가 차감</b>돼요{n ? " (남은 " + n + "회 → " + (n - 1) + "회)" : ""}. 강사님 답변이 달리면 이 화면에서 바로 확인할 수 있어요.</> : "비공개로 등록돼요. 작성자와 강사님만 볼 수 있어요."}</div></div>
          <div className="req-actions"><a className="btn btn-secondary" href="#/qna/requests">취소</a><button className="btn btn-primary" type="submit"><Icon n="send" c="sm" />{vod ? "질문 등록하기" : "등록하기"}</button></div>
        </form></section></div>
  );
}
const hm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
function RequestDetail({ id }) {
  const X = DGA(), S = st(), D = S.D, DB = DBX(), x = X.myRequests().find((r) => r.q.id === id), vq = S.TRACK === "vod";
  const [arm, setArm] = useState(false);
  useEffect(() => { if (x && x.s.id === S.me.id && X.qSeen(id)) redraw(); });
  useEffect(() => { if (!arm) return undefined; const t = setTimeout(() => setArm(false), 3000); return () => clearTimeout(t); }, [arm]);
  if (!x || x.s.id !== S.me.id) return (
    <div className="page"><PageHead title={X.ML("qna")} /><QnaTabs on="req" /><section className="card empty"><Icon n="lock" /><p style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)", margin: "0 0 6px" }}>비공개 글이에요</p><p style={{ margin: "0 0 18px" }}>1:1 요청은 작성자와 강사님만 볼 수 있어요.</p><a className="btn btn-primary" href="#/qna/requests">목록으로</a></section></div>
  );
  const q = x.q, d = new Date(q.at), cancel = () => { if (!arm) { setArm(true); return; } X.reqCancel(q.id); };
  return (
    <div className="page"><PageHead title={X.ML("qna")} sub={vq ? "남긴 코칭 질문과 강사님 답변을 확인해요." : "남긴 요청과 강사님 답변을 확인해요."} /><QnaTabs on="req" />
      <a className="back-link" href="#/qna/requests"><Icon n="arrowLeft" c="sm" />{vq ? "1:1 코칭 목록" : "1:1 요청 목록"}</a>
      <article className="card req-detail"><div className="req-detail-top">{q.answer ? <span className="badge badge-positive">답변완료</span> : <span className="badge badge-neutral">답변대기</span>}<span className="badge badge-neutral">{q.category || "기타"}</span><span className="badge badge-neutral"><Icon n="lock" c="xs" />비공개</span><span className="req-no">#{x.no}</span></div>
        <h2>{q.title}</h2><div className="meta">{S.me.name} · {DB.date.toStr(d)} {hm(d)}</div><div className="body">{q.body}</div>
        {(q.images || []).length ? <div className="req-shots">{q.images.map((im, i) => <a key={i} href={im.data} target="_blank" rel="noopener"><img src={im.data} alt={im.name} /></a>)}</div> : null}</article>
      <div className="section-head"><h2>강사 답변</h2></div>
      {q.answer ? <section className="card req-answer"><div className="req-answer-top"><b>{D.brand.instructor} · 운영자</b><span>{q.answeredAt ? DB.date.toStr(new Date(q.answeredAt)) + " " + hm(new Date(q.answeredAt)) : ""}</span></div><div className="body">{q.answer}</div></section>
        : <section className="card empty"><Icon n="clock" /><div>강사님이 확인하고 있어요. 답변이 달리면 여기에 바로 보여요.</div>{S.preview ? null : <button type="button" className="btn btn-secondary btn-sm" data-action="req-cancel" data-id={q.id} data-arm={arm ? "1" : undefined} onClick={cancel}>{arm ? "한 번 더 누르면 취소돼요" : vq && q.coach ? "질문 취소하고 코칭권 돌려받기" : "요청 취소하기"}</button>}</section>}
    </div>
  );
}
/** #/qna · #/qna/requests(/new · /<요청>) — VOD 버전은 코칭권이 있을 때만 질문 화면 */
export function QnaPage({ r }) {
  const X = DGA(), S = st();
  if (S.TRACK === "vod" && (r.parts[1] === "requests" || r.params.get("tab") === "request") && !(X.coachN() > 0 || (r.parts[2] !== "new" && X.myCoachQs().length))) { window.ROUTE.replace("#/qna"); r = X.route(); }
  if (r.params.get("tab") === "request") { window.ROUTE.replace("#/qna/requests"); r = X.route(); }
  if (r.parts[1] === "requests") { const id = r.parts[2]; return id === "new" ? <RequestNew /> : id ? <RequestDetail key={id} id={id} /> : <Requests />; }
  return <Faq />;
}
