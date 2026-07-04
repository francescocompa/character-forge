import { AppShell } from './app/AppShell'
import { useCharacterFile } from './character/characterFile'

export function App() {
  // v1 loads a single character: the bundled synthetic fixture by default, or a
  // local dev character if one is present (see useCharacterFile). T16 replaces
  // this with real file import + variant switching.
  const character = useCharacterFile()
  return <AppShell character={character} />
}
