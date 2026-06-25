// Icon font loader for Expo apps. Fonts are loaded from a CDN only under
// Expo Go (StoreClient) — that's where @expo/vector-icons' .ttf files come
// back as 0 bytes from Metro's asset resolver on Android. Native Android
// builds load the bundled TTFs directly; web skips font loading entirely.
// ICON_VECTOR_VERSION must match @expo/vector-icons in package.json.
// Usage: const [loaded, error] = useIconFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import { Platform } from "react-native";

const ICON_VECTOR_VERSION = "15.0.3";

const ICON_FAMILIES = [
  "AntDesign",
  "Entypo",
  "EvilIcons",
  "Feather",
  "FontAwesome",
  "FontAwesome5_Brands",
  "FontAwesome5_Regular",
  "FontAwesome5_Solid",
  "FontAwesome6_Brands",
  "FontAwesome6_Regular",
  "FontAwesome6_Solid",
  "Fontisto",
  "Foundation",
  "Ionicons",
  "MaterialCommunityIcons",
  "MaterialIcons",
  "Octicons",
  "SimpleLineIcons",
  "Zocial",
] as const;

type IconFamily = (typeof ICON_FAMILIES)[number];

const iconFontMap = (): Record<IconFamily, string> =>
  Object.fromEntries(
    ICON_FAMILIES.map((f) => [
      f,
      `https://cdn.jsdelivr.net/npm/@expo/vector-icons@${ICON_VECTOR_VERSION}/build/vendor/react-native-vector-icons/Fonts/${f}.ttf`,
    ]),
  ) as Record<IconFamily, string>;

const nativeIconFontMap = (): Record<IconFamily, number> => ({
  AntDesign: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf"),
  Entypo: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf"),
  EvilIcons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.ttf"),
  Feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
  FontAwesome: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf"),
  FontAwesome5_Brands: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf"),
  FontAwesome5_Regular: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf"),
  FontAwesome5_Solid: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf"),
  FontAwesome6_Brands: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.ttf"),
  FontAwesome6_Regular: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.ttf"),
  FontAwesome6_Solid: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.ttf"),
  Fontisto: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.ttf"),
  Foundation: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.ttf"),
  Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  MaterialCommunityIcons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf"),
  MaterialIcons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf"),
  Octicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.ttf"),
  SimpleLineIcons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.ttf"),
  Zocial: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.ttf"),
});

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : Platform.OS === "web"
        ? {}
        : nativeIconFontMap(),
  );
