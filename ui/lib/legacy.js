/* 예전 화면 코드가 빌려 주는 계산 · 데이터 (Next.js 전환 4-4 ~ 6단계)
 * React 화면은 그리기만 새로 하고, 계산(가격 · 진도 · 쿠폰 · 권한 …)과 데이터(서버 동기화 db.js)는 예전 것과 같은 걸 써요 — 결과가 어긋나지 않게.
 *  · VOD(): 스토어 계산 (vod.js 의 window.VOD) · DB(): 데이터 · 날짜 · 사이트 정보 (db.js)
 *  · 화면을 다 옮기면 이 계산들을 공용 모듈(class/shared/)로 옮겨요 */
export const VOD = () => window.VOD;
export const DB = () => window.DB;
export const won = (n) => window.DB.won(n);
export const today = () => window.DB.date.todayStr();
/** 예전 ROUTE.hash 처럼 "#/vod/my?x=1" 모양 (깨끗한 주소에서도) */
export const hash = () => window.ROUTE.hash;
/** 다른 화면으로 — 예전 화면과 같은 길 (주소 바꾸기 → main.js 가 React 화면이면 다시 그리고, 예전 화면이면 새로 불러요) */
export const go = (h) => { window.ROUTE.hash = h; };
/** 스토어 주소 → { path: ["my", "classes"], qs } (vod.js route() 와 같음 — 약관 주소는 스토어 안 legal 로) */
export function storeRoute() {
  const h = String(window.ROUTE.hash || "").replace(/^#\/(?=(terms|privacy|refund)(\/|\?|$))/, "#/vod/legal/").replace(/^#\/vod\/?/, ""), q = h.indexOf("?");
  const path = (q >= 0 ? h.slice(0, q) : h).split("/").filter(Boolean), qs = new URLSearchParams(q >= 0 ? h.slice(q + 1) : "");
  return { path, qs };
}
/** 알림 (예전 화면 toast 와 같은 모양 · #toast-root) — 마지막 것 하나만, 2.6초 */
export function toast(msg, kind) {
  const box = document.getElementById("toast-root"); if (!box) return;
  const t = document.createElement("div");
  t.className = "toast" + (kind === "warn" ? " warn" : "");
  t.innerHTML = window.icon(kind === "warn" ? "alert" : "check", "sm") + "<span>" + window.DB.esc(msg) + "</span>";
  box.appendChild(t);
  const all = box.querySelectorAll(".toast"); for (let i = 0; i < all.length - 1; i++) all[i].remove();
  setTimeout(() => t.remove(), 2600);
}
