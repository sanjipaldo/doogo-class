/* 두고 파트너스 지원서 → 지원자에게 ‘강사 입점 제안서’ 메일 (2026-11-15 대표님 요청)
 * 소개서 링크는 공개 화면(/vod/partners)에서 뺐고, 지원서를 보낸 분이 적은 이메일로만 보내요.
 *  · MD님이 연락드리기 전에 시스템 구성 · 수익 구조를 먼저 빠르게 읽어 보시라는 안내
 *  · 정보성 메일(본인이 보낸 지원서의 접수 안내)이라 광고 표시 · 수신 거부 문구는 넣지 않아요
 *  · 강사 정산 비율 숫자는 메일 본문에 쓰지 않아요 (소개서 안에서만 · 대외비)
 * 보내려면 Vercel 환경 변수 RESEND_API_KEY · MAIL_FROM (msg.js) — 없으면 보내지 않고 접수만 돼요
 *   (그때 접수 화면은 ‘MD님이 연락드릴 때 제안서를 함께 보내 드려요’ · 마스터 지원서 카드에 ‘제안서 메일: 못 보냄’) */
"use strict";
const msg = require("./msg");

const PT_DECK = "https://docsend.com/view/mzd5wpkmsb2r7fzj"; // 강사 입점 제안서 (DocSend · 2026-11-14)
const KK_CH = "@두고클래스";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const POINTS = [
  ["시스템 구성", "기획 · 촬영 · 편집 · 상세페이지 · 판매 · 강의실 · 정산까지, 두고클래스가 강사님과 어떻게 함께하는지"],
  ["수익금 구조", "판매 수익이 어떻게 나뉘고, 언제 어떻게 정산되는지"],
  ["런칭 방식 · 진행 과정", "지원부터 상담 · 계약 · 촬영 · 오픈까지의 흐름"]
];

/** 메일 내용 — a: { name, email, topic? } → { to, subject, text, html } */
function deckMail(a) {
  const nm = String(a.name || "").trim() || "강사";
  const subject = "[두고클래스] 지원해 주셔서 감사합니다 · 강사 입점 제안서를 먼저 보내 드려요";
  const text = [
    nm + " 강사님, 안녕하세요. 두고클래스입니다.",
    "",
    "두고클래스 ‘두고 파트너스’에 지원해 주셔서 진심으로 감사드립니다.",
    "담당 MD님이 연락드리기에 앞서, 저희 시스템이 어떻게 구성되어 있고 수익금이 어떻게 나뉘는지 1차적으로 빠르게 읽어 보실 수 있도록 강사 입점 제안서를 먼저 보내 드립니다.",
    "",
    "▶ 강사 입점 제안서 보기",
    PT_DECK,
    "",
    "제안서에 담긴 내용",
    POINTS.map((p) => "· " + p[0] + " — " + p[1]).join("\n"),
    "",
    (a.topic ? "보내 주신 지원서(‘" + String(a.topic).slice(0, 80) + "’)는 " : "보내 주신 지원서는 ") + "담당 MD님이 들어온 순서대로 꼼꼼히 읽고, 남겨 주신 연락처로 연락드릴게요.",
    "궁금한 점은 카카오톡 채널 " + KK_CH + "로 편하게 물어봐 주세요.",
    "",
    "다시 한번 지원해 주셔서 감사합니다.",
    "DOOGO CLASS 드림"
  ].join("\n");
  const p = (s, st) => '<p style="margin:0 0 14px;' + (st || "") + '">' + s + "</p>";
  const html =
    '<div style="padding:4px 0 2px"><span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;color:#fc1c49">DOOGO CLASS PARTNERS</span></div>' +
    '<h1 style="margin:6px 0 18px;font-size:22px;line-height:1.4;color:#16161a">지원해 주셔서 감사합니다.<br>강사 입점 제안서를 먼저 보내 드려요.</h1>' +
    p(esc(nm) + " 강사님, 안녕하세요. 두고클래스입니다.") +
    p("두고클래스 ‘두고 파트너스’에 지원해 주셔서 진심으로 감사드립니다.<br>담당 <b>MD님이 연락드리기에 앞서</b>, 저희 <b>시스템 구성</b>과 <b>수익금이 어떻게 나뉘는지</b> 1차적으로 빠르게 읽어 보실 수 있도록 강사 입점 제안서를 먼저 보내 드립니다.") +
    '<div style="margin:22px 0 24px"><a href="' + esc(PT_DECK) + '" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;border-radius:12px;background:#fc1c49;color:#fff;font-size:16px;font-weight:800;text-decoration:none">강사 입점 제안서 보기 →</a></div>' +
    '<div style="margin:0 0 20px;padding:16px 18px;border-radius:14px;background:#fff1f4;border:1px solid #ffd6df"><b style="display:block;margin:0 0 8px;color:#e0244a;font-size:14px">제안서에 담긴 내용</b>' +
      POINTS.map((x) => '<div style="margin:6px 0;font-size:14px;line-height:1.6"><b style="color:#16161a">· ' + esc(x[0]) + '</b><span style="color:#55555f"> — ' + esc(x[1]) + "</span></div>").join("") + "</div>" +
    p((a.topic ? "보내 주신 지원서(‘" + esc(String(a.topic).slice(0, 80)) + "’)는 " : "보내 주신 지원서는 ") + "담당 MD님이 들어온 순서대로 꼼꼼히 읽고, 남겨 주신 연락처로 연락드릴게요.<br>궁금한 점은 카카오톡 채널 <b>" + esc(KK_CH) + "</b>로 편하게 물어봐 주세요.") +
    p("다시 한번 지원해 주셔서 감사합니다.<br><b>DOOGO CLASS</b> 드림", "margin-top:20px") +
    '<p style="margin:18px 0 0;font-size:12px;color:#999">버튼이 열리지 않으면 이 주소를 복사해 주세요: ' + esc(PT_DECK) + "</p>";
  return { to: String(a.email || "").trim(), subject, text, html };
}

/** 보내기 — 메일이 늦어도 지원서 접수는 막지 않게 8초까지만 기다려요 → 지원서 문서에 남길 { at, ok, id? , why? } */
async function sendDeck(a, ms) {
  const at = Date.now();
  if (!msg.on("email")) return { at, ok: false, why: "off" };
  try {
    let timer;
    const r = await Promise.race([msg.mail1(deckMail(a)), new Promise((_, rej) => { timer = setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "timeout" })), ms || 8000); })]).finally(() => clearTimeout(timer));
    return r && r.ok ? { at, ok: true, id: r.id || "" } : { at, ok: false, why: (r && r.why) || "error" };
  } catch (e) {
    return { at, ok: false, why: e && e.code === "timeout" ? "timeout" : "error", err: String((e && e.message) || "").slice(0, 120) };
  }
}

module.exports = { PT_DECK, deckMail, sendDeck };
