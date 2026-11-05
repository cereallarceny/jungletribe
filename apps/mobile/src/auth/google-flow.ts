type Options = {
  provider: "google";
  callbackURL: string;
  errorCallbackURL: string;
};
type Result<T = unknown> = {
  data?: T | null;
  error?: { message?: string } | null;
};
type GoogleClient = {
  signIn: (options: Options) => Promise<Result>;
  link: (options: Options) => Promise<Result>;
  session: () => Promise<Result>;
  accounts: () => Promise<Result<{ providerId: string }[]>>;
};

export async function runGoogleFlow(
  client: GoogleClient,
  options: { callbackURL: string; native: boolean; link: boolean },
) {
  const request = {
    provider: "google" as const,
    callbackURL: options.callbackURL,
    errorCallbackURL: options.callbackURL,
  };
  const result = await (options.link
    ? client.link(request)
    : client.signIn(request));
  if (result.error)
    throw new Error(
      result.error.message ??
        "We couldn't open Google sign-in. Try again or use email.",
    );
  if (!options.native) return;
  // The Expo browser adapter resolves silently on cancel/dismiss. Confirm the
  // authoritative result instead of treating a resolved SDK call as success.
  if (options.link) {
    const accounts = await client.accounts();
    if (
      accounts.error ||
      !accounts.data?.some((account) => account.providerId === "google")
    )
      throw new Error("Google connection didn't finish. Try again.");
  } else {
    const session = await client.session();
    if (session.error || !session.data)
      throw new Error(
        "Google sign-in was cancelled or didn't finish. Try again or use email.",
      );
  }
}
