# Design tokens

Dark-first (D10) CSS custom properties in `tokens.css`, plus the chip/badge
component family in `../components/chips/` that consumes them. This is the
visual foundation the markup renderer (T06) and every view (T08+) build on.
Rationale and canon source: `planning/PROJECT-SCOPE.md` §2 (design canon) and
§9 (tech choices).

## Where to tweak what

Everything lives in `tokens.css`, grouped with comments:

| Group            | Tokens                                                 | Used by                                                  |
| ---------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Surfaces & ink   | `--surface-*`, `--ink-*`                               | app shell, chip text/backgrounds                         |
| Ability colors   | `--ability-{str,dex,con,int,wis,cha}` (+ `-soft`)      | `AbilityChip`, `SaveDCBadge`                             |
| Damage types     | `--dmg-*` (13 types + `--dmg-neutral`)                 | `DamageText`                                             |
| Semantic         | `--adv`, `--dis`, `--recover-{lr,sr,dawn}`, `--cond-*` | `AdvBadge`/`DisBadge`, `RecoverIcon`, `ConditionChip`    |
| Structural       | `--lvl-badge-*`, `--future-*`                          | `LevelBadge`, `FutureWrap` (Build view, D14)             |
| Origin dots      | `--origin-1`…`--origin-6`                              | `OriginDot` (multiclass spell/feature source tags, §2.8) |
| Focus ring       | `--focus-ring*`                                        | any tappable chip                                        |
| Spacing / radius | `--space-*`, `--radius-*`                              | all chip layout                                          |
| Typography       | `--font-*`, chrome vs. content roles                   | `SchoolLabel` (chrome), chip values (content)            |

To change a color: edit its `hsl()` value in `tokens.css` and reload the
gallery (see below). Nothing else needs to change — components only ever
reference `var(--token-name)`.

## Canon rationale

- Ability colors, damage-type colors, advantage/disadvantage colors, and the
  recovery icon vocabulary all trace to the audited paper sheets (scope §2.1,
  §2.3). Values here are the same hue _anchors_, lifted in lightness / tamed
  in saturation for dark surfaces — not a literal copy of the paper's colors,
  which sit on white.
- Poison and INT are both "purple" per the paper canon; kept as distinct
  hues (`--dmg-poison` leans magenta-violet vs. `--ability-int`'s cooler
  violet) so the two chip families stay legible side by side.
- The unlock-level badge inverts the paper's black square to a light
  square + dark numeral on dark surfaces — same information, adapted contrast.
- Typography deliberately avoids a handwriting font: the "chrome" (printed
  template labels) vs. "content" (filled values) distinction on paper is
  reproduced with weight/size/color, not a costume font (scope §9).
- Light mode is backlog (scope §13): tokens are structured as one flat
  palette layer today; a future light theme remaps these values without
  touching component CSS.

## Gallery (dev-only iteration surface)

`Gallery.tsx` renders every chip in every variant plus a token swatch board.
It's wired into `App.tsx` behind `import.meta.env.DEV`, so `npm run dev` opens
straight into it. This is Francesco's in-browser tuning surface (decision D7)
— tweak `tokens.css`, save, and the gallery hot-reloads.

## Components

`../components/chips/`: `AbilityChip`, `SaveDCBadge`, `DamageText` (covers all
three damage tags — `{dmg:}`, `{dice:}`, `{dtype:}` — via optional `type`/`dice`
props), `AdvBadge`/`DisBadge`, `ConditionChip`, `RecoverIcon`, `LevelBadge`,
`OriginDot`, `SchoolLabel`, `RefLink`, `FutureWrap`. All are typed,
presentational, state-free — T06 maps markup-grammar tags onto these; views
compose them directly for anything that isn't inline markup (e.g. the
identity strip's ability row).

Tappable chips (`ConditionChip`/`RefLink` with `onClick`, and anything using
`.chip--tappable`) get a ≥44px hit area via a pseudo-element, independent of
their visual size, and a focus-visible ring from `--focus-ring`.
