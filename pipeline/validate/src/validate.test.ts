import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { validateFile } from './validate.ts'

function fixture(relPath: string): string {
  return fileURLToPath(new URL(`../../../fixtures/${relPath}`, import.meta.url))
}

describe('validateFile — synthetic fixtures', () => {
  it('passes the synthetic fixture with no errors', () => {
    const result = validateFile(fixture('synthetic.character.json'))
    expect(result.errorCount).toBe(0)
    expect(result.valid).toBe(true)
  })

  it('flags the intentionally unreferenced library entry as a warning, not an error', () => {
    const result = validateFile(fixture('synthetic.character.json'))
    const unused = result.issues.find((i) => i.message.includes('ashwalker-lore'))
    expect(unused).toBeDefined()
    expect(unused?.severity).toBe('warning')
  })

  it('passes the synthetic variant fixture with no errors', () => {
    const result = validateFile(fixture('synthetic-variant.character.json'))
    expect(result.errorCount).toBe(0)
    expect(result.valid).toBe(true)
  })

  it('groups the base and variant fixtures under the same characterId with different variantLabels', () => {
    const base = JSON.parse(readFileSync(fixture('synthetic.character.json'), 'utf8'))
    const variant = JSON.parse(readFileSync(fixture('synthetic-variant.character.json'), 'utf8'))
    expect(base.meta.characterId).toBe(variant.meta.characterId)
    expect(base.meta.variantLabel).not.toBe(variant.meta.variantLabel)
  })
})

describe('validateFile — invalid fixtures (one broken layer each)', () => {
  it('fails invalid-schema.character.json with a schema-layer error naming the path', () => {
    const result = validateFile(fixture('invalid/invalid-schema.character.json'))
    expect(result.valid).toBe(false)
    const err = result.issues.find((i) => i.severity === 'error')
    expect(err?.layer).toBe('schema')
    expect(err?.path).toBe('formatVersion')
  })

  it('fails invalid-referential.character.json with a referential-layer error naming the path', () => {
    const result = validateFile(fixture('invalid/invalid-referential.character.json'))
    expect(result.valid).toBe(false)
    const errors = result.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].layer).toBe('referential')
    expect(errors[0].path).toBe('chassis.background.ref')
    expect(errors[0].message).toMatch(/does not resolve/)
  })

  it('fails invalid-markup.character.json with a markup-layer error naming the path', () => {
    const result = validateFile(fixture('invalid/invalid-markup.character.json'))
    expect(result.valid).toBe(false)
    const errors = result.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].layer).toBe('markup')
    expect(errors[0].path).toBe('progression[0].summary')
    expect(errors[0].message).toMatch(/invalid ability/)
  })

  it('fails invalid-sanity.character.json with a sanity-layer error naming the path', () => {
    const result = validateFile(fixture('invalid/invalid-sanity.character.json'))
    expect(result.valid).toBe(false)
    const errors = result.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0].layer).toBe('sanity')
    expect(errors[0].path).toBe('currentLevel')
    expect(errors[0].message).toMatch(/exceeds the sum/)
  })
})

describe('validateFile — file-level edge cases', () => {
  it('rejects a file whose name is neither *.character.json nor *.session.json', () => {
    const result = validateFile('fixtures/synthetic.txt')
    expect(result.valid).toBe(false)
    expect(result.issues[0].message).toMatch(/unrecognized file kind/)
  })
})
