import type { CapacitorConfig } from '@capacitor/cli';

/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — Capacitor configuration
   Phase 3 / Stage 3.2 — Capacitor Foundation

   This does not replace the existing build pipeline:
     npm run build  →  dist/  →  (cap sync)  →  android/

   `webDir: 'dist'` points Capacitor at the SAME output Vite already
   produces for the Web/PWA deploy — no second frontend, no separate
   build config. Running `npx cap sync android` after `npm run build`
   copies `dist/` into the native shell and updates native deps; it
   does not rebuild the web app itself.
   ═══════════════════════════════════════════════════════════ */
const config: CapacitorConfig = {
  appId: 'dev.mathengine.app',
  appName: 'Math Engine',
  webDir: 'dist',
  // bundledWebRuntime intentionally omitted (default false) — Capacitor's
  // JS runtime ships as part of the app bundle Vite builds, not injected
  // separately, keeping one single bundling story.
  android: {
    // Sends console.* from the WebView to `adb logcat` during
    // development. Harmless in release builds; consider gating this
    // off for production once real-device testing begins, per
    // Stage 3.11 hardening.
    webContentsDebuggingEnabled: true,
  },
};

export default config;
