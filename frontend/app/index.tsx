import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";
import type { GhostId } from "@/src/game/types";
import { getSoundEngine } from "@/src/game/sounds";
import { fetchDailySeed } from "@/src/game/api";
import { useEconomy } from "@/src/game/useEconomy";
import { loadSettings } from "@/src/game/settings";

const SPLASH_MS = 1800;
const GHOST_IDS = [0, 1, 2, 3] as GhostId[];

function buildGameUrl(path: string, ghosts: readonly number[]) {
  const selected = ghosts.length ? ghosts : [0];
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}ghosts=${selected.join(",")}`;
}

export default function MainMenu() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [armedGhosts, setArmedGhosts] = useState<GhostId[]>([0]);
  const { coins } = useEconomy();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchDailySeed()
      .then((s) => setDailyDate(s.seed_date))
      .catch(() => setDailyDate(null));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((s) => {
      if (!mounted) return;
      if (s.soundOn && s.musicOn) getSoundEngine().startMusic();
    });
    return () => {
      mounted = false;
      getSoundEngine().stopMusic();
    };
  }, []);

  const selectedGhosts = useMemo(
    () => (armedGhosts.length ? armedGhosts : [0]),
    [armedGhosts],
  );

  const toggleGhost = (id: GhostId) => {
    setArmedGhosts((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const startDaily = async () => {
    getSoundEngine().uiClick();
    try {
      const seed = await fetchDailySeed();
      router.push(
        buildGameUrl(
          `/game?mode=daily&seed=${seed.seed}&seedDate=${seed.seed_date}`,
          selectedGhosts,
        ),
      );
    } catch {
      router.push(buildGameUrl("/game", selectedGhosts));
    }
  };

  if (showSplash) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <Image
            source={require("../assets/images/company-logo.png")}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="main-menu">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleWrap}>
          <Text style={styles.titleShadow}>GHOST</Text>
          <Text style={styles.title}>GHOST</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.titleShadow, { color: "#FF00FF" }]}>MAZE</Text>
          <Text style={[styles.title, { color: "#FFFF00" }]}>MAZE</Text>
        </View>

        <Text style={styles.subtitle}>Reverse Maze Chase</Text>

        <View style={styles.ghostControlsWrap}>
          <Text style={styles.ghostControlsTitle}>GHOST TOGGLES</Text>
          <View style={styles.ghostRow} testID="ghost-toggle-row">
            {GHOST_IDS.map((id) => {
              const active = selectedGhosts.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => {
                    getSoundEngine().uiClick();
                    toggleGhost(id);
                  }}
                  style={[styles.ghostToggle, active && styles.ghostToggleActive]}
                  testID={`menu-ghost-toggle-${id}`}
                >
                  <View style={[styles.ghostPreview, { backgroundColor: COLORS.ghosts[id] }]}>
                    <View style={styles.ghostEye} />
                    <View style={[styles.ghostEye, { right: 4, left: undefined }]} />
                  </View>
                  <Text style={styles.ghostName}>{COLORS.ghostNames[id]}</Text>
                  <Text style={styles.ghostState}>{active ? "ON" : "OFF"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.targetWrap}>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.pelletGuyPreview} />
          <Text style={styles.targetLabel}>PELLET GUY</Text>
        </View>

        <View style={styles.coinBadgeTop} testID="menu-coin-balance">
          <Text style={styles.coinBadgeText}>🪙 {coins}</Text>
          <Text style={styles.coinBadgeLabel}>GHOST COINS</Text>
        </View>

        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push(buildGameUrl("/game", selectedGhosts));
          }}
          testID="play-btn"
        >
          <Text style={styles.playBtnText}>▶ START GAME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charactersBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/levels");
          }}
          testID="levels-btn"
        >
          <Text style={styles.charactersBtnText}>🎯 LEVEL SELECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.charactersBtn, { borderColor: "#FFD23F" }]}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/shop");
          }}
          testID="shop-btn"
        >
          <Text style={[styles.charactersBtnText, { color: "#FFD23F" }]}>
            🛒 SHOP & POWER-UPS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charactersBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/characters");
          }}
          testID="characters-btn"
        >
          <Text style={styles.charactersBtnText}>👻 CHARACTERS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dailyBtn}
          onPress={startDaily}
          testID="daily-btn"
        >
          <Text style={styles.dailyBtnText}>📅 DAILY CHALLENGE</Text>
          {dailyDate && <Text style={styles.dailyDate}>{dailyDate}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dailyBtn, { borderColor: "#7FE8FF" }]}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push(buildGameUrl("/game?mode=speedrun", selectedGhosts));
          }}
          testID="speedrun-btn"
        >
          <Text style={[styles.dailyBtnText, { color: "#7FE8FF" }]}>⏱ SPEEDRUN MODE</Text>
          <Text style={styles.dailyDate}>Best time wins • Ascending leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charactersBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/leaderboard");
          }}
          testID="leaderboard-btn"
        >
          <Text style={styles.charactersBtnText}>🏆 LEADERBOARD</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.charactersBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/settings");
          }}
          testID="settings-btn"
        >
          <Text style={styles.charactersBtnText}>⚙️ SETTINGS</Text>
        </TouchableOpacity>

        <View style={styles.howToWrap}>
          <Text style={styles.howToTitle}>HOW TO PLAY</Text>
          <Text style={styles.howToText}>
            • Control ALL 4 ghosts to corner Pellet Guy{"\n"}
            • Tap a ghost&apos;s D-pad to set its direction{"\n"}
            • Ghosts keep moving until you change direction{"\n"}
            • Use the ghost toggles to choose your starting squad{"\n"}
            • Catch Pellet Guy 3 times to win the level{"\n"}
            • In SPEEDRUN, survive deeper levels with the fastest run time{"\n"}
            • Multi-ghost catches = combo bonus points{"\n"}
            • Don&apos;t let him eat all pellets or all ghosts!{"\n"}
            • Watch out for super pellets — he&apos;ll eat you!
          </Text>
        </View>

        <Text style={styles.footer}>v1.0 · MVP</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  splashContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  splashLogo: {
    width: "100%",
    height: 360,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.uiBg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  titleWrap: {
    position: "relative",
    alignItems: "center",
  },
  title: {
    fontSize: 56,
    fontWeight: "900",
    color: "#FF0000",
    letterSpacing: 4,
    textAlign: "center",
  },
  titleShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    fontSize: 56,
    fontWeight: "900",
    color: "#00FFFF",
    letterSpacing: 4,
    opacity: 0.7,
  },
  subtitle: {
    color: "#FFB897",
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 18,
  },
  ghostControlsWrap: {
    width: "100%",
    alignItems: "center",
    marginVertical: 8,
  },
  ghostControlsTitle: {
    color: "#7FE8FF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  ghostRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    width: "100%",
  },
  ghostToggle: {
    width: 74,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333355",
    backgroundColor: "#1a1a2a",
  },
  ghostToggleActive: {
    borderColor: "#8ea7ff",
    backgroundColor: "#272743",
  },
  ghostPreview: {
    width: 44,
    height: 44,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    position: "relative",
    justifyContent: "center",
  },
  ghostEye: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    top: 12,
    left: 4,
  },
  ghostName: {
    color: "#FFFFFF",
    fontSize: 10,
    marginTop: 6,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  ghostState: {
    color: "#FFB897",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "900",
    letterSpacing: 1,
  },
  targetWrap: {
    alignItems: "center",
    marginVertical: 16,
  },
  vsText: {
    color: "#FF00FF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 8,
  },
  pelletGuyPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.pelletGuy,
  },
  targetLabel: {
    color: COLORS.pelletGuy,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  playBtn: {
    marginTop: 24,
    backgroundColor: "#FFFF00",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#FF0000",
  },
  playBtnText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 2,
  },
  charactersBtn: {
    marginTop: 14,
    backgroundColor: COLORS.uiPanel,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFF00",
  },
  charactersBtnText: {
    color: "#FFFF00",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  dailyBtn: {
    marginTop: 14,
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FF00FF",
    alignItems: "center",
  },
  dailyBtnText: {
    color: "#FF00FF",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  dailyDate: {
    color: "#FFB897",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 1,
  },
  howToWrap: {
    marginTop: 32,
    width: "100%",
    padding: 16,
    backgroundColor: COLORS.uiPanel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.uiBorder,
  },
  howToTitle: {
    color: "#FFFF00",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: "center",
  },
  howToText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    color: "#444466",
    fontSize: 11,
    marginTop: 24,
    letterSpacing: 1,
  },
  coinBadgeTop: {
    marginTop: 16,
    backgroundColor: "#1f1f3a",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#FFD23F",
    alignItems: "center",
  },
  coinBadgeText: {
    color: "#FFD23F",
    fontWeight: "900",
    fontSize: 22,
    letterSpacing: 1,
  },
  coinBadgeLabel: {
    color: "#FFB897",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "bold",
    marginTop: 2,
  },
});
