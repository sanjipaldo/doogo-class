-- 두고클래스 Supabase(Postgres) — DB 전환 1부 (class/api/_lib/store.js PG_SCHEMA + api/_lib/pgsetup.js)
-- 이 파일은 node class/scripts/pg-sql.js 로 만들어요 (손으로 고치지 마세요 · 시험이 같은지 확인해요)
-- 여러 번 돌려도 같아요. 배포(DB_DRIVER=supabase)가 같은 SQL 을 자동으로 돌려요.

-- ---------- 표 6개 (app 스키마) ----------
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.docs (k text PRIMARY KEY, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL, kind text GENERATED ALWAYS AS (split_part(k, ':', 1)) STORED);

CREATE INDEX IF NOT EXISTS docs_updated ON app.docs (updated);

CREATE INDEX IF NOT EXISTS docs_k_prefix ON app.docs (k text_pattern_ops);

CREATE INDEX IF NOT EXISTS docs_kind ON app.docs (kind);

CREATE TABLE IF NOT EXISTS app.files (h text PRIMARY KEY, mime text NOT NULL, b64 text NOT NULL, size integer NOT NULL, created bigint NOT NULL);

CREATE TABLE IF NOT EXISTS app.file_scopes (h text NOT NULL, scope text NOT NULL, PRIMARY KEY (h, scope));

CREATE TABLE IF NOT EXISTS app.rl (k text PRIMARY KEY, n integer NOT NULL, until bigint NOT NULL);

CREATE TABLE IF NOT EXISTS app.backups (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, at bigint NOT NULL, reason text, docs integer, size integer, data text NOT NULL);

CREATE TABLE IF NOT EXISTS app.oplog (id text PRIMARY KEY, at bigint NOT NULL, note text, result text);

-- ---------- 보안: 공개 API 막기 · RLS ----------
-- 공개 API 역할(anon · authenticated)은 app 스키마에 아무것도 못 해요 (그 역할이 있는 DB 에서만 · 로컬 시험 DB 엔 없어요)

DO $$
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
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

-- 표 6개 모두 RLS (정책 없음 = 공개 API 로는 한 줄도 안 보여요 · 이미 켜져 있으면 그대로 — 잠금 없이)

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['docs', 'files', 'file_scopes', 'rl', 'backups', 'oplog'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('app.' || t)::regclass) THEN
      EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ---------- 보기가 쓰는 함수 ----------
CREATE OR REPLACE FUNCTION app.try_num(t text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN NULLIF(t, '')::numeric; EXCEPTION WHEN others THEN RETURN NULL; END $$;

CREATE OR REPLACE FUNCTION app.ms_ts(t text) RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$ SELECT to_timestamp(app.try_num(t) / 1000.0) $$;

-- ---------- 사람이 읽는 보기 (읽기만) ----------
CREATE OR REPLACE VIEW app.v_orders WITH (security_invoker = true) AS
SELECT d->>'no' AS "주문번호", d->>'mid' AS "회원 id", d #>> '{buyer,name}' AS "구매자", d->>'pid' AS "상품 id", d->>'title' AS "강의", d->>'kind' AS "종류",
  app.try_num(d->>'amount') AS "결제 금액", app.try_num(d->>'list') AS "정가", d->>'method' AS "결제 수단", d->>'status' AS "상태", d #>> '{pg,st}' AS "포트원 상태",
  app.ms_ts(d->>'at') AS "주문 시각", app.ms_ts(d->>'paidAt') AS "결제 시각",
  d->>'refundKind' AS "환불 종류", app.try_num(d->>'refundAmount') AS "환불 금액", app.ms_ts(d->>'refundedAt') AS "환불 시각", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'vo' AND v IS NOT NULL) x;

CREATE OR REPLACE VIEW app.v_members WITH (security_invoker = true) AS
SELECT d->>'id' AS "회원 id", d->>'via' AS "가입 경로", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화",
  app.try_num(d->>'points') AS "포인트", COALESCE(d->>'marketing', '') = 'true' AS "마케팅 동의", app.ms_ts(d->>'createdAt') AS "가입일", app.try_num(d->>'loginN') AS "로그인 수",
  CASE WHEN json_typeof(d->'orderNos') = 'array' THEN json_array_length(d->'orderNos') ELSE 0 END AS "주문 수", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'vm' AND v IS NOT NULL) x;

CREATE OR REPLACE VIEW app.v_students WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", d->>'id' AS "수강생 id", d->>'cohortId' AS "기수 id", d->>'name' AS "이름", d->>'status' AS "상태", d->>'appliedAt' AS "신청일", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'stu' AND v IS NOT NULL) x;

CREATE OR REPLACE VIEW app.v_cohorts WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", c->>'id' AS "기수 id", c->>'name' AS "기수", c->>'startDate' AS "1주차 강의일", app.try_num(c->>'classDow') AS "요일(0=일)",
  c->>'classTime' AS "강의 시간", c->>'classEnd' AS "끝나는 시간", c->>'classPlace' AS "장소", app.try_num(c->>'weeks') AS "주차 수", c->>'curriculumId' AS "커리큘럼", COALESCE(c->>'recruiting', '') = 'true' AS "모집 중"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'cohorts' AND v IS NOT NULL) x CROSS JOIN LATERAL json_array_elements(CASE WHEN json_typeof(x.d) = 'array' THEN x.d ELSE '[]'::json END) AS c;

CREATE OR REPLACE VIEW app.v_bills WITH (security_invoker = true) AS
SELECT d->>'id' AS "id", d->>'instructorId' AS "강사", d->>'cohortName' AS "기수", d->>'kind' AS "종류", app.try_num(d->>'fee') AS "이용료", d->>'vat' AS "부가세",
  CASE WHEN COALESCE(d->>'canceledAt', '') <> '' THEN '취소' WHEN COALESCE(d->>'paidAt', '') <> '' THEN '입금' ELSE '신청' END AS "상태",
  app.ms_ts(d->>'requestedAt') AS "신청 시각", d->>'paidAt' AS "입금일", d->>'invoiceAt' AS "계산서", d->>'canceledAt' AS "취소일", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'bill' AND v IS NOT NULL) x;

CREATE OR REPLACE VIEW app.v_inquiries WITH (security_invoker = true) AS
SELECT '입점 문의'::text AS "구분", d->>'id' AS "id", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화", COALESCE(d->>'course', d->>'want') AS "내용",
  d->>'source' AS "경로", d->>'ref' AS "추천 코드", d->>'status' AS "상태", app.ms_ts(d->>'at') AS "시각", x.k AS "문서 키"
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'inq' AND v IS NOT NULL) x
UNION ALL
SELECT '1:1 문의'::text, d->>'id', d->>'mid', NULL::text, NULL::text, d->>'title', d->>'cat', NULL::text,
  CASE WHEN COALESCE(d->>'answer', '') <> '' THEN '답변함' ELSE '새 문의' END, app.ms_ts(d->>'at'), x.k
FROM (SELECT k, v::json AS d FROM app.docs WHERE kind = 'vq' AND v IS NOT NULL) x;
