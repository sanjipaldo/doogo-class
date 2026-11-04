"use client";
/* 두고 파트너스 (/vod/partners) — 예전 vod.js pagePartners 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  · 글 · 그림은 예전 화면이 그린 모양 그대로 옮겼어요 (예전 화면 출력을 JSX 로 바꿔서 — 틀린 글자가 없게)
 *  · 움직이는 곳만 React: 강사 카드 · 분야 줄 · 대표 클래스 그림 · 이번 달 · 열 수 있는 클래스 종류 · 카카오 문의 주소
 *  · 오른쪽 아래 지원 상자는 첫 화면 · 마지막 안내 · 바닥이 안 보일 때만 · 자주 묻는 질문은 하나만 열려요 (예전 wirePt)
 *  · 검색 · 공유 미리보기는 서버가 예전처럼 넣어요 (app/(react)/layout.js → pagemeta) */
import { useEffect, useState } from "react";
import Shell, { KakaoBtn } from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { Eg, useMotion } from "../lib/motion.jsx";
import { VOD, today, storeRoute } from "../lib/legacy.js";
import PartnerApply from "./PartnerApply.jsx";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const jump = (id) => { const s = document.getElementById(id); if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" }); };
// 자주 묻는 질문: 하나를 열면 나머지는 닫혀요
const faqOne = (e) => { const d = e.currentTarget; if (d.open) document.getElementById("root").querySelectorAll(".pt-faq-it[open]").forEach((o) => { if (o !== d) o.open = false; }); };
/** 흐르는 분야 줄 (예전 ptCatRows 의 한 줄) — 10개가 넘게 이어 붙여 두 번 */
function CatRow({ list, rev }) {
  const X = VOD();
  let a = list.slice(); while (a.length && a.length < 10) a = a.concat(list);
  return <div className={"vd-chiprow pt-catrow" + (rev ? " rev" : "")} aria-hidden="true"><div className="vd-chipmq" style={{ "--dur": a.length * 4 + "s" }}>{a.concat(a).map((c, i) => <span key={i} className="pt-cat">{X.MG_IMG[c.key] ? <img src={X.tileImg(c.key)} alt="" loading="lazy" /> : <Icon n={c.icon || "layers"} c="xs" />}{c.label}</span>)}</div></div>;
}

/** /vod/partners · /vod/partners/apply */
export default function PartnersPage({ n, moved }) {
  const apply = storeRoute().path[1] === "apply";
  useMotion(n, moved);
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", window.ROUTE.hash); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved]);
  return apply ? <Shell nav="partners" tab="" cls="vd-pt-page vd-pt-gf" n={n}><PartnerApply /></Shell> : <Shell nav="partners" tab="" cls="vd-pt-page" n={n}><Partners /></Shell>;
}

function Partners() {
  const X = VOD(), { ts, cs, p0, kinds } = X.partnersView();
  const phT = (t) => t.ph || X.insPhoto(t.iid), vcTx = (t) => t.tag || ((t.ps || [])[0] || {}).title || "";
  const [flt, setFlt] = useState(false);
  // 떠 있는 지원 상자: 첫 화면 · 마지막 안내 · 바닥 중 하나라도 보이면 숨겨요
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { setFlt(true); return undefined; }
    const hide = new Set(), root = document.getElementById("root"), tg = [root.querySelector(".pt-hero"), root.querySelector(".pt-end"), root.querySelector(".vd-foot, footer")].filter(Boolean);
    const io = new IntersectionObserver((ens) => { ens.forEach((en) => { if (en.isIntersecting) hide.add(en.target); else hide.delete(en.target); }); setFlt(!hide.size); }, { threshold: 0 });
    tg.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div className="pt">
        <section className="pt-hero">
          <i className="pt-hero-bg" aria-hidden="true"><b /><b /></i>
          <div className="vd-wrap pt-hero-in">
            <div className="pt-hero-tx">
              <span className="pt-eyebrow"><Icon n="handshake" c="xs" />DOOGO PARTNERS</span>
              <Eg as="h1">직접 해서 번 노하우,<br /><span data-accent="">클래스</span>로 만들어 드려요.</Eg>
              <p data-rv="">기획 · 촬영 · 편집 · 상세페이지 · 판매 · 정산까지.<br />강사님은 노하우만 준비하세요. 나머지는 DOOGO CLASS가 함께해요.</p>
              <div className="pt-hero-btns" data-rv="">
                <a className="vd-btn vd-btn-p vd-btn-xl pt-btn-w" href="#/vod/partners/apply">두고 파트너스 지원하기<Icon n="arrowRight" c="sm" /></a>
                <button type="button" className="vd-btn vd-btn-xl pt-btn-line" data-v="jump" data-to="pt-flow" onClick={() => jump("pt-flow")}>진행 과정 보기</button>
              </div>
              <small className="pt-hero-note" data-rv=""><Icon n="clock" c="xs" />지원서 작성 3분 · 강의 경험이 없어도 괜찮아요</small>
            </div>
            <div className="pt-hero-vis" aria-hidden="true">
              <span className="pt-orb" />
              <span className="pt-orb pt-orb2" />
              <img className="pt-mascot" src="assets/partners/mascot-hero.webp" alt="" width="880" height="760" fetchPriority="high" />
              <span className="pt-prop pt-pr1"><Icon n="coins" c="sm" /></span>
              <span className="pt-prop pt-pr2"><Icon n="play" c="sm" /></span>
              <span className="pt-prop pt-pr3"><Icon n="sparkles" c="sm" /></span>
              <span className="pt-prop pt-pr4"><Icon n="megaphone" c="sm" /></span>
              <span className="pt-chip pt-chip1"><Icon n="video" c="xs" />스튜디오 촬영 지원</span>
              <span className="pt-chip pt-chip2"><Icon n="megaphone" c="xs" />판매 · 홍보는 함께</span>
              <span className="pt-chip pt-chip3"><Icon n="calendar" c="xs" />정산은 강사센터에서</span>
            </div>
          </div>
        </section>
        <section className="pt-strip">
          <div className="vd-wrap pt-strip-in" data-rv-kids="">
            <div className="pt-st"><Icon n="pen" c="sm" /><b>기획부터 함께</b><small>처음이어도 커리큘럼을 같이 잡아요</small></div>
            <div className="pt-st"><Icon n="video" c="sm" /><b>촬영 · 편집</b><small>스튜디오 · 장비 · 스태프 준비</small></div>
            <div className="pt-st"><Icon n="megaphone" c="sm" /><b>판매 · 홍보</b><small>상세페이지 · 광고 · 알림까지</small></div>
            <div className="pt-st"><Icon n="calendar" c="sm" /><b>투명한 정산</b><small>판매 · 정산을 날짜별로 확인</small></div>
          </div>
        </section>
        <section className="pt-sec pt-voices">
          <div className="vd-wrap">
            {ts.length ? <><div className="pt-sec-h pt-sec-c" data-rv=""><small>OUR CREATORS</small><h2>지금 DOOGO CLASS에서<br />강의하고 있어요</h2></div>
            <div className="pt-vc-list">{ts.map((t, i) => <a key={t.iid} className={"pt-vc " + (i % 2 ? "r" : "l")} data-rv={i % 2 ? "r" : "l"} href={X.tcView(t, i).href} style={{ "--c": X.ACC[(i + 1) % X.ACC.length] }}>
              <span className="pt-vc-av">{phT(t) ? <img src={phT(t)} alt="" loading="lazy" /> : <em>{(t.name || "D").slice(0, 1)}</em>}</span>
              <span className="pt-vc-tx"><small>{(t.cats[0] || "") + (t.cats[0] ? " · " : "") + t.name} 강사</small><b>{vcTx(t)}</b></span>
              <Icon n="chevRight" c="sm" />
            </a>)}</div></> : null}
            <div className="pt-cheer">
              <img className="pt-cheer-img" data-rv="pop" src="assets/partners/mascot-cheer.webp" alt="" width="420" height="454" loading="lazy" />
              <Eg as="h2">처음이라 막막해도 괜찮아요.<br /><span data-accent="">두고 파트너스</span>가 끝까지 함께해요.</Eg>
              <span className="pt-cheer-pill" data-rv="">노하우만 있으면 충분해요</span>
            </div>
          </div>
        </section>
        <section className="pt-sec pt-why">
          <div className="vd-wrap">
            <div className="pt-sec-h" data-rv=""><small>WHY DOOGO CLASS</small><h2>강사님은 노하우만,<br />나머지는 DOOGO CLASS가 함께해요.</h2></div>
            <div className="pt-fts">
              <div className="pt-ft">
                <div className="pt-ft-tx" data-rv=""><small>01 · 제작</small><h3>강의 자료(PPT)만<br />준비하세요.</h3><p>기획 회의부터 스튜디오 촬영 · 편집 · 썸네일 · 상세페이지까지 DOOGO CLASS 제작팀이 함께 만들어요. 처음 강의하는 분도 말하는 순서와 자료 구성을 함께 잡아 드려요.</p></div>
                <div className="pt-ft-vis" data-rv="open" aria-hidden="true">
                  <div className="pt-mock pt-mk-make">
                    <b>클래스 제작 진행</b>
                    <ol>
                      <li className="done" style={{ "--k": "0" }}><i><Icon n="check" c="xs" /></i>기획 회의 · 커리큘럼</li>
                      <li className="done" style={{ "--k": "1" }}><i><Icon n="check" c="xs" /></i>스튜디오 촬영</li>
                      <li className="done" style={{ "--k": "2" }}><i><Icon n="check" c="xs" /></i>편집 · 자막</li>
                      <li className="now" style={{ "--k": "3" }}><i />썸네일 · 상세페이지<em>진행 중</em></li>
                      <li className="" style={{ "--k": "4" }}><i />오픈</li>
                    </ol>
                    <div className="pt-mk-bar"><i /></div>
                  </div>
                </div>
              </div>
              <div className="pt-ft rev">
                <div className="pt-ft-tx" data-rv="">
                  <small>02 · 판매</small>
                  <h3>알리는 일은<br />DOOGO CLASS가 해요.</h3>
                  <p>스토어 첫 화면 · 분야별 추천 · 강사진 소개 · 오픈 알림 · 쿠폰 · 광고까지, 클래스가 팔리는 길을 함께 만들어요. 강사 페이지에는 강사님의 이야기와 모든 클래스가 모여요.</p>
                </div>
                <div className="pt-ft-vis" data-rv="open" aria-hidden="true">
                  <div className="pt-mock pt-mk-sell">
                    {p0 ? <div className="pt-mk-card"><span className="pt-mk-th"><RawOne html={X.thumbArt(p0)} /></span><b>{p0.title}</b><small>{p0.creator || ""}</small></div> : null}
                    <div className="pt-mk-tags">
                      <span className="pt-mk-tag t1"><Icon n="bell" c="xs" />오픈 알림</span>
                      <span className="pt-mk-tag t2"><Icon n="gift" c="xs" />쿠폰</span>
                      <span className="pt-mk-tag t3"><Icon n="users" c="xs" />강사 페이지</span>
                      <span className="pt-mk-tag t4"><Icon n="megaphone" c="xs" />광고</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-ft">
                <div className="pt-ft-tx" data-rv=""><small>03 · 강의실</small><h3>수강생이 끝까지<br />따라오게 만들어요.</h3><p>구매한 수강생은 두잉고 강의실에서 진도 · 수업 자료 · AI 조교 · 1:1 코칭권으로 끝까지 따라와요. 끝까지 들은 수강생의 후기가 다음 판매로 이어져요.</p></div>
                <div className="pt-ft-vis" data-rv="open" aria-hidden="true">
                  <div className="pt-mock pt-mk-room">
                    <div className="pt-mk-prog"><span>진도율</span><i><b /></i></div>
                    <ul>
                      <li style={{ "--k": "0" }}><Icon n="file" c="xs" />수업 자료 내려받기</li>
                      <li style={{ "--k": "1" }}><Icon n="bot" c="xs" />AI 조교에게 바로 질문</li>
                      <li style={{ "--k": "2" }}><Icon n="message" c="xs" />1:1 코칭권으로 피드백</li>
                      <li style={{ "--k": "3" }}><Icon n="star" c="xs" />끝까지 듣고 후기 남기기</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="pt-ft rev">
                <div className="pt-ft-tx" data-rv="">
                  <small>04 · 정산 · 업데이트</small>
                  <h3>정산은 투명하게,<br />강의는 늘 최신으로.</h3>
                  <p>강사센터에서 날짜별 판매 · 정산 예정 · 정산 내역을 언제든 확인해요. 바뀐 내용은 그 부분만 다시 찍어 업데이트하고, 수강 기간이 끝난 수강생은 재수강 할인으로 다시 만나요.</p>
                </div>
                <div className="pt-ft-vis" data-rv="open" aria-hidden="true">
                  <div className="pt-mock pt-mk-pay">
                    <div className="pt-mk-ph"><b>판매 · 정산 달력</b><span className="vd-fresh vd-fresh-upd">UPDATE<small>{String(today()).slice(2, 7).replace("-", ".")}</small></span></div>
                    <div className="pt-mk-bars">
                      <i style={{ "--h": "38%", "--k": "0" }} />
                      <i style={{ "--h": "62%", "--k": "1" }} />
                      <i style={{ "--h": "45%", "--k": "2" }} />
                      <i style={{ "--h": "80%", "--k": "3" }} />
                      <i style={{ "--h": "56%", "--k": "4" }} />
                      <i style={{ "--h": "92%", "--k": "5" }} />
                      <i style={{ "--h": "70%", "--k": "6" }} />
                    </div>
                    <div className="pt-mk-row"><span><Icon n="calendar" c="xs" />정산 예정</span><span><Icon n="refresh" c="xs" />재수강 할인</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="pt-sec pt-whos">
          <div className="vd-wrap">
            <div className="pt-sec-h" data-rv=""><small>WHO WE LOOK FOR</small><h2>이런 분을 찾고 있어요</h2></div>
            <div className="pt-who" data-rv-kids="">
              <div className="pt-who-c"><span><Icon n="trophy" c="sm" /></span><b>직접 해서 결과를 낸 분</b><p>매출 · 수익 · 성장처럼 숫자로 보여 줄 수 있는 경험이 있어요.</p></div>
              <div className="pt-who-c"><span><Icon n="users" c="sm" /></span><b>알려 주는 게 즐거운 분</b><p>내가 걸어온 길을 처음 시작하는 사람에게 차근차근 알려 줄 수 있어요.</p></div>
              <div className="pt-who-c"><span><Icon n="refresh" c="sm" /></span><b>꾸준히 다듬어 갈 분</b><p>시장이 바뀌면 강의도 바뀌어요. 최신 내용으로 업데이트할 수 있어요.</p></div>
              <div className="pt-who-c"><span><Icon n="sparkles" c="sm" /></span><b>채널이 없어도 괜찮아요</b><p>유튜브 · 블로그 · 인스타가 있으면 좋지만, 없어도 지원할 수 있어요.</p></div>
            </div>
            <div className="pt-cats" data-rv="">
              <b>이런 분야를 찾고 있어요</b>
              <span className="vd-sr">{cs.map((c) => c.label).join(", ")}</span>
              <CatRow list={cs} /><CatRow list={cs.slice().reverse()} rev />
              <span className="pt-cat pt-cat-etc"><Icon n="plus" c="xs" />그 밖의 분야도 환영해요</span>
            </div>
          </div>
        </section>
        <section className="pt-sec pt-types">
          <div className="vd-wrap">
            <div className="pt-sec-h" data-rv=""><small>WHAT YOU CAN OPEN</small><h2>이런 클래스를 열 수 있어요</h2><p>하나로 시작해도 되고, 함께 열면 수강생이 이어서 들어요.</p></div>
            <div className={"pt-kinds pt-kinds-" + kinds.length} data-rv-kids="">{kinds.map((x) => <div key={x[1]} className="pt-kind"><Icon n={x[0]} c="sm" /><b>{x[1]}</b><p>{x[2]}</p></div>)}</div>
          </div>
        </section>
        <section className="pt-sec pt-flows" id="pt-flow">
          <div className="vd-wrap">
            <div className="pt-sec-h" data-rv=""><small>HOW IT WORKS</small><h2>지원부터 오픈까지, 이렇게 진행돼요</h2></div>
            <ol className="pt-flow" data-rv-kids="">
              <li><span className="pt-fl-n">01</span><span className="pt-fl-ic"><Icon n="pen" c="sm" /></span><b>지원서 작성</b><p>3분이면 충분해요. 어떤 노하우로 어떤 결과를 냈는지 편하게 적어 주세요.</p></li>
              <li>
                <span className="pt-fl-n">02</span>
                <span className="pt-fl-ic"><Icon n="message" c="sm" /></span>
                <b>검토 · 상담</b>
                <p>담당자가 지원서를 읽고 연락드려요. 대상 · 내용 · 클래스 방향을 함께 이야기해요.</p>
              </li>
              <li><span className="pt-fl-n">03</span><span className="pt-fl-ic"><Icon n="clipboard" c="sm" /></span><b>계약 · 기획</b><p>커리큘럼 · 가격 · 촬영 일정을 함께 정하고 계약해요.</p></li>
              <li>
                <span className="pt-fl-n">04</span>
                <span className="pt-fl-ic"><Icon n="video" c="sm" /></span>
                <b>촬영 · 제작</b>
                <p>스튜디오 촬영 · 편집 · 썸네일 · 상세페이지를 DOOGO CLASS가 만들어요.</p>
              </li>
              <li><span className="pt-fl-n">05</span><span className="pt-fl-ic"><Icon n="store" c="sm" /></span><b>오픈 · 판매</b><p>스토어에 오픈하고 알려요. 판매 · 정산은 강사센터에서 바로 확인해요.</p></li>
            </ol>
            <div className="pt-flow-cta" data-rv=""><a className="vd-btn vd-btn-p vd-btn-xl" href="#/vod/partners/apply">지원서 쓰러 가기<Icon n="arrowRight" c="sm" /></a></div>
          </div>
        </section>
        <section className="pt-faqs" id="pt-faq">
          <div className="vd-wrap pt-faq-w">
            <img className="pt-faq-ms" data-rv="pop" src="assets/partners/mascot-faq.webp" alt="" width="380" height="408" loading="lazy" />
            <h2 className="pt-faq-h" data-rv="">자주 묻는 질문</h2>
            <div className="pt-faq" data-rv-kids="">
              <details className="pt-faq-it" open onToggle={faqOne}>
                <summary><span>Q. 강의를 해 본 적이 없어도 지원할 수 있나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>네. 직접 해서 낸 결과가 있다면 충분해요. 커리큘럼 · 말하는 순서 · 자료 구성은 기획 단계에서 함께 잡아 드려요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 촬영 장비나 편집은 제가 준비해야 하나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>아니요. 스튜디오 · 장비 · 촬영 스태프 · 편집 · 썸네일 · 상세페이지는 DOOGO CLASS가 준비해요. 강사님은 강의 내용과 자료(PPT)에 집중하면 돼요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 수익은 어떻게 나누고, 언제 정산받나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>정산 비율과 일정은 클래스 종류 · 제작 범위에 따라 상담에서 자세히 안내드려요. 오픈한 뒤에는 강사센터에서 날짜별 판매 · 정산 내역을 언제든 확인할 수 있어요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 전자책만 내도 되나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>네. VOD 없이 전자책(PDF) · 종이책으로도 시작할 수 있어요. 나중에 VOD를 더해 함께 판매할 수도 있어요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 강의 내용이 바뀌면 다시 찍어야 하나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>바뀐 부분만 다시 찍어 업데이트해요. 업데이트하면 상세페이지에 ‘최신 업데이트’로 보이고, 구매한 수강생에게도 알려 드려요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 다른 곳에서 강의하고 있어도 괜찮나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>괜찮아요. 지금 활동하는 곳을 지원서에 적어 주시면, 상담에서 주제 · 구성이 겹치지 않게 함께 정해요.</p></div>
              </details>
              <details className="pt-faq-it" onToggle={faqOne}>
                <summary><span>Q. 지원서를 보내면 언제 연락이 오나요?</span><Icon n="chevDown" c="sm" /></summary>
                <div className="pt-faq-a"><p>담당자가 지원서를 꼼꼼히 읽고 남겨 주신 연락처로 연락드려요. 지원이 많을 때는 조금 늦어질 수 있어요.</p></div>
              </details>
            </div>
          </div>
        </section>
        <section className="pt-end">
          <div className="vd-wrap">
            <small data-rv="">DOOGO PARTNERS</small>
            <h2 data-rv="">노하우는 이미 충분해요.<br />{"이제 "}<em>클래스</em>로 만들 차례예요.</h2>
            <div className="pt-end-btns" data-rv="">
              <a className="vd-btn vd-btn-p vd-btn-xl" href="#/vod/partners/apply">두고 파트너스 지원하기<Icon n="arrowRight" c="sm" /></a>
              <KakaoBtn cls="vd-btn vd-btn-xl pt-end-kk" label="카카오톡으로 먼저 물어보기" />
            </div>
          </div>
        </section>
        <a className={"pt-float" + (flt ? " on" : "")} href="#/vod/partners/apply" aria-label="두고 파트너스 지원하기">
          <img src="assets/partners/mascot-hero.webp" alt="" width="48" height="42" />
          <span><small>노하우를 클래스로, 첫걸음</small><b>두고 파트너스 지원하기</b></span>
          <Icon n="arrowRight" c="sm" />
        </a>
      </div>
    </>
  );
}
