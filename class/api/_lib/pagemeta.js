/* 페이지 미리보기 정보 (Next.js 전환 3단계 · 2026-11) — 카카오톡 공유 · 검색 로봇은 자바스크립트를 돌리지 않아서,
 * 예전에는 어느 주소를 보내도 같은 제목 · 설명 · 사진(index.html)만 보였어요. 이제 서버가 주소마다 그 페이지 정보를 넣어 보내요.
 *   /vod/p/<클래스>   클래스 상세 — 클래스 제목 · 한 줄 소개 · 사진 · 가격(결제와 같은 규칙)
 *   /p/<강사>         강사 소개 — 강의 이름 · 헤드라인 · 강사 사진
 *   /free/<강사>      무료강의 — 강의 제목 · 일시 · 포스터(썸네일)
 *  · 화면(그리는 것)은 그대로예요 — 들어온 뒤에는 예전과 같은 화면(vod.js · landing.js)이 그려요. 바뀌는 건 <head> 의 미리보기 정보와
 *    자바스크립트를 못 읽는 로봇용 안내 글(.seo-static)뿐이에요.
 *  · 보이지 않는 페이지(판매 중이 아님 · 숨긴 강사 · 비공개 페이지 · 이용 중지 강사)나 오류가 나면 예전 index.html 그대로 보내요.
 *  · 공유 사진은 JPG · PNG · GIF 만 써요 (카카오톡이 webp 를 못 읽어요) — webp 사진은 빌드 때 만든 JPG(public/og-images.json)로, 없으면 기본 공유 사진.
 *  · 끄기: 환경 변수 DC_SSR_OFF 에 vod-detail · landing · free 를 넣고 다시 배포하면 그 주소는 예전처럼 index.html 그대로 (SWITCHES) */
"use strict";
const fs = require("fs");
const path = require("path");
const store = require("./store");
const { pricer } = require("./vodprice");

const ORIGIN = "https://www.doogoclass.com";
const SWITCHES = ["vod-detail", "landing", "free"];
const off = (k) => String(process.env.DC_SSR_OFF || "").split(/[\s,]+/).indexOf(k) >= 0;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const flat = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const cut = (s, n) => { const t = flat(s); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
/** 같은 말이 두 번 들어가지 않게 이어 붙여요 (앞 문구에 이미 들어 있는 문구는 빼요) */
const joinUniq = (parts, sep) => parts.map(flat).filter(Boolean).reduce((a, x) => (a.some((y) => y.indexOf(x) >= 0) ? a : a.filter((y) => x.indexOf(y) < 0).concat([x])), []).join(sep);
const TYPE_TXT = { vod: "VOD 클래스", ebook: "전자책", book: "종이책", live: "LIVE 강의", offline: "오프라인 강의" };
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

/* ---------- 공유 사진 ---------- */
let ogMap0 = null;
/** 빌드 때 webp → JPG 로 바꿔 둔 사진 목록 { "assets/…/x.webp": "assets/…/x.og.jpg" } (class/scripts/site.js public) */
function ogMap() {
  if (ogMap0) return ogMap0;
  try { ogMap0 = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "..", "public", "og-images.json"), "utf8")) || {}; } catch (e) { ogMap0 = {}; }
  return ogMap0;
}
const extOf = (u) => ((/\.([a-z0-9]+)$/i.exec(String(u).split(/[?#]/)[0]) || [])[1] || "").toLowerCase();
const OK_EXT = { jpg: 1, jpeg: 1, png: 1, gif: 1 };
/** 공유 사진 주소 (JPG · PNG · GIF 만): https 주소는 그대로, 사이트 안 파일은 전체 주소로, webp 는 빌드 때 만든 JPG 로 — 못 쓰면 "" (기본 공유 사진) */
function imageOf(u, map) {
  u = String(u || "").trim();
  if (!u || /^(idb|data|blob):/i.test(u)) return "";
  if (/^https:\/\//i.test(u)) return OK_EXT[extOf(u)] ? u : "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf("//") === 0) return ""; // http: · 다른 주소 형식은 쓰지 않아요
  const rel = u.replace(/^\/+/, ""), clean = rel.split(/[?#]/)[0], m = map || ogMap();
  if (OK_EXT[extOf(clean)]) return ORIGIN + "/" + rel;
  if (extOf(clean) === "webp" && m[clean]) return ORIGIN + "/" + m[clean];
  return "";
}
const firstImg = (list, map) => { for (const u of list) { const x = imageOf(u, map); if (x) return x; } return ""; };

/* ---------- 미리보기 정보 넣기 (모든 페이지 같이) ---------- */
/** index.html 에 { docTitle, title, desc, url, img, ld, body } 를 넣어요 */
function inject(html, o) {
  let out = String(html);
  const set = (re, val) => { out = out.replace(re, (m, a, b) => a + esc(val) + b); };
  set(/(<title>)[^<]*(<\/title>)/, o.docTitle);
  set(/(<meta name="description" content=")[^"]*(")/, o.desc);
  set(/(<link rel="canonical" href=")[^"]*(")/, o.url);
  set(/(<meta property="og:url" content=")[^"]*(")/, o.url);
  set(/(<meta property="og:title" content=")[^"]*(")/, o.title);
  set(/(<meta property="og:description" content=")[^"]*(")/, o.desc);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, o.title);
  set(/(<meta name="twitter:description" content=")[^"]*(")/, o.desc);
  set(/(<meta property="og:image:alt" content=")[^"]*(")/, o.title);
  if (o.img) {
    set(/(<meta property="og:image" content=")[^"]*(")/, o.img);
    set(/(<meta property="og:image:secure_url" content=")[^"]*(")/, o.img);
    set(/(<meta name="twitter:image" content=")[^"]*(")/, o.img);
    // 크기 · 형식은 기본 공유 사진(1200×630 jpg) 것이라 빼요
    out = out.replace(/\n\s*<meta property="og:image:(type|width|height)" content="[^"]*" \/>/g, "");
  }
  if (o.ld) {
    const ldTag = '<script type="application/ld+json">' + JSON.stringify(o.ld).replace(/</g, "\\u003c") + "</script>";
    out = out.replace(/(<script type="application\/ld\+json">[\s\S]*?<\/script>)/, (m) => m + "\n  " + ldTag);
  }
  // 자바스크립트를 못 읽는 로봇용 안내 글 (화면이 뜨면 앱이 바로 바꿔요)
  if (o.body) out = out.replace(/(<div class="seo-static">[\s\S]*?)<main>[\s\S]*?<\/main>/, (m, a) => a + "<main>\n" + o.body + "      </main>");
  return out;
}
const li = (xs) => (Array.isArray(xs) && xs.length ? "<ul>" + xs.slice(0, 8).map((x) => "<li>" + esc(flat(x)) + "</li>").join("") + "</ul>" : "");
const para = (s, n) => (flat(s) ? "        <p>" + esc(n ? cut(s, n) : flat(s)) + "</p>\n" : "");
const links = (url, title, more) => '        <p><a href="' + esc(url) + '">' + esc(title) + "</a>" + (more || "") + ' · <a href="' + ORIGIN + '/">두고클래스</a></p>\n';

/* ---------- 클래스 상세 /vod/p/<클래스> ---------- */
/** 스토어에 보이는 클래스인지 (화면 vod.js 와 같은 기준: 판매 중 · 오픈 예정 + 강사 노출을 끈 강사는 showOff 상품만) */
function shown(vod, p) {
  if (!p || !p.id || !p.title || (p.status !== "on" && p.status !== "soon")) return false;
  const insOff = Array.isArray(vod.insOff) ? vod.insOff : [], key = p.iid || (p.creator ? "ext:" + p.creator : "");
  return !!p.showOff || insOff.indexOf(key) < 0;
}
/** 가격 (결제 금액과 같은 규칙 · 한국 시간) → { low, high } | null (무료 · 계산 못 함) */
function priceOf(vod, p, now) {
  try {
    const X = pricer({ products: vod.products || [], settings: vod.settings || {}, biz: vod.biz || {} }, now);
    const ps = X.plansOf(p), list = ps.length ? ps.map((x) => x.sale) : [X.priceOf(p)];
    const low = Math.min.apply(null, list), high = Math.max.apply(null, list);
    return low > 0 ? { low, high } : null;
  } catch (e) { return null; }
}
/** index.html + 스토어 데이터(meta.vod) + 클래스 id → 그 클래스 미리보기 정보를 넣은 html (보여 줄 클래스가 아니면 null) */
function vodDetail(html, vod, id, now, map) {
  vod = vod || {};
  const p = (vod.products || []).find((x) => x && x.id === id);
  if (!shown(vod, p)) return null;
  const url = ORIGIN + "/vod/p/" + encodeURIComponent(p.id);
  const title = flat(p.title), who = flat(p.creator || ""), kind = TYPE_TXT[p.type] || TYPE_TXT.vod;
  const desc = cut(joinUniq([p.sub, p.hook], " · ") || p.pitch || p.intro || title, 150) + (who ? " — " + who : "");
  const img = firstImg([p.thumb, p.cover], map), pr = priceOf(vod, p, now || Date.now());
  const ld = { "@context": "https://schema.org", "@type": "Product", name: title, description: desc, url, brand: { "@type": "Brand", name: "두고클래스" }, category: kind };
  if (img) ld.image = img;
  if (who) ld.author = { "@type": "Person", name: who };
  if (pr && p.status === "on") ld.offers = pr.low === pr.high ? { "@type": "Offer", price: pr.low, priceCurrency: "KRW", availability: "https://schema.org/InStock", url } : { "@type": "AggregateOffer", lowPrice: pr.low, highPrice: pr.high, priceCurrency: "KRW", offerCount: 2, url };
  const body = "        <h1>" + esc(title) + "</h1>\n        <p>" + esc(kind) + (who ? " · " + esc(who) : "") + (pr && p.status === "on" ? " · " + esc(pr.low === pr.high ? won(pr.low) : won(pr.low) + "부터") : p.status === "soon" ? " · 오픈 예정" : "") + "</p>\n" +
    para(p.sub) + para(p.pitch, 600) +
    (Array.isArray(p.learn) && p.learn.length ? "        <h2>이 클래스에서 배우는 것</h2>" + li(p.learn) + "\n" : "") + (Array.isArray(p.who) && p.who.length ? "        <h2>이런 분께 추천해요</h2>" + li(p.who) + "\n" : "") +
    links(url, title, ' · <a href="' + ORIGIN + '/vod/c/all">클래스 둘러보기</a>');
  return inject(html, { docTitle: title + " | DOOGO CLASS — 돈 되는 클래스", title, desc, url, img, ld, body }); // 제목은 화면(vod.js)이 쓰는 제목과 같게
}

/* ---------- 강사 소개 /p/<강사> · 무료강의 /free/<강사> ---------- */
/** 강사 문서 · 강의 콘텐츠 문서 → 화면 db.js 와 같은 기본값 규칙(shared/data-rules.js landingOf · freeOf) */
function rulesFor(ins, c) {
  const DR = require("../../shared/data-rules");
  const seed = require("./seed").loadSeed();
  const db = { instructors: [ins], content: { [ins.id]: c } };
  return DR.make({ db: () => db, setDb: () => {}, seed: () => seed, save: () => true, remote: () => true, storeGet: (k, fb) => fb, storeSet: () => true });
}
/** "2026-11-17T19:30" (한국 시간 그대로 적힌 값) → "11월 17일 (화) 19:30" */
function whenTxt(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || ""));
  if (!m) return "";
  const dow = DOW[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return Number(m[2]) + "월 " + Number(m[3]) + "일 (" + dow + ")" + (m[4] ? " " + m[4] + ":" + m[5] : "");
}
/** 강사 소개 페이지: 공개한 페이지 · 이용 중인 강사만 (화면 landing.js renderPage 와 같은 기준) */
function landingPage(html, ins, c, map) {
  if (!ins || ins.status !== "active" || !c || !c.brand) return null;
  const L = rulesFor(ins, c).landingOf(ins.id);
  if (!L || !L.published) return null;
  const b = c.brand, url = ORIGIN + "/p/" + encodeURIComponent(ins.id), h = L.hero || {}, ab = L.about || {};
  const title = flat(b.courseTitle) + " · " + flat(b.name); // 화면 landing.js 와 같은 제목
  const who = flat(ab.name || b.instructor || ins.displayName || "");
  const desc = cut(joinUniq([h.title, h.sub], " · ") || b.courseTitle, 150) + (who && joinUniq([h.title, h.sub], " ").indexOf(who) < 0 ? " — " + who : "");
  const img = firstImg([h.image, ab.photo, b.photo], map);
  const pts = ((L.points || {}).items || []).map((x) => x && x.title).filter(Boolean);
  const body = "        <h1>" + esc(flat(b.courseTitle)) + "</h1>\n" + para(h.title) + para(h.sub) +
    (who ? "        <h2>" + esc(flat(ab.title || "강사 소개")) + " · " + esc(who) + "</h2>\n" + para(ab.body, 800) : "") +
    (pts.length ? "        <h2>" + esc(flat((L.points || {}).title || "이 강의에서 얻어 가는 것")) + "</h2>" + li(pts) + "\n" : "") +
    links(url, flat(b.courseTitle), ' · <a href="' + ORIGIN + '/doinggo">두잉고</a>');
  return inject(html, { docTitle: title, title, desc, url, img, body });
}
/** 무료강의 페이지: 공개한 페이지 · 이용 중인 강사만 (화면 landing.js renderFree 와 같은 기준) */
function freePage(html, ins, c, map) {
  if (!ins || ins.status !== "active" || !c || !c.brand) return null;
  const F = rulesFor(ins, c).freeOf(ins.id);
  if (!F || !F.published) return null;
  const h = F.hero || {}, lv = F.live || {}, url = ORIGIN + "/free/" + encodeURIComponent(ins.id);
  const lines = String(h.title || "").split("\n").map(flat).filter(Boolean), head = lines.join(" ") || flat(c.brand.courseTitle);
  const who = flat(h.instructor || c.brand.instructor || ins.displayName || ""), when = whenTxt(F.liveAt);
  const title = head + " · " + who + " 무료강의"; // 화면 landing.js 와 같은 제목
  const desc = cut(joinUniq([when ? when + " 무료 LIVE" : "", h.sub, lv.summary || lv.desc], " · "), 150);
  const img = firstImg([lv.image, h.image, c.brand.photo], map);
  const ld = { "@context": "https://schema.org", "@type": "Event", name: title, description: desc, url, isAccessibleForFree: true, eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: { "@type": "VirtualLocation", url }, organizer: { "@type": "Organization", name: "두고클래스", url: ORIGIN } };
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(F.liveAt || ""))) ld.startDate = String(F.liveAt).slice(0, 16) + ":00+09:00";
  if (who) ld.performer = { "@type": "Person", name: who };
  if (img) ld.image = img;
  const body = "        <h1>" + esc(head) + "</h1>\n        <p>" + esc(who) + " 무료강의" + (when ? " · " + esc(when) : "") + "</p>\n" + para(h.sub) + para(lv.summary || lv.desc, 600) +
    (Array.isArray(lv.points) && lv.points.length ? "        <h2>이 강의에서 다루는 것</h2>" + li(lv.points) + "\n" : "") +
    links(url, head, ' · <a href="' + ORIGIN + '/p/' + encodeURIComponent(ins.id) + '">강사 소개</a>');
  return inject(html, { docTitle: title, title, desc, url, img, ld, body });
}

/** 주소 → 미리보기 정보를 넣은 html (해당 없음 · 꺼짐 · 오류면 받은 html 그대로) */
async function render(pathname, html) {
  try {
    const m = /^\/(vod\/p|p|free)\/([^/?#]+)\/?$/.exec(String(pathname || ""));
    if (!m) return html;
    const kind = m[1] === "vod/p" ? "vod-detail" : m[1] === "p" ? "landing" : "free";
    if (off(kind)) return html;
    const id = decodeURIComponent(m[2]);
    if (kind === "vod-detail") {
      const meta = ((await store.getDoc("meta")) || {}).v || {};
      return vodDetail(html, meta.vod, id, Date.now()) || html;
    }
    if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return html;
    const d = await store.getDocs(["ins:" + id, "content:" + id]);
    const ins = (d["ins:" + id] || {}).v, c = (d["content:" + id] || {}).v;
    return (kind === "landing" ? landingPage(html, ins, c) : freePage(html, ins, c)) || html;
  } catch (e) {
    console.error("[pagemeta]", pathname, e && e.message);
    return html;
  }
}

module.exports = { render, vodDetail, landingPage, freePage, shown, imageOf, whenTxt, joinUniq, SWITCHES, ORIGIN };
