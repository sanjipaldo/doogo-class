/* 잠근 파일 묶음 (2026-11-15) — 수강생 전용 자료 파일을 공개 저장소(GitHub)에 그대로 두지 않으려고
 * AES-256-GCM 으로 잠가 둔 묶음이에요. 열쇠는 Vercel 환경 변수 DC_FILES_KEY(64자리 16진수)에만 있어요.
 * 배포 때 일회성 작업(oneoff.js)이 열어서 DB 의 비공개 파일 저장소(/api/file · 그 강사 수강생만)에 넣어요.
 * 묶음 모양: "DCFP1" + iv(12) + tag(16) + 잠근 내용(gzip(JSON { v: 1, files: { 이름표: { name, mime, b64 } } }))
 * 만들기: node scripts/files-pack.js --key-file <열쇠 파일> <묶음.enc> 이름표=<파일 경로>[=<보일 파일 이름>] … */
"use strict";
const crypto = require("crypto");
const zlib = require("zlib");
const fs = require("fs");

const MAGIC = Buffer.from("DCFP1");
const keyBuf = (hex) => {
  const h = String(hex || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(h)) throw Object.assign(new Error("열쇠 모양이 아니에요 (64자리 16진수)"), { code: "KEY" });
  return Buffer.from(h, "hex");
};
const keyOk = (hex) => /^[0-9a-f]{64}$/i.test(String(hex || "").trim());

function seal(obj, hex) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", keyBuf(hex), iv);
  const body = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj), "utf8"))), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}
function open(buf, hex) {
  if (!Buffer.isBuffer(buf) || buf.length < MAGIC.length + 28 || !buf.subarray(0, MAGIC.length).equals(MAGIC)) throw Object.assign(new Error("묶음 파일이 아니에요"), { code: "PACK" });
  const iv = buf.subarray(5, 17), tag = buf.subarray(17, 33), d = crypto.createDecipheriv("aes-256-gcm", keyBuf(hex), iv);
  d.setAuthTag(tag);
  let plain;
  try { plain = Buffer.concat([d.update(buf.subarray(33)), d.final()]); }
  catch (e) { throw Object.assign(new Error("열쇠가 맞지 않거나 묶음이 손상됐어요"), { code: "KEY" }); }
  return JSON.parse(zlib.gunzipSync(plain).toString("utf8"));
}
const openFile = (file, hex) => open(fs.readFileSync(file), hex);
/** 묶음 안 파일 하나 → 첨부 항목 { id, name, data: data URL, size } (저장할 때 서버가 비공개 파일로 바꿔요) */
function asAttachment(f, id) {
  return { id, name: f.name, data: "data:" + f.mime + ";base64," + f.b64, size: Buffer.byteLength(f.b64, "base64") };
}

module.exports = { seal, open, openFile, keyOk, asAttachment, MAGIC };
