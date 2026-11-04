import { randomUUID } from "node:crypto";
import { APIError } from "better-auth/api";

export async function sendSignInCode(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new APIError("SERVICE_UNAVAILABLE", {
      message:
        "Email sign-in is temporarily unavailable. Please try again later.",
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        from: "Jungle Tribe <hello@jungletribe.app>",
        to: [email],
        subject: "Your Jungle Tribe sign-in code",
        text: `Your Jungle Tribe sign-in code is ${code}.\n\nIt expires in 10 minutes and can be used once.\n\nIf you didn't request this code, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Email provider rejected delivery.");
  } catch {
    // Provider responses can contain recipient details; never expose or log them.
    throw new APIError("SERVICE_UNAVAILABLE", {
      message: "We couldn't send your code. Please try again in a minute.",
    });
  }
}
