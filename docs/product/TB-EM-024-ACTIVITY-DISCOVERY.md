# TB-EM-024 — Staff activity library discovery (synthetic only)

Search and filters operate on the existing server-authorized activity list, never as a permission boundary. Search matches title, age band, internal specialty key, **displayed specialty label**, materials, steps and safety guidance; query matching is case- and diacritic-insensitive. Filters combine with logical AND: specialty, Created by me (only for roles allowed to manage activities), Centre activities and Synthetic samples. Clear-filters availability depends on the normalized query, not raw whitespace.

The three-column discovery row starts at lg to preserve usable search width with the 254px desktop sidebar at 768px. Read-only staff, clinician authors and guardian pages retain their prior authorization. No backend, schema, clinical gate or deployed demo changes.

## Independent review dispositions
- Codex P2 displayed-label search: fixed by searching SPECIALTY_OPTIONS.label.
- GitHub review P2 768px search collapse: fixed via lg breakpoint.
- Missing feature-level regression: staff Playwright journey now tests actual API-backed search, combined filters, ownership buckets, no-results, clear, responsive control width at 320/390/768/1024/1440.
- P3 whitespace filter, read-only 'mine' filter and colleagues' centre library: addressed.
- Unicode matching: NFKD + case folding, without changing stored data.
- Optional search debounce remains deferred; synthetic volumes do not justify complexity. Browser visual QA outside CI remains NOT RUN.

## Evidence
New exact-head CI **PENDING**; source-review suggestions alone are not a PASS. Repeat independent exact-head review after CI. Do not merge/deploy until owner authorization. Hosted acceptance issue #61 continues independently against the current demo commit. All clinical NO-GO gates unchanged.
