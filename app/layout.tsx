import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
export const metadata: Metadata = {
  title: "Parcels JA | Your shipping workspace",
  description:
    "Manage your Parcels JA account, track shipments, and arrange delivery or pickup.",
  robots: { index: true, follow: true },
  icons: {
    icon: { url: "/brand/parcels-ja-original.jpeg", type: "image/jpeg" },
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
