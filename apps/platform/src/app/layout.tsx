import { colors } from "@jungle-tribe/ui/tokens";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jungle Tribe | A home for plant people",
  description:
    "A new home for your plant collection and a community for in-home plant care. Growing first in Nashville.",
};

const theme = Object.fromEntries(
  Object.entries(colors).map(([name, value]) => [`--color-${name}`, value]),
) as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={theme}>
      <body>{children}</body>
    </html>
  );
}
