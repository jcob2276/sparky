import { Activity, Calendar, Dna, FileText, FlaskConical, Scale, TrendingUp } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface MedicalLabNavProps {
  onSelectSection: (id: string) => void;
}

const SECTIONS = [
  { id: 'przeglad', label: 'Przegląd', icon: Activity },
  { id: 'wyniki', label: 'Wyniki & Markery', icon: FlaskConical },
  { id: 'trendy', label: 'Trendy', icon: TrendingUp },
  { id: 'dokumenty', label: 'Dokumenty', icon: FileText },
  { id: 'sugestie', label: 'Planowanie', icon: Calendar },
  { id: 'scores', label: 'Biology Scores', icon: Dna },
  { id: 'cialo', label: 'Skład Ciała', icon: Scale },
];

export default function MedicalLabNav({ onSelectSection }: MedicalLabNavProps) {
  return (
    <nav aria-label="Nawigacja laboratorium" className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-2.5 bg-background/90 backdrop-blur-md border-b border-border-custom/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {SECTIONS.map((sec) => {
        const Icon = sec.icon;
        return (
          <Pressable
            key={sec.id}
            onClick={() => onSelectSection(sec.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom bg-surface-1 hover:bg-surface-2 hover:border-border-custom text-2xs font-bold text-text-secondary whitespace-nowrap ui-interactive active:scale-95 cursor-pointer shrink-0"
          >
            <Icon size={12} className="text-primary shrink-0" />
            <span>{sec.label}</span>
          </Pressable>
        );
      })}
    </nav>
  );
}
