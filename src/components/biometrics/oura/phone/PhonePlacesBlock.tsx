import { MapPin } from 'lucide-react';
import type { PlaceAnchors } from '@vanguard/domain';
import type { PlaceDay } from '../../../../lib/phoneSignals/buildInsights';
import { hm, PLACE_SOURCE_LABEL } from './phoneSignalsText';

interface PhonePlacesBlockProps {
  anchors: PlaceAnchors;
  places: PlaceDay[];
}

function minutesOrDash(value: number | null): string {
  return value === null ? '—' : hm(value);
}

/** Home / work / away time from GPS visits and Wi-Fi labels (works with GPS off, then flagged as an estimate). */
export function PhonePlacesBlock({ anchors, places }: PhonePlacesBlockProps) {
  const measured = places.filter((p) => p.place.source !== 'none');
  const today = places[0];
  return (
    <section className="space-y-2" aria-label="Dom, praca i czas poza domem">
      <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <MapPin size={15} aria-hidden="true" /> Dom, praca, poza domem
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-normal text-text-secondary">
          źródło: wizyty GPS i etykiety Wi-Fi · n = {measured.length} z {places.length} dni
        </span>
      </h3>
      {today && today.place.source !== 'none' && (
        <p className="text-sm leading-6 text-text-secondary">
          <span className="text-text-primary">
            Dziś: dom {minutesOrDash(today.place.homeMin)} · praca {minutesOrDash(today.place.workMin)} · poza domem{' '}
            {minutesOrDash(today.place.awayMin)}
          </span>{' '}
          ({PLACE_SOURCE_LABEL[today.place.source]})
        </p>
      )}
      {measured.length > 1 && (
        <ul className="space-y-0.5 text-xs leading-5 text-text-muted">
          {measured.slice(0, 7).map((p) => (
            <li key={p.date}>
              {p.date}: dom {minutesOrDash(p.place.homeMin)} · praca {minutesOrDash(p.place.workMin)} · poza{' '}
              {minutesOrDash(p.place.awayMin)} · {PLACE_SOURCE_LABEL[p.place.source]}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-5 text-text-muted">
        {anchors.home
          ? `Dom rozpoznany z lokalizacji nocnej (n = ${anchors.homeNights} nocy)${
              anchors.work ? `, praca z dni roboczych (n = ${anchors.workDays} dni)` : ', pracy jeszcze nie rozpoznano'
            }.`
          : 'Domu z GPS jeszcze nie rozpoznano (potrzeba 3 nocy z lokalizacją) — liczę tylko z etykiet Wi-Fi.'}{' '}
        Bez GPS czas poza domem to szacunek z Wi-Fi i danych mobilnych.
      </p>
    </section>
  );
}
