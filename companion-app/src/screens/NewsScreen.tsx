import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createNews, deleteNews, listNews, updateNews } from "../api";
import {
  Badge,
  Card,
  Field,
  FieldLabel,
  LoadingRow,
  PrimaryButton,
  StatusText,
} from "../components/ui";
import { colors } from "../theme";
import type { CompanionSettings, NewsItem } from "../types";

type Props = {
  settings: CompanionSettings;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function NewsScreen({ settings }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "">("");
  const [editId, setEditId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const resetForm = () => {
    setEditId("");
    setDate(todayISO());
    setTitle("");
    setBody("");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listNews(settings.apiBase, settings.adminKey);
      setItems(rows || []);
      setStatus(`${(rows || []).length} news item(s).`);
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

  const save = async () => {
    const payload = {
      title: title.trim(),
      date: date.trim(),
      body: body.trim(),
    };
    if (!payload.title || !payload.body) {
      setStatus("Title and body are required.");
      setStatusKind("err");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateNews(settings.apiBase, settings.adminKey, editId, payload);
        setStatus("News updated.");
      } else {
        await createNews(settings.apiBase, settings.adminKey, payload);
        setStatus("News created.");
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

  const onDelete = (item: NewsItem) => {
    if (!item.id) return;
    Alert.alert("Delete news?", item.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNews(settings.apiBase, settings.adminKey, item.id!);
            if (editId === item.id) resetForm();
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
        <Text style={styles.hint}>News needs only a date, title, and body.</Text>
        <FieldLabel>Date</FieldLabel>
        <Field value={date} onChangeText={setDate} placeholder="2026-08-06" autoCapitalize="none" />
        <FieldLabel>Title</FieldLabel>
        <Field value={title} onChangeText={setTitle} placeholder="Update title" maxLength={120} />
        <FieldLabel>Body</FieldLabel>
        <Field
          value={body}
          onChangeText={setBody}
          placeholder="Write the news in plain text..."
          multiline
          maxLength={1000}
        />
        <View style={styles.row}>
          <PrimaryButton title={saving ? "Saving…" : editId ? "Update news" : "Save news"} onPress={save} disabled={saving} />
          <PrimaryButton title="Clear" onPress={resetForm} secondary />
        </View>
        <StatusText message={status} kind={statusKind} />
      </Card>

      <View style={styles.listHead}>
        <Text style={styles.section}>Published news</Text>
        <PrimaryButton title="Refresh" onPress={load} secondary />
      </View>

      {loading && !items.length ? <LoadingRow /> : null}

      {items.map((item, index) => {
        const editable = Boolean(item.id);
        return (
          <Card key={item.id || `env-${index}`}>
            <View style={styles.itemHead}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.meta}>{item.date}</Text>
              </View>
              <Badge text={editable ? "saved" : "default / env"} tone={editable ? "ok" : "warn"} />
            </View>
            <Text style={styles.body}>{item.body}</Text>
            {editable ? (
              <View style={styles.row}>
                <PrimaryButton
                  title="Edit"
                  secondary
                  onPress={() => {
                    setEditId(item.id || "");
                    setDate(item.date || todayISO());
                    setTitle(item.title || "");
                    setBody(item.body || "");
                  }}
                />
                <PrimaryButton title="Delete" danger onPress={() => onDelete(item)} />
              </View>
            ) : (
              <Text style={styles.meta}>
                Defaults are not stored until you save your own news item.
              </Text>
            )}
          </Card>
        );
      })}
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
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  section: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
