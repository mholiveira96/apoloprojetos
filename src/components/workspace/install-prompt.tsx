import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'apolo-pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Already installed as PWA — no prompt needed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone || dismissed || !deferredPrompt) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
      localStorage.setItem(DISMISS_KEY, '1')
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm">
      <div className="flex items-start gap-3 border border-[var(--line)] bg-[var(--paper)] p-4 shadow-lg">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--teal)]/10 text-[var(--teal)]">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--ink)]">Instalar Apolo</p>
          <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
            Adicione à tela inicial para acesso rápido como um app.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--teal)] hover:opacity-90 transition"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] hover:bg-[var(--paper-alt)] transition"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
