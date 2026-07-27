import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Linking, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { COLORS } from "@/src/game/constants";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SettingsData } from "@/src/game/settings";
import { chooseMusicTrack, getSoundEngine, SOUND_TEST_TRACKS } from "@/src/game/sounds";
import { fetchApiVersion, redeemPromoCode } from "@/src/game/api";
import { getPlayerId } from "@/src/game/playerId";
import { addCoins, addInventory, loadEconomy, saveEconomy } from "@/src/game/economy";
import type { PowerUpId } from "@/src/game/powerups";
import { storage } from "@/src/utils/storage";

const PROMO_HISTORY_KEY = "ghostMaze.promoHistory.v1";

interface PromoHistoryEntry {
  code: string;
  redeemedAt: string;
  summary: string;
}

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [activeSoundTestTrack, setActiveSoundTestTrack] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [promoHistory, setPromoHistory] = useState<PromoHistoryEntry | null>(null);
  const [backendBuild, setBackendBuild] = useState<string>("unknown");
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
    storage.getItem(PROMO_HISTORY_KEY, null).then((value) => {
      if (!value || typeof value !== "object") return;
      const maybe = value as PromoHistoryEntry;
      if (typeof maybe.code !== "string" || typeof maybe.redeemedAt !== "string" || typeof maybe.summary !== "string") return;
      setPromoHistory(maybe);
    });
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
        setActiveSoundTestTrack(null);
      }
    }
    if (k === "musicOn") {
      if (v && settings.soundOn) getSoundEngine().startMusic(chooseMusicTrack(1, null, next.musicLibrary));
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

  const redeemSecretCode = async () => {
    const cleaned = promoCode.trim();
    if (!cleaned || redeemingPromo) return;
    setRedeemingPromo(true);
    setPromoFeedback(null);
    try {
      if (cleaned.toUpperCase() === "WARM0NGER") {
        const next = {
          ...settings,
          devMode: true,
          devInfiniteCoins: true,
          devInfiniteItems: true,
        };
        setSettings(next);
        await saveSettings(next);
        const message = "Warm0nger enabled infinite coins, infinite items, and in-game dev actions.";
        setPromoFeedback({ kind: "success", message });
        if (settings.haptics) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Dev mode unlocked", message);
        setPromoCode("");
        return;
      }
      const playerId = await getPlayerId();
      const redeemed = await redeemPromoCode(cleaned, playerId);
      const economy = await loadEconomy();
      let nextEconomy = addCoins(economy, redeemed.rewards.coins ?? 0);
      for (const [rawId, qty] of Object.entries(redeemed.rewards.powerUps ?? {})) {
        const id = rawId as PowerUpId;
        if (typeof qty === "number" && qty > 0) {
          nextEconomy = addInventory(nextEconomy, id, qty);
        }
      }
      await saveEconomy(nextEconomy);
      const coins = redeemed.rewards.coins ?? 0;
      const powerUps = Object.entries(redeemed.rewards.powerUps ?? {})
        .filter(([, qty]) => typeof qty === "number" && qty > 0)
        .map(([id, qty]) => `${qty} ${id}`);
      const rewards = [
        coins > 0 ? `${coins.toLocaleString()} Ghost Coins` : null,
        ...powerUps,
      ].filter(Boolean);
      const message = rewards.length > 0 ? `Added ${rewards.join(", ")} to your save.` : redeemed.message;
      setPromoFeedback({ kind: "success", message });
      const history: PromoHistoryEntry = {
        code: cleaned.toUpperCase(),
        redeemedAt: new Date().toISOString(),
        summary: message,
      };
      if (settings.haptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPromoHistory(history);
      void storage.setItem(PROMO_HISTORY_KEY, history);
      Alert.alert("Code redeemed", message);
      setPromoCode("");
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^HTTP \d+:\s*/, "") : "Unable to redeem code.";
      setPromoFeedback({ kind: "error", message });
      Alert.alert("Redeem failed", message);
    } finally {
      setRedeemingPromo(false);
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

  const MusicLibraryRow = ({
    value,
    onChange,
  }: {
    value: SettingsData["musicLibrary"];
    onChange: (v: SettingsData["musicLibrary"]) => void;
  }) => (
    <View style={styles.row} testID="music-library-row">
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>Music Library</Text>
        <Text style={styles.rowDesc}>Choose chiptunes, Instrumetal, or everything</Text>
      </View>
      <View style={styles.modeSelector}>
        {(["chiptunes", "instrumetal", "everything"] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeBtn, value === mode && styles.modeBtnActive]}
            onPress={() => onChange(mode)}
            testID={`music-library-${mode}`}
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
        <MusicLibraryRow
          value={settings.musicLibrary}
          onChange={(v) => {
            update("musicLibrary", v);
            if (settings.soundOn && settings.musicOn) {
              getSoundEngine().startMusic(chooseMusicTrack(1, null, v));
            }
          }}
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
          label="Puppet Master Mode"
          desc="Control all four ghosts at once with split keyboard lanes"
          value={settings.masterControlMode}
          onChange={(v) => update("masterControlMode", v)}
          testID="toggle-puppet-master-mode"
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
            Enjoying the music? Chardcore is a music artist with 9 albums released. You might like it, so we are
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
        <View style={styles.musicCard}>
          <Text style={styles.musicCardTitle}>PROMO / SECRET CODE</Text>
          <Text style={styles.musicCardSub}>Enter a code to claim rewards or unlock hidden features.</Text>
          <View style={styles.promoRow}>
            <TextInput
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ENTER CODE"
              placeholderTextColor="#7d88a8"
              style={styles.promoInput}
              testID="promo-code-input"
            />
            <TouchableOpacity
              onPress={redeemSecretCode}
              style={[styles.promoButton, redeemingPromo && styles.promoButtonDisabled]}
              disabled={redeemingPromo}
              testID="promo-code-submit"
            >
              <Text style={styles.promoButtonText}>{redeemingPromo ? "..." : "REDEEM"}</Text>
            </TouchableOpacity>
          </View>
          {promoFeedback && (
            <Text
              style={[
                styles.promoFeedback,
                promoFeedback.kind === "success" ? styles.promoFeedbackSuccess : styles.promoFeedbackError,
              ]}
              testID="promo-code-feedback"
            >
              {promoFeedback.message}
            </Text>
          )}
          {promoHistory && (
            <View style={styles.promoHistoryCard} testID="promo-code-history">
              <Text style={styles.promoHistoryTitle}>LAST REDEEMED</Text>
              <Text style={styles.promoHistoryText}>{promoHistory.code}</Text>
              <Text style={styles.promoHistoryText}>
                {new Date(promoHistory.redeemedAt).toLocaleString()}
              </Text>
              <Text style={styles.promoHistorySub}>{promoHistory.summary}</Text>
            </View>
          )}
        </View>
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
  modeSelector: { flexDirection: "row", alignItems: "center", gap: 6 },
  modeBtn: {
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
    borderRadius: 8,
    backgroundColor: "#121a32",
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  promoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#394572",
    borderRadius: 8,
    backgroundColor: "#10172d",
    color: "#f4f7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  promoButton: {
    borderWidth: 1,
    borderColor: "#FFD23F",
    borderRadius: 8,
    backgroundColor: "#202b4f",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  promoButtonDisabled: {
    opacity: 0.6,
  },
  promoButtonText: { color: "#FFF4BF", fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  promoFeedback: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promoFeedbackSuccess: {
    backgroundColor: "rgba(40, 167, 69, 0.16)",
    borderColor: "#39D98A",
    color: "#B7FFD2",
  },
  promoFeedbackError: {
    backgroundColor: "rgba(255, 79, 112, 0.14)",
    borderColor: "#FF6B8A",
    color: "#FFD1DC",
  },
  promoHistoryCard: {
    borderWidth: 1,
    borderColor: "#5f6aa0",
    borderRadius: 8,
    backgroundColor: "#10172d",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  promoHistoryTitle: { color: "#9fb2e6", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  promoHistoryText: { color: "#f4f7ff", fontSize: 12, fontWeight: "900" },
  promoHistorySub: { color: "#c6d1f3", fontSize: 11, fontWeight: "700", marginTop: 2 },
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
