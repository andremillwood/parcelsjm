import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";
export default function Rates() {
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <BrandLogo />
          <Link className="btn" href="/register">
            Preview registration
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="section pale">
        <div className="wrap">
          <div className="tag">Clear shipping costs</div>
          <h1 style={{ color: "#0b1f3b" }}>Rates being updated.</h1>
          <p className="intro">
            We are validating our freight, consolidation and administrative
            costs before publishing the new price schedule. Historical rates
            should not be used for live quotes.
          </p>
          <div className="card" style={{ maxWidth: 600, marginTop: 30 }}>
            <h3>Estimate unavailable</h3>
            <p>
              No approved rate card is available. This preview cannot provide a
              quote. Charges and service availability must be confirmed before
              booking.
            </p>
            <Link href="/">← Back to website</Link>
          </div>
        </div>
      </main>
    </>
  );
}
