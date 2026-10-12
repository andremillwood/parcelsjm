"use client";
import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";
import { useState } from "react";
const packages = [
  ["PJA-DEMO-104", "Online retailer", "5.2 lb", "In transit"],
  ["PJA-DEMO-105", "Marketplace seller", "2.0 lb", "Documents required"],
  ["PJA-DEMO-106", "Online retailer", "3.1 lb", "Delivered"],
];
export default function Dashboard() {
  const [tab, setTab] = useState("Overview");
  const [file, setFile] = useState("");
  return (
    <div className="shell">
      <aside className="aside">
        <BrandLogo />
        {["Overview", "Packages", "Documents", "Billing", "Support"].map(
          (x) => (
            <button
              type="button"
              key={x}
              aria-pressed={tab === x}
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
            >
              {x}
            </button>
          ),
        )}
        <Link href="/">← Website</Link>
      </aside>
      <main id="main-content" tabIndex={-1} className="main">
        <div className="tag">Customer workspace · interactive demo</div>
        <h1 className="page-title">
          {tab === "Overview" ? "Your packages, under control." : tab}
        </h1>
        <div className="alert">
          Demonstration only — package records are fictional. Authentication,
          files and notifications are not connected.
        </div>
        {tab !== "Overview" && (
          <p className="alert">
            {tab} is not connected. The sample overview below remains visible
            for demonstration.
          </p>
        )}
        <div className="metrics">
          {[
            ["03", "Total packages"],
            ["01", "In transit"],
            ["01", "Delivered"],
            ["01", "Needs attention"],
          ].map((x) => (
            <div className="metric" key={x[1]}>
              <strong>{x[0]}</strong>
              <small>{x[1]}</small>
            </div>
          ))}
        </div>
        <div className="grid">
          <div>
            <section className="panel">
              <h2 className="panel-title">Recent packages</h2>
              {/* Scroll region needs keyboard focus (WCAG 2.1.1), including Safari. */}
              <div
                role="region"
                aria-label="Sample packages"
                tabIndex={0}
                style={{ overflowX: "auto" }}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Source</th>
                      <th>Weight</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((x) => (
                      <tr key={x[0]}>
                        {x.map((v, i) => (
                          <td key={i}>
                            {i === 3 ? <span className="pill">{v}</span> : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <h2 className="panel-title">Shipment progress · PJA-DEMO-104</h2>
              <ol>
                <li>Pre-alert recorded</li>
                <li>Received at US warehouse</li>
                <li>In transit</li>
                <li>Pending: Jamaica processing and collection</li>
              </ol>
            </section>
          </div>
          <div>
            <section className="panel">
              <h2 className="panel-title">Action required</h2>
              <p>An invoice is needed for demo package PJA-DEMO-105.</p>
              <div
                style={{
                  border: "2px dashed #c3d0dd",
                  padding: 20,
                  borderRadius: 12,
                }}
              >
                <label htmlFor="demo-document">
                  <strong>Select a document</strong>
                </label>
                <p>Demo only: selected files stay on your device.</p>
                <input
                  id="demo-document"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")}
                />
                {file && <p>Selected: {file}</p>}
              </div>
            </section>
            <section className="panel">
              <h2 className="panel-title">Your US shipping address</h2>
              <p>
                Address details appear here when a real customer account is
                activated.
              </p>
              <Link href="/register">Preview registration →</Link>
            </section>
            <section className="panel">
              <h2 className="panel-title">Shipping updates</h2>
              <p>
                Resend notification delivery will be enabled after verified
                package events are connected.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
