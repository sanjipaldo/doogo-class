"use client";
/* 강사센터 · 마스터 공통 조각 (예전 admin.js btn · head · kpi · emptyBox · pill 을 React 로 — Next.js 전환 6단계)
 *  · 버튼(data-action) · 폼은 예전 admin.js 의 document 이벤트가 그대로 받아요 — 여기서는 모양만 그려요 */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";

export const ADM = () => window.ADM;
export const DBX = () => window.DB;

/** 예전 HTML 조각 — 비어 있으면 아무것도 · 맨 위 태그가 여러 개면(예: 색 고르기 + 미리보기) 감싸지 않고 나란히 */
export function Isl({ html, ...rest }) {
  if (!html) return null;
  const h = String(html).trim();
  if (typeof document !== "undefined") {
    const t = document.createElement("template"); t.innerHTML = h;
    const kids = Array.from(t.content.childNodes).filter((k) => k.nodeType === 1 || (k.nodeType === 3 && k.textContent.trim()));
    if (kids.length > 1) return kids.map((k, i) => (k.nodeType === 1 ? <RawOne key={i} html={k.outerHTML} {...rest} /> : k.textContent));
    if (kids.length === 1 && kids[0].nodeType === 3) return kids[0].textContent; // 글자만 (예: "0원") — 감싸지 않고 그대로
    if (!kids.length) return null;
  }
  return <RawOne html={h} {...rest} />;
}
/** 예전 btn(label, action, cls, attrs) */
export const Btn = ({ action, cls, children, ...rest }) => <button type="button" className={"a-btn " + (cls || "a-btn-ghost")} data-action={action} {...rest}>{children}</button>;
/** 예전 head(제목, 설명, 오른쪽 버튼) */
export const Head = ({ title, sub, right }) => <header className="a-head"><div><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div>{right ? <div className="a-head-actions">{right}</div> : null}</header>;
export const Kpi = ({ label, value, sub, href, tone }) => <a className={"a-kpi " + (tone || "")} href={href}><span>{label}</span><b>{value}</b><small>{sub}</small></a>;
export const Empty = ({ ic, children, extra }) => <div className="a-empty"><Icon n={ic} /><p>{children}</p>{extra || null}</div>;
export const Pill = ({ cls, children }) => <span className={"a-pill " + cls}>{children}</span>;
export const fmtMD = (s) => window.DB.date.fmtMD(s);
export const fmtStamp = (t) => window.DB.date.fmtStamp(t);

/** 예전 numPager(key, pg) — ‹ 1 2 3 4 5 › (누르면 예전 이벤트 data-action="pg") · pg = ADM.pageSlice(key, list, per) */
export function Pager({ k, pg }) {
  if (pg.n <= 1) return null;
  const a = Math.max(1, Math.min(pg.p - 2, pg.n - 4)), b = Math.min(pg.n, a + 4), nums = [];
  for (let i = a; i <= b; i++) nums.push(i);
  const go = (p, label, cls, dis, aria) => <button key={(aria || "") + p} type="button" className={"a-pg-b" + (cls ? " " + cls : "")} data-action="pg" data-k={k} data-p={p} disabled={dis || undefined} aria-label={aria || undefined} aria-current={p === pg.p && !aria ? "page" : undefined}>{label}</button>;
  return <nav className="a-pg" aria-label="쪽 넘기기"><span className="a-pg-info">{pg.from}–{pg.to} / {pg.total}개</span><span className="a-pg-nums">
    {go(pg.p - 1, <Icon n="chevLeft" c="sm" />, "a-pg-arr", pg.p <= 1, "이전 쪽")}{a > 1 ? <>{go(1, "1")}{a > 2 ? <span className="a-pg-gap">…</span> : null}</> : null}
    {nums.map((i) => go(i, String(i), i === pg.p ? "on" : ""))}
    {b < pg.n ? <>{b < pg.n - 1 ? <span className="a-pg-gap">…</span> : null}{go(pg.n, String(pg.n))}</> : null}{go(pg.p + 1, <Icon n="chevRight" c="sm" />, "a-pg-arr", pg.p >= pg.n, "다음 쪽")}</span></nav>;
}
