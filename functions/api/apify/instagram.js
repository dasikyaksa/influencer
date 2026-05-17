const APIFY_ENDPOINT = 'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items';

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('origin') || '*';
  return new Response(null, { status: 204, headers: cors(origin) });
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('origin') || '*';
  const url = new URL(context.request.url);
  const username = (url.searchParams.get('username') || '').trim().replace(/^@/, '');
  if (!username || !/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return new Response(JSON.stringify({ error: 'invalid username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  }

  const token = context.env.APIFY_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'APIFY_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  }

  const body = {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsLimit: 30,
  };

  try {
    const res = await fetch(`${APIFY_ENDPOINT}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'apify upstream error', status: res.status, detail: text.slice(0, 300) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors(origin) },
      });
    }
    const raw = await res.json();
    const posts = (Array.isArray(raw) ? raw : [])
      .map(p => ({
        id: p.id || p.shortCode || '',
        shortCode: p.shortCode || '',
        url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : ''),
        caption: p.caption || '',
        likesCount: typeof p.likesCount === 'number' ? p.likesCount : 0,
        commentsCount: typeof p.commentsCount === 'number' ? p.commentsCount : 0,
        videoViewCount: typeof p.videoViewCount === 'number' ? p.videoViewCount : null,
        displayUrl: p.displayUrl || '',
        timestamp: p.timestamp || '',
        type: p.type || '',
        productType: p.productType || '',
      }))
      .filter(p => p.shortCode || p.id);

    return new Response(JSON.stringify({ username, count: posts.length, posts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch failed', detail: String(e).slice(0, 300) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  }
}
