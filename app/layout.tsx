import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import SessionTimeout from "@/components/SessionTimeout";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "St. Saviours GAA & LGFA",
  description: "Pitch booking, fixtures, results and club management for St. Saviours GAA & LGFA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionTimeout />
        {children}
      </body>
    </html>
  );
}
