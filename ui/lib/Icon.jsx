/* 아이콘 — 예전 화면 icon(이름, 크기)과 같은 SVG (그림은 icons.js 의 Lucide 그림을 그대로) */
const kebab = (n) => String(n || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
export default function Icon({ n, c }) {
  const paths = (typeof window !== "undefined" && window.ICON_PATHS && window.ICON_PATHS[n]) || "";
  return <svg className={"icon lucide lucide-" + kebab(n) + " " + (c || "")} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: paths }} />;
}
