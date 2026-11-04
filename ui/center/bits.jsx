"use client";
/* 강사센터 · 마스터 공통 조각 (예전 admin.js btn · head · kpi · emptyBox · pill 을 React 로 — Next.js 전환 6단계)
 *  · 버튼(data-action) · 폼은 예전 admin.js 의 document 이벤트가 그대로 받아요 — 여기서는 모양만 그려요 */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";

export const ADM = () => window.ADM;
export const DBX = () => window.DB;

/** 예전 HTML 조각 (한 태그로 감싸진 것) — 비어 있으면 아무것도 */
export const Isl = ({ html, ...rest }) => (html ? <RawOne html={html} {...rest} /> : null);
/** 예전 btn(label, action, cls, attrs) */
export const Btn = ({ action, cls, children, ...rest }) => <button type="button" className={"a-btn " + (cls || "a-btn-ghost")} data-action={action} {...rest}>{children}</button>;
/** 예전 head(제목, 설명, 오른쪽 버튼) */
export const Head = ({ title, sub, right }) => <header className="a-head"><div><h1>{title}</h1>{sub ? <p>{sub}</p> : null}</div>{right ? <div className="a-head-actions">{right}</div> : null}</header>;
export const Kpi = ({ label, value, sub, href, tone }) => <a className={"a-kpi " + (tone || "")} href={href}><span>{label}</span><b>{value}</b><small>{sub}</small></a>;
export const Empty = ({ ic, children, extra }) => <div className="a-empty"><Icon n={ic} /><p>{children}</p>{extra || null}</div>;
export const Pill = ({ cls, children }) => <span className={"a-pill " + cls}>{children}</span>;
export const fmtMD = (s) => window.DB.date.fmtMD(s);
export const fmtStamp = (t) => window.DB.date.fmtStamp(t);
