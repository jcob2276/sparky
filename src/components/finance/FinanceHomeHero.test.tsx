import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { computePortfolioTotals, valueHoldings } from '@vanguard/domain';
import type { FinanceAccount, FinanceBundle } from '../../lib/financeApi';
import { useFinanceMetrics } from './useFinanceMetrics';
import { FinanceHomeHero } from './FinanceHomeHero';

afterEach(cleanup);
it('keeps bank, physical cash and broker cash in the correct hero segments', () => {
  const account = (id: string, account_type: string, balance: number, is_liquid: boolean): FinanceAccount => ({id,user_id:'u',name:id,account_type,balance,is_liquid,sort_order:0,coingecko_id:null,crypto_amount:null,created_at:''});
  const bundle: FinanceBundle = {hasProfile:false,profile:{user_id:'u',monthly_expenses:0,monthly_income:0,expected_return_pct:0,inflation_pct:0,safe_withdrawal_rate_pct:4,emergency_target_months:6,years_to_retirement:20,net_worth_target:100000,updated_at:''},accounts:[account('bank','bank',100,true),account('cash','cash',500,true),account('broker','broker_cash',30,false)],goals:[],wishlist:[],subscriptions:[],bills:[],transactions:[],incomeSources:[],snapshots:[]};
  const portfolio=computePortfolioTotals(valueHoldings([{id:'h',ticker:'ABC',name:'Example',assetClass:'stock',quantity:1,avgCostPln:700,targetWeightPct:null}],{}));
  const {result}=renderHook(()=>useFinanceMetrics(bundle,portfolio.valuePln));
  render(<FinanceHomeHero metrics={result.current!} portfolio={portfolio} hasHoldings hasAccounts onQuickEntry={()=>{}} />);
  fireEvent.click(screen.getByRole('button',{name:'Konta'}));
  expect(screen.getByRole('region',{name:'Środki na kontach'})).toHaveTextContent('100');
  fireEvent.click(screen.getByRole('button',{name:'Gotówka'}));
  expect(screen.getByRole('region',{name:'Gotówka fizyczna'})).toHaveTextContent('500');
  fireEvent.click(screen.getByRole('button',{name:'Inwestycje'}));
  expect(screen.getByRole('region',{name:'Wartość inwestycji'})).toHaveTextContent('730');
});
