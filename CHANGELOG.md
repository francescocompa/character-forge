# Changelog

Newest batch first. One entry per task/batch; reference the planning task ids
(T01–T22) where applicable.

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
