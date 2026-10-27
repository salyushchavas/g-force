#!/usr/bin/env node
/**
 * Regression check for the dawn Support workflow and its mobile media layout.
 * Run against a running production preview:
 *   GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/check-support-ui.mjs
 * Optional: GFORCE_REVIEW_URL (default http://127.0.0.1:4404),
 * GFORCE_REVIEW_OUTPUT (default an OS temporary directory),
 * GFORCE_BROWSER_CHANNEL (default chrome).
 * Screenshots and JSON stay outside the repository unless an output is supplied.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const { chromium } = await import(process.env.GFORCE_BROWSER_MODULE ?? 'playwright');
const base = process.env.GFORCE_REVIEW_URL ?? 'http://127.0.0.1:4404';
const output = resolve(process.env.GFORCE_REVIEW_OUTPUT ?? join(tmpdir(), 'gforce-support-ui'));
await mkdir(output, { recursive: true });

const expectedLabels = [
  'Receive and prioritise your request',
  'Review your systems and recent changes',
  'Troubleshoot and agree on the next action',
  'Confirm the outcome and document the work',
];
const results = [];
const browser = await chromium.launch({
  channel: process.env.GFORCE_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});

try {
  for (const width of [320, 390, 1440]) {
    for (const theme of ['light', 'dark']) {
      for (const reducedMotion of [false, true]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 1440 ? 900 : 844 },
          isMobile: width !== 1440,
          hasTouch: width !== 1440,
          reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
        });
        const errors = [];
        let page;
        const result = { width, theme, reducedMotion, pass: false };
        try {
          await context.addInitScript((value) => localStorage.setItem('gf-theme', value), theme);
          page = await context.newPage();
          page.on('pageerror', (error) => errors.push(error.message));
          await page.goto(base, { waitUntil: 'networkidle' });
          // Test the settled Support workflow. Fresh-load opening and immediate
          // interruption are covered separately by check-hero-motion.mjs.
          await page.waitForFunction(() => document.querySelector('[data-hero-intro]')?.dataset.introState === 'complete');

          const support = page.getByRole('tab', { name: 'Support', exact: true });
          await support.click();
          await page.locator('#pane-ticket').scrollIntoViewIfNeeded();

          const verifySupport = async () => {
            const state = await page.evaluate(() => ({
              selected: Array.from(document.querySelectorAll('[data-dawn-stage] [role="tab"]'))
                .filter((element) => element.getAttribute('aria-selected') === 'true')
                .map((element) => element.id),
              panes: Array.from(document.querySelectorAll('[data-dawn-stage] [role="tabpanel"]'))
                .map((element) => ({ id: element.id, hidden: element.hidden, inert: element.inert })),
              steps: Array.from(document.querySelectorAll('#pane-ticket li')).map((element) => {
                let opacity = 1;
                let visible = true;
                for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
                  const style = getComputedStyle(ancestor);
                  opacity *= Number(style.opacity);
                  if (style.visibility !== 'visible' || style.display === 'none') visible = false;
                }
                const text = element.querySelector('span:last-child');
                return {
                  text: text?.textContent?.trim() ?? '',
                  opacity,
                  visible,
                  height: text?.getBoundingClientRect().height ?? 0,
                };
              }),
              overflow: document.documentElement.scrollWidth > innerWidth,
            }));
            assert.deepEqual(state.selected, ['tab-ticket'], 'Only Support must be selected.');
            assert.deepEqual(state.steps.map((step) => step.text), expectedLabels);
            assert(
              state.steps.every((step) => step.opacity === 1 && step.visible && step.height > 0),
              `Support labels must be readable immediately: ${JSON.stringify(state.steps)}`,
            );
            assert.deepEqual(state.panes, [
              { id: 'pane-night', hidden: true, inert: true },
              { id: 'pane-ticket', hidden: false, inert: false },
            ]);
            assert.equal(state.overflow, false, 'No horizontal page overflow.');
            return state;
          };

          // Do not wait for individual step timers: this assertion catches the
          // original specificity bug even when every step has gained .is-on.
          const immediate = await verifySupport();
          await page.evaluate(() => {
            for (const id of ['tab-night', 'tab-ticket', 'tab-night', 'tab-ticket', 'tab-night', 'tab-ticket']) {
              document.getElementById(id).click();
            }
          });
          await page.waitForTimeout(350);
          await verifySupport();

          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForTimeout(80);
          await page.locator('.panel-side').scrollIntoViewIfNeeded();
          await page.waitForTimeout(120);
          await verifySupport();

          await support.focus();
          await page.keyboard.press('Home');
          assert.equal(await page.getByRole('tab', { name: 'Overnight', exact: true }).getAttribute('aria-selected'), 'true');
          await page.keyboard.press('End');
          await verifySupport();
          assert.equal(await page.locator('[data-shift-pause]').count(), 0, 'No detached film-pause control.');

          const mediaLayout = await page.locator('[data-dawn-stage] .panel').evaluate((panel) => {
            const media = panel.querySelector('.panel-media');
            const caption = panel.querySelector('.panel-caption');
            const control = media.querySelector('[data-video-toggle]');
            const mediaRect = media.getBoundingClientRect();
            const captionRect = caption.getBoundingClientRect();
            const controlRect = control?.getBoundingClientRect();
            return {
              panelWidth: panel.getBoundingClientRect().width,
              mediaWidth: mediaRect.width,
              captionFits: captionRect.left >= mediaRect.left && captionRect.right <= mediaRect.right,
              controlClear: !controlRect?.width || captionRect.right <= controlRect.left,
            };
          });
          assert(mediaLayout.mediaWidth <= mediaLayout.panelWidth, 'Media must fit within the panel at narrow widths.');
          assert(mediaLayout.captionFits && mediaLayout.controlClear, 'Caption must fit beside the video control.');
          assert.deepEqual(errors, []);

          if (!reducedMotion) await page.locator('[data-dawn-stage] .panel').screenshot({ path: join(output, `${width}-${theme}.png`) });
          Object.assign(result, {
            pass: true,
            immediateLabels: immediate.steps,
            rapidTabs: true,
            keyboardHomeEnd: true,
            offscreenReturn: true,
            mediaLayout,
          });
        } catch (error) {
          result.error = error.stack ?? String(error);
          if (page) await page.screenshot({ path: join(output, `${width}-${theme}-${reducedMotion ? 'reduced' : 'normal'}-failure.png`) }).catch(() => {});
        } finally {
          result.pageErrors = errors;
          results.push(result);
          await context.close();
          console.log(JSON.stringify({ width, theme, reducedMotion, pass: result.pass, error: result.error }));
        }
      }
    }
  }
} finally {
  await writeFile(join(output, 'results.json'), `${JSON.stringify({ base, results, passed: results.length === 12 && results.every((result) => result.pass) }, null, 2)}\n`);
  await browser.close();
}

console.log(`Support UI evidence: ${output}`);
if (results.length !== 12 || results.some((result) => !result.pass)) process.exitCode = 1;
