import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#141917" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "BoValvet – Säkra hemmets värden",
  description: "Ditt smarta hemvalv med AI-inventering, kvittoarkiv och skadeunderlag.",
  applicationName: "BoValvet",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BoValvet",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "BoValvet – Säkra hemmets värden",
    description: "Smart hemvalv med AI-inventering, kvittohantering och skadeunderlag.",
    siteName: "BoValvet",
    locale: "sv_SE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased bg-[var(--color-bg)] text-[var(--color-text)]">{children}</body>
    </html>
  );
}