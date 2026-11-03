/* 클래스 상세 주소 /vod/p/<클래스> (Next.js 전환 3단계 · 2026-11)
 * 화면은 예전 그대로(index.html → vod.js 가 그려요). 서버가 그 클래스의 제목 · 설명 · 사진 · 가격을 미리보기 정보로 넣어 보내요
 * (카카오톡 공유 · 검색). 규칙은 class/api/_lib/pagemeta.js · 끄기: 환경 변수 DC_SSR_OFF=vod-detail
 * index.html 을 못 읽거나 오류가 나면 예전 index.html 을 그대로 보내요. */
import fs from "node:fs";
import path from "node:path";
import { legacyLib, repoRoot } from "../../../../nextlib/legacy-api.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

let tpl = null;
const HEAD = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600" };

export async function GET(req) {
  const url = new URL(req.url);
  try {
    tpl = tpl || fs.readFileSync(path.join(repoRoot(), "public", "index.html"), "utf8");
    const html = await legacyLib("api/_lib/pagemeta.js").render(url.pathname, tpl);
    return new Response(html, { headers: HEAD });
  } catch (e) {
    console.error("[vod-detail]", url.pathname, e && e.message);
    // 마지막 안전장치: 정적 index.html 을 그대로
    const r = await fetch(new URL("/index.html", url));
    return new Response(await r.text(), { status: r.ok ? 200 : 502, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } });
  }
}
