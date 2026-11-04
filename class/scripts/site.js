/* Vercel 배포용 화면 파일 모으기 — class/ 에서 브라우저가 받는 파일만 class/.site 로 복사한다.
 * 서버 코드(api) · 빌드 스크립트(scripts) · 설명서 · 설정 · 숨김 파일은 넣지 않는다.
 *   node class/scripts/site.js          → class/.site (예전 정적 배포)
 *   node class/scripts/site.js public   → 저장소 맨 위 public/ (Next.js 1단계: Next.js 가 같은 파일을 그대로 내보내요) */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REPO = path.join(ROOT, "..");
// 받는 곳: 인자가 없으면 class/.site, 'public' 이면 저장소 맨 위 public/ — 그 밖의 곳은 지우지 않게 막아요
const OUT = !process.argv[2] ? path.join(ROOT, ".site") : process.argv[2] === "public" ? path.join(REPO, "public") : null;
if (!OUT) { console.error("[site] 받는 곳은 비워 두거나 'public' 만 돼요"); process.exit(1); }
const SKIP = new Set(["api", "scripts", "README.md", "vercel.json", "node_modules"]);
// Next.js 빌드(public)에서는 사이트맵을 서버가 만들어요 (app/sitemap.xml/route.js — 같은 주소의 파일이 public/ 에 있으면 Next.js 가 막아요)
if (process.argv[2] === "public") SKIP.add("sitemap.xml");

fs.rmSync(OUT, { recursive: true, force: true });
let n = 0;
(function copy(dir, out) {
  fs.mkdirSync(out, { recursive: true });
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name.startsWith(".") || (dir === ROOT && SKIP.has(e.name))) return;
    const from = path.join(dir, e.name), to = path.join(out, e.name);
    if (e.isDirectory()) copy(from, to);
    else if (e.isFile()) { fs.copyFileSync(from, to); n++; }
  });
})(ROOT, OUT);
// 첫 화면 파일의 CSS · JS · 그림 주소를 맨 위(/) 기준으로 (깨끗한 주소에서 바로 열어도 헛요청 없게)
const IDX = path.join(OUT, "index.html");
// 배포마다 CSS · JS 주소 끝에 ?v=<커밋> — 휴대폰 · 앱 안 브라우저가 예전 파일을 다시 쓰지 않고 새로 받게
const VER = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 8);
const ver = (html) => html.replace(/(\s(?:src|href)="\/[^"?#]+\.(?:js|css))"/g, "$1?v=" + VER + '"');
// 화면 나눠 받기 끄기 (4단계): DC_SPLIT_OFF=1 이면 <html data-split="off"> — areas.js 가 예전처럼 모든 화면 파일을 받아요
const splitOff = (html) => (process.env.DC_SPLIT_OFF === "1" ? String(html).replace(/<html lang="ko">/, '<html lang="ko" data-split="off">') : html);
fs.writeFileSync(IDX, splitOff(ver(require("./index-abs")(fs.readFileSync(IDX, "utf8")))));
console.log("[site] 화면 파일 " + n + "개 → " + path.relative(REPO, OUT));

/* 공유 미리보기 사진 (Next.js 전환 3단계): 카카오톡은 webp 를 못 읽어서, 강사 사진 · 클래스 사진 · 책 표지 폴더의 webp 를
 * 같은 자리에 JPG(<이름>.og.jpg · 가로 최대 1200)로 만들어 두고 목록을 public/og-images.json 에 남겨요 (api/_lib/pagemeta.js 가 읽어요).
 * Next.js 빌드(public)에서만 · 바꾸는 도구(sharp)가 없거나 실패하면 그 사진은 기본 공유 사진으로 (빌드는 멈추지 않아요) */
if (process.argv[2] === "public") (async () => {
  const DIRS = ["assets/home", "assets/vod", "assets/landing"], map = {};
  let sharp = null;
  try { sharp = require("sharp"); } catch (e) { console.warn("[site] 공유 사진 JPG 만들기 건너뜀 (sharp 없음)"); }
  const list = [];
  DIRS.forEach((d) => (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (/\.webp$/i.test(e.name)) list.push(f); });
  })(path.join(OUT, d)));
  for (const f of sharp ? list : []) {
    const rel = path.relative(OUT, f).split(path.sep).join("/"), outRel = rel.replace(/\.webp$/i, ".og.jpg");
    try {
      await sharp(f).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, outRel));
      map[rel] = outRel;
    } catch (e) { console.warn("[site] 공유 사진 JPG 실패: " + rel + " — " + (e && e.message)); }
  }
  fs.writeFileSync(path.join(OUT, "og-images.json"), JSON.stringify(map));
  console.log("[site] 공유 사진 JPG " + Object.keys(map).length + "개 → public/og-images.json");
})().catch((e) => { console.warn("[site] 공유 사진 JPG 건너뜀: " + (e && e.message)); });
