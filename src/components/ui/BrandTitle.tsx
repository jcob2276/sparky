interface BrandTitleProps { className?: string; }

export function BrandTitle({ className = '' }: BrandTitleProps) {
  const word = 'Sparky';
  const body = word.slice(0, -1);
  const last = word.slice(-1);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} className="shrink-0" />
      <span style={{ letterSpacing: 'var(--ds-inline-style-0-25em)', fontWeight: 'var(--ds-inline-style-900)', textTransform: 'uppercase' }}>
        {body}
        <span style={{ color: 'var(--color-primary)' }}>{last}</span>
      </span>
    </span>
  );
}
