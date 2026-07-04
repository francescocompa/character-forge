import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSessionState } from '../../session/SessionProvider'
import { lbToKg } from '../MainSheet/format'
import { pushDragLiftLb, totalCarriedWeightLb } from './equipmentHelpers'

function WeightStat({ label, lb }: { label: string; lb: number }) {
  return (
    <div className="weight-stat">
      <span className="stat__label">{label}</span>
      <span className="weight-stat__value">
        {lb} lb <span className="weight-stat__kg">({lbToKg(lb)} kg)</span>
      </span>
    </div>
  )
}

/**
 * Weight & capacity (T11 IA): total carried weight (session-aware — un-carried
 * items don't count), the file's compiled capacity, and push/drag/lift (2x
 * capacity, SRD baseline) — all shown in lb and kg (scope §2.6, D15 #8).
 * Arithmetic only, no rules engine.
 */
export function CapacityPanel() {
  const { character, currentLevel } = useCharacter()
  const { loadout } = useSessionState()
  const items = character.equipment?.items ?? []
  const capacityLb = character.equipment?.carryingCapacity?.lb
  const totalLb = totalCarriedWeightLb(items, currentLevel, loadout.equipped)

  return (
    <section className="panel capacity" aria-label="Weight and carrying capacity">
      <h2 className="panel__title">Weight &amp; capacity</h2>
      <div className="capacity__grid">
        <WeightStat label="Carried" lb={totalLb} />
        {capacityLb !== undefined && (
          <>
            <WeightStat label="Capacity" lb={capacityLb} />
            <WeightStat label="Push / drag / lift" lb={pushDragLiftLb(capacityLb)} />
          </>
        )}
      </div>
      {character.equipment?.carryingCapacity?.note && (
        <span className="capacity__note">
          <MarkupText source={character.equipment.carryingCapacity.note} />
        </span>
      )}
    </section>
  )
}
