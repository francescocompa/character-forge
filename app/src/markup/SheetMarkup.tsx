import { Fragment, type ReactNode } from 'react'
import type { Ability } from '@character-forge/schema/types.ts'
import { parseMarkup, type MarkupNode } from '@character-forge/schema/markup.ts'
import {
  AbilityChip,
  AdvBadge,
  ConditionChip,
  DamageText,
  DisBadge,
  LevelBadge,
  RecoverIcon,
  type RecoverTrigger,
  RefLink,
  SaveDCBadge,
} from '../components/chips'
import './sheet-markup.css'

/**
 * Renders a sheet-markup string (see schema/markup-grammar.md) into the colored
 * inline UI — chips, badges, and popover links — that replaces Francesco's
 * hand-coloring. The parser lives in `@character-forge/schema/markup.ts` (shared
 * with the validator, T04); this component only maps its nodes to T05 chips.
 *
 * Total-function by construction: the parser never throws, and every tag the
 * renderer can't turn into a valid chip (bad ability, stray arity, non-integer
 * level) degrades to plain text — visibly flagged in dev, bare in prod (grammar
 * §2). `{ref:…}` fires `onRef` with the library key so a view can open a popover
 * (T07 wires the actual popover; without `onRef` the ref renders as styled text).
 */
export interface SheetMarkupProps {
  source: string
  /** Called with a `{ref:KEY}` library key when the reader taps that term. */
  onRef?: (refKey: string) => void
}

const INTEGER = /^\d+$/
const ABILITIES: readonly string[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const RECOVER_TRIGGERS: readonly string[] = ['SR', 'LR', 'Dawn']

const isAbility = (value: string | undefined): value is Ability =>
  value !== undefined && ABILITIES.includes(value)
const isRecoverTrigger = (value: string | undefined): value is RecoverTrigger =>
  value !== undefined && RECOVER_TRIGGERS.includes(value)

/** A known tag whose args don't form a valid chip: best-effort plain text (grammar §2). */
function fallback(name: string, args: string[]): ReactNode {
  const text = args.join(' ')
  if (import.meta.env.DEV) {
    return (
      <span className="markup-invalid" title={`malformed {${name}} tag`}>
        {text || `{${name}}`}
      </span>
    )
  }
  return text || `{${name}}`
}

function renderTag(name: string, args: string[], onRef?: (refKey: string) => void): ReactNode {
  switch (name) {
    case 'a':
      return isAbility(args[0]) ? <AbilityChip ability={args[0]} /> : fallback(name, args)
    case 'save': {
      const [ability, dc] = args
      if (!isAbility(ability) || (dc !== undefined && !INTEGER.test(dc)))
        return fallback(name, args)
      return <SaveDCBadge ability={ability} dc={dc !== undefined ? Number(dc) : undefined} />
    }
    case 'dmg': {
      const [type, dice] = args
      return type && dice ? <DamageText type={type} dice={dice} /> : fallback(name, args)
    }
    case 'dice':
      return args[0] ? <DamageText dice={args[0]} /> : fallback(name, args)
    case 'dtype':
      return args[0] ? <DamageText type={args[0]} /> : fallback(name, args)
    case 'adv':
      return <AdvBadge />
    case 'dis':
      return <DisBadge />
    case 'cond':
      return args[0] ? <ConditionChip name={args[0]} /> : fallback(name, args)
    case 'recover':
      return isRecoverTrigger(args[0]) ? <RecoverIcon when={args[0]} /> : fallback(name, args)
    case 'lvl':
      return INTEGER.test(args[0] ?? '') ? (
        <LevelBadge level={Number(args[0])} />
      ) : (
        fallback(name, args)
      )
    case 'ref': {
      const key = args[0]
      if (!key) return fallback(name, args)
      const label = args[1] ?? key
      return <RefLink label={label} onClick={onRef ? () => onRef(key) : undefined} />
    }
    case 'note':
      return <span className="markup-note">{args[0] ?? ''}</span>
    default:
      // Unreachable in practice: the parser turns unknown tag names into text
      // nodes, so `renderTag` only ever sees a grammar tag. Kept for safety.
      return fallback(name, args)
  }
}

function renderNode(node: MarkupNode, onRef?: (refKey: string) => void): ReactNode {
  switch (node.type) {
    case 'text':
      return node.value
    case 'tag':
      return renderTag(node.name, node.args, onRef)
    case 'bold':
      return <strong>{renderNodes(node.children, onRef)}</strong>
    case 'italic':
      return <em>{renderNodes(node.children, onRef)}</em>
  }
}

function renderNodes(nodes: MarkupNode[], onRef?: (refKey: string) => void): ReactNode[] {
  return nodes.map((node, i) => <Fragment key={i}>{renderNode(node, onRef)}</Fragment>)
}

export function SheetMarkup({ source, onRef }: SheetMarkupProps) {
  const { nodes } = parseMarkup(source)
  return <>{renderNodes(nodes, onRef)}</>
}
