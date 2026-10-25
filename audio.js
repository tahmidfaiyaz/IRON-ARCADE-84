/* Original, synthesized arcade music. No audio is created before interaction. */
(function (root) {
  'use strict';

  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  class ArcadeAudio {
    constructor() {
      this.enabled = false;
      this.context = null;
      this.musicWanted = false;
      this.timer = null;
      this.voices = new Set();
      this.step = 0;
      this.nextBeat = 0;
      this.master = null;
      this.noise = null;
      this.enableRequest = 0;
    }

    async unlock() {
      try {
        if (!this.context) {
          const AudioContext = root.AudioContext || root.webkitAudioContext;
          if (!AudioContext) return false;
          this.context = new AudioContext();
          this.master = this.context.createGain();
          this.master.gain.value = this.enabled ? 0.27 : 0;
          this.master.connect(this.context.destination);
          this.noise = this.context.createBuffer(1, this.context.sampleRate * 0.15, this.context.sampleRate);
          const data = this.noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        if (this.context.state === 'suspended') await this.context.resume();
        return this.context.state === 'running';
      } catch (_) {
        // Audio is optional: unsupported or restricted browsers remain playable.
        return false;
      }
    }

    async setEnabled(value) {
      const request = ++this.enableRequest;
      this.enabled = Boolean(value);
      if (!this.enabled) {
        this._stopScheduler();
        this._silence();
        if (this.master) this.master.gain.setValueAtTime(0, this.context.currentTime);
        return false;
      }
      const ready = await this.unlock();
      if (request !== this.enableRequest) return false;
      if (!ready) {
        this.enabled = false;
        this._stopScheduler();
        this._silence();
        if (this.master) this.master.gain.setValueAtTime(0, this.context.currentTime);
        return false;
      }
      if (!this.enabled) return false;
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.27, this.context.currentTime, 0.015);
      if (this.musicWanted) this._startScheduler();
      return true;
    }

    startMusic() {
      this.musicWanted = true;
      if (!this.enabled) return;
      this.unlock().then((ready) => {
        if (ready && this.enabled && this.musicWanted) this._startScheduler();
      });
    }

    stopMusic() {
      this.musicWanted = false;
      this._stopScheduler();
      this._silence('music');
    }

    _stopScheduler() {
      if (this.timer !== null) root.clearTimeout(this.timer);
      this.timer = null;
    }

    _silence(channel) {
      for (const voice of Array.from(this.voices)) {
        if (channel && voice.channel !== channel) continue;
        try {
          voice.envelope.gain.cancelScheduledValues(this.context.currentTime);
          voice.envelope.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.008);
          voice.source.stop(this.context.currentTime + 0.035);
        } catch (_) { /* A finished voice has already been released. */ }
      }
    }

    _track(source, envelope, channel, extra) {
      const voice = { source, envelope, channel };
      this.voices.add(voice);
      source.onended = () => {
        this.voices.delete(voice);
        source.disconnect();
        envelope.disconnect();
        if (extra) extra.disconnect();
      };
    }

    _note(note, when, length, volume = 0.15, wave = 'square', channel = 'fx') {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const source = this.context.createOscillator();
      const envelope = this.context.createGain();
      source.type = wave;
      source.frequency.value = midi(note);
      envelope.gain.setValueAtTime(0.0001, when);
      envelope.gain.exponentialRampToValueAtTime(volume, when + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + length);
      source.connect(envelope);
      envelope.connect(this.master);
      this._track(source, envelope, channel);
      source.start(when);
      source.stop(when + length + 0.02);
    }

    _kick(when) {
      const source = this.context.createOscillator();
      const envelope = this.context.createGain();
      source.frequency.setValueAtTime(115, when);
      source.frequency.exponentialRampToValueAtTime(38, when + 0.15);
      envelope.gain.setValueAtTime(0.34, when);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
      source.connect(envelope);
      envelope.connect(this.master);
      this._track(source, envelope, 'music');
      source.start(when);
      source.stop(when + 0.2);
    }

    _hat(when, snare) {
      const source = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const envelope = this.context.createGain();
      source.buffer = this.noise;
      filter.type = 'highpass';
      filter.frequency.value = snare ? 1500 : 7000;
      envelope.gain.setValueAtTime(snare ? 0.12 : 0.045, when);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + (snare ? 0.13 : 0.035));
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(this.master);
      this._track(source, envelope, 'music', filter);
      source.start(when);
      source.stop(when + 0.15);
    }

    _startScheduler() {
      if (this.timer !== null || !this.enabled || !this.musicWanted) return;
      this.step = 0;
      this.nextBeat = this.context.currentTime + 0.04;
      const schedule = () => {
        if (!this.enabled || !this.musicWanted) {
          this.timer = null;
          return;
        }
        // Schedule close to the audio clock, avoiding drift from browser timers.
        if (this.nextBeat < this.context.currentTime - 0.15) {
          this.nextBeat = this.context.currentTime + 0.04;
        }
        while (this.nextBeat < this.context.currentTime + 0.12) {
          const t = this.nextBeat;
          const slot = this.step % 16;
          const chord = Math.floor(this.step / 16) % 4;
          const roots = [45, 41, 48, 43]; // A / F / C / G
          const arp = [0, 7, 12, 7, 3, 7, 15, 12, 0, 7, 12, 19, 15, 12, 7, 3];
          const major = chord === 1 || chord === 2 || chord === 3;
          let interval = arp[slot];
          if (major && (interval === 3 || interval === 15)) interval += 1;
          this._note(roots[chord] + 24 + interval, t, 0.15, 0.043, 'square', 'music');
          if (slot % 2 === 0) {
            this._note(roots[chord] + (slot % 8 === 6 ? 12 : 0), t, 0.23, 0.22, 'triangle', 'music');
            this._hat(t, false);
          }
          if (slot % 4 === 0) this._kick(t);
          if (slot % 8 === 4) this._hat(t, true);
          this.step++;
          this.nextBeat += 60 / 112 / 4;
        }
        this.timer = root.setTimeout(schedule, 45);
      };
      schedule();
    }

    rep(quality, combo = 1) {
      if (!this.enabled || !this.context) return;
      const t = this.context.currentTime;
      const rootNote = 69 + Math.min(4, Math.max(0, Number(combo) - 1));
      this._note(rootNote, t, 0.07, 0.2);
      this._note(rootNote + 7, t + 0.055, 0.1, 0.15);
      if (quality === 'perfect') {
        this._note(rootNote + 12, t + 0.105, 0.16, 0.18, 'triangle');
        this._note(rootNote + 19, t + 0.14, 0.12, 0.085);
      }
    }

    cue(type) {
      if (!this.enabled || !this.context) return;
      const t = this.context.currentTime;
      const themes = {
        start: [57, 64, 69, 76],
        pause: [69, 64],
        finish: [69, 72, 76, 81, 76, 81],
        countdown: [81],
        blocked: [40]
      };
      const notes = themes[type];
      if (!notes) return;
      notes.forEach((note, i) => this._note(note, t + i * 0.09,
        type === 'finish' && i === notes.length - 1 ? 0.5 : 0.12,
        type === 'blocked' ? 0.07 : 0.18, type === 'blocked' ? 'triangle' : 'square'));
    }
  }

  root.ArcadeAudio = ArcadeAudio;
})(typeof window === 'undefined' ? globalThis : window);
