/* React 화면 틀 (Next.js 전환 4-4 ~ 6단계) — React 로 새로 만든 화면이 여기서 열려요 (주소는 proxy.js 가 /n/… 로 넘겨요).
 * 예전 화면(public/index.html)과 같은 CSS · 같은 공용 스크립트(주소 · 데이터 · 아이콘 · 약관 · main.js)를 같은 순서로 받아요.
 *  · 목록은 빌드 때 만든 public/index.html 에서 읽어요 — index.html 에 파일을 더하면 여기도 저절로 같아져요
 *  · 서버 연결 · 로그인 맞추기 · 자동 로그아웃 · 다시 그리기는 예전처럼 main.js 가 하고, 그리기만 React(ui/App.jsx)가 해요
 *  · 로그인한 사람의 화면이라 검색에서 빼요(noindex) */
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../../nextlib/legacy-api.js";

export const dynamic = "force-dynamic";

let cache = null;
const ATTR = /([a-zA-Z:-]+)="([^"]*)"/g;
const attrs = (s) => { const o = {}; let m; ATTR.lastIndex = 0; while ((m = ATTR.exec(s))) o[m[1]] = m[2]; return o; };
const REACT_ATTR = { crossorigin: "crossOrigin", fetchpriority: "fetchPriority" };
const toReact = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[REACT_ATTR[k] || k] = o[k]; }); return r; };
function legacy() {
  if (cache) return cache;
  const html = fs.readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8");
  const i = html.indexOf("</head>"), head = html.slice(0, i), body = html.slice(i);
  const links = [];
  head.replace(/<link\s+([^>]*?)\/?>/g, (m0, a) => { const o = attrs(a); if (o.rel === "canonical") return m0; links.push(toReact(o)); return m0; });
  const js = (part) => { const out = []; part.replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => { out.push(src); return m0; }); return out; };
  const htmlAttr = attrs((html.match(/<html([^>]*)>/) || [])[1] || "");
  cache = { links, headJs: js(head), bodyJs: js(body), split: htmlAttr["data-split"] || null, next: htmlAttr["data-next"] || null, nextOff: htmlAttr["data-next-off"] || null };
  return cache;
}

// 예전 index.html 머리 맨 위 스크립트와 같은 일 + React 화면 표시 (main.js 가 React 화면이 준비되길 기다려요)
const HEAD_JS = "window.__dcClean=true;window.DC_REACT_PAGE=1;window.DC_REACT_WAIT=new Promise(function(r){window.__dcReactReady=r});";

export const metadata = { robots: { index: false, follow: false } };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function ReactLayout({ children }) {
  const L = legacy();
  return (
    <html lang="ko" className="js" data-split={L.split || undefined} data-next={L.next || undefined} data-next-off={L.nextOff || undefined} suppressHydrationWarning>
      <head>
        <base href="/" />
        <script dangerouslySetInnerHTML={{ __html: HEAD_JS }} />
        {L.links.map((a, i) => <link key={"l" + i} {...a} />)}
        {L.headJs.map((src) => <script key={src} src={src} />)}
      </head>
      <body data-react="1" suppressHydrationWarning>
        {children}
        <div id="modal-root" />
        <div id="toast-root" aria-live="polite" />
        {L.bodyJs.map((src) => <script key={src} src={src} />)}
      </body>
    </html>
  );
}
