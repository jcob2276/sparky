import { Award, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import type { PracticeEvidence } from '../../lib/growth/growth.types';
import { Pressable } from '../ui/ControlPrimitives';
import { savePracticeEvidences } from '../../lib/growth/growthApi';
import { notify, confirmDialog } from '../../lib/notify';

interface Props {
  userId: string;
  evidences: PracticeEvidence[];
  onRefresh: () => void;
  onOpenAddModal: () => void;
}

const LEVEL_LABELS = {
  try: { label: 'Przetestowane', color: 'text-warning bg-warning/10 border-warning/20' },
  can_do: { label: 'Potrafię wdrożyć', color: 'text-primary bg-primary/10 border-primary/20' },
  apply_regularly: { label: 'Stosuję regularnie', color: 'text-success bg-success/10 border-success/20' },
};

export function GrowthPracticeSection({ userId, evidences, onRefresh, onOpenAddModal }: Props) {
  async function handleDelete(ev: PracticeEvidence) {
    const ok = await confirmDialog(`Czy na pewno usunąć dowód wdrożenia "${ev.title}"?`);
    if (!ok) return;

    const updated = evidences.filter((e) => e.id !== ev.id);
    try {
      await savePracticeEvidences(userId, updated);
      notify('Usunięto wpis.', 'info');
      onRefresh();
    } catch {
      notify('Błąd podczas usuwania.', 'error');
    }
  }

  return (
    <div className="rounded-3xl border border-border-custom/80 bg-surface/70 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success">
            <Award size={18} />
          </div>
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Praktyka & Fakty</p>
            <h3 className="text-sm font-bold text-text-primary">Dowody Wdrożenia w Życie</h3>
          </div>
        </div>
        <Pressable
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:border-primary transition-colors"
        >
          <Plus size={13} />
          <span>Zaloguj Wdrożenie</span>
        </Pressable>
      </div>

      {/* Guardrail Zasada */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-3 text-2xs text-text-secondary leading-relaxed">
        <ShieldAlert size={15} className="text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-text-primary">Zasada Vanguard:</span> Teoria bez wdrożenia to tylko rozrywka. Zapisuj tutaj konkretne sytuacje, w których wiedza zmieniła Twoje zachowanie, decyzję lub wynik w projekcie.
        </div>
      </div>

      {evidences.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom p-6 text-center space-y-2">
          <p className="text-xs text-text-muted">
            Brak zalogowanych dowodów praktyki. Gdy przeczytasz coś i zastosujesz to w pracy, kodzie lub nawyku — kliknij "Zaloguj Wdrożenie".
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {evidences.map((ev) => {
            const meta = LEVEL_LABELS[ev.competenceLevel] || LEVEL_LABELS.try;
            return (
              <div
                key={ev.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-border-custom/60 bg-background/50 p-3.5"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-semibold text-text-muted">{ev.date}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-3xs font-black uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-text-primary leading-snug">{ev.title}</h4>
                  {ev.details && <p className="text-xs text-text-secondary leading-relaxed">{ev.details}</p>}
                </div>

                <div className="shrink-0 flex items-center self-end md:self-center">
                  <Pressable
                    onClick={() => void handleDelete(ev)}
                    className="p-1 text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </Pressable>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
