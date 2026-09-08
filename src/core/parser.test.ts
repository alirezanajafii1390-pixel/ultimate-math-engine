import { describe, test, expect } from 'vitest';
import { evaluate, MathError } from './parser';

describe('parser — basic arithmetic', () => {
  test('the four operators', () => {
    expect(evaluate('2 + 3')).toBe(5);
    expect(evaluate('10 - 4')).toBe(6);
    expect(evaluate('6 * 7')).toBe(42);
    expect(evaluate('15 / 3')).toBe(5);
  });

  test('operator precedence and parens', () => {
    expect(evaluate('2 + 3 * 4')).toBe(14);
    expect(evaluate('(2 + 3) * 4')).toBe(20);
    expect(evaluate('2 ^ 3 ^ 2')).toBe(512); // right-associative: 2^(3^2), not (2^3)^2
  });

  test('division by zero', () => {
    expect(() => evaluate('1/0')).toThrow(MathError);
  });
});

describe('parser — Persian/Arabic digits and separators (regression)', () => {
  test('Persian digits', () => {
    expect(evaluate('۲ + ۳')).toBe(5);
    expect(evaluate('۱۰ * ۵')).toBe(50);
  });

  test('Persian/Arabic thousands separator "،" is dropped, not read as a decimal point', () => {
    // Bug: '،' was previously mapped to '.', turning "1,000" into "1.000".
    expect(evaluate('1،000 + 1')).toBe(1001);
    expect(evaluate('1،234،567')).toBe(1234567);
  });

  test('Arabic decimal separator "٫" still works as a decimal point', () => {
    expect(evaluate('1٫5 + 2')).toBe(3.5);
  });
});

describe('parser — sin²(x) notation (regression)', () => {
  test('sin²(x) means (sin(x))², not sin(x²)', () => {
    // In degree mode (this app's default), sin(30°) = 0.5, so sin²(30) = 0.25.
    expect(evaluate('sin²(30)', { angleMode: 'deg' })).toBeCloseTo(0.25, 9);
  });

  test('plain postfix ² still squares a number or parenthesised group', () => {
    expect(evaluate('5²')).toBe(25);
    expect(evaluate('(3+4)²')).toBe(49);
  });

  test('³ still works as cube', () => {
    expect(evaluate('2³')).toBe(8);
  });
});

describe('parser — functions', () => {
  test('trigonometry in degrees', () => {
    expect(evaluate('sin(30)', { angleMode: 'deg' })).toBeCloseTo(0.5, 9);
    expect(evaluate('cos(60)', { angleMode: 'deg' })).toBeCloseTo(0.5, 9);
    expect(evaluate('tan(45)', { angleMode: 'deg' })).toBeCloseTo(1, 9);
  });

  test('tan(90°) is a domain error, not a huge/garbage number', () => {
    expect(() => evaluate('tan(90)', { angleMode: 'deg' })).toThrow(MathError);
  });

  test('sqrt of a negative number is a domain error', () => {
    expect(() => evaluate('sqrt(-1)')).toThrow(MathError);
  });

  test('factorial: correctness and overflow boundary', () => {
    expect(evaluate('0!')).toBe(1);
    expect(evaluate('5!')).toBe(120);
    expect(evaluate('170!')).toBeLessThan(Infinity);
    expect(() => evaluate('171!')).toThrow(MathError);
  });

  test('nested multi-argument functions resolve independent argument counts', () => {
    // Regression check for a claimed (and disproven) argCount bug: deeply
    // nested variable-arity calls must each get their own correct arg count.
    expect(evaluate('max(min(1,2), min(3,0), max(5, max(1,9)))')).toBe(9);
    expect(evaluate('pow(pow(2,2), pow(2,3))')).toBe(65536);
    expect(evaluate('min(max(1,2,3), max(4,5,6), max(7,8,9))')).toBe(3);
  });

  test('a function called with the wrong arity throws rather than silently misparsing', () => {
    expect(() => evaluate('sin(1,2)')).toThrow(MathError);
  });
});

describe('parser — implicit multiplication', () => {
  test('number next to a constant, parens, or a bare number', () => {
    expect(evaluate('2pi')).toBeCloseTo(2 * Math.PI, 9);
    expect(evaluate('2(3)')).toBe(6);
    expect(evaluate('(2)(3)')).toBe(6);
    expect(evaluate('2 3')).toBe(6);
  });
});

describe('parser — security', () => {
  test('does not evaluate arbitrary JS — garbage input throws a MathError, not a JS side effect', () => {
    expect(() => evaluate('console.log(1)')).toThrow(MathError);
    expect(() => evaluate('while(true){}')).toThrow(MathError);
  });
});
