"use client";
/* 파트너스 (/vod/partners) · 패밀리 (/vod/family) 두 랜딩이 같이 쓰는 것 — 예전 vod.js 의 jump · wirePt 와 같은 동작
 *  · jump: 아래 섹션으로 부드럽게 (머리띠 높이만큼 덜 내려가요 · 위 탭 줄은 2026-11-15 에 없앴어요)
 *  · faqOne: 자주 묻는 질문은 하나만 열려요
 *  · useFloat: 오른쪽 아래 떠 있는 상자는 첫 화면(히어로) · 마지막 안내 · 바닥이 안 보일 때만 */
import { useEffect, useState } from "react";

export const jump = (id) => {
  const s = document.getElementById(id);
  if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
};

export const faqOne = (e) => {
  const d = e.currentTarget;
  if (d.open) document.getElementById("root").querySelectorAll(".pt-faq-it[open]").forEach((o) => { if (o !== d) o.open = false; });
};

export function useFloat() {
  const [flt, setFlt] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { setFlt(true); return undefined; }
    const hide = new Set(), root = document.getElementById("root"), tg = [root.querySelector(".pt-hero"), root.querySelector(".pt-end"), root.querySelector(".vd-foot, footer")].filter(Boolean);
    const io = new IntersectionObserver((ens) => { ens.forEach((en) => { if (en.isIntersecting) hide.add(en.target); else hide.delete(en.target); }); setFlt(!hide.size); }, { threshold: 0 });
    tg.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return flt;
}
