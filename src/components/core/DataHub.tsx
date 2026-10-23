import Button from '../ui/Button';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import BrainHealth from '../biometrics/BrainHealth';
import PageHeader from '../shared/PageHeader';

type DataHubProps = {
  onBack?: (() => void) | null;
  embedded?: boolean;
};

export default function DataHub({ onBack = null, embedded = false }: DataHubProps) {
  return (
    <div className={`${embedded ? 'space-y-6' : 'min-h-screen bg-scrim p-6 space-y-8 animate-in fade-in duration-[var(--motion-long)]'}`}>
      {!embedded && (
        <PageHeader
          title="Data Hub"
          subtitle="Reality Sync Console"
          leading={onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="min-h-11 min-w-11 p-2" aria-label="Wróć">
              <ChevronLeft size={24} />
            </Button>
          ) : undefined}
          className="-mx-6 -mt-6"
        />
      )}

      <BrainHealth />



      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <h4 className="text-xs font-semibold text-primary tracking-wide flex items-center gap-2 mb-2">
          <ShieldCheck size={14} /> System Integrity
        </h4>
        <p className="text-2xs text-text-muted font-bold leading-relaxed">
          Dane są przetwarzane lokalnie i używane wyłącznie do kalibracji Twojego "Cienia".
        </p>
      </div>
    </div>
  );
}
