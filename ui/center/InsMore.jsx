"use client";
/* 강사센터 — 계약 · 서류 #/center/contract · 추가 메뉴 #/center/pages
 * 예전 admin.js pageInsContract · pageCustomPages 를 React 로 (Next.js 전환 6단계)
 *  · 서류 올리기(data-ct-up) · 내용 수정 창은 예전 admin.js 이벤트 · 창이 그대로 받아요 */
import Icon from "../lib/Icon.jsx";
import { ADM, Btn, Head, Kpi, Empty, Pill, Isl } from "./bits.jsx";

export function InsContract() {
  const A = ADM(), iid = A.IID(), c = A.CONTRACTS()[iid], s = A.contractState(c), DOCS = A.DOCS;
  return <>
    <Head title="계약 · 서류" sub="두잉고와 맺은 이용 계약 기간과 제출 서류를 확인해요. 빠진 서류는 여기서 바로 올려 주세요." />
    <section className="a-card"><div className="a-card-head"><h2>이용 계약</h2><Pill cls={s[1]}>{s[0]}</Pill></div>
      {c && c.start ? <dl className="vda-mem-dl"><div><dt>계약 기간</dt><dd>{c.start + " ~ " + c.end}</dd></div><div><dt>이용료</dt><dd>{c.feeNote || "-"}</dd></div><div><dt>담당</dt><dd>{c.contact || "두잉고 운영팀"}</dd></div>{c.memo ? <div><dt>메모</dt><dd>{c.memo}</dd></div> : null}</dl>
        : <Empty ic="file">아직 계약 정보가 없어요. 두잉고 운영팀이 곧 등록해 드려요.</Empty>}</section>
    <section className="a-card"><div className="a-card-head"><h2>제출 서류</h2><span className="a-muted">{DOCS.length - A.docMissing(c)} / {DOCS.length}</span></div><ul className="vda-help-l">{DOCS.map((x) => { const f = c && c.docs && c.docs[x[0]]; return (
      <li key={x[0]}>{f ? <Pill cls="ok">제출 완료</Pill> : <Pill cls="warn">미제출</Pill>}<b>{x[1]}</b><small>{f ? (f.name || "") + " · " + (f.at || "") : "PDF · JPG · PNG · 10MB 이하"}</small><label className="a-btn a-btn-ghost a-btn-sm"><Icon n="upload" c="sm" />{f ? "다시 올리기" : "올리기"}<input type="file" className="sr-only" accept="application/pdf,image/*" data-ct-up={x[0]} /></label></li>); })}</ul>
      <p className="a-muted p-small"><Icon n="lock" c="xs" /> 올린 서류는 두잉고 운영팀(마스터)만 볼 수 있어요. 계약 기간이 끝나기 30일 전에 갱신 안내를 드려요.</p></section>
  </>;
}

export function CustomPages() {
  const A = ADM(), c = A.C(), items = A.customPages(A.MID());
  return <>
    <Head title="추가 메뉴" sub="‘메뉴 구성’에서 만든 페이지 메뉴의 내용을 채워요. 수강생 화면 왼쪽 메뉴에 그대로 보여요." />
    {items.length ? <div className="a-stack">{items.map((it) => { const pg = c.pages[it.key] || {}; return (
      <section key={it.key} className="a-card"><div className="a-card-head"><span className="a-menu-ico"><Icon n={it.icon || "file"} c="sm" /></span><h2 className="a-grow">{it.label}</h2>{it.on ? <Pill cls="ok">수강생에게 보임</Pill> : <Pill cls="mute">꺼짐</Pill>}<Btn action="page-edit" cls="a-btn-primary a-btn-sm" data-key={it.key}><Icon n="pen" c="sm" />내용 수정</Btn></div>
        <p className="a-muted" style={{ margin: 0 }}>{pg.body ? pg.body.slice(0, 120) : "아직 내용이 없어요."}</p>{(pg.attachments || []).length ? <p className="a-muted" style={{ margin: "8px 0 0" }}><Icon n="paperclip" c="xs" /> 첨부 {pg.attachments.length}개</p> : null}</section>); })}</div>
      : <section className="a-card"><Empty ic="star" extra={<a className="a-btn a-btn-primary" href="#/center/menus">메뉴 구성으로</a>}>추가 메뉴가 없어요. ‘메뉴 구성’에서 새 메뉴를 만들 수 있어요.</Empty></section>}
  </>;
}

/* ---------------- VOD 강의 · 수업 자료 #/center/vodlessons (예전 pageVodLessons) ----------------
 *  · 강의마다 폼 하나(form.a-vl) — 저장 · 파일 올리기 · 링크 추가 · 지우기 · 최신성 업데이트는 예전 admin.js 이벤트가 그대로 받아요
 *  · 다른 강의 칸에 적어 둔 것은 다시 그려도 그대로 (예전 vlSnap · vlRestore 와 같은 결과) — 저장한 강의 칸만 저장된 값으로 새로 그려요(key) */
export function InsVodLessons() {
  const A = ADM(), DB = window.DB, X = A.VX(), iid = A.IID(), prods = A.VD().products.filter((p) => p.iid === iid && X.typeOf(p) === "vod");
  const sub = "강의마다 비메오 영상 링크 · 강의 노트 · 수업 자료(PDF · 엑셀 · 한글 등)를 직접 올려요. 저장하면 수강생 두잉고 강의실에 바로 보여요. 어렵다면 마스터에게 말씀해 주세요. 마스터도 같은 내용을 함께 고칠 수 있어요.";
  if (!prods.length) return <><Head title="VOD 강의 · 수업 자료" sub={sub} /><section className="a-card"><Empty ic="monitorPlay">아직 DOOGO CLASS에 올라간 내 VOD가 없어요. VOD로 만들고 싶다면 마스터에게 문의해 주세요.</Empty></section></>;
  const p = prods.find((x) => x.id === A.ui.vlP) || prods[0], lz = X.lessons(p), nV = lz.filter((l) => l.video).length, nF = lz.reduce((a, l) => a + (l.files || []).length, 0), H = "#/center/vodlessons";
  const u = X.lastUpd ? X.lastUpd(p) : null;
  return <>
    <Head title="VOD 강의 · 수업 자료" sub={sub} right={<Isl html={A.vdStoreBtn("#/vod/p/" + p.id, "상세 페이지 보기")} />} />
    {prods.length > 1 ? <div className="a-tabs a-vl-tabs">{prods.map((x) => <button key={x.id} type="button" className={"a-tab" + (x.id === p.id ? " on" : "")} data-action="vl-p" data-id={x.id}>{x.title}</button>)}</div> : null}
    <div className="a-kpis"><Kpi label="강의" value={lz.length + "개"} sub={"파트 " + (p.curriculum || []).length + "개 · 총 " + X.durTxt(X.totalMin(p))} href={H} /><Kpi label="영상 연결" value={nV + " / " + lz.length} sub={nV < lz.length ? "비메오 링크를 넣어 주세요" : "모든 강의에 영상이 있어요"} href={H} tone={nV < lz.length ? "warn" : "ok"} />
      <Kpi label="수업 자료" value={nF + "개"} sub="수강생이 강의실에서 내려받아요" href={H} /><Kpi label="미리보기 강의" value={lz.filter((l) => l.preview).length + "개"} sub="구매 전에도 볼 수 있어요" href={H} /></div>
    <section className="a-card vu-card"><div className="vu-card-b"><span className="vu-card-ic"><Icon n="refresh" c="sm" /></span><div><b>최신성 업데이트</b><p>{u ? String(u.at).replace(/-/g, ".") + " 업데이트 · " + (u.title || "최신 내용 반영") + " — 상세 페이지에 ‘" + X.ymTxt(u.at) + "에 최신 내용으로 업데이트된 강의예요’로 보여요" : "강의 일부를 다시 찍었거나 새 강의를 더했다면 남겨 주세요. 상세 페이지 · 커리큘럼에 NEW · UPDATE로 보이고, 산 수강생에게 알림톡이 가요."}</p></div><Btn action="vu-open" cls="a-btn-primary" data-id={p.id}><Icon n="refresh" c="sm" />최신성 업데이트 하기</Btn></div>{(p.upds || []).length ? <Isl html={A.vuHist(p)} /> : null}</section>
    <section className="a-card a-vl-howto"><b><Icon n="circlePlay" c="sm" /> 비메오 링크 넣는 법</b><ol><li>비메오(vimeo.com)에 강의 영상을 올려요.</li><li>공개 범위는 ‘링크가 있는 사람만’ 또는 ‘숨김’, 퍼가기 허용 도메인에 doogoclass.com을 넣어요.</li><li>‘공유 → 링크 복사’로 받은 주소(예: https://vimeo.com/76979871)를 아래 ‘영상 링크’ 칸에 붙여 넣고 저장해요.</li></ol></section>
    {(p.curriculum || []).map((c, ci) => <section key={ci} className="a-card a-vl-ch"><div className="a-card-head"><h2><span className="a-vl-no">{String(ci + 1).padStart(2, "0")}</span>{c.title || "파트 " + (ci + 1)}</h2><span className="a-muted">강의 {(c.lessons || []).length}개</span></div>
      {(c.lessons || []).map((l, li) => { const vk = A.vidKind(l.video), at = { "data-p": p.id, "data-ci": ci, "data-li": li }, fl = l.files || [];
        // 저장된 값이 바뀐 강의 칸만 새로 그려요 (적어 둔 다른 칸 · ‘고침’ 표시는 그대로)
        const ver = [l.title, l.min, l.video, l.desc, !!l.preview, fl.length].join("|");
        return <form key={ci + ":" + li + ":" + ver} className="a-vl" {...at} noValidate><div className="a-vl-h"><span className="a-vl-n">{ci + 1}-{li + 1}</span><input className="a-input" name="title" defaultValue={l.title} maxLength={80} aria-label="강의 이름" placeholder="강의 이름" /><span className="a-vl-mw"><input className="a-input" name="min" type="number" min="0" max="600" inputMode="numeric" defaultValue={l.min || ""} aria-label="길이(분)" /><small>분</small></span><Isl html={DB.vdur.label(l.video, l.durSec, "", "vda-dur")} /><Pill cls={vk[1]}>{vk[0]}</Pill></div>
          <div className="a-field"><label>영상 링크 <small>비메오 추천 · 유튜브 · mp4</small></label><input className="a-input" name="video" defaultValue={l.video || ""} maxLength={300} placeholder="https://vimeo.com/123456789" /></div>
          <div className="a-field"><label>강의 노트 <small>영상 아래에 보여요</small></label><textarea className="a-input" name="desc" rows={2} maxLength={1000} placeholder="이 강의에서 꼭 기억할 내용, 실습 순서를 적어 주세요." defaultValue={l.desc || ""} /></div>
          <div className="a-field"><span className="a-label">수업 자료 <small>{fl.length}개 · 수강생이 강의실 ‘수업 자료’에서 미리보기 · 내려받기</small></span>
            {fl.length ? <ul className="a-vl-fl">{fl.map((f, fi) => <Isl key={fi} html={A.matChip(f, ' data-action="vl-fdel" data-p="' + A.esc(p.id) + '" data-ci="' + ci + '" data-li="' + li + '" data-fi="' + fi + '"')} />)}</ul> : null}
            <div className="a-vl-add"><label className="a-btn a-btn-outline a-btn-sm"><Icon n="paperclip" c="sm" />파일 올리기<input type="file" className="sr-only" multiple data-vl-up="" {...at} accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.hwp,.hwpx,.pptx,.ppt,.zip,.png,.jpg,.jpeg" /></label><span className="a-muted">PDF · 엑셀 · 한글 · PPT · ZIP · 20MB까지 (더 크면 링크로)</span></div>
            <details className="a-vl-link"><summary><Icon n="link" c="xs" /> 구글 드라이브 등 링크로 추가</summary><div><input className="a-input a-sm" name="lname" maxLength={80} placeholder="자료 이름 (예: 1주차 교안.pdf)" /><input className="a-input a-sm" name="lurl" type="url" maxLength={400} placeholder="https://drive.google.com/…" /><Btn action="vl-flink" cls="a-btn-ghost a-btn-sm" {...at}>추가</Btn></div></details></div>
          <div className="a-vl-ft"><label className="a-check"><input type="checkbox" name="preview" defaultChecked={!!l.preview} /><span>미리보기 강의 <small>구매 전에도 볼 수 있어요</small></span></label><button className="a-btn a-btn-primary a-btn-sm" type="submit"><Icon n="check" c="sm" />저장</button></div></form>; })}</section>)}
    <p className="a-hint"><Icon n="shieldCheck" c="xs" /> 시안에서는 올린 파일이 이 브라우저에 저장돼요. 정식 서비스에서는 두고 서버 파일 저장소에 올라가서 모든 수강생이 내려받을 수 있어요. 파트 · 강의 추가 · 순서 · 가격은 마스터가 VOD 클래스 관리에서 함께 고쳐요.</p>
  </>;
}

/* ---------------- 다른 탭 메뉴 안내 (예전 trackOffPage) — 지금 탭에 없는 메뉴 주소로 오면 · 잠긴 영역이면 자물쇠 안내 + 입점 신청 ---------------- */
export function TrackOff({ r }) {
  const A = ADM(), k = r.parts[0] || "", pt = A.pageTrack(k);
  if (pt && !A.OPEN()[pt]) return <><Head title={pt === "vod" ? "DOOGO CLASS 메뉴예요" : "두잉고 메뉴예요"} sub={pt === "vod" ? "VOD 판매 · 정산 · VOD 수강생 강의실 메뉴예요." : "기수 · 수강생 · 과제로 운영하는 LIVE 두잉고 메뉴예요."} /><Isl html={A.trackLockCard(pt)} /></>;
  const toLive = A.VOD_ONLY_PAGES.indexOf(k) < 0;
  return <><Head title={toLive ? "두잉고 탭 메뉴예요" : "DOOGO CLASS 탭 메뉴예요"} sub={toLive ? "DOOGO CLASS 탭에는 주차 · 과제 · 기수 · 홍보 페이지가 없어요." : "두잉고 탭에는 없는 메뉴예요."} />
    <section className="a-card"><Empty ic={toLive ? "layers" : "circlePlay"} extra={<Btn action="trk" cls="a-btn-primary" data-k={toLive ? "live" : "vod"} data-stay="1">{(toLive ? "두잉고" : "DOOGO CLASS") + " 탭으로 바꾸기"}</Btn>}>{toLive ? "이 메뉴는 두잉고 탭에서 고쳐요." : "이 메뉴는 DOOGO CLASS 탭에서 고쳐요."}</Empty></section></>;
}
