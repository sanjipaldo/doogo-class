/* Next.js 전환 1단계 — Next.js 가 지금 화면과 API 를 그대로 내보내요 (눈에 보이는 변화 없음)
 *  · 화면: class/ 의 브라우저 파일을 빌드 때 public/ 으로 복사 (class/scripts/site.js public) → 점(.)이 없는 주소는 모두 index.html
 *  · API: pages/api/<이름>.js → class/api/<이름>.js 그대로 (nextlib/legacy-api.js)
 *  · 주소 · 보안 헤더 · doinggo.doogoclass.com 넘기기는 예전 vercel.json 과 같아요 */
"use strict";
const fs = require("fs");
const path = require("path");
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

const SECURITY = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" }
];

// 예전 vercel.json functions.includeFiles — 서버 코드가 파일 이름을 만들어서 읽는 것 (처음 데이터 · AI 조교 자료)
const INCLUDE = ["class/data.js", "class/db.js", "class/coach-perms.js", "class/api/_lib/tutor/*.md", "class/api/_lib/tutor/*.json", "class/api/_lib/tutor/*/*.md", "class/api/_lib/tutor/*/*/*.md"];

/** 서버 코드(class/api/*.js)가 require 하는 파일 — 예전 Vercel 서버 함수와 같은 방법(nft)으로 찾아요 */
async function traceApi() {
  const { nodeFileTrace } = require("next/dist/compiled/@vercel/nft");
  const dir = path.join(__dirname, "class", "api");
  const files = fs.readdirSync(dir).filter((f) => /^[a-z-]+\.js$/.test(f)).map((f) => path.join("class", "api", f));
  const { fileList } = await nodeFileTrace(files, { base: __dirname, processCwd: __dirname });
  return [...fileList].filter((f) => !/^node_modules\/(next|react|react-dom|scheduler)\//.test(f)).sort();
}

module.exports = async (phase) => {
  const traced = phase === PHASE_PRODUCTION_BUILD ? await traceApi() : [];
  return {
    poweredByHeader: false,
    reactStrictMode: true,
    // 예전처럼 /vod/ 같은 끝 빗금을 다른 주소로 넘기지 않아요 (화면이 알아서 읽어요)
    skipTrailingSlashRedirect: true,
    outputFileTracingRoot: __dirname,
    outputFileTracingIncludes: { "/api/*": traced.concat(INCLUDE).map((f) => "./" + f) },
    async headers() {
      return [
        { source: "/:path*", headers: SECURITY },
        { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }
      ];
    },
    async redirects() {
      return [{ source: "/:path*", has: [{ type: "host", value: "doinggo.doogoclass.com" }], destination: "https://www.doogoclass.com/doinggo", permanent: false }];
    },
    async rewrites() {
      // 파일 · API 를 먼저 찾고(fallback), 없으면 점(.)이 없는 주소는 화면(index.html)으로 — /vod/p/v5 · /doinggo · /center/… (예전 vercel.json 과 같음)
      return { fallback: [{ source: "/:path((?!api/)[^.]*)", destination: "/index.html" }] };
    }
  };
};
module.exports.INCLUDE = INCLUDE; // 서버 시험(class/scripts/vod-test.js)이 확인해요
