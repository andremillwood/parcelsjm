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
  ].map((path) => ({ url: `https://parcelsjm.com${path}` }));
}
