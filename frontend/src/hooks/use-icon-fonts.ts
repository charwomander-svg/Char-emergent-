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

const nativeIconFontMap = (): Record<IconFamily, number> =>
  Object.fromEntries(
    ICON_FAMILIES.map((f) => [
      f,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(`@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/${f}.ttf`),
    ]),
  ) as Record<IconFamily, number>;

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : Platform.OS === "web"
        ? {}
        : nativeIconFontMap(),
  );
