import { FC } from 'react';
import Button from '../ui/Button';
import { ArrowRight } from 'lucide-react';
import { DashboardData } from '../../lib/investments/dashboardService';
import { GroupedList, GroupedListRow } from '../ui/GroupedList';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  items: DashboardData['streamItems'];
  onViewAll: () => void;
}

const SOURCE_TONE: Record<Props['items'][number]['sourceType'], string> = {
  'FORM 4': 'bg-warning/15 text-warning',
  KNF: 'bg-danger/15 text-danger',
  STOCK: 'bg-primary/15 text-primary',
};

const SOURCE_NAME: Record<Props['items'][number]['sourceType'], string> = {
  'FORM 4': 'SEC Form 4',
  KNF: 'rejestr KNF',
  STOCK: 'STOCK Act',
};

function amountTone(value: string): string {
  if (value.includes('%')) return 'text-danger';
  if (value.includes('USD')) return 'text-success';
  return 'text-text-muted';
}

export const DashboardDisclosureStream: FC<Props> = ({ items, onViewAll }) => (
  <section className="space-y-2" aria-label="Strumień ujawnień">
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Strumień ujawnień</h2>
        <p className="text-xs text-text-muted">Form 4, STOCK Act i pozycje KNF · źródło i data przy każdym wpisie</p>
      </div>
      <Button size="sm" variant="ghost" onClick={onViewAll} icon={<ArrowRight size={14} />} iconPosition="right" className="min-h-11 text-sm font-semibold text-primary">
        Wszystkie
      </Button>
    </div>

    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-1 px-4 py-10 text-center text-sm text-text-secondary">
        Brak zgłoszeń w oknie (baza trzyma dane od 1 stycznia bieżącego roku). Status odczytu i pokrycia źródeł znajdziesz niżej.
      </p>
    ) : (
      <GroupedList className="max-h-[28rem] overflow-y-auto">
        {items.map((item) => (
          <GroupedListRow key={item.id} className="flex min-h-14 items-center gap-3 py-2.5">
            <CompanyLogo ticker={item.ticker} size={32} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                {item.ticker}
                <span className={`rounded-md px-1.5 py-0.5 text-2xs font-medium ${SOURCE_TONE[item.sourceType]}`}>{item.sourceType}</span>
              </p>
              <p className="line-clamp-2 text-xs text-text-secondary">{item.description}</p>
              <p className="text-2xs text-text-muted">
                {SOURCE_NAME[item.sourceType]} · {item.dateLabel}
                {item.sourceUrl && (
                  <>
                    {' · '}
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Dokument źródłowy</a>
                  </>
                )}
              </p>
            </div>
            <span className={`ui-num shrink-0 text-right text-sm font-semibold ${amountTone(item.amountOrPercent)}`}>{item.amountOrPercent}</span>
          </GroupedListRow>
        ))}
      </GroupedList>
    )}
  </section>
);
