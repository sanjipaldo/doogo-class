/* 두고클래스 공유 이미지 (카카오톡 · 페이스북 · 검색 미리보기) — assets/home/og-doogoclass.jpg 1200×630 을 다시 만들어요.
 *
 *   node scripts/og-image.js        (playwright 필요 — 이 폴더를 잠깐 띄워 찍고 바로 닫아요)
 *
 * - 글꼴은 찍는 화면과 같은 주소에서 불러와요. 다른 주소에서 부르면 글꼴이 막혀 기본 글꼴(얇은 글씨)로 찍혀요.
 *   글꼴 이름은 'Pretendard Variable' 이에요 (assets/fonts/pretendard.css). 못 불러오면 찍지 않고 멈춰요.
 * - 미리보기는 보통 300~500px 너비로 줄어 보여요 → 글씨는 40px 넘게만 써요 (제목 112 · 보조 문구 48).
 * - 이미지를 바꾸면 index.html 의 og:image · og:image:secure_url · twitter:image 끝 ?v= 숫자도 바꿔야
 *   카카오톡 · 페이스북이 예전 이미지 대신 새 이미지를 가져가요. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const OUT = path.join(ASSETS, "home", "og-doogoclass.jpg");
const TYPES = { ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png" };
const ICONS = ["biz", "commerce", "marketing", "ai", "money", "vod", "ebook", "live", "career"];

const HTML = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/assets/fonts/pretendard.css"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard Variable',Pretendard,sans-serif;-webkit-font-smoothing:antialiased}
.og{position:relative;width:1200px;height:630px;overflow:hidden;background:#fff}
.bg{position:absolute;left:740px;top:-125px;width:660px;height:660px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#ff4d6d,#ff0037 60%,#d6002e)}
.l{position:absolute;left:72px;top:0;bottom:0;width:700px;display:flex;flex-direction:column;justify-content:center}
.logo{height:52px;align-self:flex-start}
h1{margin-top:26px;font-size:112px;line-height:1.1;font-weight:900;letter-spacing:-.055em;color:#111;white-space:nowrap}
h1 span{display:block} h1 em{font-style:normal;color:#ff0037}
.sub{margin-top:28px;font-size:48px;font-weight:800;letter-spacing:-.04em;color:#3b3b42;white-space:nowrap}
.tiles{position:absolute;right:48px;top:131px;display:grid;grid-template-columns:repeat(3,112px);gap:16px}
.t{width:112px;height:112px;border-radius:30px;background:#fff;display:grid;place-items:center;box-shadow:0 16px 36px rgba(120,0,20,.25)}
.t img{width:81px;height:81px;object-fit:contain}
</style><div class="og"><div class="bg"></div>
<div class="l"><img class="logo" src="/assets/brand/doogo-class-word.svg" alt="">
<h1><span>돈 되는 노하우,</span><span><em>두고클래스</em>에서</span></h1>
<p class="sub">VOD · 전자책 · LIVE까지 한곳에서</p></div>
<div class="tiles">${ICONS.map((k) => `<div class="t"><img src="/assets/vod/cat/${k}.webp" alt=""></div>`).join("")}</div></div>`;

// assets 폴더 파일만 내줘요 (찍는 동안 이 컴퓨터 안에서만)
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/__og.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(HTML); }
  const f = path.join(ROOT, path.normalize(u).replace(/^[/\\]+/, ""));
  if (!f.startsWith(ASSETS + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

srv.listen(0, "127.0.0.1", async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
    await p.goto("http://127.0.0.1:" + srv.address().port + "/__og.html", { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const loaded = await p.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded" && /Pretendard/.test(f.family)).length);
    if (!loaded) throw new Error("Pretendard 글꼴을 못 불러왔어요 — 기본 글꼴로 찍히지 않게 멈춰요");
    await p.screenshot({ path: OUT, type: "jpeg", quality: 88 });
    console.log("✓ " + path.relative(ROOT, OUT) + " (" + Math.round(fs.statSync(OUT).size / 1024) + "KB) — index.html 의 ?v= 숫자도 바꿔 주세요");
  } catch (e) {
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
    srv.close();
  }
});
