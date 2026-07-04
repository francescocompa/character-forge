# Session state engine (T14)

The play-time layer: persistent, per-character-variant tracker + loadout
state, backed by IndexedDB (`idb`). The app never writes the character file
(scope §4) — this is the only thing that mutates.

- **`sessionEngine.ts`** — the pure, synchronous mutation core: every
  `SessionStore` method, rest semantics (`applyShortRest`/`applyLongRest`
  interpret each resource's/slot pool's/hit-dice group's own `recover`
  structure — no hardcoded 5e formulas), undo (bounded history), and
  `reconcileSessionState` (drops orphaned refs on a re-imported file, seeds
  new pools/consumables, logs what it dropped).
- **`db.ts`** — thin `idb` wrapper: one object store keyed by
  `characterId::variantLabel::characterFormatVersion` (a format-version bump
  starts a fresh session, D12).
- **`IndexedDbSessionStore.ts`** — wraps the engine with persistence. Returns
  synchronously with a fresh in-memory seed (first paint never blocks on
  IndexedDB, and it degrades gracefully where IndexedDB doesn't exist — SSR,
  privacy mode, this project's Node-environment unit tests), then hydrates
  from any saved session in the background. Writes are debounced (400ms) and
  flushed on `visibilitychange`/`pagehide`.

`maxHpOverride` (T03 review item F2): the compiled `stats.maxHp` may be an
average or a rolled value; the session layer lets the player record a
rolled/hand-edited override without touching the character file. When set,
`applyLongRest`'s "HP to max" uses it instead of the compiled value.

`app/src/session/SessionProvider.tsx` is the only consumer — views bind to
the shared `SessionStore` interface (`schema/types.ts`) and never import
from here directly.
