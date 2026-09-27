export const N = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const sum = <T,>(list: T[], key: keyof T) => list.reduce((t, x) => t + N(x[key]), 0);

/** Full rupees with Indian digit grouping: ₹1,23,456 */
export const inr = (n: number) => (n < 0 ? '−' : '') + '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');

/** Compact rupees: ₹12.5 L, ₹1.2 Cr */
export const cmp = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
  return s + '₹' + Math.round(a).toLocaleString('en-IN');
};

/** Amount in words shown under money inputs. */
export const words = (v: unknown) => {
  const n = N(v);
  if (n >= 1e7) return (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' crore';
  if (n >= 1e5) return (n / 1e5).toFixed(2).replace(/\.?0+$/, '') + ' lakh';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' thousand';
  return '';
};

export const pct = (a: number, b: number) => (b > 0 ? Math.max(0, Math.min(100, (a / b) * 100)) : 0).toFixed(2) + '%';
