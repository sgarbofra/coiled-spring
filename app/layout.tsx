import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coiled Spring Strategy App",
  description: "Watchlist and portfolio module for LEAPS options.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}