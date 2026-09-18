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
    <header className="sticky top-0 z-[var(--z-sticky)] w-full border-b border-border-custom bg-background/95 backdrop-blur-[var(--blur-md)]">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <Pressable
          onClick={handleBack}
          aria-label="Wróć do poprzedniego widoku"
          className="rounded-xl border border-border-custom p-2.5 text-text-muted hover:text-text-primary shrink-0 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </Pressable>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-black tracking-tight text-text-primary">
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
          className="rounded-xl p-2.5 text-primary border border-transparent hover:border-primary/20 hover:bg-primary/5 ui-interactive disabled:opacity-50"
          title="Odśwież analizę"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Pressable>
      </div>
    </header>
  );
}
