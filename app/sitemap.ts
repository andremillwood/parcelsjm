import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/how-it-works",
    "/services",
    "/rates",
    "/business",
    "/help",
    "/contact",
    "/about",
    "/tracking",
    "/register",
    "/legal/terms",
    "/legal/privacy",
    "/legal/shipping-policy",
  ].map((path) => ({ url: `https://parcelsjm.com${path}` }));
}
