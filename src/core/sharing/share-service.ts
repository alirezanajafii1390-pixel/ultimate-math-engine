import { useCallback, useRef, useState } from 'react';
import { usePlatform } from '../../platform/PlatformContext';
import { useT } from '../i18n';
import { useToast } from '../../ui/kit';
import { formatShareText } from './share-formatter';
import type { ShareData, ShareOutcome, ShareRequest } from './types';

export interface UseShareService {
  /** True while a share is in flight — use to disable/spin the button and
   *  ignore duplicate taps. Pages don't need their own pending state. */
  pending: boolean;
  /** Formats `data` and sends it via the best available method for the
   *  current platform, showing a success/failure toast itself. Ignored if
   *  a share is already pending (duplicate-tap guard). */
  share(data: ShareData, deepLink?: string): Promise<ShareOutcome>;
}

export function useShareService(): UseShareService {
  const platform = usePlatform();
  const t = useT();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  // A ref, not the `pending` state above, guards against duplicate taps:
  // setState is batched/async, so two taps close enough together could
  // both read the same stale `pending === false` before the first one's
  // update commits. A ref updates synchronously, so the second call sees
  // the first one's guard immediately.
  const inFlightRef = useRef(false);

  const share = useCallback(
    async (data: ShareData, deepLink?: string): Promise<ShareOutcome> => {
      if (inFlightRef.current) return { method: 'none', success: false };
      inFlightRef.current = true;
      setPending(true);
      try {
        const request: ShareRequest = { data, deepLink };
        const text = formatShareText(request.data, t);

        // Telegram's native picker (shareURL) needs an actual URL — we
        // only reach for it once a deep link exists (not yet populated by
        // any page; see types.ts). Until then, Telegram falls through to
        // Web Share below, same as outside Telegram — still a proper
        // native share sheet, just not Telegram's own in-chat picker.
        if (platform.isTelegram && request.deepLink && platform.share.isSupported) {
          const ok = await platform.share.shareURL(request.deepLink, text);
          if (ok) {
            toast(t('share.success'));
            return { method: 'telegram', success: true };
          }
          // Falls through to Web Share / clipboard below on failure —
          // never leaves the user without a way to share.
        }

        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({ text });
            toast(t('share.success'));
            return { method: 'web-share', success: true };
          } catch {
            // User canceled the OS share sheet, or it's unsupported
            // despite the capability check — fall through to clipboard.
          }
        }

        try {
          await navigator.clipboard.writeText(text);
          toast(t('share.copiedFallback'));
          return { method: 'clipboard', success: true };
        } catch {
          toast(t('share.failed'), 'err');
          return { method: 'clipboard', success: false };
        }
      } finally {
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [platform, t, toast],
  );

  return { pending, share };
}
