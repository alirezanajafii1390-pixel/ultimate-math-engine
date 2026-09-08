/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/home
   Home is the control center — not just a landing page.
   Greeting • Continue Working • Quick Actions • Pinned • Recent
   ═══════════════════════════════════════════════════════════ */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Calculator,
  ArrowLeftRight,
  SquareFunction,
  ClipboardPaste,
  Play,
  Pin,
  LifeBuoy,
  ChevronLeft,
  Sparkles,
  Sigma,
  LayoutGrid,
  Settings,
} from 'lucide-react';
import { useStore } from '../../core/store';
import { useT, useLang } from '../../core/i18n';
import { getFormula, getFormulaCategory } from '../../core/formulas';
import { getCategory } from '../../core/units';
import { timeAgo } from '../../core/format';
import { Page, Section, InteractiveCard, EmptyState, Card, Sheet } from '../../ui/kit';
import { usePlatform } from '../../platform/PlatformContext';

function greetingKey(): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening' | 'home.greeting.night' {
  const h = new Date().getHours();
  if (h < 12) return 'home.greeting.morning';
  if (h < 15) return 'home.greeting.afternoon';
  if (h < 19) return 'home.greeting.evening';
  return 'home.greeting.night';
}

export default function HomePage() {
  const { state } = useStore();
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();

  const last = state.history[0];
  const platform = usePlatform();
  // Priority: the user's own explicit setting always wins; Telegram's
  // first name (untrusted display data — see PlatformInitData's trust
  // caveat) is only a fallback for when they haven't set one themselves.
  const name = state.settings.displayName.trim() || platform.initData.user?.firstName?.trim() || '';

  const continueTarget = useMemo(() => {
    if (!last) return null;
    if (last.kind === 'calculator') return { to: `/calculator?expr=${encodeURIComponent(last.payload ?? '')}`, label: last.label };
    if (last.kind === 'formula') return { to: `/formula?f=${last.payload}`, label: last.label };
    if (last.kind === 'converter' && last.payload) {
      const [c, , to] = last.payload.split(':');
      return { to: `/converter?cat=${c}&to=${to}`, label: last.label };
    }
    return null;
  }, [last]);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const quickActions = [
    { icon: Calculator, label: t('action.calculate'), to: '/calculator' },
    { icon: ArrowLeftRight, label: t('action.convert'), to: '/converter' },
    { icon: SquareFunction, label: t('action.formula'), to: '/formula' },
    { icon: ClipboardPaste, label: t('action.paste'), action: 'paste' as const },
  ];

  const pasteExpression = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.trim().slice(0, 200);
      if (!clean) {
        navigate('/calculator');
        return;
      }
      setPasteText(clean);
      setPasteOpen(true);
    } catch {
      navigate('/calculator');
    }
  };

  const pasteDestinations = [
    { icon: Calculator, label: t('nav.calculator'), to: `/calculator?expr=${encodeURIComponent(pasteText)}` },
    { icon: ArrowLeftRight, label: t('nav.converter'), to: '/converter' },
    { icon: SquareFunction, label: t('nav.formula'), to: '/formula' },
  ];

  return (
    <Page>
      {/* ── Greeting ── */}
      <header className="mb-8 mt-2">
        <h1 className="text-[26px] font-bold tracking-tight md:text-3xl">
          {t(greetingKey())}
          {name ? (lang === 'fa' ? `، ${name}` : `, ${name}`) : ''}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--text-secondary)]">{t('home.subtitle')}</p>
      </header>

      {/* ── Continue Working ── */}
      {continueTarget && (
        <Section title={t('home.continue')}>
          <InteractiveCard className="flex items-center gap-4 p-4" onClick={() => navigate(continueTarget.to)}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#99cc33] to-[#5f8f1f] text-[#0a1a10] shadow-[0_4px_16px_rgba(153,204,51,0.3)]">
              <Play size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="tnum truncate text-[15px] font-semibold" dir="ltr" style={{ textAlign: 'start' }}>
                {continueTarget.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{last && timeAgo(last.ts, lang)}</p>
            </div>
            <ChevronLeft size={18} className="shrink-0 text-[var(--text-tertiary)] rtl:rotate-0 ltr:rotate-180" />
          </InteractiveCard>
        </Section>
      )}

      {/* ── Quick Actions ── */}
      <Section title={t('home.quickActions')}>
        <div className="grid grid-cols-4 gap-2.5 md:gap-3">
          {quickActions.map((a, i) => (
            <button
              key={i}
              onClick={() => (a.action === 'paste' ? pasteExpression() : navigate(a.to!))}
              className="card card-hover press focus-ring flex flex-col items-center gap-2.5 px-2 py-4"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                <a.icon size={20} />
              </span>
              <span className="text-center text-[12px] font-medium leading-4 text-[var(--text-secondary)]">{a.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Pinned Workspace ── */}
      {state.pins.length > 0 && (
        <Section title={t('home.pinned')}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {state.pins.slice(0, 6).map((p) => {
              let to = '/workspace';
              let sub = '';
              if (p.type === 'formula') {
                const f = getFormula(p.ref, state.customFormulas);
                to = `/formula?f=${p.ref}`;
                sub = f ? (getFormulaCategory(f.cat)?.name[lang] ?? '') : '';
              } else if (p.type === 'converter') {
                const [c, , to2] = p.ref.split(':');
                to = `/converter?cat=${c}&to=${to2}`;
                sub = getCategory(c)?.name[lang] ?? '';
              }
              return (
                <InteractiveCard key={p.id} className="flex items-center gap-3 p-3.5" onClick={() => navigate(to)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(2,245,161,0.08)] text-[var(--accent-highlight)]">
                    <Pin size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.label}</span>
                    {sub && <span className="block text-xs text-[var(--text-tertiary)]">{sub}</span>}
                  </span>
                </InteractiveCard>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Quiet links: Workspace + Help + Settings ── */}
      <div className="mb-8 grid grid-cols-3 gap-2.5">
        {[
          { icon: LayoutGrid, label: t('nav.workspace'), to: '/workspace' },
          { icon: LifeBuoy, label: t('nav.help'), to: '/help' },
          { icon: Settings, label: t('nav.settings'), to: '/settings' },
        ].map((x) => (
          <button key={x.to} onClick={() => navigate(x.to)} className="press focus-ring flex items-center justify-center gap-2 rounded-[var(--r-button)] border border-[var(--border-subtle)] py-3 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <x.icon size={15} />
            {x.label}
          </button>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <Section title={t('home.recent')}>
        {state.history.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={26} />}
            title={t('home.emptyRecent')}
            hint={t('home.emptyRecentHint')}
            action={
              <button
                onClick={() => navigate('/calculator')}
                className="press focus-ring inline-flex h-11 items-center gap-2 rounded-[var(--r-button)] bg-gradient-to-br from-[#99cc33] to-[#7ba828] px-5 text-sm font-bold text-[#0a1a10] shadow-[0_4px_18px_rgba(153,204,51,0.25)]"
              >
                <Calculator size={16} />
                {t('home.start')}
              </button>
            }
          />
        ) : (
          <Card className="divide-y divide-[var(--border-subtle)]">
            {state.history.slice(0, 5).map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(233,242,239,0.05)] text-[var(--text-secondary)]">
                  {h.kind === 'calculator' ? <Calculator size={15} /> : h.kind === 'formula' ? <SquareFunction size={15} /> : <ArrowLeftRight size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tnum block truncate text-sm text-[var(--text-secondary)]" dir="ltr" style={{ textAlign: 'start' }}>
                    {h.label}
                  </span>
                  <span className="tnum block truncate text-[15px] font-bold text-[var(--accent-primary)]" dir="ltr" style={{ textAlign: 'start' }}>
                    {h.result}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">{timeAgo(h.ts, lang)}</span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      {/* ── Signature ── */}
      <footer className="mt-10 flex items-center justify-center gap-2 text-[11px] text-[var(--text-tertiary)]">
        <Sigma size={12} />
        Math Engine
      </footer>

      {/* ── Paste destination chooser ── */}
      <Sheet variant="top" open={pasteOpen} onClose={() => setPasteOpen(false)} title={t('action.paste')}>
        <p className="tnum mb-4 truncate rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[var(--surface-fill)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]" dir="ltr" style={{ textAlign: 'start' }}>
          {pasteText}
        </p>
        <div className="flex flex-col gap-2">
          {pasteDestinations.map((d) => (
            <button
              key={d.to}
              onClick={() => {
                setPasteOpen(false);
                navigate(d.to);
              }}
              className="press focus-ring flex items-center gap-3 rounded-[var(--r-input)] border border-[var(--border-subtle)] px-4 py-3.5 text-start hover:border-[var(--border-strong)] hover:bg-[rgba(233,242,239,0.04)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                <d.icon size={16} />
              </span>
              <span className="text-[15px] font-semibold">{d.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </Page>
  );
}
