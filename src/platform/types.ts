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
   *  before Telegram has reported one yet. Consumed by resolveTheme() in
   *  core/store.tsx when the user's preference is 'system'. */
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
   *  areas). All zero on Web. Consumed by layout/AppShell.tsx. */
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
  /** No-op on Web (returns a no-op unsubscribe). Consumed by
   *  layout/AppShell.tsx, wired to React Router's navigate(). */
  onClick(cb: () => void): () => void;
}

/** Android's hardware/system Back event. Deliberately NOT folded into
 *  PlatformBackButton above — that interface models a visible on-screen
 *  button Telegram shows/hides on request; Android's Back has no such
 *  UI to show/hide, it's a raw system event AppShell subscribes to and
 *  decides navigation policy for itself (same division of responsibility
 *  as PlatformBackButton: this adapter only exposes the primitive).
 *  isSupported is false everywhere except the Capacitor/Android adapter. */
export interface PlatformHardwareBack {
  isSupported: boolean;
  /** No-op on Web/Telegram (returns a no-op unsubscribe). Fires on every
   *  system Back press; AppShell.tsx decides what that means (navigate
   *  to Home, or — see `minimize()` below — leave the app) rather than
   *  this layer owning any navigation policy. */
  onBack(cb: () => void): () => void;
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
  /** No-op on Web. The primitive is fully implemented in
   *  TelegramPlatformProvider, but no page currently calls request() —
   *  no fullscreen toggle UI exists yet anywhere in the app. */
  request(): Promise<void>;
  exit(): Promise<void>;
}

/** A minimal async key-value store, shaped to match what Telegram's
 *  CloudStorage offers (string keys, string values). Backed by real
 *  Telegram CloudStorage in TelegramPlatformProvider — used today as a
 *  write-only settings/favorites backup (core/store.tsx), never as the
 *  primary store (that remains core/storage.ts). On Web, `isAvailable`
 *  is false and every method is a safe no-op. */
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
  /** Set only when Telegram's SDK failed to initialize (falling back to
   *  Web behavior everywhere) — the caught error's message, for
   *  diagnostics. `null` on Web, and `null` in Telegram when init
   *  actually succeeded. Surfaced in Developer Mode (see DeveloperPage)
   *  rather than shown to regular users. */
  initError: string | null;
  theme: PlatformTheme;
  viewport: PlatformViewport;
  backButton: PlatformBackButton;
  hardwareBack: PlatformHardwareBack;
  /** Sends the app to the background using the platform's own standard
   *  behavior (Android: task minimize, not process kill). No-op on Web
   *  and Telegram — there is nothing equivalent to call there, and
   *  Telegram's own Back Button UI already covers that context's exit
   *  path. Only meaningful alongside hardwareBack.isSupported. */
  minimize(): void;
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
