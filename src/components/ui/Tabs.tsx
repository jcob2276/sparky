import { ReactNode } from 'react';
import { haptics } from '../../hooks/useHaptics';

interface Tab {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  const activeIndex = tabs.findIndex((tab) => tab.key === active);
  const total = tabs.length;
  const pillWidth = total > 0 ? `${100 / total}%` : '100%';
  const pillVisible = activeIndex >= 0;

  return (
    <div role="tablist" data-ui="tabs" className={`ui-tabs relative flex gap-1 select-none ${className}`}>
      {/* Hardware-accelerated sliding spring pill */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0.5 left-0 rounded-lg bg-surface-tonal shadow-xs border border-white/5 transition-transform duration-250 ease-[cubic-bezier(0.25,1,0.35,1)] will-change-transform ${
          pillVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: pillWidth,
          transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          tabIndex={active === tab.key ? 0 : -1}
          data-ui="tab"
          onClick={() => {
            if (active !== tab.key) {
              haptics.selection();
              onChange(tab.key);
            }
          }}
          className={`ui-tab relative z-10 flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer touch-manipulation active:scale-[0.96] transition-colors duration-150 ${
            active === tab.key
              ? 'bg-surface-tonal text-primary'
              : 'text-text-muted hover:bg-surface-3/50 hover:text-text-primary'
          }`}
        >
          {tab.icon && <span className="shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
