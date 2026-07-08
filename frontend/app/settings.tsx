import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { getSoundEngine } from "@/src/game/sounds";

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => {
    const next = { ...settings, [k]: v };
    setSettings(next);
    saveSettings(next);
    if (k === "soundOn") {
      getSoundEngine().setEnabled(Boolean(v));
      if (!v) getSoundEngine().stopMusic();
    }
    if (k === "musicOn") {
      if (v && settings.soundOn) getSoundEngine().startMusic();
      if (!v) getSoundEngine().stopMusic();
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
});
