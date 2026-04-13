import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings/SettingsContext";
import TimerOverlay from "@/components/ui/TimerOverlay";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "TinyTap 兒童樂園",
  description: "專為幼兒設計的安全觸控遊戲 App",
  applicationName: "TinyTap 兒童樂園",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TinyTap 兒童樂園",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF69B4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${nunito.variable} h-full`}>
      <head>
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-nunito)]">
        <SettingsProvider>
          {children}
          <TimerOverlay />
        </SettingsProvider>
      </body>
    </html>
  );
}
