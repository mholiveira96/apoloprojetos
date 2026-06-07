import { useEffect, useState, useCallback } from 'react'
import { Download, X, Smartphone, Monitor } from 'lucide-react'

const DISMISS_KEY = 'apolo-pwa-install-dismissed'

function detectPlatform(): 'mobile' | 'desktop' {
  if (window.matchMedia('(max-width: 768px)').matches) return 'mobile'
  return 'desktop'
}

function isChromium(): boolean {
  return navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edg/')
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<'mobile' | 'desktop'>('desktop')

  const dismiss = useCallback(() => {
    setDismissed(true)
    setDeferredPrompt(null)
    setShowFallback(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }, [])

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    setPlatform(detectPlatform())

    if (standalone) return

    let fallbackTimer: ReturnType<typeof setTimeout>

    const handler = (e: Event) => {
      e.preventDefault()
      clearTimeout(fallbackTimer)
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // If no native prompt after 3s, show manual instructions fallback
    if (isChromium()) {
      fallbackTimer = setTimeout(() => {
        setDeferredPrompt((current) => {
          if (!current) setShowFallback(true)
          return current
        })
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(fallbackTimer)
    }
  }, [])

  if (isStandalone || dismissed || (!deferredPrompt && !showFallback)) return null

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  const PlatformIcon = platform === 'mobile' ? Smartphone : Monitor
  const nativeAvailable = !!deferredPrompt

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm">
      <div className="flex items-start gap-3 border border-[var(--line)] bg-[var(--paper)] p-4 shadow-lg">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--teal)]/10 text-[var(--teal)]">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--ink)]">Instalar Apolo</p>

          {nativeAvailable ? (
            <>
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
                  onClick={dismiss}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] border border-[var(--line)] hover:bg-[var(--paper-alt)] transition"
                >
                  Agora não
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                {platform === 'mobile' ? (
                  'Instale como app no seu celular.'
                ) : (
                  'Instale como app no seu computador.'
                )}
              </p>
              <div className="mt-2.5 flex items-start gap-2 rounded border border-[var(--line)] bg-[var(--bg-body-workspace)] p-2.5">
                <PlatformIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-soft)]" />
                <p className="text-[11px] leading-relaxed text-[var(--ink-soft)]">
                  {platform === 'mobile' ? (
                    <>Toque no menu <strong>⋮</strong> do navegador e selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</>
                  ) : (
                    <>Clique no ícone <strong>⬇</strong> na barra de endereços, ou vá em <strong>⋮ → Apps → Instalar este site como app</strong>.</>
                  )}
                </p>
              </div>
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-[11px] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
                >
                  Entendi, não mostrar mais
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
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
