/* 강사 소개 /p/<강사> — 공유 미리보기 정보를 넣은 화면 틀 (Next.js 전환 3단계 · 처리는 nextlib/page-route.js · 규칙 class/api/_lib/pagemeta.js) */
import { pageGET } from "../../../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = pageGET;
