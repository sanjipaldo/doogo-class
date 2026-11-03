/* 공유 미리보기를 넣는 페이지 주소 (Next.js 전환 3단계 · 2026-11) — /vod/p/<클래스> · /p/<강사> · /free/<강사> · 스토어 홈 / · /doinggo · 약관 /terms · /privacy · /refund · /sitemap.xml
 * 화면은 예전 그대로(index.html → vod.js · landing.js 가 그려요). 서버가 그 페이지의 제목 · 설명 · 사진을 미리보기 정보로 넣어 보내요.
 * 규칙은 class/api/_lib/pagemeta.js · 끄기: 환경 변수 DC_SSR_OFF (vod-detail · landing · free · store-home · doinggo · legal · sitemap)
 * index.html 을 못 읽거나 오류가 나면 예전 정적 index.html 을 그대로 보내요. */
import fs from "node:fs";
import path from "node:path";
import { legacyLib, repoRoot } from "./legacy-api.js";

let tpl = null;
const HEAD = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600" };

export async function pageGET(req) {
  const url = new URL(req.url);
  try {
    tpl = tpl || fs.readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8");
    const html = await legacyLib("api/_lib/pagemeta.js").render(url.pathname, tpl);
    return new Response(html, { headers: HEAD });
  } catch (e) {
    console.error("[page]", url.pathname, e && e.message);
    // 마지막 안전장치: 정적 index.html 을 그대로
    const r = await fetch(new URL("/index.html", url));
    return new Response(await r.text(), { status: r.ok ? 200 : 502, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } });
  }
}

/** /sitemap.xml — 고정 주소 목록(class/sitemap.xml) + 보이는 클래스 · 공개한 강사 소개 · 무료강의 (오류면 고정 목록 · 1시간 캐시) */
export async function sitemapGET() {
  const XML = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };
  try {
    return new Response(await legacyLib("api/_lib/pagemeta.js").sitemap(), { headers: XML });
  } catch (e) {
    console.error("[sitemap]", e && e.message);
    return new Response(fs.readFileSync(path.join(repoRoot(), "class", "sitemap.xml"), "utf8"), { headers: XML });
  }
}
