/* DB 전환 2부 B2~B6 — 배포 때 영역 표 맞추기 · 비교 (scripts/db-build.js · scripts/areas.js)
 *
 *  스위치(DB_AREAS)가 켜진 영역마다:
 *   1) 칸 건너뛰기 막기 — 지난 배포의 칸(area_state 표)에서 한 칸씩만 (off ↔ dual ↔ table ↔ only)
 *   2) 맞추기 — 문서마다 docs 와 제 표를 비교해 버전이 더 높은 쪽으로 채워요 (없는 쪽은 복사).
 *      버전이 같은데 내용이 다르면 고치지 않고 멈춰요 (사람이 봐야 해요)
 *   3) 열 · 자식 표 다시 — 코드가 바뀌어 꺼내는 값이 달라졌으면 v 에서 다시 만들어요 (v · 버전 · 시각은 그대로)
 *   4) only 면 docs 의 그 문서를 지워요 (맞춘 뒤 · 배포 전 백업이 먼저 남아 있어요)
 *   5) 비교 — dual · table: 두 곳의 문서 수 · 글자 · 버전이 하나도 안 다른지 / only: docs 에 남은 게 없는지 / 열 · 자식 표가 v 와 같은지
 *  write: false 면 고치지 않고 비교만 (미리보기 · 쓰기 멈춤 중) */
"use strict";
const store = require("./store");
const AR = require("./areas");

const N = (x) => (x == null ? null : Number(x));
const CH = 20;

async function stateMap() {
  const out = {};
  (await store.exec("SELECT id, mode, at FROM area_state")).rows.forEach((r) => { out[r.id] = { mode: r.mode, at: N(r.at) }; });
  return out;
}
/** 1) 칸 건너뛰기 — 문제 목록 (빈 목록이면 괜찮아요) */
async function check(opts) {
  opts = opts || {};
  const want = AR.modes(), st = await stateMap(), bad = [];
  AR.AREA_IDS.forEach((a) => {
    const prev = (st[a] && st[a].mode) || "off", now = want[a];
    if (Math.abs(AR.ORDER.indexOf(now) - AR.ORDER.indexOf(prev)) > 1 && !opts.force) bad.push(a + " 는 지난 배포가 " + prev + " 이라 " + now + " 로 바로 갈 수 없어요 — 한 칸씩 (" + AR.ORDER.join(" ↔ ") + ")");
  });
  return { ok: !bad.length, bad, state: st, want };
}

async function sides(t) {
  const kc = AR.keyCond(t);
  const docs = new Map((await store.exec("SELECT k, v, ver, updated, created FROM docs WHERE " + kc.sql, kc.args)).rows.map((r) => [r.k, r]));
  const tab = new Map((await store.exec("SELECT * FROM " + t.table)).rows.map((r) => [r.k, r]));
  const kids = {};
  for (const c of t.children || []) { kids[c.table] = new Map(); (await store.exec("SELECT k, COUNT(*) AS n FROM " + c.table + " GROUP BY k")).rows.forEach((r) => kids[c.table].set(r.k, N(r.n))); }
  return { docs, tab, kids };
}
const same = (a, b) => N(a.ver) === N(b.ver) && (a.v == null ? null : String(a.v)) === (b.v == null ? null : String(b.v)) && N(a.created) === N(b.created);
async function run(stmts) { for (let i = 0; i < stmts.length; i += CH) await store.batch(stmts.slice(i, i + CH)); }

/** 표 하나 맞추기 · 비교 → { table, mode, docs, tab, toTab, toDocs, refreshed, removed, bad: [] } */
async function syncTable(t, mode, write, kind) {
  const r = { table: t.table, label: t.label, mode, docs: 0, tab: 0, toTab: 0, toDocs: 0, refreshed: 0, removed: 0, kids: 0, bad: [] };
  let S = await sides(t);
  r.docs = S.docs.size; r.tab = S.tab.size;
  if (mode === "off") return r; // 꺼진 영역: 제 표는 손대지 않아요 (다음에 켤 때 버전이 높은 docs 로 다시 채워요)
  const stmts = [], keepDocs = mode !== "only";
  new Set([...S.docs.keys(), ...S.tab.keys()]).forEach((k) => {
    const d = S.docs.get(k), x = S.tab.get(k);
    if (d && (!x || N(d.ver) > N(x.ver))) { stmts.push.apply(stmts, AR.tableStmts(t, d, kind)); r.toTab++; return; }
    if (x && keepDocs && (!d || N(x.ver) > N(d.ver))) { stmts.push(AR.docsUpsert(x)); r.toDocs++; return; }
    if (d && x && N(d.ver) === N(x.ver) && !same(d, x)) r.bad.push(k + " (버전 " + N(d.ver) + " 은 같은데 내용이 달라요)");
  });
  // 열 · 자식 표가 v 와 다르면 다시 (이미 위에서 다시 쓴 문서는 빼고)
  S.tab.forEach((x, k) => {
    const d = S.docs.get(k); if (d && N(d.ver) > N(x.ver)) return;
    const kidsOff = (t.children || []).some((c) => (S.kids[c.table].get(k) || 0) !== AR.childRows(c, x.v == null ? null : safeParse(x.v), k).length);
    if (AR.colDiff(t, x, kind).length || kidsOff) { stmts.push.apply(stmts, AR.tableStmts(t, x, kind)); r.refreshed++; }
  });
  if (r.bad.length) return r;
  if (write) {
    await run(stmts);
    if (mode === "only" && S.docs.size) { const kc = AR.keyCond(t); r.removed = (await store.exec("DELETE FROM docs WHERE " + kc.sql, kc.args)).affected; }
  } else if (stmts.length || (mode === "only" && S.docs.size)) {
    r.bad.push("맞추지 않았어요(비교만): 표로 " + r.toTab + " · docs 로 " + r.toDocs + " · 열 다시 " + r.refreshed + (mode === "only" ? " · docs 에 남은 " + S.docs.size : ""));
    return r;
  }
  // 5) 비교
  S = await sides(t);
  r.docs = S.docs.size; r.tab = S.tab.size;
  if (mode === "only") { if (S.docs.size) r.bad.push("docs 에 " + S.docs.size + "개가 남아 있어요"); }
  else {
    S.docs.forEach((d, k) => { const x = S.tab.get(k); if (!x) r.bad.push(k + " (표에 없어요)"); else if (!same(d, x)) r.bad.push(k + " (다름)"); });
    S.tab.forEach((x, k) => { if (!S.docs.has(k)) r.bad.push(k + " (docs 에 없어요)"); });
  }
  S.tab.forEach((x, k) => {
    const cd = AR.colDiff(t, x, kind); if (cd.length) r.bad.push(k + " (열이 v 와 달라요: " + cd.slice(0, 3).join(", ") + ")");
    (t.children || []).forEach((c) => { const want = AR.childRows(c, x.v == null ? null : safeParse(x.v), k).length, got = S.kids[c.table].get(k) || 0; r.kids += got; if (want !== got) r.bad.push(k + " (" + c.table + " " + got + "/" + want + "줄)"); });
  });
  return r;
}
function safeParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

/** 전부 — opts: { write, force } → { ok, check, tables: [...], lines: [...] } */
async function sync(opts) {
  opts = opts || {};
  const ch = await check(opts), lines = [];
  if (!ch.ok) return { ok: false, check: ch, tables: [], lines: ch.bad.map((b) => "2부 영역: " + b) };
  const kind = (await store.db()).kind, tables = [];
  for (const a of AR.AREAS) {
    const mode = ch.want[a.id], prev = (ch.state[a.id] && ch.state[a.id].mode) || "off";
    const ts = AR.TABLES.filter((t) => t.area === a.id), rs = [];
    for (const t of ts) rs.push(await syncTable(t, mode, !!opts.write, kind));
    tables.push.apply(tables, rs);
    if (mode === "off" && prev === "off") continue;
    const bad = rs.reduce((n, r) => n + r.bad.length, 0);
    lines.push("2부 " + a.id + " " + a.name + ": " + mode + (prev !== mode ? " (지난 배포 " + prev + ")" : "") + " · " + rs.map((r) => r.table + " " + (mode === "only" ? "표 " + r.tab : "docs " + r.docs + " = 표 " + r.tab) + (r.kids ? " (한 건씩 " + r.kids + "줄)" : "") + (r.toTab || r.toDocs || r.refreshed || r.removed ? " [표로 " + r.toTab + " · docs 로 " + r.toDocs + " · 열 다시 " + r.refreshed + (r.removed ? " · docs 에서 지움 " + r.removed : "") + "]" : "")).join(" · ") + (bad ? " · 문제 " + bad + "개: " + rs.reduce((a2, r) => a2.concat(r.bad), []).slice(0, 4).join(", ") : " · 맞음"));
  }
  const ok = tables.every((r) => !r.bad.length);
  if (ok && opts.write) {
    const now = Date.now();
    await run(AR.AREA_IDS.filter((a) => ((ch.state[a] && ch.state[a].mode) || "off") !== ch.want[a] || ch.state[a]).map((a) => ({ sql: "INSERT INTO area_state (id, mode, at, note) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET mode = excluded.mode, at = excluded.at, note = excluded.note", args: [a, ch.want[a], now, "배포 " + (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)] })));
  }
  return { ok, check: ch, tables, lines };
}

/** 지금 상태 (읽기만) — scripts/areas.js status */
async function status() {
  const st = await stateMap(), want = AR.modes(), out = [];
  for (const t of AR.TABLES) { const S = await sides(t); out.push({ area: t.area, table: t.table, mode: want[t.area], last: (st[t.area] && st[t.area].mode) || "off", docs: S.docs.size, tab: S.tab.size }); }
  return out;
}

/* ---------- 표 모양 (2026-11-06) ----------
 *  예전 모양(k · v(JSON) · ver · updated · created · 꺼낸 값 · 시각은 ms 숫자)의 표를 지금 모양(k · 꺼낸 값 · 시각은 한국 시간 · 맨 뒤에 v …)으로 다시 만들어요.
 *  표마다 한 트랜잭션: 잠그고 → 줄(k · v · ver · updated · created)을 읽고 → 지우고 → 새로 만들고 → 같은 줄을 다시 (꺼낸 값 · 한 건씩 표는 v 에서 다시)
 *  중간에 실패하면 그 표는 예전 그대로예요 (Postgres 는 표 만들기 · 지우기도 트랜잭션 안). 문서 글자 · 버전 · 시각은 한 글자도 안 바뀌어요 */
async function columnsOf(kind) {
  const out = {};
  if (kind === "postgres") {
    (await store.exec("SELECT table_name AS t, column_name AS c, data_type AS ty FROM information_schema.columns WHERE table_schema = 'app' ORDER BY table_name, ordinal_position")).rows
      .forEach((r) => { (out[r.t] = out[r.t] || []).push([r.c, r.ty]); });
    return out;
  }
  for (const n of AR.TABLES.map((t) => t.table).concat(AR.CHILDREN.map((c) => c.table))) out[n] = (await store.exec("SELECT name AS c, type AS ty FROM pragma_table_info(?)", [n])).rows.map((r) => [r.c, String(r.ty).toUpperCase()]);
  return out;
}
const want = (cols, kind) => cols.map(([n, ty]) => [n, kind === "postgres" ? AR.PG_INFO[ty] || ty : ty]);
const sameCols = (a, b) => !!a && a.length === b.length && a.every((x, i) => x[0] === b[i][0] && x[1] === b[i][1]);
/** 모양이 예전인 표(자식 표 포함) → [{ table, why }] */
async function oldTables(kind) {
  const cols = await columnsOf(kind), out = [];
  AR.TABLES.forEach((t) => {
    const bad = [[t.table, AR.layout(t, kind)]].concat((t.children || []).map((c) => [c.table, AR.childLayout(c, kind)])).filter(([n, l]) => !sameCols(cols[n], want(l, kind)));
    if (bad.length) out.push({ table: t.table, t, why: bad.map(([n]) => n).join(" · ") });
  });
  return out;
}
/** 예전 모양 표 다시 만들기 → { rebuilt: [{ table, rows }], lines } (write: false 면 찾기만) */
async function rebuild(opts) {
  opts = opts || {};
  const c = await store.db(), kind = c.kind, ddlKind = kind === "postgres" ? "pg" : "sqlite";
  const old = await oldTables(kind), rebuilt = [];
  if (!opts.write) return { rebuilt, old: old.map((o) => o.table), lines: old.length ? ["2부 표 모양: 예전 모양 " + old.length + "개 (" + old.map((o) => o.table).join(" · ") + ") — 운영 · 시험용 배포 때 내용 그대로 다시 만들어요"] : [] };
  for (const o of old) {
    const n = await c.tx(async (run) => {
      if (kind === "postgres") await run({ sql: "LOCK TABLE app." + o.table + " IN ACCESS EXCLUSIVE MODE" });
      const rows = (await run({ sql: "SELECT k, v, ver, updated, created FROM " + o.table })).rows;
      for (const s of AR.tableDrop(o.t, ddlKind)) await run({ sql: s });
      for (const s of AR.tableDDL(o.t, ddlKind)) await run({ sql: s });
      for (const r of rows) for (const s of AR.tableStmts(o.t, r, kind)) await run(s);
      return rows.length;
    });
    rebuilt.push({ table: o.table, rows: n });
  }
  const still = await oldTables(kind);
  return { rebuilt, still: still.map((x) => x.table), lines: rebuilt.length ? ["2부 표 모양 바꿈 (꺼낸 값 먼저 · 시각은 한국 시간 · 문서 JSON(v)은 맨 오른쪽): " + rebuilt.map((x) => x.table + " " + x.rows + "줄").join(" · ") + (still.length ? " · 아직 예전 모양: " + still.map((x) => x.table).join(", ") : " · 모두 새 모양")] : [] };
}

module.exports = { check, sync, status, syncTable, rebuild, oldTables };
