import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/** Zmiana względem poprzednich rozmów; kolor zależy od tego, w którą stronę zmiana jest dobra. */
export default function CloserTrendDelta({ delta, better }: { delta: number | null; better: 'lower' | 'higher' | 'none' }) {
  if (delta === null) return <span className="text-xs text-text-secondary">brak porównania</span>;
  if (delta === 0) return <span className="flex items-center gap-1 text-xs text-text-secondary"><Minus size={14} />bez zmian</span>;
  const up = delta > 0;
  const tone = better === 'none' ? 'text-text-secondary' : (up === (better === 'higher') ? 'text-success' : 'text-danger');
  return <span className={`flex items-center gap-1 text-xs font-medium ${tone}`}>
    {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{up ? '+' : ''}{delta.toString().replace('.', ',')}
  </span>;
}
