import { Image } from "expo-image";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AuthButton,
  assets,
  Copy,
  fonts,
  palette,
  typography,
} from "./components";

export function Welcome({ onContinue }: { onContinue: () => void }) {
  const { width, height } = useWindowDimensions();
  const desktop = width >= 768;
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: palette.canvas }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View
        style={{
          flexDirection: desktop ? "row" : "column",
          flexGrow: 1,
          minHeight: height,
        }}
      >
        <Image
          source={
            desktop
              ? require("../../assets/auth/welcome-desktop.png")
              : require("../../assets/auth/welcome-mobile.png")
          }
          accessibilityLabel="Monstera leaves in a sunlit home"
          contentFit="cover"
          style={{
            width: desktop ? "50%" : "100%",
            height: desktop ? "100%" : 430,
            minHeight: desktop ? height : 430,
          }}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: desktop ? (width >= 1200 ? 96 : 32) : 20,
            paddingTop: desktop ? 64 : 28,
            paddingBottom: desktop ? 64 : Math.max(64, insets.bottom + 32),
            gap: desktop ? 24 : 14,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Image
              source={assets.logo}
              contentFit="contain"
              style={{ width: 34, height: 34 }}
            />
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 24,
                lineHeight: 24,
                letterSpacing: 1.2,
                color: palette.bark,
              }}
            >
              JUNGLE TRIBE
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            style={[
              typography.heading,
              desktop && {
                fontSize: width >= 1200 ? 56 : 40,
                lineHeight: width >= 1200 ? 54 : 40,
                letterSpacing: -0.5,
              },
            ]}
          >
            For people who name their plants.
          </Text>
          <Text
            style={[
              typography.body,
              desktop && { fontSize: 18, lineHeight: 26 },
            ]}
          >
            {desktop
              ? "Keep a proper record of every plant — species, quirks, the watering schedule only you understand. When you’re away, book a sitter nearby who actually reads it."
              : "Keep a proper record of every plant. When you’re away, book a sitter who actually reads it."}
          </Text>
          <View
            style={{
              flexDirection: desktop ? "row" : "column",
              flexWrap: "wrap",
              gap: 12,
              marginTop: desktop ? 0 : 14,
            }}
          >
            <AuthButton onPress={onContinue} icon={assets.next}>
              Get started
            </AuthButton>
            <AuthButton onPress={onContinue} variant="outline">
              I have an account
            </AuthButton>
          </View>
          <Copy small>
            By continuing you agree to the Terms and the Privacy Policy.
          </Copy>
        </View>
      </View>
    </ScrollView>
  );
}
