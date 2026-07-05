import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import synthetic from '../../../fixtures/synthetic.character.json'
import syntheticVariant from '../../../fixtures/synthetic-variant.character.json'
import { groupCharacters } from './group'
import { keyForCharacter, type StoredCharacter } from '../state/characterDb'

function stored(character: CharacterFile, alias?: string): StoredCharacter {
  return {
    key: keyForCharacter(character),
    characterId: character.meta.characterId,
    variantLabel: character.meta.variantLabel,
    alias,
    importedAt: '2026-07-05T00:00:00.000Z',
    character,
  }
}

const base = synthetic as unknown as CharacterFile
const variant = syntheticVariant as unknown as CharacterFile

describe('groupCharacters', () => {
  it('groups variants sharing a characterId into one card (D12)', () => {
    const groups = groupCharacters([stored(base), stored(variant)])
    expect(groups).toHaveLength(1)
    expect(groups[0].characterId).toBe('fenn-larkspur')
    expect(groups[0].variants.map((v) => v.variantLabel).sort()).toEqual(['Battle Mage', 'Duelist'])
  })

  it('keeps distinct characters as separate cards, sorted by display name', () => {
    const other: CharacterFile = {
      ...base,
      meta: { ...base.meta, characterId: 'aria-vale', name: 'Aria Vale', variantLabel: undefined },
    }
    const groups = groupCharacters([stored(base), stored(other)])
    expect(groups.map((g) => g.characterId)).toEqual(['aria-vale', 'fenn-larkspur'])
  })

  it('lifts a variant alias to the group display name', () => {
    const groups = groupCharacters([stored(base, 'My Fenn'), stored(variant)])
    expect(groups[0].name).toBe('My Fenn')
    expect(groups[0].alias).toBe('My Fenn')
  })
})
