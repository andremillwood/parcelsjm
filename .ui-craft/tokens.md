# Marketing token contract

Respect the existing `.marketing` scope; the workspace design system is separate.

| Role       | Existing token / extension                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Brand dark | `--ink: #07172b`, `--navy: #0b1f3b`                                                                                |
| Accent     | `--yellow: #ffc800`                                                                                                |
| Surface    | `--surface: #f7f9fc`, `--warm: #faf7f0`, white                                                                     |
| Text       | `--ink`, `--muted: #526174`, `--on-dark: #bdcada`                                                                  |
| Divider    | `--border: #dce3eb`, `--border-dark: #ffffff26`                                                                    |
| Type       | Existing Inter Variable; body 16px, lead 18px, display 48–72px                                                     |
| Space      | Existing 8/16/24/32/48/64/96px scale; extend 80/128px for major section rhythm                                     |
| Radius     | Controls 6px; screenshot frame 12px; hero uses the signature clipped corner                                        |
| Shadow     | Demo frame uses layered ambient/direct navy shadows                                                                |
| Motion     | CSS-only, 160ms color/opacity and 180ms transform; hover on fine pointers only; reduced motion removes transitions |

No animation dependency, new font or component library is needed. All new shared styles refer to these semantic tokens.
