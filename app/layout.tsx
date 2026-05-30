import type { Metadata } from "next";
import { Inter, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "121.ai by LendLoop — peer-to-peer lending for NCI",
  description: "Lend to your peers. Borrow from your community. Peer-to-peer lending for the National College of Ireland community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
