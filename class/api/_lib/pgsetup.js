/* Supabase(Postgres) 보안 · 사람이 읽는 보기 (DB 전환 1부 A2 · 2026-11)
 *  배포 때(db-build.js · DB_DRIVER=supabase) 한 번씩 · 여러 번 돌려도 같아요 (이미 켜진 RLS 는 다시 안 건드려요)
 *  같은 SQL 을 class/scripts/supabase.sql 로도 저장해 둬요 — Supabase › SQL Editor 에 붙여 돌려도 같은 결과 (node scripts/pg-sql.js 로 다시 만들어요)
 *
 *  보안: 표는 app 스키마에만. Supabase 공개 API 역할(anon · authenticated — 브라우저에 주는 키)은 스키마 · 표 · 보기 권한을 다 빼고,
 *        표 모두(1부 6개 + 2부 영역 표) RLS 를 켜요(정책이 없으면 공개 API 로는 한 줄도 안 보여요). 우리 서버(표 주인 postgres)는 그대로 읽고 써요.
 *  보기: 대표님이 Supabase › Table Editor 에서 표처럼 읽는 용 (읽기만 · 열 이름은 한국어). 회원 비밀번호 해시 · 수강생 전화 뒷자리(로그인 숫자)는 넣지 않아요.
 *        보기는 security_invoker — 보는 사람 권한으로 돌아서 공개 API 역할은 RLS 에 막혀요. */
"use strict";
const AR = require("./areas");

// 1부 표 6개 + 2부 영역 표(orders · members · students … · area_state) — 모두 RLS
const TABLES = ["docs", "files", "file_scopes", "rl", "backups", "oplog"].concat(AR.tableNames());

const SECURE = [
  "-- 공개 API 역할(anon · authenticated)은 app 스키마에 아무것도 못 해요 (그 역할이 있는 DB 에서만 · 로컬 시험 DB 엔 없어요)",
  `DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA app FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA app FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA app FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE ALL ON TABLES FROM %I', r);
    END IF;
  END LOOP;
END $$`,
  "REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC",
  "-- 표 모두 RLS (정책 없음 = 공개 API 로는 한 줄도 안 보여요 · 이미 켜져 있으면 그대로 — 잠금 없이)",
  `DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[${TABLES.map((t) => "'" + t + "'").join(", ")}] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('app.' || t)::regclass) THEN
      EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$`
];

/* 보기가 쓰는 작은 함수: 글자 → 숫자(안 되면 빈 값) · ms 시각 → 날짜 시각 */
const FUNCS = [
  `CREATE OR REPLACE FUNCTION app.try_num(t text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN NULLIF(t, '')::numeric; EXCEPTION WHEN others THEN RETURN NULL; END $$`,
  "CREATE OR REPLACE FUNCTION app.ms_ts(t text) RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$ SELECT to_timestamp(app.try_num(t) / 1000.0) $$"
];

/* 보기가 읽는 곳: 1부는 docs, 2부 영역 표가 생긴 뒤에는 docs + 제 표 중 버전이 높은 쪽 (스위치가 어느 칸이든 같은 결과) */
const AREA_OF = { vo: "orders", vm: "members", stu: "students", cohorts: "cohort_lists", bill: "bills", inq: "partner_inquiries", vq: "member_inquiries" };
const src = (kind) => AREA_OF[kind]
  ? "(SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = '" + kind + "' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app." + AREA_OF[kind] + " WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x"
  : "(SELECT k, v::json AS d FROM app.docs WHERE kind = '" + kind + "' AND v IS NOT NULL) x";
const yes = (f) => "COALESCE(d->>'" + f + "', '') = 'true'";
const VIEWS = [
  `CREATE OR REPLACE VIEW app.v_orders WITH (security_invoker = true) AS
SELECT d->>'no' AS "주문번호", d->>'mid' AS "회원 id", d #>> '{buyer,name}' AS "구매자", d->>'pid' AS "상품 id", d->>'title' AS "강의", d->>'kind' AS "종류",
  app.try_num(d->>'amount') AS "결제 금액", app.try_num(d->>'list') AS "정가", d->>'method' AS "결제 수단", d->>'status' AS "상태", d #>> '{pg,st}' AS "포트원 상태",
  app.ms_ts(d->>'at') AS "주문 시각", app.ms_ts(d->>'paidAt') AS "결제 시각",
  d->>'refundKind' AS "환불 종류", app.try_num(d->>'refundAmount') AS "환불 금액", app.ms_ts(d->>'refundedAt') AS "환불 시각", ${yes("demo")} AS "체험", x.k AS "문서 키"
FROM ${src("vo")}`,
  `CREATE OR REPLACE VIEW app.v_members WITH (security_invoker = true) AS
SELECT d->>'id' AS "회원 id", d->>'via' AS "가입 경로", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화",
  app.try_num(d->>'points') AS "포인트", ${yes("marketing")} AS "마케팅 동의", app.ms_ts(d->>'createdAt') AS "가입일", app.try_num(d->>'loginN') AS "로그인 수",
  CASE WHEN json_typeof(d->'orderNos') = 'array' THEN json_array_length(d->'orderNos') ELSE 0 END AS "주문 수", ${yes("demo")} AS "체험", x.k AS "문서 키"
FROM ${src("vm")}`,
  `CREATE OR REPLACE VIEW app.v_students WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", d->>'id' AS "수강생 id", d->>'cohortId' AS "기수 id", d->>'name' AS "이름", d->>'status' AS "상태", d->>'appliedAt' AS "신청일", ${yes("demo")} AS "체험", x.k AS "문서 키"
FROM ${src("stu")}`,
  `CREATE OR REPLACE VIEW app.v_cohorts WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", c->>'id' AS "기수 id", c->>'name' AS "기수", c->>'startDate' AS "1주차 강의일", app.try_num(c->>'classDow') AS "요일(0=일)",
  c->>'classTime' AS "강의 시간", c->>'classEnd' AS "끝나는 시간", c->>'classPlace' AS "장소", app.try_num(c->>'weeks') AS "주차 수", c->>'curriculumId' AS "커리큘럼", COALESCE(c->>'recruiting', '') = 'true' AS "모집 중"
FROM ${src("cohorts")} CROSS JOIN LATERAL json_array_elements(CASE WHEN json_typeof(x.d) = 'array' THEN x.d ELSE '[]'::json END) AS c`,
  `CREATE OR REPLACE VIEW app.v_bills WITH (security_invoker = true) AS
SELECT d->>'id' AS "id", d->>'instructorId' AS "강사", d->>'cohortName' AS "기수", d->>'kind' AS "종류", app.try_num(d->>'fee') AS "이용료", d->>'vat' AS "부가세",
  CASE WHEN COALESCE(d->>'canceledAt', '') <> '' THEN '취소' WHEN COALESCE(d->>'paidAt', '') <> '' THEN '입금' ELSE '신청' END AS "상태",
  app.ms_ts(d->>'requestedAt') AS "신청 시각", d->>'paidAt' AS "입금일", d->>'invoiceAt' AS "계산서", d->>'canceledAt' AS "취소일", ${yes("demo")} AS "체험", x.k AS "문서 키"
FROM ${src("bill")}`,
  `CREATE OR REPLACE VIEW app.v_inquiries WITH (security_invoker = true) AS
SELECT '입점 문의'::text AS "구분", d->>'id' AS "id", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화", COALESCE(d->>'course', d->>'want') AS "내용",
  d->>'source' AS "경로", d->>'ref' AS "추천 코드", d->>'status' AS "상태", app.ms_ts(d->>'at') AS "시각", x.k AS "문서 키"
FROM ${src("inq")}
UNION ALL
SELECT '1:1 문의'::text, d->>'id', d->>'mid', NULL::text, NULL::text, d->>'title', d->>'cat', NULL::text,
  CASE WHEN COALESCE(d->>'answer', '') <> '' THEN '답변함' ELSE '새 문의' END, app.ms_ts(d->>'at'), x.k
FROM ${src("vq")}`
];
const VIEW_NAMES = ["v_orders", "v_members", "v_students", "v_cohorts", "v_bills", "v_inquiries"];

/* 2부 영역 표 설명 — Supabase › Table Editor 에서 표 · 열 이름 옆에 한국어로 보여요 */
const lit = (t) => "'" + String(t).replace(/'/g, "''") + "'";
const COMMENTS = [];
AR.TABLES.forEach((t) => {
  COMMENTS.push("COMMENT ON TABLE app." + t.table + " IS " + lit("2부 " + t.area + " · " + t.label + " — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)"));
  COMMENTS.push("COMMENT ON COLUMN app." + t.table + ".k IS " + lit("문서 키"), "COMMENT ON COLUMN app." + t.table + ".v IS " + lit("문서 JSON (지운 문서는 비어 있어요)"));
  t.cols.forEach((c) => COMMENTS.push("COMMENT ON COLUMN app." + t.table + "." + AR.q(c[0]) + " IS " + lit(c[3])));
});
AR.CHILDREN.forEach((c) => {
  COMMENTS.push("COMMENT ON TABLE app." + c.table + " IS " + lit("2부 · " + c.label + " — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)"));
  c.cols.forEach((x) => COMMENTS.push("COMMENT ON COLUMN app." + c.table + "." + AR.q(x[0]) + " IS " + lit(x[3])));
});
COMMENTS.push("COMMENT ON TABLE app.area_state IS " + lit("2부 영역 스위치를 마지막 배포에서 어느 칸(off · dual · table · only)으로 맞췄는지"));

/** 배포 때 돌리는 SQL (표는 store.js 가 먼저 만들어요)
 *  cols(있으면): 지금 DB 에 있는 열 Set("표.열") — 아직 없는 열의 설명은 건너뛰어요. 새 열을 더한 배포에서는 예전 모양 표를
 *  배포 빌드(areasync.rebuild)가 이 단계 다음에 다시 만들고, 다시 만든 뒤 이 SQL 을 한 번 더 돌려 그때 설명을 달아요 (2026-11-08) */
const COL_RE = /^COMMENT ON COLUMN app\.(\w+)\.("?)(\w+)\2 IS /;
const colOk = (cols) => (s) => { const m = COL_RE.exec(s); return !cols || !m || cols.has(m[1] + "." + m[3]); };
const setupSql = (cols) => SECURE.concat(FUNCS, VIEWS, COMMENTS.filter(colOk(cols))).filter((s) => !/^--/.test(s)).join(";\n") + ";";
/** class/scripts/supabase.sql — 표 · 보안 · 보기 전부 (Supabase › SQL Editor 에 붙여도 같은 결과) */
function fullSql(pgSchema) {
  const head = "-- 두고클래스 Supabase(Postgres) — DB 전환 1부 (class/api/_lib/store.js PG_SCHEMA + api/_lib/pgsetup.js)\n-- 이 파일은 node class/scripts/pg-sql.js 로 만들어요 (손으로 고치지 마세요 · 시험이 같은지 확인해요)\n-- 여러 번 돌려도 같아요. 배포(DB_DRIVER=supabase)가 같은 SQL 을 자동으로 돌려요.\n\n";
  const part = (t, list) => "-- ---------- " + t + " ----------\n" + list.map((s) => (/^--/.test(s) ? s : s + ";")).join("\n\n") + "\n";
  return head + part("표 (app 스키마 · 1부 6개 + 2부 영역 표)", pgSchema) + "\n" + part("보안: 공개 API 막기 · RLS", SECURE) + "\n" + part("보기가 쓰는 함수", FUNCS) + "\n" + part("사람이 읽는 보기 (읽기만)", VIEWS) + "\n" + part("2부 영역 표 설명 (Table Editor 에 한국어로)", COMMENTS);
}

module.exports = { TABLES, SECURE, FUNCS, VIEWS, VIEW_NAMES, COMMENTS, setupSql, fullSql };
