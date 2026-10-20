import type { ReactNode } from "react";
export type IconName =
  | "overview"
  | "package"
  | "add"
  | "documents"
  | "billing"
  | "support"
  | "profile"
  | "queue"
  | "customers"
  | "shipments"
  | "intake"
  | "audit"
  | "settings"
  | "arrow"
  | "back"
  | "menu";
const paths: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" />
      <path d="m3 8 9 5 9-5M12 13v8M8 5l9 5" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  documents: (
    <>
      <path d="M14 3H5v18h14V8l-5-5Z" />
      <path d="M14 3v5h5M8 12h8M8 16h6" />
    </>
  ),
  billing: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  support: (
    <>
      <path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 1 1 18 0Z" />
      <path d="M7 10h10M7 14h6" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  queue: (
    <>
      <path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" />
    </>
  ),
  shipments: (
    <>
      <path d="m3 7 9-4 9 4-9 4-9-4ZM3 12l9 4 9-4M3 17l9 4 9-4" />
    </>
  ),
  intake: (
    <>
      <path d="M3 12v8h18v-8M12 3v12m-5-5 5 5 5-5" />
    </>
  ),
  audit: (
    <>
      <path d="M9 3H5v18h14V3h-4M9 3h6v4H9V3ZM8 12h8M8 16h6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="3" />
      <circle cx="15" cy="17" r="3" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};
export function WorkspaceIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`w-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
