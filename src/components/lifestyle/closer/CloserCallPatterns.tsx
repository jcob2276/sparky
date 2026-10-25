import { ArrowUpRight, Check } from 'lucide-react';
import type { CallPatterns } from '../../../lib/closer/closerPatterns';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';

const MIN_ANALYZED = 3;

/** Wzorce między rozmowami: etapy, które wracają jako „do przećwiczenia”, i najczęstsza mocna strona. */
export default function CloserCallPatterns({ patterns, onOpen }: { patterns: CallPatterns; onOpen: (callId: string) => void }) {
  if (patterns.analyzed < MIN_ANALYZED || (!patterns.practice.length && !patterns.strength)) return null;
  return <Card variant="grouped" padding="0" aria-label="Co się powtarza w rozmowach">
    <div className="space-y-1 border-b border-border-custom px-4 py-4">
      <h4 className="text-base font-semibold text-text-primary">Co się powtarza</h4>
      <p className="text-sm text-text-secondary">Etapy z {patterns.analyzed} przeanalizowanych rozmów. To obserwacje AI, nie wyrok.</p>
    </div>
    <ul className="divide-y divide-border-custom">
      {patterns.practice.map(pattern => <li key={pattern.phase} className="space-y-2 px-4 py-4">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-text-primary"><ArrowUpRight size={16} className="text-warning" />{pattern.label}</span>
          <span className="text-xs text-text-secondary">do przećwiczenia w {pattern.calls} z {patterns.analyzed}</span>
        </p>
        {pattern.latest && <>
          <p className="text-sm leading-6 text-text-secondary">Ostatni eksperyment: {pattern.latest.experiment}</p>
          <Button variant="ghost" size="sm" onClick={() => onOpen(pattern.latest!.callId)}
            aria-label={`Otwórz rozmowę: ${pattern.latest.title}`}>Otwórz rozmowę</Button>
        </>}
      </li>)}
      {patterns.strength && <li className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Check size={16} className="text-success" />Mocna strona: {patterns.strength.label}</span>
        <span className="text-xs text-text-secondary">warto powtarzać w {patterns.strength.calls} z {patterns.analyzed}</span>
      </li>}
    </ul>
  </Card>;
}
