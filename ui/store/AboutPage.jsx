"use client";
/* DOOGO CLASS 소개 (/vod/about) — 예전 vod.js pageAbout 을 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  · 글 · 그림 칸은 예전 화면이 그린 모양 그대로 옮겼어요 (손으로 옮겨 적지 않고 예전 화면 출력을 JSX 로 바꿔서 — 틀린 글자가 없게)
 *  · 움직이는 곳만 React: 숫자(수강생 · 강사 · 클래스 · 후기 평균) · 흐르는 줄 멈춤 · 슬라이드 · 강사진 카드
 *  · 슬라이드 몇 번째 · 흐르는 줄 멈춤은 예전처럼 다른 화면에 다녀와도 남아요 (VOD.abUi)
 *  · 검색 · 공유 미리보기는 서버가 예전처럼 넣어요 (app/(react)/layout.js → pagemeta) */
import { Fragment, useEffect, useState } from "react";
import Shell from "./Shell.jsx";
import { TcCard } from "./TeachersPage.jsx";
import SysMock from "./Mocks.jsx";
import Icon from "../lib/Icon.jsx";
import { Eg, useMotion } from "../lib/motion.jsx";
import { VOD } from "../lib/legacy.js";

const TITLE = "DOOGO CLASS — 돈 되는 클래스";
const lines = (t) => String(t || "").split("\n").map((x, i) => <Fragment key={i}>{i ? <br /> : null}{x}</Fragment>);
function Stat({ n, unit, label }) {
  return <div><b><i data-count={n}>{Number(n).toLocaleString()}</i>{unit}</b><span>{label}</span></div>;
}

export default function AboutPage({ n, moved }) {
  const X = VOD(), { ps, tl, learners, avg } = X.aboutView();
  const [sl, setSl] = useState(() => ({ i: X.abUi().slide, k: 0 }));
  const [mq, setMq] = useState(() => ({ p: X.abUi().paused, t: false }));
  const slide = (d) => setSl((s) => ({ i: X.abUi({ slide: (s.i + d + X.AB_SLIDES.length) % X.AB_SLIDES.length }).slide, k: s.k + 1 }));
  const mqFlip = () => setMq((s) => ({ p: X.abUi({ paused: !s.p }).paused, t: true }));
  useMotion(n, moved);
  useEffect(() => {
    document.title = TITLE;
    if (window.applyStudentTheme) window.applyStudentTheme(null);
    try { sessionStorage.setItem("dc:last", window.ROUTE.hash); } catch (e) { /* 기억만 못 해요 */ }
    if (moved) window.scrollTo(0, 0);
  }, [n, moved]);
  return (
    <Shell nav="about" tab="" n={n}>
      <div className="ab">
        <section className="ab-hero">
          <div className="vd-wrap">
            <div className="ab-hero-in">
              <div><p className="ab-dot"><i />돈 되는 노하우를, 체계적으로</p><Eg as="h1">돈 되는 일,<br />DOOGO CLASS에서<br />배워봐.</Eg></div>
              <div className="ab-hero-r" data-rv="">
                <b>돈은 더 벌고 싶은데,<br />어디서부터 시작할지 막막하다면.</b>
                <p>쇼핑몰 · 마케팅 · AI · 재테크까지.<br />직접 해서 번 사람의 노하우를,<br /><strong>끝까지 가는 학습 시스템</strong>으로 배워요.</p>
                <div className="ab2-cta"><a className="vd-btn vd-btn-dark" href="#/vod/c/all">{"클래스 둘러보기 "}<Icon n="arrowRight" c="xs" /></a><a className="ab2-ghost" href="#/vod/teachers">강사진 보기</a></div>
              </div>
            </div>
            <div className="ab2-stats" data-rv-kids="">
              <Stat n={learners} unit="명+" label="누적 수강생" /><Stat n={tl.length} unit="명" label="강의 중인 강사" /><Stat n={ps.length} unit="개" label="지금 열린 클래스" />
              {avg ? <div><b>{avg.toFixed(1)}<small> / 5</small></b><span>수강 후기 평균</span></div> : null}
            </div>
          </div>
        </section>
        <section className={"ab-mq" + (mq.p ? " paused" : "")} aria-label="DOOGO CLASS 슬로건">
          <div className="ab-mq-track" aria-hidden="true" style={mq.t ? { animationPlayState: mq.p ? "paused" : "running" } : undefined}>{[0, 1, 2, 3].map((k) => <Fragment key={k}><span>따라 하면</span><i>✳</i><span>바로 쓰는</span><i>✳</i><span>실전 노하우</span><i>✳</i><span className="en">DOOGO CLASS</span><i>✳</i></Fragment>)}</div>
          <button type="button" data-v="ab-mq" aria-pressed={String(mq.p)} onClick={mqFlip}>{mq.p ? "움직임 다시 켜기" : "움직임 멈추기"}</button>
        </section>
        <section className="ab-sec">
          <div className="vd-wrap ab-why">
            <p className="ab-k" data-rv="fade">DOOGO CLASS를 만든 이유</p>
            <Eg as="h2">강의는 넘쳐나는데,<br /><span data-accent="">왜 내 통장은 그대로일까?</span></Eg>
            <p data-rv="">유튜브에도, 블로그에도 ‘월 1000 버는 법’은 넘쳐나요.<br />그런데 막상 따라 해 보면, 어디서 막히는지는 아무도 알려주지 않죠.</p>
            <ul className="ab2-pain" data-rv="">
              <li style={{ "--sd": ".15s" }}><span>듣고 나면 끝나는 강의</span></li>
              <li style={{ "--sd": ".45s" }}><span>막혀도 물어볼 곳이 없는 강의</span></li>
              <li style={{ "--sd": ".75s" }}><span>자료는 알아서 찾아야 하는 강의</span></li>
            </ul>
            <p data-rv="">{"DOOGO CLASS는 이 세 가지를 "}<b>시스템으로</b>{" 풀었어요."}<br />직접 해서 번 사람이 가르치고, 끝까지 가도록 강의실이 함께 움직여요.</p>
          </div>
        </section>
        <section className="ab-sec ab-gray ab-field">
          <div className="vd-wrap">
            <div className="ab-team-h">
              <div><p className="ab-team-k"><b>DOOGO</b><span>DOOGO CLASS를 만드는 팀</span></p><Eg as="h2">혼자 공부하면 멈추지만,<br />함께 하면 끝까지 가니까.</Eg></div>
              <p data-rv="">(주)두고홀딩스는 두잉고를 운영하며<br />강사님과 수강생이 기수로 함께 달리는<br />과제 · 피드백 · 라이브 Q&A를 이어왔어요.<br />온라인에서 시작한 배움이 실제 매출로 이어지는 현장에도 함께 갔어요.</p>
            </div>
            <div className="ab-feat" data-rv="">
              <div className="ab-feat-t">
                <small>DOOGO CLASS의 원칙</small>
                <b>“배움은 결국<br />실행으로 증명된다.”</b>
                <p>강의를 듣는 데서 끝나지 않도록, 강의실에 자료 · AI 조교 · 1:1 코칭을 붙인 이유예요.</p>
                <a href="#/doinggo">두잉고 기수 강의 알아보기 ↗</a>
              </div>
              <div className="ab-feat-ph"><img src="assets/vod/intro-speaker.webp" alt="오프라인 세미나에서 강의하는 모습 (AI 예시 이미지)" loading="lazy" /><span>DOOGO CLASS 오프라인 세미나</span></div>
            </div>
            <figure className="ab-wide" data-rv="">
              <img src="assets/vod/intro-audience.webp" alt="강의를 듣는 수강생들 (AI 예시 이미지)" loading="lazy" />
              <figcaption><span>함께 듣고, 서로의 실행을 응원하는 자리</span><span>DOOGO CLASS Alumni</span></figcaption>
            </figure>
            <div className="ab-trio" data-rv-kids="">
              <figure><img src="assets/vod/intro-panel.webp" alt="경험을 나누는 대화 (AI 예시 이미지)" loading="lazy" /><b>경험을 나누는 대화</b><span>현장에서 직접 묻고, 바로 답을 들었어요.</span></figure>
              <figure><img src="assets/vod/intro-field.webp" alt="직접 찾아간 산지 (AI 예시 이미지)" loading="lazy" /><b>직접 찾아간 산지</b><span>귤밭에서 생산부터 출고까지 함께 봤어요.</span></figure>
              <figure><img src="assets/vod/intro-workshop.webp" alt="같이 하는 실습 (AI 예시 이미지)" loading="lazy" /><b>같이 하는 실습</b><span>상세페이지를 그 자리에서 함께 고쳐 봤어요.</span></figure>
            </div>
            <div className="ab-story" data-rv="">
              <p>첫 주문의 설렘도, 해 보고 나서야 알게 된 실수도.<br />누군가의 경험이 다른 사람의 첫걸음이 되길 바랐어요.</p>
              <h3>이제 그 노하우를,<br />누구나 언제든 볼 수 있게.</h3>
              <p>기수 강의를 기다리지 않아도, 큰 결심을 하지 않아도.<br />궁금한 분야 하나부터 원하는 기간 동안 몇 번이든 볼 수 있는 곳.</p>
              <b>그래서, DOOGO CLASS를 만들었어요.</b>
              <small>사진은 서비스 이해를 돕기 위한 AI 예시 이미지예요.</small>
            </div>
          </div>
        </section>
        <section className="ab2-pr">
          <div className="vd-wrap">
            <p className="ab2-k" data-rv="fade">WHY DOOGO CLASS</p>
            <Eg as="h2">돈을 내고 들을 이유,<br /><span data-accent="">세 가지</span>로 증명해요.</Eg>
            <div className="ab2-pr-g" data-rv-kids="">
              <article className="ab2-pc"><span className="ab2-pc-n">01</span><small>검증된 강사</small><b>직접 해서 번 사람만 가르쳐요.</b><p>이론만 아는 사람이 아니라, 지금도 그 일로 돈을 버는 사람이에요. 강의를 열기 전에 실제 경험과 결과를 함께 확인해요.</p></article>
              <article className="ab2-pc"><span className="ab2-pc-n">02</span><small>단계별 커리큘럼</small><b>처음부터 첫 매출까지, 순서대로.</b><p>준비 → 실행 → 판매 → 확장. 무엇부터 해야 할지 고민하지 않도록, 해 본 순서 그대로 Part를 나눴어요.</p></article>
              <article className="ab2-pc"><span className="ab2-pc-n">03</span><small>끝까지 가는 시스템</small><b>듣고 끝나지 않게, 끝까지.</b><p>진도 · 강의 노트 · 수업 자료 · AI 조교 · 강사님 1:1 코칭까지. 혼자 멈추지 않도록 강의실이 같이 움직여요.</p></article>
            </div>
          </div>
        </section>
        <section className="ab-sec ab2-sys">
          <div className="vd-wrap">
            <p className="ab-dot"><i />결제한 순간부터 첫 성과까지</p>
            <Eg as="h2">DOOGO CLASS VOD는<br /><span data-accent="">이렇게</span>{" 배워요."}</Eg>
            <p className="ab-sub" data-rv="">{"영상만 보고 끝나는 VOD가 아니에요. 결제하면 강사님의 "}<b>두잉고 강의실</b>이 열리고,<br />끝까지 가는 데 필요한 도구가 함께 열려요.</p>
            <div className="ab2-rows">
              <div className="ab2-row" data-rv="">
                <div className="ab2-row-t"><small>01 · 두잉고 강의실</small><b>결제하면 바로 열리는 나만의 강의실</b><p>영상 · 진도 · 이어 보기 · 완료 표시를 한 곳에서. 어디까지 들었는지 기억하지 않아도, 들어가면 멈춘 곳부터 이어져요.</p></div>
                <div className="ab2-row-m">
                  <div className="vd-mk vd-mk-room vd-mk-lg" aria-hidden="true"><SysMock k="room" /></div>
                </div>
              </div>
              <div className="ab2-row rev" data-rv="">
                <div className="ab2-row-t"><small>02 · 수업 자료 · 템플릿</small><b>강사님이 실제로 쓰는 자료를 그대로</b><p>교재 PDF · 마진 계산기 · 체크리스트 · 템플릿까지. 보고 끝나는 게 아니라, 받은 자료로 바로 따라 해요.</p></div>
                <div className="ab2-row-m">
                  <div className="vd-mk vd-mk-files vd-mk-lg" aria-hidden="true"><SysMock k="files" /></div>
                </div>
              </div>
              <div className="ab2-row" data-rv="">
                <div className="ab2-row-t"><small>03 · 강의 노트</small><b>중요한 장면은 시간과 함께 메모</b><p>영상 속 그 장면으로 바로 돌아가는 타임라인 메모. 다 듣고 나면 나만의 실행 노트가 남아요.</p></div>
                <div className="ab2-row-m">
                  <div className="vd-mk vd-mk-note vd-mk-lg" aria-hidden="true"><SysMock k="note" /></div>
                </div>
              </div>
              <div className="ab2-row rev" data-rv="">
                <div className="ab2-row-t"><small>04 · 24시간 AI 조교</small><b>막히는 순간, 밤 12시에도 바로 질문</b><p>강의 내용을 아는 AI 조교가 바로 답해요. 더 깊은 고민은 1:1 코칭권으로 강사님께 직접 물어볼 수 있어요.</p></div>
                <div className="ab2-row-m">
                  <div className="vd-mk vd-mk-ai vd-mk-lg" aria-hidden="true"><SysMock k="ai" /></div>
                </div>
              </div>
              <div className="ab2-row" data-rv="">
                <div className="ab2-row-t">
                  <small>05 · 강사님 1:1 코칭 · TEA TIME</small>
                  <b>강의를 만든 강사님께, 내 사업을 직접 물어봐요</b>
                  <p>1:1 코칭권으로 내 상품 · 내 상황에 맞는 답을 받고, TEA TIME으로 강사님을 직접 만나요. 영상만 보고 혼자 헤매지 않게, 막히는 지점에서 사람이 답해요.</p>
                </div>
                <div className="ab2-row-m">
                  <div className="vd-mk vd-mk-coach vd-mk-lg" aria-hidden="true"><SysMock k="coach" /></div>
                </div>
              </div>
            </div>
            <p className="ab-cmp-note" data-rv="fade">화면은 이해를 돕기 위한 예시예요. 자료 · 노트 · 코칭 구성은 클래스마다 달라요.</p>
          </div>
        </section>
        <section className="ab-sec ab-gray">
          <div className="vd-wrap">
            <p className="ab-dot"><i />수강 여정</p>
            <Eg as="h2">고르는 순간부터<br /><span data-accent="">첫 매출</span>까지.</Eg>
            <ol className="ab2-road" data-rv="">
              <li style={{ "--k": "0" }}><span>01</span><b>미리보기로 맛보기</b><p>강의마다 미리보기 영상으로 나에게 맞는지 먼저 확인해요.</p></li>
              <li style={{ "--k": "1" }}><span>02</span><b>결제하면 바로 시작</b><p>결제 즉시 두잉고 강의실이 열려요. 기다릴 필요 없어요.</p></li>
              <li style={{ "--k": "2" }}><span>03</span><b>Part별로 따라 하기</b><p>순서대로 듣고, 자료로 실습하고, 노트에 남겨요.</p></li>
              <li style={{ "--k": "3" }}><span>04</span><b>막히면 바로 질문</b><p>AI 조교에게 묻고, 필요하면 1:1 코칭으로 강사님께.</p></li>
              <li style={{ "--k": "4" }}><span>05</span><b>강사님과 첫 매출까지</b><p>1:1 코칭 · TEA TIME으로 강사님과 점검하며, 배운 그대로 첫 매출에 도전해요.</p></li>
            </ol>
          </div>
        </section>
        <section className="ab-sec">
          <div className="vd-wrap">
            <p className="ab-dot"><i />무료 영상과 무엇이 다른가요</p>
            <Eg as="h2">혼자 1년 헤맬 길을,<br /><span data-accent="">해 본 사람의 지도</span>로.</Eg>
            <p className="ab-sub" data-rv="">무료 영상은 ‘무엇을’ 알려 주지만, ‘어떤 순서로 · 무엇을 가지고 · 막히면 어떻게’까지는 알려 주지 않아요.<br />{"DOOGO CLASS에서 사는 건 영상이 아니라, "}<b>헤매는 시간을 줄여 주는 시스템</b>이에요.</p>
            <div className="ab2-cmp" data-rv="">
              <table>
                <thead>
                  <tr>
                    <th scope="col"><span className="vd-sr">비교 항목</span></th>
                    <th scope="col">유튜브<br />무료 영상</th>
                    <th scope="col">일반 VOD<br />플랫폼</th>
                    <th scope="col" className="us">DOOGO<br />CLASS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ "--k": "0" }}>
                    <th scope="row">처음부터 첫 매출까지, 순서대로 짠 커리큘럼</th>
                    <td className="m"><i className="ab2-tri" aria-hidden="true">△</i><span className="vd-sr">일부</span></td>
                    <td className="y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "1" }}>
                    <th scope="row">직접 해서 번 강사의 실제 화면 · 사례</th>
                    <td className="m"><i className="ab2-tri" aria-hidden="true">△</i><span className="vd-sr">일부</span></td>
                    <td className="m"><i className="ab2-tri" aria-hidden="true">△</i><span className="vd-sr">일부</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "2" }}>
                    <th scope="row">실제로 쓰는 자료 · 템플릿 · 계산기</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="m"><i className="ab2-tri" aria-hidden="true">△</i><span className="vd-sr">일부</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "3" }}>
                    <th scope="row">막힐 때 물어볼 곳 (AI 조교 · 1:1 코칭)</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "4" }}>
                    <th scope="row">강사님 1:1 코칭 · TEA TIME</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "5" }}>
                    <th scope="row">진도 · 강의 노트</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "6" }}>
                    <th scope="row">강의 업데이트 소식</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                  <tr style={{ "--k": "7" }}>
                    <th scope="row">수강 기간 선택 (180일 · 365일 · 3년) · 연장</th>
                    <td className="n"><i className="ab2-x" aria-hidden="true" /><span className="vd-sr">없어요</span></td>
                    <td className="m"><i className="ab2-tri" aria-hidden="true">△</i><span className="vd-sr">일부</span></td>
                    <td className="us y"><Icon n="check" c="sm" /><span className="vd-sr">있어요</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="ab-cmp-note" data-rv="fade">유튜브 무료 영상 · 일반 VOD 플랫폼: 보통의 경우를 뜻해요. 채널 · 서비스마다 제공 범위는 다를 수 있어요.</p>
          </div>
        </section>
        <section className="ab-sec ab-beige">
          <div className="vd-wrap">
            <div className="ab-car ab2-car">
              <div className="ab-car-l"><Eg as="h2">필요한 것만,<br />필요한 만큼.</Eg><p data-rv="">실제로 어떻게 하는지, 무엇부터 시작할지.<br />해 본 사람의 화면과 사례로 배우고, 바로 따라 해요.</p></div>
              <div className="ab-car-r" data-rv="">
                <div key={sl.k} className={"ab-card" + (sl.k ? " in" : "")} aria-live="polite"><small>{String(sl.i + 1).padStart(2, "0")} / 03</small><b>{X.AB_SLIDES[sl.i][0]}<br />{X.AB_SLIDES[sl.i][1]}</b><p>{lines(X.AB_SLIDES[sl.i][2])}</p></div>
                <div className="ab-car-ctl">
                  <small>{String(sl.i + 1).padStart(2, "0")} / 03</small>
                  <button type="button" data-v="ab-slide" data-d="-1" aria-label="이전" onClick={() => slide(-1)}>←</button>
                  <button type="button" data-v="ab-slide" data-d="1" aria-label="다음" onClick={() => slide(1)}>→</button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="ab-sec">
          <div className="vd-wrap">
            <p className="ab-dot"><i />강의를 듣고 나면</p>
            <Eg as="h2">무엇을 팔고,<br />어떻게 시작할지.</Eg>
            <p className="ab-sub" data-rv="">어떤 상품을 고르고, 어디서 고객을 만나고, 어떻게 첫 매출을 내는지.<br />직접 해 본 사람에게 배웁니다.</p>
            <h3 className="ab-h3" data-rv="">배우고 나면, 이런 것들이 보이도록.</h3>
            <div className="ab-three" data-rv-kids="">
              <div><small>01</small><b>무엇을 팔면 될까?</b><p>시장과 상품을 고르는 기준,<br />마진이 남는 구조를 알아봐요.</p></div>
              <div><small>02</small><b>실제로 어떻게 할까?</b><p>공급처 연락부터 첫 광고까지,<br />해 본 사람의 화면으로 봐요.</p></div>
              <div><small>03</small><b>나는 무엇부터?</b><p>필요한 돈과 시간을 계산하고,<br />이번 주에 할 첫 행동을 정해요.</p></div>
            </div>
            <p className="ab-note">클래스별 내용 · 수강 기간 · 준비물은 상세 페이지에서 확인해 주세요.</p>
          </div>
        </section>
        <section className="ab-sec ab-beige">
          <div className="vd-wrap ab-split">
            <div><p className="ab-dot"><i />가볍게 배우되, 알아야 할 것은 충분히</p><Eg as="h2">환상만 키우는 강의보다,<br /><span data-accent="">실행에 도움이 되는</span>{" 강의."}</Eg></div>
            <ul data-rv-kids="">
              <li><b>수강료 밖의 비용까지</b><p>시작에 드는 도구 · 재고 · 광고비와 들여야 할 시간도 함께 알려줘요.</p></li>
              <li><b>잘된 결과 뒤의 과정까지</b><p>실패했던 상품, 막혔던 순간까지 솔직하게 보여줘요.</p></li>
              <li><b>7일 안, 듣기 전이면 전액 환불</b><p>결제 후 7일 이내 · 강의를 재생하지 않았다면 전액 돌려드려요. 환불 기준은 상세 페이지에 그대로 적어 둬요.</p></li>
              <li><b>수입은 약속하지 않아요</b><p>결과는 실행과 시장에 따라 달라져요. 대신 시작하는 방법은 분명하게 담아요.</p></li>
            </ul>
          </div>
        </section>
        {tl.length ? <>
        <section className="ab-sec ab2-tch">
          <div className="vd-wrap">
            <div className="ab2-tch-h">
              <div><p className="ab-dot"><i />이 사람들에게 배워요</p><Eg as="h2">직접 해서 번 사람만<br /><span data-accent="">가르칩니다.</span></Eg></div>
              <a className="ab2-more" href="#/vod/teachers">{"강사진 전체보기 "}<Icon n="arrowRight" c="xs" /></a>
            </div>
            <div className="vd-teach-g" data-rv-kids="">{tl.slice(0, 4).map((t, i) => <TcCard key={t.iid} t={t} i={i} />)}</div>
          </div>
        </section>
        </> : null}
        <section className="ab-sec ab-gray">
          <div className="vd-wrap">
            <Eg as="h2">경험이 강의가 되고,<br />누군가의 첫 매출로 이어져요.</Eg>
            <p className="ab-sub" data-rv="">DOOGO CLASS 크리에이터는 직접 해서 번 경험과 노하우를 강의로 나누는 사람이에요.</p>
            <div className="ab-flow" data-rv-kids="">
              <div className="ab-fc"><small>01</small><b>크리에이터</b><strong>노하우를 강의로 만들어요.</strong><p>강의 자료를 준비하고,<br />촬영과 질문 답변에 참여해요.</p></div>
              <i className="ab-arrow">→</i>
              <div className="ab-fc hl"><small>02</small><b>DOOGO CLASS</b><strong>강의를 알리고,<br />판매 · 운영을 맡아요.</strong><p>상세페이지와 광고를 만들고,<br />결제 · 수강 관리 · 정산까지 맡아요.</p></div>
              <i className="ab-arrow">→</i>
              <div className="ab-fc"><small>03</small><b>수강생</b><strong>내 첫 매출을 만들어요.</strong><p>수강 기간 동안 보고 따라 하며,<br />강의실 도구로 끝까지 가요.</p></div>
            </div>
            <div className="ab-reward ab-why3" data-rv="">
              <b>{"그래서, 배우는 사람은 "}<span data-accent="">DOOGO CLASS</span>를 골라요.</b>
              <div>
                <div><small>직접 해서 번 강사</small><strong>지금도 그 일로 버는 사람에게 배워요.</strong><p>이론만 아는 사람이 아니라, 실제 화면과 숫자로 보여 주는 강사만 모셔요.</p></div>
                <div><small>보고 끝나지 않는 강의실</small><strong>자료 · AI 조교 · 1:1 코칭까지.</strong><p>듣다 막히면 바로 묻고, 받은 자료로 그 자리에서 따라 해요.</p></div>
                <div><small>부담 없이 시작</small><strong>미리보기로 먼저 확인해요.</strong><p>결제 후 7일 이내 · 재생 전이면 전액 환불. 나에게 맞는지 보고 시작해요.</p></div>
              </div>
              <a href="#/vod/c/all">지금 클래스 둘러보기 ↗</a>
            </div>
          </div>
        </section>
        <section className="ab-dark">
          <div className="vd-wrap">
            <p data-rv="fade">새로운 일을 해 보고 싶은 마음을,<br />다음으로 미루지 않도록.</p>
            <b data-rv="">“부업 해 보고 싶은데 뭐부터 하지?”</b>
            <b className="lime" data-rv="" style={{ "--d": ".25s" }}>“DOOGO CLASS에서 찾아봐.”</b>
            <small data-rv="fade">그 말이 자연스럽게 나오는 곳을 만들고 있어요.</small>
            <a className="ab2-final" href="#/vod/c/all" data-rv="" style={{ "--d": ".4s" }}>{"지금 클래스 둘러보기 "}<Icon n="arrowRight" c="xs" /></a>
          </div>
        </section>
        <section className="ab-join">
          <div className="vd-wrap">
            <div><b>크리에이터로 함께해요.</b><p>직접 해서 번 경험과 노하우를 강의로 나누는 사람,<br />DOOGO CLASS 크리에이터를 찾습니다.</p></div>
            <a className="vd-btn vd-btn-p" href="#/vod/partners">두고 파트너스 지원하기 ↗</a>
          </div>
        </section>
      </div>
    </Shell>
  );
}
