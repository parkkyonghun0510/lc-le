import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToasterClient } from "@/components/ToasterClient";
import { AppInitializer } from "@/components/AppInitializer";
import { UploadStatusDisplay } from "@/components/files/UploadStatusDisplay";
import { NetworkStatusIndicator } from "@/components/ui/NetworkStatusIndicator";

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
    icon: [],
    apple: [],
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
        
        {/* Apple touch icons - removed until icons are created */}
      </head>
      <body className={`${inter.variable} ${notoSansKhmer.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider useBackendSettings={true}>
            <AuthProvider>
              <AppInitializer>
                <ToasterClient />
                <UploadStatusDisplay />
                <NetworkStatusIndicator position="top-left" />
                {children}
              </AppInitializer>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
