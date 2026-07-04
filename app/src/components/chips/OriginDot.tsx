import { originColor } from './colorMaps'
import type { CSSVarStyle } from './css-vars'

export interface OriginDotProps {
  /** The class/feat/item that granted this item, e.g. "Celestial Warlock". */
  label: string
  /**
   * Which origin-accent slot to use. Assignment (which source gets which
   * color) is the caller's job — this component just renders slot `index`.
   */
  index: number
  /**
   * A second origin's palette index. Two `Spell.origins` entries = a
   * dual-source spell (schema/README.md §"spellcasting"; e.g. Vice's Hex) —
   * renders one two-tone, bordered dot instead of a solid one.
   */
  secondaryIndex?: number
}

/** Multiclass spell/feature source tag (scope §2.8) — Shigen's colored-dot convention. */
export function OriginDot({ label, index, secondaryIndex }: OriginDotProps) {
  if (secondaryIndex !== undefined) {
    const style: CSSVarStyle = {
      '--chip-fg': originColor(index),
      '--chip-fg-2': originColor(secondaryIndex),
    }
    return (
      <span
        className="origin-dot origin-dot--dual"
        style={style}
        role="img"
        aria-label={label}
        title={label}
      />
    )
  }
  const style: CSSVarStyle = { '--chip-fg': originColor(index) }
  return (
    <span className="origin-dot" style={style} role="img" aria-label={label} title={label} />
  )
}
