/* 주소 목록 — 지금 운영에서 열리는 주소가 모두 같은 화면으로 열리는지 (Next.js 전환 뒤에도 그대로여야 해요)
 *  · 깨끗한 주소(/vod/p/…) · 예전 #주소 링크(SNS · QR) · 정적 파일 · 공개 API
 *  · 화면 종류는 main.js 가 정하는 body[data-mode] 로 확인해요: vod(스토어) · admin(강사센터) · landing(강사 소개 · 무료강의) · home(두잉고 소개) · student(두잉고 강의실) */
"use strict";
module.exports = {
  title: "주소 목록 · 예전 링크 · 정적 파일 · 공개 API",
  readOnly: true, // 데이터를 쓰지 않아요 — 시험 배포 · 운영 주소에도 그대로 돌릴 수 있어요
  async run({ base, info, browser, run, L }) {
    const page = await L.newPage(browser);
    run.watch(page, "주소");
    // 상품은 공개 bootstrap 에서 읽어요 (시험 DB · 시험 배포 어디서든 같은 방법) — 스토어에 보이는 것만 (강사 노출을 끈 강사는 showOff 상품만)
    const bs0 = await (await fetch(base + "/api/bootstrap")).json();
    const vod = ((((bs0.docs || []).find((d) => d[0] === "meta") || [])[1] || {}).vod) || {}, off = Array.isArray(vod.insOff) ? vod.insOff : [];
    const prods = (vod.products || []).filter((p) => p && p.status === "on" && p.title && (off.indexOf(p.iid) < 0 || p.showOff));
    const pick = (t) => prods.find((p) => p.type === t);
    const detail = ["vod", "ebook", "live", "book"].map(pick).filter(Boolean);
    const mode = () => page.evaluate(() => document.body.dataset.mode || "");
    const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
    // 1) 화면 주소 → 화면 종류 (+ 그 화면에만 있는 것)
    const pages = [
      ["/", "vod", null, "스토어 첫 화면"],
      ["/vod", "vod", null, "스토어"],
      ["/vod/c/all", "vod", null, "전체 클래스"],
      ["/vod/teachers", "vod", null, "강사진"],
      ["/vod/search?q=AI", "vod", null, "검색"],
      ["/vod/about", "vod", null, "DOOGO CLASS 소개"],
      ["/vod/partners", "vod", null, "두고 파트너스 (강사 지원)"],
      ["/vod/login", "vod", "form[data-vd-auth='login']", "스토어 로그인"],
      ["/vod/signup", "vod", "form[data-vd-auth='signup']", "회원가입"],
      ["/doinggo", "home", null, "두잉고 소개"],
      ["/p/moon", "landing", null, "강사 소개 페이지"],
      ["/free/moon", "landing", null, "무료강의 페이지"],
      ["/login", "student", "#lg-name, [data-action='svc-tab']", "두잉고 로그인"],
      ["/login?tab=vod", "student", "#lg-vemail", "두고클래스 회원 로그인"],
      ["/center/login", "admin", "#al-id", "강사센터 로그인"],
      ["/terms", "vod", null, "이용약관"],
      ["/privacy", "vod", null, "개인정보 처리방침"],
      ["/refund", "vod", null, "환불 규정"]
    ];
    for (const [p, m, sel, label] of pages) {
      await L.open(page, base, p);
      const got = await mode(), ok = got === m && (!sel || (await has(sel)));
      await run.check(ok, "주소 " + p + " → " + label, { mode: got, want: m, sel }, page);
    }
    for (const p of detail) {
      await L.open(page, base, "/vod/p/" + p.id);
      const t = await L.bodyText(page);
      await run.check((await mode()) === "vod" && t.indexOf(p.title.slice(0, 12)) >= 0, "상품 상세 /vod/p/" + p.id + " (" + p.type + ")", { mode: await mode(), title: p.title }, page);
    }
    await run.check(detail.length >= 3, "상품 상세를 3종류 이상 확인했어요", detail.map((p) => p.id + ":" + p.type));
    // 1-1) 클래스 상세 미리보기 정보 (3단계): 자바스크립트를 안 돌리는 카카오톡 · 검색 로봇이 받는 html 에 그 클래스 제목 · 주소
    const raw = async (u) => (await fetch(base + u)).text();
    const T0 = (await raw("/")).match(/<title>([^<]*)<\/title>/)[1];
    for (const p of detail.slice(0, 3)) {
      const h = await raw("/vod/p/" + p.id + "?rs=e2e");
      const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "", og = (h.match(/<meta property="og:url" content="([^"]*)"/) || [])[1] || "";
      await run.check(t.indexOf(p.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 10)) === 0 && /\| DOOGO CLASS — 돈 되는 클래스$/.test(t) && og === "https://www.doogoclass.com/vod/p/" + encodeURIComponent(p.id), "공유 미리보기: /vod/p/" + p.id + " 에 그 클래스 제목 · 주소", { t, og });
    }
    const hidden = (vod.products || []).find((p) => p && p.status === "on" && p.title && off.indexOf(p.iid) >= 0 && !p.showOff);
    const hNo = await raw("/vod/p/no-such-class"), hHid = hidden ? await raw("/vod/p/" + hidden.id) : "";
    await run.check(hNo.indexOf("<title>" + T0 + "</title>") >= 0 && (!hidden || hHid.indexOf("<title>" + T0 + "</title>") >= 0), "없는 클래스 · 숨긴 강사 클래스는 예전 기본 미리보기 그대로", { hidden: hidden && hidden.id });
    // 1-2) 강사 소개 · 무료강의 (3단계): 서버가 넣은 제목 = 화면이 그린 뒤 제목 (같은 규칙) · 주소
    const dec = (t) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    for (const u of ["/p/" + info.instructor.iid, "/free/" + info.instructor.iid]) {
      const h = await raw(u), t = dec((h.match(/<title>([^<]*)<\/title>/) || [])[1] || ""), og = (h.match(/<meta property="og:url" content="([^"]*)"/) || [])[1] || "";
      await L.open(page, base, u);
      const shown = await page.evaluate(() => document.title);
      await run.check(t !== T0 && t === shown && og === "https://www.doogoclass.com" + u, "공유 미리보기: " + u + " — 서버가 넣은 제목이 화면 제목과 같아요", { server: t, screen: shown, og });
    }
    const hP = await raw("/p/no-such-teacher");
    await run.check(hP.indexOf("<title>" + T0 + "</title>") >= 0, "없는 강사 소개는 예전 기본 미리보기 그대로");
    // 2) 예전 #주소 링크 → 깨끗한 주소로 바뀌고 같은 화면
    const old = [["/#/doinggo", "/doinggo", "home"], ["/about", "/doinggo", "home"], ["/#/center/login", "/center/login", "admin"], ["/#/terms", "/terms", "vod"]].concat(detail.slice(0, 1).map((p) => ["/#/vod/p/" + p.id, "/vod/p/" + p.id, "vod"]));
    for (const [from, to, m] of old) {
      await L.open(page, base, from);
      const loc = await page.evaluate(() => location.pathname + location.search + location.hash);
      await run.check(loc === to && (await mode()) === m, "예전 링크 " + from + " → " + to, { loc, mode: await mode() }, page);
    }
    // 3) 정적 파일 · 공개 API
    for (const p of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/assets/brand/doogo-class-word.svg"]) {
      const r = await fetch(base + p);
      await run.check(r.status === 200, "정적 파일 " + p + " (200)", r.status);
    }
    const cfg = await (await fetch(base + "/api/vod-config")).json();
    await run.check(cfg && cfg.cfg && cfg.cfg.auth === true, "공개 API /api/vod-config — 서버 회원 로그인 켜짐", cfg);
    const bs = await (await fetch(base + "/api/bootstrap")).json();
    await run.check(Array.isArray(bs.docs) && bs.docs.some((d) => d[0] === "meta") && bs.me && !bs.me.admin && !bs.me.student, "공개 API /api/bootstrap — 공개 문서만 · 로그인 없음", { n: (bs.docs || []).length, me: bs.me });
    // 강사 계정(ins:)의 연락처 · 정산 · 뒷자리 · 코치 목록, 어디서든 비밀번호 칸은 공개 문서에 없어야 해요 (강사 소개 페이지의 공개 연락처 landing.contact 는 공개용)
    const leaks = [];
    (function walk(v, p, ins) {
      if (!v || typeof v !== "object") return;
      Object.keys(v).forEach((k) => {
        if (/^(pwHash|pw|password)$/.test(k) || (ins && /^(contact|vodSettle|phone4|trackReq|coaches)$/.test(k))) leaks.push(p + "." + k);
        walk(v[k], p + "." + k, ins && p.split(".").length < 2);
      });
    })(Object.fromEntries((bs.docs || []).map((d) => [d[0], d[1]])), "", false);
    (bs.docs || []).filter((d) => /^ins:/.test(d[0])).forEach((d) => Object.keys(d[1] || {}).forEach((k) => { if (/^(contact|vodSettle|phone4|trackReq|coaches)$/.test(k)) leaks.push(d[0] + "." + k); }));
    await run.check(!leaks.length, "공개 문서에 강사 연락처 · 정산 · 뒷자리 · 비밀번호가 없어요", leaks);
    await page.context().close();
  }
};
