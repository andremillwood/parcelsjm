import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";
function Nav() {
  return (
    <header className="nav">
      <div className="wrap">
        <BrandLogo />
        <div className="links">
          <Link href="/#how">How it works</Link>
          <Link href="/rates">Rates</Link>
          <Link href="/dashboard">App demo</Link>
          <Link className="btn" href="/register">
            Preview registration →
          </Link>
        </div>
      </div>
    </header>
  );
}
export default function Home() {
  return (
    <>
      <Nav />
      <main id="main-content" tabIndex={-1}>
        <section className="hero">
          <div className="wrap">
            <div>
              <div className="tag">
                Your shopping. Your packages. Your control.
              </div>
              <h1>
                More than shipping.
                <br />
                <span>Peace of mind.</span>
              </h1>
              <p className="lead">
                Explore the planned Parcels JA experience for US purchases
                coming to Jamaica: shipping address assignment, documents and
                package updates in one place.
              </p>
              <div className="buttons">
                <Link href="/register" className="btn">
                  Preview registration →
                </Link>
                <Link href="/dashboard" className="ghost">
                  Explore the dashboard
                </Link>
              </div>
              <p style={{ fontSize: 12, color: "#bcd0e3" }}>
                Account activation coming in the next build. This is a frontend
                preview.
              </p>
            </div>
            <div className="planet" aria-hidden="true">
              ✈
            </div>
          </div>
        </section>
        <section className="section pale">
          <div className="wrap">
            <div className="tag">Why Parcels JA</div>
            <h2>Your package journey, simplified.</h2>
            <p className="intro">
              A preview of the tools being developed for an organized import
              experience.
            </p>
            <div className="cards">
              {[
                [
                  "01",
                  "Shipping address",
                  "Register and receive your assigned US shipping address when your account is activated.",
                ],
                [
                  "02",
                  "Documents together",
                  "Keep purchase invoices and other requested paperwork attached to the package they belong to.",
                ],
                [
                  "03",
                  "Updates with context",
                  "See verified shipment movements and understand what action is needed next.",
                ],
              ].map((x) => (
                <article className="card" key={x[0]}>
                  <div className="tag">{x[0]}</div>
                  <h3>{x[1]}</h3>
                  <p>{x[2]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section id="how" className="section dark">
          <div className="wrap">
            <div className="tag">How it works</div>
            <h2>Four steps. One place.</h2>
            <div className="steps">
              {[
                ["01", "Join", "Create a customer profile."],
                [
                  "02",
                  "Shop",
                  "Use your assigned address and pre-alert your order.",
                ],
                [
                  "03",
                  "Prepare",
                  "Upload your invoice and check required actions.",
                ],
                [
                  "04",
                  "Receive",
                  "Follow verified updates and arrange collection.",
                ],
              ].map((s) => (
                <div className="step" key={s[0]}>
                  <b>{s[0]}</b>
                  <h3>{s[1]}</h3>
                  <p>{s[2]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="wrap">
            <div className="tag">For repeat shippers</div>
            <h2>Built for business, too.</h2>
            <p className="intro">
              A single view of shipments and documents for resellers and
              commercial importers. Business pricing will follow confirmed cost
              analysis.
            </p>
            <Link className="btn" href="/register">
              Preview a business account →
            </Link>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          <BrandLogo />
          Parcels JA · Connecting You to What Matters ·{" "}
          <Link href="/rates">Rates</Link> ·{" "}
          <Link href="/dashboard">Demo app</Link>
        </div>
      </footer>
    </>
  );
}
