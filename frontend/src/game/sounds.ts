// Retro chiptune sound engine
// Uses Web Audio API to generate 8-bit style sounds procedurally.
// On native (Expo Go), audio gracefully no-ops until WAV assets are bundled.

import { Platform } from "react-native";

type Wave = "square" | "triangle" | "sawtooth" | "sine";

interface BeepOpts {
  freq: number;
  duration: number; // ms
  wave?: Wave;
  volume?: number; // 0..1
  attack?: number; // ms
  release?: number; // ms
  // For pitch sweeps
  endFreq?: number;
}

interface SoundEngine {
  enabled: boolean;
  setEnabled: (b: boolean) => void;
  chomp: () => void;
  pellet: () => void;
  superPellet: () => void;
  catchHit: () => void;
  comboHit: (combo: number) => void;
  ghostEaten: () => void;
  pelletGuyDeath: () => void;
  levelWin: () => void;
  levelLose: () => void;
  uiClick: () => void;
  startMusic: () => void;
  stopMusic: () => void;
}

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const AC =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!(window as any).__ghostMazeAudioCtx) {
    try {
      (window as any).__ghostMazeAudioCtx = new AC();
    } catch {
      return null;
    }
  }
  return (window as any).__ghostMazeAudioCtx as AudioContext;
}

function beep(ctx: AudioContext, opts: BeepOpts) {
  const {
    freq,
    duration,
    wave = "square",
    volume = 0.06,
    attack = 4,
    release = 60,
    endFreq,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (endFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFreq),
      ctx.currentTime + duration / 1000,
    );
  }

  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + attack / 1000);
  gain.gain.setValueAtTime(volume, t0 + (duration - release) / 1000);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration / 1000 + 0.02);
}

function sequence(ctx: AudioContext, notes: BeepOpts[], gap = 0) {
  let t = 0;
  for (const n of notes) {
    setTimeout(() => beep(ctx, n), t);
    t += n.duration + gap;
  }
}

// --- Music loop: simple ghost-chase bassline ---
let musicIntervalId: any = null;
let musicStep = 0;

function playMusicStep(ctx: AudioContext) {
  // 8-step bassline in minor key (A minor) - eerie, classic arcade feel
  const A2 = 110;
  const C3 = 130.81;
  const E3 = 164.81;
  const G3 = 196;
  const A3 = 220;
  const bass = [A2, A2, E3, A2, C3, A2, G3, A2];
  const treble = [A3, 0, E3, 0, A3, 0, G3, 0];

  const f = bass[musicStep % bass.length];
  if (f > 0) {
    beep(ctx, {
      freq: f,
      duration: 180,
      wave: "triangle",
      volume: 0.035,
      attack: 6,
      release: 40,
    });
  }
  const t = treble[musicStep % treble.length];
  if (t > 0) {
    beep(ctx, {
      freq: t,
      duration: 90,
      wave: "square",
      volume: 0.018,
      attack: 2,
      release: 30,
    });
  }
  musicStep++;
}

export function createSoundEngine(): SoundEngine {
  let enabled = true;

  const tryCtx = () => {
    const ctx = getAudioContext();
    if (!ctx) return null;
    // Resume context if suspended (browser auto-pause on inactivity)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const play = (fn: (ctx: AudioContext) => void) => {
    if (!enabled) return;
    const ctx = tryCtx();
    if (!ctx) return;
    try {
      fn(ctx);
    } catch {}
  };

  return {
    enabled: true,
    setEnabled(b) {
      enabled = b;
      this.enabled = b;
      if (!b) {
        if (musicIntervalId) {
          clearInterval(musicIntervalId);
          musicIntervalId = null;
        }
      }
    },
    chomp() {
      play((ctx) =>
        beep(ctx, {
          freq: 280,
          duration: 50,
          wave: "square",
          volume: 0.04,
          endFreq: 220,
          attack: 1,
          release: 20,
        }),
      );
    },
    pellet() {
      play((ctx) =>
        beep(ctx, {
          freq: 420,
          duration: 35,
          wave: "square",
          volume: 0.03,
          attack: 1,
          release: 20,
        }),
      );
    },
    superPellet() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 220, duration: 90, wave: "square", volume: 0.07 },
          { freq: 330, duration: 90, wave: "square", volume: 0.07 },
          { freq: 440, duration: 90, wave: "square", volume: 0.07 },
          { freq: 660, duration: 180, wave: "square", volume: 0.07 },
        ]);
      });
    },
    catchHit() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 880, duration: 80, wave: "square", volume: 0.08, endFreq: 1320 },
          { freq: 1320, duration: 120, wave: "square", volume: 0.08, endFreq: 1760 },
        ]);
      });
    },
    comboHit(combo) {
      play((ctx) => {
        const base = 880 + combo * 220;
        sequence(ctx, [
          { freq: base, duration: 60, wave: "square", volume: 0.08 },
          { freq: base * 1.5, duration: 60, wave: "square", volume: 0.08 },
          { freq: base * 2, duration: 100, wave: "square", volume: 0.08 },
        ]);
      });
    },
    ghostEaten() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 660, duration: 80, wave: "triangle", volume: 0.06 },
          { freq: 880, duration: 80, wave: "triangle", volume: 0.06 },
          { freq: 1320, duration: 120, wave: "triangle", volume: 0.06 },
        ]);
      });
    },
    pelletGuyDeath() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 440, duration: 140, wave: "sawtooth", volume: 0.07, endFreq: 220 },
          { freq: 220, duration: 200, wave: "sawtooth", volume: 0.07, endFreq: 110 },
          { freq: 110, duration: 260, wave: "sawtooth", volume: 0.07, endFreq: 55 },
        ]);
      });
    },
    levelWin() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 523, duration: 110, wave: "square", volume: 0.07 }, // C5
          { freq: 659, duration: 110, wave: "square", volume: 0.07 }, // E5
          { freq: 784, duration: 110, wave: "square", volume: 0.07 }, // G5
          { freq: 1047, duration: 240, wave: "square", volume: 0.08 }, // C6
        ]);
      });
    },
    levelLose() {
      play((ctx) => {
        sequence(ctx, [
          { freq: 392, duration: 160, wave: "sawtooth", volume: 0.07 },
          { freq: 311, duration: 160, wave: "sawtooth", volume: 0.07 },
          { freq: 220, duration: 280, wave: "sawtooth", volume: 0.08 },
        ]);
      });
    },
    uiClick() {
      play((ctx) =>
        beep(ctx, {
          freq: 660,
          duration: 40,
          wave: "square",
          volume: 0.04,
          attack: 1,
          release: 20,
        }),
      );
    },
    startMusic() {
      if (!enabled) return;
      if (musicIntervalId) return;
      const ctx = tryCtx();
      if (!ctx) return;
      musicStep = 0;
      // Tempo: ~150bpm with 8 steps per bar = 200ms per step
      musicIntervalId = setInterval(() => {
        try {
          playMusicStep(ctx);
        } catch {}
      }, 220);
    },
    stopMusic() {
      if (musicIntervalId) {
        clearInterval(musicIntervalId);
        musicIntervalId = null;
      }
    },
  };
}

// Module-level singleton
let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!_engine) _engine = createSoundEngine();
  return _engine;
}
