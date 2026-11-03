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
fs.writeFileSync(IDX, ver(require("./index-abs")(fs.readFileSync(IDX, "utf8"))));
console.log("[site] 화면 파일 " + n + "개 → " + path.relative(REPO, OUT));
