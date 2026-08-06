import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { CompanionSettings } from "./types";

const API_BASE_KEY = "ghostMaze.companion.apiBase";
const ADMIN_KEY = "ghostMaze.companion.adminKey";

const DEFAULT_API_BASE = "https://ghost-maze-backend.onrender.com";

export async function loadSettings(): Promise<CompanionSettings> {
  const [apiBase, adminKey] = await Promise.all([
    AsyncStorage.getItem(API_BASE_KEY),
    SecureStore.getItemAsync(ADMIN_KEY),
  ]);
  return {
    apiBase: (apiBase || DEFAULT_API_BASE).replace(/\/+$/, ""),
    adminKey: adminKey || "",
  };
}

export async function saveSettings(settings: CompanionSettings): Promise<void> {
  await AsyncStorage.setItem(API_BASE_KEY, settings.apiBase.replace(/\/+$/, ""));
  if (settings.adminKey) {
    await SecureStore.setItemAsync(ADMIN_KEY, settings.adminKey);
  } else {
    await SecureStore.deleteItemAsync(ADMIN_KEY);
  }
}

export async function clearAdminKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_KEY);
}
