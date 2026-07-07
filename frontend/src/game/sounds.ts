// Hybrid sound engine: bundled WAV files via expo-audio on all platforms.

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
type MusicTrack = "main" | "bonus";

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
  bonus: require("@/assets/sounds/ghost_king.mp3"),
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
  startMusic: (track?: MusicTrack) => void;
  stopMusic: () => void;
}

// --- expo-audio: pool of players per SFX so rapid retriggers don't cut off ---
const POOL_SIZE = 3;
type Pool = { players: AudioPlayer[]; next: number };
const pools: Partial<Record<SfxKey, Pool>> = {};
const musicPlayers: Partial<Record<MusicTrack, AudioPlayer>> = {};
let activeMusicTrack: MusicTrack | null = null;

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

function getMusicPlayer(track: MusicTrack): AudioPlayer | null {
  const existing = musicPlayers[track];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(MUSIC_SOURCES[track]);
    player.loop = true;
    player.volume = 0.28;
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
        player.play();
        activeMusicTrack = track;
      } catch {}
    },
    stopMusic() {
      pausePlayer(activeMusicTrack ? musicPlayers[activeMusicTrack] : null);
      activeMusicTrack = null;
    },
  };
}

let _engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!_engine) _engine = createSoundEngine();
  return _engine;
}
