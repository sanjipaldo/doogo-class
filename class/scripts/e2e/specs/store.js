/* DOOGO CLASS 구매 — 회원가입 → 무료 LIVE 신청 → 유료 클래스 무통장 주문(입금 대기) → 마스터 입금 확인 → 결제 완료 · 내 강의 · VOD 강의실 → 마스터 강사 정산에 반영
 *  (토스페이먼츠 카드 · 간편결제 승인은 서버 테스트의 가짜 토스로 · 실제 결제창은 미리보기에 시험 키를 넣고) · 회원과 마스터는 다른 브라우저 창 */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "회원가입 · 무료 신청 · 무통장 주문 → 입금 확인 → 수강 · 정산",
  async run({ base, info, browser, run, L }) {
    const mem = await L.newPage(browser), adm = await L.newPage(browser);
    run.watch(mem, "회원"); run.watch(adm, "마스터");
    const bs = await (await fetch(base + "/api/bootstrap")).json();
    const vod = ((((bs.docs || []).find((d) => d[0] === "meta") || [])[1] || {}).vod) || {}, off = vod.insOff || [];
    const shown = (vod.products || []).filter((p) => p && p.status === "on" && (off.indexOf(p.iid) < 0 || p.showOff));
    const freeLive = shown.find((p) => p.type === "live" && !(Number(p.sale != null ? p.sale : p.price) > 0));
    // 할인가는 마감일(saleEnd · 한국 날짜)까지만 — 데모 상품 할인이 끝나도 시험이 같은 가격을 기대하게 (서버 shared/price.js basePrice 와 같은 규칙)
    const kstToday = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    const nowPrice = (p) => (p.sale != null && p.sale !== "" && (!p.saleEnd || kstToday <= p.saleEnd) ? Number(p.sale) : Number(p.price) || 0);
    const paid = shown.find((p) => p.type === "vod" && nowPrice(p) > 0 && p.iid);
    await run.check(!!freeLive && !!paid, "스토어에 무료 LIVE · 유료 VOD 클래스가 있어요", { freeLive: freeLive && freeLive.id, paid: paid && paid.id });
    if (!freeLive || !paid) return;
    const price = nowPrice(paid);
    // 1) 회원가입 (이메일)
    const email = "e2e+" + Date.now().toString(36) + "@example.com";
    await L.fresh(mem, base);
    await L.open(mem, base, "/vod/signup");
    const f = 'form[data-vd-auth="signup"] ';
    await mem.fill(f + 'input[name="name"]', "테스트");
    await mem.fill(f + 'input[name="email"]', email);
    await mem.fill(f + 'input[name="phone"]', "010-1234-5678");
    await mem.fill(f + 'input[name="pw"]', "e2etest1234");
    await mem.fill(f + 'input[name="pw2"]', "e2etest1234");
    await mem.check(f + 'input[data-v="agree-all"]');
    await mem.click(f + 'button[type="submit"]');
    await mem.waitForFunction(() => !!(DB.remote.me && DB.remote.me.vod), null, { timeout: 10000 }).catch(() => {});
    await run.check(!!((await FL.serverMe(mem)) || {}).vod, "회원가입 → 바로 로그인 (서버 쿠키)", await L.toasts(mem), mem);
    // 2) 무료 LIVE 신청: 상세 → 신청 → 동의 → 신청 완료
    const checkout = async (pid, plan, method) => {
      await L.open(mem, base, "/vod/p/" + pid);
      if (plan) { const r = await mem.$('#vd-pdt-info input[name="vd-plan-a"][value="' + plan + '"]'); if (r) { await r.check(); await mem.waitForTimeout(200); } }
      const cta = await mem.$('#vd-pdt-info a[href*="/vod/checkout/' + pid + '"]');
      await run.check(!!cta, "상세 " + pid + ": 신청 · 결제 단추", null, mem);
      if (!cta) return null;
      await cta.click();
      await mem.waitForSelector('form[data-vd-pay="' + pid + '"] button[data-co-btn]', { timeout: 10000 });
      const coupon = await mem.$('select[name="coupon"]'); if (coupon) await coupon.selectOption("").catch(() => {});
      if (method) { const m = await mem.$('input[name="method"][value="' + method + '"]'); await run.check(!!m && (await m.isEnabled()), "결제 수단 ‘" + method + "’을 고를 수 있어요", null, mem); if (m) await m.check(); }
      await mem.check("input[data-agree-all]");
      await mem.waitForTimeout(300);
      await mem.click('form[data-vd-pay="' + pid + '"] button[data-co-btn]');
      await mem.waitForFunction(() => /^\/vod\/order\//.test(location.pathname), null, { timeout: 15000 }).catch(() => {});
      await L.ready(mem);
      const no = await mem.evaluate(() => (location.pathname.match(/^\/vod\/order\/([^/?]+)/) || [])[1] || "");
      return no;
    };
    const freeNo = await checkout(freeLive.id, null, null);
    await run.check(/^DC\d{12}$/.test(freeNo || "") && /완료/.test((await L.text(mem, ".vd-done h1")) || ""), "무료 LIVE 신청 → 신청 완료 · 주문 번호", { freeNo, h1: await L.text(mem, ".vd-done h1") }, mem);
    // 3) 유료 클래스 무통장 주문 → 입금 대기 (계좌 안내)
    const no = await checkout(paid.id, "180", "bank");
    await run.check(/^DC\d{12}$/.test(no || "") && !!(await mem.$(".vd-done-bank")), "무통장 주문 → 주문 접수 · 입금 계좌 안내", { no, h1: await L.text(mem, ".vd-done h1") }, mem);
    await L.open(mem, base, "/vod/my/pending");
    await run.check((await L.bodyText(mem)).indexOf(no) >= 0, "마이페이지 ‘결제 대기’에 그 주문이 있어요", null, mem);
    // 4) 마스터: 입금 확인
    await FL.master(adm, base, info);
    await L.open(adm, base, "/center/master/vod");
    const btn = await adm.waitForSelector('button[data-action="vda-paid"][data-id="vo-' + no + '"]', { timeout: 10000 }).catch(() => null);
    await run.check(!!btn, "마스터: 입금 대기 목록에 그 주문 · 입금 확인 단추", null, adm);
    if (btn) {
      await btn.click();
      await adm.click('#modal-root [data-action="confirm-ok"]');
      await adm.waitForTimeout(1500);
      await run.check(/입금을 확인했어요/.test(await L.toasts(adm)), "마스터: 입금 확인 완료", await L.toasts(adm), adm);
    }
    // 5) 회원: 결제 완료 · 내 강의 · VOD 강의실
    await L.open(mem, base, "/vod/my/orders");
    await run.check(/결제 완료/.test(await L.bodyText(mem)) && (await L.bodyText(mem)).indexOf(no) >= 0, "회원: 주문이 ‘결제 완료’로", null, mem);
    await L.open(mem, base, "/vod/my/classes");
    const go = (await mem.$('[data-v="dg"][data-p="' + paid.id + '"]')) || (await mem.$('a[href*="/vod/learn/' + paid.id + '"]'));
    await run.check(!!go && (await L.bodyText(mem)).indexOf(paid.title.slice(0, 10)) >= 0, "회원: 내 강의에 산 클래스 · 강의실 단추", null, mem);
    if (go) {
      await go.click();
      await mem.waitForFunction(() => /^\/vodclass/.test(location.pathname), null, { timeout: 15000 }).catch(() => {});
      await L.ready(mem);
      await run.check(/^\/vodclass/.test(await mem.evaluate(() => location.pathname)) && !!(await mem.$(".vt, .vc-card, #vt-stage")), "회원: VOD 강의실이 열려요", await mem.evaluate(() => location.pathname), mem);
    }
    // 6) 마스터 강사 정산: 이번 달 판매분에 VOD 강의 · 판매가가 잡혀요
    await L.open(adm, base, "/center/master/vod-settle");
    await adm.click('[data-action="vda-ym"][data-dir="1"]');
    await adm.waitForTimeout(800);
    const tabs = await adm.$$eval(".vs-ktabs .a-tab", (xs) => xs.map((x) => x.textContent.replace(/\s+/g, " ").trim()));
    const st = await L.bodyText(adm);
    await run.check(tabs.some((t) => /VOD 강의/.test(t)) && st.indexOf(price.toLocaleString("ko-KR") + "원") >= 0, "마스터 강사 정산: 이번 달에 VOD 강의 탭 · 판매가 " + price.toLocaleString("ko-KR") + "원", tabs, adm);
    await mem.context().close(); await adm.context().close();
  }
};
