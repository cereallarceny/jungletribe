import { StatusBar } from "expo-status-bar";
import { ScrollView, Text } from "react-native";

export default function App() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 24, gap: 16 }}
    >
      <StatusBar style="auto" />
      <Text accessibilityRole="header">Jungle Tribe</Text>
      <Text accessibilityRole="header">Application foundation</Text>
      <Text>
        Collections is the first release. Product implementation is in progress.
      </Text>
    </ScrollView>
  );
}
