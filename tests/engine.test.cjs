const test = require('node:test');
const assert = require('node:assert/strict');
const { Workout, loadProgress, saveProgress, rankForXP, RANKS } = require('../engine.js');

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('starts ready with a full challenge and rejects reps before starting', () => {
  const game = new Workout();
  assert.equal(game.status, 'ready');
  assert.equal(game.remainingMs, 30000);
  assert.deepEqual(game.rep(0), { accepted: false, reason: 'ready' });
  assert.equal(game.score, 0);
});

test('countdown tracks elapsed time, including delayed frames', () => {
  const game = new Workout().start(500);
  game.tick(1500);
  assert.equal(game.remainingMs, 29000);
  game.tick(20123);
  assert.equal(game.remainingMs, 10377);
  game.tick(70000);
  assert.equal(game.remainingMs, 0);
  assert.equal(game.status, 'finished');
});

test('first rep awards base points and XP', () => {
  const game = new Workout().start(0);
  assert.deepEqual(game.rep(100), { accepted: true, quality: 'good', points: 100, xp: 10, combo: 1 });
  assert.equal(game.reps, 1);
  assert.equal(game.score, 100);
  assert.equal(game.xp, 10);
});

test('cooldown rejects rapid input without changing rep timing or score', () => {
  const game = new Workout().start(0);
  game.rep(0);
  assert.deepEqual(game.rep(449), { accepted: false, reason: 'cooldown' });
  assert.equal(game.lastRepAt, 0);
  assert.equal(game.score, 100);
  assert.equal(game.reps, 1);
  assert.equal(game.rep(450).accepted, true);
  assert.equal(game.reps, 2);
});

test('perfect cadence increases multiplier and caps it at five', () => {
  const game = new Workout().start(0);
  game.rep(0);
  for (let i = 1; i <= 6; i++) {
    const result = game.rep(i * 850);
    assert.equal(result.quality, 'perfect');
    assert.equal(result.combo, Math.min(i + 1, 5));
    assert.equal(result.points, 150 * Math.min(i + 1, 5));
  }
  assert.equal(game.reps, 7);
  assert.equal(game.perfectReps, 6);
  assert.equal(game.xp, 130);
  assert.equal(game.bestCombo, 5);
  assert.equal(game.score, 100 + 150 * (2 + 3 + 4 + 5 + 5 + 5));
});

test('perfect window includes both endpoints', () => {
  for (const interval of [700, 1050]) {
    const game = new Workout().start(0);
    game.rep(0);
    assert.equal(game.rep(interval).quality, 'perfect');
  }
  for (const interval of [699, 1051]) {
    const game = new Workout().start(0);
    game.rep(0);
    assert.equal(game.rep(interval).quality, 'good');
  }
});

test('off-cadence rep resets combo while preserving best combo', () => {
  const game = new Workout().start(0);
  game.rep(0);
  game.rep(800);
  game.rep(1600);
  const result = game.rep(3000);
  assert.equal(result.combo, 1);
  assert.equal(result.points, 100);
  assert.equal(game.bestCombo, 3);
});

test('exact expiry rejects a rep even before a render tick runs', () => {
  const game = new Workout().start(1000);
  assert.equal(game.rep(30999).accepted, true);
  assert.deepEqual(game.rep(31000), { accepted: false, reason: 'finished' });
  assert.equal(game.reps, 1);
  assert.equal(game.remainingMs, 0);
});

test('pause freezes timer and input; resume preserves cadence', () => {
  const game = new Workout().start(0);
  game.rep(100);
  game.pause(500);
  game.tick(50000);
  assert.equal(game.remainingMs, 29500);
  assert.deepEqual(game.rep(50000), { accepted: false, reason: 'paused' });
  game.resume(50500);
  assert.equal(game.lastRepAt, 50100);
  assert.equal(game.rep(50900).quality, 'perfect');
  assert.equal(game.remainingMs, 29100);
});

test('repeated pause and resume calls cannot extend the timer', () => {
  const game = new Workout().start(0);
  game.pause(1000);
  game.pause(2000);
  game.resume(4000);
  game.resume(5000);
  game.tick(6000);
  assert.equal(game.remainingMs, 27000);
});

test('pause at the deadline finishes rather than suspending the workout', () => {
  const game = new Workout().start(0);
  game.pause(30000);
  game.resume(40000);
  assert.equal(game.status, 'finished');
  assert.equal(game.remainingMs, 0);
});

test('restart clears every workout statistic and stale pause state', () => {
  const game = new Workout().start(0);
  game.rep(0);
  game.rep(800);
  game.pause(900);
  game.restart(10000);
  assert.equal(game.status, 'running');
  for (const field of ['score', 'reps', 'xp', 'perfectReps']) assert.equal(game[field], 0);
  assert.equal(game.combo, 1);
  assert.equal(game.bestCombo, 1);
  assert.equal(game.remainingMs, 30000);
  assert.equal(game.lastRepAt, null);
  game.tick(11000);
  assert.equal(game.remainingMs, 29000);
});

test('backward clock values do not add time or bypass the cooldown', () => {
  const game = new Workout().start(1000);
  game.rep(1100);
  game.tick(2000);
  game.tick(1500);
  assert.equal(game.remainingMs, 29000);
  game.rep(1500);
  assert.equal(game.lastRepAt, 2000);
  assert.equal(game.rep(1500).accepted, false);
});

test('rank transitions occur at the exact XP milestones', () => {
  const cases = [[0, 'Gym Rookie'], [249, 'Gym Rookie'], [250, 'Iron Grinder'],
    [999, 'Iron Grinder'], [1000, 'Muscle Machine'], [2999, 'Muscle Machine'],
    [3000, 'Iron Legend'], [100000, 'Iron Legend']];
  for (const [xp, name] of cases) assert.equal(rankForXP(xp).name, name);
  assert.equal(rankForXP(3000).nextXP, null);
  assert.equal(RANKS.length, 4);
});

test('rank handles invalid XP without promoting the player', () => {
  for (const xp of [-5, NaN, Infinity, '3000', null]) assert.equal(rankForXP(xp).level, 1);
});

test('progress survives a round trip and a fresh storage read', () => {
  const storage = memoryStorage();
  const progress = { bestScore: 8500, totalXP: 340, workouts: 2, bestReps: 31 };
  assert.equal(saveProgress(storage, progress), true);
  assert.deepEqual(loadProgress(storage), progress);
});

test('empty, corrupt, and unavailable storage fall back safely', () => {
  const empty = { bestScore: 0, totalXP: 0, workouts: 0, bestReps: 0 };
  assert.deepEqual(loadProgress(memoryStorage()), empty);
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }), empty);
  assert.deepEqual(loadProgress({ getItem: () => { throw Error('disabled'); } }), empty);
  assert.deepEqual(loadProgress(null), empty);
  assert.equal(saveProgress({ setItem: () => { throw Error('quota'); } }, empty), false);
});

test('stored fields are sanitized and unknown fields are discarded', () => {
  const storage = memoryStorage();
  saveProgress(storage, { bestScore: -5, totalXP: '900', workouts: 2.7, bestReps: Infinity, injected: true });
  assert.deepEqual(loadProgress(storage), { bestScore: 0, totalXP: 0, workouts: 2, bestReps: 0 });
});
