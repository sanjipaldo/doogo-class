/* 두고 클래스 API (/api/ai-tutor) — 실제 코드는 class/api/ai-tutor.js (Next.js 전환 1단계: 코드는 그대로, Node 가 바로 불러요) */
import { legacyApi } from "../../nextlib/legacy-api.js";

export const config = { api: { bodyParser: false, responseLimit: false, externalResolver: true }, maxDuration: 60 };
export default legacyApi("ai-tutor");
