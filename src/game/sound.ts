export type SfxSampleKey =
  | 'tap'
  | 'jump'
  | 'coin'
  | 'power_up'
  | 'explosion'
  | 'hurt';

const SFX_PATHS: Record<SfxSampleKey, string> = {
  tap: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/tap.wav',
  jump: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/jump.wav',
  coin: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/coin.wav',
  power_up: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/power_up.wav',
  explosion: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/explosion.wav',
  hurt: '/assets/packs/brackeys/brackeys_platformer_assets/sounds/hurt.wav',
};

const BGM_PATH =
  '/assets/packs/brackeys/brackeys_platformer_assets/music/time_for_adventure.mp3';

class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers: Partial<Record<SfxSampleKey, AudioBuffer>> = {};
  private htmlPools: Partial<Record<SfxSampleKey, HTMLAudioElement[]>> = {};
  private bgmAudio: HTMLAudioElement | null = null;
  private preloadStarted = false;

  public muted: boolean = false;
  public bgmEnabled: boolean = false;
  private lastStepTime = 0;
  private lastBeaconTickTime = 0;

  private isHeadless(): boolean {
    if (typeof navigator === 'undefined') return true;
    return Boolean(navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
  }

  public initPreload() {
    if (this.preloadStarted || typeof window === 'undefined' || this.isHeadless()) return;
    this.preloadStarted = true;

    (Object.keys(SFX_PATHS) as SfxSampleKey[]).forEach((key) => {
      const url = SFX_PATHS[key];
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < 3; i++) {
        const el = new Audio(url);
        el.preload = 'auto';
        pool.push(el);
      }
      this.htmlPools[key] = pool;

      fetch(url)
        .then((res) => res.arrayBuffer())
        .then((arr) => {
          const ctx = this.ensureContext();
          if (ctx) {
            return ctx.decodeAudioData(arr);
          }
          return null;
        })
        .then((decoded) => {
          if (decoded) {
            this.buffers[key] = decoded;
          }
        })
        .catch(() => {});
    });
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined' || this.isHeadless()) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playSample(key: SfxSampleKey, volume = 0.4, playbackRate = 1.0): boolean {
    if (this.muted || typeof window === 'undefined' || this.isHeadless()) return false;
    this.initPreload();

    const ctx = this.ensureContext();
    const buf = this.buffers[key];
    if (ctx && buf) {
      try {
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        src.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(0);
        return true;
      } catch {
        // Fallback to HTMLAudioElement pool
      }
    }

    const pool = this.htmlPools[key];
    if (pool && pool.length > 0) {
      const candidate = pool.find((a) => a.paused || a.ended) || pool[0];
      try {
        candidate.currentTime = 0;
        candidate.volume = Math.max(0, Math.min(1, volume));
        candidate.playbackRate = playbackRate;
        candidate.play().catch(() => {});
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.syncBgmState();
    if (!this.muted) {
      this.playUiTap();
    }
    return this.muted;
  }

  public toggleBgm(forceState?: boolean): boolean {
    this.bgmEnabled = forceState !== undefined ? forceState : !this.bgmEnabled;
    this.syncBgmState();
    return this.bgmEnabled;
  }

  public syncBgmState() {
    if (typeof window === 'undefined' || this.isHeadless()) return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio(BGM_PATH);
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.22;
    }
    if (this.bgmEnabled && !this.muted) {
      this.bgmAudio.play().catch(() => {});
    } else {
      this.bgmAudio.pause();
    }
  }

  public playUiTap() {
    this.playSample('tap', 0.38, 1.05);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playFootstep(isSeeker: boolean) {
    const now = performance.now();
    const minInterval = isSeeker ? 195 : 245;
    if (now - this.lastStepTime < minInterval) return;
    this.lastStepTime = now;

    const pitchJitter = 0.92 + Math.random() * 0.16;
    this.playSample('tap', isSeeker ? 0.18 : 0.12, (isSeeker ? 0.72 : 1.15) * pitchJitter);

    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = isSeeker ? 115 : 150;
    osc.frequency.setValueAtTime(baseFreq * pitchJitter, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playHide(entering: boolean) {
    this.playSample('jump', 0.42, entering ? 1.08 : 0.88);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = entering ? 380 : 240;
    const endFreq = entering ? 190 : 420;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  }

  public playForcedExitWarning() {
    this.playSample('hurt', 0.48, 1.12);
  }

  public playInspectEmpty() {
    this.playSample('hurt', 0.34, 1.25);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(310, ctx.currentTime);
    osc.frequency.setValueAtTime(250, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  public playBeaconProgressTick(progressRatio: number) {
    const now = performance.now();
    if (now - this.lastBeaconTickTime < 650) return;
    this.lastBeaconTickTime = now;
    this.playSample('coin', 0.25, 0.85 + progressRatio * 0.35);
  }

  public playElimination() {
    this.playSample('explosion', 0.55, 1.0);
    this.playSample('hurt', 0.45, 0.92);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.31);
  }

  public playObjectiveStageComplete(stage: number) {
    this.playSample('power_up', 0.52, 0.95 + stage * 0.06);
    this.playSample('coin', 0.4, 1.1);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25 + stage * 60];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = ctx.currentTime + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  public playSeekerReleased() {
    this.playSample('explosion', 0.48, 0.88);
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  public playMatchResult(victory: boolean) {
    if (victory) {
      this.playSample('power_up', 0.6, 1.0);
    } else {
      this.playSample('explosion', 0.5, 0.82);
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = victory
      ? [523.25, 659.25, 783.99, 1046.5]
      : [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = victory ? 'triangle' : 'sawtooth';
      const t = ctx.currentTime + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}

export const soundFX = new SoundManager();
