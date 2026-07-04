# Changelog

Newest batch first. One entry per task/batch; reference the planning task ids
(T01–T22) where applicable.

## 2026-07-04 — T09: features view

- `app/src/views/Features/group.ts`: pure, unit-tested grouping of
  `progression[]` into the Features IA. Documents the modeling convention this
  task needed (the schema has no per-item "which section" field): `classRef`
  sorts an item into that class's section; among classless items, `kind:
  'feature'` is a species trait (only species grants classless features —
  2024-style backgrounds grant proficiencies + a feat, not features); `kind:
  'feat' | 'asi'` always lands in the top-level Feats section regardless of
  `classRef`. No schema change — this is a rendering-layer convention the
  compiler (T18/T19) should also follow when it starts emitting real files.
- `app/src/views/Features/`: one collapsible section per class (level badge,
  subclass grayed until unlocked, the compiled `kind: 'proficiency'` header
  line, then core → subclass → invocation sub-lists in unlock order), a species
  section (reflavored name + source tag, speed line, modifications, traits),
  a background section (granted tools, a link to its feat), and a top-level
  Feats section (every feat/ASI item with an origin tag, future slots grayed).
  `ProgressionRow`/`FeatureList` are shared across every section — future
  content wraps in `FutureWrap` exactly like the main sheet, and limited-use
  features get the same MAX/recover-icons/tick-boxes treatment via a
  `LimitedUse` component built on the now-exported `RecoverBadges`/`maxCount`
  helpers from `MainSheet/Resources.tsx` (single implementation, no drift).
  `CollapsibleSection` folds on mobile (≥ 44 px header, chevron) and forces
  expanded on desktop (≥ 768 px) regardless of fold state — state is per
  section instance, in memory only, matching the T09 spec.
- `app/src/character/CharacterProvider.tsx`: added an optional
  `initialViewMode` prop (test-only, mirrors `SessionProvider`'s `store`
  injection) so Build-view rendering can be exercised without touching a
  React state setter mid-render.
- `fixtures/synthetic.character.json`: extended (still schema-valid, `verify`
  clean) with a `kind: 'proficiency'` item per class (Fighter starting-class
  grants vs Wizard's reduced multiclass grant — exercises "starting-class vs
  multiclass already resolved"), a classless species trait (Umbral Step), a
  classless background feat + its library entry (Tireless Cartographer), and a
  future `kind: 'asi'` item at level 4 (> currentLevel 3) to exercise Build-view
  graying in the Feats section.
- Wired into `AppShell.tsx`, replacing the T09 `ComingSoon` placeholder.
- Verified in-browser at 1400 px (both class sections, proficiency lines,
  ticks working through the session store, Level view hiding the level-5
  subclass and level-4 ASI, Build view showing both grayed + badged, popovers
  opening with the Homebrew footer) and 375 px (mobile collapse toggles
  independently per section, ≥ 44 px tap targets). `verify` green (schema 41,
  validate 30, app 88 across 11 files).

## 2026-07-04 — T08: main sheet + view modes

- `app/src/character/CharacterProvider.tsx` + `visibility.ts`: the shared
  character/view-mode context. Holds the loaded file and the global Level/Build
  mode (D14), exposes mode-aware `isVisible`/`isFuture` (the single place "what
  shows at this level" is decided) and `nameOf` (ref → library name). Mode is
  remembered per character across remounts. `visibility.ts` is pure + unit-tested.
- `app/src/session/memoryStore.ts` + `SessionProvider.tsx`: the in-memory
  `SessionStore` stub (T08) implementing the full T02 contract — HP/temp/death
  saves, per-pool slot + per-resource + per-class hit-die ticks (clamped against
  the file's maxes), consumable tallies, currency/conditions/inspiration,
  loadout select/deselect (seeded from pool `defaults`), rests that apply each
  rule's recovery (mixed recovery works), and single-step undo. `getState`
  returns a stable snapshot so it's `useSyncExternalStore`-safe. T14 swaps the
  implementation, not the interface. Unit-tested against the synthetic fixture.
- `app/src/views/MainSheet/`: the main sheet rendered from a `CharacterFile` —
  identity strip (per-class level badges, planned subclass hidden until its
  level), ability rail + saves + skills (proficiency/expertise dots, passives),
  defense/tempo (AC + note, initiative, PB, speeds, interactive HP + death
  saves, per-class hit dice, per-source spell DCs), resistance/immunity/
  condition chips, resource strip (mixed-recovery icons, interactive USED
  boxes, short/long rest + undo), consumable counters, senses/languages/
  proficiencies, and an attacks table with separable magic bonus + rider lines.
  A clean `ActionsSlot` reserves T13's spot. Responsive: ≥ 1024 dashboard grid,
  ≤ 768 single column with ≥ 44 px tap targets. Tokens only.
- `app/src/app/AppShell.tsx`: tab shell (Main / Features / Spells / Equipment /
  Companion; Main default, others placeheld for T09–T12) with the global
  Level/Build toggle, composing library → character → session providers. Now the
  app root (`App.tsx`), replacing the T05 gallery.
- `app/src/character/characterFile.ts`: bundles the synthetic fixture as the
  CI-safe default and, in dev only, swaps in a local `public/vice.character.json`
  if present (gitignored; never shipped). `app/src/library/MarkupText.tsx`:
  shared markup-with-popovers wrapper every view uses.
- Verified by server-render tests: the synthetic multiclass fixture (two class
  badges, per-class hit dice, mixed recovery, ammo counter, attack riders, Level
  view hides future content) and a throwaway local Vice spot-check (AC 16, HP 26,
  DC 13, three resources, subclass hidden at level 2). Browser preview was
  unavailable (another session held the project's dev port). `verify` green
  (schema 41, validate 30, app 75 across 9 files).

## 2026-07-04 — T07: popover / library system

- `app/src/library/LibraryProvider.tsx`: `LibraryProvider` holds the character's
  `library` map and owns the single open surface; `useLibrary().openRef(refKey,
  anchorEl?)` opens an extract. Views wire `SheetMarkup`'s `onRef` (key only) to
  it once — `openRef` then anchors the popover to the focused trigger and returns
  focus there on close. Refs tapped inside an open extract push onto a stack so
  "‹ Back" walks back rather than closing.
- `app/src/library/LibrarySurface.tsx`: the one open surface, portalled to
  `<body>` so opening never shifts the sheet. ≥ 768 px anchored popover
  (max-width ~28 rem, internal scroll); < 768 px bottom sheet with a drag handle
  (dismiss past 90 px) and safe-area padding. Focus-trapped, Esc/scrim close,
  `role="dialog"` + `aria-modal`. Missing ref → inline "not in library" note,
  never a crash.
- `app/src/library/markdown.ts` + `ExtractMarkdown.tsx`: minimal GFM block parser
  (headings, paragraphs, ordered/unordered lists, fenced code, tables incl.
  alignment) whose inline runs go through `SheetMarkup` (T06), so bold/italic,
  colored chips, and `{ref:…}` links render inside extracts too.
- `app/src/library/position.ts`: pure `placePopover` geometry (below/above flip,
  viewport clamp, scroll-height cap) — DOM-free, unit-tested.
- `app/src/tokens/Gallery.tsx`: wrapped in `LibraryProvider`; new "Library
  popovers (T07)" section with three invented-homebrew extracts (no WotC text,
  scope §4) covering a GFM table, headings, lists, and a nested ref.
- Verified in-browser via preview at 1280 px (anchored popover, clamped, body
  scrolls) and 375 px (bottom sheet, table legible): same trigger, both
  surfaces; nested-ref back; missing ref; Esc + focus restore; scrim dismiss; no
  layout shift. `verify` green (schema 41, app 50 across 6 files, validate 30).

## 2026-07-04 — T06: sheet-markup renderer

- `app/src/markup/SheetMarkup.tsx`: `<SheetMarkup source onRef />` maps the
  shared parser's nodes to T05 chips — ability/save/damage-family/adv-dis/
  condition/recovery/level/ref/note tags, plus `**bold**`/`*italic*`
  passthrough. `{ref:KEY}` fires `onRef(KEY)` (the library key, not the label);
  T07 wires the actual popover. Total-function: a known tag whose args can't
  form a valid chip (bad ability, stray arity, non-integer level) degrades to
  plain text — visibly flagged in dev (`.markup-invalid`), bare in prod.
- No new parser: reused the shared `schema/markup.ts` that landed with T04, per
  the T06 spec ("if T04 already created a shared home, use it"). Added to its
  test suite a table-driven check that every grammar §4 worked example parses to
  its exact node tree, and a 1k-string fuzz asserting the parser never throws.
- `app/src/markup/SheetMarkup.test.tsx`: 20 tests — every node type mapped,
  `onRef` fires with the ref key (via element-tree walk, no jsdom needed),
  graceful-degradation cases, and snapshots of three composite lines.
- `verify` green across all workspaces (schema 41, app 33, validate 30). Parser
  branch coverage is exhaustive by construction; the repo ships no coverage
  tool, so the ≥95% gate isn't machine-checked here.

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
