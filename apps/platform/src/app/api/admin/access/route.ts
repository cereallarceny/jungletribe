import { createAdminHandler } from "@/lib/admin-handler";
import { getAuth, getAuthPool } from "@/lib/auth";

export const runtime = "nodejs";

function handle(request: Request) {
  const auth = getAuth();
  return createAdminHandler(
    {
      getSession: (headers) => auth.api.getSession({ headers }),
      pool: getAuthPool(),
      email: process.env.SUPERADMIN_EMAIL,
      origins: auth.options.trustedOrigins as string[],
    },
    true,
  )(request);
}

export { handle as GET, handle as OPTIONS };
