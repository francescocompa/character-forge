import type { StatValue } from '@character-forge/schema/types.ts'
import { ABILITY_COLOR } from '../../components/chips/colorMaps'
import type { CSSVarStyle } from '../../components/chips/css-vars'
import { MarkupText } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { NumberStepper, TickBoxes } from './Ticks'
import { signed } from './format'

/** Render a compiled stat value verbatim (numbers signed only when asked). */
function statText(stat: StatValue, sign = false): string {
  if (typeof stat.value === 'number') return sign ? signed(stat.value) : String(stat.value)
  return stat.value
}

/**
 * MaxHP override (T03 review item F2): the compiled `stats.maxHp` may be an
 * average/standard value, but Francesco often rolls it (Vice's 26). The
 * session layer lets the player record that rolled/hand-edited total without
 * touching the character file; when set, it — not the compiled value — is
 * what "HP to max" restores on a long rest.
 */
function MaxHpOverrideControl({ compiled }: { compiled: number | undefined }) {
  const store = useSession()
  const { trackers } = useSessionState()
  const override = trackers.maxHpOverride
  if (compiled === undefined) return null
  return (
    <label className="hp-max-override">
      <input
        type="checkbox"
        checked={override !== undefined}
        onChange={(e) => store.setMaxHpOverride(e.target.checked ? compiled : undefined)}
      />
      Rolled/edited max
      {override !== undefined && (
        <input
          type="number"
          className="hp-max-override__input"
          value={override}
          min={1}
          aria-label="Override max HP"
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n) && n >= 1) store.setMaxHpOverride(Math.round(n))
          }}
        />
      )}
      {override !== undefined && <span className="hp-max-override__compiled">compiled: {compiled}</span>}
    </label>
  )
}

/** HP with interactive current/temp, plus death saves. */
function HpBlock() {
  const { character } = useCharacter()
  const store = useSession()
  const { trackers } = useSessionState()
  const maxHp = character.stats.maxHp
  const maxNumeric = typeof maxHp.value === 'number' ? maxHp.value : undefined
  const override = trackers.maxHpOverride
  const effectiveMax = override ?? maxNumeric
  const current = trackers.hp?.current ?? 0
  const temp = trackers.hp?.temp ?? 0
  const successes = trackers.deathSaves?.successes ?? 0
  const failures = trackers.deathSaves?.failures ?? 0

  return (
    <div className="hp-block">
      <div className="hp-block__main">
        <div className="hp-current">
          <span className="stat__label">Hit points</span>
          <div className="hp-current__row">
            <NumberStepper
              value={current}
              label="Current hit points"
              onChange={(v) => store.setCurrentHp(v, { owner: 'character' })}
              min={0}
              max={effectiveMax}
            />
            <span className="hp-current__max">/ {override ?? statText(maxHp)}</span>
          </div>
          {maxHp.note && (
            <span className="stat__note">
              <MarkupText source={maxHp.note} />
            </span>
          )}
          <MaxHpOverrideControl compiled={maxNumeric} />
        </div>
        <div className="hp-temp">
          <span className="stat__label">Temp HP</span>
          <NumberStepper
            value={temp}
            label="Temporary hit points"
            onChange={(v) => store.setTempHp(v, { owner: 'character' })}
            min={0}
          />
        </div>
      </div>
      {/* monster-forge death-save pattern (.hpm-ds): successes (green) left
          of the centred label, failures (red) right; circular pips whose
          border color states each group's meaning before any are filled. */}
      <div className="death-saves">
        <div className="death-saves__grp death-saves__grp--success">
          <TickBoxes
            total={3}
            used={successes}
            tone="remaining"
            label="Death save successes"
            onSet={(t) => store.setDeathSaves(t, failures)}
          />
        </div>
        <span className="death-saves__lbl">Death saves</span>
        <div className="death-saves__grp death-saves__grp--fail">
          <TickBoxes
            total={3}
            used={failures}
            label="Death save failures"
            onSet={(t) => store.setDeathSaves(successes, t)}
          />
        </div>
      </div>
    </div>
  )
}

/** Hit dice per class (Shigen §2.8: 1×d10, 5×d8 tracked separately). */
function HitDiceBlock() {
  const { character, nameOf } = useCharacter()
  const store = useSession()
  const { trackers } = useSessionState()
  const groups = character.stats.hitDice ?? []
  if (groups.length === 0) return null
  return (
    <div className="hit-dice">
      <span className="stat__label">Hit dice</span>
      {groups.map((group) => {
        const spent = trackers.hitDice?.[group.classRef]?.spent ?? 0
        const setTo = (target: number) => {
          let cur = spent
          while (cur < target) {
            store.spendHitDie(group.classRef)
            cur++
          }
          while (cur > target) {
            store.regainHitDie(group.classRef)
            cur--
          }
        }
        return (
          <div key={group.classRef} className="hit-dice__group">
            <span className="hit-dice__die">
              {group.count}
              {group.die}
            </span>
            <span className="hit-dice__class">{nameOf(group.classRef)}</span>
            <TickBoxes
              total={group.count}
              used={spent}
              label={`${nameOf(group.classRef)} hit dice`}
              onSet={setTo}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Save DC + spell attack per casting source (single source of truth, §14 #1). */
function SpellcastingSummary() {
  const { character } = useCharacter()
  const sources = character.spellcasting?.sources ?? []
  if (sources.length === 0) return null
  return (
    <div className="cast-summary">
      <span className="stat__label">Spellcasting</span>
      <ul className="cast-summary__list">
        {sources.map((src) => (
          <li
            key={src.id}
            className="cast-summary__row"
            style={{ '--chip-fg': ABILITY_COLOR[src.ability] } as CSSVarStyle}
          >
            <span className="cast-summary__name">{src.name}</span>
            <span className="cast-summary__stat">
              <span className="cast-summary__k">Save</span> {src.saveDc}
            </span>
            <span className="cast-summary__stat">
              <span className="cast-summary__k">Atk</span> {signed(src.attackMod)}
            </span>
            <span className="cast-summary__abil">{src.ability}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Defense & tempo: AC, initiative, speeds, PB, HP + death saves, hit dice, spell DCs. */
export function DefenseBlock() {
  const { character } = useCharacter()
  const { stats } = character
  return (
    <section className="panel defense" aria-label="Defense and tempo">
      <div className="defense__stats">
        <div className="stat stat--ac">
          <span className="stat__label">AC</span>
          <span className="stat__value">{statText(stats.ac)}</span>
          {stats.ac.note && (
            <span className="stat__note">
              <MarkupText source={stats.ac.note} />
            </span>
          )}
        </div>
        <div className="stat">
          <span className="stat__label">Initiative</span>
          <span className="stat__value">{statText(stats.initiative, true)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Prof. bonus</span>
          <span className="stat__value">{signed(stats.proficiencyBonus)}</span>
        </div>
        <div className="stat stat--speeds">
          <span className="stat__label">Speed</span>
          <span className="stat__value">
            {stats.speeds.map((s, i) => (
              <span key={`${s.type}-${i}`} className="speed">
                {s.value} ft{s.type !== 'walk' && <span className="speed__type"> {s.type}</span>}
              </span>
            ))}
          </span>
        </div>
      </div>
      <HpBlock />
      <HitDiceBlock />
      <SpellcastingSummary />
    </section>
  )
}
