import { type ReactNode, useEffect, useState } from "react";

export function SessionLoadingBoundary({
  pending,
  fallback,
  children,
}: {
  pending: boolean;
  fallback: ReactNode;
  children?: ReactNode;
}) {
  const [hasCheckedSession, setHasCheckedSession] = useState(!pending);
  useEffect(() => {
    if (!pending) setHasCheckedSession(true);
  }, [pending]);
  // Anonymous focus refetches are pending too. Replacing the form here would
  // unmount it and discard the email/code step while the collector checks email.
  return pending && !hasCheckedSession ? fallback : children;
}
