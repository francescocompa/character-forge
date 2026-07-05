import type { Addition } from '@character-forge/schema/types.ts'
import { useSession } from '../SessionProvider'
import { useAdditions } from './AdditionsProvider'

/** The subtle "session" marker every addition wears so it reads as play-time, not build. */
export function SessionMarker() {
  return (
    <span className="session-marker" title="Added this session">
      session
    </span>
  )
}

/** Edit / remove affordances shared by every addition row. */
export function AdditionControls({ addition }: { addition: Addition }) {
  const store = useSession()
  const { openEdit } = useAdditions()
  return (
    <span className="addition-controls">
      <button
        type="button"
        className="addition-btn"
        aria-label={`Edit ${addition.name || 'note'}`}
        onClick={() => openEdit(addition)}
      >
        Edit
      </button>
      <button
        type="button"
        className="addition-btn addition-btn--remove"
        aria-label={`Remove ${addition.name || 'note'}`}
        onClick={() => store.removeAddition(addition.id)}
      >
        Remove
      </button>
    </span>
  )
}
