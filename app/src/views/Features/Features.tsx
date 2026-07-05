import { useCharacter } from '../../character/CharacterProvider'
import { SessionBoonsSection } from '../../session/additions'
import { ClassSection } from './ClassSection'
import { SpeciesSection } from './SpeciesSection'
import { BackgroundSection } from './BackgroundSection'
import { FeatsSection } from './FeatsSection'
import { groupProgression } from './group'
import './features.css'

/**
 * Features view (T09): everything the build grants, page-2-of-the-sheet style —
 * one section per class (proficiency header line, then core/subclass/known-
 * option sub-lists), species traits, background (+ its feat), and a top-level
 * Feats section for feat/ASI choices. View mode (Level/Build) and visibility
 * all come from `CharacterProvider` — no local mode logic (T09 constraint).
 */
export function Features() {
  const { character } = useCharacter()
  const groups = groupProgression(character)
  const backgroundFeat = groups.feats.filter((f) => !f.classRef)

  return (
    <div className="features-view">
      {groups.classes.map((group) => (
        <ClassSection key={group.classEntry.ref} group={group} />
      ))}
      <SpeciesSection traits={groups.speciesTraits} />
      <BackgroundSection backgroundFeat={backgroundFeat} />
      <FeatsSection feats={groups.feats} />
      <SessionBoonsSection />
    </div>
  )
}
