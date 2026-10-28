// Server-side validation and sanitising of contact submissions. The browser's checks are a convenience only.

export const INTERESTS = {
  assessment: 'Free IT assessment',
  'managed-it': 'Managed IT',
  cybersecurity: 'Cybersecurity',
  'cloud-backup': 'Cloud and backup',
  training: 'IT training',
  consulting: 'IT consulting',
  other: 'Something else',
};
const SOURCES = new Set(['contact form', 'chat helper']);

const LIMITS = { name: 100, email: 254, phone: 40, company: 120, message: 5000, consent: 300, page: 200, score: 40, result: 80, fixes: 3000, answer: 200, answers: 20 };

// The website's forms. Contact enquiries come from the contact form and the chat helper; the rest are the newsletter
// sign-ups, the security checklist request and the IT health check result.
export const TYPES = new Set(['contact', 'newsletter', 'checklist', 'quiz']);

// Control characters other than tab/newline are dropped everywhere; single-line fields also lose newlines, so no
// value can start a new mail header.
const CONTROL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u2028\\u2029]', 'g');
const singleLine = (value) =>
  typeof value === 'string' ? value.replace(CONTROL, '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() : '';
const multiLine = (value) =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n').replace(CONTROL, '').replace(/\n{4,}/g, '\n\n\n').trim() : '';

// A practical address check: one @, no spaces or header characters, a dotted domain with a 2+ letter TLD.
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63}$/;
const PHONE = /^[0-9+().\-\s]{7,40}$/;

export function isEmail(value) {
  if (typeof value !== 'string' || value.length > LIMITS.email) return false;
  const [local] = value.split('@');
  return EMAIL.test(value) && local.length <= 64 && !value.includes('..');
}

const truthy = (value) => value === true || value === 'yes' || value === 'on' || value === 'true';

/** Returns { data } for a valid submission or { errors: { field: message } }. */
export function validateContact(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};

  const name = singleLine(body.name);
  if (!name) errors.name = 'Please add your name.';
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail) errors.email = 'Please add your email address.';
  else if (/[\r\n]/.test(rawEmail) || !isEmail(rawEmail)) errors.email = 'Please check your email address. It should look like name@company.ca.';
  const email = rawEmail.toLowerCase();

  const phone = singleLine(body.phone);
  if (phone && !PHONE.test(phone)) errors.phone = 'Please check the phone number, or leave it blank.';

  const company = singleLine(body.company);
  if (company.length > LIMITS.company) errors.company = `Please keep the company name under ${LIMITS.company} characters.`;

  const interestKey = singleLine(body.interest);
  if (interestKey && !Object.hasOwn(INTERESTS, interestKey)) errors.interest = 'Please choose one of the listed topics.';

  const message = multiLine(body.message);
  if (message.length > LIMITS.message) errors.message = `Please keep your message under ${LIMITS.message} characters.`;
  else if (interestKey === 'other' && !message) errors.message = 'Please tell us a little about what you need.';

  const newsletter = truthy(body.newsletter);
  const consentText = newsletter ? singleLine(body.consent_text).slice(0, LIMITS.consent) : '';

  const page = singleLine(body.page);
  const source = singleLine(body.source);

  if (Object.keys(errors).length) return { errors };
  return {
    data: {
      type: 'contact',
      name,
      email,
      phone,
      company,
      interest: interestKey ? INTERESTS[interestKey] : '',
      message,
      newsletter,
      consentText,
      page: page.startsWith('/') && page.length <= LIMITS.page ? page : '',
      source: SOURCES.has(source) ? source : 'contact form',
    },
  };
}

/** Validates any website form: { type } picks the form; contact is the default. Returns { data } or { errors }. */
export function validateLead(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const type = singleLine(body.type) || 'contact';
  if (!TYPES.has(type)) return { errors: { type: 'Unknown form.' } };
  if (type === 'contact') return validateContact(body);
  const errors = {};

  const name = singleLine(body.name);
  if (type === 'quiz' && !name) errors.name = 'Please add your name.';
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail) errors.email = 'Please add your email address.';
  else if (/[\r\n]/.test(rawEmail) || !isEmail(rawEmail)) errors.email = 'Please check your email address. It should look like name@company.ca.';

  const company = singleLine(body.company);
  if (company.length > LIMITS.company) errors.company = `Please keep the company name under ${LIMITS.company} characters.`;

  // A newsletter sign-up is only valid with the consent box ticked.
  const newsletter = truthy(body.newsletter);
  if (type === 'newsletter' && !newsletter) errors.newsletter = 'Please tick the box to confirm you want the monthly email.';
  const consentText = newsletter ? singleLine(body.consent_text).slice(0, LIMITS.consent) : '';

  let quiz;
  if (type === 'quiz') {
    const answers = [];
    for (const [key, value] of Object.entries(body)) {
      if (!/^answer_[A-Za-z0-9_-]{1,40}$/.test(key) || answers.length >= LIMITS.answers) continue;
      const v = singleLine(value).slice(0, LIMITS.answer);
      if (v) answers.push([key.slice(7).replace(/[_-]+/g, ' '), v]);
    }
    quiz = {
      score: singleLine(body.score).slice(0, LIMITS.score),
      result: singleLine(body.result).slice(0, LIMITS.result),
      fixes: singleLine(body.fixes).slice(0, LIMITS.fixes).split(' | ').map((f) => f.trim()).filter(Boolean),
      answers,
    };
  }

  if (Object.keys(errors).length) return { errors };
  const page = singleLine(body.page);
  return {
    data: {
      type,
      name,
      email: rawEmail.toLowerCase(),
      company,
      newsletter,
      consentText,
      page: page.startsWith('/') && page.length <= LIMITS.page ? page : '',
      ...(quiz ? { quiz } : {}),
    },
  };
}
