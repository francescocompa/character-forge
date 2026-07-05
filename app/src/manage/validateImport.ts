import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import characterSchema from '@character-forge/schema/character.schema.json'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { checkReferentialIntegrity } from '@character-forge/validate/referential.ts'
import { formatAjvErrors } from '@character-forge/validate/paths.ts'
import type { ValidationIssue } from '@character-forge/validate/types.ts'

/**
 * In-app import validation (T16): the same ajv schema pass (layer 1) and
 * referential-integrity pass (layer 2) the validator CLI runs, reused verbatim
 * from `@character-forge/validate` so the app and the pipeline can never drift.
 * Markup-lint and sanity (layers 3–4) are compile-time concerns and are skipped
 * here — a hand-imported file only needs to be structurally sound and
 * self-referential to render safely.
 */

// Same ajv configuration as pipeline/validate (strict, all errors) so friendly
// messages match the CLI. Compiled once at module load.
const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true })
addFormats(ajv)
const validateSchema: ValidateFunction = ajv.compile(characterSchema)

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Layer 2 assumes the shape below; skip it if layer 1 failed structurally (mirrors validate.ts). */
function hasMinimalCharacterShape(v: unknown): v is CharacterFile {
  return (
    isPlainObject(v) &&
    isPlainObject(v.chassis) &&
    isPlainObject(v.library) &&
    isPlainObject(v.meta)
  )
}

/** Run layers 1–2 against a parsed value; returns every issue (errors + warnings). */
export function validateImportedCharacter(file: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!validateSchema(file)) issues.push(...formatAjvErrors(validateSchema.errors ?? []))
  if (!hasMinimalCharacterShape(file)) return issues
  issues.push(...checkReferentialIntegrity(file))
  return issues
}

export type { ValidationIssue }
