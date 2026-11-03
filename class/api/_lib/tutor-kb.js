/* 학습 자료(마크다운)로 바로 답하는 AI 조교 — Claude API 키가 없어도 24시간 같은 답 (지어내지 않음)
 *
 *  tutor/<강사>.md + tutor/<강사>/*.md 의 ‘## 제목’ 하나가 답 카드 하나예요. 카드 아래 주석으로 쓰는 법:
 *    <!-- 질문: 낱말, 낱말, /정규식/ -->     학생 질문에 이 낱말(띄어쓰기 · 대소문자 상관없음) · 정규식이 있으면 점수
 *                                          (긴 낱말일수록 · 정규식은 더 높게). 점수가 MIN 을 넘는 카드 중 1~2개를 보여 줘요
 *    <!-- 아님: /정규식/ -->                 이게 들어간 질문에는 이 카드를 쓰지 않아요
 *    <!-- 계산: 운송료 | 도착일 | 수량 -->   무게 · 개수가 있거나 ‘언제 받아요’를 물으면 계산해서 카드 위에 붙여요
 *  주석이 없는 카드(나중에 받은 자료)는 제목 · 본문과 글자가 얼마나 겹치는지로 찾아요.
 *  tutor/<강사>.json: { chips: { title, list }, avoid: "정규식" } — avoid 가 맞는 질문(과제 · 라이브 같은 수업 질문)은 점수를 반으로.
 *  관세를 피하는 방법(언더밸류 · 기준을 피하려고 나눠 보내기)을 묻는 질문은 강사 · 자료와 상관없이 ‘실제 가격대로 신고’를 안내해요 (GUARD).
 *
 *  화면(app.js)도 같은 점수 규칙으로 ‘이 질문은 서버 학습 자료에 물어보자’를 정해요 → info() 가 낱말 · 정규식을 건네요. */
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "tutor");
const MIN = 1.5; // 카드를 쓰는 최소 점수 (4글자 낱말 하나 = 2점, 정규식 하나 = 2.5점, 2글자 낱말 하나 = 1.5점)
const RE_W = 2.5;
const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
const keyW = (k) => 1 + Math.min(k.length, 8) / 4;

/* ---------- 법 지키기 (관세 회피 질문) ---------- */
const GUARD = [
  /언더\s*밸류|under\s*-?\s*valu/i,
  /(신고|기입|인보이스|invoice|가액|신고가|신고\s*금액|신고\s*가격).{0,15}(낮게|낮춰|낮추|줄여|줄이|싸게|적게|속여|속이|조작|허위|거짓)/i,
  /(낮게|낮춰|낮추|줄여|적게|싸게|속여|허위|거짓).{0,10}(신고|기입|적어|적으|적는|써도|쓰면|써야|인보이스)/i,
  /(관세|세금|부가세).{0,12}(안\s*내려면|안\s*내는\s*(방법|법|팁)|안\s*낼\s*(방법|수)|안\s*나오게|안\s*나오는\s*(방법|법)|피하(려면|는\s*(방법|법))|피할\s*(방법|수)|피해\s*가|회피|줄이(려면|는\s*(방법|법))|줄일\s*(방법|수)|아끼(려면|는\s*(방법|법))|안\s*걸리게|빼는\s*(방법|법))/,
  /(쪼개|나눠|나누어|분할).{0,12}(보내|발송|배송|주문).{0,15}(관세|세금|통관|면세|안\s*걸|기준|한도|제한)/,
  /(관세|세금|면세|한도|제한|넘|초과).{0,15}(쪼개|나눠|나누어|분할).{0,8}(보내|발송|배송|주문)/,
  /(10|십)\s*(달러|불|usd|\$)\s*(로|으로|정도로|만)\s*(적|써|쓰|신고|기입)/i,
  /\$\s*10\s*(으로|로)\s*(적|써|쓰|신고|기입)/i
];
const GUARD_TEXT = "그 방법은 안내해 드릴 수 없어요. 관세를 피하려고 신고 가격을 실제보다 낮춰 적거나(언더밸류) 기준을 피하려고 나눠 보내면 관세법 위반(허위 신고 · 관세 포탈)이 될 수 있어요.\n" +
  "- 신고 가격은 실제 결제 가격대로 적어 주세요.\n" +
  "- 면세 기준 · 세금은 관세청 고객지원센터(국번 없이 125)나 관세사에게 확인해 주세요.";
const isGuard = (t) => GUARD.some((r) => r.test(String(t || "")));

/* ---------- 학습 자료 읽기 ---------- */
/** ‘질문:’ 목록 → 낱말 · 정규식 (정규식 안의 쉼표 · 대괄호는 그대로) */
function parseList(src, file) {
  const keys = [], res = [], s = String(src || "").trim();
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] === "/") {
      let j = i + 1, cls = false;
      for (; j < s.length; j++) { const c = s[j]; if (c === "\\") { j++; continue; } if (c === "[") cls = true; else if (c === "]") cls = false; else if (c === "/" && !cls) break; }
      let k = j + 1, flags = "";
      while (k < s.length && /[a-z]/.test(s[k])) flags += s[k++];
      try { res.push(new RegExp(s.slice(i + 1, j), flags.replace(/[gy]/g, ""))); } catch (e) { console.warn("[tutor-kb] 정규식을 읽지 못했어요 (" + file + "): " + s.slice(i, k)); }
      i = k;
    } else {
      let j = s.indexOf(",", i); if (j < 0) j = s.length;
      const k = norm(s.slice(i, j));
      if (k.length >= 2) keys.push(k); else if (k) console.warn("[tutor-kb] 한 글자 낱말은 쓰지 않아요 (" + file + "): " + k);
      i = j + 1;
    }
  }
  return { keys, res };
}
const stripComments = (md) => String(md || "").replace(/<!--[\s\S]*?-->\s*\n?/g, "");
/** 마크다운 한 파일 → 카드들 */
function parseDoc(md, file) {
  const out = [];
  let doc = "";
  String(md || "").replace(/\r\n?/g, "\n").split(/\n(?=#{1,2} )/).forEach((part, n) => {
    const head = (part.match(/^(#{1,2}) (.+)/) || []);
    if (head[1] === "#") { doc = head[2].trim(); return; }
    if (head[1] !== "##") return;
    const sec = { id: file + "#" + n, file, doc, title: head[2].trim(), keys: [], res: [], no: [], calc: "", lines: [] };
    let body = part.slice(head[0].length);
    body.replace(/<!--([\s\S]*?)-->/g, (all, c) => {
      const m = String(c).match(/^\s*(질문|아님|계산)\s*:\s*([\s\S]*)$/);
      if (!m) return "";
      if (m[1] === "계산") sec.calc = m[2].trim();
      else { const l = parseList(m[2], file); if (m[1] === "질문") { sec.keys.push(...l.keys); sec.res.push(...l.res); } else sec.no.push(...l.res.concat(l.keys.map((k) => new RegExp(k)))); }
      return "";
    });
    sec.lines = stripComments(body).split("\n").map((l) => l.trim()).filter(Boolean).map(cleanLine);
    if (sec.lines.length) out.push(sec);
  });
  return out;
}
/** 말풍선에 그대로 보이게: **굵게** · [글자](주소) 정리 */
const cleanLine = (l) => l.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2").replace(/^[*•]\s+/, "- ");

const cache = {};
const EMPTY = { sections: [], settings: {}, text: "", files: [], avoid: null };
/** 강사 학습 자료 묶음 (파일을 한 번만 읽어요) */
function load(iid) {
  if (!/^[a-z0-9_-]{1,40}$/i.test(String(iid || ""))) return EMPTY;
  if (cache[iid]) return cache[iid];
  const files = [];
  const read = (p, name) => { try { files.push({ name, md: fs.readFileSync(p, "utf8") }); } catch (e) {} };
  read(path.join(DIR, iid + ".md"), iid + ".md");
  try { fs.readdirSync(path.join(DIR, iid)).filter((f) => /\.md$/i.test(f)).sort().forEach((f) => read(path.join(DIR, iid, f), iid + "/" + f)); } catch (e) {}
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(path.join(DIR, iid + ".json"), "utf8")) || {}; } catch (e) {}
  let avoid = null;
  try { avoid = settings.avoid ? new RegExp(settings.avoid, "i") : null; } catch (e) { console.warn("[tutor-kb] avoid 정규식을 읽지 못했어요 (" + iid + ".json)"); }
  const sections = [];
  files.forEach((f) => sections.push(...parseDoc(f.md, f.name)));
  return (cache[iid] = { sections, settings, avoid, files: files.map((f) => f.name), text: files.map((f) => stripComments(f.md).trim()).filter(Boolean).join("\n\n") });
}

/* ---------- 점수 ---------- */
const grams = (s) => { const t = norm(s), g = new Set(); for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2)); return g; };
function overlap(q, text) { const A = grams(q), B = grams(text); if (!A.size || !B.size) return 0; let n = 0; A.forEach((x) => { if (B.has(x)) n++; }); return n / A.size; }
function scoreSec(t, nq, sec) {
  if (sec.no.some((r) => r.test(t))) return 0;
  if (!sec.keys.length && !sec.res.length) return overlap(t, sec.title + " " + sec.lines.join(" ")) * 4; // 주석 없는 자료
  let s = 0;
  sec.keys.forEach((k) => { if (nq.indexOf(k) >= 0) s += keyW(k); });
  sec.res.forEach((r) => { if (r.test(t)) s += RE_W; });
  return s;
}
function rank(kb, t) {
  const nq = norm(t), half = kb.avoid && kb.avoid.test(t) ? 0.5 : 1;
  return kb.sections.map((sec) => ({ sec, s: scoreSec(t, nq, sec) * half })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
}

/* ---------- 계산 ---------- */
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
/** 뉴질랜드 오늘 (서머타임 포함) → { y, m, d, dow } */
function nzToday(ms) {
  try {
    const p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Auckland", year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
  } catch (e) {
    const t = new Date(ms + 13 * 3600e3);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  }
}
const addDays = (b, n) => { const t = new Date(Date.UTC(b.y, b.m - 1, b.d) + n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() }; };
const md = (x) => x.m + "월 " + x.d + "일(" + DOW[x.dow] + ")";
/** 화요일 발송(월요일 마감) → 그 주 토요일~다음 주 월요일 · 목요일 발송(수요일 마감) → 다음 주 화~수요일 */
function arrival(t, now) {
  // ‘며칠 걸려요?’(기간)는 카드만 · ‘언제 받아요? · 오늘 주문하면?’(날짜)일 때 계산해요
  if (!/(오늘|지금|이번\s*주|내일|언제|도착|받아|받을|받나|받으|와요|오나요|올까|주문하면|보내면)/.test(t)) return "";
  const td = nzToday(now), dow = td.dow;
  let fly, cut;
  if (dow === 1) { fly = 1; cut = "오늘(월요일)"; }
  else if (dow === 2) { fly = 2; cut = "내일 " + md(addDays(td, 1)); }
  else if (dow === 3) { fly = 1; cut = "오늘(수요일)"; }
  else { fly = (2 - dow + 7) % 7 || 7; cut = md(addDays(td, fly - 1)); }
  const f = addDays(td, fly), tue = f.dow === 2, a1 = addDays(f, tue ? 4 : 5), a2 = addDays(f, 6);
  return "지금 뉴질랜드는 " + md(td) + "이에요. " + cut + " 마감에 맞춰 접수하면 " + md(f) + " 직항편으로 나가서, 한국에서 " + md(a1) + " ~ " + md(a2) + "쯤 받을 수 있어요. (마감 시각은 담당자에게 확인해 주세요)";
}
/** 질문 속 무게 → 그램 (최대 3개) · ‘1kg 넘으면’처럼 기준을 말한 숫자는 빼요 */
function weightsIn(t) {
  const out = [], re = /(\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?)\s*(kg|㎏|킬로그램|키로|킬로|kilo|그램|그람|g)(?![a-z])/gi;
  let m;
  while ((m = re.exec(t)) && out.length < 3) {
    if (/^\s*(을|를|이|가|은|는)?\s*(넘|초과|이상|이하|미만|부터|까지)/.test(t.slice(m.index + m[0].length))) continue;
    const num = /^\d{1,3}(,\d{3})+$/.test(m[1]) ? Number(m[1].replace(/,/g, "")) : parseFloat(m[1].replace(",", "."));
    const g = Math.round(/^(g|그램|그람)$/i.test(m[2]) ? num : num * 1000);
    if (g > 0 && g <= 100000) out.push(g);
  }
  return out;
}
const fee = (g) => 16 + Math.ceil(Math.max(0, g - 1000) / 100);
const wtxt = (g) => (g >= 1000 ? String(+(g / 1000).toFixed(3)) + "kg" : g + "g");
function shipCost(t) {
  const ws = weightsIn(t);
  if (!ws.length) return "";
  return ws.map((g) => {
    if (g <= 1000) return wtxt(g) + "은 1kg 이하라 기본 운송료 $16예요. (포장비 포함)";
    const extra = g - 1000, n = Math.ceil(extra / 100);
    return wtxt(g) + "이면 예상 운송료는 $" + fee(g) + "예요. 기본 $16(1kg까지, 포장비 포함) + 1kg를 넘는 " + wtxt(extra) + " → 100g × " + n + " = $" + n + (extra % 100 ? " (100g이 안 되는 무게는 100g으로 올려 계산했어요)" : "");
  }).join("\n") + "\n실제 무게에 따라 달라질 수 있으니 정확한 금액은 담당자에게 확인해 주세요.";
}
/** ‘마누카꿀 5개랑 초록홍합 6개’ → 꿀을 뺀 건강식품 개수로 1회 6개 기준 확인 (나눠 보내라고는 안내하지 않아요) */
function quantity(t, ins) {
  const items = [], re = /([가-힣a-zA-Z]{1,12})?\s*(\d{1,3})\s*(개|병|통|박스|ea)(?![a-z])/gi;
  let m;
  while ((m = re.exec(t))) {
    if (/^\s*(을|를|이|가|은|는)?\s*(넘|초과|이상|이하|미만|부터|까지|제한|기준)/.test(t.slice(m.index + m[0].length))) continue;
    const name = String(m[1] || "").replace(/(이랑|랑|하고|와|과|및|그리고|또|도|만|을|를|은|는|이|가)$/, "");
    items.push({ name, n: Number(m[2]), honey: /꿀|허니|honey|마누카/i.test(name) });
  }
  if (!items.length || !(items.some((x) => x.name) || /(보내|발송|배송|통관|주문)/.test(t))) return "";
  const other = items.filter((x) => !x.honey).reduce((a, x) => a + x.n, 0), honey = items.filter((x) => x.honey).reduce((a, x) => a + x.n, 0);
  const list = items.map((x) => (x.name ? x.name + " " : "") + x.n + "개").join(" + ");
  if (!other) return list + ": 꿀은 1회 6개 제한에 들어가지 않아요.";
  if (other <= 6) return list + ": 꿀을 뺀 건강식품이 " + other + "개라 1회 6개 기준 안이에요. 보낼 수 있어요." + (honey ? " 꿀 " + honey + "개는 6개 제한에 들어가지 않아요." : "");
  return list + ": 꿀을 뺀 건강식품이 " + other + "개라 1회 6개 기준을 넘어요. 한 번에 6개 이하로 맞춰 주세요. 수량이 많다면 ‘질문 · 요청’ 메뉴의 1:1 요청으로 " + (ins || "강사") + "님께 상의해 주세요.";
}
const CALC = { "운송료": (t) => shipCost(t), "도착일": (t, o) => arrival(t, o.now), "수량": (t, o) => quantity(t, o.ins) };

/* ---------- 답 ---------- */
/** 질문 → { hit, guard, text, calc, ids } (hit 이 false 면 학습 자료에서 못 찾음) */
function answer(iid, q, opt) {
  opt = Object.assign({ now: Date.now(), ins: "" }, opt || {});
  const t = String(q == null ? "" : q).replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!t) return { hit: false };
  if (isGuard(t)) return { hit: true, guard: true, ids: ["guard"], text: GUARD_TEXT, calc: "" };
  const kb = load(iid);
  if (!kb.sections.length) return { hit: false };
  const r = rank(kb, t);
  if (!r.length || r[0].s < MIN) return { hit: false, best: r[0] ? { title: r[0].sec.title, s: r[0].s } : null };
  const pick = [r[0]];
  // 두 가지를 함께 물으면(‘배송 기간이랑 배송비’) 둘째 카드도 — 아니면 첫째와 비슷하게 맞을 때만
  const both = /(이랑|랑|하고|그리고|및|또는|,|&|\+|[가-힣](와|과)\s)/.test(t);
  if (r[1] && r[1].s >= (both ? MIN : Math.max(MIN, r[0].s * 0.6))) pick.push(r[1]);
  const calcs = [];
  const text = pick.map((x) => {
    const sec = x.sec, c = sec.calc && CALC[sec.calc] ? CALC[sec.calc](t, opt) : "";
    if (c) calcs.push(c);
    return (c ? c + "\n\n" + "기준 · ‘" + sec.title + "’" : "‘" + sec.title + "’ 안내예요.") + "\n" + sec.lines.join("\n");
  }).join("\n\n");
  return { hit: true, ids: pick.map((x) => x.sec.id), text, calc: calcs.join("\n"), score: r[0].s };
}
/** 화면이 같은 규칙으로 ‘서버에 물어볼 질문’을 고르게: 카드별 낱말 · 정규식 + 공통 설정 (학습 자료 내용은 보내지 않아요) */
function info(iid) {
  const kb = load(iid), rx = (r) => [r.source, r.flags];
  return {
    min: MIN, re: RE_W,
    cards: kb.sections.map((s) => ({ k: s.keys, r: s.res.map(rx), n: s.no.map(rx) })),
    avoid: kb.avoid ? rx(kb.avoid) : null,
    guard: GUARD.map(rx),
    chips: kb.settings && kb.settings.chips && Array.isArray(kb.settings.chips.list) ? { title: String(kb.settings.chips.title || "학습 자료").slice(0, 20), list: kb.settings.chips.list.slice(0, 12).map((x) => String(x).slice(0, 60)) } : null
  };
}
/** 학습 자료가 있는 강사들 → 카드 수 (배포 확인용) */
function summary() {
  const out = {};
  let names = [];
  try { names = fs.readdirSync(DIR); } catch (e) {}
  names.map((f) => f.replace(/\.(md|json)$/i, "")).filter((v, i, a) => a.indexOf(v) === i && /^[a-z0-9_-]{1,40}$/i.test(v)).forEach((iid) => { const kb = load(iid); if (kb.sections.length) out[iid] = { cards: kb.sections.length, files: kb.files.length }; });
  return out;
}

module.exports = { answer, info, load, summary, isGuard, GUARD_TEXT, MIN, _: { weightsIn, fee, shipCost, arrival, quantity, nzToday, parseList, norm } };
