#!/usr/bin/env node
/* 잠근 파일 묶음 만들기 (api/_lib/filepack.js) — 수강생 전용 자료 파일을 공개 저장소에 그대로 올리지 않으려고 써요.
 *   node scripts/files-pack.js --key-file <열쇠 파일(64자리 16진수)> <묶음.enc> 이름표=<파일 경로>[=<보일 파일 이름>] …
 * 열쇠는 화면에 찍지 않아요. 같은 열쇠를 Vercel 환경 변수 DC_FILES_KEY 에 넣어 두면 배포 때 일회성 작업이 열어요. */
"use strict";
const fs = require("fs");
const path = require("path");
const FP = require("../api/_lib/filepack");

const MIME = { xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword", hwp: "application/x-hwp", hwpx: "application/x-hwp",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip: "application/zip", csv: "text/csv", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

const args = process.argv.slice(2);
const ki = args.indexOf("--key-file");
if (ki < 0 || !args[ki + 1]) { console.error("--key-file <열쇠 파일> 이 필요해요"); process.exit(2); }
const key = fs.readFileSync(args[ki + 1], "utf8").trim();
const rest = args.filter((_, i) => i !== ki && i !== ki + 1);
const out = rest.shift();
if (!out || !rest.length) { console.error("사용법: files-pack.js --key-file <열쇠> <묶음.enc> 이름표=<파일>[=<이름>] …"); process.exit(2); }
const files = {};
for (const a of rest) {
  const [tag, file, shown] = a.split("=");
  const name = shown || path.basename(file), ext = (name.split(".").pop() || "").toLowerCase();
  if (!MIME[ext]) { console.error("모르는 파일 형식: " + name); process.exit(2); }
  const buf = fs.readFileSync(file);
  files[tag] = { name, mime: MIME[ext], b64: buf.toString("base64") };
  console.log("· " + tag + " ← " + name + " (" + Math.round(buf.length / 1024) + "KB)");
}
const sealed = FP.seal({ v: 1, files }, key);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sealed);
// 바로 다시 열어 보기 (같은 열쇠로 열리고 내용이 같은지)
const back = FP.open(fs.readFileSync(out), key);
const same = Object.keys(files).every((t) => back.files[t] && back.files[t].b64 === files[t].b64 && back.files[t].name === files[t].name);
console.log((same ? "✓ " : "✗ ") + out + " · 파일 " + Object.keys(files).length + "개 · " + Math.round(sealed.length / 1024) + "KB");
if (!same) process.exit(1);
