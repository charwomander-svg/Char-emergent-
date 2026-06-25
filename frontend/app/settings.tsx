import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
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
        <Row
          label="Background Music"
          desc="Chiptune loop while playing"
          value={settings.musicOn}
          onChange={(v) => update("musicOn", v)}
          testID="toggle-music"
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
});
