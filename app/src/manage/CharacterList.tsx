import { useRef, useState } from 'react'
import { SAMPLE_CHARACTERS } from '../character/characterFile'
import { useCharacterLibrary } from './CharacterLibraryProvider'
import { useCharacterImport } from './useCharacterImport'
import { CharacterCard } from './CharacterCard'
import { ImportDialog } from './ImportDialog'
import { ManageDialog } from './ManageDialog'
import type { CharacterGroup } from './group'
import './manage.css'

/**
 * The library screen (T16): the grid of character cards, or a plain-words empty
 * state. Owns the import flow (picker button + whole-screen drag-drop, sharing
 * one dialog) and the manage dialog. Selecting a card opens the tab shell.
 */
export function CharacterList() {
  const { groups, saveCharacter, select } = useCharacterLibrary()
  const { importFiles, commit, dialog, dismiss, busy } = useCharacterImport()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [managing, setManaging] = useState<CharacterGroup | null>(null)

  const empty = groups.length === 0

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) void importFiles(e.dataTransfer.files)
  }

  const loadSample = async () => {
    for (const character of SAMPLE_CHARACTERS) await saveCharacter(character)
  }

  // The refresh dialog is the only one with a confirm action.
  const confirm = () => {
    if (dialog?.kind === 'refresh') void commit(dialog.character)
  }

  return (
    <div
      className={`cf-library ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer leaves the library, not a child.
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="cf-visually-hidden"
        onChange={(e) => {
          if (e.target.files) void importFiles(e.target.files)
          e.target.value = '' // allow re-importing the same filename
        }}
      />

      <header className="cf-library__head">
        <h1 className="cf-library__title">Your characters</h1>
        <button
          type="button"
          className="mng-btn mng-btn--primary"
          onClick={() => inputRef.current?.click()}
        >
          Import character
        </button>
      </header>

      {empty ? (
        <div className="cf-empty">
          <p className="cf-empty__lead">No characters yet.</p>
          <p className="cf-empty__body">
            Import a character file (<code>.character.json</code>) that Claude compiled for you —
            tap <strong>Import character</strong> and pick it from Files, or drag it onto this
            window. On iPhone, the file lives in your Google Drive folder in the Files app.
          </p>
          <button
            type="button"
            className="mng-btn mng-btn--ghost"
            onClick={() => void loadSample()}
          >
            Load a sample character
          </button>
        </div>
      ) : (
        <div className="cf-grid">
          {groups.map((group) => (
            <CharacterCard
              key={group.characterId}
              group={group}
              onOpen={() => select(group.characterId)}
              onManage={() => setManaging(group)}
            />
          ))}
        </div>
      )}

      <div className="cf-dropveil" aria-hidden={!dragging}>
        <span>Drop to import</span>
      </div>

      {dialog && (
        <ImportDialog state={dialog} onConfirm={confirm} onDismiss={dismiss} busy={busy} />
      )}
      {managing && (
        <ManageDialog
          // Re-resolve from the live list so it reflects deletes/renames.
          group={groups.find((g) => g.characterId === managing.characterId) ?? managing}
          onClose={() => setManaging(null)}
        />
      )}
    </div>
  )
}
