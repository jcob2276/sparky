import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {HealthChartsContainer} from './HealthChartsContainer';
import {fetchChartData,fetchChartPresets,saveChartPreset} from '../../../lib/health/analyticsApi';
import type {HealthChartPreset} from '@vanguard/domain';
vi.mock('../../../lib/health/analyticsApi',()=>({fetchChartData:vi.fn(),fetchChartPresets:vi.fn(),saveChartPreset:vi.fn(),removeChartPreset:vi.fn()}));
vi.mock('../../../lib/notify',()=>({notify:vi.fn()}));
beforeEach(()=>vi.clearAllMocks());
it('loads an owner-scoped source, persists the chosen view and restores it on another visit',async()=>{
  let saved:HealthChartPreset[]=[];
  vi.mocked(fetchChartData).mockResolvedValue({points:[],truncated:false});
  vi.mocked(fetchChartPresets).mockImplementation(async()=>saved);
  vi.mocked(saveChartPreset).mockImplementation(async(owner,preset)=>{expect(owner).toBe('owner-one');saved=[preset];});
  function visit(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><HealthChartsContainer userId="owner-one"/></QueryClientProvider>);}
  const first=visit();
  await screen.findByText('Brak pomiarów w wybranym okresie.');
  fireEvent.change(screen.getByLabelText('Źródło'),{target:{value:'daily_nutrition'}});
  fireEvent.change(screen.getByLabelText('Okres'),{target:{value:'90'}});
  fireEvent.change(screen.getByLabelText('Dane w obrębie dnia'),{target:{value:'sum'}});
  fireEvent.change(screen.getByLabelText('Nazwa wykresu'),{target:{value:'Moja energia'}});
  fireEvent.click(screen.getByRole('button',{name:'Zapisz wykres'}));
  await screen.findByRole('button',{name:'Moja energia'});
  await waitFor(()=>expect(fetchChartData).toHaveBeenCalledWith('owner-one',expect.objectContaining({table:'daily_nutrition',columns:['date','calories']}),'calories','sum'));
  first.unmount();visit();
  fireEvent.click(await screen.findByRole('button',{name:'Moja energia'}));
  expect(screen.getByLabelText('Źródło')).toHaveValue('daily_nutrition');
  expect(screen.getByLabelText('Okres')).toHaveValue('90');
  expect(screen.getByLabelText('Dane w obrębie dnia')).toHaveValue('sum');
  expect(screen.getByText(/Tylko dni oznaczone/)).toBeInTheDocument();
});
it('keeps a failed data source visible as an error',async()=>{
  vi.mocked(fetchChartData).mockRejectedValue(new Error('Źródło chwilowo niedostępne'));
  vi.mocked(fetchChartPresets).mockResolvedValue([]);
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><HealthChartsContainer userId="owner-one"/></QueryClientProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Źródło chwilowo niedostępne');
  expect(screen.queryByText('Brak pomiarów w wybranym okresie.')).not.toBeInTheDocument();
});
