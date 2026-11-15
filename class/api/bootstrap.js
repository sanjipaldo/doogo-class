/* GET /api/bootstrap            처음 불러오기 — 이 사람이 볼 수 있는 문서 전부
 * GET /api/bootstrap?since=ms   그 뒤로 바뀐 문서만 (다른 기기·다른 사람의 변경 받기) */
"use strict";
const { send, query, handler } = require("./_lib/http");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const access = require("./_lib/access");
const init = require("./_lib/init");
const DEMO = require("./_lib/demoorders");

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
  send(res, 200, { mode: "server", now, epoch, ver: String(process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8), me: auth.publicMe(ids), docs });
});
