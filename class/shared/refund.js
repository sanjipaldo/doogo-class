/* 두고클래스 환불 규칙 공용 모듈 (2026-11) — 화면(vod.js · React)과 서버(api/_lib/vod.js)가 같은 규칙을 써요.
 *  ‘결제 후 7일 이내 · 강의를 한 번도 재생하지 않았으면 100% 환불’ — 숫자는 마스터 › 환불 · 취소 관리(settings.refund)를 따라요.
 *  회원이 내 강의실 · 주문 · 결제 내역에서 바로 취소하면 결제 방법에 따라:
 *   · 카드 · 간편결제 · 실시간 계좌이체(포트원)  → 포트원 결제를 바로 취소
 *   · 가상계좌(포트원)                           → 회원이 적은 환불 계좌로 포트원이 돌려줘요
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
  /** 환불 길 — pg(포트원 결제 취소) · vbank(포트원 · 환불 계좌) · bank(무통장 · 환불 계좌로 마스터 송금) · mock(서버 없는 시안) · none(바로 취소 못 함) */
  function wayOf(o, srv) {
    if (!o) return "none";
    if (o.method === "vbank") return "vbank";
    if (o.method === "bank") return "bank";
    if (o.pg && o.pg.st === "paid") return "pg";
    return srv ? "none" : "mock";
  }
  /** 환불 받을 계좌가 필요한 길 */
  const needAcct = (way) => way === "vbank" || way === "bank";
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
  return { RF_DEF, rfSet, wayOf, needAcct, usedOf, instant, startEnds, endAt };
});
