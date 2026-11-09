"use client";
/* 두잉고 강의실: 서류 준비 #/docs · 자료실 #/library(/<분류>(/<자료>)) · 마진 계산기(?tool=calculator) · AI 조교 전체 화면 #/bot
 * 예전 app.js pageDocs · pageLibrary · resThumb · pageResDetail · watermark · libNoticeModal · calculator · roasBox · calcMineHtml · pageBot 을 React 로 (Next.js 전환 5단계)
 *  · 체크 · 저장 · 불러오기 · 지우기 · 수업 자료 미리보기/내려받기는 예전 함수 그대로 (DGA.docToggle · saveCalc · calcLoad · calcDel · matClick)
 *  · 자료실에 다른 메뉴에서 들어오면 이용 안내 팝업 (Classroom 이 띄워요 — LibGate) · 화면 위에 열람자 표시(워터마크) */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { DGA, DBX, st, Progress, PctText, Empty, PageHead, Crumb, Pager, Video, BotFace, playDelegate } from "./bits.jsx";
import { NotFound, Attachments } from "./Learn.jsx";
import { ChatLog, ChipRow, ChatForm } from "./Bot.jsx";

const redraw = () => window.ReactApp.redraw();

/* ---------- 서류 준비 ---------- */
export function DocsPage() {
  const X = DGA(), S = st(), D = S.D, P = S.P, G = D.docsGuide, done = G.filter((g) => P.docs[g.id]).length, pct = G.length ? Math.round((done / G.length) * 100) : 0;
  return (
    <div className="page"><PageHead title={X.ML("docs")} sub="판매를 시작하기 전에 챙길 서류와 준비 단계를 하나씩 체크해요." />
      {G.length ? <>
        <section className="card overall"><div className="overall-top"><span>서류 준비</span><PctText pct={pct} /></div><Progress pct={pct} /><span className="tiny" style={{ color: "var(--body)" }}>{G.length}단계 중 {done}단계 완료</span></section>
        <div className="callout callout-warn" style={{ marginTop: "14px" }}><Icon n="alert" /><div>기관 이름·수수료·처리 기간은 바뀔 수 있어요. 신청 전에 각 기관 안내를 꼭 한 번 더 확인해 주세요.</div></div>
        <div className="stack" style={{ marginTop: "14px" }}>{G.map((g, i) => {
          const ok = !!P.docs[g.id];
          return (
            <section key={g.id} className={"card guide-step" + (ok ? " done" : "")}><span className="guide-num">{ok ? <Icon n="check" /> : i + 1}</span><div>
              <h3>{g.title}{ok ? <> <span className="badge badge-positive">준비 완료</span></> : null}</h3>
              <div className="guide-facts">{g.where ? <span><Icon n="mapPin" c="sm" />{g.where}</span> : null}{g.time ? <span><Icon n="clock" c="sm" />{g.time}</span> : null}{g.cost ? <span><Icon n="coins" c="sm" />{g.cost}</span> : null}</div>
              <div className="guide-cols"><div className="guide-box"><h4>필요 서류</h4><ul>{(g.docs || []).map((d, k) => <li key={k}>{d}</li>)}</ul></div><div className="guide-box"><h4>{D.brand.instructor} 팁</h4><ul>{(g.tips || []).map((d, k) => <li key={k}>{d}</li>)}</ul></div></div>
              <div className="guide-actions">{g.url ? <a className="btn btn-tertiary btn-sm" href={g.url} target="_blank" rel="noopener">{(g.where || "사이트").split(" · ")[0]} 바로가기 <Icon n="arrowUpRight" c="xs" /></a> : null}
                <button className={"btn btn-sm " + (ok ? "btn-secondary" : "btn-primary")} data-action="toggle-doc" data-id={g.id} onClick={() => { X.docToggle(g.id); redraw(); }}><Icon n="check" c="sm" />{ok ? "완료 취소" : "준비 완료로 표시"}</button></div>
            </div></section>
          );
        })}</div>
      </> : <section className="card"><Empty ic="clipboard">서류 가이드를 준비하고 있어요.</Empty></section>}
    </div>
  );
}

/* ---------- AI 조교 전체 화면 ---------- */
export function BotPage() {
  const X = DGA(), b = st().D.brand;
  useEffect(() => { X.tutorInfo(); });
  return (
    <div className="page"><PageHead title={b.botName} sub={b.instructor + "님의 강의 자료 · FAQ · 과제 안내를 바탕으로 24시간 답해 드려요."} />
      <section className="chat bot-full"><div className="bp-head"><BotFace size="lg" /><div className="bp-title"><strong>{b.botName}</strong><small><i className="bp-dot" />지금 바로 답할 수 있어요</small></div></div>
        <ChatLog /><ChipRow cls="chips" /><ChatForm id="chat-input-page" /></section>
      <p className="tiny" style={{ marginTop: "12px" }}>{b.botName}의 답변은 참고용이에요. 사업자 · 통관처럼 법이 정한 일은 관할 기관 안내를 꼭 확인해 주세요. <button className="link-btn" style={{ fontSize: "13px" }} data-action="clear-chat" onClick={() => { X.clearChat(); redraw(); }}>대화 지우기</button></p></div>
  );
}
/* ---------- 마진 계산기 ---------- */
const pct = (n) => (isFinite(n) ? Math.round(n).toLocaleString("ko-KR") + "%" : "-");
function Calculator() {
  const X = DGA(), DB = DBX(), c0 = X.calc(), won = X.won;
  // 숫자 칸은 예전처럼 처음 값만 넣어 두고(다시 그리면 그때 값으로) 바꾸는 대로 아래 결과만 새로 계산해요
  const [init] = useState(() => Object.assign({}, c0.vals)), [vals, setVals] = useState(init);
  const r = X.calcOf(vals), mine = c0.mine, editing = mine && c0.items.find((x) => x.id === c0.edit);
  const onInput = (k) => (e) => { const v = e.currentTarget.value; X.calcSet(k, v); setVals((o) => Object.assign({}, o, { [k]: v })); };
  const save = (e) => { e.preventDefault(); X.saveCalc(e.currentTarget); };
  const load = (it) => { if (!X.calcLoad(it.id)) return; redraw(); setTimeout(() => { const c = document.getElementById("calc"); if (c) c.scrollIntoView({ block: "start", behavior: "smooth" }); }, 0); X.toast("‘" + it.name + "’ 숫자를 계산기에 불러왔어요."); };
  const del = (it) => { if (X.calcDel(it.id)) { redraw(); X.toast("지웠어요."); } };
  const fresh = () => { X.calcNew(); redraw(); setTimeout(() => { const n = document.getElementById("c-name"); if (n) n.focus(); }, 0); };
  return <>
    <section className="card" id="calc"><div className="home-video-head"><h2><Icon n="calculator" />마진 계산기</h2><span className="tiny">숫자를 바꾸면 바로 계산돼요</span></div>
      <div className="calc">{X.CALC_F.map((f) => <div key={f[0]} className="field"><label htmlFor={"c-" + f[0]}>{f[1]}</label><div className="input-wrap"><input className="input" id={"c-" + f[0]} data-calc={f[0]} type="number" inputMode="decimal" step="any" min="0" defaultValue={init[f[0]]} onInput={onInput(f[0])} /><span className="input-addon" style={{ pointerEvents: "none" }}>{f[2]}</span></div></div>)}</div>
      <div className="calc-out" id="calc-out">
        <div><span className="stat-label">원가 (상품+배송)</span><div className="stat-value" style={{ fontSize: "22px" }}>{won(r.cost)}</div></div>
        <div><span className="stat-label">수수료 + 광고비</span><div className="stat-value" style={{ fontSize: "22px" }}>{won(r.fees)}</div></div>
        <div className="hl"><span className="stat-label" style={{ color: "#b8bdb2" }}>순이익 · 마진율</span><div className="stat-value" style={{ fontSize: "22px" }}>{won(r.profit) + " · " + r.margin.toFixed(1) + "%"}</div></div>
      </div>
      <div className="calc-roas" id="calc-roas"><RawOne html={X.roasBox(r, vals)} /></div>
      {mine ? <form className="calc-save" id="calc-save" noValidate onSubmit={save}><label htmlFor="c-name"><Icon n="pin" c="sm" />{editing ? "‘" + editing.name + "’ 고치는 중" : "내 제품으로 저장"}</label>
        <div className="calc-save-row"><input className="input" id="c-name" name="name" maxLength="40" placeholder="예: 마누카꿀 UMF10+ 250g" defaultValue={editing ? editing.name : ""} />
          <button className="btn btn-primary" type="submit"><Icon n="check" c="sm" />{editing ? "고친 내용 저장" : "저장"}</button>
          {editing ? <button className="btn btn-secondary" type="button" data-action="calc-new" onClick={fresh}>새 제품으로</button> : null}</div>
        <p className="tiny">위 숫자 그대로 저장돼요. 저장한 제품은 아래 ‘내 제품 마진표’에 모여요.</p></form> : null}
    </section>
    {mine ? <section className="card calc-mine" id="calc-mine"><div className="home-video-head"><h2><Icon n="store" />내 제품 마진표</h2><span className="tiny">{c0.items.length}개 · 나만 볼 수 있어요</span></div>
      {c0.items.length ? <div className="calc-tbl-wrap"><table className="calc-tbl"><thead><tr><th>제품</th><th>판매가</th><th>순이익</th><th>마진율</th><th>지금 광고 ROAS</th><th>최소 광고 ROAS</th><th>상태</th><th /></tr></thead><tbody>
        {c0.items.map((it) => {
          const q = X.calcOf(it.v), ok = !q.lossBase && (q.noAd || q.roas >= q.minRoas), neg = q.profit < 0 ? "neg" : undefined;
          return (
            <tr key={it.id} className={it.id === c0.edit ? "on" : ""}><th scope="row"><b>{it.name}</b><small>{DB.date.fmtMD(DB.date.toStr(new Date(it.at)))} 저장</small></th>
              <td data-l="판매가">{won(q.price)}</td><td data-l="순이익" className={neg || ""}>{won(q.profit)}</td><td data-l="마진율" className={neg || ""}>{q.margin.toFixed(1)}%</td>
              <td data-l="지금 광고 ROAS">{q.noAd ? "광고 안 함" : pct(q.roas)}</td><td data-l="최소 광고 ROAS"><b>{q.lossBase ? "적자" : pct(q.minRoas)}</b></td>
              <td data-l="상태"><span className={"cr-chip " + (ok ? "ok" : "bad")}>{ok ? "남아요" : "손해"}</span></td>
              <td className="act"><button type="button" className="btn btn-tertiary btn-sm" data-action="calc-load" data-id={it.id} onClick={() => load(it)}>불러오기</button><button type="button" className="btn btn-ghost btn-sm" data-action="calc-del" data-id={it.id} aria-label={it.name + " 삭제"} onClick={() => del(it)}><Icon n="trash" c="sm" /></button></td></tr>
          );
        })}</tbody></table></div>
        : <div className="calc-empty"><Icon n="calculator" /><p>위 계산기에 숫자를 넣고 제품 이름을 적어 저장해 보세요.<br />제품마다 마진과 최소 광고 ROAS를 한눈에 비교할 수 있어요.</p></div>}
    </section> : null}
  </>;
}

/* ---------- 자료실 ---------- */
const Warn = () => <div className="callout callout-neg"><Icon n="shield" /><div>본 자료는 <b>유료 수강생 전용</b>입니다. 무단 다운로드·복사·캡처 배포 시 추적·법적 책임이 따릅니다.</div></div>;
/** 수업 자료 목록(예전 HTML) 안의 미리보기 · 내려받기 */
const matDelegate = (e) => { const a = e.target.closest && e.target.closest("[data-action='vt-mat'], [data-action='vt-dl']"); if (a) DGA().matClick(a); };
function ResThumb({ it }) {
  const yid = DBX().youtubeId(it.youtubeId), img = (it.images || [])[0], src = yid ? "https://i.ytimg.com/vi/" + yid + "/hqdefault.jpg" : img ? img.data || img.url : "";
  return <span className="vod-thumb">{src ? <img src={src} alt="" loading="lazy" /> : <span className="vod-ph">{it.title}</span>}{yid ? <span className="vod-play"><Icon n="play" /></span> : null}</span>;
}
function ResDetail({ c, id }) {
  const X = DGA(), S = st(), DB = DBX(), esc = DB.esc, list = S.D.resources[c.id], i = list.findIndex((x) => x.id === id), it = list[i];
  if (!it) return <NotFound />;
  const imgs = it.images || [], used = {}, fig = (im) => '<figure class="n-img"><img src="' + esc(im.data || im.url) + '" alt="' + esc(im.name || "") + '" loading="lazy"></figure>';
  const body = it.body ? DB.rich(it.body, { token: (n) => { const im = imgs[n - 1]; if (!im) return ""; used[n - 1] = true; return fig(im); } }) : "";
  const rest = imgs.filter((_, k) => !used[k]), prev = list[i - 1], next = list[i + 1], yid = DB.vidOk(it.youtubeId);
  return (
    <div className="page"><PageHead title={it.title} sub={[it.meta, it.desc].filter(Boolean).join(" · ")} crumbs={<Crumb items={[[X.ML("library"), "#/library"], [c.label, "#/library/" + c.id], [it.title]]} />} />
      <article className="card res-article">{yid ? <Video item={it} /> : null}
        <RawOne html={'<div class="body">' + body + (rest.length ? '<div class="n-imgs">' + rest.map(fig).join("") + "</div>" : "") + "</div>"} onClick={playDelegate} />
        <Attachments list={it.attachments} />
        {!body && !imgs.length && !yid && !(it.attachments || []).length ? <Empty ic={c.icon}>내용을 준비하고 있어요.</Empty> : null}</article>
      <Pager p={prev ? { href: "#/library/" + c.id + "/" + prev.id, label: "이전 자료", title: prev.title } : null} n={next ? { href: "#/library/" + c.id + "/" + next.id, label: "다음 자료", title: next.title } : null} back={"#/library/" + c.id} />
    </div>
  );
}
function Library({ r, n }) {
  const X = DGA(), S = st(), DB = DBX(), cat = r.parts[1];
  if (!cat) return (
    <div className="page"><PageHead title={X.ML("library")} sub="수강생에게만 열리는 전자책 · 실전 자료 · 강의 영상을 분류별로 모았어요." /><Warn />
      <div className="grid-2" style={{ marginTop: "14px" }}>{X.libList().map((c) => (
        <a key={c.id} className="res-card" href={"#/library/" + c.id}><div className="res-top"><span className={"res-icon " + c.cls}><Icon n={c.icon} /></span><div><div className="res-title">{c.label}</div><div className="tiny">자료 {X.resOf(c.id).length}개</div></div></div>
          <div className="res-desc">{c.desc()}</div><div className="res-foot"><span className="link-btn">열기 <Icon n="arrowRight" c="sm" /></span></div></a>
      ))}</div></div>
  );
  const c = X.libList().find((x) => x.id === cat);
  if (!c) return <NotFound />;
  const head = <PageHead title={c.label} sub={c.desc()} crumbs={<Crumb items={[[X.ML("library"), "#/library"], [c.label]]} />} />;
  if (cat === "lesson") {
    const g = {}, ks = []; X.lessonFiles().forEach((x) => { const k = x.x.p.id + "|" + x.l.id; if (!g[k]) { g[k] = { x: x.x, l: x.l, fs: [] }; ks.push(k); } g[k].fs.push(x.f); });
    return (
      <div className="page">{head}<Warn />
        <div className="stack" style={{ marginTop: "14px" }}>{ks.map((k) => <section key={k} className="card lib-lesson"><div className="lib-lesson-h"><small>{g[k].x.p.title}</small><b>{g[k].l.title}</b><a className="link-btn" href={X.learnHref(g[k].x.p.id, g[k].l.id)}>강의 보기 <Icon n="arrowRight" c="sm" /></a></div><RawOne html={X.vtFiles(g[k].fs)} onClick={matDelegate} /></section>)}</div></div>
    );
  }
  if (r.parts[2]) return <ResDetail key={r.parts[2]} c={c} id={r.parts[2]} />;
  const items = X.resOf(cat), isVideo = cat === "vod" || cat === "senior", showCalc = r.params.get("tool") === "calculator";
  let body;
  if (!items.length) body = <section className="card"><Empty ic={c.icon}>자료를 준비하고 있어요.</Empty></section>;
  else if (isVideo) body = (
    <div className="vod-grid">{items.map((it, i) => (
      <a key={it.id} className="vod-card" href={"#/library/" + cat + "/" + it.id}><ResThumb it={it} />
        <span className="vod-info"><span className="vod-no">{(cat === "senior" ? "가이드 " : "VOD ") + (i + 1)}</span><span className="vod-title">{it.title}</span>{it.desc ? <span className="vod-desc">{it.desc}</span> : null}
          <span className="vod-meta">{it.youtubeId ? <RawOne html={DB.vdur.label(it.youtubeId, it.durSec, "", "vod-len")} /> : null}{it.meta ? <span>{it.meta}</span> : null}{(it.images || []).length ? <span><Icon n="image" c="xs" />사진 {it.images.length}</span> : null}{(it.attachments || []).length ? <span><Icon n="paperclip" c="xs" />첨부 {it.attachments.length}</span> : null}</span></span></a>
    ))}</div>
  );
  else body = items.map((it, i) => {
    const action = it.tool === "calculator" ? <a className="btn btn-primary btn-sm" href="#/library/file?tool=calculator"><Icon n="calculator" c="sm" />계산기 열기</a>
      : it.url ? <a className="btn btn-tertiary btn-sm" href={it.url} target="_blank" rel="noopener"><Icon n={cat === "ebook" ? "book" : "download"} c="sm" />{cat === "ebook" ? "열람" : "다운로드"}</a>
        : <button className="btn btn-secondary btn-sm" data-action="not-ready" onClick={() => X.toast("자료를 준비 중이에요. 곧 알려 드릴게요.")}>준비 중</button>;
    return <div key={it.id || i} className="res-item"><span className={"res-icon " + c.cls}><Icon n={it.tool ? "calculator" : c.icon} /></span><div style={{ minWidth: "0" }}><div className="m-title">{it.title}</div><div className="m-desc">{[it.meta, it.desc].filter(Boolean).join(" · ")}</div></div>{action}</div>;
  });
  // 계산기는 다시 그릴 때마다(예전 render) 그때 숫자로 새로 — n 이 바뀌면 새로 그려요
  return <div className="page">{head}<Warn />{showCalc ? <div style={{ marginTop: "14px" }}><Calculator key={n} /></div> : null}<div style={{ marginTop: "14px" }}>{body}</div></div>;
}
/** 열람자 표시 — 이름 · 기수 · 시각 (예전 watermark) */
function Watermark() {
  const label = DGA().wmLabel();
  return <div className="lib-wm" aria-hidden="true"><div className="lib-wm-in">{Array.from({ length: 40 }, (_, i) => <span key={i}>{label}</span>)}</div></div>;
}
export function LibraryPage({ r, n }) {
  return <><Library r={r} n={n} /><Watermark /></>;
}
/** 자료실 이용 안내 팝업 (다른 메뉴에서 들어올 때마다 · 확인을 눌러야 닫혀요) */
export function LibGate({ onClose }) {
  const n = DGA().libNotice(), DB = DBX(), esc = DB.esc;
  useEffect(() => { const t = setTimeout(() => { const b = document.querySelector("#modal-root .lib-gate-ok"); if (b) b.focus(); }, 30); return () => clearTimeout(t); }, []);
  const box = document.getElementById("modal-root"); if (!box) return null;
  const html = '<div class="lib-gate-body">' + DB.rich(n.intro) + DB.rich(n.items.map((x) => "- " + x).join("\n")) + (n.foot ? '<p class="lib-gate-foot">' + esc(n.foot) + "</p>" : "") + '<button class="btn btn-primary lib-gate-ok" data-action="lib-gate-ok">' + esc(n.button) + "</button></div>";
  const ok = (e) => { if (e.target.closest && e.target.closest(".lib-gate-ok")) onClose(); };
  return createPortal(
    <div className="modal-backdrop lib-gate-back"><div className="modal lib-gate" role="dialog" aria-modal="true" aria-labelledby="lib-gate-title">
      <div className="lib-gate-head"><span className="lib-gate-ico"><Icon n="shieldCheck" /></span><h2 id="lib-gate-title">{n.title}</h2></div>
      <RawOne html={html} onClick={ok} /></div></div>, box);
}
