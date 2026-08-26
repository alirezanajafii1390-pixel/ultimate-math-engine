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

/** Builds a Mini App deep link carrying a start_param, or null if
 *  APP_SHORT_NAME hasn't been configured yet. */
export function buildAppDeepLink(startParam: string): string | null {
  if (!APP_SHORT_NAME) return null;
  return `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${startParam}`;
}
