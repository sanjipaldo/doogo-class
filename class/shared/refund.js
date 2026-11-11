/* 두고클래스 환불 규칙 공용 모듈 (2026-11) — 화면(vod.js · React)과 서버(api/_lib/vod.js)가 같은 규칙을 써요.
 *  ‘결제 후 7일 이내 · 강의를 한 번도 재생하지 않았으면 100% 환불’ — 숫자는 마스터 › 환불 · 취소 관리(settings.refund)를 따라요.
 *  회원이 내 강의실 · 주문 · 결제 내역에서 바로 취소하면 결제 방법에 따라:
 *   · 카드 · 실시간 계좌이체(토스페이먼츠)       → 토스페이먼츠 결제를 바로 취소
 *   · 가상계좌(토스페이먼츠)                     → 회원이 적은 환불 계좌로 토스페이먼츠가 돌려줘요 (영업일 2일)
 *   · 무통장 입금                                → 주문은 바로 취소, 회원이 적은 환불 계좌로 마스터가 송금 (환불 · 취소 관리 ‘계좌 송금 대기’)
 *  ‘재생’ = 강의를 연 기록(seen) · 완료(done) · 수업 자료 내려받기(mat, 켜져 있으면 1강으로) — 서버 기록(vp:)이 기준이에요.
 *  · 브라우저: <script src="shared/refund.js"> → window.DCS.refund · Node: require("./shared/refund") */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else (root.DCS = root.DCS || {}).refund = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DAY = 864e5;
  /** 기본 환불 규정 — instant: 회원 바로 취소 · days: 결제 후 며칠 이내 · maxUsed: 들은 강의 몇 개까지(0 = 한 번도 재생하지 않았을 때)
   *  matCounts: 자료 내려받기도 1강 · addons: 함께 결제한 안 쓴 코칭권도 같이 · restore: 쿠폰 · 포인트 돌려주기 · ebookDays · eventDays */
  const RF_DEF = { instant: true, days: 7, maxUsed: 0, matCounts: true, addons: true, restore: true, ebookDays: 7, eventDays: 3 };
  /** 판매 설정(settings.refund)을 기본값 위에 */
  const rfSet = (settings) => Object.assign({}, RF_DEF, (settings && settings.refund) || {});
  /** 환불 길 — pg(토스페이먼츠 결제 취소) · vbank(토스페이먼츠 · 환불 계좌) · bank(무통장 · 환불 계좌로 마스터 송금) · mock(서버 없는 시안) · none(바로 취소 못 함)
   *  토스페이먼츠 결제(pg.pv "toss" · paymentKey)만 자동 취소해요 — 예전 포트원 시절 시험 결제는 환불 요청으로 (2026-11 토스로 바꿈) */
  const tossPaid = (o) => !!(o && o.pg && o.pg.pv === "toss" && o.pg.paymentKey && o.pg.st === "paid");
  function wayOf(o, srv) {
    if (!o) return "none";
    if (o.method === "bank") return "bank";
    if (o.method === "vbank") return tossPaid(o) || !srv ? "vbank" : "none";
    if (tossPaid(o)) return "pg";
    if (o.pg && o.pg.st === "paid") return srv ? "none" : "mock";
    return srv ? "none" : "mock";
  }
  /** 환불 받을 계좌가 필요한 길 */
  const needAcct = (way) => way === "vbank" || way === "bank";
  /* 환불 받을 계좌의 은행 — 토스페이먼츠 은행 코드(두 자리 · 결제 취소 refundReceiveAccount.bank 에 그대로 보내요) · 화면 이름
   * (docs.tosspayments.com/codes/org-codes · 2026-11 확인 — 가상계좌 은행 코드 · 계좌이체 은행 코드도 이 두 자리로 와요)
   * 예전(포트원 시절) 영문 코드 · 금융결제원 세 자리 코드로 저장된 계좌도 bankCode() 로 토스 코드가 돼요 */
  const BANKS = [["06", "KB국민은행"], ["88", "신한은행"], ["20", "우리은행"], ["81", "하나은행"], ["11", "NH농협은행"], ["12", "지역농축협(단위농협)"], ["03", "IBK기업은행"], ["90", "카카오뱅크"], ["92", "토스뱅크"], ["89", "케이뱅크"], ["02", "KDB산업은행"], ["07", "Sh수협은행"], ["71", "우체국"], ["45", "새마을금고"], ["48", "신협"], ["50", "저축은행"], ["32", "부산은행"], ["39", "경남은행"], ["31", "iM뱅크(대구)"], ["34", "광주은행"], ["37", "전북은행"], ["35", "제주은행"], ["23", "SC제일은행"], ["27", "씨티은행"], ["64", "산림조합"]];
  const BANK_OLD = { KOOKMIN: "06", SHINHAN: "88", WOORI: "20", HANA: "81", NONGHYUP: "11", NONGHYEOP: "11", LOCAL_NONGHYUP: "12", LOCALNONGHYEOP: "12", IBK: "03", KAKAO: "90", KAKAOBANK: "90", TOSS: "92", TOSSBANK: "92", K_BANK: "89", KBANK: "89", KDB: "02", KDBBANK: "02", SUHYUP: "07", SUHYEOP: "07", POST: "71", KFCC: "45", SAEMAUL: "45", SHINHYUP: "48", SHINHYEOP: "48", SAVINGS_BANK: "50", SAVINGBANK: "50", BUSAN: "32", BUSANBANK: "32", KYONGNAM: "39", KYONGNAMBANK: "39", DAEGU: "31", DAEGUBANK: "31", KWANGJU: "34", GWANGJUBANK: "34", JEONBUK: "37", JEONBUKBANK: "37", JEJU: "35", JEJUBANK: "35", STANDARD_CHARTERED: "23", SC: "23", CITI: "27", NFCF: "64", SANLIM: "64",
    "004": "06", "088": "88", "020": "20", "081": "81", "011": "11", "012": "12", "003": "03", "090": "90", "092": "92", "089": "89", "002": "02", "007": "07", "071": "71", "045": "45", "048": "48", "050": "50", "032": "32", "039": "39", "031": "31", "034": "34", "037": "37", "035": "35", "023": "23", "027": "27", "064": "64" };
  /** 토스 은행 코드로 (모르는 값이면 "") */
  const bankCode = (c) => { const s = String(c == null ? "" : c).trim(); return BANKS.some((x) => x[0] === s) ? s : BANK_OLD[s.toUpperCase()] || ""; };
  /** 은행 이름 (모르는 코드는 그대로) */
  const bankName = (c) => { const k = bankCode(c), b = BANKS.find((x) => x[0] === k); return b ? b[1] : String(c == null ? "" : c); };
  /** 들은 강의 수 — 열어 본 강의 + 완료한 강의 + 마지막으로 연 강의 (+ 자료를 내려받았으면 1)
   *  pr = { seen, done, last, mat } 또는 그 배열 (서버 기록 vp: 과 회원 화면 기록을 합쳐 셀 때 — 어느 쪽에든 있으면 들은 강의) */
  function usedOf(pr, rf) {
    const ids = {};
    let mat = false;
    (Array.isArray(pr) ? pr : [pr]).forEach((x) => {
      if (!x || typeof x !== "object") return;
      Object.keys(x.done || {}).forEach((k) => { ids[k] = 1; });
      Object.keys(x.seen || {}).forEach((k) => { ids[k] = 1; });
      if (x.last) ids[x.last] = 1;
      if (Number(x.mat) > 0) mat = true;
    });
    return Object.keys(ids).length + ((rf || RF_DEF).matCounts && mat ? 1 : 0);
  }
  /** 지금 회원이 바로 100% 취소할 수 있는지
   *  f = { o(주문), type(vod · ebook · book · live · offline · …), event(LIVE · 오프라인인지), eventAt(ms), shipSt(종이책 배송 상태), used(들은 강의 수), now(ms), srv(정식 서버) }
   *  → { ok, why, left(바로 취소가 끝나기까지 남은 날), used, way, acct(환불 계좌가 필요한지) } */
  function instant(f, rf) {
    rf = rf || RF_DEF;
    const o = f && f.o, way = wayOf(o, f && f.srv), out = { ok: false, why: "", left: null, used: 0, way, acct: needAcct(way) };
    const no = (why, x) => Object.assign(out, { why }, x || {});
    const yes = (why, left, used) => Object.assign(out, { ok: true, why, left, used: used || 0 });
    if (!o || o.status !== "paid" || !(Number(o.amount) > 0) || (o.kind || "course") !== "course" || !f.type) return out;
    if (way === "none") return no("이 결제는 환불 요청으로 처리해요.");
    if (!rf.instant) return no("바로 취소는 지금 쉬고 있어요. 환불 요청을 남겨 주세요.");
    if (o.refundReq) return no("환불 요청을 처리하고 있어요.");
    const now = Number(f.now) || Date.now(), t = f.type;
    // 종이책: 보내기 전(결제 완료 · 상품 준비 전)이면 기간 없이 바로 취소 · 그 뒤는 취소 · 반품 요청
    if (t === "book") { const st = f.shipSt || "ready"; return st === "ready" ? yes("책을 보내기 전이라 바로 전액 취소돼요.", null, 0) : no(st === "prep" ? "상품을 준비하고 있어 취소 요청으로 처리해요." : "이미 보낸 책이라 반품 요청으로 처리해요."); }
    // LIVE · 오프라인: 강의 N일 전까지
    if (f.event) {
      const ev = Number(f.eventAt) || 0, dl = ev ? Math.floor((ev - now) / DAY) : -1;
      return ev && dl >= rf.eventDays ? yes("강의 " + rf.eventDays + "일 전까지는 바로 전액 취소돼요.", dl - rf.eventDays + 1, 0) : no("강의 " + rf.eventDays + "일 전이 지나 환불 요청으로 처리해요.");
    }
    const days = t === "ebook" ? rf.ebookDays : rf.days, paid = Number(o.paidAt || o.at || o.createdAt) || 0, end = paid + days * DAY;
    if (!(now < end)) return no("결제 후 " + days + "일이 지나 환불 요청으로 처리해요.");
    const left = Math.ceil((end - now) / DAY);
    if (t === "ebook") return o.dlAt ? no("전자책을 내려받아 바로 취소할 수 없어요.") : yes("내려받기 전이라 바로 전액 취소돼요.", left, 0);
    const used = Number(f.used) || 0;
    if (used > rf.maxUsed) return no("강의를 " + used + "개 들어 환불 요청으로 처리해요.", { used });
    return yes(rf.maxUsed ? "강의를 " + rf.maxUsed + "개 이하로 들어 바로 전액 취소돼요." : "아직 강의를 재생하지 않아 바로 전액 취소돼요.", left, used);
  }
  /** 이 강의를 처음 열면 바로 취소가 끝나는지 (강의 시작 안내를 보여 줄지) — q = instant() 결과 · seen = 이 강의를 연 적 있는지 */
  const startEnds = (q, rf, seen) => !!(q && q.ok && q.left != null && !seen && (Number(q.used) || 0) + 1 > (rf || RF_DEF).maxUsed);
  /** 마감 날짜 (결제 후 N일 · 이 날 이 시각 전까지) — 강의 시작 안내 · 내 강의실 문구 */
  const endAt = (o, rf, type) => (Number(o && (o.paidAt || o.at || o.createdAt)) || 0) + ((type === "ebook" ? (rf || RF_DEF).ebookDays : (rf || RF_DEF).days) * DAY);
  return { RF_DEF, rfSet, wayOf, tossPaid, needAcct, BANKS, bankCode, bankName, usedOf, instant, startEnds, endAt };
});
