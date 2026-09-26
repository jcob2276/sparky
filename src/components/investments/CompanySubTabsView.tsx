import { FC } from 'react';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';
import type { CompanyDetailTab } from './CompanyDetailHeader';

interface Props {
  data: CompanyDetailData;
  activeTab: CompanyDetailTab;
}

const formatUsd = (val: number) => {
  if (!val || val === 0) return '—';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2).replace('.', ',')} mld`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2).replace('.', ',')} mln`;
  return `$${val.toLocaleString()}`;
};

const formatShares = (val: number) => {
  if (val == null) return '—';
  return val.toLocaleString();
};

const getChangeBadge = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('new') || t.includes('nowa')) {
    return <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-subtle text-success border border-border-custom">Nowa pozycja</span>;
  }
  if (t.includes('inc') || t.includes('zwiększ') || t.includes('buy') || t.includes('kup')) {
    return <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-subtle text-success border border-border-custom">Zwiększenie</span>;
  }
  if (t.includes('dec') || t.includes('zmniejsz') || t.includes('sell') || t.includes('sprzed')) {
    return <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-subtle text-danger border border-border-custom">Zmniejszenie</span>;
  }
  if (t.includes('sold')) {
    return <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-subtle text-danger border border-border-custom">Sprzedano</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-surface-subtle text-text-muted border border-border-custom">Bez zmian</span>;
};

const HoldingsTabTable: FC<{ data: CompanyDetailData }> = ({ data }) => {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-custom/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Pozycje Funduszy 13F ({data.holdings.length})
        </h3>
        <p className="text-2xs text-text-muted mt-0.5">
          Instytucjonalni inwestorzy posiadający akcje {data.ticker} w raportach SEC 13F
        </p>
      </div>

      {data.holdings.length === 0 ? (
        <div className="p-8 text-center text-xs text-text-muted font-mono">
          Brak zarejestrowanych pozycji 13F dla {data.ticker}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
              <tr>
                <th className="py-2.5 px-4">Fundusz / Inwestor</th>
                <th className="py-2.5 px-4 text-right">Liczba Akcji</th>
                <th className="py-2.5 px-4 text-right">Zmiana</th>
                <th className="py-2.5 px-4 text-right">Wartość USD</th>
                <th className="py-2.5 px-4 text-center">Waga</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
              {data.holdings.map((h, i) => (
                <tr key={i} className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-text-primary">
                    <div>{h.investorName}</div>
                    {h.fundName && h.fundName !== h.investorName && (
                      <div className="text-3xs font-mono text-text-muted font-normal">{h.fundName}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary tabular-nums">
                    {formatShares(h.sharesNow)}
                  </td>
                  <td className={`py-3 px-4 text-right tabular-nums font-semibold ${
                    h.sharesDelta > 0 ? 'text-success' : h.sharesDelta < 0 ? 'text-danger' : 'text-text-muted'
                  }`}>
                    {h.sharesDelta > 0 ? `+${formatShares(h.sharesDelta)}` : formatShares(h.sharesDelta)}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary tabular-nums font-bold">
                    {formatUsd(h.valueNow)}
                  </td>
                  <td className="py-3 px-4 text-center text-text-muted tabular-nums">
                    {h.weightPct > 0 ? `${h.weightPct.toFixed(2)}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    {getChangeBadge(h.changeType)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PoliticiansTabTable: FC<{ data: CompanyDetailData }> = ({ data }) => {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-custom/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Ujawnienia Polityków STOCK Act ({data.politicians.trades.length})
        </h3>
        <p className="text-2xs text-text-muted mt-0.5">
          Transakcje członków Kongresu USA na akcjach {data.ticker}
        </p>
      </div>

      {data.politicians.trades.length === 0 ? (
        <div className="p-8 text-center text-xs text-text-muted font-mono">
          Brak zgłoszonych transakcji polityków dla {data.ticker} w wybranym okresie
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
              <tr>
                <th className="py-2.5 px-4">Polityk / Filer</th>
                <th className="py-2.5 px-4">Data Transakcji</th>
                <th className="py-2.5 px-4">Data Ujawnienia</th>
                <th className="py-2.5 px-4">Typ</th>
                <th className="py-2.5 px-4 text-right">Przedział Kwoty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
              {data.politicians.trades.map((t) => {
                const isBuy = t.type.toLowerCase().includes('buy') || t.type.toLowerCase().includes('purchase');
                return (
                  <tr key={t.id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-text-primary">
                      {t.filerName}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{t.transactionDate || '—'}</td>
                    <td className="py-3 px-4 text-text-muted">{t.disclosureDate || '—'}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-semibold border border-border-custom ${
                        isBuy ? 'text-success bg-surface-subtle' : 'text-danger bg-surface-subtle'
                      }`}>
                        {isBuy ? 'Kupno' : 'Sprzedaż'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-text-primary font-bold tabular-nums">
                      {t.amountLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const InsidersTabTable: FC<{ data: CompanyDetailData }> = ({ data }) => {
  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-custom/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
          Transakcje Insiderów SEC Form 4 ({data.insiders.trades.length})
        </h3>
        <p className="text-2xs text-text-muted mt-0.5">
          Zgłoszenia kadry zarządzającej i znaczących akcjonariuszy {data.ticker}
        </p>
      </div>

      {data.insiders.trades.length === 0 ? (
        <div className="p-8 text-center text-xs text-text-muted font-mono">
          Brak zgłoszonych transakcji Form 4 dla {data.ticker}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-3xs font-black text-text-muted uppercase tracking-wider border-b border-border-custom/40">
              <tr>
                <th className="py-2.5 px-4">Podmiot</th>
                <th className="py-2.5 px-4">Data Transakcji</th>
                <th className="py-2.5 px-4">Data Zgłoszenia</th>
                <th className="py-2.5 px-4 text-center">Kod Transakcji</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/30 font-mono text-2xs">
              {data.insiders.trades.map((t) => (
                <tr key={t.id} className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-text-primary">
                    {t.companyName}
                  </td>
                  <td className="py-3 px-4 text-text-muted">{t.transactionDate || '—'}</td>
                  <td className="py-3 px-4 text-text-muted">{t.filingDate || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-surface-subtle border border-border-custom text-text-primary">
                      {t.transactionCode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const CompanySubTabsView: FC<Props> = ({ data, activeTab }) => {
  if (activeTab === '13f') return <HoldingsTabTable data={data} />;
  if (activeTab === 'politicians') return <PoliticiansTabTable data={data} />;
  if (activeTab === 'insiders') return <InsidersTabTable data={data} />;
  return null;
};
