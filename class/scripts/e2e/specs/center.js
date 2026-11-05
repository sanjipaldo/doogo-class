/* 강사센터 · 마스터 — 저장이 서버에 남는지 (새로 고친 뒤 · 다른 사람 화면에서도) · 마스터 강사 정산 화면 */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "강사센터 저장 · 마스터 강사 정산",
  async run({ base, info, browser, run, L }) {
    const page = await L.newPage(browser);
    run.watch(page, "강사센터");
    // 1) 강사: 클래스 소식(공지) 올리기 → 새로 고쳐도 있음 → 수강생 화면에도 보임
    const title = "E2E 공지 " + Date.now().toString(36);
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/notices");
    await page.click('button[data-action="item-add"][data-coll="notice"]');
    await page.waitForSelector("form#coll-form #cf-title");
    await page.fill("#cf-title", title);
    await page.fill("#cf-body", "E2E 테스트 공지 본문이에요.");
    await page.click('#modal-root button[type="submit"][form="coll-form"]');
    await page.waitForTimeout(600);
    await run.check(/공지를 저장했어요/.test(await L.toasts(page)), "강사: 공지 저장 안내", await L.toasts(page), page);
    await L.flushed(page);
    await L.open(page, base, "/center/notices");
    await run.check((await L.bodyText(page)).indexOf(title) >= 0, "강사: 공지를 올리면 새로 고쳐도 남아요 (서버 저장)", null, page);
    await FL.student(page, base, info);
    await L.open(page, base, "/notices");
    await run.check((await L.bodyText(page)).indexOf(title) >= 0, "수강생 화면 ‘클래스 소식’에 그 공지가 보여요", null, page);
    // 2) 마스터 강사 정산: 상품 종류 탭 · 정산 규칙 카드
    await FL.master(page, base, info);
    await L.open(page, base, "/center/master/vod-settle");
    await run.check(!!(await page.$('[data-action="vda-ym"][data-dir="1"]')) && /판매분 정산/.test(await L.bodyText(page)), "마스터 강사 정산 화면이 열려요 (달 넘기기)", null, page);
    await L.open(page, base, "/center/master/vod-rates");
    const rule = (await L.text(page, ".vs-rule")) || "";
    await run.check(/RS/.test(rule) && /PG/.test(rule) && /3\.3%/.test(rule) && /2,197,737/.test(rule), "정산 기준 카드: (판매가 − RS − PG) × 비율 · 사업자 그대로 · 개인 ÷1.1 뒤 3.3% (예시 숫자)", rule.slice(0, 300), page);
    // 3) 환불과 정산 (화면 계산만 · 저장 안 함): 지난달 확정 명세서에 들어간 주문 중
    //    · 확정 ‘전’ 부분 환불 → 명세서에 남은 금액만 들어가 있어 이번 달에 또 빼지 않아요 (두 번 빠지던 것)
    //    · 확정 ‘뒤’ 환불 → 환불한 달(이번 달) 정산에서 차감 · 지난달 결제분을 이번 달에 환불하면(확정 전) 지난달에서 빠지고 이번 달 띠에는 안 붙어요
    const rs = await page.evaluate(() => {
      const A = window.ADM, v = A.VD(), X = A.VX(), p = v.products.find((x) => x.iid && X.typeOf(x) === "vod");
      if (!p) return { err: "no product" };
      const now = Date.now(), ym = A.vdYM(now), prev = A.vdYMadd(ym, -1), pt = Date.parse(prev + "-20T03:00:00Z"), key = p.iid;
      const mk = (id, extra) => Object.assign({ id, no: "E2E" + id, pid: p.id, mid: "vm-e2e", title: p.title, kind: "course", amount: 50000, method: "card", pg: { st: "paid" }, at: pt, paidAt: pt, status: "refunded", refundKind: "partial" }, extra);
      const a = mk("rfa", { refundAmount: 20000, refundedAt: now - 5000 }), b = mk("rfb", { refundAmount: 20000, refundedAt: now - 1000 }), c = mk("rfc", { refundAmount: 50000, refundKind: "instant", refundedAt: now - 3000 });
      const pay = { key, ym: prev, st: "confirmed", confirmedAt: now - 3000, snap: { ids: ["rfa", "rfb"] } }, base = A.vdRfSum(ym, key).cur.n;
      v.orders.push(a, b, c); v.payouts.push(pay);
      try {
        const st = A.vdStmt(key, ym), sa = A.vdRfSettle(a), sb = A.vdRfSettle(b), sc = A.vdRfSettle(c), sum = A.vdRfSum(ym, key);
        return { ded: st.dedIds, a: [sa.late, sa.t], b: [sb.late, sb.t], c: [sc.late, sc.t], cur: sum.cur, curAdd: sum.cur.n - base, n: sum.n };
      } finally { v.orders.splice(v.orders.indexOf(a), 3); v.payouts.splice(v.payouts.indexOf(pay), 1); }
    });
    await run.check(rs.ded && rs.ded.indexOf("rfa") < 0 && rs.ded.indexOf("rfb") >= 0 && rs.ded.indexOf("rfc") < 0 && !rs.a[0] && /남은 금액만/.test(rs.a[1]) && rs.b[0] && /차감/.test(rs.b[1]) && !rs.c[0] && /빠짐/.test(rs.c[1]) && rs.curAdd === 1,
      "환불과 정산: 확정 전 부분 환불은 다시 빼지 않고 · 확정 뒤 환불만 이번 달에서 차감 · 지난달(확정 전) 결제분 환불은 지난달에서 빠져요", rs, page);
    await page.context().close();
  }
};
