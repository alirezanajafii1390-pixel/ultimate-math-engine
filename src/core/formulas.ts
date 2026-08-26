/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — core/formulas : Formula Library (data-driven)
   New formula = new data entry. No logic changes needed.
   ═══════════════════════════════════════════════════════════ */
import { evaluate, extractVariables, type AngleMode } from './parser';

export interface FormulaVar {
  key: string;
  name: { fa: string; en: string };
  unit?: string;
}

export interface FormulaDef {
  id: string;
  cat: string;
  name: { fa: string; en: string };
  expr: string;
  result: { symbol: string; name: { fa: string; en: string }; unit?: string; unitCategory?: string };
  vars: FormulaVar[];
  desc?: { fa: string; en: string };
  custom?: boolean;
}

export interface FormulaCategory {
  id: string;
  name: { fa: string; en: string };
  icon: string; // lucide icon key
}

export const FORMULA_CATEGORIES: FormulaCategory[] = [
  { id: 'geometry', name: { fa: 'هندسه', en: 'Geometry' }, icon: 'shapes' },
  { id: 'algebra', name: { fa: 'جبر', en: 'Algebra' }, icon: 'sigma' },
  { id: 'trigonometry', name: { fa: 'مثلثات', en: 'Trigonometry' }, icon: 'triangle' },
  { id: 'physics', name: { fa: 'فیزیک', en: 'Physics' }, icon: 'atom' },
  { id: 'finance', name: { fa: 'مالی', en: 'Finance' }, icon: 'banknote' },
  { id: 'statistics', name: { fa: 'آمار', en: 'Statistics' }, icon: 'chart' },
];

const V = (key: string, fa: string, en: string, unit?: string): FormulaVar => ({ key, name: { fa, en }, unit });

export const FORMULAS: FormulaDef[] = [
  /* ── Geometry ── */
  {
    id: 'circle-area', cat: 'geometry',
    name: { fa: 'مساحت دایره', en: 'Circle Area' },
    expr: 'pi*r^2',
    result: { symbol: 'A', name: { fa: 'مساحت', en: 'Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('r', 'شعاع', 'Radius', 'm')],
    desc: { fa: 'مساحت دایره بر اساس شعاع', en: 'Area of a circle from its radius' },
  },
  {
    id: 'circle-circumference', cat: 'geometry',
    name: { fa: 'محیط دایره', en: 'Circle Circumference' },
    expr: '2*pi*r',
    result: { symbol: 'C', name: { fa: 'محیط', en: 'Circumference' }, unit: 'm', unitCategory: 'length' },
    vars: [V('r', 'شعاع', 'Radius', 'm')],
  },
  {
    id: 'triangle-area', cat: 'geometry',
    name: { fa: 'مساحت مثلث', en: 'Triangle Area' },
    expr: 'b*h/2',
    result: { symbol: 'A', name: { fa: 'مساحت', en: 'Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('b', 'قاعده', 'Base', 'm'), V('h', 'ارتفاع', 'Height', 'm')],
  },
  {
    id: 'rectangle-area', cat: 'geometry',
    name: { fa: 'مساحت مستطیل', en: 'Rectangle Area' },
    expr: 'a*b',
    result: { symbol: 'A', name: { fa: 'مساحت', en: 'Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('a', 'طول', 'Length', 'm'), V('b', 'عرض', 'Width', 'm')],
  },
  {
    id: 'trapezoid-area', cat: 'geometry',
    name: { fa: 'مساحت ذوزنقه', en: 'Trapezoid Area' },
    expr: '(a+b)*h/2',
    result: { symbol: 'A', name: { fa: 'مساحت', en: 'Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('a', 'قاعده بزرگ', 'Base a', 'm'), V('b', 'قاعده کوچک', 'Base b', 'm'), V('h', 'ارتفاع', 'Height', 'm')],
  },
  {
    id: 'pythagoras', cat: 'geometry',
    name: { fa: 'قضیه فیثاغورس', en: 'Pythagorean Theorem' },
    expr: 'sqrt(a^2+b^2)',
    result: { symbol: 'c', name: { fa: 'وتر', en: 'Hypotenuse' }, unit: 'm', unitCategory: 'length' },
    vars: [V('a', 'ضلع اول', 'Side a', 'm'), V('b', 'ضلع دوم', 'Side b', 'm')],
  },
  {
    id: 'sphere-volume', cat: 'geometry',
    name: { fa: 'حجم کره', en: 'Sphere Volume' },
    expr: '4/3*pi*r^3',
    result: { symbol: 'V', name: { fa: 'حجم', en: 'Volume' }, unit: 'm³', unitCategory: 'volume' },
    vars: [V('r', 'شعاع', 'Radius', 'm')],
  },
  {
    id: 'sphere-surface', cat: 'geometry',
    name: { fa: 'مساحت سطح کره', en: 'Sphere Surface Area' },
    expr: '4*pi*r^2',
    result: { symbol: 'A', name: { fa: 'مساحت سطح', en: 'Surface Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('r', 'شعاع', 'Radius', 'm')],
  },
  {
    id: 'cylinder-volume', cat: 'geometry',
    name: { fa: 'حجم استوانه', en: 'Cylinder Volume' },
    expr: 'pi*r^2*h',
    result: { symbol: 'V', name: { fa: 'حجم', en: 'Volume' }, unit: 'm³', unitCategory: 'volume' },
    vars: [V('r', 'شعاع قاعده', 'Base radius', 'm'), V('h', 'ارتفاع', 'Height', 'm')],
  },
  {
    id: 'cone-volume', cat: 'geometry',
    name: { fa: 'حجم مخروط', en: 'Cone Volume' },
    expr: 'pi*r^2*h/3',
    result: { symbol: 'V', name: { fa: 'حجم', en: 'Volume' }, unit: 'm³', unitCategory: 'volume' },
    vars: [V('r', 'شعاع قاعده', 'Base radius', 'm'), V('h', 'ارتفاع', 'Height', 'm')],
  },
  {
    id: 'cube-volume', cat: 'geometry',
    name: { fa: 'حجم مکعب', en: 'Cube Volume' },
    expr: 'a^3',
    result: { symbol: 'V', name: { fa: 'حجم', en: 'Volume' }, unit: 'm³', unitCategory: 'volume' },
    vars: [V('a', 'ضلع', 'Side', 'm')],
  },

  /* ── Algebra ── */
  {
    id: 'quadratic-delta', cat: 'algebra',
    name: { fa: 'دلتا (معادله درجه دو)', en: 'Quadratic Discriminant' },
    expr: 'b^2-4*a*c',
    result: { symbol: 'Δ', name: { fa: 'دلتا', en: 'Discriminant' } },
    vars: [V('a', 'ضریب a', 'Coefficient a'), V('b', 'ضریب b', 'Coefficient b'), V('c', 'ضریب c', 'Coefficient c')],
    desc: { fa: 'برای معادله ax²+bx+c=0 — تعیین‌کننده نوع ریشه‌ها', en: 'For ax²+bx+c=0 — determines root types' },
  },
  {
    id: 'quadratic-root', cat: 'algebra',
    name: { fa: 'ریشه اول معادله درجه دو', en: 'Quadratic Root (x₁)' },
    expr: '(-b+sqrt(b^2-4*a*c))/(2*a)',
    result: { symbol: 'x₁', name: { fa: 'ریشه اول', en: 'First root' } },
    vars: [V('a', 'ضریب a', 'Coefficient a'), V('b', 'ضریب b', 'Coefficient b'), V('c', 'ضریب c', 'Coefficient c')],
  },
  {
    id: 'slope', cat: 'algebra',
    name: { fa: 'شیب خط', en: 'Slope of a Line' },
    expr: '(y2-y1)/(x2-x1)',
    result: { symbol: 'm', name: { fa: 'شیب', en: 'Slope' } },
    vars: [V('x1', 'x اول', 'x₁'), V('y1', 'y اول', 'y₁'), V('x2', 'x دوم', 'x₂'), V('y2', 'y دوم', 'y₂')],
  },
  {
    id: 'distance-2d', cat: 'algebra',
    name: { fa: 'فاصله دو نقطه', en: 'Distance Between Points' },
    expr: 'sqrt((x2-x1)^2+(y2-y1)^2)',
    result: { symbol: 'd', name: { fa: 'فاصله', en: 'Distance' } },
    vars: [V('x1', 'x اول', 'x₁'), V('y1', 'y اول', 'y₁'), V('x2', 'x دوم', 'x₂'), V('y2', 'y دوم', 'y₂')],
  },
  {
    id: 'percent-of', cat: 'algebra',
    name: { fa: 'درصد از عدد', en: 'Percentage of a Number' },
    expr: 'p*x/100',
    result: { symbol: 'R', name: { fa: 'نتیجه', en: 'Result' } },
    vars: [V('p', 'درصد', 'Percent', '%'), V('x', 'عدد', 'Number')],
    desc: { fa: 'p درصد از x چقدر است؟', en: 'What is p% of x?' },
  },
  {
    id: 'percent-change', cat: 'algebra',
    name: { fa: 'درصد تغییر', en: 'Percentage Change' },
    expr: '(b-a)/a*100',
    result: { symbol: 'Δ%', name: { fa: 'درصد تغییر', en: 'Change' }, unit: '%' },
    vars: [V('a', 'مقدار اولیه', 'Initial value'), V('b', 'مقدار نهایی', 'Final value')],
  },
  {
    id: 'ratio', cat: 'algebra',
    name: { fa: 'تناسب (جمله چهارم)', en: 'Proportion (4th term)' },
    expr: 'b*c/a',
    result: { symbol: 'x', name: { fa: 'جمله چهارم', en: 'Fourth term' } },
    vars: [V('a', 'a', 'a'), V('b', 'b', 'b'), V('c', 'c', 'c')],
    desc: { fa: 'اگر a/b = c/x آنگاه x = b×c÷a', en: 'If a/b = c/x then x = b×c÷a' },
  },
  {
    id: 'arithmetic-mean', cat: 'algebra',
    name: { fa: 'میانگین دو عدد', en: 'Mean of Two Numbers' },
    expr: '(a+b)/2',
    result: { symbol: 'x̄', name: { fa: 'میانگین', en: 'Mean' } },
    vars: [V('a', 'عدد اول', 'First'), V('b', 'عدد دوم', 'Second')],
  },

  /* ── Trigonometry ── */
  {
    id: 'law-of-cosines', cat: 'trigonometry',
    name: { fa: 'قانون کسینوس‌ها', en: 'Law of Cosines' },
    expr: 'sqrt(a^2+b^2-2*a*b*cos(g))',
    result: { symbol: 'c', name: { fa: 'ضلع سوم', en: 'Third side' }, unit: 'm', unitCategory: 'length' },
    vars: [V('a', 'ضلع a', 'Side a', 'm'), V('b', 'ضلع b', 'Side b', 'm'), V('g', 'زاویه بین (درجه)', 'Angle between (°)', '°')],
    desc: { fa: 'زاویه بر حسب درجه وارد شود', en: 'Angle is entered in degrees' },
  },
  {
    id: 'law-of-sines', cat: 'trigonometry',
    name: { fa: 'قانون سینوس‌ها', en: 'Law of Sines' },
    expr: 'a*sin(g1)/sin(g2)',
    result: { symbol: 'b', name: { fa: 'ضلع مجهول', en: 'Unknown side' }, unit: 'm', unitCategory: 'length' },
    vars: [V('a', 'ضلع معلوم', 'Known side', 'm'), V('g1', 'زاویه روبه‌روی ضلع مجهول (°)', 'Opposite angle (°)', '°'), V('g2', 'زاویه روبه‌روی ضلع معلوم (°)', 'Known angle (°)', '°')],
    desc: { fa: 'زاویه‌ها بر حسب درجه', en: 'Angles in degrees' },
  },
  {
    id: 'triangle-area-trig', cat: 'trigonometry',
    name: { fa: 'مساحت مثلث (دو ضلع و زاویه بین)', en: 'Triangle Area (SAS)' },
    expr: 'a*b*sin(c)/2',
    result: { symbol: 'A', name: { fa: 'مساحت', en: 'Area' }, unit: 'm²', unitCategory: 'area' },
    vars: [V('a', 'ضلع a', 'Side a', 'm'), V('b', 'ضلع b', 'Side b', 'm'), V('c', 'زاویه بین (درجه)', 'Angle between (°)', '°')],
  },

  /* ── Physics ── */
  {
    id: 'velocity', cat: 'physics',
    name: { fa: 'سرعت متوسط', en: 'Average Velocity' },
    expr: 'd/t',
    result: { symbol: 'v', name: { fa: 'سرعت', en: 'Velocity' }, unit: 'm/s' },
    vars: [V('d', 'جابه‌جایی', 'Distance', 'm'), V('t', 'زمان', 'Time', 's')],
  },
  {
    id: 'acceleration', cat: 'physics',
    name: { fa: 'شتاب', en: 'Acceleration' },
    expr: '(v-u)/t',
    result: { symbol: 'a', name: { fa: 'شتاب', en: 'Acceleration' }, unit: 'm/s²' },
    vars: [V('v', 'سرعت نهایی', 'Final velocity', 'm/s'), V('u', 'سرعت اولیه', 'Initial velocity', 'm/s'), V('t', 'زمان', 'Time', 's')],
  },
  {
    id: 'force', cat: 'physics',
    name: { fa: 'نیرو (قانون دوم نیوتن)', en: 'Force (Newton’s 2nd Law)' },
    expr: 'm*a',
    result: { symbol: 'F', name: { fa: 'نیرو', en: 'Force' }, unit: 'N' },
    vars: [V('m', 'جرم', 'Mass', 'kg'), V('a', 'شتاب', 'Acceleration', 'm/s²')],
  },
  {
    id: 'kinetic-energy', cat: 'physics',
    name: { fa: 'انرژی جنبشی', en: 'Kinetic Energy' },
    expr: 'm*v^2/2',
    result: { symbol: 'KE', name: { fa: 'انرژی جنبشی', en: 'Kinetic Energy' }, unit: 'J' },
    vars: [V('m', 'جرم', 'Mass', 'kg'), V('v', 'سرعت', 'Velocity', 'm/s')],
  },
  {
    id: 'potential-energy', cat: 'physics',
    name: { fa: 'انرژی پتانسیل گرانشی', en: 'Potential Energy' },
    expr: 'm*g*h',
    result: { symbol: 'PE', name: { fa: 'انرژی پتانسیل', en: 'Potential Energy' }, unit: 'J' },
    vars: [V('m', 'جرم', 'Mass', 'kg'), V('g', 'شتاب گرانش', 'Gravity', 'm/s²'), V('h', 'ارتفاع', 'Height', 'm')],
  },
  {
    id: 'work', cat: 'physics',
    name: { fa: 'کار', en: 'Work' },
    expr: 'f*d',
    result: { symbol: 'W', name: { fa: 'کار', en: 'Work' }, unit: 'J' },
    vars: [V('f', 'نیرو', 'Force', 'N'), V('d', 'جابه‌جایی', 'Distance', 'm')],
  },
  {
    id: 'power-phys', cat: 'physics',
    name: { fa: 'توان', en: 'Power' },
    expr: 'w/t',
    result: { symbol: 'P', name: { fa: 'توان', en: 'Power' }, unit: 'W' },
    vars: [V('w', 'کار', 'Work', 'J'), V('t', 'زمان', 'Time', 's')],
  },
  {
    id: 'pressure-phys', cat: 'physics',
    name: { fa: 'فشار', en: 'Pressure' },
    expr: 'f/a',
    result: { symbol: 'P', name: { fa: 'فشار', en: 'Pressure' }, unit: 'Pa' },
    vars: [V('f', 'نیرو', 'Force', 'N'), V('a', 'مساحت', 'Area', 'm²')],
  },
  {
    id: 'density', cat: 'physics',
    name: { fa: 'چگالی', en: 'Density' },
    expr: 'm/v',
    result: { symbol: 'ρ', name: { fa: 'چگالی', en: 'Density' }, unit: 'kg/m³' },
    vars: [V('m', 'جرم', 'Mass', 'kg'), V('v', 'حجم', 'Volume', 'm³')],
  },
  {
    id: 'ohms-law', cat: 'physics',
    name: { fa: 'قانون اهم', en: 'Ohm’s Law' },
    expr: 'i*r',
    result: { symbol: 'V', name: { fa: 'ولتاژ', en: 'Voltage' }, unit: 'V' },
    vars: [V('i', 'جریان', 'Current', 'A'), V('r', 'مقاومت', 'Resistance', 'Ω')],
  },
  {
    id: 'electric-power', cat: 'physics',
    name: { fa: 'توان الکتریکی', en: 'Electric Power' },
    expr: 'v*i',
    result: { symbol: 'P', name: { fa: 'توان', en: 'Power' }, unit: 'W' },
    vars: [V('v', 'ولتاژ', 'Voltage', 'V'), V('i', 'جریان', 'Current', 'A')],
  },
  {
    id: 'free-fall', cat: 'physics',
    name: { fa: 'ارتفاع سقوط آزاد', en: 'Free Fall Height' },
    expr: 'g*t^2/2',
    result: { symbol: 'h', name: { fa: 'ارتفاع', en: 'Height' }, unit: 'm', unitCategory: 'length' },
    vars: [V('g', 'شتاب گرانش', 'Gravity', 'm/s²'), V('t', 'زمان', 'Time', 's')],
  },
  {
    id: 'momentum', cat: 'physics',
    name: { fa: 'تکانه', en: 'Momentum' },
    expr: 'm*v',
    result: { symbol: 'p', name: { fa: 'تکانه', en: 'Momentum' }, unit: 'kg·m/s' },
    vars: [V('m', 'جرم', 'Mass', 'kg'), V('v', 'سرعت', 'Velocity', 'm/s')],
  },

  /* ── Finance ── */
  {
    id: 'simple-interest', cat: 'finance',
    name: { fa: 'سود ساده', en: 'Simple Interest' },
    expr: 'p*r*t/100',
    result: { symbol: 'I', name: { fa: 'سود', en: 'Interest' } },
    vars: [V('p', 'اصل سرمایه', 'Principal'), V('r', 'نرخ سالانه', 'Annual rate', '%'), V('t', 'مدت (سال)', 'Time (years)')],
  },
  {
    id: 'compound-interest', cat: 'finance',
    name: { fa: 'سود مرکب', en: 'Compound Interest' },
    expr: 'p*(1+r/100)^t-p',
    result: { symbol: 'I', name: { fa: 'سود', en: 'Interest' } },
    vars: [V('p', 'اصل سرمایه', 'Principal'), V('r', 'نرخ سالانه', 'Annual rate', '%'), V('t', 'دوره (سال)', 'Periods (years)')],
  },
  {
    id: 'discount', cat: 'finance',
    name: { fa: 'قیمت بعد از تخفیف', en: 'Price After Discount' },
    expr: 'p*(1-d/100)',
    result: { symbol: 'P', name: { fa: 'قیمت نهایی', en: 'Final price' } },
    vars: [V('p', 'قیمت اولیه', 'Original price'), V('d', 'درصد تخفیف', 'Discount', '%')],
  },
  {
    id: 'vat', cat: 'finance',
    name: { fa: 'قیمت با مالیات', en: 'Price With Tax' },
    expr: 'p*(1+d/100)',
    result: { symbol: 'P', name: { fa: 'قیمت نهایی', en: 'Final price' } },
    vars: [V('p', 'قیمت پایه', 'Base price'), V('d', 'درصد مالیات', 'Tax rate', '%')],
  },
  {
    id: 'loan-payment', cat: 'finance',
    name: { fa: 'قسط ماهانه وام', en: 'Monthly Loan Payment' },
    expr: 'p*(r/1200)*(1+r/1200)^n/((1+r/1200)^n-1)',
    result: { symbol: 'M', name: { fa: 'قسط ماهانه', en: 'Monthly payment' } },
    vars: [V('p', 'مبلغ وام', 'Loan amount'), V('r', 'نرخ سالانه', 'Annual rate', '%'), V('n', 'تعداد ماه', 'Months')],
    desc: { fa: 'نرخ سالانه بر حسب درصد', en: 'Annual rate in percent' },
  },

  /* ── Statistics ── */
  {
    id: 'std-dev-2', cat: 'statistics',
    name: { fa: 'انحراف معیار (دو داده)', en: 'Std. Deviation (2 values)' },
    expr: 'sqrt(((a-(a+b)/2)^2+(b-(a+b)/2)^2)/2)',
    result: { symbol: 'σ', name: { fa: 'انحراف معیار', en: 'Std. deviation' } },
    vars: [V('a', 'داده اول', 'Value 1'), V('b', 'داده دوم', 'Value 2')],
  },
  {
    id: 'bmi', cat: 'statistics',
    name: { fa: 'شاخص توده بدنی (BMI)', en: 'Body Mass Index' },
    expr: 'w/(h/100)^2',
    result: { symbol: 'BMI', name: { fa: 'شاخص توده بدنی', en: 'BMI' } },
    vars: [V('w', 'وزن', 'Weight', 'kg'), V('h', 'قد', 'Height', 'cm')],
    desc: { fa: 'قد بر حسب سانتی‌متر', en: 'Height in centimeters' },
  },
];

/* ── API ─────────────────────────────────────────────────── */
export function getFormula(id: string, customs: FormulaDef[] = []): FormulaDef | undefined {
  return [...FORMULAS, ...customs].find((f) => f.id === id);
}

export function getFormulaCategory(catId: string): FormulaCategory | undefined {
  return FORMULA_CATEGORIES.find((c) => c.id === catId);
}

/** Evaluate a formula with given variable values. Trig formulas use degrees per convention. */
export function evaluateFormula(f: FormulaDef, values: Record<string, number>, angleMode: AngleMode = 'rad'): number {
  return evaluate(f.expr, { scope: values, angleMode });
}

/** Build a custom formula (Formula Builder) — variables auto-detected. */
export function buildCustomFormula(name: string, expr: string, id?: string): FormulaDef {
  const keys = extractVariables(expr);
  return {
    id: id ?? `custom-${Date.now()}`,
    cat: 'custom',
    name: { fa: name, en: name },
    expr,
    result: { symbol: '=', name: { fa: 'نتیجه', en: 'Result' } },
    vars: keys.map((k) => V(k, k, k)),
    custom: true,
  };
}
