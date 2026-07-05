/**
 * Ask the browser to mark our on-device storage as persistent (T17), so the
 * IndexedDB session + character library is not silently evicted under storage
 * pressure. Best-effort: unsupported or denied is fine — the app still works,
 * it's just more evictable. Never throws.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    if (await navigator.storage.persisted()) return
    await navigator.storage.persist()
  } catch {
    // Storage API missing or blocked (e.g. private mode) — ignore.
  }
}
