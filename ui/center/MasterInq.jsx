"use client";
/* 마스터 두잉고 — 강사 입점 문의 #/center/master/partners · 두고 파트너스 지원 #/center/master/vod-recruit
 * 예전 admin.js pageMasterPartners(r, only) 를 React 로 (Next.js 전환 6단계)
 *  · 펼치기 · 처리 상태 · 소개 파트너 · 메모 · 플랫폼 만들기 · 엑셀 · 1:1 대화 보내기는 예전 admin.js 이벤트가 그대로 받아요
 *  · 진행 칸(inqTrack) · 1:1 대화(inqThread) · 처리 기록(inqLogHtml)은 파트너센터와 같이 쓰는 예전 조각
 *  · 펼친 카드가 1.5초 넘게 보이면 예전처럼 파트너 메시지를 읽음으로(markInqSeen) — 메뉴 · 종 숫자는 React 가 다시 그려서 바꿔요 */
import { useEffect } from "react";
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl } from "./bits.jsx";

export function MasterPartners({ only }) {
  const A = ADM(), DB = DBX(), ui = A.ui, isVod = A.inqIsVod, fk = only ? "vrFilter" : "inqFilter", TODO = A.INQ_TODO;
  const all = DB.inquiries().filter((x) => !only || isVod(x)), todo = all.filter((x) => TODO.indexOf(x.status || "new") >= 0);
  const noOf = {}; all.slice().sort((a, b) => (a.at || 0) - (b.at || 0)).forEach((x, i) => { noOf[x.id] = i + 1; });
  let f = ui[fk] || (todo.length ? "todo" : "all");
  const unread = all.filter((x) => A.msgUnreadM(x) > 0);
  if ((f === "msg" && !unread.length) || (only && (f === "aff" || f === "vod"))) f = ui[fk] = "all";
  const shown = all.filter((x) => f === "all" || (f === "todo" ? TODO.indexOf(x.status || "new") >= 0 : f === "msg" ? A.msgUnreadM(x) > 0 : f === "aff" ? !!A.inqAff(x) : f === "vod" ? isVod(x) : (x.status || "new") === f));
  if (f === "todo" || f === "new" || f === "seen" || f === "contact") shown.sort((a, b) => (a.at || 0) - (b.at || 0)); // 처리할 일은 오래된 것부터
  const nextId = (todo.slice().sort((a, b) => (a.at || 0) - (b.at || 0))[0] || {}).id, act = only ? "vr-tab" : "inq-tab";
  const tabs = (unread.length ? [["msg", "새 메시지", unread.reduce((a, x) => a + A.msgUnreadM(x), 0)]] : []).concat([["todo", "처리할 일", todo.length], ["all", "전체", all.length]]).concat(only ? [] : [["aff", "파트너 소개", all.filter((x) => A.inqAff(x)).length], ["vod", "두고 파트너스", all.filter(isVod).length]]);
  const cnt = (k) => all.filter((x) => (x.status || "new") === k).length;
  const ago = (t) => { const d = Math.floor((Date.now() - (t || 0)) / 864e5); return d <= 0 ? "오늘 접수" : d + "일째 기다리는 중"; };
  // 화면에 1.5초 넘게 보인 카드의 파트너 메시지는 읽음으로 (예전처럼 그릴 때마다)
  useEffect(() => { if (!unread.length) return undefined; const t = setTimeout(A.markInqSeen, 300); return () => clearTimeout(t); });
  const latest = unread.map((x) => ({ x, m: (x.thread || []).filter((m) => m.by === "partner").slice(-1)[0] })).sort((a, b) => b.m.at - a.m.at)[0];
  const Card = ({ x }) => {
    const st = A.inqStatus(x), cur = x.status || "new", pa = A.inqAff(x), un = A.msgUnreadM(x), F = x.form || {}, open = ui.inqOpen === x.id, next = x.id === nextId, pt = A.inqIsPt(x);
    const sub = [F.cat, F.topic || String(x.course || "").replace(/^\[[^\]]*\]\s*/, "").split("\n")[0]].filter(Boolean).join(" · ");
    const row = <button type="button" className="a-inq-row" data-action="inq-open" data-id={x.id} aria-expanded={String(open)}>
      <span className="a-inq-no">No.{noOf[x.id]}</span><span className="a-avatar">{(x.name || "?").slice(0, 1)}</span>
      <span className="a-inq-who"><b>{x.name}{F.nick ? <> <small>{F.nick}</small></> : null}</b><small>{sub.slice(0, 90) || "-"}</small></span>
      <span className="a-inq-tags">{next ? <span className="a-pill a-inq-next"><Icon n="arrowRight" c="xs" />다음 차례</span> : null}
        {isVod(x) && !(only && pt) ? <span className="a-pill inq-vod"><Icon n={pt ? "handshake" : "monitorPlay"} c="xs" />{pt ? "두고 파트너스" : "DOOGO CLASS 강사 모집"}</span> : null}
        {x.addTo ? <span className="a-pill inq-add"><Icon n="lock" c="xs" />{"기존 강사 · " + (x.want === "vod" ? "DOOGO CLASS" : "LIVE 두잉고") + " 열기 신청"}</span> : null}
        {pa ? <span className="a-pill p-aff-pill"><Icon n="handshake" c="xs" />{pa.name} 파트너 소개</span> : null}{un ? <span className="a-pill inq-new-msg"><Icon n="bell" c="xs" />새 메시지 {un}</span> : null}<Pill cls={st[2]}>{st[1]}</Pill></span>
      <span className="a-inq-when">{DB.date.fmtStamp(x.at)}<small>{TODO.indexOf(cur) >= 0 ? ago(x.at) : x.ref ? "추천 코드 " + x.ref : ""}</small></span><span className="a-inq-chev"><Icon n="chevDown" c="sm" /></span></button>;
    const cls = "a-inq a-inq2" + (open ? " open" : "") + (next ? " is-next" : "") + (un ? " has-msg" : "");
    if (!open) return <article className={cls} data-inq={x.id}>{row}</article>;
    const ai = x.addTo ? DB.instructor(x.addTo) : null, w = x.want === "vod" ? "vod" : "live", id = { "data-id": x.id };
    return <article className={cls} data-inq={x.id} data-unread={un ? "1" : undefined}>{row}<div className="a-inq-body">
      <Isl html={A.inqTrack(x)} />
      <dl className="a-inq-info"><div><dt>이메일</dt><dd><a href={"mailto:" + (x.email || "")}>{x.email}</a></dd></div><div><dt>연락처</dt><dd><a href={"tel:" + String(x.phone || "").replace(/[^0-9+]/g, "")}>{x.phone}</a></dd></div>
        <div><dt>강의 · 활동하는 곳</dt><dd>{String(x.where || "").replace(/^\[[^\]]*\]\s*/, "") || "-"}</dd></div><div><dt>대표 채널 · 포트폴리오</dt><dd><Isl html={A.inqLink(x.link)} /></dd></div>
        {x.ref || x.byPartner ? <div><dt>추천</dt><dd>{(x.ref ? "추천 코드 " + x.ref : "") + (x.byPartner ? (x.ref ? " · " : "") + "파트너가 직접 추천" : "")}</dd></div> : null}</dl>
      <div className="a-inq-block"><b>어떤 강의인가요</b><p>{x.course}</p></div>
      {x.form ? <div className="a-inq-block a-inq-pt"><b><Icon n="handshake" c="xs" />두고 파트너스 지원서</b><dl className="a-inq-info">{A.inqFormRows(x.form).map((rr, i) => <div key={i} className={rr[2] ? "wide" : undefined}><dt>{rr[0]}</dt><dd><Isl html={rr[1]} /></dd></div>)}</dl></div> : null}
      {x.message ? <div className="a-inq-block"><b>남긴 말</b><p>{x.message}</p></div> : null}
      {pa ? <Isl html={A.inqThread(x, "master")} /> : null}
      <div className="a-inq-proc"><b>처리 상태</b><div className="a-inq-sbs" role="group" aria-label="처리 상태 바꾸기">{A.INQ_STATUS.map((s) => <button key={s[0]} type="button" className={"a-inq-sb " + s[2] + (s[0] === cur ? " on" : "")} data-action="inq-st" data-id={x.id} data-st={s[0]} aria-pressed={String(s[0] === cur)}>{s[0] === cur ? <Icon n="check" c="xs" /> : null}{s[1]}</button>)}</div></div>
      <div className="a-inq-ctl"><div className="a-inq-sels"><label className="a-inq-st"><span>소개 파트너</span><select key={pa ? pa.id : "none"} className="a-input a-sm" data-inq-aff={x.id} defaultValue={pa ? pa.id : "none"}><option value="none">없음</option>{A.affList().map((p) => <option key={p.id} value={p.id}>{p.name + " (" + (p.code || p.loginId) + ")"}</option>)}</select></label></div>
        <textarea key={x.memo || ""} className="a-input" rows={2} data-inq-memo={x.id} placeholder="메모 (예: 11/03 통화 · 다음 주 미팅) — 마스터만 봐요" aria-label="메모" defaultValue={x.memo || ""} />
        <div className="a-row-actions">{x.addTo ? (!ai ? null : DB.tracksOf(ai)[w] ? <Pill cls="ok">{A.TRACK_TAB[w] + " 열림"}</Pill> : cur !== "fail" ? <Btn action="inq-open-track" cls="a-btn-primary a-btn-sm" {...id}><Icon n="lock" c="sm" />{w === "vod" ? "DOOGO CLASS 열어 주기" : "LIVE 두잉고 열어 주기"}</Btn> : null)
          : !x.iid && cur !== "fail" ? <Btn action="inq-make" cls="a-btn-primary a-btn-sm" {...id}><Icon n="store" c="sm" />{isVod(x) ? "VOD 강사로 등록" : "LIVE 플랫폼 만들기"}</Btn> : null}
          <Btn action="inq-memo" cls="a-btn-outline a-btn-sm" {...id}><Icon n="check" c="sm" />메모 저장</Btn><Btn action="inq-del" cls="a-btn-ghost a-btn-sm danger" {...id}><Icon n="trash" c="sm" />삭제</Btn></div></div>
      <Isl html={A.inqLogHtml(x)} /></div></article>;
  };
  const xl = all.length ? <Btn action="inq-xl" cls="a-btn-outline" data-only={only || ""} data-f={f}><Icon n="download" c="sm" />엑셀로 내려받기</Btn> : null;
  return <>
    {only ? <Head title="두고 파트너스 지원" sub="DOOGO CLASS ‘두고 파트너스’ 지원서(www.doogoclass.com/vod/partners)와 예전 ‘강사 모집’ 팝업으로 들어온 지원이 여기에 차곡차곡 쌓여요. 서버에 저장되고 마스터만 봐요. 연락한 뒤 상태를 바꾸고 메모를 남겨 두세요. (메모는 마스터만 봐요)" right={<>{xl}<a className="a-btn a-btn-ghost" href="#/vod/partners" target="_blank" rel="noopener"><Icon n="arrowUpRight" c="sm" />지원 페이지 열기</a></>} />
      : <Head title="강사 입점 문의" sub="두잉고 첫 화면의 ‘강사 입점 문의’와 DOOGO CLASS ‘두고 파트너스’ 지원서로 들어온 신청이에요. 연락한 뒤 상태를 바꾸고 메모를 남겨 두세요. 파트너 추천 링크로 들어온 문의는 상태 · 1:1 대화가 그 파트너의 파트너센터에도 함께 보여요. (메모는 마스터만 봐요)" right={<>{xl}<a className="a-btn a-btn-ghost" href="#/partner" target="_blank" rel="noopener"><Icon n="arrowUpRight" c="sm" />문의 화면 열기</a></>} />}
    {latest ? <div className="inq-alert"><span className="inq-alert-ic"><Icon n="bell" c="sm" /></span><div><b>파트너가 보낸 새 메시지 {unread.reduce((a, x) => a + A.msgUnreadM(x), 0)}건</b><span>{(latest.m.name || "파트너") + " → " + latest.x.name + " 님 문의 · “" + String(latest.m.text).slice(0, 60) + "” · " + DB.date.fmtStamp(latest.m.at)}</span></div><Btn action="inq-jump" cls="a-btn-dark a-btn-sm" data-id={latest.x.id}>바로 보기</Btn></div> : null}
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (f === t[0] ? " on" : "")} data-action={act} data-k={t[0]}>{t[1]} <span className="num">{t[2]}</span></button>)}</div></div>
      <ol className="a-inq-flow" aria-label="처리 단계별 건수">{A.INQ_STATUS.map((s, i) => <li key={s[0]} className={s[2] + (i > 2 ? " end" : "")}><button type="button" className={f === s[0] ? "on" : ""} data-action={act} data-k={s[0]}><small>{i < 3 ? "0" + (i + 1) : i < 5 ? "결과" : "잠시 멈춤"}</small><b>{s[1]}</b><em>{cnt(s[0])}</em></button></li>)}</ol>
      {f === "todo" && shown.length ? <p className="a-inq-hint"><Icon n="help" c="xs" />들어온 순서대로 위에서부터 처리해 주세요. 줄을 누르면 지원서가 펼쳐지고, 처음 펼치면 ‘열람’으로 바뀌어요.</p> : null}
      {shown.length ? <div className="a-stack a-inq-list">{shown.map((x) => <Card key={x.id} x={x} />)}</div>
        : <Empty ic="handshake">{f === "all" ? (only ? "아직 들어온 두고 파트너스 지원이 없어요." : "아직 들어온 입점 문의가 없어요.") : f === "todo" ? "처리할 지원이 없어요. 모두 처리했어요!" : f === "msg" ? "안 읽은 파트너 메시지가 없어요." : "이 상태의 지원이 없어요."}</Empty>}</section>
  </>;
}
