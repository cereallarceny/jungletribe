import type { Pool } from "pg";
import { createAuthHandler } from "./auth-handler";
import { getSuperadminStatus } from "./superadmin";

type AuthSession = Parameters<typeof getSuperadminStatus>[1];

export function createAdminHandler(
  options: {
    getSession: (headers: Headers) => Promise<AuthSession>;
    pool: Pool;
    email?: string;
    schema?: string;
    origins: string[];
  },
  protectedResource = false,
) {
  return createAuthHandler(
    {
      async handler(request) {
        const session = await options.getSession(request.headers);
        const status = await getSuperadminStatus(
          { ...options, schema: options.schema ?? "auth" },
          session,
        );
        if (protectedResource && !status.verified) {
          return Response.json(
            { code: session ? "MFA_REQUIRED" : "UNAUTHORIZED" },
            { status: session ? 403 : 401 },
          );
        }
        return Response.json({
          ...status,
          role: status.verified ? "superadmin" : null,
        });
      },
    },
    options.origins,
  );
}
