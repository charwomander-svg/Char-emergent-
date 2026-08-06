import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createPromo, deletePromo, listPromos, updatePromo } from "../api";
import {
  Badge,
  Card,
  Field,
  FieldLabel,
  LoadingRow,
  PrimaryButton,
  StatusText,
} from "../components/ui";
import { POWER_UPS, formatPowerUps } from "../powerups";
import { colors } from "../theme";
import type { CompanionSettings, PromoItem } from "../types";

type Props = {
  settings: CompanionSettings;
};

function emptyPowerQty(): Record<string, string> {
  return Object.fromEntries(POWER_UPS.map((p) => [p.id, "0"]));
}

export function PromosScreen({ settings }: Props) {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "">("");
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("");
  const [reward, setReward] = useState("0");
  const [maxTotal, setMaxTotal] = useState("");
  const [maxPerson, setMaxPerson] = useState("1");
  const [active, setActive] = useState(true);
  const [daily, setDaily] = useState(false);
  const [powerQty, setPowerQty] = useState<Record<string, string>>(emptyPowerQty);

  const resetForm = () => {
    setEditing(false);
    setCode("");
    setReward("0");
    setMaxTotal("");
    setMaxPerson("1");
    setActive(true);
    setDaily(false);
    setPowerQty(emptyPowerQty());
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPromos(settings.apiBase, settings.adminKey);
      setItems(rows || []);
      setStatus(`${(rows || []).length} promo code(s).`);
      setStatusKind("ok");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
      setStatusKind("err");
    } finally {
      setLoading(false);
    }
  }, [settings.adminKey, settings.apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  const powerUpsPayload = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, raw] of Object.entries(powerQty)) {
      const qty = Number(raw || 0);
      if (Number.isFinite(qty) && qty > 0) out[id] = Math.floor(qty);
    }
    return out;
  }, [powerQty]);

  const fillForm = (item: PromoItem) => {
    setEditing(true);
    setCode(item.code || "");
    setReward(String(item.reward ?? 0));
    setMaxTotal(item.max_uses_total == null ? "" : String(item.max_uses_total));
    setMaxPerson(String(item.max_uses_per_person ?? 1));
    setActive(item.active !== false);
    setDaily(item.daily === true);
    const next = emptyPowerQty();
    for (const [id, qty] of Object.entries(item.power_ups || {})) {
      if (id in next && Number(qty) > 0) next[id] = String(qty);
    }
    setPowerQty(next);
  };

  const save = async () => {
    const cleanedCode = code.trim().toUpperCase();
    const coins = Number(reward || 0);
    const perPerson = Number(maxPerson || 1);
    const totalRaw = maxTotal.trim();
    const total = totalRaw === "" ? null : Number(totalRaw);

    if (!cleanedCode) {
      setStatus("Code is required.");
      setStatusKind("err");
      return;
    }
    if (!Number.isFinite(coins) || coins < 0) {
      setStatus("Coins must be 0 or more.");
      setStatusKind("err");
      return;
    }
    if (coins <= 0 && Object.keys(powerUpsPayload).length === 0) {
      setStatus("Add coin reward and/or at least one power-up.");
      setStatusKind("err");
      return;
    }
    if (!Number.isFinite(perPerson) || perPerson < 1) {
      setStatus("Uses per person must be at least 1.");
      setStatusKind("err");
      return;
    }
    if (total != null && (!Number.isFinite(total) || total < 1)) {
      setStatus("Uses total must be blank or at least 1.");
      setStatusKind("err");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const payload: Parameters<typeof updatePromo>[3] = {
          reward: coins,
          power_ups: powerUpsPayload,
          max_uses_per_person: perPerson,
          active,
          daily,
        };
        if (total == null) payload.clear_max_uses_total = true;
        else payload.max_uses_total = total;
        await updatePromo(settings.apiBase, settings.adminKey, cleanedCode, payload);
        setStatus("Promo updated.");
      } else {
        await createPromo(settings.apiBase, settings.adminKey, {
          code: cleanedCode,
          reward: coins,
          power_ups: powerUpsPayload,
          max_uses_total: total,
          max_uses_per_person: perPerson,
          active,
          daily,
        });
        setStatus("Promo created.");
      }
      setStatusKind("ok");
      resetForm();
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
      setStatusKind("err");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item: PromoItem) => {
    Alert.alert("Delete promo?", item.code, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePromo(settings.apiBase, settings.adminKey, item.code);
            if (editing && code.toUpperCase() === item.code) resetForm();
            setStatus("Deleted.");
            setStatusKind("ok");
            await load();
          } catch (err) {
            setStatus(err instanceof Error ? err.message : String(err));
            setStatusKind("err");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
    >
      <Card>
        <Text style={styles.hint}>
          Enter code, coins, power-up amounts, total uses, and uses per person. Leave total uses blank for unlimited.
        </Text>
        <FieldLabel>Code</FieldLabel>
        <Field
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!editing}
          placeholder="SUMMER100"
        />
        <FieldLabel>Reward (coins)</FieldLabel>
        <Field value={reward} onChangeText={setReward} keyboardType="number-pad" placeholder="0" />
        <FieldLabel>Uses total</FieldLabel>
        <Field value={maxTotal} onChangeText={setMaxTotal} keyboardType="number-pad" placeholder="unlimited" />
        <FieldLabel>Uses per person</FieldLabel>
        <Field value={maxPerson} onChangeText={setMaxPerson} keyboardType="number-pad" placeholder="1" />

        <FieldLabel>Active</FieldLabel>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setActive(true)}
            style={[styles.toggle, active && styles.toggleOn]}
          >
            <Text style={styles.toggleText}>Yes</Text>
          </Pressable>
          <Pressable
            onPress={() => setActive(false)}
            style={[styles.toggle, !active && styles.toggleOn]}
          >
            <Text style={styles.toggleText}>No</Text>
          </Pressable>
        </View>

        <FieldLabel>Daily (uses-per-person resets at midnight)</FieldLabel>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setDaily(true)}
            style={[styles.toggle, daily && styles.toggleOn]}
          >
            <Text style={styles.toggleText}>Yes</Text>
          </Pressable>
          <Pressable
            onPress={() => setDaily(false)}
            style={[styles.toggle, !daily && styles.toggleOn]}
          >
            <Text style={styles.toggleText}>No</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Power-up rewards</Text>
        <Text style={styles.hint}>Leave 0 for none.</Text>
        <View style={styles.powerGrid}>
          {POWER_UPS.map((pu) => (
            <View key={pu.id} style={styles.powerItem}>
              <Text style={styles.powerLabel}>{pu.label}</Text>
              <Field
                value={powerQty[pu.id] || "0"}
                onChangeText={(text) => setPowerQty((prev) => ({ ...prev, [pu.id]: text }))}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <PrimaryButton
            title={saving ? "Saving…" : editing ? "Update promo" : "Save promo"}
            onPress={save}
            disabled={saving}
          />
          <PrimaryButton title="Clear" onPress={resetForm} secondary />
        </View>
        <StatusText message={status} kind={statusKind} />
      </Card>

      <View style={styles.listHead}>
        <Text style={styles.section}>Promo codes</Text>
        <PrimaryButton title="Refresh" onPress={load} secondary />
      </View>

      {loading && !items.length ? <LoadingRow /> : null}

      {items.map((item) => (
        <Card key={item.code}>
          <View style={styles.itemHead}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{item.code}</Text>
              <Text style={styles.meta}>
                Coins: {item.reward || 0} · Power-ups: {formatPowerUps(item.power_ups)} · Uses total:{" "}
                {item.max_uses_total == null ? "unlimited" : item.max_uses_total} · Per person:{" "}
                {item.max_uses_per_person || 1} · Redeemed: {item.redeemed_count || 0} · Daily:{" "}
                {item.daily ? "yes" : "no"}
              </Text>
            </View>
            <View style={styles.badges}>
              <Badge
                text={item.source === "database" ? "database" : item.source}
                tone={item.source === "database" ? "ok" : "warn"}
              />
              {item.active === false ? <Badge text="inactive" tone="danger" /> : null}
              {item.daily ? <Badge text="daily" tone="ok" /> : null}
            </View>
          </View>
          <View style={styles.row}>
            <PrimaryButton title="Edit" secondary onPress={() => fillForm(item)} />
            {item.editable ? (
              <PrimaryButton title="Delete" danger onPress={() => onDelete(item)} />
            ) : (
              <Text style={styles.meta}>Built-in/env — edit to override, or deactivate.</Text>
            )}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggle: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.input,
  },
  toggleOn: {
    borderColor: colors.accent,
    backgroundColor: "rgba(124,140,255,0.18)",
  },
  toggleText: {
    color: colors.text,
    fontWeight: "700",
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  powerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  powerItem: {
    width: "47%",
    flexGrow: 1,
  },
  powerLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  badges: {
    gap: 6,
    alignItems: "flex-end",
  },
});
