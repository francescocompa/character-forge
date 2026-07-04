Sheet-markup renderer for the inline grammar (`{a:CHA}`, `{dmg:…}`, `{ref:…}`, …).

- **Parser** — shared, lives in `schema/markup.ts` (landed with the validator,
  T04) so `app/` and `pipeline/validate/` use one implementation. `parseMarkup`
  never throws; it returns nodes + diagnostics.
- **Renderer** — `SheetMarkup.tsx`: `<SheetMarkup source={string} onRef={…} />`
  maps parser nodes to the T05 chips. `{ref:KEY}` fires `onRef(KEY)` (T07 wires
  the popover). A known tag whose args can't form a valid chip degrades to plain
  text — visibly flagged in dev, bare in prod (grammar §2).
