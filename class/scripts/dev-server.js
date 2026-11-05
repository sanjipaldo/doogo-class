/* 로컬 개발 서버 — 정적 파일 + /api (Vercel 함수와 같은 코드)를 한 번에 띄운다.
 *
 *   CLASS_SQLITE=/tmp/class.db MASTER_PASSWORD=test node scripts/dev-server.js 4400
 *
 * CLASS_SQLITE 파일(node:sqlite)에 저장한다 (없으면 임시 폴더의 파일). DB_DRIVER=supabase + SUPABASE_DB_URL 이면 그 Supabase 에. */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.PORT || 4400);
if (!/^(supabase|postgres)$/i.test(process.env.DB_DRIVER || "") && !process.env.CLASS_SQLITE) process.env.CLASS_SQLITE = path.join(require("os").tmpdir(), "doogo-class-dev.db");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const handlers = {};
const api = (name) => {
  if (!/^[a-z-]+$/.test(name) || !fs.existsSync(path.join(ROOT, "api", name + ".js"))) return null;
  return (handlers[name] = handlers[name] || require(path.join(ROOT, "api", name + ".js")));
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const m = u.pathname.match(/^\/api\/([a-z-]+)$/);
  if (m) {
    const h = api(m[1]);
    if (!h) { res.statusCode = 404; return res.end("not found"); }
    req.query = Object.fromEntries(u.searchParams.entries());
    return h(req, res);
  }
  // 사이트맵: 배포(app/sitemap.xml/route.js)처럼 고정 주소 + 보이는 클래스 · 공개한 강사 소개 · 무료강의 (3단계)
  if (u.pathname === "/sitemap.xml") return require("../api/_lib/pagemeta").sitemap().then((x) => { res.setHeader("Content-Type", "application/xml; charset=utf-8"); res.end(x); });
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith("/")) p += "index.html";
  // vercel.json 처럼: 점(.)이 없는 경로(/vod/p/v5 · /doinggo · /terms)는 화면(index.html)으로 — 깨끗한 주소 시험용
  else if (!/\.[^/]*$/.test(p) && !fs.existsSync(path.join(ROOT, p))) p = "/index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || /[\\/](api|scripts)[\\/]|[\\/]\./.test(path.relative(ROOT, file) ? "/" + path.relative(ROOT, file) : "")) { res.statusCode = 404; return res.end("not found"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("not found"); }
    if (p === "/index.html") buf = Buffer.from(require("./index-abs")(buf.toString("utf8"))); // 배포(site.js)와 같게
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    // 클래스 상세 /vod/p/<클래스> · 강사 소개 /p/<강사> · 무료강의 /free/<강사> · 스토어 홈 / · /doinggo · 약관: 배포(Next.js app/…/route.js)처럼 미리보기 정보를 넣어요 (3단계)
    if (p === "/index.html" && /^\/((vod\/p|p|free)\/|(doinggo|terms|privacy|refund)?\/?$)/.test(u.pathname)) return require("../api/_lib/pagemeta").render(u.pathname, buf.toString("utf8")).then((h) => res.end(h));
    res.end(buf);
  });
}).listen(PORT, () => console.log("doogo class dev server → http://localhost:" + PORT + " (" + (process.env.CLASS_SQLITE ? "SQLite " + process.env.CLASS_SQLITE : "Supabase") + ")"));
