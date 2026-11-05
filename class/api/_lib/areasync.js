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

module.exports = { check, sync, status, syncTable };
