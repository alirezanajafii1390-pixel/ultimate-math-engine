import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { backButton, cloudStorage, hapticFeedback, init, mainButton, miniApp, shareURL, themeParams, useLaunchParams, useRawInitData, useSignal, viewport } from '@tma.js/sdk-react';
import { PlatformCtx } from '../PlatformContext';
import type { PlatformAdapter, TelegramColorScheme } from '../types';

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 } as const;

/** Telegram's theme params expose a background color, not a direct
 *  light/dark flag (there is no confirmed `colorScheme` field on this
 *  SDK's reactive theme-params component — only individual colors). We
 *  derive light/dark from `bgColor`'s perceived luminance, which is the
 *  standard technique for this and works with any palette Telegram sends,
 *  official or custom. */
function deriveColorScheme(bgColor: string | undefined): TelegramColorScheme | undefined {
  if (!bgColor) return undefined;
  const m = /^#?([0-9a-f]{6})$/i.exec(bgColor);
  if (!m) return undefined;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? 'dark' : 'light';
}

/** Runs once per page load. Idempotent guard because this module can in
 *  theory be evaluated more than once under React StrictMode's
 *  double-invoke-in-dev behavior. */
let sdkInitStarted = false;

export default function TelegramPlatformProvider({ children }: { children: ReactNode }) {
  // `initialized` tracks whether init()/miniApp.mount() succeeded. If the
  // SDK throws (e.g. our zero-dependency pre-check false-positived, or a
  // future Telegram client changes its bridge contract), we fall back to
  // isTelegram: false rather than leaving the app half-initialized.
  const [initialized, setInitialized] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  useEffect(() => {
    if (sdkInitStarted) {
      setInitialized(true);
      return;
    }
    sdkInitStarted = true;
    try {
      init();
      // themeParams must be mounted before miniApp for miniApp's own
      // properties to be populated correctly (per official docs).
      themeParams.mount();
      miniApp.mount();
      backButton.mount();
      mainButton.mount();
      // Tell Telegram our essential UI is ready as early as possible —
      // this dismisses Telegram's own loading placeholder. Math Engine's
      // own launch loader (index.html) is separate and unaffected.
      miniApp.ready();
      // Fire-and-forget: viewport insets are read reactively below and
      // simply stay at their zero default until this resolves, so there's
      // no reason to delay `initialized`/ready() on it.
      viewport
        .mount()
        .then(() => {
          // Exposes --tg-viewport-height / --tg-viewport-stable-height /
          // --tg-viewport-width as CSS custom properties, kept live by the
          // SDK itself from here on (no manual re-binding needed on
          // resize/keyboard-open/fullscreen-change). Only meaningful once
          // viewport has actually mounted, hence chained here rather than
          // called eagerly above. See CalculatorPage's height calc for
          // the one place this is consumed, as a fallback hedge alongside
          // 100dvh — see PROJECT_CONTEXT.md decision 10 for why.
          viewport.bindCssVars();
        })
        .catch((e) => {
          console.warn('[platform/telegram] viewport mount failed (safe area insets will stay 0):', e);
        });
      setInitialized(true);
    } catch (e) {
      console.warn('[platform/telegram] SDK initialization failed, falling back to Web mode:', e);
      setInitFailed(true);
    }
  }, []);

  // Reactive: re-renders (and rebuilds the adapter below) whenever
  // Telegram fires its theme-changed event, since bgColor is a signal
  // themeParams updates internally on that event. No manual event
  // listener needed — this is what makes Auto theme track Telegram live.
  const bgColor = useSignal(themeParams.bgColor);
  const colorScheme = deriveColorScheme(bgColor);

  // Reactive: signals default to zero insets before viewport.mount()
  // resolves, then update live if Telegram's own chrome changes (e.g.
  // rotating the device, or the client adjusting its own UI).
  const safeAreaInsets = useSignal(viewport.safeAreaInsets);
  const contentSafeAreaInsets = useSignal(viewport.contentSafeAreaInsets);
  const isBackButtonSupported = useSignal(backButton.isSupported);
  const isMainButtonSupported = useSignal(mainButton.isMounted);
  // cloudStorage has no separate mount step (unlike themeParams/miniApp/
  // backButton/viewport) — it's usable directly once init() has run.
  const isCloudStorageSupported = useSignal(cloudStorage.isSupported);
  const isFullscreen = useSignal(viewport.isFullscreen);
  // hapticFeedback has no separate mount step either — usable directly
  // once init() has run, same as cloudStorage.
  const isHapticsSupported = useSignal(hapticFeedback.isSupported);

  // Reads from launch parameters already present in the URL at page
  // load — exactly what our zero-dependency isTelegramEnvironment() check
  // also looked at, so this should essentially always succeed. If it
  // somehow throws anyway (e.g. malformed launch params), PlatformError
  // Boundary in PlatformContext.tsx catches it and falls back to Web mode
  // — safer than a local try/catch here, which would call a different
  // number of hooks across renders depending on whether it threw.
  const rawInitData = useRawInitData();
  const launchParams = useLaunchParams();
  const user = (launchParams?.tgWebAppData as { user?: { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string } } | undefined)?.user;
  const startParam = (launchParams as { tgWebAppStartParam?: string } | undefined)?.tgWebAppStartParam ?? null;

  const adapter: PlatformAdapter = useMemo(
    () => ({
      isTelegram: !initFailed,

      // Live-reactive: colorScheme comes from `bgColor` above, which
      // updates automatically on Telegram's theme_changed event. Consumers
      // reading `usePlatform().theme.colorScheme` re-render for free —
      // onChange below exists only for API symmetry with the Web adapter
      // and isn't the primary update path.
      theme: {
        colorScheme,
        onChange() {
          return () => {};
        },
      },

      // Live-reactive: see safeAreaInsets/contentSafeAreaInsets above.
      // AppShell consumes these via CSS custom properties it sets itself
      // (platform/ stays DOM-free) — see layout/AppShell.tsx.
      viewport: {
        safeAreaInsets: safeAreaInsets ?? ZERO_INSETS,
        contentSafeAreaInsets: contentSafeAreaInsets ?? ZERO_INSETS,
        onChange() {
          return () => {};
        },
      },

      // Real show/hide/onClick — AppShell decides *when* to show it (based
      // on route) and what "back" means (see layout/AppShell.tsx). This
      // adapter only exposes the primitive, never owns navigation policy.
      backButton: {
        isSupported: !!isBackButtonSupported,
        show() {
          try {
            backButton.show();
          } catch {
            /* not mounted/supported — safe to ignore */
          }
        },
        hide() {
          try {
            backButton.hide();
          } catch {
            /* not mounted/supported — safe to ignore */
          }
        },
        onClick(cb) {
          try {
            return backButton.onClick(cb);
          } catch {
            return () => {};
          }
        },
      },

      // Real setParams/onClick, mirroring the backButton primitive above —
      // used so far by FormulaPage's detail view (mirrors its existing
      // favorite icon-button as a Telegram-native bottom action; see
      // PROJECT_CONTEXT.md for why it mirrors rather than replaces it).
      mainButton: {
        isSupported: !!isMainButtonSupported,
        show(text) {
          try {
            mainButton.setParams({ text, isVisible: true });
          } catch {
            /* not mounted/supported — safe to ignore */
          }
        },
        hide() {
          try {
            mainButton.setParams({ isVisible: false });
          } catch {
            /* not mounted/supported — safe to ignore */
          }
        },
        onClick(cb) {
          try {
            return mainButton.onClick(cb);
          } catch {
            return () => {};
          }
        },
      },

      // Real impact/notification/selectionChanged. Known platform caveat
      // (Telegram's own bug, not ours — documented in the Telegram Mini
      // Apps issue tracker at the time of writing): on some Telegram for
      // Android versions, impactOccurred and selectionChanged silently
      // produce no vibration while notificationOccurred does. Nothing to
      // fix on our side; noting it so it isn't mistaken for a bug here if
      // testing on Android shows only the equals/error feedback working.
      haptics: {
        isSupported: !!isHapticsSupported,
        impact(style) {
          try {
            hapticFeedback.impactOccurred(style);
          } catch {
            /* not supported — safe to ignore */
          }
        },
        notification(type) {
          try {
            hapticFeedback.notificationOccurred(type);
          } catch {
            /* not supported — safe to ignore */
          }
        },
        selectionChanged() {
          try {
            hapticFeedback.selectionChanged();
          } catch {
            /* not supported — safe to ignore */
          }
        },
      },

      initData: {
        raw: rawInitData ?? null,
        user: user
          ? {
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name,
              username: user.username,
              languageCode: user.language_code,
            }
          : null,
        startParam,
      },

      // Real request/exit — both need Telegram client 8.0+ and, per the
      // SDK's usage prerequisites (init + parent component mounted), are
      // only actually callable once viewport has mounted (Step 3, above).
      // No UI trigger is wired up anywhere yet (no fullscreen button was
      // asked for) — this only makes the primitive itself real and safe
      // to call whenever a future step needs it.
      fullscreen: {
        isSupported: (() => {
          try {
            return viewport.requestFullscreen.isAvailable() && viewport.exitFullscreen.isAvailable();
          } catch {
            return false;
          }
        })(),
        isFullscreen: !!isFullscreen,
        async request() {
          try {
            await viewport.requestFullscreen();
          } catch (e) {
            console.warn('[platform/telegram] requestFullscreen failed:', e);
          }
        },
        async exit() {
          try {
            await viewport.exitFullscreen();
          } catch (e) {
            console.warn('[platform/telegram] exitFullscreen failed:', e);
          }
        },
      },

      // Real get/set/remove. Telegram's own CloudStorage limits apply
      // (per Telegram's Bot API docs, at the time of writing): up to 1024
      // keys per user, each key 1–128 chars (letters, digits, `_`, `-`
      // only), each value up to 4096 chars. This adapter doesn't enforce
      // those — it stays a thin, honest wrapper; a caller that needs
      // CloudStorage should already be picking keys/values within those
      // bounds, and an out-of-bounds call fails safe below (`false`/
      // `null`) rather than throwing.
      //
      // NOTE: wiring this into core/storage.ts / core/store.tsx as an
      // actual backup-or-sync layer for app state is a separate, later
      // product decision (which slices to sync, conflict resolution,
      // whether it's opt-in) — out of scope here. This step only makes
      // the primitive real; core/storage.ts remains the sole primary
      // store, untouched.
      cloudStorage: {
        isAvailable: !!isCloudStorageSupported,
        async get(key) {
          try {
            const v = await cloudStorage.getItem(key);
            // Telegram returns '' for a key that was never set; our
            // contract uses null for "absent" so callers can tell that
            // apart from a legitimately empty string value.
            return v === '' ? null : v;
          } catch (e) {
            console.warn('[platform/telegram] cloudStorage.get failed:', e);
            return null;
          }
        },
        async set(key, value) {
          try {
            await cloudStorage.setItem(key, value);
            return true;
          } catch (e) {
            console.warn('[platform/telegram] cloudStorage.set failed:', e);
            return false;
          }
        },
        async remove(key) {
          try {
            await cloudStorage.deleteItem(key);
            return true;
          } catch (e) {
            console.warn('[platform/telegram] cloudStorage.remove failed:', e);
            return false;
          }
        },
      },

      // Known platform caveat (Telegram's own bug, not ours — see
      // PROJECT_CONTEXT.md): shareURL.isAvailable() has been reported to
      // return true on some clients where the call then silently does
      // nothing. We follow the official API exactly as documented; there
      // is no workaround available from the client side for that failure
      // mode. share-service.ts (core/sharing/) always has a Web Share /
      // clipboard fallback ready regardless.
      share: {
        isSupported: shareURL.isAvailable(),
        async shareURL(url, text) {
          try {
            if (!shareURL.isAvailable()) return false;
            shareURL(url, text);
            return true;
          } catch (e) {
            console.warn('[platform/telegram] shareURL failed:', e);
            return false;
          }
        },
      },

      ready() {
        try {
          miniApp.ready();
        } catch {
          /* not mounted — safe to ignore */
        }
      },
    }),
    [initFailed, colorScheme, safeAreaInsets, contentSafeAreaInsets, isBackButtonSupported, isMainButtonSupported, isCloudStorageSupported, isFullscreen, isHapticsSupported, rawInitData, user, startParam],
  );

  if (!initialized && !initFailed) {
    // Still mounting the SDK — render children against the inert web
    // adapter for this one tick rather than blocking on it.
    return <PlatformCtx.Provider value={{ ...adapter, isTelegram: false }}>{children}</PlatformCtx.Provider>;
  }

  return <PlatformCtx.Provider value={adapter}>{children}</PlatformCtx.Provider>;
}
