interface SafeArea {
  top: number
  bottom: number
  left: number
  right: number
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  requestFullscreen?: () => void
  initData: string
  platform: string
  initDataUnsafe?: { start_param?: string }
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  safeAreaInset?: SafeArea
  contentSafeAreaInset?: SafeArea
  onEvent?: (event: string, cb: () => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function webApp() {
  return window.Telegram?.WebApp ?? null
}

export function isTelegram() {
  const app = webApp()
  if (!app) return false
  if (app.initData) return true
  return Boolean(app.platform && app.platform !== 'unknown')
}

export function startParam() {
  return webApp()?.initDataUnsafe?.start_param || ''
}

export function initTelegram() {
  const app = webApp()
  if (!app) return null
  app.ready()
  app.expand()
  try {
    app.setHeaderColor?.('#ffffff')
    app.setBackgroundColor?.('#f5f5f5')
  } catch {
    /* Цвет шапки в части клиентов только для чтения. */
  }
  if (isTelegram()) {
    try {
      app.requestFullscreen?.()
    } catch {
      /* Старые клиенты оставляют обычную шапку. */
    }
  }
  const applyInsets = () => {
    const top = (app.safeAreaInset?.top ?? 0) + (app.contentSafeAreaInset?.top ?? 0)
    const bottom = (app.safeAreaInset?.bottom ?? 0) + (app.contentSafeAreaInset?.bottom ?? 0)
    document.documentElement.style.setProperty('--sat', `${top}px`)
    document.documentElement.style.setProperty('--sab', `${bottom}px`)
  }
  applyInsets()
  app.onEvent?.('safeAreaChanged', applyInsets)
  app.onEvent?.('contentSafeAreaChanged', applyInsets)
  app.onEvent?.('fullscreenChanged', applyInsets)
  app.onEvent?.('viewportChanged', applyInsets)
  return app
}
