import { Activity } from 'lucide-react';
import type { MarkerContext } from '../../../lib/health/markerContext';

/** Fakty z okresu przed badaniem. To informacja, nie diagnoza: nie mówi, co spowodowało wynik. */
export default function MedicalMarkerContext({ context }: { context: MarkerContext }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border-custom bg-background/30 p-3">
      <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
        <Activity size={12} className="text-primary" /> {context.title} ({context.from.slice(5)} – {context.to.slice(5)})
      </p>
      <ul className="space-y-1 text-sm text-text-primary">
        {context.lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="text-2xs text-text-muted">To tylko dane z Twojej aplikacji z okresu przed badaniem, nie wyjaśnienie wyniku. Pytania o przyczyny zostaw lekarzowi.</p>
    </div>
  );
}
