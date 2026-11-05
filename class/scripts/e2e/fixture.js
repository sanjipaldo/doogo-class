/* 상시 화면 테스트용 시험 DB 만들기 — 운영과 같은 순서로 (운영 데이터는 쓰지 않아요)
 *   1) 빈 SQLite → 서버가 처음 데이터(data.js)로 채움 (운영 첫 배포와 같음)
 *   2) 마스터가 DOOGO CLASS 스토어를 한 번 열어 스토어 데이터 · 결제 가격표(vcat)를 서버에 올림
 *   3) 배포 빌드처럼 일회성 작업 전부 + 빠진 기본값 채우기 (체험 계정 · 무통장 계좌 · 기수 일정 · 테스트 데이터 정리 …)
 * 결과: <dir>/fixture.db + <dir>/fixture.json (테스트가 쓰는 체험 계정 정보 — 이름 · 뒷자리는 시험 DB에서 읽어요) */
"use strict";
const fs = require("fs");
const path = require("path");
const L = require("./lib");

const OPS_CODE = `(async () => {
  const init = require("./api/_lib/init.js"), store = require("./api/_lib/store.js");
  const ran = await init.runPendingOps();
  const m = await init.migrate();
  const g = async (k) => { const r = await store.getDoc(k); return r && r.v != null ? r.v : null; };
  const moon = await g("ins:moon"), s1 = await g("stu:moon:s1"), vcat = await g("vcat"), meta = await g("meta");
  const coach = ((moon && moon.coaches) || []).find((c) => c && c.status === "active") || null;
  console.log(JSON.stringify({ ops: ran.map((x) => x.id + (x.ok ? "" : " (겹침)")), migrated: m.changed.length,
    instructor: moon ? { iid: "moon", name: moon.name, pin: moon.phone4 } : null,
    coach: coach ? { iid: "moon", cid: coach.id, name: coach.name, pin: coach.phone4 } : null,
    student: s1 ? { iid: "moon", sid: s1.id, name: s1.name, pin: s1.phone4 } : null,
    vcat: vcat ? (vcat.products || []).length : 0, products: ((meta && meta.vod && meta.vod.products) || []).map((p) => ({ id: p.id, title: p.title, type: p.type, iid: p.iid, price: p.price, sale: p.sale, status: p.status })),
    bank: !!(meta && meta.vod && meta.vod.settings && meta.vod.settings.bank && meta.vod.settings.account) }));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });`;

async function masterOpensStore(base) {
  const browser = await L.chromium().launch();
  try {
    const page = await L.newPage(browser);
    await masterLogin(page, base);
    await L.open(page, base, "/");
    // 스토어 데이터가 서버에 올라갈 때까지 (공개 bootstrap 의 meta.vod.products)
    const end = Date.now() + 20000;
    for (;;) {
      const j = await (await fetch(base + "/api/bootstrap")).json();
      const meta = ((j.docs || []).find((d) => d[0] === "meta") || [])[1] || {};
      if (meta.vod && Array.isArray(meta.vod.products) && meta.vod.products.length) break;
      if (Date.now() > end) throw new Error("스토어 데이터가 서버에 올라가지 않았어요");
      await L.sleep(400);
    }
    await L.sleep(4000); // 결제 가격표(vcat) 올리기: 저장 1.5초 뒤 + 설정 확인
    await L.flushed(page);
  } finally { await browser.close(); }
}
/** 강사센터 로그인 (마스터 · 강사 · 코치) — 아이디 칸에 이름, 비밀번호 칸에 뒷자리(강사 · 코치) */
async function adminLogin(page, base, tab, id, pw) {
  await L.fresh(page, base);
  await L.open(page, base, "/center/login");
  await page.click('[data-action="login-tab"][data-tab="' + tab + '"]');
  await page.fill("#al-id", id);
  await page.fill("#al-pw", pw);
  await page.press("#al-pw", "Enter");
  await page.waitForTimeout(1500);
  await L.ready(page);
}
const masterLogin = (page, base) => adminLogin(page, base, "master", "doogobiz", L.MASTER_PW);

async function build(dir) {
  dir = dir || L.tmp();
  fs.mkdirSync(dir, { recursive: true });
  const db = path.join(dir, "fixture.db");
  fs.rmSync(db, { force: true });
  let srv = await L.startServer(db, { sqlite: true }); // 시험 DB 는 늘 SQLite 로 만들고, E2E_DB=pg 면 테스트마다 Postgres 로 옮겨요 (lib.startServer)
  try {
    await (await fetch(srv.base + "/api/bootstrap")).json(); // 처음 데이터 채우기
    await masterOpensStore(srv.base);
  } finally { await srv.stop(); }
  const info = JSON.parse((await L.runNode(OPS_CODE, db)).trim().split("\n").pop());
  info.vodDemo = { email: "vod@gmail.com", pw: "vod" }; // 일회성 작업 vodDemoMember 가 만드는 체험 계정 (운영에도 공개된 체험 계정)
  info.masterPw = L.MASTER_PW;
  fs.writeFileSync(path.join(dir, "fixture.json"), JSON.stringify(info, null, 1));
  return { dir, db, info };
}

module.exports = { build, adminLogin, masterLogin };
if (require.main === module) build(process.argv[2]).then((r) => console.log("[e2e] 시험 DB: " + r.db + "\n" + JSON.stringify(r.info, null, 1))).catch((e) => { console.error(e); process.exit(1); });
