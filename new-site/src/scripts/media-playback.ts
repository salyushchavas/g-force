// One lifecycle for every silent film. Only visible, eligible media receives a
// source; rapid scrolling never preloads several films or leaves hidden decoders
// running. Each short clip plays once, resumes after leaving the viewport, then
// rests on its final frame. Only blocked/failed or opted-in playback needs a button.
type Film = {
  video: HTMLVideoElement;
  frame: HTMLElement;
  button: HTMLButtonElement | null;
  status: HTMLElement | null;
  ambient: boolean;
  visible: boolean;
  fraction: number;
  hover: boolean;
  completed: boolean;
  resumeAt: number;
  manual: boolean;
  blocked: boolean;
  failed: boolean;
  pending: boolean;
  wanted: boolean;
  stallTimer: number;
  bufferTimer: number;
  attempt: number;
};

export function initMediaPlayback() {
  const nodes = Array.from(
    document.querySelectorAll<HTMLVideoElement>("video[data-video-mode]"),
  );
  if (!nodes.length) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const desktopPointer = matchMedia(
    "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  );
  const compact = matchMedia("(max-width: 767px), (pointer: coarse)");
  const connection = (
    navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
        addEventListener?: (type: string, fn: () => void) => void;
      };
    }
  ).connection;
  const films: Film[] = nodes.map((video) => {
    const frame = video.closest<HTMLElement>("[data-video-frame]")!;
    video.loop = false;
    return {
      video,
      frame,
      button: frame.querySelector("[data-video-toggle]"),
      status: frame.querySelector("[data-video-status]"),
      ambient: !!frame.closest("[data-video-ambient]"),
      visible: false,
      fraction: 0,
      hover: false,
      completed: false,
      resumeAt: 0,
      manual: false,
      blocked: false,
      failed: false,
      pending: false,
      wanted: false,
      stallTimer: 0,
      bufferTimer: 0,
      attempt: 0,
    };
  });
  const byVideo = new Map(films.map((film) => [film.video, film]));
  let settleTimer = 0;

  const syncControl = (film: Film) => {
    if (!film.button) return;
    const action = film.failed ? "Retry" : "Play";
    const label = `${action} ${film.video.dataset.videoLabel || "video"}`;
    film.button.hidden =
      film.completed ||
      film.wanted ||
      !(film.blocked || film.failed || motion.matches || connection?.saveData);
    film.button.dataset.state = film.failed ? "retry" : "ready";
    film.button.setAttribute("aria-label", label);
    film.button.title = label;
  };
  const clearPlaybackTimers = (film: Film) => {
    clearTimeout(film.stallTimer);
    clearTimeout(film.bufferTimer);
    film.stallTimer = 0;
    film.bufferTimer = 0;
  };
  const pause = (film: Film) => {
    // Some WebKit media backends reset their clock when resuming an off-screen
    // decoder. Retain the last playhead independently of that native clock.
    if (!film.completed) film.resumeAt = Math.max(film.resumeAt, film.video.currentTime);
    film.wanted = false;
    clearPlaybackTimers(film);
    film.video.pause();
    syncControl(film);
  };
  const armBufferTimeout = (film: Film) => {
    if (!film.wanted || film.bufferTimer) return;
    // A request may hang without rejecting play() or emitting a media error.
    // Bound each uninterrupted start/buffer attempt, then require an explicit retry.
    film.bufferTimer = window.setTimeout(() => {
      film.bufferTimer = 0;
      if (!film.wanted) return;
      film.failed = true;
      film.manual = false;
      film.pending = false;
      film.attempt++;
      pause(film);
      film.video.classList.remove("is-playing");
      film.video.removeAttribute("src");
      delete film.video.dataset.attached;
      film.video.load();
      if (film.status)
        film.status.textContent =
          "The video is taking too long to load. A still image is shown. You can retry the video.";
      syncControl(film);
      schedule();
    }, 9000);
  };
  const attach = (film: Film, retry = false) => {
    const { video } = film;
    if (video.dataset.attached && !retry) return;
    // H.264 uses hardware decoding across iOS/Android. The smaller source also
    // serves narrow windows and slow connections; WebM is a compatibility fallback.
    const small =
      compact.matches || /(^|-)2g$|3g/.test(connection?.effectiveType || "");
    const mp4 = small
      ? video.dataset.srcMobile || video.dataset.srcMp4
      : video.dataset.srcMp4;
    const source =
      video.canPlayType("video/mp4") && mp4
        ? mp4
        : video.dataset.srcWebm || mp4;
    if (!source) return;
    video.muted = true;
    video.defaultMuted = true;
    video.preload = "auto";
    video.src = source;
    video.dataset.attached = "1";
    video.load();
  };
  const start = (film: Film) => {
    if (film.pending || film.completed || document.hidden) return;
    film.wanted = true;
    film.blocked = false;
    if (film.status) film.status.textContent = "";
    attach(film, film.failed);
    film.failed = false;
    syncControl(film);
    film.pending = true;
    const attempt = ++film.attempt;
    armBufferTimeout(film);
    film.video
      .play()
      .catch((error: DOMException) => {
        if (attempt !== film.attempt) return;
        if (error.name !== "AbortError" && film.wanted) {
          film.blocked = true;
          pause(film);
          film.video.classList.remove("is-playing");
        }
      })
      .finally(() => {
        if (attempt !== film.attempt) return;
        film.pending = false;
        if (!film.wanted) film.video.pause();
        else if (film.video.paused) schedule();
      });
  };
  const eligible = (film: Film) => {
    if (
      !film.visible ||
      film.completed ||
      (film.failed && !film.manual) ||
      (film.blocked && !film.manual) ||
      document.hidden
    )
      return false;
    if (
      film.frame.closest("[hidden], [inert]") ||
      getComputedStyle(film.frame).visibility === "hidden"
    )
      return false;
    // Decorative full-section clouds remain a still image on phones. The
    // foreground film gets the one mobile decoder instead of competing with it.
    if (compact.matches && film.ambient) return false;
    if (!film.manual && (motion.matches || connection?.saveData)) return false;
    if (film.video.dataset.videoMode === "hover" && desktopPointer.matches) {
      const row = film.frame.closest("[data-svc-row]");
      if (row && !row.hasAttribute("data-active")) return false;
      if (!film.hover && !film.manual) return false;
    }
    return true;
  };
  const reconcile = () => {
    clearTimeout(settleTimer);
    const candidates = films
      .filter(eligible)
      .sort(
        (a, b) =>
          Number(a.ambient) - Number(b.ambient) ||
          b.fraction - a.fraction ||
          Number(b.manual) - Number(a.manual),
      );
    const selected = new Set(candidates.slice(0, compact.matches ? 1 : 2));
    films.forEach((film) => {
      if (!selected.has(film)) pause(film);
      else if (film.video.paused && !film.pending) start(film);
    });
  };
  const schedule = () => {
    // Stop immediately, start only once the new viewport has settled. No scroll
    // listener or per-frame layout reads are needed for media playback.
    films.forEach((film) => {
      if (film.wanted && !eligible(film)) pause(film);
    });
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(reconcile, 120);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const film = byVideo.get(entry.target as HTMLVideoElement);
        if (!film) return;
        film.fraction = entry.intersectionRatio;
        film.visible =
          entry.isIntersecting &&
          entry.intersectionRect.height >=
            Math.min(96, entry.boundingClientRect.height * 0.35);
      });
      schedule();
    },
    { threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] },
  );

  films.forEach((film) => {
    const { video, button } = film;
    observer.observe(video);
    if (button) {
      syncControl(film);
      button.addEventListener("click", () => {
        if (film.completed || film.wanted) return;
        film.manual = true;
        film.blocked = false;
        // Keep play() in the click gesture for iOS / autoplay-blocked browsers.
        films.filter((item) => item !== film).forEach(pause);
        start(film);
      });
    }
    const scope =
      video.closest<HTMLElement>("[data-hover-scope]") ?? film.frame;
    const hover = (active: boolean) => {
      film.hover = active;
      schedule();
    };
    scope.addEventListener("pointerenter", () => hover(true));
    scope.addEventListener("pointerleave", () =>
      hover(scope.contains(document.activeElement)),
    );
    scope.addEventListener("focusin", () => hover(true));
    scope.addEventListener("focusout", (event) =>
      hover(scope.contains(event.relatedTarget as Node)),
    );
    video.addEventListener("playing", () => {
      if (!film.wanted || !eligible(film)) {
        pause(film);
        return;
      }
      if (video.currentTime + 0.05 < film.resumeAt) video.currentTime = film.resumeAt;
      clearPlaybackTimers(film);
      video.classList.add("is-playing");
      syncControl(film);
    });
    video.addEventListener("waiting", () => {
      if (!film.wanted) return;
      clearTimeout(film.stallTimer);
      film.stallTimer = window.setTimeout(
        () => video.classList.remove("is-playing"),
        1500,
      );
      armBufferTimeout(film);
    });
    video.addEventListener("error", () => {
      film.failed = true;
      film.manual = false;
      pause(film);
      video.classList.remove("is-playing");
      if (film.status)
        film.status.textContent =
          "The video could not be loaded. A still image is shown.";
      syncControl(film);
      schedule();
    });
    video.addEventListener("pause", () => {
      if (video.paused) clearPlaybackTimers(film);
      if (!film.wanted) syncControl(film);
    });
    video.addEventListener("ended", () => {
      film.completed = true;
      video.dataset.videoComplete = "true";
      pause(film);
      schedule();
    });
  });
  // Inactive service previews share the same rectangle, so IntersectionObserver
  // alone cannot detect switching rows. Hidden/inert panels need the same check.
  const changes = new MutationObserver(schedule);
  document
    .querySelectorAll("[data-svc-index], [data-video-group]")
    .forEach((scope) => {
      changes.observe(scope, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-active", "hidden", "inert"],
      });
    });
  document.addEventListener("visibilitychange", () =>
    document.hidden ? films.forEach(pause) : schedule(),
  );
  addEventListener("pagehide", () => {
    clearTimeout(settleTimer);
    films.forEach(pause);
  });
  addEventListener("pageshow", schedule);
  motion.addEventListener("change", () => {
    films.forEach(syncControl);
    schedule();
  });
  desktopPointer.addEventListener("change", schedule);
  compact.addEventListener("change", schedule);
  connection?.addEventListener?.("change", () => {
    films.forEach(syncControl);
    schedule();
  });
}
