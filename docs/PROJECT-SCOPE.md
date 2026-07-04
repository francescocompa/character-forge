# character-forge — Project Scope

> D&D 5e character sheet PWA, filled by Claude from a chassis + level-progression
> document, with full official text one tap away. Scoped 2026-07-04 from an audit
> of the Vice character sheet (MPMB v13.1.3 PDF) and the dnd-5e-knowledge-base.
> **Rev. 2 (same day):** cross-referenced against a second, multiclass sheet
> (Shigen, `~/Desktop/heavenly-archer.pdf`) and updated per Francesco's notes —
> dark-first, multiclass by default, view modes instead of always-grayed,
> volatile-element pools, character variations, Google Drive sync.
> **This document is required reading for every task in `planning/tasks/`.**

---

## 1. Vision

A local-first, movable character sheet app that reproduces the *system* of
Francesco's hand-filled paper sheets — not their pixel layout. Claude Code acts
as the **compiler**: it turns a human/Claude-co-written build document into a
validated, self-contained character file. The app is the **renderer and table
companion**: it displays the sheet beautifully on desktop and phone, tracks
play-time state (HP, slots, uses, prepared spells, loadouts), and pops over
the full official rules text for anything on the sheet.

The app deliberately contains **no rules engine**. All derived numbers are
computed at compile time by Claude (exactly as Francesco computes them on
paper). This is what makes homebrew, reflavoring, and mixed-edition builds free.

## 2. What the sheet audit established (design canon)

Audited: `~/Desktop/vice-charactersheet.pdf` (9 pages, single-class warlock)
and `~/Desktop/heavenly-archer.pdf` (4 pages, Fighter 1 / Celestial Warlock 5
"Shigen" — the multiclass reference). Both MPMB Character Record Sheet
v13.1.3, hand-filled digitally. These conventions are the design canon:

1. **Semantic color language.** Fixed ability colors used everywhere (banners,
   modifiers, save DCs, inline references): STR red, DEX blue, CON orange,
   INT purple, WIS green, CHA magenta. Damage types are colored (psychic
   pink/magenta, poison purple, radiant yellow/gold, piercing red…).
   Conditions are colored chips. Green badge = advantage (Francesco's
   shorthand "EDGE"), orange/red = disadvantage. Spell schools in small gray
   caps.
2. **Progression is written into the build.** Future features/invocations/
   spells/slot increases appear on the paper sheet grayed out with a black
   numbered badge = unlock level. **App translation (decision D14): this
   becomes two view modes** — *Level view* (only content unlocked at the
   current level; the at-table default) and *Build view* (the whole
   progression, future items grayed + badged as on paper). The paper's
   always-visible graying was a workaround for paper's inability to toggle.
3. **Resource grammar.** Limited features show MAX / RECOVER / USED; recovery
   is iconographic (moon = long rest, sun = short rest). **Mixed recovery
   exists** (Shigen's Second Wind: 2/LR *and* regain 1 use on SR; his
   dragonmark slot recovers on SR). Slots, hit dice, death saves are
   tick-marks; **ammunition is tally-tracked** (arrow boxes on both sheets).
4. **Compression style.** Official text rewritten as one-line mechanics:
   action economy, range, save, damage, duration, uses — flavor dropped,
   choices resolved inline ("Specialized Design: Thieves' tools, Forgery
   Kit"), key terms color-coded, occasional page refs. Verified faithful
   against the KB (Mind Sliver, Autognome traits, Magical Cunning,
   Clairvoyant Combatant).
5. **Full text on demand.** Full spell/rule text was pasted as screenshots
   into Notes pages — in the app this becomes the popover system.
6. **Language split.** Mechanics in English; personality/backstory in Italian.
   Free-text fields must accept either. Weights shown in lb **and** kg.
7. **The reference builds prove the data model must support:**
   - Mixed editions: 2024 chassis + 2014 species (Vice: XPHB Warlock + AAG
     Autognome).
   - **Reflavoring**: display name ≠ source entry (Autognome → "Marionette"),
     with mechanical tweaks (Small → Medium).
   - **Homebrew**: backgrounds ("Fey Puppet", "Archer Priest") and feats
     ("Fey Pact", "Spellfire Spark", the Mark of Making adaptation) exist
     nowhere in the KB; they must be first-class citizens.
   - **Companions**: a familiar (Tinesia) with its own full mini-sheet.
8. **Multiclass canon (from Shigen):**
   - Identity strip shows **per-class level badges** ("① Fighter ⑤ Celestial
     Warlock"), with a *planned* subclass (Eldritch Knight) grayed until its
     level — i.e. subclass choice itself is progression content.
   - **Hit dice split per class** (1× d10+2, 5× d8+2), tracked separately.
   - Features page has **one section per class**, each with its own header
     line of class proficiencies (starting-class vs multiclass grants
     resolved by the compiler).
   - **One merged spellcasting surface** but spells carry **colored origin
     dots** (which class/feat/item granted them) — Francesco invented this
     tagging on paper; the schema adopts `origin` on spells.
   - **Slot pools can coexist at the same spell level with different
     recovery** (2 pact slots SR + 1 dragonmark slot SR at 3rd; a standard
     multiclass would add LR shared slots). Slots are *pools*, not one table.
   - **Attack rows have rider lines** (Repelling Blast push, Eldritch Smite
     dice, SLOW on-hit note) and can show a separable magic bonus (the
     circled +1). The same weapon may appear as multiple attack modes.
   - **Manual-sync errors are real**: Shigen's save DC reads 15 on page 1 and
     13 (stale) on page 4. Single-source-of-truth rendering kills this class
     of error — see §14.

## 3. Decision log (all confirmed with Francesco, 2026-07-04)

| # | Decision | Choice |
|---|---|---|
| D1 | Layout | Same information architecture as the paper system, **new responsive visual design**. Not a pixel replica. |
| D2 | Interactivity | Trackers editable in app; build content read-only from file; **in-session additions allowed** (DM boons, found items, notes) via a separate session layer. |
| D3 | Runtime | **PWA**; app shell on **GitHub Pages (public repo)**; character data via **Google Drive-synced files** + on-device IndexedDB. |
| D4 | Fill pipeline | File-based: interview doc → chassis+progression doc → Claude Code compiles → schema-validated JSON → app renders. The chassis doc may itself come from a **guided Claude conversation** (instruction file provided). |
| D5 | KB access | **Self-contained character files** (full text of every referenced entry embedded at compile time), plus a **KB-audit flow** to re-check/refresh extracts when the KB is updated. |
| D6 | v1 scope | Core (main sheet, features, spells) + **equipment/currency/magic items** + **companion sheet**. Deferred: description/roleplay page, notes/cheat-sheets. |
| D7 | Design flow | **Straight to coded prototype** (no Figma phase); design tokens derived from the sheet's conventions; iterate in browser. |
| D8 | Repo | `~/Documents/GitHub/character-forge`, public. |
| D9 | Sync | **Google Drive** is the synced folder for character files (Drive for desktop on Mac; Drive location in the iOS Files app for imports). |
| D10 | Theme | **Dark mode first.** The palette is *derived from* the paper canon but adapted to dark surfaces. Light mode is backlog. |
| D11 | Multiclass | **First-class in v1** — schema, views, and pipeline all handle multiple classes per Shigen canon (§2.8). |
| D12 | Variations | **Same character, different build choices** supported: variant character files share a `characterId`; the app groups them and switches between them. |
| D13 | Volatile elements | The file embeds **choice pools** (preparable spells, weapon masteries, and other swap-at-rest elements) with full extracts; the **current selection lives in the session layer** ("loadout"), seeded from compiled defaults. Spell prep, mastery swaps, equipment loadouts happen in-app without recompiling. |
| D14 | View modes | No permanent graying. **Level view** (default): only content up to `currentLevel`. **Build view**: full progression with the paper-style grayed + level-badged treatment. Global toggle. |
| D15 | Improvement mandate | The app should *beat* the paper system where manual editing forced compromises, not just replicate it — tracked in §14 with v1/backlog tags. |

## 4. Hard guardrails

- **IP guardrail (public repo):** WotC-copyrighted text must **never** be
  committed. That means: no KB folders, no real character files (they embed KB
  extracts), no Vice/Shigen fixtures in the repo. CI and repo tests use a
  **synthetic fixture** made of invented homebrew content only. Real
  characters live in the local data folder (§8). `.gitignore` enforces this
  from T01.
- **No cross-contamination:** character-forge has its own visual identity
  derived from the sheet audit. Do not import styling, tokens, components, or
  conventions from monster-forge or any of Francesco's other projects.
- **The app never edits the base character file.** Session state — including
  loadout selections (D13) — lives in a separate layer. The only writers of
  `*.character.json` are the compile and KB-audit pipelines (i.e. Claude Code
  sessions).
- **Compiled content is faithful.** Summaries compress official text but never
  invent mechanics. Every mechanical claim must trace to a `library` extract or
  be explicitly marked homebrew.
- **Ambiguity goes to Francesco.** Pipeline docs and task specs instruct agents
  to flag uncertain readings (e.g. illegible handwriting, rules ambiguity)
  rather than guess. Use AskUserQuestion where available.

## 5. Architecture

```
~/Documents/GitHub/character-forge          (public repo)
├── app/                    React 18 + TypeScript + Vite PWA
│   ├── src/tokens/         design tokens (CSS custom properties, dark-first)
│   ├── src/markup/         sheet-markup parser + renderer
│   ├── src/views/          MainSheet, Features, Spells, Equipment, Companion
│   ├── src/state/          session-layer store (IndexedDB): trackers + loadout
│   └── src/library/        popover system (renders embedded extracts)
├── schema/                 JSON Schema + shared TS types (character file,
│                           session file, sheet-markup grammar)
├── pipeline/               Claude-facing docs + validator CLI
│   ├── interview.md        guides the build conversation → chassis doc
│   ├── chassis-format.md   the chassis+progression doc format (incl. variants)
│   ├── compile.md          chassis doc → character JSON recipe
│   ├── kb-audit.md         KB update → extract diff/refresh recipe
│   └── validate/           Node CLI: ajv + referential integrity + markup lint
├── fixtures/               SYNTHETIC test character only (no WotC text)
├── docs/                   architecture, conventions, this scope doc (copied)
└── .github/workflows/      CI: typecheck, lint, test, deploy to Pages

~/Documents/D&D/D&D Character Builder/       (local data home, Google Drive-synced)
├── dnd-5e-knowledge-base/  sharded KB (MANIFEST.json) — compile-time source
├── kb-consolidated/        consolidated KB (alternative retrieval)
├── Characters/             *.character.json + chassis docs + session exports
└── planning/               this scope + task files (master copies)
```

**Data flow:**

```
[conversation w/ Claude, guided by interview.md]
        → Characters/<name>.chassis.md        (human-readable build doc,
                                               may define variants)
[Claude Code session, following compile.md, reading dnd-5e-knowledge-base/]
        → Characters/<name>[.variant].character.json  (validated, self-contained,
                                                       pools embedded)
[app: import file on any device]
        → renders sheet; Level/Build view modes; popovers from embedded library
[at the table]
        → session layer in IndexedDB (HP, slots, uses, loadout, additions)
        → exportable as <name>.session.json; adoptable at next recompile
```

## 6. The character file (contract sketch — T02 finalizes)

Single JSON file, `formatVersion`-ed. Top-level regions:

- `meta` — name, player, **`characterId` + `variantLabel`** (D12: variants of
  one character share the id; the app groups them), portrait (optional
  data-URI ≤ 200 KB), created/updated.
- `chassis` — species / background / **`classes[]`** (each: class ref,
  subclass ref *with its own unlockLevel* — a planned subclass is progression
  content, §2.8 —, levels, per-class hit die, class-order note for
  starting-class proficiency resolution) + reflavor via `displayName` +
  `modifications`. Homebrew entries are library entries with
  `source: "Homebrew"`.
- `abilities` — base and final scores with provenance notes.
- `stats` — compiled snapshot at `currentLevel`: AC (+formula note), max HP,
  initiative, speed, PB, saves, skills (with proficiency state and final mods),
  passive scores, resistances/immunities, condition advantages, senses,
  languages, armor/weapon/tool proficiencies. Per-class values (hit dice by
  class) stay per-class.
- `progression[]` — per character level, the items gained **tagged with the
  class that granted them**: features, invocations, feats, ASIs, subclass
  choices, spells learned, slot changes, mastery-count changes. Every item:
  `{ name, displayName?, ref, classRef?, summary (sheet-markup), action?,
  limitedUse?, unlockLevel }`. Level view hides items above `currentLevel`;
  Build view grays them (D14).
- `currentLevel` — total character level pointer.
- `actionEconomy` — actions / bonus actions / reactions lists (each item with
  summary + ref + unlockLevel), mirroring the paper sheet's Actions panel.
- `attacks[]` — name, to-hit or save chip (magic/bonus parts separable),
  range, damage (markup), **`riders[]`** (on-hit extras like Repelling Blast
  push, smite options, SLOW notes — §2.8), notes, unlockLevel?. The same
  weapon may appear as multiple modes.
- `spellcasting` — **`sources[]`** (one per casting class/feat/item: name,
  classRef/originRef, ability, save DC, attack mod, prepare rules), a shared
  **`slotPools[]`** model (each pool: source, slotLevel(s), count, recover —
  pact vs shared vs bonus slots coexist, §2.8), and `spells[]`: level, school,
  C/R flags, components, compressed summary, ref, **`origin`** (→ colored
  origin dot), unlockLevel, and **pool membership** (see next).
- `pools{}` — **volatile-element pools (D13)**: e.g.
  `preparedSpells` (per source: the full preparable list with embedded
  extracts, prepare-count, compiled default selection),
  `weaponMasteries` (options, count, defaults), extensible for other
  swap-at-rest choices. Pool entries are full library refs — popovers work in
  the pool browser. Current selections live in the **session layer**, seeded
  from defaults.
- `resources[]` — limited-use pools: max (number or displayed formula),
  **recover model supporting mixed rules** (e.g. `LR` + `regain 1 on SR`,
  §2.3), unlockLevel.
- `consumables[]` — tally-tracked items (ammunition etc.): name, max?, notes.
- `equipment` — items (qty, weight lb, cost, optional summary/ref,
  equipped/carried state as *default*; live state in session layer), currency,
  attunement slots, carrying capacity (lb + kg display).
- `companions[]` — mini-sheet structure per companion (abilities, AC/HP, speeds
  incl. alternate movement, skills, attacks, features, portrait).
- `library{}` — keyed extracts: `{ name, edition, type, source, page?, markdown }`.
  **Every `ref` in the file must resolve here** (pools included). This is what
  popovers render.
- Session-layer TS interfaces (trackers, **loadout selections**, consumable
  counts, additions) are defined in `schema/` too, but session data lives in a
  **separate** store/file, keyed by character id + variant.

File-size guidance: pools make files bigger (a full prepared-caster list can
be ~1 MB of markdown). Budget ≤ 5 MB per character file; portraits ≤ 200 KB.

### Sheet-markup (inline grammar — T02 formalizes, T06 implements)

Compressed summaries are strings with inline semantic tags, replicating the
hand-coloring system as data:

| Tag | Meaning | Rendering |
|---|---|---|
| `{a:CHA}` | ability reference | colored ability chip |
| `{save:INT\|13}` / `{save:WIS}` | saving throw (opt. DC) | ability-colored DC badge |
| `{dmg:psychic\|1d6}` | typed damage | damage-colored dice |
| `{adv}` / `{dis}` | advantage / disadvantage | green / orange badge |
| `{cond:frightened}` | condition | condition chip (popover if extract present) |
| `{recover:LR}` / `{recover:SR}` | recovery | moon / sun icon |
| `{lvl:6}` | unlock level | numbered badge |
| `{ref:mind-sliver\|Mind Sliver}` | library link | tappable term → popover |
| `**bold**`, `*italic*` | markdown passthrough | as usual |

## 7. The app (v1)

- **View modes (D14):** a global **Level / Build** toggle in the tab shell.
  Level view (default) renders only `unlockLevel ≤ currentLevel` — clean
  at-table sheet. Build view renders the full progression with the paper-style
  grayed + badged treatment. Both modes share all other behavior.
- **Views:** Main sheet (identity strip with per-class level badges, abilities,
  saves, skills, senses, AC/HP/init, resource strip, consumable tallies,
  actions panel, attacks with riders) · Features (one section per class with
  its proficiency header line, then species/background/feats; limited-use
  rows) · Spells (casting sources, slot pools with per-pool recovery, origin
  dots, spell rows, **prepare/manage mode** browsing the embedded pools) ·
  Equipment (gear with equipped/carried, currency, attunement, in-session
  found items) · Companion (per companion). Desktop: generous multi-column
  sheet. Mobile: tabbed cards.
- **Popovers:** any `{ref:}` or listed entry — including pool entries — opens
  the library extract: rendered markdown with source · page footer. Desktop:
  anchored popover; mobile: bottom sheet.
- **Trackers (session layer):** current/temp HP, death saves, per-pool spell
  slots, resource uses (incl. mixed-recovery rules), hit dice per class,
  consumable tallies, currency, active conditions, inspiration. Short/long
  rest buttons apply each pool's/resource's `recover` rule. Undo for the last
  change.
- **Loadout (session layer, D13):** prepared spells per source (pick N from
  the embedded pool), weapon masteries, equipped/carried toggles. Changes are
  allowed anytime with the rest-rule shown as a gentle note (the app informs,
  never blocks — no rules engine).
- **In-session additions:** add item / add boon (name + markup summary) / add
  note. Stored in the session layer, rendered inline with a subtle "session"
  marker, exportable, adoptable into the base file at next recompile.
- **Character management:** multiple characters; **variants grouped** under
  one character with a variant switcher (D12; independent session state per
  variant); import via file picker/drag (iOS Files app incl. Google Drive
  location); re-import ("refresh from file") preserves the session layer;
  export session JSON.
- **PWA:** offline after first load (service worker), installable, all data
  on-device. No network calls at runtime — ever.

## 8. Runtime & sync model

- App shell: static build on GitHub Pages (public). Updating = push to main.
- Character files: live in `…/D&D Character Builder/Characters/`, synced via
  **Google Drive** (Drive for desktop on the Mac side). iPhone: open the PWA →
  import from Files (Google Drive location). Mac: same, or drag-drop.
- Session state: IndexedDB per device, keyed by character id + variant +
  formatVersion. Cross-device session merge is **out of scope for v1**
  (export/import file is the manual path).

## 9. Tech choices (rationale)

- **React 18 + TypeScript + Vite + vite-plugin-pwa.** Most reliable stack for
  subagent implementation; strict TS; no UI component library.
- **Plain CSS with custom properties** for all tokens. **Dark-first (D10):**
  the canonical palette is the dark-surface adaptation of the paper colors
  (Francesco already preferred dark rules-text screenshots on the paper
  sheets); a light theme is a backlog remap of the same token layer.
- **IndexedDB via `idb`** for the session layer. **ajv** for schema validation
  (validator CLI; the app also validates on import with friendly errors).
- **Vitest** for unit tests (markup parser, validator, rest logic, stores).
  E2E is manual + preview tooling at T22 (Playwright is backlog).

## 10. Task index & dependencies

Tasks live in `planning/tasks/T01…T22.md`. Each is self-contained (context,
inputs, outputs, steps, acceptance criteria) and names its model (opus/sonnet).

```
Phase 0  T01 scaffold ── T02 schema+grammar ── T03 Vice fixture ── T04 validator
                │              │      └────────────┐
Phase 1  T05 tokens (dark) ── T06 markup renderer ── T07 popovers
Phase 2  T08 main sheet+modes · T09 features · T10 spells+pools · T11 equipment
         T12 companion · T13 actions/attacks panel        (all need T05–T07)
Phase 3  T14 session engine+loadout ── T15 additions UI ── T16 import/variants ── T17 PWA
Phase 4  T18 interview doc ── T19 compile recipe (proof: recompile Vice ≙ T03)
         T20 kb-audit ── T21 CLAUDE.md/README
Phase 5  T22 end-to-end acceptance (multiclass cold run: Shigen)
```

Milestones: **M1** Vice renders (T08–T10 on T03 fixture) · **M2** playable at
the table (phase 3) · **M3** pipeline proven (T19 diff clean) · **M4** ship (T22).

## 11. Model routing

- **Opus:** T02, T03, T06, T08, T14, T18, T19, T22 — contract design, faithful
  compilation, parser correctness, the densest view, state semantics, pipeline
  authoring, final acceptance.
- **Sonnet:** everything else — well-specified builds against fixed contracts.

## 12. Working agreements for subagents

1. Read this document before your task file. Your task file wins on conflict.
2. TypeScript strict; no `any` without a comment. Unit tests for all logic
   (parser, validator, stores, rest rules) — views need no tests in v1.
3. All colors/spacing/type through CSS custom properties in `app/src/tokens/`.
   No hardcoded hex outside token files. No CSS frameworks, no UI libraries.
4. Never commit: KB content, real character files, PDF exports, portraits.
   When a test needs data, use `fixtures/synthetic.character.json`.
5. Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`). Small commits.
6. If the spec is ambiguous, stop and surface the question — don't guess.
   Address open questions to Francesco (AskUserQuestion if available).
7. Copy is design material: active voice, sentence case, name things by what
   the player controls ("Long rest", not "Reset resources").

## 13. Out of scope (v1 backlog)

Description & roleplay page (portrait/backstory/allies — Italian content) ·
notes & tactic cheat-sheets with rule popovers · print/PDF export ·
**light mode** (token remap) · cross-device session merge · in-app KB browser
(hybrid KB mode) · **active-effect toggles** (§14) · level-up diff view (§14) ·
Playwright E2E · character diffing/version history · dice rolling.

## 14. Improvements over the manual system (D15)

Where the paper workflow was a compromise forced by manual editing, and what
the app does about it. **v1** = already in the task set; **later** = backlog.

| # | Paper limitation (evidence) | App answer | When |
|---|---|---|---|
| 1 | Cross-page sync errors — Shigen's save DC is 15 on p.1, stale 13 on p.4; every feature is hand-copied to main page, class page, actions panel | One data item, rendered in every view it belongs to; impossible to desync | **v1** (by construction) |
| 2 | Future content permanently grayed on-page, cluttering the at-table read | Level/Build view modes (D14) | **v1** |
| 3 | Prepared spells, masteries, loadouts pre-written and hand-grayed; swapping means erasing | Embedded pools + session-layer loadout (D13), swap in-app | **v1** |
| 4 | Full rules text = pasted screenshots on notes pages | Popover on every ref, incl. pool entries | **v1** |
| 5 | Mixed recovery mental math (Second Wind 2/LR +1 on SR; pact vs dragonmark slots) | Rest buttons apply per-pool/per-resource recover rules | **v1** |
| 6 | Ammo tally marks | Tap counters for consumables | **v1** |
| 7 | Handwriting squeezed into fixed boxes; density fixed at print time | Responsive type/density; desktop vs mobile layouts | **v1** |
| 8 | Weight totals and lb↔kg by hand | Auto totals + dual units | **v1** |
| 9 | One build per physical sheet; "what if" = refill everything | Character variations grouped with a switcher (D12) | **v1** |
| 10 | Buff bookkeeping scribbled ad hoc (Shigen: "+10" next to max HP, circled +1 on attack rows, "bardic inspirat." in the HP box) | **Active-effect toggles**: named effects that visibly adjust displayed values while on (Magic Weapon, Aid, inspiration held) | later |
| 11 | No way to see "what changed" on level-up | Level-up diff view (old vs new compiled file) | later |
| 12 | Spell rows only — no filtering | Search/filter/sort in spell + pool views (castable-now, by level/school/origin) | later; basic level-grouping in v1 |
| 13 | Paper can't be queried at the table ("what's my ranged option?") | Actions panel already groups by economy (v1); richer querying | later |

Origin dots on spells (Shigen's invention) are adopted into the schema as
`origin` — the app renders them as colored source tags (v1, T02/T10).
