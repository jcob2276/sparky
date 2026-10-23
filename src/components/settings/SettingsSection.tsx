import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Jedna karta ustawień: kafelek ikony, tytuł w sentence-case, opcjonalny opis i treść. */
export default function SettingsSection({ icon, title, description, children, className = '' }: SettingsSectionProps) {
  return (
    <Card padding="1rem" className={`ui-surface-lift space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-3 text-text-secondary">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-text-primary">{title}</h2>
          {description ? <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}
