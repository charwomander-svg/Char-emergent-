// Hybrid sound engine: bundled WAV files via expo-audio on all platforms,
// with a Web Audio API music loop (chiptune bassline) since music as a
// looping asset would be much larger than synthesized.

import { Platform } from "react-native";
import { createAudioPlayer, AudioPlayer } from "expo-audio";

type SfxKey =
  | "chomp"
  | "pellet"
  | "super"
  | "catch"
  | "combo"
  | "ghostEaten"
  | "death"
  | "win"
  | "lose"
  | "uiClick";

// Bundled WAVs. Use require() so Metro resolves them and bundles into the app.
const SFX_SOURCES: Record<SfxKey, number> = {
  chomp: require("@/assets/sounds/chomp.wav"),
  pellet: require("@/assets/sounds/pellet.wav"),
  super: require("@/assets/sounds/super.wav"),
  catch: require("@/assets/sounds/catch.wav"),
  combo: require("@/assets/sounds/combo.wav"),
  ghostEaten: require("@/assets/sounds/ghost_eaten.wav"),
  death: require("@/assets/sounds/death.wav"),
  win: require("@/assets/sounds/win.wav"),
  lose: require("@/assets/sounds/lose.wav"),
  uiClick: require("@/assets/sounds/ui_click.wav"),
};

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

// --- Music engine (Web Audio API, web only) ---
function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
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

function beep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  wave: OscillatorType = "triangle",
  volume = 0.035,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.006);
  gain.gain.setValueAtTime(volume, t0 + (duration - 40) / 1000);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration / 1000 + 0.02);
}

let musicIntervalId: any = null;
let musicStep = 0;
function playMusicStep(ctx: AudioContext) {
  const A2 = 110, C3 = 130.81, E3 = 164.81, G3 = 196, A3 = 220;
  const bass = [A2, A2, E3, A2, C3, A2, G3, A2];
  const treble = [A3, 0, E3, 0, A3, 0, G3, 0];
  const f = bass[musicStep % bass.length];
  if (f > 0) beep(ctx, f, 180, "triangle", 0.035);
  const t = treble[musicStep % treble.length];
  if (t > 0) beep(ctx, t, 90, "square", 0.018);
  musicStep++;
}

// --- expo-audio: pool of players per SFX so rapid retriggers don't cut off ---
const POOL_SIZE = 3;
type Pool = { players: AudioPlayer[]; next: number };
const pools: Partial<Record<SfxKey, Pool>> = {};

function getPool(key: SfxKey): Pool | null {
  let p = pools[key];
  if (p) return p;
  try {
    const players: AudioPlayer[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const player = createAudioPlayer(SFX_SOURCES[key]);
      player.volume = 0.6;
      players.push(player);
    }
    p = { players, next: 0 };
    pools[key] = p;
    return p;
  } catch {
    return null;
  }
}

function playSfx(key: SfxKey) {
  const p = getPool(key);
  if (!p) return;
  const player = p.players[p.next];
  p.next = (p.next + 1) % p.players.length;
  try {
    player.seekTo(0);
    player.play();
  } catch {}
}

export function createSoundEngine(): SoundEngine {
  let enabled = true;
  const safePlay = (key: SfxKey) => {
    if (!enabled) return;
    try {
      playSfx(key);
    } catch {}
  };

  return {
    enabled: true,
    setEnabled(b) {
      enabled = b;
      this.enabled = b;
      if (!b && musicIntervalId) {
        clearInterval(musicIntervalId);
        musicIntervalId = null;
      }
    },
    chomp: () => safePlay("chomp"),
    pellet: () => safePlay("pellet"),
    superPellet: () => safePlay("super"),
    catchHit: () => safePlay("catch"),
    comboHit: (_combo) => safePlay("combo"),
    ghostEaten: () => safePlay("ghostEaten"),
    pelletGuyDeath: () => safePlay("death"),
    levelWin: () => safePlay("win"),
    levelLose: () => safePlay("lose"),
    uiClick: () => safePlay("uiClick"),
    startMusic() {
      if (!enabled) return;
      if (musicIntervalId) return;
      const ctx = getAudioContext();
      if (!ctx) return; // native: music skipped (could add looping mp3 asset later)
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      musicStep = 0;
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

let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!_engine) _engine = createSoundEngine();
  return _engine;
}
