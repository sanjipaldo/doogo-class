/* 웹 아이콘 (브라우저 탭 · 아이폰 · 삼성 인터넷 · 안드로이드 홈 화면)
 *   두고클래스: 앱 아이콘 2안 — 흰 바탕 · 빨강 DOOGO / CLASS 두 줄 (2026-11-02)
 *   두잉고(/doinggo): 흰 바탕 · 검정 ‘두잉고’ 글자 + 빨간 밑줄 — 두잉고 화면 머리 로고와 같은 글자 (2026-11-22)
 *
 *   node scripts/web-icons.js        (playwright 필요)
 *
 * 원본은 한 장씩 (1024×1024 각진 흰 정사각형 · 그림 폭 760) — 원본만 고치면 아래가 다 바뀌어요.
 *   assets/brand/app-icon.svg     두고클래스 (글자 path 들)
 *   assets/brand/dg-app-icon.svg  두잉고 (<g id="art"> 한 묶음 — 1024 가운데에 폭 760)
 * 만드는 파일 (두잉고는 같은 이름 앞에 dg-)
 *   assets/brand/favicon.svg            탭 아이콘 (둥근 흰 사각형 · 그림을 크게 — 작게 보여도 읽히게)
 *   assets/brand/favicon.png            64×64 (svg 를 못 읽는 브라우저)
 *   assets/brand/apple-touch-icon.png   180×180 아이폰 · 삼성 인터넷 홈 화면 (네모 그대로 — 모서리는 기기가 둥글게)
 *   apple-touch-icon.png                두고클래스 것을 사이트 맨 위에도 (주소를 정해 두지 않은 앱이 찾는 자리)
 *   assets/brand/icon-192.png · icon-512.png · icon-maskable-512.png   manifest (안드로이드 홈 화면)
 *     — 두고클래스 manifest.webmanifest · 두잉고 doinggo.webmanifest
 * 아이콘을 바꾸면 주소 끝 ?v= 도 올려 주세요 — 두고클래스: index.html · manifest.webmanifest (지금 20261102b)
 *   두잉고: api/_lib/pagemeta.js DG_ICON_V · icons.js siteIcons · doinggo.webmanifest (지금 20261122) */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const BRAND = path.join(ROOT, "assets", "brand");
const BASE_W = 760;

/** 원본 svg → 1024 칸 가운데(512, 512)에 폭 760 으로 놓인 그림 (두잉고는 <g id="art"> 묶음, 두고클래스는 글자 path 들) */
function artOf(file) {
  const master = fs.readFileSync(path.join(BRAND, file), "utf8");
  const g = /<g id="art"[\s\S]*<\/g>(?=\s*<\/svg>)/.exec(master);
  const art = g ? g[0] : (master.match(/<path\b[^>]*\/>/g) || []).join("");
  if (!art) throw new Error("assets/brand/" + file + " 에서 그림을 찾지 못했어요");
  return art;
}
/** 1024 캔버스 · 그림 폭 w · 모서리 r(0 이면 네모) */
function svg(art, w, r) {
  const k = (w / BASE_W).toFixed(4);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" rx="' + r + '" fill="#FFFFFF"/>' +
    '<g transform="translate(512 512) scale(' + k + ') translate(-512 -512)">' + art + "</g></svg>";
}
const SETS = [
  // 두고클래스 — 두 줄 글자 (정사각형에 가까워 폭 760)
  { src: "app-icon.svg", pre: "", fav: 900, any: 760, mask: 620, root: true },
  // 두잉고 — 한 줄 글자(가로로 김)라 조금 더 크게. maskable 640 도 동그랗게 잘리는 안전 영역(지름 80%) 안이에요
  { src: "dg-app-icon.svg", pre: "dg-", fav: 960, any: 820, mask: 640, root: false }
];

(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    for (const S of SETS) {
      const art = artOf(S.src);
      fs.writeFileSync(path.join(BRAND, S.pre + "favicon.svg"), svg(art, S.fav, 200));
      const OUT = [
        // [파일, 픽셀, 그림 폭(1024 기준), 모서리]
        [S.pre + "favicon.png", 64, S.fav, 200],
        [S.pre + "apple-touch-icon.png", 180, S.any, 0],
        [S.pre + "icon-192.png", 192, S.any, 0],
        [S.pre + "icon-512.png", 512, S.any, 0],
        [S.pre + "icon-maskable-512.png", 512, S.mask, 0] // 안드로이드가 동그랗게 잘라도 그림이 안쪽 안전 영역에 들어가게
      ];
      for (const [name, px, w, r] of OUT) {
        await p.setViewportSize({ width: px, height: px });
        await p.setContent('<style>html,body{margin:0;background:transparent}svg{display:block;width:' + px + "px;height:" + px + "px}</style>" + svg(art, w, r));
        await p.screenshot({ path: path.join(BRAND, name), omitBackground: r > 0 });
        console.log("✓ assets/brand/" + name + " (" + px + "px)");
      }
      if (S.root) {
        fs.copyFileSync(path.join(BRAND, "apple-touch-icon.png"), path.join(ROOT, "apple-touch-icon.png"));
        console.log("✓ apple-touch-icon.png (사이트 맨 위)");
      }
      console.log("✓ assets/brand/" + S.pre + "favicon.svg");
    }
  } finally {
    await b.close();
  }
})().catch((e) => { console.error("✗ " + e.message); process.exitCode = 1; });
