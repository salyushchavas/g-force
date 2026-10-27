import { heroScene } from "../lib/hero-scene";
import type { mountGlassName } from "./glass-name";

type Glass = Awaited<ReturnType<typeof mountGlassName>>;

/** One choreographed opening, followed by an ordinary, readable hero. */
export function initHeroIntro() {
  const hero = document.querySelector<HTMLElement>("[data-hero-intro]");
  if (!hero) return;
  const art = hero.querySelector<HTMLElement>(".hero-art")!;
  const poster = hero.querySelector<HTMLElement>(".hero-poster")!;
  const canvas = hero.querySelector<HTMLCanvasElement>("canvas")!;
  const copy = hero.querySelector<HTMLElement>(".hero-inner")!;
  const spacer = hero.querySelector<HTMLElement>(".hero-spacer")!;
  const title = hero.querySelector<HTMLElement>("#hero-title");
  // The entire copy moves together. A second, independently delayed reveal
  // would make the headline arrive late or remain masked after an interruption.
  title?.removeAttribute("data-reveal-mask");
  title?.classList.add("is-in");

  if (!hero.hasAttribute("data-intro-active")) return;
  document.body.append(art);
  art.classList.add("is-portal");
  let phase: "preparing" | "running" | "complete" = "preparing";
  let frame = 0;
  let scene: Glass | undefined;
  let live = false;
  let width = innerWidth;
  let height = innerHeight;
  let distance = height * 1.08;
  let destinationX = 130;
  let destinationWidth = 150;
  let lastProgress = 0;
  let started = 0;
  const duration = 1900;
  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const sceneLifetime = new AbortController();

  const measure = () => {
    width = art.clientWidth || innerWidth;
    height = art.clientHeight || innerHeight;
    distance = spacer.getBoundingClientRect().height;
    const logo = document
      .querySelector(".site-header .logo")
      ?.getBoundingClientRect();
    destinationX = logo ? logo.left + logo.width / 2 : width / 2;
    destinationWidth = Math.min(160, (logo?.width ?? 220) * 0.7);
    hero.style.setProperty("--air-brand-x", String(destinationX));
    hero.style.setProperty("--air-brand-width", String(destinationWidth));
  };
  const paint = (progress: number) => {
    if (phase === "complete") return;
    lastProgress = progress;
    const p = Math.min(1, (progress * distance) / height);
    const fill = width <= 700 ? 0.94 : 0.86;
    const scale = Math.exp(
      Math.log(Math.min(0.5, destinationWidth / (width * fill))) * p,
    );
    const firstY = height * (width <= 700 ? 0.56 : 0.62);
    const y = firstY + (36 - firstY) * (1 - (1 - p) ** 2);
    const lateral = 1 - (1 - Math.min(1, Math.max(0, (p - 0.45) / 0.35))) ** 3;
    const x = width / 2 + (destinationX - width / 2) * lateral;
    hero.style.setProperty("--air-p", p.toFixed(5));
    art.style.opacity = String(1 - Math.min(1, Math.max(0, (p - 0.65) / 0.28)));
    copy.style.transform = `translate3d(0, ${-distance * progress}px, 0)`;
    if (!live) {
      poster.style.clipPath = p > 0.58 ? "inset(0 0 20% 0)" : "none";
      poster.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale}) rotateY(${p * 360}deg)`;
    }
    scene?.paint();
  };
  const finish = () => {
    if (phase === "complete") return;
    const currentScroll = scrollY;
    phase = "complete";
    cancelAnimationFrame(frame);
    hero.dataset.introState = "complete";
    hero.removeAttribute("data-intro-active");
    hero.classList.add("intro-complete");
    copy.style.removeProperty("transform");
    art.remove();
    sceneLifetime.abort();
    scene?.stop();
    scene = undefined;
    // The intro spacer was never a real destination. Retain the same document
    // position if the visitor skipped down the page while it was preparing.
    if (currentScroll)
      scrollTo({
        top: Math.max(0, currentScroll - distance),
        behavior: "instant",
      });
    events.forEach((event) => removeEventListener(event, interrupt));
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", resize);
    removeEventListener("pagehide", finish);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", finish);
    hero.querySelector("[data-skip-intro]")?.removeEventListener("click", finish);
    hero.removeEventListener("hero:intro-timeout", finish);
    hero.dispatchEvent(new CustomEvent("hero:intro-complete"));
  };
  const interrupt = () => finish();
  const onScroll = () => {
    if (scrollY > 4) finish();
  };
  const resize = () => {
    measure();
    paint(lastProgress);
  };
  const onVisibility = () => {
    if (document.hidden) finish();
  };
  events.forEach((event) =>
    addEventListener(event, interrupt, { passive: true }),
  );
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", resize, { passive: true });
  addEventListener("pagehide", finish, { once: true });
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", finish, { once: true });
  hero.querySelector("[data-skip-intro]")?.addEventListener("click", finish);
  hero.addEventListener("hero:intro-timeout", finish, { once: true });
  poster.style.left = "0";
  poster.style.top = "0";
  measure();
  paint(0);

  canvas.addEventListener("webglcontextlost", () => {
    if (phase === "complete") return;
    live = false;
    canvas.classList.remove("is-ready");
    poster.classList.remove("is-live");
    scene?.stop();
    scene = undefined;
    paint(lastProgress);
  });

  const prepare = async () => {
    const image = poster.querySelector("img");
    const painted = image?.decode().catch(() => {});
    await Promise.race([
      Promise.all([painted, document.fonts.ready]),
      wait(500),
    ]);
    if (phase === "complete" || scrollY > 4) {
      finish();
      return;
    }
    measure();
    paint(0);
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const capable =
      matchMedia("(pointer: fine)").matches ||
      (navigator.hardwareConcurrency ?? 4) >= 6;
    // Start the actual 3D scene only for this short opening. Constrained/data-
    // saving visits use the matching compositor-animated glass poster instead.
    if (
      capable &&
      !connection?.saveData &&
      !/2g|3g/.test(connection?.effectiveType ?? "")
    ) {
      const ready = import("./glass-name")
        .then(({ mountGlassName }) =>
          phase !== "preparing"
            ? undefined
            : mountGlassName(canvas, {
                ...heroScene(innerWidth),
                progressEl: hero,
                signal: sceneLifetime.signal,
              }),
        )
        .then((glass) => {
          if (!glass) return;
          if (phase !== "preparing") {
            glass.stop();
            return;
          }
          scene = glass;
          live = true;
          canvas.classList.add("is-ready");
          poster.classList.add("is-live");
        })
        .catch(() => {});
      await Promise.race([ready, wait(550)]);
      if (!live) sceneLifetime.abort();
    } else await wait(180);
    if (phase === "complete") return;
    phase = "running";
    hero.dataset.introState = "running";
    started = performance.now();
    const tick = (now: number) => {
      if (phase !== "running") return;
      const t = Math.min(1, (now - started) / duration);
      // Continuous velocity at both ends; one rAF owns the complete handoff.
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      paint(eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
  };
  prepare();
}
