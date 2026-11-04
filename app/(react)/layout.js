/* React 화면 틀 (Next.js 전환 4-4 ~ 6단계) — React 로 새로 만든 화면이 여기서 열려요 (주소는 proxy.js 가 /n/… 로 넘겨요).
 * 예전 화면(public/index.html)과 같은 CSS · 같은 공용 스크립트(주소 · 데이터 · 아이콘 · 약관 · main.js)를 같은 순서로 받아요.
 *  · 목록은 빌드 때 만든 public/index.html 에서 읽어요 — index.html 에 파일을 더하면 여기도 저절로 같아져요
 *  · 서버 연결 · 로그인 맞추기 · 자동 로그아웃 · 다시 그리기는 예전처럼 main.js 가 하고, 그리기만 React(ui/App.jsx)가 해요
 *  · 로그인한 사람의 화면은 검색에서 빼요(noindex)
 *  · 공개 화면(약관 · 스토어 · 클래스 상세 …, class/shared/screens.js 의 pub)은 예전처럼 서버가 그 주소의 제목 · 설명 · 공유 사진 · 대표 주소 ·
 *    구조화 데이터 · 검색용 안내 글을 넣어요 — 3단계 규칙(class/api/_lib/pagemeta.js)을 그대로 써서 예전 화면과 같은 미리보기예요 */
import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { legacyLib, repoRoot } from "../../nextlib/legacy-api.js";
import SCREENS from "../../class/shared/screens.js";

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

/** 공개 화면: 예전 index.html 에 서버가 넣던 미리보기 정보 → { title, metas, canonical, ld, style, seo } (못 만들면 null) */
const META_SKIP = { viewport: 1, "theme-color": 1 };
async function publicMeta(p) {
  try {
    const tpl = fs.readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8");
    const html = await legacyLib("api/_lib/pagemeta.js").render(p.split("?")[0], tpl);
    const i = html.indexOf("</head>"), head = html.slice(0, i), body = html.slice(i);
    const metas = [];
    head.replace(/<meta\s+(name|property)="([^"]+)"\s+content="([^"]*)"\s*\/?>/g, (m0, kind, k, v) => { if (!META_SKIP[k]) metas.push([kind, k, v.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'")]); return m0; });
    const pick = (re) => { const m = re.exec(head); return m ? m[1] : ""; };
    const all = (re) => { const out = []; head.replace(re, (m0, x) => { out.push(x); return m0; }); return out; };
    const s0 = body.indexOf('<div class="seo-static">'), s1 = body.lastIndexOf("</div>", body.indexOf('<div id="modal-root"'));
    return {
      title: pick(/<title>([\s\S]*?)<\/title>/).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'"),
      // 구조화 데이터는 여러 개일 수 있어요 (사이트 정보 + 클래스 상세의 상품 정보 등) — 모두 그대로
      metas, canonical: pick(/<link rel="canonical" href="([^"]+)"/), ld: all(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g), style: pick(/<style>([\s\S]*?)<\/style>/),
      seo: s0 >= 0 && s1 > s0 ? body.slice(s0 + '<div class="seo-static">'.length, s1).replace(/<\/div>\s*$/, "") : ""
    };
  } catch (e) { console.error("[react meta]", p, e && e.message); return null; }
}

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default async function ReactLayout({ children }) {
  const L = legacy();
  const p = (await headers()).get("x-dc-path") || "", key = SCREENS.match(p), pub = key && SCREENS.isPublic(key) ? await publicMeta(p) : null;
  return (
    <html lang="ko" className="js" data-split={L.split || undefined} data-next={L.next || undefined} data-next-off={L.nextOff || undefined} suppressHydrationWarning>
      <head>
        <base href="/" />
        <script dangerouslySetInnerHTML={{ __html: HEAD_JS }} />
        {pub ? <>
          {pub.title ? <title>{pub.title}</title> : null}
          {pub.metas.map((x, i) => (x[0] === "name" ? <meta key={"m" + i} name={x[1]} content={x[2]} /> : <meta key={"m" + i} property={x[1]} content={x[2]} />))}
          {pub.canonical ? <link rel="canonical" href={pub.canonical} /> : null}
          {pub.ld.map((j, i) => <script key={"ld" + i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: j }} />)}
          {pub.style ? <style dangerouslySetInnerHTML={{ __html: pub.style }} /> : null}
        </> : <meta name="robots" content="noindex, nofollow" />}
        {L.links.map((a, i) => <link key={"l" + i} {...a} />)}
        {L.headJs.map((src) => <script key={src} src={src} />)}
      </head>
      <body data-react="1" suppressHydrationWarning>
        {pub && pub.seo ? <div className="seo-static" dangerouslySetInnerHTML={{ __html: pub.seo }} /> : null}
        {children}
        <div id="modal-root" />
        <div id="toast-root" aria-live="polite" />
        {L.bodyJs.map((src) => <script key={src} src={src} />)}
      </body>
    </html>
  );
}
