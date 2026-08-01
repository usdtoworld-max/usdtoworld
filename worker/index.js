// Handles POST /api/contact from the Contact page form (src/pages/contact.astro)
// and emails the submission to usdtoworld@gmail.com using Cloudflare's native
// Email Routing "send_email" binding (see wrangler.jsonc -> send_email).
//
// This only runs for /api/* (see assets.run_worker_first in wrangler.jsonc) —
// every other request is served directly from the static dist/ build with no
// Worker invocation at all, so this doesn't add latency to normal page loads.
//
// One-time Cloudflare-side setup this code can't do for you (dashboard only):
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
