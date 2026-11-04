"use client";
/* 두잉고 강의실 React 화면 (Next.js 전환 5단계) — 화면 키 dg-*(class/shared/screens.js)는 모두 이 틀로 와요
 *  · 그리기 전에 로그인 · 꺼진 메뉴 · VOD 강의실 고르기 · 테마는 예전 계산 그대로 (DGA.prep — ui/App.jsx 가 불러요)
 *  · 틀(머리띠 · 왼쪽 메뉴 · AI 조교 · 아래 메뉴)은 화면을 옮겨도 그대로 · 본문만 바뀌어요 (예전 renderShell 한 번 + main)
 *  · 화면을 옮기면 떠나는 화면 스크롤을 기억하고, 돌아오면 그 자리로 (예전 restoreScroll) */
import { useEffect, useRef, useState } from "react";
import Shell from "./Shell.jsx";
import DgHome from "./HomePage.jsx";
import { CurriculumPage, MissionsPage, NotFound } from "./Learn.jsx";
import { SchedulePage, NoticesPage, QnaPage } from "./Board.jsx";
import { DocsPage, LibraryPage, BotPage, LibGate } from "./Lib.jsx";
import { MotivationPage, ChannelsPage, PartnersPage, CertificatePage, ReplaysPage, ShowcasePage, NotesPage, GlossaryPage, CustomPage } from "./More.jsx";
import { DGA, DBX, st } from "./bits.jsx";

// 메뉴(주소 첫 칸) → 본문 — 옮긴 화면만 (나머지는 아직 예전 화면 · screens.js 에 없는 주소는 React 로 오지 않아요)
const PAGES = { home: DgHome, curriculum: CurriculumPage, missions: MissionsPage, schedule: SchedulePage, notices: NoticesPage, qna: QnaPage, docs: DocsPage, library: LibraryPage, bot: BotPage,
  motivation: MotivationPage, channels: ChannelsPage, partners: PartnersPage, certificate: CertificatePage, replays: ReplaysPage, showcase: ShowcasePage, notes: NotesPage, glossary: GlossaryPage, page: CustomPage };

export default function Classroom({ n, h, moved }) {
  const X = DGA(), S = st(), r = X.route(), top = r.parts[0], key = window.ROUTE.hash;
  const prev = useRef(null), [gate, setGate] = useState(false);
  // 떠나는 화면의 스크롤 기억 (그리기 전에 — 아직 예전 화면이 보일 때)
  if (prev.current !== key) { X.memo(prev.current, key); }
  const Page = PAGES[top] || NotFound;
  useEffect(() => {
    const was = prev.current; prev.current = key;
    const nav = X.NAV().find((x) => x.id === r.parts[0] && (x.id !== "page" || x.sub === r.parts[1]));
    document.title = (nav ? X.navLabel(nav) + " · " : "") + S.D.brand.name;
    const main = document.getElementById("main");
    if (main && window.VOD && window.VOD.hydrate) window.VOD.hydrate(main);
    // 자료실: 다른 메뉴에서 들어올 때마다 이용 안내 팝업 (예전처럼 다시 그리면 닫혀요)
    const from = X.leave(top);
    if (top === "library" && from !== "library") { setGate(true); document.body.classList.add("lib-gated"); }
    else { setGate(false); document.body.classList.remove("lib-gated"); }
    if (was !== key) X.restoreScroll(was, key);
    // 마진 계산기로 오면 계산기가 보이게 (예전 render)
    if (was !== key) { const c = document.getElementById("calc"); if (c) c.scrollIntoView({ block: "start" }); }
    if (DBX().vdur && DBX().vdur.paint) DBX().vdur.paint(main);
  }, [n, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const gateOk = () => { document.body.classList.remove("lib-gated"); setGate(false); };
  return <Shell r={r} hkey={key} n={n}><Page r={r} n={n} moved={moved} h={h} />{gate ? <LibGate onClose={gateOk} /> : null}</Shell>;
}
