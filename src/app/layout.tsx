import type { Metadata } from "next";
import { Titan_One, Kalam, Inter } from "next/font/google";
import "./globals.css";

const titan = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-titan" });
const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin", "devanagari"], variable: "--font-kalam" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "Sponsor My Auto — your logo on a Bengaluru auto-rickshaw (tuk tuk) for 30 days",
  description:
    "One auto-rickshaw (tuk tuk), 30 days in Bengaluru traffic. Six slots, no account needed. Anyone can take your slot by paying double and you get every dollar back.",
  keywords: ["tuk tuk", "auto rickshaw", "Bengaluru", "startup sponsorship", "sponsor my", "logo placement", "Bangalore"],
  openGraph: {
    title: "Sponsor My Auto — a Bengaluru tuk tuk, your logo, 30 days",
    description: "One auto-rickshaw. One month. Your logo on the hood. Anyone can take it for double; you get every dollar back.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Sponsor My Auto — a Bengaluru tuk tuk, your logo, 30 days", description: "One auto-rickshaw. One month. Your logo on the hood. Anyone can take it for double." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titan.variable} ${kalam.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col halftone">{children}</body>
    </html>
  );
}
