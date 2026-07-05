import { MarkupText } from '../../library'
import { useSessionState } from '../SessionProvider'
import { AdditionControls, SessionMarker } from './AdditionControls'

/**
 * Session notes (T15): free-text jottings added at the table, shown as a small
 * card on the main sheet. Renders sheet-markup so a quick `{cond:frightened}` or
 * `{dmg:fire|2d6}` note still reads with its colors.
 */
export function SessionNotesCard() {
  const { additions } = useSessionState()
  const notes = (additions ?? []).filter((a) => a.kind === 'note')
  if (notes.length === 0) return null
  return (
    <section className="panel session-notes" aria-label="Session notes">
      <div className="session-notes__head">
        <h2 className="panel__title">Notes</h2>
        <SessionMarker />
      </div>
      <ul className="session-notes__list">
        {notes.map((note) => (
          <li key={note.id} className="session-note">
            <div className="session-note__body">
              <MarkupText source={note.summary ?? note.name} />
            </div>
            <AdditionControls addition={note} />
          </li>
        ))}
      </ul>
    </section>
  )
}
