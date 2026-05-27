import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/src/game/constants";
import { getCheckoutStatus } from "@/src/game/payments";
import { useEconomy } from "@/src/game/useEconomy";
import { getSoundEngine } from "@/src/game/sounds";

export default function CheckoutSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const sessionId =
    typeof params.session_id === "string" ? params.session_id : "";

  const { grantCoins } = useEconomy();
  const grantedRef = useRef(false);

  const [phase, setPhase] = useState<"pending" | "complete" | "failed">(
    "pending",
  );
  const [message, setMessage] = useState<string>(
    "Confirming your purchase with Stripe…",
  );
  const [coinsAdded, setCoinsAdded] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setPhase("failed");
      setMessage("Missing session id. If you completed payment, please contact support.");
      return;
    }

    let cancelled = false;
    let timer: any = null;
    const MAX_ATTEMPTS = 30; // ~60s @ 2s interval

    async function poll(attempt: number) {
      if (cancelled) return;
      setAttempts(attempt);
      try {
        const status = await getCheckoutStatus(sessionId);
        if (cancelled) return;
        if (status.coins_granted && status.coins) {
          if (!grantedRef.current) {
            grantedRef.current = true;
            // Mirror server-side credit into the local economy state so the UI
            // updates immediately. Server is the source of truth.
            grantCoins(status.coins);
            setCoinsAdded(status.coins);
            try {
              getSoundEngine().levelWin();
            } catch {}
          }
          setPhase("complete");
          setMessage(`Payment confirmed! Coins added to your wallet.`);
          return;
        }
        if (status.status === "expired" || status.status === "failed") {
          setPhase("failed");
          setMessage(
            status.status === "expired"
              ? "Checkout session expired."
              : "Payment did not complete.",
          );
          return;
        }
        if (attempt >= MAX_ATTEMPTS) {
          setPhase("failed");
          setMessage(
            "We couldn't confirm your purchase in time. If your card was charged, coins will appear shortly.",
          );
          return;
        }
        setMessage(`Waiting for payment confirmation… (${attempt})`);
        timer = setTimeout(() => poll(attempt + 1), 2000);
      } catch (e: any) {
        if (cancelled) return;
        if (attempt >= MAX_ATTEMPTS) {
          setPhase("failed");
          setMessage(e?.message || "Could not check payment status.");
          return;
        }
        timer = setTimeout(() => poll(attempt + 1), 3000);
      }
    }

    poll(1);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, grantCoins]);

  const goShop = () => router.replace("/shop");
  const goHome = () => router.replace("/");

  return (
    <SafeAreaView style={styles.container} testID="checkout-success">
      <View style={styles.card}>
        <Text style={styles.title}>
          {phase === "pending" ? "⏳ PROCESSING…" : phase === "complete" ? "✅ THANK YOU" : "⚠️ PROBLEM"}
        </Text>

        {phase === "pending" && (
          <ActivityIndicator color="#FFD23F" size="large" style={{ marginVertical: 16 }} />
        )}

        <Text style={styles.message} testID="checkout-message">{message}</Text>

        {phase === "complete" && coinsAdded != null && (
          <View style={styles.bigBadge}>
            <Text style={styles.bigBadgeText}>🪙 +{coinsAdded.toLocaleString()}</Text>
            <Text style={styles.bigBadgeLabel}>GHOST COINS ADDED</Text>
          </View>
        )}

        <View style={{ marginTop: 24, gap: 10 }}>
          {phase !== "pending" && (
            <TouchableOpacity style={styles.btn} onPress={goShop} testID="back-to-shop">
              <Text style={styles.btnText}>BACK TO SHOP</Text>
            </TouchableOpacity>
          )}
          {phase !== "pending" && (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={goHome} testID="go-home">
              <Text style={styles.btnText}>MAIN MENU</Text>
            </TouchableOpacity>
          )}
        </View>

        {phase === "pending" && (
          <Text style={styles.hint}>Don't close this page.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.uiBg,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.uiPanel,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    borderWidth: 2,
    borderColor: COLORS.uiBorder,
    alignItems: "center",
  },
  title: {
    color: "#FFFF00",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  bigBadge: {
    backgroundColor: "#0a0a18",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD23F",
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 16,
    alignItems: "center",
  },
  bigBadgeText: {
    color: "#FFD23F",
    fontSize: 28,
    fontWeight: "900",
  },
  bigBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  btn: {
    backgroundColor: "#0a0a18",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#FFD23F",
    alignItems: "center",
    minWidth: 200,
  },
  btnSecondary: { borderColor: COLORS.uiBorder },
  btnText: {
    color: "#FFFF00",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 14,
  },
  hint: {
    color: "#888899",
    fontSize: 11,
    marginTop: 16,
    fontStyle: "italic",
  },
});
