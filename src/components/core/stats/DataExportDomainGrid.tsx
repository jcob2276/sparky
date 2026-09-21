import { Dumbbell, Scale, Utensils, BookOpen, Check, Moon, Smartphone, ShieldCheck, Compass } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface DataExportDomainGridProps {
  includeWorkouts: boolean;
  setIncludeWorkouts: (v: boolean) => void;
  includeBody: boolean;
  setIncludeBody: (v: boolean) => void;
  includeNutrition: boolean;
  setIncludeNutrition: (v: boolean) => void;
  includeJournal: boolean;
  setIncludeJournal: (v: boolean) => void;
  includeOura: boolean;
  setIncludeOura: (v: boolean) => void;
  includeHabits: boolean;
  setIncludeHabits: (v: boolean) => void;
  includeActivityWatch: boolean;
  setIncludeActivityWatch: (v: boolean) => void;
  includeFundament: boolean;
  setIncludeFundament: (v: boolean) => void;
}

interface DomainItem {
  label: string;
  sub: string;
  icon: typeof Dumbbell;
  active: boolean;
  toggle: () => void;
}

function DomainCardItem({ item }: { item: DomainItem }) {
  const Icon = item.icon;
  return (
    <Pressable
      onClick={item.toggle}
      className={`flex items-center justify-between p-3 rounded-xl border ui-interactive text-left cursor-pointer ${
        item.active
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : 'border-border-custom bg-surface opacity-60 hover:opacity-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-1.5 rounded-lg ${item.active ? 'bg-primary text-on-accent' : 'bg-surface-2 text-text-muted'}`}>
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-primary truncate">{item.label}</p>
          <p className="text-3xs text-text-muted truncate">{item.sub}</p>
        </div>
      </div>

      <div
        className={`w-4 h-4 rounded-md border flex items-center justify-center ui-interactive ml-2 shrink-0 ${
          item.active ? 'bg-primary border-primary text-on-accent' : 'border-border-custom bg-surface'
        }`}
      >
        {item.active && <Check size={10} />}
      </div>
    </Pressable>
  );
}

function getDomainsList(p: DataExportDomainGridProps): DomainItem[] {
  return [
    { label: 'Trening & Kardio', sub: 'Siłownia, serie, tonaż, Garmin / Strava', icon: Dumbbell, active: p.includeWorkouts, toggle: () => p.setIncludeWorkouts(!p.includeWorkouts) },
    { label: 'Pomiary Ciała', sub: 'Waga, obwody, BF%, WHR', icon: Scale, active: p.includeBody, toggle: () => p.setIncludeBody(!p.includeBody) },
    { label: 'Dieta & Paliwo', sub: 'Kalorie, makro, posiłki Sparky', icon: Utensils, active: p.includeNutrition, toggle: () => p.setIncludeNutrition(!p.includeNutrition) },
    { label: 'Sen & Regeneracja', sub: 'Oura: sen, gotowość, HRV, tętno', icon: Moon, active: p.includeOura, toggle: () => p.setIncludeOura(!p.includeOura) },
    { label: 'Screen Time & Cyfrowy Ślad', sub: 'Telefon, nocne użycie, sesje PC', icon: Smartphone, active: p.includeActivityWatch, toggle: () => p.setIncludeActivityWatch(!p.includeActivityWatch) },
    { label: 'Dyscyplina & Lenie', sub: 'Streak, wpadki, godziny, triggery', icon: ShieldCheck, active: p.includeHabits, toggle: () => p.setIncludeHabits(!p.includeHabits) },
    { label: 'Notatnik & Telegram', sub: 'Zapiski, strumień Sparky, refleksje', icon: BookOpen, active: p.includeJournal, toggle: () => p.setIncludeJournal(!p.includeJournal) },
    { label: 'Fundament & Wizja', sub: 'Tożsamość, zasady, cele życiowe', icon: Compass, active: p.includeFundament, toggle: () => p.setIncludeFundament(!p.includeFundament) },
  ];
}

export function DataExportDomainGrid(props: DataExportDomainGridProps) {
  const selectAll = () => {
    props.setIncludeWorkouts(true);
    props.setIncludeBody(true);
    props.setIncludeNutrition(true);
    props.setIncludeOura(true);
    props.setIncludeHabits(true);
    props.setIncludeActivityWatch(true);
    props.setIncludeJournal(true);
    props.setIncludeFundament(true);
  };

  const selectBody = () => {
    props.setIncludeWorkouts(true);
    props.setIncludeBody(true);
    props.setIncludeNutrition(true);
    props.setIncludeOura(true);
    props.setIncludeHabits(false);
    props.setIncludeActivityWatch(false);
    props.setIncludeJournal(false);
    props.setIncludeFundament(false);
  };

  const selectMind = () => {
    props.setIncludeWorkouts(false);
    props.setIncludeBody(false);
    props.setIncludeNutrition(false);
    props.setIncludeOura(false);
    props.setIncludeHabits(true);
    props.setIncludeActivityWatch(true);
    props.setIncludeJournal(true);
    props.setIncludeFundament(true);
  };

  const domains = getDomainsList(props);
  const activeCount = domains.filter((d) => d.active).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-3xs font-bold uppercase tracking-wider text-text-muted">
          Domeny raportu ({activeCount}/8)
        </label>
        <div className="flex items-center gap-1 flex-wrap">
          <Pressable
            onClick={selectAll}
            className="px-2 py-0.5 rounded-md text-3xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-border-custom"
          >
            Pełny OS
          </Pressable>
          <Pressable
            onClick={selectBody}
            className="px-2 py-0.5 rounded-md text-3xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-border-custom"
          >
            Ciało & Biometria
          </Pressable>
          <Pressable
            onClick={selectMind}
            className="px-2 py-0.5 rounded-md text-3xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-border-custom"
          >
            Umysł & Dyscyplina
          </Pressable>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {domains.map((d) => (
          <DomainCardItem key={d.label} item={d} />
        ))}
      </div>
    </div>
  );
}
