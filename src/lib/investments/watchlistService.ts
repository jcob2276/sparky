/**
 * watchlistService.ts — Usługa wyszukiwania, weryfikacji i danych notowań dla Watchlisty.
 * Weryfikuje tickery w oficjalnych rejestrach (10 798 spółek US w `companies`, 385 spółek GPW w `gpw_fin_public_teaser`),
 * pobiera świeże kursy i dzienne zmiany z `prices_daily` oraz sygnały z `vw_consensus` i `vw_gpw_shorts_agg`.
 */

import { orcaSelect } from './superinvestorsApi';

export interface WatchlistItem {
  ticker: string;
  name: string;
  market: 'USA' | 'GPW';
  price: string;
  changePercent: number | null;
  signalsCount: number;
  lastSignal: string;
}

export interface SearchCompanyResult {
  ticker: string;
  name: string;
  market: 'USA' | 'GPW';
  sector?: string | null;
}

interface RawUsCompany {
  ticker?: string | null;
  name?: string | null;
  sector?: string | null;
}

interface RawGpwCompany {
  ticker?: string | null;
  name?: string | null;
  sector?: string | null;
}

interface RawDailyPrice {
  ticker?: string | null;
  date?: string | null;
  close_raw?: number | null;
  open?: number | null;
}

interface RawConsensus {
  ticker?: string | null;
  company_name?: string | null;
  net_buyers?: number | null;
  holders?: number | null;
}

interface RawShortAgg {
  ticker?: string | null;
  company?: string | null;
  total_pct?: number | null;
  top_holder?: string | null;
  public_holders?: number | null;
}

function cleanInput(raw: string): string {
  return raw.replace(/[$]/g, '').trim();
}

/**
 * Przeszukuje bazę danych spółek (USA + GPW) po tickerze lub nazwie
 * i zwraca podpowiedzi do autocomplete.
 */
export async function searchWatchlistCompanies(query: string): Promise<SearchCompanyResult[]> {
  const needle = cleanInput(query);
  if (needle.length < 1) return [];

  const enc = encodeURIComponent(needle);

  try {
    const [usRows, gpwRows] = await Promise.all([
      orcaSelect<RawUsCompany>(
        `companies?or=(ticker.ilike.*${enc}*,name.ilike.*${enc}*)&select=ticker,name,sector&is_active=eq.true&order=ticker.asc&limit=6`
      ).catch(() => []),
      orcaSelect<RawGpwCompany>(
        `gpw_fin_public_teaser?or=(ticker.ilike.*${enc}*,name.ilike.*${enc}*)&select=ticker,name,sector&order=ticker.asc&limit=6`
      ).catch(() => []),
    ]);

    const results: SearchCompanyResult[] = [];
    const seenTickers = new Set<string>();

    // Spółki GPW
    for (const g of gpwRows) {
      if (!g.ticker || seenTickers.has(g.ticker)) continue;
      seenTickers.add(g.ticker);
      results.push({
        ticker: g.ticker,
        name: g.name || g.ticker,
        market: 'GPW',
        sector: g.sector ?? null,
      });
    }

    // Spółki US
    for (const u of usRows) {
      if (!u.ticker || seenTickers.has(u.ticker)) continue;
      seenTickers.add(u.ticker);
      results.push({
        ticker: u.ticker,
        name: u.name || u.ticker,
        market: 'USA',
        sector: u.sector ?? null,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Weryfikuje i potwierdza istnienie tickera w bazie danych.
 * Jeśli użytkownik wpisał np. "nebius", dopasuje oficjalny ticker "NBIS".
 */
export async function resolveWatchlistTicker(input: string): Promise<SearchCompanyResult | null> {
  const needle = cleanInput(input).toUpperCase();
  if (!needle) return null;

  const enc = encodeURIComponent(needle);

  try {
    // 1. Sprawdź dokładny ticker na GPW
    const gpwExact = await orcaSelect<RawGpwCompany>(
      `gpw_fin_public_teaser?ticker=eq.${enc}&select=ticker,name,sector&limit=1`
    ).catch(() => []);
    if (gpwExact[0]?.ticker) {
      return { ticker: gpwExact[0].ticker, name: gpwExact[0].name || gpwExact[0].ticker, market: 'GPW' };
    }

    // 2. Sprawdź dokładny ticker w USA
    const usExact = await orcaSelect<RawUsCompany>(
      `companies?ticker=eq.${enc}&select=ticker,name,sector&limit=1`
    ).catch(() => []);
    if (usExact[0]?.ticker) {
      return { ticker: usExact[0].ticker, name: usExact[0].name || usExact[0].ticker, market: 'USA' };
    }

    // 3. Sprawdź dopasowanie po nazwie (np. Nebius -> NBIS, Zabka -> ZAB)
    const [gpwName, usName] = await Promise.all([
      orcaSelect<RawGpwCompany>(
        `gpw_fin_public_teaser?name=ilike.*${enc}*&select=ticker,name,sector&limit=1`
      ).catch(() => []),
      orcaSelect<RawUsCompany>(
        `companies?name=ilike.*${enc}*&select=ticker,name,sector&limit=1`
      ).catch(() => []),
    ]);

    if (gpwName[0]?.ticker) {
      return { ticker: gpwName[0].ticker, name: gpwName[0].name || gpwName[0].ticker, market: 'GPW' };
    }
    if (usName[0]?.ticker) {
      return { ticker: usName[0].ticker, name: usName[0].name || usName[0].ticker, market: 'USA' };
    }

    return null;
  } catch {
    return null;
  }
}

function formatPrice(val: number | null | undefined, market: 'USA' | 'GPW'): string {
  if (val == null || !Number.isFinite(val) || val <= 0) return '—';
  if (market === 'GPW') return `${val.toFixed(2)} PLN`;
  return `$${val.toFixed(2)}`;
}

/**
 * Zbiera pełne dane notowań, wycen i sygnałów dla listy tickerów z watchlisty.
 */
export async function fetchWatchlistDetails(tickers: string[]): Promise<WatchlistItem[]> {
  if (tickers.length === 0) return [];

  const cleanList = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()))).filter(Boolean);
  const rawTickers = cleanList.map((t) => t.replace(/\.WA$/i, ''));
  const encTickers = rawTickers.map((t) => encodeURIComponent(t)).join(',');

  // Potencjalne symbole notowań w prices_daily (dla GPW spółki mają sufffix .WA)
  const priceSymbols = Array.from(
    new Set([...rawTickers, ...rawTickers.map((t) => `${t}.WA`)])
  );
  const encPriceSymbols = priceSymbols.map((t) => encodeURIComponent(t)).join(',');

  try {
    const [usCos, gpwCos, priceRows, consensusRows, shortRows] = await Promise.all([
      orcaSelect<RawUsCompany>(
        `companies?ticker=in.(${encTickers})&select=ticker,name,sector&limit=${rawTickers.length + 5}`
      ).catch(() => []),
      orcaSelect<RawGpwCompany>(
        `gpw_fin_public_teaser?ticker=in.(${encTickers})&select=ticker,name,sector&limit=${rawTickers.length + 5}`
      ).catch(() => []),
      orcaSelect<RawDailyPrice>(
        `prices_daily?ticker=in.(${encPriceSymbols})&order=date.desc&limit=${priceSymbols.length * 4}`
      ).catch(() => []),
      orcaSelect<RawConsensus>(
        `vw_consensus?ticker=in.(${encTickers})&select=ticker,company_name,net_buyers,holders&limit=${rawTickers.length + 5}`
      ).catch(() => []),
      orcaSelect<RawShortAgg>(
        `vw_gpw_shorts_agg?ticker=in.(${encTickers})&select=ticker,company,total_pct,top_holder,public_holders&limit=${rawTickers.length + 5}`
      ).catch(() => []),
    ]);

    const usMap = new Map(usCos.map((u) => [u.ticker?.toUpperCase() ?? '', u]));
    const gpwMap = new Map(gpwCos.map((g) => [g.ticker?.toUpperCase() ?? '', g]));
    const consensusMap = new Map(consensusRows.map((c) => [c.ticker?.toUpperCase() ?? '', c]));
    const shortMap = new Map(shortRows.map((s) => [s.ticker?.toUpperCase() ?? '', s]));

    // Grupuj notowania po tickerze (max 2 ostatnie dni, aby policzyć zmianę %)
    const pricesBySymbol = new Map<string, RawDailyPrice[]>();
    for (const p of priceRows) {
      const sym = p.ticker?.toUpperCase();
      if (!sym) continue;
      const list = pricesBySymbol.get(sym) || [];
      if (list.length < 2) {
        list.push(p);
        pricesBySymbol.set(sym, list);
      }
    }

    return cleanList.map((t) => {
      const raw = t.replace(/\.WA$/i, '');
      const isGpwExplicit = t.endsWith('.WA') || gpwMap.has(raw);
      const market: 'USA' | 'GPW' = isGpwExplicit ? 'GPW' : 'USA';

      // Nazwa spółki
      const gpwCo = gpwMap.get(raw);
      const usCo = usMap.get(raw);
      const consensusCo = consensusMap.get(raw);
      const name = gpwCo?.name || usCo?.name || consensusCo?.company_name || raw;

      // Ceny
      const symbolPrices =
        market === 'GPW'
          ? pricesBySymbol.get(`${raw}.WA`) || pricesBySymbol.get(raw) || []
          : pricesBySymbol.get(raw) || pricesBySymbol.get(`${raw}.US`) || [];

      const latestPrice = symbolPrices[0]?.close_raw ?? null;
      const prevPrice = symbolPrices[1]?.close_raw ?? null;

      let changePercent: number | null = null;
      if (latestPrice != null && prevPrice != null && prevPrice > 0) {
        changePercent = ((latestPrice - prevPrice) / prevPrice) * 100;
      }

      // Sygnały / zdarzenia
      const consensus = consensusMap.get(raw);
      const short = shortMap.get(raw);

      let lastSignal = 'Brak w rejestrach';
      let signalsCount = 0;

      if (short && (short.total_pct ?? 0) > 0) {
        lastSignal = `Szort KNF: ${short.total_pct}% (${short.public_holders || 1} fund.)`;
        signalsCount = short.public_holders || 1;
      } else if (consensus && consensus.net_buyers != null) {
        const net = consensus.net_buyers;
        lastSignal = `Konsensus 13F: netto ${net > 0 ? `+${net}` : net}`;
        signalsCount = Math.abs(net);
      }

      return {
        ticker: raw,
        name,
        market,
        price: formatPrice(latestPrice, market),
        changePercent,
        signalsCount,
        lastSignal,
      };
    });
  } catch (err) {
    console.warn('[watchlistService] fetchWatchlistDetails error:', err);
    return cleanList.map((t) => ({
      ticker: t.replace(/\.WA$/i, ''),
      name: t,
      market: t.endsWith('.WA') ? 'GPW' : 'USA',
      price: '—',
      changePercent: null,
      signalsCount: 0,
      lastSignal: 'Błąd ładowania danych',
    }));
  }
}
