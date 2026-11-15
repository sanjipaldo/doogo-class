/* 체험 계정 주문 정리 (2026-11-15 대표님 요청) — DOOGO CLASS 체험 계정(체험회원 · 회원 문서 demo: true)으로 한 주문은
 * 주문하고 1시간이 지나면 서버가 지워요 → 마스터 주문 · 결제 · 대시보드 · 매출 · 종이책 배송 · 현금영수증 목록에서 빠져요.
 *  체험 주문: 주문 문서 demo: true (vod-pay prepare 가 체험 계정 주문에 붙여요 · 처음 데이터의 체험 주문도 demo: true)
 *             + 체험 계정 회원(vm: demo true)의 주문 — 표시가 없던 예전 주문까지
 *  지우는 때: 마스터 · 운영자가 주문을 불러올 때(bootstrap · 한 서버에서 5분에 한 번까지) · 체험 계정이 로그인할 때
 *  같이: 결제 묶음(vpay:) · 체험 계정의 주문 목록(orderNos) · 그 주문에 쓴 쿠폰 · 포인트는 체험 계정에 돌려놓아요
 * 토스 라이브 키가 들어간 뒤로는 체험 계정이 유료 결제를 할 수 없어요 (vod-pay prepare) — 지워도 실제 돈이 걸린 주문이 사라지지 않게 */
"use strict";
const store = require("./store");

const AGE = 36e5;       // 1시간 지난 주문만
const GAP = 5 * 6e4;    // bootstrap 에서는 5분에 한 번까지
const DEMO_EMAIL = "vod@gmail.com"; // 공개 체험 계정 (oneoff.js vodDemoMember 와 같은 이메일)
const DEMO_MID = "vm-demo-srv";
let last = 0;
const ageOf = (o) => Number(o.createdAt) || Number(o.at) || 0;

/** 체험 계정 회원 id 들 (회원 문서가 demo: true 인 것만) */
async function demoMids() {
  const out = new Set();
  const ix = await store.getDoc("vme:" + DEMO_EMAIL), ids = [DEMO_MID].concat(ix && ix.v && ix.v.id ? [ix.v.id] : []);
  const d = await store.getDocs(ids.map((id) => "vm:" + id));
  ids.forEach((id) => { const m = (d["vm:" + id] || {}).v; if (m && m.demo === true) out.add(id); });
  return out;
}
const isDemoOrder = (o, mids) => !!o && (o.demo === true || mids.has(o.mid));

/** 정리 — opt { now, force(5분 간격 무시) } → { removed: [주문 번호], skipped? } */
async function sweep(opt) {
  opt = opt || {};
  const now = opt.now || Date.now();
  if (process.env.DC_DEMO_SWEEP === "off" && !opt.test) return { skipped: true, removed: [] }; // 화면 테스트(e2e) 서버만 끔
  if (!opt.force && now - last < GAP) return { skipped: true, removed: [] };
  last = now;
  const mids = await demoMids();
  const rows = (await store.listDocs({ prefixes: ["vo:%"] })).filter((r) => r.v && isDemoOrder(r.v, mids) && now - ageOf(r.v) >= AGE);
  if (!rows.length) return { removed: [] };
  const removed = [], byMid = {}, pays = new Set();
  for (const r of rows) {
    if ((await store.writeDoc(r.k, null, r.ver)) === false) continue; // 그새 바뀌었으면 다음 번에
    const o = r.v;
    removed.push(o.no || r.k.slice(3));
    if (o.paymentId) pays.add(o.paymentId);
    (byMid[o.mid] = byMid[o.mid] || []).push(o);
  }
  // 결제 묶음: 묶인 주문이 모두 지워졌으면 같이
  for (const p of pays) {
    const row = await store.getDoc("vpay:" + p);
    if (!row || !row.v) continue;
    const nos = Array.isArray(row.v.nos) ? row.v.nos : [], left = nos.length ? await store.getDocs(nos.map((n) => "vo:" + n)) : {};
    if (!nos.some((n) => left["vo:" + n] && left["vo:" + n].v)) await store.writeDoc("vpay:" + p, null, row.ver);
  }
  // 체험 계정: 주문 목록에서 빼고 · 그 주문에 쓴 쿠폰 · 포인트 돌려놓기 (결제 완료 · 입금 대기였던 것만 — 그때 썼어요)
  for (const mid of Object.keys(byMid)) {
    const gone = new Set(byMid[mid].map((o) => o.no)), used = byMid[mid].filter((o) => o.status === "paid" || o.status === "pending");
    for (let i = 0; i < 5; i++) {
      const row = await store.getDoc("vm:" + mid);
      if (!row || !row.v) break;
      const m = JSON.parse(JSON.stringify(row.v));
      m.orderNos = (m.orderNos || []).filter((n) => !gone.has(n));
      (m.coupons || []).forEach((c) => { if (c && c.orderNo && gone.has(c.orderNo)) { c.usedAt = null; c.orderNo = ""; } });
      const pt = used.reduce((a, o) => a + (Number(o.pointOff) || 0), 0);
      if (pt > 0) { m.points = (Number(m.points) || 0) + pt; (m.pointLog = m.pointLog || []).push({ at: now, amt: pt, why: "체험 주문 정리 · 포인트 돌려받음" }); }
      if ((await store.writeDoc("vm:" + mid, m, row.ver)) !== false) break;
    }
  }
  return { removed };
}

module.exports = { sweep, demoMids, isDemoOrder, AGE, DEMO_EMAIL, _reset: () => { last = 0; } };
