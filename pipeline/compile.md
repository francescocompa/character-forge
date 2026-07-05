# The compile recipe

> **What this is.** Instructions a Claude Code session follows to turn a
> [`*.chassis.md`](chassis-format.md) build document into a validated,
> self-contained `*.character.json` — the contract in [`schema/`](../schema/README.md).
> You are the **compiler** (scope §1): you do once, by hand, all the derivation
> the app deliberately never does at runtime. Final scores, DCs, AC, HP, slot
> pools, prepared-spell pools with full rules text — all computed and embedded
> here so the app only ever _renders_.
>
> **Required reading before you compile:**
> [`planning/PROJECT-SCOPE.md`](../docs/PROJECT-SCOPE.md) §4 (guardrails), §5 (data
> flow), §6 (the file contract); [`chassis-format.md`](chassis-format.md) (your
> input); [`schema/README.md`](../schema/README.md) + [`schema/markup-grammar.md`](../schema/markup-grammar.md)
> (the output shape and the inline grammar).

You are running this **cold** — assume no memory of how the character was built.
Everything you need is the chassis doc, the knowledge base, and these docs. Where
this recipe and the [`schema`](../schema/character.schema.json) disagree, the
schema wins; where the chassis doc and the schema disagree, surface it (§13) —
don't paper over it.

---

## 1. Inputs & invocation

You are given:

| Input              | What it is                                                                                                                                         | Required |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Chassis doc**    | `Characters/<name>.chassis.md` — the build (see the format).                                                                                       | yes      |
| **KB path**        | `~/Documents/D&D/D&D Character Builder/dnd-5e-knowledge-base/` — the rules source. Read `MANIFEST.json` first.                                     | yes      |
| **`currentLevel`** | The level to compile the snapshot at. Defaults to the doc's frontmatter `currentLevel`; a caller may override it (this is the level-up path, §16). | from doc |
| **Session file**   | Optional `Characters/<name>[.variant].session.json` whose `additions[]` the user wants folded into the base file (§16 _adopt additions_).          | no       |

**Everything you write lands in the local data home**, never the repo (scope §4):

```
Characters/<name>.character.json         the compiled, self-contained file
Characters/<name>.compile-notes.md       your judgment calls & flags (§15)
```

For a build with variants (§9) emit one `character.json` per variant, each named
`Characters/<name>.<variant-slug>.character.json`, plus one shared notes file.

The KB and every compiled `*.character.json` embed WotC text and **must stay in
`Characters/`** — the `.gitignore` keeps them out of the public repo. This recipe,
and any doc you write _into the repo_, must never contain WotC rules text.

---

## 2. Your stance

- **Faithful, not creative.** Summaries compress official text; they never invent
  or alter a mechanic (scope §4). Every mechanical claim you write traces to a KB
  extract you embedded, or to a Homebrew block from the chassis doc. If you can't
  back it, you don't write it — you `FLAG` it (§13).
- **Compute once, honestly.** You are the rules engine (scope §1). Do the math the
  way the chassis doc states the character was built (its ability method, its HP
  method, its stated proficiency grants) — not the way you'd optimise it.
- **Verbatim in, compressed out.** `library` extracts are copied **word for word**
  from the KB (popovers show official text — no paraphrase). The _summaries_ on the
  sheet are yours to compress (§6). Two different jobs; don't blur them.
- **Ambiguity goes to Francesco.** A `TBD` at or below `currentLevel`, a named
  entry you can't find, a homebrew wording you're unsure of, a number that doesn't
  reconcile — stop and surface it (§13). Never guess to finish.

---

## 3. The compile loop at a glance

```
  read chassis doc  ─▶  retrieve KB extracts  ─▶  compute the snapshot
        │                    (§4)                       (§5)
        ▼                                                 │
  encode progression / attacks / spells / pools  ◀────────┘
        (§6 summaries, §7 pools, §8 multiclass, §10–11)
        │
        ▼
  assemble library (§12)  ─▶  size check (§13)  ─▶  validate (§14)
        │                                              │
        └───────── fix & re-run until 0 errors ◀───────┘
        │
        ▼
  self-review checklist (§14)  ─▶  write compile-notes.md (§15)
```

Work section by section against the chassis doc; keep a running `library` as you
go (every time you name an entry, queue its extract). Validate last, but design
for it throughout — the file must satisfy referential integrity by construction.

---

## 4. Retrieval discipline

The knowledge base is the only place official rules text comes from.

1. **MANIFEST first.** `MANIFEST.json` is the index: `{ entries: [{ name, type,
edition, source, file, page?, category }] }`. Match the chassis doc's named
   entry on `name` (+ `type` when a name is ambiguous — "Great Old One" the
   subclass vs a spell), then open its `file` (e.g. `2024/classes/warlock-XPHB.md`)
   and read the entry.
2. **Filter by edition.** The build's rules envelope is the frontmatter `ruleset`
   together with its `sources` allow-list. Take the entry from the default edition
   unless the doc explicitly sources it otherwise. **A name can exist in both 2014
   and 2024** (Autognome is 2014-only; Warlock exists in both) — pick the edition
   the doc names, and if the doc is silent default to `ruleset`. Never silently
   cross editions (scope §2.7: Vice is 2024 Warlock + 2014 Autognome — that mix is
   explicit in her doc).
3. **Copy verbatim.** The `library[key].markdown` is the KB entry's text, **exactly**
   — including its lore/description tail (popovers show the real thing). Record
   `name`, `edition`, `type`, `source`, and `page` from the manifest/entry. Do not
   trim, reword, or "clean up" official text here; trimming for size is a separate,
   last-resort step (§13) and only ever removes lore, never mechanics.
4. **Homebrew is not retrieved — it's transcribed.** Anything the chassis doc
   defines under **Homebrew** becomes a `library` entry one-to-one:
   `edition: "Homebrew"`, `source: "Homebrew"`, `markdown` = the doc's block
   verbatim. Never blend homebrew into official text (scope §4).
5. **Can't find it?** If the doc names an official entry that isn't in the KB and
   isn't defined under Homebrew, that is a **blocking error** — surface it (§13),
   don't invent the entry. (If the KB _has_ the entry but its text is wrong/stale
   — e.g. a 2014 block mislabeled 2024 — embed what's there, author a placeholder
   only if the doc's Homebrew covers it, and record a `KB-GAP` note flagged for
   [`kb-audit`](kb-audit.md), T20.)

---

## 5. Computation duties

You compute the **snapshot at `currentLevel`** and write final values. Show your
working in a `note` wherever a number isn't self-evident (AC formula, rolled HP,
PB-scaled maxima) — the app renders these notes, and they kill the cross-page
desync the paper sheets suffered (scope §14 #1).

| What                                                                         | How                                                                                                                                                                                                                         | Lands in                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Ability modifiers**                                                        | `floor((final − 10) / 2)` from the doc's `final`.                                                                                                                                                                           | `abilities.*.modifier`     |
| **Proficiency bonus**                                                        | By total character level (`currentLevel`): 1–4→+2, 5–8→+3, 9–12→+4, …                                                                                                                                                       | `stats.proficiencyBonus`   |
| **Saves**                                                                    | mod + (PB if the class grants that save — starting class grants two; multiclass grants none, scope §2.8). `proficient` flag + final `modifier`.                                                                             | `stats.saves[]`            |
| **Skills**                                                                   | all 18, `ability`, `proficiency` (`none`/`proficient`/`expertise`), final `modifier` = ability mod + (PB or 2·PB). Resolve _which_ skills from the proficiency lines in the doc's progression (class, background, species). | `stats.skills[]`           |
| **Passives**                                                                 | 10 + relevant skill modifier (perception unless the doc says otherwise).                                                                                                                                                    | `stats.passives`           |
| **AC**                                                                       | by the doc's method; write the formula in `note` (e.g. `"13 + DEX (Armored Casing)"`). No armor table lookup unless the doc's gear implies it.                                                                              | `stats.ac`                 |
| **Max HP**                                                                   | by the method the **doc states** — fixed/average _or_ a rolled/edited override. Record which in `note` ("rolled", or the average formula). Never silently "correct" a rolled value to the average (scope §2, T03 item 4).   | `stats.maxHp`              |
| **Initiative**                                                               | DEX mod (+ any stated bonus).                                                                                                                                                                                               | `stats.initiative`         |
| **Speeds / senses / languages / resist / immune / cond-adv / proficiencies** | Read from species/background/class features; senses & resistances often carry a `{ref:}` back to the granting feature.                                                                                                      | `stats.*`                  |
| **Hit dice**                                                                 | **per class** — one entry per class `{ classRef, die, count = that class's levels }`. Never merge.                                                                                                                          | `stats.hitDice[]`          |
| **Save DC / attack mod, per casting source**                                 | `8 + PB + ability mod` (DC) and `PB + ability mod` (attack), computed **per source** — an item source can differ from the class (§11).                                                                                      | `spellcasting.sources[]`   |
| **Slot pools**                                                               | count + level from the class table at `currentLevel`; **each pool separate** with its own recover (§8/§11).                                                                                                                 | `spellcasting.slotPools[]` |
| **Resource maxima**                                                          | number, or a **displayed formula** when it scales: write the current value _and_ a formula note (`max: "PB"`, `note: "= proficiency bonus (2 at level 2)"`). Structured `recover` (§ below).                                | `resources[]`              |
| **Attacks**                                                                  | to-hit = PB + ability mod (mark any separable magic bonus as `magicBonus`); damage in markup; `riders[]` for on-hit extras; save-based attacks use `save` not `toHit`.                                                      | `attacks[]`                |
| **Consumables**                                                              | tally items (ammo): `max?`, `notes?`.                                                                                                                                                                                       | `consumables[]`            |

### Structured recovery (incl. mixed rules)

`recover` is an array — one entry per rule, so **mixed recovery composes** (scope
§2.3). `on` ∈ `short` | `long` | `dawn`; `amount` ∈ `"all"` | a number.

```jsonc
"recover": [{ "on": "long", "amount": "all" }]                       // 1/LR
"recover": [{ "on": "short", "amount": "all" }]                      // pact slots
"recover": [{ "on": "long", "amount": "all" }, { "on": "short", "amount": 1 }]  // 2/LR + regain 1 on SR
```

The chassis doc states recovery in plain words ("2/long rest, regain 1 on short
rest"); you turn it into this structure and link the feature to it via
`limitedUseRef` (progression item → `resources[].id`).

---

## 6. Summary authoring — the compression style guide

This is the heart of "compiles it like Francesco fills it" (scope §2.4). A
`summary` is a one-line, mechanically-complete restatement of a feature/spell/
attack, using the inline markup grammar as the hand-colouring system-as-data. The
full official text is one tap away in the popover; the summary is the at-a-glance
line.

**The rules (in priority order):**

1. **Action economy first.** Lead with _when/how_ it's used — action, bonus
   action, reaction, at-will, or the trigger — then the effect.
2. **Keep every number.** Dice, DCs, ranges, durations, uses, recovery. These are
   the point. Round nothing; drop nothing quantitative.
3. **Drop flavor, keep mechanics.** Cut the prose, the "you whisper to the
   spirits" framing. Keep exactly what changes at the table.
4. **Resolve choices inline.** If the build picked options, name them
   ("Specialized Design: Thieves' tools, Forgery Kit") — not "two tools of your
   choice".
5. **Colour the semantics with markup.** Ability refs `{a:CHA}`; typed damage
   `{dmg:psychic|1d6}`; bare damage type `{dtype:poison}`; saves `{save:INT|13}`;
   loose dice `{dice:1d4}`; advantage/disadvantage `{adv}`/`{dis}`; conditions
   `{cond:frightened}`; recovery icons `{recover:LR}`/`{recover:SR}`; unlock badge
   `{lvl:6}`; cross-links `{ref:mind-sliver|Mind Sliver}`; parenthetical asides
   `{note:...}`. (Full grammar + arity: [`schema/markup-grammar.md`](../schema/markup-grammar.md).)
6. **Link, don't inline, other entries.** A feature that grants a spell/familiar
   references it (`{ref:find-familiar|Find Familiar}`), so the popover chain works.
7. **The honesty rule.** If compressing would drop a _material_ condition (a
   trigger, a limit, a "once per turn", a save-for-half), **keep it or don't
   compress** — expand to a second clause, or leave the summary longer. A wrong-
   because-shortened line is worse than a long one (scope §4: faithful content).

Because these examples live in the public repo, the "before" text below is
**invented, homebrew-style** rules text, not WotC content (scope §4) — but the
_compression moves_ are exactly the ones you apply to real KB text.

| #   | Before (illustrative official-style text)                                                                                                                                                                                                                 | After (sheet-markup summary)                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | "You can add a d4 to one attack roll, ability check, or saving throw after seeing the d20 roll. You can use this a number of times equal to your proficiency bonus, regaining all uses on a long rest."                                                   | `Add {dice:1d4} to one d20 test after seeing the roll. {note:PB/}{recover:LR}.`                                             |
| 2   | "As an action, you fling a shard of psychic energy at a creature within 60 feet. It must make an Intelligence saving throw (DC 13) or take 1d6 psychic damage and subtract 1d4 from its next save before the end of your next turn."                      | `{dmg:psychic\|1d6} & {save:INT\|13}; −1d4 to next save.`                                                                   |
| 3   | "You are encased in durable material. While you aren't wearing armor, your base Armor Class equals 13 + your Dexterity modifier."                                                                                                                         | `Unarmored AC = 13 + {a:DEX}.`                                                                                              |
| 4   | "You have resistance to poison damage, immunity to disease, and advantage on saving throws against being paralyzed or poisoned. You don't need to eat, drink, or breathe."                                                                                | `Resist {dtype:poison}; immune to disease; {adv} vs {cond:paralyzed} & {cond:poisoned}; no need to eat, drink, or breathe.` |
| 5   | "As a bonus action, choose a creature you can see within 90 feet. It takes an extra 1d6 necrotic damage whenever you hit it with an attack, and it has disadvantage on ability checks made with one ability of your choice. Concentration, up to 1 hour." | `{dmg:necrotic\|1d6} extra on hit; {dis} on one ability. {note:BA, concentration}.`                                         |
| 6   | "For 1 minute you can perform an esoteric rite; at the end you regain expended pact spell slots up to half your maximum (round up). Once used, you can't do so again until you finish a long rest."                                                       | `1-min rite regains up to half your Pact slots. 1/{recover:LR}.`                                                            |
| 7   | "When you hit a Large or smaller creature with your eldritch blast cantrip, you can push it up to 10 feet straight away from you. (Available at 5th level.)"                                                                                              | `Push a Large-or-smaller creature 10 ft on an {ref:eldritch-blast\|Eldritch Blast} hit. {lvl:5}`                            |
| 8   | "As a reaction when you fail a Charisma (Deception or Persuasion) check, you may reroll it. Once per long rest."                                                                                                                                          | `Reroll a failed Deception/Persuasion. 1/{recover:LR}. {note:reaction}.`                                                    |

Notes on the examples: #2 and #5 keep the _material rider_ (the −1d4, the
disadvantage clause) rather than compressing it away (rule 7). #1 uses `{note:PB/}`
for "uses = proficiency bonus" — a formula the app renders next to the recover
icon. #7 carries an `{lvl:5}` badge because it's future content (§10). Pipe
characters inside a tag are written `\|` when the summary sits in Markdown table
cells like these; in the JSON file they're plain `|`.

---

## 7. Pool embedding (D13)

Volatile elements — **prepared spells** (per source), **weapon masteries**, and
any other swap-at-rest choice — are _pools_: the file embeds the **full option
set** with extracts; the live selection lives in the session layer, seeded from
the doc's defaults.

For each pool the chassis doc declares under **Volatile defaults**:

1. Determine the **full option set** _at `currentLevel`_ — e.g. every spell the
   character could prepare _now_ (the class's preparable list up to the highest
   slot level she has), every mastery she could pick. Don't embed options she
   can't yet access; do embed all she can.
2. Emit a `pools[<key>]`:
   `{ kind, name, sourceId?, chooseCount, options: [{ ref, name }…], defaults: […], note }`.
   `chooseCount` is the prepare/pick count (a number, or a formula string when the
   count itself is derived — "INT mod + level"). `defaults` ⊆ the option refs and
   must not exceed `chooseCount`.
3. **Embed a `library` extract for every option** (§4/§12) — popovers work inside
   the pool browser, so each option `ref` must resolve like any other. This is the
   main driver of file size; see §13.
4. The `defaults` seed the session loadout only — they are _not_ the character's
   permanent choice. Spells/masteries the doc marks prepared-by-default go in
   `defaults`; the rest are pool options only.

A prepared spell also appears in `spellcasting.spells[]` (its row on the sheet)
with `role: "prepared"` and `poolRef: "<pool key>"`; always-prepared/innate/known
spells are _not_ pool members (they're fixed) — see §11.

---

## 8. Multiclass duties (D11)

Multiclass is a normal case, not an edge case. Per the governing edition's
multiclass rules, computed and written explicitly:

- **Class order & per-class levels.** `chassis.classes[]` in class order;
  `classOrder: 1` is the starting class. Each entry carries its `levels`, `hitDie`,
  and (if any) planned `subclass` **with its own `unlockLevel`** — a planned
  subclass is progression content, grayed until its level (scope §2.8).
- **Proficiency resolution.** The **starting class** grants full starting
  proficiencies (both its saves, its full armor/weapon/skill grants as the doc
  states); **later classes** grant only the reduced multiclass set. The doc's
  progression proficiency lines state both explicitly — encode exactly those,
  don't re-derive from the class entry. Two save proficiencies come from the
  starting class only.
- **Hit dice split per class.** One `stats.hitDice[]` entry per class
  (`{ classRef, die, count }`) — never a merged pool (scope §2.8: Shigen is
  1×d10 + 5×d8).
- **Per-source spellcasting.** One `spellcasting.sources[]` per casting class /
  subclass / feat / item, each with its **own** ability, save DC, attack mod, and
  prepare rule (§11). A martial/caster mix has only the caster classes as sources.
- **Slot pools coexist.** Pact slots (SR), shared multiclass slots (LR), a bonus
  homebrew slot — each is its **own** `slotPools[]` entry at its spell level with
  its own recover (scope §2.8). Compute the shared multiclass slot table from the
  _summed_ caster levels per the edition's multiclass caster rule when two full/
  half casters combine; keep pact slots separate (they never merge).
- **Spell origin tags.** Every spell carries `origins[]` — which source(s) grant
  it (the coloured origin dot). A spell on two lists gets two origins → a
  dual-source dot (scope §2.8; Vice's Hex is `["warlock","fey-pact"]`).
- **One merged spell surface.** All sources' spells live in one
  `spellcasting.spells[]`; the origin dots and per-source DCs keep them legible —
  don't split the array by class.

Single-class builds are the degenerate case of all of the above (one class entry,
one hit-die line, one source) — the same code path, nothing special.

---

## 9. Variants (D12)

When the chassis doc has a **Variants** section, emit **one file per variant**:

- All variants share `meta.characterId`. The base build's file gets
  `meta.variantLabel = <Base label>`; each `### Variant — <name>` gets
  `meta.variantLabel = <name>`.
- Compile each variant as **base + its overrides**: start from the base build,
  apply only the fields the variant restates (a level's class choice, a subclass,
  a default-prepared list), leave everything else inherited.
- **Shared content stays byte-identical** across the files — the same library
  extract, the same untouched progression item must serialise identically in every
  variant file (so the app and any diff can trust that equal means equal). Compile
  the base once, deep-copy, then mutate only the overridden regions.
- Name them `Characters/<name>.<variant-slug>.character.json`; write one shared
  `<name>.compile-notes.md` covering all variants.

---

## 10. Progression encoding

`progression[]` is the paper sheet's level column, written out — **every grant,
including future ones**, each stamped with `unlockLevel` and (for class grants)
`classRef`.

- One item per grant: `{ name, displayName?, ref?, classRef?, kind, summary,
limitedUseRef?, unlockLevel }`. `kind` ∈ `feature` | `invocation` | `feat` |
  `asi` | `subclass` | `spell-learned` | `slot-change` | `mastery-change` |
  `proficiency` | `other`.
- **`unlockLevel` = the character level the grant comes online.** Items with
  `unlockLevel ≤ currentLevel` are active (Level view shows them); items above are
  planned (Build view grays + badges them, scope §14 #2). Write them all.
- **`classRef`** on class/subclass grants; omit it on species/background/feat
  lines.
- **Future summaries carry an `{lvl:N}` badge** matching their `unlockLevel`, so
  Build view reads like the paper sheet's numbered badges.
- **`limitedUseRef`** links a limited-use feature to its `resources[]` entry (same
  string id).
- **TBD handling (chassis-format §9).** A `TBD(...)` **above** `currentLevel` is
  non-blocking: emit the level's resolved content and represent the undecided
  choice as a visible placeholder item (e.g. an `asi` item whose summary says
  `ASI or feat. {lvl:8}` with no `ref`) — Build view only. A `TBD(...)` **at or
  below** `currentLevel` is a **blocking error**: stop and surface it (§13); the
  character is played at that level and can't compile with an open choice there.

---

## 11. Spellcasting specifics

- **`sources[]`** — one per casting origin. `{ id, name, classRef? | originRef?,
ability, saveDc, attackMod, prepareRule? }`. `classRef` for a class source,
  `originRef` for a feat/item/subclass source. DC/attack computed per §5 from
  _that source's_ ability. `prepareRule` is prose the app shows ("Prepare 2;
  replace 1 on {recover:LR}.").
- **`slotPools[]`** — `{ id, name, sourceId, slotLevel, count, recover }` (§5/§8).
  Pools coexisting at one level with different recovery are separate entries.
- **`spells[]`** — one row per spell: `{ name, ref, level, school, concentration?,
ritual?, origins: [sourceId…], role, poolRef?, unlockLevel, swapOutLevel?,
summary }`.
  - `role` ∈ `prepared` (counts against a prepare limit; carries `poolRef`) |
    `alwaysPrepared` | `innate` (at-will, e.g. via an invocation) | `known`
    (fixed pick, e.g. Pact cantrips) | `ritualOnly`.
  - `origins[]` = the source id(s) granting it; two → dual-source dot (§8).
  - `poolRef` only on `prepared` spells (→ a `pools` key, §7).
- **`swaps[]`** — fixed-known casters (Warlock/Sorcerer) that drop a known spell
  to learn another on level-up: record `{ out, in, level }` and set the dropped
  spell's `swapOutLevel`. (Only encode a swap once _both_ spells are embedded; if
  the incoming spell isn't embedded yet, note it as deferred rather than emit a
  dangling swap — T03 F1.)

---

## 12. Library assembly & referential integrity

`library` is the self-containment guarantee: **every `ref` in the file resolves
here** (scope §6). That includes structural refs (species, class, subclass, spell,
attack, item, companion, pool option) _and_ every `{ref:KEY|…}` embedded inside a
summary.

- Key each entry by the kebab-case `ref` used to point at it. Shape:
  `{ name, edition, type, source, page?, markdown }`.
- **Build the library as you go:** every time you name an entry anywhere, queue
  its extract. Before you finish, sweep the whole file for `ref`/`{ref:}` and
  confirm each has a `library` key — the validator (§14) enforces this, but design
  for it so validation is a formality.
- **Don't leave orphans, don't leave danglers.** An unused library entry is a
  _warning_ (fine if intentional, e.g. a link target like `eldritch-blast` kept
  for a rider note); a `ref` with **no** entry is an _error_. Prefer neither: embed
  exactly what you reference.
- Homebrew entries: `edition: "Homebrew"`, `source: "Homebrew"` (§4.4).
- Reflavor entries (`displayName` ≠ source name, e.g. Autognome shown as
  "Marionette") keep the **source** entry's `ref`/name in `library`; the
  `displayName` and any `modifications[]` live on the chassis element, and the
  reflavor itself can have its own small homebrew library entry when the doc gives
  it flavor text (Vice's `marionette`).

---

## 13. File-size budget & trimming

Budget: **≤ 5 MB per character file** (validator errors above 5 MB, warns above
4 MB); portraits ≤ 200 KB. Pools are the size driver — a full prepared-caster list
can be ~1 MB of markdown.

Check the byte size after assembly (`wc -c`, or the validator's sanity layer). If
you're over budget, trim in this order — **mechanics are never trimmed** (scope
§4):

1. **Lore/description tails first.** KB spell/feature entries carry a flavor tail
   after the mechanical block; trim those from **pool-option** extracts (the least-
   read popovers) before anything else. Note in `compile-notes.md` that you did.
2. **Then higher-level pool options** the character can't use yet (defer embedding
   spell tiers above the current slot level — T03 item 11 handles Vice this way).
3. **Never** trim: the mechanical body of any extract, any actively-prepared/known
   spell, any feature summary, any `library` entry reached by a rider or a senses
   line.

If trimming lore still leaves you over budget, that's a `FLAG` for Francesco
(consider variants or splitting) — don't drop mechanics to fit.

---

## 14. Verification loop & self-review

**Run the validator until it's clean.** From the repo root:

```sh
npx character-forge-validate "~/Documents/D&D/D&D Character Builder/Characters/<name>.character.json" --json
```

Parse the JSON (`{ valid, errorCount, warningCount, issues[] }`, shape in
[`validate/README.md`](validate/README.md)). For each `error`, read its `layer`

- `path` + `message`, fix the file, re-run. Iterate to **0 errors**. Warnings are
  allowed — but read each one; an "unused library entry" warning often means you
  forgot to _reference_ something you embedded, or embedded something you don't need.

The four layers catch: schema shape, referential integrity (`ref`s + id
cross-refs), markup lint (every string parses; bad arity/args are errors), and
sanity (level math, unique ids, pool defaults ⊆ options, size). Green means the
app can import it.

Then a **human self-review checklist** (the validator can't judge faithfulness):

- [ ] **Every chassis-doc line is accounted for** — walk the doc top to bottom;
      each grant, choice, item, spell, companion appears in the file (or is a
      documented `EXCLUDED`/`DEFERRED` in the notes).
- [ ] **Every `ref` resolves** and every `{ref:}` inside a summary resolves
      (validator confirms; eyeball the intent).
- [ ] **Every summary traces to its extract** — no summary asserts a mechanic the
      embedded `library` text (or a Homebrew block) doesn't support (scope §4).
- [ ] **Numbers reconcile** — saves/skills = mod + PB where proficient; DC/attack
      = the per-source formula; hit dice sum to `currentLevel`; slot counts match
      the class table.
- [ ] **View-mode integrity** — nothing above `currentLevel` is missing an
      `unlockLevel`/`{lvl:}`; nothing at/below has an unresolved `TBD`.
- [ ] **Guardrails** — no WotC text in any repo-bound file; homebrew clearly
      marked; reflavor changes have their DM-approved provenance noted.

---

## 15. Output: the character file + compile-notes

Write two files (§1):

1. **`Characters/<name>.character.json`** — the validated file.
2. **`Characters/<name>.compile-notes.md`** — the judgment log, same convention as
   the T03 ground truth (`Characters/vice.compile-notes.md`). One entry per
   non-obvious call, tagged:
   - `UNCONFIRMED` — a reading you need Francesco to confirm (yes/no).
   - `FLAG` — an ambiguity you surfaced rather than resolved.
   - `KB-GAP` — the KB can't faithfully back a mechanic; route to
     [`kb-audit`](kb-audit.md) (T20).
   - `DEFERRED` — represented but not fully embedded this pass (e.g. higher-tier
     pool spells, §13).
   - `EXCLUDED` — deliberately left off, with the reason.

   Also record: HP method used, AC formula, any lore trimmed for size, any
   cross-edition entry and why, and every `modifications[]`/reflavor with its
   DM-approved status. This file lives in `Characters/` and **may** quote the
   build; keep it out of the repo.

---

## 16. The level-up path (the common recurring case)

Levelling an existing character is a **re-compile**, not a new build — the chassis
doc already contains the future levels (that's the point of writing progression to
`targetLevel`). To bump Vice from 2 → 3:

1. **Raise the level.** Update the chassis doc's frontmatter `currentLevel` **and
   the Classes table's `levels`** for whichever class takes the new level — the two
   must stay consistent (the validator errors if `currentLevel` exceeds the summed
   class levels). Bump `targetLevel` too if the new level exceeds it, extending the
   progression with the new blocks.
2. **Resolve that level's TBDs.** Any `TBD(...)` at the _new_ `currentLevel` was
   non-blocking before and is **blocking now** — land those choices in the doc
   with Francesco (which subclass, which spell, ASI-vs-feat) before compiling.
3. **Recompile** from the (updated) doc following §§4–14. Everything re-derives:
   PB may step (5th→+3), save/skill/DC totals shift, new slot pools/counts appear,
   newly-unlocked progression items flip from grayed to active (their `unlockLevel`
   now ≤ `currentLevel`), new pool tiers may need embedding (§7/§13).
4. **Revalidate** to 0 errors (§14) and update `compile-notes.md` (note what
   changed and what newly needs confirming).

### Adopting session additions in the same pass

If the user hands you a `*.session.json` with `additions[]` (DM boons, found
items, notes they want made permanent — scope D2):

- For each addition, **translate it into a proper file element**: a found item →
  an `equipment.items[]` entry (with a `library` extract + `ref` if it has rules
  text); a boon → a `progression[]`/feature or `resources[]` entry with a summary
  and, if it cites a rule, an embedded extract; a note → wherever it belongs
  (often just a `compile-notes.md` line). Author summaries with the §6 rules;
  embed any referenced rules text verbatim (§4).
- **Clearing the addition from the session file is the _user's_ manual step**, not
  yours — the app never edits the base file, and you never edit the session file
  (scope §4). Tell Francesco, in the notes, exactly which additions you adopted so
  he can clear them from the session layer on his next import. Adopting the same
  addition twice (because it wasn't cleared) would double it — that's why the
  hand-off is explicit.

The level-up and adopt-additions passes compose: do them together in one
recompile when both are pending.

---

_Compiling is always a **separate** step from the interview
([`interview.md`](interview.md)) and from validation ([`validate/`](validate/)).
The chassis doc is never a `character.json`; the app never runs this recipe. See
[`README.md`](README.md) for the whole pipeline._
