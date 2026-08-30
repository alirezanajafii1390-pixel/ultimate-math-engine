/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/developer
   Independent module. Zero UI footprint when disabled.
   State Inspector • Event Monitor • Storage Viewer • Flags
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';
import { RefreshCw, RotateCcw, Copy, Trash2 } from 'lucide-react';
import { useStore, resolveAutoQuality, type QualityProfile } from '../../core/store';
import { useT, useLang } from '../../core/i18n';
import { storage, fullKey } from '../../core/storage';
import { bus, EVENT_LOG_CAP } from '../../core/events';
import { formatNumber, formatTime } from '../../core/format';
import { Page, PageHeader, Section, Card, Btn, Toggle, Segmented, SettingRow, useToast } from '../../ui/kit';
import { usePlatform } from '../../platform/PlatformContext';

interface LogEntry {
  type: string;
  payload?: unknown;
  ts: number;
}

/* ── Theme Editor — dev-only palette explorer ──────────────
   Raw access to every color-ish CSS custom property so a developer can try
   release color combinations live, then "Copy CSS" to lift the winning
   values back into src/index.css by hand. Grouped to match that file's own
   section comments. Deliberately excludes non-color tokens (radii, motion
   durations, --blur-glass) — those are structural/"frozen" by design, and
   --blur-glass specifically is already covered by the Quality override
   above; mixing two override systems on the same variable would be
   confusing to reason about. */
interface ThemeVarDef {
  key: string;
  label: string;
  group: string;
}

const THEME_VARS: ThemeVarDef[] = [
  { key: '--bg-primary', label: 'Primary', group: 'Backgrounds' },
  { key: '--bg-surface', label: 'Surface', group: 'Backgrounds' },
  { key: '--bg-surface-2', label: 'Surface 2', group: 'Backgrounds' },
  { key: '--bg-surface-3', label: 'Surface 3', group: 'Backgrounds' },
  { key: '--accent-primary', label: 'Primary', group: 'Accent' },
  { key: '--accent-highlight', label: 'Highlight', group: 'Accent' },
  { key: '--text-primary', label: 'Primary', group: 'Text' },
  { key: '--text-secondary', label: 'Secondary', group: 'Text' },
  { key: '--text-tertiary', label: 'Tertiary', group: 'Text' },
  { key: '--border-subtle', label: 'Subtle', group: 'Borders' },
  { key: '--border-strong', label: 'Strong', group: 'Borders' },
  { key: '--success', label: 'Success', group: 'Semantic' },
  { key: '--warning', label: 'Warning', group: 'Semantic' },
  { key: '--error', label: 'Error', group: 'Semantic' },
  { key: '--glass-bg', label: 'Background', group: 'Glass' },
  { key: '--glass-border', label: 'Border', group: 'Glass' },
  { key: '--shadow-1', label: 'Shadow 1 (small)', group: 'Shadows & Glow' },
  { key: '--shadow-2', label: 'Shadow 2 (medium)', group: 'Shadows & Glow' },
  { key: '--shadow-3', label: 'Shadow 3 (large)', group: 'Shadows & Glow' },
  { key: '--glow-accent', label: 'Glow', group: 'Shadows & Glow' },
];
const THEME_GROUPS = [...new Set(THEME_VARS.map((v) => v.group))];

function ThemeVarRow({
  def,
  value,
  overridden,
  onChange,
  onReset,
}: {
  def: ThemeVarDef;
  value: string;
  overridden: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-3">
        <span className="h-7 w-7 shrink-0 rounded-lg border border-[var(--border-strong)]" style={{ background: value || 'transparent' }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{def.label}</p>
          <p className="tnum truncate text-[10px] text-[var(--text-tertiary)]" dir="ltr">
            {def.key}
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={!overridden}
          className="press focus-ring shrink-0 rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-25 disabled:pointer-events-none"
          aria-label={`Reset ${def.label} to default`}
        >
          <RotateCcw size={13} />
        </button>
      </div>
      {/* key={overridden} forces a fresh input element (rather than a value-only
          patch) whenever the overridden/not-overridden state flips, so a
          reset always visibly lands even in mobile browsers that are prone
          to caching a controlled input's last-typed text on the DOM node. */}
      <input
        key={String(overridden)}
        className="me-input tnum w-full !px-3 !py-1.5 text-xs"
        dir="ltr"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={`${def.group} ${def.label} (${def.key})`}
      />
    </div>
  );
}

const CATEGORY_COLOR: Record<string, string> = {
  settings: 'text-[var(--accent-primary)]',
  history: 'text-[var(--accent-highlight)]',
  favorites: 'text-[#e0b84c]',
  pins: 'text-[#e0b84c]',
  calculator: 'text-[#5fb8ff]',
  formula: 'text-[var(--accent-primary)]',
  converter: 'text-[#c48cff]',
  ui: 'text-[var(--text-secondary)]',
  developer: 'text-[var(--error)]',
  system: 'text-[var(--error)]',
  navigation: 'text-[var(--text-tertiary)]',
  other: 'text-[var(--text-tertiary)]',
};

function categoryOf(type: string): string {
  const idx = type.indexOf(':');
  return idx === -1 ? 'other' : type.slice(0, idx);
}

export default function DeveloperPage() {
  const { state, dispatch } = useStore();
  const platform = usePlatform();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const [events, setEvents] = useState<LogEntry[]>(() => bus.getLog());
  const [storageKeys] = useState<string[]>(() => storage.keys());
  const [fps, setFps] = useState(0);
  const [catFilter, setCatFilter] = useState<string>('all');
  // Read once on mount: the real stylesheet default for every theme
  // variable, straight from the computed cascade — never hand-duplicated in
  // JS, so it can't drift from src/index.css. Only used as a fallback for
  // variables that aren't currently overridden.
  const [computedDefaults] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);
    const map: Record<string, string> = {};
    for (const def of THEME_VARS) map[def.key] = cs.getPropertyValue(def.key).trim();
    return map;
  });

  const copyThemeAsCss = async () => {
    const lines = THEME_VARS.map((def) => `  ${def.key}: ${state.themeOverrides[def.key] ?? computedDefaults[def.key] ?? ''};`);
    const css = `:root {\n${lines.join('\n')}\n}`;
    try {
      await navigator.clipboard.writeText(css);
      toast('Copied theme as CSS');
    } catch {
      toast('Copy failed', 'err');
    }
  };

  useEffect(() => bus.subscribeLog((e) => setEvents((s) => [...s.slice(-EVENT_LOG_CAP), e])), []);

  // Lightweight FPS meter
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(events.map((e) => categoryOf(e.type)));
    return ['all', ...Array.from(set).sort()];
  }, [events]);
  const filteredEvents = useMemo(
    () => (catFilter === 'all' ? events : events.filter((e) => categoryOf(e.type) === catFilter)),
    [events, catFilter],
  );

  if (!state.settings.devMode) return <Navigate to="/" replace />;

  const bytes = storage.bytesUsed();

  return (
    <Page>
      <PageHeader
        title={t('dev.title')}
        subtitle="developer/ — independent module"
        actions={
          <Btn
            size="sm"
            variant="danger"
            onClick={() => {
              dispatch({ type: 'reset' });
              bus.emit('dev:runtime-reset');
            }}
          >
            <RefreshCw size={14} />
            {t('dev.resetRuntime')}
          </Btn>
        }
      />

      {/* Platform — diagnoses the exact symptom "isTelegram-gated features
          silently do nothing": shows whether TelegramPlatformProvider
          actually finished initializing, and the real caught error if it
          didn't (rather than just the console, which isn't reachable from
          inside the Telegram WebView without remote debugging). */}
      <Section title="Platform">
        <Card className="p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-tertiary)]">isTelegram</span>
            <span className={platform.isTelegram ? 'font-semibold text-[var(--accent-primary)]' : 'text-[var(--error)]'}>
              {String(platform.isTelegram)}
            </span>
          </div>
          {platform.initError && (
            <div className="mt-3 rounded-[var(--r-input)] border border-[var(--error)] bg-[rgba(245,86,74,0.08)] p-3">
              <p className="text-xs font-semibold text-[var(--error)]">initError</p>
              <p className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">{platform.initError}</p>
            </div>
          )}
          {!platform.isTelegram && !platform.initError && (
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
              Not running inside Telegram (or the Mini App wasn't opened via t.me/MathEngineANBot/mathengine).
            </p>
          )}
        </Card>
      </Section>

      {/* Performance */}
      <Section title={t('dev.performance')}>
        <div className="grid grid-cols-3 gap-2.5">
          <Card className="p-4 text-center">
            <p className="tnum text-2xl font-bold text-[var(--accent-primary)]" dir="ltr">
              {fps}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">FPS</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="tnum text-2xl font-bold text-[var(--accent-primary)]" dir="ltr">
              {formatNumber(bytes / 1024, 6)}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">KB — {t('dev.bytesUsed')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="tnum text-2xl font-bold text-[var(--accent-primary)]" dir="ltr">
              {state.history.length}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">History</p>
          </Card>
        </div>
      </Section>

      {/* Feature flags — graphics & accessibility overrides. Moved here from
          Settings: regular users never see or need these, since the app
          auto-detects an appropriate profile per device (resolveAutoQuality)
          and reduced-motion follows the OS preference automatically. These
          exist only so a developer can force a profile for testing. */}
      <Section title={t('dev.flags')}>
        <Card className="divide-y divide-[var(--border-subtle)]">
          <div className="px-5 py-4">
            <p className="mb-0.5 text-[15px] font-medium">Quality override</p>
            <p className="mb-2.5 text-xs text-[var(--text-tertiary)]">
              {state.devFlags.quality === null ? `auto → this device resolves to "${resolveAutoQuality()}"` : 'overridden'}
            </p>
            <Segmented<QualityProfile>
              options={[
                { value: 'auto', label: 'auto' },
                { value: 'high', label: 'high' },
                { value: 'medium', label: 'medium' },
                { value: 'low', label: 'low' },
              ]}
              value={state.devFlags.quality ?? 'auto'}
              onChange={(v) => dispatch({ type: 'devFlags', patch: { quality: v === 'auto' ? null : v } })}
            />
          </div>
          <SettingRow
            title="Animations override"
            hint={state.devFlags.animations === null ? 'follow auto' : 'overridden'}
            control={
              <Toggle checked={state.devFlags.animations ?? true} onChange={(v) => dispatch({ type: 'devFlags', patch: { animations: v } })} label="animations" />
            }
          />
          <SettingRow
            title="Blur override"
            hint={state.devFlags.blur === null ? 'follow auto' : 'overridden'}
            control={<Toggle checked={state.devFlags.blur ?? true} onChange={(v) => dispatch({ type: 'devFlags', patch: { blur: v } })} label="blur" />}
          />
          <SettingRow
            title="Reduced motion override"
            hint={state.devFlags.reducedMotion === null ? 'follow OS preference' : 'overridden'}
            control={
              <Toggle
                checked={state.devFlags.reducedMotion ?? false}
                onChange={(v) => dispatch({ type: 'devFlags', patch: { reducedMotion: v } })}
                label="reduced motion"
              />
            }
          />
          <SettingRow
            title="Developer Mode"
            control={
              <Toggle checked={state.settings.devMode} onChange={(v) => dispatch({ type: 'settings', patch: { devMode: v } })} label="devmode" />
            }
          />
        </Card>
      </Section>

      {/* Theme Editor — dev-only palette explorer */}
      <Section
        title="Theme Editor"
        action={
          <div className="flex gap-2">
            <Btn size="sm" variant="ghost" onClick={copyThemeAsCss}>
              <Copy size={13} />
              Copy CSS
            </Btn>
            <Btn size="sm" variant="ghost" disabled={Object.keys(state.themeOverrides).length === 0} onClick={() => dispatch({ type: 'theme:reset' })}>
              <RotateCcw size={13} />
              Reset all
            </Btn>
          </div>
        }
      >
        {THEME_GROUPS.map((group) => (
          <div key={group} className="mb-3 last:mb-0">
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{group}</p>
            <Card className="divide-y divide-[var(--border-subtle)]">
              {THEME_VARS.filter((v) => v.group === group).map((def) => (
                <ThemeVarRow
                  key={def.key}
                  def={def}
                  value={state.themeOverrides[def.key] ?? computedDefaults[def.key] ?? ''}
                  overridden={def.key in state.themeOverrides}
                  onChange={(v) => dispatch({ type: 'theme:set', key: def.key, value: v })}
                  onReset={() => dispatch({ type: 'theme:reset', key: def.key })}
                />
              ))}
            </Card>
          </div>
        ))}
      </Section>

      {/* Event monitor */}
      <Section
        title={t('dev.events')}
        action={
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => {
              bus.clearLog();
              setEvents([]);
            }}
          >
            <Trash2 size={13} />
            {t('dev.clearEvents')}
          </Btn>
        }
      >
        {categories.length > 2 && (
          <div className="chip-row mb-2.5 pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`chip press focus-ring shrink-0 !text-[11px] ${catFilter === c ? 'active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <Card className="max-h-72 overflow-y-auto p-2">
          {filteredEvents.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--text-tertiary)]">{t('dev.noEvents')}</p>
          ) : (
            [...filteredEvents].reverse().map((e, i) => {
              const cat = categoryOf(e.type);
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-[12px] hover:bg-[rgba(233,242,239,0.03)]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 rounded-md bg-[rgba(233,242,239,0.06)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLOR[cat] ?? 'text-[var(--text-tertiary)]'}`}>
                      {cat}
                    </span>
                    <span className="tnum truncate font-semibold text-[var(--text-secondary)]" dir="ltr">
                      {e.type}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[var(--text-tertiary)]" dir="ltr">
                    {formatTime(e.ts, lang)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </Section>

      {/* Storage inspector */}
      <Section title={t('dev.storage')}>
        <Card className="max-h-56 overflow-y-auto p-2">
          {storageKeys.map((k) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-[12px] hover:bg-[rgba(233,242,239,0.03)]">
              <span className="tnum text-[var(--text-secondary)]" dir="ltr">
                {k}
              </span>
              <span className="tnum text-[var(--text-tertiary)]" dir="ltr">
                {formatNumber((localStorage.getItem(fullKey(k))?.length ?? 0) * 2)} B
              </span>
            </div>
          ))}
        </Card>
      </Section>

      {/* State viewer */}
      <Section title={t('dev.state')}>
        <Card className="max-h-72 overflow-auto p-4">
          <pre className="tnum text-[11px] leading-5 text-[var(--text-secondary)]" dir="ltr">
            {JSON.stringify(
              { ...state, history: `[${state.history.length} entries]` },
              null,
              2,
            )}
          </pre>
        </Card>
      </Section>
    </Page>
  );
}
