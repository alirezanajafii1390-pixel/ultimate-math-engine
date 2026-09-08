import { usePlatform } from '../platform/PlatformContext';
import { useStore } from './store';

export interface Haptics {
  /** Generic key/button press — the lightest tick. */
  tap(): void;
  /** Pin, favorite, tab switch — a toggle-style state change. */
  toggle(): void;
  /** A calculation/conversion completed successfully. */
  success(): void;
  /** A calculation/conversion failed (invalid input, etc). */
  error(): void;
  /** A destructive action — deleting something. Distinct from `error`:
   *  this isn't a failure, it's a deliberate "this is permanent" cue. */
  destructive(): void;
}

/** Respects Settings' hapticsEnabled toggle automatically — callers never
 *  need to check it themselves. No-op everywhere on Web (platform.haptics
 *  is already inert there), so this is always safe to call unconditionally. */
export function useHaptics(): Haptics {
  const platform = usePlatform();
  const { state } = useStore();
  const enabled = state.settings.hapticsEnabled;
  return {
    tap() {
      if (enabled) platform.haptics.impact('light');
    },
    toggle() {
      if (enabled) platform.haptics.selectionChanged();
    },
    success() {
      if (enabled) platform.haptics.impact('medium');
    },
    error() {
      if (enabled) platform.haptics.notification('error');
    },
    destructive() {
      if (enabled) platform.haptics.notification('warning');
    },
  };
}
