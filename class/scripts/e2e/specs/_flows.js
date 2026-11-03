/* 테스트끼리 같이 쓰는 화면 흐름 (로그인 · 로그아웃) — 사람이 누르는 것과 같은 길로만 (내부 저장 칸을 직접 만지지 않아요) */
"use strict";
const L = require("../lib");

/** 강사센터 로그인: 마스터(아이디 · 비밀번호) · 강사 / 코치(이름 · 뒷자리) */
async function adminLogin(page, base, tab, id, pw) {
  await L.fresh(page, base);
  await L.open(page, base, "/center/login");
  await page.click('[data-action="login-tab"][data-tab="' + tab + '"]');
  await page.fill("#al-id", id);
  await page.fill("#al-pw", pw);
  await page.press("#al-pw", "Enter");
  await page.waitForFunction(() => !!(window.DB && DB.session.admin()) || !!document.querySelector("#modal-root .cp-list") || /맞지 않|확인해 주세요|없어요/.test((document.querySelector(".a-error, .field-error, [role='alert']") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
}
const master = (page, base, info) => adminLogin(page, base, "master", "doogobiz", info.masterPw);
const instructor = (page, base, info) => adminLogin(page, base, "instructor", info.instructor.name, info.instructor.pin);
const coach = (page, base, info) => adminLogin(page, base, "coach", info.coach.name, info.coach.pin);

/** 두잉고 수강생 로그인: /login?ins=<강사> → 이름 + 뒷자리 4자리 */
async function student(page, base, info, pin) {
  await L.fresh(page, base);
  await L.open(page, base, "/login?ins=" + info.student.iid);
  await page.fill("#lg-name", info.student.name);
  await page.fill("#lg-phone", pin || info.student.pin);
  await page.press("#lg-phone", "Enter");
  await page.waitForFunction(() => !document.getElementById("login-form") || /맞지 않|확인|없어요/.test((document.getElementById("lg-error") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
}
/** DOOGO CLASS 회원 로그인: /login?tab=vod → 이메일 + 비밀번호 */
async function member(page, base, email, pw) {
  await L.fresh(page, base);
  await L.open(page, base, "/login?tab=vod");
  await page.fill("#lg-vemail", email);
  await page.fill("#lg-vpw", pw);
  await page.press("#lg-vpw", "Enter");
  await page.waitForFunction(() => !!(window.DB && DB.remote.me && DB.remote.me.vod) || /맞지 않|확인|없어요/.test((document.getElementById("lg-vod-error") || {}).textContent || ""), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
}
/** 화면의 로그아웃 단추 누르기 (강사센터 · 두잉고 강의실: data-action, DOOGO CLASS: data-v) */
async function logout(page) {
  const b = (await page.$('[data-action="logout"]')) || (await page.$('[data-v="logout"]'));
  if (!b) return false;
  await b.click();
  await page.waitForTimeout(1200);
  const ok = await page.$('#modal-root [data-action="confirm-ok"], #modal-root .a-btn-primary, #modal-root .vd-btn-p');
  if (ok) { await ok.click(); await page.waitForTimeout(1200); }
  return true;
}
/** 서버가 보는 로그인 상태 (이 브라우저 쿠키로 /api/bootstrap) */
const serverMe = (page) => page.evaluate(() => fetch("/api/bootstrap", { credentials: "same-origin" }).then((r) => r.json()).then((j) => j.me || null));

module.exports = { adminLogin, master, instructor, coach, student, member, logout, serverMe };
