/* IRON ARCADE '84 — browser controller. No runtime dependencies. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { Workout, loadProgress, saveProgress, rankForXP, RANKS } = window.IronEngine;
  const workout = new Workout();
  const scene = new ArcadeScene($('gym-canvas'));
  const audio = new ArcadeAudio();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let progress = loadProgress();
  let savedRound = false;
  let previousSecond = 30;
  let liftAt = -Infinity;
  let pausedAnimationAt = null;
  let lastFrame = -Infinity;
  let feedbackTimeout;
  let flashTimeout;
  let helpPaused = false;
  let musicRequest = 0;
  const pad = (number, length = 6) => String(number).padStart(length, '0');
  const announce = message => { $('announcer').textContent = message; };

  function renderProfile() {
    const rank = rankForXP(progress.totalXP);
    const next = RANKS[rank.level];
    $('player-rank').textContent = rank.name.toUpperCase();
    $('player-subtitle').textContent = ['Every legend starts somewhere.', 'The grind is paying off.', 'Built one rep at a time.', 'Your name belongs in neon.'][rank.level - 1];
    $('total-xp').textContent = progress.totalXP.toLocaleString();
    $('xp-target').textContent = next ? `/ ${next.minXP.toLocaleString()}` : '/ MAX';
    const fraction = next ? (progress.totalXP - rank.minXP) / (next.minXP - rank.minXP) : 1;
    $('xp-fill').style.width = `${Math.min(100, fraction * 100)}%`;
    $('xp-progress').setAttribute('aria-valuemin', rank.minXP);
    $('xp-progress').setAttribute('aria-valuemax', next ? next.minXP : Math.max(rank.minXP, progress.totalXP));
    $('xp-progress').setAttribute('aria-valuenow', progress.totalXP);
    $('xp-progress').setAttribute('aria-valuetext', `${progress.totalXP} career XP. ${rank.name}.`);
    $('next-rank').replaceChildren();
    $('next-rank').append(document.createTextNode(next ? 'NEXT UP ' : 'TOP RANK '));
    const nextLabel = document.createElement('span');
    nextLabel.textContent = next ? next.name.toUpperCase() : 'LEGEND STATUS';
    $('next-rank').append(nextLabel);
    $('best-score').textContent = pad(progress.bestScore);
    $('best-description').textContent = progress.workouts ? `${progress.workouts} workout${progress.workouts === 1 ? '' : 's'}. ${progress.bestReps} reps to beat.` : 'A legend in the making.';
    document.querySelectorAll('[data-rank]').forEach(item => {
      const level = Number(item.dataset.rank);
      item.classList.toggle('current', level === rank.level);
      item.classList.toggle('unlocked', level < rank.level);
      item.querySelector('.rank-indicator').textContent = level === rank.level ? 'YOU' : level < rank.level ? '✓' : '◇';
    });
  }

  function renderHUD() {
    const seconds = Math.ceil(workout.remainingMs / 1000);
    $('score').textContent = pad(workout.score);
    $('timer').textContent = pad(seconds, 2);
    $('reps').textContent = pad(workout.reps, 2);
    $('combo').replaceChildren(document.createTextNode(workout.combo), Object.assign(document.createElement('span'), { textContent: '×' }));
    document.querySelector('.timer-stat').classList.toggle('urgent', seconds <= 5 && workout.status === 'running');
    if (seconds < previousSecond && seconds <= 5 && seconds > 0 && workout.status === 'running') audio.cue('countdown');
    previousSecond = seconds;
  }

  function renderMode() {
    const { status } = workout;
    $('start-overlay').hidden = status !== 'ready';
    $('pause-overlay').hidden = status !== 'paused';
    $('results-overlay').hidden = status !== 'finished';
    $('lift-button').disabled = status !== 'running';
    $('pause-button').disabled = !['running', 'paused'].includes(status);
    $('restart-button').disabled = status === 'ready';
    $('pause-button').innerHTML = status === 'paused' ? '<span class="play-icon" aria-hidden="true"></span> RESUME' : '<span class="pause-icon" aria-hidden="true"></span> PAUSE';
    $('arena-status').textContent = { ready: 'READY PLAYER ONE', running: 'MAKE EVERY REP COUNT', paused: 'WORKOUT PAUSED', finished: 'WORKOUT COMPLETE' }[status];
    document.body.dataset.state = status;
  }

  function clearEffects() {
    clearTimeout(feedbackTimeout);
    clearTimeout(flashTimeout);
    $('feedback').className = 'feedback';
    $('particles').replaceChildren();
    $('arena').classList.remove('impact');
    $('lift-button').classList.remove('pressed');
    liftAt = -Infinity;
  }

  function start() {
    const now = performance.now();
    workout.start(now);
    savedRound = false;
    previousSecond = 30;
    pausedAnimationAt = null;
    clearEffects();
    audio.unlock();
    audio.startMusic();
    audio.cue('start');
    renderMode();
    renderHUD();
    $('lift-button').focus({ preventScroll: true });
    announce('Workout started. Thirty seconds. Press Space or tap Lift.');
  }

  function togglePause() {
    const now = performance.now();
    if (workout.status === 'running') {
      workout.pause(now);
      if (workout.status === 'finished') { finish(); return; }
      pausedAnimationAt = now;
      audio.stopMusic();
      audio.cue('pause');
      renderMode();
      renderHUD();
      $('resume-button').focus({ preventScroll: true });
      announce('Workout paused.');
    } else if (workout.status === 'paused') {
      if (pausedAnimationAt !== null) liftAt += now - pausedAnimationAt;
      workout.resume(now);
      pausedAnimationAt = null;
      audio.unlock();
      audio.startMusic();
      renderMode();
      $('lift-button').focus({ preventScroll: true });
      announce('Workout resumed.');
    }
  }

  function finish() {
    if (savedRound) return;
    savedRound = true;
    const oldRank = rankForXP(progress.totalXP);
    const isRecord = workout.score > progress.bestScore;
    progress = {
      bestScore: Math.max(progress.bestScore, workout.score),
      bestReps: Math.max(progress.bestReps, workout.reps),
      totalXP: progress.totalXP + workout.xp,
      workouts: progress.workouts + 1
    };
    const saved = saveProgress(undefined, progress);
    $('save-status').textContent = saved ? '● PROGRESS SAVED ON THIS DEVICE' : '● STORAGE UNAVAILABLE — PROGRESS LASTS THIS VISIT';
    const newRank = rankForXP(progress.totalXP);
    $('result-kicker').textContent = isRecord ? '★ NEW PERSONAL BEST ★' : 'WORKOUT COMPLETE';
    $('result-title').textContent = workout.reps === 0 ? 'GET IN THE GAME.' : workout.bestCombo === 5 ? 'PURE IRON.' : 'SOLID WORK.';
    $('result-score').textContent = pad(workout.score);
    $('result-reps').textContent = workout.reps;
    $('result-combo').textContent = `${workout.bestCombo}×`;
    $('result-xp').textContent = `+${workout.xp}`;
    $('result-rank').textContent = `${newRank.level > oldRank.level ? 'RANK UP! ' : ''}${newRank.name.toUpperCase()}`;
    audio.stopMusic();
    audio.cue('finish');
    clearEffects();
    renderHUD();
    renderProfile();
    renderMode();
    $('replay-button').focus({ preventScroll: true });
    announce(`Workout complete. ${workout.reps} reps. ${workout.score} points. ${workout.xp} XP earned. ${newRank.name}.${isRecord ? ' New personal best!' : ''}`);
  }

  function showFeedback(result) {
    const perfect = result.quality === 'perfect';
    const feedback = $('feedback');
    clearTimeout(feedbackTimeout);
    feedback.className = `feedback ${perfect ? '' : 'good'}`;
    feedback.replaceChildren(document.createTextNode(perfect ? 'PERFECT!' : 'GOOD LIFT!'));
    const points = document.createElement('small');
    points.textContent = `+${result.points}  /  +${result.xp} XP`;
    feedback.append(points);
    void feedback.offsetWidth;
    feedback.classList.add('show');
    feedbackTimeout = setTimeout(() => feedback.classList.remove('show'), 650);
    $('lift-button').classList.add('pressed');
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => $('lift-button').classList.remove('pressed'), 120);
    if (reducedMotion.matches) return;
    $('arena').classList.remove('impact');
    void $('arena').offsetWidth;
    $('arena').classList.add('impact');
    for (let i = 0; i < (perfect ? 15 : 7); i++) {
      const particle = document.createElement('i');
      particle.className = 'particle';
      particle.style.setProperty('--dx', `${(Math.random() - .5) * 240}px`);
      particle.style.setProperty('--dy', `${-30 - Math.random() * 140}px`);
      particle.style.background = ['#63f9e5', '#ff4f9b', '#ffd475'][i % 3];
      $('particles').append(particle);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
    }
  }

  function lift() {
    const now = performance.now();
    const result = workout.rep(now);
    if (workout.status === 'finished') { finish(); return; }
    if (!result.accepted) {
      if (result.reason === 'cooldown') {
        $('rhythm-status').textContent = 'LET THE BAR RECOVER';
        audio.cue('blocked');
      }
      return;
    }
    liftAt = now;
    audio.rep(result.quality, result.combo);
    showFeedback(result);
    renderHUD();
  }

  function renderRhythm(now) {
    const active = workout.status === 'running' || workout.status === 'paused';
    const gap = active && workout.lastRepAt !== null ? now - workout.lastRepAt : 0;
    const percent = Math.min(100, Math.max(0, gap / 1300 * 100));
    $('rhythm-needle').style.left = `calc(${percent}% - ${percent / 100 * 3}px)`;
    $('rhythm-fill').style.width = `${percent}%`;
    $('rhythm-track').classList.toggle('in-zone', active && gap >= 700 && gap <= 1050);
    $('rhythm-status').textContent = !active ? 'LIFT. RESET. REPEAT.' : workout.lastRepAt === null ? 'YOUR FIRST REP STARTS IT' : gap < 450 ? 'RECOVERING…' : gap < 700 ? 'ALMOST THERE…' : gap <= 1050 ? 'LIFT NOW!' : 'RESET YOUR RHYTHM';
  }

  function frame(now) {
    if (workout.status === 'running') {
      workout.tick(now);
      if (workout.status === 'finished') finish();
    }
    // Render at 30 fps; the clock remains tied to actual elapsed time.
    if (now - lastFrame >= 1000 / 30) {
      lastFrame = now;
      const animationTime = pausedAnimationAt === null ? now : pausedAnimationAt;
      const liftProgress = (animationTime - liftAt) / 570;
      const liftAmount = liftProgress >= 0 && liftProgress <= 1 ? Math.sin(Math.PI * liftProgress) : 0;
      scene.draw({ time: animationTime, lift: reducedMotion.matches ? 0 : liftAmount, mood: workout.status, reducedMotion: reducedMotion.matches });
      renderRhythm(animationTime);
      if (workout.status === 'running') renderHUD();
    }
    requestAnimationFrame(frame);
  }

  function openHelp() {
    helpPaused = workout.status === 'running';
    if (helpPaused) togglePause();
    $('help-dialog').showModal();
  }
  function closeHelp() { $('help-dialog').close(); }
  $('help-dialog').addEventListener('close', () => {
    if (helpPaused && workout.status === 'paused' && !document.hidden) togglePause();
    helpPaused = false;
  });
  $('help-dialog').addEventListener('click', event => {
    if (event.target === $('help-dialog')) {
      const box = event.target.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeHelp();
    }
  });
  $('start-button').addEventListener('click', start);
  $('replay-button').addEventListener('click', start);
  $('restart-button').addEventListener('click', start);
  $('pause-button').addEventListener('click', togglePause);
  $('resume-button').addEventListener('click', togglePause);
  $('lift-button').addEventListener('click', lift);
  $('help-button').addEventListener('click', openHelp);
  $('close-help').addEventListener('click', closeHelp);
  $('got-it').addEventListener('click', closeHelp);
  $('sound-button').addEventListener('click', async () => {
    const request = ++musicRequest;
    const wanted = !audio.enabled;
    const enabled = await audio.setEnabled(wanted);
    if (request !== musicRequest) return;
    $('sound-button').setAttribute('aria-pressed', enabled ? 'true' : 'false');
    $('sound-button').setAttribute('aria-label', enabled ? 'Mute music and sound' : 'Enable music and sound');
    $('sound-state').textContent = enabled ? 'ON' : 'OFF';
    announce(enabled ? 'Sound enabled.' : wanted ? 'Audio unavailable in this browser.' : 'Sound muted.');
  });
  document.addEventListener('keydown', event => {
    if ($('help-dialog').open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.repeat && event.key === 'Enter' && event.target.closest('button')) {
      event.preventDefault();
      return;
    }
    const key = event.key.toLowerCase();
    if (event.code === 'Space') {
      // Preserve native keyboard activation on menu controls; Space on the arena lifts.
      if (event.target.closest('button') && event.target.id !== 'lift-button') return;
      event.preventDefault();
      if (!event.repeat && workout.status === 'running') lift();
    } else if (key === 'p' || key === 'escape') {
      event.preventDefault();
      if (!event.repeat) togglePause();
    } else if (key === 'r' && workout.status !== 'ready') {
      event.preventDefault();
      if (!event.repeat) start();
    } else if (key === 'enter' && ['ready', 'finished'].includes(workout.status)) {
      // A focused button already handles Enter through its native click event.
      if (event.target.closest('button,a')) return;
      event.preventDefault();
      if (!event.repeat) start();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && workout.status === 'running') togglePause();
  });
  window.addEventListener('pagehide', () => {
    if (workout.status === 'running') togglePause();
    audio.stopMusic();
  });

  // Probe storage without changing an existing career save.
  try {
    const probe = 'iron-arcade-84:storage-check';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch (_) {
    $('save-status').textContent = '● STORAGE UNAVAILABLE — PROGRESS LASTS THIS VISIT';
  }
  renderProfile();
  renderHUD();
  renderMode();
  requestAnimationFrame(frame);
})();
