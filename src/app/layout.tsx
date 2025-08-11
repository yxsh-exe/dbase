import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/ToasterProvider";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DBase — Visual Data Modeling",
  description: "Design database schemas visually. Collaborate, iterate, and export with ease.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.variable} ${geistMono.variable} antialiased font-sans`}>
          {children}
          <ToasterProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
