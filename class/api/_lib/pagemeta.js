/* 페이지 미리보기 정보 (Next.js 전환 3단계 · 2026-11) — 카카오톡 공유 · 검색 로봇은 자바스크립트를 돌리지 않아서,
 * 예전에는 어느 클래스 주소를 보내도 같은 제목 · 설명 · 사진(index.html)만 보였어요.
 * 이제 서버가 클래스 상세 주소(/vod/p/<클래스>)에 그 클래스의 제목 · 설명 · 사진 · 가격 · 소개 글을 넣어 보내요.
 *  · 화면(그리는 것)은 그대로예요 — 들어온 뒤에는 예전과 같은 화면(vod.js)이 그려요. 바뀌는 건 <head> 의 미리보기 정보와
 *    자바스크립트를 못 읽는 로봇용 안내 글(.seo-static)뿐이에요.
 *  · 스토어에 보이지 않는 클래스(판매 중 · 오픈 예정이 아님 · 강사 노출을 끈 강사)나 오류가 나면 예전 index.html 그대로 보내요.
 *  · 끄기: 환경 변수 DC_SSR_OFF 에 vod-detail 을 넣고 다시 배포하면 예전처럼 index.html 그대로 (SWITCHES) */
"use strict";
const store = require("./store");
const { pricer } = require("./vodprice");

const ORIGIN = "https://www.doogoclass.com";
const SWITCHES = ["vod-detail"];
const off = (k) => String(process.env.DC_SSR_OFF || "").split(/[\s,]+/).indexOf(k) >= 0;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const flat = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const cut = (s, n) => { const t = flat(s); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
const TYPE_TXT = { vod: "VOD 클래스", ebook: "전자책", book: "종이책", live: "LIVE 강의", offline: "오프라인 강의" };

/** 스토어에 보이는 클래스인지 (화면 vod.js 와 같은 기준: 판매 중 · 오픈 예정 + 강사 노출을 끈 강사는 showOff 상품만) */
function shown(vod, p) {
  if (!p || !p.id || !p.title || (p.status !== "on" && p.status !== "soon")) return false;
  const insOff = Array.isArray(vod.insOff) ? vod.insOff : [], key = p.iid || (p.creator ? "ext:" + p.creator : "");
  return !!p.showOff || insOff.indexOf(key) < 0;
}
/** 공유 사진: 클래스 사진(thumb) · 책 표지(cover) — 사이트 안 파일이면 전체 주소로 (브라우저에만 있는 사진 idb: · data: 는 빼요) */
function imageOf(p) {
  const u = String(p.thumb || p.cover || "").trim();
  if (!u || /^(idb|data|blob):/i.test(u)) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf("//") === 0) return ""; // http: · 다른 주소 형식은 쓰지 않아요
  return ORIGIN + "/" + u.replace(/^\/+/, "");
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
function vodDetail(html, vod, id, now) {
  vod = vod || {};
  const p = (vod.products || []).find((x) => x && x.id === id);
  if (!shown(vod, p)) return null;
  const url = ORIGIN + "/vod/p/" + encodeURIComponent(p.id);
  const title = flat(p.title), docTitle = title + " | DOOGO CLASS — 돈 되는 클래스"; // 화면(vod.js)이 쓰는 제목과 같게
  const who = flat(p.creator || ""), kind = TYPE_TXT[p.type] || TYPE_TXT.vod;
  const desc = cut([p.sub, p.hook].filter(Boolean).join(" · ") || p.pitch || p.intro || title, 150) + (who ? " — " + who : "");
  const img = imageOf(p), pr = priceOf(vod, p, now || Date.now());
  let out = String(html);
  const set = (re, val) => { out = out.replace(re, (m, a, b) => a + esc(val) + b); };
  set(/(<title>)[^<]*(<\/title>)/, docTitle);
  set(/(<meta name="description" content=")[^"]*(")/, desc);
  set(/(<link rel="canonical" href=")[^"]*(")/, url);
  set(/(<meta property="og:url" content=")[^"]*(")/, url);
  set(/(<meta property="og:title" content=")[^"]*(")/, title);
  set(/(<meta property="og:description" content=")[^"]*(")/, desc);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, title);
  set(/(<meta name="twitter:description" content=")[^"]*(")/, desc);
  set(/(<meta property="og:image:alt" content=")[^"]*(")/, title);
  if (img) {
    set(/(<meta property="og:image" content=")[^"]*(")/, img);
    set(/(<meta property="og:image:secure_url" content=")[^"]*(")/, img);
    set(/(<meta name="twitter:image" content=")[^"]*(")/, img);
    // 크기 · 형식은 기본 공유 사진(1200×630 jpg) 것이라 빼요
    out = out.replace(/\n\s*<meta property="og:image:(type|width|height)" content="[^"]*" \/>/g, "");
  }
  // 검색용 구조화 데이터 (상품 · 가격)
  const ld = { "@context": "https://schema.org", "@type": "Product", name: title, description: desc, url, brand: { "@type": "Brand", name: "두고클래스" }, category: kind };
  if (img) ld.image = img;
  if (who) ld.author = { "@type": "Person", name: who };
  if (pr && p.status === "on") ld.offers = pr.low === pr.high ? { "@type": "Offer", price: pr.low, priceCurrency: "KRW", availability: "https://schema.org/InStock", url } : { "@type": "AggregateOffer", lowPrice: pr.low, highPrice: pr.high, priceCurrency: "KRW", offerCount: 2, url };
  const ldTag = '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, "\\u003c") + "</script>";
  out = out.replace(/(<script type="application\/ld\+json">[\s\S]*?<\/script>)/, (m) => m + "\n  " + ldTag);
  // 자바스크립트를 못 읽는 로봇용 안내 글 (화면이 뜨면 앱이 바로 바꿔요)
  const li = (xs) => (Array.isArray(xs) && xs.length ? "<ul>" + xs.slice(0, 8).map((x) => "<li>" + esc(flat(x)) + "</li>").join("") + "</ul>" : "");
  const body = "<main>\n        <h1>" + esc(title) + "</h1>\n        <p>" + esc(kind) + (who ? " · " + esc(who) : "") + (pr && p.status === "on" ? " · " + esc(pr.low === pr.high ? won(pr.low) : won(pr.low) + "부터") : p.status === "soon" ? " · 오픈 예정" : "") + "</p>\n" +
    (p.sub ? "        <p>" + esc(flat(p.sub)) + "</p>\n" : "") + (p.pitch ? "        <p>" + esc(cut(p.pitch, 600)) + "</p>\n" : "") +
    (Array.isArray(p.learn) && p.learn.length ? "        <h2>이 클래스에서 배우는 것</h2>" + li(p.learn) + "\n" : "") + (Array.isArray(p.who) && p.who.length ? "        <h2>이런 분께 추천해요</h2>" + li(p.who) + "\n" : "") +
    '        <p><a href="' + esc(url) + '">' + esc(title) + '</a> · <a href="' + ORIGIN + '/vod/c/all">클래스 둘러보기</a> · <a href="' + ORIGIN + '/">두고클래스</a></p>\n      </main>';
  out = out.replace(/(<div class="seo-static">[\s\S]*?)<main>[\s\S]*?<\/main>/, (m, a) => a + body);
  return out;
}

/** 주소 → 미리보기 정보를 넣은 html (해당 없음 · 꺼짐 · 오류면 받은 html 그대로) */
async function render(pathname, html) {
  try {
    const m = /^\/vod\/p\/([^/?#]+)\/?$/.exec(String(pathname || ""));
    if (!m || off("vod-detail")) return html;
    const id = decodeURIComponent(m[1]);
    const meta = ((await store.getDoc("meta")) || {}).v || {};
    return vodDetail(html, meta.vod, id, Date.now()) || html;
  } catch (e) {
    console.error("[pagemeta]", pathname, e && e.message);
    return html;
  }
}

module.exports = { render, vodDetail, shown, imageOf, SWITCHES, ORIGIN };
