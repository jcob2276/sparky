import { useMemo, useState } from 'react';
import { formatPln } from '../../lib/finance/formatMoney';
import { buildSalesIncomePlan, type SalesRole } from '../../lib/finance/salesIncomePlan';
import { ControlInput, ControlSelect } from '../ui/ControlPrimitives';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

const ROLE_LABELS: Record<SalesRole, string> = {
  both: 'Setter + closer (własne spotkania)',
  setter: 'Sam setter',
  closer: 'Sam closer',
};

const fieldClass = 'min-h-11 w-full rounded-xl border-0 bg-surface-2/70 px-3 text-sm tabular-nums ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

function parse(value: string): number {
  return Number(value.replace(',', '.'));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-text-muted">
      {label}
      {children}
    </label>
  );
}

export function FinanceSalesGoalCard() {
  const [target, setTarget] = useState('10000');
  const [role, setRole] = useState<SalesRole>('both');
  const [offer, setOffer] = useState('5500');
  const [days, setDays] = useState('4');
  const [conversion, setConversion] = useState('25');
  const [deductions, setDeductions] = useState('0');

  const plan = useMemo(() => buildSalesIncomePlan({
    targetNet: parse(target),
    deductionsPct: parse(deductions),
    role,
    offerGross: parse(offer),
    vatPct: 23,
    commissionPct: 15,
    perMeeting: 100,
    perSaleBonus: 50,
    conversion: parse(conversion) / 100,
    daysPerWeek: parse(days),
    weeksPerMonth: 4,
  }), [target, deductions, role, offer, conversion, days]);

  return (
    <FinanceSection
      title="Cel zarobkowy ze sprzedaży"
      subtitle="Ile spotkań i sprzedaży miesięcznie daje wybraną kwotę na koncie. Prowizja 15% od netto (VAT 23%), 100 zł za odbyte spotkanie, 50 zł za sprzedaż."
    >
      <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-4 sm:grid-cols-3">
        <Field label="Cel na koncie (zł/mies.)">
          <ControlInput type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Rola">
          <ControlSelect value={role} onChange={(e) => setRole(e.target.value as SalesRole)} className={fieldClass}>
            {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </ControlSelect>
        </Field>
        <Field label="Oferta">
          <ControlSelect value={offer} onChange={(e) => setOffer(e.target.value)} className={fieldClass}>
            <option value="5500">5 500 zł brutto</option>
            <option value="4000">Mentoring 4 000 zł brutto</option>
          </ControlSelect>
        </Field>
        <Field label="Dni pracy w tygodniu">
          <ControlSelect value={days} onChange={(e) => setDays(e.target.value)} className={fieldClass}>
            {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
          </ControlSelect>
        </Field>
        <Field label="Skuteczność (% spotkań → sprzedaż)">
          <ControlInput type="number" inputMode="decimal" min="1" max="100" value={conversion} onChange={(e) => setConversion(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Podatki i składki (%)">
          <ControlInput type="number" inputMode="decimal" min="0" max="90" value={deductions} onChange={(e) => setDeductions(e.target.value)} className={fieldClass} />
        </Field>
      </div>
      {plan ? (
        <FinanceList>
          <FinanceRow primary="Odbyte spotkania" secondary={`${plan.meetingsPerDay} dziennie przy ${plan.workDays} dniach pracy`} trailing={plan.meetingsPerMonth} />
          <FinanceRow primary="Zamknięte sprzedaże" secondary={`${plan.salesPerDay.toFixed(1).replace('.', ',')} dziennie`} trailing={plan.salesPerMonth} />
          <FinanceRow
            primary="Wypłata z prowizji"
            secondary={`Potrzebne ${formatPln(plan.payoutNeeded)} przed odliczeniami · ${formatPln(plan.perSaleCommission, 2)} za sprzedaż`}
            trailing={formatPln(plan.expectedPayout)}
          />
        </FinanceList>
      ) : (
        <FinanceEmpty>Wpisz cel, skuteczność od 1 do 100% i podatki poniżej 100%.</FinanceEmpty>
      )}
    </FinanceSection>
  );
}
