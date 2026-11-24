/* 두고클래스 서버 테스트 — 진짜 토스페이먼츠 · 카카오 대신 가짜 응답(fetch 바꿔치기)으로
 * 결제 · 취소 · 환불 · 웹훅 · 카카오 로그인 · 문서 공개 범위 · 쓰기 권한을 확인해요.
 *   node scripts/vod-test.js   (class/ 에서) — 저장소는 임시 SQLite 파일 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const ROOT = path.join(__dirname, ".."), TMP = fs.mkdtempSync(path.join(os.tmpdir(), "vodtest-"));
/** 배포 때 서버 함수에 함께 싣는 파일 (class/ 기준 glob) — Next.js(1단계~): next.config.js INCLUDE · 예전 정적 배포: vercel.json includeFiles */
function deployIncludes() {
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "vercel.json"), "utf8"));
  const inc = String(((vj.functions || {})["api/*.js"] || {}).includeFiles || ""), m = inc.match(/^class\/\{(.+)\}$/);
  if (m) return m[1].split(",");
  const nc = path.join(ROOT, "..", "next.config.js");
  return fs.existsSync(nc) ? (require(nc).INCLUDE || []).filter((g) => /^class\//.test(g)).map((g) => g.slice(6)) : [];
}
fs.cpSync(path.join(ROOT, "api"), path.join(TMP, "class/api"), { recursive: true });
fs.cpSync(path.join(ROOT, "data.js"), path.join(TMP, "class/data.js")); fs.cpSync(path.join(ROOT, "db.js"), path.join(TMP, "class/db.js")); fs.cpSync(path.join(ROOT, "coach-perms.js"), path.join(TMP, "class/coach-perms.js")); fs.cpSync(path.join(ROOT, "shared"), path.join(TMP, "class/shared"), { recursive: true });
fs.mkdirSync(path.join(TMP, "class/scripts")); ["db-build.js", "files-move.js"].forEach((f) => fs.cpSync(path.join(ROOT, "scripts", f), path.join(TMP, "class/scripts", f))); // 2부 B1: 빌드 단계 · 파일 옮기기 (같은 저장소 모듈)
fs.symlinkSync(path.join(ROOT, "..", "node_modules"), path.join(TMP, "node_modules"), "dir"); // 공식 SDK (저장소 맨 위 npm install)
Object.assign(process.env, { CLASS_SQLITE: path.join(TMP, "t.db"), SESSION_SECRET: "test-session", VOD_SERVER_AUTH: "1", TOSS_CLIENT_KEY: "test_ck_dctest", TOSS_SECRET_KEY: "test_sk_dctest", KAKAO_REST_KEY: "rest-test", KAKAO_CLIENT_SECRET: "cs-test", KAKAO_REDIRECT_URI: "https://www.doogoclass.com/api/vod-kakao", KAKAO_ADMIN_KEY: "admin-test" });
const API = (n) => require(path.join(TMP, "class/api", n + ".js"));
const auth = require(path.join(TMP, "class/api/_lib/auth.js"));

// ---------- 가짜 외부 서버 ----------
const PG = {}, TIDEM = {}, AMT = {}, calls = [], PAY = [], AI = { reqs: [], next: null }, SOL = [], RES = [], VDC = [];
// 2부 B1: 가짜 Supabase Storage (새 키 sb_secret_… · 예전 service_role JWT 키 둘 다)
const FAKE_ST = require(path.join(ROOT, "scripts/fake-storage.js")), FS38 = FAKE_ST.make("sb_secret_test38"), FSJ = FAKE_ST.make("eyJhbGciOi.legacy.jwt38");
let kakaoUser = null;
global.fetch = async (url, opt) => {
  opt = opt || {}; const u = new URL(url); calls.push(opt.method === "POST" ? "POST " + u.host + u.pathname : "GET " + u.host + u.pathname);
  const J = (status, j) => ({ ok: status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
  // 가짜 토스페이먼츠 (공식 문서 2026-11 모양) — PG[orderId] = 결제창 인증까지 끝난 결제(Payment). 승인하면 _st(DONE · 가상계좌는 WAITING_FOR_DEPOSIT)로 바뀌어요
  //  같은 멱등키(Idempotency-Key)로 다시 보내면 첫 응답(오류도)을 그대로 돌려줘요 (토스와 같게)
  if (u.host === "api.tosspayments.com") {
    const h = opt.headers || {}, idem = h["Idempotency-Key"], ik = idem ? opt.method + " " + u.pathname + " " + idem : "";
    if (h.Authorization !== "Basic " + Buffer.from("test_sk_dctest:").toString("base64")) return J(401, { code: "UNAUTHORIZED_KEY", message: "인증되지 않은 시크릿 키 혹은 클라이언트 키 입니다." });
    if (ik && TIDEM[ik]) return J(TIDEM[ik][0], JSON.parse(TIDEM[ik][1]));
    const R = (status, j) => { if (ik) TIDEM[ik] = [status, JSON.stringify(j)]; return J(status, JSON.parse(JSON.stringify(j))); };
    const b = opt.body ? JSON.parse(opt.body) : {}, byKey = (k) => Object.keys(PG).map((x) => PG[x]).find((p) => p.paymentKey === k);
    const NF = { code: "NOT_FOUND_PAYMENT", message: "존재하지 않는 결제 정보 입니다." };
    if (opt.method === "POST" && u.pathname === "/v1/payments/confirm") {
      const p = PG[b.orderId];
      if (!p || p.paymentKey !== b.paymentKey) return R(404, { code: "NOT_FOUND_PAYMENT_SESSION", message: "결제 시간이 만료되어 결제 진행 데이터가 존재하지 않습니다." });
      if (p.status !== "IN_PROGRESS") return R(400, { code: "ALREADY_PROCESSED_PAYMENT", message: "이미 처리된 결제 입니다." });
      if (p.reject) { p.status = "ABORTED"; return R(p.reject[0], { code: p.reject[1], message: p.reject[2] }); }
      if (b.amount !== p.totalAmount) return R(400, { code: "INVALID_REQUEST", message: "결제 금액이 인증된 금액과 달라요. (시험)" });
      Object.assign(p, { status: p._st, approvedAt: p._st === "DONE" ? new Date().toISOString() : null });
      return R(200, p);
    }
    let m = u.pathname.match(/^\/v1\/payments\/orders\/([^/]+)$/);
    if (opt.method !== "POST" && m) return PG[decodeURIComponent(m[1])] ? R(200, PG[decodeURIComponent(m[1])]) : R(404, NF);
    m = u.pathname.match(/^\/v1\/payments\/([^/]+)(\/cancel)?$/);
    const p = m && byKey(decodeURIComponent(m[1]));
    if (!m) return J(404, NF);
    if (!m[2]) return p ? R(200, p) : R(404, NF);
    if (!p) return R(404, NF);
    if (p.failCancel) return R(400, { code: "FAILED_REFUND_PROCESS", message: "은행 응답시간 지연이나 일시적인 오류로 환불요청에 실패했습니다. (시험)" });
    if (p.status === "CANCELED") return R(400, { code: "ALREADY_CANCELED_PAYMENT", message: "이미 취소된 결제 입니다." });
    if (p.status === "WAITING_FOR_DEPOSIT") { // 입금 전 가상계좌: 전액 취소만 (환불 계좌 없이) → 발급 계좌가 닫혀요
      if (b.cancelAmount != null && b.cancelAmount !== p.balanceAmount) return R(400, { code: "NOT_CANCELABLE_AMOUNT", message: "취소 할 수 없는 금액 입니다." });
      Object.assign(p, { status: "CANCELED", closed: true, cancels: (p.cancels || []).concat([{ transactionKey: "ctx_" + calls.length, cancelAmount: p.totalAmount, cancelReason: b.cancelReason, canceledAt: new Date().toISOString(), cancelStatus: "DONE" }]) });
      return R(200, p);
    }
    if (p.method === "가상계좌" && !b.refundReceiveAccount) return R(400, { code: "INVALID_REFUND_ACCOUNT_INFO", message: "입금된 가상계좌 결제는 환불 계좌가 있어야 취소할 수 있어요. (시험)" });
    const amt = b.cancelAmount != null ? b.cancelAmount : p.balanceAmount;
    if (!(amt > 0) || amt > p.balanceAmount) return R(400, { code: "NOT_CANCELABLE_AMOUNT", message: "취소 할 수 없는 금액 입니다." });
    const cst = p.cancelSt || "DONE";
    p.cancels = (p.cancels || []).concat([{ transactionKey: "ctx_" + calls.length, cancelAmount: amt, cancelReason: b.cancelReason, canceledAt: new Date().toISOString(), cancelStatus: cst }]);
    if (cst !== "ABORTED") {
      p.balanceAmount -= amt; p.status = p.balanceAmount > 0 ? "PARTIAL_CANCELED" : "CANCELED";
      if (b.refundReceiveAccount && p.virtualAccount) p.virtualAccount.refundStatus = "PENDING";
      p.lastCancel = { amount: amt, refundAccount: b.refundReceiveAccount || null };
      if (p.onCancel) await p.onCancel();
    }
    return R(200, p);
  }
  if (u.host === "st38.supabase.test") return FS38.fetchLike(url, opt);
  if (u.host === "jwt38.supabase.test") return FSJ.fetchLike(url, opt);
  if (u.host === "down38.supabase.test") return J(500, { statusCode: "500", error: "internal" });
  if (u.host === "kauth.kakao.com") return J(200, { access_token: "at-" + opt.body.match(/code=([^&]+)/)[1] });
  if (u.host === "kapi.kakao.com") {
    if (u.pathname === "/v2/user/me") return J(200, kakaoUser);
    if (u.pathname === "/v2/user/service_terms") return J(200, { service_terms: [{ tag: "marketing", agreed: true }] });
    if (u.pathname === "/v2/api/talk/channels") return J(200, { channels: [{ relation: "ADDED" }] });
    if (u.pathname === "/v1/user/unlink") return J(200, { id: 1 });
  }
  // 영상 길이: 비메오 oEmbed · 유튜브 영상 페이지 · 유튜브 Data API
  if (u.host === "vimeo.com" && u.pathname === "/api/oembed.json") { const id = ((u.searchParams.get("url") || "").match(/vimeo\.com\/(\d+)/) || [])[1]; VDC.push("vm " + id + " " + ((opt.headers || {}).Referer || "")); return id === "111111111" ? J(404, {}) : J(200, { type: "video", duration: 1470 }); }
  if (u.host === "www.youtube.com" && u.pathname === "/watch") { const id = u.searchParams.get("v"); VDC.push("yt " + id); return { ok: true, status: 200, text: async () => '<script>var a={"videoDetails":{"videoId":"' + id + '","lengthSeconds":"212"}}</script>' }; }
  if (u.host === "www.googleapis.com") { VDC.push("api " + u.searchParams.get("id")); return J(200, { items: u.searchParams.get("id").split(",").map((id) => ({ id, contentDetails: { duration: "PT1H2M3S" } })) }); }
  if (u.host === "challenges.cloudflare.com") return J(200, { success: /ts=ok|response=ok/.test(opt.body) });
  if (u.host === "api.solapi.com") { const h = opt.headers || {}, b = JSON.parse(opt.body || "{}"); SOL.push({ path: u.pathname, auth: h.Authorization || "", body: b }); return J(200, { groupInfo: { _id: "G" + SOL.length }, failedMessageList: [] }); }
  if (u.host === "api.resend.com") { const h = opt.headers || {}, b = JSON.parse(opt.body || "[]"); RES.push({ path: u.pathname, auth: h.Authorization || "", body: b }); return J(200, { data: b.map((x, i) => ({ id: "em" + i })) }); }
  if (u.host === "api.anthropic.com") {
    const h = opt.headers instanceof Headers ? Object.fromEntries(opt.headers.entries()) : opt.headers || {};
    AI.reqs.push({ path: u.pathname, h, body: JSON.parse(opt.body || "{}") });
    const n = AI.next || { status: 200, body: { id: "msg_t", type: "message", role: "assistant", content: [{ type: "text", text: "운송료는 1kg까지 $16이에요." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } } };
    return new Response(JSON.stringify(n.body), { status: n.status, headers: { "content-type": "application/json" } });
  }
  if (u.host === "api.payaction.app") { const h = opt.headers || {}; PAY.push({ path: u.pathname, body: JSON.parse(opt.body || "{}"), key: h["x-api-key"], mall: h["x-mall-id"] }); return J(200, h["x-api-key"] === "pa-key" ? { status: "success", response: {} } : { status: "error", response: { message: "bad key" } }); }
  return J(404, {});
};
// ---------- 가짜 요청 · 응답 ----------
const jar = {};
function call(name, { method = "POST", body, query = {}, headers = {}, raw } = {}) {
  return new Promise((done) => {
    const ck = Object.keys(jar).map((k) => k + "=" + encodeURIComponent(jar[k])).join("; ");
    const req = { method, url: "/api/" + name, query, headers: Object.assign({ host: "www.doogoclass.com", cookie: ck, "x-forwarded-for": "1.2.3.4" }, headers), body: raw != null ? undefined : body, rawBody: raw, socket: {} };
    const hd = {}; const res = { statusCode: 200, headersSent: false, setHeader(k, v) { hd[k.toLowerCase()] = v; }, getHeader(k) { return hd[k.toLowerCase()]; },
      end(s) { [].concat(hd["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1)); if (v) jar[k] = v; else delete jar[k]; }); let j = null; try { j = JSON.parse(s); } catch (e) {} if (name === "vod-pay" && body && body.action === "prepare" && j && j.paymentId) AMT[j.paymentId] = j.amount; done({ status: this.statusCode, json: j, location: hd.location, headers: hd, body: s }); } };
    API(name)(req, res);
  });
}
let pass = 0, failN = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log("  ✓ " + label); } else { failN++; console.log("  ✗ " + label, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } };
/** 결제창 인증이 끝난 토스 결제 (카드 · 승인 전 IN_PROGRESS) — x 로 결제수단 · 승인 뒤 상태(_st)를 바꿔요 · 부를 때마다 새 결제 키 */
let tpN = 0;
const paidLike = (oid, total, x) => { PG[oid] = Object.assign({ mId: "tosstest", paymentKey: "tpk_" + oid + "_" + ++tpN, orderId: oid, orderName: "시험 주문", status: "IN_PROGRESS", _st: "DONE", method: "카드", totalAmount: total, balanceAmount: total, currency: "KRW", requestedAt: new Date().toISOString(), approvedAt: null, lastTransactionKey: "tx_" + oid,
  card: { issuerCode: "41", number: "12345678****123*", installmentPlanMonths: 0, approveNo: "00001234", amount: total }, easyPay: null, transfer: null, virtualAccount: null, receipt: { url: "https://r/" + oid }, cancels: null, secret: null }, x || {}); return PG[oid]; };
/** 이미 승인된 결제 (주문을 직접 만들어 넣는 시험용) */
const approvedLike = (oid, total, x) => Object.assign(paidLike(oid, total, x), { status: "DONE", approvedAt: new Date().toISOString() });
/** 가상계좌 (승인하면 입금 대기 · 입금 기한은 한국 시각 · 오프셋 없는 모양) */
const vaLike = (oid, total, bank, account, due) => paidLike(oid, total, { method: "가상계좌", _st: "WAITING_FOR_DEPOSIT", card: null, receipt: null, secret: "ps_" + oid, virtualAccount: { accountType: "일반", accountNumber: account, bankCode: bank, customerName: "가상OO", dueDate: due, refundStatus: "NONE", expired: false, settlementStatus: "INCOMPLETED" } });
/** 가상계좌 입금 (토스 쪽 상태만 — 우리 서버는 웹훅 · 조회로 알아요) */
const deposit = (oid) => Object.assign(PG[oid], { status: "DONE", approvedAt: new Date().toISOString(), receipt: { url: "https://r/" + oid } });
/** 결제창에서 돌아왔을 때 보내는 승인 요청 (successUrl ?paymentKey&orderId&amount) */
const cpl = (oid, x) => Object.assign({ action: "complete", paymentId: oid, paymentKey: PG[oid] ? PG[oid].paymentKey : "tpk_" + oid + "_none", amount: AMT[oid] }, x || {});
/** 환불 계좌 은행 코드 (shared/refund.js) */
const RF_BANK = (R) => R.bankCode("06") === "06" && R.bankCode("KOOKMIN") === "06" && R.bankCode("004") === "06" && R.bankCode("toss") === "92" && R.bankCode("SC") === "23" && R.bankCode("ZZ") === "" && R.bankCode("") === "" && R.bankName("90") === "카카오뱅크" && R.bankName("KAKAO") === "카카오뱅크" && R.bankName("??") === "??" && R.BANKS.every((b) => /^[0-9]{2}$/.test(b[0]));
/** 토스 웹훅 (POST /api/vod-pay?hook=toss) — 결제 상태 변경 · 가상계좌 입금 */
const hook = (b) => call("vod-pay", { query: { hook: "toss" }, body: b });
const hookPay = (oid, data) => hook({ eventType: "PAYMENT_STATUS_CHANGED", createdAt: new Date().toISOString(), data: Object.assign(JSON.parse(JSON.stringify(PG[oid])), data || {}) });
const hookDeposit = (oid, secret) => hook({ createdAt: new Date().toISOString(), secret: secret != null ? secret : PG[oid].secret, status: PG[oid].status, transactionKey: "dtx_" + oid, orderId: oid });

(async () => {
  // TEST_DB=pg: 같은 시험을 Postgres(PGlite · 운영 Supabase 와 같은 postgres 드라이버 · 같은 SQL)로 — DB 전환 1부 A1
  //   설치(한 번): npm --prefix class/scripts/pg ci  ·  실행: TEST_DB=pg node scripts/vod-test.js
  if (process.env.TEST_DB === "pg") {
    const pgT = await require(path.join(ROOT, "scripts/pg/server.js")).start();
    delete process.env.CLASS_SQLITE;
    Object.assign(process.env, { DB_DRIVER: "supabase", SUPABASE_DB_URL: pgT.url });
    console.log("저장소: Postgres (PGlite 시험용 · " + pgT.url.replace(/\/\/[^@]+@/, "//") + ")");
  }
  await require(path.join(TMP, "class/api/_lib/init.js")).ensureSeeded(); // 실제 서버처럼 두잉고 기본 데이터(meta · 강사)부터
  console.log("1) 설정 · 카탈로그");
  let r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.auth && r.json.cfg.kakao && r.json.cfg.toss && r.json.cfg.toss.ck === "test_ck_dctest" && r.json.cfg.toss.mode === "window" && r.json.cfg.toss.test === true && r.json.cfg.toss.live === false && r.json.cfg.toss.methods.join() === "card,vbank" && !JSON.stringify(r.json).includes("test_sk_dctest") && !JSON.stringify(r.json).includes("cs-test"),
    "config: 토스 클라이언트 키(공개 값) · 결제창 방식 · 결제수단(기본 카드 · 가상계좌 — 퀵계좌이체 없음)만 · 시크릿 키 · 비밀 값 없음", r.json);
  r = await call("vod-pay", { body: { action: "catalog", catalog: { products: [] } } });
  ok(r.status === 403, "카탈로그: 마스터만", r.json);
  jar.dc_a = auth.sign({ r: "master" });
  const ev = new Date(Date.now() + 10 * 864e5 + 9 * 3600e3).toISOString().slice(0, 16);
  r = await call("vod-pay", { body: { action: "catalog", catalog: { products: [
    { id: "v5", title: "챗GPT로 블로그 수익화", type: "vod", status: "on", price: 89000, sale: 59000, saleEnd: "", dg: true, iid: "choi" },
    { id: "v10", title: "전자책", type: "ebook", status: "on", price: 39000, sale: 29000 },
    { id: "v12", title: "AI 굿즈 LIVE", type: "live", status: "on", price: 59000, sale: 49000, eventAt: ev, seats: 1 },
    { id: "v9", title: "오픈 예정", type: "vod", status: "soon", price: 199000 }],
    coupons: [{ id: "cp-welcome", code: "WELCOME", name: "신규 5천", kind: "won", value: 5000, days: 30, auto: "signup", on: true }, { id: "cp-eb", code: "EBOOK20", name: "전자책 20%", kind: "pct", value: 20, days: 14, types: ["ebook"], on: true }, { id: "cp-dl", name: "내려받기 1만", kind: "won", value: 10000, min: 50000, dl: true, on: true }, { id: "cp-off", code: "OFF", name: "끈 쿠폰", kind: "won", value: 1000, on: false }],
    settings: { coach: { n: 5, days: 180, price: 150000 }, refund: { instant: true, days: 7, maxUsed: 0 } }, biz: {} } } });
  ok(r.json.ok && r.json.n === 4, "카탈로그 저장 (마스터)", r.json);
  delete jar.dc_a;

  console.log("2) 이메일 가입 · 로그인");
  r = await call("vod-auth", { body: { action: "signup", email: "a@example.com", pw: "short", name: "가OO", phone: "010-0000-1111", agree: true } });
  ok(r.status === 400 && /8자/.test(r.json.message), "약한 비밀번호 거절", r.json);
  r = await call("vod-auth", { body: { action: "signup", email: "a@example.com", pw: "test1234a", pw2: "test1234a", name: "가OO", phone: "010-0000-1111", agree: true, mkt: true, src: { s: "youtube", c: "t" } } });
  ok(r.json.ok && r.json.member.coupons.length === 1 && !r.json.member.pwHash && jar.dc_v, "가입 → 쿠폰 1장 · 비밀번호는 안 보냄 · 로그인 쿠키", r.json);
  const mc = r.json.member.coupons[0].id;
  r = await call("vod-auth", { body: { action: "signup", email: "a@example.com", pw: "test1234a", name: "x", phone: "010-0000-1111", agree: true } });
  ok(r.status === 409, "같은 이메일 두 번 가입 막기");
  delete jar.dc_v;
  for (let i = 0; i < 8; i++) await call("vod-auth", { body: { action: "login", email: "a@example.com", pw: "wrong-pw1" } });
  r = await call("vod-auth", { body: { action: "login", email: "a@example.com", pw: "test1234a" } });
  ok(r.status === 429, "8번 틀리면 잠시 막기", r.json);
  const store = require(path.join(TMP, "class/api/_lib/store.js")); await store.rlClear(["vem:a@example.com"]);
  r = await call("vod-auth", { body: { action: "login", email: "a@example.com", pw: "test1234a" } });
  ok(r.json.ok && jar.dc_v, "로그인", r.json);

  console.log("2-1) 쿠폰 받기 (서버에 저장)");
  r = await call("vod-pay", { body: { action: "claim", code: "ebook20" } });
  ok(r.json.ok && r.json.member.coupons.length === 2 && !("notes" in r.json.member) && !("pwHash" in r.json.member), "쿠폰 코드 등록 (소문자도) · 운영 메모 · 비밀번호는 안 보냄", r.json);
  r = await call("vod-pay", { body: { action: "claim", code: "EBOOK20" } });
  ok(r.status === 409 && /이미/.test(r.json.message), "같은 쿠폰 두 번 받기 막기");
  r = await call("vod-pay", { body: { action: "claim", code: "OFF" } });
  ok(r.status === 404, "꺼진 쿠폰 코드 거절");
  r = await call("vod-pay", { body: { action: "claim", cid: "cp-eb" } });
  ok(r.status === 404, "코드 쿠폰은 ‘쿠폰 받기’로 못 받음 (내려받기 쿠폰만)");
  r = await call("vod-pay", { body: { action: "claim", cid: "cp-dl" } });
  ok(r.json.ok && r.json.member.coupons.length === 3, "상세 페이지 ‘쿠폰 받기’", r.json);
  const ebc = r.json.member.coupons.find((x) => x.cid === "cp-eb").id;

  console.log("3) 결제 준비 · 완료 (서버가 금액 계산)");
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, coach: true, mcid: mc, points: 0, method: "card", expect: 1000 } });
  ok(r.status === 409 && /가격/.test(r.json.message), "화면 금액과 다르면 거절 (위변조 · 가격 변경)", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, coach: true, mcid: mc, points: 0, method: "card", expect: 210000 } });
  ok(r.json.ok && r.json.amount === 210000 && r.json.paymentId, "365일 65,000 + 코칭권 150,000 − 쿠폰 5,000 = 210,000원", r.json);
  const p1 = r.json.paymentId, no1 = r.json.no;
  r = await call("vod-pay", { body: cpl(p1) });
  ok(!r.json.ok, "토스에 결제(인증)가 없으면 완료 안 됨", r.json);
  const nCf = () => calls.filter((c) => c === "POST api.tosspayments.com/v1/payments/confirm").length, cf0 = nCf();
  r = await call("vod-pay", { body: cpl(p1, { amount: 1000 }) });
  ok(r.status === 409 && /금액/.test(r.json.message) && nCf() === cf0, "돌아온 주소의 금액(amount)이 서버가 정한 금액과 다르면 토스에 승인 요청 없이 거절", r.json);
  paidLike(p1, 200000);
  r = await call("vod-pay", { body: cpl(p1) });
  ok(!r.json.ok && /금액/.test(r.json.message), "결제창에서 인증한 금액이 다르면 완료 안 됨", r.json);
  paidLike(p1, 210000);
  r = await call("vod-pay", { body: cpl(p1) });
  ok(r.json.ok && r.json.orders.length === 2 && r.json.orders.every((o) => o.status === "paid"), "완료: 수강권 + 코칭권 주문 2건 paid", r.json);
  r = await call("vod-pay", { body: cpl(p1) });
  ok(r.json.ok, "같은 결제를 두 번 확인해도 그대로 (중복 처리 없음)");
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.coupons[0].usedAt, "쿠폰은 결제 확인 뒤 사용 처리", r.json.member.coupons);

  console.log("4) 바로 취소 (7일 · 미수강) · 수강했으면 거절");
  r = await call("vod-pay", { body: { action: "track", pid: "v5", lid: "v5-l1-1", ev: "seen" } });
  ok(r.json.ok, "강의 열기 기록");
  r = await call("vod-pay", { body: { action: "cancel", no: no1 } });
  ok(r.status === 409 && /1개/.test(r.json.message), "강의를 1개 열었으면 바로 취소 안 됨", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", mcid: ebc, expect: 23200 } });
  ok(r.json.ok && r.json.amount === 23200, "전자책 29,000원 − 전자책 20% 쿠폰 = 23,200원", r.json);
  const p2 = r.json.paymentId, no2 = r.json.no; paidLike(p2, 23200);
  r = await call("vod-pay", { body: cpl(p2) });
  r = await call("vod-pay", { body: { action: "cancel", no: no2 } });
  ok(r.json.ok && r.json.amount === 23200 && PG[p2].status === "CANCELED" && PG[p2].lastCancel.amount === 23200, "전자책 내려받기 전 → 토스 결제 전액 취소", r.json);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(!r.json.member.coupons.find((x) => x.cid === "cp-eb").usedAt, "바로 취소하면 쓴 쿠폰을 돌려받음", r.json.member.coupons);
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.no === no2).status === "refunded" && r.json.orders.find((o) => o.no === no2).refundKind === "instant", "주문 refunded · 회원 바로 취소로 기록");

  console.log("4-1) 환불 규칙 (화면 · 서버 같은 공용 모듈) · 두 번 눌러도 한 번만 · 토스 취소가 실패하면 그대로");
  { const RFS = require(path.join(ROOT, "shared/refund.js")), T0 = Date.parse("2026-11-05T00:00:00Z"), D = 864e5;
    const rq = (o, x) => RFS.instant(Object.assign({ o: Object.assign({ status: "paid", amount: 10000, kind: "course", paidAt: T0, method: "card", pg: { st: "paid" } }, o), type: "vod", used: 0, now: T0 + D, srv: true }, x || {}), RFS.RF_DEF);
    const tp = { pg: { pv: "toss", st: "paid", paymentKey: "tpk_x" } };
    ok(rq(tp).ok && rq(tp).left === 6 && rq(tp).way === "pg" && !rq(tp).acct, "공용 규칙: 토스 카드 결제 · 1일째 · 재생 전 → 바로 100% 취소 (6일 남음)", rq(tp));
    ok(rq(Object.assign({ method: "naver" }, tp)).way === "pg" && rq(Object.assign({ method: "kakao" }, tp)).way === "pg" && !rq({}).ok && rq({}).way === "none", "공용 규칙: 네이버페이 · 카카오페이도 토스 결제 취소로 바로 · 토스 결제 키가 없는 PG 주문(예전 포트원 시험 결제)은 환불 요청으로", rq({}));
    ok(!rq(tp, { used: 1 }).ok && /1개/.test(rq(tp, { used: 1 }).why), "공용 규칙: 강의를 하나라도 재생했으면 바로 취소 안 돼요", rq(tp, { used: 1 }));
    ok(rq(tp, { now: T0 + 7 * D - 1 }).ok && !rq(tp, { now: T0 + 7 * D }).ok && /7일/.test(rq(tp, { now: T0 + 7 * D }).why), "공용 규칙: 결제 후 7일이 지나면 바로 취소(버튼)가 없어져요");
    const tv = { method: "vbank", pg: { pv: "toss", st: "paid", paymentKey: "tpk_v" } };
    ok(rq({ method: "bank", pg: { st: "bank" } }).ok && rq({ method: "bank", pg: { st: "bank" } }).way === "bank" && rq({ method: "bank" }).acct && rq(tv).way === "vbank" && rq(tv).acct && rq({ method: "vbank" }).way === "none", "공용 규칙: 무통장 · 토스 가상계좌도 바로 취소 (환불 받을 계좌 필요)");
    ok(!rq({ pg: { st: "mock" } }).ok && rq({ pg: { st: "mock" } }, { srv: false }).ok && rq({ pg: { st: "mock" } }, { srv: false }).way === "mock", "공용 규칙: 정식 서버에서 토스 결제가 아닌 카드 주문은 환불 요청 · 서버 없는 시안은 바로");
    ok(!rq(Object.assign({ refundReq: { at: 1 } }, tp)).ok && !rq(Object.assign({ status: "refunded" }, tp)).ok && !rq(Object.assign({ amount: 0 }, tp)).ok && !rq(Object.assign({ kind: "coach" }, tp)).ok && !rq(tp, { type: "" }).ok, "공용 규칙: 환불 요청 중 · 이미 환불 · 0원 · 코칭권 · 상품 없음은 바로 취소 대상 아님");
    ok(RF_BANK(RFS), "공용 규칙: 환불 계좌 은행 = 토스 은행 코드 두 자리 (예전 영문 · 세 자리 코드도 토스 코드로 · 모르는 코드는 빈 값)");
    ok(RFS.startEnds(rq(tp), RFS.RF_DEF, false) && !RFS.startEnds(rq(tp), RFS.RF_DEF, true) && !RFS.startEnds(rq(tp, { used: 1 }), RFS.RF_DEF, false) && !RFS.startEnds(rq(tp, { used: 1 }), Object.assign({}, RFS.RF_DEF, { maxUsed: 2 }), false) && !RFS.startEnds(rq(tp, { type: "book" }), RFS.RF_DEF, false), "공용 규칙: 처음 여는 강의면 ‘시작하면 100% 환불이 끝나요’ 안내 (이미 연 강의 · 이미 재생 · N개까지 허용 · 종이책은 안내 없음)");
    const vsrc = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), ssrc = fs.readFileSync(path.join(ROOT, "api/_lib/vod.js"), "utf8");
    ok(/RFX\.instant\(/.test(vsrc) && /require\("\.\.\/\.\.\/shared\/refund"\)/.test(ssrc) && /RF\.instant\(/.test(ssrc) && /<script src="shared\/refund\.js"><\/script>/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")), "화면 · 서버가 같은 환불 규칙 모듈(shared/refund.js)을 써요");
    ok(/startGate\(m\.id, pid, cur\.id\)/.test(vsrc) && /markDone\(m\.id, t\.dataset\.p, t\.dataset\.l\)/.test(vsrc) && /if \(!gate\) \{ markLast\(m\.id, pid, cur\.id\)/.test(vsrc), "VOD 강의실: 강의를 열면(시작하면) · 완료하면 서버 기록(vp:)에도 남겨요 — 바로 취소 판단이 화면과 같게");
    ok(RFS.usedOf(null) === 0 && RFS.usedOf({ last: "a" }) === 1 && RFS.usedOf([{ seen: { a: 1 } }, { done: { b: true }, last: "a", mat: 1 }], RFS.RF_DEF) === 3 && RFS.usedOf([{ mat: 2 }], Object.assign({}, RFS.RF_DEF, { matCounts: false })) === 0, "공용 규칙: 들은 강의 = 연 강의 · 완료한 강의 · 마지막으로 연 강의 (+ 자료 내려받기) — 서버 기록과 화면 기록을 합쳐 세요");
    ok(/function srvTrack\(pid, lid, ev\) \{ if \(!pid \|\| !remoteOn\(\)\) return; loadCfg\(\)\.then\(/.test(vsrc) && /RF\.usedOf\(\[\(sp \|\| \{\}\)\[pid\], \(\(m && m\.prog\) \|\| \{\}\)\[pid\]\], rf\)/.test(ssrc), "재생 기록: 두잉고 강의실로 바로 들어와도 서버 설정을 먼저 받고 보내요 · 서버는 화면 기록(vm: prog)도 함께 봐요");
  }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", expect: 29000 } });
  const pL = r.json.paymentId, noL = r.json.no; paidLike(pL, 29000);
  r = await call("vod-pay", { body: cpl(pL) });
  PG[pL].failCancel = true;
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  let oL = (await store.getDoc("vo:" + noL)).v;
  ok(r.status === 502 && /실패했어요/.test(r.json.message) && oL.status === "paid" && !oL.rfLock && PG[pL].status === "DONE", "토스 취소가 실패하면 주문은 결제 완료 그대로 · 잠금도 풀려 다시 시도할 수 있어요", { st: r.status, json: r.json, o: oL.status, lock: oL.rfLock });
  delete PG[pL].failCancel;
  { const d0 = await store.getDoc("vo:" + noL); await store.writeDoc("vo:" + noL, Object.assign({}, d0.v, { rfLock: Date.now() }), d0.ver); }
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  ok(r.status === 409 && /처리하고/.test(r.json.message) && PG[pL].status === "DONE", "같은 주문을 처리하는 중이면(두 번 누름) 두 번째는 막아요 — 토스 취소는 한 번만", r.json);
  { const d0 = await store.getDoc("vo:" + noL); await store.writeDoc("vo:" + noL, Object.assign({}, d0.v, { rfLock: Date.now() - 200e3 }), d0.ver); }
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  oL = (await store.getDoc("vo:" + noL)).v;
  ok(r.json.ok && oL.status === "refunded" && !oL.rfLock && PG[pL].status === "CANCELED", "오래된 잠금(2분 지남)은 풀고 취소 · 끝나면 잠금 없음", { json: r.json, lock: oL.rfLock });
  // 토스가 취소하는 사이 웹훅(PAYMENT_STATUS_CHANGED · CANCELED)이 먼저 와도: ‘회원 바로 취소’로 한 번만 기록 · 쓴 포인트는 한 번만 돌려받아요 (판매 수 · 쿠폰 · 포인트 뒤처리 한 번)
  { const d0 = await store.getDoc("vm:" + oL.mid); await store.writeDoc("vm:" + oL.mid, Object.assign({}, d0.v, { points: 5000 }), d0.ver); }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", points: 1000 } });
  const pW = r.json.paymentId, noW = r.json.no; paidLike(pW, r.json.amount);
  r = await call("vod-pay", { body: cpl(pW) });
  const ptW0 = (await store.getDoc("vm:" + oL.mid)).v.points;
  PG[pW].onCancel = async () => { await hookPay(pW); };
  r = await call("vod-pay", { body: { action: "cancel", no: noW } });
  delete PG[pW].onCancel;
  { const oW = (await store.getDoc("vo:" + noW)).v, ptW1 = (await store.getDoc("vm:" + oL.mid)).v.points;
    ok(r.json.ok && oW.status === "refunded" && oW.refundKind === "instant" && oW.refundBy === "회원" && !oW.rfLock && oW.pointOff === 1000 && ptW1 === ptW0 + 1000,
      "웹훅이 회원 취소보다 먼저 와도 ‘회원 바로 취소’로 한 번만 기록 · 쓴 포인트 1,000은 한 번만 돌려받아요", { json: r.json, kind: oW.refundKind, by: oW.refundBy, pts: [ptW0, ptW1], off: oW.pointOff }); }
  // 토스 취소 결과(cancels[].cancelStatus)가 ABORTED → 주문은 결제 완료 그대로(잠금 풀림) · IN_PROGRESS(처리 중) → 환불로 기록하고 ‘진행 중’ 표시
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card" } });
  const pF = r.json.paymentId, noF = r.json.no; paidLike(pF, r.json.amount);
  r = await call("vod-pay", { body: cpl(pF) });
  PG[pF].cancelSt = "ABORTED";
  r = await call("vod-pay", { body: { action: "cancel", no: noF } });
  { const oF = (await store.getDoc("vo:" + noF)).v;
    ok(r.status === 502 && oF.status === "paid" && !oF.rfLock && PG[pF].status === "DONE", "토스 취소 결과가 ABORTED 면 주문은 결제 완료 그대로 · 잠금도 풀려 다시 시도할 수 있어요", { st: r.status, o: oF.status, lock: oF.rfLock }); }
  PG[pF].cancelSt = "IN_PROGRESS";
  r = await call("vod-pay", { body: { action: "cancel", no: noF } });
  { const oF = (await store.getDoc("vo:" + noF)).v;
    ok(r.json.ok && oF.status === "refunded" && oF.pg && oF.pg.cancel && oF.pg.cancel.st === "requested", "토스 취소가 IN_PROGRESS(처리 중)면 환불로 기록하고 ‘취소 진행 중’으로 남겨요", oF.pg); }
  delete PG[pF].cancelSt;
  { const as41 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), vp41 = fs.readFileSync(path.join(ROOT, "api/vod-pay.js"), "utf8");
    ok(/const vdRfLate = \(snapAt, o\) => snapAt != null && Number\(o\.refundedAt\) > snapAt;/.test(as41) && (as41.match(/vdRfLate\(frozen\.has\(o\.id\) \? frozen\.get\(o\.id\) : null, o\)/g) || []).length === 2 && /frozen\.set\(id, Number\(x\.confirmedAt\) \|\| 0\)/.test(as41) && /frozen\.set\(x, Number\(r\.at\) \|\| 0\)/.test(as41),
      "정산: 확정한 명세서에 들어간 주문은 확정한 ‘뒤’ 환불만 환불한 달에서 차감해요 (강사 정산 · RS 정산 같은 규칙 — 확정 전 부분 환불이 두 번 빠지지 않게)");
    ok(/let did = false;/.test(vp41) && /if \(!did\) return next;/.test(vp41) && /async function syncCancelled\(nos, why\)/.test(vp41) && (vp41.match(/await syncCancelled\(/g) || []).length === 2 && /pill\(o\.method === "vbank" \? "가상계좌 환불 진행 중" : "PG 취소 진행 중", "warn"\)/.test(as41),
      "환불 뒤처리는 이번 호출이 바꿨을 때만 · 토스 조회 · 웹훅은 같은 맞추기 함수 · 진행 중인 PG 취소는 마스터 화면에 ‘진행 중’"); }

  console.log("5) 마스터 부분 환불 · 웹훅");
  jar.dc_a = auth.sign({ r: "master" });
  r = await call("vod-pay", { body: { action: "refund", no: no1, amount: 30000, reason: "수강 불만족" } });
  ok(r.json.ok && PG[p1].lastCancel.amount === 30000 && PG[p1].status === "PARTIAL_CANCELED" && PG[p1].balanceAmount === 180000 && r.json.order.refundKind === "partial", "부분 환불 30,000원 → 토스에 그 금액만 취소 (부분 취소)", r.json);
  delete jar.dc_a;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v12", kind: "course", method: "card", expect: 49000 } });
  const p3 = r.json.paymentId, no3 = r.json.no; paidLike(p3, 49000);
  r = await hookPay(p3, { status: "DONE" });
  ok(r.status === 200 && (await store.getDoc("vo:" + no3)).v.status === "ready", "웹훅 본문은 믿지 않아요 — 본문에 DONE 이라고 와도 토스에 다시 물어 승인 전(IN_PROGRESS)이면 그대로", r.json);
  r = await hook({ eventType: "PAYMENT_STATUS_CHANGED", data: { paymentKey: "tpk_fake", orderId: p3, status: "DONE" } });
  ok(r.status === 200 && (await store.getDoc("vo:" + no3)).v.status === "ready", "모르는 결제 키로 온 웹훅도 그대로 (토스 조회 404)", r.json);
  Object.assign(PG[p3], { status: "DONE", approvedAt: new Date().toISOString() }); // 승인은 됐는데 우리 서버가 승인 응답을 못 받은 경우
  r = await hookPay(p3);
  ok(r.status === 200, "결제 상태 변경 웹훅(PAYMENT_STATUS_CHANGED) 받기");
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.paymentId === p3).status === "paid", "승인 응답을 못 받았어도 웹훅으로 결제 완료 (토스 조회로 확인)");
  r = await call("vod-pay", { body: { action: "prepare", pid: "v12", kind: "course", method: "card", expect: 49000 } });
  ok(r.status === 409 && /자리/.test(r.json.message), "정원이 차면 결제 준비 거절", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v9", kind: "course", method: "card" } });
  ok(r.status === 409, "오픈 예정 · 숨김 클래스는 결제 안 됨");

  console.log("6) 카카오 로그인 · 가입 · 연결 끊기");
  delete jar.dc_v;
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", next: "#/vod/checkout/v5" } });
  const st = new URL(r.location).searchParams.get("state");
  ok(r.status === 302 && /kauth\.kakao\.com\/oauth\/authorize/.test(r.location) && /redirect_uri=https%3A%2F%2Fwww\.doogoclass\.com%2Fapi%2Fvod-kakao/.test(r.location) && st && jar.dc_ks, "카카오 동의 화면으로 (state 쿠키)", r.location);
  { const ks = jar.dc_ks;
    for (const h of ["doinggo.doogoclass.com", "doogo-class.vercel.app"]) {
      r = await call("vod-auth", { method: "GET", query: { action: "kakao", next: "#/vod/checkout/v5" }, headers: { host: h } });
      ok(r.status === 302 && r.location === "https://www.doogoclass.com/api/vod-auth?action=kakao&next=%23%2Fvod%2Fcheckout%2Fv5" && jar.dc_ks === ks, "다른 주소(" + h + ")에서 누르면 www 로 먼저 옮겨요 (state 쿠키 안 붙임)", r.location);
    }
    r = await call("vod-auth", { method: "GET", query: { action: "kakao" }, headers: { host: "localhost:4491" } });
    ok(r.status === 302 && /kauth\.kakao\.com/.test(r.location), "로컬 개발 주소는 그대로 카카오로", r.location); }
  r = await call("vod-kakao", { method: "GET", query: { code: "c1", state: "wrong" } });
  ok(r.status === 302 && /vodlogin=fail/.test(r.location), "state 가 다르면 거절 (CSRF 막기)");
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", next: "#/vod/checkout/v5" } });
  const st2 = new URL(r.location).searchParams.get("state");
  kakaoUser = { id: 4123456789, kakao_account: { email: "kk@example.com", is_email_valid: true, is_email_verified: true, name: "카OO", phone_number: "+82 10-1234-5678", birthday: "1103", gender: "female", age_range: "30~39", profile: { nickname: "닉" } } };
  r = await call("vod-kakao", { method: "GET", query: { code: "c2", state: st2 } });
  ok(r.status === 302 && r.location === "/?vodlogin=ok#/vod/checkout/v5" && jar.dc_v, "카카오 가입 → 돌아가기 · 로그인", r.location);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.via === "kakao" && r.json.member.phone === "010-1234-5678" && r.json.member.marketing === true && r.json.member.kakaoCh === true && r.json.member.birth === "11-03", "회원 DB: 카카오 · 휴대폰 · 광고 동의(약관) · 채널 친구 · 생일", r.json.member);
  r = await call("vod-auth", { method: "GET", query: { action: "kakao" } });
  r = await call("vod-kakao", { method: "GET", query: { code: "c3", state: new URL(r.location).searchParams.get("state") } });
  ok(/vodlogin=ok/.test(r.location), "같은 카카오로 다시 → 로그인");
  delete jar.dc_v;
  r = await call("vod-auth", { method: "GET", query: { action: "kakao" } });
  kakaoUser = { id: 999, kakao_account: { email: "a@example.com", is_email_valid: true, is_email_verified: true, name: "가OO" } };
  r = await call("vod-kakao", { method: "GET", query: { code: "c4", state: new URL(r.location).searchParams.get("state") } });
  ok(/vodlogin=dup/.test(r.location), "이메일 가입 회원과 같은 이메일 → 자동으로 합치지 않고 안내", r.location);
  // 마이페이지 › 회원 정보 수정 › 카카오 연결하기 (이메일 회원 a@example.com 에 카카오 999 붙이기)
  r = await call("vod-auth", { body: { action: "login", email: "a@example.com", pw: "test1234a" } });
  const aId = r.json.member.id;
  ok(r.json.member.hasPw === true && !r.json.member.kakaoId, "이메일 회원: 비밀번호 있음 표시 · 카카오 없음", r.json.member);
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", link: "1", next: "#/vod/my/account" } });
  r = await call("vod-kakao", { method: "GET", query: { code: "c5", state: new URL(r.location).searchParams.get("state") } });
  ok(r.location === "/?vodlogin=linked#/vod/my/account", "카카오 연결 → 회원 정보 수정으로 돌아가요", r.location);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.id === aId && r.json.member.kakaoId === "999" && r.json.member.via === "email" && r.json.member.kakaoLinkedAt, "연결한 계정 그대로 · 카카오 회원번호 붙음", r.json.member);
  delete jar.dc_v;
  r = await call("vod-auth", { method: "GET", query: { action: "kakao" } });
  r = await call("vod-kakao", { method: "GET", query: { code: "c6", state: new URL(r.location).searchParams.get("state") } });
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member && r.json.member.id === aId, "이제 카카오로 로그인하면 이메일 계정으로 들어가요", r.json.member);
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", link: "1", next: "#/vod/my/account" } });
  r = await call("vod-kakao", { method: "GET", query: { code: "c7", state: new URL(r.location).searchParams.get("state") } });
  ok(/vodlogin=linked/.test(r.location), "이미 연결된 카카오로 다시 연결 → 그대로 연결됨", r.location);
  kakaoUser = { id: 555, kakao_account: { email: "other@example.com", is_email_valid: true, name: "마OO" } };
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", link: "1", next: "#/vod/my/account" } });
  r = await call("vod-kakao", { method: "GET", query: { code: "c7b", state: new URL(r.location).searchParams.get("state") } });
  ok(r.location === "/?vodlogin=other#/vod/my/account", "이미 다른 카카오가 붙은 계정에 또 연결 → 안내 (덮어쓰지 않음)", r.location);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.id === aId && r.json.member.kakaoId === "999", "원래 연결(999)은 그대로", r.json.member);
  kakaoUser = { id: 999, kakao_account: { email: "a@example.com", is_email_valid: true, is_email_verified: true, name: "가OO" } };
  // 다른 회원이 쓰는 카카오(4123456789 는 카카오 가입 회원)로 연결하려 하면: 그 회원으로 바꿔 로그인하지 않고 안내
  { await call("vod-auth", { body: { action: "logout" } }); delete jar.dc_v;
    r = await call("vod-auth", { body: { action: "signup", email: "c@example.com", pw: "test1234c", name: "다OO", phone: "010-0000-3333", agree: true } });
    const cId = r.json.member.id;
    kakaoUser = { id: 4123456700, kakao_account: { email: "kk2@example.com", is_email_valid: true, is_email_verified: true, name: "라OO" } };
    r = await call("vod-auth", { method: "GET", query: { action: "kakao", next: "#/vod" } });
    const keepV = jar.dc_v;
    r = await call("vod-kakao", { method: "GET", query: { code: "c8", state: new URL(r.location).searchParams.get("state") } }); // 새 카카오 회원 가입(로그인 바뀜)
    jar.dc_v = keepV; // 다시 c@example.com 으로
    r = await call("vod-auth", { method: "GET", query: { action: "kakao", link: "1", next: "#/vod/my/account" } });
    r = await call("vod-kakao", { method: "GET", query: { code: "c9", state: new URL(r.location).searchParams.get("state") } });
    ok(r.location === "/?vodlogin=taken#/vod/my/account", "다른 계정이 쓰는 카카오 → 연결 안 하고 안내", r.location);
    r = await call("vod-auth", { body: { action: "me" } });
    ok(r.json.member.id === cId && !r.json.member.kakaoId, "로그인은 원래 계정 그대로 (다른 사람 계정으로 안 바뀜)", r.json.member);
    r = await call("vod-auth", { body: { action: "kakao-off" } });
    ok(r.status === 400, "연결된 카카오가 없으면 끊기 거절", r.json); }
  // 연결 끊기: 이메일 회원은 끊을 수 있고, 카카오로 가입한 회원은 못 끊어요
  delete jar.dc_v; kakaoUser = { id: 999, kakao_account: { email: "a@example.com", is_email_valid: true, is_email_verified: true, name: "가OO" } };
  r = await call("vod-auth", { body: { action: "login", email: "a@example.com", pw: "test1234a" } });
  r = await call("vod-auth", { body: { action: "kakao-off" } });
  ok(r.json.ok && r.json.member.kakaoId === "" && r.json.member.id === aId, "이메일 회원: 카카오 연결 끊기", r.json);
  r = await call("vod-auth", { method: "GET", query: { action: "kakao" } }); delete jar.dc_v;
  r = await call("vod-kakao", { method: "GET", query: { code: "c10", state: new URL(r.location).searchParams.get("state") } });
  ok(/vodlogin=dup/.test(r.location), "끊은 뒤 그 카카오로 오면 다시 ‘같은 이메일 계정 있음’ 안내", r.location);
  r = await call("vod-auth", { method: "GET", query: { action: "kakao", next: "#/vod" } });
  kakaoUser = { id: 4123456789, kakao_account: { email: "kk@example.com", is_email_valid: true, is_email_verified: true, name: "카OO" } };
  r = await call("vod-kakao", { method: "GET", query: { code: "c11", state: new URL(r.location).searchParams.get("state") } });
  r = await call("vod-auth", { body: { action: "kakao-off" } });
  ok(r.status === 400 && /카카오로 가입한/.test(r.json.message), "카카오로 가입한 회원은 연결 끊기 거절 (로그인할 방법이 없어져요)", r.json);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.hasPw === false && r.json.member.kakaoId === "4123456789", "카카오 회원: 비밀번호 없음 표시", r.json.member);
  delete jar.dc_v;
  r = await call("vod-kakao", { method: "POST", query: { user_id: "4123456789", referrer_type: "UNLINK_FROM_APPS" }, headers: { authorization: "KakaoAK wrong" } });
  ok(r.status === 401, "연결 끊기 알림: Admin 키가 틀리면 거절");
  r = await call("vod-kakao", { method: "POST", query: { user_id: "4123456789", referrer_type: "UNLINK_FROM_APPS" }, headers: { authorization: "KakaoAK admin-test" } });
  ok(r.status === 200, "연결 끊기 알림 처리");

  console.log("7) Cloudflare · Turnstile");
  process.env.CF_ORIGIN_SECRET = "cf-secret";
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.status === 403, "Cloudflare 를 안 거친 요청 막기 (…vercel.app 직접 접속)");
  r = await call("vod-auth", { body: { action: "me" }, headers: { "x-origin-auth": "cf-secret", "cf-connecting-ip": "9.9.9.9" } });
  ok(r.status === 200, "Cloudflare 를 거친 요청 받기");
  const edge = require(path.join(TMP, "class/api/_lib/edge.js"));
  ok(edge.clientIp({ headers: { "x-origin-auth": "cf-secret", "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "172.64.0.1" } }) === "9.9.9.9", "진짜 방문자 IP = CF-Connecting-IP");
  ok(edge.clientIp({ headers: { "cf-connecting-ip": "6.6.6.6", "x-forwarded-for": "5.5.5.5" } }) === "5.5.5.5", "헤더를 속여도(비밀 값 없이) 안 믿음");
  delete process.env.CF_ORIGIN_SECRET;
  process.env.TURNSTILE_SECRET = "ts-secret";
  r = await call("vod-auth", { body: { action: "signup", email: "b@example.com", pw: "test1234a", name: "나OO", phone: "010-0000-2222", agree: true } });
  ok(r.status === 400 && /사람/.test(r.json.message), "Turnstile 토큰 없으면 가입 거절");
  r = await call("vod-auth", { body: { action: "signup", email: "b@example.com", pw: "test1234a", name: "나OO", phone: "010-0000-2222", agree: true, ts: "ok" } });
  ok(r.json.ok, "Turnstile 통과하면 가입", r.json);
  delete process.env.TURNSTILE_SECRET;

  console.log("8) 문서 공개 범위 (bootstrap)");
  const boot = async () => (await call("bootstrap", { method: "GET" })).json;
  const docOf = (j, k) => { const d = (j.docs || []).find((x) => x[0] === k); return d ? d[1] : undefined; };
  const verOf = (j, k) => { const d = (j.docs || []).find((x) => x[0] === k); return d ? d[2] : 0; };
  const sync = async (changes) => (await call("sync", { body: { changes } })).json;
  const saveJar = () => Object.assign({}, jar), useJar = (j) => { Object.keys(jar).forEach((k) => delete jar[k]); Object.assign(jar, j); };
  const jarB = saveJar();
  useJar({ dc_a: auth.sign({ r: "master" }) });
  let j = await boot();
  const meta = docOf(j, "meta");
  meta.vod = { ver: 4, products: [
    { id: "v5", title: "챗GPT로 블로그 수익화", type: "vod", status: "on", price: 89000, sale: 59000, iid: "choi", dg: true, kakao: "https://open.kakao.com/o/secret", curriculum: [{ title: "1장", lessons: [{ id: "v5-l1-1", title: "미리보기", video: "PREVIEW-VID", preview: true }, { id: "v5-l1-2", title: "본강의", video: "SECRET-VID", files: [{ name: "자료.pdf", url: "/assets/files/v5-topic.pdf" }] }] }] },
    { id: "v6", title: "다른 클래스", type: "vod", status: "on", price: 49000, iid: "moon", curriculum: [] }],
    settings: { reviewPoint: 500, bank: "국민은행", account: "123-45", holder: "(주)두고홀딩스", bankMode: "on" /* 예전 무통장 흐름 시험용 (운영은 2026-11-15 부터 받지 않아요) */ }, coupons: [], members: [{ id: "leak", email: "leak@x.com" }], crm: { secret: 1 } };
  r = await sync([{ k: "meta", base: verOf(j, "meta"), put: meta }]);
  ok(r.results && !r.results[0].error, "마스터가 meta(공개 정보) 저장", r);
  await call("vod-pay", { body: { action: "catalog", catalog: { products: meta.vod.products.map((p) => Object.assign({}, p, { dg: true })), coupons: [], settings: { refund: { instant: true, days: 7, maxUsed: 0 } } } } });
  useJar({});
  j = await boot();
  let pv = docOf(j, "meta").vod, l2 = pv.products[0].curriculum[0].lessons;
  ok(l2[0].video === "PREVIEW-VID" && l2[1].video === "" && !l2[1].files[0].url && pv.products[0].kakao === "" && pv.products[0].locked, "방문자: 미리보기 영상만 · 유료 강의 영상 · 자료 · 오픈채팅은 숨김", l2);
  ok(!pv.members && !pv.crm, "방문자: 회원 목록 · CRM 은 공개 정보에서 빠짐", Object.keys(pv));
  ok(!(j.docs || []).some((d) => /^vm:|^vo:|^vq:/.test(d[0])), "방문자: 회원 · 주문 · 문의 문서 안 보임");
  useJar(jarB);
  j = await boot();
  const mB = j.me.vod && j.me.vod.mid;
  ok(mB && docOf(j, "vm:" + mB) && !docOf(j, "vm:" + mB).pwHash && !("notes" in docOf(j, "vm:" + mB)), "회원 B: 내 회원 문서만 (비밀번호 · 운영 메모 없음)", j.me);
  ok(!(j.docs || []).some((d) => /^vm:/.test(d[0]) && d[0] !== "vm:" + mB), "회원 B: 다른 회원 문서는 안 보임");

  console.log("9) 무통장 입금 · 카드 준비 중 · 입금 확인 · 강의 잠금 해제");
  const sec = process.env.TOSS_SECRET_KEY; delete process.env.TOSS_SECRET_KEY;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "card", expect: 65000 } });
  ok(r.status === 409 && /결제 준비 중/.test(r.json.message), "토스 키가 없으면 카드 결제 막기 (가짜 결제 없음 · ‘결제 준비 중’)", r.json);
  process.env.TOSS_SECRET_KEY = sec;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "bank", buyer: { name: "나OO", phone: "010-0000-2222" }, expect: 65000 } });
  ok(r.json.ok && r.json.bank && r.json.orders[0].status === "pending", "무통장 입금 주문 → 입금 대기", r.json);
  const bankNo = r.json.no;
  j = await boot();
  ok(docOf(j, "vo:" + bankNo) && docOf(j, "vo:" + bankNo).status === "pending", "회원 B: 내 주문 문서가 보임");
  ok(docOf(j, "meta").vod.products[0].curriculum[0].lessons[1].video === "", "입금 전에는 강의 잠김");
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const vo = docOf(j, "vo:" + bankNo);
  r = await sync([{ k: "vo:" + bankNo, base: verOf(j, "vo:" + bankNo), ops: [{ p: ["status"], v: "paid" }, { p: ["paidAt"], v: Date.now() }] }]);
  ok(r.results && !r.results[0].error, "마스터: 입금 확인 (주문 → 결제 완료)", r);
  j = await boot();
  ok(((docOf(j, "vstat") || {}).sold || {}).v5 === 1, "수강생 수(서버 집계) +1", docOf(j, "vstat"));
  useJar(jarB);
  j = await boot();
  pv = docOf(j, "meta").vod;
  ok(pv.products[0].curriculum[0].lessons[1].video === "SECRET-VID" && pv.products[0].kakao && !pv.products[0].locked && pv.products[1].locked, "산 클래스만 잠금 해제 (다른 클래스는 그대로 잠김)", pv.products.map((p) => [p.id, !!p.locked]));

  console.log("10) 쓰기 권한 (sync)");
  const vmB = docOf(j, "vm:" + mB), vB = verOf(j, "vm:" + mB);
  r = await sync([{ k: "vm:" + mB, base: vB, ops: [{ p: ["name"], v: "나OO2" }, { p: ["points"], v: 999999 }, { p: ["likes"], v: ["v5", "v6"] }, { p: ["coupons"], v: [{ id: "x", cid: "free", usedAt: null }] }] }]);
  j = await boot();
  const vmB2 = docOf(j, "vm:" + mB);
  ok(vmB2.name === "나OO2" && vmB2.points === (vmB.points || 0) && (vmB2.coupons || []).length === (vmB.coupons || []).length && vmB2.likes.length === 2, "회원: 이름 · 찜은 고칠 수 있고 포인트 · 쿠폰은 못 고침", { n: vmB2.name, p: vmB2.points, c: (vmB2.coupons || []).length });
  ok(((docOf(j, "vstat") || {}).likes || {}).v5 === 1, "찜 수(서버 집계)", docOf(j, "vstat"));
  r = await sync([{ k: "vm:someone-else", base: 0, put: { id: "someone-else", points: 1 } }]);
  ok(r.results[0].error === "forbidden", "다른 회원 문서 만들기 · 고치기 막기", r.results);
  r = await sync([{ k: "vo:" + bankNo, base: verOf(j, "vo:" + bankNo), ops: [{ p: ["status"], v: "refunded" }, { p: ["amount"], v: 1 }, { p: ["refundReq"], v: { why: "단순 변심", text: "환불 원해요" } }] }]);
  j = await boot();
  const vo2 = docOf(j, "vo:" + bankNo);
  ok(vo2.status === "paid" && vo2.amount === 65000 && vo2.refundReq && vo2.refundReq.why === "단순 변심", "회원: 내 주문은 환불 요청만 (상태 · 금액은 못 바꿈)", vo2);
  r = await sync([{ k: "vr:rv1", base: 0, put: { id: "rv1", pid: "v5", mid: "fake", name: "나OO", rating: 5, text: "좋아요", reply: "가짜 답변" } }]);
  j = await boot();
  const rv = docOf(j, "vr:rv1");
  ok(rv && rv.mid === mB && !rv.reply, "후기: 내 이름으로만 · 답변 칸은 못 씀", rv);
  ok(docOf(j, "vm:" + mB).points === (vmB.points || 0) + 500, "후기 포인트 500P (서버가 지급)", docOf(j, "vm:" + mB).points);
  r = await sync([{ k: "vr:rv2", base: 0, put: { id: "rv2", pid: "v5", rating: 4, text: "두 번째" } }]);
  j = await boot();
  ok(docOf(j, "vm:" + mB).points === (vmB.points || 0) + 500, "같은 클래스 후기 포인트는 한 번만");
  r = await sync([{ k: "vr:rv3", base: 0, put: { id: "rv3", pid: "v6", rating: 5, text: "안 산 클래스" } }]);
  j = await boot();
  ok(!docOf(j, "vr:rv3"), "안 산 클래스 후기는 저장 안 됨", docOf(j, "vr:rv3"));
  r = await sync([{ k: "vq:" + mB + ":q1", base: 0, put: { id: "q1", mid: mB, cat: "결제", title: "문의", text: "입금했어요 확인 부탁", answer: "셀프 답변" } }]);
  j = await boot();
  ok(docOf(j, "vq:" + mB + ":q1") && docOf(j, "vq:" + mB + ":q1").answer === "", "1:1 문의 남기기 (답변 칸은 비움)", docOf(j, "vq:" + mB + ":q1"));
  r = await sync([{ k: "vpl:p1", base: 0, put: { id: "p1", pid: "v5", nick: "나OO", text: "매일 1편씩 꼭 보고 바로 따라 해 볼게요!" } }]);
  // 다짐 쿠폰 (2026-11-08): 20자 이상 다짐 → 그 강의에만 쓰는 5,000원 쿠폰 — 클래스마다 한 번 · 이미 산 강의 · 판매 전 강의 · 종이책 · 무료는 빼요 (서버가 줘요)
  {
    const PRS = require(path.join(ROOT, "shared/price.js"));
    ok(PRS.pledgeLen("  매일   30분씩 ") === 7 && PRS.pledgeable({ status: "on", type: "vod", price: 49000 }) && !PRS.pledgeable({ status: "soon", type: "vod", price: 49000 }) && !PRS.pledgeable({ status: "on", type: "book", price: 15900 }) && !PRS.pledgeable({ status: "on", type: "vod", price: 0 }) && !PRS.pledgeable(null),
      "다짐 규칙: 글자 수(띄어쓰기 한 칸 · 앞뒤 빈칸 빼고) · 쿠폰 주는 강의 = 판매 중 · 유료 · 종이책 아님");
    const plCp = (jj) => (docOf(jj, "vm:" + mB).coupons || []).filter((c) => c.cid === "cp-pledge");
    j = await boot();
    ok(docOf(j, "vpl:p1") && !plCp(j).length, "이미 산 강의(v5) 다짐은 저장 · 쿠폰은 없음", plCp(j));
    r = await sync([{ k: "vpl:p2", base: 0, put: { id: "p2", pid: "v6", nick: "나OO", text: "짧은 다짐이에요" } }]);
    j = await boot();
    ok(!docOf(j, "vpl:p2") && !plCp(j).length, "20자보다 짧은 다짐은 저장 안 됨 · 쿠폰도 없음", r.results);
    r = await sync([{ k: "vpl:p3", base: 0, put: { id: "p3", pid: "v6", nick: "나OO", text: "매일 30분씩 강의를 듣고 꼭 끝까지 따라 해 볼게요!" } }]);
    j = await boot();
    const pc1 = plCp(j), plDay = PRS.KST.addDays(PRS.KST.day(Date.now()), 30);
    ok(docOf(j, "vpl:p3") && pc1.length === 1 && pc1[0].pid === "v6" && pc1[0].value === 5000 && pc1[0].exp === plDay && !pc1[0].usedAt && (docOf(j, "vm:" + mB).plCps || []).indexOf("v6") >= 0, "20자 이상 다짐 → 그 강의 전용 5,000원 쿠폰 (받은 날부터 30일)", pc1);
    r = await sync([{ k: "vpl:p3", base: verOf(j, "vpl:p3"), del: true }]);
    r = await sync([{ k: "vpl:p4", base: 0, put: { id: "p4", pid: "v6", nick: "나OO", text: "다시 다짐해요. 이번에는 진짜 끝까지 해 볼게요!" } }]);
    j = await boot();
    ok(!docOf(j, "vpl:p3") && docOf(j, "vpl:p4") && plCp(j).length === 1, "지우고 다시 다짐해도 같은 강의 쿠폰은 한 번만", plCp(j));
    r = await sync([{ k: "vpl:p4", base: verOf(j, "vpl:p4"), ops: [{ p: ["text"], v: "짧게" }] }]);
    j = await boot();
    ok(docOf(j, "vpl:p4") && /이번에는 진짜/.test(docOf(j, "vpl:p4").text), "다짐을 20자보다 짧게 고치면 예전 글 그대로", docOf(j, "vpl:p4"));
    const VQ = require(path.join(TMP, "class/api/_lib/vod.js")), vmNow = docOf(j, "vm:" + mB);
    const q0 = await VQ.quote(vmNow, { pid: "v6", kind: "course", plan: 180 }, []), q1 = await VQ.quote(vmNow, { pid: "v6", kind: "course", plan: 180, mcid: pc1[0].id }, []), q2 = await VQ.quote(vmNow, { pid: "v5", kind: "course", plan: 365, mcid: pc1[0].id }, []);
    ok(q0.ok && q1.ok && q1.items[0].couponOff === 5000 && q1.total === q0.total - 5000 && q1.items[0].mcid === pc1[0].id && q2.ok && q2.items[0].couponOff === 0 && !q2.items[0].mcid, "다짐 쿠폰은 그 강의 결제에서만 5,000원 (다른 강의엔 안 깎여요)", { q0: q0.total, q1: q1.total, q2: q2.items && q2.items[0] });
    r = await sync([{ k: "vm:" + mB, base: verOf(j, "vm:" + mB), ops: [{ p: ["plCps"], v: [] }, { p: ["coupons"], v: [] }] }]);
    j = await boot();
    ok(plCp(j).length === 1 && (docOf(j, "vm:" + mB).plCps || []).indexOf("v6") >= 0, "회원이 다짐 쿠폰 · 받은 표시를 지우거나 넣을 수 없음", docOf(j, "vm:" + mB).plCps);
  }


  console.log("11) 무통장 주문 취소 · 두잉고 강의실");
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 365, method: "bank" } });
  const bank2 = r.json.no;
  r = await call("vod-pay", { body: { action: "cancelPending", no: bank2 } });
  j = await boot();
  ok(r.json.ok && docOf(j, "vo:" + bank2).status === "canceled", "입금 전 주문 취소", r.json);
  r = await call("vod-pay", { body: { action: "dg", iid: "moon" } });
  ok(r.status === 403, "안 산 강사 두잉고 강의실은 못 들어감", r.json);
  r = await call("vod-pay", { body: { action: "dg", iid: "choi" } });
  ok(r.json.ok && jar.dc_s, "산 VOD 강사 두잉고 강의실 → 수강생 계정 + 로그인", r.json);
  const sid = r.json.sid;
  r = await call("vod-pay", { body: { action: "dg", iid: "choi" } });
  ok(r.json.sid === sid, "두 번째 입장은 같은 수강생 계정");
  delete jar.dc_v;
  j = await boot();
  ok(j.me.student && j.me.student.sid === sid && j.me.vod && j.me.vod.mid === mB && docOf(j, "meta").vod.products[0].curriculum[0].lessons[1].video === "SECRET-VID", "두잉고 강의실(수강생 로그인)만으로도 산 강의는 열림", j.me);

  console.log("12) 파일 · 강사 수정 범위 · 서류 숨김");
  const pdf = "data:application/pdf;base64," + Buffer.from("%PDF-1.4 수업 자료 " + "x".repeat(200)).toString("base64");
  useJar({});
  r = await call("file", { body: { data: pdf, scope: "vodp:v5" } });
  ok(r.status === 403, "방문자는 파일을 못 올림");
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("file", { body: { data: pdf, scope: "vodp:v5" } });
  ok(r.json.ok && /^\/api\/file\?h=/.test(r.json.url), "마스터: 수업 자료 올리기", r.json);
  const fh = new URL("http://x" + r.json.url).searchParams.get("h");
  r = await call("file", { body: { data: pdf, scope: "../../etc" } });
  ok(r.status === 400, "이상한 범위는 거절");
  useJar({});
  r = await call("file", { method: "GET", query: { h: fh } });
  ok(r.status === 403, "방문자: 유료 수업 자료 못 받음", r.status);
  useJar(jarB); delete jar.dc_s;
  r = await call("file", { method: "GET", query: { h: fh } });
  ok(r.status === 200, "산 회원: 수업 자료 받기", r.status);
  // 강사(choi): 자기 클래스 커리큘럼만 고쳐짐
  useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
  j = await boot();
  const m2 = docOf(j, "meta");
  const iV = m2.vod.products.findIndex((x) => x.id === "v5"), oV = m2.vod.products.findIndex((x) => x.id === "v6");
  r = await sync([{ k: "meta", base: verOf(j, "meta"), ops: [{ p: ["vod", "products", iV, "curriculum", 0, "lessons", 1, "video"], v: "https://vimeo.com/111" }, { p: ["vod", "products", iV, "price"], v: 1 }, { p: ["vod", "products", oV, "title"], v: "남의 클래스" }, { p: ["vod", "settings", "reviewPoint"], v: 99999 }, { p: ["contracts", "choi", "docs", "biz"], v: { name: "사업자등록증.pdf" } }, { p: ["contracts", "moon", "docs", "biz"], v: { name: "남의 서류" } }] }]);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const m3 = docOf(j, "meta"), p5 = m3.vod.products.find((x) => x.id === "v5"), p6 = m3.vod.products.find((x) => x.id === "v6");
  ok(p5.curriculum[0].lessons[1].video === "https://vimeo.com/111" && p5.price === 89000 && p6.title === "다른 클래스" && m3.vod.settings.reviewPoint === 500, "강사: 자기 클래스 강의 영상만 바뀜 (가격 · 남의 클래스 · 설정은 그대로)", { v: p5.curriculum[0].lessons[1].video, price: p5.price, t6: p6.title, rp: m3.vod.settings.reviewPoint });
  ok(m3.contracts && m3.contracts.choi && m3.contracts.choi.docs.biz && !(m3.contracts.moon && m3.contracts.moon.docs && m3.contracts.moon.docs.biz && m3.contracts.moon.docs.biz.name === "남의 서류"), "강사: 자기 제출 서류만", m3.contracts);
  useJar({});
  j = await boot();
  ok(!("contracts" in docOf(j, "meta")), "방문자: 강사 제출 서류(연락처 · 메모)는 안 보임");

  console.log("13) 무통장 입금: 기수 계좌로 받기 · 입금자명 · 마스터 확인 · 자동 입금 확인");
  const BK = require(path.join(TMP, "class/api/_lib/bank.js"));
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const mt = docOf(j, "meta");
  mt.vod.settings = Object.assign({}, mt.vod.settings, { bank: "", account: "", holder: "" });
  mt.billing = Object.assign({}, mt.billing || {}, { bank: "신한은행", account: "140-000-111111", holder: "(주)두고홀딩스" });
  r = await sync([{ k: "meta", base: verOf(j, "meta"), put: mt }]);
  ok(r.results && !r.results[0].error, "마스터: VOD 계좌는 비우고 기수 입금 계좌만", r);
  useJar(jarB);
  j = await boot();
  const pst = docOf(j, "meta").vod.settings;
  ok(pst.bank === "신한은행" && pst.account === "140-000-111111" && !("billing" in docOf(j, "meta")), "회원: 결제 화면에 기수 입금 계좌가 보임 (기수 정산 정보는 그대로 숨김)", pst);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 365, method: "bank", depositor: "나 OO", buyer: { name: "나OO2" } } });
  const b13 = r.json.no, amt13 = r.json.amount, o13 = r.json.orders && r.json.orders[0];
  ok(r.json.ok && o13.depositor === "나OO" && o13.bankTo.account === "140-000-111111" && o13.dueAt > Date.now() + 2 * 864e5, "무통장 주문: 입금자명 · 안내 계좌 · 입금 기한이 주문에 남음", o13);
  r = await call("vod-pay", { body: { action: "bankOk", no: b13 } });
  ok(r.status === 403, "회원은 입금 확인 못 함", r.json);
  // 자동 입금 확인: 이름이 다르면 맞추지 않고 남겨 둬요
  let mr = await BK.match({ id: "dep-1", name: "김OO", amount: amt13, at: Date.now(), bank: "신한" });
  ok(mr.ok && mr.st === "none", "입금자명이 다르면 자동 확인 안 함 (못 맞춘 입금으로 남김)", mr);
  mr = await BK.match({ id: "dep-2", name: "나OO", amount: amt13 - 1000 });
  ok(mr.st === "none", "금액이 다르면 자동 확인 안 함", mr);
  mr = await BK.match({ id: "dep-3", name: "(나 OO)", amount: amt13 });
  ok(mr.st === "ok" && mr.no === b13, "입금자명 · 금액이 맞으면 자동 입금 확인 (띄어쓰기 · 괄호 무시)", mr);
  mr = await BK.match({ id: "dep-3", name: "나OO", amount: amt13 });
  ok(mr.dup, "같은 입금 알림이 두 번 와도 한 번만", mr);
  j = await boot();
  pv = docOf(j, "meta").vod;
  ok(docOf(j, "vo:" + b13).status === "paid" && docOf(j, "vo:" + b13).pg.okHow === "auto" && !pv.products.find((x) => x.id === "v6").locked, "자동 확인 → 결제 완료 · 바로 수강 열림", docOf(j, "vo:" + b13));
  // 마스터: 못 맞춘 입금 보기 · 주문에 연결 · 입금 확인 버튼 · 취소
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "extend", method: "bank", depositor: "나OO" } });
  const ext = r.json.ok ? r.json.no : "";
  const pts0 = docOf(j, "vm:" + mB).points || 0;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "bank", points: Math.min(500, pts0) } });
  const b14 = r.json.no;
  j = await boot();
  ok(docOf(j, "vm:" + mB).points === pts0 - Math.min(500, pts0), "무통장 주문: 쓴 포인트는 주문할 때 빠짐", docOf(j, "vm:" + mB).points);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("vod-pay", { body: { action: "bankLog" } });
  ok(r.json.ok && r.json.recent.filter((e) => e.st === "none").length === 2 && r.json.recent.some((e) => e.st === "ok" && e.no === b13), "마스터: 최근 입금 알림 (자동 확인 1 · 못 맞춘 입금 2)", r.json.recent.map((e) => e.st));
  if (ext) {
    r = await call("vod-pay", { body: { action: "bankLink", id: "dep-1", no: ext } });
    ok(r.ok !== false && r.json.ok, "마스터: 못 맞춘 입금을 주문에 연결 → 입금 확인", r.json);
    r = await call("vod-pay", { body: { action: "bankLink", id: "dep-1", no: ext } });
    ok(!r.json.ok, "이미 연결한 입금은 다시 연결 안 됨", r.json);
  }
  r = await call("vod-pay", { body: { action: "bankCancel", no: b14 } });
  ok(r.json.ok, "마스터: 입금 전 주문 취소", r.json);
  r = await call("vod-pay", { body: { action: "bankOk", no: b14 } });
  ok(r.status === 409, "취소한 주문은 입금 확인 안 됨", r.json);
  useJar(jarB);
  j = await boot();
  ok(docOf(j, "vo:" + b14).status === "canceled" && docOf(j, "vm:" + mB).points === pts0, "취소하면 쓴 포인트를 돌려받음", { st: docOf(j, "vo:" + b14).status, p: docOf(j, "vm:" + mB).points });
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "bank", depositor: "나OO" } });
  const b15 = r.json.no;
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("vod-pay", { body: { action: "bankOk", no: b15 } });
  const r2 = await call("vod-pay", { body: { action: "bankOk", no: b15 } });
  ok(r.json.ok && r.json.orders.length === 1 && r2.json.ok && r2.json.already, "마스터 ‘입금 확인’ → 결제 완료 (두 번 눌러도 한 번만)", [r.json, r2.json]);
  j = await boot();
  ok(docOf(j, "vo:" + b15).status === "paid" && docOf(j, "vo:" + b15).pg.okHow === "manual", "입금 확인한 사람 · 방법이 주문에 남음", docOf(j, "vo:" + b15).pg);
  // 무통장 주문도 결제 후 7일 · 재생 전이면 회원이 바로 취소 — 환불 받을 계좌가 있어야 하고 · 주문은 바로 환불 · 돈은 마스터가 송금 (계좌 송금 대기)
  useJar(jarB);
  r = await call("vod-pay", { body: { action: "cancel", no: b15 } });
  ok(r.status === 400 && /계좌/.test(r.json.message) && (await store.getDoc("vo:" + b15)).v.status === "paid", "무통장 바로 취소: 환불 받을 계좌가 없으면 막아요 (주문은 그대로)", r.json);
  { const cx0 = calls.filter((c) => /\/cancel$/.test(c)).length;
    r = await call("vod-pay", { body: { action: "cancel", no: b15, refundAccount: { bank: "90", number: "3333-01-1234567", holder: "나OO" } } });
    const o15 = (await store.getDoc("vo:" + b15)).v;
    ok(r.json.ok && r.json.way === "bank" && o15.status === "refunded" && o15.refundKind === "instant" && o15.refundBy === "회원" && o15.refundPay && o15.refundPay.st === "wait" && o15.refundPay.bank === "90" && o15.refundPay.number === "3333011234567" && o15.refundPay.holder === "나OO" && o15.refundPay.amount === o15.amount && !o15.rfLock && calls.filter((c) => /\/cancel$/.test(c)).length === cx0,
      "무통장 바로 취소: 주문 환불 + 계좌 송금 대기(토스 은행 코드 · 숫자만 계좌 · 예금주 · 금액) · 토스는 부르지 않아요", { json: r.json, rp: o15.refundPay }); }
  r = await call("vod-pay", { body: { action: "cancel", no: b15, refundAccount: { bank: "KAKAO", number: "3333011234567", holder: "나OO" } } });
  ok(r.status === 409, "이미 환불한 주문은 다시 취소 안 돼요", r.json);
  // 회원 화면이 저장한 재생 기록(vm: prog)만 있어도 — 서버 기록(vp:)이 빠진 예전 두잉고 강의실 — 바로 취소 안 돼요
  { const d0 = await store.getDoc("vm:" + mB), keep = d0.v.prog;
    await store.writeDoc("vm:" + mB, Object.assign({}, d0.v, { prog: Object.assign({}, keep || {}, { v6: { seen: { "v6-l9": Date.now() }, done: {}, last: "v6-l9" } }) }), d0.ver);
    r = await call("vod-pay", { body: { action: "cancel", no: b13, refundAccount: { bank: "KAKAO", number: "3333011234567", holder: "나OO" } } });
    ok(r.status === 409 && /1개/.test(r.json.message) && (await store.getDoc("vo:" + b13)).v.status === "paid", "화면에 남은 재생 기록만 있어도(서버 기록이 빠진 예전 두잉고 강의실) 바로 취소 안 돼요", r.json);
    const d1 = await store.getDoc("vm:" + mB); await store.writeDoc("vm:" + mB, Object.assign({}, d1.v, { prog: keep || {} }), d1.ver); }
  r = await call("vod-pay", { body: { action: "track", pid: "v6", lid: "v6-l1", ev: "seen" } });
  r = await call("vod-pay", { body: { action: "cancel", no: b13, refundAccount: { bank: "KAKAO", number: "3333011234567", holder: "나OO" } } });
  ok(r.status === 409 && /1개/.test(r.json.message) && (await store.getDoc("vo:" + b13)).v.status === "paid", "무통장도 강의를 재생했으면 바로 취소 안 돼요 (환불 요청으로)", r.json);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  // 계좌가 하나도 없으면 무통장도 막아요
  const mt2 = docOf(j, "meta"); mt2.billing = Object.assign({}, mt2.billing, { bank: "", account: "" });
  await sync([{ k: "meta", base: verOf(j, "meta"), put: mt2 }]);
  useJar(jarB);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "bank" } });
  ok(r.status === 409 && /계좌/.test(r.json.message), "받을 계좌가 없으면 무통장 주문 막기", r.json);

  console.log("14) 체험 계정 vod@gmail.com (일회성 작업)");
  const ran = await require(path.join(TMP, "class/api/_lib/init.js")).runPendingOps();
  ok(ran.some((x) => x.id === "2026-10-29-vod-demo-member" && x.ok), "배포 때 체험 계정 작업이 한 번 돌아요", ran.map((x) => x.id + ":" + x.ok));
  useJar({});
  r = await call("vod-auth", { body: { action: "login", email: "vod@gmail.com", pw: "vod" } });
  ok(r.json.ok && r.json.member.email === "vod@gmail.com", "체험 계정 로그인", r.json);
  j = await boot();
  const dOrders = (j.docs || []).filter((d) => /^vo:/.test(d[0])).map((d) => d[1]);
  ok(dOrders.length === 6 && dOrders.every((o) => o.status === "paid" && o.amount === 0 && o.demo) && j.me.vod && docOf(j, "meta").vod.products.find((x) => x.id === "v5") && !docOf(j, "meta").vod.products.find((x) => x.id === "v5").locked, "산 강의 6개 (0원 체험 주문) · 강의 열림", dOrders.map((o) => o.pid));
  ok(!((docOf(j, "vstat") || {}).sold || {}).v4, "체험 주문은 수강생 수에 안 잡혀요", docOf(j, "vstat"));
  r = await call("vod-auth", { body: { action: "pw", pw0: "vod", pw1: "abcd12345" } });
  ok(r.status === 403, "체험 계정 비밀번호는 못 바꿔요", r.json);
  r = await call("vod-auth", { body: { action: "withdraw", pw: "vod" } });
  ok(r.status === 403, "체험 계정은 탈퇴 못 해요", r.json);
  // 회원 탈퇴 (2026-11-24 · 마이페이지 › 회원 탈퇴): 비밀번호 확인 · 떠나는 이유는 정해 둔 보기만 · 이름 · 연락처를 지우고 주문 번호는 남겨요
  //  · 같은 이메일로 다시 가입할 수 있어요 · 소개 화면 ‘회원 N명’(bootstrap pub)은 탈퇴 · 체험 계정을 빼고 세요
  {
    const BS = require(path.join(TMP, "class/api/bootstrap.js")), jarDemo = saveJar();
    useJar({}); BS.pubReset();
    const n0 = ((await boot()).pub || {}).members;
    r = await call("vod-auth", { body: { action: "signup", email: "wd@example.com", pw: "test1234w", name: "탈OO", phone: "010-0000-7777", agree: true } });
    const wid = r.json.member && r.json.member.id;
    BS.pubReset();
    const n1 = ((await boot()).pub || {}).members;
    ok(wid && typeof n0 === "number" && n1 === n0 + 1, "소개 화면 숫자 ‘회원’: 새로 가입하면 1명 늘어요 (체험 계정은 세지 않아요)", { n0, n1 });
    BS.pubReset();
    const jC = await call("bootstrap", { method: "GET", query: { since: String(Date.now() - 1000) } });
    ok(jC.json.pub === undefined, "바뀐 것만 받을 때(since)는 회원 수를 다시 세지 않아요", jC.json.pub);
    r = await call("vod-auth", { body: { action: "withdraw", pw: "wrong1234", why: "가격이 부담돼요" } });
    ok(r.status === 401 && /비밀번호/.test(r.json.message), "비밀번호가 틀리면 탈퇴 안 돼요", r.json);
    r = await call("vod-auth", { body: { action: "withdraw", pw: "test1234w", why: "가격이 부담돼요" } });
    ok(r.json.ok, "비밀번호 맞으면 탈퇴", r.json);
    r = await call("vod-auth", { body: { action: "me" } });
    ok(!r.json.member, "탈퇴하면 바로 로그아웃", r.json);
    r = await call("vod-auth", { body: { action: "login", email: "wd@example.com", pw: "test1234w" } });
    ok(!r.json.ok, "탈퇴한 이메일 · 비밀번호로는 로그인 안 돼요", r.json);
    const keep = saveJar(); useJar({ dc_a: auth.sign({ r: "master" }) });
    const wm = docOf(await boot(), "vm:" + wid) || {};
    ok(wm.withdrawnAt && wm.withdrawWhy === "가격이 부담돼요" && wm.name === "탈퇴 회원" && !wm.email && !wm.phone && !wm.pwHash, "마스터: 탈퇴 시각 · 떠난 이유만 남고 이름 · 이메일 · 연락처 · 비밀번호는 지워져요", { name: wm.name, why: wm.withdrawWhy, email: !!wm.email });
    useJar(keep);
    BS.pubReset();
    const n2 = ((await boot()).pub || {}).members;
    ok(n2 === n0, "탈퇴 회원은 ‘회원’ 숫자에서 빠져요", { n0, n2 });
    r = await call("vod-auth", { body: { action: "signup", email: "wd@example.com", pw: "test1234w", name: "탈OO", phone: "010-0000-7777", agree: true } });
    ok(r.json.ok && r.json.member.id !== wid, "같은 이메일로 다시 가입하면 새 회원", r.json);
    r = await call("vod-auth", { body: { action: "withdraw", pw: "test1234w", why: "<b>내 이름은 홍길동</b>" } });
    useJar({ dc_a: auth.sign({ r: "master" }) });
    const wm2 = (await boot()).docs.filter((d) => /^vm:/.test(d[0]) && d[1].withdrawnAt && d[0] !== "vm:" + wid).map((d) => d[1])[0] || {};
    ok(r.json.ok && wm2.withdrawWhy === "", "보기에 없는 이유(자유 글 · 개인정보)는 남기지 않아요", wm2.withdrawWhy);
    useJar(jarDemo); BS.pubReset();
  }
  const ran2 = await require(path.join(TMP, "class/api/_lib/init.js")).runPendingOps();
  ok(!ran2.length, "다음 배포 때는 다시 돌지 않아요", ran2);
  // 2026-11-23-choi-home-off: 배포 때 강사 choi 를 두잉고 소개 · 수강생 로그인 강사 목록에서만 빼요 (homeOff — 계정은 운영 중 그대로)
  {
    const st14 = require(path.join(TMP, "class/api/_lib/store.js")), rc14 = await st14.getDoc("ins:choi");
    ok(ran.some((x) => x.id === "2026-11-23-choi-home-off" && x.ok) && !!rc14 && rc14.v.homeOff === true && rc14.v.status === "active", "배포 때 강사 choi 두잉고 소개 목록 OFF 작업이 돌아요 (homeOff · 운영 중 그대로)", rc14 && { homeOff: rc14.v.homeOff, status: rc14.v.status });
  }
  // 2026-11-23-choi-store-off → 2026-11-23-choi-store-on: 강사 choi 스토어를 숨겼다가 같은 날 다시 보이게(유나 ON) — 두 작업이 차례로 돌아
  //   결과는 보이는 상태 (숨김 목록에 choi 없음 · 결제 가격표의 choi 상품은 원래 판매 상태) — 아래 결제 시험(choi 상품 v5)도 그대로
  {
    const st14b = require(path.join(TMP, "class/api/_lib/store.js")), rm14 = await st14b.getDoc("meta"), rv14 = await st14b.getDoc("vcat");
    const cp14 = ((rv14 && rv14.v && rv14.v.products) || []).filter((p) => p && p.iid === "choi"), ix14 = ran.map((x) => x.id);
    ok(ran.some((x) => x.id === "2026-11-23-choi-store-off" && x.ok) && ran.some((x) => x.id === "2026-11-23-choi-store-on" && x.ok) && ix14.indexOf("2026-11-23-choi-store-off") < ix14.indexOf("2026-11-23-choi-store-on") &&
      !!rm14 && (rm14.v.vod.insOff || []).indexOf("choi") < 0 && cp14.length > 0 && cp14.every((p) => p.status !== "hidden"),
      "배포 때 강사 choi 스토어 숨김 → 다시 보이기 작업이 차례로 돌아요 (결과: 숨김 목록에 choi 없음 · 결제 가격표 원래 판매 상태)", { insOff: rm14 && rm14.v.vod.insOff, cp: cp14.map((p) => p.id + ":" + p.status) });
  }
  // 2026-11-23-store-home-order: 첫 화면 배너(v14 배너 끔 · 그 자리에 v3 배너) · 홈 섹션 순서 고정(새로 올라온 · 가장 많이 듣는)
  {
    const st14c = require(path.join(TMP, "class/api/_lib/store.js")), rm14c = await st14c.getDoc("meta"), v14c = (rm14c && rm14c.v && rm14c.v.vod) || {};
    const bs14c = v14c.banners || [], sl14c = bs14c.find((b) => b && b.id === "vb-seller"), b3 = bs14c.find((b) => b && b.id === "vb-v3"), rl14c = (k) => (v14c.homeRails || []).find((r) => r && r.k === k) || {};
    const has14c = (id) => (v14c.products || []).some((p) => p && p.id === id); // 이 시험의 스토어 데이터는 v5 · v6 만 — 있는 클래스만 고정 · v3 가 없으면 배너도 안 넣어요
    ok(ran.some((x) => x.id === "2026-11-23-store-home-order" && x.ok) && (!sl14c || sl14c.on === false) && (has14c("v3") ? !!b3 && b3.pid === "v3" && b3.on === true && /^BEST/.test(b3.eyebrow) : !b3) &&
      (!sl14c || !b3 || bs14c.indexOf(b3) === bs14c.indexOf(sl14c) - 1) && rl14c("new").mode === "pin" && rl14c("new").picks.length > 0 && rl14c("new").picks.every(has14c) && rl14c("new").picks.indexOf("v14") < 0 &&
      (v14c.homeRails || []).map((r) => r.k).slice(0, 5).join() === "best,why,ebook,cat,new",
      "배포 때 첫 화면 배너 · 홈 섹션 순서 작업이 돌아요 (v14 배너 끔 · 바로 앞 자리에 v3 배너 · 새로 올라온 섹션은 있는 클래스만 고정 · v14 고정 안 함 · 섹션 순서 그대로)",
      { banners: bs14c.map((b) => b.id + ":" + (b.on !== false)), rails: (v14c.homeRails || []).map((r) => r.k + (r.mode ? ":" + r.mode + ":" + (r.picks || []).join("/") : "")) });
  }
  // 2026-11-24-store-pop-on: 스토어 팝업(정식 런칭 12월 중순 · 토스페이먼츠 PG 심사 중) 켜기 — 문구는 화면 기본값
  {
    const st14p = require(path.join(TMP, "class/api/_lib/store.js")), rm14p = await st14p.getDoc("meta"), pp14 = rm14p && rm14p.v && rm14p.v.vod && rm14p.v.vod.popup;
    ok(ran.some((x) => x.id === "2026-11-24-store-pop-on" && x.ok) && !!pp14 && pp14.on === true && Object.keys(pp14).join() === "on",
      "배포 때 스토어 팝업 켜기 작업이 돌아요 (popup = { on: true } · 문구는 화면 기본값)", { popup: pp14 });
  }
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const mt3 = docOf(j, "meta"); mt3.vod.settings.demoLogin = false;
  await sync([{ k: "meta", base: verOf(j, "meta"), put: mt3 }]);
  useJar({});
  r = await call("vod-auth", { body: { action: "login", email: "vod@gmail.com", pw: "vod" } });
  ok(r.status === 403 && /쉬고/.test(r.json.message), "마스터가 체험 계정을 끄면 로그인 막힘", r.json);

  console.log("15) 자동 입금 확인 (페이액션 웹훅)");
  Object.assign(process.env, { PAYACTION_API_KEY: "pa-key", PAYACTION_MALL_ID: "mall-1", PAYACTION_WEBHOOK_KEY: "wh-key-123" });
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const mt4 = docOf(j, "meta"); mt4.vod.settings = Object.assign({}, mt4.vod.settings, { bank: "국민은행", account: "123-456", holder: "(주)두고홀딩스", bankMode: "on" });
  await sync([{ k: "meta", base: verOf(j, "meta"), put: mt4 }]);
  r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.bankAuto === true && !JSON.stringify(r.json).includes("pa-key") && !JSON.stringify(r.json).includes("wh-key"), "config: 자동 입금 확인 켜짐 (키는 안 보냄)", r.json.cfg);
  useJar(jarB);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 365, method: "bank", depositor: "나OO" } });
  const b16 = r.json.no, reg = PAY.find((x) => x.path === "/order" && x.body.order_number === b16);
  ok(r.json.ok && reg && reg.body.order_amount === r.json.amount && reg.body.billing_name === "나OO" && reg.mall === "mall-1" && /\+09:00$/.test(reg.body.order_date), "무통장 주문 → 페이액션에 주문 등록 (입금자명 · 금액)", reg);
  r = await call("vod-bank", { body: { order_number: b16, order_status: "매칭완료" }, headers: { "x-webhook-key": "nope" } });
  ok(r.status === 401, "웹훅 키가 틀리면 거절", r.json);
  r = await call("vod-bank", { body: { order_number: b16, order_status: "매칭완료", processing_date: "2026-10-29T03:00:00+09:00" }, headers: { "x-webhook-key": "wh-key-123" } });
  ok(r.status === 200 && r.json.status === "success", "매칭완료 웹훅 → { status: success }", r.json);
  r = await call("vod-bank", { body: { order_number: b16, order_status: "매칭완료" }, headers: { "x-api-key": "wh-key-123" } });
  ok(r.json.status === "success", "같은 알림이 또 와도 success (한 번만 확인)", r.json);
  j = await boot();
  ok(docOf(j, "vo:" + b16).status === "paid" && docOf(j, "vo:" + b16).pg.via === "payaction", "새벽 입금도 자동으로 결제 완료 → 바로 수강", docOf(j, "vo:" + b16).pg);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "bank", depositor: "나OO" } });
  const b17 = r.json.no;
  r = await call("vod-pay", { body: { action: "cancelPending", no: b17 } });
  ok(r.json.ok && PAY.some((x) => x.path === "/order-exclude" && x.body.order_number === b17), "입금 전 취소하면 페이액션 맞추기에서도 빼요", PAY.map((x) => x.path));
  process.env.PAYACTION_API_KEY = "wrong";
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "bank", depositor: "나OO" } });
  j = await boot();
  ok(r.json.ok && docOf(j, "vo:" + r.json.no).status === "pending" && docOf(j, "vo:" + r.json.no).pg.pa === "fail", "페이액션 등록이 실패해도 주문은 받고 표시만 (마스터가 직접 확인)", docOf(j, "vo:" + r.json.no).pg);
  ["PAYACTION_API_KEY", "PAYACTION_MALL_ID", "PAYACTION_WEBHOOK_KEY"].forEach((k) => delete process.env[k]);

  console.log("16) 계정 보안 · 파트너 · 운영자 로그인");
  process.env.MASTER_PASSWORD = "Test-master9@";
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "master", id: "DOOGOBIZ", pw: "Test-master9@" } });
  ok(r.json.ok && r.json.role === "master", "마스터: doogobiz + 환경변수 비밀번호 (대소문자 무관 아이디)", r.json);
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "master", id: "doogobiz", pw: "wrong" } });
  ok(r.json.error === "notfound", "마스터: 비밀번호가 틀리면 거절", r.json);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const mt5 = docOf(j, "meta");
  Object.assign(mt5, { staff: [{ id: "st1", name: "매니저", loginId: "mgr", pw: "mgr-pw1", status: "active", perms: ["master/vod"] }, { id: "st2", name: "멈춘", loginId: "old", pw: "old-pw1", status: "paused" }],
    affiliates: [{ id: "aff-t", name: "테스트파트너", loginId: "ptest", pw: "pt-pw1", status: "active", rs: 20, instructors: [{ iid: "moon", rs: null }] }, { id: "aff-x", name: "다른파트너", loginId: "other", pw: "ot-pw1", status: "active", instructors: [] }],
    affPayouts: { "aff-t:2026-09": { paidAt: "2026-10-10" }, "aff-x:2026-09": { paidAt: "2026-10-10" } }, affSettings: { rs: 20, payDay: 10 }, adminLog: [{ at: 1, msg: "비밀 기록" }], contracts: { moon: { docs: { biz: { name: "문.pdf" } } }, choi: { docs: { biz: { name: "초이.pdf" } } } } });
  await sync([{ k: "meta", base: verOf(j, "meta"), put: mt5 }]);
  await sync([{ k: "bill:moon:b1", base: 0, put: { id: "b1", instructorId: "moon", cohortName: "5기", fee: 1000000, phone: "010-1111-2222", contactName: "문OO", masterMemo: "메모", requestedAt: Date.now(), paidAt: "2026-10-01" } }]);
  useJar({});
  j = await boot();
  const pubM = docOf(j, "meta");
  ok(!("staff" in pubM) && !("affiliates" in pubM) && !("affPayouts" in pubM) && !("adminLog" in pubM) && !("affSettings" in pubM) && !JSON.stringify(j).includes("pt-pw1") && !JSON.stringify(j).includes("mgr-pw1"), "방문자: 운영자 · 파트너 계정(비밀번호)과 지급 · 운영 기록이 안 보임", Object.keys(pubM));
  useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
  j = await boot();
  const insM = docOf(j, "meta");
  ok(!("staff" in insM) && !("affiliates" in insM) && Object.keys(insM.contracts || {}).join() === "choi", "강사: 운영자 · 파트너 계정은 안 보이고 서류는 자기 것만", { k: Object.keys(insM), c: Object.keys(insM.contracts || {}) });
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "partner", id: "ptest", pw: "nope" } });
  ok(r.json.error === "notfound", "파트너: 비밀번호가 틀리면 거절", r.json);
  r = await call("auth", { body: { action: "admin", tab: "partner", id: "PTEST", pw: "pt-pw1" } });
  ok(r.json.ok && r.json.role === "partner" && r.json.pid === "aff-t", "파트너 로그인 (서버에서 확인)", r.json);
  j = await boot();
  const ptM = docOf(j, "meta"), bl = docOf(j, "bill:moon:b1");
  ok(j.me.admin && j.me.admin.role === "partner" && ptM.affiliates.length === 1 && ptM.affiliates[0].id === "aff-t" && Object.keys(ptM.affPayouts).join() === "aff-t:2026-09" && !("staff" in ptM), "파트너: 내 계정 · 내 지급 기록만", { me: j.me.admin, a: ptM.affiliates.map((x) => x.id), p: Object.keys(ptM.affPayouts || {}) });
  ok(bl && bl.fee === 1000000 && !bl.phone && !bl.contactName && !bl.masterMemo, "파트너: 연결된 강사의 이용료 신청은 금액만 (연락처 · 메모 빼고)", bl);
  ptM.affiliates[0].bank = "카카오뱅크"; ptM.affiliates[0].rs = 99; ptM.affiliates[0].status = "active"; ptM.affiliates[0].instructors = [{ iid: "moon" }, { iid: "choi" }]; ptM.flags = { hacked: true };
  await sync([{ k: "meta", base: verOf(j, "meta"), put: ptM }]);
  await sync([{ k: "inq:pq1", base: 0, put: { name: "추천 강사", phone: "010-3333-4444", course: "쇼핑몰", affId: "aff-x", byPartner: true, status: "won", thread: [{ by: "master", text: "가짜", name: "x" }] } }]);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const afT = docOf(j, "meta").affiliates.find((x) => x.id === "aff-t"), q1 = docOf(j, "inq:pq1");
  ok(afT.bank === "카카오뱅크" && afT.rs === 20 && afT.instructors.length === 1 && !(docOf(j, "meta").flags || {}).hacked, "파트너: 계좌는 고쳐지고 RS · 담당 강사 · 다른 설정은 그대로", afT);
  ok(q1 && q1.affId === "aff-t" && q1.status === "new" && q1.thread[0].by === "partner", "파트너 추천: 내 추천으로만 · 상태는 ‘새 문의’", q1);
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "master", id: "mgr", pw: "mgr-pw1" } });
  ok(r.json.ok && r.json.role === "master" && r.json.staffId === "st1", "운영자 계정 로그인 (마스터 탭)", r.json);
  j = await boot();
  ok(j.me.admin && j.me.admin.staffId === "st1", "운영자 세션", j.me.admin);
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "master", id: "old", pw: "old-pw1" } });
  ok(r.json.error === "paused-staff", "멈춘 운영자 계정은 거절", r.json);
  delete process.env.MASTER_PASSWORD;

  console.log("16-1) 여러 강의를 맡은 코치 (테스트 코치 김하나: 문대표 · 초이)");
  { // 운영 DB의 테스트 코치는 정리 작업이 지워서, 여기서 두 번째 강의 코치를 직접 더해요
    const st161 = require(path.join(TMP, "class/api/_lib/store.js")), rc = await st161.getDoc("ins:choi"), ic = rc.v;
    if (!(ic.coaches || []).some((c) => c.id === "coach-hana")) { ic.coaches = (ic.coaches || []).concat([{ id: "coach-hana", name: "김하나", phone4: "1004", status: "active", perms: ["reviews", "questions"], createdAt: "2026-10-30" }]); await st161.writeDoc("ins:choi", ic, rc.ver); }
  }
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김 하나", pw: "1004" } });
  ok(r.json.choose && r.json.courses.length === 2 && r.json.courses.map((x) => x.iid).sort().join() === "choi,moon" && !jar.dc_a && !JSON.stringify(r.json).includes("1004"), "강의 2개를 맡은 코치: 바로 로그인하지 않고 강의 목록 (쿠키 없음 · 뒷자리 안 보냄)", r.json);
  ok(r.json.courses.every((x) => x.ins && x.title && typeof x.perms === "number"), "목록: 강사 이름 · 강의 이름 · 맡은 메뉴 수", r.json.courses);
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김하나", pw: "1004", iid: "logic" } });
  ok(r.json.error === "notfound" && !jar.dc_a, "맡지 않은 강의를 보내면 거절", r.json);
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김하나", pw: "9999" } });
  ok(r.json.error === "notfound" && !r.json.courses, "뒷자리가 틀리면 목록도 안 보여요", r.json);
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김하나", pw: "1004", iid: "choi" } });
  ok(r.json.ok && r.json.role === "coach" && r.json.iid === "choi" && r.json.cid === "coach-hana" && jar.dc_a, "고른 강의(초이)로 로그인", r.json);
  j = await boot();
  ok(j.me.admin && j.me.admin.role === "coach" && j.me.admin.iid === "choi" && !(j.docs || []).some((d) => /^stu:moon:/.test(d[0])) && (j.docs || []).some((d) => d[0] === "ins:choi"), "세션: 초이 강의 코치 (문대표 수강생은 안 내려와요)", j.me.admin);
  r = await call("auth", { body: { action: "coachSwitch" } });
  ok(r.json.ok && r.json.cur === "choi" && r.json.courses.length === 2, "코치센터: 맡은 강의 목록 다시 받기", r.json);
  r = await call("auth", { body: { action: "coachSwitch", iid: "logic" } });
  ok(r.json.error === "notfound", "맡지 않은 강의로는 못 옮겨요", r.json);
  r = await call("auth", { body: { action: "coachSwitch", iid: "moon" } });
  ok(r.json.ok && r.json.iid === "moon" && r.json.cid === "coach1", "다른 강의(문대표)로 옮기기", r.json);
  j = await boot();
  ok(j.me.admin && j.me.admin.role === "coach" && j.me.admin.iid === "moon" && j.me.admin.cid === "coach1", "옮긴 뒤 세션: 문대표 강의 코치", j.me.admin);
  useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
  r = await call("auth", { body: { action: "coachSwitch", iid: "moon" } });
  ok(r.status === 403, "코치가 아니면 강의 옮기기를 못 써요", r.json);
  // 한 강의의 코치 자리를 멈추면 남은 강의로 바로 로그인 · 둘 다 멈추면 거절
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const choiIns = docOf(j, "ins:choi");
  choiIns.coaches.find((x) => x.id === "coach-hana").status = "paused";
  await sync([{ k: "ins:choi", base: verOf(j, "ins:choi"), put: choiIns }]);
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김하나", pw: "1004" } });
  ok(r.json.ok && r.json.iid === "moon" && !r.json.choose, "초이 코치 자리를 멈추면 → 남은 문대표 강의로 바로 로그인", r.json);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const moonIns = docOf(j, "ins:moon");
  moonIns.coaches.find((x) => x.id === "coach1").status = "paused";
  await sync([{ k: "ins:moon", base: verOf(j, "ins:moon"), put: moonIns }]);
  useJar({});
  r = await call("auth", { body: { action: "admin", tab: "coach", id: "김하나", pw: "1004" } });
  ok(r.json.error === "paused-coach" && !jar.dc_a, "맡은 강의가 모두 멈추면 ‘사용 중지’ 안내", r.json);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  const ci2 = docOf(j, "ins:choi"), mi2 = docOf(j, "ins:moon");
  ci2.coaches.find((x) => x.id === "coach-hana").status = "active"; mi2.coaches.find((x) => x.id === "coach1").status = "active";
  await sync([{ k: "ins:choi", base: verOf(j, "ins:choi"), put: ci2 }, { k: "ins:moon", base: verOf(j, "ins:moon"), put: mi2 }]);
  useJar({});

  console.log("17) AI 조교 (문대표 학습 자료 + Claude)");
  useJar({});
  r = await call("ai-tutor", { body: { iid: "moon", q: "운송료 얼마예요?" } });
  ok(r.status === 403, "AI 조교: 로그인 안 하면 못 써요", r.json);
  useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
  r = await call("ai-tutor", { body: { iid: "moon", q: "운송료 얼마예요?" } });
  ok(r.status === 403, "AI 조교: 다른 강사는 문대표 조교를 못 써요", r.json);
  useJar({ dc_s: auth.sign({ r: "student", sid: "s1", iid: "moon" }) });
  r = await call("ai-tutor", { body: { iid: "moon", q: "1kg 넘으면 국제 운송료 얼마예요?" } });
  ok(r.json.ok && r.json.src === "kb" && r.json.hit === true && /NZ\$16/.test(r.json.text) && !AI.reqs.length, "키가 없으면: 학습 자료 카드에서 찾은 답 (운송료 NZ$16 · hit)", r.json);
  r = await call("ai-tutor", { body: { iid: "moon", q: "화성 날씨 알려줘" } });
  ok(r.json.ok && r.json.src === "kb" && r.json.hit === false && /1:1 요청/.test(r.json.text), "학습 자료에 없으면 지어내지 않고 1:1 요청 안내 (hit false)", r.json);
  // 2026-11-03 뉴질랜드 제조 · 배송 학습 파일 5개 (tutor/moon/*.md) — 키 없이 24시간: 카드 · 계산 · 법 지키기
  {
    const KBX = require(path.join(TMP, "class/api/_lib/tutor-kb.js")), now = Date.parse("2026-11-03T02:39:00Z"); // 뉴질랜드 11/3(화)
    const A = (q) => KBX.answer("moon", q, { now, ins: "문대표" });
    const L = KBX.load("moon");
    ok(L.files.length === 11 && L.files.filter((f) => /^moon\/doogobio-nz\//.test(f)).length === 5 && L.files.filter((f) => /^moon\/doogo-connect\//.test(f)).length === 5 && L.sections.length >= 25 && !/<!--/.test(L.text) && !/USD \$10|\$10 정도/.test(L.text) && /06-0145-0847640-00/.test(L.text) && /contact@doogoconnect\.com/.test(L.text), "학습 자료: moon.md + doogobio-nz 5개 + doogo-connect 5개 · 조교용 주석은 Claude 에게 안 보냄 · 언더밸류(USD $10) 안내는 뺐어요", { files: L.files, n: L.sections.length });
    // 배포 때 함수에 실리는 파일(vercel.json includeFiles)이 학습 자료 파일을 모두 덮는지 — 폴더를 한 단계 더 만들면 여기서 잡혀요
    {
      const inc = deployIncludes(), pats = inc.map((g) => new RegExp("^" + g.replace(/[.+^$()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$"));
      const files = L.files.map((f) => "api/_lib/tutor/" + f).concat(fs.existsSync(path.join(ROOT, "api/_lib/tutor/moon.json")) ? ["api/_lib/tutor/moon.json"] : []);
      const miss = files.filter((f) => !pats.some((r) => r.test(f)));
      ok(pats.length && !miss.length, "배포 함수에 함께 싣는 파일(Next.js: next.config.js INCLUDE · 예전: vercel.json includeFiles)이 학습 자료 " + files.length + "개 파일을 모두 함수에 실어요", { inc, miss });
    }
    const cases = [
      ["택배 언제 와요?", "배송 일정", "11월 5일(목) 직항편"], ["배송은 며칠 걸려요?", "배송 일정", "영업일 기준 약 5일"], ["발송은 무슨 요일에 해요?", "배송 일정", "화요일 · 목요일"],
      ["송장 조회는 어떻게 해요?", "송장 조회", "aciexpress.net/delivery"], ["2.3kg 보내면 운송료 얼마예요?", "국제 운송료", "NZ$29"], ["500g짜리 하나 보내면 배송비는?", "국제 운송료", "NZ$16"],
      ["3키로 국제 배송비 계산해줘", "국제 운송료", "NZ$36"], ["창고 보관료는 얼마예요?", "창고 관리", "NZ$45"], ["ACI 로그인이 안 돼요", "배대지(ACI 3PL)", "대문자"],
      ["발송 마감은 몇 시예요?", "배송 일정", "오후 2시쯤(한국 시간 오전 10시쯤)"], ["선송장이 뭐예요?", "선송장", "쇼핑몰에 입력"], ["스마트스토어 발송 지연 패널티 어떻게 막아요?", "선송장", "패널티"], ["운송료는 무슨 달러예요?", "국제 운송료", "NZD"],
      ["건강식품 몇 개까지 보낼 수 있어요?", "수량 제한", "최대 6개"], ["마누카꿀 5개랑 초록홍합 6개 같이 보내도 돼요?", "수량 제한", "기준 안이에요"], ["프로폴리스 7개 한 번에 보내도 되나요?", "수량 제한", "기준을 넘어요"],
      ["통관할 때 필요한 정보가 뭐예요?", "필수 항목", "개인통관고유부호"], ["마누카꿀은 어떻게 만들어요?", "생산 과정", "원심분리기"], ["꿀 색이 배치마다 달라요 왜 그래요?", "배치마다", "자연물"],
      ["상세 공정도 공개해 주나요?", "원산지", "One Batch"], ["제조 최소 수량(MOQ)이 몇 개예요?", "최소 제조 수량", "50개"], ["#00 캡슐에는 몇 mg 들어가요?", "캡슐", "400mg"],
      // 두고커넥트 (doogo-connect 5개)
      ["두고커넥트가 뭐예요?", "두고커넥트(DOOGO CONNECT)란", "OEM 제조 네트워크"], ["두고커넥트 장점이 뭐예요?", "특장점", "50개부터"], ["제조 기간은 얼마나 걸려요?", "리드타임", "3~4주"],
      ["어떤 제품을 만들 수 있어요?", "제조 가능 카테고리", "소프트젤"], ["어느 나라에서 제조해요?", "제조 국가", "뉴질랜드"], ["견적 요청은 어떻게 해요?", "견적 요청", "5,000P"], ["견적 포인트는 환불되나요?", "포인트 환불", "전액 환불"],
      ["제조는 어떤 순서로 진행돼요?", "제조 진행 순서", "회원가입"], ["누구나 제조 요청할 수 있나요?", "누구나 제조", "누구나"], ["해외 배송도 되나요?", "해외 배송", "전 세계"], ["제조사 입점은 어떻게 해요?", "제조사 입점", "실사"],
      ["두고커넥트 고객센터 연락처 알려주세요", "고객 지원", "contact@doogoconnect.com"],
      ["제조 비용 입금 계좌 알려주세요", "입금 계좌", "06-0145-0847640-00"], ["해외 송금할 때 swift 코드가 뭐예요?", "입금 계좌", "ANZBNZ22"]
    ];
    const miss = cases.filter(([q, t, m]) => { const a = A(q); return !(a.hit && !a.guard && a.text.indexOf(t) >= 0 && a.text.indexOf(m) >= 0); }).map((c) => c[0]);
    ok(!miss.length, "제조 · 배송 질문 " + cases.length + "개: 맞는 카드 · 계산(운송료 $29 · 도착일 · 6개 기준)", miss);
    const classQ = ["이번 주 과제 마감은?", "내 진도 알려줘", "다음 라이브 언제예요?", "라이브 무슨 요일이에요?", "과제 몇 개 남았어요?", "수강료 입금했는데 확인됐나요?", "사업자 통장 계좌 개설은 어디서 해요?", "상세페이지 만드는 법 알려줘", "쿠팡 입점하려면 서류 뭐 필요해요?", "오늘 점심 뭐 먹지?",
      "스마트스토어 장점이 뭐예요?", "환불 규정 알려주세요", "문대표님 연락처 알려주세요", "두잉고 홈페이지 주소가 뭐예요?", "쿠팡 입점 절차가 어떻게 돼요?", "강의는 몇 주 과정이에요?", "문대표님이랑 통화할 수 있어요?", "과제 마감 몇 시예요?", "인플루언서 마케팅은 어떻게 해요?"];
    ok(classQ.every((q) => !A(q).hit), "수업 · 다른 질문은 학습 자료 카드를 쓰지 않아요 (과제 마감 · 진도 · 라이브 · 수강료 입금 …)", classQ.filter((q) => A(q).hit));
    const guardQ = ["관세 안 내려면 가격 낮게 써도 돼요?", "언더밸류는 얼마로 적어요?", "인보이스 금액 줄여서 보내도 되나요?", "6개 넘으면 나눠서 보내도 돼요?", "10달러로 적으면 되나요?"];
    ok(guardQ.every((q) => A(q).guard && /실제 결제 가격/.test(A(q).text)) && !A("관세 안 내는 기준이 뭐예요?").guard && !A("신고 가격은 얼마로 적어요?").guard, "관세 회피(언더밸류 · 기준 피해 나눠 보내기)는 안내하지 않고 실제 가격 신고 안내 · 기준 질문은 그대로", guardQ.filter((q) => !A(q).guard));
    // 뉴질랜드 11/2(월) ~ 11/8(일) 낮 12시 · 마감 오후 2시 앞뒤
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => KBX._.arrival("오늘 주문하면 언제 받아요?", Date.parse("2026-11-01T23:00:00Z") + i * 864e5));
    const at = (iso) => KBX._.arrival("오늘 주문하면 언제 받아요?", Date.parse(iso));
    ok(/오늘 11월 2일\(월\) 오후 2시쯤\(한국 시간 오전 10시쯤\).*11월 3일\(화\) 직항편.*11월 7일\(토\) ~ 11월 9일\(월\)/s.test(days[0]) && /내일 11월 4일\(수\) 오후 2시쯤.*11월 5일\(목\) 직항편.*11월 10일\(화\) ~ 11월 11일\(수\)/s.test(days[1]) && /오늘 11월 4일\(수\).*11월 5일\(목\) 직항편/s.test(days[2]) && days.slice(3).every((d) => /11월 9일\(월\) 오후 2시쯤.*11월 10일\(화\) 직항편.*11월 14일\(토\) ~ 11월 16일\(월\)/s.test(d)), "도착일 계산: 월요일 마감 → 화요일 발송 → 토~월 · 수요일 마감 → 목요일 발송 → 다음 주 화~수 (뉴질랜드 날짜)", days);
    ok(/오늘 마감\(오후 2시쯤\)은 지났어요.*11월 4일\(수\) 오후 2시쯤.*11월 5일\(목\) 직항편/s.test(at("2026-11-02T01:00:00Z")) && /오늘 11월 4일\(수\) 오후 2시쯤/.test(at("2026-11-04T00:59:00Z")) && /11월 9일\(월\) 오후 2시쯤/.test(at("2026-11-04T01:00:00Z")) && /한국 시간 오전 11시쯤/.test(at("2026-06-10T01:00:00Z")), "마감 시각: 뉴질랜드 오후 2시 전이면 오늘 · 지나면 다음 마감 · 한국 시간은 서머타임에 맞춰 (11월 오전 10시 · 6월 오전 11시)", [at("2026-11-02T01:00:00Z"), at("2026-06-10T01:00:00Z")]);
    ok(KBX._.fee(1000) === 16 && KBX._.fee(1050) === 17 && KBX._.fee(1500) === 21 && KBX._.fee(3000) === 36 && KBX._.weightsIn("1kg 넘으면 2,300g").join() === "2300" && /NZ\$29.*뉴질랜드 달러\(NZD\)/s.test(A("2.3kg 운송료").text), "운송료: 1kg까지 NZ$16 · 넘으면 100g마다 NZ$1(남는 무게는 올림) · 뉴질랜드 달러 · ‘1kg 넘으면’은 무게로 안 셈", null);
  }
  r = await call("ai-tutor", { body: { iid: "moon", q: "택배 언제 와요?" } });
  ok(r.json.hit && /직항편/.test(r.json.text) && !AI.reqs.length, "서버로 물어도 같은 카드 답 (키 없이)", r.json);
  r = await call("ai-tutor", { body: { iid: "moon", q: "그럼 3kg은요?", history: [{ from: "me", text: "2.3kg 보내면 운송료 얼마예요?" }, { from: "bot", text: "$29예요" }] } });
  ok(r.json.hit && /NZ\$36/.test(r.json.text), "짧게 이어 물어도(‘그럼 3kg은요?’) 앞 질문과 이어서 답 (NZ$36)", r.json);
  let rlBefore = (await call("ai-tutor", { body: { iid: "moon", op: "info" } })).json;
  ok(rlBefore.ok && rlBefore.cards.length >= 25 && (rlBefore.tabs || []).map((x) => x.title).join("|") === "배송 · 통관|NZ 제조 · 결제|두고커넥트" && rlBefore.tabs.every((x) => x.list.length >= 6) && rlBefore.chips && rlBefore.chips.title === "배송 · 통관" && rlBefore.guard.length && !/0847640|ANZBNZ22|1FAIpQL|docs\.google|doogobio\.bill/.test(JSON.stringify(rlBefore)), "info: 화면이 쓸 낱말 · 정규식 · 질문 탭 3개(배송 · 통관 / NZ 제조 · 결제 / 두고커넥트)만 (학습 자료 내용 · 계좌는 안 보내요)", { cards: rlBefore.cards && rlBefore.cards.length, tabs: rlBefore.tabs });
  r = await call("ai-tutor", { method: "GET" });
  ok(r.status === 200 && r.json.kb && r.json.kb.moon && r.json.kb.moon.files === 11 && r.json.kb.moon.tabs.length === 3 && !/0847640/.test(JSON.stringify(r.json)), "GET: 배포 확인용 카드 · 파일 · 탭 수만 (내용 없음)", r.json);
  useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
  r = await call("ai-tutor", { body: { iid: "choi", op: "info" } });
  ok(r.json.ok && r.json.cards.length === 0 && r.json.chips === null && r.json.tabs.length === 0 && r.json.guard.length, "학습 자료가 없는 강사: 카드 · 탭 없음 (관세 회피 안내 규칙만)", r.json);
  r = await call("ai-tutor", { body: { iid: "choi", q: "관세 안 내려면 가격 낮게 써도 돼요?" } });
  ok(r.json.hit && /실제 결제 가격/.test(r.json.text), "학습 자료가 없는 강사 조교도 관세 회피 질문엔 같은 안내", r.json);
  useJar({ dc_s: auth.sign({ r: "student", sid: "s1", iid: "moon" }) });
  Object.assign(process.env, { ANTHROPIC_API_KEY: "sk-test", AI_TUTOR_MODEL: "tutor-test-model" });
  r = await call("ai-tutor", { body: { iid: "moon", q: "운송료 얼마예요?", history: [{ from: "bot", text: "반가워요" }, { from: "me", text: "안녕" }, { from: "bot", text: "안녕하세요!" }, { from: "me", text: "질문 있어요" }] } });
  const aq = AI.reqs[AI.reqs.length - 1] || { h: {}, body: {} }, sys = ((aq.body.system || [])[0]) || {};
  ok(r.json.ok && r.json.src === "ai" && /\$16/.test(r.json.text), "키가 있으면 Claude가 답해요", r.json);
  ok(aq.body.model === "tutor-test-model" && aq.body.fallbacks === "default" && /server-side-fallback-2026-07-01/.test(aq.h["anthropic-beta"] || "") && aq.body.output_config && aq.body.output_config.effort === "low", "모델은 환경 변수 · 거절 대비(fallbacks) · effort low", { m: aq.body.model, b: aq.h["anthropic-beta"], f: aq.body.fallbacks, o: aq.body.output_config });
  ok(sys.cache_control && sys.cache_control.type === "ephemeral" && /06-0145-0847640-00/.test(sys.text) && /언더밸류/.test(sys.text) && /자주 묻는 질문/.test(sys.text), "시스템 프롬프트: 문대표 학습 자료 + 강의 FAQ + 법 지키는 규칙 (캐시)", (sys.text || "").length);
  const ms = aq.body.messages || [];
  ok(ms.length === 3 && ms[0].role === "user" && ms[1].role === "assistant" && ms[2].role === "user" && ms[2].content === "운송료 얼마예요?" && /질문 있어요/.test(ms[0].content) === false, "대화: 사용자부터 · 번갈아 · 마지막은 지금 질문", ms);
  r = await call("ai-tutor", { body: { iid: "moon", q: "2.3kg 보내면 운송료 얼마예요?" } });
  const aq2 = AI.reqs[AI.reqs.length - 1] || { body: {} }, lastU = ((aq2.body.messages || []).slice(-1)[0] || {}).content || "";
  ok(r.json.src === "ai" && r.json.hit === true && /\[조교 계산/.test(lastU) && /NZ\$29/.test(lastU) && /^2\.3kg 보내면 운송료 얼마예요\?/.test(lastU), "키가 있으면: 카드에서 계산한 값(2.3kg → NZ$29)을 질문 끝에 붙여 Claude에게", lastU);
  const nAI = AI.reqs.length;
  r = await call("ai-tutor", { body: { iid: "moon", q: "관세 안 내려면 가격 낮게 써도 돼요?" } });
  ok(r.json.src === "kb" && r.json.hit && /실제 결제 가격/.test(r.json.text) && AI.reqs.length === nAI, "관세 회피 질문은 키가 있어도 Claude 없이 같은 안내", r.json);
  AI.next = { status: 200, body: { id: "msg_r", type: "message", role: "assistant", content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } } };
  r = await call("ai-tutor", { body: { iid: "moon", q: "화성 날씨 알려줘" } });
  ok(r.json.ok && /답하기 어려워요/.test(r.json.text), "Claude가 거절하면 1:1 요청 안내", r.json);
  AI.next = { status: 200, body: { id: "msg_r", type: "message", role: "assistant", content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 } } };
  r = await call("ai-tutor", { body: { iid: "moon", q: "운송료" } });
  ok(r.json.ok && r.json.hit && /NZ\$16/.test(r.json.text), "학습 자료 카드가 있는 질문은 Claude가 거절해도 카드 답", r.json);
  AI.next = { status: 401, body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } };
  const errLog = console.error; console.error = () => {};
  r = await call("ai-tutor", { body: { iid: "moon", q: "국제 운송료 1kg 얼마예요?" } });
  console.error = errLog;
  ok(r.json.ok && r.json.src === "kb" && /\$16/.test(r.json.text), "키가 틀리면(401) 학습 자료 답으로", r.json);
  AI.next = null; delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_TUTOR_MODEL;
  let n429 = 0;
  { const st17 = require(path.join(TMP, "class/api/_lib/store.js")); await st17.rlClear(["ai:stu:moon:s1"]); }
  for (let i = 0; i < 31; i++) { r = await call("ai-tutor", { body: { iid: "moon", q: "운송료" } }); if (r.status === 429) n429++; }
  r = await call("ai-tutor", { body: { iid: "moon", op: "info" } });
  ok(n429 === 1 && r.status === 200 && r.json.ok, "한 사람당 15분에 30번까지 (info 는 횟수에 안 세요)", { n429, info: r.status });

  console.log("18) CRM 실제 발송 (솔라피 · Resend)");
  const st18 = require(path.join(TMP, "class/api/_lib/store.js"));
  const mkM = (id, o) => st18.writeDoc("vm:" + id, Object.assign({ id, name: "회원" + id, email: id + "@ex.com", phone: "010-1234-" + id.slice(-4), marketing: true, consent: { mkt: true, ch: ["sms", "email", "kakao"], night: false, at: Date.now() } }, o));
  await mkM("cm-0001", {}); await mkM("cm-0002", { consent: { mkt: false, ch: [], at: Date.now() }, marketing: false }); await mkM("cm-0003", { consent: { mkt: true, ch: ["email"], at: Date.now() } }); await mkM("cm-0004", { phone: "" });
  const MIDS = ["cm-0001", "cm-0002", "cm-0003", "cm-0004"];
  useJar({});
  r = await call("admin", { body: { action: "msg-status" } });
  ok(r.status === 403, "발송: 마스터만", r.json);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("admin", { body: { action: "msg-status" } });
  ok(r.json.ok && !r.json.cfg.sms && !r.json.cfg.email && !r.json.cfg.alim, "키가 없으면 모든 채널 ‘연결 전’", r.json.cfg);
  r = await call("admin", { body: { action: "msg-send", ch: "sms", mids: MIDS, text: "{이름}님 쿠폰 드려요" } });
  ok(r.status === 409 && !SOL.length, "연결 전 채널로는 보내지 않아요", r.json);
  Object.assign(process.env, { SOLAPI_API_KEY: "sk-sol", SOLAPI_API_SECRET: "sec-sol", SOLAPI_SENDER: "0212345678", SOLAPI_PFID: "KA01PF-test", RESEND_API_KEY: "re-test", MAIL_FROM: "두고클래스 <hello@doogoclass.com>" });
  r = await call("admin", { body: { action: "msg-status" } });
  ok(r.json.cfg.sms && r.json.cfg.alim && r.json.cfg.brand && r.json.cfg.email && r.json.cfg.sender === "02-****-5678" && !JSON.stringify(r.json).includes("sec-sol") && !JSON.stringify(r.json).includes("re-test"), "키를 넣으면 연결됨 (비밀 값 · 발신번호는 가림)", r.json.cfg);
  r = await call("admin", { body: { action: "msg-send", ch: "sms", mids: MIDS, text: "{이름}님 이번 주 쿠폰 드려요" } });
  ok(r.status === 409 && /080/.test(r.json.message), "광고 문자는 080 수신거부 번호가 있어야 보내요", r.json);
  const mt18 = await st18.getDoc("meta"); const mv = mt18.v; mv.vod = mv.vod || {}; mv.vod.crm = Object.assign({}, mv.vod.crm, { send: { optout: "080-123-4567", targeting: "I" } }); await st18.writeDoc("meta", mv, mt18.ver);
  const KST = (h) => { const d = new Date(); d.setUTCHours(h - 9, 0, 0, 0); return d.getTime() + 864e5; }; // 내일 한국 시간 h시
  r = await call("admin", { body: { action: "msg-send", ch: "sms", mids: MIDS, text: "{이름}님 이번 주 쿠폰 드려요", at: KST(11) } });
  const sm = (SOL[SOL.length - 1] || { body: { messages: [] } }), m1 = sm.body.messages[0] || {};
  ok(r.json.ok && r.json.sent === 1 && sm.body.messages.length === 1 && m1.to === "01012340001" && m1.from === "0212345678" && /^\(광고\) 회원cm-0001님/.test(m1.text) && /080-123-4567/.test(m1.text) && !!sm.body.scheduledDate, "문자: 동의한 회원만 · (광고) · 080 수신거부 · 예약", { r: r.json, m1, sd: sm.body.scheduledDate });
  ok(r.json.skip["소식 받기 미동의"] === 1 && r.json.skip["이 채널 미동의"] === 1 && r.json.skip["휴대폰 번호 없음"] === 1, "못 보낸 이유를 서버가 다시 세요", r.json.skip);
  ok(/^HMAC-SHA256 apiKey=sk-sol, date=[^,]+, salt=[0-9a-f]+, signature=[0-9a-f]{64}$/.test(sm.auth), "솔라피 인증 헤더 (HMAC-SHA256)", sm.auth.replace(/signature=.*/, "signature=…"));
  r = await call("admin", { body: { action: "msg-send", ch: "brand", mids: MIDS, text: "{이름}님 소식", at: KST(22) } });
  ok(r.status === 409 && /08:00/.test(r.json.message), "브랜드 메시지: 밤 8시 50분 ~ 아침 8시는 막아요", r.json);
  r = await call("admin", { body: { action: "msg-send", ch: "brand", mids: MIDS, text: "{이름}님 소식", at: KST(10) } });
  const bm = (SOL[SOL.length - 1].body.messages || [])[0] || {};
  ok(r.json.sent === 1 && bm.type === "BMS_TEXT" && bm.kakaoOptions.pfId === "KA01PF-test" && bm.kakaoOptions.bms.targeting === "I", "브랜드 메시지: BMS_TEXT · 채널 pfId · 대상 I", bm);
  r = await call("admin", { body: { action: "msg-send", ch: "alim", mids: MIDS, text: "#{이름}님, 결제가 완료됐어요." } });
  ok(r.status === 409 && /템플릿/.test(r.json.message), "알림톡은 템플릿 ID 없이 못 보내요", r.json);
  r = await call("admin", { body: { action: "msg-send", ch: "alim", mids: MIDS, text: "#{이름}님, 결제가 완료됐어요.", templateId: "TPL01" } });
  const am = (SOL[SOL.length - 1].body.messages || []);
  ok(r.json.sent === 3 && am.length === 3 && am[0].type === "ATA" && am[0].kakaoOptions.templateId === "TPL01" && am[0].kakaoOptions.variables["#{이름}"] === "회원cm-0001" && !/광고/.test(am[0].text), "알림톡: 정보성이라 동의와 상관없이 · 템플릿 변수 채움", am[0]);
  r = await call("admin", { body: { action: "msg-send", ch: "email", mids: MIDS, text: "{이름}님 새 강의 소식", subject: "{이름}님 새 강의" } });
  const em = (RES[RES.length - 1] || { body: [] }).body;
  ok(r.json.sent === 3 && em.length === 3 && /^\(광고\) 회원cm-0001님 새 강의$/.test(em[0].subject) && em[0].from === "두고클래스 <hello@doogoclass.com>" && /수신 거부|소식 받기/.test(em[0].html) && RES[RES.length - 1].auth === "Bearer re-test", "이메일: 이메일 동의 회원 3명(휴대폰 없어도) · 제목 (광고) · 수신 거부 안내", { n: em.length, s: em[0] && em[0].subject });
  ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_SENDER", "SOLAPI_PFID", "RESEND_API_KEY", "MAIL_FROM"].forEach((k) => delete process.env[k]);

  console.log("\n가상계좌 · 계좌이체 · 네이버페이 · 카카오페이 · 환불 계좌 · 토스 결제 조회");
  const MASTER = auth.sign({ r: "master" });
  process.env.TOSS_METHODS = "kakao,card,vbank,naver,transfer,phone"; process.env.TOSS_VBANK_HOURS = "48";
  r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.toss.methods.join() === "naver,kakao,card,vbank" && r.json.cfg.toss.vbankHours === 48, "설정: TOSS_METHODS → 결제 화면 순서(네이버페이 · 카카오페이 · 카드 · 가상계좌 · 퀵계좌이체 · 모르는 값은 버림) · 입금 기한 48시간", r.json.cfg.toss);
  process.env.TOSS_METHODS = "card,transfer"; delete process.env.TOSS_VBANK_HOURS;
  r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.toss.methods.join() === "card" && r.json.cfg.toss.vbankHours === 72, "설정에서 빼면 가상계좌 · 간편결제는 닫혀요 · 퀵계좌이체는 넣어도 안 열려요 (입금 기한 기본 72시간)", r.json.cfg.toss);
  delete jar.dc_v; delete jar.dc_a;
  await store.rlClear(["vip:1.2.3.4"]); // 같은 IP 로 가입을 여러 번 해서
  r = await call("vod-auth", { body: { action: "signup", email: "va@example.com", pw: "test1234a", pw2: "test1234a", name: "가상OO", phone: "010-0000-7777", agree: true } });
  ok(r.json.ok && r.json.member, "가상계좌 테스트 회원 가입", r.json);
  const vaMid = r.json.member.id;
  { const vc = jar.dc_v; delete jar.dc_v; jar.dc_a = MASTER; const jm = await boot(); await sync([{ k: "vm:" + vaMid, base: verOf(jm, "vm:" + vaMid), ops: [{ p: ["points"], v: 3000 }] }]); delete jar.dc_a; jar.dc_v = vc; }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, points: 1000, method: "vbank" } });
  ok(r.status === 409, "가상계좌가 닫혀 있으면 결제 준비 거절", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "naver" } });
  ok(r.status === 409 && /받지 않아요/.test(r.json.message), "네이버페이를 열지 않았으면 결제 준비 거절", r.json);
  process.env.TOSS_METHODS = "card,transfer,vbank,naver,kakao";
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, points: 1000, method: "vbank" } });
  ok(r.json.ok && r.json.paymentId && r.json.amount > 0 && r.json.customerKey && /^[A-Za-z0-9_=.@-]{2,50}$/.test(r.json.customerKey), "가상계좌 결제 준비 (포인트 1,000 사용 · 토스 구매자 키)", r.json);
  const vaP = r.json.paymentId, vaN = r.json.no, vaAmt = r.json.amount, VA_DUE = "2026-11-02T23:59:59";
  vaLike(vaP, vaAmt, "88", "56211234567890", VA_DUE);
  r = await call("vod-pay", { body: cpl(vaP) });
  const vaO0 = (r.json.orders || [])[0] || {};
  ok(r.json.ok && r.json.vbank && vaO0.status === "pending" && vaO0.method === "vbank" && vaO0.vbank.account === "56211234567890" && vaO0.vbank.bank === "88" && vaO0.dueAt === Date.parse(VA_DUE + "+09:00") && vaO0.pg.st === "issued" && !JSON.stringify(r.json).includes(PG[vaP].secret),
    "발급 → 입금 대기 · 은행(토스 코드) · 계좌 · 입금 기한(토스 한국 시각) · 입금 웹훅 비밀값(secret)은 회원에게 안 보내요", r.json);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === 2000, "발급 때 포인트를 써 둬요 (다른 주문에 또 못 써요)", r.json.member.points);
  r = await call("vod-pay", { body: cpl(vaP) });
  ok(r.json.ok && r.json.vbank, "발급 확인이 두 번 와도 그대로");
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "bankOk", no: vaN } });
  ok(r.status === 409 && /자동/.test(r.json.message), "가상계좌는 마스터가 직접 입금 확인 못 해요 (토스가 알려 줘요)", r.json);
  delete jar.dc_a;
  r = await hookDeposit(vaP, "wrong-secret");
  ok(r.status === 401 && (await store.getDoc("vo:" + vaN)).v.status === "pending", "입금 웹훅(DEPOSIT_CALLBACK): 비밀값(secret)이 다르면 거절", r.json);
  r = await hook({ createdAt: new Date().toISOString(), secret: PG[vaP].secret, status: "DONE", transactionKey: "dtx_x", orderId: vaP });
  ok(r.status === 200 && (await store.getDoc("vo:" + vaN)).v.status === "pending", "입금 웹훅 본문만 믿지 않아요 — 토스 조회가 아직 입금 대기면 그대로");
  deposit(vaP);
  r = await hookDeposit(vaP);
  ok(r.status === 200, "가상계좌 입금 웹훅 받기");
  r = await call("vod-pay", { body: { action: "orders" } });
  const vaO = r.json.orders.find((o) => o.no === vaN);
  ok(vaO.status === "paid" && vaO.pg.st === "paid" && vaO.vbank && vaO.paidAt > 0 && vaO.pg.receiptUrl === "https://r/" + vaP && vaO.pg.issuedAt > 0, "입금 웹훅 → 결제 완료 (계좌 정보 · 영수증 · 발급 시각 남김)", vaO);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === 2000, "입금돼도 포인트는 한 번만 빠져요", r.json.member.points);
  r = await call("vod-pay", { body: { action: "cancel", no: vaN } });
  ok(r.status === 400 && /계좌/.test(r.json.message) && (await store.getDoc("vo:" + vaN)).v.status === "paid", "가상계좌 바로 취소: 환불 받을 계좌가 없으면 막아요 (주문은 그대로)", r.json);
  { r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "vbank" } });
    const vq = r.json.paymentId, vqN = r.json.no, vqA = r.json.amount;
    vaLike(vq, vqA, "90", "7979000000009", VA_DUE);
    await call("vod-pay", { body: cpl(vq) }); deposit(vq); await hookDeposit(vq);
    r = await call("vod-pay", { body: { action: "cancel", no: vqN, refundAccount: { bank: "TOSS", number: "1000-1234-5678", holder: "가상OO" } } });
    const ra = (PG[vq].lastCancel || {}).refundAccount || {}, oq = (await store.getDoc("vo:" + vqN)).v;
    ok(r.json.ok && r.json.way === "vbank" && PG[vq].status === "CANCELED" && ra.bank === "92" && ra.accountNumber === "100012345678" && ra.holderName === "가상OO" && oq.status === "refunded" && oq.pg.cancel.st === "requested",
      "가상계좌 바로 취소: 적은 환불 계좌로 토스가 돌려줘요 (토스 은행 코드 · 숫자만 계좌 · 예금주) · 환불은 ‘진행 중’(영업일 2일)", { json: r.json, ra, cancel: oq.pg.cancel }); }
  let vaJ = await boot();
  r = await sync([{ k: "vo:" + vaN, base: verOf(vaJ, "vo:" + vaN), ops: [{ p: ["refundReq"], v: { why: "단순 변심", text: "", acct: { bank: "06", number: "123-456-78901", holder: "가상OO", evil: "x" } } }] }]);
  vaJ = await boot();
  const vaRq = (docOf(vaJ, "vo:" + vaN) || {}).refundReq || {};
  ok(vaRq.acct && vaRq.acct.bank === "06" && vaRq.acct.number === "12345678901" && vaRq.acct.holder === "가상OO" && !vaRq.acct.evil, "회원 환불 요청: 돌려받을 계좌 (토스 은행 코드 · 숫자만 · 다른 칸은 버림)", vaRq);
  { const vj = await boot(); const d = docOf(vj, "vo:" + vaN);
    await store.writeDoc("vo:" + vaN, Object.assign({}, (await store.getDoc("vo:" + vaN)).v, { refundReq: undefined }), (await store.getDoc("vo:" + vaN)).ver);
    const vj2 = await boot();
    await sync([{ k: "vo:" + vaN, base: verOf(vj2, "vo:" + vaN), ops: [{ p: ["refundReq"], v: { why: "단순 변심", text: "", acct: { bank: "KOOKMIN", number: "123-456-78901", holder: "가상OO" } } }] }]);
    const rq2 = (docOf(await boot(), "vo:" + vaN) || {}).refundReq || {};
    ok(d && rq2.acct && rq2.acct.bank === "06", "예전(포트원 시절) 영문 은행 코드로 온 환불 요청도 토스 코드로 저장", rq2); }
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심" } });
  ok(r.status === 400 && /계좌/.test(r.json.message), "가상계좌 환불: 환불 계좌가 없으면 거절", r.json);
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심", refundAccount: { bank: "NOPE", number: "123", holder: "" } } });
  ok(r.status === 400, "가상계좌 환불: 이상한 계좌는 거절");
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심", refundAccount: vaRq.acct } });
  const vaLc = PG[vaP].lastCancel || {};
  ok(r.json.ok && vaLc.amount === vaAmt && vaLc.refundAccount && vaLc.refundAccount.bank === "06" && vaLc.refundAccount.accountNumber === "12345678901" && vaLc.refundAccount.holderName === "가상OO" && r.json.order.status === "refunded", "가상계좌 환불: 토스에 환불 계좌(토스 은행 코드 · 예금주)로 원클릭 취소", { r: r.json, vaLc });
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN } });
  ok(r.json.ok && r.json.pay.status === "CANCELED" && r.json.pay.method.type === "vbank" && r.json.pay.method.account === "56211234567890" && r.json.pay.method.refund === "PENDING" && r.json.pay.amount.cancelled === vaAmt && r.json.pay.receiptUrl && !r.json.synced, "토스 결제 조회: 상태 · 결제수단(가상계좌 · 환불 진행 중) · 취소 금액 · 영수증", r.json);
  PG[vaP].virtualAccount.refundStatus = "COMPLETED";
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN } });
  ok(r.json.ok && /환불이 끝났어요/.test(r.json.synced) && (await store.getDoc("vo:" + vaN)).v.pg.cancel.st === "done", "토스 결제 조회: 가상계좌 환불이 끝나면 주문의 ‘환불 진행 중’을 ‘끝남’으로", r.json);
  delete jar.dc_a;
  // 입금 전 주문 취소 → 토스 결제 취소로 가상계좌 닫기
  r = await call("vod-auth", { body: { action: "me" } });
  const vaPt0 = r.json.member.points;
  ok(vaPt0 === 3000, "가상계좌 전액 환불 → 써 둔 포인트 1,000을 돌려받아요 (환불 규정)", vaPt0);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, points: 500, method: "vbank" } });
  const vaP2 = r.json.paymentId, vaN2 = r.json.no;
  vaLike(vaP2, r.json.amount, "20", "1002000000001", VA_DUE);
  r = await call("vod-pay", { body: cpl(vaP2) });
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === vaPt0 - 500, "두 번째 가상계좌: 발급 때 포인트 500을 써 둬요", r.json.member.points);
  r = await call("vod-pay", { body: { action: "cancelPending", no: vaN2 } });
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.no === vaN2).status === "canceled" && PG[vaP2].closed && PG[vaP2].status === "CANCELED" && calls.indexOf("POST api.tosspayments.com/v1/payments/" + PG[vaP2].paymentKey + "/cancel") >= 0, "입금 전 취소 → 주문 취소 · 토스 결제 취소로 가상계좌 닫기 (취소 뒤 입금 안 되게)");
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === vaPt0, "입금 전 취소하면 써 둔 포인트 500을 돌려받아요", r.json.member.points);
  // 퀵계좌이체(실시간 계좌이체)는 2026-11-15 부터 받지 않아요 — TOSS_METHODS 에 있어도 서버가 막아요
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "transfer" } });
  ok(r.status === 409 && !r.json.paymentId && /받지 않아요/.test(r.json.message), "퀵계좌이체는 받지 않아요 (TOSS_METHODS 에 있어도 409 · 주문을 만들지 않음)", r.json);
  // 카드 결제 (토스 상점관리자에서 직접 취소하는 경우 확인용)
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "card" } });
  const vaPt = r.json.paymentId, vaNt = r.json.no; paidLike(vaPt, r.json.amount);
  r = await call("vod-pay", { body: cpl(vaPt) });
  ok(r.json.ok && r.json.orders[0].status === "paid" && r.json.orders[0].method === "card", "카드 → 바로 결제 완료", r.json);
  // 토스 상점관리자에서 직접 취소한 결제 (웹훅을 놓친 경우) → 결제 조회로 맞춰요
  Object.assign(PG[vaPt], { status: "CANCELED", balanceAmount: 0 });
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaNt } });
  ok(r.json.ok && /환불로 맞췄어요/.test(r.json.synced) && r.json.pay.method.type === "card", "결제 조회: 토스는 취소인데 주문이 결제 완료면 환불로 맞춰요", r.json);
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN2 } });
  ok(r.json.ok && r.json.pay.status === "CANCELED" && !r.json.synced, "결제 조회: 입금 전에 취소한 가상계좌 주문은 그대로", r.json);
  // 취소를 누른 순간 이미 입금됐으면 (토스가 환불 계좌 없이는 취소를 거절해요) 취소하지 않고 결제 완료로 — 회원 취소 · 마스터 취소 둘 다
  const vaRace = async (pid, how) => {
    let q = await call("vod-pay", { body: { action: "prepare", pid, kind: "course", plan: 180, method: "vbank" } });
    const p = q.json.paymentId, no = q.json.no;
    vaLike(p, q.json.amount, "90", "7979000000001", VA_DUE);
    await call("vod-pay", { body: cpl(p) });
    deposit(p); // 웹훅이 오기 전에 입금
    q = how === "member" ? await call("vod-pay", { body: { action: "cancelPending", no } }) : await call("vod-pay", { body: { action: "bankCancel", no } });
    const d = await store.getDoc("vo:" + no); return { q, o: (d && d.v) || {} };
  };
  delete jar.dc_a;
  let vr = await vaRace("v6", "member");
  ok(vr.q.status === 409 && /입금이 확인돼/.test(vr.q.json.message) && vr.o.status === "paid" && !PG[vr.o.paymentId].closed && PG[vr.o.paymentId].status === "DONE", "회원 입금 전 취소 · 그 사이 입금됨 → 취소하지 않고 결제 완료로 (수강 열림)", { q: vr.q.json, st: vr.o.status });
  { const vc = jar.dc_v; const p = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 180, method: "vbank" } }); const pp = p.json.paymentId, pn = p.json.no;
    vaLike(pp, p.json.amount, "90", "7979000000002", VA_DUE); await call("vod-pay", { body: cpl(pp) }); deposit(pp);
    delete jar.dc_v; jar.dc_a = MASTER;
    const q = await call("vod-pay", { body: { action: "bankCancel", no: pn } }), o = (await store.getDoc("vo:" + pn)).v;
    ok(q.status === 409 && /입금이 확인돼/.test(q.json.message) && o.status === "paid", "마스터 입금 전 취소 · 그 사이 입금됨 → 취소하지 않고 결제 완료로", { q: q.json, st: o.status });
    delete jar.dc_a; jar.dc_v = vc; }
  // 네이버페이 · 카카오페이 (간편결제 자체창 — 우리 결제 화면 버튼에서 그 앱 · 창을 바로 열어요) · 카드/간편결제 창에서 고른 토스페이
  const ezPay = async (pid, method, provider, extra) => {
    const q = await call("vod-pay", { body: { action: "prepare", pid, kind: "course", plan: 180, method } });
    const p = q.json.paymentId, no = q.json.no, amt = q.json.amount;
    paidLike(p, amt, Object.assign({ method: "간편결제", easyPay: { provider, amount: 0, discountAmount: 0 } }, extra || {}));
    const c = await call("vod-pay", { body: cpl(p) });
    return { q, c, p, no, o: (await store.getDoc("vo:" + no)).v };
  };
  let ez = await ezPay("v6", "naver", "네이버페이");
  ok(ez.q.json.ok && ez.c.json.ok && ez.o.status === "paid" && ez.o.method === "naver" && ez.o.pg.easy === "네이버페이" && /12345678/.test(ez.o.pg.card), "네이버페이 → 결제 완료 · 주문 결제수단은 네이버페이 그대로 (토스는 ‘간편결제’로 알려 줘요) · 등록 카드 남김", ez.o);
  r = await call("vod-pay", { body: { action: "cancel", no: ez.no } });
  ok(r.json.ok && r.json.way === "pg" && PG[ez.p].status === "CANCELED", "네이버페이 바로 취소 → 토스 결제 취소", r.json);
  ez = await ezPay("v5", "kakao", "카카오페이", { card: null, easyPay: { provider: "카카오페이", amount: 1, discountAmount: 0 } });
  ok(ez.c.json.ok && ez.o.status === "paid" && ez.o.method === "kakao" && ez.o.pg.easy === "카카오페이" && !ez.o.pg.card, "카카오페이(카카오머니) → 결제 완료 · 결제수단 카카오페이", ez.o);
  ez = await ezPay("v6", "card", "토스페이");
  ok(ez.c.json.ok && ez.o.method === "toss" && ez.o.pg.easy === "토스페이", "카드/간편결제 창에서 토스페이로 내면 주문 결제수단은 토스페이", ez.o);
  ez = await ezPay("v5", "card", "페이코");
  ok(ez.c.json.ok && ez.o.method === "easy" && ez.o.pg.easy === "페이코", "다른 간편결제(페이코 등)는 ‘간편결제’ + 간편결제사 이름", ez.o);
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "pgInfo", no: ez.no } });
  ok(r.json.ok && r.json.pay.method.type === "easy" && r.json.pay.method.provider === "페이코" && /12345678/.test(r.json.pay.method.sub), "토스 결제 조회: 간편결제는 간편결제사 · 등록 카드", r.json.pay);
  delete jar.dc_a;
  // 결제를 거절당한 카드 (승인 실패) → 주문은 결제 실패 · 다시 결제할 수 있어요
  { const q = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "card" } }); const p = q.json.paymentId, no = q.json.no;
    paidLike(p, q.json.amount, { reject: [403, "REJECT_CARD_COMPANY", "결제 승인이 거절되었습니다"] });
    const c = await call("vod-pay", { body: cpl(p) }), o = (await store.getDoc("vo:" + no)).v;
    ok(c.status === 409 && /거절/.test(c.json.message) && o.status === "failed", "카드사가 승인을 거절하면 토스 안내 문구 · 주문은 결제 실패", { c: c.json, st: o.status }); }
  // 결제창을 닫거나 실패해서 돌아오면(failUrl) 결제 대기 주문을 실패로
  { const q = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "card" } });
    const a = await call("vod-pay", { body: { action: "abort", paymentId: q.json.paymentId, code: "PAY_PROCESS_CANCELED" } }), o = (await store.getDoc("vo:" + q.json.no)).v;
    ok(a.json.ok && o.status === "failed" && o.failCode === "PAY_PROCESS_CANCELED", "결제창을 닫으면 결제 대기 주문은 실패로 (취소 코드 남김)", o); }
  delete jar.dc_a; delete jar.dc_v;
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN } });
  ok(r.status === 403, "결제 조회는 마스터만");
  delete process.env.TOSS_METHODS;

  console.log("\n19) 종이책 (택배 배송) · 전자책 내려받기 기록");
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("vod-pay", { body: { action: "catalog", catalog: { products: [
    { id: "b1", title: "내 인생의 추월차선은 내가 만든다", type: "book", status: "on", price: 15900, sale: null, iid: "moon", shipFee: 0, stock: 3 },
    { id: "b2", title: "배송비 있는 책", type: "book", status: "on", price: 12000, sale: 10800, shipFee: 3000 },
    { id: "v10", title: "전자책", type: "ebook", status: "on", price: 39000, sale: 29000 }],
    coupons: [{ id: "cp-welcome", code: "WELCOME", name: "신규 5천", kind: "won", value: 5000, days: 30, auto: "signup", on: true }], settings: { refund: { instant: true, days: 7, maxUsed: 0 } }, biz: {} } } });
  ok(r.json.ok && r.json.n === 3, "카탈로그: 종이책 (배송비 · 재고 칸 포함)", r.json);
  const catDoc = (await store.getDoc("vcat")).v;
  ok(catDoc.products[0].shipFee === 0 && catDoc.products[0].stock === 3 && catDoc.products[1].shipFee === 3000, "가격표에 배송비 · 재고가 남아요", catDoc.products);
  useJar({});
  r = await call("vod-auth", { body: { action: "signup", email: "book@example.com", pw: "book1234a", pw2: "book1234a", name: "책OO", phone: "010-1234-5678", agree: true } });
  ok(r.json.ok && jar.dc_v, "종이책 회원 가입", r.json);
  const bkMid = r.json.member.id, bkCp = r.json.member.coupons[0].id;
  const SHIP = { name: "책OO", phone: "010-1234-5678", zip: "06234", addr1: "서울 강남구 테헤란로 123", addr2: "4층", memo: "문 앞에 놓아 주세요" };
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 1, method: "card" } });
  ok(r.status === 409 && /주소/.test(r.json.message), "배송지 없이 주문 막기", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 1, method: "card", ship: Object.assign({}, SHIP, { phone: "123" }) } });
  ok(r.status === 409, "휴대폰 번호가 이상하면 막기", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 11, method: "card", ship: SHIP } });
  ok(r.status === 409 && /10권/.test(r.json.message), "한 번에 10권까지", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "coach", method: "card", ship: SHIP } });
  ok(r.status === 409, "종이책에는 추가 상품(코칭권 등) 없음", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 2, method: "card", mcid: bkCp, ship: SHIP, expect: 31800 } });
  ok(r.json.ok && r.json.amount === 31800 && /2권/.test(r.json.orderName), "15,900원 × 2권 · 무료배송 · 쿠폰은 안 써요(도서정가제) = 31,800원", r.json);
  const bp1 = r.json.paymentId, bno1 = r.json.no;
  paidLike(bp1, 31800);
  r = await call("vod-pay", { body: cpl(bp1) });
  let bo = (await store.getDoc("vo:" + bno1)).v;
  ok(r.json.ok && bo.status === "paid" && bo.qty === 2 && bo.unit === 15900 && bo.sale === 31800 && bo.shipFee === 0 && bo.ship.st === "ready" && bo.ship.addr1 === SHIP.addr1 && !bo.mcid && !bo.couponOff, "결제 완료: 수량 · 배송지 · 배송 상태(결제 완료) 저장 · 쿠폰 안 씀", bo);
  ok(((await store.getDoc("vm:" + bkMid)).v.coupons[0] || {}).usedAt == null, "쓰지 않은 쿠폰은 그대로", (await store.getDoc("vm:" + bkMid)).v.coupons);
  ok((((await store.getDoc("vstat")).v.sold) || {}).b1 === 2, "판매 수는 권수만큼 (2권)", (await store.getDoc("vstat")).v.sold);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b2", kind: "course", qty: 1, method: "card", ship: SHIP, points: 0, expect: 13800 } });
  ok(r.json.ok && r.json.amount === 13800, "할인가 10,800원 + 배송비 3,000원 = 13,800원", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 2, method: "card", ship: SHIP } });
  ok(r.status === 409 && /1권/.test(r.json.message), "재고 3권 · 2권 팔림 → 2권은 막고 남은 권수를 알려 줘요", r.json);
  // 배송지 바꾸기: 보내기 전에는 회원이 바꿀 수 있고, 배송 상태 · 송장은 못 바꿔요
  j = await boot();
  r = await sync([{ k: "vo:" + bno1, base: verOf(j, "vo:" + bno1), ops: [{ p: ["ship", "addr1"], v: "서울 서초구 강남대로 1" }, { p: ["ship", "st"], v: "done" }, { p: ["ship", "inv"], v: "999" }] }]);
  bo = (await store.getDoc("vo:" + bno1)).v;
  ok(bo.ship.addr1 === "서울 서초구 강남대로 1" && bo.ship.st === "ready" && !bo.ship.inv, "회원: 보내기 전 배송지만 바꿈 (상태 · 송장은 못 바꿈)", bo.ship);
  // 회원이 기본 배송지를 저장
  r = await sync([{ k: "vm:" + bkMid, base: verOf(j, "vm:" + bkMid), ops: [{ p: ["addr"], v: Object.assign({}, SHIP, { extra: "x" }) }] }]);
  ok(((await store.getDoc("vm:" + bkMid)).v.addr || {}).addr1 === SHIP.addr1 && !("extra" in ((await store.getDoc("vm:" + bkMid)).v.addr || {})), "회원: 다음 주문용 배송지 저장 (정해진 칸만)", (await store.getDoc("vm:" + bkMid)).v.addr);
  // 보내기 전: 바로 취소 (전액)
  r = await call("vod-pay", { body: { action: "cancel", no: bno1 } });
  bo = (await store.getDoc("vo:" + bno1)).v;
  ok(r.json.ok && r.json.amount === 31800 && bo.status === "refunded" && PG[bp1].status === "CANCELED", "보내기 전이면 회원이 바로 전액 취소 (토스 결제 취소)", r.json);
  ok((((await store.getDoc("vstat")).v.sold) || {}).b1 === 0, "취소하면 판매 권수도 빠져요", (await store.getDoc("vstat")).v.sold);
  // 다시 주문 → 마스터가 상품 준비 중 → 회원 바로 취소 막기 · 배송지 못 바꿈
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 1, method: "card", ship: SHIP, expect: 15900 } });
  const bp2 = r.json.paymentId, bno2 = r.json.no; paidLike(bp2, 15900); await call("vod-pay", { body: cpl(bp2) });
  const memJar = saveJar();
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  r = await sync([{ k: "vo:" + bno2, base: verOf(j, "vo:" + bno2), ops: [{ p: ["ship", "st"], v: "prep" }, { p: ["ship", "prepAt"], v: Date.now() }] }]);
  ok(((await store.getDoc("vo:" + bno2)).v.ship || {}).st === "prep", "마스터: 상품 준비 중으로", r.results);
  useJar(memJar);
  r = await call("vod-pay", { body: { action: "cancel", no: bno2 } });
  ok(r.status === 409 && /준비/.test(r.json.message), "상품 준비 중이면 바로 취소 막기 (취소 요청으로)", r.json);
  j = await boot();
  r = await sync([{ k: "vo:" + bno2, base: verOf(j, "vo:" + bno2), ops: [{ p: ["ship", "addr1"], v: "바꾸면 안 되는 주소" }] }]);
  ok((await store.getDoc("vo:" + bno2)).v.ship.addr1 === SHIP.addr1, "상품 준비 중이면 회원이 배송지를 못 바꿈", (await store.getDoc("vo:" + bno2)).v.ship);
  // 마스터 발송 → 반품 요청만
  useJar({ dc_a: auth.sign({ r: "master" }) });
  j = await boot();
  r = await sync([{ k: "vo:" + bno2, base: verOf(j, "vo:" + bno2), ops: [{ p: ["ship", "st"], v: "ship" }, { p: ["ship", "carrier"], v: "CJ대한통운" }, { p: ["ship", "inv"], v: "640012345678" }, { p: ["ship", "shipAt"], v: Date.now() }] }]);
  bo = (await store.getDoc("vo:" + bno2)).v;
  ok(bo.ship.st === "ship" && bo.ship.inv === "640012345678", "마스터: 택배사 · 송장 넣고 배송 중으로", bo.ship);
  useJar(memJar);
  r = await call("vod-pay", { body: { action: "cancel", no: bno2 } });
  ok(r.status === 409 && /반품/.test(r.json.message), "보낸 뒤에는 바로 취소 막기 (반품 요청으로)", r.json);
  j = await boot();
  r = await sync([{ k: "vo:" + bno2, base: verOf(j, "vo:" + bno2), ops: [{ p: ["refundReq"], v: { why: "파손 · 파본", text: "표지가 찢어져 왔어요" } }] }]);
  bo = (await store.getDoc("vo:" + bno2)).v;
  ok(bo.refundReq && bo.refundReq.why === "파손 · 파본" && bo.status === "paid", "회원: 반품 · 교환 요청 남기기", bo.refundReq);
  // 전자책: 서버 파일을 받아 가면 주문에 내려받은 때가 남아 바로 취소가 막혀요
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", expect: 29000 } });
  const ep = r.json.paymentId, eno = r.json.no; paidLike(ep, 29000); await call("vod-pay", { body: cpl(ep) });
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("file", { body: { data: "data:application/pdf;base64," + Buffer.from("%PDF-1.4 전자책 본문 " + "y".repeat(300)).toString("base64"), scope: "vodp:v10" } });
  const eh = new URL("http://x" + r.json.url).searchParams.get("h");
  useJar(memJar);
  ok(!(await store.getDoc("vo:" + eno)).v.dlAt, "전자책: 받기 전에는 내려받은 기록 없음");
  r = await call("file", { method: "GET", query: { h: eh } });
  ok(r.status === 200, "산 회원은 전자책 파일을 받아요", r.status);
  ok(!!(await store.getDoc("vo:" + eno)).v.dlAt, "전자책: 파일 주소로 받아도 서버가 주문에 내려받은 때를 남겨요");
  r = await call("vod-pay", { body: { action: "cancel", no: eno } });
  ok(r.status === 409 && /내려받/.test(r.json.message), "내려받은 전자책은 바로 취소 막기", r.json);
  // 무통장 입금으로 종이책 주문 → 입금 대기 → 마스터 입금 확인 → 결제 완료 · 보낼 주문
  r = await call("vod-pay", { body: { action: "prepare", pid: "b2", kind: "course", qty: 1, method: "bank", depositor: "책 OO", ship: SHIP, expect: 13800 } });
  const bkN = r.json.no;
  bo = (await store.getDoc("vo:" + bkN)).v;
  ok(r.json.ok && r.json.bank && r.json.amount === 13800 && bo.status === "pending" && bo.method === "bank" && bo.depositor === "책OO" && !!(bo.bankTo && bo.bankTo.account) && bo.ship.st === "ready" && bo.shipFee === 3000 && bo.dueAt > Date.now(), "종이책 무통장 주문: 입금 대기 · 안내 계좌 · 입금 기한 · 배송지 · 배송비가 주문에 남음", bo);
  useJar({ dc_a: auth.sign({ r: "master" }) });
  r = await call("vod-pay", { body: { action: "bankOk", no: bkN } });
  bo = (await store.getDoc("vo:" + bkN)).v;
  ok(r.json.ok && bo.status === "paid" && bo.paidAt > 0 && bo.ship.st === "ready", "마스터 입금 확인 → 결제 완료 · 보낼 주문으로", bo);
  useJar(memJar);
  // 현금영수증 (무통장만): 번호를 확인하고 주문에 남겨요 — 회원은 ‘발급 완료’ · 처리 상태를 바꿀 수 없어요
  r = await call("vod-pay", { body: { action: "prepare", pid: "b2", kind: "course", qty: 1, method: "bank", depositor: "책OO", ship: SHIP, cashRcpt: { type: "p", no: "0101234" }, expect: 13800 } });
  ok(r.status === 400 && /현금영수증/.test(r.json.message), "현금영수증 휴대폰 번호가 이상하면 막기", r.json);
  r = await call("vod-pay", { body: { action: "prepare", pid: "b2", kind: "course", qty: 1, method: "bank", depositor: "책OO", ship: SHIP, cashRcpt: { type: "b", no: "123-45-67890" }, expect: 13800 } });
  const crN = r.json.no; bo = (await store.getDoc("vo:" + crN)).v;
  ok(r.json.ok && bo.cashRcpt && bo.cashRcpt.type === "b" && bo.cashRcpt.no === "1234567890", "현금영수증 지출증빙(사업자등록번호 10자리)이 주문에 남아요", bo.cashRcpt);
  j = await boot();
  r = await sync([{ k: "vo:" + crN, base: verOf(j, "vo:" + crN), ops: [{ p: ["cashRcpt", "done"], v: 1 }, { p: ["claim"], v: { k: "return", st: "done" } }] }]);
  bo = (await store.getDoc("vo:" + crN)).v;
  ok(!bo.cashRcpt.done && !bo.claim, "회원은 현금영수증 발급 표시 · 요청 처리 상태를 못 바꿔요", bo);
  // 취소 · 반품 · 교환 요청 종류: 보내기 전은 취소, 보낸 뒤는 반품 · 교환 — 승인(수거 중)이면 새 요청을 받지 않아요
  j = await boot();
  r = await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["refundReq"], v: { why: "단순 변심", kind: "exchange" } }] }]);
  ok(((await store.getDoc("vo:" + bkN)).v.refundReq || {}).kind === "cancel", "보내기 전(결제 완료)이면 요청 종류는 ‘취소’로", (await store.getDoc("vo:" + bkN)).v.refundReq);
  j = await boot();
  await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["refundReq"], d: 1 }] }]);
  ok(!(await store.getDoc("vo:" + bkN)).v.refundReq, "회원이 요청을 거둬들여요");
  useJar({ dc_a: auth.sign({ r: "master" }) }); j = await boot();
  await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["ship", "st"], v: "done" }, { p: ["ship", "inv"], v: "640012340000" }, { p: ["ship", "shipAt"], v: Date.now() - 864e5 }, { p: ["ship", "doneAt"], v: Date.now() }] }]);
  useJar(memJar); j = await boot();
  await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["refundReq"], v: { why: "파손 · 파본", kind: "exchange", text: "표지 찢어짐" } }] }]);
  ok(((await store.getDoc("vo:" + bkN)).v.refundReq || {}).kind === "exchange", "받은 뒤에는 교환 요청", (await store.getDoc("vo:" + bkN)).v.refundReq);
  useJar({ dc_a: auth.sign({ r: "master" }) }); j = await boot();
  await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["claim"], v: { k: "exchange", st: "pick", why: "파손 · 파본", at: Date.now() } }, { p: ["refundReq"], d: 1 }] }]);
  bo = (await store.getDoc("vo:" + bkN)).v;
  ok(bo.claim && bo.claim.st === "pick" && !bo.refundReq, "마스터 승인: 요청이 ‘수거 중’ 처리로 옮겨가요", bo.claim);
  useJar(memJar); j = await boot();
  await sync([{ k: "vo:" + bkN, base: verOf(j, "vo:" + bkN), ops: [{ p: ["refundReq"], v: { why: "단순 변심", kind: "return" } }, { p: ["claim", "st"], v: "done" }] }]);
  bo = (await store.getDoc("vo:" + bkN)).v;
  ok(!bo.refundReq && bo.claim.st === "pick", "수거 중에는 회원이 새 요청을 넣거나 처리 상태를 바꿀 수 없어요", { rq: bo.refundReq, c: bo.claim });
  // 일회성 작업: 문대표 종이책을 스토어 · 가격표에 (없을 때만)
  const OO = require(path.join(TMP, "class/api/_lib/oneoff.js")), BOOKS = require(path.join(TMP, "class/api/_lib/books.js"));
  const fakeMeta = { vod: { products: [{ id: "v1", title: "x" }], settings: {} }, other: 1 }, fakeCat = { at: 1, products: [{ id: "v1" }] };
  let w = OO.moonBook((k) => (k === "meta" ? fakeMeta : k === "vcat" ? fakeCat : null));
  ok(w.writes.meta.vod.products.length === 2 && w.writes.meta.vod.products[1].id === "b1" && w.writes.meta.vod.products[1].showOff && w.writes.meta.vod.v21 === 1 && w.writes.meta.vod.settings.ship.autoDays === 3 && w.writes.meta.other === 1, "일회성 작업: 종이책 · 배송 설정을 스토어에 (다른 칸은 그대로)", w.result);
  ok(w.writes.vcat.products.length === 2 && w.writes.vcat.products[1].price === 15900 && w.writes.vcat.products[1].type === "book" && !("pitch" in w.writes.vcat.products[1]), "일회성 작업: 가격표에는 가격 칸만", w.writes.vcat.products[1]);
  w = OO.moonBook((k) => (k === "meta" ? w.writes.meta : k === "vcat" ? w.writes.vcat : null));
  ok(w.writes.meta.vod.products.length === 2 && !w.writes.vcat && w.result.book === "이미 있음", "일회성 작업: 이미 있으면 또 넣지 않아요", w.result);
  // 일회성 작업: 두고클래스 무통장 입금 계좌 (비어 있을 때만)
  const bankMeta = { vod: { products: [], settings: { share: 70, bank: "", account: "", holder: "", payDays: 3 } }, other: 1 };
  w = OO.storeBank((k) => (k === "meta" ? bankMeta : null));
  const bs = w.writes.meta.vod.settings;
  ok(bs.bank === "IBK기업은행" && bs.account === "940-057282-04-017" && bs.holder === "(주)두고홀딩스" && bs.payDays === 3 && bs.share === 70 && w.writes.meta.other === 1 && bankMeta.vod.settings.bank === "", "일회성 작업: 비어 있던 무통장 계좌에 IBK기업은행 (주)두고홀딩스 (다른 설정은 그대로)", bs);
  w = OO.storeBank((k) => (k === "meta" ? w.writes.meta : null));
  ok(!w.writes.meta && w.result.bank === "이미 있음", "일회성 작업: 계좌가 있으면 다시 쓰지 않아요", w.result);
  w = OO.storeBank((k) => (k === "meta" ? { vod: { settings: { bank: "국민은행", account: "123-45", holder: "마스터" } } } : null));
  ok(!w.writes.meta, "마스터가 넣은 계좌는 그대로", w.result);
  ok(OO.OPS.some((x) => x.id === "2026-10-30-store-bank-account" && x.run === OO.storeBank), "무통장 계좌 작업 목록 등록", null);
  ok(BOOKS.MOON_BOOK.price === 15900 && BOOKS.MOON_BOOK.type === "book" && OO.OPS.some((x) => x.id === "2026-10-30-moon-paper-book"), "종이책 상품 · 작업 목록 등록", null);
  // 일회성 작업: 실제 운영 시작 — 문대표 것을 뺀 기수 신청 · 매출 기록 지우기
  const RD = {
    "bill:logic:b1": { id: "b1", instructorId: "logic", cohortName: "1기", cohortId: "lc1", paidAt: "2026-09-25", demo: true },
    "bill:logic:b2": { id: "b2", instructorId: "logic", cohortName: "2기", cohortId: "lc2", paidAt: "2026-10-20", demo: true },
    "bill:choi:b3": { id: "b3", instructorId: "choi", cohortName: "2기", demo: true },
    "bill:choi:b4": { id: "b4", instructorId: "choi", cohortName: "3기", cohortId: "cc3", paidAt: "2026-10-28" },
    "bill:moon:b5": { id: "b5", instructorId: "moon", cohortName: "5기", paidAt: "2026-10-30" },
    "bill:moon:b6": { id: "b6", instructorId: "moon", cohortName: "4기", demo: true },
    "cohorts:logic": [{ id: "lc1", name: "1기" }, { id: "lc2", name: "2기" }],
    "cohorts:choi": [{ id: "cc1", name: "1기" }, { id: "cc3", name: "3기" }],
    "stu:logic:s13": { id: "s13", cohortId: "lc1" }, "stu:choi:s99": { id: "s99", cohortId: "cc3" },
    meta: { affiliates: [{ id: "aff-demo" }, { id: "aff-kny", name: "김나영" }], affPayouts: { "aff-demo:2026-09": { paidAt: "2026-10-10", by: "master" }, "aff-kny:2026-10": { paidAt: "2026-10-31", amount: 1000, rows: [{ bid: "b5" }] } }, other: 1 }
  };
  const rdGet = (k) => (RD[k] === undefined ? null : JSON.parse(JSON.stringify(RD[k]))), rdKeys = (pre) => Object.keys(RD).filter((k) => k.indexOf(pre) === 0).sort();
  w = OO.launchReset(rdGet, rdKeys);
  ok(w.writes["bill:logic:b1"] === null && w.writes["bill:logic:b2"] === null && w.writes["bill:choi:b3"] === null && w.writes["bill:choi:b4"] === null && w.writes["bill:moon:b6"] === null && !("bill:moon:b5" in w.writes), "운영 시작: 문대표 것이 아닌 기수 신청 · 매출 기록은 모두, 문대표는 예시만 지워요", w.result);
  ok(JSON.stringify(w.writes["cohorts:logic"]) === JSON.stringify([{ id: "lc1", name: "1기" }]) && !("cohorts:choi" in w.writes), "운영 시작: 지운 기록으로 열린 기수는 수강생이 없을 때만 같이 지워요 (처음 기수 · 수강생 있는 기수는 그대로)", w.writes["cohorts:logic"]);
  ok(w.writes.meta && !w.writes.meta.affPayouts["aff-demo:2026-09"] && w.writes.meta.affPayouts["aff-kny:2026-10"] && w.writes.meta.affiliates.length === 2 && w.writes.meta.other === 1, "운영 시작: 예시 파트너 지급 기록만 지우고 파트너 계정(김나영 포함)은 그대로", w.writes.meta && w.writes.meta.affPayouts);
  Object.keys(w.writes).forEach((k) => { if (w.writes[k] === null) delete RD[k]; else RD[k] = w.writes[k]; });
  w = OO.launchReset(rdGet, rdKeys);
  ok(!Object.keys(w.writes).length, "운영 시작: 다시 돌려도 더 지우지 않아요", w.result);
  // 일회성 작업: 예시 운영자 계정(비밀번호가 아직 예시 그대로)만 중지
  const SM = { staff: [
    { id: "st-demo1", loginId: "manager", pw: "manager", status: "active" },
    { id: "st-demo2", loginId: "finance", pw: "finance-new9", status: "active" },
    { id: "st-kim", loginId: "kim", pw: "manager", status: "active" }
  ], other: 1 };
  w = OO.demoStaffStop((k) => (k === "meta" ? JSON.parse(JSON.stringify(SM)) : null));
  const sm2 = w.writes.meta;
  ok(sm2 && sm2.staff[0].status === "stopped" && sm2.staff[0].pw === "manager" && sm2.staff[1].status === "active" && sm2.staff[2].status === "active" && sm2.staff.length === 3 && sm2.other === 1, "예시 운영자: 비밀번호가 예시 그대로인 예시 계정만 중지 (비밀번호를 바꾼 계정 · 진짜 운영자는 그대로)", w.result);
  w = OO.demoStaffStop((k) => (k === "meta" ? sm2 : null));
  ok(!Object.keys(w.writes).length, "예시 운영자: 다시 돌려도 그대로", w.result);
  w = OO.demoStaffStop((k) => (k === "meta" ? { other: 1 } : null));
  ok(!Object.keys(w.writes).length, "예시 운영자: 운영자 목록이 없으면 건드리지 않아요", w.result);
  // 강사 정산 유형: 마스터가 정하면 강사가 바꾸지 못해요 (서버 access.js keepSettleType)
  {
    const AC = require("../api/_lib/access");
    const insW = AC.writer("ins:moon", { admin: { role: "instructor", iid: "moon" } }, false), mW = AC.writer("ins:moon", { admin: { role: "master" } }, false);
    const old = { id: "moon", status: "active", createdAt: 1, vodSettle: { type: "biz", typeBy: "master", typeAt: 5, bank: "국민", account: "1" } };
    let out = insW.fix(JSON.parse(JSON.stringify(old)), { id: "moon", status: "active", vodSettle: { type: "person", bank: "신한", account: "2" } });
    ok(out.vodSettle.type === "biz" && out.vodSettle.typeBy === "master" && out.vodSettle.typeAt === 5 && out.vodSettle.bank === "신한", "정산 유형: 마스터가 정한 사업자는 강사가 개인으로 못 바꿔요 (계좌는 바꿀 수 있어요)", out.vodSettle);
    out = insW.fix({ id: "moon", status: "active", vodSettle: { type: "person" } }, { id: "moon", status: "active", vodSettle: { type: "biz", typeBy: "master", typeAt: 9 } });
    ok(out.vodSettle.type === "biz" && !out.vodSettle.typeBy && !out.vodSettle.typeAt, "정산 유형: 마스터가 안 정했으면 강사가 고르고, ‘마스터가 정함’ 표시는 스스로 못 붙여요", out.vodSettle);
    out = insW.fix(JSON.parse(JSON.stringify(old)), { id: "moon", status: "active", title: "새 이름" });
    ok(out.vodSettle && out.vodSettle.type === "biz" && out.vodSettle.typeBy === "master", "정산 유형: 강사가 정산 칸을 빼고 저장해도 마스터가 정한 유형은 남아요", out.vodSettle);
    out = mW.fix(JSON.parse(JSON.stringify(old)), { id: "moon", status: "active", vodSettle: { type: "person", typeBy: "master", typeAt: 7 } });
    ok(out.vodSettle.type === "person" && out.vodSettle.typeBy === "master", "정산 유형: 마스터는 바꿀 수 있어요", out.vodSettle);
  }
  // 일회성 작업: doogomd 채널(돈맛스토리) — 비어 있거나 기본값일 때만
  const DM = { media: [{ id: "md-doogomd", loginId: "doogomd", pwHash: "s1$x$y", code: "dgmd26", name: "두고미디어", channel: "두고미디어 YouTube", url: "" }, { id: "md-b", loginId: "other", channel: "다른 채널", url: "" }], other: 1 };
  w = OO.mediaDoogomdChannel((k) => (k === "meta" ? JSON.parse(JSON.stringify(DM)) : null));
  const dm2 = w.writes.meta;
  ok(dm2 && dm2.media[0].url === "https://www.youtube.com/@돈맛스토리" && dm2.media[0].channel === "돈맛스토리" && dm2.media[0].name === "두고미디어" && dm2.media[0].pwHash === "s1$x$y" && dm2.media[1].url === "" && dm2.other === 1, "doogomd 채널: 주소 · 이름 채우기 (팀 이름 · 비밀번호 해시 · 다른 계정은 그대로)", w.result);
  w = OO.mediaDoogomdChannel((k) => (k === "meta" ? dm2 : null));
  ok(!Object.keys(w.writes).length, "doogomd 채널: 다시 돌려도 그대로", w.result);
  w = OO.mediaDoogomdChannel((k) => (k === "meta" ? { media: [{ id: "md-doogomd", loginId: "doogomd", channel: "마스터가 고친 이름", url: "https://www.youtube.com/@custom" }] } : null));
  ok(!Object.keys(w.writes).length, "doogomd 채널: 마스터가 고친 이름 · 주소는 안 건드려요", w.result);
  // 일회성 작업: 문대표 4기 11/21(토) 4주
  w = OO.moon4th((k) => (k === "cohorts:moon" ? [{ id: "c3", name: "3기", startDate: "2026-10-01" }, { id: "c4", name: "4기", startDate: "2026-11-05", recruiting: true, curriculumId: "cur-4w", classDow: 6, classTime: "12:00" }] : null));
  const c4 = w.writes["cohorts:moon"][1];
  ok(c4.startDate === "2026-11-21" && c4.weeks === 4 && c4.classDow === 6 && c4.classTime === "12:00" && c4.curriculumId === "cur-4w" && w.writes["cohorts:moon"][0].startDate === "2026-10-01" && new Date(c4.startDate + "T00:00:00").getDay() === 6, "문대표 4기: 11월 21일 토요일부터 4주 (다른 기수 · 시간은 그대로)", c4);
  // 일회성 작업: 문대표 강사 소개 페이지 신청하기 링크
  w = OO.moonApplyLink((k) => (k === "content:moon" ? { brand: { name: "두고보는 문대표" }, landing: { applyUrl: "", cta: { title: "5주 뒤, 내 이름의 브랜드 사장님이 되어 있을 거예요", sub: "s" } } } : null));
  ok(w.writes["content:moon"].landing.applyUrl === "https://m.site.naver.com/2iZFQ" && /^4주 뒤/.test(w.writes["content:moon"].landing.cta.title) && w.writes["content:moon"].brand.name === "두고보는 문대표", "문대표 강사 소개: 신청하기 링크(네이버) · 마지막 안내 4주", w.result);
  w = OO.moonApplyLink((k) => (k === "content:moon" ? { landing: { applyUrl: "https://open.kakao.com/o/x", cta: { title: "직접 쓴 제목" } } } : null));
  ok(w.writes["content:moon"].landing.applyUrl === "https://open.kakao.com/o/x" && w.writes["content:moon"].landing.cta.title === "직접 쓴 제목", "강사가 이미 넣은 링크 · 직접 쓴 제목은 그대로", w.result);
  ok(["2026-10-31-launch-reset-bills", "2026-10-31-moon-4th-cohort", "2026-10-31-moon-apply-link"].every((id) => OO.OPS.some((x) => x.id === id)), "운영 시작 작업 3개 목록 등록", null);
  { // 문대표 무료강의 11/17 (운영 DB 와 같은 모양: 처음 넣은 값 그대로)
    const prodFree = { published: true, liveAt: "2026-10-27T19:30", kakao: { url: "https://open.kakao.com/o/gF68BQDi" }, videos: { items: [{ youtube: "https://youtu.be/S43tftq_ZT4" }] },
      gifts: { title: "강의 전, 선물 전자책 3권", items: [{ title: "1편", openAt: "2026-10-01T19:30", forceOpen: true, url: "https://book01.notion.site/VOD-28ed6f9dec6780f3901ad401c88019da?source=copy_link", color: "blue" }, { title: "2편", openAt: "2026-10-20T19:30", url: "https://www.ivyclass.co.kr/x", color: "cyan" }, { title: "3편", openAt: "2026-10-26T19:30", url: "https://www.ivyclass.co.kr/x", color: "ice" }] },
      live: { image: "assets/landing/moon-thumb.jpg", url: "https://www.ivyclass.co.kr/x" }, faq: { items: [{ q: "무료강의는 어디서 듣나요?", a: "아이비클래스" }, { q: "다음에는?", a: "직접 브랜드를 만들고 싶은 분은 5주 실전 클래스로 이어서 함께해요." }] },
      apply: { includes: ["10/27(화) 오후 7시 30분 무료 라이브", "선물 전자책 3권"] } };
    let w = OO.moonFree1117((k) => (k === "content:moon" ? { brand: { theme: "nz" }, freeClass: prodFree, landing: { applyUrl: "x" } } : null));
    const F = w.writes["content:moon"].freeClass;
    ok(F.liveAt === "2026-11-17T19:30" && F.intro.youtube === "https://www.youtube.com/watch?v=mPFHz1JQj3U" && F.kakao.url === "https://m.site.naver.com/2iZFQ", "문대표 무료강의: 11/17 저녁 7시 30분 · 대표 영상 · 오픈채팅(네이버)", F);
    ok(F.gifts.items[0].forceOpen === true && F.gifts.items[1].openAt === "2026-11-09T19:00" && F.gifts.items[1].url.endsWith("?pvs=74") && !F.gifts.items[1].forceOpen && F.gifts.items[2].openAt === "2026-11-17T19:00" && F.gifts.items[2].url.endsWith("2c5d6f9dec6781caa41bf90cdab36f96") && F.gifts.items[2].title === "3편" && F.gifts.title === "강의 전, 선물 전자책 3권", "선물 전자책: 1편 지금 · 2편 11/9 · 3편 11/17 저녁 7시 (제목 · 칸 제목은 그대로)", F.gifts);
    ok(F.live.image === "assets/landing/moon-thumb-1117.jpg" && F.live.url === "https://www.ivyclass.co.kr/x" && F.faq.items[0].q === "무료강의는 언제 시작되나요?" && /11월 17일\(화\) 저녁 7시 30분/.test(F.faq.items[0].a) && /아시아 최초/.test(F.faq.items[0].a) && /4주 실전 클래스/.test(F.faq.items[2].a) && F.apply.includes[0] === "11/17(화) 오후 7시 30분 무료 라이브", "포스터 11/17 · FAQ ‘언제 시작되나요?’ 맨 위 · 4주 · 신청 안내 날짜", F);
    ok(w.writes["content:moon"].landing.applyUrl === "x" && F.videos.items.length === 1, "다른 칸(강사 소개 · 영상)은 그대로", null);
    w = OO.moonFree1117((k) => (k === "content:moon" ? { freeClass: Object.assign({}, F, { intro: { youtube: "https://youtu.be/MINE" }, live: { image: "assets/mine.jpg" } }) } : null));
    const F2 = w.writes["content:moon"].freeClass;
    ok(F2.intro.youtube === "https://youtu.be/MINE" && F2.live.image === "assets/mine.jpg" && F2.faq.items.filter((x) => /언제\s*시작/.test(x.q)).length === 1, "강사가 직접 넣은 대표 영상 · 썸네일은 그대로 · 질문은 한 번만", F2);
    ok(OO.moonFree1117(() => null).result.skipped, "문대표 페이지가 없으면 건너뛰기", null);
    ok(OO.OPS.some((x) => x.id === "2026-11-01-moon-free-1117" && x.run === OO.moonFree1117), "무료강의 11/17 작업 목록 등록", null);
  }
  { // 문대표 무료강의 2차: 좌우 영상 끄기 · 사전 미션 · 증정 혜택 (1차 작업 뒤 운영 DB 모양)
    const base = { liveAt: "2026-11-17T19:30", off: {}, intro: { youtube: "https://www.youtube.com/watch?v=mPFHz1JQj3U" }, videos: { items: [{ youtube: "x" }] },
      question: { title: "문대표에게 직접 묻고 싶은 게 있으신가요?", url: "https://forms.gle/fJ4sELiTBhnjAeRHA", note: "질문 메모 후", promise: "지금 남겨 주시면" }, kakao: { url: "https://m.site.naver.com/2iZFQ" } };
    let w = OO.moonFreeMission((k) => (k === "content:moon" ? { brand: { theme: "nz" }, freeClass: base } : null));
    const F = w.writes["content:moon"].freeClass;
    ok(F.off.videos === true && !F.off.intro && F.intro.youtube.endsWith("mPFHz1JQj3U") && F.videos.items.length === 1, "좌우 영상 3개만 끄고 대표 영상은 그대로 (영상 목록은 지우지 않음)", F.off);
    ok(F.question.url === "https://docs.google.com/forms/d/e/1FAIpQLSfMZBEB9Z5_RjKYqeeldP2vYBxW5fC-krFqzhxxGiHQz7F5Xg/viewform?usp=send_form" && F.question.title === "문대표의 *사전 미션*" && F.question.label === "사전 미션 하러 가기" && F.question.promise === "" && /1분/.test(F.question.desc) && /구글폼/.test(F.question.note), "사전 미션: 새 구글폼 · 제목 · 버튼 · 안내 (초록 강조 상자는 숨김)", F.question);
    ok(F.bonus.items.length === 8 && F.bonus.items.every((x) => x.title) && /톡방 참여자 전원/.test(F.bonus.badge) && /전원 증정/.test(F.bonus.title), "참여자 전원 증정 혜택 01~08 · 톡방 배지", F.bonus);
    ok(F.liveAt === "2026-11-17T19:30" && F.kakao.url === "https://m.site.naver.com/2iZFQ", "다른 칸(일정 · 오픈채팅)은 그대로", null);
    w = OO.moonFreeMission((k) => (k === "content:moon" ? { freeClass: Object.assign({}, F, { bonus: { items: [{ title: "내가 쓴 자료" }] }, off: { intro: true } }) } : null));
    const F2 = w.writes["content:moon"].freeClass;
    ok(F2.bonus.items.length === 1 && F2.bonus.items[0].title === "내가 쓴 자료" && !F2.off.intro, "강사가 넣은 증정 항목은 그대로 · 꺼져 있던 대표 영상은 다시 켬", F2);
    ok(OO.OPS.findIndex((x) => x.id === "2026-11-01-moon-free-mission") > OO.OPS.findIndex((x) => x.id === "2026-11-01-moon-free-1117"), "2차 작업은 1차 뒤에 실행", null);
  }
  { // DOOGO CLASS 초이 → 유나 (스토어만 · 두잉고 강사 초이는 그대로)
    const db = {
      meta: { other: 1, vod: { products: [
        { id: "v2", iid: "choi", creator: "초이", tagline: "긱스쿨 AI 굿즈 강사", intro: "긱스쿨에서 강의 중인 초이의 굿즈 클래스를 VOD로 만나 보세요.", pitch: "초이가 알려 드려요", creatorPhoto: "assets/home/choi-profile.webp" },
        { id: "fl-choi", iid: "choi", creator: "초이", title: "초이 무료 LIVE: AI로 첫 굿즈 캐릭터 만들기" },
        { id: "v1", iid: "moon", creator: "문대표", title: "베스트 초이스 강의" }],
        banners: [{ id: "vb4", eyebrow: "NEW · 초이", pid: "v2" }], crm: { tags: ["초이 팬", "AI 관심", "유나 팬"] } } },
      vcat: { products: [{ id: "fl-choi", iid: "choi", title: "초이 무료 LIVE: AI로 첫 굿즈 캐릭터 만들기" }, { id: "v1", iid: "moon", title: "베스트 초이스 강의" }] },
      "vo:1": { pid: "fl-choi", title: "초이 무료 LIVE: AI로 첫 굿즈 캐릭터 만들기", items: [{ pid: "fl-choi", title: "초이 무료 LIVE: AI로 첫 굿즈 캐릭터 만들기" }] },
      "vo:2": { pid: "v1", title: "베스트 초이스 강의" },
      "vm:a": { tags: ["초이 팬", "유나 팬"] }, "vm:b": { tags: ["문대표 팬"] },
      "ins:choi": { displayName: "초이" }, "content:choi": { brand: { instructor: "초이", photo: "assets/home/choi-profile.webp" } }
    };
    const w = OO.storeChoiToYuna((k) => (db[k] ? JSON.parse(JSON.stringify(db[k])) : null), (pre) => Object.keys(db).filter((k) => k.indexOf(pre) === 0));
    const v = w.writes.meta.vod, P = (id) => v.products.find((p) => p.id === id);
    ok(P("v2").creator === "유나" && P("v2").tagline === "AI 굿즈 크리에이터" && !/긱스쿨|초이/.test(P("v2").intro) && P("v2").pitch === "유나가 알려 드려요" && P("v2").creatorPhoto === "", "스토어 상품: 이름 · 분야 · 소개 · 사진(초이 사진 빼기)", P("v2"));
    ok(P("fl-choi").title === "유나 무료 LIVE: AI로 첫 굿즈 캐릭터 만들기" && v.banners[0].eyebrow === "NEW · 유나" && v.crm.tags.join() === "유나 팬,AI 관심" && v.v22 === 1 && w.writes.meta.other === 1, "무료 LIVE 이름 · 배너 · 회원 태그 · v22 표시 (다른 칸은 그대로)", v);
    ok(P("v1").title === "베스트 초이스 강의" && !w.writes["vo:2"] && w.writes.vcat.products[1].title === "베스트 초이스 강의", "‘초이스’ 같은 다른 낱말은 그대로", null);
    ok(w.writes.vcat.products[0].title.indexOf("유나") === 0 && w.writes["vo:1"].title.indexOf("유나") === 0 && w.writes["vo:1"].items[0].title.indexOf("유나") === 0, "결제 가격표 · 주문 상품 이름", w.writes["vo:1"]);
    ok(w.writes["vm:a"].tags.join() === "유나 팬" && !w.writes["vm:b"], "회원 태그 ‘초이 팬’ → ‘유나 팬’", null);
    ok(!w.writes["ins:choi"] && !w.writes["content:choi"], "두잉고 강사 계정 · 콘텐츠(초이)는 그대로", Object.keys(w.writes));
    ok(OO.OPS.some((x) => x.id === "2026-11-01-store-choi-to-yuna" && x.run === OO.storeChoiToYuna), "초이 → 유나 작업 목록 등록", null);
  }
  delete jar.dc_v;

  console.log("\n영상 길이 (비메오 · 유튜브 실제 재생 시간)");
  r = await call("public", { body: { action: "vdur", urls: ["https://vimeo.com/76979871", "https://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/111111111", "https://example.com/a.mp4"] } });
  ok(r.json.ok && r.json.d["https://vimeo.com/76979871"] === 1470 && r.json.d["https://youtu.be/dQw4w9WgXcQ"] === 212 && r.json.d["https://vimeo.com/111111111"] === 0 && !("https://example.com/a.mp4" in r.json.d), "비메오 oEmbed · 유튜브 영상 페이지로 실제 길이 (못 찾으면 0 · 영상 아닌 주소는 빼요)", r.json);
  ok(VDC.some((x) => x === "vm 76979871 https://www.doogoclass.com/"), "비메오에는 우리 도메인(Referer)으로 물어요 — 퍼가기 도메인을 막아 둔 영상도", VDC);
  const vc = VDC.length;
  r = await call("public", { body: { action: "vdur", urls: ["https://player.vimeo.com/video/76979871", "https://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/111111111"] } });
  ok(r.json.d["https://player.vimeo.com/video/76979871"] === 1470 && VDC.length === vc, "같은 영상은 서버가 기억한 값 · 못 찾은 영상도 하루는 다시 안 물어요", { d: r.json.d, calls: VDC.slice(vc) });
  process.env.YOUTUBE_API_KEY = "yt-key";
  r = await call("public", { body: { action: "vdur", urls: ["https://www.youtube.com/watch?v=abcdefghijk"] } });
  ok(r.json.d["https://www.youtube.com/watch?v=abcdefghijk"] === 3723 && VDC[VDC.length - 1] === "api abcdefghijk", "YOUTUBE_API_KEY 가 있으면 유튜브 Data API (PT1H2M3S → 3723초)", { d: r.json.d, last: VDC[VDC.length - 1] });
  delete process.env.YOUTUBE_API_KEY;

  console.log("19) 수강권 6개월 · 12개월 · 재수강 할인 · 최신성 업데이트 (2026-11)");
  {
    const VP = require(path.join(TMP, "class/api/_lib/vodprice.js")), st19 = require(path.join(TMP, "class/api/_lib/store.js"));
    const X19 = VP.pricer({ products: [{ id: "pz", type: "vod", status: "on", price: 129000 }], settings: {} });
    const ps19 = X19.plansOf(X19.product("pz"));
    ok(ps19.length === 2 && ps19[0].d === 180 && ps19[0].label === "6개월" && ps19[1].d === 365 && ps19[1].label === "12개월" && ps19[1].sale === 142000 && VP.planLabel(1095) === "3년", "수강권은 6개월 · 12개월 두 가지 (예전 3년 주문 이름은 그대로)", ps19);
    ok(VP.rbPrice(142000, 40) === 85200 && VP.rbPrice(65000, 40) === 39000, "재수강 할인가: 판매가 × 60% (100원 아래 버림)");
    // 재수강: 수강 기간이 끝난 회원만 40% — 쿠폰은 같이 안 써요
    useJar({ dc_a: auth.sign({ r: "master" }) });
    r = await call("vod-pay", { body: { action: "catalog", catalog: { products: [{ id: "v5", title: "챗GPT로 블로그 수익화", type: "vod", status: "on", price: 89000, sale: 59000, saleEnd: "", dg: true, iid: "choi" }], coupons: [{ id: "cp-welcome", code: "WELCOME", name: "신규 5천", kind: "won", value: 5000, days: 30, auto: "signup", on: true }], settings: { refund: { instant: true, days: 7, maxUsed: 0 } }, biz: {} } } });
    useJar({});
    r = await call("vod-auth", { body: { action: "signup", email: "rb@example.com", pw: "test1234a", pw2: "test1234a", name: "재OO", phone: "010-0000-4444", agree: true } });
    const rbMid = r.json.member && r.json.member.id, rbCp = r.json.member && r.json.member.coupons[0] && r.json.member.coupons[0].id;
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "bank", depositor: "재OO" } });
    ok(r.json.ok && r.json.amount === 65000, "처음 사는 회원은 정가 (12개월 65,000원)", r.json);
    await call("vod-pay", { body: { action: "cancelPending", no: r.json.no } });
    const oldNo = "DC250101" + String(Date.now()).slice(-6);
    await st19.writeDoc("vo:" + oldNo, { id: "vo-" + oldNo, no: oldNo, mid: rbMid, pid: "v5", kind: "course", days: 180, title: "예전 수강", list: 59000, sale: 59000, amount: 59000, status: "paid", at: Date.now() - 200 * 864e5, paidAt: Date.now() - 200 * 864e5 });
    const mdoc = await st19.getDoc("vm:" + rbMid); await st19.writeDoc("vm:" + rbMid, Object.assign({}, mdoc.v, { orderNos: (mdoc.v.orderNos || []).concat([oldNo]) }), mdoc.ver);
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "bank", depositor: "재OO", mcid: rbCp, expect: 39000 } });
    const rbo = r.json.ok ? (await st19.getDoc("vo:" + r.json.no)).v : {};
    ok(r.json.ok && r.json.amount === 39000 && rbo.sale === 39000 && rbo.rebuy && rbo.rebuy.pct === 40 && rbo.rebuy.was === 65000 && !rbo.couponOff && !rbo.mcid, "기간이 끝난 회원: 12개월 65,000 → 재수강 40% = 39,000원 (쿠폰 안 씀 · 정산 기준 sale 도 할인가)", { r: r.json, o: rbo });
    await call("vod-pay", { body: { action: "cancelPending", no: rbo.no } });
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 180, method: "card" } });
    ok(r.json.ok && r.json.amount === 35400 && /6개월 수강권 \(재수강 40%\)/.test(r.json.orderName), "카드 결제 이름: ‘6개월 수강권 (재수강 40%)’ · 59,000 → 35,400원", r.json);
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "extend", method: "bank", depositor: "재OO" } });
    ok(r.status === 409 && /재수강/.test(r.json.message), "1년 연장권은 더 팔지 않아요 → 재수강 할인 안내", r.json);
    // 강사: 자기 클래스 최신성 업데이트 기록만 저장 (모양 확인)
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    let j19 = await boot(); const mv19 = docOf(j19, "meta"), i5 = mv19.vod.products.findIndex((x) => x.id === "v5"), i6 = mv19.vod.products.findIndex((x) => x.id === "v6");
    const td = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
    const U1 = { id: "up-t1", at: td, title: "2026 최신 알고리즘 반영", n: { new: 1, upd: 1 }, lids: { new: ["l-new"], upd: ["l-a"] }, by: "ins", byName: "초이", createdAt: 1, hack: "<script>", notify: { st: "wait", act: { n: 2 }, end: { n: 1 } } };
    r = await sync([{ k: "meta", base: verOf(j19, "meta"), ops: [{ p: ["vod", "products", i5, "upds"], v: [U1, { at: "어제", title: "모양이 틀린 기록" }] }, { p: ["vod", "products", i5, "updatedAt"], v: td }, { p: ["vod", "products", i5, "price"], v: 1 }, { p: ["vod", "products", i6, "upds"], v: [U1] }] }]);
    useJar({ dc_a: auth.sign({ r: "master" }) });
    j19 = await boot(); const q5 = docOf(j19, "meta").vod.products.find((x) => x.id === "v5"), q6 = docOf(j19, "meta").vod.products.find((x) => x.id === "v6");
    ok(q5.upds && q5.upds.length === 1 && q5.upds[0].title === "2026 최신 알고리즘 반영" && !("hack" in q5.upds[0]) && q5.updatedAt === td && q5.price === 89000 && !(q6.upds && q6.upds.length), "강사: 자기 클래스 업데이트 기록 · 날짜만 저장 (모양 틀린 기록 · 다른 칸 · 남의 클래스는 그대로)", { u: q5.upds, at: q5.updatedAt, price: q5.price, q6: q6.upds });
    useJar({});
    j19 = await boot(); const v5 = docOf(j19, "meta").vod.products.find((x) => x.id === "v5");
    ok(v5.upds && v5.upds[0].title && !("notify" in v5.upds[0]), "방문자: 업데이트 기록은 보이고 알림 보낸 수(notify)는 관리자만", v5.upds);
    // 알림: 그 클래스 강사 · 마스터만 · 알림톡 연결 전이면 대상 수만
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    ok(r.status === 403, "알림: 관리자 로그인 없으면 못 보내요", r.json);
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "moon" }) });
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    ok(r.status === 403, "알림: 다른 강사 클래스는 못 보내요", r.json);
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "nope" } });
    ok(r.status === 404, "알림: 저장 안 된 업데이트는 404", r.json);
    const sol0 = SOL.length;
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    ok(r.json.ok && r.json.st === "wait" && r.json.act.n >= 1 && r.json.end.n >= 1 && SOL.length === sol0 && /연결 전/.test(r.json.why), "알림톡 연결 전: 보내지 않고 수강 중 · 수강 끝남 대상 수만", r.json);
    Object.assign(process.env, { SOLAPI_API_KEY: "sk-sol", SOLAPI_API_SECRET: "sec-sol", SOLAPI_SENDER: "0212345678", SOLAPI_PFID: "KA01PF-test" });
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    ok(r.json.ok && r.json.st === "wait" && /템플릿/.test(r.json.why), "템플릿을 안 골랐으면 대상 수만", r.json);
    const mt19 = await st19.getDoc("meta"), mvv = mt19.v;
    mvv.vod.crm = Object.assign({}, mvv.vod.crm, { send: Object.assign({}, (mvv.vod.crm || {}).send, { tpls: [{ name: "업데이트(수강 중)", id: "TPL-ACT", text: "#{이름}님, ‘#{강의명}’ 강의가 #{업데이트월}에 업데이트됐어요. #{업데이트} #{링크}" }, { name: "업데이트(끝남)", id: "TPL-END", text: "#{이름}님, 예전 강의 ‘#{강의명}’ 업데이트 안내" }], upd: { act: "0", end: "1" } }) });
    await st19.writeDoc("meta", mvv, mt19.ver);
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    const um = SOL.slice(sol0).reduce((a, x) => a.concat(x.body.messages || []), []), ua = um.find((x) => x.kakaoOptions.templateId === "TPL-ACT"), ue = um.find((x) => x.kakaoOptions.templateId === "TPL-END");
    ok(r.json.ok && r.json.st === "sent" && r.json.act.sent >= 1 && r.json.end.sent >= 1 && ua && ue && ua.type === "ATA" && ua.kakaoOptions.variables["#{강의명}"] === "챗GPT로 블로그 수익화" && ua.kakaoOptions.variables["#{업데이트}"] === "2026 최신 알고리즘 반영" && /^\d{4}년 \d{1,2}월$/.test(ua.kakaoOptions.variables["#{업데이트월}"]) && /\/vod\/p\/v5$/.test(ua.kakaoOptions.variables["#{링크}"]) && /‘챗GPT로 블로그 수익화’ 강의가 \d{4}년 \d{1,2}월에 업데이트됐어요\. 2026 최신 알고리즘 반영 https:\/\/www\.doogoclass\.com\/vod\/p\/v5/.test(ua.text), "알림톡: 수강 중 · 수강 끝남 템플릿을 나눠서 · 변수(강의명 · 업데이트월 · 업데이트 · 링크) 채워 보내요", { r: r.json, ua, ue: ue && ue.kakaoOptions.templateId });
    const sol1 = SOL.length;
    r = await call("vod-pay", { body: { action: "updNotify", pid: "v5", uid: "up-t1" } });
    ok(r.json.ok && SOL.length === sol1 && r.json.act.sent === 0 && r.json.act.skip["이미 보냄"] >= 1, "같은 업데이트를 다시 눌러도 이미 받은 회원에게는 안 보내요", r.json);
    ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_SENDER", "SOLAPI_PFID"].forEach((k) => delete process.env[k]);
    // 운영 데이터 일회성 작업: FAQ 예전 문구만 새 문구로 + 재수강 기본값
    const OO = require(path.join(TMP, "class/api/_lib/oneoff.js")), oldA = "결제할 때 고른 수강권 기간(180일 · 365일 · 3년) 동안 횟수 제한 없이 볼 수 있어요. 기간이 끝나면 1년 연장권으로 진도 그대로 이어서 들을 수 있어요.";
    const fakeMeta = { vod: { products: [{ id: "a", faq: [["언제까지?", oldA], ["직접 쓴 질문", "그대로 두세요"]] }, { id: "b" }], helpFaq: [["수강", "언제까지?", "수강권 기간(180일 · 365일 · 3년) 동안 볼 수 있어요."]], settings: { coach: { n: 5 } } } };
    const op = OO.plans612((k) => (k === "meta" ? fakeMeta : null)), nm = op.writes.meta.vod;
    ok(nm.products[0].faq[0][1] === "결제할 때 고른 수강권 기간(6개월 · 12개월) 동안 횟수 제한 없이 볼 수 있어요. 기간이 끝나면 재수강 할인가로 진도 그대로 다시 들을 수 있어요." && nm.products[0].faq[1][1] === "그대로 두세요" && nm.helpFaq[0][2] === "수강권 기간(6개월 · 12개월) 동안 볼 수 있어요." && nm.settings.rebuy.on && nm.settings.rebuy.pct === 40 && nm.settings.coach.n === 5 && op.result.faq === 1 && op.result.helpFaq === 1, "일회성 작업: FAQ 예전 문구만 6개월 · 12개월 · 재수강으로 + 재수강 할인 기본값 (다른 설정 그대로)", op.result);
    ok(OO.OPS.some((x) => x.id === "2026-11-03-plans-6-12-rebuy"), "일회성 작업 목록에 등록");
  }
  {
    console.log("20) 두고 파트너스 지원서 → 마스터 접수함 (2026-11)");
    const st20 = require(path.join(TMP, "class/api/_lib/store.js"));
    useJar({});
    const base = { action: "partner-apply", name: "지OO", phone: "010-1111-2222", email: "pt@example.com", where: "[두고 파트너스] 유튜브", course: "[VOD 강의 · 부업 · 창업] 주제\n노하우", link: "example.com/ch", message: "잘 부탁드려요", agree: true };
    let r = await call("public", { body: Object.assign({}, base, { source: "partners", ref: "ab_c.1", form: { nick: "지OO스토어", cat: "부업 · 창업", kinds: ["VOD 강의", "전자책 · 종이책", 7, ""], topic: "x".repeat(200), result: "월매출 3천", exp: "처음이에요", ready: "아직 없어요", when: "1~2개월 안", link2: "blog.example.com", from: "유튜브", ctime: "저녁 (6시 이후)", career: "  2019 창업\r\n\r\n\r\n\r\n지금 2개 브랜드  ", curri: "y".repeat(2000), reach: "1천~1만 명", target: "직장인", film: "직접 찍어서 보낼게요", price: "상담하며 정할게요", evil: "<script>", iid: "moon" } }) });
    ok(r.status === 200 && r.json.ok, "두고 파트너스 지원서 저장", r.json);
    const inqs = async () => (await st20.listDocs({ prefixes: ["inq:%"] })).map((x) => x.v);
    const d = (await inqs()).find((x) => x.email === "pt@example.com") || {};
    // 강사 입점 제안서 메일 (2026-11-15): 이메일(Resend)이 연결 안 됐으면 보내지 않고 접수만 · mailed false · 지원서에 ‘못 보냄(off)’
    ok(r.json.mailed === false && d.deckMail && d.deckMail.ok === false && d.deckMail.why === "off" && d.deckMail.at > 0, "이메일 연결 전: 지원서는 접수 · 제안서 메일은 보내지 않아요(mailed false · deckMail.why off)", { mailed: r.json.mailed, dm: d.deckMail });
    ok(d.source === "partners" && d.ref === "ab_c.1" && d.form && d.form.nick === "지OO스토어" && d.form.topic.length === 80 && d.form.kinds.join("|") === "VOD 강의|전자책 · 종이책|7" && d.form.link2 === "https://blog.example.com" && !("evil" in d.form) && !("iid" in d.form) && !d.iid && d.link === "https://example.com/ch" && d.status === "new" && /노하우/.test(d.course), "지원서 칸: 정해 둔 칸 · 길이만 · 주소엔 https:// · 모르는 칸은 버려요", d);
    ok(d.form && d.form.ctime === "저녁 (6시 이후)" && d.form.career === "2019 창업\n\n지금 2개 브랜드" && d.form.curri.length === 1500 && d.form.reach === "1천~1만 명" && d.form.target === "직장인" && d.form.film === "직접 찍어서 보낼게요" && d.form.price === "상담하며 정할게요", "구글폼 지원서 새 칸: 연락 시간 · 강사 소개(줄바꿈 유지) · 커리큘럼(1,500자) · 채널 규모 · 수강 대상 · 촬영 · 판매가", d.form);
    r = await call("public", { body: Object.assign({}, base, { email: "pt2@example.com", source: "hack", form: { nick: "x" }, ref: "bad ref!" }) });
    const d2 = (await inqs()).find((x) => x.email === "pt2@example.com") || {};
    ok(r.json.ok && !("source" in d2) && !("form" in d2) && !("ref" in d2), "모르는 source · 다른 출처의 form · 이상한 추천 코드는 저장하지 않아요", d2);
    // 이메일이 연결되면: 두고 파트너스 지원서만 지원자 이메일로 강사 입점 제안서 메일 한 통 (정보성 · 광고 표시 없음 · 정산 비율 숫자 없음)
    Object.assign(process.env, { RESEND_API_KEY: "re-test", MAIL_FROM: "두고클래스 <hello@doogoclass.com>" });
    const n20 = RES.length;
    r = await call("public", { body: Object.assign({}, base, { email: "pt4@example.com", phone: "010-3333-4444", source: "partners", form: { topic: "스마트스토어 첫 매출" } }) });
    const d4 = (await inqs()).find((x) => x.email === "pt4@example.com") || {}, m4 = ((RES[n20] || {}).body || [])[0] || {}, PM = require(path.join(TMP, "class/api/_lib/ptmail.js"));
    ok(r.status === 200 && r.json.ok && r.json.mailed === true && RES.length === n20 + 1 && RES[n20].path === "/emails/batch" && RES[n20].auth === "Bearer re-test" && (RES[n20].body || []).length === 1 &&
      m4.to && m4.to.join() === "pt4@example.com" && m4.from === "두고클래스 <hello@doogoclass.com>" && /강사 입점 제안서/.test(m4.subject) && !/\(광고\)/.test(m4.subject + m4.text) &&
      m4.text.indexOf(PM.PT_DECK) > 0 && m4.html.indexOf('href="' + PM.PT_DECK + '"') > 0 && /MD님이 연락드리기에 앞서/.test(m4.text) && /수익금이 어떻게 나뉘는지/.test(m4.text) && /지OO 강사님/.test(m4.text) && /스마트스토어 첫 매출/.test(m4.text) &&
      !/수신 거부|소식 받기에 동의/.test(m4.html) && !/\d+\s*%|정산 비율|대 \d/.test(m4.text + m4.html.replace(/(width|max-width|line-height)[^;"]*/g, "")) &&
      d4.deckMail && d4.deckMail.ok === true && d4.deckMail.id === "em0" && d4.status === "new" && d4.source === "partners",
      "이메일 연결 후: 두고 파트너스 지원서 → 지원자 이메일로 강사 입점 제안서(DocSend 링크) 한 통 · 정보성(광고 · 수신 거부 문구 없음) · 정산 비율 숫자 없음 · 지원서에 보냄(deckMail) 기록", { mailed: r.json.mailed, n: RES.length - n20, s: m4.subject, dm: d4.deckMail });
    r = await call("public", { body: Object.assign({}, base, { email: "pt5@example.com" }) });
    const d5 = (await inqs()).find((x) => x.email === "pt5@example.com") || {};
    ok(r.json.ok && !("mailed" in r.json) && RES.length === n20 + 1 && !("deckMail" in d5), "두잉고 강사 입점 문의(두고 파트너스 지원서가 아님)는 제안서 메일을 보내지 않아요", { r: r.json, n: RES.length - n20 });
    // 메일이 늦거나 실패해도 접수는 그대로 — 8초까지만 기다리고 ‘못 보냄’으로 남겨요
    const realFetch20 = global.fetch;
    global.fetch = (u, o) => (/api\.resend\.com/.test(String(u)) ? new Promise(() => {}) : realFetch20(u, o));
    const slow = await PM.sendDeck({ name: "지OO", email: "pt6@example.com" }, 30);
    global.fetch = (u, o) => (/api\.resend\.com/.test(String(u)) ? Promise.resolve({ ok: false, status: 422, json: async () => ({ message: "domain not verified" }) }) : realFetch20(u, o));
    const bad = await PM.sendDeck({ name: "지OO", email: "pt6@example.com" });
    global.fetch = realFetch20;
    ok(slow.ok === false && slow.why === "timeout" && bad.ok === false && bad.why === "error" && /domain not verified/.test(bad.err), "메일이 늦으면(timeout) · 실패하면(error) 접수는 그대로 두고 ‘못 보냄’으로 남겨요", { slow, bad });
    ["RESEND_API_KEY", "MAIL_FROM"].forEach((k) => delete process.env[k]);
    r = await call("public", { body: Object.assign({}, base, { email: "pt3@example.com", agree: false, source: "partners" }) });
    ok(r.status === 400, "개인정보 동의 없으면 받지 않아요", r.json);
    let jb = await boot();
    ok(!(jb.docs || []).some((x) => /^inq:/.test(x[0])), "방문자에게는 지원서가 보이지 않아요");
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    jb = await boot();
    ok(!(jb.docs || []).some((x) => /^inq:/.test(x[0])), "강사에게도 지원서가 보이지 않아요");
    useJar({ dc_a: auth.sign({ r: "master" }) });
    jb = await boot();
    const md = (jb.docs || []).find((x) => /^inq:/.test(x[0]) && x[1] && x[1].email === "pt@example.com");
    ok(md && md[1].form && md[1].form.cat === "부업 · 창업" && md[1].source === "partners", "마스터는 지원서를 칸까지 그대로 받아요", md && md[1]);
    useJar({});
  }
  {
    console.log("21) 이용약관 · 개인정보처리방침 2026-11 개정 (개정 예고 → 시행일에 자동 전환)");
    const src = fs.readFileSync(path.join(ROOT, "legal.js"), "utf8");
    const load = (iso) => { const w = {}, real = Date.now; Date.now = () => Date.parse(iso); try { new Function("window", src)(w); } finally { Date.now = real; } return w; };
    const before = load("2026-11-09T14:59:00Z"), after = load("2026-11-09T15:00:00Z"); // 한국 시간 11/9 23:59 · 11/10 0:00
    ok(Array.isArray(before.CLASS_LEGAL_MISS) && before.CLASS_LEGAL_MISS.length === 0, "고칠 글(예전 문구)을 모두 정확히 한 번씩 찾았어요", before.CLASS_LEGAL_MISS);
    const bt = before.CLASS_LEGAL.terms[1], at = after.CLASS_LEGAL.terms[1], bp = before.CLASS_LEGAL.privacy[1], ap = after.CLASS_LEGAL.privacy[1];
    ok(before.CLASS_LEGAL_NOTICE && before.CLASS_LEGAL_NOTICE.from === "2026-11-10" && /^## \[개정 안내\] 2026년 11월 10일부터 이용약관이 바뀝니다/.test(bt) && bt.indexOf("시행일: 2026년 10월 29일") > 0 && bt.indexOf("개정 이용약관 전문") > 0 && /^## \[개정 안내\]/.test(bp), "시행일 전: 개정 안내 + 지금 약관 + 개정 전문 (바닥 ‘개정 예정’ 표시)", bt.slice(0, 80));
    ok(after.CLASS_LEGAL_NOTICE && after.CLASS_LEGAL_NOTICE.docs.join() === "privacy" && /^시행일: 2026년 11월 10일/.test(at) && at.indexOf("개정 안내") < 0 && at.indexOf("180일 · 365일 · 3년") < 0 && at.indexOf("(수강권 · 연장권)") < 0 && at.indexOf("연장권을 사면") < 0 && /"재수강"이란/.test(at) && /재수강 할인을 적용할 수 있으며/.test(at) && /구매한 연장권은 구매할 때 안내한 기간 그대로/.test(at) && /카카오 알림톡 · 문자 등으로 알릴 수 있습니다/.test(at) && /이 약관은 2026년 11월 10일부터 시행합니다/.test(at), "시행일부터: 새 약관만 (6개월 · 12개월 · 재수강 · 이미 산 연장권 유지 · 업데이트 안내 · 부칙)", at.slice(0, 80));
    ok(/^## \[개정 안내\] 2026년 11월 18일부터 개인정보처리방침이 바뀝니다/.test(ap) && ap.indexOf("## 지금 개인정보처리방침 (2026년 11월 18일 전까지 적용)\n시행일: 2026년 11월 10일") > 0 && /두고 파트너스 지원자/.test(ap) && /누리고 주식회사\(솔라피\)/.test(ap) && /구매한 강의의 업데이트 안내/.test(ap) && ap.indexOf("2026년 11월 10일부터 적용되며") > 0 && after.CLASS_LEGAL.refund[1] === before.CLASS_LEGAL.refund[1], "개인정보처리방침 1차 시행(11/10): 지원서 항목 · 업데이트 안내 · 발송 위탁 — 2차 개정(11/18 결제대행사) 안내를 위에 (환불정책은 그대로)", ap.slice(0, 80));
    // 2차 개정 — 결제대행 위탁사를 포트원에서 토스페이먼츠로 (공지 11/11 · 시행 11/18 한국 시간 0시에 저절로)
    const r2b = load("2026-11-17T14:59:00Z"), r2 = load("2026-11-17T15:00:00Z"), p2 = r2.CLASS_LEGAL.privacy[1], p2b = r2b.CLASS_LEGAL.privacy[1];
    ok(r2b.CLASS_LEGAL_NOTICE && r2b.CLASS_LEGAL_NOTICE.from === "2026-11-18" && /^## \[개정 안내\] 2026년 11월 18일부터/.test(p2b) && p2b.indexOf("공지일: 2026년 11월 11일 · 시행일: 2026년 11월 18일") > 0 && p2b.indexOf("━━ 개정 개인정보처리방침 전문 (2026년 11월 18일 시행) ━━") > 0,
      "2차 개정 시행 전(11/17 23:59): 개정 안내(공지일 · 시행일 · 사유) + 지금 방침 + 개정 전문", p2b.slice(0, 80));
    ok(r2.CLASS_LEGAL_NOTICE === null && /^시행일: 2026년 11월 18일/.test(p2) && p2.indexOf("개정 안내") < 0 && /토스페이먼츠 주식회사\(전자결제대행사\): 신용 · 체크카드 · 간편결제\(네이버페이 · 카카오페이 등\) · 실시간 계좌이체 · 가상계좌/.test(p2) && p2.indexOf("포트원") < 0 && /발급된 가상계좌 번호 · 입금 기한/.test(p2) && /이 개인정보처리방침은 2026년 11월 18일부터 적용되며/.test(p2) && /2026년 11월 18일 개정\(결제대행 위탁사를 토스페이먼츠로 변경\)/.test(p2) && r2.CLASS_LEGAL.terms[1] === at && r2.CLASS_LEGAL.refund[1] === before.CLASS_LEGAL.refund[1],
      "2차 개정 시행일(11/18 0시)부터: 새 방침만 — 위탁사 토스페이먼츠(카드 · 간편결제 · 계좌이체 · 가상계좌) · 포트원 없음 · 가상계좌 항목 · 시행일 · 개정 이력 (약관 · 환불정책은 그대로)", p2.slice(0, 80));
  }
  {
    console.log("22) 코치 메뉴 LIVE 두잉고 / VOD 두잉고 나누기 · VOD 코치(매출 보기 · TEA TIME · 1:1 코칭) · 문대표 색");
    const CP = require(path.join(TMP, "class/coach-perms.js")), AC = require(path.join(TMP, "class/api/_lib/access.js")), OO = require(path.join(TMP, "class/api/_lib/oneoff.js"));
    const st22 = require(path.join(TMP, "class/api/_lib/store.js"));
    const OLD_CONTENT = ["brand", "guide", "curriculum", "missions", "schedule", "notices", "faq", "docs", "library", "motivation", "channels", "partners", "pages", "free", "landing", "replays", "showcase", "notes", "glossary"];
    ok(!CP.LIVE_KEYS.some((k) => CP.VOD_KEYS.indexOf(k) >= 0) && CP.LIVE_CONTENT.slice().sort().join() === OLD_CONTENT.slice().sort().join() && CP.VOD_KEYS.indexOf("vod-settle") >= 0 && CP.VOD_KEYS.indexOf("teatime") >= 0 && CP.VOD_KEYS.indexOf("coaching") >= 0,
      "메뉴 표: LIVE · VOD 열쇠가 겹치지 않고, LIVE 콘텐츠 메뉴는 예전 화면 목록 그대로 · VOD 쪽에 매출 · TEA TIME · 1:1 코칭", { live: CP.LIVE_KEYS, vod: CP.VOD_KEYS });
    ok(CP.trackOf({ perms: ["reviews"] }) === "live" && CP.trackOf({ perms: ["reviews", "coaching"] }) === "both" && CP.trackOf({ track: "vod", perms: ["reviews"] }) === "vod" && CP.trackOf(null) === "live",
      "담당 두잉고: 예전 코치는 VOD 메뉴가 있으면 둘 다 · 없으면 LIVE · 새 코치는 고른 대로");
    ok(CP.permsOf({ track: "live", perms: ["reviews", "teatime", "v-notices", "zzz"] }).join() === "reviews" && CP.permsOf({ track: "vod", perms: ["students", "teatime", "vod"] }).join() === "teatime,vod" && CP.permsOf({ perms: ["notices", "coaching"] }).sort().join() === "coaching,notices,v-notices",
      "열리는 메뉴: 담당 밖 · 모르는 열쇠는 빼요 · 예전 ‘둘 다’ 코치는 같은 이름 VOD 강의실 메뉴도 그대로");
    ok(CP.keyFor("notices", true) === "v-notices" && CP.keyFor("notices", false) === "notices" && CP.keyFor("vodlessons", true) === "vodlessons" && CP.keyFor("teatime", true) === "teatime" && CP.keyFor("pages", true) === "v-pages",
      "강사센터 메뉴 → 열쇠: VOD 탭의 강의실 꾸미기 메뉴만 v- 열쇠");
    const c0 = { brand: { courseTitle: "A" }, notices: [{ id: "n1" }], vod: { notices: [{ id: "vn1" }] }, vodBy: { v5: { notices: [] } } };
    const cN = { brand: { courseTitle: "B" }, notices: [{ id: "n2" }], vod: { notices: [{ id: "vn2" }] }, vodBy: { v5: { notices: [{ id: "x" }] } } };
    let o = CP.fixContent(JSON.parse(JSON.stringify(c0)), JSON.parse(JSON.stringify(cN)), ["notices"]);
    ok(o.notices[0].id === "n2" && o.brand.courseTitle === "B" && o.vod.notices[0].id === "vn1" && !o.vodBy.v5.notices.length, "LIVE 코치(클래스 소식): LIVE 강의실만 바뀌고 VOD 강의실(vod · vodBy)은 그대로", o);
    o = CP.fixContent(JSON.parse(JSON.stringify(c0)), JSON.parse(JSON.stringify(cN)), ["v-notices"]);
    ok(o.notices[0].id === "n1" && o.brand.courseTitle === "A" && o.vod.notices[0].id === "vn2" && o.vodBy.v5.notices.length === 1, "VOD 코치(업데이트 소식): VOD 강의실만 바뀌고 LIVE 칸 · 기본 정보는 그대로", o);
    o = CP.fixContent(JSON.parse(JSON.stringify(c0)), JSON.parse(JSON.stringify(cN)), ["v-brand"]);
    ok(o.brand.courseTitle === "B" && o.notices[0].id === "n1", "VOD 코치(기본 정보): 기본 정보(LIVE와 함께 쓰는 칸)만", o);
    const i0 = { id: "choi", menu: { items: [1] }, menuVod: { items: [1] }, menuVodBy: { v5: { items: [1] } }, coaches: [{ id: "c" }] };
    const iN = { id: "choi", menu: { items: [2] }, menuVod: { items: [2] }, menuVodBy: { v5: { items: [2] }, v9: { items: [9] } }, coaches: [] };
    o = CP.fixIns(JSON.parse(JSON.stringify(i0)), JSON.parse(JSON.stringify(iN)), ["menus"]);
    ok(o.menu.items[0] === 2 && o.menuVod.items[0] === 1 && !o.menuVodBy.v9 && o.coaches.length === 1, "LIVE 메뉴 구성 코치: LIVE 메뉴만 (코치 목록 · VOD 메뉴는 그대로)", o);
    o = CP.fixIns(JSON.parse(JSON.stringify(i0)), JSON.parse(JSON.stringify(iN)), ["v-menus"]);
    ok(o.menu.items[0] === 1 && o.menuVod.items[0] === 2 && o.menuVodBy.v5.items[0] === 2 && o.menuVodBy.v9.items[0] === 9 && o.coaches.length === 1, "VOD 메뉴 구성 코치: VOD 강의실 메뉴만", o);
    o = CP.fixIns(JSON.parse(JSON.stringify(i0)), JSON.parse(JSON.stringify(iN)), ["v-faq"]);
    ok(o.menu.items[0] === 1 && o.menuVod.items[0] === 1 && o.menuVodBy.v5.items[0] === 1 && o.menuVodBy.v9.items[0] === 9, "VOD 강의실 콘텐츠 코치: 처음 여는 VOD 강의실 메뉴(복사)만 만들 수 있고 있는 메뉴는 못 바꿔요", o);
    const cw = (perms, k) => !!AC.writer(k, { admin: { role: "coach", iid: "choi", cid: "c", perms } }, false);
    ok(cw(["coaching"], "prog:choi:s1") && !cw(["vod-settle"], "prog:choi:s1") && cw(["reviews"], "prog:choi:s1") && !cw(["coaching"], "prog:moon:s1"), "1:1 코칭 답변 코치는 수강생 기록(질문 답변)을 저장해요 · 매출만 맡은 코치 · 다른 강사 수강생은 안 돼요");
    ok(cw(["vodlessons"], "meta") && !cw(["teatime"], "meta") && !cw(["v-notices"], "stu:choi:s1") && cw(["v-notices"], "content:choi") && !cw(["teatime"], "content:choi"), "코치 쓰기: VOD 강의 자료 → meta(커리큘럼만) · 강의실 메뉴 → content · 매출 · TEA TIME 코치는 콘텐츠를 못 고쳐요");
    // VOD 강의 자료 코치 · 강사의 meta: 커리큘럼은 코치도, 두잉고 열기(dg) · 서류는 강사만
    const m0 = { vod: { products: [{ id: "v5", iid: "choi", curriculum: [{ title: "1장" }] }, { id: "v6", iid: "moon", curriculum: [] }] }, contracts: { choi: { docs: { a: 1 } } } };
    const mN = { vod: { products: [{ id: "v5", iid: "choi", dg: false, price: 1, curriculum: [{ title: "새 1장" }] }, { id: "v6", iid: "moon", curriculum: [{ title: "남의 것" }] }] }, contracts: { choi: { docs: { a: 2 } } } };
    o = AC.writer("meta", { admin: { role: "coach", iid: "choi", cid: "c", perms: ["vodlessons"] } }, false).fix(JSON.parse(JSON.stringify(m0)), JSON.parse(JSON.stringify(mN)));
    ok(o.vod.products[0].curriculum[0].title === "새 1장" && o.vod.products[0].dg === undefined && o.vod.products[0].price === undefined && !o.vod.products[1].curriculum.length && o.contracts.choi.docs.a === 1, "VOD 강의 자료 코치: 그 강사 VOD 커리큘럼만 (두잉고 열기 · 가격 · 다른 강사 · 서류는 그대로)", o);
    o = AC.writer("meta", { admin: { role: "instructor", iid: "choi" } }, false).fix(JSON.parse(JSON.stringify(m0)), JSON.parse(JSON.stringify(mN)));
    ok(o.vod.products[0].curriculum[0].title === "새 1장" && o.contracts.choi.docs.a === 2 && o.vod.products[0].price === undefined, "강사 meta: 커리큘럼 · 자기 서류는 그대로 받아요 (가격은 그대로)", o.vod.products[0]);
    // 코치가 보는 강사 계정: 정산 계좌는 빼요
    const insV = { id: "choi", status: "active", phone4: "1111", coaches: [{ id: "c", phone4: "2222" }], vodSettle: { type: "biz", bank: "국민", account: "123-45", bizNo: "1", email: "a@b.c", typeBy: "master" } };
    const cv = AC.view("ins:choi", JSON.parse(JSON.stringify(insV)), { admin: { role: "coach", iid: "choi", cid: "c", perms: ["vod-settle"] } }), iv = AC.view("ins:choi", JSON.parse(JSON.stringify(insV)), { admin: { role: "instructor", iid: "choi" } });
    ok(JSON.stringify(cv.vodSettle) === JSON.stringify({ type: "biz", typeBy: "master" }) && !cv.phone4 && !cv.coaches[0].phone4 && iv.vodSettle.account === "123-45", "코치가 받는 강사 계정: 정산 유형만 (계좌 · 사업자번호 · 이메일 · 뒷자리 빼고) · 강사는 그대로", cv.vodSettle);
    // 실제 서버로: VOD 코치 · LIVE 코치 · 강사
    useJar({ dc_a: auth.sign({ r: "master" }) });
    j = await boot();
    const ci = docOf(j, "ins:choi");
    ci.coaches = (ci.coaches || []).filter((x) => x.id !== "coach-vod").concat([{ id: "coach-vod", name: "박OO", phone4: "2020", status: "active", track: "vod", perms: ["teatime", "coaching", "vod-settle", "vod", "v-notices", "students"], createdAt: "2026-11-03" }]);
    r = await sync([{ k: "ins:choi", base: verOf(j, "ins:choi"), put: ci }]);
    ok(r.results && !r.results[0].error, "마스터: 초이 강사에 VOD 코치 추가", r.results);
    const tea = (no, st) => ({ no, id: no, mid: "m-tea", iid: "choi", pid: "v5", kind: "tea", title: "TEA TIME", status: "paid", amount: 50000, paidAt: Date.now(), buyer: { name: "홍길동", phone: "010-1234-5678" }, tea: { st, d1: "2026-12-01", slot: "오후", mode: "zoom", topic: "상담", min: 60 } });
    await st22.writeDoc("vo:TEA-1", tea("TEA-1", "req"), null); await st22.writeDoc("vo:TEA-2", tea("TEA-2", "req"), null);
    await st22.writeDoc("vpo:choi", [{ id: "po1", key: "choi", ym: "2026-10", st: "ready", amount: 1000 }], null);
    const idsOf = async (tok) => auth.identify({ headers: { cookie: "dc_a=" + encodeURIComponent(auth.sign(tok)) } });
    const vIds = await idsOf({ r: "coach", iid: "choi", cid: "coach-vod" }), lIds = await idsOf({ r: "coach", iid: "choi", cid: "coach-hana" });
    ok(vIds.admin && vIds.admin.track === "vod" && vIds.admin.perms.indexOf("students") < 0 && vIds.admin.perms.indexOf("teatime") >= 0 && lIds.admin.track === "live" && lIds.admin.perms.indexOf("teatime") < 0, "서버 신원: 코치 메뉴는 담당 두잉고에 맞는 것만 (VOD 코치에 체크된 ‘수강생 관리’는 빠져요)", { v: vIds.admin, l: lIds.admin });
    useJar({ dc_a: auth.sign({ r: "coach", iid: "choi", cid: "coach-vod" }) });
    j = await boot();
    const vo1 = docOf(j, "vo:TEA-1");
    ok(vo1 && vo1.tea && vo1.buyer && vo1.buyer.name === "홍OO" && !vo1.buyer.phone && Array.isArray(docOf(j, "vpo:choi")), "VOD 코치: 그 강사 주문(이름 가림) · 정산 내역을 봐요", { vo1, vpo: docOf(j, "vpo:choi") });
    r = await sync([{ k: "vo:TEA-1", base: verOf(j, "vo:TEA-1"), put: Object.assign({}, vo1, { amount: 1, status: "refunded", tea: Object.assign({}, vo1.tea, { st: "ok", when: "2026-12-01T14:00", where: "https://zoom.us/j/1" }) }) }]);
    let sv = (await st22.getDoc("vo:TEA-1")).v;
    ok(!r.results[0].error && sv.tea.st === "ok" && sv.tea.when === "2026-12-01T14:00" && sv.tea.where === "https://zoom.us/j/1" && sv.tea.okAt && sv.amount === 50000 && sv.status === "paid" && sv.buyer.name === "홍길동", "VOD 코치: TEA TIME 일정 확정이 서버에 저장 (금액 · 상태 · 회원 칸은 그대로)", { r: r.results, sv });
    j = await boot();
    r = await sync([{ k: "vo:TEA-1", base: verOf(j, "vo:TEA-1"), put: Object.assign({}, docOf(j, "vo:TEA-1"), { tea: Object.assign({}, docOf(j, "vo:TEA-1").tea, { st: "cancel" }) }) }]);
    sv = (await st22.getDoc("vo:TEA-1")).v;
    ok(sv.tea.st === "ok" && !sv.refundReq, "VOD 코치: TEA TIME 취소 · 환불 요청은 못 해요 (강사만)", sv.tea);
    r = await sync([{ k: "vpo:choi", base: verOf(j, "vpo:choi"), put: [{ id: "po1", key: "choi", ym: "2026-10", st: "ready", amount: 1000, invReqAt: 5, invNo: "X" }] }]);
    ok(r.results[0].error === "forbidden" && !(await st22.getDoc("vpo:choi")).v[0].invNo, "VOD 코치: 정산 내역은 보기만 (세금계산서 칸 못 고침)", r.results);
    useJar({ dc_a: auth.sign({ r: "coach", iid: "choi", cid: "coach-hana" }) });
    j = await boot();
    ok(!(j.docs || []).some((d) => /^vo:|^vpo:/.test(d[0])), "LIVE 코치: VOD 주문 · 정산 내역은 안 내려와요", (j.docs || []).filter((d) => /^vo:|^vpo:/.test(d[0])).map((d) => d[0]));
    r = await sync([{ k: "vo:TEA-2", base: 1, put: Object.assign(tea("TEA-2", "req"), { tea: Object.assign(tea("TEA-2", "req").tea, { st: "ok", when: "2026-12-02T14:00" }) }) }]);
    ok(r.results[0].error === "forbidden" && (await st22.getDoc("vo:TEA-2")).v.tea.st === "req", "LIVE 코치: TEA TIME은 못 고쳐요", r.results);
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    j = await boot();
    r = await sync([{ k: "vo:TEA-1", base: verOf(j, "vo:TEA-1"), put: Object.assign({}, docOf(j, "vo:TEA-1"), { tea: Object.assign({}, docOf(j, "vo:TEA-1").tea, { st: "done" }) }) }]);
    sv = (await st22.getDoc("vo:TEA-1")).v;
    ok(!r.results[0].error && sv.tea.st === "done" && sv.tea.doneAt, "강사: TEA TIME 진행 완료가 서버에 저장 (전에는 강사 화면에만 남았어요)", sv.tea);
    r = await sync([{ k: "vo:TEA-2", base: verOf(j, "vo:TEA-2"), put: Object.assign({}, docOf(j, "vo:TEA-2"), { tea: Object.assign({}, docOf(j, "vo:TEA-2").tea, { st: "cancel" }) }) }]);
    sv = (await st22.getDoc("vo:TEA-2")).v;
    ok(sv.tea.st === "cancel" && sv.refundReq, "강사: TEA TIME 취소 → 마스터에게 환불 요청", sv);
    r = await sync([{ k: "vo:TEA-2", base: verOf(j, "vo:TEA-2"), put: Object.assign({}, docOf(j, "vo:TEA-2"), { tea: Object.assign({}, docOf(j, "vo:TEA-2").tea, { st: "ok", when: "bad" }) }) }]);
    ok((await st22.getDoc("vo:TEA-2")).v.tea.st === "cancel", "취소한 TEA TIME은 다시 확정하지 못해요", (await st22.getDoc("vo:TEA-2")).v.tea);
    // 문대표 코치를 LIVE 담당으로 (일회성 작업)
    let w = OO.moonCoachesLive((k) => (k === "ins:moon" ? { id: "moon", coaches: [{ id: "a", perms: ["reviews", "coaching"] }, { id: "b", track: "vod", perms: ["teatime"] }] } : null));
    const mc = w.writes["ins:moon"];
    ok(mc && mc.coaches[0].track === "live" && mc.coaches[0].perms.join() === "reviews,coaching" && mc.coaches[1].track === "vod" && w.result.live === 1, "일회성: 문대표 코치 담당을 LIVE로 (담당이 비어 있는 코치만 · 메뉴 체크는 그대로)", w.result);
    w = OO.moonCoachesLive((k) => (k === "ins:moon" ? mc : null));
    ok(!Object.keys(w.writes).length, "일회성: 다시 돌려도 그대로", w.result);
    // 강사 입점 문의: 예시 3건만 지우고 실제 문의는 그대로 (일회성 작업)
    const INQ = { "inq:inq-demo-1": { id: "inq-demo-1", name: "박OO", email: "seoyeon.park@example.com", ref: "HAJIWON", status: "new" }, "inq:inq-demo-2": { id: "inq-demo-2", email: "doyoon@example.com", ref: "HAJIWON", status: "contact" },
      "inq:inq-demo-3": { id: "inq-demo-3", email: "choi.class@example.com", ref: "HAJIWON", status: "done", iid: "choi" }, "inq:iq-real": { id: "iq-real", name: "신OO", email: "real@gmail.com", source: "partners", status: "new" },
      "inq:iq-real2": { id: "iq-real2", email: "x@example.com", status: "new" }, "inq:inq-demo-9": { id: "inq-demo-9", email: "real@naver.com", status: "new" } };
    w = OO.demoInqClear((k) => (INQ[k] ? JSON.parse(JSON.stringify(INQ[k])) : undefined), (pre) => Object.keys(INQ).filter((k) => k.indexOf(pre) === 0).sort());
    ok(Object.keys(w.writes).sort().join() === "inq:inq-demo-1,inq:inq-demo-2,inq:inq-demo-3" && Object.values(w.writes).every((v) => v === null) && w.result.kept.length === 3, "일회성: 예시 입점 문의 3건(예시 id · @example.com)만 지우고 실제 문의(두고 파트너스 지원서 등)는 그대로", w.result);
    ok(OO.OPS.some((x) => x.id === "2026-11-03-demo-inquiries-clear" && x.run === OO.demoInqClear), "일회성 작업 목록에 예시 문의 지우기가 있어요");
    // 예시 파트너 계정만 지우고 실제 파트너는 그대로 (일회성 작업)
    const PM = { meta: { other: 1, affSettings: { rs: 20 }, affiliates: [{ id: "aff-demo", name: "하OO", loginId: "partner", code: "HAJIWON", instructors: [{ iid: "choi" }] }, { id: "aff-real", name: "김OO", loginId: "real01", code: "REAL" }, { id: "aff-x", loginId: "partner", code: "HAJIWON" }],
      affPayouts: { "aff-demo:2026-09": { paidAt: "2026-10-10" }, "aff-real:2026-10": { paidAt: "2026-11-10" } } }, "inq:iq-real": { id: "iq-real", email: "r@gmail.com" } };
    w = OO.demoPartnerClear((k) => (PM[k] ? JSON.parse(JSON.stringify(PM[k])) : undefined), (pre) => Object.keys(PM).filter((k) => k.indexOf(pre) === 0));
    const pm2 = w.writes.meta;
    ok(pm2 && pm2.affiliates.map((p) => p.id).join() === "aff-real,aff-x" && Object.keys(pm2.affPayouts).join() === "aff-real:2026-10" && pm2.other === 1 && pm2.affSettings.rs === 20 && w.result.removed.join() === "aff-demo" && !w.result.inqLinked.length,
      "일회성: 예시 파트너(aff-demo)와 그 RS 기록만 지우고 실제 파트너 · 다른 설정은 그대로", w.result);
    w = OO.demoPartnerClear((k) => (k === "meta" ? pm2 : undefined), () => []);
    ok(!Object.keys(w.writes).length && OO.OPS.some((x) => x.id === "2026-11-03-demo-partner-clear"), "일회성: 다시 돌려도 그대로 · 작업 목록에 있어요", w.result);
    ok(OO.OPS.some((x) => x.id === "2026-11-03-moon-coaches-live" && x.run === OO.moonCoachesLive), "일회성 작업 목록에 있어요 (코치 이름 없이 문대표 코치 전체 · 담당 빈 칸만)");
    // 정식 운영: 테스트 데이터 정리 — 체험 계정은 하나씩 남기고 테스트용만 (가짜 이름만 써요)
    const TC = {
      "stu:moon:s1": { id: "s1", instructorId: "moon", name: "이수진", phone4: "2186", status: "approved", demo: true }, "prog:moon:s1": { a: 1 },
      "stu:moon:demo1": { id: "demo1", instructorId: "moon", name: "1기 체험단", phone4: "1111", demo: true }, "prog:moon:demo1": { a: 1 },
      "stu:logic:s13": { id: "s13", instructorId: "logic", name: "홍길동", phone4: "0000" }, "prog:logic:s13": { a: 1 },
      "stu:moon:vs-a": { id: "vs-a", instructorId: "moon", name: "박OO", phone4: "3333", vodMid: "vm-3", track: "vod" }, "prog:moon:vs-a": { questions: [{ id: "q-coach-demo" }] },
      "stu:moon:vs-b": { id: "vs-b", instructorId: "moon", name: "체험회원", phone4: "0000", vodMid: "vmdemo", track: "vod" },
      "stu:moon:vs-c": { id: "vs-c", instructorId: "moon", name: "테스트", phone4: "0000", vodMid: "vmtest", track: "vod" },
      "stu:moon:vs-d": { id: "vs-d", instructorId: "moon", name: "고객", phone4: "0000", vodMid: "vmreal", track: "vod" },
      "stu:moon:s20": { id: "s20", instructorId: "moon", name: "정상", phone4: "1234", status: "approved" },
      "vm:vmdemo": { id: "vmdemo", demo: true, phone: "010-0000-0000", email: "vod@gmail.com" },
      "vm:vmtest": { id: "vmtest", phone: "010-0000-0000", email: "T@x.com", kakaoId: "k1", name: "테스트" }, "vme:t@x.com": { id: "vmtest" }, "vmk:k1": { id: "vmtest" }, "vp:vmtest": { v1: {} },
      "vo:DC1": { id: "vo-DC1", no: "DC1", mid: "vmtest", amount: 0, status: "paid" }, "vo:DC9": { id: "vo-DC9", no: "DC9", mid: "vmtest", amount: 9000, status: "ready" },
      "vr:r1": { id: "r1", mid: "vmtest" }, "vr:r2": { id: "r2", mid: "vmok" }, "vq:vmtest:q1": { id: "q1" }, "vpl:p1": { id: "p1", mid: "vmtest" },
      "vm:vmreal": { id: "vmreal", phone: "01000000000", name: "고객" }, "vo:DC2": { id: "vo-DC2", no: "DC2", mid: "vmreal", amount: 15900, status: "paid" },
      "vm:vmok": { id: "vmok", phone: "010-1234-5678" }, "vo:DC3": { id: "vo-DC3", no: "DC3", mid: "vmdemo", amount: 0, status: "paid", demo: true },
      "ins:moon": { id: "moon", coaches: [{ id: "coach1", name: "김하나", phone4: "1004" }] },
      "ins:choi": { id: "choi", displayName: "초이", coaches: [{ id: "coach-hana", name: "김하나", phone4: "1004", memo: "테스트 코치 · 여러 강의 코치 확인용" }, { id: "coach-x", name: "이OO", memo: "" }] },
      meta: { other: 1, staff: [{ id: "st-demo1", loginId: "manager", pw: "manager", status: "stopped" }, { id: "st-demo2", loginId: "finance", pw: "바꿈", status: "active" }, { id: "st-real", loginId: "real", pw: "x" }] }
    };
    const tcGet = (k) => (TC[k] ? JSON.parse(JSON.stringify(TC[k])) : undefined), tcKeys = (pre) => Object.keys(TC).filter((k) => k.indexOf(pre) === 0).sort();
    w = OO.launchTestClean(tcGet, tcKeys);
    const del = Object.keys(w.writes).filter((k) => w.writes[k] === null).sort();
    ok(del.join() === ["prog:logic:s13", "prog:moon:demo1", "prog:moon:vs-a", "stu:logic:s13", "stu:moon:demo1", "stu:moon:vs-a", "stu:moon:vs-c", "vm:vmtest", "vme:t@x.com", "vmk:k1", "vo:DC1", "vo:DC9", "vp:vmtest", "vpl:p1", "vq:vmtest:q1", "vr:r1"].sort().join(),
      "일회성(테스트 정리): 0000 테스트 수강생 · 예시 VOD 회원 기록(예시 코칭 질문) · 중복 체험단 · 010-0000-0000 테스트 회원(이메일 · 카카오 · 진도 · 주문 · 후기 · 문의 · 다짐)만 지워요", del);
    ok(!w.writes["stu:moon:s1"] && !w.writes["stu:moon:vs-b"] && !w.writes["stu:moon:vs-d"] && !w.writes["stu:moon:s20"] && !w.writes["vm:vmdemo"] && !w.writes["vm:vmreal"] && !w.writes["vo:DC2"] && !w.writes["vo:DC3"] && !w.writes["vr:r2"] && !w.writes["ins:moon"],
      "일회성(테스트 정리): 체험 계정(수강생 이수진 · DOOGO CLASS 체험 회원 · 코치 김하나) · 실제 결제가 있는 회원 · 일반 수강생은 그대로", w.result);
    ok(w.writes["ins:choi"] && w.writes["ins:choi"].coaches.map((c) => c.id).join() === "coach-x" && w.writes["ins:choi"].displayName === "초이" && w.writes.meta && w.writes.meta.staff.map((x) => x.id).join() === "st-demo2,st-real" && w.writes.meta.other === 1,
      "일회성(테스트 정리): 테스트 코치(coach-hana) · 비밀번호가 예시 그대로인 예시 운영자만 지워요 (비밀번호를 바꾼 계정 · 다른 설정은 그대로)", w.writes.meta);
    ok(w.result.membersKept.length === 2 && w.result.kept.length === 3 && w.result.students.every((x) => (/ \SOO \(/.test(x) || / \d기 체험단 \(/.test(x)) && !/홍길동|테스트 \(|고객 \(/.test(x)) && w.result.members.every((x) => /^\SOO \(/.test(x)),
      "일회성(테스트 정리): 결과에는 이름을 가려 남기고, 남긴 체험 계정 · 실제 결제 회원도 적어요", w.result);
    Object.keys(w.writes).forEach((k) => { if (w.writes[k] === null) delete TC[k]; else TC[k] = w.writes[k]; });
    w = OO.launchTestClean(tcGet, tcKeys);
    ok(!Object.keys(w.writes).length && OO.OPS.some((x) => x.id === "2026-11-03-launch-test-clean" && x.run === OO.launchTestClean), "일회성(테스트 정리): 다시 돌려도 그대로 · 작업 목록에 있어요", w.writes);
    // 문대표 기수 일정 다시 맞추기 (일회성 작업)
    const MC = {
      "cohorts:moon": [{ id: "c1", instructorId: "moon", name: "1기", startDate: "2026-08-06", classDow: 4, classTime: "20:00" }, { id: "c2", instructorId: "moon", name: "2기", startDate: "2026-09-03", classDow: 4, classTime: "20:00" },
        { id: "c3", instructorId: "moon", name: "3기", startDate: "2026-10-01", classDow: 4, classTime: "20:00" }, { id: "c4", instructorId: "moon", name: "4기", startDate: "2026-11-21", recruiting: true, curriculumId: "cur-4w", weeks: 4, classDow: 6, classTime: "12:00" }],
      "content:moon": { other: 1, landing: { hero: { ctaLabel: "4기 수강 신청하기" }, pricing: { ctaLabel: "지금 신청" } }, faq: [{ q: "4기는 언제?" }], schedule: [{ id: "n3", type: "notice", title: "공지", scope: "cohort", cohortId: "c3", date: "2026-10-03" }, { id: "e5", type: "challenge", title: "첫 상품 등록 7일 챌린지 강의", scope: "all", week: 2, dow: 5 }, { id: "b1", type: "bonus", title: "내가 고친 보너스", scope: "all", week: 2, dow: 6 }, { id: "q1", type: "qna", title: "주간 Q&A", scope: "all", week: 1, dow: 2 }] },
      "stu:moon:s1": { id: "s1", instructorId: "moon", cohortId: "c3", name: "이수진", demo: true }, "stu:moon:s9": { id: "s9", instructorId: "moon", cohortId: "c4", name: "정상" },
      "bill:moon:b4": { id: "b4", cohortId: "c4", cohortName: "4기" }, "bill:moon:b3": { id: "b3", cohortId: "c3", cohortName: "3기", demo: true }
    };
    const mcGet = (k) => (MC[k] ? JSON.parse(JSON.stringify(MC[k])) : undefined), mcKeys = (pre) => Object.keys(MC).filter((k) => k.indexOf(pre) === 0).sort();
    w = OO.moonCohortDates(mcGet, mcKeys);
    const mco = w.writes["cohorts:moon"], m1 = mco.find((c) => c.id === "c1"), m2 = mco.find((c) => c.id === "c2"), m4 = mco.find((c) => c.id === "c4");
    ok(mco.length === 3 && !mco.some((c) => c.id === "c3") && m1.startDate === "2026-01-24" && m1.classDow === 6 && m1.classTime === "20:00" && m2.startDate === "2026-08-29" && m2.classDates[5] === "2026-09-23" && m4.name === "3기" && m4.startDate === "2026-11-21" && m4.curriculumId === "cur-4w" && m4.weeks === 4 && m4.recruiting === true && m4.classTime === "12:00",
      "일회성(문대표 기수): 1기 1/24(토) · 2기 8/29(토)+5주차 9/23(수) · 4기(11/21)를 3기로 · 예전 예시 3기(10/1) 지움 (강의 시간은 그대로)", mco);
    const msc = w.writes["content:moon"].schedule;
    ok(w.writes["stu:moon:s1"].cohortId === "c4" && !w.writes["stu:moon:s9"] && w.writes["bill:moon:b4"].cohortName === "3기" && !w.writes["bill:moon:b3"] &&
      !msc.some((e) => e.id === "n3" || e.id === "e5") && msc.some((e) => e.id === "b1") && msc.some((e) => e.id === "q1") &&
      ["2026-11-25", "2026-12-02", "2026-12-09", "2026-12-16"].every((d) => msc.some((e) => e.type === "challenge" && e.cohortId === "c4" && e.date === d)) && msc.some((e) => e.type === "bonus" && e.cohortId === "c4" && e.date === "2026-12-15" && e.title === "5주차 보너스 강의"),
      "일회성(문대표 기수): 체험 수강생 → 새 3기 · 이용료 기록 이름 3기 · 챌린지 4회(수) · 5주차 보너스 강의 12/15(화) · 예시 반복 챌린지만 지우고 고친 일정 · Q&A는 그대로", msc);
    ok(w.writes["content:moon"].landing.hero.ctaLabel === "3기 수강 신청하기" && w.writes["content:moon"].landing.pricing.ctaLabel === "지금 신청" && w.writes["content:moon"].other === 1 && w.result.left4.join() === "faq.0.q",
      "일회성(문대표 기수): 신청 버튼 ‘4기’ → ‘3기’ (그 문구일 때만) · 다른 ‘4기’ 글자는 위치만 알려요", w.result);
    MC["stu:moon:s8"] = { id: "s8", instructorId: "moon", cohortId: "c3", name: "실제" };
    w = OO.moonCohortDates(mcGet, mcKeys);
    ok(w.writes["cohorts:moon"].some((c) => c.id === "c3" && c.name === "예전 3기" && !c.recruiting) && w.writes["content:moon"].schedule.some((e) => e.id === "n3"), "일회성(문대표 기수): 예전 3기에 실제 수강생이 있으면 지우지 않고 ‘예전 3기’로 이름만", w.result.removed);
    ok(OO.OPS.findIndex((x) => x.id === "2026-11-03-moon-cohort-dates") > OO.OPS.findIndex((x) => x.id === "2026-10-31-moon-4th-cohort"), "일회성(문대표 기수): 4기 작업 뒤에 돌아요");
    { // 주차별 강의일 바꾸기 (db.js)
      const vm2 = require("vm"), ls2 = new Map(), sb2 = { console, Date, Math, JSON, Intl, localStorage: { getItem: (k) => (ls2.has(k) ? ls2.get(k) : null), setItem: (k, v) => ls2.set(k, String(v)), removeItem: (k) => ls2.delete(k), key: () => null, length: 0 } };
      sb2.window = sb2; vm2.createContext(sb2); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm2.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb2, { filename: f })); sb2.DB.load();
      const D2 = sb2.DB, g2 = { id: "x2", instructorId: "moon", startDate: "2026-08-29", classDow: 6, classDates: { 5: "2026-09-23" } }, g0 = Object.assign({}, g2, { classDates: undefined });
      ok(D2.classDate(g2, 4) === "2026-09-19" && D2.classDate(g2, 5) === "2026-09-23" && D2.baseClassDate(g2, 5) === "2026-09-26" && D2.weekOpen(g2, 5) === "2026-09-23" && D2.weekDeadline(g2, 5) === "2026-10-02" && D2.cohortEnd(g2) === "2026-10-02" && D2.classDate(g0, 5) === "2026-09-26" && D2.weekOpen(g0, 5) === "2026-09-26",
        "주차별 강의일: 5주차만 9/23(수) — 그 날 주차가 열리고 과제 마감은 그대로 · 바꾸지 않은 기수는 예전처럼");
      const evs2 = D2.events("moon", g2).filter((e) => e.type === "open").map((e) => e.date);
      ok(evs2.join() === "2026-08-29,2026-09-05,2026-09-12,2026-09-19,2026-09-23", "주차별 강의일: 수업 캘린더 강의 날짜도 8/29 · 9/5 · 9/12 · 9/19 · 9/23", evs2);
      const ad22 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
      ok(/name="pl-wd-/.test(ad22) && /classDates: Object\.keys\(cd\)\.length \? cd : undefined/.test(ad22), "마스터 기수 설계 창: 주차별 강의일 칸 · 기본과 다른 날만 저장");
      // 수업 캘린더 (2026-11-04): 녹화본은 오프라인 강의 이틀 뒤 · 달력 칸에 주차 · 일정 이름 · 온라인 강의 · 초청강사
      const g3 = { id: "x3", instructorId: "moon", startDate: "2026-11-21", classDow: 6, weeks: 4, curriculumId: "cur-4w" };
      const rp3 = D2.events("moon", g3).filter((e) => e.type === "replay");
      ok(rp3.length && rp3[0].date === "2026-11-23" && rp3[0].week === 1 && rp3.every((e) => e.auto), "수업 캘린더: 강의 녹화본 업로드는 오프라인 강의(토) 이틀 뒤(월) 자동 — 1주차 11/21 → 11/23", rp3.map((e) => e.date));
      const ch = (e) => D2.calChip("moon", e);
      const c1 = ch(rp3[0]), c2 = ch({ type: "challenge", time: "19:00", title: "챌린지 2회차" }), c3 = ch({ type: "online", time: "19:00", title: "문대표 - 5주차 온라인 강의" }), c4 = ch({ type: "guest", time: "19:00", title: "OO대표 특별강의 - 쿠팡" }), c5 = ch({ type: "event", time: "20:00", title: "수료식 · 성과 발표" }), c6 = ch({ type: "bonus", time: "", title: "" });
      ok(c1.l === "1주차 강의 녹화본 업로드" && c1.s === "1주 녹화" && c2.l === "19:00 챌린지 2회차" && c2.s === "챌린지 2" && c3.l === "19:00 문대표 - 5주차 온라인 강의" && c3.s === "5주차" && c4.l === "19:00 OO대표 특별강의 - 쿠팡" && c4.s === "초청" && c5.l === "20:00 수료식 · 성과 발표" && c5.s === "행사" && c6.l === "보너스 강의" && c6.s === "보너스",
        "수업 캘린더 칸 글씨: 녹화본은 몇 주차인지 · 추가한 일정은 ‘행사’ 대신 일정 이름(챌린지 2회차 · 특강 이름) · 휴대폰은 짧게(1주 녹화 · 챌린지 2 · 5주차 · 초청)", [c1, c2, c3, c4, c5, c6]);
      const op3 = D2.events("moon", g3).find((e) => e.type === "open");
      ok(ch(op3).l === "1주차 오프라인 강의" && D2.calMain({ type: "online" }) && D2.calMain(op3) && !D2.calMain({ type: "guest" }) && D2.CAL_ORDER.indexOf("online") === 1 && D2.EVENT_TYPES.online.label === "온라인 강의" && D2.EVENT_TYPES.guest.label === "초청강사" && D2.calManual("moon").slice(0, 2).join() === "open,online",
        "수업 캘린더: 주차 강의는 그대로 ‘1주차 오프라인 강의’ · 온라인 강의도 강의 날(같은 색) · 종류 ‘온라인 강의’ · ‘초청강사’ · 문대표 종류 목록에 온라인 강의");
      const st22 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8"), adm22 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
      ok(/\.cal-chip\.t-open, \.cal-chip\.t-online \{ background: var\(--cal-main/.test(st22) && /\.cal-chip\.t-guest \{ --c:/.test(st22) && /PLAN_KINDS = \["free", "offline", "online", "challenge", "qna", "bonus", "guest", "event", "notice"\]/.test(adm22),
        "수업 캘린더: 온라인 강의는 오프라인 강의와 같은 색 · 초청강사 색 · 일정 추가 종류에 온라인 강의 · 초청강사(행사 바로 위)");
    }
    // 문대표 수업 캘린더 정리 (일회성 작업 2026-11-04): 녹화본 +2일 · 12/15 5주차 보너스 강의 → 온라인 강의 · 특강(행사) → 초청강사
    const CV = { "content:moon": { other: 1, brand: { theme: "nz", cal: { types: ["open", "replay", "deadline", "challenge", "bonus"], labels: { open: "오프라인 강의", challenge: "챌린지 강의" }, short: "오프라인", replayAfter: 1 } },
      schedule: [{ id: "e6", type: "event", title: "수료식 · 성과 발표", time: "20:00", scope: "all", week: 6, dow: 4 }, { id: "e-m3-ch2", type: "challenge", title: "챌린지 2회차", time: "19:00", scope: "cohort", cohortId: "c4", date: "2026-12-02" },
        { id: "eA", type: "event", title: "OO대표 특별강의 - 쿠팡", time: "19:00", scope: "cohort", cohortId: "c4", date: "2026-12-08" }, { id: "eB", type: "event", title: "OO대표 특별강의 - 네이버 광고 마케팅", time: "19:00", scope: "cohort", cohortId: "c4", date: "2026-12-14" },
        { id: "e-m3-bonus", type: "bonus", title: "문대표 - 5주차 보너스 강의", time: "19:00", scope: "cohort", cohortId: "c4", date: "2026-12-15" }, { id: "b9", type: "bonus", title: "보너스 강의 · 다른 날", scope: "cohort", cohortId: "c4", date: "2026-12-20" }] } };
    const cvGet = (k) => (CV[k] ? JSON.parse(JSON.stringify(CV[k])) : undefined);
    w = OO.moonCalV2(cvGet);
    const cvc = w.writes["content:moon"], cvs = cvc && cvc.schedule, byId = (id) => cvs.find((e) => e.id === id);
    ok(cvc && cvc.brand.cal.replayAfter === 2 && cvc.brand.cal.types.join() === "open,online,replay,deadline,challenge,bonus" && cvc.brand.theme === "nz" && cvc.other === 1,
      "일회성(문대표 캘린더): 녹화본 업로드 다음 날 → 이틀 뒤 · 일정 종류에 온라인 강의(오프라인 강의 다음) · 다른 설정은 그대로", cvc && cvc.brand);
    ok(byId("e-m3-bonus").type === "online" && byId("e-m3-bonus").title === "문대표 - 5주차 온라인 강의" && byId("e-m3-bonus").date === "2026-12-15" && byId("e-m3-bonus").time === "19:00" && byId("b9").type === "bonus" &&
      byId("eA").type === "guest" && byId("eB").type === "guest" && byId("eA").title === "OO대표 특별강의 - 쿠팡" && byId("e6").type === "event" && byId("e-m3-ch2").type === "challenge" && w.result.guest.join() === "2026-12-08,2026-12-14" && w.result.events === 1,
      "일회성(문대표 캘린더): 12/15 5주차 보너스 강의 → 5주차 온라인 강의(날짜 · 시간 그대로) · 특강 2개 → 초청강사 · 수료식 · 챌린지 · 다른 보너스 강의는 그대로 (결과엔 날짜만)", w.result);
    CV["content:moon"] = cvc;
    w = OO.moonCalV2(cvGet);
    ok(!Object.keys(w.writes).length && w.result.skipped && OO.OPS.some((x) => x.id === "2026-11-04-moon-cal-v2" && x.run === OO.moonCalV2) && OO.OPS.findIndex((x) => x.id === "2026-11-04-moon-cal-v2") > OO.OPS.findIndex((x) => x.id === "2026-11-03-moon-cohort-dates"),
      "일회성(문대표 캘린더): 다시 돌려도 그대로 · 기수 일정 작업 뒤에 돌아요", w);
    // 메인 강사 강의를 주차마다 (2026-11-05): 날짜 · 시작 ~ 끝 · 장소 · 방식(오프라인 · 온라인) · 주제 + 모든 일정에 끝나는 시간
    { const vm5 = require("vm"), ls5 = new Map(), sb5 = { console, Date, Math, JSON, Intl, localStorage: { getItem: (k) => (ls5.has(k) ? ls5.get(k) : null), setItem: (k, v) => ls5.set(k, String(v)), removeItem: (k) => ls5.delete(k), key: () => null, length: 0 } };
      sb5.window = sb5; vm5.createContext(sb5); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm5.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb5, { filename: f })); sb5.DB.load();
      const D5 = sb5.DB, g5 = { id: "x5", instructorId: "moon", startDate: "2026-11-21", classDow: 6, weeks: 4, curriculumId: "cur-4w", classTime: "10:30", classPlace: "본관", classDates: { 2: "2026-11-22" },
        classOver: { 1: { time: "13:30", end: "18:30", place: "3층", topic: "해외 건기식 OT" }, 2: { time: "09:00", end: "13:30", place: "3층", topic: "브랜딩" }, 3: { mode: "online", url: "https://zoom.us/j/1", topic: "자사몰" }, 4: { time: "09:00" } } };
      const ev5 = D5.events("moon", g5), lec5 = ev5.filter((e) => D5.isWeekLec(e)), dl5 = ev5.filter((e) => e.type === "deadline").map((e) => e.date), rp5 = ev5.filter((e) => e.type === "replay").map((e) => e.date);
      ok(lec5.map((e) => e.date).join() === "2026-11-21,2026-11-22,2026-12-05,2026-12-12" && lec5[0].type === "open" && lec5[0].time === "13:30" && lec5[0].end === "18:30" && lec5[0].place === "3층" && lec5[0].title === "1주차 오프라인 강의 — 해외 건기식 OT" && D5.evTime(lec5[0]) === "13:30~18:30" &&
        lec5[1].title === "2주차 오프라인 강의 — 브랜딩" && D5.evTime(lec5[1]) === "09:00~13:30",
        "메인 강사 강의: 주차마다 날짜(11/21 · 11/22 · 12/5 · 12/12) · 13:30~18:30 · 장소 · 주제(커리큘럼 제목 대신) · 시간은 제목에 붙이지 않고 따로", lec5.map((e) => [e.date, e.type, D5.evTime(e), e.place, e.title]));
      ok(lec5[2].type === "online" && lec5[2].title === "3주차 온라인 강의 — 자사몰" && lec5[2].place === "" && lec5[2].url === "https://zoom.us/j/1" && lec5[2].time === "10:30" && D5.calChip("moon", lec5[2]).s === "3주차" && D5.calChip("moon", lec5[2]).l === "3주차 온라인 강의" && D5.calMain(lec5[2]),
        "메인 강사 강의: 온라인(줌) 주차는 ‘온라인 강의’(같은 강의 날 색) · 기본 장소를 안 붙이고 입장 링크 · 시작은 기본 시간", lec5[2]);
      ok(lec5[3].time === "09:00" && lec5[3].end === "" && lec5[3].place === "본관" && D5.lectureOf("moon", Object.assign({}, g5, { classEnd: "12:00", classOver: {} }), { no: 4, title: "t" }).end === "12:00" && D5.lectureOf("moon", Object.assign({}, g5, { classEnd: "12:00" }), { no: 4, title: "t" }).end === "",
        "메인 강사 강의: 비운 칸은 기수 기본값(장소 · 끝나는 시간) — 그 주차만 시작을 바꾸고 끝을 비우면 끝은 비워요");
      ok(dl5.join() === "2026-11-27,2026-12-04,2026-12-11,2026-12-18" && rp5.join() === "2026-11-23,2026-11-24,2026-12-07,2026-12-14", "메인 강사 강의: 과제 마감은 주마다 그대로 · 녹화본은 그 주차 강의 이틀 뒤", { dl5, rp5 });
      const sc5 = D5.content("moon").schedule; sc5.push({ id: "z5", type: "challenge", title: "챌린지 1회차", time: "19:00", end: "21:00", scope: "cohort", cohortId: "x5", date: "2026-11-25" }, { id: "z6", type: "qna", title: "Q&A", time: "", end: "21:00", scope: "cohort", cohortId: "x5", date: "2026-11-26" });
      const zs = D5.events("moon", g5).filter((e) => e.id === "z5" || e.id === "z6");
      ok(zs.length === 2 && D5.evTime(zs[0]) === "19:00~21:00" && zs[1].end === "" && D5.evTime(zs[1]) === "" && D5.evTime({ time: "19:00" }) === "19:00" && D5.calChip("moon", zs[0]).l === "19:00 챌린지 1회차",
        "모든 일정에 끝나는 시간: ‘19:00~21:00’ (시작 시간이 없으면 끝도 안 보여요 · 달력 칸은 시작만)", zs);
      const ad5 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), app5 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), bd5 = fs.readFileSync(path.join(ROOT, "../ui/dg/Board.jsx"), "utf8"), hp5 = fs.readFileSync(path.join(ROOT, "../ui/dg/HomePage.jsx"), "utf8");
      ok(["pl-lt-", "pl-le-", "pl-lm-", "pl-lp-", "pl-lc-", "pl-wd-"].every((n) => ad5.indexOf('name="' + n) >= 0) && /name="ev-end"/.test(ad5) && /id="pl-end" name="pl-end"/.test(ad5) && /id="pl-place" name="pl-place"/.test(ad5) && /classOver: Object\.keys\(lec\)\.length \? lec : undefined/.test(ad5) && /F\("end", "끝나는 시간/.test(ad5),
        "기수 설계 창(마스터 · 강사센터): 메인 강사 강의 표(날짜 · 시작 · 끝 · 방식 · 장소 · 주제) · 기본 끝나는 시간 · 기본 장소 · 특별 일정 끝나는 시간 · 강사센터 일정 추가에도 끝나는 시간");
      const cs5 = fs.readFileSync(path.join(ROOT, "admin.css"), "utf8"), lay5 = (sel) => { const m = cs5.match(new RegExp("\\n\\" + sel + " \\{[^}]*grid-template-areas: ([^;]+);")); return m ? m[1] : ""; };
      ok(/\.pl-left \{[^}]*container-type: inline-size/.test(cs5) && /\.a-modal\.xl:has\(\.pl-form\) \{ max-width: 1180px; \}/.test(cs5) &&
        /"date date date"/.test(lay5(".pl-ev")) && /"time end end"/.test(lay5(".pl-ev")) && /"date date"/.test(lay5(".pl-lec")) && /"time end"/.test(lay5(".pl-lec")) &&
        /@media \(min-width: 721px\) \{ @container \(min-width: 610px\) \{ \.pl-ev \{[^}]*"type date time end del"/.test(cs5) && /@media \(min-width: 721px\) \{ @container \(min-width: 570px\) \{ \.pl-lec \{[^}]*"date time end mode"/.test(cs5) &&
        !/@media \(max-width: 720px\) \{[^@]*\.pl-ev \{/.test(cs5) && /placeholder="장소 또는 링크 \(선택\)"/.test(ad5),
        "기수 설계 창 칸 배치: 왼쪽 칸 폭(@container) 기준 — 휴대폰 · 좁은 칸은 날짜 한 줄 · 시작 · 끝 나란히, 한 줄 5칸(특별 일정) · 4칸(메인 강사 강의)은 PC 넓은 칸에서만 (날짜 · 시간 글자 안 잘리게)", { ev: lay5(".pl-ev"), lec: lay5(".pl-lec") });
      ok(/DB\.evTime\(e\) \? " · " \+ esc\(DB\.evTime\(e\)\)/.test(app5) && /DB\.evTime\(e\) \? " · " \+ DB\.evTime\(e\)/.test(bd5) && /class="ag-tm"/.test(app5) && /className="ag-tm"/.test(bd5) && /DB\.evTime\(e\) \? " " \+ DB\.evTime\(e\)/.test(hp5) && /DB\.isWeekLec\(e\)/.test(app5) && /DB\.isWeekLec\(e\)/.test(bd5),
        "수강생 화면(예전 · React 같이): 홈 다가오는 일정 · 일정 카드 · 이달 목록에 ‘13:30~18:30’ · 온라인 주차 강의도 과제 버튼");
      const pubC = AC.view("cohorts:moon", [{ id: "c4", name: "3기", classUrl: "https://zoom.us/j/x", classOver: { 3: { mode: "online", url: "https://zoom.us/j/y", topic: "자사몰" } } }], {});
      ok(pubC && pubC[0] && !pubC[0].classUrl && pubC[0].classOver && pubC[0].classOver[3].topic === "자사몰" && !pubC[0].classOver[3].url, "공개(로그인 전) 기수 정보: 입장 링크는 빼요 — 기수 칸 · 주차별 강의 둘 다", pubC);
    }
    // 일회성: 두잉고 LIVE 기수 정리 + 문대표 3기 메인 강사 강의 (2026-11-05)
    { const LV = {
        "cohorts:moon": [{ id: "c1", name: "1기", startDate: "2026-01-24", classDow: 6 }, { id: "c2", name: "2기", startDate: "2026-08-29", classDow: 6 }, { id: "c4", name: "3기", startDate: "2026-11-21", classDow: 6, weeks: 4, curriculumId: "cur-4w", classTime: "10:30" }, { id: "c9", name: "예전 3기", startDate: "2026-10-01" }],
        "cohorts:farmer": [{ id: "f1", name: "1기", startDate: "2026-10-01" }], "cohorts:choi": [{ id: "y1", name: "1기", startDate: "2026-10-01" }], "cohorts:hoon": [],
        "content:moon": { brand: {}, schedule: [{ id: "e-m3-bonus", type: "online", title: "문대표 - 5주차 온라인 강의", time: "19:00", url: "https://zoom.us/j/z", scope: "cohort", cohortId: "c4", date: "2026-12-15" }, { id: "e-m3-ch1", type: "challenge", title: "챌린지 1회차", time: "", scope: "cohort", cohortId: "c4", date: "2026-11-25" }] },
        "content:farmer": { brand: {}, schedule: [{ id: "fa", type: "qna", title: "f1 라이브", scope: "cohort", cohortId: "f1", date: "2026-10-05" }, { id: "fb", type: "qna", title: "모든 기수", scope: "all", week: 1, dow: 2 }] },
        "stu:moon:s9": { id: "s9", cohortId: "c9", name: "체험" }, "stu:farmer:vs1": { id: "vs1", cohortId: "vod:farmer", track: "vod" },
        "bill:choi:b1": { id: "b1", instructorId: "choi", cohortId: "y1" }, "bill:farmer:b2": { id: "b2", instructorId: "farmer", cohortId: "f1", canceledAt: 1 } };
      const lvGet = (k) => (LV[k] !== undefined ? JSON.parse(JSON.stringify(LV[k])) : undefined), lvKeys = (pre) => Object.keys(LV).filter((k) => k.indexOf(pre) === 0);
      w = OO.liveLectures(lvGet, lvKeys);
      const m3 = w.writes["cohorts:moon"].find((x) => x.id === "c4"), z5 = w.writes["content:moon"].schedule.find((e) => e.date === "2026-12-15");
      ok(w.writes["cohorts:farmer"] && !w.writes["cohorts:farmer"].length && w.writes["content:farmer"].schedule.map((e) => e.id).join() === "fb" && !w.writes["cohorts:choi"] && !w.writes["cohorts:hoon"] && w.writes["cohorts:moon"].length === 4 &&
        w.result.removed.join() === "farmer 1기 (f1)" && w.result.kept.length === 2 && w.result.kept.some((x) => /choi 1기.*이용료 1건/.test(x)) && w.result.kept.some((x) => /moon 예전 3기.*수강생 1명/.test(x)),
        "일회성(LIVE 기수 정리): 다른 강사 기수는 지우고 그 기수 일정도(모든 기수 반복 일정 · VOD 수강생은 그대로) · 수강생이나 이용료 기록(취소 안 한 것)이 있으면 남기고 적어요 · 문대표 1~3기는 그대로", w.result);
      ok(m3 && JSON.stringify(m3.classDates) === JSON.stringify({ 2: "2026-11-22" }) && m3.classOver[1].time === "13:30" && m3.classOver[1].end === "18:30" && m3.classOver[1].place === "3층" && m3.classOver[1].topic === "해외 건기식 OT" && m3.classOver[2].topic === "브랜딩" && m3.classOver[3].end === "13:00" && m3.classOver[3].topic === "자사몰" && m3.classOver[4].place === "2층" && m3.classOver[4].topic === "자동화" && m3.classTime === "10:30",
        "일회성(문대표 3기): 2주차만 11/22(일) (3 · 4주차는 매주 토요일 그대로) · 주차마다 시간 · 끝나는 시간 · 장소 · 주제", m3);
      ok(z5 && z5.id === "e-m3-bonus" && z5.type === "online" && z5.time === "19:00" && z5.end === "22:00" && z5.place === "ZOOM 라이브" && z5.title === "5주차 온라인 강의 — 광고의 모든것" && z5.url === "https://zoom.us/j/z" && w.writes["content:moon"].schedule.length === 2,
        "일회성(문대표 3기): 5주차 줌 강의 12/15 19:00~22:00 ZOOM 라이브 · 광고의 모든것 (있던 일정을 고쳐요 · 입장 링크 그대로)", z5);
      const ev3 = (() => { const sbx = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } }; sbx.window = sbx; require("vm").createContext(sbx); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => require("vm").runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sbx, { filename: f })); sbx.DB.load(); return sbx.DB.events("moon", Object.assign({ instructorId: "moon" }, m3)).filter((e) => sbx.DB.isWeekLec(e)).map((e) => e.date + " " + sbx.DB.evTime(e) + " " + e.place + " " + e.title); })();
      ok(ev3.join(" | ") === "2026-11-21 13:30~18:30 3층 1주차 오프라인 강의 — 해외 건기식 OT | 2026-11-22 09:00~13:30 3층 2주차 오프라인 강의 — 브랜딩 | 2026-12-05 09:00~13:00 3층 3주차 오프라인 강의 — 자사몰 | 2026-12-12 09:00~13:30 2층 4주차 오프라인 강의 — 자동화",
        "일회성(문대표 3기): 수강생 일정에 대표님이 주신 그대로 — 11/21 13:30~18:30 3층 · 11/22 09:00~13:30 3층 · 12/5 09:00~13:00 3층 · 12/12 09:00~13:30 2층", ev3);
      Object.keys(w.writes).forEach((k) => { LV[k] = w.writes[k]; });
      const w2 = OO.liveLectures(lvGet, lvKeys), m3b = w2.writes["cohorts:moon"].find((x) => x.id === "c4"), z5b = w2.writes["content:moon"].schedule.find((e) => e.date === "2026-12-15");
      ok(JSON.stringify(m3b) === JSON.stringify(m3) && JSON.stringify(z5b) === JSON.stringify(z5) && !w2.result.removed.length && w2.writes["content:moon"].schedule.length === 2 && OO.OPS.findIndex((x) => x.id === "2026-11-05-live-lectures") > OO.OPS.findIndex((x) => x.id === "2026-11-04-moon-cal-v2"),
        "일회성(LIVE 기수 정리 · 3기 강의): 다시 돌려도 같은 결과 · 캘린더 작업 뒤에 돌아요", w2.result);
    }
    // 정산: 체험 계정 주문(demo)은 정산에서 빼요 · 자동 로그아웃
    const ad24 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), mj24 = fs.readFileSync(path.join(ROOT, "main.js"), "utf8");
    ok(/const os = VD\(\)\.orders\.filter\(\(o\) => !o\.demo/.test(ad24) && /if \(o\.demo\) return;/.test(ad24), "정산: 체험 계정 0원 주문은 강사 정산 건수에 넣지 않아요");
    ok(/IDLE = \{ admin: 60 \* 60e3, student: 60 \* 60e3 \}/.test(mj24) && /action: "logout", which: "admin"/.test(mj24) && /post\("vod-auth", \{ action: "logout" \}\)/.test(mj24) && /\^#\\\/center/.test(mj24),
      "자동 로그아웃: 강사센터 60분 무동작(2026-11-09: 30분 → 60분) · 수강생/회원 60분 자리 비움 → 서버 쿠키까지 로그아웃 (강사센터 밖 탭은 새로 고치지 않아요)");
    ok(/if \(idleBusy \|\| unsaved\(\)\) return;/.test(mj24) && /document\.querySelector\("#modal-root form"\)/.test(mj24) && /typedForm && typedForm\.isConnected/.test(mj24) && /document\.addEventListener\("submit", \(\) => \{ typedForm = null; \}, true\);/.test(mj24) &&
      /student: stu && now - lseen > IDLE\.student && !watching\(\)/.test(mj24) && /if \(document\.visibilityState === "visible" \|\| watching\(\)\) lsSet\(K_SEEN, Date\.now\(\)\);/.test(mj24) && /const LECT = "\.video iframe, \.vt-stage iframe, \.vt-stage video/.test(mj24),
      "자동 로그아웃: 편집 창이 열려 있거나 칸에 적고 저장 전이면 미뤄요(작업이 날아가지 않게) · 강의 영상을 틀어 둔 동안은 창을 내려 두어도 수강생 · 회원 그대로");
    ok(/!\/\^#\\\/center\/\.test\(ROUTE\.hash\)/.test(mj24) && !/\.test\(location\.hash\)\) o\.admin = false/.test(mj24), "자동 로그아웃: 강사센터 화면인지는 ROUTE.hash 로 봐요 (운영의 깨끗한 주소 /center/… 에서도 켜 둔 화면이 60분 뒤 로그아웃)");
    const vj24 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), dbb = fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8");
    ok(/DB\.remote\.flush\(\)\)\.catch\(\(\) => \{\}\)\.then\(\(\) => authApi\("logout"\)\)/.test(vj24), "DOOGO CLASS 회원 로그아웃: 보내지 못한 기록을 먼저 보내고 로그아웃 (로그아웃 뒤에 보내면 서버가 거절)");
    ok(/DB_ROLE === "staging"/.test(dbb) && /__staging-db__/.test(dbb) && /process\.exit\(1\)/.test(dbb), "빌드: 시험용 미리보기(DB_ROLE=staging)는 시험용 표시가 있는 DB에서만 바꾸고, 표시 없는 DB면 멈춰요");
    // 문대표 전용 색(뉴질랜드)은 강사센터 · 코치센터에도
    const dbsrc = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), adsrc = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), css = fs.readFileSync(path.join(ROOT, "admin.css"), "utf8");
    ok(/nz: \{ label: "뉴질랜드", only: \["moon"\]/.test(dbsrc + fs.readFileSync(path.join(ROOT, "shared/data-rules.js"), "utf8")) && /dataset\.ath = master \? "" : athOf\(IID\(\)\)/.test(adsrc) && /body\[data-mode="admin"\]\[data-ath="nz"\] \{\s*--m-primary: #0b2a5b/.test(css) && /<script src="coach-perms\.js"><\/script>(\s*<script src="shared\/[a-z-]+\.js"><\/script>)*\s*<script src="db\.js">/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")),
      "문대표 강사센터 · 코치센터: 강의실 전용 색(뉴질랜드 네이비)으로 · 화면이 권한표(coach-perms.js)를 db.js 보다 먼저 읽어요");
    ok(deployIncludes().indexOf("coach-perms.js") >= 0, "배포 함수에 권한표(coach-perms.js)가 실려요");
    useJar({});
  }
  {
    console.log("23) 강사 영역: VOD 강사 · LIVE 강사 · 잠긴 탭 입점 신청 → 마스터가 열어 주기");
    const AC = require(path.join(TMP, "class/api/_lib/access.js")), st23 = require(path.join(TMP, "class/api/_lib/store.js"));
    // 화면(db.js): 열린 영역 · LIVE 강사 목록
    const vm = require("vm"), ls = new Map(), sb = { console, Date, Math, JSON, Intl, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k), key: () => null, length: 0 } };
    sb.window = sb; vm.createContext(sb); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f })); sb.DB.load();
    const T = sb.DB.tracksOf;
    ok(JSON.stringify(T({})) === '{"live":true,"vod":true}' && JSON.stringify(T({ tracks: { live: false, vod: true } })) === '{"live":false,"vod":true}' && JSON.stringify(T({ tracks: { live: true, vod: false } })) === '{"live":true,"vod":false}' && JSON.stringify(T(null)) === '{"live":true,"vod":true}',
      "열린 영역: 예전 강사(칸 없음)는 둘 다 · VOD 강사는 DOOGO CLASS만 · LIVE 강사는 두잉고만");
    sb.DB.data.instructors.push({ id: "t-vod", name: "브이", phone4: "1111", displayName: "VOD강사", status: "active", tracks: { live: false, vod: true } });
    ok(sb.DB.liveInstructors().every((x) => x.id !== "t-vod") && sb.DB.activeInstructors().some((x) => x.id === "t-vod") && /DB\.liveInstructors\(\)/.test(fs.readFileSync(path.join(ROOT, "app.js"), "utf8")) && /DB\.liveInstructors\(\)/.test(fs.readFileSync(path.join(ROOT, "home.js"), "utf8")),
      "수강생 로그인 강사 고르기 · 두잉고 첫 화면 강사진에는 LIVE 두잉고가 열린 강사만 (VOD 강사는 DOOGO CLASS 로만)");
    // 서버: 강사는 열린 영역 · 신청 중 표시를 못 바꾸고, 방문자 · 수강생에게는 연락처 · 정산 정보가 안 보여요
    const i0 = { id: "t1", status: "active", createdAt: 1, tracks: { live: false, vod: true }, trackReq: { live: { at: 5 } }, contact: { phone: "010-1", email: "a@b.c" }, vodSettle: { type: "biz", account: "1" }, phone4: "1234" };
    let o = AC.writer("ins:t1", { admin: { role: "instructor", iid: "t1" } }, false).fix(JSON.parse(JSON.stringify(i0)), Object.assign(JSON.parse(JSON.stringify(i0)), { tracks: { live: true, vod: true }, trackReq: {}, displayName: "새 이름" }));
    ok(o.tracks.live === false && o.trackReq.live.at === 5 && o.displayName === "새 이름", "강사가 보낸 계정: 열린 영역 · 신청 중 표시는 서버 값 그대로 (이름 등은 받아요)", o);
    o = AC.writer("ins:t1", { admin: { role: "master" } }, false).fix(JSON.parse(JSON.stringify(i0)), Object.assign(JSON.parse(JSON.stringify(i0)), { tracks: { live: true, vod: true } }));
    ok(o.tracks.live === true, "마스터는 열린 영역을 바꿀 수 있어요");
    const pv = AC.view("ins:t1", JSON.parse(JSON.stringify(i0)), {}), cv = AC.view("ins:t1", JSON.parse(JSON.stringify(i0)), { admin: { role: "coach", iid: "t1", perms: [] } });
    ok(!pv.contact && !pv.vodSettle && !pv.trackReq && !pv.phone4 && pv.tracks && !cv.contact && cv.trackReq, "방문자 · 수강생: 연락처 · 정산 계좌 · 신청 표시 없이 (열린 영역만) · 코치도 연락처는 안 받아요", pv);
    // 잠긴 탭 입점 신청 (/api/public track-apply)
    await st23.writeDoc("ins:t-live", { id: "t-live", name: "라이브", phone4: "2222", displayName: "LIVE강사", status: "active", tracks: { live: true, vod: false } }, null);
    await st23.writeDoc("ins:t-vod", { id: "t-vod", name: "브이", phone4: "1111", displayName: "VOD강사", status: "active", tracks: { live: false, vod: true }, coaches: [{ id: "c1", name: "코", phone4: "9999", status: "active", track: "vod", perms: ["teatime"] }] }, null);
    const ap = (want, extra) => call("public", { body: Object.assign({ action: "track-apply", want, name: "브이", phone: "010-1111-2222", email: "v@gmail.com", course: "오프라인 4주 실전반", agree: true }, extra || {}) });
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "t-vod" }) });
    r = await ap("live", { where: "오프라인", link: "blog.naver.com/x" });
    let inqs = (await st23.listDocs({ prefixes: ["inq:%"] })).map((x) => x.v).filter((q) => q && q.addTo === "t-vod");
    let iv = (await st23.getDoc("ins:t-vod")).v;
    ok(r.json.ok && inqs.length === 1 && inqs[0].want === "live" && inqs[0].status === "new" && !inqs[0].source && inqs[0].link === "https://blog.naver.com/x" && iv.trackReq && iv.trackReq.live && iv.trackReq.live.inq === inqs[0].id && iv.tracks.live === false,
      "VOD 강사가 두잉고(LIVE) 자물쇠로 신청 → 입점 문의(기존 강사 · LIVE 열기 신청) + 강사 계정에 ‘신청 중’ (아직 잠김)", { r: r.json, inqs, tr: iv.trackReq });
    r = await ap("live");
    ok(r.json.error === "dup", "같은 신청이 처리 중이면 또 받지 않아요", r.json);
    r = await ap("vod");
    ok(r.json.error === "open", "이미 열린 영역은 신청할 필요가 없어요", r.json);
    r = await ap("live", { agree: false });
    ok(r.status === 400, "개인정보 동의 없으면 받지 않아요", r.json);
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "t-live" }) });
    r = await ap("vod", { form: { nick: "라이브브랜드", topic: "구매대행 VOD", kinds: ["VOD 강의"], hack: "x" } });
    inqs = (await st23.listDocs({ prefixes: ["inq:%"] })).map((x) => x.v).filter((q) => q && q.addTo === "t-live");
    ok(r.json.ok && inqs.length === 1 && inqs[0].want === "vod" && inqs[0].source === "partners" && inqs[0].form.nick === "라이브브랜드" && !("hack" in inqs[0].form), "LIVE 강사가 DOOGO CLASS 자물쇠로 신청 → 두고 파트너스 지원서 칸으로 (모르는 칸은 버려요)", inqs[0]);
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    r = await ap("vod");
    ok(r.json.error === "open", "예전 강사(칸 없음)는 둘 다 열려 있어서 신청할 게 없어요", r.json);
    useJar({ dc_a: auth.sign({ r: "coach", iid: "t-vod", cid: "c1" }) });
    r = await ap("live");
    ok(r.status === 403, "코치는 입점 신청을 못 해요 (강사님만)", r.json);
    useJar({});
    r = await ap("live");
    ok(r.status === 403, "로그인 안 한 사람도 못 해요", r.json);
    // 마스터 화면 연결 · 문서
    const adsrc = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    ok(/case "inq-open-track"/.test(adsrc) && /function vodInsForm/.test(adsrc) && /tracks: \{ live: false, vod: true \}/.test(adsrc) && /tracks: \{ live: true, vod: false \}/.test(adsrc) && /inqIsVod\(x\)\) vodInsForm/.test(adsrc),
      "마스터: 두고 파트너스 지원 → VOD 강사 등록 창(DOOGO CLASS만) · 두잉고 문의 → LIVE 플랫폼(두잉고만) · 기존 강사 신청 → 열어 주기");
    // 입점 → 강사센터 계정 (2026-11-06): 카드의 계정 칸 · 지워진 계정이면 다시 등록 · 외부 클래스 연결 · 로그인 겹침 · LIVE 잠긴 강사의 기수 신청
    const minq = fs.readFileSync(path.join(ROOT, "../ui/center/MasterInq.jsx"), "utf8");
    ok(/function inqRegHtml\(x\)/.test(adsrc) && /<Isl html=\{A\.inqRegHtml\(x\)\} \/>/.test(minq) && /inqRegHtml\(x\) \+\n/.test(adsrc) && /inqTrack, inqRegHtml, inqAcc,/.test(adsrc) && !/!x\.iid && cur !== "fail"/.test(adsrc + minq) && /const inqAcc = \(x\) => \(x && x\.iid && !x\.addTo \? DB\.instructor\(x\.iid\) : null\)/.test(adsrc),
      "입점 카드: 강사센터 계정 칸(예전 화면 · React 같은 조각) — 계정이 정말 있을 때만 ‘등록 끝’, 지워졌으면 등록 버튼을 다시");
    ok(/st === "done" \? \(reg \? 5 : 3\)/.test(adsrc) && /!\(S && S\.role === "master"\)/.test(adsrc), "진행 칸: 계정이 있으면 5단계까지 모두 끝(채운 동그라미) · 파트너센터는 예전처럼 연결 표시로");
    ok(/function linkExt\(name, nid\)/.test(adsrc) && /v\.insOff = swap\(v\.insOff\)/.test(adsrc) && /v\.insRates\[nid\] = v\.insRates\[key\]/.test(adsrc) && /r\.k === "teach"/.test(adsrc) && /x\.key === key\) x\.key = nid/.test(adsrc) && /linkExt\(i\.value, nid\)/.test(adsrc) && /"ext-link-form": saveLinkExt/.test(adsrc),
      "스토어 클래스 연결(등록 창 · 계정 칸): 클래스 강사 + ext:이름으로 쓰던 노출 스위치 · 정산 비율 · 강사진 순서 · 지급 기록 키를 같이 옮겨요");
    ok(/const loginNorm = \(s\) => String\(s \|\| ""\)\.replace\(\/\\s\+\/g, ""\)/.test(adsrc) && /loginTaken\(name, phone4\)/.test(adsrc) && /loginTaken\(name, phone4, id\)/.test(adsrc) && /\(x\.coaches \|\| \[\]\)\.find\(\(y\) => loginNorm\(y\.name\) === n && y\.phone4 === phone4\)/.test(adsrc),
      "계정 만들 때 겹침 확인: 서버 로그인처럼 띄어쓰기를 빼고 강사 · 코치 모두 (VOD 등록 · LIVE 만들기 · 강사 수정)");
    const hsrc = fs.readFileSync(path.join(ROOT, "home.js"), "utf8"), vsrc = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8");
    ok(/const vodAcc = \(iid\) =>/.test(hsrc) && /!DB\.tracksOf\(ins\)\.live/.test(hsrc) && /\/\^ext:\/\.test\(s \|\| ""\) && !V\(\)\.products\.some\(\(p\) => tkey\(p\) === s\)/.test(vsrc),
      "클래스를 계정으로 옮겨도: 두잉고 첫 화면 VOD 강사 카드는 그대로 · 예전 강사 페이지 주소(ext:이름)도 그 강사로 열려요");
    await st23.writeDoc("cohorts:t-vod", [{ id: "cv1", instructorId: "t-vod", name: "1기", startDate: "2026-12-05", recruiting: true }], null);
    await st23.writeDoc("cohorts:t-live", [{ id: "cl1", instructorId: "t-live", name: "1기", startDate: "2026-12-05", recruiting: true }], null);
    useJar({});
    let su = await call("public", { body: { action: "signup", iid: "t-vod", cohortId: "cv1", name: "수강생", phone4: "4321" } });
    ok(su.json.error === "notfound", "두잉고(LIVE)가 잠긴 VOD 강사는 기수 수강 신청을 받지 않아요 (서버)", su.json);
    su = await call("public", { body: { action: "signup", iid: "t-live", cohortId: "cl1", name: "수강생", phone4: "4321" } });
    ok(su.json.ok === true, "LIVE 강사 기수 신청은 그대로 받아요", su.json);
    su = await call("auth", { body: { action: "admin", tab: "instructor", id: " 브 이 ", pw: "1111" } });
    ok(su.json.ok && su.json.role === "instructor" && su.json.iid === "t-vod", "VOD 강사: 이름(띄어쓰기 무시) + 전화번호 뒷자리로 강사센터 로그인", su.json);
    // 로그아웃 (2026-11-06): 어디서 로그아웃하든(스토어 · 두잉고 강의실 · 강사센터) which "all" 로 이 브라우저의 로그인을 모두 풀어요
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "t-vod" }), dc_s: auth.sign({ r: "student", iid: "t-live", sid: "x1" }), dc_v: auth.sign({ r: "vod", mid: "vm-x1" }) });
    su = await call("auth", { body: { action: "logout", which: "all" } });
    ok(su.json.ok && !jar.dc_a && !jar.dc_s && !jar.dc_v, "로그아웃 which all: 강사센터 · 두잉고 수강생 · DOOGO CLASS 회원 로그인이 모두 풀려요 (강의실 · 강사센터에서 로그아웃해도 스토어에 ‘체험회원님’이 남지 않게)", Object.keys(jar));
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "t-vod" }), dc_v: auth.sign({ r: "vod", mid: "vm-x1" }) });
    su = await call("auth", { body: { action: "logout", which: "admin" } });
    ok(su.json.ok && !jar.dc_a && !!jar.dc_v, "which admin 은 예전처럼 강사센터만 (자동 로그아웃 등)", Object.keys(jar));
    const lgs = ["app.js", "admin.js", "vod.js"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"));
    ok(/DB\.remote\.logout\("all"\)/.test(lgs[0]) && /DB\.remote\.logout\("all"\)/.test(lgs[1]) && /authApi\("logout"\)\)\.then\(\(\) => DB\.remote\.logout\("all"\)\)/.test(lgs[2]),
      "화면: 두잉고 강의실 · 강사센터 · 스토어 로그아웃 버튼이 모두 which all (React 화면도 같은 함수)");
    useJar({});
  }

  {
    console.log("24) 공용 모듈: 일정 계산 (Next.js 전환 2단계 · 화면 · 서버 같은 계산)");
    const SCH = require(path.join(ROOT, "shared/schedule.js")), DT = require(path.join(ROOT, "shared/dates.js"));
    // 문대표 2기: 8/29(토) 시작 · 5주차만 9/23(수)
    const c2 = { startDate: "2026-08-29", classDow: 6, classDates: { 5: "2026-09-23" } };
    ok(SCH.classDate(c2, 1) === "2026-08-29" && SCH.classDate(c2, 4) === "2026-09-19" && SCH.classDate(c2, 5) === "2026-09-23" && SCH.weekOpen(c2, 5) === "2026-09-23" && SCH.weekDeadline(c2, 5) === "2026-10-02" && SCH.cohortEnd(c2, 5) === "2026-10-02",
      "2기: 1주차 8/29(토) · 4주차 9/19 · 5주차 9/23(수)에 열림 · 마감 10/2 · 기수 끝 10/2", [SCH.classDate(c2, 5), SCH.weekOpen(c2, 5), SCH.weekDeadline(c2, 5), SCH.cohortEnd(c2, 5)]);
    ok(SCH.currentWeek(c2, 5, "2026-09-22") === 4 && SCH.currentWeek(c2, 5, "2026-09-23") === 5 && SCH.currentWeek(c2, 5, "2026-08-28") === 0 && SCH.cohortStatus(c2, 5, "2026-08-28") === "upcoming" && SCH.cohortStatus(c2, 5, "2026-10-02") === "running" && SCH.cohortStatus(c2, 5, "2026-10-03") === "ended",
      "이번 주차: 9/22 4주차 → 9/23(앞당긴 5주차 강의일) 5주차 · 시작 전 0 · 상태 모집 중 → 진행 중 → 10/3 종료");
    ok(SCH.classDate({ startDate: "2026-11-21" }, 2) === "2026-11-28" && SCH.baseClassDate({ startDate: "2026-11-18", classDow: "" }, 1) === "2026-11-18" && SCH.classDate({ startDate: "2026-11-18", classDow: 6 }, 1) === "2026-11-21" && SCH.dateOver({ startDate: "2026-11-21", classDates: { 2: "bad" } }, 2) === null && SCH.weekDow({ startDate: "2026-11-21" }, 2, 3) === "2026-12-02",
      "요일을 안 정하면 주차 시작일 · 정하면 그 주의 그 요일 · 이상한 날짜는 무시 · 모든 기수 일정 ‘2주차 수요일’ = 12/2");
    ok(DT.addDays("2026-12-31", 1) === "2027-01-01" && DT.diffDays("2026-03-01", "2026-02-28") === 1 && DT.addDays("2024-02-28", 1) === "2024-02-29", "날짜 더하기 · 빼기 (해 넘김 · 윤년)");
    // 브라우저처럼 <script> 로 읽어도 같은 함수 (window.DCS.schedule) · db.js 는 계산을 따로 갖지 않고 공용 모듈을 써요
    const vm24 = require("vm"), sbx = {}; sbx.window = sbx; vm24.createContext(sbx); ["shared/dates.js", "shared/schedule.js"].forEach((f) => vm24.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sbx, { filename: f }));
    ok(sbx.DCS && sbx.DCS.schedule && sbx.DCS.schedule.classDate(c2, 5) === "2026-09-23" && sbx.DCS.dates.addDays("2026-12-31", 1) === "2027-01-01", "브라우저(<script>)로 읽어도 같은 계산 (window.DCS)");
    const dbsrc24 = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), idx24 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    ok(!/const weekOpen = \(co, no\) =>|function baseClassDate|const dateOver =|function parseDate\(/.test(dbsrc24) && /SCH\.cohortEnd\(co, cohortWeeks\(co\)\)/.test(dbsrc24) && /<script src="shared\/dates\.js"><\/script>(\s*<script src="shared\/[a-z-]+\.js"><\/script>)*\s*<script src="db\.js">/.test(idx24) && idx24.indexOf("shared/schedule.js") < idx24.indexOf('src="db.js"'),
      "db.js 는 일정 계산을 공용 모듈에 맡기고 · 화면은 공용 모듈을 db.js 보다 먼저 읽어요");
    const sd24 = require(path.join(TMP, "class/api/_lib/seed.js"));
    ok(sd24.CLIENT_FILES.join() === "data.js" && deployIncludes().indexOf("shared/*.js") >= 0 && Object.keys(sd24.seedDocs()).length > 10,
      "서버(처음 데이터 · 정리)는 처음 데이터 파일(data.js)만 읽고 규칙은 공용 모듈 · 배포 함수에 shared/ 가 실려요");
  }

  {
    console.log("25) 공용 모듈: 가격 계산 하나로 (화면 vod.js · 서버 vodprice.js 가 같은 규칙 · Next.js 전환 2단계)");
    const PR = require(path.join(ROOT, "shared/price.js")), VP25 = require(path.join(TMP, "class/api/_lib/vodprice.js"));
    const now25 = Date.parse("2026-11-18T12:00:00+09:00");
    const cat25 = { products: [
      { id: "fl", type: "live", status: "on", price: 0, eventAt: "2026-11-17T19:30", eventMin: 90, next: "v1", ebPrice: 199000, ebDays: 3 },
      { id: "v1", type: "vod", status: "on", price: 330000, sale: 249000, dg: true, plans: { 180: {}, 365: { price: 290000 } } },
      { id: "bk", type: "book", status: "on", price: 17600, sale: 15900, shipFee: 3000 }
    ], settings: { coach: { n: 5, days: 180, price: 150000 }, rebuy: { pct: 40 } }, biz: { flive: true } };
    const X25 = VP25.pricer(cat25, now25), v1 = X25.product("v1");
    // 무료 LIVE(11/17 19:30 · 90분) 끝 → 3일 얼리버드: 199,000원 · 12개월은 정한 값 × (얼리버드 / 할인가) 비율 (천 원 단위)
    ok(X25.priceOf(v1) === 199000 && X25.plansOf(v1).map((x) => x.d + ":" + x.sale).join(",") === "180:199000,365:232000" && X25.basePrice(v1) === 249000,
      "서버: 무료 LIVE 끝나고 얼리버드 199,000원 · 6개월 199,000 · 12개월 232,000 (290,000 × 199/249)", X25.plansOf(v1));
    ok(X25.coachOf(v1).price === 150000 && X25.coachOf(v1).n === 5 && X25.shipOf(X25.product("bk")) === 3000 && X25.couponOff({ kind: "pct", value: 10 }, X25.product("bk"), 15900) === 0 && X25.couponOff({ kind: "pct", value: 10, max: 15000 }, v1, 199000) === 15000 && VP25.rbPrice(290000, 40) === 174000,
      "1:1 코칭권 · 종이책 배송비 · 종이책은 쿠폰 안 씀 · 쿠폰 최대 할인 · 재수강 40% 할인가 (100원 아래 버림)");
    const later = VP25.pricer(cat25, Date.parse("2026-11-21T00:00:01+09:00"));
    ok(later.priceOf(later.product("v1")) === 249000, "얼리버드 마지막 날(11/20) 밤 12시가 지나면 할인가 249,000원으로", later.priceOf(later.product("v1")));
    // 화면 쪽(vod.js)도 같은 공용 모듈로 계산해요 — 같은 값 · 같은 시각이면 같은 금액
    const D25 = require(path.join(ROOT, "shared/dates.js"));
    const K = 9 * 3600e3, kd = (ms) => new Date(ms + K).toISOString().slice(0, 10);
    const C25 = PR.make({ products: () => cat25.products, settings: () => cat25.settings, biz: () => cat25.biz, now: () => now25, today: () => kd(now25), time: (s) => Date.parse(String(s).length <= 16 ? s + ":00+09:00" : s) || 0, dayOf: kd, addDays: (d, n) => kd(Date.parse(d + "T00:00:00+09:00") + n * 864e5), endOfDay: (d) => Date.parse(d + "T23:59:59+09:00"), dgOpen: (p) => !!p.dg });
    ok(JSON.stringify(C25.plansOf(cat25.products[1]).map((x) => [x.d, x.sale, x.list])) === JSON.stringify(X25.plansOf(v1).map((x) => [x.d, x.sale, x.list])) && C25.priceOf(cat25.products[1]) === X25.priceOf(v1) && typeof D25.addDays === "function",
      "화면 계산(공용 모듈) = 서버 계산 (한국 시간 기준)");
    const vsrc25 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), psrc25 = fs.readFileSync(path.join(ROOT, "api/_lib/vodprice.js"), "utf8"), idx25 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    ok(/window\.DCS\.price\.make\(/.test(vsrc25) && /function plansOf\(p\) \{ return PRC\(\)\.plansOf\(p\); \}/.test(vsrc25) && !/PLAN_DAYS\.map\(/.test(vsrc25) && /require\("\.\.\/\.\.\/shared\/price"\)/.test(psrc25) && !/PLAN_DAYS\.map\(/.test(psrc25) && /<script src="shared\/price\.js"><\/script>[\s\S]*<script src="main\.js">/.test(idx25) && !/<script src="vod\.js">/.test(idx25) /* vod.js 는 main.js 가 영역에 맞게 받아요 — index.html 의 공용 모듈 다음 (4단계 화면 나눠 받기) */,
      "가격 규칙은 한 곳(shared/price.js): 화면 · 서버 모두 그 모듈을 쓰고 따로 계산하지 않아요 · 화면은 vod.js 보다 먼저 읽어요 (index.html 공용 모듈 → main.js 가 영역 파일)");
    // 한국 시간 날짜 (2026-11-05): 화면도 서버와 같은 한국 날짜 · 시각으로 계산 — 뉴질랜드(한국보다 4시간 빠름) 브라우저에서 할인 마감일 · 얼리버드 마지막 날 밤에도 화면 금액 = 서버 금액
    const nzOut = require("child_process").spawnSync(process.execPath, ["-e", `
      const PR = require(${JSON.stringify(path.join(ROOT, "shared/price.js"))}), VP = require(${JSON.stringify(path.join(TMP, "class/api/_lib/vodprice.js"))}), K = PR.KST;
      const now = Date.parse("2026-11-20T20:30:00+09:00"); // 한국 11/20 20:30 = 뉴질랜드 11/21 00:30
      const cat = { products: [
        { id: "fl", type: "live", status: "on", price: 0, eventAt: "2026-11-17T19:30", eventMin: 90, next: "v1", ebPrice: 199000, ebDays: 3 },
        { id: "v1", type: "vod", status: "on", price: 330000, sale: 249000, plans: { 180: {}, 365: { price: 290000 } } },
        { id: "s1", type: "vod", status: "on", price: 200000, sale: 150000, saleEnd: "2026-11-20", plans: { 180: {}, 365: {} } }
      ], settings: {}, biz: { flive: true } };
      const pad = (n) => String(n).padStart(2, "0"), loc = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      const mk = (c) => PR.make(Object.assign({ products: () => cat.products, settings: () => cat.settings, biz: () => cat.biz, now: () => now, dgOpen: () => false }, c));
      const client = mk({ today: () => K.day(now), time: K.time, dayOf: K.day, addDays: K.addDays, endOfDay: K.endOfDay }); // 지금 vod.js
      const old = mk({ today: () => loc(new Date(now)), time: (s) => new Date(s).getTime() || 0, dayOf: (ms) => loc(new Date(ms)), addDays: (d, n) => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return loc(x); }, endOfDay: (d) => new Date(d + "T23:59:59").getTime() }); // 예전 vod.js (이 기기 시간대)
      const srv = VP.pricer(cat, now), pl = (X, p) => X.plansOf(p).map((x) => x.d + ":" + x.sale).join(",");
      console.log(JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone, local: loc(new Date(now)), srv: ["v1", "s1"].map((id) => pl(srv, srv.product(id))), client: ["v1", "s1"].map((id) => pl(client, cat.products.find((p) => p.id === id))), old: ["v1", "s1"].map((id) => pl(old, cat.products.find((p) => p.id === id))) }));
    `], { env: { PATH: process.env.PATH, TZ: "Pacific/Auckland" }, encoding: "utf8" });
    let nz25 = {}; try { nz25 = JSON.parse(nzOut.stdout.trim()); } catch (e) { nz25 = { err: nzOut.stderr || nzOut.stdout }; }
    ok(nz25.local === "2026-11-21" && JSON.stringify(nz25.client) === JSON.stringify(nz25.srv) && /180:150000/.test(nz25.srv[1]) && /180:199000/.test(nz25.srv[0]) && JSON.stringify(nz25.old) !== JSON.stringify(nz25.srv)
      && /window\.DCS\.price\.KST/.test(vsrc25) && /time: \(s\) => KSTD\(\)\.time\(s\), dayOf: \(ms\) => KSTD\(\)\.day\(ms\)/.test(vsrc25) && /today = \(\) => KSTD\(\)\.today\(\)/.test(vsrc25) && /PR\.KST\.day/.test(psrc25),
      "결제 날짜는 한국 시간: 뉴질랜드 브라우저(이미 11/21)에서도 할인 마감일(11/20) 할인가 · 얼리버드 마지막 날 가격이 서버와 같아요 (예전 기기 시간대 계산은 달라서 ‘가격이 방금 바뀌었어요’로 막혔어요)", nz25);
  }

  {
    console.log("26) 공용 모듈: 정산 계산 (화면 vod.js · admin.js · 서버 media.js 가 같은 규칙 · Next.js 전환 2단계)");
    const ST = require(path.join(ROOT, "shared/settle.js")), MD26 = require(path.join(TMP, "class/api/_lib/media.js"));
    // 1,000만 원 판매 · RS 없음 · 강사 50% → 정산 기준액 · 정산액 (2026-11-15 결제분부터 정산 공제 결제 수수료 고정 7.5% · 실제 PG 수수료는 매출 리포트용)
    const o1 = { amount: 10000000, sale: 10000000, method: "card", kind: "course" };
    ok(ST.pgFeeOf({}, o1) === 330000 && ST.pgFeeOf({ card: { pct: 2.5 } }, o1) === 250000 && ST.pgFeeOf({}, { amount: 9900, method: "vbank" }) === 300 && ST.pgFeeOf({}, { amount: 9900, method: "point" }) === 0,
      "실제 PG 수수료(매출 리포트 · 플랫폼 이익용): 카드 3.3% · 마스터가 정한 2.5% · 가상계좌 건당 300원 · 포인트 결제 0원");
    const o1old = Object.assign({}, o1, { paidAt: Date.parse("2026-11-10T10:00:00+09:00") }), o1new = Object.assign({}, o1, { paidAt: Date.parse("2026-11-15T00:00:00+09:00") });
    ok(ST.SETTLE_FEE_DEF === 7.5 && ST.settleFeeOf({}, o1) === 750000 && ST.insBase({}, o1) === 9250000 && ST.insAmt({}, o1, 50) === 4625000 && ST.insBase({}, o1new) === 9250000 &&
      ST.insBase({}, o1old) === 9670000 && ST.insBase({ settleFee: 5 }, o1new) === 9500000 && ST.insBase({ settleFee: 99 }, o1new) === 9250000 &&
      ST.settleFeeOf({}, { amount: 330000, sale: 330000, method: "bank" }) === 24750 && ST.settleFeeOf({}, { amount: 9900, method: "point" }) === 0 && ST.settleFeeOf({}, { amount: 0, method: "free" }) === 0,
      "정산 공제 결제 수수료: 고객 결제액의 7.5%(결제수단 상관없이 · 무통장도) → 1,000만 원이면 75만 원 빼고 × 50% = 462.5만 원 · 2026-11-15 전 결제분은 예전처럼 실제 PG 수수료 · 마스터가 정한 5% · 범위 밖 값은 기본값 · 포인트 · 무료 0원");
    const o2 = { amount: 330000, sale: 330000, method: "bank", kind: "course", rs: { pg: 5, rate: 20 } };
    ok(ST.rsOf(o2) === 62700 && ST.insBase({}, o2) === 242550 && ST.rsOf(Object.assign({}, o2, { kind: "coach" })) === 0 && ST.rsOf({ amount: 500000, sale: 500000, kind: "course", rs: { pg: 7.5, rate: 20 } }) === 92500,
      "온드미디어 RS = 그때 비율 그대로(330,000 × 95% × 20% = 62,700원) · 새 기준 500,000 × 92.5% × 20% = 92,500원 · RS · 결제 수수료 7.5%를 먼저 빼고 · 코칭권은 RS 없음");
    const b = ST.payout(2500000, true, "std", 0), pp = ST.payout(2500000, false, "std", 0);
    ok(b.pay === 2500000 && b.invIns === 2500000 && pp.sup === 2272727 && pp.wh === 74990 && pp.pay === 2197737 && ST.payout(-1000, false, "std", 0).pay === 0,
      "지급액: 사업자 250만 원 그대로(세금계산서 250만 원) · 개인 250만 ÷ 1.1 = 2,272,727 − 3.3% 74,990(10원 아래 버림) → 2,197,737원 · 마이너스면 0원", [b, pp]);
    ok(ST.keepOf({ status: "refunded", amount: 100000, refundAmount: 30000 }) === 0.7 && ST.keepOf({ status: "paid" }) === 1 && ST.refundRatio({ amount: 100000, refundAmount: 30000 }) === 0.3,
      "부분 환불: 정산에 70% 남김 · 확정 뒤 환불은 30% 차감");
    ok(MD26.rateOf({ subs: 120000 }, MD26.rules({})) === 20 && MD26.rateOf({ subs: 5000 }, MD26.rules({})) === 10 && MD26.rateOf({ rate: 15 }, MD26.rules({})) === 15 && MD26.codeOf("Doo-Go_MD!") === "doogomd" && MD26.rules({ vod: { settings: { rs: { pg: 50 } } } }).pg === 7.5 && MD26.rules({}).pg === 7.5,
      "서버 RS 규칙(공용 모듈): 구독자 10만 이상 20% · 미만 10% · 직접 정한 15% · 링크 코드 정리 · PG 공제 기본 7.5% · 범위 밖 값은 기본값");
    {
      const OF = require(path.join(TMP, "class/api/_lib/oneoff.js"));
      const mk = (rs) => ({ meta: { ver: 1, vod: { settings: rs === undefined ? {} : { rs } } } }), run = (d) => OF.pgFee75((k) => d[k]);
      const a = run(mk({ lo: 10, hi: 20, subs: 100000, days: 30, pg: 5 })), b = run(mk({ pg: 6 })), c = run(mk(undefined));
      ok(a.writes.meta && a.writes.meta.vod.settings.rs.pg === 7.5 && a.writes.meta.vod.settings.rs.days === 30 && !Object.keys(b.writes).length && !Object.keys(c.writes).length && OF.OPS.some((x) => x.id === "2026-11-15-pg-fee-75"),
        "일회성 작업: RS 기준 PG 공제가 예전 기본값 5%면 7.5%로 · 마스터가 정한 6%나 저장 안 된 값은 그대로", [a.result, b.result, c.result]);
    }
    const vs26 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), as26 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ms26 = fs.readFileSync(path.join(ROOT, "api/_lib/media.js"), "utf8"), ix26 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    ok(/const ST = window\.DCS\.settle;/.test(vs26) && !/Math\.floor\(insBase\(o\) \* shareVal/.test(vs26) && /window\.DCS\.settle\.payout\(net, biz, mode, base0\)/.test(as26) && !/Math\.floor\(sup \* 0\.033/.test(as26) && /require\("\.\.\/\.\.\/shared\/settle"\)/.test(ms26) && /<script src="shared\/settle\.js"><\/script>[\s\S]*<script src="main\.js">/.test(ix26) && !/<script src="(vod|admin)\.js">/.test(ix26),
      "정산 규칙은 한 곳(shared/settle.js): 화면 · 강사 정산 명세서 · 서버 RS 모두 그 모듈을 써요");
  }

  {
    console.log("27) 공용 모듈: 처음 데이터 · 데이터 정리 (서버가 화면 파일 db.js 를 돌리지 않아요 · Next.js 전환 2단계)");
    const DR = require(path.join(ROOT, "shared/data-rules.js")), sd27 = require(path.join(TMP, "class/api/_lib/seed.js"));
    const seedSrc = fs.readFileSync(path.join(ROOT, "api/_lib/seed.js"), "utf8"), dbSrc = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), idx27 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    ok(typeof DR.make === "function" && typeof window === "undefined" && !/"db\.js"/.test(seedSrc) && /require\("\.\.\/\.\.\/shared\/data-rules"\)/.test(seedSrc) && deployIncludes().indexOf("db.js") < 0,
      "서버는 db.js 없이 공용 모듈(require)로 처음 데이터 · 정리 — 배포 함수에 db.js 를 싣지 않아요");
    ok(!/function loadFixups\(\)|const THEMES = \{|function template\(brand\)|function menuConfig\(insId\)/.test(dbSrc) && /window\.DCS\.data\.make\(/.test(dbSrc) && /return DR\.loadLocal\(store\.get\(KEY_DB, null\)\)/.test(dbSrc) && /<script src="shared\/dates\.js"><\/script>\s*<script src="shared\/data-rules\.js"><\/script>[\s\S]*<script src="db\.js">/.test(idx27),
      "db.js 는 규칙을 갖지 않고 공용 모듈을 써요 (불러오기 순서도 공용 loadLocal) · 화면은 db.js 보다 먼저 읽어요");
    // 처음 데이터: 강사 · 콘텐츠 · 기수 · 수강생 · 진도 문서 — 정리를 돌려도 바뀌는 것 없음
    const sd = sd27.seedDocs(), docs = Object.keys(sd).map((k) => ({ k, v: sd[k] }));
    ok(sd.meta && sd.meta.version === 3 && sd["ins:moon"] && sd["content:moon"] && Object.keys(sd).some((k) => /^stu:moon:/.test(k)) && Object.keys(sd).some((k) => /^prog:/.test(k)) && !Object.keys(sd27.migrateDocs(docs)).length,
      "처음 데이터 → 정리해도 바뀌는 것 없음", Object.keys(sd).slice(0, 8));
    // 한 번만 하는 정리: 표시(flag)가 없으면 다시 돌아 표시를 남겨요 · 없어진 색은 라임으로
    const d2 = JSON.parse(JSON.stringify(docs)); const m2 = d2.find((x) => x.k === "meta"); delete m2.v.flags.nzTheme; const cm = d2.find((x) => x.k === "content:moon"); cm.v.brand.theme = "clickhouse";
    const ch = sd27.migrateDocs(d2);
    ok(ch.meta && ch.meta.flags.nzTheme === true && ch["content:moon"] === undefined, "표시가 빠진 정리는 다시 돌아 표시를 남기고 · 이미 있는 값(색)은 바꾸지 않아요 (빠진 칸만 채움)", Object.keys(ch));
    let threw = ""; try { sd27.migrateDocs([{ k: "meta", v: { version: 2 } }]); } catch (e) { threw = e.message; }
    ok(/데이터 형식이 예상과 달라/.test(threw), "데이터 모양이 다르면 정리를 건너뛰어요 (예전과 같음)");
  }

  {
    console.log("28) 공유 미리보기 정보: 클래스 상세 · 강사 소개 · 무료강의 (카카오톡 공유 · 검색 — Next.js 전환 3단계)");
    const PM = require(path.join(TMP, "class/api/_lib/pagemeta.js"));
    const html = require(path.join(ROOT, "scripts/index-abs.js"))(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"));
    const now28 = Date.parse("2026-11-04T12:00:00+09:00");
    const vod = { insOff: ["moon"], settings: {}, biz: {}, products: [
      { id: "a1", type: "vod", status: "on", title: "AI 굿즈 <만들기> & \"판매\"", sub: "그림 실력 없이 AI로", hook: "0원 시작", creator: "유나", iid: "choi", price: 150000, sale: 139000, thumb: "assets/vod/a1.jpg", learn: ["캐릭터 만들기", "<b>인쇄</b>"], who: ["부업 준비생"], pitch: "길게 쓴 소개" },
      { id: "m1", type: "vod", status: "on", title: "숨긴 강사 강의", iid: "moon", price: 99000 },
      { id: "m2", type: "book", status: "on", title: "숨긴 강사 책 (보여요)", iid: "moon", showOff: true, price: 15900, cover: "assets/vod/book/c.webp" },
      { id: "x1", type: "vod", status: "off", title: "판매 끝", iid: "choi", price: 1000 },
      { id: "s1", type: "vod", status: "soon", title: "오픈 예정 강의", iid: "choi", price: 50000, thumb: "idb:abc" }
    ] };
    const h1 = PM.vodDetail(html, vod, "a1", now28);
    ok(h1 && /<title>AI 굿즈 &lt;만들기&gt; &amp; &quot;판매&quot; \| DOOGO CLASS — 돈 되는 클래스<\/title>/.test(h1) && /<meta property="og:url" content="https:\/\/www\.doogoclass\.com\/vod\/p\/a1" \/>/.test(h1) && /<link rel="canonical" href="https:\/\/www\.doogoclass\.com\/vod\/p\/a1" \/>/.test(h1) && /<meta property="og:image" content="https:\/\/www\.doogoclass\.com\/assets\/vod\/a1\.jpg" \/>/.test(h1) && !/og:image:width/.test(h1),
      "보이는 클래스: 제목(글자 이스케이프) · 주소 · 클래스 사진(전체 주소 · 기본 사진 크기 칸은 빼요)");
    ok(/<meta name="description" content="그림 실력 없이 AI로 · 0원 시작 — 유나" \/>/.test(h1) && /"@type":"AggregateOffer","lowPrice":139000,"highPrice":153000,"priceCurrency":"KRW"/.test(h1) && /<h1>AI 굿즈 &lt;만들기&gt;/.test(h1) && /<li>&lt;b&gt;인쇄&lt;\/b&gt;<\/li>/.test(h1) && !/<\/script><script>/.test(h1) && (h1.match(/application\/ld\+json/g) || []).length === 2,
      "설명 · 가격(결제와 같은 규칙: 6개월 139,000 ~ 12개월 153,000) · 로봇용 안내 글(이스케이프) · 구조화 데이터 추가");
    const app1 = h1.slice(h1.indexOf("<body>")), app0 = html.slice(html.indexOf("<body>"));
    ok(app1.replace(/<div class="seo-static">[\s\S]*?<\/main>/, "") === app0.replace(/<div class="seo-static">[\s\S]*?<\/main>/, "") && (h1.match(/<script src=/g) || []).length === (html.match(/<script src=/g) || []).length,
      "화면 쪽(스크립트 · 화면 틀)은 예전 index.html 과 똑같아요 — 미리보기 정보 · 로봇용 글만 달라요");
    const hb = PM.vodDetail(html, vod, "m2", now28, { "assets/vod/book/c.webp": "assets/vod/book/c.og.jpg" }), hs = PM.vodDetail(html, vod, "s1", now28), hbw = PM.vodDetail(html, vod, "m2", now28, {});
    ok(PM.vodDetail(html, vod, "m1", now28) === null && PM.vodDetail(html, vod, "x1", now28) === null && PM.vodDetail(html, vod, "zz", now28) === null && PM.vodDetail(html, null, "a1", now28) === null,
      "숨긴 강사 · 판매 끝 · 없는 클래스 · 데이터 없음 → 예전 index.html 그대로");
    ok(hb && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/vod\/book\/c\.og\.jpg"/.test(hb) && /"@type":"Offer","price":15900/.test(hb) && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/home\/og-doogoclass\.jpg/.test(hbw) && hs && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/home\/og-doogoclass\.jpg/.test(hs) && !/"offers"/.test(hs) && /오픈 예정/.test(hs),
      "숨긴 강사라도 따로 보이게 한 책(webp 표지 → 빌드 때 만든 JPG · 없으면 기본 사진 · 15,900원) · 오픈 예정(브라우저에만 있는 사진 → 기본 사진 · 가격 없음)");
    const M0 = { "assets/a.webp": "assets/a.og.jpg" };
    ok(PM.imageOf("http://x.com/a.png", M0) === "" && PM.imageOf("//x.com/a.png", M0) === "" && PM.imageOf("https://cdn.x.com/a.png?v=1", M0) === "https://cdn.x.com/a.png?v=1" && PM.imageOf("https://cdn.x.com/a.webp", M0) === "" && PM.imageOf("/assets/a.webp", M0) === "https://www.doogoclass.com/assets/a.og.jpg" && PM.imageOf("assets/b.webp", M0) === "" && PM.imageOf("assets/c.png?v=2", M0) === "https://www.doogoclass.com/assets/c.png?v=2" && PM.imageOf("data:image/png;base64,xx", M0) === "",
      "공유 사진: JPG · PNG · GIF 만 (카카오톡이 webp 를 못 읽어요) · https 만 · 사이트 안 파일은 전체 주소 · webp 는 빌드 때 만든 JPG 로, 없으면 기본 사진");
    ok(PM.joinUniq(["0원에서 시작 · 문대표 첫 책", "문대표 첫 책"], " · ") === "0원에서 시작 · 문대표 첫 책" && PM.joinUniq(["짧은 말", "짧은 말이 들어간 긴 문장"], " · ") === "짧은 말이 들어간 긴 문장" && PM.joinUniq(["가", "", "나"], " · ") === "가 · 나" && PM.whenTxt("2026-11-17T19:30") === "11월 17일 (화) 19:30" && PM.whenTxt("bad") === "",
      "설명에 같은 말이 두 번 들어가지 않아요 · 무료강의 일시 글자 (11월 17일 (화) 19:30)");
    // 강사 소개 /p/<강사> · 무료강의 /free/<강사> — 처음 데이터(문대표)로
    const SD28 = require(path.join(TMP, "class/api/_lib/seed.js")).seedDocs(), ins28 = SD28["ins:moon"], c28 = JSON.parse(JSON.stringify(SD28["content:moon"]));
    c28.brand.photo = "assets/home/moon-profile.webp";
    c28.freeClass = Object.assign({}, c28.freeClass, { published: true, liveAt: "2026-11-17T19:30", hero: Object.assign({}, (c28.freeClass || {}).hero, { title: "마진 50%\n내 브랜드 <만들기>", instructor: "문대표", sub: "무료 LIVE" }), live: Object.assign({}, (c28.freeClass || {}).live, { image: "assets/landing/moon-thumb-1117.jpg" }) });
    const MP = { "assets/home/moon-profile.webp": "assets/home/moon-profile.og.jpg" };
    const hl = PM.landingPage(html, ins28, c28, MP), hf = PM.freePage(html, ins28, c28, MP);
    ok(hl && hl.indexOf("<title>" + c28.brand.courseTitle.replace(/&/g, "&amp;") + " · " + c28.brand.name + "</title>") >= 0 && /<meta property="og:url" content="https:\/\/www\.doogoclass\.com\/p\/moon" \/>/.test(hl) && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/home\/moon-profile\.og\.jpg"/.test(hl) && hl.indexOf("<h1>" + c28.brand.courseTitle) >= 0,
      "강사 소개 /p/moon: 화면과 같은 제목(강의 이름 · 브랜드) · 주소 · 강사 사진(webp → JPG) · 로봇용 소개 글");
    ok(hf && /<title>마진 50% 내 브랜드 &lt;만들기&gt; · 문대표 무료강의<\/title>/.test(hf) && /og:description" content="11월 17일 \(화\) 19:30 무료 LIVE/.test(hf) && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/landing\/moon-thumb-1117\.jpg"/.test(hf) && /"@type":"Event"[^<]*"startDate":"2026-11-17T19:30:00\+09:00"/.test(hf) && /og:url" content="https:\/\/www\.doogoclass\.com\/free\/moon"/.test(hf),
      "무료강의 /free/moon: 화면과 같은 제목 · 일시(11/17 (화) 19:30) · 포스터 사진 · 일정 구조화 데이터(한국 시간)");
    const cOff = JSON.parse(JSON.stringify(c28)); cOff.landing = Object.assign({}, cOff.landing, { published: false }); cOff.freeClass.published = false;
    ok(PM.landingPage(html, ins28, cOff, MP) === null && PM.freePage(html, ins28, cOff, MP) === null && PM.landingPage(html, Object.assign({}, ins28, { status: "paused" }), c28, MP) === null && PM.freePage(html, null, c28, MP) === null && PM.landingPage(html, ins28, null, MP) === null,
      "비공개 페이지 · 이용 중지 강사 · 없는 강사 → 예전 index.html 그대로");
    const hl0 = hl.slice(hl.indexOf("<body>")).replace(/<div class="seo-static">[\s\S]*?<\/main>/, ""), h00 = html.slice(html.indexOf("<body>")).replace(/<div class="seo-static">[\s\S]*?<\/main>/, "");
    ok(hl0 === h00 && hf.slice(hf.indexOf("<body>")).replace(/<div class="seo-static">[\s\S]*?<\/main>/, "") === h00 && !/phone4|"pw|contact/.test(hl.slice(0, hl.indexOf("<body>")) + hf.slice(0, hf.indexOf("<body>"))),
      "화면 쪽은 예전과 똑같고 · 미리보기 정보에 강사 연락처 · 뒷자리 같은 비공개 값이 없어요");
    process.env.DC_SSR_OFF = "vod-detail, landing free";
    const offs = [await PM.render("/vod/p/a1", html), await PM.render("/p/moon", html), await PM.render("/free/moon", html)];
    delete process.env.DC_SSR_OFF;
    ok(offs.every((x) => x === html) && (await PM.render("/vod/c/all", html)) === html && (await PM.render("/vod/p/%E0%A4%A", html)) === html && (await PM.render("/p/../x", html)) === html && (await PM.render("/free/a%2Fb", html)) === html && PM.SWITCHES.slice(0, 3).join() === "vod-detail,landing,free",
      "끄기(DC_SSR_OFF=vod-detail · landing · free) · 다른 주소 · 이상한 주소 → 예전 index.html 그대로");
    const rt = fs.readFileSync(path.join(ROOT, "..", "nextlib/page-route.js"), "utf8"), ds = fs.readFileSync(path.join(ROOT, "scripts/dev-server.js"), "utf8"), nc28 = fs.readFileSync(path.join(ROOT, "..", "next.config.js"), "utf8"), st28 = fs.readFileSync(path.join(ROOT, "scripts/site.js"), "utf8");
    const routes28 = ["vod/p", "p", "free"].map((d) => fs.readFileSync(path.join(ROOT, "..", "app", d, "[id]", "route.js"), "utf8"));
    ok(/legacyLib\("api\/_lib\/pagemeta\.js"\)\.render\(url\.pathname, tpl\)/.test(rt) && /s-maxage=60/.test(rt) && /fetch\(new URL\("\/index\.html", url\)\)/.test(rt) && routes28.every((r) => /export const GET = pageGET;/.test(r) && /force-dynamic/.test(r)) && /pagemeta"\)\.render\(u\.pathname/.test(ds) && /\(vod\\\/p\|p\|free\)/.test(ds) && /"\/": PAGE/.test(nc28) && /\.\/public\/og-images\.json/.test(nc28) && /og-images\.json/.test(st28),
      "배포(Next.js app/vod/p · app/p · app/free) · 로컬 개발 서버 모두 같은 규칙 · 1분 캐시 · 오류면 정적 index.html · 배포 함수에 index.html · 공유 사진 목록");
  }

  {
    console.log("29) 스토어 홈 · 두잉고 소개 · 약관 · 사이트맵 (검색 · 공유 — Next.js 전환 3단계)");
    // 배포 함수에는 약관 글 · 고정 주소 목록도 같이 들어가요 (next.config.js PAGE) — 시험 복사본에도 똑같이
    fs.cpSync(path.join(ROOT, "legal.js"), path.join(TMP, "class/legal.js")); fs.cpSync(path.join(ROOT, "sitemap.xml"), path.join(TMP, "class/sitemap.xml"));
    const PM = require(path.join(TMP, "class/api/_lib/pagemeta.js"));
    const html = require(path.join(ROOT, "scripts/index-abs.js"))(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"));
    const T0 = html.match(/<title>([^<]*)<\/title>/)[1], noMain = (h) => h.slice(h.indexOf("<body>")).replace(/<div class="seo-static">[\s\S]*?<\/main>/, ""), app0 = noMain(html);
    const vod = { insOff: ["moon"], products: [
      { id: "a1", type: "vod", status: "on", title: "AI 굿즈 <만들기>", creator: "유나", iid: "choi" },
      { id: "m1", type: "vod", status: "on", title: "숨긴 강사 강의", iid: "moon" },
      { id: "m2", type: "book", status: "on", title: "숨긴 강사 책 (보여요)", iid: "moon", showOff: true },
      { id: "s1", type: "zz", status: "soon", title: "오픈 예정", iid: "choi" },
      { id: "x1", type: "vod", status: "off", title: "판매 끝", iid: "choi" }
    ] };
    // 스토어 홈: 제목 · 설명 · 대표 주소 · 사진은 그대로, 로봇용 글 끝에 보이는 클래스 목록
    const hh = PM.storeHome(html, vod);
    const links29 = (hh.match(/<li><a href="https:\/\/www\.doogoclass\.com\/vod\/p\/([^"]+)">/g) || []).map((x) => x.replace(/.*\/vod\/p\/|">$/g, ""));
    ok(hh && hh.slice(0, hh.indexOf("<body>")) === html.slice(0, html.indexOf("<body>")) && links29.join() === "a1,m2,s1" && hh.indexOf("AI 굿즈 &lt;만들기&gt;</a> · VOD 클래스 · 유나") >= 0 && hh.indexOf("오픈 예정</a> · VOD 클래스 · 오픈 예정") >= 0 && hh.indexOf(html.slice(html.indexOf('<div class="seo-static">'), html.indexOf("</main>")).trim().slice(0, 400)) >= 0,
      "스토어 홈 /: <head>(제목 · 설명 · 사진) 그대로 · 예전 안내 글 뒤에 보이는 클래스만(숨긴 강사 · 판매 끝 빼고 · 따로 보이게 한 책 · 오픈 예정) 링크 · 글자 이스케이프");
    ok(noMain(hh) === app0 && PM.storeHome(html, { products: [vod.products[4]] }) === null && PM.storeHome(html, null) === null,
      "화면 쪽은 예전과 똑같아요 · 보일 클래스가 없으면 예전 index.html 그대로");
    // 두잉고 소개: 화면(home.js)과 같은 제목 · 두잉고 소개 배너(1200×630 jpg — 크기 칸 유지) · 대표 주소
    const hd = PM.doinggoPage(html), dgT = (fs.readFileSync(path.join(ROOT, "home.js"), "utf8").match(/document\.title = "([^"]+)"; \/\/ index\.html/) || [])[1];
    // 화면 쪽 비교: 첫 로딩 로고만 두잉고 것으로 바뀌어요 (2026-11-22 · 69번에서 따로 봐요)
    const dgBoot = (h) => h.replace(/<img class="boot-logo boot-logo-dg"[^>]*>/, (html.match(/<img class="boot-logo boot-logo-dc"[^>]*>/) || [""])[0]);
    ok(dgT && hd.indexOf("<title>" + dgT + "</title>") >= 0 && /<link rel="canonical" href="https:\/\/www\.doogoclass\.com\/doinggo" \/>/.test(hd) && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/home\/og-doinggo\.jpg\?v=\d{8}"/.test(hd) && /og:image:width" content="1200"/.test(hd) && fs.existsSync(path.join(ROOT, "assets/home/og-doinggo.jpg")) && dgBoot(noMain(hd)) === app0 && /<h1>강의는 강사님이, 운영은 두잉고가<\/h1>/.test(hd),
      "두잉고 소개 /doinggo: 화면과 같은 제목 · 대표 주소 /doinggo(예전엔 / 로 겹침) · 두잉고 소개 배너 · 로봇용 소개 글 · 화면 쪽 그대로");
    // 약관: 화면(vod.js LEGAL_TABS)과 같은 이름 · 제목 · 주소 · 시행일 · 목차 — 마스터 설정으로 바뀌는 표 · 분석 도구 목록 자리는 넣지 않아요
    const vj29 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), tabs = (vj29.match(/const LEGAL_TABS = (\[\[[^;]+\]\]);/) || [])[1], L29 = PM.legalText();
    const tabOk = tabs && JSON.parse(tabs).every((x) => PM.LEGAL[x[0]] === x[1]) && Object.keys(PM.LEGAL).length === 3 && /\[1\] \+ " \| 두고클래스 DOOGO CLASS"\)/.test(vj29);
    const lp = ["terms", "privacy", "refund"].map((k) => [k, PM.legalPage(html, k, L29)]);
    ok(tabOk && lp.every(([k, h]) => h && h.indexOf("<title>" + PM.LEGAL[k] + " | 두고클래스 DOOGO CLASS</title>") >= 0 && h.indexOf('<link rel="canonical" href="https://www.doogoclass.com/' + k + '" />') >= 0 && h.indexOf('<meta property="og:url" content="https://www.doogoclass.com/' + k + '" />') >= 0 && noMain(h) === app0),
      "약관 /terms · /privacy · /refund: 화면과 같은 이름 · 제목 · 탭마다 대표 주소(예전엔 / 로 겹침) · 화면 쪽 그대로");
    const heads29 = (k) => L29[k][1].split("\n").filter((x) => x.indexOf("## ") === 0).length, body29 = (h) => h.slice(h.indexOf("<main>"), h.indexOf("</main>"));
    ok(lp.every(([k, h]) => (body29(h).match(/<li>/g) || []).length === heads29(k) && body29(h).indexOf("[[") < 0 && body29(h).indexOf("━") < 0) && /<p>시행일: 2026년 10월 29일<\/p>/.test(lp[2][1]) && /환불정책 — 7일 청약철회/.test(lp[2][1]),
      "약관 목차 = 글의 소제목 전부(개정 안내 기간에는 지금 글 · 개정 글 순서 그대로) · 시행일 · 바뀌는 표 · 분석 도구 자리(\[\[…\]\])는 없어요");
    const Lx = { terms: ["이용약관", "## 제1조 (목적)\n이 약관은 …"], privacy: ["개인정보처리방침", ""] };
    ok(/<h2>목차<\/h2><ul><li>제1조 \(목적\)<\/li><\/ul>/.test(PM.legalPage(html, "terms", Lx)) && PM.legalPage(html, "privacy", Lx) === null && PM.legalPage(html, "refund", Lx) === null && PM.legalPage(html, "oss", L29) === null,
      "약관 글이 비었거나 없는 탭 · 다른 이름(oss) → 예전 index.html 그대로");
    // 주소 → 규칙 (끝 빗금 하나 · 아래 주소는 예전 그대로) · 끄기 스위치
    const r29 = {};
    for (const u of ["/doinggo", "/doinggo/", "/terms", "/privacy/", "/refund", "/doinggo/guide", "/terms/x", "/vod/legal/terms", "/termsx"]) r29[u] = await PM.render(u, html);
    ok(r29["/doinggo"] === hd && r29["/doinggo/"] === hd && r29["/terms"] === lp[0][1] && r29["/privacy/"] === lp[1][1] && r29["/refund"] === lp[2][1] && ["/doinggo/guide", "/terms/x", "/vod/legal/terms", "/termsx"].every((u) => r29[u] === html),
      "주소 → 규칙: /doinggo · /terms · /privacy · /refund (끝 빗금 하나 같은 주소) · 사용법 영상 /doinggo/guide · 다른 주소는 예전 그대로");
    process.env.DC_SSR_OFF = "store-home doinggo,legal";
    const off29 = [await PM.render("/", html), await PM.render("/doinggo", html), await PM.render("/terms", html)];
    delete process.env.DC_SSR_OFF;
    const home29 = await PM.render("/", html);
    ok(off29.every((x) => x === html) && typeof home29 === "string" && home29.slice(0, home29.indexOf("<body>")) === html.slice(0, html.indexOf("<body>")) && PM.SWITCHES.join() === "vod-detail,landing,free,store-home,doinggo,legal,sitemap",
      "끄기(DC_SSR_OFF=store-home · doinggo · legal) → 예전 index.html 그대로 · 스토어 홈 / 는 DB 에서 읽어도 <head> 는 그대로");
    // 사이트맵: 고정 주소 + 보이는 클래스 · 공개한 강사 소개 · 무료강의 (화면과 같은 기준)
    const SD29 = require(path.join(TMP, "class/api/_lib/seed.js")).seedDocs(), base29 = PM.sitemapBase();
    const ins29 = Object.keys(SD29).filter((k) => k.indexOf("ins:") === 0).map((k) => SD29[k]), cs29 = {};
    Object.keys(SD29).filter((k) => k.indexOf("content:") === 0).forEach((k) => { cs29[k.slice(8)] = JSON.parse(JSON.stringify(SD29[k])); });
    const one29 = ins29[0].id, two29 = ins29[1].id;
    cs29[one29].landing = Object.assign({}, cs29[one29].landing, { published: true }); cs29[one29].freeClass = Object.assign({}, cs29[one29].freeClass, { published: false });
    cs29[two29].landing = Object.assign({}, cs29[two29].landing, { published: true });
    const ins29b = ins29.map((x) => (x.id === two29 ? Object.assign({}, x, { status: "paused" }) : x)).concat([{ id: "bad/id", status: "active" }, { id: "nocontent", status: "active" }]);
    const sm = PM.sitemapXml(base29, vod, ins29b, cs29), locs = (sm.match(/<loc>[^<]*<\/loc>/g) || []).map((x) => x.slice(5, -6));
    const baseLocs = (base29.match(/<loc>[^<]*<\/loc>/g) || []).map((x) => x.slice(5, -6));
    ok(baseLocs.length >= 5 && baseLocs.every((u) => locs.indexOf(u) >= 0) && ["a1", "m2", "s1"].every((id) => locs.indexOf("https://www.doogoclass.com/vod/p/" + id) >= 0) && ["m1", "x1"].every((id) => locs.indexOf("https://www.doogoclass.com/vod/p/" + id) < 0) && new Set(locs).size === locs.length && /^<\?xml[\s\S]*<\/urlset>\n$/.test(sm),
      "사이트맵: 고정 주소 그대로 + 보이는 클래스만(숨긴 강사 · 판매 끝 빼고) · 같은 주소 한 번 · 올바른 모양");
    ok(locs.indexOf("https://www.doogoclass.com/p/" + one29) >= 0 && locs.indexOf("https://www.doogoclass.com/free/" + one29) < 0 && locs.indexOf("https://www.doogoclass.com/p/" + two29) < 0 && !locs.some((u) => /bad|nocontent/.test(u)) && PM.sitemapXml(base29, null, [], {}) === base29,
      "사이트맵: 공개한 강사 소개만 · 비공개 무료강의 · 이용 중지 강사 · 이상한 아이디 · 내용 없는 강사는 빼요 · 더할 게 없으면 고정 목록 그대로");
    process.env.DC_SSR_OFF = "sitemap";
    const smOff = await PM.sitemap();
    delete process.env.DC_SSR_OFF;
    const smDb = await PM.sitemap();
    ok(smOff === base29 && smDb.indexOf(base29.replace(/\s*<\/urlset>\s*$/, "")) === 0 && /<\/urlset>\n?$/.test(smDb),
      "사이트맵 끄기(DC_SSR_OFF=sitemap) → 고정 목록 · DB 에서 읽어도 고정 주소가 맨 앞에 그대로");
    // 배포: app/ 주소 파일 · 함수에 들어가는 파일 · 빌드 때 public/ 으로 사이트맵을 복사하지 않기 · 로컬 개발 서버도 같은 규칙
    const rd = (f) => fs.readFileSync(path.join(ROOT, "..", f), "utf8");
    const pages29 = ["app/route.js", "app/doinggo/route.js", "app/terms/route.js", "app/privacy/route.js", "app/refund/route.js"].map(rd), smr = rd("app/sitemap.xml/route.js"), rt29 = rd("nextlib/page-route.js"), nc29 = rd("next.config.js"), st29 = fs.readFileSync(path.join(ROOT, "scripts/site.js"), "utf8"), ds29 = fs.readFileSync(path.join(ROOT, "scripts/dev-server.js"), "utf8");
    ok(pages29.every((r) => /export const GET = pageGET;/.test(r) && /force-dynamic/.test(r)) && /export const GET = sitemapGET;/.test(smr) && /legacyLib\("api\/_lib\/pagemeta\.js"\)\.sitemap\(\)/.test(rt29) && /s-maxage=3600/.test(rt29) && /"class\/legal\.js", "class\/sitemap\.xml"/.test(nc29) && /"\/": PAGE/.test(nc29) && /SKIP\.add\("sitemap\.xml"\)/.test(st29) && /\(doinggo\|terms\|privacy\|refund\)\?\\\/\?\$/.test(ds29) && /pagemeta"\)\.sitemap\(\)/.test(ds29),
      "배포(app/route.js 스토어 홈 · app/doinggo · 약관 3개 · app/sitemap.xml) · 함수에 약관 글 · 고정 주소 목록 · public/ 에는 사이트맵 복사 안 함 · 로컬 개발 서버도 같은 규칙");
  }

  {
    console.log("30) 로그인 보안: 공개 문서에 강사 로그인 이름 없음 · 하루 기준 잠금 · 처음 데이터 숫자 표시 (Next.js 전환 4단계)");
    ["dc_a", "dc_s", "dc_v"].forEach((k) => delete jar[k]);
    const st30 = require(path.join(TMP, "class/api/_lib/store.js")), SD30 = require(path.join(TMP, "class/api/_lib/seed.js")).seedDocs();
    const seedMoon = SD30["ins:moon"], norm30 = require(path.join(TMP, "class/api/_lib/auth.js")).norm;
    let r30 = await call("bootstrap", { method: "GET" });
    const pubMoon = ((r30.json.docs || []).find((d) => d[0] === "ins:moon") || [])[1] || {};
    const pubAll = (r30.json.docs || []).filter((d) => /^ins:/.test(d[0])).map((d) => d[1] || {});
    ok(pubMoon.id === "moon" && pubMoon.name === pubMoon.displayName && pubMoon.name !== seedMoon.name && pubAll.length >= 2 && pubAll.every((x) => x.name === (x.displayName || "") && !("phone4" in x) && !("coaches" in x)),
      "방문자 공개 문서: 강사 로그인 이름 대신 수강생에게 보이는 이름 · 뒷자리 · 코치 목록 없음 (모든 강사)");
    jar.dc_a = auth.sign({ r: "instructor", iid: "moon" });
    r30 = await call("bootstrap", { method: "GET" });
    const ownMoon = ((r30.json.docs || []).find((d) => d[0] === "ins:moon") || [])[1] || {};
    delete jar.dc_a;
    ok(ownMoon.name === seedMoon.name && ownMoon.phone4 === seedMoon.phone4, "그 강사 본인(강사센터)은 예전처럼 로그인 이름 · 뒷자리를 그대로 봐요");
    // 하루 기준 잠금: 15분 잠금(8번)을 풀어 가며 · 다른 주소(IP)에서 30번 틀리면 맞는 숫자도 막혀요
    const nk = "adm:" + norm30(seedMoon.name), wrong = seedMoon.phone4 === "0000" ? "1111" : "0000", ipH = (i) => ({ "x-forwarded-for": "10.30.0." + i });
    await st30.rlClear([nk, "day:" + nk]);
    for (let i = 0; i < 30; i++) { if (i % 7 === 0) await st30.rlClear([nk]); await call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: wrong }, headers: ipH(i) }); }
    await st30.rlClear([nk]);
    const rDay = await call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: seedMoon.phone4 }, headers: ipH(99) });
    ok(rDay.status === 429 && rDay.json.error === "locked-day" && !jar.dc_a, "하루 30번 틀리면 15분 잠금이 풀려도 맞는 숫자까지 막아요 (locked-day)", rDay.json);
    const r29 = await (async () => { await st30.rlClear([nk, "day:" + nk]); for (let i = 0; i < 29; i++) { if (i % 7 === 0) await st30.rlClear([nk]); await call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: wrong }, headers: ipH(100 + i) }); } await st30.rlClear([nk]); return call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: seedMoon.phone4 }, headers: ipH(200) }); })();
    const dayLeft = (await st30.exec("SELECT n FROM rl WHERE k = ?", ["day:" + nk])).rows.length;
    delete jar.dc_a;
    ok(r29.json.ok && r29.json.role === "instructor" && dayLeft === 0, "29번까지는 맞는 숫자로 들어가고 · 들어가면 하루 기록도 지워요", { r: r29.json, dayLeft });
    // 15분 잠금 메시지는 예전 그대로 · 마스터는 하루 기준에서 빼요
    process.env.MASTER_PASSWORD = "Test-master9@";
    await st30.rlClear(["master", "day:master"]);
    for (let i = 0; i < 30; i++) { if (i % 7 === 0) await st30.rlClear(["master"]); await call("auth", { body: { action: "admin", tab: "master", id: "doogobiz", pw: "wrong-" + i }, headers: ipH(150 + i % 50) }); }
    const mDay = (await st30.exec("SELECT n FROM rl WHERE k = ?", ["day:master"])).rows.length;
    await st30.rlClear(["master"]);
    const rM = await call("auth", { body: { action: "admin", tab: "master", id: "doogobiz", pw: process.env.MASTER_PASSWORD }, headers: ipH(250) });
    delete jar.dc_a; delete process.env.MASTER_PASSWORD;
    for (let i = 0; i < 8; i++) await call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: wrong }, headers: ipH(240) });
    const r15 = await call("auth", { body: { action: "admin", tab: "instructor", id: seedMoon.name, pw: seedMoon.phone4 }, headers: ipH(241) });
    await st30.rlClear([nk, "day:" + nk]);
    ok(mDay === 0 && rM.json.ok && rM.json.role === "master" && r15.status === 429 && r15.json.error === "locked", "마스터는 하루 기준 잠금 없음(주인이 못 들어오는 일 막기) · 15분 잠금(8번)은 예전 그대로", { mDay, rM: rM.json, r15: r15.json });
    // 두잉고 수강생(이름 + 뒷자리)도 같은 하루 기준
    const stu30 = Object.keys(SD30).filter((k) => k.indexOf("stu:") === 0).map((k) => SD30[k]).find((x) => x && x.instructorId && x.status === "approved");
    const sk = "stu:" + stu30.instructorId + ":" + norm30(stu30.name), sw = stu30.phone4 === "0000" ? "1111" : "0000";
    await st30.rlClear([sk, "day:" + sk]);
    for (let i = 0; i < 30; i++) { if (i % 7 === 0) await st30.rlClear([sk]); await call("auth", { body: { action: "student", iid: stu30.instructorId, name: stu30.name, phone4: sw }, headers: ipH(i) }); }
    await st30.rlClear([sk]);
    const rS = await call("auth", { body: { action: "student", iid: stu30.instructorId, name: stu30.name, phone4: stu30.phone4 }, headers: ipH(77) });
    await st30.rlClear([sk, "day:" + sk]); delete jar.dc_s;
    ok(rS.status === 429 && rS.json.error === "locked-day", "두잉고 수강생 로그인도 하루 30번까지", rS.json);
    // 화면: 하루 잠금 안내 문구 (마스터 강사 목록의 ‘처음 데이터 숫자 그대로’ 빨간 표시는 2026-11-06 운영자 요청으로 뺐어요)
    const app30 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), adm30 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    ok(/"locked-day": "오늘 여러 번 틀려서/.test(app30) && /"locked-day": "오늘 여러 번 틀려서/.test(adm30), "화면: 하루 잠금 안내(수강생 · 강사센터)");
  }

  {
    console.log("31) 화면 나눠 받기: 영역별 화면 파일 · 예전과 같은 영역 규칙 · 늘 받는 파일 (Next.js 전환 4단계 4-3)");
    const idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), areasSrc = fs.readFileSync(path.join(ROOT, "areas.js"), "utf8"), mainSrc = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), appSrc = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
    // areas.js 를 가짜 브라우저에서 읽어요 (index.html 에 있는 CSS · 스크립트만 있는 상태)
    const fakeDoc = (links, scripts) => ({ currentScript: { src: "https://www.doogoclass.com/areas.js?v=abc123" }, documentElement: { getAttribute: () => null }, head: { appendChild() {} }, body: null,
      querySelectorAll: (sel) => (/link/.test(sel) ? links.map((h) => ({ getAttribute: () => h })) : scripts.map((h) => ({ getAttribute: () => h }))), createElement: () => ({ addEventListener() {} }) });
    const sb31 = { document: fakeDoc(["/styles.css?v=abc123", "/home.css?v=abc123", "/vod.css?v=abc123"], ["/route.js?v=abc123", "/main.js?v=abc123"]), location: { hash: "", pathname: "/", search: "", href: "https://www.doogoclass.com/" }, localStorage: { getItem: () => null }, URL, setTimeout, clearTimeout, Promise };
    sb31.window = sb31;
    require("vm").runInNewContext(areasSrc, sb31, { filename: "areas.js" });
    const A = sb31.DC_AREA;
    // 예전 main.js 의 영역 고르기와 똑같은지 (여러 주소)
    const oldOf = (h) => { const isRoot = (x) => x === "" || x === "#" || x === "#/", isDg = (x) => /^#\/(doinggo|partner)(\/|\?|$)/.test(x); return /^#\/center/.test(h) ? "admin" : isRoot(h) || /^#\/(vod|terms|privacy|refund)(\/|\?|$)/.test(h) ? "vod" : /^#\/(p|free)(\/|\?|$)/.test(h) ? "landing" : isDg(h) ? "home" : "student"; };
    const hs = ["", "#", "#/", "#/vod", "#/vod/p/v5", "#/vod?x=1", "#/vodclass", "#/terms", "#/privacy?a", "#/refund/x", "#/termsx", "#/center", "#/center/master/vod", "#/centerx", "#/p/moon", "#/free/moon?rs=1", "#/pp", "#/doinggo", "#/doinggo/guide", "#/partner", "#/login", "#/login?tab=vod", "#/home", "#/missions/1", "#/library", "#/about", "#/x"];
    ok(hs.every((h) => A.of(h) === oldOf(h)) && Object.keys(A.NEED).sort().join() === "admin,home,landing,student,vod",
      "영역 규칙이 예전 main.js 와 같아요 (" + hs.length + "개 주소) · 영역 5개");
    ok(A.NEED.vod.js.join() === "vod.js,app.js" && A.NEED.student.js.join() === "vod.js,app.js" && A.NEED.admin.js.join() === "vod.js,admin.js" && A.NEED.admin.css.join() === "admin.css" && A.NEED.landing.js.join() === "landing.js" && A.NEED.landing.css.join() === "landing.css,doogo-free.css" && A.NEED.home.js.join() === "vod.js,guide-data.js,guide.js,home.js" && A.NEED.home.css.join() === "guide.css",
      "영역별 파일: 스토어 · 강의실 vod + app / 강사센터 vod + admin(+css) / 강사 소개 landing(+css 2) / 두잉고 소개 vod + 사용법 + home(+css)");
    ok(A.ready("vod") === false && A.ready("landing") === false && A.off() === false && A.guess() === "vod",
      "처음에는 영역 파일이 없어요(받아야 그려요) · 대표 주소 / 는 스토어 영역 · 끄기 꺼짐");
    // 예전 순서 그대로 (스크립트 · CSS)
    const oldJs = ["vod.js", "app.js", "admin.js", "landing.js", "guide-data.js", "guide.js", "home.js"], oldCss = ["styles.css", "admin.css", "landing.css", "doogo-free.css", "home.css", "vod.css", "guide.css"];
    ok(A.JS_ORDER.join() === oldJs.join() && A.CSS_ORDER.join() === oldCss.join() && Object.keys(A.NEED).every((k) => A.NEED[k].js.every((f) => oldJs.indexOf(f) >= 0) && A.NEED[k].css.every((f) => oldCss.indexOf(f) >= 0)),
      "스크립트 · CSS 순서는 예전 index.html 순서 그대로 (먼저 받은 파일이 먼저 실행 · CSS 는 예전 자리에)");
    // index.html: 늘 받는 파일만 · areas.js 는 <head> · main.js 맨 끝
    const sc = (idx.match(/<script src="([^"]+)"/g) || []).map((x) => x.slice(13, -1)), ln = (idx.match(/<link rel="stylesheet" href="([^"]+)"/g) || []).map((x) => x.slice(29, -1));
    ok(oldJs.every((f) => sc.indexOf(f) < 0) && sc[0] === "areas.js" && sc[sc.length - 1] === "main.js" && ["route.js", "db.js", "icons.js", "legal.js", "shared/price.js"].every((f) => sc.indexOf(f) > 0) && ln.filter((h) => !/^https?:/.test(h) && !/fonts/.test(h)).join() === "styles.css,home.css,vod.css" && idx.indexOf('<script src="areas.js"></script>') < idx.indexOf("</head>"),
      "index.html: 늘 받는 파일(주소 · 데이터 · 공용 규칙 · 아이콘 · 약관 · main.js + styles · home · vod CSS)만 · 영역 파일은 areas.js 가 (<head>)");
    // main.js: 영역 규칙은 areas.js · 영역을 옮기면 새로 불러요 · 아래 탭 표시는 늘 받는 main.js 에 (강사센터에는 app.js 가 없어서)
    ok(/next: window\.DC_AREA\.of\(h\)/.test(mainSrc) && /if \(!window\.DC_AREA\.ready\(next\)\) \{ moveArea\(next\); return; \}/.test(mainSrc) && /window\.DC_AREA\.ensure\(pick\(\)\.next\)/.test(mainSrc) && /location\.reload\(\)/.test(mainSrc) && /function mark\(\)/.test(mainSrc) && !/function mark\(\)/.test(appSrc) && /!leaving && window\.__dirty/.test(mainSrc),
      "main.js: 영역 규칙은 areas.js 한 곳 · 처음 파일 받기와 서버 연결을 같이 · 다른 영역이면 저장을 마치고 새로 불러요(같은 주소 되풀이 막기) · 아래 탭 표시는 main.js 로");
    const st31 = fs.readFileSync(path.join(ROOT, "scripts/site.js"), "utf8");
    ok(/DC_SPLIT_OFF === "1"/.test(st31) && /data-split="off"/.test(st31) && /data-split"\) === "off"/.test(areasSrc) && /dc:split/.test(areasSrc),
      "끄기: Vercel 환경 변수 DC_SPLIT_OFF=1 → <html data-split=\"off\"> → 예전처럼 모든 파일 (이 브라우저만: localStorage dc:split)");
  }

  {
    console.log("32) 토스페이먼츠 연결 확인 (배포 빌드 기록 · 결제 시험 환경)");
    const TS = require(path.join(TMP, "class/api/_lib/toss.js"));
    const keep = { c: process.env.TOSS_CLIENT_KEY, s: process.env.TOSS_SECRET_KEY };
    const c1 = await TS.check();
    process.env.TOSS_SECRET_KEY = "test_sk_wrong";
    const c2 = await TS.check();
    process.env.TOSS_SECRET_KEY = "live_gsk_x";
    const c4 = await TS.check();
    delete process.env.TOSS_SECRET_KEY;
    const c3 = await TS.check();
    process.env.TOSS_CLIENT_KEY = keep.c; process.env.TOSS_SECRET_KEY = keep.s;
    const bsrc = fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8");
    ok(c1.ok === true && c1.mode === "window" && c1.test === true && c1.pair === "" && c1.methods.indexOf("card") >= 0 && c2.ok === false && c2.why === "unauthorized" && c4.pair === "mismatch" && c3.why === "off" && !JSON.stringify([c1, c2, c3, c4]).includes("test_sk_dctest") && /require\("\.\.\/api\/_lib\/toss"\)\.check\(\)/.test(bsrc) && /빌드는 멈추지 않아요/.test(bsrc),
      "맞는 시크릿 키 → 없는 결제 조회가 404라 연결 확인 · 틀린 키 → 인증 실패 · 키 짝이 안 맞음(ck ↔ gsk · test ↔ live) 알림 · 키 없음 → off · 키 값은 결과에 없어요 · 배포 빌드가 기록만 해요(멈추지 않음)", [c1, c2, c3, c4]);
    // 키 종류에 따라 결제 화면이 저절로: ck(API 개별 연동) → 우리 화면에서 수단 고르기 · gck(결제창형) → 토스 창 한 칸(tp) · 운영 사이트에 시험 키 → 결제 승인 안 함
    process.env.TOSS_CLIENT_KEY = "test_gck_x"; process.env.TOSS_SECRET_KEY = "test_gsk_x";
    const w = { mode: TS.mode(), methods: TS.methods().join() };
    process.env.VERCEL_ENV = "production";
    const lv = TS.testOnLive();
    process.env.TOSS_SECRET_KEY = "live_gsk_x";
    const lv2 = TS.testOnLive();
    delete process.env.VERCEL_ENV; process.env.TOSS_CLIENT_KEY = keep.c; process.env.TOSS_SECRET_KEY = keep.s;
    ok(w.mode === "widget" && w.methods === "tp" && lv === true && lv2 === false && TS.mode() === "window", "gck 키 → 결제창형(토스 창에서 고르기 · 결제수단 tp 한 칸) · 운영 사이트(production)에 시험 키면 승인 막기 · 라이브 키면 정상", { w, lv, lv2 });
    // 시크릿 키 · 결제 키는 로그 · 오류 화면에 남기지 않아요 — 오류에는 토스 code · message 만
    const tsrc = fs.readFileSync(path.join(ROOT, "api/_lib/toss.js"), "utf8");
    ok(/Buffer\.from\(sk\(\) \+ ":"\)\.toString\("base64"\)/.test(tsrc) && !/console\.(log|error)\([^)]*sk\(\)/.test(tsrc) && /AbortSignal\.timeout/.test(tsrc), "토스 API: Basic 인증(시크릿 키 + 콜론) · 시크릿 키를 로그에 안 남겨요 · 15초 넘으면 끊어요");
  }

  {
    console.log("33) 결제 대조: 주문 ↔ 토스 결제 (배포 빌드 기록 · 읽기만)");
    const PA = require(path.join(TMP, "class/api/_lib/payaudit.js"));
    const O = (status, amount, extra) => Object.assign({ no: "DC1", method: "card", status, amount, paymentId: "p1" }, extra || {});
    const P = (status, total, cancelled) => ({ status, totalAmount: total, balanceAmount: total - (cancelled || 0) });
    const cases = [
      [[O("paid", 10000)], P("DONE", 10000), "ok"],
      [[O("paid", 10000), O("paid", 5000, { no: "DC2" })], P("DONE", 15000), "ok"],
      [[O("refunded", 10000, { refundAmount: 10000 })], P("CANCELED", 10000, 10000), "ok"],
      [[O("refunded", 10000, { refundAmount: 3000 })], P("PARTIAL_CANCELED", 10000, 3000), "ok"],
      [[O("pending", 10000, { method: "vbank" })], P("WAITING_FOR_DEPOSIT", 10000), "ok"],
      [[O("ready", 10000)], null, "open"], [[O("failed", 10000)], null, "open"], [[O("failed", 10000)], P("ABORTED", 10000), "open"], [[O("ready", 10000)], P("IN_PROGRESS", 10000), "open"], [[O("failed", 10000)], P("EXPIRED", 10000), "open"],
      [[O("paid", 10000)], P("DONE", 9000), "bad"], [[O("paid", 10000)], P("CANCELED", 10000, 10000), "bad"], [[O("ready", 10000)], P("DONE", 10000), "bad"],
      [[O("paid", 10000)], null, "bad"], [[O("refunded", 10000, { refundAmount: 3000 })], P("PARTIAL_CANCELED", 10000, 5000), "bad"], [[O("paid", 10000)], P("WAITING_FOR_DEPOSIT", 10000), "bad"],
      [[O("canceled", 10000, { method: "vbank" })], P("WAITING_FOR_DEPOSIT", 10000), "ok"], [[O("canceled", 10000, { method: "vbank" })], P("CANCELED", 10000), "ok"], [[O("canceled", 10000, { method: "vbank" })], P("DONE", 10000), "bad"],
      [[O("paid", 10000)], P("SOMETHING_NEW", 10000), "bad"]
    ];
    const got = cases.map((c) => PA.judge(c[0], c[1]).verdict);
    ok(got.every((v, i) => v === cases[i][2]), "판정: 결제 완료 · 묶음 결제 · 전액 · 부분 취소 · 가상계좌 대기 · 입금 전 취소 = 맞음 / 창만 연 · 실패 · 만료 결제 = 안 끝남 / 금액 · 취소 금액 · 상태가 다르거나 취소 뒤 입금 · 모르는 상태면 확인 필요 (" + cases.length + "가지)", got);
    const au = await PA.audit(50);
    const txt = JSON.stringify(au);
    ok(au.checked > 0 && au.rows.every((r) => Object.keys(r).every((k) => ["no", "method", "status", "amount", "pg", "verdict", "why"].indexOf(k) >= 0)) && !/@example\.com|010-|pwHash|test_sk_dctest|tpk_|ps_pay/.test(txt) && au.bad === 0 && au.ok >= 10 && /payaudit"\)\.audit\(30\)/.test(fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8")),
      "대조 결과에는 주문 번호 · 결제수단 · 상태 · 금액만 (이름 · 연락처 · 키 없음) · 배포 빌드가 최근 30건을 기록 (" + au.checked + "건 · 맞음 " + au.ok + " · 안 끝남 " + au.open + " · 확인 필요 " + au.bad + ")");
    // 화면: 결제를 끝내지 않은 주문(ready) · 결제가 안 된 주문(failed) — 예전에는 ‘결제 완료’로 보였어요
    const vj33 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), aj33 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    ok(/const NOT_ORDER = \{ ready: 1, failed: 1 \};/.test(vj33) && /orders = v\.orders\.filter\(\(o\) => o\.mid === m\.id && !NOT_ORDER\[o\.status\]\)/.test(vj33) && /ready: \["결제 안 끝남", "mute"\], failed: \["결제 안 됨", "mute"\] \};/.test(vj33) &&
      /const VD_OST = \{[^;]*ready: \["결제 안 끝남", "mute"\], failed: \["결제 안 됨", "mute"\] \};/.test(aj33) && /o\.ship && o\.status !== "failed" && o\.status !== "ready"/.test(aj33),
      "화면: 결제를 끝내지 않은 · 결제가 안 된 카드 주문은 회원 주문 내역 · 배송 조회에서 빼고, 마스터 주문 목록에는 ‘결제 안 끝남 · 결제 안 됨’으로 (예전엔 ‘결제 완료’로 보였어요)");
  }

  {
    console.log("34) 토스 결제 주문: 화면 저장(sync)으로는 결제 · 환불 상태를 못 바꿔요 · 환불은 토스 취소를 거쳐서만 (2026-11-04 시험 결제에서 찾음)");
    const st34 = require(path.join(TMP, "class/api/_lib/store.js"));
    const t34 = String(Date.now()).slice(-6), mid = "vm-pgl" + t34, no = "DC261104" + t34, no2 = "DC261105" + t34, no3 = "DC261106" + t34, pid = "pay-pgl-" + t34, pid2 = "pay-pgl2-" + t34;
    const base34 = { mid, pid: "v5", kind: "course", days: 365, title: "카드 결제 시험", list: 5000, sale: 5000, amount: 5000, method: "card", ch: "web", createdAt: Date.now(), at: Date.now() };
    await st34.writeDoc("vm:" + mid, { id: mid, name: "결OO", email: "pgl" + t34 + "@example.com", orderNos: [no, no2, no3], coupons: [], points: 0 }, null);
    approvedLike(pid, 5000);
    await st34.writeDoc("vo:" + no, Object.assign({ id: "vo-" + no, no, status: "paid", paidAt: Date.now(), paymentId: pid, pg: { pv: "toss", st: "paid", paymentKey: PG[pid].paymentKey, txId: "tx_" + pid } }, base34), null);
    await st34.writeDoc("vo:" + no2, Object.assign({ id: "vo-" + no2, no: no2, status: "ready", paymentId: pid2 }, base34), null);
    await st34.writeDoc("vo:" + no3, Object.assign({ id: "vo-" + no3, no: no3, status: "paid", paidAt: Date.now(), pg: { st: "mock", at: Date.now() } }, base34), null);
    useJar({ dc_a: auth.sign({ r: "master" }) });
    const ver34 = async (k) => (await st34.getDoc(k)).ver;
    // 예전 마스터 화면이 한 일: PG 취소 없이 ‘환불’로 저장 (상태 · 환불 금액 · 결제 정보를 바꿔서)
    r = await sync([{ k: "vo:" + no, base: await ver34("vo:" + no), ops: [{ p: ["status"], v: "refunded" }, { p: ["refundAmount"], v: 4290 }, { p: ["refundedAt"], v: Date.now() }, { p: ["refundKind"], v: "partial" }, { p: ["pg", "st"], v: "mock" }, { p: ["amount"], v: 1 }, { p: ["paymentId"], v: "evil" }, { p: ["refundMemo"], v: "메모는 저장돼요" }, { p: ["ship"], v: null }] }]);
    let o34 = (await st34.getDoc("vo:" + no)).v;
    ok(o34.status === "paid" && o34.refundAmount === undefined && o34.refundedAt === undefined && o34.amount === 5000 && o34.paymentId === pid && o34.pg.st === "paid" && o34.pg.paymentKey === PG[pid].paymentKey && o34.refundMemo === "메모는 저장돼요" && PG[pid].status === "DONE",
      "토스 결제 완료 주문: 마스터 화면 저장으로 상태 · 환불 금액 · 금액 · 결제 정보는 안 바뀌고 메모 같은 다른 칸만 저장돼요", { r, o: o34 });
    r = await sync([{ k: "vo:" + no2, base: await ver34("vo:" + no2), ops: [{ p: ["status"], v: "paid" }, { p: ["paidAt"], v: Date.now() }, { p: ["pg"], v: { st: "paid" } }] }]);
    const o34b = (await st34.getDoc("vo:" + no2)).v;
    ok(o34b.status === "ready" && !o34b.paidAt && !o34b.pg, "결제창만 연 카드 주문(결제 안 끝남): 화면 저장으로 ‘결제 완료’를 만들 수 없어요 (토스 결제 승인만)", o34b);
    r = await sync([{ k: "vo:" + no3, base: await ver34("vo:" + no3), ops: [{ p: ["status"], v: "refunded" }, { p: ["refundAmount"], v: 5000 }] }]);
    const o34c = (await st34.getDoc("vo:" + no3)).v;
    ok(o34c.status === "refunded" && o34c.refundAmount === 5000, "시안 화면의 시험 결제(pg mock · PG 없음)는 예전처럼 화면에서 환불 기록", o34c);
    // 토스를 거치는 환불(/api/vod-pay refund)은 그대로
    r = await call("vod-pay", { body: { action: "refund", no, amount: 4290, reason: "시험 환불" } });
    o34 = (await st34.getDoc("vo:" + no)).v;
    ok(r.json.ok && PG[pid].lastCancel && PG[pid].lastCancel.amount === 4290 && o34.status === "refunded" && o34.refundAmount === 4290 && o34.refundKind === "partial" && o34.refundMemo === "메모는 저장돼요",
      "마스터 환불(/api/vod-pay): 토스에 4,290원 부분 취소 → 주문 환불 4,290원 (토스 취소 금액과 같아요)", { r: r.json, o: o34, pg: PG[pid] });
    r = await sync([{ k: "vo:" + no, base: await ver34("vo:" + no), ops: [{ p: ["status"], v: "paid" }, { p: ["refundAmount"], v: 0 }] }]);
    o34 = (await st34.getDoc("vo:" + no)).v;
    ok(o34.status === "refunded" && o34.refundAmount === 4290, "환불한 토스 주문도 화면 저장으로 ‘결제 완료’로 되돌릴 수 없어요", o34);
    // 화면(마스터): PG 결제인지는 주문 기록으로 · 강사센터를 열 때 결제 설정을 받아요
    const aj34 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), va34 = fs.readFileSync(path.join(ROOT, "api/_lib/vodaccess.js"), "utf8");
    ok(/const vdPgReal = \(o\) => !!\(vdSrv\(\) && vdIsPg\(o\) && \(o\.paymentId \|\| \(o\.pg \|\| \{\}\)\.paymentId\)\);/.test(aj34) && /const real = vdPgReal\(o\);/.test(aj34) && /function mount\(\) \{\s*\/\/[^\n]*\n\s*if \(window\.VOD && window\.VOD\.loadCfg\) window\.VOD\.loadCfg\(\);/.test(aj34) && !/const real = !!\(VX\(\)\.payServer/.test(aj34) &&
      /if \(K\.type === "vo"\) return \{ fix: \(o, n\) => keepServer\(o, n, isPgOrder\(o\) \? PG_LOCK : \["paymentId"\]\) \};/.test(va34),
      "화면: 마스터 환불은 결제 설정을 받았는지와 상관없이 PG 결제 주문이면 서버(토스 취소)를 거쳐요 · 강사센터를 열 때 결제 설정을 받아요 · 서버가 결제 칸을 잠가요");
  }

  {
    console.log("35) React 화면 스위치 (Next.js 전환 4-4 · shared/screens.js · proxy.js)");
    const S = require(path.join(ROOT, "shared/screens.js"));
    ok(S.match("/vod/my") === "vod-my" && S.match("/vod/my/") === "vod-my" && S.match("/vod/my?x=1") === "vod-my" && S.match("/vod/my/classes") === "vod-my" && S.match("/vod/my/likes") === "vod-my" && S.match("/vod/my/orders") === "vod-my" && S.match("/vod/my/ship") === "vod-my" && S.match("/vod/c/all") === "vod-list" && S.match("/vod/c/commerce") === "vod-list" && S.match("/vod/search") === "vod-list" && S.match("/vod/teachers") === "vod-teachers" && S.match("/vod/teachers/yuna") === "vod-teachers" && S.match("/terms") === "vod-legal" && S.match("/vod/legal/refund") === "vod-legal" && S.match("/vod/about") === "vod-about" && S.match("/vod/partners") === "vod-partners" && S.match("/vod/partners/apply") === "vod-partners" && S.match("/vod/recruit") === null && S.match("/vod") === "vod-home" && S.match("/") === "vod-home" && S.match("/vod/p/v5") === "vod-product" && S.isPublic("vod-list") && !S.isPublic("vod-my") && S.match("/vod/login") === "vod-auth" && S.match("/vod/signup") === "vod-auth" && S.match("/vod/dg") === "vod-auth" && S.match("/login") === "dg-login" && S.match("/vod/order/DC261104000001") === "vod-order" && S.match("/vod/checkout/v5") === "vod-checkout" && S.match("/vod/learn/v5") === "vod-learn" && S.match("/vod/learn/v5/v5-l1-1") === "vod-learn" && S.match("/vod/my/classesx") === null && S.match("/vodx/my") === null,
      "주소 → 화면 키: 옮긴 화면(회원 화면 · 스토어 홈 · 클래스 상세 · 약관 · 강사진 · 목록 · 검색 · 소개 · 파트너스)만 · 아직 안 옮긴 화면(예전 강사 모집 주소) · 다른 주소는 예전 화면 · 공개 화면 표시");
    ok(S.enabled({}).length === 0 && S.enabled({ env: "all" }).join() === S.KEYS.join() && S.enabled({ cookie: "vod-my" }).join() === "vod-my" && S.enabled({ env: "all", off: "vod-my" }).indexOf("vod-my") < 0 && S.enabled({ env: "all", cookie: "off" }).length === 0 && S.enabled({ env: "all", off: "all" }).length === 0,
      "켜기: 기본은 모두 꺼짐 · DC_NEXT=all 또는 쿠키로 켬 · DC_NEXT_OFF 는 쿠키보다 셈 · 쿠키 off 는 이 브라우저만 모두 끔");
    ok(S.validPick("all") && S.validPick("off") && S.validPick("vod-my") && !S.validPick("evil") && !S.validPick(""), "?dc_next= 값은 all · off · 있는 화면 키만 쿠키로 남겨요");
    const px = fs.readFileSync(path.join(ROOT, "../proxy.js"), "utf8"), mj = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), idx35 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), vj35 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), st35 = fs.readFileSync(path.join(ROOT, "scripts/site.js"), "utf8");
    ok(/matcher: \["\/\(\(\?!api\/\|_next\/\|\.\*\\\\\.\[A-Za-z0-9\]\+\$\)\.\*\)"\]/.test(px) && /to\.pathname = "\/n" \+ p/.test(px) && /process\.env\.DC_NEXT, off: process\.env\.DC_NEXT_OFF/.test(px),
      "proxy.js: API · 파일 · Next.js 내부 파일은 건너뛰고, 켜진 화면만 /n/… 로 넘겨요 (같은 규칙 · 같은 환경 변수)");
    ok(/const rk = reactKey\(h\);\s*if \(!!rk !== REACT_PAGE\) \{ moveArea\(next, true\); return; \}/.test(mj) && /if \(REACT_PAGE\) \{ window\.ReactApp\.go\(rk, h, changed\); return; \}/.test(mj) && /window\.DC_REACT_WAIT/.test(mj) && /<script src="shared\/screens\.js"><\/script>/.test(idx35),
      "main.js: React 화면 ↔ 예전 화면이 바뀌면 새로 불러요 · React 화면 틀에서는 그리기만 React 에 맡겨요 · 화면 목록은 늘 받아요");
    ok(/const isActive = \(\) => document\.body\.dataset\.mode === "vod" && !document\.body\.dataset\.react;/.test(vj35) && /data-next/.test(st35),
      "React 화면 틀(<body data-react>)에서는 예전 스토어 화면 이벤트가 돌지 않아요 · 빌드가 스위치 값을 <html data-next> 로");
    const app35 = fs.readFileSync(path.join(ROOT, "../ui/App.jsx"), "utf8");
    ok(/reactBoot: \(\) => loadCfg\(\)\.then\(\(\) => \{ kkReturn\(\); pgReturn\(\); tsMount\(\); \}\)/.test(vj35) && /X\.reactBoot \? X\.reactBoot\(\)/.test(app35) && /Screen && ready \?/.test(app35) &&
      /if \(document\.body\.dataset\.react\) \{ if \(window\.ReactApp && window\.ReactApp\.redraw\) window\.ReactApp\.redraw\(\); return; \}/.test(vj35) && /sessionStorage\.setItem\("dc:toasts"/.test(mj) && /function carryToasts\(\)/.test(mj),
      "React 화면: 결제 · 로그인 설정(vod-config)을 받은 뒤 처음 그려요(안 받으면 쿠폰 · 결제가 서버를 안 거쳐요) · 예전 처리 함수의 ‘다시 그리기’는 React 로 · 새로 불러도 알림이 이어져요");
  }

  {
    console.log("36) DB 전환 1부 A1 · A6: 저장소(SQLite 로컬 · Postgres/Supabase) · 쓰기 멈춤(DC_READONLY) · 배포 기록용 확인 · Turso 정리");
    const st36 = require(path.join(TMP, "class/api/_lib/store.js")), init36 = require(path.join(TMP, "class/api/_lib/init.js")), pgRun = process.env.TEST_DB === "pg";
    const kind36 = st36.kind();
    ok(kind36 === (pgRun ? "postgres" : "sqlite"), "지금 저장소: " + (pgRun ? "Postgres (PGlite · 운영 Supabase 와 같은 postgres 드라이버 · 같은 SQL)" : "SQLite (로컬 개발 · 시험 · Postgres 와 같은 SQL)"), kind36);
    const q36 = [st36.pgSql("SELECT k, v, ver, created FROM docs WHERE updated > ? AND (k LIKE ? OR k = ?) ORDER BY created, k"), st36.pgSql("UPDATE docs SET v = ?, updated = ? WHERE k = 'a?b'"), st36.pgSql("DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT 40)")];
    ok(q36[0] === 'SELECT k, v, ver, created FROM app.docs WHERE updated > $1 AND (k LIKE $2 OR k = $3) ORDER BY created, k COLLATE "C"' && q36[1] === "UPDATE app.docs SET v = $1, updated = $2 WHERE k = 'a?b'" && q36[2] === "DELETE FROM app.backups WHERE id NOT IN (SELECT id FROM app.backups ORDER BY id DESC LIMIT 40)",
      "Postgres 로 바꾸기: ? → $1 (따옴표 안은 그대로) · 표 이름 → app.표 · 같은 시각 문서는 키를 바이트 순으로(SQLite 와 같은 순서)", q36);
    // init.js 가 직접 쓰던 SQL → 저장소 함수 (두 DB 같은 결과)
    const k36 = "zz36:" + Date.now().toString(36), v36 = JSON.stringify({ b: 1, a: "한글", z: [1, { y: null }] });
    await st36.insertDocs([{ k: k36, v: v36, created: 9e12 }]);
    await st36.insertDocs([{ k: k36, v: JSON.stringify({ a: 2 }), created: 9e12 }]);
    const row36 = await st36.getDoc(k36), all36 = await st36.allDocRows(), list36 = await st36.listDocs({ prefixes: ["zz36:%"] });
    ok(row36 && row36.ver === 1 && row36.v.a === "한글" && all36.some((r) => r.k === k36 && r.v === v36) && list36.length === 1 && list36[0].k === k36,
      "문서 넣기(이미 있는 키는 그대로) · 모든 문서 읽기 · 앞부분 찾기 — 문서 글자는 한 글자도 안 바뀌어요(키 순서 · 한글 · null)", { row36, n: list36.length });
    const sys0 = await st36.getDoc("sys"); await init36.setEpoch(); const sys1 = await st36.getDoc("sys");
    ok(sys1 && sys1.v && sys1.v.epoch && (!sys0 || (sys1.v.epoch !== sys0.v.epoch && sys1.ver === sys0.ver + 1)), "epoch(sys 문서) 바꾸기 — 있으면 고치고(버전 +1) 없으면 맨 앞에 만들어요", { before: sys0 && sys0.ver, after: sys1 && sys1.ver });
    // 쓰기 멈춤: 문서 · 사진 쓰기만 503 — 읽기 · 로그인(실패 횟수) · 배포 전 백업은 그대로
    const jar36 = Object.assign({}, jar);
    process.env.DC_READONLY = "1"; process.env.MASTER_PASSWORD = "Test-master9@";
    let ro = {};
    try {
      jar.dc_a = auth.sign({ r: "master" });
      const b36 = await call("bootstrap", { method: "GET" }), m36 = (b36.json.docs || []).find((d) => d[0] === "meta");
      const s36 = await call("sync", { body: { changes: [{ k: "meta", base: m36 ? m36[2] : 0, put: Object.assign({}, m36 ? m36[1] : {}, { ro36: 1 }) }] } });
      let thrown = null; try { await st36.writeDoc(k36, { a: 3 }, 1); } catch (e) { thrown = e; }
      let rlOk = true; try { await st36.rlFail(["ro36:" + k36]); await st36.rlClear(["ro36:" + k36]); } catch (e) { rlOk = false; }
      const bk36 = await st36.backup("시험: 쓰기 멈춤 중 배포 전 백업");
      await st36.rlClear(["master", "day:master"]); delete jar.dc_a;
      const l36 = await call("auth", { body: { action: "admin", tab: "master", id: "doogobiz", pw: "Test-master9@" }, headers: { "x-forwarded-for": "10.36.0.1" } });
      ro = { boot: b36.status, docs: (b36.json.docs || []).length, sync: s36.status, err: s36.json.error, msg: s36.json.message, thrown: st36.isReadonlyError(thrown), rlOk, backup: !!(bk36 && bk36.docs), login: !!(l36.json.ok && jar.dc_a) };
    } finally { delete process.env.DC_READONLY; delete process.env.MASTER_PASSWORD; Object.keys(jar).forEach((k) => delete jar[k]); Object.assign(jar, jar36); }
    ok(ro.sync === 503 && ro.err === "readonly" && /점검/.test(ro.msg || "") && ro.thrown, "쓰기 멈춤(DC_READONLY=1): 저장은 503 ‘잠시 점검 중’ — 화면은 바뀐 내용을 들고 있다가 다시 보내요", ro);
    ok(ro.boot === 200 && ro.docs > 0 && ro.rlOk && ro.backup && ro.login, "쓰기 멈춤 중에도 읽기 · 로그인(실패 횟수 기록) · 배포 전 백업은 그대로 — 점검 중에 들어가서 확인할 수 있어요", ro);
    const after36 = await st36.writeDoc(k36, null, 1), meta36 = await st36.getDoc("meta");
    ok(after36 === 2 && !(meta36 && meta36.v && meta36.v.ro36), "쓰기 멈춤을 끄면 바로 다시 저장돼요 · 멈춘 동안 보낸 저장은 하나도 안 들어갔어요", { after36 });
    // 배포 기록용 확인 (A0)
    const fx36 = await st36.fileStats(), bad36 = await st36.pgProbe("postgres://postgres.abc:s3cret-pw@127.0.0.1:1/postgres");
    ok(typeof fx36.n === "number" && fx36.n >= 0 && fx36.total >= fx36.max && bad36.ok === false && bad36.port === 1 && !/s3cret-pw|postgres\.abc/.test(JSON.stringify(bad36)),
      "배포 기록: 사진 · 첨부 개수 · 크기(읽기만) · Supabase 접속 실패도 빌드는 계속 · 기록에 비밀번호 · 주소가 안 나와요", { fx36, bad36 });
    { // 비밀번호가 틀렸다고 나올 때: 모양만 보고 고칠 곳을 알려요 (비밀번호 · 아이디 글자는 안 나와요)
      const AF = 'password authentication failed for user "postgres"', h = (s, why, pooler) => st36.pgAuthHint(new URL(s), why === undefined ? AF : why, pooler !== false);
      const P = "@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres", ref = "postgres.abcdefghijklmnopqrst";
      const hs = { ph: h("postgresql://" + ref + ":[YOUR-PASSWORD]" + P), br: h("postgresql://" + ref + ":[Zz9secretQ]" + P), user: h("postgresql://postgres:Zz9secretQ" + P),
        pct: h("postgresql://" + ref + ":Zz9%zzsecretQ" + P), ok: h("postgresql://" + ref + ":Zz9secretQ" + P), other: h("postgresql://" + ref + ":Zz9secretQ" + P, "timeout"), tenant: h("postgresql://postgres:Zz9secretQ" + P, "Tenant or user not found") };
      ok(/YOUR-PASSWORD/.test(hs.ph) && /대괄호/.test(hs.br) && /postgres\.<프로젝트 아이디>/.test(hs.user) && /postgres\.<프로젝트 아이디>/.test(hs.tenant) && /%/.test(hs.pct) && /Reset database password/.test(hs.ok) && hs.other === ""
        && !/Zz9|secretQ|abcdefghij/.test(JSON.stringify(hs)), "Supabase 비밀번호 인증 실패: [YOUR-PASSWORD] 그대로 · 대괄호 · 아이디 모양 · % 깨짐 · 그 밖엔 비밀번호 다시 정하기 안내 (비밀번호 · 아이디 글자는 기록에 안 나와요)", hs);
    }
    if (pgRun) { const pr36 = await st36.pgProbe(process.env.SUPABASE_DB_URL); ok(pr36.ok && pr36.app && pr36.docs > 0 && /^\d+/.test(pr36.version), "Supabase 접속 확인(시험 Postgres): 버전 · 왕복 시간 · app 표 · 문서 수", pr36); }
    // 로그인 서명 키 = SESSION_SECRET 하나 (Turso 정리 A6 · 예전 Turso 토큰 키 쿠키는 더 이상 받지 않아요) · Vercel 에서 키가 없으면 기본 키로 서명하지 않아요
    const env36 = { s: process.env.SESSION_SECRET, t: process.env.TURSO_AUTH_TOKEN, v: process.env.VERCEL }, setEnv = (o) => { ["SESSION_SECRET", "TURSO_AUTH_TOKEN", "VERCEL"].forEach((k) => delete process.env[k]); Object.assign(process.env, o); };
    let sk36 = {};
    try {
      setEnv({ SESSION_SECRET: "legacy-36" }); const oldT = auth.sign({ r: "master" }); // 예전 키(Turso 토큰으로 만든 키)로 서명된 쿠키와 같은 서명
      setEnv({ SESSION_SECRET: "new-36", TURSO_AUTH_TOKEN: "legacy-36" }); const newT = auth.sign({ r: "master" });
      sk36.withToken = [!!auth.verify(oldT), !!auth.verify(newT)];
      setEnv({ TURSO_AUTH_TOKEN: "legacy-36", VERCEL: "1" }); try { auth.sign({ r: "x" }); sk36.vercel = "signed"; } catch (e) { sk36.vercel = "blocked"; }
    } finally { setEnv({}); if (env36.s != null) process.env.SESSION_SECRET = env36.s; if (env36.t != null) process.env.TURSO_AUTH_TOKEN = env36.t; if (env36.v != null) process.env.VERCEL = env36.v; }
    ok(sk36.withToken && !sk36.withToken[0] && sk36.withToken[1] && sk36.vercel === "blocked",
      "로그인 서명 키: SESSION_SECRET 하나만 — 예전 Turso 토큰 키 쿠키는 더 이상 안 받고(한 번 다시 로그인) · 운영에서 SESSION_SECRET 이 없으면(Turso 토큰이 남아 있어도) 누구나 아는 기본 키로 서명하지 않아요", sk36);
    const db36 = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), mj36 = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), hb36 = fs.readFileSync(path.join(ROOT, "api/_lib/http.js"), "utf8"), bd36 = fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8"), pkg36 = JSON.parse(fs.readFileSync(path.join(ROOT, "../package.json"), "utf8"));
    ok(/if \(j\.error === "readonly"\) e\.readonly = true;/.test(db36) && /info && info\.readonly \? "점검 중이에요/.test(mj36) && /e\.code === "DC_READONLY"\) \{ if \(!res\.headersSent\) send\(res, 503/.test(hb36) && /if \(ro\) return;/.test(bd36) && /\.then\(\(\) => store\.close\(\)\)/.test(bd36),
      "쓰기 멈춤 안내: 서버 503 readonly → 화면 ‘잠시 점검 중’ · 배포 때는 백업만 · 빌드 끝에 DB 연결 닫기");
    ok(pkg36.dependencies.postgres === "3.4.9" && !Object.keys(pkg36.dependencies).concat(Object.keys(pkg36.devDependencies || {})).some((d) => /pglite/.test(d)), "운영 빌드 의존성: postgres 드라이버(3.4.9)만 · 시험용 PGlite 는 class/scripts/pg 폴더에만", pkg36.dependencies);
  }

  {
    console.log("37) DB 전환 1부 A2 · A3: Supabase 보안 · 사람이 읽는 보기 · 옮기기 도구(복사 · 확인 · 되돌리기)");
    const st37 = require(path.join(TMP, "class/api/_lib/store.js")), MV = require(path.join(ROOT, "scripts/db-move.js")), PS = require(path.join(ROOT, "api/_lib/pgsetup.js")), pgRun = process.env.TEST_DB === "pg";
    const sqlFile = fs.readFileSync(path.join(ROOT, "scripts/supabase.sql"), "utf8");
    ok(sqlFile === PS.fullSql(st37.PG_SCHEMA) && /security_invoker = true/.test(sqlFile) && !/pwHash|phone4/.test(sqlFile) && PS.VIEW_NAMES.length === 6,
      "class/scripts/supabase.sql = 코드(표 37개 · 보안 · 보기 6개 · 2부 표 설명) 그대로 (Supabase › SQL Editor 에 붙여도 같은 결과) · 보기에 비밀번호 해시 · 전화 뒷자리 없음 · 공개 사이트로는 안 나가요(scripts/)");
    // 지금 시험 DB(서버 시험 500여 개가 쓴 주문 · 회원 · 사진 · 백업 · 작업 기록) → 새 DB 로 복사 → 문서마다 확인
    const live = pgRun ? st37.openClient({ kind: "postgres", url: process.env.SUPABASE_DB_URL }) : st37.openClient({ kind: "sqlite", file: process.env.CLASS_SQLITE });
    const pgB = pgRun ? await require(path.join(ROOT, "scripts/pg/server.js")).start() : null;
    const B = pgRun ? st37.openClient({ kind: "postgres", url: pgB.url }) : st37.openClient({ kind: "sqlite", file: path.join(TMP, "move-b.db") });
    const C = st37.openClient({ kind: "sqlite", file: path.join(TMP, "move-c.db") });
    const m1 = await MV.move(live, B, { mode: "copy" }), m2 = await MV.move(live, B, { mode: "copy" });
    // 2부: 영역 스위치(DB_AREAS)가 켜져 있으면 문서 일부는 영역 표(orders · settings …)에 — 둘 다 세요
    const AR37 = require(path.join(TMP, "class/api/_lib/areas.js")), metaT37 = AR37.route("meta"), metaTab = metaT37 && AR37.modeOf(metaT37) === "only" ? metaT37.table : "docs";
    ok(m1.ok && m1.docs + (m1.areas || 0) > 30 && m1.ops > 20 && m1.verify.ok && m2.skipped && m2.verify.ok, "옮기기(copy): 지금 시험 DB → 새 " + (pgRun ? "Postgres" : "SQLite") + " — 문서 " + m1.docs + "개 · 사진 " + m1.files + "개 · 작업 기록 " + m1.ops + "개 · 백업 " + m1.backups + "개, 문서마다 해시 맞음 · 다시 돌리면 확인만", { docs: m1.docs, files: m1.files, ops: m1.ops, bk: m1.backups });
    const m3 = await MV.move(B, C, { mode: "copy" }), v3 = await MV.verify(live, C);
    ok(m3.ok && v3.ok, "한 번 더 옮겨도(" + (pgRun ? "Postgres → SQLite" : "SQLite → SQLite") + ") 처음 DB 와 문서 · 사진 · 범위 · 작업 기록이 한 글자도 안 달라요", MV.brief(v3));
    await C.batch([{ sql: "UPDATE " + metaTab + " SET v = ? WHERE k = 'meta'", args: ['{"tampered":1}'] }]);
    let tam = null; try { await MV.move(B, C, { mode: "copy" }); } catch (e) { tam = e.message; }
    const v4 = await MV.verify(B, C);
    ok(!v4.ok && v4.docs.bad.concat(v4.areas.bad).some((x) => /^(settings\|)?meta /.test(x)) && /달라요/.test(tam || ""), "받는 쪽 문서 하나가 다르면 확인에서 잡히고 copy 는 멈춰요 (덮어쓰지 않음)", { bad: v4.docs.bad.slice(0, 3), tam: (tam || "").slice(0, 80) });
    const m5 = await MV.move(B, C, { mode: "sync" }), v5 = await MV.verify(B, C), bk5 = (await C.batch([{ sql: "SELECT reason FROM backups ORDER BY id DESC LIMIT 1" }]))[0].rows[0];
    ok(m5.ok && v5.ok && bk5 && /sync/.test(bk5.reason) && m5.backed > 0 && new RegExp("받는 쪽 문서 " + m5.backed + "개 먼저 백업").test(MV.line(m5, "A", "B")), "되돌리기(sync): 받는 쪽을 그 DB 백업에 먼저 남기고 보내는 쪽과 똑같이 · 배포 기록에 먼저 백업한 문서 수", { backed: m5.backed, reason: bk5 && bk5.reason, line: MV.line(m5, "A", "B") });
    const t5 = Date.now(); await new Promise((r) => setTimeout(r, 5));
    await B.batch([{ sql: "INSERT INTO docs (k, v, ver, updated, created) VALUES (?, ?, 1, ?, ?)", args: ["zz37:new", '{"n":1}', Date.now(), Date.now()] }, { sql: "UPDATE " + metaTab + " SET v = ?, ver = ver + 1, updated = ? WHERE k = 'meta'", args: ['{"after":1}', Date.now()] }]);
    const m6 = await MV.move(B, C, { mode: "since", since: t5 }), v6 = await MV.verify(B, C);
    ok(m6.ok && m6.docs + (m6.areas || 0) === 2 && v6.ok, "되돌리기(since): 전환 뒤 바뀐 문서(2개)만 옮겨도 전체가 같아져요", { docs: m6.docs });
    // Turso 정리(A6 · 2026-11-05): Turso 연결 · 배포용 DB_MOVE 는 빠졌고, DB_DRIVER=turso 면 분명하게 멈춰요 · Vercel 에서는 SQLite 파일이 있어도 Supabase 만
    const srcA6 = ["api/_lib/store.js", "api/_lib/auth.js", "scripts/db-build.js", "scripts/db-move.js", "scripts/dev-server.js"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8"));
    const runA6 = (env) => require("child_process").spawnSync(process.execPath, ["-e", "require(" + JSON.stringify(path.join(ROOT, "api/_lib/store.js")) + ").countDocs().then(() => console.log('ok'), (e) => console.log('ERR ' + e.message))"], { env: Object.assign({ PATH: process.env.PATH }, env), encoding: "utf8" }).stdout.trim();
    const a6db = path.join(TMP, "a6.db"), a6 = { turso: runA6({ DB_DRIVER: "turso", CLASS_SQLITE: a6db }), vercel: runA6({ VERCEL: "1", CLASS_SQLITE: a6db }), local: runA6({ CLASS_SQLITE: a6db }) };
    ok(!srcA6.some((t) => /process\.env\.TURSO_|tursoClient|runFromEnv/.test(t)) && typeof MV.runFromEnv === "undefined" && /Turso 는 2026-11-05 에 뺐어요/.test(a6.turso) && /SUPABASE_DB_URL/.test(a6.vercel) && a6.local === "ok",
      "Turso 정리: 연결 코드 · 배포용 옮기기(DB_MOVE) · 예전 로그인 키가 빠졌어요 · DB_DRIVER=turso 면 분명하게 멈춤 · Vercel 에서는 SQLite 파일이 있어도 Supabase 만(없으면 멈춤) · 로컬은 SQLite 그대로", a6);
    if (pgRun) {
      // 보안: Supabase 처럼 anon · authenticated 역할에 일부러 권한을 줘 둬도 배포 때 보안 SQL 이 다 빼요
      const sq = B.sql;
      await sq.unsafe("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$; GRANT USAGE ON SCHEMA app TO anon; GRANT SELECT ON ALL TABLES IN SCHEMA app TO anon;");
      const asAnon = (rel) => sq.begin(async (tx) => { await tx.unsafe("SET LOCAL ROLE anon"); return (await tx.unsafe("SELECT count(*) AS n FROM " + rel))[0].n; }).then((n) => "보임 " + n, (e) => "막힘");
      const before37 = await asAnon("app.docs");
      await sq.unsafe(PS.setupSql()); await sq.unsafe(PS.setupSql());
      const after37 = { docs: await asAnon("app.docs"), files: await asAnon("app.files"), orders: await asAnon("app.v_orders"), members: await asAnon("app.v_members"), ordersTab: await asAnon("app.orders"), membersTab: await asAnon("app.members"), staffTab: await asAnon("app.staff") };
      const rls = (await sq.unsafe("SELECT count(*) AS n FROM pg_class WHERE relnamespace = 'app'::regnamespace AND relkind = 'r' AND relrowsecurity"))[0].n;
      ok(/보임/.test(before37) && Object.values(after37).every((x) => x === "막힘") && Number(rls) === PS.TABLES.length && PS.TABLES.length === 37, "Supabase 보안(배포마다 · 두 번 돌려도 같음): 공개 API 역할 anon · authenticated 는 표 · 보기 · 2부 영역 표(orders · members · staff …) 모두 막힘 · 표 " + PS.TABLES.length + "개 모두 RLS — 우리 서버는 그대로", { before37, after37, rls });
      const cnt = async (sql) => Number((await sq.unsafe(sql))[0].n);
      // 2부: 문서는 docs 또는 영역 표(orders · members · students)에 — 스위치 칸에 따라 (같은 키는 한 번만)
      const both = (kind, tab) => cnt("SELECT count(DISTINCT k) AS n FROM (SELECT k FROM app.docs WHERE kind = '" + kind + "' AND v IS NOT NULL UNION ALL SELECT k FROM app." + tab + " WHERE v IS NOT NULL) x");
      const vo = await both("vo", "orders"), vm = await both("vm", "members"), stu = await both("stu", "students");
      const vOrders = await cnt("SELECT count(*) AS n FROM app.v_orders"), vMembers = await cnt("SELECT count(*) AS n FROM app.v_members"), vStu = await cnt("SELECT count(*) AS n FROM app.v_students");
      const row = (await sq.unsafe("SELECT * FROM app.v_orders WHERE \"결제 금액\" IS NOT NULL LIMIT 1"))[0] || {}, mrow = (await sq.unsafe("SELECT * FROM app.v_members LIMIT 1"))[0] || {};
      for (const v of PS.VIEW_NAMES) await sq.unsafe("SELECT * FROM app." + v + " LIMIT 50"); // 보기마다 시험 데이터 전체로 한 번씩 (형식이 이상한 값이 있어도 안 깨지게)
      ok(vo > 0 && vOrders === vo && vMembers === vm && vStu === stu && row["주문번호"] && row["주문 시각"] instanceof Date && !("pwHash" in mrow) && mrow["회원 id"],
        "사람이 읽는 보기: 주문 " + vOrders + " · 회원 " + vMembers + " · 수강생 " + vStu + "줄 = 문서 수 그대로 · 시각은 날짜로 · 회원 비밀번호 해시는 안 보여요", { vo, vOrders, vm, vMembers, cols: Object.keys(row).slice(0, 6) });
      // 운영 Supabase 가 비어 있는데 DB_DRIVER=supabase 로 배포하면 체험 데이터를 넣지 않고 멈춰요
      const pgE = await require(path.join(ROOT, "scripts/pg/server.js")).start();
      const outE = await new Promise((resolve) => { const ch = require("child_process").spawn(process.execPath, [path.join(ROOT, "scripts/db-build.js")], { cwd: ROOT, env: { PATH: process.env.PATH, NODE_NO_WARNINGS: "1", VERCEL_ENV: "production", DB_DRIVER: "supabase", SUPABASE_DB_URL: pgE.url, MASTER_PASSWORD: "x" } }); let s = ""; ch.stdout.on("data", (d) => (s += d)); ch.stderr.on("data", (d) => (s += d)); ch.on("close", (code) => resolve({ code, s })); });
      const leftE = st37.openClient({ kind: "postgres", url: pgE.url }), nE = Number((await leftE.batch([{ sql: "SELECT COUNT(*) AS n FROM docs" }]))[0].rows[0].n);
      await leftE.end(); await pgE.stop();
      ok(outE.code === 1 && /운영 Supabase 가 비어 있어요/.test(outE.s) && nE === 0, "운영 배포 안전장치: Supabase 가 비어 있으면(옮기기 전) 체험 데이터로 채우지 않고 빌드를 멈춰요", { code: outE.code, nE, msg: outE.s.split("\n").filter((l) => /\[db\]/.test(l)).slice(-1)[0] });
      await B.end(); await pgB.stop();
    }
    await live.end();
  }

  {
    console.log("38) DB 전환 2부 B1: 사진 · 첨부 내용은 Supabase Storage 비공개 버킷 · 주소(/api/file) · 볼 수 있는 범위는 그대로");
    const st38 = require(path.join(TMP, "class/api/_lib/store.js")), BL = require(path.join(TMP, "class/api/_lib/blob.js")), FM = require(path.join(TMP, "class/scripts/files-move.js"));
    const ENV38 = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FILES_STORE", "FILES_BUCKET"], keep38 = {};
    ENV38.forEach((k) => { keep38[k] = process.env[k]; });
    const setSt = (o) => { ENV38.forEach((k) => delete process.env[k]); Object.assign(process.env, o); };
    const ON = { SUPABASE_URL: "https://st38.supabase.test", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test38", FILES_STORE: "supabase", FILES_BUCKET: "class-files" };
    const rowOf = async (h) => (await st38.exec("SELECT b64, size FROM files WHERE h = ?", [h])).rows[0];
    const hOf = (url) => new URL("http://x" + url).searchParams.get("h");
    const objPuts = () => FS38.log.filter((x) => /^POST \/storage\/v1\/object\//.test(x)).length;
    const asMaster = () => useJar({ dc_a: auth.sign({ r: "master" }) });
    const asBuyer = () => { useJar(jarB); delete jar.dc_s; };
    try {
      const before38 = await st38.fileStats();
      // 스위치가 꺼져 있으면(기본) 예전처럼 DB 에 — Storage 를 부르지도 않아요
      asMaster();
      const off = crypto.randomBytes(48);
      r = await call("file", { body: { data: "data:image/png;base64," + off.toString("base64"), scope: "pub" } });
      const rOff = r.json.ok ? await rowOf(hOf(r.json.url)) : null;
      ok(r.json.ok && rOff && rOff.b64 === off.toString("base64") && FS38.log.length === 0 && before38.inStorage === 0 && before38.n > 0,
        "스위치(FILES_STORE)가 꺼져 있으면 예전처럼 DB 에 저장 · Storage 는 부르지도 않아요 · 지금까지 파일 " + before38.n + "개는 모두 DB 에", { before38, log: FS38.log.length });
      setSt(ON);
      const b1 = await BL.ensureBucket(), b2 = await BL.ensureBucket();
      ok(b1.created && !b1.public && !b2.created && FS38.buckets.get("class-files").public === false && FS38.buckets.get("class-files").file_size_limit === 5 * 1024 * 1024,
        "Storage 버킷: 없으면 비공개(5MB 한도)로 만들고 · 두 번째는 그대로", { b1, b2 });
      // 새로 올리는 공개 사진 → Storage 에 · DB 는 ''(표시만) · 주소 그대로 · 누구나 받음
      const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.randomBytes(300)]);
      asMaster();
      r = await call("file", { body: { data: "data:image/png;base64," + png.toString("base64"), scope: "pub" } });
      const hp = r.json.ok ? hOf(r.json.url) : "", rp = hp ? await rowOf(hp) : null, op = FS38.objects.get("class-files/" + hp);
      useJar({});
      const gp = hp ? await call("file", { method: "GET", query: { h: hp } }) : {};
      ok(r.json.ok && /^\/api\/file\?h=[0-9a-f]{40}$/.test(r.json.url) && rp && rp.b64 === "" && Number(rp.size) === png.length && op && op.buf.equals(png) && op.type === "image/png" && FS38.log.length > 0
        && gp.status === 200 && Buffer.isBuffer(gp.body) && gp.body.equals(png) && gp.headers["content-type"] === "image/png" && /^public/.test(gp.headers["cache-control"]),
        "새 공개 사진: 내용은 Storage(비공개 버킷) · DB 는 목록 · 크기만 · 주소 /api/file?h= 그대로 · 방문자도 같은 바이트를 받음", { ok: r.json.ok, b64: rp && rp.b64.length, st: gp.status });
      // 유료 수업 자료(vodp:v5) → 방문자 403 · 산 회원 200 · 받은 내용이 올린 것과 같아요
      const pdf38 = Buffer.from("%PDF-1.4 B1 Storage 수업 자료 " + crypto.randomBytes(40).toString("hex"));
      asMaster();
      r = await call("file", { body: { data: "data:application/pdf;base64," + pdf38.toString("base64"), scope: "vodp:v5" } });
      const hv = r.json.ok ? hOf(r.json.url) : "";
      useJar({}); const gv0 = await call("file", { method: "GET", query: { h: hv } });
      asBuyer(); const gv1 = await call("file", { method: "GET", query: { h: hv } });
      ok(hv && gv0.status === 403 && gv1.status === 200 && Buffer.isBuffer(gv1.body) && gv1.body.equals(pdf38) && /attachment/.test(String(gv1.headers["content-disposition"] || "")) && /^private/.test(gv1.headers["cache-control"]),
        "유료 수업 자료도 Storage 에: 방문자 403 · 산 회원만 200(같은 바이트) · 볼 수 있는 범위(file_scopes)는 DB 그대로 확인", { v0: gv0.status, v1: gv1.status });
      // 제출 서류(adm) → 운영자만
      const adm = Buffer.from("%PDF-1.4 사업자등록증 시험 " + crypto.randomBytes(20).toString("hex"));
      asMaster(); r = await call("file", { body: { data: "data:application/pdf;base64," + adm.toString("base64"), scope: "adm" } });
      const ha = r.json.ok ? hOf(r.json.url) : "";
      asBuyer(); const ga0 = await call("file", { method: "GET", query: { h: ha } });
      asMaster(); const ga1 = await call("file", { method: "GET", query: { h: ha } });
      ok(ha && ga0.status === 403 && ga1.status === 200 && ga1.body.equals(adm), "제출 서류(adm)도 Storage 에: 회원 403 · 운영자만 200", { a0: ga0.status, a1: ga1.status });
      // 같은 파일을 다른 범위로 또 올리면 Storage 에는 다시 안 올리고 범위만 더해요
      const puts0 = objPuts();
      asMaster();
      r = await call("file", { body: { data: "data:application/pdf;base64," + pdf38.toString("base64"), scope: "pub" } });
      const puts1 = objPuts(), sc = (await st38.exec("SELECT scope FROM file_scopes WHERE h = ? ORDER BY scope", [hv])).rows.map((x) => x.scope).join(",");
      ok(r.json.ok && puts1 === puts0 && sc === "pub,vodp:v5", "같은 내용(같은 해시)은 Storage 에 다시 안 올리고 범위만 더해요", { puts0, puts1, sc });
      // 예전 파일(DB 에 b64) → FILES_MOVE=to-storage: 파일마다 올리고 다시 받아 비교 → DB 는 '' · 받는 내용 그대로
      const oldH = (await st38.exec("SELECT h FROM files WHERE b64 <> '' ORDER BY h")).rows.map((x) => x.h), oldBuf = {};
      for (const h of oldH) oldBuf[h] = Buffer.from((await rowOf(h)).b64, "base64");
      const nAll = (await st38.fileStats()).n;
      const m1 = await FM.run("to-storage"), m2 = await FM.run("to-storage"), v1 = await FM.run("verify");
      const allSame = oldH.every((h) => { const o = FS38.objects.get("class-files/" + h); return o && o.buf.equals(oldBuf[h]); });
      asBuyer(); const g12 = await call("file", { method: "GET", query: { h: fh } });
      ok(oldH.length > 0 && m1.moved === oldH.length && !m1.bad.length && m2.total === 0 && v1.inDb === 0 && v1.inStorage === nAll && !v1.bad.length && allSame && g12.status === 200 && g12.body.equals(oldBuf[fh]),
        "예전 파일 옮기기(to-storage): " + m1.moved + "개를 파일마다 다시 받아 비교한 뒤에만 DB 를 비워요 · 두 번째는 할 일 없음 · 확인(verify) 모두 맞음 · 예전 주소 그대로 같은 바이트", { m1: FM.line(m1), v1: FM.line(v1), g: g12.status });
      // Storage 에서 하나가 사라지면 확인(verify)이 잡아요 → 배포 때 빌드가 멈춰요
      const lostK = "class-files/" + oldH[0], lost = FS38.objects.get(lostK); FS38.objects.delete(lostK);
      const v2 = await FM.run("verify"); asMaster(); const gl = await call("file", { method: "GET", query: { h: oldH[0] } }); FS38.objects.set(lostK, lost);
      ok(v2.bad.length === 1 && /Storage 에 없어요/.test(v2.bad[0]) && /문제 1개/.test(FM.line(v2)) && gl.status === 404, "Storage 에서 파일이 사라지면 확인이 잡아요 (배포 때 FILES_MOVE=verify → 빌드 멈춤) · 그 주소는 404", { bad: v2.bad, gl: gl.status });
      // 막힐 요청(방문자 → 유료 자료)에는 Storage 를 부르지 않아요 · 범위를 먼저 확인
      const gets0 = FS38.log.filter((x) => /^GET \/storage\/v1\/object\//.test(x)).length;
      asBuyer(); const gx = await call("file", { method: "GET", query: { h: ha } });
      const gets1 = FS38.log.filter((x) => /^GET \/storage\/v1\/object\//.test(x)).length;
      ok(gx.status === 403 && gets1 === gets0, "막힐 요청(회원 → 운영자 전용 서류)은 범위를 먼저 보고 403 — Storage 에서 꺼내지도 않아요", { st: gx.status, gets0, gets1 });
      // 되돌리기(to-db): Storage → DB b64 · 스위치 · 설정을 빼도 그대로 받음
      const d1 = await FM.run("to-db"); setSt({});
      const leftSt = Number((await st38.exec("SELECT COUNT(*) AS n FROM files WHERE b64 = ''")).rows[0].n);
      asBuyer(); const gb = await call("file", { method: "GET", query: { h: hv } });
      ok(d1.moved === nAll && !d1.bad.length && leftSt === 0 && gb.status === 200 && gb.body.equals(pdf38), "되돌리기(to-db): Storage 의 파일을 다시 DB 에 · Storage 설정을 빼도 그대로 받음 (끄기 = 되돌리기)", { d1: FM.line(d1), leftSt, gb: gb.status });
      // Storage 에 내용만 있는데 설정이 빠지면 받기 503(storage) · Storage 가 고장 나면 올리기 503 · DB 에 목록도 안 생겨요
      setSt(ON); await FM.run("to-storage"); setSt({});
      useJar({}); const gn = await call("file", { method: "GET", query: { h: hp } });
      setSt(Object.assign({}, ON, { SUPABASE_URL: "https://down38.supabase.test" }));
      asMaster();
      const fresh = crypto.randomBytes(64), freshB64 = fresh.toString("base64");
      r = await call("file", { body: { data: "data:image/png;base64," + freshB64, scope: "pub" } });
      const nFresh = Number((await st38.exec("SELECT COUNT(*) AS n FROM files WHERE h = ?", [crypto.createHash("sha256").update(freshB64).digest("hex").slice(0, 40)])).rows[0].n);
      ok(gn.status === 503 && gn.json && gn.json.error === "storage" && r.status === 503 && r.json.error === "storage" && /잠시 뒤/.test(r.json.message) && nFresh === 0,
        "Storage 설정이 빠지면 받기 503 · Storage 가 고장 나면 올리기 503(잠시 뒤 다시) · 이때 DB 에 목록도 안 생겨요(빈 파일 없음)", { gn: gn.status, up: r.status, nFresh });
      // 예전 service_role(JWT) 키 · 키가 틀리면
      setSt(Object.assign({}, ON, { SUPABASE_URL: "https://jwt38.supabase.test", SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOi.legacy.jwt38" }));
      const bj = await BL.ensureBucket(); await BL.put("abc123", "text/plain", Buffer.from("jwt")); const gj = await BL.get("abc123"), gnone = await BL.get("nope404");
      setSt(Object.assign({}, ON, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_wrong" }));
      let wrong = ""; try { await BL.get(oldH[0]); } catch (e) { wrong = e.message + " " + e.code; }
      ok(bj.created && gj && gj.toString() === "jwt" && gnone === null && /401/.test(wrong) && / BLOB$/.test(wrong) && !/sb_secret|supabase\.test/.test(wrong),
        "키: 새 secret 키(apikey 칸만) · 예전 service_role JWT 키(Authorization 도) 둘 다 · 없는 파일은 null · 틀린 키는 401 (오류에 키 · 주소는 안 남겨요)", { wrong });
      setSt(ON); await FM.run("to-db"); setSt({}); // 이 시험 DB 는 다시 예전처럼 (DB 에)
      // 배포 빌드(db-build.js): 버킷을 비공개로 만들고 · FILES_MOVE 로 옮기고 확인 · 공개 버킷이면 멈춤 — 진짜 HTTP 가짜 서버 · 따로 만든 SQLite 파일
      const FSH = FAKE_ST.make("sb_secret_build38"), srv = await FSH.serve();
      const bdb = path.join(TMP, "b38.db"), C38 = st38.openClient({ kind: "sqlite", file: bdb });
      await C38.init();
      const f1 = crypto.randomBytes(120).toString("base64"), f2 = crypto.randomBytes(90).toString("base64"), fh1 = crypto.createHash("sha256").update(f1).digest("hex").slice(0, 40), fh2 = crypto.createHash("sha256").update(f2).digest("hex").slice(0, 40);
      await C38.batch([{ sql: "INSERT INTO files (h, mime, b64, size, created) VALUES (?, ?, ?, ?, ?)", args: [fh1, "image/png", f1, Math.floor(f1.length * 0.75), Date.now()] }, { sql: "INSERT INTO files (h, mime, b64, size, created) VALUES (?, ?, ?, ?, ?)", args: [fh2, "application/pdf", f2, Math.floor(f2.length * 0.75), Date.now()] },
        { sql: "INSERT INTO file_scopes (h, scope) VALUES (?, ?)", args: [fh1, "pub"] }, { sql: "INSERT INTO file_scopes (h, scope) VALUES (?, ?)", args: [fh2, "vodp:v5"] }]);
      await C38.end();
      const runB = (env) => new Promise((resolve) => { const ch = require("child_process").spawn(process.execPath, [path.join(TMP, "class/scripts/db-build.js")], { env: Object.assign({ PATH: process.env.PATH, NODE_NO_WARNINGS: "1", CLASS_SQLITE: bdb, MASTER_PASSWORD: "x", SESSION_SECRET: "s", SUPABASE_URL: srv.url, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_build38", FILES_STORE: "supabase" }, env) }); let o = ""; ch.stdout.on("data", (d) => (o += d)); ch.stderr.on("data", (d) => (o += d)); ch.on("close", (code) => resolve({ code, o, db: o.split("\n").filter((l) => /^\[db\]/.test(l)) })); });
      const o1 = await runB({ FILES_MOVE: "to-storage" }), o2 = await runB({ FILES_MOVE: "verify" });
      const C38b = st38.openClient({ kind: "sqlite", file: bdb }), emptied = Number((await C38b.batch([{ sql: "SELECT COUNT(*) AS n FROM files WHERE b64 = ''" }]))[0].rows[0].n); await C38b.end();
      ok(o1.code === 0 && /Storage 버킷 class-files: 비공개 · 새로 만들었어요 · 새 파일 내용은 Storage 에/.test(o1.o) && /사진 · 첨부 옮기기 \(DB → Storage\): 2\/2개 .* 파일마다 내용 확인 맞음/.test(o1.o) && FSH.buckets.get("class-files").public === false
        && FSH.objects.get("class-files/" + fh1).buf.equals(Buffer.from(f1, "base64")) && emptied === 2 && o2.code === 0 && /사진 · 첨부 확인: 전체 2개 · DB 0 · Storage 2 · 모두 맞아요/.test(o2.o) && !/sb_secret_build38/.test(o1.o + o2.o),
        "배포 빌드: 버킷을 비공개로 만들고(기록) · FILES_MOVE=to-storage 로 옮기고 파일마다 확인 · FILES_MOVE=verify 모두 맞음 · 키는 기록에 없음", o1.db.concat(o2.db).filter((l) => /Storage|사진/.test(l)));
      FSH.objects.delete("class-files/" + fh2);
      const o3 = await runB({ FILES_MOVE: "verify" });
      FSH.buckets.get("class-files").public = true;
      const o4 = await runB({});
      await srv.stop();
      ok(o3.code === 1 && /문제 1개/.test(o3.o) && /빌드를 멈춰요/.test(o3.o) && o4.code === 1 && /공개\(public\)로 되어 있어요/.test(o4.o),
        "배포 빌드: Storage 에서 파일이 사라졌으면 빌드 멈춤 · 버킷이 공개(public)로 바뀌어 있으면 빌드 멈춤 (범위 확인을 건너뛰게 되니까)", { o3: o3.db.slice(-2), o4: o4.db.slice(-1) });
    } finally { setSt(Object.fromEntries(Object.entries(keep38).filter(([, v]) => v != null))); useJar({}); }
  }

  {
    console.log("39) DB 전환 2부 B2~B6: 문서 종류마다 제 표 — 영역 스위치를 한 칸씩 (off → dual → table → only → 되돌리기) · 내용 그대로 · 열 · 한 건씩 표");
    const st39 = require(path.join(TMP, "class/api/_lib/store.js")), AR = require(path.join(TMP, "class/api/_lib/areas.js")), AS = require(path.join(TMP, "class/api/_lib/areasync.js"));
    const env0 = process.env.DB_AREAS, m0 = AR.modes().B2;
    const setM = (m) => { process.env.DB_AREAS = "all:" + m; };
    const snap = async () => new Map((await st39.allDocRows()).map((r) => [r.k, (r.v == null ? "∅" : r.v) + "|" + r.ver]));
    const sameSnap = (a, b) => a.size === b.size && [...a].every(([k, x]) => b.get(k) === x);
    const physDocs = async () => (await st39.exec("SELECT k FROM docs")).rows.map((r) => r.k);
    async function stepTo(target) {
      const seq = AR.ORDER, out = []; let i = seq.indexOf(AR.modes().B2); const j = seq.indexOf(target);
      while (i !== j) { i += i < j ? 1 : -1; setM(seq[i]); const r = await AS.sync({ write: true }); out.push({ mode: seq[i], ok: r.ok, lines: r.lines }); if (!r.ok) break; }
      return out;
    }
    try {
      // 지금 칸을 기록 (시험이 어느 칸으로 시작했든) → 내용 기준
      const r0 = await AS.sync({ write: true, force: true }), base = await snap();
      const nRouted = [...base.keys()].filter((k) => AR.route(k)).length;
      ok(r0.ok && base.size > 100 && nRouted > base.size - 5, "시작: 지금 칸(" + m0 + ")을 기록 · 문서 " + base.size + "개 중 " + nRouted + "개가 영역 표 대상 (docs 에 남는 건 sys 같은 몇 개)", { ok: r0.ok, size: base.size, nRouted, lines: r0.lines.slice(0, 2) });
      // 칸 건너뛰기는 막혀요
      const down = await stepTo("off"); setM("only");
      const jump = await AS.check();
      ok(down.every((x) => x.ok) && !jump.ok && /한 칸씩/.test(jump.bad.join(" ")), "off 에서 only 로 바로 가려 하면 막혀요 (배포 중 예전 서버가 쓰는 내용을 놓치지 않게 · 한 칸씩)", jump.bad.slice(0, 1));
      setM("off");
      // off → dual → table → only : 칸마다 내용이 한 글자도 안 바뀌어요
      const steps = [];
      for (const m of ["dual", "table", "only"]) { const r = await stepTo(m); steps.push({ m, ok: r.every((x) => x.ok), same: sameSnap(await snap(), base), docs: (await physDocs()).filter((k) => AR.route(k)).length, line: (r[0] && r[0].lines[0]) || "" }); }
      ok(steps.every((x) => x.ok && x.same) && steps[0].docs === nRouted && steps[2].docs === 0,
        "off → dual(같이 쓰기 · 표 채움) → table(표에서 읽기) → only(docs 의 그 문서 지움): 칸마다 맞추기 · 비교 통과 · 읽히는 내용(문서 " + base.size + "개 글자 · 버전) 그대로", steps.map((x) => [x.m, x.ok, x.same, x.docs]));
      // only: 열 · 한 건씩 표가 문서와 같아요 · 비밀번호는 표에 없어요
      const ordK = [...base.keys()].find((k) => /^vo:/.test(k) && JSON.parse((base.get(k).split("|")[0]) || "{}").amount > 0);
      const ord = JSON.parse((await st39.getDoc(ordK)).v ? JSON.stringify((await st39.getDoc(ordK)).v) : "{}"), ordRow = (await st39.exec("SELECT * FROM orders WHERE k = ?", [ordK])).rows[0];
      const vb = (await st39.getDoc("vbank")) || { v: { recent: [] } }, dep = (await st39.exec("SELECT COUNT(*) AS n FROM bank_deposits WHERE k = 'vbank'")).rows[0].n;
      const meta = (await st39.getDoc("meta")).v, staffRows = (await st39.exec("SELECT * FROM staff")).rows, memRow = (await st39.exec("SELECT * FROM members LIMIT 1")).rows[0] || {};
      const prodRows = (await st39.exec("SELECT COUNT(*) AS n FROM products WHERE k = 'meta'")).rows[0].n, cohRows = (await st39.exec("SELECT COUNT(*) AS n FROM cohorts")).rows[0].n;
      const cohDocs = [...base.keys()].filter((k) => /^cohorts:/.test(k)).reduce((a, k) => a + (JSON.parse(base.get(k).split("|")[0]) || []).length, 0);
      ok(ordRow && Number(ordRow.amount) === ord.amount && ordRow.status === ord.status && ordRow.mid === ord.mid && Number(dep) === (vb.v.recent || []).length && Number(prodRows) === meta.vod.products.length && Number(cohRows) === cohDocs
        && staffRows.length === (meta.staff || []).length + (meta.affiliates || []).length && staffRows.every((r) => !("pw" in r) && !("pwHash" in r)) && !("pw_hash" in memRow) && !("pwHash" in memRow),
        "영역 표 열 · 한 건씩 표: 주문 금액 · 상태 · 회원 = 문서 · 입금 알림 " + dep + "줄 · 상품 " + prodRows + "줄 · 기수 " + cohRows + "줄 · 운영자 · 파트너 " + staffRows.length + "줄 (비밀번호 · 해시 열 없음)", { amount: ordRow && ordRow.amount, dep, prodRows, cohRows, staff: staffRows.length });
      // only 에서 쓰기 · 버전 충돌 · 변경 받기
      const t39 = Date.now(); await new Promise((r) => setTimeout(r, 5));
      const cur = await st39.getDoc(ordK), w1 = await st39.writeDoc(ordK, Object.assign({}, cur.v, { memo39: "only 에서 씀" }), cur.ver), w2 = await st39.writeDoc(ordK, Object.assign({}, cur.v, { memo39: "늦은 저장" }), cur.ver);
      const w3 = await st39.writeDoc("vr:rv39", { id: "rv39", pid: "v5", mid: "m39", name: "시OO", rating: 5, text: "좋아요", at: Date.now() }, null);
      const feed = (await st39.listDocs({ since: t39 })).map((r) => r.k), pre = (await st39.listDocs({ prefixes: ["vr:%"] })).map((r) => r.k), rvRow = (await st39.exec("SELECT rating, pid FROM reviews WHERE k = 'vr:rv39'")).rows[0];
      ok(w1 === cur.ver + 1 && w2 === false && w3 === 1 && feed.includes(ordK) && feed.includes("vr:rv39") && pre.includes("vr:rv39") && rvRow && Number(rvRow.rating) === 5 && !(await physDocs()).includes("vr:rv39"),
        "only 에서 저장 · 늦은 저장은 버전 충돌(false) · 새 후기 → 제 표에만 · 열(별점)도 · 변경 받기(since) · 접두사 목록에 보여요", { w1, w2, w3, feed: feed.length, rvRow });
      // 백업 → 되돌리기(restore) 도 영역 표로
      const bk = await st39.backup("시험 39"), rows = await st39.backupRows((await st39.listBackups())[0].id), nRestore = await st39.restoreRows(rows), afterR = await snap();
      ok(bk && bk.docs === rows.length && nRestore === rows.length && [...afterR.keys()].length === rows.length && JSON.stringify((await st39.getDoc(ordK)).v.memo39) === '"only 에서 씀"',
        "백업 · 되돌리기: only 에서도 문서 " + rows.length + "개가 백업에 · 되돌리면 제 표로 (내용 그대로 · 버전은 올라가요)", { bk: bk && bk.docs, n: nRestore });
      // 배포 전 백업 (2026-11-07): 바로 앞 백업과 내용이 같으면 새로 쌓지 않아요 · 이미 쌓인 같은 내용 백업은 먼저 것 하나만
      {
        const s1 = await st39.backup("시험 39 같은 내용 1", { skipSame: true }), n1 = (await st39.listBackups()).length;
        const s2 = await st39.backup("시험 39 같은 내용 2", { skipSame: true }), n2 = (await st39.listBackups()).length;
        await st39.backup("시험 39 같은 내용 3"); await st39.backup("시험 39 같은 내용 4"); // skipSame 없이 — 예전처럼 같은 내용이 쌓인 상태
        const n3 = (await st39.listBackups()).length, pr = await st39.pruneSameBackups(), after = await st39.listBackups();
        const keepFirst = after.some((x) => x.reason === "시험 39 같은 내용 1") && !after.some((x) => /같은 내용 [34]/.test(x.reason));
        await st39.writeDoc("vr:rv39b", { id: "rv39b", pid: "v5", mid: "m39", name: "시OO", rating: 4, text: "다시", at: Date.now() }, null);
        const s3 = await st39.backup("시험 39 바뀐 뒤", { skipSame: true }), n4 = (await st39.listBackups()).length, pr2 = await st39.pruneSameBackups();
        ok(s1 && !s1.same && s2 && s2.same && n2 === n1 && n3 === n1 + 2 && pr === 2 && after.length === n1 && keepFirst && s3 && !s3.same && n4 === n1 + 1 && pr2 === 0,
          "배포 전 백업: 바뀐 데이터가 없으면 새로 쌓지 않아요 · 이미 쌓인 같은 내용 백업은 먼저 것 하나만 남기고 정리 · 데이터가 바뀌면 다시 쌓여요", { s1: s1 && s1.same, s2: s2 && s2.same, n1, n2, n3, pr, after: after.length, s3: s3 && s3.same, n4, pr2 });
      }
      const base2 = await snap();
      // 같은 버전인데 내용이 다르면 맞추기가 멈춰요 (사람이 봐야)
      await stepTo("table");
      await st39.exec("UPDATE docs SET v = ? WHERE k = ?", ['{"tampered":39}', ordK]);
      const tam = await AS.sync({ write: true });
      await st39.exec("UPDATE docs SET v = (SELECT v FROM orders WHERE k = ?) WHERE k = ?", [ordK, ordK]);
      const fixed = await AS.sync({ write: true });
      ok(!tam.ok && /같은데 내용이 달라요/.test(tam.lines.join(" ")) && fixed.ok, "docs 와 제 표가 버전은 같은데 내용이 다르면 맞추기가 고치지 않고 멈춰요 (배포 빌드도 멈춤) · 고친 뒤엔 통과", tam.lines.filter((l) => /문제/.test(l)).slice(0, 1));
      // 되돌리기: only → table → dual → off — only 에서 쓴 것까지 docs 에 다 돌아와요
      const back = await stepTo("off"), offDocs = await physDocs(), backSnap = await snap();
      ok(back.every((x) => x.ok) && sameSnap(backSnap, base2) && offDocs.includes("vr:rv39") && offDocs.includes(ordK),
        "되돌리기 table → dual → off: 칸마다 통과 · only 에서 쓴 후기 · 주문 메모까지 docs 에 그대로 (스위치를 끄면 예전처럼)", back.map((x) => [x.mode, x.ok]));
      // 배포 빌드: 칸 건너뛰기는 멈춤 · 한 칸이면 비교 기록 (진짜 db-build.js · 로컬은 비교만)
      const cp = require("child_process"), dbEnv = process.env.TEST_DB === "pg" ? { DB_DRIVER: "supabase", SUPABASE_DB_URL: process.env.SUPABASE_DB_URL } : { CLASS_SQLITE: process.env.CLASS_SQLITE };
      const runB = (areas) => new Promise((resolve) => { const ch = cp.spawn(process.execPath, [path.join(TMP, "class/scripts/db-build.js")], { env: Object.assign({ PATH: process.env.PATH, NODE_NO_WARNINGS: "1", MASTER_PASSWORD: "x", SESSION_SECRET: "s", DB_AREAS: areas }, dbEnv) }); let o = ""; ch.stdout.on("data", (d) => (o += d)); ch.stderr.on("data", (d) => (o += d)); ch.on("close", (code) => resolve({ code, o })); });
      const bj = await runB("all:table"), bd = await runB("B2:dual");
      ok(bj.code === 1 && /한 칸씩/.test(bj.o) && bd.code === 0 && /2부 B2 주문 · 결제: dual \(지난 배포 off\)/.test(bd.o) && /비교만/.test(bd.o), "배포 빌드: off 에서 table 로 바로는 멈춤(지금 배포 그대로) · 한 칸(dual)이면 영역마다 docs = 표 비교를 기록 (미리보기 · 로컬은 비교만)", bd.o.split("\n").filter((l) => /2부/.test(l)).slice(0, 2));
      // 시험을 시작한 칸으로
      const ret = await stepTo(m0);
      ok(ret.every((x) => x.ok) && sameSnap(await snap(), base2), "시험을 시작한 칸(" + m0 + ")으로 돌아와도 내용 그대로", ret.map((x) => x.mode));
    } finally { if (env0 == null) delete process.env.DB_AREAS; else process.env.DB_AREAS = env0; }
  }

  {
    console.log("40) 2부 표 모양 (2026-11-06): 꺼낸 값 먼저 · 시각은 한국 시간 · 문서 JSON(v)은 맨 오른쪽 — 예전 모양 표는 내용 그대로 다시 만들어요");
    const st40 = require(path.join(TMP, "class/api/_lib/store.js")), AR = require(path.join(TMP, "class/api/_lib/areas.js")), AS = require(path.join(TMP, "class/api/_lib/areasync.js"));
    const kind = (await st40.db()).kind, pg = kind === "postgres", S = pg ? "app." : "";
    const fresh = await AS.oldTables(kind);
    const cols0 = pg ? (await st40.exec("SELECT column_name AS c FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'orders' ORDER BY ordinal_position")).rows.map((r) => r.c) : (await st40.exec("SELECT name AS c FROM pragma_table_info('orders')")).rows.map((r) => r.c);
    ok(!fresh.length && cols0[0] === "k" && cols0[1] === "no" && cols0.slice(-4).join(",") === "v,ver,updated,created",
      "새 표 모양: k → 꺼낸 값(주문번호 · 회원 · 금액 · 상태 …) → 맨 오른쪽에 v(문서 JSON) · ver · updated · created — Table Editor 에서 보통 표처럼", cols0.slice(0, 3).concat(["…"], cols0.slice(-4)));
    // 예전 모양(v 가 둘째 칸 · 시각은 ms 숫자)으로 되돌린 표 3개 — 주문(시각 칸) · 1:1 문의(보기 v_inquiries 가 씀) · 설정(한 건씩 표 4개)
    const picks = ["orders", "member_inquiries", "settings"].map((n) => AR.TABLES.find((t) => t.table === n));
    const oldT = (ty) => (ty === "time" || ty === "big" ? (pg ? "bigint" : "INTEGER") : ty === "text" ? (pg ? "text" : "TEXT") : ty === "bool" ? (pg ? "boolean" : "INTEGER") : pg ? "integer" : "INTEGER");
    const phys = async (t) => (await st40.exec("SELECT k, v, ver, updated, created FROM " + t.table + " ORDER BY k")).rows.map((r) => [r.k, r.v, Number(r.ver), Number(r.updated), Number(r.created)].join("|")).join("\n");
    const before = {}, logical0 = (await st40.allDocRows()).map((r) => r.k + "|" + r.v + "|" + r.ver).sort().join("\n");
    for (const t of picks) {
      before[t.table] = await phys(t);
      const rows = (await st40.exec("SELECT k, v, ver, updated, created FROM " + t.table)).rows;
      for (const c of t.children || []) await st40.exec("DROP TABLE " + S + c.table + (pg ? " CASCADE" : ""));
      await st40.exec("DROP TABLE " + S + t.table + (pg ? " CASCADE" : ""));
      await st40.exec("CREATE TABLE " + S + t.table + " (k " + oldT("text") + " PRIMARY KEY, v " + oldT("text") + ", ver " + oldT("int") + " NOT NULL DEFAULT 1, updated " + oldT("big") + " NOT NULL, created " + oldT("big") + " NOT NULL, " + t.cols.map((c) => AR.q(c[0]) + " " + oldT(c[1])).join(", ") + ")");
      for (const c of t.children || []) await st40.exec("CREATE TABLE " + S + c.table + " (k " + oldT("text") + " NOT NULL, i " + oldT("int") + " NOT NULL, " + c.cols.map((x) => AR.q(x[0]) + " " + oldT(x[1])).join(", ") + ", PRIMARY KEY (k, i))");
      for (const r of rows) await st40.exec("INSERT INTO " + t.table + " (k, v, ver, updated, created) VALUES (?, ?, ?, ?, ?)", [r.k, r.v, r.ver, r.updated, r.created]);
    }
    const found = (await AS.oldTables(kind)).map((o) => o.table).sort();
    const look = await AS.rebuild({ write: false });
    const rb = await AS.rebuild({ write: true });
    if (pg) await st40.pgSetup();
    const after = {}; for (const t of picks) after[t.table] = await phys(t);
    const logical1 = (await st40.allDocRows()).map((r) => r.k + "|" + r.v + "|" + r.ver).sort().join("\n");
    let colBad = 0, kidBad = 0;
    for (const t of picks) for (const r of (await st40.exec("SELECT * FROM " + t.table)).rows) {
      colBad += AR.colDiff(t, r, kind).length;
      for (const c of t.children || []) { const n = Number((await st40.exec("SELECT COUNT(*) AS n FROM " + c.table + " WHERE k = ?", [r.k])).rows[0].n); if (n !== AR.childRows(c, r.v == null ? null : JSON.parse(r.v), r.k).length) kidBad++; }
    }
    ok(found.join(",") === "member_inquiries,orders,settings" && look.rebuilt.length === 0 && /운영 · 시험용 배포 때/.test(look.lines.join(" ")) && rb.rebuilt.length === 3 && !rb.still.length && !(await AS.oldTables(kind)).length
      && picks.every((t) => before[t.table] === after[t.table]) && logical0 === logical1 && colBad === 0 && kidBad === 0,
      "예전 모양 표 3개를 찾아(찾기만 하는 배포는 그대로) → 내용 그대로 새 모양으로: 문서 글자 · 버전 · 시각 한 글자도 안 바뀜 · 꺼낸 값 · 한 건씩 표(설정 → 상품 · 쿠폰 · 운영자 · 파트너 지급)도 다시", { found, rebuilt: rb.rebuilt, colBad, kidBad });
    // 시각 칸은 한국 시간 글자 · 문서의 ms 와 같은 순간
    const anyOrd = (await st40.exec("SELECT k, v, ordered_at, paid_at FROM orders WHERE v IS NOT NULL AND paid_at IS NOT NULL")).rows[0];
    const od = anyOrd ? JSON.parse(anyOrd.v) : {}, kst = (ms) => new Date(Math.floor(ms / 1000) * 1000 + 9 * 3600e3).toISOString().slice(0, 19).replace("T", " ");
    ok(!anyOrd || (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(String(anyOrd.paid_at)) && String(anyOrd.paid_at) === kst(od.paidAt) && String(anyOrd.ordered_at) === kst(od.at != null ? od.at : od.createdAt)),
      "시각 칸은 한국 시간 글자(예: " + (anyOrd ? anyOrd.paid_at : "—") + ") — 문서의 ms 시각과 같은 순간 (ms 숫자가 아니라 사람이 바로 읽게)", anyOrd && { paid_at: anyOrd.paid_at, paidAt: od.paidAt });
    if (pg) {
      const vi = Number((await st40.exec("SELECT count(*) AS n FROM app.v_inquiries")).rows[0].n), vo = Number((await st40.exec("SELECT count(*) AS n FROM app.v_orders")).rows[0].n);
      const rls = Number((await st40.exec("SELECT count(*) AS n FROM pg_class WHERE relnamespace = 'app'::regnamespace AND relkind = 'r' AND relrowsecurity")).rows[0].n);
      ok(vi >= 0 && vo > 0 && rls === 37, "Postgres: 다시 만든 표를 쓰는 보기(v_orders · v_inquiries)도 다시 · 표 37개 모두 RLS 그대로", { vi, vo, rls });
    }
  }

  {
    console.log("41) 클래스 상세 (2026-11-08): 다짐 · 후기 탭 한 숫자 · 베스트 후기(마스터만 골라요) · 맨 위 대표 영상(탈잉처럼) · 한 건씩 표 열");
    const AC = require(path.join(TMP, "class/api/_lib/access.js")), OO = require(path.join(TMP, "class/api/_lib/oneoff.js")), AR = require(path.join(TMP, "class/api/_lib/areas.js"));
    const cl = (x) => JSON.parse(JSON.stringify(x));
    const mine = { vod: { mid: "m1", owns: ["v2"], nos: [] } }, other = { vod: { mid: "m2", owns: [], nos: [] } }, master = { admin: { role: "master" } };
    // 베스트 후기: 마스터만 켜고 끄고 · 회원이 자기 후기를 고쳐도 그대로 · 회원은 못 켜요
    const r0 = { id: "r1", pid: "v2", mid: "m1", name: "홍OO", rating: 5, text: "강의가 정말 좋았어요. 바로 따라 했어요.", at: 1 };
    const r1 = AC.writer("vr:r1", master, false).fix(cl(r0), Object.assign(cl(r0), { best: true }));
    const r2 = AC.writer("vr:r1", mine, false).fix(cl(r1), Object.assign(cl(r1), { text: "고친 후기예요. 정말 좋았어요.", best: false }));
    const rN = AC.writer("vr:r2", mine, true).fix(null, { id: "r2", pid: "v2", mid: "m1", name: "홍OO", rating: 5, text: "새 후기예요. 정말 좋아요!", best: true, at: 2 });
    const rOff = AC.writer("vr:r1", master, false).fix(cl(r2), (() => { const x = cl(r2); delete x.best; return x; })());
    ok(r1.best === true && r2.best === true && r2.text === "고친 후기예요. 정말 좋았어요." && rN && !rN.best && !rOff.best, "베스트 후기: 마스터가 켜고 끄고 · 회원이 자기 후기를 고쳐도 그대로 · 새 후기에 회원이 켤 수 없어요", { r2: r2.best, rN, rOff: rOff.best });
    // 베스트 다짐: 마스터가 켜고 · 남이 공감하거나 본인이 고쳐도 그대로 · 새 다짐에 회원이 못 켜요
    const p0 = { id: "p1", pid: "v2", mid: "m1", nick: "웃는 망고", text: "매일 30분씩 강의를 듣고 배운 걸 바로 따라 해 볼게요!", at: 1, up: 0, upBy: [] };
    const p1 = AC.writer("vpl:p1", master, false).fix(cl(p0), Object.assign(cl(p0), { best: true }));
    const p2 = AC.writer("vpl:p1", other, false).fix(cl(p1), Object.assign(cl(p1), { upBy: ["m2"], best: false }));
    const p3 = AC.writer("vpl:p1", mine, false).fix(cl(p2), Object.assign(cl(p2), { text: "매일 1시간씩 꼭 들으면서 끝까지 따라 해 볼게요!", best: false }));
    const pN = AC.writer("vpl:p9", mine, true).fix(null, { id: "p9", pid: "v2", nick: "웃는 망고", text: "새로 쓰는 다짐이에요. 끝까지 꼭 해 볼게요!", best: true });
    ok(p1.best === true && p2.best === true && p2.up === 1 && p3.best === true && /1시간/.test(p3.text) && pN && !pN.best, "베스트 다짐: 마스터가 켜고 · 남이 공감하거나 본인이 고쳐도 그대로 · 새 다짐에 회원이 켤 수 없어요", { p2: [p2.best, p2.up], p3: p3.best, pN });
    // 한 건씩 표: 후기 · 다짐 · 상품 열
    const T = (n) => AR.TABLES.find((t) => t.table === n), C = (n) => AR.CHILDREN.find((c) => c.table === n);
    const col = (t, name) => t.cols.find((x) => x[0] === name), rv = T("reviews"), pl = T("pledges"), pt = col(C("products"), "teaser");
    ok(col(rv, "best")[2](r1, "vr:r1") === true && col(rv, "best")[2](r0, "vr:r1") === false && col(rv, "text")[2](r1, "vr:r1") === r1.text && col(pl, "best")[2](p1, "vpl:p1") === true && col(pl, "hidden")[2](Object.assign(cl(p0), { hidden: true }), "vpl:p1") === true && col(pl, "hidden")[2](p0, "vpl:p1") === false && !!pt && pt[2]({ teaser: "https://youtu.be/x" }) === "https://youtu.be/x" && pt[2]({}) === null,
      "DB 한 건씩 표: 후기(reviews)에 후기 글 · 베스트 열 · 다짐(pledges)에 숨김 · 베스트 열 · 상품(products)에 상세 맨 위 영상 주소 열");
    // 일회성: AI 굿즈 클래스(v2) 상세 맨 위 영상
    const m0 = { vod: { products: [{ id: "v2", title: "AI로 그림 그리고 굿즈로 파는 법", teaserOff: true, price: 1 }, { id: "v3", title: "귤" }] }, other: 1 };
    const w = OO.v2Teaser((k) => (k === "meta" ? cl(m0) : null)), vp = w.writes.meta.vod.products;
    ok(vp[0].teaser === "https://www.youtube.com/watch?v=j7TDQ-D1M1s&t=1558s" && !("teaserOff" in vp[0]) && vp[0].price === 1 && vp[1].title === "귤" && !("teaser" in vp[1]) && w.writes.meta.other === 1 && m0.vod.products[0].teaserOff === true,
      "일회성(AI 굿즈 영상): v2 상세 맨 위 영상에 대표님 유튜브 주소(25분 58초부터) · 잠깐 끄기는 풀어요 · 다른 칸 · 다른 클래스는 그대로", vp[0]);
    const m1 = cl(m0); m1.vod.products[0].teaser = "https://youtu.be/other";
    const w2 = OO.v2Teaser((k) => (k === "meta" ? w.writes.meta : null)), w3 = OO.v2Teaser((k) => (k === "meta" ? m1 : null)), w4 = OO.v2Teaser(() => null), w5 = OO.v2Teaser((k) => (k === "meta" ? { vod: { products: [{ id: "v2", title: "다른 클래스" }] } } : null));
    ok([w2, w3, w4, w5].every((x) => !Object.keys(x.writes).length) && OO.OPS.some((x) => x.id === "2026-11-08-v2-teaser" && x.run === OO.v2Teaser) && OO.OPS.findIndex((x) => x.id === "2026-11-08-v2-teaser") > OO.OPS.findIndex((x) => x.id === "2026-11-05-live-lectures"),
      "일회성(AI 굿즈 영상): 다시 돌려도 · 마스터가 이미 넣은 영상이 있으면 · 클래스가 없거나 이름이 다르면 그대로 · 작업 목록 맨 뒤", { w3: w3.result, w5: w5.result });
    // 화면 코드: 탭 숫자 · 영상은 마스터가 넣은 것만 · 미리보기 버튼 자리 · 베스트 후기 (예전 화면 · React 같은 모양)
    const vj = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), pj = fs.readFileSync(path.join(ROOT, "../ui/store/ProductPage.jsx"), "utf8");
    ok(/\["reviews", bk \? "다짐 · 독자 후기" : "다짐 · 후기", rs\.length \+ pls\.length\]/.test(vj) && /x\[2\] \? " <em>" \+ x\[2\] \+ "<\/em>" : ""/.test(vj) && /x\[2\] \? <>\{" "\}<em>\{x\[2\]\}<\/em><\/> : null/.test(pj),
      "탭 ‘다짐 · 후기 N’: 후기 + 다짐 한마디를 한 숫자로 · 숫자는 빨간 글씨 (예전 화면 · React)");
    ok(/if \(!p \|\| p\.teaserOff\) return null;/.test(vj) && /String\(p\.teaser \|\| ""\)\.trim\(\)/.test(vj) && !/previewsOf\(p\)\.find\(\(l\) => l\.video\)/.test(vj) && /st = tStart\(u\)/.test(vj) && /\(st \? "&start=" \+ st : ""\)/.test(vj),
      "맨 위 대표 영상: 마스터가 넣은 영상만 (미리보기 강의 영상으로 대신하지 않아요) · 주소의 시작 시각부터 · 없으면 예전 넓은 썸네일");
    ok(/class="vd-pc-tag"/.test(vj) && /className="vd-pc-tag"/.test(pj) && !/vd-pdt-play/.test(vj) && !/vd-pdt-play/.test(pj) && /r\.best/.test(vj) && /x\.best/.test(vj) && /<Best p=\{p\} \/>/.test(pj),
      "‘미리보기 N개’는 카드 뱃지 줄 오른쪽(썸네일 위에서 뺌) · 베스트 후기 줄은 탭 위 (예전 화면 · React)");    // 2026-11-08 (2): 수강생 수 · 찜한 사람 얼굴은 안 보여요 · 카드 별점 · 후기 수 뺌 · 찜 수는 썸네일 위 알약 · 결제 쿠폰 자동 고르기 · 동작 줄이기 PC 도 자동 재생
    const cj = fs.readFileSync(path.join(ROOT, "../ui/store/Card.jsx"), "utf8"), coj = fs.readFileSync(path.join(ROOT, "../ui/store/CheckoutPage.jsx"), "utf8");
    ok(!/수강생 <b>/.test(vj) && !/수강생 <b>/.test(pj) && !/명\+<\/b>/.test(vj) && !/className="vd-avs">\{lk\.map/.test(pj) && /data-to="vd-s-reviews">' \+ icon\("message", "xs"\)/.test(vj) && /X\.rvPlN\(p\)/.test(pj),
      "상세 제목 아래: 수강생 · 판매 수와 찜한 사람 얼굴은 빼고 ♥ 찜 수 | 다짐 · 후기 N (예전 화면 · React)");
    ok(!/vd-rvc/.test(vj.slice(vj.indexOf("function card("), vj.indexOf("function card(") + 3000)) && !/vd-rvc|vd-hc/.test(cj) && /<small>' \+ likeNum\(likeCount\(p\)\) \+ "<\/small>"/.test(vj) && /<small>\{X\.likeNum\(X\.likeCount\(p\)\)\}<\/small>/.test(cj),
      "카드: 별점 · 후기 수 · 찜 수 줄을 빼고 찜 수는 썸네일 위 ‘N ♡’ 알약 (0이면 하트만 · 10 이상은 10단위 +)");
    ok(/key=\{cps\.map\(\(y\) => y\.x\.id\)\.join\(","\) \|\| "none"\}/.test(coj) && /const calm = !!\(navigator\.connection && navigator\.connection\.saveData\);/.test(vj) && !/prefers-reduced-motion: reduce\)"\) \|\| /.test(vj),
      "결제(React): 쿠폰이 뒤늦게 들어와도(다짐 쿠폰) 가장 많이 깎이는 쿠폰을 골라 둬요 · 상단 영상은 데이터 절약일 때만 눌러서 재생");
    // 2026-11-08 (3): 상단 영상 멈추기 · 다시 재생 — 영상을 누르거나 ⏸ 버튼 (예전 화면 · React) · 사람이 멈춘 영상은 화면 밖 · 미리보기 창에서 돌아와도 저절로 다시 틀지 않아요
    const ij = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8"), vc = fs.readFileSync(path.join(ROOT, "vod.css"), "utf8"), hv = vj.slice(vj.indexOf("function heroVid("), vj.indexOf("function heroVid(") + 1200);
    ok((hv.match(/data-v="pdv-tog"/g) || []).length === 2 && /class="vd-pdv-big"/.test(hv) && /class="vd-pdv-pp"/.test(hv) && /function heroToggle\(box\) \{\s*if \(!box \|\| !box\.classList\.contains\("is-run"\)\) return;/.test(vj) && /box\.__held = false; box\.__st = play \? 1 : 2;/.test(vj) &&
      /if \(v === "pdv-tog"\) \{ e\.preventDefault\(\); heroToggle\(t\.closest\("\.vd-pdv"\)\); return; \}/.test(vj) && /if \(off && !box\.__held && box\.classList\.contains\("is-play"\) && box\.__st === 1\)/.test(vj) && /\} else if \(s === 2\) \{ bx\.__st = 2; bx\.classList\.add\("is-pause"\); \}/.test(vj) &&
      /if \(!e\.target\.closest\("button"\)\) X\.heroToggle\(e\.currentTarget\);/.test(pj) && /className="vd-pdv-pp" data-v="pdv-tog"[^>]*onClick=\{\(e\) => X\.heroToggle\(e\.currentTarget\.closest\("\.vd-pdv"\)\)\}/.test(pj) && /^\s*pause: '/m.test(ij) && /\.vd-pdv\.is-run\.is-pause \.vd-pdv-big \{ display: grid; \}/.test(vc) && /\.vd-pdv\.is-run\.is-pause \.vd-pdv-ph \{/.test(vc) && !/\.vd-pdv\.is-play\.is-pause/.test(vc) && /\.vd-pdv\.is-run \.vd-pdv-ctl \{ display: flex; \}/.test(vc),
      "상단 영상: 영상을 누르거나 ⏸ 버튼으로 멈추기 · 다시 재생 · 멈추면 가운데 큰 ▶ · 사람이 멈춘 건 저절로 다시 안 틀어요 (예전 화면 · React)");
  }

  {
    console.log("42) 두잉고 영상 비메오 (2026-11-09): 강의 · 라이브 다시보기 · 응원 영상 · 자료실 · 추가 메뉴 — 유튜브처럼 영상 칸에 비메오 주소 · 수강생 화면에서 그 자리에서 재생");
    const vm42 = require("vm"), ls42 = new Map(), sb42 = { console, Date, Math, JSON, Intl, localStorage: { getItem: (k) => (ls42.has(k) ? ls42.get(k) : null), setItem: (k, v) => ls42.set(k, String(v)), removeItem: (k) => ls42.delete(k), key: () => null, length: 0 } };
    sb42.window = sb42; vm42.createContext(sb42); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm42.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb42, { filename: f }));
    const D42 = sb42.DB;
    ok(D42.vidVal("https://vimeo.com/1244973319") === "https://vimeo.com/1244973319" && D42.vidVal("https://vimeo.com/1244973319/abcdef1234") === "https://vimeo.com/1244973319/abcdef1234" && D42.vidVal("https://player.vimeo.com/video/1244973319?h=abcdef1234&x=1") === "https://vimeo.com/1244973319/abcdef1234" &&
      D42.vidVal("https://vimeo.com/channels/staffpicks/123456789") === "https://vimeo.com/123456789" && D42.vidVal("https://youtu.be/dQw4w9WgXcQ") === "dQw4w9WgXcQ" && D42.vidVal("dQw4w9WgXcQ") === "dQw4w9WgXcQ" && D42.vidVal("vimeo.com/abc") === "" && D42.vidVal("") === "",
      "영상 칸 값: 비메오 주소는 https://vimeo.com/숫자[/해시] 로 · 유튜브는 11자리 ID · 둘 다 아니면 빈 값 (잘못된 주소 안내)");
    ok(D42.vimeoSrc("https://vimeo.com/1244973319") === "https://player.vimeo.com/video/1244973319?title=0&byline=0&portrait=0&dnt=1" && D42.vimeoSrc("https://vimeo.com/1244973319/abcdef1234") === "https://player.vimeo.com/video/1244973319?h=abcdef1234&title=0&byline=0&portrait=0&dnt=1" && D42.vimeoSrc("dQw4w9WgXcQ") === "" &&
      D42.vidOk("https://vimeo.com/1244973319") && D42.vidOk("dQw4w9WgXcQ") && !D42.vidOk("") && !D42.vidOk("nope") && D42.vidShow("dQw4w9WgXcQ") === "https://youtu.be/dQw4w9WgXcQ" && D42.vidShow("https://vimeo.com/1244973319") === "https://vimeo.com/1244973319" && D42.vidShow("") === "" &&
      D42.vdur.key("https://vimeo.com/1244973319/abcdef1234") === "vm:1244973319:abcdef1234" && D42.vdur.key("dQw4w9WgXcQ") === "yt:dQw4w9WgXcQ",
      "비메오 재생기 주소(일부 공개 해시는 h=) · 영상 연결됨 · 고치는 칸에 보일 주소 · 실제 길이 자동 채우기 열쇠(vm:숫자:해시)도 그대로");
    const ad42 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ap42 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), st42 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
    const bi42 = fs.readFileSync(path.join(ROOT, "../ui/dg/bits.jsx"), "utf8"), mo42 = fs.readFileSync(path.join(ROOT, "../ui/dg/More.jsx"), "utf8"), lb42 = fs.readFileSync(path.join(ROOT, "../ui/dg/Lib.jsx"), "utf8");
    ok((ad42.match(/F\("youtubeId", "영상 주소 \(유튜브 · 비메오\)", "youtube"/g) || []).length === 4 && !/"유튜브 주소", "youtube"/.test(ad42) && /else if \(f\.type === "youtube"\) \{ v = DB\.vidVal\(el\.value\);/.test(ad42) && /value="' \+ esc\(DB\.vidShow\(v\)\)/.test(ad42) &&
      /const ytBadge = \(it\) => \(DB\.vidOk\(it\.youtubeId\)/.test(ad42) && /yid = DB\.vidVal\(yt\);/.test(ad42) && /esc\(DB\.vidShow\(pg\.youtubeId\)\)/.test(ad42),
      "강사센터: 강의 · 라이브 다시보기 · 응원 영상 · 자료실 영상 칸이 ‘영상 주소 (유튜브 · 비메오)’ · 저장은 비메오 주소 / 유튜브 ID · ‘영상 연결됨’ · 추가 메뉴도 (예전 화면 · React 같은 편집 창)");
    ok(/const yid = DB\.youtubeId\(item\.youtubeId\), vm = DB\.vimeoSrc\(item\.youtubeId\);/.test(ap42) && /<div class="video" data-vm="' \+ esc\(vm\)/.test(ap42) && /비메오에서 보기 ' \+ icon\("arrowUpRight", "xs"\)/.test(ap42) && /if \(box\.dataset\.vm\) \{/.test(ap42) && /if \(vm && mvAuto\)/.test(ap42) &&
      /yid = DB\.youtubeId\(item\.youtubeId\), vm = DB\.vimeoSrc\(item\.youtubeId\);/.test(bi42) && /<div className="video" data-vm=\{vm\}>/.test(bi42) && /vm = box && box\.dataset\.vm/.test(bi42) && /<VmFrame src=\{vm\} title=\{cur\.title\} auto \/>/.test(mo42) && /yid = DB\.vidOk\(pg\.youtubeId\)/.test(mo42) && /yid = DB\.vidOk\(it\.youtubeId\);/.test(lb42) &&
      /allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"/.test(ap42) && /allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/.test(bi42),
      "수강생 화면: 비메오 카드 → 누르면 그 자리에서 비메오 재생기 (주차별 강의 · 다시보기 · 응원 영상 · 자료실 · 추가 메뉴 · 예전 화면 · React)");
    ok(/\n\.th-nz \.video-ph \{ overflow: hidden;/.test(st42) && !/\.th-nz \.video-ph \{ position: relative/.test(st42),
      "뉴질랜드 테마 영상 카드도 영상 칸 전체를 채워요 (예전 position: relative 로 위쪽만 차던 것 고침)");
  }

  {
    console.log("43) 주차 열림 = 1주차 늘 · 2주차부터 강의일 전 수요일 0시 (2026-11-15 · 모든 강사) · 강사센터 커리큘럼은 지금 기수가 쓰는 것부터");
    const SC43 = require(path.join(ROOT, "shared/schedule.js"));
    const c3 = { startDate: "2026-11-21", classDow: 6, classDates: { "2": "2026-11-22" } };
    ok(SC43.weekUnlock(c3, 1) === "2026-11-18" && SC43.weekUnlock(c3, 2) === "2026-11-18" && SC43.weekUnlock(c3, 3) === "2026-12-02" && SC43.weekUnlock(c3, 4) === "2026-12-09" &&
      SC43.weekOpen(c3, 1) === "2026-11-21" && SC43.weekDeadline(c3, 1) === "2026-11-27" && SC43.currentWeek(c3, 4, "2026-11-16") === 0 && SC43.OPEN_DOW === 3 && SC43.FIRST_ALWAYS === true,
      "11/21(토) 첫 강의 · 2주차를 11/22(일)로 바꾼 기수: 2주차 11/18(수) · 3주차 12/2(수) · 4주차 12/9(수)부터 (강의일 전 수요일) · 마감 · 이번 주차 · 일정은 그대로");
    const mo = { startDate: "2026-11-21", classDow: 6, classDates: { "5": "2026-12-15", "3": "2026-12-02" } }, cp = { startDate: "2026-11-16" };
    ok(SC43.weekUnlock(mo, 2) === "2026-11-25" && SC43.weekUnlock(mo, 4) === "2026-12-09" && SC43.weekUnlock(mo, 5) === "2026-12-09" && SC43.weekUnlock(mo, 3) === "2026-12-02" && SC43.weekUnlock(cp, 1) === "2026-11-11",
      "문대표 3기처럼: 2주차 11/28(토) → 11/25(수) · 5주차 12/15(화) → 12/9(수) · 강의가 수요일이면 그 날 · 강의 요일을 안 정한 기수는 주차 시작일 이전 수요일");
    ok(SC43.weekIsOpen(mo, 1, "2026-10-01") && !SC43.weekIsOpen(mo, 2, "2026-11-24") && SC43.weekIsOpen(mo, 2, "2026-11-25") && !SC43.weekIsOpen(mo, 3, "2026-12-01") && SC43.weekIsOpen(mo, 5, "2026-12-09"),
      "1주차는 날짜와 상관없이 늘 열림 · 2주차는 11/24(화)엔 잠김 → 11/25(수) 0시부터 열림");
    const ap43 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), ad43 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), hp43 = fs.readFileSync(path.join(ROOT, "../ui/dg/HomePage.jsx"), "utf8");
    ok(/const openOf = \(w\) => DB\.weekUnlock\(CO, w\.no\);/.test(ap43) && /const isOpen = \(w\) => \(!!me && !!me\.demo && !preview\) \|\| DB\.weekIsOpen\(CO, w\.no, todayStr\(\)\);/.test(ap43) && /fmtMD\(openOf\(D\.weeks\[0\]\)\) \+ "에 1주차가 열려요/.test(ap43) && /fmtMD\(X\.openOf\(D\.weeks\[0\]\)\) \+ "에 1주차가 열려요/.test(hp43) &&
      /const open = DB\.weekUnlock\(co, w\.no\), dl = DB\.weekDeadline\(co, w\.no\);/.test(ad43) && /DB\.weekIsOpen\(co, w\.no, t\) \? "now" : "next"/.test(ad43),
      "강의실(예전 화면 · React)은 같은 규칙(DB.weekIsOpen)으로 열고 ‘N일부터 공개’ 도 그 날 · 체험(테스트) 계정은 예전처럼 다 열려요 · 강사센터 기수 주차 줄도 같은 규칙");
    ok(/if \(!ui\.curId \|\| ui\.curFor !== IID\(\)\) \{ const now = DB\.currentCohort\(IID\(\)\); ui\.curFor = IID\(\); ui\.curId = \(now && now\.curriculumId\) \|\| "main"; \}/.test(ad43) && /function curWarn\(cur, used\)/.test(ad43) && /case "cur-go": ui\.curId = d\.id;/.test(ad43) && /case "cur-use": \{ const co = DB\.cohort\(d\.co\); if \(co\) planForm\(co\.instructorId, Object\.assign\(\{\}, co, \{ curriculumId: d\.id \}\)\); break; \}/.test(ad43) && /'<section class="a-card a-cur-bar">' \+ curWarn\(cur, used\)/.test(ad43),
      "강사센터 커리큘럼: 처음엔 지금 기수(진행 중 → 모집 중)가 쓰는 커리큘럼 · 다른 커리큘럼을 고치면 ‘지금 N기 수강생 화면에는 …’ 안내 + 바로 가기 (예전 화면 · React 같은 줄)");
  }

  {
    console.log("44) 수강생마다 커리큘럼 (강사센터 › 수강생 관리 › 상세) · 문대표 3기 → 5주 기본 과정 (2026-11-09)");
    const vm44 = require("vm"), sb44 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb44.window = sb44; vm44.createContext(sb44); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm44.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb44, { filename: f })); sb44.DB.load();
    const D44 = sb44.DB, co44 = D44.data.cohorts.find((c) => c.instructorId === "moon" && c.curriculumId), curs44 = D44.curricula("moon");
    const st0 = { id: "t44", instructorId: "moon", cohortId: co44.id }, other = curs44.find((x) => x.id !== co44.curriculumId);
    const eff = D44.studentCohort(Object.assign({}, st0, { curriculumId: other.id })), same = D44.studentCohort(Object.assign({}, st0, { curriculumId: co44.curriculumId })), bad = D44.studentCohort(Object.assign({}, st0, { curriculumId: "nope" }));
    ok(D44.studentCohort(st0) === D44.cohort(co44.id) && same === D44.cohort(co44.id) && bad === D44.cohort(co44.id) && eff !== D44.cohort(co44.id) && eff.id === co44.id && D44.weeksOf(eff).length === other.weeks.length && D44.weeksOf(eff)[0].title === other.weeks[0].title && eff.startDate === co44.startDate && D44.cohort(co44.id).curriculumId === co44.curriculumId && D44.studentCohort(null) === null,
      "수강생 커리큘럼: 안 정했거나 기수와 같거나 없는 커리큘럼이면 기수 그대로 · 다른 커리큘럼이면 그 커리큘럼 전체(일정 · 기수 id 그대로 · 기수 기록은 안 바뀜)");
    const OO44 = require(path.join(TMP, "class/api/_lib/oneoff.js")), dd = { "cohorts:moon": [{ id: "c1", name: "1기" }, { id: "c4", name: "3기", startDate: "2026-11-21", curriculumId: "cur-4w", weeks: 4 }], "content:moon": { curriculumName: "5주 기본 과정", weeks: [1, 2, 3, 4, 5], curricula: [{ id: "cur-4w", name: "4주 압축 과정", weeks: [] }] } };
    const r44 = OO44.moon3CurMain((k) => dd[k]), n44 = r44.writes["cohorts:moon"];
    dd["cohorts:moon"] = n44; const r44b = OO44.moon3CurMain((k) => dd[k]);
    ok(!!n44 && !("curriculumId" in n44[1]) && n44[1].weeks === 4 && n44[1].startDate === "2026-11-21" && n44[0].name === "1기" && r44.result.from === "4주 압축 과정" && r44.result.to === "5주 기본 과정" && !Object.keys(r44b.writes).length && /이미 기본/.test(r44b.result.already) &&
      OO44.OPS.findIndex((x) => x.id === "2026-11-09-moon3-cur-main") > OO44.OPS.findIndex((x) => x.id === "2026-11-08-v2-teaser") && OO44.OPS.find((x) => x.id === "2026-11-09-moon3-cur-main").run === OO44.moon3CurMain,
      "일회성(문대표 3기): 4주 압축 과정 → 기본 커리큘럼(5주 기본 과정) · 진행 주차 4주 · 다른 칸 그대로 · 다시 돌려도 바꾸지 않아요");
    const ad44 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ap44 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), su44 = fs.readFileSync(path.join(ROOT, "../ui/center/Students.jsx"), "utf8");
    ok(/CO = DB\.studentCohort\(s\);/.test(ap44) && /const co = DB\.studentCohort\(me\);/.test(ap44) && /function stuCurField\(iid, s\)/.test(ad44) && /stuCurField\(iid, s\) \+/.test(ad44) && /if \(!cv \|\| \(co && \(co\.curriculumId \|\| "main"\) === cv\)\) delete tgt\.curriculumId; else tgt\.curriculumId = cv;/.test(ad44) &&
      !/DB\.stats\([^)]*DB\.cohort\(s\.cohortId\)\)/.test(ad44) && /DB\.studentCohort\(s\)\)/.test(su44) && /const levelOfStudent = \(s\) => DB\.level\(DB\.progress\(s\.id\), s\.instructorId, DB\.studentCohort\(s\)\);/.test(ad44),
      "강의실은 수강생이 보는 커리큘럼으로 · 강사센터 수강생 상세에 커리큘럼 고르기(기수 그대로 / 이 수강생만) · 진행률 · 성장 단계 · 주차 막대도 그 커리큘럼으로 (예전 화면 · React)");
  }

  {
    console.log("45) 글 속 주소는 파란 링크 · 새 창 (2026-11-09)");
    const vm45 = require("vm"), sb45 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb45.window = sb45; vm45.createContext(sb45); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm45.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb45, { filename: f }));
    const L45 = sb45.DB.linkify, A = (u) => '<a class="auto-link" href="' + u + '" target="_blank" rel="noopener">' + u + "</a>";
    ok(L45("어려우시다면 [코워크시티]를 이용하세요! https://www.doogoclass.com/curriculum/l1-1") === "어려우시다면 [코워크시티]를 이용하세요! " + A("https://www.doogoclass.com/curriculum/l1-1") &&
      L45("링크: https://a.com/x?y=1&z=2.") === "링크: " + A("https://a.com/x?y=1&amp;z=2") + "." && L45("(https://a.com/b)") === "(" + A("https://a.com/b") + ")" &&
      L45('<script>alert("x")</script> http://b.kr') === "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; " + A("http://b.kr") && L45('"https://c.com/d"') === "&quot;" + A("https://c.com/d") + "&quot;" && L45("주소 없음") === "주소 없음" && L45(null) === "" &&
      /class="auto-link" href="https:\/\/x\.com\/p" target="_blank"/.test(sb45.DB.rich("**굵게** https://x.com/p")),
      "주소 → 파란 링크(새 창): 끝의 마침표 · 괄호는 빼고 · 따옴표 · 태그는 이스케이프 그대로 · 서식 글(rich)도 같은 규칙");
    const ap45 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), le45 = fs.readFileSync(path.join(ROOT, "../ui/dg/Learn.jsx"), "utf8"), bo45 = fs.readFileSync(path.join(ROOT, "../ui/dg/Board.jsx"), "utf8"), st45 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
    ok(/DB\.linkify\(m\.desc\)/.test(ap45) && /"<li>" \+ DB\.linkify\(s\) \+ "<\/li>"/.test(ap45) && /DB\.linkify\(w\.goal\)/.test(ap45) && /DB\.linkify\(s\.review\.comment\)/.test(ap45) && /DB\.linkify\(f\.a\)/.test(ap45) && /DB\.linkify\(q\.body\)/.test(ap45) && /DB\.linkify\(e\.body\)/.test(ap45) &&
      /window\.DB\.linkify\(m\.desc\)/.test(le45) && /window\.DB\.linkify\(x\)/.test(le45) && /window\.DB\.linkify\(f\.a\)/.test(bo45) && /window\.DB\.linkify\(e\.body\)/.test(bo45) && /\.rich a, a\.auto-link \{ color: #1a6fe0;/.test(st45), 
      "과제 설명 · 이렇게 하세요 · 핵심 목표 · 강사 검수 의견 · FAQ 답 · 1:1 요청 · 강의 노트 · 메인 강의 안내에 주소 링크 (예전 화면 · React) · 파란색");
    ok(/'<div class="a-text">' \+ DB\.linkify\(sub\.text\)/.test(fs.readFileSync(path.join(ROOT, "admin.js"), "utf8")), "강사센터 검수 화면: 수강생이 적어 낸 글 속 주소도 링크");
  }

  {
    console.log("46) 강사센터 수정 창 ‘복사’ (2026-11-09)");
    const ad46 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ic46 = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8");
    ok(/btn\(icon\("copy", "sm"\) \+ "복사", "item-copy", "a-btn-ghost"\)/.test(ad46) && /case "item-copy": \{ const f = document\.getElementById\("coll-form"\); if \(f\) copyItem\(f\); break; \}/.test(ad46) && /\n    copy: '<rect/.test(ic46),
      "모든 수정 창(강의 · 과제 · 실무 체크리스트 · 주차 · 공지 · FAQ …)의 삭제 옆에 ‘복사’ 버튼");
    ok(/if \(!readFields\(form, def, cp, err\)\) return;/.test(ad46) && /if \(coll === "week"\) \{ reId\(cp\.lessons, "l"\); reId\(cp\.missions, "m"\); \}/.test(ad46) && /list\.splice\(at \+ 1, 0, item\)/.test(ad46) && /name="cpWeek"/.test(ad46),
      "복사: 지금 창 내용(저장 안 한 고침 포함) · 원본 바로 아래(주차는 맨 끝) · 새 번호 · 강의 · 과제는 넣을 주차 고르기 (화면 확인은 e2e reactdg 1-12)");
  }

  {
    console.log("47) 메뉴 순서: 주차별 강의 → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기 (2026-11-09)");
    const OO = require(path.join(ROOT, "api/_lib/oneoff.js")), ks = (a) => a.map((x) => x.key).join(",");
    const it = (k, extra) => Object.assign({ key: k, on: true }, extra || {});
    const old = ["home", "curriculum", "replays", "missions", "showcase", "notes", "schedule", "notices", "qna", "docs", "glossary", "cp_1"].map((k) => it(k, k === "docs" ? { label: "서류 챙기기", on: false } : null));
    const nx = OO.menuSeq(old), nx2 = OO.menuSeq([it("home"), it("cp_9"), it("curriculum"), it("notes"), it("missions"), it("docs")]);
    ok(!!nx && ks(nx) === "home,curriculum,missions,docs,replays,showcase,notes,schedule,notices,qna,glossary,cp_1" && nx.find((x) => x.key === "docs").label === "서류 챙기기" && nx.find((x) => x.key === "docs").on === false &&
      OO.menuSeq(nx) === null && !!nx2 && ks(nx2) === "home,cp_9,curriculum,missions,docs,notes" && OO.menuSeq([it("home"), it("missions")]) === null,
      "저장된 순서 정리: 과제 · 미션 · 실무 체크리스트 · 라이브 다시보기를 주차별 강의 바로 뒤로 (켜기 · 끄기 · 바꾼 이름 · 추가 메뉴는 그대로 · 이미 그 순서면 그대로)");
    const docs47 = { "ins:a": { id: "a", menu: { items: old.map((x) => Object.assign({}, x)) }, menuVod: { items: [it("home"), it("docs"), it("notices")] } }, "ins:b": { id: "b" }, "ins:c": { id: "c", menu: { items: nx.map((x) => Object.assign({}, x)) } } };
    const r47 = OO.menuOrder((k) => JSON.parse(JSON.stringify(docs47[k] || null)), (p) => Object.keys(docs47).filter((k) => k.indexOf(p) === 0));
    ok(Object.keys(r47.writes).join(",") === "ins:a" && ks(r47.writes["ins:a"].menu.items).indexOf("home,curriculum,missions,docs,replays,") === 0 && ks(r47.writes["ins:a"].menuVod.items) === "home,docs,notices" && r47.result.same === 1 &&
      OO.OPS.some((o) => o.id === "2026-11-09-menu-order" && o.run === OO.menuOrder),
      "일회성 2026-11-09-menu-order: 강사마다 저장된 LIVE 메뉴만 · VOD 메뉴 · 메뉴를 저장한 적 없는 강사는 그대로");
    const vm47 = require("vm"), sb47 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb47.window = sb47; vm47.createContext(sb47); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm47.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb47, { filename: f }));
    const D47 = sb47.DB; if (!D47.data) D47.load();
    const ins47 = (D47.data.instructors || []).find((x) => x && x.id === "moon") || (D47.data.instructors || [])[0];
    if (ins47) delete ins47.menu;
    const ad47 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), i47 = (t) => ad47.indexOf('["' + t + '", ');
    ok(ks(D47.STUDENT_MENUS).indexOf("home,curriculum,missions,docs,replays,showcase") === 0 && !!ins47 && ks(D47.menuConfig(ins47.id).items).indexOf("home,curriculum,missions,docs,replays,") === 0 &&
      i47("curriculum") > 0 && i47("curriculum") < i47("missions") && i47("missions") < i47("docs") && i47("docs") < i47("replays") && i47("replays") < i47("showcase") && /if \(vod\) \{ const di = content\.findIndex\(\(x\) => x\[0\] === "docs"\)/.test(ad47),
      "기본 순서(새 강사 · 저장 전) · 강사센터 왼쪽 메뉴도 주차별 강의 (커리큘럼) → 과제 · 미션 → 실무 체크리스트 → 라이브 다시보기 (VOD 강의실 꾸미기는 예전 순서)");
  }
  {
    console.log("48) 수강생 메뉴 = 강사센터 메뉴 구성 그대로 (두잉고 LIVE · 2026-11-09)");
    const ap48 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), mo48 = fs.readFileSync(path.join(ROOT, "../ui/dg/More.jsx"), "utf8");
    ok(/const needOk = \(key\) => TRACK !== "vod" \|\| !NEEDS\[key\] \|\| !!NEEDS\[key\]\(\);/.test(ap48) && /const on = \(key\) => DB\.menuOn\(MID\(\), key\) && needOk\(key\);/.test(ap48) && /items\.filter\(\(x\) => x\.on && needOk\(x\.key\)\)/.test(ap48) && ap48.indexOf("(!NEEDS[x.key] || NEEDS[x.key]())") < 0,
      "두잉고 LIVE: 켠 메뉴는 내용이 아직 없어도 왼쪽 메뉴 · 화면 그대로 (라이브 다시보기 · 모범 과제 · 용어 사전) — VOD 버전만 내용이 있을 때 (화면 확인은 e2e reactdg 1-14)");
    ok(/if \(on\("replays"\) && replaysSorted\(\)\.length\) out\.push\("지난 라이브 다시 볼래요"\)/.test(ap48) && /if \(!list\.length\) return \{ text: "아직 ‘" \+ ML\("replays"\)/.test(ap48) && /아직 등록된 용어가 없어요/.test(ap48) && /아직 등록된 용어가 없어요/.test(mo48),
      "비어 있을 때: AI 조교 ‘지난 라이브 다시 볼래요’ 칩은 영상이 있을 때만 · 물으면 ‘아직 올라온 영상이 없어요’ · 용어 사전 ‘아직 등록된 용어가 없어요’ (예전 화면 · React)");
  }
  {
    console.log("49) 응원 영상 큰 화면: 실제 유튜브 썸네일 그대로 (2026-11-09)");
    const st49 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8"), tail49 = st49.slice(st49.lastIndexOf("/* 응원 영상 큰 화면"));
    ok(/\.mv-player-wrap \.video \.vp-img \{ opacity: 1; mix-blend-mode: normal; \}/.test(tail49) && /\.mv-player-wrap \.video \.video-ph::after \{ display: none; \}/.test(tail49) && /\.mv-player-wrap \.video \.vp-title \{ visibility: hidden; \}/.test(tail49) && st49.lastIndexOf(".th-nz .video .vp-img") < st49.lastIndexOf(".mv-player-wrap .video .vp-img"),
      "응원 영상 큰 화면은 테마 색을 덮지 않은 썸네일 · 제목은 아래 줄에만 (뉴질랜드 테마 규칙보다 뒤 — 이겨요)");
  }
  {
    console.log("50) 문대표 1:1 상담 ACI EXPRESS · 제휴 혜택 13곳 · 메뉴 구성 저장 · 제휴 혜택 여백 (2026-11-09)");
    const OO = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const c0 = { channels: [{ id: "ch-bio", title: "두고바이오" }, { id: "ch-food", title: "두고푸드" }], partners: [{ id: "pt-cafe", group: "doogo", title: "두고 N카페" }, { id: "pt-food", group: "doogo", title: "두고푸드" }, { id: "pt-cowork", group: "partner", title: "코워크시티" }, { id: "pt-x", group: "partner", title: "챗봇나우", url: "https://cafe.naver.com/doogomarket/21" }] };
    const st50 = { "content:moon": c0 }, g50 = (k) => JSON.parse(JSON.stringify(st50[k] || null));
    const r1 = OO.moonAciPartners(g50), w1 = r1.writes["content:moon"];
    st50["content:moon"] = w1; const r2 = OO.moonAciPartners(g50);
    const ids = (w1 && w1.partners || []).map((x) => x.id);
    ok(!!w1 && w1.channels.map((x) => x.id).join(",") === "ch-bio,ch-food,ch-aci" && w1.channels[2].url === "https://pf.kakao.com/_DnnxlX" && w1.channels[2].label === "ACI EXPRESS 문의하기" &&
      ids.slice(0, 3).join(",") === "pt-cafe,pt-food,pt-aci" && ids.indexOf("pt-chatbotnow") < 0 && ids.length === 4 + 12 && r1.result.partners.length === 12 && !Object.keys(r2.writes).length && !!r2.result.already &&
      w1.partners.filter((x) => x.group === "partner" && OO.MOON_PARTNERS_1109.some((y) => y.id === x.id)).every((x) => /카페 글에서 확인하세요\.$/.test(x.desc) && /^https:\/\/cafe\.naver\.com\/doogomarket/.test(x.url)),
      "일회성 2026-11-09-moon-aci-partners: 1:1 상담 끝에 ACI EXPRESS(카톡 채널) · 두고그룹 끝에 ACI EXPRESS · 제휴사 12곳(같은 링크 · 이름이 있으면 건너뜀) · 두 번 돌려도 그대로");
    const vmc = require("vm"), sbc = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sbc.window = sbc; vmc.createContext(sbc); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vmc.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sbc, { filename: f }));
    const icOk = (list, k) => list.some((x) => x[0] === k);
    ok(icOk(sbc.DB.CHANNEL_ICONS, OO.MOON_ACI_CH.icon) && OO.MOON_PARTNERS_1109.every((x) => icOk(sbc.DB.PARTNER_ICONS, x.icon)),
      "새 카드 아이콘이 강사센터 아이콘 고르기에 있어요 (고쳐 저장해도 아이콘이 바뀌지 않게)");
    const ad50 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), st50c = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8"), raw50 = fs.readFileSync(path.join(ROOT, "../ui/lib/Raw.jsx"), "utf8");
    ok(/case "menu-save": menuSave\(\); break;/.test(ad50) && /const m = menuDraft\(\), it = m\.items\.find/.test(ad50) && ad50.indexOf('DB.menuConfig(ui.mMenuIns).items.find((x) => x.key === t.dataset.key); it.label = t.value.trim(); DB.save()') < 0 && /Object\.keys\(ui\.menuDrafts\)\.length/.test(ad50) &&
      /\.pt-tabs ~ \.pt-sec, \.pt-tabs ~ \.pt-sec \+ \.pt-sec \{ padding: 0; \}/.test(st50c) && /k === "disabled" \? true : ""/.test(raw50),
      "메뉴 구성: 고친 안 → ‘저장’ 눌러야 반영 · 저장 전 창 닫기 · 자동 로그아웃 막기 (화면 확인은 e2e reactdg 1-15) · 제휴 혜택 탭 아래 여백 없음 · React 조각의 disabled 버튼");
  }
  {
    console.log("51) 문대표 2주차 시장조사 → 벤치마킹 과제 · NZD 자동검수 빼기 (2026-11-09)");
    const OO = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const mk = () => ({ no: 2, title: "소싱", missions: [
      { id: "m2-1", title: "뉴질랜드 건강식품 시장조사 3개", type: "text", required: true, kind: "required", desc: "예전 설명", steps: ["a", "b"], check: { minLength: 120, keywords: ["NZD", "원"] }, templates: [{ id: "t-old", name: "2주차_시장조사.xlsx", data: "data:x" }] },
      { id: "m2-2", title: "공급처 3곳 비교", type: "text", check: { keywords: ["NZD"] }, desc: "그대로" }] });
    const st51 = { "content:moon": { weeks: [{ no: 1, missions: [] }, mk()], curricula: [{ id: "cur-4w", name: "4주 압축 과정", weeks: [{ no: 1, missions: [] }, mk()] }] } };
    st51["prog:moon:s1"] = { submissions: { "m2-1": [{ at: 1, result: { pass: false, reasons: ["‘NZD’가 들어가도록 적어 주세요."], ok: ["분량 130자 확인"] } }, { at: 2, result: { pass: false, reasons: ["내용을 조금 더 자세히 적어 주세요. (현재 0자 / 최소 120자)", "‘NZD’가 들어가도록 적어 주세요.", "‘원’이 들어가도록 적어 주세요."] }, review: { status: "approved" } }], "m2-2": [{ result: { pass: false, reasons: ["‘NZD’가 들어가도록 적어 주세요."] } }] } };
    st51["prog:moon:s2"] = { submissions: { "m1-1": [{ result: { pass: true, reasons: [] } }] } };
    const g51 = (k) => JSON.parse(JSON.stringify(st51[k] || null)), k51 = (pre) => Object.keys(st51).filter((x) => x.indexOf(pre) === 0);
    const r1 = OO.moonW2Benchmark(g51, k51), w1 = r1.writes["content:moon"], pw = r1.writes["prog:moon:s1"];
    st51["content:moon"] = w1; if (pw) st51["prog:moon:s1"] = pw; const r2 = OO.moonW2Benchmark(g51, k51);
    const sb = pw ? pw.submissions["m2-1"] : [];
    ok(!!pw && !r1.writes["prog:moon:s2"] && sb[0].result.pass === true && !sb[0].result.reasons.length && sb[1].result.pass === false && sb[1].result.reasons.length === 2 && sb[1].result.reasons.every((t) => !/NZD/.test(t)) &&
      JSON.stringify(pw.submissions["m2-2"]) === JSON.stringify(st51["prog:moon:s1"].submissions["m2-2"]) && r1.result.submissions.subs === 2 && r1.result.submissions.nowPass === 1,
      "이미 낸 제출: 자동검수 결과의 ‘NZD’ 문구 지우기 · 그것 하나 때문이었으면 통과로 · 다른 과제 · 다른 수강생 · 강사 검수는 그대로");
    const ms = w1 ? [w1.weeks[1].missions[0], w1.curricula[0].weeks[1].missions[0]] : [], m22 = w1 && w1.weeks[1].missions[1];
    ok(!!w1 && r1.result.missions.length === 2 && ms.every((m) => m.title === "뉴질랜드 건강식품 시장조사 3개" && m.type === "text" && m.check.minLength === 120 && JSON.stringify(m.check.keywords) === '["원"]' && m.desc === OO.W2B_DESC &&
        m.steps.length === 5 && /아래 칸에 정리해 제출/.test(m.steps[4]) && /공식몰/.test(m.steps.join(" ")) && m.templates.length === 1 && m.templates[0].id === "t-old" && m.templates[0].name === OO.W2B_FILE &&
        /^data:application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet;base64,UEsDB/.test(m.templates[0].data) && m.templates[0].size > 3000) &&
      m22.desc === "그대로" && JSON.stringify(m22.check.keywords) === '["NZD"]' && !Object.keys(r2.writes).length && !!r2.result.already,
      "2주차 시장조사(기본 · 4주 압축 과정 모두): 자동검수 단어 NZD 빼고 ‘원’은 그대로 · 설명 · 진행 방법 벤치마킹 · 엑셀 양식(같은 양식 번호) · 제목 · 제출 방식 · 최소 글자 수 그대로 · 다른 과제는 그대로 · 두 번 돌려도 그대로");
  }
  {
    console.log("52) 체험(테스트) 수강생 계정: 로그인 · 로그아웃마다 처음 상태로 (2026-11-09)");
    const DRS = require(path.join(ROOT, "api/_lib/demoreset.js")), OO = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const cos = [{ id: "c1", name: "1기", startDate: "2026-01-24", weeks: 4 }, { id: "c3", name: "3기", startDate: "2026-11-21" }, { id: "c9", name: "9기", startDate: "2026-11-01", weeks: 5 }];
    const ct = { weeks: [1, 2, 3, 4, 5].map((n) => ({ no: n })) }, T = "2026-11-10";
    ok(DRS.resettable({ demo: true, cohortId: "c3" }, cos, ct, T) && DRS.resettable({ demo: true, cohortId: "c9" }, cos, ct, T) && !DRS.resettable({ demo: true, cohortId: "c1" }, cos, ct, T) &&
      !DRS.resettable({ cohortId: "c3" }, cos, ct, T) && !DRS.resettable({ demo: "yes", cohortId: "c3" }, cos, ct, T) && DRS.resettable({ demo: true, cohortId: "nope" }, cos, ct, T) &&
      DRS.isFresh(DRS.fresh()) && !DRS.isFresh(Object.assign(DRS.fresh(), { watched: { l1: 1 } })) && !DRS.isFresh(Object.assign(DRS.fresh(), { extra: 1 })) && DRS.fresh().guideV === 2,
      "처음으로 돌릴 계정: demo: true 이고 진행 중 · 시작 전 기수 (끝난 기수의 수료 체험 계정 · 일반 수강생은 그대로)");
    const docs52 = { "cohorts:moon": cos, "content:moon": ct, "stu:moon:s1": { id: "s1", demo: true, cohortId: "c3" }, "stu:moon:demo1": { id: "demo1", demo: true, cohortId: "c1" }, "stu:moon:r1": { id: "r1", cohortId: "c3" },
      "prog:moon:s1": Object.assign(DRS.fresh(), { submissions: { "m2-1": [{ at: 1, review: { status: "approved" } }] }, watched: { l1: 1 } }), "prog:moon:demo1": { submissions: { x: [{}] } }, "prog:moon:r1": { watched: { l1: 1 } },
      "cohorts:choi": [{ id: "k1", startDate: "2026-12-01" }], "stu:choi:d1": { id: "d1", demo: true, cohortId: "k1" } };
    const g52 = (k) => JSON.parse(JSON.stringify(docs52[k] === undefined ? null : docs52[k])), k52 = (pre) => Object.keys(docs52).filter((x) => x.indexOf(pre) === 0);
    const r52 = OO.demoResetNow(g52, k52), w52 = r52.writes;
    ok(Object.keys(w52).sort().join(",") === "prog:choi:d1,prog:moon:s1" && DRS.isFresh(w52["prog:moon:s1"]) && DRS.isFresh(w52["prog:choi:d1"]) && r52.result.kept.length === 1 && OO.OPS.some((o) => o.id === "2026-11-09-demo-reset"),
      "배포 때 한 번: 모든 강사의 체험 계정 기록을 처음으로 (문대표 · 다른 강사) · 수료 체험 계정 · 일반 수강생은 그대로");
    const au52 = fs.readFileSync(path.join(ROOT, "api/auth.js"), "utf8"), ap52 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
    ok(/if \(s\.demo === true\) await DEMO\.resetDemo\(iid, s\.id\)/.test(au52) && au52.indexOf("await DEMO.resetDemo(iid, s.id)") < au52.indexOf('auth.setCookie(req, res, "student", auth.sign') &&
      /const ids = await auth\.identify\(req\)\.catch\(\(\) => null\);\s+if \(ids && ids\.student && w\.indexOf\("student"\) >= 0\) await DEMO\.resetDemo\(ids\.student\.iid, ids\.student\.sid\)/.test(au52) &&
      au52.indexOf("await DEMO.resetDemo(ids.student.iid") < au52.indexOf('w.forEach((x) => auth.setCookie(req, res, x, ""))') && /const isOpen = \(w\) => \(!!me && !!me\.demo && !preview\) \|\|/.test(ap52),
      "수강생 로그인(쿠키 주기 전) · 로그아웃(쿠키 지우기 전 · 자동 로그아웃 포함)에서 처음으로 · 체험 계정은 일정과 상관없이 모든 주차가 열려요 (실제 동작은 e2e reactdg 1-16)");
  }
  {
    console.log("53) 강사센터 수강생 상세 ‘체험(테스트) 계정’ · 2주차 제목 ‘시장조사 3개’ (2026-11-10)");
    const ad53 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), st53 = fs.readFileSync(path.join(ROOT, "../ui/center/Students.jsx"), "utf8"), ac53 = fs.readFileSync(path.join(ROOT, "api/_lib/access.js"), "utf8");
    ok(/<input type="checkbox" name="demo"' \+ \(s\.demo === true \? " checked" : ""\)/.test(ad53) && /if \(f\.demo\) \{ if \(f\.demo\.checked\) tgt\.demo = true; else delete tgt\.demo; \}/.test(ad53) &&
      /s\.demo === true \? '<span class="a-demo-tag"/.test(ad53) && /s\.demo === true \? <span className="a-demo-tag"/.test(st53) && /case "stu":\n\s+if \(instructorOf\(ids, K\.iid\) \|\| \(coachOf\(ids, K\.iid\) && coachCan\(ids, \["students"\]\)\)\)/.test(ac53),
      "수강생 상세 체크 칸으로 체험 계정 켜기 · 끄기 (끄면 칸 지움) · 수강생 목록 ‘체험’ 표시(예전 화면 = React) · 서버: 강사 · 수강생 관리 코치만 수강생 기록을 고쳐요 (수강생 본인은 못 바꿔요)");
    const OO = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const st = { "content:moon": { weeks: [{ no: 2, missions: [{ id: "m2-1", title: "⭐ 뉴질랜드 건강식품 시장조사 3개" }] }], curricula: [{ id: "cur-4w", name: "4주 압축 과정", weeks: [{ no: 2, missions: [{ id: "m2-1", title: "뉴질랜드 건강식품 시장조사 10개", desc: "그대로" }, { id: "m2-2", title: "공급처 10개" }] }] }] } };
    const g = (k) => JSON.parse(JSON.stringify(st[k] || null)), r1 = OO.moonW2Title3(g), w = r1.writes["content:moon"];
    st["content:moon"] = w; const r2 = OO.moonW2Title3(g);
    ok(!!w && w.curricula[0].weeks[0].missions[0].title === "뉴질랜드 건강식품 시장조사 3개" && w.curricula[0].weeks[0].missions[0].desc === "그대로" && w.curricula[0].weeks[0].missions[1].title === "공급처 10개" &&
      w.weeks[0].missions[0].title === "⭐ 뉴질랜드 건강식품 시장조사 3개" && r1.result.titles.length === 1 && !Object.keys(r2.writes).length,
      "일회성 2026-11-10-moon-w2-title-3: ‘시장조사 10개’ → ‘시장조사 3개’ (4주 압축 과정 · 제목만 · 다른 과제 그대로 · 두 번 돌려도 그대로)");
  }

  {
    console.log("54) 문대표 종이책 최종 표지 · 판매가 14,900원 + 배송비 3,500원 · 목차 (2026-11-10)");
    const OO = require(path.join(ROOT, "api/_lib/oneoff.js")), BK = require(path.join(ROOT, "api/_lib/books.js")).MOON_BOOK, PR = require(path.join(ROOT, "shared/price.js"));
    const vs54 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), m54 = vs54.match(/^  const MOON_BOOK = (\{.*\});$/m);
    const lz = (BK.curriculum || []).reduce((a, c) => a.concat(c.lessons || []), []);
    ok(!!m54 && JSON.stringify(JSON.parse(m54[1])) === JSON.stringify(BK) && BK.price === 15900 && BK.sale === null && BK.shipFee === 3500 && BK.pages === 168 &&
      BK.curriculum.length === 5 && lz.length === 25 && lz.every((l) => l.id && l.title && Number(l.min) > 0) && /moon-cover2\.webp$/.test(BK.cover) && BK.detailImgs.length === 2 &&
      ["cover2", "mock2", "spread2"].every((n) => fs.existsSync(path.join(ROOT, "assets/vod/book/moon-" + n + ".webp"))) && !fs.existsSync(path.join(ROOT, "assets/vod/book/moon-cover.webp")),
      "책 상품(서버 books.js = 화면 vod.js): 정가 15,900원(할인은 첫 책 쿠폰으로 · 57) · 배송비 3,500원 · 168쪽 · 목차 5장 25꼭지 · 새 표지 이미지 3장");
    const oldBook = { id: "b1", type: "book", title: BK.title, price: 15900, sale: null, shipFee: 0, pages: null, size: "", cover: "assets/vod/book/moon-cover.webp", curriculum: [],
      detailImgs: [{ url: "assets/vod/book/moon-mock.webp", name: "앞표지 · 뒤표지" }, { url: "assets/vod/book/moon-spread.webp", name: "x" }, { url: "/api/file?h=abc", name: "마스터가 올린 사진" }],
      sub: "0원에서 시작한 사람이 건네는 4단계 차선 변경법 · 문대표 첫 책", pitch: "마스터가 고친 소개", learn: ["a"], who: [], intro: "" };
    const meta = { vod: { products: [{ id: "v1", title: "x" }, oldBook], settings: {} }, other: 1 }, cat = { at: 1, products: [{ id: "v1" }, { id: "b1", type: "book", status: "on", price: 15900, sale: null, shipFee: 0, stock: "" }] };
    const r = OO.moonBookFinal((k) => JSON.parse(JSON.stringify(k === "meta" ? meta : k === "vcat" ? cat : null))), b = r.writes.meta.vod.products[1], c = r.writes.vcat.products[1];
    ok(b.cover === BK.cover && b.detailImgs.length === 3 && b.detailImgs[0].url === BK.detailImgs[0].url && b.detailImgs[2].url === "/api/file?h=abc" && b.sale === null && b.shipFee === 3500 && b.pages === 168 && b.curriculum.length === 5 &&
      b.sub === BK.sub && b.pitch === "마스터가 고친 소개" && JSON.stringify(b.learn) === '["a"]' && JSON.stringify(b.who) === JSON.stringify(BK.who) && b.intro === BK.intro &&
      r.result.kept.join(",") === "pitch,learn" && r.writes.meta.other === 1 && r.writes.meta.vod.products[0].title === "x" && c.sale === null && c.shipFee === 3500 && c.price === 15900 && c.stock === "" && r.writes.vcat.at === 1 &&
      OO.OPS.some((o) => o.id === "2026-11-10-moon-book-final" && o.run === OO.moonBookFinal),
      "일회성 2026-11-10-moon-book-final: 표지 · 목업 · 펼침면 교체(마스터가 올린 사진은 뒤에 그대로) · 판매가 · 배송비 · 쪽수 · 목차 · 처음 글 그대로인 칸만 새 글(고친 글은 그대로) · 결제 가격표도 같이");
    const p2 = OO.moonBookFinal((k) => (k === "meta" ? { vod: { products: [], settings: {} } } : k === "vcat" ? { products: [] } : null));
    const P = require(path.join(ROOT, "api/_lib/vodprice.js")), pr = P.pricer ? P.pricer({ products: [c] }, Date.now()) : null;
    ok(p2.writes.meta.vod.products[0].id === "b1" && p2.writes.vcat.products[0].sale === null && p2.writes.vcat.products[0].dg === false && (!pr || (pr.priceOf(pr.product("b1")) === 15900 && pr.shipOf(pr.product("b1")) === 3500)),
      "책이 없던 곳엔 새로 넣기 · 서버 가격 계산: 15,900원 · 배송비 3,500원(주문마다 한 번)");
    const pp = fs.readFileSync(path.join(ROOT, "../ui/store/ProductPage.jsx"), "utf8");
    ok(/icon\(bk \? "book" : own \|\| l\.preview/.test(vs54) && /<Icon n=\{bk \? "book" : own \|\| l\.preview/.test(pp) && /\(t === "ebook" \|\| bk \? \(ch\.lessons \|\| \[\]\)\.reduce/.test(vs54) && /\{t === "ebook" \|\| bk \? \(ch\.lessons \|\| \[\]\)\.reduce/.test(pp) &&
      /\(bk \? "읽기" : "강의"\) \+ ' 전과 후/.test(vs54) && /\{v\.bk \? "읽기" : "강의"\} 전과 후/.test(pp),
      "종이책 목차: 장마다 쪽수 · 꼭지 아이콘 책(자물쇠 아님) · ‘읽기 전과 후’ (예전 화면 = React)");
  }

  {
    console.log("55) 문대표 3기 5주차 12/15(화) 온라인 강의 · 주차별 녹화본 업로드 · 과제 마감일 (2026-11-10)");
    const SCH = require(path.join(ROOT, "shared/schedule.js")), OO = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const co = { startDate: "2026-11-21", classDow: 6, classDates: { 5: "2026-12-15" }, classOver: { 5: { mode: "online", replay: "2026-12-16", due: "2026-12-18" }, 3: { due: "nope" } } };
    ok(SCH.weekDeadline(co, 5) === "2026-12-18" && SCH.weekDeadline(co, 4) === "2026-12-18" && SCH.weekDeadline(co, 3) === "2026-12-11" && SCH.classDate(co, 5) === "2026-12-15" && SCH.weekUnlock(co, 5) === "2026-12-09" &&
      SCH.cohortEnd(co, 5) === "2026-12-25" && SCH.dueOver(co, 5) === "2026-12-18" && SCH.dueOver(co, 3) === null && SCH.weekDeadline({ startDate: "2026-11-21", classDates: { 5: "2026-12-30" } }, 5) === "2026-12-30",
      "과제 마감일: 주차별로 정한 날(classOver.due) → 없으면 예전 규칙(주차 시작 + 6일 · 늦춘 강의일) · 잘못된 날짜는 무시 · 기수 기간은 그대로");
    const db55 = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), ad55 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    ok(/date: replayOver\(co, w\.no\) \|\| addDays\(date, rpAfter\)/.test(db55) && /replay: v\("lr"\), due: v\("ld"\)/.test(ad55) && /x\.replay = o\.replay; if \(\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(o\.due \|\| ""\)\) x\.due = o\.due;/.test(ad55) &&
      /주차 과제 마감일은 강의일\(/.test(ad55) && /name="pl-lr-' \+ no/.test(ad55) && /name="pl-ld-' \+ no/.test(ad55),
      "캘린더 녹화본 업로드: 주차별로 정한 날 → 없으면 강의 N일 뒤 · 기수 설계에 칸 2개(녹화본 업로드 · 과제 마감, 강의일 전은 막기 · 저장해도 안 지워져요 — 실제 동작은 e2e reactdg 1-18)");
    const cos = [{ id: "c2", name: "2기", startDate: "2026-08-01" }, { id: "c4", name: "3기", startDate: "2026-11-21", classDow: 6, classTime: "12:00", classOver: { 4: { time: "09:00", topic: "자동화" } }, classDates: { 2: "2026-11-22" } }];
    const ct = { weeks: [1, 2, 3, 4, 5].map((n) => ({ no: n, title: n + "주" })), curricula: [{ id: "cur-4w", weeks: [1, 2, 3, 4].map((n) => ({ no: n })) }],
      schedule: [{ id: "e-m3-bonus", type: "online", scope: "cohort", cohortId: "c4", date: "2026-12-15", time: "19:00", end: "22:00", place: "ZOOM 라이브", url: "https://zoom.us/j/1", title: "5주차 온라인 강의 — 광고의 모든것" },
        { id: "e-m3-ch4", type: "challenge", scope: "cohort", cohortId: "c4", date: "2026-12-16", title: "챌린지 4회차" }, { id: "g1", type: "guest", scope: "cohort", cohortId: "c4", date: "2026-12-15", title: "초청 특강" }] };
    const run55 = (list, c) => OO.moon3W5Online((k) => JSON.parse(JSON.stringify(k === "cohorts:moon" ? list : k === "content:moon" ? c : null)));
    const r = run55(cos, ct), n = r.writes["cohorts:moon"] && r.writes["cohorts:moon"][1], o5 = n && n.classOver[5], sc = r.writes["content:moon"] && r.writes["content:moon"].schedule;
    ok(!!n && n.classDates[5] === "2026-12-15" && o5.mode === "online" && o5.time === "19:00" && o5.end === "22:00" && o5.url === "https://zoom.us/j/1" && o5.topic === "광고의 모든것" && o5.replay === "2026-12-16" && o5.due === "2026-12-18" &&
      n.classOver[4].topic === "자동화" && n.classDates[2] === "2026-11-22" && r.writes["cohorts:moon"][0].name === "2기" && sc.length === 2 && !sc.some((e) => e.id === "e-m3-bonus") && sc.some((e) => e.id === "g1") &&
      SCH.classDate(n, 5) === "2026-12-15" && SCH.weekDeadline(n, 5) === "2026-12-18" && OO.OPS.some((o) => o.id === "2026-11-10-moon3-w5-online" && o.run === OO.moon3W5Online),
      "일회성 2026-11-10-moon3-w5-online: 3기 5주차 → 12/15(화) 19:00~22:00 온라인(입장 링크 · 장소 옮김) · 녹화본 12/16 · 마감 12/18 · 겹치는 12/15 특별 일정만 지우기(챌린지 · 초청강사 · 다른 주차 · 2기 그대로)");
    const r4 = run55([Object.assign({}, cos[1], { curriculumId: "cur-4w" })], ct), rw = run55([Object.assign({}, cos[1], { weeks: 4 })], ct), rs = run55([Object.assign({}, cos[1], { startDate: "2026-11-28" })], ct);
    ok(!Object.keys(r4.writes).length && /4주 과정/.test(r4.result.skipped) && !Object.keys(rw.writes).length && !Object.keys(rs.writes).length,
      "3기가 4주 과정이거나 1주차가 11/21이 아니면 건드리지 않아요");
  }

  {
    console.log("56) 강의 목록 설명은 요약만 · 자료는 준비된 것 먼저 (2026-11-10)");
    const vm56 = require("vm"), sb = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb.window = sb; vm56.createContext(sb); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm56.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f }));
    const B = sb.DB.brief, desc = "## 강의에서 배우는 내용\n- 코워크시티에 이메일로 회원가입하고 휴대전화 인증을 완료합니다.\n- 사업자 유형, 업종을 **선택**해요.\n\n[사진1]\n---\n## 할인코드 확인\n> 아래 카페 글에서 확인";
    ok(B(desc) === "코워크시티에 이메일로 회원가입하고 휴대전화 인증을 완료합니다. 사업자 유형, 업종을 선택해요. 아래 카페 글에서 확인" && B("## 제목만") === "제목만" && B("") === "" && B(null) === "" && B("한 줄 설명") === "한 줄 설명",
      "요약: 소제목 · 목록 기호 · 굵게 · 사진 자리 · 구분선을 빼고 한 줄로 (소제목뿐이면 소제목)");
    const ap = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), le = fs.readFileSync(path.join(ROOT, "../ui/dg/Learn.jsx"), "utf8"), li = fs.readFileSync(path.join(ROOT, "../ui/dg/Lib.jsx"), "utf8"), cs = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
    ok(/<div class="lesson-desc">' \+ esc\(DB\.brief\(l\.desc\)\) \+ "<\/div>" \+ \(lessonLong\(l\) \? '<span class="lesson-more">자세히 보기'/.test(ap) && /<div className="lesson-desc">\{DB\.brief\(l\.desc\)\}<\/div>\{X\.lessonLong\(l\) \? <span className="lesson-more">자세히 보기/.test(le) &&
      /\.lesson \.lesson-desc \{ display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;/.test(cs) && /\(DB\.rich\(l\.desc\)\)|DB\.rich\(l\.desc\)/.test(ap),
      "강의 목록: 요약 두 줄(휴대폰 세 줄) · 길면 ‘자세히 보기’ · 강의 화면은 전체 서식 그대로 (예전 화면 = React)");
    const rf = (list) => list.filter((it) => !!(it && (it.tool === "calculator" || it.url))).concat(list.filter((it) => !(it && (it.tool === "calculator" || it.url))));
    const L = [{ id: "a" }, { id: "b", tool: "calculator" }, { id: "c" }, { id: "d", url: "/x" }];
    ok(/const readyFirst = \(list\) => list\.filter\(resReady\)\.concat\(list\.filter\(\(x\) => !resReady\(x\)\)\);/.test(ap) && /body = readyFirst\(items\)\.map/.test(ap) && /else body = X\.readyFirst\(items\)\.map/.test(li) && rf(L).map((x) => x.id).join("") === "bdac",
      "자료 파일: 바로 쓸 수 있는 것(다운로드 · 계산기)을 위로 · 준비 중은 아래로 · 같은 묶음 순서는 그대로 (예전 화면 = React)");
  }

  {
    console.log("57) 첫 책 1,000원 할인 쿠폰 — 회원마다 한 장 · 기한 없음 · 전자책 · 종이책 (2026-11-10)");
    const PR = require(path.join(ROOT, "shared/price.js")), OO = require(path.join(ROOT, "api/_lib/oneoff.js")), VP = require(path.join(ROOT, "api/_lib/vodprice.js")), B = PR.BOOK_CP;
    const book = { id: "b1", type: "book", status: "on", price: 15900, sale: null, shipFee: 3500 }, bookS = Object.assign({}, book, { id: "b2", sale: 14900 }), eb = { id: "e1", type: "ebook", status: "on", price: 19900 }, vod = { id: "v1", type: "vod", status: "on", price: 99000 };
    const X = VP.pricer({ products: [book, bookS, eb, vod], coupons: [B] }, Date.now()), welcome = { id: "w", kind: "won", value: 5000, types: [] }, big = { id: "g", kind: "won", value: 3000, types: ["book"] };
    ok(B.id === "cp-book1000" && B.auto === "signup" && !B.days && !B.endAt && B.value === 1000 && JSON.stringify(B.types) === '["ebook","book"]' &&
      X.couponOff(B, book, 15900) === 1000 && X.couponOff(B, book, 31800) === 1000 && X.couponOff(B, eb, 19900) === 1000 && X.couponOff(B, vod, 99000) === 0 && X.couponOff(welcome, book, 15900) === 0 &&
      X.couponOff(big, book, 15900) === 1590 && X.couponOff(B, bookS, 14900) === 590 && X.couponOff(big, bookS, 14900 * 2) === 1180,
      "쿠폰 규칙: 첫 책 쿠폰은 전자책 · 종이책에 1,000원 (VOD는 안 돼요) · 종이책엔 ‘종이책’을 고른 쿠폰만(가입 5,000원 쿠폰은 안 돼요) · 판매가 할인과 합쳐 정가의 10%까지(도서정가제)");
    const st = { meta: { vod: { products: [Object.assign({}, book, { sale: 14900 })], coupons: [{ id: "cp-welcome" }] }, other: 1 }, vcat: { at: 1, products: [Object.assign({}, book, { sale: 14900 })], coupons: [{ id: "cp-welcome" }] },
      "vm:a": { id: "a", coupons: [{ id: "x", cid: "cp-welcome" }] }, "vm:b": { id: "b", coupons: [{ id: "y", cid: B.id, usedAt: 1 }] }, "vm:c": { id: "c", withdrawnAt: 1, coupons: [] }, "vm:d": { id: "d" } };
    const g = (k) => JSON.parse(JSON.stringify(st[k] === undefined ? null : st[k])), ks = (pre) => Object.keys(st).filter((k) => k.indexOf(pre) === 0);
    const r = OO.bookCoupon(g, ks), w = r.writes;
    ok(w.meta.vod.coupons.length === 2 && w.meta.vod.coupons[1].id === B.id && w.meta.vod.products[0].sale === null && w.meta.vod.v24 === 1 && w.meta.other === 1 && w.vcat.coupons[1].id === B.id && w.vcat.products[0].sale === null && w.vcat.at === 1 &&
      w["vm:a"].coupons.length === 2 && w["vm:a"].coupons[1].cid === B.id && w["vm:a"].coupons[1].exp === "" && !w["vm:a"].coupons[1].usedAt && !w["vm:b"] && !w["vm:c"] && w["vm:d"].coupons.length === 1 && r.result.members === 2 && r.result.had === 1 &&
      OO.OPS.some((o) => o.id === "2026-11-10-book-coupon" && o.run === OO.bookCoupon),
      "일회성 2026-11-10-book-coupon: 쿠폰을 마스터 목록 · 결제 가격표에 · 책 판매가 14,900원 → 없음(정가) · 가입한 회원에게 한 장씩(이미 가진 · 쓴 회원 · 탈퇴 회원은 그대로)");
    Object.keys(w).forEach((k) => { st[k] = w[k]; }); const r2 = OO.bookCoupon(g, ks);
    ok(r2.result.members === 0 && r2.writes.meta.vod.coupons.length === 2 && r2.writes.vcat.coupons.length === 2 && /그대로/.test(r2.result.book), "두 번 돌려도 쿠폰 · 회원 쿠폰이 늘지 않아요");
    const vs = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), co = fs.readFileSync(path.join(ROOT, "../ui/store/CheckoutPage.jsx"), "utf8"), vd = fs.readFileSync(path.join(ROOT, "api/_lib/vod.js"), "utf8");
    ok(/k === "course" && \(!bk \|\| cps\.length\) && !rbC \?/.test(vs) && /k === "course" && \(!bk \|\| cps\.length\) && !rbC \?/.test(co) && /\(k === "course" && \(!bk \|\| cps\.length\) \? '<div><dt>쿠폰 할인<\/dt>/.test(vs) && /k === "course" && \(!bk \|\| cps\.length\) \? <div><dt>쿠폰 할인<\/dt>/.test(co) &&
      /c\.auto === "signup" && c\.on !== false\)\.forEach\(\(c\) => m\.coupons\.push/.test(vd) && /cp = def \? X\.couponOff\(def, p, pr\) : 0;/.test(vd),
      "결제 화면: 종이책도 쓸 수 있는 쿠폰이 있으면 쿠폰 칸 · 쿠폰 할인 줄 (예전 화면 = React) · 새 회원은 가입할 때 자동으로 · 서버가 쿠폰 금액을 다시 계산 (실제 결제 18,400원은 e2e reactdg 1-20)");
  }

  {
    console.log("58) 코치센터 · 모든 센터 로고 → 대시보드 · 코치 대시보드 핵심 업무 · 운영팀 상담 버튼 (2026-11-10)");
    const ad = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), sh = fs.readFileSync(path.join(ROOT, "../ui/center/Shell.jsx"), "utf8"), da = fs.readFileSync(path.join(ROOT, "../ui/center/Dashboard.jsx"), "utf8"), cs = fs.readFileSync(path.join(ROOT, "admin.css"), "utf8");
    const cd = ad.slice(ad.indexOf("  function coachDashboard() {"), ad.indexOf("  function pageDashboard() {")), rc = da.slice(da.indexOf("function CoachDash() {"), da.indexOf("/* ---------- VOD 두잉고"));
    ok(/class="a-logo-home' \+ \(dcL \? " a-logo-dc" : ""\) \+ '" href="' \+ homeOf\(groups\) \+ '"/.test(ad) && /href=\{A\.homeOf\(groups\)\}/.test(sh) && !/href=\{dcL \? "#\/vod" : "#\/doinggo"\}/.test(sh) &&
      /const homeOf = \(groups\) => \{ const f = groups && groups\[0\] && groups\[0\]\[1\] && groups\[0\]\[1\]\[0\]; return "#\/center" \+ \(f && f\[0\] \? "\/" \+ f\[0\] : ""\); \};/.test(ad),
      "로고: 강사 · 코치 · 마스터 · 파트너 · 온드미디어 센터 모두 지금 탭의 대시보드(왼쪽 메뉴 첫 칸)로 — 두잉고 첫 화면으로 가지 않아요 (예전 화면 = React)");
    ok(/coachCore\(\) \+/.test(cd) && !/coachMenusCard\(\)/.test(cd) && !/a-kpis/.test(cd) && /coachMore\(\);/.test(cd) && /<Isl html=\{A\.coachCore\(\)\} \/>/.test(rc) && !/coachMenusCard/.test(rc) && /<Isl html=\{A\.coachMore\(\)\} \/>/.test(rc) &&
      /can\("cohorts"\) \? \["cohorts", "layers", "기수 관리"/.test(ad) && /can\("students"\) \? \[n\.pending \? "students\?status=pending" : "students", "users", "수강생 관리"/.test(ad) && /can\("reviews"\) \? \["reviews", "checks", "과제 검수"/.test(ad) && /can\("questions"\) \? \["questions", "bug", "1:1 요청 답변"/.test(ad) &&
      /a-top-course/.test(ad) && /a-top-course/.test(sh) && /\.a-side-kk \{ display: flex !important; align-items: center; justify-content: center; gap: 6px; width: 100%;/.test(cs),
      "코치 대시보드(LIVE): 핵심 업무 카드 기수 관리 · 수강생 관리 · 과제 검수 · 1:1 요청 답변(맡은 것만) · ‘내가 맡은 메뉴’ 칸 없음 · 주차 일정 · 수강생 진행 현황 · 머리글 강의 제목 · 운영팀 상담 버튼 한 줄 가운데 (실제 화면은 e2e reactdg 1-21)");
  }

  {
    console.log("35) 무통장 입금은 받지 않아요 (2026-11-15 · 예전 스위치 자동 · 늘 받기 · 받지 않기는 2026-11-11) · 이미 들어온 무통장 주문 · 현금영수증");
    const BKL = require(path.join(TMP, "class/api/_lib/bank.js")), keepK = { c: process.env.TOSS_CLIENT_KEY, s: process.env.TOSS_SECRET_KEY };
    const live = (on) => { if (on) Object.assign(process.env, { TOSS_CLIENT_KEY: "live_ck_x", TOSS_SECRET_KEY: "live_sk_x" }); else Object.assign(process.env, { TOSS_CLIENT_KEY: keepK.c, TOSS_SECRET_KEY: keepK.s }); };
    ok(BKL.openOf({}) === false && BKL.openOf(null) === false && BKL.openOf({ bankMode: "auto" }) === false && BKL.openOf({ bankMode: "off" }) === false && BKL.openOf({ bankMode: "weird" }) === false && BKL.openOf({ bankMode: "on" }) === true && (live(true), BKL.openOf({ bankMode: "on" }) && !BKL.openOf({})) && (live(false), true),
      "규칙: 기본 · 예전 ‘자동’ · 받지 않기 · 모르는 값 = 받지 않아요 (토스 키와 상관없이) · 화면에 없는 \"on\" 일 때만 (일회성 작업이 운영의 예전 값을 지워요)");
    const setMode = async (mode) => { useJar({ dc_a: auth.sign({ r: "master" }) }); const j0 = await boot(), mt = docOf(j0, "meta"); mt.vod.settings = Object.assign({}, mt.vod.settings, { bank: "국민은행", account: "123-456", holder: "(주)두고홀딩스" }, mode ? { bankMode: mode } : {}); if (!mode) delete mt.vod.settings.bankMode; return sync([{ k: "meta", base: verOf(j0, "meta"), put: mt }]); };
    await setMode(null);
    useJar({}); await store.rlClear(["vip:1.2.3.4"]);
    r = await call("vod-auth", { body: { action: "signup", email: "bk35@example.com", pw: "test1234a", pw2: "test1234a", name: "무OO", phone: "010-0000-3535", agree: true } });
    const memJ = saveJar();
    const prep = (cash) => call("vod-pay", { body: Object.assign({ action: "prepare", pid: "v5", kind: "course", plan: 365, method: "bank", depositor: "무OO" }, cash ? { cashRcpt: cash } : {}) });
    r = await prep({ type: "p", no: "010-1234-5678" });
    ok(r.status === 409 && /무통장/.test(r.json.message) && !r.json.no, "기본(설정 없음 · 토스 시험 키여도): 새 무통장 주문은 받지 않아요 (2026-11-15)", r.json);
    // 이미 들어온 무통장 주문 처리 확인용으로 잠깐 예전 값 "on" (화면에서는 켤 수 없어요)
    await setMode("on"); useJar(memJ);
    r = await prep({ type: "p", no: "010-1234-5678" });
    const no35 = r.json.no;
    ok(r.json.ok && r.json.bank && (await store.getDoc("vo:" + no35)).v.cashRcpt.type === "p" && (await store.getDoc("vo:" + no35)).v.cashRcpt.no === "01012345678", "예전 값 \"on\" 일 때만 무통장 주문 · 현금영수증(소득공제 · 숫자만) 주문에 남김", r.json);
    live(true);
    r = await prep({ type: "b", no: "123-45-67890" });
    const no35b = r.json.no;
    ok(r.json.ok && r.json.bank && (await store.getDoc("vo:" + no35b)).v.cashRcpt.no === "1234567890", "\"on\": 라이브 키여도 무통장 주문 (지출증빙 사업자번호)", r.json);
    await setMode("off"); useJar(memJ);
    live(false);
    r = await prep();
    ok(r.status === 409 && /무통장/.test(r.json.message), "받지 않기: 새 무통장 주문은 막아요", r.json);
    r = await call("vod-pay", { body: { action: "cancelPending", no: no35 } });
    ok(r.json.ok && (await store.getDoc("vo:" + no35)).v.status === "canceled", "막혀 있어도 이미 들어온 무통장 주문은 회원이 입금 전 취소할 수 있어요", r.json);
    useJar({ dc_a: auth.sign({ r: "master" }) });
    r = await call("vod-pay", { body: { action: "bankOk", no: no35b } });
    const o35 = (await store.getDoc("vo:" + no35b)).v;
    ok(r.json.ok && o35.status === "paid" && o35.cashRcpt.type === "b", "받지 않기여도 이미 들어온 무통장 주문은 마스터가 입금 확인 (현금영수증 신청은 그대로)", { r: r.json, st: o35.status });
    // 마스터가 홈택스에서 발급한 뒤 ‘발급 완료’ 표시 (화면 저장 — 무통장 주문은 결제 칸 잠금 대상이 아니에요)
    const j35 = await boot();
    r = await sync([{ k: "vo:" + no35b, base: verOf(j35, "vo:" + no35b), ops: [{ p: ["cashRcpt", "done"], v: Date.now() }] }]);
    ok(r.results && !r.results[0].error && (await store.getDoc("vo:" + no35b)).v.cashRcpt.done > 0, "마스터: 현금영수증 ‘발급 완료’ 표시 저장", r);
    await setMode("on"); useJar({}); // 뒤 시험들이 쓰는 예전 무통장 흐름 그대로 (시험 DB 만)
    const vj = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), aj = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), mo = fs.readFileSync(path.join(ROOT, "../ui/center/MasterOrders.jsx"), "utf8"), ms35 = fs.readFileSync(path.join(ROOT, "../ui/center/MasterStore.jsx"), "utf8");
    ok(/function bankOpen\(\) \{ return \(V\(\)\.settings \|\| \{\}\)\.bankMode === "on"; \}/.test(vj) && /const bankO = bankOpen\(\) \? \[SRV\(\) && !bankInfo\(\)\.real \? \["bank", "", "무통장 입금", "준비 중"\] : \["bank", "", "무통장 입금"\]\] : \[\];/.test(vj) &&
      /const PAY_ORD = \["naver", "kakao", "card", "vbank", "tp"\], PAY_ALL = \["naver", "kakao", "card", "vbank"\];/.test(vj) && !/transfer: \["transfer"/.test(vj) && /PAY_ALL\.map\(\(k\) => lab\(k, true\)\.concat\("결제 준비 중"\)\)/.test(vj) &&
      !/vda-bankmode/.test(aj + ms35) && /<label>무통장 입금<\/label><p class="a-muted p-small">받지 않아요 — /.test(aj) && /<label>무통장 입금<\/label><p className="a-muted p-small">받지 않아요 — /.test(ms35) &&
      /function vdCash\(o\)/.test(aj) && /\["cash", "현금영수증"\]/.test(aj) && /"현금영수증 발급", "무통장 주문의 현금영수증을/.test(aj) && /"현금영수증 용도", "현금영수증 번호", "현금영수증 금액", "현금영수증 상태"/.test(aj) && /A\.vdCash\(o\)/.test(mo),
      "화면: 결제수단 네이버페이 · 카카오페이 · 카드/간편결제 · 가상계좌만(퀵계좌이체 없음 · 토스 키가 없으면 네 칸 모두 ‘결제 준비 중’) · 무통장은 서버와 같은 규칙(\"on\" 일 때만) · 마스터 설정 스위치 대신 ‘받지 않아요’ 안내 · 주문 목록(현금영수증 탭 · 표시) · 상세 · 엑셀 · 대시보드 할 일");
  }

  {
    console.log("59) 파트너스(/vod/partners) · 패밀리(/vod/family) 따로 (2026-11-15 · 처음엔 2026-11-14 탭): 소개서 · 숫자 · 이름 · 숨김 · 강사센터 로그인 바로가기");
    const vj40 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), sh40 = fs.readFileSync(path.join(ROOT, "../ui/store/Shell.jsx"), "utf8"), pp40 = fs.readFileSync(path.join(ROOT, "../ui/store/PartnersPage.jsx"), "utf8"),
      ft40 = fs.readFileSync(path.join(ROOT, "../ui/store/FamilyTab.jsx"), "utf8"), aj40 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), fd40 = fs.readFileSync(path.join(ROOT, "api/_lib/familydemo.js"), "utf8"),
      pa40 = fs.readFileSync(path.join(ROOT, "../ui/store/PartnerApply.jsx"), "utf8");
    // 소개서 안내 · 패밀리 글 묶음(PT_DECK_TX ~ familyView)은 바깥 것 없이 돌아요 — 그 부분만 떼어 실제로 계산해 봐요 (icon 만 빈 함수)
    const a40 = vj40.indexOf("  const PT_DECK_TX = "), b40 = vj40.indexOf("  const ptCatRows = ");
    const sb40 = { icon: () => "<svg></svg>", URLSearchParams }; require("vm").createContext(sb40);
    require("vm").runInContext(vj40.slice(a40, b40) + "\n;this.out = { pfTabOf, PF_FAMILY, familyView, FM_DECK, FM_DEMO, PT_DECK_TX, ptDeckNote };", sb40);
    const T = sb40.out, F = T.familyView(), q = (s) => new URLSearchParams(s);
    ok(a40 > 0 && b40 > a40 && T.pfTabOf(q("tab=family")) === "family" && T.pfTabOf(q("")) === "partners" && T.pfTabOf(q("tab=partners")) === "partners" && T.pfTabOf(q("tab=evil")) === "partners" && T.pfTabOf(null) === "partners" && T.PF_FAMILY === "#/vod/family",
      "예전 패밀리 탭 주소: ?tab=family 만 패밀리(→ #/vod/family 로 옮겨요) · 없거나 다른 값은 파트너스");
    ok(F.sim.map((s) => s.rate + ":" + s.one + ":" + s.day).join() === "10:46250:185000,20:92500:370000" && F.pg === 7.5,
      "온드미디어 기대 수익 예시 = 소개서 숫자: 50만 원 × (1 − PG 7.5%) × 10% = 46,250원(하루 4건 185,000원) · 20% = 92,500원(370,000원)", F.sim);
    ok(F.per === 780000 && F.grow.join() === "780000,1560000,2340000",
      "두잉고 세일즈 예시 = 소개서 숫자: A 240만 · B 150만 × 20% = 기수마다 78만 원 → 1~3기 누적 78만 · 156만 · 234만", F.grow);
    // 강사 입점 소개서(DocSend) 링크는 화면에서 빠지고 서버(메일)에만 — 패밀리 소개서 2개는 그대로 새 창
    const lsUi40 = ["../ui/store/PartnersPage.jsx", "../ui/store/PartnerApply.jsx", "../ui/store/FamilyTab.jsx", "../ui/store/Shell.jsx", "index.html"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const pm40 = fs.readFileSync(path.join(ROOT, "api/_lib/ptmail.js"), "utf8"), noCm40 = (x) => x.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    ok(!/mzd5wpkmsb2r7fzj/.test(vj40 + lsUi40) && /const PT_DECK = "https:\/\/docsend\.com\/view\/mzd5wpkmsb2r7fzj"/.test(pm40) && !/PT_DECK\b|ptDeck\(|<Deck |pt-deck-o|pt-end-deck|강사 입점 소개서 보기/.test(noCm40(vj40 + lsUi40)) &&
      T.FM_DECK.media === "https://docsend.com/view/3wjy9wd5uum33gsr" && T.FM_DECK.sales === "https://docsend.com/view/z5ggtz7kuk7b45vk" && !/publitas/i.test(vj40.slice(a40, b40)) &&
      F.centers.map((c) => c.go).join() === "#/center/login?demo=owned,#/center/login?demo=partner" && F.teams.map((t) => t.deckLabel).join() === "온드미디어 소개서,두잉고 소개서",
      "강사 입점 소개서 링크는 화면(예전 · React)에서 빠지고 서버 메일(ptmail.js)에만 · 패밀리 소개서(온드미디어 · 두잉고 세일즈 DocSend)는 그대로 · 센터 카드 둘러보기 = owned · partner 로 바로 로그인");
    const dn40 = T.ptDeckNote();
    ok(/^<p class="pt-deck-note" data-rv><svg><\/svg><span>지원서를 보내면 <b>강사 입점 제안서<\/b>\(시스템 구성 · 수익 구조\)를 이메일로 먼저 보내 드려요<\/span><\/p>$/.test(dn40) && /ptCta\("vd-btn-xl", "지원서 쓰러 가기"\) \+ "<\/div>" \+ ptDeckNote\(\)/.test(vj40) &&
      /지원서 쓰러 가기<Icon n="arrowRight" c="sm" \/><\/a><\/div>\s*<DeckNote \/>/.test(pp40) && /const DeckNote = \(\) => <p className="pt-deck-note" data-rv=""><Icon n="mail" c="xs" \/><span dangerouslySetInnerHTML=\{\{ __html: VOD\(\)\.PT_DECK_TX \}\} \/><\/p>;/.test(pp40),
      "진행 과정 아래: 소개서 버튼 대신 ‘지원서를 보내면 강사 입점 제안서를 이메일로 먼저 보내 드려요’ 한 줄 (예전 화면 = React)", dn40);
    ok(F.centers.map((c) => c.id).join() === "owned,partner" && /AFF_LOGIN = "partner", MD_LOGIN = "owned"/.test(fd40) && F.faq.length === 8 && F.teams.map((t) => t.name).join() === "온드미디어팀,두잉고 세일즈팀",
      "패밀리 두 팀(온드미디어팀 · 두잉고 세일즈팀) · 센터 체험 계정 = familydemo.js 공개 체험 계정(owned · partner) · 자주 묻는 질문 8개");
    // 마지막 안내: 패밀리 = 온드미디어 · 두잉고 소개서 + 노란 ‘카카오톡 패밀리 문의하기’(체험 계정은 위 센터 카드에) · 파트너스 = 지원하기 버튼 하나 (2026-11-15 소개서 버튼 뺌 · 카카오 없음) (예전 화면 = React)
    const cut40 = (s, a, b) => { const i = s.indexOf(a); return i < 0 ? "" : s.slice(i, s.indexOf(b, i + a.length)); };
    const fmEndL = cut40(vj40, "const end = '<section class=\"pt-end fm-end\">", "const flt"), ptEndL = cut40(vj40, "const end = '<section class=\"pt-end\"><div class=\"vd-wrap\"><small data-rv>DOOGO PARTNERS", "const flt");
    const fmEndR = cut40(ft40, 'className="pt-end fm-end"', "</section>"), ptEndR = cut40(pp40, 'className="pt-end"', "</section>");
    const kk40 = (s) => (s.match(/kkBtn\(|<KakaoBtn |data-kk-ops/g) || []).length;
    ok(fmEndL && ptEndL && fmEndR && ptEndR && !kk40(ptEndL + ptEndR) && kk40(fmEndL) === 1 && kk40(fmEndR) === 1 && !/체험 계정으로 둘러보기|fm-end-demo|F\.demo/.test(fmEndL + fmEndR) &&
      /deckBtn\("media", "vd-btn vd-btn-xl fm-end-deck fm-end-md", "온드미디어 소개서"\) \+ deckBtn\("sales", "vd-btn vd-btn-xl fm-end-deck fm-end-sl", "두잉고 소개서"\) \+\s*kkBtn\("vd-btn vd-btn-xl pt-end-kk", "카카오톡 패밀리 문의하기"\)/.test(fmEndL) && /ptCta\("vd-btn-xl"\) \+ "<\/div><\/div><\/section>";/.test(ptEndL) &&
      /deck\("media", "vd-btn vd-btn-xl fm-end-deck fm-end-md", "온드미디어 소개서"\)/.test(fmEndR) && /deck\("sales", "vd-btn vd-btn-xl fm-end-deck fm-end-sl", "두잉고 소개서"\)/.test(fmEndR) && /<KakaoBtn cls="vd-btn vd-btn-xl pt-end-kk" label="카카오톡 패밀리 문의하기" \/>/.test(fmEndR) &&
      (ptEndR.match(/<a /g) || []).length === 1 && /href="#\/vod\/partners\/apply">두고 파트너스 지원하기/.test(ptEndR),
      "마지막 안내: 패밀리 = 온드미디어 · 두잉고 소개서(새 창) + 노란 ‘카카오톡 패밀리 문의하기’ · 파트너스 = 지원하기 버튼 하나 (소개서 · 카카오 없음) (예전 화면 = React)");
    // 서로 다른 화면: 예전 화면 #/vod/partners → pagePartners · #/vod/family → pageFamilyLp · ?tab=family → #/vod/family / React 도 같게 (위 탭 줄은 없어요)
    const lk40 = ["../ui/store/AboutPage.jsx", "../ui/store/PartnerApply.jsx", "../ui/center/MasterInq.jsx"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n") + sh40 + aj40;
    const vc40 = fs.readFileSync(path.join(ROOT, "vod.css"), "utf8");
    ok(/function pagePartners\(\) \{ return shell\("partners", '<div class="pt pt-partners">' \+ ptBody\(\) \+ "<\/div>", "", "vd-pt-page"\); \}/.test(vj40) && /function pageFamilyLp\(\) \{ return shell\("family", '<div class="pt pt-family">' \+ pageFamily\(\) \+ "<\/div>", "", "vd-pt-page"\); \}/.test(vj40) &&
      /if \(a === "partners" && !b && pfTabOf\(r\.qs\) === "family"\) \{ ROUTE\.replace\(PF_FAMILY\); return render\(\); \}/.test(vj40) && /else if \(a === "family"\) html = pageFamilyLp\(\);/.test(vj40) &&
      /if \(r\.path\[0\] === "partners" && !r\.path\[1\] && VOD\(\)\.pfTabOf\(r\.qs\) === "family"\) \{ window\.ROUTE\.replace\(VOD\(\)\.PF_FAMILY\); r = storeRoute\(\); \}/.test(pp40) && /fam = r\.path\[0\] === "family"/.test(pp40) &&
      /if \(fam\) return <Shell nav="family" tab="" cls="vd-pt-page" n=\{n\}><div className="pt pt-family"><Family \/><\/div><\/Shell>;/.test(pp40) && /return <Shell nav="partners" tab="" cls="vd-pt-page" n=\{n\}><div className="pt pt-partners"><Partners \/><\/div><\/Shell>;/.test(pp40) &&
      !/pfTabs|PF_TABS|pf-tab|PfTabs/.test(vj40 + pp40 + vc40) && /X\.familyView\(\)/.test(ft40) &&
      /ROUTE\.replace\("#\/vod\/partners"\)/.test(vj40) && /ROUTE\.hash = "#\/vod\/partners"/.test(vj40) && /href: "#\/vod\/partners",/.test(vj40) && !/href="#\/vod\/partners\?tab=partners"|"#\/vod\/partners\?tab=partners"/.test(vj40.replace(/\/\*[\s\S]*?\*\//g, "") + lk40),
      "파트너스(#/vod/partners) · 패밀리(#/vod/family)는 서로 다른 화면 · 예전 ?tab=family 는 #/vod/family 로 · 위 탭 줄 없음 · 강사 모집 주소 · 배너 · 파트너스 링크는 #/vod/partners (예전 화면 = React)");
    // 이름 · 숨김: 머리띠 ‘파트너스 지원’ + 말풍선 ‘파트너 강사로 지원하기’ · 바닥 · 전체 메뉴 · 사이트맵에서 ‘두고 패밀리’ 빼기 → 패밀리로 가는 링크는 어디에도 없어요 (주소로만)
    const sm40 = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    ok(/"강사센터 로그인", "강사 · 코치 · 패밀리"/.test(vj40) && /"강사센터 로그인", "강사 · 코치 · 패밀리"/.test(sh40) && !/강사 · 코치 · 파트너"/.test(vj40 + sh40) &&
      /href="#\/vod\/partners">파트너스 지원' \+ \(nav === "partners" \? "" : '<span class="vd-ptl-tip" aria-hidden="true">파트너 강사로 지원하기<\/span>'\)/.test(vj40) &&
      /href="#\/vod\/partners">파트너스 지원\{nav === "partners" \? null : <span className="vd-ptl-tip" aria-hidden="true">파트너 강사로 지원하기<\/span>\}/.test(sh40) && !/패밀리 · 파트너스<|패밀리 · 강사 모집 중/.test(vj40 + sh40) &&
      /col\("DOOGO CLASS", \[\["#\/vod\/about", "두고클래스 소개"\], \["#\/vod\/partners", "두고 파트너스"\], \["#\/doinggo", "두잉고"\], \["#\/center", "강사센터"\]\]\)/.test(vj40) &&
      /col\("DOOGO CLASS", \[\["#\/vod\/about", "두고클래스 소개"\], \["#\/vod\/partners", "두고 파트너스"\], \["#\/doinggo", "두잉고"\], \["#\/center", "강사센터"\]\]\)/.test(sh40) &&
      !/"두고 패밀리|PF_FAMILY, "|I\(PF_FAMILY|href="' \+ PF_FAMILY/.test(noCm40(vj40)) && !/vod\/family|tab=family/.test(noCm40(sh40 + lk40.replace(aj40, "")) + sm40) && /두고 파트너스 \(강사 지원\)/.test(vj40),
      "이름: 머리띠 ‘파트너스 지원’ + 말풍선 ‘파트너 강사로 지원하기’ · 바닥 DOOGO CLASS 칸 = 두고클래스 소개 · 두고 파트너스 · 두잉고 · 강사센터 · 전체 메뉴 · 사이트맵에도 패밀리 없음 (주소로만 · 예전 화면 = React)");
    // 첫 화면 색: 파트너스 = 연한 분홍(흰 빛 · 진한 글씨 · 띠 · 마지막 안내도 분홍) · 패밀리 = 패밀리 분홍 그대로
    ok(/\.pt-hero\.fm-hero \{ color: var\(--on1\); background: [^}]*linear-gradient\(112deg, #ffd3df 0%, #ffe3eb 48%, #fff1f5 100%\)/.test(vc40) && /\.pt-partners \.pt-hero \{ color: var\(--on1\); background: [^}]*linear-gradient\(118deg, #ffe2ea 0%, #ffeff4 52%, #fff8fa 100%\)/.test(vc40) &&
      /\.pt-partners \.pt-strip \{ background: #fff6f8; color: var\(--on1\);/.test(vc40) && /\.pt-partners \.pt-end \{ color: var\(--on1\); background: [^}]*#ffdbe5/.test(vc40) && /\.pt-partners \.pt-float \{ background: #fff;/.test(vc40) && !/fm-end-demo|pt-deck-o|pt-end-deck/.test(vc40),
      "파트너스 첫 화면 · 띠 · 마지막 안내 · 떠 있는 상자 = 연한 분홍 + 진한 글씨 · 패밀리 첫 화면은 패밀리 분홍 그대로");
    // 접수 화면 안내 (예전 화면 = React 같은 글): 보냈으면 ‘메일로 먼저 보내 드렸어요’ + 이메일 · 못 보냈으면 ‘MD님이 연락드릴 때 함께’
    const tx40 = cut40(vj40, "  function ptDoneMailTx(S) {", "  const ptDoneMail = "), sbt40 = {}; require("vm").createContext(sbt40); require("vm").runInContext(tx40 + "\n;this.f = ptDoneMailTx;", sbt40);
    const m1 = sbt40.f({ mailed: true, email: "pt@example.com" }), m0 = sbt40.f({ mailed: false, email: "pt@example.com" });
    ok(m1.mailed && /강사 입점 제안서를 메일로 먼저 보내 드렸어요/.test(m1.h) && /MD님이 연락드리기 전에/.test(m1.p) && /pt@example\.com\(으\)로 먼저 보내 드렸어요\. 한번 확인해 주세요/.test(m1.p) &&
      !m0.mailed && /MD님이 연락드릴 때 함께 보내 드려요/.test(m0.h) && /\+ ptDoneMail\(S\) \+/.test(vj40) && /mailed: !!r\.mailed/.test(vj40) &&
      /const dm = X\.ptDoneMailTx\(done\);/.test(pa40) && /<div className=\{"pt-done-mail" \+ \(dm\.mailed \? " ok" : ""\)\}><span className="pt-done-mail-ic"><Icon n="mail" c="sm" \/><\/span><div><b>\{dm\.h\}<\/b><p>\{dm\.p\}<\/p><\/div><\/div>/.test(pa40),
      "접수 화면: 보냈으면 ‘강사 입점 제안서를 메일로 먼저 보내 드렸어요 · MD님이 연락드리기 전에 … 확인해 주세요’ · 못 보냈으면 ‘MD님이 연락드릴 때 함께’ (예전 화면 = React)", { m1, m0 });
    // 강사센터 로그인 왼쪽 아래 바로가기 (2026-11-14): 두잉고(파랑) · 두고클래스(빨강) 카드 — 예전 화면 = React
    const lj40 = fs.readFileSync(path.join(ROOT, "../ui/center/Login.jsx"), "utf8"), ac40 = fs.readFileSync(path.join(ROOT, "admin.css"), "utf8");
    ok(/<a class="a-go a-go-dg" href="#\/doinggo"><span class="a-go-ic">' \+ icon\("users", "sm"\) \+ '<\/span><span class="a-go-tx"><small>강의 운영 시스템<\/small><b>두잉고 페이지 바로가기<\/b><\/span>' \+ icon\("arrowRight", "xs a-go-arw"\)/.test(aj40) &&
      /<a class="a-go a-go-dc" href="#\/vod"><span class="a-go-ic">' \+ icon\("monitorPlay", "sm"\) \+ '<\/span><span class="a-go-tx"><small>VOD · 전자책 클래스<\/small><b>두고클래스 페이지 바로가기<\/b><\/span>' \+ icon\("arrowRight", "xs a-go-arw"\)/.test(aj40) &&
      /<a className="a-go a-go-dg" href="#\/doinggo"><span className="a-go-ic"><Icon n="users" c="sm" \/><\/span><span className="a-go-tx"><small>강의 운영 시스템<\/small><b>두잉고 페이지 바로가기<\/b><\/span><Icon n="arrowRight" c="xs a-go-arw" \/><\/a>/.test(lj40) &&
      /<a className="a-go a-go-dc" href="#\/vod"><span className="a-go-ic"><Icon n="monitorPlay" c="sm" \/><\/span><span className="a-go-tx"><small>VOD · 전자책 클래스<\/small><b>두고클래스 페이지 바로가기<\/b><\/span><Icon n="arrowRight" c="xs a-go-arw" \/><\/a>/.test(lj40) &&
      !/a-login-home"/.test(aj40 + lj40) && /\.a-go \{ --go-c: #2563eb;/.test(ac40) && /\.a-go-dc \{ --go-c: #fc1c49;/.test(ac40),
      "강사센터 로그인 왼쪽 아래: 두잉고 페이지 바로가기(파랑 · #/doinggo) + 두고클래스 페이지 바로가기(빨강 · #/vod) — 예전 화면 = React 같은 모양");
    ok(/qd = r\.parts\[0\] === "login" \? r\.params\.get\("demo"\) : null;\s*if \(qt === "family" \|\| qt === "master" \|\| DEMO_IDS\[qd\]\) \{ loginTab = "master"; ROUTE\.replace\("#\/center\/login"\); \}\s*if \(DEMO_IDS\[qd\]\) setTimeout\(\(\) => demoLogin\(qd\), 0\);/.test(aj40) &&
      /const DEMO_IDS = \{ owned: 1, partner: 1 \};/.test(aj40) && /function demoLogin\(id, tries\) \{\s*if \(S \|\| !DEMO_IDS\[id\]\) return;/.test(aj40) && /serverLogin\(f, id, id, err\);/.test(aj40),
      "강사센터 로그인 ?tab=family → ‘마스터 · 패밀리’ 탭 · ?demo=owned | partner → 그 체험 계정으로 바로 로그인(다른 값 · 이미 로그인한 사람은 그대로 · 주소에서 지워요)");
    const S40 = require(path.join(ROOT, "shared/screens.js"));
    ok(S40.match("/vod/partners") === "vod-partners" && S40.match("/vod/partners?tab=family") === "vod-partners" && S40.match("/vod/partners?tab=partners") === "vod-partners" && S40.match("/vod/partners/apply") === "vod-partners" &&
      S40.match("/vod/family") === "vod-partners" && S40.match("/vod/family/") === "vod-partners" && S40.match("/vod/familyx") === null && S40.match("/vod/family/apply") === null && S40.isPublic("vod-partners"),
      "React 화면 스위치: 파트너스 · 지원서 · 패밀리(/vod/family) · 예전 ?tab=family 모두 같은 화면(vod-partners)");
    // 패밀리는 검색 제외 (noindex) — 파트너스 · 다른 화면은 그대로
    const PM40 = require(path.join(TMP, "class/api/_lib/pagemeta.js")), tpl40 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const hf40 = await PM40.render("/vod/family", tpl40), hp40 = await PM40.render("/vod/partners", tpl40);
    ok(/<meta name="robots" content="noindex, nofollow" \/>/.test(hf40) && !/content="index, follow"/.test(hf40) && hp40 === tpl40 && /content="index, follow"/.test(hp40) && /noindex, nofollow/.test(PM40.noindex("<head></head>")),
      "패밀리(/vod/family)만 검색 제외(noindex, nofollow) · 파트너스는 그대로 검색에 보여요");
    // 일회성: 저장된 첫 화면 배너 링크가 예전 주소(#/vod/partners — 그땐 강사 지원 소개뿐)면 파트너스 탭으로 · 다른 링크 · 칸은 그대로 · 다시 돌려도 그대로
    const OF40 = require(path.join(TMP, "class/api/_lib/oneoff.js"));
    const bn40 = [{ id: "vb3", title: "강사 모집", href: "#/vod/partners" }, { id: "vb9", href: "https://www.doogoclass.com/vod/partners/" }, { id: "vb1", href: "#/vod/c/all" }, { id: "vb4", href: "#/vod/partners?tab=partners" }, { id: "vb5", href: "#/vod/partners/apply" }];
    const d40 = { meta: { ver: 3, other: 1, vod: { banners: bn40, products: [{ id: "v1" }] } } }, r40 = OF40.partnersTabLinks((k) => d40[k]);
    const nb40 = r40.writes.meta && r40.writes.meta.vod.banners, d40b = { meta: r40.writes.meta }, r40b = OF40.partnersTabLinks((k) => d40b[k]);
    ok(nb40 && nb40.map((b) => b.href).join(" ") === "#/vod/partners?tab=partners #/vod/partners?tab=partners #/vod/c/all #/vod/partners?tab=partners #/vod/partners/apply" && nb40[0].title === "강사 모집" && r40.writes.meta.other === 1 && r40.writes.meta.vod.products.length === 1 &&
      bn40[0].href === "#/vod/partners" && !Object.keys(r40b.writes).length && !Object.keys(OF40.partnersTabLinks(() => null).writes).length && OF40.OPS.some((x) => x.id === "2026-11-14-partners-tab-links" && x.run === OF40.partnersTabLinks),
      "일회성(2026-11-14-partners-tab-links): ‘강사 모집’ 배너 등 예전 주소 링크만 파트너스 탭으로 · 다른 링크 · 지원서 링크 · 다른 칸 그대로 · 원본은 안 건드림 · 다시 돌리면 그대로 · 데이터 없으면 건너뜀", r40.result);
  }

  {
    console.log("60) 주차별 강의 한 주씩(화살표) · 성장 단계 색 = 강사 강의실 색 · 응원 영상 썸네일 원래 색 (2026-11-15)");
    const ap60 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), ln60 = fs.readFileSync(path.join(ROOT, "../ui/dg/Learn.jsx"), "utf8"), st60 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8"),
      ad60 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ac60 = fs.readFileSync(path.join(ROOT, "admin.css"), "utf8");
    ok(/cwPager\(pick\) \+ '<div class="cw-one">' \+ cwSide\(pick, -1\) \+ curWeekCard\(pick, cur === pick\) \+ cwSide\(pick, 1\)/.test(ap60) && !/D\.weeks\.map\(\(w\) => curWeekCard/.test(ap60) &&
      /const n = Number\(r\.params\.get\("w"\)\);\s*return D\.weeks\.find\(\(w\) => w\.no === n\) \|\| cur \|\| D\.weeks\[0\];/.test(ap60) &&
      /<CwPager w=\{pick\} D=\{D\} \/><div className="cw-one"><CwSide w=\{pick\} D=\{D\} d=\{-1\} \/><CurWeek key=\{pick\.no\} w=\{pick\} now=\{cur === pick\} \/><CwSide w=\{pick\} D=\{D\} d=\{1\} \/><\/div>/.test(ln60) &&
      /pick = D\.weeks\.find\(\(w\) => w\.no === n\) \|\| cur \|\| D\.weeks\[0\]/.test(ln60) && /<Curriculum r=\{r\} \/>/.test(ln60) && /\.cw-side\.prev \{ left: -68px; \}/.test(st60),
      "주차별 강의: 한 주만 보여요 · 위 줄(이전 · 주차 점 · 다음) + 카드 양옆 화살표 · #/curriculum?w=N · 처음엔 이번 주 (예전 화면 = React)");
    const last60 = (sel) => st60.lastIndexOf(sel);
    ok(/\n\.video\[data-yid\] \.vp-img \{ opacity: 1; mix-blend-mode: normal; \}/.test(st60) && /\n\.video\[data-yid\] \.video-ph::after \{ display: none; \}/.test(st60) &&
      /\n\.video\[data-yid\], \.video\[data-yid\] \.video-ph \{ background: #000; \}/.test(st60) && /\n\.video\[data-yid\] \.vp-title \{ visibility: hidden; \}/.test(st60) &&
      /\n\.video\[data-yid\] \.vp-time \{ background: rgba\(0, 0, 0, \.6\); color: #fff; \}/.test(st60) && st60.indexOf(".home-mv .video[data-yid]") < 0 &&
      [".th-nz .video .vp-img", ".th-doinggo .video .vp-img", ".th-light .video .vp-img", ".th-nz .video-ph .vp-time", ".th-doinggo .video { background"].every((x) => last60(x) > 0 && last60(x) < last60(".video[data-yid] .vp-img")),
      "강의실 영상 카드(모든 강사 · 모든 화면 — 주차별 강의 · 강의 자료함 · 다시보기 · 대시보드 응원 영상): 유튜브 썸네일 원래 색 그대로 · 썸네일 위 제목 숨김 · 길이는 어두운 칸 (테마 규칙보다 뒤 — 뉴질랜드 · 두잉고 · 밝은 테마 모두 이겨요)");
    ok(/function lvVarList\(iid\) \{\s*const t = DB\.themeOf\(/.test(ad60) && /const iid = rows\[0\]\.s && rows\[0\]\.s\.instructorId, sty = iid \? lvStyle\(iid\) : "";/.test(ad60) &&
      /if \(!master\) lvVarList\(IID\(\)\)\.forEach/.test(ad60) && /\.a-lvbar span \{[^}]*background: var\(--lv-c, #9fe870\)/.test(ac60) && /\.a-lv\.lv-forest \{ background: var\(--lv-c, #163300\)/.test(ac60),
      "강사센터 성장 단계 막대 · 칩 = 그 강사가 고른 강의실 색(수강생 화면과 같은 --primary) · 마스터 강사별 보드는 강사마다 · 색 정보 없으면 예전 연두");
    const dr60 = fs.readFileSync(path.join(ROOT, "shared/data-rules.js"), "utf8");
    ok(/nz: \{ label: "뉴질랜드"[^}]*primary: "#0b2a5b"[^}]*onPrimary: "#ffffff"/.test(dr60), "뉴질랜드 색 = #0b2a5b · 글자 흰색 (강사센터 성장 단계도 이 남색)");
  }

  {
    console.log("61) 문대표 자료 파일 6개 · 자료 화면(받을 자료 + 설명) · 강사센터 파일 올리기 · 대시보드 카드 · 잠근 파일 묶음 (2026-11-15)");
    const ap61 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), lb61 = fs.readFileSync(path.join(ROOT, "../ui/dg/Lib.jsx"), "utf8"), ad61 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"),
      db61 = fs.readFileSync(path.join(ROOT, "../ui/center/Dashboard.jsx"), "utf8"), c261 = fs.readFileSync(path.join(ROOT, "../ui/center/Content2.jsx"), "utf8"), fa61 = fs.readFileSync(path.join(ROOT, "api/file.js"), "utf8");
    const seed61 = require(path.join(ROOT, "api/_lib/seed.js")).loadSeed().content.moon.resources.file;
    ok(seed61.map((x) => x.id).join() === "f3,mf1,mf2,mf3,mf4,mf5" && seed61[0].tool === "calculator" && seed61.slice(1).every((x) => x.body && x.body.length > 200 && Array.isArray(x.attachments) && !x.attachments.length) &&
      /공동구매 제안서/.test(seed61[1].title) && /프리랜서/.test(seed61[5].title) && !seed61.some((x) => /건강식품 리스트 150|CS 답변 템플릿/.test(x.title)),
      "처음 데이터(문대표): 자료 파일 = 마진 계산기 + 실전 문서 5개(노션 글) · 예전 예시 4개 없음 · 공개 저장소에는 글만(첨부 비어 있음)", seed61.map((x) => x.id));
    ok(/const resDoc = \(it\) => !!\(it && !it\.tool && \(it\.body \|\| \(it\.attachments \|\| \[\]\)\.length\)\);/.test(ap61) && /\(nA \? "자료 받기" : "자세히 보기"\)/.test(ap61) && /function resFilesTop\(it\)/.test(ap61) &&
      /\(docCat \? resFilesTop\(it\) : ""\)/.test(ap61) && /<RawOne html=\{X\.resFilesTop\(it\)\} \/>/.test(lb61) && /\{nA \? "자료 받기" : "자세히 보기"\}/.test(lb61) && /resDoc, resExts, resFilesTop,/.test(ap61),
      "수강생 자료 파일: 설명 · 파일이 있으면 ‘자료 받기’ → 자료 화면(맨 위 받을 자료 · 아래 설명) · 파일 형식 칩 (예전 화면 = React)");
    ok(/COLL\["res-file"\] = \{[^\n]*\n[^\n]*\n\s*F\("url", "Google Drive 다운로드 링크", "url"/.test(ad61) && /F\("attachments", "자료 파일 더 넣기/.test(ad61) && /pill\(links\.some\(isDrive\) \? "Google Drive 연결됨" : "링크 연결됨", "ok"\)/.test(ad61) && /F\("body", "자세한 설명/.test(ad61) && /function libDashCard\(\)/.test(ad61) && /libDashCard\(\) \+\n\s*'<div class="a-grid-2">'/.test(ad61) &&
      /<Isl html=\{A\.libDashCard\(\)\} \/>/.test(db61) && /<Isl html=\{A\.resPills\(it, isVideo, k\)\} \/>/.test(c261) && /case "lib-go": ui\.libTab = d\.k \|\| "file"; ROUTE\.hash = "#\/center\/library";/.test(ad61) &&
      /const MAX_SRV_FILE = 3 \* 1024 \* 1024;/.test(ad61) && /scope: "content:" \+ IID\(\)/.test(ad61) && /파일을 올리는 중이에요\. 다 올라간 뒤에 저장해 주세요\./.test(ad61),
      "강사센터: 자료 파일 = Google Drive 다운로드 링크(맨 위) + 파일 더 넣기(서버에선 바로 비공개 저장 · 3MB) + 자세한 설명 · ‘Google Drive 연결됨’ 표시 · 대시보드 ‘자료 파일’ 카드(바로 수정) · 올리는 중엔 저장 막기 (예전 화면 = React)");
    ok(/const isDrive = \(u\) => \/\^https\?:/.test(ap61) && /const GD_LOGO = '<svg class="gd-logo"/.test(ap61) && /"Google Drive에서 받기<\/a><\/li>"/.test(ap61) && /"다운로드 링크 열기<\/a><\/li>"/.test(ap61) &&
      /const resLinks = \(it\) => \(it\.url \? \[\{ name: "", url: it\.url \}\] : \[\]\)\.concat/.test(ap61) && /function resTagHtml\(it\)/.test(ap61) && /\{tag \? <RawOne html=\{tag\} \/> : null\}/.test(lb61) && /X\.isDrive\(it\.url\) \? "Google Drive에서 받기"/.test(lb61) &&
      !/파일을 곧 올려 드릴게요[^;]*바로가기/.test(ap61),
      "수강생 자료 화면: Google Drive 링크 = 드라이브 로고 + ‘Google Drive에서 받기’(새 창) · 다른 링크 = ‘다운로드 링크 열기’ · 목록 칩 ‘Google Drive’ · 링크가 있으면 ‘곧 올려 드릴게요’ 대신 받기 줄 (예전 화면 = React)");
    ok(/content:\[\\w-\]\{1,40\}\)\$\/\.test\(scope\)/.test(fa61) && /if \(\/\^content:\/\.test\(scope\) && !access\.writer\(scope, ids, false\)\) return send\(res, 403/.test(fa61),
      "파일 올리기 API: content:<강사> 범위는 그 강사 콘텐츠를 고칠 수 있는 사람만");
    // 잠근 묶음: 공개 저장소의 파일은 열쇠 없이는 못 읽어요 (PDF · 엑셀 머리가 그대로 보이지 않음)
    const FP = require(path.join(ROOT, "api/_lib/filepack.js")), enc = fs.readFileSync(path.join(ROOT, "api/_lib/packs/moon-lib-2026-11-15.enc"));
    const encTxt = enc.toString("latin1");
    ok(enc.subarray(0, 5).toString() === "DCFP1" && enc.length > 1000000 && !/%PDF|PK\x03\x04|\xD0\xCF\x11\xE0|공동구매/.test(encTxt) && !/[0-9a-f]{64}/i.test(fs.readFileSync(path.join(ROOT, "api/_lib/oneoff.js"), "utf8")),
      "잠근 파일 묶음(packs/moon-lib-2026-11-15.enc): AES-256-GCM · PDF · 엑셀 머리 · 글자가 그대로 보이지 않아요 · 열쇠는 코드에 없음 (Vercel 환경 변수 DC_FILES_KEY)", enc.length);
    const k61 = crypto.randomBytes(32).toString("hex"), k61b = crypto.randomBytes(32).toString("hex");
    const sealed = FP.seal({ v: 1, files: { a: { name: "가.pdf", mime: "application/pdf", b64: Buffer.from("%PDF-1.4 시험").toString("base64") } } }, k61);
    let wrong = null; try { FP.open(sealed, k61b); } catch (e) { wrong = e.code; }
    let wrongEnc = null; try { FP.open(enc, k61); } catch (e) { wrongEnc = e.code; }
    ok(FP.open(sealed, k61).files.a.name === "가.pdf" && wrong === "KEY" && wrongEnc === "KEY" && !FP.keyOk("abc") && FP.keyOk(k61),
      "묶음 열기: 같은 열쇠면 그대로 · 다른 열쇠면 못 열어요(KEY)", { wrong, wrongEnc });
    // 일회성 작업: 글(늘) → 파일(열쇠가 있을 때) · 강사센터에서 이미 올린 파일은 그대로 · 열쇠가 틀리면 기록하지 않고 다음 배포 때 다시
    const O61 = require(path.join(ROOT, "api/_lib/oneoff.js"));
    const fake = (n) => ({ name: n, mime: /xls/.test(n) ? "application/vnd.ms-excel" : "application/pdf", b64: crypto.randomBytes(200).toString("base64") });
    const tmpPack = path.join(TMP, "lib61.enc");
    fs.writeFileSync(tmpPack, FP.seal({ v: 1, files: { proposal: fake("제안서.xlsx"), dm: fake("DM.xlsx"), channels: fake("판로.pdf"), bep: fake("손익.xls"), calendar: fake("캘린더.pdf") } }, k61));
    const old61 = { resources: { file: [{ id: "f1", title: "뉴질랜드 건강식품 리스트 150" }, { id: "f2", title: "건강식품 키워드 리스트" }, { id: "f3", title: "마진 계산기", tool: "calculator", meta: "바로 사용" }, { id: "f4", title: "상세페이지 템플릿" }, { id: "f5", title: "CS 답변 템플릿" }] } };
    let doc61 = old61;
    const get61 = (k) => (k === "content:moon" ? JSON.parse(JSON.stringify(doc61)) : null);
    const i1 = O61.moonLibItems(get61); doc61 = i1.writes["content:moon"];
    const f1 = O61.moonLibFiles(get61, { key: k61, file: tmpPack }), fl = f1.writes["content:moon"].resources.file;
    doc61 = JSON.parse(JSON.stringify(doc61)); doc61.resources.file[3].attachments = [{ id: "mine", name: "내가 올린 파일.xls", data: "/api/file?h=abc" }];
    const f2 = O61.moonLibFiles(get61, { key: k61, file: tmpPack }), f3 = O61.moonLibFiles(get61, { key: k61b, file: tmpPack });
    const opF = O61.OPS.find((o) => o.id === "2026-11-15-moon-lib-files"), opI = O61.OPS.find((o) => o.id === "2026-11-15-moon-lib-items");
    const kEnv = process.env.DC_FILES_KEY; delete process.env.DC_FILES_KEY; const whenOff = opF.when(); process.env.DC_FILES_KEY = k61; const whenOn = opF.when(); if (kEnv === undefined) delete process.env.DC_FILES_KEY; else process.env.DC_FILES_KEY = kEnv;
    ok(i1.result.removed.length === 4 && doc61 && fl.map((x) => x.id).join() === "f3,mf1,mf2,mf3,mf4,mf5" && fl[0].meta === "바로 사용" &&
      fl[1].attachments.length === 2 && fl[1].attachments.every((a) => /^data:application\/[a-z.-]+;base64,/.test(a.data) && a.size === 200) && fl[2].attachments[0].name === "판로.pdf" && !fl[5].attachments.length &&
      f2.result.kept.join() === "플랫폼별 손익분기점 계산표" && f2.writes["content:moon"].resources.file[3].attachments[0].id === "mine" && f3.retry === true && !Object.keys(f3.writes).length &&
      !opI.when && whenOff === false && whenOn === true,
      "일회성 작업: 마진 계산기는 그대로 · 예전 4개 지움 · 5개 글 → 묶음 파일 첨부(저장 때 비공개 파일로) · 강사센터에서 올린 파일은 그대로 · 열쇠가 틀리면 다음 배포 때 다시 · 파일 작업은 DC_FILES_KEY 가 있을 때만",
      { items: i1.result, files: f1.result, kept: f2.result, wrong: f3.result });
    // 서버: 강사센터가 바로 올리는 파일(content:moon) → 문대표만 올림 · 그 강사 수강생 · 운영자만 받음
    const pdf61 = Buffer.from("%PDF-1.4 자료 파일 " + crypto.randomBytes(30).toString("hex"));
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "moon" }) });
    let r61 = await call("file", { body: { data: "data:application/pdf;base64," + pdf61.toString("base64"), scope: "content:moon" } });
    const h61 = r61.json && r61.json.ok ? new URL("http://x" + r61.json.url).searchParams.get("h") : "";
    useJar({ dc_a: auth.sign({ r: "instructor", iid: "choi" }) });
    const other = await call("file", { body: { data: "data:application/pdf;base64," + pdf61.toString("base64"), scope: "content:moon" } });
    const otherGet = await call("file", { method: "GET", query: { h: h61 } });
    useJar({ dc_s: auth.sign({ r: "student", sid: "s1", iid: "moon" }) }); const stuGet = await call("file", { method: "GET", query: { h: h61 } });
    useJar({}); const visGet = await call("file", { method: "GET", query: { h: h61 } });
    ok(h61 && other.status === 403 && otherGet.status === 403 && stuGet.status === 200 && Buffer.isBuffer(stuGet.body) && stuGet.body.equals(pdf61) && visGet.status === 403,
      "강사센터 파일 올리기(content:moon): 문대표 200 · 다른 강사는 올리기 · 받기 403 · 문대표 수강생 200(같은 바이트) · 방문자 403", { up: r61.status, other: other.status, og: otherGet.status, stu: stuGet.status, vis: visGet.status });
    // 새 버전 안내: 서버가 배포된 판(커밋 8자리)을 알려 주고 · 열어 둔 화면(index.html ?v=)이 예전 판이면 띠
    const shaKeep = process.env.VERCEL_GIT_COMMIT_SHA; process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
    useJar({}); const bs61 = await call("bootstrap", { method: "GET" });
    if (shaKeep === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA; else process.env.VERCEL_GIT_COMMIT_SHA = shaKeep;
    const dbj61 = fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), mj61 = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), st61 = fs.readFileSync(path.join(ROOT, "scripts/site.js"), "utf8");
    ok(bs61.json && bs61.json.ver === "abcdef12" && /if \(j\.ver && PAGE_VER && j\.ver !== PAGE_VER && !R\.newVer\) \{ R\.newVer = j\.ver; emit\("newver", j\.ver\); \}/.test(dbj61) &&
      /if \(type === "newver"\) \{ newVerBar\(\); return; \}/.test(mj61) && /새 버전이 나왔어요\./.test(mj61) && /const VER = \(process\.env\.VERCEL_GIT_COMMIT_SHA \|\| Date\.now\(\)\.toString\(36\)\)\.slice\(0, 8\);/.test(st61),
      "새 버전 안내: 서버 bootstrap 이 배포된 판(커밋 8자리 = index.html ?v= 와 같은 규칙)을 알려 주고 · 배포 전에 열어 둔 화면이면 아래 띠 ‘새 버전이 나왔어요 · 새로 고침’ (저절로 새로 고치지 않음)", bs61.json && bs61.json.ver);
  }

  {
    console.log("62) 체험 계정 주문 1시간 뒤 정리 · 체험 계정 실제 결제 막기 · 정식 운영 전 테스트 주문 정리 (2026-11-15)");
    const st62 = require(path.join(TMP, "class/api/_lib/store.js")), DM = require(path.join(TMP, "class/api/_lib/demoorders.js")), OF62 = require(path.join(TMP, "class/api/_lib/oneoff.js"));
    const now = Date.now(), H = 36e5, dmid = "vm-demo-srv", got = async (k) => { const x = await st62.getDoc(k); return x && x.v; };
    if (!(await got("vm:" + dmid))) await st62.writeDoc("vm:" + dmid, { id: dmid, email: "demo62@example.com", name: "체험회원", demo: true, points: 0, coupons: [], orderNos: [] }, null);
    const dr = await st62.getDoc("vm:" + dmid);
    await st62.writeDoc("vm:" + dmid, Object.assign({}, dr.v, { points: 100, coupons: [{ id: "mc62", cid: "c1", usedAt: now - 2 * H, orderNo: "DC62OLD1" }], orderNos: (dr.v.orderNos || []).concat(["DC62OLD1", "DC62OLD2", "DC62NEW1"]) }), dr.ver);
    const mk = (no, o) => st62.writeDoc("vo:" + no, Object.assign({ id: "vo-" + no, no, mid: dmid, status: "paid", amount: 0, createdAt: now - 2 * H, at: now - 2 * H }, o), null);
    await mk("DC62OLD1", { paymentId: "pay_62a", pointOff: 300, demo: true });
    await mk("DC62OLD2", {}); // 표시가 없던 예전 체험 주문 (체험 회원으로 찾아요)
    await mk("DC62NEW1", { createdAt: now - 10 * 6e4, at: now - 10 * 6e4, demo: true });
    await mk("DC62REAL", { mid: "vm-real62", createdAt: now - 3 * H });
    await st62.writeDoc("vpay:pay_62a", { nos: ["DC62OLD1"], mid: dmid, total: 0 }, null);
    DM._reset();
    let sw = await DM.sweep({ now, test: true });
    const m1 = await got("vm:" + dmid);
    ok(sw.removed.slice().sort().join() === "DC62OLD1,DC62OLD2" && !(await got("vo:DC62OLD1")) && !(await got("vo:DC62OLD2")) && !!(await got("vo:DC62NEW1")) && !!(await got("vo:DC62REAL")) && !(await got("vpay:pay_62a")) &&
      m1.orderNos.indexOf("DC62OLD1") < 0 && m1.orderNos.indexOf("DC62OLD2") < 0 && m1.orderNos.indexOf("DC62NEW1") >= 0 && m1.coupons[0].usedAt === null && m1.coupons[0].orderNo === "" && m1.points === 400,
      "체험 주문 정리: 1시간 지난 체험 주문(체험 표시 · 체험 회원의 표시 없는 예전 주문)만 지워요 · 10분 된 체험 주문 · 일반 회원 주문은 그대로 · 결제 묶음 지우기 · 주문 목록에서 빼기 · 쓴 쿠폰 · 포인트 300 돌려놓기", { sw, orderNos: m1.orderNos, cp: m1.coupons, pt: m1.points });
    sw = await DM.sweep({ now: now + 6e4 });
    ok(sw.skipped === true, "bootstrap 에서 부르는 정리는 5분에 한 번까지", sw);
    // 마스터가 불러오면(bootstrap) 그 전에 정리 · 방문자 bootstrap 은 정리하지 않아요
    await mk("DC62OLD9", { demo: true });
    DM._reset(); useJar({}); await boot();
    const visKept = !!(await got("vo:DC62OLD9"));
    DM._reset(); useJar({ dc_a: auth.sign({ r: "master" }) });
    const jb62 = await boot();
    ok(visKept && !(await got("vo:DC62OLD9")) && !(jb62.docs || []).some((d) => d[0] === "vo:DC62OLD9" && d[1]) && (jb62.docs || []).some((d) => d[0] === "vo:DC62NEW1"),
      "마스터가 주문을 불러올 때(bootstrap) 1시간 지난 체험 주문을 먼저 지워서 목록 · 대시보드에 안 보여요 (방문자가 열 때는 그대로)", { visKept });
    // 체험 계정 결제: 토스 시험 키면 시험 결제 · 라이브 키(실제 돈)면 막아요 — 1시간 뒤 지워질 주문에 돈이 걸리지 않게
    useJar({ dc_v: auth.sign({ r: "vod", mid: dmid }) });
    process.env.TOSS_METHODS = "card,vbank,naver,kakao";
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "card" } });
    const dno = r.json.no;
    ok(r.json.ok && r.json.paymentId && dno && (await got("vo:" + dno)).demo === true, "체험 계정 · 토스 시험 키: 시험 결제 준비 · 주문에 체험 표시(demo) — 1시간 뒤 정리 대상", r.json);
    const kk62 = { c: process.env.TOSS_CLIENT_KEY, s: process.env.TOSS_SECRET_KEY };
    Object.assign(process.env, { TOSS_CLIENT_KEY: "live_ck_x", TOSS_SECRET_KEY: "live_sk_x" });
    r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "card" } });
    Object.assign(process.env, { TOSS_CLIENT_KEY: kk62.c, TOSS_SECRET_KEY: kk62.s });
    ok(r.status === 403 && /체험 계정/.test(r.json.message) && !r.json.no, "체험 계정 · 토스 라이브 키: 실제 결제는 막아요 (회원가입 후 결제 안내)", r.json);
    useJar({});
    // 정식 운영 전 테스트 주문 정리 (일회성) — 주문 번호로 찾은 회원의 11/16 전 주문 · 체험 주문 · 무통장 설정
    const T0 = Date.parse("2026-11-10T00:00:00+09:00"), D62 = {
      "vo:DC261103733435": { no: "DC261103733435", mid: "vmA", status: "pending", amount: 15900, createdAt: T0, paymentId: "pA1" },
      "vo:DC261031897485": { no: "DC261031897485", mid: "vmB", status: "paid", amount: 15900, createdAt: T0, paymentId: "pB1" },
      "vo:DC261030835011": { no: "DC261030835011", mid: "vmB", status: "paid", amount: 15900, createdAt: T0, paymentId: "pB2", pointOff: 500 },
      "vo:DCBOTHER": { no: "DCBOTHER", mid: "vmB", status: "failed", amount: 59000, createdAt: T0 + 1000 },
      "vo:DCBLATE": { no: "DCBLATE", mid: "vmB", status: "paid", amount: 59000, createdAt: Date.parse("2026-11-16T09:00:00+09:00") },
      "vo:DCREAL1": { no: "DCREAL1", mid: "vmC", status: "paid", amount: 59000, createdAt: T0 },
      "vo:DC261029900": { no: "DC261029900", mid: dmid, status: "paid", amount: 0, demo: true, createdAt: T0 },
      "vpay:pA1": { nos: ["DC261103733435"] }, "vpay:pB1": { nos: ["DC261031897485"] }, "vpay:pB2": { nos: ["DC261030835011"] },
      "vm:vmA": { id: "vmA", name: "가나다", orderNos: ["DC261103733435"], coupons: [] },
      "vm:vmB": { id: "vmB", name: "라마바", orderNos: ["DC261031897485", "DC261030835011", "DCBOTHER", "DCBLATE"], points: 0, coupons: [{ id: "mcB", cid: "book1", usedAt: T0, orderNo: "DC261031897485" }], paidPays: ["pB1", "pX"] },
      "vm:vmC": { id: "vmC", name: "사아자", orderNos: ["DCREAL1"] },
      ["vm:" + dmid]: { id: dmid, name: "체험회원", demo: true, orderNos: ["DC261029900"] },
      meta: { vod: { settings: { bankMode: "on", bank: "IBK" } }, other: 1 }
    };
    const g62 = (k) => (D62[k] === undefined ? null : JSON.parse(JSON.stringify(D62[k]))), keys62 = (p) => Object.keys(D62).filter((k) => k.indexOf(p) === 0);
    const w62 = OF62.launchOrdersClean(g62, keys62), W = w62.writes;
    ok(["vo:DC261103733435", "vo:DC261031897485", "vo:DC261030835011", "vo:DCBOTHER", "vo:DC261029900", "vpay:pA1", "vpay:pB1", "vpay:pB2"].every((k) => W[k] === null) && !("vo:DCBLATE" in W) && !("vo:DCREAL1" in W) && !("vm:vmC" in W) &&
      W["vm:vmB"].orderNos.join() === "DCBLATE" && W["vm:vmB"].coupons[0].usedAt === null && W["vm:vmB"].coupons[0].orderNo === "" && W["vm:vmB"].points === 500 && W["vm:vmB"].paidPays.join() === "pX" && W["vm:vmA"].orderNos.length === 0 && W["vm:" + dmid].orderNos.length === 0 &&
      W.meta.vod.settings.bankMode === undefined && W.meta.vod.settings.bank === "IBK" && W.meta.other === 1 && w62.result.demo === 1 && w62.result.orders.length === 4 && !/가나다|라마바/.test(JSON.stringify(w62.result)),
      "일회성: 알려 준 테스트 주문 3건을 낸 회원들의 11/16 전 주문 전부 · 체험 주문 지우기 · 결제 묶음 · 주문 목록 · 쿠폰 · 포인트 정리 · 11/16 뒤 주문 · 다른 회원 주문은 그대로 · 무통장 설정 지우기 · 결과엔 이름을 가려요", w62.result);
    const op62 = OF62.OPS.find((x) => x.id === "2026-11-15-launch-orders-clean"), vk62 = process.env.VERCEL;
    delete process.env.VERCEL; const offLocal = op62 && op62.when() === false; process.env.VERCEL = "1"; const onVercel = op62 && op62.when() === true;
    if (vk62 === undefined) delete process.env.VERCEL; else process.env.VERCEL = vk62;
    ok(offLocal && onVercel && OF62.launchOrdersClean(() => null, () => []).result.skipped, "일회성 목록에 등록 · Vercel 배포 때만(로컬 화면 테스트 DB 의 체험 계정 강의는 그대로) · 지울 게 없으면 건너뜀");
  }

  {
    console.log("63) 유튜브 썸네일 늘 최신 — 주소에 5분마다 바뀌는 판 표시 (2026-11-15)");
    const vm63 = require("vm"), sb63 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb63.window = sb63; vm63.createContext(sb63); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm63.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb63, { filename: f }));
    const T = sb63.DB.ytThumb, v63 = Math.floor(Date.now() / 3e5).toString(36);
    ok(typeof T === "function" && T("AbCdEfGhI_k", "mqdefault") === "https://i.ytimg.com/vi/AbCdEfGhI_k/mqdefault.jpg?v=" + v63 && T("https://youtu.be/AbCdEfGhI_k") === "https://i.ytimg.com/vi/AbCdEfGhI_k/hqdefault.jpg?v=" + v63 &&
      T("https://www.youtube.com/watch?v=AbCdEfGhI_k&t=10") === "https://i.ytimg.com/vi/AbCdEfGhI_k/hqdefault.jpg?v=" + v63 && T("") === "" && T("https://vimeo.com/123456789") === "",
      "DB.ytThumb(영상 · 크기): 유튜브 ID · 주소 → i.ytimg.com/vi/ID/크기.jpg?v=<5분 판> · 기본 hqdefault · 영상 아님/비메오 → 빈 값");
    const src63 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const files63 = ["app.js", "landing.js", "../ui/dg/bits.jsx", "../ui/dg/More.jsx", "../ui/dg/Lib.jsx"];
    const raw63 = files63.filter((f) => /i\.ytimg\.com\/vi\//.test(src63(f)));
    const use63 = files63.map((f) => (src63(f).match(/\.ytThumb\(/g) || []).length);
    const vd63 = src63("vod.js");
    ok(!raw63.length && use63.join(",") === "5,4,2,2,1" && /DB\.ytThumb \? DB\.ytThumb\(yid, "hqdefault"\)/.test(vd63),
      "썸네일 주소는 모두 ytThumb 로 (예전 화면 강의 카드 · 강의 목록 · 자료 · 응원 영상 · 다시보기 / 소개 페이지 / React 같은 곳 / 스토어 미리보기) — 판 표시 없는 i.ytimg 주소가 남지 않음 " + raw63.join(" ") + " · " + use63.join(","));
    const lib63 = fs.readFileSync(path.join(ROOT, "scripts/e2e/lib.js"), "utf8");
    ok(/img\[src\*="i\.ytimg\.com\/vi\/"\][^\n]*replace\(\/\\\?v=\[\\w-\]\+\$\/, ""\)/.test(lib63),
      "화면 비교(e2e domShape)는 썸네일 판 표시(?v=)를 빼고 비교 — 예전 화면 · React 를 찍는 사이에 5분 경계를 넘어도 같게");
  }

  {
    console.log("64) 마스터 관리 영역 탭 ‘두고클래스’ · 메뉴 · 첫 화면 제목 ‘대시보드’ (2026-11-15)");
    const ad64 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), dc64 = fs.readFileSync(path.join(ROOT, "../ui/center/MasterDc.jsx"), "utf8");
    ok(/data-action="mtab" data-k="dc">두고클래스<\/button>/.test(ad64) && !/data-k="dc">DOOGO CLASS</.test(ad64) &&
      /\["DOOGO CLASS 운영", \[\["master\/dc", "대시보드", "grid"\]/.test(ad64) && /return head\("대시보드", "VOD 스토어의/.test(ad64) && /<Head title="대시보드" sub="VOD 스토어의/.test(dc64) &&
      /tab\("vod", "DOOGO CLASS"\)/.test(ad64) && /\["", "DOOGO CLASS 대시보드", "grid"\]/.test(ad64),
      "마스터: 관리 영역 탭 ‘두잉고 · 두고클래스’ · 왼쪽 메뉴와 첫 화면 제목 ‘대시보드’ (예전 화면 = React 같은 함수 · 강사센터 탭 · 메뉴는 그대로)");
  }

  {
    console.log("65) 강의 자료함 카테고리 — 시니어 기초 가이드 칩 · 강사센터 만들기 · 이름 바꾸기 · 지우기 (2026-11-15)");
    const vm65 = require("vm"), sb65 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb65.window = sb65; vm65.createContext(sb65); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm65.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb65, { filename: f }));
    const LC = sb65.DB.libCatsOf, c65 = { libCats: { senior: [{ id: "a", name: "쿠팡" }, { id: "", name: "x" }, { id: "b", name: "  " }, null, { id: "c", name: "컴퓨터" }] } };
    ok(LC(c65, "senior").map((x) => x.id).join(",") === "a,c" && LC(c65, "file").length === 0 && LC({}, "senior").length === 0 && LC(null, "senior").length === 0,
      "DB.libCatsOf(콘텐츠, 분류): 이름 · id 있는 카테고리만 · 없으면 빈 목록");
    const ap65 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), lb65 = fs.readFileSync(path.join(ROOT, "../ui/dg/Lib.jsx"), "utf8"), ad65 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), c2 = fs.readFileSync(path.join(ROOT, "../ui/center/Content2.jsx"), "utf8"), st65 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
    ok(/const all = resOf\(cat\), sel = libCatSel\(cat, r\), items = sel \? all\.filter\(\(it\) => it\.cat === sel\) : all;/.test(ap65) && /libCatBar\(cat, all, sel\) \+ '<div style="margin-top:14px">' \+ body/.test(ap65) &&
      /\.filter\(\(p\) => p\[1\] > 0\)/.test(ap65) && /chip\("#\/library\/" \+ cat, !sel, "전체", items\.length\)/.test(ap65) && /"\?cat=" \+ encodeURIComponent\(p\[0\]\.id\)/.test(ap65) && /\(all\.indexOf\(it\) \+ 1\)/.test(ap65) &&
      /const all = X\.resOf\(cat\), sel = X\.libCatSel\(cat, r\), items = sel \? all\.filter\(\(it\) => it\.cat === sel\) : all/.test(lb65) && /bar = X\.libCatBar\(cat, all, sel\)/.test(lb65) && /\{bar \? <RawOne html=\{bar\} \/> : null\}/.test(lb65) && /\(all\.indexOf\(it\) \+ 1\)/.test(lb65) &&
      /\.lib-cat\.on \{ background: var\(--primary\)/.test(st65),
      "수강생: 목록 위 ‘전체 N · 카테고리 N’ 칩(글이 있는 카테고리만) · ?cat= 으로 골라 보기 · 번호는 전체 순서 그대로 (예전 화면 = React 같은 HTML)");
    ok(/const libCatField = \(k\) => F\("cat", "카테고리", "select", \{ when: \(\) => DB\.libCatsOf\(C\(\), k\)\.length > 0/.test(ad65) && (ad65.match(/libCatField\("(ebook|file)"\)|libCatField\(k\)/g) || []).length === 3 &&
      /def\.fields\.filter\(\(f\) => !f\.when \|\| f\.when\(\)\)\.map\(\(f\) => fieldHtml\(f, item\)\)/.test(ad65) && /libCatAdmin\(k\) \+\s*simpleList\("res-" \+ k/.test(ad65) && /resPills\(it, isVideo, k\)/.test(ad65) &&
      /case "libcat-edit": libCatEdit\(d\.k, d\.id\); break;/.test(ad65) && /case "libcat-del": deleteLibCat\(d\.k, d\.id\); break;/.test(ad65) && /"libcat-form": saveLibCat/.test(ad65) &&
      /같은 이름의 카테고리가 이미 있어요/.test(ad65) && /items\.forEach\(\(it\) => \{ delete it\.cat; \}\)/.test(ad65) && /<Isl html=\{A\.libCatAdmin\(k\)\} \/>/.test(c2) && /A\.resPills\(it, isVideo, k\)/.test(c2),
      "강사센터: 탭 아래 ‘카테고리’ 줄(칩 = 이름 바꾸기 · 지우기 · ‘카테고리 추가’) · 글 수정 창 카테고리 고르기(카테고리가 있을 때만) · 목록에 카테고리 표시 · 지우면 글은 남고 ‘전체’에만 (예전 화면 = React)");
    const OF65 = require(path.join(ROOT, "api/_lib/oneoff.js")), op65 = OF65.OPS.find((x) => x.id === "2026-11-15-moon-senior-cats");
    const src65 = { resources: { senior: [{ id: "s1", title: "챗GPT 회원가입 및 첫 사용 방법" }, { id: "s2", title: "상품 이미지 누끼 따는 방법" }, { id: "s3", title: "네이버 웨일(Whale) 설치하는 방법" }, { id: "s4", title: "쿠팡 로켓그로스 입점" }, { id: "s5", title: "스마트스토어 정산 보기" }, { id: "s6", title: "홈택스 공동인증서", cat: "lc-etc" }, { id: "s7", title: "카카오톡 고객 응대" }] } };
    const w65 = OF65.moonSeniorCats((k) => (k === "content:moon" ? src65 : null)), n65 = w65.writes["content:moon"], cat65 = (id) => (n65.resources.senior.find((x) => x.id === id) || {}).cat;
    ok(op65 && op65.run === OF65.moonSeniorCats && !op65.when && n65.libCats.senior.map((x) => x.name).join("|") === "배송|쿠팡|상품등록|컴퓨터|기타|네이버" &&
      cat65("s1") === "lc-pc" && cat65("s2") === "lc-reg" && cat65("s3") === "lc-pc" && cat65("s4") === "lc-coupang" && cat65("s5") === "lc-naver" && cat65("s6") === "lc-etc" && cat65("s7") === undefined && w65.result.none === 1 && !src65.libCats &&
      OF65.moonSeniorCats(() => n65).result.skipped && OF65.moonSeniorCats(() => null).result.skipped,
      "일회성: 문대표 시니어 기초 가이드 카테고리 6개(보내 준 화면 — 빽형은 2026-11-16 뺌) · 제목으로 골라 넣기(웨일 · 크롬 · 챗GPT → 컴퓨터 · 누끼 → 상품등록 · 쿠팡 · 네이버) · 이미 고른 글 · 맞는 게 없는 글은 그대로 · 다시 돌리면 건너뜀");
  }

  {
    console.log("66) 시니어 기초 가이드 ‘빽형 건기식 AI 마스터툴 VOD’ 카테고리 지우기 (2026-11-16)");
    const OF66 = require(path.join(ROOT, "api/_lib/oneoff.js")), op66 = OF66.OPS.find((x) => x.id === "2026-11-16-moon-senior-drop-bb");
    const cats66 = [["lc-ship", "배송"], ["lc-coupang", "쿠팡"], ["lc-reg", "상품등록"], ["lc-pc", "컴퓨터"], ["lc-bb", "빽형 건기식 AI 마스터툴 VOD"], ["lc-etc", "기타"], ["lc-naver", "네이버"]].map((x) => ({ id: x[0], name: x[1] }));
    const src66 = { libCats: { senior: cats66, file: [{ id: "f1", name: "엑셀" }] }, resources: { senior: [{ id: "a", title: "웨일", cat: "lc-pc" }, { id: "b", title: "마스터툴", cat: "lc-bb" }, { id: "c", title: "없음" }] } };
    const w66 = OF66.moonSeniorDropBb((k) => (k === "content:moon" ? src66 : null)), n66 = w66.writes["content:moon"];
    ok(op66 && op66.run === OF66.moonSeniorDropBb && !op66.when && OF66.OPS.indexOf(op66) === OF66.OPS.findIndex((x) => x.id === "2026-11-15-moon-senior-cats") + 1 &&
      n66.libCats.senior.map((x) => x.name).join("|") === "배송|쿠팡|상품등록|컴퓨터|기타|네이버" && n66.libCats.file.length === 1 &&
      n66.resources.senior.map((x) => x.cat || "-").join(",") === "lc-pc,-,-" && w66.result.cleared.join() === "마스터툴" && src66.libCats.senior.length === 7 &&
      OF66.moonSeniorDropBb(() => n66).result.skipped && OF66.moonSeniorDropBb(() => null).result.skipped && !OF66.SENIOR_CATS.some((x) => /빽형/.test(x[1])),
      "일회성: 빽형 카테고리만 지우기(다른 카테고리 · 다른 분류 그대로) · 그 카테고리 글은 남기고 카테고리 없이 · 이미 지웠으면 건너뜀 · 처음 셋팅 목록에서도 뺌");
  }

  {
    console.log("67) 수강 기간 (평생 · 1~24개월) — 강사센터 설정 · 기간이 끝나면 로그인 · 세션 막기 (2026-11-18)");
    const D68 = require(path.join(ROOT, "shared/dates.js")), st68 = require(path.join(TMP, "class/api/_lib/store.js"));
    ok(D68.addMonths("2026-11-18", 1) === "2026-12-18" && D68.addMonths("2026-11-18", 3) === "2027-02-18" && D68.addMonths("2026-01-31", 1) === "2026-02-28" && D68.addMonths("2028-01-31", 1) === "2028-02-29" && D68.addMonths("2026-12-15", 24) === "2028-12-15" &&
      !D68.accessExpired({ accessUntil: "2026-12-18" }, "2026-12-18") && D68.accessExpired({ accessUntil: "2026-12-18" }, "2026-12-19") && !D68.accessExpired({}, "2099-01-01") && !D68.accessExpired({ accessUntil: "12/18" }, "2099-01-01") &&
      D68.kstToday(Date.parse("2026-11-18T14:59:00Z")) === "2026-11-18" && D68.kstToday(Date.parse("2026-11-18T15:00:00Z")) === "2026-11-19",
      "날짜: 11/18 + 1개월 = 12/18 (그 날까지 들어올 수 있어요) · 말일은 그 달 마지막 날로 · 기간 없으면 평생 · 한국 날짜 기준");
    ["dc_a", "dc_s", "dc_v"].forEach((k) => delete jar[k]);
    const today68 = D68.kstToday(), past68 = D68.addMonths(today68, -1), until68 = D68.addMonths(past68, 1);
    const live68 = { id: "s68a", instructorId: "moon", cohortId: "c4", name: "기간안내", phone4: "6801", status: "approved", appliedAt: today68, accessMonths: 1, accessFrom: today68, accessUntil: D68.addMonths(today68, 1) };
    const end68 = { id: "s68b", instructorId: "moon", cohortId: "c4", name: "기간끝남", phone4: "6802", status: "approved", appliedAt: past68, accessMonths: 1, accessFrom: D68.addMonths(past68, -1), accessUntil: D68.addDays(today68, -1) };
    await st68.writeDoc("stu:moon:s68a", live68); await st68.writeDoc("stu:moon:s68b", end68);
    const rA = await call("auth", { body: { action: "student", iid: "moon", name: "기간안내", phone4: "6801" }, headers: { "x-forwarded-for": "10.68.0.1" } });
    const meA = await call("bootstrap", { method: "GET" });
    // 로그인해 둔 뒤 기간이 끝나면(강사가 기간을 줄이거나 날이 지나면) 같은 세션도 막혀요
    const put68 = async (k, v) => st68.writeDoc(k, v, ((await st68.getDoc(k)) || {}).ver);
    await put68("stu:moon:s68a", Object.assign({}, live68, { accessUntil: D68.addDays(today68, -1) }));
    const meA2 = await call("bootstrap", { method: "GET" });
    delete jar.dc_s;
    const rB = await call("auth", { body: { action: "student", iid: "moon", name: "기간끝남", phone4: "6802" }, headers: { "x-forwarded-for": "10.68.0.2" } });
    const app68 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), adm68 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), stu68 = fs.readFileSync(path.join(ROOT, "../ui/center/Students.jsx"), "utf8"), vp68 = fs.readFileSync(path.join(ROOT, "api/vod-pay.js"), "utf8");
    ok(rA.json.ok && (meA.json.me || {}).student && meA.json.me.student.sid === "s68a" && !(meA2.json.me || {}).student && !rB.json.ok && rB.json.error === "expired" && rB.json.until === end68.accessUntil && !jar.dc_s,
      "서버: 기간 안이면 로그인 · 마지막 날이 지나면 로그인 막힘(expired + 그 날짜) · 이미 로그인한 세션도 다음 요청부터 막힘", { rA: rA.json, meA: (meA.json || {}).me, meA2: (meA2.json || {}).me, rB: rB.json });
    ok(/r\.error === "expired" \? expiredMsg\(r\.until\)/.test(app68) && /수강 기간\(" \+ DB\.date\.fmtFull\(until\) \+ "까지\)이 끝났어요/.test(app68) && /DB\.accessExpired\(s, DB\.date\.todayStr\(\)\)/.test(app68) &&
      /accessField\(s, isNew\) \+\s*stuCurField\(iid, s\)/.test(adm68) && /name="accessMonths"/.test(adm68) && /<option value="">평생<\/option>/.test(adm68) && /n <= DB\.ACCESS_MAX/.test(adm68) && /name="accessFrom"/.test(adm68) &&
      /Object\.assign\(tgt, \{ accessMonths: am, accessFrom: af, accessUntil: DB\.addMonths\(af, am\) \}\)/.test(adm68) && /delete tgt\.accessMonths; delete tgt\.accessFrom; delete tgt\.accessUntil;/.test(adm68) &&
      /pill\(STU\[s\.status\]\.label, STU\[s\.status\]\.cls\) \+ accessChip\(s\)/.test(adm68) && /<Isl html=\{A\.accessChip\(s\)\} \/>/.test(stu68) && /accessExpired\(s\)\) return fail\(res, 403, "두잉고 수강 기간/.test(vp68),
      "화면: 수강생 창 ‘수강 기간’(평생 · 1~24개월) + 시작일 · 안내 ‘○○까지 들어올 수 있어요’ · 평생이면 칸 지움 · 목록 칩(~날짜 · D-n · 기간 끝남 — 예전 = React) · 로그인 막힘 안내에 날짜 · VOD 강의실 들어가기도 막음");
    await put68("stu:moon:s68a", null); await put68("stu:moon:s68b", null);
  }

  {
    console.log("68) 스토어 카드 썸네일 아래 보강 — 종류 칩(▶ VOD) · 보조 칩 · 할인율 + 월 가격 · 혜택 칩 (탈잉 · Class101 참고 · 2026-11-19)");
    // cardInfo ~ perksHtml 만 떼어 실제로 계산해 봐요 (바깥 함수는 뜻이 같은 작은 가짜로)
    const vj69 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), a69 = vj69.indexOf("  const KTAG = "), b69 = vj69.indexOf("  /** 썸네일 위 찜 수 글자");
    const won69 = (n) => Number(n).toLocaleString("ko-KR") + "원", esc69 = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const sb69 = {
      typeOf: (p) => p.type || "vod", priceOf: (p) => (p.sale != null ? p.sale : p.price), y365: (p) => p.y || null, seatsLeft: (p) => (p.left == null ? null : p.left), lessons: (p) => p.lz || [], totalMin: (p) => p.min || 0,
      aboutTxt: (m) => "약 " + m + "분", fmtOpen: (s) => s + " 오픈", fmtLive: (s) => "LIVE " + s, placeShort: (s) => s || "", shipFeeTxt: () => "배송비 3,500원", stockLeft: (p) => (p.stock == null ? null : p.stock), viaOf: () => "줌",
      isUpd: (p) => !!p.upd, BADGE: { BEST: ["BEST", "best"], NEW: ["NEW", "new"], UPDATE: ["업데이트", "upd"], HOT: ["HOT", "hot"], NICE: ["추천", "nice"] }, pctOf: (p) => p.pct || 0, accessTxt: () => "12개월 시청",
      plgView: (p) => ({ give: !!p.plg, amt: 5000 }), dgOpen: (p) => !!p.dg, catOf: (c) => ({ label: c === "shop" ? "쇼핑몰 · 커머스" : "" }), won: won69, esc: esc69, icon: (n) => '<svg data-i="' + n + '"></svg>'
    };
    require("vm").createContext(sb69); require("vm").runInContext(vj69.slice(a69, b69) + "\n;this.out = { cardInfo, ctagsHtml, cpriceHtml, perksHtml, KTAG };", sb69);
    const T69 = sb69.out, J = (o) => JSON.stringify(o);
    const vodY = T69.cardInfo({ type: "vod", price: 273000, sale: 197000, y: { label: "12개월", sale: 197000, list: 273000, month: 16500 }, badges: ["HOT"], level: "입문 · 실전", lz: [1, 2, 3, 4, 5, 6, 7], min: 120, plg: 1, dg: 1, cat: "shop" });
    ok(a69 > 0 && b69 > a69 && J(vodY.kind) === J({ t: "VOD", k: "vod", ic: "play" }) && J(vodY.badge) === J({ t: "HOT", k: "hot" }) && vodY.subs.join("|") === "입문|총 7강|약 120분" && vodY.cat === "쇼핑몰 · 커머스" &&
      vodY.price.pct === 28 && vodY.price.main === "월 16,500원" && vodY.price.note === "12개월 수강권 · 총 197,000원" && !vodY.price.was &&
      vodY.perks.map((x) => x.k + ":" + x.ic + ":" + x.t).join("|") === "cp:gift:다짐 쿠폰 5,000원|dg:sparkles:두잉고 강의실 포함",
      "VOD 수강권: [▶ VOD] [HOT] [입문] [총 7강] [약 2시간] · 강사 | 분야 · ‘28% 월 16,500원’(상세와 같은 12개월 기준) + ‘12개월 수강권 · 총 197,000원’ · 혜택 칩(다짐 쿠폰 · 두잉고 강의실 — 해당될 때만)", vodY);
    const soon = T69.cardInfo({ status: "soon", price: 149000, openAt: "11월 20일(금)", badges: ["NEW"] }), freeV = T69.cardInfo({ price: 0 }), freeL = T69.cardInfo({ type: "live", price: 0, eventAt: "12/1", left: null });
    const vodN = T69.cardInfo({ type: "vod", price: 99000, sale: 69000, pct: 30, accessDays: 365, lz: [], min: 0, upd: 1 });
    ok(J(soon.kind) === J({ t: "오픈 예정", k: "soon", ic: "" }) && soon.subs.join("|") === "11월 20일(금) 오픈" && soon.price.main === "오픈 예정" && soon.price.was === "149,000원" && soon.price.note === "알림 받으면 오픈 할인" && soon.price.k === "soon" &&
      freeV.kind.t === "무료 특강" && freeV.kind.ic === "play" && freeV.price.main === "무료" && freeV.price.k === "free" && freeL.kind.t === "무료 LIVE" && !freeL.kind.ic &&
      vodN.badge.t === "업데이트" && vodN.subs.join("|") === "입문" && vodN.price.pct === 30 && vodN.price.main === "69,000원" && vodN.price.was === "99,000원" && vodN.price.note === "12개월 시청" && !vodN.perks.length,
      "오픈 예정(날짜 칩 · ‘오픈 예정’ + 예정가 · 알림 받으면 오픈 할인) · 무료 특강(▶) · 무료 LIVE · 수강권 없는 VOD는 할인율 + 판매가 + 정가 + 시청 기간 · 업데이트 배지는 isUpd 로도 · 빈 칩은 빼요");
    const eb = T69.cardInfo({ type: "ebook", price: 19000, format: "PDF", pages: 64 }), bk = T69.cardInfo({ type: "book", price: 15900, pages: 168, stock: 0 });
    const lv = T69.cardInfo({ type: "live", price: 59000, eventAt: "12/1", left: 3 }), off = T69.cardInfo({ type: "offline", price: 99000, eventAt: "12/7", place: "강남", left: 0 });
    ok(eb.kind.t === "전자책" && eb.subs.join("|") === "PDF 64쪽|평생 소장" && eb.price.main === "19,000원" && bk.kind.t === "종이책" && bk.subs.join("|") === "168쪽|배송비 3,500원|품절" &&
      lv.kind.t === "LIVE" && lv.subs.join("|") === "LIVE 12/1|줌|잔여 3석" && off.kind.t === "오프라인" && off.subs.join("|") === "강남|LIVE 12/7|잔여 0석" &&
      [vodY, soon, eb, bk, lv, off].every((x) => x.subs.length <= 3),
      "전자책(형식 · 쪽수 · 평생 소장) · 종이책(쪽수 · 배송비 · 품절) · LIVE(날짜 · 방식 · 잔여 석) · 오프라인(장소 · 날짜 · 잔여 석) · 보조 칩은 3개까지");
    const th69 = T69.ctagsHtml({ kind: { t: "VOD", k: "vod", ic: "play" }, badge: { t: "HOT", k: "hot" }, subs: ["<b>"] }), ph69 = T69.cpriceHtml(vodN.price), pe69 = T69.perksHtml(vodY.perks);
    ok(th69 === '<span class="vd-ctags"><span class="vd-ctag vd-ctag-k vd-ctag-vod"><svg data-i="play"></svg>VOD</span><span class="vd-ctag vd-ctag-b vd-ctag-b-hot">HOT</span><span class="vd-ctag">&lt;b&gt;</span></span>' &&
      ph69 === '<div class="vd-cprice"><span class="vd-cpr"><em>30%</em><strong>69,000원</strong><s>99,000원</s></span><small>12개월 시청</small></div>' && T69.perksHtml([]) === "" && (pe69.match(/class="vd-perk vd-perk-/g) || []).length === 2,
      "HTML: 종류 칩(▶ 아이콘) · 배지 · 보조 칩(글자 이스케이프) · 가격 줄 class 는 vd-cpr(쿠폰 표 .vd-cp 와 겹치지 않게) · 혜택 없으면 빈 값");
    const cj69 = fs.readFileSync(path.join(ROOT, "../ui/store/Card.jsx"), "utf8"), css69 = fs.readFileSync(path.join(ROOT, "vod.css"), "utf8"), tail69 = css69.slice(css69.indexOf("/* ---------- 카드 썸네일 아래 (2026-11-19"));
    const ci69 = vj69.slice(vj69.indexOf("  function cardInfo(p)"), vj69.indexOf("  const ctagsHtml = "));
    const ck69 = {
      card: /o = o \|\| \{\}; const m = me\(\), lk = likersOf\(p\), left = seatsLeft\(p\), x = cardInfo\(p\);/.test(vj69), body: /'<div class="vd-card-b">' \+ ctagsHtml\(x\) \+ '<b class="vd-title">'/.test(vj69), price: /cpriceHtml\(x\.price\) \+ perksHtml\(x\.perks\)/.test(vj69),
      xcard: /ctagsHtml\(xcardInfo\(it\)\)/.test(vj69), exp: /fmtOpen, cardInfo, xcardInfo, NAV/.test(vj69), old: !/function cardMetaParts|function cardMeta\(|cardMonth/.test(vj69), noStars: !/review|rating|stars|후기|수강생|soldOf/.test(ci69),
      rCard: /x = X\.cardInfo\(p\)/.test(cj69), rBody: /<CTags x=\{x\} \/><b className="vd-title">/.test(cj69), rPrice: /<CPrice pc=\{x\.price\} \/><Perks ps=\{x\.perks\} \/>/.test(cj69), rX: /<CTags x=\{X\.xcardInfo\(it\)\} \/>/.test(cj69), rCls: /className="vd-cpr"/.test(cj69), rOld: !/CardMeta/.test(cj69),
      css: tail69.length > 100 && !/\.vd-cp[\s,{]/.test(tail69) && /\.vd-cpr strong \{/.test(tail69), oneRow: /\.vd-ctags \{[^}]*flex-wrap: wrap;[^}]*height: 24px; overflow: hidden; \}/.test(tail69)
    };
    ok(Object.keys(ck69).every((k) => ck69[k]),
      "예전 카드 · React 카드가 같은 cardInfo 를 써요(옛 한 줄 정보 함수는 지움) · 별점 · 후기 · 수강생 수는 카드에 넣지 않아요 · 칩은 한 줄(넘치면 통째로 숨김)", Object.keys(ck69).filter((k) => !ck69[k]));
  }

  {
    console.log("69) 두잉고(/doinggo) 홈 화면 · 북마크 아이콘 · manifest · 검색어 · 사이트 이름 — 두고클래스와 따로 (2026-11-22)");
    const B70 = (f) => path.join(ROOT, "assets/brand", f), png70 = (f) => { const b = fs.readFileSync(B70(f)); return b.readUInt32BE(16) + "x" + b.readUInt32BE(20); };
    const sizes70 = { "dg-favicon.png": "64x64", "dg-apple-touch-icon.png": "180x180", "dg-icon-192.png": "192x192", "dg-icon-512.png": "512x512", "dg-icon-maskable-512.png": "512x512" };
    const miss70 = Object.keys(sizes70).filter((f) => !fs.existsSync(B70(f)) || png70(f) !== sizes70[f]);
    const src70 = fs.readFileSync(B70("dg-app-icon.svg"), "utf8"), fav70 = fs.readFileSync(B70("dg-favicon.svg"), "utf8"), word70 = fs.readFileSync(B70("doinggo-word.svg"), "utf8");
    ok(!miss70.length && /<g id="art"/.test(src70) && /fill="#FFFFFF"/.test(src70) && /stroke="#FF0037"/.test(src70) && /<rect width="1024" height="1024" rx="200" fill="#FFFFFF"\/>/.test(fav70) && /aria-label="두잉고"/.test(word70) &&
      /src: "dg-app-icon\.svg", pre: "dg-"/.test(fs.readFileSync(path.join(ROOT, "scripts/web-icons.js"), "utf8")),
      "아이콘: 흰 바탕 두잉고(검정 글자 + 빨간 밑줄 · 원본 dg-app-icon.svg) → 탭 64 · 아이폰 180 · 안드로이드 192 · 512 · 동그랗게 잘리는 512 (scripts/web-icons.js 가 두고클래스 것과 같이 만들어요)", miss70);
    const PM70 = require(path.join(ROOT, "api/_lib/pagemeta.js")), V70 = "?v=" + PM70.DG_ICON_V;
    const man70 = JSON.parse(fs.readFileSync(path.join(ROOT, "doinggo.webmanifest"), "utf8")), dc70 = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
    ok(man70.name === "두잉고" && man70.short_name === "두잉고" && man70.start_url === "/doinggo" && man70.id === "/doinggo" && man70.display === dc70.display && man70.icons.length === 3 &&
      man70.icons.every((x) => x.src.indexOf("/assets/brand/dg-") === 0 && x.src.slice(-V70.length) === V70 && fs.existsSync(B70(x.src.split("?")[0].replace("/assets/brand/", "")))) && man70.icons.some((x) => x.purpose === "maskable") && dc70.icons.every((x) => x.src.indexOf("/assets/brand/dg-") < 0),
      "manifest: 두잉고(doinggo.webmanifest · 이름 · 시작 주소 /doinggo · 아이콘 3개 · ?v=) · 두고클래스 manifest 는 그대로");
    const idx70 = require(path.join(ROOT, "scripts/index-abs.js"))(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")), hd70 = PM70.doinggoPage(idx70), head70 = hd70.slice(0, hd70.indexOf("<body>"));
    const ldOk70 = (head70.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []).some((t) => { try { const j = JSON.parse(t.replace(/^<script[^>]*>|<\/script>$/g, "")); return j["@type"] === "WebPage" && j.url === "https://www.doogoclass.com/doinggo" && j.primaryImageOfPage && /og-doinggo\.jpg\?v=\d{8}$/.test(j.primaryImageOfPage.url); } catch (e) { return false; } });
    ok(head70.indexOf('<link rel="icon" href="/assets/brand/dg-favicon.svg' + V70 + '" type="image/svg+xml" />') >= 0 && head70.indexOf('<link rel="icon" href="/assets/brand/dg-favicon.png' + V70 + '"') >= 0 &&
      head70.indexOf('<link rel="apple-touch-icon" href="/assets/brand/dg-apple-touch-icon.png' + V70 + '"') >= 0 && head70.indexOf('<link rel="manifest" href="/doinggo.webmanifest' + V70 + '" />') >= 0 &&
      /<meta name="apple-mobile-web-app-title" content="두잉고" \/>/.test(head70) && /<meta name="application-name" content="두잉고" \/>/.test(head70) && !/assets\/brand\/(favicon|apple-touch-icon)\.|"\/manifest\.webmanifest/.test(head70) &&
      head70.indexOf('<meta name="keywords" content="' + PM70.DG_KEYWORDS + '" />') >= 0 && /^두잉고, /.test(PM70.DG_KEYWORDS) && !/DOOGO CLASS|VOD 클래스|스마트스토어/.test(PM70.DG_KEYWORDS) && /<meta property="og:site_name" content="두잉고" \/>/.test(head70) && ldOk70 &&
      /<img class="boot-logo boot-logo-dg" src="\/assets\/brand\/doinggo-word\.svg" alt="두잉고"/.test(hd70) && /<header><a href="https:\/\/www\.doogoclass\.com\/doinggo"><strong>두잉고<\/strong> doinggo<\/a><\/header>/.test(hd70),
      "/doinggo 머리 정보: 두잉고 아이콘 · manifest · 아이폰 홈 화면 이름 ‘두잉고’ · 두잉고 검색어(두고클래스 스토어 말 빼고) · og:site_name 두잉고 · WebPage(공유 이미지 og-doinggo.jpg) · 첫 로딩 로고 · 로봇용 머리글");
    const store70 = PM70.storeHome(idx70, { products: [{ id: "a", type: "vod", status: "on", title: "x", iid: "choi" }] }), terms70 = PM70.legalPage(idx70, "terms", PM70.legalText());
    const dcHead70 = (h) => h.indexOf('<link rel="manifest" href="/manifest.webmanifest?v=20261102b" />') >= 0 && h.indexOf("dg-favicon") < 0 && h.indexOf("apple-mobile-web-app-title") < 0 && /og:site_name" content="두고클래스 DOOGO CLASS"/.test(h);
    ok(dcHead70(store70) && dcHead70(terms70) && dcHead70(idx70),
      "다른 페이지(스토어 홈 · 약관 · 기본 index.html)는 두고클래스 아이콘 · manifest · 사이트 이름 그대로");
    const ic70 = fs.readFileSync(path.join(ROOT, "icons.js"), "utf8"), mj70 = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), css70 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
    ok(new RegExp('const V = \\{ dc: "20261102b", dg: "' + PM70.DG_ICON_V + '" \\}').test(ic70) && /manifest: "\/doinggo\.webmanifest\?v=" \+ V\.dg, name: "두잉고"/.test(ic70) && /if \(now === k\) return;/.test(ic70) &&
      /if \(window\.siteIcons\) window\.siteIcons\(next === "home" \? "dg" : "dc"\);/.test(mj70) && /\.boot-logo\.boot-logo-dg \{ width: 96px; height: auto; \}/.test(css70),
      "화면 안에서 주소를 옮길 때(main.js go): 두잉고 소개로 오면 두잉고 아이콘, 나가면 두고클래스 아이콘 (icons.js siteIcons · 서버와 같은 ?v= · 이미 맞으면 그대로)");
  }

  {
    console.log("70) 과제 검수 — 전체 선택 표시 · 이미 승인된 과제는 다시 승인 안 함 · 승인 취소(검수 대기로) · 검수 기록 (2026-11-22)");
    const aj70 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), cut70 = (a, b) => { const i = aj70.indexOf(a), j = aj70.indexOf(b, i); return i >= 0 && j > i ? aj70.slice(i, j) : ""; };
    const code70 = cut70("  const revState = (sub)", "  /** 검수 창의 검수 기록") + cut70("  function revBulkBtns(filter) {", "  function bulkBar(shown) {") + cut70("  function reviewBtns(sid, mid, st) {", "\n  }\n") + "\n  }\n";
    let now70 = 1000;
    const sb70 = { actor: () => ({ by: "테스트 강사", byId: "t", role: "instructor" }), Date: { now: () => now70 }, btn: (label, act, cls, extra) => "[" + act + (/data-status="(\w+)"/.exec(extra || "") || ["", ""])[1] + ":" + label + "]", icon: () => "" };
    require("vm").createContext(sb70); require("vm").runInContext(code70 + "\n;this.out = { revState, setReview, revBulkBtns, reviewBtns };", sb70);
    const R70 = sb70.out, sub70 = { at: 1, result: { pass: true } }, steps70 = [];
    steps70.push(R70.setReview(sub70, "approved", "좋아요"), R70.revState(sub70) === "approved" && sub70.review.at === 1000 && sub70.review.by === "테스트 강사");
    now70 = 2000; steps70.push(R70.setReview(sub70, "approved", "") === false, sub70.review.at === 1000 && sub70.review.comment === "좋아요" && !sub70.reviewLog);
    now70 = 3000; steps70.push(R70.setReview(sub70, "pending"), !sub70.review && R70.revState(sub70) === "pending" && sub70.reviewLog.length === 1);
    const lg70 = sub70.reviewLog[0];
    steps70.push(lg70.status === "approved" && lg70.at === 1000 && lg70.end === "undo" && lg70.endAt === 3000 && lg70.endBy === "테스트 강사", R70.setReview(sub70, "pending") === false);
    now70 = 4000; steps70.push(R70.setReview(sub70, "fix", "다시 찍어 주세요"), R70.setReview(sub70, "fix", "x", true) === false && sub70.review.comment === "다시 찍어 주세요");
    now70 = 5000; steps70.push(R70.setReview(sub70, "fix", "전체가 보이게 다시 찍어 주세요"), sub70.review.comment === "전체가 보이게 다시 찍어 주세요" && sub70.reviewLog.length === 2 && sub70.reviewLog[1].end === "fix");
    now70 = 6000; steps70.push(R70.setReview(sub70, "approved", ""), sub70.reviewLog.length === 3 && sub70.reviewLog[2].status === "fix" && sub70.reviewLog[2].end === "approved");
    for (let i = 0; i < 16; i++) { now70 += 10; R70.setReview(sub70, i % 2 ? "approved" : "pending"); } // 취소할 때마다 기록 1개 → 3 + 8 = 11 → 최근 10개만
    steps70.push(sub70.reviewLog.length === 10, true);
    ok(steps70.every(Boolean),
      "검수 바꾸기: 승인 → 다시 승인은 그대로(시각 · 말 · 기록 그대로) → 승인 취소 = 강사 결과 지움(검수 대기) + 기록(누가 · 언제 승인 · 언제 취소) → 보완 요청 · 일괄 보완 요청은 이미 보완이면 그대로 · 낱개는 내용 고치기 → 기록은 최근 10개", steps70.map((x, i) => i + ":" + !!x).filter((x) => /false/.test(x)));
    const acts70 = (f) => R70.revBulkBtns(f).map((b) => b[2] + "/" + b[1]).join(" ");
    ok(acts70("pending") === "rev-bulk-fix/선택 보완 요청 rev-bulk-approve/선택 승인" && acts70("approved") === "rev-bulk-fix/선택 보완 요청 rev-bulk-undo/선택 승인 취소" &&
      acts70("fix") === "rev-bulk-undo/선택 보완 요청 취소 rev-bulk-approve/선택 승인" && acts70("all") === acts70("pending") &&
      R70.reviewBtns("s", "m", "pending") === '<span class="a-spacer"></span>[review-savefix:보완 요청][review-saveapproved:승인]' &&
      R70.reviewBtns("s", "m", "approved") === '<span class="a-spacer"></span>[review-undo:승인 취소][review-savefix:보완 요청]' &&
      R70.reviewBtns("s", "m", "fix") === '<span class="a-spacer"></span>[review-undo:보완 요청 취소][review-savefix:보완 요청 고치기][review-saveapproved:승인]',
      "버튼: 검수 대기 탭 = 보완 요청 · 승인 / 승인 탭 = 보완 요청 · 선택 승인 취소(‘선택 승인’ 없음) / 보완 요청 탭 = 보완 요청 취소 · 승인 · 검수 창도 지금 상태에 맞게(승인된 과제엔 ‘승인’ 대신 ‘승인 취소’)", [acts70("pending"), acts70("approved"), acts70("fix"), R70.reviewBtns("s", "m", "approved")]);
    ok(/if \(setReview\(l\[l\.length - 1\], status, comment, true\)\) \{ n\+\+; changed = true; \} else skip\+\+;/.test(aj70) && /if \(changed\) DB\.saveProgress\(sid, p\);/.test(aj70) && /이미 승인된 " \+ S\.approved \+ "개는 그대로 둬요/.test(aj70) &&
      /case "rev-bulk-undo": \{/.test(aj70) && /\(\) => bulkReview\("pending"\)\);/.test(aj70) && /case "review-undo": \{/.test(aj70) && /const ok = !!sub && setReview\(sub, "pending"\);/.test(aj70) &&
      /if \(!setReview\(sub, d\.status, comment\.trim\(\)\)\) \{ closeModal\(\); render\(\); toast\("이미 승인된 과제예요\."\); break; \}/.test(aj70) && /revLogHtml\(sub\) \+/.test(aj70) && /revBulkBtns\(ui\.revFilter\)\.map\(\(b\) => btn\(icon\(b\[0\], "sm"\) \+ b\[1\], b\[2\], b\[3\]\)\)/.test(aj70) &&
      /reviewPill, revBulkBtns, cohortName,/.test(aj70) && (aj70.match(/\.review = Object\.assign\(/g) || []).length === 1,
      "일괄 승인 · 보완 요청 · 되돌리기 = 같은 setReview(이미 그 상태면 건너뛰고 개수를 알려 줌 · 바뀐 수강생만 저장) · 낱개 승인도 다시 승인 안 함 · 검수 창에 검수 기록 · 검수 결과를 쓰는 곳은 setReview 한 곳");
    const rj70 = fs.readFileSync(path.join(ROOT, "../ui/center/Reviews.jsx"), "utf8");
    ok(/\{A\.revBulkBtns\(ui\.revFilter\)\.map\(\(b\) => <Btn key=\{b\[2\]\} action=\{b\[2\]\} cls=\{b\[3\]\}><Icon n=\{b\[0\]\} c="sm" \/>\{b\[1\]\}<\/Btn>\)\}/.test(rj70) && !/선택 승인<\/Btn>/.test(rj70) &&
      /<input key=\{on \? "on" : "off"\} type="checkbox" className="rev-pick" data-key=\{key\} defaultChecked=\{on\}/.test(rj70) && /<input key=\{"all2-" \+ allOn\} type="checkbox" id="rev-all-2" defaultChecked=\{allOn\} \/>/.test(rj70) && /<input key=\{"all-" \+ allOn\} type="checkbox" id="rev-all"/.test(rj70),
      "React 과제 검수(운영 화면): 일괄 버튼은 예전 화면과 같은 revBulkBtns · 체크 칸은 고른 상태가 바뀌면 다시 그려서 ‘전체 선택’하면 줄마다 체크가 보여요(예전엔 처음 값만 → 개수만 바뀌고 줄은 빈 칸)");
    const AC70 = require(path.join(ROOT, "api/_lib/access.js"));
    const old70 = { submissions: { m1: [{ at: 1, review: { status: "approved", by: "강사" }, reviewLog: [{ status: "fix", end: "approved" }] }], m2: [{ at: 5, reviewLog: [{ status: "approved", end: "undo" }] }] } };
    const stuW70 = AC70.writer("prog:moon:s1", { student: { sid: "s1", iid: "moon" } }, false);
    const sent70 = { submissions: { m1: [{ at: 1, review: { status: "approved", by: "나" }, reviewLog: [] }], m2: [{ at: 5 }, { at: 9, review: { status: "approved" }, reviewLog: [{ status: "x" }] }] } };
    const got70 = stuW70.fix(JSON.parse(JSON.stringify(old70)), sent70);
    const insW70 = AC70.writer("prog:moon:s1", { admin: { role: "instructor", iid: "moon" } }, false), undone70 = { submissions: { m1: [{ at: 1, reviewLog: [{ status: "approved", end: "undo" }] }] } };
    ok(got70.submissions.m1[0].review.by === "강사" && got70.submissions.m1[0].reviewLog.length === 1 && got70.submissions.m1[0].reviewLog[0].end === "approved" &&
      got70.submissions.m2[0].reviewLog.length === 1 && !got70.submissions.m2[1].review && !got70.submissions.m2[1].reviewLog &&
      !insW70.fix(JSON.parse(JSON.stringify(old70)), JSON.parse(JSON.stringify(undone70))).submissions.m1[0].review,
      "서버: 수강생이 저장해도 검수 결과 · 검수 기록은 서버 값 그대로(지우거나 바꾸기 · 새 제출에 끼워 넣기 안 됨) · 강사는 승인 취소(검수 결과 지우기)를 저장할 수 있어요");
  }

  {
    console.log("71) 로딩 화면 — 두잉고 쪽은 두잉고 로딩 · 두고클래스 쪽은 그대로 · 서비스를 옮기면 ‘OO로 이동중입니다’ (2026-11-22)");
    // 브라우저 흉내 (쿠키 · 주소) 위에서 areas.js 를 그대로 돌려요
    const jar71 = {};
    const doc71 = {
      currentScript: { src: "https://www.doogoclass.com/areas.js?v=t" }, querySelectorAll: () => [], documentElement: { getAttribute: () => null },
      head: { appendChild: () => {} }, body: null, createElement: () => ({ addEventListener() {}, setAttribute() {} }),
      get cookie() { return Object.keys(jar71).map((k) => k + "=" + jar71[k]).join("; "); },
      set cookie(s) { const p = String(s).split(";"), kv = p[0].split("="), k = kv[0].trim(), v = kv.slice(1).join("="); if (/max-age=0(\s|;|$)/.test(s)) delete jar71[k]; else jar71[k] = v; jar71.__w = (jar71.__w || 0); }
    };
    const loc71 = { hash: "", pathname: "/", search: "", href: "https://www.doogoclass.com/" };
    const sb71 = { document: doc71, location: loc71, URL, localStorage: { getItem: () => null }, console };
    sb71.window = sb71; sb71.__dcClean = true;
    require("vm").createContext(sb71); require("vm").runInContext(fs.readFileSync(path.join(ROOT, "areas.js"), "utf8"), sb71, { filename: "areas.js" });
    const A71 = sb71.DC_AREA, at71 = (p) => { loc71.pathname = p; loc71.href = "https://www.doogoclass.com" + p; };
    delete jar71.__w;
    const pb71 = ["/", "/vod", "/vod/my/classes", "/terms", "/vod/dg", "/doinggo", "/doinggo/guide", "/partner", "/login", "/home", "/missions/1/m1-7", "/vodclass/x", "/partners", "/p/moon", "/free/moon", "/center"].map((p) => p + ">" + A71.pathBrand(p)).join(" ");
    ok(pb71 === "/>dc /vod>dc /vod/my/classes>dc /terms>dc /vod/dg>dc /doinggo>dg /doinggo/guide>dg /partner>dg /login>dg /home>dg /missions/1/m1-7>dg /vodclass/x>dg /partners>dg /p/moon>dg /free/moon>dg /center>null" &&
      A71.brand("vod") === "dc" && A71.brand("home") === "dg" && A71.brand("student") === "dg" && A71.brand("landing") === "dg" && A71.brand("admin") === null,
      "쪽 나누기: 두고클래스 = 스토어 · 회원 · 약관 · 두잉고 VOD 고르기(/vod/dg) / 두잉고 = 소개(/doinggo · 사용법) · 강의실 · 강의실 로그인 · VOD 강의실 · 제휴채널 · 강사 소개 · 무료강의 / 강사센터 = 기억 없으면 어느 쪽도 아님", pb71);
    const w71 = []; const set71 = Object.getOwnPropertyDescriptor(doc71, "cookie").set;
    Object.defineProperty(doc71, "cookie", { get: Object.getOwnPropertyDescriptor(doc71, "cookie").get, set(s) { w71.push(s); set71(s); }, configurable: true });
    A71.ctBrand("dg"); A71.ctBrand("dg"); const ct71 = A71.brand("admin"), p71 = A71.pathBrand("/center/reviews"); A71.ctBrand("dc");
    ok(ct71 === "dg" && p71 === "dg" && A71.brand("admin") === "dc" && w71.length === 2 && /^dc_ct=dg; path=\/; max-age=31536000; samesite=lax$/.test(w71[0]) && A71.ctBrand("x") === "dc",
      "강사센터: 머리 로고 쪽을 쿠키 dc_ct 에 기억(바뀔 때만 써요 · 1년) → 강사센터 로딩 화면 · 이동 안내가 그 쪽을 따라가요", w71);
    ok(A71.bootText("dg", true) === "두잉고로 이동중입니다" && A71.bootText("dc", true) === "두고클래스로 이동중입니다" && A71.bootText("dg", false) === "로딩중입니다" && A71.bootText("dc") === "로딩중입니다",
      "문구: 다른 서비스로 옮기면 ‘두잉고로 이동중입니다’ · ‘두고클래스로 이동중입니다’ · 같은 쪽은 ‘로딩중입니다’");
    delete jar71.dc_ct;
    at71("/doinggo"); const s1 = A71.bootState();
    jar71.dc_boot = encodeURIComponent("dg|m|/doinggo"); const s2 = A71.bootState();
    at71("/vod"); const s3 = A71.bootState(); // 다른 주소에 남은 쿠키는 쓰지 않아요 (다른 창 · 늦게 연 페이지)
    jar71.dc_boot = encodeURIComponent("dc|m|/vod"); const s4 = A71.bootState();
    at71("/center"); jar71.dc_boot = encodeURIComponent("dg||/center"); const s5 = A71.bootState(); delete jar71.dc_boot; const s6 = A71.bootState();
    jar71.dc_boot = "%E0%A4%A"; const s7 = A71.bootState(); delete jar71.dc_boot;
    ok(JSON.stringify([s1, s2, s3, s4, s5, s6, s7]) === JSON.stringify([{ b: "dg", m: false }, { b: "dg", m: true }, { b: "dc", m: false }, { b: "dc", m: true }, { b: "dg", m: false }, { b: "dc", m: false }, { b: "dc", m: false }]),
      "첫 로딩 화면 쪽: 주소 규칙(/doinggo = 두잉고) · 떠난 페이지가 남긴 쿠키 dc_boot(‘쪽|m|주소’)는 그 주소에서만 써서 ‘이동중입니다’를 이어서 · 강사센터는 쿠키 쪽 · 기억 없으면 두고클래스 · 깨진 쿠키는 무시", [s1, s2, s3, s4, s5, s6, s7]);
    // index.html 첫 로딩 화면(서버가 보낸 DOOGO CLASS 그대로)을 bootFix 가 바꾸는 모양
    const mkBoot71 = () => {
      const img = { className: "boot-logo boot-logo-dc", attrs: { src: "assets/brand/doogo-class-word.svg", alt: "DOOGO CLASS", width: "156", height: "20" }, setAttribute(k, v) { this.attrs[k] = String(v); } };
      img.classList = { contains: (c) => img.className.split(" ").indexOf(c) >= 0 };
      const txt = { firstChild: { nodeType: 3, nodeValue: "로딩중입니다" } };
      return { img, txt, el: { classList: { contains: (c) => c === "boot-wait" }, querySelector: (q) => (q === ".boot-logo" ? img : q === ".boot-txt" ? txt : null) } };
    };
    at71("/p/moon"); const b1 = mkBoot71(); A71.bootFix(b1.el);
    at71("/"); jar71.dc_boot = encodeURIComponent("dc|m|/"); const b2 = mkBoot71(); A71.bootFix(b2.el); delete jar71.dc_boot;
    at71("/vod"); const b3 = mkBoot71(); A71.bootFix(b3.el); A71.bootFix(null); A71.bootFix({ classList: { contains: () => false } });
    ok(b1.img.className === "boot-logo boot-logo-dg" && b1.img.attrs.src === "assets/brand/doinggo-word.svg" && b1.img.attrs.alt === "두잉고" && b1.img.attrs.width === "96" && b1.img.attrs.height === "36" && b1.txt.firstChild.nodeValue === "로딩중입니다" &&
      b2.img.className === "boot-logo boot-logo-dc" && b2.txt.firstChild.nodeValue === "두고클래스로 이동중입니다" && b3.img.attrs.src === "assets/brand/doogo-class-word.svg" && b3.txt.firstChild.nodeValue === "로딩중입니다",
      "예전 화면 첫 로딩: 두잉고 쪽 주소(강사 소개 등)는 두잉고 로고(96×36)로 바꾸고 · 두잉고에서 옮겨 온 스토어는 ‘두고클래스로 이동중입니다’ · 그냥 연 스토어는 그대로 · 엉뚱한 요소는 건드리지 않아요", [b1.img, b2.txt.firstChild.nodeValue]);
    const ix71 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    ok(/<p class="boot-txt">로딩중입니다<span class="boot-dots" aria-hidden="true"><i>\.<\/i><i>\.<\/i><i>\.<\/i><\/span><\/p><\/div>\n    <script>try \{ if \(window\.DC_AREA && document\.currentScript\) window\.DC_AREA\.bootFix\(document\.currentScript\.previousElementSibling\); \} catch \(e\) \{\}<\/script>\n    <!-- 검색용 안내 글/.test(ix71) &&
      ix71.indexOf('<script src="areas.js"></script>') < ix71.indexOf("<body>"),
      "index.html: 첫 로딩 화면 바로 뒤에서 bootFix (areas.js 는 <head> 에서 먼저 받아요 — 그려지기 전에 맞는 로고 · 문구)");
    // React 화면(서버) — 같은 규칙
    const SC71 = require(path.join(ROOT, "shared/screens.js"));
    const keys71 = [["/vod/my", "vod-my"], ["/vod/login", "vod-auth"], ["/vod/dg", "vod-auth"], ["/vod/order/x", "vod-order"], ["/vod/checkout/x", "vod-checkout"], ["/vod/learn/x", "vod-learn"], ["/terms", "vod-legal"], ["/vod/teachers", "vod-teachers"], ["/vod/c/all", "vod-list"], ["/vod/about", "vod-about"], ["/vod/partners", "vod-partners"], ["/", "vod-home"], ["/vod/p/v5", "vod-product"],
      ["/home", "dg-home"], ["/missions/1/m1-7", "dg-learn"], ["/schedule", "dg-board"], ["/library", "dg-lib"], ["/partners", "dg-more"], ["/vodclass/v1", "dg-vod"], ["/login", "dg-login"],
      ["/center/login", "ct-login"], ["/center", "ct-dash"], ["/center/reviews", "ct-ops"], ["/center/curriculum", "ct-content"], ["/center/vod", "ct-vod"], ["/center/master", "ct-master"], ["/center/partner", "ct-partner"], ["/center/media", "ct-media"]];
    const bad71 = []; jar71.dc_ct = "dg";
    keys71.forEach((x) => { const k = SC71.match(x[0]); if (k !== x[1] || SC71.brandOfKey(k, "dg") !== A71.pathBrand(x[0])) bad71.push(x[0] + ":" + k + ":" + SC71.brandOfKey(k, "dg") + "/" + A71.pathBrand(x[0])); });
    delete jar71.dc_ct;
    const allKeys71 = SC71.KEYS.every((k) => keys71.some((x) => x[1] === k));
    ok(!bad71.length && allKeys71 && SC71.brandOfKey("ct-dash") === null && SC71.brandOfKey(null) === null,
      "React 화면 " + SC71.KEYS.length + "개 모두: 서버 규칙(screens.js brandOfKey — dg-* 두잉고 · vod-* 두고클래스 · ct-* 기억) = 예전 화면 규칙(areas.js)", bad71);
    const r71 = [SC71.bootOf("/login"), SC71.bootOf("/vod/my/classes?x=1", "dc|m|/vod/my/classes"), SC71.bootOf("/vod/my", encodeURIComponent("dc|m|/vod/my")), SC71.bootOf("/login", "dg|m|/vod"), SC71.bootOf("/center/reviews", "", "dg"), SC71.bootOf("/center", ""), SC71.bootOf("/", "%E0%A4%A"), SC71.bootOf("/vodclass/v1", "dg|m|/vodclass/v1")];
    ok(JSON.stringify(r71) === JSON.stringify([{ b: "dg", m: false }, { b: "dc", m: true }, { b: "dc", m: true }, { b: "dg", m: false }, { b: "dg", m: false }, { b: "dc", m: false }, { b: "dc", m: false }, { b: "dg", m: true }]),
      "React 첫 로딩(서버): 강의실 로그인 = 두잉고 · 옮겨 온 쿠키는 그 주소에서만(? 뒤는 빼고) · 강사센터 = 기억한 쪽(없으면 두고클래스) · 깨진 쿠키 무시", r71);
    const pg71 = fs.readFileSync(path.join(ROOT, "../app/(react)/n/[[...path]]/page.js"), "utf8"), ap71 = fs.readFileSync(path.join(ROOT, "../ui/App.jsx"), "utf8");
    ok(/return <App boot=\{SCREENS\.bootOf\(p, v\("dc_boot"\), v\("dc_ct"\)\)\} \/>;/.test(pg71) && /\(await headers\(\)\)\.get\("x-dc-path"\)/.test(pg71) &&
      /export default function App\(\{ boot \}\)/.test(ap71) && /useState\(\(\) => \(\{ b: brandK\(boot && boot\.b\), m: !!\(boot && boot\.m\) \}\)\)/.test(ap71) &&
      /leave\(b, m\) \{ setBt\(\{ b: brandK\(b\), m: !!m \}\); setSt\(\(s\) => Object\.assign\(\{\}, s, \{ k: null \}\)\); \}/.test(ap71) &&
      /<BootFail b=\{bt\.b\} \/> : Screen && ready \? <Screen n=\{st\.n\} h=\{st\.h\} moved=\{st\.moved\} keep=\{st\.keep\} \/> : <Boot b=\{bt\.b\} m=\{bt\.m\} \/>/.test(ap71) &&
      /dg: \["\/assets\/brand\/doinggo-word\.svg", "두잉고", 96, 36\]/.test(ap71) && /\(m \? \(b === "dg" \? "두잉고로" : "두고클래스로"\) \+ " 이동중입니다" : "로딩중입니다"\)/.test(ap71) && !/const LOGO = <img/.test(ap71),
      "React 화면: 서버가 주소 · 쿠키로 정한 쪽을 첫 화면부터(서버 화면 = 브라우저 첫 화면) · 새로 부르기 전 leave(쪽, 이동) · 연결 실패 화면도 같은 쪽 로고");
    // main.js — 로딩 화면 만들기 · 영역 이동 · 바로 바뀌는 이동 · 일반 링크 · 뒤로 가기
    const mj71 = fs.readFileSync(path.join(ROOT, "main.js"), "utf8"), mcut71 = (a, b) => { const i = mj71.indexOf(a), j = mj71.indexOf(b, i); return i >= 0 && j > i ? mj71.slice(i, j) : ""; };
    const sbm71 = { AR: A71, BOOT0: { b: "dg", m: true } }; require("vm").createContext(sbm71);
    require("vm").runInContext(mcut71("  const logoHtml = (b)", "  /** 새로 부를 페이지") + "\n;this.out = { bootHtml, logoHtml };", sbm71);
    const h1 = sbm71.out.bootHtml("dg", true), h2 = sbm71.out.bootHtml("dc", false), h3 = sbm71.out.bootHtml();
    ok(/^<div class="boot-wait" role="status" aria-live="polite"><img class="boot-logo boot-logo-dg" src="assets\/brand\/doinggo-word\.svg" alt="두잉고" width="96" height="36" fetchpriority="high"><span class="boot-bar" aria-hidden="true"><i><\/i><\/span><p class="boot-txt">두잉고로 이동중입니다<span class="boot-dots"/.test(h1) &&
      /<img class="boot-logo boot-logo-dc" src="assets\/brand\/doogo-class-word\.svg" alt="DOOGO CLASS" width="156" height="20" fetchpriority="high">.*<p class="boot-txt">로딩중입니다</.test(h2) && h3 === h1,
      "main.js 로딩 화면: 쪽 로고(두잉고 96×36 · DOOGO CLASS 156×20) + 진행 막대 + 문구 · 처음 화면은 첫 로딩 쪽 그대로", [h1.slice(0, 120), h2.slice(0, 80)]);
    ok(/const from = curBrand\(\), to = window\.DC_AREA\.brand\(next\) \|\| from, mv = to !== from;\n    bootCookie\(to, mv\);\n    if \(!REACT_PAGE\) root\.innerHTML = bootHtml\(to, mv\); else if \(window\.ReactApp && window\.ReactApp\.leave\) window\.ReactApp\.leave\(to, mv\);/.test(mj71) &&
      /const changed = next !== mode, fromB = changed && mode \? curBrand\(\) : null;/.test(mj71) && /if \(fromB\) \{ const toB = window\.DC_AREA\.brand\(next\); if \(toB && toB !== fromB\) moveCover\(toB, 650\); \}/.test(mj71) &&
      mj71.indexOf("if (fromB)") > mj71.indexOf("if (!window.DC_AREA.ready(next)) { moveArea(next); return; }") &&
      /const AR = window\.DC_AREA, BOOT0 = AR\.bootState\(\);[^\n]*\n  try \{ document\.cookie = "dc_boot=; path=\/; max-age=0; samesite=lax"; \}/.test(mj71) &&
      /document\.cookie = "dc_boot=" \+ encodeURIComponent\(b \+ "\|" \+ \(m \? "m" : ""\) \+ "\|" \+ \(path \|\| location\.pathname\)\) \+ "; path=\/; max-age=20; samesite=lax";/.test(mj71) &&
      /root\.innerHTML = '<div class="boot-wait boot-err" role="alert">' \+ logoHtml\(curBrand\(\)\)/.test(mj71) && !/const LOGO = '<img/.test(mj71),
      "main.js 영역 이동: 새로 부르기 전 옮겨 갈 쪽 로딩 화면(다른 서비스면 ‘이동중입니다’) + 쿠키 dc_boot(20초)로 새 페이지까지 · 강사센터처럼 어느 쪽도 아니면 지금 쪽 · 바로 바뀌는 이동은 0.65초 안내 · 받은 쿠키는 읽고 바로 지워요");
    ok(/if \(!raw \|\| raw\.charAt\(0\) === "#"\) return;/.test(mj71) && /if \(u\.origin !== location\.origin \|\| u\.pathname === location\.pathname \|\| \/\^\\\/\(api\|assets\|_next\)\\\/\/\.test\(u\.pathname\) \|\| \/\\\.\[a-z0-9\]\{2,5\}\$\/i\.test\(u\.pathname\)\) return;/.test(mj71) &&
      /if \(!to \|\| to === from \|\| \(window\.__dirty && window\.__dirty\(\)\)\) return;\n    bootCookie\(to, true, u\.pathname\);\n    moveCover\(to, 8000\);/.test(mj71) &&
      /if \(e\.defaultPrevented \|\| e\.button !== 0 \|\| e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey\) return;/.test(mcut71("// 같은 사이트의 일반 링크", "// 뒤로 가기로")) &&
      /window\.addEventListener\("pageshow", \(e\) => \{\n    if \(!e\.persisted\) return;\n    const el = document\.getElementById\("dc-move"\);\n    if \(el\) el\.remove\(\);/.test(mj71) &&
      /setTimeout\(\(\) => \{ el\.classList\.add\("out"\); setTimeout\(\(\) => el\.remove\(\), 250\); \}, ms\);/.test(mj71),
      "main.js 일반 링크(#/… 아닌 같은 사이트 주소)로 다른 서비스 페이지를 열 때도 안내 + 쿠키 · 새 창 · 내려받기 · 파일 · API · 같은 페이지 · 저장 안 한 편집은 건드리지 않아요 · 뒤로 가기로 돌아오면 덮개를 치워요 · 덮개는 정해진 시간 뒤 꼭 사라져요");
    const cs71 = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8"), adm71 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), sh71 = fs.readFileSync(path.join(ROOT, "../ui/center/Shell.jsx"), "utf8");
    ok(/\.boot-wait\.boot-move \{ pointer-events: none; transition: opacity \.22s ease; \}/.test(cs71) && /\.boot-wait\.boot-move > \* \{ animation-delay: 0s; \}/.test(cs71) && /\.boot-wait\.boot-move\.out \{ opacity: 0; \}/.test(cs71) &&
      /const dcL = master \? MT\(\) === "dc" : !!ins && TRK\(\) === "vod"; if \(window\.DC_AREA && window\.DC_AREA\.ctBrand\) window\.DC_AREA\.ctBrand\(dcL \? "dc" : "dg"\);/.test(adm71) &&
      /if \(typeof window !== "undefined" && window\.DC_AREA && window\.DC_AREA\.ctBrand\) window\.DC_AREA\.ctBrand\(dcL \? "dc" : "dg"\);/.test(sh71),
      "덮개 CSS(누르기를 막지 않음 · 바로 보임 · 흐려지며 사라짐) · 강사센터 머리 로고 쪽 기억(예전 화면 admin.js = React Shell.jsx)");
  }

  {
    console.log("72) 두잉고 공유 이미지 — 카카오톡 미리보기에서도 읽히게 글씨 크게 · 새 주소(?v=)로 새로 가져가게 (2026-11-22)");
    const og72 = fs.readFileSync(path.join(ROOT, "assets/home/og-doinggo.jpg"));
    const jpg72 = (b) => { for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) return null; const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }; i += 2 + len; } return null; };
    const sz72 = jpg72(og72), gen72 = fs.readFileSync(path.join(ROOT, "scripts/og-image.js"), "utf8"), pm72 = fs.readFileSync(path.join(ROOT, "api/_lib/pagemeta.js"), "utf8");
    const dg72 = (gen72.split("const DG_HTML = `")[1] || "").split("`;")[0];
    ok(!!sz72 && sz72.w === 1200 && sz72.h === 630 && og72.length > 40000 && og72.length < 300000 &&
      /h1\{margin-top:30px;font-size:100px;/.test(dg72) && /\.sub\{margin-top:24px;font-size:44px;/.test(dg72) && /font-size:33px;font-weight:800;/.test(dg72) &&
      /<h1><span>강의는 강사님이,<\/span><span>운영은 <em>두잉고<\/em>가<\/span><\/h1>/.test(dg72) && /기수마다 1인 수강료 1명분/.test(dg72) && /\/assets\/brand\/doinggo-word\.svg/.test(dg72) &&
      /const WHICH = process\.argv\[2\] === "doinggo" \? "doinggo" : "doogoclass";/.test(gen72) && /chk\.right > chk\.ph - 16/.test(gen72),
      "공유 이미지 og-doinggo.jpg 1200×630 · 만드는 틀(scripts/og-image.js doinggo): 제목 100px · 보조 문구 44px · 알약 33px (예전 약 64 · 26 · 20px) · 글씨가 휴대폰 화면에 닿으면 안 찍어요", sz72);
    const PM72 = require(path.join(ROOT, "api/_lib/pagemeta.js")), idx72 = require(path.join(ROOT, "scripts/index-abs.js"))(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")), hd72 = PM72.doinggoPage(idx72);
    const v72 = (/const DG_OG_V = "(\d{8})";/.exec(pm72) || [])[1], u72 = "https://www.doogoclass.com/assets/home/og-doinggo.jpg?v=" + v72;
    ok(!!v72 && hd72.indexOf('<meta property="og:image" content="' + u72 + '"') >= 0 && hd72.indexOf('<meta name="twitter:image" content="' + u72 + '"') >= 0 && hd72.indexOf('"url":"' + u72 + '"') >= 0,
      "/doinggo 공유 이미지 주소에 버전(?v=" + v72 + ") — og:image · twitter:image · WebPage 정보 모두 새 주소 (카카오톡 · 페이스북이 새 이미지를 가져가요)", u72);
    // 제목 · 설명 (2026-11-23 · 추천 ①): 강사님 불편을 짚는 제목 · 카카오톡에 보이는 앞 40자 안에 할 수 있는 일 · 이미지 설명은 이미지 안 글씨
    const T72 = "단톡방·엑셀로 하던 강의 운영, 두잉고 하나로", D72 = "과제 검수·공지·일정·질문 응대까지 강사님 이름으로 된 강의 플랫폼에서 한 번에. 수강생은 무료, 수강생이 늘어도 이용료는 그대로예요.";
    const hj72 = fs.readFileSync(path.join(ROOT, "home.js"), "utf8");
    ok(hd72.indexOf("<title>" + T72 + "</title>") >= 0 && hd72.indexOf('<meta property="og:title" content="' + T72 + '"') >= 0 && hd72.indexOf('<meta name="twitter:title" content="' + T72 + '"') >= 0 &&
      hd72.indexOf('<meta name="description" content="' + D72 + '"') >= 0 && hd72.indexOf('<meta property="og:description" content="' + D72 + '"') >= 0 && hd72.indexOf('<meta name="twitter:description" content="' + D72 + '"') >= 0 &&
      hd72.indexOf('<meta property="og:image:alt" content="두잉고 — 강의는 강사님이, 운영은 두잉고가"') >= 0 && hd72.indexOf('"name":"' + T72 + '"') >= 0 && hd72.indexOf('"description":"' + D72 + '"') >= 0 &&
      hd72.indexOf("<h1>강의는 강사님이, 운영은 두잉고가</h1>") >= 0 && hd72.indexOf("<p>" + D72 + "</p>") >= 0 &&
      hj72.indexOf('document.title = "' + T72 + '";') >= 0 && T72.length <= 30 && D72.slice(0, 40).indexOf("강의 플랫폼") >= 0,
      "/doinggo 제목 · 설명: ‘" + T72 + "’ (30자 안 · 화면 탭 제목도 같게) · 설명 앞 40자에 할 일 + 강의 플랫폼 · og/twitter/WebPage 같게 · 이미지 설명은 이미지 안 글씨 · 로봇용 큰 제목은 슬로건 그대로", { T72: T72.length, D72: D72.length });
    // 다른 페이지 이미지 설명은 예전처럼 제목 (imgAlt 는 두잉고만)
    ok(/set\(\/\(<meta property="og:image:alt" content="\)\[\^"\]\*\("\)\/, o\.imgAlt \|\| o\.title\);/.test(pm72) && (pm72.match(/imgAlt:/g) || []).length === 2,
      "이미지 설명은 따로 준 곳(두잉고)만 바뀌고 다른 페이지는 예전처럼 제목");
  }

  {
    console.log("73) 메뉴 이름 ‘라이브 다시보기’ → ‘정규교육 다시보기’ — 강사센터 메뉴 · 수강생 메뉴 함께 (2026-11-23)");
    const rd73 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const ad73 = rd73("admin.js"), dr73 = rd73("shared/data-rules.js"), cp73 = rd73("coach-perms.js"), c273 = rd73("../ui/center/Content2.jsx"), c173 = rd73("../ui/center/Content.jsx"), mn73 = rd73("../ui/center/Menus.jsx"), dj73 = rd73("data.js");
    // 강사센터: 왼쪽 메뉴 · 편집 창 이름(‘… 추가’ · ‘… 수정’) · 화면 제목과 안내 (예전 화면 admin.js = React Content2.jsx) · 코치 권한 목록 · 안내 예시
    const sub73 = "지난 라이브 녹화를 올리면 수강생 ‘정규교육 다시보기’에 주차별로 모여요.";
    ok(ad73.indexOf('["replays", "정규교육 다시보기", "monitorPlay", "replays"]') >= 0 && ad73.indexOf('replay: { name: "정규교육 다시보기", prepend: true,') >= 0 &&
      ad73.indexOf('return head("정규교육 다시보기", "' + sub73) >= 0 && c273.indexOf('<Head title="정규교육 다시보기" sub="' + sub73) >= 0 &&
      cp73.indexOf('["replays", "정규교육 다시보기"]') >= 0 && ad73.indexOf("2주차: 2주차 정규교육 다시보기 →") >= 0 && c173.indexOf("2주차: 2주차 정규교육 다시보기 →") >= 0 &&
      ad73.indexOf("주차별 강의 · 정규교육 다시보기 · 과제 · 모범 과제") >= 0 && mn73.indexOf("주차별 강의 · 정규교육 다시보기 · 과제 · 모범 과제") >= 0,
      "강사센터: 왼쪽 메뉴 · 편집 창(정규교육 다시보기 추가 · 수정) · 화면 제목 · 안내 · 코치 권한 목록 · VOD 메뉴 구성 안내 모두 ‘정규교육 다시보기’ (예전 화면 = React)");
    // 화면에 보이는 글(따옴표 안)에 예전 이름이 남지 않게 — 강사센터 · 수강생 화면 파일 (주석 · 예전 문구를 새 이름으로 바꾸는 목록은 빼고)
    const vis73 = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\/?\*)/.test(l)).map((l) => l.replace(/\/\/.*$/, "")).join("\n").match(/(["'`])(?:(?!\1).)*라이브 다시보기(?:(?!\1).)*\1/g) || [];
    const left73 = [["admin.js", ad73], ["coach-perms.js", cp73], ["app.js", rd73("app.js")], ["Content.jsx", c173], ["Content2.jsx", c273], ["Menus.jsx", mn73], ["More.jsx", rd73("../ui/dg/More.jsx")], ["Login.jsx", rd73("../ui/center/Login.jsx")]].map((x) => [x[0], vis73(x[1])]).filter((x) => x[1].length);
    ok(!left73.length, "강사센터 · 수강생 화면 파일의 보이는 글에 ‘라이브 다시보기’가 남지 않아요", left73);
    // 수강생: 기본 메뉴 이름 · 새 강사 기본 FAQ · 체험 데이터 글
    ok(/\{ key: "replays", label: "정규교육 다시보기", icon: "monitorPlay", needs: "replays"/.test(dr73) && /replays: \["라이브 다시보기", "보충 강의"\] \}; \/\/ replays: 2026-11-23/.test(dr73) && !/it\.label = "보충 강의"/.test(dr73) &&
      dr73.indexOf('a: "다시보기가 ‘정규교육 다시보기’ 메뉴에 올라갑니다."') >= 0 && dj73.indexOf("다시보기는 ‘정규교육 다시보기’ 메뉴에 올라갑니다.") >= 0 && dj73.indexOf("라이브 다음 날까지 ‘정규교육 다시보기’ 메뉴에 영상이 올라갑니다.") >= 0 && dj73.indexOf("‘라이브 다시보기’") < 0,
      "수강생 기본 메뉴 이름 = ‘정규교육 다시보기’ · 예전 이름 목록에 ‘라이브 다시보기’ · ‘보충 강의’(예전 문대표 자동 이름 — 이제 붙이지 않아요) · 새 강사 기본 FAQ · 체험 데이터 글도 새 이름");
    // 저장된 메뉴 구성: 예전 기본 이름(라이브 다시보기)이 그대로 저장돼 있으면 새 이름으로 · 강사가 직접 바꾼 이름은 그대로
    const vm73 = require("vm"), sb73 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb73.window = sb73; vm73.createContext(sb73); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm73.runInContext(rd73(f), sb73, { filename: f }));
    const D73 = sb73.DB; if (!D73.data) D73.load();
    const all73 = (D73.data.instructors || []).filter((x) => x && x.id), a73 = all73[0], b73 = all73[1], c73 = all73[2];
    const lab73 = (iid) => { const it = D73.menuConfig(iid).items.find((x) => x.key === "replays"); return it && it.label ? it.label : (D73.STUDENT_MENUS.find((d) => d.key === "replays") || {}).label; };
    let r73 = null;
    if (a73 && b73 && c73) {
      a73.menu = { items: [{ key: "home", on: true }, { key: "replays", on: true, label: "라이브 다시보기" }] };
      b73.menu = { items: [{ key: "home", on: true }, { key: "replays", on: true, label: "녹화 강의 모음" }] };
      c73.menu = { items: [{ key: "home", on: true }, { key: "replays", on: true, label: "보충 강의" }] };
      r73 = { saved: lab73(a73.id), custom: lab73(b73.id), auto: lab73(c73.id), dropped: !("label" in a73.menu.items.find((x) => x.key === "replays")), moon: lab73("moon") };
    }
    ok(!!r73 && r73.saved === "정규교육 다시보기" && r73.dropped && r73.custom === "녹화 강의 모음" && r73.auto === "정규교육 다시보기" && r73.moon === "정규교육 다시보기",
      "저장된 메뉴 구성: 예전 이름 ‘라이브 다시보기’ · ‘보충 강의’가 저장돼 있으면 지우고 새 기본 이름 ‘정규교육 다시보기’ · 강사가 직접 바꾼 이름(예: 녹화 강의 모음)은 그대로 · 체험 데이터 문대표도 새 이름", r73);
  }

  {
    console.log("74) 강사 choi 두잉고 소개 목록 OFF — homeOff (일회성 2026-11-23-choi-home-off · 마스터 체크로 ON/OFF)");
    const OO74 = require(path.join(ROOT, "api/_lib/oneoff.js")), op74 = OO74.OPS.find((o) => o.id === "2026-11-23-choi-home-off");
    const g74 = (d) => (k) => (d[k] === undefined ? null : JSON.parse(JSON.stringify(d[k])));
    const ins74 = { id: "choi", name: "t", phone4: "0000", displayName: "t", status: "active", tracks: { live: true, vod: true }, coaches: [{ id: "c1", status: "active" }] };
    const a74 = op74 && op74.run(g74({ "ins:choi": ins74, "ins:moon": { id: "moon", status: "active" }, meta: { vod: { insOff: ["moon"] } } }));
    const b74 = OO74.choiHomeOff(g74({ "ins:choi": Object.assign({}, ins74, { homeOff: true }) })), c74 = OO74.choiHomeOff(g74({}));
    const w74 = a74 && a74.writes["ins:choi"];
    ok(!!op74 && op74.run === OO74.choiHomeOff && OO74.OPS.filter((o) => o.id === op74.id).length === 1 && !OO74.OPS.some((o) => o.id === "2026-11-23-choi-off") &&
      !!w74 && w74.homeOff === true && w74.status === "active" && Object.keys(a74.writes).join(",") === "ins:choi" && JSON.stringify(Object.assign({}, w74, { homeOff: undefined })) === JSON.stringify(ins74) &&
      !Object.keys(b74.writes).length && /그대로/.test(b74.result.skipped) && !Object.keys(c74.writes).length,
      "homeOff 만 더해요 (운영 중 · 콘텐츠 · 코치 · 다른 강사 · 스토어 데이터 그대로) · 이미 숨김 · 없는 계정은 그대로 · 운영 중지 작업은 쓰지 않아요(산 회원 VOD 강의실이 막혀서)", { a: a74 && a74.result, b: b74.result, c: c74.result });
    // 보이는 목록만 빼요: 두잉고 소개 카드(LIVE · VOD 강사) · 수강생 로그인 강사 고르기(예전 화면 · 두고클래스 로그인 카드의 두잉고 탭) — 로그인 · 계정 확인은 liveInstructors 그대로
    const rd74 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const hm74 = rd74("home.js"), ap74 = rd74("app.js"), ad74 = rd74("admin.js"), ms74 = rd74("../ui/center/Master.jsx");
    ok(/return DB\.liveInstructors\(\)\.filter\(\(x\) => !x\.homeOff\)\.slice\(\)\.sort/.test(hm74) && /ins\.status === "active" && !ins\.homeOff && !!DB\.tracksOf/.test(hm74) &&
      /const pickList = \(\) => \{[^\n]*DB\.liveInstructors\(\)\.filter\(\(x\) => !x\.homeOff\)/.test(ap74) && (ap74.match(/pickList\(\)/g) || []).length === 3 &&
      /dgLoginCore\(DB\.liveInstructors\(\)\.find\(\(x\) => x\.id === iid\)/.test(ap74) &&
      /<input type="checkbox" name="homeShow"' \+ \(x\.homeOff \? "" : " checked"\)/.test(ad74) && /if \(f\.homeShow\) \{ if \(f\.homeShow\.checked\) delete xi\.homeOff; else xi\.homeOff = true; \}/.test(ad74) &&
      /\(x\.homeOff \? " " \+ pill\("소개 목록 OFF", "mute"\) : ""\)/.test(ad74) && /\{x\.homeOff \? <>\{" "\}<Pill cls="mute">소개 목록 OFF<\/Pill><\/> : null\}/.test(ms74),
      "두잉고 소개 카드 · 수강생 로그인 강사 고르기에서만 빠지고 로그인 · 계정은 그대로 · 마스터 수정 창 체크(두잉고 소개 · 수강생 로그인 강사 목록에 보이기) · 표에 ‘소개 목록 OFF’ (예전 화면 = React)");
    // 화면 계산: 시험용 DB 로 두잉고 소개 목록 · 로그인 고르기 목록 (homeOff 강사 빠짐)
    const vm74 = require("vm"), sb74 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb74.window = sb74; vm74.createContext(sb74); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm74.runInContext(rd74(f), sb74, { filename: f }));
    const D74 = sb74.DB; if (!D74.data) D74.load();
    const li74 = D74.liveInstructors().map((x) => x.id), ci74 = D74.instructor("choi");
    if (ci74) ci74.homeOff = true;
    const shown74 = D74.liveInstructors().filter((x) => !x.homeOff).map((x) => x.id);
    ok(li74.indexOf("choi") >= 0 && shown74.indexOf("choi") < 0 && D74.liveInstructors().some((x) => x.id === "choi") && shown74.length === li74.length - 1, "homeOff 강사: 보이는 목록에서만 빠지고 운영 중 강사 목록(로그인 확인용)에는 그대로", { li74, shown74 });
  }

  {
    console.log("75) 정규교육 다시보기 볼 수 있는 마지막 날 — 지나면 자물쇠 · 재생 안 됨 · 서버는 영상 주소를 안 보내요 (2026-11-23)");
    const DS75 = require(path.join(ROOT, "shared/dates.js")), AC75 = require(path.join(ROOT, "api/_lib/access.js"));
    // 한국 날짜 기준 · 그 날까지 볼 수 있어요(그 날 포함)
    ok(!DS75.untilPassed("", "2026-11-23") && !DS75.untilPassed("abc", "2026-11-23") && !DS75.untilPassed("2026-11-23", "2026-11-23") && DS75.untilPassed("2026-11-22", "2026-11-23") && !DS75.untilPassed("2027-02-21", "2026-11-23") &&
      DS75.addMonths("2026-11-21", 3) === "2027-02-21" && DS75.addMonths("2026-11-21", 6) === "2027-05-21",
      "마지막 날 당일까지 볼 수 있고 다음 날부터 잠겨요 · 비었거나 날짜가 아니면 기한 없음 · 라이브 날짜 + 3개월 = 2027-02-21 · + 6개월 = 2027-05-21");
    // 서버: 수강생에게는 지난 영상의 영상 주소 · 핵심 정리 · 자료를 빼요 (강사 · 코치 · 마스터 · 다른 강사 수강생 · 방문자 규칙 그대로)
    const c75 = { brand: { name: "t" }, weeks: [], replays: [
      { id: "r1", title: "지난", youtubeId: "https://vimeo.com/111", summary: "정리", attachments: [{ name: "a.pdf" }], week: 1, date: "2020-01-01", minutes: "30:00", until: "2020-02-01" },
      { id: "r2", title: "남음", youtubeId: "yt-abc", summary: "정리2", until: "2999-12-31" }, { id: "r3", title: "기한 없음", youtubeId: "yt-def" }] };
    const st75 = AC75.view("content:moon", c75, { student: { iid: "moon", sid: "s1" } }), r1 = st75.replays[0];
    const noLk75 = { brand: {}, replays: [{ id: "x", youtubeId: "y" }] };
    ok(r1.locked === true && !("youtubeId" in r1) && !("summary" in r1) && !("attachments" in r1) && r1.title === "지난" && r1.week === 1 && r1.until === "2020-02-01" && r1.minutes === "30:00" &&
      st75.replays[1].youtubeId === "yt-abc" && st75.replays[2].youtubeId === "yt-def" && c75.replays[0].youtubeId === "https://vimeo.com/111" &&
      AC75.view("content:moon", c75, { admin: { role: "instructor", iid: "moon" } }) === c75 && AC75.view("content:moon", c75, { admin: { role: "coach", iid: "moon", cid: "c" } }) === c75 && AC75.view("content:moon", c75, { admin: { role: "master" } }) === c75 &&
      AC75.view("content:moon", c75, {}).replays === undefined && AC75.view("content:moon", c75, { student: { iid: "farmer", sid: "s2" } }).replays === undefined &&
      AC75.view("content:moon", noLk75, { student: { iid: "moon", sid: "s1" } }) === noLk75,
      "서버: 수강생에게 지난 영상은 제목 · 주차 · 날짜 · 길이 · 마지막 날만(locked) — 남은 · 기한 없는 영상 · 원본 데이터 그대로 · 강사 · 코치 · 마스터는 전부 · 방문자 · 다른 강사 수강생은 원래대로 다시보기 없음", st75.replays);
    // 화면 계산 (db.js): 서버가 잠근 것(locked) 또는 마지막 날이 지난 것
    const vm75 = require("vm"), sb75 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb75.window = sb75; vm75.createContext(sb75); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm75.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb75, { filename: f }));
    const D75 = sb75.DB;
    ok(D75.replayLocked({ until: "2020-01-01" }) && D75.replayLocked({ locked: true }) && !D75.replayLocked({ until: "2999-01-01" }) && !D75.replayLocked({}) && !D75.replayLocked(null),
      "화면: 서버가 잠근 영상(locked) · 마지막 날이 지난 영상은 잠김 · 남은 · 기한 없는 영상은 그대로");
    // 강사센터 (예전 화면 admin.js = React Content2.jsx): 편집 창 칸 · 빠른 버튼 · 목록 표시
    const rd75 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const ad75 = rd75("admin.js"), c275 = rd75("../ui/center/Content2.jsx"), ap75 = rd75("app.js"), mo75 = rd75("../ui/dg/More.jsx"), cs75 = rd75("styles.css");
    ok(/F\("date", "라이브 날짜", "date"\),\n[^\n]*\n\s*F\("until", "볼 수 있는 마지막 날 \(선택\)", "date", \{ quick: "date", hint: "아이비클래스처럼 수강 기한이 있으면/.test(ad75) &&
      /\[\[3, "라이브 날짜 \+ 3개월"\], \[6, "\+ 6개월"\], \[0, "지우기 \(기한 없음\)"\]\]/.test(ad75) && /case "date-quick": \{ const to = document\.getElementById\(d\.for\), from = document\.getElementById\(d\.from\), m = Number\(d\.m\) \|\| 0; if \(to\) \{ to\.value = m \? DB\.addMonths\(\(from && from\.value\) \|\| todayStr\(\), m\) : "";/.test(ad75) &&
      /const untilPill = \(it\) => \(!it\.until \? "" : DB\.untilPassed\(it\.until\) \? pill\("기간 끝남 · 잠김", "mute"\) : pill\("~" \+ fmtMD\(it\.until\) \+ "까지", "info"\)\);/.test(ad75) && /\+ ytBadge\(it\) \+ untilPill\(it\) \+/.test(ad75) &&
      /<Yt it=\{it\} \/>\{\/\*[^*]*\*\/\}\{!it\.until \? null : DBX\(\)\.untilPassed\(it\.until\) \? <Pill cls="mute">기간 끝남 · 잠김<\/Pill> : <Pill cls="info">\{"~" \+ fmtMD\(it\.until\) \+ "까지"\}<\/Pill>\}/.test(c275),
      "강사센터: 라이브 날짜 다음 ‘볼 수 있는 마지막 날 (선택)’ · 빠른 버튼(라이브 날짜 + 3개월 · + 6개월 · 지우기) · 목록 ‘기간 끝남 · 잠김’ / ‘~월.일까지’ (예전 화면 = React)");
    // 수강생 (예전 화면 app.js = React More.jsx): 목록 자물쇠 · 상세 잠김 안내 (재생기 · 핵심 정리 · 자료 · 다 봤어요 없음)
    ok((ap75.match(/lk = DB\.replayLocked\(x\)/g) || []).length === 2 && (mo75.match(/lk = DB\.replayLocked\(x\)/g) || []).length === 2 &&
      ap75.indexOf('<div class="rp-locked-box"><span class="rp-lock-ic">') >= 0 && mo75.indexOf('<div className="rp-locked-box"><span className="rp-lock-ic"><Icon n="lock" /></span><b>시청 기간이 끝났어요</b>') >= 0 &&
      /\(lk \? '<span class="rp-lock" aria-label="시청 기간 끝남">' \+ icon\("lock"\)/.test(ap75) && /\{lk \? <span className="rp-lock" aria-label="시청 기간 끝남"><Icon n="lock" \/><\/span> : <span className="rp-play">/.test(mo75) &&
      /'<div class="guide-actions" style="margin-top:20px">' \+ \(lk \? "" : '<button class="btn '/.test(ap75) && /\{lk \? null : <button className=\{"btn "/.test(mo75) &&
      /\.rp-card\.rp-locked \.rp-thumb img \{ filter: grayscale\(1\) brightness\(\.5\); \}/.test(cs75) && /\.rp-locked-box \{/.test(cs75),
      "수강생: 목록 카드 자물쇠(재생 표시 대신) · ‘시청 기간 끝남’ · 상세는 재생기 · 핵심 정리 · 자료 · 다 봤어요 없이 ‘시청 기간이 끝났어요’ (예전 화면 = React · 화면 확인은 e2e center 1-2)");
  }

  {
    console.log("76) 강사 choi 두고클래스 스토어 숨김 — insOff (일회성 2026-11-23-choi-store-off · 클래스는 그대로 · 마스터 ‘스토어에 다시 보이기’로 되돌림)");
    const OO76 = require(path.join(ROOT, "api/_lib/oneoff.js")), ids76 = OO76.OPS.map((o) => o.id), op76 = OO76.OPS.find((o) => o.id === "2026-11-23-choi-store-off");
    const g76 = (d) => (k) => (d[k] === undefined ? null : JSON.parse(JSON.stringify(d[k])));
    const P76 = [{ id: "v2", iid: "choi", status: "on", title: "a" }, { id: "v9", iid: "choi", status: "soon" }, { id: "bk", iid: "choi", status: "on", showOff: true }, { id: "v3", iid: "logic", status: "on" }];
    const meta76 = { flags: { x: 1 }, vod: { insOff: ["moon"], products: P76, banners: [{ id: "vb4", pid: "v2" }], coupons: [{ id: "c" }] } };
    const cat76 = { products: P76.map((p) => ({ id: p.id, iid: p.iid, status: p.status })), coupons: [{ id: "c" }], settings: { coach: 1 } };
    const a76 = op76 && op76.run(g76({ meta: meta76, vcat: cat76 })), wm76 = a76 && a76.writes.meta, wc76 = a76 && a76.writes.vcat;
    const st76 = (c) => (c ? c.products.map((p) => p.id + ":" + p.status).join(",") : "");
    const b76 = OO76.choiStoreOff(g76({ meta: wm76, vcat: wc76 }));
    const c76 = OO76.choiStoreOff(g76({ meta: Object.assign({}, meta76, { vod: Object.assign({}, meta76.vod, { insOff: ["moon", "choi"] }) }), vcat: cat76 }));
    const d76 = OO76.choiStoreOff(g76({})), e76 = OO76.choiStoreOff(g76({ meta: meta76 }));
    ok(!!op76 && op76.run === OO76.choiStoreOff && ids76.filter((x) => x === op76.id).length === 1 && ids76.indexOf(op76.id) === ids76.indexOf("2026-11-23-choi-home-off") + 1 &&
      !!wm76 && wm76.vod.insOff.join() === "moon,choi" && JSON.stringify(wm76.vod.products) === JSON.stringify(P76) && JSON.stringify(wm76.vod.banners) === JSON.stringify(meta76.vod.banners) && wm76.flags.x === 1 &&
      st76(wc76) === "v2:hidden,v9:hidden,bk:on,v3:on" && wc76.coupons.length === 1 && wc76.settings.coach === 1 && a76.result.products.join() === "v2,v9" && /2개/.test(a76.result.vcat) &&
      !Object.keys(b76.writes).length && /그대로/.test(b76.result.skipped) &&
      Object.keys(c76.writes).join() === "vcat" && st76(c76.writes.vcat) === "v2:hidden,v9:hidden,bk:on,v3:on" &&
      !Object.keys(d76.writes).length && Object.keys(e76.writes).join() === "meta",
      "숨김 목록(insOff)에 choi 더하기 · 결제 가격표(vcat)는 그 강사 상품만 hidden (showOff 상품 · 다른 강사 · 쿠폰 · 설정 그대로) · 클래스 · 배너 데이터는 안 지움 · 두 번째는 그대로 · 반쯤 된 상태도 마저 · 데이터 없으면 건너뜀",
      { a: a76 && a76.result, vcat: st76(wc76), b: b76.result, c: Object.keys(c76.writes), d: d76.result });
    // 서버: 숨긴 상품(가격표 hidden)은 결제 금액 계산부터 막혀요 (vod.js quote — status 가 on 일 때만)
    const V76 = fs.readFileSync(path.join(ROOT, "api/_lib/vod.js"), "utf8");
    ok(/if \(!p \|\| p\.status !== "on"\) return \{ ok: false, message: "지금 살 수 없는 클래스예요\." \};/.test(V76), "서버: 가격표에서 숨긴(hidden) 상품은 ‘지금 살 수 없는 클래스예요’ (결제 준비 409)");
    // 화면: 숨긴 강사는 스토어 홈 줄 · 배너 · 강사진(홈 · 페이지 · 소개 · 파트너스) · 상세 · 결제 · 가격표 올리기에서 모두 빠져요 (스위치 하나 insShown)
    const vd76 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8");
    ok(/const insShown = \(p\) => !p \|\| !!p\.showOff \|\| insOff\(\)\.indexOf\(tkey\(p\)\) < 0;/.test(vd76) && /const bizShow = \(p\) => !!p && [^\n]*insShown\(p\);/.test(vd76) &&
      /V\(\)\.products\.filter\(\(p\) => tkey\(p\) && \(p\.status === "soon" \|\| \(p\.status === "on" && !eventPast\(p\)\)\) && bizShow\(p\)\)/.test(vd76) &&
      /const liveBanners = \(\) => V\(\)\.banners\.filter\(\(b\) => banLive\(b\) && \(!b\.pid \|\| bizShow\(product\(b\.pid\)\)\)/.test(vd76) &&
      /if \(!p \|\| p\.status === "hidden" \|\| !insShown\(p\)\) return shell\("", '<div class="vd-wrap">' \+ emptyBox\("alert", "판매 중인 클래스가 아니에요"/.test(vd76) &&
      /if \(!insShown\(p\)\) \{ ROUTE\.redirect\("#\/vod"\); toast\("지금은 판매하지 않는 클래스예요\.", "warn"\); return ""; \}/.test(vd76) &&
      /insShown\(p\) \? \{\} : \{ status: "hidden" \}/.test(vd76),
      "화면: 숨긴 강사의 클래스 · 배너 · 강사진 카드는 스토어에서 빠지고 상세 ‘판매 중인 클래스가 아니에요’ · 결제 화면은 홈으로 · 마스터가 올리는 가격표도 hidden (다시 보이면 그대로 돌아옴 · 화면 확인은 e2e store 7)");
    // 같은 날 되돌림 (대표님: 유나(스토어)는 ON) — 2026-11-23-choi-store-on: 숨김 목록에서 choi 빼기 · 가격표는 스토어 데이터의 판매 상태로
    const opOn76 = OO76.OPS.find((o) => o.id === "2026-11-23-choi-store-on");
    const meta76h = Object.assign({}, meta76, { vod: Object.assign({}, meta76.vod, { insOff: ["moon", "choi"], products: P76.concat([{ id: "v7", iid: "choi", status: "hidden" }]) }) });
    const cat76h = { products: [{ id: "v2", iid: "choi", status: "hidden" }, { id: "v9", iid: "choi", status: "hidden" }, { id: "bk", iid: "choi", status: "on" }, { id: "v3", iid: "logic", status: "on" }, { id: "v7", iid: "choi", status: "hidden" }], coupons: [{ id: "c" }] };
    const f76 = opOn76 && opOn76.run(g76({ meta: meta76h, vcat: cat76h })), g76b = OO76.choiStoreOn(g76({ meta: f76 && f76.writes.meta, vcat: f76 && f76.writes.vcat }));
    const h76 = OO76.choiStoreOn(g76({ meta: meta76, vcat: cat76 })), i76 = OO76.choiStoreOn(g76({}));
    ok(!!opOn76 && opOn76.run === OO76.choiStoreOn && ids76.indexOf("2026-11-23-choi-store-on") === ids76.indexOf("2026-11-23-choi-store-off") + 1 &&
      !!f76 && f76.writes.meta.vod.insOff.join() === "moon" && JSON.stringify(f76.writes.meta.vod.products) === JSON.stringify(meta76h.vod.products) &&
      st76(f76.writes.vcat) === "v2:on,v9:soon,bk:on,v3:on,v7:hidden" && f76.writes.vcat.coupons.length === 1 &&
      !Object.keys(g76b.writes).length && /그대로/.test(g76b.result.skipped) && !Object.keys(h76.writes).length && !Object.keys(i76.writes).length,
      "다시 보이기(유나 ON): 숨김 목록에서 choi 만 빼고(문대표 숨김 그대로) · 가격표는 원래 판매 상태(on · 오픈 예정) · 마스터가 숨긴 상품은 hidden 그대로 · 다른 강사 · 쿠폰 그대로 · 두 번째 · 이미 보이면 그대로",
      { f: f76 && f76.result, vcat: f76 && st76(f76.writes.vcat), g: g76b.result, h: h76.result });
    // 숨김 확인은 e2e store 7(마스터 ‘스토어에서 숨기기 → 스토어에 다시 보이기’)
    const es76 = fs.readFileSync(path.join(ROOT, "scripts/e2e/specs/store.js"), "utf8");
    ok(/data-action="vda-insoff"/.test(es76) && /스토어에 다시 보이기/.test(es76), "e2e store 7 이 마스터 ‘스토어에서 숨기기 → 다시 보이기’를 확인");
  }

  {
    console.log("77) 정규교육 다시보기 화면 문구 — ‘보충 강의’ 설명 · ‘보충 강의 시청’ 대신 정규교육에 맞게 (2026-11-23)");
    const rd77 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const ap77 = rd77("app.js"), mo77 = rd77("../ui/dg/More.jsx"), ad77 = rd77("admin.js"), br77 = rd77("../ui/center/Brand.jsx");
    const T77 = "에서 진행한 정규교육 라이브를 다시 볼 수 있어요. 영상마다 볼 수 있는 마지막 날이 있으면 그날까지만 볼 수 있어요.";
    ok(ap77.indexOf('sub ? (mainLec().platform || "외부 강의실") + "' + T77 + '"') >= 0 && mo77.indexOf('sub={sub ? (ml.platform || "외부 강의실") + "' + T77 + '"') >= 0 &&
      ap77.indexOf('<div class="overall-top"><span>다시보기 시청</span>') >= 0 && mo77.indexOf('<div className="overall-top"><span>다시보기 시청</span>') >= 0 &&
      ap77.indexOf('empty("monitorPlay", "아직 올라온 다시보기 영상이 없어요.")') >= 0 && mo77.indexOf('<Empty ic="monitorPlay">아직 올라온 다시보기 영상이 없어요.</Empty>') >= 0 &&
      !/보충 강의/.test(ap77) && !/보충 강의/.test(mo77) &&
      ad77.indexOf("수강생 홈 · 주차별 강의 · 정규교육 다시보기 화면에 이 버튼이 떠요.") >= 0 && br77.indexOf("수강생 홈 · 주차별 강의 · 정규교육 다시보기 화면에 이 버튼이 떠요.") >= 0,
      "수강생 다시보기 화면: 메인 강의(외부 강의실)가 있는 강사는 ‘(아이비클래스)에서 진행한 정규교육 라이브를 다시 볼 수 있어요 · 마지막 날’ · 진행 칸 ‘다시보기 시청’ · 빈 화면도 같은 말 · 강사센터 메인 강의 안내의 화면 이름도 (예전 화면 = React)");
  }

  {
    console.log("78) 두잉고 소개 목록 OFF(homeOff) 강사 — 강사 소개 /p · 무료강의 /free 도 방문자에게 ‘준비 중’ (지우지 않음 · 2026-11-23)");
    const PM78 = require(path.join(ROOT, "api/_lib/pagemeta.js")), SD78 = require(path.join(ROOT, "api/_lib/seed.js")).seedDocs();
    const ins78 = SD78["ins:moon"], c78 = JSON.parse(JSON.stringify(SD78["content:moon"]));
    c78.landing = Object.assign({}, c78.landing, { published: true }); c78.freeClass = Object.assign({}, c78.freeClass, { published: true, liveAt: "2026-12-01T19:30" });
    const off78 = Object.assign({}, ins78, { homeOff: true }), html78 = "<!doctype html><html><head><title>x</title></head><body><div id=\"root\"></div></body></html>";
    const on78 = PM78.landingPage(html78, ins78, c78, {}), onF78 = PM78.freePage(html78, ins78, c78, {});
    const sm78 = PM78.sitemapXml("<urlset></urlset>", {}, [ins78, Object.assign({}, off78, { id: "offy" })], { moon: c78, offy: c78 });
    ok(!!on78 && !!onF78 && PM78.landingPage(html78, off78, c78, {}) === null && PM78.freePage(html78, off78, c78, {}) === null &&
      sm78.indexOf("/p/moon") >= 0 && sm78.indexOf("/free/moon") >= 0 && sm78.indexOf("/p/offy") < 0 && sm78.indexOf("/free/offy") < 0,
      "서버: OFF 강사는 공유 미리보기(제목 · 사진)를 만들지 않고 사이트맵에서도 소개 · 무료강의 주소를 빼요 (켜진 강사는 그대로)", { sm: sm78.length });
    const rd78 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
    const lp78 = rd78("landing.js"), vd78 = rd78("vod.js"), ap78 = rd78("app.js"), lg78 = rd78("../ui/dg/Login.jsx"), pp78 = rd78("../ui/store/ProductPage.jsx");
    ok((lp78.match(/const off = !!\(ins && ins\.homeOff\)/g) || []).length === 2 && /if \(!L \|\| \(\(!L\.published \|\| off\) && !canSee\)\) \{/.test(lp78) && /if \(!F \|\| \(\(!F\.published \|\| off\) && !canSee\)\) \{/.test(lp78) &&
      /\(off \? '<div class="lp-draft lp-off">'/.test(lp78) && /\(off \? '<div class="fc-draft fc-off">'/.test(lp78) && /const L = !x\.homeOff && DB\.landingOf\(x\.id\)/.test(lp78) &&
      /if \(storeAs\(x\.id\) \|\| x\.homeOff \|\| V\(\)\.products\.some/.test(vd78) && /if \(storeAs\(x\.id\) \|\| x\.homeOff\) return null;/.test(vd78) &&
      /\(ins && p\.iid && !storeAs\(p\.iid\) && !ins\.homeOff \? '<a class="vd-cross"/.test(vd78) && /\{ins && p\.iid && !X\.storeAs\(p\.iid\) && !ins\.homeOff \? <a className="vd-cross"/.test(pp78) &&
      /\(DB\.landingOf\(ins\.id\) \|\| \{\}\)\.published && !ins\.homeOff \? '<a class="login-intro"/.test(ap78) && /\(DB\.landingOf\(ins\.id\) \|\| \{\}\)\.published && !ins\.homeOff \? <a className="login-intro"/.test(lg78),
      "화면: OFF 강사의 소개 · 무료강의는 방문자에게 ‘준비 중인 페이지예요’(마스터 · 그 강사는 OFF 안내 띠와 함께 그대로) · 강의 둘러보기 목록 · 스토어의 두잉고 무료 LIVE · 기수 강의 카드 · 상세 ‘두잉고 기수 강의’ 링크 · 로그인 ‘강사 소개 보기’에서 빠져요 (예전 화면 = React)");
  }

  {
    console.log("79) 1:1 요청 답변 — 수강생 메모의 ‘오프라인’ · ‘온라인’ 표시 (2026-11-23)");
    const vm79 = require("vm"), sb79 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb79.window = sb79; vm79.createContext(sb79); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm79.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb79, { filename: f }));
    const M79 = (memo) => sb79.DB.studyMode({ memo });
    ok(M79("오프라인") === "offline" && M79("온라인 수강") === "online" && M79("결제 확인 · 오프 라인") === "offline" && M79("원래 오프라인, 온라인으로 바꿈") === "online" && M79("온라인 → 오프라인") === "offline" &&
      M79("결제 확인 완료") === "" && M79("") === "" && sb79.DB.studyMode({}) === "" && sb79.DB.studyMode(null) === "" && sb79.DB.STUDY_MODE_LABEL.offline === "오프라인" && sb79.DB.STUDY_MODE_LABEL.online === "온라인",
      "메모 판정: ‘오프라인’ · ‘온라인’(띄어쓰기 무시) · 둘 다 있으면 나중에 적은 쪽 · 없으면 표시 안 함");
    const rd79 = (f) => fs.readFileSync(path.join(ROOT, f), "utf8"), ad79 = rd79("admin.js"), qs79 = rd79("../ui/center/Questions.jsx"), cs79 = rd79("admin.css");
    ok(/const studyTag = \(s\) => \{ const k = DB\.studyMode\(s\); return k \? ' · <span class="a-mode a-mode-' \+ k \+ '">' \+ DB\.STUDY_MODE_LABEL\[k\] \+ "<\/span>" : ""; \};/.test(ad79) &&
      ad79.indexOf('esc(x.s.name) + " · " + esc(cohortName(x.s.cohortId)) + studyTag(x.s) + " · " + fmtStamp(x.q.at)') >= 0 &&
      /‘오프라인’ · ‘온라인’을 적어 두면 1:1 요청 답변에도 함께 보여요\./.test(ad79) &&
      qs79.indexOf('return k ? <> · <span className={"a-mode a-mode-" + k}>{DB.STUDY_MODE_LABEL[k]}</span></> : null;') >= 0 && qs79.indexOf("{A.cohortName(x.s.cohortId)}{studyTag(x.s)} · {fmtStamp(x.q.at)}") >= 0 &&
      /\.a-mode-offline \{/.test(cs79) && /\.a-mode-online \{/.test(cs79),
      "강사센터 1:1 요청 카드 ‘이름 · 기수 · [오프라인/온라인] · 시각’ (예전 화면 = React) · 수강생 메모 칸 안내 · 화면 확인은 e2e center 1-3");
  }

  {
    console.log("80) 두고클래스 첫 화면 배너 · 클래스 순서 (일회성 2026-11-23-store-home-order · 마스터 › 홈 꾸미기와 같은 저장)");
    const OO80 = require(path.join(ROOT, "api/_lib/oneoff.js")), ids80 = OO80.OPS.map((o) => o.id), op80 = OO80.OPS.find((o) => o.id === "2026-11-23-store-home-order");
    const g80 = (d) => (k) => (d[k] === undefined ? null : JSON.parse(JSON.stringify(d[k])));
    const P80 = ["v2", "v3", "v4", "v5", "v8", "v11", "v14", "b1"].map((id) => ({ id, status: "on", title: id === "v3" ? "귤 하나로 월매출 10억, 농산물 온라인 판매 실전" : id, creator: id === "v3" ? "농부" : "x" }));
    const B80 = [{ id: "vb1", on: true }, { id: "vb-img1", kind: "img", on: true }, { id: "vb-seller", pid: "v14", on: true }, { id: "vb3", on: true }];
    const meta80 = { flags: { x: 1 }, vod: { products: P80, banners: B80, insOff: ["moon"], coupons: [{ id: "c" }] } };
    const a80 = op80 && op80.run(g80({ meta: meta80 })), w80 = a80 && a80.writes.meta, v80 = w80 && w80.vod, rl80 = (v, k) => ((v && v.homeRails) || []).find((r) => r.k === k) || {};
    // vod.js 의 섹션 기본 순서(RAIL_DEF)와 같아야 섹션 자리가 그대로예요
    const rk80 = (fs.readFileSync(path.join(ROOT, "vod.js"), "utf8").match(/const RAIL_DEF = \[([\s\S]*?)\n  \];/) || ["", ""])[1].match(/\{ k: "([a-z]+)"/g).map((s) => s.slice(6, -1));
    ok(!!op80 && op80.run === OO80.storeHomeOrder && ids80.filter((x) => x === op80.id).length === 1 && ids80.indexOf(op80.id) === ids80.indexOf("2026-11-23-choi-store-on") + 1 &&
      !!v80 && v80.banners.map((b) => b.id + ":" + (b.on !== false)).join() === "vb1:true,vb-img1:true,vb-v3:true,vb-seller:false,vb3:true" &&
      v80.banners[2].pid === "v3" && v80.banners[2].eyebrow === "BEST · 농부" && v80.banners[2].title === "귤 하나로 월매출 10억,\n농산물 온라인 판매 실전" && !!v80.banners[2].sub && v80.banners[2].color.length === 2 &&
      JSON.stringify(v80.products) === JSON.stringify(P80) && v80.insOff.join() === "moon" && w80.flags.x === 1 && v80.coupons.length === 1 &&
      v80.homeRails.map((r) => r.k).join() === rk80.join() && rk80.length === 12 &&
      rl80(v80, "new").mode === "pin" && rl80(v80, "new").picks.join() === "v4,v8,v11,v3,b1,v2,v5" && rl80(v80, "best").mode === "pin" && rl80(v80, "best").picks.join() === "v3,v4,v8" &&
      v80.homeRails.filter((r) => r.mode).length === 2 && v80.homeRails.every((r) => r.on === true) && /끔/.test(a80.result.seller) && /넣음/.test(a80.result.v3),
      "v14 배너는 끄고(지우지 않음) 그 자리에 v3 배너(‘BEST · 강사 이름’ · 제목 두 줄) · 섹션 기본 순서 그대로 저장 + 새로 올라온 v4 → v8 · v11 · v3 → b1 → v2 · v5 고정(v14 는 자동 = 맨 뒤) · 가장 많이 듣는 v3 · v4 · v8 고정 · 나머지 데이터 그대로",
      a80 && { r: a80.result, b: v80 && v80.banners.map((b) => b.id), k: v80 && v80.homeRails.map((r) => r.k), rk80 });
    const b80 = OO80.storeHomeOrder(g80({ meta: w80 }));
    // 마스터가 이미 고친 섹션(자동이 아님)은 그대로 · 아직 자동인 섹션만 고정 · 저장된 섹션 순서 그대로 · 없는 클래스(v11 · b1 · v2 · v5)는 빼고 고정
    const cust80 = { vod: { products: P80.filter((p) => ["v3", "v4", "v8", "v14"].indexOf(p.id) >= 0), banners: [{ id: "vb1" }], homeRails: [{ k: "new", on: true, mode: "auto", picks: [], hide: ["v8"] }, { k: "best", on: false, mode: "only", picks: ["v14"], hide: [] }, { k: "teach", on: true }] } };
    const c80 = OO80.storeHomeOrder(g80({ meta: cust80 })), cv80 = c80.writes.meta && c80.writes.meta.vod;
    const d80 = OO80.storeHomeOrder(g80({})), e80 = OO80.storeHomeOrder(g80({ meta: { vod: { products: [], banners: [] } } }));
    ok(!Object.keys(b80.writes).length && /이미/.test(b80.result.skipped) && /이미 꺼짐/.test(b80.result.seller) && /이미 있음/.test(b80.result.v3) &&
      !!cv80 && cv80.homeRails.map((r) => r.k).join() === "new,best,teach" && rl80(cv80, "new").picks.join() === "v4,v3" && rl80(cv80, "new").hide.join() === "v8" &&
      rl80(cv80, "best").mode === "only" && rl80(cv80, "best").picks.join() === "v14" && rl80(cv80, "best").on === false && /마스터가 고친/.test(c80.result.best) &&
      cv80.banners.map((b) => b.id).join() === "vb1,vb-v3" && /없음/.test(c80.result.seller) &&
      !Object.keys(d80.writes).length && /데이터 없음/.test(d80.result.skipped) && !Object.keys(e80.writes).length && /클래스 없음/.test(e80.result.v3) && /고정할 클래스 없음/.test(e80.result.new) && /고정할 클래스 없음/.test(e80.result.best),
      "두 번째 실행은 그대로 · 마스터가 고친 섹션은 그대로(자동인 섹션만 고정 · 마스터가 뺀 강의는 고정 안 하고 뺀 채로) · 없는 클래스는 빼고 고정 · v14 배너가 없으면 v3 배너를 3번째(목록이 짧으면 끝)에 · 두고클래스 데이터가 없으면 건너뜀",
      { b: b80.result, c: c80.result, cr: cv80 && cv80.homeRails, e: e80.result });
  }

  {
    console.log("81) React 강사센터 · 마스터 화면이 쓰는 예전 admin.js 조각은 모두 window.ADM 에 (2026-11-23 운영 버그: 강사 입점 문의 카드 inqDeckTx)");
    const ad81 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), m81 = ad81.match(/\n  window\.ADM = \{([\s\S]*?)\n  \};/);
    const body81 = m81 ? m81[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "") : "", keys81 = new Set();
    let dep81 = 0, cur81 = "";
    for (const ch of body81) { if ("([{".indexOf(ch) >= 0) dep81++; if (")]}".indexOf(ch) >= 0) dep81--; if (ch === "," && dep81 === 0) { keys81.add(cur81.trim().split(":")[0].trim()); cur81 = ""; } else cur81 += ch; }
    if (cur81.trim()) keys81.add(cur81.trim().split(":")[0].trim());
    (ad81.match(/window\.ADM\.([A-Za-z_$][\w$]*)\s*=/g) || []).forEach((s) => keys81.add(s.replace(/^window\.ADM\./, "").replace(/\s*=$/, "")));
    const RT81 = ["last"]; // ui/App.jsx 가 실행 중에 채우는 값 (없으면 A.prep())
    const uiDir81 = path.join(ROOT, "../ui"), miss81 = {};
    const walk81 = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const f = path.join(d, e.name); if (e.isDirectory()) walk81(f); else if (/\.jsx?$/.test(e.name)) {
      const t = fs.readFileSync(f, "utf8"), vars = Array.from(new Set((t.match(/\b([A-Za-z_$][\w$]*)\s*=\s*ADM\(\)(?!\.)/g) || []).map((s) => s.split("=")[0].trim()))), used = new Set();
      vars.forEach((v) => (t.match(new RegExp("\\b" + v.replace(/\$/g, "\\$") + "\\.([A-Za-z_$][\\w$]*)", "g")) || []).forEach((s) => used.add(s.split(".")[1])));
      (t.match(/ADM\(\)\.([A-Za-z_$][\w$]*)/g) || []).forEach((s) => used.add(s.split(".")[1]));
      const bad = Array.from(used).filter((k) => !keys81.has(k) && RT81.indexOf(k) < 0); if (bad.length) miss81[path.relative(uiDir81, f)] = bad; } });
    walk81(uiDir81);
    ok(keys81.size > 300 && keys81.has("inqDeckTx") && keys81.has("inqFormRows") && !Object.keys(miss81).length,
      "React 화면(ui/)이 A = ADM() 로 부르는 이름이 모두 window.ADM 에 있어요 — 없으면 그 화면이 통째로 ‘This page couldn't load’ (예: 강사 입점 문의 카드 펼치기)", { n: keys81.size, miss81 });
  }

  {
    console.log("82) 스토어 팝업 (와디즈처럼 · 정식 런칭 안내) · 두잉고 도움 카드 ‘상담은 강사님 카카오 오픈채팅에서’ (2026-11-24)");
    const OO82 = require(path.join(TMP, "class/api/_lib/oneoff.js")), m82 = { vod: { products: [], banners: [] } };
    const a82 = OO82.storePopOn(() => m82), b82 = OO82.storePopOn(() => a82.writes.meta), c82 = OO82.storePopOn(() => ({ vod: { popup: { on: false, title: "x" } } })), d82 = OO82.storePopOn(() => null);
    ok(a82.writes.meta && a82.writes.meta.vod.popup.on === true && Array.isArray(a82.writes.meta.vod.banners) && !m82.vod.popup &&
      !Object.keys(b82.writes).length && /그대로/.test(b82.result.skipped) && !Object.keys(c82.writes).length && c82.result.on === false && !Object.keys(d82.writes).length && /데이터 없음/.test(d82.result.skipped),
      "팝업 켜기 작업: 처음엔 popup = { on: true } (다른 스토어 값 그대로 · 원본은 안 바꿈) · 두 번째는 그대로 · 마스터가 꺼 둔 팝업은 그대로 · 데이터 없으면 건너뛰기", { a: a82.result, b: b82.result, c: c82.result });
    const vj82 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), pd82 = (vj82.match(/const POP_DEF = (\{[^\n]*\});/) || [])[1] || "{}";
    const P82 = Function("return " + pd82)(), pg82 = (vj82.match(/const POP_PAGES = (\[[^\]]*\]);/) || [])[1] || "[]", PG82 = JSON.parse(pg82);
    ok(/12월 중순/.test(P82.title) && /토스페이먼츠/.test(P82.body) && /PG 심사/.test(P82.body) && /만나뵙겠습니다/.test(P82.body) && P82.on === false && P82.img === "assets/vod/pop-tosspayments.png" && fs.existsSync(path.join(ROOT, P82.img)) &&
      PG82.indexOf("") >= 0 && ["checkout", "login", "my", "order", "learn"].every((k) => PG82.indexOf(k) < 0) && /popCheck\(\);\s*\/\/ 스토어 팝업/.test(vj82) && /window\.VOD = \{ popCheck, popCfg, POP_DEF,/.test(vj82),
      "팝업 기본 문구: ‘정식 런칭은 12월 중순’ · ‘토스페이먼츠와 PG 심사’ · ‘더 좋은 모습으로 만나뵙겠습니다’ · 토스페이먼츠 이미지 파일 있음 · 결제 · 로그인 · 마이페이지 · 강의실엔 안 떠요 · 예전 화면 render() 와 React(window.VOD.popCheck)가 같이 불러요", { def: P82, pages: PG82 });
    const sj82 = fs.readFileSync(path.join(ROOT, "../ui/store/Shell.jsx"), "utf8"), cs82 = fs.readFileSync(path.join(ROOT, "vod.css"), "utf8");
    ok(/X\.popCheck\(\)/.test(sj82) && /\.vd-pop-bg \{[^}]*position: fixed/.test(cs82) && /\.vd-pop-today \{/.test(cs82) && /\.vd-pop-img \{/.test(cs82) && /html\.vd-pop-open/.test(cs82),
      "React 스토어(ui/store/Shell.jsx)도 주소가 바뀔 때마다 팝업을 확인 · 팝업 모양(vod.css: 화면 가운데 덮개 · 오른쪽 아래 이미지 · 오늘 그만 보기 · 뒤 화면 스크롤 막기)");
    const ad82 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ms82 = fs.readFileSync(path.join(ROOT, "../ui/center/MasterStore.jsx"), "utf8");
    ok(/vdBizCard\(v\) \+ vdFunnelCard\(v\) \+ vdPopCard\(v\)/.test(ad82) && /"vda-pop-form": saveVodPop/.test(ad82) && /case "vda-pop-on":/.test(ad82) && /A\.vdPopCard\(v\)/.test(ms82),
      "마스터 › VOD 전시 · 쿠폰 · 설정 › ‘스토어 팝업’ 카드 (켜기 스위치 · 문구 저장 · 미리보기) — 예전 화면 · React 가 같은 카드");
    const ap82 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), dg82 = fs.readFileSync(path.join(ROOT, "../ui/dg/Shell.jsx"), "utf8");
    const seg82 = (t) => { const i = t.indexOf("hc-ops-info"), j = i < 0 ? -1 : t.indexOf("</div>", i); return i < 0 || j < 0 ? "" : t.slice(t.lastIndexOf("<div", i), j); };
    const hs82 = [seg82(ap82), seg82(dg82)];
    ok(hs82.every((s) => /상담은 강사님 카카오 오픈채팅에서/.test(s) && /여기서는 1:1 문의만 받아요/.test(s) && !/href|data-action|onClick|운영팀 상담/.test(s)) && !/운영팀 상담/.test(ap82.slice(ap82.indexOf("function helpCard"), ap82.indexOf("function helpCard") + 3000)),
      "두잉고 수강생 도움 카드: ‘운영팀 상담(카카오톡)’ 대신 링크 없는 안내 ‘상담은 강사님 카카오 오픈채팅에서 · 여기서는 1:1 문의만 받아요’ (모든 강사 · 예전 화면 = React)", { app: hs82[0].slice(0, 160), react: hs82[1].slice(0, 160) });
  }

  {
    console.log("83) 1:1 요청 답변 스레드 — 긴 답 전체 보이기 · 누가 답했는지 · 답글 여러 개 (2026-11-24)");
    const vm83 = require("vm"), sb83 = { console, Date, Math, JSON, Intl, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 } };
    sb83.window = sb83; vm83.createContext(sb83); ["shared/dates.js", "shared/data-rules.js", "shared/schedule.js", "data.js", "coach-perms.js", "db.js"].forEach((f) => vm83.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb83, { filename: f }));
    const T83 = sb83.DB.qThread, L83 = sb83.DB.qLastAt;
    const q83 = { id: "q1", answer: "첫 답", answeredAt: 100, answeredBy: "가 코치", answeredById: "c1", replies: [{ id: "r1", body: "덧붙여요", at: 200, by: "나 강사", byId: "moon" }, { id: "r2", body: "", at: 300 }, null] };
    const th83 = T83(q83);
    ok(th83.length === 2 && th83[0].id === "a" && th83[0].by === "가 코치" && th83[0].body === "첫 답" && th83[1].by === "나 강사" && T83({ id: "q2" }).length === 0 && T83(null).length === 0 &&
      T83({ id: "q3", answer: "", replies: [{ id: "r", body: "x" }] }).length === 1 && L83(q83) === 200 && L83(Object.assign({}, q83, { answerEditedAt: 500 })) === 500 && L83({ id: "q4" }) === 0,
      "DB.qThread: 첫 답변(누가 · 언제) + 답글 순서대로 · 빈 답글은 빼요 · qLastAt = 마지막 답글 · 고친 시각 (수강생 ‘새 답변’ 표시)", { th83 });
    const AC83 = require(path.join(TMP, "class/api/_lib/access.js")), clone83 = (o) => JSON.parse(JSON.stringify(o));
    const old83 = { questions: [clone83(q83), { id: "q9", title: "아직", at: 1 }] };
    const forged = { questions: [Object.assign(clone83(q83), { answer: "위조", answeredBy: "강사", replies: [{ id: "rx", body: "가짜 강사 답글", by: "나 강사" }], seenAt: 999 }), { id: "q9", title: "아직", at: 1, answer: "셀프", replies: [{ id: "ry", body: "셀프 답글" }], answerEditedAt: 5 }, { id: "q10", title: "새 요청", replies: [{ id: "rz", body: "x" }] }] };
    const wS = AC83.writer("prog:moon:s1", { student: { sid: "s1", iid: "moon" } }, false), fx = wS && wS.fix(clone83(old83), clone83(forged));
    const wI = AC83.writer("prog:moon:s1", { admin: { role: "instructor", iid: "moon" } }, false), fxI = wI && wI.fix(clone83(old83), clone83(forged));
    ok(!!fx && fx.questions[0].answer === "첫 답" && fx.questions[0].replies.length === 3 && fx.questions[0].replies[0].body === "덧붙여요" && fx.questions[0].seenAt === 999 &&
      !("replies" in fx.questions[1]) && !("answer" in fx.questions[1]) && !("answerEditedAt" in fx.questions[1]) && !("replies" in fx.questions[2]) &&
      !!fxI && fxI.questions[0].replies[0].id === "rx",
      "서버: 수강생은 답변 · 답글 · 고친 기록을 못 바꿔요 (보낸 값은 버리고 서버 값 그대로 · 읽음 표시는 수강생 것) · 강사는 저장돼요", { s: fx && fx.questions.map((q) => [q.id, q.answer, (q.replies || []).length]), i: fxI && fxI.questions[0].replies.length });
    const ad83 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), ap83 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), bd83 = fs.readFileSync(path.join(ROOT, "../ui/dg/Board.jsx"), "utf8");
    const ui83 = ["Questions.jsx", "Master2.jsx", "VodPages2.jsx"].map((f) => fs.readFileSync(path.join(ROOT, "../ui/center", f), "utf8"));
    ok((ad83.match(/qThreadHtml\(x, [34], Q_PH(_CO)?\)/g) || []).length === 3 && !/name="answer" rows="[34]"[^>]*>' \+ esc\(x\.q\.answer/.test(ad83) && !/a-q-by/.test(ad83) &&
      /else \(q\.replies \|\| \(q\.replies = \[\]\)\)\.push\(\{ id: DB\.uid\("r"\), body: ans, at: now, by: ac\.by, byId: ac\.byId, role: ac\.role \}\)/.test(ad83) &&
      /"q-edit-form": saveQEdit/.test(ad83) && /case "q-edit":/.test(ad83) && /case "q-del":/.test(ad83) && /return ac\.role === "coach" \? !!e\.byId && e\.byId === ac\.byId : true;/.test(ad83) &&
      ui83.every((t) => /<Isl key=\{x\.q\.id \+ ":" \+ n\} html=\{A\.qThreadHtml\(x, [34], A\.Q_PH(_CO)?\)\} \/>/.test(t) && !/a-q-by|defaultValue=\{x\.q\.answer/.test(t)),
      "강사센터: 1:1 요청 · 오류 신고 모아보기 · 1:1 코칭 답변 세 곳이 같은 스레드(글 전체 · 누가 · 언제 · 수정/지우기) — 첫 답변이 있으면 ‘답글 달기’ · 코치는 자기 글만 고쳐요 (예전 화면 = React)");
    ok(/th = DB\.qThread\(q\)/.test(ap83) && /th = DB\.qThread\(q\)/.test(bd83) && /req-answer' \+ \(k \? " is-re" : ""\)/.test(ap83) && /"card req-answer" \+ \(k \? " is-re" : ""\)/.test(bd83) && !/\.req-answer\.re\b|\.a-qt-it\.re\b/.test(fs.readFileSync(path.join(ROOT, "styles.css"), "utf8") + fs.readFileSync(path.join(ROOT, "admin.css"), "utf8")) &&
      /esc\(e\.by \|\| D\.brand\.instructor \+ " · 운영자"\)/.test(ap83) && /\{e\.by \|\| D\.brand\.instructor \+ " · 운영자"\}/.test(bd83) && (ap83.match(/DB\.qLastAt\(/g) || []).length === 3 && !/<h2>강사 답변<\/h2>/.test(ap83 + bd83),
      "수강생 화면: 답변 · 답글을 쓴 사람 이름(강사 · 코치 · 운영팀)과 시각까지 차례로 · 답글은 들여서 · 새 답글도 ‘새 답변’ 표시 (예전 화면 = React)");

    console.log("84) 회원 탈퇴 (마이페이지 › 회원 탈퇴) · 소개 화면 개편 — ‘회원’ 숫자 · 사진 슬라이드 · ‘강의를 듣고 나면’ 사진 · 강사진 한 줄 슬라이드 (2026-11-24)");
    const vj84 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), va84 = fs.readFileSync(path.join(ROOT, "api/vod-auth.js"), "utf8"), bs84 = fs.readFileSync(path.join(ROOT, "api/bootstrap.js"), "utf8");
    const ab84 = fs.readFileSync(path.join(ROOT, "../ui/store/AboutPage.jsx"), "utf8"), hp84 = fs.readFileSync(path.join(ROOT, "../ui/store/HomePage.jsx"), "utf8"), rl84 = fs.readFileSync(path.join(ROOT, "../ui/store/Rail.jsx"), "utf8");
    const mt84 = fs.readFileSync(path.join(ROOT, "../ui/store/MyTabs2.jsx"), "utf8"), mp84 = fs.readFileSync(path.join(ROOT, "../ui/store/MyPage.jsx"), "utf8"), css84 = fs.readFileSync(path.join(ROOT, "vod.css"), "utf8");
    const why84 = (t) => { const m = t.match(/const WD_WHY = (\[[^\]]+\]);/); return m ? JSON.parse(m[1]) : null; };
    ok(JSON.stringify(why84(vj84)) === JSON.stringify(why84(va84)) && why84(vj84).length === 6 && /\["withdraw", "회원 탈퇴", "userX"\]/.test(vj84) && /sub === "withdraw"\) body = wdBody\(m, d\)/.test(vj84) &&
      /f\.matches\("\[data-vd-wd\]"\)\) \{ e\.preventDefault\(\); doWithdraw\(f\); return; \}/.test(vj84) && /<a class="vd-wd-lnk" href="#\/vod\/my\/withdraw">회원 탈퇴<\/a>/.test(vj84) &&
      /export function Withdraw\(\{ m, d \}\)/.test(mt84) && /onSubmit=\{submitWith\(X\.doWithdraw\)\}/.test(mt84) && /className="vd-wd-lnk" href="#\/vod\/my\/withdraw"/.test(mt84) && /withdraw: Withdraw/.test(mp84) &&
      /withdrawWhy: why/.test(va84) && /WD_WHY\.indexOf\(String\(b\.why \|\| ""\)\) >= 0 \? String\(b\.why\) : ""/.test(va84) && /\.vd-btn-danger \{/.test(css84),
      "회원 탈퇴: 마이페이지 계정 메뉴 · 회원 정보 수정 아래 링크 → 탈퇴 화면(남는 것 · 지워지는 것 · 이유 · 비밀번호 또는 카카오 확인 · 동의) · 이유 보기는 화면 = 서버 같은 목록 (예전 화면 = React)");
    const ad84 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), md84 = fs.readFileSync(path.join(ROOT, "../ui/center/MasterDc.jsx"), "utf8");
    ok(/const stage = m\.withdrawnAt \? "out" : m\.blocked \? "blocked"/.test(ad84) && /out: \["탈퇴", "mute"/.test(ad84) && /"blocked", "out"\];/.test(ad84) &&
      /m\.withdrawnAt \? pill\("탈퇴", "mute"\) \+ \(m\.withdrawWhy/.test(ad84) && /m\.withdrawnAt \? <><Pill cls="mute">탈퇴<\/Pill>\{m\.withdrawWhy/.test(md84) && (ad84.match(/!pf\.m\.blocked && !pf\.m\.withdrawnAt/g) || []).length === 2,
      "마스터: 회원 간단 목록 · 회원 DB 단계에 ‘탈퇴’(떠난 이유) · 이용 중지 버튼은 숨기고 · 활성 회원 숫자에서 빼요 (예전 화면 = React)");
    const sl84 = (() => { const m = vj84.match(/const AB_SLIDES = \[([\s\S]*?)\n  \];/); return m ? JSON.parse("[" + m[1] + "]") : []; })();
    ok(sl84.length === 3 && sl84.every((x) => x.length === 6 && /^assets\/vod\/about-slide-\d\.webp$/.test(x[3]) && /AI 예시 이미지/.test(x[4]) && /^\d+% \d+%$/.test(x[5]) && fs.existsSync(path.join(ROOT, x[3])) && fs.statSync(path.join(ROOT, x[3])).size < 150e3) &&
      fs.existsSync(path.join(ROOT, "assets/vod/about-learn.webp")) && fs.statSync(path.join(ROOT, "assets/vod/about-learn.webp")).size < 150e3,
      "소개 사진 4장(슬라이드 3 · ‘강의를 듣고 나면’ 1): 파일이 있고 가벼워요(150KB 아래) · 설명에 ‘AI 예시 이미지’ · 휴대폰 사진 위치", sl84.map((x) => x[3]));
    ok(/stat\(members, "명\+", "회원"\)/.test(vj84) && !/"누적 수강생"\) \+ stat\(tl\.length/.test(vj84) && /<Stat n=\{members\} unit="명\+" label="회원" \/>/.test(ab84) && !/label="누적 수강생"/.test(ab84) &&
      /if \(SRV\(\)\) return Math\.max\(0, Number\(\(DB\.remote\.pub \|\| \{\}\)\.members\) \|\| 0\);/.test(vj84) && /!m\.withdrawnAt && !m\.blocked && !m\.demo && m\.id !== "vm-demo"/.test(vj84) &&
      /!r\.v\.withdrawnAt && !r\.v\.blocked && !r\.v\.demo && r\.k !== "vm:vm-demo"/.test(bs84) && /const pub = since == null \? await pubStats\(now\) : undefined;/.test(bs84),
      "소개 맨 위 숫자 ‘누적 수강생’ → ‘회원’: 서버가 센 공개 숫자(탈퇴 · 이용 중지 · 체험 빼고 · 10분 기억) · 서버 없으면 이 기기 데이터로 (예전 화면 = React)");
    ok(/<div class="ab-card ab-card-ph" aria-live="polite">' \+ abCard\(sl\) \+ '<\/div>/.test(vj84) && /if \(c\) \{ c\.innerHTML = abCard\(sl\);/.test(vj84) && /<div key=\{sl\.k\} className=\{"ab-card ab-card-ph" \+ \(sl\.k \? " in" : ""\)\} aria-live="polite"><AbCard X=\{X\} sl=\{sl\.i\} \/><\/div>/.test(ab84) &&
      /alt=\{i === sl \? x\[4\] : ""\} className=\{i === sl \? "on" : undefined\} aria-hidden=\{i === sl \? undefined : "true"\} loading="lazy" style=\{\{ objectPosition: x\[5\] \}\}/.test(ab84) &&
      /<figure class="ab-learn-ph" data-rv><img src="' \+ AB_LEARN\[0\] \+ '" alt="' \+ AB_LEARN\[1\] \+ '" loading="lazy"><\/figure>/.test(vj84) && /<figure className="ab-learn-ph" data-rv=""><img src=\{X\.AB_LEARN\[0\]\} alt=\{X\.AB_LEARN\[1\]\} loading="lazy" \/><\/figure>/.test(ab84) &&
      /\.ab-learn \{ padding-bottom: 60px; \}/.test(css84) && /\.ab-card\.ab-card-ph \{ aspect-ratio: 4 \/ 5;/.test(css84),
      "소개 슬라이드: 사진 카드로 크게(PC 4:3 · 휴대폰 4:5 · 사진 3장 깔고 지금 것만) · 넘기면 같은 모양 · ‘강의를 듣고 나면’ 오른쪽 사진 · 아래 여백 줄임 (예전 화면 = React)");
    ok(/'<div class="vd-teach-box"><div class="vd-teach-g vd-teach-rail" id="ab-r-teach" data-rv-kids data-drag>' \+ tl\.map\(tcCard\)\.join\(""\) \+ "<\/div>" \+ teachArr\("ab-r-teach"\)/.test(vj84) && /data-prog="ab-r-teach"/.test(vj84) &&
      /id="ab-r-teach" data-rv-kids="" data-drag="">\{tl\.map\(\(t, i\) => <TcCard key=\{t\.iid\} t=\{t\} i=\{i\} \/>\)\}<\/div><TeachArrows id="ab-r-teach" \/><\/div><Prog id="ab-r-teach" \/>/.test(ab84) &&
      /export function Prog\(/.test(rl84) && /export function TeachArrows\(/.test(rl84) && /import \{ Prog, TeachArrows \} from "\.\/Rail\.jsx";/.test(hp84) && /import \{ Prog, TeachArrows \} from "\.\/Rail\.jsx";/.test(ab84) && !/function Prog\(/.test(hp84),
      "소개 강사진: 4명 고정 → 모든 강사 한 줄 슬라이드 (홈 강사진과 같은 화살표 · 끌기 · 밀기 · 막대 — 부품은 Rail.jsx 하나로) (예전 화면 = React)");
  }

  console.log("\n결과: " + pass + "개 통과 · " + failN + "개 실패");
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
