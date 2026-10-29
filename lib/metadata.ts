import type { Metadata } from "next";
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  // Canonical production domain.
  const url = `https://parcelsjm.com${path}`;
  return {
    title: `${title} | Parcels JA`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Parcels JA",
      locale: "en_JM",
      type: "website",
      images: [
        {
          url: "https://parcelsjm.com/brand/parcels-ja-original.jpeg",
          width: 1536,
          height: 1024,
          alt: "Parcels JA",
        },
      ],
    },
  };
}
