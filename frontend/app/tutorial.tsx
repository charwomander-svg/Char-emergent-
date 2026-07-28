import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/src/game/constants";

interface TutorialSection {
  title: string;
  body: string;
}

const SECTIONS: TutorialSection[] = [
  {
    title: "CORE GOAL",
    body:
      "You control ghosts, not Pellet Guy.\n" +
      "• Catch Pellet Guy 3 times to clear a normal stage.\n" +
      "• If pellets hit zero first, you lose the stage.\n" +
      "• If your squad is wiped out (all ghosts dead at the same time), you lose the stage.\n" +
      "• In a stage, 20 total ghost deaths causes an auto-fail (or 25 if Second Wind is active in Endless).",
  },
  {
    title: "CONTROLS",
    body:
      "• Swipe: sets direction for armed ghosts.\n" +
      "• Keyboard movement: WASD or Arrow keys.\n" +
      "• Keyboard ghost controls: 1-4 selects a ghost, hold 1-4 to cycle that ghost's AI role.\n" +
      "• Keyboard power-ups: F1-F8 uses the matching power-up slot in your HUD.\n" +
      "• Puppet Master Mode: Ghost 1 uses WASD, Ghost 2 uses Y/G/H/J, Ghost 3 uses Arrow keys, Ghost 4 uses Numpad 8/4/2/6.\n" +
      "• Backspace: leave run (with confirmation).\n" +
      "• Tap-to-move: tap a walkable tile and your armed ghosts path toward that spot (enable in Settings → Controls).\n" +
      "• We recommend using a controller for the best experience, but swiping is still good.\n" +
      "• Unarmed ghosts and Pellet Guy use passive AI movement.\n" +
      "• Tap a ghost icon: arm/disarm that ghost.\n" +
      "• Selected ghost can be directed instantly where legal.\n" +
      "• Pausing and power-ups are available from the in-game HUD.",
  },
  {
    title: "PELLET GUY + POWER PELLETS",
    body:
      "• Pellet Guy eats pellets as he moves.\n" +
      "• Yellow power pellets make ghosts vulnerable for a short time.\n" +
      "• Vulnerable ghosts can be eaten by Pellet Guy.\n" +
      "• You can regain control through spacing, route cuts, and power-up timing.",
  },
  {
    title: "AI BEHAVIOR (QUICK GUIDE)",
    body:
      "• Pellet Guy AI scales by level: early levels are mostly random, then it increasingly avoids nearby ghosts and takes safer routes.\n" +
      "• At high levels, Pellet Guy has stronger awareness and becomes harder to predict/corner.\n" +
      "• Unarmed ghosts use hunt AI: they usually chase Pellet Guy, with some randomness so routes are less scripted.\n" +
      "• Ghost hunt aggression rises with level, so passive ghosts become better at pressure and cutoffs.\n" +
      "• Magnet effects can temporarily alter these priorities.\n" +
      "Ghost AI role options:\n" +
      "• FREE: looser movement and less direct pressure.\n" +
      "• HUNTER: direct chaser that prioritizes shortest pressure routes.\n" +
      "• AMBUSHER: attempts to predict Pellet Guy movement and cut off escape routes.\n" +
      "• PATROL: steadier lane control around spawn/nearby paths.\n" +
      "• SOCIAL: prefers to stay within 5 tiles of another ghost.\n" +
      "• CAUTIOUS: avoids danger zones and traps while still contesting space.\n" +
      "• COWARD: keeps distance and drifts toward safer corners.\n" +
      "• To switch AI roles, long press on the ghost you want to change.",
  },
  {
    title: "HAZARDS + TRAPS",
    body:
      "• Pellet Guy can leave hazards (spikes/barricades) as stages progress.\n" +
      "• Spikes kill ghosts on contact.\n" +
      "• Barricades block routes temporarily.\n" +
      "• Advanced teams can modify trap behavior (for example first-barricade skip or delayed spike arm).",
  },
  {
    title: "POWER-UPS + SHOP",
    body:
      "Power-ups are bought with Ghost Coins and can decide runs.\n" +
      "Examples: Speed Boost, Freeze, Magnet, Shield, Pellet Scatter.\n" +
      "• Hardcore revive token only works in Hardcore conditions.",
  },
  {
    title: "STARS + LEVEL PROGRESSION",
    body:
      "Each level tracks stars and rewards cleaner clears.\n" +
      "• Better pellet control and fewer mistakes = stronger star outcomes.\n" +
      "• Gold stars and catches feed progression systems and unlock pacing.",
  },
  {
    title: "BONUS STAGES",
    body:
      "Every 5th level is a bonus game.\n" +
      "• Rally Round, Cherry Chase, Time Attack, and Power Hunt can rotate.\n" +
      "• Bonus stages are scored differently from standard catches.\n" +
      "• Perfect bonus clears feed mission/stat progression.",
  },
  {
    title: "GAME MODES",
    body:
      "• Classic: normal campaign progression.\n" +
      "• Speedrun: fastest clears matter most.\n" +
      "• Time Attack: fixed timer pressure.\n" +
      "• Hardcore: no normal respawn safety.\n" +
      "• Endless: roguelite scaling, blessing choices, and long-run economy.",
  },
  {
    title: "ENDLESS MODE DETAILS",
    body:
      "• Milestone blessing pick every 5 levels.\n" +
      "• Blessings include hunter scoring, Pellet Guy slow, ghost speed-up, second wind, rare continue discount, and super-rare 2-catch clears.\n" +
      "• Continue cost scales per run; blessings can alter that cost.\n" +
      "• Endless rewards long-term routing and coin management.",
  },
  {
    title: "TEAMS + PASSIVES",
    body:
      "Unlock teams through level/catch milestones.\n" +
      "Passives change strategy (examples):\n" +
      "• Jackpot Crew: chance to double clear coins.\n" +
      "• Golden Girls: chance for faster Pellet Guy respawn pacing.\n" +
      "• Marathon Squad: small per-ghost-move chance to drop pellets on empty tiles.",
  },
  {
    title: "MISSIONS + LEADERBOARDS + STATS",
    body:
      "• Daily missions grant extra Ghost Coins.\n" +
      "• Leaderboards track major modes and lifetime totals.\n" +
      "• Statistics gives run analytics (catches, clears, combos, bests, mode-specific records).\n" +
      "• Hidden medals on run-end: 🧨 Mine Sweeper (no spike triggers), 👻 Untouchable (0 ghost losses), ⚡ Speed Haunt (quick clear), 🎯 Efficient Evil (catches without power-ups), 💀 Last Stand (win on final life).",
  },
  {
    title: "RUN IMPROVEMENT TIPS",
    body:
      "• Spread ghosts to cut escape lanes, then converge.\n" +
      "• Save key power-ups for unstable board states.\n" +
      "• Respect hazard choke points before committing a route.\n" +
      "• In Endless, pick blessings that match your run economy and risk profile.",
  },
];

export default function TutorialScreen() {
  const router = useRouter();

  const playTutorialLevel = () => {
    router.push("/game?mode=custom&level=1");
  };

  return (
    <SafeAreaView style={styles.container} testID="tutorial-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="tutorial-back-btn">
          <Text style={styles.backBtnText}>← BACK</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.title}>TUTORIAL</Text>
          <Text style={styles.subtitle}>Complete guide to modes, systems, and progression</Text>
        </View>

        <TouchableOpacity style={styles.playTutorialBtn} onPress={playTutorialLevel} testID="play-tutorial-btn">
          <Text style={styles.playTutorialBtnText}>▶ PLAY TUTORIAL LEVEL</Text>
          <Text style={styles.playTutorialBtnSubtext}>Practice on Level 1 without affecting your progress</Text>
        </TouchableOpacity>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.uiBg },
  content: { padding: 16, gap: 10 },
  backBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#4f5f93",
    borderRadius: 8,
    backgroundColor: "#101a33",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  backBtnText: { color: "#dce8ff", fontWeight: "800", letterSpacing: 1 },
  headerCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#67e8f9",
    backgroundColor: "#0f1a2d",
    padding: 12,
    gap: 4,
  },
  title: { color: "#FFFF00", fontSize: 22, fontWeight: "900", letterSpacing: 2.5 },
  subtitle: { color: "#b9d3ff", fontSize: 12, fontWeight: "700" },
  playTutorialBtn: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#9CFF57",
    backgroundColor: "#1a2d14",
    padding: 14,
    gap: 4,
    alignItems: "center",
  },
  playTutorialBtnText: {
    color: "#9CFF57",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  playTutorialBtnSubtext: {
    color: "#b9d3ff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#445b8d",
    backgroundColor: "#121c36",
    padding: 12,
    gap: 6,
  },
  cardTitle: { color: "#7fe8ff", fontWeight: "900", fontSize: 13, letterSpacing: 1.2 },
  cardBody: { color: "#edf3ff", fontSize: 12, lineHeight: 18 },
});
