import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import synthetic from '../../../fixtures/synthetic.character.json'
import syntheticVariant from '../../../fixtures/synthetic-variant.character.json'
import {
  deleteStoredCharacter,
  getStoredCharacter,
  keyForCharacter,
  listStoredCharacters,
  putStoredCharacter,
  setCharacterAlias,
} from './characterDb'
import { loadSession, saveSession, sessionKey } from './db'
import type { SessionFile } from '@character-forge/schema/types.ts'

const base = synthetic as unknown as CharacterFile
const variant = syntheticVariant as unknown as CharacterFile

/** A character with a unique id per test, so each test gets its own IndexedDB keys. */
function withId(character: CharacterFile, testId: string): CharacterFile {
  return {
    ...character,
    meta: { ...character.meta, characterId: `${character.meta.characterId}-${testId}` },
  }
}

function sessionFor(character: CharacterFile): SessionFile {
  return {
    formatVersion: 1,
    characterId: character.meta.characterId,
    variantLabel: character.meta.variantLabel,
    characterFormatVersion: character.formatVersion,
    updatedAt: new Date().toISOString(),
    trackers: { hp: { current: 5, temp: 0 } },
    loadout: {},
  }
}

describe('characterDb', () => {
  it('stores and reads back a character', async () => {
    const c = withId(base, 'roundtrip')
    await putStoredCharacter(c)
    const record = await getStoredCharacter(keyForCharacter(c))
    expect(record?.character.meta.characterId).toBe(c.meta.characterId)
    expect(record?.importedAt).toBeTruthy()
  })

  it('refresh preserves alias and original importedAt', async () => {
    const c = withId(base, 'refresh')
    await putStoredCharacter(c)
    await setCharacterAlias(c.meta.characterId, 'Nickname')
    const before = await getStoredCharacter(keyForCharacter(c))

    const leveled: CharacterFile = { ...c, currentLevel: c.currentLevel + 1 }
    await putStoredCharacter(leveled)
    const after = await getStoredCharacter(keyForCharacter(c))

    expect(after?.alias).toBe('Nickname')
    expect(after?.importedAt).toBe(before?.importedAt)
    expect(after?.character.currentLevel).toBe(c.currentLevel + 1)
  })

  it('groups variants and deletes one without touching the other', async () => {
    const a = withId(base, 'pair') // variant "Battle Mage"
    const b = withId(variant, 'pair') // variant "Duelist", same id
    await putStoredCharacter(a)
    await putStoredCharacter(b)

    const mine = (await listStoredCharacters()).filter((r) => r.characterId === a.meta.characterId)
    expect(mine).toHaveLength(2)

    await deleteStoredCharacter(keyForCharacter(a))
    const left = (await listStoredCharacters()).filter((r) => r.characterId === a.meta.characterId)
    expect(left).toHaveLength(1)
    expect(left[0].variantLabel).toBe('Duelist')
  })

  it('deleting a character wipes its session state', async () => {
    const c = withId(base, 'wipe')
    await putStoredCharacter(c)
    const key = sessionKey(c.meta.characterId, c.meta.variantLabel, c.formatVersion)
    await saveSession(key, sessionFor(c))
    expect(await loadSession(key)).toBeTruthy()

    await deleteStoredCharacter(keyForCharacter(c))
    expect(await loadSession(key)).toBeUndefined()
  })

  it('setCharacterAlias applies to every variant of the character', async () => {
    const a = withId(base, 'alias')
    const b = withId(variant, 'alias')
    await putStoredCharacter(a)
    await putStoredCharacter(b)
    await setCharacterAlias(a.meta.characterId, 'Shared')

    const mine = (await listStoredCharacters()).filter((r) => r.characterId === a.meta.characterId)
    expect(mine.every((r) => r.alias === 'Shared')).toBe(true)

    await setCharacterAlias(a.meta.characterId, '')
    const cleared = (await listStoredCharacters()).filter(
      (r) => r.characterId === a.meta.characterId,
    )
    expect(cleared.every((r) => r.alias === undefined)).toBe(true)
  })
})
