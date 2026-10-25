const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'iron-arcade-84:v1';

async function openGame(page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
}

async function state(page, value) {
  await expect(page.locator('body')).toHaveAttribute('data-state', value);
}

async function finishRound(page) {
  await page.clock.fastForward(31000);
  await state(page, 'finished');
}

test('keyboard starts a workout, performs one lift, and ignores key repeat', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openGame(page);
  await expect(page.locator('#lift-button')).toBeDisabled();
  await page.keyboard.press('Enter');
  await state(page, 'running');
  await expect(page.locator('#timer')).toHaveText('30');
  await page.keyboard.down('Space');
  await expect(page.locator('#reps')).toHaveText('01');
  await expect(page.locator('#score')).toHaveText('000100');
  await page.clock.runFor(800);
  await page.keyboard.down('Space');
  await expect(page.locator('#reps')).toHaveText('01');
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#reps')).toHaveText('02');
  await expect(page.locator('#score')).toHaveText('000400');
  await expect(page.locator('#combo')).toHaveText('2×');
  expect(errors).toEqual([]);
});

test('mouse reps honor recovery and award perfect combo scoring', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.locator('#lift-button').click();
  await page.locator('#lift-button').click();
  await expect(page.locator('#reps')).toHaveText('01');
  await page.clock.runFor(800);
  await page.locator('#lift-button').click();
  await expect(page.locator('#reps')).toHaveText('02');
  await expect(page.locator('#score')).toHaveText('000400');
  await expect(page.locator('#feedback')).toContainText('PERFECT!');
  await page.clock.runFor(800);
  await page.locator('#lift-button').click();
  await expect(page.locator('#score')).toHaveText('000850');
  await expect(page.locator('#combo')).toHaveText('3×');
});

test('holding Enter on the focused Lift button does not repeat native clicks', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await expect(page.locator('#lift-button')).toBeFocused();
  await page.keyboard.down('Enter');
  await expect(page.locator('#reps')).toHaveText('01');
  await page.clock.runFor(800);
  await page.keyboard.down('Enter');
  await expect(page.locator('#reps')).toHaveText('01');
  await expect(page.locator('#score')).toHaveText('000100');
  await page.keyboard.up('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('#reps')).toHaveText('02');
  await expect(page.locator('#score')).toHaveText('000400');
});

test('pause freezes time and reps, then resumes without counting paused time', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.clock.fastForward(5000);
  await page.keyboard.press('p');
  await state(page, 'paused');
  await expect(page.locator('#timer')).toHaveText('25');
  await expect(page.locator('#lift-button')).toBeDisabled();
  await page.clock.fastForward(60000);
  await expect(page.locator('#timer')).toHaveText('25');
  await expect(page.locator('#reps')).toHaveText('00');
  await page.locator('#resume-button').click();
  await state(page, 'running');
  await page.clock.fastForward(24000);
  await expect(page.locator('#timer')).toHaveText('01');
  await state(page, 'running');
  await page.clock.fastForward(1000);
  await state(page, 'finished');
  await expect(page.locator('#timer')).toHaveText('00');
});

test('a hidden document automatically pauses and waits for an explicit resume', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.clock.fastForward(4000);
  // Simulate the browser visibility signal deterministically in headless Chromium.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await state(page, 'paused');
  await expect(page.locator('#timer')).toHaveText('26');
  await page.clock.fastForward(60000);
  await expect(page.locator('#timer')).toHaveText('26');
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await state(page, 'paused');
  await page.locator('#resume-button').click();
  await state(page, 'running');
  await page.clock.fastForward(1000);
  await expect(page.locator('#timer')).toHaveText('25');
});

test('completed rounds bank XP and best score, rank up, and survive reload', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.keyboard.press('Space');
  for (let i = 0; i < 12; i++) {
    await page.clock.runFor(800);
    await page.keyboard.press('Space');
  }
  await expect(page.locator('#score')).toHaveText('008200');
  await expect(page.locator('#reps')).toHaveText('13');
  await finishRound(page);
  await expect(page.locator('#results-overlay')).toBeVisible();
  await expect(page.locator('#result-reps')).toHaveText('13');
  await expect(page.locator('#result-xp')).toHaveText('+250');
  await expect(page.locator('#result-combo')).toHaveText('5×');
  await expect(page.locator('#result-rank')).toHaveText('RANK UP! IRON GRINDER');
  await expect(page.locator('#player-rank')).toHaveText('IRON GRINDER');
  await expect(page.locator('#save-status')).toContainText('PROGRESS SAVED');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
  expect(saved).toEqual({ bestScore: 8200, totalXP: 250, workouts: 1, bestReps: 13 });
  await page.clock.fastForward(5000);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).workouts, STORAGE_KEY)).toBe(1);
  await page.reload();
  await state(page, 'ready');
  await expect(page.locator('#best-score')).toHaveText('008200');
  await expect(page.locator('#total-xp')).toHaveText('250');
  await expect(page.locator('#player-rank')).toHaveText('IRON GRINDER');
});

test('replay and restart reset workout stats while keeping banked progress', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.keyboard.press('Space');
  await finishRound(page);
  await page.locator('#replay-button').click();
  await state(page, 'running');
  await expect(page.locator('#timer')).toHaveText('30');
  await expect(page.locator('#score')).toHaveText('000000');
  await expect(page.locator('#reps')).toHaveText('00');
  await expect(page.locator('#best-score')).toHaveText('000100');
  await page.keyboard.press('Space');
  await page.clock.runFor(800);
  await page.keyboard.press('Space');
  await page.keyboard.press('p');
  await state(page, 'paused');
  await page.keyboard.press('r');
  await state(page, 'running');
  await expect(page.locator('#score')).toHaveText('000000');
  await expect(page.locator('#reps')).toHaveText('00');
  await expect(page.locator('#combo')).toHaveText('1×');
  await expect(page.locator('#timer')).toHaveText('30');
  await expect(page.locator('#total-xp')).toHaveText('10');
  await page.keyboard.press('Space');
  await expect(page.locator('#reps')).toHaveText('01');
});

test('help pauses an active challenge and closing it resumes the same round', async ({ page }) => {
  await openGame(page);
  await page.locator('#start-button').click();
  await page.clock.fastForward(3000);
  await page.locator('#help-button').click();
  await expect(page.locator('#help-dialog')).toBeVisible();
  await state(page, 'paused');
  await page.clock.fastForward(15000);
  await expect(page.locator('#timer')).toHaveText('27');
  await page.locator('#got-it').click();
  await expect(page.locator('#help-dialog')).not.toBeVisible();
  await state(page, 'running');
  await page.clock.fastForward(1000);
  await expect(page.locator('#timer')).toHaveText('26');
});

test('unavailable localStorage does not prevent gameplay or result progression', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openGame(page);
  await expect(page.locator('#save-status')).toContainText('STORAGE UNAVAILABLE');
  await page.locator('#start-button').click();
  await page.keyboard.press('Space');
  await finishRound(page);
  await expect(page.locator('#result-score')).toHaveText('000100');
  await expect(page.locator('#total-xp')).toHaveText('10');
  await expect(page.locator('#save-status')).toContainText('PROGRESS LASTS THIS VISIT');
  expect(errors).toEqual([]);
});

test('sound can be enabled and muted with accessible state', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#sound-button').click();
  await expect(page.locator('#sound-state')).toHaveText('ON');
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sound-button').click();
  await expect(page.locator('#sound-state')).toHaveText('OFF');
  await expect(page.locator('#sound-button')).toHaveAttribute('aria-pressed', 'false');
});

test.describe('mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('fits the viewport and supports start, lift, pause, and replay by touch', async ({ page }) => {
    await openGame(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#start-button').tap();
    await state(page, 'running');
    await page.locator('#lift-button').tap();
    await expect(page.locator('#reps')).toHaveText('01');
    await page.clock.runFor(800);
    await page.locator('#lift-button').tap();
    await expect(page.locator('#score')).toHaveText('000400');
    await page.locator('#pause-button').tap();
    await state(page, 'paused');
    await page.locator('#resume-button').tap();
    await finishRound(page);
    await page.locator('#replay-button').tap();
    await state(page, 'running');
    await expect(page.locator('#reps')).toHaveText('00');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
