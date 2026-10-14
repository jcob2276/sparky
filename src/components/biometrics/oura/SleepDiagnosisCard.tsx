import { Sparkles } from 'lucide-react';

interface SleepDiagnosisCardProps {
  diagnosis: {
    title: string;
    desc: string;
    status: 'optimal' | 'moderate' | 'low';
  };
}

export function SleepDiagnosisCard({ diagnosis }: SleepDiagnosisCardProps) {
  const borderBgClass =
    diagnosis.status === 'optimal'
      ? 'border-success/30 bg-success/5'
      : diagnosis.status === 'moderate'
      ? 'border-warning/30 bg-warning/5'
      : 'border-danger/30 bg-danger/5';

  const iconClass =
    diagnosis.status === 'optimal'
      ? 'text-success mt-0.5 shrink-0'
      : 'text-warning mt-0.5 shrink-0';

  return (
    <div className={`rounded-2xl border p-4 shadow-2xs ${borderBgClass}`}>
      <div className="flex items-start gap-2.5">
        <Sparkles size={16} className={iconClass} />
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
            {diagnosis.title}
          </h3>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed font-medium">
            {diagnosis.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
