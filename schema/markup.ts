/**
 * Sheet-markup parser (see markup-grammar.md). This is the shared implementation
 * both the renderer (T06) and the validator's markup-lint layer (T04) use — T04
 * landed first, so it defines the module; T06 imports rather than duplicating it.
 *
 * `parseMarkup` never throws: any string is valid markup (grammar §2's core
 * guarantee). Structural problems (unknown tag names, wrong arity, invalid
 * argument values, unterminated tags) still produce diagnostics alongside the
 * node list, so a linter can flag them even though the renderer degrades safely.
 */

export type MarkupNode =
  | { type: 'text'; value: string }
  | { type: 'tag'; name: string; args: string[] }
  | { type: 'bold'; children: MarkupNode[] }
  | { type: 'italic'; children: MarkupNode[] }

export interface MarkupDiagnostic {
  severity: 'error' | 'warning'
  message: string
  /** The literal source text the diagnostic is about (for locating it in the field). */
  source: string
}

export interface ParsedMarkup {
  nodes: MarkupNode[]
  diagnostics: MarkupDiagnostic[]
}

const ABILITIES = new Set(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
const RECOVER_TRIGGERS = new Set(['SR', 'LR', 'Dawn'])
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const INTEGER = /^\d+$/

interface TagSpec {
  minArgs: number
  maxArgs: number
  /** Returns an error message if the (arity-valid) args are semantically invalid. */
  validate?: (args: string[]) => string | undefined
}

const TAG_SPECS: Record<string, TagSpec> = {
  a: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([ability]) => (ABILITIES.has(ability) ? undefined : `invalid ability "${ability}"`),
  },
  save: {
    minArgs: 1,
    maxArgs: 2,
    validate: ([ability, dc]) => {
      if (!ABILITIES.has(ability)) return `invalid ability "${ability}"`
      if (dc !== undefined && !INTEGER.test(dc)) return `DC "${dc}" is not a whole number`
      return undefined
    },
  },
  dmg: {
    minArgs: 2,
    maxArgs: 2,
    validate: ([type, dice]) => {
      if (!type) return 'missing damage type'
      if (!dice) return 'missing dice/amount'
      return undefined
    },
  },
  dice: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([dice]) => (dice ? undefined : 'missing dice/amount'),
  },
  dtype: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([type]) => (type ? undefined : 'missing damage type'),
  },
  adv: { minArgs: 0, maxArgs: 0 },
  dis: { minArgs: 0, maxArgs: 0 },
  cond: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([name]) => (name ? undefined : 'missing condition name'),
  },
  recover: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([when]) =>
      RECOVER_TRIGGERS.has(when)
        ? undefined
        : `unknown recovery trigger "${when}" (expected SR, LR, or Dawn)`,
  },
  lvl: {
    minArgs: 1,
    maxArgs: 1,
    validate: ([n]) => (INTEGER.test(n) ? undefined : `"${n}" is not a whole number`),
  },
  ref: {
    minArgs: 1,
    maxArgs: 2,
    validate: ([key]) => (KEBAB.test(key) ? undefined : `ref key "${key}" is not kebab-case`),
  },
  note: {
    minArgs: 1,
    maxArgs: 1,
  },
}

type TagShape =
  | { kind: 'tag'; name: string; args: string[]; end: number }
  | { kind: 'unterminated'; end: number; source: string }
  | { kind: 'not-a-tag' }

/** Scans a `{...}` form starting at `text[start] === '{'`. Never throws. */
function scanTagShape(text: string, start: number): TagShape {
  let i = start + 1
  let name = ''
  while (i < text.length && /[a-z]/.test(text[i])) {
    name += text[i]
    i += 1
  }
  if (name.length === 0) return { kind: 'not-a-tag' }

  if (text[i] === '}') {
    return { kind: 'tag', name, args: [], end: i + 1 }
  }
  if (text[i] !== ':') return { kind: 'not-a-tag' }
  i += 1

  const args: string[] = []
  let current = ''
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\') {
      const next = text[i + 1]
      if (next === '{' || next === '}' || next === '|' || next === '\\') {
        current += next
        i += 2
        continue
      }
      current += ch
      i += 1
      continue
    }
    if (ch === '|') {
      args.push(current)
      current = ''
      i += 1
      continue
    }
    if (ch === '}') {
      args.push(current)
      return { kind: 'tag', name, args, end: i + 1 }
    }
    current += ch
    i += 1
  }
  return { kind: 'unterminated', end: text.length, source: text.slice(start) }
}

/** Tokenizes a segment with no markdown emphasis handling (that's a layer above). */
function tokenizeTags(text: string): ParsedMarkup {
  const nodes: MarkupNode[] = []
  const diagnostics: MarkupDiagnostic[] = []
  let buffer = ''
  let i = 0

  const flushText = (): void => {
    if (buffer) {
      nodes.push({ type: 'text', value: buffer })
      buffer = ''
    }
  }

  while (i < text.length) {
    const ch = text[i]

    if (ch === '\\') {
      const next = text[i + 1]
      if (next === '{' || next === '}' || next === '|' || next === '\\') {
        buffer += next
        i += 2
        continue
      }
      buffer += ch
      i += 1
      continue
    }

    if (ch === '{') {
      const shape = scanTagShape(text, i)
      if (shape.kind === 'not-a-tag') {
        buffer += ch
        i += 1
        continue
      }
      if (shape.kind === 'unterminated') {
        flushText()
        nodes.push({ type: 'text', value: shape.source })
        diagnostics.push({ severity: 'error', message: 'unterminated tag', source: shape.source })
        i = shape.end
        continue
      }
      const source = text.slice(i, shape.end)
      const spec = TAG_SPECS[shape.name]
      flushText()
      if (!spec) {
        nodes.push({ type: 'text', value: source })
        diagnostics.push({ severity: 'warning', message: `unknown tag "${shape.name}"`, source })
      } else {
        nodes.push({ type: 'tag', name: shape.name, args: shape.args })
        if (shape.args.length < spec.minArgs || shape.args.length > spec.maxArgs) {
          const label =
            spec.minArgs === spec.maxArgs ? `${spec.minArgs}` : `${spec.minArgs}-${spec.maxArgs}`
          diagnostics.push({
            severity: 'error',
            message: `{${shape.name}} expects ${label} argument(s), got ${shape.args.length}`,
            source,
          })
        } else if (spec.validate) {
          const err = spec.validate(shape.args)
          if (err)
            diagnostics.push({ severity: 'error', message: `{${shape.name}}: ${err}`, source })
        }
      }
      i = shape.end
      continue
    }

    buffer += ch
    i += 1
  }

  flushText()
  return { nodes, diagnostics }
}

const EMPHASIS = /\*\*(.+?)\*\*|\*(.+?)\*/g

/**
 * Parses a sheet-markup string into nodes + diagnostics. Markdown emphasis
 * (`**bold**`, `*italic*`) may wrap tags (grammar §1); emphasis spans are
 * resolved first, then each span's content is tag-tokenized independently.
 */
export function parseMarkup(input: string): ParsedMarkup {
  const nodes: MarkupNode[] = []
  const diagnostics: MarkupDiagnostic[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  EMPHASIS.lastIndex = 0

  const consumePlain = (str: string): void => {
    const parsed = tokenizeTags(str)
    nodes.push(...parsed.nodes)
    diagnostics.push(...parsed.diagnostics)
  }

  while ((match = EMPHASIS.exec(input)) !== null) {
    if (match.index > lastIndex) consumePlain(input.slice(lastIndex, match.index))
    const isBold = match[1] !== undefined
    const inner = isBold ? match[1] : match[2]
    const parsedInner = tokenizeTags(inner)
    nodes.push({ type: isBold ? 'bold' : 'italic', children: parsedInner.nodes })
    diagnostics.push(...parsedInner.diagnostics)
    lastIndex = EMPHASIS.lastIndex
  }
  if (lastIndex < input.length) consumePlain(input.slice(lastIndex))

  return { nodes, diagnostics }
}

/** Recursively collects `{ref:KEY}` / `{ref:KEY|LABEL}` keys, including inside emphasis. */
export function collectRefTags(nodes: MarkupNode[]): string[] {
  const refs: string[] = []
  for (const node of nodes) {
    if (node.type === 'tag' && node.name === 'ref' && node.args[0]) refs.push(node.args[0])
    if (node.type === 'bold' || node.type === 'italic') refs.push(...collectRefTags(node.children))
  }
  return refs
}
