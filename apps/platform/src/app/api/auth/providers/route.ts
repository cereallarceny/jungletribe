import { getAuth } from "@/lib/auth";
import { createAuthHandler } from "@/lib/auth-handler";

export const runtime = "nodejs";

function handle(request: Request) {
  const auth = getAuth();
  return createAuthHandler(
    {
      handler: async () =>
        Response.json({ google: Boolean(auth.options.socialProviders.google) }),
    },
    auth.options.trustedOrigins as string[],
  )(request);
}

export { handle as GET, handle as OPTIONS };
