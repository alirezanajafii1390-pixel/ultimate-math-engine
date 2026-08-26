/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/calculator
   Simple by default. Powerful when needed.
   Expression • Result • Scientific Keys • Memory • Undo/Redo
   History is context-aware: lives right here, not a separate page.

   Layout rule: the calculator NEVER scrolls. One flat, borderless grid —
   scientific rows sit directly above the keypad rows, same button style
   throughout (no titled/boxed sections eating vertical space on their own
   padding+borders). Every row/column is a `minmax(0, 1fr)` fraction of
   whatever height is actually available, so on a short screen the buttons
   shrink proportionally instead of pushing content off-screen. Portrait:
   scientific rows stack above the keypad. From `lg:` up: scientific keys
   sit in a narrower column beside the keypad instead.

   No function is removed to make things fit: a "2nd" key toggles six
   pairs of mutually-inverse functions (sin↔sin⁻¹, cos↔cos⁻¹, tan↔tan⁻¹,
   ln↔eˣ, log↔10ˣ, √↔x²) onto the same six key positions — the same real-
   calculator trick the reference's own "⇄" key uses, just extended
   consistently to the other invertible pairs so everything still fits in
   one screen without dropping a single function.
   ═══════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Delete, History as HistoryIcon, Undo2, Redo2, Copy, Trash2, FlaskConical, Share2 } from 'lucide-react';
import { evaluate, MathError, type AngleMode } from '../../core/parser';
import { usePlatform } from '../../platform/PlatformContext';
import { useShareService } from '../../core/sharing/share-service';
import { formatNumber, formatPlain, formatTime, prettyExpr } from '../../core/format';
import { BINARY_OPS, negateExpr, encodeExprForStartParam } from '../../core/calc-helpers';
import { buildAppDeepLink } from '../../platform/telegram/config';
import { useStore, pushHistory } from '../../core/store';
import { useT, useLang, type TranslationKey } from '../../core/i18n';
import { Btn, Sheet, EmptyState, useToast, Key, isAnyModalOpen } from '../../ui/kit';

/* ── helpers ────────────────────────────────────────────── */
const FN_TOKENS = [
  'asin(', 'acos(', 'atan(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(',
  'sqrt(', 'cbrt(', 'log2(', 'ln(', 'log(', 'abs(', 'exp(', 'floor(', 'ceil(', 'round(', 'sign(',
];

function smartBackspace(expr: string): string {
  for (const f of FN_TOKENS) if (expr.endsWith(f)) return expr.slice(0, -f.length);
  if (expr.endsWith('pi')) return expr.slice(0, -2);
  return expr.slice(0, -1);
}

type Mode = 'norm' | 'sci';

function MemoryButtons({ onOp }: { onOp: (op: 'mc' | 'mr' | 'm+' | 'm-') => void }) {
  return (
    <>
      {(['MC', 'MR', 'M+', 'M-'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onOp(m.toLowerCase() as 'mc' | 'mr' | 'm+' | 'm-')}
          className="press focus-ring shrink-0 rounded-[8px] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)] hover:bg-[rgba(233,242,239,0.06)] hover:text-[var(--text-primary)]"
        >
          {m}
        </button>
      ))}
    </>
  );
}

export default function CalculatorPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const platform = usePlatform();
  const hapticsEnabled = state.settings.hapticsEnabled;
  const lang = useLang();
  const toast = useToast();
  const [params] = useSearchParams();

  const [expr, setExpr] = useState('');
  const [flash, setFlash] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('norm');
  const [secondActive, setSecondActive] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const displayRef = useRef<HTMLDivElement>(null);

  const angleMode: AngleMode = state.settings.angleMode;
  const scope = useMemo(() => ({ ans: state.ans ?? 0 }), [state.ans]);

  // Deep link: /calculator?expr=...
  useEffect(() => {
    const e = params.get('expr');
    if (e) {
      setExpr(e);
      setJustEvaluated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /* Live preview — user never has to think */
  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      const v = evaluate(expr, { scope, angleMode });
      return { ok: true as const, value: v };
    } catch (e) {
      return { ok: false as const, code: e instanceof MathError ? e.code : 'SYNTAX' };
    }
  }, [expr, scope, angleMode]);

  const setExprTracked = useCallback(
    (next: string | ((p: string) => string)) => {
      setExpr((prev) => {
        const n = typeof next === 'function' ? next(prev) : next;
        if (n !== prev) {
          undoStack.current.push(prev);
          if (undoStack.current.length > 100) undoStack.current.shift();
          redoStack.current = [];
        }
        return n;
      });
      setError(null);
    },
    [setExpr],
  );

  const insert = useCallback(
    (s: string) => {
      if (justEvaluated) {
        setJustEvaluated(false);
        if (/[0-9.]/.test(s)) {
          setExprTracked(s);
          return;
        }
      }
      setExprTracked((prev) => {
        if (BINARY_OPS.includes(s)) {
          const trimmed = prev.replace(/ $/, '');
          const last = trimmed.slice(-1);
          if (BINARY_OPS.includes(last) && s !== '-') return trimmed.slice(0, -1) + s;
          if (prev === '' && s !== '-') return prev;
        }
        if (s === '.') {
          const m = /(\d*\.?\d*)$/.exec(prev);
          if (m && m[0].includes('.')) return prev;
        }
        return prev + s;
      });
    },
    [justEvaluated, setExprTracked],
  );

  const clearAll = useCallback(() => {
    setExprTracked('');
    setError(null);
    if (hapticsEnabled) platform.haptics.selectionChanged();
  }, [setExprTracked, platform, hapticsEnabled]);

  const backspace = useCallback(() => {
    setExprTracked((p) => smartBackspace(p));
    if (hapticsEnabled) platform.haptics.selectionChanged();
  }, [setExprTracked, platform, hapticsEnabled]);

  const { share: shareViaService, pending: sharePending } = useShareService();
  const shareResult = useCallback(() => {
    if (!justEvaluated || !lastEvaluated.current) return;
    const { raw, expression, result } = lastEvaluated.current;
    const deepLink = buildAppDeepLink(encodeExprForStartParam(raw)) ?? undefined;
    shareViaService({ kind: 'calculator', expression, result }, deepLink);
  }, [justEvaluated, shareViaService]);

  const undo = useCallback(() => {
    setExpr((prev) => {
      const last = undoStack.current.pop();
      if (last === undefined) return prev;
      redoStack.current.push(prev);
      return last;
    });
  }, []);

  const redo = useCallback(() => {
    setExpr((prev) => {
      const last = redoStack.current.pop();
      if (last === undefined) return prev;
      undoStack.current.push(prev);
      return last;
    });
  }, []);

  const lastEvaluated = useRef<{ raw: string; expression: string; result: string } | null>(null);
  const commit = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const v = evaluate(expr, { scope, angleMode });
      const pretty = prettyExpr(expr);
      const resultStr = formatNumber(v, state.settings.precision);
      pushHistory(dispatch, { kind: 'calculator', label: pretty, result: resultStr, payload: expr });
      lastEvaluated.current = { raw: expr, expression: pretty, result: resultStr };
      dispatch({ type: 'ans', value: v });
      setExpr(formatPlain(v, state.settings.precision));
      undoStack.current = [];
      redoStack.current = [];
      setFlash((f) => f + 1);
      setJustEvaluated(true);
      setError(null);
      if (hapticsEnabled) platform.haptics.impact('medium');
    } catch (e) {
      const code = e instanceof MathError ? e.code : 'SYNTAX';
      setError(code);
      if (hapticsEnabled) platform.haptics.notification('error');
    }
  }, [expr, scope, angleMode, dispatch, state.settings.precision, platform, hapticsEnabled]);

  /* Memory */
  const memoryOp = (op: 'mc' | 'mr' | 'm+' | 'm-') => {
    const mem = state.memory ?? 0;
    if (op === 'mc') dispatch({ type: 'memory', value: null });
    if (op === 'mr' && state.memory !== null) insert(formatPlain(state.memory));
    if (op === 'm+' || op === 'm-') {
      let v = 0;
      if (preview?.ok) v = preview.value;
      else if (state.ans !== null) v = state.ans;
      else return;
      dispatch({ type: 'memory', value: op === 'm+' ? mem + v : mem - v });
      toast(t('calc.memory') + ': ' + formatNumber(op === 'm+' ? mem + v : mem - v), 'info');
    }
  };

  const negate = useCallback(() => {
    setExprTracked(negateExpr);
  }, [setExprTracked]);

  const inverse = useCallback(() => {
    setExprTracked((prev) => (prev.trim() ? `1/(${prev})` : prev));
  }, [setExprTracked]);

  // A single "()" key: inserts '(' by default, switches to ')' once
  // there's an unmatched '(' left to close.
  const smartParen = useCallback(() => {
    setExprTracked((prev) => {
      const opens = (prev.match(/\(/g) ?? []).length;
      const closes = (prev.match(/\)/g) ?? []).length;
      return prev + (opens > closes ? ')' : '(');
    });
  }, [setExprTracked]);

  /* Keyboard support */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (isAnyModalOpen()) return;
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (/^[0-9.]$/.test(k)) insert(k);
      else if (k === '+' || k === '-' || k === '^' || k === '(' || k === ')' || k === '%' || k === '*') insert(k);
      else if (k === '/') {
        e.preventDefault();
        insert('/');
      } else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        commit();
      } else if (k === 'Backspace') backspace();
      else if (k === 'Escape') clearAll();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [insert, commit, backspace, clearAll]);

  useEffect(() => {
    const el = displayRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [expr]);

  const calcHistory = state.history.filter((h) => h.kind === 'calculator');
  const shown = expr ? prettyExpr(expr) : '';
  const showPanel = mode === 'sci';

  // Six mutually-inverse pairs, folded onto the same six key positions via
  // "2nd" — the same trick the reference design's own "⇄" key uses, applied
  // consistently so every function stays reachable without adding rows.
  const sinP = secondActive ? { v: 'asin(', l: 'sin⁻¹' } : { v: 'sin(', l: 'sin' };
  const cosP = secondActive ? { v: 'acos(', l: 'cos⁻¹' } : { v: 'cos(', l: 'cos' };
  const tanP = secondActive ? { v: 'atan(', l: 'tan⁻¹' } : { v: 'tan(', l: 'tan' };
  const lnP = secondActive ? { v: 'e^', l: 'eˣ' } : { v: 'ln(', l: 'ln' };
  const logP = secondActive ? { v: '10^', l: '10ˣ' } : { v: 'log(', l: 'log' };
  const sqrtP = secondActive ? { v: '^2', l: 'x²' } : { v: 'sqrt(', l: '√' };

  const KEYS: { label: string; value?: string; action?: () => void; cls?: string; aria?: string; ownHaptic?: boolean }[][] = [
    [
      { label: 'C', action: clearAll, cls: 'key-danger', aria: 'clear', ownHaptic: true },
      { label: '⌫', action: backspace, aria: 'backspace', ownHaptic: true },
      { label: '%', value: '%' },
      { label: '÷', value: '/', cls: 'key-op' },
    ],
    [
      { label: '7', value: '7' },
      { label: '8', value: '8' },
      { label: '9', value: '9' },
      { label: '×', value: '*', cls: 'key-op' },
    ],
    [
      { label: '4', value: '4' },
      { label: '5', value: '5' },
      { label: '6', value: '6' },
      { label: '−', value: '-', cls: 'key-op' },
    ],
    [
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
      { label: '+', value: '+', cls: 'key-op' },
    ],
    [
      { label: '( )', action: smartParen },
      { label: '0', value: '0' },
      { label: '.', value: '.' },
      { label: '=', action: commit, cls: 'key-eq', aria: 'equals', ownHaptic: true },
    ],
  ];

  return (
    <div className="calc-in mx-auto flex h-[calc(var(--tg-viewport-stable-height,100dvh)-104px)] w-full max-w-xl flex-col overflow-hidden px-2.5 pb-3 pt-1.5 md:h-[calc(var(--tg-viewport-stable-height,100dvh)-56px)] md:px-4 lg:max-w-3xl">
      {/* ── Display — memory (left) and mode-toggle/undo/redo/history (right)
          live right in its header, so no separate row is needed for them. ── */}
      <div className="glass relative mb-1.5 shrink-0 rounded-[var(--r-card)] px-5 pb-3 pt-2.5 shadow-[var(--shadow-2)]">
        <div className="mb-1 flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <MemoryButtons onOp={memoryOp} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode((m) => (m === 'sci' ? 'norm' : 'sci'))}
              aria-label={t('calc.scientificToggle')}
              aria-pressed={mode === 'sci'}
              className={`press focus-ring rounded-lg p-1 ${mode === 'sci' ? 'sci-toggle-on' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <FlaskConical size={15} />
            </button>
            <button onClick={undo} aria-label={t('calc.undo')} className="press focus-ring rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Undo2 size={15} />
            </button>
            <button onClick={redo} aria-label={t('calc.redo')} className="press focus-ring rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Redo2 size={15} />
            </button>
            <button onClick={() => setHistoryOpen(true)} aria-label={t('calc.history')} className="press focus-ring rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <HistoryIcon size={15} />
            </button>
            {justEvaluated && (
              <button onClick={shareResult} disabled={sharePending} aria-label={t('calc.share')} className="press focus-ring rounded-lg p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50">
                <Share2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div ref={displayRef} className="tnum calc-display min-h-[28px] overflow-x-auto whitespace-nowrap text-end text-[19px] font-medium text-[var(--text-secondary)]" dir="ltr">
          {shown || <span className="text-[var(--text-tertiary)]">0</span>}
        </div>
        <div
          key={flash}
          className={`tnum overflow-x-auto whitespace-nowrap text-end font-bold ${flash ? 'result-flash' : ''} ${error ? 'text-[var(--error)]' : ''}`}
          style={{ fontSize: 'clamp(26px, 5.6vh, 42px)' }}
          dir="ltr"
        >
          {error ? t(`error.${error}` as TranslationKey) : preview?.ok ? formatNumber(preview.value, state.settings.precision) : expr ? '…' : '0'}
        </div>
      </div>

      {/* ── Body: one flat, borderless button grid. `min-h-0` at every
          level is what lets this fill the exact remaining height instead
          of overflowing it. ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 lg:flex-row lg:items-stretch lg:gap-2.5">
        {showPanel && (
          <div
            className="calc-panel-in grid min-h-0 flex-[5] grid-cols-4 gap-1.5 md:gap-2 lg:w-[300px] lg:flex-none xl:w-[340px]"
            style={{ gridTemplateRows: 'repeat(5, minmax(0, 1fr))' }}
          >
            <Key onPress={() => setSecondActive((s) => !s)} className={secondActive ? 'key-locked' : ''}>
              2nd
            </Key>
            <Key onPress={() => dispatch({ type: 'settings', patch: { angleMode: angleMode === 'deg' ? 'rad' : 'deg' } })}>{angleMode === 'deg' ? 'Deg' : 'Rad'}</Key>
            <Key onPress={() => insert(sqrtP.v)}>
              <span dir="ltr">{sqrtP.l}</span>
            </Key>
            <Key onPress={() => insert('abs(')}>
              <span dir="ltr">|x|</span>
            </Key>

            <Key onPress={() => insert(sinP.v)}>
              <span dir="ltr">{sinP.l}</span>
            </Key>
            <Key onPress={() => insert(cosP.v)}>
              <span dir="ltr">{cosP.l}</span>
            </Key>
            <Key onPress={() => insert(tanP.v)}>
              <span dir="ltr">{tanP.l}</span>
            </Key>
            <Key onPress={() => insert('pi')}>π</Key>

            <Key onPress={() => insert(lnP.v)}>
              <span dir="ltr">{lnP.l}</span>
            </Key>
            <Key onPress={() => insert(logP.v)}>
              <span dir="ltr">{logP.l}</span>
            </Key>
            <Key onPress={inverse}>
              <span dir="ltr">1/x</span>
            </Key>
            <Key onPress={() => insert('e')}>e</Key>

            <Key onPress={() => insert('log2(')}>
              <span dir="ltr">log₂</span>
            </Key>
            <Key onPress={() => insert('cbrt(')}>
              <span dir="ltr">∛</span>
            </Key>
            <Key onPress={() => insert('^')}>
              <span dir="ltr">xʸ</span>
            </Key>
            <Key onPress={negate}>
              <span dir="ltr">+/-</span>
            </Key>

            <Key onPress={() => insert(' mod ')}>mod</Key>
            <Key onPress={() => insert('!')}>
              <span dir="ltr">x!</span>
            </Key>
            <Key onPress={() => insert('ans')}>Ans</Key>
            <span aria-hidden="true" />
          </div>
        )}

        {/* ── Main keypad ── */}
        <div className="grid min-h-0 flex-[5] grid-cols-4 gap-1.5 md:gap-2 lg:mx-auto lg:max-w-[340px]" style={{ gridTemplateRows: 'repeat(5, minmax(0, 1fr))' }}>
          {KEYS.flat().map((k, i) => (
            <Key key={i} ariaLabel={k.aria ?? k.label} onPress={() => (k.action ? k.action() : insert(k.value!))} className={k.cls ?? ''} haptic={!k.ownHaptic}>
              {k.label === '⌫' ? <Delete size={20} /> : k.label}
            </Key>
          ))}
        </div>
      </div>

      {/* ── History Sheet ── */}
      <Sheet variant="top" open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('calc.history')}>
        {calcHistory.length === 0 ? (
          <EmptyState icon={<HistoryIcon size={26} />} title={t('calc.emptyHistory')} hint={t('calc.emptyHistoryHint')} />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Btn size="sm" variant="danger" onClick={() => dispatch({ type: 'history:clear', kind: 'calculator' })}>
                <Trash2 size={14} />
                {t('calc.clearAll')}
              </Btn>
            </div>
            <div className="flex flex-col gap-2">
              {calcHistory.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    insert(h.payload ?? h.result);
                    setHistoryOpen(false);
                  }}
                  className="press focus-ring rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[rgba(233,242,239,0.03)] px-4 py-3 text-start hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="tnum truncate text-sm text-[var(--text-secondary)]" dir="ltr">
                      {h.label}
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">{formatTime(h.ts, lang)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="tnum truncate text-lg font-bold text-[var(--accent-primary)]" dir="ltr">
                      {h.result}
                    </span>
                    <Copy
                      size={14}
                      className="shrink-0 text-[var(--text-tertiary)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(h.result).then(() => toast(t('action.copied')));
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
