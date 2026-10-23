import { BrainCircuit, Check, Database, FileText, FolderKanban, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { useAiContextPreferences, type AiContextPreferences } from '../../lib/aiContextPreferences';
import { notify } from '../../lib/notify';
import Button from '../ui/Button';
import SettingsSection from './SettingsSection';
import { Pressable } from '../ui/ControlPrimitives';

const SOURCES: Array<{ key: keyof AiContextPreferences; label: string; description: string; icon: typeof FileText }> = [
  { key: 'notes', label: 'Notatki', description: 'Powiązane notatki i materiały', icon: FileText },
  { key: 'tasks', label: 'Zadania', description: 'Otwarte zadania i ich kontekst', icon: ListTodo },
  { key: 'projects', label: 'Kierunek', description: 'Cele i projekty', icon: FolderKanban },
  { key: 'knowledge', label: 'Wiedza', description: 'Potwierdzone fakty i relacje', icon: Database },
];

export default function AiContextSettings({ userId }: { userId: string }) {
  const context = useAiContextPreferences(userId);
  const [draft, setDraft] = useState<AiContextPreferences | null>(null);
  const value = draft || context.value;
  const toggle = (key: keyof AiContextPreferences) => setDraft({ ...value, [key]: !value[key] });
  const save = async () => {
    try {
      await context.save(value);
      setDraft(null);
      notify('Zmieniono źródła kontekstu AI.', 'success');
    } catch {
      notify('Nie udało się zapisać źródeł kontekstu AI.', 'error');
    }
  };

  return (
    <SettingsSection icon={<BrainCircuit size={16} />} title="Kontekst AI" description="Wybierz źródła używane przez wyszukiwanie, podpowiedzi i przygotowanie wydarzeń. Wyłączenie źródła usuwa je z nowych zapytań.">
      <div className="space-y-1">
        {SOURCES.map(({ key, label, description, icon: Icon }) => (
          <Pressable key={key} aria-pressed={value[key]} onClick={() => toggle(key)} className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-3 text-text-secondary"><Icon size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text-primary">{label}</span><span className="block text-xs text-text-muted">{description}</span></span>
            <span className={`grid h-6 w-6 place-items-center rounded-full border ${value[key] ? 'border-primary bg-primary text-on-accent' : 'border-border-custom text-transparent'}`}><Check size={13} /></span>
          </Pressable>
        ))}
      </div>
      {draft ? <Button onClick={() => { void save(); }} loading={context.saving} className="w-full">Zapisz prywatność AI</Button> : null}
    </SettingsSection>
  );
}
