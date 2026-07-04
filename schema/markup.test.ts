import { describe, it, expect } from 'vitest'
import { parseMarkup, collectRefTags } from './markup.ts'

describe('parseMarkup', () => {
  it('parses plain text with no tags', () => {
    const { nodes, diagnostics } = parseMarkup('Just prose, no tags here.')
    expect(nodes).toEqual([{ type: 'text', value: 'Just prose, no tags here.' }])
    expect(diagnostics).toEqual([])
  })

  it('parses a zero-arg tag', () => {
    const { nodes, diagnostics } = parseMarkup('{adv} on the check')
    expect(nodes[0]).toEqual({ type: 'tag', name: 'adv', args: [] })
    expect(diagnostics).toEqual([])
  })

  it('parses a single-arg tag', () => {
    const { nodes, diagnostics } = parseMarkup('{a:STR}')
    expect(nodes).toEqual([{ type: 'tag', name: 'a', args: ['STR'] }])
    expect(diagnostics).toEqual([])
  })

  it('parses a two-arg tag with a save DC', () => {
    const { nodes, diagnostics } = parseMarkup('{save:INT|13}')
    expect(nodes).toEqual([{ type: 'tag', name: 'save', args: ['INT', '13'] }])
    expect(diagnostics).toEqual([])
  })

  it('parses the worked Mind Sliver-style example clean', () => {
    const text =
      '{dmg:psychic|1d6} & {save:INT|13} — on a fail, target subtracts {dice:1d4} from its next save'
    const { diagnostics } = parseMarkup(text)
    expect(diagnostics).toEqual([])
  })

  it('parses the worked mixed-recovery example clean', () => {
    const text =
      'Regain {dice:1d10+5} HP. **2** uses per {recover:LR}; regain **1** use on a {recover:SR}.'
    const { diagnostics } = parseMarkup(text)
    expect(diagnostics).toEqual([])
  })

  it('flags an unknown tag name as a warning but renders it as literal text', () => {
    const { nodes, diagnostics } = parseMarkup('{foo:bar}')
    expect(nodes).toEqual([{ type: 'text', value: '{foo:bar}' }])
    expect(diagnostics).toEqual([
      { severity: 'warning', message: 'unknown tag "foo"', source: '{foo:bar}' },
    ])
  })

  it('rejects an invalid form like {A:STR} as not a tag at all (uppercase name)', () => {
    const { nodes, diagnostics } = parseMarkup('{A:STR}')
    expect(nodes).toEqual([{ type: 'text', value: '{A:STR}' }])
    expect(diagnostics).toEqual([])
  })

  it('flags wrong arity on a known tag as an error, but still emits a tag node', () => {
    const { nodes, diagnostics } = parseMarkup('{adv:oops}')
    expect(nodes).toEqual([{ type: 'tag', name: 'adv', args: ['oops'] }])
    expect(diagnostics).toEqual([
      { severity: 'error', message: '{adv} expects 0 argument(s), got 1', source: '{adv:oops}' },
    ])
  })

  it('flags an invalid ability value as an error', () => {
    const { diagnostics } = parseMarkup('{a:LUCK}')
    expect(diagnostics).toEqual([
      { severity: 'error', message: '{a}: invalid ability "LUCK"', source: '{a:LUCK}' },
    ])
  })

  it('flags a non-integer {lvl:} as an error', () => {
    const { diagnostics } = parseMarkup('{lvl:six}')
    expect(diagnostics).toEqual([
      { severity: 'error', message: '{lvl}: "six" is not a whole number', source: '{lvl:six}' },
    ])
  })

  it('flags an unknown recovery trigger as an error', () => {
    const { diagnostics } = parseMarkup('{recover:Someday}')
    expect(diagnostics.length).toBe(1)
    expect(diagnostics[0].severity).toBe('error')
  })

  it('flags a non-kebab-case ref key as an error', () => {
    const { diagnostics } = parseMarkup('{ref:Mind_Sliver}')
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        message: '{ref}: ref key "Mind_Sliver" is not kebab-case',
        source: '{ref:Mind_Sliver}',
      },
    ])
  })

  it('flags an unescaped pipe inside a single-arg note as an arity error', () => {
    const { diagnostics } = parseMarkup('{note:once per turn|twice a day}')
    expect(diagnostics).toEqual([
      {
        severity: 'error',
        message: '{note} expects 1 argument(s), got 2',
        source: '{note:once per turn|twice a day}',
      },
    ])
  })

  it('treats an unterminated tag as literal text with an error diagnostic', () => {
    const { nodes, diagnostics } = parseMarkup('prefix {a:STR forgot to close')
    expect(nodes).toEqual([
      { type: 'text', value: 'prefix ' },
      { type: 'text', value: '{a:STR forgot to close' },
    ])
    expect(diagnostics).toEqual([
      { severity: 'error', message: 'unterminated tag', source: '{a:STR forgot to close' },
    ])
  })

  it('honors escapes for brace, pipe, and backslash inside args', () => {
    const { nodes, diagnostics } = parseMarkup('{note:once \\{per turn\\} — pick A \\| B}')
    expect(nodes).toEqual([{ type: 'tag', name: 'note', args: ['once {per turn} — pick A | B'] }])
    expect(diagnostics).toEqual([])
  })

  it('renders a literal brace pair outside a tag verbatim', () => {
    const { nodes } = parseMarkup('Choose one option \\{A \\| B\\}, then mark it.')
    expect(nodes).toEqual([{ type: 'text', value: 'Choose one option {A | B}, then mark it.' }])
  })

  it('wraps a single tag in bold, per the grammar doc example', () => {
    const { nodes, diagnostics } = parseMarkup('**{a:STR}**')
    expect(nodes).toEqual([{ type: 'bold', children: [{ type: 'tag', name: 'a', args: ['STR'] }] }])
    expect(diagnostics).toEqual([])
  })

  it('parses italic text', () => {
    const { nodes } = parseMarkup('some *italic* word')
    expect(nodes).toEqual([
      { type: 'text', value: 'some ' },
      { type: 'italic', children: [{ type: 'text', value: 'italic' }] },
      { type: 'text', value: ' word' },
    ])
  })

  it('an unrecognized damage type still parses without error (open vocabulary)', () => {
    const { diagnostics } = parseMarkup('{dmg:sonic|1d6}')
    expect(diagnostics).toEqual([])
  })
})

describe('collectRefTags', () => {
  it('collects a ref key with no label', () => {
    const { nodes } = parseMarkup('{ref:mind-sliver}')
    expect(collectRefTags(nodes)).toEqual(['mind-sliver'])
  })

  it('collects a ref key with a label, ignoring the label', () => {
    const { nodes } = parseMarkup('{ref:fey-pact|Fey Pact}: grants {adv} on saves')
    expect(collectRefTags(nodes)).toEqual(['fey-pact'])
  })

  it('collects refs nested inside emphasis', () => {
    const { nodes } = parseMarkup('**{ref:eldritch-invocation|invocation}**')
    expect(collectRefTags(nodes)).toEqual(['eldritch-invocation'])
  })

  it('returns an empty array when there are no ref tags', () => {
    const { nodes } = parseMarkup('{adv} on {save:WIS}')
    expect(collectRefTags(nodes)).toEqual([])
  })
})
