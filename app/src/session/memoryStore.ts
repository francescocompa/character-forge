import type {
  CharacterFile,
  Currency,
  Addition,
  RecoverRule,
  SessionFile,
  SessionStore,
  TrackerScope,
} from '@character-forge/schema/types.ts'

/**
 * In-memory {@link SessionStore} (T08 stub). Implements the full T02 contract
 * against a plain object + listener set — no persistence. T14 swaps in the
 * IndexedDB-backed engine; every view (T08–T13) codes against this interface so
 * that swap is invisible to them.
 *
 * It clamps ticks and applies rest-recovery rules by reading maxes straight from
 * the character file (the file is the single source of truth for limits; the
 * session only holds "how much is spent"). Undo restores the pre-mutation
 * snapshot.
 */

const HISTORY_LIMIT = 50

/** Resolve a resource's displayed `max` to a number for clamping, when possible. */
function resolveMax(max: number | string, character: CharacterFile): number | undefined {
  if (typeof max === 'number') return max
  // The only formula token the compiler currently emits is "PB"; anything else
  // is a free-form display string we can't clamp against, so we don't try.
  if (max.trim().toUpperCase() === 'PB') return character.stats.proficiencyBonus
  return undefined
}

/** Apply one recovery rule to a current `used` value. */
function recoverUsed(used: number, rule: RecoverRule): number {
  if (rule.amount === 'all') return 0
  if (typeof rule.amount === 'number') return Math.max(0, used - rule.amount)
  // String amount = a displayed formula (e.g. "half your level"); left to the
  // player until the real engine (T14) can interpret it.
  return used
}

function clamp(value: number, min: number, max: number | undefined): number {
  const lower = Math.max(min, value)
  return max === undefined ? lower : Math.min(lower, max)
}

function seedState(character: CharacterFile): SessionFile {
  const maxHp = typeof character.stats.maxHp.value === 'number' ? character.stats.maxHp.value : 0

  const consumables: SessionFile['trackers']['consumables'] = {}
  for (const c of character.consumables ?? []) {
    consumables[c.id] = { count: c.max ?? 0 }
  }

  const pools: SessionFile['loadout']['pools'] = {}
  for (const [poolId, pool] of Object.entries(character.pools ?? {})) {
    if (pool.defaults) pools[poolId] = { selected: [...pool.defaults] }
  }

  return {
    formatVersion: 1,
    characterId: character.meta.characterId,
    variantLabel: character.meta.variantLabel,
    characterFormatVersion: character.formatVersion,
    updatedAt: new Date(0).toISOString(),
    trackers: {
      hp: { current: maxHp, temp: 0 },
      deathSaves: { successes: 0, failures: 0 },
      slotPools: {},
      resources: {},
      hitDice: {},
      consumables,
      currency: { ...character.equipment?.currency },
      conditions: [],
      inspiration: false,
    },
    loadout: { pools, equipped: {} },
    additions: [],
    companions: {},
  }
}

export function createMemorySessionStore(character: CharacterFile): SessionStore {
  // `state` is the live working copy (mutated in place); `snapshot` is the
  // immutable value handed to callers. `snapshot` changes reference only on
  // commit, which is what makes it a valid `useSyncExternalStore` getSnapshot.
  let state = seedState(character)
  let snapshot = structuredClone(state)
  const listeners = new Set<(state: SessionFile) => void>()
  const history: SessionFile[] = []

  const slotMax = new Map(character.spellcasting?.slotPools.map((p) => [p.id, p.count]) ?? [])
  const resourceById = new Map((character.resources ?? []).map((r) => [r.id, r]))
  const consumableMax = new Map((character.consumables ?? []).map((c) => [c.id, c.max]))
  const hitDiceMax = new Map(
    (character.stats.hitDice ?? []).map((g) => [g.classRef, g.count]),
  )

  function pushHistory() {
    history.push(structuredClone(state))
    if (history.length > HISTORY_LIMIT) history.shift()
  }
  function commit() {
    state.updatedAt = new Date().toISOString()
    snapshot = structuredClone(state)
    for (const listener of listeners) listener(snapshot)
  }
  /** Record undo history, mutate via `fn`, then publish a fresh snapshot. */
  function mutate(fn: () => void) {
    pushHistory()
    fn()
    commit()
  }

  function isCompanion(scope?: TrackerScope): scope is { owner: string } {
    return scope !== undefined && scope.owner !== 'character'
  }
  function companion(owner: string) {
    const companions = (state.companions ??= {})
    return (companions[owner] ??= {})
  }

  return {
    getState: () => snapshot,

    setCurrentHp(value, scope) {
      mutate(() => {
        if (isCompanion(scope)) {
          const c = companion(scope.owner)
          c.hp = { current: value, temp: c.hp?.temp }
        } else {
          state.trackers.hp = { current: value, temp: state.trackers.hp?.temp }
        }
      })
    },
    setTempHp(value, scope) {
      mutate(() => {
        if (isCompanion(scope)) {
          const c = companion(scope.owner)
          c.hp = { current: c.hp?.current ?? 0, temp: value }
        } else {
          state.trackers.hp = { current: state.trackers.hp?.current ?? 0, temp: value }
        }
      })
    },
    setDeathSaves(successes, failures) {
      mutate(() => {
        state.trackers.deathSaves = { successes, failures }
      })
    },

    tick(kind, id, scope) {
      mutate(() => {
        if (kind === 'slotPool') {
          const bag = (state.trackers.slotPools ??= {})
          const used = bag[id]?.used ?? 0
          bag[id] = { used: clamp(used + 1, 0, slotMax.get(id)) }
          return
        }
        // resource
        if (isCompanion(scope)) {
          const c = companion(scope.owner)
          const bag = (c.resources ??= {})
          bag[id] = { used: (bag[id]?.used ?? 0) + 1 }
          return
        }
        const bag = (state.trackers.resources ??= {})
        const resource = resourceById.get(id)
        const max = resource ? resolveMax(resource.max, character) : undefined
        bag[id] = { used: clamp((bag[id]?.used ?? 0) + 1, 0, max) }
      })
    },
    untick(kind, id, scope) {
      mutate(() => {
        if (kind === 'resource' && isCompanion(scope)) {
          const bag = (companion(scope.owner).resources ??= {})
          bag[id] = { used: Math.max(0, (bag[id]?.used ?? 0) - 1) }
          return
        }
        const bag =
          kind === 'slotPool'
            ? (state.trackers.slotPools ??= {})
            : (state.trackers.resources ??= {})
        bag[id] = { used: Math.max(0, (bag[id]?.used ?? 0) - 1) }
      })
    },
    spendHitDie(classRef) {
      mutate(() => {
        const bag = (state.trackers.hitDice ??= {})
        bag[classRef] = { spent: clamp((bag[classRef]?.spent ?? 0) + 1, 0, hitDiceMax.get(classRef)) }
      })
    },
    regainHitDie(classRef) {
      mutate(() => {
        const bag = (state.trackers.hitDice ??= {})
        bag[classRef] = { spent: Math.max(0, (bag[classRef]?.spent ?? 0) - 1) }
      })
    },

    setConsumable(id, count) {
      mutate(() => {
        const bag = (state.trackers.consumables ??= {})
        bag[id] = { count: clamp(count, 0, consumableMax.get(id) ?? undefined) }
      })
    },
    adjustConsumable(id, delta) {
      mutate(() => {
        const bag = (state.trackers.consumables ??= {})
        const current = bag[id]?.count ?? 0
        bag[id] = { count: clamp(current + delta, 0, consumableMax.get(id) ?? undefined) }
      })
    },

    setCurrency(currency: Currency) {
      mutate(() => {
        state.trackers.currency = { ...currency }
      })
    },
    setConditions(conditions, scope) {
      mutate(() => {
        if (isCompanion(scope)) companion(scope.owner).conditions = [...conditions]
        else state.trackers.conditions = [...conditions]
      })
    },
    setInspiration(value) {
      mutate(() => {
        state.trackers.inspiration = value
      })
    },

    getSelection(poolId) {
      return state.loadout.pools?.[poolId]?.selected ?? []
    },
    select(poolId, ref) {
      mutate(() => {
        const pools = (state.loadout.pools ??= {})
        const selected = pools[poolId]?.selected ?? []
        if (!selected.includes(ref)) pools[poolId] = { selected: [...selected, ref] }
      })
    },
    deselect(poolId, ref) {
      mutate(() => {
        const pools = (state.loadout.pools ??= {})
        const selected = pools[poolId]?.selected ?? []
        pools[poolId] = { selected: selected.filter((r) => r !== ref) }
      })
    },
    setEquipped(itemId, statePatch) {
      mutate(() => {
        const equipped = (state.loadout.equipped ??= {})
        equipped[itemId] = { ...equipped[itemId], ...statePatch }
      })
    },

    applyShortRest() {
      mutate(() => applyRest('short'))
    },
    applyLongRest() {
      mutate(() => applyRest('long'))
    },

    addAddition(addition: Omit<Addition, 'id' | 'addedAt'>) {
      const id = `add-${Math.random().toString(36).slice(2, 10)}`
      mutate(() => {
        const additions = (state.additions ??= [])
        additions.push({ ...addition, id, addedAt: new Date().toISOString() })
      })
      return id
    },
    removeAddition(id) {
      mutate(() => {
        state.additions = (state.additions ?? []).filter((a) => a.id !== id)
      })
    },

    undoLast() {
      const previous = history.pop()
      if (!previous) return
      state = previous
      snapshot = structuredClone(state)
      for (const listener of listeners) listener(snapshot)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  /** Apply every resource's / slot pool's `recover` rule for the given rest. */
  function applyRest(kind: 'short' | 'long') {
    const on = kind === 'long' ? 'long' : 'short'
    const resources = (state.trackers.resources ??= {})
    for (const resource of character.resources ?? []) {
      for (const rule of resource.recover) {
        if (rule.on === on) {
          resources[resource.id] = { used: recoverUsed(resources[resource.id]?.used ?? 0, rule) }
        }
      }
    }
    const slots = (state.trackers.slotPools ??= {})
    for (const pool of character.spellcasting?.slotPools ?? []) {
      for (const rule of pool.recover) {
        if (rule.on === on) {
          slots[pool.id] = { used: recoverUsed(slots[pool.id]?.used ?? 0, rule) }
        }
      }
    }
    // A long rest also restores HP to full and clears death saves (SRD baseline;
    // hit-dice recovery math is deferred to T14's real rest engine).
    if (kind === 'long') {
      const maxHp = typeof character.stats.maxHp.value === 'number' ? character.stats.maxHp.value : 0
      state.trackers.hp = { current: maxHp, temp: 0 }
      state.trackers.deathSaves = { successes: 0, failures: 0 }
    }
  }
}
