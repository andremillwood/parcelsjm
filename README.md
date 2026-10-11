# Parcels JA

Next.js + TypeScript marketing and customer **development preview**. Phase 0 establishes a verified baseline; live registration, shipment processing, storage, pricing and communications are not connected.

## Setup

Use Node 22 (`nvm use`) and npm 10.9.3. Run `npm ci`, then `npm run dev`. Existing routes: `/`, `/rates`, `/register`, `/dashboard`.

No credentials are required for Phase 0. `.env.example` documents future configuration; copy it to `.env.local` only when configuring an isolated development environment. Never commit secrets or use production customer data in preview.

## Verification

- `npm run check`: formatting, ESLint, strict TypeScript and production build.
- `npx playwright install chromium`, then `npm test`: production-build browser tests at 360, 390, 768, 1024 and 1440px. Build first. Tests start an isolated server on port 3100.
- On older macOS with installed Google Chrome: `PLAYWRIGHT_CHANNEL=chrome npm test`. Uses an isolated automated browser profile, not personal browser sessions.
- `npm audit`: check all dependencies. PostCSS is pinned through an override to avoid advisories in Next.js 15's transitive version; reassess when upgrading Next.js.
- `npm run format`: format editable code/docs. The source PRD is intentionally excluded.
- Browser screenshots/traces/reports are under ignored `test-results/` and `playwright-report/`; CI retains these for seven days. They contain fictional demo data only.

For an accessible preview, set `PLAYWRIGHT_BASE_URL` to its HTTPS URL. Do not disable Vercel deployment protection to run tests; use an authorized session or scoped automation access. Authenticated service flows require separate integration tests in later phases.

## Conventions and safeguards

One canonical App Router application; server components by default, client components only where interactive. PascalCase components and strict typed props; formatting and lint are CI gates. Preserve existing routes until deliberate migration. Future `/app` and `/admin` routes require server and database authorization before real records are introduced.

The original logo is preserved unchanged at `public/brand/parcels-ja-original.jpeg`, from the owner-supplied `Logo1_parcels2026.jpeg`. No derived logo or favicon has been invented. The full component/token system belongs to Phase 1.

Every route carries a development banner, noindex metadata and response headers. Registration never sends form values; selected files stay on device. Fictional dashboard records must never become production seed data. No rates, warehouse address, payment provider or DMD connection is assumed.

CI runs install, checks, dependency audit and browser tests without production credentials. Configure required PR checks before merging. Vercel deployment is preview-only during this work; no production promotion, domain change, or migration is implied by a passing build.

## Plan and evidence

- Source PRD: owner-supplied v1.0, retained locally in ignored `docs/reference/` (internal commercial context).
- [Baseline audit](docs/REPOSITORY_AUDIT.md)
- [Phases and requirement traceability](docs/DEVELOPMENT_PLAN.md)
- [Phase 0 report](docs/PHASE_0_REPORT.md)

Supabase migrations and development seeds start in Phase 2. No migration command is claimed before those exist. DMD architecture is reserved in the plan; no portal automation has begun.
