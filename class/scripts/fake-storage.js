/* 시험용 가짜 Supabase Storage (DB 전환 2부 B1) — /storage/v1 의 버킷 확인 · 만들기 · 파일 올리기 · 받기 · 지우기만
 *  서버 시험(vod-test.js)은 fetch 바꿔치기로 handle() 을 부르고, 화면 시험(e2e)은 serve() 로 진짜 HTTP 서버를 띄워요.
 *  키가 맞지 않으면 401 (apikey 칸 · sb_ 키가 아니면 Authorization 도 같아야) — 서버 키를 제대로 보내는지 시험 */
"use strict";
const http = require("http");

function make(key) {
  const buckets = new Map(), objects = new Map(), log = [];
  const J = (status, j) => ({ status, type: "application/json", body: Buffer.from(JSON.stringify(j)) });
  function handle(method, pathname, headers, body) {
    const h = {}; Object.keys(headers || {}).forEach((k) => { h[k.toLowerCase()] = headers[k]; });
    log.push(method + " " + pathname);
    const okKey = h.apikey === key && (/^sb_/.test(key) ? !h.authorization || h.authorization === "Bearer " + key : h.authorization === "Bearer " + key);
    if (!okKey) return J(401, { statusCode: "401", error: "Unauthorized", message: "Invalid key" });
    let m = pathname.match(/^\/storage\/v1\/bucket\/([^/]+)$/);
    if (m && method === "GET") { const b = buckets.get(decodeURIComponent(m[1])); return b ? J(200, b) : J(400, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" }); }
    if (pathname === "/storage/v1/bucket" && method === "POST") { const j = JSON.parse(String(body || "{}")); if (buckets.has(j.id)) return J(409, { statusCode: "409", error: "Duplicate" }); buckets.set(j.id, { id: j.id, name: j.name, public: !!j.public, file_size_limit: j.file_size_limit }); return J(200, { name: j.id }); }
    m = pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (m) {
      const b = decodeURIComponent(m[1]), name = decodeURIComponent(m[2]), k = b + "/" + name;
      if (!buckets.has(b)) return J(400, { statusCode: "404", error: "Bucket not found" });
      if (method === "POST" || method === "PUT") {
        const buf = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
        const lim = buckets.get(b).file_size_limit;
        if (lim && buf.length > lim) return J(413, { statusCode: "413", error: "Payload too large" });
        if (objects.has(k) && h["x-upsert"] !== "true") return J(400, { statusCode: "409", error: "Duplicate" });
        objects.set(k, { buf, type: h["content-type"] || "application/octet-stream" });
        return J(200, { Key: k });
      }
      if (method === "GET") { const o = objects.get(k); return o ? { status: 200, type: o.type, body: o.buf } : J(400, { statusCode: "404", error: "not_found", message: "Object not found" }); }
    }
    m = pathname.match(/^\/storage\/v1\/object\/([^/]+)$/);
    if (m && method === "DELETE") { const b = decodeURIComponent(m[1]), j = JSON.parse(String(body || "{}")); const gone = (j.prefixes || []).filter((p) => objects.delete(b + "/" + p)); return J(200, gone.map((p) => ({ name: p }))); }
    return J(404, { statusCode: "404", error: "not_found" });
  }
  /** fetch 바꿔치기용: Response 비슷한 것 */
  async function fetchLike(url, opt) {
    opt = opt || {};
    const u = new URL(url), hd = opt.headers instanceof Headers ? Object.fromEntries(opt.headers.entries()) : opt.headers || {};
    const r = handle(opt.method || "GET", u.pathname, hd, opt.body == null ? null : Buffer.isBuffer(opt.body) ? opt.body : Buffer.from(opt.body instanceof Uint8Array ? opt.body : String(opt.body)));
    return { ok: r.status < 300, status: r.status, headers: { get: (n) => (n.toLowerCase() === "content-type" ? r.type : null) }, arrayBuffer: async () => r.body.buffer.slice(r.body.byteOffset, r.body.byteOffset + r.body.length), text: async () => r.body.toString("utf8"), json: async () => JSON.parse(r.body.toString("utf8")) };
  }
  /** 화면 시험용 진짜 HTTP 서버 → { url, stop } */
  function serve() {
    return new Promise((resolve) => {
      const srv = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => { const u = new URL(req.url, "http://x"); const r = handle(req.method, u.pathname, req.headers, Buffer.concat(chunks)); res.writeHead(r.status, { "Content-Type": r.type, "Content-Length": r.body.length }); res.end(r.body); });
      });
      srv.listen(0, "127.0.0.1", () => resolve({ url: "http://127.0.0.1:" + srv.address().port, stop: () => new Promise((r) => srv.close(() => r())) }));
    });
  }
  return { handle, fetchLike, serve, buckets, objects, log };
}

module.exports = { make };
