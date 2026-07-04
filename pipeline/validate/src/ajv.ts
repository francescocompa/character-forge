import { createRequire } from 'node:module'
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

// createRequire lets us load the JSON schemas from the `schema` workspace by
// package specifier (respecting its `exports` map) without needing a JSON
// import-assertion syntax that varies across Node/tsx versions.
const require = createRequire(import.meta.url)
const characterSchema: object = require('@character-forge/schema/character.schema.json')
const sessionSchema: object = require('@character-forge/schema/session.schema.json')

const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true })
addFormats(ajv)

export const validateCharacterSchema: ValidateFunction = ajv.compile(characterSchema)
export const validateSessionSchema: ValidateFunction = ajv.compile(sessionSchema)
