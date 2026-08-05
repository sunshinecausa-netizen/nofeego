import type { Metadata } from "next";
import type { ReactNode } from "react";

import { defaultLocale, localeMetadata } from "@/i18n/config";

import "./globals.css";

export const metadata: Metadata = {
  title: "Manhattan AI | New York City Rentals",
  description:
    "Discover verified rental buildings and neighborhoods across New York City.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang={localeMetadata[defaultLocale].htmlLang}>
      <body>{children}</body>
    </html>
  );
}
