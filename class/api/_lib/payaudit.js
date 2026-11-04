/* 결제 대조 (배포 빌드 기록에만 — scripts/db-build.js · Next.js 전환 4단계 4-2 · 2026-11)
 * 포트원으로 결제한 주문을 포트원의 실제 결제와 하나씩 맞춰 봐요. 읽기만 해요 (주문 · 결제를 고치지 않아요).
 *  · 같은 결제(paymentId)로 산 주문 묶음마다: 주문 상태 ↔ 포트원 상태 · 주문 금액 합계 = 포트원 결제 금액 · 환불 합계 = 포트원 취소 금액 · 상점 아이디
 *  · 결과에는 주문 번호 · 결제수단 · 상태 · 금액만 적어요 (이름 · 연락처 · 카드 번호는 적지 않아요)
 *  · 맞지 않는 게 있으면 마스터 › 결제 › 주문의 ‘포트원 결제 조회’로 맞출 수 있어요 (vod-pay pgInfo) */
"use strict";
const store = require("./store");
const portone = require("./portone");

const PG = portone.PG_METHOD_KEYS;
const sum = (xs, f) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);

/** 주문 묶음 + 포트원 결제(없으면 null · 404) → { verdict: "ok" | "open" | "bad", why } */
function judge(orders, pay) {
  const st = orders.map((o) => o.status), total = sum(orders, (o) => o.amount), refunded = sum(orders.filter((o) => o.status === "refunded"), (o) => o.refundAmount);
  const all = (s) => st.every((x) => s.indexOf(x) >= 0);
  if (!pay) return all(["ready", "failed"]) ? { verdict: "open", why: "결제창만 열고 끝내지 않음 (포트원에 결제 없음)" } : { verdict: "bad", why: "주문은 " + st.join("/") + " 인데 포트원에 결제가 없어요" };
  const a = pay.amount || {}, ps = String(pay.status || "");
  if (process.env.PORTONE_STORE_ID && pay.storeId && pay.storeId !== process.env.PORTONE_STORE_ID) return { verdict: "bad", why: "다른 상점의 결제예요" };
  // 입금 전에 취소한 가상계좌 주문: 서버가 계좌를 말소해요 (포트원 상태는 말소 · 취소 · 발급 그대로일 수 있어요) — 그런데 돈이 들어왔으면 환불이 필요해요
  if (all(["canceled"])) return ps === "PAID" || Number(a.paid || 0) > 0 ? { verdict: "bad", why: "입금 전에 취소한 주문인데 포트원에는 입금됐어요 — 환불이 필요해요" } : { verdict: "ok", why: "입금 전 취소 (가상계좌 말소)" };
  if (ps === "PAID" || ps === "PARTIAL_CANCELLED" || ps === "CANCELLED") {
    if (Number(a.total) !== total) return { verdict: "bad", why: "금액이 달라요 (주문 " + total + " · 포트원 " + a.total + ")" };
    if (Number(a.cancelled || 0) !== refunded) return { verdict: "bad", why: "취소 금액이 달라요 (주문 환불 " + refunded + " · 포트원 취소 " + (a.cancelled || 0) + ")" };
    if (ps === "PAID" && !all(["paid"])) return { verdict: "bad", why: "포트원은 결제 완료인데 주문은 " + st.join("/") };
    if (ps === "CANCELLED" && !all(["refunded"])) return { verdict: "bad", why: "포트원은 전액 취소인데 주문은 " + st.join("/") };
    if (ps === "PARTIAL_CANCELLED" && !(st.indexOf("refunded") >= 0)) return { verdict: "bad", why: "포트원은 부분 취소인데 주문에 환불이 없어요" };
    return { verdict: "ok", why: ps === "PAID" ? "결제 완료" : ps === "CANCELLED" ? "전액 취소 · 환불" : "부분 취소 · 환불" };
  }
  if (ps === "VIRTUAL_ACCOUNT_ISSUED") return all(["pending"]) ? { verdict: "ok", why: "가상계좌 입금 대기" } : { verdict: "bad", why: "가상계좌 발급인데 주문은 " + st.join("/") };
  if (ps === "READY" || ps === "FAILED" || ps === "PAY_PENDING") return all(["ready", "failed", "canceled"]) ? { verdict: "open", why: "결제를 끝내지 않음 (" + ps + ")" } : { verdict: "bad", why: "포트원은 " + ps + " 인데 주문은 " + st.join("/") };
  return { verdict: "bad", why: "알 수 없는 포트원 상태 " + ps };
}

/** 최근 포트원 결제 n 건을 대조 → { checked, ok, open, bad, rows: [{ no, method, status, amount, verdict, why }] } */
async function audit(n) {
  if (!portone.on()) return { off: true };
  const rows = (await store.listDocs({ prefixes: ["vo:%"] })).map((r) => r.v).filter((o) => o && o.paymentId && PG.indexOf(o.method) >= 0);
  const by = new Map();
  rows.forEach((o) => { const k = o.paymentId; if (!by.has(k)) by.set(k, []); by.get(k).push(o); });
  const groups = Array.from(by.entries()).sort((x, y) => Math.max(...y[1].map((o) => o.createdAt || 0)) - Math.max(...x[1].map((o) => o.createdAt || 0))).slice(0, n || 30);
  const out = { checked: 0, ok: 0, open: 0, bad: 0, rows: [] };
  for (const [pid, orders] of groups) {
    let pay = null;
    try { pay = await portone.getPayment(pid); } catch (e) { if (e && e.status === 404) pay = null; else { out.rows.push({ no: orders[0].no, method: orders[0].method, verdict: "bad", why: "포트원 조회 실패 (" + ((e && e.status) || "network") + ")" }); out.bad++; out.checked++; continue; } }
    const j = judge(orders, pay);
    out.checked++; out[j.verdict]++;
    out.rows.push({ no: orders.map((o) => o.no).join("+"), method: orders[0].method, status: orders.map((o) => o.status).join("/"), amount: sum(orders, (o) => o.amount), pg: pay ? String(pay.status || "") : "없음", verdict: j.verdict, why: j.why });
  }
  return out;
}

module.exports = { audit, judge };
