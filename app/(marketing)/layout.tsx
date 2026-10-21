import type { ReactNode } from "react";
import { SiteHeader } from "../../components/marketing/site-header";
import { SiteFooter } from "../../components/marketing/site-footer";
import "./marketing.css";
import "./logistics.css";
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
