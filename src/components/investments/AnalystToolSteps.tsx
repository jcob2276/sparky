import { FC, useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

const STEPS = ['Pobieram dane…', 'Liczę wskaźniki…', 'Rysuję wykres…', 'Piszę odpowiedź…'];
const STEP_MS = 2200;

/** Pasek kroków narzędzi — wskaźnik postępu czasowy (backend nie streamuje statusów). */
export const AnalystToolSteps: FC<{ question: string }> = ({ question }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((i) => Math.min(i + 1, STEPS.length - 1)), STEP_MS);
    return () => window.clearInterval(id);
  }, []);
  const hint = question.length > 48 ? `${question.slice(0, 48)}…` : question;

  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-border-custom bg-surface-2/50 p-3 space-y-1.5">
      <p className="text-2xs font-mono text-text-muted">Analityk AI pracuje nad: {hint}</p>
      <ol className="flex flex-wrap gap-x-4 gap-y-1">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs font-mono ${
              i < active ? 'text-text-secondary' : i === active ? 'text-primary font-semibold' : 'text-text-muted'
            }`}
          >
            {i < active ? <Check size={12} /> : i === active ? <Loader2 size={12} className="animate-spin" /> : <span className="w-3" />}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
};
