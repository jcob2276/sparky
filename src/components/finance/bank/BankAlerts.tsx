import { AlertTriangle, Info } from 'lucide-react';
import type { FinanceAlert } from '@vanguard/domain';

const TONE = { danger: 'bg-danger/12 text-danger', warning: 'bg-warning/15 text-warning', info: 'bg-primary/12 text-primary' } as const;

/** Wąska lista tego, co wymaga uwagi; nic nie pokazuje, gdy wszystko jest w porządku. */
export function BankAlerts({ alerts }: { alerts: FinanceAlert[] }) {
  if (!alerts.length) return null;
  return (
    <section aria-label="Wymaga uwagi">
      <h2 className="ios-section-title mb-2 px-1">Wymaga uwagi</h2>
      <ul className="ios-group divide-y divide-border-custom/20">
        {alerts.slice(0, 4).map(alert => {
          const Icon = alert.tone === 'info' ? Info : AlertTriangle;
          return (
            <li key={alert.id} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE[alert.tone]}`}><Icon size={14} aria-hidden="true" /></span>
              <span className="text-sm text-text-primary">{alert.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
