import { useState } from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { LibraryProvider } from '../library'
import { CharacterProvider, useCharacter } from '../character/CharacterProvider'
import { SessionProvider, useSession } from '../session/SessionProvider'
import { AdditionsProvider, useAdditions, downloadSession } from '../session/additions'
import { MainSheet } from '../views/MainSheet'
import { Features } from '../views/Features'
import { Spells } from '../views/Spells'
import { Equipment } from '../views/Equipment'
import { Companion } from '../views/Companion'
import './appShell.css'

type Tab = 'main' | 'features' | 'spells' | 'equipment' | 'companion'

const TABS: { id: Tab; label: string }[] = [
  { id: 'main', label: 'Main' },
  { id: 'features', label: 'Features' },
  { id: 'spells', label: 'Spells' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'companion', label: 'Companion' },
]

/** The global Level/Build view-mode switch (D14). Lives in the shell, drives all views. */
function ViewModeToggle() {
  const { viewMode, setViewMode } = useCharacter()
  return (
    <div className="view-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        className={`view-toggle__btn ${viewMode === 'level' ? 'is-active' : ''}`}
        aria-pressed={viewMode === 'level'}
        onClick={() => setViewMode('level')}
      >
        Level
      </button>
      <button
        type="button"
        className={`view-toggle__btn ${viewMode === 'build' ? 'is-active' : ''}`}
        aria-pressed={viewMode === 'build'}
        onClick={() => setViewMode('build')}
      >
        Build
      </button>
    </div>
  )
}

/** In-session actions: add a boon/item/note, or export the session file (D2, T15). */
function SessionActions() {
  const { character } = useCharacter()
  const { openAdd } = useAdditions()
  const store = useSession()
  return (
    <div className="app-shell__actions">
      <button
        type="button"
        className="shell-btn shell-btn--add"
        aria-label="Add item, boon, or note"
        onClick={() => openAdd()}
      >
        + Add
      </button>
      <button
        type="button"
        className="shell-btn"
        onClick={() => downloadSession(character, store.getState())}
      >
        Export session
      </button>
    </div>
  )
}

/** Chip-row switcher between a character's variants (D12); only shown when there's more than one. */
function VariantSwitcher({
  variants,
  activeKey,
  onSelect,
}: {
  variants: VariantOption[]
  activeKey: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="variant-switcher" role="group" aria-label="Variant">
      {variants.map((v) => (
        <button
          key={v.key}
          type="button"
          className={`variant-chip ${v.key === activeKey ? 'is-active' : ''}`}
          aria-pressed={v.key === activeKey}
          onClick={() => onSelect(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

function Shell({
  displayName,
  onBack,
  variants,
  activeVariantKey,
  onSelectVariant,
}: ShellChromeProps) {
  const { character } = useCharacter()
  const [tab, setTab] = useState<Tab>('main')
  const hasCompanions = (character.companions?.length ?? 0) > 0
  const tabs = TABS.filter((t) => t.id !== 'companion' || hasCompanions)

  return (
    <div className="app-shell">
      <div className="app-shell__topbar">
        <div className="app-shell__brand">
          {onBack && (
            <button type="button" className="app-shell__back" onClick={onBack}>
              ‹ Characters
            </button>
          )}
          <span className="app-shell__title">{displayName ?? character.meta.name}</span>
        </div>
        <div className="app-shell__topbar-tools">
          <SessionActions />
          <ViewModeToggle />
        </div>
      </div>

      {variants && activeVariantKey && onSelectVariant && (
        <VariantSwitcher
          variants={variants}
          activeKey={activeVariantKey}
          onSelect={onSelectVariant}
        />
      )}

      <nav className="app-shell__tabs" role="tablist" aria-label="Sheet sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`app-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-shell__view">
        {tab === 'main' && <MainSheet />}
        {tab === 'features' && <Features />}
        {tab === 'spells' && <Spells />}
        {tab === 'equipment' && <Equipment />}
        {tab === 'companion' && hasCompanions && <Companion />}
      </main>
    </div>
  )
}

interface VariantOption {
  key: string
  label: string
}

interface ShellChromeProps {
  /** Character display name (alias, T16); falls back to the file's `meta.name`. */
  displayName?: string
  /** Present when opened from the library (T16): renders a Back-to-list control. */
  onBack?: () => void
  /** More than one build → a variant switcher chip row (D12). */
  variants?: VariantOption[]
  activeVariantKey?: string
  onSelectVariant?: (key: string) => void
}

export interface AppShellProps extends ShellChromeProps {
  character: CharacterFile
}

/**
 * The opened character: composes the providers (library popovers →
 * character/view-mode → session store) around the tab shell. Standalone by
 * default; the library (T16) passes the management chrome props to add a Back
 * control and a variant switcher.
 */
export function AppShell({ character, ...chrome }: AppShellProps) {
  return (
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character}>
        <SessionProvider character={character}>
          <AdditionsProvider>
            <Shell {...chrome} />
          </AdditionsProvider>
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>
  )
}
