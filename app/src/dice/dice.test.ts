import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRoll } from './index'

/**
 * Tests the pure roll core (`buildRoll`). The key property is the T24 acceptance invariant: the total shown on
 * the result card always equals the kept dice embedded in `desc.parts` (what the physical dice show) plus the
 * flat modifier — the engine only paints those pre-rolled values, it never re-decides them.
 */

/** Force `Math.random()` to yield each die face in order: face(k, s) makes a d{s} land on k. */
const face = (k: number, sides: number) => (k - 0.5) / sides
function stubRandom(values: number[]) {
  let i = 0
  return vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % values.length])
}

/** Re-derive the kept-dice sum from a parts string, mirroring the engine's keep/drop rules. */
function keptFromParts(parts: string): number {
  let sum = 0
  const re = /(\d+)d(\d+)((?:kh|kl|dh|dl)\d*)?:\[([\d,]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(parts))) {
    const kmod = m[3] || ''
    const vals = m[4].split(',').map(Number)
    if (!kmod) {
      sum += vals.reduce((a, b) => a + b, 0)
      continue
    }
    const mt = kmod.slice(0, 2)
    const kn = Number(kmod.slice(2) || 1)
    const sorted = [...vals].sort((a, b) => a - b)
    const kept =
      mt === 'kh'
        ? sorted.slice(-kn)
        : mt === 'kl'
          ? sorted.slice(0, kn)
          : mt === 'dh'
            ? sorted.slice(0, vals.length - kn)
            : sorted.slice(kn)
    sum += kept.reduce((a, b) => a + b, 0)
  }
  return sum
}

afterEach(() => vi.restoreAllMocks())

describe('buildRoll — value invariant', () => {
  it('a straight d20 check embeds the rolled die and adds the modifier', () => {
    stubRandom([face(15, 20)])
    const { desc, total } = buildRoll({ label: 'STR check', expr: '1d20', modifier: 3 })
    expect(desc.parts).toBe('1d20:[15]')
    expect(total).toBe(18)
    expect(desc.msg).toBe('STR check: 18')
    expect(desc.crit).toBe(false)
  })

  it('advantage rolls two d20 and keeps the higher (kh1), dimming the other', () => {
    stubRandom([face(8, 20), face(17, 20)])
    const { desc, total } = buildRoll({ label: 'Attack', expr: '1d20', modifier: 5, mode: 'adv' })
    expect(desc.parts).toBe('2d20kh1:[8,17]')
    expect(total).toBe(22)
    expect(desc.msg).toBe('Attack adv: 22')
  })

  it('disadvantage keeps the lower (kl1)', () => {
    stubRandom([face(19, 20), face(4, 20)])
    const { total } = buildRoll({ label: 'Save', expr: '1d20', modifier: 0, mode: 'dis' })
    expect(total).toBe(4)
  })

  it('flags a crit only on a natural 20 when the surface asks for it', () => {
    stubRandom([face(20, 20)])
    expect(
      buildRoll({ label: 'Hit', expr: '1d20', modifier: 2, critFromD20: true }).desc.crit,
    ).toBe(true)
    stubRandom([face(20, 20)])
    expect(buildRoll({ label: 'Check', expr: '1d20', modifier: 2 }).desc.crit).toBe(false)
    stubRandom([face(19, 20)])
    expect(
      buildRoll({ label: 'Hit', expr: '1d20', modifier: 2, critFromD20: true }).desc.crit,
    ).toBe(false)
  })

  it('sums multi-die damage and its flat bonus', () => {
    stubRandom([face(6, 8), face(4, 8)])
    const { desc, total } = buildRoll({
      label: 'Greatsword damage',
      expr: '2d8+3',
      type: 'slashing',
    })
    expect(desc.parts).toBe('2d8:[6,4]')
    expect(total).toBe(13)
    expect(desc.msg).toBe('Greatsword damage: 13 slashing')
  })

  it('handles several dice terms in one expression', () => {
    stubRandom([face(7, 10), face(3, 6)])
    const { desc, total } = buildRoll({ label: 'Eldritch Smite', expr: '1d10+1d6' })
    expect(desc.parts).toBe('1d10:[7] 1d6:[3]')
    expect(total).toBe(10)
  })

  it('the card total always equals the kept dice shown plus the modifier (fuzz)', () => {
    for (let n = 0; n < 200; n++) {
      const modifier = Math.floor(Math.random() * 21) - 5
      const mode = (['normal', 'adv', 'dis'] as const)[n % 3]
      const { desc, total } = buildRoll({ label: 'x', expr: '1d20', modifier, mode })
      expect(total).toBe(keptFromParts(desc.parts) + modifier)
    }
  })
})
