/* IRON ARCADE '84 — deterministic workout rules and local progression. */
(function (root) {
  'use strict';

  const DURATION_MS = 30000;
  const STORAGE_KEY = 'iron-arcade-84:v1';
  const RANKS = Object.freeze([
    Object.freeze({ name: 'Gym Rookie', minXP: 0, nextXP: 250, level: 1 }),
    Object.freeze({ name: 'Iron Grinder', minXP: 250, nextXP: 1000, level: 2 }),
    Object.freeze({ name: 'Muscle Machine', minXP: 1000, nextXP: 3000, level: 3 }),
    Object.freeze({ name: 'Iron Legend', minXP: 3000, nextXP: null, level: 4 })
  ]);

  const clock = () => root.performance ? root.performance.now() : Date.now();
  const safeInteger = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : 0;

  function cleanProgress(value) {
    const data = value && typeof value === 'object' ? value : {};
    return {
      bestScore: safeInteger(data.bestScore),
      totalXP: safeInteger(data.totalXP),
      workouts: safeInteger(data.workouts),
      bestReps: safeInteger(data.bestReps)
    };
  }

  function loadProgress(storage) {
    try {
      const target = storage === undefined ? root.localStorage : storage;
      return cleanProgress(JSON.parse(target.getItem(STORAGE_KEY)));
    } catch (_) {
      return cleanProgress(null);
    }
  }

  function saveProgress(storage, progress) {
    try {
      const target = storage === undefined ? root.localStorage : storage;
      target.setItem(STORAGE_KEY, JSON.stringify(cleanProgress(progress)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function rankForXP(xp) {
    const total = safeInteger(xp);
    return RANKS.find(rank => rank.nextXP === null || total < rank.nextXP);
  }

  class Workout {
    constructor() {
      this._reset();
    }

    _reset() {
      this.status = 'ready';
      this.score = 0;
      this.reps = 0;
      this.xp = 0;
      this.combo = 1;
      this.bestCombo = 1;
      this.perfectReps = 0;
      this.remainingMs = DURATION_MS;
      this.lastRepAt = null;
      this._lastTickAt = null;
      this._pausedAt = null;
    }

    start(now = clock()) {
      this._reset();
      this.status = 'running';
      this._lastTickAt = now;
      return this;
    }

    restart(now = clock()) {
      return this.start(now);
    }

    tick(now = clock()) {
      if (this.status !== 'running') return this;
      // Never add workout time if a caller supplies an older timestamp.
      const current = Math.max(this._lastTickAt, now);
      this.remainingMs = Math.max(0, this.remainingMs - (current - this._lastTickAt));
      this._lastTickAt = current;
      if (this.remainingMs === 0) this.status = 'finished';
      return this;
    }

    pause(now = clock()) {
      this.tick(now);
      if (this.status === 'running') {
        this.status = 'paused';
        this._pausedAt = this._lastTickAt;
      }
      return this;
    }

    resume(now = clock()) {
      if (this.status !== 'paused') return this;
      const current = Math.max(this._pausedAt, now);
      if (this.lastRepAt !== null) this.lastRepAt += current - this._pausedAt;
      this._lastTickAt = current;
      this._pausedAt = null;
      this.status = 'running';
      return this;
    }

    rep(now = clock()) {
      this.tick(now);
      if (this.status !== 'running') return { accepted: false, reason: this.status };
      const current = this._lastTickAt;
      const gap = this.lastRepAt === null ? Infinity : current - this.lastRepAt;
      if (gap < 450) return { accepted: false, reason: 'cooldown' };

      const perfect = gap >= 700 && gap <= 1050;
      this.combo = perfect ? Math.min(5, this.combo + 1) : 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const points = (perfect ? 150 : 100) * this.combo;
      const earnedXP = perfect ? 20 : 10;
      this.score += points;
      this.xp += earnedXP;
      this.reps += 1;
      this.perfectReps += perfect ? 1 : 0;
      this.lastRepAt = current;
      return {
        accepted: true,
        quality: perfect ? 'perfect' : 'good',
        points,
        xp: earnedXP,
        combo: this.combo
      };
    }
  }

  const api = { Workout, loadProgress, saveProgress, rankForXP, RANKS };
  root.IronEngine = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
