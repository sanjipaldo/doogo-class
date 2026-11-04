/* React 화면 (Next.js 전환 4-4 ~ 6단계) — 어느 React 화면을 그릴지는 주소를 보고 ui/App.jsx 가 정해요 (목록: class/shared/screens.js) */
import App from "../../../../ui/App.jsx";

export const dynamic = "force-dynamic";

export default function Page() {
  return <App />;
}
