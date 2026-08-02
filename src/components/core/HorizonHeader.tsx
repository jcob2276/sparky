import type { LucideIcon } from 'lucide-react';

interface HorizonHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function HorizonHeader({ eyebrow, title, description, icon: Icon }: HorizonHeaderProps) {
  return (
    <header className="px-1 pb-2 pt-3">
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Icon size={15} aria-hidden="true" /> {eyebrow}
      </p>
      <h1 className="ui-screen-title mt-3 text-text-primary">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>
    </header>
  );
}
