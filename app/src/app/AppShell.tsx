import { useState } from 'react'
import type { CharacterFile } from '@character-forge/schema/types.ts'
import { LibraryProvider } from '../library'
import { CharacterProvider, useCharacter } from '../character/CharacterProvider'
import { SessionProvider } from '../session/SessionProvider'
import { MainSheet } from '../views/MainSheet'
import { Features } from '../views/Features'
import { Spells } from '../views/Spells'
import { Equipment } from '../views/Equipment'
import './appShell.css'

type Tab = 'main' | 'features' | 'spells' | 'equipment' | 'companion'

const TABS: { id: Tab; label: string; ready?: boolean }[] = [
  { id: 'main', label: 'Main', ready: true },
  { id: 'features', label: 'Features', ready: true },
  { id: 'spells', label: 'Spells', ready: true },
  { id: 'equipment', label: 'Equipment', ready: true },
  { id: 'companion', label: 'Companion' },
]

/** Placeholder for a view that lands in a later Phase-2 task (T09–T12). */
function ComingSoon({ label, task }: { label: string; task: string }) {
  return (
    <div className="coming-soon">
      <h2>{label}</h2>
      <p>Lands in {task}.</p>
    </div>
  )
}

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

function Shell() {
  const { character } = useCharacter()
  const [tab, setTab] = useState<Tab>('main')

  return (
    <div className="app-shell">
      <div className="app-shell__topbar">
        <div className="app-shell__brand">
          <span className="app-shell__title">{character.meta.name}</span>
        </div>
        <ViewModeToggle />
      </div>

      <nav className="app-shell__tabs" role="tablist" aria-label="Sheet sections">
        {TABS.map((t) => (
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
        {tab === 'companion' && <ComingSoon label="Companion" task="T12" />}
      </main>
    </div>
  )
}

/**
 * App root: composes the providers (library popovers → character/view-mode →
 * session store) around the tab shell. One character at a time in v1; T16 adds
 * multi-character + variant switching.
 */
export function AppShell({ character }: { character: CharacterFile }) {
  return (
    <LibraryProvider library={character.library}>
      <CharacterProvider character={character}>
        <SessionProvider character={character}>
          <Shell />
        </SessionProvider>
      </CharacterProvider>
    </LibraryProvider>
  )
}
