import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors } from "../theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.input, props.multiline && styles.multiline, props.style]}
    />
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  danger,
  secondary,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
        (disabled || pressed) && { opacity: disabled ? 0.5 : 0.85 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonTextSecondary,
          danger && styles.buttonTextDanger,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function StatusText({
  message,
  kind,
}: {
  message: string;
  kind?: "ok" | "err" | "";
}) {
  if (!message) return null;
  return (
    <Text
      style={[
        styles.status,
        kind === "ok" && { color: colors.ok },
        kind === "err" && { color: colors.danger },
      ]}
    >
      {message}
    </Text>
  );
}

export function LoadingRow() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function Badge({
  text,
  tone = "muted",
}: {
  text: string;
  tone?: "muted" | "ok" | "warn" | "danger";
}) {
  const toneStyle =
    tone === "ok"
      ? styles.badgeOk
      : tone === "warn"
        ? styles.badgeWarn
        : tone === "danger"
          ? styles.badgeDanger
          : null;
  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.input,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonDanger: {
    backgroundColor: "rgba(255,107,138,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,107,138,0.45)",
  },
  buttonText: {
    color: colors.accentText,
    fontWeight: "800",
    fontSize: 14,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  buttonTextDanger: {
    color: "#ffd0db",
  },
  status: {
    color: colors.muted,
    marginTop: 10,
    fontSize: 13,
  },
  loading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOk: {
    borderColor: "rgba(57,217,138,0.4)",
  },
  badgeWarn: {
    borderColor: "rgba(255,209,102,0.4)",
  },
  badgeDanger: {
    borderColor: "rgba(255,107,138,0.4)",
  },
  badgeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
