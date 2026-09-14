import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface HorizonHeaderProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon: LucideIcon;
  badge?: ReactNode;
}

export default function HorizonHeader({ eyebrow, title, description, icon: Icon, badge }: HorizonHeaderProps) {
  return (
    <header className="px-1 pb-2 pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Icon size={15} aria-hidden="true" /> {eyebrow}
        </p>
        {badge}
      </div>
      <h1 className="ui-screen-title mt-2 text-text-primary">
        {title}
      </h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>}
    </header>
  );
}
