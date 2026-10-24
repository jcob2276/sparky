import type { MeasureGuide } from '../../../lib/health/measureGuides';

/** Prosta sylwetka z zaznaczonym miejscem pomiaru; rysowana kodem, więc działa offline i zgadza się z motywem. */
export default function MeasureDiagram({ guide }: { guide: MeasureGuide }) {
  const mark = guide.mark;
  return (
    <svg viewBox="0 0 120 230" className="mx-auto h-48 w-auto" role="img" aria-label={`Miejsce pomiaru: ${guide.label}`}>
      <g className="fill-surface-3 stroke-border-custom" strokeWidth="1">
        <circle cx="60" cy="20" r="13" />
        <rect x="54" y="31" width="12" height="11" rx="3" />
        <path d="M34 48 C44 41 76 41 86 48 L82 84 C80 98 80 110 84 134 L36 134 C40 110 40 98 38 84 Z" />
        <rect x="46" y="130" width="14" height="92" rx="7" />
        <rect x="60" y="130" width="14" height="92" rx="7" />
      </g>
      <g className="stroke-surface-3" strokeWidth="9" strokeLinecap="round">
        <line x1="28" y1="52" x2="20" y2="114" />
        <line x1="92" y1="52" x2="100" y2="114" />
      </g>
      {mark && (
        <g className="text-primary" stroke="currentColor" strokeLinecap="round">
          <line x1={mark.x1} y1={mark.y} x2={mark.x2} y2={mark.y} strokeWidth="2.5" strokeDasharray="4 3" />
          <circle cx={mark.x1} cy={mark.y} r="2.6" fill="currentColor" />
          <circle cx={mark.x2} cy={mark.y} r="2.6" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
