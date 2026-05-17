// Cloudflare Pages Functions image proxy
// 인스타그램 CDN 등 외부 이미지가 referrer/origin 체크로 차단될 때
// 서버 사이드에서 fetch 한 뒤 동일 origin 으로 다시 내려보낸다.
//
// 사용: <img src="/api/img-proxy?url=<encoded>">

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get('url');

  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response('invalid url', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  // 허용 호스트 화이트리스트 — 임의 SSRF 방지
  let parsed;
  try { parsed = new URL(target); } catch (e) {
    return new Response('invalid url', { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  const ALLOWED = /(cdninstagram\.com|fbcdn\.net|instagram\.com|akamaihd\.net|akamaized\.net|cloudfront\.net|ggpht\.com|ytimg\.com|pstatic\.net|naver\.net|kakaocdn\.net)$/i;
  if (!ALLOWED.test(parsed.hostname)) {
    return new Response('host not allowed: ' + parsed.hostname, {
      status: 403,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response('upstream ' + upstream.status, {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const buf = await upstream.arrayBuffer();
    const ct = upstream.headers.get('Content-Type') || 'image/jpeg';

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response('fetch failed: ' + String(e).slice(0, 200), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
