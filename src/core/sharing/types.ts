/* ═══════════════════════════════════════════════════════════
   SHARE SYSTEM — types
   ═══════════════════════════════════════════════════════════
 * Each page hands ShareService only the data about ITS OWN result —
 * never a pre-formatted string. share-formatter.ts turns this into
 * localized text; share-service.ts decides how to actually send it
 * (Telegram native picker, Web Share, or clipboard).
 */

export interface CalculatorShareData {
  kind: 'calculator';
  /** The expression as shown to the user (already pretty-printed). */
  expression: string;
  /** The formatted result string, ready to display (unit-less). */
  result: string;
}

export interface FormulaShareData {
  kind: 'formula';
  formulaName: string;
  variables: { key: string; value: string }[];
  /** Almost always one entry; kept as a list so a formula with multiple
   *  outputs (e.g. a quadratic's x₁/x₂) can share all of them. */
  results: { label: string; value: string }[];
}

export interface ConverterShareData {
  kind: 'converter';
  categoryLabel: string;
  input: { value: string; unit: string };
  output: { value: string; unit: string };
}

export type ShareData = CalculatorShareData | FormulaShareData | ConverterShareData;

export interface ShareRequest {
  data: ShareData;
  /** A URL that reopens this exact result inside Math Engine. Not
   *  populated by any page yet (see task point 8) — the contract exists
   *  now so wiring it in later doesn't require touching this file, the
   *  formatter, or the service's call signature. When present and
   *  Telegram's native share is available, the service prefers it over
   *  Web Share / clipboard, since a real Telegram share needs a URL. */
  deepLink?: string;
}

export type ShareMethod = 'telegram' | 'web-share' | 'clipboard' | 'none';

export interface ShareOutcome {
  method: ShareMethod;
  success: boolean;
}
