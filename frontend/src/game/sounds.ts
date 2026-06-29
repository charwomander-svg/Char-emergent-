// Hybrid sound engine: bundled WAV SFX + MP3 background music via expo-audio.

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

const MUSIC_SOURCE = require("@/assets/sounds/blinkys_revenge.mp3");
const BOSS_MUSIC_SOURCE = require("@/assets/sounds/panic_protocol_ghost_king.mp3");

interface SoundEngine {
  enabled: boolean;
  setEnabled: (b: boolean) => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
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
  startMusic: (boss?: boolean) => void;
  stopMusic: () => void;
}

// --- Music players (MP3 loop, all platforms) ---
let musicPlayer: AudioPlayer | null = null;
let bossMusicPlayer: AudioPlayer | null = null;

function getMusicPlayer(): AudioPlayer | null {
  if (musicPlayer) return musicPlayer;
  try {
    musicPlayer = createAudioPlayer(MUSIC_SOURCE);
    musicPlayer.loop = true;
    musicPlayer.volume = 0.45;
    return musicPlayer;
  } catch {
    return null;
  }
}

function getBossMusicPlayer(): AudioPlayer | null {
  if (bossMusicPlayer) return bossMusicPlayer;
  try {
    bossMusicPlayer = createAudioPlayer(BOSS_MUSIC_SOURCE);
    bossMusicPlayer.loop = true;
    bossMusicPlayer.volume = 0.5;
    return bossMusicPlayer;
  } catch {
    return null;
  }
}

function stopAllMusic() {
  try { if (musicPlayer?.playing) musicPlayer.pause(); } catch {}
  try { if (bossMusicPlayer?.playing) bossMusicPlayer.pause(); } catch {}
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
  let currentSfxVolume = 0.6;
  let currentMusicVolume = 0.45;

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
      if (!b) this.stopMusic();
    },
    setSfxVolume(v) {
      currentSfxVolume = Math.max(0, Math.min(1, v));
      // Apply to all existing pool players
      for (const key of Object.keys(pools) as SfxKey[]) {
        const p = pools[key];
        if (p) p.players.forEach((pl) => { try { pl.volume = currentSfxVolume; } catch {} });
      }
    },
    setMusicVolume(v) {
      currentMusicVolume = Math.max(0, Math.min(1, v));
      try { if (musicPlayer) musicPlayer.volume = currentMusicVolume; } catch {}
      try { if (bossMusicPlayer) bossMusicPlayer.volume = currentMusicVolume; } catch {}
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
    startMusic(boss = false) {
      if (!enabled) return;
      try {
        stopAllMusic();
        const p = boss ? getBossMusicPlayer() : getMusicPlayer();
        if (!p) return;
        p.volume = currentMusicVolume;
        if (!p.playing) p.play();
      } catch {}
    },
    stopMusic() {
      try { stopAllMusic(); } catch {}
    },
  };
}

let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!_engine) _engine = createSoundEngine();
  return _engine;
}
