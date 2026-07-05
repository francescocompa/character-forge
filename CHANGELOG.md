# Changelog

Newest batch first. One entry per task/batch; reference the planning task ids
(T01–T22) where applicable.

## 2026-07-05 — T20 follow-up: unified-diff context fix + bin-link note

Audit pass over the T20 batch.

- **`kbDiff.ts`** — hunks emitted only 2 trailing context lines instead of 3
  (the trim ran before the current op was pushed, over-trimming by one). Output
  now matches `diff -U3`; two tests pin leading/trailing context and hunk
  splitting (19 kb-diff tests). Classification untouched — the real Vice run
  reproduces T20's acceptance counts exactly.
- **`pipeline/kb-audit.md`** — note the `npm rebuild @character-forge/validate`
  escape hatch when `npx character-forge-kb-diff` 404s because `node_modules`
  predates the bin (npm doesn't relink bins into an already-reified tree).

## 2026-07-05 — T20 kb-audit (extract-drift diff + refresh recipe)

The maintenance path for decision D5: characters embed the KB's full text at
compile time, so when the KB is re-compiled those copies can go stale. This batch
adds the tooling to find and fix that drift.

- **`pipeline/validate/src/kbDiff.ts` + `kbDiff.cli.ts`** — the
  `character-forge-kb-diff` bin (second bin in the validate workspace). For every
  non-Homebrew `library` extract it resolves the current KB entry via
  `MANIFEST.json` (match on `name` + `edition`; `source` then `type` break ties),
  reads the `## <name>` block out of the entry's file, whitespace-normalises both
  sides, and classifies `unchanged` / `changed` (with a context-3 unified diff) /
  `missing-from-kb` / `not-in-manifest` / `homebrew-skipped`. Dependency-free LCS
  diff. `--json` report documented in `pipeline/validate/README.md`; exit 0 when
  nothing needs action. Never reads or emits Homebrew text (scope §4).
- **`pipeline/kb-audit.md`** — the recipe: run kb-diff over `Characters/`, triage
  each `changed` (cosmetic/boilerplate → refresh; substantive rules change → spell
  out the mechanical consequence + the summaries/stats it invalidates, and ask
  Francesco), flag missing/unfindable without ever deleting an extract, then
  refresh + fix derived numbers + re-validate (T04) + record an audit note.
- **`fixtures/fake-kb/`** — a tiny invented-content KB mirroring the synthetic
  fixture's non-Homebrew entries, seeding one of each status. `kbDiff.test.ts`
  (17 tests) exercises all five plus the pure helpers.
- Docs: `pipeline/README.md`, `pipeline/validate/README.md`, `fixtures/README.md`.
- **Real run (acceptance):** kb-diff on the local Vice file against the current KB
  (v2.31.0) — 25 `unchanged` (all spells + the Autognome species, verbatim match),
  4 `changed` (invocation extracts where the compiler intentionally dropped the
  KB's `Prerequisite:`/`Type:` boilerplate — mechanical body identical, benign),
  1 `missing-from-kb` (the Warlock class overview is a `#`-level heading in a
  composite class file, not a top-level `##` block), 10 `not-in-manifest` (class/
  subclass features and one reflavored subclass name — the KB doesn't index these
  individually), 5 Homebrew skipped. No stale rules text; the deltas are the
  compiler's deliberate compression, not KB drift. (Run described only; no WotC
  text in this repo — scope §4.)

## 2026-07-05 — T19 compile recipe (chassis doc → character.json), proven on Vice

The compiler itself — instructions a cold Claude session follows to turn a
`*.chassis.md` into a validated, self-contained `*.character.json`. Docs only —
no code touched. Proven by recompiling Vice to a file mechanically equivalent to
the T03 ground truth (the M3 milestone check).

- **`pipeline/compile.md`**: the recipe. Inputs (chassis doc, KB path,
  `currentLevel`, optional session file for adopting `additions[]`); retrieval
  discipline (MANIFEST-first, edition filter, verbatim extracts, no paraphrase);
  the **compression style guide** (§6) — action-economy-first, keep every number,
  drop flavor, resolve choices inline, colour with markup, plus the honesty rule —
  with 6–8 worked before/after examples (invented content, repo-safe); pool
  embedding (D13); multiclass duties (D11 — class order, per-class hit dice,
  per-source spellcasting, coexisting slot pools, origin tags); variants (D12);
  progression + `unlockLevel`/`TBD` semantics; computation duties (scores, PB,
  saves, skills, AC/HP by the doc's method, per-source DC/attack, structured
  mixed recovery); library assembly + referential integrity; the ≤ 5 MB budget +
  lore-first trimming; the validator loop + self-review checklist; and the
  **level-up path** (§16 — bump level + class levels, resolve that level's TBDs,
  recompile, adopt session additions).
- **`pipeline/proof-vice-diff.md`**: the T19 proof. Recompiling Vice from a
  freshly-written `vice.chassis.md` reproduces the T03 file with **0 structural or
  computed-value differences** (874 leaf paths, 0 added/removed); the only deltas
  are re-authored summary wording (mechanically equivalent, human-reviewed). Both
  files validate green. One recipe gap found and fixed (level-up must bump class
  `levels` with `currentLevel`); the Vice 2 → 3 level-up path exercised once.
- Repo-safe by construction: the chassis doc, recompiled file, and level-3 dry run
  live in the local data home (`Characters/`), never here; `proof-vice-diff.md`
  describes differences only and holds no WotC text (scope §4).

## 2026-07-05 — T18 pipeline front door (interview + chassis format)

The pipeline's authoring layer: how a build idea becomes a `*.chassis.md`, and
how that document maps onto the schema. Docs only — no code touched. Phase 4
starts here (compile T19, kb-audit T20, docs T21 follow).

- **`pipeline/chassis-format.md`**: the human-first chassis document format —
  frontmatter (identity + rules envelope: `ruleset`/`sources`/`currentLevel`/
  `targetLevel`) and the sections concept & reflavoring · chassis (species,
  background, class(es) with order/levels/hit die/planned subclass) · homebrew
  (full rules text, verbatim → `library` extracts) · level-by-level progression
  · volatile-pool defaults (D13) · equipment · companions · variants (D12). A
  fully annotated **multiclass** example anchored to
  `fixtures/synthetic.character.json` (provable round-trip), precise **`TBD(...)`
  semantics** (at/below `currentLevel` = blocking; above = non-blocking planned),
  and a **field → schema mapping table** flagging each region as read-from-doc
  vs compiler-derived.
- **`pipeline/interview.md`**: cold-start instructions for a Claude session to
  co-write the chassis doc — rules-accurate collaborator (2–3 cited options, no
  invented rules), KB lookup via `MANIFEST.json` + `_legend.md`, per-entry
  user-approved edition mixing, verbatim homebrew protocol, `TBD`/`FLAG`
  discipline, and the hard rule that the interview **never** writes a
  `character.json` (compile is a separate step).
- **`pipeline/README.md`**: one-page interview → compile → validate overview +
  when to run kb-audit; links the four pipeline docs.
- **`pipeline/examples/thessaly-quill.chassis.md`**: a worked dry-run product,
  wholly invented content (public-repo safe) — single-class caster, reflavored
  species, DM-approved homebrew background, a prepared-spell pool, a companion, a
  planned subclass, one variant, and TBD markers above the current level.
- **`.gitignore`**: added `!pipeline/examples/**/*.chassis.md` so the synthetic
  example is tracked while real `*.chassis.md` build docs stay ignored (mirrors
  the existing `!fixtures/**` IP-guardrail exceptions).

## 2026-07-05 — T17 PWA polish & offline hardening

Character Forge is now a real installable, offline-first app: a dark-matching
launch surface, a complete icon set, a controlled update flow, and iOS quirks
handled. No network calls at runtime beyond service-worker update checks (§8).

- **Manifest** (`app/vite.config.ts`): name "Character Forge" / short_name
  "Forge", standalone + portrait, dark `theme_color`/`background_color` from the
  `--surface-bg` token (D10), and `scope`/`start_url`/`id` pinned to the Pages
  sub-path `/character-forge/`. Icons: `pwa-192`, `pwa-512` (any) +
  `maskable-icon-512` (maskable, glyph in the safe zone).
- **Icons** (`app/public/`): a neutral d20 glyph in the arcane-indigo accent on
  the dark surface, drawn as `icon.svg` / `icon-maskable.svg` and rasterized to
  the PNG set (192/512/maskable/apple-touch/favicon). Placeholder by intent —
  Francesco restyles later.
- **Service worker** (vite-plugin-pwa, `registerType: 'prompt'`): precache the
  full shell **including the bundled Inter woff/woff2** (the default glob omits
  fonts — critical for offline text) via an explicit `globPatterns`;
  `navigateFallback` so deep reloads work offline under the sub-path;
  `globIgnores` skips any `*.character.json` dropped in `public/` (KB extracts
  never get precached). Build precaches 75 entries (~1.6 MB).
- **Update flow** (`app/src/app/UpdateToast.tsx` + `updateToast.css`): a
  bottom "New version available — Reload / Later" toast via `useRegisterSW`;
  the new shell is fetched but never swapped mid-session until Reload. Also a
  one-time "Ready to work offline" confirmation after first install.
- **iOS specifics** (`app/index.html`, `app/src/app/global.css`):
  `apple-mobile-web-app-*` tags (translucent status bar, home-screen title),
  `apple-touch-icon`, `theme-color`; safe-area insets on the shell + library
  roots and both bottom sheets (already had `env(safe-area-inset-bottom)`);
  `viewport-fit=cover` (kept); **inputs forced to 16px on narrow widths** to
  kill iOS focus-zoom; `overscroll-behavior: contain` on scroll surfaces;
  `-webkit-text-size-adjust: 100%`.
- **Persistent storage** (`app/src/app/persistStorage.ts`): best-effort
  `navigator.storage.persist()` on boot to reduce IndexedDB eviction of the
  character library + session layer. Never throws.
- **Docs** (`docs/INSTALL.md`): plain-language install steps for iPhone
  (Share → Add to Home Screen) and desktop, plus the Google Drive → import
  flow, written for future-Francesco.
- Verified: `verify` green; production build emits `sw.js` + a valid
  `manifest.webmanifest` (icons, scope, dark colors) with the real character
  file excluded from precache. Lighthouse-installable / airplane-mode / device
  safe-area checks are the on-device acceptance step (Pages deploy + iPhone).

## 2026-07-05 — T16 character import & management

The app now holds a **library of characters** instead of one bundled file. Files
come from a picker or a drag-drop, persist on-device, and group into variant
cards (D12). This replaces T08's provisional single-character loader.

- **Persistence** (`state/db.ts` → v2 + `state/characterDb.ts`): a new
  `characters` IndexedDB store keeps imported files verbatim (plus a display
  alias + import date). Deleting a character wipes every session keyed to it.
  The app works fully offline after the first import — no re-pick on reload.
- **Import** (`manage/importCharacter.ts`, `validateImport.ts`,
  `useCharacterImport.ts`): read → **version-gate** (a too-new `formatVersion`
  gets a plain "update the app" refusal before anything else) → **validate**
  (ajv layer 1 + referential layer 2, reused verbatim from
  `@character-forge/validate`, now exposed via an `exports` map) → **classify**
  against the library. New character / new variant commit silently; a same
  id+label file raises a **refresh** confirmation showing the name/level/format
  diff, and the session layer survives (reconciled by the T14 engine).
- **Library screen** (`manage/CharacterList.tsx`, `CharacterCard.tsx`):
  cards with portrait/monogram, name, class + level, and a variant badge;
  variants of one character share a card (D12). Empty state explains the flow
  in plain words + a WotC-free **Load a sample character** (the synthetic
  variant pair). Whole-screen drag-drop shares the picker's dialogs.
- **Opened character** (`manage/CharacterWorkspace.tsx` + `AppShell` chrome):
  a Back-to-library control and a **variant switcher** chip row; switching
  remounts the shell so each variant keeps independent session state.
- **Manage** (`manage/ManageDialog.tsx`, `about.ts`): rename a display alias
  (never touches file data; applies across a character's variants), per-variant
  **Delete** (leaves siblings intact), and **About this file** (format version,
  compiled date, library/spell counts). Export session stays in the workspace
  topbar (T15 placement, now owned here).
- iOS: the picker uses `<input type=file accept=.json,application/json>` (works
  with the Files app incl. the Google Drive location); no File System Access API
  dependency. Verified in responsive mobile mode; the manual on-device step is
  in T16's acceptance notes.
- Tests: `characterDb` (round-trip, refresh-preserves-alias, group + delete-one,
  session wipe on delete), `importCharacter` (parse / version-gate / classify),
  `group` (variant grouping + alias lift). App 213, schema 41, validate 31 —
  all green; production build + PWA precache clean.

## 2026-07-05 — T15 in-session additions (boons / found items / notes)

Mid-session captures (D2): the DM grants a boon, the party finds an item, a
detail needs noting. All land in the session layer, render inline where they
belong, and export for adoption at the next recompile.

- **Contract** (`session.schema.json` + `types.ts`): `Addition` extended with
  kind-specific fields — `quantity`/`weightLb` (item), `limitedUse` (boon: max
  - a `RecoverModel`, mirrored into the session schema). Boon use-counts live in
    `trackers.additions`, ticked and rested like any resource.
- **Engine** (`sessionEngine.ts`): `updateAddition` (edit in place, clamps live
  uses if the cap shrinks), `tickAddition`/`untickAddition`, `removeAddition`
  now clears the boon's uses, and `applyRest` recovers limited-use boons on
  their own rule (long includes short).
- **Add / edit flow**: one bottom-sheet dialog (`session/additions/`), reached
  from a global **+ Add** in the shell and from each row's **Edit** — kind
  switch, kind-specific fields, a live `SheetMarkup` preview that flags bad
  markup but still saves it as plain text. Built for one-handed use at 375 px.
- **Display**: items → Equipment (qty/weight join the carried total), boons →
  Features (own ticks + recover badge), notes → a Main-sheet card; all wear a
  subtle "session" marker with Edit/Remove.
- **Export**: **Export session** downloads `<name>.session.json` (the file a
  compile session reads to adopt additions). Menu placement is provisional —
  T16 owns the character-management chrome.
- Tests: engine additions block, `additionDraft`/`sessionExport` unit tests, a
  synthetic `fixtures/synthetic.session.json` the T04 validator checks clean
  (app 197, schema 41, validate 31 — all green).

## 2026-07-04 — offshoot decisions locked + ability/death-save alignment

Francesco confirmed the offshoot direction: **accent = arcane indigo
`#7a6fe0`** (no longer provisional), 3D dice approved (accent-tinted, planned
as T24), current tab shell stays, Vecna reserved for dice faces.

- **Ability hues → monster-forge's `cc-ab` scheme** (same canon both apps
  share): STR `#e05a5a`, DEX `#5fb4e6`, CON `#e88c3c`, INT `#a06ed6`,
  WIS `#5fa873`, CHA `#e878b4`; soft variants at its .22-alpha tint.
- **Ability cells → the `.abil .cell` recipe**: input-well bg, border
  `color-mix(ability 55%, hairline)`, colored codename. The big value stays
  the modifier (play-sheet hierarchy; monster-forge's editor leads with the
  editable score).
- **Death saves → the `.hpm-ds` pattern**: successes (green) left of a
  centred DEATH SAVES label, failures (red) right; circular pips whose
  border color states each group's meaning before any are filled
  (`Defense.tsx` + CSS; TickBoxes and its a11y labels unchanged).
- Planning: **Phase 3.5** added — T23 (thorough monster-forge DS alignment;
  audited component catalog embedded in the task) and T24 (3D dice port) in
  `planning/tasks/`; `planning/monster-forge-restyle.md` updated with the
  decisions.

## 2026-07-04 — T14 audit fixes + monster-forge visual inheritance

**T14 audit — two rest-semantics bugs fixed in `sessionEngine.ts`:**

- **Long rest now applies short-rest recovery too.** `applyRest('long')` only
  fired `on:'long'` rules, so Vice's Pact Magic slots (encoded `on:'short'`
  only, per the 2024 "Short or Long Rest" text) never refilled on a long rest.
  Rest semantics are the engine's to own — files encode each feature's
  _shortest_ recovering rest; a long rest is a superset (`ruleApplies`).
- **Companions now rest with the character.** `applyRest` ignored companions
  entirely: Tiresia's HP stayed damaged after a long rest and companion
  `resources` recover rules never fired. Long rest restores companion HP to
  the compiled max; both rests apply companion resource recovery.
- Two regression tests added (`sessionEngine.test.ts`, now 31).

**Restyle — character-forge is now a visual offshoot of monster-forge
(Francesco's direction, this session):**

- `tokens.css` remapped to monster-forge's dark scale: surfaces
  `#121317/#1b1d22/#23262d` (+ `--surface-input #0e0f12`), hairline `#30343d`,
  ink `#e7e9ee/#a4aab4/#7e858f`, radius steps 5/7/10px (its `--r-sm/--r/--r-lg`),
  semantic `--ok/--warn/--bad/--info` inherited verbatim. The sheet-canon
  ability/damage/origin/recovery palettes are character-forge's own and stay.
- New `--accent/--accent-soft/--accent-hover` family — deliberately NOT
  monster-forge's terracotta (the two apps must stay distinguishable).
  **PROVISIONAL** arcane indigo `#7a6fe0` pending Francesco's pick; focus ring
  now follows the accent.
- Inter bundled via `@fontsource/inter` 400–700 (offline PWA — no Google
  Fonts fetch at runtime, unlike monster-forge), `--font-family` updated,
  content size aligned to monster-forge's 14px rhythm.
- `vite.config.ts`: PWA `theme_color`/`background_color` → `#121317`;
  dev server honors `PORT` (with `autoPort` in `.claude/launch.json`, preview
  sessions no longer collide on 5173 — unblocks the T08/T10/T11 gripe).
- Deferred to Francesco (design decisions, not started): final accent hue,
  the 3D dice port (three+cannon, Vecna faces), any layout-level parity
  (rail nav vs current tabs), Vecna as a display face anywhere in-app.

## 2026-07-04 — T14: session state engine (IndexedDB + rest logic)

- `app/src/state/`: the real `SessionStore`, replacing the T08 in-memory
  stub (`app/src/session/memoryStore.ts`, deleted). `sessionEngine.ts` is the
  pure, synchronous mutation core (ticks, rests, loadout, undo — ported
  from the stub) shared by `IndexedDbSessionStore.ts`, which wraps it with
  `idb` persistence keyed by `characterId::variantLabel::characterFormatVersion`
  (`db.ts`). Returns synchronously with a fresh in-memory seed — first paint
  never blocks on IndexedDB, and it degrades gracefully where IndexedDB
  doesn't exist (this repo's Node-environment unit tests included) — then
  hydrates any saved session in the background. Writes are debounced (400ms)
  and flushed on `visibilitychange`/`pagehide`.
- **`reconcileSessionState`**: on hydration, drops refs the character file no
  longer has (resources, slot pools, hit-dice groups, consumables, loadout
  pool/option selections, companions), seeds defaults for anything new, and
  logs what it dropped — the "refresh from file" contract T16 will call into.
- **maxHP override (T03 review item F2), schema addition**: `stats.maxHp` may
  be an average or a rolled value (Vice's 26 is rolled); `Trackers.maxHpOverride`
  (session.schema.json + types.ts) lets the player record a rolled/hand-edited
  total without touching the character file. `applyLongRest`'s "HP to max"
  uses the override when set. Wired into `MainSheet/Defense.tsx` (`MaxHpOverrideControl`):
  a checkbox + number input showing both the active override and the compiled
  value.
- **Hit-dice long-rest recovery, schema addition**: `HitDiceGroup.recover?:
RecoverModel` (character.schema.json + types.ts) — the compiler pre-resolves
  how many hit dice a long rest regains per class (no hardcoded "half your hit
  dice, minimum 1" in the engine); both synthetic fixtures updated with a
  concrete rule per class group.
- **Loadout selection now enforces the pool's `chooseCount`** at the engine
  level (`select` refuses past the cap) — the ManageMode UI already disabled
  it; this is the safety net for any other caller.
- Companion namespacing (T12) carried over unchanged; two variants of one
  character get fully independent engines/keys (D12).
- Tests: `sessionEngine.test.ts` (29, rest logic 100% stmt/line coverage) +
  `IndexedDbSessionStore.test.ts` (4, round-trip via `fake-indexeddb`, new
  devDependency). `Equipment.test.tsx`/`Companion.test.tsx` updated off the
  deleted stub onto `createSessionEngine`. `verify` green across all
  workspaces (239 tests).

## 2026-07-04 — Advantage/disadvantage badges → dice icons

- `AdvBadge`/`DisBadge` (`app/src/components/chips/`) now render a shared
  d20-outline icon (`DiceStateIcon.tsx`) with an up/down chevron — green for
  advantage, orange/red for disadvantage (scope §2.1's `--adv`/`--dis`
  tokens) — instead of the "EDGE"/"DIS" text pills. Same call sites
  (`SheetMarkup.tsx`'s `{adv}`/`{dis}`, `tokens/Gallery.tsx`), same a11y
  contract (`role="img"` + `aria-label`, now "Advantage (EDGE)" /
  "Disadvantage").

## 2026-07-04 — T12: companion sheet view

- `app/src/views/Companion/`: a full mini-sheet per companion (familiars,
  sidekicks) — identity (name, portrait, a type/size line resolved from the
  companion's library `ref`, since the schema has no separate type/size
  field), ability rail + saves + skills, AC/speeds (incl. alternate
  movement) + interactive current/temp HP, resistance/immunity/
  condition-advantage chips + senses + languages, an attacks table
  (markup damage, riders, separable magic bonus), and a features list
  (markup summaries, tappable refs). A `CompanionSwitcher` appears only with
  more than one companion (schema already supports several); `AppShell` hides
  the Companion tab entirely at zero. Reuses `MainSheet`'s CSS primitives
  (`.panel`, `.stat`, ability/save/skill row styles, `.attack*`/`.tohit*`) and
  `Features`' `.feature-list*` — both load globally via `AppShell`'s static
  imports, same convention as T11's equipment view.
- Session-layer namespacing (D2, T02's `TrackerScope`) already covered
  companions from T08's stub — `SessionStore.setCurrentHp/setTempHp` and
  `tick/untick` all take an optional `{ owner }` scope, and `memoryStore.ts`
  keys companion trackers under `state.companions[id]`. The only gap was the
  `TrackerTicks` React helper (`MainSheet/Ticks.tsx`) not exposing that scope
  to callers — added an optional `scope` prop, threaded through to the store,
  so a companion's resource ticks land in its own bucket instead of the main
  character's. `ProficiencyDot` (`MainSheet/Abilities.tsx`) is now exported
  for the same reuse-not-duplicate reason.
- **Known gap, noted for T14**: `CompanionTrackers`/`SessionStore.setDeathSaves`
  have no per-companion death-save tracking. Neither fixture companion
  (a familiar) needs it, and the schema has no field marking "this companion
  uses death saves" (unlike a PC or a 2024-rules sidekick) — adding one
  without a real case to shape it would be a guess, so v1 skips it rather
  than invent the flag.
- Verified against the local Vice fixture (`app/public/vice.character.json`,
  gitignored, T08's dev-only path): Tiresia renders complete vs PDF p.7 — STR
  −2 … CHA +2, AC 13, HP 21/21, speeds 20 ft/fly 40 ft, Sting +5 (1d6+3
  piercing + 2d6 poison), all five features, Devil's Sight 120 ft, resistance/
  immunity/condition-advantage chips — and the HP stepper edits only the
  companion's own tracker (confirmed independent of the main character's HP).
  375 px: tab bar scrolls horizontally to reach Companion (existing
  `overflow-x: auto` shell behavior), content stacks to one column, clean.
  `verify` green (schema 41, validate 30, app 150 across 16 files, incl. 9 new
  Companion tests against the synthetic Ember Sprite fixture — the CI path).

## 2026-07-04 — T11: equipment view

- `app/src/views/Equipment/equipmentHelpers.ts`: pure, unit-tested helpers —
  the schema carries no per-item "which section" discriminator (the same gap
  T09 hit with `progression[]`), so the documented convention is: the library
  extract's `type` sorts an item into `'magic item'` → Magic Items,
  `'component'` → Components, anything else → Gear (`classifyItem`/
  `groupItems`). Also: effective equipped/carried state (session override
  over the file's compiled default, D13), total carried weight (arithmetic,
  `currentLevel`-filtered rather than view-mode-filtered — Build view
  previews a not-yet-owned item grayed, but it can't weigh you down, so the
  total doesn't change when the player flips Level/Build), push/drag/lift
  (SRD baseline: 2x carrying capacity), and the attuned-items list.
- `app/src/views/Equipment/`: `GearPanel` (Gear/Components/Magic items
  sections, equipped/carried checkboxes bound to the `SessionStore`,
  Build-view future graying, and in-session `kind: 'item'` additions
  rendered inline in the Gear section with a subtle "session" marker — T15
  lands the add-UI, this just renders whatever the store already holds),
  `MasteriesPanel` (weapon-masteries manage flow mirroring T10's prepare
  mode — full option browse, live count capped at `chooseCount`, rest-rule
  as an informational note; placed on Equipment rather than Main so Main's
  Attacks panel, T13, stays a clean at-a-glance table), `AttunementPanel`
  (N slots, filled ones named — read-only in v1, since the T02
  `SessionStore` contract has no attunement toggle yet), `CapacityPanel`
  (total carried + capacity + push/drag/lift, all in lb and kg per D15 #8),
  and `CurrencyPanel` (cp/sp/ep/gp/pp, big tappable number fields, absolute
  values via `store.setCurrency`).
- `fixtures/synthetic.character.json`: added a `'component'`-typed item
  (Incense, consumed per ritual cast), a `'magic item'`-typed attuned item
  (Ember Cartographer's Compass — ties back to the existing `ember-charm`
  spellcasting source, explaining why its DC/attack differ from the wizard
  class DC), a spare unequipped weapon (Dagger, exercises the equip toggle)
  added as a third `weapon-masteries` pool option (exercises "not currently
  selected, pool at its `chooseCount` limit"), and a level-5 not-yet-owned
  magic item (Ashwalker Cloak) to exercise Level-view hiding / Build-view
  graying without it polluting the current carried-weight total.
- Wired into `AppShell.tsx`, replacing the T11 `ComingSoon` placeholder.
- Live in-browser verification wasn't possible this session — another
  session's dev server already held the shared port (same constraint noted
  in T08/T10) — so this batch leans on the render-snapshot tests (Level/
  Build, session-store-driven currency/equip/addition edits via a custom
  `createMemorySessionStore` instance, masteries limit gating, weight/
  capacity math) for coverage. Worth a manual desktop/375px pass next time
  the app is open. `verify` green (schema 41, validate 30, app 141 across 15
  files).

## 2026-07-04 — T10: spells view

- `app/src/views/Spells/spellHelpers.ts`: pure, unit-tested helpers — level
  grouping for both the main spell list (`Spell.level`, cantrips first) and a
  `preparedSpells` pool's full option browser (matched against known spells
  by ref/name since the generic `PoolOption` shape carries no `level` of its
  own; unmatched candidates land in an "Other" bucket rather than a schema
  change), a stable source-id → origin-dot palette index, the D13 "current
  selection + always-prepared" visibility rule (`isSpellShown` — only
  `role: 'prepared'` spells with a `poolRef` are gated by the live session
  selection; a not-yet-unlocked one previews in Build view regardless), and
  swap-history ordering. (File is `spellHelpers.ts`, not `spells.ts`, to avoid
  a case-only clash with `Spells.tsx` on a case-insensitive filesystem.)
- `app/src/views/Spells/`: casting headers per source (ability, save DC,
  attack mod, prepare rule, cross-source note), slot pips grouped by spell
  level so pools that coexist with different recovery read side by side
  (Wizard Slots LR vs the homebrew Arcane Font SR, both 1st-level), the clean
  play list grouped by level via the reused `CollapsibleSection` (Features),
  and the D13 prepare/manage mode: browses a source's full embedded pool
  (including options the character doesn't currently have selected),
  highlights the live selection, caps it at the source's prepare-count with a
  live counter, and shows the rest-rule as an informational note — never
  blocking. Build view adds the explicit `spellcasting.swaps[]` history
  ("L5: Ashen Bolt → Frost Splinter") that fixed-known casters need instead of
  inferring it from `unlockLevel`/`swapOutLevel`.
- `app/src/components/chips/OriginDot.tsx`: added an optional
  `secondaryIndex` — two `Spell.origins` render one two-tone, bordered dot
  instead of two solid ones (Vice's Hex convention, §2.8).
- `fixtures/synthetic.character.json`: gave the two casting sources distinct
  DCs/attack mods (the item-granted Ember Cartographer's Compass differs from
  the Wizard class DC) so a per-source rendering bug can't hide behind
  identical numbers; added `ritual`/`concentration` flags and a `ref` +
  library entry for Frost Splinter so every fixture spell is popover-able,
  including the future fixed-known swap target.
- Wired into `AppShell.tsx`, replacing the T10 `ComingSoon` placeholder.
- `verify` green (schema 41, validate 30, app 113 across 13 files). Live
  in-browser verification wasn't possible this session — another session's
  dev server already held the shared port — so this batch leans on the
  render-snapshot tests (Level/Build/manage-mode assertions against the
  synthetic fixture) for coverage; worth a manual desktop/375px pass next time
  the app is open.

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
