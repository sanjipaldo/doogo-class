/* 스토어 홈 / — 제목 · 설명은 index.html 그대로, 로봇용 안내 글에 지금 보이는 클래스 목록 (Next.js 전환 3단계 · 처리는 nextlib/page-route.js · 규칙 class/api/_lib/pagemeta.js) */
import { pageGET } from "../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = pageGET;
