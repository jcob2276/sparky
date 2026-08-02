import { ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div role="tablist" data-ui="tabs" className={`ui-tabs flex gap-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          tabIndex={active === tab.key ? 0 : -1}
          data-ui="tab"
          onClick={() => onChange(tab.key)}
          className={`ui-tab flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
            active === tab.key
              ? 'bg-surface-tonal text-primary'
              : 'text-text-muted hover:bg-surface-3 hover:text-text-primary'
          }`}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
