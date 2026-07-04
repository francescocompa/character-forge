import type { Currency } from '@character-forge/schema/types.ts'
import { useSession, useSessionState } from '../../session/SessionProvider'
import { CURRENCY_DENOMINATIONS } from './equipmentHelpers'

function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="currency-field">
      <span className="currency-field__label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        className="currency-field__input"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
      />
    </label>
  )
}

/**
 * Currency editor (T11 IA): cp/sp/ep/gp/pp, big and tappable, absolute values
 * per T02's decision — the character file's `equipment.currency` only seeds
 * the session on first import; every edit after that writes here.
 */
export function CurrencyPanel() {
  const store = useSession()
  const { trackers } = useSessionState()
  const currency = trackers.currency ?? {}

  const setDenomination = (key: keyof Currency, value: number) => {
    store.setCurrency({ ...currency, [key]: value })
  }

  return (
    <section className="panel currency" aria-label="Currency">
      <h2 className="panel__title">Currency</h2>
      <div className="currency__grid">
        {CURRENCY_DENOMINATIONS.map(({ key, label }) => (
          <CurrencyField
            key={key}
            label={label}
            value={currency[key] ?? 0}
            onChange={(value) => setDenomination(key, value)}
          />
        ))}
      </div>
    </section>
  )
}
