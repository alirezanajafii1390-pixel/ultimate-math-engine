import { describe, test, expect } from 'vitest';
import { negateExpr } from './calc-helpers';

describe('negateExpr — basic sign toggling (regression)', () => {
  test('a plain negative number becomes positive', () => {
    // Bug: this previously produced "-(-5)" (still negative) instead of "5".
    expect(negateExpr('-5')).toBe('5');
  });

  test('a plain positive number becomes wrapped-negative', () => {
    expect(negateExpr('5')).toBe('(-5)');
  });

  test('subtraction: only the trailing operand flips, not the operator', () => {
    expect(negateExpr('3-5')).toBe('3-(-5)');
  });

  test('addition: the trailing operand gets wrapped negative', () => {
    expect(negateExpr('3+5')).toBe('3+(-5)');
  });

  test('unary minus after another operator (exponent) is recognized and flips', () => {
    expect(negateExpr('3^-5')).toBe('3^5');
  });

  test('unary minus after multiplication is recognized and flips', () => {
    expect(negateExpr('3*-5')).toBe('3*5');
  });

  test('empty input starts a negative number', () => {
    expect(negateExpr('')).toBe('-');
  });

  test('a bare trailing "-" with nothing after it is left alone', () => {
    expect(negateExpr('-')).toBe('-');
  });

  test('an expression with no trailing number is left alone', () => {
    expect(negateExpr('(3+4)')).toBe('(3+4)');
  });
});

describe('negateExpr — toggling twice returns to the start (found while writing these tests)', () => {
  // The wrap step above produces a *closed* "(-5)". A second press should
  // undo that back to "5", but the original implementation's un-wrap check
  // only matched an *open*, not-yet-closed "(-5" (no ")"), since it ran
  // after a digit-suffix regex that can't match a string ending in ")" at
  // all — so a second press silently did nothing instead of toggling back.
  test('positive -> negative -> positive, at the start of the expression', () => {
    expect(negateExpr(negateExpr('5'))).toBe('5');
  });

  test('positive -> negative -> positive, after an operator', () => {
    expect(negateExpr(negateExpr('3*5'))).toBe('3*5');
  });

  test('directly: a closed "(-5)" wrap unwraps back to "5"', () => {
    expect(negateExpr('(-5)')).toBe('5');
  });

  test('directly: a closed wrap after an operator unwraps correctly', () => {
    expect(negateExpr('3*(-5)')).toBe('3*5');
  });
});

describe('negateExpr — does not mistake a function call for its own wrap', () => {
  // "sin(-5)" ends the same way a self-made wrap would ("(-...)"), but
  // these parens belong to the function call, not to a sign-wrap — so
  // stripping them would produce the broken expression "sin5". Without
  // cursor-aware editing there's no reliable way to negate just the
  // argument here, so the safest behavior is to leave it untouched.
  test('a trig function call ending in a negative literal is left alone', () => {
    expect(negateExpr('sin(-5)')).toBe('sin(-5)');
  });

  test('sqrt of a negative literal is left alone', () => {
    expect(negateExpr('sqrt(-16)')).toBe('sqrt(-16)');
  });
});
