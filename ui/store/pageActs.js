"use client";
/* 스토어 공개 화면이 같이 쓰는 버튼 처리 (예전 vod.js 클릭 처리와 같은 일) */
import { useCallback } from "react";
import { VOD, hash, go, toast } from "../lib/legacy.js";

/** 찜 · 오픈 알림 (카드 · 상세의 하트) — 로그인 전이면 로그인으로, 담으면 하트가 톡 튀어요 */
export function usePageLike() {
  return useCallback((id) => {
    const X = VOD(), m = X.me();
    if (!m) { toast("로그인하면 찜할 수 있어요.", "warn"); go("#/vod/login?next=" + encodeURIComponent(hash())); return; }
    const lf = X.likeFlip(m, id);
    window.ReactApp.redraw();
    if (lf.added) requestAnimationFrame(() => document.querySelectorAll('[data-v="like"][data-id="' + String(id).replace(/"/g, "") + '"]').forEach((x) => { x.classList.remove("pop"); void x.offsetWidth; x.classList.add("pop"); }));
    toast(!lf.added ? (lf.soon ? "오픈 알림을 껐어요." : "찜을 풀었어요.") : lf.soon ? "오픈하면 가장 먼저 알려 드릴게요." : "찜한 강의에 담았어요.");
  }, []);
}
