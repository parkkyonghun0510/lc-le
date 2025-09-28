import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToasterClient } from "@/components/ToasterClient";
import { AppInitializer } from "@/components/AppInitializer";
import ErrorBoundaryProvider from "@/components/providers/ErrorBoundaryProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const notoSansKhmer = Noto_Sans_Khmer({ 
  subsets: ["khmer"],
  variable: "--font-khmer",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"]
});

export const metadata: Metadata = {
  title: "LC Workflow System",
  description: "Mobile-optimized loan application workflow management system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LC Workflow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <head>
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LC Workflow" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Preconnect to improve performance */}
        <link rel="preconnect" href="/api" />
        
        {/* Apple touch icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/icon-57x57.png" />
      </head>
      <body className={`${inter.variable} ${notoSansKhmer.variable} font-sans antialiased`}>
        <ErrorBoundaryProvider>
          <QueryProvider>
            <ThemeProvider useBackendSettings={true}>
              <AuthProvider>
                <AppInitializer>
                  <ToasterClient />
                  {children}
                </AppInitializer>
              </AuthProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
