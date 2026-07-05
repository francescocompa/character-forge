import { describe, expect, it } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import synthetic from '../../../fixtures/synthetic.character.json'
import syntheticVariant from '../../../fixtures/synthetic-variant.character.json'
import invalidReferential from '../../../fixtures/invalid/invalid-referential.character.json'
import invalidSchema from '../../../fixtures/invalid/invalid-schema.character.json'
import { classifyImport, parseImport } from './importCharacter'
import { keyForCharacter, type StoredCharacter } from '../state/characterDb'

const base = synthetic as unknown as CharacterFile
const variant = syntheticVariant as unknown as CharacterFile

function stored(character: CharacterFile): StoredCharacter {
  return {
    key: keyForCharacter(character),
    characterId: character.meta.characterId,
    variantLabel: character.meta.variantLabel,
    importedAt: '2026-07-05T00:00:00.000Z',
    character,
  }
}

describe('parseImport', () => {
  it('accepts a valid synthetic character', () => {
    const result = parseImport(JSON.stringify(synthetic))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') expect(result.character.meta.characterId).toBe('fenn-larkspur')
  })

  it('reports a readable error for non-JSON', () => {
    const result = parseImport('{ not json')
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      expect(result.issues[0].message).toMatch(/not valid json/i)
    }
  })

  it('flags a referential break with the offending path', () => {
    const result = parseImport(JSON.stringify(invalidReferential))
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') {
      const err = result.issues.find((i) => i.severity === 'error')
      expect(err?.path).toContain('chassis.background.ref')
    }
  })

  it('refuses a newer formatVersion before validating', () => {
    // invalid-schema.character.json carries formatVersion: 2 (> supported 1).
    const result = parseImport(JSON.stringify(invalidSchema))
    expect(result.status).toBe('unsupported-version')
    if (result.status === 'unsupported-version') {
      expect(result.version).toBe(2)
      expect(result.supported).toBe(1)
    }
  })

  it('rejects a schema violation (missing required region)', () => {
    const withoutLibrary: Record<string, unknown> = { ...base }
    delete withoutLibrary.library
    const result = parseImport(JSON.stringify(withoutLibrary))
    expect(result.status).toBe('invalid')
  })
})

describe('classifyImport', () => {
  it('classifies a first-seen character as new', () => {
    expect(classifyImport(base, [])).toEqual({ kind: 'new' })
  })

  it('classifies a same-id, different-label file as a variant', () => {
    const result = classifyImport(variant, [stored(base)])
    expect(result).toEqual({ kind: 'variant', characterId: 'fenn-larkspur' })
  })

  it('classifies a same-id, same-label file as a refresh with a level diff', () => {
    const leveled: CharacterFile = { ...base, currentLevel: base.currentLevel + 1 }
    const result = classifyImport(leveled, [stored(base)])
    expect(result.kind).toBe('refresh')
    if (result.kind === 'refresh') {
      expect(result.change.levelFrom).toBe(base.currentLevel)
      expect(result.change.levelTo).toBe(base.currentLevel + 1)
    }
  })
})
