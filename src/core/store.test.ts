import { describe, test, expect } from 'vitest';
import { reducer, resolveTheme, DEFAULT_STATE, type AppState, type HistoryEntry, type Pin } from './store';

function historyEntry(i: number): HistoryEntry {
  return { id: `h${i}`, kind: 'calculator', label: `${i}+1`, result: `${i + 1}`, ts: i };
}

function pin(i: number): Pin {
  return { id: `p${i}`, type: 'formula', ref: `formula-${i}`, label: `Formula ${i}`, ts: i };
}

describe('reducer — history', () => {
  test('history:add prepends the new entry (most recent first)', () => {
    const s1 = reducer(DEFAULT_STATE, { type: 'history:add', entry: historyEntry(1) });
    const s2 = reducer(s1, { type: 'history:add', entry: historyEntry(2) });
    expect(s2.history.map((h) => h.id)).toEqual(['h2', 'h1']);
  });

  test('history:add caps the list at 500 entries', () => {
    let s = DEFAULT_STATE;
    for (let i = 0; i < 510; i++) {
      s = reducer(s, { type: 'history:add', entry: historyEntry(i) });
    }
    expect(s.history.length).toBe(500);
    // most recent (i=509) should be first, oldest kept should be i=10
    expect(s.history[0].id).toBe('h509');
    expect(s.history[s.history.length - 1].id).toBe('h10');
  });

  test('history:clear with a kind only removes that kind', () => {
    let s = DEFAULT_STATE;
    s = reducer(s, { type: 'history:add', entry: { ...historyEntry(1), kind: 'calculator' } });
    s = reducer(s, { type: 'history:add', entry: { ...historyEntry(2), kind: 'formula' } });
    s = reducer(s, { type: 'history:clear', kind: 'calculator' });
    expect(s.history.map((h) => h.kind)).toEqual(['formula']);
  });

  test('history:clear with no kind removes everything', () => {
    let s = DEFAULT_STATE;
    s = reducer(s, { type: 'history:add', entry: historyEntry(1) });
    s = reducer(s, { type: 'history:clear' });
    expect(s.history).toEqual([]);
  });
});

describe('reducer — favorites', () => {
  test('fav:formula toggles an id on, then off', () => {
    const s1 = reducer(DEFAULT_STATE, { type: 'fav:formula', id: 'quadratic' });
    expect(s1.favFormulas).toEqual(['quadratic']);
    const s2 = reducer(s1, { type: 'fav:formula', id: 'quadratic' });
    expect(s2.favFormulas).toEqual([]);
  });
});

describe('reducer — pins', () => {
  test('pin:add caps the list at 24', () => {
    let s = DEFAULT_STATE;
    for (let i = 0; i < 30; i++) {
      s = reducer(s, { type: 'pin:add', pin: pin(i) });
    }
    expect(s.pins.length).toBe(24);
  });

  test('pin:add is a no-op if the same ref+type is already pinned', () => {
    let s = DEFAULT_STATE;
    s = reducer(s, { type: 'pin:add', pin: pin(1) });
    const before = s.pins.length;
    s = reducer(s, { type: 'pin:add', pin: { ...pin(1), id: 'a-different-pin-id' } });
    expect(s.pins.length).toBe(before);
  });

  test('pin:remove removes by id', () => {
    let s = DEFAULT_STATE;
    s = reducer(s, { type: 'pin:add', pin: pin(1) });
    s = reducer(s, { type: 'pin:remove', id: 'p1' });
    expect(s.pins).toEqual([]);
  });
});

describe('reducer — custom formulas', () => {
  test('customFormula:add with a new id prepends it', () => {
    const f1 = { id: 'f1', name: { fa: 'a', en: 'a' }, expr: 'x+1', vars: [], cat: 'custom' } as unknown as AppState['customFormulas'][number];
    const s = reducer(DEFAULT_STATE, { type: 'customFormula:add', f: f1 });
    expect(s.customFormulas.map((f) => f.id)).toEqual(['f1']);
  });

  test('customFormula:add with an existing id replaces it (no duplicate)', () => {
    const f1a = { id: 'f1', name: { fa: 'a', en: 'a' }, expr: 'x+1', vars: [], cat: 'custom' } as unknown as AppState['customFormulas'][number];
    const f1b = { id: 'f1', name: { fa: 'b', en: 'b' }, expr: 'x+2', vars: [], cat: 'custom' } as unknown as AppState['customFormulas'][number];
    let s = reducer(DEFAULT_STATE, { type: 'customFormula:add', f: f1a });
    s = reducer(s, { type: 'customFormula:add', f: f1b });
    expect(s.customFormulas.length).toBe(1);
    expect(s.customFormulas[0].expr).toBe('x+2');
  });

  test('customFormula:remove removes by id', () => {
    const f1 = { id: 'f1', name: { fa: 'a', en: 'a' }, expr: 'x+1', vars: [], cat: 'custom' } as unknown as AppState['customFormulas'][number];
    let s = reducer(DEFAULT_STATE, { type: 'customFormula:add', f: f1 });
    s = reducer(s, { type: 'customFormula:remove', id: 'f1' });
    expect(s.customFormulas).toEqual([]);
  });
});

describe('reducer — settings', () => {
  test('settings patch merges into existing settings rather than replacing them', () => {
    const s = reducer(DEFAULT_STATE, { type: 'settings', patch: { angleMode: 'rad' } });
    expect(s.settings.angleMode).toBe('rad');
    // untouched settings keys survive the patch
    expect(s.settings.language).toBe(DEFAULT_STATE.settings.language);
    expect(s.settings.precision).toBe(DEFAULT_STATE.settings.precision);
  });

  test('default theme preference is "system"', () => {
    expect(DEFAULT_STATE.settings.theme).toBe('system');
  });

  test('theme patch updates only the theme field', () => {
    const s = reducer(DEFAULT_STATE, { type: 'settings', patch: { theme: 'light' } });
    expect(s.settings.theme).toBe('light');
    expect(s.settings.language).toBe(DEFAULT_STATE.settings.language);
  });
});

describe('resolveTheme', () => {
  test('an explicit light/dark preference is returned as-is, ignoring the OS', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  test('"system" resolves to a real light/dark value (never returns "system" itself)', () => {
    const resolved = resolveTheme('system');
    expect(resolved === 'light' || resolved === 'dark').toBe(true);
  });
});

describe('reducer — theme overrides (dev-only Theme Editor)', () => {
  test('theme:set adds/updates a single override without touching others', () => {
    let s = reducer(DEFAULT_STATE, { type: 'theme:set', key: '--accent-primary', value: '#ff0000' });
    s = reducer(s, { type: 'theme:set', key: '--bg-primary', value: '#000000' });
    expect(s.themeOverrides).toEqual({ '--accent-primary': '#ff0000', '--bg-primary': '#000000' });
  });

  test('theme:set on an existing key replaces its value', () => {
    let s = reducer(DEFAULT_STATE, { type: 'theme:set', key: '--accent-primary', value: '#ff0000' });
    s = reducer(s, { type: 'theme:set', key: '--accent-primary', value: '#00ff00' });
    expect(s.themeOverrides).toEqual({ '--accent-primary': '#00ff00' });
  });

  test('theme:reset with a key removes only that override', () => {
    let s = reducer(DEFAULT_STATE, { type: 'theme:set', key: '--accent-primary', value: '#ff0000' });
    s = reducer(s, { type: 'theme:set', key: '--bg-primary', value: '#000000' });
    s = reducer(s, { type: 'theme:reset', key: '--accent-primary' });
    expect(s.themeOverrides).toEqual({ '--bg-primary': '#000000' });
  });

  test('theme:reset with no key clears every override', () => {
    let s = reducer(DEFAULT_STATE, { type: 'theme:set', key: '--accent-primary', value: '#ff0000' });
    s = reducer(s, { type: 'theme:set', key: '--bg-primary', value: '#000000' });
    s = reducer(s, { type: 'theme:reset' });
    expect(s.themeOverrides).toEqual({});
  });

  test('theme:reset for a key that has no override is a no-op', () => {
    const s = reducer(DEFAULT_STATE, { type: 'theme:reset', key: '--accent-primary' });
    expect(s).toBe(DEFAULT_STATE);
  });
});

describe('reducer — misc', () => {
  test('reset returns the default state', () => {
    const s1 = reducer(DEFAULT_STATE, { type: 'fav:formula', id: 'x' });
    const s2 = reducer(s1, { type: 'reset' });
    expect(s2).toEqual(DEFAULT_STATE);
  });

  test('an unrecognized action type leaves state unchanged', () => {
    const weird = { type: 'not-a-real-action' } as unknown as Parameters<typeof reducer>[1];
    const s = reducer(DEFAULT_STATE, weird);
    expect(s).toBe(DEFAULT_STATE);
  });
});
