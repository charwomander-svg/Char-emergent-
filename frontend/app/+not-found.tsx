import { useEffect } from "react";
import { Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";

function normalizeHtmlPath(pathname: string): string | null {
  if (!pathname) return null;
  if (/\/index\.html$/i.test(pathname)) {
    return pathname.replace(/\/index\.html$/i, "/");
  }
  const htmlLeaf = pathname.match(/\/([^/]+)\.html$/i);
  if (htmlLeaf && htmlLeaf[1] && htmlLeaf[1].toLowerCase() !== "index") {
    return pathname.replace(/\/[^/]+\.html$/i, `/${htmlLeaf[1]}`);
  }
  return null;
}

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const normalized = normalizeHtmlPath(pathname);
    if (normalized && normalized !== pathname) {
      router.replace(normalized as any);
      return;
    }
    if (pathname === "/index.html") {
      router.replace("/" as any);
    }
  }, [pathname, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0d0d1a",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
        Loading route...
      </Text>
      <Text style={{ color: "#9ca3af", textAlign: "center" }}>
        Retrying launch path compatibility.
      </Text>
    </View>
  );
}

