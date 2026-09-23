/* Zero-dependency Capacitor/Android detection.
 *
 * Same reasoning as detectTelegram.ts: this must be safe to call on the
 * very first render, before deciding whether to fetch the Capacitor
 * adapter chunk at all — so it does NOT import '@capacitor/core' here.
 *
 * Capacitor's native runtime injects `window.Capacitor` before any of the
 * app's own JS executes (it's part of the native WebView bootstrap, not
 * something the page opts into) — mirroring the field name
 * `isNativePlatform` and `getPlatform` that @capacitor/core's own
 * `Capacitor` singleton exposes, so this is checking the same signal
 * the real package would, just without paying for the import on Web.
 *
 * On a plain Web/PWA visit `window.Capacitor` is simply undefined —
 * there is no stub-object false-positive risk here the way there is
 * with Telegram's unconditionally-loaded script (see detectTelegram.ts),
 * because nothing in this project injects a Capacitor shim into the
 * Web build.
 */
export function isCapacitorNativeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function') return false;

  try {
    // getPlatform() check is defensive belt-and-suspenders: isNativePlatform()
    // alone is the documented API and should be sufficient, but excluding
    // 'web' explicitly costs nothing and guards against a future Capacitor
    // version changing isNativePlatform()'s default behavior in a web build.
    return cap.isNativePlatform() === true && cap.getPlatform?.() !== 'web';
  } catch {
    return false;
  }
}
