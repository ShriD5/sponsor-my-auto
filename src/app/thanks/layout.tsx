import type { Metadata } from "next";

// per-purchase page with a bookmarkable id: keep it out of search results
export const metadata: Metadata = { title: "You're on it · Sponsor My Auto", robots: { index: false, follow: false } };

export default function ThanksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
