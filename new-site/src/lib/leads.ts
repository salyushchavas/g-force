// One submit path for every form (contact, chat helper, newsletter, checklist, IT health check result).
// With PUBLIC_CONTACT_API_URL set, every form goes to G-Force's own email API (contact-api/, hosted on Railway): it
// sends the details to the company inbox in the background, so the visitor stays on the page and sees success only
// after the server has handed the email to SMTP. Failures show a plain message and the visitor can retry; nothing ever
// opens the visitor's email app. That URL is public; the SMTP credentials live only on the server.
// PUBLIC_FORM_ENDPOINT (Formspree, Web3Forms, a CRM webhook...) is an alternative for builds without the API.
export type Compose = { gmail: string; outlook: string; app: string; text: string };
export type LeadResult = { ok: boolean; via: 'api' | 'endpoint' | 'none' | 'spam'; message: string };

const CONTACT_API: string = import.meta.env.PUBLIC_CONTACT_API_URL ?? '';
const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
const ACCESS_KEY: string = import.meta.env.PUBLIC_FORM_ACCESS_KEY ?? '';
export const INBOX = 'info@gforceit.ca';
/** True when forms send by themselves (the build has the API or a form endpoint). */
export const AUTO_SEND = Boolean(CONTACT_API || ENDPOINT);

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
  if (CONTACT_API) return sendToApi(type, data);
  const payload: Record<string, string> = { form: type, page: location.pathname, submitted_at: new Date().toISOString(), ...data };
  delete payload.company_website;
  const subject = SUBJECTS[type] ?? 'Website enquiry';

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
      return { ok: false, via: 'endpoint', message: API_FAILURE };
    }
  }

  // Only a build with no sending service configured reaches this (local development).
  return { ok: false, via: 'none', message: `This form isn't connected yet. Please email ${INBOX} or call +1 (825) 606-9777.` };
}

const API_FAILURE = "We couldn't send your message just now. Please try again in a moment, or call +1 (825) 606-9777.";

async function sendToApi(type: string, data: Record<string, string>): Promise<LeadResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(apiPayload(type, data)),
      signal: controller.signal,
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; newsletter?: string };
    if (res.ok && body.ok) {
      // A newsletter request travels with the email; nobody is subscribed automatically, so none is claimed.
      const note = type !== 'newsletter' && body.newsletter === 'forwarded' ? ' Your newsletter request was sent too.' : '';
      return { ok: true, via: 'api', message: successText(type) + note };
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

// What each form sends to the API. Unknown fields are ignored by the server.
function apiPayload(type: string, data: Record<string, string>) {
  const { company_website: _hp, consent, newsletter_consent, ...rest } = data;
  return {
    ...rest,
    type,
    // The newsletter forms' required box is "consent"; the health check sends "newsletter_consent".
    newsletter: data.newsletter === 'yes' || consent === 'yes' || newsletter_consent === 'yes',
    page: location.pathname,
    source: data.source ?? 'contact form',
  };
}

function successText(type: string) {
  switch (type) {
    case 'newsletter':
      return 'Thanks. Your sign-up has been sent to the G-Force team.';
    case 'quiz':
      return 'Thanks. Your result has been sent to G-Force, and a specialist will reply within one business day.';
    case 'checklist':
      return 'Thanks. Your request has been sent, and G-Force will email you the checklist.';
    default:
      return 'Thanks, your message has been sent. A real person will reply within one business day.';
  }
}
