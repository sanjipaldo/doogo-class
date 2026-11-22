/* 공유 이미지 (카카오톡 · 페이스북 · 검색 미리보기) 1200×630 을 다시 만들어요.
 *
 *   node scripts/og-image.js            두고클래스 assets/home/og-doogoclass.jpg   (playwright 필요 — 이 폴더를 잠깐 띄워 찍고 바로 닫아요)
 *   node scripts/og-image.js doinggo    두잉고(/doinggo) assets/home/og-doinggo.jpg — 바꾸면 api/_lib/pagemeta.js 의 DG_OG_V 도 올려요 (2026-11-22)
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
const WHICH = process.argv[2] === "doinggo" ? "doinggo" : "doogoclass";
const OUT = path.join(ASSETS, "home", WHICH === "doinggo" ? "og-doinggo.jpg" : "og-doogoclass.jpg");
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

/* 두잉고 (2026-11-22): 카카오톡 미리보기에서 글씨가 작아 안 보이던 것 → 제목 100 · 보조 문구 44 · 알약 34px (예전 약 64 · 26 · 20px)
 * 왼쪽 글씨는 넓게(720px) · 오른쪽은 빨간 원 위 휴대폰 화면(수강생 강의실 첫 화면 위쪽 — 이름은 이미 OOO) 하나만 크게 */
const DG_HTML = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/assets/fonts/pretendard.css"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard Variable',Pretendard,sans-serif;-webkit-font-smoothing:antialiased}
.og{position:relative;width:1200px;height:630px;overflow:hidden;background:#fff}
.bg{position:absolute;left:800px;top:-70px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#ff4d6d,#ff0037 60%,#d6002e)}
.l{position:absolute;left:72px;top:0;bottom:0;width:740px;display:flex;flex-direction:column;justify-content:center}
.logo{height:66px;align-self:flex-start}
h1{margin-top:30px;font-size:100px;line-height:1.12;font-weight:900;letter-spacing:-.055em;color:#111;white-space:nowrap}
h1 span{display:block} h1 em{font-style:normal;color:#ff0037}
.sub{margin-top:24px;font-size:44px;font-weight:800;letter-spacing:-.04em;color:#3b3b42;white-space:nowrap}
.pills{margin-top:30px;display:flex;gap:14px}
.pill{height:66px;padding:0 28px;border-radius:999px;display:flex;align-items:center;font-size:33px;font-weight:800;letter-spacing:-.035em;color:#fff;background:#16161a;white-space:nowrap}
.pill.r{background:#ff0037}
.phone{position:absolute;left:868px;top:150px;width:292px;height:600px;border-radius:46px;background:#16161a;padding:11px;box-shadow:0 26px 60px rgba(110,0,20,.38)}
.scr{width:100%;height:100%;border-radius:36px;overflow:hidden;background:#fff}
.scr img{display:block;width:100%}
</style><div class="og"><div class="bg"></div>
<div class="l"><img class="logo" src="/assets/brand/doinggo-word.svg" alt="">
<h1><span>강의는 강사님이,</span><span>운영은 <em>두잉고</em>가</span></h1>
<p class="sub">내 이름으로 된 강의 플랫폼</p>
<div class="pills"><span class="pill r">수강생은 무료</span><span class="pill">기수마다 1인 수강료 1명분</span></div></div>
<div class="phone"><div class="scr"><img src="/assets/home/bw-student.webp" alt=""></div></div></div>`;

// assets 폴더 파일만 내줘요 (찍는 동안 이 컴퓨터 안에서만)
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/__og.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(WHICH === "doinggo" ? DG_HTML : HTML); }
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
    // 두잉고: 글씨가 휴대폰 화면(오른쪽)을 넘어가거나 그림이 안 들어오면 찍지 않아요
    if (WHICH === "doinggo") {
      const chk = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const ph = r(".phone").left, imgs = [...document.images].every((i) => i.complete && i.naturalWidth > 0); return { right: Math.max(...["h1 span", ".sub", ".pills"].map((s) => Math.max(...[...document.querySelectorAll(s)].map((e) => e.getBoundingClientRect().right)))), ph, imgs }; });
      if (!chk.imgs || chk.right > chk.ph - 16) throw new Error("글씨가 휴대폰 화면에 닿거나 그림을 못 불러왔어요: " + JSON.stringify(chk));
    }
    await p.screenshot({ path: OUT, type: "jpeg", quality: 88 });
    console.log("✓ " + path.relative(ROOT, OUT) + " (" + Math.round(fs.statSync(OUT).size / 1024) + "KB) — " + (WHICH === "doinggo" ? "api/_lib/pagemeta.js 의 DG_OG_V" : "index.html 의 ?v=") + " 숫자도 바꿔 주세요");
  } catch (e) {
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    await b.close();
    srv.close();
  }
});
