import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { COLORS } from "@/src/game/constants";

export default function CheckoutCancel() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} testID="checkout-cancel">
      <View style={styles.card}>
        <Text style={styles.title}>PAYMENT CANCELED</Text>
        <Text style={styles.message}>
          No charges were made. You can try again any time from the shop.
        </Text>
        <View style={{ marginTop: 24, gap: 10 }}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace("/shop")}
            testID="back-to-shop"
          >
            <Text style={styles.btnText}>BACK TO SHOP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => router.replace("/")}
            testID="go-home"
          >
            <Text style={styles.btnText}>MAIN MENU</Text>
          </TouchableOpacity>
        </View>
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
    color: "#FF477E",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
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
});
