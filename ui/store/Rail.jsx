"use client";
/* 가로 한 줄 슬라이드 부품 (홈 강사진 · 소개 강사진 같이 씀 · 2026-11-24 HomePage.jsx 에서 옮김)
 *  · Prog: 아래 진행 막대 (예전 wireRails 의 data-prog) · TeachArrows: 좌우 화살표 + 마우스로 끌기 (예전 teachArr + wireRails · dragWire) */
import { useLayoutEffect, useState } from "react";
import Icon from "../lib/Icon.jsx";
import { VOD } from "../lib/legacy.js";

/** 가로 줄 진행 막대 (예전 wireRails 의 data-prog) */
export function Prog({ id }) {
  const [st, setSt] = useState({ w: "100.00%", l: "0.00%", one: true });
  // 화면에 보이기 전에 재요 (예전 wireRails 처럼 첫 화면부터 맞는 막대)
  useLayoutEffect(() => {
    const el = document.getElementById(id); if (!el) return undefined;
    const upd = () => { const sw = el.scrollWidth, cw = el.clientWidth, w = sw > cw + 2 ? cw / sw : 1, nx = { w: (w * 100).toFixed(2) + "%", l: (sw > cw ? (el.scrollLeft / sw) * 100 : 0).toFixed(2) + "%", one: w >= 1 }; setSt((s) => (s.w === nx.w && s.l === nx.l && s.one === nx.one ? s : nx)); };
    el.addEventListener("scroll", upd, { passive: true }); upd();
    const ro = "ResizeObserver" in window ? new ResizeObserver(upd) : null; if (ro) ro.observe(el);
    return () => { el.removeEventListener("scroll", upd); if (ro) ro.disconnect(); };
  }, [id]);
  return <div className={"vd-teach-prog" + (st.one ? " one" : "")} data-prog={id} aria-hidden="true"><i style={{ width: st.w, left: st.l }} /></div>;
}
/** 홈 강사진 좌우 화살표 (한 줄 슬라이드 · 예전 teachArr + wireRails) — 누를 때만 한 화면씩 넘겨요 · 처음 · 끝에서는 그쪽 화살표가 꺼져요
 *  · 마우스로 끌어 넘기기도 같이 묶어요 (예전 dragWire 그대로 — 끄는 동안 표시는 data-dragging 이라 React 가 그린 class 는 그대로) */
export function TeachArrows({ id }) {
  const [st, setSt] = useState({ start: true, end: true });
  // 화면에 보이기 전에 재요 (첫 화면부터 ‘다음’ 화살표가 켜져 있게)
  useLayoutEffect(() => {
    const el = document.getElementById(id); if (!el) return undefined;
    const upd = () => { const e = VOD().railEnds(el); setSt((s) => (s.start === e.start && s.end === e.end ? s : { start: e.start, end: e.end })); };
    let t = 0; const onSc = () => { clearTimeout(t); t = setTimeout(upd, 60); };
    el.addEventListener("scroll", onSc, { passive: true }); upd();
    const ro = "ResizeObserver" in window ? new ResizeObserver(upd) : null; if (ro) ro.observe(el);
    VOD().dragWire(el);
    return () => { el.removeEventListener("scroll", onSc); clearTimeout(t); if (ro) ro.disconnect(); };
  }, [id]);
  const move = (d) => { const el = document.getElementById(id); if (el) { const r = VOD().railStep(el); el.scrollBy({ left: d * r.step * r.per, behavior: "smooth" }); } };
  return <>
    <button type="button" className="vd-teach-arr prev" data-v="rail" data-r={id} data-d="-1" data-arr={id} aria-label="이전 강사" disabled={st.start} onClick={() => move(-1)}><Icon n="chevLeft" c="sm" /></button>
    <button type="button" className="vd-teach-arr next" data-v="rail" data-r={id} data-d="1" data-arr={id} aria-label="다음 강사" disabled={st.end} onClick={() => move(1)}><Icon n="chevRight" c="sm" /></button>
  </>;
}
