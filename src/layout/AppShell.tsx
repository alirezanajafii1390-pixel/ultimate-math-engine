/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — layout/AppShell
   Mobile: Bottom Navigation (Settings inside Home)
   Desktop: Sidebar • Navigation always fixed
   Focus Mode: only the active tool remains visible.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Home,
  Calculator,
  SquareFunction,
  ArrowLeftRight,
  LayoutGrid,
  Settings,
  LifeBuoy,
  Search,
  Focus,
  Minimize,
  Triangle,
  Shapes,
  Sigma,
  Atom,
  Banknote,
  ChartColumn,
  Wrench,
  History as HistoryIcon,
} from 'lucide-react';
import { useStore } from '../core/store';
import { usePlatform } from '../platform/PlatformContext';
import { ErrorBoundary } from './ErrorBoundary';
import { bus } from '../core/events';
import { useT, useLang, type TranslationKey } from '../core/i18n';
import { FORMULAS, FORMULA_CATEGORIES } from '../core/formulas';
import { allUnits } from '../core/units';
import { decodeExprFromStartParam } from '../core/calc-helpers';
import { formatTime } from '../core/format';
import { useToast } from '../ui/kit';

const NAV_ITEMS: { to: string; icon: typeof Home; key: TranslationKey }[] = [
  { to: '/', icon: Home, key: 'nav.home' },
  { to: '/calculator', icon: Calculator, key: 'nav.calculator' },
  { to: '/formula', icon: SquareFunction, key: 'nav.formula' },
  { to: '/converter', icon: ArrowLeftRight, key: 'nav.converter' },
  { to: '/workspace', icon: LayoutGrid, key: 'nav.workspace' },
];

export const CATEGORY_ICONS: Record<string, typeof Shapes> = {
  shapes: Shapes,
  sigma: Sigma,
  triangle: Triangle,
  atom: Atom,
  banknote: Banknote,
  chart: ChartColumn,
};

export default function AppShell() {
  const { state, dispatch } = useStore();
  const t = useT();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const platform = usePlatform();

  // Telegram's own chrome (status bar, gesture areas) isn't necessarily
  // reflected in the browser's env(safe-area-inset-*) the way a native
  // mobile browser's would be — so inside Telegram we source these two
  // spots from the platform layer instead. Outside Telegram, these CSS
  // vars are simply never set, and the var(--x, env(...)) fallback below
  // keeps the original, unchanged Web behavior.
  useEffect(() => {
    if (!platform.isTelegram) return;
    const root = document.documentElement;
    const { top, bottom } = platform.viewport.safeAreaInsets;
    root.style.setProperty('--platform-safe-top', `${top}px`);
    root.style.setProperty('--platform-safe-bottom', `${bottom}px`);
    return () => {
      root.style.removeProperty('--platform-safe-top');
      root.style.removeProperty('--platform-safe-bottom');
    };
  }, [platform.isTelegram, platform.viewport.safeAreaInsets]);

  // Telegram's own Back Button, in place of any in-app back UI: always
  // returns to Home on click. Math Engine's routes are flat siblings (no
  // nested "detail" pages), so "back" unambiguously means Home rather
  // than relying on browser history depth (which could be zero on a deep
  // link, or point outside the app inside a Mini App's own webview
  // history). Registered once — the handler itself is route-independent.
  useEffect(() => {
    if (!platform.isTelegram || !platform.backButton.isSupported) return;
    return platform.backButton.onClick(() => navigate('/'));
  }, [platform.isTelegram, platform.backButton, navigate]);

  // Visible on every route except Home. Kept separate from the onClick
  // effect above so switching between two non-Home routes only ever
  // calls show() again (a harmless no-op while already visible) instead
  // of hiding and immediately re-showing the button.
  useEffect(() => {
    if (!platform.isTelegram || !platform.backButton.isSupported) return;
    if (location.pathname === '/') platform.backButton.hide();
    else platform.backButton.show();
  }, [platform.isTelegram, platform.backButton, location.pathname]);

  // Deep link via Telegram start_param (t.me/bot/app?startapp=...): decodes
  // it back into an expression and hands off to the *existing* /calculator
  // ?expr= deep-link support (see CalculatorPage) rather than duplicating
  // that logic here. Once only, on launch — a ref guard rather than an
  // empty dep array alone, since `platform` itself changes reference as
  // Telegram signals update (see PROJECT_CONTEXT.md decision 8), which
  // would otherwise make this effect re-fire and hijack in-app navigation.
  const startParamHandled = useRef(false);
  useEffect(() => {
    if (startParamHandled.current) return;
    const raw = platform.initData.startParam;
    if (!raw) return;
    startParamHandled.current = true;
    const expr = decodeExprFromStartParam(raw);
    if (expr) navigate(`/calculator?expr=${encodeURIComponent(expr)}`, { replace: true });
  }, [platform.initData.startParam, navigate]);

  // Global shortcut: Ctrl/Cmd+K → search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Surface persistence failures (e.g. localStorage quota exceeded) instead of
  // letting them fail silently — see core/store.tsx's persist().
  useEffect(() => bus.on('system:persist-failed', () => toast(t('error.storageFailed'), 'err')), [toast, t]);

  const toggleFocus = () => dispatch({ type: 'focus', on: !state.focusMode });

  // Log navigation for Developer Mode's categorized event monitor
  useEffect(() => {
    bus.emit('navigation:route', { path: location.pathname + location.search });
  }, [location.pathname, location.search]);

  return (
    <div className="relative h-full">
      <div className="app-ambient" />

      {/* ── Desktop sidebar (fixed, quiet) ── */}
      <aside className="nav-chrome fixed inset-y-0 start-0 z-30 hidden w-[232px] flex-col border-e border-[var(--border-subtle)] bg-[var(--surface-chrome)] px-4 py-6 backdrop-blur-[var(--blur-glass)] md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#99cc33] to-[#5f8f1f] shadow-[0_4px_16px_rgba(153,204,51,0.3)]">
            <Sigma size={20} strokeWidth={2.4} className="text-[#0a1a10]" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight">Math Engine</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SideLink key={item.to} to={item.to} icon={item.icon} labelKey={item.key} active={item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)} />
          ))}
          <div className="my-3 h-px bg-[var(--border-subtle)]" />
          <SideLink to="/settings" icon={Settings} label={t('nav.settings')} active={location.pathname.startsWith('/settings')} />
          <SideLink to="/help" icon={LifeBuoy} label={t('nav.help')} active={location.pathname.startsWith('/help')} />
          {state.settings.devMode && (
            <SideLink to="/developer" icon={Wrench} label={t('nav.developer')} active={location.pathname.startsWith('/developer')} />
          )}
        </nav>

        <button
          onClick={toggleFocus}
          className={`press focus-ring mt-4 flex h-12 items-center gap-3 rounded-[var(--r-button)] border px-4 text-sm font-medium transition-colors ${
            state.focusMode
              ? 'border-[rgba(2,245,161,0.4)] bg-[rgba(2,245,161,0.1)] text-[var(--accent-highlight)]'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {state.focusMode ? <Minimize size={17} /> : <Focus size={17} />}
          {state.focusMode ? t('focus.exit') : t('focus.enter')}
        </button>
      </aside>

      {/* ── Mobile top bar — compact, refined ── */}
      <header className="nav-chrome glass fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between px-3.5 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-gradient-to-br from-[#99cc33] to-[#5f8f1f] shadow-[0_2px_10px_rgba(153,204,51,0.35)]">
            <Sigma size={13} strokeWidth={2.6} className="text-[#0a1a10]" />
          </div>
          <span className="text-[14px] font-bold">Math Engine</span>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label={t('action.search')} onClick={() => setSearchOpen(true)} className="press focus-ring flex h-9 w-9 items-center justify-center rounded-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <Search size={18} />
          </button>
          <button
            aria-label={t('focus.enter')}
            onClick={toggleFocus}
            className={`press focus-ring flex h-9 w-9 items-center justify-center rounded-[13px] ${state.focusMode ? 'text-[var(--accent-highlight)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {state.focusMode ? <Minimize size={18} /> : <Focus size={18} />}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="relative z-10 h-full overflow-y-auto pt-12 md:pt-0 md:ps-[232px]">
        {/* Desktop top strip: search trigger */}
        <div className="nav-chrome sticky top-0 z-20 hidden justify-center pt-5 md:flex">
          <button
            onClick={() => setSearchOpen(true)}
            className="glass relative press focus-ring flex h-11 w-[min(440px,60%)] items-center gap-3 rounded-[var(--r-floating)] px-4 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            <Search size={16} />
            <span>{t('search.placeholder')}</span>
            <kbd className="ms-auto rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>
        </div>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ── Mobile bottom navigation — floating glass pill (inspired by a
          Uiverse.io reference: our palette, our glass, our 5 sections; the
          active tab gets a raised capsule instead of a top indicator line).
          Kept at or under the old flush bar's height/reach: it must never
          sit higher on screen than the previous version did. ── */}
      <nav className="nav-chrome fixed inset-x-3 z-30 md:hidden" style={{ bottom: 'calc(6px + var(--platform-safe-bottom, env(safe-area-inset-bottom)))' }}>
        <div className="glass-strong relative mx-auto flex max-w-md items-center gap-1 rounded-full p-1 shadow-[var(--shadow-2)]">
          {NAV_ITEMS.map((item) => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`press focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1 transition-colors ${active ? 'bg-[rgba(153,204,51,0.16)] shadow-[var(--glow-accent)]' : ''}`}
              >
                <item.icon size={18} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'} />
                <span className={`text-[9px] font-semibold ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>{t(item.key)}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Focus Mode floating exit — tucked in the top corner, out of the
          way of any bottom controls (keypad, nav, sheets) in every mode. */}
      {state.focusMode && (
        <button
          onClick={toggleFocus}
          className="glass-strong press focus-ring fixed end-3 top-[max(0.75rem,var(--platform-safe-top,env(safe-area-inset-top)))] z-40 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-[var(--accent-highlight)] shadow-[var(--shadow-2)]"
          style={{ animation: 'fadeUp var(--dur-med) var(--ease)' }}
        >
          <Minimize size={15} />
          {t('focus.exit')}
        </button>
      )}

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} onGo={(to) => navigate(to)} />
    </div>
  );
}

function SideLink({ to, icon: Icon, label, active, labelKey }: { to: string; icon: typeof Home; label?: string; active: boolean; labelKey?: TranslationKey }) {
  const t = useT();
  return (
    <NavLink
      to={to}
      className={`press focus-ring flex h-12 items-center gap-3 rounded-[var(--r-button)] px-4 text-[15px] font-medium transition-colors ${
        active
          ? 'bg-[rgba(153,204,51,0.12)] text-[var(--accent-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[rgba(233,242,239,0.045)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
      {label ?? t(labelKey ?? 'app.name')}
    </NavLink>
  );
}

/* ═══════════════════════════════════════════════════════════
   Global Search — one search for everything
   (formulas • units • tools • history)
   ═══════════════════════════════════════════════════════════ */
interface SearchHit {
  group: TranslationKey;
  label: string;
  sub?: string;
  to: string;
}

function SearchPalette({ open, onClose, onGo }: { open: boolean; onClose: () => void; onGo: (to: string) => void }) {
  const t = useT();
  const lang = useLang();
  const { state } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
      setRendered(true);
      setClosing(false);
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 60);
    } else if (rendered) {
      setClosing(true);
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-exit').trim();
      const ms = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : 220;
      exitTimer.current = window.setTimeout(
        () => {
          setRendered(false);
          setClosing(false);
          exitTimer.current = null;
        },
        Number.isFinite(ms) ? ms : 220,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  const hits = useMemo<SearchHit[]>(() => {
    const query = q.trim().toLowerCase();
    const out: SearchHit[] = [];
    if (!query) return out;

    for (const f of [...FORMULAS, ...state.customFormulas]) {
      const name = f.name.fa + ' ' + f.name.en;
      if (name.toLowerCase().includes(query) || f.expr.includes(query)) {
        const cat = FORMULA_CATEGORIES.find((c) => c.id === f.cat);
        out.push({ group: 'search.formulas', label: f.name[lang], sub: cat ? cat.name[lang] : t('formula.custom'), to: `/formula?f=${f.id}` });
      }
      if (out.length > 24) break;
    }
    for (const { cat, unit } of allUnits(state.customUnits)) {
      const name = `${unit.name.fa} ${unit.name.en} ${unit.symbol}`;
      if (name.toLowerCase().includes(query)) {
        out.push({ group: 'search.units', label: `${unit.name[lang]} (${unit.symbol})`, sub: cat.name[lang], to: `/converter?cat=${cat.id}&to=${unit.id}` });
      }
    }
    const tools: { label: string; keys: string; to: string }[] = [
      { label: t('nav.home'), keys: 'home خانه', to: '/' },
      { label: t('nav.calculator'), keys: 'calculator ماشین حساب', to: '/calculator' },
      { label: t('nav.formula'), keys: 'formula فرمول', to: '/formula' },
      { label: t('nav.converter'), keys: 'converter مبدل واحد', to: '/converter' },
      { label: t('nav.workspace'), keys: 'workspace میزکار', to: '/workspace' },
      { label: t('nav.settings'), keys: 'settings تنظیمات', to: '/settings' },
      { label: t('nav.help'), keys: 'help راهنما guide', to: '/help' },
    ];
    for (const tool of tools) {
      if (tool.label.toLowerCase().includes(query) || tool.keys.includes(query)) out.push({ group: 'search.tools', label: tool.label, to: tool.to });
    }
    for (const h of state.history) {
      if (h.label.toLowerCase().includes(query) || h.result.includes(query)) {
        out.push({ group: 'search.history', label: `${h.label} = ${h.result}`, sub: formatTime(h.ts, lang), to: h.kind === 'calculator' ? '/calculator' : h.kind === 'formula' ? '/formula' : '/converter' });
      }
      if (out.length > 40) break;
    }
    return out.slice(0, 40);
  }, [q, state, t, lang]);

  if (!rendered) return null;
  const groups: TranslationKey[] = ['search.formulas', 'search.units', 'search.tools', 'search.history'];

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12dvh]" role="dialog" aria-modal="true">
      <div className="scrim" style={{ animation: closing ? 'backdropOut var(--dur-fast) var(--ease-in) both' : 'backdropIn var(--dur-fast) var(--ease) both' }} onClick={onClose} />
      <div
        className="glass-strong relative z-10 w-full max-w-xl overflow-hidden rounded-[var(--r-floating)] shadow-[var(--shadow-3)]"
        style={{ animation: closing ? 'popOut var(--dur-exit) var(--ease-in) both' : 'popIn var(--dur-med) var(--ease) both' }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <Search size={18} className="shrink-0 text-[var(--accent-primary)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="w-full bg-transparent text-base outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
        <div className="max-h-[52dvh] overflow-y-auto p-2">
          {q.trim() === '' && <p className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.hint')}</p>}
          {q.trim() !== '' && hits.length === 0 && <p className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.empty')}</p>}
          {groups.map((g) => {
            const list = hits.filter((h) => h.group === g);
            if (list.length === 0) return null;
            return (
              <div key={g} className="mb-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t(g)}</p>
                {list.slice(0, 8).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onClose();
                      onGo(h.to);
                    }}
                    className="press focus-ring flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-start hover:bg-[rgba(233,242,239,0.05)]"
                  >
                    {g === 'search.history' ? <HistoryIcon size={16} className="shrink-0 text-[var(--text-tertiary)]" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{h.label}</span>
                      {h.sub && <span className="block text-xs text-[var(--text-tertiary)]">{h.sub}</span>}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
