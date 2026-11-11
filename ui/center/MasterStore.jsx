"use client";
/* 마스터 DOOGO CLASS (2) — 스토어 꾸미기: 홈 꾸미기
 * 예전 admin.js pageVodHome · hmEditor 를 React 로 (Next.js 전환 6단계)
 *  · 섹션 고르기 · 켜기 · 옮기기 · 강의 추가 · 빼기 · 제목 저장은 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";

const Store = ({ href, label }) => <Isl html={ADM().vdStoreBtn(href, label)} />;
const hmName = (r) => r.t.join("").trim() || r.k;

function HmSt({ p }) {
  if (!p) return null;
  return p.status === "soon" ? <Pill cls="info">오픈 예정</Pill> : p.status !== "on" ? <Pill cls="mute">숨김</Pill> : null;
}
/** 섹션 · 탭 · 강사진의 한 줄 — o: 강사 줄처럼 사진 · 설명을 따로 줄 때 { ph, name, sub } */
function HmRow({ it, i, n, k, c, fixed, o }) {
  const A = ADM(), X = A.VX(), p = it.p, real = o ? null : X.product(p.id), d = { "data-k": k, "data-c": c || undefined, "data-i": i };
  const mv = (to, ic, lab, dis) => <button type="button" className="a-icon-btn" data-action="hk-mv" {...d} data-to={to} aria-label={lab} disabled={dis || undefined}><Icon n={ic} c="sm" /></button>;
  return <li className={"hk-it" + (fixed ? " pin" : "")}><span className="hk-no">{i + 1}</span>
    <span className={"hk-th" + (o ? " hk-av" : "")}>{o ? (o.ph ? <img src={o.ph} alt="" /> : (o.name || "?").slice(0, 1)) : real ? <Isl html={X.thumbArt(real)} /> : <Icon n="layers" c="sm" />}</span>
    <span className="hk-tx"><b>{p.title || ""}</b><small>{o ? o.sub : (real ? A.adTypeShort(real) : "두잉고 기수 강의") + (p.creator ? " · " + p.creator : "")} · {fixed ? <em>고정</em> : "자동"}</small><HmSt p={real} /></span>
    <span className="hk-act"><button type="button" className="a-btn a-btn-ghost a-btn-sm hk-top" data-action="hk-mv" {...d} data-to="0" disabled={i === 0 || undefined}>맨 앞</button>{mv(i - 1, "arrowUp", "앞으로", i === 0)}{mv(i + 1, "arrowDown", "뒤로", i === n - 1)}
      <button type="button" className="a-icon-btn hk-del" data-action="hk-hide" data-k={k} data-c={c || undefined} data-id={p.id} aria-label="이 섹션에서 빼기" title="빼기"><Icon n="x" c="sm" /></button></span></li>;
}
function HmHidden({ o, k, c, nameOf }) {
  if (!o.hide.length) return null;
  return <div className="hk-hid"><p><b>뺀 {k === "teach" ? "강사" : "강의"} {o.hide.length}</b><small>첫 화면 이 자리에 안 보여요 · 다시 넣으면 원래 자리로</small></p><div>{o.hide.map((id) => <span key={id} className="hk-chip">{nameOf(id)}<button type="button" data-action="hk-show" data-k={k} data-c={c || undefined} data-id={id}>다시 넣기</button></span>)}</div></div>;
}
const hmPName = (id) => { const p = ADM().VX().product(id); return p ? p.title : "지워진 강의"; };
function HmList({ items, k, c, pinN, cut, cutTxt }) {
  if (!items.length) return <p className="hk-empty"><Icon n="alert" c="xs" /> 보일 강의가 없어서 첫 화면에서 이 자리는 숨겨져요.</p>;
  return <ol className="hk-items">{items.flatMap((it, i) => [cut && i === cut ? <li key={"cut"} className="hk-cut">{cutTxt}</li> : null, <HmRow key={it.p.id} it={it} i={i} n={items.length} k={k} c={c} fixed={i < pinN} />])}</ol>;
}
function HmEditor({ r }) {
  const A = ADM(), X = A.VX(), ui = A.ui, CUT = A.HM_CUT, off = r.biz && !X.bizOn(r.biz);
  const title = r.k === "teach" ? null : <form id="vda-rails-form" className="a-form hk-tt" noValidate><div className="a-form-row">
      {r.k === "topics" ? null : <div className="a-field"><label>작은 이름표</label><input className="a-input" name={r.k + "-tag"} defaultValue={r.tag} maxLength={16} placeholder="비우면 숨겨요" /></div>}
      <div className="a-field vda-rail-tt"><label>제목 <small>(앞 · <b style={{ color: "#e0103a" }}>빨간 강조</b> · 뒤)</small></label><div className="vda-rail-t3"><input className="a-input" name={r.k + "-t0"} defaultValue={r.t[0] || ""} maxLength={30} aria-label="제목 앞" /><input className="a-input vda-rail-acc" name={r.k + "-t1"} defaultValue={r.t[1] || ""} maxLength={20} aria-label="빨간 강조" /><input className="a-input" name={r.k + "-t2"} defaultValue={r.t[2] || ""} maxLength={20} aria-label="제목 뒤" /></div></div></div>
    <div className="a-form-actions"><button className="a-btn a-btn-primary a-btn-sm" type="submit">이름표 · 제목 저장</button></div></form>;
  let body = null;
  if (r.k === "why" || r.k === "topics") body = <p className="a-muted p-small hk-fx"><Icon n="lock" c="xs" /> 고정 섹션이에요 ({r.rule}). {r.k === "topics" ? "칩은 ‘전시 · 쿠폰 · 설정 › 다루는 부업’에서 고쳐요." : "켜기 · 순서 · 제목만 바꿔요."}</p>;
  else if (r.k === "teach") {
    const list = X.teachHome(r), pk = r.picks.filter((k) => list.some((t) => t.iid === k)).length;
    body = <><p className="a-muted p-small hk-note">강사 순서는 첫 화면과 강사진 메뉴에 같이 써요. 빼면 첫 화면에서만 숨겨요 (강사진 메뉴 · 강사 페이지는 그대로).</p>
      {list.length ? <ol className="hk-items">{list.flatMap((t, i) => [i === CUT.teach ? <li key="cut" className="hk-cut">여기까지 첫 화면에 보여요 ({CUT.teach}명) · 아래는 강사진 메뉴에서만</li> : null,
        <HmRow key={t.iid} it={{ p: { id: t.iid, title: t.name } }} i={i} n={list.length} k="teach" c="" fixed={i < pk} o={{ ph: t.ph || X.insPhoto(t.iid), name: t.name, sub: "클래스 " + t.ps.length + "개 · " + t.cats.slice(0, 2).join(" · ") }} />])}</ol> : <p className="hk-empty">판매 중인 강의가 있는 강사가 없어요.</p>}
      <HmHidden o={r} k="teach" c="" nameOf={(id) => { const t = X.teacherList().find((x) => x.iid === id); return t ? t.name : id; }} /></>;
  } else if (r.k === "cat") {
    const tabs = X.catTabs(r), cur = tabs.find((t) => t.k === ui.hmCat) || tabs[0];
    if (cur) ui.hmCat = cur.k;
    body = <><p className="a-muted p-small hk-note">분야 탭 순서 · 켜기를 정하고, 탭을 골라 그 안의 강의 순서를 바꿔요. 첫 화면 탭에는 {CUT.cat}개까지 보이고 나머지는 ‘전체보기’에서 봐요.</p>
      <ul className="hk-tabs">{tabs.map((t, i) => <li key={t.k} className={(t === cur ? "on" : "") + (t.on && t.items.length ? "" : " off")}><button type="button" className="hk-tab" data-action="hk-cat" data-c={t.k}><span className="hk-no">{i + 1}</span><b>{t.c.label}</b><small>{t.items.length}개{!t.items.length ? " · 강의 없음" : ""}</small></button>
        <button type="button" className={"a-switch" + (t.on ? " on" : "")} data-action="hk-cat-on" data-c={t.k} role="switch" aria-checked={String(!!t.on)} aria-label={t.c.label + " 탭 보이기"}><i /></button>
        <button type="button" className="a-icon-btn" data-action="hk-cat-mv" data-c={t.k} data-dir="-1" aria-label="앞으로" disabled={i === 0 || undefined}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn" data-action="hk-cat-mv" data-c={t.k} data-dir="1" aria-label="뒤로" disabled={i === tabs.length - 1 || undefined}><Icon n="arrowDown" c="sm" /></button></li>)}</ul>
      {cur ? <><h3 className="hk-sub">{cur.c.label} 탭 강의 순서</h3><HmList items={cur.items.map((p) => ({ p }))} k="cat" c={cur.k} pinN={cur.picks.filter((id) => cur.items.some((p) => p.id === id)).length} cut={CUT.cat} cutTxt={"여기까지 첫 화면 탭에 보여요 (" + CUT.cat + "개) · 나머지는 ‘전체보기’에서"} /><HmHidden o={{ hide: cur.hide }} k="cat" c={cur.k} nameOf={hmPName} />
        <p className="a-muted p-small">다른 분야 강의를 넣으려면 VOD 클래스 관리 › 클래스 수정에서 분야를 바꿔요.</p></> : <p className="hk-empty">켜진 분야가 없어요.</p>}</>;
  } else {
    const items = X.railItems(r), vis = items.map((it) => it.p.id), pinN = r.mode === "auto" ? 0 : r.mode === "only" ? items.length : r.picks.filter((id) => vis.indexOf(id) >= 0).length;
    // 넣을 수 있는 강의: 스토어에 실제로 보일 수 있는 것만 (숨김 · 지난 LIVE · 꺼진 판매 영역은 빼요)
    const cand = A.VD().products.filter((p) => X.railShowable(p) && vis.indexOf(p.id) < 0).sort((a, b) => A.adTypeShort(a).localeCompare(A.adTypeShort(b)) || String(a.title).localeCompare(String(b.title)));
    body = <><div className="hk-ctl"><div className="a-field"><label htmlFor="hk-mode">강의 고르는 방법</label><select key={r.k + ":" + r.mode} className="a-input" id="hk-mode" data-hk-mode={r.k} defaultValue={r.mode}>{A.RAIL_MODE.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></div>
        <div className="a-field"><label htmlFor="hk-add">강의 추가</label><div className="vda-rail-add"><select key={r.k + ":" + vis.join(",")} className="a-input" id="hk-add" defaultValue=""><option value="">넣을 강의를 골라 주세요</option>{cand.map((p) => <option key={p.id} value={p.id}>[{A.adTypeShort(p)}] {p.title}{p.status === "soon" ? " (오픈 예정)" : ""}{r.hide.indexOf(p.id) >= 0 ? " · 뺀 강의" : ""}</option>)}</select><Btn action="hk-add" cls="a-btn-ghost a-btn-sm" data-k={r.k}><Icon n="plus" c="sm" />추가</Btn></div></div></div>
      <p className="a-muted p-small hk-note">규칙: {r.rule}. {r.mode === "only" ? "고른 강의만 이 순서대로 보여요." : "‘맨 앞’ · ↑ ↓로 옮기면 그 자리까지 고정되고, 새로 올라오는 강의는 규칙대로 뒤에 붙어요."}</p>
      <HmList items={items} k={r.k} c="" pinN={pinN} /><HmHidden o={r} k={r.k} c="" nameOf={hmPName} /></>;
  }
  const resettable = r.k !== "why" && r.k !== "topics";
  return <><div className="a-card-head"><h2>{hmName(r)} <small className="a-muted">섹션 편집</small></h2>{resettable ? <Btn action="hk-reset" cls="a-btn-ghost a-btn-sm vda-ml" data-k={r.k}>이 섹션 처음 규칙으로</Btn> : null}</div>
    {off ? <p className="hk-warn"><Icon n="alert" c="xs" /> 판매 영역이 꺼져 있어서 첫 화면에 안 보여요. <Btn action="vda-biz" cls="a-btn-ghost a-btn-sm" data-k={r.biz}>판매 영역 켜기</Btn></p> : !r.on ? <p className="hk-warn"><Icon n="eyeOff" c="xs" /> 꺼 둔 섹션이에요. 왼쪽(휴대폰은 위) 스위치를 켜면 보여요.</p> : null}
    {title ? <HmForm key={r.k + ":" + (r.tag || "") + ":" + r.t.join("|")}>{title}</HmForm> : null}{body}</>;
}
// 제목 폼은 섹션 · 저장된 값이 바뀔 때만 새로 그려요 (쓰는 중인 글자는 그대로 — 예전처럼 저장 · 다른 섹션으로 가면 새 값)
const HmForm = ({ children }) => children;

export function MasterVodHome() {
  const A = ADM(), X = A.VX(), ui = A.ui, rs = X.homeRails(), sel = rs.find((r) => r.k === ui.hmSel) || rs[0], CUT = A.HM_CUT;
  ui.hmSel = sel.k;
  const shown = (r) => r.on && (!r.biz || X.bizOn(r.biz));
  const cnt = (r) => (r.k === "cat" ? X.catTabs(r).filter((t) => t.on && t.items.length).length + "개 분야" : r.k === "teach" ? Math.min(CUT.teach, X.teachHome(r).length) + "명" : r.k === "why" || r.k === "topics" ? "고정" : X.railItems(r).length + "개");
  return <>
    <Head title="홈 꾸미기" sub="스토어 첫 화면(PC · 휴대폰 같은 순서)에 보이는 섹션 순서와, 섹션마다 들어갈 강의 · 순서를 정해요. 누르는 즉시 저장되고 스토어 홈에 바로 보여요." right={<Store href="#/vod" label="스토어 홈 미리보기" />} />
    <div className="hk-grid"><section className="a-card hk-secs"><div className="a-card-head"><h2>섹션 순서</h2><span className="a-muted">배너 · 카테고리 아이콘 아래에 위에서부터 이 순서대로 보여요. 끄면 숨겨요.</span><Btn action="vda-rail-reset" cls="a-btn-ghost a-btn-sm vda-ml">전체 처음 상태로</Btn></div>
      <ol className="hk-list">{rs.map((r, i) => <li key={r.k} className={(r.k === sel.k ? "on" : "") + (shown(r) ? "" : " off")}><button type="button" className="hk-pick" data-action="hk-sel" data-k={r.k}><span className="hk-no">{i + 1}</span><span className="hk-tx"><b>{hmName(r)}</b><small>{r.biz && !X.bizOn(r.biz) ? "판매 영역 꺼짐" : !r.on ? "꺼짐" : cnt(r)}{r.mode && r.mode !== "auto" && !r.fixed ? " · " + (r.mode === "only" ? "고른 강의만" : "순서 고정") : ""}</small></span></button>
        <button type="button" className={"a-switch" + (r.on ? " on" : "")} data-action="vda-rail-on" data-k={r.k} role="switch" aria-checked={String(!!r.on)} aria-label={hmName(r) + " 보이기"}><i /></button>
        <button type="button" className="a-icon-btn" data-action="vda-rail-move" data-k={r.k} data-dir="-1" aria-label="위로" disabled={i === 0 || undefined}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn" data-action="vda-rail-move" data-k={r.k} data-dir="1" aria-label="아래로" disabled={i === rs.length - 1 || undefined}><Icon n="arrowDown" c="sm" /></button></li>)}</ol></section>
      <section className="a-card hk-ed" id="hk-ed"><HmEditor r={sel} /></section></div>
  </>;
}

/* ---------------- VOD 전시 · 쿠폰 · 설정 #/center/master/vod-display (예전 pageMasterVodDisplay) ----------------
 *  · 폼(카테고리 · 부업 칩 · 정산 설정 · 아이콘 줄)은 예전처럼 다시 그릴 때마다 저장된 값으로 새로 그려요 (key=n) */
const Img = ({ u }) => <Isl html={"<img " + ADM().VX().imgAttr(u, "src") + ' alt="">'} />;
const Sw = ({ on, action, i, k, label }) => <button type="button" className={"a-switch" + (on ? " on" : "")} data-action={action} data-i={i} data-k={k} role="switch" aria-checked={String(!!on)} aria-label={label}><i /></button>;
const Mv = ({ action, i, k, dir, label, dis }) => <button type="button" className="a-icon-btn" data-action={action} data-i={i} data-k={k} data-dir={dir} aria-label={label} disabled={dis || undefined}><Icon n={dir < 0 ? "arrowUp" : "arrowDown"} c="sm" /></button>;
const br = (s) => String(s || "").split("\n").map((x, i) => (i ? [<br key={i} />, x] : x));

function BizCard({ v }) {
  const X = ADM().VX(), P = v.products.filter((p) => p.status === "on"), on = (k) => X.bizOn(k);
  const n = { vod: P.filter((p) => X.typeOf(p) === "vod" && X.priceOf(p) > 0).length, ebook: P.filter((p) => X.typeOf(p) === "ebook").length, live: P.filter((p) => X.isEvent(p) && !X.isFreeEv(p)).length, free: P.filter((p) => !X.isEvent(p) && X.basePrice(p) === 0).length, flive: P.filter((p) => X.isFreeEv(p)).length };
  const row = (k, name, desc, fixed) => <div key={k} className={"vda-biz" + (fixed || on(k) ? "" : " off")}><span className="vda-biz-ic"><Icon n={k === "vod" ? "monitorPlay" : k === "ebook" ? "book" : k === "live" ? "calendar" : k === "flive" ? "video" : "sparkles"} c="sm" /></span><div><b>{name}</b><small>{desc} · 판매 중 {n[k]}개</small></div>
    {fixed ? <Pill cls="ok">항상 켜짐</Pill> : <><span className="vda-biz-st">{on(k) ? "보여요" : "숨김"}</span><Sw on={on(k)} action="vda-biz" k={k} label={name + " 판매 영역"} /></>}</div>;
  return <section className="a-card"><div className="a-card-head"><h2>판매 영역</h2><span className="a-muted">지금 운영하는 사업만 켜 두세요. 끄면 스토어 메뉴 · 홈 · 카테고리 아이콘 · 전체 클래스 · 검색 · 강사 페이지에서 숨겨요. 이미 산 수강생은 마이페이지에서 그대로 들어요.</span></div>
    <div className="vda-bizs">{row("vod", "VOD 강의", "유료 녹화 강의", true)}{row("ebook", "전자책", "PDF 전자책")}{row("flive", "LIVE 무료강의 → 얼리버드", "무료 LIVE 신청 → 오픈채팅방 → 유튜브 LIVE → 끝나면 이어지는 유료 강의 얼리버드 · 홈 ‘무료 LIVE’ · ‘얼리버드 할인중’ 섹션")}{row("live", "온/오프라인 강의 (유료)", "현장 강의 · Zoom 온라인 강의 · 두잉고 기수 강의 연결")}{row("free", "무료 VOD 특강", "0원 녹화 특강")}</div></section>;
}
function FunnelCard({ v }) {
  const A = ADM(), X = A.VX(), won = A.won, on = X.bizOn("flive"), fs = v.products.filter((p) => X.isFreeEv(p) && p.status !== "hidden").sort((a, b) => String(b.eventAt || "").localeCompare(String(a.eventAt || "")));
  const St = ({ fn, f }) => !fn ? <Pill cls="mute">연결 없음</Pill> : fn.phase === "before" ? <Pill cls="info">{"LIVE 예정 · " + X.fmtEvent(f.eventAt).replace(/\s*\d{1,2}:\d{2}$/, "")}</Pill> : fn.phase === "eb" ? <Pill cls="warn">{"얼리버드 중 · ~" + X.ebDayTxt(fn.ebDay)}</Pill> : <Pill cls="mute">끝 · 정가 판매</Pill>;
  const flow = [["video", "무료 LIVE 신청", "0원 · 로그인 후 신청"], ["message", "오픈채팅방 입장", "신청자에게만 버튼이 열려요"], ["play", "유튜브 LIVE", "강의 날 오픈채팅방 · 마이페이지에 링크"], ["sparkles", "얼리버드 결제", "LIVE가 끝나면 자동으로 열려요"]];
  const rows = fs.map((f) => {
    const fn = X.funnelOf(f), nx = fn && X.product(fn.next), apps = v.orders.filter((o) => o.pid === f.id && o.status === "paid"), mids = {}; apps.forEach((o) => { mids[o.mid] = 1; });
    const conv = fn ? v.orders.filter((o) => o.pid === fn.next && o.status === "paid" && (!o.kind || o.kind === "course") && mids[o.mid] && (o.paidAt || o.at) >= fn.end && (o.paidAt || o.at) <= fn.ebEnd) : [];
    return <tr key={f.id}><td><b>{f.title}</b><small className="a-memo">{(f.creator || "") + " · " + (f.eventAt ? X.fmtEvent(f.eventAt, true) : "일시 미정")}</small></td>
      <td className="num">{apps.length}명</td><td>{nx ? <><b>{nx.title}</b><small className="a-memo">{(fn.ebPrice ? "얼리버드 " + won(fn.ebPrice) + " · 정가 " + won(nx.price) : "할인 없이 연결") + " · LIVE 끝나고 " + (Number(f.ebDays) || 3) + "일" + (f.gate ? " · 끝날 때까지 숨김" : "")}</small></> : <span className="a-muted">-</span>}</td>
      <td><St fn={fn} f={f} /></td><td className="num">{fn && fn.phase !== "before" ? <>{conv.length}건{apps.length ? <> <small className="a-memo">전환 {Math.round(conv.length / apps.length * 100)}%</small></> : null}</> : <span className="a-muted">LIVE 뒤</span>}</td>
      <td className="right"><Btn action="vda-roster" cls="a-btn-ghost a-btn-sm" data-id={f.id}>명단</Btn><a className="a-btn a-btn-ghost a-btn-sm" href={"#/center/master/vod-classes/" + f.id}>설정</a></td></tr>;
  });
  return <section className="a-card vda-funnel"><div className="a-card-head"><h2>LIVE 무료강의 → 얼리버드</h2>{on ? <Pill cls="ok">판매 영역 켜짐 · 스토어에 보여요</Pill> : <Pill cls="mute">판매 영역 꺼짐 · 스토어에는 안 보여요</Pill>}<Btn action="vda-new-fl" cls="a-btn-ghost a-btn-sm vda-ml"><Icon n="plus" c="sm" />LIVE 무료강의 만들기</Btn></div>
    <p className="a-muted p-small">무료 LIVE와 유료 강의는 따로 만들고 하나로 이어요. LIVE가 끝나면 무료 LIVE 카드는 자동으로 빠지고, 이어지는 유료 강의가 얼리버드 가격 · 마감 시계와 함께 홈 ‘얼리버드 할인중’에 떠요. 꺼 둔 동안에는 스토어가 지금 그대로예요.</p>
    <ol className="vda-flow">{flow.map((x, i) => <li key={i}><span><Icon n={x[0]} c="sm" /></span><b>{i + 1}. {x[1]}</b><small>{x[2]}</small></li>)}</ol>
    {rows.length ? <div className="a-table-wrap"><table className="a-table vda-fun-t"><thead><tr><th>무료 LIVE</th><th>신청</th><th>이어지는 유료 강의</th><th>상태</th><th>얼리버드 결제</th><th className="right">관리</th></tr></thead><tbody>{rows}</tbody></table></div> : <p className="a-muted">아직 무료 LIVE가 없어요. ‘무료 LIVE 만들기’를 눌러 시작해 보세요.</p>}</section>;
}
function BanState({ x }) {
  const DB = window.DB, t = DB.date.todayStr(), md = (s) => Number(s.slice(5, 7)) + "." + Number(s.slice(8, 10));
  const st = x.on === false ? ["off", "꺼짐"] : x.from && t < x.from ? ["wait", md(x.from) + "부터"] : x.to && t > x.to ? ["end", "기간 끝"] : x.kind === "img" && !x.pc && !x.m ? ["end", "이미지 없음"] : ADM().VX().liveBanners().indexOf(x) < 0 ? ["end", "판매 영역 꺼짐"] : ["on", x.to ? "~" + md(x.to) + "까지" : "노출 중"];
  return <i className={"vda-ban-st " + st[0]}>{st[1]}</i>;
}
function Banners({ v }) {
  const A = ADM();
  return <section className="a-card"><div className="a-card-head"><h2>첫 화면 배너</h2><span className="a-muted">켜진 배너가 위에서부터 5초마다 넘어가요. 이미지 배너는 PC {A.BAN_PC.join(" × ")} · 모바일 {A.BAN_M.join(" × ")}px 이미지를 따로 올려요.</span><Btn action="vda-ban-add" cls="a-btn-primary a-btn-sm vda-ml"><Icon n="plus" c="sm" />배너 추가</Btn></div>
    {v.banners.length ? <div className="vda-bans">{v.banners.map((x, i) => { const p = A.vdP(x.pid), img = x.kind === "img"; return (
      <div key={i} className={"vda-ban" + (x.on === false ? " off" : "")}><span className={"vda-ban-sw" + (img ? " img" : x.dark ? " dk" : "")} style={{ "--a": img ? x.bg || "#111" : (x.color || [])[0] || "#111", "--b": img ? x.bg || "#111" : (x.color || [])[1] || "#333" }}>
          {img ? <>{x.pc || x.m ? <Img u={x.pc || x.m} /> : null}<em>{(x.pc ? "PC" : "") + (x.pc && x.m ? " · " : "") + (x.m ? "M" : "")}</em></> : <>{x.img ? <img src={x.img} alt="" /> : null}<b>{br(x.title)}</b></>}</span>
        <div className="vda-ban-t"><small>{img ? <i className="vda-ban-k">이미지 배너</i> : <i className="vda-ban-k art">디자인 배너</i>}<BanState x={x} />{img ? "" : x.eyebrow || ""}</small><b>{img ? x.alt || x.title || "이름 없는 이미지 배너" : (x.title || "").replace(/\n/g, " ")}</b><span>{p ? "→ " + p.title : x.href ? "→ " + x.href : <span className="a-muted">연결 없음 (전체 클래스로)</span>}</span></div>
        <div className="vda-ban-a"><Sw on={x.on !== false} action="vda-ban-on" i={i} label="배너 켜기" /><Mv action="vda-ban-move" i={i} dir={-1} label="위로" dis={i === 0} /><Mv action="vda-ban-move" i={i} dir={1} label="아래로" dis={i === v.banners.length - 1} />
          <Btn action="vda-ban-edit" cls="a-btn-ghost a-btn-sm" data-i={i}>수정</Btn><button type="button" className="a-icon-btn" data-action="vda-ban-del" data-i={i} aria-label="배너 지우기"><Icon n="trash" c="sm" /></button></div></div>); })}</div>
      : <Empty ic="image">배너가 없어요. 배너가 없으면 첫 화면은 카테고리부터 보여요.</Empty>}</section>;
}
function TileCard({ v, n }) {
  const X = ADM().VX();
  if (!Array.isArray(v.tiles)) v.tiles = X.seedTiles();
  const t = v.tiles;
  return <section className="a-card"><div className="a-card-head"><h2>첫 화면 카테고리 아이콘</h2><span className="a-muted">배너 바로 아래 아이콘 줄이에요. 이름 · 누르면 갈 곳 · 아이콘 · 순서를 바꿔요. 아이콘은 정사각형 256 × 256px 이상 · 투명 배경 PNG/WebP 권장 · 1MB 이하.</span><Btn action="vda-tile-add" cls="a-btn-ghost a-btn-sm vda-ml"><Icon n="plus" c="sm" />아이콘 추가</Btn></div>
    <form key={n} id="vda-tile-form" className="a-form" noValidate><div className="vda-tiles">{t.map((x, i) => <div key={i} className={"vda-tile" + (x.on === false ? " off" : "")}>
        <label className="vda-tile-ic" title="아이콘 바꾸기">{x.img ? <Img u={x.img} /> : <Icon n="image" c="sm" />}<input type="file" className="vb-file-in" accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif" data-vt-up={i} aria-label={x.label + " 아이콘 바꾸기"} /><span><Icon n="upload" c="xs" /></span></label>
        <input className="a-input" name={"tl-" + i} defaultValue={x.label || ""} maxLength={14} placeholder="이름" aria-label="아이콘 이름" />
        <input className="a-input vda-tile-href" name={"th-" + i} defaultValue={x.href || ""} maxLength={300} placeholder="#/vod/c/all 또는 https://…" aria-label="누르면 갈 곳" />
        <input className="a-input vda-tile-bd" name={"tb-" + i} defaultValue={x.badge || ""} maxLength={5} placeholder="배지" aria-label="배지 (예: NEW)" />
        <div className="vda-tile-a"><Sw on={x.on !== false} action="vda-tile-on" i={i} label="보이기" /><Mv action="vda-tile-move" i={i} dir={-1} label="앞으로" dis={i === 0} /><Mv action="vda-tile-move" i={i} dir={1} label="뒤로" dis={i === t.length - 1} />
          {x.key && x.img !== X.tileImg(x.key) ? <button type="button" className="a-icon-btn" data-action="vda-tile-reimg" data-i={i} aria-label="기본 아이콘으로" title="기본 아이콘으로"><Icon n="refresh" c="sm" /></button> : null}
          <button type="button" className="a-icon-btn" data-action="vda-tile-del" data-i={i} aria-label="지우기"><Icon n="trash" c="sm" /></button></div></div>)}</div>
      <div className="a-form-actions"><button type="button" className="a-btn a-btn-ghost" data-action="vda-tile-reset">처음 구성으로</button><button className="a-btn a-btn-primary" type="submit">아이콘 줄 저장</button></div></form></section>;
}
function CouponCard({ v }) {
  const A = ADM(), X = A.VX(), cps = v.coupons || [];
  return <section className="a-card"><div className="a-card-head"><h2>쿠폰</h2><span className="a-muted">회원은 마이페이지 › 쿠폰에서 코드를 등록하고, 결제 화면에서 골라 써요.</span><Btn action="vda-cp-add" cls="a-btn-primary a-btn-sm vda-ml"><Icon n="plus" c="sm" />쿠폰 만들기</Btn></div>
    {cps.length ? <div className="a-table-wrap"><table className="a-table vda-table"><thead><tr><th>쿠폰</th><th>코드</th><th>할인</th><th>조건</th><th>기간</th><th>받음 · 사용</th><th>켜기</th><th className="right">관리</th></tr></thead><tbody>{cps.map((c, i) => { const st = A.vdCpStat(c); return (
      <tr key={i} className={c.on === false ? "a-dim" : undefined}><td><b>{c.name}</b>{c.auto === "signup" ? <small className="a-memo">가입하면 자동으로 줘요</small> : null}{c.dl ? <small className="a-memo">상세페이지에서 받기</small> : null}</td><td className="vda-nw"><code>{c.code || "-"}</code></td><td className="vda-nw">{X.couponTxt(c)}</td><td>{X.couponCond(c)}</td><td className="vda-nw">{c.days ? "받은 날부터 " + c.days + "일" : c.endAt ? c.endAt + "까지" : "기한 없음"}</td><td className="num">{st.n}명 · {st.used}회</td>
        <td><Sw on={c.on !== false} action="vda-cp-on" i={i} label="쿠폰 켜기" /></td><td className="right"><Btn action="vda-cp-edit" cls="a-btn-ghost a-btn-sm" data-i={i}>수정</Btn><button type="button" className="a-icon-btn" data-action="vda-cp-del" data-i={i} aria-label="쿠폰 지우기"><Icon n="trash" c="sm" /></button></td></tr>); })}</tbody></table></div>
      : <Empty ic="coins">아직 쿠폰이 없어요.</Empty>}</section>;
}
function HelpCard({ v }) {
  const X = ADM().VX(), DB = window.DB, faq = X.helpFaq(), nts = (v.notices || []).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.at - a.at), mine = Array.isArray(v.helpFaq) && v.helpFaq.length;
  return <section className="a-card"><div className="a-card-head"><h2>고객센터 FAQ · 공지</h2><span className="a-muted">스토어 마이페이지 › 고객센터에 보여요. 고치면 바로 반영돼요.</span><Btn action="vda-nt-edit" cls="a-btn-ghost a-btn-sm vda-ml"><Icon n="plus" c="sm" />공지 쓰기</Btn><Btn action="vda-faq-edit" cls="a-btn-ghost a-btn-sm"><Icon n="plus" c="sm" />FAQ 추가</Btn></div>
    <h4 className="vda-mem-h">공지사항 {nts.length}개</h4>
    {nts.length ? <ul className="vda-help-l">{nts.map((x) => <li key={x.id} className={x.on === false ? "off" : undefined}>{x.pin ? <Pill cls="warn">필독</Pill> : <Pill cls="info">공지</Pill>}<b>{x.title}</b><small>{DB.date.toStr(new Date(x.at)) + (x.on === false ? " · 숨김" : "")}</small><Btn action="vda-nt-edit" cls="a-btn-ghost a-btn-sm" data-id={x.id}>고치기</Btn><Btn action="vda-nt-on" cls="a-btn-ghost a-btn-sm" data-id={x.id}>{x.on === false ? "보이기" : "숨기기"}</Btn><Btn action="vda-nt-del" cls="a-btn-ghost a-btn-sm" data-id={x.id}>삭제</Btn></li>)}</ul>
      : <p className="a-muted p-small">아직 공지가 없어요. 휴무 · 결제 점검 · 새 기능 소식을 알려 보세요.</p>}
    <h4 className="vda-mem-h">자주 묻는 질문 {faq.length}개{mine ? null : <> <small className="a-muted">(기본값 · 고치면 그때부터 내 FAQ로 바뀌어요)</small></>}</h4>
    <ul className="vda-help-l">{faq.map((f, i) => <li key={i}><span className="vda-help-cat">{f[0]}</span><b>{f[1]}</b><button type="button" className="a-icon-btn sm" data-action="vda-faq-mv" data-i={i} data-dir="-1" aria-label="위로" disabled={i === 0 || undefined}><Icon n="arrowUp" c="sm" /></button><Btn action="vda-faq-edit" cls="a-btn-ghost a-btn-sm" data-i={i}>고치기</Btn><Btn action="vda-faq-del" cls="a-btn-ghost a-btn-sm" data-i={i}>삭제</Btn></li>)}</ul></section>;
}
const F = ({ id, label, children, hint, cls }) => <div className={"a-field" + (cls ? " " + cls : "")}><label htmlFor={id}>{label}</label>{children}{hint ? <small className="a-muted">{hint}</small> : null}</div>;

export function MasterVodDisplay({ n }) {
  const A = ADM(), X = A.VX(), DB = window.DB, v = A.VD(), s = v.settings, b = DB.billingInfo ? DB.billingInfo() : {};
  const tv0 = v.topicVotes || {}, ts = (v.stat && v.stat.topics) || {}, tv = {}; (v.topics || []).forEach((t) => { tv[t] = (Number(tv0[t]) || 0) + (Number(ts[t]) || 0); });
  const rank = (v.topics || []).map((t) => [t, tv[t] || 0]).sort((a, c) => c[1] - a[1]).slice(0, 10), mx = Math.max(1, ...rank.map((r) => r[1]));
  const co = s.coach || {}, te = s.tea || {}, rb = X.rebuySet();
  return <>
    <Head title="VOD 전시 · 쿠폰 · 설정" sub="스토어 첫 화면 배너 · 쿠폰 · ‘다루는 부업’ 칩 · 카테고리, 기본 정산 비율 · 무통장 입금 계좌 · 후기 포인트를 정해요." right={<Store />} />
    <BizCard v={v} /><FunnelCard v={v} /><Banners v={v} />
    <section className="a-card"><div className="a-card-head"><h2>홈 화면 섹션</h2><span className="a-muted">섹션 순서 · 섹션마다 강의 순서 · 추가 · 빼기 · 분야별 탭 · 강사진 순서는 ‘홈 꾸미기’ 메뉴에서 해요.</span><a className="a-btn a-btn-primary a-btn-sm vda-ml" href="#/center/master/vod-home"><Icon n="home" c="sm" />홈 꾸미기 열기</a></div></section>
    <TileCard v={v} n={n} /><CouponCard v={v} />
    <div className="a-grid-2">
      <section className="a-card"><div className="a-card-head"><h2>카테고리</h2><span className="a-muted">끄면 스토어 메뉴에서 숨겨요.</span></div><form key={n} id="vda-cat-form" className="a-form" noValidate>
        {v.cats.map((c, i) => <div key={i} className="vda-cat"><span className="vda-cat-ic" style={{ "--c": c.color || "#111" }}><Icon n={c.icon || "layers"} c="sm" /></span><input className="a-input" name={"cat-" + i} defaultValue={c.label} maxLength={16} aria-label="카테고리 이름" /><label className="a-check"><input type="checkbox" name={"caton-" + i} defaultChecked={c.on !== false} /><span>보이기</span></label></div>)}
        <div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">카테고리 저장</button></div></form></section>
      <section className="a-card"><div className="a-card-head"><h2>다루는 부업 · 찜 순위</h2><span className="a-muted">찜이 많은 부업 = 다음에 열 클래스 후보</span></div>
        <ol className="vda-rank">{rank.map((r, i) => <li key={i}><b>{i + 1}</b><span>{r[0]}</span><i><u style={{ width: Math.round(r[1] / mx * 100) + "%" }} /></i><small>{r[1]}</small></li>)}</ol>
        <form key={n} id="vda-topic-form" className="a-form" noValidate><div className="a-field"><label htmlFor="vda-topics">첫 화면 부업 칩 <small>(한 줄에 하나 · 순서대로 3줄로 나눠 보여요)</small></label><textarea className="a-input" id="vda-topics" name="topics" rows={6} defaultValue={(v.topics || []).join("\n")} /></div><div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">부업 칩 저장</button></div></form></section>
      <section className="a-card vda-span2"><div className="a-card-head"><h2>정산 · 입금 설정</h2></div><form key={n} id="vda-set-form" className="a-form" noValidate>
        <div className="a-form-row"><F id="vda-share" label="기본 VOD 정산 비율 (강사 %)" hint="기본 강사 50 : 플랫폼 50 · 강사별로 확정한 비율 → 강의별 계약 비율이 있으면 그게 먼저예요"><input className="a-input" id="vda-share" name="share" type="number" min="0" max="100" defaultValue={s.share} /></F>
          <F id="vda-adsp" label="광고비 강사 분담 (%)" hint="기본 50 · 달마다 적은 광고비 중 강사 몫 (VOD 매출 · 주문 › 정산 비율 · 광고비)"><input className="a-input" id="vda-adsp" name="adSplit" type="number" min="0" max="100" defaultValue={X.adSplitOf()} /></F></div>
        <div className="a-form-row"><F id="vda-bank" label="무통장 은행"><input className="a-input" id="vda-bank" name="bank" defaultValue={s.bank || ""} maxLength={20} placeholder={b.bank || "비우면 기수 입금 계좌"} /></F><F id="vda-holder" label="예금주"><input className="a-input" id="vda-holder" name="holder" defaultValue={s.holder || ""} maxLength={30} placeholder={b.holder || "(주)두고홀딩스"} /></F></div>
        <F id="vda-account" label="계좌번호"><input className="a-input" id="vda-account" name="account" defaultValue={s.account || ""} maxLength={40} placeholder={b.account || "비우면 기수 입금 계좌"} /></F>
        <label className="a-check vda-demo"><input type="checkbox" name="demoLogin" defaultChecked={s.demoLogin !== false} /><span><b>체험 계정 쓰기</b> · vod@gmail.com / vod <small className="a-muted">로그인 화면에 안내가 보이고 누구나 이 계정으로 들어와 산 강의 6개를 볼 수 있어요. 정식 오픈 전에 끄면 안내가 사라지고 로그인이 막혀요.</small></span></label>
        <div className="a-form-row"><F id="vda-days" label="입금 기한 (일)"><input className="a-input" id="vda-days" name="payDays" type="number" min="1" max="14" defaultValue={s.payDays || 3} /></F><F id="vda-rp" label="후기 작성 포인트 (P)" hint="수강 후기를 쓴 회원에게 주는 포인트 · 1P = 1원"><input className="a-input" id="vda-rp" name="reviewPoint" type="number" min="0" max="100000" step="100" defaultValue={s.reviewPoint == null ? 500 : s.reviewPoint} /></F></div>
        <h3 className="vda-set-h">수강권 · 부가 상품 기본값 <small>클래스에서 비워 둔 칸은 이 값을 써요</small></h3>
        <div className="a-form-row"><div className="a-field"><label htmlFor="vda-rb">재수강 할인 (%)</label><input className="a-input" id="vda-rb" name="rebuyPct" type="number" min="1" max="90" defaultValue={rb.pct} /><label className="a-check vda-rb-on"><input type="checkbox" name="rebuyOn" defaultChecked={!!rb.on} /><span>켜기 · 수강 기간이 끝난 강의를 다시 사면 6개월 · 12개월 수강권을 자동 할인</span></label><small className="a-muted">할인된 금액이 정산 기준이라 할인은 강사 : 플랫폼 정산 비율(기본 5 : 5)대로 함께 나눠요 · 쿠폰과는 함께 쓰지 않아요 · 주문 · 정산에는 ‘재결제’로 보여요 (예전 1년 연장권 대신)</small></div>
          <F id="vda-ash" label="부가 상품 강사 정산 비율 (%)" hint="1:1 코칭권 · TEA TIME (강사가 직접 시간을 쓰는 상품)"><input className="a-input" id="vda-ash" name="addonShare" type="number" min="0" max="100" defaultValue={s.addonShare == null ? 50 : s.addonShare} /></F></div>
        <div className="a-form-row"><F id="vda-cn" label="1:1 코칭권 횟수"><input className="a-input" id="vda-cn" name="coachN" type="number" min="1" max="50" defaultValue={co.n || 5} /></F><F id="vda-cd" label="코칭권 사용 기간 (일)"><input className="a-input" id="vda-cd" name="coachDays" type="number" min="7" max="730" defaultValue={co.days || 180} /></F><F id="vda-cp" label="코칭권 가격 (원)"><input className="a-input" id="vda-cp" name="coachPrice" type="number" min="0" step="1000" defaultValue={co.price || 150000} /></F></div>
        <div className="a-form-row"><F id="vda-tm" label="TEA TIME 시간 (분)"><input className="a-input" id="vda-tm" name="teaMin" type="number" min="15" max="240" step="15" defaultValue={te.min || 60} /></F><F id="vda-tp" label="TEA TIME 가격 (원)"><input className="a-input" id="vda-tp" name="teaPrice" type="number" min="0" step="1000" defaultValue={te.price || 99000} /></F></div>
        <p className="a-muted p-small"><Icon n="alert" c="xs" />{A.vdSrv() ? " 무통장 입금은 계좌를 넣고 저장하면 바로 결제 화면에 열려요 (비우면 기수 입금 계좌). 카드 · 계좌이체 · 가상계좌는 토스페이먼츠 심사가 끝나고 키를 넣으면 열려요." : " 시안이라 카드 · 간편결제는 바로 ‘결제 완료’로 기록돼요. 정식 오픈 때 PG(토스페이먼츠 등)를 연결하면 실제 결제 · 자동 환불이 돼요."}</p>
        <div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">설정 저장</button></div></form></section></div>
    <HelpCard v={v} />
  </>;
}

/* ---------------- VOD 클래스 관리 목록 #/center/master/vod-classes (예전 pageMasterVodClasses 목록 · vdInsCard) ----------------
 *  · 클래스 세팅(#/center/master/vod-classes/<클래스>)은 아직 예전 화면이에요 */
function InsCard() {
  const A = ADM(), X = A.VX(); if (!X.tkey) return null;
  const off = X.insOff(), map = {};
  A.VD().products.forEach((p) => { const k = X.tkey(p); if (!k) return; const t = (map[k] = map[k] || { k, name: p.creator || A.vdName(p.iid), n: 0, live: 0, ph: "" }); t.n++; if (p.status === "on" || p.status === "soon") t.live++; if (!t.ph) t.ph = X.phOf(p); });
  const list = Object.keys(map).map((k) => map[k]).sort((a, b) => (off.indexOf(a.k) >= 0) - (off.indexOf(b.k) >= 0) || b.n - a.n);
  if (!list.length) return null;
  return <section className="a-card vda-ins"><div className="a-card-head"><h2>강사 스토어 노출</h2><span className="a-muted">끄면 그 강사의 클래스 · 배너 · 강사진 카드가 스토어에서 빠지고 새로 살 수 없어요. 클래스는 지우지 않아서 다시 켜면 그대로 돌아와요. 이미 산 회원은 내 강의실에서 계속 들어요.</span></div><div className="vda-ins-g">
    {list.map((t) => { const on = off.indexOf(t.k) < 0; return <div key={t.k} className={"vda-ins-i" + (on ? "" : " off")}><span className="vda-ins-ph">{t.ph ? <img src={t.ph} alt="" /> : <em>{(t.name || "?").slice(0, 1)}</em>}</span><div><b>{t.name}</b><small>{(/^ext:/.test(t.k) ? "두잉고 계정 없는 강사(강사 입점 문의 › VOD 강사 등록에서 계정 연결) · " : "") + "클래스 " + t.n + "개" + (t.live ? " · 판매 · 오픈 예정 " + t.live + "개" : "")}</small></div>{on ? <Pill cls="ok">노출</Pill> : <Pill cls="mute">미노출</Pill>}
      <button type="button" className={"a-switch" + (on ? " on" : "")} data-action="vda-insoff" data-k={t.k} data-n={t.name} role="switch" aria-checked={String(on)} aria-label={t.name + " 스토어 노출"}><i /></button></div>; })}</div></section>;
}
export function MasterVodClasses() {
  const A = ADM(), X = A.VX(), won = A.won, ps = A.VD().products.slice().sort((a, b) => (a.status === "hidden") - (b.status === "hidden") || b.createdAt - a.createdAt), H = "#/center/master/vod-classes";
  A.ui.vdDraft = null;
  const NewBtn = () => <Btn action="vda-new" cls="a-btn-primary"><Icon n="plus" c="sm" />새 클래스 만들기</Btn>;
  return <>
    <Head title="VOD 클래스 관리" sub="스토어에 올릴 VOD 클래스를 만들고 고쳐요. 기본 정보 → 가격 → 썸네일 → 소개 → 커리큘럼 → FAQ 순서로 채우면 바로 판매 페이지가 돼요." right={<><Store /><NewBtn /></>} />
    <div className="a-kpis">
      <Kpi label="판매 중" value={ps.filter((p) => p.status === "on").length + "개"} sub={"전체 " + ps.length + "개"} href={H} tone="ok" />
      <Kpi label="오픈 예정" value={ps.filter((p) => p.status === "soon").length + "개"} sub="스토어에 ‘오픈 예정’으로 보여요" href={H} />
      <Kpi label="숨김" value={ps.filter((p) => p.status === "hidden").length + "개"} sub="스토어에 안 보여요" href={H} />
      <Kpi label="할인 중" value={ps.filter((p) => X.pctOf(p) > 0).length + "개"} sub="마감일이 지나면 정가로 돌아가요" href={H} />
    </div>
    <InsCard />
    <section className="a-card">{ps.length ? <div className="a-table-wrap"><table className="a-table vda-table"><thead><tr><th>클래스</th><th>가격</th><th>상태</th><th>강의</th><th>판매</th><th className="right">매출</th><th>후기</th><th className="right">관리</th></tr></thead><tbody>{ps.map((p) => {
      const st = A.VD_ST[p.status] || A.VD_ST.hidden, pr = X.priceOf(p), pc = X.pctOf(p), rt = X.ratingOf(p.id), so = X.paidOrders(p.id);
      return <tr key={p.id}><td><div className="vda-cl"><Isl html={A.vdThumb(p)} /><div><b>{p.title}</b><small className="a-memo">{A.adTypeName(p) + " · " + (p.creator || "-") + " · " + X.catOf(p.cat).label}</small><Isl html={A.vdFunMemo(p)} />{X.typeOf(p) === "vod" && !(pr === 0 && !X.lessons(p).length) ? <Isl html={A.vuChip(p)} /> : null}
          {p.status === "soon" ? <button type="button" className="vda-chip-btn" data-action="vda-alarm" data-id={p.id}><Icon n="bell" c="xs" /> 오픈 알림 {A.vdAlarmOf(p.id).length}명</button> : null}{X.isEvent(p) ? <button type="button" className="vda-chip-btn" data-action="vda-roster" data-id={p.id}><Icon n="users" c="xs" /> 신청자 명단 {A.vdRoster(p.id).length}명</button> : null}</div></div></td>
        <td>{pr === 0 ? <b>무료</b> : <><b>{won(pr)}</b>{pc ? <small className="a-memo">{(X.ebOf(p) ? "얼리버드 · " : "") + pc + "% 할인 · 정가 " + won(p.price)}</small> : null}</>}</td>
        <td><Pill cls={st[1]}>{st[0]}</Pill>{X.insShown && !X.insShown(p) ? <small className="a-memo"><Pill cls="mute">강사 미노출</Pill></small> : null}</td><td className="num">{X.lessons(p).length}개</td><td className="num">{so.length}건{p.base ? <small className="a-memo">표시 수강생 {X.soldOf(p).toLocaleString()}명</small> : null}</td><td className="right num">{won(A.vdSum(so))}</td>
        <td>{rt.n ? "★ " + rt.avg.toFixed(1) + " (" + rt.n + ")" : <span className="a-muted">-</span>}</td>
        <td className="right"><button type="button" className="a-btn a-btn-ghost a-btn-sm" data-action="store-split" data-href={"#/vod/p/" + p.id}>보기</button><button type="button" className="a-btn a-btn-ghost a-btn-sm" data-action="vda-dup" data-id={p.id} title="이 클래스를 복사해서 새로 만들어요"><Icon n="layers" c="sm" />복제</button><a className="a-btn a-btn-primary a-btn-sm" href={"#/center/master/vod-classes/" + p.id}>세팅</a></td></tr>; })}</tbody></table></div>
      : <Empty ic="monitorPlay" extra={<NewBtn />}>아직 클래스가 없어요.</Empty>}</section>
  </>;
}
