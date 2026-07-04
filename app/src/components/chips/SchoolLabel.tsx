export interface SchoolLabelProps {
  school: string
}

/** Spell school in small gray caps, like the printed template's chrome. */
export function SchoolLabel({ school }: SchoolLabelProps) {
  return <span className="school-label">{school}</span>
}
