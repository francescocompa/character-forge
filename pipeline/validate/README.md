# `pipeline/validate/` — the validator CLI (T04)

The pipeline's safety net. Claude compiles character files (`pipeline/compile.md`,
T19); this CLI proves a file is sound before the app ever sees it. It runs
locally at the end of the compile recipe and in CI against the synthetic
fixtures (`fixtures/`).

## Usage

```sh
npx character-forge-validate <file.character.json|file.session.json> [--json]
```

Run from the repo root after `npm install` (npm workspaces symlinks the `bin`
entry into `node_modules/.bin`). There's no build step — the entry point is
TypeScript run directly via `tsx`'s `--import` loader (see the shebang in
`src/cli.ts`); `npm run validate -- <file>` from this package does the same
thing.

Exit code `0` if there are no **errors** (warnings are allowed and printed but
don't fail the run); `1` otherwise.

## The four layers

1. **Schema** — ajv (draft 2020-12) against `character.schema.json` or
   `session.schema.json` (chosen by filename suffix).
2. **Referential integrity** — every `ref` (structural fields _and_ `{ref:KEY}`
   tags embedded in markup) resolves to a `library` entry; every `library`
   entry is used at least once (warning if not); library entries have
   non-empty markdown and a legal `edition`; internal id cross-references
   resolve (`Spell.origin` → a `spellcasting.sources[].id`, `poolRef` → a
   `pools` key, `limitedUseRef` → a `resources[].id`, `consumableRef` → a
   `consumables[].id`, slot-pool/pool `sourceId` → a source id).
3. **Markup lint** — every string field in the file is run through the shared
   sheet-markup parser (`@character-forge/schema/markup.ts`, introduced by
   this task since it landed before the renderer, T06). Unknown tag names are
   warnings; wrong arity, invalid argument values (e.g. `{a:XXX}`, a
   non-numeric `{lvl:}`), and unterminated tags are errors. Every string field
   is linted, not an explicit allowlist — the grammar guarantees any string is
   safe to parse, so this can't produce false crashes and automatically covers
   new markup fields as the schema grows.
4. **Sanity** — `currentLevel` ≤ the sum of `chassis.classes[].levels`;
   `spellcasting.sources[]`/`slotPools[]`, `resources[]`, `consumables[]`,
   `equipment.items[]`, and `companions[]` each have unique `id`s; pool
   `defaults` are a subset of that pool's `options` and don't exceed
   `chooseCount`; portraits (`meta.portrait`, `companions[].portrait`) are
   ≤ 200 KB; the file itself is ≤ 5 MB (warning above 4 MB).

Layers 2–4 only run against **character** files (a session file has no
`library` of its own to check referential integrity or sanity against); a
session file gets schema validation plus a markup lint over its `additions[]`
summaries.

If layer 1 fails so badly that `chassis`/`meta`/`library` aren't even present
as objects, layers 2–4 are skipped for that run (there's nothing safe to walk)
and only the schema errors are reported.

## `--json` output shape

```ts
interface ValidationResult {
  file: string
  kind: 'character' | 'session'
  valid: boolean // true iff errorCount === 0; warnings don't affect this
  errorCount: number
  warningCount: number
  issues: Array<{
    layer: 'schema' | 'referential' | 'markup' | 'sanity'
    severity: 'error' | 'warning'
    /** Dot/bracket path into the file, e.g. "spellcasting.spells[0].origin". "(root)"/"(file)" for whole-file issues. */
    path: string
    message: string
  }>
}
```

`--json` prints exactly this object (via `JSON.stringify(result, null, 2)`);
the compile recipe (T19) parses it to decide whether to retry the compile.
Without `--json`, the same data prints as human-readable lines grouped in file
order, one per issue, followed by an error/warning count and PASS/FAIL.

## Fixtures

`fixtures/synthetic.character.json` + `fixtures/synthetic-variant.character.json`
are invented homebrew content exercising every layer's happy path (see
`fixtures/README.md` for the checklist). `fixtures/invalid/*.character.json`
each break exactly one layer, used by `src/validate.test.ts` to assert the
right error class and JSON path.

To check a real character file locally (never commit one — see the repo's
`.gitignore` and `docs/PROJECT-SCOPE.md` §4):

```sh
npx character-forge-validate ~/Documents/D&D/D&D\ Character\ Builder/Characters/vice.character.json
```

## `kb-diff` — the second bin (T20)

The same workspace ships `character-forge-kb-diff`, the drift detector behind
[`pipeline/kb-audit.md`](../kb-audit.md). It is _not_ a validation layer — it
compares a compiled character's embedded `library` extracts against the current
knowledge base and reports what has gone stale since compile time (decision D5).

```sh
npx character-forge-kb-diff <file.character.json> --kb <kb-path> [--json]
```

`--kb` is the directory holding `MANIFEST.json`. For every non-Homebrew extract
it finds the manifest entry by `name` + `edition` (`source` then `type` break
ties), reads the `## <name>` block out of the entry's file, whitespace-normalises
both sides, and classifies:

| Status             | Meaning                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `unchanged`        | Embedded text matches the KB block.                                           |
| `changed`          | Text differs — a unified diff (`--- embedded` → `+++ kb`, context 3) is set.  |
| `missing-from-kb`  | The manifest points at a file with no top-level `## <name>` block.            |
| `not-in-manifest`  | No KB entry shares this name + edition (class-feature sub-extract, reflavor). |
| `homebrew-skipped` | Homebrew entry — never checked (no KB source; scope §4).                      |

Exit code `0` when nothing needs action (no `changed`, no `missing-from-kb`);
`1` otherwise. `not-in-manifest` alone does not fail the run — those entries are
expected. Homebrew is skipped by construction, so kb-diff never reads or emits
Homebrew text.

### `kb-diff --json` output shape

```ts
interface KbDiffReport {
  file: string
  kbPath: string
  counts: Record<KbDiffStatus, number> // one key per status above
  clean: boolean // true iff counts.changed === 0 && counts['missing-from-kb'] === 0
  entries: Array<{
    key: string // the library key
    name: string
    edition: string
    type: string
    source: string
    status: KbDiffStatus
    file?: string // KB file the entry resolved to (when a manifest match was found)
    diff?: string // unified diff, present only when status === 'changed'
    note?: string // disambiguation / why-unfindable explanation
  }>
}
```

`--json` prints exactly this via `JSON.stringify(report, null, 2)`; the
kb-audit recipe reads it to drive triage. Unit tests
(`src/kbDiff.test.ts`) exercise all five statuses against
`fixtures/synthetic.character.json` + `fixtures/fake-kb/` (invented content, a
seeded `changed` case and a seeded `missing` case).

## Layout

```
pipeline/validate/
├── src/
│   ├── cli.ts           argument parsing, human/--json output, exit code
│   ├── validate.ts       orchestrates the four layers, file I/O, kind detection
│   ├── ajv.ts             compiles both JSON Schemas once
│   ├── referential.ts     layer 2
│   ├── markupLint.ts      layer 3
│   ├── sanity.ts          layer 4
│   ├── walk.ts            generic string-leaf walker shared by layers 2 and 3
│   ├── paths.ts           ajv-error → friendly-path formatting
│   ├── kbDiff.ts          kb-diff core: manifest lookup, block extract, diff (T20)
│   ├── kbDiff.cli.ts      kb-diff bin: args, human/--json output, exit code (T20)
│   └── types.ts           ValidationIssue / ValidationResult
└── *.test.ts              vitest suite (also under src/)
```
