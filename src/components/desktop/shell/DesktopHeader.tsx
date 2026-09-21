import Button from '../../ui/Button';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Moon, Sun, Fingerprint, ShieldCheck, Smartphone, LayoutGrid } from 'lucide-react';
import OuraRingHeaderBadge from '../health/OuraRingHeaderBadge';

interface DesktopHeaderProps {
  now: string;
  syncing: boolean;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  syncAll: () => void;
  setShowHealth: (v: boolean) => void;
  setShowFundament: (v: boolean) => void;
  onOpenTools?: () => void;
}

export default function DesktopHeader({
  now, syncing, theme,
  setTheme, syncAll, setShowHealth, setShowFundament, onOpenTools,
}: DesktopHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-custom bg-background/95 backdrop-blur-[var(--blur-md)] px-4 sm:px-8 py-3.5 flex items-center gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="font-display text-sm font-black uppercase tracking-[var(--ds-arbitrary-0-3em)] text-primary">Sparky</span>
        <span className="text-2xs font-bold uppercase tracking-wider text-text-muted hidden lg:block">{now}</span>
      </div>
      <div className="hidden xl:flex items-center gap-3 ml-4">
        {[['S','sync'], ['T','trening'], ['W','waga'], ['D','dark']].map(([k, l]) => (
          <span key={k} className="flex items-center gap-1 text-2xs text-text-muted">
            <kbd className="rounded border border-border-custom bg-surface px-1.5 py-0.5 font-mono text-2xs font-black leading-none">{k}</kbd>
            <span>{l}</span>
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Oura ring badge retained in code per architecture, hidden from header UI */}
        {(false as boolean) && <OuraRingHeaderBadge />}
        {onOpenTools && (
          <Button
            onClick={onOpenTools}
            variant="secondary"
            icon={<LayoutGrid size={14} />}
            className="rounded-full p-2 sm:p-2.5"
            title="Katalog Narzędzi Sparky"
          />
        )}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
          <Button onClick={() => setShowHealth(true)} variant="secondary" icon={<ShieldCheck size={14} />} className="rounded-full p-2.5" title="Status zdrowia systemu" />
          <Button onClick={() => setShowFundament(true)} variant="secondary" icon={<Fingerprint size={14} />} className="rounded-full p-2.5" title="Fundament" />
        </div>
        <Button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} variant="secondary" icon={theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-warning" />} className="rounded-full p-2 sm:p-2.5" aria-label={theme === 'light' ? 'Włącz ciemny motyw' : 'Włącz jasny motyw'} />
        <Button onClick={syncAll} variant="secondary" icon={<RefreshCw size={14} className={syncing ? 'animate-spin text-primary' : ''} />} className="rounded-full p-2 sm:p-2.5" disabled={syncing} aria-label="Synchronizuj dane" />
        <Button onClick={() => navigate('/')} variant="outline" size="sm" icon={<Smartphone size={12} />} className="px-2.5 py-1 text-xs">
          <span className="hidden sm:inline">Mobile</span>
        </Button>
      </div>
    </header>
  );
}
