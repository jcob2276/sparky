import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Extra control shown under the row while the switch is on (e.g. the date or time input). */
  children?: ReactNode;
}

/** iOS settings row with a switch: icon + label on the left, switch on the right. */
export default function TodoSwitchRow({ icon: Icon, label, checked, onChange, children }: Props) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="cursor-pointer flex min-h-11 items-center justify-between gap-3 px-3 text-sm text-text-primary hover:bg-surface-2/40 active:bg-surface-2/70 transition-colors select-none"
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <Icon size={16} className={checked ? 'text-primary' : 'text-text-secondary'} aria-hidden="true" />
        <span className="font-medium">{label}</span>
      </span>
      <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
        {checked ? children : null}
      </div>
      <Pressable
        type="button"
        haptic="none"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className="ios-switch shrink-0 focus-visible:shadow-focus"
        data-on={checked}
      >
        <span className="ios-switch-knob" />
      </Pressable>
    </div>
  );
}
