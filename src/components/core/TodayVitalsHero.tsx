import { useNavigate } from 'react-router-dom';
import { parseStrainComponents } from '../../lib/db-json-guards';
import { buildHealthDirection } from '../../lib/biometrics/healthDirection';
import { buildScoreRings } from '../../lib/biometrics/ouraScoreBands';
import { useDailyStrainOura, useOuraRecentHistory } from '../../lib/biometricsApi';
import { formatShortDateWarsaw } from '../../lib/date';
import { useUserId } from '../../store/useStore';
import { OuraScoreRings } from '../biometrics/oura/OuraScoreRings';
import Skeleton from '../ui/Skeleton';

/** Bohater ekranu Dziś: trzy pierścienie (sen, regeneracja, obciążenie) i jedno zdanie werdyktu tygodnia. */
export default function TodayVitalsHero() {
  const userId = useUserId();
  const navigate = useNavigate();
  const daily = useDailyStrainOura(userId ?? '');
  const history = useOuraRecentHistory(userId ?? '');
  if (!userId) return null;
  if (daily.isLoading) return <Skeleton variant="card" lines={3} />;
  const oura = daily.data?.oura;
  if (!oura) return null;

  const asOf = oura.date;
  const enhancedToday = daily.data?.enhanced ?? null;
  const summaries = [...(history.data?.ouraHistory ?? []).filter(row => row.date !== asOf), oura];
  const enhanced = [...(history.data?.enhancedHistory ?? []).filter(row => row.date !== asOf), ...(enhancedToday ? [enhancedToday] : [])];
  const direction = buildHealthDirection({ asOf, summaries, enhanced });
  const row = daily.data?.row;
  const calibrating = (row ? parseStrainComponents(row.components) : null)?.strain_confidence === 'calibrating';
  const rings = buildScoreRings({ asOf, summaries, enhanced, strainScore: calibrating ? null : row?.strain_score });
  const open = () => navigate('/oura');

  return (
    <section className="oura-theme ui-card--surface rounded-[var(--radius-hero)] bg-surface-solid p-4" aria-label="Stan ciała dziś"
      style={{ '--oura-ring-track': 'var(--surface-3)' } as React.CSSProperties}>
      <p className="text-xs font-semibold text-text-muted">Pomiary z {formatShortDateWarsaw(asOf)}</p>
      <p className="mt-1 mb-4 text-lg font-medium leading-snug text-text-primary">{direction.headline}</p>
      <OuraScoreRings rings={rings} onOpenSleep={open} onOpenVitals={open} />
    </section>
  );
}
