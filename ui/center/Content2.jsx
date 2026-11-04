"use client";
/* 강사센터 수강생 화면 콘텐츠 (2) — 코치 관리 · 제휴 혜택 · 강의 자료함 · 응원 영상 · 라이브 다시보기 · 모범 과제 · 용어 사전 · 학습 노트 질문
 * 예전 admin.js pageCoaches · pagePartners · pageLibrary · pageMotivation · pageReplays · pageShowcase · pageGlossary · pageNotePrompts · editRow 를 React 로 (Next.js 전환 6단계)
 *  · 추가 · 수정 · 옮기기 · 탭 · 붙여넣기 · 코치 추가/수정은 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl, fmtMD, fmtStamp } from "./bits.jsx";
import { AddBtn, SimpleList } from "./Content.jsx";

const Main = ({ b, s }) => <div className="a-item-main"><b>{b}</b><small>{s}</small></div>;
const vodTag = () => (ADM().TRK() === "vod" ? " · VOD 버전" : "");
/** 수정만 있는 줄 (예전 editRow) */
const EditRow = ({ coll, it, children }) => <li>{children}<div className="a-row-actions"><Btn action="item-edit" cls="a-btn-ghost a-btn-sm" data-coll={coll} data-id={it.id}><Icon n="pen" c="sm" />수정</Btn></div></li>;
const Yt = ({ it }) => <Isl html={ADM().ytBadge(it)} />;

export function Coaches() {
  const A = ADM(), iid = A.IID(), list = DBX().coachesOf(iid), add = <Btn action="coach-add" cls="a-btn-primary"><Icon n="userPlus" c="sm" />코치 추가</Btn>;
  return <>
    <Head title="코치 관리" sub={<>코치는 강사센터 로그인 화면의 <b>‘코치’ 탭</b>에서 이름 + 전화번호 뒷자리로 로그인해요. 코치마다 <b>담당 두잉고(LIVE · VOD)</b>와 볼 수 있는 메뉴를 정해 주면, 그 메뉴만 보이고 나머지는 들어갈 수 없어요.</>} right={add} />
    <div className="a-ctrack-guide">
      <div><b><span className="a-ct-tag live">LIVE 두잉고</span> 코치</b><small>기수 · 주차 · 과제로 운영하는 프로그램 — 수강생 관리 · 과제 검수 · 1:1 요청 답변 · 강의실 꾸미기</small></div>
      <div><b><span className="a-ct-tag vod">VOD 두잉고</span> 코치</b><small>DOOGO CLASS에서 VOD를 산 수강생 — 1:1 코칭 답변 · TEA TIME · 매출 보기 · VOD 강의실 꾸미기 (강사님 대신 직원이 맡을 때)</small></div>
    </div>
    <section className="a-card">{list.length ? <ul className="a-items a-coach-list">{list.map((x) => {
      const st = A.coachStats(iid, x.id), tp = A.TRACK_PILL[window.COACH.trackOf(x)];
      return (
        <li key={x.id}><span className="a-avatar a-coach-av">{x.name.slice(0, 1)}</span><div className="a-item-main"><b>{x.name} 코치 <span className="a-muted num">· 뒷자리 {x.phone4}</span> <Pill cls={tp[1]}>{tp[0]}</Pill></b>
          <small>{[x.memo, "검수 " + st.rv + "건 · 답변 " + st.an + "건", x.lastLoginAt ? "최근 접속 " + fmtStamp(x.lastLoginAt) : "아직 접속 전"].filter(Boolean).join(" · ")}</small>
          <Isl html={'<span class="a-coach-perms">' + A.coachPermChips(x) + "</span>"} /></div>
          {x.status === "active" ? <Pill cls="ok">사용 중</Pill> : <Pill cls="mute">중지</Pill>}
          <div className="a-row-actions"><Btn action="coach-edit" cls="a-btn-ghost a-btn-sm" data-id={x.id}><Icon n="pen" c="sm" />수정</Btn></div></li>
      );
    })}</ul> : <Empty ic="shieldCheck" extra={add}>아직 코치가 없어요. ‘코치 추가’로 과제 검수 · 문의 답변 · TEA TIME을 도와줄 코치 계정을 만들어 주세요.</Empty>}</section>
    <p className="a-hint"><Icon n="alert" c="xs" /> 코치가 승인 · 보완 요청한 과제와 답변에는 처리한 코치 이름이 남아요. 매출 메뉴는 보기만 할 수 있고, 정산 계좌 · 세금계산서 · 계약 서류는 강사님만 다뤄요. 코치 계정을 잠시 막으려면 ‘중지’로 바꾸면 돼요.</p>
  </>;
}

export function Partners() {
  const A = ADM(), DB = DBX(), c = A.C(), list = DB.partnersOf(c), G = DB.PARTNER_GROUPS;
  return <>
    <Head title={"제휴 혜택" + vodTag()} sub="수강생 메뉴 ‘제휴 혜택’에 탭(전체보기 · 두고그룹 · 제휴사)으로 보여요. ‘맨 위에 크게’를 켠 곳(예: 두고 N카페)은 가장 위에 큰 카드와 ‘제휴 혜택 · 할인 코드 안내’ 띠로 보여요." right={<AddBtn coll="partner" label="제휴처 추가" />} />
    <section className="a-card"><SimpleList coll="partner" items={list} one={(x) => { const lk = DB.channelLook(Object.assign({ type: "other" }, x)); return <>
      <span className="a-ch-ic" style={{ background: lk.color || "var(--m-primary)", color: DB.inkOn(lk.color) }}><Icon n={lk.icon} c="sm" /></span><Main b={x.title} s={[x.tag, x.url || "주소 없음 (‘준비 중’으로 보여요)"].filter(Boolean).join(" · ")} />
      <Pill cls={x.group === "doogo" ? "dark" : "info"}>{(G.find((g) => g.key === x.group) || G[0]).label}</Pill>{x.featured ? <Pill cls="ok">맨 위 크게</Pill> : null}</>; }} empty="제휴처가 없어요. ‘제휴처 추가’로 만들어 주세요." /></section>
    <p className="a-hint"><Icon n="alert" c="xs" /> 순서는 화살표로 바꿀 수 있어요. 메뉴를 숨기려면 ‘메뉴 구성’에서 제휴 혜택을 꺼 주세요. {Array.isArray(c.partners) || A.IID() === "moon" ? "" : "지금은 문대표 기본 구성(강사님 이름으로 바뀜)이 보이고 있어요. 하나라도 수정하면 강사님 것으로 저장돼요."}</p>
  </>;
}

export function Library() {
  const A = ADM(), DB = DBX(), c = A.C(), k = A.ui.libTab, items = c.resources[k], isVideo = k === "vod" || k === "senior", ln = DB.libNoticeOf(c);
  const tabs = [["ebook", "전자책 · 가이드북"], ["file", "자료 파일"], ["vod", "이커머스 실전 VOD"], ["senior", "시니어 기초 가이드"]];
  return <>
    <Head title={"강의 자료함" + vodTag()} sub="수강생 ‘강의 자료함’ 4개 분류에 자료와 영상을 올려요. VOD · 시니어 기초 가이드는 게시판처럼 영상(선택) + 글 + 사진 + 첨부 자료를 한 페이지로 보여 줘요." right={<AddBtn coll={"res-" + k} label={isVideo ? "글 쓰기" : "자료 추가"} />} />
    <section className="a-card a-libnote"><div className="a-card-head"><span className="a-menu-ico"><Icon n="shield" c="sm" /></span><div className="a-grow"><h2>자료실 이용 안내 팝업</h2><p className="a-muted">수강생이 자료실에 들어올 때마다 떠요. ‘{ln.button}’을 눌러야 자료가 보이고, 자료실 화면에는 열람자 이름 · 기수 · 시각이 옅게 표시돼요.</p></div>
      <Btn action="libnote-edit" cls="a-btn-ghost a-btn-sm"><Icon n="pen" c="sm" />문구 수정</Btn></div></section>
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (k === t[0] ? " on" : "")} data-action="lib-tab" data-k={t[0]}>{t[1]} <span className="num">{c.resources[t[0]].length}</span></button>)}</div></div>
      <SimpleList coll={"res-" + k} items={items} one={(it) => <><Main b={it.title} s={[it.meta, it.desc].filter(Boolean).join(" · ")} />{(it.attachments || []).length ? <Pill cls="info">{"첨부 " + it.attachments.length}</Pill> : null}{it.tool ? <Pill cls="info">계산기</Pill> : isVideo ? <Yt it={it} /> : it.url ? <Pill cls="ok">링크 연결됨</Pill> : <Pill cls="mute">준비 중</Pill>}</>} empty="아직 자료가 없어요." /></section>
  </>;
}

export function Motivation() {
  const A = ADM();
  return <>
    <Head title={"응원 영상" + vodTag()} sub="맨 위 영상이 수강생 홈의 ‘오늘의 응원 영상’으로 보여요. 새로 올린 영상은 맨 위에 들어가요. 한마디 문구는 기본 정보에서 고쳐요." right={<AddBtn coll="mv" label="영상 추가" />} />
    <section className="a-card"><SimpleList coll="mv" items={A.C().motivation} one={(it) => <><Main b={it.title} s={[it.minutes, it.date ? fmtMD(it.date) : ""].filter(Boolean).join(" · ")} /><Yt it={it} /></>} empty="응원 영상이 없어요." /></section>
  </>;
}

export function Replays() {
  const A = ADM(), ff = DBX().date.fmtFull, list = (A.C().replays || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return <>
    <Head title="라이브 다시보기" sub="지난 라이브 녹화를 올리면 수강생 ‘라이브 다시보기’에 주차별로 모여요. 영상 아래 ‘핵심 정리’를 적어 두면 다시 찾기 쉬워요." right={<AddBtn coll="replay" label="다시보기 올리기" />} />
    <Isl html={A.menuNote("replays", list.length)} />
    <section className="a-card">{list.length ? <ul className="a-items">{list.map((it) => <EditRow key={it.id} coll="replay" it={it}><Main b={it.title} s={[it.week ? it.week + "주차" : "", it.date ? ff(it.date) : "", it.minutes || ""].filter(Boolean).join(" · ")} /><Yt it={it} />{(it.attachments || []).length ? <Pill cls="info">{"자료 " + it.attachments.length}</Pill> : null}</EditRow>)}</ul>
      : <Empty ic="monitorPlay" extra={<AddBtn coll="replay" label="첫 다시보기 올리기" />}>아직 올린 다시보기가 없어요.</Empty>}</section>
  </>;
}

export function Showcase() {
  const A = ADM(), list = (A.C().showcase || []).slice().sort((a, b) => (Number(a.week) || 99) - (Number(b.week) || 99)), opts = A.missionOpts(), mName = (id) => { const o = opts.find((x) => x[0] === id); return o ? o[1] : ""; };
  return <>
    <Head title="모범 과제" sub={<>잘한 과제를 골라 사진과 코멘트를 올리면 수강생이 보고 따라 할 수 있어요. ‘과제 검수’에서 제출물을 열고 <b>모범 과제로 올리기</b>를 눌러도 바로 만들어져요.</>} right={<AddBtn coll="showcase" label="모범 과제 추가" />} />
    <Isl html={A.menuNote("showcase", list.length)} />
    <section className="a-card">{list.length ? <ul className="a-items">{list.map((it) => <EditRow key={it.id} coll="showcase" it={it}>
      {(it.images || [])[0] ? <img className="a-sc-thumb" src={it.images[0].data || it.images[0].url} alt="" /> : <span className="a-sc-thumb"><Icon n="trophy" c="sm" /></span>}
      <Main b={it.title} s={[it.week ? it.week + "주차" : "", it.missionId ? mName(it.missionId) : "", it.author || ""].filter(Boolean).join(" · ")} />{(it.images || []).length ? <Pill cls="info">{"사진 " + it.images.length}</Pill> : null}</EditRow>)}</ul>
      : <Empty ic="trophy">아직 모범 과제가 없어요. 과제 검수에서 잘한 제출물을 열고 ‘모범 과제로 올리기’를 눌러 보세요.</Empty>}</section>
  </>;
}

export function Glossary() {
  const A = ADM(), G = A.C().glossary || [], bulk = (cls) => <Btn action="gl-bulk" cls={cls}><Icon n="clipboard" c="sm" />한꺼번에 붙여넣기</Btn>;
  const cats = G.map((g) => g.category || "").filter((c, i, a) => a.indexOf(c) === i).sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b, "ko"));
  return <>
    <Head title={"용어 사전" + vodTag()} sub="강의에 나오는 용어를 쉬운 말로 풀어 두면 수강생 ‘용어 사전’에 가나다 순으로 보이고, AI 조교도 ‘○○가 뭐예요?’에 이 풀이로 답해요." right={<>{bulk("a-btn-outline")}<AddBtn coll="glossary" label="용어 추가" /></>} />
    <Isl html={A.menuNote("glossary", G.length)} />
    {G.length ? cats.map((cat) => { const items = G.filter((g) => (g.category || "") === cat).sort((a, b) => String(a.term).localeCompare(String(b.term), "ko")); return (
      <section key={cat || "_"} className="a-card"><div className="a-card-head"><h2>{cat || "분류 없음"}</h2><span className="a-muted">{items.length}개</span></div>
        <ul className="a-items">{items.map((it) => <EditRow key={it.id} coll="glossary" it={it}><Main b={it.term} s={String(it.desc || "").slice(0, 80)} /></EditRow>)}</ul></section>); })
      : <section className="a-card"><Empty ic="bookA" extra={bulk("a-btn-primary")}>아직 등록한 용어가 없어요.</Empty></section>}
  </>;
}

export function NotePrompts() {
  const A = ADM(), DB = DBX(), c = A.C(), P = c.notePrompts || [], weeks = c.weeks;
  return <>
    <Head title="학습 노트 질문" sub="주차마다 수강생이 스스로 돌아볼 질문을 정해요. 수강생은 ‘학습 노트’에서 답을 적고, 강의 화면에서 쓴 메모도 같이 모여요. 질문을 비워 둔 주차는 기본 질문 3개가 나가요." />
    <Isl html={A.menuNote("notes", 1)} />
    {weeks.length ? weeks.map((w) => { const own = P.filter((x) => Number(x.week) === w.no); return (
      <section key={w.no} className="a-card"><div className="a-card-head"><h2>{w.no}주차 · {w.title}</h2><AddBtn coll="notePrompt" label="질문 추가" ctx={String(w.no)} cls="a-btn-ghost a-btn-sm" /></div>
        {own.length ? <ul className="a-items">{own.map((it, i) => <EditRow key={it.id} coll="notePrompt" it={it}><span className="a-np-no">Q{i + 1}</span><div className="a-item-main"><b>{it.q}</b></div></EditRow>)}</ul>
          : <ul className="a-items a-np-default">{DB.NOTE_PROMPTS.map((q, i) => <li key={i}><span className="a-np-no">Q{i + 1}</span><div className="a-item-main"><span>{q}</span></div><Pill cls="mute">기본 질문</Pill></li>)}</ul>}</section>); })
      : <section className="a-card"><Empty ic="notebookPen">커리큘럼에 주차를 먼저 만들어 주세요.</Empty></section>}
  </>;
}
