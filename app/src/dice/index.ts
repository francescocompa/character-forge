/**
 * Dice — public API (T24).
 *
 * The 3D physics/paint core lives in `engine.js` (ported from monster-forge, kept as JS). This module is the
 * typed front door the views use: it rolls the values in JS, embeds them in the engine's parts grammar, and
 * hands off to `rollDice3D`. When 3D can't run (reduced motion, no WebGL, or the libs haven't lazy-loaded yet
 * — e.g. the first tap on touch), it shows a 2D result toast built from the T17/T23 toast chrome instead.
 * Every roll is also announced on an `aria-live` region so screen-reader users get the result (T24 §5).
 *
 * Importing this module wires the engine's global hover/pointer listeners (so hovering a `[data-roll]` on
 * desktop preloads the libs and floats a cursor-die). It is import-safe in the Vitest `node` environment: the
 * engine guards every DOM/THREE/CANNON touch, and this module only reads `import.meta.env` at load.
 */
import type { HTMLAttributes, KeyboardEvent, MouseEvent } from 'react'
import { configureDice, rollDice3D, type DiceDesc } from './engine.js'
import './dice.css'

configureDice({ base: import.meta.env.BASE_URL })

export type RollMode = 'normal' | 'adv' | 'dis'

/** Adv on Shift-click, dis on Alt/Ctrl-click — a lightweight "where the roller asks" until per-surface adv/dis
 *  lands. The engine renders the second d20 dimmed (2d20kh1/kl1). */
export function rollModeFromEvent(e: {
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}): RollMode {
  if (e.shiftKey) return 'adv'
  if (e.altKey || e.ctrlKey) return 'dis'
  return 'normal'
}

interface DieTerm {
  sign: 1 | -1
  count: number
  sides: number
}
interface ParsedExpr {
  dice: DieTerm[]
  flat: number
}

/** Parse a dice expression like `2d8+3`, `1d10 + 1d6`, or `1d4-1` into dice terms + a flat total. */
function parseExpr(expr: string): ParsedExpr {
  const dice: DieTerm[] = []
  let flat = 0
  const re = /([+-]?)\s*(\d*)d(\d+)|([+-]?)\s*(\d+)(?!\s*d)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(expr))) {
    if (m[3] !== undefined && m[3] !== '') {
      const sign = m[1] === '-' ? -1 : 1
      dice.push({ sign, count: m[2] ? Number(m[2]) : 1, sides: Number(m[3]) })
    } else if (m[5] !== undefined) {
      flat += (m[4] === '-' ? -1 : 1) * Number(m[5])
    }
  }
  return { dice, flat }
}

const d = (sides: number) => 1 + Math.floor(Math.random() * sides)

interface RolledGroup {
  /** Engine parts fragment, e.g. `"2d20kh1:[15,8]"`. */
  parts: string
  /** Contribution to the total (kept dice × sign). */
  subtotal: number
  /** For a lone d20, the natural kept value (for crit detection). */
  natural?: number
}

/** Roll one die group into a parts fragment + its kept subtotal. `keep` = 'h'/'l' for advantage/disadvantage. */
function rollGroup(term: DieTerm, keep?: 'h' | 'l'): RolledGroup {
  const rolls: number[] = []
  for (let i = 0; i < term.count; i++) rolls.push(d(term.sides))
  let keptSum: number
  let mod = ''
  if (keep && rolls.length > 1) {
    const kept = keep === 'h' ? Math.max(...rolls) : Math.min(...rolls)
    keptSum = kept
    mod = keep === 'h' ? 'kh1' : 'kl1'
  } else {
    keptSum = rolls.reduce((a, b) => a + b, 0)
  }
  return {
    parts: `${term.count}d${term.sides}${mod}:[${rolls.join(',')}]`,
    subtotal: term.sign * keptSum,
    natural: term.sides === 20 && term.count <= 2 ? keptSum : undefined,
  }
}

interface RollSpec {
  label: string
  /** The dice expression (without the check modifier), e.g. `1d20` or `2d8`. */
  expr: string
  /** Flat modifier added on top of `expr` (the ability/attack modifier). */
  modifier?: number
  mode?: RollMode
  /** Damage type, appended to the announced text and coloured on the card is out of scope — text only. */
  type?: string
  /** Detect a natural max on a lone d20 and fire the crit flourish. */
  critFromD20?: boolean
}

/** Format a signed modifier the way the sheet does (+3 / −1). */
function signed(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`
}

let announceEl: HTMLElement | null = null
function announce(text: string): void {
  if (typeof document === 'undefined') return
  if (!announceEl) {
    announceEl = document.createElement('div')
    announceEl.className = 'cf-visually-hidden'
    announceEl.setAttribute('role', 'status')
    announceEl.setAttribute('aria-live', 'polite')
    document.body.appendChild(announceEl)
  }
  // Clear first so identical consecutive results still re-announce.
  announceEl.textContent = ''
  window.setTimeout(() => {
    if (announceEl) announceEl.textContent = text
  }, 30)
}

let toastEl: HTMLElement | null = null
let toastTimer = 0
function showToast(text: string): void {
  if (typeof document === 'undefined') return
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.className = 'cf-dice-toast'
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = text
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl && toastEl.classList.remove('show'), 3200)
}

/**
 * Roll `spec` into a result descriptor + total — the pure core (no DOM, no 3D), so the value invariant is
 * unit-testable: `total` always equals the kept dice embedded in `desc.parts` plus the flat modifier, which is
 * exactly what the result card shows (T24 acceptance). Exported for tests.
 */
export function buildRoll(spec: RollSpec): { desc: DiceDesc; total: number } {
  const mode = spec.mode ?? 'normal'
  const parsed = parseExpr(spec.expr)
  const fragments: string[] = []
  let total = spec.modifier ?? 0
  let natural: number | undefined

  parsed.dice.forEach((term) => {
    // Advantage/disadvantage only applies to a single d20 check; other dice always sum.
    const keep = term.sides === 20 && mode !== 'normal' ? (mode === 'adv' ? 'h' : 'l') : undefined
    const eff: DieTerm = keep && term.count < 2 ? { ...term, count: 2 } : term
    const g = rollGroup(eff, keep)
    fragments.push(g.parts)
    total += g.subtotal
    if (g.natural !== undefined) natural = g.natural
  })
  total += parsed.flat

  const typeText = spec.type ? ` ${spec.type}` : ''
  const modeText = mode === 'adv' ? ' adv' : mode === 'dis' ? ' dis' : ''
  const msg = `${spec.label}${modeText}: ${total}${typeText}`

  return {
    total,
    desc: {
      parts: fragments.join(' '),
      total,
      label: spec.label,
      msg,
      crit: !!spec.critFromD20 && natural === 20,
      reroll: () => roll(spec),
    },
  }
}

/**
 * Roll `spec`, show the result (3D if available, else the 2D toast), and announce it. Returns the numeric
 * total (handy for tests / callers that want the value).
 */
export function roll(spec: RollSpec): number {
  const { desc, total } = buildRoll(spec)
  const msg = desc.msg ?? desc.label
  const modText = spec.modifier ? ` (${signed(spec.modifier)})` : ''
  announce(msg + modText)
  const took = rollDice3D(desc)
  if (!took) showToast(msg)
  return total
}

/** An ability check / save / skill / attack-to-hit: a d20 plus the sheet's modifier. */
export function rollCheck(
  label: string,
  modifier: number,
  opts?: { mode?: RollMode; isAttack?: boolean },
): number {
  return roll({
    label,
    expr: '1d20',
    modifier,
    mode: opts?.mode,
    critFromD20: opts?.isAttack ?? true,
  })
}

/** A damage / dice-chip roll: the expression as written, optionally typed. */
export function rollDamage(label: string, expr: string, type?: string): number {
  return roll({ label, expr, type })
}

/** The `data-roll` value for a surface — the primary die, so desktop hover can preload the right cursor-die. */
export function dataRoll(expr = '1d20'): string {
  return expr
}

type RollableProps = HTMLAttributes<HTMLElement> & { 'data-roll': string; tabIndex: number }

/**
 * Spreadable props that turn any element into a rollable surface: click or Enter/Space rolls, `data-roll`
 * primes the desktop hover-preload + cursor-die, and it's keyboard-focusable with a button role + label.
 * Pass the element's existing className so it's preserved alongside `.rollable`.
 */
export function rollableProps(
  run: (mode: RollMode) => void,
  opts?: { expr?: string; className?: string; label?: string },
): RollableProps {
  const activate = (e: MouseEvent | KeyboardEvent) => run(rollModeFromEvent(e))
  return {
    className: ['rollable', opts?.className].filter(Boolean).join(' '),
    role: 'button',
    tabIndex: 0,
    'aria-label': opts?.label,
    'data-roll': opts?.expr ?? '1d20',
    onClick: activate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activate(e)
      }
    },
  }
}
