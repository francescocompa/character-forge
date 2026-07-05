# `pipeline/` — the character-forge pipeline

Claude-facing docs that turn a build idea into a validated, self-contained
character file, plus the validator CLI. The app never runs any of this — the
pipeline is how a `*.character.json` gets _made_; the app only _reads_ the result
(schema/README "the two files, and who writes them").

## The three steps

```
   interview            compile             validate
      │                    │                    │
  conversation        chassis doc          character.json
  ──────────▶  *.chassis.md  ──────────▶  *.character.json  ──────────▶  ✓ / errors
  (interview.md)        (compile.md)        (validate/, T04)
```

1. **Interview** — [`interview.md`](interview.md). A guided conversation
   co-writes a **chassis document** ([`chassis-format.md`](chassis-format.md)):
   the human-readable build spec (concept, chassis, level-by-level progression,
   pools, equipment, companions, variants). Produces `Characters/<name>.chassis.md`.
   _Never writes a character file._ Optional — a person can hand-write the chassis
   doc instead, following the format.

2. **Compile** — [`compile.md`](compile.md) (T19). A Claude Code session reads the
   chassis doc + the knowledge base and emits `Characters/<name>.character.json`:
   compiled numbers, embedded pools, and a `library` extract for **every** `ref`.
   This is the only step that reads WotC content, and its output is self-contained
   so the app needs the KB never again.

3. **Validate** — [`validate/`](validate/) (T04). The Node CLI runs schema
   validation (ajv) + referential integrity (every `ref` resolves, ids line up) +
   markup lint. Green means the app can import it.

## When to use kb-audit

[`kb-audit.md`](kb-audit.md) (T20) is the **maintenance** path, not part of making
a new character. Run it when the knowledge base is updated (an errata, a
corrected extract) to re-check and refresh the embedded `library` extracts in
already-compiled characters — a diff/refresh, so a fixed rule propagates without a
full recompile.

Two pieces work together:

- **`kb-diff`** — the script (`character-forge-kb-diff`, in
  [`validate/`](validate/)). Mechanical: for every non-Homebrew `library` extract
  it locates the current KB entry via `MANIFEST.json` and reports
  `unchanged` / `changed` (with a unified diff) / `missing-from-kb` /
  `not-in-manifest` / `homebrew-skipped`. Makes no edits. `--json` for tooling.
- **`kb-audit.md`** — the recipe. A Claude Code session runs kb-diff over
  `Characters/`, triages each `changed` (cosmetic → refresh; substantive rules
  change → spell out the consequence and ask Francesco), flags the missing/
  unfindable ones without ever deleting an extract, then refreshes the approved
  entries, fixes the summaries/stats derived from them, re-runs the validator,
  and records an audit note.

## The documents

| Doc                                      | Step      | What it governs                                            |
| ---------------------------------------- | --------- | ---------------------------------------------------------- |
| [`interview.md`](interview.md)           | interview | How Claude co-writes a chassis doc with the player.        |
| [`chassis-format.md`](chassis-format.md) | interview | The `*.chassis.md` format + the field→schema mapping.      |
| [`compile.md`](compile.md)               | compile   | Chassis doc → `character.json` recipe (T19).               |
| [`kb-audit.md`](kb-audit.md)             | maintain  | Refresh embedded extracts when the KB changes (T20).       |
| [`validate/`](validate/)                 | validate  | The schema + integrity + markup CLI (T04).                 |
| [`examples/`](examples/)                 | reference | A worked chassis doc from a dry-run interview (synthetic). |

The contract these all code against is [`schema/`](../schema/README.md) — where a
pipeline doc and the schema disagree, the schema wins.

## Guardrails (scope §4)

- **No WotC text in this repo, ever.** Chassis docs name official entries; only
  compile embeds extracts, and only into files that live in the local data home —
  never here. The repo's only character data is the synthetic fixture.
- **The app never writes character files.** Only compile + kb-audit do.
- **Ambiguity goes to Francesco** — pipeline docs mark it (`TBD`/`FLAG`) rather
  than guessing.
