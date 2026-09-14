import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InlineThemeScript } from "@/components/theme/InlineThemeScript";
import { AuthGate } from "@/components/auth/AuthGate";
import { RevisionSessionProvider } from "@/components/session/RevisionSessionProvider";
import { RevisionSessionBanner } from "@/components/session/RevisionSessionBanner";
import { FocusSessionBanner } from "@/components/session/FocusSessionBanner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Only used where a design calls for Inter explicitly (e.g. the profile
// avatar initial, the parent phone field); Plus Jakarta Sans stays the
// app-wide default.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "prepex",
  description: "Plan. Execute. Survive. Win.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "prepex",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0D2B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <RevisionSessionProvider>
            <AuthGate>
              <RevisionSessionBanner />
              <FocusSessionBanner />
              {children}
            </AuthGate>
            <RegisterServiceWorker />
          </RevisionSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
