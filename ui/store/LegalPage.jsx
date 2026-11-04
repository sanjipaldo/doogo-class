"use client";
/* 약관 및 정책 (/terms · /privacy · /refund · #/vod/legal/<키>) — 예전 vod.js pageLegal(k) 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 * 약관 본문(legal.js → legalBody)은 글에서 만든 HTML 이라 본문 상자(article)는 예전 HTML 그대로 (Raw) · 목차 · 사업자 정보 · 탭은 React
 * 검색 · 공유 미리보기(제목 · 설명 · 대표 주소 · 검색용 안내 글)는 서버가 예전처럼 넣어요 (app/(react)/layout.js → pagemeta) */
import { useEffect } from "react";
import Shell from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { VOD, DB, hash, storeRoute } from "../lib/legacy.js";

export default function LegalPage({ n, moved }) {
  const X = VOD(), r = storeRoute();
  let k = r.path[0] === "legal" ? r.path[1] : r.path[0];
  if (!X.LEGAL_TABS.some((x) => x[0] === k)) k = "terms";
  const L = (window.CLASS_LEGAL || {})[k] || ["", ""], tab = X.LEGAL_TABS.find((x) => x[0] === k);
  const lines = String(L[1] || "").split("\n"), m = /^시행일:\s*(.+)$/.exec(lines[0] || ""), text = m ? lines.slice(1).join("\n") : L[1] || "";
  let no = 0; const doc = X.legalBody(k, text).replace(/<h4>/g, () => '<h4 id="lg-s' + (++no) + '">');
  const heads = text.split("\n").filter((x) => x.indexOf("## ") === 0).map((x) => x.slice(3).trim());
  const S = DB().siteInfo ? DB().siteInfo() : {}, url = "www.doogoclass.com/" + k, esc = DB().esc, ic = window.icon;
  const biz = [["상호", S.company || "(주)두고홀딩스"], S.ceo && ["대표", S.ceo], S.bizNo && ["사업자등록번호", S.bizNo], S.mailOrderNo && ["통신판매업신고", S.mailOrderNo], S.address && ["주소", S.address], S.phone && ["고객센터", S.phone], ["이메일", S.email || "doogobiz@gmail.com"], S.privacyOfficer && ["개인정보 보호책임자", S.privacyOfficer]].filter(Boolean);
  // 본문 상자: 제목 · 시행일 · 주소 · 인쇄 + 약관 글 (예전과 같은 HTML)
  const article = '<article class="vd-lg-doc" aria-labelledby="vd-lg-t"><div class="vd-lg-top"><h2 id="vd-lg-t">' + esc(tab[1]) + '</h2><div class="vd-lg-meta">' + (m ? "<span>" + ic("calendar", "xs") + "시행일 " + esc(m[1]) + "</span>" : "") + "<span>" + ic("link", "xs") + esc(url) + '</span><button type="button" class="vd-lg-print" data-v="print">' + ic("printer", "xs") + "인쇄</button></div></div>" + doc + "</article>";
  const jump = (id) => { const s = document.getElementById(id); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" }); };
  useEffect(() => {
    document.title = (tab[1] || "약관") + " | 두고클래스 DOOGO CLASS";
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", hash()); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved, tab]);
  return (
    <Shell nav="legal" tab="" n={n}>
      <div className="vd-wrap vd-lg">
        <header className="vd-lg-h"><p className="vd-tpg-k">DOOGO CLASS POLICY</p><h1 className="vd-h1">약관 및 정책</h1><p>두고클래스를 이용하기 전에 꼭 확인해 주세요. 탭마다 주소가 따로 있어 그대로 공유할 수 있어요.</p></header>
        <nav className="vd-lg-tabs" aria-label="약관 및 정책">{X.LEGAL_TABS.map((x) => <a key={x[0]} href={"#/" + x[0]} className={x[0] === k ? "on" : ""} aria-current={x[0] === k ? "page" : undefined}><Icon n={x[2]} c="sm" /><span>{x[1]}</span></a>)}</nav>
        <div className="vd-lg-grid"><RawOne html={article} onClick={(e) => { if (e.target.closest && e.target.closest("[data-v='print']")) window.print(); }} />
          <aside className="vd-lg-side">{heads.length > 2 ? <div className="vd-lg-toc"><b>목차</b>{heads.map((h, i) => <button key={i} type="button" data-v="jump" data-to={"lg-s" + (i + 1)} onClick={() => jump("lg-s" + (i + 1))}>{h}</button>)}</div> : null}
            <div className="vd-lg-biz"><b>사업자 정보</b><dl>{biz.map((x) => [<dt key={x[0] + "t"}>{x[0]}</dt>, <dd key={x[0] + "d"}>{x[1]}</dd>])}</dl></div></aside></div></div>
    </Shell>
  );
}
