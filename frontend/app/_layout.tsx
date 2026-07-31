import "@/src/polyfills";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, View, Image, StyleSheet } from "react-native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useFullscreen } from "@/src/utils/useFullscreen";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useFullscreen({ autoEnter: Platform.OS !== "web" });

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (Platform.OS === "web") {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  // Show Charware logo on black while fonts load — overrides whatever the
  // native splash shows, works on every Android version without build config.
  if (!loaded && !error) {
    return (
      <View style={styles.splash}>
        <Image
          source={require("../assets/images/app-image.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
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
