import { Barlow_400Regular } from "@expo-google-fonts/barlow/400Regular";
import { Barlow_500Medium } from "@expo-google-fonts/barlow/500Medium";
import { Barlow_600SemiBold } from "@expo-google-fonts/barlow/600SemiBold";
import { BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed/700Bold";
import { BarlowCondensed_800ExtraBold } from "@expo-google-fonts/barlow-condensed/800ExtraBold";
import { GoogleSans_500Medium } from "@expo-google-fonts/google-sans/500Medium";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountSession } from "./auth/AccountSession";
import { apiURL, authClient } from "./auth/client";
import { AuthShell, Copy, palette } from "./auth/components";
import { SessionLoadingBoundary } from "./auth/SessionLoadingBoundary";
import { SignIn } from "./auth/SignIn";

function SessionApp() {
  const session = authClient.useSession();
  return (
    <SessionLoadingBoundary
      pending={session.isPending}
      fallback={
        <AuthShell>
          <ActivityIndicator
            color={palette.olive}
            accessibilityLabel="Checking your session"
          />
        </AuthShell>
      }
    >
      {session.data ? (
        <AccountSession
          email={session.data.user.email}
          key={session.data.session.id}
          refresh={session.refetch}
        />
      ) : (
        <SignIn />
      )}
    </SessionLoadingBoundary>
  );
}

export default function App() {
  const [fontsLoaded, error] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    IBMPlexMono_500Medium,
    GoogleSans_500Medium,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        {error ? (
          <AuthShell>
            <Copy>We couldn’t load this page. Please reopen the app.</Copy>
          </AuthShell>
        ) : !fontsLoaded ? (
          <ActivityIndicator
            color={palette.olive}
            style={{ flex: 1 }}
            accessibilityLabel="Loading Jungle Tribe"
          />
        ) : apiURL ? (
          <SessionApp />
        ) : (
          <SignIn />
        )}
      </View>
    </SafeAreaProvider>
  );
}
