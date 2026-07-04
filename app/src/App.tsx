import { FORMAT_VERSION } from './formatVersion'
import { Gallery } from './tokens/Gallery'

export function App() {
  // Dev-only iteration surface for T05's tokens + chips (scope D7: iterate in
  // browser). Views land in Phase 2 and replace this as the app's real root.
  if (import.meta.env.DEV) {
    return <Gallery />
  }

  return (
    <main>
      <h1>character-forge</h1>
      <p>Character file format v{FORMAT_VERSION}</p>
    </main>
  )
}
