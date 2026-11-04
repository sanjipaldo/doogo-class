/* React 화면 스위치 (Next.js 전환 4-4 ~ 6단계) — 켜진 화면 주소를 React 화면(app/(react)/n/…)으로 넘겨요. 주소창은 그대로예요.
 *  · 화면 목록 · 켜는 규칙: class/shared/screens.js (화면의 main.js 도 같은 규칙으로 예전 화면 ↔ React 화면을 오가요)
 *  · 이 브라우저만 켜고 끄기: 아무 주소 뒤에 ?dc_next=all · ?dc_next=off · ?dc_next=<화면 키> → 쿠키 dc_next 로 기억하고 그 값은 주소에서 지워요
 *  · /n/… 를 직접 열면 화면(ui/App.jsx)이 원래 주소로 보내요 — 여기서 막으면 넘겨 준 요청까지 막혀요 (next start 는 넘긴 주소로 proxy 를 한 번 더 돌려요)
 * API · 파일(점이 있는 주소) · Next.js 내부 파일에는 돌지 않아요. */
import { NextResponse } from "next/server";
import SCREENS from "./class/shared/screens.js";

export function proxy(req) {
  const url = req.nextUrl, p = url.pathname;
  // 이 브라우저만 켜고 끄기
  const pick = url.searchParams.get("dc_next");
  if (pick !== null) {
    const to = url.clone();
    to.searchParams.delete("dc_next");
    const res = NextResponse.redirect(to, 307);
    if (SCREENS.validPick(pick)) res.cookies.set("dc_next", pick, { path: "/", sameSite: "lax", secure: url.protocol === "https:", maxAge: 60 * 60 * 24 * 90 });
    else res.cookies.delete("dc_next");
    return res;
  }
  const key = SCREENS.match(p);
  if (!key) return NextResponse.next();
  const on = SCREENS.enabled({ env: process.env.DC_NEXT, off: process.env.DC_NEXT_OFF, cookie: (req.cookies.get("dc_next") || {}).value });
  if (on.indexOf(key) < 0) return NextResponse.next();
  const to = url.clone();
  to.pathname = "/n" + p;
  const res = NextResponse.rewrite(to);
  res.headers.set("x-dc-screen", key);
  return res;
}

export const config = {
  // API · Next.js 내부 파일 · 점(.)이 있는 주소(그림 · CSS · JS · sitemap.xml …)는 빼요
  matcher: ["/((?!api/|_next/|.*\\.[A-Za-z0-9]+$).*)"]
};
