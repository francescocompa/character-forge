import type { Ability } from '@character-forge/schema/types.ts'
import { ABILITY_COLOR, ABILITY_SOFT } from '../../components/chips/colorMaps'
import type { CSSVarStyle } from '../../components/chips/css-vars'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { rollCheck, rollableProps } from '../../dice'
import { ABILITY_ORDER, signed } from './format'

function abilityStyle(ability: Ability): CSSVarStyle {
  return { '--chip-fg': ABILITY_COLOR[ability], '--chip-bg': ABILITY_SOFT[ability] }
}

/** The six ability scores: big modifier + score, ability-colored, optional provenance note. */
export function AbilityRail() {
  const { character } = useCharacter()
  return (
    <section className="abilities" aria-label="Ability scores">
      {ABILITY_ORDER.map((ability) => {
        const score = character.abilities[ability]
        return (
          <div
            key={ability}
            style={abilityStyle(ability)}
            {...rollableProps(
              (mode) => rollCheck(`${ability} check`, score.modifier, { mode, isAttack: false }),
              { className: 'ability', label: `Roll ${ability} check` },
            )}
          >
            <span className="ability__abbr">{ability}</span>
            <span className="ability__mod">{signed(score.modifier)}</span>
            <span className="ability__score">{score.final}</span>
            {score.note && (
              <span className="ability__note">
                <MarkupText source={score.note} />
              </span>
            )}
          </div>
        )
      })}
    </section>
  )
}

export const PROF_LABEL: Record<string, string> = {
  none: 'Not proficient',
  half: 'Half proficiency',
  proficient: 'Proficient',
  expertise: 'Expertise',
}

/** Proficiency/expertise marker dot, shared with the Companion view (T12). */
export function ProficiencyDot({ level }: { level: keyof typeof PROF_LABEL }) {
  return (
    <span className={`prof-dot prof-dot--${level}`} role="img" aria-label={PROF_LABEL[level]} />
  )
}

/** Saving throws: ability-colored, with a proficiency marker and final modifier. */
export function SavesBlock() {
  const { character } = useCharacter()
  // Present saves in canonical ability order regardless of file order.
  const byAbility = new Map(character.stats.saves.map((s) => [s.ability, s]))
  return (
    <section className="panel saves" aria-label="Saving throws">
      <h2 className="panel__title">Saves</h2>
      <ul className="saves__list">
        {ABILITY_ORDER.map((ability) => {
          const save = byAbility.get(ability)
          if (!save) return null
          return (
            <li
              key={ability}
              style={abilityStyle(ability)}
              {...rollableProps(
                (mode) => rollCheck(`${ability} save`, save.modifier, { mode, isAttack: false }),
                { className: 'save-row', label: `Roll ${ability} saving throw` },
              )}
            >
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

/** Skills: proficiency/expertise dot, ability tint, final modifier; plus passives. */
export function SkillsBlock() {
  const { character } = useCharacter()
  const { skills, passives } = character.stats
  return (
    <section className="panel skills" aria-label="Skills">
      <h2 className="panel__title">Skills</h2>
      <ul className="skills__list">
        {skills.map((skill) => (
          <li
            key={skill.name}
            style={{ '--chip-fg': ABILITY_COLOR[skill.ability] } as CSSVarStyle}
            {...rollableProps(
              (mode) => rollCheck(skill.name, skill.modifier, { mode, isAttack: false }),
              { className: 'skill-row', label: `Roll ${skill.name}` },
            )}
          >
            <ProficiencyDot level={skill.proficiency} />
            <span className="skill-row__name">{skill.name}</span>
            <span className="skill-row__abil">{skill.ability}</span>
            <span className="skill-row__mod">{signed(skill.modifier)}</span>
          </li>
        ))}
      </ul>
      {passives && (
        <ul className="passives">
          {passives.perception !== undefined && (
            <li>
              <span className="passives__label">Passive perception</span>
              <span className="passives__value">{passives.perception}</span>
            </li>
          )}
          {passives.investigation !== undefined && (
            <li>
              <span className="passives__label">Passive investigation</span>
              <span className="passives__value">{passives.investigation}</span>
            </li>
          )}
          {passives.insight !== undefined && (
            <li>
              <span className="passives__label">Passive insight</span>
              <span className="passives__value">{passives.insight}</span>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}
