import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AuthGate } from "@/components/AuthGate";
import { LiveTonightBanner } from "@/components/LiveTonightBanner";
import { NightModeProvider } from "@/components/NightMode";
import { BroadcastListener } from "@/components/BroadcastListener";
import { InstallGuide } from "@/components/InstallGuide";
import { MemoryPrompt } from "@/components/MemoryPrompt";
import { EVENT } from "@/config/event";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: EVENT.app.title,
  description: "Private invitation. Dublin, 27 June 2026. Grace's hen.",
  applicationName: EVENT.app.shortName,
  appleWebApp: {
    capable: true,
    title: EVENT.app.shortName,
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: EVENT.brand.icon,
  },
};

export const viewport: Viewport = {
  themeColor: EVENT.brand.colors.text,
  width: "device-width",
  initialScale: 1,
  // pinch-zoom left enabled (accessibility) — no maximumScale lock
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NightModeProvider>
          <AuthGate>
            <BroadcastListener />
            <LiveTonightBanner />
            <main className="flex-1 pb-28">{children}</main>
            <InstallGuide />
            <MemoryPrompt />
            <Nav />
          </AuthGate>
        </NightModeProvider>
      </body>
    </html>
  );
}
