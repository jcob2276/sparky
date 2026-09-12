import { HeartPulse, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '../../ui/Card';
import { useHealthspanProfile } from '../../../lib/healthspanApi';

export default function DesktopHealthspanSection({ userId }: { userId: string }) {
  const { data, isLoading } = useHealthspanProfile(userId);

  const profile = data?.profile;
  const pace = data?.pace;
  const today = data?.today;
  const opportunities = data?.summary?.opportunities ?? [];

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-error/20 bg-error/10 p-2 text-error">
            <HeartPulse size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Healthspan & Wiek Funkcjonalny</h3>
            <p className="text-xs text-text-muted">
              Tempo starzenia biologicznego, rezerwa fizjologiczna i trajektoria długowieczności
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border-custom bg-background/50 px-2.5 py-1 text-2xs text-text-muted">
          <ShieldCheck size={12} className="text-success" />
          <span>{profile?.confidence.overall ?? 85}% wiarygodności</span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-28 animate-pulse rounded-xl bg-border-custom/30" />
      ) : !profile ? (
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 text-center">
          <p className="text-xs text-text-muted">
            Kalibracja profilu Healthspan wymaga uzupełnienia daty urodzenia i min. 7 dni biometrii Oura.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Wiek funkcjonalny</p>
              <p className="mt-1 text-2xl font-light text-text-primary">
                {profile.ageRange.low}–{profile.ageRange.high}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">wiek biologiczny (lata)</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-success">
                <Activity size={11} /> Tempo starzenia
              </p>
              <p className="mt-1 text-2xl font-light text-success">
                {pace?.multiplier != null ? `${pace.multiplier.toFixed(2)}×` : 'Kalibracja'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {pace?.multiplier != null && pace.multiplier < 1.0 ? 'wolniejsze niż metrykalne' : 'tempo standardowe'}
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-primary">Pojemność na dziś</p>
              <p className="mt-1 text-2xl font-light text-primary">
                {today?.capacity.score != null ? `${today.capacity.score}/100` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">rezerwa metaboliczna</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Ocena Healthspan</p>
              <p className="mt-1 text-2xl font-light text-text-primary">{profile.score}/100</p>
              <p className="mt-0.5 text-2xs text-text-muted">zagregowany indeks</p>
            </div>
          </div>

          {opportunities.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-custom/50 bg-surface-2/40 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary shrink-0" />
                <span className="text-text-secondary">
                  Główna dźwignia poprawy: <strong>{opportunities[0]?.label}</strong> ({opportunities[0]?.quality})
                </span>
              </div>
              <span className="text-2xs text-text-muted">
                Model: {profile.modelVersion}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
