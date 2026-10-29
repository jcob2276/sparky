import { Pressable } from '../ui/ControlPrimitives';

export function ClarificationConfirmActions({
  submitting,
  onYes,
  onNo,
}: {
  submitting: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Pressable
        onClick={onYes}
        disabled={submitting}
        className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-on-accent ui-interactive active:scale-95 disabled:opacity-[var(--opacity-40)]"
      >
        Tak
      </Pressable>
      <Pressable
        onClick={onNo}
        disabled={submitting}
        className="flex-1 rounded-xl border border-border-custom/30 py-2 text-sm font-semibold text-text-secondary ui-interactive active:scale-95 disabled:opacity-[var(--opacity-40)]"
      >
        Nie
      </Pressable>
    </div>
  );
}
