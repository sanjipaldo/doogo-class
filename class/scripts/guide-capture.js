/* 두잉고 사용법 영상 — 실제 화면을 단계마다 찍어 영상 자료(guide-data.js + assets/guide/*.webp)를 만들어요.
 *
 *   1) 새 데이터베이스로 개발 서버를 켜요 (찍는 동안 예시 데이터가 바뀌어요 — 운영 데이터에는 절대 돌리지 마세요)
 *        CLASS_SQLITE=/tmp/guide.db MASTER_PASSWORD=test1234 SESSION_SECRET=x VOD_SERVER_AUTH=1 node scripts/dev-server.js 4480
 *   2) node scripts/guide-capture.js 4480            (전부)
 *      node scripts/guide-capture.js 4480 i-cohort  (한 편만 다시 — 나머지 자료는 그대로)
 *
 * 영상 한 편 = 단계 여러 개. 단계마다: (필요하면 이동 · 미리 채우기) → 누를 곳(t)을 화면 가운데로 → 화면 찍기 → 누르기/채우기.
 * 플레이어(guide.js)가 이 사진 위에서 화면을 누를 곳으로 확대해 따라가고, 마우스가 움직여 누르고, 아래 자막을 보여 줘요.
 * 자막의 [대괄호] 글자는 빨간 강조로 보여요. 실명은 찍기 전에 가려요(MASK). 화면이 바뀌면 이 파일의 단계만 고치고 다시 찍으면 돼요. */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PORT = process.argv[2] || "4480", ONLY = process.argv[3] || "";
const B = "http://localhost:" + PORT + "/";
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "guide");
const DATA = path.join(ROOT, "guide-data.js");
const MASK = [["문원오", "문대표"]];
const PC = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/* 찾기: 글자(text)가 들어 있고 sel 에 맞는 보이는 요소. 팝업이 열려 있으면 팝업 안에서 먼저 찾아요 (scope: "doc" 이면 화면 전체) */
const side = (text) => ({ sel: ".a-side a, .a-nav a, nav a", text, scope: "doc" });
const btn = (text, more) => Object.assign({ sel: "button, a", text }, more || {});
const nm = (name, more) => Object.assign({ sel: '[name="' + name + '"]' }, more || {});
const act = (a) => ({ sel: '[data-action="' + a + '"]' });

/* ---------- 강사 버전 (PC 1280×800) ---------- */
const INS = [
  { title: "첫 세팅", items: [
    { id: "i-brand", icon: "palette", title: "기본 정보 · 색상 · AI 조교", sub: "강사센터 › 기본 정보 · 색상 · AI 조교", lead: "수강생 화면의 [이름 · 색 · AI 조교]를 정해요", steps: [
      { go: "#/center", t: side("기본 정보 · 색상 · AI 조교"), cap: "왼쪽 메뉴에서 [기본 정보 · 색상 · AI 조교]를 눌러요" },
      { t: nm("name"), cap: "[플랫폼 이름]은 수강생 화면 맨 위에 보여요", act: "none" },
      { t: nm("courseTitle"), cap: "[강의 이름]과 짧은 이름 · 한 줄 소개를 적어요", act: "none" },
      { t: { sel: 'label:has(input[name="theme"][value="coral"])' }, cap: "[수강생 화면 색상]을 고르면 바로 바뀌어요", act: "click" },
      { t: nm("liveTime"), cap: "[라이브 시간]을 넣으면 수강생 홈에 카운트다운이 떠요", act: "none" },
      { t: nm("botName"), cap: "[AI 조교 이름]을 정해요 — 수강생이 밤에도 바로 물어봐요", act: "none" },
      { t: btn("저장", { sel: "button", last: true }), cap: "[저장]을 누르면 수강생 화면에 바로 반영돼요" },
      { t: btn("수강생 화면 보기", { scope: "doc" }), cap: "위쪽 [수강생 화면 보기]로 바뀐 모습을 확인해요", act: "none" }
    ] },
    { id: "i-menus", icon: "menu", title: "수강생 메뉴 구성", sub: "강사센터 › 메뉴 구성", lead: "수강생 왼쪽 메뉴를 [켜고 · 끄고 · 이름 바꾸기]", steps: [
      { go: "#/center", t: side("메뉴 구성"), cap: "왼쪽 메뉴에서 [메뉴 구성]을 눌러요" },
      { t: { sel: ".a-menu-label", nth: 2 }, cap: "메뉴 이름 칸을 눌러 [원하는 이름]으로 바꿔요", act: { fill: "보충 · 특강" } },
      { t: { sel: '[data-action="menu-move"]', nth: 5 }, cap: "[화살표]로 메뉴 순서를 바꿔요" },
      { t: { sel: '[data-action="menu-off"]', nth: 3 }, cap: "안 쓰는 메뉴는 [빼기]로 숨겨요 — 바꾸면 바로 저장돼요" },
      { t: btn("수강생 화면 보기", { sel: '[data-action="preview"]' }), cap: "[수강생 화면 보기]로 바뀐 메뉴를 확인해요", act: "none" }
    ] }
  ] },
  { title: "기수 · 수강생", items: [
    { id: "i-cohort", icon: "layers", title: "기수 일정 설계", sub: "강사센터 › 기수 관리", lead: "1주차 날짜만 고르면 [주차 · 마감일이 자동]으로", steps: [
      { go: "#/center", t: side("기수 관리"), cap: "왼쪽 메뉴에서 [기수 관리]를 눌러요" },
      { t: act("cohort-edit"), cap: "기수 카드에서 [일정 설계 · 수정]을 눌러요" },
      { t: nm("pl-start"), cap: "[1주차 강의일]을 고르면 주차마다 날짜가 자동으로 잡혀요", act: "none" },
      { t: nm("pl-dow"), cap: "[매주 강의 요일]과 시간을 정해요", act: "none" },
      { t: nm("pl-url"), cap: "줌 같은 [강의 입장 링크]를 넣어 두면 수강생 홈에 버튼이 생겨요", act: { fill: "https://zoom.us/j/1234567890" } },
      { t: btn("라이브 Q&A", { sel: '[data-action="plan-ev-add"]' }), cap: "[라이브 Q&A] · 오프라인 강의 같은 특별 일정도 더할 수 있어요", act: "none" },
      { t: { sel: "#modal-root *", text: "수강생에게 보일 일정", leaf: true }, cap: "[수강생에게 보일 일정]을 바로 확인해요", act: "none" },
      { t: btn("저장", { sel: "button", last: true }), cap: "[저장]하면 수강생 대시보드 · 수업 캘린더에 바로 보여요" }
    ] },
    { id: "i-students", icon: "users", title: "수강생 추가 · 승인", sub: "강사센터 › 수강생 관리", lead: "이름 + 전화번호 뒷자리가 [수강생 로그인 정보]", steps: [
      { go: "#/center", t: side("수강생 관리"), cap: "왼쪽 메뉴에서 [수강생 관리]를 눌러요" },
      { t: act("student-add"), cap: "[수강생 추가]를 눌러요" },
      { pre: [{ t: nm("name"), fill: "김두잉" }], t: nm("phone4"), cap: "[이름]과 [전화번호 뒷자리]를 적어요 — 수강생 로그인 정보가 돼요", act: { fill: "5678" } },
      { t: nm("cohortId"), cap: "들어갈 [기수]를 골라요", act: { select: { index: 3 } } },
      { t: nm("status"), cap: "[상태]: 승인 대기 · 수강 중 — ‘수강 중’이면 바로 로그인돼요", act: { select: { label: "수강 중" } } },
      { t: btn("저장", { sel: "button", last: true }), cap: "[저장]을 눌러요" },
      { t: btn("수강 중", { sel: '[data-action="stu-tab"]' }), cap: "[수강 중] 목록에 들어왔어요. 수강 신청한 분은 ‘승인 대기’에서 승인해요", act: "none" }
    ] },
    { id: "i-billing", icon: "coins", title: "다음 기수 신청", sub: "강사센터 › 다음 기수 신청", lead: "다음 기수를 [신청 → 입금 확인 → 기수 열림]", steps: [
      { go: "#/center", t: side("다음 기수 신청"), cap: "왼쪽 메뉴에서 [다음 기수 신청]을 눌러요" },
      { t: act("bill-request"), cap: "[다음 기수 신청]을 눌러요" },
      { t: nm("startDate"), cap: "열고 싶은 기수와 [1주차 시작 예정일]을 정해요", act: "none" },
      { t: nm("fee"), cap: "[1인 수강료]를 적으면 이번 기수 이용료가 바로 계산돼요", act: { fill: "2900000" } },
      { pre: [{ t: nm("phone"), fill: "010-1234-5678" }], t: nm("email"), cap: "[연락처]와 [세금계산서 받을 이메일]을 적어요", act: { fill: "tax@doinggo.kr" } },
      { t: btn("신청 보내기", { sel: "button" }), cap: "[신청 보내기]를 눌러요" },
      { t: { sel: ".a-main *", text: "신청 · 이용 내역", leaf: true }, cap: "[신청 · 이용 내역]에서 진행 상황을 봐요 — 입금 · 세금계산서가 끝나면 기수가 열려요", act: "none" }
    ] }
  ] },
  { title: "강의 · 과제", items: [
    { id: "i-lesson", icon: "monitorPlay", title: "주차별 강의 올리기", sub: "강사센터 › 주차별 강의 (커리큘럼)", lead: "유튜브 주소만 넣으면 [영상 길이까지 자동]", steps: [
      { go: "#/center", t: side("주차별 강의 (커리큘럼)"), cap: "왼쪽 메뉴에서 [주차별 강의]를 눌러요" },
      { t: btn("강의 추가", { sel: "button" }), cap: "주차 카드에서 [강의 추가]를 눌러요" },
      { t: nm("title"), cap: "[강의 제목]을 적고", act: { fill: "1주차 보충 · 상세페이지 따라하기" } },
      { t: nm("youtubeId"), cap: "[유튜브 주소]를 넣으면 실제 영상 길이가 자동으로 채워져요", act: { fill: "https://www.youtube.com/watch?v=mPFHz1JQj3U" } },
      { t: nm("desc"), cap: "[강의 설명]을 적고 교재 · PDF · 링크도 붙여요", act: { fill: "## 오늘 따라 할 것\n- 상세페이지 첫 화면 만들기\n- 썸네일 3장 뽑기" } },
      { t: btn("저장", { sel: "button", last: true }), cap: "[저장]을 눌러요" },
      { t: { sel: ".a-main *", text: "1주차 보충 · 상세페이지 따라하기", leaf: true }, cap: "[새 강의]가 주차 목록에 들어왔어요 — 수강생 화면에도 바로 보여요", act: "none" }
    ] },
    { id: "i-mission", icon: "checks", title: "과제 만들기 · 자동 검수", sub: "강사센터 › 과제 · 미션", lead: "조건에 맞으면 [자동으로 통과]되는 과제", steps: [
      { go: "#/center", t: side("과제 · 미션"), cap: "왼쪽 메뉴에서 [과제 · 미션]을 눌러요" },
      { t: btn("과제 추가", { sel: "button" }), cap: "주차 카드에서 [과제 추가]를 눌러요" },
      { t: nm("title"), cap: "[과제 제목]을 적어요", act: { fill: "상세페이지 첫 화면 캡처 올리기" } },
      { t: nm("kind"), cap: "[과제 종류] — 필수 과제를 모두 통과해야 수료증이 나와요", act: "none" },
      { t: nm("type"), cap: "[제출 방식]: 사진 · PDF / 링크 / 글 중에서 골라요", act: "none" },
      { t: nm("steps"), cap: "[진행 방법]을 한 줄에 하나씩 적어요", act: { fill: "미리캔버스에서 첫 화면 만들기\n화면 캡처해서 올리기" } },
      { t: nm("chkImage"), cap: "[자동 검수]를 켜면 조건에 맞는 과제는 바로 통과돼요", act: "none" },
      { t: btn("저장", { sel: "button", last: true }), cap: "[저장]하면 수강생 과제 목록에 바로 보여요" }
    ] },
    { id: "i-review", icon: "checks", title: "과제 검수 · 피드백", sub: "강사센터 › 과제 검수", lead: "제출된 과제에 [승인 · 보완 요청]과 피드백", steps: [
      { go: "#/center", t: side("과제 검수"), cap: "왼쪽 메뉴에서 [과제 검수]를 눌러요" },
      { t: btn("검수 대기", { sel: '[data-action="rev-tab"]' }), cap: "[검수 대기]에 새로 낸 과제가 모여요" },
      { t: { sel: '[data-action="review-open"]' }, cap: "과제를 눌러 [제출 내용]을 열어요" },
      { t: { sel: "#modal-root textarea" }, cap: "[피드백]을 적어요 — 수강생 과제 화면에 바로 보여요", act: { fill: "좋아요! 첫 화면 문구를 한 줄로 더 짧게 줄여 볼까요?" } },
      { t: btn("보완 요청", { sel: "#modal-root button" }), cap: "[승인] 또는 [보완 요청]을 눌러요" },
      { t: btn("보완 요청", { sel: '[data-action="rev-tab"]' }), cap: "보완 요청한 과제는 [보완 요청] 탭으로 — 수강생이 다시 내면 검수 대기로 돌아와요", act: "none" }
    ] },
    { id: "i-guide", icon: "listChecks", title: "시작 가이드 · 빠른 이동", sub: "강사센터 › 시작 가이드 · 빠른 이동", lead: "처음 온 수강생이 [따라 하는 체크리스트]", steps: [
      { go: "#/center", t: side("시작 가이드 · 빠른 이동"), cap: "왼쪽 메뉴에서 [시작 가이드 · 빠른 이동]을 눌러요" },
      { t: btn("단계 추가", { sel: "button" }), cap: "[단계 추가]로 수강생이 처음에 할 일을 더해요" },
      { t: { sel: '#modal-root input:not([type="hidden"]):not([type="checkbox"]):not([type="file"])' }, cap: "할 일을 [짧게] 적고, 누르면 갈 메뉴를 골라요", act: { fill: "자기소개 과제 올리기" } },
      { t: btn("저장", { sel: "#modal-root button", last: true }), cap: "[저장]하면 수강생 홈 ‘시작 가이드’에 체크 칸이 생겨요" },
      { t: btn("페이지 추가", { sel: "button" }), cap: "아래 [빠른 이동]에는 자주 가는 페이지 · 외부 링크를 모아요", act: "none" }
    ] }
  ] },
  { title: "홍보 페이지", items: [
    { id: "i-free", icon: "video", title: "무료강의 페이지 만들기", sub: "강사센터 › 무료강의 페이지", lead: "일정 · 전자책 · 오픈채팅까지 [한 페이지]", steps: [
      { go: "#/center", t: side("무료강의 페이지"), cap: "왼쪽 메뉴에서 [무료강의 페이지]를 눌러요" },
      { t: nm("lp-liveAt", { sel: '#lp-liveAt, [name="lp-liveAt"]' }), cap: "[강의 일정]을 정하면 카운트다운이 자동으로 돌아가요", act: "none" },
      { t: btn("맨 위 제목", { sel: '[data-action="fc-tab"]' }), cap: "왼쪽 칸 목록에서 [고칠 칸]을 골라요" },
      { t: btn("전자책", { sel: '[data-action="fc-tab"]' }), cap: "[전자책] 칸에는 선물 자료와 공개일을 넣어요" },
      { t: { sel: '[data-action="lp-toggle"]' }, cap: "칸마다 [페이지에 보이기]를 켜고 끌 수 있어요", act: "none" },
      { t: btn("저장", { sel: '[data-action="lp-save"]', last: true }), cap: "[저장]을 눌러요" },
      { t: { sel: '[data-action="lp-copy"]' }, cap: "[주소 복사]로 카톡 · 인스타에 링크를 걸어요", act: "none" }
    ] },
    { id: "i-landing", icon: "store", title: "강사 소개 페이지 만들기", sub: "강사센터 › 강사 소개 페이지", lead: "신청 버튼까지 있는 [강사 소개 랜딩]", steps: [
      { go: "#/center", t: side("강사 소개 페이지"), cap: "왼쪽 메뉴에서 [강사 소개 페이지]를 눌러요" },
      { t: { sel: '#lp-applyUrl, [name="lp-applyUrl"]' }, cap: "[신청하기 링크]를 넣으면 페이지의 신청 버튼이 그 주소로 가요", act: "none" },
      { t: { sel: '#lp-hero-title, [name="lp-hero-title"]' }, cap: "[첫 화면 헤드라인]을 적어요", act: "none" },
      { t: { sel: '[data-action="lp-move"]', nth: 2 }, cap: "칸의 [순서]를 바꾸고", act: "none" },
      { t: { sel: '[data-action="lp-toggle"]', nth: 1 }, cap: "필요 없는 칸은 [숨겨요]", act: "none" },
      { t: { sel: '[data-action="lp-pub"]' }, cap: "[저장]한 뒤 [페이지 공개]를 누르면 누구나 볼 수 있어요", act: "none" }
    ] }
  ] },
  { title: "소통 · 함께 운영", items: [
    { id: "i-qna", icon: "message", title: "1:1 요청 답변", sub: "강사센터 › 1:1 요청 답변", lead: "수강생 [오류 · 불편 신고]에 답하기", steps: [
      { go: "#/center", t: side("1:1 요청 답변"), cap: "왼쪽 메뉴에서 [1:1 요청 답변]을 눌러요" },
      { t: btn("답변 대기", { sel: '[data-action="q-tab"]' }), cap: "[답변 대기]에 수강생이 남긴 요청이 모여요" },
      { t: { sel: ".a-q .a-q-body" }, cap: "수강생이 남긴 [요청 내용]과 첨부 사진을 확인해요", act: "none" },
      { t: { sel: '.a-q-form textarea[name="answer"]' }, cap: "[답변]을 적어요 — 작성자와 강사님만 봐요", act: { fill: "확인했어요! 링크를 새로 바꿔 두었으니 다시 열어 봐 주세요." } },
      { t: { sel: ".a-q-form button", last: true }, cap: "[답변 보내기]를 누르면 수강생 화면에 바로 보여요" },
      { t: btn("답변 완료", { sel: '[data-action="q-tab"]' }), cap: "답한 요청은 [답변 완료]로 옮겨져요", act: "none" }
    ] },
    { id: "i-coach", icon: "shieldCheck", title: "코치 계정 만들기", sub: "강사센터 › 코치 관리", lead: "과제 검수 · 답변을 [코치와 나눠서]", steps: [
      { go: "#/center", t: side("코치 관리"), cap: "왼쪽 메뉴에서 [코치 관리]를 눌러요" },
      { t: act("coach-add"), cap: "[코치 추가]를 눌러요" },
      { pre: [{ t: { sel: '#modal-root [name="cname"]' }, fill: "박코치" }], t: { sel: '#modal-root [name="cphone"]' }, cap: "[이름]과 [전화번호 뒷자리]를 적어요 — 코치 로그인 정보예요", act: { fill: "2020" } },
      { t: { sel: '#modal-root input[type="checkbox"]', nth: 3 }, cap: "코치가 [볼 수 있는 메뉴]만 골라요", act: "none" },
      { t: btn("저장", { sel: "#modal-root button", last: true }), cap: "[저장]하면 코치는 강사센터 ‘코치’ 탭으로 로그인해요" }
    ] }
  ] }
];

/* ---------- 수강생 버전 (휴대폰 390×844) ---------- */
const STU = [
  { title: "시작하기", items: [
    { id: "s-login", icon: "logIn", title: "수강생 로그인", sub: "두잉고 › 수강생 로그인", lead: "이름 + [전화번호 뒷자리]로 로그인", steps: [
      { go: "#/login", t: btn("문대표", { sel: '[data-action="pick-instructor"]' }), cap: "듣고 있는 [강사님]을 골라요" },
      { t: nm("name"), cap: "수강 신청 때 적은 [이름]을 적고", act: { fill: "이수진" } },
      { t: nm("phone4"), cap: "[전화번호 뒷자리 4자리]를 적어요", act: { fill: "2186" } },
      { t: { sel: 'form button[type="submit"]' }, cap: "[로그인]을 누르면" },
      { t: null, cap: "내 강의실 [홈]이 열려요", act: "none", wait: 1500 }
    ] },
    { id: "s-home", icon: "home", title: "홈 화면 한눈에", sub: "두잉고 › 내 강의실 홈", lead: "오늘 할 일과 [진행률]을 한 화면에", steps: [
      { go: "#/home", t: act("toggle-guide"), cap: "[시작 가이드]를 하나씩 끝내며 체크해요" },
      { t: btn("과제 하러 가기", { sel: "a" }), cap: "이번 주 과제로 [바로 가기]", act: "none" },
      { t: btn("필수 과제", { sel: "a" }), cap: "[필수 · 도전 · 마인드 과제] 진행률을 봐요", act: "none" },
      { t: act("toggle-nav"), cap: "왼쪽 위 [메뉴]에서 모든 메뉴를 열어요" },
      { t: null, cap: "강사님이 정한 [메뉴]가 모두 여기 있어요", act: "none" }
    ] }
  ] },
  { title: "강의 · 과제", items: [
    { id: "s-lesson", icon: "monitorPlay", title: "주차별 강의 듣기", sub: "두잉고 › 주차별 강의", lead: "주차마다 [따라하기 영상]", steps: [
      { go: "#/home", t: { sel: ".tabbar a, .m-tab a, nav a", text: "강의", scope: "doc", last: true }, cap: "아래 [강의] 탭을 눌러요" },
      { t: { sel: "main a", text: "OT" }, cap: "주차에서 [들을 강의]를 눌러요" },
      { t: { sel: "main .vp-play" }, cap: "[영상]을 보고 아래 설명 · 자료를 함께 봐요", act: "none" },
      { t: btn("시청 완료", { sel: "main button" }), cap: "다 봤으면 [시청 완료로 표시]를 눌러요 — 진행률이 올라가요" },
      { t: btn("과제 보기", { sel: "main a, main button" }), cap: "이어서 [이 주차 과제]로 바로 가요", act: "none" }
    ] },
    { id: "s-mission", icon: "checks", title: "과제 내기", sub: "두잉고 › 과제 · 미션", lead: "내면 [자동 검수] 결과가 바로", steps: [
      { go: "#/home", t: { sel: ".tabbar a, .m-tab a, nav a", text: "과제", scope: "doc", last: true }, cap: "아래 [과제] 탭을 눌러요" },
      { t: { sel: "main a", text: "1주차" }, cap: "[주차]를 골라요" },
      { t: { sel: "main a, main button", text: "관심 품목 3가지" }, cap: "낼 [과제]를 눌러요" },
      { t: { sel: "main textarea" }, cap: "[내용]을 적거나 사진 · 링크를 올려요", act: { fill: "1. 마누카꿀\n2. 초록입홍합\n3. 프로폴리스 — 셋 다 재구매율이 높아서 골랐어요." } },
      { t: btn("제출", { sel: "main button" }), cap: "[제출하고 자동검수 받기]를 눌러요" },
      { t: null, cap: "[자동 검수] 결과가 바로 나오고, 강사님 피드백도 여기 보여요", act: "none", wait: 900 }
    ] }
  ] },
  { title: "도움받기", items: [
    { id: "s-ask", icon: "message", title: "1:1 요청 남기기", sub: "두잉고 › 질문 · 요청", lead: "막히면 [강사님께 바로]", steps: [
      { go: "#/qna", t: btn("1:1 요청", { sel: "main a, main button" }), cap: "[질문 · 요청]에서 [1:1 요청]을 눌러요" },
      { t: btn("요청 남기기", { sel: "main a, main button" }), cap: "[요청 남기기]를 눌러요" },
      { pre: [{ t: { sel: 'input[name="title"]', scope: "doc" }, fill: "3주차 템플릿 링크가 안 열려요" }], t: { sel: 'textarea[name="body"]', scope: "doc" }, cap: "[제목]과 [불편한 점]을 적어요 — 작성자와 강사님만 봐요", act: { fill: "3주차 상세페이지 템플릿 링크가 열리지 않아요." } },
      { t: { sel: 'button[type="submit"]', scope: "doc", last: true }, cap: "[보내기]를 누르면 강사님 화면에 바로 떠요" },
      { t: null, cap: "답변이 오면 [여기]에 바로 보여요", act: "none" }
    ] },
    { id: "s-bot", icon: "sparkles", title: "AI 조교에게 묻기", sub: "두잉고 › AI 조교", lead: "밤에도 [바로 답]하는 AI 조교", steps: [
      { go: "#/home", t: { sel: '[data-action="bot-open"]', scope: "doc", last: true }, cap: "오른쪽 아래 [AI 조교]를 눌러요" },
      { t: { sel: "textarea, input[type=text], input:not([type])", scope: "doc", last: true }, cap: "궁금한 점을 [편하게] 적어요", act: { fill: "통관할 때 꼭 확인할 서류가 뭐예요?" } },
      { t: { sel: 'button[type="submit"]', scope: "doc", last: true }, cap: "[보내기]를 누르면" },
      { t: null, cap: "강의 내용으로 [바로 답]해 줘요", act: "none", wait: 2500 }
    ] },
    { id: "s-cal", icon: "calendar", title: "수업 캘린더", sub: "두잉고 › 수업 캘린더", lead: "강의일 · [과제 마감]을 한눈에", steps: [
      { go: "#/schedule", t: null, cap: "[수업 캘린더]에서 강의일 · 과제 마감 · 라이브를 한눈에 봐요", act: "none" },
      { t: { sel: '[data-action="cal-pick"]', text: "마감" }, cap: "[날짜]를 누르면" },
      { t: { sel: "main h2, main h3, main b, main strong", text: "7일" }, cap: "그날 [일정 · 마감]이 아래에 보여요", act: "none" }
    ] }
  ] }
];

const TABS = [
  { key: "ins", label: "강사 버전", dev: "pc", groups: INS },
  { key: "stu", label: "수강생 버전", dev: "m", groups: STU }
];

/* ---------- 찍기 ---------- */
async function inPage(p) {
  await p.addInitScript(() => {
    window.__gq = (spec) => {
      if (!spec) return null;
      const modal = document.querySelector("#modal-root > *");
      const scope = spec.scope === "doc" || !modal ? document : document.getElementById("modal-root");
      const vis = (e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || r.right <= 1 || r.left >= innerWidth - 1) return false; /* 화면 밖(휴대폰 서랍 메뉴 안)은 빼요 */ const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
      let list = Array.from(scope.querySelectorAll(spec.sel || "*")).filter(vis);
      if (spec.text) list = list.filter((e) => (e.innerText || e.value || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").indexOf(spec.text) >= 0);
      if (spec.leaf) list = list.filter((e) => !Array.from(e.children).some((c) => (c.innerText || "").indexOf(spec.text) >= 0));
      if (spec.text && !spec.leaf) { // 글자가 든 가장 작은 요소 (바깥 상자 말고)
        list = list.filter((e) => !list.some((o) => o !== e && e.contains(o)));
      }
      if (!list.length) return null;
      return spec.last ? list[list.length - 1] : list[Math.min(spec.nth || 0, list.length - 1)];
    };
    window.__mask = (pairs) => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) pairs.forEach(([a, b]) => { if (n.nodeValue.indexOf(a) >= 0) n.nodeValue = n.nodeValue.split(a).join(b); });
      document.querySelectorAll("input, textarea").forEach((i) => pairs.forEach(([a, b]) => { if (i.value && i.value.indexOf(a) >= 0) i.value = i.value.split(a).join(b); }));
    };
  });
}

async function toWebp(p, png) {
  return p.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.8).split(",")[1];
  }, png.toString("base64"));
}

async function findEl(p, spec) {
  if (!spec) return null;
  for (let i = 0; i < 8; i++) {
    const h = await p.evaluateHandle((s) => window.__gq(s), spec);
    const el = h.asElement(); if (el) return el;
    await p.waitForTimeout(250);
  }
  return null;
}

async function doAct(p, el, a) {
  if (!el || a === "none") return;
  if (a === undefined || a === "click") { await el.click({ timeout: 4000 }).catch(() => el.click({ force: true }).catch(() => {})); return; }
  if (a.fill !== undefined) { await el.fill(a.fill).catch(() => {}); return; }
  if (a.select) { await el.selectOption(a.select).catch(() => {}); }
}

async function shootVideo(p, v, dev) {
  const dir = path.join(OUT, v.id); fs.mkdirSync(dir, { recursive: true });
  fs.readdirSync(dir).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  const vp = p.viewportSize(), steps = [], miss = [];
  for (let i = 0; i < v.steps.length; i++) {
    const s = v.steps[i];
    if (s.go) { await p.evaluate((h) => { if (location.hash === h || (window.ROUTE && ROUTE.hash === h)) { location.hash = "#/__"; } }, s.go); await p.evaluate((h) => { if (window.ROUTE) ROUTE.hash = h; else location.hash = h; }, s.go); await p.waitForTimeout(1600); }
    for (const pr of s.pre || []) { const e = await findEl(p, pr.t); if (e) { await e.scrollIntoViewIfNeeded().catch(() => {}); if (pr.fill !== undefined) await e.fill(pr.fill).catch(() => {}); else await e.click().catch(() => {}); await p.waitForTimeout(250); } }
    const el = await findEl(p, s.t);
    if (s.t && !el) miss.push(i + 1);
    const fillFirst = s.act && typeof s.act === "object";
    if (el) { await el.evaluate((e) => e.scrollIntoView({ block: "center", inline: "nearest" })); await p.waitForTimeout(450); }
    if (fillFirst) { await doAct(p, el, s.act); await p.waitForTimeout(350); }
    await p.waitForTimeout(s.wait || 350);
    await p.evaluate((m) => window.__mask(m), MASK);
    await p.evaluate(() => { if (document.activeElement && document.activeElement.blur && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) document.activeElement.blur(); });
    let box = null;
    if (el) { const r = await el.boundingBox(); if (r) box = [r.x / vp.width, r.y / vp.height, r.width / vp.width, r.height / vp.height].map((n) => Math.round(n * 10000) / 10000); }
    const png = await p.screenshot();
    const name = String(i + 1).padStart(2, "0") + ".webp";
    fs.writeFileSync(path.join(dir, name), Buffer.from(await toWebp(p, png), "base64"));
    steps.push(Object.assign({ img: v.id + "/" + name, cap: s.cap }, box ? { box } : {}, s.z ? { z: s.z } : {}, s.act === "none" || !el || fillFirst ? { tap: false } : {}, fillFirst && s.act.fill !== undefined ? { type: true } : {}));
    if (!fillFirst) { await doAct(p, el, s.act); await p.waitForTimeout(s.after || 1000); }
  }
  console.log((miss.length ? "  ! " : "  ✓ ") + v.id + " · " + v.steps.length + "단계" + (miss.length ? " · 못 찾은 단계 " + miss.join(", ") : ""));
  return { id: v.id, icon: v.icon, title: v.title, sub: v.sub, lead: v.lead, w: vp.width, h: vp.height, steps };
}

async function loginIns(p) {
  await p.goto(B + "#/center/login"); await p.waitForTimeout(1500);
  await p.click('[data-action="login-tab"][data-tab="instructor"]').catch(() => {}); await p.waitForTimeout(300);
  const inp = await p.$$("form input:not([type=hidden]):not([type=checkbox])");
  await inp[0].fill("문원오"); await inp[1].fill("2186"); await p.keyboard.press("Enter"); await p.waitForTimeout(2600);
}
async function loginStu(p) {
  await p.goto(B + "#/login"); await p.waitForTimeout(1500);
  await p.click('[data-action="pick-instructor"]'); await p.waitForTimeout(700);
  await p.fill('input[name="name"]', "이수진"); await p.fill('input[name="phone4"]', "2186"); await p.click('form button[type="submit"]'); await p.waitForTimeout(2200);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let old = null;
  try { const src = fs.readFileSync(DATA, "utf8"); old = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1)); } catch (e) { old = null; }
  const done = {};
  (old ? old.tabs : []).forEach((t) => t.groups.forEach((g) => g.items.forEach((it) => { done[it.id] = it; })));
  const b = await chromium.launch();
  const want = (v) => !ONLY || ONLY.split(",").indexOf(v.id) >= 0;
  // 수강생 먼저 (과제 · 1:1 요청을 내 두면 강사 영상에서 검수 · 답변할 게 생겨요)
  const order = [["stu", MOBILE, null], ["ins", PC, loginIns]];
  for (const [key, dev, login] of order) {
    const tab = TABS.find((t) => t.key === key);
    const vids = tab.groups.flatMap((g) => g.items).filter(want);
    if (!vids.length) continue;
    const ctx = await b.newContext(dev); const p = await ctx.newPage(); await inPage(p);
    p.on("pageerror", (e) => console.log("    페이지 오류:", e.message));
    if (login) await login(p); else { await p.goto(B + "#/login"); await p.waitForTimeout(1500); }
    for (const v of vids) {
      if (key === "stu" && v.id !== "s-login") { if (!(await p.evaluate(() => !!(window.DB && DB.session && DB.session.student && DB.session.student())))) await loginStu(p); }
      done[v.id] = await shootVideo(p, v, key);
    }
    await ctx.close();
  }
  await b.close();
  const data = { v: new Date().toISOString().slice(0, 10), tabs: TABS.map((t) => ({ key: t.key, label: t.label, dev: t.dev, groups: t.groups.map((g) => ({ title: g.title, items: g.items.map((it) => done[it.id]).filter(Boolean) })) })) };
  fs.writeFileSync(DATA, "/* 두잉고 사용법 영상 자료 — scripts/guide-capture.js 가 만들어요 (직접 고치지 말고 그 파일의 단계를 고친 뒤 다시 찍어요) */\nwindow.GUIDE_DATA = " + JSON.stringify(data) + ";\n");
  console.log("guide-data.js 저장 · 영상 " + data.tabs.reduce((a, t) => a + t.groups.reduce((x, g) => x + g.items.length, 0), 0) + "편");
})().catch((e) => { console.error(e); process.exit(1); });
