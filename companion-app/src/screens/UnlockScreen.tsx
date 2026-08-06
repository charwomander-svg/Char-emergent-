import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { checkAdmin } from "../api";
import { Card, Field, FieldLabel, PrimaryButton, StatusText } from "../components/ui";
import { saveSettings } from "../storage";
import { colors } from "../theme";
import type { CompanionSettings } from "../types";

type Props = {
  initial: CompanionSettings;
  onUnlocked: (settings: CompanionSettings) => void;
};

export function UnlockScreen({ initial, onUnlocked }: Props) {
  const [apiBase, setApiBase] = useState(initial.apiBase);
  const [adminKey, setAdminKey] = useState(initial.adminKey);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "">("");

  const unlock = async () => {
    const settings: CompanionSettings = {
      apiBase: apiBase.trim().replace(/\/+$/, ""),
      adminKey: adminKey.trim(),
    };
    if (!settings.apiBase) {
      setStatus("Backend URL is required.");
      setStatusKind("err");
      return;
    }
    if (!settings.adminKey) {
      setStatus("Admin key is required.");
      setStatusKind("err");
      return;
    }
    setBusy(true);
    setStatus("Checking admin key…");
    setStatusKind("");
    try {
      await checkAdmin(settings.apiBase, settings.adminKey);
      await saveSettings(settings);
      setStatus("Unlocked.");
      setStatusKind("ok");
      onUnlocked(settings);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
      setStatusKind("err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ghost Maze Companion</Text>
        <Text style={styles.sub}>
          Android admin app for news and promo/mail codes. Plain text fields only — no JSON.
        </Text>

        <Card>
          <Text style={styles.hint}>
            Use the same backend URL as the game API and the ADMIN_API_KEY from the server env.
          </Text>
          <FieldLabel>Backend URL</FieldLabel>
          <Field
            value={apiBase}
            onChangeText={setApiBase}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://ghost-maze-backend.onrender.com"
          />
          <FieldLabel>Admin key</FieldLabel>
          <Field
            value={adminKey}
            onChangeText={setAdminKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="paste admin key"
          />
          <View style={styles.actions}>
            <PrimaryButton title={busy ? "Unlocking…" : "Unlock"} onPress={unlock} disabled={busy} />
          </View>
          <StatusText message={status} kind={statusKind} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: 16,
    paddingTop: 28,
    paddingBottom: 40,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  sub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  actions: {
    marginTop: 14,
  },
});
