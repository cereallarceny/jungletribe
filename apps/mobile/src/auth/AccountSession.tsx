import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { authClient, getAdminStatus } from "./client";
import {
  AuthButton,
  AuthField,
  AuthShell,
  assets,
  Copy,
  fonts,
  palette,
  TextAction,
  typography,
} from "./components";

type AdminStatus = Awaited<ReturnType<typeof getAdminStatus>>;

export function AccountSession({
  email,
  refresh,
}: {
  email: string;
  refresh: () => Promise<unknown>;
}) {
  const [admin, setAdmin] = useState<AdminStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setAdmin(null);
    getAdminStatus()
      .then((status) => {
        if (!cancelled) setAdmin(status);
      })
      .catch(() => {
        if (!cancelled)
          setError("We couldn't check account security. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const reload = useCallback(async () => {
    const status = await getAdminStatus();
    setAdmin(status);
    return status;
  }, []);
  async function signOut(everywhere = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (everywhere) {
        const result = await authClient.revokeSessions();
        if (result.error) throw new Error();
      }
      const result = await authClient.signOut();
      if (result.error && !everywhere) throw new Error();
      await refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={typography.heading}>
          You’re signed in
        </Text>
        <Copy>{email}</Copy>
      </View>
      <Copy>
        Your account is ready. Collections will be available here soon.
      </Copy>
      {admin?.candidate && (
        <SuperadminMFA status={admin} reload={reload} refresh={refresh} />
      )}
      {Boolean(error) && (
        <>
          <Copy small error>
            {error}
          </Copy>
          <TextAction
            onPress={() => {
              setError("");
              reload().catch(() => setError("Please try again."));
            }}
          >
            Check account security again
          </TextAction>
        </>
      )}
      <AuthButton disabled={busy} onPress={() => signOut()} variant="outline">
        Sign out
      </AuthButton>
      <TextAction disabled={busy} onPress={() => signOut(true)}>
        Sign out everywhere
      </TextAction>
    </AuthShell>
  );
}

function SuperadminMFA({
  status,
  reload,
  refresh,
}: {
  status: AdminStatus;
  reload: () => Promise<AdminStatus>;
  refresh: () => Promise<unknown>;
}) {
  const [setup, setSetup] = useState<{
    totpURI: string;
    backupCodes: string[];
  } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    if (!status.verified) return;
    const timer = setInterval(() => {
      reload().catch(() => setMessage("Please verify account security again."));
    }, 30_000);
    return () => clearInterval(timer);
  }, [status.verified, reload]);
  async function perform(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function enroll() {
    return perform(async () => {
      const result = await authClient.twoFactor.enable({ method: "totp" });
      if (result.error || result.data?.method !== "totp")
        throw new Error(
          result.error?.message ?? "We couldn't begin authenticator setup.",
        );
      setSetup({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      setCode("");
      setSaved(false);
    });
  }
  function verify() {
    if (setup && !saved) {
      setMessage("Save your recovery codes before continuing.");
      return;
    }
    return perform(async () => {
      const result = recovery
        ? await authClient.twoFactor.verifyBackupCode({
            code: recoveryCode.trim(),
            disableSession: false,
          })
        : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error)
        throw new Error(result.error.message ?? "That code didn't work.");
      setSetup(null);
      setCode("");
      setRecoveryCode("");
      await refresh();
      await reload();
    });
  }
  return (
    <View
      style={{
        gap: 20,
        padding: 20,
        backgroundColor: palette.paper,
        borderRadius: 4,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderWidth: 1,
          borderColor: palette.stone,
          borderRadius: 4,
        }}
      />
      <Text
        accessibilityRole="header"
        style={[typography.heading, { fontSize: 28, lineHeight: 30 }]}
      >
        Superadmin security
      </Text>
      {status.verified ? (
        <Copy>
          Administrator access is verified. We’ll ask you to verify again after
          15 minutes or when you sign in on another session.
        </Copy>
      ) : (
        <>
          <Copy>
            {status.enrolled
              ? "Enter a code from your authenticator to unlock administrator access for this session."
              : "Set up your authenticator before using administrator tools. Email sign-in alone does not unlock them."}
          </Copy>
          {!status.enrolled && !setup && (
            <AuthButton onPress={enroll} disabled={busy}>
              Set up authenticator
            </AuthButton>
          )}
          {setup && (
            <>
              <Copy small>
                Scan this code with your authenticator app. Keep the setup key
                and recovery codes private.
              </Copy>
              <View
                style={{
                  alignSelf: "center",
                  padding: 12,
                  backgroundColor: "white",
                }}
              >
                <QRCode value={setup.totpURI} size={192} />
              </View>
              <Text
                selectable
                style={[typography.small, { fontFamily: fonts.label }]}
              >
                {new URL(setup.totpURI).searchParams.get("secret")}
              </Text>
              <Copy small>
                Save these recovery codes somewhere safe. Each code can be used
                once if you lose your authenticator.
              </Copy>
              <Text
                selectable
                style={[typography.small, { fontFamily: fonts.label }]}
              >
                {setup.backupCodes.join("\n")}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: saved }}
                onPress={() => setSaved(!saved)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={typography.body}>
                  {saved ? "☑" : "☐"} I saved my recovery codes
                </Text>
              </Pressable>
            </>
          )}
          {(status.enrolled || setup) && (
            <>
              {recovery ? (
                <RecoveryField
                  value={recoveryCode}
                  onChange={setRecoveryCode}
                  disabled={busy}
                  onSubmit={verify}
                />
              ) : (
                <RecoveryField
                  numeric
                  value={code}
                  onChange={setCode}
                  disabled={busy}
                  onSubmit={verify}
                />
              )}
              <AuthButton
                disabled={
                  busy ||
                  (setup !== null && !saved) ||
                  (recovery ? !recoveryCode.trim() : !/^\d{6}$/.test(code))
                }
                onPress={verify}
                icon={assets.next}
              >
                {busy ? "Verifying…" : "Verify administrator access"}
              </AuthButton>
              {status.enrolled && (
                <TextAction
                  disabled={busy}
                  onPress={() => {
                    setRecovery(!recovery);
                    setMessage("");
                    setCode("");
                    setRecoveryCode("");
                  }}
                >
                  {recovery ? "Use my authenticator" : "Use a recovery code"}
                </TextAction>
              )}
            </>
          )}
        </>
      )}
      {Boolean(message) && (
        <Copy small error>
          {message}
        </Copy>
      )}
    </View>
  );
}

function RecoveryField({
  value,
  onChange,
  disabled,
  onSubmit,
  numeric = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  numeric?: boolean;
}) {
  return (
    <AuthField
      label={numeric ? "Authenticator code" : "Recovery code"}
      value={value}
      onChangeText={(text) =>
        onChange(numeric ? text.replace(/\D/g, "").slice(0, 6) : text)
      }
      keyboardType={numeric ? "number-pad" : "default"}
      autoComplete={numeric ? "one-time-code" : "off"}
      textContentType={numeric ? "oneTimeCode" : "none"}
      editable={!disabled}
      autoCapitalize="none"
      autoCorrect={false}
      onSubmitEditing={onSubmit}
      style={{ fontFamily: fonts.label, backgroundColor: palette.white }}
    />
  );
}
