# The chassis document format

> **What this is.** The `*.chassis.md` file is the pipeline's front door: a
> human-readable build spec that a person (or Claude, via [`interview.md`](interview.md))
> writes, and that the compiler ([`compile.md`](compile.md), T19) turns into a
> validated, self-contained `*.character.json` (the contract in
> [`schema/`](../schema/README.md)).
>
> **Required reading before you author or compile one:**
> [`planning/PROJECT-SCOPE.md`](../docs/PROJECT-SCOPE.md) §3 (decision log) and §5
> (data flow), and [`schema/README.md`](../schema/README.md).

The chassis doc is **human-first**. It is Markdown, not JSON wearing a Markdown
hat. A person reads it top to bottom and understands the character; the compiler
reads the same document and never has to guess. Everything the schema needs is
sourced from here (see the mapping table in §11) — but the _authoring_ order and
vocabulary follow how Francesco builds a character on paper: concept and flavor
first, then the chassis, then level by level, resolving choices as they come.

The document records **decisions**, not **compiled results**. You write "INT 16,
+1 from the level-4 ASI"; the compiler computes the final 17, the +3 modifier, the
save and skill totals, the AC, the HP. You write which spells are prepared by
default; the compiler embeds the whole preparable pool. This division is the
whole point: the doc is the build, the JSON is the snapshot.

---

## 1. Anatomy at a glance

```
---
frontmatter: identity + ruleset defaults + allowed sources + target level
---

# <Character name>

## Concept & reflavoring      ← flavor, displayName mappings, DM-approved mods
## Chassis                    ← species · background · classes (order, levels,
                                planned subclasses) · ability scores + method
## Homebrew                   ← full rules text for anything not in the KB
## Progression                ← level 1 → target, one block per character level
## Volatile defaults          ← which choices are pools; their starting picks
## Equipment                  ← gear, currency, attunement, carrying capacity
## Companions                 ← one block per companion mini-sheet
## Variants                   ← optional; named overrides on the shared base
```

Sections are addressed by their `##` heading. All are required **except**
Homebrew, Companions, and Variants, which appear only when the build has them.
Order is the recommended reading order; the compiler keys off headings, not
position.

---

## 2. Frontmatter (identity + rules envelope)

YAML frontmatter carries identity and the **rules envelope** — the defaults the
rest of the document is read against.

```yaml
---
name: Fenn Larkspur
player: Francesco
characterId: fenn-larkspur # variants of one character share this (D12)
ruleset: '2024' # default edition for entries that don't say otherwise
sources: # which books/editions are allowed in this build
  - '2024 core'
  - '2014 core' # explicitly allowed → per-entry mixing is OK (see §8)
  - Homebrew
targetLevel: 5 # how far the progression is planned (≥ currentLevel)
currentLevel: 3 # the level the character is actually played at now
---
```

| Field          | Meaning                                                                                         | Maps to                            |
| -------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `name`         | Display name.                                                                                   | `meta.name`                        |
| `player`       | Optional.                                                                                       | `meta.player`                      |
| `characterId`  | Stable kebab-case id. **Variants share it** (D12).                                              | `meta.characterId`                 |
| `ruleset`      | Default edition (`"2024"` \| `"2014"`). Quote it so YAML keeps it a string.                     | per-entry `library.edition`        |
| `sources`      | Allow-list of books/editions. Mixing 2014 + 2024 is permitted **only** if both are listed (§8). | compiler's edition filter          |
| `targetLevel`  | How far progression is written. May exceed `currentLevel` (planned future).                     | bounds `progression[].unlockLevel` |
| `currentLevel` | The level played now. **The TBD gate (§9) and Level view pivot on this.**                       | `currentLevel`                     |

`meta.createdAt` / `updatedAt` are stamped by the compiler, not authored here.
`meta.variantLabel` comes from the **Variants** section (§10), not frontmatter —
the base document has no variant label until a variant defines one.

---

## 3. Concept & reflavoring

Prose first: who the character is, in whatever language you think in (mechanics
stay English elsewhere; concept prose can be Italian — scope §2.6). Then the
**reflavoring table**, which is mechanical and precise, because it drives
`displayName` and `modifications` in the schema.

Reflavoring = the display name differs from the source entry, optionally with a
mechanical tweak. **Every mechanical tweak needs an explicit DM-approved y/n** —
this is a hard requirement (scope §4: compiled content is faithful; homebrew is
first-class but never silent).

```markdown
## Concept & reflavoring

Fenn is a soot-stained wanderer who maps the ash wastes… _(flavor prose, any language)_

### Reflavoring

| Source entry | Shown as  | Mechanical change            | DM-approved |
| ------------ | --------- | ---------------------------- | ----------- |
| Duskling     | Ashwalker | Base speed 30 → 35 ft        | yes         |
| Duskling     | Ashwalker | (name/flavor only, no mech.) | n/a         |
```

- **Name-only reflavor** (no mechanical change): `DM-approved` = `n/a`.
- **Mechanical reflavor** (speed bump, size change, swapped resistance): the
  change is spelled out and marked `yes`/`no`. A `no` is a **blocking**
  ambiguity — surface it, don't compile it (scope §4).
- The `Shown as` value becomes `displayName`; each mechanical row becomes one
  `modifications[]` entry (`field`, `from`, `to`, `note`). Name-only rows just set
  `displayName` with no modification.

Reflavoring applies to species, background, class, subclass, spells, items — any
entry with a `displayName` in the schema. Put the row under whichever chassis
element it modifies, or here if it's identity-level.

---

## 4. Chassis

Species, background, and **class(es)** — multiclass is a normal case (D11), so the
class subsection is always a list even for a single class.

```markdown
## Chassis

- **Species:** Duskling → _Ashwalker_ (see reflavoring). Darkvision 60 ft.
- **Background:** Ember Cartographer _(homebrew — see below)_. Grants
  cartographer's tools + the Guiding Flame cantrip.

### Classes

Written in **class order** — order 1 is the starting class, which resolves
starting-vs-multiclass proficiency grants (scope §2.8).

| Order | Class   | Levels | Hit die | Planned subclass | Subclass unlocks at |
| ----- | ------- | ------ | ------- | ---------------- | ------------------- |
| 1     | Fighter | 1      | d10     | Eldritch Knight  | 5                   |
| 2     | Wizard  | 2      | d6      | War Magic        | 2                   |

_Total character level: 3 now, planned to 5._

### Ability scores

Method: **standard array**, arranged as below. `final` = base + noted changes;
the compiler computes modifiers.

| Ability | Base | Changes               | Final |
| ------- | ---- | --------------------- | ----- |
| STR     | 10   | —                     | 10    |
| DEX     | 14   | —                     | 14    |
| CON     | 14   | —                     | 14    |
| INT     | 16   | +1 (level-4 ASI, TBD) | 17    |
| WIS     | 10   | —                     | 10    |
| CHA     | 8    | —                     | 8     |
```

Notes:

- **Class order matters.** Order 1 grants full starting proficiencies; later
  classes grant only the reduced multiclass set. State both explicitly in the
  Progression section's proficiency lines (§5) so the compiler doesn't infer them.
- **A planned subclass is progression content** (scope §2.8): it has its own
  unlock level and is grayed in Build view until then. The Eldritch Knight above
  unlocks at 5 (above `currentLevel` 3), so it's planned, not yet active.
- **Ability method** (standard array / point buy / rolled / fixed) is recorded for
  provenance. Each change lists its source; a change from a not-yet-reached level
  can carry `TBD(...)` (§9) and is non-blocking while its level is above
  `currentLevel`.

---

## 5. Progression (level by level)

The heart of the document: one block per **character level**, 1 → `targetLevel`.
Each block says which class takes the level and lists what that level grants —
**automatic** features vs **choices** made (spells, invocations, feats/ASI,
mastery counts). This is the paper sheet's level column, written out.

```markdown
## Progression

### Level 1 — Fighter 1 _(starting class)_

- **Proficiencies (starting class):** Saves STR, CON. Armor light/medium/heavy,
  shields. Weapons simple, martial. Skills: choose 2 — Athletics, Acrobatics,
  Intimidation, Survival. → _chosen:_ Athletics, Survival.
- **Fighting Style:** Defense — +1 AC while in armor. _(choice)_
- **Second Wind** — regain 1d10+3 HP; 2/long rest, regain 1 on short rest. _(auto, limited-use)_
- **Weapon Masteries:** 2 (see Volatile defaults). _(choice)_
- **Species — Umbral Step:** move through dim light/darkness without provoking OAs. _(auto)_
- **Background feat — Tireless Cartographer** _(homebrew feat)_: ignore difficult
  terrain on a mapped route; +1 INT. _(auto)_

### Level 2 — Wizard 1 _(multiclass)_

- **Proficiencies (multiclass grant):** no new saves. Armor none. Weapons daggers,
  quarterstaffs. No skills from this class.
- **Spellcasting — Wizard:** INT caster. Learns cantrips + 1st-level spells;
  prepares INT mod + wizard level. Slots: see Volatile defaults / spell list.
- **Arcane Recovery** — once/day on a short rest, recover slots ≤ half wizard level. _(auto, limited-use)_

### Level 3 — Wizard 2 ← currentLevel

- **Subclass — War Magic:** advantage on one INT save per turn to resist a spell. _(choice: subclass)_

### Level 4 — Wizard 3 _(planned)_

- **ASI:** +1 INT (→17), +1 CON — TBD(may take a feat instead). _(choice)_

### Level 5 — Fighter 2 _(planned)_

- **Subclass — Eldritch Knight:** limited wizard spellcasting from the Wizard list. _(choice: subclass)_
- **Bound weapon** action becomes available.
```

Rules for a progression block:

- **Heading:** `### Level N — <Class> <class-level>` and mark the class the level
  goes to. Tag the `currentLevel` block so the reader sees the play-time line.
- **`(auto)` vs `(choice)`:** label each grant. Automatic grants come from the
  class/species/background; choices are decisions the player made (and the
  compiler must be able to see _what_ was chosen, resolved inline).
- **Resolve choices inline.** "Fighting Style: Defense", "Skills: Athletics,
  Survival", "prepared: …". An unresolved choice is a `TBD(...)` (§9).
- **Limited-use features** note their max + recovery in plain words ("2/long rest,
  regain 1 on short rest"); the compiler turns that into a `resources[]` entry and
  links it. Ammo-style tallies go under Equipment (§6) as consumables.
- **Every grant maps to a `progression[]` item** stamped with `unlockLevel = N`
  and `classRef` (omit `classRef` for species/background/feat lines). Its `kind`
  is one of: `feature`, `invocation`, `feat`, `asi`, `subclass`, `spell-learned`,
  `slot-change`, `mastery-change`, `proficiency`, `other`.
- **Fixed-known caster swaps** (Warlock/Sorcerer replacing a known spell on
  level-up): write them as "drop X, learn Y" in the level block; the compiler
  records the `spellcasting.swaps[]` link and sets the dropped spell's
  `swapOutLevel`.

### Spells

List spells where they're learned (in the level block) or in a dedicated
**### Spells** subsection if that's clearer. For each spell capture: name, level,
school, C/R flags (concentration, ritual), a one-line mechanical summary, and its
**origin** — which class/feat/item grants it (this drives the colored origin dot;
a spell on two lists gets two origins → a dual-source dot). Also note its **role**:
`prepared` (counts against the prepare limit), `alwaysPrepared`, `innate`
(at-will), `known` (fixed pick), or `ritualOnly`. Prepared spells belong to a
pool (§7); record only the **default** prepared picks here.

Each distinct casting source (class, subclass, feat, magic item) is its own
**source** with its own ability/DC/attack mod — an item-granted caster can have a
different DC from the class (see the Ember Compass, §6/§7). Slot **pools** that
coexist at one spell level with different recovery (pact vs shared vs a homebrew
bonus slot) are each listed separately.

### Attacks & action economy

Under the level where the option first appears, or in a short **### Attacks**
block: one row per **attack mode** (the same weapon can appear twice — melee vs
thrown, or with a rider active). Capture to-hit (mark any separable magic bonus —
the circled +1), range, damage with type, and **riders** (on-hit extras: push,
smite dice, a SLOW note). Ammo-consuming attacks name their consumable. The
compiler also derives the Actions / Bonus actions / Reactions panel from these
plus features that cost an action; you don't have to duplicate that list, but call
out anything non-obvious (a reaction spell, a bonus-action feature).

---

## 6. Volatile defaults (pools)

Per D13, swap-at-rest choices — **prepared spells**, **weapon masteries**,
equipment **loadout** — are _pools_: the compiler embeds the full set of options
(with extracts), and the live selection lives in the session layer. The chassis
doc records **which choices are pools** and their **starting/default selection**
only.

```markdown
## Volatile defaults

### Prepared spells — Wizard (prepare 4)

Pool = the wizard's preparable list (compiler embeds all options with full text).

- **Default prepared:** Mending Charm, Ashen Bolt.
- Also in the pool (not prepared by default): Featherfall Ward.

### Weapon masteries (choose 2)

- **Default:** Longsword (Sap), Shortbow (Slow).
- Pool options: Longsword, Shortbow, Dagger (Nick).
```

- **`chooseCount`** is the prepare/pick count (a number, or a formula string like
  "INT mod + wizard level" if the count itself is derived).
- **Defaults** seed the session loadout; they must be a subset of the options.
- The compiler expands each pool into `pools{}` with full `library` extracts for
  every option — so the doc stays short while the file stays self-contained.

---

## 7. Casting sources & slot pools (when it's a caster)

Most of this is captured with the spells (§5), but summarize the **sources** and
**slot pools** explicitly so the compiler has them in one place:

```markdown
### Casting sources

| Source                       | Ability | Save DC | Atk | Prepare rule             | Notes                          |
| ---------------------------- | ------- | ------- | --- | ------------------------ | ------------------------------ |
| Wizard                       | INT     | 13      | +5  | INT mod + wizard level   | class caster                   |
| Ember Cartographer's Compass | INT     | 14      | +6  | always prepared (innate) | item source; own DC (homebrew) |

### Slot pools

| Pool         | Source | Spell level | Count | Recovery   | Notes              |
| ------------ | ------ | ----------- | ----- | ---------- | ------------------ |
| Wizard Slots | Wizard | 1           | 3     | long rest  | standard           |
| Arcane Font  | Wizard | 1           | 1     | short rest | homebrew feat slot |
```

DC/attack numbers can be written as decided, or left `TBD(...)` for future levels;
the compiler validates them against the ability + PB at compile time.

---

## 8. Homebrew definitions

Anything not in the knowledge base — homebrew species, backgrounds, feats, spells,
items, class features, slot sources — gets its **full rules text** here,
verbatim. This block becomes the `library` extract for that entry, one-to-one:
`source: Homebrew`, `edition: Homebrew`. It must never be blended into official
content (scope §4).

```markdown
## Homebrew

### Ember Cartographer _(background)_

Grants cartographer's tools proficiency and the Guiding Flame cantrip (innate,
INT). Feat: Tireless Cartographer.
_Full text, exactly as it should appear in the popover…_

### Tireless Cartographer _(feat)_

Ignore difficult terrain while you can see a route you've already mapped; +1 INT.
_Full text…_

### Ashen Bolt _(1st-level spell)_

2d6 fire damage, DEX save for half. …

### Ember Cartographer's Compass _(magic item, attunement)_

A brass compass that never loses true north. While attuned, grants the Guiding
Flame cantrip and empowers Ashen Bolt (its own casting source). …
```

- One `###` per homebrew entry, tagged with its type; the body is the popover text.
- **Editions never silently mix.** Using a 2014 entry inside a 2024 build (or vice
  versa) is a per-entry, explicitly-listed decision — the entry names its edition,
  and `sources` (§2) must allow it. Record the reason in a note if it's unusual
  (scope §2.7: Vice = 2024 Warlock + 2014 Autognome).
- **KB entries are _not_ copied here.** For official content the doc names the
  entry (`Fireball`, `Fighter`) and the compiler pulls the extract from the KB at
  compile time — no WotC text ever lands in the chassis doc or the repo (scope §4).

---

## 9. TBD — the ambiguity convention

Undecided choices are marked `TBD(<what's undecided>)`. This is the single
mechanism for "we haven't decided this yet," and it has **precise compile
semantics** tied to `currentLevel`:

| Where the TBD sits                        | Compiler behavior                                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **At or below `currentLevel`**            | **Blocking error.** The character is played at this level; an unresolved choice here can't compile. The compiler stops and surfaces it.                                             |
| **Above `currentLevel`** (planned future) | **Non-blocking.** It's a future decision; the compiler emits the level's other content and leaves the TBD as a visible "undecided" placeholder in Build view (never in Level view). |

Examples:

```markdown
- **ASI (level 4):** TBD(+2 INT vs. a feat) ← level 4 > currentLevel 3 → OK, planned
- **Skills (level 1):** choose 2 — TBD ← level 1 ≤ currentLevel 3 → BLOCKS compile
```

So: a TBD is fine for anything you haven't reached yet, and a hard stop for
anything you're supposedly already playing. The compiler's job is to enforce that
line, not to guess past it (scope §4: ambiguity goes to Francesco).

Other ambiguity — illegible source, a rules reading you're unsure of — is written
as a plain note prefixed `FLAG:` and is always surfaced to the author, never
silently resolved.

---

## 10. Variants (optional)

Variants (D12) are **the same character with different build choices** — sharing
`characterId`, grouped by the app, switched at the table. Define them as
**overrides on the shared base**: everything above is the base; each variant lists
only what it changes.

```markdown
## Variants

Base label: **Battle Mage** _(the build written above)_

### Variant — Arcane Trickster

- **Level 5:** Fighter 2 → instead take **Rogue 1** (Arcane Trickster path).
- **Subclass:** Eldritch Knight → **Arcane Trickster** (unlocks 5).
- Everything else inherits the base.
```

- The base build gets `meta.variantLabel` = the **Base label**.
- Each `### Variant — <name>` compiles to **its own** `*.character.json` sharing
  `meta.characterId`, with `meta.variantLabel = <name>`.
- A variant overrides by section/level; unstated fields inherit the base. Keep
  overrides minimal — a variant that restates the whole build is a smell.

---

## 11. Field → schema mapping (round-trip check)

Every field the [`schema`](../schema/character.schema.json) requires is sourced
from this format. The compiler either **reads** a value from the doc or
**derives** it from doc + KB at compile time (the "no rules engine in the app"
line, scope §1 — derivation happens once, here). This table is the round-trip
proof for the acceptance criterion; the worked example above compiles to
[`fixtures/synthetic.character.json`](../fixtures/synthetic.character.json).

| Schema region                                                                                                 | Sourced from (chassis section)                                                                   | Read / Derived                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `formatVersion`                                                                                               | constant (1)                                                                                     | derived                                                 |
| `meta.name` / `player` / `characterId`                                                                        | Frontmatter (§2)                                                                                 | read                                                    |
| `meta.variantLabel`                                                                                           | Variants base label / variant name (§10)                                                         | read                                                    |
| `meta.createdAt` / `updatedAt`                                                                                | compile timestamp                                                                                | derived                                                 |
| `currentLevel`                                                                                                | Frontmatter `currentLevel` (§2)                                                                  | read                                                    |
| `chassis.species`                                                                                             | Chassis · Species + Reflavoring `displayName`/`modifications` (§3–4)                             | read                                                    |
| `chassis.background`                                                                                          | Chassis · Background (§4)                                                                        | read                                                    |
| `chassis.classes[]`                                                                                           | Chassis · Classes table — `ref`, `levels`, `hitDie`, `classOrder`, `subclass`+`unlockLevel` (§4) | read                                                    |
| `abilities.*.base`                                                                                            | Chassis · Ability scores, Base column (§4)                                                       | read                                                    |
| `abilities.*.final`                                                                                           | Ability scores, Final column (base + changes) (§4)                                               | read                                                    |
| `abilities.*.modifier`                                                                                        | —                                                                                                | **derived** from `final`                                |
| `stats.*` (AC, HP, init, PB, saves, skills, passives, senses, resistances, languages, proficiencies, hitDice) | Chassis + Progression (proficiency lines, features, items) + KB                                  | **derived** (compiled snapshot at `currentLevel`)       |
| `progression[]`                                                                                               | Progression blocks — one item per grant, `kind`/`classRef`/`unlockLevel` (§5)                    | read (`unlockLevel` from block level)                   |
| `actionEconomy`                                                                                               | Attacks + action-costing features (§5)                                                           | **derived** (grouped by economy)                        |
| `attacks[]`                                                                                                   | Attacks rows — modes, `toHit`(+`magicBonus`), `range`, `damage`, `riders`, `consumableRef` (§5)  | read                                                    |
| `spellcasting.sources[]`                                                                                      | Casting sources table (§7); DC/attack                                                            | read (numbers may be derived)                           |
| `spellcasting.slotPools[]`                                                                                    | Slot pools table (§7)                                                                            | read                                                    |
| `spellcasting.spells[]`                                                                                       | Spells (§5) — level, school, C/R, `origins`, `role`, `poolRef`, `unlockLevel`, `swapOutLevel`    | read                                                    |
| `spellcasting.swaps[]`                                                                                        | Fixed-known "drop X / learn Y" lines (§5)                                                        | read                                                    |
| `pools{}`                                                                                                     | Volatile defaults (§6) — `chooseCount`, `defaults`; **options + extracts**                       | read (defaults) / **derived** (full option set from KB) |
| `resources[]`                                                                                                 | Limited-use features' "max + recovery" wording (§5)                                              | **derived** (structured `recover`)                      |
| `consumables[]`                                                                                               | Equipment tally items / ammo (§6/§12)                                                            | read                                                    |
| `equipment`                                                                                                   | Equipment (§12) — items, currency, attunement, capacity                                          | read                                                    |
| `companions[]`                                                                                                | Companions (§12)                                                                                 | read                                                    |
| `library{}`                                                                                                   | Homebrew (§8) verbatim **+** KB extracts for every named official entry                          | read (homebrew) / **derived** (KB pull)                 |

**Referential integrity** (validator, T04): every `ref` the compiler emits — from
species/class/subclass names, spell/attack/item/pool/companion entries — must
resolve in `library`. The compiler guarantees this by pulling a KB extract or
emitting the homebrew block for every entry it references. If the doc names
something the compiler can't find in the KB and it isn't defined under Homebrew,
that's a **blocking error** (surface it — don't invent the entry).

---

## 12. Equipment & companions (the remaining sections)

### Equipment

```markdown
## Equipment

| Item                  | Qty | Weight (lb) | Cost   | State                 | Notes                     |
| --------------------- | --- | ----------- | ------ | --------------------- | ------------------------- |
| Longsword             | 1   | 3           | 15 gp  | equipped, carried     |                           |
| Shortbow              | 1   | 2           | 25 gp  | equipped, carried     | uses arrows (consumable)  |
| Studded Leather Armor | 1   | 13          | 45 gp  | equipped, carried     |                           |
| Dagger                | 1   | 1           | 2 gp   | carried               | spare backup              |
| Ember Compass         | 1   | 1           | 250 gp | equipped, **attuned** | casting source (homebrew) |
| Ashwalker Cloak       | 1   | 1           | 500 gp | _(unlocks 5)_         | promised on EK training   |

- **Currency:** 32 gp, 5 sp. _(seeds the session; changes live in-session)_
- **Attunement slots:** 3.
- **Carrying capacity:** 150 lb. _(app shows kg too)_

### Consumables (tallied)

- **Arrows** — max 20; tally after each shot.
```

`equipped`/`carried`/`attuned` are the **default** state; live state lives in the
session loadout. An item with an `(unlocks N)` note gets `unlockLevel = N` and is
grayed in Build view until then. Currency **seeds** the session and is owned there
after import (schema/README "Why currency lives in the session layer").

### Companions

One block per companion — a mini-sheet, not a full character:

```markdown
## Companions

### Ember Sprite _(familiar)_

- **Abilities:** STR 3, DEX 16, CON 10, INT 10, WIS 12, CHA 11
- **AC 13 · HP 5 · Fly 30 ft**
- **Saves:** DEX +5 · **Skills:** Stealth +7
- **Attack — Ember Touch:** +4, 5 ft, 1d4 fire
- **Feature — Flicker:** advantage on DEX saves vs. restrained
- **Senses:** Darkvision 60 ft · **Languages:** Ignan
```

Maps to `companions[]` (`CompanionSheet`): abilities, `ac`, `maxHp`, `speeds`,
`saves`, `skills`, `attacks`, `features`, senses, languages, and optional
per-companion `resources`. The companion's own trackers live in the session layer.

---

## 13. Authoring checklist

Before handing a chassis doc to `compile.md`:

- [ ] Frontmatter complete; `currentLevel ≤ targetLevel`.
- [ ] Every mechanical reflavor has an explicit DM-approved `yes`/`no` (§3).
- [ ] Classes in class order; each with levels, hit die, and (if any) planned
      subclass + unlock level (§4).
- [ ] Ability scores: base, changes-with-source, final (§4).
- [ ] Every progression grant labeled `(auto)`/`(choice)` and resolved inline (§5).
- [ ] No `TBD(...)` at or below `currentLevel` (§9).
- [ ] Every homebrew entry has full rules text under Homebrew (§8).
- [ ] Pools list defaults ⊆ options (§6).
- [ ] Every named entry either resolves in the KB or is defined in Homebrew (§11).
- [ ] `FLAG:` notes reviewed with the author.

The interview flow ([`interview.md`](interview.md)) produces a doc that satisfies
this checklist by construction. Compiling is always a **separate** step
([`compile.md`](compile.md)) — the chassis doc is never a `character.json`.
