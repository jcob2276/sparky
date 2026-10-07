import { orcaSelect } from './superinvestorsApi';
import { fetchFundInvestor, type VerifiedFundReport } from './superinvestorOverviewService';
import { formatQuarterLabel, formatUsdBillions, type HoldingChangeItem, type SuperinvestorDetailData } from './superinvestorTypes';
export * from './superinvestorTypes';
export { fetchSuperinvestorsOverview } from './superinvestorOverviewService';

interface FundPosition { cusip: string; ticker: string | null; company_name: string; shares: number; value_usd: number }

// Comparing non-adjacent quarters would mislabel a multi-quarter change as quarterly.
function precedingFundQuarter(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const quarter = Math.floor((month - 1) / 3);
  const quarterEnds = ['12-31', '03-31', '06-30', '09-30'];
  return `${year - (quarter === 0 ? 1 : 0)}-${quarterEnds[quarter]}`;
}
function fundHoldingChanges(current: FundPosition[], previous: FundPosition[] | null, sectors: Map<string, string>) {
  const currentByCusip = new Map(current.map(row => [row.cusip, row]));
  const previousByCusip = new Map((previous ?? []).map(row => [row.cusip, row]));
  const basketValue = current.reduce((sum, row) => sum + Number(row.value_usd), 0);
  const cusips = new Set([...currentByCusip.keys(), ...previousByCusip.keys()]);
  return [...cusips].map(cusip => {
    const now = currentByCusip.get(cusip), before = previousByCusip.get(cusip);
    const source = (now ?? before)!;
    const shares = Number(now?.shares ?? 0), priorShares = Number(before?.shares ?? 0);
    const delta = previous ? shares - priorShares : null;
    const changeType: HoldingChangeItem['changeType'] = !previous ? 'unknown' : !before ? 'new' : !now ? 'sold'
      : delta! > 0 ? 'increased' : delta! < 0 ? 'decreased' : 'unchanged';
    const value = Number(now?.value_usd ?? 0);
    return {
      cusip, tickerMapped: Boolean(source.ticker), ticker: source.ticker || cusip, companyName: source.company_name,
      sharesNow: shares, sharesDelta: delta, sharesDeltaPct: delta !== null && priorShares > 0 ? delta / priorShares * 100 : null,
      valueUsd: value, valueFormatted: value === 0 ? '0 USD' : formatUsdBillions(value),
      weightPct: basketValue > 0 ? value / basketValue * 100 : 0,
      changeType, sector: source.ticker ? sectors.get(source.ticker) || 'Nieskategoryzowane' : 'Nieskategoryzowane',
    };
  }).sort((a, b) => b.valueUsd - a.valueUsd || a.cusip.localeCompare(b.cusip));
}
export async function fetchSuperinvestorDetail(
  investorId: string,
): Promise<SuperinvestorDetailData | null> {
  const scope = `investor_id=eq.${encodeURIComponent(investorId)}`;
  const reports = await orcaSelect<VerifiedFundReport>(`vw_sec13f_fund_reports?${scope}&order=period_of_report.desc&limit=8`, { strict: true });
  const investor = await fetchFundInvestor(investorId, reports);
  if (!investor) return null;
  const latest = reports[0];
  const previous = latest ? reports.find(report => report.period_of_report === precedingFundQuarter(latest.period_of_report)) : undefined;
  const readPositions = (report: VerifiedFundReport) => orcaSelect<FundPosition>(
    `vw_sec13f_fund_positions?${scope}&period_of_report=eq.${report.period_of_report}&order=value_usd.desc,cusip.asc`, { strict: true });
  const [currentRows, previousRows, companies] = await Promise.all([
    latest ? readPositions(latest) : Promise.resolve([]),
    previous ? readPositions(previous) : Promise.resolve(null),
    orcaSelect<{ ticker: string; sector: string }>('companies?select=ticker,sector&order=ticker.asc', { strict: true }),
  ]);
  if (currentRows.length >= 20_000 || (previousRows?.length ?? 0) >= 20_000) throw new Error('Portfel przekracza limit odczytu; dane są niepełne.');
  const holdings = fundHoldingChanges(currentRows, previousRows, new Map(companies.map(c => [c.ticker, c.sector])));
  const basketValueRaw = currentRows.reduce((sum, row) => sum + Number(row.value_usd), 0);
  const count = (type: HoldingChangeItem['changeType']) => previous ? holdings.filter(h => h.changeType === type).length : null;
  const sectorTotals = new Map<string, number>();
  holdings.forEach(h => sectorTotals.set(h.sector, (sectorTotals.get(h.sector) ?? 0) + (h.valueUsd ?? 0)));
  const sectors = [...sectorTotals].filter(([, value]) => value > 0).map(([name, value]) => ({
    name, weightPct: basketValueRaw > 0 ? value / basketValueRaw * 100 : 0,
  })).sort((a, b) => b.weightPct - a.weightPct);
  const growth = previous && Number(previous.verified_value_usd) > 0
    ? (Number(latest.verified_value_usd) / Number(previous.verified_value_usd) - 1) * 100 : null;
  const activityLabels = { new: 'NOWA UJAWNIONA', increased: 'WIĘCEJ AKCJI', decreased: 'MNIEJ AKCJI', sold: 'BRAK W RAPORCIE' };
  return {
    investor, holdings, sectors, basketValueRaw,
    basketValueFormatted: latest ? basketValueRaw === 0 ? '0 USD' : formatUsdBillions(basketValueRaw) : '—',
    positionsCount: currentRows.length,
    newCount: count('new'), increasedCount: count('increased'), decreasedCount: count('decreased'), soldCount: count('sold'),
    quarters: reports.slice().reverse().map((report, index) => ({
      quarterLabel: formatQuarterLabel(report.period_of_report), rawValue: Number(report.verified_value_usd),
      valueFormatted: formatUsdBillions(Number(report.verified_value_usd)), isLatest: index === reports.length - 1,
    })),
    quarterGrowthPct: growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth.toFixed(2).replace('.', ',')}%`,
    latestFilingUrl: latest?.filing_url ?? null, previousFilingUrl: previous?.filing_url ?? null,
    latestSourceUrls: latest?.source_urls ?? (latest ? [latest.filing_url] : []),
    previousSourceUrls: previous?.source_urls ?? (previous ? [previous.filing_url] : []),
    previousPeriod: previous?.period_of_report ?? null, periodQuarter: latest ? formatQuarterLabel(latest.period_of_report) : '—',
    recentActivity: holdings.filter(h => h.changeType !== 'unknown' && h.changeType !== 'unchanged').slice(0, 5).map(h => ({
      type: activityLabels[h.changeType as keyof typeof activityLabels], ticker: h.ticker,
      details: `${h.sharesDelta! > 0 ? '+' : ''}${Math.round(h.sharesDelta!).toLocaleString('pl-PL')} akcji`,
      isNegative: h.sharesDelta! < 0,
    })),
  };
}
