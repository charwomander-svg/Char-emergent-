// Hybrid sound engine: bundled WAV files via expo-audio on all platforms.

import { createAudioPlayer, AudioPlayer } from "expo-audio";
import type { BonusGameType } from "./types";

export type MusicLibraryMode = "chiptunes" | "instrumetal" | "everything";

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
export type MusicTrack =
  | "main"
  | "tier2"
  | "tier3"
  | "tier4"
  | "bonus"
  | "bonusHunt"
  | "instrumetalA"
  | "instrumetalB"
  | "instrumetalCloudy1"
  | "instrumetalAbruptTrauma"
  | "instrumetalApexVelocityExtended"
  | "instrumetalBluntForce"
  | "instrumetalBluntForceTrauma"
  | "instrumetalCursedMeatFreezerSurgeV2"
  | "instrumetalCursedServerSpeedrunMachineGunFillEdit"
  | "instrumetalCursedServerSpeedrunTake1"
  | "instrumetalCursedServerSpeedrunTotalDisintegration"
  | "instrumetalDigitalObliteration"
  | "instrumetalDrumfire"
  | "instrumetalFatalOverride"
  | "instrumetalForceOverload"
  | "instrumetalGravityHammer"
  | "instrumetalGutterTrauma"
  | "instrumetalHyperShrapnel"
  | "instrumetalHyperShrapnelChaosExtension"
  | "instrumetalHypervelocityRuin"
  | "instrumetalKineticErasure"
  | "instrumetalKineticRupture"
  | "instrumetalKineticRupture1"
  | "instrumetalMachVelocity"
  | "instrumetalMachineGunSnareMalfunction"
  | "instrumetalMechanicalSurvivalCheckV1"
  | "instrumetalOrbitalSawbladeIcySynthEdition"
  | "instrumetalRecoil"
  | "instrumetalRiffReactorCriticalBlastbeatMix"
  | "instrumetalSingularityRupture"
  | "instrumetalSonicAnnihilationV2MaximumSpeed"
  | "instrumetalTotalKineticFailure"
  | "instrumetalVelocityRupture"
  | "instrumetalViciousImpact";

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
  tier2: require("@/assets/sounds/blinkys_revenge.mp3"),
  tier3: require("@/assets/sounds/blinky_revenge.mp3"),
  tier4: require("@/assets/sounds/panic_protocol_ghost_king.mp3"),
  bonus: require("@/assets/sounds/ghost_king.mp3"),
  bonusHunt: require("@/assets/sounds/Slap Bass Ghost Skank.mp3"),
  instrumetalA: require("@/assets/sounds/cloudy.mp3"),
  instrumetalB: require("@/assets/sounds/Hypervelocity.mp3"),
  instrumetalCloudy1: require("@/assets/sounds/cloudy1.mp3"),
  instrumetalAbruptTrauma: require("@/assets/sounds/Abrupt Trauma.mp3"),
  instrumetalApexVelocityExtended: require("@/assets/sounds/Apex Velocity Extended.mp3"),
  instrumetalBluntForce: require("@/assets/sounds/Blunt Force.mp3"),
  instrumetalBluntForceTrauma: require("@/assets/sounds/Blunt Force Trauma.mp3"),
  instrumetalCursedMeatFreezerSurgeV2: require("@/assets/sounds/Cursed Meat Freezer Surge (V2).mp3"),
  instrumetalCursedServerSpeedrunMachineGunFillEdit: require("@/assets/sounds/Cursed Server Speedrun (Machine-Gun Fill Edit).mp3"),
  instrumetalCursedServerSpeedrunTake1: require("@/assets/sounds/Cursed Server Speedrun (Take 1).mp3"),
  instrumetalCursedServerSpeedrunTotalDisintegration: require("@/assets/sounds/Cursed Server Speedrun (Total Disintegration).mp3"),
  instrumetalDigitalObliteration: require("@/assets/sounds/Digital Obliteration.mp3"),
  instrumetalDrumfire: require("@/assets/sounds/Drumfire.mp3"),
  instrumetalFatalOverride: require("@/assets/sounds/Fatal Override.mp3"),
  instrumetalForceOverload: require("@/assets/sounds/Force Overload.mp3"),
  instrumetalGravityHammer: require("@/assets/sounds/Gravity Hammer.mp3"),
  instrumetalGutterTrauma: require("@/assets/sounds/Gutter Trauma.mp3"),
  instrumetalHyperShrapnel: require("@/assets/sounds/Hyper Shrapnel.mp3"),
  instrumetalHyperShrapnelChaosExtension: require("@/assets/sounds/Hyper Shrapnel (Chaos Extension).mp3"),
  instrumetalHypervelocityRuin: require("@/assets/sounds/Hypervelocity Ruin.mp3"),
  instrumetalKineticErasure: require("@/assets/sounds/Kinetic Erasure.mp3"),
  instrumetalKineticRupture: require("@/assets/sounds/Kinetic Rupture.mp3"),
  instrumetalKineticRupture1: require("@/assets/sounds/Kinetic Rupture (1).mp3"),
  instrumetalMachVelocity: require("@/assets/sounds/Mach Velocity.mp3"),
  instrumetalMachineGunSnareMalfunction: require("@/assets/sounds/Machine-Gun Snare Malfunction.mp3"),
  instrumetalMechanicalSurvivalCheckV1: require("@/assets/sounds/Mechanical Survival Check (V1).mp3"),
  instrumetalOrbitalSawbladeIcySynthEdition: require("@/assets/sounds/Orbital Sawblade (Icy Synth Edition).mp3"),
  instrumetalRecoil: require("@/assets/sounds/Recoil.mp3"),
  instrumetalRiffReactorCriticalBlastbeatMix: require("@/assets/sounds/Riff Reactor Critical (Blastbeat Mix).mp3"),
  instrumetalSingularityRupture: require("@/assets/sounds/Singularity Rupture.mp3"),
  instrumetalSonicAnnihilationV2MaximumSpeed: require("@/assets/sounds/Sonic Annihilation V2 (Maximum Speed).mp3"),
  instrumetalTotalKineticFailure: require("@/assets/sounds/Total Kinetic Failure.mp3"),
  instrumetalVelocityRupture: require("@/assets/sounds/Velocity Rupture.mp3"),
  instrumetalViciousImpact: require("@/assets/sounds/Vicious Impact.mp3"),
};

const LEVEL_MUSIC_ROTATION: MusicTrack[] = ["main", "tier2", "tier3", "tier4"];
const INSTRUMETAL_TRACKS: MusicTrack[] = [
  "instrumetalA",
  "instrumetalB",
  "instrumetalCloudy1",
  "instrumetalAbruptTrauma",
  "instrumetalApexVelocityExtended",
  "instrumetalBluntForce",
  "instrumetalBluntForceTrauma",
  "instrumetalCursedMeatFreezerSurgeV2",
  "instrumetalCursedServerSpeedrunMachineGunFillEdit",
  "instrumetalCursedServerSpeedrunTake1",
  "instrumetalCursedServerSpeedrunTotalDisintegration",
  "instrumetalDigitalObliteration",
  "instrumetalDrumfire",
  "instrumetalFatalOverride",
  "instrumetalForceOverload",
  "instrumetalGravityHammer",
  "instrumetalGutterTrauma",
  "instrumetalHyperShrapnel",
  "instrumetalHyperShrapnelChaosExtension",
  "instrumetalHypervelocityRuin",
  "instrumetalKineticErasure",
  "instrumetalKineticRupture",
  "instrumetalKineticRupture1",
  "instrumetalMachVelocity",
  "instrumetalMachineGunSnareMalfunction",
  "instrumetalMechanicalSurvivalCheckV1",
  "instrumetalOrbitalSawbladeIcySynthEdition",
  "instrumetalRecoil",
  "instrumetalRiffReactorCriticalBlastbeatMix",
  "instrumetalSingularityRupture",
  "instrumetalSonicAnnihilationV2MaximumSpeed",
  "instrumetalTotalKineticFailure",
  "instrumetalVelocityRupture",
  "instrumetalViciousImpact",
];
function getObjectKeys<T extends string>(record: Partial<Record<T, unknown>>): T[] {
  return Object.keys(record) as T[];
}

function getObjectEntries<T extends string, V>(record: Partial<Record<T, V>>): [T, V][] {
  return getObjectKeys(record).map((key) => [key, record[key] as V]);
}

function getObjectValues<T>(record: Record<string, T | undefined>): T[] {
  const values: T[] = [];
  for (const key in record) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value !== undefined) values.push(value);
  }
  return values;
}

const ALL_MUSIC_TRACKS: MusicTrack[] = (() => {
  const seen: Partial<Record<MusicTrack, true>> = {};
  const tracks: MusicTrack[] = [];
  for (const track of getObjectKeys(MUSIC_SOURCES)) {
    if (seen[track]) continue;
    seen[track] = true;
    tracks.push(track);
  }
  return tracks;
})();
const SFX_GAIN_MULTIPLIER: Record<SfxKey, number> = {
  chomp: 1,
  pellet: 1,
  super: 0.9,
  catch: 0.2,
  combo: 0.75,
  ghostEaten: 0.2,
  death: 0.7,
  win: 0.9,
  lose: 0.9,
  uiClick: 0.8,
};

export function getMusicTrackForLevel(level: number, bonusType?: BonusGameType | null): MusicTrack {
  if (bonusType) return bonusType === "powerHunt" ? "bonusHunt" : "bonus";
  const safeLevel = Math.max(1, Math.floor(level));
  const tierIndex = Math.floor((safeLevel - 1) / 10) % LEVEL_MUSIC_ROTATION.length;
  return LEVEL_MUSIC_ROTATION[tierIndex];
}

function randomTrackFrom(list: MusicTrack[]): MusicTrack {
  if (list.length === 0) return "main";
  return list[Math.floor(Math.random() * list.length)];
}

export function chooseMusicTrack(
  level: number,
  bonusType: BonusGameType | null | undefined,
  library: MusicLibraryMode,
): MusicTrack {
  if (library === "instrumetal") return randomTrackFrom(INSTRUMETAL_TRACKS);
  if (library === "chiptunes") return getMusicTrackForLevel(level, bonusType);
  return randomTrackFrom(ALL_MUSIC_TRACKS);
}

function getSfxVolumeForKey(key: SfxKey): number {
  return clamp01(sfxVolume * (SFX_GAIN_MULTIPLIER[key] ?? 1));
}

export const SOUND_TEST_TRACKS: { id: string; label: string; track: MusicTrack; description: string }[] = [
  { id: "arcade-1", label: "Arcade: Blinky's Revenge", track: "main", description: "Levels 1–10" },
  { id: "arcade-2", label: "Arcade: Ghost Maze Song 2", track: "tier2", description: "Levels 11–20" },
  { id: "arcade-3", label: "Arcade: Song 3", track: "tier3", description: "Levels 21–30" },
  { id: "arcade-4", label: "Arcade: Corrupted Nightmare", track: "tier4", description: "Levels 31+" },
  { id: "bonus", label: "Bonus Stage Theme", track: "bonus", description: "Dedicated bonus music" },
  { id: "bonus-hunt", label: "Bonus Hunt Theme", track: "bonusHunt", description: "Power Hunt levels" },
  { id: "instr-a", label: "Instrumetal: cloudy", track: "instrumetalA", description: "Featured album" },
  { id: "instr-b", label: "Instrumetal: Hypervelocity", track: "instrumetalB", description: "Featured album" },
  { id: "instr-cloudy-1", label: "Instrumetal: cloudy1", track: "instrumetalCloudy1", description: "Instrumetal album" },
  { id: "instr-abrupt-trauma", label: "Instrumetal: Abrupt Trauma", track: "instrumetalAbruptTrauma", description: "Instrumetal album" },
  { id: "instr-apex-velocity-extended", label: "Instrumetal: Apex Velocity Extended", track: "instrumetalApexVelocityExtended", description: "Instrumetal album" },
  { id: "instr-blunt-force", label: "Instrumetal: Blunt Force", track: "instrumetalBluntForce", description: "Instrumetal album" },
  { id: "instr-blunt-force-trauma", label: "Instrumetal: Blunt Force Trauma", track: "instrumetalBluntForceTrauma", description: "Instrumetal album" },
  { id: "instr-cursed-meat-freezer-surge-v2", label: "Instrumetal: Cursed Meat Freezer Surge (V2)", track: "instrumetalCursedMeatFreezerSurgeV2", description: "Instrumetal album" },
  { id: "instr-cursed-server-machine-gun", label: "Instrumetal: Cursed Server Speedrun (Machine-Gun Fill Edit)", track: "instrumetalCursedServerSpeedrunMachineGunFillEdit", description: "Instrumetal album" },
  { id: "instr-cursed-server-take-1", label: "Instrumetal: Cursed Server Speedrun (Take 1)", track: "instrumetalCursedServerSpeedrunTake1", description: "Instrumetal album" },
  { id: "instr-cursed-server-total-disintegration", label: "Instrumetal: Cursed Server Speedrun (Total Disintegration)", track: "instrumetalCursedServerSpeedrunTotalDisintegration", description: "Instrumetal album" },
  { id: "instr-digital-obliteration", label: "Instrumetal: Digital Obliteration", track: "instrumetalDigitalObliteration", description: "Instrumetal album" },
  { id: "instr-drumfire", label: "Instrumetal: Drumfire", track: "instrumetalDrumfire", description: "Instrumetal album" },
  { id: "instr-fatal-override", label: "Instrumetal: Fatal Override", track: "instrumetalFatalOverride", description: "Instrumetal album" },
  { id: "instr-force-overload", label: "Instrumetal: Force Overload", track: "instrumetalForceOverload", description: "Instrumetal album" },
  { id: "instr-gravity-hammer", label: "Instrumetal: Gravity Hammer", track: "instrumetalGravityHammer", description: "Instrumetal album" },
  { id: "instr-gutter-trauma", label: "Instrumetal: Gutter Trauma", track: "instrumetalGutterTrauma", description: "Instrumetal album" },
  { id: "instr-hyper-shrapnel", label: "Instrumetal: Hyper Shrapnel", track: "instrumetalHyperShrapnel", description: "Instrumetal album" },
  { id: "instr-hyper-shrapnel-chaos-extension", label: "Instrumetal: Hyper Shrapnel (Chaos Extension)", track: "instrumetalHyperShrapnelChaosExtension", description: "Instrumetal album" },
  { id: "instr-hypervelocity-ruin", label: "Instrumetal: Hypervelocity Ruin", track: "instrumetalHypervelocityRuin", description: "Instrumetal album" },
  { id: "instr-kinetic-erasure", label: "Instrumetal: Kinetic Erasure", track: "instrumetalKineticErasure", description: "Instrumetal album" },
  { id: "instr-kinetic-rupture", label: "Instrumetal: Kinetic Rupture", track: "instrumetalKineticRupture", description: "Instrumetal album" },
  { id: "instr-kinetic-rupture-1", label: "Instrumetal: Kinetic Rupture (1)", track: "instrumetalKineticRupture1", description: "Instrumetal album" },
  { id: "instr-mach-velocity", label: "Instrumetal: Mach Velocity", track: "instrumetalMachVelocity", description: "Instrumetal album" },
  { id: "instr-machine-gun-snare-malfunction", label: "Instrumetal: Machine-Gun Snare Malfunction", track: "instrumetalMachineGunSnareMalfunction", description: "Instrumetal album" },
  { id: "instr-mechanical-survival-check-v1", label: "Instrumetal: Mechanical Survival Check (V1)", track: "instrumetalMechanicalSurvivalCheckV1", description: "Instrumetal album" },
  { id: "instr-orbital-sawblade", label: "Instrumetal: Orbital Sawblade (Icy Synth Edition)", track: "instrumetalOrbitalSawbladeIcySynthEdition", description: "Instrumetal album" },
  { id: "instr-recoil", label: "Instrumetal: Recoil", track: "instrumetalRecoil", description: "Instrumetal album" },
  { id: "instr-riff-reactor-critical", label: "Instrumetal: Riff Reactor Critical (Blastbeat Mix)", track: "instrumetalRiffReactorCriticalBlastbeatMix", description: "Instrumetal album" },
  { id: "instr-singularity-rupture", label: "Instrumetal: Singularity Rupture", track: "instrumetalSingularityRupture", description: "Instrumetal album" },
  { id: "instr-sonic-annihilation-v2", label: "Instrumetal: Sonic Annihilation V2 (Maximum Speed)", track: "instrumetalSonicAnnihilationV2MaximumSpeed", description: "Instrumetal album" },
  { id: "instr-total-kinetic-failure", label: "Instrumetal: Total Kinetic Failure", track: "instrumetalTotalKineticFailure", description: "Instrumetal album" },
  { id: "instr-velocity-rupture", label: "Instrumetal: Velocity Rupture", track: "instrumetalVelocityRupture", description: "Instrumetal album" },
  { id: "instr-vicious-impact", label: "Instrumetal: Vicious Impact", track: "instrumetalViciousImpact", description: "Instrumetal album" },
];

const TRACK_LABEL_BY_ID: Record<MusicTrack, string> = (() => {
  const labels = {} as Record<MusicTrack, string>;
  for (const entry of SOUND_TEST_TRACKS) {
    labels[entry.track] = entry.label;
  }
  return labels;
})();

export function getMusicTrackLabel(track: MusicTrack): string {
  return TRACK_LABEL_BY_ID[track] ?? track;
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
      player.volume = getSfxVolumeForKey(key);
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
    player.play();
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
  getObjectValues(musicPlayers).forEach((player) => {
    if (!player) return;
    player.volume = target;
  });
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
    setVolumes(volumes) {
      sfxVolume = clamp01(volumes.sfx);
      musicBaseVolume = clamp01(volumes.music);
      getObjectEntries(pools).forEach(([key, pool]) => {
        const sfxKey = key as SfxKey;
        pool?.players.forEach((player) => {
          player.volume = getSfxVolumeForKey(sfxKey);
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
