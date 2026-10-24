import { Sparkles } from 'lucide-react';
import { ControlInput, Pressable } from '../../../ui/ControlPrimitives';
import Spinner from '../../../ui/Spinner';

interface EditNameFieldProps {
  value: string;
  originalName: string;
  onChange: (value: string) => void;
  onReestimate: () => void;
  reestimating: boolean;
  /** Light text for use over the meal photo. */
  onPhoto: boolean;
}

/** Entry name the user can correct; the sparkle button asks the model to re-estimate macros for it. */
export default function EditNameField({
  value, originalName, onChange, onReestimate, reestimating, onPhoto,
}: EditNameFieldProps) {
  const changed = value.trim() !== '' && value.trim() !== originalName;
  const tone = onPhoto ? 'text-white drop-shadow-md placeholder:text-white/50' : 'text-text-primary';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 border-b border-border-custom/60 pb-1">
        <ControlInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onReestimate();
            }
          }}
          aria-label="Nazwa produktu"
          enterKeyHint="done"
          placeholder="Co to właściwie jest?"
          className={`min-w-0 flex-1 border-0 bg-transparent px-0 text-2xl font-semibold leading-tight tracking-tight shadow-none outline-none ring-0 ${tone}`}
        />
        <Pressable
          type="button"
          onClick={onReestimate}
          disabled={!value.trim() || reestimating}
          aria-label="Przelicz makro dla tej nazwy (AI)"
          title="Przelicz makro (AI)"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border active:scale-95 ui-interactive disabled:opacity-50 ${
            changed
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-border-custom/60 bg-surface-solid/50 text-text-muted backdrop-blur-md'
          }`}
        >
          {reestimating ? <Spinner size="sm" /> : <Sparkles size={18} aria-hidden="true" />}
        </Pressable>
      </div>
      {changed && !reestimating && (
        <p className={`text-2xs font-medium ${onPhoto ? 'text-white/80 drop-shadow' : 'text-text-muted'}`}>
          Dotknij ✨, żeby AI przeliczyło kalorie i makro dla nowej nazwy.
        </p>
      )}
    </div>
  );
}
