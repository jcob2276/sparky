import { useState } from 'react';
import { ClipboardCheck, Watch } from 'lucide-react';
import type {
  HealthspanCheckinPayload,
  HealthspanCheckinPeriod,
} from '../../../lib/healthspanCheckinsApi';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';

interface Field {
  key: keyof HealthspanCheckinPayload;
  label: string;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
}

const fields: Record<HealthspanCheckinPeriod, Field[]> = {
  daily: [
    { key: 'sleepQuality', label: 'Jakość snu 0–100', placeholder: 'np. 78', min: 0, max: 100 },
    { key: 'energy', label: 'Energia 0–100', placeholder: 'np. 70', min: 0, max: 100 },
    { key: 'mood', label: 'Nastrój 0–100', placeholder: 'np. 75', min: 0, max: 100 },
    { key: 'stress', label: 'Stres 0–100', placeholder: 'np. 35', min: 0, max: 100 },
    { key: 'recovery', label: 'Odczuwana regeneracja 0–100', placeholder: 'np. 72', min: 0, max: 100 },
    { key: 'movementMinutes', label: 'Minuty ruchu', placeholder: 'np. 45', min: 0, max: 600 },
    { key: 'activityIntensity', label: 'Intensywność ruchu 0–100', placeholder: 'np. 60', min: 0, max: 100 },
  ],
  weekly: [
    { key: 'exerciseSessions', label: 'Sesje ruchowe', placeholder: 'np. 4', min: 0, max: 14 },
    { key: 'strengthSessions', label: 'Sesje siłowe', placeholder: 'np. 2', min: 0, max: 7 },
    { key: 'breathlessEfforts', label: 'Mocniejsze wysiłki', placeholder: 'np. 1', min: 0, max: 7 },
    { key: 'sleepConsistency', label: 'Regularność snu 0–100', placeholder: 'np. 80', min: 0, max: 100 },
    { key: 'dietQuality', label: 'Jakość diety 0–100', placeholder: 'np. 82', min: 0, max: 100 },
    { key: 'alcoholUnits', label: 'Jednostki alkoholu', placeholder: 'np. 0', min: 0, max: 50, step: 0.5 },
    { key: 'socialConnection', label: 'Relacje i kontakt 0–100', placeholder: 'np. 75', min: 0, max: 100 },
  ],
  manual: [
    { key: 'sleepHours', label: 'Sen — godziny', placeholder: 'np. 7.5', min: 0, max: 16, step: 0.1 },
    { key: 'steps', label: 'Kroki', placeholder: 'np. 8500', min: 0, max: 100000 },
    { key: 'restingHeartRate', label: 'Tętno spoczynkowe', placeholder: 'np. 54', min: 25, max: 150 },
    { key: 'vo2Max', label: 'VO₂ max', placeholder: 'np. 48', min: 10, max: 100, step: 0.1 },
    { key: 'weight', label: 'Masa ciała — kg', placeholder: 'np. 82.5', min: 25, max: 400, step: 0.1 },
    { key: 'bodyFat', label: 'Tkanka tłuszczowa — %', placeholder: 'np. 17', min: 2, max: 70, step: 0.1 },
  ],
};

const tabCopy: Array<{ id: HealthspanCheckinPeriod; label: string }> = [
  { id: 'daily', label: 'Dzisiaj' },
  { id: 'weekly', label: 'Tydzień' },
  { id: 'manual', label: 'Bez zegarka' },
];

export default function HealthspanCheckInPanel({
  onSave,
  saving = false,
}: {
  onSave: (period: HealthspanCheckinPeriod, payload: HealthspanCheckinPayload) => void;
  saving?: boolean;
}) {
  const [period, setPeriod] = useState<HealthspanCheckinPeriod>('daily');
  const [values, setValues] = useState<Partial<Record<keyof HealthspanCheckinPayload, string>>>({});
  const [activityType, setActivityType] = useState('');

  const submit = () => {
    const payload = Object.fromEntries(
      fields[period].flatMap((field) => {
        const raw = values[field.key];
        return raw === undefined || raw === '' ? [] : [[field.key, Number(raw)]];
      }),
    ) as HealthspanCheckinPayload;
    if (period === 'daily' && activityType) payload.activityType = activityType;
    if (!Object.keys(payload).length) return;
    onSave(period, payload);
    setValues({});
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <ClipboardCheck size={16} className="text-primary" /> Check-in Healthspan
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Uzupełnia luki. Świeże dane Oura i Garmina nadal mają pierwszeństwo.
          </p>
        </div>
        <Watch size={18} className="text-text-muted" />
      </div>
      <div className="mt-4 flex gap-2">
        {tabCopy.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={period === tab.id ? 'tonal' : 'ghost'}
            onClick={() => setPeriod(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {period === 'daily' && (
          <Select
            label="Rodzaj aktywności"
            value={activityType}
            onChange={(event) => setActivityType(event.target.value)}
            options={[
              { value: '', label: 'Brak / wybierz' },
              { value: 'walk', label: 'Spacer' },
              { value: 'cardio', label: 'Cardio' },
              { value: 'strength', label: 'Siła' },
              { value: 'mobility', label: 'Mobilność' },
              { value: 'sport', label: 'Sport' },
            ]}
          />
        )}
        {fields[period].map((field) => (
          <Input
            key={field.key}
            type="number"
            size="sm"
            label={field.label}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            value={values[field.key] ?? ''}
            onChange={(event) => setValues((current) => ({
              ...current,
              [field.key]: event.target.value,
            }))}
          />
        ))}
      </div>
      <Button className="mt-4 w-full sm:w-auto" onClick={submit} loading={saving}>
        Zapisz check-in
      </Button>
    </section>
  );
}
