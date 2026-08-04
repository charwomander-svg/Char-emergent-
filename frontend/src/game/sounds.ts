// Hybrid sound engine: bundled WAV files via expo-audio on all platforms.

import { createAudioPlayer, AudioPlayer } from "expo-audio";
import type { BonusGameType } from "./bonusGame";

type SfxKey =
  | "chomp"
  | "pellet"
  | "super"
  | "catch"
  | "ghostEaten"
  | "death"
  | "win"
  | "lose"
  | "uiClick";
export type MusicTrack =
  | "main"
  | "tier2"
  | "tier3"
  | "tier4"
  | "bonus"
  | "bonusHunt";

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

const MUSIC_SOURCES: Record<MusicTrack, number> = {
  main: require("@/assets/sounds/blinky_revenge.mp3"),
  tier2: require("@/assets/sounds/song2.mp3"),
  tier3: require("@/assets/sounds/neon.mp3"),
  tier4: require("@/assets/sounds/ghost_king.mp3"),
  bonus: require("@/assets/sounds/ghost_king.mp3"),
  bonusHunt: require("@/assets/sounds/Slap Bass Ghost Skank.mp3"),
};

const LEVEL_MUSIC_ROTATION: MusicTrack[] = ["main", "tier2", "tier3", "tier4"];

export function getMusicTrackForLevel(level: number, bonusType?: BonusGameType | null): MusicTrack {
  if (bonusType) return bonusType === "powerHunt" ? "bonusHunt" : "bonus";
  const safeLevel = Math.max(1, Math.floor(level));
  const tierIndex = Math.floor((safeLevel - 1) / 10) % LEVEL_MUSIC_ROTATION.length;
  return LEVEL_MUSIC_ROTATION[tierIndex];
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
  startMusic: (track?: MusicTrack) => void;
  stopMusic: () => void;
  setVolumes: (volumes: { sfx: number; music: number }) => void;
  fadeMusicTo: (target: number, durationMs: number) => void;
}

// --- expo-audio: pool of players per SFX so rapid retriggers don't cut off ---
const POOL_SIZE = 3;
type Pool = { players: AudioPlayer[]; next: number };
const pools: Partial<Record<SfxKey, Pool>> = {};
const musicPlayers: Partial<Record<MusicTrack, AudioPlayer>> = {};
let activeMusicTrack: MusicTrack | null = null;
let sfxVolume = 0.6;
let musicBaseVolume = 0.28;
let musicDuckUntil = 0;
let musicFadeInterval: ReturnType<typeof setInterval> | null = null;

function getPool(key: SfxKey): Pool | null {
  let p = pools[key];
  if (p) return p;
  try {
    const players: AudioPlayer[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const player = createAudioPlayer(SFX_SOURCES[key]);
      player.volume = sfxVolume;
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
    if (key === "catch" || key === "combo" || key === "ghostEaten" || key === "super") {
      musicDuckUntil = Date.now() + 240;
      applyMusicVolumeNow();
    }
    player.seekTo(0);
    ignorePlaybackRejection(player.play());
  } catch {}
}

function getMusicPlayer(track: MusicTrack): AudioPlayer | null {
  const existing = musicPlayers[track];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(MUSIC_SOURCES[track]);
    player.loop = true;
    player.volume = musicBaseVolume;
    musicPlayers[track] = player;
    return player;
  } catch {
    return null;
  }
}

function pausePlayer(player: AudioPlayer | null | undefined) {
  if (!player) return;
  try {
    player.pause();
  } catch {}
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getMusicTargetVolume() {
  return (Date.now() < musicDuckUntil ? 0.5 : 1) * musicBaseVolume;
}

function applyMusicVolumeNow() {
  const target = getMusicTargetVolume();
  (Object.values(musicPlayers) as (AudioPlayer | undefined)[]).forEach((player) => {
    if (!player) return;
    player.volume = target;
  });
}

function ignorePlaybackRejection(result: unknown) {
  if (!result || typeof result !== "object") return;
  const maybePromise = result as { catch?: (onRejected: () => void) => unknown };
  if (typeof maybePromise.catch === "function") {
    void maybePromise.catch(() => {});
  }
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
      if (!b) this.stopMusic();
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
    startMusic(track = "main") {
      if (!enabled) return;
      if (activeMusicTrack === track) {
        const currentPlayer = getMusicPlayer(track);
        if (!currentPlayer || currentPlayer.playing) return;
      } else {
        pausePlayer(activeMusicTrack ? musicPlayers[activeMusicTrack] : null);
      }
      const player = getMusicPlayer(track);
      if (!player || player.playing) return;
      try {
        player.seekTo(0);
        ignorePlaybackRejection(player.play());
        activeMusicTrack = track;
      } catch {}
    },
    stopMusic() {
      if (musicFadeInterval) {
        clearInterval(musicFadeInterval);
        musicFadeInterval = null;
      }
      pausePlayer(activeMusicTrack ? musicPlayers[activeMusicTrack] : null);
      activeMusicTrack = null;
    },
    setVolumes(volumes) {
      sfxVolume = clamp01(volumes.sfx);
      musicBaseVolume = clamp01(volumes.music);
      Object.values(pools).forEach((pool) => {
        pool?.players.forEach((player) => {
          player.volume = sfxVolume;
        });
      });
      applyMusicVolumeNow();
    },
    fadeMusicTo(target, durationMs) {
      const clamped = clamp01(target);
      if (musicFadeInterval) {
        clearInterval(musicFadeInterval);
        musicFadeInterval = null;
      }
      if (durationMs <= 0) {
        musicBaseVolume = clamped;
        applyMusicVolumeNow();
        return;
      }
      const start = musicBaseVolume;
      const startedAt = Date.now();
      musicFadeInterval = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const t = Math.min(1, elapsed / durationMs);
        musicBaseVolume = start + (clamped - start) * t;
        applyMusicVolumeNow();
        if (t >= 1) {
          if (musicFadeInterval) clearInterval(musicFadeInterval);
          musicFadeInterval = null;
        }
      }, 30);
    },
  };
}

let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!_engine) _engine = createSoundEngine();
  return _engine;
}
