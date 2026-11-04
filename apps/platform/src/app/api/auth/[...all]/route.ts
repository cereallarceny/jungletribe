import { getAuth } from "@/lib/auth";
import { createAuthHandler } from "@/lib/auth-handler";

export const runtime = "nodejs";

function handle(request: Request) {
  const auth = getAuth();
  return createAuthHandler(
    auth,
    auth.options.trustedOrigins as string[],
  )(request);
}

export { handle as GET, handle as POST, handle as OPTIONS };
