/* DB 전환 2부 B2~B6 — 문서 종류마다 제 표 (2026-11-05)
 *
 *  지금까지는 거의 모든 데이터가 docs 표 한 곳에 JSON 문서로 있었어요. 2부에서는 문서 종류마다 제 표를 만들어요.
 *    · 표 한 줄 = 문서 하나: k(문서 키) → 사람이 읽고 찾고 더하는 값(금액 · 상태 · 회원 · 시각 …)을 열로 먼저 → 맨 오른쪽에
 *      v(문서 JSON 글자 그대로 — 화면 · API 가 받는 모양이 한 글자도 안 바뀌어요) · ver · updated · created (2026-11-06: v 를 맨 뒤로 · 시각은 한국 시간으로 —
 *      Supabase Table Editor 에서 표를 열면 JSON 이 아니라 보통 표처럼 보이게. 예전 모양 표는 배포 때 내용 그대로 다시 만들어요 · areasync.rebuild)
 *      열은 저장할 때마다 v 에서 다시 만들어서 v 와 어긋나지 않아요.
 *    · 문서 하나에 여러 건이 든 것(입금 알림 · 기수 · 상품 · 쿠폰 · 운영자 · 지급 · 코치 · 진도)은 ‘한 건 = 한 줄’ 표도 같이 (자식 표 · 문서와 같은 트랜잭션에서 다시 만들어요)
 *    · 비밀번호 해시 · 로그인 숫자(전화 뒷자리)는 열로 꺼내지 않아요 (v 안에만)
 *    · 쓰기를 막을 수 있는 제약(다른 표를 가리키는 외래 키 · 허용 값 목록)은 걸지 않아요 — 영역마다 따로 켜고 끄기 때문이에요. 대신 찾는 열마다 색인 · 배포 때 비교
 *
 *  영역 스위치 DB_AREAS (Vercel 환경 변수 · 예: "B2:dual,B3:dual" · 모두 같게: "all:table")
 *    off    (기본) 예전처럼 docs 표만
 *    dual   docs 와 제 표에 같이 쓰기 · 읽기는 docs  ← 표 만들기 · 같이 쓰기 · 매일(배포마다) 비교
 *    table  같이 쓰기 · 읽기는 제 표                ← 표에서 읽기
 *    only   제 표에만 (docs 의 그 문서는 배포 때 지워요) ← 문서 쓰기 끝
 *  한 번에 한 칸씩만 옮겨요 (off ↔ dual ↔ table ↔ only) — 배포하는 동안 예전 서버 함수가 쓰는 내용을 놓치지 않게. 배포 빌드가 지난 칸을 기억해(area_state 표) 건너뛰면 멈춰요.
 *  되돌리기: 한 칸씩 거꾸로 (only → table 이면 배포 때 표 → docs 로 다시 채워요). 자세한 것은 class/README.md 의 ‘2부 B2~B6’ */
"use strict";

const ORDER = ["off", "dual", "table", "only"];
const AREAS = [
  { id: "B2", name: "주문 · 결제" },
  { id: "B3", name: "DOOGO CLASS 회원" },
  { id: "B4", name: "두잉고 강의실" },
  { id: "B5", name: "이용료 · 문의 · 후기 · 지급" },
  { id: "B6", name: "설정 · 상품 · 쿠폰 · 운영자" }
];

/* ---------- 값 꺼내기 ---------- */
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => { const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN; return Number.isFinite(n) ? Math.round(n) : null; };
const txt = (x, max) => (x == null || typeof x === "object" ? null : String(x).slice(0, max || 300));
const yes = (x) => (x == null ? null : x === true || x === 1 || x === "true");
const cnt = (x) => (Array.isArray(x) ? x.length : isObj(x) ? Object.keys(x).length : 0);
const part = (k, i) => String(k).split(":")[i] || null;
const after = (k, pre) => String(k).slice(pre.length) || null;

/* ---------- 표 ----------
 *  cols: [열 이름, 종류(text · int · time · bool), (v, k) → 값, 한국어 설명] — time: ms 시각을 한국 시간 "2026-11-06 14:30:00" 으로 (Postgres timestamp · SQLite 글자)
 *  children: [{ table, cols, rows: (v, k) → [한 건 …] }] — 자식 표는 (k, i) 가 키 (i = 문서 안 순서)
 *  prefix 로 시작하는 키 · 또는 keys 에 든 키가 이 표로 가요 */
const TABLES = [
  // ---------------- B2 주문 · 결제 ----------------
  { area: "B2", table: "orders", label: "주문", prefix: "vo:", index: ["mid", "status", "paid_at", "payment_id", "pid"], cols: [
    ["no", "text", (v, k) => txt(v.no) || after(k, "vo:"), "주문번호"],
    ["mid", "text", (v) => txt(v.mid), "회원 id"],
    ["pid", "text", (v) => txt(v.pid), "상품 id"],
    ["iid", "text", (v) => txt(v.iid), "강사 id"],
    ["kind", "text", (v) => txt(v.kind), "종류"],
    ["title", "text", (v) => txt(v.title), "상품 이름"],
    ["list_price", "int", (v) => num(v.list), "정가"],
    ["sale_price", "int", (v) => num(v.sale), "판매가"],
    ["coupon_off", "int", (v) => num(v.couponOff), "쿠폰 할인"],
    ["point_off", "int", (v) => num(v.pointOff), "포인트 사용"],
    ["amount", "int", (v) => num(v.amount), "결제 금액(원)"],
    ["method", "text", (v) => txt(v.method), "결제 수단"],
    ["status", "text", (v) => txt(v.status), "상태 (ready · paid · refunded · failed …)"],
    ["payment_id", "text", (v) => txt(v.paymentId), "포트원 결제 id"],
    ["grp", "text", (v) => txt(v.grp), "묶음 주문의 대표 주문번호"],
    ["ordered_at", "time", (v) => num(v.at != null ? v.at : v.createdAt), "주문 시각(한국 시간)"],
    ["paid_at", "time", (v) => num(v.paidAt), "결제 시각(한국 시간)"],
    ["refunded_at", "time", (v) => num(v.refundedAt), "환불 시각(한국 시간)"],
    ["refund_amount", "int", (v) => num(v.refundAmount), "환불 금액"],
    ["refund_kind", "text", (v) => txt(v.refundKind), "환불 종류"],
    ["demo", "bool", (v) => !!v.demo, "체험 주문"]
  ] },
  { area: "B2", table: "payments", label: "결제(포트원)", prefix: "vpay:", index: ["mid"], cols: [
    ["payment_id", "text", (v, k) => after(k, "vpay:"), "포트원 결제 id"],
    ["mid", "text", (v) => txt(v.mid), "회원 id"],
    ["total", "int", (v) => num(v.total), "합계(원)"],
    ["at", "time", (v) => num(v.at), "시각(한국 시간)"],
    ["orders", "int", (v) => cnt(v.nos), "주문 수"],
    ["bank", "bool", (v) => !!v.bank, "무통장 · 가상계좌"]
  ], children: [
    { table: "payment_orders", label: "결제에 묶인 주문", index: ["order_no"], rows: (v) => arr(v.nos).map((no) => ({ no })), cols: [
      ["order_no", "text", (x) => txt(x.no), "주문번호"]
    ] }
  ] },
  { area: "B2", table: "bank_log", label: "입금 알림 기록", keys: ["vbank"], cols: [
    ["n", "int", (v) => cnt(v.recent), "최근 입금 알림 수"]
  ], children: [
    { table: "bank_deposits", label: "입금 알림", index: ["order_no", "at"], rows: (v) => arr(v.recent), cols: [
      ["id", "text", (x) => txt(x.id, 80), "은행 거래 id"],
      ["at", "time", (x) => num(x.at), "입금 시각(한국 시간)"],
      ["got_at", "time", (x) => num(x.got), "알림 받은 시각(한국 시간)"],
      ["name", "text", (x) => txt(x.name, 30), "입금자"],
      ["amount", "int", (x) => num(x.amount), "금액"],
      ["bank", "text", (x) => txt(x.bank, 20), "은행"],
      ["st", "text", (x) => txt(x.st, 20), "맞춘 상태 (ok · many · none · linked · fail)"],
      ["order_no", "text", (x) => txt(x.no, 40), "주문번호"]
    ] }
  ] },
  // ---------------- B3 DOOGO CLASS 회원 ----------------
  { area: "B3", table: "members", label: "DOOGO CLASS 회원", prefix: "vm:", index: ["email", "created_at"], cols: [
    ["id", "text", (v, k) => txt(v.id) || after(k, "vm:"), "회원 id"],
    ["via", "text", (v) => txt(v.via), "가입 경로 (email · kakao)"],
    ["email", "text", (v) => txt(v.email), "이메일"],
    ["name", "text", (v) => txt(v.name), "이름"],
    ["phone", "text", (v) => txt(v.phone, 30), "전화"],
    ["points", "int", (v) => num(v.points), "포인트"],
    ["marketing", "bool", (v) => !!v.marketing, "마케팅 동의"],
    ["kakao_id", "text", (v) => txt(v.kakaoId, 40), "카카오 회원번호"],
    ["created_at", "time", (v) => num(v.createdAt), "가입 시각(한국 시간)"],
    ["last_login_at", "time", (v) => num(v.lastLoginAt), "마지막 로그인(한국 시간)"],
    ["login_n", "int", (v) => num(v.loginN), "로그인 수"],
    ["orders", "int", (v) => cnt(v.orderNos), "주문 수"],
    ["demo", "bool", (v) => !!v.demo, "체험 계정"]
  ], children: [
    // 2026-11-08: 회원이 받은 쿠폰도 한 장씩 (가입 쿠폰 · 코드 등록 · 상세에서 받기 · 다짐 쿠폰 cp-pledge) — 원본은 회원 문서(v)의 coupons
    { table: "member_coupons", label: "회원이 받은 쿠폰 (한 장 = 한 줄 · cp-pledge = 다짐 쿠폰)", index: ["mid", "cid"], rows: (v, k) => arr(isObj(v) && v.coupons).map((x) => (isObj(x) ? Object.assign({ mid: after(k, "vm:") }, x) : null)), cols: [
      ["id", "text", (x) => txt(x.id), "받은 쿠폰 id"],
      ["mid", "text", (x) => txt(x.mid), "회원 id"],
      ["cid", "text", (x) => txt(x.cid), "쿠폰 id (cp-pledge = 다짐 쿠폰)"],
      ["pid", "text", (x) => txt(x.pid), "쓸 수 있는 클래스 (비면 모든 클래스)"],
      ["value", "int", (x) => num(x.value), "할인 금액 (다짐 쿠폰 · 쿠폰 표의 값이 따로 있으면 비어요)"],
      ["exp", "text", (x) => txt(x.exp, 10), "쓸 수 있는 마지막 날"],
      ["at", "time", (x) => num(x.at), "받은 시각(한국 시간)"],
      ["used_at", "time", (x) => num(x.usedAt), "쓴 시각(한국 시간)"],
      ["order_no", "text", (x) => txt(x.orderNo, 40), "쓴 주문번호"]
    ] }
  ] },
  { area: "B3", table: "member_logins", label: "회원 로그인 방법", prefixes: ["vme:", "vmk:"], index: ["mid"], cols: [
    ["method", "text", (v, k) => (/^vme:/.test(k) ? "email" : "kakao"), "방식 (email · kakao)"],
    ["value", "text", (v, k) => String(k).slice(4), "이메일 · 카카오 회원번호"],
    ["mid", "text", (v) => txt(v.id), "회원 id"]
  ] },
  { area: "B3", table: "vod_progress", label: "VOD 진도", prefix: "vp:", cols: [
    ["mid", "text", (v, k) => after(k, "vp:"), "회원 id"],
    ["products", "int", (v) => cnt(v), "본 상품 수"]
  ], children: [
    { table: "vod_progress_items", label: "상품별 VOD 진도", index: ["pid"], rows: (v) => (isObj(v) ? Object.keys(v).map((pid) => Object.assign({ pid }, isObj(v[pid]) ? v[pid] : {})) : []), cols: [
      ["pid", "text", (x) => txt(x.pid), "상품 id"],
      ["seen", "int", (x) => cnt(x.seen), "본 강의 수"],
      ["done", "int", (x) => cnt(x.done), "끝낸 강의 수"],
      ["mat", "int", (x) => num(x.mat), "자료 내려받은 횟수"],
      ["last_seen_at", "time", (x) => { const t = isObj(x.seen) ? Object.values(x.seen).map(num).filter((n) => n != null) : []; return t.length ? Math.max.apply(null, t) : null; }, "마지막으로 본 시각(한국 시간)"]
    ] }
  ] },
  // ---------------- B4 두잉고 강의실 ----------------
  { area: "B4", table: "instructors", label: "강사", prefix: "ins:", cols: [
    ["id", "text", (v, k) => txt(v.id) || after(k, "ins:"), "강사 id"],
    ["name", "text", (v) => txt(v.name), "이름"],
    ["display_name", "text", (v) => txt(v.displayName), "표시 이름"],
    ["status", "text", (v) => txt(v.status), "상태"],
    ["created_at", "text", (v) => txt(v.createdAt), "등록일"],
    ["tracks", "text", (v) => (isObj(v.tracks) ? Object.keys(v.tracks).filter((t) => v.tracks[t]).join(",") : txt(v.tracks)), "열린 두잉고 (live · vod)"],
    ["coaches", "int", (v) => cnt(v.coaches), "코치 수"]
  ], children: [
    { table: "coaches", label: "코치", index: ["id"], rows: (v) => arr(v.coaches), cols: [
      ["id", "text", (x) => txt(x.id), "코치 id"],
      ["name", "text", (x) => txt(x.name), "이름"],
      ["status", "text", (x) => txt(x.status), "상태"],
      ["track", "text", (x) => txt(x.track), "맡은 두잉고 (live · vod)"],
      ["created_at", "text", (x) => txt(x.createdAt), "등록일"],
      ["last_login_at", "time", (x) => num(x.lastLoginAt), "마지막 로그인(한국 시간)"]
    ] }
  ] },
  { area: "B4", table: "cohort_lists", label: "강사별 기수 목록", prefix: "cohorts:", cols: [
    ["iid", "text", (v, k) => after(k, "cohorts:"), "강사 id"],
    ["n", "int", (v) => cnt(v), "기수 수"]
  ], children: [
    { table: "cohorts", label: "기수", index: ["id"], rows: (v) => arr(v), cols: [
      ["id", "text", (x) => txt(x.id), "기수 id"],
      ["iid", "text", (x) => txt(x.instructorId), "강사 id"],
      ["name", "text", (x) => txt(x.name), "기수"],
      ["start_date", "text", (x) => txt(x.startDate, 20), "1주차 강의일"],
      ["class_dow", "int", (x) => num(x.classDow), "요일 (0=일)"],
      ["class_time", "text", (x) => txt(x.classTime, 20), "강의 시간"],
      ["class_end", "text", (x) => txt(x.classEnd, 20), "끝나는 시간"],
      ["place", "text", (x) => txt(x.classPlace), "장소"],
      ["weeks", "int", (x) => num(x.weeks), "주차 수"],
      ["curriculum_id", "text", (x) => txt(x.curriculumId), "커리큘럼"],
      ["recruiting", "bool", (x) => yes(x.recruiting), "모집 중"]
    ] }
  ] },
  { area: "B4", table: "students", label: "두잉고 수강생", prefix: "stu:", index: ["iid", "cohort_id", "vod_mid"], cols: [
    ["iid", "text", (v, k) => part(k, 1), "강사 id"],
    ["id", "text", (v, k) => txt(v.id) || part(k, 2), "수강생 id"],
    ["cohort_id", "text", (v) => txt(v.cohortId), "기수 id"],
    ["track", "text", (v) => txt(v.track), "두잉고 (live · vod)"],
    ["name", "text", (v) => txt(v.name), "이름"],
    ["status", "text", (v) => txt(v.status), "상태"],
    ["applied_at", "text", (v) => txt(v.appliedAt), "신청일"],
    ["vod_mid", "text", (v) => txt(v.vodMid), "DOOGO CLASS 회원 id"],
    ["source", "text", (v) => txt(v.source), "들어온 길"],
    ["joined_at", "time", (v) => num(v.joinedAt), "입장 시각(한국 시간)"],
    ["demo", "bool", (v) => !!v.demo, "체험 계정"]
  ] },
  { area: "B4", table: "progress", label: "수강생 진도 · 과제", prefix: "prog:", index: ["iid"], cols: [
    ["iid", "text", (v, k) => part(k, 1), "강사 id"],
    ["sid", "text", (v, k) => part(k, 2), "수강생 id"],
    ["watched", "int", (v) => cnt(v.watched), "본 강의 수"],
    ["missions", "int", (v) => cnt(v.submissions), "제출한 과제 수"],
    ["submissions", "int", (v) => (isObj(v.submissions) ? Object.values(v.submissions).reduce((a, l) => a + cnt(l), 0) : 0), "제출 횟수"],
    ["waiting", "int", (v) => (isObj(v.submissions) ? Object.values(v.submissions).filter((l) => Array.isArray(l) && l.length && isObj(l[l.length - 1]) && l[l.length - 1].status === "pending").length : 0), "검수 기다리는 과제"],
    ["questions", "int", (v) => cnt(v.questions), "질문 수"],
    ["last_watched_at", "time", (v) => { const t = isObj(v.watched) ? Object.values(v.watched).map(num).filter((n) => n != null) : []; return t.length ? Math.max.apply(null, t) : null; }, "마지막으로 본 시각(한국 시간)"]
  ] },
  { area: "B4", table: "contents", label: "강사 콘텐츠(강의실)", prefix: "content:", cols: [
    ["iid", "text", (v, k) => after(k, "content:"), "강사 id"],
    ["course", "text", (v) => (isObj(v.brand) ? txt(v.brand.courseTitle) : null), "강의 이름"],
    ["weeks", "int", (v) => cnt(v.weeks), "주차 수"],
    ["notices", "int", (v) => cnt(v.notices), "공지 수"],
    ["faqs", "int", (v) => cnt(v.faqs), "자주 묻는 질문 수"],
    ["landing_on", "bool", (v) => (isObj(v.landing) ? !!v.landing.published : false), "강의 소개 페이지 공개"],
    ["free_on", "bool", (v) => (isObj(v.freeClass) ? !!v.freeClass.published : false), "무료강의 페이지 공개"]
  ] },
  // ---------------- B5 이용료 · 문의 · 후기 · 지급 ----------------
  { area: "B5", table: "bills", label: "기수 이용료", prefix: "bill:", index: ["iid", "cohort_id"], cols: [
    ["iid", "text", (v, k) => txt(v.instructorId) || part(k, 1), "강사 id"],
    ["id", "text", (v, k) => txt(v.id) || part(k, 2), "id"],
    ["cohort_id", "text", (v) => txt(v.cohortId), "기수 id"],
    ["cohort_name", "text", (v) => txt(v.cohortName), "기수"],
    ["kind", "text", (v) => txt(v.kind), "종류"],
    ["fee", "int", (v) => num(v.fee), "이용료(원)"],
    ["vat", "text", (v) => txt(v.vat), "부가세 방식"],
    ["status", "text", (v) => (v.canceledAt ? "canceled" : v.paidAt ? "paid" : "requested"), "상태 (requested · paid · canceled)"],
    ["requested_at", "time", (v) => num(v.requestedAt), "신청 시각(한국 시간)"],
    ["paid_at", "text", (v) => txt(v.paidAt, 30), "입금일"],
    ["invoice_at", "text", (v) => txt(v.invoiceAt, 30), "세금계산서"],
    ["canceled_at", "text", (v) => txt(v.canceledAt, 30), "취소일"],
    ["demo", "bool", (v) => !!v.demo, "체험"]
  ] },
  { area: "B5", table: "partner_inquiries", label: "강사 입점 문의", prefix: "inq:", index: ["status", "at"], cols: [
    ["id", "text", (v, k) => txt(v.id) || after(k, "inq:"), "id"],
    ["name", "text", (v) => txt(v.name), "이름"],
    ["email", "text", (v) => txt(v.email), "이메일"],
    ["phone", "text", (v) => txt(v.phone, 30), "전화"],
    ["course", "text", (v) => txt(v.course != null ? v.course : v.want), "강의 · 문의"],
    ["source", "text", (v) => txt(v.source), "경로"],
    ["ref", "text", (v) => txt(v.ref), "추천 코드"],
    ["aff_id", "text", (v) => txt(v.affId), "파트너 id"],
    ["status", "text", (v) => txt(v.status), "상태"],
    ["at", "time", (v) => num(v.at), "시각(한국 시간)"]
  ] },
  { area: "B5", table: "member_inquiries", label: "회원 1:1 문의", prefix: "vq:", index: ["mid", "at"], cols: [
    ["mid", "text", (v, k) => txt(v.mid) || part(k, 1), "회원 id"],
    ["id", "text", (v, k) => txt(v.id) || part(k, 2), "문의 id"],
    ["cat", "text", (v) => txt(v.cat), "분류"],
    ["order_no", "text", (v) => txt(v.order), "주문번호"],
    ["title", "text", (v) => txt(v.title), "제목"],
    ["answered", "bool", (v) => !!(v.answer && String(v.answer).trim()), "답변함"],
    ["at", "time", (v) => num(v.at), "시각(한국 시간)"]
  ] },
  { area: "B5", table: "reviews", label: "후기", prefix: "vr:", index: ["pid", "mid"], cols: [
    ["id", "text", (v, k) => txt(v.id) || after(k, "vr:"), "id"],
    ["pid", "text", (v) => txt(v.pid), "상품 id"],
    ["mid", "text", (v) => txt(v.mid), "회원 id"],
    ["name", "text", (v) => txt(v.name), "이름"],
    ["rating", "int", (v) => num(v.rating), "별점"],
    ["hidden", "bool", (v) => !!(v.hidden || v.hide), "숨김"],
    ["at", "time", (v) => num(v.at), "시각(한국 시간)"]
  ] },
  { area: "B5", table: "pledges", label: "수강 다짐", prefix: "vpl:", index: ["pid"], cols: [
    ["id", "text", (v, k) => txt(v.id) || after(k, "vpl:"), "id"],
    ["pid", "text", (v) => txt(v.pid), "상품 id"],
    ["mid", "text", (v) => txt(v.mid), "회원 id"],
    ["nick", "text", (v) => txt(v.nick), "닉네임"],
    ["text", "text", (v) => txt(v.text, 500), "다짐 글"],
    ["up", "int", (v) => num(v.up), "응원 수"],
    ["at", "time", (v) => num(v.at), "시각(한국 시간)"]
  ] },
  { area: "B5", table: "payout_lists", label: "강사 정산 지급 목록", prefix: "vpo:", cols: [
    ["who", "text", (v, k) => after(k, "vpo:"), "강사 id"],
    ["n", "int", (v) => cnt(v), "지급 건수"]
  ], children: [
    { table: "payouts", label: "강사 정산 지급", index: ["ym"], rows: (v) => arr(v), cols: [
      ["id", "text", (x) => txt(x.id), "id"],
      ["who", "text", (x) => txt(x.key), "강사 id"],
      ["ym", "text", (x) => txt(x.ym, 10), "정산 월"],
      ["st", "text", (x) => txt(x.st, 20), "상태"],
      ["amount", "int", (x) => num(x.amount), "금액"]
    ] }
  ] },
  // ---------------- B6 설정 · 상품 · 쿠폰 · 운영자 ----------------
  //  meta(마스터 설정 전부) · vcat(서버 가격표) · vdur(영상 길이) · vstat(좋아요 · 판매 수) · vmsg · vupd(알림 기록) — 문서는 통째로 한 줄, 상품 · 쿠폰 · 운영자 · 파트너 지급은 한 건씩
  { area: "B6", table: "settings", label: "설정 · 카탈로그", keys: ["meta", "vcat", "vdur", "vstat", "vmsg", "vupd"], cols: [
    ["name", "text", (v, k) => k, "문서 (meta · vcat · vdur · vstat · vmsg · vupd)"],
    ["items", "int", (v) => cnt(v), "칸 수"]
  ], children: [
    { table: "products", label: "상품 (meta = 마스터 편집본 · vcat = 서버 가격표)", index: ["id"], rows: (v, k) => arr(k === "meta" ? isObj(v.vod) && v.vod.products : k === "vcat" ? v.products : null), cols: [
      ["id", "text", (x) => txt(x.id), "상품 id"],
      ["type", "text", (x) => txt(x.type), "종류"],
      ["iid", "text", (x) => txt(x.iid), "강사 id"],
      ["title", "text", (x) => txt(x.title), "이름"],
      ["status", "text", (x) => txt(x.status), "상태"],
      ["price", "int", (x) => num(x.price), "정가"],
      ["sale", "int", (x) => num(x.sale), "할인가"],
      ["cat", "text", (x) => txt(x.cat), "분류"]
    ] },
    { table: "coupons", label: "쿠폰 (meta · vcat)", index: ["code"], rows: (v, k) => arr(k === "meta" ? isObj(v.vod) && v.vod.coupons : k === "vcat" ? v.coupons : null), cols: [
      ["id", "text", (x) => txt(x.id), "쿠폰 id"],
      ["code", "text", (x) => txt(x.code), "코드"],
      ["name", "text", (x) => txt(x.name), "이름"],
      ["kind", "text", (x) => txt(x.kind), "할인 방식 (won · pct)"],
      ["value", "int", (x) => num(x.value), "할인 값"],
      ["days", "int", (x) => num(x.days), "쓸 수 있는 날"],
      ["on", "bool", (x) => yes(x.on), "켜짐"]
    ] },
    // 2026-11-08: 스토어 첫 화면 배너도 한 건씩 (마스터 › VOD 전시 › 첫 화면 배너 · 화면에 나오는 순서 그대로)
    { table: "banners", label: "스토어 첫 화면 배너 (배너 하나 = 한 줄 · pos = 화면 순서)", rows: (v, k) => (k === "meta" && isObj(v.vod) ? arr(v.vod.banners).map((x, i) => (isObj(x) ? Object.assign({ pos: i + 1 }, x) : null)) : []), cols: [
      ["pos", "int", (x) => num(x.pos), "화면 순서"],
      ["id", "text", (x) => txt(x.id), "배너 id"],
      ["kind", "text", (x) => (x.kind === "img" ? "img" : "art"), "종류 (img = 이미지 배너 · art = 디자인 배너)"],
      ["title", "text", (x) => txt(x.kind === "img" ? x.alt || x.title : String(x.title || "").replace(/\n/g, " ")), "제목 · 이미지 배너는 대체 문구"],
      ["eyebrow", "text", (x) => txt(x.eyebrow), "작은 글씨"],
      ["pid", "text", (x) => txt(x.pid), "누르면 갈 클래스"],
      ["href", "text", (x) => txt(x.href), "누르면 갈 링크"],
      ["on", "bool", (x) => x.on !== false, "켜짐"],
      ["date_from", "text", (x) => txt(x.from, 10), "노출 시작일"],
      ["date_to", "text", (x) => txt(x.to, 10), "노출 종료일"]
    ] },
    { table: "staff", label: "운영자 · 파트너 계정 (비밀번호는 빼고)", rows: (v, k) => (k === "meta" ? arr(v.staff).map((s) => Object.assign({ kind: "staff" }, s)).concat(arr(v.affiliates).map((s) => Object.assign({ kind: "partner" }, s))) : []), cols: [
      ["kind", "text", (x) => x.kind, "구분 (staff · partner)"],
      ["id", "text", (x) => txt(x.id), "id"],
      ["name", "text", (x) => txt(x.name), "이름"],
      ["login_id", "text", (x) => txt(x.loginId), "로그인 아이디"],
      ["status", "text", (x) => txt(x.status), "상태"]
    ] },
    { table: "partner_payouts", label: "파트너 RS 지급", rows: (v, k) => (k === "meta" && isObj(v.affPayouts) ? Object.keys(v.affPayouts).map((key) => Object.assign({ key }, isObj(v.affPayouts[key]) ? v.affPayouts[key] : {})) : []), cols: [
      ["aff_id", "text", (x) => String(x.key).split(":")[0] || null, "파트너 id"],
      ["ym", "text", (x) => String(x.key).split(":")[1] || null, "정산 월"],
      ["paid_at", "text", (x) => txt(x.paidAt, 30), "지급일"]
    ] }
  ] }
];

/* ---------- 찾기 ---------- */
const AREA_IDS = AREAS.map((a) => a.id);
TABLES.forEach((t) => { t.match = (t.keys || []).map((k) => ({ eq: k })).concat((t.prefixes || (t.prefix ? [t.prefix] : [])).map((p) => ({ pre: p }))); });
const CHILDREN = [];
TABLES.forEach((t) => (t.children || []).forEach((c) => { if (!CHILDREN.some((x) => x.table === c.table)) CHILDREN.push(c); }));
/** 이 키는 어느 표로? → 표 설정 | null (docs 그대로) */
function route(k) {
  k = String(k);
  for (const t of TABLES) for (const m of t.match) if (m.eq ? k === m.eq : k.startsWith(m.pre)) return t;
  return null;
}
/** 접두사 찾기(listDocs 의 "stu:moon:%" 같은 것)가 이 표에 닿을 수 있는지 */
function overlaps(t, pattern) {
  const p = String(pattern), like = p.endsWith("%"), base = like ? p.slice(0, -1) : p;
  return t.match.some((m) => (m.eq ? (like ? m.eq.startsWith(base) : m.eq === base) : like ? base.startsWith(m.pre) || m.pre.startsWith(base) : base.startsWith(m.pre)));
}
/** 이 표의 키만 고르는 SQL 조각 → { sql, args } (예: (k LIKE ? OR k = ?)) */
function keyCond(t) {
  const parts = [], args = [];
  t.match.forEach((m) => { if (m.eq) { parts.push("k = ?"); args.push(m.eq); } else { parts.push("k LIKE ?"); args.push(m.pre + "%"); } });
  return { sql: "(" + parts.join(" OR ") + ")", args };
}

/* ---------- 스위치 ---------- */
let modeCache = { raw: null, map: null };
/** DB_AREAS → { B2: "dual", … } (모르는 값은 멈춰요 — 잘못 넣은 값으로 조용히 꺼지지 않게) */
function parseModes(raw) {
  const out = {}; AREA_IDS.forEach((a) => { out[a] = "off"; });
  String(raw || "").split(/[,\s]+/).filter(Boolean).forEach((p) => {
    const m = /^([a-z0-9]+)\s*[:=]\s*([a-z]+)$/i.exec(p);
    if (!m) throw new Error("DB_AREAS 모양이 맞지 않아요: " + p + " (예: B2:dual,B3:table · all:only)");
    const a = m[1].toUpperCase(), mode = m[2].toLowerCase();
    if (ORDER.indexOf(mode) < 0) throw new Error("DB_AREAS 값을 모르겠어요: " + mode + " (off · dual · table · only)");
    if (a === "ALL") AREA_IDS.forEach((x) => { out[x] = mode; });
    else if (AREA_IDS.indexOf(a) < 0) throw new Error("DB_AREAS 영역을 모르겠어요: " + m[1] + " (B2~B6 · all)");
    else out[a] = mode;
  });
  return out;
}
function modes() {
  const raw = process.env.DB_AREAS || "";
  if (modeCache.raw !== raw) modeCache = { raw, map: parseModes(raw) };
  return modeCache.map;
}
const modeOf = (t) => modes()[t.area] || "off";
const readsTable = (t) => { const m = modeOf(t); return m === "table" || m === "only"; };
const writesTable = (t) => modeOf(t) !== "off";
const writesDocs = (t) => modeOf(t) !== "only";
const anyOn = () => Object.values(modes()).some((m) => m !== "off");

/* ---------- SQL ---------- */
const SQL_T = { text: "TEXT", int: "INTEGER", big: "INTEGER", bool: "INTEGER", time: "TEXT" };
const PG_T = { text: "text", int: "integer", big: "bigint", bool: "boolean", time: "timestamp" };
/* Postgres information_schema 의 이름 (표 모양 확인용) */
const PG_INFO = { text: "text", integer: "integer", bigint: "bigint", boolean: "boolean", timestamp: "timestamp without time zone" };
/** 표의 열 순서 · 종류 → [[이름, 종류 낱말(SQLite/Postgres)]] — k → 꺼낸 값들 → v · ver · updated · created (v 는 맨 뒤) */
function layout(t, kind) {
  const pg = kind === "pg" || kind === "postgres", T = pg ? PG_T : SQL_T;
  const head = [["k", T.text]], tail = [["v", T.text], ["ver", T.int], ["updated", pg ? "bigint" : "INTEGER"], ["created", pg ? "bigint" : "INTEGER"]];
  return head.concat(t.cols.map((c) => [c[0], T[c[1]]]), tail);
}
function childLayout(c, kind) {
  const pg = kind === "pg" || kind === "postgres", T = pg ? PG_T : SQL_T;
  return [["k", T.text], ["i", T.int]].concat(c.cols.map((x) => [x[0], T[x[1]]]));
}
/** 표 하나(+ 자식 표) 만들기 문장 — kind: "pg" | "sqlite" */
function tableDDL(t, kind) {
  const pg = kind === "pg" || kind === "postgres", S = pg ? "app." : "", out = [];
  const cols = layout(t, kind).map(([n, ty]) => q(n) + " " + ty + (n === "k" ? " PRIMARY KEY" : n === "ver" ? " NOT NULL DEFAULT 1" : n === "updated" || n === "created" ? " NOT NULL" : ""));
  out.push("CREATE TABLE IF NOT EXISTS " + S + t.table + " (" + cols.join(", ") + ")");
  out.push("CREATE INDEX IF NOT EXISTS " + t.table + "_updated ON " + S + t.table + " (updated)");
  (t.index || []).forEach((c) => out.push("CREATE INDEX IF NOT EXISTS " + t.table + "_" + c + " ON " + S + t.table + " (" + q(c) + ")"));
  (t.children || []).forEach((c) => {
    out.push("CREATE TABLE IF NOT EXISTS " + S + c.table + " (" + childLayout(c, kind).map(([n, ty]) => q(n) + " " + ty + (n === "k" || n === "i" ? " NOT NULL" : "")).join(", ") + ", PRIMARY KEY (k, i))");
    (c.index || []).forEach((x) => out.push("CREATE INDEX IF NOT EXISTS " + c.table + "_" + x + " ON " + S + c.table + " (" + q(x) + ")"));
  });
  return out;
}
/** 표 하나(+ 자식 표) 지우기 문장 — Postgres 는 그 표를 쓰는 보기(v_orders …)도 같이 (배포가 바로 다시 만들어요 · pgSetup) */
function tableDrop(t, kind) {
  const pg = kind === "pg" || kind === "postgres", S = pg ? "app." : "", C = pg ? " CASCADE" : "";
  return (t.children || []).map((c) => "DROP TABLE IF EXISTS " + S + c.table + C).concat(["DROP TABLE IF EXISTS " + S + t.table + C]);
}
function schema(kind) {
  const pg = kind === "pg", out = [];
  out.push(pg ? "CREATE TABLE IF NOT EXISTS app.area_state (id text PRIMARY KEY, mode text NOT NULL, at bigint NOT NULL, note text)" : "CREATE TABLE IF NOT EXISTS area_state (id TEXT PRIMARY KEY, mode TEXT NOT NULL, at INTEGER NOT NULL, note TEXT)");
  TABLES.forEach((t) => out.push.apply(out, tableDDL(t, kind)));
  return out;
}
/** 열 이름이 SQL 예약어와 겹치면 따옴표 ("on" — SQLite · Postgres 둘 다 큰따옴표) */
const RESERVED = new Set(["on", "order", "group", "user", "from", "to", "default", "check", "primary", "table", "select", "where"]);
const q = (c) => (RESERVED.has(c) ? '"' + c + '"' : c);
const tableNames = () => ["area_state"].concat(TABLES.map((t) => t.table), CHILDREN.map((c) => c.table));

/** ms 시각 → 한국 시간 글자 "2026-11-06 14:30:00" (초까지 · 표에서 사람이 읽게) — 이상한 값은 비워요 */
const KST_MS = 9 * 3600e3;
function kstStr(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 946684800000 || n > 4102444800000) return null; // 2000 ~ 2100 년 밖이면 시각이 아닌 값
  return new Date(Math.floor(n / 1000) * 1000 + KST_MS).toISOString().slice(0, 19).replace("T", " ");
}
const val = (type, x, kind) => (x == null ? null : type === "bool" ? (kind === "postgres" ? !!x : x ? 1 : 0) : type === "time" ? kstStr(x) : x);
function colVals(t, v, k, kind) {
  const ok = isObj(v) || Array.isArray(v);
  return t.cols.map((c) => { let x = null; if (ok) { try { x = c[2](v, k); } catch (e) { x = null; } } return val(c[1], x, kind); });
}
function childRows(c, v, k) { let rows = []; try { rows = (v == null ? [] : c.rows(v, k)) || []; } catch (e) { rows = []; } return rows.filter((x) => x != null && typeof x === "object"); }
function childVals(c, x, kind) { return c.cols.map((col) => { let y = null; try { y = col[2](x); } catch (e) { y = null; } return val(col[1], y, kind); }); }
/** 문서 한 줄(row: { k, v(JSON 글자 | null), ver, updated, created })을 제 표에 · 자식 표도 다시 → SQL 문장들 */
function tableStmts(t, row, kind) {
  let v = null;
  if (row.v != null) { try { v = JSON.parse(row.v); } catch (e) { v = null; } }
  const cols = t.cols.map((c) => q(c[0])), vals = colVals(t, v, row.k, kind);
  const out = [{
    sql: "INSERT INTO " + t.table + " (k, v, ver, updated, created, " + cols.join(", ") + ") VALUES (?, ?, ?, ?, ?, " + cols.map(() => "?").join(", ") + ") ON CONFLICT(k) DO UPDATE SET v = excluded.v, ver = excluded.ver, updated = excluded.updated, created = excluded.created, " + cols.map((c) => c + " = excluded." + c).join(", "),
    args: [row.k, row.v == null ? null : String(row.v), Number(row.ver), Number(row.updated), Number(row.created)].concat(vals)
  }];
  (t.children || []).forEach((c) => {
    out.push({ sql: "DELETE FROM " + c.table + " WHERE k = ?", args: [row.k] });
    const rows = childRows(c, v, row.k), names = ["k", "i"].concat(c.cols.map((x) => q(x[0])));
    for (let s = 0; s < rows.length; s += 100) {
      const chunk = rows.slice(s, s + 100), args = [];
      chunk.forEach((x, j) => { args.push(row.k, s + j); args.push.apply(args, childVals(c, x, kind)); });
      out.push({ sql: "INSERT INTO " + c.table + " (" + names.join(", ") + ") VALUES " + chunk.map(() => "(" + names.map(() => "?").join(", ") + ")").join(", "), args });
    }
  });
  return out;
}
const docsUpsert = (row) => ({ sql: "INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, ver = excluded.ver, updated = excluded.updated, created = excluded.created", args: [row.k, row.v == null ? null : String(row.v), Number(row.ver), Number(row.updated), Number(row.created)] });
/** 표 한 줄(과 자식 표)을 지우는 문장 */
const tableDelete = (t, k) => [{ sql: "DELETE FROM " + t.table + " WHERE k = ?", args: [k] }].concat((t.children || []).map((c) => ({ sql: "DELETE FROM " + c.table + " WHERE k = ?", args: [k] })));
/** DB 에서 읽은 시각 칸 → "2026-11-06 14:30:00" (Postgres 는 글자 그대로 받도록 store.js 에서 맞춰요 · 혹시 Date 면 그 글자로) */
function timeStr(x) {
  if (x == null) return null;
  if (x instanceof Date) return isNaN(x) ? null : new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace("T", " ");
  return String(x).replace("T", " ").slice(0, 19);
}
/** 열 · 자식 표가 v 와 맞는지 (배포 때 비교) — 어긋난 열 이름들 */
function colDiff(t, row, kind) {
  let v = null; if (row.v != null) { try { v = JSON.parse(row.v); } catch (e) { v = null; } }
  const want = colVals(t, v, row.k, kind), bad = [];
  t.cols.forEach((c, i) => { const a = c[1] === "time" ? timeStr(row[c[0]]) : row[c[0]], b = want[i]; const eq = a == null || b == null ? a == null && b == null : c[1] === "bool" ? !!a === !!b : String(a) === String(b); if (!eq) bad.push(c[0]); });
  return bad;
}

module.exports = { ORDER, AREAS, AREA_IDS, TABLES, CHILDREN, route, overlaps, keyCond, parseModes, modes, modeOf, readsTable, writesTable, writesDocs, anyOn, schema, tableNames, tableStmts, docsUpsert, tableDelete, colDiff, childRows, q, layout, childLayout, tableDDL, tableDrop, PG_INFO, kstStr, timeStr };
