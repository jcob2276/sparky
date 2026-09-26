/**
 * superinvestorDetailService.ts — Usługa pobierania i kalkulacji portfeli 13F
 * dla 59 superinwestorów z Wall Street.
 */

import { orcaSelect } from './superinvestorsApi';
import {
  SuperinvestorOverviewItem,
  SuperinvestorsOverviewData,
  QuarterHistoryItem,
  HoldingChangeItem,
  SuperinvestorDetailData,
  formatUsdBillions,
  formatQuarterLabel,
} from './superinvestorTypes';

export * from './superinvestorTypes';

interface RawFiling {
  investor_id?: string;
  period_of_report?: string;
  filing_date?: string;
  filing_url?: string;
  total_value?: number;
  total_positions?: number;
}

interface RawHoldingChange {
  investor_id?: string;
  ticker?: string;
  company_name?: string;
  shares_now?: number;
  shares_prev?: number;
  shares_delta?: number;
  value_now?: number;
  weight_pct?: number;
  change_type?: string;
}

export async function fetchSuperinvestorsOverview(): Promise<SuperinvestorsOverviewData> {
  try {
    const [rawInvs, rawFilings] = await Promise.all([
      orcaSelect<{
        id: string;
        slug: string;
        display_name: string;
        fund_name: string;
        cik: string;
        description: string;
        category: string;
        tier: string;
        curve_enabled: boolean;
        is_active: boolean;
        consensus_enabled: boolean;
      }>(
        'investors?select=id,slug,display_name,fund_name,cik,description,category,tier,curve_enabled,is_active,consensus_enabled&order=display_name.asc'
      ),
      orcaSelect<RawFiling>(
        'filings?is_amendment=eq.false&order=period_of_report.desc&select=investor_id,period_of_report,filing_date,total_value,total_positions&limit=1000'
      ),
    ]);

    const filingsByInv = new Map<string, RawFiling[]>();
    for (const f of rawFilings) {
      if (!f.investor_id) continue;
      const list = filingsByInv.get(f.investor_id) || [];
      list.push(f);
      filingsByInv.set(f.investor_id, list);
    }

    const categoriesSet = new Set<string>();
    let curveCount = 0;
    let consensusCount = 0;

    const investors: SuperinvestorOverviewItem[] = rawInvs.map((inv) => {
      if (inv.category) categoriesSet.add(inv.category);
      if (inv.curve_enabled) curveCount++;
      if (inv.consensus_enabled) consensusCount++;

      const invFilings = filingsByInv.get(inv.id) || [];
      const latest = invFilings[0];
      const sparkFilings = [...invFilings.slice(0, 8)].reverse();
      const sparkline = sparkFilings.map((f) => f.total_value || 0).filter((v) => v > 0);

      const aumRaw = latest?.total_value || 0;
      const positionsCount = latest?.total_positions || 0;
      let filingDate = '—';
      if (latest?.filing_date) {
        const [y, m, d] = latest.filing_date.split('-');
        if (y && m && d) filingDate = `${d}.${m}.${y}`;
      }

      const isPositiveTrend =
        sparkline.length >= 2 ? sparkline[sparkline.length - 1] >= sparkline[sparkline.length - 2] : true;

      return {
        id: inv.id,
        slug: inv.slug,
        name: inv.display_name,
        fundName: inv.fund_name,
        cik: inv.cik || '—',
        description: inv.description || '',
        category: inv.category || 'value',
        tier: inv.tier || 'free',
        aumFormatted: formatUsdBillions(aumRaw),
        aumRaw,
        positionsCount,
        filingDate,
        sparkline: sparkline.length > 0 ? sparkline : [10, 11, 12, 13],
        isPositiveTrend,
        curveEnabled: Boolean(inv.curve_enabled),
        consensusEnabled: Boolean(inv.consensus_enabled),
      };
    });

    return {
      investors,
      stats: {
        totalActive: investors.length,
        curveCount,
        consensusCount,
        categoriesCount: categoriesSet.size,
      },
    };
  } catch (err) {
    console.warn('[superinvestorDetailService] fetchOverview error:', err);
    return {
      investors: [],
      stats: { totalActive: 0, curveCount: 0, consensusCount: 0, categoriesCount: 0 },
    };
  }
}

export async function fetchSuperinvestorDetail(
  investorId: string,
  overviewItem?: SuperinvestorOverviewItem
): Promise<SuperinvestorDetailData | null> {
  try {
    const [invRows, filings, changes, companies] = await Promise.all([
      overviewItem
        ? Promise.resolve([overviewItem])
        : orcaSelect<SuperinvestorOverviewItem>(`investors?id=eq.${investorId}`),
      orcaSelect<RawFiling>(
        `filings?investor_id=eq.${investorId}&is_amendment=eq.false&order=period_of_report.desc&limit=10`
      ),
      orcaSelect<RawHoldingChange>(
        `vw_holdings_changes?investor_id=eq.${investorId}&order=value_now.desc.nullslast&limit=60`
      ),
      orcaSelect<{ ticker: string; sector: string }>('companies?select=ticker,sector&limit=3000'),
    ]);

    const investor = invRows[0];
    if (!investor) return null;

    const sectorMap = new Map<string, string>();
    for (const c of companies) {
      if (c.ticker && c.sector) sectorMap.set(c.ticker, c.sector);
    }

    // Sort filings chronologically for 8 quarters bar chart
    const eightQuarters = [...filings.slice(0, 8)].reverse();
    const quarters: QuarterHistoryItem[] = eightQuarters.map((f, i) => ({
      quarterLabel: formatQuarterLabel(f.period_of_report || ''),
      valueFormatted: formatUsdBillions(f.total_value || 0),
      rawValue: f.total_value || 0,
      isLatest: i === eightQuarters.length - 1,
    }));

    let quarterGrowthPct = '+0,0%';
    if (eightQuarters.length >= 2) {
      const first = eightQuarters[0].total_value || 0;
      const last = eightQuarters[eightQuarters.length - 1].total_value || 0;
      if (first > 0) {
        const diff = ((last - first) / first) * 100;
        quarterGrowthPct = `${diff >= 0 ? '+' : ''}${diff.toFixed(2).replace('.', ',')}%`;
      }
    }

    let basketValueRaw = 0;
    let newCount = 0;
    let decreasedCount = 0;
    let increasedCount = 0;
    let soldCount = 0;
    const sectorTotals = new Map<string, number>();

    const holdings: HoldingChangeItem[] = changes.map((ch) => {
      const val = ch.value_now || 0;
      basketValueRaw += val;
      const changeType = (ch.change_type || 'unchanged') as HoldingChangeItem['changeType'];
      if (changeType === 'new') newCount++;
      else if (changeType === 'decreased') decreasedCount++;
      else if (changeType === 'increased') increasedCount++;
      else if (changeType === 'sold') soldCount++;

      let deltaPct: number | null = null;
      if (ch.shares_delta != null && ch.shares_prev && ch.shares_prev > 0) {
        deltaPct = Math.round((ch.shares_delta / ch.shares_prev) * 100);
      }

      const ticker = ch.ticker || '—';
      const sector = sectorMap.get(ticker) || (ticker === 'QQQ' || ticker === 'SPY' ? 'ETF / Indeks' : 'Nieskategoryzowane');
      if (val > 0) {
        sectorTotals.set(sector, (sectorTotals.get(sector) || 0) + val);
      }

      return {
        ticker,
        companyName: ch.company_name || 'Spółka',
        weightPct: ch.weight_pct || 0,
        sharesNow: ch.shares_now ?? null,
        sharesDelta: ch.shares_delta ?? null,
        sharesDeltaPct: deltaPct,
        valueUsd: val > 0 ? val : null,
        valueFormatted: val > 0 ? formatUsdBillions(val) : '—',
        changeType,
        sector,
      };
    });

    const sectors: { name: string; weightPct: number }[] = [];
    if (basketValueRaw > 0) {
      sectorTotals.forEach((val, name) => {
        sectors.push({
          name,
          weightPct: Number(((val / basketValueRaw) * 100).toFixed(1)),
        });
      });
      sectors.sort((a, b) => b.weightPct - a.weightPct);
    }

    const recentActivity = changes
      .filter((c) => c.change_type && c.change_type !== 'unchanged')
      .slice(0, 5)
      .map((c) => {
        let type = 'ZMIANA';
        let isNegative = false;
        if (c.change_type === 'new') type = 'NOWA POZYCJA';
        else if (c.change_type === 'increased') type = 'DOKUPIONO';
        else if (c.change_type === 'decreased') {
          type = 'ZREDUKOWANO';
          isNegative = true;
        } else if (c.change_type === 'sold') {
          type = 'SPRZEDANO';
          isNegative = true;
        }

        const deltaStr = c.shares_delta
          ? `${c.shares_delta > 0 ? '+' : ''}${Math.round(c.shares_delta).toLocaleString('pl-PL')} akcji`
          : 'zamknięcie pozycji';

        return {
          type,
          ticker: c.ticker || '—',
          details: deltaStr,
          isNegative,
        };
      });

    const latestFiling = filings[0];
    const periodQuarter = latestFiling?.period_of_report
      ? formatQuarterLabel(latestFiling.period_of_report)
      : 'K2 \'26';

    return {
      investor,
      basketValueFormatted: formatUsdBillions(basketValueRaw),
      basketValueRaw,
      positionsCount: holdings.length,
      newCount,
      decreasedCount,
      increasedCount,
      soldCount,
      quarters,
      quarterGrowthPct,
      holdings,
      sectors,
      latestFilingUrl: latestFiling?.filing_url || null,
      periodQuarter,
      recentActivity,
    };
  } catch (err) {
    console.warn('[superinvestorDetailService] fetchDetail error:', err);
    return null;
  }
}
