/*
 * Minimal GFM block parser for library extracts (T07).
 *
 * KB extracts are compiled markdown (scope §6): headings, paragraphs, ordered
 * and unordered lists, fenced code, and GFM tables. Inline formatting is left
 * to `SheetMarkup` (T06) — the same `**bold**`/`*italic*`/`{ref:…}` grammar the
 * rest of the sheet uses — so a ref *inside* an extract stays tappable and this
 * parser only has to find block boundaries. Deliberately tiny: no library, no
 * nested lists, no blockquotes (extracts don't use them).
 *
 * Pure and total: any input yields a Block[]; nothing throws.
 */

export type Align = 'left' | 'center' | 'right' | 'none'

export interface Table {
  header: string[]
  align: Align[]
  rows: string[][]
}

export type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'table'; table: Table }

const HEADING = /^(#{1,6})\s+(.*)$/
const FENCE = /^```/
const ULI = /^[-*+]\s+(.*)$/
const OLI = /^\d+[.)]\s+(.*)$/
// A table delimiter row: pipe-separated cells of dashes with optional `:` align markers.
const TABLE_DELIM = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}

function alignOf(cell: string): Align {
  const s = cell.trim()
  const left = s.startsWith(':')
  const right = s.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return 'none'
}

function isTableStart(lines: string[], i: number): boolean {
  return (
    lines[i].includes('|') &&
    i + 1 < lines.length &&
    lines[i + 1].includes('-') &&
    TABLE_DELIM.test(lines[i + 1])
  )
}

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code — passed through verbatim, no inline processing.
    if (FENCE.test(line.trim())) {
      const body: string[] = []
      i++
      while (i < lines.length && !FENCE.test(lines[i].trim())) {
        body.push(lines[i])
        i++
      }
      i++ // consume the closing fence (or run off the end)
      blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].trim() })
      i++
      continue
    }

    if (isTableStart(lines, i)) {
      const header = splitRow(line)
      const align = splitRow(lines[i + 1]).map(alignOf)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]))
        i++
      }
      blocks.push({ kind: 'table', table: { header, align, rows } })
      continue
    }

    if (ULI.test(line) || OLI.test(line)) {
      const ordered = OLI.test(line)
      const items: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        const m = (ordered ? OLI : ULI).exec(lines[i])
        if (!m) break
        items.push(m[1].trim())
        i++
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    // Paragraph: gather consecutive lines until a blank line or a new block start.
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !HEADING.test(lines[i]) &&
      !FENCE.test(lines[i].trim()) &&
      !ULI.test(lines[i]) &&
      !OLI.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push({ kind: 'paragraph', text: para.join(' ') })
  }

  return blocks
}
