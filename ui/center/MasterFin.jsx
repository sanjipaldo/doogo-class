"use client";
/* 마스터 DOOGO CLASS (3) — 돈: 판매 순위 · 광고비 · ROAS · 강사 정산 · 정산 비율 · 가격
 * 예전 admin.js pageVodRank · pageVodAds · pageVodSettle(vdSettle) · pageVodRates(vdRates) 를 React 로 (Next.js 전환 6단계)
 *  · 기간 탭 · 고르기 · 달 넘기기 · 광고비 적기 · 지우기는 예전 admin.js 이벤트가 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Pill, Isl, Pager, fmtMD } from "./bits.jsx";

/** 예전 finNav — 달 넘기기 머리 (‹ 제목 › + 오른쪽 요약) */
export const FinNav = ({ act, label, cls, children }) => <div className={"a-card-head a-cal-head " + (cls || "")}><button type="button" className="a-icon-btn" data-action={act} data-dir="-1" aria-label="이전"><Icon n="chevLeft" /></button><h2>{label}</h2><button type="button" className="a-icon-btn" data-action={act} data-dir="1" aria-label="다음"><Icon n="chevRight" /></button>{children}</div>;
const pct = (a, t) => (t ? Math.round(a / t * 100) : 0);

export function MasterVodRank() {
  const A = ADM(), X = A.VX(), ui = A.ui, won = A.won, per = ui.rkPer || "this", type = ui.rkType || "all", sort = ui.rkSort || "amt", r = A.rkRange(per);
  const cur = A.rkAgg(r[0], r[1], type), prev = r[2] ? A.rkAgg(r[2][0], r[2][1], type) : null;
  const by = (a, b) => (sort === "n" ? b.n - a.n || b.amt - a.amt : b.amt - a.amt || b.n - a.n);
  const list = cur.list.sort(by), pRank = {};
  if (prev) prev.list.sort(by).forEach((x, i) => { pRank[x.p.id] = i + 1; });
  const tot = list.reduce((a, x) => a + x.amt, 0), totN = list.reduce((a, x) => a + x.n, 0);
  const label = (A.RK_PER.find((x) => x[0] === per) || A.RK_PER[0])[1], span = per === "all" ? "처음부터 지금까지" : r[0] === r[1] ? A.vdYMtxt(r[0]) : A.vdYMtxt(r[0]) + " ~ " + A.vdYMtxt(r[1]);
  const Move = ({ x, i }) => { if (!prev) return null; const pr = pRank[x.p.id]; if (!pr) return <span className="rk-mv new">NEW</span>; const d = pr - (i + 1); return d > 0 ? <span className="rk-mv up">▲{d}</span> : d < 0 ? <span className="rk-mv down">▼{-d}</span> : <span className="rk-mv">-</span>; };
  const kTxt = (x) => A.FIN_KIND.filter((k) => x.k[k[0]]).map((k) => k[1] + " " + x.k[k[0]]).join(" · ");
  const who = (p) => p.creator || A.insName(p.iid) || "";
  return <>
    <Head title="판매 순위" sub="어떤 강의가 가장 잘 팔렸는지 기간 · 종류별로 봐요. 금액은 환불을 뺀 순매출이에요." right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-sales"><Icon n="activity" c="sm" />매출 리포트</a>} />
    <section className="a-card rk-bar"><div className="a-tabs">{A.RK_PER.map((x) => <button key={x[0]} type="button" className={"a-tab" + (per === x[0] ? " on" : "")} data-action="rk-per" data-k={x[0]}>{x[1]}</button>)}</div>
      <div className="rk-f"><select key={"t" + type} className="a-input a-sm" id="rk-type" aria-label="종류" defaultValue={type}><option value="all">모든 종류</option>{[["vod", "VOD 강의"], ["ebook", "전자책"], ["book", "종이책"], ["event", "LIVE · 오프라인"]].map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
        <select key={"s" + sort} className="a-input a-sm" id="rk-sort" aria-label="정렬" defaultValue={sort}><option value="amt">매출 많은 순</option><option value="n">판매 많은 순</option></select></div>
      <p className="a-muted p-small">{span + " · 판매 " + totN + "건 · 순매출 " + won(tot) + (prev ? " · 순위 변동은 바로 앞 같은 길이 기간과 비교" : "")}</p></section>
    {list.length ? <div className="rk-pod">{list.slice(0, 3).map((x, i) => <a key={x.p.id} className={"rk-p rk-p" + (i + 1)} href="#/center/master/vod-classes"><span className="rk-no">{i === 0 ? <Icon n="trophy" c="sm" /> : null}{i + 1}위</span><Isl html={A.vdThumb(x.p, "card rk-th")} /><b>{x.p.title}</b><small>{who(x.p)}</small><span className="rk-amt num">{won(x.amt)}</span><small>{x.n}건 · {pct(x.amt, tot)}% <Move x={x} i={i} /></small></a>)}</div> : null}
    <section className="a-card"><div className="a-card-head"><h2>{label} 강의 순위</h2><span className="a-muted">{list.length}개 강의</span></div>
      {list.length ? <div className="a-table-wrap"><table className="a-table rk-table"><thead><tr><th>순위</th><th>강의</th><th>강사</th><th>종류</th><th className="right">판매</th><th className="right">순매출</th><th>비중</th></tr></thead><tbody>{list.map((x, i) => (
        <tr key={x.p.id}><td className="rk-r"><b>{i + 1}</b> <Move x={x} i={i} /></td><td><div className="rk-t"><Isl html={A.vdThumb(x.p, "sm")} /><span><b>{x.p.title}</b><small className="a-memo">{kTxt(x)}</small></span></div></td><td>{who(x.p) || "-"}</td><td>{X.TYPE[X.typeOf(x.p)] ? X.TYPE[X.typeOf(x.p)][0] : ""}</td><td className="right num">{x.n}건</td><td className="right num"><b>{won(x.amt)}</b></td><td className="rk-sh"><span className="fin-bar"><i style={{ width: pct(x.amt, tot) + "%" }} /></span><small>{pct(x.amt, tot)}%</small></td></tr>))}</tbody></table></div>
        : <Empty ic="trophy">{span}에 팔린 강의가 없어요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>강사 순위</h2><span className="a-muted">같은 기간 · 정산 예정은 강사 몫</span></div>
      {cur.ins.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>순위</th><th>강사</th><th className="right">강의 수</th><th className="right">판매</th><th className="right">순매출</th><th className="right">강사 정산 예정</th></tr></thead><tbody>{cur.ins.sort((a, b) => (sort === "n" ? b.n - a.n : b.amt - a.amt)).map((x, i) => (
        <tr key={x.key}><td><b>{i + 1}</b></td><td><b>{A.vdKeyName(x.key)}</b></td><td className="right num">{x.ps.size}개</td><td className="right num">{x.n}건</td><td className="right num"><b>{won(x.amt)}</b></td><td className="right num">{won(x.sh)}</td></tr>))}</tbody></table></div>
        : <Empty ic="users">같은 기간 판매가 없어요.</Empty>}</section>
  </>;
}

export function MasterVodAds({ n }) {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won, v = A.VD(), thisM = DB.date.todayStr().slice(0, 7), ym = ui.adYM || thisM, list = A.vdRateIns(), ymT = A.vdYMtxt(ym);
  const ads = (v.adSpend || []).filter((x) => x.ym === ym).sort((a, b) => String(b.day || b.ym).localeCompare(String(a.day || a.ym)) || (b.at || 0) - (a.at || 0));
  const share = (x, sp) => Math.round((Number(x.amount) || 0) * sp / 100 / 10) * 10;
  const tot = ads.reduce((a, x) => a + (Number(x.amount) || 0), 0), insPart = ads.reduce((a, x) => a + share(x, X.adSplitOf(x.iid)), 0);
  const revOf = (pred) => A.vdSum(A.vdPaidIn(ym, pred)), revAll = revOf(), roas = A.vdRoas, rt = A.roasTxt;
  const byIns = {}; ads.forEach((x) => { (byIns[x.iid] = byIns[x.iid] || []).push(x); });
  const byCh = {}; ads.forEach((x) => { const k = x.ch || "etc"; byCh[k] = (byCh[k] || 0) + (Number(x.amount) || 0); });
  const vodPs = v.products.filter((p) => X.typeOf(p) !== "ebook" && p.status !== "hidden" && p.iid);
  const dDef = ym === thisM ? DB.date.todayStr() : ym + "-01";
  const yr = Number(ym.slice(0, 4)), yrows = Array.from({ length: 12 }, (_, i) => { const m = yr + "-" + String(i + 1).padStart(2, "0"), a = (v.adSpend || []).filter((x) => x.ym === m).reduce((s, x) => s + (Number(x.amount) || 0), 0), r = A.vdSum(A.vdPaidIn(m)); return { m, i, a, r }; });
  const ymax = Math.max(1, ...yrows.map((x) => Math.max(x.a, x.r)));
  const Lock = ({ iid }) => (A.vdAdLocked(iid, ym) ? <Pill cls="ok">확정됨</Pill> : <Pill cls="mute">{ym < thisM ? "확정 전" : "집계 중"}</Pill>);
  return <>
    <Head title="광고비 · ROAS" sub="VOD를 알리려고 쓴 광고비를 적어요. 강사 분담분(기본 50%)은 그 달 강사 정산에서 자동으로 빠지고, 강사센터 › 판매 정산에 내역이 그대로 보여요. ROAS = 그 달 매출 ÷ 광고비." right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-rates"><Icon n="sliders" c="sm" />광고비 분담 비율</a>} />
    <section className="a-card"><FinNav act="ad-ym" label={ymT + " 광고비"}><span className="a-cal-sum">집행 <b>{won(tot)}</b> · 강사 분담 <b>{won(insPart)}</b> · 플랫폼 부담 <b>{won(tot - insPart)}</b> · ROAS <b>{rt(roas(revAll, tot))}</b></span></FinNav>
      <form key={n} id="vda-ad-form" className="a-form vda-ad-f ad-f" noValidate><input type="hidden" name="ym" defaultValue={ym} />
        <div className="a-field"><label htmlFor="vda-ad-day">집행일</label><input className="a-input" id="vda-ad-day" name="day" type="date" defaultValue={dDef} min={ym + "-01"} max={ym + "-" + String(new Date(yr, Number(ym.slice(5, 7)), 0).getDate()).padStart(2, "0")} /></div>
        <div className="a-field"><label htmlFor="vda-ad-iid">강사</label><select className="a-input" id="vda-ad-iid" name="iid">{list.map((x) => <option key={x.id} value={x.id}>{A.vdName(x.id)}</option>)}</select></div>
        <div className="a-field"><label htmlFor="vda-ad-pid">광고한 강의 <small>(선택)</small></label><select className="a-input" id="vda-ad-pid" name="pid"><option value="">강사 전체 강의</option>{vodPs.map((p) => <option key={p.id} value={p.id} data-iid={p.iid} hidden={(list[0] && p.iid !== list[0].id) || undefined}>[{p.creator || A.insName(p.iid)}] {p.title}</option>)}</select></div>
        <div className="a-field"><label htmlFor="vda-ad-ch">채널</label><select className="a-input" id="vda-ad-ch" name="ch">{A.AD_CH.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></div>
        <div className="a-field"><label htmlFor="vda-ad-amt">광고비 (원)</label><input className="a-input" id="vda-ad-amt" name="amount" type="number" min="1000" step="1000" inputMode="numeric" placeholder="300000" /></div>
        <div className="a-field"><label htmlFor="vda-ad-memo">메모</label><input className="a-input" id="vda-ad-memo" name="memo" maxLength={60} placeholder="캠페인 이름 등" /></div>
        <button className="a-btn a-btn-primary" type="submit"><Icon n="plus" c="sm" />광고비 적기</button><p className="a-error" id="vda-ad-err"></p></form>
      <p className="a-muted p-small"><Icon n="alert" c="xs" /> 정산을 확정한 달의 강사 광고비는 바꿀 수 없어요. 고쳐야 하면 강사 정산에서 그 달 확정을 취소한 뒤 적어 주세요.</p></section>
    <div className="fin-grid">
      <section className="a-card"><div className="a-card-head"><h2>강사별</h2><span className="a-muted">{ymT} · ROAS = 그 강사 그 달 매출 ÷ 광고비</span></div>
        {Object.keys(byIns).length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>강사</th><th className="right">광고비</th><th className="right">강사 분담</th><th className="right">매출</th><th className="right">ROAS</th><th>정산</th></tr></thead><tbody>{Object.keys(byIns).map((iid) => {
          const a = byIns[iid].reduce((s, x) => s + (Number(x.amount) || 0), 0), sp = X.adSplitOf(iid), sh = byIns[iid].reduce((s, x) => s + share(x, sp), 0), rev = revOf((o) => A.vdKey(o) === iid);
          return <tr key={iid}><td><b>{A.vdName(iid)}</b></td><td className="right num">{won(a)}</td><td className="right num">{won(sh)}<small className="a-memo">{sp}%</small></td><td className="right num">{won(rev)}</td><td className="right num"><b>{rt(roas(rev, a))}</b></td><td><Lock iid={iid} /></td></tr>; })}</tbody></table></div>
          : <Empty ic="megaphone">{ymT}에 적은 광고비가 없어요.</Empty>}</section>
      <section className="a-card"><div className="a-card-head"><h2>채널별</h2><span className="a-muted">{ymT}</span></div>
        {tot ? <ul className="fin-bars">{A.AD_CH.filter((x) => byCh[x[0]]).map((x) => { const p = Math.round(byCh[x[0]] / tot * 100); return <li key={x[0]}><div className="fin-bh"><b>{x[1]}</b><span className="num">{won(byCh[x[0]])}</span></div><span className="fin-bar"><i style={{ width: p + "%" }} /></span><small>{p}%</small></li>; })}</ul> : <Empty ic="megaphone">채널별로 보여 줄 광고비가 없어요.</Empty>}</section>
    </div>
    <section className="a-card"><div className="a-card-head"><h2>광고비 내역</h2><span className="a-muted">{ads.length}건</span></div>
      {ads.length ? <div className="a-table-wrap"><table className="a-table"><thead><tr><th>집행일</th><th>강사</th><th>강의</th><th>채널</th><th className="right">광고비</th><th className="right">강사 분담</th><th className="right">ROAS</th><th>메모</th><th className="right"></th></tr></thead><tbody>{ads.map((x) => {
        const sp = X.adSplitOf(x.iid), me2 = share(x, sp), p = x.pid ? A.vdP(x.pid) : null, lock = A.vdAdLocked(x.iid, x.ym);
        const rev = p ? revOf((o) => o.pid === p.id) : null, pAd = p ? ads.filter((y) => y.pid === p.id).reduce((s, y) => s + (Number(y.amount) || 0), 0) : 0;
        return <tr key={x.id}><td className="vda-nw">{x.day ? fmtMD(x.day) : A.vdYMtxt(x.ym)}</td><td><b>{A.vdName(x.iid)}</b></td><td>{p ? p.title : <span className="a-muted">전체 강의</span>}</td><td>{A.adChName(x.ch)}</td><td className="right num">{won(x.amount)}</td><td className="right num">{won(me2)}<small className="a-memo">{sp}%</small></td><td className="right num">{p ? <>{rt(roas(rev, pAd))}<small className="a-memo">이 강의</small></> : "-"}</td><td>{x.memo || ""}</td>
          <td className="right">{lock ? <Pill cls="ok">확정됨</Pill> : <button type="button" className="a-icon-btn sm" data-action="vda-ad-del" data-id={x.id} aria-label="지우기"><Icon n="trash" c="sm" /></button>}</td></tr>; })}</tbody></table></div>
        : <Empty ic="megaphone">{ymT}에 적은 광고비가 없어요. 위에서 적어 주세요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>{yr}년 광고비 · 매출</h2><span className="a-muted">막대: 매출(진한) · 광고비(옅은) · 아래 숫자는 ROAS</span></div>
      <div className="a-rev-chart ad-yc" aria-hidden="true">{yrows.map((x) => <div key={x.m} className={"a-rev-col" + (x.m === thisM ? " now" : "")}><small className="num">{rt(roas(x.r, x.a)).replace("-", "")}</small><span className="a-rev-bar fin-yb"><i className="p" style={{ height: (x.a ? Math.max(3, Math.round(x.a / ymax * 100)) : 0) + "%" }} /><i style={{ height: (x.r ? Math.max(3, Math.round(x.r / ymax * 100)) : 0) + "%" }} /></span><b>{x.i + 1}월</b></div>)}</div></section>
  </>;
}

/* ---------------- 강사 정산 #/center/master/vod-settle (예전 pageVodSettle · vdSettle) ---------------- */
export function MasterVodSettle() {
  const A = ADM(), DB = DBX(), X = A.VX(), ui = A.ui, won = A.won, ym = ui.vdYM || A.vdYMadd(DB.date.todayStr().slice(0, 7), -1);
  const all = A.vdStmtKeys(ym).map((st) => Object.assign(st, { s: A.vdStState(st) }));
  const KX = X.RATE_KEYS, kf = KX.some((x) => x[0] === ui.vdKind) ? ui.vdKind : "all";
  const kSum = (k) => all.reduce((a, r) => { const c = A.vdKindsOf(r)[k]; return c ? { n: a.n + c.n, base: a.base + c.base, ins: a.ins + c.ins, who: a.who + 1 } : a; }, { n: 0, base: 0, ins: 0, who: 0 });
  const rows = kf === "all" ? all : all.filter((r) => A.vdKindsOf(r)[kf]);
  const tabs = [["all", "전체", all.reduce((a, r) => a + r.n, 0)]].concat(KX.map((x) => [x[0], x[1], kSum(x[0]).n])).filter((t) => t[0] === "all" || t[2] || t[0] === kf);
  const tot = rows.reduce((a, r) => ({ n: a.n + r.n, base: a.base + r.base, rs: a.rs + (r.rs || 0), pg: a.pg + (r.pg || 0), net: a.net + r.net, pay: a.pay + r.pay }), { n: 0, base: 0, rs: 0, pg: 0, net: 0, pay: 0 });
  const cnt = (ks) => rows.filter((r) => ks.indexOf(r.s.k) >= 0).length;
  const Act = ({ r }) => { const at = { "data-k": r.key, "data-m": ym }, k = r.s.k; return <>
    <Btn action="vda-stm" cls="a-btn-ghost a-btn-sm" {...at}>명세서</Btn>
    {k === "ready" ? <Btn action="vda-stc" cls="a-btn-primary a-btn-sm" {...at}>정산 확정</Btn> : null}
    {(k === "confirmed" && r.biz) || k === "invreq" ? <Btn action="vda-sti" cls="a-btn-primary a-btn-sm" {...at}>세금계산서 받음</Btn> : null}
    {(k === "confirmed" && !r.biz) || k === "invoiced" ? <Btn action="vda-pay" cls="a-btn-primary a-btn-sm" {...at}>지급 완료</Btn> : null}
    {k === "confirmed" || k === "invreq" || k === "invoiced" ? <Btn action="vda-sto" cls="a-btn-ghost a-btn-sm" {...at}>확정 취소</Btn> : null}
    {k === "paid" ? <Btn action="vda-unpay" cls="a-btn-ghost a-btn-sm" {...at}>지급 취소</Btn> : null}</>; };
  const Cut = ({ r }) => <>{r.rs ? <small className="vc-rs">온드 RS − {won(r.rs)}</small> : null}{r.pg ? <small className="vc-rs">PG 수수료 − {won(r.pg)}</small> : null}</>;
  const steps = [["확정 대기", cnt(["ready"]), "warn"], ["세금계산서 대기", cnt(["invreq"]) + rows.filter((r) => r.s.k === "confirmed" && r.biz).length, "warn"], ["지급 대기", rows.filter((r) => (r.s.k === "confirmed" && !r.biz) || r.s.k === "invoiced").length, "info"], ["지급 완료", cnt(["paid"]), "ok"]];
  const ks = kf !== "all" ? kSum(kf) : null;
  return <>
    <Head title="강사 정산" sub="달마다 강사 · 크리에이터별 정산 명세를 확정하고, 세금계산서 · 지급까지 기록해요. 매달 1일~말일 판매분을 다음 달 10일에 지급해요." right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-rates"><Icon n="sliders" c="sm" />정산 비율 · 가격</a>} />
    <section className="a-card"><div className="a-card-head a-cal-head"><button type="button" className="a-icon-btn" data-action="vda-ym" data-dir="-1" aria-label="이전 달"><Icon n="chevLeft" /></button><h2>{A.vdYMtxt(ym)} 판매분 정산</h2><button type="button" className="a-icon-btn" data-action="vda-ym" data-dir="1" aria-label="다음 달"><Icon n="chevRight" /></button>
        <span className="a-cal-sum">지급일 <b>{DB.date.fmtFull(A.vdPayDate(ym))}</b> · 지급 합계 <b>{won(tot.pay)}</b></span>{rows.length ? <Btn action="vda-stcsv" cls="a-btn-ghost a-btn-sm vda-ml" data-m={ym}><Icon n="download" c="sm" />명세 CSV</Btn> : null}</div>
      <div className="vs-steps">{steps.map((x) => <div key={x[0]} className={"vs-step " + x[2]}><small>{x[0]}</small><b>{x[1]}명</b></div>)}</div>
      <p className="a-muted p-small vda-note"><Icon n="alert" c="xs" /> {A.vdRuleTxt()} 비율 · 광고비는 ‘정산 비율 · 가격’에서 정해요.</p>
      {all.length ? <><div className="a-tabs vs-ktabs" role="tablist" aria-label="상품 종류">{tabs.map((t) => <button key={t[0]} type="button" role="tab" className={"a-tab" + (kf === t[0] ? " on" : "")} aria-selected={String(kf === t[0])} data-action="vda-kind" data-k={t[0]}>{t[1]} <span className="num">{t[2]}</span></button>)}</div>
        {ks ? <p className="vs-ksum"><Icon n="layers" c="xs" /><b>{(KX.find((x) => x[0] === kf) || [])[1]}</b> {ks.who + "명 · " + ks.n + "건 · 판매가 " + won(ks.base) + " · 강사 정산액 " + won(ks.ins)}</p> : null}</> : null}
      {rows.length ? <div className="a-table-wrap"><table className="a-table vda-table vs-table"><thead><tr><th>강사 · 크리에이터</th><th>판매</th><th className="right">판매가 합계</th><th className="right">정산액</th><th className="right">차감</th><th className="right">광고비 분담</th><th className="right">세금</th><th className="right">지급액</th><th>정산 정보</th><th>상태</th><th className="right">관리</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.key}><td><b>{r.name}</b><div className="vs-chs"><Isl html={A.vdChTags(r)} /></div><div className="vs-kinds"><Isl html={A.vdKindChips(r, kf)} /></div></td><td className="num">{r.n}건</td><td className="right num">{won(r.base)}<Cut r={r} /></td><td className="right num">{won(r.ins)}</td><td className="right num">{r.ded ? "- " + won(r.ded) : "0원"}</td>
          <td className="right num"><Isl html={A.vdAdCell(r)} /></td><td className="right num"><Isl html={A.vdTaxCell(r)} /></td><td className="right num"><b>{won(r.pay)}</b><Isl html={A.vdNextTxt(r)} /></td><td><Isl html={A.vdProfPill(r.key)} /></td><td><Pill cls={r.s.c}>{r.s.t}</Pill>{r.rec && r.rec.invNo ? <small className="a-memo">승인번호 {r.rec.invNo}</small> : null}</td><td className="right vs-acts"><Act r={r} /></td></tr>)}
        <tr className="a-rev-total"><td><b>합계</b></td><td className="num"><b>{tot.n}건</b></td><td className="right num"><b>{won(tot.base)}</b><Cut r={tot} /></td><td className="right num"><b>{won(tot.net)}</b></td><td></td><td></td><td></td><td className="right num"><b>{won(tot.pay)}</b></td><td></td><td></td><td></td></tr>
      </tbody></table></div> : <Empty ic="coins">{A.vdYMtxt(ym)}에 결제된 VOD가 없어요.</Empty>}</section>
  </>;
}

/* ---------------- 정산 비율 · 가격 #/center/master/vod-rates (예전 pageVodRates · vdRates · vdTaxCard · vdPriceCard) ---------------- */
const RateCell = ({ n }) => <td className="right num vda-rc"><b className="num">{n}%</b><small className="a-memo">플랫폼 {100 - n}</small></td>;
function TaxCard({ n }) {
  const A = ADM(), X = A.VX(), won = A.won, d = A.VD().settings.rates || {};
  const ex = window.DCS.settle.payout(2500000, false, "std", 0), sup = ex.sup, wh = ex.wh; // 예시도 같은 규칙(공용 정산 모듈)으로
  return <section className="a-card"><div className="a-card-head"><h2>정산 · 세금계산서 기준</h2><span className="a-muted">모든 강사에게 같은 기준이에요. 강사 · 종류별 비율은 아래 표에서 정하고, 바꾸면 아직 확정하지 않은 명세서부터 새 비율로 계산해요. 확정한 명세서는 그대로예요.</span></div>
    <form key={n} id="vda-tax-form" className="a-form" noValidate><div className="vs-rule">
        <ol className="vs-rule-steps"><li><b>정산 기준액</b><span>할인 전 판매가 − 온드미디어 RS − PG 결제 수수료</span></li><li><b>정산액 (부가세 포함)</b><span>정산 기준액 × 강사 비율 (기본 50%) − 그 달 광고비 강사 분담</span></li><li><b>지급</b><span>사업자: 정산액 그대로 · 강사님이 두고홀딩스에 정산액(부가세 포함)으로 세금계산서<br />개인(3.3%): 정산액 ÷ 1.1(부가세 전 금액)에서 사업소득 3.3% 원천징수</span></li></ol>
        <p className="vs-rule-ex"><Icon n="coins" c="xs" /><span>예) 1,000만 원 판매 → RS · PG 수수료 빼고 500만 원 → 강사 250만 원 · 플랫폼 250만 원 · 사업자 강사는 <b>250만 원</b> 지급(세금계산서 250만 원) · 개인 강사는 250만 ÷ 1.1 = {won(sup)}에서 3.3% {won(wh)} 빼고 <b>{won(sup - wh)}</b> 지급</span></p>
        <p className="a-muted p-small">{"PG 결제 수수료는 결제 금액의 " + A.VX().settleFeePct() + "%예요 (2026-11-15 결제분부터 · 그 전 결제분은 결제수단별 실제 수수료 · 매출 리포트 › 수수료율에서 정해요) · 쿠폰 · 포인트 할인은 플랫폼 부담이에요."}</p></div>
      <p className="a-label">기본 비율 <small className="a-muted">강사별로 따로 정하지 않은 강사에게 써요 · 숫자는 강사 몫(%)</small></p><div className="a-form-row vda-defr">
        {X.RATE_KEYS.map((x) => <div key={x[0]} className="a-field"><label htmlFor={"vdt-" + x[0]}>{x[1]}</label><div className="vda-pct"><input className="a-input" id={"vdt-" + x[0]} name={"r-" + x[0]} type="number" min="0" max="100" inputMode="numeric" defaultValue={d[x[0]] != null && d[x[0]] !== "" ? d[x[0]] : X.rateDef(x[0])} /><span>%</span></div></div>)}</div>
      <p className="a-muted p-small"><Icon n="alert" c="xs" /> 세금계산서는 사업자 강사만 해당해요(정산액 · 부가세 포함으로 강사님 → 두고홀딩스). 개인 강사는 부가세 전 금액에서 3.3%를 떼고 지급해요.</p>
      <div className="a-form-actions"><button className="a-btn a-btn-primary" type="submit">기본 비율 저장</button></div></form></section>;
}
function PriceCard({ n }) {
  const A = ADM(), X = A.VX(), ui = A.ui, won = A.won, keys = A.vdRateKeys(), k = ui.vdPriceKey && keys.some((x) => x.id === ui.vdPriceKey) ? ui.vdPriceKey : (keys[0] || {}).id;
  if (!k) return null;
  const ps = A.VD().products.filter((p) => X.tkey(p) === k).sort((a, b) => (a.status === "hidden") - (b.status === "hidden") || b.createdAt - a.createdAt), st = A.VD().settings, dc = st.coach || {}, dt = st.tea || {};
  const inp = (nm, v, ph, w) => <input className="a-input a-sm vda-pin" name={nm} type="number" min="0" step={w || 1000} inputMode="numeric" defaultValue={v == null ? "" : v} placeholder={ph == null ? "" : String(ph)} />;
  const pg = A.pageSlice("vdPrice", ps, 5);
  return <section className="a-card" data-pg-card="vdPrice"><div className="a-card-head"><h2>강사별 가격</h2><span className="a-muted">강의 · 1:1 코칭권 · TEA TIME 가격을 강사별로 바로 고쳐요. 저장하면 스토어에 바로 반영돼요. 수강권 기간별 가격 · 할인 마감은 클래스 수정에서 정해요.</span>
      <select key={k} className="a-input a-sm vda-ml" id="vda-price-key" aria-label="강사 고르기" defaultValue={k}>{keys.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
    {ps.length ? <><div className="vda-prices">{pg.items.map((p) => {
      const t = X.typeOf(p), vod = t === "vod" && X.priceOf(p) > 0, c = p.coach || {}, te = p.tea || {}, co = X.coachOf(p), tt = X.teaOf(p);
      return <form key={p.id + ":" + n} className="vda-price" data-id={p.id} noValidate><div className="vda-price-h"><Isl html={A.vdThumb(p, "sm")} /><div><b>{p.title}</b><small className="a-memo">{(X.TYPE[t] ? X.TYPE[t][0] : t) + " · " + (A.VD_ST[p.status] || A.VD_ST.hidden)[0] + " · 지금 판매가 " + won(X.priceOf(p))}</small></div></div>
        <div className="vda-price-f"><label><span>정가</span>{inp("price", p.price, "", 1000)}</label><label><span>판매가 <small>(비우면 정가)</small></span>{inp("sale", p.sale, "", 1000)}</label>
          {vod ? <><label><span>1:1 코칭권 가격</span>{inp("coachPrice", c.price, co ? co.price : dc.price, 1000)}</label><label><span>코칭 횟수</span>{inp("coachN", c.n, co ? co.n : dc.n || 5, 1)}</label>
            <label><span>TEA TIME 가격 <small>(Zoom)</small></span>{inp("teaPrice", te.price, tt ? tt.price : dt.price, 1000)}</label><label><span>TEA TIME 시간(분)</span>{inp("teaMin", te.min, tt ? tt.min : dt.min || 60, 10)}</label></> : null}
          <button className="a-btn a-btn-primary a-btn-sm" type="submit">저장</button></div></form>; })}</div><Pager k="vdPrice" pg={pg} /></>
      : <Empty ic="monitorPlay">이 강사의 클래스가 없어요.</Empty>}</section>;
}
export function MasterVodRates({ n }) {
  const A = ADM(), DB = DBX(), X = A.VX(), v = A.VD(), keys = A.vdRateKeys(), pg = A.pageSlice("vdRate", keys, 5);
  return <>
    <Head title="정산 비율 · 가격" sub="강사별 정산 비율 · 정산 기준 · 강사별 가격을 정해요. 광고비 분담 비율도 여기서 정하고, 실제 광고비는 ‘광고비 · ROAS’에 적어요." right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-ads"><Icon n="megaphone" c="sm" />광고비 · ROAS</a>} />
    <TaxCard n={n} />
    <section className="a-card" data-pg-card="vdRate"><div className="a-card-head"><h2>강사별 정산 비율</h2><span className="a-muted">숫자는 강사 몫이에요 (기본 강사 5 : 플랫폼 5). 강사와 따로 조율하면 종류마다 따로 정할 수 있어요 — 예: TEA TIME 100%는 TEA TIME 매출을 모두 강사님께.</span></div>
      <div className="a-table-wrap"><table className="a-table vda-rates"><thead><tr><th>강사</th>{X.RATE_KEYS.map((x) => <th key={x[0]} className="right">{x[1]}</th>)}<th className="right">광고비 분담</th><th>강의별 예외</th><th>계약 메모 · 확정</th><th className="right">관리</th></tr></thead><tbody>{pg.items.map((x) => {
        const r = X.rateOf(x.id), ex = v.products.filter((p) => X.tkey(p) === x.id && p.share != null && p.share !== "");
        return <tr key={x.id}><td><b>{x.name}</b>{/^ext:/.test(x.id) ? <small className="a-memo">두잉고 계정 없는 강사</small> : null}</td>{X.RATE_KEYS.map((k) => <RateCell key={k[0]} n={r[k[0]]} />)}<RateCell n={r.ad} />
          <td>{ex.length ? ex.map((p) => <span key={p.id} className="vda-ex">{p.title.slice(0, 14) + " " + p.share + "%"}</span>) : <span className="a-muted">없음</span>}</td>
          <td className="vda-memo">{r.memo ? <span title={r.memo}>{r.memo}</span> : <span className="a-muted">기본 계약</span>}{r.next ? <small className="a-memo vda-next"><Icon n="clock" c="xs" /> 예정 · {A.vdRateNextTxt(r)}</small> : r.at ? <small className="a-memo">{DB.date.fmtFull(DB.date.toStr(new Date(r.from || r.at))) + "부터 · " + (r.by || "마스터") + " 확정"}</small> : null}</td>
          <td className="right"><Btn action="vda-rate-edit" cls="a-btn-ghost a-btn-sm" data-k={x.id}>비율 정하기</Btn></td></tr>; })}</tbody></table></div><Pager k="vdRate" pg={pg} />
      <p className="a-muted p-small"><Icon n="alert" c="xs" /> 비율에는 ‘적용 시작일’이 있어요. 그날부터 결제한 주문은 새 비율, 그 전에 결제한 주문은 그때 비율로 정산해요. 강의 하나만 따로 정할 때는 VOD 클래스 관리 › 클래스 수정 › ‘강사 정산 비율’을 쓰면 그 강의가 먼저예요.</p></section>
    <PriceCard n={n} />
  </>;
}

/* ---------------- 매출 리포트 #/center/master/vod-sales (예전 pageVodSales · vdSalesHtml · finPnl · finDaily · finYear · finMethods · finKinds) ----------------
 *  · 같은 달 손익(vdFin)을 여러 번 쓰니 그리는 동안만 기억해 둬요 (예전처럼 ADM.finMemoRun) */
function Chg({ cur, prev }) {
  if (!prev) return cur ? <span className="fin-chg up">새로 발생</span> : <span className="fin-chg">-</span>;
  const p = (cur - prev) / Math.abs(prev) * 100;
  return <span className={"fin-chg " + (p >= 0 ? "up" : "down")}>{(p >= 0 ? "▲ " : "▼ ") + Math.abs(p).toFixed(1) + "%"}</span>;
}
function FinPnl({ f }) {
  const A = ADM(), won = A.won;
  const Row = ({ t, n, cls, sub }) => <li className={cls || ""}><span>{t}{sub ? <small>{sub}</small> : null}</span><b className="num">{n}</b></li>;
  return <section className="a-card"><div className="a-card-head"><h2>{A.vdYMtxt(f.ym)} 손익</h2><span className="a-muted">관리용 · 부가세 포함</span></div>
    <ul className="fin-pnl">
      <Row t="결제 금액" n={won(f.gross)} sub={f.n + "건 (나중에 환불된 주문 포함)"} />
      <Row t="환불" n={(f.ref ? "- " : "") + won(f.ref)} cls="neg" sub={f.refN + "건 · 그 달에 처리한 환불"} />
      <Row t="순매출" n={won(f.net)} cls="sum" />
      <Row t="강사 정산" n={(f.ins ? "- " : "") + won(f.ins)} cls="neg" sub={"정산 명세의 정산액 합계" + (f.adIns ? " · 광고비 강사 분담 " + won(f.adIns) + " 차감 뒤" : "")} />
      {f.rs ? <Row t="온드미디어 RS" n={"- " + won(f.rs)} cls="neg" sub={<>YouTube 링크 판매 RS 합계 · <a href="#/center/master/vod-media-pay">RS 정산</a></>} /> : null}
      <Row t="광고비 집행" n={(f.ad ? "- " : "") + won(f.ad)} cls="neg" sub={f.ad ? "강사 분담 " + won(f.adIns) + " · 플랫폼 부담 " + won(f.ad - f.adIns) : <a href="#/center/master/vod-ads">광고비 적기</a>} />
      <Row t="PG 수수료 (추정)" n={(f.fee ? "- " : "") + won(f.fee)} cls="neg" sub="결제수단별 수수료율로 계산" />
      <Row t="플랫폼 이익 (추정)" n={won(f.profit)} cls={"sum " + (f.profit >= 0 ? "ok" : "bad")} />
    </ul>
    <p className="a-muted p-small fin-vat"><Icon n="alert" c="xs" /> 참고: 순매출 중 부가세 {won(f.vat)} · 공급가액 {won(f.net - f.vat)}. 세금 신고 금액은 세무사와 확인해 주세요.</p></section>;
}
function FinDaily({ ym }) {
  const A = ADM(), DB = DBX(), won = A.won, y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), days = new Date(y, m, 0).getDate(), pym = A.vdYMadd(ym, -1), t0 = DB.date.todayStr(), M = Number(ym.slice(5));
  const day = {}, pday = {};
  const add = (map, ms, n) => { const d = Number(DB.date.toStr(new Date(ms)).slice(8)); map[d] = (map[d] || 0) + n; };
  A.VD().orders.forEach((o) => {
    if ((o.status === "paid" || o.status === "refunded") && o.paidAt) { const k = A.vdYM(o.paidAt); if (k === ym) add(day, o.paidAt, Number(o.amount) || 0); else if (k === pym) add(pday, o.paidAt, Number(o.amount) || 0); }
    if (o.status === "refunded" && o.refundedAt) { const k = A.vdYM(o.refundedAt); if (k === ym) add(day, o.refundedAt, -A.vdRefAmt(o)); else if (k === pym) add(pday, o.refundedAt, -A.vdRefAmt(o)); }
  });
  const max = Math.max(1, ...Object.values(day), ...Object.values(pday)), best = Object.keys(day).sort((a, b) => day[b] - day[a])[0];
  const h = (n) => (n > 0 ? Math.max(2, Math.round(n / max * 100)) : 0);
  return <section className="a-card"><div className="a-card-head"><h2>일별 순매출</h2><span className="a-muted">{best && day[best] > 0 ? "가장 많이 판 날 " + M + "/" + best + " · " + won(day[best]) : "아직 판매가 없어요"}</span></div>
    <div className="fin-days" style={{ "--n": days }}>{Array.from({ length: days }, (_, i) => { const d = i + 1, n = day[d] || 0, p = pday[d] || 0, ds = ym + "-" + String(d).padStart(2, "0");
      return <div key={d} className={"fin-d" + (ds === t0 ? " now" : "") + (ds > t0 ? " fut" : "")} title={M + "/" + d + " " + won(n) + " · 지난달 " + won(p)}><span className="fin-db"><i className="p" style={{ height: h(p) + "%" }} /><i style={{ height: h(n) + "%" }} /></span><b>{d === 1 || d % 5 === 0 ? d : ""}</b></div>; })}</div>
    <p className="fin-legend"><span><i />{M}월</span><span><i className="p" />지난달 같은 날</span></p></section>;
}
function FinYear({ y, rows }) {
  const A = ADM(), won = A.won, thisM = DBX().date.todayStr().slice(0, 7);
  const tot = rows.reduce((a, r) => { ["n", "gross", "ref", "net", "ins", "rs", "ad", "fee", "profit"].forEach((k) => { a[k] += r[k] || 0; }); a.ly += r.ly; return a; }, { n: 0, gross: 0, ref: 0, net: 0, ins: 0, rs: 0, ad: 0, fee: 0, profit: 0, ly: 0 });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.net, r.ly)));
  const h = (n) => (n > 0 ? Math.max(3, Math.round(n / max * 100)) : 0);
  return <section className="a-card"><FinNav act="fin-year" label={y + "년 월별 매출"}><span className="a-cal-sum">순매출 <b>{won(tot.net)}</b> · 작년 {won(tot.ly)} <Chg cur={tot.net} prev={tot.ly} /> · 플랫폼 이익 <b>{won(tot.profit)}</b></span></FinNav>
    <div className="a-rev-chart fin-yc" aria-hidden="true">{rows.map((r, i) => <div key={r.ym} className={"a-rev-col" + (r.ym === thisM ? " now" : "")}><small className="num">{r.net ? A.finShort(r.net) : ""}</small><span className="a-rev-bar fin-yb"><i className="p" style={{ height: h(r.ly) + "%" }} /><i style={{ height: h(r.net) + "%" }} /></span><b>{i + 1}월</b></div>)}</div>
    <p className="fin-legend"><span><i />{y}년 순매출</span><span><i className="p" />{y - 1}년 같은 달</span></p>
    <div className="a-table-wrap"><table className="a-table fin-table"><thead><tr><th>월</th><th className="right">결제</th><th className="right">환불</th><th className="right">순매출</th><th className="right">전월 대비</th><th className="right">전년 대비</th><th className="right">강사 정산</th><th className="right">온드 RS</th><th className="right">광고비</th><th className="right">PG 수수료</th><th className="right">플랫폼 이익</th></tr></thead><tbody>
      {rows.map((r, i) => { const fut = r.ym > thisM; return <tr key={r.ym} className={r.n || r.ref || r.ad ? undefined : "a-dim"}><td><b>{i + 1}월</b><small className="a-memo">{r.n}건</small></td><td className="right num">{won(r.gross)}</td><td className="right num">{r.ref ? "- " + won(r.ref) : "0원"}</td><td className="right num"><b>{won(r.net)}</b></td><td className="right">{fut ? "-" : <Chg cur={r.net} prev={r.prev} />}</td><td className="right">{fut ? "-" : <Chg cur={r.net} prev={r.ly} />}</td><td className="right num">{won(r.ins)}</td><td className="right num">{won(r.rs || 0)}</td><td className="right num">{won(r.ad)}</td><td className="right num">{won(r.fee)}</td><td className={"right num " + (r.profit < 0 ? "fin-neg" : "")}><b>{won(r.profit)}</b></td></tr>; })}
      <tr className="a-rev-total"><td><b>합계</b><small className="a-memo">{tot.n}건</small></td><td className="right num"><b>{won(tot.gross)}</b></td><td className="right num">{tot.ref ? "- " + won(tot.ref) : "0원"}</td><td className="right num"><b>{won(tot.net)}</b></td><td></td><td className="right"><Chg cur={tot.net} prev={tot.ly} /></td><td className="right num"><b>{won(tot.ins)}</b></td><td className="right num"><b>{won(tot.rs)}</b></td><td className="right num"><b>{won(tot.ad)}</b></td><td className="right num"><b>{won(tot.fee)}</b></td><td className="right num"><b>{won(tot.profit)}</b></td></tr>
    </tbody></table></div></section>;
}
function FinMethods({ ym }) {
  const A = ADM(), won = A.won, sold = A.vdSold(ym), by = {};
  sold.forEach((o) => { const k = A.vdPayKey(o), x = (by[k] = by[k] || { n: 0, amt: 0, fee: 0 }); x.n++; x.amt += Math.round((Number(o.amount) || 0) * A.vdKeep(o)); x.fee += A.vdFee(o); });
  const tot = Object.keys(by).reduce((a, k) => a + by[k].amt, 0), list = A.VD_PAY_KEYS.filter((x) => by[x[0]]);
  const rate = (k) => { const r = A.vdFeeRate(k); return (r[0] ? r[0] + "%" : "") + (r[0] && r[1] ? " + " : "") + (r[1] ? won(r[1]) + "/건" : "") || "없음"; };
  return <section className="a-card"><div className="a-card-head"><h2>결제수단별</h2><span className="a-muted">{A.vdYMtxt(ym)} · 환불 뺀 금액</span><Btn action="fin-fee" cls="a-btn-ghost a-btn-sm vda-ml"><Icon n="sliders" c="sm" />수수료율</Btn></div>
    {list.length ? <ul className="fin-bars">{list.map((x) => { const v = by[x[0]], p = pct(v.amt, tot); return <li key={x[0]}><div className="fin-bh"><b>{x[1]}</b><span className="num">{won(v.amt) + " · " + v.n + "건"}</span></div><span className="fin-bar"><i style={{ width: p + "%" }} /></span><small>{p + "% · 수수료 " + rate(x[0]) + " → " + won(v.fee)}</small></li>; })}</ul> : <Empty ic="coins">이 달 결제가 없어요.</Empty>}</section>;
}
function FinKinds({ ym }) {
  const A = ADM(), won = A.won, sold = A.vdSold(ym).filter(A.vdLive), by = {};
  sold.forEach((o) => { const k = A.vdKindKey(o), x = (by[k] = by[k] || { n: 0, amt: 0 }); x.n++; x.amt += Math.round((Number(o.amount) || 0) * A.vdKeep(o)); });
  const tot = Object.keys(by).reduce((a, k) => a + by[k].amt, 0), list = A.FIN_KIND.filter((x) => by[x[0]]);
  return <section className="a-card"><div className="a-card-head"><h2>상품 종류별</h2><span className="a-muted">{A.vdYMtxt(ym)}</span></div>
    {list.length ? <ul className="fin-bars k">{list.map((x) => { const v = by[x[0]], p = pct(v.amt, tot); return <li key={x[0]}><div className="fin-bh"><b>{x[1]}</b><span className="num">{won(v.amt) + " · " + v.n + "건"}</span></div><span className="fin-bar"><i style={{ width: p + "%" }} /></span><small>{p}%</small></li>; })}</ul> : <Empty ic="coins">이 달 판매가 없어요.</Empty>}</section>;
}
export function MasterVodSales() {
  const A = ADM(), DB = DBX(), won = A.won, t0 = DB.date.todayStr(), thisM = t0.slice(0, 7), ym = A.ui.finYM || thisM, y = Number(ym.slice(0, 4)), live = ym === thisM;
  // 그리는 데 쓰는 손익 숫자를 한 번에 (같은 달은 한 번만 계산)
  const d = A.finMemoRun(() => {
    const add = A.vdYMadd, f = A.vdFin(ym), pm = A.vdFin(add(ym, -1)), ly = A.vdFin(add(ym, -12));
    const now = Date.now(), el = now - A.ymStart(ym), pmS = A.ymStart(add(ym, -1)), lyS = A.ymStart(add(ym, -12));
    const pmCmp = live ? Math.min(A.vdNetBetween(pmS, pmS + el), pm.net) : pm.net, lyCmp = live ? Math.min(A.vdNetBetween(lyS, lyS + el), ly.net) : ly.net;
    const rows = Array.from({ length: 12 }, (_, i) => y + "-" + String(i + 1).padStart(2, "0")).map((m) => Object.assign(A.vdFin(m), { prev: A.vdFin(add(m, -1)).net, ly: A.vdFin(add(m, -12)).net }));
    return { f, pm, pmCmp, lyCmp, rows };
  });
  const { f, pm, pmCmp, lyCmp, rows } = d;
  const aov = f.paidN ? Math.round(f.gross / f.paidN) : 0, margin = f.net > 0 ? Math.round(f.profit / f.net * 1000) / 10 : 0, refRate = f.gross > 0 ? Math.round(f.ref / f.gross * 1000) / 10 : 0;
  const cmpTxt = live ? "지난달 같은 기간(1~" + Number(t0.slice(8)) + "일)" : "지난달", M = Number(ym.slice(5));
  return <>
    <Head title="매출 리포트" sub="DOOGO CLASS의 결제 · 환불 · 순매출과 강사 정산 · 온드미디어 RS · 광고비 · PG 수수료를 빼고 남는 플랫폼 이익을 월별로 봐요. 금액은 모두 부가세 포함이에요." right={<><Btn action="fin-csv" cls="a-btn-ghost" data-y={y}><Icon n="download" c="sm" />월별 손익 CSV</Btn><a className="a-btn a-btn-ghost" href="#/center/master/vod-rank"><Icon n="trophy" c="sm" />판매 순위</a></>} />
    <section className="a-card fin-top"><FinNav act="fin-ym" label={<>{A.vdYMtxt(ym)}{live ? <> <small className="a-muted">· 진행 중</small></> : null}</>}><span className="a-cal-sum">결제 <b>{f.n}건</b> · 환불 {f.refN}건</span></FinNav>
      <div className="fin-kpis">
        <div className="fin-kpi main"><small>순매출</small><b className="num">{won(f.net)}</b><span>{cmpTxt} {won(pmCmp)} 대비 <Chg cur={f.net} prev={pmCmp} /></span></div>
        <div className="fin-kpi"><small>작년 {M}월 대비</small><b><Chg cur={f.net} prev={lyCmp} /></b><span>{(live ? "작년 같은 기간 " : "작년 " + M + "월 ") + won(lyCmp)}</span></div>
        <div className="fin-kpi"><small>객단가</small><b className="num">{won(aov)}</b><span>유료 결제 {f.paidN}건 · 환불률 {refRate}%</span></div>
        <div className={"fin-kpi " + (f.profit >= 0 ? "ok" : "bad")}><small>플랫폼 이익 (추정)</small><b className="num">{won(f.profit)}</b><span>순매출의 {margin}% · 지난달 {won(pm.profit)}</span></div>
      </div></section>
    <div className="fin-grid"><FinPnl f={f} /><FinDaily ym={ym} /></div>
    <FinYear y={y} rows={rows} />
    <div className="fin-grid"><FinMethods ym={ym} /><FinKinds ym={ym} /></div>
  </>;
}
