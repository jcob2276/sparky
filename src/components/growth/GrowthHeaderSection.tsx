import { Sparkles, Target, Compass, Edit3 } from 'lucide-react';
import type { SparkyIdentityData } from '../../lib/growth/growth.types';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  identity: SparkyIdentityData | null;
  onEdit: () => void;
}

export function GrowthHeaderSection({ identity, onEdit }: Props) {
  const theme = identity?.development_theme;
  const gap = identity?.development_gap;
  const targetRole = identity?.developed_role;

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-surface to-surface p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass size={18} />
          </div>
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-primary">Kompas Rozwoju</p>
            <h2 className="text-sm font-bold text-text-primary">Główny Fokus & Identyfikacja</h2>
          </div>
        </div>
        <Pressable
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
        >
          <Edit3 size={13} />
          <span>Edytuj</span>
        </Pressable>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Motyw rozwoju */}
        <div className="rounded-2xl border border-border-custom/60 bg-background/50 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-primary">
            <Sparkles size={13} />
            <span>Główny Motyw</span>
          </div>
          <p className="text-sm font-bold text-text-primary leading-snug">
            {theme || 'Nie zdefiniowano motywu'}
          </p>
          <p className="text-2xs text-text-muted">
            {theme ? 'Kierunek, w którym inwestujesz najwięcej uwagi' : 'Kliknij "Edytuj", aby zdefiniować obecny fokus nauki'}
          </p>
        </div>

        {/* Główna luka */}
        <div className="rounded-2xl border border-border-custom/60 bg-background/50 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-warning">
            <Target size={13} />
            <span>Luka Kompetencyjna</span>
          </div>
          <p className="text-sm font-bold text-text-primary leading-snug">
            {gap || 'Brak zdefiniowanej luki'}
          </p>
          <p className="text-2xs text-text-muted">
            {gap ? 'Główna bariera lub wąskie gardło do przepracowania' : 'Zidentyfikuj co realnie blokuje Twój skok jakościowy'}
          </p>
        </div>

        {/* Docelowa rola */}
        <div className="rounded-2xl border border-border-custom/60 bg-background/50 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-text-secondary">
            <Compass size={13} />
            <span>Rola / Poziom Docelowy</span>
          </div>
          <p className="text-sm font-bold text-text-primary leading-snug">
            {targetRole || 'Nie zdefiniowano roli docelowej'}
          </p>
          <p className="text-2xs text-text-muted">
            {targetRole ? 'Standard wykonania, do którego dążysz' : 'Określ standard profesjonalny'}
          </p>
        </div>
      </div>
    </div>
  );
}
