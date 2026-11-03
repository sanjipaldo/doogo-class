/* 두잉고 소개 /doinggo — 두잉고 제목 · 설명 · 소개 배너 (Next.js 전환 3단계 · 처리는 nextlib/page-route.js · 규칙 class/api/_lib/pagemeta.js)
 * /doinggo/… (사용법 영상 등) 아래 주소는 예전처럼 index.html 로 가요 */
import { pageGET } from "../../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = pageGET;
