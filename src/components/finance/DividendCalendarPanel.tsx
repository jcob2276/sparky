import { useState } from 'react';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import { Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { calculate12MonthDividendForecast, type DividendRecord } from '@vanguard/domain';
import { DividendAddForm } from './DividendAddForm';

export default function DividendCalendarPanel() {
  const [dividends, setDividends] = useState<DividendRecord[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showNet, setShowNet] = useState(true);

  const forecast = calculate12MonthDividendForecast(dividends, { applyBelkaTax: showNet, w8BenRatePct: 15 });

  const displayTotal = showNet ? forecast.total12MonthForecastNet : forecast.total12MonthForecastGross;
  const displayMonthly = showNet ? forecast.averageMonthlyIncomeNet : Math.round((forecast.total12MonthForecastGross / 12) * 100) / 100;

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card padding="1rem" className="slate-card space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-2xs text-text-muted font-medium uppercase">
              <DollarSign size={12} className="text-success" />
              Suma wpisanych wypłat ({showNet ? 'Szacunek netto 19%' : 'Brutto'})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNet(!showNet)}
              className="slate-pill text-3xs px-1.5 py-0.5"
            >
              {showNet ? 'Pokaż Brutto' : 'Pokaż Netto'}
            </Button>
          </div>
          <p className="text-xl font-bold text-text-primary">{dividends.length ? `${displayTotal.toLocaleString('pl-PL')} PLN` : '—'}</p>
          <p className="text-2xs text-text-muted">Wyłącznie wypłaty dodane ręcznie w tym widoku</p>
        </Card>

        <Card padding="1rem" className="slate-card space-y-1">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted font-medium uppercase">
            <TrendingUp size={12} className="text-primary" />
            Suma podzielona przez 12 ({showNet ? 'Netto' : 'Brutto'})
          </div>
          <p className="text-xl font-bold text-text-primary">{dividends.length ? `${displayMonthly.toLocaleString('pl-PL')} PLN / mc` : '—'}</p>
          <p className="text-2xs text-text-muted">Przeliczenie wpisanej sumy na miesiące</p>
        </Card>
      </div>

      {/* Main Table & Controls */}
      <Card padding="1.25rem" className="slate-card space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-border-custom/30 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary shrink-0" />
            <div>
              <h3 className="text-xs font-medium tracking-tight text-text-primary">Kalkulator dywidend</h3>
              <p className="text-2xs text-text-muted">Ręczna kalkulacja. Wpisy pozostają tylko do zamknięcia tego widoku.</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            icon={<Plus size={12} />}
            className="slate-pill text-xs font-medium"
          >
            {showAddForm ? 'Anuluj' : 'Dodaj Dywidendę'}
          </Button>
        </div>

        {showAddForm && (
          <DividendAddForm
            onAdd={(newItem) => {
              setDividends((current) => [...current, newItem]);
              setShowAddForm(false);
            }}
          />
        )}

        <div className="space-y-2">
          {dividends.length === 0 && <p className="text-xs text-text-muted">Brak wpisanych dywidend</p>}
          {dividends.map((div) => {
            return (
              <div key={div.id} className="flex items-center justify-between p-2.5 bg-surface-2/30 rounded-xl border border-border-custom/20 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">{div.ticker}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{div.companyName}</p>
                    </div>
                    <p className="text-2xs text-text-muted">Data wypłaty: {div.payDate} • Ex-date: {div.exDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-success">+{div.totalAmount.toLocaleString('pl-PL')} {div.currency}</p>
                  <p className="text-2xs text-text-muted">{div.sharesCount} akcji × {div.amountPerShare} PLN</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
