"use client";
/* 마스터 DOOGO CLASS (5) — 회원 · CRM: 회원 DB 목록
 * 예전 admin.js pageCrm(목록) · crmNav 를 React 로 (Next.js 전환 6단계)
 *  · 단계 칩 · 가입 방식 · 찾기 · 고르기 · 선택 작업 · 내려받기 · 개인정보 보기는 예전 admin.js 이벤트가 그대로 받아요
 *  · 회원 상세(#/center/master/vod-crm/<회원>)는 아직 예전 화면이에요 */
import Icon from "../lib/Icon.jsx";
import { ADM, Btn, Head, Empty, Pill, Isl } from "./bits.jsx";

export function CrmNav({ on }) {
  return <nav className="crm-subnav" aria-label="회원 · CRM">{[["vod-crm", "회원 DB", "users"], ["vod-seg", "세그먼트", "target"], ["vod-msg", "메시지 · 자동화", "send"], ["vod-crm-rp", "회원 분석", "activity"]].map((x) => <a key={x[0]} href={"#/center/master/" + x[0]} className={x[0] === on ? "on" : undefined} aria-current={x[0] === on ? "page" : undefined}><Icon n={x[2]} c="sm" />{x[1]}</a>)}</nav>;
}
const Opts = ({ list }) => list.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>);

export function MasterCrm() {
  const A = ADM(), DB = window.DB, ui = A.ui, won = A.won, v = A.VD(), F = A.crmF(), all = A.crmAll(), list = A.crmList(), sel = A.crmSelIds(), N = ui.crmN || 50, ym = DB.date.todayStr().slice(0, 7), pym = A.vdYMadd(ym, -1), C = A.CRM();
  const cnt = (k) => all.filter((pf) => A.crmIn(pf, k)).length, act = all.filter((pf) => !pf.m.blocked);
  const newM = all.filter((pf) => A.vdYM(pf.m.createdAt) === ym), newP = all.filter((pf) => A.vdYM(pf.m.createdAt) === pym).length, buyers = act.filter((pf) => pf.paid.length).length;
  const kk = all.filter((pf) => pf.m.via === "kakao").length, subs = cnt("sub"), selMap = ui.crmSel || {};
  const Kb = ({ k, label, val, sub, tone }) => <button type="button" className={"a-kpi crm-kpi " + (tone || "") + (F.seg === k ? " on" : "")} data-action="crm-seg" data-k={k}><span>{label}</span><b>{val}</b><small>{sub}</small></button>;
  const Sel = ({ f, label, all: a0, list: l }) => <select key={f + ":" + (F[f] || "")} className="a-input a-sm" data-crm-f={f} aria-label={label} defaultValue={F[f] || ""}>{a0 != null ? <option value="">{a0}</option> : null}<Opts list={l} /></select>;
  const Row = ({ pf }) => {
    const m = pf.m, st = A.crmStage(pf.stage), chs = A.crmChs(m), on = !!selMap[m.id];
    return <tr className={"clickable" + (m.blocked ? " a-dim" : "") + (on ? " crm-on" : "")} data-action="crm-open" data-id={m.id}>
      <td className="w-check" data-stop=""><input key={on ? "1" : "0"} type="checkbox" data-crm-sel={m.id} defaultChecked={on} aria-label={m.name + " 선택"} /></td>
      <td><div className="crm-who"><Isl html={A.crmAv(m)} /><div><b>{m.name || "-"}</b><small>{A.crmE(m)}</small>{(m.tags || []).length ? <span className="crm-tags">{m.tags.slice(0, 2).map((t) => <i key={t}>{t}</i>)}{m.tags.length > 2 ? <i>+{m.tags.length - 2}</i> : null}</span> : null}</div></div></td>
      <td className="vda-nw"><Isl html={A.crmVia(m)} /><small className="a-memo">{A.crmDate(m.createdAt) + " · " + (A.CRM_SRC[A.crmSrcK(m)] || A.crmSrcK(m))}</small></td>
      <td><Pill cls={st[1]}>{st[0]}</Pill><small className="a-memo">RFM {pf.rfm.join("·")}</small></td>
      <td className="vda-nw num"><b>{pf.paid.length}건</b> {pf.ltv ? won(pf.ltv) : ""}{pf.free.length ? <small className="a-memo">무료 신청 {pf.free.length}건</small> : null}</td>
      <td className="vda-nw">{A.crmAgo(pf.last)}</td>
      <td className="vda-nw num">쿠폰 {pf.cpOk.length}장<small className="a-memo">{(Number(m.points) || 0).toLocaleString()}P</small></td>
      <td className="vda-nw">{pf.prog == null ? <span className="a-muted">-</span> : <><span className="a-bar"><span style={{ width: pf.prog + "%" }} /></span><small className="num">{pf.prog}%</small></>}</td>
      <td className="vda-nw">{pf.sub ? <><Pill cls="info">동의</Pill><small className="a-memo">{A.CH3n(chs)}</small></> : <span className="a-muted">안 함</span>}{m.kakaoCh ? <small className="a-memo">카톡 채널 친구</small> : null}{pf.reDue ? <small className="a-memo a-memo-red">2년 재확인 필요</small> : null}</td></tr>;
  };
  const views = C.views.slice(0, 6), dls = C.dl.slice(0, 6), allOn = list.length && list.every((pf) => selMap[pf.m.id]);
  const Reset = ({ cls }) => <Btn action="crm-reset" cls={cls}>조건 지우기</Btn>;
  return <>
    <Head title="회원 DB" sub="DOOGO CLASS에 가입한 회원(이메일 · 카카오)을 한곳에서 봐요. 누가 어떤 클래스를 샀는지, 열성팬인지 · 소식을 받는지, 쿠폰 · 포인트가 얼마나 있는지 확인하고 바로 혜택 · 메시지를 보낼 수 있어요."
      right={<><Btn action="crm-pii" cls="a-btn-ghost"><Icon n={ui.crmPii ? "eyeOff" : "eye"} c="sm" />{ui.crmPii ? "개인정보 가리기" : "개인정보 보기"}</Btn><Btn action="crm-csv" cls="a-btn-ghost"><Icon n="download" c="sm" />내려받기</Btn><a className="a-btn a-btn-primary" href="#/center/master/vod-msg"><Icon n="send" c="sm" />메시지 · 자동화</a></>} />
    <CrmNav on="vod-crm" />
    <div className="a-kpis crm-kpis">
      <Kb k="all" label="전체 회원" val={all.length.toLocaleString() + "명"} sub={"카카오 " + kk + " · 이메일 " + (all.length - kk)} />
      <Kb k="new" label="이번 달 신규" val={newM.length + "명"} sub={"지난달 " + newP + "명 · 카카오 " + newM.filter((pf) => pf.m.via === "kakao").length + "명"} />
      <Kb k="first" label="구매 전환율" val={(act.length ? Math.round(buyers / act.length * 100) : 0) + "%"} sub={"결제한 회원 " + buyers + "명"} />
      <Kb k="fan" label="열성팬" val={cnt("fan") + "명"} sub={"누적 " + won(all.filter((pf) => pf.stage === "fan").reduce((a, pf) => a + pf.ltv, 0))} tone="ok" />
      <Kb k="risk" label="이탈 위험" val={cnt("risk") + "명"} sub="다시 부르기 쿠폰 대상" tone={cnt("risk") ? "warn" : ""} />
      <Kb k="sub" label="구독자 (소식 받기)" val={subs + "명"} sub={(act.length ? Math.round(subs / act.length * 100) : 0) + "% · 재확인 필요 " + cnt("recon") + "명"} />
    </div>
    <section className="a-card crm-card">
      <div className="crm-chips" role="tablist" aria-label="회원 단계">{A.CRM_CHIPS().map((c) => { const sg = c[0].indexOf("sg:") === 0; return <button key={c[0]} type="button" role="tab" aria-selected={String(F.seg === c[0])} className={"crm-chip" + (F.seg === c[0] ? " on" : "") + (sg ? " sg" : "")} data-action="crm-seg" data-k={c[0]}>{sg ? <Icon n="target" c="xs" /> : null}{c[1]} <span className="num">{cnt(c[0])}</span></button>; })}<a className="crm-chip add" href="#/center/master/vod-seg"><Icon n="plus" c="xs" />세그먼트 만들기</a></div>
      <div className="crm-vias" role="tablist" aria-label="가입 방식">{[["", "전체", all.length], ["kakao", "카카오 1초 가입", kk], ["email", "이메일 가입", all.length - kk]].map((x) => <button key={x[0] || "all"} type="button" role="tab" aria-selected={String(F.via === x[0])} className={"crm-vbtn" + (x[0] === "kakao" ? " k" : "") + (F.via === x[0] ? " on" : "")} data-action="crm-via" data-k={x[0]}>{x[0] === "kakao" ? <Isl html={A.KK_IC()} /> : x[0] === "email" ? <Icon n="mail" c="xs" /> : <Icon n="users" c="xs" />}{x[1]} <span className="num">{x[2]}</span></button>)}</div>
      <div className="crm-filters"><div className="a-search"><Icon n="search" c="sm" /><input className="a-input a-sm" id="crm-q" type="search" placeholder="이름 · 이메일 · 휴대폰 · 태그 · 회원번호" defaultValue={F.q} aria-label="회원 찾기" /></div>
        <Sel f="via" label="가입 방식" all="가입 방식 전체" list={[["kakao", "카카오 가입"], ["email", "이메일 가입"]]} />
        <Sel f="sub" label="소식 받기" all="소식 받기 전체" list={[["yes", "동의"], ["no", "안 함"]]} />
        <Sel f="pid" label="구매한 클래스" all="구매한 클래스 전체" list={v.products.filter((p) => p.status !== "hidden").map((p) => [p.id, p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title])} />
        <Sel f="tag" label="태그" all="태그 전체" list={C.tags.map((t) => [t, t])} />
        <Sel f="sort" label="정렬" list={[["recent", "최근 가입 순"], ["active", "최근 활동 순"], ["ltv", "누적 결제 많은 순"], ["freq", "결제 횟수 많은 순"], ["rfm", "RFM 점수 높은 순"], ["idle", "오래 안 온 순"]]} />
        {F.q || F.via || F.sub || F.pid || F.tag || F.seg !== "all" ? <Reset cls="a-btn-text a-btn-sm" /> : null}<span className="crm-count">{list.length}명</span></div>
      {sel.length ? <div className="crm-bulk" role="region" aria-label="선택한 회원 작업"><b>{sel.length}명 선택</b><Btn action="crm-b-cp" cls="a-btn-ghost a-btn-sm"><Icon n="gift" c="sm" />쿠폰 지급</Btn><Btn action="crm-b-pt" cls="a-btn-ghost a-btn-sm"><Icon n="coins" c="sm" />포인트 지급</Btn><Btn action="crm-b-tag" cls="a-btn-ghost a-btn-sm"><Icon n="pin" c="sm" />태그 붙이기</Btn><Btn action="crm-camp-new" cls="a-btn-primary a-btn-sm" data-seg="sel"><Icon n="send" c="sm" />메시지 보내기</Btn><Btn action="crm-csv" cls="a-btn-ghost a-btn-sm" data-sel="1"><Icon n="download" c="sm" />내려받기</Btn><Btn action="crm-sel-clear" cls="a-btn-text a-btn-sm">선택 풀기</Btn></div> : null}
      {list.length ? <><div className="a-table-wrap"><table className="a-table crm-table"><thead><tr><th className="w-check"><input key={allOn ? "1" : "0"} type="checkbox" data-crm-all="" aria-label="보이는 회원 모두 선택" defaultChecked={!!allOn} /></th><th>회원</th><th>가입</th><th>단계</th><th>구매</th><th>최근 활동</th><th>혜택</th><th>진도</th><th>소식 받기</th></tr></thead><tbody>{list.slice(0, N).map((pf) => <Row key={pf.m.id} pf={pf} />)}</tbody></table></div>
        {list.length > N ? <div className="crm-more"><Btn action="crm-more" cls="a-btn-ghost">50명 더 보기 ({list.length - N}명 남음)</Btn></div> : null}</>
        : <Empty ic="users" extra={<Reset cls="a-btn-ghost a-btn-sm" />}>조건에 맞는 회원이 없어요.</Empty>}
    </section>
    <section className="a-card crm-card"><details className="crm-log"><summary><Icon n="shieldCheck" c="sm" /><b>개인정보 열람 · 내려받기 기록</b><small>열람 {C.views.length}회 · 내려받기 {C.dl.length}회 · 기록은 1년 이상 보관해요</small></summary><div className="crm-log-b">
      {views.length || dls.length ? <ul className="a-list">{dls.map((x, i) => <li key={"d" + i}><div><b><Icon n="download" c="xs" /> 내려받기 · {x.n}명</b><small>{x.who + " · " + A.crmStamp(x.at) + " · 사유: " + x.why}</small></div></li>)}{views.map((x, i) => <li key={"v" + i}><div><b><Icon n="eye" c="xs" /> 열람 · {x.what}</b><small>{x.who + " · " + A.crmStamp(x.at)}</small></div></li>)}</ul> : <p className="a-muted">아직 기록이 없어요.</p>}
      <p className="a-muted p-small">휴대폰 · 이메일은 평소에 가려서 보여요. ‘개인정보 보기’를 누르거나 회원 목록을 내려받으면 누가 · 언제 · 왜 봤는지 남아요.</p></div></details></section>
  </>;
}

/* ---------------- 세그먼트 #/center/master/vod-seg (예전 pageCrmSeg) ----------------
 *  · 조건 고르기 칸 · 단계 기준 폼은 예전처럼 다시 그릴 때마다 지금 값으로 (key=n) */
function SegCard({ k, name, desc, n, custom }) {
  return <div className="crm-seg"><div><b>{custom ? <><Icon n="target" c="xs" /> </> : null}{name}</b><small>{desc}</small></div><span className="crm-seg-n num">{n}<small>명</small></span><div className="crm-seg-a"><Btn action="crm-seg-go" cls="a-btn-ghost a-btn-sm" data-k={k}>회원 보기</Btn><Btn action="crm-camp-new" cls="a-btn-ghost a-btn-sm" data-seg={k}><Icon n="send" c="xs" />메시지</Btn>{custom ? <Btn action="crm-seg-del" cls="a-btn-text a-btn-sm" data-id={k.slice(3)} aria-label="세그먼트 지우기"><Icon n="trash" c="xs" /></Btn> : null}</div></div>;
}
export function MasterCrmSeg({ n }) {
  const A = ADM(), ui = A.ui, all = A.crmAll(), C = A.CRM(), R = C.rules, B = (ui.crmB = ui.crmB || { name: "", rules: [["stage", "is", "fan"]] });
  const prev = all.filter((pf) => B.rules.every((r) => A.crmTest(pf, r)));
  const Rule = ({ r, i }) => { const fd = A.crmFld(r[0]), num = fd[2] === "num"; return <div className="crm-rule"><span className="crm-and">{i ? "그리고" : "조건"}</span>
    <select className="a-input a-sm" data-crm-b="f" data-i={i} aria-label="조건 항목" defaultValue={r[0]}>{A.CRM_FIELDS.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
    <select className="a-input a-sm" data-crm-b="op" data-i={i} aria-label="비교" defaultValue={r[1]}>{(num ? [["gte", "이상"], ["lte", "이하"]] : [["is", "이다"], ["not", "아니다"]]).map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
    {num ? <span className="crm-unit"><input className="a-input a-sm" type="number" min="0" data-crm-b="val" data-i={i} defaultValue={r[2]} aria-label="값" /><em>{fd[3] || ""}</em></span>
      : <select className="a-input a-sm" data-crm-b="val" data-i={i} aria-label="값" defaultValue={r[2]}>{A.crmOpts(r[0]).map((x) => <option key={x[0]} value={x[0]}>{x[1].length > 26 ? x[1].slice(0, 26) + "…" : x[1]}</option>)}</select>}
    {B.rules.length > 1 ? <Btn action="crm-b-del" cls="a-btn-text a-btn-sm" data-i={i} aria-label="조건 빼기"><Icon n="x" c="xs" /></Btn> : null}</div>; };
  return <>
    <Head title="세그먼트" sub="조건을 골라 회원 묶음을 만들어요. ‘문대표 강의를 산 열성팬’, ‘찜만 하고 안 산 회원’처럼 묶어 두면 회원 DB에서 바로 보고, 메시지 · 쿠폰을 한 번에 보낼 수 있어요. 숫자는 늘 지금 데이터로 다시 세요." />
    <CrmNav on="vod-seg" />
    <section className="a-card crm-card"><div className="a-card-head"><h2>새 세그먼트 만들기</h2><span className="crm-prev-n">지금 <b className="num">{prev.length}명</b>이 해당돼요</span></div>
      <div key={n} className="crm-builder">{B.rules.map((r, i) => <Rule key={i} r={r} i={i} />)}
        <div className="crm-b-foot"><Btn action="crm-b-add" cls="a-btn-ghost a-btn-sm"><Icon n="plus" c="sm" />조건 더하기</Btn><input className="a-input a-sm" id="crm-b-name" maxLength={30} placeholder="세그먼트 이름 (예: 문대표 열성팬)" defaultValue={B.name} aria-label="세그먼트 이름" /><Btn action="crm-b-save" cls="a-btn-primary a-btn-sm"><Icon n="check" c="sm" />저장</Btn></div>
        {prev.length ? <p className="crm-prev">{prev.slice(0, 12).map((pf) => <a key={pf.m.id} href={"#/center/master/vod-crm/" + pf.m.id}>{pf.m.name}</a>)}{prev.length > 12 ? <span>외 {prev.length - 12}명</span> : null}</p> : <p className="a-muted p-small">조건에 맞는 회원이 없어요. 조건을 바꿔 보세요.</p>}</div></section>
    <section className="a-card crm-card"><div className="a-card-head"><h2>직접 만든 세그먼트 {C.segs.length}개</h2></div>{C.segs.length ? <div className="crm-segs">{C.segs.map((s) => <SegCard key={s.id} k={"sg:" + s.id} name={s.name} desc={s.rules.map(A.crmRuleTxt).join(" · ")} n={all.filter((pf) => s.rules.every((r) => A.crmTest(pf, r))).length} custom />)}</div> : <p className="a-muted">아직 만든 세그먼트가 없어요.</p>}</section>
    <section className="a-card crm-card"><div className="a-card-head"><h2>자동으로 나뉘는 단계</h2><p className="a-muted">회원마다 하나의 단계에 들어가요. 위에서부터 먼저 맞는 단계가 붙어요.</p></div><div className="crm-segs">
      {["blocked", "sleep", "risk", "fan", "repeat", "first", "free", "new", "lead"].map((k) => { const s = A.crmStage(k); return <SegCard key={k} k={k} name={s[0]} desc={s[2]} n={all.filter((pf) => pf.stage === k).length} />; })}
      <SegCard k="sub" name="구독자 (소식 받기 동의)" desc="광고성 정보 수신에 동의한 회원 · 광고 메시지는 이 회원들에게만 가요" n={all.filter((pf) => A.crmIn(pf, "sub")).length} />
      <SegCard k="recon" name="동의 재확인 필요" desc="동의한 지 2년이 다 된 회원 · 법에 따라 2년마다 동의 여부를 알려야 해요" n={all.filter((pf) => pf.reDue).length} /></div></section>
    <section className="a-card crm-card"><div className="a-card-head"><h2>단계 기준</h2><p className="a-muted">우리 서비스에 맞게 숫자를 바꾸면 모든 화면의 단계가 바로 다시 계산돼요.</p></div><form key={n} className="crm-rules" id="crm-rules" noValidate>
      {[["fanN", "열성팬: 결제 횟수", "회 이상"], ["fanAmt", "또는 누적 결제", "원 이상"], ["fanDays", "그리고 최근 활동", "일 이내"], ["riskDays", "이탈 위험: 활동 없음", "일 넘게"], ["sleepDays", "휴면: 활동 없음", "일 넘게"], ["newDays", "신규 가입: 가입 후", "일 이내"]].map((x) => <label key={x[0]}><span>{x[1]}</span><span className="crm-unit"><input className="a-input a-sm" type="number" min="1" name={x[0]} defaultValue={R[x[0]]} /><em>{x[2]}</em></span></label>)}
      <Btn action="crm-rules-save" cls="a-btn-dark a-btn-sm"><Icon n="check" c="sm" />기준 저장</Btn></form></section>
  </>;
}

/* ---------------- 메시지 · 자동화 #/center/master/vod-msg (예전 pageCrmMsg · vuTplField) ----------------
 *  · 캠페인 보내기 창은 아직 예전 창(openModal)이에요 · 발송 설정 폼은 다시 그릴 때마다 저장된 값으로 (key=n) */
const LAW = [["광고는 동의한 회원에게만", "소식 받기(광고성 정보)에 동의하고, 그 채널(문자 · 이메일 · 카카오톡)을 고른 회원에게만 보내요. 동의 안 한 회원은 자동으로 빠져요."], ["(광고) 표기 · 무료 수신거부", "광고 메시지는 맨 앞에 (광고)를 붙이고, 끝에 수신 거부 방법을 자동으로 넣어요."], ["야간 광고 제한", "카카오 브랜드 메시지는 08:00~20:50에만 보낼 수 있어요. 문자는 밤 9시~아침 8시에 야간 수신 동의한 회원에게만 가요."], ["동의 2년마다 다시 확인", "동의한 날부터 2년마다 동의 여부를 알려야 해요. ‘동의 재확인 필요’ 세그먼트와 자동 메시지로 챙겨요."], ["알림톡은 정보성만", "결제 · 수강 · 일정처럼 회원이 꼭 알아야 할 내용만 보내요. 2026년부터 회사가 준 쿠폰 · 적립금 사용을 권하는 알림톡은 막혀서 쿠폰 소식은 브랜드 메시지로 보내요."], ["개인정보 열람 · 내려받기 기록", "회원 DB에서 개인정보를 보거나 내려받으면 누가 · 언제 · 왜 봤는지 남겨요. 기록은 1년 이상 보관해요."]];
function VuTpl({ S2 }) {
  const A = ADM(), pick = S2.upd || {};
  const v0 = (k) => (pick[k] !== "" && pick[k] != null && S2.tpls[Number(pick[k])] ? String(pick[k]) : "");
  return <div className="a-field crm-vu"><label>VOD 최신성 업데이트 알림톡 <small>(강사 · 마스터가 업데이트를 저장하면 산 회원에게 — 정보성이라 소식 받기 동의와 상관없이 가요)</small></label>
    <div className="a-form-row">{A.VU_TPL.map((x) => <div key={x[0]} className="a-field"><label htmlFor={"crm-vu-" + x[0]}>{x[1]}</label><select className="a-input" id={"crm-vu-" + x[0]} name={"upd" + (x[0] === "act" ? "Act" : "End")} defaultValue={v0(x[0])}><option value="">보내지 않기</option>{S2.tpls.map((t, i) => <option key={i} value={String(i)}>{t.name}</option>)}</select></div>)}</div>
    <details className="crm-vu-ex"><summary>카카오 승인 받을 템플릿 예시 (변수 #{"{"}이름{"}"} · #{"{"}강의명{"}"} · #{"{"}업데이트월{"}"} · #{"{"}업데이트{"}"} · #{"{"}링크{"}"})</summary>{A.VU_TPL.flatMap((x) => [<b key={x[0] + "b"}>{x[1]}</b>, <pre key={x[0] + "p"}>{x[2]}</pre>])}<p className="a-muted p-small">알림톡은 정보성만 보낼 수 있어서 할인 금액 같은 광고 문구는 넣지 않았어요. 승인되면 위 ‘템플릿 추가’로 등록하고 여기서 골라 주세요.</p></details></div>;
}
export function MasterCrmMsg({ n }) {
  const A = ADM(), DB = window.DB, ui = A.ui, won = A.won, tab = ui.crmMt || "camp", all = A.crmAll(), C = A.CRM(), camps = C.camps.slice().sort((a, b) => b.at - a.at), AU = C.auto, CH = A.CRM_CH;
  const tabs = [["camp", "캠페인", camps.length], ["auto", "자동 메시지", A.CRM_AUTO.filter((x) => AU[x[0]]).length + "/" + A.CRM_AUTO.length], ["rule", "채널 · 발송 규칙", ""]];
  let body;
  if (tab === "auto") {
    const at10 = Date.parse(DB.date.todayStr() + "T10:00:00");
    body = <><div className="crm-autos">{A.CRM_AUTO.map((x) => { const tg = x[5](all), r = A.crmReach(tg, x[3], at10), on = !!AU[x[0]]; return <div key={x[0]} className={"crm-auto" + (on ? " on" : "")}><button type="button" className={"a-switch" + (on ? " on" : "")} data-action="crm-auto" data-k={x[0]} role="switch" aria-checked={String(on)} aria-label={x[1] + " 켜기"}><i /></button>
        <div className="crm-auto-t"><b>{x[1]}</b><small>{x[2] + " · " + CH[x[3]][0] + (CH[x[3]][1] ? " · 광고" : " · 정보성")}</small><p>{x[4]}</p></div>
        <div className="crm-auto-n"><b className="num">{r.ok.length}명</b><small>오늘 보낼 대상{tg.length !== r.ok.length ? " (" + (tg.length - r.ok.length) + "명은 미동의로 빠짐)" : ""}</small>{tg.length ? <Btn action="crm-auto-who" cls="a-btn-text a-btn-sm" data-k={x[0]}>대상 보기</Btn> : null}</div></div>; })}</div>
      <p className="a-muted p-small crm-foot"><Icon n="alert" c="xs" /> 자동 메시지는 아직 켜 둔 기록만 남아요. ‘채널 · 발송 규칙’에서 채널을 연결하고 알림톡 템플릿 승인이 끝나면, 정해진 때에 서버가 보내도록 이어서 연결해요.</p></>;
  } else if (tab === "rule") {
    const cfg = A.crmCfg(), S2 = A.crmSendCfg(), srv = !!(DB.remote && DB.remote.on), order = ["sms", "alim", "brand", "email"];
    body = <><div className="crm-link-h"><b>발송 채널 연결</b><span className="a-muted">{!srv ? "지금은 서버가 없는 시안 화면이라 기록만 남아요." : !cfg ? "연결 상태를 불러오는 중…" : "가입 → 키를 Vercel 환경 변수에 넣고 다시 배포하면 ‘연결됨’으로 바뀌고 캠페인이 실제로 나가요."}</span></div>
      <div className="crm-links">{order.map((k, i) => { const L = A.CRM_LINK[k], live = A.crmLive(k); return <div key={k} className={"crm-link" + (live ? " on" : "")}><div className="crm-link-t"><span className="crm-link-n">{i + 1}</span><b>{CH[k][0]}</b><Pill cls={live ? "ok" : ""}>{live ? "연결됨 · 실제 발송" : "연결 전 · 기록만"}</Pill></div>
        <small className="a-muted">{L[0] + (k === "sms" && cfg && cfg.sender ? " · 발신번호 " + cfg.sender : "") + (k === "email" && cfg && cfg.from ? " · " + cfg.from : "")}</small><ol className="crm-link-s">{L[2].map((s, j) => <li key={j}>{s[0]}{s[1] ? <> <code>{s[1]}</code></> : null}</li>)}</ol><a className="crm-link-go" href={L[1]} target="_blank" rel="noopener">{L[0].split(" + ")[0]} 열기 <Icon n="arrowUpRight" c="xs" /></a></div>; })}</div>
      <form key={n} className="crm-sendf" id="crm-sendf" noValidate><div className="a-form-row"><div className="a-field"><label htmlFor="crm-s-080">080 무료 수신거부 번호 <small>(광고 문자에 꼭 필요)</small></label><input className="a-input" id="crm-s-080" name="optout" maxLength={14} placeholder="080-000-0000" defaultValue={S2.optout} /></div>
          <div className="a-field"><label htmlFor="crm-s-tg">브랜드 메시지 보낼 대상</label><select className="a-input" id="crm-s-tg" name="targeting" defaultValue={S2.targeting}>{[["I", "I · 카카오톡 채널 친구 (기본)"], ["M", "M · 솔라피 안내의 M 대상"], ["N", "N · 솔라피 안내의 N 대상"]].map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></div></div>
        <div className="a-field"><label>알림톡 템플릿 <small>(카카오가 승인한 것만 · 내용은 승인된 글 그대로 · 이름 자리는 #{"{"}이름{"}"})</small></label><div className="crm-tpls">{S2.tpls.length ? S2.tpls.map((t, i) => <div key={i} className="crm-tpl"><div><b>{t.name}</b> <code>{t.id}</code><p>{t.text}</p></div><Btn action="crm-tpl-del" cls="a-icon-btn sm" data-i={i} aria-label="템플릿 지우기"><Icon n="trash" c="sm" /></Btn></div>) : <p className="a-muted p-small">아직 등록한 템플릿이 없어요.</p>}</div>
          <div className="crm-tpl-add"><input className="a-input a-sm" name="tName" maxLength={30} placeholder="이름 (예: 결제 완료 안내)" /><input className="a-input a-sm" name="tId" maxLength={80} placeholder="템플릿 ID (솔라피 › 알림톡 템플릿)" /><textarea className="a-input a-sm" name="tText" rows={2} maxLength={1000} placeholder="승인된 템플릿 내용 그대로 (예: #{이름}님, 결제가 완료됐어요…)" /><Btn action="crm-tpl-add" cls="a-btn-outline a-btn-sm"><Icon n="plus" c="sm" />템플릿 추가</Btn></div></div>
        <VuTpl S2={S2} />
        <Btn action="crm-send-save" cls="a-btn-dark a-btn-sm"><Icon n="check" c="sm" />발송 설정 저장</Btn></form>
      <div className="crm-rulecards">{Object.keys(CH).map((k) => <div key={k} className="crm-rulecard"><b>{CH[k][0]}</b><Pill cls={CH[k][1] ? "warn" : "info"}>{CH[k][1] ? "광고 가능" : "정보성만"}</Pill><p>{CH[k][2]}</p></div>)}</div>
      <ul className="crm-law">{LAW.map((x, i) => <li key={i}><Icon n="shieldCheck" c="sm" /><div><b>{x[0]}</b><p>{x[1]}</p></div></li>)}</ul></>;
  } else {
    body = <><div className="crm-camp-top"><Btn action="crm-camp-new" cls="a-btn-primary" data-seg="sub"><Icon n="plus" c="sm" />새 캠페인</Btn><p className="a-muted">세그먼트를 골라 한 번에 보내요. 7일 안 구매는 받은 회원의 실제 결제로 계산해요.</p></div>
      {camps.length ? <div className="a-table-wrap"><table className="a-table crm-camps"><thead><tr><th>보낸 날</th><th>캠페인</th><th>채널</th><th>대상</th><th className="right">보냄 · 빠짐</th><th className="right">7일 안 구매</th></tr></thead><tbody>{camps.map((c) => { const cv = A.crmConv(c), nn = (c.to || []).length, cp = c.coupon ? ((A.VD().coupons || []).find((x) => x.id === c.coupon) || {}).name || "" : null; return (
        <tr key={c.id}><td className="vda-nw">{A.crmStamp(c.at)}{c.at > Date.now() ? <small className="a-memo"><Pill cls="warn">예약</Pill></small> : null}</td>
          <td><b>{c.name}</b>{c.real ? <> <Pill cls={c.failed ? "warn" : "ok"}>{"실제 발송" + (c.failed ? " · 실패 " + c.failed : "")}</Pill></> : null}<small className="a-memo">{String(c.text || "").slice(0, 60) + (cp != null ? " · 쿠폰 " + cp : "")}</small></td>
          <td className="vda-nw">{(CH[c.ch] || [c.ch])[0]}<small className="a-memo">{c.ad ? "광고" : "정보성"}</small></td><td className="vda-nw">{c.segName || A.crmChipName(c.seg)}</td><td className="right num">{nn}명 · {c.skip || 0}명</td>
          <td className="right num">{cv ? <><b>{cv.n}명</b> {nn ? "(" + Math.round(cv.n / nn * 100) + "%)" : ""}<small className="a-memo">{won(cv.amt)}</small></> : "-"}</td></tr>); })}</tbody></table></div>
        : <Empty ic="send">아직 보낸 캠페인이 없어요.</Empty>}</>;
  }
  return <>
    <Head title="메시지 · 자동화" sub="세그먼트에 카카오 알림톡 · 브랜드 메시지 · 문자 · 이메일을 보내고, 가입 · 찜 · 결제 · 만료 같은 때에 자동으로 나가는 메시지를 켜고 꺼요. 동의 · 야간 · (광고) 표기 규칙은 자동으로 지켜요." />
    <CrmNav on="vod-msg" />
    <section className="a-card crm-card"><div className="a-tabs crm-tabs">{tabs.map((t) => <button key={t[0]} type="button" className={"a-tab" + (tab === t[0] ? " on" : "")} data-action="crm-mt" data-k={t[0]}>{t[1]}{t[2] !== "" ? <> <span className="num">{t[2]}</span></> : null}</button>)}</div>{body}</section>
  </>;
}

/* ---------------- 회원 분석 #/center/master/vod-crm-rp (예전 pageCrmReport) ---------------- */
function HBar({ rows, tot }) {
  return <ul className="crm-hb">{rows.map((r, i) => <li key={i}><span className="crm-hb-l">{r[0]}</span><span className="crm-hb-t"><i style={{ width: (tot ? Math.max(r[1] ? 2 : 0, Math.round(r[1] / tot * 100)) : 0) + "%" }} /></span><span className="crm-hb-v num"><b>{r[1]}명</b>{r[2] != null ? " · " + r[2] : ""}</span></li>)}</ul>;
}
export function MasterCrmReport() {
  const A = ADM(), DB = window.DB, won = A.won, DAY = 864e5, all = A.crmAll(), act = all.filter((pf) => !pf.m.blocked), buyers = act.filter((pf) => pf.paid.length), rep = buyers.filter((pf) => pf.paid.length >= 2);
  const ttf = buyers.filter((pf) => pf.firstPay).map((pf) => Math.max(0, Math.round((pf.firstPay - pf.m.createdAt) / DAY))), avgT = ttf.length ? Math.round(ttf.reduce((a, b) => a + b, 0) / ttf.length) : 0;
  const Kp = ({ l, val, sub }) => <div className="a-kpi"><span>{l}</span><b>{val}</b><small>{sub}</small></div>;
  const t0 = Date.parse(DB.date.todayStr() + "T00:00:00"), wk = [];
  for (let i = 7; i >= 0; i--) { const e = t0 - i * 7 * DAY + DAY, s = e - 7 * DAY, ms = all.filter((pf) => pf.m.createdAt >= s && pf.m.createdAt < e); wk.push({ s, e, k: ms.filter((pf) => pf.m.via === "kakao").length, m: ms.filter((pf) => pf.m.via !== "kakao").length }); }
  const max = Math.max(1, ...wk.map((w) => w.k + w.m)), lbl = (w) => { const d = new Date(w.s); return d.getMonth() + 1 + "/" + d.getDate(); };
  const pc = (a, b) => Math.round(a / Math.max(1, b) * 100) + "%";
  const tried = act.filter((pf) => pf.paid.length || pf.free.length).length, fans = act.filter((pf) => pf.stage === "fan").length;
  const srcs = {}; all.forEach((pf) => { const k = A.crmSrcK(pf.m); srcs[k] = srcs[k] || { n: 0, b: 0, amt: 0 }; srcs[k].n++; if (pf.paid.length) srcs[k].b++; srcs[k].amt += pf.ltv; });
  const srcRows = Object.keys(srcs).sort((a, b) => srcs[b].n - srcs[a].n), maxS = Math.max(1, ...srcRows.map((k) => srcs[k].n));
  return <>
    <Head title="회원 분석" sub="가입 · 첫 구매 · 재구매 흐름과 어디서 들어온 회원이 잘 사는지 봐요. 모든 숫자는 지금 회원 DB에서 바로 계산해요." />
    <CrmNav on="vod-crm-rp" />
    <div className="a-kpis crm-kpis crm-kpis-4"><Kp l="가입 → 첫 구매" val={pc(buyers.length, act.length)} sub={"결제한 회원 " + buyers.length + "명 / " + act.length + "명"} /><Kp l="재구매율" val={pc(rep.length, buyers.length)} sub={"결제 회원 중 2번 이상 " + rep.length + "명"} /><Kp l="결제 회원 평균 LTV" val={won(buyers.length ? Math.round(buyers.reduce((a, pf) => a + pf.ltv, 0) / buyers.length) : 0)} sub="누적 결제 ÷ 결제 회원" /><Kp l="첫 구매까지" val={avgT + "일"} sub="가입하고 첫 결제까지 평균" /></div>
    <div className="crm-grid2">
      <section className="a-card crm-card"><div className="a-card-head"><h2>주별 가입</h2><p className="a-muted">최근 8주 · 막대에 올리면 숫자가 보여요</p></div>
        <div className="crm-ch" role="img" aria-label="최근 8주 주별 가입 수 (이메일 · 카카오)">{wk.map((w, i) => { const tot = w.k + w.m; return <div key={i} className="crm-ch-col" tabIndex={0} data-tip={lbl(w) + " 주 · 가입 " + tot + "명 (카카오 " + w.k + " · 이메일 " + w.m + ")"}><span className="crm-ch-v num">{tot || ""}</span><div className="crm-ch-bar" style={{ height: Math.round(tot / max * 100) + "%" }}>{w.k ? <i className="k" style={{ flex: w.k }} /> : null}{w.m ? <i className="e" style={{ flex: w.m }} /> : null}</div><small>{lbl(w)}</small></div>; })}</div>
        <div className="crm-legend"><span><i className="k" />카카오 가입</span><span><i className="e" />이메일 가입</span></div>
        <details className="crm-tbl"><summary>표로 보기</summary><table className="a-table"><thead><tr><th>주 시작</th><th className="right">카카오</th><th className="right">이메일</th><th className="right">합계</th></tr></thead><tbody>{wk.map((w, i) => <tr key={i}><td>{A.crmDate(w.s)}</td><td className="right num">{w.k}</td><td className="right num">{w.m}</td><td className="right num">{w.k + w.m}</td></tr>)}</tbody></table></details></section>
      <section className="a-card crm-card"><div className="a-card-head"><h2>가입 → 열성팬 퍼널</h2><p className="a-muted">이용 중지 회원 빼고</p></div><HBar rows={[["가입", act.length, "100%"], ["신청 · 결제 1번 이상", tried, pc(tried, act.length)], ["첫 결제", buyers.length, pc(buyers.length, act.length)], ["재구매", rep.length, pc(rep.length, act.length)], ["열성팬", fans, pc(fans, act.length)]]} tot={act.length} /></section>
      <section className="a-card crm-card"><div className="a-card-head"><h2>단계별 회원</h2><a className="a-link" href="#/center/master/vod-seg">기준 바꾸기</a></div><HBar rows={A.CRM_ORDER.map((k) => [A.crmStage(k)[0], all.filter((pf) => pf.stage === k).length, null])} tot={all.length} /></section>
      <section className="a-card crm-card"><div className="a-card-head"><h2>처음 들어온 경로</h2><p className="a-muted">가입할 때 링크의 utm_source · 강사 링크 기준</p></div><div className="a-table-wrap"><table className="a-table crm-src"><thead><tr><th>경로</th><th>가입</th><th className="right">결제 회원</th><th className="right">누적 결제</th></tr></thead><tbody>
        {srcRows.map((k) => <tr key={k}><td className="vda-nw">{A.CRM_SRC[k] || k}</td><td><span className="crm-hb-t sm"><i style={{ width: Math.round(srcs[k].n / maxS * 100) + "%" }} /></span> <span className="num">{srcs[k].n}명</span></td><td className="right num">{srcs[k].b}명 ({Math.round(srcs[k].b / srcs[k].n * 100)}%)</td><td className="right num">{won(srcs[k].amt)}</td></tr>)}</tbody></table></div></section>
    </div>
  </>;
}
