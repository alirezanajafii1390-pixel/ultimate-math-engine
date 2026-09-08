import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { PlatformProvider } from './platform/PlatformContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PlatformProvider>
  </StrictMode>,
)

// Dismiss the launch loader (see index.html) now that the app has mounted.
// A minimum display time keeps it from being a jarring one-frame flicker
// on fast/cached loads, while still feeling instant on slower ones.
const loader = document.getElementById('app-loader')
if (loader) {
  const started = (window as unknown as { __appLoadStart?: number }).__appLoadStart ?? Date.now()
  const MIN_MS = 550
  const wait = Math.max(0, MIN_MS - (Date.now() - started))
  window.setTimeout(() => {
    loader.classList.add('al-hide')
    window.setTimeout(() => loader.remove(), 450)
  }, wait)
}

// Service worker: production-only (avoids caching against a dev server
// with hot-reloading JS). Registered relative to the current page so it
// works whether the app is deployed at a domain root or under a subpath.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err)
    })
  })
}
