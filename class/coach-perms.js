/* 코치 메뉴 권한 (2026-11) — 강사센터 화면(admin.js · db.js)과 서버(api/_lib)가 같은 표를 써요
 *
 *  코치마다 담당 두잉고(track)를 정해요
 *    live  LIVE 두잉고 코치: 기수 · 주차 · 과제로 운영하는 프로그램 (수강생 관리 · 과제 검수 · 1:1 요청 …)
 *    vod   VOD 두잉고 코치: DOOGO CLASS에서 VOD를 산 수강생 (VOD 수강생 · 1:1 코칭 · TEA TIME · 매출 보기 …)
 *    both  둘 다
 *  담당이 아닌 쪽 메뉴는 체크해 두어도 열리지 않아요 (화면도 서버도 이 표로 확인해요).
 *  VOD 강의실 꾸미기 메뉴는 LIVE 메뉴와 이름이 같아도 열쇠가 따로예요(v-). LIVE 코치는 VOD 강의실을, VOD 코치는 LIVE 강의실을 고치지 못해요.
 *  예전 코치(담당 칸 없음): VOD 메뉴가 하나라도 있으면 both, 없으면 live 로 읽어요. both 면 예전처럼 같은 이름의 VOD 강의실 메뉴도 열어요.
 */
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.COACH = make();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  // [열쇠, 메뉴 이름, 설명]
  const LIVE = [
    ["운영", [["students", "수강생 관리", "승인 · 기수 이동 · 탈퇴"], ["cohorts", "기수 관리", "기수 만들기 · 일정"], ["reviews", "과제 검수", "과제 피드백 · 승인 · 보완 요청"], ["questions", "1:1 요청 답변", "수강생 1:1 요청 · 오류 신고 답변"]]],
    ["수강생 화면 콘텐츠", [["brand", "기본 정보 · 색상 · AI 조교"], ["menus", "메뉴 구성"], ["guide", "시작 가이드 · 빠른 이동"], ["curriculum", "주차별 강의 (커리큘럼)"], ["replays", "라이브 다시보기"], ["missions", "과제 · 미션"], ["showcase", "모범 과제"], ["notes", "학습 노트 질문"], ["schedule", "수업 캘린더"], ["notices", "클래스 소식 (공지)"], ["faq", "FAQ · 자주 묻는 질문"], ["docs", "실무 체크리스트"], ["glossary", "용어 사전"], ["library", "강의 자료함"], ["motivation", "응원 영상"], ["channels", "1:1 상담 채널"], ["partners", "제휴 혜택"], ["pages", "추가 메뉴"]]],
    ["홍보", [["free", "무료강의 페이지"], ["landing", "강사 소개 페이지"]]]
  ];
  const VOD = [
    ["운영", [["vod-students", "VOD 수강생", "VOD 구매자 진도 · 두잉고 입장"], ["coaching", "1:1 코칭 답변", "코칭권을 산 VOD 수강생의 1:1 문의 답변"], ["teatime", "TEA TIME 신청", "희망 날짜를 보고 일정 확정 · 진행 완료"]]],
    ["매출 (보기만)", [["vod", "VOD 판매 내역", "판매 · 주문 · 후기 (구매자 이름은 가려요)"], ["vod-live", "무료 LIVE · 온/오프라인 판매", "신청자 · 좌석 · 매출"], ["vod-settle", "판매 정산", "월별 정산 명세서 (정산 계좌 · 세금계산서는 강사님만)"], ["vod-cal", "정산 달력", "날짜별 판매 · 정산 금액"]]],
    ["VOD 강의실 꾸미기", [["vodlessons", "VOD 강의 · 수업 자료", "비메오 링크 · 강의 노트 · PDF"], ["v-brand", "기본 정보 · 색상 · AI 조교", "LIVE 두잉고와 함께 써요"], ["v-menus", "메뉴 구성"], ["v-guide", "시작 가이드 · 빠른 이동"], ["v-notices", "업데이트 소식"], ["v-faq", "FAQ · 자주 묻는 질문"], ["v-docs", "실습 체크리스트"], ["v-glossary", "용어 사전"], ["v-library", "강의 자료함"], ["v-motivation", "응원 영상"], ["v-channels", "1:1 상담 채널"], ["v-partners", "제휴 혜택"], ["v-pages", "추가 메뉴"]]]
  ];
  const TRACKS = [["live", "LIVE 두잉고", "기수 · 주차 · 과제"], ["vod", "VOD 두잉고", "DOOGO CLASS VOD 수강생"], ["both", "둘 다", "LIVE + VOD"]];
  const keysOf = (groups) => groups.reduce((a, g) => a.concat(g[1].map((x) => x[0])), []);
  const LIVE_KEYS = keysOf(LIVE), VOD_KEYS = keysOf(VOD), ALL = LIVE_KEYS.concat(VOD_KEYS);
  // 강의실 콘텐츠(content 문서)를 고치는 메뉴 — LIVE 쪽 / VOD 강의실 쪽(content.vod · content.vodBy)
  const LIVE_CONTENT = LIVE[1][1].map((x) => x[0]).filter((k) => k !== "menus").concat(["free", "landing"]);
  const VOD_CONTENT = VOD[2][1].map((x) => x[0]).filter((k) => /^v-/.test(k) && k !== "v-menus");
  // VOD 매출 · 운영 메뉴: 그 강사 클래스의 주문(이름 가림)을 읽어요
  const VOD_ORDERS = ["vod-students", "coaching", "teatime", "vod", "vod-live", "vod-settle", "vod-cal"];
  const DEFAULT = { live: ["reviews", "questions"], vod: ["coaching", "teatime"], both: ["reviews", "questions", "coaching", "teatime"] };
  const OLD_VOD = ["vod-students", "coaching", "teatime", "vodlessons"];
  const isTrack = (t) => t === "live" || t === "vod" || t === "both";

  /** 코치의 담당 두잉고 (live · vod · both) */
  function trackOf(c) {
    if (!c) return "live";
    if (isTrack(c.track)) return c.track;
    return (Array.isArray(c.perms) ? c.perms : []).some((k) => OLD_VOD.indexOf(k) >= 0) ? "both" : "live";
  }
  /** 실제로 열리는 메뉴 열쇠 — 담당 밖 · 모르는 열쇠는 빼요 */
  function permsOf(c) {
    if (!c) return [];
    const t = trackOf(c), raw = (Array.isArray(c.perms) ? c.perms : []).map(String), out = raw.slice();
    if (!isTrack(c.track) && t === "both") raw.forEach((k) => { if (VOD_KEYS.indexOf("v-" + k) >= 0) out.push("v-" + k); });
    const ok = t === "live" ? LIVE_KEYS : t === "vod" ? VOD_KEYS : ALL;
    return out.filter((k, i) => ok.indexOf(k) >= 0 && out.indexOf(k) === i);
  }
  /** 강사센터 메뉴(경로 첫 칸) → 확인할 열쇠: VOD 쪽에서 LIVE와 이름이 같은 강의실 메뉴는 v- 열쇠 */
  const keyFor = (page, vod) => (vod && VOD_KEYS.indexOf("v-" + page) >= 0 ? "v-" + page : page);
  /** 메뉴 이름 (v- 열쇠는 ‘VOD ’를 붙여서) */
  function labelOf(k) {
    for (const g of LIVE) for (const x of g[1]) if (x[0] === k) return x[1];
    for (const g of VOD) for (const x of g[1]) if (x[0] === k) return x[1];
    return k;
  }
  const sideOf = (k) => (VOD_KEYS.indexOf(k) >= 0 ? "vod" : LIVE_KEYS.indexOf(k) >= 0 ? "live" : "");
  const has = (perms, list) => (perms || []).some((k) => list.indexOf(k) >= 0);

  /** 코치가 이 종류의 문서를 서버에 보낼 수 있는지 (서버는 문서 안에서 맡은 칸만 다시 골라 받아요) */
  function canWrite(type, perms) {
    if (type === "ins") return has(perms, ["menus", "v-menus"]) || has(perms, VOD_CONTENT);
    if (type === "content") return has(perms, LIVE_CONTENT) || has(perms, VOD_CONTENT);
    if (type === "cohorts") return has(perms, ["cohorts"]);
    if (type === "stu") return has(perms, ["students"]);
    if (type === "prog") return has(perms, ["reviews", "questions", "students", "coaching"]);
    if (type === "meta") return has(perms, ["vodlessons"]);
    if (type === "vo") return has(perms, ["teatime"]);
    return false;
  }
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const take = (out, n, k) => { if (n[k] === undefined) delete out[k]; else out[k] = clone(n[k]); };
  /** 코치가 보낸 강의실 콘텐츠(content 문서)에서 맡은 쪽만: LIVE 칸 / VOD 강의실(vod · vodBy) / 기본 정보(brand: LIVE 콘텐츠 코치 또는 v-brand) */
  function fixContent(o, n, perms) {
    if (!o || n == null || typeof n !== "object") return clone(o);
    const live = has(perms, LIVE_CONTENT), vod = has(perms, VOD_CONTENT), brand = live || has(perms, ["v-brand"]);
    const out = clone(o);
    Object.keys(Object.assign({}, o, n)).forEach((k) => { if (k === "vod" || k === "vodBy" ? vod : k === "brand" ? brand : live) take(out, n, k); });
    return out;
  }
  /** 코치가 보낸 강사 계정(ins 문서)에서 메뉴 구성만: LIVE 메뉴(menu) / VOD 강의실 메뉴(menuVod · menuVodBy)
   *  VOD 강의실 콘텐츠 코치는 메뉴 권한이 없어도 처음 여는 VOD 강의실의 메뉴(공통 VOD 메뉴 복사)는 만들 수 있어요 */
  function fixIns(o, n, perms) {
    if (!o || n == null || typeof n !== "object") return clone(o);
    const out = clone(o);
    if (has(perms, ["menus"])) take(out, n, "menu");
    if (has(perms, ["v-menus"])) { take(out, n, "menuVod"); take(out, n, "menuVodBy"); }
    else if (has(perms, VOD_CONTENT) && n.menuVodBy && typeof n.menuVodBy === "object") {
      Object.keys(n.menuVodBy).forEach((pid) => { if (!out.menuVodBy || !out.menuVodBy[pid]) { out.menuVodBy = out.menuVodBy || {}; out.menuVodBy[pid] = clone(n.menuVodBy[pid]); } });
    }
    return out;
  }
  return { LIVE, VOD, TRACKS, LIVE_KEYS, VOD_KEYS, LIVE_CONTENT, VOD_CONTENT, VOD_ORDERS, DEFAULT, trackOf, permsOf, keyFor, labelOf, sideOf, has, canWrite, fixContent, fixIns };
});
