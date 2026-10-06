import { Shield, Zap, Wallet, Target, X } from 'lucide-react';
import type { PlanSlotItem } from '../../../lib/voicePlanningApi';
import Button from '../../ui/Button';

interface Props {
  slots: PlanSlotItem[];
  onClearSlot: (index: number) => void;
  onEditSlot: (index: number, title: string) => void;
}

const META = [
  { label: 'Ciało', icon: Shield, badge: 'text-success bg-success/15 border-success/30' },
  { label: 'Duch', icon: Zap, badge: 'text-primary bg-primary/15 border-primary/30' },
  { label: 'Konto', icon: Wallet, badge: 'text-warning bg-warning/15 border-warning/30' },
  { label: 'Ruch 4', icon: Target, badge: 'text-text-muted bg-surface-2 border-border-custom/40' },
  { label: 'Ruch 5', icon: Target, badge: 'text-text-muted bg-surface-2 border-border-custom/40' },
];

export default function VoicePlanSlotsPreview({ slots, onClearSlot }: Props) {
  const filledCount = slots.filter((s) => Boolean(s.title.trim())).length;

  return (
    <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3 space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">
          5 Priorytetów Dnia
        </span>
        <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-2 border border-border-custom/40 text-text-secondary">
          {filledCount}/5
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {slots.map((slot, index) => {
          const meta = META[index] ?? META[3];
          const Icon = meta.icon;
          const hasTitle = Boolean(slot.title.trim());

          return (
            <div
              key={slot.slot}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                hasTitle
                  ? 'border-border-custom/60 bg-surface'
                  : 'border-dashed border-border-custom/40 bg-surface/20'
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="size-5 rounded-full bg-border-custom/30 flex items-center justify-center text-2xs font-bold text-text-muted">
                  {index + 1}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-wider border ${meta.badge}`}
                >
                  <Icon size={10} />
                  {meta.label}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {hasTitle ? (
                  <p className="text-xs font-semibold text-text-primary truncate">
                    {slot.title}
                  </p>
                ) : (
                  <p className="text-xs italic text-text-muted">
                    Oczekiwanie na szczegóły…
                  </p>
                )}
              </div>

              {hasTitle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClearSlot(index)}
                  icon={<X size={12} />}
                  aria-label={`Wyczyść ${meta.label}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
