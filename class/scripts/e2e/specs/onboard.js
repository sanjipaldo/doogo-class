/* 강사 입점 → 강사센터 계정 (2026-11-06) — 마스터가 누르는 그대로
 *  · 두고 파트너스(VOD) 지원서 → 계약 완료 → ‘VOD 강사로 등록’: 아이디 = 지원서 이름 · 비밀번호 = 전화번호 뒷자리 4자리,
 *    스토어에 두잉고 계정 없이 먼저 올린 그 강사 클래스(외부 크리에이터)도 같이 옮겨요(정산 비율 · 강사진 순서 키까지) → 강사 로그인 → DOOGO CLASS 탭만 · 두잉고 자물쇠
 *  · 두잉고(LIVE) 문의 → ‘LIVE 플랫폼 만들기’ → 강사 로그인 → 두잉고 탭만 · DOOGO CLASS 자물쇠
 *  · 같은 이름(띄어쓰기 무시) + 뒷자리 계정은 막고 · 연결된 계정이 지워지면 카드에 등록 버튼이 다시 보여요
 *  이름 · 전화번호는 모두 시험용(실제 사람 아님) */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "강사 입점 → 강사센터 계정 (VOD · LIVE · 자물쇠)",
  async run({ base, info, browser, run, L }) {
    const sfx = String(Date.now() % 1000).padStart(3, "0");
    const vod = { name: "이투이" + sfx, nick: "이투셀러" + sfx, phone: "010-2468-1357", pin: "1357" }, live = { name: "삼사오" + sfx, phone: "010-1357-2468", pin: "2468" };
    const pid = "ve2e" + sfx, ptitle = "E2E 구매대행 클래스 " + sfx;
    const post = (body) => fetch(base + "/api/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    // 1) 지원서 두 건 — 화면 지원서가 보내는 것과 같은 API
    const r1 = await post({ action: "partner-apply", source: "partners", name: vod.name, email: "e2e-vod" + sfx + "@example.com", phone: vod.phone, where: "[두고 파트너스] 없음", course: "[VOD 강의 / 쇼핑몰 · 커머스] 광고 없이 시작하는 구매대행", agree: true, form: { nick: vod.nick, topic: "광고 없이 시작하는 구매대행", kinds: ["VOD 강의"] } });
    const r2 = await post({ action: "partner-apply", name: live.name, email: "e2e-live" + sfx + "@example.com", phone: live.phone, where: "오프라인 강의", course: "4주 실전 LIVE 강의", agree: true });
    await run.check(r1.ok && r2.ok, "지원서 두 건 접수 (두고 파트너스 VOD · 두잉고 LIVE)", [r1, r2]);

    const page = await L.newPage(browser);
    run.watch(page, "강사 입점");
    await FL.master(page, base, info);
    // 스토어에 두잉고 계정 없이 먼저 올린 이 강사님 클래스(예: 셀러훈) — 크리에이터 이름 = 활동명 · 이 키(ext:이름)로 정산 비율 · 강사진 순서를 정해 둔 상태
    await page.evaluate(([pid, ptitle, nick]) => {
      const A = window.ADM, v = A.VD(), cat = (A.VX().cats()[0] || {}).key || "biz";
      v.products.unshift({ id: pid, status: "on", type: "vod", title: ptitle, sub: "E2E 시험 클래스", cat, iid: "", creator: nick, price: 99000, sale: null, saleEnd: "", accessDays: 365, level: "입문", base: 0, createdAt: Date.now(), share: null, faq: [],
        curriculum: [{ id: pid + "-c1", title: "시작하기", lessons: [{ id: pid + "-l1", title: "첫 강의", min: 10, video: "", preview: true }] }] });
      v.insRates = v.insRates || {}; v.insRates["ext:" + nick] = { vod: 60 };
      v.homeRails = Array.isArray(v.homeRails) ? v.homeRails : []; let t = v.homeRails.find((r) => r && r.k === "teach"); if (!t) { t = { k: "teach", mode: "pick", picks: [] }; v.homeRails.push(t); } t.picks = (t.picks || []).concat(["ext:" + nick]);
      DB.save();
    }, [pid, ptitle, vod.nick]);
    await L.flushed(page);

    // 카드 열기 → 계약 완료 → 등록 칸
    const openCard = async (name) => {
      await L.open(page, base, "/center/master/partners");
      const id = await page.evaluate((n) => { const a = Array.from(document.querySelectorAll("article.a-inq")).find((x) => (x.querySelector(".a-inq-who b") || {}).textContent && x.querySelector(".a-inq-who b").textContent.indexOf(n) >= 0); return a ? a.dataset.inq : ""; }, name);
      if (id && !(await page.$('article.a-inq.open[data-inq="' + id + '"]'))) { await page.click('article.a-inq[data-inq="' + id + '"] .a-inq-row'); await page.waitForTimeout(500); }
      return id;
    };
    const vid = await openCard(vod.name);
    await page.click('[data-action="inq-st"][data-id="' + vid + '"][data-st="done"]');
    await page.waitForTimeout(500);
    const reg0 = (await L.text(page, 'article.a-inq[data-inq="' + vid + '"] .a-inq-reg')) || "";
    await run.check(/계약 완료 — 이제 VOD 강사로 등록해 주세요/.test(reg0) && /이름\(아이디\)/.test(reg0) && /뒷자리 4자리\(비밀번호\)/.test(reg0) && !!(await page.$('article.a-inq[data-inq="' + vid + '"] .a-inq-reg.is-next [data-action="inq-make"]')),
      "마스터: 계약 완료로 바꾸면 카드에 ‘VOD 강사로 등록’ 칸 (아이디 = 이름 · 비밀번호 = 뒷자리 4자리 안내)", reg0.slice(0, 200), page);

    // VOD 강사로 등록 → 미리 채운 창 (외부 클래스 미리 체크) → 등록
    await page.click('article.a-inq[data-inq="' + vid + '"] [data-action="inq-make"]');
    await page.waitForSelector("#vins-form #vf-name");
    const pre = await page.evaluate((nick) => ({ name: document.getElementById("vf-name").value, pin: document.getElementById("vf-phone4").value, display: document.getElementById("vf-display").value, ext: !!(document.querySelector('#vins-form input[name=ext][value="' + nick + '"]') || {}).checked }), vod.nick);
    await run.check(pre.name === vod.name && pre.pin === vod.pin && pre.display === vod.nick && pre.ext, "등록 창: 이름(아이디) · 뒷자리(비밀번호) · 활동명이 지원서로 채워지고, 같은 이름의 스토어 외부 클래스는 미리 체크", pre, page);
    await page.click('#modal-root button[type="submit"][form="vins-form"]');
    await page.waitForSelector("#ins-guide-ta", { timeout: 8000 }).catch(() => {});
    const done = await page.evaluate(() => ({ title: (document.querySelector("#modal-root .a-modal-title, #modal-root h2, #modal-root h3") || {}).textContent || "", body: (document.getElementById("modal-root") || {}).innerText || "", guide: (document.getElementById("ins-guide-ta") || {}).value || "" }));
    await run.check(/VOD 강사 계정을 만들었어요/.test(done.title + done.body) && done.body.indexOf(vod.name) >= 0 && done.body.indexOf(vod.pin) >= 0 && /연결한 스토어 클래스\s*1개/.test(done.body) && /\/center\/login/.test(done.guide) && done.guide.indexOf("아이디 " + vod.name) >= 0 && done.guide.indexOf(vod.pin) < 0,
      "등록 결과 창: 아이디 · 비밀번호 · 연결한 클래스 1개 + 강사님께 보낼 안내(강사센터 주소 · 아이디, 비밀번호 숫자는 안 넣음)", { title: done.title, guide: done.guide }, page);
    await page.click('#modal-root [data-action="modal-close"]').catch(() => {});
    await page.waitForTimeout(400);
    // 등록까지 끝나면 ‘처리할 일’에서 빠져요 → ‘전체’ 탭에서 카드 다시 열기
    const inTodo = !!(await page.$('article.a-inq[data-inq="' + vid + '"]'));
    await page.click('[data-action="inq-tab"][data-k="all"]'); await page.waitForTimeout(300);
    await page.click('article.a-inq[data-inq="' + vid + '"] .a-inq-row'); await page.waitForTimeout(500);
    await run.check(!inTodo, "등록까지 끝나면 ‘처리할 일’에서 빠져요 (계약 완료만 하고 등록 전이면 남아 있어요)", inTodo, page);
    const acc = (await L.text(page, 'article.a-inq[data-inq="' + vid + '"] .a-inq-acc')) || "";
    const steps = await page.evaluate((id) => document.querySelectorAll('article.a-inq[data-inq="' + id + '"] .p-track li.done').length, vid);
    await run.check(/강사센터 계정이 열려 있어요/.test(acc) && /DOOGO CLASS 열림/.test(acc) && /두잉고 잠김/.test(acc) && /1개 연결됨/.test(acc) && acc.indexOf(vod.name) >= 0 && steps === 5,
      "카드: 강사센터 계정 칸(아이디 · 비밀번호 · DOOGO CLASS 열림 · 두잉고 잠김 · 클래스 1개) · 진행 5단계 모두 끝", { acc: acc.slice(0, 240), steps }, page);
    const mv = await page.evaluate(([pid, nick, vid]) => { const A = window.ADM, v = A.VD(), q = DB.inquiries().find((x) => x.id === vid) || {}, p = v.products.find((x) => x.id === pid) || {}, t = (v.homeRails || []).find((r) => r && r.k === "teach") || {};
      return { iid: q.iid || "", pIid: p.iid || "", rate: ((v.insRates || {})[q.iid] || {}).vod, extRate: !!(v.insRates || {})["ext:" + nick], pick: (t.picks || []).indexOf(q.iid) >= 0, extPick: (t.picks || []).indexOf("ext:" + nick) >= 0, tracks: (DB.instructor(q.iid) || {}).tracks }; }, [pid, vod.nick, vid]);
    await run.check(mv.iid && mv.pIid === mv.iid && mv.rate === 60 && !mv.extRate && mv.pick && !mv.extPick && mv.tracks && mv.tracks.vod === true && mv.tracks.live === false,
      "연결: 클래스 강사가 새 계정으로 · 외부 키로 정한 정산 비율(60) · 강사진 순서가 새 계정 키로 옮겨짐 · 열린 영역 DOOGO CLASS만", mv, page);
    await L.flushed(page);

    // 계정은 이미 있는데 같은 이름의 외부 클래스가 스토어에 따로 있으면(예: 계정만 먼저 만들고 클래스는 외부 강사로 올린 경우) 계정 칸 ‘스토어 클래스 연결’로 옮겨요
    const pid2 = pid + "b";
    await page.evaluate(([pid2, nick]) => { const A = window.ADM, v = A.VD(); v.products.unshift({ id: pid2, status: "soon", type: "vod", title: "E2E 두 번째 클래스", sub: "", cat: (A.VX().cats()[0] || {}).key || "biz", iid: "", creator: nick, price: 59000, sale: null, saleEnd: "", accessDays: 365, level: "입문", base: 0, createdAt: Date.now(), share: null, faq: [], curriculum: [] }); DB.save(); }, [pid2, vod.nick]);
    await L.flushed(page);
    await L.open(page, base, "/center/master/partners");
    await page.click('[data-action="inq-tab"][data-k="all"]'); await page.waitForTimeout(300);
    await page.click('article.a-inq[data-inq="' + vid + '"] .a-inq-row'); await page.waitForTimeout(500);
    const hint = (await L.text(page, 'article.a-inq[data-inq="' + vid + '"] .a-inq-acc-ext.hit')) || "";
    await page.click('article.a-inq[data-inq="' + vid + '"] [data-action="inq-link"]');
    await page.waitForSelector("#ext-link-form");
    const pre3 = await page.evaluate((nick) => !!(document.querySelector('#ext-link-form input[name=ext][value="' + nick + '"]') || {}).checked, vod.nick);
    await page.click('#modal-root button[type="submit"][form="ext-link-form"]');
    await page.waitForTimeout(500);
    const lk = await page.evaluate(([pid2, vid]) => { const q = DB.inquiries().find((x) => x.id === vid) || {}; return { ok: (window.ADM.VD().products.find((p) => p.id === pid2) || {}).iid === q.iid }; }, [pid2, vid]);
    await run.check(new RegExp("‘" + vod.nick + "’ 이름으로 올린 클래스 1개가 아직 이 계정과 연결돼 있지 않아요").test(hint) && pre3 && lk.ok && /스토어 클래스 1개를 연결했어요/.test(await L.toasts(page)),
      "계정이 있는데 같은 이름 외부 클래스가 남아 있으면: 계정 칸 안내 → ‘스토어 클래스 연결’(미리 체크) → 그 계정 클래스로", { hint: hint.slice(0, 120), pre3, lk }, page);
    await L.flushed(page);

    // 같은 이름(띄어쓰기 다르게) + 뒷자리로 또 만들면 막아요 — 강사 플랫폼 관리 › VOD 강사 등록
    await L.open(page, base, "/center/master/instructors");
    await page.click('[data-action="vins-add"]');
    await page.waitForSelector("#vins-form #vf-name");
    await page.fill("#vf-name", vod.name.slice(0, 1) + " " + vod.name.slice(1));
    await page.fill("#vf-phone4", vod.pin);
    await page.click('#modal-root button[type="submit"][form="vins-form"]');
    await page.waitForTimeout(400);
    const dupErr = (await L.text(page, "#vf-error")) || "";
    await run.check(/같은 이름 · 뒷자리로 로그인하는 계정이 이미 있어요/.test(dupErr), "같은 이름(띄어쓰기만 다름) + 같은 뒷자리 계정은 만들지 않아요 (로그인이 엉뚱한 계정으로 가지 않게)", dupErr, page);
    await page.click('#modal-root [data-action="modal-close"]').catch(() => {});

    // 2) VOD 강사 로그인: 이름 + 뒷자리 → DOOGO CLASS 탭 · 두잉고 자물쇠 · 옮긴 클래스가 내 VOD
    await FL.adminLogin(page, base, "instructor", vod.name, vod.pin);
    await L.open(page, base, "/center");
    const vin = await page.evaluate((pid) => { const s = DB.session.admin() || {}, lv = document.querySelector('.a-trk-sw [data-k="live"]'), vd = document.querySelector('.a-trk-sw [data-k="vod"]');
      return { role: s.role, trk: window.ADM.TRK(), liveLock: !!lv && lv.classList.contains("is-lock") && lv.dataset.action === "trk-lock", vodOn: !!vd && vd.getAttribute("aria-selected") === "true", mine: window.ADM.vodProds().map((p) => p.id).indexOf(pid) >= 0 }; }, pid);
    await run.check(vin.role === "instructor" && vin.trk === "vod" && vin.liveLock && vin.vodOn && vin.mine, "VOD 강사: 이름 + 뒷자리로 로그인 → DOOGO CLASS 탭이 열리고 두잉고(LIVE) 탭은 자물쇠 · 옮긴 클래스가 내 VOD 에", vin, page);

    // 3) LIVE: 두잉고 문의 → 계약 완료 → LIVE 플랫폼 만들기 → 강사 로그인 → 두잉고만 · DOOGO CLASS 자물쇠
    await FL.master(page, base, info);
    const lid = await openCard(live.name);
    await page.click('[data-action="inq-st"][data-id="' + lid + '"][data-st="done"]');
    await page.waitForTimeout(500);
    const reg1 = (await L.text(page, 'article.a-inq[data-inq="' + lid + '"] .a-inq-reg')) || "";
    await page.click('article.a-inq[data-inq="' + lid + '"] [data-action="inq-make"]');
    await page.waitForSelector("#ins-form #if-name");
    const pre2 = await page.evaluate(() => ({ name: document.getElementById("if-name").value, pin: document.getElementById("if-phone").value }));
    await page.click('#modal-root button[type="submit"][form="ins-form"]');
    await page.waitForSelector("#ins-guide-ta", { timeout: 8000 }).catch(() => {});
    const done2 = await page.evaluate(() => ({ body: (document.getElementById("modal-root") || {}).innerText || "", guide: (document.getElementById("ins-guide-ta") || {}).value || "" }));
    await run.check(/LIVE 강사 플랫폼을 만들어 주세요/.test(reg1) && pre2.name === live.name && pre2.pin === live.pin && /강사 플랫폼을 만들었어요/.test(done2.body) && /두잉고\(LIVE\) — 기수/.test(done2.guide),
      "LIVE 문의: 계약 완료 → ‘LIVE 플랫폼 만들기’ 창이 이름 · 뒷자리로 채워지고 → 결과 창 · 안내(두잉고 LIVE 열림)", { reg1: reg1.slice(0, 80), pre2, guide: done2.guide }, page);
    await page.click('#modal-root [data-action="modal-close"]').catch(() => {});
    await L.flushed(page);
    await FL.adminLogin(page, base, "instructor", live.name, live.pin);
    await L.open(page, base, "/center");
    const lin = await page.evaluate(() => { const s = DB.session.admin() || {}, lv = document.querySelector('.a-trk-sw [data-k="live"]'), vd = document.querySelector('.a-trk-sw [data-k="vod"]');
      return { role: s.role, trk: window.ADM.TRK(), vodLock: !!vd && vd.classList.contains("is-lock") && vd.dataset.action === "trk-lock", liveOn: !!lv && lv.getAttribute("aria-selected") === "true" }; });
    await run.check(lin.role === "instructor" && lin.trk === "live" && lin.vodLock && lin.liveOn, "LIVE 강사: 이름 + 뒷자리로 로그인 → 두잉고 탭이 열리고 DOOGO CLASS(VOD) 탭은 자물쇠", lin, page);

    // 4) 연결된 계정이 없어지면(지워짐) 카드에 등록 버튼이 다시 — 화면에서만 지워 보고 저장하지 않아요
    await FL.master(page, base, info);
    await openCard(live.name);
    await page.evaluate((lid) => { const q = DB.inquiries().find((x) => x.id === lid), i = DB.data.instructors.findIndex((x) => x.id === q.iid); if (i >= 0) DB.data.instructors.splice(i, 1); }, lid);
    await page.click('article.a-inq[data-inq="' + lid + '"] .a-inq-row'); await page.waitForTimeout(300);
    await page.click('article.a-inq[data-inq="' + lid + '"] .a-inq-row'); await page.waitForTimeout(400);
    const gone = (await L.text(page, 'article.a-inq[data-inq="' + lid + '"] .a-inq-reg')) || "";
    await run.check(/연결된 강사 계정을 찾지 못했어요/.test(gone) && !!(await page.$('article.a-inq[data-inq="' + lid + '"] [data-action="inq-make"]')), "연결된 강사 계정이 없어지면 카드에 ‘계정을 찾지 못했어요’ + 다시 등록 버튼 (예전엔 버튼이 사라졌어요)", gone.slice(0, 120), page);
    await page.context().close();
  }
};
