"use client";
/* 팝업 — 예전 화면 modal(제목, 내용, cls)과 같은 모양 (#modal-root 안 .vd-modal-bg > .vd-modal)
 *  · X · 닫기 버튼으로만 닫혀요. 펼침 메뉴(전체 메뉴 · 내 계정)는 바깥을 누르거나 Esc 로도 닫혀요 (예전과 같음)
 *  · 안의 링크(#/…)를 누르면 닫고 이동 */
import { createPortal } from "react-dom";
import { useEffect } from "react";
import Icon from "./Icon.jsx";

export const MENU_MODAL = ["vd-modal-drawer", "vd-modal-acct"];

/** head: 머리 글자 대신 넣을 내용 — 전체 메뉴는 로고 + 검색 제목 문구 (창 이름 aria-label 은 그대로 title · 예전 modal(title, body, cls, head)) */
export default function Modal({ title, cls, onClose, head, children }) {
  const menu = MENU_MODAL.indexOf(cls) >= 0;
  // 예전 처리 함수(doRfReq · doShipEdit …)가 끝에 팝업을 닫으면 (window.ReactApp.closeModal)
  useEffect(() => { const c = () => onClose(); window.addEventListener("dc:modal-close", c); return () => window.removeEventListener("dc:modal-close", c); }, [onClose]);
  useEffect(() => {
    if (!menu) return undefined;
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [menu, onClose]);
  const box = typeof document !== "undefined" ? document.getElementById("modal-root") : null;
  if (!box) return null;
  // 예전과 같은 규칙: 누른 곳에서 가장 가까운 data-v 가 "close" 이고, 그게 누른 곳 자체이거나 버튼 · 링크면 닫아요
  //  (펼침 메뉴는 바깥 배경도 data-v="close" · 안의 링크는 data-v="close" 를 달아 두면 닫고 이동)
  const onBg = (e) => {
    const t = e.target && e.target.closest ? e.target.closest("[data-v]") : null;
    if (t && t.dataset.v === "close" && (e.target === t || t.tagName === "BUTTON" || t.tagName === "A")) onClose();
  };
  return createPortal(
    <div className={"vd-modal-bg" + (cls ? " " + cls : "")} data-v={menu ? "close" : undefined} onClick={onBg}>
      <div className="vd-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="vd-modal-h">{head || <b>{title}</b>}<button type="button" data-v="close" aria-label="닫기"><Icon n="x" c="sm" /></button></div>
        {children}
      </div>
    </div>, box);
}
