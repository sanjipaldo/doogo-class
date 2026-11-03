/* 처음 데이터와 데이터 정리(마이그레이션) — 화면 db.js 와 같은 규칙(공용 모듈 shared/data-rules.js)으로 만든다.
 * (Next.js 전환 2단계 · 2026-11: 예전에는 화면 파일 db.js 를 서버에서 통째로 돌렸어요. 이제 규칙만 공용 모듈에 두고 서버는 그것만 써요.
 *  처음 데이터 data.js 는 데이터 파일이라 그대로 읽어요) */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const DR = require("../../shared/data-rules");

const ROOT = path.join(__dirname, "..", "..");
const COLLS = ["instructors", "content", "cohorts", "students"];
const KEY_DB = "moonclass:db:v2", KEY_PROGRESS = DR.KEY_PROGRESS;
// 서버가 읽는 화면 쪽 파일: 처음 데이터(data.js)만 — 규칙은 공용 모듈 (배포 함수에 함께 싣는 목록은 next.config.js INCLUDE)
const CLIENT_FILES = ["data.js"];

/** 처음 데이터 (data.js 의 CLASS_SEED) — 부를 때마다 새로 읽어요 (규칙이 처음 데이터를 고쳐 써도 다음에 영향 없게) */
function loadSeed() {
  const sb = {}; sb.window = sb;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"), sb, { filename: "data.js" });
  return sb.CLASS_SEED;
}
/** 화면 db.js 의 load() 와 같은 순서로 규칙을 돌려요 (서버 데이터 모드가 아닌 · 브라우저가 아닌 곳) — 저장소는 메모리 → { data, ls } */
function runRules(initial) {
  const ls = new Map(Object.entries(initial || {}));
  const get = (k, fb) => { try { const v = ls.has(k) ? ls.get(k) : null; return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const set = (k, v) => { try { ls.set(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const seed = loadSeed();
  let db = null;
  const X = DR.make({ db: () => db, setDb: (v) => { db = v; }, seed: () => seed, save: () => set(KEY_DB, db), remote: () => false, storeGet: get, storeSet: set });
  X.loadLocal(get(KEY_DB, null));
  return { data: db, ls };
}

/** 데이터 한 덩어리 → 문서들 { 키: 값 } */
function split(db, progress) {
  const out = {};
  const meta = {};
  Object.keys(db).forEach((k) => { if (COLLS.indexOf(k) === -1) meta[k] = db[k]; });
  out.meta = meta;
  (db.instructors || []).forEach((i) => { out["ins:" + i.id] = i; });
  Object.keys(db.content || {}).forEach((iid) => { out["content:" + iid] = db.content[iid]; });
  const byIns = {};
  (db.cohorts || []).forEach((c) => { (byIns[c.instructorId] = byIns[c.instructorId] || []).push(c); });
  Object.keys(byIns).forEach((iid) => { out["cohorts:" + iid] = byIns[iid]; });
  const sIns = {};
  (db.students || []).forEach((s) => { sIns[s.id] = s.instructorId; out["stu:" + s.instructorId + ":" + s.id] = s; });
  Object.keys(progress || {}).forEach((sid) => { if (sIns[sid]) out["prog:" + sIns[sid] + ":" + sid] = progress[sid]; });
  return out;
}
/** 문서들(순서대로) → 데이터 한 덩어리 + 진행 기록 */
function assemble(docs) {
  const db = { instructors: [], content: {}, cohorts: [], students: [] };
  const progress = {};
  docs.forEach(({ k, v }) => {
    if (v == null) return;
    const p = k.split(":");
    if (k === "meta") Object.assign(db, v, { instructors: db.instructors, content: db.content, cohorts: db.cohorts, students: db.students });
    else if (p[0] === "ins") db.instructors.push(v);
    else if (p[0] === "content") db.content[p[1]] = v;
    else if (p[0] === "cohorts") db.cohorts.push(...v);
    else if (p[0] === "stu") db.students.push(v);
    else if (p[0] === "prog") progress[p[2]] = v;
  });
  return { db, progress };
}

/** 처음 상태 (체험 데이터) */
function seedDocs() {
  const { data, ls } = runRules({});
  const progress = {};
  ls.forEach((v, k) => { if (k.indexOf(KEY_PROGRESS) === 0) progress[k.slice(KEY_PROGRESS.length)] = JSON.parse(v); });
  return split(JSON.parse(JSON.stringify(data)), progress);
}

/** 빠진 칸만 채운다 — 이미 있는 값은 절대 바꾸거나 지우지 않는다.
 *  객체: 없는 키만 더함 · 배열: 있는 항목(id 로 찾음)의 빠진 칸만 채우고 항목을 더하거나 빼지 않음 */
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
function fillMissing(before, after) {
  if (before === undefined) return after;
  if (isObj(before) && isObj(after)) {
    const out = Object.assign({}, before);
    Object.keys(after).forEach((k) => { out[k] = fillMissing(before[k], after[k]); });
    return out;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const byId = {};
    after.forEach((x) => { if (isObj(x) && x.id != null) byId[x.id] = x; });
    return before.map((x) => (isObj(x) && x.id != null && byId[x.id] ? fillMissing(x, byId[x.id]) : x));
  }
  return before;
}

/** 지금 데이터에 db.js 의 정리(새 기본값)를 적용 → 빠진 칸이 채워진 문서만 { 키: 값 }
 *  저장된 내용은 그대로 두고 새로 생긴 칸만 더한다. 새 문서를 만들거나 지우지도 않는다
 *  (데이터를 바꿔야 하는 요청은 oneoff.js 의 일회성 작업으로) */
function migrateDocs(docs) {
  const { db, progress } = assemble(docs);
  if (db.version !== 3 || !db.instructors.length) throw new Error("데이터 형식이 예상과 달라 정리를 건너뜁니다");
  const init = { [KEY_DB]: JSON.stringify(db) };
  Object.keys(progress).forEach((sid) => { init[KEY_PROGRESS + sid] = JSON.stringify(progress[sid]); });
  const { data, ls } = runRules(init);
  const after = JSON.parse(JSON.stringify(data));
  const prog = {};
  ls.forEach((v, k) => { if (k.indexOf(KEY_PROGRESS) === 0) prog[k.slice(KEY_PROGRESS.length)] = JSON.parse(v); });
  const next = split(after, prog);
  const changed = {};
  docs.forEach(({ k, v }) => {
    if (v == null || next[k] === undefined) return;
    const merged = fillMissing(v, next[k]);
    if (JSON.stringify(merged) !== JSON.stringify(v)) changed[k] = merged;
  });
  return changed;
}

module.exports = { seedDocs, migrateDocs, fillMissing, split, assemble, CLIENT_FILES };
