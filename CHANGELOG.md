# Changelog

Newest batch first. One entry per task/batch; reference the planning task ids
(T01–T22) where applicable.

## 2026-07-04 — T05: design tokens + chip/badge component set

- `app/src/tokens/tokens.css`: dark-first CSS custom properties — ability
  colors (+ soft variants), the 13 recognized damage types + neutral
  fallback, semantic (adv/dis/recovery/condition), structural (unlock-level
  badge, Build-view future-graying), a 6-slot origin-dot palette (§2.8), and
  the spacing/radius/typography scales. All values are hue anchors from the
  paper canon, lifted for dark surfaces; layered as one semantic-token file
  so a future light theme is a value remap only.
- `app/src/components/chips/`: 11 typed, state-free chip/badge components
  (`AbilityChip`, `SaveDCBadge`, `DamageText`, `AdvBadge`/`DisBadge`,
  `ConditionChip`, `RecoverIcon`, `LevelBadge`, `OriginDot`, `SchoolLabel`,
  `RefLink`, `FutureWrap`) plus shared color-lookup helpers. `DamageText`
  deliberately covers all three damage tags (`{dmg:}`/`{dice:}`/`{dtype:}`)
  via optional `type`/`dice` props, so T06 has one component for the whole
  damage family. Tappable chips get a ≥44px hit area via a pseudo-element,
  independent of visual size.
- `Gallery.tsx`: dev-only route (wired into `App.tsx` behind
  `import.meta.env.DEV`) rendering every chip variant plus a token swatch
  board — Francesco's in-browser tuning surface (D7). Verified in the
  preview browser; spot-checked contrast on the tightest cases (ability chip
  text on its soft background, save-badge dark-on-accent text) at ~5:1 and
  ~6.3:1 against `--surface-raised`.
- Added the missing `vite-env.d.ts` (`/// <reference types="vite/client" />`)
  — required for `import.meta.env` and CSS-module-less `.css` imports to
  typecheck; the T01 scaffold had omitted it.
- `verify` green across all workspaces (13 new component tests via
  `react-dom/server` static rendering, no jsdom needed).

## 2026-07-04 — T03 checkpoint review + spell swap-history model

- **T03 UNCONFIRMED items resolved with Francesco** (all 8; see
  `Characters/vice.compile-notes.md`, kept local). Corrections applied to the
  local Vice reference file: GOO subclass → RAW `unlockLevel: 3` (features grayed
  at L2), skill fix (Investigation not Persuasion), psychic resistance recorded
  as grayed L10 content, currency 24 gp, "Number's Kit"→Climber's Kit, companion
  Tinesia→**Tiresia**. Validator stays clean on Vice.
- **Spell contract reshaped (F1) — full swap-history model.** `Spell.origin` →
  `origins[]` (dual-source = two-tone dot), added `role`, `swapOutLevel`, and
  `spellcasting.swaps[]` (explicit out→in replacement links for fixed-known
  casters). Schema + `types.ts` + validator (referential + sanity) + both
  synthetic fixtures + the four invalid fixtures + schema/fixtures READMEs all
  updated; `verify` green (66 tests). Breaking change kept at `formatVersion: 1`
  (pre-release, no shipped consumer). Consumed later by the spells view (T10).

## 2026-07-04 — Phase 0 audit & closeout (pre-design review)

- Committed the `{dtype:TYPE}` markup tag (bare damage-type reference, no dice
  — the `{dice:}`/`{dmg:}` split applied to types) that was authored while
  fixing Vice's resistance lines: grammar doc + parser were edited but never
  committed. Added parser tests and a `resistances` usage in the synthetic
  fixture so the "every tag at least once" claim holds again.
- Aligned the app's displayed format version with the schema contract:
  `app/src/formatVersion.ts` now mirrors `character.schema.json`'s
  `formatVersion: 1` (was a stale `'0.1.0'` placeholder from T01).
- Audit result: `npm run verify` green (all workspaces), validator passes both
  synthetic fixtures and the local Vice file with 0 errors, CI green on `main`,
  `.gitignore` IP guardrail confirmed (blocks `*.character.json`, allows
  `fixtures/`). Phase 0 (T01–T04) closed; next up: Phase 1 design core
  (T05 tokens → T06 renderer → T07 popovers).

## 2026-07-04 — T04: validator CLI + synthetic fixtures

- `pipeline/validate/`: 4-layer validator CLI
  (`npx character-forge-validate <file> [--json]`) — schema (ajv 2020-12),
  referential integrity, markup lint, sanity/pool checks. Runs via `tsx`,
  no build step.
- Shared sheet-markup parser landed at `schema/markup.ts` (T06 imports it).
- `fixtures/`: `synthetic.character.json` ("Fenn Larkspur", homebrew-only
  multiclass stress test) + `synthetic-variant.character.json` (shared
  characterId for D12 grouping) + `fixtures/invalid/*` (one broken layer each).
- Run against the real local Vice file: found 6 `{dmg:}` misuses → led to the
  `{dtype:}` tag (see entry above); Vice now validates clean.

## 2026-07-04 — T02: schema + markup grammar

- `schema/character.schema.json` + `session.schema.json` (draft 2020-12,
  `formatVersion: 1`), hand-mirrored `types.ts` (incl. `SessionStore`
  interface), `markup-grammar.md` (full tag set, escaping, unknown-tag
  behavior), `schema/README.md` contract tour. Multiclass, variants, and
  volatile-element pools are first-class.

## 2026-07-04 — T01: repo scaffold, CI, Pages deploy

- Public repo scaffolded: npm workspaces (`app`, `schema`,
  `pipeline/validate`), Vite 6 + React 18 + strict TS + PWA shell,
  ESLint/Prettier/Vitest, `verify` script.
- CI: verify on push/PR; build + deploy `app/` to GitHub Pages on `main`
  (live at https://francescocompa.github.io/character-forge/).
- `.gitignore` IP guardrail: no WotC content, character files, chassis, KB,
  or PDFs can enter the public repo (fixtures/ exempt, synthetic only).
