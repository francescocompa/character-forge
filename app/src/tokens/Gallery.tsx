import {
  AbilityChip,
  AdvBadge,
  ConditionChip,
  DamageText,
  DisBadge,
  FutureWrap,
  LevelBadge,
  OriginDot,
  RecoverIcon,
  RefLink,
  SaveDCBadge,
  SchoolLabel,
} from '../components/chips'
import type { Ability } from '@character-forge/schema/types.ts'
import type { DamageType } from '../components/chips'
import type { ReactNode } from 'react'

const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

const DAMAGE_TYPES: DamageType[] = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]

const SWATCH_GROUPS: { title: string; vars: string[] }[] = [
  {
    title: 'Surfaces & ink',
    vars: [
      '--surface-bg',
      '--surface-raised',
      '--surface-overlay',
      '--ink-primary',
      '--ink-secondary',
      '--ink-muted',
    ],
  },
  {
    title: 'Ability',
    vars: [
      '--ability-str',
      '--ability-dex',
      '--ability-con',
      '--ability-int',
      '--ability-wis',
      '--ability-cha',
    ],
  },
  {
    title: 'Damage type',
    vars: DAMAGE_TYPES.map((t) => `--dmg-${t}`).concat('--dmg-neutral'),
  },
  {
    title: 'Semantic',
    vars: ['--adv', '--dis', '--recover-lr', '--recover-sr', '--recover-dawn'],
  },
  {
    title: 'Origin dots',
    vars: ['--origin-1', '--origin-2', '--origin-3', '--origin-4', '--origin-5', '--origin-6'],
  },
]

function Swatch({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <span
        style={{
          display: 'inline-block',
          width: '1.25rem',
          height: '1.25rem',
          borderRadius: 'var(--radius-sm)',
          background: `var(${name})`,
          border: '1px solid var(--border-subtle)',
          flex: 'none',
        }}
      />
      <code style={{ fontSize: 'var(--font-size-sm)', color: 'var(--ink-secondary)' }}>{name}</code>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-6)' }}>
      <h2 style={{ color: 'var(--ink-primary)', fontSize: 'var(--font-size-md)' }}>{title}</h2>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * Dev-only iteration surface (T05 deliverable 4): every chip in every variant,
 * plus a token swatch board. Francesco tweaks values in tokens.css and
 * refreshes this page — no other wiring needed.
 */
export function Gallery() {
  return (
    <div
      style={{
        background: 'var(--surface-bg)',
        color: 'var(--ink-primary)',
        fontFamily: 'var(--font-family)',
        padding: 'var(--space-5)',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>
        character-forge — token &amp; chip gallery
      </h1>
      <p style={{ color: 'var(--ink-secondary)', maxWidth: '60ch' }}>
        Dev-only route (T05). See <code>tokens/README.md</code> for the token map and the canon
        rationale (scope §2).
      </p>

      <Section title="Ability chips">
        {ABILITIES.map((a) => (
          <AbilityChip key={a} ability={a} value={a === 'STR' ? 16 : undefined} />
        ))}
      </Section>

      <Section title="Save DC badges">
        {ABILITIES.map((a) => (
          <SaveDCBadge key={a} ability={a} dc={13} />
        ))}
        <SaveDCBadge ability="CHA" />
      </Section>

      <Section title="Damage text (dmg / dice / dtype)">
        {DAMAGE_TYPES.map((t) => (
          <DamageText key={t} type={t} dice="1d6" />
        ))}
        <DamageText dice="1d4" />
        <DamageText type="psychic" />
      </Section>

      <Section title="Advantage / disadvantage">
        <AdvBadge />
        <DisBadge />
      </Section>

      <Section title="Condition chips">
        <ConditionChip name="Frightened" />
        <ConditionChip name="Charmed" onClick={() => undefined} />
      </Section>

      <Section title="Recovery icons">
        <span>
          2/<RecoverIcon when="LR" /> +1 on <RecoverIcon when="SR" />
        </span>
        <RecoverIcon when="Dawn" />
      </Section>

      <Section title="Level badges">
        <LevelBadge level={3} />
        <LevelBadge level={11} />
      </Section>

      <Section title="Origin dots">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <OriginDot key={i} index={i} label={`Source ${i}`} />
        ))}
      </Section>

      <Section title="School label">
        <SchoolLabel school="Evocation" />
        <SchoolLabel school="Necromancy" />
      </Section>

      <Section title="Ref link">
        <RefLink label="Mind Sliver" onClick={() => undefined} />
        <RefLink label="(no popover wired)" />
      </Section>

      <Section title="Future-wrap (Build view)">
        <FutureWrap level={6}>Second eldritch invocation</FutureWrap>
      </Section>

      {SWATCH_GROUPS.map((group) => (
        <section key={group.title} style={{ marginBottom: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)' }}>{group.title}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 'var(--space-2)',
            }}
          >
            {group.vars.map((v) => (
              <Swatch key={v} name={v} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
