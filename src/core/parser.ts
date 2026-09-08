/* ═══════════════════════════════════════════════════════════
   MATH ENGINE — Expression Parser (core/parser)
   Tokenizer → Shunting-Yard → RPN Evaluator
   Security rules: no eval, no new Function. Ever.
   ═══════════════════════════════════════════════════════════ */

export type AngleMode = 'deg' | 'rad';

export type MathErrorCode =
  | 'EMPTY'
  | 'SYNTAX'
  | 'UNBALANCED'
  | 'DIV_ZERO'
  | 'DOMAIN'
  | 'UNKNOWN_NAME'
  | 'BAD_ARG'
  | 'OVERFLOW';

export class MathError extends Error {
  code: MathErrorCode;
  constructor(code: MathErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

/* ── Tokens ─────────────────────────────────────────────── */
type Tok =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }
  | { t: 'post'; v: '%' | '!' };

const UNICODE_MAP: Record<string, string> = {
  '×': '*',
  '÷': '/',
  '−': '-',
  '–': '-',
  'π': 'pi',
  '√': 'sqrt',
  '∞': 'inf',
  '⁺': '+',
};

function normalize(src: string): string {
  let s = src.trim();
  // Persian/Arabic digits → Latin
  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arDigits = '٠١٢٣٤٥٦٧٨٩';
  s = s
    .split('')
    .map((ch) => {
      const fi = faDigits.indexOf(ch);
      if (fi >= 0) return String(fi);
      const ai = arDigits.indexOf(ch);
      if (ai >= 0) return String(ai);
      return ch;
    })
    .join('');
  // Arabic decimal separator → '.'; Persian/Arabic thousands separator '،' is dropped (not a decimal point)
  s = s.replace(/[٫]/g, '.').replace(/،/g, '');
  for (const [k, v] of Object.entries(UNICODE_MAP)) s = s.split(k).join(v);
  // x³ sugar (cube). x² is handled separately below so sin²(x) parses as (sin(x))^2, not sin(x^2).
  s = s.replace(/³/g, '^3');
  s = rewriteSquares(s);
  return s;
}

/**
 * Rewrites '²' into '^2', handling two distinct cases correctly:
 *  1. "word²(" where word is a known function, e.g. "sin²(30)" → "(sin(30))^2"
 *     (mathematical convention: sin²(x) means (sin(x))², not sin(x²))
 *  2. Everywhere else, ² becomes '^2' directly (existing '^' precedence/parens
 *     already give the right result for "5²" → "5^2", "(x+1)²" → "(x+1)^2")
 * Handled with a manual scan (not regex) because case 1 requires matching
 * balanced/nested parentheses, which regex can't do reliably.
 */
function rewriteSquares(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '²') {
      // Case 1: a function name (word) directly precedes this ², and '(' follows.
      const wordMatch = /[a-zA-Z_][a-zA-Z0-9_]*$/.exec(out);
      if (wordMatch && s[i + 1] === '(') {
        const word = wordMatch[0];
        const bodyStart = i + 1; // index of '('
        let depth = 0;
        let j = bodyStart;
        let bodyEnd = -1;
        for (; j < s.length; j++) {
          if (s[j] === '(') depth++;
          else if (s[j] === ')') {
            depth--;
            if (depth === 0) {
              bodyEnd = j;
              break;
            }
          }
        }
        if (bodyEnd !== -1) {
          const prefix = out.slice(0, out.length - word.length);
          const callExpr = word + s.slice(bodyStart, bodyEnd + 1); // e.g. "sin(30)"
          out = `${prefix}(${callExpr})^2`;
          i = bodyEnd + 1;
          continue;
        }
        // unbalanced parens: fall through, leave as literal postfix square below
      }
      // Case 2: plain postfix square on whatever operand precedes it (number, ), or identifier)
      out += '^2';
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function tokenize(src: string): Tok[] {
  const s = normalize(src);
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') {
      i++;
      continue;
    }
    // number (incl. decimals + scientific)
    if (/[0-9.]/.test(ch)) {
      let j = i;
      let seenDot = false;
      while (j < s.length && (/[0-9]/.test(s[j]) || (s[j] === '.' && !seenDot))) {
        if (s[j] === '.') seenDot = true;
        j++;
      }
      let numStr = s.slice(i, j);
      // exponent notation 1e5 / 2.5E-3
      if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
        const m = /^[eE][+-]?[0-9]+/.exec(s.slice(j));
        if (m) {
          numStr += m[0];
          j += m[0].length;
        }
      }
      const v = Number(numStr);
      if (Number.isNaN(v)) throw new MathError('SYNTAX', numStr);
      toks.push({ t: 'num', v });
      i = j;
      continue;
    }
    // identifier
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      const word = s.slice(i, j).toLowerCase();
      if (word === 'mod') {
        toks.push({ t: 'op', v: 'mod' });
      } else {
        toks.push({ t: 'name', v: word });
      }
      i = j;
      continue;
    }
    if (ch === '(') {
      toks.push({ t: 'lp' });
      i++;
      continue;
    }
    if (ch === ')') {
      toks.push({ t: 'rp' });
      i++;
      continue;
    }
    if (ch === ',') {
      toks.push({ t: 'comma' });
      i++;
      continue;
    }
    if (ch === '!') {
      toks.push({ t: 'post', v: '!' });
      i++;
      continue;
    }
    if (ch === '%') {
      // '%' postfix when after operand; 'mod' handled as word
      toks.push({ t: 'post', v: '%' });
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      toks.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    throw new MathError('SYNTAX', ch);
  }
  return toks;
}

/* Insert implicit multiplication: 2pi, 3(4), (1)(2), 2sin(3), 50%*x already fine */
function insertImplicit(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  const isOperandEnd = (t: Tok) =>
    t.t === 'num' || t.t === 'rp' || t.t === 'post' || (t.t === 'name' && !FUNCTIONS[t.v]);
  const isOperandStart = (t: Tok) => t.t === 'num' || t.t === 'lp' || t.t === 'name';
  for (let k = 0; k < toks.length; k++) {
    const cur = toks[k];
    const prev = out[out.length - 1];
    if (prev && isOperandEnd(prev) && isOperandStart(cur)) {
      // function name right after operand → implicit mult, e.g. 2sin(3)
      out.push({ t: 'op', v: '*' });
    }
    out.push(cur);
  }
  return out;
}

/* ── Functions & constants ──────────────────────────────── */
type Fn = (args: number[], mode: AngleMode) => number;
const toRad = (x: number, m: AngleMode) => (m === 'deg' ? (x * Math.PI) / 180 : x);
const fromRad = (x: number, m: AngleMode) => (m === 'deg' ? (x * 180) / Math.PI : x);

const FUNCTIONS: Record<string, { arity: number; fn: Fn }> = {
  sin: { arity: 1, fn: ([x], m) => sinClean(toRad(x, m)) },
  cos: { arity: 1, fn: ([x], m) => cosClean(toRad(x, m)) },
  tan: { arity: 1, fn: ([x], m) => tanClean(toRad(x, m)) },
  asin: { arity: 1, fn: ([x], m) => domain(Math.asin(x), m, fromRad) },
  acos: { arity: 1, fn: ([x], m) => domain(Math.acos(x), m, fromRad) },
  atan: { arity: 1, fn: ([x], m) => fromRad(Math.atan(x), m) },
  sinh: { arity: 1, fn: ([x]) => Math.sinh(x) },
  cosh: { arity: 1, fn: ([x]) => Math.cosh(x) },
  tanh: { arity: 1, fn: ([x]) => Math.tanh(x) },
  ln: { arity: 1, fn: ([x]) => (x > 0 ? Math.log(x) : throwDomain('ln')) },
  log: { arity: 1, fn: ([x]) => (x > 0 ? Math.log10(x) : throwDomain('log')) },
  log2: { arity: 1, fn: ([x]) => (x > 0 ? Math.log2(x) : throwDomain('log2')) },
  sqrt: { arity: 1, fn: ([x]) => (x >= 0 ? Math.sqrt(x) : throwDomain('sqrt')) },
  cbrt: { arity: 1, fn: ([x]) => Math.cbrt(x) },
  abs: { arity: 1, fn: ([x]) => Math.abs(x) },
  exp: { arity: 1, fn: ([x]) => Math.exp(x) },
  floor: { arity: 1, fn: ([x]) => Math.floor(x) },
  ceil: { arity: 1, fn: ([x]) => Math.ceil(x) },
  round: { arity: 1, fn: ([x]) => Math.round(x) },
  sign: { arity: 1, fn: ([x]) => Math.sign(x) },
  min: { arity: -1, fn: (a) => Math.min(...a) },
  max: { arity: -1, fn: (a) => Math.max(...a) },
  pow: { arity: 2, fn: ([a, b]) => safePow(a, b) },
  deg: { arity: 1, fn: ([x]) => (x * 180) / Math.PI },
  rad: { arity: 1, fn: ([x]) => (x * Math.PI) / 180 },
};

function sinClean(x: number) {
  return Math.abs(Math.sin(x)) < 1e-15 ? 0 : Math.sin(x);
}
function cosClean(x: number) {
  return Math.abs(Math.cos(x)) < 1e-15 ? 0 : Math.cos(x);
}
function tanClean(x: number) {
  const c = Math.cos(x);
  if (Math.abs(c) < 1e-15) throw new MathError('DOMAIN', 'tan');
  return Math.sin(x) / c;
}
function domain(v: number, m: AngleMode, conv: (x: number, m: AngleMode) => number): number {
  if (Number.isNaN(v)) throw new MathError('DOMAIN');
  return conv(v, m);
}
function throwDomain(_f: string): never {
  throw new MathError('DOMAIN', _f);
}
function safePow(a: number, b: number): number {
  const v = Math.pow(a, b);
  if (Number.isNaN(v)) throw new MathError('DOMAIN', '^');
  return v;
}

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
  inf: Infinity,
};

const PRECEDENCE: Record<string, number> = { '+': 2, '-': 2, '*': 3, '/': 3, mod: 3, '^': 5, u: 4 };
const RIGHT_ASSOC = new Set(['^', 'u']);

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new MathError('DOMAIN', '!');
  if (n > 170) throw new MathError('OVERFLOW');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/* ── Shunting-yard → RPN ────────────────────────────────── */
type RpnItem =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string }
  | { t: 'post'; v: '%' | '!' }
  | { t: 'call'; v: string; argc: number };

function toRpn(toks: Tok[]): RpnItem[] {
  const out: RpnItem[] = [];
  const stack: (Tok | { t: 'fn'; v: string })[] = [];
  const argCount: number[] = [];
  let prev: Tok | null = null;

  const expectOperand = (t: Tok | null) =>
    t === null || t.t === 'op' || t.t === 'lp' || t.t === 'comma';

  for (const tok of toks) {
    if (tok.t === 'num') {
      out.push({ t: 'num', v: tok.v });
    } else if (tok.t === 'name') {
      if (FUNCTIONS[tok.v]) {
        stack.push({ t: 'fn', v: tok.v });
        argCount.push(0);
      } else if (CONSTANTS[tok.v] !== undefined) {
        out.push({ t: 'num', v: CONSTANTS[tok.v] });
      } else {
        out.push({ t: 'name', v: tok.v });
      }
    } else if (tok.t === 'comma') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') {
        const s = stack.pop()!;
        if (s.t === 'op') out.push({ t: 'op', v: s.v });
        else if (s.t === 'fn') {
          out.push({ t: 'call', v: s.v, argc: argCount.pop()! + 1 });
        }
      }
      const top = stack[stack.length - 1];
      if (!top || top.t !== 'lp') throw new MathError('SYNTAX', ',');
      // mark argument for enclosing fn
      let fnDepth = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].t === 'fn') {
          fnDepth = k;
          break;
        }
      }
      if (fnDepth < 0) throw new MathError('SYNTAX', ',');
      argCount[fnCountIndex(stack, fnDepth)]++;
    } else if (tok.t === 'op') {
      let op = tok.v;
      if (expectOperand(prev)) {
        if (op === '-') {
          // unary minus → 0 x -  (use 'u' marker with high precedence)
          stack.push({ t: 'op', v: 'u' });
          prev = tok;
          continue;
        }
        if (op === '+') {
          prev = tok;
          continue; // unary plus = no-op
        }
        throw new MathError('SYNTAX', op);
      }
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === 'op') {
          const pTop = PRECEDENCE[top.v];
          const pCur = PRECEDENCE[op];
          if (pTop > pCur || (pTop === pCur && !RIGHT_ASSOC.has(op))) {
            out.push({ t: 'op', v: (stack.pop() as { t: 'op'; v: string }).v });
            continue;
          }
        }
        break;
      }
      stack.push({ t: 'op', v: op });
    } else if (tok.t === 'lp') {
      stack.push(tok);
    } else if (tok.t === 'rp') {
      let found = false;
      while (stack.length) {
        const s = stack.pop()!;
        if (s.t === 'lp') {
          found = true;
          break;
        }
        if (s.t === 'op') out.push({ t: 'op', v: s.v });
        else if (s.t === 'fn') out.push({ t: 'call', v: s.v, argc: 1 });
      }
      if (!found) throw new MathError('UNBALANCED');
      const top = stack[stack.length - 1];
      if (top && top.t === 'fn') {
        stack.pop();
        const argc = argCount.pop()! + 1;
        out.push({ t: 'call', v: top.v, argc });
      }
    } else if (tok.t === 'post') {
      out.push({ t: 'post', v: tok.v });
    }
    prev = tok;
  }
  while (stack.length) {
    const s = stack.pop()!;
    if (s.t === 'lp') throw new MathError('UNBALANCED');
    if (s.t === 'op') out.push({ t: 'op', v: s.v });
    else if (s.t === 'fn') out.push({ t: 'call', v: s.v, argc: argCount.pop()! + 1 });
  }
  return out;
}

function fnCountIndex(stack: unknown[], _fnDepth: number): number {
  // argCount is parallel to count of fn tokens seen so far (minus popped)
  let fns = 0;
  for (const s of stack) if ((s as { t: string }).t === 'fn') fns++;
  return fns - 1;
}

/* ── RPN evaluation ─────────────────────────────────────── */
function evalRpn(rpn: RpnItem[], scope: Record<string, number>, mode: AngleMode): number {
  const st: number[] = [];
  for (const it of rpn) {
    if (it.t === 'num') st.push(it.v);
    else if (it.t === 'name') {
      if (scope[it.v] !== undefined && !Number.isNaN(scope[it.v])) st.push(scope[it.v]);
      else throw new MathError('UNKNOWN_NAME', it.v);
    } else if (it.t === 'post') {
      const a = st.pop();
      if (a === undefined) throw new MathError('SYNTAX');
      st.push(it.v === '%' ? a / 100 : factorial(a));
    } else if (it.t === 'op') {
      if (it.v === 'u') {
        const a = st.pop();
        if (a === undefined) throw new MathError('SYNTAX');
        st.push(-a);
        continue;
      }
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new MathError('SYNTAX');
      switch (it.v) {
        case '+':
          st.push(a + b);
          break;
        case '-':
          st.push(a - b);
          break;
        case '*':
          st.push(a * b);
          break;
        case '/':
          if (b === 0) throw new MathError('DIV_ZERO');
          st.push(a / b);
          break;
        case 'mod':
          if (b === 0) throw new MathError('DIV_ZERO');
          st.push(a % b);
          break;
        case '^':
          st.push(safePow(a, b));
          break;
        default:
          throw new MathError('SYNTAX', it.v);
      }
    } else if (it.t === 'call') {
      const f = FUNCTIONS[it.v];
      if (!f) throw new MathError('UNKNOWN_NAME', it.v);
      const argc = it.argc;
      if (f.arity >= 0 && argc !== f.arity) throw new MathError('BAD_ARG', it.v);
      if (st.length < argc) throw new MathError('SYNTAX');
      const args = st.splice(st.length - argc, argc);
      st.push(f.fn(args, mode));
    }
  }
  if (st.length !== 1) throw new MathError('SYNTAX');
  return st[0];
}

/* ── Public API ─────────────────────────────────────────── */
export interface EvalOptions {
  scope?: Record<string, number>;
  angleMode?: AngleMode;
}

export function evaluate(expression: string, opts: EvalOptions = {}): number {
  const expr = expression.trim();
  if (!expr) throw new MathError('EMPTY');
  const toks = insertImplicit(tokenize(expr));
  const rpn = toRpn(toks);
  const v = evalRpn(rpn, opts.scope ?? {}, opts.angleMode ?? 'rad');
  if (typeof v !== 'number' || Number.isNaN(v)) throw new MathError('SYNTAX');
  if (!Number.isFinite(v)) throw new MathError('OVERFLOW');
  // -0 cleanup
  return v === 0 ? 0 : v;
}

/** Extract variable names (not functions/constants) from an expression. */
export function extractVariables(expression: string): string[] {
  try {
    const toks = insertImplicit(tokenize(expression));
    const vars = new Set<string>();
    for (const t of toks) {
      if (t.t === 'name' && !FUNCTIONS[t.v] && CONSTANTS[t.v] === undefined) vars.add(t.v);
    }
    return [...vars];
  } catch {
    return [];
  }
}

/** Validate an expression without evaluating (structure check). */
export function validateExpression(expression: string): { ok: boolean; error?: MathErrorCode } {
  try {
    const toks = insertImplicit(tokenize(expression));
    const rpn = toRpn(toks);
    // Dummy-scope evaluation to catch structural issues (e.g. trailing operators)
    const scope: Record<string, number> = {};
    for (const it of rpn) if (it.t === 'name') scope[it.v] = 1;
    evalRpn(rpn, scope, 'rad');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof MathError ? e.code : 'SYNTAX' };
  }
}

export const KNOWN_FUNCTIONS = Object.keys(FUNCTIONS);
export const KNOWN_CONSTANTS = Object.keys(CONSTANTS);
