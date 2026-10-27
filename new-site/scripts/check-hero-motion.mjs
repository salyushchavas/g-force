// Fresh-load introduction regression against a running production preview.
// GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs npm run check:hero
// Optional: GFORCE_REVIEW_URL, GFORCE_BROWSER_ENGINE=webkit,
// GFORCE_REVIEW_OUTPUT, GFORCE_QA_CASES=desktop,mobile (comma-separated).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const engines = await import(process.env.GFORCE_BROWSER_MODULE || "playwright");
const engine = process.env.GFORCE_BROWSER_ENGINE || "chromium";
const base =
  process.env.GFORCE_REVIEW_URL ||
  process.env.GFORCE_TEST_URL ||
  "http://127.0.0.1:4404";
const output =
  process.env.GFORCE_REVIEW_OUTPUT || join(tmpdir(), `gforce-intro-${engine}`);
const selected = process.env.GFORCE_QA_CASES?.split(",");
await mkdir(output, { recursive: true });
const browser = await engines[engine].launch({
  headless: true,
  ...(engine === "chromium"
    ? { channel: "chrome", args: ["--use-angle=metal"] }
    : {}),
});
const results = [];

// Sample the actual moving sequence, rather than treating a settled screenshot
// or an idle Lighthouse run as proof of smoothness. Intervals are evidence, not
// a hardware-independent frame-rate guarantee.
function instrument() {
  window.introQA = {
    draws: 0,
    contexts: 0,
    completed: 0,
    frames: [],
    longTasks: [],
    errors: [],
  };
  const qa = window.introQA;
  const contexts = new WeakSet();
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = getContext.call(this, type, ...args);
    if (/webgl/.test(type) && context && !contexts.has(context)) {
      contexts.add(context);
      qa.contexts++;
    }
    return context;
  };
  for (const prototype of [
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ].filter(Boolean)) {
    for (const name of ["drawElements", "drawArrays"]) {
      const original = prototype[name];
      prototype[name] = function (...args) {
        qa.draws++;
        return original.apply(this, args);
      };
    }
  }
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    new PerformanceObserver((list) =>
      qa.longTasks.push(
        ...list
          .getEntries()
          .map(({ startTime, duration }) => ({ start: startTime, duration })),
      ),
    ).observe({ type: "longtask", buffered: true });
  }
  document.addEventListener(
    "hero:intro-complete",
    () => {
      qa.completed++;
    },
    { capture: true },
  );
  const sample = (now) => {
    const hero = document.querySelector("[data-hero-intro]");
    const copy = hero?.querySelector(".hero-inner");
    if (hero && copy) {
      const title = hero.querySelector("#hero-title");
      qa.frames.push({
        now,
        state: hero.dataset.introState,
        y: copy.getBoundingClientRect().top,
        titleY: title.getBoundingClientRect().top,
        progress: Number(hero.style.getPropertyValue("--air-p")),
        scrollY,
        art: !!document.querySelector(".hero-art.is-portal"),
        draws: qa.draws,
      });
      if (qa.frames.length > 1200) qa.frames.shift();
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}
const snapshot = (page) =>
  page.evaluate(() => {
    const hero = document.querySelector("[data-hero-intro]");
    const title = document.querySelector("#hero-title");
    const cta = document.querySelector(".hero-ctas");
    const titleBox = title.getBoundingClientRect();
    const ctaBox = cta.getBoundingClientRect();
    const copyBox = document
      .querySelector(".hero-copy")
      .getBoundingClientRect();
    return {
      state: hero.dataset.introState,
      active: hero.hasAttribute("data-intro-active"),
      art: !!document.querySelector(".hero-art.is-portal"),
      canvas: !!document.querySelector(".hero-art canvas"),
      scrollY,
      title: {
        top: titleBox.top,
        bottom: titleBox.bottom,
        opacity: getComputedStyle(title).opacity,
        text: title.innerText,
      },
      cta: {
        top: ctaBox.top,
        bottom: ctaBox.bottom,
        afterCopy: ctaBox.top >= copyBox.bottom,
      },
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      copyTransform: document.querySelector(".hero-inner").style.transform,
      ...window.introQA,
    };
  });
const complete = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector("[data-hero-intro]")?.dataset.introState ===
      "complete",
    null,
    { timeout: 9000 },
  );
function assertFinished(state, label) {
  assert.equal(state.state, "complete", `${label}: intro did not complete`);
  assert.equal(state.active, false, `${label}: spacer still active`);
  assert.equal(state.art, false, `${label}: artwork still covers the page`);
  assert.equal(
    state.copyTransform,
    "",
    `${label}: copy retains an animation transform`,
  );
  assert.equal(state.overflow, false, `${label}: horizontal overflow`);
  assert(Number(state.title.opacity) === 1, `${label}: heading is transparent`);
  assert(state.cta.afterCopy, `${label}: actions overlap the hero copy`);
}
function frameEvidence(state) {
  const moving = state.frames.filter((frame) => frame.state === "running");
  const intervals = moving
    .slice(1)
    .map((frame, i) => frame.now - moving[i].now);
  const sorted = intervals.toSorted((a, b) => a - b);
  const lastMoving = moving.at(-1);
  const firstComplete = state.frames.find(
    (frame) =>
      frame.state === "complete" && (!lastMoving || frame.now > lastMoving.now),
  );
  return {
    frames: moving.length,
    durationMs: moving.length > 1 ? moving.at(-1).now - moving[0].now : 0,
    medianIntervalMs: sorted[Math.floor(sorted.length / 2)] || 0,
    p95IntervalMs:
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ||
      0,
    maxIntervalMs: Math.max(0, ...intervals),
    framesOver34ms: intervals.filter((value) => value > 34).length,
    endJumpPx:
      lastMoving && firstComplete
        ? Math.abs(firstComplete.y - lastMoving.y)
        : null,
    startupLongTasks: state.longTasks.filter(
      (task) => !moving.length || task.start < moving[0].now,
    ),
    movingLongTasks: state.longTasks.filter(
      (task) =>
        moving.length &&
        task.start >= moving[0].now &&
        task.start <= moving.at(-1).now,
    ),
  };
}

const configurations = [
  { name: "desktop", width: 1440 },
  { name: "mobile", width: 390 },
  { name: "narrow", width: 320 },
  { name: "compact", width: 320, height: 568, short: true },
  { name: "landscape", width: 844, height: 390, short: true },
  { name: "cancel-wheel", width: 1440, cancel: "wheel" },
  { name: "cancel-touch", width: 390, cancel: "touchstart" },
  { name: "cancel-keyboard", width: 1440, cancel: "keydown" },
  { name: "cancel-scroll", width: 390, cancel: "scroll" },
  { name: "reduced", width: 390, reduced: true },
  { name: "savedata", width: 390, saveData: true },
  { name: "no-webgl", width: 1440, noWebGL: true },
  { name: "context-loss", width: 1440, contextLoss: true },
  { name: "late-module", width: 390, lateModule: true },
  ...(engine === "chromium"
    ? [{ name: "throttled", width: 390, throttled: true }]
    : []),
  { name: "module-failure", width: 390, moduleFailure: true },
  { name: "hash", width: 390, hash: "#paths" },
  { name: "reload", width: 390, reload: true },
  { name: "history", width: 1440, history: true },
];
try {
  for (const config of configurations.filter(
    (item) => !selected || selected.includes(item.name),
  )) {
    const started = Date.now();
    const context = await browser.newContext({
      viewport: {
        width: config.width,
        height: config.height || (config.width <= 700 ? 844 : 900),
      },
      isMobile: config.width <= 700,
      hasTouch: config.width <= 700,
      reducedMotion: config.reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    if (config.throttled) {
      const session = await context.newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await session.send("Network.enable");
      await session.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 100,
        downloadThroughput: 500 * 1024,
        uploadThroughput: 250 * 1024,
        connectionType: "cellular4g",
      });
    }
    const requests = [],
      errors = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("pageerror", (error) => errors.push(error.message));
    await context.addInitScript(instrument);
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "hardwareConcurrency", { value: 8 }),
    );
    if (config.saveData)
      await context.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true, effectiveType: "4g" },
        }),
      );
    if (config.noWebGL)
      await context.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return /webgl/.test(type)
            ? null
            : getContext.call(this, type, ...args);
        };
      });
    if (config.moduleFailure)
      await page.route("**/_astro/Hero.astro_astro_type_script_*.js", (route) =>
        route.abort("failed"),
      );
    if (config.lateModule)
      await page.route("**/_astro/glass-name.*.js", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1300));
        await route.continue().catch(() => {});
      });
    let result;
    try {
      await page.goto(`${base}/${config.hash || ""}`, {
        waitUntil: "domcontentloaded",
      });
      if (!config.reduced && !config.hash && !config.moduleFailure) {
        await page.waitForFunction(
          () =>
            document.querySelector("[data-hero-intro]")?.dataset.introState ===
            "running",
          null,
          { timeout: 7000 },
        );
        // Screenshots themselves can stall WebKit's rendering pipeline. Capture
        // moving visuals in a separate opt-in run; leave timing runs untouched.
        if (
          process.env.GFORCE_QA_MOVING_SCREENSHOTS === "1" &&
          ["desktop", "mobile", "narrow", "savedata", "no-webgl"].includes(
            config.name,
          )
        )
          await page.screenshot({
            path: join(output, `intro-${engine}-${config.name}-moving.png`),
          });
      }
      let cancellationMs;
      if (config.contextLoss) {
        await page.evaluate(() => {
          const canvas = document.querySelector(".hero-art canvas");
          canvas
            .getContext("webgl2")
            ?.getExtension("WEBGL_lose_context")
            ?.loseContext();
        });
        await page.waitForFunction(
          () =>
            !document
              .querySelector(".hero-art canvas")
              ?.classList.contains("is-ready"),
        );
        const restored = await page
          .locator(".hero-art .hero-poster")
          .evaluate((element) => !element.classList.contains("is-live"));
        assert(restored, "Context loss did not restore the poster");
      }
      if (config.cancel) {
        const before = Date.now();
        if (config.cancel === "wheel") await page.mouse.wheel(0, 50);
        else if (config.cancel === "keydown")
          await page.keyboard.press("ArrowDown");
        else if (config.cancel === "scroll")
          await page.evaluate(() => scrollTo(0, 100));
        else await page.evaluate(() => dispatchEvent(new Event("touchstart")));
        await complete(page);
        cancellationMs = Date.now() - before;
        assert(
          cancellationMs < 500,
          `${config.name}: cancellation took ${cancellationMs}ms`,
        );
      }
      await complete(page);
      await page.waitForTimeout(100);
      const state = await snapshot(page);
      assertFinished(state, config.name);
      if (!config.hash && !config.cancel) {
        assert(
          state.title.top >= 65 && state.title.bottom < state.viewport.height,
          `${config.name}: hero heading not fully visible`,
        );
        if (!config.short)
          assert(
            state.cta.bottom <= state.viewport.height + 1,
            `${config.name}: primary actions below the first viewport`,
          );
      }
      const draws = state.draws;
      await page.waitForTimeout(250);
      await page.evaluate(() => scrollTo(0, innerHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(100);
      const after = await snapshot(page);
      assert.equal(
        after.draws,
        draws,
        `${config.name}: GPU drew after intro completion`,
      );
      assert.equal(
        after.art,
        false,
        `${config.name}: intro returned after scrolling back`,
      );
      assert.equal(
        after.completed,
        state.completed,
        `${config.name}: intro ran more than once`,
      );
      if (
        config.reduced ||
        config.hash ||
        config.saveData ||
        config.moduleFailure ||
        config.lateModule
      ) {
        assert.equal(
          state.draws,
          0,
          `${config.name}: fallback initialized live WebGL`,
        );
        assert.equal(
          requests.filter((url) =>
            /gforce-glass-original|glass-light-v2/.test(url),
          ).length,
          0,
          `${config.name}: fetched deferred geometry/lighting`,
        );
        assert.equal(
          state.contexts,
          0,
          `${config.name}: created a WebGL context`,
        );
      }
      const frames = frameEvidence(state);
      if (
        !config.cancel &&
        !config.hash &&
        !config.reduced &&
        !config.moduleFailure
      ) {
        assert(
          frames.frames >= 15,
          `${config.name}: no useful moving sequence captured`,
        );
        assert(
          frames.endJumpPx !== null && frames.endJumpPx < 3,
          `${config.name}: final copy jumped ${frames.endJumpPx}px`,
        );
      }
      if (config.reload) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(
          () =>
            document.querySelector("[data-hero-intro]")?.dataset.introState ===
            "running",
        );
        await complete(page);
        assertFinished(await snapshot(page), "reload again");
      }
      if (config.history) {
        await page.goto(`${base}/business/`, { waitUntil: "domcontentloaded" });
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(250);
        assertFinished(await snapshot(page), "history return");
        assert.equal(
          await page.evaluate(() =>
            document
              .querySelector("[data-hero-intro]")
              .hasAttribute("data-intro-active"),
          ),
          false,
          "History return replayed the intro",
        );
      }
      assert.deepEqual(errors, [], `${config.name}: page errors`);
      if (["desktop", "mobile", "narrow"].includes(config.name))
        await page.screenshot({
          path: join(output, `intro-${engine}-${config.name}-complete.png`),
        });
      result = {
        name: config.name,
        passed: true,
        width: config.width,
        elapsedMs: Date.now() - started,
        cancellationMs,
        state: { ...state, frames: undefined, longTasks: undefined },
        evidence: frames,
        geometryRequests: requests.filter((url) =>
          /gforce-glass-original|glass-light-v2/.test(url),
        ),
        errors,
      };
      await writeFile(
        join(output, `intro-${engine}-${config.name}-frames.json`),
        JSON.stringify(
          { config, frames: state.frames, longTasks: state.longTasks },
          null,
          2,
        ),
      );
    } catch (error) {
      result = {
        name: config.name,
        passed: false,
        elapsedMs: Date.now() - started,
        error: error.message,
        state: await snapshot(page).catch(() => undefined),
        errors,
      };
      await page
        .screenshot({
          path: join(output, `intro-${engine}-${config.name}-failure.png`),
        })
        .catch(() => {});
    } finally {
      results.push(result);
      console.log(
        JSON.stringify({
          ...result,
          state: result.state && {
            ...result.state,
            frames: undefined,
            longTasks: undefined,
          },
        }),
      );
      await context.close();
      await writeFile(
        join(output, `intro-${engine}.json`),
        JSON.stringify(
          { engine, base, testedAt: new Date().toISOString(), results },
          null,
          2,
        ),
      );
    }
  }
} finally {
  await browser.close();
}
assert(
  results.every((result) => result.passed),
  `${results.filter((result) => !result.passed).length} hero intro case(s) failed; see ${output}`,
);
