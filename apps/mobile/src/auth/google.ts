import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { apiURL, authClient } from "./client";
import { runGoogleFlow } from "./google-flow";

export function useGoogleAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!apiURL) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    fetch(`${apiURL}/api/auth/providers`, {
      signal: controller.signal,
      credentials: "omit",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Provider unavailable");
        const providers = await response.json();
        if (!controller.signal.aborted) setAvailable(providers.google === true);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return available;
}

export async function startGoogle(link = false) {
  return runGoogleFlow(
    {
      signIn: (options) => authClient.signIn.social(options),
      link: (options) => authClient.linkSocial(options),
      session: () => authClient.getSession(),
      accounts: () => authClient.listAccounts(),
    },
    {
      callbackURL: Linking.createURL("/"),
      native: Platform.OS !== "web",
      link,
    },
  );
}

export function useGoogleCallbackError() {
  const url = Linking.useURL();
  if (!url) return "";
  try {
    const error = new URL(url).searchParams.get("error");
    if (!error) return "";
    if (
      [
        "account_not_linked",
        "oauth_account_not_linked",
        "unable_to_link_account",
      ].includes(error)
    )
      return "Sign in with your email first, then connect Google from your account.";
    if (error === "access_denied")
      return "Google sign-in was cancelled. Try again or use email.";
    return "Google sign-in didn't finish. Try again or use email.";
  } catch {
    return "";
  }
}
