/* ==========================================================================
   POST /api/contact  (Cloudflare Pages Function)
   Receives the contact form, filters spam, then sends two emails through
   Resend: a notification to you and a confirmation to the lead.

   Settings (Cloudflare → your Pages project → Settings → Variables):
     RESEND_API_KEY  required, add as a Secret
     TO_EMAIL        where notifications go        (default jaysperucho@gmail.com)
     FROM_EMAIL      sender on your verified domain (default The Digital Agila <hello@thedigitalagila.com>)
     REPLY_TO        where the lead's replies go    (default TO_EMAIL)
     SITE_URL        your live address              (default https://thedigitalagila.com; www does not resolve yet)
     TIME_ZONE       for the "received" time        (default UTC, e.g. Asia/Manila)
   ========================================================================== */
import { notificationEmail, confirmationEmail } from '../../server/emails.js';

const LIMITS = { name: 120, email: 200, company: 160, website: 200, services: 300, timeline: 60, message: 5000 };
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
const MIN_FILL_MS = 2500;   // humans take longer than this to fill the form

function settingsFrom(env) {
  const to = env.TO_EMAIL || 'jaysperucho@gmail.com';
  return {
    to,
    from: env.FROM_EMAIL || 'The Digital Agila <hello@thedigitalagila.com>',
    replyTo: env.REPLY_TO || to,
    siteUrl: (env.SITE_URL || 'https://thedigitalagila.com').replace(/\/+$/, ''),
    timeZone: env.TIME_ZONE || 'UTC',
    senderName: env.SENDER_NAME || 'Jayson',
    senderTitle: env.SENDER_TITLE || 'Founder, The Digital Agila',
  };
}

// JSON for the site's own JavaScript; a redirect for browsers without it
function respond(wantsJson, status, body) {
  if (wantsJson) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  const to = status < 300 ? '/contact.html?sent=1#contact-form' : '/contact.html?error=1#contact-form';
  return new Response(null, { status: 303, headers: { Location: to } });
}

async function sendEmail(apiKey, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
  return res.ok;
}

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');

  // Only accept posts from our own pages
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return respond(wantsJson, 403, { ok: false, error: 'forbidden' });
  }

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return respond(wantsJson, 400, { ok: false, error: 'invalid', message: 'We could not read the form. Please try again.' });
  }
  const field = (k) => String(form.get(k) ?? '').trim().slice(0, LIMITS[k]);
  const data = {
    name: field('name'),
    email: field('email'),
    company: field('company'),
    website: field('website'),
    services: form.getAll('services').map((s) => String(s).trim()).filter(Boolean).join(', ').slice(0, LIMITS.services),
    timeline: field('timeline'),
    message: field('message'),
  };

  // Spam: bots fill the hidden field or submit instantly. Pretend it worked.
  const started = Number(form.get('started'));
  if (form.get('bot-field') || (started && Date.now() - started < MIN_FILL_MS)) {
    return respond(wantsJson, 200, { ok: true });
  }

  const errors = {};
  if (!data.name) errors.name = 'Please add your name.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Please add a valid email address.';
  if (data.message.length < 10) errors.message = 'Please tell us a little more (at least a sentence).';
  if (Object.keys(errors).length) {
    return respond(wantsJson, 400, { ok: false, error: 'invalid', fields: errors, message: Object.values(errors)[0] });
  }

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return respond(wantsJson, 500, { ok: false, error: 'not-configured' });
  }
  const s = settingsFrom(env);
  const meta = { receivedAt: Date.now(), country: request.cf?.country || '' };

  // Confirmation first, so the notification can tell you whether it went out
  const conf = confirmationEmail(data, s);
  const confirmationSent = await sendEmail(env.RESEND_API_KEY, {
    from: s.from, to: [data.email], reply_to: s.replyTo, subject: conf.subject, html: conf.html, text: conf.text,
  });

  const note = notificationEmail(data, { ...meta, confirmationSent }, s);
  const notified = await sendEmail(env.RESEND_API_KEY, {
    from: s.from, to: [s.to], reply_to: data.email, subject: note.subject, html: note.html, text: note.text,
  });

  if (!notified) return respond(wantsJson, 502, { ok: false, error: 'send-failed' });
  return respond(wantsJson, 200, { ok: true, confirmationSent });
}

export function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
