/* 웹 아이콘 (브라우저 탭 · 아이폰 · 삼성 인터넷 · 안드로이드 홈 화면) — 앱 아이콘 2안: 흰 바탕 · 빨강 DOOGO / CLASS 두 줄 (2026-11-02)
 *
 *   node scripts/web-icons.js        (playwright 필요)
 *
 * 원본은 assets/brand/app-icon.svg 하나 (1024×1024 각진 흰 정사각형 · 글자 폭 760). 이 파일만 고치면 아래가 다 바뀌어요.
 * 만드는 파일
 *   assets/brand/favicon.svg            탭 아이콘 (둥근 흰 사각형 · 글자를 크게 — 작게 보여도 읽히게)
 *   assets/brand/favicon.png            64×64 (svg 를 못 읽는 브라우저)
 *   assets/brand/apple-touch-icon.png   180×180 아이폰 · 삼성 인터넷 홈 화면 (네모 그대로 — 모서리는 기기가 둥글게)
 *   apple-touch-icon.png                같은 파일을 사이트 맨 위에도 (주소를 정해 두지 않은 앱이 찾는 자리)
 *   assets/brand/icon-192.png · icon-512.png · icon-maskable-512.png   manifest.webmanifest (안드로이드 홈 화면)
 * 아이콘을 바꾸면 index.html 의 아이콘 주소 끝 ?v= 와 manifest.webmanifest 의 ?v= 도 올려 주세요. */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const BRAND = path.join(ROOT, "assets", "brand");
const MASTER = fs.readFileSync(path.join(BRAND, "app-icon.svg"), "utf8");
// 원본에서 글자(path)만 꺼냄 — 1024 칸 가운데(512, 512)에 폭 760 으로 놓여 있음
const LETTERS = (MASTER.match(/<path\b[^>]*\/>/g) || []).join("");
if (!LETTERS) throw new Error("assets/brand/app-icon.svg 에서 글자를 찾지 못했어요");
const BASE_W = 760;

/** 1024 캔버스 · 글자 폭 w · 모서리 r(0 이면 네모) */
function svg(w, r) {
  const k = (w / BASE_W).toFixed(4);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" rx="' + r + '" fill="#FFFFFF"/>' +
    '<g transform="translate(512 512) scale(' + k + ') translate(-512 -512)">' + LETTERS + "</g></svg>";
}
const OUT = [
  // [파일, 픽셀, 글자 폭(1024 기준), 모서리]
  ["favicon.png", 64, 900, 200],
  ["apple-touch-icon.png", 180, 760, 0],
  ["icon-192.png", 192, 760, 0],
  ["icon-512.png", 512, 760, 0],
  ["icon-maskable-512.png", 512, 620, 0] // 안드로이드가 동그랗게 잘라도 글자가 안쪽 안전 영역(지름 80%)에 들어가게
];

(async () => {
  fs.writeFileSync(path.join(BRAND, "favicon.svg"), svg(900, 200));
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    for (const [name, px, w, r] of OUT) {
      await p.setViewportSize({ width: px, height: px });
      await p.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + px + "px;height:" + px + "px}</style>" + svg(w, r));
      await p.screenshot({ path: path.join(BRAND, name), omitBackground: r > 0 });
      console.log("✓ assets/brand/" + name + " (" + px + "px)");
    }
    fs.copyFileSync(path.join(BRAND, "apple-touch-icon.png"), path.join(ROOT, "apple-touch-icon.png"));
    console.log("✓ apple-touch-icon.png (사이트 맨 위) · assets/brand/favicon.svg");
  } finally {
    await b.close();
  }
})().catch((e) => { console.error("✗ " + e.message); process.exitCode = 1; });
