import { useState } from 'react';
import type { HealthspanCheckinPayload } from '../../../lib/healthspanCheckinsApi';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';

export default function HealthspanOnboardingPanel({
  onSave,
  saving,
}: {
  onSave: (input: { birthDate: string; sex: 'M' | 'F'; payload: HealthspanCheckinPayload }) => void;
  saving: boolean;
}) {
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [sleepHours, setSleepHours] = useState('');
  const [steps, setSteps] = useState('');
  const [strength, setStrength] = useState('');
  const [stress, setStress] = useState('');

  return (
    <section className="rounded-3xl border border-white/10 bg-surface-1 p-5">
      <p className="text-2xs font-black uppercase tracking-widest text-primary">Healthspan — start</p>
      <h2 className="mt-2 text-2xl font-light text-white">Zegarek nie jest wymagany</h2>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Podaj podstawy. Sparky zacznie od jawnie oznaczonej estymaty i będzie zwiększał pewność,
        gdy pojawią się check-iny, Oura lub Garmin.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input label="Data urodzenia" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
        <Select
          label="Płeć używana w benchmarkach"
          value={sex}
          onChange={(event) => setSex(event.target.value as 'M' | 'F')}
          options={[{ value: 'M', label: 'Mężczyzna' }, { value: 'F', label: 'Kobieta' }]}
        />
        <Input label="Typowy sen — godziny" type="number" step="0.1" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} />
        <Input label="Typowe kroki dziennie" type="number" value={steps} onChange={(event) => setSteps(event.target.value)} />
        <Input label="Sesje siłowe tygodniowo" type="number" value={strength} onChange={(event) => setStrength(event.target.value)} />
        <Input label="Odczuwany stres 0–100" type="number" min="0" max="100" value={stress} onChange={(event) => setStress(event.target.value)} />
      </div>
      <Button
        className="mt-5"
        loading={saving}
        disabled={!birthDate}
        onClick={() => onSave({
          birthDate,
          sex,
          payload: {
            ...(sleepHours ? { sleepHours: Number(sleepHours) } : {}),
            ...(steps ? { steps: Number(steps) } : {}),
            ...(strength ? { strengthSessions: Number(strength) } : {}),
            ...(stress ? { stress: Number(stress) } : {}),
          },
        })}
      >
        Utwórz profil Healthspan
      </Button>
    </section>
  );
}
