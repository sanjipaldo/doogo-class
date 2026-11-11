/* GET /api/vod-config — 화면에 ‘무엇이 연결됐는지’만 알려 줘요 (비밀 값은 보내지 않아요)
 *  auth      VOD_SERVER_AUTH=1 이면 이메일 가입 · 로그인을 서버가 해요 (비밀번호는 서버에만 암호화 저장)
 *  kakao     카카오 키 3개(REST · Client Secret · Redirect URI)가 있으면 진짜 카카오 로그인
 *  toss      토스페이먼츠 클라이언트 키 · 시크릿 키가 있으면 진짜 결제창 (클라이언트 키는 공개 값 · 시크릿 키는 절대 안 보내요 — _lib/toss.js)
 *            { ck(클라이언트 키), mode: "window"(결제창 · 우리 화면에서 수단 고르기) | "widget"(결제창형 · 토스 창에서 고르기), methods, vbankHours, variant, test(시험 키) }
 *            test: 시험 키예요 · live: 운영 사이트인데 시험 키(토스 심사용) — 결제 화면에 ‘실제로 결제되지 않아요’ 안내
 *  turnstile Turnstile 사이트 키 (비밀 키도 있을 때만)
 *  bankAuto  페이액션 키 3개가 있으면 무통장 입금을 24시간 자동 확인 (결제 화면 안내 문구가 바뀌어요) */
"use strict";
const { send, handler } = require("./_lib/http");
const kakao = require("./_lib/kakao");
const toss = require("./_lib/toss");
const payaction = require("./_lib/payaction");

module.exports = handler(["GET"], async (req, res) => {
  const e = process.env, auth = e.VOD_SERVER_AUTH === "1";
  send(res, 200, { cfg: {
    auth,
    kakao: auth && kakao.on(),
    toss: auth && toss.on() ? { ck: toss.ck(), mode: toss.mode(), methods: toss.methods(), vbankHours: toss.vbankHours(), variant: toss.variant(), test: toss.testKey(), live: toss.testOnLive() } : null,
    turnstile: e.TURNSTILE_SITE_KEY && e.TURNSTILE_SECRET ? e.TURNSTILE_SITE_KEY : "",
    bankAuto: auth && payaction.auto()
  } });
});
