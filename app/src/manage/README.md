# Character library + management (T16)

How characters get into the app and live there. Files are imported (copied into
IndexedDB), grouped into variant cards (D12), opened into the tab shell, and
managed (rename / delete / about). The app never edits a character file's
content — this module only stores copies and a little management metadata.

## Flow

```
picker / drag-drop
   → useCharacterImport ─ parseImport ─ version-gate → validateImport (ajv + referential)
                                      └ classifyImport(existing) → new | variant | refresh
   → CharacterLibraryProvider.saveCharacter → state/characterDb (IndexedDB)
CharacterList (cards / empty state)  ── select ──▶ CharacterWorkspace ─▶ AppShell
```

## Pieces

- **`state/characterDb.ts`** (in `state/`, beside the session store) — the
  `characters` IndexedDB store: put/list/get/delete, alias, and session wipe on
  delete. Shares one DB with the session layer (`state/db.ts`, v2).
- **`importCharacter.ts`** — pure parse + version-gate + classify. No IndexedDB,
  no DOM, so the whole decision path is unit-tested.
- **`validateImport.ts`** — layers 1–2 of the validator (ajv schema + referential
  integrity), reused from `@character-forge/validate` so the app and the pipeline
  CLI can't drift. Markup-lint and sanity (compile-time layers) are skipped.
- **`useCharacterImport.ts`** — the import state machine shared by the picker and
  the drop zone; owns the dialog (invalid / too-new / refresh).
- **`CharacterLibraryProvider.tsx`** — the library store: grouped list, current
  selection, and every mutation. Auto-opens when exactly one character exists.
- **`CharacterList` / `CharacterCard` / `ImportDialog` / `ManageDialog`** — the
  list screen, cards, and the two dialogs. `CharacterWorkspace` picks the active
  variant and renders `AppShell` with the Back + variant-switcher chrome.
- **`group.ts` / `about.ts`** — variant grouping (D12) and the "about this file"
  facts (format version, compile date, content counts).

## Invariants

- **Read-only base file.** The character file is stored verbatim; only the
  session layer mutates (scope §4). Refresh replaces the build; the session
  survives (reconciled by the T14 engine on next open).
- **Variants share a `characterId`.** One card, independent session state per
  variant (the switcher remounts the shell so stores never bleed).
- **A too-new `formatVersion` is refused**, not silently dropped (schema README
  versioning policy).
