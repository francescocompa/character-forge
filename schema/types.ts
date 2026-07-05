/**
 * character-forge — shared TypeScript types.
 *
 * SINGLE SOURCE OF TRUTH for the app. These types mirror `character.schema.json`
 * and `session.schema.json` by hand and MUST be kept in sync manually: when you
 * change a schema, change the matching type here (and vice versa). The schema is
 * authoritative for validation; these types are authoritative for the app's code.
 *
 * Conventions:
 * - `Ref` is a kebab-case key into `CharacterFile.library`. Resolution is NOT
 *   enforced by the schema or the type system — the validator CLI (T04) checks it.
 * - `Markup` is a sheet-markup string (see markup-grammar.md). It's a plain
 *   `string` at the type level; the parser gives it structure at render time.
 * - Compiled numbers are authoritative: the file records results, the app never
 *   recomputes them (scope §1, §6).
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** kebab-case key into `library`. */
export type Ref = string

/** Sheet-markup string (see markup-grammar.md). */
export type Markup = string

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export type Edition = '2014' | '2024' | 'UA' | 'Homebrew'

export type ActionCost = 'action' | 'bonus' | 'reaction' | 'free' | 'passive' | 'special'

export type HitDie = 'd6' | 'd8' | 'd10' | 'd12'

/** A compiled snapshot number with an optional provenance note. */
export interface StatValue {
  value: number | string
  note?: Markup
}

/** Structured recovery. More than one rule = mixed recovery (e.g. Second Wind). */
export type RecoverModel = RecoverRule[]

export interface RecoverRule {
  on: 'long' | 'short' | 'dawn' | 'turn' | 'encounter' | 'other'
  /** 'all' = restore to max; number = restore that many; string = displayed formula. */
  amount: 'all' | number | string
  note?: Markup
}

// ---------------------------------------------------------------------------
// Character file
// ---------------------------------------------------------------------------

export interface CharacterFile {
  formatVersion: 1
  meta: Meta
  chassis: Chassis
  abilities: Abilities
  stats: Stats
  currentLevel: number
  progression?: ProgressionItem[]
  actionEconomy?: ActionEconomy
  attacks?: Attack[]
  spellcasting?: Spellcasting
  /** Volatile-element pools (D13), keyed by stable pool id. */
  pools?: Record<string, Pool>
  resources?: Resource[]
  consumables?: Consumable[]
  equipment?: Equipment
  companions?: CompanionSheet[]
  /** Every `ref` in the file resolves here. */
  library: Record<string, Extract>
}

export interface Meta {
  name: string
  player?: string
  /** Variants of one character share this id (D12). */
  characterId: string
  variantLabel?: string
  /** Data-URI, budget <= 200 KB. */
  portrait?: string
  createdAt: string
  updatedAt: string
}

export interface Chassis {
  species: SpeciesChoice
  background: BackgroundChoice
  /** One entry per class. Multiclass is first-class (D11). */
  classes: ClassEntry[]
}

export interface SpeciesChoice {
  ref: Ref
  /** Reflavor: shown instead of the library entry's name. */
  displayName?: string
  modifications?: Modification[]
}

export interface BackgroundChoice {
  ref: Ref
  displayName?: string
  modifications?: Modification[]
}

export interface Modification {
  field?: string
  from?: string
  to?: string
  note: Markup
}

export interface ClassEntry {
  ref: Ref
  displayName?: string
  levels: number
  hitDie: HitDie
  /** 1 = starting class (proficiency-grant resolution + display order). */
  classOrder: number
  subclass?: SubclassChoice
  note?: Markup
}

export interface SubclassChoice {
  ref: Ref
  displayName?: string
  /** A planned subclass is progression content, grayed until this level. */
  unlockLevel: number
}

export interface Abilities {
  STR: AbilityScore
  DEX: AbilityScore
  CON: AbilityScore
  INT: AbilityScore
  WIS: AbilityScore
  CHA: AbilityScore
}

export interface AbilityScore {
  base: number
  final: number
  modifier: number
  note?: Markup
}

export interface Stats {
  ac: StatValue
  maxHp: StatValue
  initiative: StatValue
  proficiencyBonus: number
  speeds: Speed[]
  /** Per class (multiclass, §2.8). */
  hitDice?: HitDiceGroup[]
  saves: Save[]
  skills: Skill[]
  passives?: {
    perception?: number
    investigation?: number
    insight?: number
  }
  resistances?: Markup[]
  immunities?: Markup[]
  vulnerabilities?: Markup[]
  conditionAdvantages?: Markup[]
  senses?: Markup[]
  languages?: string[]
  proficiencies?: {
    armor?: string[]
    weapons?: string[]
    tools?: string[]
  }
}

export interface Speed {
  type: 'walk' | 'fly' | 'swim' | 'climb' | 'burrow'
  value: number
  note?: Markup
}

export interface HitDiceGroup {
  classRef: Ref
  die: HitDie
  count: number
  /** Long-rest recovery for this class's hit-dice pool, pre-resolved by the compiler
   *  (e.g. half the group's count, minimum 1). Absent = the engine does not
   *  auto-recover this group on long rest — no hardcoded SRD formula (T14). */
  recover?: RecoverModel
}

export interface Save {
  ability: Ability
  modifier: number
  proficient: boolean
  note?: Markup
}

export interface Skill {
  name: string
  ability: Ability
  proficiency: 'none' | 'half' | 'proficient' | 'expertise'
  modifier: number
  note?: Markup
}

export type ProgressionKind =
  | 'feature'
  | 'invocation'
  | 'feat'
  | 'asi'
  | 'subclass'
  | 'spell-learned'
  | 'slot-change'
  | 'mastery-change'
  | 'proficiency'
  | 'other'

export interface ProgressionItem {
  name: string
  displayName?: string
  ref?: Ref
  /** Granting class; absent for species/background/feat lines. */
  classRef?: Ref
  kind: ProgressionKind
  summary?: Markup
  action?: ActionCost
  /** Id of the `resources[]` entry that tracks this feature's uses, if limited. */
  limitedUseRef?: string
  unlockLevel: number
}

export interface ActionEconomy {
  actions?: ActionItem[]
  bonusActions?: ActionItem[]
  reactions?: ActionItem[]
  other?: ActionItem[]
}

export interface ActionItem {
  name: string
  summary?: Markup
  ref?: Ref
  unlockLevel: number
}

export interface Attack {
  name: string
  displayName?: string
  ref?: Ref
  toHit?: ToHit
  save?: AttackSave
  range?: string
  damage?: Markup
  /** On-hit extras / modal notes (push, smite dice, SLOW). */
  riders?: AttackRider[]
  /** Consumable this attack spends (e.g. arrows). */
  consumableRef?: string
  notes?: Markup
  unlockLevel?: number
}

export interface ToHit {
  /** Total modifier including magicBonus. */
  modifier: number
  /** Portion from a magic item, shown separably (the circled +1). */
  magicBonus?: number
  note?: Markup
}

export interface AttackSave {
  ability: Ability
  dc: number
  note?: Markup
}

export interface AttackRider {
  name: string
  summary?: Markup
  ref?: Ref
  unlockLevel?: number
}

export interface Spellcasting {
  sources: SpellSource[]
  /** Pools that can coexist at one spell level with different recovery (§2.8). */
  slotPools: SlotPool[]
  spells: Spell[]
  /** Explicit out->in replacement links for fixed-known casters (Warlock/Sorcerer). */
  swaps?: SpellSwap[]
}

export interface SpellSource {
  /** Referenced by Spell.origins[] and Pool.sourceId. */
  id: string
  name: string
  classRef?: Ref
  originRef?: Ref
  ability: Ability
  saveDc: number
  attackMod: number
  prepareRule?: Markup
  note?: Markup
}

export interface SlotPool {
  id: string
  name?: string
  sourceId?: string
  /** Spell level (1-9). A shared table is several pools, one per level. */
  slotLevel: number
  count: number
  recover: RecoverModel
  unlockLevel?: number
  note?: Markup
}

export interface Spell {
  name: string
  displayName?: string
  ref?: Ref
  /** 0 = cantrip. */
  level: number
  school?: string
  concentration?: boolean
  ritual?: boolean
  components?: {
    v?: boolean
    s?: boolean
    m?: string | boolean
  }
  summary?: Markup
  /** SpellSource.id(s) -> colored origin dot(s). Two entries = dual-source (two-tone/bordered dot). */
  origins: string[]
  /** How the caster accesses this spell (prepare limit vs granted vs innate); distinct from origins. */
  role?: 'prepared' | 'alwaysPrepared' | 'innate' | 'known' | 'ritualOnly'
  /** preparedSpells pool id, if this spell is a pool member. Absent = always available. */
  poolRef?: string
  unlockLevel: number
  /** Fixed-known casters: character level at which this spell is swapped out. Must be > unlockLevel. */
  swapOutLevel?: number
}

export interface SpellSwap {
  /** Character level of the swap. */
  atLevel: number
  /** Spell.name dropped at atLevel. */
  out: string
  /** Spell.name gained at atLevel. */
  in: string
  /** SpellSource.id the swap belongs to (optional). */
  sourceId?: string
  note?: Markup
}

export interface Pool {
  /** Open string: 'preparedSpells', 'weaponMasteries', or a future kind. */
  kind: string
  name: string
  /** For preparedSpells, the SpellSource prepared from. */
  sourceId?: string
  /** Number selected, or a displayed formula string. */
  chooseCount: number | string
  options: PoolOption[]
  /** Compiler default selection (refs from options); seeds the session loadout. */
  defaults?: Ref[]
  unlockLevel?: number
  note?: Markup
}

export interface PoolOption {
  ref: Ref
  name: string
  displayName?: string
  summary?: Markup
  unlockLevel?: number
}

export interface Resource {
  id: string
  name: string
  ref?: Ref
  /** Number or displayed formula string (e.g. 'PB'). */
  max: number | string
  recover: RecoverModel
  unlockLevel: number
  note?: Markup
}

export interface Consumable {
  id: string
  name: string
  ref?: Ref
  max?: number
  notes?: Markup
}

export interface Equipment {
  items?: Item[]
  /** Seeds the session layer on first import; absolute currency lives there after. */
  currency?: Currency
  attunement?: {
    max: number
    note?: Markup
  }
  carryingCapacity?: {
    lb?: number
    note?: Markup
  }
}

export interface Item {
  id: string
  name: string
  ref?: Ref
  quantity: number
  weightLb?: number
  cost?: string
  summary?: Markup
  /** Default state; live state lives in the session loadout. */
  equipped?: boolean
  carried?: boolean
  attuned?: boolean
  unlockLevel?: number
}

export interface Currency {
  cp?: number
  sp?: number
  ep?: number
  gp?: number
  pp?: number
}

export interface CompanionSheet {
  id: string
  name: string
  ref?: Ref
  portrait?: string
  abilities: Abilities
  ac: StatValue
  maxHp: StatValue
  speeds: Speed[]
  saves?: Save[]
  skills?: Skill[]
  attacks?: Attack[]
  features?: CompanionFeature[]
  resistances?: Markup[]
  immunities?: Markup[]
  conditionAdvantages?: Markup[]
  senses?: Markup[]
  languages?: string[]
  resources?: Resource[]
}

export interface CompanionFeature {
  name: string
  summary?: Markup
  ref?: Ref
}

export interface Extract {
  name: string
  edition: Edition
  /** Open string: spell, feature, feat, condition, item, species, background, class, subclass, invocation, rule, ... */
  type: string
  source: string
  page?: number | string
  /** Full compiled text (markdown; may contain sheet-markup tags). */
  markdown: string
}

// ---------------------------------------------------------------------------
// Session file
// ---------------------------------------------------------------------------

export interface SessionFile {
  formatVersion: 1
  characterId: string
  variantLabel?: string
  characterFormatVersion: number
  updatedAt: string
  trackers: Trackers
  loadout: Loadout
  additions?: Addition[]
  /** Per-companion trackers, keyed by CompanionSheet.id. */
  companions?: Record<string, CompanionTrackers>
}

export interface Trackers {
  hp?: { current: number; temp?: number }
  deathSaves?: { successes?: number; failures?: number }
  /** Spent slots per pool, keyed by SlotPool.id. */
  slotPools?: Record<string, { used: number }>
  /** Spent uses per resource, keyed by Resource.id. */
  resources?: Record<string, { used: number }>
  /** Spent hit dice per class, keyed by classRef. */
  hitDice?: Record<string, { spent: number }>
  /** Current tally per consumable, keyed by Consumable.id. */
  consumables?: Record<string, { count: number }>
  currency?: Currency
  conditions?: string[]
  inspiration?: boolean
  /** Spent uses per limited-use boon addition, keyed by Addition.id. */
  additions?: Record<string, { used: number }>
  /** Player override for max HP (rolled/hand-edited), takes precedence over the
   *  compiled `stats.maxHp` (T03 review item F2). Absent = use the compiled value. */
  maxHpOverride?: number
}

export interface Loadout {
  /** Selected option refs per pool, keyed by pool id. */
  pools?: Record<string, { selected: string[] }>
  /** Equipped/carried overrides per item, keyed by Item.id. */
  equipped?: Record<string, { equipped?: boolean; carried?: boolean }>
}

export interface Addition {
  id: string
  kind: 'item' | 'boon' | 'note'
  name: string
  /** Boon mechanics, an item's note, or a note's body (sheet-markup). */
  summary?: Markup
  /** Item additions: stack count (joins the carried-weight total). */
  quantity?: number
  /** Item additions: per-unit weight in lb. */
  weightLb?: number
  /** Boon additions: tracked uses (max + recovery), ticked like any resource. */
  limitedUse?: { max: number; recover: RecoverModel }
  addedAt: string
}

export interface CompanionTrackers {
  hp?: { current: number; temp?: number }
  resources?: Record<string, { used: number }>
  conditions?: string[]
}

// ---------------------------------------------------------------------------
// Session store interface (the app's views code against this)
// ---------------------------------------------------------------------------

/**
 * Which resource pool a tracker operation targets. Namespaced so a companion's
 * pools never collide with the main sheet's. `owner: 'character'` = the main
 * sheet; `owner: companionId` = that companion.
 */
export interface TrackerScope {
  owner: 'character' | (string & {})
}

export type RestKind = 'short' | 'long'

/**
 * The session-layer store views bind to. Implementations persist to IndexedDB
 * (via `idb`), namespaced per characterId + variantLabel; the T02 contract is
 * the surface, T14 builds the engine. All mutators are synchronous from the
 * caller's view and notify `subscribe` listeners after applying.
 */
export interface SessionStore {
  // -- reads --------------------------------------------------------------
  /** Current session snapshot (immutable copy). */
  getState(): SessionFile

  // -- HP / death saves ---------------------------------------------------
  setCurrentHp(value: number, scope?: TrackerScope): void
  setTempHp(value: number, scope?: TrackerScope): void
  setDeathSaves(successes: number, failures: number): void
  /** Set/clear the rolled-or-edited maxHP override (F2); `undefined` reverts to the compiled value. */
  setMaxHpOverride(value: number | undefined): void

  // -- tick trackers (slots, resources, hit dice) -------------------------
  /** Spend one use from a slot pool / resource; `spend` clamps at max. */
  tick(kind: 'slotPool' | 'resource', id: string, scope?: TrackerScope): void
  /** Recover one use; `untick` clamps at 0. */
  untick(kind: 'slotPool' | 'resource', id: string, scope?: TrackerScope): void
  spendHitDie(classRef: string): void
  regainHitDie(classRef: string): void

  // -- consumables --------------------------------------------------------
  setConsumable(id: string, count: number): void
  adjustConsumable(id: string, delta: number): void

  // -- currency / conditions / inspiration --------------------------------
  setCurrency(currency: Currency): void
  setConditions(conditions: string[], scope?: TrackerScope): void
  setInspiration(value: boolean): void

  // -- loadout (D13) ------------------------------------------------------
  getSelection(poolId: string): string[]
  select(poolId: string, ref: string): void
  deselect(poolId: string, ref: string): void
  setEquipped(itemId: string, state: { equipped?: boolean; carried?: boolean }): void

  // -- rests --------------------------------------------------------------
  /** Apply every pool's / resource's `recover` rule for the given rest kind. */
  applyShortRest(): void
  applyLongRest(): void

  // -- additions (D2: in-session boons / found items / notes) -------------
  /** Create an addition; returns its generated id. */
  addAddition(addition: Omit<Addition, 'id' | 'addedAt'>): string
  /** Edit an addition in place (id/addedAt are immutable). Clamps boon uses if `max` shrinks. */
  updateAddition(id: string, patch: Partial<Omit<Addition, 'id' | 'addedAt'>>): void
  removeAddition(id: string): void
  /** Spend one use of a limited-use boon addition; clamps at its `max`. */
  tickAddition(id: string): void
  /** Regain one use of a limited-use boon addition; clamps at 0. */
  untickAddition(id: string): void

  // -- history ------------------------------------------------------------
  /** Undo the last mutating operation. */
  undoLast(): void

  // -- reactivity ---------------------------------------------------------
  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe(listener: (state: SessionFile) => void): () => void
}
