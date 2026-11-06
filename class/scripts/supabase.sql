-- 두고클래스 Supabase(Postgres) — DB 전환 1부 (class/api/_lib/store.js PG_SCHEMA + api/_lib/pgsetup.js)
-- 이 파일은 node class/scripts/pg-sql.js 로 만들어요 (손으로 고치지 마세요 · 시험이 같은지 확인해요)
-- 여러 번 돌려도 같아요. 배포(DB_DRIVER=supabase)가 같은 SQL 을 자동으로 돌려요.

-- ---------- 표 (app 스키마 · 1부 6개 + 2부 영역 표) ----------
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

CREATE TABLE IF NOT EXISTS app.area_state (id text PRIMARY KEY, mode text NOT NULL, at bigint NOT NULL, note text);

CREATE TABLE IF NOT EXISTS app.orders (k text PRIMARY KEY, no text, mid text, pid text, iid text, kind text, title text, list_price integer, sale_price integer, coupon_off integer, point_off integer, amount integer, method text, status text, payment_id text, grp text, ordered_at timestamp, paid_at timestamp, refunded_at timestamp, refund_amount integer, refund_kind text, demo boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS orders_updated ON app.orders (updated);

CREATE INDEX IF NOT EXISTS orders_mid ON app.orders (mid);

CREATE INDEX IF NOT EXISTS orders_status ON app.orders (status);

CREATE INDEX IF NOT EXISTS orders_paid_at ON app.orders (paid_at);

CREATE INDEX IF NOT EXISTS orders_payment_id ON app.orders (payment_id);

CREATE INDEX IF NOT EXISTS orders_pid ON app.orders (pid);

CREATE TABLE IF NOT EXISTS app.payments (k text PRIMARY KEY, payment_id text, mid text, total integer, at timestamp, orders integer, bank boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS payments_updated ON app.payments (updated);

CREATE INDEX IF NOT EXISTS payments_mid ON app.payments (mid);

CREATE TABLE IF NOT EXISTS app.payment_orders (k text NOT NULL, i integer NOT NULL, order_no text, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS payment_orders_order_no ON app.payment_orders (order_no);

CREATE TABLE IF NOT EXISTS app.bank_log (k text PRIMARY KEY, n integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS bank_log_updated ON app.bank_log (updated);

CREATE TABLE IF NOT EXISTS app.bank_deposits (k text NOT NULL, i integer NOT NULL, id text, at timestamp, got_at timestamp, name text, amount integer, bank text, st text, order_no text, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS bank_deposits_order_no ON app.bank_deposits (order_no);

CREATE INDEX IF NOT EXISTS bank_deposits_at ON app.bank_deposits (at);

CREATE TABLE IF NOT EXISTS app.members (k text PRIMARY KEY, id text, via text, email text, name text, phone text, points integer, marketing boolean, kakao_id text, created_at timestamp, last_login_at timestamp, login_n integer, orders integer, demo boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS members_updated ON app.members (updated);

CREATE INDEX IF NOT EXISTS members_email ON app.members (email);

CREATE INDEX IF NOT EXISTS members_created_at ON app.members (created_at);

CREATE TABLE IF NOT EXISTS app.member_logins (k text PRIMARY KEY, method text, value text, mid text, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS member_logins_updated ON app.member_logins (updated);

CREATE INDEX IF NOT EXISTS member_logins_mid ON app.member_logins (mid);

CREATE TABLE IF NOT EXISTS app.vod_progress (k text PRIMARY KEY, mid text, products integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS vod_progress_updated ON app.vod_progress (updated);

CREATE TABLE IF NOT EXISTS app.vod_progress_items (k text NOT NULL, i integer NOT NULL, pid text, seen integer, done integer, mat integer, last_seen_at timestamp, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS vod_progress_items_pid ON app.vod_progress_items (pid);

CREATE TABLE IF NOT EXISTS app.instructors (k text PRIMARY KEY, id text, name text, display_name text, status text, created_at text, tracks text, coaches integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS instructors_updated ON app.instructors (updated);

CREATE TABLE IF NOT EXISTS app.coaches (k text NOT NULL, i integer NOT NULL, id text, name text, status text, track text, created_at text, last_login_at timestamp, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS coaches_id ON app.coaches (id);

CREATE TABLE IF NOT EXISTS app.cohort_lists (k text PRIMARY KEY, iid text, n integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS cohort_lists_updated ON app.cohort_lists (updated);

CREATE TABLE IF NOT EXISTS app.cohorts (k text NOT NULL, i integer NOT NULL, id text, iid text, name text, start_date text, class_dow integer, class_time text, class_end text, place text, weeks integer, curriculum_id text, recruiting boolean, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS cohorts_id ON app.cohorts (id);

CREATE TABLE IF NOT EXISTS app.students (k text PRIMARY KEY, iid text, id text, cohort_id text, track text, name text, status text, applied_at text, vod_mid text, source text, joined_at timestamp, demo boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS students_updated ON app.students (updated);

CREATE INDEX IF NOT EXISTS students_iid ON app.students (iid);

CREATE INDEX IF NOT EXISTS students_cohort_id ON app.students (cohort_id);

CREATE INDEX IF NOT EXISTS students_vod_mid ON app.students (vod_mid);

CREATE TABLE IF NOT EXISTS app.progress (k text PRIMARY KEY, iid text, sid text, watched integer, missions integer, submissions integer, waiting integer, questions integer, last_watched_at timestamp, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS progress_updated ON app.progress (updated);

CREATE INDEX IF NOT EXISTS progress_iid ON app.progress (iid);

CREATE TABLE IF NOT EXISTS app.contents (k text PRIMARY KEY, iid text, course text, weeks integer, notices integer, faqs integer, landing_on boolean, free_on boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS contents_updated ON app.contents (updated);

CREATE TABLE IF NOT EXISTS app.bills (k text PRIMARY KEY, iid text, id text, cohort_id text, cohort_name text, kind text, fee integer, vat text, status text, requested_at timestamp, paid_at text, invoice_at text, canceled_at text, demo boolean, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS bills_updated ON app.bills (updated);

CREATE INDEX IF NOT EXISTS bills_iid ON app.bills (iid);

CREATE INDEX IF NOT EXISTS bills_cohort_id ON app.bills (cohort_id);

CREATE TABLE IF NOT EXISTS app.partner_inquiries (k text PRIMARY KEY, id text, name text, email text, phone text, course text, source text, ref text, aff_id text, status text, at timestamp, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS partner_inquiries_updated ON app.partner_inquiries (updated);

CREATE INDEX IF NOT EXISTS partner_inquiries_status ON app.partner_inquiries (status);

CREATE INDEX IF NOT EXISTS partner_inquiries_at ON app.partner_inquiries (at);

CREATE TABLE IF NOT EXISTS app.member_inquiries (k text PRIMARY KEY, mid text, id text, cat text, order_no text, title text, answered boolean, at timestamp, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS member_inquiries_updated ON app.member_inquiries (updated);

CREATE INDEX IF NOT EXISTS member_inquiries_mid ON app.member_inquiries (mid);

CREATE INDEX IF NOT EXISTS member_inquiries_at ON app.member_inquiries (at);

CREATE TABLE IF NOT EXISTS app.reviews (k text PRIMARY KEY, id text, pid text, mid text, name text, rating integer, hidden boolean, at timestamp, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS reviews_updated ON app.reviews (updated);

CREATE INDEX IF NOT EXISTS reviews_pid ON app.reviews (pid);

CREATE INDEX IF NOT EXISTS reviews_mid ON app.reviews (mid);

CREATE TABLE IF NOT EXISTS app.pledges (k text PRIMARY KEY, id text, pid text, mid text, nick text, up integer, at timestamp, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS pledges_updated ON app.pledges (updated);

CREATE INDEX IF NOT EXISTS pledges_pid ON app.pledges (pid);

CREATE TABLE IF NOT EXISTS app.payout_lists (k text PRIMARY KEY, who text, n integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS payout_lists_updated ON app.payout_lists (updated);

CREATE TABLE IF NOT EXISTS app.payouts (k text NOT NULL, i integer NOT NULL, id text, who text, ym text, st text, amount integer, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS payouts_ym ON app.payouts (ym);

CREATE TABLE IF NOT EXISTS app.settings (k text PRIMARY KEY, name text, items integer, v text, ver integer NOT NULL DEFAULT 1, updated bigint NOT NULL, created bigint NOT NULL);

CREATE INDEX IF NOT EXISTS settings_updated ON app.settings (updated);

CREATE TABLE IF NOT EXISTS app.products (k text NOT NULL, i integer NOT NULL, id text, type text, iid text, title text, status text, price integer, sale integer, cat text, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS products_id ON app.products (id);

CREATE TABLE IF NOT EXISTS app.coupons (k text NOT NULL, i integer NOT NULL, id text, code text, name text, kind text, value integer, days integer, "on" boolean, PRIMARY KEY (k, i));

CREATE INDEX IF NOT EXISTS coupons_code ON app.coupons (code);

CREATE TABLE IF NOT EXISTS app.staff (k text NOT NULL, i integer NOT NULL, kind text, id text, name text, login_id text, status text, PRIMARY KEY (k, i));

CREATE TABLE IF NOT EXISTS app.partner_payouts (k text NOT NULL, i integer NOT NULL, aff_id text, ym text, paid_at text, PRIMARY KEY (k, i));

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

-- 표 모두 RLS (정책 없음 = 공개 API 로는 한 줄도 안 보여요 · 이미 켜져 있으면 그대로 — 잠금 없이)

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['docs', 'files', 'file_scopes', 'rl', 'backups', 'oplog', 'area_state', 'orders', 'payments', 'bank_log', 'members', 'member_logins', 'vod_progress', 'instructors', 'cohort_lists', 'students', 'progress', 'contents', 'bills', 'partner_inquiries', 'member_inquiries', 'reviews', 'pledges', 'payout_lists', 'settings', 'payment_orders', 'bank_deposits', 'vod_progress_items', 'coaches', 'cohorts', 'payouts', 'products', 'coupons', 'staff', 'partner_payouts'] LOOP
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
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'vo' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.orders WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x;

CREATE OR REPLACE VIEW app.v_members WITH (security_invoker = true) AS
SELECT d->>'id' AS "회원 id", d->>'via' AS "가입 경로", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화",
  app.try_num(d->>'points') AS "포인트", COALESCE(d->>'marketing', '') = 'true' AS "마케팅 동의", app.ms_ts(d->>'createdAt') AS "가입일", app.try_num(d->>'loginN') AS "로그인 수",
  CASE WHEN json_typeof(d->'orderNos') = 'array' THEN json_array_length(d->'orderNos') ELSE 0 END AS "주문 수", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'vm' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.members WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x;

CREATE OR REPLACE VIEW app.v_students WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", d->>'id' AS "수강생 id", d->>'cohortId' AS "기수 id", d->>'name' AS "이름", d->>'status' AS "상태", d->>'appliedAt' AS "신청일", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'stu' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.students WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x;

CREATE OR REPLACE VIEW app.v_cohorts WITH (security_invoker = true) AS
SELECT split_part(x.k, ':', 2) AS "강사", c->>'id' AS "기수 id", c->>'name' AS "기수", c->>'startDate' AS "1주차 강의일", app.try_num(c->>'classDow') AS "요일(0=일)",
  c->>'classTime' AS "강의 시간", c->>'classEnd' AS "끝나는 시간", c->>'classPlace' AS "장소", app.try_num(c->>'weeks') AS "주차 수", c->>'curriculumId' AS "커리큘럼", COALESCE(c->>'recruiting', '') = 'true' AS "모집 중"
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'cohorts' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.cohort_lists WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x CROSS JOIN LATERAL json_array_elements(CASE WHEN json_typeof(x.d) = 'array' THEN x.d ELSE '[]'::json END) AS c;

CREATE OR REPLACE VIEW app.v_bills WITH (security_invoker = true) AS
SELECT d->>'id' AS "id", d->>'instructorId' AS "강사", d->>'cohortName' AS "기수", d->>'kind' AS "종류", app.try_num(d->>'fee') AS "이용료", d->>'vat' AS "부가세",
  CASE WHEN COALESCE(d->>'canceledAt', '') <> '' THEN '취소' WHEN COALESCE(d->>'paidAt', '') <> '' THEN '입금' ELSE '신청' END AS "상태",
  app.ms_ts(d->>'requestedAt') AS "신청 시각", d->>'paidAt' AS "입금일", d->>'invoiceAt' AS "계산서", d->>'canceledAt' AS "취소일", COALESCE(d->>'demo', '') = 'true' AS "체험", x.k AS "문서 키"
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'bill' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.bills WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x;

CREATE OR REPLACE VIEW app.v_inquiries WITH (security_invoker = true) AS
SELECT '입점 문의'::text AS "구분", d->>'id' AS "id", d->>'name' AS "이름", d->>'email' AS "이메일", d->>'phone' AS "전화", COALESCE(d->>'course', d->>'want') AS "내용",
  d->>'source' AS "경로", d->>'ref' AS "추천 코드", d->>'status' AS "상태", app.ms_ts(d->>'at') AS "시각", x.k AS "문서 키"
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'inq' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.partner_inquiries WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x
UNION ALL
SELECT '1:1 문의'::text, d->>'id', d->>'mid', NULL::text, NULL::text, d->>'title', d->>'cat', NULL::text,
  CASE WHEN COALESCE(d->>'answer', '') <> '' THEN '답변함' ELSE '새 문의' END, app.ms_ts(d->>'at'), x.k
FROM (SELECT DISTINCT ON (k) k, v::json AS d FROM (SELECT k, v, ver FROM app.docs WHERE kind = 'vq' AND v IS NOT NULL UNION ALL SELECT k, v, ver FROM app.member_inquiries WHERE v IS NOT NULL) s ORDER BY k, ver DESC) x;

-- ---------- 2부 영역 표 설명 (Table Editor 에 한국어로) ----------
COMMENT ON TABLE app.orders IS '2부 B2 · 주문 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.orders.k IS '문서 키';

COMMENT ON COLUMN app.orders.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.orders.no IS '주문번호';

COMMENT ON COLUMN app.orders.mid IS '회원 id';

COMMENT ON COLUMN app.orders.pid IS '상품 id';

COMMENT ON COLUMN app.orders.iid IS '강사 id';

COMMENT ON COLUMN app.orders.kind IS '종류';

COMMENT ON COLUMN app.orders.title IS '상품 이름';

COMMENT ON COLUMN app.orders.list_price IS '정가';

COMMENT ON COLUMN app.orders.sale_price IS '판매가';

COMMENT ON COLUMN app.orders.coupon_off IS '쿠폰 할인';

COMMENT ON COLUMN app.orders.point_off IS '포인트 사용';

COMMENT ON COLUMN app.orders.amount IS '결제 금액(원)';

COMMENT ON COLUMN app.orders.method IS '결제 수단';

COMMENT ON COLUMN app.orders.status IS '상태 (ready · paid · refunded · failed …)';

COMMENT ON COLUMN app.orders.payment_id IS '포트원 결제 id';

COMMENT ON COLUMN app.orders.grp IS '묶음 주문의 대표 주문번호';

COMMENT ON COLUMN app.orders.ordered_at IS '주문 시각(한국 시간)';

COMMENT ON COLUMN app.orders.paid_at IS '결제 시각(한국 시간)';

COMMENT ON COLUMN app.orders.refunded_at IS '환불 시각(한국 시간)';

COMMENT ON COLUMN app.orders.refund_amount IS '환불 금액';

COMMENT ON COLUMN app.orders.refund_kind IS '환불 종류';

COMMENT ON COLUMN app.orders.demo IS '체험 주문';

COMMENT ON TABLE app.payments IS '2부 B2 · 결제(포트원) — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.payments.k IS '문서 키';

COMMENT ON COLUMN app.payments.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.payments.payment_id IS '포트원 결제 id';

COMMENT ON COLUMN app.payments.mid IS '회원 id';

COMMENT ON COLUMN app.payments.total IS '합계(원)';

COMMENT ON COLUMN app.payments.at IS '시각(한국 시간)';

COMMENT ON COLUMN app.payments.orders IS '주문 수';

COMMENT ON COLUMN app.payments.bank IS '무통장 · 가상계좌';

COMMENT ON TABLE app.bank_log IS '2부 B2 · 입금 알림 기록 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.bank_log.k IS '문서 키';

COMMENT ON COLUMN app.bank_log.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.bank_log.n IS '최근 입금 알림 수';

COMMENT ON TABLE app.members IS '2부 B3 · DOOGO CLASS 회원 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.members.k IS '문서 키';

COMMENT ON COLUMN app.members.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.members.id IS '회원 id';

COMMENT ON COLUMN app.members.via IS '가입 경로 (email · kakao)';

COMMENT ON COLUMN app.members.email IS '이메일';

COMMENT ON COLUMN app.members.name IS '이름';

COMMENT ON COLUMN app.members.phone IS '전화';

COMMENT ON COLUMN app.members.points IS '포인트';

COMMENT ON COLUMN app.members.marketing IS '마케팅 동의';

COMMENT ON COLUMN app.members.kakao_id IS '카카오 회원번호';

COMMENT ON COLUMN app.members.created_at IS '가입 시각(한국 시간)';

COMMENT ON COLUMN app.members.last_login_at IS '마지막 로그인(한국 시간)';

COMMENT ON COLUMN app.members.login_n IS '로그인 수';

COMMENT ON COLUMN app.members.orders IS '주문 수';

COMMENT ON COLUMN app.members.demo IS '체험 계정';

COMMENT ON TABLE app.member_logins IS '2부 B3 · 회원 로그인 방법 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.member_logins.k IS '문서 키';

COMMENT ON COLUMN app.member_logins.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.member_logins.method IS '방식 (email · kakao)';

COMMENT ON COLUMN app.member_logins.value IS '이메일 · 카카오 회원번호';

COMMENT ON COLUMN app.member_logins.mid IS '회원 id';

COMMENT ON TABLE app.vod_progress IS '2부 B3 · VOD 진도 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.vod_progress.k IS '문서 키';

COMMENT ON COLUMN app.vod_progress.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.vod_progress.mid IS '회원 id';

COMMENT ON COLUMN app.vod_progress.products IS '본 상품 수';

COMMENT ON TABLE app.instructors IS '2부 B4 · 강사 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.instructors.k IS '문서 키';

COMMENT ON COLUMN app.instructors.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.instructors.id IS '강사 id';

COMMENT ON COLUMN app.instructors.name IS '이름';

COMMENT ON COLUMN app.instructors.display_name IS '표시 이름';

COMMENT ON COLUMN app.instructors.status IS '상태';

COMMENT ON COLUMN app.instructors.created_at IS '등록일';

COMMENT ON COLUMN app.instructors.tracks IS '열린 두잉고 (live · vod)';

COMMENT ON COLUMN app.instructors.coaches IS '코치 수';

COMMENT ON TABLE app.cohort_lists IS '2부 B4 · 강사별 기수 목록 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.cohort_lists.k IS '문서 키';

COMMENT ON COLUMN app.cohort_lists.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.cohort_lists.iid IS '강사 id';

COMMENT ON COLUMN app.cohort_lists.n IS '기수 수';

COMMENT ON TABLE app.students IS '2부 B4 · 두잉고 수강생 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.students.k IS '문서 키';

COMMENT ON COLUMN app.students.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.students.iid IS '강사 id';

COMMENT ON COLUMN app.students.id IS '수강생 id';

COMMENT ON COLUMN app.students.cohort_id IS '기수 id';

COMMENT ON COLUMN app.students.track IS '두잉고 (live · vod)';

COMMENT ON COLUMN app.students.name IS '이름';

COMMENT ON COLUMN app.students.status IS '상태';

COMMENT ON COLUMN app.students.applied_at IS '신청일';

COMMENT ON COLUMN app.students.vod_mid IS 'DOOGO CLASS 회원 id';

COMMENT ON COLUMN app.students.source IS '들어온 길';

COMMENT ON COLUMN app.students.joined_at IS '입장 시각(한국 시간)';

COMMENT ON COLUMN app.students.demo IS '체험 계정';

COMMENT ON TABLE app.progress IS '2부 B4 · 수강생 진도 · 과제 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.progress.k IS '문서 키';

COMMENT ON COLUMN app.progress.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.progress.iid IS '강사 id';

COMMENT ON COLUMN app.progress.sid IS '수강생 id';

COMMENT ON COLUMN app.progress.watched IS '본 강의 수';

COMMENT ON COLUMN app.progress.missions IS '제출한 과제 수';

COMMENT ON COLUMN app.progress.submissions IS '제출 횟수';

COMMENT ON COLUMN app.progress.waiting IS '검수 기다리는 과제';

COMMENT ON COLUMN app.progress.questions IS '질문 수';

COMMENT ON COLUMN app.progress.last_watched_at IS '마지막으로 본 시각(한국 시간)';

COMMENT ON TABLE app.contents IS '2부 B4 · 강사 콘텐츠(강의실) — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.contents.k IS '문서 키';

COMMENT ON COLUMN app.contents.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.contents.iid IS '강사 id';

COMMENT ON COLUMN app.contents.course IS '강의 이름';

COMMENT ON COLUMN app.contents.weeks IS '주차 수';

COMMENT ON COLUMN app.contents.notices IS '공지 수';

COMMENT ON COLUMN app.contents.faqs IS '자주 묻는 질문 수';

COMMENT ON COLUMN app.contents.landing_on IS '강의 소개 페이지 공개';

COMMENT ON COLUMN app.contents.free_on IS '무료강의 페이지 공개';

COMMENT ON TABLE app.bills IS '2부 B5 · 기수 이용료 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.bills.k IS '문서 키';

COMMENT ON COLUMN app.bills.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.bills.iid IS '강사 id';

COMMENT ON COLUMN app.bills.id IS 'id';

COMMENT ON COLUMN app.bills.cohort_id IS '기수 id';

COMMENT ON COLUMN app.bills.cohort_name IS '기수';

COMMENT ON COLUMN app.bills.kind IS '종류';

COMMENT ON COLUMN app.bills.fee IS '이용료(원)';

COMMENT ON COLUMN app.bills.vat IS '부가세 방식';

COMMENT ON COLUMN app.bills.status IS '상태 (requested · paid · canceled)';

COMMENT ON COLUMN app.bills.requested_at IS '신청 시각(한국 시간)';

COMMENT ON COLUMN app.bills.paid_at IS '입금일';

COMMENT ON COLUMN app.bills.invoice_at IS '세금계산서';

COMMENT ON COLUMN app.bills.canceled_at IS '취소일';

COMMENT ON COLUMN app.bills.demo IS '체험';

COMMENT ON TABLE app.partner_inquiries IS '2부 B5 · 강사 입점 문의 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.partner_inquiries.k IS '문서 키';

COMMENT ON COLUMN app.partner_inquiries.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.partner_inquiries.id IS 'id';

COMMENT ON COLUMN app.partner_inquiries.name IS '이름';

COMMENT ON COLUMN app.partner_inquiries.email IS '이메일';

COMMENT ON COLUMN app.partner_inquiries.phone IS '전화';

COMMENT ON COLUMN app.partner_inquiries.course IS '강의 · 문의';

COMMENT ON COLUMN app.partner_inquiries.source IS '경로';

COMMENT ON COLUMN app.partner_inquiries.ref IS '추천 코드';

COMMENT ON COLUMN app.partner_inquiries.aff_id IS '파트너 id';

COMMENT ON COLUMN app.partner_inquiries.status IS '상태';

COMMENT ON COLUMN app.partner_inquiries.at IS '시각(한국 시간)';

COMMENT ON TABLE app.member_inquiries IS '2부 B5 · 회원 1:1 문의 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.member_inquiries.k IS '문서 키';

COMMENT ON COLUMN app.member_inquiries.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.member_inquiries.mid IS '회원 id';

COMMENT ON COLUMN app.member_inquiries.id IS '문의 id';

COMMENT ON COLUMN app.member_inquiries.cat IS '분류';

COMMENT ON COLUMN app.member_inquiries.order_no IS '주문번호';

COMMENT ON COLUMN app.member_inquiries.title IS '제목';

COMMENT ON COLUMN app.member_inquiries.answered IS '답변함';

COMMENT ON COLUMN app.member_inquiries.at IS '시각(한국 시간)';

COMMENT ON TABLE app.reviews IS '2부 B5 · 후기 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.reviews.k IS '문서 키';

COMMENT ON COLUMN app.reviews.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.reviews.id IS 'id';

COMMENT ON COLUMN app.reviews.pid IS '상품 id';

COMMENT ON COLUMN app.reviews.mid IS '회원 id';

COMMENT ON COLUMN app.reviews.name IS '이름';

COMMENT ON COLUMN app.reviews.rating IS '별점';

COMMENT ON COLUMN app.reviews.hidden IS '숨김';

COMMENT ON COLUMN app.reviews.at IS '시각(한국 시간)';

COMMENT ON TABLE app.pledges IS '2부 B5 · 수강 다짐 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.pledges.k IS '문서 키';

COMMENT ON COLUMN app.pledges.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.pledges.id IS 'id';

COMMENT ON COLUMN app.pledges.pid IS '상품 id';

COMMENT ON COLUMN app.pledges.mid IS '회원 id';

COMMENT ON COLUMN app.pledges.nick IS '닉네임';

COMMENT ON COLUMN app.pledges.up IS '응원 수';

COMMENT ON COLUMN app.pledges.at IS '시각(한국 시간)';

COMMENT ON TABLE app.payout_lists IS '2부 B5 · 강사 정산 지급 목록 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.payout_lists.k IS '문서 키';

COMMENT ON COLUMN app.payout_lists.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.payout_lists.who IS '강사 id';

COMMENT ON COLUMN app.payout_lists.n IS '지급 건수';

COMMENT ON TABLE app.settings IS '2부 B6 · 설정 · 카탈로그 — 한 줄 = 문서 하나 (v = 화면이 쓰는 문서 글자 그대로 · 나머지 열은 v 에서 꺼낸 값)';

COMMENT ON COLUMN app.settings.k IS '문서 키';

COMMENT ON COLUMN app.settings.v IS '문서 JSON (지운 문서는 비어 있어요)';

COMMENT ON COLUMN app.settings.name IS '문서 (meta · vcat · vdur · vstat · vmsg · vupd)';

COMMENT ON COLUMN app.settings.items IS '칸 수';

COMMENT ON TABLE app.payment_orders IS '2부 · 결제에 묶인 주문 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.payment_orders.order_no IS '주문번호';

COMMENT ON TABLE app.bank_deposits IS '2부 · 입금 알림 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.bank_deposits.id IS '은행 거래 id';

COMMENT ON COLUMN app.bank_deposits.at IS '입금 시각(한국 시간)';

COMMENT ON COLUMN app.bank_deposits.got_at IS '알림 받은 시각(한국 시간)';

COMMENT ON COLUMN app.bank_deposits.name IS '입금자';

COMMENT ON COLUMN app.bank_deposits.amount IS '금액';

COMMENT ON COLUMN app.bank_deposits.bank IS '은행';

COMMENT ON COLUMN app.bank_deposits.st IS '맞춘 상태 (ok · many · none · linked · fail)';

COMMENT ON COLUMN app.bank_deposits.order_no IS '주문번호';

COMMENT ON TABLE app.vod_progress_items IS '2부 · 상품별 VOD 진도 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.vod_progress_items.pid IS '상품 id';

COMMENT ON COLUMN app.vod_progress_items.seen IS '본 강의 수';

COMMENT ON COLUMN app.vod_progress_items.done IS '끝낸 강의 수';

COMMENT ON COLUMN app.vod_progress_items.mat IS '자료 내려받은 횟수';

COMMENT ON COLUMN app.vod_progress_items.last_seen_at IS '마지막으로 본 시각(한국 시간)';

COMMENT ON TABLE app.coaches IS '2부 · 코치 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.coaches.id IS '코치 id';

COMMENT ON COLUMN app.coaches.name IS '이름';

COMMENT ON COLUMN app.coaches.status IS '상태';

COMMENT ON COLUMN app.coaches.track IS '맡은 두잉고 (live · vod)';

COMMENT ON COLUMN app.coaches.created_at IS '등록일';

COMMENT ON COLUMN app.coaches.last_login_at IS '마지막 로그인(한국 시간)';

COMMENT ON TABLE app.cohorts IS '2부 · 기수 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.cohorts.id IS '기수 id';

COMMENT ON COLUMN app.cohorts.iid IS '강사 id';

COMMENT ON COLUMN app.cohorts.name IS '기수';

COMMENT ON COLUMN app.cohorts.start_date IS '1주차 강의일';

COMMENT ON COLUMN app.cohorts.class_dow IS '요일 (0=일)';

COMMENT ON COLUMN app.cohorts.class_time IS '강의 시간';

COMMENT ON COLUMN app.cohorts.class_end IS '끝나는 시간';

COMMENT ON COLUMN app.cohorts.place IS '장소';

COMMENT ON COLUMN app.cohorts.weeks IS '주차 수';

COMMENT ON COLUMN app.cohorts.curriculum_id IS '커리큘럼';

COMMENT ON COLUMN app.cohorts.recruiting IS '모집 중';

COMMENT ON TABLE app.payouts IS '2부 · 강사 정산 지급 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.payouts.id IS 'id';

COMMENT ON COLUMN app.payouts.who IS '강사 id';

COMMENT ON COLUMN app.payouts.ym IS '정산 월';

COMMENT ON COLUMN app.payouts.st IS '상태';

COMMENT ON COLUMN app.payouts.amount IS '금액';

COMMENT ON TABLE app.products IS '2부 · 상품 (meta = 마스터 편집본 · vcat = 서버 가격표) — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.products.id IS '상품 id';

COMMENT ON COLUMN app.products.type IS '종류';

COMMENT ON COLUMN app.products.iid IS '강사 id';

COMMENT ON COLUMN app.products.title IS '이름';

COMMENT ON COLUMN app.products.status IS '상태';

COMMENT ON COLUMN app.products.price IS '정가';

COMMENT ON COLUMN app.products.sale IS '할인가';

COMMENT ON COLUMN app.products.cat IS '분류';

COMMENT ON TABLE app.coupons IS '2부 · 쿠폰 (meta · vcat) — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.coupons.id IS '쿠폰 id';

COMMENT ON COLUMN app.coupons.code IS '코드';

COMMENT ON COLUMN app.coupons.name IS '이름';

COMMENT ON COLUMN app.coupons.kind IS '할인 방식 (won · pct)';

COMMENT ON COLUMN app.coupons.value IS '할인 값';

COMMENT ON COLUMN app.coupons.days IS '쓸 수 있는 날';

COMMENT ON COLUMN app.coupons."on" IS '켜짐';

COMMENT ON TABLE app.staff IS '2부 · 운영자 · 파트너 계정 (비밀번호는 빼고) — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.staff.kind IS '구분 (staff · partner)';

COMMENT ON COLUMN app.staff.id IS 'id';

COMMENT ON COLUMN app.staff.name IS '이름';

COMMENT ON COLUMN app.staff.login_id IS '로그인 아이디';

COMMENT ON COLUMN app.staff.status IS '상태';

COMMENT ON TABLE app.partner_payouts IS '2부 · 파트너 RS 지급 — 한 줄 = 한 건 (k = 어느 문서에서 나왔는지 · i = 문서 안 순서)';

COMMENT ON COLUMN app.partner_payouts.aff_id IS '파트너 id';

COMMENT ON COLUMN app.partner_payouts.ym IS '정산 월';

COMMENT ON COLUMN app.partner_payouts.paid_at IS '지급일';

COMMENT ON TABLE app.area_state IS '2부 영역 스위치를 마지막 배포에서 어느 칸(off · dual · table · only)으로 맞췄는지';
