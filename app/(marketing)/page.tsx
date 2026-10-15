import Image from "next/image";
import Link from "next/link";
import { ButtonLink, CTA, Eyebrow } from "../../components/marketing/ui";
import { FAQ } from "../../components/marketing/content";
import { pageMetadata } from "../../lib/metadata";
export const metadata = pageMetadata(
  "For the things you can’t wait to make yours.",
  "Shopping in the US, living in Jamaica? Explore Parcels JA: your packages, pre-alerts and documents in one place. Registration and rates are not yet active.",
  "/",
);
export default function Home() {
  return (
    <>
      <section className="m-hero m-campaign-hero">
        <div className="m-container m-hero-grid">
          <div className="m-hero-copy">
            <Eyebrow>Shopping in the US. Living in Jamaica.</Eyebrow>
            <h1>
              That find.
              <br />
              That feeling.
              <br />
              <em>Make it yours.</em>
            </h1>
            <p>
              For the things you can’t wait to unpack. Get to know an account
              that brings your packages, pre-alerts and documents together.
            </p>
            <ButtonLink href="/register">Explore registration</ButtonLink>
            <p className="m-small">
              Registration preview. Shipping address activation is not yet
              available.
            </p>
            <div className="m-hero-links">
              <Link href="/how-it-works">
                See how it works <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/preview/app">
                Look inside the app <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <figure className="m-lifestyle m-hero-lifestyle">
            <div className="m-lifestyle-frame">
              <Image
                src="/marketing/unpack-at-home.webp"
                alt="Illustrative scene of a woman unpacking new sneakers in a sunlit Jamaican home"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
              />
              <div className="m-photo-note" aria-hidden="true">
                <span>A LITTLE ANTICIPATION.</span>
                <strong>A very good feeling.</strong>
              </div>
            </div>
          </figure>
        </div>
        <div className="m-container m-hero-bottom">
          <span>YOUR PURCHASE. YOUR PLANS. YOUR NEXT STEP.</span>
          <a href="#the-experience">Meet your Parcels JA experience ↓</a>
        </div>
      </section>
      <section id="the-experience" className="m-section m-warm">
        <div className="m-container">
          <div className="m-section-heading">
            <div>
              <Eyebrow>Make room for the exciting part</Eyebrow>
              <h2>
                Less wondering.
                <br />
                More knowing.
              </h2>
            </div>
            <p>
              The order is only the beginning. Keep the details together so it’s
              easier to see what you’ve submitted and what needs your attention.
            </p>
          </div>
          <div className="m-feature-grid">
            {[
              [
                "01",
                "Remember the purchase. Not every detail.",
                "Add a pre-alert with your store, tracking number and purchase details. Give each expected package a place in your account.",
              ],
              [
                "02",
                "The right paperwork. In the right place.",
                "See which document is requested for which package, submit it and follow its review status.",
              ],
              [
                "03",
                "Know what needs you next.",
                "See recorded package updates and outstanding requests together. Check the next action without piecing it together yourself.",
              ],
            ].map(([number, title, copy]) => (
              <article className="m-feature" key={number}>
                <span className="m-number">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="m-experience-link">
            <Link className="m-text-link" href="/preview/app">
              Try the customer app demo <span aria-hidden="true">↗</span>
            </Link>
            <span>
              Explore with fictional sample packages. No account needed.
            </span>
          </div>
        </div>
      </section>
      <section className="m-section">
        <div className="m-container m-split">
          <div>
            <Eyebrow>Before you click “buy”</Eyebrow>
            <h2>
              A little preparation.
              <br />A clearer journey.
            </h2>
            <p className="m-prose">
              Found something you love? First, understand the shipping process.
              Confirm service availability, an approved address and the
              applicable charges before placing your order.
            </p>
            <ButtonLink href="/how-it-works" secondary>
              Plan your first shipment
            </ButtonLink>
          </div>
          <ol className="m-process">
            {[
              [
                "Start with your account",
                "Registration and address activation are not yet open. Explore the steps now so you know what to expect.",
              ],
              [
                "Prepare your purchase details",
                "Once your account and address are approved, add a pre-alert and any requested documents.",
              ],
              [
                "Follow the next step",
                "Check recorded updates and requests in your account. Shipment dates are confirmed separately.",
              ],
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
      <section className="m-section m-business-story">
        <div className="m-container m-story-grid">
          <figure className="m-lifestyle m-business-lifestyle">
            <div className="m-lifestyle-frame">
              <Image
                src="/marketing/small-business-jamaica.webp"
                alt="Illustrative scene of a Jamaican small-business owner checking textiles and purchase details at his studio table"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
          </figure>
          <div className="m-story-copy">
            <Eyebrow>For the business you’re building</Eyebrow>
            <h2>
              Big plans.
              <br />
              Small details.
              <br />
              <em>Keep them together.</em>
            </h2>
            <p>
              When a purchase is part of your livelihood, the details matter.
              Explore a place for your package information and documents, then
              tell us what your business needs.
            </p>
            <ButtonLink href="/business">Explore business shipping</ButtonLink>
            <p className="m-small">
              Business services, arrangements and pricing require confirmation.
            </p>
          </div>
        </div>
      </section>
      <section className="m-section m-warm">
        <div className="m-container m-split">
          <div>
            <Eyebrow>Confidence starts with the facts</Eyebrow>
            <h2>
              Before you commit,
              <br />
              get clear.
            </h2>
            <p>
              Check what’s available, what you’ll need and what still needs
              confirmation.
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
