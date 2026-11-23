# TheraBridge illustration reference packet v1.0 — review candidate, NOT APPROVED

**Authority:** `ILLUSTRATION_STANDARD_V1_DRAFT.md` + Direction B Master Blueprint + `apps/web/src/styles/specialty-identity.ts`. This packet defines consistent design targets; it is **not itself an approved artwork collection**, source of real child images, or clinician signoff. Approval requires reviewed reference-board **image bytes**, guide digest and independent reviewer receipts as described in PR #482.

## Core style lock

- Semi-flat editorial, clear simple silhouettes, accurate child-to-adult proportions, natural gentle expressions, calm supported interaction, soft restrained shading. Quiet neutral off-white backgrounds `#FAF8F5`, clinical white `#FFFFFF`, deep text `#14213D`; use Direction B teal `#0A7385` for family contexts, action blue `#0F5692` for clinicians. Purple/violet is **not** a selection state.
- Artboard: **1600 × 1200 (4:3)**; central **x=200–1400, y=0–1200** 1:1 safe crop, with all children, human hands, props and safety-contact points *inside* crop. Do not place unique essential instructions at extreme edges. Derivatives must be derived from a digest-locked approved master.
- Same character/prop scale, anatomy, shadows, eye direction, material textures, environmental calm and camera level in each set. Favor readable, grounded objects at 128px card scale. Always pair specialty accent color with a **text label and icon**; icons, color and art alone cannot convey activity eligibility.
- **Prohibited:** real child or patient likeness; culturally stereotyped representations; copyrighted celebrities/characters; unsafe handling technique, unsupported joints or impossible grasp; force/restraint as care; embedded type or instructions, trademarks/logos, watermarks, advertising, stock photographs, anime and photo-realistic image mixing.
- All speech boards/cards must show abstract non-identifying pictograms without proprietary branded systems or embedded readable text unless rights and accessibility review separately permits it. Do not invent a therapeutic technique or equipment suitability.

## Character/prop continuity sheet (conceptual, not approved visual assets)

| Ref | Character/prop continuity | Review constraint |
|---|---|---|
| CH-A | Fictional child silhouette with anatomically plausible small hands/feet; respectful expression and comfortable neutral clothing | No resemblance to uploaded, real or identifiable children |
| CH-B | Alternative fictional child silhouette to support non-tokenistic diversity without implying diagnosis or impairment | Keep facial proportions and line weight identical to CH-A |
| TH-A | Fictional adult therapist at eye level, offering space/choice rather than force | Correct support/contact points verified by clinician |
| PA-A | Fictional caregiver in home context, not a substitute therapist | No unapproved home exercise or clinical instruction |
| GR-A | Small group of 3–4 clearly distinct fictional participants | No clinically misleading individual-to-group technique mapping |
| PR-S | Generic cards and communication props with clear non-proprietary symbols | No lettered text, proprietary boards or copyrighted icons |
| PR-O | Safe tabletop fine-motor objects, grasp tools, everyday cups/buttons | Size and hand/object contact must be physically plausible |
| PR-B | Neutral learning/choice cards, calm safe environment | No coercive behavior or restraint imagery |
| PR-P | Stable mat, low support surface, safe footwear and assistive devices when explicitly included in brief | Therapist validates pose/support/biomechanics |
| PR-G | Shared table and cooperative materials | Every participant's activity must be visually unambiguous |

## Five scene archetypes × five specialty families

The following **25 prompts are planned briefs**, not 25 generated/approved images. Final image generation and review use this fixed matrix, the same character/prop sheet and the same safe crop.

| Scene archetype | Speech and language | Occupational / feeding | ABA / behavioral / developmental | Physiotherapy | Group |
|---|---|---|---|---|---|
| S1 Therapist-guided tabletop | Child chooses among nonverbal illustrated communication cards while therapist waits | Child grasps a correctly sized safe object with therapist observing | Child selects one of two neutral activity cards, no coercion or reward restraint | Therapist demonstrates safe supported tabletop reach after technique review | Therapist guides a small group sharing turn-taking materials |
| S2 Independent practice | Child organizes generic picture-sequence cards with space to respond | Child places pegs or sorts daily-living objects using natural grip | Child sequences benign choice-card actions in a calm space | Child practices a clinician-approved seated movement with stable support | Each child performs a short cooperative task in own space |
| S3 Family home support | Caregiver shares a simple communication game, no implied therapy outcome | Caregiver offers safe object sorting with no unsupervised hazards | Caregiver supports choice and predictable routine without force | Family views an approved-only safe setup, never prescribes exercise from image | Family-friendly shared game as a sample activity, not a released care plan |
| S4 Materials and sequence | Neutral picture cards, tabletop, child-safe storage | Correctly scaled tools, tactile objects and organized steps | Non-stigmatizing choice cards and clear arrangement | Clinician-confirmed mat/equipment size and no unsupported joints | Shared props and accessible seating positions |
| S5 Safety and accessible adaptation | Child with communication access and suitable seating | Correct natural hand-object contact and possible non-assumptive adaptive grip | Accessible calm environment, no unsafe intervention | Stable support surfaces, clinician-reviewed pose; no aggressive stretching | Inclusive layout with clear access/space for each participant |

**Specialty identity mapping:** existing persisted services `speech`, `occupational`, `behavioral`, `physical`, `feeding`, `developmental` remain unchanged. Feeding maps visually to occupational; developmental maps visually to behavioral; group is a visual family pending approved clinical taxonomy. No code may infer clinical authorization from any image family.

## Reusable generation/review brief (one per immutable activity)

Record `centerId` (internal only), `templateId`, **templateVersion**, service ID, visual family, scene archetype, materials, action sequence, clinically verified instructions, contraindications, equipment sizing, audience and age/duration only when clinician-established; select exact CH/TH/PA/GR and PR refs, reference-board SHA-256, guide SHA-256, style version `m5-b-v1`, intended 4:3 and square crop, locale and meaningful alt text. Log model/provider, exact model version, rights and commercial use terms, cost, prompt revision, random seed when supported, output SHA-256, rejected revision history and derivation checksums.

**Base instruction to illustrator (not sent to any provider until approved):** Create one original semi-flat editorial 4:3 image using the locked TheraBridge fictional character sheet and quiet Direction B palette. Show only the vetted action and props for the specified service and scene. Put the entire action, hands, support and safety-critical objects within the centered square safe crop. Natural proportions and calm, respectful expressions; restrained shadows; clean silhouettes legible at a small card size. No text, logos, photo realism, real child likeness or protected source art. Never improvise clinical technique. Preserve the same light direction, camera height, line weight, character identifiers and object scale as the approved reference board.

## Independent acceptance rubric — ALL mandatory, each image

1. **Brand/design reviewer:** style/reference consistency, five-family visual differentiation paired with labels/icons, 4:3 and safe-crop correctness, legibility at 128px, colour/contrast in light and dark, no unwanted symbols.
2. **Clinician reviewer:** correct anatomy and hands, safe therapy-specific equipment/technique, no inappropriate implications of diagnosis/progress, valid sequence congruent with exact versioned instructions and contraindications.
3. **Rights/privacy reviewer:** fully original or separately licensed assets, provider commercial terms for AI use, no protected likenesses or source upload, acceptable provenance and attribution, accessible locale/alt, retention and revocation scope.
4. **Security reviewer:** private encrypted/scanned staging, full PNG integrity, nonpublic URLs/ACLs, tenant/version binding, orphan cleanup/rejection revocation, verified derivatives, no unreviewed candidate surface.
5. **Owner acceptance:** view examples across **320/390/768/1024/1440px**, keyboard/screen reader, 200% zoom, low-bandwidth/loading/error/blocked states; approve reference board and minimum 20–30 genuine activities when inventory supports pilot.

A single rejection, missing signature, stale hash, missing rights or missing staff role blocks qualification. **Approval of this style reference packet, even when eventually obtained, does not switch on G2/G2b or public image delivery.**

## Required record of actual approvals

Store externally authorized reviewer public-key registry (never private keys in GitHub). Every approval receipt must be signed over a digest-bound canonical payload by an identified allowed reviewer (owner/design/clinical for style; independent security/privacy for media pipeline; legal/design/clinical for each asset). `scripts/qa/m5-media-approval-chain.mjs` validates receipts for **offline evidence only**, never public read. No signed receipts, reference-board image assets or human acceptance findings exist as part of this PR. Current status: **NOT APPROVED; imagery NOT QUALIFIED**.
