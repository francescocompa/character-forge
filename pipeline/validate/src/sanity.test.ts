import { describe, it, expect } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { checkSanity } from './sanity.ts'

function minimalFile(overrides: Partial<CharacterFile> = {}): CharacterFile {
  return {
    formatVersion: 1,
    meta: {
      name: 'Test',
      characterId: 'test',
      createdAt: '2026-07-04T00:00:00Z',
      updatedAt: '2026-07-04T00:00:00Z',
    },
    chassis: {
      species: { ref: 'species' },
      background: { ref: 'background' },
      classes: [{ ref: 'fighter', levels: 3, hitDie: 'd10', classOrder: 1 }],
    },
    abilities: {
      STR: { base: 10, final: 10, modifier: 0 },
      DEX: { base: 10, final: 10, modifier: 0 },
      CON: { base: 10, final: 10, modifier: 0 },
      INT: { base: 10, final: 10, modifier: 0 },
      WIS: { base: 10, final: 10, modifier: 0 },
      CHA: { base: 10, final: 10, modifier: 0 },
    },
    stats: {
      ac: { value: 10 },
      maxHp: { value: 10 },
      initiative: { value: 0 },
      proficiencyBonus: 2,
      speeds: [{ type: 'walk', value: 30 }],
      saves: [],
      skills: [],
    },
    currentLevel: 3,
    library: {},
    ...overrides,
  }
}

describe('checkSanity', () => {
  it('is clean for a well-formed minimal file', () => {
    expect(checkSanity(minimalFile(), 100)).toEqual([])
  })

  it('flags currentLevel exceeding the sum of class levels', () => {
    const issues = checkSanity(minimalFile({ currentLevel: 5 }), 100)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'sanity', severity: 'error', path: 'currentLevel' }),
    )
  })

  it('flags a spell swapOutLevel that is not greater than its unlockLevel', () => {
    const file = minimalFile({
      spellcasting: {
        sources: [{ id: 'warlock', name: 'Warlock', ability: 'CHA', saveDc: 13, attackMod: 5 }],
        slotPools: [],
        spells: [{ name: 'Hex', level: 1, origins: ['warlock'], unlockLevel: 3, swapOutLevel: 3 }],
      },
    })
    expect(checkSanity(file, 100)).toContainEqual(
      expect.objectContaining({
        layer: 'sanity',
        severity: 'error',
        path: 'spellcasting.spells[0].swapOutLevel',
      }),
    )
  })

  it('warns when a swap atLevel disagrees with the spells it links', () => {
    const file = minimalFile({
      spellcasting: {
        sources: [{ id: 'warlock', name: 'Warlock', ability: 'CHA', saveDc: 13, attackMod: 5 }],
        slotPools: [],
        spells: [
          { name: 'Hex', level: 1, origins: ['warlock'], unlockLevel: 1, swapOutLevel: 5 },
          { name: 'Bane', level: 1, origins: ['warlock'], unlockLevel: 5 },
        ],
        swaps: [{ atLevel: 4, out: 'Hex', in: 'Bane' }],
      },
    })
    const issues = checkSanity(file, 100)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'sanity',
        severity: 'warning',
        path: 'spellcasting.swaps[0].atLevel',
      }),
    )
  })

  it('flags duplicate resource ids', () => {
    const file = minimalFile({
      resources: [
        { id: 'dup', name: 'A', max: 1, recover: [{ on: 'long', amount: 'all' }], unlockLevel: 1 },
        { id: 'dup', name: 'B', max: 1, recover: [{ on: 'long', amount: 'all' }], unlockLevel: 1 },
      ],
    })
    const issues = checkSanity(file, 100)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'sanity', severity: 'error', path: 'resources[1].id' }),
    )
  })

  it('flags a pool default not among its options', () => {
    const file = minimalFile({
      pools: {
        prepared: {
          kind: 'preparedSpells',
          name: 'Prepared',
          chooseCount: 2,
          options: [{ ref: 'spell-a', name: 'Spell A' }],
          defaults: ['spell-b'],
        },
      },
    })
    const issues = checkSanity(file, 100)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'sanity',
        severity: 'error',
        path: 'pools.prepared.defaults[0]',
      }),
    )
  })

  it('flags a pool with more defaults than chooseCount', () => {
    const file = minimalFile({
      pools: {
        prepared: {
          kind: 'preparedSpells',
          name: 'Prepared',
          chooseCount: 1,
          options: [
            { ref: 'spell-a', name: 'Spell A' },
            { ref: 'spell-b', name: 'Spell B' },
          ],
          defaults: ['spell-a', 'spell-b'],
        },
      },
    })
    const issues = checkSanity(file, 100)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'sanity',
        severity: 'error',
        path: 'pools.prepared.defaults',
      }),
    )
  })

  it('flags an oversized portrait', () => {
    const oversized = 'x'.repeat(200 * 1024 + 1)
    const file = minimalFile({ meta: { ...minimalFile().meta, portrait: oversized } })
    const issues = checkSanity(file, 100)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'sanity', path: 'meta.portrait' }),
    )
  })

  it('errors when the raw file exceeds the 5 MB budget', () => {
    const issues = checkSanity(minimalFile(), 6 * 1024 * 1024)
    expect(issues).toContainEqual(expect.objectContaining({ severity: 'error', path: '(file)' }))
  })

  it('warns (not errors) between 4 MB and 5 MB', () => {
    const issues = checkSanity(minimalFile(), 4.5 * 1024 * 1024)
    expect(issues).toContainEqual(expect.objectContaining({ severity: 'warning', path: '(file)' }))
  })
})
