/* 역할별 로그인 — 마스터 · 강사 · 코치 · 두잉고 수강생 · DOOGO CLASS 회원
 *  로그인 → 서버도 같은 사람으로 봐요 → 새로 고쳐도 그대로 → 로그아웃하면 서버 쿠키까지 풀려요 · 틀린 비밀번호는 막아요 · 권한 밖 화면은 못 열어요 */
"use strict";
const FL = require("./_flows");

module.exports = {
  title: "역할별 로그인 · 로그아웃 · 권한",
  async run({ base, info, browser, run, L }) {
    const page = await L.newPage(browser);
    run.watch(page, "로그인");
    const roleOf = (m) => (m && m.admin && m.admin.role) || "";
    // 마스터
    await FL.master(page, base, info);
    let m = await FL.serverMe(page);
    await run.check(roleOf(m) === "master" && (await page.evaluate(() => document.body.dataset.mode)) === "admin", "마스터 로그인 → 강사센터(마스터)", m, page);
    await L.open(page, base, "/center/master");
    m = await FL.serverMe(page);
    await run.check(roleOf(m) === "master" && !(await page.$("#al-id")), "마스터: 새로 고쳐도 로그인 그대로", m, page);
    await run.check(await FL.logout(page), "마스터: 로그아웃 단추가 있어요", null, page);
    m = await FL.serverMe(page);
    await run.check(!m || !m.admin, "마스터 로그아웃 → 서버 쿠키도 풀림", m, page);
    // 마스터 틀린 비밀번호
    await FL.adminLogin(page, base, "master", "doogobiz", "wrong-" + info.masterPw);
    m = await FL.serverMe(page);
    await run.check(!m || !m.admin, "마스터: 틀린 비밀번호는 막아요", m, page);
    // 강사
    await FL.instructor(page, base, info);
    m = await FL.serverMe(page);
    await run.check(roleOf(m) === "instructor" && m.admin.iid === info.instructor.iid, "강사 로그인 → 내 강사센터", m, page);
    await L.open(page, base, "/center/master");
    await run.check(roleOf(await FL.serverMe(page)) === "instructor" && !/\/center\/master/.test(await page.evaluate(() => location.pathname)), "강사는 마스터 화면을 못 열어요", await page.evaluate(() => location.pathname), page);
    // 코치
    await FL.coach(page, base, info);
    m = await FL.serverMe(page);
    await run.check(roleOf(m) === "coach" && m.admin.cid === info.coach.cid, "코치 로그인 → 맡은 강의 코치센터", m, page);
    // 두잉고 수강생
    await FL.student(page, base, info, "0000");
    m = await FL.serverMe(page);
    await run.check(!m || !m.student, "수강생: 틀린 뒷자리는 막아요", m, page);
    await FL.student(page, base, info);
    m = await FL.serverMe(page);
    await run.check(m && m.student && m.student.sid === info.student.sid && (await page.evaluate(() => document.body.dataset.mode)) === "student" && !(await page.$("#login-form")), "두잉고 수강생 로그인 → 내 강의실", m, page);
    await L.open(page, base, "/home");
    await run.check(!(await page.$("#login-form")), "수강생: 새로 고쳐도 강의실 그대로", null, page);
    await L.open(page, base, "/center/master");
    await run.check(!roleOf(await FL.serverMe(page)) && (!!(await page.$("#al-id")) || !/\/center\/master/.test(await page.evaluate(() => location.pathname))), "수강생은 강사센터를 못 열어요", await page.evaluate(() => location.pathname), page);
    await L.open(page, base, "/home");
    await run.check(await FL.logout(page), "수강생: 로그아웃 단추가 있어요", null, page);
    m = await FL.serverMe(page);
    await run.check(!m || !m.student, "수강생 로그아웃 → 서버 쿠키도 풀림", m, page);
    // DOOGO CLASS 회원 (체험 계정)
    await FL.member(page, base, info.vodDemo.email, "wrong-pass-1");
    m = await FL.serverMe(page);
    await run.check(!m || !m.vod, "회원: 틀린 비밀번호는 막아요", m, page);
    await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
    m = await FL.serverMe(page);
    await run.check(m && m.vod && m.vod.mid, "DOOGO CLASS 회원 로그인 (체험 계정)", m, page);
    await L.open(page, base, "/vod/my");
    await run.check((await page.evaluate(() => document.body.dataset.mode)) === "vod" && !!(await page.$('[data-v="logout"]')), "회원: 마이페이지가 열려요", await page.evaluate(() => location.pathname), page);
    await run.check(await FL.logout(page), "회원: 로그아웃 단추가 있어요", null, page);
    m = await FL.serverMe(page);
    await run.check(!m || !m.vod, "회원 로그아웃 → 서버 쿠키도 풀림", m, page);
    // 같은 브라우저에서 회원 + 강사센터 → 강사센터에서 로그아웃해도 스토어에 ‘체험회원님’이 남지 않아요 (어디서 로그아웃하든 모두 풀려요 · 2026-11-06)
    await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
    await L.open(page, base, "/center/login");
    await page.click('[data-action="login-tab"][data-tab="instructor"]');
    await page.fill("#al-id", info.instructor.name); await page.fill("#al-pw", info.instructor.pin); await page.press("#al-pw", "Enter");
    await page.waitForFunction(() => !!(window.DB && DB.session.admin()), null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(600);
    m = await FL.serverMe(page);
    const both = !!(m && m.vod && m.vod.mid && m.admin);
    await FL.logout(page);
    m = await FL.serverMe(page);
    await L.open(page, base, "/vod");
    const chip = await page.evaluate(() => ({ me: !!document.querySelector(".vd-acct"), login: !!document.querySelector(".vd-login") }));
    await run.check(both && (!m || (!m.vod && !m.admin)) && !chip.me && chip.login, "회원 + 강사센터 로그인 → 강사센터에서 로그아웃 → 스토어도 ‘로그인’ (회원 로그인이 남지 않아요)", { both, m, chip }, page);
    // 두잉고 VOD 강의실에서 로그아웃해도 스토어 회원까지 풀려요
    await FL.member(page, base, info.vodDemo.email, info.vodDemo.pw);
    await page.goto(base + "/vod/dg", { waitUntil: "load" }); await page.waitForTimeout(2500);
    const dgA = await page.$('[data-v="dg"]');
    if (dgA) { await Promise.all([page.waitForNavigation({ waitUntil: "load", timeout: 15000 }).catch(() => {}), dgA.click()]); await page.waitForTimeout(2000); }
    await L.ready(page).catch(() => {});
    {
      const inDg = await page.evaluate(() => !!(window.DB && DB.session.student && DB.session.student()));
      await FL.logout(page);
      await page.waitForTimeout(800);
      m = await FL.serverMe(page);
      await L.open(page, base, "/vod");
      const chip2 = await page.evaluate(() => !!document.querySelector(".vd-acct"));
      await run.check(inDg && (!m || (!m.vod && !m.student)) && !chip2, "두잉고 VOD 강의실에서 로그아웃 → 스토어 회원 로그인도 풀려요", { inDg, m, chip2 }, page);
    }
    await page.context().close();
  }
};
