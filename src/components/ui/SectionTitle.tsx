import type { ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
  /** Optional trailing slot (count, link, action). */
  trailing?: ReactNode;
  /** Heading level to render; visual size stays the same. */
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * The one section heading: 15px, semibold, sentence case, no tracking tricks.
 * Replaces `text-3xs font-black uppercase tracking-widest` eyebrows.
 */
export default function SectionTitle({ children, trailing, as: Tag = 'h2', className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      <Tag className="min-w-0 text-sm font-semibold leading-snug tracking-tight text-text-primary">{children}</Tag>
      {trailing && <div className="shrink-0 text-xs text-text-muted">{trailing}</div>}
    </div>
  );
}
