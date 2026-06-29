import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useFullscreen } from "@/src/utils/useFullscreen";

SplashScreen.preventAutoHideAsync();

// Try to load the Charware studio logo; fall back gracefully if not yet placed.
let charwareLogo: number | null = null;
try {
  charwareLogo = require("@/assets/images/charware_splash.png");
} catch {}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  const [showSplash, setShowSplash] = useState(true);

  useFullscreen({ autoEnter: true });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
      // Show studio splash for 2.2 s after fonts load
      const t = setTimeout(() => setShowSplash(false), 2200);
      return () => clearTimeout(t);
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  if (showSplash) {
    return (
      <View style={splash.container}>
        {charwareLogo ? (
          <Image source={charwareLogo} style={splash.logo} resizeMode="contain" />
        ) : (
          <>
            <Text style={splash.title}>CHARWARE</Text>
            <Text style={splash.sub}>STUDIOS</Text>
          </>
        )}
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000010",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 260, height: 260 },
  title: {
    color: "#FFFF00",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 6,
  },
  sub: {
    color: "#CCCCCC",
    fontSize: 14,
    letterSpacing: 8,
    marginTop: 4,
  },
});
