import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { fetchUserFundament, ingestVaultCategory, upsertUserFundament } from '../../lib/identityVaultApi';
import { notify } from '../../lib/notify';
import Button from '../ui/Button';
import { ControlTextarea } from '../ui/ControlPrimitives';
import SettingsSection from './SettingsSection';

/** Pola `user_fundament`, które czyta Wyrocznia (RAG). Pozostałe kolumny sejfu nie mają odbiorcy. */
const FIELDS = [
  { key: 'identity', label: 'Ja', hint: 'Tożsamość, relacje, wartości, wzorce zachowań.' },
  { key: 'philosophy', label: 'Ciało', hint: 'Trening, żywienie, zdrowie, samopoczucie.' },
  { key: 'vision', label: 'Wizja', hint: 'Dokąd zmierzasz i dlaczego.' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export default function AboutMeSettings({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['user-fundament', userId],
    queryFn: () => fetchUserFundament(userId),
    enabled: !!userId,
  });
  const [draft, setDraft] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const saved = (key: FieldKey) => query.data?.[key] ?? '';
  const value = (key: FieldKey) => draft[key] ?? saved(key);
  const changed = FIELDS.filter(({ key }) => draft[key] !== undefined && draft[key].trim() !== saved(key).trim());

  async function save() {
    setSaving(true);
    try {
      for (const { key } of changed) {
        const text = value(key).trim();
        if (text) await ingestVaultCategory(userId, key, text);
      }
      await upsertUserFundament(userId, Object.fromEntries(changed.map(({ key }) => [key, value(key).trim()])));
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: ['user-fundament', userId] });
      notify('Zapisano. Wyrocznia użyje tego w kolejnych odpowiedziach.', 'success');
    } catch {
      notify('Nie udało się zapisać profilu dla AI.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection icon={<UserRound size={16} />} title="O mnie dla AI" description="Krótki opis, który Wyrocznia czyta przy odpowiedziach. Pisz tylko to, co ma wpływać na jej odpowiedzi.">
      <div className="space-y-3">
        {FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="block space-y-1.5">
            <span className="block text-sm font-medium text-text-primary">{label}</span>
            <span className="block text-xs text-text-muted">{hint}</span>
            <ControlTextarea
              aria-label={label}
              value={value(key)}
              onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-2xl border border-border-custom bg-surface-solid p-3 text-sm text-text-primary outline-none focus:border-primary/50 focus:shadow-focus placeholder:text-text-muted/40"
            />
          </label>
        ))}
      </div>
      {changed.length > 0 ? <Button onClick={() => { void save(); }} loading={saving} className="w-full">Zapisz profil dla AI</Button> : null}
    </SettingsSection>
  );
}
