import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { requestPersistentStorage } from './app/persistStorage'
// Inter, bundled (offline PWA — never fetch fonts from the network at runtime).
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './tokens/tokens.css'
import './app/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Reduce IndexedDB eviction risk for the character library + session layer.
void requestPersistentStorage()
