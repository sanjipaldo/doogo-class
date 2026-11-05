/* 두고클래스 서버 테스트 — 진짜 포트원 · 카카오 대신 가짜 응답(fetch 바꿔치기)으로
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
fs.symlinkSync(path.join(ROOT, "..", "node_modules"), path.join(TMP, "node_modules"), "dir"); // 공식 SDK (저장소 맨 위 npm install)
const WH = crypto.randomBytes(24).toString("base64");
Object.assign(process.env, { CLASS_SQLITE: path.join(TMP, "t.db"), SESSION_SECRET: "test-session", VOD_SERVER_AUTH: "1", PORTONE_STORE_ID: "store-test", PORTONE_API_SECRET: "ps-test", PORTONE_CHANNEL_CARD: "channel-key-card", PORTONE_CHANNEL_KAKAOPAY: "channel-key-kp", PORTONE_WEBHOOK_SECRET: "whsec_" + WH, KAKAO_REST_KEY: "rest-test", KAKAO_CLIENT_SECRET: "cs-test", KAKAO_REDIRECT_URI: "https://www.doogoclass.com/api/vod-kakao", KAKAO_ADMIN_KEY: "admin-test" });
const API = (n) => require(path.join(TMP, "class/api", n + ".js"));
const auth = require(path.join(TMP, "class/api/_lib/auth.js"));

// ---------- 가짜 외부 서버 ----------
const PG = {}, calls = [], PAY = [], AI = { reqs: [], next: null }, SOL = [], RES = [], VDC = [];
let kakaoUser = null;
global.fetch = async (url, opt) => {
  opt = opt || {}; const u = new URL(url); calls.push(opt.method === "POST" ? "POST " + u.host + u.pathname : "GET " + u.host + u.pathname);
  const J = (status, j) => ({ ok: status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
  if (u.host === "api.portone.io") {
    if (!/^PortOne ps-test$/.test((opt.headers || {}).Authorization || "")) return J(401, { type: "UNAUTHORIZED" });
    const m = u.pathname.match(/^\/payments\/([^/]+)(\/cancel|\/virtual-account\/close)?$/); const id = decodeURIComponent(m[1]);
    if (m[2] === "/virtual-account/close") { if (PG[id] && PG[id].status === "PAID") return J(409, { type: "PAYMENT_ALREADY_PAID", message: "이미 입금된 결제예요" }); if (PG[id]) PG[id].closed = true; return J(200, { closedAt: new Date().toISOString() }); }
    if (m[2]) { const b = JSON.parse(opt.body); const p = PG[id]; if (p && p.failCancel) return J(400, { type: "CANCEL_FAILED", message: "취소 실패 (시험)" }); if (p && p.cancelSt === "FAILED") return J(200, { cancellation: { id: "cx_" + calls.length, status: "FAILED", totalAmount: 0 } }); const amt = b.amount != null ? b.amount : p.amount.total - (p.amount.cancelled || 0); p.amount.cancelled = (p.amount.cancelled || 0) + amt; p.status = p.amount.cancelled >= p.amount.total ? "CANCELLED" : "PARTIAL_CANCELLED"; p.lastCancel = b; if (p.onCancel) await p.onCancel(); return J(200, { cancellation: { id: "cx_" + calls.length, status: p.cancelSt || "SUCCEEDED", totalAmount: amt } }); }
    return PG[id] ? J(200, PG[id]) : J(404, { type: "PAYMENT_NOT_FOUND" });
  }
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
      end(s) { [].concat(hd["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1)); if (v) jar[k] = v; else delete jar[k]; }); let j = null; try { j = JSON.parse(s); } catch (e) {} done({ status: this.statusCode, json: j, location: hd.location }); } };
    API(name)(req, res);
  });
}
let pass = 0, failN = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log("  ✓ " + label); } else { failN++; console.log("  ✗ " + label, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); } };
const sign = (body) => { const id = "msg_" + crypto.randomBytes(4).toString("hex"), ts = String(Math.floor(Date.now() / 1000)); const sig = crypto.createHmac("sha256", Buffer.from(WH, "base64")).update(id + "." + ts + "." + body).digest("base64"); return { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": "v1," + sig }; };
const paidLike = (pid, total) => { PG[pid] = { id: pid, status: "PAID", storeId: "store-test", transactionId: "tx_" + pid, currency: "KRW", amount: { total, paid: total, cancelled: 0 }, method: { type: "PaymentMethodCard" }, receiptUrl: "https://r/" + pid }; };

(async () => {
  await require(path.join(TMP, "class/api/_lib/init.js")).ensureSeeded(); // 실제 서버처럼 두잉고 기본 데이터(meta · 강사)부터
  console.log("1) 설정 · 카탈로그");
  let r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.auth && r.json.cfg.kakao && r.json.cfg.portone && r.json.cfg.portone.storeId === "store-test" && !JSON.stringify(r.json).includes("ps-test") && !JSON.stringify(r.json).includes("cs-test"), "config: 연결 상태만 · 비밀 값 없음", r.json);
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
  r = await call("vod-pay", { body: { action: "complete", paymentId: p1 } });
  ok(!r.json.ok, "포트원에 결제가 없으면 완료 안 됨", r.json);
  paidLike(p1, 200000);
  r = await call("vod-pay", { body: { action: "complete", paymentId: p1 } });
  ok(!r.json.ok && /금액/.test(r.json.message), "결제 금액이 다르면 완료 안 됨", r.json);
  paidLike(p1, 210000);
  r = await call("vod-pay", { body: { action: "complete", paymentId: p1 } });
  ok(r.json.ok && r.json.orders.length === 2 && r.json.orders.every((o) => o.status === "paid"), "완료: 수강권 + 코칭권 주문 2건 paid", r.json);
  r = await call("vod-pay", { body: { action: "complete", paymentId: p1 } });
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
  r = await call("vod-pay", { body: { action: "complete", paymentId: p2 } });
  r = await call("vod-pay", { body: { action: "cancel", no: no2 } });
  ok(r.json.ok && r.json.amount === 23200 && PG[p2].status === "CANCELLED", "전자책 내려받기 전 → 포트원 결제 전액 취소", r.json);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(!r.json.member.coupons.find((x) => x.cid === "cp-eb").usedAt, "바로 취소하면 쓴 쿠폰을 돌려받음", r.json.member.coupons);
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.no === no2).status === "refunded" && r.json.orders.find((o) => o.no === no2).refundKind === "instant", "주문 refunded · 회원 바로 취소로 기록");

  console.log("4-1) 환불 규칙 (화면 · 서버 같은 공용 모듈) · 두 번 눌러도 한 번만 · 포트원 취소가 실패하면 그대로");
  { const RFS = require(path.join(ROOT, "shared/refund.js")), T0 = Date.parse("2026-11-05T00:00:00Z"), D = 864e5;
    const rq = (o, x) => RFS.instant(Object.assign({ o: Object.assign({ status: "paid", amount: 10000, kind: "course", paidAt: T0, method: "card", pg: { st: "paid" } }, o), type: "vod", used: 0, now: T0 + D, srv: true }, x || {}), RFS.RF_DEF);
    ok(rq({}).ok && rq({}).left === 6 && rq({}).way === "pg" && !rq({}).acct, "공용 규칙: 카드 결제 · 1일째 · 재생 전 → 바로 100% 취소 (6일 남음)", rq({}));
    ok(!rq({}, { used: 1 }).ok && /1개/.test(rq({}, { used: 1 }).why), "공용 규칙: 강의를 하나라도 재생했으면 바로 취소 안 돼요", rq({}, { used: 1 }));
    ok(rq({}, { now: T0 + 7 * D - 1 }).ok && !rq({}, { now: T0 + 7 * D }).ok && /7일/.test(rq({}, { now: T0 + 7 * D }).why), "공용 규칙: 결제 후 7일이 지나면 바로 취소(버튼)가 없어져요");
    ok(rq({ method: "bank", pg: { st: "bank" } }).ok && rq({ method: "bank", pg: { st: "bank" } }).way === "bank" && rq({ method: "bank" }).acct && rq({ method: "vbank" }).way === "vbank" && rq({ method: "vbank" }).acct, "공용 규칙: 무통장 · 가상계좌도 바로 취소 (환불 받을 계좌 필요)");
    ok(!rq({ pg: { st: "mock" } }).ok && rq({ pg: { st: "mock" } }, { srv: false }).ok && rq({ pg: { st: "mock" } }, { srv: false }).way === "mock", "공용 규칙: 정식 서버에서 포트원 결제가 아닌 카드 주문은 환불 요청 · 서버 없는 시안은 바로");
    ok(!rq({ refundReq: { at: 1 } }).ok && !rq({ status: "refunded" }).ok && !rq({ amount: 0 }).ok && !rq({ kind: "coach" }).ok && !rq({}, { type: "" }).ok, "공용 규칙: 환불 요청 중 · 이미 환불 · 0원 · 코칭권 · 상품 없음은 바로 취소 대상 아님");
    ok(RFS.startEnds(rq({}), RFS.RF_DEF, false) && !RFS.startEnds(rq({}), RFS.RF_DEF, true) && !RFS.startEnds(rq({}, { used: 1 }), RFS.RF_DEF, false) && !RFS.startEnds(rq({}, { used: 1 }), Object.assign({}, RFS.RF_DEF, { maxUsed: 2 }), false) && !RFS.startEnds(rq({}, { type: "book" }), RFS.RF_DEF, false), "공용 규칙: 처음 여는 강의면 ‘시작하면 100% 환불이 끝나요’ 안내 (이미 연 강의 · 이미 재생 · N개까지 허용 · 종이책은 안내 없음)");
    const vsrc = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), ssrc = fs.readFileSync(path.join(ROOT, "api/_lib/vod.js"), "utf8");
    ok(/RFX\.instant\(/.test(vsrc) && /require\("\.\.\/\.\.\/shared\/refund"\)/.test(ssrc) && /RF\.instant\(/.test(ssrc) && /<script src="shared\/refund\.js"><\/script>/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")), "화면 · 서버가 같은 환불 규칙 모듈(shared/refund.js)을 써요");
    ok(/startGate\(m\.id, pid, cur\.id\)/.test(vsrc) && /markDone\(m\.id, t\.dataset\.p, t\.dataset\.l\)/.test(vsrc) && /if \(!gate\) \{ markLast\(m\.id, pid, cur\.id\)/.test(vsrc), "VOD 강의실: 강의를 열면(시작하면) · 완료하면 서버 기록(vp:)에도 남겨요 — 바로 취소 판단이 화면과 같게");
    ok(RFS.usedOf(null) === 0 && RFS.usedOf({ last: "a" }) === 1 && RFS.usedOf([{ seen: { a: 1 } }, { done: { b: true }, last: "a", mat: 1 }], RFS.RF_DEF) === 3 && RFS.usedOf([{ mat: 2 }], Object.assign({}, RFS.RF_DEF, { matCounts: false })) === 0, "공용 규칙: 들은 강의 = 연 강의 · 완료한 강의 · 마지막으로 연 강의 (+ 자료 내려받기) — 서버 기록과 화면 기록을 합쳐 세요");
    ok(/function srvTrack\(pid, lid, ev\) \{ if \(!pid \|\| !remoteOn\(\)\) return; loadCfg\(\)\.then\(/.test(vsrc) && /RF\.usedOf\(\[\(sp \|\| \{\}\)\[pid\], \(\(m && m\.prog\) \|\| \{\}\)\[pid\]\], rf\)/.test(ssrc), "재생 기록: 두잉고 강의실로 바로 들어와도 서버 설정을 먼저 받고 보내요 · 서버는 화면 기록(vm: prog)도 함께 봐요");
  }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", expect: 29000 } });
  const pL = r.json.paymentId, noL = r.json.no; paidLike(pL, 29000);
  r = await call("vod-pay", { body: { action: "complete", paymentId: pL } });
  PG[pL].failCancel = true;
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  let oL = (await store.getDoc("vo:" + noL)).v;
  ok(r.status === 502 && oL.status === "paid" && !oL.rfLock && PG[pL].status === "PAID", "포트원 취소가 실패하면 주문은 결제 완료 그대로 · 잠금도 풀려 다시 시도할 수 있어요", { st: r.status, o: oL.status, lock: oL.rfLock });
  delete PG[pL].failCancel;
  { const d0 = await store.getDoc("vo:" + noL); await store.writeDoc("vo:" + noL, Object.assign({}, d0.v, { rfLock: Date.now() }), d0.ver); }
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  ok(r.status === 409 && /처리하고/.test(r.json.message) && PG[pL].status === "PAID", "같은 주문을 처리하는 중이면(두 번 누름) 두 번째는 막아요 — 포트원 취소는 한 번만", r.json);
  { const d0 = await store.getDoc("vo:" + noL); await store.writeDoc("vo:" + noL, Object.assign({}, d0.v, { rfLock: Date.now() - 200e3 }), d0.ver); }
  r = await call("vod-pay", { body: { action: "cancel", no: noL } });
  oL = (await store.getDoc("vo:" + noL)).v;
  ok(r.json.ok && oL.status === "refunded" && !oL.rfLock && PG[pL].status === "CANCELLED", "오래된 잠금(2분 지남)은 풀고 취소 · 끝나면 잠금 없음", { json: r.json, lock: oL.rfLock });
  // 포트원이 취소하는 사이 웹훅(Transaction.Cancelled)이 먼저 와도: ‘회원 바로 취소’로 한 번만 기록 · 쓴 포인트는 한 번만 돌려받아요 (판매 수 · 쿠폰 · 포인트 뒤처리 한 번)
  { const d0 = await store.getDoc("vm:" + oL.mid); await store.writeDoc("vm:" + oL.mid, Object.assign({}, d0.v, { points: 5000 }), d0.ver); }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", points: 1000 } });
  const pW = r.json.paymentId, noW = r.json.no; paidLike(pW, r.json.amount);
  r = await call("vod-pay", { body: { action: "complete", paymentId: pW } });
  const ptW0 = (await store.getDoc("vm:" + oL.mid)).v.points;
  PG[pW].onCancel = async () => { const wb = JSON.stringify({ type: "Transaction.Cancelled", data: { paymentId: pW, storeId: "store-test" } }); await call("vod-pay", { raw: wb, headers: sign(wb) }); };
  r = await call("vod-pay", { body: { action: "cancel", no: noW } });
  delete PG[pW].onCancel;
  { const oW = (await store.getDoc("vo:" + noW)).v, ptW1 = (await store.getDoc("vm:" + oL.mid)).v.points;
    ok(r.json.ok && oW.status === "refunded" && oW.refundKind === "instant" && oW.refundBy === "회원" && !oW.rfLock && oW.pointOff === 1000 && ptW1 === ptW0 + 1000,
      "웹훅이 회원 취소보다 먼저 와도 ‘회원 바로 취소’로 한 번만 기록 · 쓴 포인트 1,000은 한 번만 돌려받아요", { json: r.json, kind: oW.refundKind, by: oW.refundBy, pts: [ptW0, ptW1], off: oW.pointOff }); }
  // 포트원 취소 결과가 FAILED → 주문은 결제 완료 그대로(잠금 풀림) · REQUESTED(처리 중) → 환불로 기록하고 ‘진행 중’ 표시
  r = await call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card" } });
  const pF = r.json.paymentId, noF = r.json.no; paidLike(pF, r.json.amount);
  r = await call("vod-pay", { body: { action: "complete", paymentId: pF } });
  PG[pF].cancelSt = "FAILED";
  r = await call("vod-pay", { body: { action: "cancel", no: noF } });
  { const oF = (await store.getDoc("vo:" + noF)).v;
    ok(r.status === 502 && oF.status === "paid" && !oF.rfLock && PG[pF].status === "PAID", "포트원 취소 결과가 FAILED 면 주문은 결제 완료 그대로 · 잠금도 풀려 다시 시도할 수 있어요", { st: r.status, o: oF.status, lock: oF.rfLock }); }
  PG[pF].cancelSt = "REQUESTED";
  r = await call("vod-pay", { body: { action: "cancel", no: noF } });
  { const oF = (await store.getDoc("vo:" + noF)).v;
    ok(r.json.ok && oF.status === "refunded" && oF.pg && oF.pg.cancel && oF.pg.cancel.st === "requested", "포트원 취소가 REQUESTED(처리 중)면 환불로 기록하고 ‘취소 진행 중’으로 남겨요", oF.pg); }
  delete PG[pF].cancelSt;
  { const as41 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), vp41 = fs.readFileSync(path.join(ROOT, "api/vod-pay.js"), "utf8");
    ok(/const vdRfLate = \(snapAt, o\) => snapAt != null && Number\(o\.refundedAt\) > snapAt;/.test(as41) && (as41.match(/vdRfLate\(frozen\.has\(o\.id\) \? frozen\.get\(o\.id\) : null, o\)/g) || []).length === 2 && /frozen\.set\(id, Number\(x\.confirmedAt\) \|\| 0\)/.test(as41) && /frozen\.set\(x, Number\(r\.at\) \|\| 0\)/.test(as41),
      "정산: 확정한 명세서에 들어간 주문은 확정한 ‘뒤’ 환불만 환불한 달에서 차감해요 (강사 정산 · RS 정산 같은 규칙 — 확정 전 부분 환불이 두 번 빠지지 않게)");
    ok(/let did = false;/.test(vp41) && /if \(!did\) return next;/.test(vp41) && /async function syncCancelled\(nos, why\)/.test(vp41) && (vp41.match(/await syncCancelled\(/g) || []).length === 2 && /pill\(o\.method === "vbank" \? "가상계좌 환불 진행 중" : "포트원 취소 진행 중", "warn"\)/.test(as41),
      "환불 뒤처리는 이번 호출이 바꿨을 때만 · 포트원 조회 · 웹훅은 같은 맞추기 함수 · 진행 중인 포트원 취소는 마스터 화면에 ‘진행 중’"); }

  console.log("5) 마스터 부분 환불 · 웹훅");
  jar.dc_a = auth.sign({ r: "master" });
  r = await call("vod-pay", { body: { action: "refund", no: no1, amount: 30000, reason: "수강 불만족" } });
  ok(r.json.ok && PG[p1].lastCancel.amount === 30000 && r.json.order.refundKind === "partial", "부분 환불 30,000원 → 포트원에 그 금액만 취소", r.json);
  delete jar.dc_a;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v12", kind: "course", method: "card", expect: 49000 } });
  const p3 = r.json.paymentId; paidLike(p3, 49000);
  const wb = JSON.stringify({ type: "Transaction.Paid", data: { paymentId: p3, storeId: "store-test" } });
  r = await call("vod-pay", { raw: wb, headers: Object.assign(sign(wb), { "webhook-signature": "v1,AAAA" }) });
  ok(r.status === 401, "서명이 틀린 웹훅은 거절");
  r = await call("vod-pay", { raw: wb, headers: sign(wb) });
  ok(r.status === 200, "서명이 맞는 웹훅 받기");
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.paymentId === p3).status === "paid", "웹훅만 와도 결제 완료 (휴대폰에서 창을 닫은 경우)");
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
    settings: { reviewPoint: 500, bank: "국민은행", account: "123-45", holder: "(주)두고홀딩스" }, coupons: [], members: [{ id: "leak", email: "leak@x.com" }], crm: { secret: 1 } };
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
  const sec = process.env.PORTONE_API_SECRET; delete process.env.PORTONE_API_SECRET;
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, method: "card", expect: 65000 } });
  ok(r.status === 409 && /PG/.test(r.json.message), "포트원 키가 없으면 카드 결제 막기 (가짜 결제 없음)", r.json);
  process.env.PORTONE_API_SECRET = sec;
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
  r = await sync([{ k: "vpl:p1", base: 0, put: { id: "p1", pid: "v5", nick: "나OO", text: "매일 1편!" } }]);

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
    r = await call("vod-pay", { body: { action: "cancel", no: b15, refundAccount: { bank: "KAKAO", number: "3333-01-1234567", holder: "나OO" } } });
    const o15 = (await store.getDoc("vo:" + b15)).v;
    ok(r.json.ok && r.json.way === "bank" && o15.status === "refunded" && o15.refundKind === "instant" && o15.refundBy === "회원" && o15.refundPay && o15.refundPay.st === "wait" && o15.refundPay.bank === "KAKAO" && o15.refundPay.number === "3333011234567" && o15.refundPay.holder === "나OO" && o15.refundPay.amount === o15.amount && !o15.rfLock && calls.filter((c) => /\/cancel$/.test(c)).length === cx0,
      "무통장 바로 취소: 주문 환불 + 계좌 송금 대기(은행 · 숫자만 계좌 · 예금주 · 금액) · 포트원은 부르지 않아요", { json: r.json, rp: o15.refundPay }); }
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
  const ran2 = await require(path.join(TMP, "class/api/_lib/init.js")).runPendingOps();
  ok(!ran2.length, "다음 배포 때는 다시 돌지 않아요", ran2);
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
  const mt4 = docOf(j, "meta"); mt4.vod.settings = Object.assign({}, mt4.vod.settings, { bank: "국민은행", account: "123-456", holder: "(주)두고홀딩스" });
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

  console.log("\n가상계좌 · 계좌이체 · 환불 계좌 · 포트원 결제 조회");
  const MASTER = auth.sign({ r: "master" });
  process.env.PORTONE_VBANK = "1"; process.env.PORTONE_TRANSFER = "1";
  r = await call("vod-config", { method: "GET" });
  ok(r.json.cfg.portone.channels.vbank === "channel-key-card" && r.json.cfg.portone.channels.transfer === "channel-key-card" && r.json.cfg.portone.vbankHours === 72, "설정: PORTONE_VBANK · PORTONE_TRANSFER=1 → 카드 채널로 가상계좌 · 계좌이체", r.json.cfg.portone);
  delete process.env.PORTONE_VBANK;
  r = await call("vod-config", { method: "GET" });
  ok(!r.json.cfg.portone.channels.vbank, "설정을 빼면 가상계좌는 다시 닫혀요");
  delete jar.dc_v; delete jar.dc_a;
  await store.rlClear(["vip:1.2.3.4"]); // 같은 IP 로 가입을 여러 번 해서
  r = await call("vod-auth", { body: { action: "signup", email: "va@example.com", pw: "test1234a", pw2: "test1234a", name: "가상OO", phone: "010-0000-7777", agree: true } });
  ok(r.json.ok && r.json.member, "가상계좌 테스트 회원 가입", r.json);
  const vaMid = r.json.member.id;
  { const vc = jar.dc_v; delete jar.dc_v; jar.dc_a = MASTER; const jm = await boot(); await sync([{ k: "vm:" + vaMid, base: verOf(jm, "vm:" + vaMid), ops: [{ p: ["points"], v: 3000 }] }]); delete jar.dc_a; jar.dc_v = vc; }
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, points: 1000, method: "vbank" } });
  ok(r.status === 409, "가상계좌가 닫혀 있으면 결제 준비 거절", r.json);
  process.env.PORTONE_VBANK = "1";
  r = await call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, points: 1000, method: "vbank" } });
  ok(r.json.ok && r.json.paymentId && r.json.amount > 0, "가상계좌 결제 준비 (포인트 1,000 사용)", r.json);
  const vaP = r.json.paymentId, vaN = r.json.no, vaAmt = r.json.amount, VA_EXP = "2026-11-02T23:59:59+09:00";
  PG[vaP] = { id: vaP, status: "VIRTUAL_ACCOUNT_ISSUED", storeId: "store-test", transactionId: "tx_" + vaP, currency: "KRW", amount: { total: vaAmt, paid: 0, cancelled: 0 }, method: { type: "PaymentMethodVirtualAccount", bank: "SHINHAN", accountNumber: "56211234567890", remitteeName: "(주)두고홀딩스", expiredAt: VA_EXP } };
  r = await call("vod-pay", { body: { action: "complete", paymentId: vaP } });
  const vaO0 = (r.json.orders || [])[0] || {};
  ok(r.json.ok && r.json.vbank && vaO0.status === "pending" && vaO0.method === "vbank" && vaO0.vbank.account === "56211234567890" && vaO0.vbank.bank === "SHINHAN" && vaO0.dueAt === Date.parse(VA_EXP), "발급 → 입금 대기 · 은행 · 계좌 · 입금 기한(포트원 만료 시각)", r.json);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === 2000, "발급 때 포인트를 써 둬요 (다른 주문에 또 못 써요)", r.json.member.points);
  r = await call("vod-pay", { body: { action: "complete", paymentId: vaP } });
  ok(r.json.ok && r.json.vbank, "발급 확인이 두 번 와도 그대로");
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "bankOk", no: vaN } });
  ok(r.status === 409 && /자동/.test(r.json.message), "가상계좌는 마스터가 직접 입금 확인 못 해요 (포트원이 알려 줘요)", r.json);
  delete jar.dc_a;
  const vaWi = JSON.stringify({ type: "Transaction.VirtualAccountIssued", data: { paymentId: vaP, storeId: "store-test" } });
  r = await call("vod-pay", { raw: vaWi, headers: sign(vaWi) });
  ok(r.status === 200, "가상계좌 발급 웹훅 받기");
  Object.assign(PG[vaP], { status: "PAID", receiptUrl: "https://r/" + vaP }); PG[vaP].amount.paid = vaAmt;
  const vaWp = JSON.stringify({ type: "Transaction.Paid", data: { paymentId: vaP, storeId: "store-test" } });
  r = await call("vod-pay", { raw: vaWp, headers: sign(vaWp) });
  r = await call("vod-pay", { body: { action: "orders" } });
  const vaO = r.json.orders.find((o) => o.no === vaN);
  ok(vaO.status === "paid" && vaO.pg.st === "paid" && vaO.vbank && vaO.paidAt > 0 && vaO.pg.receiptUrl === "https://r/" + vaP, "입금 웹훅 → 결제 완료 (계좌 정보 · 영수증 남김)", vaO);
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === 2000, "입금돼도 포인트는 한 번만 빠져요", r.json.member.points);
  r = await call("vod-pay", { body: { action: "cancel", no: vaN } });
  ok(r.status === 400 && /계좌/.test(r.json.message) && (await store.getDoc("vo:" + vaN)).v.status === "paid", "가상계좌 바로 취소: 환불 받을 계좌가 없으면 막아요 (주문은 그대로)", r.json);
  { r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "vbank" } });
    const vq = r.json.paymentId, vqN = r.json.no, vqA = r.json.amount;
    PG[vq] = { id: vq, status: "PAID", storeId: "store-test", transactionId: "tx_" + vq, currency: "KRW", amount: { total: vqA, paid: vqA, cancelled: 0 }, method: { type: "PaymentMethodVirtualAccount", bank: "KAKAO", accountNumber: "7979000000009", remitteeName: "두고" }, receiptUrl: "https://r/" + vq };
    r = await call("vod-pay", { body: { action: "complete", paymentId: vq } });
    r = await call("vod-pay", { body: { action: "cancel", no: vqN, refundAccount: { bank: "TOSS", number: "1000-1234-5678", holder: "가상OO" } } });
    const ra = (PG[vq].lastCancel || {}).refundAccount || {};
    ok(r.json.ok && r.json.way === "vbank" && PG[vq].status === "CANCELLED" && ra.bank === "TOSS" && ra.number === "100012345678" && ra.holderName === "가상OO" && (await store.getDoc("vo:" + vqN)).v.status === "refunded", "가상계좌 바로 취소: 적은 환불 계좌로 포트원이 돌려줘요 (은행 · 숫자만 계좌 · 예금주)", { json: r.json, ra }); }
  let vaJ = await boot();
  r = await sync([{ k: "vo:" + vaN, base: verOf(vaJ, "vo:" + vaN), ops: [{ p: ["refundReq"], v: { why: "단순 변심", text: "", acct: { bank: "KOOKMIN", number: "123-456-78901", holder: "가상OO", evil: "x" } } }] }]);
  vaJ = await boot();
  const vaRq = (docOf(vaJ, "vo:" + vaN) || {}).refundReq || {};
  ok(vaRq.acct && vaRq.acct.bank === "KOOKMIN" && vaRq.acct.number === "12345678901" && vaRq.acct.holder === "가상OO" && !vaRq.acct.evil, "회원 환불 요청: 돌려받을 계좌 (숫자만 · 다른 칸은 버림)", vaRq);
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심" } });
  ok(r.status === 400 && /계좌/.test(r.json.message), "가상계좌 환불: 환불 계좌가 없으면 거절", r.json);
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심", refundAccount: { bank: "NOPE", number: "123", holder: "" } } });
  ok(r.status === 400, "가상계좌 환불: 이상한 계좌는 거절");
  r = await call("vod-pay", { body: { action: "refund", no: vaN, amount: vaAmt, reason: "단순 변심", refundAccount: vaRq.acct } });
  const vaLc = PG[vaP].lastCancel || {};
  ok(r.json.ok && vaLc.amount === vaAmt && vaLc.refundAccount && vaLc.refundAccount.bank === "KOOKMIN" && vaLc.refundAccount.number === "12345678901" && vaLc.refundAccount.holderName === "가상OO" && r.json.order.status === "refunded", "가상계좌 환불: 포트원에 환불 계좌(표준 은행 코드 · 예금주)로 원클릭 취소", { r: r.json, vaLc });
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN } });
  ok(r.json.ok && r.json.pay.status === "CANCELLED" && r.json.pay.method.type === "vbank" && r.json.pay.method.account === "56211234567890" && r.json.pay.amount.cancelled === vaAmt && r.json.pay.receiptUrl, "포트원 결제 조회: 상태 · 결제수단(가상계좌) · 취소 금액 · 영수증", r.json);
  delete jar.dc_a;
  // 입금 전 주문 취소 → 포트원 가상계좌 말소
  r = await call("vod-auth", { body: { action: "me" } });
  const vaPt0 = r.json.member.points;
  ok(vaPt0 === 3000, "가상계좌 전액 환불 → 써 둔 포인트 1,000을 돌려받아요 (환불 규정)", vaPt0);
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, points: 500, method: "vbank" } });
  const vaP2 = r.json.paymentId, vaN2 = r.json.no;
  PG[vaP2] = { id: vaP2, status: "VIRTUAL_ACCOUNT_ISSUED", storeId: "store-test", transactionId: "tx_" + vaP2, currency: "KRW", amount: { total: r.json.amount, paid: 0, cancelled: 0 }, method: { type: "PaymentMethodVirtualAccount", bank: "WOORI", accountNumber: "1002000000001", remitteeName: "두고", expiredAt: VA_EXP } };
  r = await call("vod-pay", { body: { action: "complete", paymentId: vaP2 } });
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === vaPt0 - 500, "두 번째 가상계좌: 발급 때 포인트 500을 써 둬요", r.json.member.points);
  r = await call("vod-pay", { body: { action: "cancelPending", no: vaN2 } });
  r = await call("vod-pay", { body: { action: "orders" } });
  ok(r.json.orders.find((o) => o.no === vaN2).status === "canceled" && PG[vaP2].closed && calls.indexOf("POST api.portone.io/payments/" + vaP2 + "/virtual-account/close") >= 0, "입금 전 취소 → 주문 취소 · 포트원 가상계좌 말소 (취소 뒤 입금 안 되게)");
  r = await call("vod-auth", { body: { action: "me" } });
  ok(r.json.member.points === vaPt0, "입금 전 취소하면 써 둔 포인트 500을 돌려받아요", r.json.member.points);
  // 실시간 계좌이체: 카드처럼 바로 결제 완료
  r = await call("vod-pay", { body: { action: "prepare", pid: "v6", kind: "course", plan: 180, method: "transfer" } });
  const vaPt = r.json.paymentId, vaNt = r.json.no; paidLike(vaPt, r.json.amount); PG[vaPt].method = { type: "PaymentMethodTransfer", bank: "KAKAO" };
  r = await call("vod-pay", { body: { action: "complete", paymentId: vaPt } });
  ok(r.json.ok && r.json.orders[0].status === "paid" && r.json.orders[0].method === "transfer", "실시간 계좌이체 → 바로 결제 완료", r.json);
  // 포트원 콘솔에서 직접 취소한 결제 (웹훅을 놓친 경우) → 결제 조회로 맞춰요
  PG[vaPt].status = "CANCELLED"; PG[vaPt].amount.cancelled = PG[vaPt].amount.total;
  jar.dc_a = MASTER;
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaNt } });
  ok(r.json.ok && /환불로 맞췄어요/.test(r.json.synced) && r.json.pay.method.type === "transfer", "결제 조회: 포트원은 취소인데 주문이 결제 완료면 환불로 맞춰요", r.json);
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN2 } });
  ok(r.json.ok && r.json.pay.status === "VIRTUAL_ACCOUNT_ISSUED" && !r.json.synced, "결제 조회: 취소한 가상계좌 주문은 그대로", r.json);
  // 취소를 누른 순간 이미 입금됐으면 (가상계좌 말소가 거절돼요) 취소하지 않고 결제 완료로 — 회원 취소 · 마스터 취소 둘 다
  const vaRace = async (pid, how) => {
    let q = await call("vod-pay", { body: { action: "prepare", pid, kind: "course", plan: 180, method: "vbank" } });
    const p = q.json.paymentId, no = q.json.no, amt = q.json.amount;
    PG[p] = { id: p, status: "VIRTUAL_ACCOUNT_ISSUED", storeId: "store-test", transactionId: "tx_" + p, currency: "KRW", amount: { total: amt, paid: 0, cancelled: 0 }, method: { type: "PaymentMethodVirtualAccount", bank: "KAKAO", accountNumber: "7979000000001", remitteeName: "두고", expiredAt: VA_EXP } };
    await call("vod-pay", { body: { action: "complete", paymentId: p } });
    Object.assign(PG[p], { status: "PAID", amount: { total: amt, paid: amt, cancelled: 0 } }); // 웹훅이 오기 전에 입금
    q = how === "member" ? await call("vod-pay", { body: { action: "cancelPending", no } }) : await call("vod-pay", { body: { action: "bankCancel", no } });
    const d = await store.getDoc("vo:" + no); return { q, o: (d && d.v) || {} };
  };
  let vr = await vaRace("v6", "member");
  ok(vr.q.status === 409 && /입금이 확인돼/.test(vr.q.json.message) && vr.o.status === "paid" && !PG[vr.o.paymentId].closed, "회원 입금 전 취소 · 그 사이 입금됨 → 취소하지 않고 결제 완료로 (수강 열림)", { q: vr.q.json, st: vr.o.status });
  vr = await vaRace("v5", "master");
  ok(vr.q.status === 409 && /입금이 확인돼/.test(vr.q.json.message) && vr.o.status === "paid", "마스터 입금 전 취소 · 그 사이 입금됨 → 취소하지 않고 결제 완료로", { q: vr.q.json, st: vr.o.status });
  delete jar.dc_a; delete jar.dc_v;
  r = await call("vod-pay", { body: { action: "pgInfo", no: vaN } });
  ok(r.status === 403, "결제 조회는 마스터만");
  delete process.env.PORTONE_VBANK; delete process.env.PORTONE_TRANSFER;

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
  r = await call("vod-pay", { body: { action: "complete", paymentId: bp1 } });
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
  ok(r.json.ok && r.json.amount === 31800 && bo.status === "refunded" && PG[bp1].status === "CANCELLED", "보내기 전이면 회원이 바로 전액 취소 (포트원 결제 취소)", r.json);
  ok((((await store.getDoc("vstat")).v.sold) || {}).b1 === 0, "취소하면 판매 권수도 빠져요", (await store.getDoc("vstat")).v.sold);
  // 다시 주문 → 마스터가 상품 준비 중 → 회원 바로 취소 막기 · 배송지 못 바꿈
  r = await call("vod-pay", { body: { action: "prepare", pid: "b1", kind: "course", qty: 1, method: "card", ship: SHIP, expect: 15900 } });
  const bp2 = r.json.paymentId, bno2 = r.json.no; paidLike(bp2, 15900); await call("vod-pay", { body: { action: "complete", paymentId: bp2 } });
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
  const ep = r.json.paymentId, eno = r.json.no; paidLike(ep, 29000); await call("vod-pay", { body: { action: "complete", paymentId: ep } });
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
    ok(d.source === "partners" && d.ref === "ab_c.1" && d.form && d.form.nick === "지OO스토어" && d.form.topic.length === 80 && d.form.kinds.join("|") === "VOD 강의|전자책 · 종이책|7" && d.form.link2 === "https://blog.example.com" && !("evil" in d.form) && !("iid" in d.form) && !d.iid && d.link === "https://example.com/ch" && d.status === "new" && /노하우/.test(d.course), "지원서 칸: 정해 둔 칸 · 길이만 · 주소엔 https:// · 모르는 칸은 버려요", d);
    ok(d.form && d.form.ctime === "저녁 (6시 이후)" && d.form.career === "2019 창업\n\n지금 2개 브랜드" && d.form.curri.length === 1500 && d.form.reach === "1천~1만 명" && d.form.target === "직장인" && d.form.film === "직접 찍어서 보낼게요" && d.form.price === "상담하며 정할게요", "구글폼 지원서 새 칸: 연락 시간 · 강사 소개(줄바꿈 유지) · 커리큘럼(1,500자) · 채널 규모 · 수강 대상 · 촬영 · 판매가", d.form);
    r = await call("public", { body: Object.assign({}, base, { email: "pt2@example.com", source: "hack", form: { nick: "x" }, ref: "bad ref!" }) });
    const d2 = (await inqs()).find((x) => x.email === "pt2@example.com") || {};
    ok(r.json.ok && !("source" in d2) && !("form" in d2) && !("ref" in d2), "모르는 source · 다른 출처의 form · 이상한 추천 코드는 저장하지 않아요", d2);
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
    ok(after.CLASS_LEGAL_NOTICE === null && /^시행일: 2026년 11월 10일/.test(at) && at.indexOf("개정 안내") < 0 && at.indexOf("180일 · 365일 · 3년") < 0 && at.indexOf("(수강권 · 연장권)") < 0 && at.indexOf("연장권을 사면") < 0 && /"재수강"이란/.test(at) && /재수강 할인을 적용할 수 있으며/.test(at) && /구매한 연장권은 구매할 때 안내한 기간 그대로/.test(at) && /카카오 알림톡 · 문자 등으로 알릴 수 있습니다/.test(at) && /이 약관은 2026년 11월 10일부터 시행합니다/.test(at), "시행일부터: 새 약관만 (6개월 · 12개월 · 재수강 · 이미 산 연장권 유지 · 업데이트 안내 · 부칙)", at.slice(0, 80));
    ok(/^시행일: 2026년 11월 10일/.test(ap) && /두고 파트너스 지원자/.test(ap) && /누리고 주식회사\(솔라피\)/.test(ap) && /구매한 강의의 업데이트 안내/.test(ap) && ap.indexOf("2026년 11월 10일부터 적용되며") > 0 && after.CLASS_LEGAL.refund[1] === before.CLASS_LEGAL.refund[1], "개인정보처리방침: 지원서 항목 · 업데이트 안내 · 발송 위탁 (환불정책은 그대로)", ap.slice(0, 80));
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
    ok(/IDLE = \{ admin: 30 \* 60e3, student: 60 \* 60e3 \}/.test(mj24) && /action: "logout", which: "admin"/.test(mj24) && /post\("vod-auth", \{ action: "logout" \}\)/.test(mj24) && /\^#\\\/center/.test(mj24),
      "자동 로그아웃: 강사센터 30분 무동작 · 수강생/회원 60분 자리 비움 → 서버 쿠키까지 로그아웃 (강사센터 밖 탭은 새로 고치지 않아요)");
    ok(/!\/\^#\\\/center\/\.test\(ROUTE\.hash\)/.test(mj24) && !/\.test\(location\.hash\)\) o\.admin = false/.test(mj24), "자동 로그아웃: 강사센터 화면인지는 ROUTE.hash 로 봐요 (운영의 깨끗한 주소 /center/… 에서도 켜 둔 화면이 30분 뒤 로그아웃)");
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
  }

  {
    console.log("26) 공용 모듈: 정산 계산 (화면 vod.js · admin.js · 서버 media.js 가 같은 규칙 · Next.js 전환 2단계)");
    const ST = require(path.join(ROOT, "shared/settle.js")), MD26 = require(path.join(TMP, "class/api/_lib/media.js"));
    // 1,000만 원 판매(카드 3.3%) · RS 없음 · 강사 50% → 정산 기준액 · 정산액
    const o1 = { amount: 10000000, sale: 10000000, method: "card", kind: "course" };
    ok(ST.pgFeeOf({}, o1) === 330000 && ST.insBase({}, o1) === 9670000 && ST.insAmt({}, o1, 50) === 4835000 && ST.pgFeeOf({ card: { pct: 2.5 } }, o1) === 250000 && ST.pgFeeOf({}, { amount: 9900, method: "vbank" }) === 300 && ST.pgFeeOf({}, { amount: 9900, method: "point" }) === 0,
      "PG 수수료: 카드 3.3% · 마스터가 정한 2.5% · 가상계좌 건당 300원 · 포인트 결제 0원 → 강사 정산액 = (판매가 − 수수료) × 50%");
    const o2 = { amount: 330000, sale: 330000, method: "bank", kind: "course", rs: { pg: 5, rate: 20 } };
    ok(ST.rsOf(o2) === 62700 && ST.insBase({}, o2) === 267300 && ST.rsOf(Object.assign({}, o2, { kind: "coach" })) === 0,
      "온드미디어 RS = 330,000 × 95% × 20% = 62,700원을 먼저 빼고 · 코칭권은 RS 없음");
    const b = ST.payout(2500000, true, "std", 0), pp = ST.payout(2500000, false, "std", 0);
    ok(b.pay === 2500000 && b.invIns === 2500000 && pp.sup === 2272727 && pp.wh === 74990 && pp.pay === 2197737 && ST.payout(-1000, false, "std", 0).pay === 0,
      "지급액: 사업자 250만 원 그대로(세금계산서 250만 원) · 개인 250만 ÷ 1.1 = 2,272,727 − 3.3% 74,990(10원 아래 버림) → 2,197,737원 · 마이너스면 0원", [b, pp]);
    ok(ST.keepOf({ status: "refunded", amount: 100000, refundAmount: 30000 }) === 0.7 && ST.keepOf({ status: "paid" }) === 1 && ST.refundRatio({ amount: 100000, refundAmount: 30000 }) === 0.3,
      "부분 환불: 정산에 70% 남김 · 확정 뒤 환불은 30% 차감");
    ok(MD26.rateOf({ subs: 120000 }, MD26.rules({})) === 20 && MD26.rateOf({ subs: 5000 }, MD26.rules({})) === 10 && MD26.rateOf({ rate: 15 }, MD26.rules({})) === 15 && MD26.codeOf("Doo-Go_MD!") === "doogomd" && MD26.rules({ vod: { settings: { rs: { pg: 50 } } } }).pg === 5,
      "서버 RS 규칙(공용 모듈): 구독자 10만 이상 20% · 미만 10% · 직접 정한 15% · 링크 코드 정리 · 범위 밖 값은 기본값");
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
    const hd = PM.doinggoPage(html), dgT = (fs.readFileSync(path.join(ROOT, "home.js"), "utf8").match(/document\.title = "(두잉고 \| [^"]+)"; \/\/ index\.html/) || [])[1];
    ok(dgT && hd.indexOf("<title>" + dgT + "</title>") >= 0 && /<link rel="canonical" href="https:\/\/www\.doogoclass\.com\/doinggo" \/>/.test(hd) && /og:image" content="https:\/\/www\.doogoclass\.com\/assets\/home\/og-doinggo\.jpg"/.test(hd) && /og:image:width" content="1200"/.test(hd) && fs.existsSync(path.join(ROOT, "assets/home/og-doinggo.jpg")) && noMain(hd) === app0 && /<h1>강의는 강사님이, 운영은 두잉고가<\/h1>/.test(hd),
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
    // 화면: 하루 잠금 안내 문구 · 마스터 강사 목록의 ‘처음 데이터 숫자 그대로’ 표시
    const app30 = fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), adm30 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    const fnSrc = (adm30.match(/  function seedLoginWarn\(x\) \{[\s\S]*?\n  \}\n/) || [])[0] || "";
    const warn = new Function("window", "esc", "icon", fnSrc + "\nreturn seedLoginWarn;")({ CLASS_SEED: { instructors: [{ id: "a", name: "가 나", phone4: "1234", coaches: [{ name: "코치", phone4: "5678" }] }] } }, (x) => String(x), () => "");
    const w1 = warn({ id: "a", name: "가나", phone4: "1234", coaches: [{ name: "코치", phone4: "5678", status: "active" }] }), w2 = warn({ id: "a", name: "가나", phone4: "9999", coaches: [{ name: "코치", phone4: "0001" }] }), w3 = warn({ id: "b", name: "가나", phone4: "1234" }), w4 = warn({ id: "a", name: "가나", phone4: "9999", coaches: [{ name: "코 치", phone4: "5678" }] });
    ok(/"locked-day": "오늘 여러 번 틀려서/.test(app30) && /"locked-day": "오늘 여러 번 틀려서/.test(adm30) && /seedLoginWarn\(x\) \+ esc\(x\.name\)/.test(adm30) && /처음 데이터 숫자 그대로 · 강사 로그인 · 코치 1명/.test(w1) && w2 === "" && w3 === "" && /코치 1명/.test(w4) && !/1234|5678/.test(w1 + w4),
      "화면: 하루 잠금 안내(수강생 · 강사센터) · 마스터 강사 목록에 처음 데이터 숫자 그대로인 강사 · 코치 표시 (숫자는 안 보여요)");
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
    console.log("32) 포트원 연결 확인 (배포 빌드 기록 · 4단계 4-2 결제 시험 환경)");
    const PO = require(path.join(TMP, "class/api/_lib/portone.js"));
    const keep = { s: process.env.PORTONE_STORE_ID, a: process.env.PORTONE_API_SECRET, c: process.env.PORTONE_CHANNEL_CARD };
    const c1 = await PO.check();
    process.env.PORTONE_API_SECRET = "wrong-secret";
    const c2 = await PO.check();
    delete process.env.PORTONE_API_SECRET;
    const c3 = await PO.check();
    process.env.PORTONE_STORE_ID = keep.s; process.env.PORTONE_API_SECRET = keep.a; if (keep.c !== undefined) process.env.PORTONE_CHANNEL_CARD = keep.c;
    const bsrc = fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8");
    ok(c1.ok === true && c1.channels.indexOf("card") >= 0 && c2.ok === false && c2.why === "unauthorized" && c3.why === "off" && !JSON.stringify([c1, c2, c3]).includes("ps-test") && /require\("\.\.\/api\/_lib\/portone"\)\.check\(\)/.test(bsrc) && /빌드는 멈추지 않아요/.test(bsrc),
      "맞는 Secret → 결제 없음(404)이라 연결 확인 · 틀린 Secret → 인증 실패 · 키 없음 → off · 키 값은 결과에 없어요 · 배포 빌드가 기록만 해요(멈추지 않음)");
  }

  {
    console.log("33) 결제 대조: 주문 ↔ 포트원 결제 (배포 빌드 기록 · 읽기만 · 4단계 4-2)");
    const PA = require(path.join(TMP, "class/api/_lib/payaudit.js"));
    const O = (status, amount, extra) => Object.assign({ no: "DC1", method: "card", status, amount, paymentId: "p1" }, extra || {});
    const P = (status, total, cancelled) => ({ status, storeId: process.env.PORTONE_STORE_ID, amount: { total, paid: total, cancelled: cancelled || 0 } });
    const cases = [
      [[O("paid", 10000)], P("PAID", 10000), "ok"],
      [[O("paid", 10000), O("paid", 5000, { no: "DC2" })], P("PAID", 15000), "ok"],
      [[O("refunded", 10000, { refundAmount: 10000 })], P("CANCELLED", 10000, 10000), "ok"],
      [[O("refunded", 10000, { refundAmount: 3000 })], P("PARTIAL_CANCELLED", 10000, 3000), "ok"],
      [[O("pending", 10000, { method: "vbank" })], P("VIRTUAL_ACCOUNT_ISSUED", 10000), "ok"],
      [[O("ready", 10000)], null, "open"], [[O("failed", 10000)], null, "open"], [[O("failed", 10000)], P("FAILED", 10000), "open"],
      [[O("paid", 10000)], P("PAID", 9000), "bad"], [[O("paid", 10000)], P("CANCELLED", 10000, 10000), "bad"], [[O("ready", 10000)], P("PAID", 10000), "bad"],
      [[O("paid", 10000)], null, "bad"], [[O("refunded", 10000, { refundAmount: 3000 })], P("PARTIAL_CANCELLED", 10000, 5000), "bad"], [[O("paid", 10000)], Object.assign(P("PAID", 10000), { storeId: "store-other" }), "bad"],
      [[O("canceled", 10000, { method: "vbank" })], Object.assign(P("VIRTUAL_ACCOUNT_ISSUED", 10000), { amount: { total: 10000, paid: 0 } }), "ok"], [[O("canceled", 10000, { method: "vbank" })], Object.assign(P("CANCELLED", 10000), { amount: { total: 10000, paid: 0, cancelled: 0 } }), "ok"], [[O("canceled", 10000, { method: "vbank" })], P("PAID", 10000), "bad"]
    ];
    const got = cases.map((c) => PA.judge(c[0], c[1]).verdict);
    ok(got.every((v, i) => v === cases[i][2]), "판정: 결제 완료 · 묶음 결제 · 전액 · 부분 취소 · 가상계좌 대기 · 입금 전 취소 = 맞음 / 창만 연 결제 = 안 끝남 / 금액 · 취소 금액 · 상태 · 상점이 다르거나 취소 뒤 입금되면 확인 필요 (" + cases.length + "가지)", got);
    const au = await PA.audit(50);
    const txt = JSON.stringify(au);
    ok(au.checked > 0 && au.rows.every((r) => Object.keys(r).every((k) => ["no", "method", "status", "amount", "pg", "verdict", "why"].indexOf(k) >= 0)) && !/@example\.com|010-|pwHash|ps-test/.test(txt) && au.bad === 0 && au.ok >= 10 && /payaudit"\)\.audit\(30\)/.test(fs.readFileSync(path.join(ROOT, "scripts/db-build.js"), "utf8")),
      "대조 결과에는 주문 번호 · 결제수단 · 상태 · 금액만 (이름 · 연락처 · 키 없음) · 배포 빌드가 최근 30건을 기록 (" + au.checked + "건 · 맞음 " + au.ok + " · 안 끝남 " + au.open + " · 확인 필요 " + au.bad + ")");
    // 화면: 결제를 끝내지 않은 주문(ready) · 결제가 안 된 주문(failed) — 예전에는 ‘결제 완료’로 보였어요
    const vj33 = fs.readFileSync(path.join(ROOT, "vod.js"), "utf8"), aj33 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8");
    ok(/const NOT_ORDER = \{ ready: 1, failed: 1 \};/.test(vj33) && /orders = v\.orders\.filter\(\(o\) => o\.mid === m\.id && !NOT_ORDER\[o\.status\]\)/.test(vj33) && /ready: \["결제 안 끝남", "mute"\], failed: \["결제 안 됨", "mute"\] \};/.test(vj33) &&
      /const VD_OST = \{[^;]*ready: \["결제 안 끝남", "mute"\], failed: \["결제 안 됨", "mute"\] \};/.test(aj33) && /o\.ship && o\.status !== "failed" && o\.status !== "ready"/.test(aj33),
      "화면: 결제를 끝내지 않은 · 결제가 안 된 카드 주문은 회원 주문 내역 · 배송 조회에서 빼고, 마스터 주문 목록에는 ‘결제 안 끝남 · 결제 안 됨’으로 (예전엔 ‘결제 완료’로 보였어요)");
  }

  {
    console.log("34) 포트원 결제 주문: 화면 저장(sync)으로는 결제 · 환불 상태를 못 바꿔요 · 환불은 포트원 취소를 거쳐서만 (2026-11-04 시험 결제에서 찾음)");
    const st34 = require(path.join(TMP, "class/api/_lib/store.js"));
    const t34 = String(Date.now()).slice(-6), mid = "vm-pgl" + t34, no = "DC261104" + t34, no2 = "DC261105" + t34, no3 = "DC261106" + t34, pid = "pay-pgl-" + t34, pid2 = "pay-pgl2-" + t34;
    const base34 = { mid, pid: "v5", kind: "course", days: 365, title: "카드 결제 시험", list: 5000, sale: 5000, amount: 5000, method: "card", ch: "web", createdAt: Date.now(), at: Date.now() };
    await st34.writeDoc("vm:" + mid, { id: mid, name: "결OO", email: "pgl" + t34 + "@example.com", orderNos: [no, no2, no3], coupons: [], points: 0 }, null);
    paidLike(pid, 5000);
    await st34.writeDoc("vo:" + no, Object.assign({ id: "vo-" + no, no, status: "paid", paidAt: Date.now(), paymentId: pid, pg: { st: "paid", paymentId: pid, txId: "tx_" + pid } }, base34), null);
    await st34.writeDoc("vo:" + no2, Object.assign({ id: "vo-" + no2, no: no2, status: "ready", paymentId: pid2 }, base34), null);
    await st34.writeDoc("vo:" + no3, Object.assign({ id: "vo-" + no3, no: no3, status: "paid", paidAt: Date.now(), pg: { st: "mock", at: Date.now() } }, base34), null);
    useJar({ dc_a: auth.sign({ r: "master" }) });
    const ver34 = async (k) => (await st34.getDoc(k)).ver;
    // 예전 마스터 화면이 한 일: 포트원 취소 없이 ‘환불’로 저장 (상태 · 환불 금액 · 결제 정보를 바꿔서)
    r = await sync([{ k: "vo:" + no, base: await ver34("vo:" + no), ops: [{ p: ["status"], v: "refunded" }, { p: ["refundAmount"], v: 4290 }, { p: ["refundedAt"], v: Date.now() }, { p: ["refundKind"], v: "partial" }, { p: ["pg", "st"], v: "mock" }, { p: ["amount"], v: 1 }, { p: ["paymentId"], v: "evil" }, { p: ["refundMemo"], v: "메모는 저장돼요" }, { p: ["ship"], v: null }] }]);
    let o34 = (await st34.getDoc("vo:" + no)).v;
    ok(o34.status === "paid" && o34.refundAmount === undefined && o34.refundedAt === undefined && o34.amount === 5000 && o34.paymentId === pid && o34.pg.st === "paid" && o34.refundMemo === "메모는 저장돼요" && PG[pid].status === "PAID",
      "포트원 결제 완료 주문: 마스터 화면 저장으로 상태 · 환불 금액 · 금액 · 결제 정보는 안 바뀌고 메모 같은 다른 칸만 저장돼요", { r, o: o34 });
    r = await sync([{ k: "vo:" + no2, base: await ver34("vo:" + no2), ops: [{ p: ["status"], v: "paid" }, { p: ["paidAt"], v: Date.now() }, { p: ["pg"], v: { st: "paid" } }] }]);
    const o34b = (await st34.getDoc("vo:" + no2)).v;
    ok(o34b.status === "ready" && !o34b.paidAt && !o34b.pg, "결제창만 연 카드 주문(결제 안 끝남): 화면 저장으로 ‘결제 완료’를 만들 수 없어요 (포트원 결제 확인만)", o34b);
    r = await sync([{ k: "vo:" + no3, base: await ver34("vo:" + no3), ops: [{ p: ["status"], v: "refunded" }, { p: ["refundAmount"], v: 5000 }] }]);
    const o34c = (await st34.getDoc("vo:" + no3)).v;
    ok(o34c.status === "refunded" && o34c.refundAmount === 5000, "시안 화면의 시험 결제(pg mock · 포트원 없음)는 예전처럼 화면에서 환불 기록", o34c);
    // 포트원을 거치는 환불(/api/vod-pay refund)은 그대로
    r = await call("vod-pay", { body: { action: "refund", no, amount: 4290, reason: "시험 환불" } });
    o34 = (await st34.getDoc("vo:" + no)).v;
    ok(r.json.ok && PG[pid].lastCancel && PG[pid].lastCancel.amount === 4290 && o34.status === "refunded" && o34.refundAmount === 4290 && o34.refundKind === "partial" && o34.refundMemo === "메모는 저장돼요",
      "마스터 환불(/api/vod-pay): 포트원에 4,290원 취소 → 주문 환불 4,290원 (포트원 취소 금액과 같아요)", { r: r.json, o: o34, pg: PG[pid] });
    r = await sync([{ k: "vo:" + no, base: await ver34("vo:" + no), ops: [{ p: ["status"], v: "paid" }, { p: ["refundAmount"], v: 0 }] }]);
    o34 = (await st34.getDoc("vo:" + no)).v;
    ok(o34.status === "refunded" && o34.refundAmount === 4290, "환불한 포트원 주문도 화면 저장으로 ‘결제 완료’로 되돌릴 수 없어요", o34);
    // 화면(마스터): 포트원 결제인지는 주문 기록으로 · 강사센터를 열 때 결제 설정을 받아요
    const aj34 = fs.readFileSync(path.join(ROOT, "admin.js"), "utf8"), va34 = fs.readFileSync(path.join(ROOT, "api/_lib/vodaccess.js"), "utf8");
    ok(/const vdPgReal = \(o\) => !!\(vdSrv\(\) && vdIsPg\(o\) && \(o\.paymentId \|\| \(o\.pg \|\| \{\}\)\.paymentId\)\);/.test(aj34) && /const real = !!\(vdPgReal\(o\) && o\.pg && o\.pg\.paymentId\);/.test(aj34) && /function mount\(\) \{\s*\/\/[^\n]*\n\s*if \(window\.VOD && window\.VOD\.loadCfg\) window\.VOD\.loadCfg\(\);/.test(aj34) && !/const real = !!\(VX\(\)\.payServer/.test(aj34) &&
      /if \(K\.type === "vo"\) return \{ fix: \(o, n\) => keepServer\(o, n, isPgOrder\(o\) \? PG_LOCK : \["paymentId"\]\) \};/.test(va34),
      "화면: 마스터 환불은 결제 설정을 받았는지와 상관없이 포트원 결제 주문이면 포트원 취소를 거쳐요 · 강사센터를 열 때 결제 설정을 받아요 · 서버가 결제 칸을 잠가요");
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

  console.log("\n결과: " + pass + "개 통과 · " + failN + "개 실패");
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
