/* 결제 화면 — 토스페이먼츠 결제수단 (탈잉처럼 세로 목록 · 2026-11-11 · 2026-11-24 토스 계약: 퀵계좌이체 · 토스페이 다시 / 더함)
 *  서버에 시험용 토스 키(가짜 값 · 진짜 토스에는 닿지 않아요)와 결제수단(TOSS_METHODS)을 넣고 확인해요:
 *   · 순서: 퀵계좌이체 · 토스페이 · 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌 입금 (무통장은 받지 않아요 · 종이책은 퀵계좌이체 빠짐) / 처음엔 카드 / 고른 수단 바로 아래 안내
 *   · 예전 화면 = React 화면 (모양이 같아요)
 *   · 결제하기: 토스 SDK 대신 가짜 SDK 로 결제창에 넘기는 값 (토스페이 · 네이버페이 · 카카오페이 = 카드 · DIRECT · 간편결제 코드 / 퀵계좌이체 = TRANSFER / 카드 = 통합결제창 / 가상계좌 입금 기한 · 금액 · 주문 번호 · 돌아올 주소)
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
  title: "결제 화면 · 토스페이먼츠 결제수단 (퀵계좌이체 · 토스페이 · 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌)",
  env: { TOSS_CLIENT_KEY: "test_ck_e2e_fake", TOSS_SECRET_KEY: "test_sk_e2e_fake", TOSS_METHODS: "card,transfer,vbank,naver,kakao,toss", TOSS_VBANK_HOURS: "48" },
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
        testNote: !!document.querySelector(".vd-co-tptest"), tsp: (() => { const i = document.querySelector(".vd-pay-tsp img"); return i ? i.getAttribute("src").split("/").pop() + ":" + (i.complete && i.naturalWidth > 0 ? 1 : 0) : ""; })(), btn: (document.querySelector("button[data-co-btn]") || {}).textContent || "", tot: ((document.querySelector("[data-co-tot]") || {}).textContent || "").replace(/[^0-9]/g, "") };
    });
    const pick = async (k) => { await page.click(".vd-pay-opt:has(input[value=" + k + "])"); await page.waitForTimeout(150); return st(); };
    const shape = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(page, base, mode);
      await L.open(page, base, "/vod/checkout/v8"); await page.waitForTimeout(500);
      const s0 = await st();
      shape[mode] = await L.domShape(page);
      await run.check(s0.keys.join() === "transfer,toss,naver,kakao,card,vbank" && s0.names.join("|") === "퀵계좌이체|토스페이|네이버페이NPay|카카오페이pay|카드/간편결제|가상계좌 입금" && s0.badges.length === 3 && /vd-pay-tsp/.test(s0.badges[0]) && s0.tsp === "pay-tosspay.png:1" && /vd-pay-np/.test(s0.badges[1]) && /vd-pay-kp/.test(s0.badges[2]) && !s0.testNote,
        "결제 수단(" + mode + "): 퀵계좌이체 · 토스페이(공식 로고 그림 · 로드됨) · 네이버페이(N Pay) · 카카오페이(pay) · 카드/간편결제 · 가상계좌 입금 (탈잉 순서) — 무통장 없음", s0, page);
      await run.check(s0.checked === "card" && s0.on.join() === "card" && /할부 개월 수는 다음 결제창에서/.test(s0.subs.find((x) => /^card:/.test(x)) || "") && /2일 안에 입금하면/.test(s0.subs.find((x) => /^vbank:/.test(x)) || "") && !s0.bankOn,
        "처음엔 카드 + 바로 아래 할부 안내 · 가상계좌 안내는 접혀 있어요 (" + mode + ")", s0, page);
      const sT = await pick("transfer"), sN = await pick("naver"), sV = await pick("vbank"), sC = await pick("card");
      await run.check(sT.on.join() === "transfer" && /은행을 고르고 바로 이체/.test(sT.subs.find((x) => /^transfer:/.test(x)) || "") && sN.checked === "naver" && !sN.on.length && !sN.bankOn && sV.on.join() === "vbank" && !sV.bankOn && sC.on.join() === "card" && !sC.bankOn,
        "고른 수단 아래 안내만 펼쳐져요 — 퀵계좌이체(은행 고르고 바로 이체) · 네이버페이(안내 없음) · 가상계좌(입금 기한 2일) · 다시 카드 (" + mode + ")", { sT, sN, sV, sC }, page);
      // 종이책(배송 상품)은 퀵계좌이체가 빠져요 — 현금 결제엔 구매안전서비스가 필요해서 (서버도 409)
      const bid = await page.evaluate(() => { const X = window.VOD, b = X.listed().find((x) => X.isBook(x) && x.status === "on" && X.priceOf(x) > 0); return b ? b.id : ""; });
      if (bid) {
        await L.open(page, base, "/vod/checkout/" + bid); await page.waitForTimeout(500);
        const sB = await st();
        await run.check(sB.keys.join() === "toss,naver,kakao,card,vbank" && sB.checked === "card", "종이책 결제(" + mode + "): 퀵계좌이체 없이 토스페이 · 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌", sB, page);
        await L.open(page, base, "/vod/checkout/v8"); await page.waitForTimeout(400);
      }
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
    const pS = await pay("toss"), pN = await pay("naver"), pK = await pay("kakao"), pT = await pay("transfer"), pC = await pay("card"), pV = await pay("vbank");
    await run.check(ok(pS) && pS.q.req.method === "CARD" && pS.q.req.card.flowMode === "DIRECT" && pS.q.req.card.easyPay === "TOSSPAY" && ok(pN) && pN.q.req.method === "CARD" && pN.q.req.card.flowMode === "DIRECT" && pN.q.req.card.easyPay === "NAVERPAY" && ok(pK) && pK.q.req.card.flowMode === "DIRECT" && pK.q.req.card.easyPay === "KAKAOPAY",
      "결제하기: 토스페이 · 네이버페이 · 카카오페이 → 그 간편결제 창을 바로 (카드 · flowMode DIRECT · TOSSPAY · NAVERPAY · KAKAOPAY) · 서버가 정한 금액 · 주문 번호 · 돌아올 주소", { pS, pN, pK }, page);
    await run.check(ok(pT) && pT.q.req.method === "TRANSFER" && !pT.q.req.card, "결제하기: 퀵계좌이체 → 토스 계좌이체 창 (TRANSFER · 은행 고르기)", pT, page);
    // 무통장은 서버도 받지 않아요 (화면에 없어도 직접 보내 보기) · 퀵계좌이체는 받아요
    const noT = await page.evaluate(() => Promise.all(["bank"].map((m) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", pid: "v8", kind: "course", plan: 365, method: m, depositor: "체험회원" }) }).then((r) => r.status))));
    await run.check(ok(pC) && pC.q.req.method === "CARD" && pC.q.req.card.flowMode === "DEFAULT" && !pC.q.req.card.easyPay && ok(pV) && pV.q.req.method === "VIRTUAL_ACCOUNT" && pV.q.req.virtualAccount.validHours === 48 && sdkLoads >= 1 && noT.join() === "409",
      "결제하기: 카드 → 카드/간편결제 통합결제창 · 가상계좌 → 입금 기한 48시간 · 무통장은 서버가 409", { pC, pV, noT }, page);
    // 결제창에서 취소하고 돌아오면(failUrl · 토스는 orderId 를 안 보내요) → 이 브라우저에 기억한 주문을 ‘결제 안 됨’으로
    const oid = pV.q && pV.q.req.orderId;
    await L.open(page, base, "/?code=PAY_PROCESS_CANCELED&message=" + encodeURIComponent("사용자에 의해 결제가 취소되었습니다."));
    await page.waitForTimeout(800);
    const back = { toast: await L.toasts(page), url: page.url(), saved: await page.evaluate(() => sessionStorage.getItem("dc_tpay")) };
    const ords = await page.evaluate(() => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "orders" }) }).then((r) => r.json()));
    const vo = ((ords && ords.orders) || []).find((o) => o.paymentId === oid) || {};
    await run.check(/결제를 취소했어요/.test(back.toast) && !/code=/.test(back.url) && !back.saved && vo.status === "failed" && vo.failCode === "PAY_PROCESS_CANCELED",
      "결제창에서 취소하고 돌아오면 안내 · 주소의 토스 값은 지우고 · 결제 대기 주문은 ‘결제 안 됨’", { back, vo: { st: vo.status, code: vo.failCode } }, page);
    // 이미 들어온 무통장 주문(2026-11-15 전) 처리: 무통장 + 현금영수증 신청 → 마스터 입금 확인 → 주문 목록 ‘현금영수증’ 탭 · 상세 ‘발급 대기’ → ‘발급 완료’ (2026-11-11)
    //   이제 새 무통장 주문은 받지 않아서, 시험 DB 에만 예전 값 bankMode "on" 을 잠깐 넣고 주문을 만든 뒤 다시 지워요
    const mp = await L.newPage(browser);
    run.watch(mp, "마스터 현금영수증");
    await FL.master(mp, base, info);
    const bankMode = (v) => mp.evaluate((v) => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { const d = (j.docs || []).find((x) => x[0] === "meta"), m = JSON.parse(JSON.stringify(d[1])); m.vod.settings = m.vod.settings || {}; if (v) m.vod.settings.bankMode = v; else delete m.vod.settings.bankMode; return fetch("/api/sync", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes: [{ k: "meta", base: d[2], put: m }] }) }).then((r) => r.json()); }), v);
    await bankMode("on");
    await L.reactCookie(page, base, "off"); await L.open(page, base, "/vod/checkout/v8");
    const mk = await page.evaluate(() => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare", pid: "v8", kind: "course", plan: 365, method: "bank", depositor: "체험회원", cashRcpt: { type: "p", no: "010-1234-5678" } }) }).then((r) => r.json()));
    await bankMode(null);
    const paid = await mp.evaluate((no) => fetch("/api/vod-pay", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bankOk", no }) }).then((r) => r.json()), mk.no);
    const ms = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(mp, base, mode);
      await L.open(mp, base, "/center/master/vod"); await mp.waitForTimeout(400);
      await mp.click("[data-action=vda-of][data-k=cash]"); await mp.waitForTimeout(300);
      ms[mode] = { shape: await L.domShape(mp), rows: await mp.$$eval(".vda-table tbody tr", (x) => x.map((t) => t.textContent.replace(/\s+/g, " "))), tab: await L.text(mp, "[data-action=vda-of][data-k=cash]") };
    }
    const dm = L.shapeDiff(ms.off.shape, ms.all.shape);
    await run.check(mk.ok && paid.ok && ms.off.rows.length === 1 && /현금영수증 발급 대기/.test(ms.off.rows[0]) && /1/.test(ms.off.tab) && !dm,
      "마스터 주문 목록: ‘현금영수증’ 탭에 발급할 주문 · ‘현금영수증 발급 대기’ 표시 (예전 화면 = React 화면)", { mk: mk.no, paid: paid.ok, rows: ms.off.rows, tab: ms.off.tab, dm }, mp);
    await mp.click(".vda-table [data-action=vda-od]"); await mp.waitForTimeout(400);
    const md0 = await mp.evaluate(() => { const m = document.querySelector(".a-modal"); return { txt: m ? m.textContent.replace(/\s+/g, " ") : "", btn: !!document.querySelector(".a-modal [data-action=vda-cash-done]") }; });
    await mp.click(".a-modal [data-action=vda-cash-done]"); await mp.waitForTimeout(600);
    const md1 = await mp.evaluate(() => { const m = document.querySelector(".a-modal"); return { txt: m ? m.textContent.replace(/\s+/g, " ") : "", btn: !!document.querySelector(".a-modal [data-action=vda-cash-done]") }; });
    const srvO = await mp.evaluate((no) => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => { const d = (j.docs || []).find((x) => x[0] === "vo:" + no); return d && d[1].cashRcpt; }), mk.no);
    await run.check(/현금영수증소득공제 · 010-1234-5678 · 109,000원 · 발급 대기/.test(md0.txt) && md0.btn && /발급 완료/.test(md1.txt) && !md1.btn && srvO && srvO.done > 0 && /현금영수증 발급 완료로 표시했어요/.test(await L.toasts(mp)),
      "주문 상세: 현금영수증 용도 · 번호 · 금액 · 발급 대기 + ‘현금영수증 발급 완료’ → 발급 완료로 서버에 저장", { md0: md0.txt.slice(0, 600), md1: md1.txt.slice(0, 300), srvO }, mp);
    await mp.context().close();
    await page.context().close();
  }
};
