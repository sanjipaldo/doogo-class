/* Vercel 빌드 단계 — 데이터베이스 준비
 *  운영(production) 배포: 표 만들기 → 지금 데이터 백업 → 비어 있으면 체험 데이터 넣기
 *    → 요청받은 일회성 작업(oneoff.js, 한 번만) → 새 기본값 채우기(빠진 칸만, 저장된 내용은 그대로)
 *  미리보기 배포: 연결만 확인 (운영 데이터를 바꾸지 않음)
 *  시험용 미리보기 (DB_ROLE=staging · 미리보기 환경에 시험용 DB를 따로 연결했을 때, 2026-11 Next.js 전환 0단계):
 *    시험용 표시(oplog '__staging-db__')가 있는 DB에서만 처음 데이터 · 일회성 작업 · 기본값 채우기를 돌려요.
 *    빈 DB면 표시를 먼저 남기고 시작, 표시가 없는데 데이터가 있는 DB(운영 DB일 수 있음)면 아무것도 바꾸지 않고 빌드를 멈춰요
 * 실패하면 빌드가 멈춰서, 데이터베이스에 문제가 있을 때 잘못된 버전이 운영에 올라가지 않는다. */
"use strict";
const store = require("../api/_lib/store");
const init = require("../api/_lib/init");

(async () => {
  const onVercel = !!process.env.VERCEL;
  const pgOn = /^(supabase|postgres)$/i.test(String(process.env.DB_DRIVER || "").trim()); // DB 전환: DB_DRIVER=supabase → Supabase(Postgres)
  // 로컬에서 빌드 단계를 시험할 때만: CLASS_SQLITE 파일 (Vercel 에서는 쓰지 않아요)
  const localDb = !onVercel && !!process.env.CLASS_SQLITE;
  if (pgOn && !process.env.SUPABASE_DB_URL) { console.error("[db] DB_DRIVER=supabase 인데 SUPABASE_DB_URL 환경변수가 없어요. Vercel 환경 변수를 확인해 주세요."); process.exit(1); }
  if (!pgOn && !localDb && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) {
    if (onVercel) { console.error("[db] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수가 없어요. Vercel 프로젝트에 Turso 를 연결해 주세요."); process.exit(1); }
    console.log("[db] 데이터베이스 환경변수가 없어 건너뜁니다 (로컬)");
    return;
  }
  const prod = process.env.VERCEL_ENV === "production";
  const staging = !prod && process.env.DB_ROLE === "staging";
  // DB 전환 A3 · A5: DB_MOVE 가 있으면 다른 일보다 먼저 옮기고 확인 (실패하면 빌드가 멈춰 이 배포는 올라가지 않아요 · scripts/db-move.js)
  if (process.env.DB_MOVE) {
    const mv = await require("./db-move").runFromEnv(process.env.DB_MOVE, (s) => console.log("[db] " + s));
    console.log("[db] " + mv.text);
    if (!mv.ok) { console.error("[db] 비교가 맞지 않아 빌드를 멈춰요"); process.exit(1); }
  }
  console.log("[db] " + (pgOn ? "Supabase(Postgres)" : localDb && !process.env.TURSO_DATABASE_URL ? "로컬 SQLite" : "Turso") + " 연결 확인 중… (" + (process.env.VERCEL_ENV || "local") + ")");
  const before = await store.countDocs();
  console.log("[db] 저장된 문서 " + before + "개");
  // 운영 Supabase 가 비어 있으면 체험 데이터로 채우지 않고 멈춰요 — 데이터를 옮기기(DB_MOVE) 전에 DB_DRIVER=supabase 로 배포했을 때
  if (prod && pgOn && before === 0) { console.error("[db] 운영 Supabase 가 비어 있어요. 데이터를 옮기기 전(DB_MOVE=turso-to-supabase)에는 DB_DRIVER=supabase 로 운영 배포를 하지 않아요 — 빌드를 멈춰요"); process.exit(1); }
  // A2: Supabase 보안(공개 API 역할 막기 · 표 6개 RLS) · 사람이 읽는 보기 6개 — 배포마다 (여러 번 돌려도 같아요 · api/_lib/pgsetup.js)
  if (pgOn) { await store.pgSetup(); console.log("[db] Supabase 보안 · 보기: 공개 API 역할(anon · authenticated) 막음 · 표 6개 RLS · 보기 6개(v_orders · v_members · v_students · v_cohorts · v_bills · v_inquiries)"); }
  // DB 전환 A0: 사진 · 첨부 크기 (읽기만) · Supabase 를 아직 안 쓰는데 연결 문자열이 있으면 접속만 확인 (주소 · 비밀번호는 안 적어요 · 실패해도 빌드는 계속)
  try { const fs0 = await store.fileStats(); console.log("[db] 사진 · 첨부: " + fs0.n + "개 · 합계 " + (fs0.total / 1048576).toFixed(1) + "MB · 가장 큰 것 " + Math.round(fs0.max / 1024) + "KB"); }
  catch (e) { console.log("[db] 사진 · 첨부 크기를 못 쟀어요 (빌드는 계속)"); }
  if (!pgOn && process.env.SUPABASE_DB_URL) {
    const pr = await store.pgProbe();
    const where = (pr.region ? "지역 " + pr.region + (pr.region === "ap-northeast-2" ? "(서울)" : "") + " · " : "") + "포트 " + pr.port + (pr.port === 6543 ? "(트랜잭션 풀러)" : "");
    if (pr.ok) console.log("[db] Supabase 연결 확인: 됐어요 · Postgres " + pr.version + " · " + where + " · 왕복 " + pr.pingMs + "ms" + (pr.app ? " · app 표 있음(문서 " + pr.docs + "개)" : " · 아직 빈 DB"));
    else console.log("[db] Supabase 연결 확인 실패: " + pr.why + " · " + where + (pr.hint ? "\n[db] 고칠 곳: " + pr.hint : ""));
    if (!pr.pooler && /\.supabase\.co$/i.test(pr.host || "")) console.log("[db] 주의: 이 주소는 Supabase 전용 풀러 · 직접 연결(db.….supabase.co)이에요 — IPv6 전용이라 Vercel 에서 안 붙어요. Supabase › Connect › Transaction pooler 에서 ‘Shared Pooler’(aws-…pooler.supabase.com · 포트 6543) 주소로 바꿔 주세요");
    else if (pr.port !== 6543 || !pr.pooler) console.log("[db] 주의: Supabase › Connect › Transaction pooler(Shared Pooler) 주소(aws-…pooler.supabase.com · 포트 6543)를 넣어 주세요 — 서버 함수가 요청마다 새로 떠서 직접 연결(5432)은 연결 수가 모자랄 수 있어요");
  }
  const ro = store.readonly();
  if (ro) console.log("[db] 쓰기 멈춤(DC_READONLY=1) 중: 백업만 하고 일회성 작업 · 기본값 채우기는 건너뛰어요");
  if (!process.env.MASTER_PASSWORD) console.warn("[db] 주의: MASTER_PASSWORD 환경변수가 없어 마스터 로그인이 막혀 있어요.");
  // 포트원 결제 연결 확인 (4단계 4-2): 키가 있으면 없는 결제를 한 번 조회해 상점 아이디 · API Secret 이 맞는지만 봐요 (빌드는 멈추지 않아요 · 키 값은 안 적어요)
  try {
    const pc = await require("../api/_lib/portone").check();
    if (pc.why !== "off") console.log("[pay] 포트원 연결 " + (pc.ok ? "확인: 됐어요 (상점 아이디 · API Secret 맞음)" : "확인 실패: " + (pc.why === "unauthorized" ? "API Secret 이 틀렸거나 만료됐어요 — 포트원 › 식별코드 · API Keys 에서 새로 발급해 Vercel 에 다시 넣어 주세요" : pc.why)) + " · 결제수단 채널: " + (pc.channels.join(", ") || "없음"));
    // 결제 대조: 최근 포트원 결제 30건을 주문과 하나씩 맞춰 봐요 (읽기만 · 주문 번호 · 상태 · 금액만 적어요)
    if (pc.ok) {
      const au = await require("../api/_lib/payaudit").audit(30);
      console.log("[pay] 결제 대조: 포트원 결제 " + au.checked + "건 — 맞음 " + au.ok + " · 결제 안 끝남 " + au.open + " · 확인 필요 " + au.bad);
      au.rows.filter((r) => r.verdict !== "open").slice(0, 12).forEach((r) => console.log("[pay]   " + (r.verdict === "ok" ? "맞음" : "확인 필요") + " " + r.no + " · " + r.method + " · 주문 " + (r.status || "-") + " · 포트원 " + (r.pg || "-") + " · " + (r.amount != null ? r.amount + "원" : "") + " · " + r.why));
    }
  } catch (e) { console.log("[pay] 포트원 연결 확인을 못 했어요 (빌드는 계속)"); }
  if (!prod && !staging) { console.log("[db] 미리보기 배포라 데이터는 바꾸지 않아요."); return; }
  if (staging) {
    const MARK = "__staging-db__";
    if (!(await store.opsDone()).has(MARK)) {
      if (before > 0) { console.error("[db] DB_ROLE=staging 인데 시험용 표시가 없는 DB예요 (운영 DB일 수 있어요). 아무것도 바꾸지 않고 멈춰요 — 미리보기 환경에 시험용 DB를 연결했는지 확인해 주세요."); process.exit(1); }
      await store.opMark(MARK, "시험용 DB 표시 (미리보기 전용)");
      console.log("[db] 빈 DB라 시험용 표시를 남겼어요");
    }
    console.log("[db] 시험용 DB: 처음 데이터 · 일회성 작업 · 기본값 채우기를 돌려요 (운영 DB는 건드리지 않아요)");
  }
  const b = await store.backup("배포 전 자동 백업" + (process.env.VERCEL_GIT_COMMIT_SHA ? " (" + process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) + ")" : ""));
  console.log("[db] 배포 전 백업: " + (b ? "문서 " + b.docs + "개 · " + Math.round(b.size / 1024) + "KB" : "비어 있어 건너뜀"));
  if (ro) return;
  if (await init.ensureSeeded()) console.log("[db] 비어 있어서 체험 데이터로 시작했어요 (" + (await store.countDocs()) + "개)");
  if (staging) {
    // 운영과 같은 순서: 스토어 데이터(마스터가 스토어를 처음 열 때 생겨요)가 생긴 뒤에 일회성 작업을 돌려요
    const mt = await store.getDoc("meta"), v = mt && mt.v;
    if (!(v && v.vod && Array.isArray(v.vod.products) && v.vod.products.length)) {
      const m0 = await init.migrate();
      console.log("[db] 시험용 DB: 스토어 데이터가 아직 없어 일회성 작업은 다음 미리보기 배포 때 돌려요 (마스터로 스토어를 한 번 열어 주세요) · 기본값 채우기: " + (m0.changed.length || "바뀐 것 없음"));
      return;
    }
  }
  const ran = await init.runPendingOps((op, ok, result, n) => console.log("[db] 일회성 작업 " + op.id + " — " + op.note + ": " + (ok ? "완료" : "일부 겹쳐 다음 배포 때 다시") + " · 문서 " + n + "개 · " + JSON.stringify(result)));
  if (!ran.length) console.log("[db] 새로 할 일회성 작업 없음");
  const m = await init.migrate();
  console.log("[db] 빠진 기본값 채우기: " + (m.changed.length ? m.changed.join(", ") : "바뀐 것 없음"));
})().then(() => store.close()).catch((e) => { console.error("[db] 실패:", e && e.message ? e.message : e); process.exit(1); });
