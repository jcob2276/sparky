import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FinanceHoldingForm } from './FinanceHoldingForm';

afterEach(cleanup);
it('requires an explicit PLN cost after switching from an unknown foreign PLN basis', () => {
  render(<FinanceHoldingForm holding={{id:'c',ticker:'BTC-USD',name:'Bitcoin',assetClass:'crypto',quantity:1,avgCostPln:0,avgCostCurrency:'USD',avgCostOriginal:72000,targetWeightPct:null}}
    pending={false} onSubmit={async()=>true} onDone={()=>{}} />);
  fireEvent.change(screen.getByLabelText('Waluta kosztu zakupu'),{target:{value:'PLN'}});
  expect(screen.getByRole('button',{name:'Zapisz zmiany'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Średnia cena zakupu (PLN)'),{target:{value:'200000'}});
  expect(screen.getByRole('button',{name:'Zapisz zmiany'})).not.toBeDisabled();
});
it('preserves fractional quantity and original USD purchase cost', async () => {
  const save = vi.fn(async () => true);
  render(<FinanceHoldingForm holding={{id:'c',ticker:'BTC-USD',name:'Bitcoin',assetClass:'crypto',quantity:0.01234567,avgCostPln:0,avgCostCurrency:'USD',avgCostOriginal:72000,targetWeightPct:null}}
    pending={false} onSubmit={save} onDone={()=>{}} />);
  fireEvent.click(screen.getByRole('button',{name:'Zapisz zmiany'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({quantity:0.01234567,avgCostCurrency:'USD',avgCostOriginal:72000,avgCostPln:0})));
});

it('invalidates an old PLN basis when the foreign average cost changes', async () => {
  const save = vi.fn(async () => true);
  render(<FinanceHoldingForm holding={{id:'c',ticker:'ABC',name:'Example',assetClass:'stock',quantity:1,avgCostPln:400,avgCostCurrency:'USD',avgCostOriginal:100,targetWeightPct:null}}
    pending={false} onSubmit={save} onDone={()=>{}} />);
  fireEvent.change(screen.getByLabelText('Średnia cena zakupu (USD)'),{target:{value:'200'}});
  fireEvent.click(screen.getByRole('button',{name:'Zapisz zmiany'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({avgCostOriginal:200,avgCostPln:0})));
});
