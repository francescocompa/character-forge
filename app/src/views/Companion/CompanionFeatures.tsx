import type { CompanionSheet } from '@character-forge/schema/types.ts'
import { RefLink } from '../../components/chips'
import { MarkupText, useLibrary } from '../../library'

/** Feature list (at-will invisibility, shape-shift forms, Magic Resistance…), markup summaries. */
export function CompanionFeatures({ companion }: { companion: CompanionSheet }) {
  const { openRef } = useLibrary()
  const features = companion.features ?? []
  if (features.length === 0) return null
  return (
    <section className="panel" aria-label={`${companion.name} features`}>
      <h2 className="panel__title">Features</h2>
      <ul className="feature-list">
        {features.map((feature, i) => (
          <li key={feature.ref ?? `${feature.name}-${i}`} className="feature-list__item">
            <div className="feature-row">
              <span className="feature-row__name">
                {feature.ref ? (
                  <RefLink label={feature.name} onClick={() => openRef(feature.ref!)} />
                ) : (
                  feature.name
                )}
              </span>
              {feature.summary && (
                <div className="feature-row__summary">
                  <MarkupText source={feature.summary} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
