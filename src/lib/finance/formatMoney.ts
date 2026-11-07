export function formatPln(value: number, fractionDigits = 0): string {
  return formatCurrency(value, 'PLN', fractionDigits);
}

export function formatCurrency(value: number, currency = 'PLN', fractionDigits = 2): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatMonths(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 mies.';
  if (value < 12) return `${value.toFixed(1)} mies.`;
  const years = value / 12;
  return `${years.toFixed(1)} lat`;
}
