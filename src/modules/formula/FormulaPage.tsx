/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/formula
   Library • Search • Categories • Favorites • Recent
   Details: Variables • Live Preview • Calculate • Save
   Formula Builder: your expression → your tool.
   ═══════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search,
  Star,
  Pin,
  ArrowLeft,
  Plus,
  Send,
  SquareFunction,
  PinOff,
  Check,
  History as HistoryIcon,
  Share2,
} from 'lucide-react';
import { FORMULAS, FORMULA_CATEGORIES, evaluateFormula, getFormula, buildCustomFormula, type FormulaDef } from '../../core/formulas';
import { validateExpression, extractVariables, MathError } from '../../core/parser';
import { getCategory, convertValue, findUnitContext, type UnitCategory } from '../../core/units';
import { formatNumber, formatPlain, formatTime, prettyExpr } from '../../core/format';
import { useStore, pushHistory } from '../../core/store';
import { useT, useLang, type TranslationKey } from '../../core/i18n';
import { Page, PageHeader, Btn, IconBtn, Sheet, EmptyState, InteractiveCard, useToast } from '../../ui/kit';
import { CATEGORY_ICONS } from '../../layout/AppShell';
import { usePlatform } from '../../platform/PlatformContext';
import { useShareService } from '../../core/sharing/share-service';

type TabKey = 'all' | 'favorites' | 'recent' | 'custom';

export default function FormulaPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const lang = useLang();
  const [params, setParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [tab, setTab] = useState<TabKey>('all');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedId = params.get('f');
  const selected = selectedId ? getFormula(selectedId, state.customFormulas) : undefined;

  const allFormulas = useMemo(() => [...FORMULAS, ...state.customFormulas], [state.customFormulas]);
  const recentIds = useMemo(
    () => [...new Set(state.history.filter((h) => h.kind === 'formula' && h.payload).map((h) => h.payload!))].slice(0, 12),
    [state.history],
  );
  const formulaHistory = useMemo(() => state.history.filter((h) => h.kind === 'formula'), [state.history]);

  const list = useMemo(() => {
    let base = allFormulas;
    if (tab === 'favorites') base = base.filter((f) => state.favFormulas.includes(f.id));
    else if (tab === 'recent') base = recentIds.map((id) => allFormulas.find((f) => f.id === id)!).filter(Boolean);
    else if (tab === 'custom') base = state.customFormulas;
    if (cat !== 'all' && tab === 'all') base = base.filter((f) => f.cat === cat);
    return base;
  }, [allFormulas, tab, cat, state.favFormulas, state.customFormulas, recentIds]);

  const searchHits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return allFormulas.filter((f) => (f.name.fa + ' ' + f.name.en + ' ' + f.expr).toLowerCase().includes(query)).slice(0, 30);
  }, [allFormulas, q]);

  if (selected) {
    return <FormulaDetail key={selected.id} f={selected} onBack={() => setParams({})} />;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('formula.all') },
    { key: 'favorites', label: t('formula.favorites') },
    { key: 'recent', label: t('formula.recent') },
    { key: 'custom', label: t('formula.custom') },
  ];

  return (
    <Page>
      <PageHeader
        title={t('formula.title')}
        actions={
          <div className="flex items-center gap-2">
            <IconBtn label={t('calc.history')} onClick={() => setHistoryOpen(true)} className="h-9 w-9">
              <HistoryIcon size={16} />
            </IconBtn>
            <Btn variant="accent" size="sm" onClick={() => setBuilderOpen(true)}>
              <Plus size={16} />
              {t('formula.build')}
            </Btn>
          </div>
        }
      />

      {/* Search — opens a dedicated panel instead of an inline box, so the
          results are never pushed off-screen by the mobile keyboard. */}
      <button onClick={() => setSearchOpen(true)} className="glass relative press focus-ring mb-4 flex w-full items-center gap-3 rounded-[var(--r-floating)] px-4 py-3 text-start">
        <Search size={17} className="shrink-0 text-[var(--text-tertiary)]" />
        <span className="text-[15px] text-[var(--text-tertiary)]">{t('formula.search')}</span>
      </button>

      {/* Tabs */}
      <div className="chip-row mb-4 pb-1">
        {tabs.map((tb) => (
          <button key={tb.key} className={`chip press focus-ring shrink-0 ${tab === tb.key ? 'active' : ''}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Category chips (only on All) */}
      {tab === 'all' && (
        <div className="chip-row mb-5 pb-1">
          <button className={`chip press focus-ring shrink-0 ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
            {t('common.all')}
          </button>
          {FORMULA_CATEGORIES.map((c) => (
            <button key={c.id} className={`chip press focus-ring shrink-0 ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
              {c.name[lang]}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {list.length === 0 ? (
        <EmptyState
          icon={<SquareFunction size={26} />}
          title={tab === 'custom' ? t('formula.customEmpty') : t('formula.empty')}
          hint={tab === 'custom' ? t('formula.customEmptyHint') : t('formula.emptyHint')}
          action={
            <Btn variant="accent" size="sm" onClick={() => setBuilderOpen(true)}>
              <Plus size={15} />
              {t('formula.build')}
            </Btn>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((f) => (
            <FormulaCard key={f.id} f={f} onOpen={() => setParams({ f: f.id })} />
          ))}
        </div>
      )}

      <FormulaBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />

      {/* History sheet — opens from the top, same pattern as the builder */}
      <Sheet variant="top" open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('calc.history')}>
        {formulaHistory.length === 0 ? (
          <EmptyState icon={<HistoryIcon size={26} />} title={t('calc.emptyHistory')} hint={t('calc.emptyHistoryHint')} />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Btn size="sm" variant="danger" onClick={() => dispatch({ type: 'history:clear', kind: 'formula' })}>
                {t('calc.clearAll')}
              </Btn>
            </div>
            <div className="flex flex-col gap-2">
              {formulaHistory.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setHistoryOpen(false);
                    if (h.payload) setParams({ f: h.payload });
                  }}
                  className="press focus-ring rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[rgba(233,242,239,0.03)] px-4 py-3 text-start hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-[var(--text-secondary)]">{h.label}</span>
                    <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">{formatTime(h.ts, lang)}</span>
                  </div>
                  <span className="tnum mt-1 block truncate text-lg font-bold text-[var(--accent-primary)]" dir="ltr">
                    {h.result}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      {/* Search sheet — own input + own scrollable results, so the mobile
          keyboard never hides what you're searching for. */}
      <Sheet variant="top" open={searchOpen} onClose={() => setSearchOpen(false)} title={t('formula.search')}>
        <div className="mb-3 flex items-center gap-2.5 rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[var(--surface-fill)] px-3.5 py-2.5">
          <Search size={15} className="shrink-0 text-[var(--text-tertiary)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('formula.search')}
            aria-label={t('formula.search')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
        {q.trim() === '' ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.hint')}</p>
        ) : searchHits.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.empty')}</p>
        ) : (
          <div className="flex max-h-[55dvh] flex-col gap-1 overflow-y-auto">
            {searchHits.map((f) => {
              const fcat = FORMULA_CATEGORIES.find((c) => c.id === f.cat);
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSearchOpen(false);
                    setQ('');
                    setParams({ f: f.id });
                  }}
                  className="press focus-ring flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-3 text-start hover:bg-[rgba(233,242,239,0.05)]"
                >
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    <bdi>{f.name[lang]}</bdi>
                    {fcat && <bdi className="ms-2 text-xs text-[var(--text-tertiary)]">{fcat.name[lang]}</bdi>}
                  </span>
                  <span className="tnum shrink-0 text-xs text-[var(--text-tertiary)]" dir="ltr">
                    {prettyExpr(f.expr)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </Page>
  );
}

/* ── Formula card ───────────────────────────────────────── */
function FormulaCard({ f, onOpen }: { f: FormulaDef; onOpen: () => void }) {
  const { state, dispatch } = useStore();
  const lang = useLang();
  const t = useT();
  const toast = useToast();
  const fav = state.favFormulas.includes(f.id);
  const pinned = state.pins.some((p) => p.type === 'formula' && p.ref === f.id);
  const CatIcon = CATEGORY_ICONS[FORMULA_CATEGORIES.find((c) => c.id === f.cat)?.icon ?? 'sigma'] ?? SquareFunction;

  return (
    <InteractiveCard className="p-4" onClick={onOpen}>
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
          <CatIcon size={18} />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            aria-label={t('action.pin')}
            onClick={(e) => {
              e.stopPropagation();
              if (pinned) {
                const p = state.pins.find((p) => p.type === 'formula' && p.ref === f.id);
                if (p) dispatch({ type: 'pin:remove', id: p.id });
                toast(t('toast.unpinned'), 'info');
              } else {
                dispatch({ type: 'pin:add', pin: { id: `pin-${f.id}`, type: 'formula', ref: f.id, label: f.name[lang], ts: Date.now() } });
                toast(t('toast.pinned'));
              }
            }}
            className={`press focus-ring rounded-lg p-1.5 ${pinned ? 'text-[var(--accent-highlight)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            <Pin size={16} fill={pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            aria-label={t('action.favorite')}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'fav:formula', id: f.id });
              toast(fav ? t('toast.removedFav') : t('toast.addedFav'), 'info');
            }}
            className={`press focus-ring rounded-lg p-1.5 ${fav ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
          >
            <Star size={17} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      <p className="text-[15px] font-semibold">{f.name[lang]}</p>
      <p className="tnum mt-1 truncate text-[13px] text-[var(--text-tertiary)]" dir="ltr">
        {f.result.symbol} = {prettyExpr(f.expr)}
      </p>
    </InteractiveCard>
  );
}

/* ── Detail view: Variables → Live Preview → Calculate ──── */
function FormulaDetail({ f, onBack }: { f: FormulaDef; onBack: () => void }) {
  const { state, dispatch } = useStore();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fav = state.favFormulas.includes(f.id);
  const pinned = state.pins.some((p) => p.type === 'formula' && p.ref === f.id);
  const isTrig = f.cat === 'trigonometry';
  const platform = usePlatform();

  const toggleFav = useCallback(() => {
    dispatch({ type: 'fav:formula', id: f.id });
    toast(fav ? t('toast.removedFav') : t('toast.addedFav'), 'info');
  }, [dispatch, f.id, fav, toast, t]);

  // Split into two effects for the same reason the Back Button in
  // AppShell is split (see PROJECT_CONTEXT.md decision 8): `platform.
  // mainButton` gets a new object reference on every unrelated signal
  // change (theme, viewport, ...), not just when `fav` changes. Keying
  // the lifecycle effect off the primitive `isSupported` boolean instead
  // of the whole object avoids hiding-then-reshowing on every such
  // change; calling the SDK's real `mainButton` methods (a stable
  // singleton) via a slightly "stale" closure is harmless — they always
  // delegate to the same underlying object regardless of which render's
  // closure happened to call them.
  const mainButtonSupported = platform.mainButton.isSupported;
  useEffect(() => {
    if (!platform.isTelegram || !mainButtonSupported) return;
    return () => platform.mainButton.hide();
  }, [platform.isTelegram, mainButtonSupported]);

  useEffect(() => {
    if (!platform.isTelegram || !mainButtonSupported) return;
    platform.mainButton.show(fav ? t('formula.removeFav') : t('formula.addFav'));
    return platform.mainButton.onClick(toggleFav);
  }, [platform.isTelegram, mainButtonSupported, fav, t, toggleFav]);

  // Any variable whose native unit matches a known converter unit gets its
  // own picker — so input values can be entered in whatever unit is
  // convenient (cm, ft, °, etc.), not just the formula's SI unit.
  const varUnitCtx: Record<string, { cat: UnitCategory; nativeId: string }> = {};
  for (const v of f.vars) {
    if (v.unit) {
      const ctx = findUnitContext(v.unit);
      if (ctx) varUnitCtx[v.key] = { cat: ctx.cat, nativeId: ctx.unitId };
    }
  }
  const [varUnitId, setVarUnitId] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const k in varUnitCtx) m[k] = varUnitCtx[k].nativeId;
    return m;
  });

  const unitCat = f.result.unitCategory ? getCategory(f.result.unitCategory) : undefined;
  const [resultUnitId, setResultUnitId] = useState<string>(() => {
    // default to the unit matching the formula's native symbol (e.g. 'm', 'm²', 'm³')
    if (!unitCat) return '';
    return unitCat.units.find((u) => u.symbol === f.result.unit)?.id ?? unitCat.base;
  });
  const baseUnitId = unitCat ? unitCat.units.find((u) => u.symbol === f.result.unit)?.id ?? unitCat.base : '';

  const numeric: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of f.vars) {
      const raw = parseFloat(values[v.key] ?? '');
      if (Number.isNaN(raw)) continue;
      const ctx = varUnitCtx[v.key];
      const selUnitId = varUnitId[v.key];
      out[v.key] = ctx && selUnitId && selUnitId !== ctx.nativeId ? convertValue(ctx.cat, selUnitId, ctx.nativeId, raw) : raw;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, f.vars, varUnitId]);

  const allFilled = f.vars.every((v) => numeric[v.key] !== undefined);

  /* Live preview — compute as you type */
  useEffect(() => {
    if (!allFilled) {
      setResult(null);
      setError(null);
      return;
    }
    try {
      const v = evaluateFormula(f, numeric, isTrig ? 'deg' : state.settings.angleMode);
      setResult(v);
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e instanceof MathError ? e.code : 'SYNTAX');
    }
  }, [numeric, allFilled, f, isTrig, state.settings.angleMode]);

  /* Result converted into the currently selected display unit */
  const displayResult = useMemo(() => {
    if (result === null) return null;
    if (!unitCat || !resultUnitId || !baseUnitId) return result;
    return convertValue(unitCat, baseUnitId, resultUnitId, result);
  }, [result, unitCat, resultUnitId, baseUnitId]);

  const displayUnitSymbol = unitCat ? unitCat.units.find((u) => u.id === resultUnitId)?.symbol : f.result.unit;

  const { share: shareViaService, pending: sharePending } = useShareService();
  const shareFormulaResult = useCallback(() => {
    if (displayResult === null) return;
    const resultStr = formatNumber(displayResult, state.settings.precision) + (displayUnitSymbol ? ` ${displayUnitSymbol}` : '');
    shareViaService({
      kind: 'formula',
      formulaName: f.name[lang],
      variables: f.vars.map((v) => ({ key: v.key, value: formatPlain(numeric[v.key]) })),
      results: [{ label: t('formula.result'), value: resultStr }],
    });
  }, [displayResult, f, numeric, state.settings.precision, displayUnitSymbol, lang, shareViaService, t]);

  const commit = () => {
    if (displayResult === null) return;
    const argStr = f.vars.map((v) => `${v.key}=${formatPlain(numeric[v.key])}`).join(', ');
    pushHistory(dispatch, {
      kind: 'formula',
      label: `${f.name[lang]} (${argStr})`,
      result: formatNumber(displayResult, state.settings.precision) + (displayUnitSymbol ? ` ${displayUnitSymbol}` : ''),
      payload: f.id,
    });
    toast(t('toast.saved'));
  };

  return (
    <Page>
      <button onClick={onBack} className="press focus-ring mb-5 flex h-10 items-center gap-2 rounded-[var(--r-button)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={16} className="rtl:rotate-180" />
        {t('action.back')}
      </button>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{f.name[lang]}</h1>
          {f.desc && <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{f.desc[lang]}</p>}
        </div>
        <div className="flex gap-1.5">
          <IconBtn
            label={t('action.favorite')}
            onClick={toggleFav}
            className={fav ? 'text-[var(--accent-primary)]' : ''}
          >
            <Star size={17} fill={fav ? 'currentColor' : 'none'} />
          </IconBtn>
          <IconBtn
            label={t('action.pin')}
            onClick={() => {
              if (pinned) {
                const p = state.pins.find((p) => p.type === 'formula' && p.ref === f.id);
                if (p) dispatch({ type: 'pin:remove', id: p.id });
                toast(t('toast.unpinned'), 'info');
              } else {
                dispatch({ type: 'pin:add', pin: { id: `pin-${f.id}`, type: 'formula', ref: f.id, label: f.name[lang], ts: Date.now() } });
                toast(t('toast.pinned'));
              }
            }}
            className={pinned ? 'text-[var(--accent-highlight)]' : ''}
          >
            {pinned ? <PinOff size={17} /> : <Pin size={17} />}
          </IconBtn>
          {displayResult !== null && (
            <IconBtn label={t('calc.share')} onClick={shareFormulaResult} disabled={sharePending} className="disabled:opacity-50">
              <Share2 size={17} />
            </IconBtn>
          )}
        </div>
      </div>

      {/* Live preview — glass */}
      <div className="glass relative mb-3 rounded-[var(--r-card)] p-5 text-center shadow-[var(--shadow-2)]">
        <p className="tnum text-[15px] text-[var(--text-secondary)]" dir="ltr">
          {f.result.symbol} = {prettyExpr(f.expr)}
        </p>
        <p className={`tnum mt-2 font-bold ${error ? 'text-[var(--error)]' : 'text-[var(--accent-primary)]'}`} style={{ fontSize: 'clamp(26px,5vw,36px)' }} dir="ltr">
          {error
            ? t(`error.${error}` as TranslationKey)
            : displayResult !== null
              ? `${formatNumber(displayResult, state.settings.precision)}${displayUnitSymbol ? ' ' + displayUnitSymbol : ''}`
              : '…'}
        </p>
      </div>

      {/* Result unit picker — only for formulas whose result maps to a convertible unit category */}
      {unitCat && (
        <div className="chip-row mb-6 pb-1">
          {unitCat.units.map((u) => (
            <button
              key={u.id}
              onClick={() => setResultUnitId(u.id)}
              className={`chip press focus-ring shrink-0 ${resultUnitId === u.id ? 'active' : ''}`}
            >
              {u.symbol}
            </button>
          ))}
        </div>
      )}

      {/* Variables */}
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t('formula.enterValues')}</p>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {f.vars.map((v) => (
          <label key={v.key} className="block">
            <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
              <span>
                <span className="tnum me-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[rgba(153,204,51,0.12)] px-1.5 text-[13px] font-bold text-[var(--accent-primary)]" dir="ltr">
                  {v.key}
                </span>
                {v.name[lang]}
              </span>
              {varUnitCtx[v.key] ? (
                <select
                  value={varUnitId[v.key] ?? varUnitCtx[v.key].nativeId}
                  onChange={(e) => setVarUnitId((s) => ({ ...s, [v.key]: e.target.value }))}
                  className="unit-select"
                  dir="ltr"
                  aria-label={`${v.name[lang]} — ${t('conv.title')}`}
                >
                  {varUnitCtx[v.key].cat.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol}
                    </option>
                  ))}
                </select>
              ) : (
                v.unit && <span className="text-xs text-[var(--text-tertiary)]">{v.unit}</span>
              )}
            </span>
            <input
              className="me-input tnum numeric"
              dir="ltr"
              inputMode="decimal"
              placeholder="0"
              value={values[v.key] ?? ''}
              onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value.replace(/[^0-9.\-eE]/g, '') }))}
            />
          </label>
        ))}
      </div>

      <div className="flex gap-2.5">
        <Btn variant="accent" className="flex-1" onClick={commit} disabled={displayResult === null}>
          <Check size={17} />
          {t('formula.calculate')}
        </Btn>
        <Btn
          variant="secondary"
          onClick={() => {
            // Values are wrapped in parentheses on substitution: without it, a negative
            // value combined with `^` would silently change sign (e.g. a=-3 in "a^2"
            // would become the text "-3^2", which this parser evaluates as -(3^2)=-9
            // instead of the intended (-3)^2=9 — the same pitfall as Python's -3**2).
            const substituted = f.expr.replace(/[a-z_][a-z0-9_]*/gi, (m) => {
              if (!f.vars.some((v) => v.key === m)) return m;
              const n = numeric[m];
              return n !== undefined ? `(${formatPlain(n)})` : '0';
            });
            navigate(`/calculator?expr=${encodeURIComponent(substituted)}`);
          }}
        >
          <Send size={16} />
          {t('formula.sendToCalc')}
        </Btn>
      </div>
    </Page>
  );
}

/* ── Formula Builder ────────────────────────────────────── */
function FormulaBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore();
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState('');
  const [expr, setExpr] = useState('');

  const vars = useMemo(() => extractVariables(expr), [expr]);
  const validity = useMemo(() => (expr.trim() ? validateExpression(expr) : null), [expr]);
  const canSave = name.trim().length > 0 && validity?.ok && vars.length > 0;

  const save = () => {
    const f = buildCustomFormula(name.trim(), expr.trim());
    dispatch({ type: 'customFormula:add', f });
    toast(t('toast.created'));
    setName('');
    setExpr('');
    onClose();
  };

  return (
    <Sheet variant="top" open={open} onClose={onClose} title={t('formula.builder')}>
      <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">{t('formula.builderHint')}</p>
      <div className="flex flex-col gap-3">
        <input className="me-input" placeholder={t('formula.namePlaceholder')} aria-label={t('formula.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="me-input tnum" dir="ltr" placeholder={t('formula.exprPlaceholder')} aria-label={t('formula.exprPlaceholder')} value={expr} onChange={(e) => setExpr(e.target.value)} />
        {expr.trim() && (
          <div className="rounded-[var(--r-input)] border border-[var(--border-subtle)] p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t('formula.detectedVars')}</p>
            {vars.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">—</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {vars.map((v) => (
                  <span key={v} className="tnum rounded-lg bg-[rgba(153,204,51,0.12)] px-2.5 py-1 text-sm font-bold text-[var(--accent-primary)]" dir="ltr">
                    {v}
                  </span>
                ))}
              </div>
            )}
            {validity && !validity.ok && <p className="mt-2 text-sm text-[var(--error)]">{t(`error.${validity.error}` as TranslationKey)}</p>}
          </div>
        )}
        <Btn variant="accent" onClick={save} disabled={!canSave}>
          <Plus size={16} />
          {t('action.create')}
        </Btn>
      </div>
    </Sheet>
  );
}
