// The enquiry email: readable plain text plus a simple HTML table. Every value is escaped for HTML; header values
// come only from validated single-line fields, and Nodemailer encodes them.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const torontoTime = (date) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }).format(date);

const newsletterLine = (data) =>
  data.newsletter
    ? `Yes: the visitor ticked the newsletter box${data.consentText ? ` ("${data.consentText}")` : ''}. They have NOT been subscribed automatically; add them to the mailing list by hand.`
    : 'No';

const sentFrom = (data, label, date) => `${label}${data.page ? ` (${data.page})` : ''}, ${torontoTime(date)} Toronto time`;

// One layout for every form: an intro line, a table of fields, then optional titled blocks (message, fixes...).
function render({ intro, rows, blocks = [] }) {
  const text = [
    intro,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...blocks.flatMap(([title, body]) => ['', `${title}:`, body]),
  ].join('\n');
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;font-size:15px;line-height:1.5">
<p>${escapeHtml(intro)}</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
${rows.map(([label, value]) => `<tr><th align="left" valign="top" style="padding-right:16px;color:#56565d;font-weight:600">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('\n')}
</table>
${blocks.map(([title, body]) => `<p style="margin-top:20px;color:#56565d;font-weight:600">${escapeHtml(title)}</p>
<p style="white-space:pre-wrap;margin-top:4px">${escapeHtml(body)}</p>`).join('\n')}
</body></html>`;
  return { text, html };
}

const envelope = (data, { from, fromName, to }, subject, body) => ({
  from: { name: fromName, address: from },
  to,
  replyTo: data.name ? { name: data.name, address: data.email } : data.email,
  subject: subject.slice(0, 150),
  ...body,
});

export function buildEnquiryEmail(data, config, date = new Date()) {
  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || 'Not given'],
    ['Company', data.company || 'Not given'],
    ['Interested in', data.interest || 'Not chosen'],
    ['Newsletter', newsletterLine(data)],
    ['Sent from', sentFrom(data, data.source, date)],
  ];
  const subject = `Website enquiry${data.interest ? `: ${data.interest}` : ''} from ${data.name}`;
  return envelope(data, config, subject, render({
    intro: 'New enquiry from the G-Force website. Reply to this email to answer the visitor directly.',
    rows,
    blocks: [['Message', data.message || '(No message)']],
  }));
}

/** The email for any website form (contact, newsletter, checklist, quiz). */
export function buildLeadEmail(data, config, date = new Date()) {
  if (data.type === 'newsletter') {
    return envelope(data, config, `Newsletter sign-up: ${data.email}`, render({
      intro: 'Someone signed up for the monthly IT security notes on the G-Force website. They have NOT been subscribed automatically: add this address to the mailing list by hand.',
      rows: [
        ['Email', data.email],
        ...(data.name ? [['Name', data.name]] : []),
        ['Consent', data.consentText ? `"${data.consentText}"` : 'Ticked the consent box'],
        ['Sent from', sentFrom(data, 'Newsletter form', date)],
      ],
    }));
  }
  if (data.type === 'checklist') {
    return envelope(data, config, `Security checklist request from ${data.name || data.email}`, render({
      intro: 'Someone asked for the IT security checklist on the G-Force website. Reply to this email to send it to them.',
      rows: [
        ['Name', data.name || 'Not given'],
        ['Email', data.email],
        ['Newsletter', newsletterLine(data)],
        ['Sent from', sentFrom(data, 'Security checklist page', date)],
      ],
    }));
  }
  if (data.type === 'quiz') {
    const q = data.quiz;
    return envelope(data, config, `IT health check result${q.result ? `: ${q.result}` : ''} from ${data.name}`, render({
      intro: 'Someone completed the IT health check on the G-Force website and sent their result. Reply to this email to follow up with them directly.',
      rows: [
        ['Name', data.name],
        ['Email', data.email],
        ['Company', data.company || 'Not given'],
        ['Score', q.score || 'Not given'],
        ['Result', q.result || 'Not given'],
        ['Newsletter', newsletterLine(data)],
        ['Sent from', sentFrom(data, 'IT health check', date)],
      ],
      blocks: [
        ...(q.fixes.length ? [['Suggested fixes', q.fixes.map((f) => `- ${f}`).join('\n')]] : []),
        ...(q.answers.length ? [['Answers', q.answers.map(([k, v]) => `${k}: ${v}`).join('\n')]] : []),
      ],
    }));
  }
  return buildEnquiryEmail(data, config, date);
}
