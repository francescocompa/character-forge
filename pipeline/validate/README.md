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
│   └── types.ts           ValidationIssue / ValidationResult
└── *.test.ts              vitest suite (also under src/)
```
