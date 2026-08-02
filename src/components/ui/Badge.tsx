export interface BadgeProps {
  count?: number;
  variant?: 'count' | 'dot' | 'tag';
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Badge({ count, variant = 'count', color, className = '', children }: BadgeProps) {
  if (variant === 'dot') {
    return (
      <span
        data-ui="badge"
        data-variant="dot"
        className={`ui-badge inline-block h-2 w-2 rounded-full ${color ? '' : 'bg-primary'} ${className}`}
        style={color ? { backgroundColor: color } : undefined}
      />
    );
  }

  if (variant === 'tag') {
    return (
      <span
        data-ui="badge"
        data-variant="tag"
        className={`ui-badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          color ? '' : 'bg-primary/10 text-primary'
        } ${className}`}
        style={color ? { backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`, color } : undefined}
      >
        {children}
      </span>
    );
  }

  // variant === 'count'
  if (count === undefined || count === null) return null;

  return (
    <span
      data-ui="badge"
      data-variant="count"
      className={`ui-badge inline-flex items-center justify-center min-w-[var(--ds-arbitrary-18px)] h-[var(--ds-arbitrary-18px-coll-2)] rounded-full px-1 text-xs font-bold ${
        color ? '' : 'bg-primary text-on-accent'
      } ${className}`}
      style={color ? { backgroundColor: color, color: 'var(--on-accent)' } : undefined}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
