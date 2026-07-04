import { FutureWrap, LevelBadge, RefLink } from '../../components/chips'
import { useLibrary } from '../../library'
import { useCharacter } from '../../character/CharacterProvider'

/** A library term rendered as a tappable popover trigger (name resolved from the library). */
function RefTerm({ refKey, label }: { refKey?: string; label: string }) {
  const { openRef } = useLibrary()
  if (!refKey) return <span>{label}</span>
  return <RefLink label={label} onClick={() => openRef(refKey)} />
}

/**
 * Identity strip: name, per-class level badges (Shigen canon §2.8 — "① Fighter
 * ⑤ Celestial Warlock"; a single-class build shows one), subclasses (a planned
 * subclass appears only in Build view, grayed until its unlockLevel), species
 * (reflavored displayName), and background.
 */
export function IdentityStrip() {
  const { character, nameOf, viewMode, isVisible, isFuture } = useCharacter()
  const { chassis, meta } = character
  const classes = [...chassis.classes].sort((a, b) => a.classOrder - b.classOrder)

  return (
    <header className="identity">
      <div className="identity__name-row">
        <h1 className="identity__name">{meta.name}</h1>
        {meta.variantLabel && <span className="identity__variant">{meta.variantLabel}</span>}
      </div>

      <div className="identity__classes">
        {classes.map((cls) => {
          const sub = cls.subclass
          const showSub = sub && isVisible(sub.unlockLevel)
          const subFuture = sub && isFuture(sub.unlockLevel)
          const subName = sub ? nameOf(sub.ref, sub.displayName) : ''
          return (
            <span key={cls.ref} className="class-badge">
              <LevelBadge level={cls.levels} />
              <span className="class-badge__text">
                <RefTerm refKey={cls.ref} label={nameOf(cls.ref, cls.displayName)} />
                {showSub && (
                  <span className="class-badge__sub">
                    {subFuture && viewMode === 'build' ? (
                      <FutureWrap level={sub!.unlockLevel}>
                        <RefTerm refKey={sub!.ref} label={subName} />
                      </FutureWrap>
                    ) : (
                      <RefTerm refKey={sub!.ref} label={subName} />
                    )}
                  </span>
                )}
              </span>
            </span>
          )
        })}
      </div>

      <div className="identity__chassis">
        <span className="chassis-item">
          <span className="chassis-item__label">Species</span>
          <RefTerm
            refKey={chassis.species.ref}
            label={nameOf(chassis.species.ref, chassis.species.displayName)}
          />
        </span>
        <span className="chassis-item">
          <span className="chassis-item__label">Background</span>
          <RefTerm
            refKey={chassis.background.ref}
            label={nameOf(chassis.background.ref, chassis.background.displayName)}
          />
        </span>
      </div>
    </header>
  )
}
