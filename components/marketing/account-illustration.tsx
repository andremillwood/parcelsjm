import Link from "next/link";
import { WorkspaceIcon as Icon } from "../workspace/icons";

/** A responsive account illustration, never a screenshot of a development session. */
export function AccountIllustration() {
  return (
    <figure className="m-account-figure">
      <div
        className="m-account-illustration"
        role="img"
        aria-label="Example Parcels JA account showing package progress, document requests and a personal US shipping address"
      >
        <div className="m-account-shell" aria-hidden="true">
          <aside className="m-account-sidebar">
            <strong className="m-account-brand">
              PARCELS <span>JA</span>
            </strong>
            <span className="m-account-nav-active">
              <Icon name="overview" /> Overview
            </span>
            <span>
              <Icon name="package" /> My packages
            </span>
            <span>
              <Icon name="documents" /> Documents
            </span>
            <span>
              <Icon name="profile" /> My profile
            </span>
            <small>Your shipping workspace</small>
          </aside>
          <div className="m-account-main">
            <div className="m-account-topline">
              <span>My account</span>
              <span>Customer account</span>
            </div>
            <div className="m-account-heading">
              <div>
                <span>Everything in one place</span>
                <h3>Your shipping overview</h3>
                <p>Follow your packages. Know the next step.</p>
              </div>
              <Icon name="package" />
            </div>
            <div className="m-account-summary">
              <div>
                <strong>3</strong>
                <span>Packages to follow</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Document requested</span>
              </div>
            </div>
            <div className="m-account-content">
              <div className="m-account-orders">
                <h4>Your packages</h4>
                {[
                  [
                    "Clothing order",
                    "In transit",
                    "Your package is on its way to Jamaica.",
                  ],
                  [
                    "Home essentials",
                    "Invoice requested",
                    "Add the purchase invoice to keep things moving.",
                  ],
                  [
                    "Books & stationery",
                    "Pre-alert received",
                    "Your purchase details are saved.",
                  ],
                ].map(([title, status, note]) => (
                  <div className="m-account-order" key={title}>
                    <span className="m-account-parcel">
                      <Icon name="package" />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{note}</p>
                      <span className="m-account-status">{status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="m-account-address">
                <Icon name="package" />
                <span>Your US shipping address</span>
                <strong>Ready for your next find.</strong>
                <p>
                  Your full name and personal PARJA number.
                  <br />
                  Your assigned US address, ready to copy from your account.
                </p>
                <small>Your own number. On every package.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>
        <span>
          Example account view. Sign in for your own packages and shipping
          address.
        </span>
        <Link href="/app" className="m-text-link">
          Open your account <Icon name="arrow" />
        </Link>
      </figcaption>
    </figure>
  );
}
