/* 웹 아이콘 (브라우저 탭 · 아이폰 · 삼성 인터넷 · 안드로이드 홈 화면) — 흰 바탕 · 검정 ‘두’ · 빨간 밑줄 (2026-10-28 시안)
 *
 *   node scripts/web-icons.js        (playwright 필요)
 *
 * 만드는 파일
 *   assets/brand/favicon.svg            탭 아이콘 (둥근 흰 사각형 · 글자 크게 — 작게 보여도 읽히게)
 *   assets/brand/favicon.png            64×64 (svg 를 못 읽는 브라우저)
 *   assets/brand/apple-touch-icon.png   180×180 아이폰 · 삼성 인터넷 홈 화면 (네모 그대로 — 모서리는 기기가 둥글게)
 *   apple-touch-icon.png                같은 파일을 사이트 맨 위에도 (주소를 정해 두지 않은 앱이 찾는 자리)
 *   assets/brand/icon-192.png · icon-512.png · icon-maskable-512.png   manifest.webmanifest (안드로이드 홈 화면)
 * 글자 모양을 바꾸면 이 파일의 GLYPH 만 고치고 다시 돌리면 돼요. index.html 의 아이콘 주소 끝 ?v= 도 올려 주세요. */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const BRAND = path.join(ROOT, "assets", "brand");
// ‘두’ 글자(검정) + 밑줄(빨강) — 72 × 121 단위, 오른쪽으로 살짝 기울임
const GLYPH = '<g transform="matrix(1 0 -0.2 1 16 0)"><path d="M20.8 22.6V15.1H70.2V0H2V37.6H70.2V22.6ZM72.2 45.1H0V60.2H26.7V75.2H45.4V60.2H72.2Z" fill="#111111"/><path d="M1.4 113.2 Q36.1 101.2 72.2 107.2" fill="none" stroke="#FF0037" stroke-width="16.2" stroke-linecap="round"/></g>';
const CX = 37.5, CY = 60.6, GH = 121; // 기울인 글자 묶음의 가운데 · 높이 (밑줄 굵기 포함)
/** 1024 캔버스 · 글자 높이 비율 h · 모서리 r(0 이면 네모) */
function svg(h, r) {
  const s = (1024 * h) / GH, tx = 512 - CX * s, ty = 512 - CY * s;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" rx="' + r + '" fill="#FFFFFF"/>' +
    '<g transform="translate(' + tx.toFixed(1) + " " + ty.toFixed(1) + ") scale(" + s.toFixed(3) + ')">' + GLYPH + "</g></svg>";
}
const OUT = [
  // [파일, 픽셀, 글자 높이 비율, 모서리]
  ["favicon.png", 64, 0.74, 230],
  ["apple-touch-icon.png", 180, 0.6, 0],
  ["icon-192.png", 192, 0.6, 0],
  ["icon-512.png", 512, 0.6, 0],
  ["icon-maskable-512.png", 512, 0.5, 0]
];

(async () => {
  fs.writeFileSync(path.join(BRAND, "favicon.svg"), svg(0.74, 230));
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    for (const [name, px, h, r] of OUT) {
      await p.setViewportSize({ width: px, height: px });
      await p.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + px + "px;height:" + px + "px}</style>" + svg(h, r));
      await p.screenshot({ path: path.join(BRAND, name), omitBackground: r > 0 });
      console.log("✓ assets/brand/" + name + " (" + px + "px)");
    }
    fs.copyFileSync(path.join(BRAND, "apple-touch-icon.png"), path.join(ROOT, "apple-touch-icon.png"));
    console.log("✓ apple-touch-icon.png (사이트 맨 위) · assets/brand/favicon.svg");
  } finally {
    await b.close();
  }
})().catch((e) => { console.error("✗ " + e.message); process.exitCode = 1; });
