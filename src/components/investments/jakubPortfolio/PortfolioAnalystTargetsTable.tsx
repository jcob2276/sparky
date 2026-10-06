import type { PositionAnalystTarget } from '../../../lib/investments/portfolioForecastService';

interface Props { positions: PositionAnalystTarget[]; horizonMonths: number }
export function PortfolioAnalystTargetsTable({ positions, horizonMonths }: Props) {
  return <div className="space-y-3">
    <h4 className="text-sm font-bold text-text-primary">Dostępność konsensusu analityków ({horizonMonths}M)</h4>
    <p className="text-xs text-text-muted">Brak zweryfikowanego źródła cen docelowych. Wycena portfela i ręczne scenariusze nie zastępują konsensusu.</p>
    <div className="overflow-x-auto rounded-2xl border border-border-custom">
      <table className="w-full text-left text-xs">
        <thead className="text-text-muted"><tr><th className="p-3">Instrument</th><th className="p-3">Cena PLN</th><th className="p-3">Cel PLN</th><th className="p-3">Ocena / analitycy</th><th className="p-3">Źródło / data</th></tr></thead>
        <tbody>{positions.map((position) => <tr key={position.ticker} className="border-t border-border-custom text-text-secondary">
          <td className="p-3">{position.ticker}<div className="text-text-muted">{position.name}</div></td>
          <td className="p-3">{position.currentPricePln.toFixed(2)}</td>
          <td className="p-3">{position.meanTargetPricePln?.toFixed(2) ?? '—'}</td>
          <td className="p-3">{position.rating ?? '—'} / {position.numAnalysts ?? '—'}</td>
          <td className="p-3">{position.sourceUrl ? <a href={position.sourceUrl} target="_blank" rel="noopener noreferrer">{position.source}</a> : 'Brak źródła'} / {position.sourceDate ?? '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
