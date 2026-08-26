/* MATH ENGINE — core/format : calculator-grade number formatting (tabular, Latin digits) */

/** Pretty-print a raw expression string with spaced math symbols (× ÷ − √ π). */
export function prettyExpr(expr: string): string {
  return expr
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\+/g, ' + ')
    .replace(/-(?=.)/g, ' − ')
    .replace(/\bpi\b/g, 'π')
    .replace(/sqrt\(/g, '√(')
    .replace(/\^/g, '^')
    .replace(/  +/g, ' ')
    .trim();
}

export function formatNumber(n: number, maxSig = 12): string {
  if (Number.isNaN(n)) return 'NaN';
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n === 0) return '0';

  const abs = Math.abs(n);
  // Scientific for very large / very small
  if (abs >= 1e12 || abs < 1e-9) {
    let s = n.toExponential(7);
    s = s.replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
    return s.replace('e', ' × 10^');
  }
  // Round to significant digits to kill float noise
  const rounded = Number(n.toPrecision(maxSig));
  const [intPart, fracPart] = String(Math.abs(rounded)).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const sign = rounded < 0 ? '-' : '';
  return fracPart ? `${sign}${grouped}.${fracPart}` : `${sign}${grouped}`;
}

/** Compact format for keys/buttons (no grouping) */
export function formatPlain(n: number, maxSig = 12): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-9) {
    return n.toExponential(7).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
  }
  return String(Number(n.toPrecision(maxSig)));
}

export function formatTime(ts: number, lang: 'fa' | 'en' = 'fa'): string {
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return hm;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return lang === 'fa' ? `دیروز ${hm}` : `Yesterday ${hm}`;
  }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) + ' ' + hm;
}

export function timeAgo(ts: number, lang: 'fa' | 'en' = 'fa'): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === 'fa' ? 'همین حالا' : 'just now';
  if (m < 60) return lang === 'fa' ? `${m} دقیقه پیش` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === 'fa' ? `${h} ساعت پیش` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return lang === 'fa' ? `${d} روز پیش` : `${d}d ago`;
  return formatTime(ts, lang);
}
