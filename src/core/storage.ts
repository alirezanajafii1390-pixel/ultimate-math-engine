/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — core/storage
   Platform-independent Storage Service (Web adapter: localStorage)
   Versioned keys • Atomic-ish writes • Validation on read
   Cross-platform rule: features never touch localStorage directly.
   ═══════════════════════════════════════════════════════════ */

export const STORAGE_VERSION = 1;
const PREFIX = `mathengine:v${STORAGE_VERSION}:`;

export function fullKey(key: string): string {
  return PREFIX + key;
}

/* ── Migrations ─────────────────────────────────────────────
 * STORAGE_VERSION and the key prefix were wired together from day
 * one, but until now nothing actually walked data from an older
 * prefix forward — a version bump would have silently orphaned
 * every existing user's data under the old prefix instead of
 * migrating it. This fixes that, ahead of it ever being needed.
 *
 * `mathengine:storage-version` is deliberately UNPREFIXED so it
 * survives a prefix change and can tell us what version the data
 * we find was actually written by.
 *
 * To add a migration when bumping STORAGE_VERSION:
 *   1. Bump STORAGE_VERSION above.
 *   2. Add an entry here keyed by the OLD version, transforming a
 *      slice dump from the old shape to the new one.
 *   3. Leave old entries in place — a user could be jumping several
 *      versions at once, and each step only needs to know about the
 *      version directly before it.
 */
const VERSION_MARKER = 'mathengine:storage-version';

type Migration = (dump: Record<string, unknown>) => Record<string, unknown>;

/** Keyed by the version being migrated FROM. Empty for now: Math Engine
 *  launched at v1, so there is nothing earlier to migrate. */
const MIGRATIONS: Record<number, Migration> = {};

function keysWithPrefix(prefix: string): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch {
    /* noop */
  }
  return out;
}

/** Runs once at startup, before anything else reads storage. No-op on a
 *  fresh install or when the stored version already matches current. */
export function runMigrations(): void {
  let fromVersion: number;
  try {
    const raw = localStorage.getItem(VERSION_MARKER);
    if (raw === null) {
      // No marker: either a fresh install (nothing to migrate) or data
      // written before this mechanism existed. Since Math Engine's first
      // shipped version IS v1, there is no earlier real data in either
      // case — just plant the marker and move on.
      localStorage.setItem(VERSION_MARKER, String(STORAGE_VERSION));
      return;
    }
    fromVersion = Number(raw);
    if (!Number.isFinite(fromVersion) || fromVersion >= STORAGE_VERSION) return;
  } catch {
    return; // localStorage unavailable — nothing we can safely do here
  }

  for (let v = fromVersion; v < STORAGE_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    const oldPrefix = `mathengine:v${v}:`;
    const newPrefix = `mathengine:v${v + 1}:`;
    const oldKeys = keysWithPrefix(oldPrefix);
    for (const oldKey of oldKeys) {
      try {
        const raw = localStorage.getItem(oldKey);
        if (raw === null) continue;
        let value: unknown = JSON.parse(raw);
        if (migrate) {
          const wrapped = migrate({ [oldKey.slice(oldPrefix.length)]: value });
          value = wrapped[oldKey.slice(oldPrefix.length)];
        }
        localStorage.setItem(newPrefix + oldKey.slice(oldPrefix.length), JSON.stringify(value));
        localStorage.removeItem(oldKey);
      } catch (e) {
        console.warn('[Storage] migration skipped for key:', oldKey, e);
      }
    }
  }
  try {
    localStorage.setItem(VERSION_MARKER, String(STORAGE_VERSION));
  } catch {
    /* noop */
  }
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(fullKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted entry → recover with fallback (Zero Silent Failure: log)
      console.warn('[Storage] corrupted key, recovered:', key);
      return fallback;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(fullKey(key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Storage] write failed:', key, e);
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(fullKey(key));
    } catch {
      /* noop */
    }
  },

  keys(): string[] {
    const out: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
      }
    } catch {
      /* noop */
    }
    return out;
  },

  /** Approximate bytes used by Math Engine entries */
  bytesUsed(): number {
    let total = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          total += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
        }
      }
    } catch {
      /* noop */
    }
    return total;
  },

  clearAll(): void {
    for (const k of this.keys()) this.remove(k);
  },

  /** Export everything as a backup object (Safe Export) */
  exportAll(): Record<string, unknown> {
    const dump: Record<string, unknown> = {};
    for (const k of this.keys()) {
      try {
        dump[k] = JSON.parse(localStorage.getItem(fullKey(k)) ?? 'null');
      } catch {
        /* skip corrupted */
      }
    }
    return dump;
  },

  /** Validated import (Safe Import: parse → validate → apply) */
  importAll(dump: Record<string, unknown>): { applied: number; skipped: number } {
    let applied = 0;
    let skipped = 0;
    for (const [k, v] of Object.entries(dump)) {
      if (!/^[a-z0-9_.:-]+$/i.test(k) || k.length > 64) {
        skipped++;
        continue;
      }
      try {
        localStorage.setItem(fullKey(k), JSON.stringify(v));
        applied++;
      } catch {
        skipped++;
      }
    }
    return { applied, skipped };
  },
};
