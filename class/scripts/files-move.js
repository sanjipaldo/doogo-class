/* 사진 · 첨부 옮기기 (DB 전환 2부 B1 · 2026-11-05) — 지금 DB 의 파일 내용(files.b64)을 Supabase Storage 비공개 버킷으로, 또는 되돌리기
 *
 *  to-storage  b64 가 차 있는 파일 → Storage 에 올리고 → 다시 받아 바이트가 같은지 확인 → 같을 때만 DB 의 b64 를 '' 로 (‘Storage 에 있어요’)
 *  to-db       Storage 에 있는 파일(b64 '') → 받아서 DB 의 b64 에 다시 (되돌리기 · Storage 쪽 내용은 남겨 둬요)
 *  verify      옮기지 않고 확인만 — Storage 표시 파일이 모두 Storage 에 있고 크기가 맞는지
 *  하나라도 맞지 않으면 그 파일은 그대로 두고 실패로 알려요 (배포 때는 빌드가 멈춰요). 목록 · 볼 수 있는 범위(file_scopes)는 손대지 않아요.
 *
 *  배포 때: Vercel 환경 변수 FILES_MOVE=to-storage | to-db | verify 를 넣고 배포 → 빌드 단계(db-build.js)가 옮기고 확인 (끝나면 FILES_MOVE 는 지워요)
 *  로컬: node scripts/files-move.js <to-storage|to-db|verify>  (CLASS_SQLITE 또는 SUPABASE_DB_URL · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY) */
"use strict";
const store = require("../api/_lib/store");
const blob = require("../api/_lib/blob");

const sizeOf = (b64) => Math.floor(String(b64 || "").length * 0.75);

async function toStorage() {
  if (!blob.configured()) throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 없어요");
  const list = (await store.exec("SELECT h, mime FROM files WHERE b64 <> '' ORDER BY h")).rows, bad = [];
  let moved = 0, bytes = 0;
  for (const f of list) {
    const row = (await store.exec("SELECT b64 FROM files WHERE h = ?", [f.h])).rows[0];
    if (!row || !row.b64) continue;
    const buf = Buffer.from(row.b64, "base64");
    await blob.put(f.h, f.mime, buf);
    const back = await blob.get(f.h);
    if (!back || !back.equals(buf)) { bad.push(f.h.slice(0, 10) + " (Storage 에서 받은 내용이 달라요)"); continue; }
    // 그 사이에 내용이 바뀌지 않았을 때만 (같은 b64) 표시를 바꿔요
    const u = await store.exec("UPDATE files SET b64 = '' WHERE h = ? AND b64 = ?", [f.h, row.b64]);
    if (u.affected) { moved++; bytes += buf.length; }
  }
  return { mode: "to-storage", total: list.length, moved, bytes, bad };
}

async function toDb() {
  if (!blob.configured()) throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 없어요");
  const list = (await store.exec("SELECT h, size FROM files WHERE b64 = '' ORDER BY h")).rows, bad = [];
  let moved = 0, bytes = 0;
  for (const f of list) {
    const buf = await blob.get(f.h);
    if (!buf) { bad.push(f.h.slice(0, 10) + " (Storage 에 없어요)"); continue; }
    if (Number(f.size) && Math.abs(buf.length - Number(f.size)) > 2) { bad.push(f.h.slice(0, 10) + " (크기가 달라요)"); continue; }
    const u = await store.exec("UPDATE files SET b64 = ? WHERE h = ? AND b64 = ''", [buf.toString("base64"), f.h]);
    if (u.affected) { moved++; bytes += buf.length; }
  }
  return { mode: "to-db", total: list.length, moved, bytes, bad };
}

async function verify() {
  const rows = (await store.exec("SELECT h, size, CASE WHEN b64 = '' THEN 1 ELSE 0 END AS st FROM files ORDER BY h")).rows, bad = [];
  let inDb = 0, inStorage = 0;
  for (const f of rows) {
    if (!Number(f.st)) { inDb++; continue; }
    inStorage++;
    if (!blob.configured()) { bad.push(f.h.slice(0, 10) + " (Storage 설정이 없어요)"); continue; }
    const buf = await blob.get(f.h);
    if (!buf) bad.push(f.h.slice(0, 10) + " (Storage 에 없어요)");
    else if (Number(f.size) && Math.abs(buf.length - Number(f.size)) > 2) bad.push(f.h.slice(0, 10) + " (크기가 달라요)");
  }
  return { mode: "verify", total: rows.length, inDb, inStorage, bad };
}

/** 배포 기록 한 줄 */
function line(r) {
  const mb = (n) => (n / 1048576).toFixed(1) + "MB";
  if (r.mode === "verify") return "사진 · 첨부 확인: 전체 " + r.total + "개 · DB " + r.inDb + " · Storage " + r.inStorage + (r.bad.length ? " · 문제 " + r.bad.length + "개: " + r.bad.slice(0, 5).join(", ") : " · 모두 맞아요");
  return "사진 · 첨부 옮기기 (" + (r.mode === "to-storage" ? "DB → Storage" : "Storage → DB") + "): " + r.moved + "/" + r.total + "개 · " + mb(r.bytes) + (r.bad.length ? " · 문제 " + r.bad.length + "개(그대로 둠): " + r.bad.slice(0, 5).join(", ") : " · 파일마다 내용 확인 맞음");
}

async function run(mode) {
  if (mode === "to-storage") return toStorage();
  if (mode === "to-db") return toDb();
  if (mode === "verify") return verify();
  throw new Error("FILES_MOVE 값을 모르겠어요: " + mode + " (to-storage · to-db · verify)");
}

module.exports = { run, toStorage, toDb, verify, line, sizeOf };

if (require.main === module) {
  run(String(process.argv[2] || "verify"))
    .then((r) => { console.log(line(r)); process.exitCode = r.bad.length ? 1 : 0; })
    .catch((e) => { console.error("실패: " + e.message); process.exitCode = 1; })
    .finally(() => store.close());
}
