import { Sparkles } from 'lucide-react';
import { ControlTextarea, Pressable } from '../../../ui/ControlPrimitives';
import Spinner from '../../../ui/Spinner';

interface EditNameFieldProps {
  value: string;
  originalName: string;
  onChange: (value: string) => void;
  onReestimate: () => void;
  reestimating: boolean;
  /** Result of the last re-estimate; shown until the name is edited again. */
  estimateNote: string | null;
  /** Light text for use over the meal photo. */
  onPhoto: boolean;
}

/** Entry name the user can correct, with an explicit button asking the model to re-estimate macros for it. */
export default function EditNameField({
  value, originalName, onChange, onReestimate, reestimating, estimateNote, onPhoto,
}: EditNameFieldProps) {
  const changed = value.trim() !== '' && value.trim() !== originalName;
  const tone = onPhoto ? 'text-white drop-shadow-md placeholder:text-white/50' : 'text-text-primary';
  const noteTone = onPhoto ? 'text-white drop-shadow' : 'text-success';
  return (
    <div className="space-y-2">
      <ControlTextarea
        value={value}
        rows={2}
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
        className={`w-full resize-none border-0 border-b border-border-custom/60 bg-transparent px-0 pb-1 text-2xl font-semibold leading-tight tracking-tight shadow-none ring-0 ${tone}`}
      />
      <Pressable
        type="button"
        onClick={onReestimate}
        disabled={!value.trim() || reestimating}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-semibold active:scale-95 ui-interactive disabled:opacity-60 ${
          changed
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-border-custom/60 bg-surface-solid/50 text-text-primary backdrop-blur-md'
        }`}
      >
        {reestimating ? <Spinner size="sm" /> : <Sparkles size={16} aria-hidden="true" />}
        <span>{reestimating ? 'AI liczy…' : changed ? 'Przelicz makro dla nowej nazwy (AI)' : 'Przelicz makro ponownie (AI)'}</span>
      </Pressable>
      {estimateNote && <p role="status" className={`text-2xs font-semibold ${noteTone}`}>{estimateNote}</p>}
    </div>
  );
}
