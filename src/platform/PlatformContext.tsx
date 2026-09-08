import { Component, createContext, useContext, useState, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import type { PlatformAdapter } from './types';
import { webAdapter } from './webAdapter';
import { isTelegramEnvironment } from './detectTelegram';

export const PlatformCtx = createContext<PlatformAdapter>(webAdapter);

/** Read the current platform adapter. Safe to call unconditionally —
 *  outside Telegram (or before Telegram's SDK has finished loading) this
 *  returns `webAdapter`, whose every method is a safe no-op. */
export function usePlatform(): PlatformAdapter {
  return useContext(PlatformCtx);
}

// Only imported when isTelegramEnvironment() is true, so plain Web loads
// never fetch this chunk — the Telegram SDK is not part of their bundle
// path at all, not just unused code sitting in it.
const TelegramPlatformProvider = lazy(() => import('./telegram/TelegramPlatformProvider'));

/** Nothing in the tree above TelegramPlatformProvider can catch a render
 *  error it throws (the app's own layout/ErrorBoundary sits INSIDE it,
 *  as a child, wrapping <Outlet/> — not above it). Without this, a
 *  Telegram SDK hiccup (e.g. a bridge contract change, or a launch-params
 *  hook throwing) would white-screen the entire app instead of degrading
 *  to Web behavior. Deliberately silent — no user-facing fallback UI like
 *  layout/ErrorBoundary shows; a Telegram-specific failure should never
 *  be visible to the person, it should just quietly mean "acts like Web
 *  from here on". */
class PlatformErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string | null }> {
  state = { failed: false, message: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[platform] Telegram SDK failed, falling back to Web mode:', error, info.componentStack);
  }
  render() {
    if (this.state.failed) {
      return <PlatformCtx.Provider value={{ ...webAdapter, initError: this.state.message }}>{this.props.children}</PlatformCtx.Provider>;
    }
    return this.props.children;
  }
}

/** Wrap the app once, near the root. Decides once (at mount) whether
 *  we're inside Telegram and, if so, lazy-loads the real adapter behind
 *  Suspense — children keep rendering against the safe web adapter in
 *  the meantime, so there is no blank frame while the SDK chunk loads. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [inTelegram] = useState(isTelegramEnvironment);

  if (!inTelegram) {
    return <PlatformCtx.Provider value={webAdapter}>{children}</PlatformCtx.Provider>;
  }

  return (
    <PlatformErrorBoundary>
      <Suspense fallback={<PlatformCtx.Provider value={webAdapter}>{children}</PlatformCtx.Provider>}>
        <TelegramPlatformProvider>{children}</TelegramPlatformProvider>
      </Suspense>
    </PlatformErrorBoundary>
  );
}
