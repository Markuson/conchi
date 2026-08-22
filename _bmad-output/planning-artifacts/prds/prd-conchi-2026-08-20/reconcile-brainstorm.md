# Reconciliation: Brainstorm Intent → PRD

## Summary
The PRD is high-quality and faithful to the brainstorm — core features, product strategy, technical constraints, and portfolio requirements are accurately captured, often verbatim. The main weaknesses are qualitative details (Conchita voice copy, animations, visual identity specifics) mentioned in the Aesthetic section but not anchored to testable FRs, making them likely to be missed during implementation.

## Gaps and Imprecisions

1. **"Last N expenses" Home Screen Window option** — brainstorm explicitly listed "last N expenses" as a configurable window option. PRD only includes last week / last month / last 7 days / last 30 days. **Severity: missing.** *Fix: add "last N expenses" to FR-9 and FR-29.*

2. **Conchita voice copy in error states** — brainstorm named error states as a Conchita voice surface. PRD's Aesthetic section mentions it in loading and empty states but FRs do not require it in error states (widget error FR-1, entry error FR-2/FR-3). **Severity: missing from FRs.** *Fix: add Conchita voice copy as a consequence in FR-1, FR-2 error paths.*

3. **Rotating/changing loading copy** — brainstorm specified "animated indicator with rotating Conchita-voice copy" (implies cycling copy, not static). PRD says "loading indicator with Conchita voice copy" — the rotation behavior is lost. **Severity: downgraded.** *Fix: clarify in FR-2 and FR-5 that loading copy rotates/cycles.*

4. **App icon animated-while-processing state** — brainstorm named this explicitly. Mentioned in Aesthetic & Tone section but has no FR. **Severity: downgraded.** *Fix: add FR or consequence in Entry feature group requiring animated app icon during Round-trip.*

5. **Delete not available from invoice Review Card — no rationale** — FR-23 states delete is not available from the Review Card but does not explain why. The brainstorm didn't address this either; the PRD introduced the constraint without surfacing the reasoning. **Severity: imprecise.** *Fix: add a brief rationale note in FR-23 (consistency with regular Confirmation Card behaviour per FR-8).*

6. **Post-log animation direction ambiguity** — UJ-2 says "New entry animates to the top of the list" (foreground, single entry, slides in from top). FR-11 says "cascade bottom-to-top, oldest to newest" (background, multiple entries). These are different scenarios but the PRD does not distinguish them explicitly. **Severity: imprecise.** *Fix: clarify FR-11 applies to the background multi-entry case; add a note in FR-11 or FR-5 covering the single-entry foreground case.*

7. **Widget loading state Conchita voice** — brainstorm mentions Conchita voice copy in the widget loading state. FR-1 mentions a loading indicator but not voice copy. **Severity: downgraded.** *Fix: add Conchita copy to FR-1 loading state consequence (if technically feasible in widget — note as assumption).*

8. **Subcategory Drum Roller filters by Category** — brainstorm implies this but does not state it. PRD FR-5 states it correctly. **Status: captured accurately.**

9. **Google Sheets dashboard stays in place** — brainstorm states this. Captured in addendum. **Status: captured.**

10. **`origen` field never surfaced in UI** — brainstorm states this. Captured in FR-10. **Status: captured.**

## Qualitative / Tone Content Check

- **Conchita voice surfaces named in brainstorm:** loading states ✓ (FR-2, FR-5), empty states ✓ (Aesthetic section), confirmation language ✓ (FR-5 peripheral text), error states ✗ (not in FRs), widget loading ✗ (not in FR-1).
- **Rotating copy behaviour:** mentioned in brainstorm, flattened to "voice copy" in PRD — rotation/cycling behaviour is lost.
- **App icon animated state:** named in brainstorm, present in Aesthetic section only — no testable FR.
- **Drum Roller as signature interaction:** well-captured across FR-5, FR-7, Aesthetic section.
- **Post-log slide animation (foreground):** in UJ-2 but not as a testable consequence in any FR.
- **Muted/desaturated category colors:** in Aesthetic section. No FR needed — UX decision.
