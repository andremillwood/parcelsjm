# Phase 0 — repository and baseline

Date: 2026-10-11. Baseline: `0b93c70a79ef65f28648aa698041c647f594f7af`. Initial audit commit: `d1006c6`. Branch: `codex/phase-0`.

**Phase 0 exit: passed.** Clean build, automated checks, original logo and demo preview are verified. This is not production launch approval.

## Delivered

- Read PRD v1.0 in full, preserve an unchanged local copy outside Git, replace provisional phases with the PRD's Phase 0–6 sequence and map all 57 functional requirement IDs.
- Establish npm/Node 22 conventions, exact dependencies, lockfile, strict TypeScript checks, Prettier, React/TypeScript/accessibility ESLint rules and a secret-free CI pipeline.
- Upgrade Next.js to 15.5.27 and React to 19.1.9. Pin PostCSS 8.5.29 through an override. Replace the Next ESLint preset to avoid its unpatched braces dependency. The Next build may note that its optional ESLint plugin is absent; the explicit lint gate still runs.
- Preserve original logo byte-for-byte in a shared BrandLogo component. SHA-256: `f7077fc6689a760db3888f7aa4b179fe36388b9306e7d79366d5deb83f6952b8`.
- Format/refine existing routes without replacing their preview behavior. Add visible preview labels, noindex metadata/headers, honest rate unavailability, keyboard skip links, focus styles, labeled local-only document selection, registration status announcement, error and not-found states.
- Document future environment variables without credentials. No DMD variables, migrations, fake live data, customer emails, or payment integrations introduced.
- Add production-build Playwright checks at 360/390/768/1024/1440px for routes, accessibility, overflow, keyboard focus, registration validation/no transmission, unavailable quotes and 404 behavior.

The pre-existing Vercel production deployment failed with `VULNERABLE_NEXTJS_VERSION` at the audit baseline. This work upgrades that dependency and targets a new preview only.

## Verification and evidence

- `npm run check`: pass (format, lint, strict types, optimized production build).
- `npm audit --audit-level=high`: pass, zero reported vulnerabilities across all dependencies.
- `PLAYWRIGHT_CHANNEL=chrome npm test`: 30/30 pass in 51.5 seconds. Four routes × five widths have no violations in configured axe WCAG A/AA checks, no document-level horizontal overflow or page errors. Skip-link focus, preview labels and logo visibility pass. Registration validation/no transmission and unavailable pricing/404 checks pass at every width.
- Logo SHA-256 matches supplied original. All 57 functional PRD IDs are mapped.
- Vercel preview `dpl_J8eJSVLtEKwv8wAGN2wdrVzufzfA`: READY, built from `ae330b0d080b5f1fca5af664765ce46eca264050` in approximately 33 seconds. Project `parcelsjm`, team `Andre Millwood’s projects`; no production target.
- [Verified preview](https://parcelsjm-fxzake6ei-andre-millwoods-projects.vercel.app/): authenticated HTTP checks return 200 for all four routes and 404 for an unknown route. Demo labels, noindex headers and expected unavailable/fictional states verified. Full interactive browser tests ran against the local production build, not through hosted SSO.
- [GitHub Actions run 38175566725](https://github.com/andremillwood/parcelsjm/actions/runs/38175566725): completed successfully for implementation commit `ae330b0`, including clean npm ci, check, audit, Linux Chromium installation, browser tests and evidence upload.

The initial browser pass identified a serious keyboard accessibility issue in the scrolling dashboard table. The fix adds a named focusable region; Phase 1 still needs the PRD's customer card layout and complete design system. Automated axe checks complement, rather than replace, screen-reader and touch-device testing in later phases.

Local Playwright's newest bundled Chromium cannot install on macOS 13. Local tests therefore use installed Chrome with a fresh isolated automation profile. CI uses bundled Chromium on Linux. No personal browser profile is read.

## Reproduction

1. `nvm use` and `npm ci`.
2. `npm run check` and `npm audit`.
3. `npx playwright install chromium` then `npm test`; on this Mac use `PLAYWRIGHT_CHANNEL=chrome npm test`.
4. Inspect generated screenshots and HTML report in `test-results/` and `playwright-report/`.
5. Open preview `/`, `/rates`, `/register`, `/dashboard`. Verify demo labels and original logo; submit fictitious registration input and confirm no account is created.

## Scope and remaining business dependencies

This phase implements PRD §13 Phase 0 foundations and §12 baseline checks. No live functional requirement is marked complete just because a demo exists. Phase 1 contact persistence/communication requires real isolated backend/email configuration; Phase 2 auth and RLS remain unimplemented. Approved commercial rules, current addresses, service coverage, legal policies and operational access remain the PRD D-01–D-10 decision gates. Original logo availability is resolved.

No production deployment, domain change, Supabase mutation, Resend send or DMD portal access was performed.

## Screenshots

Reviewed local production-build captures: [home 360px](evidence/phase-0/home-360.png), [home 1440px](evidence/phase-0/home-1440.png), [dashboard 360px](evidence/phase-0/dashboard-360.png), [dashboard 1440px](evidence/phase-0/dashboard-1440.png). These retain the existing preview visual direction; Phase 1 is the full marketing/design-system implementation. The keyboard-test captures may show the skip link during focus traversal.

## Review

Implementation commit: `ae330b0`. [Draft PR #1](https://github.com/andremillwood/parcelsjm/pull/1). No database migrations in this phase.
