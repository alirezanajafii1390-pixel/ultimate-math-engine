/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — core/calc-helpers
   Pure string-editing helpers for the calculator's expression buffer.
   Kept dependency-free (no React) so they're directly unit-testable,
   separate from the UI callbacks in CalculatorPage that wrap them.
   ═══════════════════════════════════════════════════════════ */

export const BINARY_OPS = ['+', '-', '*', '/', '^'];

/**
 * Toggles the sign of the number at the end of `prev` (the "+/-" key).
 *
 * The tricky part: a trailing '-' in the expression is ambiguous — it's
 * either a unary minus already applied to this number (e.g. "-5", or
 * "3^-5" where the number is -5), or the binary minus of a subtraction
 * (e.g. "3-5", where the number itself is +5 and the '-' belongs to the
 * operator before it). Only the unary case should be "unwrapped"; the
 * binary case should get an explicit "-(...)" wrapping the number instead.
 *
 * A trailing '-' is unary (the number is already negative) only if it's at
 * the very start of the expression, or itself preceded by another
 * operator/'(' — i.e. nothing valid could follow it except a signed number.
 * Otherwise (preceded by a digit/'/')/etc.) it's a binary subtraction.
 *
 * A second, separate case: this function's own "wrap" step below (the
 * final `return` in the `if (m)` block) can leave the buffer ending in a
 * *closed* "(-5)" — e.g. one press of +/- turns "5" into "(-5)". A second
 * press should undo that back to "5", but "(-5)" ends in ')', not a digit,
 * so the digit-suffix regex below never matches it at all. That's handled
 * as its own check, first, guarded by the same "was this plausibly added
 * by the wrap step" condition (empty / after an operator / after '(') so a
 * genuine function call ending the same way, e.g. "sin(-5)", is correctly
 * left alone rather than having its own parens stripped.
 */
export function negateExpr(prev: string): string {
  const wrapped = /\(-(\d+\.?\d*)\)$/.exec(prev);
  if (wrapped) {
    const beforeWrap = prev.slice(0, prev.length - wrapped[0].length);
    if (beforeWrap === '' || BINARY_OPS.includes(beforeWrap.slice(-1)) || beforeWrap.endsWith('(')) {
      return beforeWrap + wrapped[1];
    }
  }

  const m = /(\d+\.?\d*)$/.exec(prev);
  if (m) {
    const before = prev.slice(0, prev.length - m[0].length);
    if (before.endsWith('(-')) return before.slice(0, -2) + m[0];
    const isUnaryMinus =
      before.endsWith('-') && (before.length === 1 || BINARY_OPS.includes(before[before.length - 2]) || before[before.length - 2] === '(');
    if (isUnaryMinus) return before.slice(0, -1) + m[0];
    if (before === '' || BINARY_OPS.includes(before.slice(-1)) || before.endsWith('(')) {
      return `${before}(-${m[0]})`;
    }
  }
  if (prev === '') return '-';
  return prev;
}

/** Encodes an expression for use in a Telegram deep-link start_param,
 *  which Telegram restricts to `[A-Za-z0-9_-]` (1–64 chars) — a raw math
 *  expression with `+`, `(`, spaces, etc. can't survive that unencoded.
 *  Standard base64url (RFC 4648 §5): '+' → '-', '/' → '_', padding
 *  stripped (Telegram's charset has no room for '='). */
export function encodeExprForStartParam(expr: string): string {
  const b64 = btoa(unescape(encodeURIComponent(expr)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reverses encodeExprForStartParam. Returns null on malformed input
 *  instead of throwing — a deep link is untrusted external input (same
 *  caveat as the rest of Telegram initData), so a bad start_param should
 *  just be ignored, never crash the app. */
export function decodeExprFromStartParam(param: string): string | null {
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}
