export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'CNY', 'CHF', 'SEK', 'NZD', 'ZAR', 'BRL', 'MXN'] as const;

/** Approximate units per 1 USD, used only to combine dashboards on the Home page. Edit freely. */
export const RATES_PER_USD: Record<string, number> = {
  USD: 1, INR: 84, EUR: 0.92, GBP: 0.78, AUD: 1.52, CAD: 1.37, SGD: 1.34, AED: 3.67, JPY: 150,
  CNY: 7.2, CHF: 0.88, SEK: 10.5, NZD: 1.65, ZAR: 18.2, BRL: 5.5, MXN: 18.5,
};

export function minorDigits(cur: string): number {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function toMinor(major: number, cur: string): number {
  return Math.round(major * 10 ** minorDigits(cur));
}

/** "1,500.50" -> minor units (integer). Returns null when empty/invalid. */
export function parseMoneyInput(raw: string, cur: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? toMinor(n, cur) : null;
}

export function minorToInput(minor: number, cur: string): string {
  const d = minorDigits(cur);
  const v = minor / 10 ** d;
  return d === 0 ? String(Math.round(v)) : v.toFixed(d).replace(/\.?0+$/, (m) => (m === '.00' || /^\.0+$/.test(m) ? '' : m));
}

const locale = (cur: string) => (cur === 'INR' ? 'en-IN' : 'en-US');

export function formatMoney(minor: number, cur: string, compact = false): string {
  const major = minor / 10 ** minorDigits(cur);
  try {
    return new Intl.NumberFormat(locale(cur), {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: compact ? 1 : minorDigits(cur),
      notation: compact ? 'compact' : 'standard',
    }).format(major);
  } catch {
    return `${cur} ${major.toFixed(2)}`;
  }
}

export function convertMinor(minor: number, from: string, to: string): number {
  if (from === to) return minor;
  const rf = RATES_PER_USD[from];
  const rt = RATES_PER_USD[to];
  if (!rf || !rt) return minor;
  const major = minor / 10 ** minorDigits(from);
  return Math.round((major / rf) * rt * 10 ** minorDigits(to));
}
