# TB-EM-023 — Guardian active-navigation color scope (synthetic only)

The authenticated guardian shell previously applied `bg-fam-accentTint` / `text-fam-accent` navigation classes without defining `--fam-*` on a shared ancestor. The theme scope existed inside page content, not the sidebar or mobile navigation.

The guardian-only outer `ProductShell` now uses `theme-family-auto bg-fam-canvas text-fam-ink`; staff shells retain their original clinical classes. This fixes the family canvas, ink, active navigation accent and focus-ring token scope. **It does not convert every header/sidebar border or surface to family tokens**: those retain `bg-surface-white` and `border-border-light` intentionally in this narrow PR.

## Review dispositions
- Original teal missing-highlight root cause: corrected by guardian-only ancestor scope.
- Computed-style CI gap: corrected in `scripts/design/check-demo-journey.mjs` with real Chromium assertions for active background/text/indicator and CSS variables at 320/390/768/1024/1440 px; staff negative check verifies the clinical canvas and absence of the family scope.
- Guardian dark-mode inconsistency: **documented pre-existing P3, not activated**. Authenticated guardian pages use `theme-family-light`, and the authenticated application does not set `html[data-family-theme="dark"]`. The `theme-family-auto` shell therefore resolves to light in the current product. Future dark-mode enablement must first migrate content wrappers and chrome surfaces together; no partial dark-mode activation in this PR.
- Documentation/evidence: handover and QA records updated. Do not claim screenshots or external hosted browser acceptance from local CI.

## Verification gates
- Exact-head CI demo-journey must PASS; new computed-style assertions execute on the actual browser, not class strings.
- Independent exact-head review must be repeated after test additions.
- Hosted visual QA on the deployed reviewed commit remains **NOT RUN** until owner-authorized merge/deployment; check keyboard/focus, guardian pages and five widths with redacted evidence.
- Issue #61 remains open until the full seven-role external acceptance, responsive and security checks complete.

No clinical signing, approval, consent authorization, release, real AI/audio, messaging or production enablement. No merge/deploy without owner authorization.
