import { Image } from "expo-image";
import type { ComponentRef, ReactNode } from "react";
import { useId, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const palette = {
  canvas: "#eee7d7",
  paper: "#f7f3ea",
  bark: "#24211c",
  olive: "#46512c",
  stone: "#d9d0bc",
  flag: "#ff5b1f",
  white: "#ffffff",
};
export const fonts = {
  body: "Barlow_400Regular",
  medium: "Barlow_500Medium",
  strong: "Barlow_600SemiBold",
  heading: "BarlowCondensed_800ExtraBold",
  digit: "BarlowCondensed_700Bold",
  label: "IBMPlexMono_500Medium",
};
export const assets = {
  back: require("../../assets/auth/arrow-left.svg"),
  next: require("../../assets/auth/arrow-right.svg"),
  mail: require("../../assets/auth/mail.svg"),
  logo: require("../../assets/auth/logo-patch.svg"),
};
export const typography = StyleSheet.create({
  heading: {
    fontFamily: fonts.heading,
    fontSize: 40,
    lineHeight: 40,
    color: palette.bark,
    textTransform: "uppercase",
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: palette.olive,
  },
  small: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: palette.olive,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: palette.olive,
  },
});

export function Copy({
  children,
  small = false,
  error = false,
}: {
  children: ReactNode;
  small?: boolean;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion={error ? "polite" : undefined}
      style={[
        small ? typography.small : typography.body,
        error && { color: palette.flag },
      ]}
    >
      {children}
    </Text>
  );
}

export function AuthButton({
  children,
  onPress,
  disabled,
  variant = "signal",
  icon,
}: {
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "signal" | "primary" | "outline";
  icon?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary"
          ? styles.primary
          : variant === "outline"
            ? styles.outline
            : styles.signal,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {variant === "outline" && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderWidth: 1.5, borderColor: palette.bark, borderRadius: 4 },
          ]}
        />
      )}
      {icon && (
        <Image
          source={icon}
          style={{ width: 18, height: 18 }}
          contentFit="contain"
          accessibilityElementsHidden
        />
      )}
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && { color: palette.paper },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function EmailField({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <AuthField
      label="Email"
      value={value}
      onChangeText={onChange}
      onSubmitEditing={onSubmit}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="email"
      keyboardType="email-address"
      textContentType="emailAddress"
      editable={!disabled}
      returnKeyType="send"
      placeholder="you@example.com"
      placeholderTextColor={palette.olive}
    />
  );
}

export function AuthField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const labelId = useId();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[typography.label, { lineHeight: 20 }]} nativeID={labelId}>
        {label}
      </Text>
      <View>
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          style={[styles.email, props.style]}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderWidth: 1.5, borderColor: palette.stone, borderRadius: 4 },
          ]}
        />
      </View>
    </View>
  );
}

export function CodeField({
  value,
  onChange,
  onSubmit,
  disabled,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  invalid?: boolean;
}) {
  const compact = useWindowDimensions().width < 360;
  const fields = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  function change(index: number, input: string) {
    const digits = input.replace(/\D/g, "");
    if (digits.length === 6) {
      onChange(digits);
      fields.current[5]?.focus();
      return;
    }
    const next = value.padEnd(6, " ").split("");
    for (
      let offset = 0;
      offset < Math.max(1, digits.length) && index + offset < 6;
      offset++
    )
      next[index + offset] = digits[offset] ?? " ";
    onChange(next.join("").trimEnd());
    if (digits) fields.current[Math.min(5, index + digits.length)]?.focus();
  }
  return (
    <View style={[styles.codeRow, compact && { gap: 2 }]}>
      {["first", "second", "third", "fourth", "fifth", "sixth"].map(
        (slot, index) => (
          <TextInput
            key={slot}
            ref={(field) => {
              fields.current[index] = field;
            }}
            accessibilityLabel={`Code digit ${index + 1} of 6`}
            value={(value[index] ?? "").trim()}
            onChangeText={(input) => change(index, input)}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            textContentType={index === 0 ? "oneTimeCode" : "none"}
            selectTextOnFocus
            onSubmitEditing={onSubmit}
            onKeyPress={({ nativeEvent }) => {
              if (
                nativeEvent.key === "Backspace" &&
                !(value[index] ?? "").trim()
              )
                fields.current[Math.max(0, index - 1)]?.focus();
            }}
            style={[styles.digit, invalid && { borderColor: palette.flag }]}
          />
        ),
      )}
    </View>
  );
}

export function TextAction({
  children,
  onPress,
  disabled = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text
        style={[
          typography.small,
          {
            color: disabled ? palette.olive : palette.bark,
            fontFamily: fonts.medium,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const terms = "By continuing you agree to the Terms and the Privacy Policy.";
export function AuthShell({
  children,
  onBack,
  showTerms = false,
}: {
  children: ReactNode;
  onBack?: () => void;
  showTerms?: boolean;
}) {
  const desktop = useWindowDimensions().width >= 768;
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: palette.canvas,
        paddingTop: desktop ? 0 : insets.top,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {desktop ? (
          <View style={styles.logo}>
            <Image
              source={assets.logo}
              style={{ width: 34, height: 34 }}
              contentFit="contain"
            />
            <Text style={styles.wordmark}>JUNGLE TRIBE</Text>
          </View>
        ) : (
          <View style={styles.backBar}>
            {onBack && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={onBack}
                style={styles.backButton}
              >
                <Image source={assets.back} style={{ width: 20, height: 20 }} />
              </Pressable>
            )}
          </View>
        )}
        <View style={[styles.content, desktop && styles.desktopContent]}>
          <View style={[styles.panel, { gap: desktop ? 20 : 16 }]}>
            {children}
            {desktop && showTerms && <Copy small>{terms}</Copy>}
          </View>
        </View>
      </ScrollView>
      {!desktop && showTerms && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(28, insets.bottom) },
          ]}
        >
          <Copy small>{terms}</Copy>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  primary: { backgroundColor: palette.bark },
  signal: { backgroundColor: palette.flag },
  outline: {},
  buttonText: {
    fontFamily: fonts.strong,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
    color: palette.bark,
    textAlign: "center",
  },
  email: {
    height: 48,
    backgroundColor: palette.paper,
    borderRadius: 4,
    paddingHorizontal: 14,
    color: palette.bark,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  codeRow: { flexDirection: "row", gap: 8, maxWidth: 328 },
  digit: {
    flex: 1,
    minWidth: 0,
    maxWidth: 48,
    height: 58,
    padding: 0,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.stone,
    borderRadius: 6,
    fontFamily: fonts.digit,
    fontSize: 28,
    lineHeight: 30,
    textAlign: "center",
    color: palette.bark,
  },
  logo: {
    position: "absolute",
    top: 40,
    left: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 1,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 1.2,
    color: palette.bark,
  },
  backBar: { height: 56, paddingHorizontal: 4, justifyContent: "center" },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  desktopContent: {
    paddingHorizontal: 64,
    paddingVertical: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: { width: "100%", maxWidth: 420 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: palette.stone,
    backgroundColor: palette.paper,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
});
