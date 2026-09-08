/* MATH ENGINE — core/events : minimal Event Bus (global events only) */

export type EventHandler = (payload?: unknown) => void;

/** Max entries kept in the bus's internal log — also used by DeveloperPage
 *  for its local buffer so the two caps can never drift apart again. */
export const EVENT_LOG_CAP = 200;

interface BusEntry {
  type: string;
  payload?: unknown;
  ts: number;
}

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private log: BusEntry[] = [];
  private listeners = new Set<(e: BusEntry) => void>();

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(type: string, payload?: unknown): void {
    const entry: BusEntry = { type, payload, ts: Date.now() };
    this.log.push(entry);
    if (this.log.length > EVENT_LOG_CAP) this.log.shift();
    this.listeners.forEach((l) => l(entry));
    this.handlers.get(type)?.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        console.error('[EventBus] handler error:', type, e);
      }
    });
  }

  /** Developer Mode monitor */
  subscribeLog(l: (e: BusEntry) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  getLog(): BusEntry[] {
    return [...this.log];
  }
  clearLog(): void {
    this.log = [];
  }
}

export const bus = new EventBus();
