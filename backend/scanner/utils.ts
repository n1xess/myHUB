export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parsePrice(value: unknown) {
  if (typeof value === 'number') return value;
  if (!value) return null;

  const cleaned = String(value).replace(/[^\d.,-]/g, '');
  const normalized = cleaned.includes('.') && cleaned.includes(',')
    ? cleaned.replaceAll(',', '')
    : cleaned.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeName(name: string) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
