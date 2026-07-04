import { useState } from 'react'
import { useCharacter } from '../../character/CharacterProvider'
import { CompanionSwitcher } from './CompanionSwitcher'
import { CompanionIdentity } from './CompanionIdentity'
import { CompanionAbilityRail, CompanionSaves, CompanionSkills } from './CompanionAbilities'
import { CompanionDefense } from './CompanionDefense'
import { CompanionDefenses } from './CompanionDefenses'
import { CompanionAttacks } from './CompanionAttacks'
import { CompanionFeatures } from './CompanionFeatures'
import './companion.css'

/**
 * Companion view (T12): a full mini-sheet per companion (familiars,
 * sidekicks) — same conventions as the main sheet (ability colors, markup
 * summaries, popovers, interactive trackers). A switcher appears only with
 * more than one companion; AppShell hides the whole tab at zero. Each
 * companion's session state is namespaced under its own id, independent of
 * the main character and of any other companion.
 */
export function Companion() {
  const { character } = useCharacter()
  const companions = character.companions ?? []
  const [activeId, setActiveId] = useState(companions[0]?.id)

  if (companions.length === 0) return null
  const active = companions.find((c) => c.id === activeId) ?? companions[0]

  return (
    <div className="companion-view">
      <CompanionSwitcher companions={companions} activeId={active.id} onSelect={setActiveId} />
      <CompanionIdentity companion={active} />
      <div className="companion-view__grid">
        <div className="companion-view__col">
          <CompanionAbilityRail companion={active} />
          <CompanionSaves companion={active} />
          <CompanionSkills companion={active} />
        </div>
        <div className="companion-view__col">
          <CompanionDefense companion={active} />
          <CompanionAttacks companion={active} />
        </div>
        <div className="companion-view__col">
          <CompanionFeatures companion={active} />
          <CompanionDefenses companion={active} />
        </div>
      </div>
    </div>
  )
}
