import { parseMarkup } from '@character-forge/schema/markup.ts'
import type { ValidationIssue } from './types.ts'
import { walkStrings } from './walk.ts'

/** Layer 3: run every string field through the sheet-markup parser and surface its diagnostics. */
export function lintMarkup(file: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  walkStrings(file, '', (path, value) => {
    const { diagnostics } = parseMarkup(value)
    for (const d of diagnostics) {
      issues.push({
        layer: 'markup',
        severity: d.severity,
        path: path || '(root)',
        message: `${d.message} (in "${d.source}")`,
      })
    }
  })
  return issues
}
