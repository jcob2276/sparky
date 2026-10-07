import { orcaSelect } from './superinvestorsApi';
import { formatLongDateWarsaw } from '../date';
import { formatUsdBillions, type SuperinvestorOverviewItem, type SuperinvestorsOverviewData } from './superinvestorTypes';

export interface VerifiedFundReport {
  investor_id: string; period_of_report: string; filing_date: string; filing_url: string;
  verified_value_usd: number; verified_entry_count: number; value_reconciliation?: string;
  source_urls?: string[];
}
interface RawInvestor {
  id: string; slug: string; display_name: string; fund_name: string; cik?: string;
  description?: string; category?: string; tier?: string; consensus_enabled?: boolean;
}
export function fundOverviewItem(inv: RawInvestor, reports: VerifiedFundReport[]): SuperinvestorOverviewItem {
  const latest = reports[0];
  const sparkline = reports.slice(0, 8).reverse().map(report => Number(report.verified_value_usd));
  return {
    id: inv.id, slug: inv.slug, name: inv.display_name, fundName: inv.fund_name,
    cik: inv.cik || '—', description: inv.description || '', category: inv.category || 'value', tier: inv.tier || 'free',
    aumRaw: Number(latest?.verified_value_usd ?? 0), aumFormatted: formatUsdBillions(Number(latest?.verified_value_usd ?? 0)),
    positionsCount: latest?.verified_entry_count ?? null,
    filingDate: latest ? formatLongDateWarsaw(latest.filing_date) : '—',
    reportPeriod: latest?.period_of_report ?? null, filingUrl: latest?.filing_url ?? null,
    reportWarning: reports.some(report => report.value_reconciliation === 'rounding_difference'),
    sparkline, isPositiveTrend: sparkline.length >= 2 && sparkline.at(-1)! >= sparkline.at(-2)!,
    curveEnabled: false, consensusEnabled: Boolean(inv.consensus_enabled),
  };
}
export async function fetchFundInvestor(id: string, reports: VerifiedFundReport[]) {
  const rows = await orcaSelect<RawInvestor>(`investors?id=eq.${encodeURIComponent(id)}&is_active=eq.true&limit=1`, { strict: true });
  return rows[0] ? fundOverviewItem(rows[0], reports) : null;
}
export async function fetchSuperinvestorsOverview(): Promise<SuperinvestorsOverviewData> {
  const [catalogue, reports] = await Promise.all([
    orcaSelect<RawInvestor>('investors?is_active=eq.true&order=display_name.asc', { strict: true }),
    orcaSelect<VerifiedFundReport>('vw_sec13f_fund_reports?order=period_of_report.desc,investor_id.asc', { strict: true }),
  ]);
  const investors = catalogue.map(inv => fundOverviewItem(inv, reports.filter(report => report.investor_id === inv.id)));
  return { investors, stats: {
    totalActive: investors.length, verifiedCount: investors.filter(inv => inv.reportPeriod).length,
    consensusCount: investors.filter(inv => inv.consensusEnabled).length,
    categoriesCount: new Set(investors.map(inv => inv.category)).size,
  } };
}
