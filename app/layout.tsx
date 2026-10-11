import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
export const metadata: Metadata = {
  title: "Parcels JA | Development preview",
  description:
    "Preview the planned Parcels JA customer experience. Registration and shipping services are not activated in this demonstration.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="preview-banner">
          Development preview — no live accounts, uploads or shipping quotes.
        </div>
        {children}
      </body>
    </html>
  );
}
