"use client";
/* 스토어 움직임 (예전 vod.js motion · egSplit · wireCounts 를 React 로) — 제목 글자 새김 · 스크롤 등장 · 숫자 올라가기
 *  · 주소를 옮겨 처음 그릴 때만 움직여요. 같은 화면을 다시 그릴 때(찜 · 저장 · 다른 사람이 바꾼 내용)는 움직임 없이 바로 보여요 (예전과 같음)
 *  · React 가 그린 글자를 바꾸지 않아요: 글자 새김은 처음부터 쪼갠 모양(<Eg>)으로 그리고, 숫자는 글자 칸(text node) 값만 바꿔요
 *    — 예전 코드처럼 textContent 로 갈아 끼우면 React 가 다시 그릴 때 엉뚱한 칸을 고쳐요 */
import { Children, Fragment, isValidElement, useEffect } from "react";

/** 글자 새김 제목 — 예전 egSplit 이 만든 모양 그대로 (화면 읽기 프로그램용 글 + 글자마다 span)
 *  t: 글 또는 [글, 강조 글, 뒤 글] (예전 egTitle 과 같음) · 또는 안쪽(children)에 글 · <br /> · <span data-accent>강조</span> · <em> 을 그대로 써요
 *  강조(data-accent)는 레드 + 밑줄 · 화면 읽기용 글은 예전처럼 줄바꿈 없이 이어 붙인 글 (textContent) */
export function Eg({ as: Tag = "h2", className, t, children, ...rest }) {
  const src = t !== undefined ? (Array.isArray(t) ? [t[0], <span key="a" data-accent="">{t[1]}</span>, t[2] || ""] : [String(t == null ? "" : t)]) : children;
  let ci = 0, ai = 0, said = "", key = 0;
  const walk = (nodes, acc) => {
    const out = [];
    Children.forEach(nodes, (nd) => {
      if (nd == null || nd === false || nd === true) return;
      if (typeof nd === "string" || typeof nd === "number") {
        const text = String(nd); said += text;
        text.split(/(\s+)/).filter(Boolean).forEach((part) => {
          if (/^\s+$/.test(part)) { out.push(" "); return; }
          out.push(<span key={key++} className="eg-w">{Array.from(part).map((ch) => { const st = { "--ci": ci++ }; if (acc) st["--ai"] = ai++; return <span key={ci} className="eg-c" style={st}>{ch}</span>; })}</span>);
        });
        return;
      }
      if (!isValidElement(nd)) return;
      if (nd.type === "br") { out.push(<br key={key++} />); return; }
      if (nd.type === Fragment) { out.push(...walk(nd.props.children, acc)); return; }
      const ac = nd.props["data-accent"] !== undefined, Box = nd.type === "em" ? "em" : "span";
      out.push(<Box key={key++} className={ac ? "eg-accent" : nd.props.className || undefined}>{walk(nd.props.children, acc || ac)}</Box>);
    });
    return out;
  };
  const kids = walk(src, false);
  said = said.replace(/\s+/g, " ").trim();
  if (!ci) return <Tag className={className} data-eg="" {...rest}>{src}</Tag>;
  return <Tag className={(className ? className + " " : "") + "is-split"} style={{ "--eg-n": ci }} data-eg="" {...rest}><span className="vd-sr">{said}</span><span className="eg" aria-hidden="true">{kids}</span></Tag>;
}

const KEY_CNT = "dc:cnt-seen";
const cntSeen = () => { try { const a = JSON.parse(localStorage.getItem(KEY_CNT) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
// 숫자 칸의 글자 값만 바꿔요 (React 가 그린 text node 를 그대로 둬요)
const setNum = (el, v) => { const n = el.firstChild; if (n && n.nodeType === 3 && el.childNodes.length === 1) n.nodeValue = v; };
function countUp(el) {
  if (el.__c) return; el.__c = 1;
  const to = Number(el.dataset.count) || 0, t0 = performance.now(), d = 1300;
  const step = (ts) => { const k = Math.min(1, (ts - t0) / d), v = Math.round(to * (1 - Math.pow(1 - k, 3))); setNum(el, v.toLocaleString()); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/** 화면 움직임 — 화면 컴포넌트에서 useMotion(n, moved) (n: 다시 그린 횟수 · moved: 주소를 옮겨 처음 그림) */
export function useMotion(n, moved) {
  useEffect(() => {
    const root = document.getElementById("root"), box = root && root.querySelector(".vd");
    if (!box) return undefined;
    root.querySelectorAll("[data-rv-kids]").forEach((el) => Array.prototype.forEach.call(el.children, (c, i) => c.style.setProperty("--i", Math.min(i, 8))));
    const offs = [];
    // 숫자 올라가기: 화면에 다 들어올 때 0부터 (카드 숫자 data-cid 는 이 기기에서 한 번 본 뒤로 바로 최종 숫자)
    if ("IntersectionObserver" in window) {
      const seen = cntSeen(), fresh = Array.prototype.filter.call(root.querySelectorAll("[data-count]"), (el) => !el.__c && !(el.dataset.cid && seen.indexOf(el.dataset.cid) >= 0));
      if (fresh.length) {
        fresh.forEach((el) => setNum(el, "0"));
        const co = new IntersectionObserver((ens) => ens.forEach((en) => {
          if (!en.isIntersecting || en.intersectionRatio < 0.9) return;
          const el = en.target; co.unobserve(el); countUp(el);
          const id = el.dataset.cid; if (id) { const a = cntSeen(); if (a.indexOf(id) < 0) { a.push(id); try { localStorage.setItem(KEY_CNT, JSON.stringify(a.slice(-300))); } catch (e) { /* 기억만 못 해요 */ } } }
        }), { threshold: [0, 0.5, 0.9, 1] });
        fresh.forEach((el) => co.observe(el));
        offs.push(() => co.disconnect());
      }
    }
    if (!moved || !("IntersectionObserver" in window)) {
      // 다시 그리기: 움직임 없이 바로 보여요
      box.classList.remove("mo");
      root.querySelectorAll("[data-eg], [data-rv], [data-rv-kids]").forEach((el) => el.classList.add("is-in"));
      return () => offs.forEach((f) => f());
    }
    box.classList.add("mo");
    // 그림 칸 ‘열리기’(data-rv="open")는 한꺼번에 화면에 들어와도 0.45초 간격으로 하나씩 열려요
    let openAt = 0;
    const timers = [];
    const show = (el) => {
      if (el.dataset.rv === "open" && !el.classList.contains("is-in")) { const now = performance.now(), wait = Math.max(0, openAt - now); openAt = Math.max(now, openAt) + 450; timers.push(setTimeout(() => el.classList.add("is-in"), wait)); return; }
      el.classList.add("is-in");
    };
    const mo = new IntersectionObserver((ens) => ens.forEach((en) => {
      const h = en.boundingClientRect.height, seen = en.isIntersecting && (en.intersectionRatio >= 0.12 || en.intersectionRect.height >= Math.min(160, h * 0.5));
      if (seen) { show(en.target); mo.unobserve(en.target); }
    }), { rootMargin: "0px 0px -6% 0px", threshold: [0, 0.05, 0.12, 0.3] });
    root.querySelectorAll("[data-eg], [data-rv], [data-rv-kids]").forEach((el) => { if (!el.classList.contains("is-in")) mo.observe(el); });
    // 키보드로 화면 밖 요소에 들어가면 바로 보이게
    const onFocus = (e) => { for (let x = e.target; x && x !== box; x = x.parentElement) if (x.matches && x.matches("[data-rv], [data-rv-kids], [data-eg]")) show(x); };
    box.addEventListener("focusin", onFocus);
    return () => { mo.disconnect(); box.removeEventListener("focusin", onFocus); timers.forEach(clearTimeout); offs.forEach((f) => f()); };
  }, [n, moved]);
}
