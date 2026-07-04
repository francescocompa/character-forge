/*
 * Desktop popover placement (T07). Pure geometry so it can be unit-tested
 * without a DOM: given the trigger's rect, the popover's measured size, and the
 * viewport, decide whether to sit below or above the trigger, how much height
 * the body may use (the rest scrolls internally), and a left edge clamped to
 * the viewport. The mobile bottom sheet needs none of this.
 */

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Viewport {
  width: number
  height: number
}

export interface PlacementOptions {
  /** Space between trigger and popover. */
  gap?: number
  /** Minimum distance kept from every viewport edge. */
  margin?: number
}

export interface Placement {
  top: number
  left: number
  /** Cap for the popover so it never exceeds the space in its chosen direction. */
  maxHeight: number
  side: 'above' | 'below'
}

export function placePopover(
  anchor: Rect,
  popover: Size,
  viewport: Viewport,
  options: PlacementOptions = {},
): Placement {
  const gap = options.gap ?? 8
  const margin = options.margin ?? 8

  const spaceBelow = viewport.height - (anchor.top + anchor.height) - gap - margin
  const spaceAbove = anchor.top - gap - margin

  // Prefer below; flip up only when it doesn't fit below but fits (better) above.
  const below = spaceBelow >= popover.height || spaceBelow >= spaceAbove
  const maxHeight = Math.max(0, below ? spaceBelow : spaceAbove)

  const top = below
    ? anchor.top + anchor.height + gap
    : Math.max(margin, anchor.top - gap - Math.min(popover.height, maxHeight))

  const maxLeft = Math.max(margin, viewport.width - popover.width - margin)
  const left = Math.min(Math.max(anchor.left, margin), maxLeft)

  return { top, left, maxHeight, side: below ? 'below' : 'above' }
}
