"use client";
/* 강사센터 기본 정보 · 색상 · AI 조교 #/center/brand — 수강생 화면 색 · 브랜드 · 강사 프로필 사진 · 로그인 문구 · 메인 강의 · 강의 운영 · 오늘의 한마디
 * 예전 admin.js pageBrand 를 React 로 (Next.js 전환 6단계)
 *  · 저장(폼 brand-form) · 색 고르기 미리보기 · 사진 올리기/지우기는 예전 admin.js 이벤트가 그대로 받아요 — 색 고르기 · 사진 칸은 예전 HTML 그대로 (그 안을 예전 코드가 바꿔요) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Isl } from "./bits.jsx";

function F({ k, label, v, hint, type }) {
  return <div className="a-field"><label htmlFor={"bf-" + k}>{label}</label>
    {type === "textarea" ? <textarea className="a-input" id={"bf-" + k} name={k} rows="3" defaultValue={v} /> : <input className="a-input" id={"bf-" + k} name={k} defaultValue={v} type={type || undefined} />}
    {hint ? <small className="a-muted">{hint}</small> : null}</div>;
}
const Row = ({ children }) => <div className="a-form-row">{children}</div>;
const Sub = ({ children, id }) => <h2 className="a-sub" id={id}>{children}</h2>;
const Lead = ({ children }) => <p className="a-muted" style={{ margin: "-6px 0 0" }}>{children}</p>;

export default function Brand({ n }) {
  const A = ADM(), DB = DBX(), c = A.C(), b = c.brand, ml = b.mainLec || {};
  return <>
    <Head title={"기본 정보 · 색상 · AI 조교" + (A.TRK() === "vod" ? " · LIVE · VOD 함께" : "")} sub="수강생 화면의 색상, 상단 이름, 로그인 화면 문구, AI 조교 이름을 정해요." />
    {/* 다시 그릴 때(저장 뒤)마다 예전처럼 저장된 값으로 새로 */}
    <form key={n} id="brand-form" className="a-card a-form">
      <Sub>수강생 화면 색상</Sub><Lead>수강생 로그인 화면과 학습 화면 전체가 이 색으로 바뀌어요. 강사센터는 늘 파란색이에요.</Lead><Isl html={A.themePicker(b.theme, "theme", A.IID())} />
      <Sub>브랜드</Sub><Row><F k="name" label="브랜드 이름" v={b.name} hint="로그인 화면 왼쪽 위·상단 작은 글씨" /><F k="instructor" label="강사 표시 이름" v={b.instructor} hint="공지·수료증 서명·AI 조교 인사말에 쓰여요" /></Row>
      <F k="courseTitle" label="강의 이름" v={b.courseTitle} hint="수강생 화면 맨 위 제목" />
      <Row><F k="shortTitle" label="짧은 강의 이름" v={b.shortTitle} hint="로그인 화면 배지" /><F k="tagline" label="한 줄 소개" v={b.tagline} /></Row>
      <Sub>강사 프로필</Sub><Lead>두잉고 첫 화면의 ‘지금 강의하는 강사님’ 카드에 보여요. 배경을 지운(투명) 사진이나 밝은 배경의 상반신 사진이 잘 어울려요.</Lead>
      <div className="a-brand-photo"><Isl html={'<div class="a-brand-photo-box" id="brand-photo-box">' + A.brandPhotoBox(b.photo) + "</div>"} /><div className="a-brand-photo-ctl">
        <label className="a-btn a-btn-ghost a-btn-sm"><Icon n="image" c="sm" />사진 올리기<input type="file" accept="image/*" className="sr-only" id="brand-photo-file" /></label>
        <Btn action="brand-photo-del" cls="a-btn-ghost a-btn-sm"><Icon n="trash" c="sm" />지우기</Btn><small className="a-muted">세로 4:5 비율로 보여요. 올리거나 지우면 바로 저장돼요.</small></div></div>
      <Row><F k="field" label="강의 분야" v={b.field || ""} hint="카드에서 이름 아래 작게 (예: 뉴질랜드 건기식 브랜딩)" /><F k="instagram" label="인스타그램 주소" v={b.instagram || ""} hint="카드에 아이콘으로 연결돼요" type="url" /></Row>
      <Sub>로그인 화면</Sub>
      <F k="loginEyebrow" label="헤드라인 위 작은 글씨" v={b.loginEyebrow} hint="영문 대문자로 적으면 잘 어울려요 (예: DOINGGO)" />
      <F k="loginHeadline" label="헤드라인 (두 줄까지, 줄바꿈 가능)" v={b.loginHeadline} hint="마지막 줄은 고른 색으로 강조돼요" type="textarea" />
      <F k="loginSub" label="헤드라인 아래 설명" v={b.loginSub} hint="" type="textarea" />
      <Row><F k="youtubeChannel" label="유튜브 채널 주소" v={b.youtubeChannel} hint="" type="url" /><F k="freeCourseUrl" label="무료 강의 · 소개 페이지 주소" v={b.freeCourseUrl} hint="" type="url" /></Row>
      <Sub id="bf-main">메인 강의 (외부 강의 플랫폼)</Sub><Lead>메인 강의 · 라이브 녹화본을 아이비클래스 같은 다른 플랫폼에서 운영한다면, 수강생 홈 · 주차별 강의 · 보충 강의 화면에 이 버튼이 떠요. 주차마다 다른 링크는 커리큘럼 › 주차 수정에서 넣을 수 있어요.</Lead>
      <label className="a-check"><input type="checkbox" name="mlOn" defaultChecked={!!ml.on} /><span>수강생 화면에 <b>메인 강의 들으러 가기</b> 버튼 보이기</span></label>
      <Row><F k="mlPlatform" label="플랫폼 이름" v={ml.platform || ""} hint="예: 아이비클래스" /><F k="mlLabel" label="버튼 글씨" v={ml.label || "메인 강의 들으러 가기"} /></Row>
      <F k="mlUrl" label="메인 강의 링크 (URL)" v={ml.url || ""} hint="수강생이 누르면 새 창으로 열려요" type="url" />
      <F k="mlNote" label="안내 한 줄" v={ml.note || ""} hint="수강생 홈 카드에 보여요" />
      <Row><F k="lessonLabel" label="주차별 짧은 영상 이름" v={b.lessonLabel || ""} hint="비우면 ‘강의 영상’ · 예: 따라하기 영상" /></Row>
      <Sub>강의 운영</Sub><Row><F k="liveTime" label="주차 강의 오픈 시간" v={b.liveTime} hint="강의 일정의 ‘강의 오픈’ 옆에 표시" type="time" /><F k="botName" label="AI 조교 이름" v={b.botName} hint={"수강생 메뉴와 대화창 이름 (예: " + DB.botNameOf(b.instructor) + ")"} /></Row>
      <Row><F k="liveUrl" label="주차 강의 입장 링크 (줌 등)" v={b.liveUrl || ""} hint="넣으면 강의 오픈일에 수강생 홈·일정에 ‘입장하기’ 버튼이 생겨요" type="url" /><F k="kakaoChannel" label="카카오톡 문의 주소" v={b.kakaoChannel || ""} hint="오픈채팅·채널 주소. 수강생 왼쪽 메뉴 아래에 ‘카카오톡 문의’ 버튼이 생겨요" type="url" /></Row>
      <label className="a-check"><input type="checkbox" name="worldClock" defaultChecked={!!b.worldClock} /><span>수강생 화면 위에 <b>한국 · 뉴질랜드 현재 시간</b> 보이기 <small className="a-muted">(뉴질랜드 서머타임 자동 반영)</small></span></label>
      <F k="quotes" label="오늘의 한마디 (한 줄에 하나)" v={(c.quotes || []).join("\n")} hint="홈·응원 영상 화면에 날마다 돌아가며 보여요" type="textarea" />
      <div className="a-form-foot"><button className="a-btn a-btn-primary" type="submit">저장</button></div>
    </form>
  </>;
}
