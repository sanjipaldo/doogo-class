/* 저장소 — Postgres(Supabase · 운영 · 미리보기) · node:sqlite(로컬 개발 · 시험) 위에 문서(doc) 테이블을 둔다.
 *
 *  docs        k(키) · v(JSON, 지우면 NULL) · ver(버전) · updated(바뀐 시각) · created(순서)
 *  files       사진·첨부 (data: URL 을 떼어 내 보관, 주소는 /api/file?h=해시)
 *  file_scopes 파일마다 누가 볼 수 있는지 (pub · content:강사 · prog:강사:학생 …)
 *  rl          로그인 실패 횟수 (무차별 대입 막기)
 *  backups     문서 전체 백업 (배포 · 초기화 · 복원 · 일회성 작업 전에 자동으로, 최근 40개)
 *  oplog       사용자가 요청한 일회성 데이터 작업을 언제 했는지 (같은 작업을 두 번 하지 않게)
 *
 * 데이터 보존 원칙: 배포할 때 이미 저장된 내용은 지우거나 바꾸지 않는다 (빠진 칸만 채움).
 * 지우기는 강사센터 · 마스터에서 사람이 직접 할 때만. 요청받은 데이터 수정은 oneoff.js 에 한 번만 도는 작업으로.
 *
 * 어느 DB 에 붙는지 (2026-11-05 Turso → Supabase 전환 끝 · Turso 연결 코드는 뺐어요):
 *   Vercel(운영 · 미리보기)  언제나 SUPABASE_DB_URL(Supabase 연결 풀러 · 트랜잭션 모드)의 Postgres — 표 6개를 app 스키마에
 *   로컬 개발 · 시험        CLASS_SQLITE 파일(node:sqlite)이 있으면 그 파일, 없으면 SUPABASE_DB_URL (DB_DRIVER=supabase 면 언제나 Postgres)
 *   Postgres 에서는 같은 SQL 을 조금만 바꿔 써요(pgSql): ? → $1 · 표 이름 → app.표 · 같은 created 끼리는 키를 바이트 순(COLLATE "C",
 *   SQLite 와 같은 순서) · 여러 문장(batch)은 한 트랜잭션(중간에 실패하면 전부 취소). 문서(v)는 글자 그대로(text) — 키 순서 · 공백이 한 글자도 안 바뀌게.
 *   다른 점 하나: LIKE 가 영문 대소문자를 가려요(SQLite 는 안 가림) — 키 앞부분은 모두 코드가 만든 같은 글자라 결과는 같아요.
 * 쓰기 멈춤 (DC_READONLY=1 · 점검 · DB 옮기는 동안): 문서 · 사진 쓰기는 503 ‘잠시 점검 중’ (화면은 변경을 들고 있다가 다시 보내요).
 *   읽기 · 로그인 실패 횟수(rl) · 배포 전 백업(backups) · 작업 기록(oplog)은 그대로 — 점검 중에도 들어가서 확인할 수 있게
 */
"use strict";

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS docs (k TEXT PRIMARY KEY, v TEXT, ver INTEGER NOT NULL DEFAULT 1, updated INTEGER NOT NULL, created INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS docs_updated ON docs(updated)",
  "CREATE TABLE IF NOT EXISTS files (h TEXT PRIMARY KEY, mime TEXT NOT NULL, b64 TEXT NOT NULL, size INTEGER NOT NULL, created INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS file_scopes (h TEXT NOT NULL, scope TEXT NOT NULL, PRIMARY KEY (h, scope))",
  "CREATE TABLE IF NOT EXISTS rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, reason TEXT, docs INTEGER, size INTEGER, data TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS oplog (id TEXT PRIMARY KEY, at INTEGER NOT NULL, note TEXT, result TEXT)"
];

/* 로컬 개발용: Node 22+ 내장 SQLite (같은 SQL) */
function sqliteClient(file) {
  const { DatabaseSync } = require("node:sqlite");
  const d = new DatabaseSync(file);
  const run = (s) => {
    const st = d.prepare(s.sql);
    const args = s.args || [];
    if (/^\s*(select|with|pragma)\b/i.test(s.sql) || /\breturning\b/i.test(s.sql)) return { rows: st.all(...args), affected: 0 };
    const info = st.run(...args);
    return { rows: [], affected: Number(info.changes) || 0 };
  };
  return { kind: "sqlite", batch: async (stmts) => stmts.map(run) };
}

/* ---------------- Postgres (Supabase) ---------------- */
/* 같은 표 6개 — app 스키마 (Supabase 공개 API(anon 키)는 public 스키마만 열어요 · 권한 막기와 보기는 pgsetup.js 가 배포 때) */
const PG_TABLES = ["docs", "files", "file_scopes", "rl", "backups", "oplog"];
const PG_SCHEMA = [
  "CREATE SCHEMA IF NOT EXISTS app",
  "CREATE TABLE IF NOT EXISTS app.docs (k text PRIMARY KEY, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL, kind text GENERATED ALWAYS AS (split_part(k, ':', 1)) STORED)",
  "CREATE INDEX IF NOT EXISTS docs_updated ON app.docs (updated)",
  "CREATE INDEX IF NOT EXISTS docs_k_prefix ON app.docs (k text_pattern_ops)",
  "CREATE INDEX IF NOT EXISTS docs_kind ON app.docs (kind)",
  "CREATE TABLE IF NOT EXISTS app.files (h text PRIMARY KEY, mime text NOT NULL, b64 text NOT NULL, size integer NOT NULL, created bigint NOT NULL)",
  "CREATE TABLE IF NOT EXISTS app.file_scopes (h text NOT NULL, scope text NOT NULL, PRIMARY KEY (h, scope))",
  "CREATE TABLE IF NOT EXISTS app.rl (k text PRIMARY KEY, n integer NOT NULL, until bigint NOT NULL)",
  "CREATE TABLE IF NOT EXISTS app.backups (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, at bigint NOT NULL, reason text, docs integer, size integer, data text NOT NULL)",
  "CREATE TABLE IF NOT EXISTS app.oplog (id text PRIMARY KEY, at bigint NOT NULL, note text, result text)"
];
const PG_TABLE_RE = new RegExp("\\b(FROM|INTO|UPDATE|JOIN)\\s+(" + PG_TABLES.join("|") + ")\\b", "gi");
/** SQLite 문법 SQL → Postgres: ? → $1 …(작은따옴표 글자 안은 그대로) · 표 이름 → app.표 · 같은 created 끼리 키 순서를 바이트 순으로 */
function pgSql(sql) {
  let out = "", n = 0, quoted = false;
  for (const ch of String(sql)) { if (ch === "'") quoted = !quoted; out += !quoted && ch === "?" ? "$" + ++n : ch; }
  return out.replace(PG_TABLE_RE, (m, kw, t) => kw + " app." + t).replace(/\bORDER BY created, k\b/g, 'ORDER BY created, k COLLATE "C"');
}
/** 연결 주소를 로그 · 오류에 남기지 않게 (비밀번호가 들어 있어요) */
const scrub = (s) => String(s || "").replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, "postgres://…");
function pgClient(url) {
  const postgres = require("postgres");
  let host = "";
  try { host = new URL(url).hostname; } catch (e) { throw new Error("SUPABASE_DB_URL 형식이 맞지 않아요 (postgres://… 연결 문자열)"); }
  const local = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/.test(host); // 로컬 시험(PGlite)만 암호화 없이
  const sql = postgres(url, {
    prepare: false, // Supabase 연결 풀러(트랜잭션 모드)는 미리 준비한 문장을 못 써요
    max: Number(process.env.PG_POOL_MAX) || 1, // 서버 함수 하나에 연결 1개 (요청마다 함수가 새로 떠도 연결이 너무 많아지지 않게)
    idle_timeout: 20, connect_timeout: 15,
    ssl: local ? false : "require",
    onnotice: () => {},
    types: { bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) } } // ms 시각 · 개수는 숫자로 (SQLite 와 같게)
  });
  const shape = (r) => ({ rows: Array.from(r, (x) => Object.assign({}, x)), affected: r.command === "SELECT" ? 0 : r.count || 0 });
  const run = async (q, s) => shape(await q.unsafe(pgSql(s.sql), (s.args || []).map((a) => (a === undefined ? null : a))));
  async function batch(stmts) {
    try {
      if (stmts.length === 1) return [await run(sql, stmts[0])];
      return await sql.begin(async (tx) => { const out = []; for (const s of stmts) out.push(await run(tx, s)); return out; });
    } catch (e) { e.message = scrub(e.message); throw e; }
  }
  // 표 만들기는 한 번에(문장 여러 개를 한 왕복으로)
  const init = () => sql.unsafe(PG_SCHEMA.join(";\n")).catch((e) => { e.message = scrub(e.message); throw e; });
  return { kind: "postgres", batch, init, end: () => sql.end({ timeout: 5 }), sql };
}

/* ---------------- 쓰기 멈춤 (DC_READONLY) ---------------- */
const readonly = () => process.env.DC_READONLY === "1";
const isWrite = (sql) => /^\s*(insert|update|delete|replace)\b/i.test(sql);
const RO_OK = /^\s*(insert\s+into|update|delete\s+from)\s+(rl|backups|oplog)\b/i; // 점검 중에도 쓰는 표
function readonlyError() {
  const e = new Error("지금 잠시 점검 중이라 저장하지 못했어요. 10~15분 뒤에 다시 시도해 주세요.");
  e.code = "DC_READONLY"; e.status = 503;
  return e;
}
const isReadonlyError = (e) => !!(e && e.code === "DC_READONLY");

let client = null, ready = null;
function driverName() { return String(process.env.DB_DRIVER || "").trim().toLowerCase(); }
/** 로컬 SQLite 파일을 쓰는지 (Vercel 에서는 언제나 Supabase) */
function usesSqlite() { const d = driverName(); return !process.env.VERCEL && !!process.env.CLASS_SQLITE && d !== "supabase" && d !== "postgres"; }
function getClient() {
  if (client) return client;
  const d = driverName();
  if (d === "turso") throw new Error("Turso 는 2026-11-05 에 뺐어요 — DB_DRIVER 를 지우거나 supabase 로 두세요");
  if (d && d !== "supabase" && d !== "postgres" && d !== "sqlite") throw new Error("DB_DRIVER 값을 모르겠어요: " + d + " (supabase · sqlite)");
  if (usesSqlite()) client = sqliteClient(process.env.CLASS_SQLITE);
  else if (process.env.SUPABASE_DB_URL) client = pgClient(process.env.SUPABASE_DB_URL);
  else throw new Error("데이터베이스 설정이 없어요 — Vercel 환경 변수 SUPABASE_DB_URL (로컬 개발은 CLASS_SQLITE 파일)");
  return client;
}
async function db() {
  const c = getClient();
  if (!ready) ready = (c.init ? c.init() : c.batch(SCHEMA.map((sql) => ({ sql })))).catch((e) => { ready = null; throw e; });
  await ready;
  return c;
}
async function batch(stmts) {
  if (readonly() && stmts.some((s) => isWrite(s.sql) && !RO_OK.test(s.sql))) throw readonlyError();
  return (await db()).batch(stmts);
}
/** SQL 한 문장 (SQLite 문법으로 — Postgres 에서는 pgSql 이 바꿔요) */
async function exec(sql, args) { return (await batch([{ sql, args }]))[0]; }
/** 스크립트 · 빌드가 끝날 때: Postgres 연결 닫기 (안 닫으면 프로세스가 20초 기다려요) */
async function close() { const c = client; client = null; ready = null; if (c && c.end) await c.end(); }
/** Supabase 보안 · 사람이 읽는 보기 (A2 · api/_lib/pgsetup.js) — 지금 저장소가 Postgres 일 때만 · 배포 때 · 여러 번 돌려도 같아요 */
async function pgSetup() {
  const c = await db();
  if (c.kind !== "postgres") return false;
  await c.sql.unsafe(require("./pgsetup").setupSql()).catch((e) => { e.message = scrub(e.message); throw e; });
  return true;
}
/** 따로 여는 연결 — 옮기기 도구(scripts/db-move.js)가 두 DB 를 한꺼번에 열 때 (지금 저장소 · 쓰기 멈춤과 상관없이)
 *  o: { kind: "sqlite", file } · { kind: "postgres", url } → { kind, batch, init, end } (SQL 은 SQLite 문법 그대로) */
function openClient(o) {
  o = o || {};
  const c = o.kind === "postgres" ? pgClient(o.url) : o.kind === "sqlite" ? sqliteClient(o.file) : null;
  if (!c) throw new Error("모르는 DB 종류예요: " + o.kind + " (sqlite · postgres)");
  if (!c.init) c.init = () => c.batch(SCHEMA.map((sql) => ({ sql })));
  if (!c.end) c.end = async () => {};
  return c;
}

/* ---------------- 문서 ---------------- */
const parse = (row) => (row.v == null ? null : JSON.parse(row.v));
async function getDocs(keys) {
  if (!keys.length) return {};
  const out = {};
  const res = await exec("SELECT k, v, ver FROM docs WHERE k IN (" + keys.map(() => "?").join(",") + ")", keys);
  res.rows.forEach((r) => { out[r.k] = { v: parse(r), ver: r.ver }; });
  return out;
}
async function getDoc(k) { return (await getDocs([k]))[k] || null; }
/** 문서 목록 — prefixes 를 주면 그 접두사(예: "stu:moon:")로 시작하는 것만 */
async function listDocs(opts) {
  opts = opts || {};
  const where = [], args = [];
  if (opts.since != null) { where.push("updated > ?"); args.push(opts.since); } else where.push("v IS NOT NULL");
  if (opts.prefixes) {
    where.push("(" + opts.prefixes.map((p) => { if (p.endsWith("%")) { args.push(p); return "k LIKE ?"; } args.push(p); return "k = ?"; }).join(" OR ") + ")");
  }
  const res = await exec("SELECT k, v, ver, created FROM docs WHERE " + where.join(" AND ") + " ORDER BY created, k", args);
  return res.rows.map((r) => ({ k: r.k, v: parse(r), ver: r.ver }));
}
/** 낙관적 잠금으로 쓰기 — 그새 다른 사람이 바꿨으면 false (다시 읽어서 다시 적용) */
async function writeDoc(k, v, prevVer, created) {
  const now = Date.now();
  const json = v == null ? null : JSON.stringify(v);
  if (prevVer == null) {
    const r = await exec("INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, 1, ?, ?) ON CONFLICT(k) DO NOTHING", [k, json, now, created == null ? now : created]);
    return r.affected ? 1 : false;
  }
  const r = await exec("UPDATE docs SET v = ?, ver = ver + 1, updated = ? WHERE k = ? AND ver = ?", [json, now, k, prevVer]);
  return r.affected ? prevVer + 1 : false;
}
async function countDocs() { return (await exec("SELECT COUNT(*) AS n FROM docs WHERE v IS NOT NULL")).rows[0].n; }

/* ---------------- 파일 ---------------- */
async function putFile(h, mime, b64, scope) {
  await batch([
    { sql: "INSERT INTO files (h, mime, b64, size, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(h) DO NOTHING", args: [h, mime, b64, Math.floor(b64.length * 0.75), Date.now()] },
    { sql: "INSERT INTO file_scopes (h, scope) VALUES (?, ?) ON CONFLICT(h, scope) DO NOTHING", args: [h, scope] }
  ]);
}
async function getFile(h) {
  const [f, s] = await batch([
    { sql: "SELECT mime, b64 FROM files WHERE h = ?", args: [h] },
    { sql: "SELECT scope FROM file_scopes WHERE h = ?", args: [h] }
  ]);
  if (!f.rows.length) return null;
  return { mime: f.rows[0].mime, b64: f.rows[0].b64, scopes: s.rows.map((x) => x.scope) };
}

/* ---------------- 로그인 실패 제한 ---------------- */
const RL_WINDOW = 15 * 60 * 1000;
async function rlCheck(keys, limit) {
  const res = await exec("SELECT k, n, until FROM rl WHERE k IN (" + keys.map(() => "?").join(",") + ")", keys);
  const now = Date.now();
  return res.rows.some((r) => r.until > now && r.n >= limit);
}
/** 실패 한 번 기록 — windowMs 를 주면 그 길이로 세요 (기본 15분 · 하루 기준 잠금은 24시간: api/auth.js) */
async function rlFail(keys, windowMs) {
  const now = Date.now(), W = Number(windowMs) > 0 ? Number(windowMs) : RL_WINDOW;
  // 기존 줄의 값은 rl.n · rl.until 로 (Postgres 는 그냥 until 이라고 쓰면 새로 넣는 줄 값과 헷갈린다고 막아요 · SQLite 도 같은 뜻)
  await batch(keys.map((k) => ({
    sql: "INSERT INTO rl (k, n, until) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = CASE WHEN rl.until < ? THEN 1 ELSE rl.n + 1 END, until = CASE WHEN rl.until < ? THEN ? ELSE rl.until END",
    args: [k, now + W, now, now, now + W]
  })));
}
async function rlClear(keys) { await batch(keys.map((k) => ({ sql: "DELETE FROM rl WHERE k = ?", args: [k] }))); }

/* 초기화(마스터) — 문서를 지운다. 사진·첨부(files)는 백업으로 되돌릴 때 필요하니 남겨 둔다 */
async function wipe() { await batch([{ sql: "DELETE FROM docs" }, { sql: "DELETE FROM rl" }]); }

/* ---------------- 백업 ---------------- */
const KEEP_BACKUPS = 40;
async function backup(reason) {
  const rows = (await exec("SELECT k, v, ver, updated, created FROM docs")).rows;
  if (!rows.length) return null;
  const data = JSON.stringify(rows);
  await exec("INSERT INTO backups (at, reason, docs, size, data) VALUES (?, ?, ?, ?, ?)", [Date.now(), String(reason || "").slice(0, 120), rows.length, data.length, data]);
  await exec("DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT " + KEEP_BACKUPS + ")");
  return { docs: rows.length, size: data.length };
}
async function listBackups() { return (await exec("SELECT id, at, reason, docs, size FROM backups ORDER BY id DESC LIMIT " + KEEP_BACKUPS)).rows; }
async function backupRows(id) {
  const r = (await exec("SELECT data FROM backups WHERE id = ?", [Number(id)])).rows[0];
  return r ? JSON.parse(r.data) : null;
}
/** 백업 그대로 문서를 되돌린다 (지금 상태도 먼저 백업) */
async function restoreRows(rows) {
  // 버전은 지금보다 크게 — 되돌리기 전에 열려 있던 화면의 저장이 되돌린 내용을 덮어쓰지 못하게
  const cur = {};
  (await exec("SELECT k, ver FROM docs")).rows.forEach((r) => { cur[r.k] = r.ver; });
  await batch([{ sql: "DELETE FROM docs" }]);
  const now = Date.now();
  const stmts = rows.map((r) => ({ sql: "INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(k) DO NOTHING", args: [r.k, r.v, Math.max(r.ver || 1, cur[r.k] || 0) + 1, now, r.created] }));
  for (let i = 0; i < stmts.length; i += 40) await batch(stmts.slice(i, i + 40));
  return stmts.length;
}

/* ---------------- 일회성 작업 기록 ---------------- */
async function opsDone() { return new Set((await exec("SELECT id FROM oplog")).rows.map((r) => r.id)); }
async function opMark(id, note, result) { await exec("INSERT INTO oplog (id, at, note, result) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING", [id, Date.now(), note || "", JSON.stringify(result || {}).slice(0, 2000)]); }

/* ---------------- 처음 데이터 · 일회성 작업이 쓰는 것 (init.js — 예전엔 거기서 SQL 을 직접 썼어요) ---------------- */
/** 문서 여러 개를 한 번에 넣기 (이미 있는 키는 그대로) — rows: [{ k, v: JSON 글자, created }] */
async function insertDocs(rows) {
  const now = Date.now();
  const stmts = rows.map((r) => ({ sql: "INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, 1, ?, ?) ON CONFLICT(k) DO NOTHING", args: [r.k, r.v, now, r.created] }));
  for (let i = 0; i < stmts.length; i += 40) await batch(stmts.slice(i, i + 40));
  return stmts.length;
}
/** sys 문서(epoch) — 버전 검사 없이 바꾸고, 없으면 맨 앞(created -1)에 만들어요 */
async function putSys(json) {
  const r = await exec("UPDATE docs SET v = ?, ver = ver + 1, updated = ? WHERE k = 'sys'", [json, Date.now()]);
  if (!r.affected) await exec("INSERT INTO docs (k, v, ver, updated, created) VALUES ('sys', ?, 1, ?, -1) ON CONFLICT(k) DO NOTHING", [json, Date.now()]);
}
/** 모든 문서 (지운 것도) — 일회성 작업이 지금 상태를 읽을 때 */
async function allDocRows() { return (await exec("SELECT k, v, ver FROM docs")).rows; }

/* ---------------- 배포 기록용 확인 (DB 전환 A0) ---------------- */
/** 사진 · 첨부 개수와 크기 (읽기만) */
async function fileStats() {
  const r = (await exec("SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS total, COALESCE(MAX(size), 0) AS max FROM files")).rows[0] || {};
  return { n: Number(r.n) || 0, total: Number(r.total) || 0, max: Number(r.max) || 0 };
}
/** Supabase 접속 확인 — 지금 쓰는 DB 와 따로 연결해 버전 · 왕복 시간 · 지역 · 포트 · app 표가 있는지만 봐요 (주소 · 비밀번호는 안 적어요 · 실패해도 빌드는 계속) */
async function pgProbe(url) {
  url = url || process.env.SUPABASE_DB_URL;
  if (!url) return { ok: false, why: "off" };
  let u = null;
  try { u = new URL(url); } catch (e) { return { ok: false, why: "연결 문자열 형식이 맞지 않아요 (postgres://… 로 시작해야 해요)" }; }
  const m = /^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$/i.exec(u.hostname), port = Number(u.port) || 5432;
  // host: 어떤 종류 주소인지 알리는 데만 (프로젝트 주소 · 비밀번호는 기록에 안 적어요)
  const info = { region: m ? m[1] : "", port, pooler: !!m, host: m ? "pooler" : /\.supabase\.co$/i.test(u.hostname) ? "db.supabase.co" : /^(127\.0\.0\.1|localhost)$/.test(u.hostname) ? "local" : "other" };
  let c = null;
  try {
    c = pgClient(url);
    const t0 = Date.now();
    const version = (await c.sql.unsafe("SHOW server_version"))[0].server_version;
    const connectMs = Date.now() - t0, pings = [];
    for (let i = 0; i < 3; i++) { const a = Date.now(); await c.sql.unsafe("SELECT 1"); pings.push(Date.now() - a); }
    const has = (await c.sql.unsafe("SELECT to_regclass('app.docs') IS NOT NULL AS has"))[0].has;
    const docs = has ? Number((await c.sql.unsafe("SELECT COUNT(*) AS n FROM app.docs WHERE v IS NOT NULL"))[0].n) : null;
    return Object.assign(info, { ok: true, version, connectMs, pingMs: Math.min.apply(null, pings), app: !!has, docs });
  } catch (e) {
    const why = scrub((e && e.message) || e).slice(0, 200), hint = pgAuthHint(u, why, !!m);
    return Object.assign(info, { ok: false, why }, hint ? { hint } : {});
  } finally { if (c) await c.end().catch(() => {}); }
}
/** 비밀번호 · 아이디가 틀렸다고 나올 때 무엇을 고치면 되는지 — 모양만 보고 알려요 (비밀번호 · 아이디 글자는 안 적어요) */
function pgAuthHint(u, why, pooler) {
  if (!/password authentication failed|tenant or user not found/i.test(why)) return "";
  let user = "", pw = null;
  try { user = decodeURIComponent(u.username || ""); } catch (e) { /* 아래에서 모양으로 알려요 */ }
  try { pw = decodeURIComponent(u.password || ""); } catch (e) { pw = null; }
  const out = [];
  if (pooler && !/^postgres\.[a-z0-9]{10,}$/i.test(user)) out.push("아이디가 postgres.<프로젝트 아이디> 모양이 아니에요 — Connect › Transaction pooler 주소를 그대로 복사해 주세요");
  if (pw === null) out.push("비밀번호에 % 가 있어 주소가 깨져요 — 비밀번호를 영문 · 숫자로 다시 정해 주세요");
  else if (!pw) out.push("비밀번호 칸이 비어 있어요");
  else if (/YOUR[-_ ]?PASSWORD/i.test(pw)) out.push("비밀번호 자리에 [YOUR-PASSWORD] 글자가 그대로 있어요 — DB 비밀번호로 바꿔 주세요");
  else if (/^\[.*\]$/.test(pw)) out.push("비밀번호 앞뒤의 대괄호 [ ] 까지 들어가 있어요 — 괄호는 지워 주세요");
  else if (/^\s|\s$/.test(pw)) out.push("비밀번호 앞뒤에 빈칸이 있어요");
  if (!out.length) out.push("주소 모양은 맞아요 — 비밀번호가 이 프로젝트 것이 아니거나 틀렸어요. Supabase › Project Settings › Database › Reset database password 로 영문 · 숫자 비밀번호를 새로 정해 넣어 주세요 (새 비밀번호는 몇 분 뒤 풀러에 반영돼요)");
  return out.join(" · ");
}

module.exports = {
  exec, batch, getDoc, getDocs, listDocs, writeDoc, countDocs, putFile, getFile, rlCheck, rlFail, rlClear, wipe, backup, listBackups, backupRows, restoreRows, opsDone, opMark,
  insertDocs, putSys, allDocRows, fileStats, pgProbe, pgAuthHint, pgSetup, close, openClient, readonly, isReadonlyError, pgSql, PG_SCHEMA, PG_TABLES,
  kind: () => getClient().kind
};
