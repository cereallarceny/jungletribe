import { colors } from "@jungle-tribe/ui/tokens";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Section = "collections" | "care";

export default function App() {
  const [section, setSection] = useState<Section>("collections");

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={styles.mark}>jt.</Text>
          <Text style={styles.wordmark}>Jungle Tribe</Text>
        </View>
        <Text style={styles.eyebrow}>FOR THE LOVE OF GROWING THINGS</Text>
        <Text role="heading" style={styles.title}>
          A home for your little jungle.
        </Text>
        <Text style={styles.intro}>
          Your plants, their stories, and a community to help them thrive.
        </Text>
        <View style={styles.tabs}>
          <SectionButton
            label="Your plants"
            selected={section === "collections"}
            onPress={() => setSection("collections")}
          />
          <SectionButton
            label="Plant care"
            selected={section === "care"}
            onPress={() => setSection("care")}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.badge}>COMING SOON</Text>
          <Text role="heading" style={styles.cardTitle}>
            {section === "collections"
              ? "Every leaf has a story."
              : "Room to roam. Care at home."}
          </Text>
          <Text style={styles.description}>
            {section === "collections"
              ? "We’re growing a free home for your plant collections, care notes, and photos. Unlimited plants, private by default."
              : "We’re bringing plant people together for in-home care, beginning with a community in Nashville. Bookings are not available yet."}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.cardNote}>
            {section === "collections"
              ? "From your first pothos to your prized anthurium."
              : "You won’t need a cataloged collection to find care."}
          </Text>
        </View>
        <Text style={styles.footer}>Good things take root.</Text>
      </ScrollView>
    </View>
  );
}

function SectionButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && styles.selectedTab,
        pressed && styles.pressedTab,
      ]}
    >
      <Text style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const serif = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 64,
  },
  mark: {
    backgroundColor: colors.forest,
    color: colors.cream,
    fontFamily: serif,
    fontSize: 28,
    width: 46,
    height: 46,
    textAlign: "center",
    lineHeight: 43,
    borderRadius: 23,
    overflow: "hidden",
  },
  wordmark: {
    color: colors.forest,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  eyebrow: {
    color: colors.moss,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "700",
    marginBottom: 20,
  },
  title: {
    color: colors.forest,
    fontFamily: serif,
    fontSize: 48,
    lineHeight: 51,
    letterSpacing: -1.5,
    maxWidth: 460,
  },
  intro: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 27,
    marginTop: 20,
    marginBottom: 36,
    maxWidth: 400,
  },
  tabs: { flexDirection: "row", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    justifyContent: "center",
  },
  selectedTab: { backgroundColor: colors.forest, borderColor: colors.forest },
  pressedTab: { opacity: 0.75 },
  tabLabel: { color: colors.forest, fontSize: 14, fontWeight: "600" },
  selectedTabLabel: { color: colors.paper },
  card: {
    padding: 28,
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    color: colors.moss,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
    marginBottom: 24,
  },
  cardTitle: {
    color: colors.forest,
    fontFamily: serif,
    fontSize: 32,
    lineHeight: 37,
    marginBottom: 18,
  },
  description: { color: colors.muted, fontSize: 16, lineHeight: 26 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  cardNote: { color: colors.forest, fontSize: 13, lineHeight: 21 },
  footer: {
    color: colors.muted,
    fontFamily: serif,
    fontStyle: "italic",
    textAlign: "center",
    fontSize: 15,
    marginTop: 36,
  },
});
