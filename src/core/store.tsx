/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — core/store
   Single source of truth. State changes only via official API.
   ❌ state.history.entries.push(...)  ✔ store.addHistory(...)
   ═══════════════════════════════════════════════════════════ */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { storage, runMigrations } from './storage';
import { usePlatform } from '../platform/PlatformContext';
import { bus } from './events';
import type { Language } from './i18n';
import type { FormulaDef } from './formulas';
import type { UnitDef } from './units';
import type { AngleMode } from './parser';

/* ── Types ──────────────────────────────────────────────── */
export type QualityProfile = 'auto' | 'high' | 'medium' | 'low';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface SettingsState {
  language: Language;
  /** User's raw preference — 'system' (default) follows the OS, and is not
   *  overridden by later system-preference changes if the user has
   *  explicitly picked 'light' or 'dark'. Use resolveTheme() to get the
   *  actual light/dark value to render. */
  theme: ThemePreference;
  displayName: string;
  angleMode: AngleMode;
  precision: number;
  devMode: boolean;
  helpSeen: Record<string, boolean>;
  /** Only consulted in Telegram (Web's haptics are already no-op regardless
   *  of this flag). Defaults on — see modules/settings for the toggle,
   *  shown only inside Telegram. */
  hapticsEnabled: boolean;
}

export interface HistoryEntry {
  id: string;
  kind: 'calculator' | 'formula' | 'converter';
  label: string; // expression or "5 km → m"
  result: string;
  detail?: string;
  ts: number;
  payload?: string; // reusable payload (expression / formula id / converter ref)
}

export interface Pin {
  id: string;
  type: 'formula' | 'converter' | 'page';
  ref: string; // formula id | "cat:from:to" | route
  label: string;
  ts: number;
}

export interface AppState {
  settings: SettingsState;
  history: HistoryEntry[];
  favFormulas: string[];
  favConverters: string[]; // "cat:from:to"
  pins: Pin[];
  memory: number | null;
  ans: number | null;
  customFormulas: FormulaDef[];
  customUnits: Record<string, UnitDef[]>;
  focusMode: boolean;
  /** Dev-only, live CSS custom-property overrides — a raw palette explorer
   *  for trying out release color combinations (see Developer Options ›
   *  Theme Editor). Key is the CSS variable name including its "--" prefix
   *  (e.g. "--accent-primary"), value is any valid CSS color string typed in
   *  by hand. Regular users never touch this — it's not exposed outside
   *  Developer Options. */
  themeOverrides: Record<string, string>;
  /** Graphics/accessibility overrides — dev-only (Developer Options). Regular
   *  users never set these; the app auto-detects an appropriate profile per
   *  device (see resolveAutoQuality) so it can't be left in a bad state by
   *  mistake. `null` in any field means "no override, use the automatic
   *  value" — see the runtime-apply effect in StoreProvider below. */
  devFlags: { animations: boolean | null; blur: boolean | null; quality: Exclude<QualityProfile, 'auto'> | null; reducedMotion: boolean | null };
}

export const DEFAULT_STATE: AppState = {
  settings: {
    language: 'fa',
    theme: 'system',
    displayName: '',
    angleMode: 'deg',
    precision: 12,
    devMode: false,
    helpSeen: {},
    hapticsEnabled: true,
  },
  history: [],
  favFormulas: [],
  favConverters: [],
  pins: [],
  memory: null,
  ans: null,
  customFormulas: [],
  customUnits: {},
  focusMode: false,
  themeOverrides: {},
  devFlags: { animations: null, blur: null, quality: null, reducedMotion: null },
};

/* ── Actions ────────────────────────────────────────────── */
export type Action =
  | { type: 'settings'; patch: Partial<SettingsState> }
  | { type: 'history:add'; entry: HistoryEntry }
  | { type: 'history:clear'; kind?: HistoryEntry['kind'] }
  | { type: 'fav:formula'; id: string }
  | { type: 'fav:converter'; key: string }
  | { type: 'pin:add'; pin: Pin }
  | { type: 'pin:remove'; id: string }
  | { type: 'memory'; value: number | null }
  | { type: 'ans'; value: number }
  | { type: 'customFormula:add'; f: FormulaDef }
  | { type: 'customFormula:remove'; id: string }
  | { type: 'customUnit:add'; cat: string; u: UnitDef }
  | { type: 'customUnit:remove'; cat: string; id: string }
  | { type: 'focus'; on: boolean }
  | { type: 'devFlags'; patch: Partial<AppState['devFlags']> }
  | { type: 'theme:set'; key: string; value: string }
  | { type: 'theme:reset'; key?: string }
  | { type: 'replaceAll'; state: AppState }
  | { type: 'reset' };

/** Pure — exported for unit testing. Not part of the public store API;
 *  components should still only touch state via dispatch (see file header). */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'history:add':
      return { ...state, history: [action.entry, ...state.history].slice(0, 500) };
    case 'history:clear':
      return {
        ...state,
        history: action.kind ? state.history.filter((h) => h.kind !== action.kind) : [],
      };
    case 'fav:formula':
      return {
        ...state,
        favFormulas: state.favFormulas.includes(action.id)
          ? state.favFormulas.filter((f) => f !== action.id)
          : [action.id, ...state.favFormulas],
      };
    case 'fav:converter':
      return {
        ...state,
        favConverters: state.favConverters.includes(action.key)
          ? state.favConverters.filter((f) => f !== action.key)
          : [action.key, ...state.favConverters],
      };
    case 'pin:add':
      if (state.pins.some((p) => p.ref === action.pin.ref && p.type === action.pin.type)) return state;
      return { ...state, pins: [action.pin, ...state.pins].slice(0, 24) };
    case 'pin:remove':
      return { ...state, pins: state.pins.filter((p) => p.id !== action.id) };
    case 'memory':
      return { ...state, memory: action.value };
    case 'ans':
      return { ...state, ans: action.value };
    case 'customFormula:add':
      return { ...state, customFormulas: [action.f, ...state.customFormulas.filter((f) => f.id !== action.f.id)] };
    case 'customFormula:remove':
      return { ...state, customFormulas: state.customFormulas.filter((f) => f.id !== action.id) };
    case 'customUnit:add': {
      const list = state.customUnits[action.cat] ?? [];
      return {
        ...state,
        customUnits: { ...state.customUnits, [action.cat]: [...list.filter((u) => u.id !== action.u.id), action.u] },
      };
    }
    case 'customUnit:remove': {
      const list = (state.customUnits[action.cat] ?? []).filter((u) => u.id !== action.id);
      return { ...state, customUnits: { ...state.customUnits, [action.cat]: list } };
    }
    case 'focus':
      return { ...state, focusMode: action.on };
    case 'devFlags':
      return { ...state, devFlags: { ...state.devFlags, ...action.patch } };
    case 'theme:set':
      return { ...state, themeOverrides: { ...state.themeOverrides, [action.key]: action.value } };
    case 'theme:reset': {
      if (!action.key) return { ...state, themeOverrides: {} };
      if (!(action.key in state.themeOverrides)) return state;
      const next = { ...state.themeOverrides };
      delete next[action.key];
      return { ...state, themeOverrides: next };
    }
    case 'replaceAll':
      return action.state;
    case 'reset':
      return { ...DEFAULT_STATE };
    default:
      return state;
  }
}

/* ── Persistence ────────────────────────────────────────── */
const SLICES: (keyof AppState)[] = [
  'settings',
  'history',
  'favFormulas',
  'favConverters',
  'pins',
  'memory',
  'ans',
  'customFormulas',
  'customUnits',
  'themeOverrides',
];

function loadState(): AppState {
  runMigrations();
  const base = { ...DEFAULT_STATE };
  for (const k of SLICES) {
    const v = storage.get<unknown>(`state.${k}`, undefined);
    if (v !== undefined) (base as Record<string, unknown>)[k] = v;
  }
  // shallow-merge settings to tolerate new keys
  base.settings = { ...DEFAULT_STATE.settings, ...(base.settings as SettingsState) };
  return base;
}

/** Persists only the slices that changed since `prev` (reference-equality diff —
 *  the reducer always returns a new object for a touched slice and keeps the
 *  same reference for untouched ones, so this is cheap and exact). Returns the
 *  list of slice keys whose write failed (e.g. localStorage quota exceeded) so
 *  the caller can surface that to the user instead of failing silently. */
function persist(state: AppState, prev: AppState | null): string[] {
  const failed: string[] = [];
  for (const k of SLICES) {
    if (prev && prev[k] === state[k]) continue;
    const ok = storage.set(`state.${k}`, state[k]);
    if (!ok) failed.push(k);
  }
  return failed;
}

/** Resolves a theme preference to the actual light/dark value to render.
 *  'system' reads the OS preference live (not cached), so it's always
 *  current if called again later — e.g. from the matchMedia change handler
 *  in the runtime-apply effect below, or from Settings' theme selector to
 *  show what "System" currently means.
 *
 *  `telegramColorScheme` is an optional second source, used only when
 *  `pref === 'system'`. Priority (highest first):
 *    1. An explicit 'light'/'dark' choice (`pref` itself — returned
 *       immediately, telegramColorScheme is never even consulted).
 *    2. Telegram's reported color scheme, when running inside Telegram
 *       (`platform.theme.colorScheme` — see platform/PlatformContext.tsx).
 *    3. The OS preference via matchMedia (existing behavior, unchanged
 *       for Web and for Telegram before it has reported a scheme yet). */
export function resolveTheme(pref: ThemePreference, telegramColorScheme?: 'light' | 'dark'): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  if (telegramColorScheme) return telegramColorScheme;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Whether the OS/browser has "reduce motion" turned on — the real
 *  accessibility signal, read directly rather than through a manual toggle,
 *  so motion is off automatically for anyone who needs that, with zero
 *  setup. Factored out so both resolveAutoQuality and the runtime-apply
 *  effect below use the exact same check. */
function prefersReducedMotionOS(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** "Auto" quality is resolved from real, cheap device signals (CPU core count,
 *  device memory where the browser exposes it, and the OS-level reduced-motion
 *  preference) rather than always resolving to "high" — see M4 in the review:
 *  the profile previously ignored the device entirely despite being labeled
 *  an "Adaptive Graphics Engine". Exported so Developer Options can show what
 *  the current device actually resolves to, next to the manual override. */
export function resolveAutoQuality(): 'high' | 'medium' | 'low' {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (prefersReducedMotionOS() || cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}

/* ── Event categories ───────────────────────────────────────
   Maps every action type to a human-facing category for the
   Developer Mode event monitor, so logs can be grouped/filtered
   instead of being a flat, undifferentiated stream. ──────────── */
export const ACTION_CATEGORY: Record<Action['type'], string> = {
  settings: 'settings',
  'history:add': 'history',
  'history:clear': 'history',
  'fav:formula': 'favorites',
  'fav:converter': 'favorites',
  'pin:add': 'pins',
  'pin:remove': 'pins',
  memory: 'calculator',
  ans: 'calculator',
  'customFormula:add': 'formula',
  'customFormula:remove': 'formula',
  'customUnit:add': 'converter',
  'customUnit:remove': 'converter',
  focus: 'ui',
  devFlags: 'developer',
  'theme:set': 'developer',
  'theme:reset': 'developer',
  replaceAll: 'system',
  reset: 'system',
};

/* ── Context ────────────────────────────────────────────── */
interface StoreApi {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatchRaw] = useReducer(reducer, undefined, loadState);
  const platform = usePlatform();
  // Second theme source (Web: always undefined; Telegram: live, reactive —
  // see platform/telegram/TelegramPlatformProvider.tsx). Only consulted by
  // resolveTheme() when the user's preference is 'system'.
  const telegramColorScheme = platform.theme.colorScheme;

  // Every dispatched action is logged to the event bus with its category,
  // so Developer Mode sees full, categorized coverage of app activity —
  // not just the handful of call sites that manually call bus.emit().
  const dispatch = useMemo<React.Dispatch<Action>>(() => {
    return (action: Action) => {
      const category = ACTION_CATEGORY[action.type] ?? 'other';
      bus.emit(`${category}:${action.type}`, action);
      dispatchRaw(action);
    };
  }, []);

  // Persistence: debounced (so rapid-fire dispatches like per-keystroke settings
  // edits don't synchronously rewrite localStorage on every render) and
  // diff-aware (only the slices that actually changed are re-serialized —
  // typing in the display-name field no longer rewrites the entire, possibly
  // large, history/customFormulas/customUnits slices on every keystroke).
  const prevPersistedRef = useRef<AppState | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const failed = persist(stateRef.current, prevPersistedRef.current);
    prevPersistedRef.current = stateRef.current;
    if (failed.length > 0) bus.emit('system:persist-failed', { keys: failed });
  }, []);

  useEffect(() => {
    if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(flushPersist, 250);
    return () => {
      if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
    };
  }, [state, flushPersist]);

  // Always flush the latest state to disk immediately before the tab closes/
  // reloads, even if the debounce timer above hasn't fired yet.
  useEffect(() => {
    window.addEventListener('beforeunload', flushPersist);
    window.addEventListener('pagehide', flushPersist);
    return () => {
      window.removeEventListener('beforeunload', flushPersist);
      window.removeEventListener('pagehide', flushPersist);
    };
  }, [flushPersist]);

  // Telegram CloudStorage backup — settings + favorites only (small,
  // meaningful, comfortably under CloudStorage's ~4096-char per-value
  // limit; history/customFormulas/customUnits could grow large and
  // aren't attempted). Deliberately WRITE-ONLY for now: nothing reads
  // this back on load, so it can't affect loadState()'s synchronous boot
  // path or interact with the migration mechanism above. It's a backup a
  // future step could offer to restore from (e.g. "continue on another
  // device"), not an active sync layer yet — see PROJECT_CONTEXT.md.
  // Entirely separate from the local persist effect above; a CloudStorage
  // failure here never touches local persistence.
  const cloudSyncTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!platform.isTelegram || !platform.cloudStorage.isAvailable) return;
    if (cloudSyncTimerRef.current !== null) window.clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = window.setTimeout(() => {
      const swallow = () => {
        /* best-effort backup — a failure here is never user-visible */
      };
      platform.cloudStorage.set('settings', JSON.stringify(state.settings)).catch(swallow);
      platform.cloudStorage.set('favFormulas', JSON.stringify(state.favFormulas)).catch(swallow);
      platform.cloudStorage.set('favConverters', JSON.stringify(state.favConverters)).catch(swallow);
    }, 250);
    return () => {
      if (cloudSyncTimerRef.current !== null) window.clearTimeout(cloudSyncTimerRef.current);
    };
  }, [state.settings, state.favFormulas, state.favConverters, platform]);

  // Apply runtime quality flags to <html> (Adaptive Graphics Engine).
  // Fully automatic for regular users: quality comes from resolveAutoQuality()
  // (real device signals) and reduced-motion from the OS preference — neither
  // is a user-facing setting anymore. state.devFlags is the only override,
  // and it's only reachable through Developer Options (see DeveloperPage).
  useEffect(() => {
    const root = document.documentElement;
    const effAnimations = state.devFlags.animations ?? true;
    const effBlur = state.devFlags.blur ?? true;
    const effReducedMotion = state.devFlags.reducedMotion ?? prefersReducedMotionOS();
    const q = state.devFlags.quality ?? 'auto';
    root.dataset.quality = q === 'auto' ? resolveAutoQuality() : q;
    root.dataset.motion = effAnimations && !effReducedMotion ? 'on' : 'off';
    root.dataset.blur = effBlur && q !== 'low' ? 'on' : 'off';
    root.dir = state.settings.language === 'fa' ? 'rtl' : 'ltr';
    root.lang = state.settings.language;
    document.body.classList.toggle('focus-mode', state.focusMode);
  }, [state.settings.language, state.devFlags, state.focusMode]);

  // Light/Dark/System theme. 'system' is the default (see DEFAULT_STATE).
  // In 'system' mode, the resolved value comes from (in priority order):
  // Telegram's reported color scheme when running as a Mini App, else the
  // OS preference via matchMedia (unchanged Web behavior). An explicit
  // 'light' or 'dark' choice is not overridden by either later system
  // changes or Telegram (the effect only subscribes to the media query at
  // all while pref === 'system', so a fixed choice can't receive change
  // events in the first place; resolveTheme() also short-circuits on an
  // explicit pref before ever looking at either live source). The
  // meta[name=theme-color] tag (mobile browser chrome color) is kept in
  // sync too — the two static tags in index.html only cover the *first*
  // paint before this runs; this keeps it correct after that, including for
  // an explicit in-app choice that diverges from the OS setting, which a
  // pure CSS media-query-based meta tag can't express on its own.
  useEffect(() => {
    const root = document.documentElement;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    const applyResolved = (resolved: 'light' | 'dark') => {
      root.dataset.theme = resolved;
      themeColorMeta?.setAttribute('content', resolved === 'light' ? '#F5FAF8' : '#07191E');
    };
    applyResolved(resolveTheme(state.settings.theme, telegramColorScheme));
    if (state.settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    // Re-resolves through the same priority on every OS change event too —
    // if Telegram is currently reporting a scheme, it still wins here
    // rather than the raw OS signal briefly flashing through.
    const onChange = () => applyResolved(resolveTheme(state.settings.theme, telegramColorScheme));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [state.settings.theme, telegramColorScheme]);

  // Apply dev-only theme color overrides (Theme Editor) as inline CSS custom
  // properties on <html> — these take precedence over every stylesheet rule
  // for the same variable. Tracks which keys it applied so a reset (a key
  // removed from state.themeOverrides) actually clears back to the
  // stylesheet default instead of leaving a stale inline value behind.
  const appliedThemeKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const root = document.documentElement;
    const next = new Set<string>();
    for (const [k, v] of Object.entries(state.themeOverrides)) {
      root.style.setProperty(k, v);
      next.add(k);
    }
    for (const k of appliedThemeKeysRef.current) {
      if (!next.has(k)) root.style.removeProperty(k);
    }
    appliedThemeKeysRef.current = next;
  }, [state.themeOverrides]);

  const api = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

/* ── Official API helpers (Public API only) ─────────────── */
let uid = 0;
export const newId = () => `${Date.now().toString(36)}-${(uid++).toString(36)}`;

export function pushHistory(dispatch: React.Dispatch<Action>, e: Omit<HistoryEntry, 'id' | 'ts'>) {
  const entry: HistoryEntry = { ...e, id: newId(), ts: Date.now() };
  dispatch({ type: 'history:add', entry });
}
