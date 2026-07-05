<!--
  WORKED EXAMPLE — product of a dry-run interview following ../interview.md.
  Wholly INVENTED content (public-repo safe, scope §4): the species, background,
  class stand-ins, subclass, spells, and companion below are homebrew/synthetic.
  A real build would name official KB entries here; the compiler would pull their
  extracts. Kept fictional end-to-end so no WotC rules text lands in the repo.
  Concept demonstrated: single-class caster, reflavored species, DM-approved
  homebrew background, a prepared-spell pool, a companion, planned subclass, one
  variant, and TBD markers above the current level.
-->

---

name: Thessaly Quill
player: Francesco
characterId: thessaly-quill
ruleset: "2024"
sources:

- "2024 core"
- Homebrew
  targetLevel: 6
  currentLevel: 4

---

# Thessaly Quill

## Concept & reflavoring

Thessaly è un'archivista dell'Ordine delle Lanterne: cataloga i sogni che le
persone dimenticano al risveglio e li rilega in piccoli volumi di carta cerata.
_(concept prose — Italian; mechanics stay English below.)_ She fights reluctantly,
mostly by binding what she sees into fragile, temporary shapes. The lantern she
carries isn't a light source so much as a reading device for half-remembered
things.

### Reflavoring

| Source entry | Shown as | Mechanical change                       | DM-approved |
| ------------ | -------- | --------------------------------------- | ----------- |
| Glimmerkin   | Lampfolk | (name/flavor only)                      | n/a         |
| Glimmerkin   | Lampfolk | Darkvision 60 → 90 ft (lantern-adapted) | yes         |

---

## Chassis

- **Species:** Glimmerkin → _Lampfolk_ (see reflavoring). Small; darkvision 90 ft.
- **Background:** Dream Archivist _(homebrew — see below; DM-approved)_. Grants
  Insight, calligrapher's supplies, and the origin feat **Bound Memory**.

### Classes

| Order | Class      | Levels | Hit die | Planned subclass    | Subclass unlocks at |
| ----- | ---------- | ------ | ------- | ------------------- | ------------------- |
| 1     | Lanternist | 4      | d8      | Order of the Vellum | 3                   |

_Total character level: 4 now, planned to 6. Single class — no multiclass
prerequisites apply._

### Ability scores

Method: **point buy**. `final` = base + noted changes; the compiler computes
modifiers.

| Ability | Base | Changes                | Final |
| ------- | ---- | ---------------------- | ----- |
| STR     | 8    | —                      | 8     |
| DEX     | 14   | —                      | 14    |
| CON     | 13   | —                      | 13    |
| INT     | 15   | +1 (Bound Memory feat) | 16    |
| WIS     | 12   | —                      | 12    |
| CHA     | 10   | —                      | 10    |

_Primary casting ability: INT. ASI at level 4 taken as a feat (see progression),
so no raw score bump there._

---

## Homebrew

### Dream Archivist _(background)_

Skill proficiencies: Insight, Investigation. Tool proficiency: calligrapher's
supplies. Origin feat: **Bound Memory**. Equipment: a bound ledger, a set of wax
seals, and a shuttered reading-lantern. _(Full text as it should read in the
popover.)_

### Bound Memory _(origin feat)_

+1 Intelligence. Once per long rest, after you finish a short or long rest, you
may "shelve" one thing you witnessed that day; while it's shelved you have
advantage on Intelligence (History or Investigation) checks to recall it, and you
may spend your reaction to read it aloud, ending one charm or fear effect on a
creature that can hear you. _(Homebrew — full text.)_

### Lanternist _(class stand-in)_

Invented INT half-caster used for this example. d8 hit die; prepares INT mod +
half level spells from the Lanternist list; casting focus is a shuttered lantern.
_(Stand-in — a real build names a KB class here.)_

### Order of the Vellum _(subclass, unlocks 3)_

Binds a seen creature's outline into wax for a round. Grants **Pressed Form** and,
at higher levels, the ability to reopen a pressed form as difficult terrain.
_(Homebrew subclass — full text.)_

### Waxlight Bolt _(1st-level spell)_

A dart of warm light. **1d8 radiant** damage on a ranged spell attack; on a hit
the target sheds dim light in a 5-ft radius until the end of your next turn (it
can't benefit from being unseen). _(Homebrew spell.)_

### Shelve _(1st-level spell)_

You press a Medium or smaller object or willing creature into a folded paper form
you carry; it re-emerges unharmed when you spend an action to unfold it, or after
1 hour. Concentration. _(Homebrew spell.)_

### Fold the Path _(2nd-level spell)_

A 15-ft line of parchment ribbon. Each creature in the line makes a DEX save or is
**restrained** (paper bindings) until the end of its next turn. _(Homebrew spell.)_

### Margin Note _(cantrip)_

You inscribe a floating one-word note near a point you can see; a creature that
reads it gains a +1 bonus to its next ability check within the next minute.
_(Homebrew cantrip.)_

### Wickling _(companion — homebrew familiar)_

A finger-sized flame that lives in Thessaly's lantern; see the Companions section
for its statline. _(Homebrew creature.)_

---

## Progression

### Level 1 — Lanternist 1 _(starting class)_

- **Proficiencies (starting class):** Saves INT, WIS. Armor light. Weapons simple.
  Skills: choose 2 — Arcana, History, Insight, Investigation, Perception.
  → _chosen:_ Arcana, History.
- **Spellcasting — Lanternist:** INT half-caster. Cantrips + 1st-level spells;
  prepares INT mod + half level. Focus: shuttered lantern. _(auto)_
- **Reading-Lantern:** as an action, reveal invisible ink and read magical writing
  within 10 ft for 1 minute; 1/short rest. _(auto, limited-use)_
- **Species — Kindled Sight (Lampfolk):** darkvision 90 ft; can't be blinded by
  bright light. _(auto)_
- **Background feat — Bound Memory** _(homebrew origin feat)_: +1 INT; shelve a
  memory (see Homebrew). _(auto)_

### Level 2 — Lanternist 2

- **Wax Focus:** you can maintain concentration on a bound-form spell (Shelve,
  Pressed Form) through one instance of damage per turn without a save. _(auto)_
- **Spells learned:** Fold the Path (2nd) becomes preparable. _(choice — see pool)_

### Level 3 — Lanternist 3

- **Subclass — Order of the Vellum:** **Pressed Form** — reaction, when a creature
  you can see within 30 ft moves, press its outline into wax; it takes 1d6 force
  and its speed is halved until your next turn. 2/long rest. _(choice: subclass,
  limited-use)_

### Level 4 — Lanternist 4 ← currentLevel

- **Feat (in place of ASI): Archivist's Eye** _(homebrew)_ — you always know the
  approximate age and origin of written material you touch; +1 INT is **not**
  granted (already 16 from Bound Memory). _(choice)_
- **Cantrip learned:** Margin Note. _(choice)_

### Level 5 — Lanternist 5 _(planned)_

- **Spellcasting:** 2nd-level slots increase; a 3rd-level spell becomes preparable
  — TBD(_Sealed Vault_ vs _Papercut Storm_, undecided). _(choice)_

### Level 6 — Lanternist 6 _(planned)_

- **Subclass feature — Reopened Form:** TBD(exact wording still being drafted with
  the DM). _(choice)_ — FLAG: confirm homebrew text before this level is played.

### Casting sources

| Source     | Ability | Save DC | Atk | Prepare rule                 | Notes        |
| ---------- | ------- | ------- | --- | ---------------------------- | ------------ |
| Lanternist | INT     | 13      | +5  | INT mod (3) + half level (2) | class caster |

_DC/attack shown at current level 4 (PB +2, INT +3). The compiler recomputes and
records the snapshot; level-5/6 numbers left for it to derive._

### Slot pools

| Pool           | Source     | Spell level | Count | Recovery  | Notes    |
| -------------- | ---------- | ----------- | ----- | --------- | -------- |
| Lanternist 1st | Lanternist | 1           | 4     | long rest | standard |
| Lanternist 2nd | Lanternist | 2           | 2     | long rest | standard |

---

## Volatile defaults

### Prepared spells — Lanternist (prepare 5)

Pool = the Lanternist preparable list (compiler embeds all options with full text).

- **Default prepared:** Waxlight Bolt, Shelve, Fold the Path.
- Also in the pool (not prepared by default): _Sealed Vault_.
- Cantrips (always available, not part of the prepared count): Margin Note.

_Prepare count = INT mod (3) + half level (2) = 5; only 3 defaults set — the player
leaves two slots open to fill at the table._

---

## Equipment

| Item              | Qty | Weight (lb) | Cost  | State             | Notes                          |
| ----------------- | --- | ----------- | ----- | ----------------- | ------------------------------ |
| Shuttered Lantern | 1   | 2           | 5 gp  | equipped, carried | spellcasting focus             |
| Quarterstaff      | 1   | 4           | 2 sp  | equipped, carried | melee, versatile               |
| Studded Leather   | 1   | 13          | 45 gp | equipped, carried |                                |
| Bound Ledger      | 1   | 1           | —     | carried           | background item                |
| Wax Seals         | 12  | 0           | 1 gp  | carried           | consumable (see below)         |
| Vellum Reams      | 5   | 2           | 5 sp  | carried           | material for bound-form spells |

- **Currency:** 18 gp, 4 sp. _(seeds the session; changes live in-session)_
- **Attunement slots:** 3.
- **Carrying capacity:** 120 lb.

### Consumables (tallied)

- **Wax Seals** — max 12; spent one per casting of Pressed Form.

---

## Companions

### Wickling _(homebrew familiar)_

- **Abilities:** STR 2, DEX 15, CON 10, INT 7, WIS 12, CHA 11
- **AC 12 · HP 3 · Fly 30 ft (hover)**
- **Saves:** DEX +4 · **Skills:** Perception +3
- **Attack — Singe:** +4, 5 ft, 1d4 fire
- **Feature — Rekindle:** if reduced to 0 HP, reforms in the lantern after 1 hour
  (not destroyed unless the lantern is).
- **Senses:** Darkvision 60 ft · **Languages:** understands Common, can't speak

---

## Variants

Base label: **Vellum Binder** _(the build written above)_

### Variant — Emberwake

- **Level 3:** Order of the Vellum → instead take **Order of the Kindling**
  (unlocks 3): swaps Pressed Form for **Flare** — a bonus-action 2d6 radiant burst,
  2/long rest.
- **Default prepared:** replace Fold the Path with Waxlight Bolt duplicate emphasis
  — TBD(exact list to settle with the DM).
- Everything else inherits the base.

---

_Interview complete. Next step is **compile** (see `../compile.md`) — a separate
session. This document is a chassis doc, **not** a character file. One `TBD` sits
at level 5 and one at level 6 (both above currentLevel 4 → non-blocking); one
`FLAG` awaits the DM before level 6 is played._
