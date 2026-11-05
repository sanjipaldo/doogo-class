/* DB 옮기기 도구 (DB 전환 1부 A3 · 2026-11) — 문서 · 사진 · 볼 수 있는 범위 · 작업 기록 · 최근 백업을 한 DB 에서 다른 DB 로 복사하고 하나씩 확인해요
 *
 *  2026-11-05 운영 · 미리보기를 Turso → Supabase 로 옮길 때 썼어요(배포 때 DB_MOVE — 그 뒤 Turso 를 정리하며 배포용 DB_MOVE 와 Turso 연결은 뺐어요).
 *  지금 쓰는 곳: 화면 시험이 시험 DB(SQLite)를 Postgres(PGlite)로 옮길 때(scripts/e2e/lib.js) · 로컬에서 Supabase 를 SQLite 파일로 받아 두거나 되돌릴 때(아래 CLI)
 *
 *  어디서 어디로: SQLite 파일 · Postgres(Supabase · 로컬 PGlite) 아무 쪽이나 (같은 표 6개 · store.openClient)
 *  모드
 *    copy   받는 쪽이 비어 있을 때만 전부 복사 (+ 최근 백업 5개). 이미 같은 내용이면 확인만 하고 넘어가요 (같은 일을 다시 돌려도 안전)
 *    sync   받는 쪽을 먼저 그 DB 백업에 남기고, 보내는 쪽과 문서가 똑같게 (없는 문서는 지움) — 되돌리기(전체)
 *    since  그 시각(ms) 뒤에 바뀐 문서 · 새 사진만 — 되돌리기(바뀐 것만)
 *    verify 복사하지 않고 비교만
 *  확인: 문서마다 해시(키 · 글자 · 버전 · 순서 · 바뀐 시각) · 사진마다 해시(종류 · 크기 · 내용) · 범위 · 작업 기록 — 하나라도 다르면 실패(멈춤)
 *  로그인 실패 횟수(rl)는 잠깐 쓰는 값이라 옮기지 않아요.
 *
 *  로컬: node scripts/db-move.js <보내는 쪽> <받는 쪽> [copy|sync|since:<ms>|verify]
 *    보내는 쪽 · 받는 쪽: sqlite:<파일> · supabase(환경 변수 SUPABASE_DB_URL) · pg:<로컬 주소>
 *    예) Supabase 를 내 컴퓨터 SQLite 파일로 받아 두기: SUPABASE_DB_URL=… node scripts/db-move.js supabase sqlite:backup.db copy
 */
"use strict";
const crypto = require("crypto");
const store = require("../api/_lib/store");

const CHUNK = 40, FILE_CHUNK = 5;
const q = async (c, sql, args) => (await c.batch([{ sql, args: args || [] }]))[0].rows;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const N = (x) => (x == null ? null : Number(x));
const docSig = (r) => sha([r.k, r.v == null ? "\u0000null" : String(r.v), N(r.ver), N(r.created), N(r.updated)].join("\u0001"));
const fileSig = (r) => sha([r.h, r.mime, N(r.size), r.b64].join("\u0001"));

const UPSERT_DOC = "INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, ver = excluded.ver, updated = excluded.updated, created = excluded.created";
const INS_FILE = "INSERT INTO files (h, mime, b64, size, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(h) DO NOTHING";
const INS_SCOPE = "INSERT INTO file_scopes (h, scope) VALUES (?, ?) ON CONFLICT(h, scope) DO NOTHING";
const INS_OP = "INSERT INTO oplog (id, at, note, result) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING";
const INS_BK = "INSERT INTO backups (at, reason, docs, size, data) VALUES (?, ?, ?, ?, ?)";

async function chunked(c, stmts, n) { for (let i = 0; i < stmts.length; i += n) await c.batch(stmts.slice(i, i + n)); }
/** 사진은 나눠 읽어요 (한 번에 25개 또는 4MB 까지 — 사진이 많아도 응답 하나가 너무 커지지 않게) */
async function fileRows(c) {
  const list = await q(c, "SELECT h, mime, size, created FROM files ORDER BY h"), out = [];
  for (let i = 0; i < list.length;) {
    const part = []; let bytes = 0;
    while (i < list.length && part.length < 25 && (part.length === 0 || bytes + (N(list[i].size) || 0) * 1.4 < 4 * 1048576)) { bytes += (N(list[i].size) || 0) * 1.4; part.push(list[i++]); }
    const got = {}; (await q(c, "SELECT h, b64 FROM files WHERE h IN (" + part.map(() => "?").join(",") + ")", part.map((x) => x.h))).forEach((r) => { got[r.h] = r.b64; });
    part.forEach((x) => out.push(Object.assign({}, x, { b64: got[x.h] })));
  }
  return out;
}
async function snapshot(c) {
  return {
    docs: await q(c, "SELECT k, v, ver, updated, created FROM docs"),
    files: await fileRows(c),
    scopes: await q(c, "SELECT h, scope FROM file_scopes"),
    ops: await q(c, "SELECT id, at, note, result FROM oplog")
  };
}

/** 두 DB 비교 — o.keys: 그 문서만 · o.extraDocs: 받는 쪽에만 있는 문서 허용 · o.extraOther: 받는 쪽에만 있는 사진 · 범위 · 작업 기록 허용 */
async function verify(src, dst, o) {
  o = o || {};
  const a = await snapshot(src), b = await snapshot(dst);
  const only = o.keys ? new Set(o.keys) : null;
  const cmp = (A, B, key, sig, extraOk, filter) => {
    const ma = new Map(A.filter(filter || (() => true)).map((r) => [key(r), sig(r)])), mb = new Map(B.map((r) => [key(r), sig(r)])), bad = [];
    for (const [k, s] of ma) { if (!mb.has(k)) bad.push(k + " (받는 쪽에 없음)"); else if (mb.get(k) !== s) bad.push(k + " (내용이 다름)"); }
    if (!extraOk) for (const k of mb.keys()) if (!ma.has(k)) bad.push(k + " (받는 쪽에만 있음)");
    return { src: ma.size, dst: mb.size, bad };
  };
  const r = {
    docs: cmp(a.docs, b.docs, (x) => x.k, docSig, !!(o.extraDocs || only), only ? (x) => only.has(x.k) : null),
    files: cmp(a.files, b.files, (x) => x.h, fileSig, !!o.extraOther),
    scopes: cmp(a.scopes, b.scopes, (x) => x.h + "|" + x.scope, () => "1", !!o.extraOther),
    ops: cmp(a.ops, b.ops, (x) => x.id, (x) => sha([x.id, N(x.at), x.note == null ? "" : x.note, x.result == null ? "" : x.result].join("\u0001")), !!o.extraOther)
  };
  r.ok = ["docs", "files", "scopes", "ops"].every((t) => !r[t].bad.length);
  return r;
}
const brief = (v) => ["docs", "files", "scopes", "ops"].map((t) => ({ docs: "문서", files: "사진", scopes: "범위", ops: "작업 기록" })[t] + " " + v[t].src + "→" + v[t].dst + (v[t].bad.length ? " (다름 " + v[t].bad.length + ": " + v[t].bad.slice(0, 5).join(", ") + ")" : "")).join(" · ");

/** 옮기기 — mode: copy · sync · since (o.since = ms) */
async function move(src, dst, o) {
  o = o || {};
  const mode = o.mode || "copy", t0 = Date.now();
  if (["copy", "sync", "since"].indexOf(mode) < 0) throw new Error("모드를 모르겠어요: " + mode + " (copy · sync · since)");
  const since = mode === "since" ? Number(o.since) : null;
  if (mode === "since" && !(since > 0)) throw new Error("since 모드는 기준 시각(ms)이 필요해요");
  await src.init(); await dst.init();
  const dstN = Number((await q(dst, "SELECT COUNT(*) AS n FROM docs"))[0].n);
  if (mode === "copy" && dstN > 0) {
    const v0 = await verify(src, dst);
    if (v0.ok) return { ok: true, mode, skipped: true, verify: v0, ms: Date.now() - t0 };
    const e = new Error("받는 DB 에 이미 문서가 " + dstN + "개 있고 보내는 쪽과 달라요 — copy 는 빈 DB 에만 해요 (되돌리기는 sync · since) · " + brief(v0));
    e.verify = v0; throw e;
  }
  const a = await snapshot(src);
  const docs = since ? a.docs.filter((r) => N(r.updated) > since) : a.docs;
  const files = since ? a.files.filter((r) => N(r.created) > since) : a.files;
  let removed = 0, backed = null;
  if (mode === "sync") {
    // 받는 쪽 지금 문서를 그 DB 백업에 먼저 (지운 문서 · 덮어쓴 문서를 되찾을 수 있게)
    const cur = await q(dst, "SELECT k, v, ver, updated, created FROM docs");
    if (cur.length) { const data = JSON.stringify(cur); await q(dst, INS_BK, [Date.now(), "옮기기(sync) 전 자동 백업", cur.length, data.length, data]); backed = cur.length; }
    const keep = new Set(a.docs.map((r) => r.k)), gone = cur.filter((r) => !keep.has(r.k)).map((r) => r.k);
    await chunked(dst, gone.map((k) => ({ sql: "DELETE FROM docs WHERE k = ?", args: [k] })), CHUNK);
    removed = gone.length;
  }
  await chunked(dst, docs.map((r) => ({ sql: UPSERT_DOC, args: [r.k, r.v == null ? null : String(r.v), N(r.ver), N(r.updated), N(r.created)] })), CHUNK);
  await chunked(dst, files.map((r) => ({ sql: INS_FILE, args: [r.h, r.mime, r.b64, N(r.size), N(r.created)] })), FILE_CHUNK);
  await chunked(dst, a.scopes.map((r) => ({ sql: INS_SCOPE, args: [r.h, r.scope] })), CHUNK);
  await chunked(dst, a.ops.map((r) => ({ sql: INS_OP, args: [r.id, N(r.at), r.note == null ? null : r.note, r.result == null ? null : r.result] })), CHUNK);
  let bk = 0;
  if (mode === "copy") {
    const bks = await q(src, "SELECT at, reason, docs, size, data FROM backups ORDER BY id DESC LIMIT " + Math.max(0, Math.min(40, Number(o.backups) >= 0 ? Number(o.backups) : 5)));
    for (const r of bks.reverse()) { await q(dst, INS_BK, [N(r.at), r.reason, N(r.docs), N(r.size), r.data]); bk++; }
  }
  const v = await verify(src, dst, mode === "since" ? { keys: docs.map((r) => r.k), extraOther: true } : mode === "sync" ? { extraOther: true } : {});
  const res = { ok: v.ok, mode, docs: docs.length, files: files.length, scopes: a.scopes.length, ops: a.ops.length, backups: bk, removed, backed, verify: v, ms: Date.now() - t0 };
  if (!v.ok) { const e = new Error("옮긴 뒤 확인이 맞지 않아요 — " + brief(v)); e.result = res; throw e; }
  return res;
}

/** 배포 때 한 줄 기록 */
function line(res, from, to) {
  if (res.skipped) return from + " → " + to + ": 이미 같은 내용이에요 (확인만 · " + brief(res.verify) + ")";
  return from + " → " + to + " (" + res.mode + "): 문서 " + res.docs + "개 · 사진 " + res.files + "개 · 범위 " + res.scopes + "개 · 작업 기록 " + res.ops + "개" + (res.backups ? " · 백업 " + res.backups + "개" : "") + (res.backed ? " · 받는 쪽 문서 " + res.backed + "개 먼저 백업(그 DB 백업 목록 ‘옮기기(sync) 전 자동 백업’)" : "") + (res.removed ? " · 받는 쪽에만 있던 문서 " + res.removed + "개 지움(먼저 백업)" : "") + " · 확인: 문서마다 해시 맞음 · " + (res.ms / 1000).toFixed(1) + "초";
}

/** 환경 변수로 여는 연결: supabase */
function fromEnv(which) {
  if (which === "supabase") {
    if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL 환경 변수가 없어요");
    return store.openClient({ kind: "postgres", url: process.env.SUPABASE_DB_URL });
  }
  throw new Error("모르는 DB: " + which);
}
function parseSpec(s) {
  s = String(s || "");
  if (s === "supabase") return { c: fromEnv(s), name: "Supabase" };
  if (s.indexOf("sqlite:") === 0) return { c: store.openClient({ kind: "sqlite", file: s.slice(7) }), name: "SQLite" };
  if (s.indexOf("pg:") === 0) {
    const url = s.slice(3);
    if (!/^postgres(ql)?:\/\/[^@]*@?(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("pg:<주소> 는 로컬 시험용 Postgres 만 — Supabase 는 supabase (환경 변수 SUPABASE_DB_URL) 로");
    return { c: store.openClient({ kind: "postgres", url }), name: "Postgres(로컬)" };
  }
  throw new Error("보내는 쪽 · 받는 쪽: sqlite:<파일> · supabase · pg:<로컬 주소>");
}

module.exports = { move, verify, line, brief, docSig };

if (require.main === module) {
  (async () => {
    const [fromS, toS, modeS] = process.argv.slice(2);
    if (!fromS || !toS) { console.log("사용법: node scripts/db-move.js <보내는 쪽> <받는 쪽> [copy|sync|since:<ms>|verify]\n  sqlite:<파일> · supabase · pg:<로컬 주소>"); process.exit(2); }
    const A = parseSpec(fromS), B = parseSpec(toS), m = String(modeS || "copy");
    try {
      if (m === "verify") { const v = await verify(A.c, B.c); console.log((v.ok ? "같아요 · " : "달라요 · ") + brief(v)); process.exitCode = v.ok ? 0 : 1; return; }
      const mode = m.indexOf("since:") === 0 ? "since" : m;
      const res = await move(A.c, B.c, { mode, since: mode === "since" ? Number(m.slice(6)) : null });
      console.log(line(res, A.name, B.name));
    } catch (e) { console.error("실패: " + e.message); process.exitCode = 1; }
    finally { await A.c.end().catch(() => {}); await B.c.end().catch(() => {}); }
  })();
}
