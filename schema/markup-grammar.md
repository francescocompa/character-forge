# Sheet-markup grammar

Sheet-markup is the inline notation that reproduces Francesco's hand-coloring
system as data. Every compiled `summary` / `damage` / `note` field in the
character and session files is a **markup string**: plain text with inline
semantic tags. The renderer (T06) turns tags into colored chips, badges, and
popover links; the parser must **never crash** on bad input — anything it can't
parse renders as plain text.

This document is the contract between the compiler (which writes markup) and the
renderer (which reads it). It owns the final tag set.

---

## 1. Lexical rules

A markup string is a sequence of **text**, **markdown emphasis**, and **tags**.

### Tags

```
tag        = "{" name [ ":" args ] "}"
name       = 1*( "a".."z" )                 ; lowercase ASCII only
args       = arg *( "|" arg )               ; one or more, pipe-separated
arg        = *( any char except "|" "}" or an escape )
```

- `name` is always lowercase ASCII letters. `{A:STR}` is **not** a tag (unknown
  form → rendered literally).
- Arguments are positional and separated by `|`. Their meaning is per-tag
  (below). Arguments are **plain text** — they do not contain nested tags.
- Whitespace inside args is significant and preserved.

### Escaping

The four metacharacters are escaped with a backslash. Everywhere else a
backslash is a literal backslash.

| Sequence | Renders as                                                          |
| -------- | ------------------------------------------------------------------- |
| `\{`     | `{`                                                                 |
| `\}`     | `}`                                                                 |
| `\|`     | `\|` (a literal pipe — only needs escaping **inside** a tag's args) |
| `\\`     | `\`                                                                 |

Outside a tag, `{` and `}` that don't form a valid tag are literal, so escaping
is only strictly required when the text would otherwise look like a tag. Inside
args, escape `|` and `}` to include them literally.

### Markdown passthrough

`**bold**` and `*italic*` pass through to the renderer as usual. Emphasis **may
wrap tags** — `**{a:STR}**` is a bold STR chip. That is the only nesting allowed.

---

## 2. Parsing & error behavior

The parser tokenizes into a flat list of nodes: `text`, `emphasis`, and `tag`.

- **Unknown tag name** (`{foo:bar}`) → emit a `text` node containing the literal
  source `{foo:bar}`. Never throw.
- **Wrong arity** (too few/many args for a known tag) → the renderer falls back
  to a best-effort plain rendering of the tag's args, or the literal source if
  that's not meaningful. Never throw.
- **Unterminated tag** (`{a:STR` with no closing brace) → literal text.
- **Tags are atomic:** a `{` inside a tag before its `}` ends the tag scan; tags
  cannot contain tags. `{ref:x|{a:STR}}` is not nesting — the inner `{` is part
  of the arg text.

The guarantee: **any string is valid markup.** Worst case it renders as the
text the compiler typed. This is what lets unknown/future tags degrade safely.

---

## 3. Tag reference

Colors referenced below are the canon (scope §2.1), defined as tokens in T05.
Ability colors: **STR** red · **DEX** blue · **CON** orange · **INT** purple ·
**WIS** green · **CHA** magenta.

| Tag                               | Args                        | Meaning            | Rendering intent                                                        |
| --------------------------------- | --------------------------- | ------------------ | ----------------------------------------------------------------------- |
| `{a:ABIL}`                        | ability (`STR`…`CHA`)       | ability reference  | ability-colored chip with the abbreviation                              |
| `{save:ABIL}` / `{save:ABIL\|DC}` | ability, optional DC        | saving throw       | ability-colored save badge; shows "DC N" when DC given                  |
| `{dmg:TYPE\|DICE}`                | damage type, dice/amount    | typed damage       | damage-type-colored dice (e.g. psychic → pink)                          |
| `{dice:DICE}`                     | dice/amount                 | untyped dice       | neutral dice chip (no damage color)                                     |
| `{adv}`                           | —                           | advantage ("EDGE") | green badge                                                             |
| `{dis}`                           | —                           | disadvantage       | orange/red badge                                                        |
| `{cond:NAME}`                     | condition name              | condition          | condition chip; tappable → popover if a `library` extract for it exists |
| `{recover:WHEN}`                  | `SR` \| `LR` \| `Dawn`      | recovery trigger   | sun (SR) / moon (LR) / sunrise (Dawn) icon                              |
| `{lvl:N}`                         | integer                     | unlock-level badge | numbered badge (matches Build-view graying)                             |
| `{ref:KEY}` / `{ref:KEY\|LABEL}`  | library key, optional label | library link       | tappable term → popover; shows LABEL if given, else the key             |
| `{note:TEXT}`                     | free text                   | inline aside       | muted/gray inline note                                                  |
| `**…**`, `*…*`                    | —                           | markdown           | bold / italic passthrough                                               |

### Notes on specific tags

- **`{a:ABIL}`** — only the six ability abbreviations are valid; anything else is
  an unknown-argument fallback (render the arg as plain text).
- **`{save:ABIL|DC}`** — DC is optional because riders sometimes reference "a
  {a:CHA} save" without restating the number. When present, DC is shown as a
  badge in the ability's color.
- **`{dmg:TYPE|DICE}`** — recognized types (colored): acid, bludgeoning, cold,
  fire, force, lightning, necrotic, piercing, poison, psychic, radiant,
  slashing, thunder. An unrecognized type still renders (neutral dice color +
  the type label) — this keeps homebrew damage types working.
- **`{dice:DICE}`** — for dice with no damage type: healing, a subtracted die,
  Bardic Inspiration, a scaling rider. Distinct from `{dmg:}` so the renderer
  doesn't miscolor it.
- **`{recover:WHEN}`** — the icon vocabulary is intentionally tiny (SR/LR/Dawn);
  structured recovery for _resources_ lives in `RecoverModel` in the schema, not
  in markup. Use `{recover:}` only for inline prose ("regain 1 use on a
  {recover:SR}").
- **`{ref:KEY|LABEL}`** — KEY is a kebab-case `library` key. The validator (T04)
  checks it resolves; the renderer shows LABEL (or KEY) and opens the popover.
- **`{note:TEXT}`** — a deliberate, minimal catch-all for the gray parentheticals
  the paper sheet uses ("(once per turn)"). Justified because these appear all
  over the reference sheets and deserve consistent muted styling rather than
  being baked into prose. Kept text-only (no nested tags) to stay atomic.

---

## 4. Worked examples

All examples use invented or Vice-homebrew content — no WotC text.

**Mind Sliver-style cantrip line** (structure only; wording invented):

```
{dmg:psychic|1d6} & {save:INT|13} — on a fail, target subtracts {dice:1d4} from its next save before the end of its next turn
```

**Mixed-recovery resource** (Shigen's Second Wind, §2.3):

```
Regain {dice:1d10+5} HP. **2** uses per {recover:LR}; regain **1** use on a {recover:SR}.
```

**Attack rider** (Repelling Blast-style push):

```
{note:once per turn} push the target 10 ft on hit
```

**Reflavored feature with a library link** (Vice homebrew "Fey Pact"):

```
{ref:fey-pact|Fey Pact}: {adv} on {save:WIS} against being {cond:charmed}
```

**Future content in Build view**:

```
{lvl:6} gain a second {ref:eldritch-invocation|invocation} slot
```

**Escaping** — a literal brace and pipe in prose:

```
Choose one option \{A \| B\}, then mark it.
```

renders as: Choose one option {A | B}, then mark it.

---

## 5. Encoding the Vice main page from this doc

Acceptance requires that a reader can hand-encode the Vice main sheet from this
grammar alone. The mapping:

- **Ability row** → `{a:STR}` … `{a:CHA}` chips; the modifier is a plain number
  next to the chip (compiled in `abilities`, not markup).
- **Saves / skills** → the colored value comes from `stats`; markup is only for
  inline riders like "{adv} vs {cond:frightened}".
- **Attacks** → `damage` uses `{dmg:TYPE|DICE}`; on-hit extras are `riders[]`
  whose `summary` uses `{note:…}`, `{dice:…}`, `{cond:…}`.
- **Features / invocations** → each `summary` is markup; limited uses show
  `{recover:SR|LR}` inline and are backed by a `resources[]` entry.
- **Spell lines** → school/level/flags come from `Spell` fields; the `summary`
  is markup; the origin dot comes from `Spell.origin`, not markup.
- **Full text** → any `{ref:…}` opens the embedded `library` extract.
