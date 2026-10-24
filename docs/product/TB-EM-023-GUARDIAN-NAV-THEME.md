# TB-EM-023 — Guardian family theme on the complete application shell

The authenticated guardian shell previously applied `bg-fam-accentTint` / `text-fam-accent` navigation classes without defining the `--fam-*` variables on their common ancestor. The `theme-family-auto` scope was limited to page descendants and could not style sibling navigation, header or sidebar.

Apply the existing `theme-family-auto` class on the outermost `ProductShell` wrapper **only when `activeContext.role === 'GUARDIAN'`**. Use the existing `bg-fam-canvas text-fam-ink` token classes for guardian shell background and text. Preserve clinical and administrative shell classes exactly.

## Manual browser regression required before merge
- Guardian desktop: `Activities at home` active navigation has a **computed** nontransparent teal-tinted background and teal text/indicator, not just Tailwind class names. Check Home, Home practice and Progress updates after navigation.
- Guardian mobile 320 / 390 / 768 px: active navigation colors are computed and visible; header and scrolling navigation remain readable. Desktop 1024 / 1440 px: sidebar and active indicator remain visible.
- Guardian family light/dark token inheritance: existing theme selectors continue to work; inspect computed `--fam-accent` / `--fam-accentTint` at sidebar and top bar.
- Center admin, coordinator, Speech, OT and supervisor: unchanged clinical colors, no `theme-family-auto` on their shell.
- Sign-out and session context switching unchanged; no clinical routes, permissions, guardian content or demo data modified.

No Render redeploy until CI, independent review, explicit owner merge/deploy authorization. Issue #61 external acceptance remains open. This PR fixes only the CSS variable scope, not remaining responsive/security acceptance.
