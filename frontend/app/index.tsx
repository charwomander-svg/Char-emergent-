import React from "react";
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

export default function MainMenu() {
  const router = useRouter();

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

        <Text style={styles.subtitle}>Reverse Pac-Man Chase</Text>

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
});
