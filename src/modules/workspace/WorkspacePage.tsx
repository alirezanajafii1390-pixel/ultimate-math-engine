/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/workspace
   The user activity hub: Favorites • Pinned • Memory
   Custom Formulas • Custom Units • Timeline
   ═══════════════════════════════════════════════════════════ */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Star, Pin, Brain, SquareFunction, Ruler, Trash2, LayoutGrid, Clock, Calculator, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { useStore } from '../../core/store';
import { useT, useLang } from '../../core/i18n';
import { getFormula, type FormulaDef } from '../../core/formulas';
import { getCategory, findUnit } from '../../core/units';
import { formatNumber, timeAgo } from '../../core/format';
import { Page, PageHeader, Section, Card, InteractiveCard, EmptyState, useToast, Btn, DeleteButton } from '../../ui/kit';

export default function WorkspacePage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const favFormulas = state.favFormulas
    .map((id) => getFormula(id, state.customFormulas))
    .filter((f): f is FormulaDef => Boolean(f));
  const isEmpty =
    state.pins.length === 0 && state.favFormulas.length === 0 && state.favConverters.length === 0 && state.customFormulas.length === 0 && state.memory === null && state.history.length === 0;

  /* Most Used — the tool + specific feature the person reaches for most,
     computed per kind (calculator / formula / converter) from history payloads. */
  const mostUsed = useMemo(() => {
    const counts: Record<'calculator' | 'formula' | 'converter', Map<string, number>> = {
      calculator: new Map(),
      formula: new Map(),
      converter: new Map(),
    };
    for (const h of state.history) {
      if (h.kind !== 'calculator' && h.kind !== 'formula' && h.kind !== 'converter') continue;
      const key = h.kind === 'formula' || h.kind === 'converter' ? h.payload : undefined;
      if (!key) continue;
      const m = counts[h.kind];
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    const top = (kind: 'formula' | 'converter') => {
      let bestKey = '';
      let bestCount = 0;
      for (const [k, c] of counts[kind]) {
        if (c > bestCount) {
          bestKey = k;
          bestCount = c;
        }
      }
      return bestKey ? { key: bestKey, count: bestCount } : null;
    };
    const totalCalc = state.history.filter((h) => h.kind === 'calculator').length;

    const sections: { icon: typeof Calculator; label: string; sub: string; onClick: () => void; count: number }[] = [];

    const topFormula = top('formula');
    if (topFormula) {
      const f = getFormula(topFormula.key, state.customFormulas);
      if (f) {
        sections.push({
          icon: SquareFunction,
          label: t('nav.formula'),
          sub: f.name[lang],
          onClick: () => navigate(`/formula?f=${f.id}`),
          count: topFormula.count,
        });
      }
    }
    const topConverter = top('converter');
    if (topConverter) {
      const [cId, fId, tId] = topConverter.key.split(':');
      const c = getCategory(cId);
      const fu = c ? findUnit(cId, fId, state.customUnits[cId] ?? []) : undefined;
      const tu = c ? findUnit(cId, tId, state.customUnits[cId] ?? []) : undefined;
      if (c && fu && tu) {
        sections.push({
          icon: ArrowLeftRight,
          label: t('nav.converter'),
          sub: `${fu.symbol} → ${tu.symbol} (${c.name[lang]})`,
          onClick: () => navigate(`/converter?cat=${cId}&to=${tId}`),
          count: topConverter.count,
        });
      }
    }
    if (totalCalc > 0) {
      sections.push({
        icon: Calculator,
        label: t('nav.calculator'),
        sub: `${totalCalc} ${t('ws.timesUsed')}`,
        onClick: () => navigate('/calculator'),
        count: totalCalc,
      });
    }
    return sections.sort((a, b) => b.count - a.count);
  }, [state.history, state.customFormulas, state.customUnits, lang, navigate, t]);

  return (
    <Page>
      <PageHeader title={t('ws.title')} subtitle={t('ws.subtitle')} />

      {isEmpty ? (
        <EmptyState
          icon={<LayoutGrid size={26} />}
          title={t('ws.empty')}
          hint={t('ws.emptyHint')}
          action={
            <Btn variant="accent" size="sm" onClick={() => navigate('/formula')}>
              <SquareFunction size={15} />
              {t('nav.formula')}
            </Btn>
          }
        />
      ) : (
        <>
          {/* Most Used */}
          {mostUsed.length > 0 && (
            <Section title={t('ws.mostUsed')}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {mostUsed.map((m, i) => (
                  <InteractiveCard key={i} className="flex items-center gap-3 p-3.5" onClick={m.onClick}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                      <m.icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                        <TrendingUp size={11} />
                        {m.label}
                      </span>
                      <span className="tnum block truncate text-sm font-semibold" dir="ltr" style={{ textAlign: 'start' }}>
                        {m.sub}
                      </span>
                    </span>
                  </InteractiveCard>
                ))}
              </div>
            </Section>
          )}

          {/* Memory */}
          {state.memory !== null && (
            <Section title={t('ws.memory')}>
              <Card className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                    <Brain size={18} />
                  </span>
                  <span className="tnum text-xl font-bold" dir="ltr">
                    {formatNumber(state.memory, state.settings.precision)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => navigate(`/calculator?expr=${encodeURIComponent(String(state.memory))}`)}>
                    {t('action.use')}
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => dispatch({ type: 'memory', value: null })}>
                    <Trash2 size={14} />
                  </Btn>
                </div>
              </Card>
            </Section>
          )}

          {/* Pinned */}
          {state.pins.length > 0 && (
            <Section title={t('ws.pinned')}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {state.pins.map((p) => (
                  <InteractiveCard
                    key={p.id}
                    className="flex items-center gap-3 p-3.5"
                    onClick={() => {
                      if (p.type === 'formula') navigate(`/formula?f=${p.ref}`);
                      else if (p.type === 'converter') {
                        const [c, , to2] = p.ref.split(':');
                        navigate(`/converter?cat=${c}&to=${to2}`);
                      }
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(2,245,161,0.08)] text-[var(--accent-highlight)]">
                      <Pin size={15} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.label}</span>
                    <DeleteButton
                      label={t('action.unpin')}
                      onDelete={() => {
                        dispatch({ type: 'pin:remove', id: p.id });
                        toast(t('toast.unpinned'), 'info');
                      }}
                    />
                  </InteractiveCard>
                ))}
              </div>
            </Section>
          )}

          {/* Favorite formulas */}
          {favFormulas.length > 0 && (
            <Section title={t('ws.favorites')}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {favFormulas.map((f) => (
                  <InteractiveCard key={f.id} className="flex items-center gap-3 p-3.5" onClick={() => navigate(`/formula?f=${f.id}`)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                      <Star size={15} fill="currentColor" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name[lang]}</span>
                  </InteractiveCard>
                ))}
                {state.favConverters.map((key) => {
                  const [cId, fId, tId] = key.split(':');
                  const fu = findUnit(cId, fId, state.customUnits[cId] ?? []);
                  const tu = findUnit(cId, tId, state.customUnits[cId] ?? []);
                  const c = getCategory(cId);
                  if (!fu || !tu || !c) return null;
                  return (
                    <InteractiveCard key={key} className="flex items-center gap-3 p-3.5" onClick={() => navigate(`/converter?cat=${cId}&to=${tId}`)}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(153,204,51,0.1)] text-[var(--accent-primary)]">
                        <ArrowLeftRight size={15} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {fu.name[lang]} ← {tu.name[lang]}
                      </span>
                    </InteractiveCard>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Custom formulas & units */}
          {(state.customFormulas.length > 0 || Object.values(state.customUnits).some((l) => l.length > 0)) && (
            <Section title={t('ws.customFormulas')}>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {state.customFormulas.map((f) => (
                  <InteractiveCard key={f.id} className="flex items-center gap-3 p-3.5" onClick={() => navigate(`/formula?f=${f.id}`)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(2,245,161,0.08)] text-[var(--accent-highlight)]">
                      <SquareFunction size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.name[lang]}</span>
                      <span className="tnum block truncate text-xs text-[var(--text-tertiary)]" dir="ltr" style={{ textAlign: 'start' }}>
                        {f.expr}
                      </span>
                    </span>
                    <DeleteButton
                      onDelete={() => {
                        dispatch({ type: 'customFormula:remove', id: f.id });
                        toast(t('toast.deleted'), 'info');
                      }}
                    />
                  </InteractiveCard>
                ))}
                {Object.entries(state.customUnits).flatMap(([catId, list]) =>
                  list.map((u) => (
                    <Card key={u.id} className="flex items-center gap-3 p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(2,245,161,0.08)] text-[var(--accent-highlight)]">
                        <Ruler size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{u.name[lang]}</span>
                        <span className="block truncate text-xs text-[var(--text-tertiary)]">{getCategory(catId)?.name[lang]}</span>
                      </span>
                      <DeleteButton
                        onDelete={() => {
                          dispatch({ type: 'customUnit:remove', cat: catId, id: u.id });
                          toast(t('toast.deleted'), 'info');
                        }}
                      />
                    </Card>
                  )),
                )}
              </div>
            </Section>
          )}

          {/* Timeline */}
          {state.history.length > 0 && (
            <Section
              title={t('ws.timeline')}
              action={
                <Btn size="sm" variant="ghost" onClick={() => setConfirmClearHistory(true)}>
                  {t('action.clear')}
                </Btn>
              }
            >
              {confirmClearHistory && (
                <div className="mb-3 rounded-[var(--r-input)] border border-[rgba(245,86,74,0.3)] bg-[rgba(245,86,74,0.06)] p-3.5">
                  <p className="mb-3 text-sm leading-6 text-[var(--error)]">{t('ws.clearHistoryConfirm')}</p>
                  <div className="flex gap-2">
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        dispatch({ type: 'history:clear' });
                        setConfirmClearHistory(false);
                        toast(t('toast.deleted'), 'info');
                      }}
                    >
                      {t('action.clear')}
                    </Btn>
                    <Btn size="sm" onClick={() => setConfirmClearHistory(false)}>
                      {t('action.cancel')}
                    </Btn>
                  </div>
                </div>
              )}
              <Card className="divide-y divide-[var(--border-subtle)]">
                {state.history.slice(0, 30).map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(233,242,239,0.05)] text-[var(--text-secondary)]">
                      {h.kind === 'calculator' ? <Calculator size={14} /> : h.kind === 'formula' ? <SquareFunction size={14} /> : <ArrowLeftRight size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="tnum block truncate text-[13px] text-[var(--text-secondary)]" dir="ltr" style={{ textAlign: 'start' }}>
                        {h.label}
                      </span>
                      <span className="tnum block truncate text-sm font-bold text-[var(--accent-primary)]" dir="ltr" style={{ textAlign: 'start' }}>
                        {h.result}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                      <Clock size={11} />
                      {timeAgo(h.ts, lang)}
                    </span>
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </Page>
  );
}
