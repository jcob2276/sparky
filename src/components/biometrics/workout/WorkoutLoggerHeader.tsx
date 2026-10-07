import { Activity, ChevronLeft, LayoutGrid, Upload } from 'lucide-react';
import Button from '../../ui/Button';

interface WorkoutLoggerHeaderProps {
  onBack: () => void;
  onAnatomy: () => void;
  onImport: () => void;
  onPresets: () => void;
  isEnteringData?: boolean;
  onFinishEntry?: () => void;
}

export default function WorkoutLoggerHeader({ onBack, onAnatomy, onImport, onPresets, isEnteringData, onFinishEntry }: WorkoutLoggerHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] bg-background/95 border-b border-border-custom px-2 py-2 flex items-center gap-1">
      <Button variant="ghost" onClick={onBack} aria-label="Wróć z treningu" className="!h-11 !w-11 shrink-0 !px-0">
        <ChevronLeft size={22} />
      </Button>
      <h1 className="min-w-0 flex-1 text-lg font-bold text-text-primary">Trening</h1>
      {isEnteringData && <Button variant="tonal" className="sm:hidden" onPointerDown={event => event.preventDefault()} onClick={onFinishEntry}>Gotowe</Button>}
      <div className={`${isEnteringData ? 'hidden sm:flex' : 'flex'} items-center gap-1`}>
        <Button variant="ghost" onClick={onAnatomy} aria-label="Anatomia" title="Mapa zmęczenia mięśni"
          className="!h-11 !px-3" icon={<Activity size={20} />}>
          <span className="hidden sm:inline">Anatomia</span>
        </Button>
        <Button variant="ghost" onClick={onImport} aria-label="Importuj trening" title="Importuj trening"
          className="!h-11 !px-3" icon={<Upload size={20} />}>
          <span className="hidden sm:inline">Importuj</span>
        </Button>
        <Button variant="tonal" onClick={onPresets} aria-label="Zestawy treningowe" title="Zestawy treningowe"
          className="!h-11 !px-3" icon={<LayoutGrid size={20} />}>
          <span className="hidden sm:inline">Zestawy</span>
        </Button>
      </div>
    </header>
  );
}
