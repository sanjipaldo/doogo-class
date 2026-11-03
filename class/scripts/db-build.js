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
  // 로컬에서 빌드 단계를 시험할 때만: CLASS_SQLITE 파일 (Vercel 에서는 쓰지 않아요)
  const localDb = !onVercel && !!process.env.CLASS_SQLITE;
  if (!localDb && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) {
    if (onVercel) { console.error("[db] TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 환경변수가 없어요. Vercel 프로젝트에 Turso 를 연결해 주세요."); process.exit(1); }
    console.log("[db] 데이터베이스 환경변수가 없어 건너뜁니다 (로컬)");
    return;
  }
  const prod = process.env.VERCEL_ENV === "production";
  const staging = !prod && process.env.DB_ROLE === "staging";
  console.log("[db] Turso 연결 확인 중… (" + (process.env.VERCEL_ENV || "local") + ")");
  const before = await store.countDocs();
  console.log("[db] 저장된 문서 " + before + "개");
  if (!process.env.MASTER_PASSWORD) console.warn("[db] 주의: MASTER_PASSWORD 환경변수가 없어 마스터 로그인이 막혀 있어요.");
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
})().catch((e) => { console.error("[db] 실패:", e && e.message ? e.message : e); process.exit(1); });
