import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { AuthGate } from "@/components/AuthGate";
import { LiveTonightBanner } from "@/components/LiveTonightBanner";

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
  title: "Grace & Mark — Summer 2026",
  description:
    "Private invitation. Dublin, 28 June 2026. The hen weekend of Grace Canning.",
  applicationName: "Grace & Mark",
  appleWebApp: {
    capable: true,
    title: "Grace & Mark",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <AuthGate>
          <LiveTonightBanner />
          <main className="flex-1 pb-28">{children}</main>
          <Nav />
        </AuthGate>
      </body>
    </html>
  );
}
