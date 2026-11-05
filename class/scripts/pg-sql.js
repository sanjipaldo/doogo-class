/* class/scripts/supabase.sql 만들기 — Supabase › SQL Editor 에 붙여 돌려도 배포(DB_DRIVER=supabase)와 같은 표 · 보안 · 보기가 돼요 (DB 전환 1부 A2)
 *   node class/scripts/pg-sql.js          → class/scripts/supabase.sql 을 새로 써요
 *   node class/scripts/pg-sql.js --check  → 파일이 코드(store.js PG_SCHEMA + pgsetup.js)와 같은지만 (다르면 실패) */
"use strict";
const fs = require("fs"), path = require("path");
const store = require("../api/_lib/store"), setup = require("../api/_lib/pgsetup");
const FILE = path.join(__dirname, "supabase.sql"); // scripts/ 는 공개 사이트(public/)로 복사하지 않아요 (site.js SKIP)
const sql = setup.fullSql(store.PG_SCHEMA);
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
  if (cur !== sql) { console.error("class/scripts/supabase.sql 이 코드와 달라요 — node class/scripts/pg-sql.js 로 다시 만들어 주세요"); process.exit(1); }
  console.log("class/scripts/supabase.sql 이 코드와 같아요");
} else {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, sql);
  console.log("class/scripts/supabase.sql 을 썼어요 (" + sql.length + "자)");
}
