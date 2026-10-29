import Link from "next/link";
import { BrandLogo } from "../brand-logo";
export function SiteFooter() {
  return (
    <footer className="m-footer">
      <div className="m-container">
        <div className="m-footer-grid">
          <div>
            <BrandLogo />
            <p className="m-footer-promise">
              Connecting You
              <br />
              to What Matters.
            </p>
            <p className="m-small">
              Your packages. Your next step. All in one place.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/services">Services</Link>
            <Link href="/rates">Rates</Link>
            <Link href="/business">For business</Link>
          </div>
          <div>
            <h2>Here to help</h2>
            <Link href="/help">Help & FAQs</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/tracking">Tracking</Link>
            <Link href="/about">About Parcels JA</Link>
          </div>
          <div>
            <h2>Before you ship</h2>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/shipping-policy">Shipping policy</Link>
            <Link href="/app">My account</Link>
          </div>
        </div>
        <div className="m-footer-bottom">
          <span>© {new Date().getFullYear()} Parcels JA</span>
          <span>
            Delivery and pickup arrangements are confirmed in your account.
          </span>
          <a href="#main-content">Back to content ↑</a>
        </div>
      </div>
    </footer>
  );
}
