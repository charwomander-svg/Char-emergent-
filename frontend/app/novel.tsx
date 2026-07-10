import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import NovelEngine from "@/src/novel/NovelEngine";

export default function NovelScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <NovelEngine onExit={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1f",
  },
});
