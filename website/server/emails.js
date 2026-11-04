/* ==========================================================================
   Email templates for contact-form submissions.
   - notificationEmail: sent to you for every new inquiry
   - confirmationEmail: sent to the lead to confirm we received it
   Table layout with inline styles so they render in Gmail, Outlook and
   Apple Mail. Every value from the form is escaped before it goes in.
   ========================================================================== */

const C = {
  paper: '#eeece7', card: '#ffffff', ink: '#0f0f0f', muted: '#6c6963',
  line: '#e2dfd8', accent: '#e39b2b', accentDeep: '#a8650f',
};
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const nl2br = (s) => escapeHtml(s).replace(/\r?\n/g, '<br>');
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const safeUrl = (u) => {
  const v = String(u || '').trim();
  if (!v) return '';
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try { const url = new URL(withScheme); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (e) { return ''; }
};

function shell({ preheader, body, footer }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>The Digital Agila</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="padding:0 4px 20px;font-family:${SANS};font-size:18px;color:${C.ink};">
        <span style="font-family:${SERIF};font-style:italic;">The Digital</span> <b>Agila</b>
      </td></tr>
      <tr><td style="background:${C.card};border-radius:14px;padding:36px 32px;font-family:${SANS};color:${C.ink};">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
        ${footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const row = (label, valueHtml) => `
  <tr>
    <td style="padding:12px 0;border-top:1px solid ${C.line};font-size:13px;color:${C.muted};width:130px;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;border-top:1px solid ${C.line};font-size:15px;color:${C.ink};vertical-align:top;">${valueHtml}</td>
  </tr>`;
const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr>
    <td style="background:${C.ink};border-radius:999px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
    </td>
  </tr></table>`;

/* Notification to you ---------------------------------------------------- */
export function notificationEmail(d, meta, settings) {
  const site = safeUrl(d.website);
  const when = new Date(meta.receivedAt).toLocaleString('en-US', {
    timeZone: settings.timeZone, dateStyle: 'medium', timeStyle: 'short',
  });
  const replySubject = encodeURIComponent('Re: your inquiry to The Digital Agila');
  const subject = `New inquiry from ${d.name}${d.company ? ` (${d.company})` : ''}`;

  const body = `
    <p style="margin:0 0 6px;font-size:13px;color:${C.accentDeep};font-weight:600;letter-spacing:.04em;text-transform:uppercase;">New inquiry</p>
    <h1 style="margin:0 0 6px;font-size:26px;line-height:1.2;font-weight:600;">${escapeHtml(d.name)}</h1>
    <p style="margin:0 0 24px;font-size:15px;"><a href="mailto:${escapeHtml(d.email)}" style="color:${C.ink};">${escapeHtml(d.email)}</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Business', d.company ? escapeHtml(d.company) : '<span style="color:#9a968f;">Not given</span>')}
      ${row('Website', site ? `<a href="${escapeHtml(site)}" style="color:${C.ink};">${escapeHtml(d.website)}</a>` : '<span style="color:#9a968f;">Not given</span>')}
      ${row('Interested in', escapeHtml(d.services || 'Not specified'))}
      ${row('Start', escapeHtml(d.timeline || 'Not specified'))}
      ${row('Message', nl2br(d.message))}
    </table>
    ${button(`mailto:${d.email}?subject=${replySubject}`, `Reply to ${escapeHtml(firstName(d.name))}`)}
    <p style="margin:18px 0 0;font-size:13px;color:${C.muted};">Or just hit reply: this email's reply-to is set to ${escapeHtml(d.email)}.</p>`;

  const footer = `Received ${escapeHtml(when)}${meta.country ? ` · from ${escapeHtml(meta.country)}` : ''} via the contact form on ${escapeHtml(settings.siteUrl)}.<br>
    ${meta.confirmationSent === false ? `<b style="color:#b3261e;">The confirmation email to the lead could not be sent.</b>` : 'The lead has been sent a confirmation email.'}`;

  const text = [
    `NEW INQUIRY: ${d.name} <${d.email}>`,
    '',
    `Business: ${d.company || 'Not given'}`,
    `Website: ${d.website || 'Not given'}`,
    `Interested in: ${d.services || 'Not specified'}`,
    `Start: ${d.timeline || 'Not specified'}`,
    '',
    'Message:',
    d.message,
    '',
    `Received ${when} via ${settings.siteUrl}. Reply to this email to answer ${firstName(d.name)} directly.`,
  ].join('\n');

  return { subject, html: shell({ preheader: `${d.services || 'New inquiry'}: ${String(d.message).slice(0, 90)}`, body, footer }), text };
}

/* Confirmation to the lead ------------------------------------------------ */
export function confirmationEmail(d, settings) {
  const name = firstName(d.name);
  const subject = `Thanks, ${name}. We received your inquiry`;
  const steps = [
    ['We read your message', 'and take a look at your current website and marketing.'],
    ['We reply within one business day', 'to set up a free 30-minute strategy call.'],
    ['You get a clear proposal', 'with scope, timeline and a fixed price.'],
  ];

  const body = `
    <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:600;">Thanks, ${escapeHtml(name)}. <span style="font-family:${SERIF};font-style:italic;font-weight:400;color:${C.accentDeep};">Message received.</span></h1>
    <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#3a3833;">Thank you for reaching out to The Digital Agila. This is a quick note to confirm your inquiry reached us. Here's what happens next:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${steps.map(([b, rest], i) => `
      <tr>
        <td style="padding:10px 14px 10px 0;vertical-align:top;width:28px;">
          <div style="width:26px;height:26px;border-radius:50%;background:${C.paper};text-align:center;line-height:26px;font-size:13px;font-weight:600;color:${C.accentDeep};">${i + 1}</div>
        </td>
        <td style="padding:12px 0;font-size:15px;line-height:1.5;color:#3a3833;"><b style="color:${C.ink};">${b}</b> ${rest}</td>
      </tr>`).join('')}
    </table>
    <p style="margin:28px 0 10px;font-size:13px;color:${C.muted};letter-spacing:.04em;text-transform:uppercase;">What you sent us</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Interested in', escapeHtml(d.services || 'Not specified'))}
      ${row('Start', escapeHtml(d.timeline || 'Not specified'))}
      ${row('Message', nl2br(d.message))}
    </table>
    ${button(`${settings.siteUrl}/services.html`, 'Browse our services')}
    <p style="margin:30px 0 0;font-size:15px;line-height:1.6;color:#3a3833;">Talk soon,<br><b style="color:${C.ink};">${escapeHtml(settings.senderName)}</b><br><span style="color:${C.muted};">${escapeHtml(settings.senderTitle)}</span></p>`;

  const footer = `You're receiving this because you sent an inquiry through the contact form at ${escapeHtml(settings.siteUrl)}. If that wasn't you, you can ignore this email.<br>
    Need to add something? Just reply to this email.`;

  const text = [
    `Thanks, ${name}. Message received.`,
    '',
    'Thank you for reaching out to The Digital Agila. This is a quick note to confirm your inquiry reached us. Here is what happens next:',
    ...steps.map(([b, rest], i) => `${i + 1}. ${b} ${rest}`),
    '',
    `Interested in: ${d.services || 'Not specified'}`,
    `Start: ${d.timeline || 'Not specified'}`,
    'Message:',
    d.message,
    '',
    `Talk soon,\n${settings.senderName}\n${settings.senderTitle}`,
    '',
    `You received this because you sent an inquiry at ${settings.siteUrl}. Reply to this email to add anything.`,
  ].join('\n');

  return { subject, html: shell({ preheader: 'We received your inquiry and will reply within one business day.', body, footer }), text };
}
