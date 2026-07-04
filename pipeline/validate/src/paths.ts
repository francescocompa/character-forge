import type { ErrorObject } from 'ajv'
import type { ValidationIssue } from './types.ts'

/** Appends an array index or object key to a dot/bracket path. */
export function joinPath(base: string, segment: string | number): string {
  if (typeof segment === 'number') return `${base}[${segment}]`
  return base ? `${base}.${segment}` : segment
}

/** Converts an ajv `instancePath` (e.g. `/chassis/classes/1/ref`) to `chassis.classes[1].ref`. */
function friendlyInstancePath(instancePath: string): string {
  return instancePath
    .split('/')
    .filter(Boolean)
    .reduce((acc, segment) => joinPath(acc, /^\d+$/.test(segment) ? Number(segment) : segment), '')
}

export function formatAjvErrors(errors: ErrorObject[]): ValidationIssue[] {
  return errors.map((err) => {
    let path = friendlyInstancePath(err.instancePath)
    if (err.keyword === 'required' && typeof err.params.missingProperty === 'string') {
      path = joinPath(path, err.params.missingProperty)
    }
    if (
      err.keyword === 'additionalProperties' &&
      typeof err.params.additionalProperty === 'string'
    ) {
      path = joinPath(path, err.params.additionalProperty)
    }
    return {
      layer: 'schema',
      severity: 'error',
      path: path || '(root)',
      message: err.message ?? 'schema validation failed',
    }
  })
}
