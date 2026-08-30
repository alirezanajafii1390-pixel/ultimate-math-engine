import { describe, test, expect } from 'vitest';
import { UNIT_CATEGORIES, getCategory, convertValue, findUnit, findUnitContext, type UnitDef } from './units';

describe('units — temperature (non-linear)', () => {
  const temp = getCategory('temperature')!;
  test('Celsius <-> Fahrenheit', () => {
    expect(convertValue(temp, 'c', 'f', 0)).toBe(32);
    expect(convertValue(temp, 'c', 'f', 100)).toBe(212);
    expect(convertValue(temp, 'f', 'c', 32)).toBe(0);
  });
  test('Celsius <-> Kelvin', () => {
    expect(convertValue(temp, 'c', 'k', 0)).toBeCloseTo(273.15, 9);
    expect(convertValue(temp, 'k', 'c', 273.15)).toBeCloseTo(0, 9);
  });
});

describe('units — linear categories, spot checks', () => {
  test('length', () => {
    const length = getCategory('length')!;
    expect(convertValue(length, 'km', 'm', 1)).toBe(1000);
    expect(convertValue(length, 'm', 'cm', 1)).toBe(100);
  });
  test('mass', () => {
    const mass = getCategory('mass')!;
    expect(convertValue(mass, 'kg', 'lb', 1)).toBeCloseTo(2.2046226218, 6);
  });
  test('data (binary/1024-based)', () => {
    const data = getCategory('data')!;
    expect(convertValue(data, 'gb', 'mb', 1)).toBe(1024);
    expect(convertValue(data, 'bit', 'b', 8)).toBe(1);
  });
  test('energy', () => {
    const energy = getCategory('energy')!;
    expect(convertValue(energy, 'kcal', 'j', 1)).toBeCloseTo(4184, 6);
  });
  test('angle', () => {
    const angle = getCategory('angle')!;
    expect(convertValue(angle, 'deg', 'rad', 180)).toBeCloseTo(Math.PI, 9);
    expect(convertValue(angle, 'turn', 'deg', 1)).toBe(360);
  });
});

describe('units — round-trip identity', () => {
  // For every linear category, converting any unit -> any other unit -> back
  // to the original must return the original value. Catches typo'd factors
  // (a single wrong digit in one direction wouldn't show up as a crash, only
  // as a silently wrong number — this test would catch that).
  const linearCategories = UNIT_CATEGORIES.filter((c) => c.id !== 'temperature');

  for (const cat of linearCategories) {
    test(`${cat.id}: every unit pair round-trips`, () => {
      const v = 3.14159;
      for (const a of cat.units) {
        for (const b of cat.units) {
          const forward = convertValue(cat, a.id, b.id, v);
          const back = convertValue(cat, b.id, a.id, forward);
          expect(back).toBeCloseTo(v, 6);
        }
      }
    });
  }
});

describe('units — custom units', () => {
  const furlong: UnitDef = { id: 'furlong', name: { fa: 'فرلانگ', en: 'Furlong' }, symbol: 'fur', factor: 201.168 };

  test('convertValue accepts a custom unit via the customUnits param', () => {
    const length = getCategory('length')!;
    expect(convertValue(length, 'furlong', 'm', 1, [furlong])).toBeCloseTo(201.168, 9);
  });

  test('findUnit finds a custom unit by id', () => {
    const found = findUnit('length', 'furlong', [furlong]);
    expect(found?.id).toBe('furlong');
  });
});

describe('units — lookup helpers', () => {
  test('findUnitContext matches a unit by its exact symbol', () => {
    const ctx = findUnitContext('°C');
    expect(ctx?.cat.id).toBe('temperature');
    expect(ctx?.unitId).toBe('c');
  });

  test('getCategory returns undefined for an unknown category', () => {
    expect(getCategory('not-a-real-category')).toBeUndefined();
  });

  test('convertValue returns NaN for an unknown unit id rather than throwing', () => {
    const length = getCategory('length')!;
    expect(Number.isNaN(convertValue(length, 'not-a-unit', 'm', 1))).toBe(true);
  });
});

describe('units — data integrity', () => {
  test('no duplicate category ids', () => {
    const ids = UNIT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('no duplicate unit ids within any single category', () => {
    for (const cat of UNIT_CATEGORIES) {
      const ids = cat.units.map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("every category's declared base unit id actually exists in its unit list", () => {
    for (const cat of UNIT_CATEGORIES) {
      expect(cat.units.some((u) => u.id === cat.base)).toBe(true);
    }
  });
});
