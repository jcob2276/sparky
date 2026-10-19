import React from 'react';

interface EmptyStateProps {
  icon: string;
  label: string;
  isDragOver?: boolean;
  dragColor?: 'orange' | 'primary';
}

export default function EmptyState({
  icon,
  label,
  isDragOver = false,
  dragColor = 'primary',
}: EmptyStateProps) {
  const activeClass =
    dragColor === 'orange'
      ? 'border-warning bg-warning/5 text-warning scale-[var(--ds-arbitrary-1-01)] shadow-lg shadow-warning/5'
      : 'border-primary bg-primary/5 text-primary scale-[var(--ds-arbitrary-1-01)] shadow-lg shadow-primary/5';

  const inactiveClass =
    dragColor === 'orange'
      ? 'border-border-custom/60 text-text-secondary'
      : 'border-border-custom/60 text-text-secondary';

  return (
    <div
      className={`my-1 rounded-2xl border border-dashed px-4 py-5 text-center ui-interactive duration-[var(--motion-medium)] ${
        isDragOver ? activeClass : inactiveClass
      }`}
    >
      <span className="sr-only">{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
