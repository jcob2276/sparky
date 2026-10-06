import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

const changeLabels: Record<string, string> = {
  reported_new: 'Nowo wykazana', reported_absent: 'Niewykazana w kolejnym raporcie',
  reported_increase: 'Więcej akcji', reported_decrease: 'Mniej akcji',
  reported_unchanged: 'Bez zmian', uncompared: 'Brak porównania',
};

export function CompanyFundHoldingsTable({ data }: { data: CompanyDetailData }) {
  return <section className="bg-surface-elevated border border-border-custom rounded-2xl overflow-hidden shadow-sm">
    <div className="p-4 border-b border-border-custom/50">
      <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">Pozycje funduszy 13F · {data.ticker}</h3>
      <p className="text-2xs text-text-muted mt-1">Odczytane raporty SEC. Zmiana liczby akcji wymaga raportów tego samego funduszu z dwóch kolejnych kwartałów.</p>
      <p className="text-2xs text-text-muted mt-1">Zmiana może wynikać ze splitu, transferu lub zakresu ujawnienia. Nie jest potwierdzeniem transakcji. Raporty z nierozliczonymi korektami są pominięte; import historii trwa.</p>
    </div>
    {!data.holdings.length ? <p className="p-8 text-center text-xs text-text-muted">Brak zweryfikowanych pozycji w najnowszym odczytanym okresie.</p> :
      <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <thead className="bg-surface-subtle text-3xs text-text-muted uppercase"><tr>
          <th className="p-3">Fundusz</th><th className="p-3">Stan na</th><th className="p-3 text-right">Akcje</th>
          <th className="p-3 text-right">Zmiana akcji</th><th className="p-3 text-right">Wartość USD</th>
          <th className="p-3">Odczyt</th><th className="p-3">Raporty SEC</th>
        </tr></thead>
        <tbody className="divide-y divide-border-custom/30">{data.holdings.map(h => <tr key={h.investorId}>
          <td className="p-3 font-semibold">{h.investorName}<div className="text-3xs text-text-muted">{h.fundName !== h.investorName ? h.fundName : ''}</div></td>
          <td className="p-3 font-mono">{h.period}</td>
          <td className="p-3 text-right font-mono">{h.sharesNow.toLocaleString('pl-PL')}</td>
          <td className="p-3 text-right font-mono">{h.sharesDelta == null ? '—' : `${h.sharesDelta > 0 ? '+' : ''}${h.sharesDelta.toLocaleString('pl-PL')}`}
            <div className="text-3xs text-text-muted">{h.previousPeriod ? `wobec ${h.previousPeriod}` : 'brak poprzedniego raportu'}</div></td>
          <td className="p-3 text-right font-mono">{h.valueNow.toLocaleString('pl-PL')}</td>
          <td className="p-3">{changeLabels[h.changeType] ?? 'Brak porównania'}</td>
          <td className="p-3">{h.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"
            className="block text-primary underline">{index === 0 ? h.period : h.previousPeriod}</a>)}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
