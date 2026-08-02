import { Check, Circle } from 'lucide-react';
import { Card } from '../../ui/Card';

interface Props {
  reflectionRequired: boolean;
  reflectionReady: boolean;
  filledCount: number;
}

function ProgressStep({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-accent">
      {complete ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-accent text-direction">
          <Check size={12} strokeWidth={3} aria-hidden="true" />
        </span>
      ) : (
        <Circle size={20} className="opacity-70" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

export default function PowerListSetupHeader({
  reflectionRequired,
  reflectionReady,
  filledCount,
}: Props) {
  const planReady = filledCount === 5;

  return (
    <Card
      as="header"
      variant="hero"
      padding="1.5rem"
      data-ritual-hero="true"
      className="space-y-5"
    >
      <div>
        <p className="text-sm font-semibold text-on-accent/80">Najbliższy ruch</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-on-accent">
          {reflectionReady ? 'Ułóż plan dnia' : 'Domknij wczoraj'}
        </h2>
        <p className="mt-2 text-sm font-medium text-on-accent/80">
          {reflectionReady ? `${filledCount} z 5 zwycięstw` : 'Jedna krótka refleksja'}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Postęp rytuału startu">
        <ProgressStep complete={reflectionReady}>
          {reflectionRequired ? 'Refleksja' : 'Wczoraj domknięte'}
        </ProgressStep>
        <ProgressStep complete={planReady}>Plan {filledCount}/5</ProgressStep>
      </div>
    </Card>
  );
}
