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
    // 1-2) 정규교육 다시보기 볼 수 있는 마지막 날 (2026-11-23): 편집 창 날짜 칸 · 빠른 버튼(라이브 날짜 + 3개월) → 지난 날짜로 저장하면
    //      강사센터 목록 ‘기간 끝남 · 잠김’ · 수강생 목록 자물쇠 · 상세는 재생기 없이 잠김 안내 (예전 화면 · React 모두) · 서버는 영상 주소를 안 보내요 → 끝나면 지우기
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/replays");
    const rpId = await page.getAttribute('button[data-action="item-edit"][data-coll="replay"]', "data-id");
    let rpq = null;
    if (rpId) {
      await page.click('button[data-action="item-edit"][data-coll="replay"][data-id="' + rpId + '"]');
      await page.waitForSelector("form#coll-form #cf-until");
      await page.fill("#cf-date", "2026-11-21");
      await page.click('[data-action="date-quick"][data-m="3"]');
      rpq = await page.inputValue("#cf-until");
      await page.fill("#cf-until", "2020-01-01");
      await page.click('#modal-root button[type="submit"][form="coll-form"]');
      await page.waitForTimeout(600);
      await L.flushed(page);
    }
    await L.open(page, base, "/center/replays");
    const rpCenter = await L.bodyText(page);
    await run.check(!!rpId && rpq === "2027-02-21" && /기간 끝남 · 잠김/.test(rpCenter), "강사센터 다시보기: ‘볼 수 있는 마지막 날’ 칸 · 라이브 날짜 + 3개월 버튼(11/21 → 2027-02-21) · 지난 날짜로 저장하면 목록에 ‘기간 끝남 · 잠김’", { rpId, rpq }, page);
    await FL.student(page, base, info);
    const rpSt = {};
    for (const mode of ["off", "all"]) {
      await L.reactCookie(page, base, mode);
      await L.open(page, base, "/replays"); await page.waitForTimeout(400);
      const card = await page.evaluate((id) => { const a = document.querySelector('a.rp-card[href$="/replays/' + id + '"]'); return a ? { locked: a.classList.contains("rp-locked"), lock: !!a.querySelector(".rp-lock"), play: !!a.querySelector(".rp-play"), off: /시청 기간 끝남/.test(a.textContent) } : null; }, rpId);
      await L.open(page, base, "/replays/" + rpId); await page.waitForTimeout(400);
      const det = await page.evaluate(() => ({ box: !!document.querySelector(".rp-locked-box"), frame: !!document.querySelector(".page iframe, .page .video, .page [data-vm], .page [data-yid]"), msg: /시청 기간이 끝났어요/.test(document.body.innerText), seenBtn: !!document.querySelector('[data-action="toggle-replay"]') }));
      rpSt[mode] = { card, det };
    }
    const bootRp = await page.evaluate(async (id) => { const j = await (await fetch("/api/bootstrap", { credentials: "same-origin" })).json(); const c = (j.docs || []).find((d) => /^content:/.test(d[0])); const x = c && (c[1].replays || []).find((r) => r.id === id); return x ? { locked: x.locked, hasVideo: "youtubeId" in x, hasSum: "summary" in x, hasAtt: "attachments" in x } : null; }, rpId);
    const okSt = (o) => !!o && !!o.card && o.card.locked && o.card.lock && !o.card.play && o.card.off && o.det.box && !o.det.frame && o.det.msg && !o.det.seenBtn;
    await run.check(okSt(rpSt.off) && okSt(rpSt.all) && !!bootRp && bootRp.locked === true && !bootRp.hasVideo && !bootRp.hasSum && !bootRp.hasAtt,
      "수강생: 기한 지난 다시보기는 목록 자물쇠 · 상세는 재생기 없이 ‘시청 기간이 끝났어요’ (예전 화면 = React) · 서버는 영상 주소 · 핵심 정리 · 자료를 안 보내요", { rpSt, bootRp }, page);
    // 되돌리기: 지우기(기한 없음) 버튼으로 비우고 저장
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/replays");
    if (rpId) {
      await page.click('button[data-action="item-edit"][data-coll="replay"][data-id="' + rpId + '"]');
      await page.waitForSelector("form#coll-form #cf-until");
      await page.click('[data-action="date-quick"][data-m="0"]');
      const cleared = await page.inputValue("#cf-until");
      await page.click('#modal-root button[type="submit"][form="coll-form"]');
      await page.waitForTimeout(600);
      await L.flushed(page);
      await L.open(page, base, "/center/replays");
      await run.check(cleared === "" && !/기간 끝남 · 잠김/.test(await L.bodyText(page)), "‘지우기 (기한 없음)’로 비우면 다시 계속 볼 수 있어요", { cleared }, page);
    }
    // 1-3) 1:1 요청 답변 (2026-11-23): 수강생 메모의 ‘오프라인’ · ‘온라인’ → 카드 ‘이름 · 기수’ 줄에 표시 · 메모를 비우면 표시 없음 (예전 화면 = React)
    //  시험 DB 에는 1:1 요청이 없어요 → 시험 수강생으로 화면에서 하나 남겨요 (시험 DB 는 묶음마다 새로 복사해요)
    await FL.student(page, base, info);
    await L.open(page, base, "/home");
    await page.evaluate(() => { window.ROUTE.hash = "#/qna/requests/new"; }); await page.waitForTimeout(600);
    await page.fill("#q-title", "E2E 1:1 요청 (메모 표시)"); await page.fill("#q-body", "수강생 메모 표시 확인용이에요.");
    await page.click("#request-form button[type='submit']"); await page.waitForTimeout(700); await L.flushed(page);
    await FL.instructor(page, base, info);
    await L.open(page, base, "/center/questions");
    await page.click('[data-action="q-tab"][data-k="all"]').catch(() => {}); await page.waitForTimeout(300);
    const qSid = await page.evaluate((sid) => { const f = document.querySelector('.a-q-form[data-sid="' + sid + '"]') || document.querySelector(".a-q-form[data-sid]"); return f ? f.getAttribute("data-sid") : null; }, info.student.sid);
    const memo0 = qSid ? await page.evaluate((sid) => (DB.student(sid) || {}).memo || "", qSid) : "";
    const setMemo = async (m) => { await page.evaluate(([sid, v]) => { const s = DB.student(sid); s.memo = v; DB.save(); }, [qSid, m]); await page.waitForTimeout(400); await L.flushed(page); };
    const tagOf = async () => {
      const out = {};
      for (const mode of ["off", "all"]) {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/center/questions");
        await page.click('[data-action="q-tab"][data-k="all"]').catch(() => {}); await page.waitForTimeout(300);
        out[mode] = await page.evaluate((sid) => { const f = document.querySelector('.a-q-form[data-sid="' + sid + '"]'), t = f && f.closest(".a-q").querySelector(".a-q-head small .a-mode"); return t ? t.className + "|" + t.textContent : ""; }, qSid);
      }
      return out;
    };
    let qm = null;
    if (qSid) { await setMemo("결제 확인 · 오프라인"); const a = await tagOf(); await setMemo("온라인 수강"); const b = await tagOf(); await setMemo(""); const c = await tagOf(); await setMemo(memo0); qm = { a, b, c }; }
    await run.check(!!qm && qm.a.off === "a-mode a-mode-offline|오프라인" && qm.a.all === qm.a.off && qm.b.off === "a-mode a-mode-online|온라인" && qm.b.all === qm.b.off && qm.c.off === "" && qm.c.all === "",
      "1:1 요청 답변: 수강생 메모 ‘오프라인’ · ‘온라인’ → 카드 이름 · 기수 줄에 표시 · 메모를 비우면 표시 없음 (예전 화면 = React)", qm, page);
    // 1-4) 두잉고 소개 목록 OFF 강사 (시험 DB 의 choi — 일회성 작업 homeOff): 강사 소개 · 무료강의는 방문자에게 ‘준비 중인 페이지예요’ · 마스터는 OFF 안내 띠와 함께 그대로 (지우지 않음)
    const pv = await L.newPage(browser), vis = {}, mas = {};
    for (const u of ["/p/choi", "/free/choi"]) { await L.open(pv, base, u); await pv.waitForTimeout(500); vis[u] = /준비 중인 페이지예요/.test(await L.bodyText(pv)); }
    await pv.context().close();
    // 2) 마스터 강사 정산: 상품 종류 탭 · 정산 규칙 카드
    await FL.master(page, base, info);
    for (const u of ["/p/choi", "/free/choi"]) { await L.open(page, base, u); await page.waitForTimeout(600); mas[u] = await page.evaluate(() => ({ off: !!document.querySelector(".lp-off, .fc-off"), ready: !!document.querySelector(".lp-empty") })); } // 안내 띠 글에도 ‘준비 중인 페이지예요’가 있어서 빈 화면 칸으로 봐요
    await run.check(Object.keys(vis).every((u) => vis[u]) && Object.keys(mas).every((u) => mas[u].off && !mas[u].ready),
      "두잉고 소개 목록 OFF 강사: 강사 소개 · 무료강의는 방문자에게 ‘준비 중인 페이지예요’ · 마스터는 ‘OFF 상태’ 안내 띠와 함께 그대로 봐요", { vis, mas }, page);
    // 1-5) 강사 입점 문의 (2026-11-23 운영 버그): 두고 파트너스 지원서 카드(‘다음 차례’ 줄)를 누르면 React 화면이 통째로 오류(‘This page couldn't load’)
    //      — 제안서 메일 칸 조각(inqDeckTx)을 예전 admin.js 가 내보내지 않았어요. 지원서를 넣고 예전 화면 · React 둘 다 펼쳐 봐요
    {
      const ap = await fetch(base + "/api/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "partner-apply", source: "partners", name: "시험지원" + String(Date.now() % 1000), email: "e2e-inq@example.com", phone: "010-1212-3434", where: "[두고 파트너스] 블로그", course: "[VOD 강의 / 부업 · 창업] 시험 주제", agree: true, form: { nick: "시험활동명", cat: "부업 · 창업", topic: "시험 주제", kinds: ["VOD 강의"] } }) }).then((r) => r.json()).catch(() => ({}));
      const errs = [], onErr = (e) => errs.push(String((e && e.message) || e).slice(0, 160));
      page.on("pageerror", onErr);
      const card = {};
      for (const mode of ["all", "off"]) {
        await L.reactCookie(page, base, mode); await L.open(page, base, "/center/master/partners"); await page.waitForTimeout(500);
        const id = await page.evaluate(() => { const a = Array.from(document.querySelectorAll("article.a-inq")).find((x) => /시험지원/.test(x.textContent) && x.querySelector(".a-inq-row")); return a ? a.dataset.inq : ""; });
        if (id && !(await page.$('article.a-inq.open[data-inq="' + id + '"]'))) { await page.click('article.a-inq[data-inq="' + id + '"] .a-inq-row'); await page.waitForTimeout(700); }
        card[mode] = await page.evaluate((id) => { const a = document.querySelector('article.a-inq.open[data-inq="' + id + '"]'), dl = a && Array.from(a.querySelectorAll(".a-inq-info dt")).find((d) => /제안서 메일/.test(d.textContent));
          return { id: !!id, open: !!a, crash: /This page couldn.t load|Application error/i.test(document.body.innerText), mail: dl ? dl.nextElementSibling.textContent : "", form: !!(a && a.querySelector(".a-inq-pt")) }; }, id);
      }
      page.off("pageerror", onErr);
      await page.context().clearCookies({ name: "dc_next" }); // 아래 시험은 원래대로 (화면 스위치 쿠키 없이)
      await run.check(!!ap.ok && ["all", "off"].every((m) => card[m].id && card[m].open && !card[m].crash && card[m].form && !!card[m].mail) && card.all.mail === card.off.mail && !errs.length,
        "강사 입점 문의: 두고 파트너스 지원서 카드를 누르면 오류 없이 펼쳐져요 · 제안서 메일 · 지원서 칸 (예전 화면 = React)", { ap: ap.ok, card, errs }, page);
    }
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
