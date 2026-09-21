import { useState, useId } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlTextarea, Pressable } from '../../ui/ControlPrimitives';
import {
  parseStrongCsv,
  parseFitNotesCsv,
  mapHevyWorkoutsJson,
  importedSessionToWorkoutExercises,
  type ImportedWorkoutSession,
} from '../../../lib/health/workoutImporters';
import type { WorkoutExercise } from '../../../lib/health/workout';
import { notify } from '../../../lib/notify';

interface WorkoutImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (exercises: WorkoutExercise[], workoutName?: string) => void;
}

type ImportSource = 'strong' | 'hevy' | 'fitnotes';

// eslint-disable-next-line max-lines-per-function
export default function WorkoutImportModal({
  isOpen,
  onClose,
  onImport,
}: WorkoutImportModalProps) {
  const fileInputId = useId();
  const [source, setSource] = useState<ImportSource>('strong');
  const [content, setContent] = useState('');
  const [parsedSessions, setParsedSessions] = useState<ImportedWorkoutSession[]>([]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = (text: string, currentSource: ImportSource) => {
    setContent(text);
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedSessions([]);
      return;
    }

    try {
      let sessions: ImportedWorkoutSession[] = [];
      if (currentSource === 'strong') {
        sessions = parseStrongCsv(text);
      } else if (currentSource === 'fitnotes') {
        sessions = parseFitNotesCsv(text);
      } else if (currentSource === 'hevy') {
        const json = JSON.parse(text);
        const array = Array.isArray(json) ? json : [json];
        sessions = mapHevyWorkoutsJson(array);
      }

      if (!sessions.length) {
        setErrorMsg('Nie wykryto żadnych sesji w podanym tekście.');
        setParsedSessions([]);
        return;
      }

      setParsedSessions(sessions);
      setSelectedSessionIdx(0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Błąd parsowania danych.');
      setParsedSessions([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParse(text, source);
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    const session = parsedSessions[selectedSessionIdx];
    if (!session) return;
    const newExercises = importedSessionToWorkoutExercises(session);
    if (!newExercises.length) {
      notify('Brak ćwiczeń do zaimportowania', 'error');
      return;
    }
    onImport(newExercises, session.name);
    notify(`Pomyślnie zaimportowano: ${session.name} (${newExercises.length} ćwiczeń)`, 'success');
    onClose();
  };

  const activeSession = parsedSessions[selectedSessionIdx];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-border-custom bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-custom px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-text-primary">
                Importuj Trening
              </h2>
              <p className="text-2xs font-semibold text-text-muted mt-0.5">
                Obsługa Strong (CSV), Hevy (JSON) oraz FitNotes
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Zamknij"
            className="!p-1.5 !rounded-full text-text-muted hover:text-text-primary"
          >
            <X size={18} />
          </Button>
        </header>

        {/* Source Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border-custom/50 bg-surface/30">
          {(['strong', 'hevy', 'fitnotes'] as const).map((s) => (
            <Pressable
              key={s}
              type="button"
              onClick={() => {
                setSource(s);
                handleParse(content, s);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                source === s
                  ? 'bg-primary text-on-accent shadow-xs'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface'
              }`}
            >
              {s === 'strong' ? 'Strong App' : s === 'hevy' ? 'Hevy' : 'FitNotes'}
            </Pressable>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-black uppercase tracking-wider text-text-secondary">
              Wklej zawartość pliku lub wybierz z dysku:
            </label>
            <label
              htmlFor={fileInputId}
              className="text-2xs font-black text-primary hover:underline cursor-pointer flex items-center gap-1"
            >
              <FileText size={12} /> Załaduj plik
            </label>
            <input
              id={fileInputId}
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <ControlTextarea
            value={content}
            onChange={(e) => handleParse(e.target.value, source)}
            placeholder={
              source === 'strong'
                ? 'Wklej tekst ze Strong CSV (nagłówki: Date, Workout Name, Exercise Name...)'
                : source === 'hevy'
                ? 'Wklej obiekt JSON z Hevy API (lub tablicę sesji)'
                : 'Wklej zawartość FitNotes CSV (nagłówki: Date, Exercise, Category, Weight...)'
            }
            className="w-full h-32 bg-surface-solid border border-border-custom rounded-2xl p-3 text-xs font-mono text-text-primary outline-none focus:border-primary/50 ui-interactive resize-none"
          />

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedSessions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border-custom/50">
              <span className="text-2xs font-black uppercase tracking-wider text-text-muted">
                Wykryto {parsedSessions.length} sesji:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {parsedSessions.map((s, idx) => (
                  <Pressable
                    key={`${s.date}-${idx}`}
                    type="button"
                    onClick={() => setSelectedSessionIdx(idx)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                      selectedSessionIdx === idx
                        ? 'bg-surface-solid border-primary text-text-primary shadow-xs'
                        : 'bg-surface/50 border-border-custom text-text-muted hover:border-text-muted'
                    }`}
                  >
                    <div className="font-black text-text-primary truncate max-w-[140px]">{s.name}</div>
                    <div className="text-3xs text-text-muted mt-0.5">
                      {s.date} · {s.exercises.length} ćw.
                    </div>
                  </Pressable>
                ))}
              </div>

              {activeSession && (
                <div className="p-3.5 rounded-2xl bg-surface border border-border-custom space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-text-primary flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-success" />
                      {activeSession.name}
                    </span>
                    <span className="text-2xs font-mono text-text-muted">{activeSession.date}</span>
                  </div>
                  <div className="text-2xs text-text-secondary space-y-1">
                    {activeSession.exercises.slice(0, 5).map((ex, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-bold truncate max-w-[200px]">{ex.name}</span>
                        <span className="font-mono text-text-muted">{ex.sets.length} serii</span>
                      </div>
                    ))}
                    {activeSession.exercises.length > 5 && (
                      <div className="text-3xs text-text-muted italic">
                        + jeszcze {activeSession.exercises.length - 5} ćwiczeń...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-2 border-t border-border-custom px-5 py-3.5 bg-surface/50">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!activeSession}
            onClick={handleApply}
            className="flex items-center gap-1.5"
          >
            <Upload size={14} /> Wstaw do sesji
          </Button>
        </footer>
      </div>
    </div>
  );
}
