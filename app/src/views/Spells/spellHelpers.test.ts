import { describe, expect, it } from 'vitest'
import type { Pool, Spell, SpellSource, SpellSwap } from '@character-forge/schema/types.ts'
import {
  groupPoolOptionsByLevel,
  groupSpellsByLevel,
  isSpellShown,
  levelLabel,
  sortedSwaps,
  sourceIndex,
} from './spellHelpers'

function spell(
  overrides: Partial<Spell> & Pick<Spell, 'name' | 'level' | 'origins' | 'unlockLevel'>,
): Spell {
  return { role: 'known', ...overrides }
}

describe('levelLabel', () => {
  it('cantrips first, ordinal suffixes, unmatched options as Other', () => {
    expect(levelLabel(0)).toBe('Cantrips')
    expect(levelLabel(1)).toBe('1st level')
    expect(levelLabel(2)).toBe('2nd level')
    expect(levelLabel(3)).toBe('3rd level')
    expect(levelLabel(4)).toBe('4th level')
    expect(levelLabel(undefined)).toBe('Other')
  })
})

describe('groupSpellsByLevel', () => {
  it('orders cantrips before leveled spells, ascending', () => {
    const spells = [
      spell({ name: 'Fireball', level: 3, origins: ['a'], unlockLevel: 1 }),
      spell({ name: 'Fire Bolt', level: 0, origins: ['a'], unlockLevel: 1 }),
      spell({ name: 'Magic Missile', level: 1, origins: ['a'], unlockLevel: 1 }),
    ]
    const groups = groupSpellsByLevel(spells)
    expect(groups.map((g) => g.level)).toEqual([0, 1, 3])
    expect(groups[0].items.map((s) => s.name)).toEqual(['Fire Bolt'])
  })
})

describe('groupPoolOptionsByLevel', () => {
  const pool: Pool = {
    kind: 'preparedSpells',
    name: 'Test pool',
    chooseCount: 2,
    options: [
      { ref: 'a', name: 'Known One' },
      { ref: 'b', name: 'Known Two' },
      { ref: 'c', name: 'Mystery Option' },
    ],
  }
  const spells: Spell[] = [
    spell({ name: 'Known One', ref: 'a', level: 0, origins: ['x'], unlockLevel: 1 }),
    spell({ name: 'Known Two', ref: 'b', level: 1, origins: ['x'], unlockLevel: 1 }),
  ]

  it('groups matched options by the known spell level and buckets the rest under Other', () => {
    const groups = groupPoolOptionsByLevel(pool, spells)
    expect(groups.map((g) => g.level)).toEqual([0, 1, undefined])
    expect(groups[2].items.map((o) => o.name)).toEqual(['Mystery Option'])
  })
})

describe('sourceIndex', () => {
  it('maps each source id to its declaration-order palette index', () => {
    const sources: SpellSource[] = [
      { id: 'wizard', name: 'Wizard', ability: 'INT', saveDc: 13, attackMod: 5 },
      { id: 'ember-charm', name: 'Compass', ability: 'INT', saveDc: 14, attackMod: 6 },
    ]
    const idx = sourceIndex(sources)
    expect(idx.get('wizard')).toBe(0)
    expect(idx.get('ember-charm')).toBe(1)
  })
})

describe('isSpellShown', () => {
  it('always shows non-prepared roles once unlocked', () => {
    const s = spell({
      name: 'Innate Spark',
      level: 0,
      role: 'innate',
      origins: ['wizard'],
      unlockLevel: 1,
    })
    expect(isSpellShown(s, 3, 'level', [])).toBe(true)
  })

  it('always shows a prepared spell with no poolRef (schema: absent poolRef = always available)', () => {
    const s = spell({
      name: 'Loose Prep',
      level: 1,
      role: 'prepared',
      origins: ['wizard'],
      unlockLevel: 1,
    })
    expect(isSpellShown(s, 3, 'level', [])).toBe(true)
  })

  it('hides a pool-gated prepared spell dropped from the current selection', () => {
    const s = spell({
      name: 'Ashen Bolt',
      ref: 'ashen-bolt',
      level: 1,
      role: 'prepared',
      poolRef: 'wizard-prepared',
      origins: ['wizard'],
      unlockLevel: 1,
    })
    expect(isSpellShown(s, 3, 'level', [])).toBe(false)
    expect(isSpellShown(s, 3, 'level', ['ashen-bolt'])).toBe(true)
  })

  it('previews a not-yet-unlocked pool-gated spell in Build view regardless of selection', () => {
    const s = spell({
      name: 'Future Prep',
      ref: 'future-prep',
      level: 2,
      role: 'prepared',
      poolRef: 'wizard-prepared',
      origins: ['wizard'],
      unlockLevel: 9,
    })
    expect(isSpellShown(s, 3, 'build', [])).toBe(true)
    expect(isSpellShown(s, 3, 'level', [])).toBe(false)
  })
})

describe('sortedSwaps', () => {
  it('orders by atLevel ascending', () => {
    const swaps: SpellSwap[] = [
      { atLevel: 9, out: 'B', in: 'C' },
      { atLevel: 5, out: 'A', in: 'B' },
    ]
    expect(sortedSwaps(swaps).map((s) => s.atLevel)).toEqual([5, 9])
  })

  it('returns an empty array when there are no swaps', () => {
    expect(sortedSwaps(undefined)).toEqual([])
  })
})
