import { describe, expect, it } from 'vitest'
import type { CharacterFile, SessionFile } from '@character-forge/schema/types.ts'
import { serializeSession, sessionFileName, sessionFileStem } from './sessionExport'

const meta = { meta: { name: 'Fenn Larkspur' } } as Pick<CharacterFile, 'meta'>

describe('sessionFileName', () => {
  it('slugifies the character name into a <name>.session.json', () => {
    expect(sessionFileName(meta)).toBe('fenn-larkspur.session.json')
  })

  it('strips punctuation and collapses whitespace', () => {
    expect(sessionFileStem({ meta: { name: "  Vice: the Warlock!  " } } as Pick<CharacterFile, 'meta'>)).toBe(
      'vice-the-warlock',
    )
  })

  it('falls back to "character" for an empty name', () => {
    expect(sessionFileStem({ meta: { name: '   ' } } as Pick<CharacterFile, 'meta'>)).toBe('character')
  })
})

describe('serializeSession', () => {
  it('round-trips a session through JSON unchanged', () => {
    const session: SessionFile = {
      formatVersion: 1,
      characterId: 'fenn-larkspur',
      characterFormatVersion: 1,
      updatedAt: '2026-07-05T00:00:00.000Z',
      trackers: { hp: { current: 24, temp: 0 }, additions: { 'add-1': { used: 1 } } },
      loadout: {},
      additions: [
        {
          id: 'add-1',
          kind: 'boon',
          name: 'Blessing',
          limitedUse: { max: 2, recover: [{ on: 'long', amount: 'all' }] },
          addedAt: '2026-07-05T00:00:00.000Z',
        },
      ],
    }
    expect(JSON.parse(serializeSession(session))).toEqual(session)
  })
})
