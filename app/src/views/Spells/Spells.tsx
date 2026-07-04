import { useState } from 'react'
import { useCharacter } from '../../character/CharacterProvider'
import { CastingHeaders } from './CastingHeaders'
import { ManageMode } from './ManageMode'
import { SlotPoolsPanel } from './SlotPools'
import { SpellList } from './SpellList'
import './spells.css'

type Mode = 'play' | 'manage'

/**
 * Spells view (T10): casting headers per source, slot pips per pool, the
 * clean play list, and the D13 prepare/manage mode toggle. All visibility
 * (Level/Build) comes from `CharacterProvider`; all selection state from the
 * `SessionStore` (stubbed until T14) — no local mode logic beyond the
 * play/manage switch, which is this view's own concern (T09 precedent).
 */
export function Spells() {
  const { character } = useCharacter()
  const [mode, setMode] = useState<Mode>('play')
  const hasPreparablePool = Object.values(character.pools ?? {}).some((p) => p.kind === 'preparedSpells')

  if (!character.spellcasting) {
    return (
      <div className="spells-view">
        <p className="spells-empty">This character doesn't cast spells.</p>
      </div>
    )
  }

  return (
    <div className="spells-view">
      <div className="spells-view__toolbar">
        <h1 className="spells-view__title">Spells</h1>
        {hasPreparablePool && (
          <button
            type="button"
            className={`manage-toggle ${mode === 'manage' ? 'is-active' : ''}`}
            onClick={() => setMode((m) => (m === 'play' ? 'manage' : 'play'))}
          >
            {mode === 'play' ? 'Manage spells' : '‹ Back to sheet'}
          </button>
        )}
      </div>

      <CastingHeaders />

      {mode === 'manage' ? (
        <ManageMode />
      ) : (
        <>
          <SlotPoolsPanel />
          <SpellList />
        </>
      )}
    </div>
  )
}
