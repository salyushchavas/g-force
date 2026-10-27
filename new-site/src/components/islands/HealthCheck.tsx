// IT health check: the PDF's "5-question quiz that gives a score and captures leads".
// One question per step with real radios (arrow keys move, Enter continues), a score ring that fills as the
// points add up, the fixes that matter for these answers, and an optional form that sends the result to G-Force.
// With PUBLIC_FORM_ENDPOINT set, the result is posted and emailed back; without it, the visitor's own email app
// opens with the result addressed to G-Force, so the copy never promises an email that nothing sends.
// Answers live in component state only. Nothing is stored, and nothing is sent until the visitor asks.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, KeyboardEvent, Ref } from 'react';
import { quiz } from '../../data/site';
import { submitLead } from '../../lib/leads';

type Question = (typeof quiz.questions)[number];
type Option = Question['options'][number];
type Band = (typeof quiz.bands)[number];
type Answer = { q: Question; opt: Option; max: number };
type Heading = 'h3' | 'h4';

type Props = {
  /** "night" sets the panel on night surfaces; "surface" follows the page theme. */
  tone?: 'night' | 'surface';
  /** Level of the panel title. Sub-headings use the next level down. */
  headingLevel?: 2 | 3;
  headingId?: string;
  intro?: string;
};

const QUESTIONS = quiz.questions;
const TOTAL = QUESTIONS.length;
const topScore = (q: Question) => Math.max(...q.options.map((o) => o.score));
const MAX = QUESTIONS.reduce((sum, q) => sum + topScore(q), 0);
const BANDS = [...quiz.bands].sort((a, b) => b.min - a.min);
const bandFor = (score: number): Band => BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];

// Plain names for the five areas, used in the fixes list and the emailed report.
const AREA: Record<string, string> = {
  backup: 'Backups',
  mfa: 'Multi-factor authentication',
  patching: 'Updates',
  devices: 'Device encryption',
  support: 'Support',
};

const ASSESSMENT_HREF = '/contact/?interest=assessment#contact-form';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;
const HAS_ENDPOINT = Boolean(import.meta.env.PUBLIC_FORM_ENDPOINT);
const INBOX = 'info@gforceit.ca';
const CONSENT_LABEL = 'Also email me G-Force’s monthly IT security notes. I can unsubscribe at any time.';

const motionOK = () => typeof document !== 'undefined' && document.documentElement.classList.contains('motion-ok');
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** A pie wedge from 12 o'clock, clockwise to `deg`, as a clip-path over a square box. */
function wedge(deg: number) {
  const points = ['50% 50%', '50% 0%'];
  const corners = [
    [45, '100% 0%'],
    [135, '100% 100%'],
    [225, '0% 100%'],
    [315, '0% 0%'],
  ] as const;
  for (const [at, corner] of corners) if (deg > at) points.push(corner);
  const rad = (deg * Math.PI) / 180;
  const x = Math.sin(rad);
  const y = -Math.cos(rad);
  const k = 50 / Math.max(Math.abs(x), Math.abs(y));
  points.push(`${(50 + x * k).toFixed(2)}% ${(50 + y * k).toFixed(2)}%`);
  return `polygon(${points.join(', ')})`;
}

/** If a step change leaves the panel's top under the fixed header, scroll it back into view. */
function bringIntoView(panel: HTMLElement | null) {
  if (!panel) return false;
  const offset = 96;
  const top = panel.getBoundingClientRect().top;
  if (top >= offset - 24) return false;
  const lenis = (window as Window & { __lenis?: { scrollTo: (t: HTMLElement, o?: { offset?: number }) => void } }).__lenis;
  if (lenis) lenis.scrollTo(panel, { offset: -offset });
  else window.scrollTo({ top: window.scrollY + top - offset, behavior: motionOK() ? 'smooth' : 'auto' });
  return true;
}

/** Prints the panel alone (the rest of the page is hidden for the print), for paper or "Save as PDF". */
function printResult(panel: HTMLElement | null) {
  const root = document.documentElement;
  const done = () => {
    root.removeAttribute('data-print');
    panel?.removeAttribute('data-print-target');
    removeEventListener('afterprint', done);
  };
  panel?.setAttribute('data-print-target', '');
  root.setAttribute('data-print', 'health-check');
  addEventListener('afterprint', done);
  window.print();
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
);

/** The contact form's error mark: a filled circle with a cut-out "!", so an error never relies on colour. */
const Alert = () => (
  <svg className="hc-alert" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" fillRule="evenodd" d="M12 2a10 10 0 1 1 0 20a10 10 0 0 1 0-20zm-1 4.5h2v7h-2zm0 9h2v2h-2z" />
  </svg>
);

export default function HealthCheck({
  tone = 'night',
  headingLevel = 3,
  headingId,
  intro = 'Takes about two minutes. Nothing is saved, and nothing is sent unless you ask.',
}: Props) {
  const uid = useId();
  const titleId = headingId ?? `${uid}title`;
  const Title = `h${headingLevel}` as 'h2' | 'h3';
  const Sub = `h${headingLevel + 1}` as Heading;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => QUESTIONS.map(() => null));
  const [dir, setDir] = useState<'fwd' | 'back' | null>(null);
  const [hint, setHint] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLFieldSetElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const navigated = useRef(false);

  const done = step >= TOTAL;
  const question = QUESTIONS[Math.min(step, TOTAL - 1)];

  // A radio picked before the island hydrated is kept, not silently cleared.
  useEffect(() => {
    const picked = stepRef.current?.querySelector<HTMLInputElement>('input:checked');
    if (picked) setAnswers((prev) => prev.map((v, i) => (i === 0 ? Number(picked.value) : v)));
  }, []);

  // After a step change, focus the answer (or the result heading) so keyboard and screen reader users follow along.
  useEffect(() => {
    if (!navigated.current) return;
    const fieldset = stepRef.current;
    const target = done
      ? resultRef.current
      : (fieldset?.querySelector<HTMLInputElement>('input:checked') ?? fieldset?.querySelector<HTMLInputElement>('input'));
    const scrolled = bringIntoView(panelRef.current);
    target?.focus({ preventScroll: scrolled });
  }, [step, done]);

  const choose = (index: number) => {
    setAnswers((prev) => prev.map((v, i) => (i === step ? index : v)));
    setHint('');
  };

  const go = (to: number, direction: 'fwd' | 'back') => {
    navigated.current = true;
    setDir(direction);
    setHint('');
    setStep(to);
  };

  const next = () => {
    if (answers[step] == null) {
      setHint('Choose an answer to continue.');
      stepRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    go(step + 1, 'fwd');
  };

  const back = () => go(Math.max(0, step - 1), 'back');

  const restart = () => {
    setAnswers(QUESTIONS.map(() => null));
    go(0, 'back');
  };

  const onRadioKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    next();
  };

  const picks: Answer[] = QUESTIONS.map((q, i) => ({ q, opt: q.options[answers[i] ?? 0], max: topScore(q) }));
  const score = picks.reduce((sum, p) => sum + p.opt.score, 0);
  const progress = done ? 1 : (step + 1) / TOTAL;

  return (
    <div ref={panelRef} className={`hc ${tone === 'night' ? 'band-night hc-night' : 'hc-surface'}`}>
      <div className="hc-head">
        <Title id={titleId} className="hc-title t-h4">
          IT health check
        </Title>
        <p className="hc-count t-meta" aria-hidden="true">
          {done ? (
            'Your result'
          ) : (
            <>
              Question <span className="t-num">{step + 1}</span> of <span className="t-num">{TOTAL}</span>
            </>
          )}
        </p>
      </div>
      <div className="hc-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {done ? (
        <Result picks={picks} score={score} Sub={Sub} headingRef={resultRef} uid={uid} onRestart={restart} />
      ) : (
        <>
          {intro && <p className="hc-intro">{intro}</p>}
          <div className="hc-stage">
            <fieldset ref={stepRef} key={step} className="hc-step" data-dir={dir ?? undefined}>
              <legend className="hc-q t-h3">
                <span className="sr-only">
                  Question {step + 1} of {TOTAL}:{' '}
                </span>
                {question.q}
              </legend>
              <div className="hc-options">
                {question.options.map((o, i) => (
                  <label key={o.label} className="hc-option" data-checked={answers[step] === i ? '' : undefined}>
                    <input
                      className="hc-radio"
                      type="radio"
                      name={`${uid}${question.id}`}
                      value={i}
                      defaultChecked={answers[step] === i}
                      onChange={() => choose(i)}
                      onKeyDown={onRadioKey}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="hc-hint t-meta" role="status">
              {hint && (
                <>
                  <Alert />
                  {hint}
                </>
              )}
            </p>
            <div className="hc-nav">
              {step > 0 && (
                <button type="button" className="btn btn-secondary" onClick={back}>
                  Back
                </button>
              )}
              <button type="button" className="btn btn-primary hc-next" onClick={next}>
                {step === TOTAL - 1 ? 'See my score' : 'Next question'}
                <span className="btn-arrow">
                  <Arrow />
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      <style>{CSS}</style>
    </div>
  );
}

function Result({
  picks,
  score,
  Sub,
  headingRef,
  uid,
  onRestart,
}: {
  picks: Answer[];
  score: number;
  Sub: Heading;
  headingRef: Ref<HTMLHeadingElement>;
  uid: string;
  onRestart: () => void;
}) {
  const band = bandFor(score);
  // Weakest answers first; stable sort keeps question order within a tie.
  const fixes = picks.filter((p) => p.opt.tip).sort((a, b) => a.opt.score - b.opt.score);

  return (
    <div className="hc-result">
      <div className="hc-summary">
        <ScoreRing score={score} />
        <div>
          <Sub ref={headingRef} tabIndex={-1} className="hc-band t-h3">
            <span className="sr-only">
              Your score is {score} out of {MAX}.{' '}
            </span>
            {band.label}
          </Sub>
          <p className="hc-band-body">{band.body}</p>
        </div>
      </div>

      {fixes.length > 0 && (
        <div className="hc-fixes">
          <Sub className="hc-sub t-h4">What to fix first</Sub>
          <ol className="hc-fix-list">
            {fixes.map((p, i) => (
              <li key={p.q.id} className="hc-fix" style={{ '--i': i } as CSSProperties}>
                <p className="hc-fix-area t-meta">
                  {AREA[p.q.id] ?? p.q.q}
                  <span className="t-num">
                    {' '}
                    · {p.opt.score} of {p.max}
                  </span>
                </p>
                <p className="hc-fix-tip">{p.opt.tip}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="hc-actions">
        <a className="btn btn-primary" href={ASSESSMENT_HREF}>
          Book a free IT assessment
          <span className="btn-arrow">
            <Arrow />
          </span>
        </a>
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Start again
        </button>
      </div>

      <ReportForm picks={picks} fixes={fixes} score={score} band={band} Sub={Sub} uid={uid} />
    </div>
  );
}

/** Fills clockwise in step with the counter (clip-path wedge, 1.2 s expo-out). Static under reduced motion. */
function ScoreRing({ score }: { score: number }) {
  const [p, setP] = useState(() => (motionOK() ? 0 : 1));

  useEffect(() => {
    if (!motionOK()) {
      setP(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 1200);
      setP(expoOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const share = MAX ? score / MAX : 0;
  return (
    <div className="hc-ring" aria-hidden="true">
      <svg viewBox="0 0 120 120" focusable="false">
        <circle className="hc-ring-track" cx="60" cy="60" r={RING_R} />
      </svg>
      <div className="hc-ring-arc" style={{ clipPath: p < 1 ? wedge(360 * share * p) : undefined }}>
        <svg viewBox="0 0 120 120" focusable="false">
          <circle
            className="hc-ring-fill"
            cx="60"
            cy="60"
            r={RING_R}
            strokeDasharray={`${(RING_C * share).toFixed(2)} ${RING_C.toFixed(2)}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
      </div>
      <p className="hc-ring-num">
        <span>
          <span className="hc-ring-val t-num">{Math.round(score * p)}</span>
          <span className="hc-ring-max t-num">/{MAX}</span>
        </span>
      </p>
    </div>
  );
}

function ReportForm({
  picks,
  fixes,
  score,
  band,
  Sub,
  uid,
}: {
  picks: Answer[];
  fixes: Answer[];
  score: number;
  band: Band;
  Sub: Heading;
  uid: string;
}) {
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [status, setStatus] = useState<{ text: string; state: 'ok' | 'error' | '' }>({ text: '', state: '' });
  const [sending, setSending] = useState(false);
  const id = (k: string) => `${uid}report-${k}`;

  const clear = (field: 'name' | 'email') => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const value = (k: string) => String(fd.get(k) ?? '').trim();
    const name = value('name');
    const email = value('email');

    const found: typeof errors = {};
    if (!name) found.name = 'Enter your name.';
    if (!email) found.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email)) found.email = 'Check the email address. It should look like name@company.ca.';
    setErrors(found);
    if (found.name || found.email) {
      setStatus({ text: '', state: '' });
      form.querySelector<HTMLInputElement>(found.name ? '[name="name"]' : '[name="email"]')?.focus();
      return;
    }

    const consented = Boolean(fd.get('newsletter'));
    const data: Record<string, string> = {
      name,
      email,
      company: value('company'),
      newsletter_consent: consented ? 'yes' : 'no',
      score: `${score} out of ${MAX}`,
      result: band.label,
      fixes: fixes.map((p) => `${AREA[p.q.id] ?? p.q.id}: ${p.opt.tip}`).join(' | '),
      company_website: String(fd.get('company_website') ?? ''),
    };
    // The exact wording the visitor agreed to travels with a consent (privacy policy: a record of the consent).
    if (consented) data.consent_text = value('consent_text');
    for (const p of picks) data[`answer_${p.q.id}`] = `${p.opt.label} (${p.opt.score} of ${p.max})`;

    setSending(true);
    setStatus({ text: '', state: '' });
    const res = await submitLead('quiz', data);
    setSending(false);
    setStatus({ text: res.message, state: res.ok ? 'ok' : 'error' });
    if (res.ok && res.via === 'endpoint') form.reset();
  };

  // Without a form endpoint nothing on our side can send an email, so the copy says what really happens.
  const copy = HAS_ENDPOINT
    ? {
        title: 'Email me this report',
        sub: 'We’ll email you this result, and a specialist will follow up within one business day.',
        submit: 'Email me the report',
        busy: 'Sending…',
        privacy: 'We use these details to send the report and follow up on it.',
      }
    : {
        title: 'Send my result to G-Force',
        sub: `Your email app opens with your score and answers, addressed to ${INBOX}. A specialist replies within one business day.`,
        submit: 'Open my email app',
        busy: 'Opening…',
        privacy: 'We use these details to reply to you and follow up on your result.',
      };

  return (
    <form className="hc-lead" onSubmit={onSubmit} noValidate aria-labelledby={id('title')}>
      <Sub id={id('title')} className="hc-sub t-h4">
        {copy.title}
      </Sub>
      <p className="hc-lead-sub">{copy.sub}</p>

      <div className="hc-fields">
        <div>
          <label className="field-label" htmlFor={id('name')}>
            Name
          </label>
          <input
            id={id('name')}
            className="field"
            name="name"
            autoComplete="name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? id('name-err') : undefined}
            onInput={() => clear('name')}
          />
          {errors.name && (
            <p id={id('name-err')} className="hc-err t-meta">
              <Alert />
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label className="field-label" htmlFor={id('email')}>
            Email
          </label>
          <input
            id={id('email')}
            className="field"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? id('email-err') : undefined}
            onInput={() => clear('email')}
          />
          {errors.email && (
            <p id={id('email-err')} className="hc-err t-meta">
              <Alert />
              {errors.email}
            </p>
          )}
        </div>
        <div className="hc-wide">
          <label className="field-label" htmlFor={id('company')}>
            Company <span className="hc-optional">(optional)</span>
          </label>
          <input id={id('company')} className="field" name="company" autoComplete="organization" />
        </div>
      </div>

      <label className="hc-consent">
        <input type="checkbox" name="newsletter" value="yes" />
        <span>{CONSENT_LABEL}</span>
      </label>
      <input type="hidden" name="consent_text" value={CONSENT_LABEL} />

      <div className="hc-hp" aria-hidden="true">
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="hc-privacy">
        {copy.privacy} Read our <a href="/privacy/">privacy policy</a>.
      </p>

      <div className="hc-send">
        <button type="submit" className="btn btn-primary" aria-disabled={sending || undefined}>
          {sending ? copy.busy : copy.submit}
        </button>
        {!HAS_ENDPOINT && (
          <button type="button" className="btn btn-secondary" onClick={(e) => printResult(e.currentTarget.closest<HTMLElement>('.hc'))}>
            Print or save this result
          </button>
        )}
      </div>
      <p className="hc-status t-meta" role="status" aria-live="polite" data-state={status.state || undefined}>
        {status.state === 'error' && <Alert />}
        {status.text}
      </p>
    </form>
  );
}

const CSS = `
.hc { --hc-control: color-mix(in oklch, var(--text-muted) 72%, var(--hc-panel)); container-type: inline-size; position: relative; isolation: isolate; overflow: hidden; overflow: clip; padding: clamp(1.25rem, 0.8rem + 2.2vw, 2.5rem); border-radius: var(--radius-card); color: var(--text); }
.hc.hc-night { --hc-panel: var(--bg); --hc-option: var(--surface); background: radial-gradient(80% 55% at 100% 0%, color-mix(in oklch, var(--color-dusk-500) 32%, transparent), transparent 70%), var(--hc-panel); }
.hc.hc-surface { --hc-panel: var(--surface); --hc-option: var(--bg); background: var(--hc-panel); border: 1px solid var(--line); }

.hc-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.25rem 1rem; }
.hc-count { color: var(--text-muted); }
.hc-bar { position: relative; height: 2px; margin-top: 0.9rem; overflow: hidden; border-radius: 2px; background: var(--line-strong); }
.hc-bar > span { position: absolute; inset: 0; background: var(--accent); transform-origin: 0 50%; transition: transform 700ms var(--ease-out-expo); }
.hc-intro { margin-top: 0.9rem; max-width: 52ch; color: var(--text-muted); font-size: 0.9375rem; line-height: 1.5; }

.hc-stage { margin-top: clamp(1.75rem, 1.25rem + 2vw, 2.5rem); }
.hc-step { min-width: 0; margin: 0; padding: 0; border: 0; }
.hc-q { float: left; width: 100%; margin: 0 0 1.25rem; padding: 0; text-wrap: balance; }
.hc-options { clear: both; display: grid; gap: 0.625rem; }
.hc-option { display: flex; align-items: center; gap: 0.9rem; min-height: 3.5rem; padding: 0.8rem 1.1rem; border: 1px solid var(--line-strong); border-radius: var(--radius-card); background: var(--hc-option); font-weight: 550; line-height: 1.4; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background-color 160ms var(--ease-out-quart), border-color 160ms var(--ease-out-quart); }
.hc-option:hover { background: var(--surface-2); border-color: var(--hc-control); }
.hc-option[data-checked] { border-color: var(--accent-ink); background: var(--accent-tint); }
.hc-radio { flex-shrink: 0; display: grid; place-content: center; width: 1.25rem; height: 1.25rem; margin: 0; border: 1.5px solid var(--hc-control); border-radius: 50%; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; transition: border-color 160ms var(--ease-out-quart); }
.hc-radio::before { content: ''; width: 0.625rem; height: 0.625rem; border-radius: 50%; background: var(--accent-ink); transform: scale(0); transition: transform 240ms var(--ease-out-expo); }
.hc-radio:checked { border-color: var(--accent-ink); }
.hc-radio:checked::before { transform: scale(1); }
@supports selector(:has(*)) {
  .hc-option:has(.hc-radio:checked) { border-color: var(--accent-ink); background: var(--accent-tint); }
  .hc-option:has(.hc-radio:focus-visible) { outline: 2px solid var(--focus); outline-offset: 3px; }
  .hc-option .hc-radio:focus-visible { outline: none; }
}
/* Errors read as errors without colour: ink, heavier, with the alert mark (signal blue is the focus ring's colour). */
.hc-alert { flex: none; margin-top: 0.1rem; }
.hc-hint { display: flex; gap: 0.4rem; align-items: flex-start; min-height: 1.4em; margin-top: 0.75rem; color: var(--text); font-weight: 600; }
.hc-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
.hc-next { margin-inline-start: auto; }
/* Narrow panels: full-width buttons, "Next question" on top, clear of anything floating at the screen's edge. */
@container (max-width: 30rem) {
  .hc-nav { flex-direction: column-reverse; align-items: stretch; }
  .hc-next { margin-inline-start: 0; justify-content: center; }
}

.hc-result { margin-top: clamp(1.75rem, 1.25rem + 2vw, 2.5rem); }
.hc-summary { display: grid; gap: 1.5rem; align-items: center; }
.hc-ring { position: relative; width: clamp(8.5rem, 32cqi, 11rem); aspect-ratio: 1; }
.hc-ring svg, .hc-ring-arc { position: absolute; inset: 0; width: 100%; height: 100%; }
.hc-ring-track { fill: none; stroke: var(--line-strong); stroke-width: 1.5; }
.hc-ring-fill { fill: none; stroke: var(--accent-ink); stroke-width: 8; }
.hc-ring-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; line-height: 1; }
.hc-ring-num > span { display: inline-flex; align-items: baseline; }
.hc-ring-val { font-size: clamp(2.25rem, 1.75rem + 2.5cqi, 3rem); font-weight: 700; letter-spacing: -0.035em; }
.hc-ring-max { margin-inline-start: 0.1rem; color: var(--text-muted); font-size: 0.9375rem; font-weight: 600; }
.hc-band:focus { outline: none; }
.hc-band-body { margin-top: 0.6rem; max-width: 46ch; color: var(--text-muted); }
.hc-fixes { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
.hc-fix-list { display: grid; gap: 1.1rem; margin: 1rem 0 0; padding: 0; list-style: none; }
.hc-fix { position: relative; padding-inline-start: 1.15rem; }
.hc-fix::before { content: ''; position: absolute; left: 0; top: 0.42rem; width: 0.4rem; height: 0.4rem; border-radius: 50%; background: var(--accent-ink); }
.hc-fix-area { color: var(--text-muted); }
.hc-fix-tip { margin-top: 0.15rem; max-width: 58ch; }
.hc-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 2rem; }

.hc-lead { margin-top: 2.25rem; padding-top: 1.75rem; border-top: 1px solid var(--line); }
.hc-lead-sub { margin-top: 0.4rem; max-width: 54ch; color: var(--text-muted); font-size: 0.9375rem; }
.hc-fields { display: grid; gap: 1rem; margin-top: 1.25rem; }
.hc .field { background: var(--hc-option); border-color: var(--hc-control); }
.hc .field:hover { border-color: var(--text-muted); }
.hc .field:focus-visible { border-color: var(--focus); }
.hc .field[aria-invalid='true'] { border-color: var(--text); box-shadow: inset 0 0 0 1px var(--text); }
.hc .field[aria-invalid='true']:focus-visible { box-shadow: inset 0 0 0 1px var(--text), 0 0 0 3px color-mix(in oklch, var(--focus) 28%, transparent); }
.hc-optional { color: var(--text-muted); font-weight: 500; }
.hc-err { display: flex; gap: 0.4rem; align-items: flex-start; margin-top: 0.4rem; color: var(--text); font-weight: 600; }
.hc-consent { display: flex; align-items: flex-start; gap: 0.75rem; margin-top: 1.25rem; padding-block: 0.2rem; font-size: 0.9375rem; line-height: 1.45; cursor: pointer; }
.hc-consent input { flex-shrink: 0; width: 1.25rem; height: 1.25rem; margin: 0.1rem 0 0; accent-color: var(--accent); cursor: pointer; }
.hc-privacy { margin-top: 0.75rem; color: var(--text-muted); font-size: 0.875rem; line-height: 1.5; }
.hc-privacy a { color: var(--text); text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: 0.2em; }
.hc-privacy a:hover { text-decoration-color: var(--accent); }
.hc-send { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; }
.hc-status { margin-top: 0.9rem; }
.hc-status[data-state='error'] { display: flex; gap: 0.4rem; align-items: flex-start; color: var(--text); font-weight: 600; }
.hc-hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }

/* "Print or save this result": only the panel's section prints, in light ink, without the form or buttons. */
@media print {
  html[data-print='health-check'] body > :not(main) { display: none !important; }
  html[data-print='health-check'] main > :not(:has([data-print-target])) { display: none !important; }
  html[data-print='health-check'] :is(main, main > *, [data-print-target]) {
    --text: var(--color-air-ink); --text-muted: var(--color-mist-600); --line: var(--color-mist-200); --line-strong: var(--color-mist-300);
    --accent: var(--color-air-ink); --accent-ink: var(--color-signal); --accent-tint: transparent;
    color: var(--text);
  }
  html[data-print='health-check'] main > * { padding-block: 0; background: none; }
  html[data-print='health-check'] [data-print-target] { padding: 0; border: 0; background: none; }
  html[data-print='health-check'] [data-print-target] :is(.hc-lead, .hc-actions) { display: none !important; }
}

@container (max-width: 22rem) {
  .hc .btn { padding-inline: 1.1rem; font-size: 0.9375rem; }
}
@container (min-width: 30rem) {
  .hc-summary { grid-template-columns: auto minmax(0, 1fr); column-gap: clamp(1.5rem, 5cqi, 2.5rem); }
}
@container (min-width: 34rem) {
  .hc-fields { grid-template-columns: 1fr 1fr; }
  .hc-wide { grid-column: 1 / -1; }
}

.motion-ok .hc-step[data-dir='fwd'] { animation: hc-from-right 560ms var(--ease-out-expo) both; }
.motion-ok .hc-step[data-dir='back'] { animation: hc-from-left 560ms var(--ease-out-expo) both; }
.motion-ok .hc-result { animation: hc-fade 480ms var(--ease-out-quart) both; }
.motion-ok .hc-fix { animation: hc-rise 640ms var(--ease-out-expo) both; animation-delay: calc(450ms + var(--i, 0) * 70ms); }
@keyframes hc-from-right { from { opacity: 0; transform: translate3d(1.75rem, 0, 0); } }
@keyframes hc-from-left { from { opacity: 0; transform: translate3d(-1.75rem, 0, 0); } }
@keyframes hc-fade { from { opacity: 0; } }
@keyframes hc-rise { from { opacity: 0; transform: translate3d(0, 0.75rem, 0); } }
`;
