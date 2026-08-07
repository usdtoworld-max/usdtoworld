// Handles:
//   - POST /api/contact — see below
//   - GET  /api/rates   — proxies the live USD exchange-rate fetch server-side.
//     src/scripts/converter.js and the <head> prefetch in Layout.astro used
//     to fetch https://open.er-api.com/v6/latest/USD directly from the
//     browser. That meant every visitor's fetch depended on: (a) our CSP's
//     connect-src explicitly allowing that origin, and (b) that third-party
//     API actually sending CORS headers back — if either wasn't true, the
//     browser silently blocks the response and the site falls back to the
//     last cached rate, which is the "Couldn't reach the rate service"
//     message this was built to fix. Routing it through this Worker instead
//     means the browser only ever calls same-origin /api/rates (fetch()
//     to your own origin needs no CORS at all), and this Worker's own
//     server-to-server fetch to open.er-api.com isn't subject to CORS
//     either — CORS is a browser-only mechanism. This removes an entire
//     class of "works until a header changes" failure permanently, and lets
//     us edge-cache the upstream response so we're not hitting a free,
//     unauthenticated third-party API on every single page load.
//
// This only runs for /api/* (see assets.run_worker_first in wrangler.toml) —
// every other request is served directly from the static dist/ build with no
// Worker invocation at all, so this doesn't add latency to normal page loads.
//
// One-time Cloudflare-side setup this code can't do for you (dashboard only)
// — only needed for /api/contact, /api/rates needs no setup at all:
//   1. Enable Email Routing for usdtoworld.com (Cloudflare dashboard ->
//      Email -> Email Routing). This auto-configures the required MX/SPF/DKIM
//      records.
//   2. Under Email Routing -> Destination addresses, add and verify
//      usdtoworld@gmail.com (the account owner must click the verification
//      link Cloudflare emails to it once).
//   3. Under Email Routing -> Custom addresses, add a send-from address on
//      this domain (e.g. noreply@usdtoworld.com) — the FROM_ADDRESS below
//      must be a verified address on this domain, a Gmail address can't be
//      used as the sender.
// Until those are done, env.CONTACT_EMAIL.send() will reject and this
// handler falls back to a 502 so the form can show a "please email us
// directly" message instead of a false success.

const FROM_ADDRESS = 'noreply@usdtoworld.com';
const TO_ADDRESS = 'usdtoworld@gmail.com';
const RATE_API = 'https://open.er-api.com/v6/latest/USD';
const RATE_CACHE_SECONDS = 300; // 5 min edge cache — well under the API's own ~24h update cycle

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/rates') {
      return handleRates(request, ctx);
    }

    if (url.pathname !== '/api/contact') {
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid_body' }, 400);
    }

    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim();
    const message = String(data.message || '').trim();
    // Hidden honeypot field — real visitors never see or fill this input
    // (see contact.astro). Bots that fill every field trip it.
    if (data.company) {
      return json({ ok: true });
    }

    if (!name || !email || !message) {
      return json({ ok: false, error: 'missing_fields' }, 400);
    }
    if (name.length > 200 || email.length > 254 || message.length > 5000) {
      return json({ ok: false, error: 'too_long' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'invalid_email' }, 400);
    }

    try {
      await env.CONTACT_EMAIL.send({
        to: TO_ADDRESS,
        from: { name: 'UsdtoWorld Contact Form', email: FROM_ADDRESS },
        replyTo: { name, email },
        subject: `New contact form message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      });
      return json({ ok: true });
    } catch (err) {
      console.error('[contact] send failed:', err);
      return json({ ok: false, error: 'send_failed' }, 502);
    }
  },
};

async function handleRates(request, ctx) {
  if (request.method !== 'GET') {
    return json({ result: 'error', error: 'method_not_allowed' }, 405);
  }

  const cache = caches.default;
  // Cache key is a fixed synthetic URL rather than the real request URL, so
  // every visitor shares one cache entry instead of caching per-querystring.
  const cacheKey = new Request('https://usdtoworld.com/__cache/api/rates', request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let upstream;
  try {
    upstream = await fetch(RATE_API, { cf: { cacheTtl: RATE_CACHE_SECONDS, cacheEverything: true } });
  } catch (err) {
    console.error('[rates] upstream fetch threw:', err);
    return json({ result: 'error', error: 'upstream_unreachable' }, 502);
  }

  if (!upstream.ok) {
    console.error('[rates] upstream returned', upstream.status);
    return json({ result: 'error', error: 'upstream_bad_response' }, 502);
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return json({ result: 'error', error: 'upstream_invalid_json' }, 502);
  }
  if (!data || !data.rates) {
    return json({ result: 'error', error: 'upstream_missing_rates' }, 502);
  }

  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${RATE_CACHE_SECONDS}`,
    },
  });

  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
