import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToasterClient } from "@/components/ToasterClient";
import { AppInitializer } from "@/components/AppInitializer";
import ErrorBoundaryProvider from "@/components/providers/ErrorBoundaryProvider";
import { ClientBodyWrapper } from "@/components/ClientBodyWrapper";

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
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        {/* Preconnect to Google Fonts for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Preconnect to API */}
        <link rel="preconnect" href="/api" />
      </head>
      <body className={`${inter.variable} ${notoSansKhmer.variable} font-sans antialiased`}>
        <ClientBodyWrapper>
          <ErrorBoundaryProvider>
            <QueryProvider>
              <ThemeProvider>
                <AuthProvider>
                  <AppInitializer>
                    <ToasterClient />
                    {children}
                  </AppInitializer>
                </AuthProvider>
              </ThemeProvider>
            </QueryProvider>
          </ErrorBoundaryProvider>
        </ClientBodyWrapper>
      </body>
    </html>
  );
}
