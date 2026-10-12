# Parcels JA repository audit

Audit date: 2026-10-11 (America/Jamaica)
Baseline: `0b93c70a79ef65f28648aa698041c647f594f7af`
Working branch: `codex/phase-0`

## Status and evidence

All ten tracked files were inspected. The repository is a frontend demonstration, not a production application. README explicitly describes the limitations. The local workspace initially had no commits or source files; the remote main branch was fetched without replacing existing work.

The initial audit lacked the PRD. The user subsequently supplied its path; PRD v1.0 has now been read and archived unchanged in `docs/reference/PARCELS_JA_PRD_CODEX.md`. The original logo was also found beside the PRD and copied unchanged to `public/brand/parcels-ja-original.jpeg`. Findings below describe the original baseline, not the subsequent Phase 0 changes. See PHASE_0_REPORT.md for current verification.

## Architecture and implementation

| Area            | Evidence               | Assessment                                                                            |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Framework       | package.json           | Next.js 15.5.0, React 19.1.0, TypeScript; App Router                                  |
| Type safety     | tsconfig.json          | Strict mode enabled; no separate typecheck command                                    |
| Marketing       | app/page.tsx           | Static hero, feature cards, process and business CTA                                  |
| Registration    | app/register/page.tsx  | Browser required/email validation; submission changes local state only                |
| Customer UI     | app/dashboard/page.tsx | Public fictional records; navigation changes title only; file selection is local      |
| Pricing         | app/rates/page.tsx     | No prices or calculation; correctly defers approved pricing                           |
| Styling         | app/globals.css        | Navy/yellow CSS variables and responsive breakpoints; no reusable component system    |
| Identity        | Repeated JSX wordmarks | No original logo/image assets present; preserve current styling pending source assets |
| Data and auth   | Entire tracked tree    | No Supabase dependency, clients, migrations, authentication or authorization          |
| Operations      | Entire tracked tree    | No admin routes, workflows, verified shipment event model or audit trail              |
| Communication   | Entire tracked tree    | No Resend integration, templates, queue or delivery handling                          |
| Quality/release | Entire tracked tree    | No tests, lockfile, CI, environment template, deployment config or release runbook    |

## Findings, ordered by release impact

1. **Release blocker: no customer or operational backend.** All registration and document handling is demonstrative. Public dashboard access must never be carried forward to real customer data without authentication and row-level authorization.
2. **Release blocker: missing requirements and approved business inputs.** The PRD, original logo, warehouse details, operating commitments and cost/pricing rules cannot be verified. Existing marketing assertions about address assignment and services require approval before live publication.
3. **High: no reproducible or verified dependency baseline.** There is no committed lockfile or CI. The pinned framework versions require current security-advisory review before implementation or deployment; this audit does not claim a specific vulnerability without verification.
4. **High: no authorization, upload or administrative security design implemented.** Ownership policies, private document storage, server-side validation, staff permissions and audit logging are prerequisites for real data.
5. **Medium: UI behavior and semantics are incomplete.** Dashboard links only change headings; sidebar controls use placeholder anchors; the file input lacks an associated label; registration success lacks an explicit live announcement. Keyboard, contrast and mobile behavior require browser verification.
6. **Medium: maintainability is limited.** Most source is compressed onto single lines, navigation/wordmarks are duplicated, package data is positional string arrays, and styles are global. Formatting and typed domain boundaries should precede feature expansion.
7. **Medium: reliability and observability are absent.** No application error boundaries, operational failure handling, notification retries, structured logging or support runbook exists.

## Verification performed

- Inspected all tracked source/configuration/documentation files and Git history.
- Confirmed remote main resolves to the baseline SHA above.
- Confirmed local tools: Node v22.19.0 and npm 10.9.3.
- No application tests exist. Dependency installation, typecheck, production build, browser checks, database tests and preview deployment were **not run** in this intake audit.
- No remote database, production deployment, customer communication or DMD operation was performed.

## Required evidence to close Phase 0

Read the PRD in full; map its actual requirement/acceptance identifiers; settle its Phase 0 scope; establish and test a reproducible dependency baseline; document architecture/security boundaries and approved business inputs; record verification and commit references. The accompanying development plan is provisional until then.
