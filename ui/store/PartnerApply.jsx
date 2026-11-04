"use client";
/* 두고 파트너스 지원서 (/vod/partners/apply) — 예전 vod.js pagePartnerApply 를 React 로 (Next.js 전환 · 스토어 공개 화면)
 *  · 구글폼처럼 섹션 5개를 한 장씩 (다음 · 이전) → 보내면 완료 카드
 *  · 확인(꼭 답할 질문 · 연락처 · 이메일 모양)과 보내기는 예전 함수 그대로 (VOD.ptIssues · ptSubmit) — 화면만 React
 *  · 쓰던 내용과 보던 섹션은 이 탭에 잠깐 기억해요 (VOD.ptSaveDraft · ptSetSec — 예전 화면과 같은 저장) */
import { useRef, useState } from "react";
import { KakaoBtn } from "./Shell.jsx";
import Icon from "../lib/Icon.jsx";
import { VOD } from "../lib/legacy.js";

const MSG0 = "이 질문에 답해 주세요";

export default function PartnerApply() {
  const X = VOD(), m = X.me(), S = X.PT_SECS;
  const [d] = useState(() => X.ptDraft());
  const [cur, setCur] = useState(() => X.ptSecNow());
  const [seen, setSeen] = useState(() => ({})); // 넘겨 본 섹션 제목은 커서를 받을 수 있게 (예전 ptShow 의 tabindex)
  const [chk, setChk] = useState(() => ({})); // 확인한 질문: 이름 → { ok, msg }
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const fRef = useRef(null);
  const cs = X.cats().map((c) => c.label).concat(["기타"]);
  const val = (k, def) => (d[k] != null ? d[k] : def || "");

  /* ---------- 확인 · 섹션 넘기기 (예전 ptCheck · ptGo · ptShow) ---------- */
  const check = (n, quiet) => {
    const list = X.ptIssues(fRef.current, n);
    setChk((c) => { const o = Object.assign({}, c); list.forEach((x) => { o[x.name] = { ok: x.ok, msg: x.msg }; }); return o; });
    const first = list.find((x) => !x.ok);
    if (first && !quiet) {
      const q = first.q, el = q.querySelector("input, textarea");
      q.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el) setTimeout(() => el.focus({ preventScroll: true }), 300);
    }
    return !first;
  };
  const show = (n) => {
    X.ptSetSec(n); setCur(n); setSeen((s) => Object.assign({}, s, { [n]: true }));
    setTimeout(() => { const h = document.getElementById("pt-sh-" + n); if (h) h.focus({ preventScroll: true }); }, 350);
  };
  const go = (n) => {
    n = Math.min(5, Math.max(1, n));
    if (n > cur) for (let i = cur; i < n; i++) if (!check(i)) { if (i !== cur) show(i); return; }
    show(n);
    const pg = document.getElementById("pt-gf-prog"); if (pg) { const y = pg.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: Math.max(0, y), behavior: "smooth" }); }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (cur < 5) { go(cur + 1); return; }
    // 모든 섹션 확인 (예전처럼 확인한 질문은 맞고 틀림을 표시) — 빈 * 질문이 있는 섹션으로 데려가요
    for (let i = 1; i <= 5; i++) if (!check(i, true)) { show(i); check(i); setErr("섹션 " + i + " · " + S[i - 1][0] + "에 답하지 않은 질문이 있어요."); return; }
    setErr(""); setBusy(true);
    const r = await X.ptSubmit(fRef.current);
    if (!r.ok) { setBusy(false); setErr(r.err); return; }
    setDone(r.sum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- 질문 카드 (예전 qh · qerr · inp · area · opts) ---------- */
  // 질문 제목 · 도움말 · 틀렸을 때 문구 (함수로 불러요 — 컴포넌트로 두면 그릴 때마다 새로 만들어져요)
  const qh = (id, t, req, hint, legend) => {
    const T = legend ? "legend" : "label";
    return <><T className="pt-gf-ql" htmlFor={legend ? undefined : id}>{t}{req ? <>{" "}<em aria-label="필수">*</em></> : null}</T>{hint ? <p className="pt-gf-hint" id={id + "-h"}>{hint}</p> : null}</>;
  };
  const qerr = (id, name) => <p className="pt-gf-err" id={id + "-e"} role="alert"><Icon n="alert" c="xs" /><span>{(chk[name] && chk[name].msg) || MSG0}</span></p>;
  const qcls = (name, base) => base + (chk[name] && !chk[name].ok ? " bad" : "");
  const inv = (name) => (chk[name] ? String(!chk[name].ok) : undefined);
  const inp = (name, label, req, attrs, hint, def) => {
    const id = "pt-" + name;
    return <div className={qcls(name, "pt-gf-q")} data-q={name} data-req={req ? "" : undefined}>{qh(id, label, req, hint)}
      <input className="pt-gf-in" id={id} name={name} {...attrs} required={req ? true : undefined} aria-required={req ? "true" : undefined} aria-describedby={hint ? id + "-h" : undefined} aria-invalid={inv(name)} defaultValue={val(name, def)} />{qerr(id, name)}</div>;
  };
  const area = (name, label, req, ph, hint, rows, max) => {
    const id = "pt-" + name;
    return <div className={qcls(name, "pt-gf-q")} data-q={name} data-req={req ? "" : undefined}>{qh(id, label, req, hint)}
      <textarea className="pt-gf-in pt-gf-ta" id={id} name={name} rows={rows || 3} maxLength={max || 1500} placeholder={ph} required={req ? true : undefined} aria-required={req ? "true" : undefined} aria-describedby={hint ? id + "-h" : undefined} aria-invalid={inv(name)} defaultValue={val(name)} />{qerr(id, name)}</div>;
  };
  const opts = (name, label, req, list, multi, hint, def, cols) => {
    const v0 = multi ? (Array.isArray(d[name]) ? d[name] : def || []) : d[name] != null ? d[name] : def || "", id = "pt-" + name;
    return <fieldset className={qcls(name, "pt-gf-q pt-gf-ch")} data-q={name} data-req={req ? "" : undefined}>{qh(id, label, req, hint || (multi ? "여러 개 골라도 돼요" : ""), true)}
      <div className={"pt-gf-opts" + (cols ? " c" + cols : "")}>{list.map((x) => <label key={x} className="pt-gf-op"><input type={multi ? "checkbox" : "radio"} name={name} value={x} defaultChecked={multi ? v0.indexOf(x) >= 0 : v0 === x} /><i aria-hidden="true" /><span>{x}</span></label>)}</div>{qerr(id, name)}</fieldset>;
  };
  const nav = (n) => <div className="pt-gf-nav">{n > 1 ? <button type="button" className="pt-gf-prev" data-v="pt-sec" data-n={n - 1} onClick={() => go(n - 1)}><Icon n="arrowLeft" c="xs" />이전</button> : <span />}
    {n < 5 ? <button type="button" className="vd-btn vd-btn-p pt-gf-next" data-v="pt-sec" data-n={n + 1} onClick={() => go(n + 1)}>다음<Icon n="arrowRight" c="xs" /></button>
      : <button type="submit" className={"vd-btn vd-btn-p pt-gf-next pt-submit" + (busy ? " is-busy" : "")} disabled={busy ? true : undefined}>지원서 보내기<Icon n="send" c="xs" /></button>}</div>;
  const sec = (n, body) => <section className="pt-gf-sec" data-sec={n} hidden={n !== cur} aria-labelledby={"pt-sh-" + n}><div className="pt-gf-card pt-gf-sh"><span>섹션 {n} / 5</span><h2 id={"pt-sh-" + n} tabIndex={seen[n] ? -1 : undefined}>{S[n - 1][0]}</h2><p>{S[n - 1][1]}</p></div>{body}{nav(n)}</section>;

  if (done) {
    return (
      <div className="pt pt-gf"><div className="pt-gf-w" id="pt-ap-main">
        <div className="pt-gf-ban pt-gf-ban-done" aria-hidden="true"><div className="pt-gf-ban-tx"><small>DOOGO PARTNERS</small><b>지원해 주셔서<br />고마워요!</b></div><img src={X.PT_MS + "mascot-cheer.webp"} alt="" width="420" height="454" /></div>
        <div className="pt-gf-card pt-gf-title pt-done"><span className="vd-done-ic"><Icon n="check" /></span><h1>지원서가 접수됐어요</h1><p>{done.name} 강사님, 소중한 지원 고마워요. 담당자가 들어온 순서대로 꼼꼼히 읽고, 남겨 주신 연락처로 연락드릴게요.</p>
          <dl className="pt-done-sum">{[["클래스 주제", done.topic], ["강의 분야", done.cat], ["열고 싶은 클래스", done.kinds.join(", ") || "-"], ["연락처", done.phone], ["이메일", done.email]].map((x) => <div key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></div>)}</dl>
          <ol className="pt-done-next">{[["지원서 확인", "담당자가 지원서를 열람해요"], ["상담 연락", "연락처 · 이메일로 연락드려요"], ["계약 · 제작", "함께 기획하고 촬영해요"]].map((x, i) => <li key={i}><i>{i + 1}</i><b>{x[0]}</b><small>{x[1]}</small></li>)}</ol>
          <div className="pt-done-btns"><a className="vd-btn vd-btn-p" href="#/vod">DOOGO CLASS 둘러보기</a><KakaoBtn cls="vd-btn vd-btn-o" label="카카오톡 문의하기" /></div></div>
      </div></div>
    );
  }
  return (
    <div className="pt pt-gf"><div className="pt-gf-w" id="pt-ap-main">
      <div className="pt-gf-ban" aria-hidden="true"><div className="pt-gf-ban-tx"><small>DOOGO PARTNERS</small><b>노하우를 클래스로,<br />첫걸음은 지원서부터</b></div><img src={X.PT_MS + "mascot-hero.webp"} alt="" width="880" height="760" /></div>
      <div className="pt-gf-card pt-gf-title"><h1>두고 파트너스 지원서</h1><p>직접 해서 번 노하우를 DOOGO CLASS 클래스로 만들어 보세요. 기획 · 촬영 · 편집 · 상세페이지 · 판매 · 정산까지 함께해요. 적어 주신 내용은 담당자만 보고, 지원 검토 · 상담 연락에만 써요.</p>
        <ul className="pt-gf-meta"><li><Icon n="clock" c="xs" />약 5분</li><li><Icon n="layers" c="xs" />섹션 5개</li><li><Icon n="lock" c="xs" />담당자만 봐요</li></ul>
        <p className="pt-gf-req"><em>*</em> 표시는 꼭 답해 주세요{m ? " · " + (m.email || m.name || "") + " 님으로 쓰는 중" : ""}</p><a className="pt-gf-back" href="#/vod/partners"><Icon n="arrowLeft" c="xs" />두고 파트너스 소개 다시 보기</a></div>
      <div className="pt-gf-prog" id="pt-gf-prog"><span><b id="pt-gf-pn">{cur}</b> / 5 · <em id="pt-gf-pt">{S[cur - 1][0]}</em></span><i role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow={cur} aria-label="지원서 진행"><b id="pt-gf-pb" style={{ width: cur * 20 + "%" }} /></i></div>
      <form ref={fRef} className="pt-form pt-gf-form" data-pt-form="" noValidate onInput={(e) => X.ptSaveDraft(e.currentTarget)} onSubmit={submit}>
        {sec(1, <>{inp("name", "성함", 1, { maxLength: 40, autoComplete: "name", placeholder: "홍길동" }, "", m ? m.name : "")}{inp("nick", "활동명 · 브랜드명", 0, { maxLength: 40, placeholder: "예: 갓농부, ○○스토어" }, "스토어 · 강사 페이지에 보일 이름이에요. 없으면 비워 두세요.")}
          {inp("phone", "연락처", 1, { type: "tel", inputMode: "tel", maxLength: 30, autoComplete: "tel", placeholder: "010-0000-0000" }, "", m ? m.phone || "" : "")}{inp("email", "이메일", 1, { type: "email", inputMode: "email", maxLength: 120, autoComplete: "email", placeholder: "name@example.com" }, "", m ? m.email || "" : "")}
          {opts("ctime", "연락받기 편한 시간", 0, X.PT_CTIME, false, "", "", 2)}</>)}
        {sec(2, <>{area("career", "강사 소개 · 걸어온 길", 0, "예: 2019년 스마트스토어 창업 → 3년 만에 월매출 3,000만 원 · 지금은 브랜드 2개 운영 중", "지금 하는 일 · 대표 경력 · 수상 · 출간 등을 편하게 적어 주세요.", 4)}
          {inp("result", "직접 낸 결과", 0, { maxLength: 160, placeholder: "예: 스마트스토어 월매출 3,000만 원 · 블로그 이웃 1만 명" }, "숫자로 적어 주시면 상담이 빨라요.")}
          {inp("link", "대표 채널 · 포트폴리오 주소", 0, { type: "url", inputMode: "url", maxLength: 300, placeholder: "https://" }, "유튜브 · 블로그 · 인스타그램 · 스토어 · 노션 포트폴리오 무엇이든 좋아요.")}{inp("link2", "다른 주소", 0, { type: "url", inputMode: "url", maxLength: 300, placeholder: "https://" })}
          {opts("reach", "채널 규모 (구독자 · 팔로워)", 0, X.PT_REACH, false, "가장 큰 채널 기준이에요. 없어도 지원할 수 있어요.")}</>)}
        {sec(3, <>{opts("cat", "강의 분야", 1, cs, false, "", "", 3)}{opts("kinds", "열고 싶은 클래스", 0, X.ptKinds(), true, "", ["VOD 강의"], 2)}
          {inp("topic", "클래스 주제 한 줄", 1, { maxLength: 80, placeholder: "예: 재고 없이 시작하는 해외 건기식 브랜드" })}
          {inp("target", "이런 분께 추천해요 (수강 대상)", 0, { maxLength: 120, placeholder: "예: 부업으로 첫 매출을 내고 싶은 직장인" })}
          {area("course", "어떤 노하우인가요", 1, "누구에게 · 무엇을 · 어떤 순서로 알려 주고 싶은지 자유롭게 적어 주세요", "", 5)}
          {area("curri", "커리큘럼 초안", 0, "예: 1강 시장 고르기 / 2강 첫 상품 소싱 / 3강 상세페이지 / 4강 광고 …", "생각나는 만큼만 적어 주세요. 없으면 상담할 때 함께 짜요.", 4)}</>)}
        {sec(4, <>{opts("exp", "강의 경험", 0, X.PT_EXP, false)}{opts("ready", "강의 자료 준비", 0, X.PT_READY, false)}{opts("film", "촬영은 어떻게 할까요", 0, X.PT_FILM, false, "DOOGO CLASS 스튜디오 · 장비 · 스태프가 준비돼 있어요.")}
          {opts("when", "원하는 오픈 시기", 0, X.PT_WHEN, false, "", "", 2)}{opts("price", "생각하는 판매가", 0, X.PT_PRICE, false, "정해진 건 없어요. 상담할 때 시장 가격을 함께 봐요.", "", 2)}
          {inp("where", "지금 강의 · 활동하는 곳", 0, { maxLength: 120, placeholder: "예: 유튜브 · 클래스101 · 아직 없어요" })}</>)}
        {sec(5, <>{opts("from", "어떻게 알게 되셨나요", 0, X.PT_FROM, false, "", "", 2)}{area("message", "하고 싶은 말", 0, "궁금한 점 · 원하는 진행 방식 등", "", 3)}
          <fieldset className={qcls("agree", "pt-gf-q pt-gf-agree")} data-q="agree" data-req=""><legend className="pt-gf-ql">개인정보 수집 · 이용 동의 <em aria-label="필수">*</em></legend>
            <table><tbody><tr><th>받는 항목</th><td>성함 · 연락처 · 이메일 · 활동명 · 강사 소개 · 강의 정보 · 채널 주소</td></tr><tr><th>쓰는 곳</th><td>파트너 강사 지원 검토 · 상담 연락</td></tr><tr><th>보관 기간</th><td>상담이 끝나면 지체 없이 지워요 (계약하면 계약 기간 동안)</td></tr></tbody></table>
            <p>동의하지 않을 수 있지만, 동의하지 않으면 지원서를 받을 수 없어요.</p>
            <label className="pt-gf-op pt-gf-agr"><input type="checkbox" name="agree" /><i aria-hidden="true" /><span>개인정보 수집 · 이용에 동의해요 <b>(필수)</b></span></label>{qerr("pt-agree", "agree")}</fieldset>
          <p className="vd-err" id="pt-err" role="alert">{err}</p></>)}
      </form>
      <p className="pt-gf-foot">DOOGO CLASS · 두고 파트너스 지원서 — 궁금한 점은 <KakaoBtn cls="pt-gf-kk" label="카카오톡으로 물어보기" /></p>
    </div></div>
  );
}
