export interface SkeletonProps {
  lines?: number;
  variant?: 'text' | 'card' | 'avatar' | 'stat' | 'block';
  className?: string;
}

/** Loading placeholder with a single shared shimmer (`.ui-skeleton`, disabled under reduced motion). */
function Bone({ className = '', width }: { className?: string; width?: string }) {
  return <div className={`ui-skeleton ${className}`} style={width ? { width } : undefined} />;
}

export default function Skeleton({ lines = 3, variant = 'text', className = '' }: SkeletonProps) {
  const a11y = { role: 'status', 'aria-busy': true, 'aria-label': 'Ładowanie' } as const;

  if (variant === 'block') {
    return <div {...a11y} className={`ui-skeleton rounded-[var(--radius-lg)] ${className}`} />;
  }

  if (variant === 'stat') {
    return (
      <div {...a11y} className={`flex flex-col gap-2 ${className}`}>
        <Bone className="h-2.5 w-1/3" />
        <Bone className="h-8 w-1/2 rounded-[var(--radius-md)]" />
        <Bone className="h-2.5 w-2/3" />
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div {...a11y} className={`flex items-center gap-3 ${className}`}>
        <Bone className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-1/3" />
          <Bone className="h-2.5 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div {...a11y} className={`rounded-[var(--radius-lg)] border border-border-custom bg-surface p-4 space-y-3 ${className}`}>
        <Bone className="h-4 w-2/5" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Bone key={i} className="h-3" width={`${85 - i * 12}%`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div {...a11y} className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className="h-3" width={`${90 - i * 15}%`} />
      ))}
    </div>
  );
}
