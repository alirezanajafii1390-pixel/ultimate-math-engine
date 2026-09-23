import { useEffect, useRef, useState, type ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PlatformCtx } from '../PlatformContext';
import { webAdapter } from '../webAdapter';
import type { HapticImpactStyle, HapticNotificationType, PlatformAdapter, TelegramColorScheme } from '../types';

/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — Capacitor/Android platform adapter
   Phase 3 / Stage 3.4

   Scope deliberately matches what Phase 3 actually decided to build:
     - hardwareBack + minimize   (Decision 2 — Back=Home / Home=minimize)
     - haptics                   (real @capacitor/haptics)
     - theme → status bar sync   (below)
     - viewport                  ZERO_INSETS always (Decision 1 — real
                                  env(safe-area-inset-*) handles it, this
                                  adapter must NOT reintroduce Telegram's
                                  JS-driven inset logic)

   Everything else (mainButton, backButton, fullscreen, cloudStorage,
   share, initData) has no Capacitor/Android equivalent in V1 and stays
   fully inert — copied from webAdapter rather than reimplemented, so
   there is exactly one definition of "inert" to maintain.
   ═══════════════════════════════════════════════════════════ */

const IMPACT_STYLE_MAP: Record<HapticImpactStyle, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
  // Capacitor's ImpactStyle has no Rigid/Soft (that's an iOS-only UIKit
  // distinction) — the closest honest mapping on Android is Medium/Light.
  rigid: ImpactStyle.Medium,
  soft: ImpactStyle.Light,
};

const NOTIFICATION_TYPE_MAP: Record<HapticNotificationType, NotificationType> = {
  error: NotificationType.Error,
  success: NotificationType.Success,
  warning: NotificationType.Warning,
};

/** Reads the app's already-resolved theme straight from the DOM attribute
 *  core/store.tsx's applyResolved() sets (see src/index.css: dark is the
 *  default / absence of the attribute, `data-theme="light"` is explicit).
 *  Deliberately NOT reimplementing theme resolution here — this adapter
 *  only ever mirrors whatever the app already decided, onto the status
 *  bar. Never the other way around. */
function currentResolvedTheme(): TelegramColorScheme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/** Applies StatusBar style + background to match the app's current theme.
 *  Best-effort: StatusBar calls can reject on devices/OS versions where a
 *  given method isn't available — never let that surface as an error the
 *  user sees, this is a cosmetic sync, not a functional dependency. */
async function syncStatusBarToTheme(scheme: TelegramColorScheme) {
  try {
    if (scheme === 'light') {
      // Light background → dark (readable) status bar icons.
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#f5f5f7' });
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
    }
  } catch (err) {
    console.warn('[platform/capacitor] StatusBar sync skipped:', err);
  }
}

export default function CapacitorPlatformProvider({ children }: { children: ReactNode }) {
  // initError intentionally has no failure path to report here the way
  // Telegram's does — nothing in this component can throw during the
  // synchronous part of render (all Capacitor calls are async, inside
  // effects), so there is nothing for PlatformErrorBoundary to catch.
  const [colorScheme, setColorScheme] = useState<TelegramColorScheme>(currentResolvedTheme);
  const colorSchemeListenersRef = useRef(new Set<(scheme: TelegramColorScheme | undefined) => void>());

  // Mirror data-theme → React state → status bar, once, via a
  // MutationObserver on the single attribute core/store.tsx owns.
  // This file does not decide theme; it only watches for the decision.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const scheme = currentResolvedTheme();
      setColorScheme(scheme);
      colorSchemeListenersRef.current.forEach((cb) => cb(scheme));
      void syncStatusBarToTheme(scheme);
    };
    apply(); // sync once immediately — do not wait for the first change
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const adapter: PlatformAdapter = {
    ...webAdapter,
    isTelegram: false,

    theme: {
      colorScheme,
      onChange(cb) {
        colorSchemeListenersRef.current.add(cb);
        return () => colorSchemeListenersRef.current.delete(cb);
      },
    },

    // Decision 1: do NOT reintroduce Telegram's JS-driven inset logic.
    // Real env(safe-area-inset-*) via CSS handles this correctly inside
    // the native Android WebView, so this stays byte-for-byte the same
    // ZERO_INSETS shape webAdapter already uses.
    viewport: webAdapter.viewport,

    hardwareBack: {
      isSupported: true,
      onBack(cb) {
        const handle = CapacitorApp.addListener('backButton', () => cb());
        return () => {
          void handle.then((h) => h.remove());
        };
      },
    },

    minimize() {
      void CapacitorApp.minimizeApp();
    },

    haptics: {
      isSupported: true,
      impact(style) {
        void Haptics.impact({ style: IMPACT_STYLE_MAP[style] });
      },
      notification(type) {
        void Haptics.notification({ type: NOTIFICATION_TYPE_MAP[type] });
      },
      selectionChanged() {
        void Haptics.selectionChanged();
      },
    },

    // ready(): no explicit native call needed for V1. Capacitor's default
    // splash screen (config-driven, no @capacitor/splash-screen plugin
    // installed) auto-hides on its own timer; Math Engine's own launch
    // loader (index.html) handles the JS-visible loading state exactly
    // as it does on Web. Revisit only if @capacitor/splash-screen is
    // added later for a manually-dismissed native splash.
  };

  return <PlatformCtx.Provider value={adapter}>{children}</PlatformCtx.Provider>;
}
