/**
 * marketLinks.ts — Pomocnik generowania oficjalnych linków do platform finansowych
 * (Yahoo Finance, TradingView, Stooq, BiznesRadar, SEC EDGAR).
 */

export interface MarketLinkInfo {
  provider: 'tradingview' | 'yahoo' | 'stooq' | 'biznesradar' | 'sec';
  label: string;
  url: string;
}

function cleanTicker(raw: string): string {
  return raw.replace(/[$]/g, '').trim().toUpperCase();
}

export function getTradingViewSymbol(ticker: string, market?: 'USA' | 'GPW'): string {
  const clean = cleanTicker(ticker).replace(/\.WA$/i, '');
  if (market === 'GPW' || ticker.endsWith('.WA')) {
    return `GPW:${clean}`;
  }
  return clean;
}

function getYahooFinanceUrl(ticker: string, market?: 'USA' | 'GPW'): string {
  const clean = cleanTicker(ticker).replace(/\.WA$/i, '');
  if (market === 'GPW' || ticker.endsWith('.WA')) {
    return `https://finance.yahoo.com/quote/${clean}.WA/`;
  }
  return `https://finance.yahoo.com/quote/${clean}/`;
}

function getTradingViewUrl(ticker: string, market?: 'USA' | 'GPW'): string {
  const clean = cleanTicker(ticker).replace(/\.WA$/i, '');
  if (market === 'GPW' || ticker.endsWith('.WA')) {
    return `https://www.tradingview.com/symbols/GPW-${clean}/`;
  }
  return `https://www.tradingview.com/symbols/${clean}/`;
}

function getStooqUrl(ticker: string, market?: 'USA' | 'GPW'): string {
  const clean = cleanTicker(ticker).replace(/\.WA$/i, '').toLowerCase();
  if (market === 'GPW' || ticker.endsWith('.WA')) {
    return `https://stooq.pl/q/?s=${clean}`;
  }
  return `https://stooq.pl/q/?s=${clean}.us`;
}

export function getMarketLinks(ticker: string, market?: 'USA' | 'GPW'): MarketLinkInfo[] {
  const clean = cleanTicker(ticker).replace(/\.WA$/i, '');
  const isGpw = market === 'GPW' || ticker.endsWith('.WA');

  const links: MarketLinkInfo[] = [
    {
      provider: 'tradingview',
      label: 'TradingView',
      url: getTradingViewUrl(clean, isGpw ? 'GPW' : 'USA'),
    },
    {
      provider: 'yahoo',
      label: 'Yahoo Finance',
      url: getYahooFinanceUrl(clean, isGpw ? 'GPW' : 'USA'),
    },
    {
      provider: 'stooq',
      label: 'Stooq',
      url: getStooqUrl(clean, isGpw ? 'GPW' : 'USA'),
    },
  ];

  if (isGpw) {
    links.push({
      provider: 'biznesradar',
      label: 'BiznesRadar',
      url: `https://www.biznesradar.pl/notowania/${clean}`,
    });
  } else {
    links.push({
      provider: 'sec',
      label: 'SEC EDGAR',
      url: `https://www.sec.gov/edgar/searchedgar/companysearch?companyName=${clean}`,
    });
  }

  return links;
}
