import { AccountIllustration } from "../../components/marketing/account-illustration";
import Image from "next/image";
import Link from "next/link";
import { Arrow, ButtonLink, CTA, Eyebrow } from "../../components/marketing/ui";
import { FAQ } from "../../components/marketing/content";
import { pageMetadata } from "../../lib/metadata";
export const metadata = pageMetadata(
  "For the things you can’t wait to make yours.",
  "Shopping in the US, living in Jamaica? Explore Parcels JA: your packages, pre-alerts and documents in one place. Track your shipments and arrange delivery or pickup.",
  "/",
);
const features = [
  [
    "Pre-alerts",
    "Give every purchase a place.",
    "Add the store, tracking number and purchase details before the package arrives.",
  ],
  [
    "Documents",
    "Keep the paperwork with the package.",
    "See what’s requested, submit the right document and follow its review status.",
  ],
  [
    "Next actions",
    "Know what needs your attention.",
    "Check recorded package updates and outstanding requests together in your account.",
  ],
];
export default function Home() {
  return (
    <div className="m-crafted-home">
      <section className="m-hero m-campaign-hero">
        <div className="m-container m-hero-grid">
          <div className="m-hero-copy">
            <Eyebrow>Shopping in the US. Living in Jamaica.</Eyebrow>
            <h1>
              That feeling.
              <br />
              <em>Make it yours.</em>
            </h1>
            <p>
              Your packages, purchase details and requested documents, together
              in one Parcels JA account.
            </p>
            <div className="m-campaign-actions">
              <ButtonLink href="/register">Create account</ButtonLink>
            </div>
            <p className="m-small">
              Verify your email to activate your assigned US shipping address.
            </p>
          </div>
          <figure className="m-lifestyle m-hero-lifestyle">
            <div className="m-lifestyle-frame">
              <Image
                src="/marketing/unpack-at-home.webp"
                alt="Illustrative scene of a woman unpacking new sneakers in a sunlit Jamaican home"
                fill
                priority
                sizes="100vw"
              />
            </div>
          </figure>
        </div>
      </section>
      <nav
        className="m-shipping-entry m-container"
        aria-label="Shipping shortcuts"
      >
        <Link href="/tracking">
          <span>01</span>
          <strong>Track your package</strong>
          <Arrow />
        </Link>
        <Link href="/how-it-works">
          <span>02</span>
          <strong>Plan your next purchase</strong>
          <Arrow />
        </Link>
        <Link href="/help">
          <span>03</span>
          <strong>Get shipping help</strong>
          <Arrow />
        </Link>
      </nav>
      <section id="the-experience" className="m-section m-account-story">
        <div className="m-container">
          <div className="m-section-heading">
            <h2>
              Less wondering.
              <br />
              More knowing.
            </h2>
            <p>
              The order is only the beginning. Keep the details together so you
              can see what’s submitted and what comes next.
            </p>
          </div>
          <AccountIllustration />
          <div className="m-detail-rows">
            {features.map(([label, title, copy]) => (
              <article className="m-detail-row" key={label}>
                <p className="m-detail-label">{label}</p>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section m-warm m-preparation">
        <div className="m-container">
          <div className="m-preparation-heading">
            <h2>Before you click “buy”.</h2>
            <Link className="m-text-link" href="/how-it-works">
              See how it works <Arrow />
            </Link>
          </div>
          <ol className="m-preparation-steps">
            {[
              [
                "Start with your account",
                "Create your account with your home address and TRN. Verify your email to activate your personal US shipping address.",
              ],
              [
                "Prepare your purchase",
                "Once your account and address are approved, add a pre-alert and any requested documents.",
              ],
              [
                "Follow the next step",
                "Check recorded updates and requests in your account; shipment dates are confirmed separately.",
              ],
            ].map(([title, copy], i) => (
              <li key={title}>
                <span className="m-step-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <p className="m-shipping-qualification">
            Confirm service availability, an approved shipping address and
            applicable charges before placing your order.
          </p>
        </div>
      </section>
      <section className="m-section m-business-story">
        <div className="m-container">
          <figure className="m-lifestyle m-business-lifestyle">
            <div className="m-lifestyle-frame">
              <Image
                src="/marketing/small-business-jamaica.webp"
                alt="Illustrative scene of a Jamaican small-business owner checking textiles and purchase details at his studio table"
                fill
                sizes="(max-width: 900px) 100vw, 1168px"
              />
            </div>
          </figure>
          <div className="m-business-caption">
            <div>
              <h2>
                For the business
                <br />
                you’re building.
              </h2>
              <Link className="m-text-link" href="/business">
                Explore business shipping <Arrow />
              </Link>
            </div>
            <div>
              <p>
                When a purchase is part of your livelihood, the details matter.
                Keep package information and documents together, then explore
                what your business needs.
              </p>
              <p className="m-small">
                Business services, arrangements and pricing require
                confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="m-section m-questions">
        <div className="m-container">
          <div className="m-questions-heading">
            <h2>
              Get clear before
              <br />
              you commit.
            </h2>
            <Link className="m-text-link" href="/help">
              Visit the help centre <Arrow />
            </Link>
          </div>
          <FAQ limit={4} />
        </div>
      </section>
      <CTA />
    </div>
  );
}
