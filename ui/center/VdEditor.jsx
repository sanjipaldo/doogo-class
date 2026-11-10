"use client";
/* 마스터 — DOOGO CLASS 클래스 세팅 #/center/master/vod-classes/<클래스> (새로 만들기 new · 복제)
 * 예전 admin.js vdEditor (vodPlanFields · vdFunnelFields · vdDimgBlock) 를 React 로 (Next.js 전환 6단계)
 *  · 저장(submit) · 칸 적기(미리보기 · 썸네일 · 이어 팔기 안내) · 사진 · PDF · 상세 이미지 · 챕터 · 강의 · 자료 · 질문 버튼은 예전 admin.js 이벤트가 그대로 받아요
 *  · 적는 동안 예전 코드가 바꾸는 칸(오른쪽 카드 미리보기 · 썸네일 미리보기 · 이어 팔기 안내)은 예전 HTML 조각 그대로(Isl) — React 는 그 안을 건드리지 않아요
 *  · 상품 종류 · 진행 방식을 고르면 예전 코드가 폼의 data-type · data-where 를 바꿔 칸을 보이고 숨겨요 (다시 그릴 때는 고른 값 그대로)
 *  · 버튼으로 다시 그릴 때마다(n) 칸을 지금 편집 중인 값(ui.vdDraft)으로 새로 그려요 — 예전 화면이 본문을 통째로 다시 그리던 것과 같은 결과 */
import { Fragment } from "react";
import Icon from "../lib/Icon.jsx";
import { ADM, Btn, Head, Isl } from "./bits.jsx";

const sv = (v) => (v == null ? "" : String(v)); // 예전 esc(v) 와 같은 빈 값
/** 예전 f(n, label, val, attrs, help) */
function Fd({ n, label, val, at, help }) {
  return <div className="a-field"><label htmlFor={"vda-" + n}>{label}</label><input className="a-input" id={"vda-" + n} name={n} defaultValue={sv(val)} {...(at || {})} />{help ? <small className="a-muted">{help}</small> : null}</div>;
}
/** 예전 ta(n, label, val, rows, help, ph) */
function Ta({ n, label, val, rows, help, ph }) {
  return <div className="a-field"><label htmlFor={"vda-" + n}>{label}</label><textarea className="a-input" id={"vda-" + n} name={n} rows={rows || 3} placeholder={ph || undefined} defaultValue={sv(val || "")} />{help ? <small className="a-muted">{help}</small> : null}</div>;
}
const Sec = ({ no, t, sub, children }) => <section className="a-card vda-sec" id={"vda-s" + no}><div className="vda-sec-h"><span className="vda-no">{no}</span><div><h2>{t}</h2>{sub ? <p className="a-muted">{sub}</p> : null}</div></div>{children}</section>;
const Radios = ({ name, opts, cur, cls }) => <div className={"vda-radios" + (cls ? " " + cls : "")}>{opts.map((x) => <label key={x[0]} className="vda-radio"><input type="radio" name={name} value={x[0]} defaultChecked={cur === x[0]} /><span><b>{x[1]}</b><small>{x[2]}</small></span></label>)}</div>;
const Row = ({ cls, children }) => <div className={"a-form-row" + (cls ? " " + cls : "")}>{children}</div>;
const Spec = ({ title, body, extra }) => <div className="vda-spec"><Icon n="image" c="sm" /><div><b>{title}</b><small>{body}</small>{extra || null}</div></div>;
const NUM = { type: "number", inputMode: "numeric" };
const num = (o) => Object.assign({}, NUM, o);
const TYPES = [["vod", "VOD 강의", "녹화 영상 · 수강 기간"], ["ebook", "전자책", "PDF 내려받기 · 평생 소장"], ["book", "종이책", "택배 배송 · 수량 · 배송지 · 송장 (전자책 메뉴에 보여요)"], ["flive", "LIVE 무료강의", "0원 · 유튜브 LIVE + 카톡 오픈채팅 · 끝나면 유료 강의로 이어 팔기"], ["onoff", "온/오프라인 강의", "유료 · 현장 강의 또는 Zoom 온라인 · 정원"]];
const STATUS = [["on", "판매 중", "스토어에 보이고 바로 살 수 있어요"], ["soon", "오픈 예정", "보이지만 아직 살 수 없어요"], ["hidden", "숨김", "스토어에 안 보여요 (준비 중)"]];
const BADGES = [["BEST", "BEST"], ["NEW", "NEW"], ["UPDATE", "업데이트"], ["HOT", "HOT"], ["NICE", "추천"]];
const WHERE = [["offline", "오프라인 (현장)", "장소 · 준비물 안내 · 현장 출석"], ["online", "온라인 (Zoom)", "Zoom 링크 · 시작 10분 전부터 입장"]];
const NAV = [["1", "기본 정보"], ["2", "가격 · 기간 · 일정"], ["3", "썸네일"], ["4", "상세페이지 · 소개"], ["5", "커리큘럼 · 목차"], ["6", "FAQ"]];
const MAT_ACCEPT = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.hwp,.hwpx,.pptx,.ppt,.zip,.png,.jpg,.jpeg";

/** 예전 vodPlanFields(d, f) — 유료 VOD: 수강권(6개월 · 12개월) · 1:1 코칭권 · TEA TIME */
function PlanFields({ d }) {
  const A = ADM(), X = A.VX(), st = A.VD().settings, pl = d.plans || {}, co = d.coach || {}, te = d.tea || {}, sc = st.coach || {}, stt = st.tea || {}, rb = X.rebuySet();
  const Ck = ({ name, on, children }) => <label className="a-check"><input type="checkbox" name={name} defaultChecked={on} /><span>{children}</span></label>;
  return <div className="vda-tf vda-tf-vod"><b className="vda-tf-h"><Icon n="layers" c="sm" /> 수강권 · 부가 상품 <small>격차 방식 · 유료 VOD</small></b>
    <div className="vda-plans">{X.PLAN_DAYS.map((x) => { const c = pl[x[0]] || {};
      return <div key={x[0]} className="vda-plan"><Ck name={"pl-" + x[0] + "-on"} on={c.on !== false}><b>{x[1]}</b> 수강권{x[0] === 365 ? <> <em>추천</em></> : null}</Ck><input className="a-input" name={"pl-" + x[0]} type="number" min="0" step="1000" inputMode="numeric" defaultValue={c.price == null || c.price === "" ? "" : String(c.price)} placeholder={"비우면 판매가 × " + x[2]} aria-label={x[1] + " 수강권 가격"} /></div>; })}</div>
    <small className="a-muted">{"비우면 6개월(180일) = 판매가, 12개월(365일) = × 1.1 (천 원 단위). 상세 페이지에서 12개월이 ‘추천’으로 먼저 골라지고, ‘월 가격’(총액 ÷ 개월 수)을 크게 · 총액을 함께 보여요. 기간이 끝난 수강생은 재수강 " + (rb.on ? rb.pct + "% 할인가로" : "할인 없이") + " 다시 결제해요 (전시 · 쿠폰 · 설정 › 재수강 할인)."}</small>
    <div className="vda-addon-f"><Ck name="co-on" on={co.on !== false}><b>1:1 코칭권</b> 판매</Ck><Row>
      <Fd n="co-n" label="횟수" val={co.n || ""} at={num({ min: 1, max: 50, placeholder: String(sc.n || 5) })} /><Fd n="co-days" label="사용 기간 (일)" val={co.days || ""} at={num({ min: 7, max: 730, placeholder: String(sc.days || 180) })} /><Fd n="co-price" label="가격 (원)" val={co.price == null ? "" : co.price} at={num({ min: 0, step: 1000, placeholder: String(sc.price || 150000) })} /></Row></div>
    <div className="vda-addon-f"><Ck name="tea-on" on={te.on !== false}><b>강사님과 TEA TIME</b> 판매</Ck><Row>
      <Fd n="tea-min" label="시간 (분)" val={te.min || ""} at={num({ min: 15, max: 240, step: 15, placeholder: String(stt.min || 60) })} /><Fd n="tea-price" label="가격 (원)" val={te.price == null ? "" : te.price} at={num({ min: 0, step: 1000, placeholder: String(stt.price || 99000) })} />
      <div className="a-field"><span className="a-label">진행 방식</span><p className="a-fixed"><Icon n="video" c="xs" /> Zoom 온라인 화상으로만 진행해요 · 강사님이 일정을 확정할 때 Zoom 링크를 보내요</p><input type="hidden" name="tea-mode" defaultValue="online" /></div></Row></div>
    <small className="a-muted">빈칸은 ‘전시 · 쿠폰 · 설정 › 수강권 · 부가 상품 기본값’을 따라요. 코칭권 · TEA TIME은 두잉고 VOD 버전이 열린 강의에서만 팔리고, 쿠폰은 수강권에만 적용돼요.</small></div>;
}
/** 예전 vdFunnelFields(d, f) — 무료 LIVE → 이어 팔기 (얼리버드) */
function FunnelFields({ d }) {
  const A = ADM(), X = A.VX(), ps = A.VD().products.filter((p) => p.id !== d.id && !X.isFreeEv(p) && Number(p.price) > 0);
  return <div className="vda-fun"><b className="vda-tf-h"><Icon n="sparkles" c="sm" /> LIVE가 끝나면 → 유료 강의로 이어 팔기 <small>정가 0원(무료) LIVE · 설명회에서만 작동해요</small></b>
    <div className="a-field"><label htmlFor="vda-next">이어지는 유료 강의</label><select className="a-input" id="vda-next" name="next" defaultValue={ps.some((p) => p.id === d.next) ? d.next : ""}><option value="">연결 안 함 (무료 LIVE만 진행)</option>
      {ps.map((p) => <option key={p.id} value={p.id}>{"[" + A.adTypeShort(p) + "] " + p.title + " · " + A.won(X.basePrice(p)) + (p.status === "hidden" ? " (숨김)" : p.status === "soon" ? " (오픈 예정)" : "")}</option>)}</select>
      <small className="a-muted">무료 LIVE와 유료 강의는 따로 만들고 여기서 이어요. 같은 유료 강의에 회차마다 무료 LIVE를 계속 이어 붙일 수 있어요.</small></div>
    <Row><Fd n="ebPrice" label="얼리버드 가격 (원)" val={d.ebPrice || ""} at={num({ min: 0, step: 1000, placeholder: "비우면 할인 없이 연결만" })} help="VOD는 6개월 수강권 기준이에요. 12개월 수강권도 같은 비율로 내려가요." /><Fd n="ebDays" label="얼리버드 기간 (LIVE 끝난 날부터 며칠)" val={d.ebDays || 3} at={num({ min: 1, max: 60 })} help="마지막 날 밤 12시가 지나면 원래 가격으로 돌아가요." /></Row>
    <label className="a-check vda-fun-gate"><input type="checkbox" name="gate" defaultChecked={!!d.gate} /><span>LIVE가 끝날 때까지 유료 강의를 스토어 목록에서 숨기기 <small className="a-muted">이번 LIVE를 위해 새로 만든 강의일 때만 켜세요. 이미 팔고 있는 VOD는 꺼 두세요.</small></span></label>
    <Isl html={'<p class="vda-fun-prev" id="vda-fun-prev">' + A.vdFunPrev(d) + "</p>"} /></div>;
}
/** 예전 vdDimgBlock(d) — 상세페이지 이미지 (보이는 순서 · 여러 장 · 주소로 추가) */
function DimgBlock({ d }) {
  const A = ADM(), X = A.VX(), im = A.vdDimgs(d), mode = d.detailMode || "img-text", S = A.IMG_SPEC;
  return <div className="a-field vda-dimg" id="vda-dimg"><span className="a-label">상세페이지 이미지 <small>(JPG · PNG · 여러 장 · 올린 순서대로 위에서 아래로 이어 붙여 보여요)</small></span>
    <Radios cls="vda-dm" name="detailMode" opts={A.DM_OPTS} cur={mode} />
    {im.length ? <ol className="vda-dimg-list">{im.map((x, i) => <li key={i}><span className="vda-dimg-no">{i + 1}</span><Isl html={"<img " + X.imgAttr(x.url, "src") + ' alt="">'} /><span className="vda-dimg-t"><b>{x.name || "상세 이미지 " + (i + 1)}</b><small>{(x.w ? x.w + " × " + x.h + "px · " : "") + (x.size ? (x.size >= 1024 ? (x.size / 1024).toFixed(1) + "MB" : x.size + "KB") : /^idb:/.test(x.url) ? "" : String(x.url).slice(0, 60)) + (x.src && x.part === 1 ? " · 원본 " + x.src : "")}</small></span>
      <span className="vda-dimg-tools"><button type="button" className="a-icon-btn sm" data-action="vda-dimg-move" data-i={i} data-dir="-1" aria-label="위로" disabled={i === 0}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn sm" data-action="vda-dimg-move" data-i={i} data-dir="1" aria-label="아래로" disabled={i === im.length - 1}><Icon n="arrowDown" c="sm" /></button><button type="button" className="a-icon-btn sm" data-action="vda-dimg-del" data-i={i} aria-label="이미지 삭제"><Icon n="trash" c="sm" /></button></span></li>)}</ol>
      : <p className="a-muted vda-dimg-empty"><Icon n="image" c="sm" /> 아직 상세 이미지가 없어요. 지금은 아래 ‘기본 상세’ 소개가 보여요.</p>}
    <div className="vda-dimg-add"><label className="a-btn a-btn-primary a-btn-sm"><Icon n="image" c="sm" />이미지 올리기 (여러 장)<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" multiple data-vda-dimg="" /></label>
      <input className="a-input a-sm" id="vda-dimg-url" placeholder="또는 이미지 주소 https://… 붙여 넣기" aria-label="상세 이미지 주소" /><Btn action="vda-dimg-url" cls="a-btn-ghost a-btn-sm">주소로 추가</Btn></div>
    <Spec title={"권장 가로 " + S.dimg.w + "px · 세로 길이 자유"} body={"JPG · PNG · GIF · 한 장 20MB 이하 · 파일 이름 순서(01.jpg, 02.jpg …)대로 들어가요. 올리면 가로 " + S.dimg.w + "px로 자동으로 맞추고 압축해요. 세로가 " + S.dimg.slice.toLocaleString() + "px보다 긴 이미지는 " + S.dimg.slice.toLocaleString() + "px씩 나눠 빨리 열리게 하고, 화면에서는 한 장처럼 이어져 보여요. 저장을 눌러야 상세 페이지에 반영돼요."} /></div>;
}
/** 커리큘럼 챕터 하나 (강의 줄 · 영상 길이 · 강의 노트 · 수업 자료) */
function Chapter({ c, ci, last }) {
  const A = ADM(), DB = window.DB;
  return <div className="vda-ch"><div className="vda-ch-h"><b>{String(ci + 1).padStart(2, "0")}</b><input className="a-input" name={"ch-" + ci} defaultValue={sv(c.title)} maxLength={60} placeholder="챕터 이름" aria-label={(ci + 1) + "번째 챕터 이름"} />
      <button type="button" className="a-icon-btn" data-action="vda-ch-move" data-ci={ci} data-dir="-1" aria-label="챕터 위로" disabled={ci === 0}><Icon n="arrowUp" c="sm" /></button><button type="button" className="a-icon-btn" data-action="vda-ch-move" data-ci={ci} data-dir="1" aria-label="챕터 아래로" disabled={last}><Icon n="arrowDown" c="sm" /></button><button type="button" className="a-icon-btn" data-action="vda-ch-del" data-ci={ci} aria-label="챕터 지우기"><Icon n="trash" c="sm" /></button></div>
    <div className="vda-ls-head" aria-hidden="true"><span>강의 이름</span><span>분</span><span>영상 주소</span><span>미리보기</span><span></span></div>
    {(c.lessons || []).map((l, li) => { const k = "ls-" + ci + "-" + li;
      return <div key={li} className="vda-ls"><input className="a-input" name={k + "-t"} defaultValue={sv(l.title)} maxLength={80} placeholder="강의 이름" aria-label="강의 이름" /><input className="a-input" name={k + "-m"} defaultValue={sv(l.min || "")} type="number" min="0" max="600" inputMode="numeric" placeholder="분" aria-label="길이(분)" /><input className="a-input" name={k + "-v"} defaultValue={sv(l.video || "")} maxLength={300} placeholder="유튜브 · 비메오 · mp4 주소" aria-label="영상 주소" />
        <label className="vda-pv"><input type="checkbox" name={k + "-p"} defaultChecked={!!l.preview} /><span>미리보기</span></label><button type="button" className="a-icon-btn" data-action="vda-ls-del" data-ci={ci} data-li={li} aria-label="강의 지우기"><Icon n="x" c="sm" /></button>
        <div className="vda-ls-x"><Isl html={DB.vdur.label(l.video, l.durSec, "", "vda-dur")} /><input className="a-input" name={k + "-d"} defaultValue={sv(l.desc || "")} maxLength={500} placeholder="강의 노트 (선택 · 강의 영상 아래에 보여요)" aria-label="강의 노트" /></div>
        <div className="vda-mat"><ul className="a-vl-fl">{(l.files || []).map((x, fi) => <Isl key={fi} html={A.matChip(x, ' data-action="vda-fdel" data-ci="' + ci + '" data-li="' + li + '" data-fi="' + fi + '"')} />)}</ul>
          <div className="a-vl-add"><label className="a-btn a-btn-ghost a-btn-sm"><Icon n="paperclip" c="sm" />수업 자료 올리기<input type="file" className="sr-only" multiple data-vda-up="" data-ci={ci} data-li={li} accept={MAT_ACCEPT} /></label><input className="a-input a-sm" name={k + "-ln"} placeholder="링크 자료 이름" aria-label="링크 자료 이름" /><input className="a-input a-sm" name={k + "-lu"} type="url" placeholder="https://… (구글 드라이브 등)" aria-label="링크 주소" /><Btn action="vda-flink" cls="a-btn-ghost a-btn-sm" data-ci={ci} data-li={li}>링크 추가</Btn></div></div></div>; })}
    <Btn action="vda-ls-add" cls="a-btn-ghost a-btn-sm vda-add" data-ci={ci}><Icon n="plus" c="sm" />강의 추가</Btn></div>;
}

export function VdEditor({ r, n }) {
  const A = ADM(), DB = window.DB, X = A.VX(), V = A.VD(), id = r.parts[2], d = A.vdDraft(id);
  const cph = !d ? "" : d.creatorPhoto === "none" ? "" : d.creatorPhoto || (X && X.extPh ? X.extPh(d.creator) : "");
  if (!d) return <Head title="클래스를 찾을 수 없어요" right={<a className="a-btn a-btn-ghost" href="#/center/master/vod-classes">목록으로</a>} />;
  const isNew = id === "new", kind = A.adKind(d), where = A.adWhere(d), S = A.IMG_SPEC, cur = d.curriculum || [];
  const ls = cur.reduce((a, c) => a + (c.lessons || []).length, 0), mins = cur.reduce((a, c) => a + (c.lessons || []).reduce((b, l) => b + (Number(l.min) || 0), 0), 0);
  const off = X.insOff(), showOff = (d.iid && off.indexOf(d.iid) >= 0) || (!d.iid && d.creator && off.indexOf("ext:" + d.creator) >= 0), tm = d.thumbMeta;
  const sub = isNew ? (d.dupOf ? "‘" + ((A.vdP(d.dupOf) || {}).title || "") + "’의 내용을 그대로 가져왔어요. 아래 노란 칸만 바꾸고 ‘클래스 만들기’를 누르면 새 클래스가 생겨요. (원본은 그대로예요)" : "1번부터 차례로 채우고 저장하면 목록에 생겨요. 처음에는 ‘숨김’으로 저장해 두고, 다 채운 뒤 ‘판매 중’으로 바꾸세요.") : d.title;
  return <Fragment key={n}>
    <div className="vda-top"><a className="a-link" href="#/center/master/vod-classes"><Icon n="arrowLeft" c="xs" /> VOD 클래스 목록</a></div>
    <Head title={isNew ? (d.dupOf ? "복사해서 새로 만들기" : "새 클래스 만들기") : "클래스 세팅"} sub={sub}
      right={<>{isNew ? null : <><Isl html={A.vdStoreBtn("#/vod/p/" + A.esc(id), "판매 페이지 보기")} /><Btn action="vda-dup" cls="a-btn-ghost" data-id={id}><Icon n="layers" c="sm" />복제</Btn></>}<button className="a-btn a-btn-primary" type="submit" form="vda-form"><Icon n="check" c="sm" />저장</button></>} />
    {isNew && d.dupOf ? <div className="vda-dup-note"><Icon n="layers" c="sm" /><div><b>복사본에서 꼭 바꿀 것</b><span>{(X.isEvent(d) ? "클래스 이름 · 강의 일시(비워 뒀어요) · 유튜브 LIVE / Zoom 링크 · 오픈채팅방 링크 · 썸네일 큰 제목" : "클래스 이름 · 썸네일 · 강의 영상 링크 · 가격") + " · 판매 상태는 ‘숨김’으로 시작해요"}</span></div></div> : null}
    <nav className="vda-steps" aria-label="세팅 단계">{NAV.map((x) => <a key={x[0]} href={"#vda-s" + x[0]} data-action="vda-jump" data-to={"vda-s" + x[0]}><b>{x[0]}</b>{x[1]}</a>)}</nav>
    <div className="vda-edit"><form id="vda-form" className="a-form vda-form" data-id={id} data-type={kind} data-where={where} noValidate>
      <Sec no={1} t="기본 정보" sub="스토어 카드와 상세 페이지 맨 위에 보여요.">
        <Fd n="title" label={<>클래스 이름 <small>(필수)</small></>} val={d.title} at={{ maxLength: 60, placeholder: "예) 해외 건기식 브랜드, 재고 없이 0원으로 런칭하는 법" }} />
        <Fd n="sub" label="한 줄 소개" val={d.sub} at={{ maxLength: 80, placeholder: "상세 페이지 소개 첫 줄 · 검색에도 쓰여요" }} />
        <div className="a-field"><span className="a-label">상품 종류</span><Radios cls="vda-types" name="type" opts={TYPES} cur={kind} /><small className="a-muted">DOOGO CLASS는 VOD · 전자책이 중심이에요. LIVE 무료강의는 스토어 ‘무료 LIVE’에, 온/오프라인 강의는 ‘프리미엄 강의’에 보여요 (판매 영역을 켰을 때).</small></div>
        <Row><div className="a-field"><label htmlFor="vda-cat">카테고리</label><select className="a-input" id="vda-cat" name="cat" defaultValue={V.cats.some((c) => c.key === d.cat) ? d.cat : (V.cats[0] || {}).key}>{V.cats.map((c) => <option key={c.key} value={c.key}>{c.label + (c.on === false ? " (숨김)" : "")}</option>)}</select></div>
          <Fd n="level" label="난이도" val={d.level} at={{ maxLength: 20, placeholder: "입문 · 초급 · 중급" }} /></Row>
        <Row><div className="a-field"><label htmlFor="vda-iid">강사 (정산 받는 사람)</label><select className="a-input" id="vda-iid" name="iid" defaultValue={DB.data.instructors.some((x) => x.id === d.iid) ? d.iid : ""}><option value="">외부 크리에이터 (강사 플랫폼 없음)</option>
            {DB.data.instructors.filter((x) => x.status !== "removed" || x.id === d.iid).map((x) => <option key={x.id} value={x.id}>{(A.vdName(x.id) !== x.displayName ? A.vdName(x.id) + " · 두잉고 " + x.displayName : x.displayName) + " (" + x.name + ")" + (DB.tracksOf(x).vod ? "" : " · DOOGO CLASS 잠김")}</option>)}</select><small className="a-muted">두잉고 강사를 고르면 그 강사센터 ‘내 VOD 판매’에 판매 · 정산이 보여요.</small></div>
          <Fd n="creator" label="크리에이터 표시 이름" val={d.creator} at={{ maxLength: 20, placeholder: "비우면 강사 이름" }} /></Row>
        <div className="a-field vda-cph"><label htmlFor="vda-cph-file">강사 사진 <small>두잉고 계정이 없는 강사(예: 셀러훈)용 · 강사진 · 썸네일 · 강사 소개에 나와요. 두잉고 강사는 강사센터 브랜드 사진을 써요</small></label><div className="vda-cph-row"><span className="vda-cph-prev">{cph ? <img src={cph} alt="" /> : <em>사진 없음</em>}</span><input className="a-input" id="vda-cph-file" type="file" accept="image/jpeg,image/png,image/webp" data-vda-img="creatorPhoto" />
          {cph ? <Btn action="vda-cph-del" cls="a-btn-ghost a-btn-sm"><Icon n="trash" c="sm" />사진 지우기</Btn> : null}{cph && !d.creatorPhoto ? <small className="a-muted">두고클래스가 넣어 둔 기본 사진이에요. 새 사진을 올리면 바뀌어요.</small> : null}</div></div>
        <div className="a-field"><span className="a-label">판매 상태</span><Radios name="status" opts={STATUS} cur={d.status} /></div>
        <Fd n="openAt" label={<>오픈 예정일 <small>(‘오픈 예정’일 때 썸네일 · 카드에 보여요)</small></>} val={d.openAt} at={{ type: "date" }} />
        <div className="a-field"><span className="a-label">배지 <small>(카드 · 상세 가격 아래 · BEST 파랑 · NEW 주황 · 업데이트 레드)</small></span><div className="vda-checks">{BADGES.map((b) => <label key={b[0]} className="a-check"><input type="checkbox" name="badge" value={b[0]} defaultChecked={(d.badges || []).indexOf(b[0]) >= 0} /><span>{b[1]}</span></label>)}</div></div>
        <Fd n="updatedAt" label={<>최근 업데이트일 <small>(30일 동안 ‘업데이트’ 배지가 자동으로 붙어요)</small></>} val={d.updatedAt} at={{ type: "date" }} />
      </Sec>
      <Sec no={2} t="가격 · 수강 기간 · 정산" sub="할인 마감일이 지나면 자동으로 정가로 팔려요. 0원이면 무료 특강이에요.">
        <p className="vda-tf vda-tf-free"><Icon n="video" c="sm" /> LIVE 무료강의는 0원이에요. 가격은 아래 ‘LIVE가 끝나면 → 유료 강의로 이어 팔기’에서 얼리버드로 정해요.</p>
        <Row cls="vda-paid"><Fd n="price" label="정가 (원)" val={d.price} at={num({ min: 0, step: 1000 })} /><Fd n="sale" label="할인가 (원)" val={d.sale == null ? "" : d.sale} at={num({ min: 0, step: 1000, placeholder: "할인 없으면 비워 두세요" })} /></Row>
        <Row cls="vda-paid"><Fd n="saleEnd" label="할인 마감일" val={d.saleEnd} at={{ type: "date" }} help="비우면 할인이 계속돼요" /><Fd n="accessDays" label={<>무료 특강 수강 기간 (일) <small>VOD · 0원일 때만</small></>} val={d.accessDays == null ? "" : d.accessDays} at={num({ min: 1, max: 3650, placeholder: "비우면 기간 제한 없음" })} help="유료 VOD는 아래 수강권(180일 · 365일 · 3년)으로 팔고, 이 칸은 무료 특강에만 써요. 예전 주문(수강권 선택 전)도 이 기간으로 계산해요." /></Row>
        <PlanFields d={d} />
        <div className="vda-tf vda-tf-ebook"><Row><Fd n="pages" label="전자책 분량 (쪽)" val={d.pages} at={num({ min: 1, max: 2000 })} /><Fd n="format" label="파일 형식" val={d.format || "PDF"} at={{ maxLength: 10 }} /></Row>
          <Fd n="file" label="내려받기 파일 주소" val={d.file} at={{ maxLength: 400, placeholder: "https://… (구글 드라이브 · 드롭박스 공유 링크 등)" }} help="구매한 회원에게만 마이페이지 › 전자책에 보여요. 비우면 ‘준비 중’ 안내가 떠요." />
          <div className="vda-pdf">{isNew ? <small className="a-muted"><Icon n="alert" c="xs" /> PDF 파일은 클래스를 한 번 저장한 뒤에 올릴 수 있어요 (산 회원만 받게 클래스에 묶어 둬요).</small>
            : <><label className="a-btn a-btn-ghost a-btn-sm"><Icon n="upload" c="sm" />PDF 파일 올리기<input type="file" className="sr-only" accept="application/pdf,.pdf" data-vda-pdf={id} /></label><small className="a-muted">{(DB.remote && DB.remote.on ? "3MB" : "20MB") + " 이하 PDF는 여기서 바로 올려요. 올린 파일은 산 회원만 받을 수 있고, 내려받으면 주문에 ‘내려받음’이 남아 바로 취소가 막혀요. 더 큰 파일은 공유 링크를 위 칸에 넣어 주세요."}</small></>}</div></div>
        <div className="vda-tf vda-tf-book"><p className="vda-tf-h"><Icon n="truck" c="sm" />종이책 정보 <small>택배로 보내는 실물 도서 · 스토어 ‘전자책’ 메뉴에 함께 보여요</small></p>
          <Row><Fd n="author" label="저자" val={d.author || ""} at={{ maxLength: 30, placeholder: "비우면 크리에이터 이름" }} /><Fd n="publisher" label="출판사" val={d.publisher || ""} at={{ maxLength: 30 }} /></Row>
          <Row><Fd n="bpages" label="쪽수" val={d.type === "book" ? d.pages || "" : ""} at={num({ min: 1, max: 3000, placeholder: "예) 280" })} /><Fd n="bsize" label="판형" val={d.size || ""} at={{ maxLength: 30, placeholder: "예) 152 × 225mm" }} /></Row>
          <Row><Fd n="bpubDate" label="출간일" val={d.pubDate || ""} at={{ type: "date" }} /><Fd n="bisbn" label="ISBN" val={d.isbn || ""} at={{ maxLength: 20, inputMode: "numeric", placeholder: "출판사에서 받으면 적어요" }} /></Row>
          <Row><Fd n="shipFee" label="배송비 (원 · 주문마다 한 번)" val={d.shipFee == null ? 0 : d.shipFee} at={num({ min: 0, step: 500 })} help="0원이면 ‘무료배송’으로 보여요" /><Fd n="stock" label="재고 (권)" val={d.stock == null ? "" : d.stock} at={num({ min: 0, placeholder: "비우면 제한 없음" })} help="남은 권수가 0이 되면 ‘품절’로 바뀌고 살 수 없어요 (입금 대기 주문도 1권으로 세요)" /></Row>
          <div className="a-field vda-cover"><label htmlFor="vda-cover-file">표지 이미지 <small>스토어 카드 · 상세 맨 위에 책으로 세워 보여요 (세로 표지 그대로)</small></label><div className="vda-cph-row"><span className="vda-cover-prev">{d.cover ? <Isl html={"<img " + X.imgAttr(d.cover, "src") + ' alt="">'} /> : <em>표지 없음</em>}</span><input className="a-input" id="vda-cover-file" type="file" accept="image/jpeg,image/png,image/webp" data-vda-img="cover" />
            {d.cover ? <Btn action="vda-img-del" cls="a-btn-ghost a-btn-sm" data-k="cover"><Icon n="trash" c="sm" />표지 지우기</Btn> : null}</div></div>
          <p className="vda-book-law"><Icon n="alert" c="xs" /><span><b>도서정가제</b> 할인가는 정가의 90% 이상으로만 정할 수 있고(최대 10% 할인), 종이책에는 ‘종이책’을 고른 책 전용 쿠폰만 적용돼요(할인가와 합쳐 정가의 10%까지). 포인트는 쓸 수 있어요.</span></p>
          {showOff ? <label className="a-check vda-showoff"><input type="checkbox" name="showOff" defaultChecked={!!d.showOff} /><span>이 강사는 스토어 노출이 꺼져 있어요. 이 상품만은 스토어에 보이기</span></label> : null}</div>
        <div className="vda-tf vda-tf-event"><Row><Fd n="eventAt" label="강의 일시" val={d.eventAt} at={{ type: "datetime-local" }} /><Fd n="eventMin" label="진행 시간 (분)" val={d.eventMin} at={num({ min: 10, max: 1440 })} /></Row>
          <Row><Fd n="seats" label="정원 (명)" val={d.seats} at={num({ min: 0, max: 10000, placeholder: "비우면 제한 없음" })} help="입금 대기 주문도 자리를 차지해요." /><Fd n="replayDays" label="다시보기 제공 (일)" val={d.replayDays} at={num({ min: 0, max: 365, placeholder: "없으면 비워 두세요" })} /></Row>
          <div className="vda-tf vda-tf-onoff"><span className="a-label">진행 방식</span><Radios name="where" opts={WHERE} cur={where} /></div>
          <div className="vda-tf vda-tf-live"><div className="a-field"><label htmlFor="vda-via">진행 방식</label><select className="a-input" id="vda-via" name="via" defaultValue={d.via === "zoom" ? "zoom" : "youtube"}><option value="youtube">유튜브 라이브 (오픈채팅방으로 모아서 진행 · 추천)</option><option value="zoom">Zoom 실시간</option></select></div>
            <Fd n="ytLive" label="유튜브 라이브 링크" val={d.ytLive || ""} at={{ maxLength: 300, placeholder: "https://www.youtube.com/live/…" }} help="강의 날부터 신청자 마이페이지에 ‘라이브 보기’ 버튼으로 열려요. 끝나면 다시보기 링크로 바꿔 두세요." /></div>
          <div className="vda-tf vda-tf-zoom"><Fd n="link" label="Zoom 입장 링크 (Zoom으로 진행할 때)" val={d.link} at={{ maxLength: 300, placeholder: "https://zoom.us/j/…" }} help="신청한 회원에게만 시작 10분 전부터 버튼으로 열려요." /><Fd n="replayUrl" label="다시보기 영상 링크 (끝난 뒤)" val={d.replayUrl || ""} at={{ maxLength: 300, placeholder: "https://vimeo.com/… · https://youtu.be/…" }} help="넣으면 끝난 뒤 ‘다시보기 제공 (일)’ 동안 신청자 마이페이지 · 입장 안내에 버튼이 열려요." /></div>
          <Fd n="kakao" label="카카오톡 오픈채팅방 링크 (LIVE 무료강의 · 온/오프라인 공통)" val={d.kakao || ""} at={{ maxLength: 300, placeholder: "https://open.kakao.com/o/…" }} help="신청(결제)한 회원에게만 ‘오픈채팅 입장’ 버튼으로 보여요. 오픈채팅방에서 공지 · 유튜브 라이브 링크 · 장소를 알려요." />
          <FunnelFields d={d} />
          <div className="vda-tf vda-tf-offline"><Fd n="place" label="장소" val={d.place} at={{ maxLength: 120, placeholder: "서울 강남구 테헤란로 … (자세한 주소는 신청 후 안내)" }} /></div></div>
        <Row><Fd n="share" label="강사 정산 비율 (%)" val={d.share == null ? "" : d.share} at={num({ min: 0, max: 100, placeholder: "비우면 강사별 비율 (" + (d.iid ? X.rateOf(d.iid).vod : V.settings.share) + "%)" })} help="이 강의만 따로 정할 때 · 비우면 강사별 확정 비율" /><Fd n="base" label="기존 수강생 수 (표시용)" val={d.base || ""} at={num({ min: 0, placeholder: "0" })} help="다른 곳에서 판매한 인원을 더해 보여 줄 때" /></Row>
      </Sec>
      <Sec no={3} t="썸네일" sub="사진을 올리면 그 사진으로, 없으면 어두운 바탕 + 강조 띠 + 큰 제목(마지막 줄 포인트 색) + 강사 사진으로 자동으로 만들어요. 스토어 카드 · 상세 맨 위 · 내 강의실에 모두 16:9로 보여요.">
        <div className="vda-thumb-row"><Isl html={'<div class="vda-thumb-prev" id="vda-thumb-prev">' + A.vdThumb(d, "lg") + "</div>"} /><div className="vda-thumb-f">
          <div className="a-field"><label htmlFor="vda-thumb-file">썸네일 사진 올리기</label><input className="a-input" id="vda-thumb-file" type="file" accept="image/jpeg,image/png,image/webp" data-vda-img="thumb" />{d.thumb ? <Btn action="vda-img-del" cls="a-btn-ghost a-btn-sm" data-k="thumb"><Icon n="trash" c="sm" />사진 지우고 자동 썸네일 쓰기</Btn> : null}</div>
          <Spec title={"권장 " + S.thumb.w + " × " + S.thumb.h + "px (16:9)"} body={"JPG · PNG · WebP · 20MB 이하 · 다른 크기로 올려도 가운데를 기준으로 16:9로 잘라 " + S.thumb.w + " × " + S.thumb.h + "px로 자동으로 맞추고 압축해요. 글자 · 얼굴은 가장자리에서 10% 안쪽에 두세요. 최소 " + S.thumb.min.join(" × ") + "px"}
            extra={d.thumb && tm ? <em className={"vda-spec-r" + (tm.small ? " warn" : "")}><Icon n={tm.small ? "alert" : "check"} c="xs" />{" 원본 " + tm.src + " → " + tm.w + " × " + tm.h + "px · " + (tm.size >= 1024 ? (tm.size / 1024).toFixed(1) + "MB" : tm.size + "KB") + (tm.small ? " · 원본이 작아 흐려 보일 수 있어요" : "")}</em> : null} />
          <Row><Fd n="c1" label="바탕색" val={(d.color || [])[0] || "#1c1c1e"} at={{ type: "color" }} /><Fd n="c2" label="포인트 색" val={(d.color || [])[1] || "#ff3b3b"} at={{ type: "color" }} /></Row>
          <div className="vda-accs" role="group" aria-label="포인트 색 고르기">{X.ACC.map((c) => <button key={c} type="button" className="vda-acc" style={{ "--c": c }} data-action="vda-acc" data-c={c} aria-label={"포인트 색 " + c}></button>)}</div>
          <Row><Fd n="hook" label="강조 띠 문구" val={d.hook} at={{ maxLength: 20, placeholder: "예) 재고 0원 · 사업자 없이 시작" }} /><Fd n="tagline" label="강사 한 줄 소개" val={d.tagline} at={{ maxLength: 24, placeholder: "예) 뉴질랜드 건기식 브랜드 대표" }} /></Row>
          <Ta n="thumbText" label={<>썸네일 큰 제목 <small>(두 줄 · 둘째 줄은 포인트 색)</small></>} val={d.thumbText} rows={2} ph={"예) 건기식 브랜드\n0원 런칭"} />
          <Fd n="teaser" label={<>상세 맨 위 영상 <small>(유튜브 · 비메오 · mp4 주소 · 비우면 이 썸네일)</small></>} val={d.teaser || ""} at={{ maxLength: 300, inputMode: "url", placeholder: "https://www.youtube.com/watch?v=…" }} help="넣으면 상세 맨 위에 이 영상이 소리 끈 채로 저절로 반복 재생돼요 (탈잉처럼 · PC는 왼쪽 위 · 휴대폰은 맨 위). 주소에 시작 시각(&t=1558s)이 있으면 그때부터 재생해요." />
          <label className="a-check"><input type="checkbox" name="teaserOff" defaultChecked={!!d.teaserOff} /><span>상세 맨 위 영상 잠깐 끄기 <small className="a-muted">주소는 두고 썸네일만 보여요</small></span></label>
        </div></div>
      </Sec>
      <Sec no={4} t="상세페이지 · 클래스 소개" sub="상세페이지 이미지(JPG)를 올리면 ‘강의 소개’에 크게 이어 붙여 보여요. 이미지 없이 쓰면 이 순서로 보여요: 큰 제목 → 고민 말풍선 → POINT(배워요) → 강의 전/후 → 추천 대상 → 상세 소개. ‘미리보기’를 켠 강의는 상세 ‘미리보기’ 칸에 모여요.">
        <DimgBlock d={d} />
        <Ta n="headline" label={<>소개 큰 제목 <small>(두 줄 · 둘째 줄은 포인트 색 · 어두운 띠에 보여요)</small></>} val={d.headline} rows={2} ph={"예) 해외 건기식 브랜드,\n0원으로 여는 법 알려드릴게요."} />
        <Ta n="pains" label={<>이런 고민, 있으셨죠? <small>(한 줄에 하나 · 말풍선으로 보여요 · 비우면 기본 문구)</small></>} val={(d.pains || []).join("\n")} rows={3} ph="해외 소싱, 어디부터 연락해야 할지 모르겠어요" />
        <Ta n="pitch" label={<>강의 소개 글 <small>(상세 맨 위 제목 아래 · 위 ‘고민’ 문장을 따옴표로 앞에 붙여 보여요 · 비우면 한 줄 설명)</small></>} val={d.pitch || ""} rows={5} help="‘그런 분들을 위해 OOO가 …을 공개합니다!’처럼 고민 → 해결 → 보너스 → 한마디 순서로 쓰면 좋아요." ph="그런 분들을 위해 문대표가 재고 없이 0원으로 첫 브랜드를 런칭하는 전 과정을 공개합니다!" />
        <Fd n="tags" label={<>해시태그 <small>(쉼표로 나눠요 · 최대 6개)</small></>} val={(d.tags || []).join(", ")} at={{ maxLength: 120, placeholder: "해외소싱, 건기식브랜드, 스마트스토어" }} />
        <Row><Ta n="before" label={<>강의 전 <small>(BEFORE · 한 줄에 하나)</small></>} val={(d.before || []).join("\n")} rows={3} ph="연락할 공급처 0곳" /><Ta n="after" label={<>강의 후 <small>(AFTER · 비우면 ‘배워요’ 앞 3개)</small></>} val={(d.after || []).join("\n")} rows={3} ph="연락할 공급처 리스트 20곳" /></Row>
        <Ta n="who" label={<>이런 분들께 추천드려요 <small>(한 줄에 하나 · 상세 위쪽 체크 목록 · [21일만에]처럼 대괄호로 시작하면 굵게)</small></>} val={(d.who || []).join("\n")} rows={5} help="상세 페이지 맨 위 ‘강의 정보’ 아래에 체크 표시와 함께 보여요." ph="[초급자] 월 100만~300만 원 정도 벌고 싶은 분" />
        <Ta n="comment" label={<>강사 코멘트 <small>(‘이런 분들께 추천드려요’ 옆 회색 상자 · 비우면 숨겨요)</small></>} val={d.comment != null ? d.comment : (X.cmtOf ? X.cmtOf(d) : "")} rows={4} help="강사님 말투로 2~3문장. 길면 상세에서 4줄까지 보이고 ‘더보기’로 펼쳐져요." ph="이커머스를 배우고 싶다면 함께하세요. 아무것도 몰라도 상관없어요." />
        <Fd n="updNote" label={<>업데이트 약속 문구 <small>(‘최근 업데이트일’이 있으면 초록 상자로 보여요)</small></>} val={d.updNote || ""} at={{ maxLength: 80, placeholder: "새로운 방법이 나오면 강의와 자료를 무조건 업데이트해 드려요." }} />
        <Ta n="learn" label={<>이 클래스에서 배워요 <small>(한 줄에 하나)</small></>} val={(d.learn || []).join("\n")} rows={4} ph="해외 공급처를 찾고 첫 연락을 보내는 법" />
        <Ta n="intro" label="상세 소개" val={d.intro} rows={6} help="빈 줄로 문단을 나눠요." />
        <Ta n="creatorBio" label="크리에이터 소개" val={d.creatorBio} rows={3} help="비우면 기본 문구가 보여요." />
      </Sec>
      <Sec no={5} t="커리큘럼 · 목차 · 진행 순서" sub={"챕터 " + cur.length + "개 · 강의 " + ls + "개 · 총 " + X.durTxt(mins) + " · 영상은 유튜브(일부 공개) · 비메오(vimeo.com/숫자 또는 비공개 링크) · mp4 주소를 넣어요. ‘미리보기’를 켠 강의는 구매 전에도 볼 수 있어요. 전자책은 ‘분’ 칸에 쪽수, LIVE · 오프라인은 진행 순서를 적어요."}>
        {cur.map((c, ci) => <Chapter key={ci} c={c} ci={ci} last={ci === cur.length - 1} />)}
        <Btn action="vda-ch-add" cls="a-btn-outline a-btn-block"><Icon n="plus" c="sm" />챕터 추가</Btn>
      </Sec>
      <Sec no={6} t="자주 묻는 질문" sub="비워 두면 수강 기간 · 기기 안내가 기본으로 보여요.">
        {(d.faq || []).map((q, i) => <div key={i} className="vda-fq"><div className="vda-fq-in"><input className="a-input" name={"fq-" + i + "-q"} defaultValue={sv(q[0] || "")} maxLength={100} placeholder="질문" aria-label="질문" /><textarea className="a-input" name={"fq-" + i + "-a"} rows={2} maxLength={500} placeholder="답변" aria-label="답변" defaultValue={sv(q[1] || "")} /></div><button type="button" className="a-icon-btn" data-action="vda-fq-del" data-i={i} aria-label="질문 지우기"><Icon n="trash" c="sm" /></button></div>)}
        <Btn action="vda-fq-add" cls="a-btn-outline a-btn-block"><Icon n="plus" c="sm" />질문 추가</Btn>
      </Sec>
      {/* 저장할 때 빠진 칸 안내는 예전 코드가 이 칸에 글자만 넣어요 */}
      <p className="a-error" id="vda-error"></p>
      <div className="vda-bar">{isNew ? null : <Btn action="vda-del" cls="a-btn-ghost vda-del" data-id={id}><Icon n="trash" c="sm" />클래스 삭제</Btn>}<a className="a-btn a-btn-ghost" href="#/center/master/vod-classes">취소</a><button className="a-btn a-btn-primary" type="submit"><Icon n="check" c="sm" />{isNew ? "클래스 만들기" : "저장"}</button></div>
    </form><aside className="vda-side"><Isl html={'<div class="vda-prev" id="vda-prev">' + A.vdPrevHtml(d) + "</div>"} /></aside></div>
  </Fragment>;
}
