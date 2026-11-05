import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const apiURL = process.env.EXPO_PUBLIC_API_URL;
export const authClient = createAuthClient({
  baseURL: apiURL ?? "http://localhost:3000",
  fetchOptions: { timeout: 10_000 },
  plugins: [
    emailOTPClient(),
    twoFactorClient(),
    ...(Platform.OS === "web"
      ? []
      : [
          expoClient({
            scheme: "jungletribe",
            storagePrefix: `jungletribe-${(apiURL ?? "local").replace(/[^a-zA-Z0-9]/g, "_")}`,
            storage: SecureStore,
            disableCache: true,
          }),
        ]),
  ],
});

export async function getAdminStatus() {
  const cookie =
    Platform.OS === "web" ? undefined : await authClient.getCookie();
  const response = await fetch(`${apiURL}/api/admin/session`, {
    credentials: Platform.OS === "web" ? "include" : "omit",
    headers: cookie ? { Cookie: cookie } : {},
  });
  if (!response.ok) throw new Error("Unable to check administrator access.");
  return (await response.json()) as {
    candidate: boolean;
    enrolled: boolean;
    verified: boolean;
    role: "superadmin" | null;
  };
}
