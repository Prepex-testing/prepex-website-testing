import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { InlineThemeScript } from "@/components/theme/InlineThemeScript";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Prepex",
  description: "Plan. Execute. Survive. Win.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prepex",
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
      className={`${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
