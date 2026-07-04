import { useSession } from '../../session/SessionProvider'

/**
 * Interactive tracker primitives shared across the main sheet (T08). Each is a
 * thin control over the {@link SessionStore}: tick-boxes for spendable pools,
 * a ± counter for consumables, and a ± stepper for HP. They read no state
 * themselves — callers pass the current values from the live session snapshot.
 */

export interface TickBoxesProps {
  total: number
  used: number
  label: string
  /** Fills toward `target` uses via the store's single-step tick/untick. */
  onSet: (target: number) => void
  /** 'used' = filled boxes are spent (resources/slots); 'remaining' = filled are left. */
  tone?: 'used' | 'remaining'
}

/**
 * A row of tap boxes. Clicking a box sets the count so that box (and everything
 * left of it) matches — the familiar "fill to here" gesture. `used` counts
 * filled boxes from the left.
 */
export function TickBoxes({ total, used, label, onSet, tone = 'used' }: TickBoxesProps) {
  const clamped = Math.min(Math.max(used, 0), total)
  return (
    <div className="ticks" role="group" aria-label={label}>
      {Array.from({ length: total }, (_, i) => {
        const filled = i < clamped
        // Click a filled box to empty from there; an empty box to fill through it.
        const target = filled ? i : i + 1
        return (
          <button
            key={i}
            type="button"
            className={`tick tick--${tone} ${filled ? 'is-filled' : ''}`}
            aria-pressed={filled}
            aria-label={`${label}: ${i + 1} of ${total}`}
            onClick={() => onSet(target)}
          />
        )
      })}
    </div>
  )
}

export interface CounterProps {
  count: number
  max?: number
  label: string
  onDelta: (delta: number) => void
}

/** A ±1 tally counter for consumables (ammunition etc.). */
export function Counter({ count, max, label, onDelta }: CounterProps) {
  return (
    <div className="counter" role="group" aria-label={label}>
      <button
        type="button"
        className="step-btn"
        aria-label={`${label}: one fewer`}
        disabled={count <= 0}
        onClick={() => onDelta(-1)}
      >
        −
      </button>
      <span className="counter__value">
        {count}
        {max !== undefined && <span className="counter__max">/{max}</span>}
      </span>
      <button
        type="button"
        className="step-btn"
        aria-label={`${label}: one more`}
        disabled={max !== undefined && count >= max}
        onClick={() => onDelta(1)}
      >
        +
      </button>
    </div>
  )
}

export interface NumberStepperProps {
  value: number
  label: string
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** A ± stepper for a single number (current / temp HP). */
export function NumberStepper({ value, label, onChange, min, max }: NumberStepperProps) {
  const set = (next: number) => {
    const lower = min !== undefined ? Math.max(min, next) : next
    onChange(max !== undefined ? Math.min(max, lower) : lower)
  }
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="step-btn"
        aria-label={`${label}: decrease`}
        disabled={min !== undefined && value <= min}
        onClick={() => set(value - 1)}
      >
        −
      </button>
      <span className="stepper__value">{value}</span>
      <button
        type="button"
        className="step-btn"
        aria-label={`${label}: increase`}
        disabled={max !== undefined && value >= max}
        onClick={() => set(value + 1)}
      >
        +
      </button>
    </div>
  )
}

/**
 * Tick-boxes bound to a slot pool or resource id. Drives the store's
 * single-step tick/untick to reach the clicked target, so undo steps one box.
 */
export function TrackerTicks({
  kind,
  id,
  total,
  used,
  label,
}: {
  kind: 'slotPool' | 'resource'
  id: string
  total: number
  used: number
  label: string
}) {
  const store = useSession()
  const setTo = (target: number) => {
    let current = used
    while (current < target) {
      store.tick(kind, id)
      current++
    }
    while (current > target) {
      store.untick(kind, id)
      current--
    }
  }
  return <TickBoxes total={total} used={used} label={label} onSet={setTo} />
}
