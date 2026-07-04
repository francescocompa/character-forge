/**
 * Reserved region for the actions/attacks economy panel, built by T13. Kept as a
 * clean component boundary so T13 drops its panel in without touching the rest
 * of the main sheet. Renders nothing structural yet — just a labelled slot.
 */
export function ActionsSlot() {
  return (
    <section className="panel actions-slot" aria-label="Actions" data-slot="t13-actions">
      <h2 className="panel__title">Actions</h2>
      <p className="actions-slot__placeholder">Action economy panel — T13.</p>
    </section>
  )
}
