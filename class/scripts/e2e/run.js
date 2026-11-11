/* 상시 화면 테스트(E2E) 실행 — 0단계 기준선 · 이후 단계마다 같은 테스트로 확인해요
 *
 *   node scripts/e2e/run.js                 모든 테스트 (시험 DB를 새로 만들어 테스트마다 새 복사본으로)
 *   node scripts/e2e/run.js routes logins    고른 테스트만
 *   E2E_FIXTURE=/tmp/fx node scripts/e2e/run.js   만들어 둔 시험 DB 다시 쓰기 (fixture.js 로 만든 폴더)
 *   E2E_FILES=storage node scripts/e2e/run.js    사진 · 첨부를 가짜 Supabase Storage 에 두고 (DB 전환 2부 B1)
 *   E2E_AREAS=all:only node scripts/e2e/run.js   문서 종류마다 제 표에서 (DB 전환 2부 B2~B6 · off · dual · table · only)
 *   E2E_SHOTS=/tmp/shots …                  실패한 화면 사진을 남길 폴더
 *   E2E_BASE=https://<미리보기 주소> E2E_INFO=info.json node scripts/e2e/run.js
 *                                           만들어 둔 시험 배포(시험용 DB)에 그대로 — 읽기만 하는 테스트(routes)만 돌고,
 *                                           E2E_WRITE=1 을 주면 쓰는 테스트도 (시험용 DB에서만! 운영 주소에는 쓰지 마세요)
 *
 * 운영 DB · 운영 사이트에는 접속하지 않아요. 테스트 서버(dev-server.js)를 시험 DB 파일로 띄워서 돌려요. */
"use strict";
const fs = require("fs");
const path = require("path");
const L = require("./lib");
const F = require("./fixture");

const SPECS = ["routes", "logins", "store", "classroom", "center", "idle", "files", "onboard", "split", "react", "reactdg", "reactct", "reactpm", "pay"].filter((n) => fs.existsSync(path.join(__dirname, "specs", n + ".js")));

(async () => {
  const want = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const list = want.length ? want : SPECS;
  const bad = list.filter((n) => SPECS.indexOf(n) < 0);
  if (bad.length) { console.error("모르는 테스트: " + bad.join(", ") + " (있는 것: " + SPECS.join(", ") + ")"); process.exit(2); }
  const work = L.tmp(), shots = process.env.E2E_SHOTS || path.join(work, "shots");
  fs.mkdirSync(shots, { recursive: true });
  const remote = (process.env.E2E_BASE || "").replace(/\/+$/, "");
  if (remote && /(^|\.)doogoclass\.com$/i.test(new URL(remote).hostname) && process.env.E2E_WRITE === "1") { console.error("운영 주소에는 쓰는 테스트를 돌리지 않아요 (E2E_WRITE 빼고 다시)"); process.exit(2); }
  let fx;
  if (remote) {
    fx = { db: null, info: process.env.E2E_INFO ? JSON.parse(fs.readFileSync(process.env.E2E_INFO, "utf8")) : {} };
    console.log("[e2e] 외부 주소: " + remote + (process.env.E2E_WRITE === "1" ? " (쓰는 테스트 포함)" : " (읽기만)"));
  } else if (process.env.E2E_FIXTURE && fs.existsSync(path.join(process.env.E2E_FIXTURE, "fixture.db"))) {
    fx = { db: path.join(process.env.E2E_FIXTURE, "fixture.db"), info: JSON.parse(fs.readFileSync(path.join(process.env.E2E_FIXTURE, "fixture.json"), "utf8")) };
    console.log("[e2e] 만들어 둔 시험 DB: " + fx.db);
  } else {
    console.log("[e2e] 시험 DB 만드는 중… (처음 데이터 → 스토어 → 일회성 작업)");
    fx = await F.build(path.join(work, "fx"));
  }
  if (!remote && process.env.E2E_DB === "pg") console.log("[e2e] 저장소: Postgres (PGlite · 테스트마다 시험 DB 를 옮기기 도구로 복사 · 문서마다 확인)");
  if (!remote && process.env.E2E_AREAS) console.log("[e2e] 2부 영역 스위치: " + process.env.E2E_AREAS + " (시험 DB 마다 그 칸으로 맞춘 뒤 · 서버도 같은 스위치)");
  if (!remote && process.env.E2E_FILES === "storage") console.log("[e2e] 사진 · 첨부: 가짜 Supabase Storage (진짜 HTTP · 비공개 버킷 · FILES_STORE=supabase · 시험 DB 의 파일 내용도 모두 Storage 로)");
  const browser = await L.chromium().launch();
  const results = [];
  for (const name of list) {
    const spec = require("./specs/" + name);
    if (remote && !spec.readOnly && process.env.E2E_WRITE !== "1") { console.log("- " + name + " · " + spec.title + " — 건너뜀 (데이터를 써요 · E2E_WRITE=1)"); continue; }
    const db = remote ? null : path.join(work, name + ".db");
    if (db) fs.copyFileSync(fx.db, db);
    const srv = remote ? { base: remote, stop: async () => {} } : await L.startServer(db, spec.env ? { env: spec.env } : undefined); // spec.env: 그 시험만의 서버 설정 (예: pay — 시험용 토스 키)
    const run = L.makeRun(name, shots);
    const t0 = Date.now();
    try {
      await spec.run({ base: srv.base, info: fx.info, browser, run, L, F });
    } catch (e) {
      run.checks.push({ ok: false, label: "테스트가 도중에 멈췄어요", info: String((e && e.stack) || e).slice(0, 1500) });
    } finally { const stg = srv.storage ? srv.storage() : null; await srv.stop(); if (db) fs.rmSync(db, { force: true }); if (stg) console.log("  [Storage] 옮겨 둔 파일 " + stg.moved + "개 · 화면이 받은 " + stg.gets + "번 · 새로 올린 " + stg.puts + "번"); }
    if (run.errs.length) run.checks.push({ ok: false, label: "페이지 오류 · 저장 거절이 없어야 해요", info: run.errs.slice(0, 12).join("\n") });
    const fail = run.checks.filter((c) => !c.ok);
    results.push({ name, title: spec.title, n: run.checks.length, fail, ms: Date.now() - t0 });
    console.log((fail.length ? "✗ " : "✓ ") + name + " · " + spec.title + " — " + (run.checks.length - fail.length) + "/" + run.checks.length + " (" + Math.round((Date.now() - t0) / 1000) + "초)");
    fail.forEach((c) => console.log("   ✗ " + c.label + (c.info ? "\n     " + String(c.info).replace(/\n/g, "\n     ") : "") + (c.shot ? "\n     사진: " + c.shot : "")));
  }
  await browser.close();
  const total = results.reduce((a, r) => a + r.n, 0), failed = results.reduce((a, r) => a + r.fail.length, 0);
  console.log("\n결과: " + (total - failed) + "개 통과 · " + failed + "개 실패" + (failed ? " · 실패 사진 폴더 " + shots : ""));
  if (!process.env.E2E_KEEP) fs.rmSync(path.join(work, "fx"), { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
