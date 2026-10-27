// "How much does downtime cost your business?" (PDF). The arithmetic is written out with the visitor's own numbers
// and uses no outside statistics:
//   per outage = people × hourly cost × hours down + revenue lost per hour × hours down
//   per year   = per outage × outages a year
// Nothing entered here leaves the page.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { calculatorDefaults } from '../../data/site';

type Values = typeof calculatorDefaults;
type Key = keyof Values;

type Spec = {
  key: Key;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  /** Unit read out after the label, for fields whose unit is only shown as a symbol. */
  spokenUnit?: string;
  /** Value as a screen reader should hear it on the slider. */
  valueText: (n: number) => string;
};

type Props = {
  /** Level of the calculator title. The working section uses the next level down. */
  headingLevel?: 2 | 3;
  headingId?: string;
};

const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 });
const cad = (n: number) => money.format(Math.round(n));
const count = (n: number, one: string, many: string) => `${plain.format(n)} ${n === 1 ? one : many}`;

const FIELDS: Spec[] = [
  {
    key: 'people',
    label: 'People who can’t work',
    min: 1,
    max: 250,
    step: 1,
    suffix: 'people',
    valueText: (n) => count(n, 'person', 'people'),
  },
  {
    key: 'hourlyCost',
    label: 'Hourly cost per person',
    hint: 'Wages plus benefits and payroll costs.',
    min: 15,
    max: 250,
    step: 1,
    prefix: '$',
    spokenUnit: 'in dollars',
    valueText: (n) => `${cad(n)} an hour`,
  },
  {
    key: 'hoursDown',
    label: 'Hours down per outage',
    min: 0.5,
    max: 48,
    step: 0.5,
    suffix: 'hours',
    valueText: (n) => count(n, 'hour', 'hours'),
  },
  {
    key: 'revenuePerHour',
    label: 'Revenue lost per hour',
    hint: 'Sales or billable work you can’t make up later. Leave it at $0 if the work just waits.',
    min: 0,
    max: 10000,
    step: 50,
    prefix: '$',
    spokenUnit: 'in dollars',
    valueText: (n) => `${cad(n)} an hour`,
  },
  {
    key: 'incidentsPerYear',
    label: 'Outages a year',
    min: 1,
    max: 52,
    step: 1,
    valueText: (n) => `${count(n, 'outage', 'outages')} a year`,
  },
];

const clampTo = (spec: Spec, n: number) =>
  Math.min(spec.max, Math.max(spec.min, Math.round((n - spec.min) / spec.step) * spec.step + spec.min));

// Sliders run on a square-root scale: small-office values (5 to 30 people, a few hours down) get most of the
// track instead of its first few millimetres. The number box beside each slider takes exact values.
const TRACK = 1000;
const toTrack = (spec: Spec, v: number) => Math.round(Math.sqrt((v - spec.min) / (spec.max - spec.min)) * TRACK);
const fromTrack = (spec: Spec, t: number) => clampTo(spec, spec.min + (spec.max - spec.min) * (t / TRACK) ** 2);
const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };

const START: Values = FIELDS.reduce((v, f) => ({ ...v, [f.key]: clampTo(f, calculatorDefaults[f.key]) }), { ...calculatorDefaults });

function estimate(v: Values) {
  const staff = Math.round(v.people * v.hourlyCost * v.hoursDown);
  const revenue = Math.round(v.revenuePerHour * v.hoursDown);
  const perOutage = staff + revenue;
  return { staff, revenue, perOutage, perYear: perOutage * v.incidentsPerYear };
}

const motionOK = () => typeof document !== 'undefined' && document.documentElement.classList.contains('motion-ok');
const quartOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Dollars with tabular digits but a proportional comma, so "$6,480" doesn't open up around the separator. */
function Money({ value }: { value: number }) {
  return (
    <>
      {money.formatToParts(Math.round(value)).map((part, i) =>
        part.type === 'group' ? (
          <span key={i} className="dc-sep">
            {part.value}
          </span>
        ) : (
          part.value
        ),
      )}
    </>
  );
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
);

/** A dollar figure that eases from the value on screen to the new one (450 ms). Instant under reduced motion. */
function Eased({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    if (!motionOK()) {
      current.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 450);
      const v = t >= 1 ? value : from + (value - from) * quartOut(t);
      current.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      <Money value={shown} />
    </span>
  );
}

function Field({ spec, value, onChange, uid }: { spec: Spec; value: number; onChange: (n: number) => void; uid: string }) {
  // While someone is typing, the box shows their text; a valid in-range number updates the estimate at once.
  const [draft, setDraft] = useState<string | null>(null);
  const id = `${uid}${spec.key}`;
  const typed = draft === null ? value : Number(draft);
  const invalid = draft !== null && (draft.trim() === '' || !Number.isFinite(typed) || typed < spec.min || typed > spec.max);
  const track = toTrack(spec, value);
  const describedBy = [spec.hint ? `${id}-hint` : '', invalid ? `${id}-err` : ''].filter(Boolean).join(' ');
  const decimals = spec.step % 1 !== 0;

  return (
    <div className="dc-field">
      <div className="dc-field-row">
        <label id={`${id}-label`} htmlFor={id} className="dc-label">
          {spec.label}
          {spec.spokenUnit && <span className="sr-only">, {spec.spokenUnit}</span>}
        </label>
        <div className={spec.prefix ? 'dc-num dc-num-prefixed' : 'dc-num'} data-invalid={invalid || undefined}>
          {spec.prefix && (
            <span className="dc-affix" aria-hidden="true">
              {spec.prefix}
            </span>
          )}
          <input
            id={id}
            data-key={spec.key}
            type="number"
            inputMode={decimals ? 'decimal' : 'numeric'}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={draft ?? String(value)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy || undefined}
            onChange={(e) => {
              const raw = e.target.value;
              const n = Number(raw);
              setDraft(raw);
              if (raw.trim() !== '' && Number.isFinite(n) && n >= spec.min && n <= spec.max) onChange(n);
            }}
            onBlur={() => {
              if (draft === null) return;
              const n = Number(draft);
              onChange(clampTo(spec, draft.trim() === '' || !Number.isFinite(n) ? value : n));
              setDraft(null);
            }}
          />
          {spec.suffix && (
            <span className="dc-affix" aria-hidden="true">
              {spec.suffix}
            </span>
          )}
        </div>
      </div>
      <input
        className="dc-range"
        data-key={spec.key}
        type="range"
        min={0}
        max={TRACK}
        step={1}
        value={track}
        aria-labelledby={`${id}-label`}
        aria-valuetext={spec.valueText(value)}
        style={{ '--fill': `${track / (TRACK / 100)}%` } as CSSProperties}
        onChange={(e) => {
          setDraft(null);
          onChange(fromTrack(spec, Number(e.target.value)));
        }}
        onKeyDown={(e) => {
          // Keys move by the field's own step (one person, half an hour, $50), not by track units.
          const by = KEY_STEPS[e.key];
          const next = by !== undefined ? value + by * spec.step : e.key === 'Home' ? spec.min : e.key === 'End' ? spec.max : null;
          if (next === null) return;
          e.preventDefault();
          setDraft(null);
          onChange(clampTo(spec, next));
        }}
      />
      {invalid && (
        <p id={`${id}-err`} className="dc-err t-meta">
          Enter a number from {plain.format(spec.min)} to {plain.format(spec.max)}.
        </p>
      )}
      {spec.hint && (
        <p id={`${id}-hint`} className="dc-hint t-meta">
          {spec.hint}
        </p>
      )}
    </div>
  );
}

export default function DowntimeCalculator({ headingLevel = 3, headingId }: Props) {
  const uid = useId();
  const Title = `h${headingLevel}` as 'h2' | 'h3';
  const Sub = `h${headingLevel + 1}` as 'h3' | 'h4';
  const [values, setValues] = useState<Values>(START);
  const [spoken, setSpoken] = useState('');
  const changed = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const e = estimate(values);

  // React keeps numbers typed or dragged before this island hydrated, but not in state; adopt them into the estimate.
  useEffect(() => {
    const next = { ...START };
    let adopted = false;
    for (const f of FIELDS) {
      rootRef.current?.querySelectorAll<HTMLInputElement>(`input[data-key="${f.key}"]`).forEach((el) => {
        const isTrack = el.type === 'range';
        const rendered = String(isTrack ? toTrack(f, START[f.key]) : START[f.key]);
        const raw = Number(el.value);
        if (el.value === rendered || el.value.trim() === '' || !Number.isFinite(raw)) return;
        next[f.key] = isTrack ? fromTrack(f, raw) : clampTo(f, raw);
        adopted = true;
      });
    }
    if (adopted) {
      changed.current = true;
      setValues(next);
    }
  }, []);

  // Screen readers hear the new estimate once the visitor pauses, not on every slider step.
  useEffect(() => {
    if (!changed.current) return;
    const t = window.setTimeout(
      () => setSpoken(`Estimated cost: ${cad(e.perOutage)} per outage and ${cad(e.perYear)} a year.`),
      700,
    );
    return () => window.clearTimeout(t);
  }, [e.perOutage, e.perYear]);

  const update = (key: Key) => (n: number) => {
    changed.current = true;
    setValues((prev) => (prev[key] === n ? prev : { ...prev, [key]: n }));
  };

  const hours = count(values.hoursDown, 'hour', 'hours');

  return (
    <div ref={rootRef} className="dc">
      <Title id={headingId} className="dc-title t-h3">
        How much does downtime cost your business?
      </Title>
      <p className="dc-intro">
        The starting numbers describe a {START.people}-person office. Change any of them to match yours.
      </p>

      <div className="dc-grid">
        <div className="dc-live">
          <div className="dc-totals">
            <p className="dc-total dc-total-year">
              <span className="dc-total-label">Per year</span>
              <Eased value={e.perYear} className="dc-total-num t-num" />
            </p>
            <p className="dc-total">
              <span className="dc-total-label">Per outage</span>
              <Eased value={e.perOutage} className="dc-total-num t-num" />
            </p>
            <p className="sr-only" aria-live="polite">
              {spoken}
            </p>
          </div>

          <fieldset className="dc-inputs">
            <legend className="sr-only">Your numbers</legend>
            {FIELDS.map((f) => (
              <Field key={f.key} spec={f} value={values[f.key]} onChange={update(f.key)} uid={uid} />
            ))}
          </fieldset>
        </div>

        <div className="dc-working">
          <Sub className="dc-sub t-h4">How it adds up</Sub>
          <dl className="dc-ledger">
            <div className="dc-line">
              <dt>Staff time</dt>
              <dd className="dc-amt t-num">
                <Money value={e.staff} />
              </dd>
              <dd className="dc-work">
                {count(values.people, 'person', 'people')} × {cad(values.hourlyCost)} an hour × {hours}
              </dd>
            </div>
            <div className="dc-line">
              <dt>Lost revenue</dt>
              <dd className="dc-amt t-num">
                <Money value={e.revenue} />
              </dd>
              <dd className="dc-work">
                {cad(values.revenuePerHour)} an hour × {hours}
              </dd>
            </div>
            <div className="dc-line dc-line-sum">
              <dt>Per outage</dt>
              <dd className="dc-amt t-num">
                <Money value={e.perOutage} />
              </dd>
              <dd className="dc-work">Staff time plus lost revenue</dd>
            </div>
            <div className="dc-line dc-line-sum dc-line-total">
              <dt>Per year</dt>
              <dd className="dc-amt t-num">
                <Money value={e.perYear} />
              </dd>
              <dd className="dc-work">
                {cad(e.perOutage)} × {count(values.incidentsPerYear, 'outage', 'outages')}
              </dd>
            </div>
          </dl>
          <p className="dc-note">
            This counts staff time and, if you add it, lost revenue. It leaves out repair and recovery fees, overtime,
            lost data and penalties, so treat the result as a floor. Nothing you enter leaves this page.
          </p>
          <div className="dc-cta">
            <p>The free IT assessment ends with a written report on your biggest risks and what fixing them would cost.</p>
            <a className="btn btn-primary" href="/contact/?interest=assessment#contact-form">
              Book a free IT assessment
              <span className="btn-arrow">
                <Arrow />
              </span>
            </a>
          </div>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.dc { --dc-bg: var(--bg); --dc-control: color-mix(in oklch, var(--text-muted) 72%, var(--surface)); container-type: inline-size; padding-top: 1.5rem; border-top: 1px solid var(--line-strong); color: var(--text); }
.dc-title { max-width: 22ch; }
.dc-intro { margin-top: 0.75rem; max-width: 52ch; color: var(--text-muted); }
.dc-grid { margin-top: 1.25rem; }

.dc-totals { position: sticky; top: var(--header-h); z-index: var(--z-raised); display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.5rem 2rem; padding-block: 0.75rem; background: var(--dc-bg); border-bottom: 1px solid var(--line); }
.dc-total { display: grid; gap: 0.2rem; margin: 0; }
.dc-total-label { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; line-height: 1.3; }
.dc-total-num { font-size: clamp(1.375rem, 0.9rem + 3cqi, 1.875rem); font-weight: 650; letter-spacing: -0.02em; line-height: 1.05; }
.dc-total-year .dc-total-num { font-size: clamp(2.25rem, 1.2rem + 6.5cqi, 3.5rem); font-weight: 700; letter-spacing: -0.035em; }
.dc-sep { font-variant-numeric: normal; font-feature-settings: 'tnum' 0; }

.dc-inputs { display: grid; gap: 1.1rem; min-width: 0; margin: 1.5rem 0 0; padding: 0; border: 0; }
.dc-inputs input { scroll-margin-top: 7rem; }
.dc-field-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.dc-label { font-size: 0.9375rem; font-weight: 600; line-height: 1.3; }
/* Every box is the same width, so the column of numbers lines up instead of zig-zagging down the working. */
.dc-num { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: flex-end; gap: 0.3rem; min-width: 7.25rem; min-height: 2.75rem; padding-inline: 0.75rem; border: 1px solid var(--dc-control); border-radius: var(--radius-input); background: var(--surface); transition: border-color 160ms var(--ease-out-quart), box-shadow 160ms var(--ease-out-quart); }
.dc-num:hover { border-color: var(--text-muted); }
.dc-num:focus-within { border-color: var(--focus); box-shadow: 0 0 0 3px color-mix(in oklch, var(--focus) 28%, transparent); }
.dc-num[data-invalid] { border-color: var(--accent-ink); }
/* The input fills the box (the whole box is the click target) and its digits sit against the unit. */
.dc-num input { flex: 1 1 0; width: 0; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 1rem; font-weight: 650; text-align: right; font-variant-numeric: tabular-nums; -moz-appearance: textfield; appearance: textfield; }
.dc-num input::-webkit-inner-spin-button, .dc-num input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.dc-num input:focus-visible { outline: none; }
.dc-affix { color: var(--text-muted); font-size: 0.9375rem; }

.dc-range { --track: var(--line-strong); display: block; width: 100%; height: 2.75rem; margin: 0.15rem 0 0; background: transparent; cursor: pointer; touch-action: pan-y; -webkit-appearance: none; appearance: none; }
.dc-range::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: linear-gradient(to right, var(--accent) 0 var(--fill), var(--track) var(--fill) 100%); }
.dc-range::-webkit-slider-thumb { box-sizing: border-box; width: 1.5rem; height: 1.5rem; margin-top: calc((4px - 1.5rem) / 2); border: 2px solid var(--accent); border-radius: 50%; background: var(--surface); -webkit-appearance: none; appearance: none; transition: transform 160ms var(--ease-out-quart); }
.dc-range:active::-webkit-slider-thumb { transform: scale(1.12); }
.dc-range::-moz-range-track { height: 4px; border-radius: 999px; background: var(--track); }
.dc-range::-moz-range-progress { height: 4px; border-radius: 999px; background: var(--accent); }
.dc-range::-moz-range-thumb { box-sizing: border-box; width: 1.5rem; height: 1.5rem; border: 2px solid var(--accent); border-radius: 50%; background: var(--surface); }
.dc-range:focus-visible { outline: none; }
.dc-range:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--focus); outline-offset: 3px; }
.dc-range:focus-visible::-moz-range-thumb { outline: 2px solid var(--focus); outline-offset: 3px; }
.dc-hint { max-width: 52ch; color: var(--text-muted); }
.dc-err { color: var(--accent-ink); }

.dc-working { margin-top: 2.25rem; }
.dc-ledger { margin: 0.9rem 0 0; padding: 0.3rem 1.25rem; border-radius: var(--radius-card); background: var(--surface-2); }
.dc-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 1rem; padding-block: 0.8rem; }
.dc-line + .dc-line { border-top: 1px solid var(--line); }
.dc-line.dc-line-sum { border-top-color: var(--line-strong); }
.dc-line dt { font-weight: 600; }
.dc-amt { margin: 0; font-weight: 650; text-align: right; }
.dc-work { grid-column: 1 / -1; margin: 0.15rem 0 0; color: var(--text-muted); font-size: 0.875rem; line-height: 1.45; }
.dc-line-total dt, .dc-line-total .dc-amt { font-weight: 700; }
.dc-note { margin-top: 1rem; max-width: 60ch; color: var(--text-muted); font-size: 0.875rem; line-height: 1.55; }
.dc-cta { display: grid; justify-items: start; gap: 1rem; margin-top: 1.75rem; }
.dc-cta p { max-width: 46ch; }

@container (min-width: 40rem) {
  .dc-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); grid-template-areas: 'inputs totals' 'inputs working'; grid-template-rows: auto 1fr; column-gap: clamp(2rem, 6cqi, 4rem); align-items: start; }
  .dc-live { display: contents; }
  .dc-totals { grid-area: totals; position: static; padding-block: 0 1.25rem; background: none; }
  .dc-inputs { grid-area: inputs; margin-top: 0; }
  .dc-inputs input { scroll-margin-top: 0; }
  .dc-working { grid-area: working; margin-top: 1.5rem; }
}
`;
