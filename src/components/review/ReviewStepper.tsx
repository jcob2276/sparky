const STEPS = ['Lustro', 'Rozliczenie', 'Kontrakt'] as const;

/** Pasek trzech kroków przeglądu: ukończone i bieżący są wypełnione, reszta cienka. */
export default function ReviewStepper({ step }: { step: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Kroki przeglądu" className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {STEPS.map((label, index) => (
          <span
            key={label}
            aria-hidden="true"
            className={`h-1 rounded-full transition-colors duration-300 ${index <= step ? 'bg-primary' : 'bg-surface-2'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-2xs font-semibold">
        {STEPS.map((label, index) => (
          <span
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={index === step ? 'text-primary' : 'text-text-muted'}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>
    </nav>
  );
}
