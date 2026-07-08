import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { getSoundEngine, SOUND_TEST_TRACKS } from "@/src/game/sounds";

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [activeSoundTestTrack, setActiveSoundTestTrack] = useState<string | null>(null);
  const orderedSoundTestTracks = React.useMemo(() => {
    const order = settings.soundTestOrder ?? [];
    const orderMap = new Map(order.map((id, index) => [id, index]));
    const favorites = new Set(settings.soundTestFavorites ?? []);
    return [...SOUND_TEST_TRACKS].sort((a, b) => {
      const favDiff = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
      if (favDiff !== 0) return favDiff;
      const ai = orderMap.get(a.id);
      const bi = orderMap.get(b.id);
      if (ai != null && bi != null) return ai - bi;
      if (ai != null) return -1;
      if (bi != null) return 1;
      return 0;
    });
  }, [settings.soundTestFavorites, settings.soundTestOrder]);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => {
    const next = { ...settings, [k]: v };
    setSettings(next);
    saveSettings(next);
    if (k === "soundOn") {
      getSoundEngine().setEnabled(Boolean(v));
      if (!v) {
        getSoundEngine().stopMusic();
        setActiveSoundTestTrack(null);
      }
    }
    if (k === "musicOn") {
      if (v && settings.soundOn) getSoundEngine().startMusic();
      if (!v) {
        getSoundEngine().stopMusic();
        setActiveSoundTestTrack(null);
      }
    }
    if (k === "sfxVolume" || k === "musicVolume") {
      getSoundEngine().setVolumes({
        sfx: k === "sfxVolume" ? Number(v) : next.sfxVolume,
        music: k === "musicVolume" ? Number(v) : next.musicVolume,
      });
    }
  };

  const openExternal = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Link unavailable", url);
      return;
    }
    await Linking.openURL(url);
  };

  const NumberRow = ({
    label,
    desc,
    value,
    step,
    min,
    max,
    onChange,
    valueText,
    testID,
  }: {
    label: string;
    desc: string;
    value: number;
    step: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    valueText: string;
    testID?: string;
  }) => (
    <View style={styles.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, Number((value - step).toFixed(2))))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue}>{valueText}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, Number((value + step).toFixed(2))))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const Row = ({
    label,
    desc,
    value,
    onChange,
    testID,
  }: {
    label: string;
    desc: string;
    value: boolean;
    onChange: (v: boolean) => void;
    testID?: string;
  }) => (
    <View style={styles.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#222244", true: "#FFD23F" }}
        thumbColor={value ? "#FFFFFF" : "#888"}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} testID="settings-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="back-btn">
          <Text style={styles.back}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={true}>
        <Row
          label="Sound Effects"
          desc="Pellet chomps, catches, level fanfare"
          value={settings.soundOn}
          onChange={(v) => update("soundOn", v)}
          testID="toggle-sound"
        />
        <Row
          label="Background Music"
          desc="Main and bonus stage tracks"
          value={settings.musicOn}
          onChange={(v) => update("musicOn", v)}
          testID="toggle-music"
        />
        <NumberRow
          label="SFX Volume"
          desc="Catch, combo, and gameplay sound levels"
          value={settings.sfxVolume}
          step={0.05}
          min={0}
          max={1}
          onChange={(v) => update("sfxVolume", v)}
          valueText={`${Math.round(settings.sfxVolume * 100)}%`}
          testID="sfx-volume"
        />
        <NumberRow
          label="Music Volume"
          desc="Background track loudness"
          value={settings.musicVolume}
          step={0.05}
          min={0}
          max={1}
          onChange={(v) => update("musicVolume", v)}
          valueText={`${Math.round(settings.musicVolume * 100)}%`}
          testID="music-volume"
        />
        <Row
          label="Invert Stick Y"
          desc="Invert vertical controller stick direction"
          value={settings.gamepadInvertY}
          onChange={(v) => update("gamepadInvertY", v)}
          testID="toggle-invert-y"
        />
        <NumberRow
          label="Controller Deadzone"
          desc="How far stick must move before input triggers"
          value={settings.gamepadDeadzone}
          step={0.05}
          min={0.2}
          max={0.9}
          onChange={(v) => update("gamepadDeadzone", v)}
          valueText={settings.gamepadDeadzone.toFixed(2)}
          testID="gamepad-deadzone"
        />
        <Row
          label="Haptics"
          desc="Subtle vibrations on swipes and catches"
          value={settings.haptics}
          onChange={(v) => update("haptics", v)}
          testID="toggle-haptics"
        />
        <Row
          label="CRT Scanlines"
          desc="Retro horizontal lines overlay"
          value={settings.scanlines}
          onChange={(v) => update("scanlines", v)}
          testID="toggle-scanlines"
        />
        <Row
          label="Reduced Motion"
          desc="Dampen flashing & particle effects"
          value={settings.reducedMotion}
          onChange={(v) => update("reducedMotion", v)}
          testID="toggle-reduced-motion"
        />
        <Row
          label="High Contrast"
          desc="Boost outlines and visibility for game entities"
          value={settings.highContrast}
          onChange={(v) => update("highContrast", v)}
          testID="toggle-high-contrast"
        />
        <Row
          label="Large HUD"
          desc="Increase HUD size for readability"
          value={settings.largeHud}
          onChange={(v) => update("largeHud", v)}
          testID="toggle-large-hud"
        />
        <View style={styles.musicCard}>
          <Text style={styles.musicCardTitle}>SOUND TEST MODE</Text>
          <Text style={styles.musicCardBody}>
            Enjoying the music? Chardcore is a musical artist with 8 albums released. You might like it, so we are
            providing her most recent album, Instrumetal, which you can listen to here or download for free. Yes,
            free. She is awesome like that.
          </Text>
          <View style={styles.musicLinkRow}>
            <TouchableOpacity
              style={styles.musicLinkBtn}
              onPress={() => openExternal("https://charware.dev/instrumetal")}
              testID="instrumetal-link"
            >
              <Text style={styles.musicLinkBtnText}>INSTRUMETAL (FREE)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.musicLinkBtn}
              onPress={() => openExternal("https://open.spotify.com/artist/23uBgaylUzFwSFkLRPxX80")}
              testID="spotify-link"
            >
              <Text style={styles.musicLinkBtnText}>SPOTIFY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.musicLinkBtn}
              onPress={() => openExternal("https://charware.dev")}
              testID="charware-link"
            >
              <Text style={styles.musicLinkBtnText}>CHARWARE.DEV</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.musicCardSub}>Tap a track to preview your favorites.</Text>
          {orderedSoundTestTracks.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.soundTestBtn,
                activeSoundTestTrack === entry.id && styles.soundTestBtnActive,
              ]}
              onPress={() => {
                if (activeSoundTestTrack === entry.id) {
                  getSoundEngine().stopMusic();
                  setActiveSoundTestTrack(null);
                  return;
                }
                getSoundEngine().startMusic(entry.track);
                setActiveSoundTestTrack(entry.id);
                const nextOrder = [entry.id, ...(settings.soundTestOrder ?? []).filter((id) => id !== entry.id)];
                update("soundTestOrder", nextOrder);
              }}
              testID={`sound-test-${entry.id}`}
            >
              <View style={styles.soundTestHeader}>
                <Text style={styles.soundTestTitle}>{entry.label}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const current = new Set(settings.soundTestFavorites ?? []);
                    if (current.has(entry.id)) current.delete(entry.id);
                    else current.add(entry.id);
                    update("soundTestFavorites", Array.from(current));
                  }}
                  style={styles.favoriteBtn}
                  testID={`sound-test-fav-${entry.id}`}
                >
                  <Text style={styles.favoriteBtnText}>
                    {(settings.soundTestFavorites ?? []).includes(entry.id) ? "★" : "☆"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.soundTestSub}>{entry.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.uiBorder,
    backgroundColor: COLORS.uiPanel,
  },
  back: { color: "#FFFF00", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
  title: { color: "#FFFF00", fontWeight: "900", fontSize: 22, letterSpacing: 3 },
  body: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.uiPanel,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  rowLabel: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  rowDesc: { color: "#CCCCDD", fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121a32",
  },
  stepBtnText: { color: "#FFFF00", fontSize: 16, fontWeight: "900" },
  stepValue: { color: "#FFFFFF", minWidth: 52, textAlign: "center", fontWeight: "900" },
  musicCard: {
    backgroundColor: COLORS.uiPanel,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    gap: 8,
  },
  musicCardTitle: { color: "#FFFF00", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  musicCardBody: { color: "#d9def8", fontSize: 12, lineHeight: 18 },
  musicCardSub: { color: "#aeb9e8", fontSize: 11, fontWeight: "700" },
  musicLinkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  musicLinkBtn: {
    borderWidth: 1,
    borderColor: "#5f6aa0",
    borderRadius: 8,
    backgroundColor: "#121a32",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  musicLinkBtnText: { color: "#e7edff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  soundTestBtn: {
    borderWidth: 1,
    borderColor: "#394572",
    borderRadius: 8,
    backgroundColor: "#10172d",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  soundTestBtnActive: {
    borderColor: "#FFD23F",
    backgroundColor: "#202b4f",
  },
  soundTestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  favoriteBtn: {
    borderWidth: 1,
    borderColor: "#6a74ab",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#141d38",
  },
  favoriteBtnText: { color: "#FFE082", fontSize: 12, fontWeight: "900" },
  soundTestTitle: { color: "#f4f7ff", fontWeight: "900", fontSize: 12 },
  soundTestSub: { color: "#b8c2eb", fontSize: 10, marginTop: 2 },
});
