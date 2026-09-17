import type { Metadata } from "next";
import { Titan_One, Kalam, Inter } from "next/font/google";
import "./globals.css";

const titan = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-titan" });
const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin", "devanagari"], variable: "--font-kalam" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "Sponsor My Auto — your logo on a Bengaluru rickshaw for a month",
  description:
    "One auto rickshaw, 30 days on Bengaluru roads. Buy the hood or the driver's tee, no account needed. Anyone can take your slot for double and you get refunded in full.",
  openGraph: {
    title: "Sponsor My Auto",
    description: "One rickshaw. One month. Your logo on the hood. Anyone can take it for double.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Sponsor My Auto", description: "One rickshaw. One month. Your logo on the hood." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titan.variable} ${kalam.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col halftone">{children}</body>
    </html>
  );
}
