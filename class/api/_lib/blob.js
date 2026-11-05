/* 사진 · 첨부 파일 내용 저장소 — Supabase Storage 비공개 버킷 (DB 전환 2부 B1 · 2026-11-05)
 *
 *  파일 목록 · 볼 수 있는 범위는 그대로 DB(app.files · app.file_scopes)에, 내용(바이트)만 Storage 에 둬요.
 *  주소는 예전 그대로 /api/file?h=해시 — 서버가 범위를 확인한 뒤 Storage 에서 꺼내 보내요 (버킷은 비공개 · 공개 주소 없음).
 *  DB 의 files.b64 가 '' 이면 ‘내용은 Storage 에 있어요’ 표시 (예전처럼 b64 가 차 있으면 DB 에서 바로).
 *
 *  환경 변수 (Vercel · 운영 · 미리보기 따로):
 *    SUPABASE_URL               https://<프로젝트>.supabase.co  (Supabase › Project Settings › API › Project URL)
 *    SUPABASE_SERVICE_ROLE_KEY  서버 전용 비밀 키 (Supabase › Project Settings › API Keys › secret · service_role — Sensitive 로)
 *    FILES_STORE=supabase       새로 올리는 파일을 Storage 에 (영역 스위치 · 끄면 예전처럼 DB 에 — 이미 Storage 에 있는 파일은 계속 읽어요)
 *    FILES_BUCKET               버킷 이름 (기본 class-files · 배포 때 없으면 비공개로 만들어요)
 *  의존성 없이 fetch 로 Storage REST API(/storage/v1)를 불러요. 키 · 주소는 로그에 남기지 않아요. */
"use strict";

const bucket = () => String(process.env.FILES_BUCKET || "class-files").trim();
const base = () => String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = () => String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
/** Storage 를 부를 수 있는지 (주소 + 서버 키) */
const configured = () => !!(base() && key());
/** 새로 올리는 파일을 Storage 에 둘지 (영역 스위치) */
const on = () => configured() && /^supabase$/i.test(String(process.env.FILES_STORE || "").trim());
/** 새 키(sb_secret_…)는 JWT 가 아니라 apikey 칸에만 · 예전 service_role 키(JWT)는 Authorization 에도 */
function headers(extra) {
  const k = key(), h = Object.assign({ apikey: k }, extra || {});
  if (!/^sb_/.test(k)) h.Authorization = "Bearer " + k;
  return h;
}
const objUrl = (h) => base() + "/storage/v1/object/" + encodeURIComponent(bucket()) + "/" + encodeURIComponent(h);
function fail(what, status, text) {
  const e = new Error("Storage " + what + " 실패 (" + status + ")" + (text ? ": " + String(text).replace(/https?:\/\/\S+/g, "…").slice(0, 160) : ""));
  e.code = "BLOB"; e.status = status; return e;
}
const notFound = (status, text) => status === 404 || (status === 400 && /not.?found|"statusCode":"404"/i.test(text || ""));

/** 파일 내용 올리기 (같은 해시는 같은 내용이라 덮어써도 같아요) */
async function put(h, mime, buf) {
  const r = await fetch(objUrl(h), { method: "POST", headers: headers({ "Content-Type": mime || "application/octet-stream", "x-upsert": "true", "cache-control": "max-age=31536000" }), body: buf });
  if (!r.ok) throw fail("올리기", r.status, await r.text().catch(() => ""));
  return true;
}
/** 파일 내용 꺼내기 → Buffer | null (없으면) */
async function get(h) {
  const r = await fetch(objUrl(h), { method: "GET", headers: headers() });
  if (r.ok) return Buffer.from(await r.arrayBuffer());
  const t = await r.text().catch(() => "");
  if (notFound(r.status, t)) return null;
  throw fail("읽기", r.status, t);
}
/** 파일 내용 지우기 (되돌리기 시험 · 정리용) */
async function del(hs) {
  if (!hs.length) return 0;
  const r = await fetch(base() + "/storage/v1/object/" + encodeURIComponent(bucket()), { method: "DELETE", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ prefixes: hs }) });
  if (!r.ok) throw fail("지우기", r.status, await r.text().catch(() => ""));
  return hs.length;
}
/** 버킷 확인 — 없으면 비공개로 만들어요 (배포 때 · 여러 번 돌려도 같아요) → { created, public } */
async function ensureBucket() {
  const id = bucket();
  const g = await fetch(base() + "/storage/v1/bucket/" + encodeURIComponent(id), { method: "GET", headers: headers() });
  if (g.ok) { const j = await g.json().catch(() => ({})); return { created: false, public: !!j.public, id }; }
  const t = await g.text().catch(() => "");
  if (!notFound(g.status, t)) throw fail("버킷 확인", g.status, t);
  const c = await fetch(base() + "/storage/v1/bucket", { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ id, name: id, public: false, file_size_limit: 5 * 1024 * 1024 }) });
  if (!c.ok) throw fail("버킷 만들기", c.status, await c.text().catch(() => ""));
  return { created: true, public: false, id };
}

module.exports = { configured, on, put, get, del, ensureBucket, bucket };
