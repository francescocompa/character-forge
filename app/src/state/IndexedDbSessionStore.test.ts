import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import fixture from '../../../fixtures/synthetic.character.json'
import { createIndexedDbSessionStore } from './IndexedDbSessionStore'
import { loadSession, saveSession, sessionKey } from './db'

const baseCharacter = fixture as unknown as CharacterFile

/** A character with a unique id per test, so each test gets its own IndexedDB key. */
function characterFor(testId: string): CharacterFile {
  return { ...baseCharacter, meta: { ...baseCharacter.meta, characterId: `${baseCharacter.meta.characterId}-${testId}` } }
}

async function flushDebounce() {
  // The store debounces writes by 400ms; advance real timers past that,
  // then let the resulting saveSession() promise settle.
  await new Promise((r) => setTimeout(r, 450))
}

describe('createIndexedDbSessionStore — round trip via fake-indexeddb', () => {
  it('returns a working store synchronously (fresh seed), then resolves ready', async () => {
    const s = createIndexedDbSessionStore(characterFor('fresh'))
    expect(s.getState().trackers.hp).toEqual({ current: 24, temp: 0 })
    await s.ready
    // No prior session existed — hydration is a no-op, seed stands.
    expect(s.getState().trackers.hp).toEqual({ current: 24, temp: 0 })
  })

  it('persists a mutation to IndexedDB and a fresh store picks it up on next load', async () => {
    const character = characterFor('persist')
    const s1 = createIndexedDbSessionStore(character)
    await s1.ready
    s1.tick('resource', 'second-wind')
    s1.setCurrentHp(10)
    await flushDebounce()

    const key = sessionKey(character.meta.characterId, character.meta.variantLabel, character.formatVersion)
    const saved = await loadSession(key)
    expect(saved?.trackers.resources?.['second-wind']?.used).toBe(1)
    expect(saved?.trackers.hp?.current).toBe(10)

    const s2 = createIndexedDbSessionStore(character)
    await s2.ready
    expect(s2.getState().trackers.resources?.['second-wind']?.used).toBe(1)
    expect(s2.getState().trackers.hp?.current).toBe(10)
  })

  it('reconciles orphaned refs against the current file on hydration', async () => {
    const character = characterFor('reconcile')
    const key = sessionKey(character.meta.characterId, character.meta.variantLabel, character.formatVersion)
    const s1 = createIndexedDbSessionStore(character)
    await s1.ready
    s1.tick('resource', 'second-wind')
    await flushDebounce()

    // Simulate a stale saved session with a resource the file no longer has.
    const saved = await loadSession(key)
    await saveSession(key, {
      ...saved!,
      trackers: { ...saved!.trackers, resources: { ...saved!.trackers.resources, ghost: { used: 3 } } },
    })

    const s2 = createIndexedDbSessionStore(character)
    await s2.ready
    expect(s2.getState().trackers.resources?.ghost).toBeUndefined()
    expect(s2.getState().trackers.resources?.['second-wind']?.used).toBe(1)
  })

  it('two variants of the same character persist under independent keys', async () => {
    const character = characterFor('variants')
    const variant: CharacterFile = { ...character, meta: { ...character.meta, variantLabel: 'Skirmisher' } }
    const sA = createIndexedDbSessionStore(character)
    const sB = createIndexedDbSessionStore(variant)
    await Promise.all([sA.ready, sB.ready])
    sA.setCurrentHp(5)
    sB.setCurrentHp(15)
    await flushDebounce()
    expect(sA.getState().trackers.hp?.current).toBe(5)
    expect(sB.getState().trackers.hp?.current).toBe(15)
  })
})
