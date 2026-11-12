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
    <div>
      <div className="flex min-h-11 items-center justify-between gap-3 px-3 text-sm text-text-primary">
        <span className="flex items-center gap-2 whitespace-nowrap"><Icon size={16} className="text-text-secondary" aria-hidden="true" />{label}</span>
        {checked ? children : null}
        <Pressable type="button" haptic="none" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
          className="ios-switch shrink-0 focus-visible:shadow-focus" data-on={checked}>
          <span className="ios-switch-knob" />
        </Pressable>
      </div>
    </div>
  );
}
