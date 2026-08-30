/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — modules/settings
   Settings only. No tools, no dev features.
   Developer Mode: hidden entry (tap version ×7).
   ═══════════════════════════════════════════════════════════ */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, Upload, RotateCcw, Info, Sigma } from 'lucide-react';
import { useStore, resolveTheme, type ThemePreference } from '../../core/store';
import { useT, type Language } from '../../core/i18n';
import { storage } from '../../core/storage';
import { bus } from '../../core/events';
import { usePlatform } from '../../platform/PlatformContext';
import { Page, PageHeader, Section, Card, SettingRow, Segmented, Toggle, Btn, useToast } from '../../ui/kit';

export default function SettingsPage() {
  const { state, dispatch } = useStore();
  const t = useT();
  const navigate = useNavigate();
  const platform = usePlatform();
  const telegramColorScheme = platform.theme.colorScheme;
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [versionTaps, setVersionTaps] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const s = state.settings;

  const exportBackup = () => {
    const dump = {
      app: 'math-engine',
      schema: 1,
      exportedAt: new Date().toISOString(),
      data: storage.exportAll(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-engine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('settings.backupDone'));
    bus.emit('backup:export');
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed?.data ?? parsed;
        if (typeof data !== 'object' || data === null) throw new Error('invalid');
        const { applied } = storage.importAll(data as Record<string, unknown>);
        if (applied === 0) throw new Error('empty');
        toast(t('settings.importDone'));
        bus.emit('backup:import', { applied });
        setTimeout(() => window.location.reload(), 700);
      } catch {
        toast(t('settings.importFail'), 'err');
      }
    };
    reader.readAsText(file);
  };

  const tapVersion = () => {
    if (s.devMode) return;
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next >= 7) {
      dispatch({ type: 'settings', patch: { devMode: true } });
      toast(t('settings.devUnlocked'), 'info');
      bus.emit('dev:unlocked');
      setVersionTaps(0);
    }
  };

  return (
    <Page>
      <PageHeader title={t('settings.title')} />

      {/* ── Appearance ── */}
      <Section title={t('settings.appearance')}>
        <Card>
          <div className="px-5 py-4">
            <p className="mb-2.5 text-[15px] font-medium">{t('settings.theme')}</p>
            <Segmented<ThemePreference>
              options={[
                { value: 'system', label: t('settings.theme.system') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
              ]}
              value={s.theme}
              onChange={(v) => dispatch({ type: 'settings', patch: { theme: v } })}
            />
            {s.theme === 'system' && (
              <p className="mt-2.5 text-xs text-[var(--text-tertiary)]">
                {t('settings.theme.systemHint')} {t(resolveTheme('system', telegramColorScheme) === 'dark' ? 'settings.theme.dark' : 'settings.theme.light')}
              </p>
            )}
          </div>
        </Card>
      </Section>

      {/* ── General ── */}
      <Section title={t('settings.general')}>
        <Card className="divide-y divide-[var(--border-subtle)]">
          <SettingRow
            title={t('settings.language')}
            control={
              <Segmented<Language>
                options={[
                  { value: 'fa', label: 'فارسی' },
                  { value: 'en', label: 'English' },
                ]}
                value={s.language}
                onChange={(v) => dispatch({ type: 'settings', patch: { language: v } })}
              />
            }
          />
          <SettingRow
            title={t('settings.angleMode')}
            control={
              <Segmented
                options={[
                  { value: 'deg', label: t('calc.deg') },
                  { value: 'rad', label: t('calc.rad') },
                ]}
                value={s.angleMode}
                onChange={(v) => dispatch({ type: 'settings', patch: { angleMode: v } })}
              />
            }
          />
          <div className="px-5 py-4">
            <p className="text-[15px] font-medium">{t('settings.displayName')}</p>
            <p className="mb-2.5 mt-0.5 text-xs text-[var(--text-tertiary)]">{t('settings.displayNameHint')}</p>
            <input
              className="me-input"
              value={s.displayName}
              maxLength={24}
              placeholder="…"
              aria-label={t('settings.displayName')}
              onChange={(e) => dispatch({ type: 'settings', patch: { displayName: e.target.value } })}
            />
          </div>
        </Card>
      </Section>

      {/* ── Telegram (only inside the Mini App) ── */}
      {platform.isTelegram && (
        <Section title={t('settings.telegram')}>
          <Card className="divide-y divide-[var(--border-subtle)]">
            <SettingRow
              title={t('settings.telegram.haptics')}
              hint={t('settings.telegram.hapticsHint')}
              control={
                <Toggle
                  checked={s.hapticsEnabled}
                  onChange={(v) => dispatch({ type: 'settings', patch: { hapticsEnabled: v } })}
                  label={t('settings.telegram.haptics')}
                />
              }
            />
          </Card>
        </Section>
      )}

      {/* ── Backup ── */}
      <Section title={t('settings.backup')}>
        <Card className="flex flex-col gap-2.5 p-4">
          <div className="flex gap-2.5">
            <Btn className="flex-1" onClick={exportBackup}>
              <Download size={16} />
              {t('settings.exportData')}
            </Btn>
            <Btn className="flex-1" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              {t('settings.importData')}
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
                e.target.value = '';
              }}
            />
          </div>
          {confirmReset ? (
            <div className="rounded-[var(--r-input)] border border-[rgba(245,86,74,0.3)] bg-[rgba(245,86,74,0.06)] p-3.5">
              <p className="mb-3 text-sm leading-6 text-[var(--error)]">{t('settings.resetConfirm')}</p>
              <div className="flex gap-2">
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    storage.clearAll();
                    window.location.reload();
                  }}
                >
                  {t('action.reset')}
                </Btn>
                <Btn size="sm" onClick={() => setConfirmReset(false)}>
                  {t('action.cancel')}
                </Btn>
              </div>
            </div>
          ) : (
            <Btn variant="ghost" className="self-start text-[var(--error)]" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} />
              {t('settings.resetAll')}
            </Btn>
          )}
        </Card>
      </Section>

      {/* ── About ── */}
      <Section title={t('settings.about')}>
        <Card className="flex items-center gap-4 p-5">
          <button
            onClick={tapVersion}
            className="press focus-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#99cc33] to-[#5f8f1f] text-[#0a1a10] shadow-[0_4px_16px_rgba(153,204,51,0.3)]"
            aria-label="version"
          >
            <Sigma size={26} strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">Math Engine</p>
            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{t('settings.version')} 1.0.0</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">{t('settings.credit')}</p>
            {!s.devMode && versionTaps >= 3 && (
              <p className="mt-1 text-[11px] text-[var(--accent-primary)]">
                {7 - versionTaps} {t('settings.devTaps')}
              </p>
            )}
            {s.devMode && (
              <button onClick={() => navigate('/developer')} className="press focus-ring mt-1 text-[11px] font-semibold text-[var(--accent-highlight)] underline underline-offset-2">
                {t('nav.developer')} ✓
              </button>
            )}
          </div>
          <Info size={16} className="shrink-0 text-[var(--text-tertiary)]" />
        </Card>
      </Section>
    </Page>
  );
}
