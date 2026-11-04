"use client";
/* 강사센터 · 코치센터 · 마스터 · 파트너센터 · 온드미디어 센터 React 화면 (Next.js 전환 6단계) — 화면 키 ct-*(class/shared/screens.js)는 모두 이 틀로 와요
 *  · 그리기 전에 세션 · 로그인 · 역할별 주소는 예전 계산 그대로 (ADM.prep — ui/App.jsx 가 불러서 ADM.last 에 둬요)
 *  · 버튼(data-action) · 폼 · 팝업은 예전 admin.js 이벤트가 그대로 받아요 — 끝에 부르는 render() 가 React 에 다시 그리라고 알려요
 *  · 그린 뒤: 표 칸 이름(휴대폰 카드) · 대화창 · 영상 길이 · 알림 · 창 제목 (예전 render 끝부분) */
import { useEffect } from "react";
import Shell from "./Shell.jsx";
import CenterLogin from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Students from "./Students.jsx";
import Cohorts from "./Cohorts.jsx";
import Reviews from "./Reviews.jsx";
import Questions from "./Questions.jsx";
import Billing from "./Billing.jsx";
import { Curriculum, Missions, Schedule, Notices, Faq, Guide, Docs, Channels } from "./Content.jsx";
import Brand from "./Brand.jsx";
import { VodStudents, VodLink, InsVod, InsVodLive } from "./VodPages.jsx";
import { InsVodCal, InsVodSettle, Coaching } from "./VodPages2.jsx";
import { Coaches, Partners, Library, Motivation, Replays, Showcase, Glossary, NotePrompts } from "./Content2.jsx";
import { ADM, Isl } from "./bits.jsx";

// 강사센터 메뉴(주소 첫 칸) → 본문 — 옮긴 화면만 (screens.js 에 없는 주소는 React 로 오지 않아요)
const PAGES = { "": Dashboard, students: Students, cohorts: Cohorts, reviews: Reviews, questions: Questions, billing: Billing,
  curriculum: Curriculum, missions: Missions, schedule: Schedule, notices: Notices, faq: Faq, guide: Guide, docs: Docs, channels: Channels,
  coaches: Coaches, partners: Partners, library: Library, motivation: Motivation, replays: Replays, showcase: Showcase, glossary: Glossary, notes: NotePrompts, brand: Brand,
  "vod-students": VodStudents, vodlink: VodLink, vod: InsVod, "vod-live": InsVodLive, "vod-cal": InsVodCal, "vod-settle": InsVodSettle, coaching: Coaching };

export default function Center({ n, h }) {
  const A = ADM(), p = A.last || A.prep();
  useEffect(() => {
    if (p.login) return;
    const main = document.getElementById("a-main"); if (!main) return;
    A.labelTables(main); A.ktInit(main);
    if (window.VOD && window.VOD.hydrate) window.VOD.hydrate(main);
    if (p.area === "partner") A.notifyPartnerSide();
    if (p.area === "center") { if (p.master) { A.notifyBills(); A.notifyPartnerMsgs(); } A.vdurFill(p.master); }
    document.title = A.pageTitle(p.area, p.master);
  }, [n, h]); // eslint-disable-line react-hooks/exhaustive-deps
  if (p.login) return <CenterLogin />;
  const r = p.r, k0 = p.k0 || "", Page = p.area === "center" && !p.master && !p.offTrack ? PAGES[k0] : null;
  const strip = p.area === "center" && !p.master && !p.offTrack && A.TRK() === "vod" && A.VP_PAGES.indexOf(k0) >= 0;
  // 아직 옮기지 않은 화면 · 다른 영역 안내 화면은 예전 본문 HTML 그대로 (React 틀 안에)
  if (!Page) return <Shell r={r} pageHtml={A.legacyPage(p)} />;
  return <Shell r={r}>{strip ? <Isl html={A.vpidStrip()} /> : null}<Page r={r} n={n} /></Shell>;
}
