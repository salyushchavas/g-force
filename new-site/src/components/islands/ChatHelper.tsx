// "Ask us": a scripted helper with a human hand-off. No AI and no invented answers; every reply
// routes to a person (phone, email, booking) or to a page. Hidden from the chat's own scope: no data stored.
import { useEffect, useId, useRef, useState } from 'react';
import { submitLead } from '../../lib/leads';

type Msg = { from: 'bot' | 'you'; text: string; links?: { label: string; href: string }[] };

const PHONE = { label: 'Call +1 (825) 606-9777', href: 'tel:+18256069777' };
const EMAIL = { label: 'Email info@gforceit.ca', href: 'mailto:info@gforceit.ca' };

const TOPICS: { id: string; label: string; reply: Msg }[] = [
  {
    id: 'urgent',
    label: 'Something is broken right now',
    reply: {
      from: 'bot',
      text: 'Call us and you will reach a person during business hours (Monday to Friday, 11 a.m. to 8 p.m. ET). Existing clients can also email support with the subject URGENT.',
      links: [PHONE, EMAIL],
    },
  },
  {
    id: 'assessment',
    label: 'Book a free IT assessment',
    reply: {
      from: 'bot',
      text: 'The assessment is a 30-minute conversation plus a written report on your biggest IT risks. You keep the report either way.',
      links: [{ label: 'Book an assessment', href: '/contact/?interest=assessment#contact-form' }],
    },
  },
  {
    id: 'course',
    label: 'Which course is right for me?',
    reply: {
      from: 'bot',
      text: 'Most people new to IT start with Cloud Mastery or Cybersecurity Essentials. The course finder filters by goal, level and format.',
      links: [{ label: 'Open the course finder', href: '/training/#course-finder' }],
    },
  },
  {
    id: 'pricing',
    label: 'How much does managed IT cost?',
    reply: {
      from: 'bot',
      text: 'It depends on how many people and devices you have. After the free assessment you get a fixed monthly quote, with nothing added later.',
      links: [{ label: 'Estimate your downtime cost', href: '/business/#downtime-calculator' }],
    },
  },
  {
    id: 'where',
    label: 'Where are you located?',
    reply: {
      from: 'bot',
      text: 'Head office: 130 King Street West, Suite 1900, Toronto. Support and training also run remotely across Canada.',
      links: [{ label: 'See contact details', href: '/contact/' }],
    },
  },
];

const GREETING: Msg = {
  from: 'bot',
  text: 'Hi. Pick a topic for a quick answer, or leave a message and a person will reply within one business day.',
};

// Tuck targets: the launcher steps aside wherever it would cover something people need to read or use.
const TUCK_UNDER = '#contact, .site-footer, .map-links';
const FIELD = 'input, select, textarea';

export default function ChatHelper() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [mode, setMode] = useState<'topics' | 'message'>('topics');
  const [status, setStatus] = useState('');
  // Over the hero the launcher is the labelled pill; past it, a 56 px circle (the label stays as its accessible name).
  const [compact, setCompact] = useState(false);
  // Tucked until hydrated, so there is never a launcher on screen that cannot open anything yet.
  const [tucked, setTucked] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Placement. Only what passes under the launcher counts, so every observer watches the bottom strip of the
  // viewport where it sits. It tucks away over the contact band, its map links and the footer (with its Toronto
  // clock), while a field outside the chat has focus, and on phones while the hero is under it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) {
      setTucked(false);
      return;
    }
    const narrow = matchMedia('(max-width: 639px)');
    const hero =
      document.querySelector('[data-night-hero]') ?? document.querySelector('main .page-hero, main .post-hero');
    const targets = Array.from(document.querySelectorAll(TUCK_UNDER));
    const isField = (el: EventTarget | null) => el instanceof Element && el.matches(FIELD) && !root.contains(el);

    const covering = new Set<Element>();
    let heroUnder = false;
    let typing = isField(document.activeElement);
    let ready = !hero && targets.length === 0;
    const sync = () => {
      if (!ready) return;
      setCompact(!heroUnder);
      setTucked(typing || covering.size > 0 || (heroUnder && narrow.matches));
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) heroUnder = e.isIntersecting;
          else if (e.isIntersecting) covering.add(e.target);
          else covering.delete(e.target);
        }
        ready = true;
        sync();
      },
      { rootMargin: '-82% 0px 0px 0px', threshold: 0 },
    );
    if (hero) io.observe(hero);
    targets.forEach((t) => io.observe(t));

    const onFocusIn = (e: FocusEvent) => {
      typing = isField(e.target);
      sync();
    };
    const onFocusOut = (e: FocusEvent) => {
      typing = isField(e.relatedTarget);
      sync();
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    narrow.addEventListener('change', sync);
    sync();
    return () => {
      io.disconnect();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      narrow.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button, a, input, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, mode]);

  const pick = (t: (typeof TOPICS)[number]) => setMsgs((m) => [...m, { from: 'you', text: t.label }, t.reply]);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    setStatus('Sending…');
    const res = await submitLead('contact', { ...data, source: 'chat helper' });
    setStatus('');
    setMsgs((m) => [...m, { from: 'you', text: data.message }, { from: 'bot', text: res.message }]);
    if (res.ok) {
      form.reset();
      setMode('topics');
    }
  };

  return (
    <div
      ref={rootRef}
      className="gf-chat"
      data-open={open || undefined}
      data-compact={compact || undefined}
      data-tucked={tucked || undefined}
    >
      <div
        ref={panelRef}
        className="gf-chat-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="gf-chat-head">
          <div>
            <p id={titleId} className="gf-chat-title">Ask G-Force</p>
            <p className="gf-chat-sub">Automated answers. Real people reply by phone or email.</p>
          </div>
          <button
            type="button"
            className="gf-chat-x"
            aria-label="Close"
            onClick={() => {
              setOpen(false);
              launcherRef.current?.focus();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div ref={logRef} className="gf-chat-log" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`gf-msg gf-msg-${m.from}`}>
              <p>{m.text}</p>
              {m.links && (
                <div className="gf-msg-links">
                  {m.links.map((l) => (
                    <a key={l.href} href={l.href}>
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {mode === 'topics' ? (
          <div className="gf-chat-topics">
            {TOPICS.map((t) => (
              <button key={t.id} type="button" onClick={() => pick(t)}>
                {t.label}
              </button>
            ))}
            <button type="button" className="gf-chat-msgbtn" onClick={() => setMode('message')}>
              Leave a message for a person
            </button>
          </div>
        ) : (
          <form className="gf-chat-form" onSubmit={send} noValidate>
            <label>
              <span>Name</span>
              <input className="field" name="name" autoComplete="name" required />
            </label>
            <label>
              <span>Email</span>
              <input className="field" name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Message</span>
              <textarea className="field" name="message" rows={3} required />
            </label>
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="gf-hp" aria-hidden="true" />
            <p className="gf-chat-fine">We use your details only to reply. See our privacy policy.</p>
            <div className="gf-chat-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setMode('topics')}>
                Back
              </button>
              <button type="submit" className="btn btn-primary">
                Send message
              </button>
            </div>
            <p className="gf-chat-fine" role="status">
              {status}
            </p>
          </form>
        )}
      </div>

      <button
        ref={launcherRef}
        type="button"
        className="gf-chat-launcher"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6 6 18" />
          ) : (
            <>
              <path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z" />
              <path d="M8.5 10.5h7" />
            </>
          )}
        </svg>
        <span className="gf-chat-launcher-label">{open ? 'Close help' : 'Questions? Ask us'}</span>
      </button>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
/* The right edge stays inside the container's gutter on wide screens. */
.gf-chat { position: fixed; right: max(1rem, env(safe-area-inset-right), calc((100vw - 1240px) / 2 - 72px)); bottom: max(1rem, env(safe-area-inset-bottom)); z-index: var(--z-overlay); display: flex; flex-direction: column; align-items: flex-end; gap: .75rem; font-family: var(--font-sans); }
/* Air's floating control: a frosted white pill with ink type, never a coloured fill. */
.gf-chat-launcher { display: inline-flex; align-items: center; gap: .55rem; min-height: 3.25rem; padding: .8rem 1.15rem; border: 0; border-radius: 999px; background: color-mix(in oklch, white 84%, transparent); color: var(--color-air-ink); font: inherit; font-weight: 650; font-size: .9375rem; cursor: pointer; box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--color-air-ink) 12%, transparent), 0 6px 16px -8px rgb(18 62 115 / .45); -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%); transition: background-color 160ms var(--ease-out-quart), transform 420ms var(--ease-out-expo), opacity 300ms var(--ease-out-expo); }
.gf-chat-launcher:hover { background: #fff; }
.gf-chat-launcher:active { transform: translateY(1px); transition-duration: 100ms; }
[data-theme="dark"] .gf-chat-launcher { background: #fff; color: var(--color-air-ink); }
/* Past the hero (and always on phones): a 3.5rem circle. The label stays as the button's accessible name. */
.gf-chat[data-compact] .gf-chat-launcher { width: 3.5rem; height: 3.5rem; min-height: 3.5rem; padding: 0; justify-content: center; }
.gf-chat[data-compact] .gf-chat-launcher-label { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 639px) {
  .gf-chat-launcher { width: 3.5rem; height: 3.5rem; min-height: 3.5rem; padding: 0; justify-content: center; }
  .gf-chat-launcher-label { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
}
/* Tucked below the edge (exit curve, ~60% of the entrance). It comes back the moment it takes keyboard focus. */
.gf-chat[data-tucked]:not([data-open]) .gf-chat-launcher:not(:focus-visible) { transform: translateY(calc(100% + 1.5rem)); opacity: 0; pointer-events: none; transition: transform 250ms var(--ease-exit), opacity 200ms var(--ease-exit); }
@media (prefers-reduced-motion: reduce) { .gf-chat .gf-chat-launcher { transition: none !important; } }
.gf-chat-panel { width: min(24rem, calc(100vw - 2rem)); max-height: min(36rem, calc(100svh - 7rem)); display: flex; flex-direction: column; background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; transform-origin: bottom right; animation: gf-pop 260ms var(--ease-out-expo); }
/* Dark: an opaque deep-sky panel, so page text never prints through the messages. */
[data-theme="dark"] .gf-chat-panel { background: var(--color-ink-900); --surface-2: var(--color-ink-850); }
.gf-chat-panel[hidden] { display: none; }
@keyframes gf-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
.gf-chat-head { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem 1rem .9rem 1.1rem; background: var(--color-sky-deep); color: #fff; }
.gf-chat-title { font-weight: 750; font-size: 1.0625rem; letter-spacing: -.01em; }
.gf-chat-sub { margin-top: .15rem; font-size: .8125rem; color: var(--color-mist-300); line-height: 1.4; }
.gf-chat-x { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 0; border-radius: 999px; background: transparent; color: #fff; cursor: pointer; flex-shrink: 0; }
.gf-chat-x:hover { background: rgb(255 255 255 / .1); }
.gf-chat-log { flex: 1; overflow-y: auto; padding: 1rem 1.1rem; display: grid; gap: .7rem; align-content: start; }
.gf-msg { max-width: 88%; padding: .65rem .85rem; border-radius: 10px; font-size: .9375rem; line-height: 1.5; }
.gf-msg-bot { background: var(--surface-2); justify-self: start; border-bottom-left-radius: 3px; }
.gf-msg-you { background: var(--color-air-ink); color: #fff; justify-self: end; border-bottom-right-radius: 3px; }
[data-theme="dark"] .gf-msg-you { background: #fff; color: var(--color-air-ink); }
.gf-msg-links { display: flex; flex-wrap: wrap; gap: .4rem .9rem; margin-top: .5rem; }
.gf-msg-links a { color: var(--accent-ink); font-weight: 650; text-underline-offset: .25em; }
.gf-chat-topics { display: grid; gap: .4rem; padding: .25rem 1.1rem 1.1rem; }
.gf-chat-topics button { text-align: left; padding: .6rem .8rem; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--text); font: inherit; font-size: .9375rem; font-weight: 550; cursor: pointer; transition: border-color 160ms var(--ease-out-quart), background-color 160ms var(--ease-out-quart); }
.gf-chat-topics button:hover { border-color: var(--text-muted); background: var(--surface-2); }
.gf-chat-topics .gf-chat-msgbtn { border-style: dashed; color: var(--accent-ink); }
.gf-chat-form { display: grid; gap: .6rem; padding: .25rem 1.1rem 1.1rem; }
.gf-chat-form label { display: grid; gap: .3rem; font-size: .875rem; font-weight: 600; }
.gf-chat-form .field { min-height: 2.6rem; padding: .55rem .7rem; }
.gf-chat-fine { font-size: .8125rem; color: var(--text-muted); }
.gf-chat-fine:empty { display: none; }
.gf-chat-actions { display: flex; justify-content: flex-end; gap: .5rem; }
.gf-chat-actions .btn { min-height: 2.6rem; padding: .55rem 1rem; font-size: .9375rem; }
.gf-hp { position: absolute; left: -10000px; width: 1px; height: 1px; opacity: 0; }
`;
