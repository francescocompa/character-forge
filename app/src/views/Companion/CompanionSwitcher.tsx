import type { CompanionSheet } from '@character-forge/schema/types.ts'

/** Companion picker — renders only with more than one companion (T12 IA). */
export function CompanionSwitcher({
  companions,
  activeId,
  onSelect,
}: {
  companions: CompanionSheet[]
  activeId: string
  onSelect: (id: string) => void
}) {
  if (companions.length <= 1) return null
  return (
    <div className="companion-switcher" role="tablist" aria-label="Companion">
      {companions.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === activeId}
          className={`companion-switcher__btn ${c.id === activeId ? 'is-active' : ''}`}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
