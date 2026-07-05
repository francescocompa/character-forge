import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CharacterFile, Extract } from '@character-forge/schema/types.ts'

/**
 * kb-diff: mechanical drift detector between a compiled character's embedded
 * `library` extracts and the current knowledge base (T20, scope §3 D5).
 *
 * A character file embeds the full official text of every referenced entry at
 * compile time (self-containment, D5). When the KB is later re-compiled (errata,
 * a new printing), those embedded extracts can go stale. This module finds the
 * drift; `pipeline/kb-audit.md` is the recipe that applies judgement to it.
 *
 * Pure and Node-only (reads the KB from disk); no schema validation here — run
 * the validator (T04) separately. Homebrew entries are never touched (they have
 * no KB source); reflavors and class-feature sub-extracts that the KB doesn't
 * index individually surface as `not-in-manifest` for manual review rather than
 * being mistaken for deletions.
 */

export type KbDiffStatus =
  'unchanged' | 'changed' | 'missing-from-kb' | 'not-in-manifest' | 'homebrew-skipped'

export interface KbDiffEntry {
  /** The `library` key in the character file. */
  key: string
  name: string
  edition: string
  type: string
  source: string
  status: KbDiffStatus
  /** KB file the entry was located in (when a manifest match resolved). */
  file?: string
  /** Unified diff (embedded → KB), present only when `status === 'changed'`. */
  diff?: string
  /** Human note: disambiguation choices, why an entry is unfindable, etc. */
  note?: string
}

export interface KbDiffReport {
  file: string
  kbPath: string
  counts: Record<KbDiffStatus, number>
  /** True iff nothing needs action: no `changed` and no `missing-from-kb`. */
  clean: boolean
  entries: KbDiffEntry[]
}

interface ManifestEntry {
  name: string
  type: string
  edition: string | number
  source: string
  file: string
  page?: number | string
}

interface Manifest {
  entries: ManifestEntry[]
}

// ---------------------------------------------------------------------------
// KB access
// ---------------------------------------------------------------------------

export function loadManifest(kbPath: string): Manifest {
  const raw = readFileSync(join(kbPath, 'MANIFEST.json'), 'utf8')
  const parsed = JSON.parse(raw) as Manifest
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`MANIFEST.json at ${kbPath} has no "entries" array`)
  }
  return parsed
}

/**
 * Finds the manifest entry backing a library extract. Primary key is
 * `name` + `edition` (the KB never mixes editions); `source` then `type`
 * break ties when a name exists in several books/types (e.g. "Bane" is both a
 * Deity and a Spell). Returns the chosen entry plus a note when the match was
 * ambiguous. `null` when no manifest entry shares the name and edition.
 */
export function findManifestEntry(
  manifest: Manifest,
  extract: Pick<Extract, 'name' | 'edition' | 'type' | 'source'>,
): { entry: ManifestEntry; note?: string } | null {
  let candidates = manifest.entries.filter(
    (e) => e.name === extract.name && String(e.edition) === String(extract.edition),
  )
  if (candidates.length === 0) return null

  const total = candidates.length
  if (candidates.length > 1 && extract.source) {
    const bySource = candidates.filter((e) => e.source === extract.source)
    if (bySource.length > 0) candidates = bySource
  }
  if (candidates.length > 1 && extract.type) {
    const wanted = String(extract.type).toLowerCase()
    const byType = candidates.filter((e) => e.type.toLowerCase() === wanted)
    if (byType.length > 0) candidates = byType
  }

  const entry = candidates[0]
  const note =
    candidates.length > 1 || total > 1
      ? `${total} KB entr${total === 1 ? 'y' : 'ies'} share this name+edition; compared against ${entry.source} (${entry.type})`
      : undefined
  return { entry, note }
}

/**
 * Extracts an entry's body text from a KB markdown file. Each entry is a
 * `## <name>` block whose first line is a metadata line (`<edition> rules · … `);
 * the body is everything after that metadata line, up to the next `## ` heading.
 * The heading and metadata line are dropped — they map onto the extract's
 * structured `name`/`edition`/`type`/`source`/`page` fields, not its `markdown`.
 * Returns `null` if no `## <name>` heading is present in the file.
 */
export function extractKbBody(fileText: string, name: string): string | null {
  const lines = fileText.replace(/\r\n?/g, '\n').split('\n')

  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (isLevel2Heading(lines[i]) && lines[i].slice(3).trim() === name) {
      start = i
      break
    }
  }
  if (start === -1) return null

  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (isLevel2Heading(lines[i])) {
      end = i
      break
    }
  }

  // Drop the heading and the metadata line beneath it. The KB puts the metadata
  // immediately after the heading; tolerate a blank line between them too, so a
  // reflow of the source can't fold the metadata line into the compared body.
  let bodyStart = start + 1
  while (bodyStart < end && lines[bodyStart].trim() === '') bodyStart++
  const meta = lines[bodyStart] ?? ''
  if (meta.includes('·') || /\brules\b/.test(meta)) bodyStart++

  return lines.slice(bodyStart, end).join('\n')
}

/** A `## ` heading exactly — not `###`/`####` sub-headings inside a block. */
function isLevel2Heading(line: string): boolean {
  return line.startsWith('## ')
}

// ---------------------------------------------------------------------------
// Normalisation + diff
// ---------------------------------------------------------------------------

/**
 * Whitespace-only normalisation so cosmetic reflow (trailing spaces, extra
 * blank lines, CRLF) doesn't read as a substantive change. Never alters the
 * content of a line.
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Longest-common-subsequence table over two line arrays. */
function lcsLengths(a: string[], b: string[]): number[][] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return dp
}

type Op = { kind: ' ' | '-' | '+'; line: string }

function diffOps(a: string[], b: string[]): Op[] {
  const dp = lcsLengths(a, b)
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: ' ', line: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: '-', line: a[i] })
      i++
    } else {
      ops.push({ kind: '+', line: b[j] })
      j++
    }
  }
  while (i < a.length) ops.push({ kind: '-', line: a[i++] })
  while (j < b.length) ops.push({ kind: '+', line: b[j++] })
  return ops
}

/**
 * A unified diff (context = 3) from `embedded` (the character's copy, shown as
 * `---`) to `current` (the KB's copy, shown as `+++`). Empty string when the
 * two normalise to the same text.
 */
export function unifiedDiff(embedded: string, current: string, context = 3): string {
  const a = normalizeWhitespace(embedded).split('\n')
  const b = normalizeWhitespace(current).split('\n')
  const ops = diffOps(a, b)
  if (ops.every((op) => op.kind === ' ')) return ''

  // Group ops into hunks separated by > 2*context unchanged lines.
  interface Hunk {
    aStart: number
    bStart: number
    lines: string[]
  }
  const hunks: Hunk[] = []
  let ai = 0
  let bi = 0
  let idx = 0
  while (idx < ops.length) {
    // Skip leading run of unchanged lines, keeping up to `context` as prefix.
    while (idx < ops.length && ops[idx].kind === ' ') {
      const nextChange = ops.slice(idx).findIndex((op) => op.kind !== ' ')
      if (nextChange === -1) {
        idx = ops.length
        break
      }
      if (nextChange > context) {
        const skip = nextChange - context
        for (let k = 0; k < skip; k++) {
          ai++
          bi++
          idx++
        }
      }
      break
    }
    if (idx >= ops.length) break

    const hunk: Hunk = { aStart: ai, bStart: bi, lines: [] }
    let trailingContext = 0
    while (idx < ops.length) {
      const op = ops[idx]
      if (op.kind === ' ') {
        trailingContext++
        // End the hunk if we've seen enough trailing context and more changes
        // are far away.
        if (trailingContext > context) {
          const rest = ops.slice(idx)
          const nextChange = rest.findIndex((o) => o.kind !== ' ')
          if (nextChange === -1 || nextChange >= context) {
            // Trim the extra context we speculatively consumed. The current op
            // has not been pushed yet, so the pushed trailing run is one
            // shorter than `trailingContext`.
            hunk.lines = hunk.lines.slice(0, hunk.lines.length - (trailingContext - context - 1))
            break
          }
        }
      } else {
        trailingContext = 0
      }
      hunk.lines.push(`${op.kind}${op.line}`)
      if (op.kind !== '+') ai++
      if (op.kind !== '-') bi++
      idx++
    }
    hunks.push(hunk)
  }

  const out: string[] = ['--- embedded', '+++ kb']
  for (const hunk of hunks) {
    const aCount = hunk.lines.filter((l) => l[0] === ' ' || l[0] === '-').length
    const bCount = hunk.lines.filter((l) => l[0] === ' ' || l[0] === '+').length
    out.push(`@@ -${hunk.aStart + 1},${aCount} +${hunk.bStart + 1},${bCount} @@`)
    out.push(...hunk.lines)
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const EMPTY_COUNTS: Record<KbDiffStatus, number> = {
  unchanged: 0,
  changed: 0,
  'missing-from-kb': 0,
  'not-in-manifest': 0,
  'homebrew-skipped': 0,
}

/**
 * Diffs every `library` extract in a character against the KB at `kbPath`.
 * Homebrew entries are skipped by construction (they have no KB source, D5).
 * Result is `clean` when no entry is `changed` or `missing-from-kb`.
 */
export function diffCharacterLibrary(
  character: CharacterFile,
  kbPath: string,
  manifest: Manifest = loadManifest(kbPath),
): Omit<KbDiffReport, 'file'> {
  const fileCache = new Map<string, string | null>()
  const readKbFile = (relPath: string): string | null => {
    if (!fileCache.has(relPath)) {
      try {
        fileCache.set(relPath, readFileSync(join(kbPath, relPath), 'utf8'))
      } catch {
        fileCache.set(relPath, null)
      }
    }
    return fileCache.get(relPath) ?? null
  }

  const entries: KbDiffEntry[] = []
  for (const [key, extract] of Object.entries(character.library)) {
    const base: KbDiffEntry = {
      key,
      name: extract.name,
      edition: String(extract.edition),
      type: String(extract.type),
      source: extract.source,
      status: 'unchanged',
    }

    if (extract.edition === 'Homebrew') {
      entries.push({ ...base, status: 'homebrew-skipped' })
      continue
    }

    const match = findManifestEntry(manifest, extract)
    if (!match) {
      entries.push({
        ...base,
        status: 'not-in-manifest',
        note: 'no KB entry with this name + edition (likely a class/subclass-feature sub-extract or a reflavored display name; review by hand)',
      })
      continue
    }

    const fileText = readKbFile(match.entry.file)
    const body = fileText === null ? null : extractKbBody(fileText, extract.name)
    if (body === null) {
      entries.push({
        ...base,
        status: 'missing-from-kb',
        file: match.entry.file,
        note:
          fileText === null
            ? `manifest points at ${match.entry.file}, but that file is not readable`
            : `manifest lists this entry in ${match.entry.file}, but no top-level "## ${extract.name}" block is there (it may be a #/### heading inside a composite file, e.g. a class overview, or genuinely removed — check by hand)`,
      })
      continue
    }

    const diff = unifiedDiff(extract.markdown, body)
    entries.push({
      ...base,
      status: diff ? 'changed' : 'unchanged',
      file: match.entry.file,
      ...(diff ? { diff } : {}),
      ...(match.note ? { note: match.note } : {}),
    })
  }

  const counts = { ...EMPTY_COUNTS }
  for (const e of entries) counts[e.status]++
  const clean = counts.changed === 0 && counts['missing-from-kb'] === 0

  return { kbPath, counts, clean, entries }
}
