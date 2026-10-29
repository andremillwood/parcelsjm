import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app",
        "/admin",
        "/api/",
        "/auth/",
        "/preview/",
        "/dashboard",
      ],
    },
    sitemap: "https://parcelsjm.com/sitemap.xml",
  };
}
