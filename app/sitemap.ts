import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  // Public launch is explicitly gated; do not advertise preview/demo URLs.
  return [];
}
