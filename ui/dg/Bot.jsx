"use client";
/* AI 조교 대화 (예전 app.js chatLog · chipRow · chatForm · renderBotFab · pageBot) — 답 고르기 · 서버 묻기 · 저장은 예전 함수 그대로 (DGA.sendChat)
 *  · 질문 칩: 강사 학습 자료에 탭이 있으면 탭으로 (수업 · 과제 | 배송 · 통관 …) · 한 줄 슬라이드 (밀기 · 끌기 · 양옆 화살표) */
import { useEffect, useRef, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, BotFace } from "./bits.jsx";

/** 대화 목록 — 새 말이 오면 맨 아래로 */
export function ChatLog() {
  const X = DGA(), S = st(), esc = DBX().esc, msgs = [X.botGreeting()].concat(S.P.chat || []);
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; });
  return (
    <div className="chat-log" data-chat-log="" ref={ref}>
      {msgs.map((m, i) => {
        const links = (m.links || []).filter(X.linkOk);
        if (m.from === "me") return <div key={i} className="msg me"><div className="msg-bubble">{m.text}{links.length ? <div className="msg-links">{links.map((l, k) => <a key={k} href={l[1]}>{l[0]}</a>)}</div> : null}</div></div>;
        // 조교 답 속 주소는 새 창 링크로 (예전 linkify — 글은 먼저 esc)
        const html = '<div class="msg-bubble">' + X.linkify(esc(m.text)) + (links.length ? '<div class="msg-links">' + links.map((l) => '<a href="' + esc(l[1]) + '">' + esc(l[0]) + "</a>").join("") + "</div>" : "") + "</div>";
        return <div key={i} className="msg"><BotFace size="msg-avatar" /><RawOne html={html} /></div>;
      })}
      {S.botThinking ? <div className="msg"><BotFace size="msg-avatar" /><div className="msg-bubble"><span className="typing-dots"><i /><i /><i /></span></div></div> : null}
    </div>
  );
}

/** 바로 물어볼 질문 칩 줄 */
export function ChipRow({ cls }) {
  const X = DGA(), S = st(), tin = X.tinfo(), tabs = tin ? tin.tabs || [] : [];
  const tab = S.chipTab !== "class" && !tabs[+S.chipTab] ? "class" : S.chipTab;
  const list = tab === "class" ? X.botChips() : tabs[+tab].list;
  const sc = useRef(null), [edge, setEdge] = useState({ p: false, n: false });
  const drag = useRef({ on: false, x: 0, left: 0, moved: false });
  const edges = () => { const el = sc.current; if (!el) return; const max = el.scrollWidth - el.clientWidth, nx = { p: el.scrollLeft > 4, n: el.scrollLeft < max - 4 }; setEdge((e) => (e.p === nx.p && e.n === nx.n ? e : nx)); };
  useEffect(() => {
    edges();
    const mv = (e) => { const d = drag.current; if (!d.on) return; const dx = e.clientX - d.x; if (!d.moved && Math.abs(dx) > 6) { d.moved = true; sc.current.classList.add("dragging"); } if (d.moved) sc.current.scrollLeft = d.left - dx; };
    const up = () => { const d = drag.current; if (!d.on) return; d.on = false; if (sc.current) sc.current.classList.remove("dragging"); setTimeout(() => { d.moved = false; }, 0); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("resize", edges);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("resize", edges); };
  });
  const send = (q) => { if (drag.current.moved) return; X.sendChat(q); };
  const move = (d) => { const el = sc.current; if (el) el.scrollBy({ left: d * Math.max(160, el.clientWidth * 0.7), behavior: "smooth" }); };
  return (
    <div className="chip-wrap" data-chip-wrap={cls}>
      {tabs.length ? <div className="chip-tabs" role="tablist" aria-label="바로 물어볼 질문 분류">{[["class", S.TRACK === "vod" ? "강의 · 수강" : "수업 · 과제"]].concat(tabs.map((x, i) => [String(i), x.title])).map((x) => <button key={x[0]} type="button" role="tab" className={"chip-tab" + (tab === x[0] ? " on" : "")} aria-selected={String(tab === x[0])} data-action="chip-tab" data-k={x[0]} onClick={() => { X.chipSet(x[0]); window.ReactApp.redraw(); }}>{x[1]}</button>)}</div> : null}
      <div className={"chip-rail" + (edge.p ? " can-prev" : "") + (edge.n ? " can-next" : "")}>
        <button type="button" className="chip-nav prev" data-action="chip-nav" data-d="-1" tabIndex={-1} aria-label="앞 질문 보기" onClick={() => move(-1)}><Icon n="chevLeft" c="sm" /></button>
        <div className={cls} data-chip-scroll="" ref={sc} onScroll={edges} onPointerDown={(e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; drag.current = { on: true, x: e.clientX, left: sc.current.scrollLeft, moved: false }; }}>{list.map((c, i) => <button key={i} className="chip" type="button" data-action="chip" data-q={c} onClick={() => send(c)}>{c}</button>)}</div>
        <button type="button" className="chip-nav next" data-action="chip-nav" data-d="1" tabIndex={-1} aria-label="다음 질문 보기" onClick={() => move(1)}><Icon n="chevRight" c="sm" /></button>
      </div>
    </div>
  );
}

/** 질문 칸 */
export function ChatForm({ id }) {
  const submit = (e) => { e.preventDefault(); const q = e.currentTarget.q, v = q.value; q.value = ""; DGA().sendChat(v); q.focus(); };
  return <form className="chat-form" data-chat-form="" onSubmit={submit}><input className="input" name="q" id={id} autoComplete="off" placeholder="궁금한 걸 편하게 적어 보세요" aria-label="질문 입력" /><button className="btn btn-primary chat-send" type="submit" aria-label="보내기"><Icon n="send" c="sm" /><span>보내기</span></button></form>;
}

/** 오른쪽 아래 AI 조교: 닫혀 있으면 말풍선 버튼 · 열면 대화창 (바깥을 눌러도 닫지 않아요 — X 만) */
export function BotFab({ show }) {
  const X = DGA(), S = st(), b = S.D.brand;
  useEffect(() => { if (show) X.tutorInfo(); });
  if (!show) return null;
  const open = () => { X.botSet(true); window.ReactApp.redraw(); setTimeout(() => { const i = document.getElementById("chat-input-fab"); if (i && !window.matchMedia("(max-width: 720px)").matches) i.focus(); }, 0); };
  if (!S.botOpen) return <button className="bot-launch" type="button" data-action="bot-open" aria-label={b.botName + " 열기"} onClick={open}><BotFace /><span className="bl-txt"><small>{b.botName}</small><b>무엇이든 물어보세요</b></span><span className="bl-go"><Icon n="message" c="sm" /></span></button>;
  return <>
    <span className="bp-scrim" aria-hidden="true" />
    <section className="bot-panel" role="dialog" aria-label={b.botName}><span className="bp-grab" aria-hidden="true" /><div className="bp-head"><BotFace size="lg" /><div className="bp-title"><strong>{b.botName}</strong><small><i className="bp-dot" />{b.instructor}님 강의 자료로 답해요 · 24시간</small></div>
      <div className="tools"><a href="#/bot" aria-label="전체 화면으로 보기" title="전체 화면"><Icon n="arrowUpRight" c="sm" /></a><button type="button" data-action="bot-close" aria-label="닫기" title="닫기" onClick={() => { X.botSet(false); window.ReactApp.redraw(); }}><Icon n="x" c="sm" /></button></div></div>
      <ChatLog /><ChipRow cls="chips bp-chips" /><ChatForm id="chat-input-fab" />
      <p className="bp-foot">답변은 참고용이에요 · <button type="button" className="link-btn" data-action="clear-chat" onClick={() => { X.clearChat(); window.ReactApp.redraw(); }}>대화 지우기</button></p></section>
  </>;
}
