import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, View, Image, StyleSheet } from "react-native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { createLoggedEffect, logStartupStart, logStartupSuccess } from "@/src/game/startupLogging";
import { useFullscreen } from "@/src/utils/useFullscreen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  logStartupStart("RootLayout.render", { once: true });
  const [webMounted, setWebMounted] = useState(false);
  const [loaded, error] = useIconFonts();

  useFullscreen({ autoEnter: Platform.OS !== "web" });

  useEffect(
    createLoggedEffect("RootLayout.useEffect.webMount", () => {
      if (Platform.OS !== "web") return;
      setWebMounted(true);
    }, { once: true }),
    [],
  );

  useEffect(
    createLoggedEffect("RootLayout.useEffect.hideSplash", () => {
      if (Platform.OS === "web") return;
      if (loaded || error) {
        void SplashScreen.hideAsync();
      }
    }, { once: true }),
    [loaded, error],
  );

  let content;
  if (Platform.OS === "web") {
    if (!webMounted) {
      content = (
        <View style={styles.splash}>
          <Image
            source={require("../assets/images/app-image.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      );
    } else {
      content = <Stack screenOptions={{ headerShown: false }} />;
    }
  } else if (!loaded && !error) {
    // Show Charware logo on black while fonts load — overrides whatever the
    // native splash shows, works on every Android version without build config.
    content = (
      <View style={styles.splash}>
        <Image
          source={require("../assets/images/app-image.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );
  } else {
    content = <Stack screenOptions={{ headerShown: false }} />;
  }

  logStartupSuccess("RootLayout.render", { once: true });
  return content;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 280,
    height: 280,
  },
});
