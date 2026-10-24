import { Target } from 'lucide-react';
import { CLOSER_WEEKLY_TARGETS } from '../../../lib/closer/closerDayModel';
import { buildSalesPlan, type SalesSums } from '../../../lib/closer/salesPlan';

const pct = (rate: number) => `${Math.round(rate * 100)}%`;
const pl = (value: number) => String(value).replace('.', ',');

/** Plan na resztę tygodnia z Twoich własnych współczynników: ile rozmów odebranych brakuje do celu umówień i ile to na dzień. */
export default function SalesPlanLines({ sums, today }: { sums: SalesSums; today: string }) {
  const plan = buildSalesPlan(sums, CLOSER_WEEKLY_TARGETS, today);
  const lines: string[] = [];

  if (plan.missingAppointments === 0) {
    lines.push(`Cel ${CLOSER_WEEKLY_TARGETS.appointments} umówień jest zrobiony.`);
  } else if (plan.apptRate == null) {
    lines.push('Za mało rozmów w tym tygodniu (potrzebuję min. 20), żeby policzyć Twój współczynnik umówień.');
  } else if (plan.workdaysLeft > 0 && plan.dialsNeeded != null && plan.dialsPerDay != null) {
    lines.push(`Do ${CLOSER_WEEKLY_TARGETS.appointments} umówień brakuje ${plan.missingAppointments}. Przy Twoich ${pct(plan.apptRate)} na umówienie to ok. ${plan.dialsNeeded} rozmów odebranych, czyli ${plan.dialsPerDay} dziennie przez ${plan.workdaysLeft} ${plan.workdaysLeft === 1 ? 'dzień' : 'dni'}.`);
  } else if (plan.dialsForFullWeek != null) {
    lines.push(`Tydzień się kończy: umówionych ${sums.appointments} z ${CLOSER_WEEKLY_TARGETS.appointments}. Na nowy tydzień przy ${pct(plan.apptRate)} potrzebujesz ok. ${plan.dialsForFullWeek} rozmów odebranych, czyli ${Math.ceil(plan.dialsForFullWeek / 5)} dziennie.`);
  }

  if (plan.missingSalesCalls > 0 && plan.saleRate != null) {
    lines.push(`Do ${CLOSER_WEEKLY_TARGETS.salesCalls} rozmów sprzedażowych brakuje ${plan.missingSalesCalls}; przy ${pct(plan.saleRate)} z rozmowy na sprzedaż to ok. ${pl(plan.expectedSalesFromMissingCalls ?? 0)} sprzedaży.`);
  }
  if (lines.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-2xl border border-primary/25 bg-primary/10 p-3">
      <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-primary"><Target size={12} /> Plan na resztę tygodnia</p>
      {lines.map((line) => <p key={line} className="text-xs leading-snug text-text-primary">{line}</p>)}
      <p className="text-2xs text-text-muted">Liczone z Twoich liczb z tego tygodnia; mała próba oznacza duży rozrzut.</p>
    </div>
  );
}
