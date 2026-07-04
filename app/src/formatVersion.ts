/**
 * Character file format version. Source of truth is the `formatVersion` const
 * in `schema/character.schema.json` — keep this mirror in sync when the schema
 * bumps (breaking changes only; the app refuses files with a newer version).
 */
export const FORMAT_VERSION = 1
