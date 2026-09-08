/* ═══════════════════════════════════════════════════════════
   DEEP LINKS — unified payload codec
   ═══════════════════════════════════════════════════════════
 * One encode/decode pair for every section's shareable state, so
 * AppShell's single startParam handler can route to the right page
 * with the right values pre-filled — matching what Calculator's
 * deep link already did on its own (see core/calc-helpers.ts), now
 * extended to Formula and Converter too.
 */

export type DeepLinkPayload =
  | { kind: 'calculator'; expr: string }
  | { kind: 'formula'; id: string; values: Record<string, string> }
  | { kind: 'converter'; cat: string; from: string; to: string; value: string };

/** Telegram restricts start_param to `[A-Za-z0-9_-]` (1–64 chars) — same
 *  base64url technique (RFC 4648 §5) as calc-helpers' calculator-only
 *  codec, just wrapping a JSON payload instead of a bare expression
 *  string so more than one shape of data can round-trip through it. */
export function encodeDeepLink(payload: DeepLinkPayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Returns null on any malformed input instead of throwing — a deep link
 *  is untrusted external input (same caveat as the rest of Telegram
 *  initData): a bad start_param should be silently ignored, never crash
 *  the app or be treated as validated data. */
export function decodeDeepLink(param: string): DeepLinkPayload | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const parsed: unknown = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'kind' in parsed &&
      (parsed.kind === 'calculator' || parsed.kind === 'formula' || parsed.kind === 'converter')
    ) {
      return parsed as DeepLinkPayload;
    }
    return null;
  } catch {
    return null;
  }
}
