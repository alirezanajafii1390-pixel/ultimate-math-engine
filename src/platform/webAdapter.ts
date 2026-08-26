import type { PlatformAdapter } from './types';

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 } as const;

/** The Web platform adapter. Every method is a safe, inert no-op; every
 *  "is supported" flag is false. This is the default Math Engine runs on,
 *  and it must stay fully self-contained — no Telegram package is
 *  imported by this file, directly or transitively. */
export const webAdapter: PlatformAdapter = {
  isTelegram: false,

  theme: {
    colorScheme: undefined,
    onChange() {
      return () => {};
    },
  },

  viewport: {
    safeAreaInsets: ZERO_INSETS,
    contentSafeAreaInsets: ZERO_INSETS,
    onChange() {
      return () => {};
    },
  },

  backButton: {
    isSupported: false,
    show() {},
    hide() {},
    onClick() {
      return () => {};
    },
  },

  mainButton: {
    isSupported: false,
    show() {},
    hide() {},
    onClick() {
      return () => {};
    },
  },

  haptics: {
    isSupported: false,
    impact() {},
    notification() {},
    selectionChanged() {},
  },

  initData: {
    raw: null,
    user: null,
    startParam: null,
  },

  fullscreen: {
    isSupported: false,
    isFullscreen: false,
    async request() {},
    async exit() {},
  },

  cloudStorage: {
    isAvailable: false,
    async get() {
      return null;
    },
    async set() {
      return false;
    },
    async remove() {
      return false;
    },
  },

  share: {
    isSupported: false,
    async shareURL() {
      return false;
    },
  },

  ready() {},
};
