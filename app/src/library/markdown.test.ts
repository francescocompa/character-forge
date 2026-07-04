import { describe, expect, it } from 'vitest'
import { parseMarkdown, type Block } from './markdown'

const kinds = (blocks: Block[]) => blocks.map((b) => b.kind)

describe('parseMarkdown', () => {
  it('parses headings at every level', () => {
    const blocks = parseMarkdown('# One\n\n###### Six')
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: 'One' },
      { kind: 'heading', level: 6, text: 'Six' },
    ])
  })

  it('joins wrapped paragraph lines and splits on blank lines', () => {
    const blocks = parseMarkdown('alpha\nbeta\n\ngamma')
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'alpha beta' },
      { kind: 'paragraph', text: 'gamma' },
    ])
  })

  it('parses unordered and ordered lists, stripping markers', () => {
    const ul = parseMarkdown('- a\n- b\n* c')
    expect(ul).toEqual([{ kind: 'list', ordered: false, items: ['a', 'b', 'c'] }])
    const ol = parseMarkdown('1. first\n2. second')
    expect(ol).toEqual([{ kind: 'list', ordered: true, items: ['first', 'second'] }])
  })

  it('parses a GFM table with alignment markers', () => {
    const blocks = parseMarkdown('| L | C | R |\n|:--|:-:|--:|\n| 1 | 2 | 3 |')
    expect(blocks).toEqual([
      {
        kind: 'table',
        table: {
          header: ['L', 'C', 'R'],
          align: ['left', 'center', 'right'],
          rows: [['1', '2', '3']],
        },
      },
    ])
  })

  it('does not mistake a pipe-bearing paragraph for a table', () => {
    // No delimiter row follows, so this is prose, not a table.
    expect(kinds(parseMarkdown('gain +1 | and advantage'))).toEqual(['paragraph'])
  })

  it('passes fenced code through verbatim', () => {
    const blocks = parseMarkdown('```\nkeep  spacing\n  and indent\n```')
    expect(blocks).toEqual([{ kind: 'code', text: 'keep  spacing\n  and indent' }])
  })

  it('keeps distinct blocks that touch without a blank line', () => {
    const blocks = parseMarkdown('para text\n# Heading\n- item')
    expect(kinds(blocks)).toEqual(['paragraph', 'heading', 'list'])
  })

  it('returns an empty array for blank input and never throws', () => {
    expect(parseMarkdown('')).toEqual([])
    expect(parseMarkdown('\n\n   \n')).toEqual([])
    // An unterminated fence must not hang or throw.
    expect(() => parseMarkdown('```\nno close')).not.toThrow()
  })
})
