import { useCallback, useMemo, useState } from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import type { ValidationIssue } from './validateImport'
import { classifyImport, parseImport, type RefreshChange } from './importCharacter'
import { useCharacterLibrary } from './CharacterLibraryProvider'

/** The modal the import flow surfaces; null when nothing needs the user. */
export type ImportDialogState =
  | { kind: 'invalid'; fileName: string; issues: ValidationIssue[] }
  | { kind: 'unsupported'; fileName: string; version: number; supported: number }
  | { kind: 'refresh'; fileName: string; character: CharacterFile; change: RefreshChange }
  | null

export interface CharacterImport {
  /** Import the first JSON file from a picker or a drop; opens a dialog when the user must decide. */
  importFiles: (files: FileList | File[]) => Promise<void>
  /** Store an already-parsed character (used by the refresh confirm and the sample loader). */
  commit: (character: CharacterFile, opened?: boolean) => Promise<void>
  dialog: ImportDialogState
  dismiss: () => void
  busy: boolean
}

function pickJsonFile(files: FileList | File[]): File | undefined {
  const list = Array.from(files)
  return list.find((f) => /\.json$/i.test(f.name) || f.type.includes('json')) ?? list[0]
}

/**
 * The import state machine (T16), shared by the picker button and the drop
 * zone: read a file → parse + validate + version-gate → classify against the
 * library → either commit silently (new character / new variant) or raise a
 * dialog (invalid, too-new, or a refresh that needs confirming). Kept as a hook
 * so one instance owns the dialog for a whole screen.
 */
export function useCharacterImport(): CharacterImport {
  const { groups, saveCharacter, select } = useCharacterLibrary()
  const [dialog, setDialog] = useState<ImportDialogState>(null)
  const [busy, setBusy] = useState(false)

  const existing = useMemo(() => groups.flatMap((g) => g.variants), [groups])

  const commit = useCallback(
    async (character: CharacterFile, opened = false) => {
      setBusy(true)
      try {
        await saveCharacter(character)
        if (opened) select(character.meta.characterId)
      } finally {
        setBusy(false)
        setDialog(null)
      }
    },
    [saveCharacter, select],
  )

  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = pickJsonFile(files)
      if (!file) return
      let text: string
      try {
        text = await file.text()
      } catch {
        setDialog({
          kind: 'invalid',
          fileName: file.name,
          issues: [
            {
              layer: 'schema',
              severity: 'error',
              path: '(file)',
              message: 'Could not read the file.',
            },
          ],
        })
        return
      }

      const result = parseImport(text)
      if (result.status === 'invalid') {
        setDialog({ kind: 'invalid', fileName: file.name, issues: result.issues })
        return
      }
      if (result.status === 'unsupported-version') {
        setDialog({
          kind: 'unsupported',
          fileName: file.name,
          version: result.version,
          supported: result.supported,
        })
        return
      }

      const classification = classifyImport(result.character, existing)
      if (classification.kind === 'refresh') {
        setDialog({
          kind: 'refresh',
          fileName: file.name,
          character: result.character,
          change: classification.change,
        })
        return
      }
      await commit(result.character)
    },
    [existing, commit],
  )

  return { importFiles, commit, dialog, dismiss: () => setDialog(null), busy }
}
