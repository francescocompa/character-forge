# kb-audit — refresh embedded extracts when the KB changes

**Model:** sonnet is fine; use opus if a substantive rules change needs judgement.
**Reads:** `PROJECT-SCOPE.md` §3 (D5) · `schema/README.md` (library shape) ·
[`compile.md`](compile.md) (how extracts got there) · this file.
**Writes:** only `*.character.json` files in the local data home (`Characters/`),
never anything in this repo.

---

## Why this exists

A compiled character embeds the **full official text** of every entry it
references, so the app is self-contained and needs the knowledge base never
again (decision D5). The cost of that guarantee: when the KB is re-compiled —
errata, a corrected extract, a new printing — those embedded copies can go
**stale**. kb-audit is the maintenance path that finds the drift mechanically
and refreshes it deliberately. It is **not** part of making a new character
(that's [`compile.md`](compile.md)); run it only after the KB itself changes.

The split of labour:

- **`kb-diff`** (the script, `pipeline/validate/`) finds drift — it is
  mechanical and makes no edits.
- **This recipe** applies judgement — you read each diff, decide whether it's
  cosmetic or a real rules change, and only then touch a file.

---

## Step 0 — inputs

| Input           | Where                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| Character files | `~/Documents/D&D/D&D Character Builder/Characters/*.character.json`                           |
| Updated KB      | `~/Documents/D&D/D&D Character Builder/dnd-5e-knowledge-base/` (the dir with `MANIFEST.json`) |
| kb-diff         | `npx character-forge-kb-diff <file> --kb <kb-path>` (from the repo root after `npm install`)  |
| validator (T04) | `npx character-forge-validate <file>`                                                         |

Never copy a character file or KB content **into** this repo — they hold WotC
text (scope §4). Work on the files in place in the data home.

If `npx character-forge-kb-diff` fails with a registry 404, the workspace bin
isn't linked yet (it happens when `node_modules` predates this tool): run
`npm rebuild @character-forge/validate` from the repo root and retry.

---

## Step 1 — run kb-diff on every character

```sh
for f in ~/Documents/D&D/D\&D\ Character\ Builder/Characters/*.character.json; do
  npx character-forge-kb-diff "$f" \
    --kb ~/Documents/D&D/D\&D\ Character\ Builder/dnd-5e-knowledge-base
done
```

Use `--json` when you want to drive the triage programmatically. Each entry
comes back as one of five statuses:

| Status             | Meaning                                                                                         | What you do                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `unchanged`        | Embedded text matches the KB (whitespace-normalised).                                           | Nothing.                                                                     |
| `changed`          | Embedded text differs. A unified diff is shown (`--- embedded` = the file, `+++ kb` = current). | **Triage — step 2.**                                                         |
| `missing-from-kb`  | The manifest points at a file, but no top-level `## <name>` block is there.                     | **Flag — step 3.** Never delete the extract.                                 |
| `not-in-manifest`  | No KB entry shares this name + edition.                                                         | **Review by hand — step 3.** Usually a class/subclass feature or a reflavor. |
| `homebrew-skipped` | A Homebrew entry. It has no KB source.                                                          | Nothing — never touch Homebrew (scope §4).                                   |

Exit code is `0` when nothing needs action (no `changed`, no `missing-from-kb`),
`1` otherwise. `not-in-manifest` alone does **not** fail the run — those entries
are expected (see step 3), not deletions.

---

## Step 2 — triage each `changed` entry

Read the diff and put it in one of two buckets.

### Formatting-only → auto-apply

The mechanical body is identical; the delta is whitespace, punctuation,
markdown emphasis, a reordered but equivalent clause, or **boilerplate the
compiler intentionally drops** (an invocation's `Prerequisite:` header line, a
trailing `*Type: …*` annotation, a lore tail trimmed for size per
[`compile.md`](compile.md) §13). No number, die, range, save, duration,
condition, or action-economy word moved.

→ Refresh the extract to the KB text (respecting compile.md's trimming rules for
pool-option lore), or leave the intentional trim in place and note it. No
summary or computed stat changes.

### Substantive rules change → present to Francesco

Any mechanical difference: a damage die, a save ability or DC, a range, a
duration, an action cost, a recharge rule, a numeric threshold, a condition, a
prerequisite that gates a build choice. **Do not auto-apply.** Surface it with:

1. **What changed**, in one line — "Hex's per-turn damage die changed from 1d6
   to 1d4," not just "Hex changed."
2. **The blast radius in this file** — which _summaries_, _attacks_, _stats_,
   _resources_, or _pool defaults_ now assert something the refreshed extract no
   longer supports. A `library` extract is verbatim text, but the compressed
   summaries and computed numbers elsewhere were derived from it (compile.md §4)
   — those are what actually break.
3. **A recommendation**, then use `AskUserQuestion` if available. Ambiguity goes
   to Francesco (scope §4).

---

## Step 3 — `missing-from-kb` and `not-in-manifest`

Both mean kb-diff couldn't confirm the extract against a KB block. **Neither
deletes anything.**

- **`not-in-manifest`** is expected and usually benign. The KB indexes
  top-level entries (spells, feats, species, backgrounds, optional features,
  whole subclasses); it does **not** index individual **class/subclass features**
  (Pact Magic, Magical Cunning, a subclass's level-2 feature) — those live
  inside composite class files under `#`/`###` headings — nor **reflavored
  display names** (a subclass embedded as "Great Old One" when the KB calls it
  "Warlock: Great Old One Patron"). kb-diff can't reach these mechanically.
  Check the handful by hand against the class file if the KB update touched that
  class; otherwise leave them.

- **`missing-from-kb`** is stronger: the manifest still lists the entry, but its
  block isn't a top-level `## ` heading in the named file. Two innocent causes —
  a **class overview** (the class's own entry is a `#`-level heading in a
  composite file) and a heading renamed upstream — versus one real cause: the
  entry was **removed** from the KB. Read the named file to tell which. If it's
  genuinely gone, **flag it** (the character embeds text that no longer has a
  source) and ask Francesco how to proceed; never silently drop the extract.

---

## Step 4 — apply, re-validate, and record

For every file you edited:

1. **Refresh** the approved `library` extract(s) to the current KB text
   (verbatim; trimming only per compile.md §13).
2. **Fix the blast radius** — update any summary, attack line, computed stat,
   resource max, or pool default that the change invalidated (step 2). This is
   the real work; the extract swap is the easy part.
3. **Re-run the validator** (T04): `npx character-forge-validate <file>` must be
   green before you're done.
4. **Write an audit note** into the character's compile-notes
   (`Characters/<name>.compile-notes.md`): the KB version audited, the date,
   which entries changed, and what you did (auto-applied / refreshed /
   Francesco-approved rules change / flagged). This is the paper trail for the
   next audit.

Leave `unchanged`, `homebrew-skipped`, and reviewed-benign `not-in-manifest`
entries untouched.

---

## Guardrails

- **Never touch Homebrew** entries (scope §4) — kb-diff already skips them.
- **Never delete an extract** on a `missing-from-kb`/`not-in-manifest` — flag it.
- **The refresh is verbatim in, judged out** — copy KB text exactly; the only
  edits you _author_ are to the derived summaries/stats, and only to match the
  refreshed mechanics.
- **No WotC text enters this repo.** All reads and writes are in the local data
  home; this recipe and any PR describe diffs in the abstract, never paste them.
