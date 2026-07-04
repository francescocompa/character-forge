import { describe, it, expect } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { checkReferentialIntegrity } from './referential.ts'

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
    library: {
      species: {
        name: 'Species',
        edition: 'Homebrew',
        type: 'species',
        source: 'Homebrew',
        markdown: 'x',
      },
      background: {
        name: 'Background',
        edition: 'Homebrew',
        type: 'background',
        source: 'Homebrew',
        markdown: 'x',
      },
      fighter: {
        name: 'Fighter',
        edition: 'Homebrew',
        type: 'class',
        source: 'Homebrew',
        markdown: 'x',
      },
    },
    ...overrides,
  }
}

describe('checkReferentialIntegrity', () => {
  it('is clean when every ref resolves and every entry is used', () => {
    expect(checkReferentialIntegrity(minimalFile())).toEqual([])
  })

  it('flags a spell origin that does not match any spellcasting source id', () => {
    const file = minimalFile({
      spellcasting: {
        sources: [{ id: 'wizard', name: 'Wizard', ability: 'INT', saveDc: 13, attackMod: 5 }],
        slotPools: [],
        spells: [{ name: 'Test Spell', level: 1, origin: 'sorcerer', unlockLevel: 1 }],
      },
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'referential', path: 'spellcasting.spells[0].origin' }),
    )
  })

  it('flags a spell poolRef that does not match any pools key', () => {
    const file = minimalFile({
      spellcasting: {
        sources: [{ id: 'wizard', name: 'Wizard', ability: 'INT', saveDc: 13, attackMod: 5 }],
        slotPools: [],
        spells: [
          {
            name: 'Test Spell',
            level: 1,
            origin: 'wizard',
            poolRef: 'missing-pool',
            unlockLevel: 1,
          },
        ],
      },
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'referential', path: 'spellcasting.spells[0].poolRef' }),
    )
  })

  it('flags a limitedUseRef that does not match any resources[].id', () => {
    const file = minimalFile({
      progression: [
        { name: 'Feature', kind: 'feature', limitedUseRef: 'missing-resource', unlockLevel: 1 },
      ],
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'referential', path: 'progression[0].limitedUseRef' }),
    )
  })

  it('flags a consumableRef that does not match any consumables[].id', () => {
    const file = minimalFile({
      attacks: [{ name: 'Shortbow', consumableRef: 'missing-consumable' }],
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'referential', path: 'attacks[0].consumableRef' }),
    )
  })

  it('flags a ref that does not resolve to library, naming the JSON path', () => {
    const file = minimalFile({
      chassis: { ...minimalFile().chassis, background: { ref: 'ghost' } },
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'referential',
        severity: 'error',
        path: 'chassis.background.ref',
      }),
    )
  })

  it('warns (not errors) on an unreferenced library entry', () => {
    const file = minimalFile({
      library: {
        ...minimalFile().library,
        unused: {
          name: 'Unused',
          edition: 'Homebrew',
          type: 'feat',
          source: 'Homebrew',
          markdown: 'x',
        },
      },
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'referential',
        severity: 'warning',
        path: 'library.unused',
      }),
    )
  })

  it('flags a library entry with empty markdown', () => {
    const file = minimalFile({
      library: {
        ...minimalFile().library,
        empty: {
          name: 'Empty',
          edition: 'Homebrew',
          type: 'feat',
          source: 'Homebrew',
          markdown: '   ',
        },
      },
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({
        layer: 'referential',
        severity: 'error',
        path: 'library.empty.markdown',
      }),
    )
  })

  it('resolves a {ref:} tag embedded in a markup summary', () => {
    const file = minimalFile({
      progression: [
        {
          name: 'Feature',
          kind: 'feature',
          summary: '{ref:fighter|Fighter} feature',
          unlockLevel: 1,
        },
      ],
    })
    expect(checkReferentialIntegrity(file)).toEqual([])
  })

  it('flags a {ref:} tag embedded in markup that does not resolve', () => {
    const file = minimalFile({
      progression: [
        { name: 'Feature', kind: 'feature', summary: '{ref:ghost|Ghost}', unlockLevel: 1 },
      ],
    })
    const issues = checkReferentialIntegrity(file)
    expect(issues).toContainEqual(
      expect.objectContaining({ layer: 'referential', path: 'progression[0].summary' }),
    )
  })
})
