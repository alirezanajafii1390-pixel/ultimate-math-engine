/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — core/units : Unit data + conversion engine
   Data-driven: units are data, not logic. New unit = new entry.
   ═══════════════════════════════════════════════════════════ */

export interface UnitDef {
  id: string;
  name: { fa: string; en: string };
  symbol: string;
  /** factor: value in base unit = value × factor (linear units) */
  factor?: number;
  /** non-linear conversions (temperature) */
  toBase?: (v: number) => number;
  fromBase?: (v: number) => number;
  custom?: boolean;
}

export interface UnitCategory {
  id: string;
  name: { fa: string; en: string };
  base: string; // base unit id
  units: UnitDef[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: { fa: 'طول', en: 'Length' },
    base: 'm',
    units: [
      { id: 'mm', name: { fa: 'میلی‌متر', en: 'Millimeter' }, symbol: 'mm', factor: 0.001 },
      { id: 'cm', name: { fa: 'سانتی‌متر', en: 'Centimeter' }, symbol: 'cm', factor: 0.01 },
      { id: 'm', name: { fa: 'متر', en: 'Meter' }, symbol: 'm', factor: 1 },
      { id: 'km', name: { fa: 'کیلومتر', en: 'Kilometer' }, symbol: 'km', factor: 1000 },
      { id: 'in', name: { fa: 'اینچ', en: 'Inch' }, symbol: 'in', factor: 0.0254 },
      { id: 'ft', name: { fa: 'فوت', en: 'Foot' }, symbol: 'ft', factor: 0.3048 },
      { id: 'yd', name: { fa: 'یارد', en: 'Yard' }, symbol: 'yd', factor: 0.9144 },
      { id: 'mi', name: { fa: 'مایل', en: 'Mile' }, symbol: 'mi', factor: 1609.344 },
      { id: 'nmi', name: { fa: 'مایل دریایی', en: 'Nautical Mile' }, symbol: 'nmi', factor: 1852 },
    ],
  },
  {
    id: 'mass',
    name: { fa: 'جرم', en: 'Mass' },
    base: 'kg',
    units: [
      { id: 'mg', name: { fa: 'میلی‌گرم', en: 'Milligram' }, symbol: 'mg', factor: 1e-6 },
      { id: 'g', name: { fa: 'گرم', en: 'Gram' }, symbol: 'g', factor: 0.001 },
      { id: 'kg', name: { fa: 'کیلوگرم', en: 'Kilogram' }, symbol: 'kg', factor: 1 },
      { id: 't', name: { fa: 'تن', en: 'Tonne' }, symbol: 't', factor: 1000 },
      { id: 'oz', name: { fa: 'اونس', en: 'Ounce' }, symbol: 'oz', factor: 0.028349523125 },
      { id: 'lb', name: { fa: 'پوند', en: 'Pound' }, symbol: 'lb', factor: 0.45359237 },
      { id: 'st', name: { fa: 'استون', en: 'Stone' }, symbol: 'st', factor: 6.35029318 },
    ],
  },
  {
    id: 'temperature',
    name: { fa: 'دما', en: 'Temperature' },
    base: 'c',
    units: [
      { id: 'c', name: { fa: 'سلسیوس', en: 'Celsius' }, symbol: '°C', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', name: { fa: 'فارنهایت', en: 'Fahrenheit' }, symbol: '°F', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', name: { fa: 'کلوین', en: 'Kelvin' }, symbol: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    name: { fa: 'مساحت', en: 'Area' },
    base: 'm2',
    units: [
      { id: 'mm2', name: { fa: 'میلی‌متر مربع', en: 'Square Millimeter' }, symbol: 'mm²', factor: 1e-6 },
      { id: 'cm2', name: { fa: 'سانتی‌متر مربع', en: 'Square Centimeter' }, symbol: 'cm²', factor: 1e-4 },
      { id: 'm2', name: { fa: 'متر مربع', en: 'Square Meter' }, symbol: 'm²', factor: 1 },
      { id: 'ha', name: { fa: 'هکتار', en: 'Hectare' }, symbol: 'ha', factor: 10000 },
      { id: 'km2', name: { fa: 'کیلومتر مربع', en: 'Square Kilometer' }, symbol: 'km²', factor: 1e6 },
      { id: 'ft2', name: { fa: 'فوت مربع', en: 'Square Foot' }, symbol: 'ft²', factor: 0.09290304 },
      { id: 'ac', name: { fa: 'جریب (ایکر)', en: 'Acre' }, symbol: 'ac', factor: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    name: { fa: 'حجم', en: 'Volume' },
    base: 'l',
    units: [
      { id: 'ml', name: { fa: 'میلی‌لیتر', en: 'Milliliter' }, symbol: 'mL', factor: 0.001 },
      { id: 'l', name: { fa: 'لیتر', en: 'Liter' }, symbol: 'L', factor: 1 },
      { id: 'm3', name: { fa: 'متر مکعب', en: 'Cubic Meter' }, symbol: 'm³', factor: 1000 },
      { id: 'cm3', name: { fa: 'سانتی‌متر مکعب', en: 'Cubic Centimeter' }, symbol: 'cm³', factor: 0.001 },
      { id: 'ft3', name: { fa: 'فوت مکعب', en: 'Cubic Foot' }, symbol: 'ft³', factor: 28.316846592 },
      { id: 'gal', name: { fa: 'گالن (آمریکا)', en: 'Gallon (US)' }, symbol: 'gal', factor: 3.785411784 },
      { id: 'cup', name: { fa: 'پیمانه', en: 'Cup' }, symbol: 'cup', factor: 0.2365882365 },
    ],
  },
  {
    id: 'speed',
    name: { fa: 'سرعت', en: 'Speed' },
    base: 'ms',
    units: [
      { id: 'ms', name: { fa: 'متر بر ثانیه', en: 'Meter/Second' }, symbol: 'm/s', factor: 1 },
      { id: 'kmh', name: { fa: 'کیلومتر بر ساعت', en: 'Kilometer/Hour' }, symbol: 'km/h', factor: 1 / 3.6 },
      { id: 'mph', name: { fa: 'مایل بر ساعت', en: 'Mile/Hour' }, symbol: 'mph', factor: 0.44704 },
      { id: 'kn', name: { fa: 'گره', en: 'Knot' }, symbol: 'kn', factor: 0.514444444 },
    ],
  },
  {
    id: 'time',
    name: { fa: 'زمان', en: 'Time' },
    base: 's',
    units: [
      { id: 'ms2', name: { fa: 'میلی‌ثانیه', en: 'Millisecond' }, symbol: 'ms', factor: 0.001 },
      { id: 's', name: { fa: 'ثانیه', en: 'Second' }, symbol: 's', factor: 1 },
      { id: 'min', name: { fa: 'دقیقه', en: 'Minute' }, symbol: 'min', factor: 60 },
      { id: 'h', name: { fa: 'ساعت', en: 'Hour' }, symbol: 'h', factor: 3600 },
      { id: 'day', name: { fa: 'روز', en: 'Day' }, symbol: 'd', factor: 86400 },
      { id: 'week', name: { fa: 'هفته', en: 'Week' }, symbol: 'wk', factor: 604800 },
      { id: 'year', name: { fa: 'سال', en: 'Year' }, symbol: 'yr', factor: 31557600 },
    ],
  },
  {
    id: 'data',
    name: { fa: 'داده', en: 'Data' },
    base: 'b',
    units: [
      { id: 'b', name: { fa: 'بایت', en: 'Byte' }, symbol: 'B', factor: 1 },
      { id: 'kb', name: { fa: 'کیلوبایت', en: 'Kilobyte' }, symbol: 'KB', factor: 1024 },
      { id: 'mb', name: { fa: 'مگابایت', en: 'Megabyte' }, symbol: 'MB', factor: 1024 ** 2 },
      { id: 'gb', name: { fa: 'گیگابایت', en: 'Gigabyte' }, symbol: 'GB', factor: 1024 ** 3 },
      { id: 'tb', name: { fa: 'ترابایت', en: 'Terabyte' }, symbol: 'TB', factor: 1024 ** 4 },
      { id: 'bit', name: { fa: 'بیت', en: 'Bit' }, symbol: 'bit', factor: 0.125 },
    ],
  },
  {
    id: 'pressure',
    name: { fa: 'فشار', en: 'Pressure' },
    base: 'pa',
    units: [
      { id: 'pa', name: { fa: 'پاسکال', en: 'Pascal' }, symbol: 'Pa', factor: 1 },
      { id: 'kpa', name: { fa: 'کیلوپاسکال', en: 'Kilopascal' }, symbol: 'kPa', factor: 1000 },
      { id: 'bar', name: { fa: 'بار', en: 'Bar' }, symbol: 'bar', factor: 100000 },
      { id: 'atm', name: { fa: 'اتمسفر', en: 'Atmosphere' }, symbol: 'atm', factor: 101325 },
      { id: 'psi', name: { fa: 'psi', en: 'PSI' }, symbol: 'psi', factor: 6894.757293168 },
      { id: 'mmhg', name: { fa: 'میلی‌متر جیوه', en: 'mmHg' }, symbol: 'mmHg', factor: 133.322387415 },
    ],
  },
  {
    id: 'energy',
    name: { fa: 'انرژی', en: 'Energy' },
    base: 'j',
    units: [
      { id: 'j', name: { fa: 'ژول', en: 'Joule' }, symbol: 'J', factor: 1 },
      { id: 'kj', name: { fa: 'کیلوژول', en: 'Kilojoule' }, symbol: 'kJ', factor: 1000 },
      { id: 'cal', name: { fa: 'کالری', en: 'Calorie' }, symbol: 'cal', factor: 4.184 },
      { id: 'kcal', name: { fa: 'کیلوکالری', en: 'Kilocalorie' }, symbol: 'kcal', factor: 4184 },
      { id: 'wh', name: { fa: 'وات‌ساعت', en: 'Watt-hour' }, symbol: 'Wh', factor: 3600 },
      { id: 'kwh', name: { fa: 'کیلووات‌ساعت', en: 'Kilowatt-hour' }, symbol: 'kWh', factor: 3.6e6 },
    ],
  },
  {
    id: 'angle',
    name: { fa: 'زاویه', en: 'Angle' },
    base: 'deg',
    units: [
      { id: 'deg', name: { fa: 'درجه', en: 'Degree' }, symbol: '°', factor: 1 },
      { id: 'rad', name: { fa: 'رادیان', en: 'Radian' }, symbol: 'rad', factor: 180 / Math.PI },
      { id: 'grad', name: { fa: 'گراد', en: 'Gradian' }, symbol: 'gon', factor: 0.9 },
      { id: 'turn', name: { fa: 'دور کامل', en: 'Turn' }, symbol: 'tr', factor: 360 },
    ],
  },
  {
    id: 'power',
    name: { fa: 'توان', en: 'Power' },
    base: 'w',
    units: [
      { id: 'w', name: { fa: 'وات', en: 'Watt' }, symbol: 'W', factor: 1 },
      { id: 'kw', name: { fa: 'کیلووات', en: 'Kilowatt' }, symbol: 'kW', factor: 1000 },
      { id: 'hp', name: { fa: 'اسب بخار', en: 'Horsepower' }, symbol: 'hp', factor: 745.6998716 },
    ],
  },
];

export function getCategory(catId: string): UnitCategory | undefined {
  return UNIT_CATEGORIES.find((c) => c.id === catId);
}

export function convertValue(cat: UnitCategory, fromId: string, toId: string, value: number, customUnits: UnitDef[] = []): number {
  const all = [...cat.units, ...customUnits];
  const from = all.find((u) => u.id === fromId);
  const to = all.find((u) => u.id === toId);
  if (!from || !to) return NaN;
  const toBase = from.toBase ?? ((v: number) => v * (from.factor ?? 1));
  const fromBase = to.fromBase ?? ((v: number) => v / (to.factor ?? 1));
  return fromBase(toBase(value));
}

export function findUnit(catId: string, unitId: string, customUnits: UnitDef[] = []): UnitDef | undefined {
  const cat = getCategory(catId);
  if (!cat) return undefined;
  return [...cat.units, ...customUnits].find((u) => u.id === unitId);
}

/** All units flattened (for global search) */
export function allUnits(customByCat: Record<string, UnitDef[]> = {}): { cat: UnitCategory; unit: UnitDef }[] {
  const out: { cat: UnitCategory; unit: UnitDef }[] = [];
  for (const cat of UNIT_CATEGORIES) {
    for (const u of [...cat.units, ...(customByCat[cat.id] ?? [])]) out.push({ cat, unit: u });
  }
  return out;
}

/** Finds a converter category containing a unit with this exact symbol
 *  (e.g. 'm', 'cm', 'm²', 'm/s') — used to offer a unit picker for any
 *  formula variable whose native unit happens to match a known unit,
 *  without having to hand-wire every variable to a category. */
export function findUnitContext(symbol: string): { cat: UnitCategory; unitId: string } | undefined {
  for (const cat of UNIT_CATEGORIES) {
    const u = cat.units.find((u) => u.symbol === symbol);
    if (u) return { cat, unitId: u.id };
  }
  return undefined;
}
