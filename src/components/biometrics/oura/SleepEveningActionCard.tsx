import { CheckCircle2 } from 'lucide-react';

export function SleepEveningActionCard() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
        <CheckCircle2 size={14} /> Zalecenie na dziś wieczór
      </h4>
      <ul className="text-2xs text-text-secondary space-y-1.5 list-disc list-inside font-medium">
        <li>Odcięcie kofeiny najpóźniej do 14:00.</li>
        <li>Ostatni posiłek minimum 2.5 - 3h przed snem, by tętno spoczynkowe spadło przed północą.</li>
        <li>Zimna, zaciemniona sypialnia (18-19°C) dla wydłużenia fazy Deep Sleep.</li>
      </ul>
    </div>
  );
}
