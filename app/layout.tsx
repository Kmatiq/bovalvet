import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0d1311",
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
    statusBarStyle: "black-translucent",
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
      <body className="antialiased bg-[#0d1311]">{children}</body>
    </html>
  );
}