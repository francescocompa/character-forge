import { IdentityStrip } from './IdentityStrip'
import { AbilityRail, SavesBlock, SkillsBlock } from './Abilities'
import { DefenseBlock } from './Defense'
import { DefensesBlock, SensesBlock } from './Defenses'
import { ResourcesPanel } from './Resources'
import { AttacksPanel } from './Attacks'
import { ActionsSlot } from './ActionsSlot'
import './mainSheet.css'

/**
 * The main sheet (T08): the at-a-glance state of the character, rendered from a
 * compiled `CharacterFile`. Desktop lays the blocks into a multi-column
 * dashboard (abilities rail + central columns); mobile stacks them in
 * at-table-frequency order (HP/resources first). Content visibility follows the
 * global view mode via `CharacterProvider`.
 */
export function MainSheet() {
  return (
    <div className="main-sheet">
      <IdentityStrip />
      <div className="main-sheet__grid">
        <div className="main-sheet__rail">
          <AbilityRail />
          <SavesBlock />
        </div>
        <div className="main-sheet__col main-sheet__col--tempo">
          <DefenseBlock />
          <ResourcesPanel />
          <AttacksPanel />
          <ActionsSlot />
        </div>
        <div className="main-sheet__col main-sheet__col--detail">
          <SkillsBlock />
          <DefensesBlock />
          <SensesBlock />
        </div>
      </div>
    </div>
  )
}
