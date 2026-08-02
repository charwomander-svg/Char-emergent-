import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { getMusicTrackForLevel, getSoundEngine } from "@/src/game/sounds";
import { fetchApiVersion } from "@/src/game/api";

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [backendBuild, setBackendBuild] = useState<string>("unknown");

  useEffect(() => {
    loadSettings().then(setSettings);
    fetchApiVersion().then((info) => setBackendBuild(info.build)).catch(() => setBackendBuild("offline"));
  }, []);

  const update = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => {
    const next = { ...settings, [k]: v };
    setSettings(next);
    saveSettings(next);
    if (k === "soundOn") {
      getSoundEngine().setEnabled(Boolean(v));
      if (!v) {
        getSoundEngine().stopMusic();
      }
    }
    if (k === "musicOn") {
      if (v && settings.soundOn) getSoundEngine().startMusic(getMusicTrackForLevel(1));
      if (!v) {
        getSoundEngine().stopMusic();
      }
    }
    if (k === "sfxVolume" || k === "musicVolume") {
      getSoundEngine().setVolumes({
        sfx: k === "sfxVolume" ? Number(v) : next.sfxVolume,
        music: k === "musicVolume" ? Number(v) : next.musicVolume,
      });
    }
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

  const ControlModeRow = ({
    value,
    onChange,
  }: {
    value: SettingsData["controlMode"];
    onChange: (v: SettingsData["controlMode"]) => void;
  }) => (
    <View style={styles.row} testID="control-mode-row">
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>Controls</Text>
        <Text style={styles.rowDesc}>Choose swipe, tap-to-move, or both</Text>
      </View>
      <View style={styles.modeSelector}>
        {(["swipe", "tap", "both"] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeBtn, value === mode && styles.modeBtnActive]}
            onPress={() => onChange(mode)}
            testID={`control-mode-${mode}`}
          >
            <Text style={[styles.modeBtnText, value === mode && styles.modeBtnTextActive]}>{mode.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
        <ControlModeRow
          value={settings.controlMode}
          onChange={(v) => update("controlMode", v)}
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
        {settings.devMode && (
          <View style={styles.musicCard} testID="dev-mode-card">
            <Text style={styles.musicCardTitle}>DEV MODE</Text>
            <Text style={styles.musicCardSub}>Unlocked via secret code. These cheats stay hidden from normal players.</Text>
            <Row
              label="Infinite Coins"
              desc="Coin spending checks always pass"
              value={settings.devInfiniteCoins}
              onChange={(v) => update("devInfiniteCoins", v)}
              testID="toggle-dev-infinite-coins"
            />
            <Row
              label="Infinite Items"
              desc="Power-ups never consume inventory"
              value={settings.devInfiniteItems}
              onChange={(v) => update("devInfiniteItems", v)}
              testID="toggle-dev-infinite-items"
            />
          </View>
        )}
        <View style={styles.buildInfoCard} testID="backend-build-info">
          <Text style={styles.buildInfoLabel}>BACKEND BUILD</Text>
          <Text style={styles.buildInfoValue}>{backendBuild}</Text>
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
  modeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexWrap: "wrap",
    maxWidth: "52%",
  },
  modeBtn: {
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    borderRadius: 8,
    backgroundColor: "#121a32",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: "center",
  },
  modeBtnActive: {
    borderColor: "#FFD23F",
    backgroundColor: "#202b4f",
  },
  modeBtnText: { color: "#c8d0f0", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  modeBtnTextActive: { color: "#fff6d0" },
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
  buildInfoCard: {
    backgroundColor: COLORS.uiPanel,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  buildInfoLabel: { color: "#9fb2e6", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  buildInfoValue: { color: "#f4f7ff", fontSize: 12, fontWeight: "900", marginTop: 3 },
});
