/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — ui/kit : shared component kit (token-driven)
   Every element earns its place. No decoration without purpose.
   ═══════════════════════════════════════════════════════════ */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { X, Trash2 } from 'lucide-react';
import { useT } from '../core/i18n';
import { useStore } from '../core/store';
import { usePlatform } from '../platform/PlatformContext';

/* ── Page ───────────────────────────────────────────────── */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`page-in mx-auto w-full max-w-3xl px-4 pb-24 pt-6 md:px-8 md:pt-10 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && (
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ── Buttons (48px touch targets, radii frozen) ─────────── */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'md' | 'sm' | 'lg';
}
const btnStyles: Record<BtnVariant, string> = {
  primary:
    'bg-[rgba(14,43,51,0.55)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:border-[var(--border-strong)] backdrop-blur-[var(--blur-glass)]',
  accent:
    'bg-gradient-to-br from-[#99cc33] to-[#7ba828] text-[#0a1a10] font-bold shadow-[0_4px_18px_rgba(153,204,51,0.25)] hover:brightness-110 border border-transparent',
  secondary: 'bg-[rgba(233,242,239,0.05)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[rgba(233,242,239,0.09)]',
  ghost: 'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(233,242,239,0.05)]',
  danger: 'bg-[rgba(245,86,74,0.1)] border border-[rgba(245,86,74,0.2)] text-[var(--error)] hover:bg-[rgba(245,86,74,0.16)]',
};
export function Btn({ variant = 'secondary', size = 'md', className = '', ...rest }: BtnProps) {
  const sizes = { sm: 'h-9 px-3.5 text-sm', md: 'h-12 px-5 text-[15px]', lg: 'h-12 px-6 text-base' };
  return (
    <button
      className={`press focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--r-button)] font-medium disabled:opacity-40 disabled:pointer-events-none ${sizes[size]} ${btnStyles[variant]} ${className}`}
      {...rest}
    />
  );
}

export function IconBtn({ className = '', label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`press focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-button)] border border-[var(--border-subtle)] bg-[rgba(233,242,239,0.04)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] ${className}`}
      {...rest}
    />
  );
}

/* ── Cards ──────────────────────────────────────────────── */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...rest} />;
}
export function InteractiveCard({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card card-hover press cursor-pointer ${className}`} {...rest} />;
}

/* ── Empty State (illustration + short text + CTA) ──────── */
export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r-card)] border border-dashed border-[var(--border-subtle)] px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(153,204,51,0.08)] text-[var(--accent-primary)]">
        {icon}
      </div>
      <p className="text-[15px] font-semibold">{title}</p>
      {hint && <p className="mt-1.5 max-w-xs text-sm leading-6 text-[var(--text-secondary)]">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────── */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`press focus-ring relative h-8 w-[52px] shrink-0 rounded-full border transition-all duration-300 ${
        checked ? 'border-transparent bg-[var(--accent-primary)] shadow-[0_0_14px_rgba(153,204,51,0.55)]' : 'border-[var(--border-strong)] bg-[rgba(233,242,239,0.06)]'
      }`}
    >
      <span
        className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
          checked ? 'start-[22px]' : 'start-[3px]'
        }`}
        style={{ transitionDuration: '420ms', transitionTimingFunction: 'var(--ease-spring)' }}
      />
    </button>
  );
}

/* ── Setting row ────────────────────────────────────────── */
export function SettingRow({ title, hint, control }: { title: string; hint?: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{hint}</p>}
      </div>
      {control}
    </div>
  );
}

/* ── Segmented control ──────────────────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [glider, setGlider] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const measure = useCallback(() => {
    const btn = btnRefs.current.get(value);
    if (btn) setGlider({ left: btn.offsetLeft, top: btn.offsetTop, width: btn.offsetWidth, height: btn.offsetHeight });
  }, [value]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, options]);

  return (
    <div ref={containerRef} className="relative inline-flex max-w-full flex-wrap gap-y-1 rounded-[var(--r-button)] border border-[var(--border-subtle)] bg-[var(--surface-fill)] p-1">
      {glider && (
        <span
          className="glider pointer-events-none absolute rounded-[14px] bg-[rgba(153,204,51,0.16)] shadow-[0_0_0_1px_rgba(153,204,51,0.12),0_0_14px_rgba(153,204,51,0.16)] transition-[left,top,width,height]"
          style={{
            left: glider.left,
            top: glider.top,
            width: glider.width,
            height: glider.height,
            transitionDuration: '420ms',
            transitionTimingFunction: 'var(--ease-spring)',
          }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => {
            if (el) btnRefs.current.set(o.value, el);
          }}
          onClick={() => onChange(o.value)}
          className={`press focus-ring relative z-10 h-9 rounded-[14px] px-4 text-sm font-medium transition-colors ${
            value === o.value ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Delete button ──────────────────────────────────────────
   A small circular icon button that eases open into a labeled pill on
   hover (mouse) or press (touch) instead of firing instantly — meant for
   any inline "remove this item" action (favorites, pins, history rows). */
export function DeleteButton({ onDelete, label, size = 30 }: { onDelete: () => void; label?: string; size?: number }) {
  const t = useT();
  const text = label ?? t('action.delete');
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      aria-label={text}
      className="delete-btn focus-ring"
      style={{ '--del-size': `${size}px` } as CSSProperties}
    >
      <Trash2 className="delete-btn-icon" size={Math.round(size * 0.42)} />
      <span className="delete-btn-label">{text}</span>
    </button>
  );
}

/* ── Sheet ────────────────────────────────────────────────
   variant="bottom" (default): classic bottom sheet.
   variant="top": panel opens from the top of the screen and grows
   downward — used for builders, history, and long lists so the user
   isn't disoriented by content appearing at the very bottom. ────── */
/* ── Modal-open tracking ─────────────────────────────────────
   Lets page-level global keydown listeners (e.g. the calculator's
   full keyboard-shortcut handler) yield while a Sheet is open on
   top of them, instead of mutating state underneath the modal. */
let openSheetCount = 0;
export function isAnyModalOpen(): boolean {
  return openSheetCount > 0;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  children,
  variant = 'bottom',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: 'bottom' | 'top';
}) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // Mount immediately on open; on close, stay mounted just long enough to
  // play the exit animation, then actually unmount. Without this a Sheet
  // simply vanishes the instant `open` goes false — there is no such thing
  // as a CSS exit animation on an element React has already removed.
  useEffect(() => {
    if (open) {
      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-exit').trim();
      const ms = raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : 260;
      exitTimer.current = window.setTimeout(
        () => {
          setRendered(false);
          setClosing(false);
          exitTimer.current = null;
        },
        Number.isFinite(ms) ? ms : 260,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Deliberately depends only on `open` — not on `onClose` (usually a fresh
  // inline arrow function from the caller on every render). Keying the effect
  // to `onClose`'s identity would tear it down and set it back up on every
  // unrelated parent re-render (e.g. each keystroke in a field inside the
  // sheet), which would yank focus back out from under the user mid-typing.
  useEffect(() => {
    if (!open) return;

    openSheetCount++;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog once it's painted — but only if nothing
    // inside it has already claimed focus (e.g. an <input autoFocus> in the
    // sheet's own content), so we don't fight existing autofocus behavior.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      openSheetCount = Math.max(0, openSheetCount - 1);
      // Return focus to whatever opened the sheet, for keyboard/screen-reader users.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!rendered) return null;

  const backdropAnim = closing ? 'backdropOut var(--dur-fast) var(--ease-in) both' : 'backdropIn var(--dur-fast) var(--ease) both';

  if (variant === 'top') {
    const panelAnim = closing ? 'sheetUp var(--dur-exit) var(--ease-in) both' : 'sheetDown var(--dur-med) var(--ease) both';
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center" role="dialog" aria-modal="true">
        <div className="scrim" style={{ animation: backdropAnim }} onClick={onClose} />
        <div
          ref={panelRef}
          tabIndex={-1}
          className="glass-strong relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-b-[var(--r-modal)] p-5 pt-[max(1.25rem,env(safe-area-inset-top))] outline-none md:mt-6 md:max-h-[80dvh] md:rounded-[var(--r-modal)] md:p-6"
          style={{ animation: panelAnim }}
        >
          <div className="mb-4 flex items-center justify-between">
            {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
            <IconBtn label={t('action.close')} onClick={onClose} className="h-9 w-9 border-0 bg-transparent">
              <X size={18} />
            </IconBtn>
          </div>
          {children}
        </div>
      </div>
    );
  }

  const panelAnim = closing ? 'popOut var(--dur-exit) var(--ease-in) both' : 'popIn var(--dur-med) var(--ease) both';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
      <div className="scrim" style={{ animation: backdropAnim }} onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="glass-strong relative z-10 max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--r-modal)] p-5 outline-none md:rounded-[var(--r-modal)] md:p-6"
        style={{ animation: panelAnim }}
      >
        <div className="mb-4 flex items-center justify-between">
          {title ? <h3 className="text-lg font-bold">{title}</h3> : <span />}
          <IconBtn label={t('action.close')} onClick={onClose} className="h-9 w-9 border-0 bg-transparent">
            <X size={18} />
          </IconBtn>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Toasts (quiet, from bottom) ────────────────────────── */
interface ToastItem {
  id: number;
  text: string;
  tone?: 'ok' | 'err' | 'info';
}
const ToastCtx = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<(ToastItem & { leaving?: boolean })[]>([]);
  const idRef = useRef(0);
  const push = useCallback((text: string, tone: ToastItem['tone'] = 'ok') => {
    const id = ++idRef.current;
    setItems((s) => [...s.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setItems((s) => s.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 220);
    }, 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 md:bottom-8">
        {items.map((t) => (
          <div
            key={t.id}
            className="glass-strong relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-[var(--shadow-2)]"
            style={{ animation: t.leaving ? 'fadeDown 200ms var(--ease-in) both' : 'fadeUp var(--dur-med) var(--ease) both' }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: t.tone === 'err' ? 'var(--error)' : t.tone === 'info' ? 'var(--accent-primary)' : 'var(--success)' }}
            />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Calculator key ─────────────────────────────────────────
   Press feedback is driven explicitly by pointer events (not just
   CSS :active) so the "pressed" look always clears the instant the
   finger lifts or leaves the button — it never stays lit. ───────── */
export function Key({
  onPress,
  className = '',
  children,
  ariaLabel,
  haptic = true,
}: {
  onPress: () => void;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  /** Set to false when `onPress` already triggers its own, more specific
   *  haptic (e.g. equals, clear) — avoids firing the generic light tap
   *  right before it. Defaults to true for every ordinary key. */
  haptic?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [pings, setPings] = useState<number[]>([]);
  const firedRef = useRef(false);
  const pingIdRef = useRef(0);
  const platform = usePlatform();
  const { state } = useStore();
  const hapticsEnabled = state.settings.hapticsEnabled;

  const release = () => setActive(false);
  const ping = () => {
    const id = ++pingIdRef.current;
    setPings((p) => [...p, id]);
    window.setTimeout(() => setPings((p) => p.filter((x) => x !== id)), 450);
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`key press focus-ring ${active ? 'key-active' : ''} ${className}`}
      onPointerDown={() => {
        firedRef.current = false;
        setActive(true);
        ping();
      }}
      onPointerUp={() => {
        release();
        if (!firedRef.current) {
          firedRef.current = true;
          if (haptic && hapticsEnabled) platform.haptics.impact('light');
          onPress();
        }
      }}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={(e) => {
        // Fallback for environments without pointer events (rare); avoid double-fire.
        if (!firedRef.current) {
          firedRef.current = true;
          ping();
          if (haptic && hapticsEnabled) platform.haptics.impact('light');
          onPress();
        }
        e.preventDefault();
      }}
    >
      {pings.map((id) => (
        <span key={id} className="key-ping" aria-hidden="true" />
      ))}
      {children}
    </button>
  );
}

/* ── Copy helper ────────────────────────────────────────── */
export function CopyBtn({ text, className = '' }: { text: string; className?: string }) {
  const t = useT();
  const toast = useToast();
  return (
    <Btn
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast(t('action.copied'));
        } catch {
          toast(t('error.generic'), 'err');
        }
      }}
    >
      {t('action.copy')}
    </Btn>
  );
}
