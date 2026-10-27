// One submit path for every form (contact, newsletter, quiz report, checklist).
// Contact enquiries (the contact form and the chat helper) go to G-Force's own email API when PUBLIC_CONTACT_API_URL
// is set (contact-api/, hosted on Railway): it sends them through the company mailbox in the background, so the
// visitor stays on the page and sees success only after the server has handed the email to SMTP. That URL is public;
// the SMTP credentials live only on the server.
// With PUBLIC_FORM_ENDPOINT set (Formspree, Web3Forms, a CRM webhook...), leads are POSTed as JSON and arrive in
// the inbox without the visitor doing anything else. PUBLIC_FORM_ACCESS_KEY is sent as `access_key` for services
// that want one in the body (Web3Forms); both values are public in the browser build, never private credentials.
// Without an endpoint (or when it fails), nothing is sent from here: the visitor is offered Gmail, Outlook, their
// email app or a copy of the message. A bare mailto: redirect silently does nothing for people who use webmail.
export type Compose = { gmail: string; outlook: string; app: string; text: string };
export type LeadResult = { ok: boolean; via: 'api' | 'endpoint' | 'email' | 'spam'; message: string; compose?: Compose };

const CONTACT_API: string = import.meta.env.PUBLIC_CONTACT_API_URL ?? '';
const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
const ACCESS_KEY: string = import.meta.env.PUBLIC_FORM_ACCESS_KEY ?? '';
export const INBOX = 'info@gforceit.ca';

const SUBJECTS: Record<string, string> = {
  contact: 'Website enquiry',
  newsletter: 'Newsletter subscription',
  quiz: 'IT health check results',
  checklist: 'Security checklist request',
  assessment: 'Free IT assessment request',
};

// Ready-made "write this email" links for the three ways people actually send mail.
export function composeLinks(subject: string, body: string, to = INBOX): Compose {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${s}&body=${b}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${s}&body=${b}`,
    app: `mailto:${to}?subject=${s}&body=${b}`,
    text: `To: ${to}\nSubject: ${subject}\n\n${body}`,
  };
}

export async function submitLead(type: string, data: Record<string, string>): Promise<LeadResult> {
  if (data.company_website) return { ok: true, via: 'spam', message: 'Thanks, we have your details.' };
  if (type === 'contact' && CONTACT_API) return sendToContactApi(data);
  const payload: Record<string, string> = { form: type, page: location.pathname, submitted_at: new Date().toISOString(), ...data };
  delete payload.company_website;

  const subject = SUBJECTS[type] ?? 'Website enquiry';
  const body = Object.entries(payload)
    .filter(([k, v]) => v && !['form', 'submitted_at'].includes(k))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n');
  const compose = composeLinks(subject, body);

  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...(ACCESS_KEY ? { access_key: ACCESS_KEY } : {}), subject, from_name: 'G-Force website', ...payload }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return { ok: true, via: 'endpoint', message: successText(type) };
    } catch {
      return {
        ok: false,
        via: 'endpoint',
        message: `This didn't go through. Send it another way below, or call +1 (825) 606-9777.`,
        compose,
      };
    }
  }

  return {
    ok: true,
    via: 'email',
    message: `Nearly done. Nothing has been sent yet: choose how to send this to ${INBOX}.`,
    compose,
  };
}

const API_FAILURE = "We couldn't send your message just now. Please try again in a moment, or call +1 (825) 606-9777.";

async function sendToContactApi(data: Record<string, string>): Promise<LeadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        interest: data.interest,
        message: data.message,
        newsletter: data.newsletter === 'yes',
        consent_text: data.consent_text,
        page: location.pathname,
        source: data.source ?? 'contact form',
      }),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; newsletter?: string };
    if (res.ok && body.ok) {
      // The newsletter request travels with the email; nobody is subscribed automatically, so none is claimed.
      const note = body.newsletter === 'forwarded' ? ' Your newsletter request was sent with your message.' : '';
      return { ok: true, via: 'api', message: `Thanks, your message has been sent. ${successText('contact').replace(/^Thanks\. /, '')}${note}` };
    }
    // Field problems and rate limits carry their own plain message; anything else stays generic.
    const own = [400, 413, 429].includes(res.status) && typeof body.message === 'string' ? body.message : '';
    return { ok: false, via: 'api', message: own || API_FAILURE };
  } catch {
    return { ok: false, via: 'api', message: API_FAILURE };
  } finally {
    clearTimeout(timer);
  }
}

// The send-it-yourself choices, for plain DOM forms and the chat. React forms render the same links themselves.
export function renderSendChoices(after: HTMLElement, compose: Compose | undefined) {
  after.parentElement?.querySelector(':scope > .send-choices')?.remove();
  if (!compose) return;
  const wrap = document.createElement('div');
  wrap.className = 'send-choices';
  const link = (label: string, href: string, newTab: boolean) => {
    const a = document.createElement('a');
    a.className = 'btn btn-secondary';
    a.href = href;
    a.textContent = label;
    if (newTab) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
    return a;
  };
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-secondary';
  copy.textContent = 'Copy message';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(compose.text);
      copy.textContent = `Copied. Paste it into an email to ${INBOX}`;
    } catch {
      copy.textContent = `Please email ${INBOX}`;
    }
  });
  wrap.append(link('Gmail', compose.gmail, true), link('Outlook', compose.outlook, true), link('Email app', compose.app, false), copy);
  after.after(wrap);
}

function successText(type: string) {
  switch (type) {
    case 'newsletter':
      return 'Thanks. Watch your inbox for a confirmation email.';
    case 'quiz':
      return 'Thanks. Your report is on its way, and a specialist will follow up within one business day.';
    case 'checklist':
      return 'Thanks. The checklist is on its way to your inbox.';
    default:
      return 'Thanks. A real person will reply within one business day.';
  }
}
