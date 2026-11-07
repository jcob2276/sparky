import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { valueHoldings } from '@vanguard/domain';
import { FinanceTopMovers } from './FinanceTopMovers';

afterEach(cleanup);
it('separates the latest stock session from weekend crypto and shows source dates', () => {
  const rows = valueHoldings([
    { id:'s',ticker:'SPCX',name:'SpaceX',assetClass:'stock',quantity:1,avgCostPln:100,targetWeightPct:null },
    { id:'c',ticker:'BTC-USD',name:'Bitcoin',assetClass:'crypto',quantity:1,avgCostPln:100,targetWeightPct:null },
  ], { SPCX:{pricePln:105,changePct:5,asOf:'2026-11-06T21:00:00Z'},'BTC-USD':{pricePln:99,changePct:-1,asOf:'2026-11-07T19:00:00Z'} });
  render(<FinanceTopMovers holdings={rows} onShowAll={()=>{}} />);
  expect(screen.getByRole('heading',{name:'Zmiana ostatniej sesji'})).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Krypto · zmiana dzienna'})).toBeInTheDocument();
  expect(screen.getByText(/2026-11-06/)).toBeInTheDocument();
  expect(screen.getByText(/2026-11-07/)).toBeInTheDocument();
  expect(screen.queryByText('Dziś najbardziej się ruszają')).not.toBeInTheDocument();
});
