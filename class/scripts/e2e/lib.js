/* 상시 화면 테스트(E2E) 공용 도구 — 0단계 (Next.js 전환 전 · 후에 같은 테스트로 비교)
 *
 *  · 테스트 서버: scripts/dev-server.js 를 시험용 SQLite 파일로 띄워요. 운영 DB · 결제 · 카카오 키는 절대 넘기지 않아요
 *    (환경 변수를 통째로 넘기지 않고, 필요한 것만 골라 새로 만들어요)
 *  · 브라우저: 이 컴퓨터에 설치된 Playwright(chromium)를 써요. 저장소 package.json 에는 넣지 않아요 (배포 빌드가 무거워지지 않게)
 *  · 확인 기록: check(ok, 이름, 자세히) — 실패하면 화면을 찍어 남겨요 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const net = require("net");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..", ".."); // class/
const MASTER_PW = "e2e-master-pass"; // 테스트 서버 전용 (운영 비밀번호와 무관)

/** 운영 값이 섞이지 않는 최소 환경 변수 */
function cleanEnv(extra) {
  const keep = ["PATH", "HOME", "TMPDIR", "LANG", "TZ", "SYSTEMROOT"];
  const env = {};
  keep.forEach((k) => { if (process.env[k] != null) env[k] = process.env[k]; });
  return Object.assign(env, extra || {});
}
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitHttp(url, ms) {
  const end = Date.now() + (ms || 15000);
  for (;;) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) { /* 아직 안 떴어요 */ }
    if (Date.now() > end) throw new Error("테스트 서버가 뜨지 않았어요: " + url);
    await sleep(150);
  }
}

/** 시험용 DB 파일로 테스트 서버 띄우기 → { base, stop, log } */
async function startServer(dbFile) {
  const port = await freePort();
  const env = cleanEnv({ CLASS_SQLITE: dbFile, VOD_SERVER_AUTH: "1", MASTER_PASSWORD: MASTER_PW, NODE_NO_WARNINGS: "1" });
  // E2E_SERVER=next: Next.js 서버로 (Next.js 전환 1단계~ · 먼저 저장소 맨 위에서 node class/scripts/site.js public && npx next build)
  const next = process.env.E2E_SERVER === "next", repo = path.join(ROOT, "..");
  if (next && !fs.existsSync(path.join(repo, ".next", "BUILD_ID"))) throw new Error("Next.js 빌드가 없어요: 저장소 맨 위에서 node class/scripts/site.js public && npx next build");
  const child = next
    ? spawn(process.execPath, [path.join(repo, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port), "-H", "127.0.0.1"], { cwd: repo, env: Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1" }), stdio: ["ignore", "pipe", "pipe"] })
    : spawn(process.execPath, [path.join(ROOT, "scripts", "dev-server.js"), String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
  const log = [];
  child.stdout.on("data", (b) => log.push(String(b)));
  child.stderr.on("data", (b) => log.push(String(b)));
  const base = "http://127.0.0.1:" + port;
  await waitHttp(base + "/api/vod-config");
  return { base, log, stop: () => new Promise((r) => { if (child.exitCode != null) return r(); child.once("exit", () => r()); child.kill(); }) };
}

/** 같은 시험 DB에 서버 코드(일회성 작업 등)를 따로 돌리기 — 운영 값 없이 */
function runNode(code, dbFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: ROOT, env: cleanEnv({ CLASS_SQLITE: dbFile, NODE_NO_WARNINGS: "1" }), stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", (b) => { err += b; });
    child.on("exit", (c) => (c === 0 ? resolve(out) : reject(new Error((err || out).slice(-2000)))));
  });
}

function chromium() {
  try { return require("playwright").chromium; } catch (e) {
    throw new Error("Playwright(chromium)가 없어요. 이 테스트는 Playwright 가 설치된 컴퓨터에서 돌려요 (npm i -g playwright && npx playwright install chromium)");
  }
}

/** 확인 기록 + 페이지 오류 모으기 */
function makeRun(name, shotDir) {
  const checks = [], errs = [];
  let n = 0;
  const run = {
    name, checks, errs,
    /** 페이지 오류 · 콘솔 오류 · 서버 저장 거절을 모아요 (테스트가 끝날 때 0개여야 통과) */
    watch(page, tag) {
      page.on("pageerror", (e) => errs.push(tag + " 페이지 오류: " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource|ERR_|net::/.test(m.text())) errs.push(tag + " 콘솔 오류: " + m.text().slice(0, 300)); });
      page.on("response", async (r) => {
        if (!/\/api\/sync/.test(r.url())) return;
        try { const j = await r.json(); (j.results || []).forEach((x) => { if (x.error) errs.push(tag + " 저장 거절 " + x.k + " " + x.error); }); } catch (e) { /* 응답 본문 없음 */ }
      });
    },
    async check(ok, label, info, page) {
      n++;
      const c = { ok: !!ok, label };
      if (!ok) {
        c.info = info === undefined ? undefined : typeof info === "string" ? info.slice(0, 800) : JSON.stringify(info).slice(0, 800);
        if (page && shotDir) { try { const f = path.join(shotDir, name + "-" + n + ".png"); await page.screenshot({ path: f, fullPage: true }); c.shot = f; } catch (e) { /* 화면을 못 찍어도 계속 */ } }
      }
      checks.push(c);
      return !!ok;
    }
  };
  return run;
}

/* ---------- 화면 도우미 (지금 화면 · 나중 Next.js 화면이 같은 주소 · 같은 결과를 내야 해요) ---------- */
/** 새 브라우저 창 — 운영(www.doogoclass.com)처럼 ‘#’ 없는 깨끗한 주소로 (index.html 이 dc:clean 을 보고 켜요) */
async function newPage(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
  await ctx.addInitScript(() => { try { localStorage.setItem("dc:clean", "1"); } catch (e) { /* 저장소를 못 쓰면 #주소로 */ } });
  return ctx.newPage();
}
/** 첫 로딩이 끝날 때까지 (로딩 화면이 사라지고 화면이 그려짐) */
async function ready(page, ms) {
  await page.waitForFunction(() => { const r = document.getElementById("root"); return !!(r && r.children.length && !r.querySelector(".boot-wait")); }, null, { timeout: ms || 15000 });
  await page.waitForTimeout(300);
}
async function open(page, base, p) {
  // E2E_REACT=1: 모든 테스트를 React 화면을 켠 채로 (이 창에 dc_next 쿠키가 아직 없을 때만 all — React 화면 테스트가 고른 값은 그대로)
  if (process.env.E2E_REACT === "1" && !(await page.context().cookies(base)).some((c) => c.name === "dc_next")) await page.context().addCookies([{ name: "dc_next", value: "all", url: base }]);
  await page.goto(base + p, { waitUntil: "load" }); await ready(page);
}
const text = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; }, sel);
const toasts = (page) => page.evaluate(() => Array.from(document.querySelectorAll("#toast-root .toast")).map((t) => t.textContent.trim()).join(" | "));
const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const me = (page) => page.evaluate(() => (window.DB && DB.remote && DB.remote.me) || null);
/** 이 브라우저의 저장 · 쿠키를 비우고 새로 시작 */
async function fresh(page, base) {
  await page.goto(base + "/terms", { waitUntil: "load" });
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* 비우기 실패해도 계속 */ } });
  await page.context().clearCookies();
}
/** 서버에 남은 변경을 다 보낼 때까지 */
async function flushed(page, ms) {
  await page.waitForFunction(() => !(window.DB && DB.remote && DB.remote.pending && DB.remote.pending()), null, { timeout: ms || 10000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/* ---------- React 화면 (Next.js 전환 4-4 ~) ---------- */
/** 이 창에서 React 화면 스위치 (쿠키 dc_next = all · off · 화면 키) — 서버(proxy.js)가 보고 그 화면을 보내요 */
async function reactCookie(page, base, v) { await page.context().addCookies([{ name: "dc_next", value: v, url: base }]); }
/** #root 구조를 글로 (태그 · 속성 · 글자) — 예전 화면과 React 화면이 똑같은지 비교해요.
 *  움직임용으로 그린 뒤 붙는 표시(서비스 바꾸기 손잡이 위치 · 내려가면 생기는 그림자 · 움직임 시작)와 아이콘 그림 내용은 빼요 */
const domShape = (page, id) => page.evaluate((id) => {
  const src = document.getElementById(id || "root"), sels = Array.from(src.querySelectorAll("select")).map((x) => x.value);
  const c = src.cloneNode(true); c.normalize();
  // 고르기 칸: ‘selected’ 표시(예전 HTML · React 가 다르게 달아요) 대신 지금 골라진 값으로 비교해요
  c.querySelectorAll("select").forEach((x, i) => { x.setAttribute("data-val", sels[i]); x.querySelectorAll("option").forEach((o) => o.removeAttribute("selected")); });
  // 자료실 열람자 표시(이름 · 기수 · 지금 시각)는 시각만 빼요
  c.querySelectorAll(".lib-wm span").forEach((el) => { el.textContent = el.textContent.replace(/\d{1,2}\/\d{1,2} \d{2}:\d{2}$/, "M/D hh:mm"); });
  // 예전 강의실이 #root 에 붙이는 ‘누가 그린 틀인지’ 표시(data-who)는 화면 모양이 아니라서 빼요
  c.removeAttribute("data-who");
  // 한국 · 뉴질랜드 시계(15초마다)는 시각만 빼요
  c.querySelectorAll(".wclock .wc-txt b").forEach((el) => { el.textContent = "00:00"; });
  // 움직임: 숫자 올라가기는 도는 중인 값 대신 최종 숫자 · 화면에 들어온 표시(is-in)는 스크롤 · 시간에 따라 달라서 빼요
  c.querySelectorAll("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
  // 남은 시간(1초마다 바뀜)은 마감 시각으로 · 못 불러오면 스스로 지우는 그림(유튜브 미리보기 · 네트워크에 따라 다름)은 빼요
  c.querySelectorAll("[data-cd]").forEach((el) => { el.textContent = el.dataset.cd; });
  c.querySelectorAll('img[onerror="this.remove()"]').forEach((el) => el.remove());
  // 강의실 썸네일도 못 불러오면 예전 코드가 지워요 (app.js error 처리 — 네트워크 · 시각에 따라 다름)
  c.querySelectorAll(".lesson-thumb img, .video img, .vod-thumb img, .mv-tile-img img").forEach((el) => el.remove());
  // 줄 넘김 표시(한 쪽뿐이면 one)는 줄 너비를 재고 나서 붙어서 시각에 따라 달라요
  c.querySelectorAll(".vd-pager").forEach((el) => el.classList.remove("one"));
  c.querySelectorAll("*").forEach((el) => {
    if (el.classList.contains("site-sw")) { ["ready", "no-anim", "at-dg", "at-vod"].forEach((k) => el.classList.remove(k)); el.style.removeProperty("--kx"); el.style.removeProperty("--kw"); }
    ["is-sc", "mo", "stuck", "is-in", "pop"].forEach((k) => el.classList.remove(k));
    if (el.getAttribute("class") === "") el.removeAttribute("class");
    if (el.getAttribute("style") === "") el.removeAttribute("style");
  });
  const out = [];
  (function walk(n, d) {
    if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) out.push("  ".repeat(d) + "#" + t); return; }
    if (n.nodeType !== 1) return;
    const at = Array.from(n.attributes).map((a) => { let v = a.value; if (a.name === "style") v = (n.style && n.style.cssText != null ? n.style.cssText : v).split(";").map((x) => x.trim().replace(/\s*:\s*/, ":")).filter(Boolean).sort().join(";"); if (a.name === "class") v = v.split(/\s+/).filter(Boolean).sort().join(" "); return a.name + "=" + JSON.stringify(v); }).sort();
    out.push("  ".repeat(d) + "<" + n.tagName.toLowerCase() + (at.length ? " " + at.join(" ") : "") + ">");
    if (n.tagName.toLowerCase() === "svg") { out.push("  ".repeat(d + 1) + "[svg " + n.innerHTML.replace(/url\([^)]*\)/g, "url()").replace(/fnz\d+/g, "fnz").length + "]"); return; }
    n.childNodes.forEach((x) => walk(x, d + 1));
  })(c, 0);
  return out.join("\n");
}, id || "");
/** 두 구조가 처음 다른 곳 (같으면 null) */
function shapeDiff(a, b) { const A = a.split("\n"), B = b.split("\n"); let i = 0; while (i < A.length && A[i] === B[i]) i++; return i >= A.length && i >= B.length ? null : { at: i, old: A.slice(Math.max(0, i - 2), i + 4), new: B.slice(Math.max(0, i - 2), i + 4) }; }

module.exports = { reactCookie, domShape, shapeDiff, ROOT, MASTER_PW, cleanEnv, freePort, sleep, waitHttp, startServer, runNode, chromium, makeRun, newPage, ready, open, text, toasts, bodyText, me, fresh, flushed, tmp: () => fs.mkdtempSync(path.join(os.tmpdir(), "doogo-e2e-")) };
