# M5 guardian owner feedback 28–31 — combined implementation

Source: owner feedback register observations 28, 29, 30 and 31.

## 28 · Compact family activities
- Compact sample-activity cards with rights-safe **no approved image** placeholders (4:3), clearer 44px record action, and initially collapsed guidance.
- Recording remains available only for explicitly recordable sample slots and the existing server feature gate; no clinical observation or outcome inference.

## 29 · Dedicated Family Documents
- New `/app/family-documents` route and authorized sidebar destination separate from sample progress updates.
- Reuses the existing `FamilyReleasedDocuments` component and server-enforced dual flag/consent/guardian-child release gate. A linked guardian can navigate to a dedicated page, but no release API or permissions are enabled by navigation. If backend gate is closed the released-document component renders nothing. No download/export introduced.

## 30 · Linked-child selection on Progress updates
- Guardian child tabs draw from the existing authorized `opsApi.family` endpoint with exact linked-child membership.
- **The progress visualization remains entirely fictional demo data for all tabs.** Display explicitly warns that selecting a real linked child does *not* switch to or reveal their real therapy measurements.
- No cross-child progress API, clinical release, inference or new access policy.

## 31 · Consistent family-purpose terminology
- Sidebar distinguishes `Home practice` (date-scoped sample answers) from `Sample activity library` (browsing only).
- Home-practice page explains the difference, rather than presenting them as duplicate destinations.

## Gates
Full exact-head CI and all eight >=90% coverage thresholds, Codex P0/P1/P2 disposition, synthetic five-width cross-role and manual keyboard/AT owner verification required. Production document release still M9 gated; illustration upload/approval still M5-14 gated. These changes do not qualify clinical release, real progress, published images or owner acceptance.
