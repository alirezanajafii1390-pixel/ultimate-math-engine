/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/converter
   Category • From • To • Swap • Live Conversion
   Favorites • Recent • Unit Builder
   ═══════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowUpDown, Star, Pin, PinOff, ChevronDown, Plus, Search, History as HistoryIcon, Trash2, Ruler, Share2 } from 'lucide-react';
import { UNIT_CATEGORIES, getCategory, convertValue, type UnitDef } from '../../core/units';
import { formatNumber, formatPlain, formatTime } from '../../core/format';
import { useStore, pushHistory } from '../../core/store';
import { useT, useLang } from '../../core/i18n';
import { Page, PageHeader, Btn, IconBtn, Sheet, EmptyState, useToast, DeleteButton } from '../../ui/kit';
import { useShareService } from '../../core/sharing/share-service';

export default function ConverterPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const [params] = useSearchParams();

  const [catId, setCatId] = useState(params.get('cat') ?? 'length');
  const cat = getCategory(catId) ?? UNIT_CATEGORIES[0];
  const customForCat = state.customUnits[cat.id] ?? [];
  const units = useMemo(() => [...cat.units, ...customForCat], [cat, customForCat]);

  const [fromId, setFromId] = useState(units[0]?.id ?? '');
  const [toId, setToId] = useState(params.get('to') ?? units[1]?.id ?? '');
  const [value, setValue] = useState('1');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [spin, setSpin] = useState(0);

  // Deep link handling
  useEffect(() => {
    const c = params.get('cat');
    const to = params.get('to');
    if (c && getCategory(c)) {
      setCatId(c);
      const list = [...(getCategory(c)!.units), ...(state.customUnits[c] ?? [])];
      const newFrom = list[0]?.id ?? '';
      const newTo = to && list.some((u) => u.id === to) ? to : (list[1]?.id ?? list[0]?.id ?? '');
      setFromId(newFrom);
      setToId(newTo);
      lastSig.current = `${c}:${newFrom}:${newTo}:${value}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const num = parseFloat(value);
  const result = useMemo(() => {
    if (Number.isNaN(num) || !fromId || !toId) return null;
    return convertValue(cat, fromId, toId, num, customForCat);
  }, [num, fromId, toId, cat, customForCat]);

  const fromUnit = units.find((u) => u.id === fromId);
  const toUnit = units.find((u) => u.id === toId);
  const favKey = `${cat.id}:${fromId}:${toId}`;
  const isFav = state.favConverters.includes(favKey);

  const { share: shareViaService, pending: sharePending } = useShareService();
  const shareConversion = useCallback(() => {
    if (result === null || Number.isNaN(result) || !fromUnit || !toUnit) return;
    shareViaService({
      kind: 'converter',
      categoryLabel: cat.name[lang],
      input: { value: formatPlain(num), unit: fromUnit.symbol },
      output: { value: formatNumber(result, state.settings.precision), unit: toUnit.symbol },
    });
  }, [result, fromUnit, toUnit, cat, lang, num, state.settings.precision, shareViaService]);

  /* Record history (debounced, deduped) — context-aware.
     lastSig starts equal to the current (default) signature — not '' — so
     landing on this page with its untouched default conversion is never
     itself treated as "the user did something"; only an actual change
     away from whatever's currently showing gets recorded. */
  const lastSig = useRef(`${favKey}:${value}`);
  useEffect(() => {
    if (result === null || Number.isNaN(result) || !fromUnit || !toUnit) return;
    const sig = `${favKey}:${value}`;
    if (sig === lastSig.current) return;
    const timer = setTimeout(() => {
      lastSig.current = sig;
      pushHistory(dispatch, {
        kind: 'converter',
        label: `${formatPlain(num)} ${fromUnit.symbol} → ${toUnit.symbol}`,
        result: `${formatNumber(result, state.settings.precision)} ${toUnit.symbol}`,
        payload: favKey,
      });
    }, 1600);
    return () => clearTimeout(timer);
  }, [result, favKey, value, num, fromUnit, toUnit, dispatch, state.settings.precision]);

  const changeCategory = (id: string) => {
    setCatId(id);
    const c = getCategory(id)!;
    const list = [...c.units, ...(state.customUnits[id] ?? [])];
    const newFrom = list[0]?.id ?? '';
    const newTo = list[1]?.id ?? list[0]?.id ?? '';
    setFromId(newFrom);
    setToId(newTo);
    lastSig.current = `${id}:${newFrom}:${newTo}:${value}`;
  };

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setSpin((s) => s + 1);
    lastSig.current = '';
  };

  const recentConv = state.history.filter((h) => h.kind === 'converter');
  const pinned = state.pins.some((p) => p.type === 'converter' && p.ref === favKey);
  const pinLabel = fromUnit && toUnit ? `${fromUnit.name[lang]} ← ${toUnit.name[lang]}` : favKey;

  const togglePin = () => {
    if (pinned) {
      const p = state.pins.find((p) => p.type === 'converter' && p.ref === favKey);
      if (p) dispatch({ type: 'pin:remove', id: p.id });
      toast(t('toast.unpinned'), 'info');
    } else {
      dispatch({ type: 'pin:add', pin: { id: `pin-conv-${favKey}`, type: 'converter', ref: favKey, label: pinLabel, ts: Date.now() } });
      toast(t('toast.pinned'));
    }
  };

  /* Dedicated converter search — units only, this page's scope */
  const [searchQ, setSearchQ] = useState('');
  const searchHits = useMemo(() => {
    const query = searchQ.trim().toLowerCase();
    if (!query) return [];
    const out: { catId: string; unit: UnitDef }[] = [];
    for (const c of UNIT_CATEGORIES) {
      for (const u of [...c.units, ...(state.customUnits[c.id] ?? [])]) {
        if ((u.name.fa + u.name.en + u.symbol).toLowerCase().includes(query)) out.push({ catId: c.id, unit: u });
      }
    }
    return out.slice(0, 30);
  }, [searchQ, state.customUnits]);

  return (
    <Page>
      <PageHeader
        title={t('conv.title')}
        actions={
          <div className="flex items-center gap-2">
            <IconBtn label={t('action.search')} onClick={() => setSearchOpen(true)} className="h-9 w-9">
              <Search size={16} />
            </IconBtn>
            <IconBtn label={t('calc.history')} onClick={() => setHistoryOpen(true)} className="h-9 w-9">
              <HistoryIcon size={16} />
            </IconBtn>
            <Btn variant="secondary" size="sm" onClick={() => setBuilderOpen(true)}>
              <Plus size={15} />
              {t('conv.builder')}
            </Btn>
          </div>
        }
      />

      {/* Categories */}
      <div className="chip-row mb-5 pb-1">
        {UNIT_CATEGORIES.map((c) => (
          <button key={c.id} className={`chip press focus-ring shrink-0 ${catId === c.id ? 'active' : ''}`} onClick={() => changeCategory(c.id)}>
            {c.name[lang]}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass relative mb-3 rounded-[var(--r-card)] p-5 shadow-[var(--shadow-2)]">
        <label htmlFor="converter-value-input" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t('conv.input')}</label>
        <input
          id="converter-value-input"
          className="tnum w-full bg-transparent text-3xl font-bold outline-none placeholder:text-[var(--text-tertiary)]"
          dir="ltr"
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.\-eE]/g, ''))}
          style={{ textAlign: 'start' }}
        />
      </div>

      {/* From / Swap / To */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2.5">
        <UnitPickerButton label={t('conv.from')} unit={fromUnit} onClick={() => setPicker('from')} />
        <button
          onClick={swap}
          aria-label={t('action.swap')}
          className="press focus-ring glass relative flex w-12 items-center justify-center self-center rounded-full p-0 text-[var(--accent-primary)]"
          style={{ height: 48, animation: spin ? 'none' : undefined }}
        >
          <span key={spin} style={{ display: 'inline-flex', animation: spin ? 'swapSpin 230ms var(--ease)' : 'none' }}>
            <ArrowUpDown size={18} />
          </span>
        </button>
        <UnitPickerButton label={t('conv.to')} unit={toUnit} onClick={() => setPicker('to')} />
      </div>
      <style>{`@keyframes swapSpin { from { transform: rotate(0deg);} to { transform: rotate(180deg);} }`}</style>

      {/* Result */}
      <div className="card mb-4 p-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t('conv.result')}</label>
          <div className="flex items-center gap-0.5">
            <button
              aria-label={t('action.pin')}
              onClick={togglePin}
              className={`press focus-ring rounded-lg p-1.5 ${pinned ? 'text-[var(--accent-highlight)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </button>
            <button
              aria-label={t('action.favorite')}
              onClick={() => {
                dispatch({ type: 'fav:converter', key: favKey });
                toast(isFav ? t('toast.removedFav') : t('toast.addedFav'), 'info');
              }}
              className={`press focus-ring rounded-lg p-1.5 ${isFav ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
            >
              <Star size={17} fill={isFav ? 'currentColor' : 'none'} />
            </button>
            {result !== null && !Number.isNaN(result) && fromUnit && toUnit && (
              <button
                aria-label={t('calc.share')}
                onClick={shareConversion}
                disabled={sharePending}
                className="press focus-ring rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>
        <p className="tnum mt-1 break-all text-[28px] font-bold text-[var(--accent-primary)]" dir="ltr" style={{ textAlign: 'start' }}>
          {result !== null && !Number.isNaN(result) ? formatNumber(result, state.settings.precision) : '…'}
          <span className="ms-2 text-base font-medium text-[var(--text-secondary)]">{toUnit?.symbol}</span>
        </p>
        {result !== null && fromUnit && toUnit && !Number.isNaN(num) && (
          <p className="tnum mt-1 text-[13px] text-[var(--text-tertiary)]" dir="ltr" style={{ textAlign: 'start' }}>
            1 {fromUnit.symbol} = {formatNumber(convertValue(cat, fromId, toId, 1, customForCat), state.settings.precision)} {toUnit.symbol}
          </p>
        )}
      </div>

      {/* Favorites (context-aware, kept inline — Recent now lives behind the history icon) */}
      {state.favConverters.length > 0 && (
        <div className="mb-5">
          <p className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{t('conv.favorites')}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {state.favConverters.slice(0, 6).map((key) => {
              const [cId, fId, tId] = key.split(':');
              const c = getCategory(cId);
              if (!c) return null;
              const all = [...c.units, ...(state.customUnits[cId] ?? [])];
              const fu = all.find((u) => u.id === fId);
              const tu = all.find((u) => u.id === tId);
              if (!fu || !tu) return null;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setCatId(cId);
                    setFromId(fId);
                    setToId(tId);
                  }}
                  className="press focus-ring rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[rgba(233,242,239,0.03)] px-4 py-3 text-start hover:border-[var(--border-strong)]"
                >
                  <span className="block text-sm font-medium">
                    {fu.name[lang]} ← {tu.name[lang]}
                  </span>
                  <span className="tnum mt-0.5 block text-xs text-[var(--text-tertiary)]" dir="ltr" style={{ textAlign: 'start' }}>
                    1 {fu.symbol} = {formatNumber(convertValue(c, fId, tId, 1, state.customUnits[cId] ?? []), 8)} {tu.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unit picker sheet */}
      <UnitPickerSheet
        open={picker !== null}
        onClose={() => setPicker(null)}
        units={units}
        selected={picker === 'from' ? fromId : toId}
        title={picker === 'from' ? t('conv.from') : t('conv.to')}
        onSelect={(id) => {
          if (picker === 'from') setFromId(id);
          else setToId(id);
          setPicker(null);
          lastSig.current = '';
        }}
        onRemoveCustom={(id) => {
          dispatch({ type: 'customUnit:remove', cat: cat.id, id });
          toast(t('toast.deleted'), 'info');
        }}
      />

      {/* Unit builder */}
      <UnitBuilder cat={cat.id} base={cat.base} open={builderOpen} onClose={() => setBuilderOpen(false)} />

      {/* History sheet — full recent conversions, opens from the top */}
      <Sheet variant="top" open={historyOpen} onClose={() => setHistoryOpen(false)} title={t('conv.recent')}>
        {recentConv.length === 0 ? (
          <EmptyState icon={<HistoryIcon size={26} />} title={t('calc.emptyHistory')} hint={t('calc.emptyHistoryHint')} />
        ) : (
          <>
            <div className="mb-3 flex justify-end">
              <Btn size="sm" variant="danger" onClick={() => dispatch({ type: 'history:clear', kind: 'converter' })}>
                <Trash2 size={14} />
                {t('calc.clearAll')}
              </Btn>
            </div>
            <div className="flex flex-col gap-2">
              {recentConv.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    if (!h.payload) return;
                    const [cId, fId, tId] = h.payload.split(':');
                    if (getCategory(cId)) {
                      setCatId(cId);
                      setFromId(fId);
                      setToId(tId);
                    }
                    setHistoryOpen(false);
                  }}
                  className="press focus-ring rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[rgba(233,242,239,0.03)] px-4 py-3 text-start hover:border-[var(--border-strong)]"
                >
                  <span className="tnum block truncate text-sm font-medium" dir="ltr" style={{ textAlign: 'start' }}>
                    {h.label}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between text-xs">
                    <span className="tnum text-[var(--accent-primary)]" dir="ltr">
                      {h.result}
                    </span>
                    <span className="text-[var(--text-tertiary)]">{formatTime(h.ts, lang)}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      {/* Dedicated converter search — units only, unlike the global Ctrl+K palette */}
      <Sheet variant="top" open={searchOpen} onClose={() => setSearchOpen(false)} title={t('conv.title') + ' — ' + t('action.search')}>
        <div className="mb-3 flex items-center gap-2.5 rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[var(--surface-fill)] px-3.5 py-2.5">
          <Search size={15} className="text-[var(--text-tertiary)]" />
          <input
            autoFocus
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder={t('conv.allUnits') + '…'}
            aria-label={t('conv.allUnits')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
        {searchQ.trim() === '' ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.hint')}</p>
        ) : searchHits.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-[var(--text-tertiary)]">{t('search.empty')}</p>
        ) : (
          <div className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {searchHits.map(({ catId: hCatId, unit }) => (
              <button
                key={`${hCatId}-${unit.id}`}
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQ('');
                  changeCategory(hCatId);
                  setToId(unit.id);
                }}
                className="press focus-ring flex items-center justify-between rounded-[14px] px-3.5 py-3 text-start hover:bg-[rgba(233,242,239,0.05)]"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  <bdi>{unit.name[lang]}</bdi>
                  <bdi className="ms-2 text-xs text-[var(--text-tertiary)]">{getCategory(hCatId)?.name[lang]}</bdi>
                </span>
                <span className="tnum shrink-0 text-sm text-[var(--text-tertiary)]" dir="ltr">
                  {unit.symbol}
                </span>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </Page>
  );
}

/* ── Picker button ──────────────────────────────────────── */
function UnitPickerButton({ label, unit, onClick }: { label: string; unit?: UnitDef; onClick: () => void }) {
  const lang = useLang();
  return (
    <button onClick={onClick} className="card card-hover press focus-ring p-4 text-start">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      <span className="mt-1.5 flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{unit?.name[lang] ?? '—'}</span>
          <span className="tnum block text-xs text-[var(--text-tertiary)]" dir="ltr" style={{ textAlign: 'start' }}>
            {unit?.symbol}
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-[var(--text-tertiary)]" />
      </span>
    </button>
  );
}

/* ── Picker sheet (glass, searchable) ───────────────────── */
function UnitPickerSheet({
  open,
  onClose,
  units,
  selected,
  title,
  onSelect,
  onRemoveCustom,
}: {
  open: boolean;
  onClose: () => void;
  units: UnitDef[];
  selected: string;
  title: string;
  onSelect: (id: string) => void;
  onRemoveCustom: (id: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const list = units.filter((u) => (u.name.fa + u.name.en + u.symbol).toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet variant="top" open={open} onClose={onClose} title={title}>
      <div className="mb-3 flex items-center gap-2.5 rounded-[var(--r-input)] border border-[var(--border-subtle)] bg-[var(--surface-fill)] px-3.5 py-2.5">
        <Search size={15} className="text-[var(--text-tertiary)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('action.search') + '…'} aria-label={t('action.search')} className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]" />
      </div>
      <div className="flex max-h-[46dvh] flex-col gap-1 overflow-y-auto">
        {list.map((u) => (
          <div key={u.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(u.id)}
              className={`press focus-ring flex flex-1 items-center justify-between rounded-[14px] px-3.5 py-3 text-start transition-colors ${
                u.id === selected ? 'bg-[rgba(153,204,51,0.12)] text-[var(--accent-primary)]' : 'hover:bg-[rgba(233,242,239,0.05)]'
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                <bdi>{u.name[lang]}</bdi>
                {u.custom && <span className="ms-2 rounded-md bg-[rgba(2,245,161,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-highlight)]">★</span>}
              </span>
              <span className="tnum shrink-0 text-sm text-[var(--text-tertiary)]" dir="ltr">
                {u.symbol}
              </span>
            </button>
            {u.custom && <DeleteButton onDelete={() => onRemoveCustom(u.id)} />}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ── Unit Builder ───────────────────────────────────────── */
function UnitBuilder({ cat, base, open, onClose }: { cat: string; base: string; open: boolean; onClose: () => void }) {
  const { dispatch } = useStore();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const c = getCategory(cat);
  const baseUnit = c?.units.find((u) => u.id === base);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [factor, setFactor] = useState('');

  const f = parseFloat(factor);
  const canSave = name.trim().length > 0 && symbol.trim().length > 0 && !Number.isNaN(f) && f > 0;
  const isLinear = !c?.units.some((u) => u.toBase);

  const save = () => {
    const u: UnitDef = {
      id: `custom-${symbol.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      name: { fa: name.trim(), en: name.trim() },
      symbol: symbol.trim(),
      factor: f,
      custom: true,
    };
    dispatch({ type: 'customUnit:add', cat, u });
    toast(t('toast.created'));
    setName('');
    setSymbol('');
    setFactor('');
    onClose();
  };

  return (
    <Sheet variant="top" open={open} onClose={onClose} title={t('conv.builder')}>
      <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">
        {t('conv.builderHint')} {!isLinear && <span className="text-[var(--warning)]">({c?.name[lang]})</span>}
      </p>
      {!isLinear ? (
        <EmptyState icon={<Ruler size={24} />} title={t('conv.customEmpty')} hint={t('conv.nonLinearHint')} />
      ) : (
        <div className="flex flex-col gap-3">
          <input className="me-input" placeholder={t('conv.unitName')} aria-label={t('conv.unitName')} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="me-input tnum" dir="ltr" placeholder={t('conv.unitSymbol')} aria-label={t('conv.unitSymbol')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            <input className="me-input tnum" dir="ltr" inputMode="decimal" placeholder={t('conv.unitFactor')} aria-label={t('conv.unitFactor')} value={factor} onChange={(e) => setFactor(e.target.value.replace(/[^0-9.\-eE]/g, ''))} />
          </div>
          {canSave && baseUnit && (
            <p className="tnum rounded-[var(--r-input)] border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-secondary)]" dir="ltr" style={{ textAlign: 'start' }}>
              1 {symbol} = {formatNumber(f, 10)} {baseUnit.symbol}
            </p>
          )}
          <Btn variant="accent" onClick={save} disabled={!canSave}>
            <Plus size={16} />
            {t('action.create')}
          </Btn>
        </div>
      )}
    </Sheet>
  );
}
