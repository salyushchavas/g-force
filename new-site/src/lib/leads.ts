// One submit path for every form (contact, newsletter, quiz report, checklist).
// With PUBLIC_FORM_ENDPOINT set (Formspree, Web3Forms, a CRM webhook...), leads are POSTed as JSON.
// Without it, the visitor's email app opens pre-filled, so an enquiry is never silently lost.
export type LeadResult = { ok: boolean; via: 'endpoint' | 'email' | 'spam'; message: string };

const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? '';
const INBOX = 'info@gforceit.ca';

const SUBJECTS: Record<string, string> = {
  contact: 'Website enquiry',
  newsletter: 'Newsletter subscription',
  quiz: 'IT health check results',
  checklist: 'Security checklist request',
  assessment: 'Free IT assessment request',
};

export async function submitLead(type: string, data: Record<string, string>): Promise<LeadResult> {
  if (data.company_website) return { ok: true, via: 'spam', message: 'Thanks, we have your details.' };
  const payload = { form: type, page: location.pathname, submitted_at: new Date().toISOString(), ...data };
  delete (payload as Record<string, string>).company_website;

  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      return { ok: true, via: 'endpoint', message: successText(type) };
    } catch {
      return {
        ok: false,
        via: 'endpoint',
        message: `Something went wrong sending this. Please email ${INBOX} or call +1 (825) 606-9777.`,
      };
    }
  }

  const lines = Object.entries(payload)
    .filter(([k, v]) => v && !['form', 'submitted_at'].includes(k))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
  const href = `mailto:${INBOX}?subject=${encodeURIComponent(SUBJECTS[type] ?? 'Website enquiry')}&body=${encodeURIComponent(lines.join('\n'))}`;
  window.location.href = href;
  return {
    ok: true,
    via: 'email',
    message: `Your email app should open with these details ready to send. If it doesn't, email ${INBOX}.`,
  };
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
