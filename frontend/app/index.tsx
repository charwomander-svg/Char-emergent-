import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { getSoundEngine } from "@/src/game/sounds";
import { fetchDailySeed } from "@/src/game/api";
import { useEconomy } from "@/src/game/useEconomy";

export default function MainMenu() {
  const router = useRouter();
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const { coins } = useEconomy();

  useEffect(() => {
    fetchDailySeed()
      .then((s) => setDailyDate(s.seed_date))
      .catch(() => setDailyDate(null));
  }, []);

  const startDaily = async () => {
    getSoundEngine().uiClick();
    try {
      const seed = await fetchDailySeed();
      router.push(`/game?mode=daily&seed=${seed.seed}&seedDate=${seed.seed_date}`);
    } catch {
      // fall back to classic if backend offline
      router.push("/game");
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="main-menu">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.titleShadow}>GHOST</Text>
          <Text style={styles.title}>GHOST</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.titleShadow, { color: "#FF00FF" }]}>MAZE</Text>
          <Text style={[styles.title, { color: "#FFFF00" }]}>MAZE</Text>
        </View>

        <Text style={styles.subtitle}>Reverse Maze Chase</Text>

        {/* Ghost preview row */}
        <View style={styles.ghostRow} testID="ghost-preview-row">
          {COLORS.ghosts.map((c, i) => (
            <View key={i} style={styles.ghostPreviewWrap}>
              <View style={[styles.ghostPreview, { backgroundColor: c }]}>
                <View style={styles.ghostEye} />
                <View style={[styles.ghostEye, { right: 4, left: undefined }]} />
              </View>
              <Text style={styles.ghostName}>{COLORS.ghostNames[i]}</Text>
            </View>
          ))}
        </View>

        {/* Pellet Guy preview */}
        <View style={styles.targetWrap}>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.pelletGuyPreview} />
          <Text style={styles.targetLabel}>PELLET GUY</Text>
        </View>

        {/* Coin balance */}
        <View style={styles.coinBadgeTop} testID="menu-coin-balance">
          <Text style={styles.coinBadgeText}>🪙 {coins}</Text>
          <Text style={styles.coinBadgeLabel}>GHOST COINS</Text>
        </View>

        {/* Play Button */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/game");
          }}
          testID="play-btn"
        >
          <Text style={styles.playBtnText}>▶ START GAME</Text>
        </TouchableOpacity>

        {/* Levels Button */}
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

        {/* Shop Button */}
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

        {/* Characters Button */}
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

        {/* Daily Challenge */}
        <TouchableOpacity
          style={styles.dailyBtn}
          onPress={startDaily}
          testID="daily-btn"
        >
          <Text style={styles.dailyBtnText}>📅 DAILY CHALLENGE</Text>
          {dailyDate && <Text style={styles.dailyDate}>{dailyDate}</Text>}
        </TouchableOpacity>

        {/* Leaderboard */}
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

        {/* Settings */}
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

        <TouchableOpacity
          style={[styles.charactersBtn, { borderColor: "#8ec5ff" }]}
          onPress={() => {
            getSoundEngine().uiClick();
            router.push("/collection");
          }}
          testID="collection-btn"
        >
          <Text style={[styles.charactersBtnText, { color: "#8ec5ff" }]}>
            🃏 CARD COLLECTION BLUEPRINT
          </Text>
        </TouchableOpacity>

        {/* How to play */}
        <View style={styles.howToWrap}>
          <Text style={styles.howToTitle}>HOW TO PLAY</Text>
          <Text style={styles.howToText}>
            • Control ALL 4 ghosts to corner Pellet Guy{"\n"}
            • Tap a ghost&apos;s D-pad to set its direction{"\n"}
            • Ghosts keep moving until you change direction{"\n"}
            • Catch Pellet Guy 3 times to win the level{"\n"}
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
    marginBottom: 24,
  },
  ghostRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 16,
  },
  ghostPreviewWrap: {
    alignItems: "center",
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
    marginTop: 28,
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
