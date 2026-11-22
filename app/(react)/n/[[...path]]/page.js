/* React 화면 (Next.js 전환 4-4 ~ 6단계) — 어느 React 화면을 그릴지는 주소를 보고 ui/App.jsx 가 정해요 (목록: class/shared/screens.js)
 * 첫 로딩 화면 쪽(두잉고 · 두고클래스) · ‘OO로 이동중입니다’ 안내는 여기서 주소 · 쿠키로 정해 넘겨요 — 서버가 그린 첫 화면과 브라우저 첫 화면이 같게 (2026-11-22 · 규칙은 screens.js bootOf) */
import { headers, cookies } from "next/headers";
import App from "../../../../ui/App.jsx";
import SCREENS from "../../../../class/shared/screens.js";

export const dynamic = "force-dynamic";

export default async function Page() {
  const p = (await headers()).get("x-dc-path") || "/", ck = await cookies();
  const v = (n) => { const c = ck.get(n); return c ? c.value : ""; };
  return <App boot={SCREENS.bootOf(p, v("dc_boot"), v("dc_ct"))} />;
}
