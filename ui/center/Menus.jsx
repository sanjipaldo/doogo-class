"use client";
/* 수강생 화면 메뉴 구성 — 마스터 ‘메뉴 · 색상 설정’ #/center/master/menus · 강사센터 ‘메뉴 구성’ #/center/menus
 * 예전 admin.js pageMasterMenus · pageMenus · sidebarPreview 를 React 로 (Next.js 전환 6단계)
 *  · 더하기 · 빼기 · 옮기기 · 이름 바꾸기 · 자료실 칩 · 색상 고르기는 예전 admin.js 이벤트가 그대로 받아요 (색상 고르기는 예전 조각 themePicker) */
import Icon from "../lib/Icon.jsx";
import { ADM, DBX, Btn, Head, Empty, Isl } from "./bits.jsx";

function SidebarPreview({ mid }) {
  const DB = DBX(), sp = DB.splitMid(mid), m = DB.menuConfig(mid), c = DB.content(sp.iid), t = DB.themeOf(c.brand.theme);
  const def = (key) => (sp.vod ? DB.VOD_MENUS : DB.STUDENT_MENUS).find((d) => d.key === key);
  return <ul className="a-sidebar-preview" style={{ "--p": t.pale, "--pd": t.deep }}>{m.items.filter((x) => x.on).map((x, i) => {
    const d = def(x.key), name = x.label || (d ? (x.key === "bot" ? c.brand.botName : d.label) : "추가 메뉴");
    return <li key={x.key} className={i === 0 ? "on" : undefined}><Icon n={d ? d.icon : x.icon || "file"} c="sm" /><span>{name}</span>{x.type === "link" ? <Icon n="arrowUpRight" c="xs" /> : null}</li>; })}</ul>;
}
export function Menus({ r, own }) {
  const A = ADM(), DB = DBX(), ui = A.ui, list = DB.data.instructors;
  if (r && r.params && r.params.get("ins")) ui.mMenuIns = r.params.get("ins");
  if (!ui.mMenuIns || !DB.instructor(DB.splitMid(ui.mMenuIns).iid)) ui.mMenuIns = list[0] && list[0].id;
  const mid = ui.mMenuIns, isV = DB.splitMid(mid).vod, ins = DB.instructor(DB.splitMid(mid).iid);
  if (!ins) return <><Head title="메뉴 · 색상 설정" sub="" /><section className="a-card"><Empty ic="store">강사 플랫폼을 먼저 만들어 주세요.</Empty></section></>;
  const m = DB.menuConfig(mid), c = DB.content(ins.id);
  const def = (key) => (isV ? DB.VOD_MENUS : DB.STUDENT_MENUS).find((d) => d.key === key);
  const nameOf = (x) => x.label || (def(x.key) ? (x.key === "bot" ? c.brand.botName : def(x.key).label) : "추가 메뉴");
  const iconOf = (x) => (def(x.key) ? def(x.key).icon : x.icon || "file");
  const onItems = m.items.filter((x) => x.on), offItems = m.items.filter((x) => !x.on);
  const Row = ({ x, i }) => { const custom = DB.isCustom(x.key); return <li className="a-menu-row"><span className="a-menu-move"><button className="a-icon-btn sm" data-action="menu-move" data-key={x.key} data-dir="-1" aria-label="위로" disabled={i === 0 || undefined}><Icon n="arrowUp" c="sm" /></button><button className="a-icon-btn sm" data-action="menu-move" data-key={x.key} data-dir="1" aria-label="아래로" disabled={i === onItems.length - 1 || undefined}><Icon n="arrowDown" c="sm" /></button></span>
    <span className="a-menu-ico"><Icon n={iconOf(x)} c="sm" /></span>
    <div className="a-menu-main"><input key={x.label || ""} className="a-input a-sm a-menu-label" data-key={x.key} defaultValue={x.label || ""} placeholder={nameOf(Object.assign({}, x, { label: "" }))} aria-label="메뉴 이름" />
      <small>{custom ? (x.type === "link" ? "외부 링크 · " + (x.url || "") : "추가 메뉴 · 강사가 내용 작성") : "기본 메뉴" + (x.key === "home" ? " · 항상 보여요" : "")}</small>
      {x.key === "library" ? <div className="a-lib-chips">{DB.LIB_MENUS.map((l) => { const on = m.library[l.key] !== false; return <button key={l.key} type="button" className={"a-chip-toggle" + (on ? " on" : "")} data-action="lib-toggle" data-k={l.key}><Icon n={on ? "check" : "plus"} c="xs" />{l.label}</button>; })}</div> : null}</div>
    {custom ? <button className="a-icon-btn sm" data-action="menu-edit" data-key={x.key} aria-label="수정"><Icon n="pen" c="sm" /></button> : null}
    {x.key === "home" ? <span className="a-pm locked" title="홈은 뺄 수 없어요"><Icon n="lock" c="sm" /></span> : <button className="a-pm minus" data-action="menu-off" data-key={x.key} aria-label={nameOf(x) + " 빼기"}><Icon n="minus" c="sm" /></button>}</li>; };
  return <>
    {own ? <Head title={isV ? "VOD 버전 메뉴 구성" : "메뉴 구성"} sub={isV ? "DOOGO CLASS에서 VOD를 산 수강생이 보는 왼쪽 메뉴예요. 꼭 필요한 메뉴만 켜 두세요. 주차별 강의 · 라이브 다시보기 · 과제 · 모범 과제 · 수업 캘린더 · 수료증은 VOD 버전에 없어요." : "수강생 화면 왼쪽 메뉴를 더하고(＋) 빼고(−), 이름과 순서를 바꿔요. 필요한 페이지나 링크 메뉴도 새로 만들 수 있어요. 바꾸면 바로 저장돼요."} right={<Btn action="preview" cls="a-btn-outline"><Icon n="eye" c="sm" />{isV ? "VOD 수강생 화면" : "수강생 화면"}</Btn>} />
      : <><Head title="메뉴 · 색상 설정" sub="강사와 협의한 대로 수강생 화면의 메뉴를 더하고(＋) 빼고(−), 이름과 순서, 화면 색상을 정해요. 바꾸면 바로 저장돼요. 오른쪽 미리보기로 바뀐 강의실을 바로 확인해요." right={<Isl html={A.dgSplitBtn("room:" + ins.id, "강의실 미리보기")} />} />
        <section className="a-card a-menu-top"><label className="a-label" htmlFor="m-menu-ins">강사 플랫폼</label><select key={ins.id} className="a-input" id="m-menu-ins" defaultValue={ins.id}>{list.map((x) => <option key={x.id} value={x.id}>{x.displayName + " · " + x.name}</option>)}</select><Btn action="m-preview" cls="a-btn-outline a-btn-sm" data-id={ins.id}><Icon n="eye" c="sm" />수강생 화면</Btn></section></>}
    <div className="a-menu-grid">
      <div className="a-stack">
        <section className="a-card"><div className="a-card-head"><h2>수강생에게 보이는 메뉴</h2><span className="a-muted">{onItems.length}개</span></div><ul className="a-menu-list">{onItems.map((x, i) => <Row key={x.key} x={x} i={i} />)}</ul></section>
        <section className="a-card"><div className="a-card-head"><h2>더할 수 있는 메뉴</h2><span className="a-muted">{offItems.length}개</span></div>
          {offItems.length ? <ul className="a-menu-list off">{offItems.map((x) => <li key={x.key} className="a-menu-row"><span className="a-menu-ico"><Icon n={iconOf(x)} c="sm" /></span><div className="a-menu-main"><b>{nameOf(x)}</b><small>{DB.isCustom(x.key) ? "추가 메뉴" : "기본 메뉴"}</small></div>
            {DB.isCustom(x.key) ? <button className="a-icon-btn sm" data-action="menu-delete" data-key={x.key} aria-label="삭제"><Icon n="trash" c="sm" /></button> : null}<button className="a-pm plus" data-action="menu-on" data-key={x.key} aria-label={nameOf(x) + " 더하기"}><Icon n="plus" c="sm" /></button></li>)}</ul> : <p className="a-muted a-pad">모든 기본 메뉴가 켜져 있어요.</p>}
          <div className="a-card-foot"><Btn action="menu-new" cls="a-btn-primary a-btn-sm" data-type="page"><Icon n="plus" c="sm" />새 메뉴 만들기 (페이지)</Btn><Btn action="menu-new" cls="a-btn-ghost a-btn-sm" data-type="link"><Icon n="link" c="sm" />외부 링크 메뉴</Btn></div></section>
      </div>
      <div className="a-stack">
        <section className="a-card"><div className="a-card-head"><h2>수강생 화면 색상</h2>{own ? <span className="a-muted">LIVE · VOD 버전이 함께 써요</span> : null}</div><form id="m-theme-form"><Isl html={A.themePicker(c.brand.theme, "mtheme", ins.id)} /></form></section>
        {own ? <p className="a-hint"><Icon n="star" c="xs" /> 새로 만든 페이지 메뉴의 내용은 ‘추가 메뉴’에서 채워요.</p> : null}
        <section className="a-card"><div className="a-card-head"><h2>메뉴 미리보기</h2></div><SidebarPreview mid={mid} /></section>
        <p className="a-hint"><Icon n="alert" c="xs" /> 메뉴를 빼도 강사가 올린 내용은 지워지지 않아요. 다시 더하면 그대로 돌아와요.</p>
      </div>
    </div>
  </>;
}
/** 강사센터 ‘메뉴 구성’ — 내 플랫폼(LIVE · VOD 버전) 메뉴 */
export function InsMenus() {
  const A = ADM();
  A.ui.mMenuIns = A.MID();
  return <Menus r={{ params: new URLSearchParams() }} own />;
}
