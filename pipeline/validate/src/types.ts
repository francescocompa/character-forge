export type IssueLayer = 'schema' | 'referential' | 'markup' | 'sanity'
export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  layer: IssueLayer
  severity: IssueSeverity
  /** Dot/bracket path into the file, e.g. `spellcasting.spells[0].origin`. `(root)`/`(file)` for whole-file issues. */
  path: string
  message: string
}

export type FileKind = 'character' | 'session'

export interface ValidationResult {
  file: string
  kind: FileKind
  /** True iff there are no errors. Warnings do not affect validity. */
  valid: boolean
  errorCount: number
  warningCount: number
  issues: ValidationIssue[]
}
