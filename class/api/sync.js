/* POST /api/sync  { changes: [ { k, base, ops } | { k, base, put } | { k, base, del: true } ] }
 * 바뀐 문서를 저장한다. 권한은 문서마다 확인하고, 그새 다른 사람이 바꿨으면 지금 값 위에 다시 적용한다.
 * 응답의 doc 은 서버에 저장된 결과가 보낸 사람의 화면과 다를 때만 (합쳐졌거나 사진 주소가 바뀌었을 때) 돌려준다. */
"use strict";
const { send, body, handler } = require("./_lib/http");
const store = require("./_lib/store");
const auth = require("./_lib/auth");
const access = require("./_lib/access");
const { applyOps, extractFiles } = require("./_lib/ops");
const VA = require("./_lib/vodaccess");
const DR = require("../shared/data-rules");

const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
const MAX_DOC = 2 * 1024 * 1024;

const subCount = (p) => { const s = p && p.submissions && typeof p.submissions === "object" ? p.submissions : {}; return Object.keys(s).reduce((a, m) => a + (Array.isArray(s[m]) ? s[m].length : 0), 0); };
/** 진행 기록 지키기 (2026-11-25 · 수강생 진도가 사라진 일): 과제 제출은 지워지지 않아요(제출을 지우는 기능은 없어요) — 저장 결과에 서버에 있던 제출이 빠졌으면 되돌려 넣고,
 *  제출이 하나도 없는 기록으로 바뀌려 하면(통째로 비우기) 서버 기록 위에 합쳐요(질문 · 대화 · 읽음 · 시청 · 노트도 남김). 하나씩 지우는 질문 · 대화 지우기는 그대로 돼요 */
function guardProg(o, n) {
  if (!o || typeof o !== "object" || !n || typeof n !== "object") return n;
  if (subCount(o) > 0 && subCount(n) === 0) return DR.progUnion(n, o);
  const os = o.submissions && typeof o.submissions === "object" ? o.submissions : {}, keep = {};
  Object.keys(os).forEach((mid) => { if (Array.isArray(os[mid]) && os[mid].length) keep[mid] = os[mid]; });
  return Object.keys(keep).length ? DR.progUnion(n, { submissions: keep }) : n;
}

/** 진행 기록을 지키려고 막거나 합친 저장을 서버 기록(Vercel 런타임 로그)에 남겨요 — 다시 생기면 누가 · 어느 화면에서 보냈는지 바로 알게 (이름 · 내용은 안 남김) */
function logGuard(what, k, ids, from) {
  const a = ids && ids.admin, who = a ? a.role + ":" + (a.cid || a.sid || a.id || a.iid || "") : ids && ids.student ? "student:" + ids.student.sid : "anon";
  console.error("[sync] 진행 기록 지키기 · " + what + " · " + k + " · " + who + " · " + String(from || "").slice(0, 160));
}
async function applyChange(ch, ids, dels, from) {
  const k = String((ch && ch.k) || "");
  if (!access.parseKey(k)) return { k, error: "key" };
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await store.getDoc(k);
    const exists = !!(row && row.v != null);
    const w = access.writer(k, ids, !exists);
    if (!w) return { k, error: "forbidden" };
    let naive;
    if (ch.del) naive = null;
    else if (ch.put !== undefined) naive = clone(ch.put);
    else naive = applyOps(clone(exists ? row.v : null), ch.ops);
    // 진행 기록(prog)을 통째로(put) 보냈는데 보낸 화면이 서버의 지금 판을 몰랐으면(base ≠ 지금 판 — 서버 기록을 받기 전에 저장했거나 오래된 화면),
    // 통째로 바꾸지 않고 서버 기록 위에 합쳐요: 보낸 내용이 이기고, 서버에만 있는 제출 · 질문 · 읽음 · 시청 등은 그대로 남아요.
    // (빈 진행 기록이 서버 기록을 통째로 덮어써 수강생 과제 · 대화 · 공지 읽음이 모두 사라졌던 일 · 2026-11-25)
    if (exists && ch.put !== undefined && naive != null && (Number(ch.base) || 0) !== row.ver && k.indexOf("prog:") === 0) {
      if (subCount(row.v) > subCount(naive)) logGuard("판 모르는 통째 저장 합침 (제출 " + subCount(naive) + " → 서버 " + subCount(row.v) + ")", k, ids, from);
      naive = DR.progUnion(naive, row.v);
    }
    if (!exists && naive == null) return { k, ver: row ? row.ver : 0, doc: null };
    // 진행 기록 지우기는 그 수강생(stu)도 같이 지울 때만 — 수강생은 그대로인데 화면에서 진행 기록만 빠져 ‘지우기’가 오던 일 (2026-11-25 · 한 분은 진행 기록이 통째로 지워졌어요)
    if (exists && naive == null && k.indexOf("prog:") === 0) {
      const sk = "stu:" + k.slice(5), stu = dels && dels.has(sk) ? null : await store.getDoc(sk);
      if (stu && stu.v != null) { logGuard("지우기 막음", k, ids, from); return { k, ver: row.ver, doc: access.view(k, row.v, ids) }; }
    }
    let next = w.fix(exists ? clone(row.v) : null, clone(naive));
    if (exists && next != null && k.indexOf("prog:") === 0) {
      const g = guardProg(row.v, next);
      if (subCount(g) !== subCount(next)) logGuard(subCount(next) === 0 ? "통째 비우기 합침" : "빠진 제출 되돌림 " + (subCount(g) - subCount(next)) + "개", k, ids, from);
      next = g;
    }
    let modified = (Number(ch.base) || 0) !== (row ? row.ver : 0) || JSON.stringify(next) !== JSON.stringify(naive);
    if (next != null) {
      const doc = next;
      const ex = extractFiles(next, (p) => access.fileScope(k, p, doc));
      next = ex.value;
      if (ex.files.length) {
        modified = true;
        for (const f of ex.files) await store.putFile(f.h, f.mime, f.b64, f.scope);
      }
      if (JSON.stringify(next).length > MAX_DOC) return { k, error: "too-large" };
    }
    // 고친 결과가 지금 저장된 것과 똑같으면(권한 밖 칸만 바꿨을 때 등) 새 판을 만들지 않아요 — 다른 기기에 괜한 ‘바뀜’이 가서 화면이 다시 그려지지 않게
    if (exists && next != null && JSON.stringify(next) === JSON.stringify(row.v)) { const out = { k, ver: row.ver }; if (modified) out.doc = access.view(k, row.v, ids); return out; }
    const ver = await store.writeDoc(k, next, row ? row.ver : null);
    if (ver === false) continue;
    const K = access.parseKey(k);
    if (K.vod) await VA.after(K, exists ? row.v : null, next, ids).catch((e) => console.error("[sync] vod after", k, e && e.message));
    const out = { k, ver };
    if (modified) out.doc = next == null ? null : access.view(k, next, ids);
    return out;
  }
  return { k, error: "busy" };
}

module.exports = handler(["POST"], async (req, res) => {
  const ids = await auth.identify(req);
  const b = await body(req);
  const changes = Array.isArray(b.changes) ? b.changes.slice(0, 300) : [];
  const results = [];
  const dels = new Set(changes.filter((ch) => ch && ch.del).map((ch) => String(ch.k || "")));
  const from = (req.headers && (req.headers.referer || req.headers.referrer)) || "", ua = String((req.headers && req.headers["user-agent"]) || "");
  const fromTxt = String(from).replace(/^https?:\/\/[^/]+/, "") + (/DoogoClassApp\//.test(ua) ? " · 앱" : /Mobile|Android|iPhone/.test(ua) ? " · 휴대폰" : " · PC");
  for (const ch of changes) results.push(await applyChange(ch, ids, dels, fromTxt));
  send(res, 200, { now: Date.now(), me: auth.publicMe(ids), results });
});
