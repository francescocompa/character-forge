import { useRegisterSW } from 'virtual:pwa-register/react'
import './updateToast.css'

/**
 * Service-worker update prompt (T17). Registered with `registerType: 'prompt'`,
 * so a freshly deployed shell is fetched but held back until Francesco taps
 * Reload — no silent swap mid-session. Also surfaces the one-time "ready to
 * work offline" confirmation after the first install.
 */
export function UpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div className="pwa-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <span className="pwa-toast__msg">New version available.</span>
          <div className="pwa-toast__actions">
            <button
              type="button"
              className="pwa-toast__btn pwa-toast__btn--primary"
              onClick={() => updateServiceWorker(true)}
            >
              Reload
            </button>
            <button type="button" className="pwa-toast__btn" onClick={close}>
              Later
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="pwa-toast__msg">Ready to work offline.</span>
          <div className="pwa-toast__actions">
            <button type="button" className="pwa-toast__btn" onClick={close}>
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  )
}
