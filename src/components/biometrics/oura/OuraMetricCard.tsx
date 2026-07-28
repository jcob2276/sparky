import type { LucideIcon } from 'lucide-react';

interface OuraMetricCardProps {
  accent: 'blue' | 'green' | 'purple' | 'orange';
  icon: LucideIcon;
  label: string;
  status?: string | null;
  value: string;
  onClick?: () => void;
}

const ACCENTS = {
  blue: 'bg-info/15 text-info',
  green: 'bg-success/15 text-success',
  purple: 'bg-primary/15 text-primary',
  orange: 'bg-warning/15 text-warning',
};

export function OuraMetricCard({
  accent,
  icon: Icon,
  label,
  onClick,
  status,
  value,
}: OuraMetricCardProps) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag
      className="group min-h-44 w-full rounded-xl border border-white/5 bg-surface-2 p-5 text-left transition-transform duration-200 active:scale-95"
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          {status && <p className="mt-1 text-xs text-text-muted">{status}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ACCENTS[accent]}`}>
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-10 text-4xl font-light tracking-tight text-white">{value}</p>
    </Tag>
  );
}
