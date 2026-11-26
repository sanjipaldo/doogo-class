/* 체험(테스트) 수강생 계정을 처음 상태로 (2026-11-09 · 대표님 요청)
 * 강의 시연 · 남에게 보여 주기용 계정(수강생 기록 demo: true)은 로그인할 때와 로그아웃할 때(자동 로그아웃 포함) 진도 기록을 처음으로 돌려요:
 *   과제 제출 · 강사 검수(체크 완료) · 강의 시청 · 실무 체크리스트 · 질문 · 대화 · 노트 · 학습 노트 · 공지 읽음 · 시작 가이드 체크
 * 문대표뿐 아니라 모든 강사의 체험 계정에 똑같이. 계정(이름 · 비밀번호 · 기수 · 커리큘럼)은 그대로예요.
 * 이미 끝난 기수의 체험 계정(예: 1기 · 2기 체험단 — 수료증까지 보여 주는 계정)은 그대로 둬요.
 * 주차는 체험 계정이면 일정과 상관없이 모두 열려 있어요 (app.js isOpen · 예전부터). */
"use strict";
const store = require("./store");
const DR = require("../../shared/data-rules");
const SCH = require("../../shared/schedule");

const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const fresh = () => Object.assign(DR.emptyProgress(), { guideV: 2 });
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);

/** 처음으로 돌릴 체험 계정인지 — demo: true 이고, 기수가 이미 끝나지 않았으면 */
function resettable(s, cohorts, content, today) {
  if (!isObj(s) || s.demo !== true) return false;
  const co = (Array.isArray(cohorts) ? cohorts : []).find((x) => isObj(x) && x.id === s.cohortId);
  if (!co || !co.startDate) return true;
  const c = isObj(content) ? content : {}, cuId = s.curriculumId || co.curriculumId;
  const cu = cuId && cuId !== "main" ? (Array.isArray(c.curricula) ? c.curricula : []).find((x) => isObj(x) && x.id === cuId) : null;
  const weeks = Number(co.weeks) || ((cu ? cu.weeks : c.weeks) || []).length || 1;
  return SCH.cohortStatus(co, weeks, today || todayKst()) !== "ended";
}
/** 이미 처음 상태인지 (괜히 다시 쓰지 않게) */
const isFresh = (p) => {
  if (!isObj(p)) return false;
  const f = fresh();
  return Object.keys(f).every((k) => JSON.stringify(p[k]) === JSON.stringify(f[k])) && Object.keys(p).every((k) => k in f);
};

/** 실제 수강생 기록인지 (2026-11-26): 과제 제출이 2개 이상이고 첫 제출과 마지막 제출이 12시간 넘게 떨어져 있으면 —
 *  체험 계정은 로그인 · 로그아웃(자동 로그아웃 1시간 포함)마다 처음으로 돌아가서 12시간 넘게 쌓일 수 없어요. 그러면 실제 수강생이 체험으로 잘못 표시된 거예요 */
const DEMO_SIDS = ["demo1", "demo2", "s1"]; // 체험 계정으로 만든 계정 — 늘 처음으로
function realWork(p) {
  const subs = isObj(p) && isObj(p.submissions) ? p.submissions : {}, at = [];
  Object.keys(subs).forEach((m) => (Array.isArray(subs[m]) ? subs[m] : []).forEach((x) => { if (x && Number(x.at)) at.push(Number(x.at)); }));
  return at.length >= 2 && Math.max.apply(null, at) - Math.min.apply(null, at) >= 12 * 3600e3;
}
/** 서버: 이 수강생이 처음으로 돌릴 체험 계정이면 진도 기록을 처음으로 — 했으면 true */
async function resetDemo(iid, sid) {
  if (!iid || !sid) return false;
  const docs = await store.getDocs(["stu:" + iid + ":" + sid, "cohorts:" + iid, "content:" + iid]);
  const s = (docs["stu:" + iid + ":" + sid] || {}).v;
  if (!resettable(s, (docs["cohorts:" + iid] || {}).v, (docs["content:" + iid] || {}).v)) return false;
  const k = "prog:" + iid + ":" + sid;
  // 실제 수강생이 체험으로 잘못 표시돼 있으면 지우지 않고 체험 표시를 풀어요 (사건 기록에 남김)
  if (DEMO_SIDS.indexOf(sid) < 0) {
    const p0 = await store.getDoc(k);
    if (p0 && realWork(p0.v)) {
      for (let i = 0; i < 3; i++) {
        const r = await store.getDoc("stu:" + iid + ":" + sid);
        if (!r || !isObj(r.v) || r.v.demo !== true) break;
        const v = Object.assign({}, r.v); delete v.demo;
        if ((await store.writeDoc("stu:" + iid + ":" + sid, v, r.ver)) !== false) break;
      }
      if (store.logEvent) await store.logEvent("demo-skip", "체험 표시된 실제 수강생 — 처음으로 돌리지 않고 체험 표시 풀었어요", { k, iid, sid });
      return false;
    }
  }
  for (let i = 0; i < 3; i++) {
    const cur = await store.getDoc(k);
    if (cur && isFresh(cur.v)) return true;
    const nv = await store.writeDoc(k, fresh(), cur ? cur.ver : null);
    if (nv !== false) {
      const n = cur && isObj(cur.v) && isObj(cur.v.submissions) ? Object.keys(cur.v.submissions).reduce((a, m) => a + (Array.isArray(cur.v.submissions[m]) ? cur.v.submissions[m].length : 0), 0) : 0;
      if (n && store.logEvent) await store.logEvent("demo-reset", "체험 계정 처음으로 (제출 " + n + "개 지움)", { k, iid, sid });
      return true;
    }
  }
  return false;
}

module.exports = { resetDemo, resettable, isFresh, fresh, todayKst, realWork, DEMO_SIDS };
