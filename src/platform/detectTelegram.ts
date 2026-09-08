/* Zero-dependency Telegram Mini Apps detection.
 *
 * Deliberately does NOT import any @tma.js/* package: this function must
 * be safe to call from the very first render, before we've decided
 * whether to even fetch the Telegram SDK. It only looks at globals/URL
 * data Telegram itself puts in place before the page's own JS runs.
 *
 * Two independent signals, either is sufficient:
 *   1. `window.Telegram.WebApp.initData` is a non-empty string — NOT
 *      merely `window.Telegram.WebApp` existing as an object. The
 *      official telegram-web-app.js script (loaded unconditionally in
 *      index.html, needed for reliable detection after an in-app reload —
 *      see that file's comment) always defines `window.Telegram.WebApp`
 *      as an object on ANY page that includes it, by design, specifically
 *      so a page can feature-detect it without the script crashing a
 *      plain browser visit. Its `initData` is only ever populated with
 *      real content on a genuine Telegram launch; checking for the mere
 *      presence of the object alone previously false-positived on every
 *      plain browser/localhost visit too, since the script sets up the
 *      same stub object everywhere — triggering the entire Telegram SDK
 *      init path (real bridge calls with nothing to talk to) outside
 *      Telegram and breaking the app outright.
 *   2. `tgWebAppData` / `tgWebAppPlatform` present in the URL — how launch
 *      parameters are actually delivered on first load, per the Telegram
 *      Mini Apps launch-parameters spec. Only ever present on a genuine
 *      launch, never injected by the script itself.
 */
export function isTelegramEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const w = (window as unknown as { Telegram?: { WebApp?: { initData?: unknown } } }).Telegram;
  if (w && typeof w.WebApp === 'object' && w.WebApp !== null && typeof w.WebApp.initData === 'string' && w.WebApp.initData.length > 0) {
    return true;
  }

  const search = window.location.search + window.location.hash;
  return /tgWebAppData|tgWebAppPlatform/.test(search);
}
