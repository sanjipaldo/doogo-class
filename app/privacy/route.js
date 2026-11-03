/* 개인정보처리방침 /privacy — 화면과 같은 제목 · 대표 주소 · 시행일 · 목차 (Next.js 전환 3단계 · 처리는 nextlib/page-route.js · 규칙 class/api/_lib/pagemeta.js) */
import { pageGET } from "../../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = pageGET;
