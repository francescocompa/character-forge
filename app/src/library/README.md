# library — popover / extract system (T07)

The digital replacement for Francesco's pasted-screenshot rules pages (scope
§2.5, §7). Any reference on the sheet opens the full compiled text embedded in
the character file's `library` map — an anchored popover on desktop, a bottom
sheet on phones.

## Pieces

- **`LibraryProvider` / `useLibrary`** (`LibraryProvider.tsx`) — holds the
  current character's `library` and owns the single open surface. A view wires
  `SheetMarkup`'s `onRef` to `openRef` once at its root; every `{ref:…}` on the
  sheet then opens its extract. `openRef(refKey, anchorEl?)` — when no element is
  passed (the `SheetMarkup.onRef` path gives only a key), it anchors to the
  focused trigger and restores focus there on close. Refs tapped *inside* an open
  extract push onto a stack so **‹ Back** returns to the previous entry.
- **`LibrarySurface`** (`LibrarySurface.tsx`) — the one open surface. ≥ 768 px:
  anchored popover (`placePopover`), max-width ~28 rem, body scrolls. < 768 px:
  bottom sheet, dismissable by scrim tap or downward drag, safe-area aware.
  Portalled to `<body>` (no layout shift), focus-trapped, Esc/scrim close, ARIA
  dialog semantics. A missing ref shows an inline note instead of crashing.
- **`ExtractMarkdown`** (`ExtractMarkdown.tsx` + `markdown.ts`) — a tiny GFM
  block parser (headings, paragraphs, lists, fenced code, tables) whose inline
  runs are rendered by `SheetMarkup` (T06), so `**bold**`/`*italic*`/`{ref:…}`
  and colored chips work inside extract text too.
- **`placePopover`** (`position.ts`) — pure desktop placement geometry
  (below/above flip, viewport clamp, scroll cap). Unit-tested without a DOM.

## Testing

`markdown.ts`, `position.ts`, and `ExtractMarkdown` have unit tests (node env,
no jsdom — same pattern as T06). The interactive surface (focus trap, drag,
responsive) is a view: exercised manually on the T05 gallery's "Library
popovers (T07)" section, verified via preview tooling at both widths.
