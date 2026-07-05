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
 * The pure, synchronous session-state engine (T14): rest semantics, tick
 * trackers, loadout, undo. This is the same in-memory core the T08 stub used
 * (`createMemorySessionStore`), now shared by the real IndexedDB-backed store
 * ({@link ../state/IndexedDbSessionStore}) so persistence is a thin wrapper
 * around one well-tested mutation core rather than a second implementation.
 *
 * The file is the single source of truth for limits (maxes, recover rules);
 * the engine only ever interprets those structures — it never hardcodes a 5e
 * formula (e.g. "half your hit dice"). See `HitDiceGroup.recover` (T14 schema
 * addition) and `Trackers.maxHpOverride` (T03 review item F2).
 */

const HISTORY_LIMIT = 50

/** Resolve a displayed `max`/`chooseCount` to a number for clamping, when possible. */
function resolveFormula(value: number | string, character: CharacterFile): number | undefined {
  if (typeof value === 'number') return value
  // The only formula token the compiler currently emits is "PB"; anything else
  // is a free-form display string we can't clamp against, so we don't try.
  if (value.trim().toUpperCase() === 'PB') return character.stats.proficiencyBonus
  return undefined
}

/** Apply one recovery rule to a current `used`/`spent` value. */
function recoverUsed(used: number, rule: RecoverRule): number {
  if (rule.amount === 'all') return 0
  if (typeof rule.amount === 'number') return Math.max(0, used - rule.amount)
  // String amount = a displayed formula (e.g. "half your level") — left to the
  // player to apply manually; the engine only interprets structured amounts.
  return used
}

function clamp(value: number, min: number, max: number | undefined): number {
  const lower = Math.max(min, value)
  return max === undefined ? lower : Math.min(lower, max)
}

/** Fresh session state seeded from a character file's compiled defaults (first import). */
export function seedSessionState(character: CharacterFile): SessionFile {
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

/**
 * Reconciles a previously-saved session against the (possibly re-imported)
 * character file: drops refs the file no longer has (resources, slot pools,
 * hit-dice groups, consumables, loadout pools/options, companions) and seeds
 * defaults for anything new. Orphan drops are logged so a refresh is never a
 * silent surprise (T14 deliverable 4). Pure — callers own persistence.
 */
export function reconcileSessionState(saved: SessionFile, character: CharacterFile): SessionFile {
  const next = structuredClone(saved)
  const dropped: string[] = []

  const resourceIds = new Set((character.resources ?? []).map((r) => r.id))
  for (const id of Object.keys(next.trackers.resources ?? {})) {
    if (!resourceIds.has(id)) {
      delete next.trackers.resources![id]
      dropped.push(`resource:${id}`)
    }
  }

  const slotIds = new Set((character.spellcasting?.slotPools ?? []).map((p) => p.id))
  for (const id of Object.keys(next.trackers.slotPools ?? {})) {
    if (!slotIds.has(id)) {
      delete next.trackers.slotPools![id]
      dropped.push(`slotPool:${id}`)
    }
  }

  const classRefs = new Set((character.stats.hitDice ?? []).map((g) => g.classRef))
  for (const ref of Object.keys(next.trackers.hitDice ?? {})) {
    if (!classRefs.has(ref)) {
      delete next.trackers.hitDice![ref]
      dropped.push(`hitDice:${ref}`)
    }
  }

  const consumables = character.consumables ?? []
  const consumableIds = new Set(consumables.map((c) => c.id))
  const consumableBag = (next.trackers.consumables ??= {})
  for (const id of Object.keys(consumableBag)) {
    if (!consumableIds.has(id)) {
      delete consumableBag[id]
      dropped.push(`consumable:${id}`)
    }
  }
  for (const c of consumables) {
    if (!(c.id in consumableBag)) consumableBag[c.id] = { count: c.max ?? 0 }
  }

  const poolDefs = character.pools ?? {}
  const loadoutPools = (next.loadout.pools ??= {})
  for (const poolId of Object.keys(loadoutPools)) {
    const pool = poolDefs[poolId]
    if (!pool) {
      delete loadoutPools[poolId]
      dropped.push(`pool:${poolId}`)
      continue
    }
    const validRefs = new Set(pool.options.map((o) => o.ref))
    const filtered = loadoutPools[poolId].selected.filter((ref) => {
      const ok = validRefs.has(ref)
      if (!ok) dropped.push(`pool:${poolId}:${ref}`)
      return ok
    })
    loadoutPools[poolId] = { selected: filtered }
  }
  for (const [poolId, pool] of Object.entries(poolDefs)) {
    if (!(poolId in loadoutPools) && pool.defaults) {
      loadoutPools[poolId] = { selected: [...pool.defaults] }
    }
  }

  const companionIds = new Set((character.companions ?? []).map((c) => c.id))
  for (const id of Object.keys(next.companions ?? {})) {
    if (!companionIds.has(id)) {
      delete next.companions![id]
      dropped.push(`companion:${id}`)
    }
  }

  next.characterFormatVersion = character.formatVersion
  next.updatedAt = new Date().toISOString()

  if (dropped.length > 0 && typeof console !== 'undefined') {
    console.info(`[character-forge] session refresh dropped orphaned refs: ${dropped.join(', ')}`)
  }

  return next
}

/** A {@link SessionStore} plus a hydration hook for async persistence wrappers. */
export interface SessionEngine extends SessionStore {
  /** Replace the whole state (e.g. after async IndexedDB load). Not an undo-able step. */
  hydrate(next: SessionFile): void
}

/** Builds the synchronous mutation engine. Callers supply the starting state (fresh seed or hydrated). */
export function createSessionEngine(
  character: CharacterFile,
  initialState: SessionFile,
): SessionEngine {
  // `state` is the live working copy (mutated in place); `snapshot` is the
  // immutable value handed to callers. `snapshot` changes reference only on
  // commit, which is what makes it a valid `useSyncExternalStore` getSnapshot.
  let state = initialState
  let snapshot = structuredClone(state)
  const listeners = new Set<(state: SessionFile) => void>()
  const history: SessionFile[] = []

  const slotMax = new Map(character.spellcasting?.slotPools.map((p) => [p.id, p.count]) ?? [])
  const resourceById = new Map((character.resources ?? []).map((r) => [r.id, r]))
  const consumableMax = new Map((character.consumables ?? []).map((c) => [c.id, c.max]))
  const hitDiceMax = new Map((character.stats.hitDice ?? []).map((g) => [g.classRef, g.count]))

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

  /** A long rest includes all short-rest recovery (rest semantics, which the
   *  engine owns — files encode each feature's *shortest* rest, e.g. Pact Magic
   *  is `on:'short'` only, and must still refill on a long rest). */
  function ruleApplies(rule: RecoverRule, kind: 'short' | 'long'): boolean {
    return rule.on === kind || (kind === 'long' && rule.on === 'short')
  }

  /** Apply every resource's / slot pool's / hit-dice group's `recover` rule for the given rest. */
  function applyRest(kind: 'short' | 'long') {
    const resources = (state.trackers.resources ??= {})
    for (const resource of character.resources ?? []) {
      for (const rule of resource.recover) {
        if (ruleApplies(rule, kind)) {
          resources[resource.id] = { used: recoverUsed(resources[resource.id]?.used ?? 0, rule) }
        }
      }
    }
    const slots = (state.trackers.slotPools ??= {})
    for (const pool of character.spellcasting?.slotPools ?? []) {
      for (const rule of pool.recover) {
        if (ruleApplies(rule, kind)) {
          slots[pool.id] = { used: recoverUsed(slots[pool.id]?.used ?? 0, rule) }
        }
      }
    }
    if (kind === 'long') {
      // Hit dice: only groups the file declares a long-rest recover rule for are
      // touched — no hardcoded "half your hit dice" default (T14 scope).
      const hitDice = (state.trackers.hitDice ??= {})
      for (const group of character.stats.hitDice ?? []) {
        for (const rule of group.recover ?? []) {
          if (rule.on === 'long') {
            hitDice[group.classRef] = {
              spent: recoverUsed(hitDice[group.classRef]?.spent ?? 0, rule),
            }
          }
        }
      }
      // HP to max: the active override (rolled/hand-edited, F2) takes precedence
      // over the compiled value when set.
      const compiledMax =
        typeof character.stats.maxHp.value === 'number' ? character.stats.maxHp.value : 0
      const maxHp = state.trackers.maxHpOverride ?? compiledMax
      state.trackers.hp = { current: maxHp, temp: 0 }
      state.trackers.deathSaves = { successes: 0, failures: 0 }
    }
    // Limited-use boon additions (D2) recover like any resource, on their own
    // RecoverModel — the boon carries its rules with it (there's no character-file
    // entry to read them from).
    const additionUses = (state.trackers.additions ??= {})
    for (const addition of state.additions ?? []) {
      if (!addition.limitedUse) continue
      for (const rule of addition.limitedUse.recover) {
        if (ruleApplies(rule, kind)) {
          additionUses[addition.id] = {
            used: recoverUsed(additionUses[addition.id]?.used ?? 0, rule),
          }
        }
      }
    }
    // Companions rest with the character: their resources follow the same
    // rules, and a long rest restores their HP to the compiled max.
    for (const sheet of character.companions ?? []) {
      const trackers = companion(sheet.id)
      for (const resource of sheet.resources ?? []) {
        for (const rule of resource.recover) {
          if (ruleApplies(rule, kind)) {
            const bag = (trackers.resources ??= {})
            bag[resource.id] = { used: recoverUsed(bag[resource.id]?.used ?? 0, rule) }
          }
        }
      }
      if (kind === 'long') {
        const max = typeof sheet.maxHp.value === 'number' ? sheet.maxHp.value : 0
        trackers.hp = { current: max, temp: 0 }
      }
    }
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
    setMaxHpOverride(value) {
      mutate(() => {
        if (value === undefined) delete state.trackers.maxHpOverride
        else state.trackers.maxHpOverride = value
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
        const max = resource ? resolveFormula(resource.max, character) : undefined
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
        bag[classRef] = {
          spent: clamp((bag[classRef]?.spent ?? 0) + 1, 0, hitDiceMax.get(classRef)),
        }
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
        if (selected.includes(ref)) return
        // Enforce the pool's chooseCount (D13 — the UI already disables past the
        // cap; this is the engine-level safety net for any other caller).
        const pool = character.pools?.[poolId]
        const limit = pool ? resolveFormula(pool.chooseCount, character) : undefined
        if (limit !== undefined && selected.length >= limit) return
        pools[poolId] = { selected: [...selected, ref] }
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
    updateAddition(id, patch) {
      mutate(() => {
        const additions = (state.additions ??= [])
        const addition = additions.find((a) => a.id === id)
        if (!addition) return
        Object.assign(addition, patch)
        // If the boon's cap shrank (or its limited-use was removed), clamp the
        // live use count so it never exceeds the new max.
        const uses = state.trackers.additions
        if (uses?.[id]) {
          const max = addition.limitedUse?.max ?? 0
          uses[id] = { used: clamp(uses[id].used, 0, max) }
        }
      })
    },
    removeAddition(id) {
      mutate(() => {
        state.additions = (state.additions ?? []).filter((a) => a.id !== id)
        if (state.trackers.additions) delete state.trackers.additions[id]
      })
    },
    tickAddition(id) {
      mutate(() => {
        const bag = (state.trackers.additions ??= {})
        const max = (state.additions ?? []).find((a) => a.id === id)?.limitedUse?.max
        bag[id] = { used: clamp((bag[id]?.used ?? 0) + 1, 0, max) }
      })
    },
    untickAddition(id) {
      mutate(() => {
        const bag = (state.trackers.additions ??= {})
        bag[id] = { used: Math.max(0, (bag[id]?.used ?? 0) - 1) }
      })
    },

    undoLast() {
      const previous = history.pop()
      if (!previous) return
      state = previous
      snapshot = structuredClone(state)
      for (const listener of listeners) listener(snapshot)
    },

    hydrate(next) {
      state = structuredClone(next)
      history.length = 0
      snapshot = structuredClone(state)
      for (const listener of listeners) listener(snapshot)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
