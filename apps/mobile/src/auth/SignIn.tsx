import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
import { apiURL, authClient } from "./client";
import {
  AuthButton,
  AuthShell,
  assets,
  CodeField,
  Copy,
  EmailField,
  palette,
  TextAction,
  typography,
} from "./components";
import { Welcome } from "./Welcome";

export function SignIn() {
  const [step, setStep] = useState<"welcome" | "email" | "code">("email");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (step !== "code" || resendAt <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendAt]);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === "welcome" || locked.current) return false;
        setStep(step === "code" ? "email" : "welcome");
        setMessage("");
        return true;
      },
    );
    return () => subscription.remove();
  }, [step]);

  async function deliver(destination: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: destination,
      type: "sign-in",
    });
    if (result.error)
      throw new Error(
        result.error.message ?? "We couldn't send your code. Please try again.",
      );
    setSentTo(destination);
    setCode("");
    setResendAt(Date.now() + 60_000);
    setNow(Date.now());
    setStep("code");
  }
  async function send() {
    if (locked.current || !apiURL) return;
    const destination = (step === "code" ? sentTo : email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (step === "code" && remaining > 0) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      await deliver(destination);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Check your connection and try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    if (locked.current || !/^\d{6}$/.test(code)) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.signIn.emailOtp({
        email: sentTo,
        otp: code,
      });
      if (result.error) {
        if (result.error.code === "OTP_EXPIRED" && remaining === 0) {
          await deliver(sentTo);
          setMessage(
            "That code has expired. We’ve sent a fresh one — use the newest email.",
          );
        } else
          setMessage(
            "That code didn’t work. Check the newest email, or request another code.",
          );
      }
    } catch {
      setMessage(
        "We couldn't complete sign-in. Check your connection and try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  if (step === "welcome")
    return <Welcome onContinue={() => setStep("email")} />;
  return (
    <AuthShell
      showTerms={step === "email"}
      onBack={() => {
        if (busy) return;
        setStep(step === "code" ? "email" : "welcome");
        setMessage("");
        setCode("");
      }}
    >
      <View style={{ gap: 12 }}>
        {step === "code" && (
          <Text style={[typography.label, message && { color: palette.flag }]}>
            {message ? "That code didn’t work" : "Sign-in code"}
          </Text>
        )}
        <Text accessibilityRole="header" style={typography.heading}>
          {step === "email" ? "Sign in or sign up" : "Check your email"}
        </Text>
        <Copy>
          {step === "email"
            ? "Same steps either way. If you’re new, we’ll set you up."
            : `We sent a 6-digit code to ${sentTo}. It’s good for 10 minutes.`}
        </Copy>
      </View>
      {step === "email" ? (
        <>
          <AuthButton disabled variant="primary">
            Continue with Apple
          </AuthButton>
          <AuthButton disabled variant="outline">
            Continue with Google
          </AuthButton>
          <Copy small>Apple and Google sign-in are coming soon.</Copy>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View
              style={{ flex: 1, height: 1, backgroundColor: palette.stone }}
            />
            <Copy small>or</Copy>
            <View
              style={{ flex: 1, height: 1, backgroundColor: palette.stone }}
            />
          </View>
          <EmailField
            value={email}
            onChange={setEmail}
            onSubmit={send}
            disabled={busy}
          />
          {message && (
            <Copy small error>
              {message}
            </Copy>
          )}
          {!apiURL && (
            <Copy small>Sign-in is being set up. Please try again soon.</Copy>
          )}
          <AuthButton
            disabled={busy || !apiURL}
            onPress={send}
            icon={assets.mail}
          >
            {busy ? "Sending your code…" : "Email me a code"}
          </AuthButton>
          <Copy small>No passwords. We’ll send a 6-digit code instead.</Copy>
        </>
      ) : (
        <>
          <CodeField
            value={code}
            onChange={setCode}
            onSubmit={verify}
            disabled={busy}
            invalid={Boolean(message)}
          />
          {message && (
            <Copy small error>
              {message}
            </Copy>
          )}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              columnGap: 12,
            }}
          >
            <TextAction onPress={send} disabled={busy || remaining > 0}>
              {remaining > 0
                ? `Resend code in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                : "Resend code"}
            </TextAction>
            <TextAction
              disabled={busy}
              onPress={() => {
                setStep("email");
                setMessage("");
                setCode("");
              }}
            >
              Use a different email
            </TextAction>
          </View>
          <AuthButton
            onPress={verify}
            disabled={busy || !/^\d{6}$/.test(code)}
            icon={assets.next}
          >
            {busy ? "Checking your code…" : "Continue"}
          </AuthButton>
          <Copy small>
            Can’t find it? Check spam, or the Promotions tab if you’re a Gmail
            person.
          </Copy>
        </>
      )}
    </AuthShell>
  );
}
