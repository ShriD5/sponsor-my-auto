import type { Metadata } from "next";
import { Titan_One, Kalam, Inter } from "next/font/google";
import "./globals.css";

const titan = Titan_One({ weight: "400", subsets: ["latin"], variable: "--font-titan" });
const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin", "devanagari"], variable: "--font-kalam" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: "Sponsor My Auto — two rickshaws, one month, your logo",
  description:
    "Two auto rickshaws in Bengaluru, 30 days on the road. Buy the hood, the back panel, or the driver's tee. Anyone can take your slot for double.",
  openGraph: {
    title: "Sponsor My Auto",
    description: "Two rickshaws. One month. Your logo. Take over any slot for 2x.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Sponsor My Auto", description: "Two rickshaws. One month. Your logo." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${titan.variable} ${kalam.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col halftone">{children}</body>
    </html>
  );
}
