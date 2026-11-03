/* POST /api/ai-tutor { iid, q, history } — 강의실 AI 조교에게 묻기 → { ok, src: "ai"|"kb", hit, text }
 *       hit: 강사 학습 자료 카드에서 찾은 답 (화면은 이 답을 강의 FAQ 보다 먼저 보여 줘요)
 * POST /api/ai-tutor { iid, op: "info" } — 화면이 ‘서버에 물어볼 질문’을 고르는 규칙 + ‘제조 · 배송’ 같은 바로 물어볼 질문 칩
 *       (학습 자료 내용은 보내지 않아요 · 묻기 횟수에 안 세요)
 * GET  /api/ai-tutor — 배포 확인용: 학습 자료가 있는 강사별 카드 수 (내용 없음)
 *  묻는 사람: 그 강사의 수강생 · 그 강사의 VOD를 산 회원 · 강사 본인 · 코치 · 마스터
 *  15분에 30번까지 (사람마다). 학습 자료 · 답하는 법은 _lib/tutor.js · _lib/tutor-kb.js */
"use strict";
const { send, body, handler } = require("./_lib/http");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const tutor = require("./_lib/tutor");

const LIMIT = 30;
/** 이 강사의 강의실을 쓰는 사람인지 → 제한 키 (아니면 "") */
async function who(ids, iid) {
  if (ids.admin && (ids.admin.role === "master" || ids.admin.iid === iid)) return "adm:" + (ids.admin.staffId || ids.admin.cid || ids.admin.iid || "master");
  if (ids.student && ids.student.iid === iid) return "stu:" + iid + ":" + ids.student.sid;
  if (ids.vod && (ids.vod.owns || []).length) {
    const meta = ((await store.getDoc("meta")) || {}).v || {}, mine = (((meta.vod || {}).products) || []).filter((p) => p && p.iid === iid).map((p) => String(p.id));
    if (mine.some((id) => ids.vod.owns.indexOf(id) >= 0)) return "vm:" + ids.vod.mid;
  }
  return "";
}

module.exports = handler(["GET", "POST"], async (req, res) => {
  if (req.method === "GET") return send(res, 200, { ok: true, kb: require("./_lib/tutor-kb").summary() });
  const b = await body(req), iid = String(b.iid || "").slice(0, 40), q = String(b.q || "").trim().slice(0, 1500), op = String(b.op || "");
  if (!/^[a-z0-9_-]+$/i.test(iid) || (!q && op !== "info")) return send(res, 400, { error: "input" });
  const k = await who(await auth.identify(req), iid);
  if (!k) return send(res, 403, { error: "forbidden" });
  if (op === "info") return send(res, 200, Object.assign({ ok: true }, tutor.info(iid)));
  const rk = "ai:" + k;
  if (await store.rlCheck([rk], LIMIT)) return send(res, 429, { error: "busy", text: "질문이 많아 잠깐 쉬어 갈게요. 15분쯤 뒤에 다시 물어봐 주세요." });
  await store.rlFail([rk]);
  const r = await tutor.ask(iid, q, Array.isArray(b.history) ? b.history.slice(-8) : []);
  send(res, 200, { ok: true, src: r.src, hit: !!r.hit, text: r.text });
});
