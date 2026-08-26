/* ═══════════════════════════════════════════════════════════
   PLATFORM LAYER — Contract
   ═══════════════════════════════════════════════════════════
 * This file defines what "a platform" means to the rest of Math Engine.
 * It has ZERO imports from any Telegram package — pages and components
 * depend on this interface only, never on @tma.js/* directly.
 *
 * Two implementations exist:
 *   - webAdapter.ts             — always available, no external dependency
 *   - telegram/TelegramPlatformProvider.tsx — lazy-loaded, only touched
 *     when Math Engine is actually running inside Telegram
 *
 * Architectural rule (do not violate in later steps):
 *   No file outside src/platform/ may import from '@tma.js/*'.
 *   Everything Telegram-specific is translated into these plain types
 *   at the boundary, so the rest of the app never has to know the SDK
 *   exists.
 */

export type TelegramColorScheme = 'light' | 'dark';

export interface PlatformTheme {
  /** Telegram's reported color scheme. `undefined` outside Telegram, or
   *  before Telegram has reported one yet.
   *  Wiring this up to Math Engine's resolveTheme() is Step 2 — for now
   *  this field exists on the contract but is not yet consumed anywhere. */
  colorScheme: TelegramColorScheme | undefined;
  /** Subscribes to scheme changes; returns an unsubscribe function.
   *  No-op on Web (there is nothing to subscribe to). */
  onChange(cb: (scheme: TelegramColorScheme | undefined) => void): () => void;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PlatformViewport {
  /** Insets required to avoid Telegram's own chrome (status bar, gesture
   *  areas). All zero on Web. Wiring this into AppShell is Step 3. */
  safeAreaInsets: SafeAreaInsets;
  /** Insets required to avoid Telegram's own chrome AND content Telegram
   *  draws over the app (e.g. the header in some clients). All zero on Web. */
  contentSafeAreaInsets: SafeAreaInsets;
  onChange(cb: () => void): () => void;
}

export interface PlatformBackButton {
  isSupported: boolean;
  /** No-op on Web. */
  show(): void;
  /** No-op on Web. */
  hide(): void;
  /** No-op on Web (returns a no-op unsubscribe). Wiring this to React
   *  Router's navigation stack is Step 4. */
  onClick(cb: () => void): () => void;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotificationType = 'error' | 'success' | 'warning';

export interface PlatformHaptics {
  isSupported: boolean;
  /** No-op on Web and anywhere haptics aren't supported. */
  impact(style: HapticImpactStyle): void;
  notification(type: HapticNotificationType): void;
  selectionChanged(): void;
}

export interface PlatformInitDataUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface PlatformInitData {
  /** Raw, unmodified init data string exactly as sent by Telegram, or
   *  `null` outside Telegram.
   *
   *  ⚠️ NOT VALIDATED. This is surfaced purely as internal application
   *  data (e.g. for an optional greeting). It must NEVER be treated as
   *  a trusted identity claim or used for authorization. Real validation
   *  of init data can only happen server-side, once a backend exists,
   *  by checking Telegram's signature against the bot token. Until then,
   *  nothing in Math Engine may assume this data is genuine. */
  raw: string | null;
  /** Best-effort parsed user info from initData, for DISPLAY ONLY.
   *  Same trust caveat as `raw` applies. */
  user: PlatformInitDataUser | null;
  /** The `start_param` value from a deep link (e.g. `t.me/bot/app?startapp=xyz`),
   *  or `null` if the app was opened without one. Telegram restricts this to
   *  `[A-Za-z0-9_-]`, so anything richer (an expression with symbols) must be
   *  encoded — see modules/calculator's deep-link handling for the scheme
   *  used. Same trust caveat as the rest of initData: treat as untrusted
   *  input, not as anything requiring validation before display/use here. */
  startParam: string | null;
}

export interface PlatformFullscreen {
  isSupported: boolean;
  isFullscreen: boolean;
  /** No-op on Web. Wiring this into Calculator is Step 7. */
  request(): Promise<void>;
  exit(): Promise<void>;
}

/** A minimal async key-value store, shaped to match what Telegram's
 *  CloudStorage offers (string keys, string values). Backing this with
 *  Telegram CloudStorage is Step 6 — on Web, `isAvailable` is false and
 *  every method is a safe no-op, so callers must treat it as optional
 *  sync/backup, never as the primary store (that remains core/storage.ts). */
export interface PlatformCloudStorage {
  isAvailable: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<boolean>;
}

export interface PlatformMainButton {
  isSupported: boolean;
  /** No-op on Web. Shows Telegram's bottom Main Button with the given text. */
  show(text: string): void;
  /** No-op on Web. */
  hide(): void;
  /** No-op on Web (returns a no-op unsubscribe). */
  onClick(cb: () => void): () => void;
}

export interface PlatformShare {
  /** True only when Telegram's native share-URL flow is actually usable
   *  right now (per Telegram's own isAvailable() prerequisites). Always
   *  false on Web. */
  isSupported: boolean;
  /** Opens Telegram's native chat/channel/group picker with the given URL
   *  and optional accompanying text — the "tap Share → pick a chat → sent"
   *  flow, no copy/paste round trip. Resolves true if the call itself
   *  didn't throw; Telegram gives no further confirmation that the user
   *  actually completed a send. No-op (resolves false) on Web — callers
   *  should fall back to Web Share / clipboard when this resolves false
   *  or isSupported is false. */
  shareURL(url: string, text?: string): Promise<boolean>;
}

export interface PlatformAdapter {
  isTelegram: boolean;
  theme: PlatformTheme;
  viewport: PlatformViewport;
  backButton: PlatformBackButton;
  mainButton: PlatformMainButton;
  haptics: PlatformHaptics;
  initData: PlatformInitData;
  fullscreen: PlatformFullscreen;
  cloudStorage: PlatformCloudStorage;
  share: PlatformShare;
  /** Signals that the app's essential UI has rendered. On Telegram this
   *  hides Telegram's own loading placeholder (must be called once, as
   *  early as reasonably possible). No-op on Web — Math Engine already
   *  has its own launch loader (see index.html) that Web doesn't need
   *  Telegram's help to dismiss. */
  ready(): void;
}
