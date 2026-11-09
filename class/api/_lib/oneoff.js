/* 일회성 데이터 작업 — 사용자가 직접 요청한 데이터 수정만 여기에 둔다.
 * 운영 배포 때 아직 안 한 작업만 한 번 실행하고 oplog 에 기록한다 (같은 작업은 다시 돌지 않음).
 * 실행 전에 배포 백업이 먼저 만들어지므로, 잘못되면 마스터 → 데이터 관리에서 그 백업으로 되돌릴 수 있다.
 * 각 작업은 run(get, keys) → { writes: { 문서키: 새 값 | null(삭제) }, result, retry? } 를 돌려준다.
 * retry: true 면 기록하지 않아 다음 배포 때 다시 돈다 (예: 아직 넣지 않은 환경 변수가 필요한 작업).
 * when(): false 면 아직 대기 목록에 넣지 않는다 (환경 변수가 생긴 배포 때 처음 돈다).
 * 이미 사람이 고친 내용은 건드리지 않도록 조건을 좁게 잡는다. */
"use strict";

const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const clone = (x) => JSON.parse(JSON.stringify(x));
const DAY = 86400000;

/* ---------- 서류 준비 가이드 6단계 (문대표) ---------- */
const DOCS_NEW = {
  health: { id: "d6", title: "건강기능식품 일반 판매업 신고", where: "정부24 · 관할 시·군·구청 위생과", url: "https://www.gov.kr", time: "1 ~ 3일", cost: "신고 수수료 (지역별 상이)",
    docs: ["사업자등록증", "건강기능식품 위생교육 수료증", "신분증"],
    tips: ["신고 전에 한국건강기능식품협회의 신규 영업자 위생교육(온라인)을 먼저 들어 두세요", "영업신고증이 나오면 판매 채널에 함께 등록해요"] },
  safe: { id: "d7", title: "구매안전서비스 이용확인증", where: "스마트스토어 판매자센터 · 쿠팡 윙", url: "https://sell.smartstore.naver.com", time: "즉시", cost: "무료",
    docs: ["사업자등록증", "판매 채널 가입 (스마트스토어 등)"],
    tips: ["통신판매업 신고 때 함께 내는 서류예요", "판매자센터의 판매자 정보 메뉴에서 바로 발급할 수 있어요"] },
  bank: { id: "d8", title: "사업자 통장 및 신용카드", where: "홈택스 · 거래 은행", url: "https://www.hometax.go.kr", time: "당일 ~ 1주", cost: "무료",
    docs: ["사업자등록증", "신분증"],
    tips: ["판매 채널 정산 계좌는 사업자 통장으로 등록해요", "사업용 카드를 홈택스에 등록해 두면 경비 처리와 부가세 신고가 쉬워져요"] }
};
const DOC_ORDER = [
  { key: "biz", re: /사업자\s*등록/ },
  { key: "health", re: /건강기능식품|건기식/ },
  { key: "mail", re: /통신\s*판매/ },
  { key: "agent", re: /구매\s*대행/ },
  { key: "safe", re: /구매\s*안전/ },
  { key: "bank", re: /통장|신용\s*카드/ }
];
function docsGuideSix(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !Array.isArray(c.docsGuide)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  const list = clone(c.docsGuide);
  // 6단계에 없는 예전 기본 단계: 수입식품 위생교육(구매대행업 등록 안내로 합침) · 판매 채널 가입
  const edu = list.find((g) => g.id === "d3" && /위생\s*교육/.test(g.title || ""));
  const drop = list.filter((g) => (g.id === "d3" && /위생\s*교육/.test(g.title || "")) || (g.id === "d5" && /판매\s*채널/.test(g.title || "")));
  const rest = list.filter((g) => drop.indexOf(g) === -1);
  const used = new Set();
  const out = [];
  DOC_ORDER.forEach(({ key, re }) => {
    const have = rest.find((g) => !used.has(g) && re.test(g.title || ""));
    if (have) { used.add(have); out.push(have); }
    else if (DOCS_NEW[key]) out.push(clone(DOCS_NEW[key]));
  });
  rest.forEach((g) => { if (!used.has(g)) out.push(g); });
  if (edu) {
    const agent = out.find((g) => /구매\s*대행/.test(g.title || ""));
    const tip = "영업등록 전에 한국식품산업협회 ‘수입식품 위생교육’(온라인 약 8시간)을 먼저 이수해요";
    if (agent && !(agent.tips || []).some((t) => /위생\s*교육/.test(t))) agent.tips = (agent.tips || []).concat(tip);
  }
  return { writes: { [k]: Object.assign({}, c, { docsGuide: out }) }, result: { steps: out.map((g) => g.title), removed: drop.map((g) => g.title) } };
}

/* ---------- 동기부여 영상 (문대표) ---------- */
const VIDEOS = [
  { id: "mv-yt1", title: "이 영상을 보는 0.3%는 인생이 바뀔 겁니다 (스터디언)", youtubeId: "uMYLbqRGF2c", minutes: "", date: "2026-10-08" },
  { id: "mv-yt2", title: "하루에 하나만 잘해도 얻게 되는 효과 4가지 (스터디언)", youtubeId: "_dRXf6W63XI", minutes: "", date: "2026-10-07" },
  { id: "mv-yt3", title: "진짜 실패는 시도조차 하지 않는 것 (짧은명언 AWAKE)", youtubeId: "xSBV_7DdPw8", minutes: "", date: "2026-10-06" },
  { id: "mv-yt4", title: "나의 노력이 하찮게 느껴질 때 (짧은명언 AWAKE)", youtubeId: "LTR2dknCmnc", minutes: "", date: "2026-10-05" },
  { id: "mv-yt5", title: "넘어지거나, 넘어서거나 (스터디언)", youtubeId: "hcC8lMniCyA", minutes: "", date: "2026-10-04" },
  { id: "mv-yt6", title: "당장의 쾌락을 죽여라 (멘탈훈련소)", youtubeId: "pQea9wWPFsM", minutes: "", date: "2026-10-03" }
];
const PLACEHOLDER = /^mv[1-6]$/;
function motivationVideos(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !Array.isArray(c.motivation)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  // 영상 주소가 없는 처음 예시(mv1~mv6)만 빼고, 강사님이 올린 항목은 그대로 둔다
  const keep = c.motivation.filter((m) => !(PLACEHOLDER.test(m.id) && !m.youtubeId));
  const add = VIDEOS.filter((v) => !keep.some((m) => m.youtubeId === v.youtubeId)).map(clone);
  return { writes: { [k]: Object.assign({}, c, { motivation: add.concat(keep) }) }, result: { added: add.map((v) => v.youtubeId), removed: c.motivation.length - keep.length } };
}

/* ---------- 문대표 체험 계정 ---------- */
const weeksFor = (c, co) => {
  const cu = co && co.curriculumId && co.curriculumId !== "main" && (c.curricula || []).find((x) => x.id === co.curriculumId);
  return (cu ? cu.weeks : c.weeks) || [];
};
/** 모든 과제 승인 · 모든 강의 시청 · 서류 준비 완료 → 수료증까지 열린 진행 기록 */
function fullProgress(c, co, reviewer) {
  const p = { submissions: {}, watched: {}, docs: {}, questions: [], chat: [], notes: {}, readNotices: {}, guide: {}, guideV: 2 };
  const start = Date.parse((co && co.startDate ? co.startDate : "2026-08-01") + "T10:00:00+09:00");
  weeksFor(c, co).forEach((w, wi) => {
    const base = start + wi * 7 * DAY + DAY;
    (w.lessons || []).forEach((l, i) => { p.watched[l.id] = base + i * 600000; });
    (w.missions || []).forEach((m, i) => {
      const at = base + DAY + i * 3600000;
      p.submissions[m.id] = [{
        at,
        text: m.type === "text" ? m.title + " 과제를 마쳤습니다. 강의 내용대로 정리했어요." : "",
        link: m.type === "link" ? "https://" + ((m.check && m.check.linkHint) || "example.com") + "/sample-store" : "",
        files: m.type === "image" ? [{ type: "pdf", name: m.title + ".pdf" }] : [],
        result: { pass: true, reasons: [], ok: ["체험 계정"] },
        review: Object.assign({ status: "approved", comment: "", at: at + 7200000 }, reviewer)
      }];
    });
  });
  (c.docsGuide || []).forEach((g, i) => { p.docs[g.id] = start + i * 3600000; });
  (c.notices || []).forEach((n) => { p.readNotices[n.id] = start; });
  (c.guide || []).forEach((g) => { p.guide[g.id] = start; });
  return p;
}
function moonDemoAccounts(get, keys) {
  const c = get("content:moon"), ins = get("ins:moon"), cohorts = get("cohorts:moon");
  if (!isObj(c) || !isObj(ins) || !Array.isArray(cohorts)) return { writes: {}, result: { skipped: "문대표 데이터 없음" } };
  const writes = {}, removed = [];
  const isSujin = (s) => s.id === "s1" || (s.name === "이수진" && s.phone4 === "2186");
  const keep = new Set(["demo1", "demo2"]);
  keys("stu:moon:").forEach((k) => {
    const s = get(k);
    if (!isObj(s)) return;
    if (isSujin(s)) { keep.add(s.id); if (!s.demo || s.status !== "approved") writes[k] = Object.assign({}, s, { demo: true, status: "approved" }); return; }
    if (keep.has(s.id)) return;
    writes[k] = null;
    removed.push(s.name + " (" + s.id + ")");
  });
  keys("prog:moon:").forEach((k) => { const sid = k.split(":")[2]; if (!keep.has(sid) && get(k) != null) writes[k] = null; });
  const reviewer = { by: (ins.name || "문대표") + " 강사", byId: "moon", role: "instructor" };
  const findCo = (name, id) => cohorts.find((x) => x.name === name) || cohorts.find((x) => x.id === id);
  const created = [];
  [["demo1", "1기", "c1", "1기 체험단", "1111", "2026-07-28"], ["demo2", "2기", "c2", "2기 체험단", "2222", "2026-08-25"]].forEach(([sid, coName, coId, name, phone4, appliedAt]) => {
    const co = findCo(coName, coId);
    if (!co) return;
    const sk = "stu:moon:" + sid, pk = "prog:moon:" + sid;
    if (get(sk) == null) { writes[sk] = { id: sid, instructorId: "moon", cohortId: co.id, name, phone4, status: "approved", appliedAt, demo: true }; created.push(name); }
    if (get(pk) == null) writes[pk] = fullProgress(c, co, reviewer);
  });
  return { writes, result: { removed, created, kept: Array.from(keep) } };
}

/* ---------- 문대표 강사 프로필 사진 · 강의 분야 (첫 화면 강사 소개 카드) ---------- */
function moonProfile(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !isObj(c.brand)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  // 이미 사진 · 분야를 넣었다면 그대로 둔다
  const add = {};
  if (!c.brand.photo) add.photo = "assets/home/moon-profile.webp";
  if (!c.brand.field) add.field = "뉴질랜드 건기식 브랜딩";
  if (!Object.keys(add).length) return { writes: {}, result: { skipped: "이미 있음" } };
  return { writes: { [k]: Object.assign({}, c, { brand: Object.assign({}, c.brand, add) }) }, result: { added: Object.keys(add) } };
}

/* ---------- 로직메이커(김신용 대표) · 황금농부 프로필 사진 (대표님 요청) ----------
 * 사진이 비어 있을 때만 넣는다 (강사님이 이미 올린 사진은 그대로) */
function logicFarmerPhotos(get) {
  const want = { logic: "assets/home/logic-profile.webp", farmer: "assets/home/farmer-profile.webp" };
  const writes = {}, added = [];
  Object.keys(want).forEach((iid) => {
    const k = "content:" + iid, c = get(k);
    if (!isObj(c) || !isObj(c.brand) || c.brand.photo) return;
    writes[k] = Object.assign({}, c, { brand: Object.assign({}, c.brand, { photo: want[iid] }) });
    added.push(iid);
  });
  return { writes, result: added.length ? { added } : { skipped: "이미 있음" } };
}

/* ---------- 기수 이용료: 부가세 포함으로 (대표님 요청) ----------
 * 마스터 설정(meta.billing)이 이미 저장돼 있으면 부가세 방식만 '포함'으로, 아직 입금 확인 전인 신청도 '포함'으로.
 * 입금 확인을 마친 기록은 그때 방식 그대로 둔다 */
function billingVatIncluded(get, keys) {
  const writes = {}, result = { meta: false, bills: [] };
  const meta = get("meta");
  if (isObj(meta) && isObj(meta.billing) && meta.billing.vat !== "included") {
    writes.meta = Object.assign({}, meta, { billing: Object.assign({}, meta.billing, { vat: "included" }) });
    result.meta = true;
  }
  keys("bill:").forEach((k) => {
    const b = get(k);
    if (isObj(b) && b.vat && b.vat !== "included" && !b.paidAt && !b.canceledAt) { writes[k] = Object.assign({}, b, { vat: "included" }); result.bills.push(k); }
  });
  return { writes, result };
}

/* ---------- 수강생 메뉴 이름을 두고 클래스 표현으로 (대표님 요청) ----------
 * 1) 강사 메뉴 구성에 예전 기본 이름이 그대로 저장돼 있으면 지워서 새 기본 이름이 보이게 (강사가 직접 바꾼 이름은 그대로)
 * 2) AI봇 이름이 예전 기본값('24시 OOO AI봇')이면 'OOO AI 조교'로
 * 3) 공지 · FAQ · 시작 가이드 · 강의 소개 페이지의 예전 기본 문구 가운데 메뉴 이름이 들어간 문장만 새 이름으로 (문장이 그대로 남아 있을 때만)
 * 4) 홈 ‘빠른 이동’ 기본 4칸 이름 (예전 기본 이름일 때만)
 * (shared/data-rules.js 의 RENAME_PHRASES · QL_RENAME · OLD_MENU_LABELS 와 같은 목록 — 예전 db.js) */
const OLD_MENU_LABELS = { home: "홈", curriculum: "커리큘럼", missions: "과제 제출하기", schedule: "강의 일정", notices: "공지사항", qna: "Q&A", docs: "서류 준비 가이드", bot: "AI봇", library: "유료강의 자료실", motivation: "동기부여", channels: "1:1 소통채널", partners: "제휴채널", certificate: "수료증" };
const RENAME_PHRASES = [
  [/다시보기는 커리큘럼 메뉴에 올라갑니다/g, "다시보기는 ‘라이브 다시보기’ 메뉴에 올라갑니다"],
  [/‘과제 제출하기’에서 주차별로/g, "‘과제 · 미션’에서 주차별로"],
  [/Q&A 메뉴나 24시 (\S+) AI봇에 먼저/g, "‘질문 · 요청’ 메뉴나 $1 AI 조교에게 먼저"],
  [/^유료강의 자료실 이용 시 주의사항$/, "강의 자료함 이용 시 주의사항"],
  [/다시보기가 커리큘럼 1주차에 올라갔습니다/g, "다시보기가 ‘주차별 강의’ 1주차에 올라갔습니다"],
  [/‘서류 준비 가이드’ 메뉴/g, "‘실무 체크리스트’ 메뉴"],
  [/라이브 다음 날까지 커리큘럼 메뉴에 다시보기가 올라갑니다\. 강의 일정 메뉴에서/g, "라이브 다음 날까지 ‘라이브 다시보기’ 메뉴에 영상이 올라갑니다. ‘수업 캘린더’ 메뉴에서"],
  [/강의 일정 메뉴의 파란 점/g, "‘수업 캘린더’ 메뉴의 파란 점"],
  [/Q&A의 ‘요청사항’ 탭에서 ‘문의하기’를 눌러/g, "‘질문 · 요청’ 메뉴의 ‘1:1 요청’ 탭에서 ‘요청 남기기’를 눌러"],
  [/^다시보기가 커리큘럼 메뉴에 올라갑니다\.$/, "다시보기가 ‘라이브 다시보기’ 메뉴에 올라갑니다."],
  [/AI봇에 밤에 물어봐도/g, "AI 조교한테 밤에 물어봐도"],
  [/^서류 준비 가이드 · 마진 계산기$/, "실무 체크리스트 · 마진 계산기"],
  [/^24시 (\S+) AI봇$/, "$1 AI 조교 (24시간 답변)"],
  [/일정, 자료실, 24시 AI봇까지 한 곳에서/g, "일정, 자료함, AI 조교까지 한 곳에서"],
  [/^AI봇에게 궁금한 점 물어보기$/, "AI 조교에게 궁금한 점 물어보기"],
  [/^강의 일정 확인하기$/, "수업 캘린더 확인하기"]
];
const QL_RENAME = { ql1: ["공지사항", "클래스 소식"], ql2: ["자주 묻는 질문", "FAQ 검색"], ql3: ["서류 준비 가이드", "실무 체크리스트"], ql4: ["요청사항", "1:1 요청"] };
function renamePhrases(c) {
  let n = 0;
  const fix = (v) => RENAME_PHRASES.reduce((t, p) => t.replace(p[0], p[1]), v);
  const walk = (o) => {
    if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === "string") { const r = fix(v); if (r !== v) { o[i] = r; n++; } } else if (v && typeof v === "object") walk(v); }); return; }
    Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === "string") { if (k === "data" || k === "photo") return; const r = fix(v); if (r !== v) { o[k] = r; n++; } } else if (v && typeof v === "object") walk(v); });
  };
  ["notices", "faqs", "guide", "landing"].forEach((k) => { if (c[k] && typeof c[k] === "object") walk(c[k]); });
  const b = c.brand;
  if (isObj(b) && b.botName === "24시 " + (b.instructor || "강사") + " AI봇") { b.botName = (b.instructor || "강사") + " AI 조교"; n++; }
  (Array.isArray(c.quickLinks) ? c.quickLinks : []).forEach((l) => { const r = isObj(l) && QL_RENAME[l.id]; if (r && l.title === r[0]) { l.title = r[1]; n++; } });
  return n;
}
function menuNamesV15(get, keys) {
  const writes = {}, result = { menus: [], content: [] };
  keys("ins:").forEach((k) => {
    const ins = get(k);
    if (!isObj(ins) || !isObj(ins.menu) || !Array.isArray(ins.menu.items)) return;
    let n = 0;
    ins.menu.items.forEach((x) => { if (isObj(x) && x.label && OLD_MENU_LABELS[x.key] === x.label) { delete x.label; n++; } });
    if (n) { writes[k] = ins; result.menus.push(k + " · " + n); }
  });
  keys("content:").forEach((k) => {
    const c = get(k);
    if (!isObj(c)) return;
    const n = renamePhrases(c);
    if (n) { writes[k] = c; result.content.push(k + " · " + n); }
  });
  return { writes, result };
}

/* ---------- 로직메이커 → 부알남 (대표님 요청) ----------
 * 강사 표시 이름이 아직 ‘로직메이커’이면 ‘부알남’으로, 그 강사 콘텐츠(브랜드 · 강의 소개 · 무료강의 · 공지 등)의 ‘로직메이커’ 글자도 ‘부알남’으로.
 * 강사센터 로그인 이름(name)은 그대로 둔다 (로그인이 막히지 않게). 사진 · 파일 데이터 칸은 건너뜀 */
function renameWordDeep(o, re, to) {
  let n = 0;
  const walk = (x) => {
    if (Array.isArray(x)) { x.forEach((v, i) => { if (typeof v === "string") { const r = v.replace(re, to); if (r !== v) { x[i] = r; n++; } } else if (v && typeof v === "object") walk(v); }); return; }
    Object.keys(x).forEach((k) => { const v = x[k]; if (typeof v === "string") { if (k === "data" || k === "photo") return; const r = v.replace(re, to); if (r !== v) { x[k] = r; n++; } } else if (v && typeof v === "object") walk(v); });
  };
  walk(o);
  return n;
}
function logicToBualnam(get) {
  const writes = {}, result = {};
  const ins = get("ins:logic");
  if (isObj(ins)) {
    let n = 0;
    if (ins.displayName === "로직메이커") { ins.displayName = "부알남"; n++; }
    if (isObj(ins.brand)) n += renameWordDeep(ins.brand, /로직메이커/g, "부알남");
    if (n) { writes["ins:logic"] = ins; result.ins = n; }
  }
  const c = get("content:logic");
  if (isObj(c)) { const n = renameWordDeep(c, /로직메이커/g, "부알남"); if (n) { writes["content:logic"] = c; result.content = n; } }
  return { writes, result: Object.keys(result).length ? result : { skipped: "이미 바뀜" } };
}

/* ---------- 빠른 이동 ‘두고푸드’ 설명 (대표님 요청) ----------
 * 예전 기본 문구 그대로인 칸만 ‘전문 식품 도매몰 · 사업자 전용가’로 (강사가 고친 설명은 그대로) */
function foodQuickLinkDesc(get, keys) {
  const writes = {}, changed = [];
  keys("content:").forEach((k) => {
    const c = get(k);
    if (!isObj(c) || !Array.isArray(c.quickLinks)) return;
    let n = 0;
    c.quickLinks.forEach((l) => { if (isObj(l) && l.id === "ql10" && l.desc === "식품 도매몰 · 사업자 전용가") { l.desc = "전문 식품 도매몰 · 사업자 전용가"; n++; } });
    if (n) { writes[k] = c; changed.push(k); }
  });
  return { writes, result: changed.length ? { changed } : { skipped: "바꿀 칸 없음" } };
}

/* ---------- 황금농부 → 갓농부 (대표님 요청) ----------
 * 강사 표시 이름이 아직 ‘황금농부’이면 ‘갓농부’로, 그 강사 콘텐츠의 ‘황금농부’ 글자도 ‘갓농부’로 (사진 · 파일 데이터 칸은 건너뜀).
 * 첫 화면 강사 카드 · 수강생 로그인에 보이는 강의 분야가 비어 있으면 ‘귤 단 하나 팔아 월매출 10억’. 강사센터 로그인 이름(name)은 그대로 */
function farmerToGodFarmer(get) {
  const writes = {}, result = {};
  const ins = get("ins:farmer");
  if (isObj(ins)) {
    let n = 0;
    if (ins.displayName === "황금농부") { ins.displayName = "갓농부"; n++; }
    if (isObj(ins.brand)) n += renameWordDeep(ins.brand, /황금농부/g, "갓농부");
    if (n) { writes["ins:farmer"] = ins; result.ins = n; }
  }
  const c = get("content:farmer");
  if (isObj(c)) {
    let n = renameWordDeep(c, /황금농부/g, "갓농부");
    if (isObj(c.brand) && !c.brand.field) { c.brand.field = "귤 단 하나 팔아 월매출 10억"; n++; }
    if (n) { writes["content:farmer"] = c; result.content = n; }
  }
  return { writes, result: Object.keys(result).length ? result : { skipped: "이미 바뀜" } };
}

/* ---------- 두고클래스 체험 계정 vod@gmail.com / vod (서버 회원 + 산 강의 몇 개) ----------
 * 마스터가 VOD · 결제 · 강의실 흐름을 직접 확인하려고 만든 계정이에요. 주문은 0원 · demo 표시라 매출 · 수강생 수에는 안 잡혀요.
 * 문대표 강의는 스토어에서 미노출이라 넣지 않아요. 마스터 › VOD 전시 · 쿠폰 · 설정에서 ‘체험 계정’을 끄면 로그인이 막혀요. */
const DEMO_EMAIL = "vod@gmail.com";
const DEMO_BUYS = [["v5", "챗GPT로 블로그 수익화, 하루 1시간 루틴"], ["v2", "AI로 그림 그리고 굿즈로 파는 법"], ["v3", "귤 하나로 월매출 10억, 농산물 온라인 판매 실전"], ["v4", "스마트스토어 상세페이지, 전환율 2배 만드는 구조"], ["v14", "중국 구매대행, 상품 찾기부터 첫 판매까지"], ["v11", "농산물 상세페이지 문장 템플릿 100"]];
function vodDemoMember(get) {
  if (get("vme:" + DEMO_EMAIL)) return { writes: {}, result: { skipped: "이미 있는 계정" } };
  const V = require("./vod"), at = Date.now(), mid = "vm-demo-srv", writes = {}, nos = [];
  const titles = {}; ((((get("meta") || {}).vod || {}).products) || []).forEach((p) => { if (p && p.id) titles[p.id] = p.title; });
  DEMO_BUYS.forEach((b, i) => {
    const no = "DC261029" + String(900 + i), ebook = b[0] === "v11";
    nos.push(no);
    writes["vo:" + no] = { id: "vo-" + no, no, kind: "course", days: ebook ? null : 365, mid, pid: b[0], title: titles[b[0]] || b[1], list: 0, sale: 0, amount: 0, method: "free", ch: "web", share: null, status: "paid", createdAt: at, at: at - (i + 1) * 36e5, paidAt: at - (i + 1) * 36e5, pg: { st: "free" }, demo: true, buyer: { name: "체험회원", phone: "" } };
  });
  writes["vm:" + mid] = { id: mid, via: "email", email: DEMO_EMAIL, name: "체험회원", phone: "010-0000-0000", pwHash: V.hashPw("vod"), demo: true, marketing: false, consent: { mkt: false, ch: [], night: false, at, log: [{ at, on: false, how: "체험 계정" }] }, src: { s: "direct", at }, kakaoCh: false, tags: ["체험 계정"], notes: [], createdAt: at, points: 5000, pointLog: [{ at, amt: 5000, why: "체험 계정 포인트" }], coupons: [], orderNos: nos, loginN: 0 };
  writes["vme:" + DEMO_EMAIL] = { id: mid };
  return { writes, result: { member: mid, orders: nos.length } };
}

/* ---------- 테스트 코치 김하나: 초이 강의 코치도 맡기 (대표님 요청 · 여러 강의 코치 로그인 확인용) ----------
 * 문대표 강의에 김하나(1004) 코치가 있고, 초이 강의에 같은 이름의 코치가 아직 없을 때만 더해요. 강사센터 › 코치 관리에서 지우면 끝이에요 */
function hanaSecondCourse(get) {
  const m = get("ins:moon"), c = get("ins:choi");
  if (!isObj(m) || !isObj(c)) return { writes: {}, result: { skipped: "강사 없음" } };
  const hana = (m.coaches || []).find((x) => x && String(x.name || "").replace(/\s+/g, "") === "김하나" && x.phone4 === "1004");
  if (!hana) return { writes: {}, result: { skipped: "문대표 강의에 김하나 코치 없음" } };
  if ((c.coaches || []).some((x) => x && String(x.name || "").replace(/\s+/g, "") === "김하나")) return { writes: {}, result: { skipped: "이미 있음" } };
  const add = { id: "coach-hana", name: "김하나", phone4: "1004", status: "active", perms: ["reviews", "questions"], memo: "테스트 코치 · 여러 강의 코치 확인용", createdAt: "2026-10-30" };
  return { writes: { "ins:choi": Object.assign({}, c, { coaches: (Array.isArray(c.coaches) ? c.coaches : []).concat([add]) }) }, result: { added: "ins:choi coach-hana" } };
}

/* ---------- 문대표 종이책 『내 인생의 추월차선은 내가 만든다』 — 두고클래스 전자책 메뉴 (택배 배송) ----------
 * 스토어 상품(meta.vod.products)과 결제 가격표(vcat)에 없을 때만 넣어요. 문대표 강의는 스토어에서 숨겨 두었지만(insOff) 이 책은 보여요(showOff).
 * 배송 설정 기본값(settings.ship)도 비어 있을 때만 채워요. v21 표시를 남겨 화면이 같은 책을 또 넣지 않게 해요 */
function moonBook(get) {
  const { MOON_BOOK, SHIP_DEF } = require("./books");
  const meta = get("meta");
  if (!isObj(meta) || !isObj(meta.vod) || !Array.isArray(meta.vod.products)) return { writes: {}, result: { skipped: "두고클래스 상품 없음" } };
  const writes = {}, v = clone(meta.vod), has = v.products.some((p) => p && p.id === MOON_BOOK.id);
  if (!has) v.products.push(clone(MOON_BOOK));
  v.settings = isObj(v.settings) ? v.settings : {};
  if (!isObj(v.settings.ship)) v.settings.ship = clone(SHIP_DEF);
  v.v21 = 1;
  writes.meta = Object.assign({}, meta, { vod: v });
  const cat = get("vcat"), P_KEYS = ["id", "title", "type", "status", "price", "sale", "saleEnd", "plans", "accessDays", "eventAt", "eventMin", "seats", "next", "ebPrice", "ebDays", "coach", "tea", "dg", "iid", "share", "shipFee", "stock"];
  if (isObj(cat) && Array.isArray(cat.products) && !cat.products.some((p) => p && p.id === MOON_BOOK.id)) {
    const row = {}; P_KEYS.forEach((k) => { if (MOON_BOOK[k] !== undefined) row[k] = MOON_BOOK[k]; }); row.dg = false;
    writes.vcat = Object.assign({}, cat, { products: cat.products.concat([row]) });
  }
  return { writes, result: { book: has ? "이미 있음" : "추가", vcat: writes.vcat ? "추가" : "그대로" } };
}

/* 두고클래스 무통장 입금 계좌 — 통장 사본 기준 (IBK기업은행 · 주식회사 두고홀딩스). 계좌가 비어 있을 때만 넣어요 (마스터가 넣은 계좌는 그대로) */
const STORE_BANK = { bank: "IBK기업은행", account: "940-057282-04-017", holder: "(주)두고홀딩스" };
function storeBank(get) {
  const meta = get("meta");
  if (!isObj(meta) || !isObj(meta.vod)) return { writes: {}, result: { skipped: "두고클래스 데이터 없음" } };
  const s = isObj(meta.vod.settings) ? meta.vod.settings : {};
  if (s.bank && s.account) return { writes: {}, result: { bank: "이미 있음" } };
  const v = clone(meta.vod);
  v.settings = Object.assign({}, s, { bank: STORE_BANK.bank, account: STORE_BANK.account, holder: s.holder || STORE_BANK.holder });
  return { writes: { meta: Object.assign({}, meta, { vod: v }) }, result: { bank: "넣음" } };
}

/* ---------- 실제 운영 시작: ‘기수 신청 · 매출’ 예시 기록 정리 (대표님 요청 2026-10-31) ----------
 * 파트너센터를 처음 열 때 만들어진 예시 이용료 기록(부알남 · 초이 1기 · 2기, demo)처럼 문대표 것이 아닌 이용료 기록은 모두 지워 매출을 0원에서 시작.
 * 문대표 기록은 예시(demo)만 지워요. 지운 기록으로 새로 열린 기수가 수강생 없이 남아 있으면 그 기수도 지워요.
 * 처음부터 있던 기수 · 수강생 · 강사 · 파트너 계정(예시 파트너 · 김나영)은 그대로. 지운 기록으로만 계산된 파트너 지급 기록(예시)도 지워요 */
const SEED_COHORTS = ["c1", "c2", "c3", "c4", "lc1", "fc1", "cc1"];
function launchReset(get, keys) {
  const writes = {}, result = { bills: [], cohorts: [], payouts: [] }, opened = {}, gone = new Set();
  keys("bill:").forEach((k) => {
    const b = get(k), iid = k.split(":")[1];
    if (!isObj(b) || (iid === "moon" && b.demo !== true)) return;
    writes[k] = null; result.bills.push(iid + " " + (b.cohortName || "") + (b.demo ? " (예시)" : ""));
    gone.add(b.id || k.split(":")[2]);
    if (b.cohortId && iid !== "moon" && SEED_COHORTS.indexOf(b.cohortId) < 0) (opened[iid] = opened[iid] || []).push(b.cohortId);
  });
  Object.keys(opened).forEach((iid) => {
    const ck = "cohorts:" + iid, list = get(ck);
    if (!Array.isArray(list)) return;
    const used = new Set(keys("stu:" + iid + ":").map((k) => (get(k) || {}).cohortId));
    const keep = list.filter((co) => !(isObj(co) && opened[iid].indexOf(co.id) >= 0 && !used.has(co.id)));
    if (keep.length === list.length) return;
    writes[ck] = keep;
    list.filter((co) => keep.indexOf(co) < 0).forEach((co) => result.cohorts.push(iid + " " + co.name));
  });
  const meta = get("meta");
  if (isObj(meta) && isObj(meta.affPayouts)) {
    const po = clone(meta.affPayouts);
    Object.keys(po).forEach((k) => {
      const r = isObj(po[k]) ? po[k] : {}, rows = Array.isArray(r.rows) ? r.rows : [];
      const demo = k.indexOf("aff-demo:") === 0 && !rows.length && !r.amount;
      if (demo || (rows.length && rows.every((x) => gone.has(x.bid)))) { delete po[k]; result.payouts.push(k); }
    });
    if (result.payouts.length) writes.meta = Object.assign({}, meta, { affPayouts: po });
  }
  return { writes, result };
}

/* ---------- 문대표 4기: 11월 21일(토)부터 4주 (대표님 요청 2026-10-31) ---------- */
function moon4th(get) {
  const k = "cohorts:moon", list = get(k);
  if (!Array.isArray(list)) return { writes: {}, result: { skipped: "문대표 기수 없음" } };
  const co = list.find((x) => isObj(x) && x.id === "c4") || list.find((x) => isObj(x) && x.name === "4기");
  if (!co) return { writes: {}, result: { skipped: "4기 없음" } };
  const before = { startDate: co.startDate, weeks: co.weeks || "", classDow: co.classDow };
  const next = Object.assign({}, co, { startDate: "2026-11-21", weeks: 4, classDow: 6, recruiting: true });
  return { writes: { [k]: list.map((x) => (x === co ? next : x)) }, result: { cohort: co.name, before, after: { startDate: next.startDate, weeks: 4, classDow: 6 } } };
}

/* ---------- 문대표 강사 소개 페이지: 신청하기 링크 (새 창) · 마지막 안내 ‘5주’ → ‘4주’ (대표님 요청 2026-10-31) ---------- */
const MOON_APPLY = "https://m.site.naver.com/2iZFQ";
function moonApplyLink(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  const L = isObj(c.landing) ? clone(c.landing) : {}, result = {};
  if (!L.applyUrl) { L.applyUrl = MOON_APPLY; result.applyUrl = "넣음"; } else result.applyUrl = "이미 있음";
  if (isObj(L.cta) && L.cta.title === "5주 뒤, 내 이름의 브랜드 사장님이 되어 있을 거예요") { L.cta = Object.assign({}, L.cta, { title: "4주 뒤, 내 이름의 브랜드 사장님이 되어 있을 거예요" }); result.cta = "4주로"; }
  return { writes: { [k]: Object.assign({}, c, { landing: L }) }, result };
}

/* 문대표 무료강의 11/17(화) 저녁 7시 30분 — 대표 영상 · 오픈채팅(네이버 링크) · 선물 전자책 1편 지금 · 2편 11/9 · 3편 11/17 저녁 7시 · 포스터 날짜 · 자주 묻는 질문
 * 날짜 · 링크는 요청받은 값으로 바꾸고, 강사가 직접 넣은 대표 영상 · 썸네일 · 질문은 그대로 둬요 */
const MOON_FREE = {
  liveAt: "2026-11-17T19:30", intro: "https://www.youtube.com/watch?v=mPFHz1JQj3U", kakao: "https://m.site.naver.com/2iZFQ",
  gifts: [{ forceOpen: true, url: "https://book01.notion.site/VOD-28ed6f9dec6780f3901ad401c88019da?source=copy_link" }, { openAt: "2026-11-09T19:00", forceOpen: false, url: "https://book01.notion.site/VOD-28ed6f9dec6780f3901ad401c88019da?pvs=74" }, { openAt: "2026-11-17T19:00", forceOpen: false, url: "https://book01.notion.site/VOD-2c5d6f9dec6781caa41bf90cdab36f96" }],
  oldImage: "assets/landing/moon-thumb.jpg", image: "assets/landing/moon-thumb-1117.jpg",
  faq: { q: "무료강의는 언제 시작되나요?", a: "11월 17일(화) 저녁 7시 30분에 시작해요. 아시아 최초로 뉴질랜드 공장 승인을 받은 해외 건강식품 소량 제조 비법을, 이날 처음부터 끝까지 모두 공개해요. 저녁 7시에는 마지막 선물 전자책(3편)도 함께 열려요." }
};
function moonFree1117(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !isObj(c.freeClass)) return { writes: {}, result: { skipped: "문대표 무료강의 페이지 없음" } };
  const F = clone(c.freeClass), M = MOON_FREE, result = {};
  F.liveAt = M.liveAt; result.liveAt = M.liveAt;
  const it = isObj(F.intro) ? F.intro : {};
  if (!it.youtube) { F.intro = Object.assign({ title: "영상으로 먼저 만나보세요", desc: "무료강의 전에, 문대표가 직접 들려주는 이야기를 먼저 확인해 보세요." }, it, { youtube: M.intro }); result.intro = "대표 영상 넣음"; } else result.intro = "이미 있음";
  F.kakao = Object.assign({}, isObj(F.kakao) ? F.kakao : {}, { url: M.kakao }); result.kakao = M.kakao;
  const g = isObj(F.gifts) ? F.gifts : {}, items = Array.isArray(g.items) ? g.items.map((x) => (isObj(x) ? x : {})) : [];
  M.gifts.forEach((x, i) => { items[i] = Object.assign({}, items[i] || { title: (i + 1) + "번 선물", color: ["blue", "cyan", "ice"][i] }, x); });
  F.gifts = Object.assign({}, g, { items }); result.gifts = items.map((x) => (x.forceOpen ? "지금" : x.openAt));
  const L = isObj(F.live) ? Object.assign({}, F.live) : {};
  if (!L.image || L.image === M.oldImage) { L.image = M.image; result.image = "11/17 포스터"; } else result.image = "강사 썸네일 그대로";
  F.live = L;
  const fq = isObj(F.faq) ? Object.assign({}, F.faq) : {}, qs = (Array.isArray(fq.items) ? fq.items : []).map((x) => (isObj(x) ? Object.assign({}, x, { a: String(x.a || "").replace("5주 실전 클래스", "4주 실전 클래스") }) : x));
  if (!qs.some((x) => isObj(x) && /언제\s*시작/.test(String(x.q || "")))) { qs.unshift(Object.assign({}, M.faq)); result.faq = "‘언제 시작되나요?’ 맨 위에"; } else result.faq = "이미 있음";
  F.faq = Object.assign(fq, { items: qs });
  if (isObj(F.apply) && Array.isArray(F.apply.includes)) F.apply = Object.assign({}, F.apply, { includes: F.apply.includes.map((x) => String(x).replace("10/27(화) 오후 7시 30분", "11/17(화) 오후 7시 30분")) });
  return { writes: { [k]: Object.assign({}, c, { freeClass: F }) }, result };
}

/* 문대표 무료강의 2차 (2026-11-01): 좌우 영상 3개 끄기(대표 영상만) · ‘사전 미션’(새 구글폼) · 참여자 전원 증정 혜택 01~08
 * 사전 미션 문구 · 링크와 좌우 영상 끄기는 요청받은 대로 바꾸고, 증정 혜택은 비어 있을 때만 넣어요 (강사가 넣은 항목은 그대로) */
const MOON_MISSION = {
  question: { badge: "강의 전 필수 · 1분 소요", title: "문대표의 *사전 미션*", desc: "강의 전에 딱 1분만 내주세요.\n사전 미션을 완료하면 강의가 나에게 맞는 이야기로 바뀝니다.", promise: "", label: "사전 미션 하러 가기", url: "https://docs.google.com/forms/d/e/1FAIpQLSfMZBEB9Z5_RjKYqeeldP2vYBxW5fC-krFqzhxxGiHQz7F5Xg/viewform?usp=send_form", note: "구글폼으로 연결됩니다 · 약 1분 소요" },
  bonus: { kicker: "FOR EVERYONE", title: "무료강의 참여자 *전원 증정* 혜택", desc: "뉴질랜드 해외 건강식품의 모든 것, 강의에 참여하시면 아래 자료를 전부 받아 가실 수 있어요.", badge: "🎁 톡방 참여자 전원 공개 예정 🎁", note: "위 자료는 무료강의 당일, 톡방 참여자 전원에게 공개됩니다.",
    items: [
      { title: "1편_해외 건기식 브랜드, 왜 지금인가", desc: "국내 경쟁을 벗어나 뉴질랜드 건강식품 브랜드를 시작해야 하는 이유" },
      { title: "2편_사업자 준비부터 쇼핑몰 입점까지 (전자책 & VOD)", desc: "사업자 · 통신판매업 신고부터 스마트스토어 · 쿠팡 입점 순서" },
      { title: "3편_CAFE24 자사몰 구축 · 해외건강식품 CS (전자책 & VOD)", desc: "내 쇼핑몰 만들기부터 고객 응대까지 실전 운영" },
      { title: "수입식품 영업등록 · 통관 서류 체크리스트", desc: "위생교육 · 영업등록 · 통관에 필요한 서류를 한 장으로" },
      { title: "뉴질랜드 건강식품 마진 계산기", desc: "현지가 · 환율 · 배송비 · 수수료를 넣으면 순이익이 바로" },
      { title: "소량 제조로 시작하는 내 브랜드 제품 만들기", desc: "아시아 최초 공장 승인 · 적은 수량으로 시작하는 방법" },
      { title: "상세페이지 · 광고 표현 주의 문구 정리", desc: "건강식품 표시 · 광고에서 쓰면 안 되는 표현" },
      { title: "첫 판매부터 재구매까지 운영 로드맵", desc: "첫 주문 · 후기 · 재구매로 이어지는 브랜드 운영 루틴" }
    ] }
};
function moonFreeMission(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !isObj(c.freeClass)) return { writes: {}, result: { skipped: "문대표 무료강의 페이지 없음" } };
  const F = clone(c.freeClass), M = MOON_MISSION, result = {};
  F.off = Object.assign({}, isObj(F.off) ? F.off : {}, { videos: true }); result.videos = "좌우 영상 끔";
  if (F.off.intro) { delete F.off.intro; result.intro = "대표 영상 다시 켬"; }
  F.question = Object.assign({}, isObj(F.question) ? F.question : {}, M.question); result.question = "사전 미션 · 새 구글폼";
  const b = isObj(F.bonus) ? F.bonus : {};
  if (!(Array.isArray(b.items) && b.items.some((x) => isObj(x) && x.title))) { F.bonus = Object.assign({}, M.bonus, { items: M.bonus.items.map((x) => Object.assign({}, x)) }); result.bonus = "증정 혜택 8개 넣음"; } else result.bonus = "이미 있음";
  return { writes: { [k]: Object.assign({}, c, { freeClass: F }) }, result };
}

/* ---------- DOOGO CLASS: 초이 → 유나 (대표님 요청 2026-10-31) ----------
 * 초이 강사는 아직 DOOGO CLASS 정식 계약 전이라, 스토어(테스트 클래스)에서는 ‘유나’(AI로 만든 가상 인물 사진)로 보여요.
 * 바꾸는 곳: 스토어 데이터(meta.vod: 상품 · 배너 · 회원 태그 · 문구) · 결제 가격표(vcat) 상품 이름 · 주문(vo:*) 상품 이름 · 회원(vm:*) 태그.
 * 두잉고 강사 계정(ins:choi) · 두잉고 콘텐츠(content:choi)는 그대로 — 두잉고에서는 초이 이름 · 사진을 계속 써요.
 * ‘초이스’ 같은 다른 낱말은 건드리지 않아요. v22 표시를 남겨 화면이 같은 작업을 또 하지 않게 해요 */
const CHOI_RE = /초이(?!스)/g;
function storeChoiToYuna(get, keys) {
  const writes = {}, result = {};
  const meta = get("meta");
  const choiIds = new Set();
  if (isObj(meta) && isObj(meta.vod)) {
    const v = clone(meta.vod);
    let n = 0;
    (Array.isArray(v.products) ? v.products : []).forEach((p) => {
      if (!isObj(p) || !(p.iid === "choi" || /^초이$/.test(String(p.creator || "").trim()))) return;
      if (p.id) choiIds.add(p.id);
      if (typeof p.intro === "string" && /긱스쿨에서 강의 중인 초이/.test(p.intro)) { p.intro = p.intro.replace(/긱스쿨에서 강의 중인 초이/g, "AI 굿즈로 판매를 이어 가고 있는 유나"); n++; }
      if (p.tagline === "긱스쿨 AI 굿즈 강사") { p.tagline = "AI 굿즈 크리에이터"; n++; }
      if (/choi-profile/.test(String(p.creatorPhoto || ""))) { p.creatorPhoto = ""; n++; }
    });
    n += renameWordDeep(v, CHOI_RE, "유나");
    if (isObj(v.crm) && Array.isArray(v.crm.tags)) v.crm.tags = v.crm.tags.filter((t, i, a) => a.indexOf(t) === i); // ‘유나 팬’이 이미 있었으면 하나만
    v.v22 = 1;
    writes.meta = Object.assign({}, meta, { vod: v });
    result.vod = n;
  } else result.vod = "두고클래스 데이터 없음";
  const cat = get("vcat");
  if (isObj(cat) && Array.isArray(cat.products)) {
    const c2 = clone(cat); let n = 0;
    c2.products.forEach((p) => { if (isObj(p) && (p.iid === "choi" || choiIds.has(p.id)) && typeof p.title === "string") { const t = p.title.replace(CHOI_RE, "유나"); if (t !== p.title) { p.title = t; n++; } } });
    if (n) { writes.vcat = c2; result.vcat = n; }
  }
  let on = 0, mn = 0;
  keys("vo:").forEach((k) => {
    const o = get(k); if (!isObj(o)) return;
    const o2 = clone(o); let n = 0;
    const fix = (x) => { if (isObj(x) && typeof x.title === "string" && (choiIds.has(x.pid) || x.iid === "choi")) { const t = x.title.replace(CHOI_RE, "유나"); if (t !== x.title) { x.title = t; n++; } } };
    fix(o2); (Array.isArray(o2.items) ? o2.items : []).forEach(fix);
    if (n) { writes[k] = o2; on++; }
  });
  keys("vm:").forEach((k) => {
    const m = get(k); if (!isObj(m) || !Array.isArray(m.tags)) return;
    const tags = m.tags.map((t) => (typeof t === "string" ? t.replace(CHOI_RE, "유나") : t)).filter((t, i, a) => a.indexOf(t) === i);
    if (tags.length !== m.tags.length || tags.some((t, i) => t !== m.tags[i])) { writes[k] = Object.assign({}, m, { tags }); mn++; }
  });
  result.orders = on; result.members = mn;
  return { writes, result };
}

/* 위에서부터 차례로 (앞 작업 결과를 뒤 작업이 본다) */
/* ---------- 온드미디어 첫 계정 doogomd ----------
 * 비밀번호는 공개 저장소라 코드에 두지 않고, Vercel 환경 변수 MEDIA_INIT_PW 에서 읽어 해시로만 저장해요.
 * 환경 변수가 없으면 기록하지 않고 건너뛰어 다음 배포 때 다시 시도해요(retry). 이미 doogomd 가 있으면 건드리지 않아요. */
function mediaDoogomd(get) {
  const meta = get("meta");
  if (!isObj(meta)) return { writes: {}, result: { skipped: "meta 없음" }, retry: true };
  const A = require("./auth"), MD = require("./media"), list = Array.isArray(meta.media) ? meta.media : [];
  if (list.some((x) => x && A.koToKeys(String(x.loginId || "").replace(/\s+/g, "")).toLowerCase() === "doogomd")) return { writes: {}, result: { skipped: "doogomd 계정이 이미 있어요" } };
  const pw = String(process.env.MEDIA_INIT_PW || "").trim();
  if (!MD.pwOk(pw)) return { writes: {}, result: { skipped: "MEDIA_INIT_PW 환경 변수가 없어 다음 배포 때 다시 시도해요" }, retry: true };
  const used = new Set(list.map((x) => x && MD.codeOf(x.code)));
  const code = used.has("dgmd26") ? "dgmd" + Date.now().toString(36).slice(-4) : "dgmd26", at = Date.now();
  const acc = { id: "md-doogomd", loginId: "doogomd", pwHash: MD.hashOf(pw), pwAt: at, code, name: "두고미디어", channel: DOOGOMD_YT.channel, url: DOOGOMD_YT.url, subs: "", rate: "", email: "", phone: "", type: "biz", bizName: "주식회사 두고미디어", bizNo: "", bank: "", account: "", holder: "", memo: "첫 온드미디어 계정 (일회성 작업으로 만들었어요 · 구독자 수 · 정산 계좌를 채워 주세요)", status: "active", createdAt: at };
  return { writes: { meta: Object.assign({}, meta, { media: list.concat([acc]) }) }, result: { created: "doogomd", code } };
}

/* ---------- 예시 운영자 계정 중지 ----------
 * 예전 마스터 화면은 운영자 목록이 비어 있으면 예시 계정(김매니저 manager · 박정산 finance, 비밀번호 = 아이디)을 만들어 서버에도 저장했어요.
 * 운영자는 서버에서 마스터와 같은 권한이라, 비밀번호가 아직 예시 그대로인 예시 계정만 중지해요 (지우지 않아요 · 마스터 › 운영자 계정에서 다시 켤 수 있어요). */
function demoStaffStop(get) {
  const meta = get("meta");
  if (!isObj(meta) || !Array.isArray(meta.staff)) return { writes: {}, result: { skipped: "운영자 목록 없음" } };
  const DEF = { "st-demo1": "manager", "st-demo2": "finance" }, stopped = [];
  const staff = meta.staff.map((x) => {
    if (!x || !DEF[x.id] || x.status !== "active" || String(x.pw == null ? "" : x.pw).trim() !== DEF[x.id]) return x;
    stopped.push(x.loginId || x.id);
    return Object.assign({}, x, { status: "stopped" });
  });
  if (!stopped.length) return { writes: {}, result: { skipped: "중지할 예시 운영자 계정이 없어요" } };
  return { writes: { meta: Object.assign({}, meta, { staff }) }, result: { stopped } };
}

/* ---------- 온드미디어 doogomd 채널 (사용자 요청 2026-11-02) ----------
 * doogomd 계정의 YouTube 채널은 ‘돈맛스토리’예요. 채널 주소가 비어 있으면 채우고, 채널 이름이 첫 계정을 만들 때 넣은 기본값(두고미디어 YouTube) 그대로면
 * ‘돈맛스토리’로 바꿔요. 마스터가 이미 고친 값은 건드리지 않아요 (팀 이름 ‘두고미디어’는 그대로). */
const DOOGOMD_YT = { url: "https://www.youtube.com/@돈맛스토리", channel: "돈맛스토리" };
function mediaDoogomdChannel(get) {
  const meta = get("meta");
  if (!isObj(meta) || !Array.isArray(meta.media)) return { writes: {}, result: { skipped: "온드미디어 계정 없음" } };
  const i = meta.media.findIndex((x) => x && (x.id === "md-doogomd" || String(x.loginId || "").toLowerCase() === "doogomd"));
  if (i < 0) return { writes: {}, result: { skipped: "doogomd 계정 없음" } };
  const a = Object.assign({}, meta.media[i]), done = [];
  if (!String(a.url || "").trim()) { a.url = DOOGOMD_YT.url; done.push("url"); }
  const ch = String(a.channel || "").trim();
  if (!ch || ch === "두고미디어 YouTube") { a.channel = DOOGOMD_YT.channel; done.push("channel"); }
  if (!done.length) return { writes: {}, result: { skipped: "채널 정보가 이미 있어요" } };
  const media = meta.media.slice(); media[i] = a;
  return { writes: { meta: Object.assign({}, meta, { media }) }, result: { updated: done, channel: a.channel, url: a.url } };
}

/* 2026-11 수강권 6개월 · 12개월 · 재수강 할인: 클래스 FAQ · 고객센터 FAQ 의 예전 문구(180일 · 365일 · 3년 / 1년 연장권)만 새 문구로 + 재수강 할인 기본값(켜짐 · 40%)
 * 화면(vod.js seedV23)과 같은 바꾸기 — 강사 · 마스터가 직접 고친 다른 문장은 그대로 */
const PLAN_TXT = [[/\(180일 · 365일 · 3년(?:, 연장권은 365일)?\)/g, "(6개월 · 12개월)"], [/기간이 끝나면 1년 연장권으로 진도 그대로 이어서 들을 수 있어요\./g, "기간이 끝나면 재수강 할인가로 진도 그대로 다시 들을 수 있어요."]];
const planTxt = (t) => PLAN_TXT.reduce((a, r) => a.replace(r[0], r[1]), t);
function plans612(get) {
  const meta = get("meta");
  if (!isObj(meta) || !isObj(meta.vod)) return { writes: {}, result: { skipped: "두고클래스 데이터 없음" } };
  const vod = Object.assign({}, meta.vod); let n = 0, h = 0;
  vod.products = (Array.isArray(vod.products) ? vod.products : []).map((p) => {
    if (!isObj(p) || !Array.isArray(p.faq)) return p;
    let ch = false;
    const faq = p.faq.map((f) => {
      if (Array.isArray(f) && typeof f[1] === "string") { const t = planTxt(f[1]); if (t !== f[1]) { ch = true; n++; return [f[0], t].concat(f.slice(2)); } }
      else if (isObj(f) && typeof f.a === "string") { const t = planTxt(f.a); if (t !== f.a) { ch = true; n++; return Object.assign({}, f, { a: t }); } }
      return f;
    });
    return ch ? Object.assign({}, p, { faq }) : p;
  });
  if (Array.isArray(vod.helpFaq)) vod.helpFaq = vod.helpFaq.map((f) => { if (Array.isArray(f) && typeof f[2] === "string") { const t = planTxt(f[2]); if (t !== f[2]) { h++; return f.slice(0, 2).concat([t], f.slice(3)); } } return f; });
  const st = Object.assign({}, isObj(vod.settings) ? vod.settings : {}), rb = !isObj(st.rebuy);
  if (rb) st.rebuy = { on: true, pct: 40 };
  vod.settings = st; vod.v23 = 1;
  return { writes: { meta: Object.assign({}, meta, { vod }) }, result: { faq: n, helpFaq: h, rebuyDefault: rb } };
}

/* ---------- 문대표 코치: 담당 두잉고를 LIVE 로 (2026-11) ----------
 * 코치 메뉴를 LIVE 두잉고 / VOD 두잉고로 나누면서, 문대표가 만든 코치들은 LIVE 두잉고 코치로 (사용자 요청 · 담당 칸이 비어 있을 때만).
 * 메뉴 체크는 그대로 둬요 — VOD 메뉴가 체크돼 있어도 LIVE 담당이면 열리지 않고, 나중에 ‘둘 다’로 바꾸면 다시 보여요 */
function moonCoachesLive(get) {
  const ins = get("ins:moon");
  if (!isObj(ins) || !Array.isArray(ins.coaches) || !ins.coaches.length) return { writes: {}, result: { skipped: "문대표 코치 없음" } };
  let n = 0;
  const coaches = ins.coaches.map((c) => { if (!isObj(c) || c.track) return c; n++; return Object.assign({}, c, { track: "live" }); });
  if (!n) return { writes: {}, result: { skipped: "이미 담당이 정해져 있음" } };
  return { writes: { "ins:moon": Object.assign({}, ins, { coaches }) }, result: { live: n, total: coaches.length } };
}

/* ---------- 강사 입점 문의: 예시(테스트) 문의 지우기 (2026-11) ----------
 * 마스터 › 강사 입점 문의에 남아 있던 예시 3건(하지원 파트너 추천 예시 · 이메일 @example.com)만 지우고,
 * 실제로 들어온 문의(두고 파트너스 지원서 등)는 그대로 둬요 (사용자 요청). 예시인지는 id(inq-demo-…) 또는 예시 파트너 추천 코드 + 예시 이메일로만 골라요 */
const isDemoInq = (id, q) => isObj(q) && /@example\.com$/i.test(String(q.email || "").trim()) && (/^inq-demo-\d+$/.test(String(q.id || id)) || q.ref === "HAJIWON");
function demoInqClear(get, keys) {
  const writes = {}, result = { removed: [], kept: [] };
  keys("inq:").forEach((k) => {
    const q = get(k), id = k.slice(4);
    if (q == null) return;
    const tag = id + " · " + (q.status || "new") + (q.source ? " · " + q.source : "");
    if (isDemoInq(id, q)) { writes[k] = null; result.removed.push(tag); } else result.kept.push(tag);
  });
  return { writes, result };
}

/* ---------- 예시(테스트) 파트너 계정 지우기 (2026-11) ----------
 * 두고 파트너스(추천 파트너)에 남아 있던 예시 계정(id aff-demo · 추천 코드 HAJIWON 또는 아이디 partner)과 그 계정의 RS 지급 기록(aff-demo:…)만 지워요 (사용자 요청).
 * 실제 파트너 계정은 그대로. 그 예시 파트너가 소개한 것으로 남은 입점 문의가 있으면 지우지 않고 결과에만 적어요 */
const isDemoAff = (p) => isObj(p) && p.id === "aff-demo" && (p.code === "HAJIWON" || p.loginId === "partner");
function demoPartnerClear(get, keys) {
  const meta = get("meta");
  if (!isObj(meta) || !Array.isArray(meta.affiliates)) return { writes: {}, result: { skipped: "파트너 목록 없음" } };
  const gone = meta.affiliates.filter(isDemoAff), keep = meta.affiliates.filter((p) => !isDemoAff(p));
  const po = isObj(meta.affPayouts) ? Object.assign({}, meta.affPayouts) : null, poGone = po ? Object.keys(po).filter((k) => k.indexOf("aff-demo:") === 0) : [];
  poGone.forEach((k) => delete po[k]);
  const result = { removed: gone.map((p) => p.id), payouts: poGone, keptPartners: keep.length, inqLinked: keys("inq:").filter((k) => isObj(get(k)) && get(k).affId === "aff-demo") };
  if (!gone.length && !poGone.length) return { writes: {}, result: Object.assign(result, { skipped: "예시 파트너 없음" }) };
  return { writes: { meta: Object.assign({}, meta, { affiliates: keep }, po ? { affPayouts: po } : {}) }, result };
}

/* ---------- 문대표 기수 일정 다시 맞추기 (대표님 요청 2026-11-03) ----------
 * 실제 일정대로 기수 3개로: 1기 1/24(토)~2/21(토) 5주 · 2기 8/29(토)~9/19(토) + 5주차 9/23(수) · 3기 11/21(토)~12/12(토) 4주 압축 과정
 *   + 3기 특별 일정: 5주차 보너스 강의 12/15(화) · 챌린지 1~4회차 11/25 · 12/2 · 12/9 · 12/16(수)
 * 지금 ‘4기’(11/21 모집 중 · c4)를 ‘3기’로 이름만 바꾸고(신청 · 이용료 기록이 그대로 이어져요), 예전 예시 일정이던 ‘3기’(10/1 · c3)는 지워요.
 * 예전 3기에 있던 체험 수강생(demo)은 새 3기로 옮겨요. 체험이 아닌 수강생이나 이용료 기록이 있으면 지우지 않고 ‘예전 3기’로 이름만 바꿔 결과에 적어요.
 * 강의 시간은 기수에 정해 둔 그대로(1 · 2기 20:00 · 3기 12:00), 특별 일정 시간은 비워 둬요(설계 · 수정에서 넣어요).
 * 챌린지 · 보너스 강의는 이 기수 날짜로만: 처음 예시로 들어간 ‘모든 기수 반복’ 챌린지 · 보너스 강의 4개(e5 · b1 · b2 · b3, 예시 문구 그대로일 때만)는 지워요.
 * 강사 소개 페이지의 ‘4기 수강 신청하기’ 버튼 문구는 ‘3기 수강 신청하기’로 (그 문구 그대로일 때만). 다른 곳에 남은 ‘4기’ 글자는 바꾸지 않고 위치만 결과에 적어요 */
const MOON_PLAN = {
  c1: { name: "1기", startDate: "2026-01-24", classDow: 6, recruiting: false },
  c2: { name: "2기", startDate: "2026-08-29", classDow: 6, recruiting: false, classDates: { 5: "2026-09-23" } },
  c4: { name: "3기", startDate: "2026-11-21", classDow: 6, recruiting: true, curriculumId: "cur-4w", weeks: 4 },
  evs: [["e-m3-bonus", "bonus", "5주차 보너스 강의", "2026-12-15"], ["e-m3-ch1", "challenge", "챌린지 1회차", "2026-11-25"], ["e-m3-ch2", "challenge", "챌린지 2회차", "2026-12-02"], ["e-m3-ch3", "challenge", "챌린지 3회차", "2026-12-09"], ["e-m3-ch4", "challenge", "챌린지 4회차", "2026-12-16"]]
};
function moonCohortDates(get, keys) {
  const ck = "cohorts:moon", list = get(ck), c = get("content:moon");
  if (!Array.isArray(list) || !isObj(c)) return { writes: {}, result: { skipped: "문대표 기수 · 콘텐츠 없음" } };
  const find = (id, name) => list.find((x) => isObj(x) && x.id === id) || list.find((x) => isObj(x) && x.name === name);
  const c1 = find("c1", "1기"), c2 = find("c2", "2기"), c4 = find("c4", "4기") || list.find((x) => isObj(x) && x.startDate === "2026-11-21");
  const c3 = list.find((x) => isObj(x) && x !== c4 && (x.id === "c3" || x.name === "3기"));
  if (!c1 || !c2 || !c4) return { writes: {}, result: { skipped: "1기 · 2기 · 11/21 기수를 찾지 못했어요", ids: list.map((x) => x && x.id) } };
  const writes = {}, result = { cohorts: [], moved: [], removed: "", events: [], seedAll: [], bills: [], cta: [], left4: [] };
  const fix = (co, p) => { const n = Object.assign({}, co, p); if (!p.classDates) delete n.classDates; result.cohorts.push((co.name || co.id) + " → " + n.name + " " + n.startDate); return n; };
  const n1 = fix(c1, MOON_PLAN.c1), n2 = fix(c2, MOON_PLAN.c2), n4 = fix(c4, MOON_PLAN.c4);
  // 예전 3기: 체험 수강생은 새 3기로, 다른 수강생 · 이용료 기록이 있으면 남기고 이름만
  let keep3 = null;
  if (c3) {
    const stus = keys("stu:moon:").map((k) => [k, get(k)]).filter((x) => isObj(x[1]) && x[1].cohortId === c3.id);
    const real = stus.filter((x) => !x[1].demo), bills = keys("bill:moon:").filter((k) => isObj(get(k)) && get(k).cohortId === c3.id && !get(k).demo);
    stus.filter((x) => x[1].demo).forEach((x) => { writes[x[0]] = Object.assign({}, x[1], { cohortId: c4.id }); result.moved.push(x[1].id + " → " + n4.name); });
    if (real.length || bills.length) { keep3 = Object.assign({}, c3, { name: "예전 3기", recruiting: false }); result.removed = "남김 (수강생 " + real.length + "명 · 이용료 " + bills.length + "건) · 이름만 ‘예전 3기’"; }
    else result.removed = c3.name + " (" + c3.id + " · " + c3.startDate + ") 지움";
  }
  writes[ck] = list.map((x) => (x === c1 ? n1 : x === c2 ? n2 : x === c4 ? n4 : x === c3 ? keep3 : x)).filter(Boolean);
  // 특별 일정: 예전 3기(지울 때) 것은 빼고, 새 3기에 보너스 강의 · 챌린지 (같은 id가 있으면 그대로)
  const SEED_ALL = { e5: "첫 상품 등록 7일 챌린지 강의", b1: "보너스 강의 · 해외 도매몰 실전 발주 따라하기", b2: "광고 ROAS 3일 챌린지 강의", b3: "보너스 강의 · 상세페이지 첨삭 모음" };
  const sched = (Array.isArray(c.schedule) ? c.schedule : []).filter((e) => {
    if (!isObj(e)) return true;
    if (c3 && !keep3 && e.scope === "cohort" && e.cohortId === c3.id) return false;
    if (e.scope !== "cohort" && SEED_ALL[e.id] && SEED_ALL[e.id] === e.title) { result.seedAll.push(e.title); return false; }
    return true;
  });
  MOON_PLAN.evs.forEach(([id, type, title, date]) => {
    if (sched.some((e) => isObj(e) && (e.id === id || (e.scope === "cohort" && e.cohortId === c4.id && e.type === type && e.date === date)))) return;
    sched.push({ id, type, title, time: "", scope: "cohort", cohortId: c4.id, date }); result.events.push(date + " " + title);
  });
  const nc = Object.assign({}, c, { schedule: sched });
  // 강사 소개 페이지 신청 버튼 문구
  if (isObj(c.landing)) {
    const L = clone(c.landing);
    ["hero", "pricing"].forEach((k) => { if (isObj(L[k]) && L[k].ctaLabel === "4기 수강 신청하기") { L[k].ctaLabel = "3기 수강 신청하기"; result.cta.push(k); } });
    nc.landing = L;
  }
  // 바꾸지 않은 ‘4기’ 글자 위치 (대표님이 확인)
  (function walk(v, path) { if (typeof v === "string") { if (v.indexOf("4기") >= 0 && result.left4.length < 12) result.left4.push(path); } else if (v && typeof v === "object") Object.keys(v).forEach((k) => walk(v[k], path ? path + "." + k : k)); })(nc, "");
  writes["content:moon"] = nc;
  // 기수 이용료 기록: 11/21 기수 이름 4기 → 3기
  keys("bill:moon:").forEach((k) => { const b = get(k); if (isObj(b) && b.cohortId === c4.id && b.cohortName === "4기") { writes[k] = Object.assign({}, b, { cohortName: "3기" }); result.bills.push(k.split(":")[2]); } });
  return { writes, result };
}

/* ---------- 문대표 수업 캘린더 정리 (대표님 요청 2026-11-04) ----------
 * ① 강의 녹화본 업로드: 오프라인 강의(촬영) 다음 날 → 이틀 뒤로 자동 계산 (지금 ‘다음 날(1)’일 때만)
 * ② 일정 종류에 ‘온라인 강의’ (문대표 종류 목록의 오프라인 강의 바로 다음 · 달력 색 · 강의 날 표시는 오프라인 강의와 같아요)
 * ③ 3기 12/15(화) ‘5주차 보너스 강의’ → 문대표 ‘5주차 온라인 강의’: 종류와 이름 속 ‘보너스 강의’만 ‘온라인 강의’로 (날짜 · 시간 · 앞 글자는 그대로)
 * ④ 다른 강사님을 모신 특강(종류 ‘행사’ · 이름에 특강 · 특별강의 · 초청)은 종류만 ‘초청강사’로 — 수료식 같은 다른 행사는 그대로
 *  이미 바꾼 일정(종류가 다른 것)은 건드리지 않아요 · 결과에는 날짜만 적어요 */
function moonCalV2(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c) || !isObj(c.brand)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  const result = { replayAfter: "", types: "", online: [], guest: [], events: 0 };
  const brand = clone(c.brand), cal = isObj(brand.cal) ? brand.cal : null;
  let changed = false;
  if (cal) {
    if (Number(cal.replayAfter) === 1) { cal.replayAfter = 2; result.replayAfter = "1 → 2"; changed = true; } else result.replayAfter = "그대로 (" + cal.replayAfter + ")";
    if (Array.isArray(cal.types) && cal.types.indexOf("online") < 0) { const i = cal.types.indexOf("open"); cal.types.splice(i < 0 ? 0 : i + 1, 0, "online"); result.types = cal.types.join(" · "); changed = true; }
  } else result.replayAfter = "캘린더 설정 없음";
  const schedule = (Array.isArray(c.schedule) ? c.schedule : []).map((e) => {
    if (!isObj(e)) return e;
    const t = String(e.title || "");
    if (e.type === "bonus" && (e.id === "e-m3-bonus" || (e.date === "2026-12-15" && /5\s*주차/.test(t)))) {
      const title = /보너스\s*강의/.test(t) ? t.replace(/보너스\s*강의/, "온라인 강의") : t || "5주차 온라인 강의";
      result.online.push((e.date || "") + " " + title);
      return Object.assign({}, e, { type: "online", title });
    }
    if (e.type === "event" && /특강|특별\s*강의|초청/.test(t)) { result.guest.push(e.scope === "cohort" ? e.date || "" : (e.week || "") + "주차"); return Object.assign({}, e, { type: "guest" }); }
    if (e.type === "event") result.events++;
    return e;
  });
  if (!changed && !result.online.length && !result.guest.length) return { writes: {}, result: Object.assign(result, { skipped: "바꿀 것 없음" }) };
  return { writes: { [k]: Object.assign({}, c, { brand, schedule }) }, result };
}

/* ---------- 정식 운영: 테스트 데이터 정리 (사용자 요청 2026-11-03) ----------
 * 정식 오픈 전에 만들어 둔 테스트용 계정 · 기록을 지우고, 대표님이 직접 확인할 체험 계정은 하나씩만 남겨요.
 *  남겨요: 강사(실제 강사 그대로) · 수강생 체험 계정 이수진(s1 · 2186) · 코치 체험 계정(문대표 강의 김하나 1004) ·
 *         DOOGO CLASS 체험 계정(vod@gmail.com · demo 표시 · 0원 체험 주문) · 마스터(환경 변수 로그인)
 *  지워요: ① 두잉고 수강생 중 비밀번호(전화 뒷자리)가 0000인 테스트 수강생 + 진도 기록
 *         ② 처음 예시 VOD 회원(vm-demo · vm-2 · vm-3)에 딸린 두잉고 기록 (예: 박OO 님 예시 코칭 질문)
 *         ③ 중복 체험 계정 1기 체험단 · 2기 체험단 (demo 표시) + 진도 기록
 *         ④ DOOGO CLASS 회원 중 전화번호가 010-0000-0000인 테스트 회원(체험 계정 빼고) — 실제 결제(0원 넘는 결제 완료 · 환불) 주문이 있으면 지우지 않고 결과에만 적어요.
 *            그 회원의 이메일 · 카카오 연결, 진도, 0원 · 결제 전 주문, 후기 · 문의 · 다짐 기록도 같이 지워요
 *         ⑤ 테스트 코치(초이 강의 김하나 coach-hana · 메모에 ‘테스트’) ⑥ 예시 운영자 계정(manager · finance — 비밀번호가 예시 그대로일 때만)
 *  지운 항목은 이름을 가려 결과에 남겨요. 배포 직전 자동 백업이 있어 마스터 › 데이터 백업에서 되돌릴 수 있어요 */
const SEED_VM = ["vm-demo", "vm-2", "vm-3"];
const maskNm = (n) => { const s = String(n || "").trim(); return !s ? "이름 없음" : /체험/.test(s) ? s : s[0] + "OO"; };
const zeroPhone = (p) => String(p || "").replace(/\D/g, "") === "01000000000";
const realPaid = (o) => isObj(o) && Number(o.amount) > 0 && (o.status === "paid" || o.status === "refunded") && !o.demo;
function launchTestClean(get, keys) {
  const writes = {}, result = { students: [], members: [], membersKept: [], coaches: [], staff: [], kept: [] };
  // ④ DOOGO CLASS 테스트 회원
  const orders = keys("vo:").map((k) => [k, get(k)]).filter((x) => isObj(x[1]));
  const goneM = new Set();
  let demoMid = "";
  keys("vm:").forEach((k) => {
    const m = get(k); if (!isObj(m)) return;
    const id = m.id || k.slice(3);
    if (m.demo) { demoMid = demoMid || id; return; }
    if (!zeroPhone(m.phone)) return;
    const mine = orders.filter((x) => x[1].mid === id);
    const tag = maskNm(m.name) + " (" + id + ")";
    if (mine.some((x) => realPaid(x[1]))) { result.membersKept.push(tag + " · 실제 결제 주문이 있어 남김"); return; }
    goneM.add(id); writes[k] = null;
    if (m.email) { const ek = "vme:" + String(m.email).toLowerCase(); if (get(ek) != null) writes[ek] = null; }
    if (m.kakaoId && get("vmk:" + m.kakaoId) != null) writes["vmk:" + m.kakaoId] = null;
    if (get("vp:" + id) != null) writes["vp:" + id] = null;
    mine.forEach((x) => { writes[x[0]] = null; });
    result.members.push(tag + (mine.length ? " · 주문 " + mine.length + "건" : ""));
  });
  ["vr:", "vq:", "vpl:"].forEach((pre) => keys(pre).forEach((k) => { const x = get(k); if (isObj(x) && (goneM.has(x.mid) || (pre === "vq:" && goneM.has(k.split(":")[1])))) writes[k] = null; }));
  // ①②③ 두잉고 테스트 수강생
  keys("stu:").forEach((k) => {
    const s = get(k); if (!isObj(s)) return;
    const p = k.split(":"), iid = p[1], sid = p[2];
    const why = s.id === "s1" || sid === "s1" ? "" : s.vodMid && s.vodMid === demoMid ? "" :
      s.vodMid && SEED_VM.indexOf(s.vodMid) >= 0 ? "예시 VOD 회원" : s.vodMid && goneM.has(s.vodMid) ? "테스트 회원(010-0000-0000)" :
      String(s.phone4 || "") === "0000" ? "비밀번호 0000" : s.demo === true ? "중복 체험 계정" : "";
    if (!why) return;
    if (s.vodMid && !goneM.has(s.vodMid) && SEED_VM.indexOf(s.vodMid) < 0 && s.vodMid !== demoMid && get("vm:" + s.vodMid) != null) { result.membersKept.push(iid + " " + maskNm(s.name) + " (" + sid + ") · DOOGO CLASS 회원 기록이라 남김"); return; }
    writes[k] = null;
    if (get("prog:" + iid + ":" + sid) != null) writes["prog:" + iid + ":" + sid] = null;
    result.students.push(iid + " " + maskNm(s.name) + " (" + sid + ") · " + why);
  });
  // ⑤ 테스트 코치
  keys("ins:").forEach((k) => {
    const ins = get(k); if (!isObj(ins) || !Array.isArray(ins.coaches)) return;
    const gone = ins.coaches.filter((c) => isObj(c) && c.id === "coach-hana" && /테스트/.test(String(c.memo || "")));
    if (!gone.length) return;
    writes[k] = Object.assign({}, ins, { coaches: ins.coaches.filter((c) => gone.indexOf(c) < 0) });
    gone.forEach((c) => result.coaches.push(k.slice(4) + " " + maskNm(c.name) + " (" + c.id + ")"));
  });
  // ⑥ 예시 운영자 계정
  const meta = get("meta");
  if (isObj(meta) && Array.isArray(meta.staff)) {
    const DEF = { "st-demo1": "manager", "st-demo2": "finance" };
    const isDemo = (x) => isObj(x) && DEF[x.id] && String(x.pw == null ? "" : x.pw).trim() === DEF[x.id];
    const gone = meta.staff.filter(isDemo);
    if (gone.length) { writes.meta = Object.assign({}, meta, { staff: meta.staff.filter((x) => !isDemo(x)) }); gone.forEach((x) => result.staff.push(x.loginId || x.id)); }
  }
  // 남는 체험 계정 확인
  const s1 = keys("stu:").map((k) => get(k)).find((s) => isObj(s) && s.id === "s1");
  if (s1) result.kept.push("수강생 체험 계정 " + maskNm(s1.name) + " (s1)");
  const mc = (get("ins:moon") || {}).coaches || [];
  if (mc.some((c) => isObj(c) && c.id === "coach1")) result.kept.push("코치 체험 계정 문대표 강의 coach1");
  if (demoMid) result.kept.push("DOOGO CLASS 체험 계정 (" + demoMid + ")");
  return { writes, result };
}

/* ---------- 두잉고 LIVE 기수 정리 + 문대표 3기 메인 강사 강의 일정 (대표님 요청 2026-11-05) ----------
 * ① 문대표 말고는 아직 LIVE 기수가 없어요 → 다른 강사 기수(그 기수만의 특별 일정도)를 지워요. VOD 수강생은 기수가 따로(vod:<강사>)라 그대로예요.
 *    수강생(체험 계정 포함)이나 취소하지 않은 이용료 기록이 붙은 기수는 지우지 않고 결과에 적어요 (대표님이 확인)
 * ② 문대표는 1기 · 2기 · 3기만 — 다른 기수가 있으면 같은 규칙으로 지우거나 남겨요
 * ③ 3기 메인 강사 강의를 주차마다 (날짜 classDates · 시간 · 끝나는 시간 · 장소 · 주제 classOver)
 *    1주차 11/21(토) 13:30~18:30 3층 해외 건기식 OT · 2주차 11/22(일) 09:00~13:30 3층 브랜딩 · 3주차 12/5(토) 09:00~13:00 3층 자사몰 · 4주차 12/12(토) 09:00~13:30 2층 자동화
 *    5주차 12/15(화) 줌 19:00~22:00 광고의 모든것 — 커리큘럼(4주) 밖이라 이 기수 특별 일정(온라인 강의)으로 · 1주차 강의일이 11/21이 아니면 날짜는 건드리지 않고 적어요 */
const MOON3_LEC = {
  dates: { 2: "2026-11-22", 3: "2026-12-05", 4: "2026-12-12" },
  over: {
    1: { time: "13:30", end: "18:30", place: "3층", topic: "해외 건기식 OT" },
    2: { time: "09:00", end: "13:30", place: "3층", topic: "브랜딩" },
    3: { time: "09:00", end: "13:00", place: "3층", topic: "자사몰" },
    4: { time: "09:00", end: "13:30", place: "2층", topic: "자동화" }
  },
  zoom: { id: "e-m3-zoom5", date: "2026-12-15", time: "19:00", end: "22:00", place: "ZOOM 라이브", title: "5주차 온라인 강의 — 광고의 모든것" }
};
const MOON_KEEP = ["1기", "2기", "3기"];
function liveLectures(get, keys) {
  const SCH = require("../../shared/schedule");
  const writes = {}, result = { removed: [], kept: [], moon: [], zoom: "" };
  keys("cohorts:").forEach((k) => {
    const iid = k.slice(8), list = get(k);
    if (!iid || !Array.isArray(list)) return;
    const stus = keys("stu:" + iid + ":").map((x) => get(x)).filter(isObj), bills = keys("bill:" + iid + ":").map((x) => get(x)).filter((b) => isObj(b) && !b.canceledAt);
    const out = [], gone = [];
    list.forEach((co) => {
      if (!isObj(co)) return;
      if (iid === "moon" && MOON_KEEP.indexOf(co.name) >= 0) { out.push(co); return; }
      const ns = stus.filter((x) => x.cohortId === co.id).length, nb = bills.filter((b) => b.cohortId === co.id).length;
      if (ns || nb) { out.push(co); result.kept.push(iid + " " + (co.name || co.id) + " — 수강생 " + ns + "명 · 이용료 " + nb + "건이라 남김"); return; }
      gone.push(co.id); result.removed.push(iid + " " + (co.name || co.id) + " (" + co.id + ")");
    });
    if (!gone.length) return;
    writes[k] = out;
    const ck = "content:" + iid, c = get(ck);
    if (isObj(c) && Array.isArray(c.schedule)) {
      const sched = c.schedule.filter((e) => !(isObj(e) && e.scope === "cohort" && gone.indexOf(e.cohortId) >= 0));
      if (sched.length !== c.schedule.length) writes[ck] = Object.assign({}, c, { schedule: sched });
    }
  });
  // ③ 문대표 3기
  const mk = "cohorts:moon", ml = writes[mk] || get(mk);
  const c3 = Array.isArray(ml) ? ml.find((x) => isObj(x) && x.id === "c4" && x.name === "3기") || ml.find((x) => isObj(x) && x.name === "3기") : null;
  if (!c3) { result.moon.push("문대표 3기를 찾지 못했어요"); return { writes, result }; }
  const n3 = Object.assign({}, c3), ov = Object.assign({}, isObj(c3.classOver) ? c3.classOver : {});
  Object.keys(MOON3_LEC.over).forEach((n) => { ov[n] = Object.assign({}, isObj(ov[n]) ? ov[n] : {}, MOON3_LEC.over[n]); });
  n3.classOver = ov;
  if (c3.startDate === "2026-11-21") {
    const cd = Object.assign({}, isObj(c3.classDates) ? c3.classDates : {});
    Object.keys(MOON3_LEC.dates).forEach((n) => { const v = MOON3_LEC.dates[n]; if (v === SCH.baseClassDate(c3, Number(n))) delete cd[n]; else cd[n] = v; });
    if (Object.keys(cd).length) n3.classDates = cd; else delete n3.classDates;
    result.moon.push("3기 강의일 11/21 · 11/22 · 12/5 · 12/12 · 시간 · 장소 · 주제");
  } else result.moon.push("3기 1주차 강의일이 " + c3.startDate + " 이라 날짜는 그대로 · 시간 · 장소 · 주제만");
  writes[mk] = ml.map((x) => (x === c3 ? n3 : x));
  // 5주차 줌 강의: 12/15 이 기수 온라인(예전 보너스) 강의를 찾아 시간 · 끝나는 시간 · 장소 · 이름을 (입장 링크는 그대로) — 없으면 새로
  const ck = "content:moon", c = writes[ck] || get(ck), z = MOON3_LEC.zoom;
  if (isObj(c) && Array.isArray(c.schedule)) {
    let hit = false;
    const sched = c.schedule.map((e) => {
      if (hit || !isObj(e) || e.scope !== "cohort" || e.cohortId !== c3.id || e.date !== z.date || !(e.id === z.id || e.type === "online" || e.type === "bonus")) return e;
      hit = true;
      return Object.assign({}, e, { type: "online", time: z.time, end: z.end, place: z.place, title: z.title });
    });
    if (!hit) sched.push({ id: z.id, type: "online", title: z.title, time: z.time, end: z.end, place: z.place, scope: "cohort", cohortId: c3.id, date: z.date });
    writes[ck] = Object.assign({}, c, { schedule: sched });
    result.zoom = (hit ? "바꿈" : "새로 넣음") + " · 12/15 19:00~22:00 ZOOM 라이브";
  }
  return { writes, result };
}

/* ---------- AI 굿즈 클래스 상세 맨 위 영상 (대표님 요청 2026-11-08 · 탈잉처럼 저절로 도는 영상) ----------
 * ‘AI로 그림 그리고 굿즈로 파는 법’(v2) 상세 맨 위에 대표님이 준 유튜브 주소 그대로 (주소의 25분 58초부터 재생)
 * 영상 칸이 비어 있을 때만 넣고(마스터가 이미 다른 영상을 넣었으면 그대로), ‘영상 잠깐 끄기’가 켜져 있으면 끕니다 — 클래스가 없거나 이름이 다르면 건너뛰어요 */
const V2_TEASER = "https://www.youtube.com/watch?v=j7TDQ-D1M1s&t=1558s";
function v2Teaser(get) {
  const meta = get("meta");
  if (!isObj(meta) || !isObj(meta.vod) || !Array.isArray(meta.vod.products)) return { writes: {}, result: { skipped: "두고클래스 데이터 없음" } };
  const i = meta.vod.products.findIndex((p) => isObj(p) && p.id === "v2" && /굿즈/.test(String(p.title || "")));
  if (i < 0) return { writes: {}, result: { skipped: "AI 굿즈 클래스(v2) 없음" } };
  if (String(meta.vod.products[i].teaser || "").trim()) return { writes: {}, result: { teaser: "이미 있음 (그대로)" } };
  const v = clone(meta.vod), p = Object.assign({}, v.products[i], { teaser: V2_TEASER });
  delete p.teaserOff;
  v.products[i] = p;
  return { writes: { meta: Object.assign({}, meta, { vod: v }) }, result: { teaser: "넣음", start: "25:58" } };
}

/* ---------- 문대표 3기 커리큘럼 → ‘5주 기본 과정’(기본 커리큘럼) (대표님 요청 2026-11-09) ----------
 * 3기(11/21)가 ‘4주 압축 과정’(cur-4w)을 써서, 대표님이 고친 ‘5주 기본 과정’이 3기 수강생 화면에 안 보였어요 → 3기도 기본 커리큘럼으로.
 * 진행 주차(weeks)는 그대로 — 3기 일정(11/21~12/12 4주 · 12/15 5주차 보너스 강의)대로 5주 과정의 1~4주차가 보여요(5주 다 보이게 하려면 기수 설계 › 진행 주차).
 * ‘4주 압축 과정’ 커리큘럼 자체는 지우지 않아요 */
function moon3CurMain(get) {
  const ck = "cohorts:moon", list = get(ck), c = get("content:moon");
  if (!Array.isArray(list) || !isObj(c)) return { writes: {}, result: { skipped: "문대표 기수 · 콘텐츠 없음" } };
  const all = list.map((x, i) => [x, i]).filter((v) => isObj(v[0]) && v[0].name === "3기"), hit = all.find((v) => v[0].curriculumId) || all[0];
  if (!hit) return { writes: {}, result: { skipped: "3기를 찾지 못했어요", ids: list.map((x) => x && x.id) } };
  const co = hit[0], from = co.curriculumId || "main", wk = Number(co.weeks) || "전체";
  if (from === "main") return { writes: {}, result: { already: "3기는 이미 기본 커리큘럼(" + (c.curriculumName || "기본 커리큘럼") + ")", weeks: wk } };
  const cu = (Array.isArray(c.curricula) ? c.curricula : []).find((x) => isObj(x) && x.id === from), n = Object.assign({}, co), next = list.slice();
  delete n.curriculumId; next[hit[1]] = n;
  return { writes: { [ck]: next }, result: { cohort: co.name + " (" + co.id + ")", from: (cu && cu.name) || from, to: c.curriculumName || "기본 커리큘럼", mainWeeks: (Array.isArray(c.weeks) ? c.weeks : []).length, weeks: wk } };
}

/* ---------- 메뉴 순서: 주차별 강의 → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기 (2026-11-09 · 대표님 요청) ----------
 * 강사마다 저장된 수강생 메뉴 순서(ins.menu.items · 두잉고 LIVE)에서 과제 · 미션 · 실무 체크리스트 · 라이브 다시보기를 주차별 강의 바로 뒤로 모아요.
 * 켜기 · 끄기 · 바꾼 이름 · 다른 메뉴 · 추가 메뉴 순서는 그대로. VOD 버전 메뉴(menuVod)는 건드리지 않아요. 이미 그 순서면 그대로 */
const MENU_SEQ = ["curriculum", "missions", "docs", "replays"];
function menuSeq(items) {
  const at = items.findIndex((x) => isObj(x) && x.key === MENU_SEQ[0]);
  if (at < 0) return null;
  const pick = MENU_SEQ.slice(1).map((k) => items.find((x) => isObj(x) && x.key === k)).filter(Boolean);
  const rest = items.filter((x) => pick.indexOf(x) < 0), i = rest.indexOf(items[at]);
  const next = rest.slice(0, i + 1).concat(pick, rest.slice(i + 1));
  return next.every((x, j) => x === items[j]) ? null : next;
}
function menuOrder(get, keys) {
  const writes = {}, result = { changed: [], same: 0 };
  keys("ins:").forEach((k) => {
    const ins = get(k);
    if (!isObj(ins) || !isObj(ins.menu) || !Array.isArray(ins.menu.items)) return;
    const next = menuSeq(ins.menu.items);
    if (!next) { result.same++; return; }
    writes[k] = Object.assign({}, ins, { menu: Object.assign({}, ins.menu, { items: next }) });
    result.changed.push(k + ": " + next.filter((x) => isObj(x) && x.key !== "home").slice(0, 5).map((x) => x.key).join(" → "));
  });
  return { writes, result };
}

/* ---------- 문대표 1:1 상담 ACI EXPRESS · 제휴 혜택 13곳 (2026-11-09 · 대표님 요청) ----------
 * 1:1 상담: ACI EXPRESS(뉴질랜드 배송대행지 · 카카오톡 채널) 카드 하나 더 (두고푸드 다음).
 * 제휴 혜택: 두고그룹에 ACI EXPRESS, 제휴사에 12곳 (네이버 카페 글 링크). 카페 글은 자동으로 읽을 수 없어 서비스 소개는 짧게 · 혜택 · 할인 코드는 ‘카페 글에서 확인’.
 * 같은 id(또는 같은 링크)가 이미 있으면 건너뛰어요 — 강사가 고치거나 지운 건 그대로 */
const CAFE = "https://cafe.naver.com/doogomarket", TAIL = " 수강생 혜택 · 할인 코드는 카페 글에서 확인하세요.";
const MOON_ACI_CH = { id: "ch-aci", type: "kakao", icon: "truck", color: "#0891b2", tag: "입고 · 재고 관리", title: "ACI EXPRESS · 뉴질랜드 배송대행지",
  desc: "두고바이오에서 제품이 제조되면 ACI에 여러분의 제품이 입고돼요. 개인 계정 아이디를 받아 재고와 유통기한을 실시간으로 확인할 수 있어요.",
  url: "https://pf.kakao.com/_DnnxlX", hours: "", label: "ACI EXPRESS 문의하기" };
const pt = (id, icon, color, tag, title, desc, url) => ({ id, group: "partner", icon, color, tag, title, desc: desc + TAIL, url, label: "제휴 혜택 보기" });
const MOON_PARTNERS_1109 = [
  { id: "pt-aci", group: "doogo", icon: "truck", color: "#0891b2", tag: "뉴질랜드 배송대행지", title: "ACI EXPRESS",
    desc: "두고바이오에서 제조된 제품이 ACI에 입고돼요. 개인 계정 아이디로 내 재고와 유통기한을 실시간으로 확인할 수 있어요.", url: "https://naver.me/GCJxvUEn", label: "ACI EXPRESS 바로가기" },
  pt("pt-allo", "layers", "#6d28d9", "프로젝트 정리보드", "Allo", "아이디어 · 할 일 · 상품 기획을 한 보드에 정리하는 협업 툴이에요.", CAFE + "/15"),
  pt("pt-moai", "sparkles", "#db2777", "제휴 혜택", "모아이스튜디오", "수강생 전용 제휴 혜택이 있는 곳이에요.", CAFE + "/290"),
  pt("pt-postpixo", "image", "#0ea5e9", "CAFE24", "포스트픽소", "카페24 쇼핑몰에서 쓰는 앱이에요.", CAFE + "/29"),
  pt("pt-upright", "activity", "#f97316", "마케팅", "업라이트", "쇼핑몰 · 상품 마케팅을 도와주는 제휴사예요.", CAFE + "/188"),
  pt("pt-reviewhub", "message", "#16a34a", "마케팅", "리뷰허브", "상품 리뷰를 모으는 리뷰 마케팅 서비스예요.", CAFE + "/46"),
  pt("pt-sellerlife", "search", "#2563eb", "키워드 분석", "셀러라이프", "상품명 · 상세페이지에 쓸 키워드와 검색량을 분석하는 셀러용 툴이에요.", CAFE + "/151"),
  pt("pt-dal", "settings", "#475569", "CAFE24", "DAL 자동화", "카페24 쇼핑몰 운영 작업을 자동화해 주는 서비스예요.", CAFE + "/181"),
  pt("pt-chatbotnow", "bot", "#7c3aed", "CAFE24", "챗봇나우", "카페24 쇼핑몰에 상담 챗봇을 붙여 자주 묻는 질문에 자동으로 답해요.", CAFE + "/21"),
  pt("pt-reviewaid", "star", "#ca8a04", "CAFE24", "리뷰에이드", "카페24 쇼핑몰의 상품 리뷰를 모으고 관리하는 리뷰 앱이에요.", CAFE),
  pt("pt-keepgrow", "userPlus", "#0d9488", "CAFE24", "킵그로우 1초 회원가입", "카페24 쇼핑몰에 간편 회원가입을 붙여 가입 단계를 줄여 주는 앱이에요.", CAFE + "/183"),
  pt("pt-hwarang", "calculator", "#1e3a8a", "세무 · 기장", "화랑세무회계", "사업자 세무 신고와 기장을 맡길 수 있는 세무회계 사무소예요.", CAFE + "/23"),
  pt("pt-catchsell", "megaphone", "#e11d48", "인플루언서", "캐치셀", "상품을 알릴 인플루언서를 찾고 연결해 주는 서비스예요.", CAFE + "/45")
];
function moonAciPartners(get) {
  const k = "content:moon", c = get(k);
  if (!isObj(c)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  const ch = Array.isArray(c.channels) ? c.channels.slice() : null, ps = Array.isArray(c.partners) ? c.partners.slice() : [];
  const has = (list, x) => list.some((y) => isObj(y) && (y.id === x.id || (x.url && x.url !== CAFE && y.url === x.url) || (y.title === x.title && y.group === x.group)));
  const res = { channel: "그대로", partners: [] };
  if (ch && !has(ch, MOON_ACI_CH)) { ch.push(Object.assign({}, MOON_ACI_CH)); res.channel = "ACI EXPRESS 더함"; }
  MOON_PARTNERS_1109.forEach((x) => { if (!has(ps, x)) { const at = x.group === "doogo" ? ps.reduce((a, y, i) => (isObj(y) && y.group === "doogo" ? i + 1 : a), 0) : ps.length; ps.splice(at, 0, Object.assign({}, x)); res.partners.push(x.title); } });
  if (res.channel === "그대로" && !res.partners.length) return { writes: {}, result: { already: "이미 있어요" } };
  return { writes: { [k]: Object.assign({}, c, ch ? { channels: ch } : {}, { partners: ps }) }, result: res };
}

/* ---------- 문대표 2주차 시장조사 → 벤치마킹 과제 (2026-11-09 · 대표님 요청) ----------
 * 한국 마켓에 팔 상품이라 NZD 는 필요 없어요: 벤치마킹하고 싶은 브랜드를 찾고, 공식몰 판매가와 국내 최저 판매가를 찾는 과제.
 * 문대표 모든 커리큘럼(기본 + 다른 커리큘럼)의 2주차 ‘시장조사’ 과제(id m2-1 이거나 자동검수 단어에 NZD 가 있는 시장조사 과제)에서
 *  - 자동검수 ‘꼭 들어갈 단어’에서 NZD 빼기 (‘원’ 등 다른 단어는 그대로)
 *  - 설명 · 진행 방법을 벤치마킹 과제로 (마지막 단계는 제출 방식에 맞게)
 *  - 과제 양식: 머리글을 벤치마킹으로 바꾼 엑셀(forms/moon-w2-benchmark.xlsx · 배포 때 파일 저장소로)
 * 제목 · 과제 종류 · 제출 방식 · 최소 글자 수는 그대로. 이미 바뀌어 있으면 그대로.
 * 이미 낸 제출(prog:moon:*)의 자동검수 결과에 남은 ‘NZD’ 문구도 지워요 — 그것 하나 때문에 보완이었으면 통과로 (강사 검수 결과는 그대로) */
const W2B_DESC = "벤치마킹하고 싶은 브랜드를 정하고, 그 브랜드 상품의 공식몰 판매가와 국내 최저 판매가를 찾아보세요. 같은 용량과 구성의 상품을 기준으로 비교하고, 최저가를 확인한 판매처를 첨부 엑셀에 정리해 주세요. 한국 마켓에서 팔 상품이라 가격은 모두 원화로 적어요.";
const w2bSteps = (type) => [
  "자료실의 ‘뉴질랜드 건강식품 리스트’를 참고해 벤치마킹하고 싶은 브랜드와 상품 3개를 고르세요.",
  "첨부된 시장조사 엑셀을 내려받아 품목 · 브랜드 · 용량을 적으세요.",
  "브랜드 공식몰(공식 스토어)에서 일반 판매가를 찾아 원화로 적으세요.",
  "국내 쇼핑몰에서 같은 용량 · 구성의 최저 판매가와 판매처를 찾아 적고, 링크나 배송비 조건은 메모 칸에 남기세요.",
  type === "image" ? "작성한 엑셀을 캡처하거나 PDF로 저장해 올려 주세요." : type === "link" ? "작성한 시트(구글 시트 등) 링크를 제출하세요." : "브랜드 · 공식몰 판매가 · 최저 판매가 · 판매처를 아래 칸에 정리해 제출하세요."
];
const W2B_FILE = "2주차_벤치마킹_시장조사_양식.xlsx";
function w2bTemplate(old) {
  const fs = require("fs"), path = require("path"), buf = fs.readFileSync(path.join(__dirname, "forms", "moon-w2-benchmark.xlsx"));
  return { id: (old && old.id) || "t-m2-1", name: W2B_FILE, data: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + buf.toString("base64"), size: buf.length };
}
const isW2Research = (m) => isObj(m) && /시장조사/.test(String(m.title || "")) && (m.id === "m2-1" || (isObj(m.check) && Array.isArray(m.check.keywords) && m.check.keywords.indexOf("NZD") >= 0));
function moonW2Benchmark(get, keys) {
  const k = "content:moon", c = get(k);
  if (!isObj(c)) return { writes: {}, result: { skipped: "문대표 콘텐츠 없음" } };
  const mids = new Set();
  const lists = [["기본", c.weeks]].concat((Array.isArray(c.curricula) ? c.curricula : []).filter(isObj).map((cu) => [cu.name || cu.id, cu.weeks]));
  const done = [];
  lists.forEach(([name, weeks]) => (Array.isArray(weeks) ? weeks : []).forEach((w) => {
    if (!isObj(w) || Number(w.no) !== 2 || !Array.isArray(w.missions)) return;
    w.missions.forEach((m) => {
      if (!isW2Research(m)) return;
      if (m.id) mids.add(m.id);
      const kw = isObj(m.check) && Array.isArray(m.check.keywords) ? m.check.keywords : [];
      const tpl = Array.isArray(m.templates) ? m.templates : [];
      if (m.desc === W2B_DESC && kw.indexOf("NZD") < 0 && tpl.length === 1 && tpl[0].name === W2B_FILE) return;
      m.check = Object.assign({}, m.check);
      const left = kw.filter((x) => x !== "NZD");
      if (left.length) m.check.keywords = left; else delete m.check.keywords;
      m.desc = W2B_DESC; m.steps = w2bSteps(m.type); m.templates = [w2bTemplate(tpl[0])];
      done.push(name + " · " + m.title);
    });
  }));
  // 이미 낸 제출의 자동검수 결과에서 ‘NZD’ 문구 지우기
  const writes = done.length ? { [k]: c } : {}, fixed = { subs: 0, nowPass: 0 };
  (typeof keys === "function" ? keys("prog:moon:") : []).forEach((pk) => {
    const p = get(pk);
    if (!isObj(p) || !isObj(p.submissions)) return;
    let n = 0;
    mids.forEach((mid) => (Array.isArray(p.submissions[mid]) ? p.submissions[mid] : []).forEach((s) => {
      const r = isObj(s) && isObj(s.result) ? s.result : null;
      if (!r || !Array.isArray(r.reasons) || !r.reasons.some((t) => /^‘NZD’/.test(String(t)))) return;
      r.reasons = r.reasons.filter((t) => !/^‘NZD’/.test(String(t))); n++;
      if (!r.reasons.length && !r.pass) { r.pass = true; fixed.nowPass++; }
    }));
    if (n) { writes[pk] = p; fixed.subs += n; }
  });
  if (!Object.keys(writes).length) return { writes: {}, result: { already: "바꿀 과제가 없거나 이미 바뀌어 있어요" } };
  return { writes, result: { missions: done, submissions: fixed } };
}

/* ---------- 체험(테스트) 수강생 계정 지금 한 번 처음으로 (2026-11-09 · 대표님 요청) ----------
 * 앞으로는 로그인 · 로그아웃할 때마다 처음으로 돌아가요(api/_lib/demoreset.js). 배포 때 한 번: 모든 강사의 체험 계정(demo: true ·
 * 끝난 기수의 수료 체험 계정은 빼고) 진도 기록 — 과제 제출 · 강사 검수(체크 완료) · 시청 · 체크리스트 · 노트 · 가이드 — 을 처음으로 */
function demoResetNow(get, keys) {
  const DRS = require("./demoreset"), writes = {}, result = { reset: [], kept: [] };
  keys("stu:").forEach((k) => {
    const s = get(k), iid = k.split(":")[1];
    if (!isObj(s) || s.demo !== true) return;
    if (!DRS.resettable(s, get("cohorts:" + iid), get("content:" + iid))) { result.kept.push(iid + ":" + s.id + " (끝난 기수)"); return; }
    const pk = "prog:" + iid + ":" + s.id, p = get(pk);
    if (p != null && DRS.isFresh(p)) return;
    writes[pk] = DRS.fresh(); result.reset.push(iid + ":" + s.id);
  });
  if (!Object.keys(writes).length) return { writes: {}, result: Object.assign({ already: "처음으로 돌릴 체험 계정 기록이 없어요" }, result) };
  return { writes, result };
}

const OPS = [
  { id: "2026-10-08-docs-guide-6", note: "문대표 서류 준비 가이드를 6단계로", run: docsGuideSix },
  { id: "2026-10-08-motivation-videos", note: "문대표 동기부여 채널에 유튜브 영상 6개", run: motivationVideos },
  { id: "2026-10-08-moon-demo-accounts", note: "문대표 체험 계정(3기 이수진 · 1기 체험단 · 2기 체험단)만 남기기", run: moonDemoAccounts },
  { id: "2026-10-09-moon-profile-photo", note: "문대표 강사 프로필 사진 · 강의 분야 (첫 화면 강사 카드)", run: moonProfile },
  { id: "2026-10-09-billing-vat-included", note: "기수 이용료 부가세 방식을 '부가세 포함'으로", run: billingVatIncluded },
  { id: "2026-10-12-logic-farmer-photos", note: "로직메이커 · 황금농부 강사 프로필 사진 (사진이 비어 있을 때만)", run: logicFarmerPhotos },
  { id: "2026-10-13-menu-names-v15", note: "수강생 메뉴 이름 · AI 조교 이름 · 예전 메뉴 이름이 들어간 기본 문구를 새 이름으로 (기본값 그대로일 때만)", run: menuNamesV15 },
  { id: "2026-10-15-logic-to-bualnam", note: "강사 표시 이름 로직메이커 → 부알남 (로그인 이름은 그대로)", run: logicToBualnam },
  { id: "2026-10-16-food-quicklink-desc", note: "빠른 이동 두고푸드 설명 → 전문 식품 도매몰 · 사업자 전용가 (기본 문구일 때만)", run: foodQuickLinkDesc },
  { id: "2026-10-17-farmer-to-godfarmer", note: "강사 표시 이름 황금농부 → 갓농부 + 강의 분야 ‘귤 단 하나 팔아 월매출 10억’ (로그인 이름은 그대로)", run: farmerToGodFarmer },
  { id: "2026-10-29-vod-demo-member", note: "두고클래스 체험 계정 vod@gmail.com / vod + 산 강의 6개 (0원 체험 주문)", run: vodDemoMember },
  { id: "2026-10-30-hana-second-course", note: "테스트 코치 김하나(1004)가 초이 강의 코치도 맡기 (여러 강의 코치 로그인 확인용)", run: hanaSecondCourse },
  { id: "2026-10-30-moon-paper-book", note: "문대표 종이책 『내 인생의 추월차선은 내가 만든다』를 두고클래스 전자책 메뉴에 (택배 배송 · 15,900원)", run: moonBook },
  { id: "2026-10-30-store-bank-account", note: "두고클래스 무통장 입금 계좌 IBK기업은행 (주)두고홀딩스 (비어 있을 때만)", run: storeBank },
  { id: "2026-10-31-launch-reset-bills", note: "실제 운영 시작: 문대표 것을 뺀 기수 신청 · 매출 예시 기록 지우기 (계정은 그대로)", run: launchReset },
  { id: "2026-10-31-moon-4th-cohort", note: "문대표 4기를 11월 21일(토)부터 4주로", run: moon4th },
  { id: "2026-10-31-moon-apply-link", note: "문대표 강사 소개 페이지 신청하기 링크(네이버) · 마지막 안내 4주", run: moonApplyLink },
  { id: "2026-11-01-moon-free-1117", note: "문대표 무료강의 11/17(화) 19:30 · 대표 영상 · 오픈채팅(네이버) · 선물 전자책 공개일(1편 지금 · 2편 11/9 · 3편 11/17 저녁 7시) · 포스터 날짜 · 자주 묻는 질문", run: moonFree1117 },
  { id: "2026-11-01-moon-free-mission", note: "문대표 무료강의: 좌우 영상 3개 끄기(대표 영상만) · ‘문대표의 사전 미션’(새 구글폼 링크) · 참여자 전원 증정 혜택 01~08", run: moonFreeMission },
  { id: "2026-11-01-store-choi-to-yuna", note: "DOOGO CLASS 초이 → 유나 (스토어 상품 · 배너 · 회원 태그 · 가격표 · 주문 이름 / 두잉고 강사 초이는 그대로)", run: storeChoiToYuna },
  { id: "2026-11-01-demo-staff-stop", note: "예시 운영자 계정(manager · finance — 비밀번호가 아직 예시 그대로일 때만) 중지", run: demoStaffStop },
  { id: "2026-11-01-media-doogomd", note: "온드미디어 첫 계정 doogomd (비밀번호는 Vercel 환경 변수 MEDIA_INIT_PW · 해시로만 저장)", run: mediaDoogomd, when: () => !!String(process.env.MEDIA_INIT_PW || "").trim() },
  { id: "2026-11-02-media-doogomd-channel", note: "온드미디어 doogomd 채널: YouTube 돈맛스토리 주소 · 채널 이름 (비어 있거나 기본값일 때만)", run: mediaDoogomdChannel },
  { id: "2026-11-03-plans-6-12-rebuy", note: "수강권 6개월 · 12개월 · 재수강 40% 할인: 클래스 FAQ · 고객센터 FAQ 예전 문구(180일 · 365일 · 3년 / 1년 연장권)만 새 문구로 + 재수강 할인 기본값", run: plans612 },
  { id: "2026-11-03-moon-coaches-live", note: "문대표 코치들을 LIVE 두잉고 담당으로 — 코치 메뉴를 LIVE · VOD로 나누기 (담당 칸이 비어 있을 때만 · 메뉴 체크는 그대로)", run: moonCoachesLive },
  { id: "2026-11-03-demo-inquiries-clear", note: "강사 입점 문의: 예시(테스트) 문의 3건 지우기 — 예시 id · 예시 파트너 추천 · @example.com 이메일만 (실제 문의는 그대로)", run: demoInqClear },
  { id: "2026-11-03-demo-partner-clear", note: "두고 파트너스: 예시(테스트) 파트너 계정과 그 RS 지급 기록만 지우기 (실제 파트너는 그대로)", run: demoPartnerClear },
  { id: "2026-11-03-launch-test-clean", note: "정식 운영: 테스트 데이터 정리 — 0000 테스트 수강생 · 예시 VOD 회원 기록 · 중복 체험단 · 010-0000-0000 테스트 회원 · 테스트 코치 · 예시 운영자 지우기 (체험 계정은 하나씩 남김)", run: launchTestClean },
  { id: "2026-11-03-moon-cohort-dates", note: "문대표 기수 일정: 1기 1/24~2/21 · 2기 8/29~9/23(5주차 수) · 지금 4기(11/21)를 3기로 + 5주차 보너스 강의 12/15(화) · 챌린지 4회(11/25 · 12/2 · 12/9 · 12/16) · 예시였던 예전 3기(10/1) 지우기", run: moonCohortDates },
  { id: "2026-11-04-moon-cal-v2", note: "문대표 수업 캘린더: 강의 녹화본 업로드를 오프라인 강의 이틀 뒤로 · 일정 종류 ‘온라인 강의’ · 3기 12/15 5주차 보너스 강의 → 5주차 온라인 강의 · 특강(행사) → 초청강사", run: moonCalV2 },
  { id: "2026-11-05-live-lectures", note: "두잉고 LIVE 기수 정리: 문대표 말고 다른 강사 기수 지우기(수강생 · 이용료 기록이 있으면 남김) · 문대표 1~3기만 · 3기 메인 강사 강의(주차마다 날짜 · 시간 · 끝나는 시간 · 장소 · 주제) · 5주차 줌 강의 12/15 19:00~22:00", run: liveLectures },
  { id: "2026-11-08-v2-teaser", note: "AI 굿즈 클래스(v2) 상세 맨 위 영상: 유튜브 주소(25분 58초부터) — 영상 칸이 비어 있을 때만", run: v2Teaser },
  { id: "2026-11-09-moon3-cur-main", note: "문대표 3기 커리큘럼: 4주 압축 과정 → 5주 기본 과정(기본 커리큘럼) — 진행 주차는 그대로", run: moon3CurMain },
  { id: "2026-11-09-moon-aci-partners", note: "문대표 1:1 상담에 ACI EXPRESS(뉴질랜드 배송대행지 · 카카오톡 채널) · 제휴 혜택에 두고그룹 ACI EXPRESS + 제휴사 12곳(네이버 카페 글) — 이미 있으면 그대로", run: moonAciPartners },
  { id: "2026-11-09-moon-w2-benchmark", note: "문대표 2주차 시장조사 과제 → 벤치마킹(브랜드 · 공식몰 판매가 · 국내 최저 판매가): 자동검수 단어에서 NZD 빼기 · 설명 · 진행 방법 · 엑셀 양식 머리글 (제목 · 제출 방식 · 최소 글자 수는 그대로)", run: moonW2Benchmark },
  { id: "2026-11-09-demo-reset", note: "체험(테스트) 수강생 계정 진도 기록을 지금 한 번 처음으로 (모든 강사 · 끝난 기수의 수료 체험 계정은 그대로) — 앞으로는 로그인 · 로그아웃할 때마다", run: demoResetNow },
  { id: "2026-11-09-menu-order", note: "수강생 메뉴 순서: 주차별 강의 → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기 (강사마다 저장된 순서 · 켜기 · 이름은 그대로 · VOD 메뉴는 그대로)", run: menuOrder },
];

module.exports = { OPS, demoResetNow, moonW2Benchmark, W2B_DESC, W2B_FILE, moonAciPartners, MOON_ACI_CH, MOON_PARTNERS_1109, menuOrder, menuSeq, moon3CurMain, v2Teaser, V2_TEASER, liveLectures, MOON3_LEC, moonCalV2, moonCohortDates, launchTestClean, demoPartnerClear, demoInqClear, moonCoachesLive, plans612, demoStaffStop, mediaDoogomd, mediaDoogomdChannel, storeChoiToYuna, fullProgress, docsGuideSix, motivationVideos, moonDemoAccounts, moonProfile, billingVatIncluded, menuNamesV15, logicToBualnam, foodQuickLinkDesc, farmerToGodFarmer, vodDemoMember, hanaSecondCourse, moonBook, storeBank, STORE_BANK, launchReset, moon4th, moonApplyLink, MOON_APPLY, moonFree1117, MOON_FREE, moonFreeMission, MOON_MISSION };
