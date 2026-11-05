/* 사진 · 첨부 — 마스터가 올린 파일을 브라우저에서 받기 (볼 수 있는 범위 · 같은 바이트 · 캐시 머리말)
 *  DB 전환 2부 B1: E2E_FILES=storage 로 돌리면 내용이 가짜 Supabase Storage(진짜 HTTP · 비공개 버킷)를 거쳐요 — 주소(/api/file?h=)는 어느 쪽이든 같아요.
 *  올리기는 화면이 쓰는 것과 같은 /api/file (vod.js matPut) · 받기는 <img> · 내려받기(fetch) */
"use strict";
const FL = require("./_flows");

// 1×1 PNG (빨간 점) · 작은 PDF
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

module.exports = {
  title: "사진 · 첨부 (올리기 · 범위 · 받기" + (process.env.E2E_FILES === "storage" ? " · Supabase Storage" : "") + ")",
  async run({ base, info, browser, run, L }) {
    const pdf = Buffer.from("%PDF-1.4 E2E 수업 자료 " + Date.now()).toString("base64");
    const up = (page, data, scope) => page.evaluate(([d, s]) => fetch("/api/file", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: d, scope: s }) }).then(async (r) => ({ st: r.status, j: await r.json().catch(() => null) })), [data, scope]);
    const get = (page, url) => page.evaluate((u) => fetch(u, { credentials: "same-origin" }).then(async (r) => ({ st: r.status, n: r.status === 200 ? (await r.arrayBuffer()).byteLength : 0, type: r.headers.get("content-type"), cache: r.headers.get("cache-control") || "" })), url);
    const img = (page, url) => page.evaluate((u) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im.naturalWidth + "x" + im.naturalHeight); im.onerror = () => ok("error"); im.src = u; }), url);

    // 마스터: 공개 사진 · 유료 수업 자료(vodp) · 제출 서류(adm) 올리기
    const pm = await L.newPage(browser); run.watch(pm, "사진 · 첨부(마스터)");
    await FL.master(pm, base, info);
    const pid = "e2e1"; // 범위 이름만 (산 회원이 없는 클래스 — 방문자는 막혀요)
    const a = await up(pm, "data:image/png;base64," + PNG, "pub"), b = await up(pm, "data:application/pdf;base64," + pdf, "vodp:" + pid), c = await up(pm, "data:application/pdf;base64," + pdf.split("").reverse().join("").replace(/[^A-Za-z0-9+/]/g, "A"), "adm");
    const urls = [a, b, c].map((x) => (x.j && x.j.url) || "");
    await run.check(urls.every((u) => /^\/api\/file\?h=[0-9a-f]{40}$/.test(u)), "마스터: 사진 · 수업 자료 · 서류 올리기 → 주소 /api/file?h= (예전과 같은 모양)", [a.st, b.st, c.st], pm);
    const mb = await get(pm, urls[1]), mc = await get(pm, urls[2]);
    await run.check(mb.st === 200 && mb.n === Buffer.from(pdf, "base64").length && /attachment|pdf/.test(mb.type + "") && /^private/.test(mb.cache) && mc.st === 200, "마스터: 수업 자료 · 서류 받기 (같은 크기 · 개인 캐시)", { mb, mc }, pm);

    // 방문자: 공개 사진은 보이고 · 수업 자료 · 서류는 막혀요
    const pv = await L.newPage(browser); run.watch(pv, "사진 · 첨부(방문자)");
    await L.open(pv, base, "/");
    const sz = await img(pv, urls[0]), va = await get(pv, urls[0]), vb = await get(pv, urls[1]), vc = await get(pv, urls[2]);
    await run.check(sz === "1x1" && va.st === 200 && va.type === "image/png" && /^public/.test(va.cache) && vb.st === 403 && vc.st === 403, "방문자: 공개 사진은 화면에 보이고(1×1) · 수업 자료 · 서류는 403", { sz, va, vb: vb.st, vc: vc.st }, pv);
    const nf = await get(pv, "/api/file?h=" + "0".repeat(40));
    await run.check(nf.st === 404, "없는 파일은 404", nf.st, pv);
    await pm.context().close(); await pv.context().close();
  }
};
