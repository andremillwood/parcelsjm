import { WorkspaceIcon, type IconName } from "./icons";
import { SignOut } from "../auth/sign-out";
import Link from "next/link";
import { BrandLogo } from "../brand-logo";
export function WorkspaceShell({
  admin = false,
  demo = false,
  staff = false,
  superadmin = false,
  path = "",
  name,
  children,
}: {
  admin?: boolean;
  demo?: boolean;
  staff?: boolean;
  superadmin?: boolean;
  path?: string;
  name: string;
  children: React.ReactNode;
}) {
  const root = `${demo ? "/preview" : ""}/${admin ? "admin" : "app"}`;
  const links = admin
    ? [
        ["", "Overview"],
        ["queues", "Work queues"],
        ["customers", "Customers"],
        ["packages", "Packages"],
        ["shipments", "Consolidations"],
        ["intake", "Unmatched intake"],
        ["documents", "Document review"],
        ["support", "Support"],
        ["billing", "Billing & collections"],
        ["audit", "Audit history"],
        ["settings", "Settings"],
      ]
    : [
        ["", "Overview"],
        ["packages", "My packages"],
        ["pre-alert/new", "New pre-alert"],
        ["documents", "Documents"],
        ["billing", "Billing"],
        ["support", "Get help"],
        ["profile", "My profile"],
      ];
  const iconFor: Record<string, IconName> = {
    "": "overview",
    packages: "package",
    "pre-alert/new": "add",
    documents: "documents",
    billing: "billing",
    support: "support",
    profile: "profile",
    queues: "queue",
    customers: "customers",
    shipments: "shipments",
    intake: "intake",
    audit: "audit",
    settings: "settings",
  };
  const current =
    links.find(
      ([href]) => href === path || (href && path.startsWith(href + "/")),
    )?.[1] ?? "Overview";
  const navigation = (
    <>
      {links.map(([href, text]) => (
        <Link
          key={href}
          href={`${root}${href ? `/${href}` : ""}`}
          aria-current={
            path === href
              ? "page"
              : href && path.startsWith(href + "/")
                ? "location"
                : undefined
          }
        >
          <WorkspaceIcon name={iconFor[href] ?? "package"} />
          {text}
        </Link>
      ))}
    </>
  );
  return (
    <div className="workspace">
      <aside className="w-sidebar">
        <BrandLogo />
        <p className="w-eyebrow">
          {admin ? "Operations workspace" : "Your shipping workspace"}
        </p>
        <nav
          aria-label={admin ? "Operations navigation" : "Customer navigation"}
        >
          {navigation}
        </nav>
        <div className="w-sidebar-bottom">
          <div className="w-avatar">{name.slice(0, 1)}</div>
          <div>
            <strong>{name}</strong>
            <small>
              {demo
                ? "Fictional preview"
                : superadmin
                  ? "Superadmin"
                  : admin
                    ? "Staff account"
                    : "Customer account"}
            </small>
          </div>
        </div>
        <Link className="w-back" href="/">
          <WorkspaceIcon name="back" /> Back to website
        </Link>
      </aside>
      <div className="w-main">
        <header className="w-topbar">
          <div className="w-breadcrumb">
            <Link href={root}>{admin ? "Operations" : "My account"}</Link>
            <span aria-hidden="true">/</span>
            <span>{current}</span>
          </div>
          <Link
            href={
              demo ? `/preview/${admin ? "app" : "admin"}` : "/app/security"
            }
          >
            {demo
              ? `Explore ${admin ? "customer" : "operations"} preview`
              : "Account security"}
          </Link>
        </header>
        {!demo && staff && (
          <nav className="w-mode-switch" aria-label="Application switcher">
            <span>{superadmin ? "Superadmin" : "Staff access"}</span>
            <Link href="/app" aria-current={!admin ? "page" : undefined}>
              Customer app
            </Link>
            <Link href="/admin" aria-current={admin ? "page" : undefined}>
              Admin app
            </Link>
          </nav>
        )}
        <details className="w-mobile-menu">
          <summary>
            {admin ? "Operations" : "Account"} menu{" "}
            <WorkspaceIcon name="menu" />
          </summary>
          <nav aria-label="Workspace mobile navigation">{navigation}</nav>
        </details>
        <main id="main-content" tabIndex={-1} className="w-content">
          {demo && (
            <div className="w-demo">
              <strong>Interactive design preview</strong>
              <span>
                All records are fictional. Changes stay in this page and are not
                saved or sent.
              </span>
            </div>
          )}
          {children}
        </main>
        {!demo && (
          <div className="w-pad">
            <SignOut />
          </div>
        )}
        <footer className="w-bottom">
          Parcels JA <span>Clear details. Confident next steps.</span>
        </footer>
      </div>
    </div>
  );
}
