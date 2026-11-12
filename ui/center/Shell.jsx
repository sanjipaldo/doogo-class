"use client";
/* 강사센터 · 코치센터 · 마스터 · 패밀리센터 · 온드미디어 센터 틀 (예전 admin.js renderShell0 을 React 로 — Next.js 전환 6단계)
 *  · 머리띠(로고 · 미리보기 · 알림 · 계정 · 로그아웃) · 왼쪽 메뉴(관리 영역 탭 · 메뉴 묶음 · 안내 카드) · 휴대폰 아래 메뉴 · 본문
 *  · 메뉴 열기/닫기 · 탭 · 로그아웃 · 미리보기 같은 버튼은 예전 admin.js 이벤트가 받아요 (data-action) */
import Icon from "../lib/Icon.jsx";
import { RawOne } from "../lib/Raw.jsx";
import { ADM, DBX, Btn, Isl } from "./bits.jsx";

function Bell({ partner, master, PM }) {
  const A = ADM();
  let n = 0, href = "", tip = "";
  if (partner) { const ni = A.affInqNew(PM), nn = A.affNoticeNew(PM); n = ni + nn; href = ni || !nn ? "#/center/partner/inquiries" : "#/center/partner/notices"; tip = n ? "입점 문의 새 소식 " + ni + "건 · 새 공지 " + nn + "건" : "새 알림이 없어요"; }
  else if (master && A.staffCan("master/partners")) { const a = A.masterInqAlerts(); n = a.inq + a.msg; href = "#/center/master/partners"; tip = n ? "패밀리 새 메시지 " + a.msg + "건 · 새 입점 문의 " + a.inq + "건" : "새 알림이 없어요"; }
  if (!href) return null;
  return <a className={"a-bell" + (n ? " on" : "")} href={href} title={tip} aria-label={"알림: " + tip} data-action={master && n ? "bell-go" : undefined}><Icon n="bell" c="sm" />{n ? <b>{n > 99 ? "99+" : n}</b> : null}</a>;
}

export default function Shell({ r, children, pageHtml }) {
  const A = ADM(), DB = DBX(), S = A.S();
  const partner = S.role === "partner", PM = partner ? A.affOf(S.partnerId) : null, media = S.role === "media", MDM = media ? A.mdMe() : null, master = S.role === "master" && !S.actingAs;
  const groups = partner ? A.partnerNav() : media ? A.mediaNav() : master ? A.masterNav() : A.instructorNav();
  const cur = (master ? r.parts.slice(0, 2) : r.parts).join("/"), curKey = master || partner || media ? cur || (partner ? "partner" : media ? "media" : "master") : r.parts[0] || "";
  const ins = master || partner || media ? null : A.INS(), coach = A.isCoach(), vod = A.TRK() === "vod", dcL = master ? A.MT() === "dc" : !!ins && vod; // 관리 영역 탭이 DOOGO CLASS 면 로고도 DOOGO CLASS (2026-11-06)
  if (ins && vod && A.VPID()) DB.vodEnsure(ins.id, A.VPID());
  const co = ins ? DB.currentCohort(ins.id) : null, many = ins && coach && A.myCoachCourses().length > 1;
  const st = A.staffMe();
  const u = partner ? [PM.name, "영업 패밀리", "handshake", "pt"] : media ? [A.mdName(MDM), "온드미디어 · RS " + A.mdRate(MDM) + "%", "monitorPlay", "pt"] : S.role === "master" ? (st ? [st.name, A.staffRoleName(st) + " · 운영자", "shieldCheck", "ms st"] : ["ADMIN", master ? "마스터 관리자" : "마스터 · 대신 보기", "shieldCheck", "ms"]) : coach ? [(A.ME_COACH() || {}).name || "코치", "코치", "checks", "co"] : [ins.name, "강사", "user", "in"];
  const tOth = (vod ? [["#/center", "grid", "대시보드"], ["#/center/vod-students", "users", "VOD 수강생"], ["#/center/vod", "monitorPlay", "판매"], ["#/center/coaching", "message", "코칭"]] : [["#/center", "grid", "대시보드"], ["#/center/students", "users", "수강생"], ["#/center/reviews", "checks", "과제 검수"], ["#/center/questions", "message", "1:1"]]).filter((x) => { const k = x[0].replace(/^#\/center\/?/, ""); return !k || A.can(k); }).filter((x) => x[0] !== "#/center"), tHalf = Math.floor(tOth.length / 2), tabA = (x) => <a key={x[0]} className="bw-tab" href={x[0]}><Icon n={x[1]} /><span>{x[2]}</span></a>; // 휴대폰 아래 탭: 전체(메뉴) 왼쪽 · 가운데 동그란 홈(대시보드)
  return (
    <div className="adm a-app" id="a-app">
      {S.role === "master" && S.actingAs ? <div className="a-acting"><Icon n="shieldCheck" c="sm" /><span>마스터 권한으로 <b>{ins.name}</b> 강사센터를 보고 있어요.</span><Btn action="stop-acting" cls="a-btn-light a-btn-sm">마스터로 돌아가기</Btn></div> : null}
      <header className={"a-top" + (many ? " has-csw" : "")}>
        <button className="a-icon-btn a-menu" type="button" data-action="toggle-nav" aria-label="메뉴"><Icon n="menu" /></button>
        <span className="a-logo"><a className={"a-logo-home" + (dcL ? " a-logo-dc" : "")} href={A.homeOf(groups)} title="대시보드로" aria-label="대시보드로">{dcL ? <img className="a-dc-word" src="assets/brand/doogo-class-word.svg" alt="DOOGO CLASS" /> : <RawOne html={window.doogoClassLock("hm-lock-xs")} />}</a><a className="a-logo-role" href={"#/center" + (partner ? "/partner" : media ? "/media" : master ? "/master" : "")}>{partner ? "패밀리센터" : media ? "온드미디어 센터" : master ? "마스터 관리자" : coach ? "코치센터" : "강사센터"}</a>
          {ins ? (many ? <button type="button" className="a-coach-sw" data-action="coach-switch" title="맡은 다른 강의로 옮기기"><Icon n="swap" c="xs" /><span>{ins.displayName}</span><Icon n="chevDown" c="xs" /></button> : <em className="a-hide-sm">{ins.displayName}</em>) : null}{A.coachCourse() ? <span className="a-top-course a-hide-sm" title={A.coachCourse()}>{A.coachCourse()}</span> : null}</span>
        <div className="a-top-right">
          {ins ? <><span className={"a-chip a-hide-sm" + (vod ? " a-chip-vod" : "")}>{vod ? "DOOGO CLASS · VOD 수강생 " + A.VX().buyersOf(ins.id).filter((b) => b.active).length + "명" : co ? co.name + " · " + DB.STATUS_LABEL[DB.cohortStatus(co)] : "기수 없음"}</span>
            <Btn action="preview" cls="a-btn-outline a-btn-sm a-pv-btn" title="수강생에게 보이는 화면을 미리 봐요 (수강생 기록은 바뀌지 않아요)" aria-label="수강생 화면"><Icon n="eye" c="sm" /><span className="a-hide-sm">{vod ? "VOD 수강생 화면" : "수강생 화면"}</span><span className="a-only-sm">수강생 화면</span></Btn></> : null}
          <Bell partner={partner} master={master} PM={PM} />
          <span className={"a-user a-user-" + u[3] + " a-hide-sm"}><span className="a-user-av"><Icon n={u[2]} c="sm" /></span><span className="a-user-t"><b>{u[0] + (u[3] === "ms" ? "" : " 님")}</b><small>{u[1]}</small></span><i className="a-user-dot" aria-hidden="true" /></span>
          <Btn action="logout" cls="a-btn-outline a-btn-sm a-logout"><Icon n="logout" c="sm" /><span className="a-hide-sm">로그아웃</span></Btn>
        </div>
      </header>
      <div className="a-shell">
        <aside className="a-side" aria-label="관리 메뉴">
          {ins ? (A.trackable() ? <Isl html={A.trackSwitch()} /> : null) : master ? <Isl html={A.masterSwitch()} /> : null}
          {groups.map((g) => <div key={g[0]} className="a-nav-group"><p className="a-nav-label">{g[0]}</p>{g[0] === "VOD 강의실 꾸미기" ? <Isl html={A.vpidPick()} /> : null}{g[1].map((it) => {
            const on = it[0] === curKey || (!master && !partner && !media && it[0] && r.parts[0] === it[0]);
            return <a key={it[0]} className={"a-nav" + (on ? " on" : "")} href={"#/center" + (it[0] ? "/" + it[0] : "")} aria-current={on ? "page" : undefined}><Icon n={it[2]} c="sm" /><span>{it[1]}</span>{it[3] ? <span className="a-count">{it[3]}</span> : null}</a>;
          })}</div>)}
          {media ? <div className="a-side-card"><b>RS {A.mdRate(MDM)}% · 매월 10일 지급</b><p>내 홍보 링크로 VOD가 팔리면 판매가 × {100 - A.mdR().pg}% × {A.mdRate(MDM)}%가 쌓여요.</p><a className="a-btn a-btn-primary a-btn-sm a-btn-block" href="#/center/media/links"><Icon n="link" c="sm" />내 홍보 링크</a></div> : null}
          {partner ? <div className="a-side-card"><b>RS {PM.rs !== null && PM.rs !== undefined && PM.rs !== "" ? PM.rs : A.affDefRs()}% · 매월 {A.AFF().affSettings.payDay}일 지급</b><p>소개한 강사님이 기수 이용료를 입금하면 수익이 확정돼요.</p></div>
            : master || media ? null : <div className="a-side-card"><b>수강생 화면과 똑같은 메뉴</b><p>‘수강생 화면 콘텐츠’에서 고친 내용이 수강생 화면에 바로 반영돼요.</p><Btn action="preview" cls="a-btn-primary a-btn-sm a-btn-block"><Icon n="eye" c="sm" />수강생 화면</Btn></div>}
          <div className="a-side-foot">{S.role !== "master" ? <a className="a-side-kk" href={DB.opsKakao().chat} target="_blank" rel="noopener" data-kk-ops=""><Icon n="headset" c="xs" />운영팀 상담 (카카오톡)</a> : null}<a href="#/login" data-action="to-student"><Icon n="arrowLeft" c="xs" />수강생 로그인 화면</a><RawOne html={window.poweredBy("color")} /></div>
        </aside>
        <div className="a-scrim" data-action="toggle-nav" />
        {master || partner || media ? null : <nav className={"bw-tabbar bw-tabbar-a " + (vod ? "bw-tr-vod" : "bw-tr-live")} aria-label="빠른 메뉴"><button type="button" className="bw-tab" data-action="toggle-nav"><Icon n="menu" /><span>전체</span></button>{tOth.slice(0, tHalf).map(tabA)}<a className="bw-tab bw-tab-home" href="#/center"><i className="bw-tab-hc"><Icon n="home" /></i><span>홈</span></a>{tOth.slice(tHalf).map(tabA)}{tOth.length % 2 ? null : <span className="bw-tab-sp" aria-hidden="true" />}</nav>}
        <main className="a-main" id="a-main">{pageHtml != null ? <RawOne html={'<div class="a-page">' + pageHtml + "</div>"} /> : <div className="a-page">{children}</div>}</main>
      </div>
    </div>
  );
}
