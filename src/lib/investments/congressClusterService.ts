/**
 * congressClusterService.ts — Detekcja klastrów zakupowych Kongresu (Cluster Buys).
 * 
 * Sygnał "Cluster Buy" pojawia się, gdy co najmniej 2 różnych członków Kongresu
 * (Izby lub Senatu) nabywa ten sam walor w zbliżonym oknie czasowym.
 * Szczególnie silny sygnał ("ponadpartyjny") występuje, gdy kupują zarówno Demokraci, jak i Republikanie.
 */

interface ClusterBuyerInfo {
  id: string;
  name: string;
  party: string;
  chamber: string;
  state: string;
  bioguideId?: string | null;
  count: number;
  volumeUsd: number;
  latestDate: string;
}

export interface ClusterBuyAlert {
  ticker: string;
  companyName: string;
  buyers: ClusterBuyerInfo[];
  buyerCount: number;
  totalVolumeUsd: number;
  latestDate: string;
  isBipartisan: boolean; // D and R both buying
  hasSenate: boolean;
  hasHouse: boolean;
}

export interface ClusterTradeInput {
  politicianId?: string;
  politicianName?: string;
  party?: string;
  chamber?: string;
  state?: string;
  bioguideId?: string | null;
  ticker?: string;
  companyName?: string;
  type?: 'buy' | 'sell';
  amountUsd: number;
  date: string;
}

export function detectCongressClusterBuys(trades: ClusterTradeInput[]): ClusterBuyAlert[] {
  const buyMap = new Map<string, {
    companyName: string;
    buyersMap: Map<string, ClusterBuyerInfo>;
    latestDate: string;
  }>();

  for (const t of trades) {
    if (t.type !== 'buy') continue;
    const ticker = (t.ticker || '').toUpperCase().trim();
    if (!ticker || ticker === '—' || ticker.length > 8) continue;

    const polKey = t.politicianId || t.politicianName || 'Kongresmen';
    const polName = t.politicianName || 'Kongresmen';
    const party = t.party || 'D';
    const chamber = t.chamber || 'house';
    const state = t.state || '';

    let cluster = buyMap.get(ticker);
    if (!cluster) {
      cluster = {
        companyName: t.companyName || ticker,
        buyersMap: new Map(),
        latestDate: t.date,
      };
      buyMap.set(ticker, cluster);
    }

    if (t.date > cluster.latestDate) {
      cluster.latestDate = t.date;
    }

    const existingBuyer = cluster.buyersMap.get(polKey);
    if (existingBuyer) {
      existingBuyer.count += 1;
      existingBuyer.volumeUsd += t.amountUsd;
      if (t.date > existingBuyer.latestDate) existingBuyer.latestDate = t.date;
    } else {
      cluster.buyersMap.set(polKey, {
        id: polKey,
        name: polName,
        party,
        chamber,
        state,
        bioguideId: t.bioguideId,
        count: 1,
        volumeUsd: t.amountUsd,
        latestDate: t.date,
      });
    }
  }

  const alerts: ClusterBuyAlert[] = [];

  for (const [ticker, data] of buyMap.entries()) {
    const buyers = Array.from(data.buyersMap.values());
    if (buyers.length < 2) continue; // Minimum 2 different politicians

    const hasDem = buyers.some((b) => b.party === 'D');
    const hasRep = buyers.some((b) => b.party === 'R');
    const hasSenate = buyers.some((b) => b.chamber.toLowerCase().includes('senat'));
    const hasHouse = buyers.some((b) => b.chamber.toLowerCase().includes('house') || b.chamber.toLowerCase().includes('izba'));
    const totalVolumeUsd = buyers.reduce((acc, b) => acc + b.volumeUsd, 0);

    // Sort buyers by date / volume
    buyers.sort((a, b) => b.volumeUsd - a.volumeUsd);

    alerts.push({
      ticker,
      companyName: data.companyName,
      buyers,
      buyerCount: buyers.length,
      totalVolumeUsd,
      latestDate: data.latestDate,
      isBipartisan: hasDem && hasRep,
      hasSenate,
      hasHouse,
    });
  }

  // Sort by buyer count descending, then total volume descending
  return alerts.sort((a, b) => {
    if (b.buyerCount !== a.buyerCount) return b.buyerCount - a.buyerCount;
    return b.totalVolumeUsd - a.totalVolumeUsd;
  });
}
