// Course finder (PDF: "filter training by goal (cybersecurity, cloud, data, beginner or advanced)").
// Filters courses[] from site.ts by goal, level and format. Every filter is a toggle button with aria-pressed,
// and the result count is announced politely. The server render lists the catalogue, so it reads correctly
// before hydration and without JavaScript. Start dates and tuition are confirmed on enquiry, so none are shown.
// Motion (FLIP on the Web Animations API, about 1 KB instead of a motion library): results that stay glide to
// their new place (layout, 500ms), new ones rise 16px with a 60ms list stagger, leaving ones fade where they stood
// at about 60% of the entrance time. Curves are read from the live --ease-out-expo / --ease-exit tokens.
// Transform and opacity only. With reduced motion, or the site's .motion-ok gate off, every change is instant.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react';
import { courses, type Course } from '../../data/site';

type Goal = Course['goal'];
type Level = Course['level'];
type Format = Course['formats'][number];
type Filters = { goals: Goal[]; level: Level | 'any'; formats: Format[] };
type Key = 'goal' | 'level' | 'format';
type Box = { x: number; y: number; w: number; el: HTMLElement };

const EMPTY: Filters = { goals: [], level: 'any', formats: [] };
const COMPACT_LIMIT = 3;
const ENQUIRE_HREF = '/contact/?interest=training#contact-form';
// Fallbacks for the DESIGN.md curves; the live values come from the CSS tokens at animation time.
const ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EXIT = 'cubic-bezier(0.32, 0, 0.67, 0)';
const easing = (token: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;

// Same 24px grid, 1.5px stroke and round joins as ui/Icon.astro, so the island matches the rest of the site.
const GLYPHS = {
  arrow: '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/><path d="M7 11.5l2.2-2.4 2.4 2.6 2.2-3.4 3.2 4.2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};
type GlyphName = keyof typeof GLYPHS;

const GOAL_LABEL: Record<Goal, string> = { cloud: 'Cloud', cybersecurity: 'Cybersecurity', ai: 'AI', data: 'Data', devops: 'DevOps' };
const GOAL_TRACK: Record<Goal, string> = {
  cloud: 'Cloud track',
  cybersecurity: 'Cybersecurity track',
  ai: 'AI and machine learning track',
  data: 'Data track',
  devops: 'DevOps track',
};
const LEVEL_LABEL: Record<Level, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const LEVEL_RANK: Record<Level, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const FORMAT_LABEL: Record<Format, string> = { virtual: 'Virtual', 'in-person': 'In-person', 'self-paced': 'Self-paced' };
const FORMAT_ICON: Record<Format, GlyphName> = { virtual: 'monitor', 'in-person': 'pin', 'self-paced': 'clock' };

// Only options that exist in the data are offered, always in the same order.
const GOALS = (Object.keys(GOAL_LABEL) as Goal[]).filter((g) => courses.some((c) => c.goal === g));
const LEVELS = (Object.keys(LEVEL_LABEL) as Level[]).filter((l) => courses.some((c) => c.level === l));
const FORMATS = (Object.keys(FORMAT_LABEL) as Format[]).filter((f) => courses.some((c) => c.formats.includes(f)));

const isActive = (f: Filters) => f.goals.length > 0 || f.level !== 'any' || f.formats.length > 0;
const matches = (c: Course, f: Filters) =>
  (f.goals.length === 0 || f.goals.includes(c.goal)) &&
  (f.level === 'any' || c.level === f.level) &&
  (f.formats.length === 0 || c.formats.some((x) => f.formats.includes(x)));
const countFor = (f: Filters) => courses.filter((c) => matches(c, f)).length;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const formatsOf = (c: Course) => FORMATS.filter((f) => c.formats.includes(f));

/** Reads filters from the URL or from data-finder-* attributes on a link. Unknown values are ignored. */
function readFilters(get: (key: Key) => string | null | undefined): Filters {
  const set = (key: Key) => new Set((get(key) ?? '').split(',').map((s) => s.trim()));
  const goals = set('goal');
  const formats = set('format');
  const level = get('level');
  return {
    goals: GOALS.filter((g) => goals.has(g)),
    level: LEVELS.find((l) => l === level) ?? 'any',
    formats: FORMATS.filter((f) => formats.has(f)),
  };
}

const toQuery = (f: Filters) =>
  [
    f.goals.length ? `goal=${f.goals.join(',')}` : '',
    f.level !== 'any' ? `level=${f.level}` : '',
    f.formats.length ? `format=${f.formats.join(',')}` : '',
  ]
    .filter(Boolean)
    .join('&');

/** Keeps ?goal=&level=&format= in step with the filters and leaves every other parameter alone. */
function writeUrl(f: Filters) {
  const params = new URLSearchParams(location.search);
  (['goal', 'level', 'format'] as const).forEach((k) => params.delete(k));
  const query = [params.toString(), toQuery(f)].filter(Boolean).join('&');
  const next = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', next);
}

/** Same gate as the rest of the site: Base.astro adds .motion-ok before paint unless reduced motion is requested. */
const motionAllowed = () =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains('motion-ok') &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches &&
  typeof Element.prototype.animate === 'function';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function Glyph({ name, size = 18 }: { name: GlyphName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: GLYPHS[name] }}
    />
  );
}

function LevelMeter({ level }: { level: Level }) {
  return (
    <span className="cf-meter" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= LEVEL_RANK[level] ? 'is-on' : undefined} />
      ))}
    </span>
  );
}

/** The contact form reads ?course= and names this course in the message, so the enquiry arrives with it. */
function EnquireLink({ c }: { c: Course }) {
  return (
    <a className="cf-cta link-arrow" href={`/contact/?interest=training&course=${c.id}#contact-form`}>
      Ask about the next start date<span className="sr-only"> for {c.name}</span>
      <span className="btn-arrow">
        <Glyph name="arrow" />
      </span>
    </a>
  );
}

function CourseHead({ c, titleId, compact }: { c: Course; titleId: string; compact: boolean }) {
  // The name comes first for screen readers; the track and level line sits above it visually.
  return (
    <div className="cf-head">
      <h3 id={titleId} className={`cf-name ${compact ? 't-h4' : 't-h3'}`}>
        {c.name}
      </h3>
      <p className="cf-kicker">
        <span className="cf-track">{GOAL_TRACK[c.goal]}</span>
        <span className="cf-level">
          <LevelMeter level={c.level} />
          {LEVEL_LABEL[c.level]}
        </span>
      </p>
      <p className="cf-summary">{c.summary}</p>
    </div>
  );
}

function CourseCard({ c, titleId }: { c: Course; titleId: string }) {
  return (
    <article className="cf-card" aria-labelledby={titleId}>
      <CourseHead c={c} titleId={titleId} compact={false} />
      <div className="cf-covers">
        <p className="cf-k" id={`${titleId}-covers`}>
          What it covers
        </p>
        <ul role="list" aria-labelledby={`${titleId}-covers`}>
          {c.covers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <dl className="cf-spec">
        <div>
          <dt>Formats</dt>
          <dd>
            <ul className="cf-formats" role="list">
              {formatsOf(c).map((f) => (
                <li key={f} className="chip">
                  {FORMAT_LABEL[f]}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        {c.certs.length > 0 && (
          <div>
            <dt>Prepares you for</dt>
            <dd>
              <ul className="cf-certs" role="list">
                {c.certs.map((cert) => (
                  <li key={cert}>{cert}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
      <EnquireLink c={c} />
    </article>
  );
}

/** Home teaser row: name, track and level, summary and the enquiry. The full facts live on /training. */
function CourseRow({ c, titleId }: { c: Course; titleId: string }) {
  return (
    <article className="cf-row" aria-labelledby={titleId}>
      <CourseHead c={c} titleId={titleId} compact />
      <EnquireLink c={c} />
    </article>
  );
}

type Props = {
  /** Home-page teaser: the goal filter only, at most three short rows, and a link to the full finder on /training. */
  compact?: boolean;
};

export default function CourseFinder({ compact = false }: Props) {
  const uid = useId();
  // A plain id for the results, so the "Show N courses" link and Lenis can resolve it as a fragment.
  const resultsId = `cf-${uid.replace(/[^\w-]/g, '')}-results`;
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const firstOption = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const ghostRef = useRef<HTMLUListElement>(null);
  const before = useRef<Map<string, Box> | null>(null);
  const urlReady = useRef(false);

  const results = useMemo(() => courses.filter((c) => matches(c, filters)), [filters]);
  const n = results.length;
  const shown = compact ? results.slice(0, COMPACT_LIMIT) : results;
  const shownKey = shown.map((c) => c.id).join('|');
  const active = isActive(filters);

  // FLIP, first half: note where every result sits on screen right now (mid-glide included) before the change.
  const update = (next: SetStateAction<Filters>) => {
    const list = listRef.current;
    if (list && motionAllowed()) {
      const origin = list.getBoundingClientRect();
      const boxes = new Map<string, Box>();
      for (const node of Array.from(list.children)) {
        const el = node as HTMLElement;
        const r = el.getBoundingClientRect();
        if (el.dataset.key) boxes.set(el.dataset.key, { x: r.left - origin.left, y: r.top - origin.top, w: r.width, el });
      }
      before.current = boxes;
    }
    setFilters(next);
  };

  // FLIP, second half: after React has placed the new list, play each result from where it was.
  useIsoLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    const list = listRef.current;
    if (!was || !list) return;
    const origin = list.getBoundingClientRect();
    const enter = easing('--ease-out-expo', ENTER);
    const kept = new Set<string>();
    let entering = 0;
    for (const node of Array.from(list.children)) {
      const el = node as HTMLElement;
      const key = el.dataset.key ?? '';
      kept.add(key);
      el.getAnimations?.().forEach((a) => a.cancel());
      const r = el.getBoundingClientRect();
      const prev = was.get(key);
      if (prev) {
        const dx = prev.x - (r.left - origin.left);
        const dy = prev.y - (r.top - origin.top);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 500, easing: enter });
        }
      } else {
        el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], {
          duration: 500,
          easing: enter,
          delay: 60 + entering++ * 60,
          fill: 'backwards',
        });
      }
    }
    // Leaving results fade where they stood, as inert clones in a layer React never renders into.
    const ghosts = ghostRef.current;
    if (!ghosts) return;
    was.forEach((box, key) => {
      if (kept.has(key)) return;
      const clone = box.el.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-key');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      Object.assign(clone.style, { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, margin: '0' });
      ghosts.appendChild(clone);
      const fade = clone.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(0.985)' }], {
        duration: 300,
        easing: easing('--ease-exit', EXIT),
        fill: 'forwards',
      });
      fade.onfinish = fade.oncancel = () => clone.remove();
    });
  }, [shownKey]);

  // Full finder: start from ?goal=&level=&format= (the home teaser links here with its choices), and let links
  // elsewhere on the page carry data-finder-goal / -level / -format to set the filters before scrolling here.
  useEffect(() => {
    if (compact) return;
    const fromUrl = readFilters((k) => new URLSearchParams(location.search).get(k));
    if (isActive(fromUrl)) setFilters(fromUrl);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>(
        'a[data-finder-goal], a[data-finder-level], a[data-finder-format]',
      );
      if (link) update(readFilters((k) => link.getAttribute(`data-finder-${k}`)));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
    // update only touches refs and the state setter, so this listener never goes stale.
  }, [compact]);

  useEffect(() => {
    if (compact) return;
    if (!urlReady.current) {
      urlReady.current = true;
      return;
    }
    writeUrl(filters);
  }, [filters, compact]);

  const toggleGoal = (g: Goal) =>
    update((f) => {
      const on = f.goals.includes(g);
      return { ...f, goals: GOALS.filter((x) => (x === g ? !on : f.goals.includes(x))) };
    });
  const toggleFormat = (v: Format) =>
    update((f) => {
      const on = f.formats.includes(v);
      return { ...f, formats: FORMATS.filter((x) => (x === v ? !on : f.formats.includes(x))) };
    });
  const setLevel = (level: Filters['level']) => {
    if (level !== filters.level) update((f) => ({ ...f, level }));
  };

  // Reset buttons disappear along with the state they belong to, so keyboard focus returns to the first filter.
  const apply = (next: Filters, e: ReactMouseEvent<HTMLElement>) => {
    const hadFocus = e.currentTarget === document.activeElement;
    update(next);
    if (hadFocus) requestAnimationFrame(() => firstOption.current?.focus());
  };

  // Empty state: offer the single changes that bring results back, most useful first.
  const suggestions = useMemo(() => {
    if (n > 0) return [];
    const options: { key: string; label: string; next: Filters }[] = [
      ...filters.goals.map((g) => ({ key: `goal-${g}`, label: GOAL_LABEL[g], next: { ...filters, goals: filters.goals.filter((x) => x !== g) } })),
      ...(filters.level !== 'any' ? [{ key: 'level', label: LEVEL_LABEL[filters.level], next: { ...filters, level: 'any' as const } }] : []),
      ...filters.formats.map((f) => ({ key: `format-${f}`, label: FORMAT_LABEL[f], next: { ...filters, formats: filters.formats.filter((x) => x !== f) } })),
    ];
    return options
      .map((o) => ({ ...o, count: countFor(o.next) }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [filters, n]);

  const status = !active
    ? compact
      ? `Showing ${shown.length} of ${n} courses`
      : `All ${n} courses`
    : n === 0
      ? 'No courses match'
      : compact && n > shown.length
        ? `Showing ${shown.length} of ${n} matching courses`
        : plural(n, 'course matches', 'courses match');

  const query = toQuery(filters);
  const moreHref = `/training/${query ? `?${query}` : ''}#course-finder`;
  const moreLabel = n > shown.length ? (active ? `See all ${n} matching courses` : `See all ${n} courses`) : 'Open the full course finder';

  return (
    <div className={`cf ${compact ? 'cf-compact' : 'cf-full'}`}>
      <div className="cf-layout">
        <div className="cf-filters">
          <div className="cf-groups" role="group" aria-label="Filter courses">
            <div className="cf-group cf-group-goal" role="group" aria-labelledby={`${uid}-goal`}>
              <p className="cf-group-label" id={`${uid}-goal`}>
                What do you want to work in? <span className="cf-hint">Pick any</span>
              </p>
              <div className="cf-options">
                {GOALS.map((g, i) => {
                  const on = filters.goals.includes(g);
                  return (
                    <button
                      key={g}
                      ref={i === 0 ? firstOption : undefined}
                      type="button"
                      className="cf-chip"
                      aria-pressed={on}
                      onClick={() => toggleGoal(g)}
                    >
                      <Glyph name={on ? 'check' : 'plus'} size={16} />
                      {GOAL_LABEL[g]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The home teaser asks one question; level and format live on the full finder. */}
            {!compact && (
              <>
                <div className="cf-group cf-group-level" role="group" aria-labelledby={`${uid}-level`}>
                  <p className="cf-group-label" id={`${uid}-level`}>
                    Where are you starting from?
                  </p>
                  <div className="cf-seg">
                    {(['any', ...LEVELS] as Filters['level'][]).map((l) => {
                      const label = l === 'any' ? 'Any level' : LEVEL_LABEL[l];
                      return (
                        <button key={l} type="button" className="cf-seg-btn" aria-pressed={filters.level === l} onClick={() => setLevel(l)}>
                          <span className="cf-seg-label" data-text={label}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cf-group cf-group-format" role="group" aria-labelledby={`${uid}-format`}>
                  <p className="cf-group-label" id={`${uid}-format`}>
                    How do you want to learn? <span className="cf-hint">Pick any</span>
                  </p>
                  <div className="cf-options">
                    {FORMATS.map((f) => {
                      const on = filters.formats.includes(f);
                      return (
                        <button key={f} type="button" className="cf-chip" aria-pressed={on} onClick={() => toggleFormat(f)}>
                          <Glyph name={on ? 'check' : FORMAT_ICON[f]} size={18} />
                          {FORMAT_LABEL[f]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Single column (phones, tablets): the results sit below every filter, so this jumps straight to them.
              The teaser shows its rows right under its one filter, so it does not need one. */}
          {!compact && (
            <a className="cf-jump btn btn-primary" href={`#${resultsId}`}>
              Show {plural(n, 'course', 'courses')}
            </a>
          )}
          {!compact && <p className="cf-tip">New to IT? Most people start with Cloud Mastery or Cybersecurity Essentials.</p>}
        </div>

        <div className="cf-results" id={resultsId}>
          <div className="cf-bar">
            <p className="cf-status" role="status">
              {status}
            </p>
            {active && n > 0 && (
              <button type="button" className="cf-clear" onClick={(e) => apply(EMPTY, e)}>
                <Glyph name="close" size={16} />
                Clear filters
              </button>
            )}
          </div>

          <div className="cf-stage">
            <ul ref={listRef} className="cf-list" role="list">
              {shown.map((c) => (
                <li key={c.id} data-key={c.id} className="cf-item">
                  {compact ? <CourseRow c={c} titleId={`${uid}-${c.id}`} /> : <CourseCard c={c} titleId={`${uid}-${c.id}`} />}
                </li>
              ))}
            </ul>
            <ul ref={ghostRef} className="cf-ghosts" aria-hidden="true" inert />
          </div>

          {n === 0 && (
            <div className="cf-empty">
              <p className="cf-empty-title">No course matches all of those choices.</p>
              {suggestions.length > 0 && (
                <>
                  <p className="cf-empty-text">Remove one to see the closest options:</p>
                  <div className="cf-options">
                    {suggestions.map((s) => (
                      <button key={s.key} type="button" className="cf-chip" onClick={(e) => apply(s.next, e)}>
                        <Glyph name="close" size={16} />
                        Remove {s.label}
                        <span className="cf-chip-count">
                          <span className="sr-only">, shows </span>
                          {plural(s.count, 'course', 'courses')}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="cf-empty-actions">
                <button type="button" className="btn btn-secondary" onClick={(e) => apply(EMPTY, e)}>
                  Clear all filters
                </button>
                <a className="link-arrow cf-cta" href={ENQUIRE_HREF}>
                  Ask us about training
                  <span className="btn-arrow">
                    <Glyph name="arrow" />
                  </span>
                </a>
              </div>
            </div>
          )}

          {compact ? (
            <div className="cf-foot">
              <a className="link-arrow cf-more" href={moreHref}>
                {moreLabel}
                <span className="btn-arrow">
                  <Glyph name="arrow" />
                </span>
              </a>
              <p className="cf-fine">Start dates and tuition on request.</p>
            </div>
          ) : (
            <p className="cf-note">
              Start dates and tuition are confirmed when you enquire. Ask about any course and a person will reply within one
              business day.
            </p>
          )}
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.cf { container: cf / inline-size; color: var(--text); }
.cf-layout { display: grid; gap: clamp(1.75rem, 1.2rem + 2vw, 2.75rem); }

/* Filters */
.cf-filters { container: cff / inline-size; min-width: 0; }
.cf-groups { display: grid; gap: 1.5rem; }
.cf-group { display: grid; gap: 0.75rem; min-width: 0; }
.cf-group-label { margin: 0; font-size: 0.9375rem; font-weight: 620; line-height: 1.35; }
.cf-hint { margin-left: 0.35rem; font-size: 0.8125rem; font-weight: 500; color: var(--text-muted); white-space: nowrap; }
@container cff (max-width: 20rem) { .cf-hint { display: block; margin: 0.15rem 0 0; } }
.cf-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.cf-chip {
  -webkit-appearance: none; appearance: none;
  display: inline-flex; align-items: center; gap: 0.45rem;
  min-height: 2.75rem; padding: 0.55rem 1rem 0.55rem 0.8rem;
  border: 1px solid var(--line-strong); border-radius: 999px;
  background: transparent; color: var(--text);
  font: inherit; font-size: 0.9375rem; font-weight: 600; line-height: 1.1;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms var(--ease-out-quart), border-color 160ms var(--ease-out-quart), color 160ms var(--ease-out-quart), transform 160ms var(--ease-out-quart);
}
.cf-chip:hover { border-color: var(--text); }
.cf-chip:active { transform: translateY(1px); }
.cf-chip svg { flex-shrink: 0; color: var(--text-muted); transition: color 160ms var(--ease-out-quart); }
/* Selected = inverted, like the primary button: ink on light themes, white on dark. --btn-text is that pairing. */
.cf-chip[aria-pressed="true"] { background: var(--text); border-color: var(--text); color: var(--btn-text, var(--bg)); }
.cf-chip[aria-pressed="true"] svg { color: inherit; }
.cf-chip-count { font-weight: 500; color: var(--text-muted); }

/* Level: a segmented control. Exactly one choice is pressed. */
.cf-seg {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.25rem;
  padding: 0.25rem; border: 1px solid var(--line); border-radius: 14px; background: color-mix(in oklch, var(--text) 5%, transparent);
}
.cf-seg-btn {
  display: inline-grid; place-items: center;
  min-height: 2.75rem; padding: 0.5rem 1rem;
  border: 0; border-radius: 10px; background: transparent; color: var(--text);
  font: inherit; font-size: 0.9375rem; font-weight: 550; line-height: 1.1;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background-color 160ms var(--ease-out-quart);
}
.cf-seg-btn:hover { background: color-mix(in oklch, var(--text) 9%, transparent); }
.cf-seg-btn[aria-pressed="true"] { font-weight: 650; background: var(--text); color: var(--btn-text, var(--bg)); }
.cf-seg-label { display: inline-grid; text-align: center; }
.cf-seg-label::after { content: attr(data-text); height: 0; overflow: hidden; visibility: hidden; font-weight: 650; }
@container cff (min-width: 30rem) {
  .cf-seg { display: inline-grid; grid-template-columns: none; grid-auto-flow: column; justify-self: start; border-radius: 999px; }
  .cf-seg-btn { border-radius: 999px; }
}
@container cff (min-width: 54rem) {
  .cf-groups { grid-template-columns: auto auto; justify-content: start; column-gap: 3rem; }
  .cf-group-goal { grid-column: 1 / -1; }
}
.cf-tip { margin: 1.75rem 0 0; padding-top: 1.25rem; border-top: 1px solid var(--line); max-width: 34ch; font-size: 0.875rem; line-height: 1.5; color: var(--text-muted); }
/* "Show N courses": only while the results sit below the filters, and it rides the bottom edge while you choose. */
.cf-jump { display: none; }
@container cf (max-width: 59.99rem) {
  .cf-jump { display: inline-flex; position: sticky; bottom: 1rem; z-index: 2; margin-top: 1rem; }
}

/* Results */
.cf-results { container: cfr / inline-size; display: grid; gap: 1rem; align-content: start; min-width: 0; scroll-margin-top: calc(var(--header-h) + 1rem); }
.cf-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.25rem 1rem; min-height: 2.75rem; }
.cf-status { margin: 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.cf-clear {
  display: inline-flex; align-items: center; gap: 0.4rem;
  min-height: 2.75rem; margin-right: -0.75rem; padding: 0.5rem 0.75rem;
  border: 0; border-radius: 999px; background: transparent; color: var(--text);
  font: inherit; font-size: 0.9375rem; font-weight: 600; cursor: pointer;
  text-decoration: underline; text-decoration-color: var(--line-strong); text-decoration-thickness: 1px; text-underline-offset: 0.3em;
  transition: text-decoration-color 160ms var(--ease-out-quart);
}
.cf-clear:hover { text-decoration-color: var(--accent); }
.cf-stage { position: relative; }
.cf-list { position: relative; z-index: 1; display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }
.cf-ghosts { position: absolute; inset: 0; z-index: 0; margin: 0; padding: 0; list-style: none; pointer-events: none; }
.cf-item { min-width: 0; }

.cf-head { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
.cf-kicker { order: -1; display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 1rem; margin: 0; font-size: 0.875rem; font-weight: 600; line-height: 1.3; }
.cf-track { color: var(--accent-ink); }
.cf-level { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--text-muted); }
.cf-meter { display: inline-flex; align-items: flex-end; gap: 2px; height: 0.75rem; }
.cf-meter span { width: 4px; border-radius: 1px; background: var(--line-strong); }
.cf-meter span:nth-child(1) { height: 45%; }
.cf-meter span:nth-child(2) { height: 72%; }
.cf-meter span:nth-child(3) { height: 100%; }
.cf-meter .is-on { background: var(--text); }
.cf-name { margin: 0; }
.cf-summary { margin: 0; max-width: 58ch; color: var(--text-muted); }
.cf-cta { justify-self: start; min-height: 2.75rem; }

/* Full catalogue: one card per course. */
.cf-card { display: grid; gap: 1.5rem; padding: clamp(1.25rem, 0.9rem + 1.5vw, 2rem); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface); }
.cf-k { margin: 0 0 0.65rem; font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); }
.cf-covers ul { display: grid; gap: 0.45rem; margin: 0; padding: 0; list-style: none; }
.cf-covers li { position: relative; padding-left: 1.1rem; font-size: 0.9375rem; line-height: 1.5; }
.cf-covers li::before { content: ""; position: absolute; left: 0.1rem; top: 0.6em; width: 0.35rem; height: 0.35rem; border-radius: 999px; background: var(--accent); }
.cf-spec { display: grid; gap: 1rem; align-content: start; margin: 0; }
.cf-spec > div { display: grid; gap: 0.4rem; }
.cf-spec dt { font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); }
.cf-spec dd { margin: 0; font-size: 0.9375rem; line-height: 1.5; }
.cf-formats { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
.cf-certs { display: grid; gap: 0.2rem; margin: 0; padding: 0; list-style: none; font-weight: 600; }
@container cfr (min-width: 40rem) {
  .cf-card { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); grid-template-rows: auto 1fr auto; column-gap: 2.5rem; row-gap: 1.25rem; }
  .cf-card .cf-head { grid-column: 1 / -1; margin-bottom: 0.5rem; }
  .cf-card .cf-covers { grid-column: 1; grid-row: 2; }
  .cf-card .cf-cta { grid-column: 1; grid-row: 3; align-self: end; }
  .cf-spec { grid-column: 2; grid-row: 2 / span 2; padding-left: 2rem; border-left: 1px solid var(--line); }
}
.cf-note { margin: 0.75rem 0 0; max-width: 60ch; font-size: 0.9375rem; color: var(--text-muted); }

/* Compact (home): one panel, one question, short rows divided by hairlines. */
.cf-compact .cf-layout { gap: 1.25rem; padding: clamp(1.25rem, 0.8rem + 2vw, 2rem); border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface); }
.cf-compact .cf-results { gap: 0; }
.cf-compact .cf-bar { padding-block: 0.5rem; border-top: 1px solid var(--line); }
.cf-compact .cf-list { gap: 0; }
.cf-row { display: grid; gap: 0.6rem; padding-block: 1.1rem 0.85rem; border-top: 1px solid var(--line); background: var(--surface); }
.cf-row .cf-head { gap: 0.35rem; }
.cf-row .cf-summary { font-size: 0.9375rem; line-height: 1.5; }
.cf-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.25rem 1.5rem; padding-top: 0.75rem; border-top: 1px solid var(--line); }
.cf-more { min-height: 2.75rem; }
.cf-fine { margin: 0; font-size: 0.8125rem; color: var(--text-muted); }

/* Empty state */
.cf-empty { display: grid; gap: 1rem; justify-items: start; padding: clamp(1.25rem, 0.9rem + 1.5vw, 2rem); border: 1px dashed var(--line-strong); border-radius: var(--radius-card); }
.cf-compact .cf-empty { margin-block: 1rem; }
.cf-empty-title { margin: 0; font-size: 1.1875rem; font-weight: 620; letter-spacing: -0.01em; line-height: 1.3; }
.cf-empty-text { margin: 0; color: var(--text-muted); }
.cf-empty-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.5rem; margin-top: 0.25rem; }
.motion-ok .cf-empty { animation: cf-rise 300ms var(--ease-out-expo) 80ms backwards; }
@keyframes cf-rise { from { opacity: 0; transform: translate3d(0, 16px, 0); } to { opacity: 1; transform: none; } }

@container cf (min-width: 60rem) {
  .cf-full .cf-layout { grid-template-columns: 18.5rem minmax(0, 1fr); column-gap: clamp(2.5rem, 0.5rem + 3.5vw, 4.5rem); align-items: start; }
  .cf-full .cf-filters { position: sticky; top: calc(var(--header-h) + 1.75rem); }
}
`;
