# character-forge

![CI](https://github.com/francescocompa/character-forge/actions/workflows/ci.yml/badge.svg)

A local-first, installable **D&D 5e character sheet** (PWA). Claude Code compiles a
human-written build document into a validated, self-contained character file; this app
renders it on desktop and phone, tracks play-time state (HP, slots, uses, prepared
spells, loadouts), and pops the full official rules text for anything on the sheet. The
app has **no rules engine** — every derived number is computed at compile time.

**No game content lives in this repo.** It is public: WotC-copyrighted text and real
character files (which embed rules extracts) are git-ignored by design and kept in a
local Google Drive-synced data folder. Tests use an invented synthetic fixture only.

- **Docs** — [`docs/PROJECT-SCOPE.md`](docs/PROJECT-SCOPE.md): the source of truth for
  scope, architecture, and decisions.
- **Pipeline** — [`pipeline/`](pipeline/): the Claude-facing compile/audit docs and the
  validator CLI.

## Develop

```sh
npm install
npm run dev       # app dev server
npm run verify    # typecheck + lint + test
npm run build     # production build (deployed to GitHub Pages)
```
