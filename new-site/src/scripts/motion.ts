// Site motion and small interactions (DESIGN.md "Motion", tuned with the Air motion verdict).
// Every effect enhances content that is already visible; .motion-ok (set in <head>) gates the start states.
import Lenis from 'lenis';
import { initMediaPlayback } from './media-playback';

const root = document.documentElement;
const motionOK = root.classList.contains('motion-ok');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(1 - t, 4)); // close to cubic-bezier(.22,1,.36,1) for counts

/* ---------- Smooth scroll: wheel/trackpad only, settles in ~0.7 s; touch keeps native scrolling ---------- */
let lenis: Lenis | null = null;
if (motionOK && finePointer) {
  lenis = new Lenis({ lerp: 0.15, smoothWheel: true, anchors: { offset: -80 }, autoRaf: true });
  (window as Window & { __lenis?: Lenis }).__lenis = lenis;
}
const onScroll = (fn: () => void) => (lenis ? lenis.on('scroll', fn) : addEventListener('scroll', fn, { passive: true }));

/* ---------- Reveals ---------- */
document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
  Array.from(group.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)));
});

const revealTargets = Array.from(
  document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal="load"]), [data-reveal-mask]:not([data-reveal-mask="load"]), [data-stagger]'),
);
if (motionOK) {
  const revealImmediately = (el: HTMLElement) => {
    el.classList.add('is-instant', 'is-in');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-instant')));
  };
  // A heading must never depend on this module downloading to become readable.
  // CSS only masks targets after their observer is installed. Anything already
  // reached (including a restored scroll position or deep link) stays visible.
  const vh = innerHeight;
  const pending: HTMLElement[] = [];
  for (const el of revealTargets) {
    const r = el.getBoundingClientRect();
    if (r.top < vh - 24) {
      revealImmediately(el);
    } else pending.push(el);
  }

  // Trigger near the viewport edge, before the visitor starts reading the block.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -24px 0px', threshold: 0 },
  );
  pending.forEach((el) => {
    io.observe(el);
    el.classList.add('is-reveal-ready');
  });
  // Restoring a page, following an anchor or focusing into content must not wait
  // for an observer tick. This also covers delayed layout after fonts hydrate.
  const showReached = () => {
    pending.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight - 24) {
        revealImmediately(el);
        io.unobserve(el);
      }
    });
  };
  addEventListener('pageshow', showReached);
  addEventListener('hashchange', showReached);
  document.addEventListener('focusin', (event) => {
    const target = event.target as Element;
    const reveal = target.closest<HTMLElement>('.is-reveal-ready');
    if (reveal) {
      revealImmediately(reveal);
      io.unobserve(reveal);
    }
  });
  window.setTimeout(showReached, 3000);
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

/* ---------- Counters (final value is in the HTML; motion only replays it) ---------- */
const formatCount = (el: HTMLElement, v: number) => {
  const decimals = Number(el.dataset.decimals ?? 0);
  el.textContent = v.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
if (motionOK && counters.length) {
  const cio = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        cio.unobserve(el);
        const to = Number(el.dataset.count);
        const from = Number(el.dataset.countFrom ?? 0);
        const dur = Number(el.dataset.duration ?? 700);
        const delay = Number(el.dataset.delay ?? 0);
        setTimeout(() => {
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            formatCount(el, from + (to - from) * easeOut(p));
            if (p < 1) requestAnimationFrame(tick);
            else formatCount(el, to);
          };
          formatCount(el, from);
          requestAnimationFrame(tick);
        }, delay);
      }
    },
    // Count only once the figure is fully in the upper 70% of the viewport, where the eye is, not as it peeks in.
    { threshold: 1, rootMargin: '0px 0px -30% 0px' },
  );
  counters.forEach((el) => cio.observe(el));
}

/* ---------- Scroll-linked progress: writes --p (0..1) on [data-scroll-progress] ---------- */
const progressEls = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
const lastProgress = new WeakMap<HTMLElement, string>();
const shifts = new Map(progressEls.filter((el) => el.hasAttribute('data-dawn-stage')).map((el) => [el, {
  steps: Array.from(el.querySelectorAll<HTMLElement>('[data-shift-step]')),
}]));
const updateProgress = () => {
  const vh = innerHeight;
  // Read layout once before any style writes. Interleaving these phases forces
  // repeated style/layout work while media and React islands enter the page.
  const positions = progressEls.map((el) => el.getBoundingClientRect());
  for (let index = 0; index < progressEls.length; index++) {
    const el = progressEls[index];
    const r = positions[index];
    const mode = el.dataset.scrollProgress;
    let p: number;
    if (mode === 'sticky') p = -r.top / Math.max(1, r.height - vh); // tall wrapper with a sticky child
    else if (mode === 'leave') p = -r.top / Math.max(1, r.height); // 0 at top of viewport, 1 when fully scrolled past
    else if (mode === 'enter') p = (vh - r.top) / vh; // 0 as it enters, 1 when its top reaches the top
    else p = (vh - r.top) / (vh + r.height); // through
    const progress = Math.min(1, Math.max(0, p));
    const value = progress.toFixed(4);
    if (lastProgress.get(el) === value) continue;
    lastProgress.set(el, value);
    el.style.setProperty('--p', value);
    const shift = shifts.get(el);
    if (shift) {
      const elapsed = Math.min(1, Math.max(0, (progress - 0.12) / 0.55));
      const milestones = [0, 0.27, 0.54, 1];
      shift.steps.forEach((step, index) => {
        const complete = String(elapsed >= milestones[index]);
        if (step.dataset.complete !== complete) step.dataset.complete = complete;
      });
    }
  }
};
if (progressEls.length) {
  if (motionOK) {
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        updateProgress();
      });
    };
    // Lenis emits its scroll event inside its own rAF, so --p is written in that same frame; a nested rAF would land a frame late.
    // Native scroll events arrive before the frame's rAF callbacks, so that path still coalesces into one rAF.
    if (lenis) lenis.on('scroll', updateProgress);
    else addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    updateProgress();
  } else progressEls.forEach((el) => el.style.setProperty('--p', el.dataset.restP ?? '1'));
}

/* ---------- Header: transparent over the night hero, then takes the tone of the section beneath it ---------- */
const header = document.querySelector<HTMLElement>('[data-site-header]');
if (header) {
  const setHeader = () => {
    header.classList.toggle('is-scrolled', scrollY > 24);
    const probe = document.elementFromPoint(innerWidth / 2, header.offsetHeight + 2);
    const overHero = probe?.closest<HTMLElement>('[data-night-hero]');
    // Only full-bleed sections set the tone; a dark card passing under the header does not.
    // An explicit tone on a wrapper (e.g. a band class on a div around several sections) wins over the section inside it.
    const toned = probe?.closest<HTMLElement>('[data-header-tone]');
    const section = toned ?? probe?.closest<HTMLElement>('section, footer');
    const overNight = !overHero && section && (section.classList.contains('band-night') || section.dataset.headerTone === 'night');
    // Inner pages' night heroes: a solid bar once content scrolls under it, so text never prints through.
    // The home .hero keeps its transparent bar (the glass name hands off to the header logo there).
    const heroScrolled = !!overHero && !overHero.classList.contains('hero') && scrollY > 24;
    header.classList.toggle('is-over-night', Boolean(overHero || overNight));
    header.classList.toggle('is-solid-night', Boolean(overNight || heroScrolled));
    header.classList.toggle('is-over-dawn', Boolean(probe?.closest('[data-dawn-hero]')));
  };
  setHeader();
  onScroll(setHeader);
  addEventListener('resize', setHeader, { passive: true });
}

/* ---------- Video ---------- */
initMediaPlayback();

/* ---------- Theme toggle ---------- */
const applyThemeLabels = () => {
  const dark = root.dataset.theme === 'dark';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    // The label names the action, so the button is not also a toggle ("Switch to light theme, pressed" reads as a contradiction).
    b.removeAttribute('aria-pressed');
    b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  });
};
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) =>
  b.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('gf-theme', next);
    } catch {}
    applyThemeLabels();
  }),
);
applyThemeLabels();

/* ---------- Mobile menu ---------- */
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.getElementById('mobile-menu');
if (menuBtn && menu) {
  const setOpen = (open: boolean) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) {
      lenis?.stop();
      menu.querySelector<HTMLElement>('a, button')?.focus();
    } else lenis?.start();
  };
  menuBtn.addEventListener('click', () => setOpen(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menuBtn.focus();
    }
  });
  matchMedia('(min-width: 1200px)').addEventListener('change', (m) => m.matches && setOpen(false));
}

/* ---------- Toronto local time ---------- */
const clocks = document.querySelectorAll<HTMLElement>('[data-toronto-time]');
if (clocks.length) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit' });
  const tick = () => clocks.forEach((c) => (c.textContent = fmt.format(new Date()).replace(/\./g, '').toUpperCase()));
  tick();
  setInterval(tick, 30_000);
}

/* ---------- Year ---------- */
document.querySelectorAll<HTMLElement>('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));
