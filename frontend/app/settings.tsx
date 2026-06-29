import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, PanResponder, GestureResponderEvent, LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { getSoundEngine } from "@/src/game/sounds";

// ---- Simple drag slider ----
function VolumeSlider({ value, onChange, color = "#FFD23F" }: { value: number; onChange: (v: number) => void; color?: string }) {
  const trackWidth = useRef(200);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const x = e.nativeEvent.locationX;
        onChange(Math.max(0, Math.min(1, x / trackWidth.current)));
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const x = e.nativeEvent.locationX;
        onChange(Math.max(0, Math.min(1, x / trackWidth.current)));
      },
    })
  ).current;

  return (
    <View
      style={sliderStyles.track}
      onLayout={(e: LayoutChangeEvent) => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={[sliderStyles.fill, { width: `${value * 100}%` as any, backgroundColor: color }]} />
      <View style={[sliderStyles.thumb, { left: `${value * 100}%` as any, borderColor: color }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    height: 20,
    backgroundColor: "#111133",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333355",
    position: "relative",
    marginTop: 8,
    overflow: "visible",
  },
  fill: { position: "absolute", top: 0, left: 0, bottom: 0, borderRadius: 10 },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 2,
    top: -1,
    marginLeft: -10,
  },
});
// ----------------------------

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
    if (k === "sfxVolume") getSoundEngine().setSfxVolume(Number(v));
    if (k === "musicVolume") getSoundEngine().setMusicVolume(Number(v));
  };

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

      <View style={styles.body}>
        <Row
          label="Sound Effects"
          desc="Pellet chomps, catches, level fanfare"
          value={settings.soundOn}
          onChange={(v) => update("soundOn", v)}
          testID="toggle-sound"
        />
        <View style={styles.sliderRow} testID="slider-sfx">
          <Text style={styles.rowLabel}>SFX Volume</Text>
          <Text style={styles.sliderValue}>{Math.round(settings.sfxVolume * 100)}%</Text>
          <VolumeSlider value={settings.sfxVolume} onChange={(v) => update("sfxVolume", v)} color="#FFD23F" />
        </View>
        <Row
          label="Background Music"
          desc="Chiptune loop while playing"
          value={settings.musicOn}
          onChange={(v) => update("musicOn", v)}
          testID="toggle-music"
        />
        <View style={styles.sliderRow} testID="slider-music">
          <Text style={styles.rowLabel}>Music Volume</Text>
          <Text style={styles.sliderValue}>{Math.round(settings.musicVolume * 100)}%</Text>
          <VolumeSlider value={settings.musicVolume} onChange={(v) => update("musicVolume", v)} color="#7FE8FF" />
        </View>
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
      </View>
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
  sliderRow: {
    backgroundColor: COLORS.uiPanel,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  sliderValue: { color: "#CCCCDD", fontSize: 11, marginTop: 2 },
});
