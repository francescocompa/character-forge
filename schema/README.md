# `schema/` — the character-forge contract

This is the project's central contract. The compiler (`pipeline/compile.md`), the
validator (`pipeline/validate/`, T04), the renderer (`app/src/markup/`, T06), and
every view code against what's defined here. Scope §6 is a sketch; this folder is
the finalized contract. Where they differ, **this folder wins** — deviations from
§6 are called out in §5 below.

## Files

| File                    | What it is                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `character.schema.json` | JSON Schema (draft 2020-12) for `*.character.json`, `formatVersion: 1`.                                                                     |
| `session.schema.json`   | JSON Schema for `*.session.json` — the play-time layer.                                                                                     |
| `types.ts`              | Hand-written TS types mirroring **both** schemas + the `SessionStore` interface. Single source of truth for the app; kept in sync manually. |
| `markup-grammar.md`     | Formal spec of the inline sheet-markup used in every `summary`/`damage`/`note`.                                                             |
| `schema.test.ts`        | Ajv strict meta-validation of both schemas + example instances. Runs under `npm run verify`.                                                |

## The two files, and who writes them

```
*.character.json   compiled, self-contained, pools embedded.
                   WRITTEN ONLY by the compile + KB-audit pipelines (Claude Code).
                   The app treats it as READ-ONLY.

*.session.json     play-time state: trackers, loadout, in-session additions.
                   WRITTEN ONLY by the app. Keyed by
                   characterId + variantLabel + characterFormatVersion.
                   Lives in IndexedDB; exportable/importable as a file.
```

This split is the core invariant. It's what makes single-source-of-truth
rendering possible (scope §14 improvement #1) and what keeps the base build
pristine across a session.

## Character file regions (guided tour)

- **`meta`** — identity + `characterId`/`variantLabel`. Variants of one character
  share the id; the app groups them under a switcher (D12). Portrait is an
  optional data-URI, ≤ 200 KB.
- **`chassis`** — `species`, `background`, and **`classes[]`** (one per class:
  `levels`, `hitDie`, `classOrder`, optional `subclass` with its **own
  `unlockLevel`** so a planned subclass is progression content). Reflavor via
  `displayName` + `modifications`. Homebrew entries are ordinary `library`
  entries with `edition: "Homebrew"`.
- **`abilities`** — six scores, each `base` + `final` + `modifier` (explicit — no
  view recomputes) + optional `note`.
- **`stats`** — the **compiled snapshot at `currentLevel`**: AC, HP, initiative,
  PB, speeds (incl. alternate movement), per-class hit dice, saves, skills,
  passives, resistances/immunities/vulnerabilities, condition advantages, senses,
  languages, proficiencies. Each value carries an optional provenance `note`
  (e.g. AC `"13 + DEX (Armored Casing)"`). Rendered in every view — impossible
  to desync.
- **`currentLevel`** — total level. Level view renders only `unlockLevel ≤
currentLevel`; Build view shows everything, grayed + badged (D14).
- **`progression[]`** — flat list of everything the build grants, each `kind`-typed,
  `classRef`-tagged, and `unlockLevel`-stamped.
- **`actionEconomy`** — actions / bonus actions / reactions / other, mirroring the
  paper Actions panel.
- **`attacks[]`** — one entry per **mode** (the same weapon can appear several
  times). `toHit.magicBonus` is separable (the circled +1). `riders[]` carry
  on-hit extras. `save` for save-based attacks. `consumableRef` links ammo.
- **`spellcasting`** — `sources[]` (per casting class/feat/item: ability, DC,
  attack mod, prepare rule), `slotPools[]` (pools that **coexist at one spell
  level with different recovery** — pact SR, shared LR, bonus SR), and `spells[]`
  (each carries `origin` → colored dot, and optional `poolRef` for pool
  membership).
- **`pools{}`** — volatile-element pools (D13), keyed by pool id. Generic `kind`
  (`preparedSpells`, `weaponMasteries`, …) so new kinds need no schema break.
  Options are `library` refs (popovers work in the pool browser); `defaults`
  seed the session loadout.
- **`resources[]`** — limited-use pools with **structured `recover`** that models
  mixed rules (Second Wind: `[{on:"long",amount:"all"},{on:"short",amount:1}]`).
- **`consumables[]`** — tally-tracked items (ammunition).
- **`equipment`** — items (default equipped/carried; live state in session),
  currency (seeds the session), attunement, carrying capacity (lb; app shows kg).
- **`companions[]`** — `CompanionSheet` mini-sheets (a subset of the main shape,
  not a recursive character file).
- **`library{}`** — keyed extracts (`name, edition, type, source, page?,
markdown`). **Every `ref` in the file resolves here.**

## Invariants (the validator enforces these — T04)

1. **The app never writes character files.** Only compile + KB-audit do.
2. **Every `ref` resolves.** Every `ref` string (chassis, progression, spells,
   attacks, pool options, resources, items, companions) is a key in `library`.
   The JSON Schema does **not** check this (a `ref` is just a pattern-matched
   string); the validator CLI does the referential pass. Same for internal id
   references: `Spell.origin` → a `SpellSource.id`; `poolRef`/pool keys →
   `pools`; `limitedUseRef`/`consumableRef` → `resources`/`consumables`.
3. **Compiled numbers are authoritative.** `stats`, `abilities`, `toHit`,
   `saveDc`, etc. are results, not formulas. The app renders them verbatim and
   never recomputes (scope §1 — no rules engine). `note` fields explain, they
   don't compute.
4. **`unlockLevel` gates visibility, never correctness.** Level/Build view is a
   filter over the same authoritative data.
5. **No WotC text in the repo.** Real files embed `library` extracts and live in
   the local data folder; the repo's only fixture is synthetic homebrew (T03).

## Session file (guided tour)

`trackers` (HP/temp, death saves, per-pool slots, per-resource uses, per-class
hit dice, per-consumable counts, currency, active conditions, inspiration),
`loadout` (selected refs per pool + equipped/carried overrides — seeded from the
character file's compiled `defaults`), `additions[]` (item/boon/note), and
per-companion `companions{}` trackers. Views bind to the `SessionStore`
interface in `types.ts`, which is namespaced per character + variant and per
companion.

### Why currency lives in the session layer

Currency changes constantly at the table (loot, purchases), so it can't live in
the read-only character file without violating "the app never writes the base
file." The character file's `equipment.currency` is a **compiled seed**: on first
import the app copies it into `trackers.currency`, and every change after that
writes only to the session layer. Re-importing a recompiled character preserves
the session currency (the seed is ignored once a session exists). Same pattern
as loadout selections (seed from `defaults`, then own it in-session).

## Versioning policy

- `formatVersion` is a single integer, currently **1**.
- **Breaking change ⇒ bump `formatVersion`** (removing/renaming a field,
  tightening a type, changing an invariant). Additive-optional changes don't bump.
- The app **refuses a newer `formatVersion` than it understands**, with a
  friendly "update the app to open this character" message — it never silently
  drops unknown data.
- The session file has its own `formatVersion` **and** records the
  `characterFormatVersion` it was seeded from; a character bump starts a fresh
  session rather than migrating in place.
- `types.ts` is kept in sync **by hand** — its header says so. The meta-test
  guards the schemas; type/schema drift is caught in review.

## Minimal examples

These fragments are illustrative (not full valid files); the runnable examples
live in `schema.test.ts`, and the full synthetic fixture arrives in T03.

**Mixed recovery (Second Wind, §2.3):**

```json
{
  "id": "second-wind",
  "name": "Second Wind",
  "max": 2,
  "recover": [
    { "on": "long", "amount": "all" },
    { "on": "short", "amount": 1 }
  ],
  "unlockLevel": 1
}
```

**Two slot pools at the same spell level, different recovery (§2.8):**

```json
"slotPools": [
  { "id": "pact-3", "name": "Pact Magic", "sourceId": "warlock",
    "slotLevel": 3, "count": 2, "recover": [{ "on": "short", "amount": "all" }] },
  { "id": "mark-1", "name": "Mark of Making", "sourceId": "dragonmark",
    "slotLevel": 1, "count": 1, "recover": [{ "on": "short", "amount": "all" }] }
]
```

**Per-class chassis with a planned subclass (§2.8):**

```json
"classes": [
  { "ref": "fighter", "levels": 1, "hitDie": "d10", "classOrder": 1,
    "subclass": { "ref": "eldritch-knight", "unlockLevel": 3 } },
  { "ref": "warlock", "levels": 5, "hitDie": "d8", "classOrder": 2,
    "subclass": { "ref": "celestial-patron", "unlockLevel": 1 } }
]
```

**Attack with a separable magic bonus + a rider (§2.8):**

```json
{
  "name": "Longbow (True Strike)",
  "toHit": { "modifier": 8, "magicBonus": 1 },
  "range": "150/600 ft",
  "damage": "{dmg:piercing|1d8+4}",
  "consumableRef": "arrows",
  "riders": [
    { "name": "SLOW", "summary": "{note:on hit} target's speed −10 ft until your next turn" }
  ]
}
```

**Variant pair (D12):** two files with the same `meta.characterId`
(`"shigen"`) and different `meta.variantLabel` (`"Eldritch Knight"` vs
`"Echo Knight"`); the app groups them and keeps session state per variant.
