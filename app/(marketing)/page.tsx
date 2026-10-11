import Link from "next/link";
import { ButtonLink, CTA, Eyebrow } from "../../components/marketing/ui";
import { FAQ } from "../../components/marketing/content";
import { pageMetadata } from "../../lib/metadata";
export const metadata = pageMetadata(
  "Shop globally. Ship with clarity.",
  "Explore the Parcels JA shipping experience for US purchases coming to Jamaica. Registration and rates are not yet active.",
  "/",
);
export default function Home() {
  return (
    <>
      <section className="m-hero">
        <div className="m-container m-hero-grid">
          <div className="m-hero-copy">
            <Eyebrow>US purchases. Jamaica in mind.</Eyebrow>
            <h1>
              Shop globally.
              <br />
              Ship with <em>clarity.</em>
            </h1>
            <p>
              Your packages. Your documents. Your next step.
              <br className="m-desktop-break" /> An experience designed to bring
              it all together.
            </p>
            <ButtonLink href="/register">
              Get your US shipping address
            </ButtonLink>
            <p className="m-small">
              Explore registration. Address activation is not yet available.
            </p>
            <div className="m-hero-links">
              <Link href="/rates">
                Calculate shipping <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/tracking">
                Track your package <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div
            className="m-waybill"
            aria-label="Illustration of the planned package journey"
          >
            <div className="m-waybill-top">
              <span>PARCELS JA / THE JOURNEY</span>
              <span className="m-chip">Preview</span>
            </div>
            <div className="m-route">
              <div>
                <small>SHOP</small>
                <strong>US</strong>
                <span>United States</span>
              </div>
              <svg viewBox="0 0 160 64" aria-hidden="true">
                <path
                  d="M4 50 Q80 -30 156 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 6"
                />
                <path
                  d="m144 43 12 7-14 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <div>
                <small>DESTINATION</small>
                <strong>JM</strong>
                <span>Jamaica</span>
              </div>
            </div>
            <div className="m-waybill-rule" />
            <p className="m-eyebrow">Clarity at every step</p>
            <ol className="m-journey-list">
              <li>
                <span>01</span>
                <div>
                  <strong>Your address</strong>
                  <p>Assigned after account verification</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Your documents</strong>
                  <p>Matched to the right package</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Your next step</strong>
                  <p>Guided by verified shipment events</p>
                </div>
              </li>
            </ol>
            <div className="m-waybill-footer">
              <span className="m-barcode" aria-hidden="true" />
              <small>A planned workflow, not a live shipment.</small>
            </div>
          </div>
        </div>
        <div className="m-container m-hero-bottom">
          <span>CONNECTING YOU TO WHAT MATTERS</span>
          <a href="#the-experience">Explore the experience ↓</a>
        </div>
      </section>
      <section id="the-experience" className="m-section">
        <div className="m-container">
          <div className="m-section-heading">
            <div>
              <Eyebrow>Less chasing. More clarity.</Eyebrow>
              <h2>
                Know what’s next.
                <br />
                Keep moving.
              </h2>
            </div>
            <p>
              The planned Parcels JA account puts the details that matter in one
              place, from your first pre-alert to the next required action.
            </p>
          </div>
          <div className="m-feature-grid">
            {[
              [
                "01",
                "An address that’s yours",
                "A verified warehouse assignment and personal shipping identifier. No guesswork about where your order belongs.",
              ],
              [
                "02",
                "Paperwork in its place",
                "An invoice belongs with its package. See what’s requested, what’s under review and what needs another look.",
              ],
              [
                "03",
                "Updates with meaning",
                "A clear distinction between confirmed shipment events and actions still pending. No assumed arrival dates.",
              ],
            ].map(([number, title, copy]) => (
              <article className="m-feature" key={number}>
                <span className="m-number">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-split">
          <div>
            <Eyebrow>From order to next step</Eyebrow>
            <h2>
              A little preparation.
              <br />A clearer journey.
            </h2>
            <p className="m-prose">
              Know the process before you place an order. Start with a verified
              account and approved address, then prepare the information your
              package needs.
            </p>
            <ButtonLink href="/how-it-works" secondary>
              See how it works
            </ButtonLink>
          </div>
          <ol className="m-process">
            {[
              ["Register & verify", "Wait for your approved shipping address."],
              [
                "Shop & prepare",
                "Add a pre-alert and the requested documents.",
              ],
              ["Track & act", "Follow confirmed updates and required actions."],
            ].map(([title, description], i) => (
              <li key={title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-business-band">
          <div>
            <Eyebrow>For resellers & regular importers</Eyebrow>
            <h2>
              Your business has
              <br />
              enough moving parts.
            </h2>
            <p>
              Tell us what you import and how often. Business arrangements and
              pricing require review before they can be confirmed.
            </p>
            <ButtonLink href="/business">Explore business shipping</ButtonLink>
          </div>
          <div className="m-business-note">
            <span aria-hidden="true">↗</span>
            <h3>
              More context.
              <br />
              Better conversations.
            </h3>
            <p>
              Your volume, product categories and document needs help shape the
              right conversation.
            </p>
            <Link href="/business#inquiry">Start a business inquiry →</Link>
          </div>
        </div>
      </section>
      <section className="m-section m-soft">
        <div className="m-container m-split">
          <div>
            <Eyebrow>Before you ship</Eyebrow>
            <h2>
              Good questions.
              <br />
              Clear answers.
            </h2>
            <p>
              Start with the facts, including what is still being confirmed.
            </p>
            <Link className="m-text-link" href="/help">
              Visit the help centre ↗
            </Link>
          </div>
          <FAQ limit={4} />
        </div>
      </section>
      <CTA />
    </>
  );
}
