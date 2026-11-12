/* 패밀리 체험(테스트) 계정 (2026-11-12 · 대표님 요청)
 *  · 영업 패밀리(파트너 역할) partner / partner · 온드미디어 owned / owned — 로그인 화면 ‘마스터 · 패밀리’ 탭
 *  · 이수진 체험 수강생 계정처럼, 로그인할 때 · 로그아웃할 때(자동 로그아웃 포함) 체험 계정이 바꾼 것을 처음 상태로 돌려요
 *      영업 패밀리: 연락처 · 정산 계좌 · 공지 읽음 + 체험 계정이 ‘강사 추천하기’로 남긴 입점 문의는 지워요
 *      온드미디어:  연락처 · 이메일 · 정산 계좌 · 사업자 정보 · 공지 읽음
 *  · 비밀번호는 바꿀 수 없어요 (서버가 무시해요 — access.js fixPartnerMeta · media.js fixSelf, 화면은 안내만)
 *  · 온드미디어 체험 계정의 홍보 링크로 산 주문에는 RS 를 붙이지 않아요 (media.js attach)
 *  · 체험 영업 패밀리에는 담당 강사를 두지 않아요 — 공개된 비밀번호로 다른 강사님의 이용료 금액이 보이지 않게
 *  · 계정은 배포 때 일회성 작업 2026-11-12-family-demo 가 만들어요 (같은 아이디를 다른 계정이 쓰고 있으면 건너뛰어요)
 *  · 마스터가 바꾼 칸(이름 · RS · 상태 · 담당 강사 등)은 되돌리지 않아요 — 체험하는 사람이 고칠 수 있는 칸만 */
"use strict";
const store = require("./store");

const AFF_ID = "aff-family-demo", MD_ID = "md-family-demo";
const AFF_LOGIN = "partner", MD_LOGIN = "owned";
const MEMO = "체험(테스트) 계정 — 로그인 · 로그아웃할 때 처음 상태로 돌아가요 (비밀번호는 바꿀 수 없어요)";
/** 처음 상태 — 체험하는 사람이 고칠 수 있는 칸 */
const AFF_BASE = { phone: "", bank: "", account: "", holder: "", noticeSeen: 0 };
const MD_BASE = { phone: "", email: "", bank: "", account: "", holder: "", bizName: "", bizNo: "", noticeSeen: 0, type: "person" };
const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

/** 새로 만들 계정 */
function affAccount(now) {
  return Object.assign({ id: AFF_ID, name: "체험 영업 패밀리", loginId: AFF_LOGIN, pw: AFF_LOGIN, code: "FAMDEMO", rs: null, memo: MEMO, taxType: "personal", instructors: [], status: "active", demo: true, createdAt: now || Date.now() }, AFF_BASE);
}
function mdAccount(now) {
  const MD = require("./media"), t = now || Date.now();
  return Object.assign({ id: MD_ID, loginId: MD_LOGIN, pwHash: MD.hashOf(MD_LOGIN), pwAt: t, code: "owndemo", name: "체험 온드미디어", channel: "두고 패밀리 체험 채널", url: "", subs: "", rate: "", memo: MEMO, status: "active", demo: true, createdAt: t }, MD_BASE);
}
const isDemo = (kind, x) => !!x && x.demo === true && x.id === (kind === "partner" ? AFF_ID : MD_ID);

/** meta 에서 체험 계정을 처음 상태로 — 바뀐 게 있으면 새 meta, 없으면 null */
function resetMeta(meta, kind) {
  if (!meta || typeof meta !== "object") return null;
  const key = kind === "partner" ? "affiliates" : "media", base = kind === "partner" ? AFF_BASE : MD_BASE;
  const list = Array.isArray(meta[key]) ? meta[key] : [], i = list.findIndex((x) => isDemo(kind, x));
  if (i < 0) return null;
  const a = Object.assign({}, list[i]);
  let ch = false;
  Object.keys(base).forEach((k) => { if (!same(a[k], base[k])) { a[k] = base[k]; ch = true; } });
  if (kind === "partner") {
    if (a.pw !== AFF_LOGIN) { a.pw = AFF_LOGIN; ch = true; }
    if (a.pwChangedAt) { delete a.pwChangedAt; ch = true; }
  } else {
    const MD = require("./media");
    if (a.bankAt) { delete a.bankAt; ch = true; }
    if (!MD.checkLogin(a, MD_LOGIN)) { a.pwHash = MD.hashOf(MD_LOGIN); a.pwAt = Date.now(); ch = true; }
  }
  if (!ch) return null;
  const nl = list.slice();
  nl[i] = a;
  return Object.assign({}, meta, { [key]: nl });
}

/** 서버: 로그인 · 로그아웃 때 — 체험 계정이면 처음 상태로 (했으면 true · 실패해도 로그인 · 로그아웃은 그대로) */
async function reset(kind, id) {
  if (!(kind === "partner" && id === AFF_ID) && !(kind === "media" && id === MD_ID)) return false;
  for (let i = 0; i < 3; i++) {
    const row = await store.getDoc("meta");
    if (!row || !row.v) return false;
    const list = (kind === "partner" ? row.v.affiliates : row.v.media) || [];
    if (!list.some((x) => isDemo(kind, x))) return false;
    const nv = resetMeta(row.v, kind);
    if (!nv || (await store.writeDoc("meta", nv, row.ver)) !== false) break;
  }
  // 체험 영업 패밀리가 ‘강사 추천하기’로 남긴 입점 문의 (마스터 › 강사 입점 문의에 쌓이지 않게)
  if (kind === "partner") {
    const rows = await store.listDocs({ prefixes: ["inq:%"] });
    for (const r of rows) if (r && r.v && r.v.affId === AFF_ID && r.v.byPartner === true) await store.writeDoc(r.k, null, r.ver).catch(() => false);
  }
  return true;
}

module.exports = { AFF_ID, MD_ID, AFF_LOGIN, MD_LOGIN, AFF_BASE, MD_BASE, affAccount, mdAccount, isDemo, resetMeta, reset };
