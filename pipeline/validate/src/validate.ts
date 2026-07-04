import { readFileSync, statSync } from 'node:fs'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { validateCharacterSchema, validateSessionSchema } from './ajv.ts'
import { checkReferentialIntegrity } from './referential.ts'
import { lintMarkup } from './markupLint.ts'
import { checkSanity } from './sanity.ts'
import { formatAjvErrors } from './paths.ts'
import type { FileKind, ValidationIssue, ValidationResult } from './types.ts'

export function detectKind(filePath: string): FileKind | null {
  if (filePath.endsWith('.character.json')) return 'character'
  if (filePath.endsWith('.session.json')) return 'session'
  return null
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Layers 2-4 assume the character shape below is present; skip them if layer 1 failed structurally. */
function hasMinimalCharacterShape(v: unknown): v is CharacterFile {
  return (
    isPlainObject(v) &&
    isPlainObject(v.chassis) &&
    isPlainObject(v.library) &&
    isPlainObject(v.meta)
  )
}

export function validateCharacterFile(file: unknown, rawSize: number): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const ok = validateCharacterSchema(file)
  if (!ok) issues.push(...formatAjvErrors(validateCharacterSchema.errors ?? []))
  if (!hasMinimalCharacterShape(file)) return issues

  issues.push(...checkReferentialIntegrity(file))
  issues.push(...lintMarkup(file))
  issues.push(...checkSanity(file, rawSize))
  return issues
}

export function validateSessionFile(file: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const ok = validateSessionSchema(file)
  if (!ok) issues.push(...formatAjvErrors(validateSessionSchema.errors ?? []))
  issues.push(...lintMarkup(file))
  return issues
}

function summarize(file: string, kind: FileKind, issues: ValidationIssue[]): ValidationResult {
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.length - errorCount
  return { file, kind, valid: errorCount === 0, errorCount, warningCount, issues }
}

/** Reads, parses, and runs all applicable layers against a `*.character.json` or `*.session.json` file. */
export function validateFile(filePath: string): ValidationResult {
  const kind = detectKind(filePath)
  if (!kind) {
    return summarize(filePath, 'character', [
      {
        layer: 'schema',
        severity: 'error',
        path: '(file)',
        message: 'unrecognized file kind: expected a *.character.json or *.session.json filename',
      },
    ])
  }

  const raw = readFileSync(filePath, 'utf8')
  const size = statSync(filePath).size

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return summarize(filePath, kind, [
      {
        layer: 'schema',
        severity: 'error',
        path: '(file)',
        message: `invalid JSON: ${(err as Error).message}`,
      },
    ])
  }

  const issues =
    kind === 'character' ? validateCharacterFile(parsed, size) : validateSessionFile(parsed)
  return summarize(filePath, kind, issues)
}
