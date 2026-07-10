import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_NOVEL_SETTINGS,
  NOVEL_TITLE,
  NOVEL_VERSION,
  SCRIPT,
  SPEAKERS,
  TEXT_SPEED_LABELS,
  TEXT_SPEED_MS,
} from "./index";
import type {
  NovelSettings,
  ScriptNode,
  TextSpeed,
} from "./types";

const STORAGE_KEY = "novel_settings_v1";
const PROGRESS_KEY = "novel_progress_v1";

const { width: SW } = Dimensions.get("window");

// ─── helpers ────────────────────────────────────────────────────────────────

async function loadNovelSettings(): Promise<NovelSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_NOVEL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return DEFAULT_NOVEL_SETTINGS;
}

async function saveNovelSettings(s: NovelSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

async function loadProgress(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (raw) return parseInt(raw, 10) || 0;
  } catch {
    // fall through
  }
  return 0;
}

async function saveProgress(idx: number) {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, String(idx));
  } catch {
    // ignore
  }
}

// ─── Settings panel ─────────────────────────────────────────────────────────

interface SettingsPanelProps {
  settings: NovelSettings;
  onChange: (s: NovelSettings) => void;
  onClose: () => void;
  onSkipToEnd: () => void;
}

const SPEEDS: TextSpeed[] = ["slow", "normal", "fast", "instant"];

function SettingsPanel({ settings, onChange, onClose, onSkipToEnd }: SettingsPanelProps) {
  const update = (patch: Partial<NovelSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
    saveNovelSettings(next);
  };

  return (
    <View style={sp.overlay}>
      <View style={sp.panel}>
        <Text style={sp.title}>SETTINGS</Text>
        <Text style={sp.subtitle}>(All settings are advisory. The story does what it wants.)</Text>

        {/* Text Speed */}
        <Text style={sp.label}>TEXT SPEED</Text>
        <View style={sp.row}>
          {SPEEDS.map((spd) => (
            <TouchableOpacity
              key={spd}
              style={[sp.speedBtn, settings.textSpeed === spd && sp.speedBtnActive]}
              onPress={() => update({ textSpeed: spd })}
            >
              <Text
                style={[sp.speedLabel, settings.textSpeed === spd && sp.speedLabelActive]}
                numberOfLines={2}
              >
                {TEXT_SPEED_LABELS[spd]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Auto Advance */}
        <View style={sp.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={sp.toggleLabel}>Auto-Advance</Text>
            <Text style={sp.toggleDesc}>Advances after 3 seconds. Removes all interactivity. You asked for this.</Text>
          </View>
          <Switch
            value={settings.autoAdvance}
            onValueChange={(v) => update({ autoAdvance: v })}
            trackColor={{ false: "#222244", true: "#BD93F9" }}
            thumbColor="#fff"
          />
        </View>

        {/* Skip Seen */}
        <View style={sp.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={sp.toggleLabel}>Skip Previously Read Text</Text>
            <Text style={sp.toggleDesc}>
              Tap the screen to zip through scenes you've already read. A completely reasonable feature.
            </Text>
          </View>
          <Switch
            value={settings.skipSeen}
            onValueChange={(v) => update({ skipSeen: v })}
            trackColor={{ false: "#222244", true: "#BD93F9" }}
            thumbColor="#fff"
          />
        </View>

        {/* Skip to End */}
        <TouchableOpacity style={sp.skipBtn} onPress={onSkipToEnd}>
          <Text style={sp.skipBtnText}>⏭  SKIP TO ENDING</Text>
          <Text style={sp.skipBtnSub}>Shows the credits immediately. Skips everything. You have places to be.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sp.closeBtn} onPress={onClose}>
          <Text style={sp.closeBtnText}>CLOSE SETTINGS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  panel: {
    width: Math.min(SW - 32, 500),
    backgroundColor: "#11113a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: "#BD93F9",
  },
  title: {
    color: "#BD93F9",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#6666aa",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  speedBtn: {
    flex: 1,
    minWidth: 70,
    backgroundColor: "#1a1a4a",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#333366",
    alignItems: "center",
  },
  speedBtnActive: {
    backgroundColor: "#2a1a5a",
    borderColor: "#BD93F9",
  },
  speedLabel: {
    color: "#888899",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },
  speedLabelActive: {
    color: "#BD93F9",
    fontWeight: "bold",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a4a",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333366",
  },
  toggleLabel: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  toggleDesc: { color: "#777799", fontSize: 10, marginTop: 3 },
  skipBtn: {
    backgroundColor: "#2a0a1a",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FF5555",
    alignItems: "center",
  },
  skipBtnText: { color: "#FF5555", fontWeight: "bold", fontSize: 13 },
  skipBtnSub: { color: "#773333", fontSize: 10, marginTop: 4, textAlign: "center" },
  closeBtn: {
    backgroundColor: "#1a1a4a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BD93F9",
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: { color: "#BD93F9", fontWeight: "bold", fontSize: 14, letterSpacing: 1 },
});

// ─── Scene transition ────────────────────────────────────────────────────────

function SceneCard({ node, onNext }: { node: Extract<ScriptNode, { type: "scene" }>; onNext: () => void }) {
  return (
    <TouchableOpacity
      style={[sc.container, { backgroundColor: node.bg }]}
      onPress={onNext}
      activeOpacity={0.9}
    >
      <View style={sc.card}>
        <Text style={sc.label}>{node.label}</Text>
        <Text style={sc.hint}>Tap to continue</Text>
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    maxWidth: 500,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 16,
  },
  hint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    letterSpacing: 1,
  },
});

// ─── Dialog node ────────────────────────────────────────────────────────────

interface DialogViewProps {
  node: Extract<ScriptNode, { type: "dialog" }>;
  settings: NovelSettings;
  isNewNode: boolean;
  onComplete: () => void; // called when text is fully revealed
}

function DialogView({ node, settings, isNewNode, onComplete }: DialogViewProps) {
  const speaker = SPEAKERS[node.speaker];
  const isNarrator = node.speaker === "narrator";
  const isSystem = node.speaker === "system";
  const fullText = node.text;

  const [displayed, setDisplayed] = useState(
    settings.textSpeed === "instant" ? fullText : ""
  );
  const [done, setDone] = useState(settings.textSpeed === "instant");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIdx = useRef(0);

  useEffect(() => {
    if (!isNewNode) {
      setDisplayed(fullText);
      setDone(true);
      return;
    }
    if (settings.textSpeed === "instant") {
      setDisplayed(fullText);
      setDone(true);
      onComplete();
      return;
    }
    setDisplayed("");
    setDone(false);
    charIdx.current = 0;

    const delay = TEXT_SPEED_MS[settings.textSpeed];
    intervalRef.current = setInterval(() => {
      charIdx.current += 1;
      const slice = fullText.slice(0, charIdx.current);
      setDisplayed(slice);
      if (charIdx.current >= fullText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDone(true);
        onComplete();
      }
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, settings.textSpeed]);

  // Tap to finish typing immediately
  const finishNow = () => {
    if (!done) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayed(fullText);
      setDone(true);
      onComplete();
    }
  };

  return (
    <View style={dv.wrapper} onStartShouldSetResponder={() => true} onResponderRelease={finishNow}>
      {!isNarrator && !isSystem && (
        <View style={[dv.nameBox, { borderLeftColor: speaker.color }]}>
          <Text style={[dv.nameText, { color: speaker.color }]}>{speaker.name}</Text>
          {speaker.subtitle && <Text style={dv.subtitle}>{speaker.subtitle}</Text>}
        </View>
      )}
      <View
        style={[
          dv.textBox,
          isNarrator && dv.narratorBox,
          isSystem && dv.systemBox,
        ]}
      >
        <Text
          style={[
            dv.text,
            isNarrator && dv.narratorText,
            isSystem && dv.systemText,
          ]}
        >
          {displayed}
          {!done && <Text style={dv.cursor}>▋</Text>}
        </Text>
        {done && (
          <Text style={dv.nextHint}>▼ tap to continue</Text>
        )}
      </View>
    </View>
  );
}

const dv = StyleSheet.create({
  wrapper: { width: "100%" },
  nameBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 4,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  nameText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: {
    color: "#555577",
    fontSize: 10,
    fontStyle: "italic",
  },
  textBox: {
    backgroundColor: "rgba(10,10,30,0.92)",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  narratorBox: {
    backgroundColor: "rgba(5,5,20,0.85)",
    borderColor: "rgba(255,255,255,0.04)",
  },
  systemBox: {
    backgroundColor: "rgba(20,0,0,0.9)",
    borderColor: "rgba(255,85,85,0.2)",
  },
  text: {
    color: "#E8E8FF",
    fontSize: 16,
    lineHeight: 26,
  },
  narratorText: {
    color: "#AAAACC",
    fontStyle: "italic",
    fontSize: 15,
  },
  systemText: {
    color: "#FF9999",
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  cursor: {
    color: "#BD93F9",
    opacity: 0.7,
  },
  nextHint: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 10,
    textAlign: "right",
    marginTop: 8,
    letterSpacing: 1,
  },
});

// ─── Choice node ─────────────────────────────────────────────────────────────

interface ChoiceViewProps {
  node: Extract<ScriptNode, { type: "choice" }>;
  onPick: (idx: number) => void;
}

function ChoiceView({ node, onPick }: ChoiceViewProps) {
  return (
    <View style={cv.wrapper}>
      <Text style={cv.prompt}>{node.prompt}</Text>
      <Text style={cv.note}>(Choose carefully. Or don't. It's fine either way.)</Text>
      {node.options.map((opt, i) => (
        <TouchableOpacity key={i} style={cv.btn} onPress={() => onPick(i)} activeOpacity={0.75}>
          <Text style={cv.btnText}>{opt.text}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const cv = StyleSheet.create({
  wrapper: { width: "100%", gap: 10 },
  prompt: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
    textAlign: "center",
    fontWeight: "600",
  },
  note: {
    color: "#555577",
    fontSize: 10,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "rgba(189,147,249,0.12)",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(189,147,249,0.3)",
  },
  btnText: {
    color: "#BD93F9",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
});

// ─── Choice Reaction ─────────────────────────────────────────────────────────

function ReactionView({
  text,
  onDone,
}: {
  text: string;
  onDone: () => void;
}) {
  return (
    <View style={rv.wrapper}>
      <View style={rv.box}>
        <Text style={rv.text}>{text}</Text>
        <TouchableOpacity style={rv.btn} onPress={onDone}>
          <Text style={rv.btnText}>Continue →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rv = StyleSheet.create({
  wrapper: { width: "100%" },
  box: {
    backgroundColor: "rgba(10,10,30,0.92)",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(189,147,249,0.2)",
    gap: 12,
  },
  text: {
    color: "#AAAACC",
    fontStyle: "italic",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  btn: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(189,147,249,0.15)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(189,147,249,0.3)",
  },
  btnText: { color: "#BD93F9", fontWeight: "bold", fontSize: 13 },
});

// ─── End screen ──────────────────────────────────────────────────────────────

function EndScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <View style={es.container}>
      <Text style={es.title}>{NOVEL_TITLE}</Text>
      <Text style={es.sub}>You reached the only ending.{"\n"}There was never going to be more than one.</Text>
      <Text style={es.version}>{NOVEL_VERSION}</Text>
      <TouchableOpacity style={es.btn} onPress={onRestart}>
        <Text style={es.btnText}>↩  PLAY FROM THE BEGINNING</Text>
      </TouchableOpacity>
      <Text style={es.footnote}>
        (The choices still won't matter the second time. But maybe you'll enjoy the journey.)
      </Text>
    </View>
  );
}

const es = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    color: "#BD93F9",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 20,
  },
  sub: {
    color: "#AAAACC",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    fontStyle: "italic",
    marginBottom: 24,
  },
  version: {
    color: "#333355",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: "rgba(189,147,249,0.15)",
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#BD93F9",
    marginBottom: 16,
  },
  btnText: {
    color: "#BD93F9",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  footnote: {
    color: "#333355",
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 300,
  },
});

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(current / Math.max(total - 1, 1), 1);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct * 100}%` as `${number}%` }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  fill: {
    height: 2,
    backgroundColor: "#BD93F9",
    opacity: 0.5,
  },
});

// ─── Main Engine ─────────────────────────────────────────────────────────────

type EngineState =
  | { phase: "dialog"; nodeIndex: number; isNew: boolean; textDone: boolean }
  | { phase: "scene"; nodeIndex: number }
  | { phase: "choice"; nodeIndex: number }
  | { phase: "reaction"; reaction: string; nextIndex: number }
  | { phase: "end" };

export default function NovelEngine({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<NovelSettings>(DEFAULT_NOVEL_SETTINGS);
  const [state, setState] = useState<EngineState>({ phase: "scene", nodeIndex: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [seenNodes, setSeenNodes] = useState<Set<number>>(new Set());
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings and progress on mount
  useEffect(() => {
    let mounted = true;
    Promise.all([loadNovelSettings(), loadProgress()]).then(([s, savedIdx]) => {
      if (!mounted) return;
      setSettings(s);
      resolveIndex(savedIdx);
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveIndex = (idx: number) => {
    const node = SCRIPT[idx];
    if (!node) {
      setState({ phase: "end" });
      return;
    }
    if (node.type === "end") {
      setState({ phase: "end" });
    } else if (node.type === "scene") {
      setState({ phase: "scene", nodeIndex: idx });
    } else if (node.type === "dialog") {
      setState({ phase: "dialog", nodeIndex: idx, isNew: true, textDone: false });
    } else if (node.type === "choice") {
      setState({ phase: "choice", nodeIndex: idx });
    }
  };

  const advanceTo = useCallback((idx: number) => {
    saveProgress(idx);
    resolveIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (!settings.autoAdvance) return;
    if (state.phase !== "dialog") return;
    if (!state.textDone) return;

    autoAdvanceTimer.current = setTimeout(() => {
      if (state.phase === "dialog") {
        advanceTo(state.nodeIndex + 1);
      }
    }, 3000);

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [settings.autoAdvance, state, advanceTo]);

  // Skip seen text
  useEffect(() => {
    if (!settings.skipSeen) return;
    if (state.phase !== "dialog") return;
    if (seenNodes.has(state.nodeIndex)) {
      advanceTo(state.nodeIndex + 1);
    }
  }, [settings.skipSeen, state, seenNodes, advanceTo]);

  const handleDialogTap = () => {
    if (state.phase !== "dialog") return;
    if (!state.textDone) {
      // Text not done: snap to full — DialogView handles this via its own tap
      return;
    }
    // Text done: mark seen and advance
    setSeenNodes((prev) => new Set(prev).add(state.nodeIndex));
    advanceTo(state.nodeIndex + 1);
  };

  const handleTextComplete = () => {
    if (state.phase !== "dialog") return;
    setState((prev) =>
      prev.phase === "dialog" ? { ...prev, textDone: true } : prev
    );
  };

  const handleChoice = (optionIdx: number) => {
    if (state.phase !== "choice") return;
    const node = SCRIPT[state.nodeIndex];
    if (node.type !== "choice") return;
    const opt = node.options[optionIdx];
    setState({
      phase: "reaction",
      reaction: opt.reaction,
      nextIndex: state.nodeIndex + 1,
    });
  };

  const handleReactionDone = () => {
    if (state.phase !== "reaction") return;
    advanceTo(state.nextIndex);
  };

  const handleSkipToEnd = () => {
    setShowSettings(false);
    // Find the "end" node or credits scene
    const endIdx = SCRIPT.findIndex((n) => n.type === "end");
    const creditsScene = SCRIPT.findIndex(
      (n) => n.type === "scene" && (n as Extract<typeof n, { type: "scene" }>).label === "— THE END —"
    );
    advanceTo(creditsScene >= 0 ? creditsScene : endIdx >= 0 ? endIdx : SCRIPT.length - 1);
  };

  const handleRestart = () => {
    saveProgress(0);
    setSeenNodes(new Set());
    resolveIndex(0);
  };

  // Determine background color
  const getBg = (): string => {
    let startIdx = 0;
    if (state.phase === "scene" || state.phase === "dialog" || state.phase === "choice") {
      startIdx = state.nodeIndex;
    } else if (state.phase === "reaction") {
      startIdx = state.nextIndex - 1;
    }
    let i = startIdx;
    while (i >= 0) {
      const n = SCRIPT[i];
      if (n?.type === "scene") return (n as Extract<ScriptNode, { type: "scene" }>).bg;
      i--;
    }
    return "#0d0d1f";
  };

  if (state.phase === "end") {
    return <EndScreen onRestart={handleRestart} />;
  }

  const currentNode = state.phase !== "reaction" ? SCRIPT[state.nodeIndex] : null;

  return (
    <View style={[eng.container, { backgroundColor: getBg() }]}>
      {/* Top bar */}
      <View style={eng.topBar}>
        <TouchableOpacity onPress={onExit} style={eng.topBtn}>
          <Text style={eng.topBtnText}>← EXIT</Text>
        </TouchableOpacity>
        <Text style={eng.topTitle} numberOfLines={1}>{NOVEL_TITLE}</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={eng.topBtn}>
          <Text style={eng.topBtnText}>⚙ SETTINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <ProgressBar current={state.phase !== "reaction" ? state.nodeIndex : 0} total={SCRIPT.length} />

      {/* Main content area */}
      <TouchableOpacity
        style={eng.stageArea}
        activeOpacity={1}
        onPress={state.phase === "dialog" ? handleDialogTap : undefined}
      >
        {/* Scene transition */}
        {state.phase === "scene" && currentNode?.type === "scene" && (
          <SceneCard node={currentNode} onNext={() => advanceTo(state.nodeIndex + 1)} />
        )}
      </TouchableOpacity>

      {/* Dialog / choice at bottom */}
      {(state.phase === "dialog" || state.phase === "choice" || state.phase === "reaction") && (
        <View style={eng.dialogArea}>
          {state.phase === "dialog" && currentNode?.type === "dialog" && (
            <DialogView
              node={currentNode}
              settings={settings}
              isNewNode={state.isNew}
              onComplete={handleTextComplete}
            />
          )}
          {state.phase === "choice" && currentNode?.type === "choice" && (
            <ChoiceView node={currentNode} onPick={handleChoice} />
          )}
          {state.phase === "reaction" && (
            <ReactionView text={state.reaction} onDone={handleReactionDone} />
          )}
        </View>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          onSkipToEnd={handleSkipToEnd}
        />
      )}
    </View>
  );
}

const eng = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  topBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topBtnText: {
    color: "#BD93F9",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  topTitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    letterSpacing: 2,
    flex: 1,
    textAlign: "center",
  },
  stageArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogArea: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});
