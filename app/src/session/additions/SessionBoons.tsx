import type { Addition } from '@character-forge/schema/types.ts'
import { MarkupText } from '../../library'
import { CollapsibleSection } from '../../views/Features/CollapsibleSection'
import { RecoverBadges } from '../../views/MainSheet/Resources'
import { TickBoxes } from '../../views/MainSheet/Ticks'
import { useSession, useSessionState } from '../SessionProvider'
import { AdditionControls, SessionMarker } from './AdditionControls'

/** Limited-use ticks for a boon addition — the same "fill to here" gesture as any resource. */
function BoonTicks({
  addition,
}: {
  addition: Addition & { limitedUse: NonNullable<Addition['limitedUse']> }
}) {
  const store = useSession()
  const { trackers } = useSessionState()
  const total = addition.limitedUse.max
  const used = trackers.additions?.[addition.id]?.used ?? 0
  const setTo = (target: number) => {
    let current = used
    while (current < target) {
      store.tickAddition(addition.id)
      current++
    }
    while (current > target) {
      store.untickAddition(addition.id)
      current--
    }
  }
  return (
    <div className="boon__track">
      <TickBoxes total={total} used={used} label={`${addition.name} uses`} onSet={setTo} />
      <RecoverBadges recover={addition.limitedUse.recover} />
    </div>
  )
}

function BoonRow({ addition }: { addition: Addition }) {
  return (
    <li className="boon">
      <div className="boon__head">
        <span className="boon__name">{addition.name}</span>
        <SessionMarker />
        <AdditionControls addition={addition} />
      </div>
      {addition.summary && (
        <div className="boon__summary">
          <MarkupText source={addition.summary} />
        </div>
      )}
      {addition.limitedUse && (
        <BoonTicks addition={{ ...addition, limitedUse: addition.limitedUse }} />
      )}
    </li>
  )
}

/**
 * In-session boons (T15): DM grants and found powers, rendered in Features
 * alongside compiled features. Limited-use boons carry their own ticks and
 * recover on the matching rest, just like any resource.
 */
export function SessionBoonsSection() {
  const { additions } = useSessionState()
  const boons = (additions ?? []).filter((a) => a.kind === 'boon')
  if (boons.length === 0) return null
  return (
    <CollapsibleSection title="Session boons" className="session-boons">
      <ul className="boon-list">
        {boons.map((b) => (
          <BoonRow key={b.id} addition={b} />
        ))}
      </ul>
    </CollapsibleSection>
  )
}
