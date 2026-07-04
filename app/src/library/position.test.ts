import { describe, expect, it } from 'vitest'
import { placePopover } from './position'

const viewport = { width: 1200, height: 800 }

describe('placePopover', () => {
  it('sits below the anchor when there is room', () => {
    const p = placePopover(
      { top: 100, left: 200, width: 80, height: 24 },
      { width: 300, height: 200 },
      viewport,
    )
    expect(p.side).toBe('below')
    expect(p.top).toBe(100 + 24 + 8)
    expect(p.left).toBe(200)
  })

  it('flips above when the popover does not fit below', () => {
    const p = placePopover(
      { top: 700, left: 100, width: 80, height: 24 },
      { width: 300, height: 200 },
      viewport,
    )
    expect(p.side).toBe('above')
    // Bottom of the popover ends a gap above the trigger top.
    expect(p.top + Math.min(200, p.maxHeight)).toBeLessThanOrEqual(700 - 8)
  })

  it('clamps the left edge into the viewport', () => {
    const p = placePopover(
      { top: 100, left: 1150, width: 40, height: 24 },
      { width: 448, height: 200 },
      viewport,
    )
    expect(p.left).toBe(1200 - 448 - 8)
    expect(p.left).toBeGreaterThanOrEqual(8)
  })

  it('caps maxHeight to the available space in the chosen direction', () => {
    const p = placePopover(
      { top: 380, left: 10, width: 40, height: 24 },
      { width: 300, height: 1000 },
      viewport,
    )
    // Space below = 800 - (380+24) - 8 - 8 = 380.
    expect(p.side).toBe('below')
    expect(p.maxHeight).toBe(380)
  })

  it('never returns a negative maxHeight', () => {
    const p = placePopover(
      { top: 799, left: 10, width: 40, height: 24 },
      { width: 300, height: 200 },
      { width: 400, height: 800 },
    )
    expect(p.maxHeight).toBeGreaterThanOrEqual(0)
  })
})
