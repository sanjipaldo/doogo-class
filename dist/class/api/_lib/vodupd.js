/* VOD 최신성 업데이트 알림 — /api/vod-pay 의 action "updNotify" (마스터 · 그 클래스 강사만)
 *  { action: "updNotify", pid, uid }   uid = 클래스의 업데이트 기록(p.upds[].id)
 *   → 서버가 그 클래스를 산 회원(결제 완료 수강권 · 예전 1년 연장권)을 주문에서 다시 찾아 ‘수강 중’ · ‘수강 끝남’으로 나누고
 *     마스터 › 메시지 · 자동화 › 채널 · 발송 규칙에서 고른 업데이트 알림톡 템플릿(meta.vod.crm.send.upd = { act, end } — 템플릿 목록 번호)으로 보내요
 *   알림톡이 아직 연결 전(솔라피 키 없음)이거나 템플릿을 고르지 않았으면 보내지 않고 대상 수만 돌려줘요 (st: "wait") — 연결한 뒤 ‘다시 보내기’
 *  알림톡은 정보성이라 소식 받기 동의와 상관없이 산 사람에게 보내요 (휴대폰 번호 · 탈퇴 여부는 msg.js 가 확인)
 *  템플릿 변수: #{이름} · #{강의명} · #{업데이트월}(예: 2026년 11월) · #{업데이트}(업데이트 제목) · #{링크}(강의 상세 주소)
 *  보낸 기록(최근 100건)은 vupd 문서(서버 전용)에 남겨요 — 같은 업데이트를 다시 보내면 지난번에 보낸 회원은 빼요 */
"use strict";
const store = require("./store");
const V = require("./vod");
const MSG = require("./msg");

const SITE = "https://www.doogoclass.com";
const ymTxt = (d) => { const m = /^(\d{4})-(\d{2})/.exec(String(d || "")); return m ? m[1] + "년 " + Number(m[2]) + "월" : ""; };
const isAccess = (o) => (o.kind || "course") === "course" || o.kind === "extend";
/** 회원 한 명이 이 강의를 볼 수 있는 마지막 시각 — 화면 vod.js accessEnd 와 같은 계산 (기간 없는 강의 Infinity) */
function endOf(p, os) {
  const list = os.filter((o) => o.status === "paid" && isAccess(o)).sort((a, b) => (a.paidAt || 0) - (b.paidAt || 0));
  if (!list.length) return 0;
  if (p.type && p.type !== "vod") return Infinity;
  let end = 0;
  for (const o of list) { const d = Number(o.days) || (o.kind === "extend" ? 365 : Number(p.accessDays) || 0); if (!d) return Infinity; end = Math.max(end, o.paidAt || 0) + d * 864e5; }
  return end;
}
/** 이 클래스를 산 회원 → { act: [회원ID], end: [회원ID] } */
async function buyers(p, now) {
  const rows = await store.listDocs({ prefixes: ["vo:%"] }), by = {};
  rows.forEach((r) => { const o = r.v; if (o && o.pid === p.id && o.status === "paid" && isAccess(o) && o.mid) (by[o.mid] = by[o.mid] || []).push(o); });
  const act = [], end = [];
  Object.keys(by).forEach((mid) => { const e = endOf(p, by[mid]); if (e > now) act.push(mid); else if (e) end.push(mid); });
  return { act, end };
}
async function members(mids) {
  const out = [];
  for (let i = 0; i < mids.length; i += 200) {
    const docs = await store.getDocs(mids.slice(i, i + 200).map(V.K.member));
    Object.keys(docs).forEach((k) => { if (docs[k] && docs[k].v) out.push(docs[k].v); });
  }
  return out;
}
/** ids: 확인된 관리자 로그인 · b: 요청 본문 → { status, json } */
async function notify(ids, b) {
  const pid = String(b.pid || "").slice(0, 60), uid = String(b.uid || "").slice(0, 60);
  const meta = ((await store.getDoc("meta")) || {}).v || {}, vod = meta.vod || {};
  const p = (vod.products || []).find((x) => x && x.id === pid);
  if (!p) return { status: 404, json: { ok: false, message: "클래스를 찾지 못했어요." } };
  const master = ids.admin.role === "master", mine = ids.admin.role === "instructor" && ids.admin.iid && ids.admin.iid === p.iid;
  if (!master && !mine) return { status: 403, json: { ok: false, message: "이 클래스의 강사 · 마스터만 보낼 수 있어요." } };
  const u = (Array.isArray(p.upds) ? p.upds : []).find((x) => x && x.id === uid);
  if (!u) return { status: 404, json: { ok: false, message: "업데이트 기록을 찾지 못했어요. 먼저 저장해 주세요." } };
  const now = Date.now(), who = await buyers(p, now);
  const log = ((await store.getDoc("vupd")) || {}).v || { recent: [] }, key = pid + ":" + uid;
  const sentBefore = {}; (log.recent || []).filter((x) => x.key === key).forEach((x) => (x.to || []).forEach((id) => { sentBefore[id] = 1; }));
  const conf = ((vod.crm || {}).send) || {}, tpls = Array.isArray(conf.tpls) ? conf.tpls : [], pick = conf.upd || {};
  const tA = tpls[Number(pick.act)], tE = tpls[Number(pick.end)];
  const base = { st: "wait", at: now, act: { n: who.act.length }, end: { n: who.end.length } };
  if (!MSG.on("alim")) return { status: 200, json: Object.assign({ ok: true, why: "알림톡이 아직 연결 전이에요 (솔라피 키 · 카카오 채널)." }, base) };
  if (!(pick.act !== "" && pick.act != null && tA) && !(pick.end !== "" && pick.end != null && tE)) return { status: 200, json: Object.assign({ ok: true, why: "업데이트 알림톡 템플릿을 아직 고르지 않았어요 (마스터 › 메시지 · 자동화 › 채널 · 발송 규칙)." }, base) };
  const vars = { "#{강의명}": String(p.title || "").slice(0, 60), "#{업데이트월}": ymTxt(u.at), "#{업데이트}": String(u.title || "최신 내용 반영").slice(0, 60), "#{링크}": SITE + "/vod/p/" + encodeURIComponent(p.id) };
  const out = Object.assign({}, base, { st: "sent" }), to = [];
  for (const [k, t, list] of [["act", tA, who.act], ["end", tE, who.end]]) {
    const ids2 = list.filter((id) => !sentBefore[id]);
    if (!t || !ids2.length) { out[k] = { n: list.length, sent: 0, skip: list.length - ids2.length ? { "이미 보냄": list.length - ids2.length } : {}, none: !t }; continue; }
    const r = await MSG.send("alim", await members(ids2), { text: t.text, templateId: t.id, vars });
    if (!r.ok) { out[k] = { n: list.length, sent: 0, fail: r.message }; continue; }
    const skip = Object.assign({}, r.skip); if (list.length - ids2.length) skip["이미 보냄"] = list.length - ids2.length;
    out[k] = { n: list.length, sent: r.sent, failed: r.failed, skip };
    (r.to || []).forEach((id) => to.push(id));
  }
  const by = String((ids.admin && (ids.admin.name || ids.admin.id)) || (master ? "마스터" : "강사")).slice(0, 20);
  await V.update("vupd", (x) => { x = x || { recent: [] }; x.recent = [{ key, pid, uid, at: now, by, act: out.act, end: out.end, to }].concat(x.recent || []).slice(0, 100); return x; });
  return { status: 200, json: Object.assign({ ok: true }, out) };
}
module.exports = { notify, endOf, ymTxt };
