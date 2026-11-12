interface MoneyProps {
  value: number;
  fractionDigits?: number;
  currency?: string;
  className?: string;
}

/**
 * One way to show an amount everywhere in Finanse: the digits carry the weight, the cents are quieter and the
 * currency is small. Screen readers get the plain formatted amount.
 */
export function Money({ value, fractionDigits = 0, currency = 'PLN', className = '' }: MoneyProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const formatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const parts = formatter.formatToParts(safe);
  return (
    <span className={`tabular-nums ${className}`} aria-label={formatter.format(safe)}>
      {parts.map((part, index) => {
        if (part.type === 'currency') return <span key={index} aria-hidden="true" className="ml-[0.2em] text-[0.55em] font-medium text-text-muted">{part.value}</span>;
        if (part.type === 'literal' && parts[index + 1]?.type === 'currency') return null;
        if (part.type === 'decimal' || part.type === 'fraction') return <span key={index} aria-hidden="true" className="text-text-secondary">{part.value}</span>;
        return <span key={index} aria-hidden="true">{part.value}</span>;
      })}
    </span>
  );
}
