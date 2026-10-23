import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

interface CorrelationsHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  daysOfData?: number;
}

export default function CorrelationsHeader({ loading, onRefresh, daysOfData }: CorrelationsHeaderProps) {
  const navigate = useNavigate();
  const subtitle = daysOfData && daysOfData > 0
    ? `Twoje wzorce · ${daysOfData} dni logowania · obserwacje, nie diagnozy`
    : 'Skan odkrywczy · obserwacje, nie diagnozy';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="ui-app-header sticky top-0 z-[var(--z-sticky)] w-full">
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
        <Pressable
          onClick={handleBack}
          aria-label="Wróć do poprzedniego widoku"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-2 hover:text-text-primary shrink-0 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
        </Pressable>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight text-text-primary">
            Korelacje
          </h1>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {subtitle}
          </p>
        </div>
        <Pressable
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Odśwież analizę"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary hover:bg-primary/5 ui-interactive disabled:opacity-50"
          title="Odśwież analizę"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </Pressable>
      </div>
    </header>
  );
}
