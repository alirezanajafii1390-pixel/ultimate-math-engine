/* Zero-dependency Telegram Mini Apps detection.
 *
 * Deliberately does NOT import any @tma.js/* package: this function must
 * be safe to call from the very first render, before we've decided
 * whether to even fetch the Telegram SDK. It only looks at globals/URL
 * data Telegram itself puts in place before the page's own JS runs.
 *
 * Two independent signals, either is sufficient:
 *   1. `window.Telegram.WebApp` — the object Telegram's WebView injects.
 *   2. `tgWebAppData` / `tgWebAppPlatform` present in the URL — how launch
 *      parameters are actually delivered on first load, per the Telegram
 *      Mini Apps launch-parameters spec.
 */
export function isTelegramEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const w = (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram;
  if (w && typeof w.WebApp === 'object' && w.WebApp !== null) return true;

  const search = window.location.search + window.location.hash;
  return /tgWebAppData|tgWebAppPlatform/.test(search);
}
