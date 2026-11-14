"use client";
/* 패밀리 탭 (/vod/partners — 기본 탭) = 온드미디어팀 + 두잉고 세일즈팀 — 예전 vod.js pageFamily 를 React 로 (2026-11-14)
 *  · 글 · 숫자는 예전 화면과 같은 곳(VOD().familyView() — 온드미디어 · 두잉고 세일즈 소개서에서 옮긴 값)에서 받아요 → 두 화면 글이 어긋나지 않게
 *  · 화면 구조는 예전 화면(pageFamily)과 똑같이 그려요 (e2e react.js 가 #root 구조를 비교해요)
 *  · 합류는 지원서 대신 카카오톡 채널 · 소개서 버튼은 링크(familyView().deck)가 있을 때만 · 체험 계정은 강사센터 로그인 ‘마스터 · 패밀리’ 탭으로 */
import { KakaoBtn } from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { Eg } from "../lib/motion.jsx";
import { VOD, won } from "../lib/legacy.js";
import { jump, faqOne, useFloat } from "./ptKit.jsx";

const MS = "assets/partners/";
/** 섹션 틀 (예전 ptSec 과 같은 모양) */
function Sec({ id, eb, h, sub, cls, children }) {
  return <section className={"pt-sec" + (cls ? " " + cls : "")} id={id || undefined}><div className="vd-wrap"><div className="pt-sec-h" data-rv=""><small>{eb}</small><h2>{h}</h2>{sub ? <p>{sub}</p> : null}</div>{children}</div></section>;
}
/** 단계 줄 (온드미디어 3단계 · 두잉고 세일즈 4단계) */
function Steps({ list, cls }) {
  return <ol className={"fm-steps " + cls} data-rv-kids="">{list.map((x, i) => <li key={i}><span className="fm-step-n">{"STEP " + String(i + 1).padStart(2, "0")}</span><span className="fm-step-ic"><Icon n={x[0]} c="sm" /></span><b>{x[1]}</b><p>{x[2]}</p></li>)}</ol>;
}
/** 센터 화면 모양 (숫자 없는 그림) — 온드미디어 센터: 내 홍보 링크 · 패밀리센터: 입점 진행 5단계 */
function Mock({ k }) {
  if (k === "md") return <div className="fm-mock"><div className="fm-mock-h"><b>내 홍보 링크</b><span><Icon n="copy" c="xs" />전체 복사</span></div>{["VOD 강의 A", "VOD 강의 B", "전자책 C"].map((t, i) => <div key={t} className="fm-mk-link" style={{ "--k": String(i) }}><span><b>{t}</b><small>doogoclass.com/vod/p/…?rs=내코드</small></span><em>복사</em></div>)}</div>;
  return <div className="fm-mock"><div className="fm-mock-h"><b>입점 진행</b><span><Icon n="refresh" c="xs" />실시간</span></div><ol className="fm-mk-steps">{["문의 접수", "열람", "두잉고 상담", "계약 완료", "플랫폼 오픈"].map((t, i) => <li key={t} className={i < 3 ? "done" : i === 3 ? "now" : ""} style={{ "--k": String(i) }}><i>{i < 3 ? <Icon n="check" c="xs" /> : null}</i>{t}</li>)}</ol></div>;
}

export default function Family() {
  const X = VOD(), F = X.familyView(), flt = useFloat();
  const deck = (k, cls, label) => (F.deck[k] ? <a className={cls} href={F.deck[k]} target="_blank" rel="noopener"><Icon n="file" c="sm" /><span>{label + " 보기"}</span><Icon n="arrowUpRight" c="xs" /></a> : null);
  const top = F.grow[F.grow.length - 1];
  return (
    <>
      <section className="pt-hero fm-hero">
        <i className="pt-hero-bg" aria-hidden="true"><b /><b /></i>
        <div className="vd-wrap pt-hero-in">
          <div className="pt-hero-tx">
            <span className="pt-eyebrow"><Icon n="users" c="xs" />DOOGO CLASS FAMILY</span>
            <Eg as="h1">알리고 연결하는 힘이,<br />새로운 <span data-accent="">수익</span>이 돼요.</Eg>
            <p data-rv="">온드미디어팀은 DOOGO CLASS 강의를 내 채널로 알리고,<br />두잉고 세일즈팀은 강사님께 두잉고를 소개해요. 성과는 투명하게 나눠요.</p>
            <div className="pt-hero-btns" data-rv="">
              <KakaoBtn cls="vd-btn vd-btn-xl pt-btn-w" label="패밀리 합류 상담하기" />
              <button type="button" className="vd-btn vd-btn-xl pt-btn-line" data-v="jump" data-to="fm-teams" onClick={() => jump("fm-teams")}>두 팀 살펴보기</button>
            </div>
            <small className="pt-hero-note" data-rv=""><Icon n="check" c="xs" />가입비 · 유지비 0원 · 개인 · 사업자 모두 가능</small>
          </div>
          <div className="pt-hero-vis" aria-hidden="true">
            <span className="pt-orb" />
            <span className="pt-orb pt-orb2" />
            <img className="pt-mascot fm-mascot" src={MS + "mascot-cheer.webp"} alt="" width="420" height="454" fetchPriority="high" />
            <span className="pt-prop pt-pr1"><Icon n="coins" c="sm" /></span>
            <span className="pt-prop pt-pr2"><Icon n="link" c="sm" /></span>
            <span className="pt-prop pt-pr3"><Icon n="sparkles" c="sm" /></span>
            <span className="pt-prop pt-pr4"><Icon n="megaphone" c="sm" /></span>
            <span className="pt-chip pt-chip1"><Icon n="monitorPlay" c="xs" />온드미디어 RS 10~20%</span>
            <span className="pt-chip pt-chip2"><Icon n="handshake" c="xs" />두잉고 세일즈 20%</span>
            <span className="pt-chip pt-chip3"><Icon n="calendar" c="xs" />매월 10일 정산</span>
          </div>
        </div>
      </section>
      <section className="pt-strip"><div className="vd-wrap pt-strip-in" data-rv-kids="">{F.strip.map((x) => <div key={x[1]} className="pt-st"><Icon n={x[0]} c="sm" /><b>{x[1]}</b><small>{x[2]}</small></div>)}</div></section>
      <Sec id="fm-teams" eb="TWO TEAMS" h="패밀리는 두 팀으로 함께해요" sub="내 활동에 맞는 팀을 골라 시작하세요. 두 팀 모두 가입비 없이 시작하고, 매월 10일에 정산해요." cls="fm-teams-sec">
        <div className="fm-teams" data-rv-kids="">{F.teams.map((t) => (
          <article key={t.k} className={"fm-team fm-team-" + t.k}>
            <div className="fm-team-h"><span className="fm-team-ic"><Icon n={t.ic} c="sm" /></span><small>{t.eb}</small><h3>{t.name}</h3><p>{t.lead}</p></div>
            <div className="fm-team-rate"><b>{t.rate}</b><span>{t.rateSub}</span></div>
            <ul className="fm-team-pts">{t.pts.map((p) => <li key={p}><Icon n="check" c="xs" /><span>{p}</span></li>)}</ul>
            <div className="fm-team-btns"><button type="button" className="vd-btn fm-team-more" data-v="jump" data-to={t.to} onClick={() => jump(t.to)}>{t.more}<Icon n="arrowRight" c="xs" /></button>{deck(t.deck, "vd-btn fm-team-deck", t.deckLabel)}</div>
          </article>
        ))}</div>
      </Sec>
      <Sec id="fm-media" eb="OWNED MEDIA · 온드미디어팀" h={<>운영 중인 채널은 그대로,<br />링크로 수익을 더해요.</>} sub="새 콘텐츠를 따로 만들 필요 없이, VOD마다 주어지는 내 홍보 링크를 이미 운영 중인 채널에 붙이면 돼요." cls="fm-media">
        <Steps list={F.mdSteps} cls="fm-steps-3" />
        <div className="fm-rs" data-rv="">
          <div className="fm-tiers">{F.tiers.map((x, i) => <div key={x[0]} className={"fm-tier" + (i ? " hi" : "")}><small>{x[0]}</small><b>RS <em>{x[1] + "%"}</em></b><span>{x[2]}</span></div>)}<p className="fm-note">{"RS = (판매가 − 환불) × (1 − PG " + F.pg + "%) × RS율 · 10원 아래 버림"}</p></div>
          <div className="fm-sim">
            <div className="fm-sim-h"><small>기대 수익 예시</small><b>50만 원 VOD가 내 링크로<br />하루 4건 팔린다면?</b></div>
            <div className="fm-sim-rows">{F.sim.map((s, i) => <div key={s.rate} className={"fm-sim-r" + (i ? " hi" : "")}><span className="fm-sim-k">{"RS " + s.rate + "%"}</span><span className="fm-sim-v"><small>1건 팔리면</small><b>{won(s.one)}</b></span><span className="fm-sim-v"><small>하루 4건</small><b>{won(s.day)}</b></span></div>)}</div>
            <p className="fm-note">{"500,000원 × (1 − PG " + F.pg + "%) × RS율 · 예시 금액이며 수익을 보장하지 않아요"}</p>
          </div>
        </div>
        <div className="fm-chans"><b className="fm-sub">이런 분이라면 누구나</b><div className="fm-chan-g" data-rv-kids="">{F.chans.map((x) => <div key={x[1]} className="fm-chan"><span><Icon n={x[0]} c="sm" /></span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div><div className="fm-tags">{F.mdTags.map((t) => <span key={t} className="fm-tag"><Icon n="check" c="xs" />{t}</span>)}</div></div>
      </Sec>
      <Sec id="fm-sales" eb="DOINGGO SALES · 두잉고 세일즈팀" h={<>강사님을 소개하면,<br />기수마다 이용료의 20%.</>} sub="두잉고는 강사와 수강생을 끝까지 잇는 기수제 강의 플랫폼이에요. 아는 강사님께 두잉고를 소개하고, 그 강사님이 기수를 열 때마다 RS를 받아요." cls="fm-sales">
        <Steps list={F.slSteps} cls="fm-steps-4" />
        <div className="fm-grow" data-rv="">
          <div className="fm-eq"><small>예) 1기수 이용료가 240만 원이면</small><div className="fm-eq-row"><span>240만 원</span><i>×</i><span>20%</span><i>=</i><b>48만 원</b></div><p>강사님이 다음 기수를 열 때마다 다시 생겨요</p><div className="fm-eq-k">{["1기", "2기", "3기"].map((k) => <span key={k}><b>{k}</b>+48만 원</span>)}<span className="more">…</span></div></div>
          <div className="fm-bars"><b className="fm-sub">A · B 강사님을 소개했다면? (예시)</b><div className="fm-bars-g">{F.grow.map((v, i) => <div key={i} className="fm-bar" style={{ "--h": Math.round(v / top * 100) + "%", "--k": String(i) }}><em>{won(v)}</em><i /><span>{i + 1 + "기까지"}</span></div>)}</div>
            <p className="fm-note">{F.growRows.map((x) => x[0] + " 이용료 " + x[1] / 10000 + "만 원").join(" · ") + " → 기수마다 RS " + won(F.per) + " · 예시 금액이며 수익을 보장하지 않아요"}</p></div>
        </div>
        <div className="fm-sl-bot">
          <div className="fm-who"><b className="fm-sub">이런 분들께 소개해 주세요</b><div className="fm-who-g">{F.slWho.map((t) => <span key={t} className="fm-chip">{t}</span>)}</div></div>
          <div className="fm-vs" data-rv=""><table><thead><tr><th scope="col">구분</th><th scope="col">일반 소개비</th><th scope="col" className="on">두잉고 패밀리</th></tr></thead><tbody>{F.vs.map((r) => <tr key={r[0]}><th scope="row">{r[0]}</th><td>{r[1]}</td><td className="on">{r[2]}</td></tr>)}</tbody></table></div>
        </div>
      </Sec>
      <Sec id="fm-center" eb="TRANSPARENT" h={<>숨길 게 없어서,<br />체험 계정을 그대로 공개해요.</>} sub="두 팀 모두 개별 아이디 · 비밀번호로 센터에 들어가 판매 · RS · 정산서를 실시간으로 확인해요. 합류하기 전에 먼저 둘러보세요." cls="fm-centers">
        <div className="fm-ctrs" data-rv-kids="">{F.centers.map((c) => (
          <div key={c.k} className={"fm-ctr fm-ctr-" + c.k}>
            <div className="fm-ctr-vis" aria-hidden="true"><Mock k={c.k} /></div>
            <div className="fm-ctr-tx"><small>{c.team}</small><h3>{c.name}</h3><ul>{c.items.map((t) => <li key={t}><Icon n="check" c="xs" />{t}</li>)}</ul>
              <dl className="fm-demo"><div><dt>아이디</dt><dd>{c.id}</dd></div><div><dt>비밀번호</dt><dd>{c.id}</dd></div></dl>
              <a className="vd-btn fm-ctr-go" href={F.demo}>{c.name + " 둘러보기"}<Icon n="arrowRight" c="xs" /></a></div>
          </div>
        ))}</div>
        <p className="fm-demo-note"><Icon n="lock" c="xs" />강사센터 로그인 › ‘마스터 · 패밀리’ 탭에서 로그인해요 · 체험 계정은 로그인 · 로그아웃할 때 처음 상태로 돌아가요</p>
        <div className="fm-pays"><b className="fm-sub">정산은 이렇게 진행돼요</b><ol className="fm-pay" data-rv-kids="">{F.pay.map((x) => <li key={x[1]}><span className="fm-pay-ic"><Icon n={x[0]} c="sm" /></span><b>{x[1]}</b><small>{x[2]}</small></li>)}</ol></div>
      </Sec>
      <Sec id="fm-flow" eb="HOW TO JOIN" h="합류 신청부터 첫 정산까지, 이렇게 진행돼요" cls="pt-flows">
        <ol className="pt-flow" data-rv-kids="">{F.flow.map((x, i) => <li key={x[1]}><span className="pt-fl-n">{String(i + 1).padStart(2, "0")}</span><span className="pt-fl-ic"><Icon n={x[0]} c="sm" /></span><b>{x[1]}</b><p>{x[2]}</p></li>)}</ol>
        <div className="pt-flow-cta" data-rv=""><KakaoBtn cls="vd-btn vd-btn-xl pt-end-kk" label="카카오톡으로 합류 신청하기" /></div>
      </Sec>
      <section className="pt-faqs" id="fm-faq">
        <div className="vd-wrap pt-faq-w">
          <img className="pt-faq-ms" data-rv="pop" src={MS + "mascot-faq.webp"} alt="" width="380" height="408" loading="lazy" />
          <h2 className="pt-faq-h" data-rv="">자주 묻는 질문</h2>
          <div className="pt-faq" data-rv-kids="">{F.faq.map((x, i) => (
            <details key={x[0]} className="pt-faq-it" open={!i} onToggle={faqOne}>
              <summary><span>{"Q. " + x[0]}</span><Icon n="chevDown" c="sm" /></summary>
              <div className="pt-faq-a"><p>{x[1]}</p></div>
            </details>
          ))}</div>
        </div>
      </section>
      <section className="pt-end fm-end">
        <div className="vd-wrap">
          <small data-rv="">DOOGO CLASS FAMILY</small>
          <h2 data-rv="">먼저 보고,<br />{"확신이 들 때 "}<em>시작</em>하세요.</h2>
          <div className="pt-end-btns" data-rv="">
            {deck("media", "vd-btn vd-btn-xl fm-end-deck", "온드미디어 소개서")}
            {deck("sales", "vd-btn vd-btn-xl fm-end-deck", "두잉고 세일즈 소개서")}
            <KakaoBtn cls="vd-btn vd-btn-xl pt-end-kk" label="카카오톡으로 합류 상담하기" />
            <a className="vd-btn vd-btn-xl fm-end-demo" href={F.demo}><Icon n="monitorPlay" c="sm" /><span>체험 계정으로 둘러보기</span></a>
          </div>
        </div>
      </section>
      <a className={"pt-float fm-float" + (flt ? " on" : "")} href={X.opsKk().chat} target="_blank" rel="noopener" data-kk-ops="" aria-label="카카오톡으로 패밀리 합류 상담하기">
        <img src={MS + "mascot-cheer.webp"} alt="" width="48" height="52" />
        <span><small>내 채널 · 인맥이 수익으로</small><b>패밀리 합류 상담하기</b></span>
        <Icon n="arrowRight" c="sm" />
      </a>
    </>
  );
}
