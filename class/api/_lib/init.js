/* 처음 데이터 넣기 · 초기화 · 정리 */
"use strict";
const store = require("./store");
const seed = require("./seed");
const { extractFiles } = require("./ops");
const access = require("./access");
const oneoff = require("./oneoff");

/** 문서들을 한 번에 넣는다 (이미 있는 키는 건너뜀). order 는 화면 순서(created) */
async function insertAll(map) {
  const rows = [], files = [];
  Object.keys(map).forEach((k, i) => {
    const v0 = JSON.parse(JSON.stringify(map[k]));
    const ex = extractFiles(v0, (p) => access.fileScope(k, p, v0));
    ex.files.forEach((f) => files.push(f));
    rows.push({ k, v: JSON.stringify(ex.value), created: i });
  });
  const n = await store.insertDocs(rows);
  for (const f of files) await store.putFile(f.h, f.mime, f.b64, f.scope);
  return n;
}
async function setEpoch() {
  const v = { epoch: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) };
  await store.putSys(JSON.stringify(v));
  return v.epoch;
}
/** 비어 있으면 체험 데이터로 시작 */
async function ensureSeeded() {
  if ((await store.countDocs()) > 0) return false;
  await insertAll(seed.seedDocs());
  await setEpoch();
  return true;
}
/* 수강생 진도는 되돌리지 않아요 (2026-11-26 · 3기 수강생 진도가 또 줄어든 일 뒤로): 백업 되돌리기 · 백업 파일 불러오기를 해도
 * 지금 진행 기록(prog)의 과제 제출 · 질문 · 대화 · 읽음 등은 그대로 두고 백업 쪽 기록을 더해요(DR.progUnion) — 백업 뒤에 낸 과제가 사라지지 않게.
 * 지금은 있는데 백업에는 없는 진행 기록도 그대로 남겨요. ‘처음 상태로’(시험용 DB 초기화)는 예전처럼 모두 지워요 */
const DR = require("../../shared/data-rules");
async function currentProg() {
  const out = {};
  (await store.listDocs({ prefixes: ["prog:%"] })).forEach((r) => { if (r.v && typeof r.v === "object") out[r.k] = r.v; });
  return out;
}
/** 마스터: 처음 상태로 / 백업 파일로 되돌리기 (지금 상태를 먼저 서버 백업에 남긴다) — keepProg: 지금 진행 기록을 합쳐 남김 */
async function replaceAll(map, reason, keepProg) {
  const cur = keepProg ? await currentProg() : {};
  await store.backup(reason || "초기화 전 자동 백업");
  if (keepProg) {
    map = Object.assign({}, map);
    Object.keys(cur).forEach((k) => { map[k] = map[k] && typeof map[k] === "object" ? DR.progUnion(cur[k], map[k]) : cur[k]; });
    await store.logEvent("restore", reason || "불러오기", { keptProg: Object.keys(cur).length });
  }
  await store.wipe();
  const n = await insertAll(map);
  await setEpoch();
  return n;
}
/** 서버 백업으로 되돌리기 (지금 상태도 먼저 백업) — 진행 기록은 지금 것 위에 백업 것을 더해요 */
async function restoreBackup(id) {
  const rows = await store.backupRows(id);
  if (!rows) return null;
  const cur = await currentProg();
  await store.backup("백업 #" + id + " 되돌리기 전 자동 백업");
  const inB = new Set(), out = rows.map((r) => {
    const k = String(r.k); inB.add(k);
    if (k.indexOf("prog:") !== 0 || !cur[k]) return r;
    const bv = r.v == null ? null : typeof r.v === "string" ? JSON.parse(r.v) : r.v;
    const v = DR.progUnion(cur[k], bv && typeof bv === "object" ? bv : {});
    return Object.assign({}, r, { v: JSON.stringify(v) }); // 백업 줄의 v 는 JSON 글자 (restoreRows · 영역 표가 JSON.parse)
  });
  Object.keys(cur).forEach((k) => { if (!inB.has(k)) out.push({ k, v: JSON.stringify(cur[k]), ver: 1, created: Date.now() }); });
  const n = await store.restoreRows(out);
  await store.logEvent("restore", "백업 #" + id + " 되돌리기 (진행 기록은 지금 것 그대로 + 백업 것 더함)", { keptProg: Object.keys(cur).length });
  await setEpoch();
  return n;
}
/** 배포할 때: 아직 안 한 일회성 작업(oneoff.js)을 한 번씩 실행 */
async function runPendingOps(log) {
  const done = await store.opsDone();
  // when(): 아직 할 수 없는 작업(예: 환경 변수를 기다리는 작업)은 대기 목록에서 빼요 — 기록도 안 해서 조건이 맞는 배포 때 돌아요
  const pending = oneoff.OPS.filter((op) => !done.has(op.id) && (!op.when || op.when()));
  if (!pending.length) return [];
  const rows = await store.allDocRows();
  const cur = {}, ver = {}, upd = {}, crt = {};
  rows.forEach((r) => { cur[r.k] = r.v == null ? null : JSON.parse(r.v); ver[r.k] = r.ver; upd[r.k] = Number(r.updated) || 0; crt[r.k] = Number(r.created) || 0; });
  // 작업에 넘기는 도구 (2026-11-25): 문서를 마지막으로 바꾼 시각 · 배포 전 백업(since 이후 · prefixes 로 시작하는 문서만) — 복구 작업용
  const ctx = {
    updated: (k) => upd[k] || 0,
    row: (k) => ({ ver: ver[k] || 0, updated: upd[k] || 0, created: crt[k] || 0, gone: k in cur && cur[k] == null }),
    backups: async (since, prefixes) => {
      const out = [];
      for (const b of await store.listBackups()) {
        if (Number(b.at) < (Number(since) || 0)) continue;
        const docs = {};
        ((await store.backupRows(b.id)) || []).forEach((r) => { if (!prefixes || prefixes.some((p) => String(r.k).indexOf(p) === 0)) docs[r.k] = r.v == null ? null : typeof r.v === "string" ? JSON.parse(r.v) : r.v; });
        out.push({ id: Number(b.id), at: Number(b.at), reason: String(b.reason || ""), docs });
      }
      return out.sort((x, y) => x.at - y.at);
    },
    // 서버 사건 기록 (2026-11-26 · store.logEvent) — 점검 작업이 빌드 기록에 보여 줘요
    events: (since, kind) => store.listEvents(since, kind),
  };
  const get = (k) => (cur[k] == null ? cur[k] : JSON.parse(JSON.stringify(cur[k])));
  const keys = (prefix) => Object.keys(cur).filter((k) => k.indexOf(prefix) === 0).sort();
  const ran = [];
  for (const op of pending) {
    const { writes, result, retry } = await op.run(get, keys, ctx);
    let ok = true;
    for (const k of Object.keys(writes)) {
      let v = writes[k];
      if (v != null) {
        const v0 = v;
        const ex = extractFiles(v, (p) => access.fileScope(k, p, v0));
        for (const f of ex.files) await store.putFile(f.h, f.mime, f.b64, f.scope);
        v = ex.value;
      }
      if (v == null && cur[k] == null) continue;
      const nv = await store.writeDoc(k, v, ver[k] == null ? null : ver[k]);
      if (nv === false) { ok = false; continue; }
      cur[k] = v; ver[k] = nv;
    }
    // 겹친 변경이 있으면 기록하지 않아 다음 배포 때 다시 시도한다 (작업은 여러 번 돌아도 결과가 같게 짜여 있음)
    // retry: 아직 할 수 없는 작업(예: 환경 변수를 기다리는 작업)은 기록하지 않고 다음 배포 때 다시
    if (ok && !retry) await store.opMark(op.id, op.note, result);
    ran.push({ id: op.id, note: op.note, ok, result, writes: Object.keys(writes).length });
    if (log) log(op, ok, result, Object.keys(writes).length);
  }
  return ran;
}
/** 배포할 때: 지금 데이터에 새 기본값을 적용 — 빠진 칸만 채우고 저장된 내용은 바꾸지 않는다 */
async function migrate() {
  const rows = await store.listDocs({});
  const docs = rows.filter((r) => r.k !== "sys");
  if (!docs.length) return { changed: [] };
  const changed = seed.migrateDocs(docs);
  const ver = {};
  rows.forEach((r) => { ver[r.k] = r.ver; });
  const done = [];
  for (const k of Object.keys(changed)) {
    const v0 = changed[k];
    const ex = extractFiles(v0, (p) => access.fileScope(k, p, v0));
    for (const f of ex.files) await store.putFile(f.h, f.mime, f.b64, f.scope);
    const ok = await store.writeDoc(k, ex.value, ver[k] == null ? null : ver[k]);
    done.push(k + (ok === false ? " (다른 변경과 겹쳐 건너뜀)" : ""));
  }
  return { changed: done };
}

module.exports = { ensureSeeded, replaceAll, restoreBackup, runPendingOps, migrate, insertAll, setEpoch };
