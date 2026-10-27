// One submit path for every form (contact, newsletter, quiz report, checklist).
// With PUBLIC_FORM_ENDPOINT set (Formspree, Web3Forms, a CRM webhook...), leads are POSTed as JSON and arrive in
// the inbox without the visitor doing anything else. PUBLIC_FORM_ACCESS_KEY is sent as `access_key` for services
// that want one in the body (Web3Forms); both values are public in the browser build, never private credentials.
// Without an endpoint (or when it fails), nothing is sent from here: the visitor is offered Gmail, Outlook, their
// email app or a copy of the message. A bare mailto: redirect silently does nothing for people who use webmail.
export type Compose = { gmail: string; outlook: string; app: string; text: string };
export type LeadResult = { ok: boolean; via: 'endpoint' | 'email' | 'spam'; message: string; compose?: Compose };

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
