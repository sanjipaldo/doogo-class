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
import { InsVodCal, InsVodSettle, Coaching, TeaTime, OpsNotices } from "./VodPages2.jsx";
import { Coaches, Partners, Library, Motivation, Replays, Showcase, Glossary, NotePrompts } from "./Content2.jsx";
import { MasterHome, MasterInstructors, MasterStudents } from "./Master.jsx";
import { MasterHealth, MasterNotices, MasterSite, MasterData, MasterCalendar, MasterSla, MasterReports } from "./Master2.jsx";
import { MasterDc, MasterVodMembers, MasterVodInquiries } from "./MasterDc.jsx";
import { MasterVodHome, MasterVodDisplay, MasterVodClasses } from "./MasterStore.jsx";
import { MasterVodRefund, MasterVodShip, MasterVod } from "./MasterOrders.jsx";
import { MasterCrm, MasterCrmSeg, MasterCrmMsg, MasterCrmReport } from "./MasterCrm.jsx";
import { MasterMedia, MasterMediaRs, MasterMediaPay } from "./MasterMedia.jsx";
import { MasterBilling, MasterPlan } from "./MasterBilling.jsx";
import { Menus, InsMenus } from "./Menus.jsx";
import { MasterCerts, MasterContracts, MasterStaff, MasterRs } from "./MasterOps.jsx";
import { PPAGES } from "./Partner.jsx";
import { MDPAGES } from "./MediaCenter.jsx";
import { MasterVodRank, MasterVodAds, MasterVodSettle, MasterVodRates, MasterVodSales } from "./MasterFin.jsx";
import { ADM, Isl } from "./bits.jsx";

// 강사센터 메뉴(주소 첫 칸) → 본문 — 옮긴 화면만 (screens.js 에 없는 주소는 React 로 오지 않아요)
const PAGES = { "": Dashboard, students: Students, cohorts: Cohorts, reviews: Reviews, questions: Questions, billing: Billing,
  curriculum: Curriculum, missions: Missions, schedule: Schedule, notices: Notices, faq: Faq, guide: Guide, docs: Docs, channels: Channels,
  coaches: Coaches, partners: Partners, library: Library, motivation: Motivation, replays: Replays, showcase: Showcase, glossary: Glossary, notes: NotePrompts, brand: Brand, menus: InsMenus,
  "vod-students": VodStudents, vodlink: VodLink, vod: InsVod, "vod-live": InsVodLive, "vod-cal": InsVodCal, "vod-settle": InsVodSettle, coaching: Coaching, teatime: TeaTime, "ops-notices": OpsNotices };

// 마스터 메뉴(주소 둘째 칸) → 본문 — 옮긴 화면만
const MPAGES = { "": MasterHome, instructors: MasterInstructors, students: MasterStudents, health: MasterHealth, notices: MasterNotices, site: MasterSite, data: MasterData, calendar: MasterCalendar, sla: MasterSla, reports: MasterReports, dc: MasterDc, "vod-members": MasterVodMembers, "vod-inquiries": MasterVodInquiries, "vod-home": MasterVodHome, "vod-display": MasterVodDisplay, "vod-rank": MasterVodRank, "vod-ads": MasterVodAds, "vod-settle": MasterVodSettle, "vod-rates": MasterVodRates, "vod-sales": MasterVodSales, "vod-refund": MasterVodRefund, "vod-ship": MasterVodShip, vod: (p) => <MasterVod {...p} moved={MPAGES} />, "vod-classes": MasterVodClasses, "vod-crm": MasterCrm, "vod-seg": MasterCrmSeg, "vod-msg": MasterCrmMsg, "vod-crm-rp": MasterCrmReport, "vod-media": MasterMedia, "vod-media-rs": MasterMediaRs, "vod-media-pay": MasterMediaPay, billing: MasterBilling, plan: MasterPlan, menus: Menus, certs: MasterCerts, contracts: MasterContracts, staff: MasterStaff, rs: MasterRs };

export default function Center({ n, h }) {
  const A = ADM(), p = A.last || A.prep();
  useEffect(() => {
    if (p.login) return;
    const main = document.getElementById("a-main"); if (!main) return;
    A.labelTables(main); A.ktInit(main);
    if (window.VOD && window.VOD.hydrate) window.VOD.hydrate(main);
    if (p.area === "partner") A.notifyPartnerSide();
    if (p.area === "center") { if (p.master) { if (A.staffMe()) A.staffStrip(main); A.notifyBills(); A.notifyPartnerMsgs(); } A.vdurFill(p.master); }
    document.title = A.pageTitle(p.area, p.master);
  }, [n, h]); // eslint-disable-line react-hooks/exhaustive-deps
  if (p.login) return <CenterLogin />;
  // 운영자(스태프) 계정은 맡지 않은 버튼을 예전 코드가 빼서(staffStrip) — 그 화면은 예전 본문 그대로 (React 가 그린 칸을 지우지 않게)
  // 파트너센터 · 온드미디어 센터: 모르는 메뉴는 예전처럼 홈으로
  const r = p.r, k0 = p.k0 || "", Page = p.area === "partner" ? PPAGES[r.parts[1] || ""] || PPAGES[""] : p.area === "media" ? MDPAGES[r.parts[1] || ""] || MDPAGES[""]
    : p.area === "center" && !p.offTrack ? (p.master ? (A.staffMe() ? null : MPAGES[r.parts[1] || ""]) : PAGES[k0]) : null;
  const strip = p.area === "center" && !p.master && !p.offTrack && A.TRK() === "vod" && A.VP_PAGES.indexOf(k0) >= 0;
  // 아직 옮기지 않은 화면 · 다른 영역 안내 화면은 예전 본문 HTML 그대로 (React 틀 안에)
  if (!Page) return <Shell r={r} pageHtml={A.legacyPage(p)} />;
  return <Shell r={r}>{strip ? <Isl html={A.vpidStrip()} /> : null}<Page r={r} n={n} /></Shell>;
}
