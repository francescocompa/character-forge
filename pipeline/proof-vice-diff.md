# Proof — recompiling Vice against the T03 ground truth

> **What this is.** The T19 acceptance evidence: [`compile.md`](compile.md),
> followed against a chassis doc written from the build, reproduces a character
> file **mechanically equivalent** to the hand-built T03 ground truth
> (`Characters/vice.character.json`). This document is the diff analysis — it
> describes _differences_, and by rule (scope §4) contains **no WotC text**. The
> compiled artifacts it discusses live in `Characters/` (the local data home,
> gitignored), never in this repo.

## Method

1. **Back-test the format (T18).** Wrote `Characters/vice.chassis.md` fresh from
   the T03 file + `vice.compile-notes.md`, expressing the whole real build in the
   [chassis format](chassis-format.md) — concept/reflavor, cross-edition species,
   homebrew background + feat, single-class Warlock progression 1→10, a prepared-
   spell pool, a companion, a planned subclass, KB-GAP placeholders, and a
   level-8 `TBD`. This is also the first real (non-synthetic) exercise of T18.
2. **Recompile following the recipe.** Produced
   `Characters/vice-recompiled.character.json` by applying `compile.md`:
   - **Computed fields (§5)** re-derived independently from the chassis-doc inputs
     (ability finals, PB, saves, all 18 skills, passives, initiative, per-source
     DC/attack, per-class hit dice, pact slots) and asserted against T03.
   - **Library extracts (§4)** are verbatim KB pulls — deterministic, so a correct
     recompile reproduces them byte-for-byte; homebrew/KB-GAP entries transcribe
     the chassis doc's Homebrew blocks.
   - **Summaries (§6)** re-authored from scratch via the compression rules — this
     is the part that genuinely tests the style guide.
3. **Diff** structurally (a leaf-path walk: added / removed / changed values) and
   **validate** both files with the T04 CLI.

**Honesty caveat.** This pass was run in the same session that had the T03 file in
context, with non-peeking discipline for the re-authored summaries. Library bytes
and computed numbers are deterministic (re-deriving them can only reproduce T03),
so an in-session pass is a sound test of _those_. The genuinely cold gate — a fresh
session handed only `vice.chassis.md` + `compile.md` + the KB — is folded into
**T22** (Shigen cold run); rerunning Vice that way is the belt-and-braces M3 check.

## Results

### Computation (§5) — exact

Independent re-derivation matched the ground truth on **every** numeric value:
abilities/modifiers, proficiency bonus, all six saves (proficiency + total), all
18 skills (proficiency state + total), passive perception, initiative, save DC and
attack mod per casting source, per-class hit dice, and the pact slot pool. **0
mismatches.** The recipe's computation duties reproduce the hand build.

### Structural diff — clean

`vice-recompiled.character.json` vs `vice.character.json`: **874 leaf paths on each
side; 0 added, 0 removed.** Of 39 changed values, **38 are re-authored prose**
(`summary` / `note` / `prepareRule` / one attack `notes`) and 1 is `meta.updatedAt`
(the compiler stamps its own). **Zero structural or computed-value differences** —
the two files describe the same character; only the wording of the sheet lines
differs, exactly as the task anticipates.

### Validation — green

Both files: `0 error(s), 1 warning(s) — PASS`. The single warning
(`library.awakened-mind` never referenced) is inherited from T03 (see discrepancy
D2) and is not a recipe defect.

## Discrepancies, classified

| #   | Difference                                                                                                                                                              | Class                               | Disposition                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | 38 summary/note strings differ in wording (e.g. "Unarmored AC = …" vs "While unarmored, AC = …"; Mind Sliver led by damage vs by the save).                             | **Acceptable variation.**           | Human-reviewed: every pair is mechanically identical — same dice, DCs, ranges, recovery, conditions, refs. This is the compression style guide (§6) doing its job; wording is not part of the contract.                                                                                                            |
| D2  | T03 embeds a `library.awakened-mind` (2014 KB copy) that nothing references — the progression uses `awakened-mind-2024`. Surfaces as an "unused library entry" warning. | **T03 artifact**, not a recipe bug. | `compile.md` §12 says _embed exactly what you reference_; a cold recompile following §12 would either reference it or omit it, avoiding the warning. Left in the recompiled file only because this pass mirrored T03's library to keep the diff honest. Flagged for the eventual clean recompile / kb-audit (T20). |
| D3  | Level-up dry run first failed: `currentLevel (3) exceeds the sum of chassis.classes[].levels (2)`.                                                                      | **Recipe gap (fixed).**             | §16 said to bump `currentLevel` but not, explicitly, the Classes table's `levels`. Fixed: §16 step 1 now states both must move together and notes the validator enforces it. Re-ran → PASS.                                                                                                                        |

**No mechanical discrepancy is attributable to the recipe.** The one recipe issue
found (D3) was a missing instruction, now corrected.

## Format back-test findings (T18)

Writing `vice.chassis.md` exercised the format on a real build; it held up. Notes:

- **Cross-edition species** (2014 Autognome in a 2024 build) expresses cleanly via
  `sources` + a per-entry edition note — the canonical §2.7 case round-trips.
- **KB-GAP handling** (the 2024 Great Old One the KB lacks) fits the Homebrew
  section as author-supplied placeholder text with `UNCONFIRMED`/KB-GAP flags — the
  compiler emits placeholder extracts and routes them to kb-audit (T20). The format
  needed no new construct for this; a `FLAG` in the Chassis section plus a Homebrew
  block covered it.
- **Reflavor with a mechanical change** (Autognome → Marionette, Small → Medium)
  uses the reflavoring table's DM-approved column as intended.
- **The sheet-vs-RAW invocation-timing wrinkle** (three invocations recorded at
  level 1) is captured as a `FLAG`, keeping the doc honest without blocking — a good
  demonstration that `FLAG` is for "recorded as built, but note this."

## Level-up dry run (§16) — Vice 2 → 3

Exercised the level-up path once (`Characters/vice-l3-test.character.json`, kept in
the data home, never in the repo):

- Bumped `currentLevel` 2 → 3 **and** Warlock `levels` 2 → 3 (per the D3 fix);
  Warlock hit dice `count` 2 → 3.
- Pact slot pool became **two 2nd-level slots** (slotLevel 1 → 2); recovery stays
  short-rest.
- **Awakened Mind** and **Psychic Spells** (both `unlockLevel: 3`) flip from
  grayed Build-view content to active Level-view content automatically, because
  their unlock level is now ≤ `currentLevel` — no structural edit needed, which is
  the view-mode design (scope D14) working as intended.
- Validated **PASS** (0 errors) after the class-levels fix.

Documented as **deferred for a real level-3 compile** (not baked into the dry run,
to avoid asserting unverified numbers): embedding the 2nd-level Warlock pool tier
(§7/§13), the increased prepare count at Warlock 3, Francesco's **rolled** HP value
(the dry run used an average placeholder with a note), and resolving the GOO
KB-GAP so the newly-active subclass features render from real 2024 text.

## Recipe changes made in response

- **§16 step 1** — made explicit that raising `currentLevel` requires raising the
  Classes table's `levels` in lockstep, and that the validator enforces the
  invariant (D3).

No other recipe-bug class remained after iteration.
