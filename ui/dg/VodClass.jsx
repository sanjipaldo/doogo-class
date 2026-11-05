"use client";
/* 두잉고 강의실 VOD 버전: 강의 목록 #/vodclass · 극장형 강의실 #/vodclass/<강의>(/<회차>)(?t=초) · 내 노트 #/vodclass/notes
 * 예전 app.js pageVodClass · pageVodPlay · pageVodNotes · noteItem · vtFiles 를 React 로 (Next.js 전환 5단계)
 *  · 영상(+워터마크 · 전체 화면 버튼)은 예전 HTML 그대로 한 번만 넣어요 — 탭을 바꾸거나 노트를 저장해도 영상을 다시 불러오지 않아요 (예전과 같음)
 *  · 노트 저장 · 고치기 · 지우기 · 할 일 · 코칭 질문 보내기 · 내려받기 · 영상 시간 · 완료는 예전 함수 그대로 (DGA.vtSaveNote · noteEditSave · noteDel …)
 *  · 노트 목록은 예전처럼 저장 · 지우기 · 거르기 때마다(= 다시 그린 횟수 n) 새로 그려요 */
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, Progress, Empty, PageHead } from "./bits.jsx";

const redraw = () => window.ReactApp.redraw();
const V = () => window.VOD;
const matDelegate = (e) => { const a = e.target.closest && e.target.closest("[data-action='vt-mat'], [data-action='vt-dl']"); if (a) DGA().matClick(a); };
const Lines = ({ t }) => String(t).split("\n").map((x, i) => (i ? [<br key={"b" + i} />, x] : x));
const FS = '<button type="button" class="vt-fs" data-action="vt-fs" aria-label="전체 화면"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>';

/* ---------- 노트 하나 (강의실 · 내 노트 같이 씀) ---------- */
function NoteItem({ nt, pid, link, edit, setEdit, arm, setArm }) {
  const X = DGA(), tg = X.NOTE_TAGS.find((t) => t[0] === nt.tag), [d0] = useState(!!nt.done), [, force] = useState(0), ta = useRef(null);
  const editing = edit === nt.id, armed = arm === nt.id;
  useEffect(() => { if (editing && ta.current) { ta.current.focus(); ta.current.setSelectionRange(ta.current.value.length, ta.current.value.length); } }, [editing]);
  const del = () => { if (!armed) { setArm(nt.id); return; } X.noteDel(nt.id); redraw(); X.toast("노트를 지웠어요."); };
  const save = () => { if (ta.current && X.noteEditSave(nt.id, ta.current.value)) { redraw(); X.toast("노트를 고쳤어요."); } };
  const tchip = nt.t == null ? null : link ? <a className="vt-t" href={X.learnHref(pid, nt.lid) + "?t=" + Math.floor(nt.t)}><Icon n="play" c="xs" />{X.fmtT(nt.t)}</a>
    : <button type="button" className="vt-t" data-action="vt-seek" data-t={Math.floor(nt.t)} title="이 장면으로 이동" onClick={() => X.vtSeekBtn(nt.t)}><Icon n="play" c="xs" />{X.fmtT(nt.t)}</button>;
  return (
    <li className={"vt-nt" + (nt.done ? " is-done" : "")} data-id={nt.id}><div className="vt-nt-h">{tchip}{tg ? <span className={"vt-tag t-" + tg[0]}>{tg[1]}</span> : null}<span className="vt-nt-d">{X.hhmm(nt.upd || nt.at)}</span>
      <span className="vt-nt-a"><button type="button" data-action="vt-note-edit" data-id={nt.id} title="수정" aria-label="노트 수정" onClick={() => setEdit(nt.id)}><Icon n="pen" c="xs" /></button><button type="button" className={armed ? "arm" : undefined} data-action="vt-note-del" data-id={nt.id} title="삭제" aria-label="노트 삭제" onClick={del}>{armed ? "삭제?" : <Icon n="trash" c="xs" />}</button></span></div>
      {editing ? <div className="vt-edit"><textarea ref={ta} className="textarea" rows="3" maxLength="2000" defaultValue={nt.text} /><div className="vt-edit-f"><button type="button" className="btn btn-secondary btn-sm" data-action="vt-note-ecancel" onClick={() => redraw()}>취소</button><button type="button" className="btn btn-primary btn-sm" data-action="vt-note-esave" data-id={nt.id} onClick={save}>저장</button></div></div>
        : nt.tag === "todo" ? <label className="vt-todo"><input type="checkbox" data-action="vt-note-todo" data-id={nt.id} defaultChecked={d0} onChange={(e) => { if (X.noteTodo(nt.id, e.currentTarget.checked)) force((k) => k + 1); }} /><span><Lines t={nt.text} /></span></label>
          : <p className="vt-nt-p"><Lines t={nt.text} /></p>}
      {nt.tag === "ask" ? <button type="button" className={"vt-ask" + (nt.asked ? " sent" : "")} data-action="vt-note-ask" data-id={nt.id} onClick={() => X.noteAsk(nt.id)}><Icon n="message" c="xs" />{nt.asked ? "1:1 코칭 질문으로 보냈어요" : "1:1 코칭 질문으로 보내기"}</button> : null}
    </li>
  );
}
/** 고치는 중 · 지우기 확인은 다시 그리면(n) 풀려요 — 지우기 확인은 3초 뒤에도 (예전과 같음) */
function useNoteUi(n) {
  const [e, setE] = useState(null), [a, setA] = useState(null);
  useEffect(() => { if (!a) return undefined; const t = setTimeout(() => setA(null), 3000); return () => clearTimeout(t); }, [a]);
  return { edit: e && e.n === n ? e.id : null, setEdit: (id) => setE({ id, n }), arm: a && a.n === n ? a.id : null, setArm: (id) => setA({ id, n }) };
}
function Filters({ list, onPick }) {
  const X = DGA(), f = X.vtFilter();
  return [["all", "전체"]].concat(X.NOTE_TAGS).map((t) => { const c = t[0] === "all" ? list.length : list.filter((x) => x.tag === t[0]).length; return <button key={t[0]} type="button" className={"vt-fchip" + (f === t[0] ? " on" : "")} data-action="vt-filter" data-k={t[0]} onClick={() => { X.vtFilter(t[0]); onPick(); }}>{t[1]} <small>{c}</small></button>; });
}

/* ---------- 노트 쓰기 칸 (예전처럼 처음 그릴 때의 임시 저장 글로) ---------- */
function NoteForm({ pid, lid }) {
  const X = DGA(), [d0] = useState(() => X.draftGet(pid, lid));
  return (
    <div className="vt-nn"><div className="vt-tags" role="radiogroup" aria-label="노트 종류">{X.NOTE_TAGS.map((t, k) => <label key={t[0]} className={"vt-tagr t-" + t[0]}><input type="radio" name="vt-tag" value={t[0]} defaultChecked={k === 0} /><span>{t[1]}</span></label>)}</div>
      <textarea className="textarea vt-ta" id="vt-note-text" rows="4" maxLength="2000" placeholder="강의를 들으며 기억할 내용 · 궁금한 점 · 할 일을 적어 보세요 (Ctrl + Enter 저장)" defaultValue={d0}
        onInput={(e) => X.draftSet(pid, lid, e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); X.vtSaveNote(); } }} onFocus={() => X.vtFocusFill()} />
      <div className="vt-nn-f"><label className="vt-tc" title="영상 시간 · 비우면 시간 없이 저장"><Icon n="clock" c="xs" /><input id="vt-note-t" inputMode="numeric" autoComplete="off" placeholder="0:00" aria-label="영상 시간" /></label><button type="button" className="link-btn vt-now" data-action="vt-now" onClick={() => X.vtNowBtn()}>지금 시간</button><button type="button" className="btn btn-primary btn-sm vt-save" data-action="vt-note-save" onClick={() => X.vtSaveNote()}><Icon n="check" c="sm" />저장</button></div></div>
  );
}

/* ---------- 극장형 강의실 ---------- */
function VodPlay({ pid, lid, tq, n }) {
  const X = DGA(), S = st(), DB = DBX(), esc = DB.esc, x = X.vodList().find((v) => v.p.id === pid);
  const nx = x ? X.vodNext(x) : null, lz = nx ? nx.lz : [], cur = nx ? lz.find((l) => l.id === lid) || lz.find((l) => l.id === nx.pr.last) || nx.cur || lz[0] : null;
  const [tab, setTab] = useState(() => (["toc", "note", "files"].indexOf(X.vtTab()) >= 0 ? X.vtTab() : "toc")), [gen, setGen] = useState(0), ui = useNoteUi(n);
  // 영상 칸은 이 회차에서 한 번만 만들어요 (워터마크 시각은 예전 코드가 30초마다 글자만 바꿔요)
  // DOOGO CLASS 결제 후 N일 이내 · 재생 전이면 영상 대신 ‘시작하면 100% 환불이 끝나요’ 안내 (예전 pageVodPlay 와 같은 gateHtml)
  const mid0 = x && x.o && S.me && S.me.vodMid ? S.me.vodMid : "", gate = mid0 && cur && V().startGate ? V().startGate(mid0, pid, cur.id) : null;
  const stage = useMemo(() => (cur ? '<div class="vt-stage" id="vt-stage">' + (gate ? V().gateHtml(gate, pid, cur.id, true) : X.vtVideo(cur, tq) + X.vtWatermark() + FS) + "</div>" : ""), [pid, cur && cur.id, tq, !!gate]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { X.vtReset(); X.vtAfter(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!x) {
    const me = S.me, ext = me && me.vodMid && V().canRebuy && V().canRebuy(me.vodMid, pid), rp = ext ? V().rebuySet().pct : 0;
    return <div className="page"><PageHead title={X.ML("vodclass")} /><section className="card"><Empty ic="lock">{ext ? "수강 기간이 끝난 강의예요. 재수강 " + rp + "% 할인가로 다시 결제하면 진도 · 노트 그대로 다시 들을 수 있어요." : "볼 수 있는 강의가 아니에요. 수강 기간이 끝났거나 구매하지 않은 강의예요."}</Empty><div className="btn-row">{ext ? <a className="btn btn-primary" href={"#/vod/p/" + pid}><Icon n="refresh" c="sm" />재수강 {rp}% 할인으로 다시 듣기</a> : null}<a className="btn btn-secondary" href="#/vodclass"><Icon n="arrowLeft" c="sm" />VOD 강의 목록</a></div></section></div>;
  }
  if (!cur) return <div className="page"><PageHead title={x.p.title} /><section className="card"><Empty ic="circlePlay">아직 올라온 강의가 없어요.</Empty></section></div>;
  const mid = x.o && S.me.vodMid ? S.me.vodMid : "";
  if (mid && !gate) V().markLast(mid, pid, cur.id);
  const i = lz.indexOf(cur), prev = lz[i - 1], next = lz[i + 1], done = !!nx.pr.done[cur.id], pc = X.vodPctOf(x), ch = V().chapOf(x.p, cur).ch || {}, fl = cur.files || [], ns = X.notesOf(pid, cur.id);
  const withFiles = lz.filter((l) => (l.files || []).length), nFiles = withFiles.reduce((a, l) => a + l.files.length, 0), f = X.vtFilter(), shown = ns.filter((t) => f === "all" || t.tag === f);
  const leftMin = Math.round(lz.filter((l) => !nx.pr.done[l.id]).reduce((a, l) => a + V().lSec(l), 0) / 60), allDone = lz.length > 0 && nx.doneN >= lz.length;
  const pick = (k) => {
    X.vtTab(k); setTab(k);
    if (k === "note") setTimeout(() => { const ta = document.getElementById("vt-note-text"); if (ta) { if (!window.matchMedia("(min-width: 1101px)").matches) document.querySelector(".vt-side").scrollIntoView({ behavior: "smooth", block: "start" }); ta.focus({ preventScroll: true }); } }, 0);
  };
  const doneClick = () => { const h = window.ROUTE.hash; X.vodDone(pid, cur.id); if (window.ROUTE.hash === h) setGen((g) => g + 1); };
  const botOpen = () => { X.botSet(true); redraw(); setTimeout(() => { const el = document.getElementById("chat-input-fab"); if (el && !window.matchMedia("(max-width: 720px)").matches) el.focus(); }, 0); };
  const ncount = ns.length ? String(ns.length) : "";
  return (
    <div className={"vt" + (allDone ? " is-fin" : "")} data-p={pid} data-l={cur.id}>
      <div className="vt-bar"><a className="vt-back" href="#/vodclass"><Icon n="arrowLeft" c="sm" /><span>{X.ML("vodclass")}</span></a><div className="vt-tt"><small>{x.p.creator} · {i + 1} / {lz.length}강</small><b>{x.p.title}</b></div><div className="vt-pc" title="전체 진도"><span className="vt-pcbar"><i style={{ width: pc + "%" }} /></span><b>{pc}%</b></div><RawOne html={X.opsKkBtn("vt-kk")} /></div>
      <div className="vt-grid"><div className="vt-main"><RawOne html={stage} onClick={(e) => { if (!e.target.closest) return; if (e.target.closest("[data-action='vt-fs']")) X.vtFs(); else if (e.target.closest("[data-action='vt-start']") && mid) { V().markLast(mid, pid, cur.id); setGen((g) => g + 1); } }} />
        <section className="vt-info"><div className="vt-info-h"><div className="vt-info-t"><small className="vt-ch">{ch.title || ""}</small><h1>{cur.title}</h1><RawOne html={'<span class="vt-meta">' + V().lLen(cur) + " · " + (i + 1) + " / " + lz.length + "강" + (fl.length ? " · 수업 자료 " + fl.length + "개" : "") + "</span>"} /></div>
          <button type="button" className="vt-memo" data-action="vt-tab" data-k="note" onClick={() => pick("note")}><Icon n="pen" c="sm" />메모하기<b data-ncount="">{ncount}</b></button></div>
          {done ? <div className="vt-donebar"><Icon n="check" c="sm" /><b>이 강의를 다 들었어요</b><span>{DB.date.fmtStamp(Date.now()).split(" ")[0]} 기준 · 진도에 반영됐어요</span></div> : null}
          <div className="vt-btns">{gate ? null : done ? <span className="vp-done"><Icon n="check" c="sm" />완료한 강의</span> : S.preview ? <span className="vp-done off"><Icon n="eye" c="sm" />미리보기라 완료 기록은 남지 않아요</span> : <button type="button" className="btn btn-primary" data-action="vod-done" data-p={pid} data-l={cur.id} onClick={doneClick}><Icon n="check" c="sm" />{next ? "완료하고 다음 강의" : "완료하기"}</button>}
            <div className="vt-nav">{prev ? <a className="btn btn-secondary" href={X.learnHref(pid, prev.id)}><Icon n="chevLeft" c="sm" />이전 강의</a> : <span className="btn btn-secondary is-off" aria-disabled="true"><Icon n="chevLeft" c="sm" />이전 강의</span>}{next ? <a className="btn btn-secondary" href={X.learnHref(pid, next.id)}>다음 강의 <Icon n="chevRight" c="sm" /></a> : <span className="btn btn-secondary is-off" aria-disabled="true">다음 강의 <Icon n="chevRight" c="sm" /></span>}</div>
            {X.on("bot") ? <button type="button" className="btn btn-tertiary vt-bot" data-action="bot-open" onClick={botOpen}><Icon n="bot" c="sm" />{S.D.brand.botName}에게 묻기</button> : null}</div>
          {cur.desc ? <div className="vt-sec"><h2><Icon n="book" c="sm" />강의 노트</h2><p><Lines t={cur.desc} /></p></div> : null}
          <div className="vt-sec"><h2><Icon n="paperclip" c="sm" />수업 자료{fl.length ? <> <small>{fl.length}</small></> : null}</h2>{fl.length ? <RawOne html={X.vtFiles(fl)} onClick={matDelegate} /> : <p className="vt-empty">이 강의에는 수업 자료가 없어요. 다른 강의 자료는 ‘자료’ 탭에서 모아 볼 수 있어요.</p>}</div>
        </section></div>
        <aside className="vt-side"><div className="vt-tabs" role="tablist">{[["toc", "목차", nx.doneN + "/" + lz.length], ["note", "내 노트", ncount], ["files", "자료", nFiles ? String(nFiles) : ""]].map((t) => <button key={t[0]} type="button" role="tab" className={tab === t[0] ? "on" : ""} data-action="vt-tab" data-k={t[0]} onClick={() => pick(t[0])}>{t[1]}<small data-ncount={t[0] === "note" ? "" : undefined}>{t[2]}</small></button>)}</div>
          <div className={"vt-pane" + (tab === "toc" ? " on" : "")} data-pane="toc">
            {(x.p.curriculum || []).map((c, ci) => <div key={ci} className="vt-sch"><p className="vt-sch-h"><span>{String(ci + 1).padStart(2, "0")}</span>{c.title}</p>{(c.lessons || []).map((l) => { const d = !!nx.pr.done[l.id], on = l.id === cur.id, nc = X.notesOf(pid, l.id).length, fr = V().freshTag ? V().freshTag(l) : ""; return (
              <a key={l.id} href={X.learnHref(pid, l.id)} className={"vt-ls" + (on ? " on" : "") + (d ? " done" : "")}><i>{d ? <Icon n="check" c="xs" /> : on ? <Icon n="play" c="xs" /> : null}</i><span>{l.title}{fr ? <RawOne html={fr} /> : null}</span><em><span data-lnc="">{nc ? <><Icon n="pen" c="xs" />{nc}</> : null}</span>{(l.files || []).length ? <Icon n="paperclip" c="xs" /> : null}</em><RawOne html={"<small>" + V().lLen(l) + "</small>"} /></a>); })}</div>)}
            {allDone ? <div className="vt-fin"><span className="vt-fin-ic"><Icon n="award" c="lg" /></span><small>COURSE COMPLETE</small><b>강의를 모두 들었어요!</b><p>{x.p.title} · {lz.length}강 완강. 끝까지 해낸 {S.me.name || ""}님, 정말 멋져요.</p>
              <div className="vt-fin-a"><a className="btn btn-primary btn-sm" href="#/vod/my/reviews"><Icon n="star" c="sm" />수강 후기 남기기</a><a className="btn btn-secondary btn-sm" href={X.learnHref(pid, lz[0].id)}>처음부터 다시 보기</a></div></div>
              : <div className="vt-prog"><div className="vt-prog-h"><b>내 진도</b><span>{nx.doneN} / {lz.length}강</span></div><div className="vt-prog-bar"><i style={{ width: pc + "%" }} /></div>
                <div className="vt-prog-n"><span><b>{pc}%</b> 완료</span><span>남은 시간 약 {leftMin >= 60 ? Math.floor(leftMin / 60) + "시간 " + (leftMin % 60 ? (leftMin % 60) + "분" : "") : leftMin + "분"}</span></div>
                {next ? <a className="vt-prog-next" href={X.learnHref(pid, next.id)}><small>다음 강의</small><b>{next.title}</b><Icon n="chevRight" c="xs" /></a> : null}</div>}
          </div>
          <div className={"vt-pane" + (tab === "note" ? " on" : "")} data-pane="note">
            <NoteForm key={gen} pid={pid} lid={cur.id} />
            <div className="vt-nf" id="vt-nf"><Filters list={ns} onPick={() => redraw()} /></div>
            <ul className="vt-nl" id="vt-nl">{shown.length ? shown.map((t) => <NoteItem key={t.id + ":" + n} nt={t} pid={pid} link={false} {...ui} />)
              : <li className="vt-nl-empty"><Icon n="pen" /><b>{ns.length ? "이 종류의 노트가 없어요" : "이 강의의 첫 노트를 남겨 보세요"}</b><small>시간을 함께 저장하면 나중에 그 장면으로 바로 돌아갈 수 있어요.</small></li>}</ul>
            <div className="vt-nfoot"><a href="#/vodclass/notes"><Icon n="book" c="xs" />전체 노트 보기</a><button type="button" data-action="vt-note-dl" data-p={pid} onClick={() => X.noteDl(pid)}><Icon n="download" c="xs" />이 강의 노트 내려받기</button></div>
          </div>
          <div className={"vt-pane" + (tab === "files" ? " on" : "")} data-pane="files">{withFiles.length ? withFiles.map((l) => <div key={l.id} className="vt-fg"><a className={"vt-fg-h" + (l.id === cur.id ? " on" : "")} href={X.learnHref(pid, l.id)}><Icon n="circlePlay" c="xs" />{l.title}</a><RawOne html={X.vtFiles(l.files)} onClick={matDelegate} /></div>) : <p className="vt-empty">이 강의에는 아직 수업 자료가 없어요.</p>}</div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- 내 노트 (모든 VOD 강의 노트) ---------- */
function VodNotes({ n }) {
  const X = DGA(), list = X.vodList(), [, force] = useState(0), ui = useNoteUi(n), q = X.vtQ().trim().toLowerCase(), f = X.vtFilter();
  const all = list.reduce((a, x) => a.concat(X.notesAll(x.p.id)), []);
  const groups = list.map((x) => ({ x, ns: X.notesAll(x.p.id).filter((t) => (f === "all" || t.tag === f) && (!q || t.text.toLowerCase().indexOf(q) >= 0)) })).filter((g) => g.ns.length);
  return (
    <div className="page vn"><PageHead title="내 노트" sub="강의를 들으며 남긴 노트를 한 곳에서 봐요. 시간을 누르면 그 장면부터 다시 재생돼요." />
      <section className="card vn-bar"><div className="search"><Icon n="search" /><input className="input" id="vn-q" type="search" placeholder="노트 검색 (예: 통관, 프롬프트)" defaultValue={X.vtQ()} aria-label="노트 검색" onInput={(e) => { X.vtQ(e.currentTarget.value); force((k) => k + 1); }} /></div>
        <div className="vn-row"><div className="vt-nf"><Filters list={all} onPick={() => redraw()} /></div><div className="vn-acts"><button type="button" className="btn btn-secondary btn-sm" data-action="vt-note-dl" data-p="all" onClick={() => X.noteDl("all")}><Icon n="download" c="sm" />내려받기</button><button type="button" className="btn btn-secondary btn-sm" data-action="vt-note-copy" onClick={() => X.noteCopy()}><Icon n="file" c="sm" />복사</button><button type="button" className="btn btn-secondary btn-sm" data-action="vt-print" onClick={(e) => X.notePrint(e.currentTarget)}><Icon n="download" c="sm" />PDF로 저장</button></div></div></section>
      {groups.length ? groups.map((g) => { const lz = V().lessons(g.x.p); return (
        <section key={g.x.p.id} className="card vn-c"><div className="vn-c-h"><RawOne html={'<span class="vn-th">' + V().thumbArt(g.x.p) + "</span>"} /><div><small>{g.x.p.creator}</small><h2>{g.x.p.title}</h2><span className="tiny">노트 {g.ns.length}개</span></div></div>
          {lz.filter((l) => g.ns.some((t) => t.lid === l.id)).map((l) => <div key={l.id} className="vn-l"><a className="vn-l-h" href={X.learnHref(g.x.p.id, l.id)}><Icon n="circlePlay" c="xs" />{l.title}</a><ul className="vt-nl">{g.ns.filter((t) => t.lid === l.id).sort(X.byTime).map((t) => <NoteItem key={t.id + ":" + n} nt={t} pid={g.x.p.id} link {...ui} />)}</ul></div>)}</section>); })
        : <section className="card"><Empty ic="pen">{q || f !== "all" ? "조건에 맞는 노트가 없어요." : "아직 남긴 노트가 없어요. 강의실에서 영상을 보며 ‘메모하기’를 눌러 보세요."}</Empty></section>}
    </div>
  );
}

/* ---------- 강의 목록 ---------- */
function VodList() {
  const X = DGA(), S = st(), DB = DBX(), list = X.vodList(), me = S.me, P = V();
  const head = <PageHead title={X.ML("vodclass")} sub={"DOOGO CLASS에서 구매한 " + S.INS.displayName + " 강사님의 VOD예요. 강의를 누르면 이 강의실에서 바로 재생되고, 진도는 DOOGO CLASS 마이페이지에도 똑같이 반영돼요."} />;
  const exp = me && me.vodMid && P.canRebuy ? P.products().filter((p) => p.iid === S.INS.id && !list.some((v) => v.p.id === p.id) && P.canRebuy(me.vodMid, p.id)) : [];
  const expBox = exp.length ? <section className="card vc-exp"><div className="section-head"><h2><Icon n="clock" c="sm" /> 기간이 끝난 강의</h2></div>{exp.map((p) => <div key={p.id} className="vc-exp-row"><RawOne html={'<span class="vc-th">' + P.thumbArt(p) + "</span>"} /><div><b>{p.title}</b><small>진도 · 노트는 그대로 남아 있어요 · 다시 들으면 재수강 {P.rebuySet().pct}% 할인</small></div><a className="btn btn-primary btn-sm" href={"#/vod/p/" + p.id}><Icon n="refresh" c="sm" />재수강 할인으로 다시 듣기</a></div>)}</section> : null;
  if (!list.length) return <div className="page">{head}{expBox || <section className="card"><Empty ic="circlePlay">볼 수 있는 VOD가 없어요.</Empty></section>}</div>;
  return (
    <div className="page">{head}{list.map((x) => {
      const nx = X.vodNext(x), pc = X.vodPctOf(x), u = P.lastUpd ? P.lastUpd(x.p) : null, c = u ? P.freshCnt(nx.lz) : null;
      return (
        <section key={x.p.id} className="card vc-card" id={"vc-" + x.p.id}><div className="vc-head"><RawOne html={'<span class="vc-th">' + P.thumbArt(x.p) + "</span>"} /><div className="vc-meta"><small>{x.p.creator} · 강의 {nx.lz.length}개 · {P.durTxt(P.totalMin(x.p))}</small><h2>{x.p.title}</h2><Progress pct={pc} thin />
          <p className="tiny">진도율 <b>{pc}%</b> · {nx.doneN} / {nx.lz.length}강 · {X.vodExp(x)}</p>
          {u && DB.date.diffDays(DB.date.todayStr(), u.at) <= 90 ? <p className="vc-fresh"><Icon n="refresh" c="xs" /><b>{P.ymTxt(u.at)} 업데이트</b>{(c.n ? " · 새 강의 " + c.n + "개" : "") + (c.u ? " · 다시 찍은 강의 " + c.u + "개" : "") + (u.title ? " — " + u.title : "")}</p> : null}
          <a className="btn btn-primary btn-sm" href={X.learnHref(x.p.id, nx.cur ? nx.cur.id : "")}><Icon n="play" c="sm" />{nx.cur ? (nx.doneN ? "이어 보기" : "1강부터 보기") : "다시 보기"}</a></div></div>
          {(x.p.curriculum || []).map((ch, ci) => { const ls = ch.lessons || [], dn = ls.filter((l) => nx.pr.done[l.id]).length; return (
            <div key={ci} className="vc-ch"><h3>{ch.title}<small>{dn} / {ls.length}</small></h3><ol>{ls.map((l) => { const dd = !!nx.pr.done[l.id], now = nx.cur && nx.cur.id === l.id, fr = P.freshTag ? P.freshTag(l) : ""; return (
              <li key={l.id} className={(dd ? "done" : "") + (now ? " now" : "")}><a href={X.learnHref(x.p.id, l.id)}><i>{dd ? <Icon n="check" c="xs" /> : <Icon n="play" c="xs" />}</i><span>{l.title}{fr ? <RawOne html={fr} /> : null}{now ? <em className="vc-now">{nx.doneN ? "이어 보기" : "여기부터"}</em> : null}</span>
                {(l.files || []).length ? <small className="vc-att"><Icon n="paperclip" c="xs" />{(l.files || []).length}</small> : null}<RawOne html={"<small>" + P.lLen(l) + "</small>"} /></a></li>); })}</ol></div>); })}
        </section>
      );
    })}<p className="tiny vc-foot"><Icon n="store" c="xs" /> 구매 내역 · 영수증 · 다른 강의는 <a href="#/vod/my/classes">DOOGO CLASS 내 강의실</a>에서 볼 수 있어요.</p></div>
  );
}

export default function VodClassPage({ r, n }) {
  if (r.parts[1] === "notes") return <VodNotes n={n} />;
  if (r.parts[1]) { const pid = decodeURIComponent(r.parts[1]), lid = r.parts[2] ? decodeURIComponent(r.parts[2]) : "", t = Number(r.params.get("t")) || 0; return <VodPlay key={pid + "/" + lid + "?" + t} pid={pid} lid={lid} tq={t} n={n} />; }
  return <VodList />;
}
