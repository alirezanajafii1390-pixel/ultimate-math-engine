/** Telegram bot/Mini App identifiers — needed to build a real
 *  `https://t.me/<bot>/<app>?startapp=...` deep link for
 *  platform.share.shareURL() (see core/sharing/share-service.ts).
 *
 *  Until APP_SHORT_NAME is filled in, deep links can't be built, and
 *  Share falls back to Web Share / clipboard everywhere — including
 *  inside Telegram. That fallback is fully functional on its own; this
 *  config only upgrades Telegram's share to use its own native chat
 *  picker instead. Nothing else needs to change once this is filled in. */

/** Set via @BotFather. */
export const BOT_USERNAME = 'MathEngineANBot';

/** Set via @BotFather's /newapp command (the short name you chose for
 *  the Mini App itself, distinct from the bot's own username). */
export const APP_SHORT_NAME: string | null = 'mathengine';

/** Telegram hard-limits start_param to 64 characters (and `[A-Za-z0-9_-]`,
 *  which our base64url encoding already satisfies). A payload encoding
 *  more than a short expression or a formula with one or two short
 *  variable values can easily exceed this — e.g. a 3-variable formula's
 *  JSON payload alone can be well over 100 chars once base64url-encoded.
 *  Enforced here, in the one place that actually assembles the final
 *  link, rather than in the codec itself (encodeDeepLink has no way to
 *  know it's being used for a Telegram start_param specifically). */
const START_PARAM_MAX_LENGTH = 64;

/** Builds a Mini App deep link carrying a start_param, or null if
 *  APP_SHORT_NAME hasn't been configured yet, OR if the encoded param
 *  exceeds Telegram's 64-char limit — callers should fall back to
 *  buildAppBaseLink() in that case (every current call site already
 *  does, via `buildAppDeepLink(...) ?? buildAppBaseLink()`). */
export function buildAppDeepLink(startParam: string): string | null {
  if (!APP_SHORT_NAME) return null;
  if (startParam.length > START_PARAM_MAX_LENGTH) return null;
  return `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${startParam}`;
}

/** A plain link to the Mini App with no start_param — opens the app fresh
 *  rather than reopening a specific result. Used by pages that don't (yet)
 *  encode their state into a startapp value: giving Telegram's shareURL a
 *  real URL, any URL, still gets the reliable native chat picker instead
 *  of falling through to Web Share (which has proven unreliable inside
 *  Telegram's own WebView — see PROJECT_CONTEXT.md). */
export function buildAppBaseLink(): string | null {
  if (!APP_SHORT_NAME) return null;
  return `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}`;
}
