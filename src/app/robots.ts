import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL || "https://sponsormyauto.lol";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/thanks", "/film", "/admin"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
