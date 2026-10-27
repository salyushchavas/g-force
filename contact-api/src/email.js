// The enquiry email: readable plain text plus a simple HTML table. Every value is escaped for HTML; header values
// come only from validated single-line fields, and Nodemailer encodes them.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const torontoTime = (date) =>
  new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Toronto' }).format(date);

export function buildEnquiryEmail(data, { from, fromName, to }, date = new Date()) {
  const newsletter = data.newsletter
    ? `Yes: the visitor ticked the newsletter box${data.consentText ? ` ("${data.consentText}")` : ''}. They have NOT been subscribed automatically; add them to the mailing list by hand.`
    : 'No';
  const rows = [
    ['Name', data.name],
    ['Email', data.email],
    ['Phone', data.phone || 'Not given'],
    ['Company', data.company || 'Not given'],
    ['Interested in', data.interest || 'Not chosen'],
    ['Newsletter', newsletter],
    ['Sent from', `${data.source}${data.page ? ` (${data.page})` : ''}, ${torontoTime(date)} Toronto time`],
  ];
  const message = data.message || '(No message)';
  const subject = `Website enquiry${data.interest ? `: ${data.interest}` : ''} from ${data.name}`.slice(0, 150);

  const text = [
    'New enquiry from the G-Force website. Reply to this email to answer the visitor directly.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    message,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;font-size:15px;line-height:1.5">
<p>New enquiry from the G-Force website. Reply to this email to answer the visitor directly.</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
${rows.map(([label, value]) => `<tr><th align="left" valign="top" style="padding-right:16px;color:#56565d;font-weight:600">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('\n')}
</table>
<p style="margin-top:20px;color:#56565d;font-weight:600">Message</p>
<p style="white-space:pre-wrap;margin-top:4px">${escapeHtml(message)}</p>
</body></html>`;

  return {
    from: { name: fromName, address: from },
    to,
    replyTo: { name: data.name, address: data.email },
    subject,
    text,
    html,
  };
}
