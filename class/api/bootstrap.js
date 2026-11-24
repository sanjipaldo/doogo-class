/* GET /api/bootstrap            처음 불러오기 — 이 사람이 볼 수 있는 문서 전부
 * GET /api/bootstrap?since=ms   그 뒤로 바뀐 문서만 (다른 기기·다른 사람의 변경 받기) */
"use strict";
const { send, query, handler } = require("./_lib/http");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const access = require("./_lib/access");
const init = require("./_lib/init");
const DEMO = require("./_lib/demoorders");

/* 공개 숫자 (2026-11-24 · /vod/about ‘회원 N명’): 회원 문서는 비공개라 화면이 셀 수 없어요 → 탈퇴 · 이용 중지 · 체험 계정을 뺀 회원 수만 숫자로
 *  처음 불러오기 때만 · 서버 인스턴스마다 10분 기억 (회원이 많아져도 요청마다 세지 않게) */
let pubCache = { at: 0, v: null };
async function pubStats(now) {
  if (pubCache.v && now - pubCache.at < 10 * 60e3) return pubCache.v;
  try {
    const rows = await store.listDocs({ since: null, prefixes: ["vm:%"] });
    const members = rows.filter((r) => /^vm:/.test(r.k) && r.v && typeof r.v === "object" && !r.v.withdrawnAt && !r.v.blocked && !r.v.demo && r.k !== "vm:vm-demo").length;
    pubCache = { at: now, v: { members } };
  } catch (e) { console.error("[bootstrap] pub stats", e && e.message); }
  return pubCache.v || {};
}

module.exports = handler(["GET"], async (req, res) => {
  const q = query(req);
  const since = q.since != null && q.since !== "" ? Number(q.since) : null;
  if (since == null) await init.ensureSeeded();
  const ids = await auth.identify(req);
  const now = Date.now();
  const pre = access.prefixesFor(ids);
  // 마스터 · 운영자처럼 모든 주문을 보는 사람이 불러올 때: 1시간 지난 체험 계정 주문을 먼저 정리 (5분에 한 번까지 · 2026-11-15 · _lib/demoorders.js)
  if (!pre || pre.indexOf("vo:%") >= 0) await DEMO.sweep({ now }).catch((e) => console.error("[demo-orders]", e && e.message));
  const rows = await store.listDocs({ since, prefixes: pre ? pre.concat("sys") : null });
  const docs = [];
  let epoch = null;
  rows.forEach((r) => {
    if (r.k === "sys") { epoch = r.v && r.v.epoch; return; }
    const v = access.view(r.k, r.v, ids);
    if (v !== undefined) docs.push([r.k, v, r.ver]);
  });
  // ver: 지금 배포된 판(커밋 앞 8자리) — 열어 둔 화면이 예전 판이면 ‘새 버전’ 안내 (db.js poll · 2026-11-15)
  const pub = since == null ? await pubStats(now) : undefined;
  send(res, 200, { mode: "server", now, epoch, ver: String(process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8), me: auth.publicMe(ids), pub, docs });
});
// 시험용: 10분 기억을 비워요 (scripts/vod-test.js)
module.exports.pubReset = () => { pubCache = { at: 0, v: null }; };
