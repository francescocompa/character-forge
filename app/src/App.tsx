import { CharacterLibraryProvider, useCharacterLibrary } from './manage/CharacterLibraryProvider'
import { CharacterList } from './manage/CharacterList'
import { CharacterWorkspace } from './manage/CharacterWorkspace'
import { UpdateToast } from './app/UpdateToast'
import './manage/manage.css'

/** Routes between the library list and an opened character (T16). */
function LibraryRoot() {
  const { loading, groups, selectedId, clearSelection } = useCharacterLibrary()
  if (loading) return <div className="cf-splash">Loading your characters…</div>

  const selected = selectedId ? groups.find((g) => g.characterId === selectedId) : undefined
  if (selected) return <CharacterWorkspace group={selected} onBack={clearSelection} />
  return <CharacterList />
}

export function App() {
  return (
    <CharacterLibraryProvider>
      <LibraryRoot />
      <UpdateToast />
    </CharacterLibraryProvider>
  )
}
