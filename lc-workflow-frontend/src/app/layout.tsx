import type { Metadata } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToasterClient } from "@/components/ToasterClient";

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
  description: "Loan application workflow management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className={`${inter.variable} ${notoSansKhmer.variable} font-sans antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <ToasterClient />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
