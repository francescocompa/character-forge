import { describe, expect, it } from 'vitest'
import { isFuture, isVisible, visibleItems } from './visibility'

describe('isVisible', () => {
  it('Level view shows only content at or below the current level', () => {
    expect(isVisible(2, 3, 'level')).toBe(true)
    expect(isVisible(3, 3, 'level')).toBe(true)
    expect(isVisible(5, 3, 'level')).toBe(false)
  })

  it('Build view shows everything', () => {
    expect(isVisible(5, 3, 'build')).toBe(true)
    expect(isVisible(99, 1, 'build')).toBe(true)
  })

  it('treats a missing unlockLevel as always-visible base content', () => {
    expect(isVisible(undefined, 1, 'level')).toBe(true)
    expect(isVisible(undefined, 1, 'build')).toBe(true)
  })
})

describe('isFuture', () => {
  it('is true only above the current level, regardless of mode', () => {
    expect(isFuture(5, 3)).toBe(true)
    expect(isFuture(3, 3)).toBe(false)
    expect(isFuture(undefined, 3)).toBe(false)
  })
})

describe('visibleItems', () => {
  const items = [{ unlockLevel: 1 }, { unlockLevel: 3 }, { unlockLevel: 5 }, {}]
  it('filters by mode', () => {
    expect(visibleItems(items, 3, 'level')).toHaveLength(3)
    expect(visibleItems(items, 3, 'build')).toHaveLength(4)
  })
})
