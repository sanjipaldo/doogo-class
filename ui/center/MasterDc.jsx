"use client";
/* 마스터 DOOGO CLASS (1) — DOOGO CLASS 대시보드 · 후기 · 다짐 · 문의 (+ 회원 간단 목록)
 * 예전 admin.js pageMasterDc · pageMasterVodMembers 를 React 로 (Next.js 전환 6단계)
 *  · 탭 · 검색 · 숨기기 · 답변 · 이용 중지 · 상세 · 미리보기는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";

const day = (t) => DBX().date.toStr(new Date(t));
const Store = ({ href, label }) => <Isl html={ADM().vdStoreBtn(href, label)} />;

export function MasterDc() {
  const A = ADM(), DB = DBX(), won = A.won, v = A.VD(), X = A.VX(), t = DB.date.todayStr(), ym = t.slice(0, 7), sum = A.vdSum, P = (id) => A.vdP(id), M = (id) => A.vdMember(id);
  const todayO = v.orders.filter((o) => o.status === "paid" && o.paidAt && day(o.paidAt) === t), mon = A.vdPaidIn(ym), pend = v.orders.filter((o) => o.status === "pending"), rfm = A.vdRfSum(ym);
  const byT = (k) => sum(mon.filter((o) => { const ty = X.typeOf(P(o.pid) || {}); return k === "event" ? ty === "live" || ty === "offline" : ty === k; }));
  const iq = (v.inquiries || []).slice().sort((a, b) => b.at - a.at), iqOpen = iq.filter((x) => !x.answer), newM = v.members.filter((m) => A.vdYM(m.createdAt) === ym).length, rec = A.vdRecruitNew();
  const top = v.products.map((p) => ({ p, n: v.orders.filter((o) => o.pid === p.id && o.status === "paid").length, amt: sum(v.orders.filter((o) => o.pid === p.id && o.status === "paid")) })).filter((x) => x.n).sort((a, b) => b.amt - a.amt).slice(0, 5);
  const coOpen = DB.data.instructors.reduce((a, ins) => a + DB.requests(ins.id).filter((x) => DB.isVodStudent(x.s) && !x.q.answer).length, 0), teaReq = X.teasOf(null, null).filter((o) => o.status === "paid" && (o.tea || {}).st === "req").length;
  const mix = [["6개월 수강권", (o) => X.kindOf(o) === "course" && Number(o.days) === 180 && !o.rebuy], ["12개월 수강권", (o) => X.kindOf(o) === "course" && Number(o.days) === 365 && !o.rebuy], ["재수강 (재결제)", (o) => X.kindOf(o) === "course" && !!o.rebuy], ["예전 3년 수강권 · 1년 연장권", (o) => (X.kindOf(o) === "course" && Number(o.days) === 1095) || X.kindOf(o) === "extend"], ["1:1 코칭권", (o) => X.kindOf(o) === "coach"], ["TEA TIME", (o) => X.kindOf(o) === "tea"]].map((x) => { const os = mon.filter(x[1]); return [x[0], os.length, sum(os)]; });
  const alarmN = v.products.filter((p) => p.status === "soon").reduce((s, p) => s + A.vdAlarmOf(p.id).length, 0), ship = A.vdShipAll();
  const todo = [[pend.length, "입금 확인 대기", "무통장 주문 입금을 확인해 주세요", "#/center/master/vod"], [A.vdRefReqs().length, "환불 요청", "회원 · 강사가 요청한 환불을 처리해 주세요", "#/center/master/vod?of=refreq"], [A.vdRefWait().length, "환불 계좌 송금", "바로 취소한 무통장 주문을 회원 계좌로 송금해 주세요", "#/center/master/vod-refund"], [ship.filter((o) => o.status === "paid" && ["ready", "prep"].indexOf(X.shipStOf(o)) >= 0).length, "보낼 종이책", "신규 주문 · 배송 준비 중인 종이책을 보내 주세요", "#/center/master/vod-ship"], [ship.filter(A.boClaimOn).length, "종이책 취소 · 반품 · 교환", "회원 요청을 승인 · 환불 · 반려해 주세요", "#/center/master/vod-ship"],
    [alarmN, "오픈 알림 신청", "오픈 예정 클래스 알림 신청자에게 오픈 소식 · 쿠폰을 보내요", "#/center/master/vod-classes"], [coOpen, "답변 대기 1:1 코칭 질문", "강사별 코칭 질문 답변이 밀리지 않았는지 확인해요", "#/center/master/vod?tab=care"], [teaReq, "TEA TIME 일정 확정 대기", "강사가 희망 날짜를 보고 확정해야 해요", "#/center/master/vod?tab=care"], [iqOpen.length, "답변 대기 1:1 문의", "고객센터 문의에 답해 주세요", "#/center/master/vod-inquiries"], [rec, "새 두고 파트너스 지원", "파트너 강사 지원서를 확인하고 연락해 주세요", "#/center/master/vod-recruit"], [v.products.filter((p) => p.status === "soon").length, "오픈 예정 클래스", "오픈 일정 · 알림 신청 수를 확인해요", "#/center/master/vod-classes"]];
  const Ava = ({ id }) => <span className="a-avatar">{String((M(id) || {}).name || "?").slice(0, 1)}</span>;
  return <>
    <Head title="DOOGO CLASS 대시보드" sub="VOD 스토어의 주문 · 매출 · 회원 · 1:1 문의를 한눈에 봐요. 두잉고(강사 플랫폼) 운영은 왼쪽 위 ‘두잉고’ 탭에서 해요." right={<Store href="#/vod" label="스토어 미리보기" />} />
    <div className="a-kpis a-kpis-5">
      <Kpi label="오늘 결제" value={todayO.length + "건"} sub={won(sum(todayO))} href="#/center/master/vod" tone={todayO.length ? "ok" : ""} />
      <Kpi label="이번 달 매출" value={won(sum(mon))} sub={"VOD " + won(byT("vod")) + " (부가 " + won(sum(mon.filter((o) => !X.isAccess(o)))) + ") · 전자책 " + won(byT("ebook")) + (byT("book") ? " · 종이책 " + won(byT("book")) : "") + " · LIVE · 오프 " + won(byT("event"))} href="#/center/master/vod-sales" />
      <Kpi label="이번 달 환불" value={rfm.n + "건"} sub={rfm.n ? "- " + won(rfm.amt) + " · 회원 바로 취소 " + rfm.inst + "건" : "환불 없음"} href="#/center/master/vod-refund" tone={rfm.n ? "warn" : ""} />
      <Kpi label="입금 대기" value={pend.length + "건"} sub={won(sum(pend))} href="#/center/master/vod" tone={pend.length ? "warn" : ""} />
      <Kpi label="1:1 문의 대기" value={iqOpen.length + "건"} sub={"이번 달 가입 " + newM + "명"} href="#/center/master/vod-inquiries" tone={iqOpen.length ? "warn" : ""} />
    </div>
    <section className="a-card"><div className="a-card-head"><h2><Icon n="checks" c="sm" /> 오늘 할 일</h2></div><ul className="a-dc-todo">{todo.map((x, i) => <li key={i} className={x[0] ? "on" : ""}><b className="num">{x[0]}</b><div><strong>{x[1]}</strong><small>{x[2]}</small></div><a className="a-link" href={x[3]}>바로 가기 <Icon n="arrowRight" c="xs" /></a></li>)}</ul></section>
    <section className="a-card"><div className="a-card-head"><h2><Icon n="layers" c="sm" /> 수강권 · 부가 상품 <small className="a-muted">이번 달 결제 완료</small></h2><a className="a-link" href="#/center/master/vod-display">기본값 설정 <Icon n="arrowRight" c="xs" /></a></div><div className="a-dc-mix">{mix.map((x, i) => <div key={i} className={x[1] ? undefined : "off"}><small>{x[0]}</small><b className="num">{x[1]}건</b><span className="num">{won(x[2])}</span></div>)}</div></section>
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>최근 주문</h2><a className="a-link" href="#/center/master/vod">전체 <Icon n="arrowRight" c="xs" /></a></div>
        {v.orders.length ? <ul className="a-list">{v.orders.slice().sort((a, b) => b.at - a.at).slice(0, 6).map((o) => { const st = A.VD_OST[o.status] || A.VD_OST.paid; return <li key={o.no}><div className="a-who"><Ava id={o.mid} /><div><b>{o.title}</b><small>{((M(o.mid) || {}).name || "-") + " · " + day(o.at) + " · " + won(o.amount)}</small></div></div><Pill cls={st[1]}>{st[0]}</Pill></li>; })}</ul> : <Empty ic="inbox">아직 주문이 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>최근 1:1 문의</h2><a className="a-link" href="#/center/master/vod-inquiries">전체 <Icon n="arrowRight" c="xs" /></a></div>
        {iq.length ? <ul className="a-list">{iq.slice(0, 6).map((x) => <li key={x.id} className="clickable" data-action="vda-iq" data-id={x.id}><div className="a-who"><Ava id={x.mid} /><div><b>{x.title}</b><small>{x.cat + " · " + ((M(x.mid) || {}).name || "-") + " · " + day(x.at)}</small></div></div>{x.answer ? <Pill cls="ok">답변 완료</Pill> : <Pill cls="warn">답변 대기</Pill>}</li>)}</ul> : <Empty ic="headset">아직 들어온 문의가 없어요.</Empty>}</section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>잘 팔리는 클래스</h2><a className="a-link" href="#/center/master/vod-classes">클래스 관리 <Icon n="arrowRight" c="xs" /></a></div>
      {top.length ? <ul className="a-list">{top.map((x, i) => <li key={x.p.id}><div className="vda-cl"><b className="a-dc-rank">{i + 1}</b><Isl html={A.vdThumb(x.p)} /><div><b>{x.p.title}</b><small className="a-memo">{(x.p.creator || "") + " · " + X.TYPE[X.typeOf(x.p)][0]}</small></div></div><span className="num"><b>{won(x.amt)}</b> · {x.n}건</span><button type="button" className="a-btn a-btn-ghost a-btn-sm" data-action="store-split" data-href={"#/vod/p/" + x.p.id}>보기</button></li>)}</ul> : <Empty ic="monitorPlay">아직 판매가 없어요.</Empty>}</section>
  </>;
}

export function MasterVodMembers() {
  const A = ADM(), DB = DBX(), won = A.won, ui = A.ui, v = A.VD(), tab = ui.vdMt || "reviews", q = (ui.vdMq || "").trim().toLowerCase(), P = (id) => A.vdP(id), M = (id) => A.vdMember(id);
  const buys = (m) => v.orders.filter((o) => o.mid === m.id && o.status === "paid");
  const members = v.members.filter((m) => !q || (m.name + " " + m.email + " " + (m.phone || "")).toLowerCase().indexOf(q) >= 0).sort((a, b) => b.createdAt - a.createdAt);
  const rv = v.reviews.slice().sort((a, b) => b.at - a.at), pl = (v.pledges || []).slice().sort((a, b) => b.at - a.at), iq = (v.inquiries || []).slice().sort((a, b) => (!a.answer ? 0 : 1) - (!b.answer ? 0 : 1) || b.at - a.at), pub = v.reviews.filter((r) => !r.hidden);
  const T = ({ heads, children }) => <div className="a-table-wrap"><table className="a-table vda-table"><thead><tr>{heads.map((h, i) => <th key={i} className={i === heads.length - 1 ? "right" : undefined}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
  const body = tab === "inquiries" ? (iq.length ? <T heads={["문의일", "회원", "종류", "문의 내용", "상태", "관리"]}>{iq.map((x) => { const m = M(x.mid) || {}; return (
      <tr key={x.id}><td className="vda-nw">{day(x.at)}</td><td className="vda-nw"><b>{m.name || "탈퇴 회원"}</b><small className="a-memo">{m.email || ""}</small></td><td className="vda-nw">{x.cat}</td><td className="vda-rv"><b>{x.title}</b><br />{x.text}{x.answer ? <small className="a-memo">답변: {x.answer}</small> : null}</td><td>{x.answer ? <Pill cls="ok">답변 완료</Pill> : <Pill cls="warn">답변 대기</Pill>}</td>
        <td className="right"><Btn action="vda-iq" cls={x.answer ? "a-btn-ghost a-btn-sm" : "a-btn-primary a-btn-sm"} data-id={x.id}>{x.answer ? "답변 고치기" : "답변하기"}</Btn></td></tr>); })}</T> : <Empty ic="headset">아직 1:1 문의가 없어요.</Empty>)
    : tab === "pledges" ? (pl.length ? <T heads={["작성일", "클래스", "별명", "다짐 한마디", "공감", "상태", "관리"]}>{pl.map((x) => { const p = P(x.pid) || {}, mm = x.mid && M(x.mid); return (
      <tr key={x.id} className={x.hidden ? "a-dim" : undefined}><td className="vda-nw">{day(x.at)}</td><td>{p.title || "삭제된 클래스"}</td><td className="vda-nw">{x.nick}{mm ? <small className="a-memo">{mm.name}</small> : null}</td><td className="vda-rv">{x.text}</td><td className="num">{x.up || 0}</td><td>{x.hidden ? <Pill cls="mute">숨김</Pill> : <Pill cls="ok">공개</Pill>}{x.best ? <Pill cls="info">베스트</Pill> : null}</td>
        <td className="right"><Btn action="vda-pl-best" cls="a-btn-ghost a-btn-sm" data-id={x.id}>{x.best ? "베스트 빼기" : "베스트로"}</Btn><Btn action="vda-pl-hide" cls="a-btn-ghost a-btn-sm" data-id={x.id}>{x.hidden ? "다시 보이기" : "숨기기"}</Btn></td></tr>); })}</T> : <Empty ic="message">아직 다짐 한마디가 없어요.</Empty>)
    : tab === "reviews" ? (rv.length ? <T heads={["작성일", "클래스", "작성자", "별점", "내용", "상태", "관리"]}>{rv.map((r) => { const p = P(r.pid) || {}; return (
      <tr key={r.id} className={r.hidden ? "a-dim" : undefined}><td>{day(r.at)}</td><td>{p.title || "삭제된 클래스"}</td><td>{r.name}</td><td className="num">{"★".repeat(r.rating)}<span className="a-muted">{"★".repeat(5 - r.rating)}</span></td><td className="vda-rv">{r.text}</td><td>{r.hidden ? <Pill cls="mute">숨김</Pill> : <Pill cls="ok">공개</Pill>}{r.best ? <Pill cls="info">베스트</Pill> : null}</td>
        <td className="right"><Btn action="vda-rv-best" cls="a-btn-ghost a-btn-sm" data-id={r.id}>{r.best ? "베스트 빼기" : "베스트로"}</Btn><Btn action="vda-rv-hide" cls="a-btn-ghost a-btn-sm" data-id={r.id}>{r.hidden ? "다시 보이기" : "숨기기"}</Btn></td></tr>); })}</T> : <Empty ic="star">아직 후기가 없어요.</Empty>)
    : <><p className="crm-move"><Icon n="users" c="sm" /><span>가입 방식 · 단계 · 구매 · 쿠폰 · 포인트 · 소식 받기 동의까지 보는 자세한 회원 관리는 <a className="a-link" href="#/center/master/vod-crm">회원 DB</a>에서 해요.</span></p>
      {members.length ? <T heads={["이름", "이메일", "휴대폰", "가입일", "구매", "마케팅", "상태", "관리"]}>{members.map((m) => { const b = buys(m); return (
        <tr key={m.id} className={m.blocked ? "a-dim" : undefined}><td><b>{m.name}</b></td><td>{m.email}</td><td>{m.phone || "-"}</td><td>{day(m.createdAt)}</td><td className="num">{b.length}건{b.length ? <small className="a-memo">{won(A.vdSum(b))}</small> : null}</td><td>{m.marketing ? <Pill cls="info">동의</Pill> : <span className="a-muted">-</span>}</td><td>{m.blocked ? <Pill cls="bad">이용 중지</Pill> : <Pill cls="ok">정상</Pill>}</td>
          <td className="right"><Btn action="vda-mem" cls="a-btn-ghost a-btn-sm" data-id={m.id}>상세</Btn><Btn action="vda-block" cls="a-btn-ghost a-btn-sm" data-id={m.id}>{m.blocked ? "중지 풀기" : "이용 중지"}</Btn></td></tr>); })}</T> : <Empty ic="users">조건에 맞는 회원이 없어요.</Empty>}</>;
  return <>
    <Head title="후기 · 다짐 · 문의" sub="DOOGO CLASS 회원이 남긴 수강 후기 · 다짐 한마디 · 1:1 문의를 관리해요. ‘베스트로’를 누르면 그 클래스 상세 탭 위 ‘베스트 후기’ 줄에 보여요. 회원 정보 · 구매 · 쿠폰 · 포인트 · 메시지는 ‘회원 DB’에서 해요." right={<><a className="a-btn a-btn-ghost" href="#/center/master/vod-crm"><Icon n="users" c="sm" />회원 DB</a><Store /></>} />
    <div className="a-kpis">
      <Kpi label="VOD 회원" value={v.members.length + "명"} sub={"이번 달 가입 " + v.members.filter((m) => A.vdYM(m.createdAt) === DB.date.todayStr().slice(0, 7)).length + "명"} href="#/center/master/vod-crm" tone="ok" />
      <Kpi label="구매한 회원" value={v.members.filter((m) => buys(m).length).length + "명"} sub="1번 이상 결제" href="#/center/master/vod-crm" />
      <Kpi label="마케팅 동의" value={v.members.filter((m) => m.marketing).length + "명"} sub="할인 · 새 클래스 알림 대상" href="#/center/master/vod-crm" />
      <Kpi label="평균 별점" value={pub.length ? (pub.reduce((a, r) => a + r.rating, 0) / pub.length).toFixed(1) : "-"} sub={"공개 후기 " + pub.length + "개"} href="#/center/master/vod-members" />
    </div>
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{[["reviews", "후기", v.reviews.length], ["pledges", "다짐 한마디", (v.pledges || []).length], ["inquiries", "1:1 문의", (v.inquiries || []).filter((x) => !x.answer).length], ["members", "회원 간단 목록", v.members.length]].map((x) => <button key={x[0]} type="button" className={"a-tab" + (tab === x[0] ? " on" : "")} data-action="vda-mt" data-k={x[0]}>{x[1]} <span className="num">{x[2]}</span></button>)}</div>
      {tab === "members" ? <div className="a-filters"><div className="a-search"><Icon n="search" c="sm" /><input className="a-input a-sm" id="vda-mq" type="search" placeholder="이름 · 이메일 · 휴대폰" defaultValue={ui.vdMq || ""} /></div></div> : null}</div>{body}</section>
  </>;
}

/* 고객센터 1:1 문의 — 예전 pageMasterVodInquiries (탭 vd-iqf · 답변 vda-iq) */
export function MasterVodInquiries() {
  const A = ADM(), DB = DBX(), ui = A.ui, v = A.VD(), M = (id) => A.vdMember(id), f = ui.vdIqF || "open";
  const all = (v.inquiries || []).slice().sort((a, b) => (!a.answer ? 0 : 1) - (!b.answer ? 0 : 1) || b.at - a.at), list = all.filter((x) => (f === "open" ? !x.answer : f === "done" ? !!x.answer : true));
  const done = all.filter((x) => x.answer && x.answeredAt), avgH = done.length ? Math.round(done.reduce((a, x) => a + (x.answeredAt - x.at), 0) / done.length / 36e5) : null, open = all.filter((x) => !x.answer).length;
  const cats = {}; all.forEach((x) => { cats[x.cat] = (cats[x.cat] || 0) + 1; });
  const t = DB.date.todayStr(), H = "#/center/master/vod-inquiries";
  return <>
    <Head title="고객센터 1:1 문의" sub="DOOGO CLASS 회원이 마이페이지 › 고객센터에서 남긴 문의예요. 답변하면 회원 마이페이지에 바로 보여요. (두잉고 수강생의 1:1 요청은 각 강사센터로 가요)" right={<Store href="#/vod/my/help" label="고객센터 화면 보기" />} />
    <div className="a-kpis">
      <Kpi label="답변 대기" value={open + "건"} sub="오래된 문의부터 답해 주세요" href={H} tone={open ? "warn" : "ok"} />
      <Kpi label="오늘 접수" value={all.filter((x) => day(x.at) === t).length + "건"} sub={"전체 " + all.length + "건"} href={H} />
      <Kpi label="평균 답변 시간" value={avgH == null ? "-" : avgH < 1 ? "1시간 안" : avgH + "시간"} sub={"답변 완료 " + done.length + "건 기준"} href={H} />
      <Kpi label="많이 묻는 종류" value={Object.keys(cats).sort((a, b) => cats[b] - cats[a])[0] || "-"} sub={Object.keys(cats).map((k) => k + " " + cats[k]).join(" · ") || "아직 없어요"} href={H} />
    </div>
    <section className="a-card"><div className="a-toolbar"><div className="a-tabs">{[["open", "답변 대기", open], ["done", "답변 완료", done.length], ["all", "전체", all.length]].map((x) => <button key={x[0]} type="button" className={"a-tab" + (f === x[0] ? " on" : "")} data-action="vd-iqf" data-k={x[0]}>{x[1]} <span className="num">{x[2]}</span></button>)}</div></div>
      {list.length ? <div className="a-table-wrap"><table className="a-table vda-table"><thead><tr><th>문의일</th><th>회원</th><th>종류</th><th>문의 내용</th><th>상태</th><th className="right">관리</th></tr></thead><tbody>{list.map((x) => { const m = M(x.mid) || {}; return (
        <tr key={x.id}><td className="vda-nw">{day(x.at)}</td><td className="vda-nw"><b>{m.name || "탈퇴 회원"}</b><small className="a-memo">{m.email || ""}</small></td><td className="vda-nw">{x.cat}</td><td className="vda-rv"><b>{x.title}</b><br />{x.text}{x.answer ? <small className="a-memo">답변: {x.answer}</small> : null}</td><td>{x.answer ? <Pill cls="ok">답변 완료</Pill> : <Pill cls="warn">답변 대기</Pill>}</td>
          <td className="right"><Btn action="vda-iq" cls={x.answer ? "a-btn-ghost a-btn-sm" : "a-btn-primary a-btn-sm"} data-id={x.id}>{x.answer ? "답변 고치기" : "답변하기"}</Btn></td></tr>); })}</tbody></table></div>
        : <Empty ic="check">{f === "open" ? "답변을 기다리는 문의가 없어요." : "문의가 없어요."}</Empty>}</section>
  </>;
}
