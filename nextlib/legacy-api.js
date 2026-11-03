/* Next.js 전환 1단계 — /api/<이름> 요청을 지금 서버 코드(class/api/<이름>.js)에 그대로 넘겨요.
 *  · Next.js 가 서버 코드를 묶지(bundle) 않아요. 예전 Vercel 서버 함수(api/*.js)와 똑같이 Node 가 그 파일을 바로 불러서,
 *    __dirname 으로 읽는 처음 데이터(data.js · db.js) · AI 조교 자료 · node:sqlite · 모듈 상태가 그대로예요.
 *  · 요청 본문은 Next.js 가 읽지 않아요 (pages/api/*.js 의 bodyParser: false) — 결제 웹훅 서명이 원래 본문 그대로 맞아요.
 *  · 함께 올릴 파일은 next.config.js 가 예전 Vercel 과 같은 방법(nft)으로 찾아서 넣어요. */
import path from "node:path";
import fs from "node:fs";

// 묶는 도구(Turbopack · webpack)가 따라 들어가지 않는 Node 의 진짜 require
const createRequire = process.getBuiltinModule("node:module").createRequire;
const NAME = /^[a-z-]+$/;
let root = null;
const loaded = {};

/** 저장소 맨 위 (class/api 가 있는 곳) — Vercel 에서는 함수 폴더, 로컬에서는 next start 를 띄운 곳 */
function findRoot() {
  const tries = [process.cwd(), process.env.LAMBDA_TASK_ROOT, "/var/task"].filter(Boolean);
  for (const d of tries) if (fs.existsSync(path.join(d, "class", "api", "_lib", "http.js"))) return d;
  throw new Error("[api] class/api 를 찾지 못했어요: " + tries.join(", "));
}

export function legacyApi(name) {
  if (!NAME.test(name)) throw new Error("[api] 이름이 이상해요: " + name);
  return function handler(req, res) {
    if (!loaded[name]) {
      root = root || findRoot();
      loaded[name] = createRequire(path.join(root, "package.json"))("./class/api/" + name + ".js");
    }
    return loaded[name](req, res);
  };
}

/** 저장소 맨 위 경로 (class/ · public/ 이 있는 곳) */
export function repoRoot() { return (root = root || findRoot()); }
/** class/ 아래 서버 모듈을 그대로 불러요 (예: "api/_lib/pagemeta.js") — 묶지 않고 Node 가 바로 */
export function legacyLib(rel) {
  if (!/^[a-z0-9_\-/.]+\.js$/i.test(rel) || rel.indexOf("..") >= 0) throw new Error("[lib] 경로가 이상해요: " + rel);
  return createRequire(path.join(repoRoot(), "package.json"))("./class/" + rel);
}
