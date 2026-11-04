"use client";
/* 강사센터 — 무료강의 페이지 #/center/free · 강사 소개 페이지 #/center/landing
 * 예전 admin.js pageFree · pageLanding (같은 편집 도구 lpDraft) 을 React 로 (Next.js 전환 6단계)
 *  · 적는 칸(data-lp · data-lp-lines · data-lp-check · data-lp-radio · data-lp-img) · 버튼(lp-* · fc-tab · fq-del)은 예전 admin.js 이벤트가 그대로 받아요
 *  · 적는 동안은 다시 그리지 않아요 (예전처럼 아래 ‘저장하지 않은 변경’ 글자만 바꿔요 — 글자 하나짜리 칸이라 React 가 다음에 그릴 때 그대로 덮어써요)
 *  · 버튼으로 다시 그릴 때마다(n) 칸을 지금 편집 중인 값으로 새로 그려요 — 예전 화면이 본문을 통째로 다시 그리던 것과 같은 결과 (줄 지우기 · 되돌리기 · 사진) */
import { Fragment } from "react";
import Icon from "../lib/Icon.jsx";
import { ADM, Btn, Head, Pill, Empty, fmtStamp } from "./bits.jsx";

const get = (o, path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
const TYPE_AT = { url: { type: "url", placeholder: "https://" }, datetime: { type: "datetime-local" }, date: { type: "date" } };

/** 예전 lpField(path, label, type, hint) */
function F({ L, p, label, type, hint }) {
  const v = get(L, p), id = "lp-" + p.replace(/\./g, "-");
  let input;
  if (type === "textarea") input = <textarea className="a-input" id={id} data-lp={p} rows={3} defaultValue={v || ""} />;
  else if (type === "lines") input = <textarea className="a-input" id={id} data-lp-lines={p} rows={4} defaultValue={(v || []).join("\n")} />;
  else if (type === "image") input = <div className="a-lp-img">{v ? <><img src={v} alt="" /><Btn action="lp-img-del" cls="a-btn-ghost a-btn-sm" data-path={p}><Icon n="trash" c="sm" />지우기</Btn></> : <span className="a-muted">아직 사진이 없어요.</span>}
    <label className="a-btn a-btn-ghost a-btn-sm"><Icon n="image" c="sm" />사진 올리기<input type="file" accept="image/*" className="sr-only" data-lp-img={p} /></label></div>;
  else input = <input className="a-input" id={id} data-lp={p} defaultValue={String(v || "")} {...(TYPE_AT[type] || {})} />;
  return <div className="a-field"><label htmlFor={type === "image" ? undefined : id}>{label}</label>{input}{hint ? <small className="a-muted">{hint}</small> : null}</div>;
}
const Row2 = ({ children }) => <div className="a-form-row">{children}</div>;

/** 예전 lpRows(path, cols, addLabel) — 강사 소개 페이지의 줄 목록 (숫자 · 항목 · 후기 · 질문) */
function Rows({ L, p, cols, add }) {
  const list = get(L, p) || [];
  return <div className="a-lp-rows">{list.map((row, i) => { const q = (c) => p + "." + i + "." + c[0], val = (c) => String(row[c[0]] || "");
    return <div key={i} className="a-lp-row">
      {cols.map((c) => c[2] === "select" ? <select key={c[0]} className="a-input a-sm" data-lp={q(c)} aria-label={c[1]} defaultValue={row[c[0]] || c[3][0][0]}>{c[3].map((o) => <option key={o[0]} value={o[0]}>{c[1] + " · " + o[1]}</option>)}</select>
        : c[2] === "datetime" || c[2] === "date" ? <input key={c[0]} className="a-input a-sm" type={c[2] === "date" ? "date" : "datetime-local"} data-lp={q(c)} defaultValue={val(c)} aria-label={c[1]} title={c[1]} />
        : c[2] === "check" ? <label key={c[0]} className="a-check"><input type="checkbox" data-lp-check={q(c)} defaultChecked={!!row[c[0]]} /><span>{c[1]}</span></label>
        : c[2] === "textarea" ? <textarea key={c[0]} className="a-input a-sm" data-lp={q(c)} rows={2} placeholder={c[1]} aria-label={c[1]} defaultValue={val(c)} />
        : <input key={c[0]} className="a-input a-sm" data-lp={q(c)} defaultValue={val(c)} placeholder={c[1]} aria-label={c[1]} />)}
      <div className="a-lp-row-tools"><button type="button" className="a-icon-btn sm" data-action="lp-row-move" data-path={p} data-i={i} data-dir="-1" aria-label="위로" disabled={i === 0}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn sm" data-action="lp-row-del" data-path={p} data-i={i} aria-label="삭제"><Icon n="trash" c="sm" /></button></div></div>; })}
    <Btn action="lp-row-add" cls="a-btn-ghost a-btn-sm" data-path={p} data-cols={cols.map((c) => c[0]).join(",")}><Icon n="plus" c="sm" />{add}</Btn></div>;
}

/** 예전 lpCards(path, fields, addLabel, opts) — 무료강의 페이지의 카드 목록 (자료 · 영상 · 선물 · 질문) */
function Cards({ L, p, fields, add, max, title }) {
  const list = get(L, p) || [];
  return <div className="a-fc-cards">{list.map((row, i) => <div key={i} className="a-fc-card"><div className="a-fc-card-head"><b>{title ? title(i) : (i + 1) + "번"}</b><button type="button" className="a-icon-btn sm" data-action="lp-row-del" data-path={p} data-i={i} aria-label="삭제"><Icon n="trash" c="sm" /></button></div>
    {fields.map((f) => { const q = p + "." + i + "." + f[0], v = row[f[0]];
      if (f[2] === "check") return <label key={f[0]} className="a-check"><input type="checkbox" data-lp-check={q} defaultChecked={!!v} /><span>{f[1]}</span></label>;
      if (f[2] === "select") return <div key={f[0]} className="a-field"><label>{f[1]}</label><div className="a-seg-pick">{f[3].map((o) => <label key={o[0]}><input type="radio" name={q} data-lp-radio={q} value={o[0]} defaultChecked={(v || f[3][0][0]) === o[0]} /><span className={"a-swatch-dot a-sw-" + o[0]}></span>{o[1]}</label>)}</div></div>;
      const input = f[2] === "textarea" ? <textarea className="a-input" data-lp={q} rows={2} defaultValue={String(v || "")} /> : <input className="a-input" data-lp={q} defaultValue={String(v || "")} {...(TYPE_AT[f[2]] || {})} />;
      return <div key={f[0]} className="a-field"><label>{f[1]}</label>{input}{f[3] ? <small className="a-muted">{f[3]}</small> : null}</div>; })}</div>)}
    {!max || list.length < max ? <Btn action="lp-row-add" cls="a-btn-ghost a-btn-sm" data-path={p} data-cols={fields.map((f) => f[0]).join(",")}><Icon n="plus" c="sm" />{add}</Btn> : null}</div>;
}
const More = ({ children }) => <details className="a-more"><summary><Icon n="pen" c="xs" />문구 바꾸기 (선택)</summary><div className="a-more-body">{children}</div></details>;
const FaqImport = ({ six }) => <Btn action="lp-faq-import" cls="a-btn-ghost a-btn-sm"><Icon n="clipboard" c="sm" />{six ? "Q&A 자주 묻는 질문에서 6개 가져오기" : "Q&A 자주 묻는 질문에서 가져오기"}</Btn>;

/** 예전 pubSwitch(on) — 공개 중 / 비공개 */
const PubSwitch = ({ on }) => <div className="a-pub"><button type="button" className={"a-switch a-switch-lg" + (on ? " on" : "")} data-action="lp-pub" role="switch" aria-checked={String(on)} aria-label="페이지 공개"><i></i></button>
  <div><b className={on ? "on" : ""}>{on ? "공개 중" : "비공개"}</b><small>{on ? "누구나 주소로 볼 수 있어요" : "강사님과 마스터만 볼 수 있어요"}</small></div></div>;
/** 맨 위 공개 · 주소 칸 (두 화면 같은 모양) */
const Top = ({ cls, on, url, dirty }) => <section className={"a-card a-lp-top" + (cls ? " " + cls : "")}><PubSwitch on={on} />
  <div className="a-lp-url"><input className="a-input a-sm a-mono" id="lp-url" defaultValue={url} readOnly aria-label="페이지 주소" /><Btn action="lp-copy" cls="a-btn-ghost a-btn-sm"><Icon n="clipboard" c="sm" />주소 복사</Btn></div>
  {dirty ? <p className="a-lp-dirty"><Icon n="alert" c="xs" /> 저장하지 않은 변경이 있어요.</p> : null}</section>;
const SaveBar = ({ dirty }) => <div className="a-lp-savebar"><span className="a-muted">{dirty ? "저장하지 않은 변경이 있어요" : "저장된 상태예요"}</span><Btn action="lp-revert" cls="a-btn-ghost a-btn-sm">변경 취소</Btn><Btn action="lp-save" cls="a-btn-primary"><Icon n="check" c="sm" />저장</Btn></div>;
const HeadRight = ({ href }) => <><a className="a-btn a-btn-outline" href={href}><Icon n="eye" c="sm" />페이지 보기</a><Btn action="lp-save" cls="a-btn-primary"><Icon n="check" c="sm" />저장</Btn></>;

/* ---------------- 무료강의 페이지 (예전 pageFree · freeTabBody) ---------------- */
function FreeTab({ id, L, c }) {
  switch (id) {
    case "schedule": return <F L={L} p="liveAt" label="강의 날짜 · 시간" type="datetime" hint="이 시간까지 남은 시간이 카운트다운으로 보이고, 지나면 ‘LIVE’로 바뀌어요." />;
    case "hero": return <><F L={L} p="hero.title" label="헤드라인 (두 줄, 아래 줄이 강조돼요)" type="textarea" /><F L={L} p="hero.instructor" label="강사 이름" /><F L={L} p="hero.sub" label="설명" type="textarea" />
      <More><F L={L} p="hero.badge" label="맨 위 작은 배지" /><F L={L} p="hero.note" label="작은 안내 문구" /><F L={L} p="company" label="맨 아래 상호 (© 표시)" /></More></>;
    case "intro": return <><F L={L} p="intro.youtube" label="대표 영상 유튜브 주소" type="url" hint="첫 화면 바로 아래에 크게 보여요. 누르면 그 자리에서 재생돼요. 비우면 칸이 숨겨져요." /><F L={L} p="intro.title" label="제목" />
      <More><F L={L} p="intro.desc" label="설명" /><F L={L} p="intro.caption" label="재생 버튼 아래 작은 글" /><F L={L} p="intro.kicker" label="작은 영문 제목" /></More></>;
    // 페이지에는 한 장짜리 간단 카드(배지 · 제목 · 자료 개수 · 오픈채팅 버튼)로 보이고, 자료 목록은 ‘자료 N가지 보기’를 눌러야 펼쳐져요
    case "bonus": return <><p className="a-memo">페이지에는 <b>한 장짜리 간단 카드</b>로 보여요 (작은 글씨 · 제목 · 자료 개수 · 오픈채팅 버튼). 자료 목록은 방문자가 ‘자료 N가지 보기’를 누르면 펼쳐져요. 아예 숨기려면 위 ‘이 칸 페이지에 보이기’를 끄세요.</p>
      <F L={L} p="bonus.title" label="제목 (*별표*로 감싸면 강조색)" /><F L={L} p="bonus.badge" label="제목 위 작은 글씨 (예: 톡방 참여자 전원 공개 예정)" />
      <Cards L={L} p="bonus.items" fields={[["title", "자료 이름"]]} add="자료 추가" max={12} title={(i) => String(i + 1).padStart(2, "0")} /><F L={L} p="bonus.note" label="펼친 목록 아래 안내" /></>;
    case "videos": return <><Cards L={L} p="videos.items" fields={[["youtube", "유튜브 주소", "url"], ["title", "영상 제목"], ["channel", "채널명"]]} add="영상 추가" max={3} title={(i) => ["왼쪽 영상", "가운데 영상", "오른쪽 영상"][i] || (i + 1) + "번 영상"} />
      <More><F L={L} p="videos.title" label="칸 제목" /><F L={L} p="videos.desc" label="칸 설명" /><F L={L} p="videos.kicker" label="작은 영문 제목" /></More></>;
    case "question": return <><F L={L} p="question.url" label="버튼 링크 (구글폼 등)" type="url" hint="비워 두면 이 페이지에서 질문을 받아 ‘받은 질문’에 모아요." /><F L={L} p="question.title" label="제목 (*별표*로 감싸면 강조색 · 예: 문대표의 *사전 미션*)" /><F L={L} p="question.label" label="버튼 글자" />
      <More><F L={L} p="question.desc" label="설명 (줄바꿈 가능)" type="textarea" /><F L={L} p="question.promise" label="강조 문구 (설명 아래 초록 상자 · 비우면 숨김)" type="textarea" /><F L={L} p="question.badge" label="작은 배지" /><F L={L} p="question.note" label="버튼 아래 안내" /></More></>;
    case "gifts": return <><Cards L={L} p="gifts.items" fields={[["title", "전자책 제목"], ["openAt", "공개 날짜 · 시간", "datetime", "이 시간이 되면 자동으로 열려요"], ["url", "전자책 링크", "url"], ["desc", "소개", "textarea"], ["color", "표지", "select", [["blue", "진한 색"], ["cyan", "강사 색"], ["ice", "연한 색"]]], ["forceOpen", "날짜와 상관없이 지금 공개", "check"]]} add="선물 추가" max={6} title={(i) => (i + 1) + "번 선물"} />
      <More><F L={L} p="gifts.title" label="칸 제목" /><F L={L} p="gifts.desc" label="칸 설명" /><F L={L} p="gifts.kicker" label="작은 영문 제목" /></More></>;
    case "kakao": return <><F L={L} p="kakao.url" label="카카오톡 오픈채팅 링크" type="url" hint="노란 ‘오픈채팅방 입장하기’ 버튼을 누르면 이 주소로 가요. 비우면 칸이 숨겨져요." />
      <More><F L={L} p="kakao.title" label="제목" /><F L={L} p="kakao.desc" label="설명" type="textarea" /><F L={L} p="kakao.label" label="버튼 글자" /><F L={L} p="kakao.badge" label="작은 배지" /><F L={L} p="kakao.note" label="버튼 아래 안내" /></More></>;
    case "live": return <><F L={L} p="live.image" label="썸네일 (가로 16:9, 예: 1920×1080)" type="image" /><F L={L} p="live.url" label="무료강의 신청 링크" type="url" />
      <F L={L} p="live.liveTitle" label="강의 제목 (두 줄 가능)" type="textarea" /><F L={L} p="live.summary" label="강의 소개" type="textarea" /><F L={L} p="live.points" label="이런 걸 배워요 (한 줄에 하나)" type="lines" />
      <More><Row2><F L={L} p="live.platform" label="강의 플랫폼 이름" /><F L={L} p="live.tag" label="썸네일 위 배지" /></Row2><F L={L} p="live.platformLogo" label="플랫폼 로고" type="image" /><F L={L} p="live.label" label="신청 버튼 글자" /><F L={L} p="live.note" label="버튼 아래 안내" /><F L={L} p="live.title" label="칸 제목" /><F L={L} p="live.desc" label="칸 설명" /></More></>;
    case "faq": return <><Cards L={L} p="faq.items" fields={[["q", "질문"], ["a", "답변", "textarea"]]} add="질문 추가" title={(i) => "Q" + (i + 1)} /><FaqImport /><More><F L={L} p="faq.title" label="칸 제목" /></More></>;
    case "inbox": { const qs = (c.freeQuestions || []).slice().reverse();
      return qs.length ? <ul className="a-items">{qs.map((q) => <li key={q.id}><div className="a-item-main"><b>{q.text}</b><small>{(q.name || "이름 없음") + " · " + fmtStamp(q.at)}</small></div><Btn action="fq-del" cls="a-btn-ghost a-btn-sm" data-id={q.id} aria-label="삭제"><Icon n="trash" c="sm" /></Btn></li>)}</ul>
        : <Empty ic="message">아직 받은 질문이 없어요. ‘질문 버튼’ 링크를 비워 두면 이 페이지에서 질문을 받아요.</Empty>; }
  }
  return null;
}
export function InsFree({ n }) {
  const A = ADM(), ui = A.ui, DB = window.DB;
  ui.lpKind = "free"; ui.lpHash = window.ROUTE.hash;
  const L = A.lpDraft(), iid = A.IID(), c = A.C(), url = window.ROUTE.abs("#/free/" + iid), T = A.FREE_TABS;
  if (!T.some((x) => x.id === ui.fcTab)) ui.fcTab = "schedule";
  const tab = T.find((x) => x.id === ui.fcTab), nq = (c.freeQuestions || []).length, th = DB.themeOf(c.brand.theme);
  return <Fragment key={n}>
    <Head title="무료강의 페이지" sub="doogo.site와 같은 화면이에요. 왼쪽에서 바꿀 칸을 고르고, 다 고치면 ‘저장’을 눌러 주세요." right={<HeadRight href={"#/free/" + iid} />} />
    <Top cls="a-fc-top" on={L.published} url={url} dirty={ui.lpDirty} />
    {L.liveAt && new Date(L.liveAt).getTime() + 3 * 36e5 < Date.now() ? <div className="a-callout a-callout-warn"><Icon n="alert" c="sm" /><div><b>{"무료강의 날짜(" + String(L.liveAt).replace("T", " ") + ")가 지났어요."}</b> 지금 수강생 화면에는 ‘끝난 강의’로 보이고 신청이 닫혀 있어요. ‘일정’에서 다음 날짜로 바꾸고 저장하면 다시 열려요.</div></div> : null}
    <div className="a-fc-layout"><nav className="a-fc-tabs" aria-label="바꿀 칸">{T.map((x) => { const off = x.sec && L.off[x.sec];
        return <button key={x.id} type="button" className={"a-fc-tab" + (x.id === tab.id ? " on" : "") + (off ? " off" : "")} data-action="fc-tab" data-k={x.id}><span className="a-fc-ic"><Icon n={x.icon} c="sm" /></span><span><b>{x.label}{x.id === "inbox" && nq ? <> <em className="a-count">{nq}</em></> : null}</b><small>{off ? "숨김" : x.desc}</small></span></button>; })}</nav>
      <section className="a-card a-fc-panel" style={{ "--swp": th.primary, "--swpale": th.pale }}><div className="a-fc-panel-head"><div><span className="a-fc-eyebrow">{tab.desc}</span><h2>{tab.label}</h2></div>
          {tab.sec ? <label className="a-fc-show">{L.off[tab.sec] ? "숨김" : "보임"}<button type="button" className={"a-switch" + (L.off[tab.sec] ? "" : " on")} data-action="lp-toggle" data-k={tab.sec} role="switch" aria-checked={String(!L.off[tab.sec])} aria-label="이 칸 페이지에 보이기"><i></i></button></label> : null}</div>
        <div className="a-fc-body"><FreeTab id={tab.id} L={L} c={c} /></div></section></div>
    <SaveBar dirty={ui.lpDirty} />
  </Fragment>;
}

/* ---------------- 강사 소개 페이지 (예전 pageLanding · lpSectionBody · lpSecCards) ---------------- */
function LandSec({ k, L }) {
  switch (k) {
    case "hero": return <><F L={L} p="hero.eyebrow" label="헤드라인 위 작은 글씨" /><F L={L} p="hero.title" label="헤드라인 (줄바꿈 가능, 마지막 줄은 강조)" type="textarea" /><F L={L} p="hero.sub" label="설명" type="textarea" />
      <F L={L} p="hero.ctaLabel" label="신청 버튼 글자" hint="버튼을 누르면 위 ‘신청하기 링크’가 새 창으로 열려요" /><F L={L} p="hero.image" label="오른쪽 사진 (없으면 ‘강사 소개’의 강사 사진)" type="image" /></>;
    case "video": return <><F L={L} p="about.video" label="강사 소개 영상 (유튜브 주소)" type="url" hint="예: https://www.youtube.com/watch?v=… · 비워 두면 무료강의 페이지의 영상 중 하나가 나와요" /><F L={L} p="about.videoTitle" label="영상 제목 (비워 두면 ‘강사 소개 영상’)" /></>;
    case "stats": return <Rows L={L} p="stats" cols={[["value", "숫자 (예: 1,200명)"], ["label", "설명 (예: 누적 수강생)"]]} add="숫자 추가" />;
    case "about": return <><Row2><F L={L} p="about.name" label="이름" /><F L={L} p="about.role" label="한 줄 소개" /></Row2><F L={L} p="about.body" label="소개 글" type="textarea" /><F L={L} p="about.career" label="경력 · 이력 (한 줄에 하나)" type="lines" /><F L={L} p="about.photo" label="강사 사진" type="image" /><F L={L} p="about.title" label="작은 제목" /></>;
    case "points": return <><F L={L} p="points.title" label="제목" /><Rows L={L} p="points.items" cols={[["title", "제목"], ["desc", "설명", "textarea"]]} add="항목 추가" /><F L={L} p="points.forWho" label="이런 분께 추천해요 (한 줄에 하나)" type="lines" /></>;
    case "platform": return <><F L={L} p="platform.title" label="제목" /><F L={L} p="platform.sub" label="설명" /></>;
    case "reviews": return <><F L={L} p="reviews.title" label="제목" /><Rows L={L} p="reviews.items" cols={[["name", "이름 (예: 김*진)"], ["meta", "기수 · 결과 (예: 2기 수료)"], ["text", "후기 내용", "textarea"], ["sample", "예시 표시", "check"]]} add="후기 추가" /></>;
    case "faq": return <><F L={L} p="faq.title" label="제목" /><Rows L={L} p="faq.items" cols={[["q", "질문"], ["a", "답변", "textarea"]]} add="질문 추가" /><FaqImport six /></>;
    case "cta": return <><F L={L} p="cta.title" label="제목" /><F L={L} p="cta.sub" label="설명" /><F L={L} p="cta.label" label="버튼 글자" hint="버튼을 누르면 위 ‘신청하기 링크’가 새 창으로 열려요" /></>;
  }
  return null;
}
export function InsLanding({ n }) {
  const A = ADM(), ui = A.ui, DB = window.DB;
  ui.lpKind = "landing"; ui.lpHash = window.ROUTE.hash;
  const L = A.lpDraft(), iid = A.IID(), url = window.ROUTE.abs("#/p/" + iid), HINT = A.LP_HINT;
  return <Fragment key={n}>
    <Head title="강사 소개 페이지" sub="강사님이 어떤 사람이고 어떤 강의를 하는지 궁금하게 만드는 공개 페이지예요. ‘신청하기’ 버튼은 모두 아래 ‘신청하기 링크’(오픈채팅 · 신청 폼)로 새 창에서 열려요. 배경은 흰색, 버튼과 강조는 수강생 화면 색상을 따라가요." right={<HeadRight href={"#/p/" + iid} />} />
    <Top on={L.published} url={url} dirty={ui.lpDirty} />
    {/* 신청하기 링크 하나 — 첫 화면 · 위 막대 · 마지막 안내 · 휴대폰 아래 막대의 ‘신청하기’가 모두 이 주소를 새 창으로 열어요 */}
    <section className="a-card a-lp-apply"><div className="a-card-head"><h2><Icon n="send" c="sm" /> 신청하기 링크</h2><p className="a-muted">오픈채팅방 · 네이버 폼 · 결제 페이지 등 원하는 주소를 넣으면 페이지의 ‘신청하기’ 버튼이 모두 이 주소로 새 창에서 열려요. 언제든 바꿀 수 있어요.</p></div>
      <F L={L} p="applyUrl" label="신청하기 링크" type="url" hint="비워 두면 카카오톡 문의 주소로 연결되고, 그것도 없으면 신청 버튼이 숨겨져요" /></section>
    <div className="a-stack">{L.order.map((k, i) => { const def = DB.LANDING_SECTIONS.find((x) => x.key === k), on = !L.off[k];
      return <details key={k} className={"a-card a-lp-sec" + (on ? "" : " off")} data-k={k} open={!!ui.lpOpen[k]}><summary>
        <span className="a-lp-move"><button type="button" className="a-icon-btn sm" data-action="lp-move" data-k={k} data-dir="-1" aria-label="위로" disabled={i === 0}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn sm" data-action="lp-move" data-k={k} data-dir="1" aria-label="아래로" disabled={i === L.order.length - 1}><Icon n="arrowDown" c="sm" /></button></span>
        <b>{def.label}</b>{on ? <Pill cls="ok">보임</Pill> : <Pill cls="mute">숨김</Pill>}
        <button type="button" className={"a-vsw" + (on ? " on" : "")} data-action="lp-toggle" data-k={k} role="switch" aria-checked={String(on)} aria-label={def.label + " 보이기"}><i></i></button><Icon n="chevDown" c="sm a-lp-chev" /></summary>
        <div className="a-lp-body">{HINT[k] ? <p className="a-hint" style={{ margin: 0 }}><Icon n="alert" c="xs" /> {HINT[k]}</p> : null}<LandSec k={k} L={L} /></div></details>; })}</div>
    <section className="a-card"><div className="a-card-head"><h2>연락처 · 페이지 맨 아래</h2></div>
      <Row2><F L={L} p="contact.kakao" label="카카오톡 문의 주소" type="url" /><F L={L} p="contact.instagram" label="인스타그램 주소" type="url" /></Row2>
      <Row2><F L={L} p="contact.youtube" label="유튜브 주소" type="url" /><F L={L} p="contact.company" label="상호 (맨 아래 © 표시)" /></Row2>
      <Row2><F L={L} p="contact.email" label="이메일" /><F L={L} p="contact.phone" label="전화번호" /></Row2></section>
    <SaveBar dirty={ui.lpDirty} />
  </Fragment>;
}
