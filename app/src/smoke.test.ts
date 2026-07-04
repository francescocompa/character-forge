import { describe, expect, it } from 'vitest'
import { FORMAT_VERSION } from './formatVersion'

describe('scaffold smoke test', () => {
  it('exposes the character file format version', () => {
    expect(FORMAT_VERSION).toBe(1)
  })
})
