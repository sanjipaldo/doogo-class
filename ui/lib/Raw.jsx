/* 아직 React 로 옮기지 않은 작은 그림 조각(예: 클래스 썸네일 thumbArt)을 예전 코드 그대로 넣는 자리 — 옮기면 지워요.
 *  · <Raw as className html>: 담는 태그는 React 가 그리고, 안쪽만 예전 HTML
 *  · <RawOne html>: 예전 HTML 이 태그 하나로 감싸져 있으면(<span class="vd-art">…</span>) 그 태그를 React 가 그리고 안쪽만 예전 HTML — 화면 구조가 예전과 똑같아요
 * 예전 코드가 만든 HTML 만 넣어요 (사용자 글은 예전 코드가 이미 escape 해요). */
export default function Raw({ as: Tag = "span", html, ...rest }) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html || "" }} />;
}

const ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const unesc = (s) => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENT[m]);
const REACT_NAME = { class: "className", for: "htmlFor", tabindex: "tabIndex", fetchpriority: "fetchPriority", srcset: "srcSet", crossorigin: "crossOrigin" };
function styleObj(s) {
  const o = {};
  String(s).split(";").forEach((d) => { const i = d.indexOf(":"); if (i < 0) return; const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return; o[k.indexOf("--") === 0 ? k : k.replace(/-([a-z])/g, (m0, c) => c.toUpperCase())] = v; });
  return o;
}
const OPEN = /^<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*"[^"]*")?)*)\s*>/;
export function RawOne({ html }) {
  const h = String(html || "").trim(), m = OPEN.exec(h);
  if (!m || !h.endsWith("</" + m[1] + ">")) return <Raw html={h} />;
  const props = {};
  m[2].replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*"([^"]*)")?/g, (m0, k, v) => { const val = v == null ? "" : unesc(v); if (k === "style") props.style = styleObj(val); else props[REACT_NAME[k] || k] = val; return m0; });
  const Tag = m[1].toLowerCase();
  return <Tag {...props} dangerouslySetInnerHTML={{ __html: h.slice(m[0].length, h.length - m[1].length - 3) }} />;
}
