/* 로컬 시험 전용 Postgres — PGlite(Node 안에서 도는 진짜 Postgres)를 TCP 로 열어서
 * 운영(Supabase)과 같은 postgres 드라이버 · 같은 SQL 로 접속해 시험해요. Docker · 인터넷 없이 돌아요.
 *   설치(한 번): npm --prefix class/scripts/pg ci
 *   직접 띄우기: node class/scripts/pg/server.js        → 접속 주소를 찍고 끌 때까지 떠 있어요
 *   코드에서:   const pg = await require("./scripts/pg/server").start(); … await pg.stop();
 * 운영 빌드(Vercel)는 이 폴더를 설치하지 않아요 (저장소 맨 위 package.json 에는 postgres 드라이버만). */
"use strict";
const net = require("net");

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

/** PGlite 를 띄워요 — dataDir 를 주면 그 폴더에 저장(없으면 메모리) */
async function start(opts) {
  opts = opts || {};
  let PGlite, PGLiteSocketServer;
  try {
    ({ PGlite } = require("@electric-sql/pglite"));
    ({ PGLiteSocketServer } = require("@electric-sql/pglite-socket"));
  } catch (e) {
    throw new Error("시험용 Postgres(PGlite)가 설치되지 않았어요 — 저장소 맨 위에서: npm --prefix class/scripts/pg ci");
  }
  const db = await PGlite.create(opts.dataDir || undefined);
  const port = opts.port || (await freePort());
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: opts.maxConnections || 4 });
  await server.start();
  const url = "postgres://postgres:postgres@127.0.0.1:" + port + "/postgres";
  // 끌 때: 소켓 서버가 연결 닫힘을 한 박자 늦게(setImmediate) 처리해서, 그게 끝난 뒤에 DB 를 닫아요 (먼저 닫으면 닫힌 DB 를 건드려 오류)
  const stop = async () => {
    try { await server.stop(); } catch (e) { /* 이미 꺼짐 */ }
    await new Promise((r) => setTimeout(r, 100));
    await db.close().catch(() => {});
  };
  return { url, port, db, stop };
}

module.exports = { start };

if (require.main === module) {
  start({ dataDir: process.argv[2] }).then((pg) => {
    console.log("시험용 Postgres(PGlite) → " + pg.url + (process.argv[2] ? " (저장: " + process.argv[2] + ")" : " (메모리)"));
    const bye = () => pg.stop().then(() => process.exit(0));
    process.on("SIGINT", bye); process.on("SIGTERM", bye);
  }).catch((e) => { console.error(e.message || e); process.exit(1); });
}
