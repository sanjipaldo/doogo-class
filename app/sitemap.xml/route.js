/* 검색 로봇용 주소 목록 /sitemap.xml — class/sitemap.xml 고정 주소 + 보이는 클래스 · 공개한 강사 소개 · 무료강의 (Next.js 전환 3단계 · 처리는 nextlib/page-route.js)
 * 빌드 때 class/sitemap.xml 은 public/ 으로 복사하지 않아요 (같은 주소가 둘이면 Next.js 가 막아요 — class/scripts/site.js) */
import { sitemapGET } from "../../nextlib/page-route.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const GET = sitemapGET;
