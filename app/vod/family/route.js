/* 패밀리 /vod/family (2026-11-15 · 주소로만) — 예전 화면으로 열 때도 검색 제외(noindex) 를 넣어 보내요 (React 화면은 proxy 가 /n/vod/family 로 넘겨요)
 * 처리는 nextlib/page-route.js · 규칙 class/api/_lib/pagemeta.js HIDDEN */
import { pageGET } from "../../../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = pageGET;
