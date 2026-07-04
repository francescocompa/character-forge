import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../../fixtures/synthetic.character.json'
import {
  attunedItems,
  classifyItem,
  effectiveState,
  groupItems,
  pushDragLiftLb,
  totalCarriedWeightLb,
} from './equipmentHelpers'

const character = fixture as unknown as CharacterFile
const items = character.equipment!.items!
const library = character.library

describe('classifyItem / groupItems — synthetic fixture', () => {
  it('sorts a mundane item with no special library type into gear', () => {
    const longsword = items.find((i) => i.id === 'longsword-item')!
    expect(classifyItem(longsword, library)).toBe('gear')
  })

  it('sorts a component-typed item into components', () => {
    const incense = items.find((i) => i.id === 'incense-item')!
    expect(classifyItem(incense, library)).toBe('components')
  })

  it('sorts a magic-item-typed item into magicItems', () => {
    const compass = items.find((i) => i.id === 'ember-compass-item')!
    expect(classifyItem(compass, library)).toBe('magicItems')
  })

  it('groups the whole fixture list into the three sections', () => {
    const groups = groupItems(items, library)
    expect(groups.gear.map((i) => i.id)).toEqual([
      'longsword-item',
      'shortbow-item',
      'studded-leather-item',
      'dagger-item',
    ])
    expect(groups.components.map((i) => i.id)).toEqual(['incense-item'])
    expect(groups.magicItems.map((i) => i.id)).toEqual([
      'ember-compass-item',
      'ashwalker-cloak-item',
    ])
  })
})

describe('effectiveState — session override vs compiled default (D13)', () => {
  it('falls back to the file default when there is no session override', () => {
    const dagger = items.find((i) => i.id === 'dagger-item')!
    expect(effectiveState(dagger, undefined)).toEqual({ equipped: false, carried: true })
  })

  it('prefers the session override over the file default', () => {
    const dagger = items.find((i) => i.id === 'dagger-item')!
    expect(effectiveState(dagger, { equipped: true })).toEqual({ equipped: true, carried: true })
  })
})

describe('totalCarriedWeightLb', () => {
  it('sums weight * quantity for currently-carried items only', () => {
    // 3 + 2 + 13 + 1 (dagger) + 0 (incense x3) + 1 (compass) = 20; the level-5
    // Ashwalker Cloak is not yet owned at currentLevel 3, so its 1 lb is excluded.
    expect(totalCarriedWeightLb(items, character.currentLevel, undefined)).toBe(20)
  })

  it('excludes an item whose session override sets carried: false', () => {
    const overrides = { 'longsword-item': { carried: false } }
    expect(totalCarriedWeightLb(items, character.currentLevel, overrides)).toBe(17)
  })

  it('excludes an item not yet unlocked even if Build view would preview it', () => {
    const withFuture = totalCarriedWeightLb(items, 5, undefined)
    expect(withFuture).toBe(21) // +1 lb once the Ashwalker Cloak is owned at level 5
  })
})

describe('pushDragLiftLb', () => {
  it('is twice carrying capacity (SRD baseline)', () => {
    expect(pushDragLiftLb(150)).toBe(300)
  })
})

describe('attunedItems', () => {
  it('returns only items flagged attuned in the compiled file', () => {
    expect(attunedItems(items).map((i) => i.id)).toEqual(['ember-compass-item'])
  })
})
