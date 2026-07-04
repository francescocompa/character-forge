import type { Ability, CompanionSheet } from '@character-forge/schema/types.ts'
import { ABILITY_COLOR, ABILITY_SOFT } from '../../components/chips/colorMaps'
import type { CSSVarStyle } from '../../components/chips/css-vars'
import { ABILITY_ORDER, signed } from '../MainSheet/format'
import { ProficiencyDot } from '../MainSheet/Abilities'

function abilityStyle(ability: Ability): CSSVarStyle {
  return { '--chip-fg': ABILITY_COLOR[ability], '--chip-bg': ABILITY_SOFT[ability] }
}

/** The six ability scores, ability-colored — same rail styling as the main sheet (T08). */
export function CompanionAbilityRail({ companion }: { companion: CompanionSheet }) {
  return (
    <section className="abilities" aria-label={`${companion.name} ability scores`}>
      {ABILITY_ORDER.map((ability) => {
        const score = companion.abilities[ability]
        return (
          <div key={ability} className="ability" style={abilityStyle(ability)}>
            <span className="ability__abbr">{ability}</span>
            <span className="ability__mod">{signed(score.modifier)}</span>
            <span className="ability__score">{score.final}</span>
          </div>
        )
      })}
    </section>
  )
}

/** Saving throws, if the companion sheet defines them (Tiresia does; not every companion will). */
export function CompanionSaves({ companion }: { companion: CompanionSheet }) {
  if (!companion.saves || companion.saves.length === 0) return null
  const byAbility = new Map(companion.saves.map((s) => [s.ability, s]))
  return (
    <section className="panel saves" aria-label={`${companion.name} saving throws`}>
      <h2 className="panel__title">Saves</h2>
      <ul className="saves__list">
        {ABILITY_ORDER.map((ability) => {
          const save = byAbility.get(ability)
          if (!save) return null
          return (
            <li key={ability} className="save-row" style={abilityStyle(ability)}>
              <ProficiencyDot level={save.proficient ? 'proficient' : 'none'} />
              <span className="save-row__abbr">{ability}</span>
              <span className="save-row__mod">{signed(save.modifier)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Skills, if the companion sheet defines them. */
export function CompanionSkills({ companion }: { companion: CompanionSheet }) {
  if (!companion.skills || companion.skills.length === 0) return null
  return (
    <section className="panel skills" aria-label={`${companion.name} skills`}>
      <h2 className="panel__title">Skills</h2>
      <ul className="skills__list">
        {companion.skills.map((skill) => (
          <li
            key={skill.name}
            className="skill-row"
            style={{ '--chip-fg': ABILITY_COLOR[skill.ability] } as CSSVarStyle}
          >
            <ProficiencyDot level={skill.proficiency} />
            <span className="skill-row__name">{skill.name}</span>
            <span className="skill-row__abil">{skill.ability}</span>
            <span className="skill-row__mod">{signed(skill.modifier)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
