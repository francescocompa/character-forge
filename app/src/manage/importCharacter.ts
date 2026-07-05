import type { CharacterFile } from '@character-forge/schema/types.ts'
import { FORMAT_VERSION } from '../formatVersion'
import { characterKey, type StoredCharacter } from '../state/characterDb'
import { validateImportedCharacter, type ValidationIssue } from './validateImport'

/**
 * Turning a picked/dropped file into something the library can store (T16).
 * Pure — no IndexedDB, no DOM — so the flow is unit-testable end to end:
 *
 *   file text ──parseImport──▶ ParseResult ──classifyImport(existing)──▶ commit
 *
 * The version gate runs *before* schema validation so a file authored by a
 * newer app gets the friendly "update the app" refusal rather than a wall of
 * schema errors (schema/README.md versioning policy).
 */

export type ParseResult =
  | { status: 'invalid'; issues: ValidationIssue[] }
  | { status: 'unsupported-version'; version: number; supported: number }
  | { status: 'ok'; character: CharacterFile }

function readFormatVersion(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const v = (value as Record<string, unknown>).formatVersion
  return typeof v === 'number' ? v : undefined
}

/** Parse + version-gate + validate a raw file string into a storable character. */
export function parseImport(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return {
      status: 'invalid',
      issues: [
        {
          layer: 'schema',
          severity: 'error',
          path: '(file)',
          message: `Not valid JSON: ${(err as Error).message}`,
        },
      ],
    }
  }

  const version = readFormatVersion(parsed)
  if (version !== undefined && version > FORMAT_VERSION) {
    return { status: 'unsupported-version', version, supported: FORMAT_VERSION }
  }

  const issues = validateImportedCharacter(parsed)
  if (issues.some((i) => i.severity === 'error')) return { status: 'invalid', issues }

  return { status: 'ok', character: parsed as CharacterFile }
}

/** What re-importing over an existing record changes — shown before we overwrite. */
export interface RefreshChange {
  nameFrom: string
  nameTo: string
  levelFrom: number
  levelTo: number
  formatVersionFrom: number
  formatVersionTo: number
}

export type Classification =
  | { kind: 'new' }
  | { kind: 'variant'; characterId: string }
  | { kind: 'refresh'; existing: StoredCharacter; change: RefreshChange }

/**
 * Decide how an incoming character relates to what's already stored:
 * a brand-new character, a new variant of a known one, or a refresh of an
 * existing variant (same id + variantLabel) — in which case we surface the diff.
 */
export function classifyImport(
  character: CharacterFile,
  existing: StoredCharacter[],
): Classification {
  const key = characterKey(character.meta.characterId, character.meta.variantLabel)
  const match = existing.find((r) => r.key === key)
  if (match) {
    return {
      kind: 'refresh',
      existing: match,
      change: {
        nameFrom: match.character.meta.name,
        nameTo: character.meta.name,
        levelFrom: match.character.currentLevel,
        levelTo: character.currentLevel,
        formatVersionFrom: match.character.formatVersion,
        formatVersionTo: character.formatVersion,
      },
    }
  }
  if (existing.some((r) => r.characterId === character.meta.characterId)) {
    return { kind: 'variant', characterId: character.meta.characterId }
  }
  return { kind: 'new' }
}
