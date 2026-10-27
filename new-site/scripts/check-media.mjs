// Production preview must be running. Playwright is a QA tool, not a site dependency:
// GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/check-media.mjs
// Optional: GFORCE_TEST_URL, GFORCE_BROWSER_ENGINE=webkit, GFORCE_QA_OUTPUT,
// GFORCE_QA_CASES=stalled (comma-separated names for a focused rerun).
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const engines = await import(process.env.GFORCE_BROWSER_MODULE || "playwright");
const engine = process.env.GFORCE_BROWSER_ENGINE || "chromium";
const browser = await engines[engine].launch({
  headless: true,
  ...(engine === "chromium"
    ? { channel: "chrome", args: ["--use-angle=metal"] }
    : {}),
});
const base = process.env.GFORCE_TEST_URL || "http://127.0.0.1:4404";
const output =
  process.env.GFORCE_QA_OUTPUT || join(tmpdir(), `gforce-media-qa-${engine}`);
await mkdir(output, { recursive: true });
const results = [];
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const snapshot = (page) =>
  page.evaluate(() => ({
    playing: [...document.querySelectorAll("video")].filter(
      (video) => !video.paused,
    ).length,
    attached: [...document.querySelectorAll("video")].filter(
      (video) => video.currentSrc,
    ).length,
    films: [...document.querySelectorAll("video")].map((video) => {
      const quality = video.getVideoPlaybackQuality?.();
      return {
        src: video.currentSrc,
        paused: video.paused,
        time: video.currentTime,
        duration: video.duration,
        ready: video.readyState,
        completed: video.dataset.videoComplete === "true",
        shown: video.classList.contains("is-playing"),
        ambient: !!video.closest("[data-video-ambient]"),
        width: video.videoWidth,
        error: video.error?.message,
        frames: quality?.totalVideoFrames,
        dropped: quality?.droppedVideoFrames,
      };
    }),
    requests: performance
      .getEntriesByType("resource")
      .filter((entry) => /\.(mp4|webm)/.test(entry.name))
      .map((entry) => ({
        name: entry.name,
        bytes: entry.transferSize,
        duration: entry.duration,
      })),
  }));
const waitForPlayback = (page, video) =>
  page.waitForFunction(
    (element) => !element.paused && element.currentTime > 0.1,
    video,
    { timeout: 10_000 },
  );
const visitFilm = async (page, video, row, mobile) => {
  await video.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  if (!mobile) await row.locator(".svc-cell").hover();
};

try {
  for (const config of [
    { name: "mobile", mobile: true },
    { name: "desktop", mobile: false },
    { name: "reduced", mobile: true, reduced: true },
    { name: "savedata", mobile: true, saveData: true },
    { name: "blocked", mobile: true, blocked: true },
    { name: "error", mobile: true, error: true },
    { name: "stalled", mobile: true, stalled: true },
  ].filter(
    (config) =>
      !process.env.GFORCE_QA_CASES ||
      process.env.GFORCE_QA_CASES.split(",").includes(config.name),
  )) {
    const context = await browser.newContext({
      viewport: config.mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: config.mobile,
      hasTouch: config.mobile,
      reducedMotion: config.reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (config.saveData)
      await page.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true, effectiveType: "4g" },
        }),
      );
    if (config.blocked)
      await page.addInitScript(() => {
        let allowed = false;
        addEventListener(
          "click",
          () => {
            allowed = true;
          },
          { capture: true },
        );
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          return allowed
            ? play.call(this)
            : Promise.reject(
                new DOMException("Autoplay blocked for QA", "NotAllowedError"),
              );
        };
      });
    let block = config.error;
    if (config.error)
      await page.route("**/media/video/**", (route) =>
        block ? route.abort("failed") : route.continue(),
      );
    let releaseMedia;
    let mediaAttempts = 0;
    if (config.stalled) {
      const heldResponse = new Promise((resolve) => {
        releaseMedia = resolve;
      });
      await page.route("**/media/video/**", async (route) => {
        mediaAttempts++;
        await heldResponse;
        try {
          await route.continue();
        } catch {
          /* Timed-out media requests are cancelled. */
        }
      });
    }
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => !document.querySelector("[data-intro-active]"),
      null,
      { timeout: 10_000 },
    );
    assert(
      (await snapshot(page)).requests.length === 0,
      `${config.name}: media fetched before visibility`,
    );
    assert(
      (await page.locator('button[aria-label^="Pause "]').count()) === 0,
      `${config.name}: a persistent Pause control remains`,
    );
    const row = page.locator("#services .svc-row").first();
    const video = row.locator("video");
    const handle = await video.elementHandle();
    const button = row.locator("[data-video-toggle]");
    const attemptStartedAt = Date.now();
    let timeoutRecovery;
    await visitFilm(page, video, row, config.mobile);
    const staticInitially =
      config.reduced ||
      config.saveData ||
      config.blocked ||
      config.error ||
      config.stalled;
    if (!staticInitially) await waitForPlayback(page, handle);
    else await page.waitForTimeout(600);
    const initial = await snapshot(page);
    assert(
      !config.mobile || initial.playing <= 1,
      `${config.name}: multiple mobile decoders`,
    );
    if (staticInitially && !config.stalled)
      assert(
        initial.playing === 0,
        `${config.name}: must retain a still image`,
      );
    if (config.reduced || config.saveData)
      assert(
        initial.requests.length === 0,
        `${config.name}: downloaded before opt-in`,
      );
    if (config.error) {
      assert(
        await video.evaluate(
          (element) => !element.classList.contains("is-playing"),
        ),
        "Broken media did not retain its poster",
      );
      block = false;
    }
    if (config.stalled) {
      await page.waitForFunction(
        () =>
          document
            .querySelector("#services [data-video-toggle]")
            ?.getAttribute("aria-label")
            ?.startsWith("Retry "),
        null,
        { timeout: 11_000 },
      );
      const state = await video.evaluate((element) => ({
        paused: element.paused,
        shown: element.classList.contains("is-playing"),
        source: element.getAttribute("src"),
        attached: element.dataset.attached,
        ready: element.readyState,
      }));
      assert(
        state.paused && !state.shown && !state.source && !state.attached,
        `Stalled request did not stop and restore its poster: ${JSON.stringify(state)}`,
      );
      const attemptsAfterTimeout = mediaAttempts;
      await page.waitForTimeout(400);
      assert(
        mediaAttempts === attemptsAfterTimeout,
        "Stalled request retried without visitor intent",
      );
      timeoutRecovery = {
        elapsedMs: Date.now() - attemptStartedAt,
        mediaAttempts,
        state,
      };
      releaseMedia();
    }
    if (staticInitially) await button.click();
    await waitForPlayback(page, handle);
    assert(
      await button.isHidden(),
      `${config.name}: Play/Retry did not disappear after playback began`,
    );
    assert(
      await video.evaluate(
        (element) =>
          !element.loop &&
          element.duration <= 4.5 &&
          element.currentSrc.endsWith(
            "-brief-" + (element.videoWidth === 640 ? "640" : "960") + ".mp4",
          ),
      ),
      `${config.name}: wrong source/duration or looping enabled`,
    );
    const firstTime = await video.evaluate((element) => element.currentTime);
    await page.waitForTimeout(650);
    const advancement =
      (await video.evaluate((element) => element.currentTime)) - firstTime;
    assert(advancement > 0.3, `${config.name}: video did not advance`);

    // Leaving the viewport immediately releases the decoder, then returning
    // resumes the same short clip. Completion is sticky for this page visit.
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(200);
    const pausedAt = await video.evaluate((element) => element.currentTime);
    assert(
      await video.evaluate((element) => element.paused),
      `${config.name}: film remained active off screen`,
    );
    await page.waitForTimeout(400);
    assert(
      Math.abs(
        (await video.evaluate((element) => element.currentTime)) - pausedAt,
      ) < 0.05,
      `${config.name}: off-screen playhead advanced`,
    );
    await visitFilm(page, video, row, config.mobile);
    await waitForPlayback(page, handle);
    const resumedAt = await video.evaluate((element) => element.currentTime);
    assert(
      resumedAt >= pausedAt,
      `${config.name}: clip restarted instead of resuming (paused at ${pausedAt}, resumed at ${resumedAt})`,
    );
    await page.waitForFunction(
      (element) => element.dataset.videoComplete === "true",
      handle,
      { timeout: 8000 },
    );
    const completed = await video.evaluate((element) => ({
      time: element.currentTime,
      duration: element.duration,
      paused: element.paused,
      shown: element.classList.contains("is-playing"),
    }));
    assert(
      completed.paused &&
        completed.shown &&
        Math.abs(completed.time - completed.duration) < 0.1,
      `${config.name}: clip did not rest on its final frame`,
    );
    assert(
      await button.isHidden(),
      `${config.name}: finished clip exposes a replay control`,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(150);
    await visitFilm(page, video, row, config.mobile);
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    await page.waitForTimeout(500);
    assert(
      await video.evaluate((element) => element.paused && element.ended),
      `${config.name}: scrolling/visibility restarted the completed clip`,
    );

    const samples = [];
    if (config.name === "mobile" || config.name === "desktop") {
      for (let index = 2; index <= 5; index++) {
        const nextRow = page.locator(`#services .svc-row:nth-child(${index})`);
        const clip = nextRow.locator("video");
        if (!(await clip.count())) continue; // A relevant still may replace a weak film.
        await visitFilm(page, clip, nextRow, config.mobile);
        await waitForPlayback(page, await clip.elementHandle());
        const sample = await snapshot(page);
        assert(
          sample.playing === 1,
          `${config.name} row ${index}: inactive preview played`,
        );
        if (config.mobile)
          assert(
            await clip.evaluate((element) => element.videoWidth === 640),
            `Mobile row ${index}: larger source selected`,
          );
        samples.push({ at: `row-${index}`, ...sample });
      }
      if (config.mobile) {
        const dawn = page.locator("[data-dawn-stage] .panel-video video");
        await dawn.evaluate((element) =>
          element.scrollIntoView({ block: "center" }),
        );
        await waitForPlayback(page, await dawn.elementHandle());
        const sample = await snapshot(page);
        assert(
          sample.playing === 1 &&
            (await dawn.evaluate((element) => !element.paused)),
          "Dawn foreground must own the mobile decoder",
        );
        assert(
          sample.films
            .filter((film) => film.ambient)
            .every((film) => !film.src),
          "Ambient mobile film downloaded",
        );
        samples.push({ at: "dawn", ...sample });
      }
      await page.screenshot({ path: join(output, `${config.name}.png`) });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    assert(
      (await snapshot(page)).playing === 0,
      `${config.name}: film active off screen`,
    );
    assert(
      errors.length === 0,
      `${config.name}: browser error: ${errors.join("; ")}`,
    );
    results.push({
      config,
      errors,
      initial,
      advancement,
      pausedAt,
      resumedAt,
      completed,
      timeoutRecovery,
      samples,
    });
    await writeFile(
      join(output, "results.json"),
      JSON.stringify(results, null, 2) + "\n",
    );
    console.log(
      `${engine}/${config.name}: passed (advance, off-screen pause/resume, one-shot completion, recovery)`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Evidence: ${output}`);
