# Parcels JA marketing design system

Phase 1 preserves the complete owner-supplied logo without cropping, recoloring or redrawing. Its SHA-256 remains `f7077fc6689a760db3888f7aa4b179fe36388b9306e7d79366d5deb83f6952b8`.

Shared styles live in `app/(marketing)/marketing.css`. The marketing route group owns navigation, footer, layout and metadata conventions; the legacy dashboard remains a labelled fictional demo.

- Palette: ink `#07172b`, navy `#0b1f3b`, brand yellow `#ffc800`, surface `#f7f9fc`, muted text `#526174`, borders `#dce3eb`.
- Typography: locally bundled Inter Variable, with Arial/sans-serif fallback. Fluid headings and a readable 16px body.
- Spacing: 8px scale, 1248px content container, responsive padding and single-column layouts at narrow widths.
- Controls: primary yellow and secondary outlined links, minimum 44px targets, visible keyboard focus, labelled inputs, native required-field validation, explicit pending/error/success states.
- Navigation: desktop links and an accessible mobile disclosure with expanded state, Escape dismissal and focus restoration. A skip link reaches the main landmark.
- Motion: short color transitions only; reduced-motion preferences disable them.

Use `ButtonLink`, `PageIntro`, `Eyebrow`, `Notice`, `CTA` and `FAQ` for consistent pages. Use client components only for the mobile menu and forms. Marketing content is server-rendered. Native FAQ disclosure remains functional without client JavaScript.

The route illustration describes a planned process, never a tracked shipment. No stock customer portraits, fabricated statistics, invented prices, service guarantees or substituted brand graphics appear. Registration/address, tracking, pricing and policy availability are stated next to the relevant action.

Preview metadata and response headers remain noindex. Robots disallows crawling and the sitemap is intentionally empty until public launch approval. Per-page canonical and Open Graph metadata use the PRD domain, which still requires ownership/routing verification before launch. No fabricated ratings or business-address structured data are emitted.
