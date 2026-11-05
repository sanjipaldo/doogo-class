/* DB 전환 2부 B2~B6 — 영역 표 보기 · 맞추기 (로컬 · 시험용) — 배포 때는 db-build.js 가 같은 일을 해요
 *   node scripts/areas.js status            영역마다 스위치 · 지난 배포 칸 · docs / 표 문서 수
 *   node scripts/areas.js verify            비교만 (고치지 않아요 · 다르면 실패)
 *   node scripts/areas.js sync [--force]    맞추기 + 비교 (--force: 한 칸씩이 아니어도 — 시험 DB 에서만)
 *   DB: CLASS_SQLITE 또는 SUPABASE_DB_URL · 스위치: DB_AREAS (예: all:only) */
"use strict";
const store = require("../api/_lib/store");
const AS = require("../api/_lib/areasync");

(async () => {
  const cmd = process.argv[2] || "status", force = process.argv.includes("--force");
  if (cmd === "status") { (await AS.status()).forEach((r) => console.log(r.area + " " + r.table.padEnd(18) + " 스위치 " + r.mode.padEnd(5) + " 지난 배포 " + r.last.padEnd(5) + " docs " + r.docs + " · 표 " + r.tab)); return; }
  if (cmd !== "verify" && cmd !== "sync") throw new Error("모르는 명령: " + cmd + " (status · verify · sync)");
  const r = await AS.sync({ write: cmd === "sync", force });
  r.lines.forEach((l) => console.log(l));
  if (!r.ok) process.exitCode = 1;
})().catch((e) => { console.error("실패: " + e.message); process.exitCode = 1; }).finally(() => store.close());
