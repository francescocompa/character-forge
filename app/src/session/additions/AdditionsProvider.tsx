import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Addition } from '@character-forge/schema/types.ts'
import { AddDialog } from './AddDialog'
import type { AdditionKind } from './additionDraft'

/**
 * One add/edit dialog for the whole sheet (T15). Views trigger it through
 * {@link useAdditions} — the "+" affordance in the shell opens a fresh form; a
 * row's edit button opens the same form pre-filled — so there's a single modal
 * mounted, not one per view.
 */
interface AdditionsContextValue {
  openAdd: (kind?: AdditionKind) => void
  openEdit: (addition: Addition) => void
}

const AdditionsContext = createContext<AdditionsContextValue | null>(null)

export function useAdditions(): AdditionsContextValue {
  const ctx = useContext(AdditionsContext)
  if (!ctx) throw new Error('useAdditions must be used within an AdditionsProvider')
  return ctx
}

type DialogState = { mode: 'add'; kind: AdditionKind } | { mode: 'edit'; addition: Addition } | null

export function AdditionsProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null)

  const value = useMemo<AdditionsContextValue>(
    () => ({
      openAdd: (kind = 'item') => setDialog({ mode: 'add', kind }),
      openEdit: (addition) => setDialog({ mode: 'edit', addition }),
    }),
    [],
  )

  return (
    <AdditionsContext.Provider value={value}>
      {children}
      {dialog && (
        <AddDialog
          editing={dialog.mode === 'edit' ? dialog.addition : undefined}
          initialKind={dialog.mode === 'add' ? dialog.kind : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </AdditionsContext.Provider>
  )
}
