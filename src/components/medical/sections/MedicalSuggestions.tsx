import { useState } from 'react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { Calendar, Bell, EyeOff } from 'lucide-react';
import {
  categorizeRetestSuggestions,
  type RetestSuggestion,
} from '../../../lib/health/medicalRetestSuggestions';
import { ControlInput } from '../../ui/ControlPrimitives';

interface MedicalSuggestionsProps {
  suggestions: RetestSuggestion[];
  loading: boolean;
  busyId?: string | null;
  onHide: (suggestion: RetestSuggestion) => void;
  onSnooze: (suggestion: RetestSuggestion) => void;
  onPlanInCalendar: (suggestion: RetestSuggestion, note: string) => void;
}

export default function MedicalSuggestions({
  suggestions,
  loading,
  busyId,
  onHide,
  onSnooze,
  onPlanInCalendar,
}: MedicalSuggestionsProps) {
  // Draft pytania do lekarza — trafia do opisu wydarzenia w kalendarzu przy planowaniu.
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({});

  const categorized = categorizeRetestSuggestions(suggestions);

  const renderCategoryList = (title: string, items: RetestSuggestion[], badgeColor: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <span className={`text-3xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
          {title}
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="outline"
              padding="1rem"
              className="bg-background/20 border-border-custom/50 flex flex-col justify-between space-y-4"
            >
              <div>
                <h4 className="text-xs font-bold text-text-primary leading-tight">{item.title}</h4>
                <p className="text-3xs text-text-secondary mt-1.5 leading-relaxed">{item.reason}</p>
              </div>

              {title === 'Do omówienia ze specjalistą' && (
                <div className="space-y-1.5">
                  <label className="text-2xs font-black uppercase text-text-muted">Notatka do omówienia / Pytanie</label>
                  <ControlInput
                    type="text"
                    placeholder="Wpisz o co zapytać lekarza (dopisze się do terminu)..."
                    value={doctorNotes[item.id] ?? ''}
                    onChange={(e) => setDoctorNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full bg-background/50 border border-border-custom rounded-lg px-2 py-1 text-3xs focus:outline-none focus:border-primary text-text-primary"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-custom/40">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => onSnooze(item)}
                  title="Ukryj na 30 dni"
                >
                  <Bell size={10} /> Przypomnij później
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => onPlanInCalendar(item, doctorNotes[item.id] ?? '')}
                  title="Dodaj termin badania do kalendarza (za 14 dni, 8:00)"
                >
                  <Calendar size={10} /> Zaplanuj badanie
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => onHide(item)}
                  className="text-text-muted"
                  title="Ukryj na stałe"
                >
                  <EyeOff size={10} /> Ukryj
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border-custom/50 pb-3">
        <h2 className="text-lg font-black uppercase font-display">Planowanie i Sugestie</h2>
        <p className="text-2xs text-text-muted mt-0.5">Automatyczne wnioski oponujące o kolejne kroki diagnostyczne</p>
      </div>

      {loading ? (
        <p className="text-xs text-text-muted italic">Analizowanie brakujących markerów...</p>
      ) : suggestions.length === 0 ? (
        <p className="text-xs text-text-muted italic">Brak nowych rekomendacji. Panele są aktualne i kompletne.</p>
      ) : (
        <div className="space-y-6">
          {renderCategoryList('Do omówienia ze specjalistą', categorized.toDiscuss, 'bg-danger/10 text-danger')}
          {renderCategoryList('Warto potwierdzić', categorized.toVerify, 'bg-warning/10 text-warning')}
          {renderCategoryList('Warto odświeżyć', categorized.toRefresh, 'bg-primary/10 text-primary')}
          {renderCategoryList('Brakuje do pełnego obrazu', categorized.missing, 'bg-border-custom text-text-muted')}
        </div>
      )}
    </div>
  );
}
