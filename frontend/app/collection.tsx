import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  backendStrategy,
  contentPipeline,
  launchTiers,
  platformConstraints,
  supportedModes,
  verticalSlices,
  xboxTargets,
} from "@/src/cards/blueprint";
import { featuredRulesets } from "@/src/cards/games";
import { validateRulesDefinition } from "@/src/cards/engine/validation";

const launchGames = launchTiers.launch as Array<{
  id: string;
  name: string;
  category: string;
  why: string;
}>;

export default function CollectionBlueprintScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>THE ULTIMATE CARD COLLECTION</Text>
        <Text style={styles.subtitle}>Xbox-first blueprint and engine scaffold</Text>

        <Section title="Launch MVP">
          {launchGames.map((game) => (
            <Card key={game.id} title={`${game.name} · ${game.category.toUpperCase()}`}>
              <Text style={styles.body}>{game.why}</Text>
            </Card>
          ))}
        </Section>

        <Section title="Launch Modes">
          {Object.entries(supportedModes.launch).map(([category, modes]) => (
            <Bullet key={category} label={`${category}: ${(modes as string[]).join(", ")}`} />
          ))}
        </Section>

        <Section title="Xbox Targets">
          <Bullet label={`Platforms: ${xboxTargets.platforms.join(", ")}`} />
          <Bullet label={`Series X: ${xboxTargets.renderTargets.seriesX}`} />
          <Bullet label={`Series S: ${xboxTargets.renderTargets.seriesS}`} />
          <Bullet label={`Frame budget: ${xboxTargets.frameBudgetMs} ms`} />
          <Bullet label={`Input latency target: ≤ ${xboxTargets.inputLatencyMs} ms`} />
          {xboxTargets.accessibilityBaseline.map((entry) => (
            <Bullet key={entry} label={entry} />
          ))}
        </Section>

        <Section title="Custom Engine Foundations">
          <Bullet label={platformConstraints.engineStrategy} />
          {featuredRulesets.map((ruleset) => {
            const validation = validateRulesDefinition(ruleset);
            return (
              <Card
                key={ruleset.metadata.id}
                title={`${ruleset.metadata.title} ruleset`}
              >
                <Text style={styles.body}>
                  {ruleset.metadata.tags.join(" · ")}{"\n"}
                  Validation: {validation.ok ? "ready" : "needs work"}
                </Text>
              </Card>
            );
          })}
        </Section>

        <Section title="Vertical Slices">
          {verticalSlices.map((slice) => (
            <Card key={slice.id} title={`${slice.id} · ${slice.category}`}>
              <Text style={styles.body}>{slice.goals.join(", ")}</Text>
            </Card>
          ))}
        </Section>

        <Section title="Content Pipeline">
          <Bullet label={contentPipeline.authoringFormat} />
          <Bullet label={`Tags: ${contentPipeline.metadataTags.join(", ")}`} />
          <Bullet label={`Localization: ${contentPipeline.localizationFields.join(", ")}`} />
          <Bullet label={`Automation: ${contentPipeline.automation.join(", ")}`} />
        </Section>

        <Section title="Backend & Live Ops">
          <Bullet label={`Launch services: ${backendStrategy.launchScope.join(", ")}`} />
          <Bullet label={`Security: ${backendStrategy.security.join(", ")}`} />
          <Bullet label={`Migration: ${backendStrategy.migrationPath.join(", ")}`} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ label }: { label: string }) {
  return <Text style={styles.bullet}>• {label}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    color: "#f8f0d8",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  subtitle: {
    color: "#8ec5ff",
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: "#ffd166",
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#29415d",
    backgroundColor: "#11233a",
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  body: {
    color: "#dce8f8",
    lineHeight: 20,
    fontSize: 13,
  },
  bullet: {
    color: "#dce8f8",
    lineHeight: 20,
    fontSize: 13,
  },
});
