import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AutoCloudBackup from "./components/AutoCloudBackup";
import MainNavigation from "./components/MainNavigation";
import "./globals.css";

const appName = "Taiji Life Plan";
const appDescription =
  "Application personnelle de pilotage, objectifs, habitudes, planning et trajectoire";
const themeColor = "#14532d";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: appName,
  title: appName,
  description: appDescription,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};

export const viewport: Viewport = {
  themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MainNavigation />
        <AutoCloudBackup />
        {children}
      </body>
    </html>
  );
}
