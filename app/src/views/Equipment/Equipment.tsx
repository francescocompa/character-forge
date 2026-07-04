import { AttunementPanel } from './AttunementPanel'
import { CapacityPanel } from './CapacityPanel'
import { CurrencyPanel } from './CurrencyPanel'
import { GearPanel } from './GearPanel'
import { MasteriesPanel } from './MasteriesPanel'
import './equipment.css'

/**
 * Equipment view (T11): gear/components/magic items (grouped by the library
 * extract's `type`, with in-session found items rendered inline), the
 * weapon-masteries manage flow, attunement slots, weight & capacity (lb + kg,
 * push/drag/lift), and an editable currency panel. All visibility (Level/
 * Build) comes from `CharacterProvider`; all live state (equipped/carried,
 * mastery selection, currency) from the `SessionStore`.
 */
export function Equipment() {
  return (
    <div className="equipment-view">
      <GearPanel />
      <MasteriesPanel />
      <AttunementPanel />
      <CapacityPanel />
      <CurrencyPanel />
    </div>
  )
}
