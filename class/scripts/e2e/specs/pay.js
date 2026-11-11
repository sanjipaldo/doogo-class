/* 결제 화면 — 토스페이먼츠 결제수단 (탈잉처럼 세로 목록 · 2026-11-11)
 *  서버에 시험용 토스 키(가짜 값 · 진짜 토스에는 닿지 않아요)와 결제수단(TOSS_METHODS)을 넣고 확인해요:
 *   · 순서: 실시간 계좌이체 · 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌 입금 · 무통장 입금 / 처음엔 카드 / 고른 수단 바로 아래 안내
 *   · 예전 화면 = React 화면 (모양이 같아요)
 *   · 결제하기: 토스 SDK 대신 가짜 SDK 로 결제창에 넘기는 값 (네이버페이 · 카카오페이 = 카드 · DIRECT · 간편결제 코드 / 카드 = 통합결제창 / 계좌이체 / 가상계좌 입금 기한 · 금액 · 주문 번호 · 돌아올 주소)
 *   · 결제창에서 취소하고 돌아오면(failUrl) 안내 + 결제 대기 주문은 ‘결제 안 됨’
 *  E2E_PAY_SHOTS=<폴더>: 결제 수단 칸 사진 (PC · 휴대폰 — 주문자 정보 칸은 찍지 않아요) */
"use strict";
const path = require("path");
const FL = require("./_flows");

const FAKE_SDK = [
  "window.TossPayments = function (ck) { return {",
  "  payment: function (o) { return { requestPayment: function (req) { window.__tossReq = { ck: ck, customerKey: o && o.customerKey, req: req }; return new Promise(function () {}); } }; },",
  "  widgets: function () { throw new Error('결제창형(widgets)은 이 시험에서 쓰지 않아요'); } }; };",
  "window.TossPayments.ANONYMOUS = '@@ANONYMOUS';"
].join("\n");

module.exports = {
  title: "결제 화면 · 토스페이먼츠 결제수단 (계좌이체 · 네이버페이 · 카카오페이 · 카드 · 가상계좌 · 무통장)",
  env: { TOSS_CLIENT_KEY: "test_ck_e2e_fake", TOSS_SECRET_KEY: "test_sk_e2e_fake", TOSS_METHODS: "card,transfer,vbank,naver,kakao", TOSS_VBANK_HOURS: "48" },
  async run({ base, info, browser, run, L }) {
    const page = await L.newPage(browser);
    run.watch(page, "결제 화면");
    let sdkLoads = 0;
    await page.route("https://js.tosspayments.com/**", (r) => { sdkLoads++; return r.fulfill({ status: 200, contentType: "application/javascript", body: FAKE_SDK }); });
    await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
    const st = () => page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll(".vd-pay-opt input[name=method]"));
      const on = Array.from(document.querySelectorAll(".vd-pay-sub.on")).map((x) => x.dataset.payNote);
      const bank = document.querySelector("[data-bank-note]");
      return { keys: opts.map((x) => x.value), names: opts.map((x) => x.nextElementSibling.textContent), checked: (opts.find((x) => x.checked) || {}).value || "", on, bankOn: !!(bank && bank.classList.contains("on")),
        badges: Array.from(document.querySelectorAll(".vd-pay-bd")).map((x) => x.className + ":" + x.textContent), subs: Array.from(document.querySelectorAll(".vd-pay-sub")).map((x) => x.dataset.payNote + ":" + x.textContent),
        testNote: !!document.querySelector(".vd-co-tptest"), btn: (document.querySelector("button[data-co-btn]") || {}).textContent || "", tot: ((document.querySelector("[data-co-tot]") || {}).textContent || "").replace(/[^0-9]/g, "") };
    });
    const pick = async (k) => { await page.click(".vd-pay-opt:has(input[value=" + k + "])"); await page.waitForTimeout(150); return st(); };
    const shape = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(page, base, mode);
      await L.open(page, base, "/vod/checkout/v8"); await page.waitForTimeout(500);
      const s0 = await st();
      shape[mode] = await L.domShape(page);
      await run.check(s0.keys.join() === "transfer,naver,kakao,card,vbank,bank" && s0.names.join("|") === "실시간 계좌이체|네이버페이NPay|카카오페이pay|카드/간편결제|가상계좌 입금|무통장 입금" && s0.badges.length === 2 && /vd-pay-np/.test(s0.badges[0]) && /vd-pay-kp/.test(s0.badges[1]) && !s0.testNote,
        "결제 수단(" + mode + "): 계좌이체 · 네이버페이(N Pay) · 카카오페이(pay) · 카드/간편결제 · 가상계좌 입금 · 무통장 입금 — 탈잉 순서", s0, page);
      await run.check(s0.checked === "card" && s0.on.join() === "card" && /할부 개월 수는 다음 결제창에서/.test(s0.subs.find((x) => /^card:/.test(x)) || "") && /2일 안에 입금하면/.test(s0.subs.find((x) => /^vbank:/.test(x)) || "") && !s0.bankOn,
        "처음엔 카드 + 바로 아래 할부 안내 · 가상계좌 안내는 접혀 있어요 (" + mode + ")", s0, page);
      const sN = await pick("naver"), sV = await pick("vbank"), sB = await pick("bank"), sC = await pick("card");
      await run.check(sN.checked === "naver" && !sN.on.length && !sN.bankOn && sV.on.join() === "vbank" && !sV.bankOn && sB.bankOn && !sB.on.length && sC.on.join() === "card" && !sC.bankOn,
        "고른 수단 아래 안내만 펼쳐져요 — 네이버페이(안내 없음) · 가상계좌(입금 기한 2일) · 무통장(입금 계좌) · 다시 카드 (" + mode + ")", { sN, sV, sB, sC }, page);
      if (process.env.E2E_PAY_SHOTS) {
        const dir = process.env.E2E_PAY_SHOTS;
        await (await page.$("[data-co-pay]")).screenshot({ path: path.join(dir, "pay-" + mode + "-pc.png") });
        if (mode === "all") {
          const m = await L.newPage(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
          await m.context().addCookies(await page.context().cookies(base));
          await L.open(m, base, "/vod/checkout/v8"); await m.waitForTimeout(500);
          await (await m.$("[data-co-pay]")).screenshot({ path: path.join(dir, "pay-all-m-card.png") });
          await m.click(".vd-pay-opt:has(input[value=vbank])"); await m.waitForTimeout(200);
          await (await m.$("[data-co-pay]")).screenshot({ path: path.join(dir, "pay-all-m-vbank.png") });
          await m.context().close();
        }
      }
    }
    const d = L.shapeDiff(shape.off, shape.all);
    await run.check(!d, "결제 화면: 예전 화면 = React 화면 (결제 수단 목록 · 배지 · 안내까지 같은 모양)", d, page);
    // 결제하기 → 가짜 토스 SDK 가 받은 값 (React 화면 · 예전 화면이 같은 결제 함수)
    const pay = async (k) => {
      await L.open(page, base, "/vod/checkout/v8"); await page.waitForTimeout(400);
      await page.evaluate(() => { window.__tossReq = null; });
      if (k !== "card") await pick(k);
      const tot = (await st()).tot;
      await page.check("input[data-agree-all]");
      await page.click("button[data-co-btn]");
      await page.waitForFunction(() => !!window.__tossReq, null, { timeout: 10000 }).catch(() => {});
      const q = await page.evaluate(() => window.__tossReq), saved = await page.evaluate(() => { try { return JSON.parse(sessionStorage.getItem("dc_tpay") || "null"); } catch (e) { return null; } });
      return { q, tot: Number(tot), saved };
    };
    const ok = (x) => !!(x.q && x.q.ck === "test_ck_e2e_fake" && x.q.customerKey && x.q.customerKey !== "@@ANONYMOUS" && /^pay_/.test(x.q.req.orderId) && x.q.req.amount.currency === "KRW" && x.q.req.amount.value === x.tot && x.tot > 0 && x.q.req.successUrl === base + "/" && x.q.req.failUrl === base + "/" && x.q.req.orderName && x.saved && x.saved.id === x.q.req.orderId);
    const pN = await pay("naver"), pK = await pay("kakao"), pC = await pay("card"), pT = await pay("transfer"), pV = await pay("vbank");
    await run.check(ok(pN) && pN.q.req.method === "CARD" && pN.q.req.card.flowMode === "DIRECT" && pN.q.req.card.easyPay === "NAVERPAY" && ok(pK) && pK.q.req.card.flowMode === "DIRECT" && pK.q.req.card.easyPay === "KAKAOPAY",
      "결제하기: 네이버페이 · 카카오페이 → 그 간편결제 창을 바로 (카드 · flowMode DIRECT · NAVERPAY · KAKAOPAY) · 서버가 정한 금액 · 주문 번호 · 돌아올 주소", { pN, pK }, page);
    await run.check(ok(pC) && pC.q.req.method === "CARD" && pC.q.req.card.flowMode === "DEFAULT" && !pC.q.req.card.easyPay && ok(pT) && pT.q.req.method === "TRANSFER" && ok(pV) && pV.q.req.method === "VIRTUAL_ACCOUNT" && pV.q.req.virtualAccount.validHours === 48 && sdkLoads >= 1,
      "결제하기: 카드 → 카드/간편결제 통합결제창 · 계좌이체 → 퀵계좌이체 · 가상계좌 → 입금 기한 48시간", { pC, pT, pV }, page);
    // 결제창에서 취소하고 돌아오면(failUrl · 토스는 orderId 를 안 보내요) → 이 브라우저에 기억한 주문을 ‘결제 안 됨’으로
    const oid = pV.q && pV.q.req.orderId;
    await L.open(page, base, "/?code=PAY_PROCESS_CANCELED&message=" + encodeURIComponent("사용자에 의해 결제가 취소되었습니다."));
    await page.waitForTimeout(800);
    const back = { toast: await L.toasts(page), url: page.url(), saved: await page.evaluate(() => sessionStorage.getItem("dc_tpay")) };
    const ords = await page.evaluate(() => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "orders" }) }).then((r) => r.json()));
    const vo = ((ords && ords.orders) || []).find((o) => o.paymentId === oid) || {};
    await run.check(/결제를 취소했어요/.test(back.toast) && !/code=/.test(back.url) && !back.saved && vo.status === "failed" && vo.failCode === "PAY_PROCESS_CANCELED",
      "결제창에서 취소하고 돌아오면 안내 · 주소의 토스 값은 지우고 · 결제 대기 주문은 ‘결제 안 됨’", { back, vo: { st: vo.status, code: vo.failCode } }, page);
    await page.context().close();
  }
};
