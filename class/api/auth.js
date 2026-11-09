/* POST /api/auth
 *  { action: "student", iid, name, phone4 }        수강생 로그인
 *  { action: "admin", tab, id, pw, iid? }           강사 · 코치 · 마스터 로그인 (tab: instructor | coach | master — 마스터 탭에서 운영자 · 파트너 · 온드미디어 계정도 받아요)
 *        코치가 여러 강사님 강의를 맡고 있으면(같은 이름 + 뒷자리) 로그인 대신 { choose, courses } 를 돌려주고, iid 를 골라 다시 보내면 그 강의로 들어가요
 *  { action: "coachSwitch", iid? }                  로그인한 코치가 맡은 다른 강의로 옮기기 (iid 없으면 맡은 강의 목록)
 *  { action: "logout", which: "student"|"admin"|"all" }   all = 이 브라우저의 로그인 모두 (수강생 · 강사센터 · DOOGO CLASS 회원 · 2026-11-06)
 *  체험(테스트) 수강생 계정(demo: true)은 로그인 · 로그아웃할 때마다 진도 기록을 처음으로 (2026-11-09 · _lib/demoreset.js)
 * 비밀번호(전화번호 뒷자리)는 서버에서만 확인하고, 15분에 여러 번 틀리면 잠시 막는다. */
"use strict";
const crypto = require("crypto");
const { send, body, handler, ip } = require("./_lib/http");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const MD = require("./_lib/media");
const COACH = require("../coach-perms");
const DEMO = require("./_lib/demoreset");

const IP_LIMIT = 40, NAME_LIMIT = 8;
// 하루 기준 잠금 (Next.js 전환 4단계 · 2026-11): 같은 이름(아이디)으로 24시간 안에 30번 틀리면 그 24시간이 끝날 때까지 막아요.
// 15분 잠금만 있으면 숫자 4자리를 하루 768번까지 맞춰 볼 수 있었어요 → 이제 하루 30번. 성공하면 바로 풀려요.
// 마스터는 빼요 — 누가 일부러 틀려서 주인이 하루 내내 못 들어오는 일을 막으려고 (마스터는 긴 비밀번호 · 15분 잠금 그대로)
const DAY_LIMIT = 30, DAY_MS = 24 * 3600e3, dayKey = (k) => "day:" + k;
const norm = auth.norm;
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// 한글 자판 상태로 친 글자(예: 한글2@)를 같은 자리의 영문 자판 글자(gksrmf2@)로 바꾼다 — 마스터 아이디 · 비밀번호는 둘 다 받아 준다
const koToKeys = auth.koToKeys;

/** 막혔으면 오류 이름("locked" 15분 · "locked-day" 하루), 아니면 "" — day === false 면 하루 기준은 안 봐요 (마스터) */
async function limited(req, nameKey, day) {
  if ((await store.rlCheck(["ip:" + ip(req)], IP_LIMIT)) || (await store.rlCheck([nameKey], NAME_LIMIT))) return "locked";
  if (day !== false && (await store.rlCheck([dayKey(nameKey)], DAY_LIMIT))) return "locked-day";
  return "";
}
async function fail(req, nameKey, day) {
  await store.rlFail(["ip:" + ip(req), nameKey]);
  if (day !== false) await store.rlFail([dayKey(nameKey)], DAY_MS);
}
const clear = (nameKey) => store.rlClear([nameKey, dayKey(nameKey)]);

async function studentLogin(req, res, b) {
  const iid = String(b.iid || ""), name = norm(b.name), phone4 = String(b.phone4 || "").trim();
  if (!iid || !name || !/^\d{4}$/.test(phone4)) return send(res, 400, { error: "input" });
  const nameKey = "stu:" + iid + ":" + name;
  { const lk = await limited(req, nameKey); if (lk) return send(res, 429, { error: lk }); }
  const ins = await store.getDoc("ins:" + iid);
  if (!ins || !ins.v || ins.v.status !== "active") return send(res, 200, { error: "notfound" });
  const list = (await store.listDocs({ prefixes: ["stu:" + iid + ":%"] })).map((r) => r.v);
  const matches = list.filter((s) => norm(s.name) === name && s.phone4 === phone4);
  const s = matches.find((x) => x.status === "approved") || matches[0];
  if (!s) { await fail(req, nameKey); return send(res, 200, { error: "notfound" }); }
  await clear(nameKey);
  if (s.status !== "approved") return send(res, 200, { error: s.status });
  // 체험(테스트) 계정은 들어올 때마다 처음 상태로 (_lib/demoreset.js · 실패해도 로그인은 그대로)
  if (s.demo === true) await DEMO.resetDemo(iid, s.id).catch(() => false);
  auth.setCookie(req, res, "student", auth.sign({ r: "student", sid: s.id, iid }));
  send(res, 200, { ok: true, sid: s.id, name: s.name });
}

/** 코치 최근 접속 시각 남기기 (실패해도 로그인은 그대로) */
async function touchCoach(iid, cid) {
  for (let i = 0; i < 3; i++) {
    const row = await store.getDoc("ins:" + iid);
    if (!row || !row.v) return;
    const c = (row.v.coaches || []).find((x) => x.id === cid);
    if (!c) return;
    c.lastLoginAt = Date.now();
    if ((await store.writeDoc("ins:" + iid, row.v, row.ver)) !== false) return;
  }
}

/** 온드미디어 최근 접속 시각 (실패해도 로그인은 그대로) */
async function touchMedia(id) {
  for (let i = 0; i < 3; i++) {
    const row = await store.getDoc("meta");
    const a = row && row.v && (row.v.media || []).find((x) => x && x.id === id);
    if (!a) return;
    a.lastLoginAt = Date.now();
    if ((await store.writeDoc("meta", row.v, row.ver)) !== false) return;
  }
}
/** 운영자(마스터가 만든 직원 계정) · 파트너 계정 · 온드미디어 계정: meta 의 staff · affiliates · media (아이디 + 비밀번호) */
async function accountLogin(req, res, tab, id, pw) {
  const nameKey = "acc:" + koToKeys(id).toLowerCase();
  { const lk = await limited(req, nameKey); if (lk) return send(res, 429, { error: lk }); }
  const meta = ((await store.getDoc("meta")) || {}).v || {}, n = (v) => koToKeys(String(v || "").replace(/\s+/g, "")).toLowerCase(), want = n(id);
  const same = (x) => typeof x.pw === "string" && x.pw && eq(koToKeys(pw), koToKeys(String(x.pw).trim()));
  if (tab === "master") {
    const st = (meta.staff || []).find((x) => x && n(x.loginId) === want && same(x));
    if (st) {
      if (st.status !== "active") return send(res, 200, { error: "paused-staff" });
      await clear(nameKey);
      auth.setCookie(req, res, "admin", auth.sign({ r: "master", staffId: st.id }));
      return send(res, 200, { ok: true, role: "master", staffId: st.id, name: st.name || "" });
    }
  }
  const pt = (meta.affiliates || []).find((x) => x && (n(x.loginId) === want || n(x.name) === want) && same(x));
  if (pt) {
    if (pt.status !== "active") return send(res, 200, { error: "paused-partner" });
    await clear(nameKey);
    auth.setCookie(req, res, "admin", auth.sign({ r: "partner", pid: pt.id }));
    return send(res, 200, { ok: true, role: "partner", pid: pt.id, name: pt.name || "" });
  }
  // 온드미디어(YouTube 채널 팀) 계정: 비밀번호는 해시로만 저장돼 있어요 (마스터가 만든 계정 · 아이디는 대소문자 무관)
  const md = (meta.media || []).find((x) => x && n(x.loginId) === want && MD.checkLogin(x, pw));
  if (md) {
    if (md.status !== "active") return send(res, 200, { error: "paused-media" });
    await clear(nameKey);
    await touchMedia(md.id).catch(() => {});
    auth.setCookie(req, res, "admin", auth.sign({ r: "media", md: md.id }));
    return send(res, 200, { ok: true, role: "media", mdid: md.id, name: md.name || md.channel || "" });
  }
  await fail(req, nameKey);
  return send(res, 200, { error: "notfound" });
}
async function adminLogin(req, res, b) {
  const tab = String(b.tab || "instructor"), id = String(b.id || "").trim(), pw = String(b.pw || "").trim();
  if (tab === "partner") return accountLogin(req, res, tab, id, pw);
  if (tab === "master") {
    // 마스터 아이디는 MASTER_ID(없으면 doogobiz, 대소문자 무관), 비밀번호는 Vercel 환경변수 MASTER_PASSWORD — 코드에는 비밀번호를 두지 않는다
    const wantId = String(process.env.MASTER_ID || "doogobiz").trim().toLowerCase();
    if (koToKeys(id).toLowerCase() !== wantId) return accountLogin(req, res, tab, id, pw);
    const nameKey = "master";
    const lk = await limited(req, nameKey, false);
    if (lk) return send(res, 429, { error: lk });
    const want = process.env.MASTER_PASSWORD;
    if (!want) return send(res, 200, { error: "master-disabled" });
    if (!eq(koToKeys(pw), koToKeys(want))) { await fail(req, nameKey, false); return send(res, 200, { error: "notfound" }); }
    await clear(nameKey);
    auth.setCookie(req, res, "admin", auth.sign({ r: "master" }));
    return send(res, 200, { ok: true, role: "master" });
  }
  const name = norm(id);
  if (!name || !/^\d{4}$/.test(pw)) return send(res, 400, { error: "input" });
  const nameKey = "adm:" + name;
  { const lk = await limited(req, nameKey); if (lk) return send(res, 429, { error: lk }); }
  const all = (await store.listDocs({ prefixes: ["ins:%"] })).map((r) => r.v);
  const ins = all.find((x) => norm(x.name) === name && x.phone4 === pw);
  const hits = coachHits(all, name, pw), live = hits.filter((h) => h.c.status === "active");
  const okIns = async () => {
    if (ins.status !== "active") return send(res, 200, { error: "paused-platform" });
    await clear(nameKey);
    auth.setCookie(req, res, "admin", auth.sign({ r: "instructor", iid: ins.id }));
    return send(res, 200, { ok: true, role: "instructor", iid: ins.id, name: ins.name });
  };
  const okCoach = async (hit) => {
    if (hit.c.status !== "active") return send(res, 200, { error: "paused-coach" });
    await clear(nameKey);
    await touchCoach(hit.i.id, hit.c.id).catch(() => {});
    auth.setCookie(req, res, "admin", auth.sign({ r: "coach", iid: hit.i.id, cid: hit.c.id }));
    return send(res, 200, { ok: true, role: "coach", iid: hit.i.id, cid: hit.c.id, name: hit.c.name });
  };
  // 코치: 맡은 강의가 하나면 바로, 여럿이면 고르게 해요 (고른 강의 iid 를 다시 보내면 그 강의로)
  const asCoach = async () => {
    if (!live.length) return okCoach(hits[0]); // 모두 멈춘 코치 자리 → paused-coach
    const want = String(b.iid || "");
    if (want) { const h = live.find((x) => x.i.id === want); if (h) return okCoach(h); return send(res, 200, { error: "notfound" }); }
    if (live.length === 1) return okCoach(live[0]);
    await clear(nameKey);
    return send(res, 200, { choose: true, role: "coach", name: live[0].c.name, courses: await courseList(live) });
  };
  // 코치 탭은 코치를 먼저, 강사 탭은 강사를 먼저 찾는다 (탭을 잘못 골라도 들어갈 수 있게)
  if (tab === "coach" && hits.length) return asCoach();
  if (ins) return okIns();
  if (hits.length) return asCoach();
  await fail(req, nameKey);
  return send(res, 200, { error: "notfound" });
}
/** 같은 이름 + 뒷자리로 등록된 코치 자리 (운영 중인 강사만) — 한 사람이 여러 강사님 강의의 코치일 수 있어요 */
function coachHits(all, name, pw) {
  const out = [];
  for (const i of all) {
    if (!i || i.status !== "active") continue;
    const c = (i.coaches || []).find((x) => norm(x.name) === name && x.phone4 === pw);
    if (c) out.push({ i, c });
  }
  return out;
}
/** 코치가 고를 강의 목록: 강사 이름 · 강의 이름 · 사진(주소일 때만) · 맡은 메뉴 수 */
async function courseList(hits) {
  const docs = await store.getDocs(hits.map((h) => "content:" + h.i.id));
  return hits.map((h) => {
    const b = Object.assign({}, h.i.brand || {}, ((docs["content:" + h.i.id] || {}).v || {}).brand || {}), ph = String(b.photo || "");
    return { iid: h.i.id, ins: String(h.i.displayName || h.i.name || ""), title: String(b.courseTitle || b.name || ""), photo: /^(assets\/|https:\/\/)/.test(ph) && ph.length < 300 ? ph : "", perms: COACH.permsOf(h.c).length };
  });
}
/** 로그인한 코치 → 맡은 다른 강의로 옮기기 (지금 쿠키의 코치 자리와 같은 이름 + 뒷자리인 자리만) */
async function coachSwitch(req, res, b) {
  const ids = await auth.identify(req), a = ids.admin;
  if (!a || a.role !== "coach") return send(res, 403, { error: "coach" });
  const cur = ((await store.getDoc("ins:" + a.iid)) || {}).v, me = cur && (cur.coaches || []).find((x) => x.id === a.cid);
  if (!me) return send(res, 403, { error: "coach" });
  const all = (await store.listDocs({ prefixes: ["ins:%"] })).map((r) => r.v);
  const live = coachHits(all, norm(me.name), me.phone4).filter((h) => h.c.status === "active");
  const want = String(b.iid || "");
  if (!want) return send(res, 200, { ok: true, cur: a.iid, courses: await courseList(live) });
  const h = live.find((x) => x.i.id === want);
  if (!h) return send(res, 200, { error: "notfound" });
  await touchCoach(h.i.id, h.c.id).catch(() => {});
  auth.setCookie(req, res, "admin", auth.sign({ r: "coach", iid: h.i.id, cid: h.c.id }));
  return send(res, 200, { ok: true, role: "coach", iid: h.i.id, cid: h.c.id, name: h.c.name });
}

module.exports = handler(["POST"], async (req, res) => {
  const b = await body(req);
  if (b.action === "student") return studentLogin(req, res, b);
  if (b.action === "admin") return adminLogin(req, res, b);
  if (b.action === "coachSwitch") return coachSwitch(req, res, b);
  if (b.action === "logout") {
    const w = b.which === "admin" ? ["admin"] : b.which === "student" ? ["student"] : ["student", "admin"];
    // 체험(테스트) 계정은 나갈 때(자동 로그아웃 포함)도 처음 상태로 — 쿠키를 지우기 전에 누구인지 봐요
    if (w.indexOf("student") >= 0) { const ids = await auth.identify(req).catch(() => null); if (ids && ids.student) await DEMO.resetDemo(ids.student.iid, ids.student.sid).catch(() => false); }
    w.forEach((x) => auth.setCookie(req, res, x, ""));
    // 어디서 로그아웃하든(스토어 · 두잉고 강의실 · 강사센터) DOOGO CLASS 회원 로그인도 같이 풀어요 — 강의실 · 강사센터에서 로그아웃해도 스토어에 ‘체험회원님’이 남던 것
    if (b.which === "all") require("./_lib/vod").logout(req, res);
    return send(res, 200, { ok: true });
  }
  send(res, 400, { error: "action" });
});
