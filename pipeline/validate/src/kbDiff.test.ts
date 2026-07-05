import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import {
  diffCharacterLibrary,
  extractKbBody,
  findManifestEntry,
  loadManifest,
  normalizeWhitespace,
  unifiedDiff,
} from './kbDiff.ts'

function fixturePath(relPath: string): string {
  return fileURLToPath(new URL(`../../../fixtures/${relPath}`, import.meta.url))
}

const KB = fixturePath('fake-kb')

function loadCharacter(relPath: string): CharacterFile {
  return JSON.parse(readFileSync(fixturePath(relPath), 'utf8')) as CharacterFile
}

// ---------------------------------------------------------------------------
// End-to-end: synthetic fixture against the fake KB
// ---------------------------------------------------------------------------

describe('diffCharacterLibrary — synthetic fixture vs fake KB', () => {
  const character = loadCharacter('synthetic.character.json')
  const report = diffCharacterLibrary(character, KB)
  const byKey = Object.fromEntries(report.entries.map((e) => [e.key, e]))

  it('classifies an identical extract as unchanged', () => {
    expect(byKey.fighter.status).toBe('unchanged')
    expect(byKey.wizard.status).toBe('unchanged')
    expect(byKey['eldritch-knight'].status).toBe('unchanged')
    expect(byKey.longsword.status).toBe('unchanged')
    expect(byKey.fighter.diff).toBeUndefined()
  })

  it('classifies an edited extract as changed and shows a unified diff', () => {
    const entry = byKey.duskling
    expect(entry.status).toBe('changed')
    expect(entry.diff).toContain('-Invented species. Small nocturnal humanoid, darkvision 60 ft')
    expect(entry.diff).toContain('+Invented species. Small nocturnal humanoid, darkvision 90 ft')
    expect(entry.diff).toMatch(/^--- embedded/m)
  })

  it('reports an entry the KB file no longer contains as missing-from-kb', () => {
    const entry = byKey.shortbow
    expect(entry.status).toBe('missing-from-kb')
    expect(entry.file).toBe('2014/equipment.md')
    expect(entry.note).toMatch(/no top-level "## Shortbow" block/)
  })

  it('reports an entry absent from the manifest as not-in-manifest', () => {
    expect(byKey.incense.status).toBe('not-in-manifest')
    expect(byKey.incense.note).toMatch(/name \+ edition/)
  })

  it('never touches Homebrew entries', () => {
    const homebrew = report.entries.filter((e) => e.edition === 'Homebrew')
    expect(homebrew.length).toBeGreaterThan(0)
    expect(homebrew.every((e) => e.status === 'homebrew-skipped')).toBe(true)
  })

  it('is not clean when changes or missing entries exist, and counts add up', () => {
    expect(report.clean).toBe(false)
    expect(report.counts.changed).toBe(1)
    expect(report.counts['missing-from-kb']).toBe(1)
    const total = Object.values(report.counts).reduce((a, b) => a + b, 0)
    expect(total).toBe(Object.keys(character.library).length)
  })

  it('reports clean when nothing is changed or missing', () => {
    // Drop the two entries that trip the report, keep the unchanged ones.
    const trimmed: CharacterFile = {
      ...character,
      library: Object.fromEntries(
        Object.entries(character.library).filter(
          ([k, e]) =>
            e.edition !== 'Homebrew' && k !== 'duskling' && k !== 'shortbow' && k !== 'incense',
        ),
      ),
    }
    const clean = diffCharacterLibrary(trimmed, KB)
    expect(clean.clean).toBe(true)
    expect(clean.counts.changed).toBe(0)
    expect(clean.counts['missing-from-kb']).toBe(0)
    expect(clean.counts.unchanged).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Unit: whitespace normalisation
// ---------------------------------------------------------------------------

describe('normalizeWhitespace', () => {
  it('strips trailing whitespace, CRLF, and collapses blank runs', () => {
    expect(normalizeWhitespace('a  \r\nb\n\n\n\nc\n\n')).toBe('a\nb\n\nc')
  })

  it('leaves meaningful inner spacing alone', () => {
    expect(normalizeWhitespace('a  b')).toBe('a  b')
  })

  it('treats whitespace-only differences as equal via unifiedDiff', () => {
    expect(unifiedDiff('one\ntwo', 'one  \r\ntwo\n\n')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Unit: KB block extraction
// ---------------------------------------------------------------------------

describe('extractKbBody', () => {
  const file = [
    '# Heading',
    '',
    '## Alpha',
    '2024 rules  ·  spell  ·  Test, p.1',
    '',
    'Body of alpha.',
    '### A subsection',
    'More alpha.',
    '',
    '## Beta',
    '2024 rules  ·  spell  ·  Test, p.2',
    '',
    'Body of beta.',
  ].join('\n')

  it('returns the block body, dropping the heading and metadata line', () => {
    expect(extractKbBody(file, 'Alpha')).toBe('\nBody of alpha.\n### A subsection\nMore alpha.\n')
  })

  it('stops at the next level-2 heading (not sub-headings)', () => {
    const body = extractKbBody(file, 'Alpha')
    expect(body).toContain('### A subsection')
    expect(body).not.toContain('Body of beta')
  })

  it('returns null when the heading is absent', () => {
    expect(extractKbBody(file, 'Gamma')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Unit: manifest lookup + disambiguation
// ---------------------------------------------------------------------------

describe('findManifestEntry', () => {
  const manifest = loadManifest(KB)

  it('matches on name + edition', () => {
    const m = findManifestEntry(manifest, {
      name: 'Fighter',
      edition: '2024',
      type: 'class',
      source: 'Test',
    })
    expect(m?.entry.file).toBe('2024/classes.md')
  })

  it('returns null when no manifest entry shares name + edition', () => {
    expect(
      findManifestEntry(manifest, {
        name: 'Incense',
        edition: '2014',
        type: 'component',
        source: 'Test',
      }),
    ).toBeNull()
  })

  it('breaks ties by source then type', () => {
    const ambiguous = {
      entries: [
        { name: 'Bane', type: 'Deity', edition: '2024', source: 'FRHoF', file: 'deity.md' },
        { name: 'Bane', type: 'Spell', edition: '2024', source: 'XPHB', file: 'spell.md' },
      ],
    }
    const m = findManifestEntry(ambiguous, {
      name: 'Bane',
      edition: '2024',
      type: 'spell',
      source: 'XPHB',
    })
    expect(m?.entry.file).toBe('spell.md')
    expect(m?.note).toMatch(/share this name\+edition/)
  })
})

// ---------------------------------------------------------------------------
// Unit: unified diff shape
// ---------------------------------------------------------------------------

describe('unifiedDiff', () => {
  it('emits headers and +/- lines for a substantive change', () => {
    const diff = unifiedDiff('line one\nline two\nline three', 'line one\nline TWO\nline three')
    expect(diff).toMatch(/^--- embedded\n\+\+\+ kb\n/)
    expect(diff).toContain('-line two')
    expect(diff).toContain('+line TWO')
    expect(diff).toContain(' line one')
    expect(diff).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/)
  })

  it('keeps 3 lines of context on both sides of a change', () => {
    const lines = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10']
    const edited = lines.map((l) => (l === 'l5' ? 'CHANGED' : l))
    const diff = unifiedDiff(lines.join('\n'), edited.join('\n'))
    expect(diff.split('\n')).toEqual([
      '--- embedded',
      '+++ kb',
      '@@ -2,7 +2,7 @@',
      ' l2',
      ' l3',
      ' l4',
      '-l5',
      '+CHANGED',
      ' l6',
      ' l7',
      ' l8',
    ])
  })

  it('splits distant changes into separate hunks, each fully contexted', () => {
    const mk = (third: string, thirteenth: string): string =>
      [
        'l1',
        'l2',
        third,
        'l4',
        'l5',
        'l6',
        'l7',
        'l8',
        'l9',
        'l10',
        'l11',
        'l12',
        thirteenth,
        'l14',
      ].join('\n')
    const diff = unifiedDiff(mk('x3', 'x13'), mk('y3', 'y13'))
    const hunks = diff.split('\n').filter((l) => l.startsWith('@@'))
    expect(hunks).toHaveLength(2)
    expect(diff).toContain(' l6') // trailing context of hunk 1 reaches 3 lines
    expect(diff).toContain('@@ -10,5 +10,5 @@')
  })
})
