/* 온드미디어 RS 서버 테스트 — 계정(비밀번호 해시) · 로그인 · 볼 수 있는 범위 · 홍보 링크 주문 RS 기록 · 자기 정보 고치기
 *   node scripts/media-test.js   (class/ 에서) — 저장소는 임시 SQLite 파일, 포트원은 가짜 응답 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, ".."), TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mdtest-"));
fs.cpSync(path.join(ROOT, "api"), path.join(TMP, "class/api"), { recursive: true });
fs.cpSync(path.join(ROOT, "data.js"), path.join(TMP, "class/data.js")); fs.cpSync(path.join(ROOT, "db.js"), path.join(TMP, "class/db.js"));
fs.symlinkSync(path.join(ROOT, "..", "node_modules"), path.join(TMP, "node_modules"), "dir");
Object.assign(process.env, { CLASS_SQLITE: path.join(TMP, "t.db"), SESSION_SECRET: "test-session", VOD_SERVER_AUTH: "1", MASTER_PASSWORD: "master-test", PORTONE_STORE_ID: "store-test", PORTONE_API_SECRET: "ps-test", PORTONE_CHANNEL_CARD: "channel-key-card" });
const API = (n) => require(path.join(TMP, "class/api", n + ".js"));
const store = require(path.join(TMP, "class/api/_lib/store.js"));

const PG = {};
global.fetch = async (url, opt) => {
  opt = opt || {}; const u = new URL(url);
  const J = (status, j) => ({ ok: status < 300, status, json: async () => j, text: async () => JSON.stringify(j) });
  if (u.host === "api.portone.io") { const id = decodeURIComponent(u.pathname.split("/")[2] || ""); return PG[id] ? J(200, PG[id]) : J(404, { type: "PAYMENT_NOT_FOUND" }); }
  return J(404, {});
};
const paidLike = (pid, total) => { PG[pid] = { id: pid, status: "PAID", storeId: "store-test", transactionId: "tx_" + pid, currency: "KRW", amount: { total, paid: total, cancelled: 0 }, method: { type: "PaymentMethodCard" } }; };
// 쿠키 상자를 사람마다 따로 (마스터 · 온드미디어 A · B · 회원 · 강사)
function client() {
  const jar = {};
  const call = (name, { method = "POST", body, query = {} } = {}) => new Promise((done) => {
    const ck = Object.keys(jar).map((k) => k + "=" + encodeURIComponent(jar[k])).join("; ");
    const req = { method, url: "/api/" + name, query, headers: { host: "www.doogoclass.com", cookie: ck, "x-forwarded-for": "1.2.3." + Math.floor(Math.random() * 200) }, body, socket: {} };
    const hd = {}; const res = { statusCode: 200, headersSent: false, setHeader(k, v) { hd[k.toLowerCase()] = v; }, getHeader(k) { return hd[k.toLowerCase()]; },
      end(s) { [].concat(hd["set-cookie"] || []).forEach((c) => { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1)); if (v) jar[k] = v; else delete jar[k]; }); let j = null; try { j = JSON.parse(s); } catch (e) {} done({ status: this.statusCode, json: j }); } };
    API(name)(req, res);
  });
  return { jar, call, docs: async () => { const r = await call("bootstrap", { method: "GET" }); const m = {}; (r.json.docs || []).forEach((d) => { m[d[0]] = { v: d[1], ver: d[2] }; }); return { me: r.json.me, m }; } };
}
let pass = 0, failN = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log("  ✓ " + label); } else { failN++; console.log("  ✗ " + label, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ""); } };
const metaNow = async () => ((await store.getDoc("meta")) || {}).v || {};

(async () => {
  await require(path.join(TMP, "class/api/_lib/init.js")).ensureSeeded();
  const M = client(), A = client(), B = client(), U = client(), U2 = client(), I = client();

  console.log("1) 마스터 로그인 · 카탈로그");
  let r = await M.call("auth", { body: { action: "admin", tab: "master", id: "doogobiz", pw: "master-test" } });
  ok(r.json.ok && r.json.role === "master", "마스터 로그인", r.json);
  r = await M.call("vod-pay", { body: { action: "catalog", catalog: { products: [
    { id: "v5", title: "챗GPT 블로그", type: "vod", status: "on", price: 89000, sale: 59000, dg: true, iid: "choi" },
    { id: "v10", title: "전자책", type: "ebook", status: "on", price: 39000, sale: 29000, iid: "choi" },
    { id: "v13", title: "종이책", type: "book", status: "on", price: 15900, sale: 15900, shipFee: 0, iid: "moon" },
    { id: "v0", title: "무료 특강", type: "vod", status: "on", price: 0, sale: 0, iid: "choi" }],
    coupons: [], settings: { coach: { n: 5, days: 180, price: 150000 }, refund: { instant: true, days: 7, maxUsed: 0 } }, biz: {} } } });
  ok(r.json.ok, "카탈로그 저장", r.json);

  console.log("2) 마스터가 온드미디어 계정 만들기 (비밀번호는 해시로만)");
  let d = await M.docs();
  const acc = (o) => Object.assign({ rate: "", email: "", phone: "", bank: "", account: "", holder: "", memo: "운영 메모", status: "active", createdAt: Date.now() }, o);
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media"], v: [
    acc({ id: "md-a", loginId: "doogomd", pw: "테스트채널9!", code: "dgmd26", channel: "두고미디어 YouTube", subs: 128000, type: "biz" }),
    acc({ id: "md-b", loginId: "money", pw: "money123", code: "mny001", channel: "머니콘텐츠", subs: 52000, type: "person" }),
    acc({ id: "md-c", loginId: "paused1", pw: "paused123", code: "psd001", channel: "중지 채널", subs: 9000, type: "person", status: "paused" })] }] }] } });
  const res0 = r.json.results[0], back = res0.doc && res0.doc.media;
  ok(!res0.error && Array.isArray(back) && back.length === 3 && back.every((x) => x.hasPw === true && !("pw" in x) && !("pwHash" in x)), "저장 결과: 비밀번호 · 해시는 안 돌려줌 (설정됨 표시만)", res0);
  let mt = await metaNow();
  ok(mt.media.every((x) => /^s1\$/.test(x.pwHash) && !("pw" in x) && !("hasPw" in x)), "서버에는 해시만 저장", mt.media.map((x) => Object.keys(x)));
  d = await M.docs();
  ok(d.m.meta.v.media.length === 3 && d.m.meta.v.media.every((x) => !x.pwHash && x.hasPw), "마스터 화면: 계정 3개 · 해시 없음", d.m.meta.v.media);
  // 스토어 화면 데이터(meta.vod)는 마스터 화면이 저장해요 — CRM · 강사 비율 같은 운영 칸도 같이
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["vod"], v: { products: [{ id: "v5", title: "챗GPT 블로그", type: "vod", status: "on", price: 89000, sale: 59000, iid: "choi" }, { id: "v10", title: "전자책", type: "ebook", status: "on", price: 39000, sale: 29000, iid: "choi" }], settings: { payDays: 3 }, crm: { segs: [] }, insRates: { choi: { vod: 60 } }, adSpend: [] } }] }] } });
  ok(!r.json.results[0].error, "마스터: 스토어 데이터 저장", r.json.results[0]);

  console.log("3) 온드미디어 로그인 (마스터 · 파트너 탭)");
  r = await A.call("auth", { body: { action: "admin", tab: "master", id: "DOOGOMD", pw: "테스트채널9!" } });
  ok(r.json.ok && r.json.role === "media" && r.json.mdid === "md-a", "doogomd 한글 비밀번호로 로그인 (아이디 대소문자 무관)", r.json);
  const ck = A.jar.dc_a;
  delete A.jar.dc_a;
  r = await A.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "xptmxmcosjf9!" } });
  ok(r.json.ok && r.json.role === "media", "영문 자판으로 친 같은 비밀번호도 로그인", r.json);
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "wrong-pw" } });
  ok(!r.json.ok && r.json.error === "notfound", "틀린 비밀번호 거절", r.json);
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "paused1", pw: "paused123" } });
  ok(r.json.error === "paused-media", "중지된 계정은 로그인 막기", r.json);
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "money", pw: "money123" } });
  ok(r.json.ok && r.json.role === "media" && r.json.mdid === "md-b", "두 번째 계정 로그인", r.json);
  mt = await metaNow();
  ok(mt.media.find((x) => x.id === "md-a").lastLoginAt > 0, "최근 접속 시각 기록");
  ok(ck === A.jar.dc_a || !!A.jar.dc_a, "로그인 쿠키");

  console.log("4) 온드미디어가 받는 데이터 범위");
  let da = await A.docs();
  ok(da.me.admin && da.me.admin.role === "media" && da.me.admin.mdid === "md-a", "me: role media", da.me);
  const ma = da.m.meta.v;
  ok(ma.media.length === 1 && ma.media[0].id === "md-a" && !ma.media[0].pwHash && !ma.media[0].memo, "자기 계정 하나만 (비밀번호 · 운영 메모 빼고)", ma.media);
  ok(!ma.staff && !ma.affiliates && !ma.affPayouts && !ma.adminLog && !ma.billing && !ma.announcements, "운영자 · 파트너 · 입금 계좌 · 강사 공지 없음", Object.keys(ma));
  ok(ma.vod && Array.isArray(ma.vod.products) && ma.vod.products.length === 2 && !ma.vod.crm && !ma.vod.insRates && !ma.vod.adSpend, "스토어 공개 정보만 (CRM · 강사 비율 · 광고비 없음)", Object.keys(ma.vod || {}));
  ok(!Object.keys(da.m).some((k) => /^(vm|vq|vpo|stu|prog|bill|inq):/.test(k)), "회원 · 문의 · 강사 정산 · 수강생 문서 없음", Object.keys(da.m).filter((k) => !/^(ins|content|cohorts|vr|vpl):/.test(k)));

  console.log("5) 홍보 링크로 결제 → 주문에 RS 기록");
  r = await U.call("vod-auth", { body: { action: "signup", email: "buyer1@example.com", pw: "test1234a", pw2: "test1234a", name: "구매자", phone: "010-1111-2222", agree: true } });
  ok(r.json.ok, "회원 가입", r.json);
  const now = Date.now();
  r = await U.call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 365, coach: true, points: 0, method: "card", rs: { c: "DGMD26", p: "v5", at: now - 3600e3 } } });
  ok(r.json.ok, "결제 준비 (수강권 + 코칭권 · 링크 기록 포함)", r.json);
  const p1 = r.json.paymentId, no1 = r.json.no;
  let o1 = ((await store.getDoc("vo:" + no1)) || {}).v;
  ok(o1 && o1.rs && o1.rs.mid === "md-a" && o1.rs.rate === 20 && o1.rs.pg === 5 && o1.rs.code === "dgmd26" && o1.rs.ch === "두고미디어 YouTube", "수강권 주문에 RS: 두고미디어 · 구독자 10만 이상 20% · PG 5%", o1 && o1.rs);
  const pay = ((await store.getDoc("vpay:" + p1)) || {}).v, coachNo = pay.nos.find((n) => n !== no1), oc = ((await store.getDoc("vo:" + coachNo)) || {}).v;
  ok(oc && oc.kind === "coach" && !oc.rs, "함께 산 코칭권에는 RS 없음", oc);
  paidLike(p1, pay.total);
  r = await U.call("vod-pay", { body: { action: "complete", paymentId: p1 } });
  ok(r.json.ok, "결제 완료", r.json);
  o1 = ((await store.getDoc("vo:" + no1)) || {}).v;
  ok(o1.status === "paid" && o1.rs && o1.rs.mid === "md-a", "결제 완료 뒤에도 RS 그대로", o1.rs);

  r = await U2.call("vod-auth", { body: { action: "signup", email: "buyer2@example.com", pw: "test1234a", pw2: "test1234a", name: "구매둘", phone: "010-3333-4444", agree: true } });
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v10", kind: "course", method: "card", rs: { c: "mny001", p: "v10", at: now - 864e5 } } });
  let o2 = ((await store.getDoc("vo:" + r.json.no)) || {}).v;
  ok(o2.rs && o2.rs.mid === "md-b" && o2.rs.rate === 10, "전자책 · 머니콘텐츠 (구독자 10만 미만) 10%", o2.rs);
  paidLike(r.json.paymentId, r.json.amount); await U2.call("vod-pay", { body: { action: "complete", paymentId: r.json.paymentId } });
  const no2 = r.json.no;

  const noRs = async (label, body) => { const x = await U2.call("vod-pay", { body: Object.assign({ action: "prepare", kind: "course", method: "card" }, body) }); const o = x.json.ok ? ((await store.getDoc("vo:" + x.json.no)) || {}).v : null; ok(x.json.ok && o && !o.rs, label, x.json.ok ? o && o.rs : x.json); };
  await noRs("다른 강의의 링크 기록이면 RS 없음", { pid: "v5", plan: 180, rs: { c: "mny001", p: "v10", at: now } });
  await noRs("링크를 누른 지 30일이 지나면 RS 없음", { pid: "v5", plan: 180, rs: { c: "dgmd26", p: "v5", at: now - 31 * 864e5 } });
  await noRs("없는 링크 코드면 RS 없음", { pid: "v5", plan: 180, rs: { c: "nope99", p: "v5", at: now } });
  await noRs("중지된 계정 링크면 RS 없음", { pid: "v5", plan: 180, rs: { c: "psd001", p: "v5", at: now } });
  await noRs("앞으로 시각(조작)이면 RS 없음", { pid: "v5", plan: 180, rs: { c: "dgmd26", p: "v5", at: now + 3600e3 } });
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v13", kind: "course", qty: 1, method: "card", ship: { name: "구매둘", phone: "010-3333-4444", zip: "12345", addr1: "서울시 테스트로 1", addr2: "", memo: "" }, rs: { c: "dgmd26", p: "v13", at: now } } });
  o2 = r.json.ok ? ((await store.getDoc("vo:" + r.json.no)) || {}).v : null;
  ok(r.json.ok && o2 && !o2.rs, "종이책은 RS 없음", r.json.ok ? o2 && o2.rs : r.json);
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v0", kind: "course", method: "card", rs: { c: "dgmd26", p: "v0", at: now } } });
  o2 = r.json.ok && r.json.no ? ((await store.getDoc("vo:" + r.json.no)) || {}).v : null;
  ok(r.json.ok && (!o2 || !o2.rs), "무료 강의는 RS 없음", r.json.ok ? o2 && o2.rs : r.json);

  console.log("6) 세 화면이 같은 주문을 봐요 (온드미디어 · 강사 · 마스터)");
  da = await A.docs();
  const aos = Object.keys(da.m).filter((k) => /^vo:/.test(k)).map((k) => da.m[k].v);
  ok(aos.length === 1 && aos[0].no === no1, "온드미디어 A: 자기 링크 주문 1건만", aos.map((o) => o.no));
  ok(aos[0].rs && aos[0].sale > 0 && aos[0].paidAt && !("mid" in aos[0]) && !("buyer" in aos[0]) && !("method" in aos[0]) && !("share" in aos[0]) && !("pg" in aos[0]) && !("paymentId" in aos[0]), "회원 · 결제 수단 · 강사 비율 없이 판매 · RS 칸만", aos[0]);
  const db = await B.docs(), bos = Object.keys(db.m).filter((k) => /^vo:/.test(k));
  ok(bos.length === 1 && bos[0] === "vo:" + no2, "온드미디어 B: 자기 주문만 (A 주문은 안 보임)", bos);
  r = await I.call("auth", { body: { action: "admin", tab: "instructor", id: "초이", pw: "2222" } });
  ok(r.json.ok && r.json.role === "instructor", "강사(초이) 로그인", r.json);
  const di = await I.docs(), io = di.m["vo:" + no1] && di.m["vo:" + no1].v;
  ok(io && io.rs && io.rs.ch === "두고미디어 YouTube" && io.rs.rate === 20 && (!io.buyer || /OO/.test(io.buyer.name)), "강사: 주문에 YouTube 채널 · RS율이 보임 (구매자 이름은 가림)", io && { rs: io.rs, buyer: io.buyer });
  const dm = await M.docs();
  ok(dm.m["vo:" + no1].v.rs.mid === "md-a" && dm.m["vo:" + no1].v.mid, "마스터: 주문 전체 + RS", dm.m["vo:" + no1].v.rs);

  console.log("7) 온드미디어가 자기 정보 고치기 (계좌 · 연락처 · 비밀번호만)");
  da = await A.docs();
  const mine = JSON.parse(JSON.stringify(da.m.meta.v));
  Object.assign(mine.media[0], { bank: "IBK", account: "123-456789-01-012", holder: "주식회사 두고미디어", phone: "010-9999-0000", email: "md@example.com", type: "biz", rate: 90, code: "hacked", channel: "바뀐 채널", status: "paused", subs: 9999999, memo: "해킹", pw: "newpass88" });
  mine.vod = Object.assign({}, mine.vod || {}); mine.vod.settings = Object.assign({}, mine.vod.settings, { rs: { hi: 99 } });
  mine.staff = [{ id: "x", loginId: "evil", pw: "evil", status: "active" }];
  r = await A.call("sync", { body: { changes: [{ k: "meta", base: da.m.meta.ver, put: mine }] } });
  ok(!r.json.results[0].error, "저장 요청 (meta 통째로)", r.json.results[0]);
  mt = await metaNow();
  const sa = mt.media.find((x) => x.id === "md-a");
  ok(sa.bank === "IBK" && sa.account === "123-456789-01-012" && sa.holder === "주식회사 두고미디어" && sa.phone === "010-9999-0000" && sa.email === "md@example.com" && sa.bankAt > 0, "계좌 · 연락처는 바뀜 (계좌 바꾼 때 기록)", sa);
  ok(sa.rate === "" && sa.code === "dgmd26" && sa.channel === "두고미디어 YouTube" && sa.status === "active" && sa.subs === 128000 && sa.memo === "운영 메모", "RS율 · 링크 코드 · 채널 · 상태 · 구독자 · 메모는 그대로", sa);
  ok(!(mt.vod && mt.vod.settings && mt.vod.settings.rs && mt.vod.settings.rs.hi === 99) && !(mt.staff || []).some((x) => x && x.loginId === "evil"), "RS 규칙 · 운영자 목록은 못 바꿈", { rs: mt.vod && mt.vod.settings && mt.vod.settings.rs, staff: (mt.staff || []).length });
  ok(mt.media.find((x) => x.id === "md-b").pwHash && mt.media.length === 3, "다른 계정은 그대로", mt.media.map((x) => x.id));
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "테스트채널9!" } });
  ok(r.json.error === "notfound", "바꾼 뒤 예전 비밀번호는 안 됨", r.json);
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "newpass88" } });
  ok(r.json.ok && r.json.role === "media", "새 비밀번호로 로그인", r.json);
  r = await B.call("auth", { body: { action: "admin", tab: "master", id: "money", pw: "money123" } });

  console.log("8) 마스터가 고치기 · 비밀번호 바꾸기 · 중지");
  d = await M.docs();
  let mi = d.m.meta.v.media.findIndex((x) => x.id === "md-a");
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media", mi, "name"], v: "두고미디어 콘텐츠팀" }] }] } });
  mt = await metaNow();
  ok(mt.media.find((x) => x.id === "md-a").name === "두고미디어 콘텐츠팀" && /^s1\$/.test(mt.media.find((x) => x.id === "md-a").pwHash), "이름만 고치면 비밀번호 해시는 그대로");
  d = await M.docs();
  // 계정을 하나 더 만들면 목록이 통째로 가요 — 화면이 모르는 해시를 서버가 지켜요
  const list = d.m.meta.v.media.map((x) => Object.assign({}, x)).concat([acc({ id: "md-d", loginId: "newone", pw: "newone12", code: "new001", channel: "새 채널", subs: 0, type: "person" })]);
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media"], v: list }] }] } });
  mt = await metaNow();
  ok(mt.media.length === 4 && mt.media.every((x) => /^s1\$/.test(x.pwHash)), "목록을 통째로 보내도 기존 해시 유지 + 새 계정 해시", mt.media.map((x) => [x.id, !!x.pwHash]));
  r = await U.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "newpass88" } });
  ok(r.json.ok, "기존 계정 로그인 그대로");
  d = await M.docs(); mi = d.m.meta.v.media.findIndex((x) => x.id === "md-a");
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media", mi, "pw"], v: "masterset1" }] }] } });
  r = await U.call("auth", { body: { action: "admin", tab: "master", id: "doogomd", pw: "masterset1" } });
  ok(r.json.ok, "마스터가 정한 새 비밀번호로 로그인");
  d = await M.docs(); mi = d.m.meta.v.media.findIndex((x) => x.id === "md-a");
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media", mi, "status"], v: "paused" }] }] } });
  da = await A.docs();
  ok(!(da.me.admin && da.me.admin.role === "media") && !Object.keys(da.m).some((k) => /^vo:/.test(k)), "중지하면 들어와 있던 온드미디어도 바로 막힘", da.me);
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 180, method: "card", rs: { c: "dgmd26", p: "v5", at: now } } });
  o2 = ((await store.getDoc("vo:" + r.json.no)) || {}).v;
  ok(!o2.rs, "중지된 계정 링크로는 새 RS 없음", o2.rs);
  d = await M.docs(); mi = d.m.meta.v.media.findIndex((x) => x.id === "md-a");
  await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["media", mi, "status"], v: "active" }] }] } });

  console.log("9) RS 규칙 바꾸기 (마스터) · 링크 기간");
  d = await M.docs();
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["vod", "settings", "rs"], v: { lo: 10, hi: 20, subs: 100000, days: 1, pg: 5 } }] }] } });
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 180, method: "card", rs: { c: "dgmd26", p: "v5", at: now - 2 * 864e5 } } });
  o2 = ((await store.getDoc("vo:" + r.json.no)) || {}).v;
  ok(!o2.rs, "링크 기간을 1일로 줄이면 2일 전 링크는 RS 없음", o2.rs);
  r = await U2.call("vod-pay", { body: { action: "prepare", pid: "v5", kind: "course", plan: 180, method: "card", rs: { c: "dgmd26", p: "v5", at: now - 3600e3 } } });
  o2 = ((await store.getDoc("vo:" + r.json.no)) || {}).v;
  ok(o2.rs && o2.rs.mid === "md-a", "1시간 전 링크는 RS", o2.rs);

  console.log("10) 일회성 작업: doogomd 첫 계정 (환경 변수 비밀번호)");
  const O = require(path.join(TMP, "class/api/_lib/oneoff.js")), MD = require(path.join(TMP, "class/api/_lib/media.js"));
  delete process.env.MEDIA_INIT_PW;
  let op = O.mediaDoogomd(() => ({ vod: {} }));
  ok(op.retry === true && !Object.keys(op.writes).length, "환경 변수가 없으면 만들지 않고 다음 배포 때 다시", op);
  process.env.MEDIA_INIT_PW = "테스트채널9!";
  op = O.mediaDoogomd(() => ({ vod: {}, media: [] }));
  const nd = op.writes.meta && op.writes.meta.media[0];
  ok(nd && nd.loginId === "doogomd" && MD.checkLogin(nd, "테스트채널9!") && !("pw" in nd) && nd.status === "active", "환경 변수 비밀번호를 해시로만 저장", nd && Object.keys(nd));
  op = O.mediaDoogomd(() => ({ vod: {}, media: [{ id: "x", loginId: "DoogoMD" }] }));
  ok(!op.retry && !Object.keys(op.writes).length, "doogomd 가 이미 있으면 건드리지 않음", op);
  delete process.env.MEDIA_INIT_PW;

  console.log("11) 파트너 자기 정보 저장 (meta 통째로 · 목록 맨 앞이 아닌 파트너)");
  const P = client();
  d = await M.docs();
  r = await M.call("sync", { body: { changes: [{ k: "meta", base: d.m.meta.ver, ops: [{ p: ["affiliates"], v: [
    { id: "aff-1", name: "첫 파트너", loginId: "first", pw: "first1", status: "active", bank: "국민은행", account: "111", holder: "첫", instructors: [] },
    { id: "aff-2", name: "둘째 파트너", loginId: "second", pw: "second2", status: "active", bank: "", account: "", holder: "", instructors: [] }] }] }] } });
  r = await P.call("auth", { body: { action: "admin", tab: "master", id: "second", pw: "second2" } });
  ok(r.json.ok && r.json.role === "partner" && r.json.pid === "aff-2", "둘째 파트너 로그인", r.json);
  const dp = await P.docs(), pm = JSON.parse(JSON.stringify(dp.m.meta.v));
  ok(pm.affiliates.length === 1 && pm.affiliates[0].id === "aff-2" && !pm.media, "파트너 화면: 자기 계정 하나 · 온드미디어 계정 없음", { aff: pm.affiliates.map((x) => x.id), media: !!pm.media });
  Object.assign(pm.affiliates[0], { bank: "신한은행", account: "222-333", holder: "둘째", rs: 99 });
  r = await P.call("sync", { body: { changes: [{ k: "meta", base: dp.m.meta.ver, put: pm }] } });
  mt = await metaNow();
  const a1 = mt.affiliates.find((x) => x.id === "aff-1"), a2 = mt.affiliates.find((x) => x.id === "aff-2");
  ok(a2.bank === "신한은행" && a2.account === "222-333" && a2.holder === "둘째" && a2.rs === undefined, "둘째 파트너 계좌만 바뀜 (RS는 못 바꿈)", a2);
  ok(a1.bank === "국민은행" && a1.account === "111" && a1.holder === "첫", "첫 파트너는 그대로", a1);
  ok(mt.media.length === 4 && mt.media.every((x) => x.pwHash), "온드미디어 계정도 그대로", mt.media.length);

  console.log("\n" + (failN ? "✗ " + failN + "개 실패 · " : "✓ ") + pass + "개 통과");
  process.exit(failN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
